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

### Row-level ATP comparison — 11 discrepancies

The 11 rows have now been compared as a set against the dated October 5 table and the October 12 table. The BDL candidate's rank/points pair agrees with the October 12 table for each named player, while the public snapshot's pair agrees with the October 5 table:

| Player | Public Oct 5 | BDL candidate labelled Oct 5 | Oct 12 cross-check |
|---|---:|---:|---:|
| Carlos Alcaraz | #3 / 5,260 | #3 / 5,560 | #3 / 5,560 |
| Felix Auger-Aliassime | #6 / 3,890 | #5 / 3,890 | #5 / 3,890 |
| Daniil Medvedev | #5 / 4,010 | #6 / 3,860 | #6 / 3,860 |
| Novak Djokovic | #11 / 3,180 | #8 / 3,480 | #8 / 3,480 |
| Alex de Minaur | #9 / 3,300 | #9 / 3,430 | #9 / 3,430 |
| Frances Tiafoe | #8 / 3,380 | #10 / 3,380 | #10 / 3,380 |
| Arthur Fils | #10 / 3,275 | #11 / 3,275 | #11 / 3,275 |
| Jiri Lehecka | #19 / 2,310 | #16 / 2,440 | #16 / 2,440 |
| Learner Tien | #16 / 2,395 | #17 / 2,395 | #17 / 2,395 |
| Tommy Paul | #17 / 2,375 | #18 / 2,375 | #18 / 2,375 |
| Brandon Nakashima | #18 / 2,335 | #19 / 2,335 | #19 / 2,335 |

The October 5 comparison is supported by Eurosport's dated October 5 ranking report; the October 12 comparison is supported by TennisTemple's table explicitly marked updated 12.10.2026. These are secondary public references, not an ATP-origin signed snapshot, so this establishes a strong date/version-mismatch diagnosis but does not validate BDL as a reliable source for either issue. Sources: https://www.eurosport.fr/tennis/classement-atp-du-5-octobre-2026-fils-en-perd-une-place-au-classement-atp-medvedev-cinquieme_sto23342879/story.shtml ; https://en.tennistemple.com/rankings/atp

Disposition: all 11 are classified as a coherent issue-date mismatch; none is approved as an isolated website correction. Keep the public October 5 values unchanged and keep this provider candidate blocked. A future code change should make the review fail closed when a requested issue date is not honored; before changing the adapter, identify its actual workflow entry point and add regression tests for a mislabeled but internally consistent snapshot. No production data was changed by this comparison.

### Fixture event mapping correction — 2026-10-13

The staging adapter previously mapped WTA Beijing source labels but did not map WTA Wuhan labels. The current calendar has Wuhan running 12–18 October, while China Open ended on 11 October; WTA's official match-notes page lists the Dongfeng Voyah Wuhan Open for 12–18 October. This could leave current Wuhan candidates flagged as requiring an event mapping even though the event exists in the public tournament registry. The adapter now maps `WTA Wuhan, China Women Singles` and `WTA Wuhan, China Women Doubles` to `wuhan-2026`. This is a candidate-classification fix only; it does not add, alter or publish matches. Independent day coverage for Wuhan is still absent, so `fullCoverageVerified` remains false and `canPublish` remains false. Official calendar reference: https://www.wtatennis.com/match-notes . Regression test added to ensure a Wuhan candidate resolves to the active tournament without opening the publication gate.

### Official schedule coverage check — 2026-10-13

Checked the official tournament surfaces for the next two dates before considering any public schedule change:

- Shanghai Masters: the official tournament site confirms the event is active and publishes October 13 news/highlights, but its day-specific schedule endpoint timed out in this review environment. The linked ATP Tour schedule and results pages returned HTTP 403 to the review browser. This is an access limitation, not evidence that the schedule is unavailable.
- Wuhan Open: the official WTA order-of-play page confirms the event dates (October 12–18) and exposes the October 13 day selector, but its match list remained in a dynamic “Loading Order Of Play” state in this review. The official scores page likewise did not expose a complete match list to this reader.
- Public secondary order-of-play pages list October 13 and 14 Shanghai matches, but they are not a substitute for an independently captured official full-day schedule when establishing completeness.

The public snapshot's independent schedule coverage currently ends on October 12 for Shanghai; there is no independent full-day coverage record for October 13–14 Shanghai or Wuhan. Therefore, do not infer completeness from vendor candidate counts, do not treat an empty response as no matches, and do not promote these dates into the public snapshot. Next acceptable evidence is a readable official order of play/draw plus a row-level reconciliation (including doubles and completed results) or a second independent authoritative source with clear date and event scope. No public schedule/results were changed in this check.


### Follow-up fixture candidate audit — 2026-10-13 11:11 UTC

The latest staging-only fixture discovery run (workflow run
[38388489108](https://github.com/styleke/courtside/actions/runs/38388489108))
made three free SportScore requests for source dates October 12, 13 and 14.
The October 13 Beijing-day view contained 131 candidates; the October 14 view
contained zero. Neither date passed independent full-day coverage, and zero
October 14 candidates is not evidence of an empty tennis schedule.

The newly added Wuhan event mapping is active in staging: the report classifies
17 WTA Wuhan singles candidates under `wuhan-2026`. This confirms event mapping,
not match verification. Across the October 13 candidate set, 111/131 identities
remain unresolved and zero candidates are publishable. Wuhan/Shanghai examples
still include placeholder or unmapped names, canceled rows, missing per-set
results, and invalid final totals. One candidate with Mirra Andreeva lists
`R32P10` as the opponent and remains blocked. These vendor rows must not be
treated as an authoritative order of play or a complete results feed.

The same clock run checked the existing known-singles results channel against
the baseline source: 82 known matches matched, zero were applied, and 94 source
rows remained unresolved. The channel reports `ok` for that bounded check only;
it does not mean the schedule or all results are current. The run completed its
build/deploy verification, but no new fixture or score was published from this
candidate audit. Continue to require independently verified day coverage,
resolved identities and per-set results before any fixture/result publication.
