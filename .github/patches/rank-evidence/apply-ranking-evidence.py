"""Apply one finite, hash-checked ranking review; never fetch or enable a collector."""
import copy, datetime, hashlib, json, pathlib, re, sys, unicodedata
from html.parser import HTMLParser
ROOT = pathlib.Path.cwd()

def norm(s):
    return re.sub('[^a-z0-9]', '', unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower())

class Rows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.row, self.stack = [], None, []
        self.dates = []
    def handle_starttag(self, tag, attributes):
        a = dict(attributes)
        classes = a.get('class', '').split()
        if tag == 'section' and 'js-rankings' in classes:
            self.dates.append(a.get('data-date'))
        if tag == 'tr' and 'js-player-item-favourite' in classes:
            assert self.row is None
            self.row = {'name': a['data-player-name'], 'officialPlayerId': a['data-player-id'], 'rank': '', 'points': '', 'country': '', 'movement': '', 'direction': 'same'}
            self.stack = []
        if self.row is not None and tag not in ['img', 'input', 'br', 'hr', 'meta', 'link']:
            self.stack.append((tag, classes))
            if 'player-row__movement--down' in classes: self.row['direction'] = 'down'
            if 'player-row__movement--up' in classes: self.row['direction'] = 'up'
    def handle_data(self, text):
        if self.row is None: return
        mapping = {'player-row__rank': 'rank', 'player-row__cell--points': 'points', 'player-cell__country': 'country', 'player-row__movement': 'movement'}
        active = set(c for _, classes in self.stack for c in classes)
        for c, field in mapping.items():
            if c in active: self.row[field] += text
    def handle_endtag(self, tag):
        if self.row is None: return
        if tag == 'tr':
            r = self.row
            r['rank'] = int(r['rank'].strip())
            r['points'] = int(r['points'].strip().replace(',', ''))
            r['country'] = r['country'].strip()
            mv = r.pop('movement').strip()
            direction = r.pop('direction')
            r['change'] = 0 if mv == '-' else (-abs(int(mv)) if direction == 'down' else abs(int(mv)))
            self.rows.append(r); self.row = None; self.stack = []
        else:
            for i in range(len(self.stack)-1, -1, -1):
                if self.stack[i][0] == tag:
                    del self.stack[i:]; break

