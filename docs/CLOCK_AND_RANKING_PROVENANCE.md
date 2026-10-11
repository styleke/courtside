# Free clock preparation and ranking evidence — 2026-10-11

## Delivered scope

Public website remains https://courtside-tennis.pages.dev/ and the repository remains styleke/courtside. Commit dbb51e80403d69094c5cb1095eff394a98466de7 adds the optional inactive clock under ops/cloudflare-clock, its 24 tests, and an updated bounded evidence workflow. The clock has NOT been deployed to Cloudflare, configured with a token, or activated. No website application assets, player fields, rankings, scores, schedules, photos, ages, sporting verification timestamps or data-source admission switches were changed. Sporting-data revision remains 17.

No paid resource, trial, account upgrade, payment method, domain, image purchase or new data API was introduced. BDL_API_KEY was not accessed and no additional BALLDONTLIE request was made. This does not certify either account's billing invoice.

## Native scheduling is still unverified

The final GitHub scheduled-run listing still returned five historical records; the latest is the old skipped refresh run 38125803725 at 2026-10-11T08:43:20Z. No successful real scheduled execution of the newly admitted data channels was observed. The cause of missing native schedule delivery remains undetermined. No native cron expression was changed again in this work, and push/manual tests are not counted as native schedule evidence.

The alternative is a separate Cloudflare Workers Free clock which only asks the existing GitHub refresh.yml workflow to run. GitHub continues to fetch, validate and publish admitted tennis data; Cloudflare does not become a tennis API or database. Existing Pages hosting and the public URL are not migrated. The external clock is an optional alternative pending user dashboard configuration and actual acceptance, not a claim that scheduled updating is now fixed.

## Optional clock's boundaries

Files: ops/cloudflare-clock/worker.mjs, wrangler.json, README.md; tests/cloudflare-clock.test.cjs. The checked-in configuration has an empty cron list, TIMER_ENABLED=false, FREE_ONLY_CONFIRMED=false, workers_dev=false and preview_urls=false. It has no storage, paid service or AI binding. The HTTP handler always returns 404 and cannot trigger a job.

After a confirmed Workers Free account and separately scoped encrypted GitHub token are configured, the proposed cron is 11,41 * * * *. This normally gives 48 daily clock events. Each event makes at most two fixed-repository GitHub requests, with explicit timeouts, no redirect following, bounded response size and no self-retry. Active or recent runs suppress another dispatch; old stuck runs fail rather than being cancelled. No raw response, token or credential-bearing error is logged. The optional token must be fine-grained and limited to Actions read/write in styleke/courtside. It is NOT the BALLDONTLIE data key and must not be sent in chat or committed.

Cloudflare documentation checked in this work lists Workers Free at 100,000 invocations/day and 10 ms CPU per invocation. Actual CPU use in Cloudflare has not been measured; the Node tests are not proof that the deployed Worker meets that limit. Never select Workers Paid or add a payment method to resolve a limit. The code cannot read or enforce the user's account plan.

Acceptance must correlate two genuinely scheduled Cloudflare events with their actual GitHub workflow_dispatch executions, required child-job outcomes and served data/status timestamps. A dispatch HTTP 204 means only accepted, not completed or published. External scheduled delivery must not be relabelled as native GitHub schedule. Preserve the original route during initial testing; choose one primary route after the replacement is accepted. Turning TIMER_ENABLED=false and removing the Cron Trigger stops the alternative without changing the website or data-source credentials.

Official references:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event

## New ATP evidence, without an unsupported whole-table decision

A bounded Wikimedia Commons API read in run https://github.com/styleke/courtside/actions/runs/38144050440 returned Data:ATP singles ranking.tab, revision 1283332855, edited at 2026-10-05T06:23:35Z, CC0-1.0. It contains 2,308 rows; all first 100 names, ranks and points match the site's current ATP table. The response was captured at 13:39:37.842Z–13:39:38.364Z, 163,517 bytes, SHA-256 0645e40718e686d4d89d10a638084c4be211d1fbd1ae391ef405cc383d6855f8. Source: https://commons.wikimedia.org/wiki/Data:ATP_singles_ranking.tab .

That editable dataset cites ATP but does not independently specify an issue date. Its edit timestamp is not a ranking issue date, and matching a secondary table does not establish the existing site's correctness. It was not admitted as a new dated ranking feed or used to erase the 11 disagreements.

A separate primary federation profile provides a specific new constraint. https://www.itftennis.com/en/players/daniil-medvedev/800321548/rus/mt/s/overview/ visibly states ATP Singles Ranking (05 October 2026): 6. Actual Chromium in run https://github.com/styleke/courtside/actions/runs/38144961730 scrolled to the ranking, waited for lazy loading and animation to finish, then observed identical body text twice one second apart. Capture: 13:53:50.683Z–13:53:56.843Z; final HTML SHA-256 17fe604d027dcbd7ad08806290cab71533e0333b59af7a92166697e8de178f31. The saved screenshot and DOM agree. An earlier screenshot captured an animated zero and was explicitly excluded as a ranking value.

This primary page supports Medvedev's #6 in the external API, rather than the site's retained #5. It does NOT display ranking points or resolve the other affected players and the complete table. Inserting a single #6 into the existing table would also collide with its existing #6. No partial mixed-source table or inferred points were published. The current 11 review marks remain; preserving values is not confirmation. Next work should reconcile the remaining ranking/points fields with dated authoritative evidence, rather than repeat the same rejected API calls or rely on majority agreement among copies.

## Actual regression and browser checks

Run https://github.com/styleke/courtside/actions/runs/38144961730 completed successfully. All 433 code tests passed (409 existing plus 24 new synthetic clock tests) and the build succeeded. The clock tests use mocked events/network and are NOT real Cloudflare or token acceptance.

Real Chromium then passed 8 ranking checks at 13:53:57.290Z–13:54:01.302Z and 20 existing profile/score/photo-hover/navigation checks starting at 13:54:01.721Z. The branded site loaded revision 17. No network mocks or fake browser clock were used for those 28 checks. Desktop and 390px touch-emulated checks passed; this is not a physical phone/WeChat test or the seven-day trial. The workflow also confirmed no diff to data/config/public and that the new clock stayed inactive.

Remaining work: deploy and test the optional free clock only after account confirmation; resolve complete ATP ranking differences; obtain trustworthy new issues and complete new-day schedules; continue missing portraits/doubles/H2H fields and actual prolonged reliability acceptance. All earlier feature requirements, including the pending WeChat brief, remain unchanged.
