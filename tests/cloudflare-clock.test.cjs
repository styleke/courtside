const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const load=()=>import('../ops/cloudflare-clock/worker.mjs');
const at=Date.parse('2026-10-11T14:11:05Z');
const event={cron:'11,41 * * * *',scheduledTime:at-5000};
const env={FREE_ONLY_CONFIRMED:'true',TIMER_ENABLED:'true',GITHUB_ACTIONS_TOKEN:'github_pat_'+'T'.repeat(70)};
const run=(extra={})=>({id:12,head_branch:'main',path:'.github/workflows/refresh.yml',status:'completed',conclusion:'success',created_at:new Date(at-40*60000).toISOString(),...extra});
const res=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const deps=rows=>({now:()=>at,fetcher:async(u,o)=>u.endsWith('/dispatches')?new Response(null,{status:204}):res({total_count:rows.length,workflow_runs:rows})});
test('clock is disabled without both explicit opt-ins',async()=>{for(const e of [{}, {...env,TIMER_ENABLED:'false'}, {...env,FREE_ONLY_CONFIRMED:'false'}]){const r=await(await load()).runTick(event,e,{fetcher:()=>assert.fail('network'),now:()=>at});assert.equal(r.outcome,'disabled');assert.equal(r.requests,0);}});
test('clock accepts only a separately scoped fine-grained token',async()=>{for(const token of ['','bdl-key','ghp_'+'T'.repeat(40),env.GITHUB_ACTIONS_TOKEN+'\n']){const r=await(await load()).runTick(event,{...env,GITHUB_ACTIONS_TOKEN:token},{fetcher:()=>assert.fail('network')});assert.equal(r.code,'fine-grained-token-required');}});
test('clock rejects wrong frequency, invalid or replayed timestamps',async()=>{for(const e of [{...event,cron:'* * * * *'},{...event,scheduledTime:at-11*60000},{...event,scheduledTime:at+120000},{...event,scheduledTime:NaN},{...event,scheduledTime:Date.parse('2026-10-11T14:12:00Z')}]){const r=await(await load()).runTick(e,env,{fetcher:()=>assert.fail('network'),now:()=>at});assert.equal(r.code,'invalid-or-late-cron-event');}});
test('empty history dispatches only the fixed main workflow using two requests',async()=>{const calls=[];const d=deps([]),r=await(await load()).runTick(event,env,{...d,fetcher:async(u,o)=>{calls.push({u,o});return d.fetcher(u,o);}});assert.equal(r.outcome,'accepted');assert.equal(r.requests,2);assert.equal(r.publicationVerified,false);assert.equal(r.githubEvent,'workflow_dispatch');assert.equal(r.fullCoverage,false);assert.deepEqual(JSON.parse(calls[1].o.body),{ref:'main',inputs:{clock_source:'cloudflare-cron',clock_scheduled_at:new Date(event.scheduledTime).toISOString()}});for(const {u,o}of calls){assert.ok(u.startsWith('https://api.github.com/repos/styleke/courtside/actions/workflows/refresh.yml/'));assert.equal(o.redirect,'manual');assert.equal(o.headers.Authorization,'Bearer '+env.GITHUB_ACTIONS_TOKEN);assert.ok(o.signal);}});
test('old completed run allows one dispatch',async()=>{const r=await(await load()).runTick(event,env,deps([run()]));assert.equal(r.outcome,'accepted');assert.equal(r.requests,2);});
test('new completed run suppresses duplicate timer execution',async()=>{const r=await(await load()).runTick(event,env,deps([run({created_at:new Date(at-10*60000).toISOString()})]));assert.equal(r.code,'recent-run');assert.equal(r.requests,1);});
test('recent failed execution does not cause an unbounded retry storm',async()=>{const r=await(await load()).runTick(event,env,deps([run({created_at:new Date(at-5*60000).toISOString(),conclusion:'failure'})]));assert.equal(r.code,'recent-run');});
test('active executions are not restarted',async()=>{for(const status of ['queued','in_progress','pending','waiting','requested']){const r=await(await load()).runTick(event,env,deps([run({created_at:new Date(at-3*60000).toISOString(),status})]));assert.equal(r.code,'existing-run-active');assert.equal(r.requests,1);}});
test('stuck execution fails closed instead of cancelling or rerunning it',async()=>{const r=await(await load()).runTick(event,env,deps([run({status:'in_progress'})]));assert.equal(r.outcome,'error');assert.equal(r.code,'existing-run-stuck');});
for(const status of [401,403,404,429,500,503])test('HTTP '+status+' ends without retry or upgrade',async()=>{let n=0;const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async()=>{n++;return new Response('not logged',{status});}});assert.equal(r.code,'github-http-'+status);assert.equal(n,1);});
test('redirect responses cannot forward the token',async()=>{const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async(u,o)=>{assert.equal(o.redirect,'manual');throw Error('redirect to evil.example '+env.GITHUB_ACTIONS_TOKEN);}});assert.equal(r.code,'github-network-error');assert.ok(!JSON.stringify(r).includes(env.GITHUB_ACTIONS_TOKEN));});
test('response bodies cannot leak credentials in reports',async()=>{const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async(u)=>u.endsWith('/dispatches')?new Response(null,{status:204}):res({workflow_runs:[],total_count:0,echo:env.GITHUB_ACTIONS_TOKEN})});assert.ok(!JSON.stringify(r).includes(env.GITHUB_ACTIONS_TOKEN));assert.equal(r.outcome,'accepted');});
test('malformed envelopes never initiate writes',async()=>{for(const data of [{},{workflow_runs:[]},{total_count:0,workflow_runs:[run()]},{total_count:6,workflow_runs:Array.from({length:6},()=>run())}]){let n=0;const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async()=>{n++;return res(data);}});assert.equal(r.outcome,'error');assert.equal(n,1);}});
test('unrelated branch or workflow is not trusted for deduplication',async()=>{for(const x of [{head_branch:'other'},{path:'.github/workflows/pwn.yml'},{id:0},{created_at:'invalid'},{created_at:new Date(at+120000).toISOString()},{status:'invented'}]){const r=await(await load()).runTick(event,env,deps([run(x)]));assert.equal(r.code,'invalid-run-record');assert.equal(r.requests,1);}});
test('responses over the byte cap stop before dispatch',async()=>{const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async()=>res({filler:'x'.repeat(262145)})});assert.equal(r.code,'response-size-limit');assert.equal(r.requests,1);});
test('non-JSON and malformed JSON are rejected',async()=>{for(const response of [new Response('<html>'),new Response('{',{headers:{'Content-Type':'application/json'}})]){const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async()=>response});assert.equal(r.outcome,'error');assert.equal(r.requests,1);}});
test('a dispatch authorization failure does not retry',async()=>{let n=0;const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async()=>++n===1?res({workflow_runs:[],total_count:0}):new Response(null,{status:403})});assert.equal(r.code,'github-http-403');assert.equal(n,2);});
test('public HTTP requests cannot trigger execution or return secrets',async()=>{const worker=(await load()).default;for(const path of ['/','/run','/cron','/?token=test']){const r=await worker.fetch(new Request('https://example.test'+path),env);assert.equal(r.status,404);assert.equal(await r.text(),'Not found');}});
test('confirmed setup has exactly the approved half-hour cron and no secrets or paid bindings',async()=>{const c=JSON.parse(fs.readFileSync('ops/cloudflare-clock/wrangler.json'));assert.deepEqual(c.triggers.crons,[(await load()).CRON]);assert.equal(c.triggers.crons[0],'11,41 * * * *');assert.equal(c.vars.FREE_ONLY_CONFIRMED,'true');assert.equal(c.vars.TIMER_ENABLED,'true');assert.equal(c.vars.GITHUB_ACTIONS_TOKEN,undefined);assert.equal(c.workers_dev,false);assert.equal(c.preview_urls,false);for(const key of ['kv_namespaces','r2_buckets','d1_databases','durable_objects','ai','services'])assert.equal(c[key],undefined);});

