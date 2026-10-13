const test=require('node:test'),A=require('node:assert/strict');
const load=()=>import('../services/clock-evidence.mjs');
const input={event:'workflow_dispatch',ref:'refs/heads/main',actor:'styleke',source:'cloudflare-cron'};
const raw=(id,slot,patch={})=>({id,event:'workflow_dispatch',head_branch:'main',path:'.github/workflows/refresh.yml',run_attempt:1,actor:{id:264408634},triggering_actor:{id:264408634},display_title:'Courtside clock v1 | cloudflare-cron | '+slot,created_at:new Date(Date.parse(slot)+10000).toISOString(),status:'completed',conclusion:'success',...patch});
const jobs=id=>[{id:11,run_id:id,name:'Validate trigger provenance',status:'completed',conclusion:'success'},{id:12,run_id:id,name:'results / collect',status:'completed',conclusion:'success'},{id:13,run_id:id,name:'results / verify',status:'completed',conclusion:'success'},{id:14,run_id:id,name:'discovery / discover',status:'completed',conclusion:'success'}];

// Production regression: run 38340499036 carried 03:11:07, not 03:11:00.
// These replays use injected dependencies; they are not successful live Cron runs.
const jitterAt='2026-10-13T03:11:07.000Z';
const jitterInput={...input,scheduledAt:jitterAt,now:Date.parse('2026-10-13T03:11:21.000Z')};
async function inspectJitter(runs){
 const m=await import('../services/operation-health.mjs');
 return m.inspectOperation(m.WATCHED[0],{state:'active'},runs.map(r=>m.projectChannelRun(r,jobs(r.id),m.WATCHED[0])),[],
  {jobs:[{channel:'knownSinglesResults',status:'ok',lastAttemptAt:'2026-10-13T03:12:00.000Z',sourceGeneratedAt:'2026-10-13T03:10:00.000Z'}]},
  {now:Date.parse('2026-10-13T03:15:00.000Z'),requirePeriodicEvidence:true});
}
test('real second-bearing controller timestamp validates without erasing its seconds',async()=>{
 const r=(await load()).validateClockTrigger(jitterInput);
 A.equal(r.scheduledAt,jitterAt);A.equal(r.slotAt,'2026-10-13T03:11:00.000Z');A.equal(r.providerAuthenticated,false);
});
for(const text of ['2026-10-13T03:11:00.000Z','2026-10-13T03:11:07.123Z','2026-10-13T03:11:59.999Z','2026-10-13T03:41:59.999Z'])
 test('valid sub-minute timestamp maps to its single cron minute: '+text,async()=>{
  const m=await load(),rawAt=Date.parse(text);A.equal(m.clockSlot(text),Math.floor(rawAt/60000)*60000);
  A.equal(m.validateClockTrigger({...jitterInput,scheduledAt:text,now:rawAt+10000}).scheduledAt,text);
 });
for(const text of ['2026-10-13T03:11:60.000Z','2026-10-13T03:12:07.000Z','2026-10-13T03:10:59.999Z','2026-10-13T03:11:07Z','2026-10-13T03:11:07.000+00:00','2026-02-30T03:11:07.000Z'])
 test('accepting seconds cannot admit a malformed or off-minute timestamp: '+text,async()=>{
  const m=await load();A.equal(m.clockSlot(text),null);A.throws(()=>m.validateClockTrigger({...jitterInput,scheduledAt:text}));
 });
