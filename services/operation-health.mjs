/** Operational evidence is distinct from source freshness and full data coverage. */
export const WATCHED = Object.freeze([
 {id:'knownSinglesResults',file:'sync-known-results.yml',label:'已收录单打赛果',intervalMinutes:30,publishes:true},
 {id:'fixtureDiscovery',file:'stage-fixture-discovery.yml',label:'新赛程候选检查',intervalMinutes:30,publishes:false}
]);
const instant=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function inspectOperation(target,workflow,runs,scheduledRuns,feed,{now=Date.now()}={}){
 if(!WATCHED.some(x=>x.file===target.file))throw Error('Unapproved workflow');
 const eligible=xs=>(xs||[]).filter(r=>r.head_branch==='main'&&instant(r.created_at)!==null&&Date.parse(r.created_at)<=now+300000).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 const all=eligible(runs),scheduled=eligible(scheduledRuns).filter(r=>r.event==='schedule');
 const latest=all[0]||null,successes=scheduled.filter(r=>r.status==='completed'&&r.conclusion==='success'&&now-Date.parse(r.created_at)<=4*3600000);
 const problems=[],age=latest?(now-Date.parse(latest.created_at))/60000:Infinity;
 if(workflow?.state!=='active')problems.push('workflow-not-active');
 if(!latest)problems.push('no-run-record');
 else if(latest.status!=='completed'){
  if(age>15)problems.push('run-stuck');
 }else if(!['success','neutral'].includes(latest.conclusion))problems.push('last-run-unsuccessful');
 if(age>90)problems.push('execution-overdue');
 const job=feed?.jobs?.find(j=>j.channel===target.id)||null;
 if(target.publishes&&latest?.status==='completed'&&latest.conclusion==='success'){
  if(!job||job.status!=='ok')problems.push('published-channel-not-ok');
  const attempt=instant(job?.lastAttemptAt);
  if(attempt===null||attempt<Date.parse(latest.created_at)-300000)problems.push('publication-behind-run');
  if(attempt!==null&&attempt>now+300000)problems.push('future-publication-time');
  const upstream=instant(job?.sourceGeneratedAt);
  if(upstream!==null&&now-upstream>36*3600000)problems.push('upstream-export-old');
 }
 const scheduledReady=successes.length>=2&&problems.length===0;
 const lastManual=all.find(r=>r.event==='workflow_dispatch'),recentManual=lastManual&&now-Date.parse(lastManual.created_at)<6*3600000;
 const recoverable=workflow?.state==='active'&&(!latest||latest.status==='completed')&&age>120&&!recentManual;
 return {channel:target.id,label:target.label,workflow:target.file,state:problems.length?'attention':scheduledReady?'scheduled-verified':'awaiting-scheduled-evidence',problems:[...new Set(problems)],scheduledVerified:scheduledReady,successfulScheduledRunsObserved:successes.length,latestRun:latest?{id:latest.id,event:latest.event,status:latest.status,conclusion:latest.conclusion,startedAt:latest.created_at,url:latest.html_url}:null,sourceCheckedAt:job?.lastCheckAt||null,sourceGeneratedAt:job?.sourceGeneratedAt||null,recoveryEligible:recoverable,fullCoverage:false};
}
export function notificationAction(issues,report,signature){
 const issue=(issues||[]).find(i=>i.user?.login==='github-actions[bot]'&&i.title==='Courtside 数据更新检查'&&i.body?.includes('<!-- courtside-operation-watch:v1 '));
 const bad=report.channels.some(c=>c.problems.length)||report.errors?.length;
 if(!bad)return issue?.state==='open'?{action:'close',number:issue.number}:{action:'none'};
 if(!issue)return {action:'create'};
 if(issue.state==='closed')return {action:'reopen',number:issue.number};
 return issue.body.includes('signature='+signature+' -->')?{action:'none'}:{action:'update',number:issue.number};
}
