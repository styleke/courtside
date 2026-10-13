/** Import a finite reviewed issue; all paths are local evidence, never URLs or credentials. */
import {readFile, writeFile} from 'node:fs/promises';
import {importReviewedWta} from '../services/reviewed-wta.mjs';
import {assertFreeBuild} from './free-build-guard.mjs';
const [candidatePath, officialPath, mode] = process.argv.slice(2);
if (!candidatePath || !officialPath || !['--check','--write'].includes(mode)) throw Error('Usage: node scripts/import-reviewed-wta.mjs candidate.json official.json --check|--write');
await assertFreeBuild(process.cwd());
const before = await readFile('data/content.json');
const result = importReviewedWta(JSON.parse(before), JSON.parse(await readFile(candidatePath)), JSON.parse(await readFile(officialPath)));
if (!before.equals(await readFile('data/content.json'))) throw Error('snapshot-changed-during-review');
if (mode === '--write') await writeFile('data/content.json', JSON.stringify(result.data, null, 2)+'\n');
console.log(JSON.stringify({...result.report, publicDataWritten:mode==='--write'}, null, 2));
