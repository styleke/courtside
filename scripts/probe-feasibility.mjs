/** Phase-one diagnostics. Does NOT publish data, enable a source, or start a schedule. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {lookup} from 'node:dns/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export function networkFailure(error){
  const code=error?.cause?.code||error?.code||error?.name||'UNKNOWN';
  return {kind:['EAI_AGAIN','ENOTFOUND'].includes(code)?'dns_failure':code==='TimeoutError'||code==='AbortError'?'timeout':'network_failure',code,message:String(error?.message||error).slice(0,300)};
}
export function assessSource(s,{httpStatus=null,bodyValid=false,parsed=false,cloud=false}={}){
  // A documentation read, a 200 response, and successful collection are independent facts.
  const permitted=['cc0_structured_data','permission_confirmed'].includes(s.usage.status)||(s.usage.status==='free_api_documented'&&s.usage.productionUseConfirmed===true);
  return {documentedFreeAccess:['free_api_documented','cc0_structured_data','permission_confirmed'].includes(s.usage.status),usageReady:permitted,httpReady:httpStatus===200,bodyReady:bodyValid,parserReady:parsed,
    cloudReady:cloud&&httpStatus===200&&bodyValid&&parsed,
    automationEligible:permitted&&httpStatus===200&&bodyValid&&parsed&&cloud};
}
export function summarizeBody(text,type){
  const safe=String(text||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
  const loading=/Loading Order Of Play/i.test(safe);
  const blocked=/captcha|verify you are human|access denied|cf-chl-/i.test(safe);
  const json=/application\/json/i.test(type);
  let bodyValid=!!safe.trim()&&!loading&&!blocked,jsonKeys=[];
  if(json){try{const d=JSON.parse(text);jsonKeys=Object.keys(d||{}).slice(0,15);bodyValid=!!d&&Object.values(d).some(v=>v!=null&&(!Array.isArray(v)||v.length>0));}catch{bodyValid=false;}}
  const verified=safe.match(/Verified on\s+([A-Za-z]+\s+\d{1,2},?\s+20\d{2})/i)?.[1]||null;
  return {bodyValid,loadingShell:loading,challenge:blocked,jsonKeys,verifiedDateText:verified};
}
async function headDiagnostic(s,fetcher=fetch){
 const begin=Date.now();
 try{
  // Non-public-data sources are not fetched repeatedly; HEAD checks never read match data.
  const res=await fetcher(s.url,{method:'HEAD',redirect:'manual',headers:{'User-Agent':'Courtside-source-review/1.0'},signal:AbortSignal.timeout(8000)});
  return {method:'HEAD',httpStatus:res.status,contentType:res.headers.get('content-type'),durationMs:Date.now()-begin,redirect:res.headers.get('location'),bodyRead:false};
 }catch(e){return{method:'HEAD',httpStatus:null,durationMs:Date.now()-begin,bodyRead:false,error:networkFailure(e)};}
}
async function freeDiagnostic(s,fetcher=fetch){
 const begin=Date.now();
 try{
  const res=await fetcher(s.url,{redirect:'manual',headers:{'User-Agent':'Courtside-source-review/1.0','Accept':'application/json,text/html;q=0.8'},signal:AbortSignal.timeout(10000)});
  const result={method:'GET',httpStatus:res.status,contentType:res.headers.get('content-type')||'',durationMs:Date.now()-begin,bodyRead:false};
  if(!res.ok||res.status>=300){await res.body?.cancel();return result;}
  const reader=res.body.getReader(),chunks=[];let bytes=0;
  try{for(;;){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>2000000){await reader.cancel();throw new Error('Response exceeded diagnostic limit');}chunks.push(Buffer.from(r.value));}}finally{reader.releaseLock();}
  const body=Buffer.concat(chunks),text=body.toString('utf8');
  return {...result,bodyRead:true,bytes,sha256:createHash('sha256').update(body).digest('hex'),...summarizeBody(text,result.contentType)};
 }catch(e){return{method:'GET',httpStatus:null,bodyRead:false,durationMs:Date.now()-begin,error:networkFailure(e)};}
}
export async function runProbe(registry,{dnsLookup=lookup,fetcher=fetch}={}){
 const output={kind:'phase1-actual-source-feasibility-probe',startedAt:new Date().toISOString(),
   environment:process.env.GITHUB_ACTIONS==='true'?'github-actions':'conversation-container',
   workflowRunId:process.env.GITHUB_RUN_ID||null,productionDataWritten:false,continuousCollectionEnabled:false,sources:[]};
 const probeOne=async s=>{
  const row={id:s.id,url:s.url,checkedAt:new Date().toISOString(),dns:null,http:null,parserTested:false,decision:s.decision};
  if(s.programProbeMode==='skip'){row.skipped='restrictions_or_scope_not_approved';row.assessment=assessSource(s);return row;}
  try{const d=await dnsLookup(new URL(s.url).hostname);row.dns={reachable:true,family:d.family};}catch(e){row.dns={reachable:false,...networkFailure(e)};}
  if(row.dns.reachable){
   row.http=['free_api_documented','cc0_structured_data'].includes(s.usage.status)?await freeDiagnostic(s,fetcher):await headDiagnostic(s,fetcher);
  }else row.http={httpStatus:null,attempted:false,reason:'dns_failure_before_http'};
  row.assessment=assessSource(s,{httpStatus:row.http?.httpStatus,bodyValid:row.http?.bodyValid===true,parsed:false,cloud:output.environment==='github-actions'});
  return row;
 };
 for(let i=0;i<registry.sources.length;i+=6){output.sources.push(...await Promise.all(registry.sources.slice(i,i+6).map(probeOne)));}
 output.finishedAt=new Date().toISOString();
 output.summary={sources:output.sources.length,dnsSuccess:output.sources.filter(s=>s.dns?.reachable).length,dnsFailures:output.sources.filter(s=>s.dns?.reachable===false).length,httpSuccess:output.sources.filter(s=>s.http?.httpStatus===200).length,skipped:output.sources.filter(s=>s.skipped).length,automationEligible:output.sources.filter(s=>s.assessment.automationEligible).length};
 return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
 const registry=JSON.parse(await readFile(path.join(root,'config/source-feasibility.json'),'utf8'));
 const report=await runProbe(registry);
 await mkdir(path.join(root,'phase1'),{recursive:true});await writeFile(path.join(root,'phase1/source-probe.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
 if(process.env.GITHUB_STEP_SUMMARY){let md='## Phase-one source probe\n\n| Source | DNS | HTTP | Collection verified |\n|---|---|---|---|\n';for(const s of report.sources)md+=`| ${s.id} | ${s.dns?.reachable?'OK':s.skipped?'Skipped':'Failed'} | ${s.http?.httpStatus??'Not reached'} | No |\n`;await writeFile(process.env.GITHUB_STEP_SUMMARY,md);}
 if(!report.summary.httpSuccess)process.exitCode=2;
}
