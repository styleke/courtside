"""Install reviewed, narrowly matched user-visible provenance and date-filter validation."""
from pathlib import Path
base=Path('.github/patches/rank-evidence')
def edit(path,old,new):
 p=Path(path);s=p.read_text()
 if new in s:return
 assert s.count(old)==1,(path,old)
 p.write_text(s.replace(old,new))
core=(base/'ranking-review-module.js').read_text()
edit('public/core.js','return{BJ,validDate,validInstant,validZone,parts,day,clock,addDays,matchDate,timeLabel,safeURL,followed,matchName,ticketContext,sortMatches,recommend,h2hView,playerRanking,',core+'\nreturn{BJ,validDate,validInstant,validZone,parts,day,clock,addDays,matchDate,timeLabel,safeURL,followed,matchName,ticketContext,sortMatches,recommend,h2hView,rankingReview,playerRanking,')
helpers=(base/'ranking-ui-helpers.js').read_text()
edit('public/app.js',"function rankBadge(q,doubles=false,cl='compare-rank'){",helpers+"\nfunction rankBadge(q,doubles=false,cl='compare-rank'){")
edit('public/app.js',"const detail=[r.label+'排名',date,r.checkedAt?'核验 '+sourceTime(r.checkedAt):'',r.note]", "const review=!doubles&&rankReviewFor(q),detail=[r.label+'排名',date,review?'本期名次或积分待复核':'',r.checkedAt?'核验 '+sourceTime(r.checkedAt):'',r.note]")
edit('public/app.js',"${r.snapshot?'<small class=\"snapshot-mark\">快照</small>':''}</span>`;", "${r.snapshot?'<small class=\"snapshot-mark\">快照</small>':''}${review?'<small class=\"rank-review-inline\">待复核</small>':''}</span>`;")
edit('public/app.js','${r.rank}</td><td><div class="table-player">','${r.rank}${rankReviewFor(q)?\'<span class="rank-review-dot" title="本期名次或积分待复核" aria-label="本期名次或积分待复核"></span>\':\'\'}</td><td><div class="table-player">')
edit('public/app.js',"<span>榜单 ${e(table?.rankingDate||'—')}</span></div>","<span>榜单 ${e(table?.rankingDate||'—')}</span>${rankReviewBadge(table)}</div>")
edit('public/app.js','<p>${e(x.rankingDate)} · ${e(x.sourceName)}</p><div class="inline-actions">','<p>${e(x.rankingDate)} · ${e(x.sourceName)}</p>${rankingEvidenceDetail(x)}<div class="inline-actions">')
edit('public/app.js','<small>单打世界排名</small><strong>','<small>单打世界排名${rankReviewFor(x)?\' · 待复核\':\'\'}</small><strong>')
edit('public/app.js',"${x.identityNote?`<p>${e(x.identityNote)}</p>`:''}","${x.countrySourceUrl?`<p>代表国家／地区：${e(C.countryName(x.country))} · ${e(sourceTime(x.countryCheckedAt))}</p>${ext(x.countrySourceUrl,'官方代表信息','btn ghost small')}`:''}${x.identityNote?`<p>${e(x.identityNote)}</p>`:''}")
css='''\n/* Review labels stay secondary to names and scores. */
.ranking-period{flex-wrap:wrap;row-gap:8px}.ranking-review-badge{display:inline-flex;align-items:center;gap:5px;border:1px solid currentColor;border-radius:7px;padding:5px 8px;font-size:12px;line-height:1.4;background:transparent;white-space:nowrap;cursor:pointer}.ranking-review-badge .icon{width:14px;height:14px}.review-pending,.rank-review-inline{color:#876125}.review-confirmed{color:#286550}.rank-review-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:#876125;vertical-align:top;margin-left:3px}.rank-review-inline{font-size:11px;font-weight:500;margin-left:4px;white-space:nowrap}.ranking-discrepancies{display:grid;gap:10px;margin:12px 0}.ranking-discrepancies>div{display:grid;gap:3px;padding-bottom:8px;border-bottom:1px solid var(--line,#e4e9df);font-size:12px}.ranking-evidence summary{font-size:13px}.ranking-evidence p{font-size:13px;line-height:1.65}.ranking-review-badge:focus-visible{outline:2px solid currentColor;outline-offset:3px}
@media(max-width:760px){.ranking-period{justify-content:flex-start}.ranking-review-badge{font-size:11px;padding:4px 6px}.rank-review-inline{font-size:10px}}
'''
s=Path('public/styles.css').read_text()
if css not in s:Path('public/styles.css').write_text(s+css)
edit('adapters/free-ranking-review.mjs','export function rankingURL(tour,cursor=null){','export function rankingURL(tour,cursor=null,{date=null}={}){')
edit('adapters/free-ranking-review.mjs',"u.searchParams.set('per_page','100');if(cursor!==null)","u.searchParams.set('per_page','100');if(date!==null){if(!day(date))throw Error('invalid-requested-date');u.searchParams.set('date',date);}if(cursor!==null)")
edit('adapters/free-ranking-review.mjs',"{today=new Date().toISOString().slice(0,10)}={})", "{today=new Date().toISOString().slice(0,10),requestedDate=null}={})")
edit('adapters/free-ranking-review.mjs',"if(!TOURS.includes(tour)||!day(today))", "if(!TOURS.includes(tour)||!day(today)||(requestedDate!==null&&!day(requestedDate)))")
edit('adapters/free-ranking-review.mjs',"if(!rankingDate)problems.push('mixed-or-missing-issue-date');", "if(!rankingDate)problems.push('mixed-or-missing-issue-date');\n if(requestedDate!==null&&rankingDate!==requestedDate)problems.push('requested-date-not-honored');")
edit('adapters/free-ranking-review.mjs',"return {tour,rankingDate,rows,problems:","return {tour,rankingDate,requestedDate,rows,problems:")
Path('tests/ranking-evidence.test.cjs').write_text((base/'ranking-review.test.cjs').read_text())
print('Installed exact-table ranking review labels and requested-date validation')
