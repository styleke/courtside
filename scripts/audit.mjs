/** Inspect every published record structurally; separately label external verification scope. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {validateContent} from '../services/refresh.mjs';import Core from '../public/core.js';
const d=JSON.parse(await readFile(new URL('../data/content.json',import.meta.url),'utf8'));
const structuralErrors=validateContent(d),warnings=[],records=[];
for(const col of ['players','tournaments','matches','tickets','activities','articles','legends'])for(const x of d[col]){
 const notes=[];if(!x.sourceUrl)notes.push('source-not-recorded');
 if(col==='players'&&!x.country)notes.push('nationality-unverified');
 if(col==='matches'){
  if(!Core.matchDate(x))notes.push('beijing-day-unconfirmed');
  if(x.score&&!Core.scoreboardView(x,x.sides).known)structuralErrors.push(`${x.id}: score-direction-unresolved`);
  if(x.status==='finished'&&!x.winnerIds?.length)structuralErrors.push(`${x.id}: finished-without-winner`);
  const t=d.tournaments.find(t=>t.id===x.tournamentId),day=Core.matchDate(x);
  if(day&&(day<t.startDate||day>Core.addDays(t.endDate,1)))structuralErrors.push(`${x.id}: match-outside-event-edition`);
 }
 if(notes.length)warnings.push({collection:col,id:x.id,notes});
 records.push({collection:col,id:x.id,structurallyChecked:true,sourceUrl:x.sourceUrl||null,lastVerifiedAt:x.verifiedAt||null,notes});
}
let probe=null;try{probe=JSON.parse(await readFile(new URL('../test-results/source-probe.json',import.meta.url),'utf8'));}catch{}
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
const report={checkedAt:new Date().toISOString(),structuralErrors,warnings,records,manualFactReview:d.meta.audit,liveSourceProbe:probe,note:'Structure validation is not external verification. Items outside manualFactReview.verifiedScopes have NOT all been re-fetched or independently fact checked this run.'};
await writeFile(new URL('../test-results/data-audit.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({checkedRecords:records.length,structuralErrors,warnings:warnings.length},null,2));if(structuralErrors.length)process.exitCode=1;
