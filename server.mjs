import http from 'node:http';
import {readFile,writeFile,rename,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import Core from './public/core.js';
import {Refresher,validateContent} from './services/refresh.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const DATA=process.env.DATA_FILE?path.resolve(process.env.DATA_FILE):path.join(ROOT,'data/content.json');
const HOST=process.env.HOST||'127.0.0.1';const PORT=Number(process.env.PORT||8787);
const TOKEN=process.env.ADMIN_TOKEN||randomBytes(24).toString('hex');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
let writing=false;
async function snapshot(){return JSON.parse(await readFile(DATA,'utf8'));}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
function authorized(req){const got=(req.headers.authorization||'').replace(/^Bearer /,'');const a=Buffer.from(got),b=Buffer.from(TOKEN);return a.length===b.length&&timingSafeEqual(a,b);}
async function body(req){let b='';for await(const c of req){b+=c;if(Buffer.byteLength(b)>2000000){const e=new Error('请求不能超过 2 MB');e.status=413;throw e;}}return JSON.parse(b);}
const sourceConfig=JSON.parse(await readFile(process.env.SOURCE_CONFIG||path.join(ROOT,'config/sources.json'),'utf8'));
async function commitUpdate(transform){
 if(writing)throw new Error('内容正在保存，下次更新会重试');writing=true;
 try{const current=await snapshot(),next=transform(current);const errors=validateContent(next);if(errors.length)throw new Error(errors.join(';'));
 next.meta.revision=current.meta.revision+1;next.meta.updatedAt=new Date().toISOString();
 await mkdir(path.join(ROOT,'backups'),{recursive:true});await writeFile(path.join(ROOT,'backups',`revision-${current.meta.revision}-${Date.now()}.json`),JSON.stringify(current));
 await writeFile(DATA+'.tmp',JSON.stringify(next,null,2));await rename(DATA+'.tmp',DATA);return next;
 }finally{writing=false;}
}
const refresher=new Refresher({config:sourceConfig,read:snapshot,commit:commitUpdate});
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");try{const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/api/data'){send(res,200,await snapshot());return;}
 if(req.method==='GET'&&u.pathname==='/api/health'){send(res,200,{ok:true,storage:'json-file',...refresher.health(),wechatConnected:false});return;}
 if(req.method==='POST'&&u.pathname==='/api/refresh'){
 if(!authorized(req)){send(res,401,{error:'需要管理员权限'});return;}
 const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host){send(res,403,{error:'拒绝跨站写入'});return;}
 if(!(req.headers['content-type']||'').startsWith('application/json')){send(res,415,{error:'仅接受JSON'});return;}
 const payload=await body(req);if(!['scores','rankings','broadcasts','tickets','profiles'].includes(payload.channel)){send(res,422,{error:'通道无效'});return;}
 const result=await refresher.run(payload.channel,{force:true});send(res,result.blocked?503:result.status==='error'?502:200,result);return;
 }
 if(req.method==='POST'&&u.pathname==='/api/data'){
  if(!authorized(req)){send(res,401,{error:'需要管理员令牌；查看启动终端或 ADMIN_TOKEN 配置'});return;}
  const origin=req.headers.origin;if(origin&&new URL(origin).host!==req.headers.host){send(res,403,{error:'拒绝跨站写入'});return;}
  if(!(req.headers['content-type']||'').startsWith('application/json')){send(res,415,{error:'仅接受 application/json'});return;}
  if(writing){send(res,409,{error:'正在写入，请重新加载后重试'});return;}writing=true;
  try{const incoming=await body(req);const current=await snapshot();if(incoming.baseRevision!==current.meta.revision){send(res,409,{error:'数据已被其他管理员更新。请先导出本地草稿，再重新加载服务器数据。'});return;}if(current.meta.mode==='reviewed'&&incoming.data?.meta?.mode!=='reviewed'){send(res,422,{error:'真实数据版不能被演示快照覆盖'});return;}const errors=validateContent(incoming.data);if(errors.length){send(res,422,{error:errors.join('\n')});return;}const next=incoming.data;next.meta.revision=current.meta.revision+1;next.meta.updatedAt=new Date().toISOString();await mkdir(path.join(ROOT,'backups'),{recursive:true});await writeFile(path.join(ROOT,'backups',`revision-${current.meta.revision}-${Date.now()}.json`),JSON.stringify(current,null,2));const temp=DATA+'.tmp';await writeFile(temp,JSON.stringify(next,null,2));await rename(temp,DATA);send(res,200,next);}finally{writing=false;}return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'不支持的方法'});return;}
 if(u.pathname.startsWith('/api/')){send(res,404,{error:'接口不存在'});return;}
 const relative=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname);const file=path.resolve(ROOT,'public','.'+relative);const pub=path.resolve(ROOT,'public')+path.sep;
 if(!file.startsWith(pub)){send(res,403,{error:'禁止访问'});return;}
 const info=await stat(file).catch(()=>null);if(!info?.isFile()){send(res,404,{error:'文件不存在'});return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch(e){send(res,e.status||500,{error:e instanceof SyntaxError?'JSON 格式错误':e.message});}});
server.listen(PORT,HOST,()=>{if(process.env.AUTO_REFRESH!=='false')refresher.start();console.log(`\n场边网站：http://${HOST}:${PORT}\n管理员令牌：${TOKEN}\n仅监听 ${HOST}。更新策略已配置；仅已连接且允许自动访问的数据源会运行。查看 /api/health 核实状态。未连接微信。\n`);});

process.on('SIGTERM',()=>{refresher.stop();server.close();});
