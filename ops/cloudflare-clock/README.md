# Courtside optional free external clock

**Prepared, not deployed or enabled.** The public website and `styleke/courtside`
repository stay unchanged. This is an optional alternative to unobserved native
GitHub Cron delivery; it is not another tennis-data provider.

## Free-only boundary

Use only a confirmed **Workers Free** account. Do not activate Workers Paid,
Workers for Platforms, a trial, a domain, a database, KV, R2, an AI service or a
payment method. Stop if the dashboard requires payment. The code cannot inspect
or lock the account plan and does not certify a zero account invoice.

Cloudflare's documented free limits as checked on 2026-10-11 are 100,000 Worker
invocations/day and 10 ms CPU/invocation. A configured half-hour clock ordinarily
has 48 invocations/day, with at most 2 GitHub requests per invocation. The default
configuration has **no cron and both opt-ins false**. Live CPU time, dispatch,
publication and recurring delivery must still be tested before acceptance.

## Dashboard setup, after account confirmation

1. Create a separate Worker named `courtside-clock`; leave the existing Pages
   project alone. Paste `worker.mjs` into the module editor or deploy the supplied
   inactive configuration. Do not purchase any resource.
2. Privately create a fine-grained GitHub personal access token with repository
   access limited to `styleke/courtside` and repository permission **Actions:
   read and write**. Use an expiry and record its renewal date. Do not grant
   contents/workflows/administration access or all-repository access. Never send
   this token to chat, a screenshot, source control or the public website.
3. Add this token as the Worker's encrypted secret `GITHUB_ACTIONS_TOKEN`.
   This is **not** the BALLDONTLIE `BDL_API_KEY`; do not copy the data-provider key.
   Confirm the Workers Free plan, then set `FREE_ONLY_CONFIRMED=true` and
   `TIMER_ENABLED=true` in this Worker only.
4. Add the single Cron Trigger `11,41 * * * *` in Worker Settings → Triggers.
   Disable Worker public routes/preview URLs. Its HTTP handler always returns
   404 and cannot run a GitHub job even if someone discovers its address.
5. Observe two different real Cloudflare Cron events and correlate their actual
   GitHub `workflow_dispatch` runs, child-job outcomes and served timestamps.
   A 204 dispatch response means only **accepted**, never published or complete.
   Native GitHub `schedule` acceptance and external Cron acceptance are distinct.
   Do not relabel manual execution, unit-test fixtures, dashboard testing or
   watchdog recovery as native scheduled events.

Keep the existing native cron during initial observation. A recent or active
parent run suppresses duplicate external dispatch; an old stuck run stops with
an error rather than being cancelled. After the external path passes, select one
recurring primary route; do not remove the existing route before confirming the
replacement. All source-admission, score validation, free guards and
Cloudflare-build-skip rules remain in the existing GitHub job.

## Failure and rollback

There are no self-retries; the scheduled handler asks the platform not to retry.
401/403/429, network failure, malformed data, large responses and unexpected
redirects stop immediately. Only fixed GitHub workflow endpoints receive the
GitHub token; server bodies and errors are not logged. The key cannot be sent to
BALLDONTLIE, Wikimedia or user-supplied hosts by this code.

Set `TIMER_ENABLED=false` and remove the Cron Trigger to stop the external clock.
Revoke its dedicated GitHub token when no longer needed. The public site,
existing native workflow, BALLDONTLIE secret and approved tennis data remain
intact. No source is automatically upgraded to paid access.

## Official documentation

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event

The 24 unit tests in `tests/cloudflare-clock.test.cjs` use synthetic events and
mocked HTTP. Passing them is not Cloudflare deployment or an actual token test.
