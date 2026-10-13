# External-clock monitoring contract — 2026-10-13

The existing `courtside-clock` Git integration deploys the updated worker.
No new Worker, token, plan, public endpoint or storage is introduced.
`11,41 * * * *` remains the sole half-hour collection clock. The duplicate
native schedule is removed from `refresh.yml`; manual dispatch and the
existing at-most-once-per-six-hours bounded watchdog recovery remain.
The watchdog retains its own hourly liveness check at minute 23 and watches
completion of the parent workflow, not separate reusable-child events.

Each real clock request includes `clock_source=cloudflare-cron` and the exact
UTC `clock_scheduled_at` from the Cron controller. The workflow run title
retains this slot. A prerequisite job validates the raw event before either
channel runs. Monitoring joins the title, workflow path, main branch,
authorized actor, original run attempt, successful validation job, and each
channel's required jobs. Two different successful slots within four hours
are required. The results channel still checks the published status and
upstream age; discovery still cannot publish factual data.

These inputs provide operational correlation within the existing Actions
write-permission boundary. They are NOT a Cloudflare signature: a privileged
caller could copy them. `providerAuthenticated` remains false. Native
`scheduledVerified` retains its original meaning; external periodic delivery
has separate counts and evidence. Manual/default/legacy dispatches, watchdog
recovery, manual reruns, malformed slots, and repeated copies of one slot do
not qualify. No previous overnight run is retrospectively relabelled.

A successful code deployment is not two real Cron executions. Until marked
production ticks arrive, report periodic evidence as pending while separately
showing actual execution health. Do not close the issue just to make it green.
No complete tennis coverage, fresh rankings, or seven-day reliability claim
is implied by this change. All free-only and data-source guards remain.

Rollback: restore the previous workflow and worker together. Removing inputs
from a workflow while the new worker still sends them causes dispatch errors.
