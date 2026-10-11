/** Free, bounded watchdog. Never modifies match data or claims dispatched runs are scheduled. */
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {assertFreeBuild} from './free-build-guard.mjs';
import {WATCHED,inspectOperation,notificationAction} from '../services/operation-health.mjs';
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
for(const target of WATCHED){try{
 const wf=await api('actions/workflows/'+target.file);
 const all=await api('actions/workflows/'+target.file+'/runs?per_page=20');
 const cron=await api('actions/workflows/'+target.file+'/runs?event=schedule&per_page=5');
 const row=inspectOperation(target,wf,all.workflow_runs,cron.workflow_runs,feed);
 report.channels.push(row);
 if(row.recoveryEligible&&process.env.ALLOW_BOUNDED_RECOVERY==='true'){
  await api('actions/workflows/'+target.file+'/dispatches',{method:'POST',body:{ref:'main'}});
  report.recoveries.push({channel:target.id,requestedAt:new Date().toISOString(),event:'workflow_dispatch',accepted:true,completionVerified:false});
 }
}catch(e){report.errors.push({stage:target.id,error:e.message});}}
const key={channels:report.channels.map(c=>({channel:c.channel,problems:c.problems,scheduledVerified:c.scheduledVerified})),errors:report.errors};
const signature=createHash('sha256').update(JSON.stringify(key)).digest('hex').slice(0,20);
if(process.env.ALLOW_OPERATION_ISSUE==='true')try{
 const issues=await api('issues?state=all&creator=github-actions%5Bbot%5D&per_page=100');
 const plan=notificationAction(issues,report,signature);
 const lines=['<!-- courtside-operation-watch:v1 signature='+signature+' -->','## 数据更新检查','',...report.channels.map(c=>`- **${c.label}**：${c.state}。${c.problems.join('、')||'最近执行正常'}；近4小时实际成功的定时运行：${c.successfulScheduledRunsObserved} 次。${c.latestRun?.url?' [查看运行]('+c.latestRun.url+')':''}`),...report.errors.map(e=>'- 检查失败：'+e.stage+' '+e.error),'','检查时间：'+report.checkedAt,'','补跑属于手动触发机制，不计作定时验收。此检查不保证全部赛事、完整赛程或排名已自动接通。','最多每个任务每6小时尝试一次补跑；重复问题只更新本条记录，不重复新建提醒。'];
 const body=lines.join('\n');
 if(plan.action==='create'){const i=await api('issues',{method:'POST',body:{title:'Courtside 数据更新检查',body}});report.notification={action:'created',url:i.html_url};}
 else if(['update','reopen','close'].includes(plan.action)){const i=await api('issues/'+plan.number,{method:'PATCH',body:{state:plan.action==='close'?'closed':'open',body}});report.notification={action:plan.action,url:i.html_url};}
 else report.notification=plan;
}catch(e){report.errors.push({stage:'notification',error:e.message});}
report.requests=requests;report.finishedAt=new Date().toISOString();
await mkdir('phase2/operation-watch',{recursive:true});await writeFile('phase2/operation-watch/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(report.errors.length||report.channels.some(c=>c.problems.length))process.exitCode=1;
