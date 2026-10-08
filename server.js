'use strict';
// Node.js 24. Sem dependências externas. Use um volume persistente em DATA_DIR.
const http = require('node:http');
const zlib = require('node:zlib');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const HistoryCore = require('./history-core');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
function initializeDataDirectory(destination, seed = path.join(__dirname, 'data')) {
 const target=path.resolve(destination),source=path.resolve(seed);
 fs.mkdirSync(target,{recursive:true});
 if(target===source||!fs.existsSync(source))return;
 // Preenche um volume novo com o pacote; nunca substitui a coleta já existente.
 function copyMissing(from,to){
  fs.mkdirSync(to,{recursive:true});
  for(const entry of fs.readdirSync(from,{withFileTypes:true})){
   const input=path.join(from,entry.name),output=path.join(to,entry.name);
   if(input===target)continue;
   if(entry.isDirectory())copyMissing(input,output);
   else if(entry.isFile()&&!fs.existsSync(output))fs.copyFileSync(input,output,fs.constants.COPYFILE_EXCL);
  }
 }
 copyMissing(source,target);
}
// A execução direta também prepara uma cópia recém-clonada do repositório.
if(require.main===module&&['index.html','snapshot-data.js'].some(name=>!fs.existsSync(path.join(__dirname,name)))){
 require('./gerar-pacote-dados');require('./preparar-site');
}
initializeDataDirectory(DATA_DIR);
const numberBR = v => typeof v === 'number' ? v : Number(String(v || '0').replace(/\./g,'').replace(',','.')) || 0;
function load(name, fallback) {try{return JSON.parse(fs.readFileSync(path.join(DATA_DIR,name),'utf8'));}catch{return fallback;}}
function save(name, value) {const f=path.join(DATA_DIR,name);fs.writeFileSync(f+'.tmp',JSON.stringify(value));fs.renameSync(f+'.tmp',f);}
function request(url) {
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{headers:{'User-Agent':'Apuracao2026/2.0','Accept':'application/json,application/rss+xml,text/xml,*/*'}},res=>{
   if(res.statusCode!==200){res.resume();reject(Error('HTTP '+res.statusCode));return;}
   let chunks=[],size=0;res.on('data',chunk=>{size+=chunk.length;if(size>32*1024*1024){res.destroy(Error('Resposta excessiva'));return;}chunks.push(chunk);});
   res.on('end',()=>resolve({body:Buffer.concat(chunks),type:res.headers['content-type']}));res.on('error',reject);
  });req.setTimeout(18000,()=>req.destroy(Error('Tempo de espera excedido')));req.on('error',reject);
 });
}
function point(json) {
 const carg=json.carg?.find(c=>String(c.cd)==='1');if(!carg)return null;
 const cands=(carg.agr||[]).flatMap(a=>(a.par||[]).flatMap(p=>(p.cand||[]).map(c=>({n:String(c.n),nome:c.nmu||c.nm||'',part:p.sg||'',partN:String(p.n||''),votos:numberBR(c.vap),pct:numberBR(c.pvapn??c.pvap)}))));
 const total=cands.reduce((n,c)=>n+c.votos,0);if(!total)return null;
 cands.forEach(c=>{if(!c.pct)c.pct=c.votos/total*100;});
 const generated=HistoryCore.timestamp(json.dg,json.hg);
 return HistoryCore.normalize({t:generated??Date.now(),a:numberBR(json.s?.pst),cands,timeKind:generated===null?'observed':'official'});
}
let collecting=false;
async function collectHistory() {
 if(collecting)return; collecting=true;
 try {
  const turn=Date.now()>=Date.parse('2026-10-25T17:00:00-03:00')?2:1;
  if(Date.now()<Date.parse('2026-10-04T17:00:00-03:00'))return;
  let code=turn===1?6257:6258;
  try {const config=JSON.parse((await request('https://resultados.tse.jus.br/oficial/comum/config/ele-c.json')).body);for(const pl of config.pl||[])if(pl.c==='ele2026')for(const e of pl.e||[])if((e.abr||[]).some(a=>(a.cp||[]).some(c=>String(c.cd)==='1')))code=Number(turn===1?e.cd:e.cdt2)||code;}catch{}
  const url=`https://resultados.tse.jus.br/oficial/ele2026/${code}/dados/br/br-c0001-e${String(code).padStart(6,'0')}-u.json`;
  const p=point(JSON.parse((await request(url)).body));if(!p)return;
  const file=`history-${turn}.json`;save(file,HistoryCore.append(load(file,[]),p));
 }catch(e){console.warn('Histórico: coleta indisponível ('+e.message+').');}finally{collecting=false;}
}
const FEEDS=[{url:'https://g1.globo.com/rss/g1/politica/',host:'g1.globo.com',source:'g1'},{url:'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml',host:'agenciabrasil.ebc.com.br',source:'Agência Brasil'}];
function decode(s) {return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot|apos);|&#(?:x[\da-f]+|\d+);/gi,e=>{const m={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};if(m[e])return m[e];const n=e.startsWith('&#x')?parseInt(e.slice(3),16):parseInt(e.slice(2));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).trim();}
function parseFeed(xml, feed=FEEDS[1]) {
 const out=[];for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
  const tag=n=>decode(match[1].match(new RegExp('<'+n+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+n+'>','i'))?.[1]||'');
  const title=tag('title'), url=tag('link'), date=Date.parse(tag('pubDate'));
  if(!/elei[çc]|eleitor|urna|vota[çc]|apura[çc]|segundo turno|primeiro turno|candidat/i.test(title+' '+tag('description')))continue;
  let u;try{u=new URL(url);}catch{continue;}if(u.protocol!=='https:'||u.hostname!==feed.host||!Number.isFinite(date))continue;
  out.push({title,url:u.href,publishedAt:new Date(date).toISOString(),source:feed.source});
 }
 return [...new Map(out.map(n=>[n.url,n])).values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,18);
}
let news=load('news.json',null), newsPending=null, lastAttempt=0, newsFailed=false;
async function refreshNews() {
 if(newsPending)return newsPending;
 if(Date.now()-lastAttempt<3600000)return news;
 lastAttempt=Date.now();
 newsPending=(async()=>{try{
  const responses=await Promise.allSettled(FEEDS.map(async feed=>{const xml=(await request(feed.url)).body.toString('utf8');if(!/<rss|<rdf:RDF/i.test(xml))throw Error('Feed inválido');return parseFeed(xml,feed);}));
  const valid=responses.filter(r=>r.status==='fulfilled');if(!valid.length)throw Error('Fontes indisponíveis');
  news={updatedAt:new Date().toISOString(),items:[...new Map(valid.flatMap(r=>r.value).map(n=>[n.url,n])).values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,24),unavailableSources:responses.flatMap((r,i)=>r.status==='rejected'?[FEEDS[i].source]:[])};
  save('news.json',news);newsFailed=false;
 }catch(e){newsFailed=true;console.warn('Notícias: '+e.message);}finally{newsPending=null;}return news;})();return newsPending;
}
const cache=new Map(), inflight=new Map();
let nextSlot=0;
async function proxy(url) {
 const old=cache.get(url);if(old&&Date.now()-old.at<30000)return old.value;
 if(inflight.has(url))return inflight.get(url);
 // Limita novas requisições a 20/s, inclusive com vários visitantes.
 const start=Math.max(Date.now(),nextSlot);nextSlot=start+50;
 const p=(async()=>{await new Promise(r=>setTimeout(r,Math.max(0,start-Date.now())));const value=await request(url);if(value.body.length<2*1024*1024){if(cache.size>100)cache.delete(cache.keys().next().value);cache.set(url,{at:Date.now(),value});}return value;})();
 inflight.set(url,p);try{return await p;}finally{inflight.delete(url);}
}
function createServer() {return http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/__proxy_ok'){res.end('ok');return;}
 if(u.pathname==='/healthz')return json(200,{status:'ok'});
 if(u.pathname==='/api/history'){const turn=u.searchParams.get('turno')||'1';if(!['1','2'].includes(turn))return json(400,{error:'Turno inválido'});return json(200,{points:HistoryCore.merge(load(`history-${turn}.json`,[]))});}
 if(u.pathname==='/api/news'){await refreshNews();return news?json(200,{...news,stale:newsFailed||Date.now()-Date.parse(news.updatedAt)>3700000}):json(503,{error:'Feed indisponível'});}
 for(const [prefix,host] of [['/tse/','resultados.tse.jus.br'],['/tse-sim/','resultados-sim.tse.jus.br']])if(u.pathname.startsWith(prefix)){
  try{const r=await proxy('https://'+host+'/'+u.pathname.slice(prefix.length));res.writeHead(200,{'Content-Type':r.type||'application/json','Cache-Control':'no-store'});res.end(r.body);if(prefix==='/tse/'&&u.pathname.endsWith('.json')){try{const local=path.resolve(DATA_DIR,'tse',u.pathname.slice(prefix.length));const root=path.resolve(DATA_DIR,'tse')+path.sep;if(local.startsWith(root)){fs.mkdirSync(path.dirname(local),{recursive:true});fs.writeFileSync(local,r.body);}}catch{console.warn('Não foi possível salvar o cache do TSE.');}}}catch(e){const local=path.resolve(DATA_DIR,'tse',u.pathname.slice(prefix.length));const root=path.resolve(DATA_DIR,'tse')+path.sep;if(prefix==='/tse/'&&local.startsWith(root)&&fs.existsSync(local)){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Apuracao-Source':'snapshot'});fs.createReadStream(local).pipe(res);return;}const code=/HTTP (404|403|429)/.exec(e.message);json(code?Number(code[1]):502,{error:'Arquivo do TSE indisponível'});}return;
 }
 const assets={'/':'text/html','/index.html':'text/html','/snapshot-data.js':'application/javascript','/history-core.js':'application/javascript','/election-core.js':'application/javascript','/professional.css':'text/css','/favicon.svg':'image/svg+xml'};
 if(assets[u.pathname]){const f=path.join(__dirname,u.pathname==='/'?'index.html':u.pathname.slice(1));if(!fs.existsSync(f)){res.writeHead(404);res.end();return;}const stat=fs.statSync(f),etag=`"${stat.size}-${Math.round(stat.mtimeMs)}"`;res.setHeader('ETag',etag);res.setHeader('Cache-Control','no-cache');res.setHeader('Content-Type',assets[u.pathname]+'; charset=utf-8');if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}const stream=fs.createReadStream(f);if(/gzip/.test(req.headers['accept-encoding']||'')){res.setHeader('Content-Encoding','gzip');res.setHeader('Vary','Accept-Encoding');stream.pipe(zlib.createGzip()).pipe(res);}else stream.pipe(res);return;}
 res.writeHead(404);res.end('Não encontrado');
});}
if(require.main===module){createServer().listen(process.env.PORT||8080,()=>console.log('Site disponível em http://localhost:'+(process.env.PORT||8080)));if(process.env.DISABLE_BACKGROUND!=='1'){collectHistory();refreshNews();setInterval(collectHistory,60000);setInterval(refreshNews,3600000);}}
module.exports={point,parseFeed,createServer,initializeDataDirectory};
