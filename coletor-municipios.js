'use strict';
/*
 Coletor dos resultados por município (inclui as cidades do exterior, UF "zz").
 O TSE publica um arquivo por município; este módulo os consulta em segundo plano,
 com limite próprio de requisições, e entrega à página um único resumo compacto.
 Municípios com 100% das seções apuradas não são consultados de novo.
*/
const fs=require('node:fs'),path=require('node:path');

const AMBIENTES={tse:{host:'https://resultados.tse.jus.br',env:'oficial'},sim:{host:'https://resultados-sim.tse.jus.br',env:'simulado/simulado2026'}};
const PADRAO={tse:{fed:[6257,6258],est:[6259,6260]},sim:{fed:[21270,21271],est:[21272,21273]}};
const VALIDOS={'1':[1,2],'3':[1,2],'5':[1]};
const UFS=['ac','al','ap','am','ba','ce','df','es','go','ma','mt','ms','mg','pa','pb','pr','pe','pi','rj','rn','rs','ro','rr','sc','se','sp','to'];
const numero=v=>typeof v==='number'?v:Number(String(v??'0').replace(/\./g,'').replace(',','.'))||0;
const pad=(n,t)=>String(n).padStart(t,'0');

function validar(fonte,cargo,turno){
 return Object.hasOwn(AMBIENTES,fonte)&&Object.hasOwn(VALIDOS,cargo)&&VALIDOS[cargo].includes(turno);
}
/* Extrai apurado e votos nominais de um arquivo do TSE. */
function lerArquivo(json,cargo){
 const carg=(json?.carg||[]).find(c=>String(c.cd)===String(cargo))||(json?.carg||[])[0];
 if(!carg)return null;
 const cands=[];
 for(const agr of carg.agr||[])for(const par of agr.par||[])for(const c of par.cand||[])
  cands.push({n:String(c.n),nome:String(c.nmu||c.nm||''),part:String(par.sg||''),partN:String(par.n??''),votos:numero(c.vap)});
 return {apurado:numero(json.s?.pst),cands,dg:json.dg||'',hg:json.hg||''};
}

