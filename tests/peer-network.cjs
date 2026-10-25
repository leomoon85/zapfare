const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs');
const {WebSocketServer}=require('ws');
const {verifyEvent}=require('nostr-tools/pure');
const {chromium,browserOptions}=require('./browser.cjs');
(async()=>{
 const httpServer=http.createServer((req,res)=>res.end('<!doctype html><title>Peer protocol test</title>'));await new Promise(r=>httpServer.listen(0,'127.0.0.1',r));
 const relay=new WebSocketServer({port:0,host:'127.0.0.1'});await new Promise(r=>relay.on('listening',r));const events=[];const subs=new Map();let publishes=0;
 const matches=(event,filter)=>filter.kinds.includes(event.kind)&&(!filter['#r']||event.tags.some(t=>t[0]==='r'&&filter['#r'].includes(t[1])))&&event.tags.some(t=>t[0]==='t'&&filter['#t'].includes(t[1]));
 relay.on('connection',socket=>{socket.on('message',raw=>{const m=JSON.parse(raw.toString());if(m[0]==='REQ'){subs.set(socket,{id:m[1],filter:m[2]});for(const e of events)if(matches(e,m[2]))socket.send(JSON.stringify(['EVENT',m[1],e]));socket.send(JSON.stringify(['EOSE',m[1]]));}if(m[0]==='CLOSE')subs.delete(socket);if(m[0]==='EVENT'){const e=m[1];if(!verifyEvent(e)){socket.send(JSON.stringify(['OK',e.id,false,'invalid signature']));return;}publishes++;events.push(e);socket.send(JSON.stringify(['OK',e.id,true,'']));for(const [s,sub]of subs)if(matches(e,sub.filter))s.send(JSON.stringify(['EVENT',sub.id,e]));}});socket.on('close',()=>subs.delete(socket));});
 const browser=await chromium.launch(browserOptions());
 try{
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);const pages=await Promise.all(contexts.map(c=>c.newPage()));
  const relayUrl=`ws://127.0.0.1:${relay.address().port}`;
  for(const [i,page]of pages.entries()){
   await page.goto(`http://127.0.0.1:${httpServer.address().port}`);
   for(const script of ['vendor/crypto.js','fare-ledger.js','peer-network.js'])await page.addScriptTag({content:fs.readFileSync(script,'utf8')});
   await page.evaluate(async({url,i})=>{globalThis.query={from:'Delhi',to:'Jaipur',date:new Date(Date.now()+86400000).toISOString().slice(0,10)};globalThis.ledger=await FareLedger.open('peer-'+i);globalThis.reports=[];globalThis.network=new FarePeerNetwork(ledger,{relays:[url],allowLocal:true,onReport:r=>reports.push(r)});await network.search(query);},{url:relayUrl,i});
   await page.waitForFunction(()=>network.status.includes('connected'));
  }
  await pages[0].evaluate(async()=>{const now=Date.now();await ledger.append({...query,provider:'redBus',operator:'Fixture Bus',departure:'21:30',seat:'L4',busType:'AC Sleeper',amountMinor:90000,currency:'INR',basis:'final',source:'public-page',observedAt:now,expiresAt:now+900000});await network.publish(query);});
  await pages[1].waitForFunction(()=>ledger.blocks.size===1);assert.equal(await pages[1].evaluate(()=>ledger.export()[0].observation.amountMinor),90000);assert.notEqual(await pages[0].evaluate(()=>ledger.identity.publicKey),await pages[1].evaluate(()=>ledger.identity.publicKey));
  await pages[0].waitForFunction(()=>network.pending.size===0);
  await pages[0].evaluate(()=>network.reportCoupon(query,'redBus','TEST100','quota'));
  await pages[1].waitForFunction(()=>reports.length>0);assert.equal(await pages[1].evaluate(()=>reports[0].local),false,'Peer coupon report must not be promoted to local verified failure');
  const forged={...events[0],content:events[0].content.replace('90000','100')};for(const [socket,sub]of subs)socket.send(JSON.stringify(['EVENT',sub.id,forged]));await pages[1].waitForFunction(()=>network.rejected>0);assert.equal(await pages[1].evaluate(()=>ledger.export()[0].observation.amountMinor),90000);
  await pages[1].evaluate(async()=>{network.close();await network.search(query);});await pages[1].waitForFunction(()=>network.status.includes('connected'));assert.equal(await pages[1].evaluate(()=>ledger.blocks.size),1,'Reconnect replay must be idempotent');
  assert(publishes>=2);for(const p of pages)await p.evaluate(()=>network.close());
  console.log('PASS: two isolated browser identities exchanged signed fare history over a real WebSocket Nostr protocol relay; acknowledgement, duplicate replay, reconnect, signed scoped coupon report, and forged-event rejection verified. Test relay is local; this is not a public-relay availability claim.');
 }finally{await browser.close();for(const c of relay.clients)c.terminate();await new Promise(r=>relay.close(r));httpServer.close();}
})().catch(e=>{console.error(e);process.exit(1)});
