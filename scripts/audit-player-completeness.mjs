/** Optional-field gaps are review tasks, never evidence that no rank/history exists. */
import Core from '../public/core.js';
export function profileCompleteness(data,manifest,date=Core.day(new Date().toISOString())){
 const matches=data.matches.filter(m=>[date,Core.addDays(date,1)].includes(Core.matchDate(m))),used=new Map();
 for(const m of matches)for(const id of m.sides.flat()){const row=used.get(id)||{singles:false,doubles:false};row[m.sides[0].length===2?'doubles':'singles']=true;used.set(id,row);}
 const gaps=[];
 for(const p of data.players){const needed=used.get(p.id);if(!needed)continue;const fields=[];if(!/[\u3400-\u9fff]/.test(p.name||''))fields.push('Chinese name');const photo=manifest.photos?.[p.id];if(!photo||photo.displayAllowed===false)fields.push('licensed portrait');if(!p.dateOfBirth)fields.push('verified birth date');if(needed.singles&&!Core.playerRanking(p).known)fields.push('singles rank');if(needed.doubles&&!Core.playerRanking(p,true).known)fields.push('doubles rank');if(fields.length)gaps.push({playerId:p.id,name:p.name,fields});}
 return {date,throughDate:Core.addDays(date,1),referencedPlayers:used.size,playersWithGaps:gaps.length,gaps,h2hGaps:matches.filter(m=>!Core.h2hView(m).known).map(m=>m.id),rankingSnapshots:matches.flatMap(m=>m.sides.flat().map(id=>({id,doubles:m.sides[0].length===2}))).filter((r,i,a)=>a.findIndex(x=>x.id===r.id&&x.doubles===r.doubles)===i).filter(r=>Core.playerRanking(data.players.find(p=>p.id===r.id),r.doubles).snapshot).map(r=>r.id),complete:false,meaning:'Unverified optional fields remain explicitly unknown; this report is not a claim of full site coverage.'};
}