function createCollector({request,dataDir,ratePerSecond=12,concurrency=4,now=()=>Date.now(),automatico=true}){
 const conjuntos=new Map();let ativo=null;const fila=[];let proximo=0;
 const intervalo=1000/ratePerSecond;
 async function baixar(url){
  // Limite próprio, separado do proxy usado pelos visitantes.
  const inicio=Math.max(now(),proximo);proximo=inicio+intervalo;
  const espera=inicio-now();if(espera>0)await new Promise(r=>setTimeout(r,espera));
  return JSON.parse((await request(url)).body);
 }
 const arquivo=(fonte,cod,cargo)=>path.join(dataDir,'municipios',`${fonte}-${cod}-c${cargo}.json`);
 function salvar(c){
  try{const f=arquivo(c.fonte,c.codigo,c.cargo);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f+'.tmp',JSON.stringify(c.dados));fs.renameSync(f+'.tmp',f);}catch(e){console.warn('Municípios: não foi possível salvar ('+e.message+').');}
 }
 function carregar(fonte,cod,cargo){try{return JSON.parse(fs.readFileSync(arquivo(fonte,cod,cargo),'utf8'));}catch{return null;}}
 let codigos={},codigosEm={};
 async function codigo(fonte,cargo,turno){
  const grupo=cargo==='1'?'fed':'est';
  if(!codigos[fonte]||now()-codigosEm[fonte]>600000){
   const cod={fed:[...PADRAO[fonte].fed],est:[...PADRAO[fonte].est]};
   try{
    const cfg=await baixar(`${AMBIENTES[fonte].host}/${AMBIENTES[fonte].env}/comum/config/ele-c.json`);
    let fed=false,est=false;
    for(const pl of cfg.pl||[])if(pl.c==='ele2026')for(const e of pl.e||[]){
     const cargos=(e.abr||[]).flatMap(a=>(a.cp||[]).map(c=>String(c.cd)));const par=[Number(e.cd),Number(e.cdt2)||0];
     if(!fed&&cargos.includes('1')){cod.fed=par;fed=true;}else if(!est&&cargos.includes('3')){cod.est=par;est=true;}
    }
   }catch{}
   codigos[fonte]=cod;codigosEm[fonte]=now();
  }
  return {atual:codigos[fonte][grupo][turno-1],primeiro:codigos[fonte][grupo][0],fed:codigos[fonte].fed[0]};
 }
 const listas=new Map();
 async function listaMunicipios(fonte,cods){
  for(const cod of [cods.atual,cods.primeiro,cods.fed]){
   if(!cod)continue;
   const k=fonte+cod,salva=listas.get(k);if(salva&&now()-salva.em<3600000)return salva.abr;
   const rel=`ele2026/${cod}/config/mun-e${pad(cod,6)}-cm.json`;
   let cfg=null;try{cfg=await baixar(`${AMBIENTES[fonte].host}/${AMBIENTES[fonte].env}/${rel}`);}catch{}
   // Sem conexão com o TSE, usa a cópia salva da lista de municípios.
   if(!cfg?.abr?.length&&fonte==='tse'){try{cfg=JSON.parse(fs.readFileSync(path.join(dataDir,'tse',AMBIENTES.tse.env,rel),'utf8'));}catch{}}
   if(cfg?.abr?.length){listas.set(k,{abr:cfg.abr,em:now()});return cfg.abr;}
  }
  return [];
 }
 function conjunto(fonte,cargo,turno){
  const k=[fonte,cargo,turno].join('|');
  if(!conjuntos.has(k))conjuntos.set(k,{k,fonte,cargo,turno,codigo:null,dados:null,pedidoEm:0,fimEm:0,feitos:0,total:0,erro:null});
  return conjuntos.get(k);
 }
 async function varrer(c){
  const cods=await codigo(c.fonte,c.cargo,c.turno);
  if(!cods.atual){c.erro='sem-eleicao';return;}
  if(c.codigo!==cods.atual){c.codigo=cods.atual;c.dados=carregar(c.fonte,c.codigo,c.cargo)||{cands:[],ufs:{},atualizadoEm:null};}
  const d=c.dados,base=`${AMBIENTES[c.fonte].host}/${AMBIENTES[c.fonte].env}/ele2026/${c.codigo}/dados`;
  const abr=await listaMunicipios(c.fonte,cods);
  if(!abr.length){c.erro='sem-lista';return;}
  const ufs=abr.filter(a=>UFS.includes(String(a.cd).toLowerCase())||(c.cargo==='1'&&String(a.cd).toLowerCase()==='zz'));
  const cargoArq=uf=>c.cargo==='7'&&uf==='df'?'8':c.cargo;
  const indice=new Map(d.cands.map((x,i)=>[x.n,i]));
  const tarefas=[];
  for(const a of ufs){
   const uf=String(a.cd).toLowerCase();
   let resumo;
   try{resumo=lerArquivo(await baixar(`${base}/${uf}/${uf}-c${pad(cargoArq(uf),4)}-e${pad(c.codigo,6)}-u.json`),cargoArq(uf));}catch(e){continue;}  // UF sem disputa neste cargo/turno
   if(!resumo||(!resumo.apurado&&!d.ufs[uf]))continue;  // apuração ainda não começou
   const reg=(d.ufs[uf]||={});
   for(const m of a.mu||[]){const cd=String(m.cd).padStart(5,'0');if(!reg[cd]||reg[cd][2]<100)tarefas.push({uf,cd,cdi:String(m.cdi||''),nome:String(m.nm||m.ds||'')});}
  }
  c.feitos=0;c.total=tarefas.length;c.erro=null;
  let i=0,alterado=false;
  await Promise.all(Array.from({length:Math.min(concurrency,tarefas.length)},async()=>{
   while(i<tarefas.length){
    const t=tarefas[i++];
    try{
     const r=lerArquivo(await baixar(`${base}/${t.uf}/${t.uf}${t.cd}-c${pad(cargoArq(t.uf),4)}-e${pad(c.codigo,6)}-u.json`),cargoArq(t.uf));
     if(r){
      const votos=[];
      for(const x of r.cands){if(!indice.has(x.n)){indice.set(x.n,d.cands.length);d.cands.push({n:x.n,nome:x.nome,part:x.part,partN:x.partN});}votos[indice.get(x.n)]=x.votos;}
      d.ufs[t.uf][t.cd]=[t.cdi,t.nome,r.apurado,...Array.from({length:d.cands.length},(_,j)=>votos[j]||0)];alterado=true;
     }
    }catch{}
    c.feitos++;
    if(alterado&&c.feitos%250===0){d.atualizadoEm=new Date(now()).toISOString();salvar(c);alterado=false;}
   }
  }));
  d.atualizadoEm=new Date(now()).toISOString();salvar(c);
 }
 async function processarFila(){
  if(ativo)return;
  while(fila.length){
   const c=fila.shift();ativo=c;
   try{await varrer(c);}catch(e){c.erro=e.message;console.warn('Municípios: '+e.message);}
   finally{c.fimEm=now();ativo=null;}
  }
 }
 function agendar(c){if(ativo!==c&&!fila.includes(c)){fila.push(c);processarFila();}}
 /* Chamado pelo endpoint: devolve o que já foi coletado e agenda nova varredura quando necessário. */
 function consultar(fonte,cargo,turno){
  const c=conjunto(fonte,cargo,turno);c.pedidoEm=now();
  if(!c.dados){
   // Antes da primeira varredura, entrega o que já estiver salvo em disco.
   const grupo=cargo==='1'?'fed':'est',cod=codigos[fonte]?.[grupo]?.[turno-1]||PADRAO[fonte][grupo][turno-1],salvo=carregar(fonte,cod,cargo);
   if(salvo){c.dados=salvo;c.codigo=cod;}
  }
  if(automatico&&ativo!==c&&!fila.includes(c)&&now()-c.fimEm>60000)agendar(c);
  const d=c.dados||{cands:[],ufs:{},atualizadoEm:null};
  return {fonte,cargo,turno,codigo:c.codigo,atualizadoEm:d.atualizadoEm,cands:d.cands,ufs:d.ufs,
   coleta:{emAndamento:ativo===c||fila.includes(c),feitos:c.feitos,total:c.total,erro:c.erro}};
 }
 /* Mantém atualizados os conjuntos consultados nos últimos 20 minutos. */
 function manter(){if(automatico)for(const c of conjuntos.values())if(now()-c.pedidoEm<1200000&&now()-c.fimEm>60000)agendar(c);}
 return {consultar,manter,validar,varrer:(fonte,cargo,turno)=>varrer(conjunto(fonte,cargo,turno))};
}
module.exports={createCollector,lerArquivo,validar};
