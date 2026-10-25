'use strict';
// Incorpora os recursos essenciais: index.html funciona mesmo fora da pasta original.
const fs=require('node:fs'),path=require('node:path');
const base=__dirname,file=path.join(base,'index.html');let html=fs.readFileSync(path.join(base,'index.template.html'),'utf8');
function embed(name,tag){
 const content=fs.readFileSync(path.join(base,name),'utf8');
 const value=tag==='style'?content:content.replace(/<\/script/gi,'<\\/script');
 const block=`<!-- EMBED:${name}:START -->\n<${tag} data-embedded="${name}">\n${value}\n</${tag}>\n<!-- EMBED:${name}:END -->`;
 const start=`<!-- EMBED:${name}:START -->`,end=`<!-- EMBED:${name}:END -->`;
 if(html.includes(start)){const a=html.indexOf(start),b=html.indexOf(end,a)+end.length;html=html.slice(0,a)+block+html.slice(b);}
 else {const old=tag==='style'?`<link rel="stylesheet" href="${name}">`:`<script src="${name}"></script>`;if(!html.includes(old))throw Error('Recurso não encontrado: '+name);html=html.replace(old,()=>block);}
}
embed('professional.css','style');
for(const name of ['history-core.js','election-core.js','exterior-core.js','snapshot-data.js'])embed(name,'script');
// Mapas e globo ficam embutidos como texto inerte e só são executados quando a página precisa deles,
// para funcionar mesmo quando o index.html é aberto sozinho (sem os outros arquivos da pasta).
{
 const ini='<!-- EMBED:mapas:START -->',fim='<!-- EMBED:mapas:END -->';
 const blocos=['mapa-geo.js','globo-libs.js','globo-geo.js'].map(n=>`<script type="text/plain" data-embutido="${n}">\n${fs.readFileSync(path.join(base,n),'utf8').replace(/<\/script/gi,'<\\/script')}\n</script>`).join('\n');
 const bloco=`${ini}\n${blocos}\n${fim}`;
 if(html.includes(ini))html=html.slice(0,html.indexOf(ini))+bloco+html.slice(html.indexOf(fim)+fim.length);
 else{const i=html.lastIndexOf('</body>');if(i<0)throw Error('</body> não encontrado');html=html.slice(0,i)+bloco+'\n'+html.slice(i);}
}
fs.writeFileSync(file,html);console.log('HTML completo preparado:',Buffer.byteLength(html),'bytes.');
