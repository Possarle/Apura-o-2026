'use strict';
/* Resultados por município de UM estado (ou do exterior, uf=zz), resumidos em uma resposta.
   Sem "uf", avisa a página para pedir estado por estado (a Vercel não tem coletor em segundo plano).
   A CDN guarda cada estado por 60 s, então o TSE é consultado no máximo uma vez por minuto por estado. */
const {HOSTS,baixar,consulta,json,lerLocal}=require('./_comum');
const {lerArquivo,validar}=require('../coletor-municipios');
const UFS=['ac','al','ap','am','ba','ce','df','es','go','ma','mt','ms','mg','pa','pb','pr','pe','pi','rj','rn','rs','ro','rr','sc','se','sp','to'];
const ENV={tse:{host:HOSTS.oficial,env:'oficial'},sim:{host:HOSTS.sim,env:'simulado/simulado2026'}};
const PADRAO={tse:{fed:[6257,6258],est:[6259,6260]},sim:{fed:[21270,21271],est:[21272,21273]}};
const pad=(n,t)=>String(n).padStart(t,'0');
// Memória enquanto a instância da função estiver ativa: códigos, listas e municípios já 100% apurados.
const memo={codigos:{},listas:new Map(),completos:new Map()};

async function codigos(fonte){
 const c=memo.codigos[fonte];if(c&&Date.now()-c.em<600000)return c.cod;
 const cod={fed:[...PADRAO[fonte].fed],est:[...PADRAO[fonte].est]};
 try{
  const cfg=await baixar(`${ENV[fonte].host}/${ENV[fonte].env}/comum/config/ele-c.json`,{timeout:8000});let fed=false,est=false;
  for(const pl of cfg.pl||[])if(pl.c==='ele2026')for(const e of pl.e||[]){const cs=(e.abr||[]).flatMap(a=>(a.cp||[]).map(x=>String(x.cd))),par=[Number(e.cd),Number(e.cdt2)||0];if(!fed&&cs.includes('1')){cod.fed=par;fed=true;}else if(!est&&cs.includes('3')){cod.est=par;est=true;}}
 }catch{}
 memo.codigos[fonte]={cod,em:Date.now()};return cod;
}
async function listaMunicipios(fonte,cods){
 for(const cod of cods){
  if(!cod)continue;const k=fonte+cod,m=memo.listas.get(k);if(m)return m;
  const rel=`ele2026/${cod}/config/mun-e${pad(cod,6)}-cm.json`;let cfg=null;
  try{cfg=await baixar(`${ENV[fonte].host}/${ENV[fonte].env}/${rel}`,{timeout:10000});}catch{}
  if(!cfg?.abr?.length&&fonte==='tse'){try{cfg=JSON.parse(lerLocal('data/tse/oficial/'+rel));}catch{}}
  if(cfg?.abr?.length){memo.listas.set(k,cfg.abr);return cfg.abr;}
 }
 return [];
}
async function pool(itens,limite,fn){let i=0;await Promise.all(Array.from({length:Math.min(limite,itens.length)},async()=>{while(i<itens.length){const k=i++;await fn(itens[k]);}}));}

module.exports=async(req,res)=>{
 const q=consulta(req),fonte=q.get('fonte')||'tse',cargo=q.get('cargo')||'1',turno=Number(q.get('turno')||'1'),uf=String(q.get('uf')||'').toLowerCase();
 if(!validar(fonte,cargo,turno))return json(res,400,{error:'Consulta inválida'});
 if(!uf)return json(res,200,{porUF:true,fonte,cargo,turno,cands:[],ufs:{},coleta:{emAndamento:false,feitos:0,total:0}},'public, max-age=0, s-maxage=3600');
 if(!(UFS.includes(uf)||(uf==='zz'&&cargo==='1')))return json(res,400,{error:'UF inválida'});
 const cods=await codigos(fonte),grupo=cargo==='1'?'fed':'est',cod=cods[grupo][turno-1];
 const vazio=(extra={})=>json(res,200,{fonte,cargo,turno,uf,codigo:cod,atualizadoEm:new Date().toISOString(),cands:[],ufs:{},coleta:{emAndamento:false,feitos:0,total:0},...extra},'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
 if(!cod)return vazio();
 const base=`${ENV[fonte].host}/${ENV[fonte].env}/ele2026/${cod}/dados/${uf}`,arq=uf==='df'&&cargo==='7'?'8':cargo;
 // Resumo do estado: se a apuração ainda não começou, não consulta os municípios.
 let resumo=null;try{resumo=lerArquivo(await baixar(`${base}/${uf}-c${pad(arq,4)}-e${pad(cod,6)}-u.json`,{timeout:10000}),arq);}catch(e){return vazio({semDisputa:e.status===404||e.status===403});}
 if(!resumo||!resumo.apurado)return vazio({apuradoUF:0});
 const abr=await listaMunicipios(fonte,[cod,cods[grupo][0],cods.fed[0]]);
 const mu=(abr.find(a=>String(a.cd).toLowerCase()===uf)?.mu)||[];
 const cands=[],idx=new Map(),linhas={};let feitos=0,falhas=0;
 const registrar=(m,r)=>{const votos=[];for(const c of r.cands){if(!idx.has(c.n)){idx.set(c.n,cands.length);cands.push({n:c.n,nome:c.nome,part:c.part,partN:c.partN});}votos[idx.get(c.n)]=c.votos;}linhas[m.cd]={m,ap:r.apurado,votos};};
 await pool(mu,24,async(m0)=>{
  const m={cd:pad(m0.cd,5),cdi:String(m0.cdi||''),nome:String(m0.nm||m0.ds||'')},chave=[fonte,cod,arq,uf,m.cd].join('|');
  const pronto=memo.completos.get(chave);if(pronto){registrar(m,pronto);feitos++;return;}
  try{const r=lerArquivo(await baixar(`${base}/${uf}${m.cd}-c${pad(arq,4)}-e${pad(cod,6)}-u.json`,{timeout:12000}),arq);if(r){registrar(m,r);if(r.apurado>=100)memo.completos.set(chave,r);}}catch{falhas++;}
  feitos++;
 });
 const ufs={[uf]:{}};
 for(const {m,ap,votos} of Object.values(linhas))ufs[uf][m.cd]=[m.cdi,m.nome,ap,...cands.map((_,i)=>votos[i]||0)];
 const completo=resumo.apurado>=100&&!falhas;
 json(res,200,{fonte,cargo,turno,uf,codigo:cod,atualizadoEm:new Date().toISOString(),apuradoUF:resumo.apurado,cands,ufs,coleta:{emAndamento:false,feitos,total:mu.length,falhas}},
  completo?'public, max-age=0, s-maxage=900, stale-while-revalidate=3600':'public, max-age=0, s-maxage=60, stale-while-revalidate=120');
};
