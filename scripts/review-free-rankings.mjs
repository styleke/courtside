/** Optional credential-gated review only; no public-data writer and no paid endpoint. */
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {assertFreeBuild} from './free-build-guard.mjs';
import {reviewFreeRankings} from '../adapters/free-ranking-review.mjs';
import {rankingIntakeSummary,rankingIntakeMarkdown} from '../services/ranking-intake-summary.mjs';
await assertFreeBuild(process.cwd());
const before=await readFile('data/content.json');
const report=await reviewFreeRankings(JSON.parse(before),{apiKey:process.env.BDL_API_KEY,freeConfirmed:process.env.COURTSIDE_BDL_FREE_CONFIRMED==='true'});
if(!before.equals(await readFile('data/content.json')))throw Error('Review changed public data');
await mkdir('phase2/free-ranking-review',{recursive:true});
await writeFile('phase2/free-ranking-review/report.json',JSON.stringify(report,null,2));
const summary=rankingIntakeSummary(report,JSON.parse(before));
await writeFile('phase2/free-ranking-review/summary.json',JSON.stringify(summary,null,2));
const markdown=rankingIntakeMarkdown(summary);
await writeFile('phase2/free-ranking-review/summary.md',markdown);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,markdown);
console.log(JSON.stringify({status:report.status,requests:report.requests.length,tours:report.tours.map(t=>({tour:t.tour,rankingDate:t.rankingDate,rows:t.rows.length,problems:t.problems,eligibleForEditorialReview:t.eligibleForEditorialReview})),errors:report.errors,publicDataWritten:false},null,2));
if(report.status==='error')process.exitCode=1;
