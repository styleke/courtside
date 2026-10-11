/** One bounded editorial import. No network requests and no collector permissions. */
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import path from 'node:path';
import {parseOfficialDay,applyOfficialDays} from '../adapters/official-day.mjs';
import Runtime from '../public/runtime.js';import Core from '../public/core.js';
const [evidenceDir,candidateDir]=process.argv.slice(2);if(!evidenceDir||!candidateDir)throw Error('Usage: node scripts/apply-profile-review.mjs EVIDENCE_DIR CANDIDATE_DIR');
const readJSON=async f=>JSON.parse(await readFile(f,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const review=await readJSON('config/profile-editorial.json'),before=await readJSON('data/content.json');
if(before.meta.appliedReviews?.includes(review.reviewId)){console.log('Profile review already applied; no data rewritten.');process.exit(0);}
assert.equal(review.schemaVersion,1);assert.equal(review.reviewId,'2026-10-11-player-completeness');
assert.ok(review.names.length<=32&&review.portraits.length<=32&&review.rankings.rows.length<=40);
for(const source of review.sourceEvidence){assert.match(source.file,/^[a-z0-9-]+\.(html|json)$/);assert.equal(hash(await readFile(path.join(evidenceDir,source.file))),source.sha256,source.file+' source hash changed');}
const doc=parseOfficialDay(await readFile(path.join(evidenceDir,review.officialDay.file),'utf8'),{tournamentId:'shanghai-2026',url:review.officialDay.url,expectedDate:'2026-10-11'});
const applied=applyOfficialDays(before,[doc],{checkedAt:review.officialDay.checkedAt,reviewId:review.reviewId}),data=applied.data;
const player=id=>{const p=data.players.find(p=>p.id===id);assert.ok(p,'Unknown player '+id);return p;};
for(const n of review.names){const p=player(n.playerId);assert.equal(p.enName,n.expectedEnName);assert.ok(!/[\u3400-\u9fff]/.test(p.name),'Do not replace an existing Chinese name');assert.match(n.name,/[\u3400-\u9fff]/);assert.ok(Core.safeURL(n.sourceUrl)&&Core.validInstant(n.checkedAt));p.name=n.name;p.nameSourceUrl=n.sourceUrl;p.nameCheckedAt=n.checkedAt;p.aliases=[...new Set([...(p.aliases||[]),p.enName])];}
for(const a of review.identityAliases){const p=player(a.playerId);assert.ok(Core.safeURL(a.sourceUrl));p.aliases=[...new Set([...(p.aliases||[]),a.name])];p.aliasSources=[...(p.aliasSources||[]),{name:a.name,sourceUrl:a.sourceUrl,checkedAt:review.officialDay.checkedAt}];}
assert.equal(review.rankings.basis,'observed-snapshot');assert.equal(review.rankings.rankingDate,null);
for(const r of review.rankings.rows){const p=player(r.playerId);assert.equal(p.enName,r.expectedEnName);assert.equal(p.country,r.country);assert.equal(p.tour,'ATP');assert.equal(p.doublesRank??null,null,'Existing ranking protected');assert.ok(Number.isInteger(r.rank)&&r.rank>0&&r.rank<=100);
 Object.assign(p,{doublesRank:r.rank,doublesPoints:r.points,doublesRankDate:null,doublesRankCheckedAt:review.rankings.source.checkedAt,doublesRankSourceUrl:review.rankings.source.url,doublesRankBasis:'observed-snapshot',doublesRankSourceSha256:review.rankings.source.sha256});
 if(p.id==='austin-krajicek')p.doublesRankNote='此处采用 Tennis.com 双打榜页面快照 No.25。上海官网球员档案另列 No.23，但两页均未标明榜单日期，不能据此判断谁更新更晚；不将快照称为已确认的最新 ATP 官方周榜。';
}
const match=data.matches.find(m=>m.id==='sh-1011-bolelli');assert.ok(match);assert.equal(match.status,'finished');assert.deepEqual([...match.winnerIds].sort(),['austin-krajicek','nikola-mektic']);assert.equal(match.score,'6-7(2) 7-6(2) [10-7]');
assert.equal(match.h2h??null,null);match.h2h=structuredClone(review.h2h);
const history=Core.matchHistoryView(match,data);assert.deepEqual(history.wins,[1,3]);assert.equal(history.meetings.length,4);assert.equal(history.currentIncluded,true);
// Sporting fields outside this explicitly scoped review are protected.
for(const key of ['rankings','tickets','activities','articles','draws','officialSources','communitySources'])assert.deepEqual(data[key],before[key],key);
for(const p of data.players){const old=before.players.find(q=>q.id===p.id);for(const key of ['id','enName','dateOfBirth','birthSourceUrl','birthCheckedAt','rank','rankDate','rankCheckedAt','rankSourceUrl','points','pointsCheckedAt','followed','favorite','prospect'])assert.deepEqual(p[key],old[key],p.id+'/'+key);}
for(const old of before.matches.filter(m=>m.tournamentId!=='shanghai-2026'||m.localDate!=='2026-10-11'))assert.deepEqual(data.matches.find(m=>m.id===old.id),old,old.id);
const manifest=await readJSON('public/player-photos.json'),oldManifest=structuredClone(manifest),candidates=await readJSON(path.join(candidateDir,'candidate-photos.json'));
await mkdir('public/images/players',{recursive:true});
for(const c of review.portraits){assert.equal(manifest.photos[c.playerId],undefined,'Existing portrait protected');const photo=candidates.photos[c.playerId];assert.ok(photo&&photo.playerId===c.playerId);assert.equal(photo.sha256,c.sha256);assert.match(photo.license,/^CC (BY(-SA)? (2\.0|3\.0|4\.0)|0)/);assert.match(photo.sourcePage,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);assert.match(photo.src,/^images\/players\/[a-z0-9-]+\.(jpg|png|webp)$/);const src=path.join(candidateDir,'candidates',path.basename(photo.src)),bytes=await readFile(src);assert.equal(hash(bytes),c.sha256);await copyFile(src,'public/'+photo.src);
 manifest.photos[c.playerId]={...photo,name:player(c.playerId).name,objectPosition:c.objectPosition,displayAllowed:true,selectionLocked:true,selectionReview:{reviewedAt:new Date().toISOString(),decision:'approved',basis:'Previously missing portrait; exact Wikidata identity and individual Wikimedia license validated; full image composition reviewed. No existing selection changed.'}};
}
for(const [id,p] of Object.entries(oldManifest.photos))assert.deepEqual(manifest.photos[id],p,id+' portrait changed');
manifest.updatedAt=new Date().toISOString();
data.meta.revision++;data.meta.updatedAt=new Date().toISOString();data.meta.appliedReviews=[...(data.meta.appliedReviews||[]),review.reviewId];data.meta.updateScope='补齐中文名、许可照片与双打排名快照；核验上海赛果及固定组合交手。不更改单打周榜、年龄或关注设置。';
assert.deepEqual(Runtime.validate(data),[]);
await writeFile('data/content.json',JSON.stringify(data,null,2)+'\n');await writeFile('public/player-photos.json',JSON.stringify(manifest,null,2)+'\n');await writeFile('public/player-photos-data.js','window.COURTSIDE_PHOTOS = '+JSON.stringify(manifest).replace(/</g,'\\u003c')+';\n');
await mkdir('phase2',{recursive:true});await writeFile('phase2/profile-release.json',JSON.stringify({at:data.meta.updatedAt,revision:data.meta.revision,names:review.names.length,doublesRankSnapshots:review.rankings.rows.length,newPhotos:review.portraits.length,results:applied.report.results,officialDayCheckedAt:review.officialDay.checkedAt,officialH2HCheckedAt:review.officialH2H.checkedAt,h2h:{wins:history.wins,meetings:history.meetings.length,includesCurrent:history.currentIncluded},protectedFieldsPreserved:true,sourceRankDateUnknown:true,ongoingDoublesAutomationEnabled:false,photoLicenseCostsUSD:0},null,2));
console.log(await readFile('phase2/profile-release.json','utf8'));
