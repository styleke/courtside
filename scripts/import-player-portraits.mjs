/** Import only openly licensed player photos. No tennis scores or rankings are modified. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ua='CourtsidePhotoImport/1.0 (https://github.com/styleke/courtside; non-commercial tennis guide)';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
export function photoLicense(info){
 const x=info.extmetadata||{},v=k=>plain(x[k]?.value),name=v('LicenseShortName'),licenseUrl=v('LicenseUrl').replace(/^http:/,'https:');
 const ok=/^(?:CC BY(?:-SA)? [1-4]\.0|CC0(?: 1\.0)?|Public domain)$/i.test(name);
 if(!ok||v('Restrictions')||v('AttributionRequired')==='true'&&!v('Artist'))return null;
 if(!/^CC0|^Public domain/i.test(name)&&!/^https:\/\/creativecommons\.org\/licenses\/by(?:-sa)?\/[1-4]\.0\//.test(licenseUrl))return null;
 return {license:name,licenseUrl:licenseUrl||'https://creativecommons.org/publicdomain/mark/1.0/',author:v('Artist')||'Public domain',credit:v('Credit'),fileTitle:info.canonicaltitle||'',imageDate:v('DateTimeOriginal')};
}
export function isPlayerEntity(entity,player){
 const labels=[entity.labels?.en?.value,...(entity.aliases?.en||[]).map(x=>x.value)].filter(Boolean);
 const profession=(entity.claims?.P106||[]).map(c=>c.mainsnak?.datavalue?.value?.id);
 const tennis=profession.includes('Q10833314')||/\btennis player\b/i.test(entity.descriptions?.en?.value||'');
 const human=(entity.claims?.P31||[]).some(c=>c.mainsnak?.datavalue?.value?.id==='Q5');
 return human&&tennis&&labels.some(s=>norm(s)===norm(player.enName));
}
async function json(url){
 for(let n=0;n<3;n++){
  await sleep(300);
  const r=await fetch(url,{headers:{'User-Agent':ua,'Accept':'application/json'},signal:AbortSignal.timeout(15000)});
  if([429,503].includes(r.status)){
   await r.body?.cancel();if(n===2)throw Error('Rate limited '+r.status);
   const retry=Number(r.headers.get('retry-after'));await sleep(Math.max(2000,Math.min(60000,(retry||5)*1000)));continue;
  }
  if(!r.ok)throw Error('HTTP '+r.status+' '+new URL(url).hostname);
  const raw=await r.text();if(raw.length>10000000)throw Error('Metadata size limit');
  const d=JSON.parse(raw);if(d.error)throw Error(d.error.code+': '+d.error.info);return d;
 }
 throw Error('No API response');
}
function api(host,values){return 'https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',maxlag:'5',...values});}
const chunks=(xs,n)=>Array.from({length:Math.ceil(xs.length/n)},(_,i)=>xs.slice(i*n,(i+1)*n));
const titleOverrides={
 'carlos-alcaraz':'Carlos Alcaraz','karolina-muchova':'Karolína Muchová','nikola-bartunkova':'Nikola Bartůňková',
 'marat-safin':'Marat Safin','justine-henin':'Justine Henin','roger-federer':'Roger Federer','novak-djokovic':'Novak Djokovic','mirra-andreeva':'Mirra Andreeva',
 'rafael-jodar':'Rafael Jódar','alexander-zverev':'Alexander Zverev','daniil-medvedev':'Daniil Medvedev',
 'zhang-shuai':'Zhang Shuai (tennis)','zheng-qinwen':'Zheng Qinwen','wang-xinyu':'Wang Xinyu',
 'carlos-alcaraz-garfia':'Carlos Alcaraz','rafael-nadal':'Rafael Nadal','naomi-osaka':'Naomi Osaka'
};
const fileOverrides={'carlos-alcaraz':'Carlos Alcaraz US Open 2025 (cropped).jpg'};
async function main(){
 const data=JSON.parse(await readFile(path.join(root,'data/content.json'),'utf8'));
 let previous={schemaVersion:1,photos:{}};try{previous=JSON.parse(await readFile(path.join(root,'public/player-photos.json'),'utf8'));}catch{}
 const photos={...previous.photos},report={startedAt:new Date().toISOString(),records:[],productionTennisDataChanged:false};
 const players=data.players.filter(p=>p.enName).sort((a,b)=>Number(b.followed)-Number(a.followed));
 const limit=Number(process.env.PHOTO_LIMIT)||players.length,selected=players.slice(0,Math.min(limit,300));
 const mapped=new Map(),entityIds=new Set();
 for(const batch of chunks(selected,40)){
  try{
   const response=await json(api('en.wikipedia.org',{action:'query',prop:'pageprops',ppprop:'wikibase_item|disambiguation',redirects:'1',titles:batch.map(p=>titleOverrides[p.id]||p.enName).join('|')}));
   const redirects=new Map([...(response.query?.normalized||[]),...(response.query?.redirects||[])].map(r=>[r.from,r.to]));
   const pages=response.query?.pages||[];
   for(const p of batch){
    let title=titleOverrides[p.id]||p.enName;const seen=new Set();while(redirects.has(title)&&!seen.has(title)){seen.add(title);title=redirects.get(title);}
    const page=pages.find(x=>norm(x.title)===norm(title));
    const qid=page?.pageprops?.wikibase_item;
    if(page&&!page.missing&&!Object.hasOwn(page.pageprops||{},'disambiguation')&&/^Q\d+$/.test(qid||'')){mapped.set(p.id,qid);entityIds.add(qid);}
    else report.records.push({id:p.id,state:'no_verified_entity'});
   }
  }catch(e){report.records.push({stage:'identity',error:String(e.message)});}
 }
 const entities={};
 for(const ids of chunks([...entityIds],40)){
  try{const d=await json(api('www.wikidata.org',{action:'wbgetentities',ids:ids.join('|'),props:'labels|aliases|descriptions|claims',languages:'en'}));Object.assign(entities,d.entities||{});}catch(e){report.records.push({stage:'entities',error:String(e.message)});}
 }
 const candidates=[];
 for(const player of selected){
  const entity=entities[mapped.get(player.id)];if(!entity)continue;
  if(!isPlayerEntity(entity,player)){report.records.push({id:player.id,state:'identity_not_unique',qid:entity.id});continue;}
  const p18=(entity.claims?.P18||[]).filter(c=>c.rank!=='deprecated').sort((a,b)=>Number(b.rank==='preferred')-Number(a.rank==='preferred'))[0]?.mainsnak?.datavalue?.value;
  const file=fileOverrides[player.id]||p18;
  if(typeof file!=='string'||!file||/\.(svg|gif|webm|pdf)$/i.test(file)){report.records.push({id:player.id,state:'no_photo',qid:entity.id});continue;}
  candidates.push({id:player.id,name:player.name,enName:player.enName,qid:entity.id,title:'File:'+file.replace(/^File:/,''),entityRevision:entity.lastrevid});
 }
 const byTitle={};
 for(const batch of chunks(candidates,25)){
  try{
   const d=await json(api('commons.wikimedia.org',{action:'query',prop:'imageinfo',titles:batch.map(p=>p.title).join('|'),iiprop:'url|extmetadata|mime|size|sha1|canonicaltitle',iiurlwidth:'240',iiurlheight:'360'}));
   for(const page of d.query?.pages||[])byTitle[norm(page.title)]=page;
  }catch(e){report.records.push({stage:'licenses',error:String(e.message)});}
 }
 const outDir=path.join(root,'public/images/players');await mkdir(outDir,{recursive:true});
 for(const c of candidates){
  const page=byTitle[norm(c.title)],info=page?.imageinfo?.[0];if(!info||page.imagerepository!=='local'){report.records.push({id:c.id,state:'not_commons_file'});continue;}
  const rights=photoLicense(info);if(!rights){report.records.push({id:c.id,state:'license_not_approved',license:plain(info.extmetadata?.LicenseShortName?.value)});continue;}
  const remote=info.thumburl||info.url,sourcePage=info.descriptionurl;
  const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[info.thumbmime||info.mime];
  if(!ext||!remote||new URL(remote).hostname!=='upload.wikimedia.org'||!/^https:\/\/commons\.wikimedia\.org\//.test(sourcePage||'')){report.records.push({id:c.id,state:'unsupported_image'});continue;}
  const local='images/players/'+c.id+'.'+ext;
  try{
   await sleep(400);
   const r=await fetch(remote,{headers:{'User-Agent':ua},signal:AbortSignal.timeout(15000),redirect:'error'});
   if(!r.ok){await r.body?.cancel();throw Error('HTTP '+r.status);}
   const declared=Number(r.headers.get('content-length'));if(declared>1500000)throw Error('Image too large');
   const image=Buffer.from(await r.arrayBuffer());if(image.length>1500000||image.length<1000)throw Error('Image size rejected');
   const magic=ext==='jpg'?image[0]===255&&image[1]===216:ext==='png'?image[0]===137&&image.subarray(1,4).toString()==='PNG':image.subarray(0,4).toString()==='RIFF';
   if(!magic)throw Error('Image content mismatch');
   await writeFile(path.join(root,'public',local),image);
   photos[c.id]={...rights,playerId:c.id,name:c.name,enName:c.enName,wikidataId:c.qid,identitySource:'https://www.wikidata.org/wiki/'+c.qid,sourcePage,fileTitle:c.title,sourceImage:remote,src:local,sha256:createHash('sha256').update(image).digest('hex'),verifiedAt:new Date().toISOString(),width:info.thumbwidth||info.width,height:info.thumbheight||info.height,objectPosition:'50% 20%',adjustment:'Displayed as a circular crop; original license retained.'};
   report.records.push({id:c.id,state:'imported',license:rights.license,bytes:image.length});
  }catch(e){report.records.push({id:c.id,state:'image_failed',error:String(e.message)});}
 }
 report.finishedAt=new Date().toISOString();report.summary={requested:selected.length,identityCandidates:mapped.size,commonsCandidates:candidates.length,totalPhotos:Object.keys(photos).length,newPhotos:report.records.filter(x=>x.state==='imported').length,followedWithPhotos:players.filter(x=>x.followed&&photos[x.id]).length,followedTotal:players.filter(x=>x.followed).length};
 await mkdir(path.join(root,'phase1'),{recursive:true});await writeFile(path.join(root,'phase1/photo-import.json'),JSON.stringify(report,null,2));
 if(report.summary.newPhotos===0){console.log(JSON.stringify(report,null,2));throw Error('No photo imported; existing files are not replaced.');}
 const manifest={schemaVersion:1,updatedAt:report.finishedAt,photos};
 await writeFile(path.join(root,'public/player-photos.json'),JSON.stringify(manifest,null,2));
 await writeFile(path.join(root,'public/player-photos-data.js'),'window.COURTSIDE_PHOTOS = '+JSON.stringify(manifest).replace(/</g,'\\u003c')+';\n');
 console.log(JSON.stringify(report,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
