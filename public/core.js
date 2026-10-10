/* Shared browser/server domain functions; no external dependencies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CourtCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BJ='Asia/Shanghai';
function validZone(z){try{new Intl.DateTimeFormat('en',{timeZone:z}).format();return true;}catch{return false;}}
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
function validInstant(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(s)&&!isNaN(Date.parse(s))&&validDate(s.slice(0,10));}
function parts(instant,zone=BJ){if(!validInstant(instant)||!validZone(zone))return null;const p={};new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).forEach(x=>p[x.type]=x.value);return{date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};}
function day(instant,zone=BJ){return parts(instant,zone)?.date||null;}
function clock(instant,zone=BJ){return parts(instant,zone)?.time||'待公布';}
function addDays(s,n){if(!validDate(s))return s;const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function matchDate(m){return m.startAt?day(m.startAt):m.confirmedBeijingDate||null;}
function timeLabel(m){if(m.timeKind==='following')return'前场结束后';if(!m.startAt)return'时间待公布';return(m.timeKind==='notBefore'?'不早于 ':'')+clock(m.startAt);}
function safeURL(s){try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function followed(m,d){return m.sides.flat().some(id=>d.players.find(p=>p.id===id)?.followed);}
function matchName(m,d){return m.sides.map(side=>side.map(id=>d.players.find(p=>p.id===id)?.name||'待定球员').join(' / ')).join(' vs ');}
function ticketContext(m,d){const t=d.tournaments.find(x=>x.id===m.tournamentId);const local=m.startAt?day(m.startAt,t?.timeZone):m.localDate;const blocked=['withdrawn','cancelled','rescheduled','suspended'].includes(m.status);const candidates=d.tickets.filter(x=>x.tournamentId===m.tournamentId&&x.kind==='session'&&x.localDate===local&&x.court===m.court&&x.session===m.session&&x.confirmed);const matched=!blocked&&m.scheduleConfirmed&&local&&m.court&&m.session?candidates[0]:null;return{blocked,localDate:local||null,matched:matched||null,url:blocked?null:(matched?.url||t?.ticketUrl||null),label:matched?'查看对应官方票务':'查看赛事官方票务',instruction:blocked?'赛程已变化，请重新核验票务；原匹配已暂停。':matched?`现场购票：当地 ${local} · ${m.court} · ${m.session}`:`当地 ${local||'日期待公布'} · ${m.court&&m.session?'票种适用范围未核验':'球场或场次待核验'}；暂不匹配具体票种。`};}
function sortMatches(ms,d){return [...ms].sort((a,b)=>Number(followed(b,d))-Number(followed(a,d))||(b.editorPick?1:0)-(a.editorPick?1:0)||Number(a.status==='finished')-Number(b.status==='finished')||((a.startAt?Date.parse(a.startAt):Infinity)-(b.startAt?Date.parse(b.startAt):Infinity)));}
function recommend(d,date){return sortMatches(d.matches.filter(m=>matchDate(m)===date&&!['cancelled','withdrawn'].includes(m.status)&&(followed(m,d)||m.editorPick||m.ruleCandidate)),d);}
function h2hView(m){const h=m?.h2h,unknown={known:false,wins:null,total:null,firstMeeting:false};if(!h||!Array.isArray(h.wins)||h.wins.length!==2||!h.wins.every(v=>Number.isInteger(v)&&v>=0)||!safeURL(h.sourceUrl)||!validInstant(h.verifiedAt)||!Array.isArray(h.playerIds)||h.playerIds.length!==2||!Array.isArray(m.sides)||m.sides.length!==2||!m.sides.every(s=>Array.isArray(s)&&s.length===1))return unknown;let wins;if(m.sides[0][0]===h.playerIds[0]&&m.sides[1][0]===h.playerIds[1])wins=[...h.wins];else if(m.sides[0][0]===h.playerIds[1]&&m.sides[1][0]===h.playerIds[0])wins=[...h.wins].reverse();else return unknown;const total=wins[0]+wins[1];return {known:true,wins,total,firstMeeting:total===0};}

/** Build a post-match view without mutating a sourced pre-match H2H snapshot.
 * Only an explicitly confirmed result is merged. Rendering/polling is idempotent.
 * Unknown aggregate coverage stays unknown even when a local meeting is available.
 */
