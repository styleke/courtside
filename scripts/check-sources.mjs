/** One-time, honest external connectivity diagnostic. Does not save or publish source data. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fetchPublic} from '../adapters/public-html.mjs';
const config=JSON.parse(await readFile(new URL('../config/sources.json',import.meta.url),'utf8'));
const report={at:new Date().toISOString(),kind:'actual-external-http-probe',sources:[],continuousDeployment:false};
for(const channel of ['scores','rankings']){
 const c=config[channel];try{const out=await fetchPublic(c.url,{allowedHosts:c.allowedHosts,timeoutMs:8000});report.sources.push({channel,url:c.url,status:'http-reachable',sha256:out.sha256,parserTested:false});}
 catch(e){report.sources.push({channel,url:c.url,status:'blocked',error:String(e.message),code:e.cause?.code||e.code||null,parserTested:false});}
}
report.liveAcquisitionTestPassed=false;
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});await writeFile(new URL('../test-results/source-probe.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
