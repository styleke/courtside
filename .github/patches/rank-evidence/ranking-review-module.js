/** A review belongs to one exact table, not to whichever week is currently displayed. */
function rankingReview(table){
 const r=table?.evidenceReview;
 if(!r||r.rankingDate!==table.rankingDate||!validInstant(r.checkedAt)||!safeURL(r.sourceUrl)||!Array.isArray(table.rows)||table.rows.length!==100)return null;
 if(table.rows.some((x,i)=>x.rank!==i+1||!Number.isInteger(x.points)||x.points<0)||new Set(table.rows.map(x=>x.playerId)).size!==100)return null;
 const values=table.rows.map(x=>[x.rank,x.playerId,x.points,x.change??null]);
 if(JSON.stringify(values)!==JSON.stringify(r.reviewedRows))return null;
 if(r.state==='official-reviewed'&&r.rowCount===100)return {...r,label:'本期官方核对',affectedCount:0};
 if(r.state==='conflict'&&Array.isArray(r.conflicts)&&r.conflicts.length>0){
  const ids=new Set();for(const c of r.conflicts){const row=table.rows.find(x=>x.playerId===c.playerId);if(!row||ids.has(c.playerId)||c.current?.rank!==row.rank||c.current?.points!==row.points||!Number.isInteger(c.candidate?.rank)||!Number.isInteger(c.candidate?.points)||(c.candidate.rank===row.rank&&c.candidate.points===row.points))return null;ids.add(c.playerId);}
  return {...r,label:r.conflicts.length+' 人待复核',affectedCount:r.conflicts.length};
 }
 return null;
}
