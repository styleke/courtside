"""Three bounded presentation fixes, applied only to uniquely matching source."""
from pathlib import Path

def replace(path, old, new):
    file = Path(path)
    text = file.read_text()
    if new in text:
        return
    assert text.count(old) == 1, f"{path}: expected one matching preimage"
    file.write_text(text.replace(old, new))

def append(path, text):
    file = Path(path)
    current = file.read_text()
    if text not in current:
        file.write_text(current + text)

replace('public/app.js', '${h2hDetail(x)}<section class="dialog-section"><div class="section-heading"><h3>球风对照</h3>', '${h2hDetail(x)}${x.sides.every(side=>side.length===1)?`<section class="dialog-section"><div class="section-heading"><h3>球风对照</h3>')
replace('public/app.js', "</section>${watchStrip(x,{detail:true})}", "</section>`:''}${watchStrip(x,{detail:true})}")

helper = """ function focusPhoto(node){
  const direct=node?.closest?.('.photo-avatar');
  if(direct)return direct;
  return node?.matches?.('button,a[href],[role=\"button\"]')?(node.querySelector?.('.photo-avatar')||null):null;
 }
 function initPreview(doc){"""
replace('public/photos.js', ' function initPreview(doc){', helper)
replace('public/photos.js', "doc.addEventListener('focusin',ev=>{if(touch)return;const a=photoOf(ev.target)||ev.target?.querySelector?.('.photo-avatar');", "doc.addEventListener('focusin',ev=>{if(touch)return;const a=focusPhoto(ev.target);")
replace('public/photos.js', "doc.addEventListener('focusout',ev=>{const a=photoOf(ev.target)||ev.target?.querySelector?.('.photo-avatar');", "doc.addEventListener('focusout',ev=>{const a=focusPhoto(ev.target);")
replace('public/photos.js', 'return {get,avatar,credit,initials,previewPosition};', 'return {get,avatar,credit,initials,previewPosition,focusPhoto};')

append('public/styles.css', '\n/* Keep the deciding match-tiebreak column clear of the winner marker. */\n.scoreboard-primary .arena-score .score-mtb-col{width:55px}.arena-score .score-set-header{white-space:nowrap}\n@media(max-width:760px){.scoreboard-primary .arena-score .score-mtb-col{width:48px}}\n')

append('tests/photo-preview.test.cjs', """
test('focusing a dialog does not select an unrelated descendant portrait',()=>{const photo={};const dialog={closest:()=>null,matches:()=>false,querySelector:()=>photo};assert.equal(P.focusPhoto(dialog),null);});
test('a directly focused portrait retains keyboard enlargement',()=>{const photo={};assert.equal(P.focusPhoto({closest:()=>photo}),photo);});
test('a focused player button retains its portrait enlargement',()=>{const photo={};assert.equal(P.focusPhoto({closest:()=>null,matches:()=>true,querySelector:()=>photo}),photo);});
test('focus target without a portrait is harmless',()=>{assert.equal(P.focusPhoto(null),null);assert.equal(P.focusPhoto({closest:()=>null,matches:()=>true,querySelector:()=>null}),null);});
""")

browser='scripts/browser-profile-acceptance.mjs'
replace(browser, "await card.screenshot({path:dir+'/desktop-card.png'});", """await card.screenshot({path:dir+'/desktop-card.png'});
 await card.locator('.photo-avatar').first().hover();await page.locator('#court-photo-preview').waitFor({state:'visible'});assert.match(await page.locator('#court-photo-preview figcaption').innerText(),/博莱利/);await page.mouse.move(0,0);await page.locator('#court-photo-preview').waitFor({state:'hidden'});ok('intentional desktop hover still enlarges the correct photograph');""")
replace(browser, "await card.locator('[data-action=\"match\"]').first().click();assert.equal", """await card.locator('[data-action="match"]').first().click();await page.waitForTimeout(250);assert.equal(await page.locator('#court-photo-preview:visible').count(),0);assert.doesNotMatch(await page.locator('#dialog-body').innerText(),/球风对照/);ok('doubles detail neither opens an unrelated portrait nor compares only one teammate');assert.equal""")
replace(browser, "await small.screenshot({path:dir+'/mobile-card.png'});", """const mtb=await small.locator('.arena-score').evaluate(table=>{const cell=table.querySelector('tbody tr .set-cell[data-set=\"3\"]');return {width:table.querySelector('col.score-mtb-col')?.getBoundingClientRect().width||0,cellFits:!!cell&&cell.scrollWidth<=cell.clientWidth+1};});assert.ok(mtb.width>=47);assert.ok(mtb.cellFits);ok('mobile deciding match-tiebreak has a dedicated readable column');await small.screenshot({path:dir+'/mobile-card.png'});""")
replace(browser, "await small.locator('[data-action=\"match\"]').first().click();", """await small.locator('[data-action="match"]').first().tap();await phone.waitForTimeout(250);assert.equal(await phone.locator('#court-photo-preview:visible').count(),0);assert.doesNotMatch(await phone.locator('#dialog-body').innerText(),/球风对照/);ok('real touch opens doubles details without a hover overlay or empty singles analysis');""")
print('Scoped profile visibility fixes installed')