function matchHistoryView(m,d){
 const base=h2hView(m),h=m?.h2h||{},tr=d?.tournaments?.find(t=>t.id===m?.tournamentId);
 const sides=m?.sides||[],ids=sides.flat(),board=scoreboardView(m,sides);
 const singles=sides.length===2&&sides.every(s=>s.length===1);
 const pairMatches=!h.playerIds||singles&&h.playerIds.length===2&&h.playerIds.every(id=>ids.includes(id));
 const raw=pairMatches&&Array.isArray(h.meetings)?h.meetings:[];
 const norm=v=>String(v||'').toLowerCase().normalize('NFKC').replace(/[\s·:：()（）_-]/g,'');
 const round=v=>({第二轮:'r64',第三轮:'r32',第四轮:'r16',八强:'qf',四强:'sf',半决赛:'sf',决赛:'f'}[v]||norm(v));
 const date=m?.localDate||(m?.startAt&&tr?day(m.startAt,tr.timeZone):null)||m?.confirmedBeijingDate;
 const year=date?Number(date.slice(0,4)):Number(tr?.year||tr?.startDate?.slice(0,4));
 const names=[tr?.name,tr?.officialName,tr?.shortName].filter(Boolean).map(norm);
 const same=r=>{
  if(r.matchId)return r.matchId===m.id;
  if(r.date&&date&&r.date!==date)return false;
  return Number(r.year)===year&&(r.tournamentId===m.tournamentId||[r.event,r.eventEn].some(v=>v&&names.includes(norm(v))))&&round(r.roundCode||r.round)===round(m.roundCode||m.round);
 };
 const rows=[];const seen=new Set();
 for(const r of raw){
  if(!r||!scoreboardView(r,sides).known)continue;
  const key=r.matchId?'id:'+r.matchId:[r.year,norm(r.eventEn||r.event),round(r.roundCode||r.round),r.date||''].join('|');
  if(seen.has(key))continue;seen.add(key);rows.push({...r,currentMatch:same(r)});
 }
 const resultSource=m?.resultSourceUrl||m?.sourceUrl,resultTime=m?.resultVerifiedAt||m?.verifiedAt;
 const confirmed=m?.status==='finished'&&board.known&&safeURL(resultSource)&&validInstant(resultTime)&&validDate(date)&&!!tr;
 const walkover=board.status==='walkover';
 const eligible=confirmed&&!walkover&&m.countsForH2H!==false;
 let wins=base.wins?[...base.wins]:null,known=base.known,included=false;
 if(confirmed){
  const prior=rows.find(same),already=!!prior||h.includesCurrentMatch===true&&!h.throughMatchId||h.throughMatchId===m.id||(Array.isArray(h.includedMatchIds)&&h.includedMatchIds.includes(m.id));
  const before=h.basis==='before-match'||h.asOf==='本场赛前'||h.throughMatchId===null&&h.basisDate&&h.basisDate<date;
  if(eligible&&known){
   if(already){
    // A corrected winner replaces the earlier result rather than adding a match.
    const priorBoard=prior&&scoreboardView(prior,sides);
    if(priorBoard?.known&&priorBoard.winnerSide!==board.winnerSide){
     if(wins[priorBoard.winnerSide]>0){wins[priorBoard.winnerSide]--;wins[board.winnerSide]++;}else known=false;
    }
    included=known;
   }else if(before){wins[board.winnerSide]++;included=true;}
   else {known=false;wins=null;} // No documented cutoff: never guess whether total includes this match.
  }
  const current={matchId:m.id,tournamentId:m.tournamentId,date,year,event:tr.name,eventEn:tr.officialName||'',level:tr.level,city:tr.city,round:m.round,roundCode:m.roundCode,winnerIds:[...((m.winnerIds?.length)?m.winnerIds:[m.winnerId])],winnerId:singles?m.sides[board.winnerSide][0]:undefined,score:m.score,scoreOrder:m.scoreOrder,sourceUrl:resultSource,verifiedAt:resultTime,currentMatch:true,countsForH2H:eligible};
  // Keep walkovers as a result but outside historical played-match counts.
  if(!walkover){for(let i=rows.length-1;i>=0;i--)if(same(rows[i]))rows.splice(i,1);rows.push(current);}
 }
 rows.sort((a,b)=>Number(b.year||0)-Number(a.year||0)||(a.date&&b.date?b.date.localeCompare(a.date):0)||Number(!!b.currentMatch)-Number(!!a.currentMatch));
 const total=known&&wins?wins[0]+wins[1]:null;
 return {known,wins:known?wins:null,total,firstMeeting:known&&total===0,meetings:rows,currentIncluded:included,completed:confirmed,coverage:known?'complete-total':'records-only'};
}
function completedSetWins(record,sides){
 const b=scoreboardView(record,sides);if(!b.known)return null;const won=[0,0];
 for(const s of b.sets){const hi=Math.max(...s.games),lo=Math.min(...s.games),done=s.matchTiebreak?hi>=10&&hi-lo>=2:hi>=6&&hi-lo>=2||hi===7&&lo===6;
  if(done)won[s.games[0]>s.games[1]?0:1]++;
 }
 return won;
}

