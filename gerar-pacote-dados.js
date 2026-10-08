'use strict';
// Gera uma cópia inicial usando exatamente o normalizador da interface.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=__dirname,html=fs.readFileSync(path.join(base,'index.template.html'),'utf8');
const body=html.slice(html.indexOf('function normalizar('),html.indexOf('\nconst chave ='));
const parse=html.slice(html.indexOf('const parseBR ='),html.indexOf('\nconst fmtInt'));
const ctx={ElectionCore:require('./election-core')};vm.createContext(ctx);vm.runInContext(parse+'\n'+body,ctx);
const manifest=JSON.parse(fs.readFileSync(path.join(base,'data/coleta-ufs.json'),'utf8'));
const results=[],municipios={};let missing=[];
for(const x of manifest){if(x.error){missing.push(x);continue;}const raw=JSON.parse(fs.readFileSync(path.join(base,'data/tse',x.path),'utf8'));
 if(x.cargo){const real=x.cargo==='7'&&x.uf==='df'?'8':x.cargo;const data=ctx.normalizar(raw,real);if(data.erro||!data.cands.length)throw Error('Arquivo sem candidatos: '+x.path);results.push({cargo:x.cargo,uf:x.uf,turno:1,data});}
 else if(x.path.includes('/config/mun-'))municipios[x.path.match(/ele2026\/(\d+)/)[1]]=raw;
}
if(results.length!==136)throw Error('Coleta incompleta: '+results.length+'/136');
const news=fs.existsSync(path.join(base,'data/news.json'))?JSON.parse(fs.readFileSync(path.join(base,'data/news.json'),'utf8')):null;
const history=JSON.parse(fs.readFileSync(path.join(base,'data/history-1.json'),'utf8'));
fs.writeFileSync(path.join(base,'snapshot-data.js'),'/* Resultados oficiais salvos. A interface exibe data e estado de atualização. */\nwindow.APURACAO_SNAPSHOT='+JSON.stringify({results,municipios,history,missing,news})+';\n');
console.log('Snapshot:',results.length,'recortes;',results.reduce((n,x)=>n+x.data.cands.length,0),'registros de candidatos.');
