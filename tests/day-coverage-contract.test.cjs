const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../public/runtime.js');
const DAY='2026-10-12';
const REVIEW_TIME=Date.parse('2026-10-11T12:00:00Z');
const readData=()=>JSON.parse(fs.readFileSync('data/content.json','utf8'));

// The fixture is an October 11 review of October 12. Its schema assertion must
// not assume that the machine's current date will always remain October 11.
// Production freshness logic and source timestamps are deliberately unchanged.
test('published next-day coverage has an unambiguous schema after review',()=>{
 const d=readData();
 if(!d.meta.appliedReviews?.includes('2026-10-11-next-day-and-results'))return;
 const before=JSON.stringify(d);
 const s=R.reviewCoverage(d,DAY,'ATP',REVIEW_TIME);
 assert.equal(s.length,1);
 assert.equal(s[0].complete,true);
 assert.equal(s[0].stale,false);
 assert.equal(JSON.stringify(d),before);
});

test('complete coverage still becomes stale after 90 minutes on the match day',()=>{
 const d=readData(),row=d.meta.scheduleCoverage.find(r=>r.date===DAY&&r.tournamentId==='shanghai-2026');
 assert.ok(row,'Reviewed fixture must exist');
 // This changes a private test clone only; no source file or real check date is written.
 row.checkedAt='2026-10-12T00:00:00Z';
 const checked=Date.parse(row.checkedAt),before=JSON.stringify(d);
 for(const [offset,stale] of [[30*60000,false],[90*60000,false],[90*60000+1,true]]){
  const s=R.reviewCoverage(d,DAY,'ATP',checked+offset);
  assert.equal(s.length,1);
  assert.equal(s[0].complete,true);
  assert.equal(s[0].stale,stale);
 }
 assert.equal(JSON.stringify(d),before);
});

test('a future check timestamp is stale rather than a freshness workaround',()=>{
 const d=readData(),row=d.meta.scheduleCoverage.find(r=>r.date===DAY&&r.tournamentId==='shanghai-2026');
 assert.ok(row,'Reviewed fixture must exist');
 row.checkedAt='2026-10-12T00:10:00Z';
 const s=R.reviewCoverage(d,DAY,'ATP',Date.parse('2026-10-12T00:00:00Z'));
 assert.equal(s.length,1);
 assert.equal(s[0].complete,true);
 assert.equal(s[0].stale,true);
});

test('official parser publishes sourceDate and expectedMatches for the runtime contract',async()=>{
 const {parseOfficialDay,applyOfficialDays}=await import('../adapters/official-day.mjs');
 const d=readData();
 // Keep this synthetic parser contract isolated from any real reviewed coverage on the same date.
 d.matches=d.matches.filter(m=>m.tournamentId!=='shanghai-2026'||R.matchDate(m)!=='2026-10-13');
 d.meta.scheduleCoverage=(d.meta.scheduleCoverage||[]).filter(r=>!(r.tournamentId==='shanghai-2026'&&r.date==='2026-10-13'));
 const ps=['carlos-alcaraz','zizou-bergs'].map(id=>d.players.find(p=>p.id===id));
 const person=p=>`<div class="name"><a href="/en/players/${p.id}/${p.externalIds?.atp||(p.id==='carlos-alcaraz'?'a0e2':'bh09')}">${p.enName}</a></div>`;
 const html=`<div class="atp_scheduled"><div class="header"><div class="title">Tuesday, October 13, 2026</div></div><div class="schedule"><div class="location">Stadium Court</div><div class="match-item"><div class="round">R16</div><div class="match-time">Not Before 18:00</div><div class="match-player">${person(ps[0])}</div><div class="match-state">VS</div><div class="match-opponent">${person(ps[1])}</div></div></div></div>`;
 const doc=parseOfficialDay(html,{tournamentId:'shanghai-2026',url:'https://en.rolexshanghaimasters.com/en/scores/schedule',expectedDate:'2026-10-13'});
 const x=applyOfficialDays(d,[doc],{checkedAt:'2026-10-11T09:24:26Z',reviewId:'synthetic-coverage-test'});
 assert.equal(R.reviewCoverage(x.data,'2026-10-13','ATP',REVIEW_TIME)[0].complete,true);
 assert.equal(x.data.meta.scheduleCoverage.find(r=>r.date==='2026-10-13').expectedMatches,1);
 assert.deepEqual(applyOfficialDays(x.data,[doc],{checkedAt:'2026-10-11T09:24:26Z',reviewId:'synthetic-coverage-test'}).data,x.data);
});
