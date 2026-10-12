# Courtside free external clock

## Setup checkpoint — 2026-10-12

The owner provided screenshots showing the separate `courtside-clock` Worker
built, Workers Free active, the Production secret `GITHUB_ACTIONS_TOKEN`
encrypted, and both runtime opt-ins set to `true`. The owner then synchronized
those two public switches to this repository in commit
43fc25146dc2c120ad924579093b7378187c9864.

The configuration now also contains exactly one agreed Cron expression:
`11,41 * * * *`. It requests one check at minutes 11 and 41 of each hour,
ordinarily 48 checks per day. The runtime already accepts precisely that
expression. Cloudflare deployment, propagation, actual token authorization,
CPU use and two distinct recurring events still require live acceptance.
**Committed activation configuration is not proof of successful scheduled
collection or publication.** The public website and tennis data are unchanged.

## One configuration source

Allow the existing Cloudflare Git integration to deploy this Worker from
`ops/cloudflare-clock` on `main`. Keep its build command empty and deploy command
`npx wrangler deploy`. After the build succeeds, inspect Production Settings ->
Trigger events for the exact single rule. Do not add another dashboard Cron
or create another Worker. Managed Cron changes can take up to 15 minutes to
propagate. If no rule appears after deployment, inspect the build log and
source commit rather than repeatedly adding timers.

No tokens are present in the repository. Keep `GITHUB_ACTIONS_TOKEN` only in the
Worker's encrypted Production secret. It is a separate fine-grained GitHub
personal access token limited to Actions read/write in `styleke/courtside`,
with an appropriate expiry. It is not BDL_API_KEY or the Cloudflare build token.
Do not send any token in chat, screenshots, frontend files or build variables.

## Free-only and execution boundaries

Use Workers Free only. Do not activate paid plans, trials, new payment methods,
storage, databases, AI bindings or other paid resources. The owner has a payment
method on the Cloudflare account; the confirmed Workers subscription is Free.
Neither screenshots nor FREE_ONLY_CONFIRMED can lock a plan or certify a zero
historical account invoice. Measure actual Worker CPU usage during acceptance.
The code has not been changed and does not purchase or upgrade services.

The HTTP handler returns 404 and cannot trigger a job. Public routes, previews
and persisted logging remain disabled. There are no storage or paid bindings.
Each approved event makes at most two fixed GitHub requests, without redirects
or self-retries. Recent or active parent runs suppress duplicate dispatch; an
old stuck run stops with an error rather than being cancelled.

## Acceptance and rollback

Correlate two distinct real Cloudflare Cron events with their actual GitHub
workflow_dispatch runs, required child-job outcomes and served timestamps.
HTTP 204 means a dispatch was accepted, not that data was published. This
external clock is distinct from native GitHub schedule evidence. Unit mocks,
dashboard tests, push runs and manual reruns do not prove recurring delivery.
Do not mark all tennis data live: only the previously admitted GitHub channels
are invoked. All existing data-source, identity, score and free-use checks remain.

To stop this clock, set TIMER_ENABLED=false and remove the Cron, then reflect
that state in Wrangler before another Git deployment. Do not accidentally
reactivate it by deploying the committed true flags again. Revoke the separate
GitHub token when no longer needed. The website and data-provider key are intact.

## References

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event

The 24 clock unit tests passed locally against the unchanged worker and this
configuration. They use synthetic events and mocked HTTP, not the real token
or Cloudflare runtime. No full-site or live recurring acceptance is claimed.