// Compatibility-contract regression from cloudflare/workerd's Request parser.
// This is a mock of the documented source behavior, not live Cloudflare proof.
test('Workers-compatible request options allow the entire two-request clock path',async()=>{
 const calls=[];
 const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async(u,o)=>{
  if(!['follow','manual'].includes(o.redirect))throw new TypeError('Invalid redirect value, must be one of "follow" or "manual"');
  calls.push({u,o});return u.endsWith('/dispatches')?new Response(null,{status:204}):res({total_count:0,workflow_runs:[]});
 }});
 assert.equal(r.outcome,'accepted');assert.equal(r.version,2);assert.equal(r.requests,2);assert.equal(r.requestStage,'dispatch');assert.equal(r.httpStatus,204);
 assert.equal(r.publicationVerified,false);for(const c of calls)assert.equal(c.o.redirect,'manual');
});
for(const status of [301,302,303,307,308])for(const atDispatch of [false,true])test('redirect '+status+' is blocked at '+(atDispatch?'dispatch':'list-runs')+' with no token forwarding',async()=>{
 const calls=[];const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async(u,o)=>{
  calls.push({u,o});assert.equal(o.redirect,'manual');
  if(atDispatch&&calls.length===1)return res({total_count:0,workflow_runs:[]});
  return new Response('not logged '+env.GITHUB_ACTIONS_TOKEN,{status,headers:{Location:'https://untrusted.invalid/'+env.GITHUB_ACTIONS_TOKEN}});
 }});
 assert.equal(r.outcome,'error');assert.equal(r.code,'github-redirect-blocked');assert.equal(r.httpStatus,status);assert.equal(r.requests,atDispatch?2:1);assert.equal(calls.length,atDispatch?2:1);
 assert.equal(r.requestStage,atDispatch?'dispatch':'list-runs');assert.equal(r.publicationVerified,false);
 assert.ok(!JSON.stringify(r).includes(env.GITHUB_ACTIONS_TOKEN));assert.ok(!JSON.stringify(r).includes('untrusted'));
});
const categories=[
 [new TypeError('Invalid redirect value, must be one of "follow" or "manual"'),'request-options'],
 [new TypeError('Illegal invocation: incorrect this reference'),'runtime-invocation'],
 [new DOMException('request took too long','TimeoutError'),'timeout-or-abort'],
 [new DOMException('cancelled','AbortError'),'timeout-or-abort'],
 [new Error('getaddrinfo ENOTFOUND private-host'),'name-resolution'],
 [new Error('Network connection lost'),'connection'],
 [new Error('arbitrary failure'),'unclassified']
];
for(const [error,kind] of categories)test('transport diagnostics classify '+kind+' without retaining the raw error',async()=>{
 const e=new Error(error.message+' '+env.GITHUB_ACTIONS_TOKEN);e.name=error.name;
 const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async()=>{throw e;}});
 assert.equal(r.code,'github-network-error');assert.equal(r.errorKind,kind);assert.equal(r.requestStage,'list-runs');assert.equal(r.httpStatus,undefined);assert.equal(r.requests,1);
 assert.ok(!JSON.stringify(r).includes(env.GITHUB_ACTIONS_TOKEN));assert.ok(!JSON.stringify(r).includes(e.message));
});
test('second-request failure never inherits the first request HTTP 200',async()=>{
 let calls=0;const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async()=>{if(++calls===1)return res({total_count:0,workflow_runs:[]});throw new Error('Network connection lost');}});
 assert.equal(r.requests,2);assert.equal(r.requestStage,'dispatch');assert.equal(r.httpStatus,undefined);assert.equal(r.errorKind,'connection');assert.equal(calls,2);
});
test('runtime fetch path never reinstates the unsupported redirect mode',()=>{
 const source=fs.readFileSync('ops/cloudflare-clock/worker.mjs','utf8');assert.doesNotMatch(source,/redirect:\s*['"]error['"]/);assert.match(source,/redirect:\s*['"]manual['"]/);
});
test('malformed thrown values cannot bypass the fixed diagnostic categories',async()=>{
 const hostile=new Proxy({},{get(){throw new Error('hidden '+env.GITHUB_ACTIONS_TOKEN);}});
 const r=await(await load()).runTick(event,env,{now:()=>at,fetcher:async()=>{throw hostile;}});
 assert.equal(r.code,'github-network-error');assert.equal(r.errorKind,'unclassified');assert.ok(!JSON.stringify(r).includes(env.GITHUB_ACTIONS_TOKEN));
});
