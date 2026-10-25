'use strict';
/* Funções compartilhadas pelas funções da Vercel (arquivos com "_" não viram rotas). */
const fs=require('node:fs'),path=require('node:path');
const RAIZ=path.join(__dirname,'..');
// Permite apontar para um TSE de teste (usado só nos testes locais).
const HOSTS={oficial:process.env.TSE_HOST||'https://resultados.tse.jus.br',sim:process.env.TSE_SIM_HOST||'https://resultados-sim.tse.jus.br'};
async function baixar(url,{timeout=15000,tipo='json'}={}){
 const r=await fetch(url,{headers:{'User-Agent':'Apuracao2026/3 (+vercel)',Accept:'application/json,application/rss+xml,text/xml,*/*'},signal:AbortSignal.timeout(timeout)});
 if(!r.ok)throw Object.assign(Error('HTTP '+r.status),{status:r.status});
 const buf=Buffer.from(await r.arrayBuffer());if(buf.length>32*1024*1024)throw Error('Resposta excessiva');
 return tipo==='json'?JSON.parse(buf.toString('utf8')):{body:buf,type:r.headers.get('content-type')};
}
function consulta(req){return new URL(req.url,'http://localhost').searchParams;}
function json(res,status,dados,cache='no-store'){
 res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',cache);res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(dados));
}
function lerLocal(rel){try{return fs.readFileSync(path.join(RAIZ,rel));}catch{return null;}}
module.exports={RAIZ,HOSTS,baixar,consulta,json,lerLocal};
