/* Transport-independent publication checks. Pure functions shared by browser and jobs. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./core.js'):root.CourtCore,typeof module==='object'&&module.exports?require('./domain-v06.js'):root.CourtV6);if(typeof module==='object'&&module.exports)module.exports=api;else root.CourtRuntime=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C,V){
'use strict';
function reviewCoverage(d,date,tour='ALL',now=Date.now()){
 const ids=d.meta.coverageTrackedTournamentIds||[];
 return d.tournaments.filter(t=>ids.includes(t.id)&&t.startDate<=date&&t.endDate>=date&&(tour==='ALL'||t.tour===tour)).map(t=>{
  const row=(d.meta.scheduleCoverage||[]).find(x=>x.tournamentId===t.id&&x.date===date);
  const actual=d.matches.filter(m=>m.tournamentId===t.id&&C.matchDate(m)===date).map(m=>m.id);
  const expected=row?.matchIds||[];
  const complete=!!row&&row.sourceDate===date&&C.validInstant(row.checkedAt)&&!!C.safeURL(row.sourceUrl)&&row.expectedMatches===expected.length&&new Set(expected).size===expected.length&&actual.length===expected.length&&expected.every(id=>actual.includes(id));
  const stale=complete&&date===C.day(new Date(now).toISOString())&&(now-Date.parse(row.checkedAt)>90*60000||Date.parse(row.checkedAt)>now+300000);
  return {tournamentId:t.id,complete,stale,checkedAt:row?.checkedAt||null,sourceUrl:row?.sourceUrl||t.drawUrl||t.sourceUrl};
 });
}

function validate(d){
 const errors=C.validate(d);if(errors.length)return errors;
 if(d.rankings){if(d.rankings.length!==2||new Set(d.rankings.map(t=>t.tour)).size!==2)errors.push('必须同时提供ATP和WTA前100榜单');for(const t of d.rankings){errors.push(...V.rankingErrors(t,d.players));if(!C.validDate(t.rankingDate))errors.push('榜单日期无效');if(!C.safeURL(t.sourceUrl))errors.push('榜单缺少有效来源');for(let i=0;i<t.rows.length;i++){const row=t.rows[i],p=d.players.find(x=>x.id===row.playerId);if(row.rank!==i+1)errors.push('榜单必须按1至100连续排序');if(i&&row.points>t.rows[i-1].points)errors.push('积分顺序与排名矛盾');if(p&&(p.rank!==row.rank||p.points!==row.points))errors.push('球员卡与排名表数据不一致');if(p&&p.rankDate!==t.rankingDate)errors.push('同一巡回赛球员卡与榜单日期不一致');}}
  /* ATP and WTA publications are independently dated; each player issue matches its tour. */}
 const seen=new Set();for(const m of d.matches){
  const all=m.sides.flat();if(new Set(all).size!==all.length||m.sides[0].length!==m.sides[1].length)errors.push(m.id+': 参赛方重复或人数不一致');
  const tr=d.tournaments.find(t=>t.id===m.tournamentId);if(m.localDate&&tr&&(m.localDate<tr.startDate||m.localDate>C.addDays(tr.endDate,1)))errors.push(m.id+': 比赛日期超出本届赛事');
  const key=[m.tournamentId,m.discipline,m.round,m.sides.map(s=>[...s].sort().join('+')).sort().join('|')].join('/');if(seen.has(key))errors.push(m.id+': 同一轮对阵重复');seen.add(key);
  if(m.status==='finished'){
   if(!Array.isArray(m.winnerIds)||!m.sides.some(s=>s.length===m.winnerIds.length&&s.every(id=>m.winnerIds.includes(id))))errors.push(m.id+': 胜者必须是一方完整阵容');
   if(!m.score||!C.scoreboardView(m,m.sides).known)errors.push(m.id+': 完赛比分或方向无效');
   const b=C.scoreboardView(m,m.sides);if(b.known&&!b.special&&!/RET|WALKOVER|W[.\/]?O\.?|ABANDON|DEF/i.test(m.score||'')){const wins=[0,0];for(const s of b.sets){if(s.games[0]>s.games[1])wins[0]++;else if(s.games[1]>s.games[0])wins[1]++;}const side=m.sides.findIndex(s=>s.every(id=>m.winnerIds?.includes(id)));if(side>=0&&wins[side]<=wins[1-side])errors.push(m.id+': 胜者与逐盘比分矛盾');}
  }
 }
 if(d.draws)for(const draw of d.draws)errors.push(...V.drawErrors(draw,d));return [...new Set(errors)];
}
function publicationNewer(next,old){if(validate(next).length)return false;return next.meta.revision>old.meta.revision;}
function sourceState(job,now=Date.now()){
 if(!job)return {state:'manual',label:'已核验资料'};
 if(job.status==='error')return {state:'error',label:'更新暂缓'};
 if(job.status==='blocked'||job.status==='not-configured')return {state:'manual',label:'已核验资料'};
 const last=Date.parse(job.lastSuccessAt||''),ttl=(job.intervalMinutes||30)*60000*2;
 if(job.status==='ok'&&Number.isFinite(last)&&last<=now+300000&&now-last<=Math.max(ttl,3600000))return {state:'fresh',label:'已更新'};
 return {state:'stale',label:'更新延迟'};
}
function publicData(input){const d=JSON.parse(JSON.stringify(input));
 // Public build does not expose internal audit narratives, source locks or private notes.
 for(const k of ['audit','preferenceNotes','operatorNotes','reviewNotes'])delete d.meta[k];
 const walk=o=>{if(!o||typeof o!=='object')return;for(const k of Object.keys(o)){if(k.startsWith('_')||['operatorNotes','privateNotes','verificationNote'].includes(k)){delete o[k];continue;}walk(o[k]);}};walk(d);return d;
}
function sameOriginURL(relative,base){const u=new URL(relative,base),b=new URL(base);if(u.origin!==b.origin||!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('数据地址必须与网站同源');return u.href;}
function publishedDataURL(relative,base,settings={}){
 const b=new URL(base);
 const brand=b.protocol==='https:'&&(b.hostname==='courtside-tennis.pages.dev'||b.hostname.endsWith('.courtside-tennis.pages.dev'));
 if(settings.mode==='static'&&settings.publicDataOrigin==='github-pages'&&brand){
  if(!['data/content.json','data/status.json'].includes(relative))throw new Error('未经允许的数据文件');
  return new URL(relative,'https://styleke.github.io/courtside/').href;
 }
 return sameOriginURL(relative,base);
}
return {validate,publicationNewer,sourceState,publicData,sameOriginURL,reviewCoverage,publishedDataURL};
});
