const fs=require('fs');let s=fs.readFileSync('peer-network.js','utf8');
s=s.replace("this.onUpdate=options.onUpdate || (()=>{});","this.onUpdate=options.onUpdate || (()=>{});\n    this.onReport=options.onReport || (()=>{});");
s=s.replace("const payload=JSON.parse(event.content);\n    if(payload.version",`const payload=JSON.parse(event.content);
    if(payload.type==='coupon-report') {
      if(payload.version!==1||payload.topic!==this.topic||typeof payload.provider!=='string'||payload.provider.length>40||! /^[A-Z0-9_-]{2,40}$/.test(payload.code)||!['expired','quota','ineligible','unknown'].includes(payload.reason)||!Number.isSafeInteger(payload.expiresAt)||payload.expiresAt>Date.now()+31*60000||payload.expiresAt<=Date.now())throw Error('Invalid coupon report');
      this.onReport({...payload,id:event.id,author:event.pubkey,local:event.pubkey===this.publicKey});return;
    }
    if(payload.version`);
s=s.replace('  notify() {',`  async reportCoupon(query,provider,code,reason) {
    if(!this.secret)await this.initialize();
    const topic=await FarePeerNetwork.routeTopic(query);
    if(!/^[A-Z0-9_-]{2,40}$/.test(code)||!['expired','quota','ineligible','unknown'].includes(reason))throw Error('Invalid coupon report');
    const payload={version:1,type:'coupon-report',topic,provider,code,reason,expiresAt:Date.now()+30*60000};
    const event=BestBookCrypto.finalizeEvent({kind:FarePeerNetwork.KIND,created_at:Math.floor(Date.now()/1000),tags:[['d',FarePeerNetwork.TOPIC+':report:'+topic+':'+provider+':'+code],['t',FarePeerNetwork.TOPIC],['r',topic],['expiration',String(Math.floor(payload.expiresAt/1000))]],content:JSON.stringify(payload)},this.secret);
    this.pending.set(event.id,event);for(const entry of this.connections.values())this.send(entry,['EVENT',event]);
    const report={...payload,id:event.id,author:event.pubkey,local:true};this.onReport(report);this.notify();return report;
  }
  notify() {`);
fs.writeFileSync('peer-network.js',s);
