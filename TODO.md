# TODO

Bugs found while writing the user guide against version 0.6.0. They were found by reading the code and have not been reproduced in the running extension.

When a bug below is fixed, remove its workaround from `docs/USER_GUIDE.md`.

## Bugs

- [ ] **Sync Active Team reports failure after a successful sync.** `handleManualSync` calls `loadDashboardData()`, which does not exist, so the catch block shows "Sync failed - check console for details" and the Dashboard does not update. See `popup/popup.js:1528`. Guide workaround: press F5 after syncing.
- [ ] **False "timed out" warning after a successful run.** The two-minute timers in `handleUpdateConsidering` and `handleSeasonConfirm` are never cancelled when the run finishes. See `popup/popup.js:1596` and `popup/popup.js:1738`. Guide workaround: ignore it if Last Updated changed.
- [ ] **A failed data read reports success.** The `scrapeComplete` listeners in `handleUpdateConsidering` and `handleSeasonConfirm` do not check `message.success`. A failed Initialize Season still shows a success message with the old recruit count, after the new season number has been saved. The WhatIfSports tab also stays open. See `popup/popup.js:1564` and `popup/popup.js:1708`. Guide workaround: check Last Updated and retry after logging in.
- [ ] **Keyboard navigation and row colors do not apply to the recruit table.** The code and CSS select the `.recruits-table` class, but the table only has `recruits-table` as an ID. Arrow, Home and End keys do nothing, and the watched, high-priority and medium-priority row styles never show. See `popup/popup.js:855` and `popup/popup.css:1686`. Decide whether those row colors should appear before fixing this, because fixing the selector turns them on.

## Smaller issues

- [ ] **Clear Data impact preview can stay on "Loading impact assessment...".** With more than one team, the default radio ID is built as `clear-currentTeam`, but the element is `clear-current-team`. See `popup/popup.js:3013`.
- [ ] **School summary title always reads "Selected School".** `updateSchoolSpecificSummary` reads `elements.filter_school`, which is not defined. See `popup/popup.js:6801`.
- [ ] **Check Database gives no useful result.** The background response has no `message`, so the status box always says "Database check completed". See `popup/popup.js:3457`.
- [ ] **Support reminders ignore "I've already supported".** `hasDonated` is saved but `shouldShowDonationReminder` never checks it. See `lib/multi-team-storage.js:453`.
