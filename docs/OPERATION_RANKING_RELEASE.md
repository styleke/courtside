# Operation, ranking isolation and missing ages — 2026-10-11

## Actually released

Public website: https://courtside-tennis.pages.dev/ . Repository unchanged: styleke/courtside. The final application/data commit is db7de549c1c96dd5e3012a1a9a616f1b1962adb5. Published shared data revision: 16. No paid API, trial, image purchase, domain, server, runner or other billed resource was introduced in this work. No account billing invoice was inspected.

Release run https://github.com/styleke/courtside/actions/runs/38137145966 completed integration, regression tests, staged Chromium checks, GitHub Pages deployment, exact branded runtime comparison, live browser checks and scoped artifact cleanup. The full suite passed 372 tests. Real Chromium against the branded site passed the existing 20 profile/navigation/mobile/hover assertions at 2026-10-11T11:54:09.793Z–11:54:15.280Z, plus two new visible-age assertions at 11:54:17.125Z. HTTP, player data, frontend files and the browser clock were not mocked. Mobile was emulated, not a physical WeChat session. The exact live runtime and unchanged rankings were checked at 11:53:42.200Z. This is not a seven-day reliability trial.

## Scheduled execution: the real gap

A cloud metadata review in run https://github.com/styleke/courtside/actions/runs/38135985163 confirmed that the two new workflows were registered as active, but the standalone known-results workflow had no previous run records and fixture discovery had only its initial push-triggered run. The generic old refresh workflow's scheduled runs were skipped. The cause of the missing schedule events has NOT been established; they were not falsely described as disabled.

The known-results workflow was initialized by an actual push and its half-hour cron was re-registered at minutes 24 and 54. Run https://github.com/styleke/courtside/actions/runs/38136140813 completed the real source request, validation, publication and served-status verification. One HTTP 200 request returned 3,041,104 bytes, matched 70 existing singles records, found zero conflicts and applied zero new results. Ninety-three unassociated rows stayed unassociated. It did not pretend an unchanged result export produced new match results. Last source check: 2026-10-11T11:35:56.343Z. Event type: push, NOT schedule.

At the final explicit schedule-list inspection, there were still no successful schedule-triggered records for these new channels. Two real scheduled successes and sustained reliability therefore remain unpassed launch gates. A manual dispatch or watchdog recovery must not count as a scheduled run. The global full-service automatic flag remains false. The source's daily export cadence does not become live scoring just because it is checked twice per hour.

## Free operation watchdog and observed recovery

New files: services/operation-health.mjs, scripts/check-operation-health.mjs, tests/operation-health.test.cjs and .github/workflows/operation-watch.yml. The watchdog is configured for hourly inspection, completion events and manual execution. Its own periodic reliability has not been validated yet. It checks workflow activity, real execution timestamps and outcome, known-result publication timestamps, and reported upstream generation age. It does not guarantee all tennis data is covered or up to date.

The first real check https://github.com/styleke/courtside/actions/runs/38136348163 correctly identified fixture discovery as overdue. It created one bot-owned issue at https://github.com/styleke/courtside/issues/1 and requested one bounded workflow_dispatch. The first watch exited with an attention/failure status rather than pretending the detected problem was absent. Recovery https://github.com/styleke/courtside/actions/runs/38136356238 ran from 11:39:24Z to 11:39:39Z and succeeded. A real follow-up inspection in the release run at 11:53:01.031Z–11:53:04.004Z confirmed that recovery had completed, did not dispatch again, and closed that same issue. This follow-up was explicitly run by the release workflow; automatic delivery of the workflow-completion trigger itself has not been accepted.

Only the two approved workflows can be recovered. No disabled workflow is automatically re-enabled, no currently running workflow is restarted, and an automatic dispatch is suppressed if that workflow has a manual dispatch within six hours. Monitoring makes at most 18 bounded requests per invocation. A repeated problem reuses its own marked bot issue; unrelated user issues cannot be edited or closed. Token use is restricted to the exact repository API path, secrets are not written to reports, and monitoring never changes factual data or collection permissions. GitHub issue creation/closure is verified; email/WeChat notification delivery is not.

