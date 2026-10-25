const {chromium,browserOptions}=require('./tests/browser.cjs');
const fs=require('fs'),http=require('http');
const server=http.createServer((req,res)=>res.end('<!doctype html><title>Ledger tests</title>')).listen(4176,'127.0.0.1').unref();
(async()=>{
 const browser=await chromium.launch(browserOptions());
 try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4176');await page.addScriptTag({content:fs.readFileSync('vendor/crypto.js','utf8')});await page.addScriptTag({content:fs.readFileSync('fare-ledger.js','utf8')});
  const result=await page.evaluate(async()=>{
   const check=(condition,message)=>{if(!condition)throw Error(message);};
   const reject=async(fn,message)=>{let failed=false;try{await fn();}catch{failed=true;}check(failed,message);};
   const a=await FareLedger.open('test-a-'+Date.now()),b=await FareLedger.open('test-b-'+Date.now());
   const now=Date.now(), date=new Date().toISOString().slice(0,10);
   const o={from:'Bangalore',to:'Hyderabad',date,provider:'redBus',operator:'Test Bus',departure:'21:30',seat:'L4',busType:'AC Sleeper',amountMinor:100000,currency:'INR',basis:'final',source:'public-page',observedAt:now,expiresAt:now+900000};
   const root=await a.append(o);const dbName=a.db.name;a.db.close();const reopened=await FareLedger.open(dbName);check(reopened.blocks.size===1,'Persistence');check(reopened.identity.publicKey===a.identity.publicKey,'Stable device identity');
   await b.ingest(reopened.export());check(await b.ingest(reopened.export())===0,'Duplicate idempotence');
   const bad=structuredClone(root);bad.observation.amountMinor=1;await reject(()=>b.ingest([bad]),'Tampered price accepted');
   const wrongSignature=structuredClone(root);wrongSignature.signature='00'.repeat(64);await reject(()=>b.ingest([wrongSignature]),'Bad signature accepted');
   const left=await reopened.append({...o,provider:'ixigo',amountMinor:90000,observedAt:now+1});const right=await b.append({...o,provider:'AbhiBus',amountMinor:80000,observedAt:now+2});
   await reopened.ingest(b.export());await b.ingest(reopened.export());check(reopened.blocks.size===3&&b.blocks.size===3,'Concurrent branch merge');check(JSON.stringify(reopened.export())===JSON.stringify(b.export()),'Deterministic merge');
   const join=await reopened.append({...o,provider:'redBus',amountMinor:110000,observedAt:now+3});check(join.parents.length===2&&join.clock===3,'DAG parent linking');
   const deals=reopened.bestDeals('Bengaluru','Hyderabad',date,now+4);check(deals.length===1&&deals[0][0].provider==='ixigo','Untrusted author should not influence ranking');check(deals[0].find(x=>x.provider==='redBus').amountMinor===110000,'Newest quote supersedes cheaper stale quote');
   check(reopened.bestDeals('Bangalore','Hyderabad',date,now+900001).length===0,'Expired fare ranked');check(reopened.observations('Delhi','Jaipur',date).length===0,'Wrong route leak');check(reopened.observations('Bangalore','Hyderabad','2001-01-01').length===0,'Wrong date leak');
   await reopened.append({...o,source:'manual',provider:'manual',amountMinor:100,observedAt:now+4});check(!reopened.bestDeals('Bangalore','Hyderabad',date,now+5).flat().some(x=>x.provider==='manual'),'Manual quote automatically ranked');
   await reject(()=>reopened.append({...o,amountMinor:1.5}),'Fractional paise accepted');await reject(()=>reopened.append({...o,expiresAt:now+900001}),'Oversized TTL accepted');
   const orphan=await FareLedger.open('test-orphan-'+Date.now());await reject(()=>orphan.ingest([left]),'Orphan accepted');check(orphan.blocks.size===0,'Invalid import modified memory');
   check(reopened.identity.privateKey.extractable===false,'Extractable private key');
   const generate=crypto.subtle.generateKey.bind(crypto.subtle);crypto.subtle.generateKey=(algorithm,...args)=>algorithm==='Ed25519'?Promise.reject(new DOMException('Test missing Ed25519','NotSupportedError')):generate(algorithm,...args);
   const fallback=await FareLedger.open('fallback-'+Date.now());check(!fallback.identity.privateKey&&fallback.identity.wrapKey.extractable===false,'Wrapped fallback identity');await fallback.append(o);const copy=await FareLedger.open('fallback-copy-'+Date.now());await copy.ingest(fallback.export());check(copy.blocks.size===1,'Fallback Ed25519 signature interoperability');crypto.subtle.generateKey=generate;
   return 'PASS: wrapped Ed25519 fallback, persistence, stable non-extractable identity, signatures, tamper rejection, duplicate replay, concurrent DAG merges, causal links, trusted-author ranking, newest-price selection, expiry, route/date isolation, manual quote exclusion, money/TTL validation, atomic invalid-import rejection.';
  });console.log(result);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
