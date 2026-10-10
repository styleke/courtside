/** Publish this reviewed project from an authenticated user's own computer.
 * Creates ONE NEW public repository. Never modifies an existing repository or enables paid plans.
 * Prints a website URL only after Pages reports a URL and an HTTP check succeeds.
 */
import {spawnSync} from 'node:child_process';import {existsSync} from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {collectPublicPaths} from './public-release.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));process.chdir(root);
const exec=(cmd,args,{input,allowFailure=false,capture=true}={})=>{const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',input,stdio:capture?['pipe','pipe','pipe']:'inherit',shell:false});if(r.error||r.status!==0){if(allowFailure)return null;throw new Error(`${cmd} 执行失败：${r.error?.message||r.stderr||r.status}`);}return capture?r.stdout.trim():'';};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 if(Number(process.versions.node.split('.')[0])<22)throw new Error('需要 Node.js 22 或以上版本。');
 if(!exec('git',['--version'],{allowFailure:true}))throw new Error('请安装 Git 后重试。');
 if(!exec('gh',['--version'],{allowFailure:true}))throw new Error('请先安装 GitHub CLI：https://cli.github.com/ 。不要在聊天中粘贴密钥。');
 if(exec('gh',['auth','status','--hostname','github.com'],{allowFailure:true})===null)exec('gh',['auth','login','--hostname','github.com','--web','--git-protocol','https','--scopes','repo,workflow'],{capture:false});
 const account=JSON.parse(exec('gh',['api','user'])),name=process.argv[2]||'courtside';
 if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,60}$/.test(name))throw new Error('仓库名格式无效');
 const repo=`${account.login}/${name}`;
 if(existsSync('.git'))throw new Error('目录已经有 Git 配置。请使用全新解压目录，避免改动已有项目。');
 if(exec('gh',['repo','view',repo,'--json','name'],{allowFailure:true}))throw new Error(`${repo} 已存在。请换一个仓库名；不会覆盖原仓库。`);
 exec(process.execPath,['scripts/preflight.mjs'],{capture:false});
 exec(process.execPath,['scripts/build.mjs'],{capture:false});
 exec('git',['init','-b','main']);
 exec('git',['config','--local','user.name',account.login]);
 exec('git',['config','--local','user.email',`${account.id}+${account.login}@users.noreply.github.com`]);
 exec('git',['config','--local','credential.helper','']);
 exec('git',['config','--local','--add','credential.helper','!gh auth git-credential']);
 const publishPaths=(await collectPublicPaths(root)).map(f=>f.path);
 // Curated public status only; private audit and handoff documents are not staged.
 exec('git',['add','--',...publishPaths]);
 const staged=exec('git',['diff','--cached','--name-only']).split('\n');
 if(staged.some(p=>/(^|\/)(\.env($|\.)|research|backups|WORKBUDDY_HANDOFF|node_modules|test-results)/i.test(p)))throw new Error('待提交目录包含内部资料或环境文件，已停止发布。');exec('git',['commit','-m','Initial Courtside public site']);
 exec('gh',['repo','create',repo,'--public','--source','.','--remote','origin','--description','Courtside — tennis schedules, rankings and match insights'],{capture:false});
 exec('git',['push','-u','origin','main'],{capture:false});
 exec('gh',['api','--method','POST',`repos/${repo}/pages`,'--input','-'],{input:JSON.stringify({build_type:'workflow'})});
 let dispatched=false;for(let i=0;i<6&&!dispatched;i++){dispatched=exec('gh',['workflow','run','pages.yml','--repo',repo,'--ref','main'],{allowFailure:true})!==null;if(!dispatched)await sleep(4000);}
 if(!dispatched)throw new Error('仓库已上传，但工作流暂未可运行。请在仓库 Actions 中运行 Publish Courtside。');
 let run;for(let i=0;i<8&&!run;i++){await sleep(3000);const rows=JSON.parse(exec('gh',['run','list','--repo',repo,'--workflow','pages.yml','--event','workflow_dispatch','--limit','1','--json','databaseId']));run=rows[0]?.databaseId;}
 if(!run)throw new Error('没有取得发布任务编号，请查看仓库 Actions。');
 exec('gh',['run','watch',String(run),'--repo',repo,'--exit-status'],{capture:false});
 const pages=JSON.parse(exec('gh',['api',`repos/${repo}/pages`]));if(!pages.html_url)throw new Error('GitHub 尚未返回网站网址。');
 const response=await fetch(pages.html_url,{signal:AbortSignal.timeout(15000)});if(!response.ok||!(await response.text()).includes('COURTSIDE'))throw new Error('发布任务结束，但网站HTTP检查未通过；不报告上线成功。');
 console.log(`\n网站地址：${pages.html_url}\n网站HTTP检查已通过。数据采集状态请单独查看 Check tennis data；上线不代表所有数据源已接通。`);
}catch(error){console.error(`\n发布未完成：${error.message}`);process.exitCode=1;}