def apply_sources(evidence, browser, api):
    raw = (ROOT/'data/content.json').read_bytes()
    data = json.loads(raw); before = copy.deepcopy(data)
    tag = '2026-10-11-official-ranking-review'
    if tag in data['meta'].get('appliedReviews', []): return
    html = (browser/'wta-after.html').read_bytes()
    digest = hashlib.sha256(html).hexdigest()
    assert digest == '9ee10e1a1df99b2a353fa3eb3f760dd7e61d896e1377600f53574063722a27a7'
    page = json.loads((browser/'browser.json').read_text())['pages'][0]
    assert page.get('error') is None and page['status'] == 200 and page['afterCount'] == 100
    assert page['beforeDate'] == page['afterDate'] == '2026-10-05' and page['sha256'] == digest
    checked = page['finishedAt']
    profile = (evidence/'blinkova.html').read_bytes()
    assert hashlib.sha256(profile).hexdigest() == '1001fe2959364ae3b0599508412ab2db89333854a7e5aa4379b42d34ae4f8555'
    parser = Rows(); parser.feed(html.decode())
    assert parser.dates == ['2026-10-05'] and len(parser.rows) == 100
    assert [r['rank'] for r in parser.rows] == list(range(1,101))
    assert len({r['officialPlayerId'] for r in parser.rows}) == 100
    wta = next(t for t in data['rankings'] if t['tour'] == 'WTA')
    assert wta['rankingDate'] == parser.dates[0]
    old_by_id = {p['id']:p for p in data['players']}
    for r in parser.rows:
        candidates = [p for p in data['players'] if p['tour'] == 'WTA' and p['country'] == r['country'] and norm(r['name']) in {norm(n) for n in [p['enName'], *p.get('aliases',[])] if ' ' in n}]
        assert len(candidates) == 1, r['name'] + ': ambiguous official identity'
        p = candidates[0]; row = wta['rows'][r['rank']-1]
        assert row == {'rank':r['rank'],'playerId':p['id'],'points':r['points'],'change':r['change']}, r['name']+': official values conflict'
        official_id = p.get('externalIds',{}).get('wta')
        assert official_id is None or str(official_id) == r['officialPlayerId']
        p.update(rankCheckedAt=checked, pointsCheckedAt=checked, rankSourceUrl=page['url'], pointsSourceUrl=page['url'])
    values = lambda t: [[r['rank'],r['playerId'],r['points'],r.get('change')] for r in t['rows']]
    wta['previousRankSource'] = {k:wta[k] for k in ['sourceUrl','sourceName','verifiedAt']}
    wta.update(sourceUrl=page['url'], sourceName='WTA 官方单打榜单', verifiedAt=checked)
    wta['evidenceReview'] = {'state':'official-reviewed','rankingDate':wta['rankingDate'],'checkedAt':checked,'sourceUrl':page['url'],'rowCount':100,'reviewedRows':values(wta),'sourceSha256':digest,'note':'本期完整前100的姓名、代表国家、名次、积分及周变化已逐项对照 WTA 官方页面。页面明确对应2026年10月5日；另一个接口仍返回9月28日，未用于替换本期榜单。此为本期核对，不代表实时或自动更新。'}
    b = old_by_id['anna-blinkova']; official = next(r for r in parser.rows if r['officialPlayerId'] == '324267')
    assert official['name'] == b['enName'] == 'Anna Blinkova' and official['country'] == b['country'] == 'FRA'
    b.update(countrySourceUrl='https://www.wtatennis.com/players/324267/anna-blinkova',countryCheckedAt=checked,countryBasis='official-tour-representation')
    b['externalIds'] = {**b.get('externalIds',{}),'wta':'324267'}
    candidate = json.loads((api/'report.json').read_text())
    atp = next(t for t in data['rankings'] if t['tour'] == 'ATP')
    proposed = next(t for t in candidate['tours'] if t['tour'] == 'ATP')
    assert proposed['rankingDate'] == atp['rankingDate'] == '2026-10-05' and len(proposed['rows']) == 100
    current = {r['playerId']:r for r in atp['rows']}; differences = []
    for r in proposed['rows']:
        assert r['playerId'] in current
        o = current[r['playerId']]
        if o['rank'] != r['rank'] or o['points'] != r['points']:
            differences.append({'playerId':r['playerId'],'current':{'rank':o['rank'],'points':o['points']},'candidate':{'rank':r['rank'],'points':r['points']}})
    expected = {'carlos-alcaraz','felix-auger-aliassime','daniil-medvedev','novak-djokovic','alex-de-minaur','frances-tiafoe','arthur-fils','jiri-lehecka','learner-tien','tommy-paul','brandon-nakashima'}
    assert {r['playerId'] for r in differences} == expected
    atp['evidenceReview'] = {'state':'conflict','rankingDate':atp['rankingDate'],'checkedAt':checked,'sourceUrl':'https://atp.balldontlie.io/','reviewedRows':values(atp),'conflicts':differences,'note':'同样标注2026年10月5日的两份来源，在11位球员的名次或积分上存在差异。本次未取得可核对的官方历史整榜，暂保留原来源；这不代表原数值已确认无误，也不将两份数据混合成新榜。'}
    data['meta']['sourceChecks']['WTA']['rankings'] = checked
    data['meta']['revision'] += 1
    data['meta']['updatedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
    data['meta']['updateScope'] = 'WTA本期官方整榜核对与代表国家来源；ATP差异待复核，不改排名数值或比赛数据'
    data['meta']['appliedReviews'] = [*data['meta'].get('appliedReviews',[]),tag]
    for tour in ['ATP','WTA']:
        a=next(t for t in before['rankings'] if t['tour']==tour);btable=next(t for t in data['rankings'] if t['tour']==tour)
        assert a['rows']==btable['rows'] and a['rankingDate']==btable['rankingDate']
    for key in before.keys()-{'meta','players','rankings'}: assert before[key]==data[key],key
    assert before['meta']['refreshStatus'] == data['meta']['refreshStatus']
    assert before['meta']['sourceChecks']['ATP'] == data['meta']['sourceChecks']['ATP']
    allowed={'rankCheckedAt','pointsCheckedAt','rankSourceUrl','pointsSourceUrl'}
    for a,bp in zip(before['players'],data['players']):
        keys=allowed | ({'countrySourceUrl','countryCheckedAt','countryBasis','externalIds'} if a['id']=='anna-blinkova' else set()) if a['tour']=='WTA' else set()
        for k in a.keys()|bp.keys():
            if k not in keys: assert a.get(k)==bp.get(k),(a['id'],k)
    assert (ROOT/'data/content.json').read_bytes()==raw,'Concurrent data edit'
    (ROOT/'data/content.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'phase2/ranking-evidence').mkdir(parents=True,exist_ok=True)
    (ROOT/'phase2/ranking-evidence/applied.json').write_text(json.dumps({'revision':data['meta']['revision'],'officialWtaRowsMatched':100,'rankingIssueDate':wta['rankingDate'],'checkedAt':checked,'atpConflicts':len(differences),'rankingValuesChanged':False,'officialBlinkovaCountry':'FRA','paidServicesAdded':False},indent=2))

if __name__=='__main__':
    assert len(sys.argv)==4,'Expected reviewed official evidence, browser evidence and free API report folders'
    apply_sources(*map(pathlib.Path,sys.argv[1:]))
