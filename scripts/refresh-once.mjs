/** One scheduled run. Writes only validated data. Disabled/failed collectors are never successes. */
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {Refresher,validateContent,intervalFor} from '../services/refresh.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),file=path.join(root,'data/content.json');
await (await import('./free-build-guard.mjs')).assertFreeBuild(root);
const config=JSON.parse(await readFile(path.join(root,'config/sources.json'),'utf8'));
let data=JSON.parse(await readFile(file,'utf8')),previous={jobs:[]};try{previous=JSON.parse(await readFile(path.join(root,'data/automation-status.json'),'utf8'));}catch{}
const observed=()=>Date.now();let writes=0;
const refresher=new Refresher({config,read:async()=>data,commit:async transform=>{
 const next=transform(data);const errors=validateContent(next);if(errors.length)throw new Error(errors.join(';'));
 next.meta.revision=data.meta.revision+1;next.meta.updatedAt=new Date().toISOString();
 await writeFile(file+'.tmp',JSON.stringify(next,null,2)+'\n');await rename(file+'.tmp',file);data=next;writes++;return data;
}});
for(const [channel,job] of Object.entries(refresher.jobs)){
 const old=previous.jobs.find(x=>x.channel===channel);if(old)Object.assign(job,old);
 if(job.status==='running'){job.status='error';job.message='Previous run was interrupted';job.nextAttemptAt=null;}
 const last=job.lastAttemptAt?Date.parse(job.lastAttemptAt):0,interval=intervalFor(channel,data);
 if(refresher.ready(channel)&&interval>0&&Date.now()-last<interval)continue;
 try{await refresher.run(channel,{force:false});}catch(error){job.status='error';job.message=error.message;job.lastAttemptAt=new Date().toISOString();}
}
const health=refresher.health();
const report={generatedAt:new Date().toISOString(),automaticSourceSync:false,schedulerRunning:false,configuredChannels:health.configuredChannels,freshChannels:health.freshChannels,scope:health.scope,jobs:health.jobs.map(j=>({...j,intervalMinutes:Math.round(intervalFor(j.channel,data)/60000)})),writes};
// This process is one-shot, not a daemon. Freshness is described per channel, not a fictitious running timer.
await writeFile(path.join(root,'data/automation-status.json'),JSON.stringify(report,null,2)+'\n');
await mkdir(path.join(root,'test-results'),{recursive:true});await writeFile(path.join(root,'test-results/refresh-last.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({configured:report.configuredChannels,results:report.jobs.map(j=>({channel:j.channel,status:j.status})),writes},null,2));
const required=['scores','rankings'];if(required.some(c=>!report.configuredChannels.includes(c)||report.jobs.find(j=>j.channel===c)?.status!=='ok'))process.exitCode=2;