// Country labels use sourced country codes; never infer citizenship from birthplace.
const COUNTRY_NAMES={ESA:'萨尔瓦多',NZL:'新西兰',ARG:'阿根廷',AUS:'澳大利亚',AUT:'奥地利',BEL:'比利时',BLR:'白俄罗斯',BRA:'巴西',CAN:'加拿大',CHI:'智利',CHN:'中国',CRO:'克罗地亚',CZE:'捷克',DEN:'丹麦',ESP:'西班牙',FRA:'法国',GBR:'英国',GER:'德国',GRE:'希腊',INA:'印度尼西亚',ITA:'意大利',JPN:'日本',KAZ:'哈萨克斯坦',LAT:'拉脱维亚',MEX:'墨西哥',MON:'摩纳哥',NED:'荷兰',NOR:'挪威',PAR:'巴拉圭',PER:'秘鲁',PHI:'菲律宾',POL:'波兰',ROU:'罗马尼亚',RUS:'俄罗斯',SRB:'塞尔维亚',SUI:'瑞士',SWE:'瑞典',UKR:'乌克兰',USA:'美国',POR:'葡萄牙',EGY:'埃及',TUR:'土耳其',THA:'泰国',HUN:'匈牙利',COL:'哥伦比亚',SVK:'斯洛伐克',SLO:'斯洛文尼亚',UZB:'乌兹别克斯坦'};
function countryName(code){return COUNTRY_NAMES[code]||code||'国籍待核验';}
/** Parse explicitly ordered tennis scores. Unknown syntax is not partially guessed.
 * games and tiebreak entries are source-side ordered. Brackets mark a match tiebreak.
 * Parenthesized tiebreak points are only attached to the losing side of that set.
 */
