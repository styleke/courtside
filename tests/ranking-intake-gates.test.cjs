const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const load=()=>import('../adapters/free-ranking-review.mjs');
const summaries=()=>import('../services/ranking-intake-summary.mjs');
const date='2026-10-12',official='https://www.wtatennis.com/rankings/singles';
function fixture(){
 const players=Array.from({length:100},(_,i)=>({id:'w'+i,tour:'WTA',enName:'Given'+i+' Family'+i,country:i===0?'FRA':'USA',externalIds:{balldontlie:i+1,wta:String(1000+i)}}));
 Object.assign(players[0],{countryBasis:'official-tour-representation',countrySourceUrl:official});
 const data=players.map((p,i)=>({rank:i+1,points:10000-i,movement:0,ranking_date:date,player:{id:i+1,full_name:p.enName,country_code:i===0?'RUS':'USA'}}));
 const rows=data.map((r,i)=>({playerId:players[i].id,rank:r.rank,points:r.points,change:r.movement}));
 const review={state:'official-reviewed',sourceUrl:official,rankingDate:date,rowCount:100,reviewedRows:rows.map(r=>[r.rank,r.playerId,r.points,r.change]),countryDisagreements:[{playerId:'w0',providerPlayerId:1,providerCountry:'RUS',officialCountry:'FRA'}]};
 return {data,current:{players,rankings:[{tour:'WTA',rankingDate:date,rows,evidenceReview:review}]}};
}
const inspect=async f=>(await load()).inspectRankingPages([{data:f.data}],'WTA',f.current,{today:'2026-10-13'});
test('reviewed provider ID resolves only a proven same-issue country-label difference',async()=>{
 const f=fixture(),before=JSON.stringify(f.current),r=await inspect(f);
 A.equal(r.rows[0].playerId,'w0');A.equal(r.rows[0].country,'RUS');A.equal(r.rows[0].officialCountry,'FRA');
 A.equal(r.rows[0].identityStatus,'reviewed-id-country-disagreement');A.equal(r.eligibleForEditorialReview,true);
 A.equal(r.independentlyVerified,false);A.equal(r.automaticPublication,false);A.equal(JSON.stringify(f.current),before);
});
for(const kind of ['id','name','country','official-country','review-state','review-date','review-url','review-row-count','review-points','review-movement','country-basis','country-url','ambiguous-id','duplicate-approval','missing-approval'])
 test('reviewed identity exception fails closed: '+kind,async()=>{
  const f=fixture(),p=f.current.players[0],e=f.current.rankings[0].evidenceReview;
  if(kind==='id')p.externalIds.balldontlie=2000;
  if(kind==='name')f.data[0].player.full_name='Unrelated Player';
  if(kind==='country')f.data[0].player.country_code='ESP';
  if(kind==='official-country')p.country='ARM';
  if(kind==='review-state')e.state='pending';
  if(kind==='review-date')e.rankingDate='2026-10-05';
  if(kind==='review-url')e.sourceUrl='https://example.test';
  if(kind==='review-row-count')e.rowCount=99;
  if(kind==='review-points')e.reviewedRows[0][2]++;
  if(kind==='review-movement')e.reviewedRows[0][3]++;
  if(kind==='country-basis')p.countryBasis='citizenship';
  if(kind==='country-url')p.countrySourceUrl='https://example.test';
  if(kind==='ambiguous-id')f.current.players.push({...p,id:'ambiguous'});
  if(kind==='duplicate-approval')e.countryDisagreements.push({...e.countryDisagreements[0]});
  if(kind==='missing-approval')e.countryDisagreements=[];
  const r=await inspect(f);A.equal(r.rows[0].playerId,null);A.ok(r.problems.includes('unresolved-identities'));A.equal(r.eligibleForEditorialReview,false);
 });
test('a reviewed country exception never carries over to the next weekly issue',async()=>{
 const f=fixture();f.data.forEach(r=>r.ranking_date='2026-10-19');
 const r=(await load()).inspectRankingPages([{data:f.data}],'WTA',f.current,{today:'2026-10-20'});
 A.equal(r.rows[0].playerId,null);A.equal(r.eligibleForEditorialReview,false);
});
test('a provider ID already attached to a different player cannot be remapped by name and country',async()=>{
 const f=fixture();f.current.players.push({id:'wrong',tour:'WTA',enName:f.data[0].player.full_name,country:'RUS'});
 const r=await inspect(f);A.equal(r.rows[0].playerId,null);A.ok(r.problems.includes('unresolved-identities'));
});
test('same-issue match summary checks all reviewed rank, point and movement tuples',async()=>{
 const f=fixture(),r=await inspect(f),m=await summaries();
 const report={tours:[r],status:'review-only',requests:[{}],finishedAt:'2026-10-13T07:00:00Z'};
 const s=m.rankingIntakeSummary(report,f.current),t=s.tours[0];
 A.equal(t.providerMatchesReviewedIssue,true);A.equal(t.identifiedRows,100);A.equal(t.countryLabelsPreserved.length,1);
 A.equal(t.decision,'matches-reviewed-issue');A.equal(s.automaticPublication,false);A.equal(s.fullCoverage,false);
 A.match(m.rankingIntakeMarkdown(s),/不发布排名/);
 r.rows[1].change=10;
 const changed=m.rankingIntakeSummary(report,f.current).tours[0];A.equal(changed.providerMatchesReviewedIssue,false);A.equal(changed.differences.length,1);
});
test('missing network configuration is visible and cannot yield a successful intake',async()=>{
 const s=(await summaries()).rankingIntakeSummary({status:'not-configured',requests:[],tours:[]},fixture().current);
 A.equal(s.executionStatus,'not-configured');A.equal(s.tours.length,0);A.equal(s.publicDataWritten,false);
});
test('ranking review uses the validated existing clock only twice daily with read-only permissions',()=>{
 const refresh=fs.readFileSync('.github/workflows/refresh.yml','utf8');
 const ranking=refresh.split('  rankings:\n')[1];A.ok(ranking);A.match(ranking,/needs: provenance/);
 A.match(ranking,/github.run_attempt == 1/);A.match(ranking,/T00:11:/);A.match(ranking,/T12:11:/);
 A.match(ranking,/COURTSIDE_FREE_RANKING_REVIEW_DISABLED/);A.match(ranking,/contents: read/);A.doesNotMatch(ranking,/contents: write|pages: write|id-token: write/);
 const workflow=fs.readFileSync('.github/workflows/free-rankings-review.yml','utf8');
 A.match(workflow,/workflow_call:/);A.match(workflow,/free_plan_confirmed:/);A.doesNotMatch(workflow,/^  schedule:/m);
 A.match(workflow,/retention-days: 1/);A.doesNotMatch(workflow,/deploy-pages|git push/);
 const policy=JSON.parse(fs.readFileSync('config/sources.json'));A.equal(policy.rankings.automationPermitted,false);
});
