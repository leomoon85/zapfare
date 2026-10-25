'use strict';
const FareCache={
  ledger:null,error:null,ready:null,channel:null,profileKey:null,
  settings:read('bestbook-settings',{community:true,paymentMethods:[],ownedPasses:[],newUser:false}),
  reports:read('bestbook-coupon-reports',[]),watches:read('bestbook-watches',[]),recent:read('bestbook-recent',[]),
  async addReport(report){
    this.reports=[report,...this.reports.filter(r=>r.id!==report.id&&r.expiresAt>Date.now())].slice(0,100);
    store('bestbook-coupon-reports',this.reports);SearchController.redraw();
  },
  async checkWatches(query){
    if(!this.ledger)return;
    const rows=this.ledger.observations(query.from,query.to,query.date).filter(o=>o.source==='public-page'&&!o.stale&&[this.ledger.identity.publicKey,...(this.settings.trustedAuthors||[])].includes(o.author));
    for(const watch of this.watches){
      if(watch.from!==query.from||watch.to!==query.to||watch.date!==query.date)continue;
      const best=rows.reduce((a,b)=>!a||b.amountMinor<a.amountMinor?b:a,null);
      if(best&&best.amountMinor<=watch.targetMinor&&(!watch.lastNotifiedMinor||best.amountMinor<watch.lastNotifiedMinor)){
        watch.lastNotifiedMinor=best.amountMinor;
        const text=`${query.from} → ${query.to}: ${money(best.amountMinor/100)} advertised on ${best.provider}. Check fees before booking.`;
        toast(text);
        if(globalThis.BestBookNative?.notifyPrice)BestBookNative.notifyPrice(text);
        else if(globalThis.Notification?.permission==='granted')new Notification('BestBook price watch',{body:text});
      }
    }
    store('bestbook-watches',this.watches);
  },
  saveRecent(q,provider){this.recent=[{...q,provider,openedAt:Date.now()},...this.recent.filter(x=>x.from!==q.from||x.to!==q.to||x.date!==q.date)].slice(0,20);store('bestbook-recent',this.recent);},
  groups(){
    if(!this.ledger)return [];
    const observations=this.ledger.observations(route().from,route().to,state.date).filter(o=>o.source!=='checkout'||o.profileKey===this.profileKey);
    const trusted=new Set([this.ledger.identity.publicKey,...(this.settings.trustedAuthors||[])]);
    return DealEngine.compare(observations,this.settings,[],this.reports,trusted);
  }
};
FareCache.ready=(async()=>{
  try{
    FareCache.ledger=await FareLedger.open();
    FareCache.profileKey=await FareLedger.digest(JSON.stringify(FareCache.settings.paymentMethods.slice().sort()));
    if(typeof BroadcastChannel!=='undefined'){
      FareCache.channel=new BroadcastChannel('bestbook-fare-ledger-v1');
      FareCache.channel.onmessage=async event=>{try{if(JSON.stringify(event.data).length>400000)return;await FareCache.ledger.ingest(event.data);SearchController.redraw();}catch{}};
    }
    return FareCache.ledger;
  }catch(error){FareCache.error=error.message;return null;}
})();
