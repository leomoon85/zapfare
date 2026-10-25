'use strict';
const SearchController={
  key:null,query:null,run:0,statuses:{},running:false,error:null,abort:null,pending:new Map(),network:null,
  async ensure(query,force=false){
    const clean=PublicSources.validateQuery(query),key=JSON.stringify(clean);
    if(!force&&this.key===key)return;
    this.cancel();this.key=key;this.query=clean;this.running=true;this.error=null;
    const run=++this.run;this.abort=new AbortController();
    this.statuses=Object.fromEntries(PublicSources.providers.map(p=>[p.id,{status:'waiting',message:'Waiting to check website'}]));this.redraw();
    try{
      const ledger=await FareCache.ready;if(run!==this.run)return;
      if(!ledger)throw Error(FareCache.error||'Local storage is unavailable.');
      if(FareCache.settings.community){
        if(!this.network)this.network=new FarePeerNetwork(ledger,{onUpdate:()=>{this.redraw();if(this.query)FareCache.checkWatches(this.query);},onReport:r=>FareCache.addReport(r)});
        this.network.search(clean).then(()=>this.network.publish(clean)).catch(()=>{this.network.status='Relays unavailable';this.redraw();});
      }
      const capability=await this.capabilities();
      for(const provider of PublicSources.providers){
        if(run!==this.run)break;
        this.statuses[provider.id]={status:'checking',message:'Checking route and date…'};this.redraw();
        const result=await this.collect(clean,provider.id,capability,this.abort.signal);
        if(run!==this.run)break;
        this.statuses[provider.id]={status:result.status,message:result.message};
        if(result.status==='ready'){
          for(const raw of result.rows.slice(0,100)){
            const {evidenceText,...observation}=raw;
            observation.evidenceHash=await FareLedger.digest(evidenceText||JSON.stringify(observation));
            // Every source result is revalidated before signing or sharing.
            if(observation.from!==clean.from||observation.to!==clean.to||observation.date!==clean.date||observation.provider!==provider.name)continue;
            await ledger.append(observation);
          }
          await FareCache.checkWatches(clean);
          if(FareCache.settings.community)this.network?.publish(clean).catch(()=>{});
        }
        this.redraw();
      }
    }catch(error){if(run===this.run)this.error=error.message;}
    finally{if(run===this.run){this.running=false;this.redraw();}}
  },
  async capabilities(){
    if(globalThis.BestBookNative?.collect)return {mode:'android',collector:true};
    if(location.protocol==='http:'||location.protocol==='https:'){
      try{const r=await fetch('/capabilities',{signal:AbortSignal.timeout(3000)});if(r.ok)return await r.json();}catch{}
    }
    return {mode:'static',collector:false};
  },
  async collect(query,provider,capability,signal){
    if(!capability.collector)return {status:'device-required',message:'Open the Android app or run the local preview to read public websites on this device.',rows:[]};
    if(capability.mode==='android')return new Promise(resolve=>{
      const id=crypto.randomUUID();const timer=setTimeout(()=>{this.pending.delete(id);BestBookNative.cancel(id);resolve({status:'unavailable',message:'Website check timed out.',rows:[]});},40000);
      const finish=value=>{clearTimeout(timer);this.pending.delete(id);resolve(value);};
      this.pending.set(id,{query,provider,finish});
      signal.addEventListener('abort',()=>{BestBookNative.cancel(id);finish({status:'cancelled',message:'Search cancelled.',rows:[]});},{once:true});
      BestBookNative.collect(JSON.stringify({id,query,provider,url:PublicSources.url(provider,query)}));
    });
    try{
      const response=await fetch('/local-collect',{method:'POST',headers:{'Content-Type':'application/json','X-BestBook-Local':'1'},body:JSON.stringify({query,provider}),signal});
      if(!response.ok)throw Error('Local collector unavailable');return await response.json();
    }catch{return {status:signal.aborted?'cancelled':'unavailable',message:signal.aborted?'Search cancelled.':'The on-device website reader is unavailable.',rows:[]};}
  },
  receiveNative(id,response){
    const pending=this.pending.get(id);if(!pending)return;
    try{pending.finish(response.snapshot?PublicSources.parse(response.snapshot,pending.query,pending.provider):{...response,rows:[]});}catch{pending.finish({status:'unreadable',message:'Website content could not be validated.',rows:[]});}
  },
  cancel(){this.abort?.abort();this.running=false;},
  redraw(){const element=document.getElementById('deal-results');if(element)element.innerHTML=renderDealResults();},
  async openProvider(id,details={}){
    const q=this.query||{from:route().from,to:route().to,date:state.date};
    const url=PublicSources.url(id,q);
    FareCache.saveRecent(q,id);
    if(globalThis.BestBookNative?.openAssistant)BestBookNative.openAssistant(JSON.stringify({provider:id,query:q,url,...details}));
    else window.open(url,'_blank','noopener,noreferrer');
  }
};
globalThis.onNativeCollection=(id,result)=>SearchController.receiveNative(id,result);
globalThis.onNativeCheckout=async record=>{
  try{
    const q=PublicSources.validateQuery(record.query);const provider=PublicSources.providers.find(p=>p.id===record.provider);if(!provider)return;
    const ledger=await FareCache.ready;const now=Date.now();
    await ledger.append({...q,provider:provider.name,operator:record.operator,departure:record.departure,seat:record.seat,busType:'Checkout-confirmed service',amountMinor:record.amountMinor,currency:'INR',basis:'final',source:'checkout',observedAt:now,expiresAt:now+5*60000,profileKey:FareCache.profileKey,collectorVersion:'checkout-dom-1'});
    SearchController.redraw();toast('Exact-seat checkout total saved privately on this device. No booking was made.');
  }catch{toast('The checkout total could not be validated. Check it on the website.');}
};
