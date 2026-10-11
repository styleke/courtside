/** One real, bounded free-source request. Successful checks are not a claim of full coverage. */
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {assertFreeBuild,validateFreeSources} from './free-build-guard.mjs';
import {inspectOpenResults,applyOpenResults} from '../adapters/open-results.mjs';
import C from '../public/core.js';
await assertFreeBuild(process.cwd());
const config=JSON.parse(await readFile('config/open-results.json','utf8'));if(!config.enabled)throw Error('Open-results sync disabled');
const permissionErrors=validateFreeSources({openResults:config});if(permissionErrors.length)throw Error(permissionErrors.join('; '));
if(config.maximumRequestsPerRun!==1||config.maximumBytes>12000000||config.intervalMinutes<30)throw Error('Free request bound violated');
const raw=await readFile('data/content.json'),original=JSON.parse(raw);let health=JSON.parse(await readFile('data/automation-status.json','utf8'));
const channel='knownSinglesResults',at=new Date().toISOString(),previous=(health.jobs||[]).find(j=>j.channel===channel)||{};
const job={...previous,channel,automationEnabled:true,status:'running',intervalMinutes:config.intervalMinutes,lastAttemptAt:at,sourceName:config.sourceName,scope:config.scope,upstreamUpdateCadence:config.upstreamUpdateCadence};
const active=config.editions.filter(e=>{const t=original.tournaments.find(t=>t.id===e.tournamentId);return t&&C.day(at)>=C.addDays(t.startDate,-1)&&C.day(at)<=C.addDays(t.endDate,2);});
const report={startedAt:at,source:config.sourceName,automaticFullCoverage:false,requests:0,applied:[],observed:true};
const execution={event:process.env.GITHUB_EVENT_NAME||'local',runId:process.env.GITHUB_RUN_ID||null,workflow:process.env.GITHUB_WORKFLOW||null,ref:process.env.GITHUB_REF||null};
report.execution=execution;job.execution=execution;
try{
 if(!active.length){job.status='not-configured';job.message='当前没有已配置且仍在同步期的赛事';report.skipped='no-active-edition';}
 else{
  const years=[...new Set(active.map(e=>e.season))];if(years.length!==1)throw Error('Multiple years need a new bounded plan');
  const url=config.urlTemplate.replace('{year}',String(years[0]));if(url!=='https://baseline-today.vercel.app/data/results-'+years[0]+'.json')throw Error('Unapproved export URL');
  const headers={'User-Agent':'CourtsideResultSync/1.0 (https://courtside-tennis.pages.dev/; cached noncommercial result check)','Accept':'application/json'};if(previous.etag&&previous.status==='ok')headers['If-None-Match']=previous.etag;
  const r=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(20000)});report.requests=1;report.httpStatus=r.status;
  if(r.status===304){await r.body?.cancel();if(!previous.lastSuccessAt||previous.status!=='ok')throw Error('304 without previous valid state');job.status='ok';job.lastSuccessAt=new Date().toISOString();job.message='来源未变化';}
  else{
   if(!r.ok){await r.body?.cancel();throw Error('Source HTTP '+r.status);}if(!r.headers.get('content-type')?.includes('json'))throw Error('Source did not return JSON');
   const reader=r.body.getReader(),parts=[];let bytes=0;while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>config.maximumBytes){await reader.cancel();throw Error('Result export size limit');}parts.push(Buffer.from(value));}
   const body=Buffer.concat(parts),exportData=JSON.parse(body.toString('utf8')),observedAt=new Date().toISOString();
   const review=inspectOpenResults(exportData,original,{...config,editions:active},{observedAt}),applied=applyOpenResults(original,review);
   Object.assign(report,{bytes,sha256:createHash('sha256').update(body).digest('hex'),matched:review.matched.length,conflicts:review.conflicts,unresolvedCount:review.unresolved.length,applied:applied.applied,sourceGeneratedAt:review.sourceGeneratedAt,exportFingerprint:review.exportFingerprint});
   if(applied.applied.length){const next=applied.data;next.meta.revision=original.meta.revision+1;next.meta.updatedAt=observedAt;next.meta.updateScope='已收录单打赛果自动补全，不更新赛程或排名';next.meta.openResultsLicense={source:config.sourcePage,original:'Wikipedia contributors',license:'CC BY-SA 4.0',licenseUrl:config.licenseUrl,scope:'fieldSources.results.provider=baseline-today 的赛果字段及其衍生展示'};
    if(!(await readFile('data/content.json')).equals(raw))throw Error('Concurrent sporting-data edit');await writeFile('data/content.json.tmp',JSON.stringify(next,null,2)+'\n');await rename('data/content.json.tmp','data/content.json');
   }
   const unresolvedFinal=review.conflicts.some(c=>c.reason==='existing-final-conflict');
   Object.assign(job,{status:unresolvedFinal?'error':'ok',lastSuccessAt:unresolvedFinal?(previous.lastSuccessAt||null):observedAt,lastCheckAt:observedAt,etag:unresolvedFinal?null:(r.headers.get('etag')||null),matchedKnownMatches:review.matched.length,appliedMatches:applied.applied.length,unresolvedConflicts:review.conflicts.length,message:review.conflicts.length?'已保留冲突数据，未覆盖已确认结果':'已校验已收录单打赛果',datasetFingerprint:review.exportFingerprint,sourceGeneratedAt:review.sourceGeneratedAt});
  }
 }
}catch(error){job.status='error';job.message=String(error.message).slice(0,240);report.error=job.message;process.exitCode=1;}
health={...health,generatedAt:new Date().toISOString(),automaticSourceSync:false,schedulerRunning:false,partialAutomaticSourceSync:job.automationEnabled&&job.status==='ok',configuredChannels:[...new Set([...(health.configuredChannels||[]).filter(c=>c!==channel),...(job.status!=='not-configured'?[channel]:[])])],jobs:[...(health.jobs||[]).filter(j=>j.channel!==channel),job]};
await writeFile('data/automation-status.json.tmp',JSON.stringify(health,null,2)+'\n');await rename('data/automation-status.json.tmp','data/automation-status.json');
report.finishedAt=new Date().toISOString();report.channelStatus=job.status;await mkdir('phase2/result-sync',{recursive:true});await writeFile('phase2/result-sync/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(job.status==='error')process.exitCode=1;
