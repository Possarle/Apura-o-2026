'use strict';
const fs=require('node:fs');const path=require('node:path');const {point}=require('./server');const H=require('./history-core');
const [turn,dir]=process.argv.slice(2);
if(!['1','2'].includes(turn)||!dir){console.error('Uso: node importar-historico.js 1|2 ./snapshots');process.exit(1);}
const output=process.env.DATA_DIR||path.join(__dirname,'data');fs.mkdirSync(output,{recursive:true});
const file=path.join(output,`history-${turn}.json`);let existing=[];
try{existing=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const imported=[];
for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json'))){
 const j=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
 if(String(j.t)!==turn||String(j.ele)!==(turn==='1'?'6257':'6258')||String(j.cdabr).toLowerCase()!=='br'||j.f!=='o'||!/^\d{2}\/\d{2}\/2026$/.test(j.dg)||!/^\d{2}:\d{2}:\d{2}$/.test(j.hg))throw Error('Snapshot oficial incompatível: '+name);
 if(H.timestamp(j.dg,j.hg)===null)throw Error('Data ou horário inválido: '+name);
 const p=point(j);if(p)imported.push(p);
}
const all=H.merge(existing,imported);
fs.writeFileSync(file+'.tmp',JSON.stringify(all));fs.renameSync(file+'.tmp',file);console.log(`${imported.length} snapshots lidos; ${all.length} registros preservados.`);
