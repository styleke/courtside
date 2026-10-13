/** Validate the event before either data channel runs; never read a secret. */
import {readFile} from 'node:fs/promises';
import {validateClockTrigger} from '../services/clock-evidence.mjs';
if (process.env.GITHUB_REPOSITORY !== 'styleke/courtside') throw Error('repository-rejected');
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
const receipt = validateClockTrigger({event: process.env.GITHUB_EVENT_NAME,
  ref: process.env.GITHUB_REF, actor: process.env.GITHUB_ACTOR,
  source: event.inputs?.clock_source || '', scheduledAt: event.inputs?.clock_scheduled_at || ''});
console.log(JSON.stringify({...receipt, runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT, publicationVerified: false, fullCoverage: false}));
