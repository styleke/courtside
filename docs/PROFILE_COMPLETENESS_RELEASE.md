# Player information correction — 2026-10-11

## Released and actually checked

Website: https://courtside-tennis.pages.dev/ . The same public repository, GitHub Pages shared data and Cloudflare frontend remain in use. The profile/data release commit is 391997fbd3947eebf6468808f052ddc97b56b0e4; the final visibility release is 3cf40f68d720b6344ec17b73b132e9a3444b7402. Shared content revision remains 15 after the UI-only refinement.

Profile integration, all regressions, staging, deployment and branded-browser checks succeeded in https://github.com/styleke/courtside/actions/runs/38133862468 . The final visibility refinement, protected-data checks, deployment and branded-browser verification succeeded in https://github.com/styleke/courtside/actions/runs/38134403914 . The first profile staging attempt had stopped before publishing because the ranking-table test counted rows before navigation had completed; it was corrected to wait for the actual table without relaxing the 100-row assertion.

The final code suite passed 346 tests. Actual Chromium passed all 20 final checks against the public branded site from 2026-10-11T11:08:54.347Z to 11:09:00.140Z. The test used real HTTP, no network mocks and no fake clock, desktop 1440px and mobile-emulated 390px with touch input and America/Los_Angeles timezone. The browser loaded revision 15 and the deployment job separately compared the exact published app.js, photos.js and styles.css with the released files. This is not an on-device WeChat test or a seven-day reliability trial.

## The screenshot's match

The screenshot referred to sh-1011-bolelli: Simone Bolelli / Andrea Vavassori versus Austin Krajicek / Nikola Mektic on October 11 in Shanghai. All four now have Chinese primary names, distinct English secondary names, licensed local photographs, independent doubles ranking snapshots and the existing birth-date-based ages. A singles rank is never substituted for a missing doubles rank.

The official Shanghai schedule captured at 2026-10-11T10:31:39.681Z listed the match as completed. The winners are Krajicek/Mektic, 6-7(2), 7-6(2), [10-7] in winner-first notation. The card now prioritizes the final score, keeps the deciding match tiebreak separate and correctly aligns the winner. That finite source review also completed sh-1011-cerundolo; no unrelated unresolved results were invented.

Official result source: https://en.rolexshanghaimasters.com/en/scores/schedule . Saved source SHA-256: bfd5582444c676ee571a2d7bfeac528bb15492788f6f046f086ab8460ee24461.

The official fixed-pair head-to-head page was captured at 2026-10-11T10:31:41.805Z: https://en.rolexshanghaimasters.com/en/scores/head-to-head/doubles/ka00/mf09/ba98/va08 . Saved source SHA-256: cde654b30c79e2f6796ee48c845ab486881ff42ab9e58fba24212e6d552a48cb. It lists four meetings and a 3-1 advantage for Krajicek/Mektic. In the site's left/right order this is 1-3, including the current match exactly once. Individual history rows cover Shanghai, Tokyo, the US Open and Wimbledon and retain sources. The historic match dates and scores were also checked against the corresponding saved Tennis.com match pages listed in config/profile-editorial.json. Partner swaps are not treated as the same pairing; changing order within the same team is allowed.

## Broader correction and provenance limits

The bounded editorial import added 19 missing Chinese names, 16 new openly licensed photographs, and 29 individual doubles ranking snapshots. Identity, source and license information are stored with the fields. Previously selected portraits, birth dates, singles rankings and their check dates, follow preferences and unrelated data were preserved. All 232 previously existing photo-manifest entries were preserved; the 16 additions bring the manifest to 248 entries, not a claim that every entry is approved for display.

Ranking source: https://www.tennis.com/players-rankings/atp-doubles, captured at 2026-10-11T10:31:42.722Z, SHA-256 17e77592630f2ece34a87b42e5ae5539a02d29af4ebe6c90ef9b90f3c642c00f. The four screenshot snapshots are Bolelli 12, Vavassori 10, Krajicek 25 and Mektic 24. The page did not specify a ranking issue date. Therefore doublesRankDate is null, the basis is observed-snapshot, and the page explicitly labels the values as snapshots rather than confirmed latest official ATP weekly rankings. Krajicek's Shanghai profile separately showed 23; both source pages were undated, so the difference is disclosed and not resolved by guessing which is newer. Page-check time is not substituted for ranking issue date. No singles ranking value or date was refreshed by this import.

The photographs came from the reviewed Wikimedia Commons candidates with their individual CC BY or CC BY-SA licenses, authors, source pages and hashes. Existing locked selections and crops were not replaced. Missing photos were not replaced with random people or generated portraits.

Unknown head-to-head coverage now says that the information is awaiting supplementation, rather than displaying a fabricated zero, first meeting or equal-width 50-percent comparison. Double-team history does not reuse the first teammates' singles history. Empty, first-teammate-only style analysis is omitted for doubles. Player profiles expose doubles information separately from singles.

Visual acceptance also found and corrected an unrelated photo-focus bug: focusing the entire match dialog had selected its first descendant photo and opened an enlargement over the information. Enlargement is now restricted to the actual photo or its player button/link; intentional desktop hover still works and was exercised by the live browser. Genuine touch opens the mobile details without a hover overlay. The mobile deciding-tiebreak column was widened so the score and winner indicator remain distinct. There were no browser JavaScript exceptions or tested card/page horizontal overflows.

## Remaining gaps and operation boundaries

The new build-time completeness report checks players referenced by today's and tomorrow's matches. For October 11-12, it examined 73 referenced players; 10 still have at least one missing optional profile field, and 25 matches have no verified total head-to-head coverage. The report explicitly remains complete:false. Missing birth dates, licensed photographs and appropriate rankings remain unknown until valid evidence is available. This release does not claim full site coverage.

This was a finite editorial correction, not activation of continuous official-site crawling or ongoing doubles/ranking automation. Existing collection switches and automation status were preserved. As of the schedule-run inspection during this correction, two successful real scheduled runs of the known-singles-results channel had not been observed; that launch gate remains outstanding, along with complete next-day/new-event discovery, broader data coverage and the agreed seven-day trial.

No paid API, image purchase, trial, runner, domain or other infrastructure was introduced. Existing free-operation checks remained enabled. Preparation and documentation commits skipped Cloudflare builds; only the necessary frontend releases requested them. Each successful workflow deleted only its own temporary github-pages deployment archive, not deployed files or other runs' artifacts. Small review artifacts use one-day retention. These implementation checks do not certify account billing invoices.
