/** Summarize a read-only review. No network, public-data writes or promotion. */
export function rankingIntakeSummary(report,current){
 const tours=(report.tours||[]).map(t=>{
  const old=current.rankings?.find(r=>r.tour===t.tour),sameIssue=old?.rankingDate===t.rankingDate;
  const rows=t.rows||[],identified=rows.filter(r=>r.playerId),differences=[];
  if(sameIssue)for(const row of identified){
   const saved=old.rows.find(r=>r.playerId===row.playerId);
   if(!saved||saved.rank!==row.rank||saved.points!==row.points||saved.change!==row.change)
    differences.push({playerId:row.playerId,rank:row.rank,points:row.points,change:row.change,
     current:saved?{rank:saved.rank,points:saved.points,change:saved.change}:null});
  }
  const notes=rows.filter(r=>r.identityStatus==='reviewed-id-country-disagreement')
   .map(r=>({playerId:r.playerId,providerCountry:r.country,officialCountry:r.officialCountry,evidenceDate:r.countryEvidenceDate}));
  const reviewed=old?.evidenceReview;
  const officialMatch=sameIssue&&reviewed?.state==='official-reviewed'&&reviewed.rankingDate===t.rankingDate&&
   Array.isArray(reviewed.reviewedRows)&&reviewed.reviewedRows.length===100&&rows.length===100&&identified.length===100&&
   t.eligibleForEditorialReview===true&&differences.length===0&&rows.every(r=>reviewed.reviewedRows.some(v=>
    v[0]===r.rank&&v[1]===r.playerId&&v[2]===r.points&&v[3]===r.change));
  return {tour:t.tour,currentIssueDate:old?.rankingDate||null,sourceIssueDate:t.rankingDate,
   receivedRows:rows.length,identifiedRows:identified.length,sameIssue,differences,
   countryLabelsPreserved:notes,problems:t.problems||[],
   candidateEligible:t.eligibleForEditorialReview===true,providerMatchesReviewedIssue:officialMatch,
   decision:officialMatch?'matches-reviewed-issue':t.eligibleForEditorialReview?'editorial-review-required':'blocked',
   automaticPublication:false};
 });
 return {checkedAt:report.finishedAt||report.startedAt,executionStatus:report.status,
  requestCount:report.requests?.length||0,tours,errors:report.errors||[],
  publicDataWritten:false,automaticPublication:false,fullCoverage:false};
}
export function rankingIntakeMarkdown(summary){
 const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)?x:'未取得';
 return '# 免费排名候选核验\n\n此报告不发布排名，不修改球员代表国家，不代表全部数据已自动接通。\n\n'+
  '| 赛别 | 网站榜期 | 来源榜期 | 已识别/收到 | 同期数值差异 | 保留官方国家标签 | 结论 |\n|---|---|---|---|---|---|---|\n'+
  summary.tours.map(t=>'| '+(t.tour==='ATP'?'ATP':'WTA')+' | '+date(t.currentIssueDate)+' | '+date(t.sourceIssueDate)+
   ' | '+t.identifiedRows+'/'+t.receivedRows+' | '+(t.sameIssue?t.differences.length:'不同期不比较')+
   ' | '+t.countryLabelsPreserved.length+' | '+({'matches-reviewed-issue':'与已核验官方同期数值一致',
    'editorial-review-required':'新候选待人工核验','blocked':'拦截，保留网站原榜'}[t.decision])+' |').join('\n')+
  '\n\n网络请求：'+summary.requestCount+' 次；接口错误：'+summary.errors.length+' 项。完整原因见 report.json 与 summary.json。\n';
}
