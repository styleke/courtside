const test=require('node:test'),A=require('node:assert/strict'),fs=require('node:fs');
const R=require('../public/runtime.js');
const base=()=>JSON.parse(fs.readFileSync('tests/fixtures/reference-v07.json'));
const now=Date.parse('2026-10-12T08:00:00Z');
function incoming(tour='ATP',date='2026-10-12'){const d=base(),t=structuredClone(d.rankings.find(x=>x.tour===tour));t.rankingDate=date;return {schemaVersion:1,channel:'rankings',observedAt:new Date(now).toISOString(),scope:{fields:['rankings'],tours:[tour]},changes:{rankings:[t]}};}
async function apply(d,f){return (await import('../services/refresh.mjs')).applyFeed(d,'rankings',f,now);}
test('ATP can advance without redating or clearing WTA',async()=>{const d=base(),n=await apply(d,incoming());A.deepEqual(n.rankings.find(t=>t.tour==='WTA'),d.rankings.find(t=>t.tour==='WTA'));A.deepEqual(n.players.filter(p=>p.tour==='WTA'),d.players.filter(p=>p.tour==='WTA'));A.equal(n.rankings[0].rankingDate,'2026-10-12');A.deepEqual(R.validate(n),[]);A.deepEqual(n.meta.sourceChecks?.WTA,d.meta.sourceChecks?.WTA);A.equal(n.meta.refreshStatus.rankingLastCheckedAt,d.meta.refreshStatus.rankingLastCheckedAt);});
test('WTA can advance without changing ATP birthdays, preferences or ranks',async()=>{const d=base(),n=await apply(d,incoming('WTA'));A.deepEqual(n.players.filter(p=>p.tour==='ATP'),d.players.filter(p=>p.tour==='ATP'));A.deepEqual(n.rankings.find(t=>t.tour==='ATP'),d.rankings.find(t=>t.tour==='ATP'));A.deepEqual(R.validate(n),[]);});
test('a 99-row partial tour is rejected atomically',async()=>{const d=base(),old=JSON.stringify(d),f=incoming();f.changes.rankings[0].rows.pop();await A.rejects(()=>apply(d,f),/100/);A.equal(JSON.stringify(d),old);});
test('earlier source week cannot overwrite newer published rankings',async()=>{for(const date of ['2026-09-21','2026-08-31'])await A.rejects(()=>apply(base(),incoming('ATP',date)),/旧一期/);});
test('future issue dates cannot be substituted for a real release',async()=>{await A.rejects(()=>apply(base(),incoming('ATP','2026-10-19')),/未来/);});
test('snapshot without issue date is not a current weekly ranking',async()=>{await A.rejects(()=>apply(base(),incoming('ATP',null)),/日期/);});
test('unknown identity fails instead of dropping a player',async()=>{const f=incoming();f.changes.rankings[0].rows[40].playerId='not-known';await A.rejects(()=>apply(base(),f));});
test('duplicate tours fail',async()=>{const f=incoming();f.changes.rankings.push(structuredClone(f.changes.rankings[0]));await A.rejects(()=>apply(base(),f),/重复/);});
test('scope labels cannot refresh an unmodified tour',async()=>{const d=base(),f=incoming();f.scope.tours=['ATP','WTA'];const n=await apply(d,f);A.deepEqual(n.meta.sourceChecks?.WTA,d.meta.sourceChecks?.WTA);});
test('player patches to the other tour are rejected',async()=>{const d=base(),f=incoming();f.changes.players=[{id:d.rankings.find(t=>t.tour==='WTA').rows[0].playerId,rank:50}];await A.rejects(()=>apply(d,f),/未更新巡回赛/);});
test('new ranking issue cannot borrow a mismatched player date',async()=>{const n=await apply(base(),incoming());n.players.find(p=>p.id===n.rankings[0].rows[0].playerId).rankDate='2026-10-05';A.ok(R.validate(n).some(e=>e.includes('日期不一致')));});
