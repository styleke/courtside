# Release progress — 2026-10-11

## Completed and observed

- Existing public test site is still hosted at https://styleke.github.io/courtside/ . Repository name and ownership were not changed.
- Photo enlargement is live on pointer hover and keyboard focus. It uses an in-page fixed overlay, keeps card/score layout unchanged, stays within the viewport, and closes on pointer leave, Escape, scroll or navigation. Touch input does not leave a sticky preview. Missing photos do not open a placeholder enlargement.
- Real Chromium visited the public URL, not an HTML fixture or intercepted network. 21 browser checks passed: homepage, hover/focus/dismissal, match-dialog interaction, five desktop views, five mobile views, no horizontal overflow and no page JavaScript errors. Mobile emulation is not an on-device WeChat acceptance test.
- Evidence: https://github.com/styleke/courtside/actions/runs/38121548725 . The browser read published data revision 10. Its tennis snapshot was not modified by this work.
- No production collector was enabled. Published status still reports automaticSourceSync=false and schedulerRunning=false.

## Source content check, not just network connectivity

Four actual requests were made from GitHub Actions to documented TheSportsDB free endpoints. All returned HTTP 200:

| Request | Observed content | Decision |
|---|---|---|
| Tennis day, 2026-10-11 | No event data returned | Not usable for the complete daily schedule |
| Tennis day, 2026-10-10 | No event data returned | Not usable for results backfill |
| Carlos Alcaraz | One tennis-player record, ID 34200554 | Auxiliary identity sample only |
| Karolina Muchova | One tennis-player record, ID 34212754 | Auxiliary identity sample only |

The published manually reviewed site contains 15 matches on October 11. An empty response cannot mean that no tennis is taking place. The provider additionally documents a free-day result limit of 3 rows. This source is not approved as the sole schedule, score or ranking source. No empty API response replaced site data.

Documentation: https://www.thesportsdb.com/documentation
Terms: https://www.thesportsdb.com/docs_terms_of_use.php

Further documentation screening (not authenticated integration):
- tennisapi.dev Free documents 500 calls/month, which is below even one request every 30 minutes for a whole month. It is not selected as the primary half-hour source.
- Live Tennis API Free documents 100 calls/day, but completed-match history and ranking listings require higher tiers. It is not a complete free source for all agreed features; coverage has not been tested with an account.
- Official tournament/ranking sources remain candidates with source-specific access/use and parsing checks outstanding. No access restriction or permission switch was bypassed.

References: https://tennisapi.dev/docs/ ; https://livetennisapi.com/

## Milestones and next tasks

| Gate | Status | Next evidence needed |
|---|---|---|
| A1/A4/A5: baseline, free test deployment | Test site published and browser-smoke-tested | Actual on-device/mobile mainland checks remain part of final acceptance |
| A2/A3/A6: source coverage and admission | Incomplete; new candidate rejected as schedule source | Applicable free source for current ATP/WTA schedules, final scores and each top-100 ranking, with real sample coverage |
| B1/B2: stable identities and new matches | Partial safeguards; not a complete ingest path | New player, new pairing and next tournament enter without manual code edits |
| B3/B4/B5/B6: collection to publication | Not enabled | One manual and two scheduled cloud executions, source dates checked, complete results and ranking versions, UI reads same version |
| C: broader content coverage | Pending | Active events, viewing links, ticket milestones, history and editorial review by scope |
| D: user-facing reliability | Hover completed; other operations incomplete | Real submitted feedback, delayed-job alert delivery, rollback and recovery |
| E: trial and release | Not started | At least seven days including a tournament/ranking transition and fault tests |
| Branded site address | Name agreed: courtside-tennis; not created | Cloudflare account authorization and Pages project setup, then actual returned URL check |
| WeChat morning brief | Not delivered | Authorized recipient, real manual and scheduled delivery |

## Fixed boundaries

Use free standard runners and free applicable data only. Do not buy a domain, enable paid data, change the personal GitHub name or rename the existing repository. Cloudflare must not be marked ready before a real project and URL exist. Website page refresh, successful deployment and photo asset updates are not external tennis-data collection.

Keep the five existing pages and Beijing-time-first display. Preserve final-score-first cards, current-match H2H inclusion without duplicate counting, the shared follow list only for match selection, and photo attribution. No new account wall, betting features, on-site ticket purchase or external calendar sync.
