# Controller seconds regression — 2026-10-13

Production run `38340499036` declared `2026-10-13T03:11:07.000Z` and failed
because the receiving validator incorrectly required zero seconds. The
controller timestamp is now accepted at any valid second/millisecond within
the configured minute 11 or 41. The raw `scheduledAt` remains unchanged in
the request, run title and evidence; a separate `slotAt` rounds down to that
minute for deduplication only. Two different seconds in one minute still
count as one periodic slot. All age/correlation windows compare raw time,
not the rounded slot. Actor, main branch, first attempt, required guard and
channel/publication checks remain mandatory. Failed old guards stay failed.

The replay of this production timestamp is a regression test, not a new
live Cron execution. Controller contract:
https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/

This patch does not change the Worker, cron expression, tokens, billing,
source permissions, factual data, rankings, or the two-live-slot acceptance.
