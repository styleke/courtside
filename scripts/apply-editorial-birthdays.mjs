import {readFile,writeFile} from 'node:fs/promises';
import Age from '../public/ages.js';import R from '../public/runtime.js';
const file='data/content.json',d=JSON.parse(await readFile(file,'utf8')),before=JSON.stringify({matches:d.matches,rankings:d.rankings,draws:d.draws,checks:d.meta.sourceChecks});
const review=JSON.parse(await readFile('config/birthdate-editorial.json','utf8'));
const allowed=['www.atptour.com','www.wtatennis.com','bnpparibasopen.com','www.tennisfame.com','www.tennistv.com','novakdjokovic.com','www.abnamro-open.nl'];
for(const x of review.players){const p=d.players.find(p=>p.id===x.id);if(!p||!Age.validDay(x.dateOfBirth)||!allowed.includes(new URL(x.sourceUrl).hostname)||new URL(x.sourceUrl).protocol!=='https:')throw Error('Invalid editorial source');if(p.dateOfBirth&&p.dateOfBirth!==x.dateOfBirth)throw Error('Birthday conflict '+p.id);
 Object.assign(p,{dateOfBirth:x.dateOfBirth,birthPrecision:'day',birthSourceUrl:p.birthSourceUrl||x.sourceUrl,birthCheckedAt:p.birthCheckedAt||new Date().toISOString(),birthCorroboratingUrl:x.sourceUrl,birthVerification:'official-cross-check',birthReviewedOn:review.reviewDate});
}
for(const table of d.rankings)if(table.rows.some(x=>Age.of(d.players.find(p=>p.id===x.playerId))===null))throw Error('Top100 age incomplete '+table.tour);
if(before!==JSON.stringify({matches:d.matches,rankings:d.rankings,draws:d.draws,checks:d.meta.sourceChecks}))throw Error('Sporting data modified');
const errors=R.validate(d);if(errors.length)throw Error(errors.join(';'));await writeFile(file,JSON.stringify(d,null,2)+'\n');console.log(JSON.stringify({birthdays:d.players.filter(p=>Age.of(p)!==null).length,players:d.players.length,atp100:true,wta100:true,sportingDataChanged:false}));
