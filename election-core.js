/* Regras eleitorais compartilhadas pela interface, pelo pacote e pelos testes. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ElectionCore=factory();})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const runoffStatus=value=>/2\s*[º°o]?\s*turno|segundo\s+turno/i.test(String(value||''));
 const electedStatus=value=>/^eleit[oa](?:\s|$)/i.test(String(value||'').trim());
 function candidateStatus(candidate){
  return {segundoTurno:runoffStatus(candidate.st),eleito:electedStatus(candidate.st)};
 }
 /* Decisões da Justiça Eleitoral posteriores aos arquivos salvos no pacote (retotalizações).
    Só valem enquanto o arquivo do 1º turno em uso for anterior à decisão; dados novos do TSE prevalecem. */
 const DECISOES={
  '3|rj':{em:Date.parse('2026-10-15T17:27:00-03:00'),status:'decided',eleito:'DOUGLAS RUAS',
   nota:'Em 15/10/2026, o TRE-RJ retotalizou os votos depois que o TSE manteve o indeferimento da candidatura de Anthony Garotinho. Douglas Ruas foi proclamado eleito governador com 50,88% dos votos válidos; não há segundo turno no Rio de Janeiro.',
   fonte:'https://agenciabrasil.ebc.com.br/justica/noticia/2026-10/tre-rj-proclama-douglas-ruas-eleito-para-o-governo-do-rio-de-janeiro'}
 };
 function dataArquivo(d){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d?.dg||''));if(!m)return null;
  const h=/^\d{2}:\d{2}:\d{2}$/.test(String(d.hg||''))?d.hg:'00:00:00';
  return Date.parse(`${m[3]}-${m[2]}-${m[1]}T${h}-03:00`);
 }
 function decisaoPosterior(cargo,uf,first){
  const x=DECISOES[cargo+'|'+String(uf||'').toLowerCase()];if(!x)return null;
  const t=dataArquivo(first);return t===null||t<x.em?x:null;
 }
 function contenders(first,second,uf){
  if(second&&!second.erro&&second.cands?.length)return second.cands;
  if(uf&&decisaoPosterior('3',uf,first))return [];
  return (first?.cands||[]).filter(c=>runoffStatus(c.st)||c.segundoTurno);
 }
 function governorStatus(first,second,uf){
  if(second&&!second.erro&&second.cands?.length)return 'runoff';
  if(uf&&decisaoPosterior('3',uf,first))return 'decided';
  if(contenders(first).length>=2)return 'runoff';
  if((first?.cands||[]).some(c=>electedStatus(c.st)))return 'decided';
  return 'pending';
 }
 return {candidateStatus,contenders,governorStatus,decisaoPosterior,DECISOES};
});
