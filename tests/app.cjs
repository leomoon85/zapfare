const assert=require('node:assert/strict');
const {chromium,browserOptions}=require('./browser.cjs');
const {createServer,collector}=require('../serve.cjs');
const Sources=require('../collector/public-sources.js');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(browserOptions());
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>localStorage.setItem('bestbook-settings',JSON.stringify({community:false,paymentMethods:[],ownedPasses:[],newUser:false})));
  let blocked=false;const requests=[];
  await context.route('**/local-collect',async route=>{
    const {query,provider}=route.request().postDataJSON();requests.push({query,provider});
    if(blocked||provider==='abhibus')return route.fulfill({json:{status:'blocked',message:'Fixture access limit',rows:[]}});
    const amount=provider==='redbus'?'950':'900';const dateLabel=new Date(query.date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const card=`Fixture Travels\nAC Sleeper (2 + 1)\n21:30\n05h.30m\n03:00\nFrom ₹${amount}\n12 Seats`;
    const snapshot={url:Sources.url(provider,query),title:`${query.from} to ${query.to} Bus`,text:`${query.from} - ${query.to}\nBuses available on ${dateLabel}\n${card}`,cards:[card],inputs:[]};
    return route.fulfill({json:Sources.parse(snapshot,query,provider)});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('button',{name:'Find my bus'}).waitFor();
  await page.getByLabel('From city').fill('Delhi');await page.getByLabel('To city').fill('Jaipur');await page.getByRole('button',{name:'Find my bus'}).click();
  await page.getByRole('heading',{name:'Fixture Travels'}).waitFor();await page.waitForFunction(()=>!SearchController.running);
  assert.equal(requests.length,3);assert.equal(await page.locator('.bus-card').count(),1);assert.match(await page.locator('.bus-card').innerText(),/900/);assert.match(await page.locator('.bus-card').innerText(),/Advertised from/);assert(!await page.getByText('Best checkout deal',{exact:true}).count());
  assert.equal(await page.locator('#quote-form').count(),0,'No manual fare entry in the product flow');
  assert.equal(await page.evaluate(()=>FareCache.ledger.blocks.size),2);
  const key=await page.evaluate(()=>FareCache.ledger.identity.publicKey);
  await page.getByText('Watch for a lower fare',{exact:true}).click();await page.locator('#watch-form [name=target]').fill('1000');await page.getByRole('button',{name:'Save price watch'}).click();
  await page.getByRole('button',{name:'Profile',exact:true}).click();await page.locator('[data-payment=hdfc_cc]').check();assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('bestbook-settings')).paymentMethods.includes('hdfc_cc')));
  await page.getByRole('button',{name:'My trips',exact:true}).click();await page.getByText('Delhi → Jaipur',{exact:true}).waitFor();
  for(const width of [320,360,390,430,768]){
    await page.setViewportSize({width,height:844});for(const view of ['home','results','bookings','profile']){await page.goto(base+'/#'+view);await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${view} ${width}`);}
  }
  await page.goto(base+'/#home');await page.waitForFunction(()=>FareCache.ledger);assert.equal(await page.evaluate(()=>FareCache.ledger.identity.publicKey),key,'Device identity survives reload');
  await page.getByLabel('From city').fill('Pune');await page.getByLabel('To city').fill('Mumbai');blocked=true;await page.getByRole('button',{name:'Find my bus'}).click();await page.getByRole('heading',{name:'No verified fares yet'}).waitFor();assert.equal(await page.locator('.bus-card').count(),0);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/search-unavailable-390.png',fullPage:true});
  await page.goto(base+'/#home');await page.waitForTimeout(250);await page.screenshot({path:'artifacts/home-390.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: automatic search with controlled public-page fixtures, route/date queries, signed cache persistence, honest advertised pricing, source failure, no manual workflow, payment preferences, price watch, 20 viewport checks, no page errors. Fixture results do not establish live-site compatibility.');
 }finally{await browser.close();server.close();await collector.close();}
})().catch(e=>{console.error(e);process.exit(1)});
