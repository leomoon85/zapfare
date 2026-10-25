'use strict';
/** BestBook fare observation DAG. Inspired by PeerSplit; not its wire protocol.
 * A valid signature proves authorship/integrity, never price truth or availability.
 * Transport is intentionally separate from storage and validation.
 */
class FareLedger {
  static DOMAIN = 'BestBook/FareObservation/v1';
  static MAX_BLOCKS = 5000;
  constructor(db) {
    this.db = db;
    this.blocks = new Map();
    this.queue = Promise.resolve();
  }
  static canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(FareLedger.canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + FareLedger.canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  static bytes(value) { return new TextEncoder().encode(value); }
  static hex(bytes) { return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join(''); }
  static unhex(hex) {
    if (typeof hex !== 'string' || !/^(?:[0-9a-f]{2})+$/.test(hex)) throw new Error('Invalid hex encoding');
    return Uint8Array.from(hex.match(/../g), s => parseInt(s, 16));
  }
  static async digest(value) { return FareLedger.hex(await crypto.subtle.digest('SHA-256', FareLedger.bytes(value))); }
  static async open(name = 'bestbook-fare-ledger-v1') {
    if (!globalThis.crypto?.subtle) throw new Error('Secure cryptography is unavailable on this device');
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('identity');
        request.result.createObjectStore('blocks', {keyPath:'id'});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const ledger = new FareLedger(db);
    let identity = await ledger.read('identity', 'device');
    if (!identity) {
      // WebCrypto persists the non-extractable private CryptoKey in IndexedDB.
      try {
        const keys = await crypto.subtle.generateKey('Ed25519', false, ['sign','verify']);
        identity = {privateKey:keys.privateKey, publicKey:FareLedger.hex(await crypto.subtle.exportKey('raw', keys.publicKey))};
      } catch (error) {
        if(!globalThis.BestBookCrypto?.ed25519) throw error;
        const secret=crypto.getRandomValues(new Uint8Array(32));
        const wrapKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
        const iv=crypto.getRandomValues(new Uint8Array(12));
        identity={publicKey:FareLedger.hex(BestBookCrypto.ed25519.getPublicKey(secret)),wrapKey,iv,encrypted:await crypto.subtle.encrypt({name:'AES-GCM',iv},wrapKey,secret)};
        secret.fill(0);
      }
      await ledger.write('identity', identity, 'device');
    }
    ledger.identity = identity;
    const stored = await ledger.read('blocks');
    const verified = await ledger.validateBatch(stored || [], new Map());
    ledger.blocks = verified;
    return ledger;
  }
  read(store, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = key === undefined ? tx.objectStore(store).getAll() : tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  write(store, value, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      if (key === undefined) tx.objectStore(store).put(value); else tx.objectStore(store).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
    });
  }
  static validateObservation(o, now = Date.now()) {
    const fields = ['from','to','date','provider','operator','departure','seat','busType','amountMinor','currency','basis','source','observedAt','expiresAt'];
    const optional=['arrival','availableSeats','sourceUrl','evidenceHash','collectorVersion','offerText','profileKey'];
    if (!o || fields.some(k=>!(k in o)) || Object.keys(o).some(k=>!fields.includes(k)&&!optional.includes(k))) throw new Error('Invalid observation schema');
    if(o.arrival!==undefined&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(o.arrival))throw new Error('Invalid arrival');
    if(o.availableSeats!==undefined&&(!Number.isInteger(o.availableSeats)||o.availableSeats<0||o.availableSeats>100))throw new Error('Invalid availability');
    if(o.sourceUrl!==undefined){const u=new URL(o.sourceUrl);if(u.protocol!=='https:'||!['www.redbus.in','www.abhibus.com','www.ixigo.com'].includes(u.hostname)||u.username||u.password||u.hash||o.sourceUrl.length>500)throw new Error('Invalid public source URL');}
    if(o.profileKey!==undefined&&!/^[0-9a-f]{64}$/.test(o.profileKey))throw new Error('Invalid profile scope');
    if(o.evidenceHash!==undefined&&!/^[0-9a-f]{64}$/.test(o.evidenceHash))throw new Error('Invalid evidence digest');
    for(const k of ['collectorVersion','offerText'])if(o[k]!==undefined&&(typeof o[k]!=='string'||o[k].length>240))throw new Error('Invalid source metadata');
    for (const key of ['from','to','provider','operator','seat','busType']) {
      if (typeof o[key] !== 'string' || !o[key].trim() || o[key].length > 120) throw new Error('Invalid observation field: ' + key);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date) || new Date(o.date+'T00:00:00Z').toISOString().slice(0,10) !== o.date) throw new Error('Invalid journey date');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(o.departure)) throw new Error('Invalid departure');
    if (!Number.isSafeInteger(o.amountMinor) || o.amountMinor <= 0 || o.amountMinor > 10000000 || o.currency !== 'INR') throw new Error('Invalid money');
    if (!['final','starting'].includes(o.basis) || !['manual','public-page','checkout'].includes(o.source)) throw new Error('Invalid provenance');
    if (!Number.isSafeInteger(o.observedAt) || !Number.isSafeInteger(o.expiresAt) || o.observedAt > now + 60000 || o.expiresAt <= o.observedAt || o.expiresAt - o.observedAt > 15*60000) throw new Error('Invalid observation lifetime');
  }
  static unsigned(block) {
    const {version,domain,author,parents,clock,observation} = block;
    return {version,domain,author,parents,clock,observation};
  }
  async validateBatch(incoming, existing = this.blocks) {
    if (!Array.isArray(incoming) || incoming.length > FareLedger.MAX_BLOCKS || existing.size + incoming.filter(b => !existing.has(b?.id)).length > FareLedger.MAX_BLOCKS) throw new Error('Ledger capacity exceeded');
    const next = new Map(existing);
    const sorted = [...incoming].sort((a,b) => a.clock-b.clock || String(a.id).localeCompare(String(b.id)));
    for (const block of sorted) {
      if (!block || Object.keys(block).sort().join(',') !== 'author,clock,domain,id,observation,parents,signature,version') throw new Error('Invalid block schema');
      if (block.version !== 1 || block.domain !== FareLedger.DOMAIN || !/^[0-9a-f]{64}$/.test(block.author) || !/^[0-9a-f]{64}$/.test(block.id) || !/^[0-9a-f]{128}$/.test(block.signature)) throw new Error('Invalid block envelope');
      if (!Array.isArray(block.parents) || block.parents.length > 32 || new Set(block.parents).size !== block.parents.length || block.parents.some(p => !/^[0-9a-f]{64}$/.test(p)) || [...block.parents].sort().join(',') !== block.parents.join(',')) throw new Error('Invalid parents');
      if (!Number.isSafeInteger(block.clock) || block.clock < 1) throw new Error('Invalid logical clock');
      FareLedger.validateObservation(block.observation);
      const canonical = FareLedger.canonical(FareLedger.unsigned(block));
      if (await FareLedger.digest(FareLedger.DOMAIN+'\0'+canonical) !== block.id) throw new Error('Block hash mismatch');
      const message=FareLedger.bytes(FareLedger.DOMAIN+'/Signature\0'+block.id);
      let verified=false;
      try {const key=await crypto.subtle.importKey('raw',FareLedger.unhex(block.author),'Ed25519',false,['verify']);verified=await crypto.subtle.verify('Ed25519',key,FareLedger.unhex(block.signature),message);}
      catch(error){if(!globalThis.BestBookCrypto?.ed25519)throw error;verified=BestBookCrypto.ed25519.verify(FareLedger.unhex(block.signature),message,FareLedger.unhex(block.author));}
      if(!verified)throw new Error('Invalid signature');
      if (block.parents.some(id => !next.has(id))) throw new Error('Missing parent history');
      const expected = 1 + Math.max(0, ...block.parents.map(id => next.get(id).clock));
      if (block.clock !== expected) throw new Error('Invalid causal clock');
      next.set(block.id, block);
    }
    return next;
  }
  serialize(work) {
    const run = this.queue.then(work);
    this.queue = run.catch(() => {});
    return run;
  }
  ingest(blocks) {
    // Clone before awaiting crypto so callers cannot mutate data during validation.
    const snapshot = JSON.parse(JSON.stringify(blocks));
    return this.serialize(async () => {
      const next = await this.validateBatch(snapshot);
      const added = [...next.values()].filter(b => !this.blocks.has(b.id));
      if (added.length) await new Promise((resolve, reject) => {
        const tx = this.db.transaction('blocks','readwrite');
        added.forEach(b => tx.objectStore('blocks').put(b));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Import aborted'));
      });
      this.blocks = next;
      return added.length;
    });
  }
  async append(observation) {
    FareLedger.validateObservation(observation);
    const scope=this.exportRoute(observation).filter(b=>b.observation.source===observation.source);
    const referenced = new Set(scope.flatMap(b => b.parents));
    const parents = scope.map(b=>b.id).filter(id => !referenced.has(id)).sort().slice(0,32);
    const unsigned = {version:1,domain:FareLedger.DOMAIN,author:this.identity.publicKey,parents,clock:1+Math.max(0,...parents.map(id=>this.blocks.get(id).clock)),observation:JSON.parse(JSON.stringify(observation))};
    const id = await FareLedger.digest(FareLedger.DOMAIN+'\0'+FareLedger.canonical(unsigned));
    const message=FareLedger.bytes(FareLedger.DOMAIN+'/Signature\0'+id);
    let signature;
    if(this.identity.privateKey) signature=FareLedger.hex(await crypto.subtle.sign('Ed25519',this.identity.privateKey,message));
    else {const secret=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:this.identity.iv},this.identity.wrapKey,this.identity.encrypted));try{signature=FareLedger.hex(BestBookCrypto.ed25519.sign(message,secret));}finally{secret.fill(0);}}
    const block = {...unsigned,id,signature};
    await this.ingest([block]);
    return JSON.parse(JSON.stringify(block));
  }
  exportRoute(query) {
    const ids=new Set(this.observations(query.from,query.to,query.date).map(o=>o.id));
    return this.export().filter(b=>ids.has(b.id));
  }
  export() { return JSON.parse(JSON.stringify([...this.blocks.values()].sort((a,b)=>a.clock-b.clock||a.id.localeCompare(b.id)))); }
  observations(from,to,date,now=Date.now()) {
    const normalize = v => v.trim().toLowerCase().replace(/\s+/g,' ').replace(/^bengaluru$/,'bangalore');
    return this.export().filter(b=>normalize(b.observation.from)===normalize(from)&&normalize(b.observation.to)===normalize(to)&&b.observation.date===date).map(b=>({...b.observation,id:b.id,author:b.author,stale:b.observation.expiresAt<=now}));
  }
  bestDeals(from,to,date,now=Date.now(),trustedAuthors=new Set([this.identity.publicKey])) {
    // Compare only final, freshly collected public-page fares for identical services/seats.
    const groups = new Map();
    const normalize = s=>s.trim().toLowerCase().replace(/\s+/g,' ');
    for (const o of this.observations(from,to,date,now)) {
      if (!trustedAuthors.has(o.author) || o.stale || o.source !== 'public-page' || o.basis !== 'final') continue;
      const key = [normalize(o.operator),o.departure,normalize(o.busType),normalize(o.seat)].join('|');
      const group = groups.get(key) || new Map();
      const current = group.get(o.provider);
      if (!current || o.observedAt > current.observedAt || (o.observedAt===current.observedAt && o.id<current.id)) group.set(o.provider,o);
      groups.set(key,group);
    }
    return [...groups.values()].map(group=>[...group.values()].sort((a,b)=>a.amountMinor-b.amountMinor||a.provider.localeCompare(b.provider))).filter(g=>g.length>1).sort((a,b)=>a[0].amountMinor-b[0].amountMinor);
  }
}
globalThis.FareLedger = FareLedger;
