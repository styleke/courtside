/** Finite whole-issue import. This module has no fetch, scheduler or permission writer. */
import Runtime from '../public/runtime.js';
const OFFICIAL = 'https://www.wtatennis.com/rankings/singles';
const API = 'https://api.balldontlie.io/wta/v1/rankings?per_page=100';
const hash = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const norm = x => String(x || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const names = p => [p.enName, ...(p.aliases || [])].filter(x => typeof x === 'string' && x.trim().includes(' ')).map(norm);
const date = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x;
const demand = (ok, message) => { if (!ok) throw Error(message); };
const instant = (x, now) => typeof x === 'string' && /Z$/.test(x) && Number.isFinite(Date.parse(x)) && Date.parse(x) <= now + 300000 && now - Date.parse(x) <= 86400000;
const tuple = row => [row.rank, row.playerId, row.points, row.change];

export function importReviewedWta(current, candidateReport, official, {now = Date.now()} = {}) {
  demand(Number.isFinite(now) && !Runtime.validate(current).length, 'invalid-current-snapshot');
  demand(official?.tour === 'WTA' && official.sourceUrl === OFFICIAL && hash(official.sourceSha256), 'invalid-official-evidence');
  demand(date(official.rankingDate) && official.rankingDate <= new Date(now).toISOString().slice(0, 10) && now - Date.parse(official.rankingDate) <= 14 * 86400000, 'invalid-or-old-issue');
  demand(instant(official.observedAt, now), 'invalid-evidence-time');
  demand(candidateReport?.status === 'review-only' && candidateReport.publicDataWritten === false && candidateReport.automaticPublication === false && !candidateReport.errors?.length, 'invalid-candidate-report');
  demand(instant(candidateReport.finishedAt, now), 'invalid-candidate-time');
  const tours = candidateReport.tours.filter(t => t.tour === 'WTA');
  const requests = candidateReport.requests.filter(r => r.url === API);
  demand(tours.length === 1 && requests.length === 1 && requests[0].status === 200 && hash(requests[0].sha256), 'invalid-candidate-source');
  const proposed = tours[0], old = current.rankings.find(t => t.tour === 'WTA');
  demand(proposed.rankingDate === official.rankingDate && official.rankingDate > old.rankingDate, 'not-a-new-matching-issue');
  demand(Array.isArray(official.rows) && official.rows.length === 100 && Array.isArray(proposed.rows) && proposed.rows.length === 100, 'incomplete-top-100');
  const next = structuredClone(current), linked = [], added = [], disagreements = [], ids = new Set(), wtaIds = new Set(), apiIds = new Set();
  for (let i = 0; i < 100; i++) {
    const o = official.rows[i], a = proposed.rows[i];
    demand(o?.rank === i + 1 && a?.rank === i + 1 && Number.isSafeInteger(o.points) && o.points >= 0 && Number.isSafeInteger(o.change), 'invalid-ranked-row');
    demand(typeof o.name === 'string' && o.name.length <= 150 && o.name.trim().includes(' ') && /^[A-Z]{3}$/.test(o.country) && /^\d{4,10}$/.test(o.officialPlayerId), 'invalid-official-identity');
    demand(a.rankingDate === official.rankingDate && a.points === o.points && a.change === o.change && norm(a.enName) === norm(o.name) && /^[A-Z]{3}$/.test(a.country), 'source-row-disagreement');
    demand(Number.isSafeInteger(a.providerPlayerId) && a.providerPlayerId > 0 && !apiIds.has(a.providerPlayerId) && !wtaIds.has(o.officialPlayerId), 'duplicate-provider-identity');
    apiIds.add(a.providerPlayerId); wtaIds.add(o.officialPlayerId);
    const byId = next.players.filter(p => p.tour === 'WTA' && String(p.externalIds?.wta) === o.officialPlayerId);
    const byName = next.players.filter(p => p.tour === 'WTA' && names(p).includes(norm(o.name)));
    demand(byId.length <= 1 && byName.length <= 1 && (!byId.length || !byName.length || byId[0].id === byName[0].id), 'ambiguous-player-identity');
    let p = byId[0] || byName[0];
    if (p) {
      demand(names(p).includes(norm(o.name)) && p.country === o.country && p.careerStatus !== 'retired', 'existing-player-conflict');
      demand(p.externalIds?.wta == null || String(p.externalIds.wta) === o.officialPlayerId, 'official-id-conflict');
      demand(p.externalIds?.balldontlie == null || String(p.externalIds.balldontlie) === String(a.providerPlayerId), 'candidate-id-conflict');
    } else {
      const id = 'wta-' + o.officialPlayerId;
      demand(!next.players.some(p => p.id === id), 'new-player-id-collision');
      // The official full name is retained; missing age/photo/style fields are not guessed.
      p = {id, name:o.name, enName:o.name, aliases:[], tour:'WTA', country:o.country, followed:false, favorite:false, followTier:'none', prospect:false, careerStatus:'active', demo:false, nicknames:[], age:null, dateOfBirth:null, style:null, sourceUrl:OFFICIAL, verifiedAt:official.observedAt};
      next.players.push(p); added.push({id, name:o.name, officialPlayerId:o.officialPlayerId});
    }
    demand(a.playerId == null || a.playerId === p.id, 'candidate-link-conflict');
    demand(!ids.has(p.id), 'duplicate-local-identity'); ids.add(p.id);
    demand(!next.players.some(q => q.tour === 'WTA' && q.id !== p.id && String(q.externalIds?.balldontlie) === String(a.providerPlayerId)), 'candidate-id-collision');
    p.externalIds = {...p.externalIds, wta:o.officialPlayerId, balldontlie:a.providerPlayerId};
    if (o.country !== a.country) {
      // This is a reviewed source-field disagreement, not an instruction to change nationality.
      disagreements.push({playerId:p.id, providerPlayerId:a.providerPlayerId, providerCountry:a.country, officialCountry:o.country});
      Object.assign(p, {countrySourceUrl:OFFICIAL, countryCheckedAt:official.observedAt, countryBasis:'official-tour-representation'});
    }
    Object.assign(p, {rank:o.rank, points:o.points, rankChange:o.change, rankDate:official.rankingDate, rankSourceUrl:OFFICIAL, rankCheckedAt:official.observedAt, pointsSourceUrl:OFFICIAL, pointsCheckedAt:official.observedAt});
    delete p.singlesRankingCoverage;
    linked.push({rank:o.rank, playerId:p.id, points:o.points, change:o.change});
  }
  const removed = [];
  for (const row of old.rows) if (!ids.has(row.playerId)) {
    const p = next.players.find(p => p.id === row.playerId);
    p.previousSinglesRanking = {rank:row.rank, points:row.points, rankingDate:old.rankingDate, sourceUrl:old.sourceUrl};
    for (const key of ['rank','points','rankChange','rankDate','rankCheckedAt','pointsCheckedAt','rankSourceUrl','pointsSourceUrl']) p[key] = null;
    p.singlesRankingCoverage = {state:'not-in-published-top100', rankingDate:official.rankingDate, sourceUrl:OFFICIAL, checkedAt:official.observedAt};
    removed.push(p.id);
  }
  const table = {tour:'WTA', rankingDate:official.rankingDate, verifiedAt:official.observedAt, sourceUrl:OFFICIAL, sourceName:'WTA 官方单打榜单', officialUrl:OFFICIAL, crossCheckUrl:'https://wta.balldontlie.io/', rows:linked};
  table.evidenceReview = {state:'official-reviewed', rankingDate:official.rankingDate, checkedAt:official.observedAt, sourceUrl:OFFICIAL, rowCount:100, reviewedRows:linked.map(tuple), sourceSha256:official.sourceSha256, candidateSha256:requests[0].sha256, countryDisagreements:disagreements, note:`本期完整前100已逐项对照WTA官方页面与免费数据接口；名次、积分及周变化一致。代表国家按官方页面保留，不用接口旧标签覆盖。此为本期核对，不代表实时或自动更新。`};
  next.rankings = next.rankings.map(t => t.tour === 'WTA' ? table : t);
  next.meta.revision++;
  next.meta.updatedAt = new Date(now).toISOString();
  next.meta.updateScope = `WTA单打${official.rankingDate}完整前100；ATP、比赛赛程及赛果保持不变`;
  next.meta.sourceChecks = {...next.meta.sourceChecks, WTA:{...next.meta.sourceChecks?.WTA, rankings:official.observedAt}};
  demand(!Runtime.validate(next).length, 'invalid-resulting-snapshot');
  return {data:next, report:{tour:'WTA', rankingDate:official.rankingDate, fromDate:old.rankingDate, revision:next.meta.revision, rowsVerified:100, newPlayers:added, leftPublishedTop100:removed, countryDisagreements:disagreements, atpChanged:false, matchesChanged:false, automaticPublication:false, checkedAt:official.observedAt}};
}
