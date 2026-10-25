const fs=require('node:fs');
function browserOptions(){return {headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:process.platform==='win32'&&fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{})};}
module.exports={browserOptions,chromium:require(process.env.PLAYWRIGHT_MODULE||'playwright').chromium};