test('future and stale boundaries compare the raw timestamp, not its rounded slot',async()=>{
 const m=await load(),at=Date.parse(jitterAt);
 A.doesNotThrow(()=>m.validateClockTrigger({...jitterInput,now:at-60000}));
 A.throws(()=>m.validateClockTrigger({...jitterInput,now:at-60001}));
 A.doesNotThrow(()=>m.validateClockTrigger({...jitterInput,now:at+45*60000}));
 A.throws(()=>m.validateClockTrigger({...jitterInput,now:at+45*60000+1}));
});
test('invalid current time cannot bypass the admission window',async()=>{
 const m=await load();for(const now of [NaN,Infinity,-Infinity,'2026-10-13'])A.throws(()=>m.validateClockTrigger({...jitterInput,now}));
});
test('worker request and receiving validator agree on the real second-bearing payload',async()=>{
 const {runTick,CRON}=await import('../ops/cloudflare-clock/worker.mjs');let body;
 const r=await runTick({cron:CRON,scheduledTime:Date.parse(jitterAt)},
  {FREE_ONLY_CONFIRMED:'true',TIMER_ENABLED:'true',GITHUB_ACTIONS_TOKEN:'github_pat_'+'T'.repeat(70)},
  {now:()=>jitterInput.now,fetcher:async(url,options)=>{
   if(url.endsWith('/dispatches')){body=JSON.parse(options.body);return new Response(null,{status:204});}
   return new Response(JSON.stringify({total_count:0,workflow_runs:[]}),{headers:{'Content-Type':'application/json'}});
  }});
 A.equal(r.outcome,'accepted');A.equal(r.requests,2);A.equal(body.inputs.clock_scheduled_at,jitterAt);
 const receipt=(await load()).validateClockTrigger({...jitterInput,source:body.inputs.clock_source,scheduledAt:body.inputs.clock_scheduled_at});
 A.equal(receipt.scheduledAt,jitterAt);A.equal(receipt.slotAt,'2026-10-13T03:11:00.000Z');
});
test('successful guard retains both the raw declared timestamp and its canonical slot',async()=>{
 const r=(await load()).externalClockEvidence(raw(1,jitterAt),jobs(1));
 A.equal(r.scheduledAt,jitterAt);A.equal(r.slotAt,'2026-10-13T03:11:00.000Z');A.equal(r.providerAuthenticated,false);
});
test('seconds on the same minute never manufacture a second periodic success',async()=>{
 const r=await inspectJitter([raw(1,jitterAt),raw(2,'2026-10-13T03:11:58.321Z')]);
 A.equal(r.successfulExternalClockRunsObserved,1);A.equal(r.periodicDeliveryVerified,false);
});
test('two different half-hour slots with seconds can satisfy only periodic delivery',async()=>{
 const r=await inspectJitter([raw(1,jitterAt),raw(2,'2026-10-13T02:41:09.456Z')]);
 A.equal(r.successfulExternalClockRunsObserved,2);A.equal(r.periodicDeliveryVerified,true);
 A.equal(r.scheduledVerified,false);A.equal(r.providerAuthenticated,false);A.equal(r.fullCoverage,false);
});
test('the failed production guard is not retrospectively promoted by the parser fix',async()=>{
 const guards=jobs(38340499036);guards[0].conclusion='failure';
 const run=raw(38340499036,jitterAt,{created_at:'2026-10-13T03:11:12Z',conclusion:'failure'});
 A.equal((await load()).externalClockEvidence(run,guards),null);
});
test('raw timestamp, not rounded minute, controls run creation correlation',async()=>{
 const m=await load(),at=Date.parse(jitterAt);
 A.ok(m.externalClockEvidence(raw(1,jitterAt,{created_at:new Date(at+15*60000).toISOString()}),jobs(1)));
 A.equal(m.externalClockEvidence(raw(1,jitterAt,{created_at:new Date(at+15*60000+1).toISOString()}),jobs(1)),null);
 A.equal(m.externalClockEvidence(raw(1,jitterAt,{created_at:new Date(at-60001).toISOString()}),jobs(1)),null);
});
test('seconds compatibility does not accept a rerun, wrong actor or wrong branch',async()=>{
 const m=await load();for(const patch of [{run_attempt:2},{actor:{id:999}},{triggering_actor:{id:999}},{head_branch:'test'}])
  A.equal(m.externalClockEvidence(raw(1,jitterAt,patch),jobs(1)),null);
 for(const patch of [{actor:'other'},{event:'push'},{ref:'refs/heads/test'}])A.throws(()=>m.validateClockTrigger({...jitterInput,...patch}));
});
