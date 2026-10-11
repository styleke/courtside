/** Actual browser checks against the public site. No fixtures or response interception. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.COURTSIDE_SITE_URL||'https://styleke.github.io/courtside/';
assert.equal(new URL(base).origin,'https://styleke.github.io');assert.equal(new URL(base).pathname,'/courtside/');
const dir='phase2/browser';await mkdir(dir,{recursive:true});
const report={url:base,startedAt:new Date().toISOString(),runId:process.env.GITHUB_RUN_ID||null,mode:'actual-public-browser',noNetworkMocks:true,checks:[],errors:[],productionDataWritten:false};
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push(e.message));
const pass=name=>report.checks.push({name,passed:true});
try{
 for(let n=0;n<12;n++){await page.goto(base+'?ui-check='+process.env.GITHUB_RUN_ID,{waitUntil:'networkidle',timeout:30000});if(await page.evaluate(()=>typeof window.CourtPhotos?.previewPosition==='function'))break;if(n===11)throw Error('Updated portrait code not deployed');await page.waitForTimeout(10000);}
 await page.locator('#main .page-heading').waitFor();pass('homepage renders from live resources');
 const baseline=await page.evaluate(async()=>{const r=await fetch('data/content.json');if(!r.ok)throw Error('data missing');return r.json();});
 report.dataRevision=baseline.meta.revision;report.snapshotUpdatedAt=baseline.meta.updatedAt;
 const day=baseline.meta.asOfDate;await page.locator('input[type=date]').fill(day);await page.locator('input[type=date]').dispatchEvent('change');
 let avatar=page.locator('#main .photo-avatar:has(img)').first();await avatar.scrollIntoViewIfNeeded();await avatar.locator('img').evaluate(img=>img.decode());
 const before=await avatar.boundingBox();await avatar.hover();const tip=page.locator('#court-photo-preview');await tip.waitFor({state:'visible'});pass('hover opens large photo');
 const box=await tip.boundingBox();assert.ok(box.width>=200);assert.ok(box.x>=0&&box.x+box.width<=1440);assert.ok(box.y>=0&&box.y+box.height<=1000);assert.deepEqual(await avatar.boundingBox(),before);pass('preview does not move card and stays in viewport');
 await page.screenshot({path:dir+'/desktop-hover.png'});
 await page.mouse.move(box.x+box.width/2,box.y+30);await page.waitForTimeout(250);assert.ok(await tip.isVisible());pass('preview remains visible when pointer enters it');
 await page.mouse.move(1410,80);await page.waitForTimeout(250);assert.ok(await tip.isHidden());pass('pointer leaving closes preview');
 await avatar.focus();await tip.waitFor({state:'visible'});pass('keyboard focus opens preview');await page.keyboard.press('Escape');assert.ok(await tip.isHidden());pass('Escape closes preview');
 await avatar.hover();await tip.waitFor({state:'visible'});await page.evaluate(()=>window.scrollBy(0,60));await page.waitForTimeout(120);assert.ok(await tip.isHidden());pass('scroll dismisses overlay');
 await page.locator('.match-card [data-action="match"]').first().click();await page.locator('#overlay').waitFor({state:'visible'});avatar=page.locator('#dialog-body .photo-avatar:has(img)').first();await avatar.scrollIntoViewIfNeeded();await avatar.locator('img').evaluate(img=>img.decode());await avatar.hover();await tip.waitFor({state:'visible'});await page.keyboard.press('Escape');assert.ok(await tip.isHidden());assert.ok(await page.locator('#overlay').isVisible());await page.keyboard.press('Escape');assert.ok(await page.locator('#overlay').isHidden());pass('portrait preview does not break match dialog close behavior');
 for(const id of ['players','calendar','discover','knowledge','today']){await page.locator('#nav a[href="#'+id+'"]').click();await page.locator('#main .page-heading').waitFor();assert.ok(await page.locator('#main').innerText());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));pass(id+' desktop navigation');if(id==='players'){avatar=page.locator('.ranking-table .photo-avatar:has(img)').first();await avatar.scrollIntoViewIfNeeded();await avatar.locator('img').evaluate(img=>img.decode());await avatar.hover();await tip.waitFor({state:'visible'});await page.screenshot({path:dir+'/ranking-hover.png'});await page.keyboard.press('Escape');}}
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});phone.on('pageerror',e=>report.errors.push(e.message));await phone.goto(base,{waitUntil:'networkidle'});
 await phone.locator('input[type=date]').fill(day);await phone.locator('input[type=date]').dispatchEvent('change');avatar=phone.locator('#main .photo-avatar:has(img)').first();await avatar.scrollIntoViewIfNeeded();await avatar.tap();await phone.waitForTimeout(250);assert.equal(await phone.locator('#court-photo-preview:visible').count(),0);pass('touch does not leave a sticky hover overlay');
 await phone.screenshot({path:dir+'/mobile-match.png'});
 for(const id of ['players','calendar','discover','knowledge','today']){await phone.locator('#nav a[href="#'+id+'"]').click();await phone.locator('#main .page-heading').waitFor();assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));pass(id+' mobile navigation');}
 assert.equal(report.errors.length,0);pass('no JavaScript page errors');report.collection=await page.evaluate(async()=>{const x=await(await fetch('data/status.json')).json();return {automaticSourceSync:x.automaticSourceSync,schedulerRunning:x.schedulerRunning};});report.passed=true;
}catch(error){report.passed=false;report.failure=error.message;await page.screenshot({path:dir+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
