# Free ranking account admission — 2026-10-11

## Decision

Credential delivery and access to the two documented FREE singles-ranking endpoints are verified. Ranking-data admission is NOT passed. No website ranking, player field, sporting source-check timestamp, frontend asset, global collection permission or recurring ranking job was changed by this review. The key stays in the existing BDL_API_KEY Actions secret; it was not downloaded, included in reports, stored in source files or supplied to any non-BALLDONTLIE endpoint. No paid endpoint, trial, payment-method operation, upgrade or new paid resource was used. This verifies the configured workflow, not an account billing invoice.

The user provided screenshots showing ATP Tennis FREE, WTA Tennis FREE and no payment method, then confirmed the repository secret was saved. One authorized dispatcher requested the existing read-only workflow with free_plan_confirmed=true. This is an explicit manual admission check, not a scheduled-run acceptance or permission to buy anything.

## Actual requests

Initial review: https://github.com/styleke/courtside/actions/runs/38140319749 . The workflow completed successfully, including its full regression step and checks that data/public/config were unchanged. The source review itself returned review-only, NOT a publishing decision.

- ATP GET /atp/v1/rankings?per_page=100: HTTP 200 at 2026-10-11T12:43:08.847Z, 32,223 bytes, body SHA-256 81f43072b232982aae07266e7e25fa14303f290ec50125e6e4c8ead3e55c81b2.
- WTA GET /wta/v1/rankings?per_page=100: HTTP 200 at 2026-10-11T12:43:24.005Z, 33,202 bytes, body SHA-256 5027055c7f2abd45e5bed5f8802099f773383064433abd7febdce76d179b1bce.

Both replies contained all ranks 1–100, 100 unique provider player IDs and valid nonnegative integral points. ATP's payload issue date was 2026-10-05; all 100 identities matched the site's existing names/countries. WTA's payload issue date was 2026-09-28; 99 identities matched and one country disagreement remained.

The follow-up tested the provider's documented date parameter rather than assuming its default result was the only available issue. Run: https://github.com/styleke/courtside/actions/runs/38140513294 . It made only two additional requests, adding date=2026-10-05 to the same two free endpoints, with more than 15 seconds between requests. No cursor loops or paid endpoints were called.

- Dated ATP: HTTP 200 at 2026-10-11T12:46:01.553Z; same body hash and issue date as the initial response.
- Dated WTA: HTTP 200 at 2026-10-11T12:46:16.822Z; same body hash as the initial response and still ranking_date=2026-09-28, despite requesting 2026-10-05.

Total actual BALLDONTLIE source requests in this admission: FOUR, all to documented FREE ranking endpoints, all HTTP 200. Reported URLs are the exact requested URLs including the date filter. The access key and request headers were not persisted. Small diagnostic artifacts have one-day retention. All preparatory/report commits used [CF-Pages-Skip].

## ATP: conflicting same-issue records

The site's existing table and the candidate both claim 2026-10-05 but differ on rank and/or points for 11 players. Comparison is between two datasets, not a declaration that either dataset is authoritative. A few examples:

| Player | Existing website | Candidate response |
| --- | --- | --- |
| Carlos Alcaraz | #3, 5,260 points | #3, 5,560 points |
| Daniil Medvedev | #5, 4,010 points | #6, 3,860 points |
| Felix Auger-Aliassime | #6, 3,890 points | #5, 3,890 points |
| Novak Djokovic | #11, 3,180 points | #8, 3,480 points |

The complete affected-player list is Carlos Alcaraz, Felix Auger-Aliassime, Daniil Medvedev, Novak Djokovic, Alex de Minaur, Frances Tiafoe, Arthur Fils, Jiri Lehecka, Learner Tien, Tommy Paul and Brandon Nakashima. No candidate value overwrote the existing table, and 89 matching rows were not used to construct a mixed-source partial replacement.

Web cross-checks found disagreement among public secondary publishers too. The ATP historical ranking URL did not return a usable page through that attempted web read. Therefore this review does not resolve the authoritative 2026-10-05 values or prove the disagreement comes from live-vs-weekly rankings. Existing website rankings must also be reviewed; they are not assumed correct just because the candidate differs.

## WTA: requested issue date and identity conflict

The existing website is labelled 2026-10-05, whereas both default and explicitly date-filtered API responses are labelled 2026-09-28. The follow-up records requested-date-not-honored as well as would-regress-current-ranking. It does not relabel the provider date as the request date or as today's check date. It also does not establish whether the provider silently falls back to an older available issue, ignores the parameter, or has an upstream dating problem.

Anna Blinkova is present on both lists at #89 with 875 points, but the site's player profile uses FRA and the API uses RUS. That is a country/representation disagreement, not proof of an entirely absent player. No automatic nationality change, duplicate player record or fuzzy match was introduced. For the other 99 successfully linked players, candidate ranks and points matched the existing list; matching numbers do not by themselves validate the issue date.

The current WTA public ranking page was readable for its visible leading entries but did not provide a usable issue-date field in that parsed view. Do not claim that this check established an official full top-100 publication date. The historical/date discrepancy remains a review item, not a reason to change the site's ranking dates or buy a tier.

## Source contracts rechecked

- https://atp.balldontlie.io/ and https://wta.balldontlie.io/ list Players, Tournaments and Rankings in Free at $0, with 5 requests per minute. Their match and H2H endpoints are not part of this free admission.
- Both documents describe date=YYYY-MM-DD for ranking queries.
- https://www.balldontlie.io/terms.html is the provider's terms page; the provider is not ATP/WTA itself and disclaims guaranteed freshness/accuracy.

## Next acceptance, without additional user setup

No further account action, key screenshot, upgrade or payment is needed. Preserve the valid secret. Independently resolve the same-issue ATP differences, the WTA issue-date response and the one WTA country disagreement before allowing publication. Repeat requests only when there is a concrete diagnostic change or a newly available issue; do not keep polling the same rejected snapshots merely to accumulate successful HTTP logs. The current four-request result establishes connectivity, not a complete trustworthy ranking service. Existing scheduler and all other launch gates remain separate.