function parseTennisScore(raw){
 const unknown={known:false,sets:[],status:null};
 if(typeof raw!=='string'||!raw.trim())return unknown;
 let score=raw.trim().replace(/[–—−]/g,'-'),status='finished';
 if(/^(W\/?O|walkover)$/i.test(score))return {known:true,sets:[],status:'walkover'};
 if(/\s(?:RET\.?|retired|退赛)$/i.test(score)){status='retired';score=score.replace(/\s(?:RET\.?|retired|退赛)$/i,'').trim();}
 const tokens=score.match(/\[\d+\s*-\s*\d+\]|\d+\s*-\s*\d+(?:\(\d+\))?/g)||[];
 if(!tokens.length||tokens.length>5||tokens.join('').replace(/\s/g,'')!==score.replace(/\s/g,''))return unknown;
 const sets=[];
 for(const token of tokens){
  const matchTiebreak=token.startsWith('['),r=token.match(/^\[?(\d+)\s*-\s*(\d+)(?:\((\d+)\))?\]?$/);
  if(!r)return unknown;
  const games=[Number(r[1]),Number(r[2])],tiebreak=[null,null];
  if(games.some(n=>n>99))return unknown;
  if(r[3]!=null){if(matchTiebreak||Math.abs(games[0]-games[1])!==1)return unknown;tiebreak[games[0]<games[1]?0:1]=Number(r[3]);}
  sets.push({games,tiebreak,matchTiebreak});
 }
 return {known:true,sets,status};
}
/** Map source winner-first scores to the *displayed* sides, including doubles. */
function scoreboardView(record,sides){
 const unknown={known:false,sets:[],winnerSide:null,status:null};
 if(!Array.isArray(sides)||sides.length!==2||!sides.every(s=>Array.isArray(s)&&s.length))return unknown;
 const parsed=parseTennisScore(record?.score);if(!parsed.known)return unknown;
 const winners=Array.isArray(record?.winnerIds)&&record.winnerIds.length?record.winnerIds:typeof record?.winnerId==='string'?[record.winnerId]:[];
 const winnerSide=sides.findIndex(s=>s.length===winners.length&&s.every(id=>winners.includes(id)));
 // Winner identity and score direction are mandatory; reversing names alone is unsafe.
 if(winnerSide<0||record.scoreOrder!=='winner-first')return unknown;
 const flip=winnerSide===1;
 return {known:true,winnerSide,status:parsed.status,sets:parsed.sets.map(s=>({...s,games:flip?[...s.games].reverse():[...s.games],tiebreak:flip?[...s.tiebreak].reverse():[...s.tiebreak]}))};
}
function watchOptions(match,region='CN',tournament=null){
 const own=match?.watchLinks||[], inherited=tournament&&tournament.id===match?.tournamentId?(tournament.watchLinks||[]):[];
 const date=match?.localDate||(match?.startAt?day(match.startAt,tournament?.timeZone||BJ):null),seen=new Set();
 return [...own,...inherited].filter(l=>{
  if(!safeURL(l.url)||l.kind==='directory'||/tv-schedule/.test(l.url)||/目录|转播清单/.test(l.label||'')||!(l.region==='ALL'||l.region===region))return false;
  const inheritedScope=!date&&inherited.includes(l)&&tournament?.id===match?.tournamentId&&validDate(tournament?.startDate)&&validDate(tournament?.endDate);const from=date||(inheritedScope?tournament.startDate:null),through=date||(inheritedScope?tournament.endDate:null);if(l.validFrom&&(!from||from<l.validFrom)||l.validThrough&&(!through||through>l.validThrough))return false;
  const key=(l.providerId||l.label)+'|'+l.region;if(seen.has(key))return false;seen.add(key);return true;
 });
}
function interestTier(player){return player?.followed?(player.favorite||player.followTier==='favorite'?'favorite':'following'):'none';}
function setInterest(player,tier){if(!['favorite','following','none'].includes(tier))throw new Error('关注类型无效');return {...player,followed:tier!=='none',favorite:tier==='favorite',followTier:tier};}
function isRetired(player){return player?.careerStatus==='retired';}
function nicknameList(player){return (player?.nicknames||[]).filter(n=>n&&typeof n.label==='string'&&n.label.trim()&&safeURL(n.sourceUrl)&&validInstant(n.verifiedAt));}

