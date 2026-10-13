/** Free, bounded watchdog. Native schedules and marked external dispatches remain distinct. */
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertFreeBuild} from './free-build-guard.mjs';
import {CLOCK_PREFIX} from '../services/clock-evidence.mjs';
import {WATCHED,ORCHESTRATOR,projectChannelRun,inspectOperation,notificationAction} from '../services/operation-health.mjs';
await assertFreeBuild(process.cwd());
const repo=process.env.GITHUB_REPOSITORY,token=process.env.GH_TOKEN;
if(repo!=='styleke/courtside'||!token)throw Error('Expected scoped repository token');
const report={checkedAt:new Date().toISOString(),fullAutomaticService:false,channels:[],errors:[],recoveries:[],notification:null};
let requests=0;
async function request(url,{method='GET',body,auth=false}={}){
 if(++requests>18)throw Error('Per-run request bound exceeded');
 if(auth&&!url.startsWith('https://api.github.com/repos/'+repo+'/'))throw Error('Credential host/path rejected');
 const headers={'User-Agent':'CourtsideOperationWatch/1.0','Accept':'application/vnd.github+json'};
 if(auth)headers.Authorization='Bearer '+token;
 if(body)headers['Content-Type']='application/json';
 const r=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok){await r.body?.cancel();throw Error('HTTP '+r.status+' for '+new URL(url).pathname);}
 if(r.status===204)return null;
 const text=await r.text();if(Buffer.byteLength(text)>1500000)throw Error('Watch response too large');return JSON.parse(text);
}
const api=(path,options={})=>request('https://api.github.com/repos/'+repo+'/'+path,{...options,auth:true});
let feed=null;try{feed=await request('https://styleke.github.io/courtside/data/status.json?watch='+process.env.GITHUB_RUN_ID);}catch(e){report.errors.push({stage:'published-status',error:e.message});}
try{
 const wf=await api('actions/workflows/'+ORCHESTRATOR);
 const all=await api('actions/workflows/'+ORCHESTRATOR+'/runs?per_page=20');
 const cron=await api('actions/workflows/'+ORCHESTRATOR+'/runs?event=schedule&per_page=5');
 const selected=[...new Map([...(all.workflow_runs||[]).slice(0,2),...(all.workflow_runs||[]).filter(r=>r.display_title?.startsWith(CLOCK_PREFIX)).slice(0,2),...(cron.workflow_runs||[]).slice(0,2)].map(r=>[r.id,r])).values()];
 const evidence=new Map();
 for(const r of selected){
  if(!Number.isSafeInteger(r.id))throw Error('Invalid run identity');
  const rows=await api('actions/runs/'+r.id+'/jobs?per_page=100');
  if(!Array.isArray(rows.jobs)||rows.total_count>100)throw Error('Incomplete job evidence');
  evidence.set(r.id,rows.jobs);
 }
 let recoveryRequested=false;
 for(const target of WATCHED){
  const project=rs=>(rs||[]).filter(r=>evidence.has(r.id)).map(r=>projectChannelRun(r,evidence.get(r.id),target)).filter(Boolean);
  const rows=project(all.workflow_runs),scheduled=project(cron.workflow_runs);
  const row=inspectOperation(target,wf,rows,scheduled,feed,{requirePeriodicEvidence:true});
  row.orchestrator=ORCHESTRATOR;report.channels.push(row);
  // A parent recovery starts both admitted channels once, never one dispatch per child.
  const recentlyDispatched=(all.workflow_runs||[]).some(r=>r.event==='workflow_dispatch'&&Date.now()-Date.parse(r.created_at)<6*3600000);
  if(row.recoveryEligible&&!recentlyDispatched&&!recoveryRequested&&process.env.ALLOW_BOUNDED_RECOVERY==='true'){
   await api('actions/workflows/'+ORCHESTRATOR+'/dispatches',{method:'POST',body:{ref:'main',inputs:{clock_source:'bounded-recovery'}}});
   recoveryRequested=true;report.recoveries.push({workflow:ORCHESTRATOR,requestedAt:new Date().toISOString(),event:'workflow_dispatch',accepted:true,completionVerified:false});
  }
 }
}catch(e){report.errors.push({stage:'orchestrator',error:e.message});}
const key={channels:report.channels.map(c=>({channel:c.channel,problems:c.problems,periodicDeliveryVerified:c.periodicDeliveryVerified})),errors:report.errors};
const signature=createHash('sha256').update(JSON.stringify(key)).digest('hex').slice(0,20);
if(process.env.ALLOW_OPERATION_ISSUE==='true')try{
 const issues=await api('issues?state=all&creator=github-actions%5Bbot%5D&per_page=100');
 const plan=notificationAction(issues,report,signature);
 const lines=['<!-- courtside-operation-watch:v1 signature='+signature+' -->','## 数据更新检查','',...report.channels.map(c=>`- **${c.label}**：${c.state}。${c.problems.join('、')||'最近执行正常'}；近4小时成功的原生定时：${c.successfulScheduledRunsObserved} 次；带来源及时间标记的外部定时：${c.successfulExternalClockRunsObserved} 次。${c.latestRun?.url?' [查看运行]('+c.latestRun.url+')':''}`),...report.errors.map(e=>'- 检查失败：'+e.stage+' '+e.error),'','检查时间：'+report.checkedAt,'','人工启动、无来源标记的旧运行、重新运行和补跑不计作外部定时验收。外部证据为受限触发接口内的时间与执行关联，不是Cloudflare独立签名证明。此检查不保证全部赛事、完整赛程或排名已自动接通。','最多每个任务每6小时尝试一次补跑；重复问题只更新本条记录，不重复新建提醒。'];
 const body=lines.join('\n');
 if(plan.action==='create'){const i=await api('issues',{method:'POST',body:{title:'Courtside 数据更新检查',body}});report.notification={action:'created',url:i.html_url};}
 else if(['update','reopen','close'].includes(plan.action)){const i=await api('issues/'+plan.number,{method:'PATCH',body:{state:plan.action==='close'?'closed':'open',body}});report.notification={action:plan.action,url:i.html_url};}
 else report.notification=plan;
}catch(e){report.errors.push({stage:'notification',error:e.message});}
report.requests=requests;report.finishedAt=new Date().toISOString();
await mkdir('phase2/operation-watch',{recursive:true});await writeFile('phase2/operation-watch/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(report.errors.length||report.channels.some(c=>c.problems.length))process.exitCode=1;
