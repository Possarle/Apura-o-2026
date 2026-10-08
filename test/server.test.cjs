const {test}=require('node:test');const assert=require('node:assert/strict');const {point,parseFeed,createServer,initializeDataDirectory}=require('../server');
test('volume novo recebe os dados incluídos e preserva a coleta existente',()=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'apuracao-volume-'));
 try{
  const seed=path.join(tmp,'seed'),disk=path.join(tmp,'disk');fs.mkdirSync(path.join(seed,'tse'),{recursive:true});
  fs.writeFileSync(path.join(seed,'history-1.json'),'[1]');fs.writeFileSync(path.join(seed,'tse','resultado.json'),'{"votos":12}');
  initializeDataDirectory(disk,seed);assert.equal(fs.readFileSync(path.join(disk,'tse','resultado.json'),'utf8'),'{"votos":12}');
  fs.writeFileSync(path.join(disk,'history-1.json'),'[1,2]');initializeDataDirectory(disk,seed);
  assert.equal(fs.readFileSync(path.join(disk,'history-1.json'),'utf8'),'[1,2]');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('histórico usa a data do TSE, preserva todos os candidatos e percentuais',()=>{
 const p=point({dg:'04/10/2026',hg:'17:02:30',s:{pst:'5,25'},carg:[{cd:'1',agr:[{par:[{n:'13',sg:'PT',cand:[{n:'13',nmu:'LULA',vap:'1.234',pvapn:'61,7'},{n:'22',nmu:'BOLSONARO',vap:'766',pvapn:'38,3'}]}]}]}]});
 assert.equal(p.t,Date.parse('2026-10-04T17:02:30-03:00'));assert.equal(p.a,5.25);assert.equal(p.cands[0].votos,1234);assert.equal(p.cands[0].pct,61.7);assert.equal(p.cands.length,2);assert.equal(point({}),null);
});
test('RSS filtra eleição, ordena, deduplica e rejeita links externos ou javascript',()=>{
 const item=(title,url,date='Sun, 04 Oct 2026 20:00:00 GMT')=>`<item><title><![CDATA[${title}]]></title><link>${url}</link><pubDate>${date}</pubDate></item>`;
 const xml='<rss>'+item('Eleições &amp; urnas','https://agenciabrasil.ebc.com.br/a')+item('Eleições duplicado','https://agenciabrasil.ebc.com.br/a')+item('Futebol','https://agenciabrasil.ebc.com.br/b')+item('Eleição falsa','javascript:alert(1)')+item('Eleição falsa','https://example.com/a')+item('Eleições sem data','https://agenciabrasil.ebc.com.br/c','errado')+'</rss>';
 const result=parseFeed(xml);assert.equal(result.length,1);assert.equal(result[0].source,'Agência Brasil');assert(!result[0].title.includes('&amp;'));
});
test('servidor serve a página, valida turno e não permite ler arquivos locais',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/healthz')).status,200);assert.equal((await fetch(base+'/api/history?turno=9')).status,400);assert.equal((await fetch(base+'/server.js')).status,404);assert.equal((await fetch(base+'/api/history?turno=1')).status,200);
 const css=await fetch(base+'/professional.css');assert.equal(css.status,200);assert((await css.text()).includes('.app-sidebar'));
 assert.equal((await fetch(base+'/professional.css',{headers:{'If-None-Match':css.headers.get('etag')}})).status,304);
 }finally{await new Promise(r=>server.close(r));}
});
