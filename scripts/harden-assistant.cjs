const fs=require('fs');let s=fs.readFileSync('collector/checkout-assistant.js','utf8');
s=s.replace("if(target.operator&&target.departure&&!state.busOpened){",`if(target.query&&!state.contextConfirmed){
      const provider=location.hostname.includes('redbus')?'redbus':location.hostname.includes('ixigo')?'ixigo':'abhibus';
      const page=PublicSources.parse(PublicSources.snapshot(),target.query,provider);
      if(page.status!=='ready')return {status:'review',message:'Confirm the requested route and date on the website before any bus or seat assistance.'};
      state.contextConfirmed=true;
    }
    if(target.operator&&target.departure&&!state.busOpened){`);
fs.writeFileSync('collector/checkout-assistant.js',s);
let java=fs.readFileSync('android/app/src/main/java/com/zapfare/app/PublicCollector.java','utf8').replace('web.evaluateJavascript(checkoutAssistant+','web.evaluateJavascript(reader+"\\n"+checkoutAssistant+');java=java.replace('if("https".equals(u.getScheme()))return false;try{','if("https".equals(u.getScheme()))return false;if(!r.hasGesture())return true;try{');fs.writeFileSync('android/app/src/main/java/com/zapfare/app/PublicCollector.java',java);
let controller=fs.readFileSync('search-controller.js','utf8').replace("{onUpdate:()=>this.redraw(),onReport:r=>FareCache.addReport(r)}","{onUpdate:()=>{this.redraw();if(this.query)FareCache.checkWatches(this.query);},onReport:r=>FareCache.addReport(r)}");controller=controller.replace("this.network.search(clean).catch", "this.network.search(clean).then(()=>this.network.publish(clean)).catch");fs.writeFileSync('search-controller.js',controller);
let cache=fs.readFileSync('fare-cache.js','utf8').replace("o.author===this.ledger.identity.publicKey", "[this.ledger.identity.publicKey,...(this.settings.trustedAuthors||[])].includes(o.author)").replace("watch.lastNotifiedMinor!==best.amountMinor", "(!watch.lastNotifiedMinor||best.amountMinor<watch.lastNotifiedMinor)");fs.writeFileSync('fare-cache.js',cache);
