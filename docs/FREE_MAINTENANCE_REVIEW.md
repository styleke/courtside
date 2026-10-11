# Free maintenance release — 2026-10-11

## Published and verified

The public address remains https://courtside-tennis.pages.dev/ and the repository remains styleke/courtside.

Release workflow: https://github.com/styleke/courtside/actions/runs/38125905912 . Integration, tests, build, GitHub Pages deployment, Cloudflare HTTP checks and real Chromium acceptance all completed successfully. The released source was tested again locally: 269 tests passed. Browser acceptance reported 21 passed checks across desktop and mobile-emulated views, hover/focus/dismissal and match dialogs, with no JavaScript page errors. An additional real-browser check observed the branded site fetching the existing GitHub Pages content/status files and using a distinct larger portrait on hover. No network responses were mocked.

Image integrity workflow: https://github.com/styleke/courtside/actions/runs/38126155827 . All fourteen served small/large images for seven reviewed players matched the SHA-256 values in the repository manifest. This is byte-integrity verification, not identity recognition or full editorial review of every site photo.

## Free-operation changes

- Branded Cloudflare pages now read validated content and status from the existing GitHub Pages data files. The user-visible browser address remains the branded domain. No new database, object store, Worker or paid API was created.
- Future data-only bot commits include [CF-Pages-Skip], while the existing refresh workflow still explicitly publishes GitHub Pages. Cloudflare documents this build-skip prefix at https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/ . This avoids tying every future half-hour data update to another Cloudflare whole-site build.
- The project budget configuration is zero. A guard runs before collection and before publication. An enabled source must declare reviewed zero-cost use, no automatic upgrade and a hard-stop quota policy. Unreviewed function entry points stop the static build.
- These guards govern project code. They do not read, modify, lock or certify the owner's account billing settings. No account invoice was audited.
- Collection is still opt-in and OFF. Sporting data is unchanged at revision 10; no source timestamp was advanced by this release. Site-data delivery working is not the same as external tennis collection working.

## First photo review batch

Forty-seven licensed candidates were examined for composition and the relevant source metadata. The first batch covers eight followed players, not the whole ranking list.

| Player | Result |
|---|---|
| Carlos Alcaraz | Replaced with a closer head-and-shoulders Wikimedia image |
| Karolina Muchova | Replaced with a closer head-and-shoulders Wikimedia image |
| Mirra Andreeva | Replaced with a cropped Wikimedia portrait |
| Marat Safin | Replaced with a cropped career-era Wikimedia portrait |
| Roger Federer | Replaced with a closer career-era Wikimedia image |
| Novak Djokovic | Existing licensed source retained provisionally, separate larger image added |
| Justine Henin | Existing licensed source retained provisionally, separate larger image added; better formal composition still desirable |
| Nikola Bartunkova | Unsuitable full-body action image withheld; initials retained pending a suitable licensed portrait |

Selections are locked against generic automatic photo replacement. Small thumbnails and larger previews are separate files; displayed dimensions preserve proportions. Resolution is limited by the original image—this is not a promise that every image is high-resolution. Licensing and attribution are preserved on the site's photo credits page. These are Wikimedia/Commons photographs, not an ATP/WTA official-headshot collection. No athlete/social or official-tour photo was treated as reusable merely because it is public. Remaining players still require editorial review.

## Free source research: actual returned content

The SportScore API was probed read-only under its documented public API. Initial widget request returned 50 records at the requested limit; it cannot establish full-day completeness. A follow-up documented UTC-date endpoint returned 93 tennis records on 2026-10-11, including the Beijing women's singles final present in the reviewed site. This is a useful discovery candidate, not proof of complete official coverage.

The list and detail responses also disagreed: a list result marked finished was still marked live in its detail response; another detail returned finished with a 0–0 score although the list carried a nonzero result. The sampled detail payloads did not provide usable per-set scores. Neither response was written to the website or used to calculate a winner, draw progression or H2H. No new primary collector was enabled.

Evidence: https://github.com/styleke/courtside/actions/runs/38124911185 and https://github.com/styleke/courtside/actions/runs/38125979404 . Terms: https://sportscore.com/developers/terms/ . Any later production integration must satisfy its attribution and permitted-use requirements as well as our completeness and consistency gates.

## Remaining launch blockers

Reliable free schedule/result/ranking ingestion, new tournament/player/match discovery, authoritative completeness checks, result/draw/H2H consistency, real scheduled-run acceptance, operational failure notification and recovery, remaining portrait curation, and the agreed trial period are still pending. The next data-source task is to evaluate the new candidate for discovery while finding and validating a consistent source of final per-set results. Do not substitute this UI/data-delivery release for the automated-data milestone.