function brief(d,date){const p=d.players;const out=[`# 场边 · ${date} 网球简报`,``,d.meta.mode==='demo'?'【交互演示】以下球员、对阵、比分和票务节点均为虚构，不可用于真实观赛或购票。':'来源与核验时间见网站；实际赛程以赛事官方最新公布为准。',`北京时间优先 · 来源核验 ${d.meta.dataVerifiedAt||d.meta.updatedAt} · 手动更新（未启用定时同步）`,``, '## 昨日赛果'];const past=d.matches.filter(m=>matchDate(m)===addDays(date,-1)&&m.status==='finished');out.push(...(past.length?past.map(m=>`- ${matchName(m,d)}：${m.score||'比分待补充'}`):['暂无已收录赛果，不等于没有比赛。']));out.push('','## 关注球员与今日精选');let ms=recommend(d,date);out.push(...(ms.length?ms.map(m=>`- ${timeLabel(m)} · ${matchName(m,d)}${followed(m,d)?' [重点关注]':''}${m.editorPick?' [精选]':''}\n  ${m.reason||'推荐依据待补充'}`):['暂无已核验赛程，请查看官方赛程入口。']));out.push('','## 票务关键日期');let ts=d.tickets.filter(t=>t.opensAt&&day(t.opensAt)===date&&t.kind!=='session');out.push(...(ts.length?ts.map(t=>`- ${clock(t.opensAt)} ${t.title}。核对官方说明，不代表仍有余票。`):['暂无已收录的当日票务节点。']));out.push('','此文件仅为简报预览，未向微信或其他渠道发送。');return out.join('\n');}
function validate(d){const e=[];if(!d||typeof d!=='object'||Array.isArray(d))return['根对象必须是 JSON 对象'];if(!d.meta||d.meta.schemaVersion!==1)e.push('meta.schemaVersion 必须为 1');if(!['demo','reviewed'].includes(d.meta?.mode))e.push('meta.mode 必须为 demo 或 reviewed');if(!Number.isInteger(d.meta?.revision)||d.meta.revision<1)e.push('revision 必须是正整数');if(!validDate(d.meta?.demoDate))e.push('demoDate 必须是 YYYY-MM-DD');if(!validInstant(d.meta?.updatedAt))e.push('updatedAt 必须含时区');const cols=['players','tournaments','matches','tickets','activities','articles','legends','officialSources'];for(const c of cols)if(!Array.isArray(d[c]))e.push(`${c} 必须是数组`);if(e.length)return e;
 for(const c of cols){const ids=new Set();for(const x of d[c]){if(!x||typeof x!=='object'||Array.isArray(x)){e.push(`${c} 条目必须是对象`);continue;}if(typeof x.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(x.id))e.push(`${c}: id 只能包含字母数字下划线连字符`);if(ids.has(x.id))e.push(`${c}: 重复 id ${x.id}`);ids.add(x.id);}}
 if(e.length)return e;
 const ps=new Set(d.players.map(x=>x.id)),ts=new Set(d.tournaments.map(x=>x.id));for(const p of d.players){if(typeof p.name!=='string'||!p.name.trim())e.push(`${p.id}: 缺少球员名`);if(typeof p.followed!=='boolean')e.push(`${p.id}: followed 必须为布尔值`);if(p.rank!=null&&(!Number.isInteger(p.rank)||p.rank<1))e.push(`${p.id}: 排名须为正整数或 null`);if(p.points!=null&&(!Number.isFinite(p.points)||p.points<0))e.push(`${p.id}: 积分须为非负数或 null`);if(!['ATP','WTA'].includes(p.tour))e.push(`${p.id}: 球员排名体系无效`);}
 for(const t of d.tournaments){if(!validDate(t.startDate)||!validDate(t.endDate)||t.endDate<t.startDate)e.push(`${t.id}: 赛事日期无效`);if(!validZone(t.timeZone))e.push(`${t.id}: IANA 时区无效`);if(!t.name)e.push(`${t.id}: 缺少赛事名称`);if(!['ATP','WTA','CHALLENGER','ITF','TEAM','SLAM'].includes(t.tour))e.push(`${t.id}: 赛事体系无效`);}
 for(const m of d.matches){if(!ts.has(m.tournamentId))e.push(`${m.id}: 引用的赛事不存在`);if(!Array.isArray(m.sides)||m.sides.length!==2||!m.sides.every(s=>Array.isArray(s)&&s.length>0&&s.length<=2&&s.every(id=>ps.has(id))))e.push(`${m.id}: 必须有两个有效参赛方`);if(m.startAt!=null&&!validInstant(m.startAt))e.push(`${m.id}: 开赛时间必须为带时区 ISO 8601`);if(m.localDate&&!validDate(m.localDate))e.push(`${m.id}: 当地日期无效`);if(m.confirmedBeijingDate&&!validDate(m.confirmedBeijingDate))e.push(`${m.id}: 北京日期无效`);if(!['scheduled','finished','suspended','withdrawn','cancelled','rescheduled'].includes(m.status))e.push(`${m.id}: 状态无效`);if(!['exact','notBefore','following','dateOnly'].includes(m.timeKind))e.push(`${m.id}: 时间类型无效`);if(['following','dateOnly'].includes(m.timeKind)&&m.startAt)e.push(`${m.id}: 待定时刻不可伪造 startAt`);if(m.startAt&&m.localDate&&day(m.startAt,d.tournaments.find(t=>t.id===m.tournamentId)?.timeZone)!==m.localDate)e.push(`${m.id}: 当地日期与开赛时刻不一致`);if(m.startAt&&m.confirmedBeijingDate&&day(m.startAt)!==m.confirmedBeijingDate)e.push(`${m.id}: 北京日期与开赛时刻不一致`);}
 for(const t of d.tickets){if(!ts.has(t.tournamentId))e.push(`${t.id}: 票务赛事不存在`);if(t.opensAt&&!validInstant(t.opensAt))e.push(`${t.id}: 开票时间需包含时区`);if(t.localDate&&!validDate(t.localDate))e.push(`${t.id}: 票务当地日期无效`);}
 for(const a of d.activities){if(!ts.has(a.tournamentId)||!ps.has(a.playerId))e.push(`${a.id}: 活动关联对象不存在`);if(a.startsAt&&!validInstant(a.startsAt))e.push(`${a.id}: 活动时刻无效`);}
 const walk=(o,path)=>{if(!o||typeof o!=='object')return;for(const[k,v]of Object.entries(o)){if((k==='url'||k.endsWith('Url'))&&v!=null&&v!==''&&!safeURL(v))e.push(`${path}.${k}: 只允许 http/https 链接`);if(typeof v==='string'&&v.length>30000)e.push(`${path}.${k}: 字段过长`);if(typeof v==='object')walk(v,`${path}.${k}`);}};walk(d,'data');
 for(const a of d.articles){if(typeof a.title!=='string'||!['classic','knowledge'].includes(a.type))e.push(`${a.id}: 内容标题或类型无效`);}
 for(const s of d.officialSources){if(typeof s.name!=='string'||!safeURL(s.url))e.push(`${s.id}: 官方来源必须有名称和有效链接`);}
 for(const p of d.players){if(p.followTier!=null&&!['favorite','following','none'].includes(p.followTier))e.push(`${p.id}: 关注类型无效`);if(p.favorite===true&&!p.followed)e.push(`${p.id}: 喜欢的球员必须在关注名单`);if(isRetired(p)&&(p.rank!=null||p.points!=null))e.push(`${p.id}: 退役球员不能有当前排名积分`);if(p.nicknames!=null&&(!Array.isArray(p.nicknames)||nicknameList(p).length!==p.nicknames.length))e.push(`${p.id}: 昵称需要来源与核验时间`);}
 if(d.meta.mode==='reviewed'){for(const c of ['players','tournaments','matches','tickets','activities'])for(const x of d[c])if(x.demo)e.push(`${c}.${x.id}: 发布模式不能包含演示条目`);for(const c of ['matches','tickets','activities'])for(const x of d[c])if(!x.sourceUrl||!validInstant(x.verifiedAt))e.push(`${c}.${x.id}: 发布内容需来源与核验时间`);}

 for(const m of d.matches){if(m.h2h&&!h2hView(m).known)e.push(`${m.id}: H2H 需有效来源、时间、非负整数胜场和匹配的球员方向`);if(m.h2h?.meetings!=null&&!Array.isArray(m.h2h.meetings))e.push(`${m.id}: 交手明细须为数组`);else for(const r of m.h2h?.meetings||[]){if(!r||!Number.isInteger(r.year)||!ps.has(r.winnerId)||!m.h2h.playerIds?.includes(r.winnerId))e.push(`${m.id}: 交手明细无效`);}}
 for(const p of d.players){if(p.prospect!=null&&typeof p.prospect!=='boolean')e.push(`${p.id}: prospect 必须是布尔值`);if(p.tournamentHistory!=null&&!Array.isArray(p.tournamentHistory))e.push(`${p.id}: 赛事履历须为数组`);else for(const h of p.tournamentHistory||[]){if(!h||!ts.has(h.tournamentId)||h.appearanceOrdinal!=null&&(!Number.isInteger(h.appearanceOrdinal)||h.appearanceOrdinal<1))e.push(`${p.id}: 赛事参赛次数无效`);if(h&&(h.appearanceOrdinal!=null||h.bestRound)&&(!safeURL(h.sourceUrl)||!validInstant(h.verifiedAt)))e.push(`${p.id}: 赛事履历缺来源或核验时间`);}if(p.styleProfile&&(!Array.isArray(p.styleProfile.tags)||p.styleProfile.kind!=='editorial'||!safeURL(p.styleProfile.sourceUrl)||!validInstant(p.styleProfile.verifiedAt)))e.push(`${p.id}: 球风需编辑标注和来源`);}

 for(const m of d.matches){
  if(m.scoreOrder&&m.score&&(!parseTennisScore(m.score).known||!scoreboardView(m,m.sides).known))e.push(`${m.id}: 比分语法、胜者或比分方向无效`);
  for(const r of Array.isArray(m.h2h?.meetings)?m.h2h.meetings:[]){
   if(r?.scoreOrder&&!scoreboardView(r,m.sides).known)e.push(`${m.id}: 历史逐盘比分与胜者无法对应`);
  }
 }
 return e;}
return{BJ,validDate,validInstant,validZone,parts,day,clock,addDays,matchDate,timeLabel,safeURL,followed,matchName,ticketContext,sortMatches,recommend,h2hView,matchHistoryView,completedSetWins,countryName,parseTennisScore,scoreboardView,watchOptions,interestTier,setInterest,isRetired,nicknameList,brief,validate};});
