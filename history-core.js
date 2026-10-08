/* Compartilhado entre navegador, coletor e testes. Sem dependências. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HistoryCore=factory();})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function timestamp(dg,hg){
  const m=String(dg||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/), h=String(hg||'').match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(!m||!h||+h[1]>23||+h[2]>59||+(h[3]||0)>59)return null;
  const date=`${m[3]}-${m[2]}-${m[1]}`;const t=Date.parse(`${date}T${h[1]}:${h[2]}:${h[3]||'00'}-03:00`);
  if(!Number.isFinite(t)||new Date(t-10800000).toISOString().slice(0,10)!==date)return null;
  return t;
 }
 function normalize(p){
  if(!p||!Number.isFinite(p.t)||p.t<0||p.t>8640000000000000||!Array.isArray(p.cands))return null;
  const seen=new Map();
  for(const c of p.cands){if(!c||!/^\d+$/.test(String(c.n))||!Number.isFinite(c.votos)||c.votos<0||!Number.isFinite(c.pct)||c.pct<0||c.pct>100)continue;
   seen.set(String(c.n),{n:String(c.n),nome:String(c.nome||c.n),part:String(c.part||''),partN:String(c.partN||''),votos:c.votos,pct:c.pct});}
  if(!seen.size)return null;
  return {t:p.t,a:Number.isFinite(p.a)?Math.max(0,Math.min(100,p.a)):0,cands:[...seen.values()],timeKind:p.timeKind==='observed'?'observed':p.timeKind==='official'?'official':'unknown'};
 }
 function merge(...lists){const byTime=new Map();for(const list of lists)if(Array.isArray(list))for(const raw of list){const p=normalize(raw);if(p)byTime.set(p.t,p);}return [...byTime.values()].sort((a,b)=>a.t-b.t);}
 function signature(p){return JSON.stringify([p.a,p.cands.slice().sort((a,b)=>a.n.localeCompare(b.n)).map(c=>[c.n,c.votos,c.pct])]);}
 function append(list,raw){const p=normalize(raw),h=merge(list);if(!p)return h;
  // Sem data oficial, não cria falsos pontos para a mesma fotografia.
  if(p.timeKind==='observed'&&h.length&&signature(h.at(-1))===signature(p))return h;
  return merge(h,[p]);
 }
 function nearest(h,t){if(!h.length)return -1;let lo=0,hi=h.length-1;while(lo<hi){const m=Math.floor((lo+hi)/2);if(h[m].t<t)lo=m+1;else hi=m;}return lo>0&&Math.abs(h[lo-1].t-t)<Math.abs(h[lo].t-t)?lo-1:lo;}
 return {timestamp,normalize,merge,append,nearest};
});
