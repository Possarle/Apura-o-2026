'use strict';
// Monta a pasta "public" que a Vercel publica (a página e os arquivos que ela pode carregar).
const fs=require('node:fs'),path=require('node:path');
const base=__dirname,dest=path.join(base,'public');
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const f of ['index.html','favicon.svg','mapa-geo.js','globo-geo.js','globo-libs.js','exterior-core.js','history-core.js','election-core.js','snapshot-data.js','professional.css'])
 fs.copyFileSync(path.join(base,f),path.join(dest,f));
console.log('Pasta public pronta para a Vercel.');
