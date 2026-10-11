/* Ages are current completed years in Beijing, never copied from a stale rank table. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CourtAge=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 function validDay(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const[y,m,d]=s.split('-').map(Number);if(y<1800||y>2200)return false;const x=new Date(Date.UTC(y,m-1,d));return x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d;}
 function today(now=new Date()){const d=new Date(now);if(!Number.isFinite(d.getTime()))return null;const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
 function years(birthDate,onDate=today()){if(!validDay(birthDate)||!validDay(onDate)||birthDate>onDate)return null;const y=Number(onDate.slice(0,4))-Number(birthDate.slice(0,4))-(onDate.slice(5)<birthDate.slice(5)?1:0);return y>=0&&y<=120?y:null;}
 function of(player,onDate=today()){if(!player||player.birthPrecision!=='day'||!player.birthSourceUrl||player.dateOfDeath)return null;return years(player.dateOfBirth,onDate);}
 return {validDay,today,years,of};
});
