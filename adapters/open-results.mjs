/** Licensed daily-result export, restricted to independently known match identities. */
import {createHash} from 'node:crypto';
import Core from '../public/core.js';import Runtime from '../public/runtime.js';
import {findIdentity} from './fixture-discovery.mjs';
const license='CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)';
const roundMap={'First round':'R128','Second round':'R64','Third round':'R32','Fourth round':'R16','Quarterfinals':'QF','Semifinals':'SF','Final':'F'};
const pair=ids=>[...ids].sort().join('|'),clean=s=>String(s||'').replace(/[–−]/g,'-').replace(/\(\d+\)/g,'').replace(/\s+/g,' ').trim();
export function validateOpenScore(row){
 if(![0,1].includes(row.walkover)||![0,1].includes(row.retired))throw Error('Missing result status');
 if(row.walkover===1){if(row.retired||String(row.score||'').trim())throw Error('Conflicting walkover');return {score:'W/O',tieBreakDetail:'not-applicable'};}
 if(row.retired)throw Error('Retirement requires individual review');
 const tokens=String(row.score||'').trim().split(/\s+/);if(tokens.length<2||tokens.length>3)throw Error('Incomplete best-of-three final');let won=[0,0];
 const sets=tokens.map(t=>{const m=t.match(/^(\d)-(\d)(?:\((\d{1,3})\))?$/);if(!m)throw Error('Invalid score token');const a=+m[1],b=+m[2],hi=Math.max(a,b),lo=Math.min(a,b);
  if(won.includes(2))throw Error('Extra set after result');if(!((hi===6&&lo<=4)||(hi===7&&[5,6].includes(lo))))throw Error('Unfinished set');if(m[3]!==undefined&&!(hi===7&&lo===6))throw Error('Wrong tiebreak annotation');won[a>b?0:1]++;return {a,b,tie:m[3]};});
 if(won[0]!==2)throw Error('Winner-first final contradicts stated winner');
 return {score:tokens.join(' '),tieBreakDetail:sets.some(s=>Math.max(s.a,s.b)===7&&Math.min(s.a,s.b)===6&&s.tie===undefined)?'partial':'complete'};
}
export function inspectOpenResults(envelope,data,config,{observedAt=new Date().toISOString()}={}){
 if(!Core.validInstant(observedAt)||!envelope||envelope.license!==license||!String(envelope.attribution||'').includes('Wikipedia contributors')||!Core.validInstant(envelope.generated)||Date.parse(envelope.generated)>Date.parse(observedAt)+300000||!Array.isArray(envelope.data)||envelope.count!==envelope.data.length||envelope.count<1||envelope.count>15000)throw Error('Invalid licensed export envelope');
 const report={source:config.sourceName,sourcePage:config.sourcePage,licenseUrl:config.licenseUrl,sourceGeneratedAt:envelope.generated,observedAt,rows:envelope.count,matched:[],proposals:[],conflicts:[],unresolved:[],scope:config.scope,allMatchesCovered:false,rankingUpdate:false};
 const seen=new Map(),payloadKeys=new Map();
 for(const row of envelope.data){
  const edition=config.editions.find(e=>e.season===row.season&&e.providerTournamentId===row.tournament_id&&e.tour===row.tour);if(!edition)continue;
  const e=edition,tr=data.tournaments.find(t=>t.id===e.tournamentId&&t.tour.toLowerCase()===e.tour);
  if(!tr||row.tournament!==e.tournament||row.tournament_start!==e.startDate||row.source!==e.source||row.license!==license||!Number.isSafeInteger(row.match_id)||row.match_id<=0||row.surface!=='Hard'){report.conflicts.push({providerMatchId:row.match_id,reason:'event-or-license-mismatch'});continue;}
  const rkey=[row.tour,row.tournament_id,row.round,pair([row.winner,row.loser])].join('|');
  if(seen.has(row.match_id)||payloadKeys.has(rkey))throw Error('Duplicated or conflicting export identities');seen.set(row.match_id,true);payloadKeys.set(rkey,true);
  const w=findIdentity(row.winner,data.players),l=findIdentity(row.loser,data.players);if(!w||!l||w===l){report.unresolved.push({providerMatchId:row.match_id,reason:'player-identity'});continue;}
  const wp=data.players.find(p=>p.id===w),lp=data.players.find(p=>p.id===l);
  if(wp.tour.toLowerCase()!==e.tour||lp.tour.toLowerCase()!==e.tour||wp.country!==row.winner_country||lp.country!==row.loser_country){report.conflicts.push({providerMatchId:row.match_id,reason:'tour-or-country'});continue;}
  const code=roundMap[row.round];if(!code){report.unresolved.push({providerMatchId:row.match_id,reason:'round'});continue;}
  const ms=data.matches.filter(m=>m.tournamentId===e.tournamentId&&m.discipline==='单打'&&m.roundCode===code&&m.sides.every(s=>s.length===1)&&pair(m.sides.flat())===pair([w,l]));
  if(ms.length!==1){report.unresolved.push({providerMatchId:row.match_id,reason:ms.length?'ambiguous-match':'schedule-not-yet-known'});continue;}
  const m=ms[0],date=Core.matchDate(m);if((!date&&m.status!=='finished')||(date&&date>Core.day(observedAt))||(m.status!=='finished'&&m.startAt&&Date.parse(m.startAt)>Date.parse(observedAt)+300000)){report.conflicts.push({matchId:m.id,reason:'future-or-unknown-match-date'});continue;}
  let score;try{score=validateOpenScore(row);}catch(err){report.conflicts.push({matchId:m.id,reason:err.message});continue;}
  const evidence={provider:'baseline-today',providerMatchId:row.match_id,primaryUrl:row.source,compiledBy:config.sourcePage,license:'CC BY-SA 4.0',licenseUrl:config.licenseUrl,attribution:envelope.attribution,checkedAt:observedAt,sourceGeneratedAt:envelope.generated,tieBreakDetail:score.tieBreakDetail,method:'licensed-export'};
  report.matched.push({matchId:m.id,providerMatchId:row.match_id});
  if(m.status==='finished'){
   if(pair(m.winnerIds||[])!==w||clean(m.score)!==clean(score.score))report.conflicts.push({matchId:m.id,reason:'existing-final-conflict'});
   continue;
  }
  if((m._locks||[]).some(k=>['status','score','winnerIds','resultSourceUrl'].includes(k))||m.status==='cancelled'){report.conflicts.push({matchId:m.id,reason:'protected-result'});continue;}
  report.proposals.push({matchId:m.id,tournamentId:m.tournamentId,score:score.score,winnerIds:[w],scoreOrder:'winner-first',evidence});
 }
 if(!report.matched.length)throw Error('No independent known-match cross-check succeeded');
 report.exportFingerprint=createHash('sha256').update(JSON.stringify(envelope.data.map(r=>[r.match_id,r.winner,r.loser,r.score,r.walkover,r.retired]))).digest('hex');
 return report;
}
export function applyOpenResults(input,report){
 const next=structuredClone(input),applied=[];
 for(const p of report.proposals){const m=next.matches.find(m=>m.id===p.matchId);if(!m)throw Error('Match vanished');if(m.status==='finished'){if(clean(m.score)===clean(p.score)&&pair(m.winnerIds||[])===pair(p.winnerIds))continue;throw Error('Concurrent result conflict');}
  if((m._locks||[]).some(k=>['status','score','winnerIds','resultSourceUrl'].includes(k)))throw Error('Concurrent protected result');
  Object.assign(m,{status:'finished',score:p.score,scoreOrder:'winner-first',winnerIds:p.winnerIds,resultSourceUrl:p.evidence.primaryUrl,resultVerifiedAt:report.observedAt,resultsVerifiedAt:report.observedAt,verifiedAt:report.observedAt});m.fieldSources={...m.fieldSources,results:p.evidence};applied.push(m.id);
 }
 const errors=Runtime.validate(next);if(errors.length)throw Error('Result/draw validation: '+errors.join('; '));
 return {data:next,applied};
}
