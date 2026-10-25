const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createCollector,lerArquivo}=require('../coletor-municipios');
const ExteriorCore=require('../exterior-core');

const arquivoTSE=(pst,votos)=>({dg:'25/10/2026',hg:'19:00:00',s:{pst},carg:[{cd:'1',agr:[{par:[{n:'13',sg:'PT',cand:[{n:'13',nmu:'LULA',vap:String(votos[0])}]},{n:'22',sg:'PL',cand:[{n:'22',nmu:'FLAVIO BOLSONARO',vap:String(votos[1])}]}]}]}]});
function falsoTSE(){
 const pedidos=[];
 const respostas={
  'comum/config/ele-c.json':{pl:[{c:'ele2026',e:[{cd:'6257',cdt2:'6258',abr:[{cp:[{cd:'1'}]}]},{cd:'6259',cdt2:'6260',abr:[{cp:[{cd:'3'}]}]}]}]},
  'ele2026/6258/config/mun-e006258-cm.json':{abr:[{cd:'ac',mu:[{cd:'01120',cdi:'1200013',nm:'ACRELÂNDIA'},{cd:'01570',cdi:'1200054',nm:'ASSIS BRASIL'}]},{cd:'zz',mu:[{cd:'29955',cdi:'',nm:'LISBOA'}]},{cd:'sp',mu:[{cd:'71072',cdi:'3550308',nm:'SÃO PAULO'}]}]},
  'ele2026/6258/dados/ac/ac-c0001-e006258-u.json':arquivoTSE('50,00',[10,20]),
  'ele2026/6258/dados/ac/ac01120-c0001-e006258-u.json':arquivoTSE('100,00',[7,3]),
  'ele2026/6258/dados/ac/ac01570-c0001-e006258-u.json':arquivoTSE('40,00',[3,17]),
  'ele2026/6258/dados/zz/zz-c0001-e006258-u.json':arquivoTSE('100,00',[60,40]),
  'ele2026/6258/dados/zz/zz29955-c0001-e006258-u.json':arquivoTSE('100,00',[60,40]),
  'ele2026/6258/dados/sp/sp-c0001-e006258-u.json':arquivoTSE('0,00',[0,0])
 };
 return {pedidos,request:async url=>{const rel=url.replace(/^https:\/\/resultados\.tse\.jus\.br\/oficial\//,'');pedidos.push(rel);if(!respostas[rel])throw Error('HTTP 404');return {body:Buffer.from(JSON.stringify(respostas[rel]))};}};
}

test('lê apurado e votos nominais de um arquivo municipal',()=>{
 const r=lerArquivo(arquivoTSE('12,5',[1234,766]),'1');
 assert.equal(r.apurado,12.5);assert.deepEqual(r.cands.map(c=>[c.n,c.votos]),[['13',1234],['22',766]]);assert.equal(lerArquivo({},'1'),null);
});
test('coleta municípios e exterior, pula UF sem apuração e não repete município completo',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'apuracao-mun-'));
 try{
  const tse=falsoTSE(),col=createCollector({request:tse.request,dataDir:tmp,ratePerSecond:1000,automatico:false});
  await col.varrer('tse','1','2');
  const r=col.consultar('tse','1','2');
  assert.equal(r.codigo,6258);assert.deepEqual(r.cands.map(c=>c.n),['13','22']);
  assert.deepEqual(r.ufs.ac['01120'],['1200013','ACRELÂNDIA',100,7,3]);
  assert.deepEqual(r.ufs.ac['01570'],['1200054','ASSIS BRASIL',40,3,17]);
  assert.deepEqual(r.ufs.zz['29955'],['','LISBOA',100,60,40]);
  assert.equal(r.ufs.sp,undefined,'SP ainda sem votos não deve gerar consultas por município');
  assert(!tse.pedidos.some(p=>p.includes('sp71072')));
  assert(fs.existsSync(path.join(tmp,'municipios','tse-6258-c1.json')));
  tse.pedidos.length=0;await col.varrer('tse','1','2');
  assert(!tse.pedidos.some(p=>p.includes('ac01120')),'município com 100% não é consultado de novo');
  assert(tse.pedidos.some(p=>p.includes('ac01570')));
  // Um coletor novo retoma o que foi salvo em disco.
  const outro=createCollector({request:async()=>{throw Error('offline');},dataDir:tmp,ratePerSecond:1000,automatico:false});
  await outro.varrer('tse','1','2');assert.equal(outro.consultar('tse','1','2').ufs.ac['01120'][3],7);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('valida fonte, cargo e turno',()=>{
 const col=createCollector({request:async()=>({body:'{}'}),dataDir:os.tmpdir(),automatico:false});
 assert(col.validar('tse','1',2));assert(col.validar('sim','3',1));assert(!col.validar('tse','6',1));assert(!col.validar('tse','5',2));assert(!col.validar('x','1',1));
});
test('todas as cidades do exterior do TSE têm país, coordenadas e país no globo',()=>{
 const cfg=require('../data/tse/oficial/ele2026/6257/config/mun-e006257-cm.json');
 const zz=cfg.abr.find(a=>a.cd==='zz').mu;assert(zz.length>150);
 global.window={};require('../mapa-geo.js');const geo=global.window.MAPA_GEO;
 const ids=new Set(JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'../globo-geo.js'),'utf8').replace(/^[\s\S]*?window\.GLOBO_TOPO=/,'').replace(/;\s*$/,'')).objects.countries.geometries.map(g=>String(g.id)));
 for(const m of zz){const c=ExteriorCore.cidade(m.nm);assert(c,'sem país: '+m.nm);assert(Number.isFinite(c.lat)&&Number.isFinite(c.lon),'sem coordenadas: '+m.nm);assert(ids.has(c.pais),'país fora do globo: '+c.nomePais);}
 const paises=ExteriorCore.agruparPaises([{cd:'1',nome:'LISBOA',apurado:100,votos:[5,1]},{cd:'2',nome:'PORTO',apurado:50,votos:[1,3]},{cd:'3',nome:'MIAMI',apurado:100,votos:[1,2]}]);
 assert.equal(paises[0].nome,'Portugal');assert.deepEqual(paises[0].votos,[6,4]);assert.equal(paises[0].apurado,75);assert.equal(paises[1].nome,'Estados Unidos');
 const brasil=new Set(geo.brasil.municipios.map(m=>m[0]));const faltam=cfg.abr.filter(a=>a.cd!=='zz').flatMap(a=>a.mu).filter(m=>!brasil.has(m.cdi)&&!geo.brasil.pontos.some(p=>p[0]===m.cdi));
 assert.deepEqual(faltam,[],'todo município do TSE deve ter contorno ou ponto no mapa');
});
test('endpoint de municípios valida a consulta e responde 304 sem mudanças',async()=>{
 process.env.DISABLE_BACKGROUND='1';const {createServer}=require('../servidor');
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(base+'/api/municipios?cargo=6&turno=1')).status,400);
  const r=await fetch(base+'/api/municipios?fonte=tse&cargo=1&turno=1');assert.equal(r.status,200);const j=await r.json();assert(j.coleta&&j.ufs&&Array.isArray(j.cands));
  assert.equal((await fetch(base+'/api/municipios?fonte=tse&cargo=1&turno=1',{headers:{'If-None-Match':r.headers.get('etag')}})).status,304);
  for(const f of ['/mapa-geo.js','/exterior-core.js'])assert.equal((await fetch(base+f)).status,200,f);
 }finally{await new Promise(r=>server.close(r));}
});
