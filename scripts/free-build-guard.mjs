import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
export function validateFreeSources(sources){
 const errors=[];
 for(const [key,s] of Object.entries(sources||{})){
  if(!s||s.automationPermitted!==true)continue;
  const f=s.freeUse;
  let terms=false;try{terms=new URL(f?.termsUrl).protocol==='https:';}catch{}
  if(!f||f.costUSD!==0||f.usageAllowed!==true||f.noAutoUpgrade!==true||f.quotaMode!=='hard-stop'||!terms||!Number.isFinite(Date.parse(f.checkedAt||'')))errors.push(key+': 尚未核实免费使用和额度边界');
 }
 return errors;
}
export async function assertFreeBuild(root){
 const policy=JSON.parse(await readFile(path.join(root,'config/free-operation.json'),'utf8'));
 if(policy.monthlyBudgetUSD!==0||policy.allowPaidServices!==false||policy.allowPaidTrials!==false||policy.allowAutomaticUpgrade!==false)throw Error('本站仅允许零新增费用配置');
 const sources=JSON.parse(await readFile(path.join(root,'config/sources.json'),'utf8'));
 const errors=validateFreeSources(sources);
 for(const file of ['functions','public/_worker.js','public/_worker.js/index.js']){
  try{await access(path.join(root,file));errors.push('静态发布不允许未经审核的函数入口: '+file);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 if(errors.length)throw Error(errors.join('\n'));
 return {sourceCostAdmissionPassed:true,accountBillingVerified:false};
}
