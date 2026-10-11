/** Fetch only reviewed Wikimedia titles. Never modifies sporting data or enables schedules. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {photoLicense} from './import-player-portraits.mjs';
const ua='CourtsideCuratedPhotos/1.0 (https://courtside-tennis.pages.dev/)';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function get(url,json=false){
 const u=new URL(url);
 if(u.protocol!=='https:'||u.username||u.password||!['commons.wikimedia.org','thumb.wikimedia.org','upload.wikimedia.org'].includes(u.hostname))throw Error('Unapproved image source');
 for(let n=0;n<3;n++){
  await delay(550);
  const r=await fetch(u,{headers:{'User-Agent':ua},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(r.status===429||r.status===503){await r.body?.cancel();if(n===2)throw Error('Image source rate limited');const retry=Number(r.headers.get('retry-after'))||5;await delay(Math.min(60,Math.max(2,retry))*1000);continue;}
  if(!r.ok){await r.body?.cancel();throw Error('Image source HTTP '+r.status);}
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>3000000)throw Error('Image response exceeds local limit');
  if(!json)return bytes;
  const d=JSON.parse(bytes.toString('utf8'));if(d.error?.code==='maxlag'&&n<2){await delay(5000);continue;}if(d.error)throw Error(d.error.code);return d;
 }
 throw Error('No usable image response');
}
const decisions=JSON.parse(await readFile('config/curated-portraits.json','utf8')).entries;
const manifest=JSON.parse(await readFile('public/player-photos.json','utf8'));
const tennisHash=digest(await readFile('data/content.json'));
const allowed=decisions.filter(x=>x.decision==='approved');
if(allowed.length>10||new Set(decisions.map(x=>x.playerId)).size!==decisions.length)throw Error('Unbounded/duplicate photo update');
const metadata={};
for(const size of [160,720]){
 const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',maxlag:'5',prop:'imageinfo',titles:allowed.map(x=>x.fileTitle).join('|'),iiprop:'url|extmetadata|mime|size|canonicaltitle',iiurlwidth:String(size),iiurlheight:String(size*1.5)});
 const d=await get(url,true);metadata[size]=new Map((d.query?.pages||[]).map(x=>[x.title,x]));
}
const staged=[],records=[];
for(const choice of decisions){
 const old=manifest.photos[choice.playerId];if(!old)throw Error('Unknown photo identity '+choice.playerId);
 if(choice.decision==='withheld'){
  manifest.photos[choice.playerId]={...old,displayAllowed:false,selectionLocked:true,selectionReview:{reviewedAt:choice.reviewedAt,decision:'withheld',reason:choice.reason}};
  records.push({id:choice.playerId,state:'withheld'});continue;
 }
 const small=metadata[160].get(choice.fileTitle),large=metadata[720].get(choice.fileTitle);
 const info=large?.imageinfo?.[0],thumb=small?.imageinfo?.[0];
 const rights=info&&photoLicense(info);
 if(!rights||small?.imagerepository!=='local'||large?.imagerepository!=='local'||!thumb)throw Error('Unverified photo '+choice.playerId);
 const decode=s=>decodeURIComponent(s).replaceAll('_',' ');
 if(decode(info.descriptionurl)!==decode(choice.sourcePage))throw Error('Photo source identity changed '+choice.playerId);
 const versions=[];
 for(const [kind,img] of [['small',thumb],['large',info]]){
  const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[img.thumbmime||img.mime];if(!ext)throw Error('Unsupported raster image');
  const bytes=await get(img.thumburl||img.url);if(bytes.length<1000)throw Error('Empty image');
  const magic=ext==='jpg'?bytes[0]===255&&bytes[1]===216:ext==='png'?bytes[0]===137&&bytes.subarray(1,4).toString()==='PNG':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(!magic)throw Error('Image header mismatch');
  const hash=digest(bytes),src='images/players/'+choice.playerId+'-'+kind+'-'+hash.slice(0,10)+'.'+ext;
  staged.push([src,bytes]);versions.push({src,sha256:hash,width:img.thumbwidth||img.width,height:img.thumbheight||img.height,sourceImage:img.thumburl||img.url});
 }
 const [a,b]=versions;
 manifest.photos[choice.playerId]={...old,...rights,fileTitle:choice.fileTitle,sourcePage:info.descriptionurl,...a,previewSrc:b.src,previewSha256:b.sha256,previewWidth:b.width,previewHeight:b.height,sourceType:'wikimedia-commons',displayAllowed:true,selectionLocked:true,objectPosition:choice.objectPosition,verifiedAt:new Date().toISOString(),selectionReview:{reviewedAt:choice.reviewedAt,decision:'approved',basis:choice.reviewBasis},adjustment:'Reviewed licensed photo. Separate thumbnail and larger preview; proportional display, no generated face.'};
 records.push({id:choice.playerId,state:old.fileTitle===choice.fileTitle?'retained-and-upgraded':'reselected',sourcePage:info.descriptionurl,license:rights.license});
}
await mkdir('public/images/players',{recursive:true});
for(const [src,bytes] of staged)await writeFile('public/'+src,bytes);
manifest.updatedAt=new Date().toISOString();
await writeFile('public/player-photos.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('public/player-photos-data.js','window.COURTSIDE_PHOTOS = '+JSON.stringify(manifest).replace(/</g,'\\u003c')+';\n');
if(digest(await readFile('data/content.json'))!==tennisHash)throw Error('Sporting data changed');
await mkdir('phase2',{recursive:true});
await writeFile('phase2/curated-photos.json',JSON.stringify({at:manifest.updatedAt,records,sportingDataUnchanged:true,photographyFeesUSD:0},null,2));
console.log(JSON.stringify({records,sportingDataUnchanged:true},null,2));
