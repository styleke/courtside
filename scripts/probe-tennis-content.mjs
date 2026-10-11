/** Read-only feasibility check of documented free API endpoints. Never publishes tennis data. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const normal=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function inspectTennisBody(body,{kind='events',date=null,name=null}={}){
 if(body?.error||body?.errors)return {valid:false,reason:'api_error',records:[]};
 const rows=body?.[kind==='players'?'player':'events']??body?.event;
 if(!Array.isArray(rows))return {valid:false,reason:'no_data_returned',records:[]};
 const records=rows.map(r=>({id:String(r.idPlayer||r.idEvent||''),sport:r.strSport||null,name:r.strPlayer||r.strEvent||null,date:r.dateEvent||null,time:r.strTimestamp||r.strTime||null,home:r.strHomeTeam||null,away:r.strAwayTeam||null,homeId:r.idHomeTeam||null,awayId:r.idAwayTeam||null,status:r.strStatus||null,homeScore:r.intHomeScore??null,awayScore:r.intAwayScore??null,league:r.strLeague||null}));
 const issues=[];
 if(!records.length)issues.push('empty_response_is_not_proof_of_no_matches');
 if(records.some(r=>r.sport!=='Tennis'))issues.push('wrong_or_missing_sport');
 if(kind==='players'&&records.some(r=>normal(r.name)!==normal(name)))issues.push('identity_mismatch');
 if(kind==='events'&&records.some(r=>r.date!==date))issues.push('wrong_or_missing_match_date');
 if(records.some(r=>!r.id))issues.push('missing_stable_id');
 const matchLevel=kind==='events'&&records.length>0&&records.every(r=>r.home&&r.away);
 if(kind==='events'&&!matchLevel)issues.push('individual_matches_not_established');
 return {valid:issues.length===0,reason:issues.length?issues.join(';'):'sample_valid_only',rowCount:records.length,fields:rows[0]?Object.keys(rows[0]):[],records,completeScheduleVerified:false,perSetScoresVerified:false};
}
async function request(endpoint,context){
 const u=new URL(endpoint,'https://www.thesportsdb.com/api/v1/json/123/');
 if(u.origin!=='https://www.thesportsdb.com'||!u.pathname.startsWith('/api/v1/json/123/'))throw Error('Unexpected diagnostic endpoint');
 const row={url:u.href,checkedAt:new Date().toISOString(),context};
 try{const r=await fetch(u,{redirect:'error',headers:{'User-Agent':'Courtside-source-review/2.0 (https://github.com/styleke/courtside)','Accept':'application/json'},signal:AbortSignal.timeout(12000)});row.httpStatus=r.status;
  if(!r.ok){await r.body?.cancel();row.valid=false;row.reason=r.status===429?'rate_limited_stop':'http_error';return row;}
  const reader=r.body.getReader(),chunks=[];let bytes=0;
  try{for(;;){const x=await reader.read();if(x.done)break;bytes+=x.value.length;if(bytes>1000000){await reader.cancel();throw Error('Diagnostic response too large');}chunks.push(Buffer.from(x.value));}}finally{reader.releaseLock();}
  const raw=Buffer.concat(chunks);row.bytes=raw.length;row.sha256=createHash('sha256').update(raw).digest('hex');Object.assign(row,inspectTennisBody(JSON.parse(raw.toString('utf8')),context));
 }catch(e){row.valid=false;row.reason='request_or_parse_failed';row.errorCode=e.cause?.code||e.code||e.name;}
 return row;
}
async function main(){
 const data=JSON.parse(await readFile('data/content.json','utf8'));const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const report={kind:'free-tennis-api-content-readiness',environment:process.env.GITHUB_ACTIONS==='true'?'github-actions':'local',runId:process.env.GITHUB_RUN_ID||null,date,startedAt:new Date().toISOString(),productionDataWritten:false,automaticCollectionEnabled:false,documentation:'https://www.thesportsdb.com/documentation',terms:'https://www.thesportsdb.com/docs_terms_of_use.php',documentedFreeDayRowLimit:3,sources:[]};
 const previous=new Date(date+'T12:00:00Z');previous.setUTCDate(previous.getUTCDate()-1);const prior=previous.toISOString().slice(0,10);
 const requests=[['eventsday.php?'+new URLSearchParams({d:date,s:'Tennis'}),{kind:'events',date}],['eventsday.php?'+new URLSearchParams({d:prior,s:'Tennis'}),{kind:'events',date:prior}],['searchplayers.php?'+new URLSearchParams({p:'Carlos Alcaraz'}),{kind:'players',name:'Carlos Alcaraz'}],['searchplayers.php?'+new URLSearchParams({p:'Karolina Muchova'}),{kind:'players',name:'Karolina Muchova'}]];
 for(const [url,context] of requests){const row=await request(url,context);report.sources.push(row);if(row.httpStatus===429)break;await new Promise(r=>setTimeout(r,2100));}
 report.reference={publishedDataRevision:data.meta.revision,knownMatchesOnDate:data.matches.filter(m=>(m.startAt?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(m.startAt)):m.localDate)===date).length,note:'Published manually reviewed baseline, not a claim of global completeness'};
 report.summary={requests:report.sources.length,http200:report.sources.filter(s=>s.httpStatus===200).length,validSamples:report.sources.filter(s=>s.valid).length,completeLiveSources:0,decision:'not_approved_as_complete_schedule_or_score_source',reason:'Free day endpoint is documented as capped at 3 rows; individual samples cannot establish complete tennis coverage or reliable per-set results.'};report.finishedAt=new Date().toISOString();
 await mkdir('phase2',{recursive:true});await writeFile('phase2/source-content-readiness.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
