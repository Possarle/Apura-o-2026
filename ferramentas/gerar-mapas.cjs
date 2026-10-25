'use strict';
/*
 Gera mapa-geo.js (municípios do Brasil + mapa-múndi) e atualiza os contornos dos
 estados em index.template.html, para que estados e municípios fiquem alinhados.

 Não faz parte do build: o arquivo gerado já está no repositório. Para refazer:
   1. npm i --no-save mapshaper@0.7 world-atlas@2 d3-geo@3 topojson-client@3 topojson-simplify@3
   2. Baixe as malhas municipais (IBGE, via github.com/luizpedone/municipal-brazilian-geodata,
      licença MIT) para uma pasta, um arquivo por UF: AC.json, AL.json, ... TO.json
   3. node ferramentas/gerar-mapas.cjs <pasta-das-malhas>
*/
const fs=require('node:fs'),path=require('node:path');
const mapshaper=require('mapshaper');
const ExteriorCore=require('../exterior-core');
const base=path.join(__dirname,'..');
const pasta=process.argv[2];
if(!pasta){console.error('Uso: node ferramentas/gerar-mapas.cjs <pasta-das-malhas>');process.exit(1);}
const UFS={ac:'Acre',al:'Alagoas',ap:'Amapá',am:'Amazonas',ba:'Bahia',ce:'Ceará',df:'Distrito Federal',es:'Espírito Santo',go:'Goiás',ma:'Maranhão',mt:'Mato Grosso',ms:'Mato Grosso do Sul',mg:'Minas Gerais',pa:'Pará',pb:'Paraíba',pr:'Paraná',pe:'Pernambuco',pi:'Piauí',rj:'Rio de Janeiro',rn:'Rio Grande do Norte',rs:'Rio Grande do Sul',ro:'Rondônia',rr:'Roraima',sc:'Santa Catarina',se:'Sergipe',sp:'São Paulo',to:'Tocantins'};
// Município instalado em 2025, ainda ausente da malha usada: ponto em posição aproximada.
const SEM_CONTORNO=[{i:'5101837',u:'mt',n:'Boa Esperança do Norte',lat:-13.0,lon:-55.4}];

/* Converte anéis em um "d" SVG compacto (coordenadas relativas; 1 casa, ou 2 para áreas muito pequenas). */
function caminho(rings,proj,f=10){
 let d='';
 for(const ring of rings){
  const pts=[];for(const c of ring){const [x,y]=proj(c);const p=[Math.round(x*f),Math.round(y*f)];const u=pts[pts.length-1];if(!u||u[0]!==p[0]||u[1]!==p[1])pts.push(p);}
  if(pts.length>1&&pts[0][0]===pts.at(-1)[0]&&pts[0][1]===pts.at(-1)[1])pts.pop();
  if(pts.length<3)continue;
  const n=v=>(v/f).toString();const par=(a,b)=>{const s=n(b);return (s.startsWith('-')?'':' ')+s;};
  d+='M'+n(pts[0][0])+par(0,pts[0][1]);let txt='l';
  for(let i=1;i<pts.length;i++){const dx=pts[i][0]-pts[i-1][0],dy=pts[i][1]-pts[i-1][1];const sx=n(dx),sy=n(dy);txt+=(i===1||sx.startsWith('-')?'':' ')+sx+(sy.startsWith('-')?'':' ')+sy;}
  d+=txt+'z';
 }
 return d;
}
const aneis=g=>!g?[]:g.type==='Polygon'?g.coordinates:g.type==='MultiPolygon'?g.coordinates.flat():[];

