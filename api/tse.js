'use strict';
/* Encaminha os arquivos públicos do TSE (a página não pode buscá-los direto por CORS).
   A CDN da Vercel guarda cada resposta por alguns segundos e atende todos os visitantes,
   então o TSE recebe poucas consultas mesmo com muita gente no site. */
const {HOSTS,baixar,consulta,lerLocal}=require('./_comum');
const VALIDO=/^(oficial|simulado\/simulado2026)\/[A-Za-z0-9_\-./]+\.json$/;
module.exports=async(req,res)=>{
 const q=consulta(req),h=q.get('h')==='sim'?'sim':'oficial',p=String(q.get('p')||'').replace(/^\/+/,'');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return;}
 if(!VALIDO.test(p)||p.includes('..')||(h==='oficial')!==p.startsWith('oficial/')){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end('{"error":"Caminho inválido"}');return;}
 const configuracao=/\/config\//.test(p);
 try{
  const r=await baixar(`${HOSTS[h]}/${p}`,{tipo:'bruto'});
  res.statusCode=200;res.setHeader('Content-Type',r.type||'application/json');
  res.setHeader('Cache-Control',configuracao?'public, max-age=0, s-maxage=600, stale-while-revalidate=3600':'public, max-age=0, s-maxage=20, stale-while-revalidate=40');
  res.end(r.body);
 }catch(e){
  // Sem resposta do TSE: usa a cópia oficial salva no repositório, se houver.
  const local=h==='oficial'?lerLocal('data/tse/'+p):null;
  if(local){res.statusCode=200;res.setHeader('Content-Type','application/json');res.setHeader('X-Apuracao-Source','snapshot');res.setHeader('Cache-Control','public, max-age=0, s-maxage=15');res.end(local);return;}
  const st=[403,404,429].includes(e.status)?e.status:502;res.statusCode=st;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control',st===404?'public, s-maxage=20':'no-store');res.end('{"error":"Arquivo do TSE indisponível"}');
 }
};
