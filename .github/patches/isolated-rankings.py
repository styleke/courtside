"""Allow independently dated complete ATP/WTA updates, never incomplete lists."""
from pathlib import Path

def replace(path,old,new):
    p=Path(path);s=p.read_text()
    if new in s:return
    assert s.count(old)==1,path+' changed; reconcile the source'
    p.write_text(s.replace(old,new))

replace('public/runtime.js',"if(p&&(p.rank!==row.rank||p.points!==row.points))errors.push('球员卡与排名表数据不一致');","if(p&&(p.rank!==row.rank||p.points!==row.points))errors.push('球员卡与排名表数据不一致');if(p&&p.rankDate!==t.rankingDate)errors.push('同一巡回赛球员卡与榜单日期不一致');")
replace('public/runtime.js',"if(new Set(d.rankings.map(t=>t.rankingDate)).size!==1)errors.push('ATP/WTA榜单日期不一致');","/* ATP and WTA publications are independently dated; each player issue matches its tour. */")
replace('tests/v08.test.cjs',"test('mixed weekly table editions are rejected'","test('player and table issue mismatch within one tour is rejected'")
replace('services/refresh.mjs',"if(incoming.length!==2||new Set(incoming.map(t=>t.tour)).size!==2)throw new Error('排名发布必须同时包含ATP/WTA完整前100');","if(!incoming.length||incoming.length>2||new Set(incoming.map(t=>t.tour)).size!==incoming.length||incoming.some(t=>!['ATP','WTA'].includes(t.tour)))throw new Error('每次更新须提供对应巡回赛的完整前100，不能重复或混入其他榜单');\n   const affected=new Set(incoming.map(t=>t.tour));")
replace('services/refresh.mjs',"for(const table of incoming){const errs=V6.rankingErrors(table,next.players);","for(const table of incoming){if(!Core.validDate(table.rankingDate)||table.rankingDate>Core.day(new Date(now).toISOString()))throw new Error('榜单日期无效或来自未来');const errs=V6.rankingErrors(table,next.players);")
replace('services/refresh.mjs',"next.rankings=COPY(incoming);for(const q of next.players){if(q.careerStatus!=='retired'){q.rank=null;q.points=null;q.rankChange=null;}}","next.rankings=(next.rankings||[]).map(t=>COPY(incoming.find(n=>n.tour===t.tour)||t));for(const q of next.players){if(affected.has(q.tour)&&q.careerStatus!=='retired'){q.rank=null;q.points=null;q.rankChange=null;}}")
replace('services/refresh.mjs',"changed+=200;continue;","changed+=incoming.reduce((sum,t)=>sum+t.rows.length,0);continue;")
replace('services/refresh.mjs',"const next=COPY(current),collections=CHANNELS[channel].collections;let changed=0;","const next=COPY(current),collections=CHANNELS[channel].collections;let changed=0;\n if(channel==='rankings'&&Array.isArray(feed.changes.rankings)){const tours=new Set(feed.changes.rankings.map(t=>t.tour));if((feed.changes.players||[]).some(p=>!tours.has(current.players.find(x=>x.id===p.id)?.tour||p.tour)))throw new Error('排名来源不能修改未更新巡回赛的球员');}")
replace('services/refresh.mjs',"const scopes=feed.scope?.tournaments||feed.scope?.tours||[channel];","const scopes=channel==='rankings'?feed.changes.rankings.map(t=>t.tour):(feed.scope?.tournaments||feed.scope?.tours||[channel]);")
replace('services/refresh.mjs',"for(const field of fields)if(channel!=='scores'&&mapping[field])","for(const field of fields)if(channel!=='scores'&&!(channel==='rankings'&&feed.changes.rankings.length===1)&&mapping[field])")
print('Independent complete ranking update rules installed')
