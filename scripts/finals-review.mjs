/** Bounded editorial correction. No collector or automatic-source permission is enabled. */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import C from '../public/core.js';
import R from '../public/runtime.js';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const REVIEW='2026-10-11-finals-review';
export const DAY='2026-10-11';
export const CHECKED='2026-10-11T07:06:47Z';
const BJ='beijing-wta-2026',SH='shanghai-2026';
const news='https://www.chinaopen.com/cn/contents/281/1659.html';
const draw='https://www.wtatennis.com/tournaments/china-open/draws';
const sh='https://en.rolexshanghaimasters.com/en/scores/schedule';
const results='https://en.rolexshanghaimasters.com/en/scores/results';
const migu='https://weibo.com/2/detail/5352815350516449';
export function reviewCoverage(d,date,tour='ALL',now=Date.now()){
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
export function applyReview(input){
 const d=structuredClone(input);if(d.meta.appliedReviews?.includes(REVIEW))return d;
 const lookup=id=>{const m=d.matches.find(x=>x.id===id);if(!m)throw Error('Missing match '+id);return m;};
 const setResult=(id,winner,score,url)=>{const m=lookup(id);Object.assign(m,{status:'finished',winnerIds:winner,score,scoreOrder:'winner-first',resultSourceUrl:url,resultVerifiedAt:CHECKED,verifiedAt:CHECKED,reasonShort:'',resultSummary:'已晋级决赛'});m.fieldSources??={};m.fieldSources.results={primaryUrl:url,checkedAt:CHECKED,method:'editorial-source-review'};};
 setResult('bj-draw-sf-0',['qinwen-zheng'],'7-5 6-2',news);
 setResult('bj-draw-sf-1',['mirra-andreeva'],'6-2 6-2',news);
 setResult('bj-1010-doubles-1',['zhang-shuai','katerina-siniakova'],'6-4 6-2',news);
 setResult('bj-1010-doubles-2',['gabriela-dabrowski','luisa-stefani'],'6-4 3-6 [10-7]',draw);
 for(const id of ['bj-draw-sf-0','bj-draw-sf-1']){
  const h=lookup(id).h2h;if(!h||h.wins.join(',')!=='1,0')throw Error('Unexpected semifinal H2H baseline');h.asOf='本场赛前';
 }
 const add=(id,tournamentId,sides,clock,kind,court,order,round,score=null,winnerIds=[])=>{
  if(d.matches.some(m=>m.id===id))throw Error('Conflicting existing match '+id);
  const source=tournamentId===BJ?news:sh;
  const m={id,tournamentId,sides,startAt:clock?`${DAY}T${clock}:00+08:00`:null,localDate:DAY,confirmedBeijingDate:DAY,timeKind:kind,court,courtOrder:order,session:null,round:round==='F'?'决赛':'第三轮',roundCode:round,discipline:sides[0].length===1?'单打':'双打',scheduleConfirmed:true,status:score?'finished':'scheduled',score,winnerIds,scoreOrder:'winner-first',editorPick:tournamentId===BJ,ruleCandidate:false,reasonShort:'',watchLinks:[],sourceUrl:source,scheduleSourceUrl:source,scheduleVerifiedAt:CHECKED,verifiedAt:CHECKED,demo:false,fieldSources:{schedule:{primaryUrl:source,checkedAt:CHECKED,sourceDate:DAY,method:'editorial-source-review'}}};
  if(score){m.resultSourceUrl=results;m.resultVerifiedAt=CHECKED;m.fieldSources.results={primaryUrl:results,checkedAt:CHECKED,method:'editorial-source-review'};}
  d.matches.push(m);return m;
 };
 const sf=add('bj-1011-singles-final',BJ,[['qinwen-zheng'],['mirra-andreeva']],'19:30','notBefore','首创钻石球场',2,'F');
 sf.session='晚场';sf.reasonShort='郑钦文与安德烈娃争夺女单冠军';
 sf.h2h={playerIds:['qinwen-zheng','mirra-andreeva'],wins:[1,0],asOf:'本场赛前',sourceUrl:news,verifiedAt:CHECKED,meetings:[{matchId:'beijing-2024-qf-zheng-andreeva',tournamentId:'beijing-wta-2024',event:'中国网球公开赛',eventName:'中国网球公开赛',eventEn:'China Open',eventEnName:'China Open',year:2024,date:'2024-10-04',round:'四分之一决赛',roundCode:'QF',winnerId:'qinwen-zheng',score:'5-7 6-0 6-4',scoreOrder:'winner-first',sourceUrl:'https://www.wtatennis.com/news/4139983/zheng-reels-in-andreeva-in-beijing-to-make-first-wta-1000-semifinal'}]};
 const df=add('bj-1011-doubles-final',BJ,[['zhang-shuai','katerina-siniakova'],['gabriela-dabrowski','luisa-stefani']],'16:30','exact','首创钻石球场',1,'F');
 df.reasonShort='女双头号种子与二号种子争冠';
 const bj=d.tournaments.find(t=>t.id===BJ);for(const w of bj.watchLinks||[])if(w.providerId==='migu'){w.sourceUrl=migu;w.verifiedAt=CHECKED;w.linkLabel='直播与回放';}
 const singles=d.draws.find(x=>x.id===BJ+'-singles'),final=singles.nodes.find(n=>n.id==='bj-F-0');delete final.kind;final.matchId=sf.id;singles.finalStageVerifiedAt=CHECKED;singles.finalStageSourceUrl=news;
 const did=BJ+'-doubles';if(d.draws.some(x=>x.id===did))throw Error('Conflicting doubles draw');
 d.draws.push({id:did,tournamentId:BJ,discipline:'双打',sourceUrl:draw,verifiedAt:CHECKED,rounds:['SF','F'],completeFromRound:'SF',coverageNote:'半决赛与决赛',nodes:[{id:'bj-d-SF-0',round:'SF',position:0,matchId:'bj-1010-doubles-1',previousIds:[]},{id:'bj-d-SF-1',round:'SF',position:1,matchId:'bj-1010-doubles-2',previousIds:[]},{id:'bj-d-F-0',round:'F',position:0,matchId:df.id,previousIds:['bj-d-SF-0','bj-d-SF-1']}]});
 const rows=[
 ['gea',['arthur-gea'],['ben-shelton'],'12:00','exact','中央球场',1,'7-6(5) 7-6(3)'],
 ['hurkacz',['hubert-hurkacz'],['yi-zhou'],null,'following','中央球场',2],
 ['zverev',['alexander-zverev'],['quentin-halys'],'18:00','notBefore','中央球场',3],
 ['davidovich',['alejandro-davidovich-fokina'],['frances-tiafoe'],null,'following','中央球场',4],
 ['khachanov',['karen-khachanov'],['adrian-mannarino'],'12:00','exact','二号看台球场',1,'6-2 6-4'],
 ['deminaur',['alex-de-minaur'],['rei-sakamoto'],null,'following','二号看台球场',2],
 ['cerundolo',['francisco-cerundolo'],['jakub-mensik'],null,'following','二号看台球场',3],
 ['bublik',['alexander-bublik'],['brandon-nakashima'],null,'following','二号看台球场',4],
 ['polmans',['marc-polmans','jan-zielinski'],['fumin-jiang','tianhui-zhang'],'12:00','exact','三号球场',1,'7-6(3) 6-2'],
 ['darderi',['luciano-darderi','tomas-martin-etcheverry'],['julian-cash','lloyd-glasspool'],null,'following','三号球场',2],
 ['bolelli',['simone-bolelli','andrea-vavassori'],['austin-krajicek','nikola-mektic'],null,'following','三号球场',3],
 ['miedler',['lucas-miedler','neil-oberleitner'],['robert-cash','alexander-erler'],'12:00','exact','四号球场',1,'7-6(8) 7-5'],
 ['arribage',['theo-arribage','albano-olivetti'],['nuno-borges','sadio-doumbia'],null,'following','四号球场',2]
 ];
 const names={'marc-polmans':'Marc Polmans','jan-zielinski':'Jan Zielinski','fumin-jiang':'Fumin Jiang','tianhui-zhang':'Tianhui Zhang','julian-cash':'Julian Cash','lloyd-glasspool':'Lloyd Glasspool','simone-bolelli':'Simone Bolelli','andrea-vavassori':'Andrea Vavassori','austin-krajicek':'Austin Krajicek','nikola-mektic':'Nikola Mektic','lucas-miedler':'Lucas Miedler','neil-oberleitner':'Neil Oberleitner','robert-cash':'Robert Cash','alexander-erler':'Alexander Erler','theo-arribage':'Theo Arribage','albano-olivetti':'Albano Olivetti','sadio-doumbia':'Sadio Doumbia'};
 for(const [id,enName] of Object.entries(names))if(!d.players.some(p=>p.id===id))d.players.push({id,name:enName,enName,aliases:[],tour:'ATP',country:null,rank:null,points:null,followed:false,prospect:false,demo:false,sourceUrl:sh,verifiedAt:CHECKED});
 for(const [slug,a,b,clock,kind,court,order,score] of rows){
  const m=add('sh-1011-'+slug,SH,[a,b],clock,kind,court,order,'R32',score||null,score?a:[]);
  if(['hurkacz','zverev'].includes(slug)){m.editorPick=true;m.reasonShort=slug==='hurkacz'?'周意与胡尔卡奇争夺16强席位':'头号种子兹维列夫出战第三轮';}
  if(a.length===1){const ds=d.draws.find(x=>x.id===SH+'-singles');const n=ds.nodes.find(n=>n.round==='R32'&&!n.matchId&&JSON.stringify(CanonicalSides(n,ds,d))===JSON.stringify([...a,...b].sort()));if(!n)throw Error('Cannot associate Shanghai bracket '+slug);delete n.kind;n.matchId=m.id;}
 }
 function CanonicalSides(n,ds,d){return(n.previousIds||[]).flatMap(id=>{const p=ds.nodes.find(z=>z.id===id);return d.matches.find(m=>m.id===p?.matchId)?.winnerIds||[];}).sort();}
 const st=d.tournaments.find(t=>t.id===SH);st.confirmedPlayers=[...new Set([...st.confirmedPlayers,...rows.flatMap(r=>[...r[1],...r[2]])])];
 const coverage=[...['beijing-wta-2026','shanghai-2026'].map(id=>{const matchIds=d.matches.filter(m=>m.tournamentId===id&&C.matchDate(m)===DAY).map(m=>m.id);const expected=id===BJ?2:13;if(matchIds.length!==expected)throw Error('Wrong daily match count');return{tournamentId:id,date:DAY,sourceDate:DAY,expectedMatches:expected,matchIds,checkedAt:CHECKED,sourceUrl:id===BJ?news:sh,method:'editorial-source-review'};})];
 d.meta.scheduleCoverage=[...(d.meta.scheduleCoverage||[]).filter(c=>!(c.date===DAY&&[BJ,SH].includes(c.tournamentId))),...coverage];
 d.meta.coverageTrackedTournamentIds=[...new Set([...(d.meta.coverageTrackedTournamentIds||[]),BJ,SH])];
 d.meta.sourceChecks??={};for(const id of [BJ,SH])d.meta.sourceChecks[id]={...d.meta.sourceChecks[id],schedule:CHECKED,results:CHECKED};d.meta.sourceChecks[BJ].broadcasts=CHECKED;
 d.meta.revision++;d.meta.updatedAt=new Date().toISOString();d.meta.asOfDate=DAY;d.meta.contentPatchedAt=d.meta.updatedAt;
 d.meta.coverage.matchDateEnd=DAY;d.meta.coverage.todayAnnouncedMatches=15;
 d.meta.updateScope='中网决赛日安排、半决赛赛果与晋级；上海10月11日赛程及已明确完赛结果';
 d.meta.appliedReviews=[...(d.meta.appliedReviews||[]),REVIEW];
 const errors=R.validate(d);if(errors.length)throw Error(errors.join('\n'));return d;
}
export function applyUI(runtime,app){
 if(!runtime.includes('function reviewCoverage(')){runtime=runtime.replace("'use strict';","'use strict';\n"+reviewCoverage.toString()+'\n');const old='return {validate,publicationNewer,sourceState,publicData,sameOriginURL};';if(!runtime.includes(old))throw Error('Unexpected runtime exports');runtime=runtime.replace(old,'return {validate,publicationNewer,sourceState,publicData,sameOriginURL,reviewCoverage};');}
 if(!app.includes('function dayCoverageNotice(')){
  const helper="function dayCoverageNotice(){const states=R.reviewCoverage(data,ui.date,ui.tour),pending=states.filter(s=>!s.complete||s.stale);return pending.length?'<div class=\"notice warn\" role=\"status\">'+pending.map(s=>e(t(s.tournamentId)?.name)+' · '+(s.complete?'赛程更新延迟':'当日赛程待更新')+' '+ext(s.sourceUrl,'查看官方安排','btn ghost small')).join('<br>')+'</div>':'';}\n";
  if(!app.includes('function today(){')||!app.includes('${filters()}${shown.map(matchCard)'))throw Error('Unexpected today template');
  app=app.replace('function today(){',helper+'function today(){').replace('${filters()}${shown.map(matchCard)','${filters()}${dayCoverageNotice()}${shown.map(matchCard)');
  app=app.replace("empty('暂无符合条件的比赛')","empty('暂无已核验的比赛','可切换筛选，或查看赛事官方安排')");
  const stamp='const checked=data.meta.refreshStatus?.scheduleLastCheckedAt,';
  if(!app.includes(stamp))throw Error('Unexpected update stamp');
  app=app.replace(stamp,"const dayChecks=(data.meta.scheduleCoverage||[]).filter(x=>x.date===ui.date).map(x=>x.checkedAt).filter(Boolean).sort(),checked=dayChecks[0]||data.meta.refreshStatus?.scheduleLastCheckedAt,");
 }
 return {runtime,app};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const file=path.join(root,'data/content.json'),before=JSON.parse(await readFile(file,'utf8'));
 const data=applyReview(before),ui=applyUI(await readFile(path.join(root,'public/runtime.js'),'utf8'),await readFile(path.join(root,'public/app.js'),'utf8'));
 if(JSON.stringify(before.rankings)!==JSON.stringify(data.rankings))throw Error('Rankings unexpectedly changed');
 await writeFile(file,JSON.stringify(data,null,2)+'\n');await writeFile(path.join(root,'public/runtime.js'),ui.runtime);await writeFile(path.join(root,'public/app.js'),ui.app);
 console.log(JSON.stringify({review:REVIEW,revision:data.meta.revision,coverage:reviewCoverage(data,DAY,'ALL',Date.parse(CHECKED)),automaticCollectionEnabled:false}));
}
