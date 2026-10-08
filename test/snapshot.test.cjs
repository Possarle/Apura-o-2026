const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'snapshot-data.js'),'utf8'),context);
const snapshot=context.window.APURACAO_SNAPSHOT;
test('pacote real inclui os cinco cargos em todas as UFs',()=>{
 assert.equal(snapshot.results.length,136);
 for(const cargo of ['1','3','5','6','7']){
  const results=snapshot.results.filter(x=>x.cargo===cargo);
  assert.equal(new Set(results.map(x=>x.uf)).size,cargo==='1'?28:27);
  for(const x of results){assert(x.data.cands.length>0,`${cargo}/${x.uf}`);assert(x.data.totalVotos>0);assert(x.data.hg);assert(x.data.dg);}
 }
 assert(snapshot.history.length>=3);
 assert(snapshot.news.items.length>0);
});
test('resultados reais e gráficos sobrevivem à falha de rede; busca, navegação e histórico funcionam',async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{
  url:'http://localhost:8080/#turno=1&cargo=1',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){
   w.HistoryCore=require('../history-core');w.APURACAO_SNAPSHOT=snapshot;
   w.AbortSignal=global.AbortSignal;w.AbortController=global.AbortController;
   w.fetch=async()=>{throw Error('Rede indisponível no teste');};
   w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
   w.SVGElement.prototype.getBBox=()=>({x:0,y:0,width:30,height:30});
  }
 });
 const w=dom.window,doc=w.document,wait=()=>new Promise(r=>setTimeout(r,120));
 const click=selector=>{const el=doc.querySelector(selector);assert(el,selector);el.click();};
 try{
  await wait();
  for(const cargo of ['1','3','5','6','7']){
   click(`[data-cargo="${cargo}"]`);await wait();
   const select=doc.querySelector('#estadoResultado');select.value='sp';select.dispatchEvent(new w.Event('change'));await wait();
   assert(doc.querySelector('#painel .cand'),`lista real ${cargo}`);
   assert(doc.querySelector('#graficos svg, #graficos .hb .tr i'),`gráfico real ${cargo}`);
   assert(!doc.querySelector('#avisoPacote').hidden,`cópia salva ${cargo}`);
  }
  click('[data-page="noticias"]');assert(doc.querySelector('#avisoPacote').hidden);
  assert.equal(doc.querySelectorAll('#noticiasLista article').length,snapshot.news.items.length);
  click('[data-page="resultados"]');assert(!doc.querySelector('#avisoPacote').hidden);
  click('[data-page="candidatos"]');
  const input=doc.querySelector('#buscaCandidato');input.value='TARCISIO';input.dispatchEvent(new w.Event('input'));await new Promise(r=>setTimeout(r,220));
  assert(doc.querySelector('#buscaLista [data-candidato]'));
  click('#buscaLista [data-candidato]');assert(doc.querySelector('#perfilCandidato').textContent.includes('TARC'));
  click('[data-close-profile]');assert(!doc.querySelector('[data-close-profile]'));
  click('[data-page="resultados"]');click('[data-cargo="1"]');await wait();
  assert(doc.querySelector('#timeline svg'));const slider=doc.querySelector('#tl-slider');assert.equal(Number(slider.max),snapshot.history.length-1);
  slider.value='0';slider.dispatchEvent(new w.Event('input'));assert(doc.querySelector('#timeline').textContent.includes('21:47'));
  assert.equal(errors.length,0,errors.join('\n'));
 }finally{dom.window.close();}
});
