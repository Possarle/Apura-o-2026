const {test}=require('node:test');const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
// TSE falso para as funções da Vercel.
let tse;const arquivo=(pst,a,b)=>({dg:'25/10/2026',hg:'19:00:00',s:{pst},carg:[{cd:'1',agr:[{par:[{n:'13',sg:'PT',cand:[{n:'13',nmu:'LULA',vap:String(a)}]}]},{par:[{n:'22',sg:'PL',cand:[{n:'22',nmu:'FLAVIO BOLSONARO',vap:String(b)}]}]}]}]});
test.before(async()=>{
 tse=http.createServer((req,res)=>{const p=req.url;
  const r={'/oficial/comum/config/ele-c.json':{pl:[{c:'ele2026',e:[{cd:'6257',cdt2:'6258',abr:[{cp:[{cd:'1'}]}]}]}]},
   '/oficial/ele2026/6258/config/mun-e006258-cm.json':{abr:[{cd:'ac',mu:[{cd:'01120',cdi:'1200013',nm:'ACRELÂNDIA'},{cd:'01570',cdi:'1200054',nm:'ASSIS BRASIL'}]},{cd:'zz',mu:[{cd:'29955',cdi:'',nm:'LISBOA'}]}]},
   '/oficial/ele2026/6258/dados/ac/ac-c0001-e006258-u.json':arquivo('50,00',10,20),
   '/oficial/ele2026/6258/dados/ac/ac01120-c0001-e006258-u.json':arquivo('100,00',7,3),
   '/oficial/ele2026/6258/dados/ac/ac01570-c0001-e006258-u.json':arquivo('40,00',3,17),
   '/oficial/ele2026/6258/dados/sp/sp-c0001-e006258-u.json':arquivo('0,00',0,0)}[p];
  if(!r){res.statusCode=404;res.end('{}');return;}res.end(JSON.stringify(r));});
 await new Promise(r=>tse.listen(0,'127.0.0.1',r));process.env.TSE_HOST='http://127.0.0.1:'+tse.address().port;
});
test.after(()=>tse.close());
function chamar(nome,url){return new Promise((ok,falha)=>{const h={},res={statusCode:200,setHeader:(k,v)=>{h[k.toLowerCase()]=v;},end:b=>ok({status:res.statusCode,h,body:b==null?'':String(b)})};
 Promise.resolve(require('../api/'+nome)({url,method:'GET',headers:{}},res)).catch(falha);});}
test('vercel.json aponta rotas e funções que existem',()=>{
 const v=JSON.parse(fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8'));
 for(const r of v.rewrites){const f=r.destination.match(/^\/api\/([a-z-]+)/)[1];assert(fs.existsSync(path.join(__dirname,'../api',f+'.js')),f);}
 assert.equal(v.outputDirectory,'public');assert.deepEqual(v.regions,['gru1']);
});
test('proxy do TSE valida o caminho e encaminha o arquivo',async()=>{
 assert.equal((await chamar('tse','/api/tse?h=oficial&p=oficial/../../server.js')).status,400);
 assert.equal((await chamar('tse','/api/tse?h=oficial&p=simulado/simulado2026/x.json')).status,400);
 const r=await chamar('tse','/api/tse?h=oficial&p=oficial/ele2026/6258/dados/ac/ac-c0001-e006258-u.json');assert.equal(r.status,200);assert.match(r.h['cache-control'],/s-maxage=20/);
 // Sem resposta do TSE, usa a cópia salva no repositório.
 const salvo=await chamar('tse','/api/tse?h=oficial&p=oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json');assert.equal(salvo.status,200);assert.equal(salvo.h['x-apuracao-source'],'snapshot');
 assert.equal((await chamar('proxy-ok','/api/proxy-ok')).body,'ok');
});
test('municípios por estado: resumo, exterior e estado sem apuração',async()=>{
 const geral=JSON.parse((await chamar('municipios','/api/municipios?fonte=tse&cargo=1&turno=2')).body);assert.equal(geral.porUF,true);
 assert.equal((await chamar('municipios','/api/municipios?fonte=tse&cargo=6&turno=1&uf=ac')).status,400);
 assert.equal((await chamar('municipios','/api/municipios?fonte=tse&cargo=3&turno=2&uf=zz')).status,400);
 const ac=JSON.parse((await chamar('municipios','/api/municipios?fonte=tse&cargo=1&turno=2&uf=ac')).body);
 assert.deepEqual(ac.cands.map(c=>c.n),['13','22']);assert.deepEqual(ac.ufs.ac['01120'],['1200013','ACRELÂNDIA',100,7,3]);assert.deepEqual(ac.ufs.ac['01570'],['1200054','ASSIS BRASIL',40,3,17]);
 const sp=JSON.parse((await chamar('municipios','/api/municipios?fonte=tse&cargo=1&turno=2&uf=sp')).body);assert.deepEqual(sp.ufs,{});assert.equal(sp.apuradoUF,0);
});
test('histórico e notícias respondem sem disco permanente',async()=>{
 const h=JSON.parse((await chamar('history','/api/history?turno=1')).body);assert(h.points.length>0);
 assert.equal((await chamar('history','/api/history?turno=3')).status,400);
});
