/** One explicit editorial review; no fetches and no automatic source permissions. */
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import Core from '../public/core.js';
import Runtime from '../public/runtime.js';
const REVIEW='2026-10-13-wuhan-official-evening';
const URL='https://wtafiles.wtatennis.com/pdf/draws/2026/1075/OP.pdf';
const SHA='43d47f566b837817dcd7044029fa9db69f7f680784afb1b1c1f22428f395a6d2';
const nameKey=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function applyWuhanReview(input,review){
 assert.equal(review.reviewId,REVIEW);assert.equal(review.tournamentId,'wuhan-2026');
 assert.equal(review.scheduledDate,'2026-10-14');assert.equal(review.scheduleSource.url,URL);
 assert.equal(review.scheduleSource.sha256,SHA);assert.ok(Core.validInstant(review.checkedAt));
 assert.equal(review.automaticPublication,false);assert.equal(review.schedule.length,20);
 assert.equal(review.schedule.filter(r=>r.discipline==='单打').length,14);
 assert.equal(review.partialResults.fullDayCoverage,false);
 if(input.meta.appliedReviews?.includes(REVIEW))return {data:structuredClone(input),added:[],playersAdded:[],alreadyApplied:true};
 const d=structuredClone(input),report={added:[],playersAdded:[],alreadyApplied:false};
 const t=d.tournaments.find(t=>t.id===review.tournamentId);
 assert.equal(t.tour,'WTA');assert.equal(t.timeZone,'Asia/Shanghai');
 assert.ok(t.startDate<=review.scheduledDate&&t.endDate>=review.scheduledDate);
 const names=new Set(review.schedule.flatMap(r=>r.sides.flat()));
 for(const p of review.newPlayers){
  assert.ok(names.has(p.enName));assert.ok(/^[a-z][a-z0-9-]+$/.test(p.id));
  assert.ok(p.country===null||/^[A-Z]{3}$/.test(p.country));
  const old=d.players.find(x=>x.id===p.id);
  if(old){assert.equal(nameKey(old.enName),nameKey(p.enName));continue;}
  assert.ok(!d.players.some(x=>x.tour==='WTA'&&nameKey(x.enName)===nameKey(p.enName)));
  d.players.push({...p,tour:'WTA',rank:null,points:null,age:null,dateOfBirth:null,followed:false,prospect:false,demo:false,
   aliases:[],sourceUrl:URL,verifiedAt:review.checkedAt,countrySourceUrl:p.country?URL:null,
   countryCheckedAt:p.country?review.checkedAt:null,countryBasis:p.country?'official-tour-representation':null});
  report.playersAdded.push(p.id);
 }
 const resolve=name=>{
  const ps=d.players.filter(p=>p.tour==='WTA'&&[p.enName,...(p.aliases||[])].some(n=>typeof n==='string'&&n.includes(' ')&&nameKey(n)===nameKey(name)));
  assert.equal(ps.length,1,'Exact unique full-name identity required: '+name);return ps[0].id;
 };
 const pair=sides=>sides.map(s=>[...s].sort().join('+')).sort().join('|');
 const insert=(r,date,sourceUrl,score=null)=>{
  assert.ok(Core.validDate(date)&&date>=t.startDate&&date<=t.endDate);
  const sides=r.sides.map(s=>s.map(resolve));assert.equal(sides.length,2);
  const size=r.discipline==='双打'?2:1;assert.ok(sides.every(s=>s.length===size));
  assert.equal(new Set(sides.flat()).size,size*2);
  const existing=d.matches.filter(m=>m.tournamentId===t.id&&m.discipline===r.discipline&&m.roundCode===r.roundCode&&pair(m.sides)===pair(sides));
  assert.equal(existing.length,0,'Existing match requires separate conflict review');
  assert.ok(['R64','R32','R16'].includes(r.roundCode));
  assert.ok(['exact','notBefore','following','dateOnly'].includes(r.timeKind));
  const timed=['exact','notBefore'].includes(r.timeKind);
  assert.equal(!!r.time,timed);if(timed)assert.match(r.time,/^(?:[01]\d|2[0-3]):[0-5]\d$/);
  const id='wh-reviewed-'+createHash('sha256').update([t.id,r.discipline,r.roundCode,pair(sides)].join('|')).digest('hex').slice(0,16);
  const source={primaryUrl:sourceUrl,checkedAt:review.checkedAt,sourceDate:date,method:score?'editorial-official-result-review':'editorial-pdf-render-and-text',...(score?{}:{sourceSha256:SHA})};
  const m={id,tournamentId:t.id,sides,discipline:r.discipline,roundCode:r.roundCode,round:r.roundCode==='R64'?'第一轮':r.discipline==='单打'?'第二轮':r.roundCode==='R32'?'第一轮':'第二轮',
   localDate:date,confirmedBeijingDate:date,timeKind:r.timeKind,startAt:timed?`${date}T${r.time}:00+08:00`:null,
   court:r.court==='待定'?null:r.court,courtOrder:r.court==='待定'?null:r.courtOrder,afterRest:r.afterRest===true,
   status:score?'finished':'scheduled',score,winnerIds:score?sides[0]:[],scoreOrder:'winner-first',demo:false,
   editorPick:false,watchLinks:[],sourceUrl,verifiedAt:review.checkedAt,scheduleConfirmed:!score,
   scheduleSourceUrl:sourceUrl,scheduleVerifiedAt:review.checkedAt,fieldSources:{schedule:source}};
  if(score){m.resultsVerifiedAt=review.checkedAt;m.resultVerifiedAt=review.checkedAt;m.resultSourceUrl=sourceUrl;m.fieldSources.results=source;assert.equal(Core.scoreboardView(m,sides).known,true);}
  d.matches.push(m);report.added.push(id);return id;
 };
 const ids=review.schedule.map(r=>insert(r,review.scheduledDate,URL));
 for(const r of review.partialResults.rows)insert({...r,discipline:'单打',roundCode:'R64',timeKind:'dateOnly',time:null,court:'待定',courtOrder:null},review.partialResults.date,review.partialResults.sourceUrl,r.score);
 assert.equal(ids.length,20);
 assert.ok(!d.meta.scheduleCoverage.some(c=>c.tournamentId===t.id&&c.date===review.scheduledDate),'Existing coverage must not be overwritten');
 d.meta.scheduleCoverage.push({tournamentId:t.id,date:review.scheduledDate,sourceDate:review.scheduledDate,expectedMatches:20,matchIds:ids,
  sourceUrl:URL,checkedAt:review.checkedAt,sourceSha256:SHA,method:'editorial-pdf-render-and-text'});
 d.meta.coverageTrackedTournamentIds=[...new Set([...d.meta.coverageTrackedTournamentIds,t.id])];
 d.meta.sourceChecks[t.id]={...d.meta.sourceChecks[t.id],schedule:review.checkedAt,results:review.checkedAt};
 d.meta.appliedReviews=[...(d.meta.appliedReviews||[]),REVIEW];d.meta.revision++;
 d.meta.updatedAt=review.checkedAt;d.meta.updateScope='武汉10月14日官方20场赛程及10月13日3场官方赛果；未声明武汉13日全天完整';
 assert.deepEqual(d.rankings,input.rankings);assert.deepEqual(d.players.slice(0,input.players.length),input.players);
 assert.deepEqual(d.matches.slice(0,input.matches.length),input.matches);
 assert.deepEqual(d.tournaments,input.tournaments);assert.deepEqual(Runtime.validate(d),[]);
 return {data:d,...report};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const input=JSON.parse(await readFile('data/content.json','utf8'));
 const review=JSON.parse(await readFile('config/reviews/wuhan-20261013-evening.json','utf8'));
 const result=applyWuhanReview(input,review);
 if(!result.alreadyApplied)await writeFile('data/content.json',JSON.stringify(result.data,null,2)+'\n');
 console.log(JSON.stringify({reviewId:REVIEW,added:result.added,playersAdded:result.playersAdded,revision:result.data.meta.revision,alreadyApplied:result.alreadyApplied}));
}
