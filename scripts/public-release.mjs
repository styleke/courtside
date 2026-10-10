/** Curate a public code release. No account operations, source fetching, or upload occurs. */
import {readdir,lstat,readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const rootFiles=new Set(['package.json','.gitignore','server.mjs','publish-mac.command','publish-windows.cmd']);
const trees=new Set(['public','data','adapters','config','services','scripts','tests','.github']);
const blockedParts=new Set(['.git','.env','node_modules','research','backups','snapshots','test-results','phase1']);
export function isPublicPath(relative){
 const p=relative.replace(/\\/g,'/'),parts=p.split('/');
 if(p.startsWith('/')||parts.some(x=>x==='..'||!x))return false;
 if(parts.some(x=>blockedParts.has(x)||/^\.env(?:\.|$)/i.test(x)||/^(?:WORKBUDDY|PRIVATE|HANDOFF)/i.test(x)))return false;
 if(/\.(?:pem|p12|key|log|tmp)$/i.test(p))return false;
 if(p==='docs/PUBLIC_STATUS.md'||p==='docs/PUBLIC_README.md')return true;
 if(rootFiles.has(p))return true;
 if(!trees.has(parts[0]))return false;
 return /\.(?:js|mjs|cjs|json|css|html|yml|yaml|md|cmd|command)$/.test(p);
}
export function findSecret(text){
 const checks=[['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['github-token',/\bgh[pousr]_[A-Za-z0-9]{36,}\b/],['fine-grained-token',/\bgithub_pat_[A-Za-z0-9_]{60,}\b/],['chat-sandbox-path',/\/mnt\/data\/user-[A-Za-z0-9]/]];
 return checks.find(([,re])=>re.test(text))?.[0]||null;
}
export async function collectPublicPaths(root){
 const files=[];
 // Root README is publishable only if identical to the curated public template.
 let safeReadme=null;try{safeReadme=await readFile(path.join(root,'docs/PUBLIC_README.md'));}catch{}
 async function walk(dir,prefix=''){
  for(const name of (await readdir(dir)).sort()){
   const rel=prefix?prefix+'/'+name:name,abs=path.join(dir,name),st=await lstat(abs);
   if(st.isSymbolicLink()){if(isPublicPath(rel)||trees.has(name))throw new Error('拒绝发布符号链接：'+rel);continue;}
   if(st.isDirectory()){
    if(blockedParts.has(name)||name==='dist')continue;
    if(!prefix&&!trees.has(name)&&name!=='docs')continue;
    await walk(abs,rel);
   }else if(st.isFile()&&(isPublicPath(rel)||rel==='README.md')){
    const raw=await readFile(abs);if(rel==='README.md'&&(!safeReadme||!raw.equals(safeReadme)))continue;
    const secret=findSecret(raw.toString('utf8'));if(secret)throw new Error('发布扫描未通过：'+rel+' / '+secret);
    files.push({path:rel,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')});
   }
  }
 }
 await walk(root);return files;
}
export async function writePublicRelease(root,target){
 const list=await collectPublicPaths(root);if(!list.length)throw new Error('公开文件列表为空');
 await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
 for(const f of list){const dest=path.join(target,f.path);await mkdir(path.dirname(dest),{recursive:true});await copyFile(path.join(root,f.path),dest);}
 // Never copy the internal project README wholesale.
 await copyFile(path.join(root,'docs/PUBLIC_README.md'),path.join(target,'README.md'));
 const readme=await readFile(path.join(target,'README.md'));
 const published=list.filter(f=>f.path!=='README.md').concat({path:'README.md',bytes:readme.length,sha256:createHash('sha256').update(readme).digest('hex')}).sort((a,b)=>a.path.localeCompare(b.path));
 const manifest={createdAt:new Date().toISOString(),files:published,readmeFrom:'docs/PUBLIC_README.md',totalBytes:published.reduce((n,f)=>n+f.bytes,0),privateDocsExcluded:true,uploaded:false};
 await mkdir(path.join(root,'phase1'),{recursive:true});await writeFile(path.join(root,'phase1/public-release-manifest.json'),JSON.stringify(manifest,null,2));
 return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),out=path.join(root,'dist/public-release');
 const m=await writePublicRelease(root,out);console.log(JSON.stringify({directory:'dist/public-release',files:m.files.length,bytes:m.totalBytes,privateDocsExcluded:true,uploaded:false}));
}
