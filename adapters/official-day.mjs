/** Read one saved, dated official day list. Pure parser: no network, no auto permission. */
import {createHash} from 'node:crypto';
import Core from '../public/core.js';
const decode=s=>String(s||'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const norm=s=>decode(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function tree(html){
 if(typeof html!=='string'||Buffer.byteLength(html)>3000000)throw Error('Official HTML size/type rejected');
 const root={tag:'root',attrs:{},children:[]},stack=[root];
 for(const part of html.replace(/<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1>/gi,'').match(/<[^>]*>|[^<]+/g)||[]){
  if(part[0]!=='<'){stack.at(-1).children.push(decode(part));continue;}
  const end=part.match(/^<\/([a-z0-9-]+)/i);if(end){for(let i=stack.length-1;i>0;i--)if(stack[i].tag===end[1].toLowerCase()){stack.length=i;break;}continue;}
  const start=part.match(/^<([a-z0-9-]+)\b/i);if(!start)continue;
  const attrs={};for(const m of part.slice(start[0].length).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]);
  const n={tag:start[1].toLowerCase(),attrs,children:[]};stack.at(-1).children.push(n);if(!voids.has(n.tag)&&!part.endsWith('/>'))stack.push(n);
 }
 return root;
}
const has=(n,cl)=>n&&typeof n!=='string'&&(n.attrs.class||'').split(/\s+/).includes(cl);
const all=(n,p)=>typeof n==='string'?[]:[...(p(n)?[n]:[]),...n.children.flatMap(x=>all(x,p))];
const cls=(n,c)=>all(n,x=>has(x,c));
const text=n=>n==null?'':typeof n==='string'?n:n.children.map(text).join(' ').replace(/\s+/g,' ').trim();
function one(n,c){const a=cls(n,c);if(a.length!==1)throw Error('Expected one '+c+', got '+a.length);return a[0];}
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
export function normalFinalScore(raw,{doubles=false}={}){
 const tokens=String(raw||'').trim().split(/\s+/);if(tokens.length<2||tokens.length>3)throw Error('Final needs two or three sets');
 let wins=[0,0];const sets=tokens.map((x,i)=>{
  let m=x.match(/^(\d)(\d)(?:\((\d+)\))?$/),a,b,tb,superTie=false;
  if(m){a=+m[1];b=+m[2];tb=m[3];}
  else {m=x.match(/^\[?(\d+)-(\d+)\]?$/);if(!m||!doubles||i!==2)throw Error('Unsupported official score');a=+m[1];b=+m[2];superTie=true;}
  if(wins.includes(2))throw Error('Set after match finished');
  if(superTie){if(wins[0]!==1||wins[1]!==1||Math.max(a,b)<10||Math.abs(a-b)<2||(Math.max(a,b)>10&&Math.abs(a-b)!==2))throw Error('Invalid match tiebreak');}
  else if(!((Math.max(a,b)===6&&Math.min(a,b)<=4)||(Math.max(a,b)===7&&[5,6].includes(Math.min(a,b)))))throw Error('Unfinished or impossible set');
  if(tb!==undefined&&!(Math.max(a,b)===7&&Math.min(a,b)===6))throw Error('Tiebreak on wrong set');
  wins[a>b?0:1]++;return superTie?`[${a}-${b}]`:`${a}-${b}${tb!==undefined?'('+Number(tb)+')':''}`;
 });
 if(wins[0]!==2||wins[1]>=2)throw Error('Defeats score is not winner-first');return sets.join(' ');
}
const courts={'Stadium Court':'中央球场','Grandstand 2':'二号看台球场','Show Court 3':'三号球场','Court 4':'四号球场'};
export const roundLabel=(r,discipline)=>({F:'决赛',SF:'半决赛',QF:'四分之一决赛',R16:discipline==='双打'?'第二轮':'第四轮',R32:discipline==='双打'?'第一轮':'第三轮',R64:'第二轮',R128:'第一轮'})[r]||r;
export function parseOfficialDay(html,{tournamentId,url,expectedDate}={}){
 const u=new URL(url);if(u.origin!=='https://en.rolexshanghaimasters.com'||u.pathname!=='/en/scores/schedule')throw Error('Unapproved official day document');
 const root=one(tree(html),'atp_scheduled'),header=text(one(one(root,'header'),'title'));
 const dm=header.match(/\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\b/),mon=dm&&months.indexOf(dm[1].toLowerCase());
 if(!dm||mon<0)throw Error('Missing official day date');const date=`${dm[3]}-${String(mon+1).padStart(2,'0')}-${dm[2].padStart(2,'0')}`;
 if(!Core.validDate(date)||(expectedDate&&date!==expectedDate))throw Error('Official day mismatch');
 const records=[],seen=new Set();let counted=0;
 for(const c of cls(root,'schedule')){
  const courtOriginal=text(one(c,'location')),court=courts[courtOriginal];if(!court)throw Error('Unknown court '+courtOriginal);
  let order=0;for(const item of cls(c,'match-item')){counted++;order++;
   const sides=['match-player','match-opponent'].map(cl=>{
    const sideNode=one(item,cl),names=cls(sideNode,'name'),flags=cls(sideNode,'country').flatMap(n=>all(n,x=>x.tag==='img')).map(n=>(n.attrs.src||'').match(/\/flags\/([a-z]{3})\.svg/i)?.[1]?.toUpperCase()||null);if(![1,2].includes(names.length))throw Error('Unresolved team');
    return names.map((n,i)=>{const a=all(n,x=>x.tag==='a');if(a.length!==1)throw Error('Missing player link');const href=a[0].attrs.href||'',m=href.match(/^\/en\/players\/([a-z0-9-]+)\/([a-z0-9]+)\/?$/i);if(!m)throw Error('Bad official player identity');
     const enName=text(a[0]).replace(/\s*\/\s*$/,'').trim();if(!enName||!enName.includes(' '))throw Error('Incomplete name');return {sourceId:m[2].toLowerCase(),enName,profileUrl:u.origin+href,country:flags[i]||null};});
   });
   if(sides[0].length!==sides[1].length||new Set(sides.flat().map(p=>p.sourceId)).size!==sides.flat().length)throw Error('Bad sides');
   const discipline=sides[0].length===2?'双打':'单打';const rounds=[...new Set(cls(item,'round').map(text))];if(rounds.length!==1||!['R128','R64','R32','R16','QF','SF','F'].includes(rounds[0]))throw Error('Round mismatch');
   const roundCode=rounds[0],when=text(one(item,'match-time'));let timeKind,time=null;
   if(when==='Followed By')timeKind='following';else{const tm=when.match(/^(Starts At|Not Before)\s+([012]?\d:[0-5]\d)$/);if(!tm||Number(tm[2].split(':')[0])>23)throw Error('Unknown timing '+when);timeKind=tm[1]==='Starts At'?'exact':'notBefore';time=tm[2].padStart(5,'0');}
   const state=text(one(item,'match-state'));if(!['VS','Defeats'].includes(state))throw Error('Unsupported official state '+state);
   const scoreNodes=cls(item,'match-score');const score=state==='Defeats'?normalFinalScore(text(scoreNodes[0]),{doubles:discipline==='双打'}):null;
   if(state==='VS'&&scoreNodes.some(n=>text(n)))throw Error('Unexpected score before terminal state');
   const key=[tournamentId,discipline,roundCode,...sides.map(s=>s.map(p=>p.sourceId).sort().join('+')).sort()].join('|');if(seen.has(key))throw Error('Duplicate official match');seen.add(key);
   records.push({key,tournamentId,date,discipline,roundCode,round:roundLabel(roundCode,discipline),court,courtOriginal,courtOrder:order,timeKind,startAt:time?`${date}T${time}:00+08:00`:null,sides,status:state==='Defeats'?'finished':'scheduled',score});
  }
 }
 if(!records.length||records.length!==cls(root,'match-item').length||counted!==records.length)throw Error('Incomplete day parsing');
 return {schemaVersion:1,date,tournamentId,sourceUrl:url,sourceSha256:createHash('sha256').update(html).digest('hex'),count:records.length,records};
}
export function resolveOfficialPlayer(ref,players){
 const byId=players.filter(p=>p.externalIds?.atp===ref.sourceId);
 const byName=players.filter(p=>[p.enName,...(p.aliases||[]).filter(s=>/[A-Za-z].*\s.*[A-Za-z]/.test(s))].some(s=>norm(s)===norm(ref.enName)));
 if(byId.length>1||byName.length!==1||byId.length===1&&byId[0].id!==byName[0].id)throw Error('Ambiguous official identity '+ref.enName);
 const p=byName[0];if(p.tour!=='ATP'||p.externalIds?.atp&&p.externalIds.atp!==ref.sourceId)throw Error('Conflicting official identity '+ref.enName);return p;
}
export function applyOfficialDays(input,docs,{checkedAt,reviewId}={}){
 if(!Core.validInstant(checkedAt)||!reviewId)throw Error('Explicit editorial evidence required');const data=structuredClone(input),report={reviewId,checkedAt,added:[],results:[],days:[],identityCount:0};
 for(const doc of docs){
  const t=data.tournaments.find(t=>t.id===doc.tournamentId);if(!t||t.tour!=='ATP'||t.timeZone!=='Asia/Shanghai'&&t.timezone!=='Asia/Shanghai'&&t.country!=='CHN')throw Error('Tournament timezone not established');
  if(doc.date<t.startDate||doc.date>t.endDate)throw Error('Date outside event edition');const ids=[];
  for(const row of doc.records){
   const mapped=row.sides.map(side=>side.map(ref=>{const p=resolveOfficialPlayer(ref,data.players);if(!p.externalIds?.atp){p.externalIds={...p.externalIds,atp:ref.sourceId};report.identityCount++;}if(!p.country&&ref.country){p.country=ref.country;p.countrySourceUrl=doc.sourceUrl;p.countryCheckedAt=checkedAt;}return p.id;}));
   const pair=sides=>sides.map(s=>[...s].sort().join('+')).sort().join('|');
   const found=data.matches.filter(m=>m.tournamentId===t.id&&m.discipline===row.discipline&&m.roundCode===row.roundCode&&pair(m.sides)===pair(mapped));if(found.length>1)throw Error('Duplicate existing matchup');
   let m=found[0];if(!m){m={id:'sh-oop-'+createHash('sha256').update(row.key).digest('hex').slice(0,16),tournamentId:t.id,sides:mapped,discipline:row.discipline,roundCode:row.roundCode,round:row.round,status:'scheduled',score:null,winnerIds:[],scoreOrder:'winner-first',demo:false,editorPick:false,watchLinks:[],sourceUrl:doc.sourceUrl,verifiedAt:checkedAt};data.matches.push(m);report.added.push(m.id);}
   if(m.status==='finished'&&row.status!=='finished')throw Error('Official source regressed final '+m.id);
   const schedule={primaryUrl:doc.sourceUrl,checkedAt,sourceDate:doc.date,sourceSha256:doc.sourceSha256,method:'editorial-source-review'};
   Object.assign(m,{localDate:doc.date,confirmedBeijingDate:doc.date,timeKind:row.timeKind,startAt:row.startAt,court:row.court,courtOrder:row.courtOrder,round:row.round,scheduleConfirmed:true,scheduleSourceUrl:doc.sourceUrl,scheduleVerifiedAt:checkedAt});
   m.fieldSources={...m.fieldSources,schedule};
   if(row.status==='finished'){
    if(m.status!=='finished'||m.score!==row.score||JSON.stringify(m.winnerIds)!==JSON.stringify(mapped[0]))report.results.push(m.id);
    Object.assign(m,{status:'finished',score:row.score,winnerIds:mapped[0],scoreOrder:'winner-first',resultSourceUrl:doc.sourceUrl,resultsVerifiedAt:checkedAt,resultVerifiedAt:checkedAt,verifiedAt:checkedAt});m.fieldSources.results={...schedule};
   }
   ids.push(m.id);
  }
  data.meta.scheduleCoverage=(data.meta.scheduleCoverage||[]).filter(x=>!(x.tournamentId===t.id&&x.date===doc.date));
  data.meta.scheduleCoverage.push({tournamentId:t.id,date:doc.date,sourceDate:doc.date,expectedMatches:doc.count,matchIds:ids,sourceUrl:doc.sourceUrl,checkedAt,method:'editorial-source-review'});
  const sc=(data.meta.sourceChecks??={});sc[t.id]={...sc[t.id],schedule:checkedAt};if(doc.records.some(r=>r.status==='finished'))sc[t.id].results=checkedAt;
  report.days.push({date:doc.date,tournamentId:t.id,count:doc.count,matchIds:ids,sourceUrl:doc.sourceUrl});
 }
 const errs=Core.validate(data);if(errs.length)throw Error(errs.join('; '));return {data,report};
}
export function officialSinglesSlots(html){
 const doc=tree(html),rounds=['R128','R64','R32','R16','QF','SF','F'];const out=[];
 for(let i=0;i<rounds.length;i++){
  const sections=cls(doc,'draw-round-'+(i+1));if(sections.length!==1)throw Error('Draw round ambiguous');
  const slots=cls(sections[0],'draw-stats');if(slots.length!==64/(2**i))throw Error('Draw slot count mismatch');
  slots.forEach((s,position)=>{const stats=cls(s,'stats-item');if(stats.length!==2)throw Error('Draw sides missing');
   const sides=stats.map(stat=>{const names=cls(stat,'name');if(names.length!==1)throw Error('Name slot missing');
    const a=all(names[0],n=>n.tag==='a');if(!a.length)return /\bBye\b/.test(text(names[0]))?'bye':null;
    if(a.length!==1)throw Error('Not singles');const m=(a[0].attrs.href||'').match(/^\/en\/players\/([a-z0-9-]+)\/([a-z0-9]+)\/?$/i);if(!m)throw Error('Missing draw player id');return {sourceId:m[2].toLowerCase(),slug:m[1]};
   });out.push({round:rounds[i],position,sides});
  });
 }
 return out;
}
export function attachOfficialSlots(input,slots,{checkedAt,sourceUrl}={}){
 const data=structuredClone(input),draw=data.draws.find(x=>x.id==='shanghai-2026-singles');if(!draw)throw Error('No existing Shanghai draw');
 const wanted=new Set(['R64','R32']),nodes=[];const normSlug=s=>String(s).replace(/[^a-z0-9]/g,'');
 const find=ref=>{if(!ref||typeof ref==='string')return null;const a=data.players.filter(p=>p.tour==='ATP'&&(p.externalIds?.atp===ref.sourceId||normSlug(p.id)===normSlug(ref.slug)));return a.length===1?a[0].id:null;};
 for(const s of slots.filter(x=>wanted.has(x.round))){
  const sides=s.sides.map(find);if(sides.some(x=>!x))continue;
  const ms=data.matches.filter(m=>m.tournamentId===draw.tournamentId&&m.discipline==='单打'&&m.roundCode===s.round&&m.sides.flat().length===2&&sides.every(id=>m.sides.flat().includes(id)));if(ms.length>1)throw Error('Duplicate bracket matchup');if(!ms.length)continue;
  nodes.push({id:'sh-'+s.round+'-'+s.position,round:s.round,position:s.position,matchId:ms[0].id,previousIds:[]});
 }
 if(nodes.filter(n=>n.round==='R32').length!==16)throw Error('R32 slots not complete');
 for(const old of draw.nodes.filter(n=>n.kind==='bye')){const slot=slots.find(s=>s.round===old.round&&s.position===old.position);if(slot&&slot.sides.includes('bye')&&slot.sides.some(r=>find(r)===old.playerIds?.[0]))nodes.push({...old});}
 for(const [round,size] of [['R16',8],['QF',4],['SF',2],['F',1]])for(let position=0;position<size;position++)nodes.push({id:'sh-'+round+'-'+position,round,position,previousIds:[]});
 const previous={R64:'R128',R32:'R64',R16:'R32',QF:'R16',SF:'QF',F:'SF'};
 for(const node of nodes){if(node.kind==='bye')continue;node.previousIds=[0,1].map(j=>nodes.find(p=>p.round===previous[node.round]&&p.position===node.position*2+j)?.id).filter(Boolean);}
 draw.nodes=nodes;draw.rounds=['R128','R64','R32','R16','QF','SF','F'];draw.completeFromRound='R32';draw.sourceUrl=sourceUrl;draw.verifiedAt=checkedAt;draw.coverageNote='第三轮起签位完整；此前已收录赛果可回顾。未定场次以官方公布为准。';
 data.meta.sourceChecks??={};data.meta.sourceChecks[draw.tournamentId]={...data.meta.sourceChecks[draw.tournamentId],draws:checkedAt};return data;
}
