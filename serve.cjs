const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {DesktopCollector}=require('./collector/desktop.cjs');
const collector=new DesktopCollector();
const root=__dirname;
const allowed=new Set(['index.html','app.js','styles.css','data.js','fare-engine.js','fare-ledger.js','fare-cache.js','public-comparison.js','peer-network.js','deal-engine.js','search-controller.js','insights.js','vendor/crypto.js','collector/public-sources.js','collector/form-assistant.js']);
function createServer(){return http.createServer(async(req,res)=>{
  const requestUrl=new URL(req.url,'http://localhost');
  const host=req.headers.host||'';
  if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)){res.writeHead(403).end();return;}
  if(req.headers.origin&&req.headers.origin!==`http://${host}`){res.writeHead(403).end();return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(requestUrl.pathname==='/capabilities'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({collector:true,mode:'on-device-desktop'}));return;}
  if(requestUrl.pathname==='/local-collect'&&req.method==='POST'){
    if(req.headers['x-bestbook-local']!=='1'||!req.headers['content-type']?.startsWith('application/json')){res.writeHead(403).end();return;}
    let body='';
    for await(const chunk of req){body+=chunk;if(body.length>4096){res.writeHead(413).end();return;}}
    try{const {query,provider}=JSON.parse(body);const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});const result=await collector.collect(query,provider,controller.signal);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));}
    catch{res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({status:'invalid',message:'Invalid search request.',rows:[]}));}return;
  }
  let file;try{file=decodeURIComponent(requestUrl.pathname).replace(/^\//,'')||'index.html';}catch{res.writeHead(400).end();return;}
  if(req.method!=='GET'||!allowed.has(file)){res.writeHead(404).end();return;}
  try{const data=await fs.promises.readFile(path.join(root,file));res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(data);}catch{res.writeHead(404).end();}
});}
if(require.main===module){const port=Number(process.env.PORT||4175);const server=createServer();server.listen(port,'127.0.0.1',()=>console.log(`BestBook running at http://127.0.0.1:${port}`));process.on('SIGINT',async()=>{await collector.close();server.close();process.exit(0);});}
module.exports={createServer,collector};
