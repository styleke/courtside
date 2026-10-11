# Player age release and fixture staging — 2026-10-11

## Live age display

Public URL: https://courtside-tennis.pages.dev/ . Repository and account names are unchanged.

Release and browser verification: https://github.com/styleke/courtside/actions/runs/38127622627 . The integration, tests, build, GitHub Pages deployment, Cloudflare checks and real Chromium checks all succeeded. The deployed shared data revision is 11.

Age labels now appear next to names in ATP/WTA rankings, in player profiles and beside rank labels on pre-match comparison cards. Chinese and English names, nationality, photo hover and the compact layout are preserved. Date of birth and source links are in the collapsed profile provenance section.

Ages are computed as completed years from exact birth dates against the current Asia/Shanghai date. They do not depend on a frozen numeric age, the ranking publication date, or an external request on every birthday. A local birthday timer and visibility/resume checks refresh displayed ages after Beijing midnight. Retired players show current age, not age at retirement. Unknown or imprecise dates are not invented.

Verified published coverage: 267 of 272 player records have usable full birth dates, including all 100 ATP ranking entries, all 100 WTA ranking entries, and all eight followed players. Five unresolved identities/dates remain without an age label: yi-zhou, xinran-sun, zhizhen-zhang, fumin-jiang, tianhui-zhang. The rest of their profile remains available.

The main structured birth-date source is Wikidata. The eight followed players and four identity/conflict gaps were additionally checked against manually read official tournament, player or tour biographies. These official checks are documented in config/birthdate-editorial.json; this is not an automated ATP/WTA crawler and not a claim that every Wikidata entry has received independent official verification.

The importer rejects ambiguous identities, different nondeprecated birth dates, partial-year/month precision, qualified uncertainty and deceased-player records. Conflicts stop or remain unresolved rather than silently overwriting a reviewed birthday.

Twenty new local regression tests were added; the full local suite passed 289 tests. Cloud test jobs passed as well. Real Chromium on the branded URL passed 20 additional checks covering both complete ranking tables, profile age/provenance, photo hover, desktop/mobile-emulated navigation, no horizontal page overflow and no JavaScript page errors. Browser responses were not intercepted or replaced with fixtures. Screenshots were inspected for desktop and 390px mobile layout. This is not an on-device WeChat test.

## Continued data-source work

An actual cloud staging run succeeded: https://github.com/styleke/courtside/actions/runs/38127622611 . It requested the documented SportScore fixtures endpoint for three UTC dates, covering today's and tomorrow's Beijing dates without treating UTC as local time.

Observed at 2026-10-11T09:13:59Z–09:14:02Z: three successful HTTP requests; UTC source counts were 65, 93 and 0. Filtering and deduplication produced 96 candidate matches for Beijing October 11, and zero returned candidates for October 12. Zero returned candidates does NOT certify that no matches are scheduled.

The staging adapter matched eight existing singles to the site's reviewed IDs. Other entries are held for player, team, event or time review. An unmatched known match may reflect incomplete identity/team mapping, not necessarily missing upstream content. This is not proof of complete official coverage. The sampled tracker URL returned an HTML wrapper, not usable structured per-set scores.

A separate read-only workflow now has a half-hour cron schedule (17 and 47 minutes). It makes at most three requests per run and stores its candidate report and attributed review page as one-day artifacts. It cannot commit public sporting data and does not rebuild Cloudflare. At this release check, the new push-triggered staging run was verified; two real schedule-triggered runs have NOT yet been observed or accepted.

No scores, winners, draws, H2H, ranking values, follow preferences, photo choices, match-check times or ranking-check times were changed by the age release. Only DOB metadata and its revision were updated. Public automaticSourceSync is still false. Staging discovery is not public automatic schedule/result publication.

## Cost and next gate

No paid service, domain, data subscription, image purchase, AI API call, database or server was introduced. Existing zero-cost build checks run before source staging and publication. Tooling commits skip Cloudflare builds; the visible age release generated a normal site build. The project guard does not inspect or certify account invoices.

Next gate: resolve identities and event coverage for candidate fixtures, obtain consistent per-set results and complete rankings from appropriate free sources, then test atomic public publication and actual repeated scheduled runs. Do not enable the legacy public collector merely because a candidate staging run succeeded.
