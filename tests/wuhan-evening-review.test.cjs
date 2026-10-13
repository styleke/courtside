const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const C=require('../public/core.js'),R=require('../public/runtime.js');
const review=JSON.parse(fs.readFileSync('config/reviews/wuhan-20261013-evening.json'));
const load=()=>import('../scripts/apply-wuhan-evening-review.mjs');
function baseline(){const d=JSON.parse(fs.readFileSync('data/content.json'));d.matches=d.matches.filter(m=>!m.id.startsWith('wh-reviewed-'));d.players=d.players.filter(p=>!review.newPlayers.some(n=>n.id===p.id));d.meta.appliedReviews=d.meta.appliedReviews.filter(id=>id!==review.reviewId);d.meta.scheduleCoverage=d.meta.scheduleCoverage.filter(r=>r.tournamentId!=='wuhan-2026');return d;}
test('official day contains exactly 14 singles and 6 doubles, with independent tomorrow coverage',async()=>{
 const x=(await load()).applyWuhanReview(baseline(),review);A.equal(x.added.length,23);
 const ms=x.data.matches.filter(m=>m.tournamentId==='wuhan-2026'&&C.matchDate(m)==='2026-10-14');A.equal(ms.length,20);A.equal(ms.filter(m=>m.discipline==='单打').length,14);
 A.equal(R.reviewCoverage(x.data,'2026-10-14','WTA',Date.parse(review.checkedAt)).find(r=>r.tournamentId==='wuhan-2026').complete,true);
 A.deepEqual(R.validate(x.data),[]);
});
test('three confirmed results never pretend to be full October 13 coverage',async()=>{
 const d=(await load()).applyWuhanReview(baseline(),review).data;
 A.equal(d.matches.filter(m=>m.tournamentId==='wuhan-2026'&&m.status==='finished').length,3);
 A.equal(R.reviewCoverage(d,'2026-10-13','WTA',Date.parse(review.checkedAt)).find(r=>r.tournamentId==='wuhan-2026').complete,false);
});
test('followed Muchova and Bartunkova matches retain followed-by timing, not invented clock times',async()=>{
 const d=(await load()).applyWuhanReview(baseline(),review).data;
 for(const id of ['karolina-muchova','nikola-bartunkova']){
 const m=d.matches.find(m=>m.tournamentId==='wuhan-2026'&&m.discipline==='单打'&&m.sides.flat().includes(id));
 A.equal(m.courtOrder,2);A.equal(m.startAt,null);A.equal(C.timeLabel(m),'前场结束后');A.equal(C.followed(m,d),true);
 }
});
test('rankings, original profiles and existing matches are not rewritten by this editorial review',async()=>{
 const b=baseline(),before=JSON.stringify(b),d=(await load()).applyWuhanReview(b,review).data;
 A.equal(JSON.stringify(b),before);A.deepEqual(d.rankings,b.rankings);A.deepEqual(d.players.slice(0,b.players.length),b.players);A.deepEqual(d.matches.slice(0,b.matches.length),b.matches);
});
test('running the same editorial review twice is idempotent',async()=>{
 const m=await load(),x=m.applyWuhanReview(baseline(),review),y=m.applyWuhanReview(x.data,review);A.deepEqual(y.data,x.data);A.equal(y.alreadyApplied,true);A.deepEqual(y.added,[]);
});
test('unsupported source, date, count or ambiguous names stop publication',async()=>{
 const m=await load();for(const kind of ['url','hash','date','count','name']){const r=structuredClone(review);
 if(kind==='url')r.scheduleSource.url='https://example.test';if(kind==='hash')r.scheduleSource.sha256='wrong';if(kind==='date')r.scheduledDate='2026-10-15';if(kind==='count')r.schedule.pop();if(kind==='name')r.schedule[0].sides[0]=['Unknown Player'];A.throws(()=>m.applyWuhanReview(baseline(),r));}
});
test('rest-conditioned doubles preserve lower bounds and the unassigned-court match',async()=>{
 const d=(await load()).applyWuhanReview(baseline(),review).data;
 const conditional=d.matches.filter(m=>m.tournamentId==='wuhan-2026'&&m.afterRest);A.equal(conditional.length,4);
 A.equal(C.timeLabel({timeKind:'following',startAt:null,afterRest:true}),'适当休息后');
 A.equal(C.timeLabel({timeKind:'notBefore',startAt:'2026-10-14T15:00:00+08:00',afterRest:true}),'不早于 15:00 · 休息后');
 const unknown=conditional.find(m=>m.timeKind==='dateOnly');A.equal(unknown.court,null);A.equal(unknown.startAt,null);A.equal(C.timeLabel(unknown),'休息后 · 时间待公布');
});
test('new profiles have no guessed age, ranking or nationality absent from the source',async()=>{
 const b=baseline(),d=(await load()).applyWuhanReview(b,review).data;
 for(const p of d.players.slice(b.players.length)){A.equal(p.rank,null);A.equal(p.dateOfBirth,null);}
 for(const id of ['mariia-kozyreva','irina-khromacheva'])A.equal(d.players.find(p=>p.id===id).country,null);
});
