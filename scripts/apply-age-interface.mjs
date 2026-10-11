/** Exact idempotent edits of the reviewed UI; no redesign or raw numeric ages. */
import {readFile,writeFile} from 'node:fs/promises';
const edit=async(file,before,after)=>{let s=await readFile(file,'utf8');if(s.includes(after))return;if(!s.includes(before))throw Error('Unknown template '+file+' '+before.slice(0,70));s=s.replace(before,after);await writeFile(file,s);};
await edit('public/index.html','<script src="photos.js"></script><script src="app.js"></script>','<script src="photos.js"></script><script src="ages.js"></script><script src="app.js"></script>');
await edit('scripts/build.mjs',"'runtime.js','app.js'];","'runtime.js','ages.js','app.js'];");
await edit('scripts/build.mjs',"'player-photos-data.js','photos.js','app.js'])","'player-photos-data.js','photos.js','ages.js','app.js'])");
const helpers=`function ageTag(q){const age=window.CourtAge.of(q);return age===null?'':\`<span class="player-age" data-player-age="\${e(q.id)}" title="出生日期：\${e(q.dateOfBirth)} · 当前周岁（北京时间）">\${age} 岁</span>\`;}
function updateVisibleAges(){document.querySelectorAll('[data-player-age]').forEach(node=>{const q=p(node.dataset.playerAge),age=window.CourtAge.of(q);node.textContent=age===null?'':age+' 岁';node.hidden=age===null;});}
`;
await edit('public/app.js','function rankText(x){',helpers+'function rankText(x){');
await edit('public/app.js',"${x.age!=null?' · '+x.age+' 岁':''}","${ageTag(x)?' · '+ageTag(x):''}");
await edit('public/app.js','<b>${e(q.name)}</b><small>${e(q.enName)}<span class="rank-mobile-country">','<span class="rank-name-line"><b>${e(q.name)}</b>${ageTag(q)}</span><small>${e(q.enName)}<span class="rank-mobile-country">');
await edit('public/app.js',"${(singles?q.rank:q.doublesRank)??'—'}</span></div>","${(singles?q.rank:q.doublesRank)??'—'}</span>${ageTag(q)}</div>");
await edit('public/app.js','${window.CourtPhotos.credit(x)}<p>', '${window.CourtPhotos.credit(x)}${x.dateOfBirth?`<p>出生日期：${e(x.dateOfBirth)} · 年龄按当前北京时间计算。</p><div class="inline-actions">${ext(x.birthSourceUrl,\'出生日期来源\',\'btn ghost small\')}${ext(x.birthCorroboratingUrl,\'官方资料核对\',\'btn ghost small\')}</div>`:\'\'}<p>');
await edit('public/app.js','render();\n(async()=>{',`render();
// A birthday changes age even without a data deployment or a page reload.
let ageDay=window.CourtAge.today();
const refreshAgeDay=()=>{const next=window.CourtAge.today();if(next!==ageDay){ageDay=next;updateVisibleAges();}};
let birthdayTimer;
const scheduleBirthday=()=>{clearTimeout(birthdayTimer);const now=Date.now(),next=(Math.floor((now+28800000)/86400000)+1)*86400000-28800000;birthdayTimer=setTimeout(()=>{refreshAgeDay();scheduleBirthday();},Math.max(100,next-now+50));};
scheduleBirthday();document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshAgeDay();scheduleBirthday();}});window.addEventListener('pagehide',()=>clearTimeout(birthdayTimer));window.addEventListener('pageshow',()=>{refreshAgeDay();scheduleBirthday();});
(async()=>{`);
const css=`\n/* Current age stays secondary to the player's name. */
.player-age{display:inline-block;font-size:11px!important;font-weight:500;line-height:1.7;color:var(--muted);white-space:nowrap;letter-spacing:0;vertical-align:middle}
.rank-name-line{display:flex;align-items:center;flex-wrap:wrap;column-gap:8px;row-gap:0;min-width:0}
.rank-name-line .player-age{background:var(--soft);border-radius:4px;padding:0 5px}
.identity-meta .player-age{padding-left:2px;color:inherit;opacity:.85}
@media(max-width:480px){.rank-name-line{column-gap:5px}.rank-name-line .player-age{font-size:10px!important;padding:0 4px}.identity-meta .player-age{font-size:10px!important}}
`;
let s=await readFile('public/styles.css','utf8');if(!s.includes('/* Current age stays secondary'))await writeFile('public/styles.css',s+css);
console.log('Age display integrated; no sporting data changed.');
