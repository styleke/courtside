/** Public-page collectors. No private endpoints, credentials, CAPTCHA bypass or paid APIs.
 * HTML parsers fail closed on identity/date/schema ambiguity. Source access and display
 * permissions must be reviewed by the site operator. Parser replay tests are NOT live-fetch tests.
 */
import Core from '../public/core.js';
import {createHash} from 'node:crypto';
export const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g,'');
export function textOf(html){return String(html).replace(/<sup\b[^>]*>(\d+)<\/sup>/gi,'($1)').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<!--[^]*?-->/g,' ').replace(/<\s*br\s*\/?\s*>|<\/(?:p|div|li|tr|h[1-6]|section|article)>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/[ \t\r]+/g,' ').replace(/\n\s*\n/g,'\n').trim();}
const MONTHS='january february march april may june july august september october november december'.split(' ');
export function englishDate(text){const m=text.match(/(?:Verified on\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})/i);if(!m)return null;const d=`${m[3]}-${String(MONTHS.indexOf(m[1].toLowerCase())+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;return Core.validDate(d)?d:null;}
export function sourceDateGuard(date,now,{maxAgeDays=1,maxFutureDays=1}={}){if(!Core.validDate(date))throw new Error('来源缺少明确日期');const delta=(Date.parse(date+'T00:00:00Z')-Date.parse(Core.day(new Date(now).toISOString())+'T00:00:00Z'))/86400000;if(delta< -maxAgeDays||delta>maxFutureDays)throw new Error(`来源日期不在允许范围：${date}`);}
function findPlayer(name,players,tour){const n=norm(name);const swapped=norm(String(name).split(' ').reverse().join(' '));const hits=players.filter(p=>(!tour||p.tour===tour)&&[p.enName,p.name,...(p.aliases||[])].some(v=>norm(v)===n||norm(v)===swapped));if(hits.length!==1)throw new Error(`球员身份待核验：${name}`);return hits[0];}
export function parseRankings(html,tour,data,{url,observedAt}){
 const text=textOf(html),stamp=text.match(/(?:Verified on|Rankings? (?:as of|for))\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2})/i),date=stamp?englishDate(stamp[1]):null;sourceDateGuard(date,Date.parse(observedAt),{maxAgeDays:14,maxFutureDays:0});
 const sectionStart=html.search(/<h[1-6][^>]*>[^<]*(?:ATP|WTA) Singles Rankings/i);const scoped=sectionStart>=0?html.slice(sectionStart):html;const tables=[...scoped.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];let rows=null;
 for(const [,table] of tables){const candidates=[];for(const [,tr] of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){const cells=[...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>textOf(x[1]).trim());if(cells.length<6||!/^\d+$/.test(cells[0]))continue;const rank=Number(cells[0]);if(rank>100)continue;const q=findPlayer(cells[2],data.players,tour),points=Number(cells.at(-1).replace(/,/g,'')),change=cells[1].trim()?Number(cells[1].replace('−','-')):0;if(!Number.isFinite(points)||!Number.isInteger(change))throw new Error('榜单数值解析失败');candidates.push({rank,playerId:q.id,points,change});}
  if(candidates.length===100&&candidates.every((x,i)=>x.rank===i+1)){rows=candidates;break;}
 }
 if(!rows||new Set(rows.map(x=>x.playerId)).size!==100)throw new Error(`${tour}前100不完整，保留旧榜单`);
 if(rows.some((r,i)=>i>0&&r.points>rows[i-1].points))throw new Error('排名与积分次序冲突');
 return{tour,rankingDate:date,verifiedAt:observedAt,sourceUrl:url,sourceName:'TennisCompanion 单打榜单',officialUrl:tour==='ATP'?'https://www.atptour.com/en/rankings/singles':'https://www.wtatennis.com/rankings/singles',rows};
}
const COURTS={'Stadium Court':'中央球场','Grandstand 2':'二号看台球场','Show Court 3':'三号球场','Court 4':'四号球场','Court 6':'六号球场','Court 7':'七号球场'};
function foundEnglishPlayers(text,players){const clean=text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();return players.map(p=>{const n=p.enName.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase(),at=clean.indexOf(n);return{p,at};}).filter(x=>x.at>=0).sort((a,b)=>a.at-b.at).map(x=>x.p);}
const sameSides=(a,b)=>a.map(s=>[...s].sort().join('+')).sort().join('|')===b.map(s=>[...s].sort().join('+')).sort().join('|');
export function parseShanghaiSchedule(html,data,{url,observedAt,tournamentId='shanghai-2026'}){
 const heading=html.match(/<h[12]\b[^>]*>\s*Schedule\s*<\/h[12]>/i),start=heading?html.indexOf(heading[0]):0;
 const body=textOf(html.slice(start)).split('Tournament is supported by')[0],date=englishDate(body);sourceDateGuard(date,Date.parse(observedAt));
 const tr=data.tournaments.find(x=>x.id===tournamentId);if(!tr||date<tr.startDate||date>Core.addDays(tr.endDate,1))throw new Error('赛事届次或日期不匹配');
 const markers=[...body.matchAll(/Starts At\s+(\d{1,2}:\d{2})|Not Before\s+(\d{1,2}:\d{2})|Followed By/gi)];if(!markers.length)throw new Error('页面没有可识别的出场顺序');
 const changes=[],seen=new Set(),courtOrders={};let resultCount=0;
 for(let i=0;i<markers.length;i++){
  const a=markers[i],chunk=body.slice(a.index,markers[i+1]?.index??body.length),before=body.slice(0,a.index);let court='',at=-1;
  for(const [en,cn] of Object.entries(COURTS)){const pos=before.lastIndexOf(en);if(pos>at){court=cn;at=pos;}}
  if(!court)throw new Error('无法识别球场');courtOrders[court]=(courtOrders[court]||0)+1;
  // Only an explicit final-result marker can complete a match. A plausible score is insufficient.
  const final=chunk.match(/\bDefeats\s+((?:\d{2}(?:\(\d+\))?|\[?\d{1,2}-\d{1,2}\]?)(?:[ \t\n]+(?:\d{2}(?:\(\d+\))?|\[?\d{1,2}-\d{1,2}\]?))*)/i);
  const separator=final?'Defeats':/\bVS\b/.test(chunk)?'VS':null;if(!separator)continue;
  const splitAt=chunk.indexOf(separator),parts=[chunk.slice(0,splitAt),chunk.slice(splitAt+separator.length)];
  const sides=parts.map(part=>foundEnglishPlayers(part,data.players).map(p=>p.id));
  if(![1,2].includes(sides[0].length)||sides[1].length!==sides[0].length)throw new Error('无法无歧义解析对阵，不发布部分猜测');
  const roundCode=chunk.match(/\b(R128|R64|R32|R16|QF|SF|F)\b/)?.[1]||before.match(/\b(R128|R64|R32|R16|QF|SF|F)\b(?=[^]*$)/)?.[1];
  const old=data.matches.find(m=>m.tournamentId===tournamentId&&m.localDate===date&&sameSides(m.sides,sides));
  if(!old)throw new Error('新对阵尚未完成身份及签表关联，需审核');
  if(seen.has(old.id))continue;seen.add(old.id);
  const kind=a[1]?'exact':a[2]?'notBefore':'following',time=a[1]||a[2],startAt=time?`${date}T${time.padStart(5,'0')}:00+08:00`:null;
  const patch={id:old.id,startAt,timeKind:kind,localDate:date,confirmedBeijingDate:date,court,courtOrder:courtOrders[court],scheduleConfirmed:true,scheduleSourceUrl:url,scheduleVerifiedAt:observedAt,verifiedAt:observedAt};
  if(old.startAt!==startAt||old.court!==court)patch.session=null;
  if(final){const tokens=final[1].trim().split(/\s+/),score=tokens.map(t=>/^\d{2}(?:\(\d+\))?$/.test(t)?t[0]+'-'+t.slice(1):t.includes('-')?'['+t.replace(/[\[\]]/g,'')+']':t).join(' ');
   const candidate={...old,...patch,status:'finished',winnerIds:sides[0],score,scoreOrder:'winner-first'};
   if(!Core.scoreboardView(candidate,old.sides).known)throw new Error('完赛比分无法明确对应参赛方');
   Object.assign(patch,{status:'finished',winnerIds:sides[0],score,scoreOrder:'winner-first',resultSourceUrl:url,resultVerifiedAt:observedAt});resultCount++;
  }else if(old.status==='finished')continue;
  changes.push(patch);
 }
 if(!changes.length)throw new Error('未解析出可发布的赛程记录');
 return{schemaVersion:1,channel:'scores',observedAt,scope:{tournaments:[tournamentId],fields:['schedule',...(resultCount?['results']:[])],sourceDate:date},changes:{matches:changes}};
}

export async function fetchPublic(url,{fetcher=fetch,allowedHosts,timeoutMs=15000,maxBytes=3000000,accept='text/html'}={}){
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||!allowedHosts?.includes(u.hostname))throw new Error('采集域名不在白名单');
 const res=await fetcher(url,{headers:{Accept:accept,'User-Agent':'Courtside/0.8 (public schedule check; no login)'},redirect:'error',signal:AbortSignal.timeout(timeoutMs)});
 if(!res.ok)throw new Error(`来源HTTP ${res.status}`);
 const c=res.headers.get('content-type')||'';if(!/text\/html|text\/plain|application\/xhtml\+xml/i.test(c))throw new Error('来源类型改变');
 const reader=res.body?.getReader();let text='';
 if(reader){const chunks=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new Error('响应超过安全上限');}chunks.push(value);}}finally{reader.releaseLock();}text=Buffer.concat(chunks.map(v=>Buffer.from(v))).toString('utf8');}else{text=await res.text();if(Buffer.byteLength(text)>maxBytes)throw new Error('响应超过安全上限');}
 if(/captcha|verify you are human|access denied|just a moment|cf-chl-/i.test(text))throw new Error('来源要求人工验证；不绕过');
 return{body:text,sha256:createHash('sha256').update(text).digest('hex'),url,contentType:c};
}
export async function collectPublic(channel,config,data,{fetcher=fetch,now=Date.now()}={}){
 const observedAt=new Date(now).toISOString();
 if(config.adapter==='shanghai-schedule-html'){
  const r=await fetchPublic(config.url,{fetcher,allowedHosts:config.allowedHosts});const out=parseShanghaiSchedule(r.body,data,{url:r.url,observedAt,tournamentId:config.tournamentId});out.sourceEvidence=[{url:r.url,sha256:r.sha256,checkedAt:observedAt}];return out;
 }
 if(config.adapter==='rankings-html'){
  const rows=[],proof=[];for(const [tour,url] of Object.entries(config.pages||{})){const r=await fetchPublic(url,{fetcher,allowedHosts:config.allowedHosts});rows.push(parseRankings(r.body,tour,data,{url,observedAt}));proof.push({url,sha256:r.sha256,checkedAt:observedAt});}
  if(rows.length!==2)throw new Error('两个排名来源必须全部成功');return{schemaVersion:1,channel:'rankings',observedAt,scope:{fields:['rankings'],tours:['ATP','WTA']},sourceEvidence:proof,changes:{rankings:rows}};
 }
 throw new Error('未实现的采集器');
}
