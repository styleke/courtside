# Unified scheduler and free ranking admission — 2026-10-11

## Actual changes and deployment

The existing website remains https://courtside-tennis.pages.dev/ and the repository remains styleke/courtside. No UI assets, player records, ranking values, photographs, match schedules or confirmed results were edited for this release. Shared sporting-data revision remains 16. Only the existing result-channel execution/check state was refreshed by actual source requests. No paid resource, trial, new domain, server, image licence or AI call was introduced. Account billing invoices were not inspected.

The scheduler and discovery changes were published in b259915a2e8e13ed5572dc3095443c2c8e288937. The optional ranking-review implementation was published in b363f5e48724e6fe5bd37f48b7b436812e287437. Data/maintenance commits used [CF-Pages-Skip]. Standard public-repository GitHub-hosted runners and the existing static hosting were retained.

All 399 code tests passed in final acceptance run https://github.com/styleke/courtside/actions/runs/38139255527 . Real Chromium passed 20 existing desktop/mobile-emulated profile, ranking, doubles-score, fixed-pair-history, photograph-hover and navigation assertions against the branded site from 2026-10-11T12:27:13.129Z to 12:27:20.847Z, without network mocks or a fake browser clock. The served shared data was separately read at 12:26:41.127Z: HTTP 200, revision 16, SHA-256 0ad95db57b2316220354c79232cbb07f1b2911118daf51eed5c5252d6236cd4d. Rankings and player records exactly matched the checked-out snapshot. This is not an independent verification of every sporting fact, a physical-device WeChat test or a seven-day reliability trial.

## What the scheduler inspection established

A bounded cloud audit, https://github.com/styleke/courtside/actions/runs/38137968132 , confirmed a public non-fork repository with main as default branch and active workflows. It was newly created, not archived, and not disabled. The old refresh.yml was the only entry with actual schedule-triggered records, and its five old executions were skipped by the unenabled blanket-collection gate. The separately added admitted-result and fixture-discovery workflows were active but had no observed schedule-triggered execution. The cause of non-delivery to those newer workflow schedules was not established; it must not be described as a confirmed GitHub outage or fixed solely by a configuration change.

The old registered refresh.yml is now one orchestrator, configured at minutes 11 and 41. It calls only the previously admitted known-singles-result channel and the read-only fixture-discovery channel through workflow_call. Their individual cron entries were removed so one recurring data entry owns execution. This does NOT enable scripts/refresh-once.mjs, the generic official-site collectors, the global COURTSIDE_COLLECTION_ENABLED gate, or continuous ranking publication. The temporary source-free heartbeat workflow is diagnostic only, not a second data collector.

The complete new orchestrator ran successfully in https://github.com/styleke/courtside/actions/runs/38138984584 . Its event was push, NOT schedule. The actual nested jobs were results / collect, discovery / discover, results / publish / build, results / publish / deploy, results / verify, and results / cleanup; all succeeded. Known results made one HTTP 200 request at 12:23:18.567Z–12:23:19.490Z, matched 70 existing singles records, found zero conflicts and applied zero new results. The export contained 93 unassociated rows that were not promoted into matches. Source-check execution now preserves the real event, run ID, workflow and branch; unchanged exports are not described as new results.

At the final metadata inspection at 12:26:35.030Z–12:26:37.459Z there were still ZERO successful real schedule-triggered executions of the new orchestrated channels. Two true recurring successes therefore remain an unpassed launch gate. Push runs, manual dispatches and watchdog recovery do not count. An additional heartbeat without source access, checkout or credentials had also only produced its push-triggered record at the inspection time. Do not keep changing cron just to manufacture an appearance of progress; the next acceptance must inspect actual scheduled events.

The first deployment attempt passed 387 tests but its GitHub Actions token was not permitted to modify workflow files; the push was rejected before main changed. The exact tested file blobs were subsequently staged with matching hashes, and the authorized connected repository editor atomically published them. No expanded account permission, token sharing, force push or privilege workaround was used.

## Monitoring no longer closes an unresolved scheduling gap

Monitoring now projects each channel from the actual required child jobs of the parent run. A green sibling or overall parent alone cannot validate the other channel. Duplicate run IDs are not counted twice, missing or duplicate child-job evidence is rejected, and manual events cannot be relabelled as scheduled.

