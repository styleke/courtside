# Result pipeline release — 2026-10-11

## What actually ran

Public website: https://courtside-tennis.pages.dev/ . Repository remains styleke/courtside. No new paid infrastructure, API, domain, image licence, AI call or trial was introduced.

The release workflow https://github.com/styleke/courtside/actions/runs/38130502049 executed a real request to the documented, freely reusable Baseline Today result export, validated known match identities, applied new finals, published GitHub Pages data, and verified the branded Cloudflare website in real Chromium. No network response was mocked.

Observed source request: 2026-10-11T10:02:30.968Z to 10:02:32.092Z. One HTTP 200 response, 3,040,594 bytes. The export was matched to 69 existing singles matches using tour, event edition, round, full player identities and country codes. Twelve previously unresolved finals were applied; zero conflicts were found in that run. Ninety-three other rows remained unresolved and were not promoted into public matches. These are validation counts, not a claim of independent official verification of every row.

The automatically changed match IDs are sh-1010-oop-08, sh-1010-oop-07, sh-1010-oop-06, sh-1010-oop-12, sh-1010-oop-11, sh-1010-oop-14, sh-1010-vacherot, sh-1010-alcaraz, sh-1010-oop-16, sh-1010-bu, sh-1010-oop-20, and sh-1010-oop-18. Final-score-first presentation, existing draw relationships and H2H de-duplication consume the same result records.

## Explicit limits of the automatic channel

config/open-results.json and .github/workflows/sync-known-results.yml enable only knownSinglesResults: final-result supplementation for already identified and dated 2026 Shanghai men's singles and Beijing women's singles matches. The workflow is scheduled at minutes 23 and 53, makes at most one source request per run, supports conditional caching when offered by the source, checks the zero-cost policy, and publishes data-only commits with [CF-Pages-Skip]. The global full-service flag remains false; the successful partial channel is reported separately.

Baseline Today explicitly describes daily updates, not live or point-by-point updates: https://baseline-today.vercel.app/data . A half-hour check does not make that upstream source real time. It republishes Wikipedia contributors' results under CC BY-SA 4.0. The source is not affiliated with ATP/WTA, can contain errors, and excludes rankings from its reusable exports. The website credits the provider, original contributors, source page and licence in match/source details; the reused result fields and their derivatives retain that licence.

Existing final results are not overwritten by conflicting reports. Existing tiebreak small scores are not discarded when an otherwise matching export omits them. Unknown identities, missing match dates, future matches, retirement ambiguity, contradictory winners, protected fields and malformed finals are rejected or held for review. The export's tournament start is never used to invent a match date. Source checks are not misrepresented as ranking or schedule freshness.

At the final check, the first real release-triggered source-to-page run was accepted. Two real schedule-triggered runs have NOT yet been observed or accepted. Continued availability and recurring-run reliability are still launch gates. No claim of complete automated schedules, all results or all rankings is made.

## Bounded official editorial review, separate from automation

Saved official Shanghai order-of-play documents were reviewed and their exact content hashes checked before import. They cover October 11 and October 12. Source checked at 2026-10-11T09:24:26.693Z; the draw checked at 09:31:03.998Z. The source pages are https://en.rolexshanghaimasters.com/en/scores/schedule , https://en.rolexshanghaimasters.com/en/scores/schedule?dayToDisplay=8 and https://en.rolexshanghaimasters.com/en/scores/draw . These finite editorial reads do not enable an ongoing official-site crawler.

Twelve announced October 12 matches were added: eight singles and four doubles. The Carlos Alcaraz–Zizou Bergs match is not before 18:00 Beijing time. The other following-by slots are not converted to invented clock times. Four explicitly completed October 11 matches were updated from the official document. Sixty-seven ATP profile identifiers were linked through unique full-name checks; doubles now match both teammates independently of side ordering.

The existing Shanghai men's singles bracket was connected to verified third-round slots, with earlier known results retained where they could be mapped and future rounds linked through predecessor slots. This is not a claim that every early-round match has been imported. Rankings, their check dates, birth dates, follow preferences and selected portraits were preserved. Two WTA representation-country labels were separately corrected against their official profiles; this did not refresh their ranking values.

## Final coverage and browser acceptance

A final repair aligned the reviewed day records with the runtime's sourceDate and expectedMatches schema. It removes a false missing-schedule warning for the fully imported next day without changing any match, result, source-check timestamp, ranking, age or photo. The first repair attempt stopped before commit because its source-diff guard also included the intentionally regenerated public/data.js build seed. The guard was corrected to exclude only that derived file; protected sporting records and real source files were still checked.

Successful repair, publication and browser verification: https://github.com/styleke/courtside/actions/runs/38131166819 . All 316 code tests passed. Real Chromium read published shared data revision 14 and passed 12 checks at 2026-10-11T10:14:26.139Z: next-day completeness, no false coverage warning, official not-before timing, followed match visibility, completed previous match, result attribution, ranking/age preservation, honest partial automation status and desktop/mobile-emulated use without JavaScript errors or horizontal overflow. This was not an on-device WeChat test or a 7-day reliability trial.

Large deployment artifacts from the completed run were cleaned up by an explicitly scoped job; only its own github-pages temporary archive was deleted, not the deployed site or other runs' artifacts. Small review reports use one-day retention. These project safeguards do not inspect or certify account billing invoices.

## Remaining work

1. Observe and validate actual repeated scheduled result and fixture-discovery runs, including failed-source handling and source staleness.
2. Establish continuously permitted, complete next-day schedule and new-event discovery; the October 12 schedule in this release is editorially verified, not proof of that automation.
3. Add suitable free complete ranking updates, broader results including doubles and retirement detail, and event-edition transitions without inventing data.
4. Complete operational notification/recovery, broader portrait curation, coverage review and the agreed 7-day trial. WeChat delivery remains a separate pending item.
