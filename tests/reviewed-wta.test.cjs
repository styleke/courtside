const test=require('node:test'),A=require('node:assert/strict');
const fixture=require('./fixtures/reference-v07.json');
const OFFICIAL='https://www.wtatennis.com/rankings/singles';
const load=()=>import('../services/reviewed-wta.mjs');
// All reports below are synthetic protocol fixtures, not captured provider responses.
function sample(){
 const data=structuredClone(fixture),old=data.rankings.find(t=>t.tour==='WTA');
 const issue=new Date(Date.parse(old.rankingDate)+7*86400000).toISOString().slice(0,10);
 const at=new Date(Date.parse(issue)+86400000+3*3600000).toISOString(),now=Date.parse(at)+10000;
 const rows=old.rows.map((r,i)=>{const p=data.players.find(p=>p.id===r.playerId);return {rank:i+1,points:r.points,change:r.change||0,name:p.enName,country:p.country,officialPlayerId:String(700000+i)};});
 const official={tour:'WTA',rankingDate:issue,observedAt:at,sourceUrl:OFFICIAL,sourceSha256:'a'.repeat(64),rows};
 const api={tour:'WTA',rankingDate:issue,rows:rows.map((o,i)=>({rank:o.rank,points:o.points,change:o.change,rankingDate:issue,providerPlayerId:900000+i,enName:o.name,country:o.country,playerId:old.rows[i].playerId}))};
 const candidate={status:'review-only',publicDataWritten:false,automaticPublication:false,finishedAt:at,errors:[],requests:[{url:'https://api.balldontlie.io/wta/v1/rankings?per_page=100',status:200,sha256:'b'.repeat(64)}],tours:[api]};
 return {data,official,candidate,api,now};
}
async function run(s){return (await load()).importReviewedWta(s.data,s.candidate,s.official,{now:s.now});}
test('whole new WTA issue changes only its ranking and reviewed identity fields',async()=>{
 const s=sample(),before=structuredClone(s.data),r=await run(s);A.deepEqual(s.data,before);
 A.equal(r.report.rowsVerified,100);A.equal(r.data.meta.revision,before.meta.revision+1);
 A.deepEqual(r.data.rankings.find(t=>t.tour==='ATP'),before.rankings.find(t=>t.tour==='ATP'));
 A.deepEqual(r.data.players.filter(p=>p.tour==='ATP'),before.players.filter(p=>p.tour==='ATP'));
 for(const key of Object.keys(before).filter(k=>!['rankings','players','meta'].includes(k)))A.deepEqual(r.data[key],before[key]);
 A.deepEqual(r.data.meta.refreshStatus,before.meta.refreshStatus);A.deepEqual(r.data.meta.sourceChecks?.ATP,before.meta.sourceChecks?.ATP);
 A.equal(r.data.rankings.find(t=>t.tour==='WTA').evidenceReview.rankingDate,s.official.rankingDate);
 A.equal(r.report.automaticPublication,false);
});
test('new entrants have stable official IDs, no guessed age or preference and removed ranks become unknown',async()=>{
 const s=sample(),previous=s.api.rows[99].playerId;
 s.official.rows[99].name='Synthetic New Player';s.api.rows[99].enName='Synthetic New Player';s.api.rows[99].playerId=null;
 const r=await run(s),p=r.data.players.find(p=>p.id==='wta-700099');
 A.equal(r.report.newPlayers.length,1);A.equal(p.name,'Synthetic New Player');A.equal(p.age,null);A.equal(p.dateOfBirth,null);A.equal(p.followed,false);A.equal(p.photoUrl,undefined);
 const out=r.data.players.find(p=>p.id===previous);A.equal(out.rank,null);A.equal(out.points,null);A.equal(out.rankDate,null);A.equal(out.singlesRankingCoverage.state,'not-in-published-top100');
 A.equal(out.previousSinglesRanking.rankingDate,s.data.rankings.find(t=>t.tour==='WTA').rankingDate);
});
test('a country disagreement does not duplicate or relabel a known player',async()=>{
 const s=sample(),o=s.official.rows[10],a=s.api.rows[10],id=a.playerId;a.playerId=null;a.country=o.country==='FRA'?'RUS':'FRA';
 const r=await run(s);A.equal(r.data.players.length,s.data.players.length);A.equal(r.data.players.find(p=>p.id===id).country,o.country);
 A.equal(r.report.countryDisagreements.length,1);A.equal(r.report.newPlayers.length,0);
});
test('followed preferences, biography, doubles and photo evidence survive whole-issue updates',async()=>{
 const s=sample(),id=s.api.rows[0].playerId,p=s.data.players.find(p=>p.id===id);
 p.followed=true;p.favorite=false;p.prospect=true;p.notesForTest='retain';
 const out=(await run(s)).data.players.find(p=>p.id===id);
 for(const k of Object.keys(p).filter(k=>!['rank','points','rankChange','rankDate','rankSourceUrl','rankCheckedAt','pointsSourceUrl','pointsCheckedAt','externalIds'].includes(k)))A.deepEqual(out[k],p[k]);
});
const bad=[
 ['missing official row',s=>s.official.rows.pop()],
 ['missing candidate row',s=>s.api.rows.pop()],
 ['duplicate rank',s=>s.official.rows[1].rank=1],
 ['duplicate official ID',s=>s.official.rows[1].officialPlayerId=s.official.rows[0].officialPlayerId],
 ['duplicate candidate ID',s=>s.api.rows[1].providerPlayerId=s.api.rows[0].providerPlayerId],
 ['different points',s=>s.api.rows[10].points++],
 ['different weekly movement',s=>s.api.rows[10].change++],
 ['different full name',s=>s.api.rows[10].enName='Wrong Full Name'],
 ['mixed API date',s=>s.api.rows[10].rankingDate='2020-01-01'],
 ['old issue',s=>s.official.rankingDate='2020-01-01'],
 ['same issue',s=>s.official.rankingDate=s.data.rankings.find(t=>t.tour==='WTA').rankingDate],
 ['future official time',s=>s.official.observedAt=new Date(s.now+86400000).toISOString()],
 ['old evidence',s=>s.now+=2*86400000],
 ['unapproved primary URL',s=>s.official.sourceUrl='https://example.com/'],
 ['missing content hash',s=>delete s.official.sourceSha256],
 ['failed API request',s=>s.candidate.requests[0].status=403],
 ['wrong API endpoint',s=>s.candidate.requests[0].url='https://api.balldontlie.io/wta/v1/matches'],
 ['candidate error',s=>s.candidate.errors.push({code:'error'})],
 ['candidate linked to a different known player',s=>s.api.rows[10].playerId=s.api.rows[11].playerId],
 ['existing representation conflict',s=>s.official.rows[10].country=s.official.rows[10].country==='FRA'?'RUS':'FRA'],
 ['official player ID changed',s=>s.data.players.find(p=>p.id===s.api.rows[10].playerId).externalIds={wta:'12345678'}],
 ['provider player ID changed',s=>s.data.players.find(p=>p.id===s.api.rows[10].playerId).externalIds={balldontlie:12345678}],
 ['new local ID collision',s=>{s.official.rows[99].name='Synthetic New Player';s.api.rows[99].enName='Synthetic New Player';s.api.rows[99].playerId=null;s.data.players.push({id:'wta-700099',name:'Unrelated Player',enName:'Unrelated Player',tour:'WTA',country:'GBR',followed:false});}],
 ['ambiguous names',s=>{const p=s.data.players.find(p=>p.id===s.api.rows[10].playerId);s.data.players.push({...p,id:'duplicate-test-person',rank:null,points:null});}]
];
for(const [name,mutate] of bad)test('reject '+name+' without mutating input',async()=>{
 const s=sample();mutate(s);const before=structuredClone(s.data);await A.rejects(run(s));A.deepEqual(s.data,before);
});
test('legacy official badges cannot validate a new or tampered table',async()=>{
 const s=sample(),r=await run(s);
 const t=r.data.rankings.find(t=>t.tour==='WTA');A.deepEqual(t.evidenceReview.reviewedRows,t.rows.map(x=>[x.rank,x.playerId,x.points,x.change]));
});
