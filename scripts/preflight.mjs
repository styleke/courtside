import {spawnSync} from 'node:child_process';import {readdirSync} from 'node:fs';
const files=readdirSync('tests').filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f);
const r=spawnSync(process.execPath,['--test',...files],{stdio:'inherit',shell:false});process.exitCode=r.status??1;if(r.error)throw r.error;