async function brasil(){
 const features=[];
 for(const uf of Object.keys(UFS)){
  const g=JSON.parse(fs.readFileSync(path.join(pasta,uf.toUpperCase()+'.json'),'utf8'));
  for(const f of g.features)features.push({type:'Feature',properties:{i:String(f.properties.GEOCODIGO),u:uf,n:f.properties.NOME},geometry:f.geometry});
 }
 const out=await mapshaper.applyCommands('-i mun.json -clean -simplify 2.5% keep-shapes -o mun.json format=geojson -dissolve u -o uf.json format=geojson',{'mun.json':{type:'FeatureCollection',features}});
 const mun=JSON.parse(out['mun.json']),est=JSON.parse(out['uf.json']);
 // Mercator, ajustado à área de 613 px de largura usada pelo painel.
 const merc=([lon,lat])=>[lon*Math.PI/180,-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const f of est.features)for(const r of aneis(f.geometry))for(const c of r){const [x,y]=merc(c);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const W=613,m=4,k=(W-2*m)/(x1-x0),H=Math.ceil((y1-y0)*k+2*m);
 const proj=c=>{const [x,y]=merc(c);return [m+(x-x0)*k,m+(y-y0)*k];};
 const estados=Object.entries(UFS).map(([id,nome])=>({id,nome,d:caminho(aneis(est.features.find(f=>f.properties.u===id).geometry),proj)}));
 const municipios=mun.features.map(f=>[f.properties.i,f.properties.u,caminho(aneis(f.geometry),proj)||caminho(aneis(f.geometry),proj,100)]).filter(x=>x[2]);
 const pontos=SEM_CONTORNO.map(p=>{const [x,y]=proj([p.lon,p.lat]);return [p.i,p.u,+x.toFixed(1),+y.toFixed(1),p.n];});
 return {viewBox:`0 0 ${W} ${H}`,estados,municipios,pontos};
}

async function mundo(){
 // O mapa-múndi usa a projeção esférica do d3-geo, que corta corretamente os países no antimeridiano.
 const {geoNaturalEarth1,geoPath}=require('d3-geo');
 const {feature}=require('topojson-client'),{presimplify,simplify,quantile}=require('topojson-simplify');
 let topo=presimplify(require('world-atlas/countries-50m.json'));
 topo=simplify(topo,quantile(topo,0.12));
 const geo=feature(topo,topo.objects.countries);
 geo.features=geo.features.filter(f=>f.id!=='010');
 for(const f of geo.features)f.properties={iso:f.id||''};
 const W=960,m=4,projection=geoNaturalEarth1().fitWidth(W-2*m,{type:'Sphere'});
 let path=geoPath(projection).digits(1);const [[,y0],[,y1]]=path.bounds(geo);
 // Sem a Antártida, o recorte vertical vai só até as terras habitadas.
 projection.translate([projection.translate()[0]+m,projection.translate()[1]+m-y0]);path=geoPath(projection).digits(1);
 const H=Math.ceil(y1-y0+2*m);
 // Remove ilhas que viram um ponto na escala do mapa.
 const limpa=d=>(d||'').split('M').filter(p=>p&&new Set(p.replace(/Z$/,'').split('L')).size>2).map(p=>'M'+p).join('');
 const paises=geo.features.filter(f=>f.properties.iso&&f.geometry).map(f=>[f.properties.iso,limpa(path(f))]).filter(x=>x[1]);
 const outros=geo.features.filter(f=>!f.properties.iso&&f.geometry).map(f=>limpa(path(f))).join('');
 const cidades={};for(const [nome,[,lat,lon]] of Object.entries(ExteriorCore.CIDADES)){const [x,y]=projection([lon,lat]);cidades[nome]=[+x.toFixed(1),+y.toFixed(1)];}
 return {viewBox:`0 0 ${W} ${H}`,paises,outros,cidades};
}

(async()=>{
 const b=await brasil(),w=await mundo();
 const geo={brasil:{viewBox:b.viewBox,municipios:b.municipios,pontos:b.pontos},mundo:w};
 fs.writeFileSync(path.join(base,'mapa-geo.js'),'/* Malhas: municípios (IBGE, via luizpedone/municipal-brazilian-geodata, MIT) e países (Natural Earth, domínio público, via world-atlas). Gerado por ferramentas/gerar-mapas.cjs. */\nwindow.MAPA_GEO='+JSON.stringify(geo)+';\n');
 const tpl=path.join(base,'index.template.html');let html=fs.readFileSync(tpl,'utf8');
 const a=html.indexOf('const MAPA = '),z=html.indexOf('\n',a);if(a<0)throw Error('MAPA não encontrado');
 html=html.slice(0,a)+'const MAPA = '+JSON.stringify({viewBox:b.viewBox,estados:b.estados})+';'+html.slice(z);
 fs.writeFileSync(tpl,html);
 console.log('Municípios:',b.municipios.length,'· pontos:',b.pontos.length,'· países:',w.paises.length,'· mapa-geo.js:',fs.statSync(path.join(base,'mapa-geo.js')).size,'bytes');
})().catch(e=>{console.error(e);process.exit(1);});
