const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../election-core');
test('classificação para segundo turno não é confundida com eleição',()=>{
 assert.deepEqual(E.candidateStatus({e:'s',st:'2º turno'}),{segundoTurno:true,eleito:false});
 assert.deepEqual(E.candidateStatus({e:'s',st:'Eleito'}),{segundoTurno:false,eleito:true});
 assert.equal(E.governorStatus({cands:[{st:'Eleito',pct:60}]}),'decided');
 assert.equal(E.governorStatus({apurado:100,cands:[{st:'',pct:49},{st:'',pct:40}]}),'pending');
 assert.equal(E.governorStatus({cands:[{st:'2º turno'},{st:'2º turno'}]}),'runoff');
});
test('pacote confirma 5 estados e DF no 2º turno; RJ definido pela retotalização do TRE-RJ',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../snapshot-data.js'),'utf8'),ctx);
 const gov=ctx.window.APURACAO_SNAPSHOT.results.filter(x=>x.cargo==='3');
 const runoff=gov.filter(x=>E.governorStatus(x.data,null,x.uf)==='runoff').map(x=>x.uf).sort();
 assert.equal(JSON.stringify(runoff),JSON.stringify(['ac','am','df','es','rn','to']));
 assert.equal(gov.filter(x=>E.governorStatus(x.data,null,x.uf)==='decided').length,21);
 // Arquivo do TSE gerado depois da retotalização prevalece sobre a correção.
 const rj=gov.find(x=>x.uf==='rj').data;assert.equal(E.governorStatus({...rj,dg:'16/10/2026',hg:'10:00:00'},null,'rj'),'runoff');
 assert.equal(E.contenders(rj,null,'rj').length,0);
 for(const x of gov)for(const c of x.data.cands)assert(!(c.segundoTurno&&c.eleito));
});
test('HTML incorpora os estilos, regras e dados necessários à abertura isolada',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 for(const name of ['professional.css','history-core.js','election-core.js','snapshot-data.js'])assert(html.includes(`data-embedded="${name}"`),name);
 assert(!html.includes('<link rel="stylesheet" href="professional.css">'));
 assert(!/<script\s+src=/.test(html));
});
