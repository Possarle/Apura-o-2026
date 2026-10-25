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
// Formato compacto: candidatos em listas (sem repetir os nomes dos campos) e uma única lista de municípios.
// O próprio arquivo devolve o formato completo ao carregar, então a página e os testes não mudam.
const compactos=results.map(x=>{const {cands,...resto}=x.data;return {...x,data:{...resto,c:cands.map(c=>[c.sq,c.n,c.nome,c.nomeCompleto===c.nome?null:c.nomeCompleto,c.part,c.partN,c.votos,Math.round(c.pct*1e4)/1e4,c.st,c.sit])}};});
const base6257=municipios['6257']||Object.values(municipios)[0];
const listaMun={abr:(base6257?.abr||[]).map(a=>({cd:a.cd,ds:a.ds,mu:(a.mu||[]).map(m=>({cd:m.cd,cdi:m.cdi,nm:m.nm}))}))};
const expandir=`function(p){var seg=/2\\s*[º°o]?\\s*turno|segundo\\s+turno/i,ele=/^eleit[oa](?:\\s|$)/i;
 p.results.forEach(function(x){x.data.cands=x.data.c.map(function(a){return {sq:a[0],n:a[1],nome:a[2],nomeCompleto:a[3]==null?a[2]:a[3],part:a[4],partN:a[5],votos:a[6],pct:a[7],segundoTurno:seg.test(a[8]||''),eleito:ele.test(String(a[8]||'').trim()),st:a[8],sit:a[9]};});delete x.data.c;});
 var m=p.municipios.lista;p.municipios={};p.codigosMunicipios.forEach(function(c){p.municipios[c]=m;});delete p.codigosMunicipios;return p;}`;
fs.writeFileSync(path.join(base,'snapshot-data.js'),'/* Resultados oficiais salvos. A interface exibe data e estado de atualização. */\nwindow.APURACAO_SNAPSHOT=('+expandir+')('+JSON.stringify({results:compactos,municipios:{lista:listaMun},codigosMunicipios:Object.keys(municipios),history,missing,news})+');\n');
console.log('Snapshot:',results.length,'recortes;',results.reduce((n,x)=>n+x.data.cands.length,0),'registros de candidatos.');
