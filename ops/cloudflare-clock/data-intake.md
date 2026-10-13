# Post-clock data intake — 2026-10-13

## Execution milestone

Read-only review run 38360066307 checked the six distinct external slots
04:11, 04:41, 05:11, 05:41, 06:11 and 06:41 UTC. All six passed the existing
trigger guard, known-singles collection/publication verification and fixture
discovery. Run IDs: 38345228174, 38347644854, 38350116305, 38352676206,
38355320701, 38358116318. The existing operational Issue #1 closed automatically
after the second success. This is execution correlation, not a provider signature,
not seven-day reliability, and not complete sporting-data coverage.

The branded site uses the existing GitHub Pages data architecture. Its embedded
build snapshot can have an older status timestamp; the GitHub Pages data endpoint
was checked at 07:01 UTC and had the 06:41 collection attempt. Both snapshots kept
revision 25, ATP October 5 and WTA October 12 (100 rows each).

## Read-only ranking review

The source now returns a complete WTA October 12 issue. Two provider country
labels differ from the already published official review: Anna Blinkova
(provider ID 154) and Alina Charaeva (629445). The resolver requires the existing
unique provider ID, full name, exact issue, exact reviewed rank/points/movement,
official representation provenance and the recorded disagreement. It preserves
both labels in the review report and never changes a player's public country.
This exception does not extend to another issue or guessed identity.

The existing Cloudflare clock calls the read-only ranking workflow at 00:11
and 12:11 UTC (08:11 and 20:11 Beijing time), after trigger validation, first
attempt only. Set COURTSIDE_FREE_RANKING_REVIEW_DISABLED=true to stop this child.
Manual review still requires the Free-account confirmation. A main-branch update
to the review workflow performs an initial read-only check using the previously
confirmed Free account; it is not counted as periodic evidence.

Only the two documented free ranking endpoints are called, maximum four requests
per invocation with 15-second spacing. 401/403/429 stop further requests. The
previously configured BDL_API_KEY stays in the request-step environment and is
never archived. Reports expire after one day. No paid matches, upgrades, billing
API, new services or accounts are used. This configuration does not certify live
account billing settings. Reference documentation:
https://atp.balldontlie.io/
https://wta.balldontlie.io/

A successful HTTP review is not automatic publication. The summary distinguishes
an exact match to a previously reviewed issue, a new candidate needing review,
and blocked data. The existing ATP October 5 disagreement remains unresolved;
its eleven differing players are neither overwritten nor declared correct.
All production collection permissions and sporting data remain unchanged.

## New-fixture boundary

The 07:01 UTC discovery check returned 131 October 13 candidates across tennis,
four newly mapped singles within the current tournament scope, and no October 14
candidates. Neither day had an independent full-day coverage reference. Zero
candidates is therefore not evidence of no matches. Unknown events/players,
vendor-estimated times and missing per-set results are not promoted. The next
publication gate remains source and identity/coverage verification, not a clock
repair or a paid-source upgrade.


## ATP discrepancy investigation — 2026-10-13

The first cross-check changes the diagnosis of the eleven ATP differences, but does not authorize publication. The BDL response labels its issue `2026-10-05`, while its values for the named players match the following-week/current ATP table rather than the independently cross-checked October 5 table. For example, the BDL response gives Alcaraz 5,560 points, Auger-Aliassime rank 5, Medvedev rank 6, and Djokovic rank 8; October 5 reference tables list Alcaraz at 5,260, Auger-Aliassime rank 6, Medvedev rank 5, and Djokovic rank 11. The October 5 values are independently corroborated by L'Équipe's dated ranking report and TennisLive's October 5 snapshot; the later values appear in October 12 ranking coverage. References: https://www.lequipe.fr/Tennis/atp/epreuve-simple-messieurs/page-classement-individuel/general ; https://www.tennislive.net/atp/ranking/ ; https://en.tennistemple.com/rankings/atp

Working conclusion: treat this as a provider issue-date/data-version mismatch, not eleven independent errors in the website's October 5 ranking. Keep the public ATP snapshot unchanged; keep the BDL ATP candidate blocked; do not rewrite its issue date or map it onto October 5. A future change should require the provider to return a genuinely date-matched ATP snapshot or an independent authoritative source for the same issue. The public ATP ranking date remains October 5 until that gate passes.

The fixture-discovery gate also remains closed: the prior 131 October 13 candidates and zero October 14 candidates were not accompanied by independent full-day coverage evidence. This is insufficient to certify completeness or publish new fixtures. Continue with free sources only; no new services, paid endpoints, or automatic fixture publication.
