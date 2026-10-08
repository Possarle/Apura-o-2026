/* Regras eleitorais compartilhadas pela interface, pelo pacote e pelos testes. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ElectionCore=factory();})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const runoffStatus=value=>/2\s*[º°o]?\s*turno|segundo\s+turno/i.test(String(value||''));
 const electedStatus=value=>/^eleit[oa](?:\s|$)/i.test(String(value||'').trim());
 function candidateStatus(candidate){
  return {segundoTurno:runoffStatus(candidate.st),eleito:electedStatus(candidate.st)};
 }
 function contenders(first,second){
  if(second&&!second.erro&&second.cands?.length)return second.cands;
  return (first?.cands||[]).filter(c=>runoffStatus(c.st)||c.segundoTurno);
 }
 function governorStatus(first,second){
  if(second&&!second.erro&&second.cands?.length)return 'runoff';
  if(contenders(first).length>=2)return 'runoff';
  if((first?.cands||[]).some(c=>electedStatus(c.st)))return 'decided';
  return 'pending';
 }
 return {candidateStatus,contenders,governorStatus};
});
