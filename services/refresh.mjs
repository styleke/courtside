/** Scheduled ingestion. Never changes a source timestamp on a failed fetch.
 * Feed URLs must be configured by the operator with permission to automate.
 * The included project does not contain credentials, a paid API or a private API.
 */
import Core from '../public/core.js';
import V6 from '../public/domain-v06.js';
import Runtime from '../public/runtime.js';
import {collectPublic} from '../adapters/public-html.mjs';
const COPY=x=>JSON.parse(JSON.stringify(x));
export const CHANNELS={scores:{collections:['players','matches','draws'],minutes:30},rankings:{collections:['players','rankings'],minutes:1440},broadcasts:{collections:['tournaments','matches'],minutes:1440},tickets:{collections:['tickets','tournaments'],minutes:1440},profiles:{collections:['players'],minutes:0}};
export function validateContent(data){return Runtime.validate(data);}
export function intervalFor(channel,data,now=Date.now()){
 if(channel==='tickets'&&data.tickets.some(t=>t.opensAt&&Date.parse(t.opensAt)>=now&&Date.parse(t.opensAt)-now<=86400000))return 30*60000;
 if(channel==='broadcasts'&&data.matches.some(m=>Core.matchDate(m)===Core.day(new Date(now).toISOString())&&m.status==='scheduled'))return 30*60000;
 return(CHANNELS[channel]?.minutes||0)*60000;
}
function mergeRecord(old,item,channel){const next={...old,...item};
 for(const field of old?._locks||[])if(Object.hasOwn(old,field))next[field]=old[field];
 for(const field of ['followed','favorite','followTier','prospect','preferenceUpdatedAt'])if(old&&Object.hasOwn(old,field))next[field]=old[field];
 if(channel!=='rankings'&&old)for(const k of ['rank','points','rankChange','rankDate','rankSourceUrl','rankCheckedAt','pointsSourceUrl','pointsCheckedAt'])if(Object.hasOwn(old,k))next[k]=old[k];
 next.favorite=false;return next;
}
export function applyFeed(current,channel,feed,now=Date.now()){
 if(!CHANNELS[channel])throw new Error('未知更新通道');if(!feed||feed.schemaVersion!==1||feed.channel!==channel||!Core.validInstant(feed.observedAt)||!feed.changes)throw new Error('数据源格式或时间无效');
 if(Date.parse(feed.observedAt)>now+300000)throw new Error('拒绝未来时间的数据');
 const previous=current.meta.feedChecks?.[channel]?.observedAt;if(previous&&Date.parse(feed.observedAt)<Date.parse(previous))throw new Error('拒绝较旧的来源版本');
 const next=COPY(current),collections=CHANNELS[channel].collections;let changed=0;
 for(const key of Object.keys(feed.changes))if(!collections.includes(key))throw new Error(`该通道不能修改 ${key}`);
 for(const key of collections){const incoming=feed.changes[key];if(incoming==null)continue;if(!Array.isArray(incoming))throw new Error(`${key}需要数组`);
  if(key==='rankings'){
   if(incoming.length!==2||new Set(incoming.map(t=>t.tour)).size!==2)throw new Error('排名发布必须同时包含ATP/WTA完整前100');
   for(const table of incoming){const errs=V6.rankingErrors(table,next.players);if(errs.length)throw new Error(errs.join(';'));const old=next.rankings?.find(t=>t.tour===table.tour);if(old&&table.rankingDate<old.rankingDate)throw new Error('拒绝旧一期排名');}
   next.rankings=COPY(incoming);for(const q of next.players){if(q.careerStatus!=='retired'){q.rank=null;q.points=null;q.rankChange=null;}}for(const table of incoming)for(const row of table.rows){const q=next.players.find(p=>p.id===row.playerId);Object.assign(q,{rank:row.rank,points:row.points,rankChange:row.change??null,rankDate:table.rankingDate,rankCheckedAt:feed.observedAt,rankSourceUrl:table.sourceUrl,pointsSourceUrl:table.sourceUrl,pointsCheckedAt:feed.observedAt});}changed+=200;continue;
  }
  if(!next[key])next[key]=[];
  for(const item of incoming){if(!item.id)throw new Error('条目缺少ID');if(channel==='rankings'&&key==='players'&&next.players.some(p=>p.id===item.id)&&Object.keys(item).some(k=>!['id','name','enName','country','tour','rank','points','rankChange','rankDate','rankSourceUrl','rankCheckedAt','pointsSourceUrl','pointsCheckedAt'].includes(k)))throw new Error('排名来源越权修改球员资料');const i=next[key].findIndex(x=>x.id===item.id);if(i<0){next[key].push(COPY(item));changed++;}else{const candidate=key==='players'?mergeRecord(next[key][i],item,channel):{...next[key][i],...item};for(const f of next[key][i]._locks||[])candidate[f]=next[key][i][f];if(JSON.stringify(candidate)!==JSON.stringify(next[key][i]))changed++;next[key][i]=candidate;}}
 }
 if(channel==='rankings'&&!feed.changes.rankings)throw new Error('排名通道未返回榜单');
 const errors=validateContent(next);if(errors.length)throw new Error(errors.join(';'));
 next.meta.feedChecks={...next.meta.feedChecks,[channel]:{observedAt:feed.observedAt,checkedAt:new Date(now).toISOString(),changed,scope:feed.scope||null,sourceEvidence:feed.sourceEvidence||[]}};
 next.meta.contentPatchedAt=new Date(now).toISOString();next.meta.refreshStatus={...next.meta.refreshStatus,lastExternalCheckAt:new Date(now).toISOString()};
 const mapping={schedule:'scheduleLastCheckedAt',results:'resultsLastCheckedAt',draws:'drawsLastCheckedAt',rankings:'rankingLastCheckedAt',broadcasts:'broadcastLastCheckedAt',tickets:'ticketsLastCheckedAt',profiles:'profilesLastCheckedAt'};
 const fields=feed.scope?.fields||(channel==='scores'?[]:[channel]);
 next.meta.sourceChecks={...next.meta.sourceChecks};
 const scopes=feed.scope?.tournaments||feed.scope?.tours||[channel];
 for(const scope of scopes){const old=next.meta.sourceChecks[scope]||{};next.meta.sourceChecks[scope]={...old};for(const field of fields)if(mapping[field])next.meta.sourceChecks[scope][field]=feed.observedAt;}
 // Legacy global fields remain scoped to exactly the fields supplied by this feed.
 for(const field of fields)if(channel!=='scores'&&mapping[field])next.meta.refreshStatus[mapping[field]]=feed.observedAt;

 return next;
}
export class Refresher{
 constructor({config,read,commit,fetcher=fetch,now=()=>Date.now()}){this.config=config;this.read=read;this.commit=commit;this.fetcher=fetcher;this.now=now;this.timer=null;this.running=false;this.jobs=Object.fromEntries(Object.keys(CHANNELS).map(k=>[k,{status:'not-configured',lastAttemptAt:null,lastSuccessAt:null,nextAttemptAt:null,message:'数据源未连接'}]));}
 ready(k){const c=this.config[k];if(!c?.url||c.automationPermitted!==true)return false;try{const u=new URL(c.url);return u.protocol==='https:'&&!u.username&&!u.password&&(c.allowedHosts||[]).includes(u.hostname)&&!['localhost','127.0.0.1','::1'].includes(u.hostname);}catch{return false;}}
 health(){const now=this.now();const list=Object.entries(this.jobs).map(([channel,j])=>({channel,...j}));const fresh=list.filter(j=>this.ready(j.channel)&&j.status==='ok'&&j.lastSuccessAt&&Number.isFinite(Date.parse(j.lastSuccessAt))&&Date.parse(j.lastSuccessAt)<=now+300000&&now-Date.parse(j.lastSuccessAt)<=Math.max((CHANNELS[j.channel].minutes||30)*60000*2,3600000));return{automaticSourceSync:!!this.timer&&fresh.length>0,schedulerRunning:!!this.timer,configuredChannels:Object.keys(CHANNELS).filter(k=>this.ready(k)),freshChannels:fresh.map(x=>x.channel),scope:Object.fromEntries(Object.entries(this.config).filter(([k])=>this.ready(k)).map(([k,v])=>[k,v.scope||'operator-feed'])),jobs:list};}
 async run(channel,{force=false}={}){
  const j=this.jobs[channel];if(!j)throw new Error('未知通道');if(j.status==='running')return{skipped:true};
  if(!this.ready(channel)){j.status='not-configured';j.message='数据源未连接';j.nextAttemptAt=null;return{blocked:true};}
  if(channel==='profiles'&&!force)return{skipped:true};if(!force&&j.nextAttemptAt&&Date.parse(j.nextAttemptAt)>this.now())return{skipped:true};
  const before=await this.read();j.status='running';j.lastAttemptAt=new Date(this.now()).toISOString();
  try{const c=this.config[channel],headers={'Accept':'application/json'};if(c.bearerTokenEnv&&process.env[c.bearerTokenEnv])headers.Authorization='Bearer '+process.env[c.bearerTokenEnv];let feed;if(c.adapter){feed=await collectPublic(channel,c,before,{fetcher:this.fetcher,now:this.now()});}else{const res=await this.fetcher(c.url,{headers,redirect:'error',signal:AbortSignal.timeout(12000)});if(!res.ok)throw new Error(`来源HTTP ${res.status}`);if(!/json/i.test(res.headers.get('content-type')||''))throw new Error('来源未返回JSON');const text=await res.text();if(Buffer.byteLength(text)>2000000)throw new Error('来源响应过大');feed=JSON.parse(text);}await this.commit(current=>applyFeed(current,channel,feed,this.now()));j.status='ok';j.lastSuccessAt=new Date(this.now()).toISOString();j.message='已核验并发布';}
  catch(err){j.status='error';j.message=String(err.message||'更新失败').slice(0,180);j.errorCode=err.cause?.code||err.code||'SOURCE_ERROR';}
  finally{const delay=intervalFor(channel,before,this.now());j.nextAttemptAt=delay?new Date(this.now()+delay).toISOString():null;}
  return{...j};
 }
 async tick(){if(this.running)return;this.running=true;try{for(const k of Object.keys(CHANNELS))await this.run(k);}finally{this.running=false;}}
 start(){if(this.timer)return;this.timer=setInterval(()=>this.tick(),60000);this.timer.unref?.();this.tick();}
 stop(){if(this.timer)clearInterval(this.timer);this.timer=null;}
}
