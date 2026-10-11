/** Optional credential-gated review only; no public-data writer and no paid endpoint. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {assertFreeBuild} from './free-build-guard.mjs';
import {reviewFreeRankings} from '../adapters/free-ranking-review.mjs';
await assertFreeBuild(process.cwd());
const before=await readFile('data/content.json');
const report=await reviewFreeRankings(JSON.parse(before),{apiKey:process.env.BDL_API_KEY,freeConfirmed:process.env.COURTSIDE_BDL_FREE_CONFIRMED==='true'});
if(!before.equals(await readFile('data/content.json')))throw Error('Review changed public data');
await mkdir('phase2/free-ranking-review',{recursive:true});
await writeFile('phase2/free-ranking-review/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,requests:report.requests.length,tours:report.tours.map(t=>({tour:t.tour,rankingDate:t.rankingDate,rows:t.rows.length,problems:t.problems,eligibleForEditorialReview:t.eligibleForEditorialReview})),errors:report.errors,publicDataWritten:false},null,2));
if(report.status==='error')process.exitCode=1;
