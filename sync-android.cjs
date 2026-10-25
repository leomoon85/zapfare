const fs=require('node:fs'),path=require('node:path');
for(const file of ["index.html","styles.css","data.js","vendor/crypto.js","fare-engine.js","fare-ledger.js","collector/public-sources.js","deal-engine.js","peer-network.js","search-controller.js","public-comparison.js","app.js","fare-cache.js","insights.js","collector/form-assistant.js","collector/checkout-assistant.js"]){const target=path.join('android/app/src/main/assets',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
console.log('Android assets synchronized.');
