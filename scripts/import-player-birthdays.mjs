/** Bounded free Wikidata DOB import. No inferred DOB, stale numeric ages or sporting writes. */
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import Age from '../public/ages.js';import {isPlayerEntity} from './import-player-portraits.mjs';
import {assertFreeBuild} from './free-build-guard.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||'').replace(/[Đđ]/g,'dj').replace(/[Łł]/g,'l').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const titleOverrides={'ann-li':'Ann Li (tennis)','tommy-paul':'Tommy Paul (tennis)','nuno-borges':'Nuno Borges (tennis)','joao-fonseca':'João Fonseca (tennis)','james-duckworth':'James Duckworth (tennis)','luke-johnson':'Luke Johnson (tennis)','santiago-gonzalez':'Santiago González (tennis)','robert-galloway':'Robert Galloway (tennis)','francisco-cabral':'Francisco Cabral (tennis)','aleksandar-kovacevic':'Aleksandar Kovacevic (tennis)','zhang-shuai':'Zhang Shuai (tennis)','yunchaokete-bu':'Bu Yunchaokete','yue-yuan':'Yuan Yue','zhizhen-zhang':'Zhang Zhizhen','yi-zhou':'Zhou Yi (tennis)'};
const chunks=(xs,n)=>Array.from({length:Math.ceil(xs.length/n)},(_,i)=>xs.slice(i*n,(i+1)*n));
export function preciseBirth(entity,player,onDate=Age.today()){
 if(!isPlayerEntity(entity,player))return {ok:false,reason:'identity_mismatch'};
 if((entity.claims?.P570||[]).some(x=>x.rank!=='deprecated'))return {ok:false,reason:'death_statement_requires_review'};
 const claims=(entity.claims?.P569||[]).filter(c=>c.rank!=='deprecated');
 if(!claims.length)return {ok:false,reason:'birth_date_missing'};
 const valid=claims.map(c=>{const v=c.mainsnak?.datavalue?.value;const m=v?.time?.match(/^\+(\d{4}-\d{2}-\d{2})T00:00:00Z$/);return m&&v.precision===11&&!v.before&&!v.after&&!Object.keys(c.qualifiers||{}).length&&String(v.calendarmodel).endsWith('/Q1985727')&&Age.validDay(m[1])&&Age.years(m[1],onDate)!==null?{date:m[1],statementId:c.id,references:(c.references||[]).length}:null;});
 if(valid.some(x=>!x))return {ok:false,reason:'imprecise_or_qualified_birth_date'};
 if(new Set(valid.map(x=>x.date)).size!==1)return {ok:false,reason:'conflicting_birth_dates'};
 return {ok:true,date:valid[0].date,statementIds:valid.map(x=>x.statementId).filter(Boolean),referenced:valid.some(x=>x.references>0)};
}
async function request(host,params){
 const url='https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',maxlag:'5',...params});
 for(let n=0;n<3;n++){await sleep(550);const r=await fetch(url,{headers:{'User-Agent':'CourtsideDOB/1.0 (https://courtside-tennis.pages.dev/; limited public tennis biographies)','Accept':'application/json'},signal:AbortSignal.timeout(15000),redirect:'error'});
  if([429,503].includes(r.status)){const sec=Math.min(60,Math.max(5,Number(r.headers.get('retry-after'))||5));await r.body?.cancel();if(n<2){await sleep(sec*1000);continue;}throw Error('rate_limited');}
  if(!r.ok)throw Error('HTTP '+r.status);const text=await r.text();if(Buffer.byteLength(text)>12000000)throw Error('response_too_large');const d=JSON.parse(text);if(d.error?.code==='maxlag'&&n<2){await sleep(5000);continue;}if(d.error)throw Error(d.error.code);return d;
 }throw Error('request_failed');
}
export function applyBirthdays(data,report,now=new Date().toISOString()){
 const next=structuredClone(data);let changes=0;
 for(const row of report.records||[]){if(!row.ok)continue;const p=next.players.find(x=>x.id===row.playerId);if(!p||p.enName!==row.enName||!Age.validDay(row.dateOfBirth)||!/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+#P569$/.test(row.sourceUrl||''))throw Error('Invalid birth record');
  if(p.dateOfBirth&&p.dateOfBirth!==row.dateOfBirth)throw Error('Existing DOB conflicts for '+p.id);
  const update={dateOfBirth:row.dateOfBirth,birthPrecision:'day',birthSourceUrl:row.sourceUrl,birthCheckedAt:report.finishedAt,birthEntityRevision:row.entityRevision||null,birthVerification:'structured-source',birthStatementIds:row.statementIds||[]};
  if(p.dateOfBirth===update.dateOfBirth&&p.birthPrecision==='day'&&p.birthSourceUrl===update.birthSourceUrl)continue;
  Object.assign(p,update);changes++;
 }
 if(changes){next.meta.revision++;next.meta.updatedAt=now;next.meta.birthdatesUpdatedAt=now;next.meta.updateScope='球员出生日期资料；比赛、比分和排名未更新';}
 return {data:next,changes};
}
async function main(){
 await assertFreeBuild(root);
 const data=JSON.parse(await readFile(path.join(root,'data/content.json'),'utf8'));const manifest=JSON.parse(await readFile(path.join(root,'public/player-photos.json'),'utf8'));
 const players=data.players;if(players.length>300)throw Error('Bounded import limit exceeded');
 const mappings=new Map();for(const p of players){const x=manifest.photos[p.id];if(x?.playerId===p.id&&/^Q\d+$/.test(x.wikidataId||''))mappings.set(p.id,x.wikidataId);}
 const report={startedAt:new Date().toISOString(),provider:'Wikidata',license:'CC0',sourceTerms:'https://www.wikidata.org/wiki/Wikidata:Licensing',records:[],failures:[],productionSportingDataChanged:false};
 for(const batch of chunks(players.filter(p=>!mappings.has(p.id)),35)){
  try{const d=await request('en.wikipedia.org',{action:'query',prop:'pageprops',ppprop:'wikibase_item|disambiguation',redirects:'1',titles:batch.map(p=>titleOverrides[p.id]||p.enName).join('|')});const remap=new Map([...(d.query?.normalized||[]),...(d.query?.redirects||[])].map(r=>[r.from,r.to]));
   for(const p of batch){let title=titleOverrides[p.id]||p.enName;const seen=new Set();while(remap.has(title)&&!seen.has(title)){seen.add(title);title=remap.get(title);}const page=(d.query?.pages||[]).find(x=>norm(x.title)===norm(title));const qid=page?.pageprops?.wikibase_item;if(page&&!page.missing&&!Object.hasOwn(page.pageprops||{},'disambiguation')&&/^Q\d+$/.test(qid||''))mappings.set(p.id,qid);}
  }catch(e){report.failures.push({stage:'mapping',message:e.message});}
 }
 const entities={};
 for(const batch of chunks([...new Set(mappings.values())],35))try{const d=await request('www.wikidata.org',{action:'wbgetentities',ids:batch.join('|'),props:'info|labels|aliases|descriptions|claims',languages:'en|mul'});if(!d.entities)throw Error('missing_entities');Object.assign(entities,d.entities);}catch(e){report.failures.push({stage:'birthdays',message:e.message});}
 for(const p of players){const qid=mappings.get(p.id),entity=entities[qid],v=entity?preciseBirth(entity,p):{ok:false,reason:'no_verified_entity'};const row={playerId:p.id,enName:p.enName,ok:v.ok};
  if(v.ok){Object.assign(row,{dateOfBirth:v.date,sourceUrl:'https://www.wikidata.org/wiki/'+qid+'#P569',wikidataId:qid,entityRevision:entity.lastrevid||null,statementIds:v.statementIds,referenced:v.referenced});if(p.dateOfBirth&&p.dateOfBirth!==v.date){row.ok=false;row.reason='existing_dob_conflict';}}
  else row.reason=v.reason;report.records.push(row);
 }
 report.finishedAt=new Date().toISOString();report.summary={players:players.length,valid:report.records.filter(x=>x.ok).length,unresolved:report.records.filter(x=>!x.ok).length,followed:players.filter(x=>x.followed).map(p=>({id:p.id,dateOfBirth:report.records.find(x=>x.playerId===p.id&&x.ok)?.dateOfBirth||null})),atp100:report.records.filter(x=>x.ok&&data.rankings.find(t=>t.tour==='ATP')?.rows.some(r=>r.playerId===x.playerId)).length,wta100:report.records.filter(x=>x.ok&&data.rankings.find(t=>t.tour==='WTA')?.rows.some(r=>r.playerId===x.playerId)).length};
 await mkdir(path.join(root,'phase2/age'),{recursive:true});await writeFile(path.join(root,'phase2/age/birthdays.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,failures:report.failures,applied:false},null,2));
 if(report.summary.valid<200||report.summary.followed.some(x=>!x.dateOfBirth))throw Error('Core birthday coverage not ready');
 if(process.argv.includes('--apply')){const result=applyBirthdays(data,report);const R=(await import('../public/runtime.js')).default;const errors=R.validate(result.data);if(errors.length)throw Error(errors.join(';'));if(result.changes){const file=path.join(root,'data/content.json');await writeFile(file+'.tmp',JSON.stringify(result.data,null,2)+'\n');await rename(file+'.tmp',file);}console.log(JSON.stringify({applied:true,changes:result.changes,revision:result.data.meta.revision}));}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
