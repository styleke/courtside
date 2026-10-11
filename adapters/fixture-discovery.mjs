/** Staging only: discover candidates, never promote incomplete scores into the public feed. */
import {createHash} from 'node:crypto';
import Core from '../public/core.js';import Age from '../public/ages.js';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const EVENT_MAP={
 'ATP Shanghai, China Men Singles':['shanghai-2026','ATP','单打'],
 'ATP Shanghai, China Men Doubles':['shanghai-2026','ATP','双打'],
 'WTA Beijing, China Women Singles':['beijing-wta-2026','WTA','单打'],
 'WTA Beijing, China Women Doubles':['beijing-wta-2026','WTA','双打']
};
export function utcDatesForDay(day){if(!Age.validDay(day))throw Error('Invalid Beijing date');return [Core.addDays(day,-1),day];}
export function findIdentity(name,players){const key=norm(name);if(!key)return null;const found=players.filter(p=>[p.enName,...(p.aliases||[]).filter(x=>/[A-Za-z].*\s.*[A-Za-z]/.test(x))].some(x=>norm(x)===key));return found.length===1?found[0].id:null;}
export function inspectFixtures(envelopes,data,day,{limit=200}={}){
 const required=utcDatesForDay(day),sourceDates=new Set(),warnings=[],byKey=new Map(),rejected=[];
 for(const d of envelopes){if(d.sport!=='tennis'||!required.includes(d.date)||!Array.isArray(d.matches)||!Number.isInteger(d.count)||d.count<0)throw Error('Bad fixture envelope');sourceDates.add(d.date);if(d.count!==d.matches.length)warnings.push('count-mismatch:'+d.date);if(d.matches.length>=limit||d.count>=limit)warnings.push('possibly-truncated:'+d.date);
  for(const row of d.matches){if(!Core.validInstant(row.time)||!row.home||!row.away||row.home===row.away||!/^(?:\/tennis\/match\/[a-z0-9-]+\/)$/i.test(row.url||'')){rejected.push('invalid-row');continue;}if(Core.day(row.time)!==day)continue;
   const key=[day,row.competition,[norm(row.home),norm(row.away)].sort().join('|')].join('/');const old=byKey.get(key);if(old&&JSON.stringify(old)!==JSON.stringify(row)){warnings.push('conflicting-duplicate:'+key);old._conflicting=true;}else if(!old)byKey.set(key,{...row});
  }
 }
 for(const d of required)if(!sourceDates.has(d))warnings.push('missing-utc-date:'+d);
 const candidates=[];
 for(const [key,row] of byKey){const mapping=EVENT_MAP[row.competition];const tr=mapping&&data.tournaments.find(x=>x.id===mapping[0]&&x.tour===mapping[1]);const flags=[];if(row._conflicting)flags.push('source-conflict');
  const event=tr&&day>=tr.startDate&&day<=tr.endDate?tr:null;
  if(!event)flags.push('event-mapping-needed');if(mapping&&mapping[2]!=='单打')flags.push('team-identities-needed');
  const ids=[findIdentity(row.home,data.players),findIdentity(row.away,data.players)];if(ids.some(x=>!x)||ids[0]===ids[1])flags.push('player-mapping-needed');
  const existing=event&&ids.every(Boolean)&&mapping[2]==='单打'?data.matches.find(m=>m.tournamentId===event.id&&m.discipline==='单打'&&Core.matchDate(m)===day&&m.sides.flat().length===2&&ids.every(id=>m.sides.flat().includes(id))):null;
  if(existing?.startAt&&Date.parse(existing.startAt)!==Date.parse(row.time))flags.push('time-conflict');
  if(existing?.status==='finished'&&row.status!=='finished')flags.push('status-conflict');
  if(row.status==='finished')flags.push('per-set-result-unavailable');
  const id=createHash('sha256').update(key).digest('hex').slice(0,20);
  candidates.push({candidateId:id,beijingDate:day,beijingTime:Core.clock(row.time),reportedStartAt:row.time,reportedStatus:row.status,competition:row.competition,names:[row.home,row.away],playerIds:ids,tournamentId:event?.id||null,discipline:mapping?.[2]||null,existingMatchId:existing?.id||null,sourceUrl:'https://sportscore.com'+row.url,flags,publishable:false});
 }
 const coverage=data.meta.scheduleCoverage?.filter(x=>x.date===day).map(x=>({tournamentId:x.tournamentId,expectedKnownMatches:x.matchIds.length,matchedKnownMatches:x.matchIds.filter(id=>candidates.some(c=>c.existingMatchId===id)).length,unmatchedKnownMatchIds:x.matchIds.filter(id=>!candidates.some(c=>c.existingMatchId===id))}))||[];
 return {beijingDate:day,source:'SportScore',attributionUrl:'https://sportscore.com/',utcDates:required,candidates,warnings:[...new Set(warnings)],rejectedCount:rejected.length,coverage,summary:{beijingDayCandidates:candidates.length,matchedExisting:candidates.filter(c=>c.existingMatchId).length,newMappedSingles:candidates.filter(c=>!c.existingMatchId&&c.tournamentId&&c.playerIds.every(Boolean)&&c.discipline==='单打').length,needsIdentity:candidates.filter(c=>c.flags.includes('player-mapping-needed')).length,needsEvent:candidates.filter(c=>c.flags.includes('event-mapping-needed')).length},canPublish:false};
}
