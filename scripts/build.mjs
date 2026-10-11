/** Build a single-file preview AND a same-origin static site. No backend endpoints required. */
import {readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import path from 'node:path';
import Runtime from '../public/runtime.js';
import {buildPortraits} from './build-portraits.mjs';
import {assertFreeBuild} from './free-build-guard.mjs';
import {profileCompleteness} from './audit-player-completeness.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
await assertFreeBuild(root);
const original=JSON.parse(await readFile(path.join(root,'data/content.json'),'utf8'));
const errors=Runtime.validate(original);if(errors.length)throw new Error(errors.join('\n'));
const data=Runtime.publicData(original),seed='window.COURTSIDE_SEED = '+JSON.stringify(data).replace(/</g,'\\u003c')+';';
await writeFile(path.join(root,'public/data.js'),seed);
const site=path.join(root,'dist/site');await rm(site,{recursive:true,force:true});await mkdir(path.join(site,'data'),{recursive:true});
const config="window.COURTSIDE_CONFIG = {mode:'static',publicDataOrigin:'github-pages',pollMs:60000};";
let status;try{status=JSON.parse(await readFile(path.join(root,'data/automation-status.json'),'utf8'));}catch{status={generatedAt:null,automaticSourceSync:false,jobs:[]};}
const files=['index.html','styles.css','core.js','domain-v06.js','runtime.js','ages.js','app.js'];
for(const f of files)await copyFile(path.join(root,'public',f),path.join(site,f));
await writeFile(path.join(site,'site-config.js'),config);await writeFile(path.join(site,'data.js'),seed);
await writeFile(path.join(site,'data/content.json'),JSON.stringify(data));await writeFile(path.join(site,'data/status.json'),JSON.stringify(status));await writeFile(path.join(site,'.nojekyll'),'');
await buildPortraits(root,site);
const profileAudit=profileCompleteness(data,JSON.parse(await readFile(path.join(root,'public/player-photos.json'),'utf8')));
await mkdir(path.join(root,'phase2'),{recursive:true});await writeFile(path.join(root,'phase2/profile-completeness.json'),JSON.stringify(profileAudit,null,2));
console.log(JSON.stringify({profileAudit:{date:profileAudit.date,referencedPlayers:profileAudit.referencedPlayers,playersWithGaps:profileAudit.playersWithGaps,h2hGaps:profileAudit.h2hGaps.length},fullCoverageClaimed:false}));
let html=await readFile(path.join(root,'public/index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="styles.css">',`<style>${await readFile(path.join(root,'public/styles.css'),'utf8')}</style>`);
html=html.replace('<link rel="stylesheet" href="photos.css">',`<style>${await readFile(path.join(root,'public/photos.css'),'utf8')}</style>`);
for(const file of ['core.js','domain-v06.js','runtime.js','site-config.js','data.js','player-photos-data.js','photos.js','ages.js','app.js']){
 const text=file==='site-config.js'?"window.COURTSIDE_CONFIG = {mode:'snapshot',pollMs:60000};":await readFile(path.join(root,'public',file),'utf8');
 html=html.replace(`<script src="${file}"></script>`,`<script>${text.replace(/<\/script/gi,'<\\/script')}</script>`);
}
await writeFile(path.join(root,'dist/courtside-preview.html'),html);
console.log(JSON.stringify({site:'dist/site',preview:'dist/courtside-preview.html',dataRevision:data.meta.revision,publicFilesOnly:true,publicDeploymentPerformed:false}));
