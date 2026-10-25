const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs'),path=require('path');const assert=require('assert/strict');
// Mapa geral no modo demonstração: municípios, aproximação por estado e exterior.
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const ler=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');const geo=ler('mapa-geo.js')+'\n'+ler('globo-libs.js')+'\n'+ler('globo-geo.js');
const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),{url:'http://localhost:8080/#fonte=demo&turno=1&cargo=1&mapa=municipios',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.eval(geo);w.scrollTo=()=>{};w.fetch=async()=>({ok:true,json:async()=>({updatedAt:new Date().toISOString(),items:[]}),text:async()=>'ok'});w.SVGElement.prototype.getBBox=()=>({x:10,y:10,width:30,height:30});w.HTMLElement.prototype.scrollIntoView=()=>{};w.SVGElement.prototype.scrollIntoView=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>null;}});
const w=dom.window,doc=w.document;const wait=(ms=400)=>new Promise(r=>setTimeout(r,ms));const click=s=>{assert(doc.querySelector(s),s);doc.querySelector(s).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
(async()=>{
 await wait(1500);
 const muns=doc.querySelectorAll('#camadaMun .mun');console.log('municípios no mapa',muns.length);assert(muns.length>=5571);
 assert(doc.querySelector('#mapa').classList.contains('modo-mun'));
 const pintados=[...muns].filter(m=>m.style.fill).length;console.log('pintados',pintados);assert(pintados>=5571);
 click('#ufs button[data-uf="sp"]');await wait(700);
 assert(doc.querySelector('#mapa').classList.contains('zoom'),'estado escolhido aproxima o mapa');
 assert(doc.querySelector('#camadaMun [data-uf="mg"]').classList.contains('fora'));
 doc.querySelector('#camadaMun [data-uf="sp"]').dispatchEvent(new w.MouseEvent('mousemove',{bubbles:true,clientX:10,clientY:10}));
 assert(!doc.querySelector('#dica').hidden);assert.equal(doc.querySelector('#dica .dica-uf').textContent,'São Paulo','dica identifica o município e o estado');
 click('[data-mapa-modo="estados"]');await wait();assert(!doc.querySelector('#mapa').classList.contains('modo-mun'));assert(!doc.querySelector('#mapa').classList.contains('zoom'));
 click('[data-cargo="6"]');await wait();assert(doc.querySelector('[data-mapa-modo="municipios"]').disabled,'deputados não têm camada municipal');
 click('[data-mapa-modo="exterior"]');await wait(1500);
 assert.equal(doc.querySelector('[data-cargo="1"]').getAttribute('aria-pressed'),'true','exterior usa a eleição presidencial');
 assert(!doc.querySelector('#globo').hidden,'globo aparece na aba Exterior');assert(doc.querySelector('#mapa').hasAttribute('hidden'));
 const linhas=doc.querySelectorAll('#exteriorPainel tr[data-pais]');console.log('países na tabela',linhas.length);assert.equal(linhas.length,12);
 click('#exteriorPainel [data-ext-todos]');await wait();assert(doc.querySelectorAll('#exteriorPainel tr[data-pais]').length>120);
 click('#exteriorPainel tr[data-pais="620"]');await wait();
 const cartao=doc.querySelector('#globoCartao');assert.equal(cartao.getAttribute('aria-hidden'),'false','escolher um país abre o cartão do globo');assert.equal(cartao.querySelector('h3').textContent,'Portugal');assert(cartao.querySelector('.globo-total b'));const cidades=[...doc.querySelectorAll('#exteriorPainel tr.ext-cidade')].map(t=>t.cells[0].textContent);console.log('Portugal',cidades);assert.deepEqual(cidades.sort(),['Faro','Lisboa','Porto']);
 click('[data-globo-fechar]');await wait();assert.equal(doc.querySelector('#globoCartao').getAttribute('aria-hidden'),'true','fechar o cartão volta o globo a girar');
 assert(w.location.hash.includes('mapa=exterior'));
 console.log('errors',errors);assert.equal(errors.length,0);w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1;});
