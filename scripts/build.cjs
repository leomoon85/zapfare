const esbuild = require('esbuild');
esbuild.buildSync({entryPoints:['src/crypto.js'],bundle:true,format:'iife',platform:'browser',target:['es2020'],outfile:'vendor/crypto.js',minify:true,legalComments:'eof'});
console.log('Offline crypto bundle built.');
