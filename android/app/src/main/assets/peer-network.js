'use strict';
/** NIP-01 transport for BestBook-only public observations. No expense group keys. */
class FarePeerNetwork {
  static KIND = 30078;
  static TOPIC = 'bestbook-fares-v1';
  static DEFAULT_RELAYS = ['wss://relay.damus.io','wss://nos.lol'];
  constructor(ledger, options={}) {
    this.ledger=ledger;
    this.relays=options.relays || FarePeerNetwork.DEFAULT_RELAYS;
    this.onUpdate=options.onUpdate || (()=>{});
    this.onReport=options.onReport || (()=>{});
    this.socketFactory=options.socketFactory || (url=>new WebSocket(url));
    this.allowLocal=options.allowLocal===true;
    this.connections=new Map();
    this.pending=new Map();
    this.closed=false;
    this.query=null;
    this.topic=null;
    this.received=0;
    this.rejected=0;
    this.status='Not connected';
  }
  static async routeTopic(query) {
    const norm=s=>s.normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ').replace(/^bengaluru$/,'bangalore');
    return FareLedger.digest(JSON.stringify([norm(query.from),norm(query.to),query.date]));
  }
  async initialize() {
    let identity=await this.ledger.read('identity','nostr');
    if(!identity) {
      const secret=BestBookCrypto.generateSecretKey();
      const wrapKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
      const iv=crypto.getRandomValues(new Uint8Array(12));
      const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},wrapKey,secret);
      identity={wrapKey,iv,encrypted};
      await this.ledger.write('identity',identity,'nostr');
      secret.fill(0);
    }
    this.secret=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:identity.iv},identity.wrapKey,identity.encrypted));
    this.publicKey=BestBookCrypto.getPublicKey(this.secret);
  }
  async search(query) {
    if(!this.secret)await this.initialize();
    this.closed=false;
    this.query={...query};this.topic=await FarePeerNetwork.routeTopic(query);
    for(const url of this.relays)this.connect(url);
    for(const connection of this.connections.values())this.subscribe(connection);
    this.notify();
  }
  connect(url) {
    if(this.closed||this.connections.has(url))return;
    const parsed=new URL(url);
    if(parsed.protocol!=='wss:' && !(this.allowLocal&&parsed.protocol==='ws:'&&['127.0.0.1','localhost'].includes(parsed.hostname)))throw Error('Secure relay URL required');
    const entry={url,socket:null,state:'connecting',retry:0,timer:null,acks:new Set()};
    this.connections.set(url,entry);
    this.open(entry);
  }
  open(entry) {
    if(this.closed)return;
    try {
      const socket=this.socketFactory(entry.url);entry.socket=socket;entry.state='connecting';
      socket.onopen=()=>{entry.state='connected';entry.retry=0;this.subscribe(entry);for(const event of this.pending.values())this.send(entry,['EVENT',event]);this.notify();};
      socket.onmessage=event=>{this.receive(entry,event.data).catch(()=>{this.rejected++;this.notify();});};
      socket.onerror=()=>{entry.state='unavailable';this.notify();};
      socket.onclose=()=>{entry.state='disconnected';this.notify();if(!this.closed){entry.timer=setTimeout(()=>this.open(entry),Math.min(60000,2000*2**entry.retry++));}};
    } catch {entry.state='unavailable';this.notify();}
  }
  send(entry,message) {if(entry.socket?.readyState===1)entry.socket.send(JSON.stringify(message));}
  subscribe(entry) {
    if(!this.topic)return;
    this.send(entry,['CLOSE','bestbook-search']);
    this.send(entry,['REQ','bestbook-search',{kinds:[FarePeerNetwork.KIND],'#t':[FarePeerNetwork.TOPIC],'#r':[this.topic],since:Math.floor(Date.now()/1000)-1800,limit:30}]);
  }
  async receive(entry,raw) {
    if(typeof raw!=='string'||raw.length>512000)throw Error('Oversized relay message');
    const message=JSON.parse(raw);
    if(!Array.isArray(message))throw Error('Invalid relay message');
    if(message[0]==='OK') {
      if(message[2]===true&&this.pending.has(message[1])){entry.acks.add(message[1]);this.pending.delete(message[1]);}
      else if(message[2]===false)entry.lastError=String(message[3]||'Publish rejected').slice(0,180);
      this.notify();return;
    }
    if(message[0]==='NOTICE'||message[0]==='CLOSED'){entry.lastError=String(message.at(-1)).slice(0,180);this.notify();return;}
    if(message[0]!=='EVENT'||message[1]!=='bestbook-search')return;
    const event=message[2];
    if(!event||event.kind!==FarePeerNetwork.KIND||!Array.isArray(event.tags)||event.tags.length>20||typeof event.content!=='string'||event.content.length>400000)throw Error('Invalid relay envelope');
    if(!BestBookCrypto.verifyEvent(event))throw Error('Invalid Nostr signature');
    if(event.created_at>Math.floor(Date.now()/1000)+60||event.created_at<Math.floor(Date.now()/1000)-1800)return;
    if(!event.tags.some(t=>t[0]==='t'&&t[1]===FarePeerNetwork.TOPIC)||!event.tags.some(t=>t[0]==='r'&&t[1]===this.topic))return;
    const payload=JSON.parse(event.content);
    if(payload.type==='coupon-report') {
      if(payload.version!==1||payload.topic!==this.topic||typeof payload.provider!=='string'||payload.provider.length>40||! /^[A-Z0-9_-]{2,40}$/.test(payload.code)||!['expired','quota','ineligible','unknown'].includes(payload.reason)||!Number.isSafeInteger(payload.expiresAt)||payload.expiresAt>Date.now()+31*60000||payload.expiresAt<=Date.now())throw Error('Invalid coupon report');
      this.onReport({...payload,id:event.id,author:event.pubkey,local:event.pubkey===this.publicKey});return;
    }
    if(payload.version!==1||payload.topic!==this.topic||!Array.isArray(payload.blocks)||payload.blocks.length>300)throw Error('Invalid fare payload');
    const expectedTopic=this.topic;
    for(const block of payload.blocks) {
      if(block.observation?.source!=='public-page'||await FarePeerNetwork.routeTopic(block.observation)!==expectedTopic)throw Error('Cross-route or non-public observation');
    }
    const count=await this.ledger.ingest(payload.blocks);
    this.received+=count;this.notify();
  }
  async publish(query) {
    if(!this.secret)await this.initialize();
    const topic=await FarePeerNetwork.routeTopic(query);
    // Whole causal history for this route/date; parents never cross public route scopes.
    const blocks=this.ledger.exportRoute(query).filter(b=>b.observation.source==='public-page');
    if(!blocks.length)return null;
    if(blocks.length>300)throw Error('Route history is too large to share; keep local');
    const content=JSON.stringify({version:1,topic,blocks});
    if(content.length>400000)throw Error('Route payload exceeds share limit');
    const event=BestBookCrypto.finalizeEvent({kind:FarePeerNetwork.KIND,created_at:Math.floor(Date.now()/1000),tags:[['d',FarePeerNetwork.TOPIC+':'+topic],['t',FarePeerNetwork.TOPIC],['r',topic],['expiration',String(Math.floor(Date.now()/1000)+1800)]],content},this.secret);
    if(this.pending.size>=20)this.pending.delete(this.pending.keys().next().value);
    this.pending.set(event.id,event);
    for(const entry of this.connections.values())this.send(entry,['EVENT',event]);
    this.notify();return event.id;
  }
  async reportCoupon(query,provider,code,reason) {
    if(!this.secret)await this.initialize();
    const topic=await FarePeerNetwork.routeTopic(query);
    if(!/^[A-Z0-9_-]{2,40}$/.test(code)||!['expired','quota','ineligible','unknown'].includes(reason))throw Error('Invalid coupon report');
    const payload={version:1,type:'coupon-report',topic,provider,code,reason,expiresAt:Date.now()+30*60000};
    const event=BestBookCrypto.finalizeEvent({kind:FarePeerNetwork.KIND,created_at:Math.floor(Date.now()/1000),tags:[['d',FarePeerNetwork.TOPIC+':report:'+topic+':'+provider+':'+code],['t',FarePeerNetwork.TOPIC],['r',topic],['expiration',String(Math.floor(payload.expiresAt/1000))]],content:JSON.stringify(payload)},this.secret);
    this.pending.set(event.id,event);for(const entry of this.connections.values())this.send(entry,['EVENT',event]);
    const report={...payload,id:event.id,author:event.pubkey,local:true};this.onReport(report);this.notify();return report;
  }
  notify() {
    const online=[...this.connections.values()].filter(c=>c.state==='connected').length;
    this.status=this.closed?'Disabled':online?`${online} relay${online===1?'':'s'} connected`:'Relay connection unavailable';
    this.onUpdate({status:this.status,connected:online,received:this.received,rejected:this.rejected,pending:this.pending.size});
  }
  close() {
    this.closed=true;
    for(const c of this.connections.values()){clearTimeout(c.timer);c.socket?.close();}
    this.connections.clear();this.secret?.fill(0);this.secret=null;this.notify();
  }
}
globalThis.FarePeerNetwork=FarePeerNetwork;
