'use strict';
/* Notícias: feeds do g1 e da Agência Brasil somados às manchetes salvas no pacote (inclui as do TSE).
   A CDN guarda o resultado por 10 minutos na semana da eleição. */
const {json,lerLocal}=require('./_comum');
const {parseFeed,FEEDS,newsInterval}=require('../servidor');
module.exports=async(req,res)=>{
 let salvas=[];try{salvas=JSON.parse(lerLocal('data/news.json')||'{}').items||[];}catch{}
 const r=await Promise.allSettled(FEEDS.map(async f=>{const x=await fetch(f.url,{headers:{'User-Agent':'Apuracao2026/3'},signal:AbortSignal.timeout(12000)});if(!x.ok)throw Error('HTTP '+x.status);const t=await x.text();if(!/<rss|<rdf:RDF/i.test(t))throw Error('Feed inválido');return parseFeed(t,f);}));
 const novas=r.filter(x=>x.status==='fulfilled').flatMap(x=>x.value);
 const items=[...new Map([...salvas,...novas].map(n=>[n.url,n])).values()].filter(n=>Date.now()-Date.parse(n.publishedAt)<30*86400000).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,30);
 const intervalo=newsInterval(),s=Math.round(intervalo/1000);
 json(res,200,{updatedAt:new Date().toISOString(),items,unavailableSources:r.flatMap((x,i)=>x.status==='rejected'?[FEEDS[i].source]:[]),stale:!novas.length,interval:intervalo},`public, max-age=0, s-maxage=${s}, stale-while-revalidate=${s*2}`);
};
