/** Copy only listed, local portrait files; a broken or unlicensed manifest stops publication. */
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function buildPortraits(root,site){
 let manifest;try{manifest=JSON.parse(await readFile(path.join(root,'public/player-photos.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return;throw error;}
 if(manifest.schemaVersion!==1||!manifest.photos||Object.keys(manifest.photos).length>1000)throw Error('Invalid portrait manifest');
 const rows=[];await mkdir(path.join(site,'images/players'),{recursive:true});
 for(const [id,p] of Object.entries(manifest.photos)){
  if(p.displayAllowed===false)continue;
  if(p.playerId!==id||!/^images\/players\/[a-z0-9_-]+\.(jpg|png|webp)$/.test(p.src)||!p.author||!p.license||!/^https:\/\/commons\.wikimedia\.org\//.test(p.sourcePage)||!/^https:\/\/(?:creativecommons\.org|commons\.wikimedia\.org)\//.test(p.licenseUrl))throw Error('Unverified photo '+id);
  const bytes=await readFile(path.join(root,'public',p.src));if(createHash('sha256').update(bytes).digest('hex')!==p.sha256)throw Error('Photo bytes differ '+id);
  await copyFile(path.join(root,'public',p.src),path.join(site,p.src));
  if(p.previewSrc){
   if(!/^images\/players\/[a-z0-9_-]+\.(jpg|png|webp)$/.test(p.previewSrc)||!p.previewSha256)throw Error('Invalid preview '+id);
   const large=await readFile(path.join(root,'public',p.previewSrc));if(createHash('sha256').update(large).digest('hex')!==p.previewSha256)throw Error('Preview bytes differ '+id);
   await copyFile(path.join(root,'public',p.previewSrc),path.join(site,p.previewSrc));
  }
  rows.push(`<article id="${esc(id)}"><img src="${esc(p.src)}" width="80" height="80" loading="lazy" alt="${esc(p.name)}"><div><h2>${esc(p.name)}</h2><p>${esc(p.enName)}</p><p>摄影／作者：${esc(p.author)}</p><p><a href="${esc(p.sourcePage)}">原始文件与来源</a> · <a href="${esc(p.licenseUrl)}">${esc(p.license)}</a></p><small>用于球员资料展示，缩略与圆形裁切；图片沿用原许可。不是球员对本站的代言。</small></div></article>`);
 }
 for(const f of ['photos.js','photos.css','player-photos-data.js','player-photos.json'])await copyFile(path.join(root,'public',f),path.join(site,f));
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>图片署名 · 场边 Courtside</title><style>body{margin:0;background:#f5f6f0;color:#18342a;font:14px/1.7 system-ui,sans-serif}main{max-width:880px;margin:auto;padding:28px 22px}h1{font-size:26px}h2,p{margin:0}h2{font-size:18px}article{display:flex;gap:20px;background:white;padding:20px;border-radius:12px;margin:14px 0;scroll-margin:20px}img{border-radius:50%;object-fit:cover;object-position:50% 20%;flex-shrink:0}small{color:#637465}a{color:#245c41}article:target{outline:2px solid #245c41}@media(max-width:500px){article{padding:14px;gap:12px}img{width:52px;height:52px}}</style><main><a href="./">← 回到场边</a><h1>球员照片与署名</h1><p>照片来自 Wikimedia Commons。各张图片的作者、原始文件和许可如下。</p>${rows.join('')}</main></html>`;
 await writeFile(path.join(site,'photo-credits.html'),html);
}
