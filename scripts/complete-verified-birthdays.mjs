/** Two explicitly reviewed Chinese-name variants, corroborated by their ATP identities. */
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preciseBirth,applyBirthdays} from './import-player-birthdays.mjs';
import {assertFreeBuild} from './free-build-guard.mjs';
import {textOf} from '../adapters/public-html.mjs';
import Runtime from '../public/runtime.js';
await assertFreeBuild(process.cwd());
const targets=[
 {id:'yi-zhou',name:'Zhou Yi',title:'Zhou Yi (tennis)',atp:'Z0CQ',birth:'2005-03-14',official:'https://en.rolexshanghaimasters.com/en/players/yi-zhou/z0cq'},
 {id:'zhizhen-zhang',name:'Zhang Zhizhen',title:'Zhang Zhizhen',atp:'Z371',birth:'1996-10-16',official:'https://www.abnamro-open.nl/tennis/spelers/zhizhen-zhang'}
];
const bytes=await readFile('data/content.json'),original=JSON.parse(bytes);
const report={startedAt:new Date().toISOString(),records:[],requests:[],errors:[],sportingDataChanged:false};
async function get(host,params,file){
 assert.ok(['en.wikipedia.org','www.wikidata.org'].includes(host));assert.ok(report.requests.length<2);
 const url='https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',maxlag:'5',...params});
 const r=await fetch(url,{headers:{'User-Agent':'CourtsideIdentityDOB/1.0 (https://courtside-tennis.pages.dev/; bounded CC0 biography check)'},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok){await r.body?.cancel();throw Error('Source HTTP '+r.status);}
 const body=await r.text();if(Buffer.byteLength(body)>1000000)throw Error('Source size limit');const data=JSON.parse(body);if(data.error)throw Error(data.error.code);
 await writeFile('phase2/birthday-completion/'+file,body);report.requests.push({url,checkedAt:new Date().toISOString(),sha256:createHash('sha256').update(body).digest('hex')});return data;
}
await mkdir('phase2/birthday-completion',{recursive:true});
try{
 const mapping=await get('en.wikipedia.org',{action:'query',titles:targets.map(p=>p.title).join('|'),prop:'pageprops',ppprop:'wikibase_item|disambiguation'},'mapping.json');
 const ids=targets.map(t=>{const p=mapping.query?.pages?.find(x=>x.title===t.title);assert.ok(p&&!p.missing&&!Object.hasOwn(p.pageprops||{},'disambiguation'));const q=p.pageprops?.wikibase_item;assert.match(q,/^Q\d+$/);return q;});
 const source=await get('www.wikidata.org',{action:'wbgetentities',ids:ids.join('|'),props:'info|labels|aliases|descriptions|claims',languages:'en|mul'},'birthdays.json');
 for(let i=0;i<targets.length;i++){
  const t=targets[i],p=original.players.find(p=>p.id===t.id),e=source.entities?.[ids[i]];
  assert.ok(p&&e);assert.equal(p.externalIds?.atp?.toUpperCase(),t.atp);
  const external=(e.claims?.P536||[]).filter(c=>c.rank!=='deprecated').map(c=>String(c.mainsnak?.datavalue?.value||'').toUpperCase());
  assert.deepEqual([...new Set(external)],[t.atp]);
  let found=preciseBirth(e,{...p,enName:t.name}),annotation=null;
  if(!found.ok&&t.id==='yi-zhou'&&found.reason==='imprecise_or_qualified_birth_date'){
   // This one reviewed annotation means "most precise value", not an approximate date.
   // Do not relax the generic DOB importer: require a separate actual official page.
   const births=e.claims.P569.filter(c=>c.rank!=='deprecated');assert.equal(births.length,1);const claim=births[0];
   assert.deepEqual(Object.keys(claim.qualifiers||{}),['P459']);assert.equal(claim.qualifiers.P459.length,1);assert.equal(claim.qualifiers.P459[0].datavalue?.value?.id,'Q71536040');
   assert.equal(report.requests.length,2);const r=await fetch(t.official,{headers:{'User-Agent':'CourtsideEditorialReview/1.0 (https://courtside-tennis.pages.dev/)'},redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok){await r.body?.cancel();throw Error('Official birthday cross-check HTTP '+r.status);}
   const html=await r.text();assert.ok(Buffer.byteLength(html)<1000000);const text=textOf(html);assert.match(text,/Yi\s+Zhou/);assert.match(text,/2005[.\/-]03[.\/-]14/);
   await writeFile('phase2/birthday-completion/yi-zhou-official.html',html);report.requests.push({url:t.official,checkedAt:new Date().toISOString(),sha256:createHash('sha256').update(html).digest('hex')});
   annotation={property:'P459',value:'Q71536040',meaning:'most precise value',resolution:'matching date in separately fetched official event profile'};
   const reviewed=structuredClone(e);for(const c of reviewed.claims.P569)if(c.rank!=='deprecated'){delete c.qualifiers;delete c['qualifiers-order'];}found=preciseBirth(reviewed,{...p,enName:t.name});
  }
  assert.ok(found.ok,t.id+': '+found.reason);assert.equal(found.date,t.birth,'Structured date conflicts with the reviewed official profile');
  report.records.push({playerId:p.id,enName:p.enName,ok:true,dateOfBirth:found.date,sourceUrl:'https://www.wikidata.org/wiki/'+ids[i]+'#P569',entityRevision:e.lastrevid,statementIds:found.statementIds,officialCorroboration:t.official,matchedAtpId:t.atp,reviewedAnnotation:annotation});
 }
 report.finishedAt=new Date().toISOString();
 const result=applyBirthdays(original,report,report.finishedAt);
 for(const row of report.records){const p=result.data.players.find(p=>p.id===row.playerId);if(!original.players.find(x=>x.id===p.id).dateOfBirth){p.birthCorroboratingUrl=row.officialCorroboration;p.birthVerification='atp-id-and-official-cross-check';}}
 for(const key of Object.keys(original).filter(k=>!['players','meta'].includes(k)))assert.deepEqual(result.data[key],original[key],key);
 assert.deepEqual(result.data.meta.sourceChecks,original.meta.sourceChecks);assert.deepEqual(result.data.meta.refreshStatus,original.meta.refreshStatus);
 assert.deepEqual(Runtime.validate(result.data),[]);
 report.changed=result.changes;report.revision=result.data.meta.revision;
 if(result.changes){assert.ok((await readFile('data/content.json')).equals(bytes),'Concurrent edit');await writeFile('data/content.json.tmp',JSON.stringify(result.data,null,2)+'\n');await rename('data/content.json.tmp','data/content.json');}
}catch(e){report.errors.push(e.message);report.changed=0;process.exitCode=1;}
report.finishedAt=new Date().toISOString();await writeFile('phase2/birthday-completion/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
