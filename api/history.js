'use strict';
/* Na Vercel não há disco permanente: o histórico do 1º turno vem do pacote e o do 2º turno
   é montado no navegador de cada visitante enquanto a página fica aberta. */
const {json,consulta,lerLocal}=require('./_comum');
const HistoryCore=require('../history-core');
module.exports=(req,res)=>{
 const t=consulta(req).get('turno')||'1';if(!['1','2'].includes(t))return json(res,400,{error:'Turno inválido'});
 let pontos=[];try{pontos=JSON.parse(lerLocal(`data/history-${t}.json`)||'[]');}catch{}
 json(res,200,{points:HistoryCore.merge(pontos)},'public, max-age=0, s-maxage=300');
};
