/** One bounded editorial migration from the exact raw documents reviewed in this release. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {parseOfficialDay,applyOfficialDays,officialSinglesSlots,attachOfficialSlots} from '../adapters/official-day.mjs';
import Runtime from '../public/runtime.js';
const reviewId='2026-10-11-next-day-and-results';const file='data/content.json';const original=JSON.parse(await readFile(file,'utf8'));
if(original.meta.appliedReviews?.includes(reviewId)){console.log('Editorial review already applied');process.exit(0);}
const [dayDir,drawDir]=process.argv.slice(2);if(!dayDir||!drawDir)throw Error('Exact reviewed evidence folders required');
const defs=[['shanghai-schedule.txt','2e69f8ffff746f32b2ce7d03bafea181f5d8d6fe1ad453b330a0d5633701a82b','2026-10-11','https://en.rolexshanghaimasters.com/en/scores/schedule'],['shanghai-next.txt','a480128b0dd2531e3a1bd61bc03453a5f597b94240eb73b145de0ce8eaffb800','2026-10-12','https://en.rolexshanghaimasters.com/en/scores/schedule?dayToDisplay=8']];
const docs=[];for(const [name,sha,date,url]of defs){const b=await readFile(dayDir+'/'+name);if(createHash('sha256').update(b).digest('hex')!==sha)throw Error('Unreviewed document '+name);docs.push(parseOfficialDay(b.toString('utf8'),{tournamentId:'shanghai-2026',url,expectedDate:date}));}
const drawBytes=await readFile(drawDir+'/shanghai-draw.txt');if(createHash('sha256').update(drawBytes).digest('hex')!=='19b3585b5067ce968b85dd0769d8e4ddc9115ff1657a0aaf832345f37dfb53fc')throw Error('Unreviewed draw document');
const {data,report}=applyOfficialDays(original,docs,{checkedAt:'2026-10-11T09:24:26.693Z',reviewId});
const next=attachOfficialSlots(data,officialSinglesSlots(drawBytes.toString('utf8')),{checkedAt:'2026-10-11T09:31:03.998Z',sourceUrl:'https://en.rolexshanghaimasters.com/en/scores/draw'});
const z=next.players.find(p=>p.id==='yi-zhou');if(z&&!z.aliases.includes('Zhou Yi'))z.aliases.push('Zhou Yi');
for(const [id,country,url]of [['alina-charaeva','ARM','https://www.wtatennis.com/players/329198/name'],['polina-kudermetova','UZB','https://www.wtatennis.com/players/328897/polina-kudermetova']]){const p=next.players.find(p=>p.id===id);if(!p)throw Error('Country review identity missing');p.country=country;p.countrySourceUrl=url;p.countryCheckedAt='2026-10-11T09:40:50Z';}
next.meta.appliedReviews=[...(next.meta.appliedReviews||[]),reviewId];next.meta.revision=original.meta.revision+1;next.meta.updatedAt=new Date().toISOString();next.meta.updateScope='上海10月11日明确完赛结果、12日官方安排与签位；国家标签纠错，不更新排名';
next.meta.coverage.matchDateEnd='2026-10-12';
const errors=Runtime.validate(next);if(errors.length)throw Error(errors.join('; '));
for(const k of ['rankings','tickets','activities'])if(JSON.stringify(next[k])!==JSON.stringify(original[k]))throw Error('Unexpected '+k+' change');
for(const p of next.players){const old=original.players.find(o=>o.id===p.id);for(const k of ['name','enName','rank','rankDate','rankCheckedAt','points','pointsCheckedAt','dateOfBirth','followed','favorite','prospect'])if(p[k]!==old[k])throw Error('Protected player field '+p.id+'/'+k);}
await writeFile(file,JSON.stringify(next,null,2)+'\n');await mkdir('phase2/day-release',{recursive:true});await writeFile('phase2/day-release/editorial.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