## Independent but complete ATP/WTA ranking publication

The old validator unnecessarily required ATP and WTA issue dates to be identical and the ingestion layer required both tours to arrive together. They now accept an independently dated full top 100 for either tour. A public document must still contain both complete top-100 tables, each ranked player's date/rank/points must agree with that player's own table, and updating one tour cannot clear, modify or re-date the other tour's players or source checks. A source scope label cannot claim an untouched tour was refreshed.

Incomplete 99-row lists, duplicate tours, unknown identities, undated weekly snapshots, future issue dates, stale issue dates, and cross-tour player patches fail closed. An old brittle test was replaced by the stronger within-tour date consistency assertion; eleven added tests explicitly verify independence and the rejection cases. No actual ranking values or existing ranking check dates were changed in this release. This is pipeline readiness, not a claim that a new current ranking source has been connected.

Bounded cloud checks of two free candidates returned older data:

- https://atp-rankings.ishanjha.com/api/weeks listed 2026-09-21 as its latest available week; the corresponding /api/week/2026-09-21 returned 100 rows. Checked 2026-10-11T11:33:23.333Z–11:33:23.688Z. Response SHA-256 75f4e59a98c1217a92d39de7f4eaa3a2f2a71d3bebc6c4ec32a50a665f94b299.
- https://stats.tennismylife.org/api/data-files listed atp_rankings_2026-08-31.csv as the available explicit ranking snapshot. Checked 11:33:24.643Z; index SHA-256 e75d68b95e82902395023b5fa4d872ac010da7ee6cf8593a0f5acee069c1a086. Its reconstruction and match-time ranking fields are not silently treated as current official weekly rankings.

Both are older than the site's 2026-10-05 tables. Neither was imported or configured for automatic ranking publication. Do not repeat their old-file evaluation without evidence their available version has advanced. Current complete, suitably reusable ranking updates remain outstanding.

## Two visible age gaps completed

Yi Zhou / 周意: 2005-03-14, displaying 21 on the verification date. Zhizhen Zhang / 张之臻: 1996-10-16, displaying 29. The website continues to derive current completed years from dates, rather than storing these numeric ages.

The finite import fetched Wikipedia-to-Wikidata mappings and source entities, matched official ATP IDs Z0CQ and Z371, and confirmed full Chinese-name order variants. Sources: https://www.wikidata.org/wiki/Q123392404#P569 and https://www.wikidata.org/wiki/Q21623382#P569. Official corroboration: https://en.rolexshanghaimasters.com/en/players/yi-zhou/z0cq and https://www.abnamro-open.nl/tennis/spelers/zhizhen-zhang . ATP's Zhou profile separately corroborated 2005/03/14 during web review.

The initial staged attempt stopped before publishing because Zhou's Wikidata date carried a qualifier. It was inspected rather than silently discarded: P459=Q71536040 describes "most precise value". A separate real request to the official Shanghai player profile confirmed the exact date and player identity (checked 11:52:28.278Z; SHA-256 684a3af0bc5a8ca7e9cfe031812a36bb76f0fe892602d325dad303c256879ab2). Only this individually reviewed precision annotation was resolved; the generic birthday importer's rejection of qualified or imprecise dates remains unchanged. Raw source claims, revision IDs and the editorial resolution are retained in review evidence. No matches, scores, rankings, photographs, preferences, draw records, source-check dates or unrelated player fields were altered.

## Remaining priorities

1. Establish and accept two actual schedule-triggered runs; the successful finite recovery is not a substitute. If schedule events remain absent, diagnose the trigger independently rather than repeatedly declaring configuration successful.
2. Complete reliable, permitted new-day/new-event schedule publication and current complete ranking sources. Existing fixture discovery remains a staging queue, not public schedule automation.
3. Continue the earlier remaining portrait, doubles-ranking and H2H gaps; the two age fixes do not imply those players' other fields are complete.
4. Validate sustained operation and true failed-source recovery over the agreed trial; complete notification delivery and the separately pending WeChat brief without introducing paid resources.
