(function(root){
  'use strict';
  const integer=(x)=>Number.isSafeInteger(x)&&x>=0;
  const normalize=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  function eligible(offer,quote,profile,now,reports=[]) {
    if(!offer||!offer.id||!offer.provider||offer.provider!==quote.provider||!offer.evidenceVerified||offer.expiresAt<=now||offer.observedAt>now||now-offer.observedAt>15*60000)return false;
    if(offer.newUsersOnly&&profile.newUser!==true)return false;
    if(offer.paymentMethod&&!profile.paymentMethods?.includes(offer.paymentMethod))return false;
    if(offer.route&&offer.route!==JSON.stringify([normalize(quote.from),normalize(quote.to),quote.date]))return false;
    if(offer.minFareMinor&&quote.components.baseMinor+quote.components.seatMinor<offer.minFareMinor)return false;
    if(reports.some(r=>r.provider===offer.provider&&r.code===offer.code&&r.local===true&&r.expiresAt>now&&['expired','quota','unknown'].includes(r.reason)))return false;
    return true;
  }
  function optimize(quote,profile={},offers=[],reports=[],now=Date.now()) {
    if(quote.basis==='final')return {complete:true,payableMinor:quote.amountMinor,classification:'Observed checkout total',applied:[],grossMinor:quote.amountMinor,savedMinor:0,cashbackMinor:0};
    const c=quote.components;
    if(!c||(!['baseMinor','taxMinor','feeMinor'].every(k=>integer(c[k]))||!Number.isSafeInteger(c.seatMinor)||c.baseMinor+c.seatMinor<0))return {complete:false,payableMinor:quote.amountMinor,classification:quote.basis==='final'?'Observed checkout total':'Advertised starting fare',missing:['Seat price, tax, fees and offer eligibility require verification'],applied:[]};
    const gross=c.baseMinor+c.seatMinor+c.taxMinor+c.feeMinor;
    const candidates=offers.filter(o=>eligible(o,quote,profile,now,reports)).slice(0,12);
    let best={complete:true,payableMinor:gross,grossMinor:gross,savedMinor:0,passCostMinor:0,cashbackMinor:0,applied:[],classification:'Calculated checkout estimate'};
    // Unknown stacking defaults to mutually exclusive. Cashback is never counted as instant savings.
    for(let mask=1;mask<(1<<candidates.length);mask++){
      const selected=candidates.filter((_,i)=>mask&(1<<i));
      if(selected.some((a,i)=>selected.slice(i+1).some(b=>!a.stackWith?.includes(b.id)||!b.stackWith?.includes(a.id))))continue;
      let discount=0,cost=0,cashback=0,valid=true;
      for(const o of selected){
        const base=c.baseMinor+c.seatMinor;
        let saving=integer(o.flatMinor)?o.flatMinor:Number.isInteger(o.percentBps)&&o.percentBps>0&&o.percentBps<=10000?Math.floor(base*o.percentBps/10000):0;
        if(integer(o.maxMinor))saving=Math.min(saving,o.maxMinor);
        if(!integer(saving)){valid=false;break;}
        if(o.kind==='cashback'){cashback+=saving;continue;}
        let passCost=o.kind==='pass'&&!profile.ownedPasses?.includes(o.id)?o.costMinor:0;
        if(!integer(passCost)){valid=false;break;}
        if(o.kind==='pass'&&saving<=passCost){valid=false;break;}
        discount+=saving;cost+=passCost;
      }
      if(!valid)continue;
      const payable=gross-Math.min(discount,c.baseMinor+c.seatMinor)+cost;
      if(payable<best.payableMinor)best={...best,payableMinor:payable,savedMinor:gross-payable,passCostMinor:cost,cashbackMinor:cashback,applied:selected.map(o=>({id:o.id,code:o.code||'',kind:o.kind}))};
    }
    return best;
  }
  function compare(observations,profile={},offers=[],reports=[],trusted=new Set(),now=Date.now()) {
    const groups=new Map();
    for(const o of observations){
      if(o.expiresAt<=now||!['public-page','checkout'].includes(o.source))continue;
      const key=JSON.stringify([normalize(o.operator),o.departure,normalize(o.busType),o.seat]);
      const group=groups.get(key)||new Map();
      const prev=group.get(o.provider);
      // Untrusted peers may be shown as leads but cannot replace this device's verified collection.
      const isTrusted=trusted.has(o.author);
      if(!prev||(isTrusted&&!prev.trusted)||(isTrusted===prev.trusted&&o.observedAt>prev.observedAt))group.set(o.provider,{...o,trusted:isTrusted,deal:optimize(o,profile,offers,reports,now)});
      groups.set(key,group);
    }
    return [...groups.values()].map(g=>{
      const quotes=[...g.values()].sort((a,b)=>Number(b.trusted)-Number(a.trusted)||a.deal.payableMinor-b.deal.payableMinor||a.provider.localeCompare(b.provider));
      const trustedQuotes=quotes.filter(q=>q.trusted);
      const comparable=trustedQuotes.filter(q=>q.basis==='final'||q.deal.complete);
      return {key:JSON.stringify([quotes[0].operator,quotes[0].departure,quotes[0].busType,quotes[0].seat]),quotes,winner:comparable.length>=2?comparable.reduce((a,b)=>a.deal.payableMinor<=b.deal.payableMinor?a:b):null,lowestListed:trustedQuotes[0]||null};
    }).sort((a,b)=>(a.winner||a.lowestListed||a.quotes[0]).deal.payableMinor-(b.winner||b.lowestListed||b.quotes[0]).deal.payableMinor);
  }
  function heatmap(observations,from,to,startDate,days=30,now=Date.now()) {
    return Array.from({length:days},(_,i)=>{const d=new Date(startDate+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10);const rows=observations.filter(o=>normalize(o.from)===normalize(from)&&normalize(o.to)===normalize(to)&&o.date===date&&o.source==='public-page');return {date,lowestMinor:rows.length?Math.min(...rows.map(o=>o.amountMinor)):null,count:rows.length,stale:rows.length?rows.every(o=>o.expiresAt<=now):false};});
  }
  function priceDrop(previous,current){
    if(!previous||!current||current.observedAt<=previous.observedAt||current.expiresAt<=Date.now())return null;
    if(['from','to','date','provider','operator','departure','seat','busType','basis'].some(k=>normalize(previous[k])!==normalize(current[k])))return null;
    if(current.amountMinor>=previous.amountMinor)return null;
    return {savedMinor:previous.amountMinor-current.amountMinor,percent:Math.round((1-current.amountMinor/previous.amountMinor)*100),previous:previous.amountMinor,current:current.amountMinor};
  }
  function passingThrough(direct,alternatives){
    // Names alone cannot establish the same service or permitted later boarding.
    return alternatives.filter(a=>a.serviceId&&a.serviceId===direct.serviceId&&a.seat===direct.seat&&a.date===direct.date&&a.to===direct.to&&a.boardingVerified===true&&a.boardingPoints?.includes(direct.from)&&a.finalMinor<direct.finalMinor).map(a=>({...a,savingMinor:direct.finalMinor-a.finalMinor}));
  }
  root.DealEngine={eligible,optimize,compare,heatmap,priceDrop,passingThrough};
  if(typeof module!=='undefined')module.exports=root.DealEngine;
})(globalThis);
