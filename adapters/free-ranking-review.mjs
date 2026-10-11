/** Read-only admission for documented $0 ATP/WTA ranking endpoints; never a publication adapter. */
import {createHash} from 'node:crypto';
const TOURS=['ATP','WTA'];
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
export function rankingURL(tour,cursor=null,{date=null}={}){
 if(!TOURS.includes(tour))throw Error('unsupported-tour');
 if(cursor!==null&&(!Number.isSafeInteger(cursor)||cursor<0))throw Error('invalid-cursor');
 const u=new URL('https://api.balldontlie.io/'+tour.toLowerCase()+'/v1/rankings');
 u.searchParams.set('per_page','100');if(date!==null){if(!day(date))throw Error('invalid-requested-date');u.searchParams.set('date',date);}if(cursor!==null)u.searchParams.set('cursor',String(cursor));return u.href;
}
export function inspectRankingPages(pages,tour,current,{today=new Date().toISOString().slice(0,10),requestedDate=null}={}){
 if(!TOURS.includes(tour)||!day(today)||(requestedDate!==null&&!day(requestedDate)))throw Error('invalid-review-scope');
 const problems=[],rows=[],seenPlayers=new Set(),seenRanks=new Set();
 const old=current.rankings?.find(t=>t.tour===tour),players=current.players||[];
 if(!Array.isArray(pages)||!pages.length||pages.length>2)throw Error('invalid-page-count');
 for(const page of pages){
  if(!Array.isArray(page?.data)||page.data.length>100)throw Error('invalid-ranking-envelope');
  for(const r of page.data){
   const p=r?.player;
   if(!Number.isSafeInteger(r?.rank)||r.rank<1||!Number.isSafeInteger(r.points)||r.points<0||!day(r.ranking_date)||!Number.isSafeInteger(p?.id)||p.id<1||typeof p.full_name!=='string'||p.full_name.length>150||!/[A-Za-z]/.test(p.full_name)||!/^([A-Z]{3})$/.test(p.country_code||''))throw Error('invalid-ranking-row');
   if(r.movement!=null&&!Number.isSafeInteger(r.movement))throw Error('invalid-rank-movement');
   if(r.rank>100)continue;
   if(seenRanks.has(r.rank)||seenPlayers.has(p.id))problems.push('duplicate-ranking-row');seenRanks.add(r.rank);seenPlayers.add(p.id);
   const names=[p.full_name,typeof p.first_name==='string'&&typeof p.last_name==='string'?p.first_name+' '+p.last_name:''].filter(n=>n.trim().includes(' ')).map(norm);
   const found=players.filter(q=>q.tour===tour&&q.country===p.country_code&&[q.enName,...(q.aliases||[])].some(n=>typeof n==='string'&&n.trim().includes(' ')&&names.includes(norm(n))));
   const match=found.length===1?found[0]:null;
   const linked=match?.externalIds?.balldontlie;
   const valid=match&&(linked==null||String(linked)===String(p.id));
   rows.push({rank:r.rank,points:r.points,change:r.movement??null,rankingDate:r.ranking_date,providerPlayerId:p.id,enName:p.full_name,country:p.country_code,playerId:valid?match.id:null,identityStatus:valid?'full-name-country':'needs-review'});
  }
 }
 rows.sort((a,b)=>a.rank-b.rank);
 if(rows.length!==100||rows.some((r,i)=>r.rank!==i+1))problems.push('incomplete-top-100');
 const dates=[...new Set(rows.map(r=>r.rankingDate))],rankingDate=dates.length===1?dates[0]:null;
 if(!rankingDate)problems.push('mixed-or-missing-issue-date');
 if(requestedDate!==null&&rankingDate!==requestedDate)problems.push('requested-date-not-honored');
 if(rankingDate){
  if(rankingDate>today)problems.push('future-issue-date');
  if(Date.parse(today)-Date.parse(rankingDate)>14*86400000)problems.push('old-issue-date');
  if(old?.rankingDate&&rankingDate<old.rankingDate)problems.push('would-regress-current-ranking');
 }
 if(rows.some(r=>r.playerId===null))problems.push('unresolved-identities');
 const known=rows.map(r=>r.playerId).filter(Boolean);if(new Set(known).size!==known.length)problems.push('identity-collision');
 if(rankingDate===old?.rankingDate&&rows.some(r=>r.playerId&&old.rows.some(o=>o.playerId===r.playerId&&(o.rank!==r.rank||o.points!==r.points))))problems.push('same-issue-conflict');
 return {tour,rankingDate,requestedDate,rows,problems:[...new Set(problems)],eligibleForEditorialReview:problems.length===0,publicDataWritten:false,automaticPublication:false,independentlyVerified:false,sourcePage:'https://'+tour.toLowerCase()+'.balldontlie.io/'};
}
export async function reviewFreeRankings(current,{apiKey,freeConfirmed,fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=()=>Date.now()}={}){
 const report={startedAt:new Date(now()).toISOString(),source:'BALLDONTLIE Free',mode:'read-only',publicDataWritten:false,automaticPublication:false,requests:[],tours:[],errors:[]};
 if(freeConfirmed!==true||typeof apiKey!=='string'||apiKey.length<8||apiKey.length>512||/[\r\n]/.test(apiKey))return {...report,status:'not-configured',reason:'Free-only account confirmation and repository secret are required',finishedAt:new Date(now()).toISOString()};
 let requestCount=0;
 for(const tour of TOURS){
  const pages=[],cursors=new Set();let cursor=null;
  try{
   for(let page=0;page<2;page++){
    if(requestCount>=4)throw Error('request-limit');
    if(requestCount)await sleep(15000);
    const url=rankingURL(tour,cursor);requestCount++;
    let response;
    try{response=await fetcher(url,{headers:{Authorization:apiKey,Accept:'application/json','User-Agent':'CourtsideFreeRankingReview/1.0'},redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw Error('source-network-error');}
    const entry={url,status:response.status,observedAt:new Date(now()).toISOString()};report.requests.push(entry);
    if(!response.ok){await response.body?.cancel();throw Error('source-http-'+response.status);}
    if(!response.headers.get('content-type')?.includes('json')){await response.body?.cancel();throw Error('source-not-json');}
    const reader=response.body.getReader(),parts=[];let bytes=0;
    for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1500000){await reader.cancel();throw Error('source-size-limit');}parts.push(Buffer.from(value));}
    const body=Buffer.concat(parts);entry.bytes=bytes;entry.sha256=createHash('sha256').update(body).digest('hex');
    let envelope;try{envelope=JSON.parse(body.toString('utf8'));}catch{throw Error('source-json-invalid');}
    // Never save an unfiltered response or credential-bearing headers.
    if(!Array.isArray(envelope?.data)||envelope.data.length>100)throw Error('invalid-ranking-envelope');
    pages.push(envelope);
    const ranks=new Set(pages.flatMap(p=>p.data.map(r=>r.rank)));
    if(Array.from({length:100},(_,i)=>i+1).every(r=>ranks.has(r)))break;
    const next=envelope.meta?.next_cursor;
    if(next==null)break;
    if(!Number.isSafeInteger(next)||next<0||cursors.has(next))throw Error('invalid-pagination');
    cursors.add(next);cursor=next;
   }
   report.tours.push(inspectRankingPages(pages,tour,current,{today:new Date(now()).toISOString().slice(0,10)}));
  }catch(e){
   const code=String(e.message);const allowed=/^(?:source-(?:network-error|http-\d{3}|not-json|size-limit|json-invalid)|invalid-(?:ranking-envelope|ranking-row|rank-movement|pagination)|request-limit)$/;
   report.errors.push({tour,code:allowed.test(code)?code:'review-failed'});
   if(['source-http-401','source-http-403','source-http-429'].includes(code))break;
  }
 }
 report.finishedAt=new Date(now()).toISOString();report.status=report.errors.length?'error':'review-only';
 // Guard against reflected credentials even in otherwise valid textual fields.
 if(JSON.stringify(report).includes(apiKey))return {startedAt:report.startedAt,finishedAt:report.finishedAt,status:'error',errors:[{code:'credential-reflection-rejected'}],requests:[],tours:[],publicDataWritten:false,automaticPublication:false};
 return report;
}
