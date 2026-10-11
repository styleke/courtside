/** Exact, idempotent user-facing attribution; no change to existing card layout. */
import {readFile,writeFile} from 'node:fs/promises';
let s=await readFile('public/app.js','utf8');
if(!s.includes('function openResultCredit(')){
 const fn=`function openResultCredit(x){const r=x?.fieldSources?.results;if(r?.provider!=='baseline-today')return '';return '<div class="provenance-row"><span>赛果：'+ext(r.compiledBy,'Baseline Today','btn ghost small')+' / '+ext(r.primaryUrl,'Wikipedia contributors','btn ghost small')+' · '+ext(r.licenseUrl,'CC BY-SA 4.0','btn ghost small')+'</span></div>'+(r.tieBreakDetail==='partial'?'<p>该来源未提供全部抢七小分。</p>':'');}\n`;
 const anchor='function matchSources(x){';if(!s.includes(anchor))throw Error('Unknown source template');s=s.replace(anchor,fn+anchor);
 s=s.replace('数据来源与口径</summary><p>','数据来源与口径</summary>${openResultCredit(x)}<p>');
 s=s.replace("scores:'赛程与赛果',rankings:'排名'","knownSinglesResults:'已收录单打赛果（自动补全）',scores:'赛程与赛果',rankings:'排名'");
 const target='<h3 class="section-gap">排名榜单</h3>';
 const credit='<details class="detail-accordion provenance"><summary>赛果补全来源</summary><p>已收录单打对阵的赛果由 Baseline Today 汇编的 Wikipedia 开放数据补全，保留人工核验的更完整比分。来源按日更新，不提供逐分直播。</p><p>Wikipedia contributors / Baseline Today · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>。转载的赛果字段及其衍生内容沿用此许可，网站代码和其他来源资料不因此改变许可。</p><a href="https://baseline-today.vercel.app/data" target="_blank" rel="noopener noreferrer">开放数据与许可</a></details>';
 if(!s.includes(target))throw Error('Unknown source dialog');s=s.replace(target,credit+target);await writeFile('public/app.js',s);
}
let core=await readFile('public/core.js','utf8');if(!core.includes("ARM:'亚美尼亚'")){if(!core.includes('const COUNTRY_NAMES={'))throw Error('Country map changed');core=core.replace('const COUNTRY_NAMES={',"const COUNTRY_NAMES={ARM:'亚美尼亚',");await writeFile('public/core.js',core);}