With scheduled evidence required, a successful manual/push execution no longer hides the missing recurring-run proof. The final real watch report retained scheduled-delivery-unverified for BOTH channels, zero scheduled successes, no network inspection errors and no recovery request. Its existing bot-owned issue remains the single notification record; this finite verification did not close it or dispatch another recovery. Recovery, when enabled in the separate watchdog, is restricted to one parent dispatch and respects the existing six-hour cooldown. Its periodic and email/WeChat delivery reliability remains unverified.

## The fixture source is still incomplete, with explicit evidence

The actual orchestrated SportScore inspection made three bounded free requests for UTC dates October 10–12. The corresponding counts were 65, 94 and 1. Normalizing to Beijing date produced 97 October 11 candidates. Of already independently reviewed known matches, the source matched only Beijing 1/2 and Shanghai 9/13 on October 11, and Shanghai 0/12 on October 12. Missing known doubles matches and the missing next-day Shanghai programme cannot be treated as no matches scheduled.

The staging adapter now returns explicit known-day-incomplete warnings for these gaps, knownCoverageComplete:false, fullCoverageVerified:false and canPublish:false. It also distinguishes cancellation text from completed results, marks impossible finished 0–0 totals and flags schedule disruptions. None of these candidates replaced public schedules, winners, H2H totals or draw progression. Matching every already known match would still not establish full external coverage. SportScore attribution remains present in the staging review. The current source alone is not a production-complete daily schedule solution.

## A new $0 ranking candidate, not yet an accepted data source

Official source documentation reviewed this turn:
- https://atp.balldontlie.io/
- https://wta.balldontlie.io/
- https://www.balldontlie.io/terms.html

Both BALLDONTLIE tennis documents list Rankings, Players and Tournaments on Free at $0 and five requests per minute; Matches and H2H are not free. The terms permit lawful cached/application display subject to their restrictions and explicitly disclaim official-league affiliation and guaranteed freshness/accuracy. This is a candidate for rankings, not a reason to buy match access. Documentation examples were not imported as real current rankings.

New files: adapters/free-ranking-review.mjs, scripts/review-free-rankings.mjs, tests/free-ranking-review.test.cjs and .github/workflows/free-rankings-review.yml. This is read-only admission with no public-data mutation or automatic publication. Only the two documented HTTPS ranking endpoints can receive the API key. Each manual inspection is limited to two pages per tour, four total requests, at least 15 seconds between requests, 15-second timeouts and a 1.5MB cap per response. Unauthorized/forbidden/rate-limited responses stop further access; no trial, purchase, upgrade or paid endpoint exists in this code. Unfiltered responses and credential-bearing headers are not stored, and reflected credentials are rejected.

The candidate review requires BDL_API_KEY in GitHub repository secrets AND explicit free-only confirmation in a manual workflow dispatch. It has no recurring schedule. The actual initial run https://github.com/styleke/courtside/actions/runs/38139209228 completed with status not-configured at 12:25:46.844Z: ZERO source requests, ZERO ranking rows, no public-data change. Passing code tests is not evidence that this provider currently returns fresh complete rankings for this account.

The validator checks full ranks 1–100, unique identities, points, a consistent issue date, no future/older-than-current version, name/country/tour agreement, provider-ID conflicts and disagreements within an existing issue. Unknown new players remain a review queue rather than an invented identity. A successful structural review still has independentlyVerified:false and automaticPublication:false. Twelve new unit/contract tests used clearly synthetic data and mocked requests; they are not real-source acceptance.

Next user prerequisite: register only a Free $0 account at https://app.balldontlie.io/ . Do not activate a GOAT/ALL-ACCESS trial, purchase anything, or provide a payment method; stop if the UI requires payment for the intended free route. Keep the key out of chat, screenshots, frontend files and repository content. After confirming the free account, place the key in the repository's encrypted Actions secret and perform one bounded review before deciding whether the provider is suitable.

## Remaining gates

Actual repeated scheduled delivery; complete permitted new-day/new-event schedules; real current complete ATP and WTA ranking response verification; broader doubles/results/portrait/H2H gaps; continued free-operation safeguards; sustained recovery and the agreed seven-day trial. The separately pending WeChat morning brief is not removed. No statement of full real-time or complete automatic tennis coverage is made.
