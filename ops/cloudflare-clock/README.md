# Courtside free external clock

## Setup checkpoint — 2026-10-12

The owner has provided dashboard screenshots showing the separate
`courtside-clock` Worker deployed, Workers Free active, the Production secret
`GITHUB_ACTIONS_TOKEN` encrypted, and both runtime opt-ins set to `true`.
The checked-in configuration now mirrors those two public switches only.
**The Cron list remains empty. Scheduled operation and token authorization have
not been accepted.** The website and tennis data are unchanged.

Neither a screenshot nor `FREE_ONLY_CONFIRMED=true` locks a billing plan or
certifies a zero historical account invoice. Use Workers Free only; do not
activate a paid plan, trial, storage, database, AI binding or other paid resource.

## Next activation gate

Inspect Production Settings -> Trigger events before adding a schedule.
The proposed single expression is `11,41 * * * *`. Because Wrangler manages this
Worker, publish the matching configuration and tests together before treating a
dashboard-only Cron as persistent. Do not enable a second collector or alter
approved tennis-source scopes. Do not treat a HTTP 204 dispatch as a successful
data publication.

Keep the GitHub token only in the Worker's encrypted Production secret. It must
be fine-grained, limited to `styleke/courtside`, with Actions read/write, and an
appropriate expiry. It is not the BALLDONTLIE data key and must never be sent in
chat, an image, a repository file, or a build variable. No actual secret is in
this repository.

The clock's HTTP handler returns 404 and cannot trigger a job. Worker public
routes, previews and persisted logging remain disabled in this configuration.
There are no storage or paid-service bindings. Each approved event is bounded
to at most two fixed GitHub requests, no redirects and no self-retries. Recent
or active parent runs suppress duplicate dispatch; old stuck runs fail rather
than being cancelled.

## Acceptance and rollback

Correlate two distinct real Cloudflare Cron events with the actual GitHub
workflow_dispatch runs, required child-job outcomes, and served timestamps.
External clock evidence is different from native GitHub schedule evidence.
Mocks, dashboard tests and manual reruns are not recurring delivery evidence.
Measure actual Worker CPU use and remain inside Free limits; never upgrade to
resolve an exceeded limit.

To stop an enabled clock, set TIMER_ENABLED=false and remove the Cron, then
reflect that state in Wrangler before the next Git deployment. Revoke the
separate GitHub token when no longer needed. This does not remove the public
website or its data-provider credentials.

## References

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event

The 24 clock unit tests use synthetic events and mocked HTTP. Their success is
not actual Cloudflare deployment, token validation or end-to-end acceptance.
