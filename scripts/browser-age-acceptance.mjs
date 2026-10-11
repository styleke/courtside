/** Real website acceptance. No intercepted HTTP, no fixture response substitution. */
import assert from 'node:assert/strict';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {chromium} from 'playwright';
const base='https://courtside-tennis.pages.dev/',dir='phase2/age-browser';await mkdir(dir,{recursive:true});
const expected=JSON.parse(await readFile('data/content.json','utf8'));const report={url:base,startedAt:new Date().toISOString(),noNetworkMocks:true,checks:[],errors:[]};
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
const ok=name=>report.checks.push({name,passed:true});
try{
 await page.goto(base+'?ages='+process.env.GITHUB_RUN_ID,{waitUntil:'networkidle',timeout:45000});await page.locator('#main .page-heading').waitFor();
 const remote=await page.evaluate(async()=>{const url=window.CourtRuntime.publishedDataURL('data/content.json',document.baseURI,window.COURTSIDE_CONFIG);const r=await fetch(url);if(!r.ok)throw Error('data HTTP '+r.status);return {url,data:await r.json()};});
 assert.ok(remote.data.meta.revision>=expected.meta.revision);assert.equal(remote.url,'https://styleke.github.io/courtside/data/content.json');report.revision=remote.data.meta.revision;ok('brand website reads updated shared data');
 for(const tour of ['ATP','WTA']){
  await page.locator('#nav a[href="#players"]').click();await page.locator(`[data-action="rankTour"][data-value="${tour}"]`).click();
  await page.waitForFunction(()=>document.querySelectorAll('#rank-body .player-age').length===100);assert.equal(await page.locator('#rank-body tr').count(),100);
  const rows=await page.locator('#rank-body .player-age').evaluateAll(ns=>ns.map(n=>({id:n.dataset.playerAge,text:n.textContent})));
  const computed=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,window.CourtAge.of(window.COURTSIDE_SEED.players.find(p=>p.id===id))+' 岁'])),rows.map(r=>r.id));
  for(const row of rows)assert.equal(row.text,computed[row.id]);ok(tour+' all 100 age labels equal full-DOB calculation');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));ok(tour+' desktop ranking has no horizontal overflow');
  await page.screenshot({path:dir+'/'+tour.toLowerCase()+'-rankings-desktop.png'});
 }
 await page.locator('#rank-search').fill('Muchova');await page.locator('#rank-body [data-action="player"]').first().click();await page.locator('#overlay').waitFor({state:'visible'});
 assert.equal(await page.locator('.profile-heading .player-age').textContent(),await page.evaluate(()=>window.CourtAge.years('1996-08-21')+' 岁'));ok('profile includes the current age');
 await page.locator('#dialog-body details.provenance summary').click();assert.ok(await page.locator('#dialog-body').getByText('出生日期：1996-08-21',{exact:false}).count());ok('birthday and evidence are in folded provenance');
 await page.locator('.close-dialog').click();await page.locator('#rank-search').fill('');await page.locator('[data-action="rankTour"][data-value="ATP"]').click();
 const avatar=page.locator('.photo-avatar[data-photo-player="carlos-alcaraz"]').first();await avatar.scrollIntoViewIfNeeded();await avatar.locator('img').evaluate(x=>x.decode());await avatar.hover();await page.locator('#court-photo-preview').waitFor({state:'visible'});await page.screenshot({path:dir+'/age-and-photo-hover.png'});await page.keyboard.press('Escape');ok('larger photo hover still works beside age labels');
 for(const id of ['calendar','discover','knowledge','today']){await page.locator('#nav a[href="#'+id+'"]').click();await page.locator('#main .page-heading').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));ok('desktop '+id);}
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});phone.on('pageerror',e=>report.errors.push(e.message));await phone.goto(base,{waitUntil:'networkidle'});
 for(const tour of ['ATP','WTA']){await phone.locator('#nav a[href="#players"]').click();await phone.locator(`[data-action="rankTour"][data-value="${tour}"]`).click();await phone.waitForFunction(()=>document.querySelectorAll('#rank-body .player-age').length===100);assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.screenshot({path:dir+'/'+tour.toLowerCase()+'-rankings-mobile.png'});ok(tour+' 100 mobile ages, no page overflow');}
 for(const id of ['calendar','discover','knowledge','today']){await phone.locator('#nav a[href="#'+id+'"]').click();await phone.locator('#main .page-heading').waitFor();assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));ok('mobile '+id);}
 const state=await page.evaluate(async()=>{const r=await fetch(window.CourtRuntime.publishedDataURL('data/status.json',document.baseURI,window.COURTSIDE_CONFIG));return r.json();});assert.equal(state.automaticSourceSync,false);ok('no false automatic-result claim');assert.equal(report.errors.length,0);ok('no page JavaScript errors');report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;await page.screenshot({path:dir+'/failure.png'}).catch(()=>{});process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
