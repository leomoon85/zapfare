const fs=require('node:fs');
const path=require('node:path');
const Sources=require('./public-sources.js');
const reader=fs.readFileSync(path.join(__dirname,'public-sources.js'),'utf8');
const assistant=fs.readFileSync(path.join(__dirname,'form-assistant.js'),'utf8');
class DesktopCollector {
  constructor(){this.browser=null;this.launching=null;this.active=0;}
  async browserInstance(){
    if(this.browser?.isConnected())return this.browser;
    if(!this.launching)this.launching=(async()=>{const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const opts={headless:true};if(process.env.BROWSER_PATH)opts.executablePath=process.env.BROWSER_PATH;else if(process.platform==='win32'&&fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'))opts.executablePath='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';this.browser=await chromium.launch(opts);this.launching=null;return this.browser;})().catch(e=>{this.launching=null;throw e;});
    return this.launching;
  }
  async collect(query,provider,signal){
    Sources.validateQuery(query);
    const url=Sources.url(provider,query);
    if(this.active>=2)return {status:'busy',message:'Another local website search is running. Try again shortly.',rows:[]};
    this.active++;
    let context;
    try{
      const browser=await this.browserInstance();
      context=await browser.newContext({viewport:{width:412,height:915}});
      const abort=()=>context.close().catch(()=>{});signal?.addEventListener('abort',abort,{once:true});
      const page=await context.newPage();
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
      if(response&&[401,403,429].includes(response.status()))return {status:'blocked',message:'Website access is limited. No fare was collected.',rows:[]};
      let last;
      for(let i=0;i<12;i++){
        if(signal?.aborted)throw Error('Search cancelled');
        await page.evaluate(reader);await page.evaluate(assistant);
        const snapshot=await page.evaluate(()=>PublicSources.snapshot());
        last=Sources.parse(snapshot,query,provider);
        if(['ready','empty','blocked','unsupported'].includes(last.status))return last;
        const step=await page.evaluate(q=>advancePublicSearch(q),query);
        if(['blocked','interaction-required'].includes(step.status))return {...step,rows:[]};
        await page.waitForTimeout(900);
      }
      return last||{status:'unreadable',message:'The website did not provide a readable dated result.',rows:[]};
    }catch(error){return {status:signal?.aborted?'cancelled':'unavailable',message:signal?.aborted?'Search cancelled.':'The website could not be loaded by this device. Open it directly to continue.',rows:[]};}
    finally{this.active--;await context?.close().catch(()=>{});}
  }
  async close(){await this.browser?.close();}
}
module.exports={DesktopCollector};
