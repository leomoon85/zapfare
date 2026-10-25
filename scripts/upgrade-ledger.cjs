const fs=require('fs');let s=fs.readFileSync('fare-ledger.js','utf8');
s=s.replace("const keys = await crypto.subtle.generateKey('Ed25519', false, ['sign','verify']);\n      identity = {privateKey:keys.privateKey, publicKey:FareLedger.hex(await crypto.subtle.exportKey('raw', keys.publicKey))};",`try {
        const keys = await crypto.subtle.generateKey('Ed25519', false, ['sign','verify']);
        identity = {privateKey:keys.privateKey, publicKey:FareLedger.hex(await crypto.subtle.exportKey('raw', keys.publicKey))};
      } catch (error) {
        if(!globalThis.BestBookCrypto?.ed25519) throw error;
        const secret=crypto.getRandomValues(new Uint8Array(32));
        const wrapKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
        const iv=crypto.getRandomValues(new Uint8Array(12));
        identity={publicKey:FareLedger.hex(BestBookCrypto.ed25519.getPublicKey(secret)),wrapKey,iv,encrypted:await crypto.subtle.encrypt({name:'AES-GCM',iv},wrapKey,secret)};
        secret.fill(0);
      }`);
s=s.replace("if (!o || FareLedger.canonical(Object.keys(o).sort()) !== FareLedger.canonical(fields.sort())) throw new Error('Invalid observation schema');",`const optional=['arrival','availableSeats','sourceUrl','evidenceHash','collectorVersion','offerText'];
    if (!o || fields.some(k=>!(k in o)) || Object.keys(o).some(k=>!fields.includes(k)&&!optional.includes(k))) throw new Error('Invalid observation schema');
    if(o.arrival!==undefined&&!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(o.arrival))throw new Error('Invalid arrival');
    if(o.availableSeats!==undefined&&(!Number.isInteger(o.availableSeats)||o.availableSeats<0||o.availableSeats>100))throw new Error('Invalid availability');
    if(o.sourceUrl!==undefined){const u=new URL(o.sourceUrl);if(u.protocol!=='https:'||!['www.redbus.in','www.abhibus.com','www.ixigo.com'].includes(u.hostname)||u.username||u.password||u.hash||o.sourceUrl.length>500)throw new Error('Invalid public source URL');}
    if(o.evidenceHash!==undefined&&!/^[0-9a-f]{64}$/.test(o.evidenceHash))throw new Error('Invalid evidence digest');
    for(const k of ['collectorVersion','offerText'])if(o[k]!==undefined&&(typeof o[k]!=='string'||o[k].length>240))throw new Error('Invalid source metadata');`);
s=s.replace("const key = await crypto.subtle.importKey('raw', FareLedger.unhex(block.author), 'Ed25519', false, ['verify']);\n      if (!await crypto.subtle.verify('Ed25519', key, FareLedger.unhex(block.signature), FareLedger.bytes(FareLedger.DOMAIN+'/Signature\\0'+block.id))) throw new Error('Invalid signature');",`const message=FareLedger.bytes(FareLedger.DOMAIN+'/Signature\\0'+block.id);
      let verified=false;
      try {const key=await crypto.subtle.importKey('raw',FareLedger.unhex(block.author),'Ed25519',false,['verify']);verified=await crypto.subtle.verify('Ed25519',key,FareLedger.unhex(block.signature),message);}
      catch(error){if(!globalThis.BestBookCrypto?.ed25519)throw error;verified=BestBookCrypto.ed25519.verify(FareLedger.unhex(block.signature),message,FareLedger.unhex(block.author));}
      if(!verified)throw new Error('Invalid signature');`);
s=s.replace("const referenced = new Set([...this.blocks.values()].flatMap(b => b.parents));\n    const parents = [...this.blocks.keys()].filter(id => !referenced.has(id)).sort().slice(0,32);",`const scope=this.exportRoute(observation).filter(b=>b.observation.source===observation.source);
    const referenced = new Set(scope.flatMap(b => b.parents));
    const parents = scope.map(b=>b.id).filter(id => !referenced.has(id)).sort().slice(0,32);`);
s=s.replace("const signature = FareLedger.hex(await crypto.subtle.sign('Ed25519',this.identity.privateKey,FareLedger.bytes(FareLedger.DOMAIN+'/Signature\\0'+id)));",`const message=FareLedger.bytes(FareLedger.DOMAIN+'/Signature\\0'+id);
    let signature;
    if(this.identity.privateKey) signature=FareLedger.hex(await crypto.subtle.sign('Ed25519',this.identity.privateKey,message));
    else {const secret=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:this.identity.iv},this.identity.wrapKey,this.identity.encrypted));try{signature=FareLedger.hex(BestBookCrypto.ed25519.sign(message,secret));}finally{secret.fill(0);}}`);
s=s.replace('  export() {',`  exportRoute(query) {
    const ids=new Set(this.observations(query.from,query.to,query.date).map(o=>o.id));
    return this.export().filter(b=>ids.has(b.id));
  }
  export() {`);
fs.writeFileSync('fare-ledger.js',s);
