# Ranking evidence resolution — 2026-10-11

## Outcome

Public website: https://courtside-tennis.pages.dev/ . Published shared data revision: 17. The complete existing WTA October 5 table has now been compared with the actual current official 100-row page. Its ranking values and issue date were retained and its primary ranking provenance updated to WTA. Anna Blinkova retains FRA, which is the representation shown by both her current official profile and her current official ranking row. The 11 same-issue ATP differences remain unresolved; those entries now have user-visible review indications rather than silently appearing fully confirmed.

The release introduced no paid service, trial, endpoint, image purchase, domain, runner or other infrastructure. It did not access the BDL_API_KEY secret or make any additional BALLDONTLIE requests. The four earlier free API responses were reused as review evidence. Account invoices were not inspected.

## Official WTA evidence

Finite raw-document review: https://github.com/styleke/courtside/actions/runs/38141111382 . It saved official source documents without changing public data or collector permissions. Blinkova's profile at https://www.wtatennis.com/players/324267/anna-blinkova was HTTP 200 and explicitly showed FRA; captured at 12:55:22.581Z, SHA-256 1001fe2959364ae3b0599508412ab2db89333854a7e5aa4379b42d34ae4f8555. This is the tour's current country/representation label, not an independent legal determination of citizenship.

The official ranking page is https://www.wtatennis.com/rankings/singles . Its initial HTML identified issue 2026-10-05 but contained only 50 player rows. The first ordinary-browser inspection was stopped by an unhandled cookie dialog, not accepted as full coverage. The second used the site's visible settings controls to decline optional cookies, then its normal Load More button. No access restriction was bypassed.

Successful full-table inspection: https://github.com/styleke/courtside/actions/runs/38141721946 . At 13:04:53.814Z–13:04:59.217Z, real Chromium observed 50 rows before and 100 after the click. The ranking section's data-date stayed 2026-10-05. The saved post-click HTML SHA-256 is 9ee10e1a1df99b2a353fa3eb3f760dd7e61d896e1377600f53574063722a27a7. All ranks 1–100 and official player IDs were unique. Names, country/representation, rank, points and signed weekly movement matched the existing site exactly; Shuai Zhang was matched through the already recorded full-name alias, not through rank alone. Blinkova's row was official player ID 324267, rank 89, FRA, 875 points and movement -2.

The linked official Singles_Numeric.pdf captured in the raw review had an explicit September 28 issue date, not October 5. Its actual bytes were locally rendered and extracted together to verify that date; it was not combined with the October 5 HTML. A remote screenshot service had returned a different July-dated rendering, so that rendering was excluded. The September PDF and the provider's September 28 label do not override the actual October 5 current official HTML. The reason the external API still returns September 28, even with an October 5 request filter, remains unestablished.

## ATP remains unresolved

The dated official ranking page and official media routes returned HTTP 403 in the bounded checks, including the ordinary browser attempt. No authoritative October 5 full ranking export was obtained and no access controls were circumvented. No conclusion was manufactured about live-versus-weekly differences or which of the two datasets was correct.

The existing ATP ranking values and all their numeric check timestamps were preserved. The exact 11 discrepancies from the previous account-admission report are stored in evidenceReview with both source values. The table says 11 people await review, the affected row ranks have a small indicator, affected player comparison badges and profiles show pending review, and the detailed source panel explains that retaining a value is not confirmation of its correctness. Other players are not described as independently officially verified merely because the two sources agree.

## What changed and what did not

WTA's full-table source URL/name and actual official check timestamp were updated, as were the corresponding 100 players' rank/points provenance timestamps and URLs. The WTA issue date, all ranks, points and movements were unchanged. Blinkova received a separate country-source URL, country check timestamp, official-tour-representation basis and the verified WTA player ID. Her existing country value stayed FRA. No birthplace or old provider label replaced current representation.

Only WTA's scoped meta.sourceChecks entry was refreshed. The global sporting freshness fields, ATP numeric-check timestamps, all match schedules/results/draws/H2H, ages, photos, user preferences, existing collection flags and free-operation configuration were preserved. This is finite official verification, not continuous permission to crawl WTA or an enabled automatic ranking publisher.

New review display logic binds its status to the exact issue date and all 100 rank/player/points/movement tuples. A newer issue or altered table cannot inherit an older official-review badge. Incomplete, duplicated, unsafe or mismatched review data is not displayed as official verification. The free-ranking inspector also supports an explicit requested issue date and rejects a response labelled with a different date without relabelling it. Existing free-only endpoint, authentication and rate-limit guards remain in place.

## Actual acceptance

Release run: https://github.com/styleke/courtside/actions/runs/38142605445 . Integration, all 409 code tests, build, pre-publication Chromium checks, publication, exact live frontend verification, online tests and narrowly scoped artifact cleanup succeeded.

The public shared data was read at 13:19:12.005Z: revision 17, SHA-256 8a1d773169132dd88474b26cc8ffbfc57ec7d1826eb89b9aaca82aa8e8608de2, WTA 100 rows dated October 5 and ATP 11 recorded discrepancies. Published app.js, core.js and styles.css matched the released files.

Real Chromium passed eight new ranking/representation checks at 13:19:31.989Z–13:19:35.513Z, then 20 existing profile/navigation/score/photo-hover checks at 13:19:35.863Z–13:19:40.555Z. Desktop and 390px touch-emulated views had no tested page overflow or JavaScript errors. HTTP and the browser clock were not mocked. The model-side browser could not access local HTTP due to environment policy; staged and live browser acceptance were instead performed on the existing allowed GitHub runner. This is not a physical WeChat test or a seven-day reliability trial.

## Remaining work

Resolve the authoritative ATP same-issue values; validate a genuinely newer complete API ranking response before allowing ongoing publication; accept real recurring scheduled events separately from push/manual runs; finish new-day/new-event schedules, remaining profile and H2H coverage, operational delivery and the agreed trial. The pending WeChat morning brief is unchanged. No additional user account setup is needed for this release.
