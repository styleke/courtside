/** Verify this finite whole-issue release on a real staged or public page. No HTTP/time mocks. */
import {chromium} from 'playwright';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import Runtime from '../public/runtime.js';
const base=process.env.BASE_URL||'https://courtside-tennis.pages.dev/';
const out=process.env.REPORT_DIR||'phase2/wta-browser';
const expected=Runtime.publicData(JSON.parse(await readFile(process.env.EXPECTED_DATA_PATH||'data/content.json')));
const report={url:base,startedAt:new Date().toISOString(),networkMocks:false,fakeClock:false,checks:[],errors:[]};
await mkdir(out,{recursive:true});
const ok=name=>report.checks.push({name,passed:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1050}});
page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
try {
 await page.goto(base+'?wta-issue='+Date.now(),{waitUntil:'networkidle',timeout:45000});
 await page.locator('#main .page-heading').waitFor();
 const served=await page.evaluate(async()=>{
  const u=window.CourtRuntime.publishedDataURL('data/content.json',document.baseURI,window.COURTSIDE_CONFIG);
  const r=await fetch(u+'?wta-issue='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Data HTTP '+r.status);return r.json();
 });
 assert.deepEqual(served,expected);report.revision=served.meta.revision;ok('served full snapshot exactly matches the tested release, not only its version label');
 const wta=served.rankings.find(t=>t.tour==='WTA');assert.equal(wta.rankingDate,'2026-10-12');
 await page.locator('#nav a[href="#players"]').click();await page.locator('#rank-body tr').first().waitFor();
 assert.equal(await page.locator('#rank-body tr').count(),100);assert.equal(await page.locator('#rank-body .rank-review-dot').count(),11);
 assert.match(await page.locator('[data-rank-review="ATP"]').innerText(),/11 人待复核/);ok('ATP still has 100 rows and all 11 unresolved reviews');
 await page.locator('[data-action="rankTour"][data-value="WTA"]').click();
 assert.match(await page.locator('.ranking-period').innerText(),/2026-10-12/);assert.match(await page.locator('[data-rank-review="WTA"]').innerText(),/本期官方核对/);
 const visible=await page.locator('#rank-body tr').evaluateAll(rows=>rows.map(r=>({rank:Number(r.dataset.rank),playerId:r.querySelector('[data-action="player"]').dataset.id,points:Number(r.querySelector('.rank-points').textContent.replace(/,/g,'')),movement:r.querySelector('.rank-change').textContent.trim()})));
 assert.equal(visible.length,100);
 for(let i=0;i<100;i++){const row=wta.rows[i],v=visible[i];assert.deepEqual([v.rank,v.playerId,v.points],[row.rank,row.playerId,row.points]);assert.equal(v.movement,row.change>0?'↑ '+row.change:row.change<0?'↓ '+Math.abs(row.change):'—');}
 ok('all 100 rendered identities, ranks, points and movements agree with the reviewed October 12 issue');
 assert.equal(await page.locator('#rank-body .player-age').count(),100);ok('missing new-player ages stay explicit while all 100 age labels remain present');
 for(const [id,rank,name] of [['wta-320313',94,'Leolia Jeanjean'],['wta-329199',100,'Oksana Selekhmeteva']]){
  const row=page.locator(`#rank-body tr[data-rank="${rank}"]`);assert.match(await row.innerText(),new RegExp(name));
  await row.locator('[data-action="player"]').click();assert.equal(await page.locator('#dialog-title').innerText(),name);
  assert.match(await page.locator('.profile-numbers').innerText(),new RegExp('No\\.'+rank));
  assert.equal(served.players.find(p=>p.id===id).dateOfBirth,null);assert.equal(served.players.find(p=>p.id===id).followed,false);
  await page.locator('.close-dialog').click();ok('new entrant '+id+' has a usable profile without guessed age or automatic follow');
 }
 for(const [id,rank,label] of [['anna-blinkova',73,'法国'],['alina-charaeva',98,'亚美尼亚']]){
  assert.equal(served.players.filter(p=>p.id===id).length,1);
  const row=page.locator(`#rank-body tr[data-rank="${rank}"]`);assert.match(await row.innerText(),new RegExp(label));
  assert.equal(await row.locator('[data-action="player"]').getAttribute('data-id'),id);
 }
 ok('the two country discrepancies preserve existing identities and current official representation');
 await page.locator('[data-rank-review="WTA"]').click();
 const evidence=page.locator('.ranking-evidence').filter({hasText:'本期官方核对'});await evidence.locator('summary').click();
 assert.match(await evidence.innerText(),/完整前100/);assert.match(await evidence.innerText(),/不代表实时或自动更新/);
 await page.screenshot({path:out+'/evidence.png'});await page.locator('.close-dialog').click();ok('source panel does not describe a finite review as continuous live updating');
 await page.locator('[data-action="rankRange"][data-value="76"]').click();assert.equal(await page.locator('#rank-body tr').count(),25);
 await page.locator('#rank-search').fill('Jeanjean');assert.equal(await page.locator('#rank-body tr').count(),1);assert.match(await page.locator('#rank-body').innerText(),/Leolia Jeanjean/);
 ok('range filtering and search include the new entrant');await page.locator('#rank-search').fill('');
 await page.locator('[data-action="rankRange"][data-value="all"]').click();await page.screenshot({path:out+'/desktop.png'});
 for(const id of ['solana-sierra','simona-waltert','emma-raducanu']){
  const p=served.players.find(p=>p.id===id);assert.equal(p.rank,null);assert.equal(p.points,null);assert.equal(p.singlesRankingCoverage.state,'not-in-published-top100');
  assert.ok(!wta.rows.some(r=>r.playerId===id));
 }
 ok('departing players retain history without stale current ranks or invented positions below 100');
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
 phone.on('pageerror',e=>report.errors.push(e.message));await phone.goto(base+'?wta-mobile='+Date.now(),{waitUntil:'networkidle'});
 await phone.locator('#nav a[href="#players"]').tap();await phone.locator('[data-action="rankTour"][data-value="WTA"]').tap();
 assert.equal(await phone.locator('#rank-body tr').count(),100);assert.match(await phone.locator('.ranking-period').innerText(),/2026-10-12/);
 assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.screenshot({path:out+'/mobile.png'});
 await phone.locator('#rank-body [data-id="wta-329199"]').tap();assert.equal(await phone.locator('#dialog-title').innerText(),'Oksana Selekhmeteva');
 assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));ok('390px real touch interaction opens the new profile without horizontal overflow');
 assert.deepEqual(report.errors,[]);ok('no browser JavaScript errors');report.passed=true;
} catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{report.finishedAt=new Date().toISOString();await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
