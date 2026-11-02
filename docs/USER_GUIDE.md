# GD Recruit Assistant User Guide

## What the extension does

GD Recruit Assistant (version 0.6.0) is a Chrome extension that pulls the Gridiron Dynasty recruit pool into one sortable, filterable table, so you can compare recruits without paging through the game's recruiting screens.

It is an independent project and is not affiliated with Gridiron Dynasty or WhatIfSports. It has three tabs:

- **Dashboard:** your team's summary, plus the buttons that load and sync data.
- **Recruits:** the recruit table, with filters, sorting and column controls.
- **Settings:** data export and clearing, role rating weights and attribute highlighting.

## Install and set up

Install the extension from the Chrome Web Store, then load your first season of recruits.

### Install

1. In Chrome, open [GD Recruit Assistant in the Chrome Web Store](https://chromewebstore.google.com/detail/ngoneggcfpeebpmmicndaflpmghjikfh).
2. Click **Add to Chrome**.
3. Review the permissions and click **Add extension**.
4. Optional: pin the extension from Chrome's puzzle-piece menu so its icon stays in the toolbar.

### Updates

Chrome updates the extension automatically, and your saved data is kept. To see which version you have, look under About on the Settings tab.

### First run

1. Log in to WhatIfSports and open your team in Gridiron Dynasty. The extension identifies your team from your WhatIfSports login.
2. Click the extension icon. The app opens in its own browser tab, and clicking the icon again returns you to that tab.
3. Check that the school name at the top is correct. If it is wrong or shows Unknown School, see [Fix the wrong team](#fix-the-wrong-team).
4. Load your recruits with **Initialize Season**, described in the next section.

## Load and refresh recruit data

Run **Initialize Season** once per season for each team, then use **Refresh Data** to keep that season current. With either one, you may see a new tab open briefly. You do not need to view or use it, and it closes itself when the work is done.

The extension only reads from whatifsports.com. It does not write to the site or make any edits. To change a recruit's watch status or priority, change it in Gridiron Dynasty, then click **Refresh Data**.

| | Initialize Season | Refresh Data |
| --- | --- | --- |
| Button location | Dashboard tab | Recruits tab |
| Use it | At the start of a season, or to pick up recruits missing from your list | Any time during recruiting |
| Effect on your list | Replaces every saved recruit for this team | Updates recruits already saved and skips new ones |
| Data updated | All recruit data, plus role ratings | Watched, Potential, Priority, Signed and Considering Schools |
| Divisions covered | The ones you select | The ones selected at the last Initialize Season |

### Initialize a season

1. Log in to WhatIfSports and make sure the game is on the team you want to load.
2. On the Dashboard, click **Initialize Season**. After the first run, the button reads **Initialize New Season**.
3. Enter the season number. The extension uses it only as a label on the Dashboard.
4. Select the divisions to include. Your school's division is selected and locked. More divisions mean more recruits and a slightly longer wait, usually just several seconds.
5. Click **Confirm** and wait for the progress screen to finish. You may see a new tab open briefly, but you do not need to view or use it.
6. Check that Season, Last Updated and the recruit total on the Dashboard look right.

There is no second confirmation before your saved list is replaced. Your list can be rebuilt from the game, but only with whatever the game shows at that moment.

### Refresh during the season

1. Stay logged in to WhatIfSports.
2. On the Recruits tab, click **Refresh Data**. The button is unavailable until a season has been initialized.
3. Wait for the progress screen to finish. The table reloads with the new values.

### Known limitation: coaching vision

Your list can miss recruits you see in the game, because the extension does not account for your coaching vision. It uses the estimated division that WhatIfSports gives each recruit.

With stronger vision, the game's search can show you recruits from a higher division. The extension only loads the divisions you select, so those recruits stay off your list.

For example, a D-II coach with strong vision might see some D-IAA recruits in the game. If only D-II is selected, those recruits will not be on the list.

To include them, select the higher division when you run **Initialize Season**. This is only a partial fix, because it loads every recruit in that division, not just the ones your vision reveals.

## Use the Dashboard and Recruits tabs

The Dashboard gives you a summary of the active team, and the Recruits tab is where you filter, sort and compare recruits.

### Dashboard

The Dashboard shows your school, division, world, season, last update time and watchlist count. Its status box at the bottom shows messages from all three tabs, so check it if an action on another tab seems to do nothing.

Two cards count signed recruits differently:

- **Recruits** counts everyone on your list, including recruits who signed with other schools.
- **Recruitment Status** counts only your own: Signed with your school, Green and Yellow.

### Read the table colors

| Where | What you see | Meaning |
| --- | --- | --- |
| Whole row | Green with a green left edge | Signed with your school |
| Whole row | Faded gray | Signed with another school |
| Name and Considering Schools | Green | Unsigned and considering only your school |
| Name and Considering Schools | Yellow | Unsigned and considering your school among others |
| Name and Considering Schools | Pink italic | Unsigned and every school considering them is coached by Sim AI |
| Pot | Green, blue, black, orange or red text | Potential: Very High, High, Average, Low or Very Low |
| Miles | Blue-green through yellow and orange to red | Distance from your campus, near to far |
| Attribute columns | Bold on a yellow background | An attribute highlighted for that recruit's position |
| Watched | Eye icon | The recruit is on your watchlist |

### Read the table values

The table has 46 columns, and all of them are visible by default. Hover over any cell for a description. On R1 to R6, hovering shows the role name.

- **Name** opens the recruit's profile in Gridiron Dynasty in a new tab.
- **Hometown** opens a map on thenextguess.com in a new tab.
- **Rank** shows 999 for a recruit the game has not ranked.
- **Signed** shows 1 for a signed recruit and is blank otherwise.
- A zero shows as a blank cell in most columns, including Priority and the attribute columns.
- **34, 43, 44, 52, Ni, Di, IF, WB, Pro, NDB, Sh, Tr and ST** are formation IQ values. Hover to see the formation.
- **Considering Schools** lists each school with its ID, miles, coach and two scholarship numbers. A recruit with no schools shows undecided.

### Filter recruits

Filters combine, and the table updates as you change them. The number beside each dropdown option is its count across all recruits on your list. Your filters reset when you reload the tab or switch teams.

| Filter | How it works |
| --- | --- |
| Position | One position, or Returner for RB, WR, TE and DB together |
| Potential, Priority, Division | Exact match |
| Distance | Under the selected miles, from 100 to 2,500. Choose Custom... to type your own limit |
| Considering School | Type to search, then pick a school from the list. Typing alone does not filter |
| Watched Only | Only recruits on your watchlist |
| Hide Signed | Removes recruits signed with any school |
| Undecided Only | Only recruits with no schools listed |
| Attribute Filters | Open this section and enter minimum values for GPA, attributes, formation IQ or R1 to R6 |

Picking a school under Considering School also shows Signed, Green and Yellow counts for that school.

**Clear Filters** resets everything except Attribute Filters. Use **Clear All** in the Attribute Filters section to reset those. The Signed, Green and Yellow counts beside **Refresh Data** always cover your whole list, not just the filtered rows.

### Sort, page and arrange columns

- **Sort:** click a column header. Click it again to reverse the order.
- **Page:** choose 10, 25, 50 or 100 under Results per page, then use Previous and Next above or below the table.
- **Reorder columns:** drag a column header to a new position. **Reset Column Order** restores the default.
- **Hide columns:** click **Show/Hide Columns**, change the boxes and click **Apply**.

Page size, column order and hidden columns are saved. Sorting resets when you reload the tab.

## Customize settings and manage data

Role ratings and attribute highlights apply to all your teams. Exporting and clearing data work on your recruit lists.

### Change role ratings

Each R column scores how well a recruit fits one role at their position. The score adds up each of the 12 attributes multiplied by its weight, then divides by 100. The result is shown to one decimal place.

R1 to R6 mean different things at each position. These are the default roles:

| Position | R1 | R2 | R3 | R4 | R5 | R6 |
| --- | --- | --- | --- | --- | --- | --- |
| QB | QB | QBRun | QBU1 | | | |
| RB | RB | FB | RBSpeed | RBPow | RBPoss | RBU1 |
| WR | WR | WRPoss | WRDeep | WRU1 | WRU2 | |
| TE | TE | TEBlock | TEPoss | TEU1 | | |
| OL | OL | Tackle | Grd-Cntr | OLU1 | OLU2 | |
| DL | DL | DT | DE | DLU1 | DLU2 | |
| LB | LB | ILB | OLB | LBU1 | LBU2 | |
| DB | DB | Safety | CB | DBU1 | DBU2 | |
| K | K | | | | | |
| P | P | | | | | |

To change the weights:

1. On the Settings tab, click **Edit Role Ratings**.
2. Choose a position.
3. Enter whole-number weights from 0 to 100. Each role must total 100, and **Save Changes** stays unavailable until every role does.
4. Click **Save Changes**. Ratings are recalculated for all your teams.

Three other buttons help here:

- **Reset Position** restores the defaults for the selected position. Click **Save Changes** afterward to keep the result.
- **Recalculate All Ratings** reruns the scores with your saved weights.
- **Reset to Defaults** on the Settings tab restores every position and recalculates ratings.

### Change attribute highlights

Highlights mark the attributes that matter most at each position, using bold text on a yellow background.

1. On the Settings tab, click **Edit Attribute Styling**.
2. Choose a position.
3. Check the attributes to highlight. The preview shows the result.
4. Click **Save Changes**.

**Reset Defaults** in this window restores the selected position. **Reset to Defaults** on the Settings tab restores every position.

### Export to a spreadsheet

**Export Data** downloads a CSV file named `gd-recruit-export-YYYY-MM-DD.csv`. It holds every recruit for the active team and every column, whatever you have filtered or hidden. Watched and Signed appear as 1 or 0.

The extension cannot import this file, so it is not a backup. To restore a list, run **Initialize Season** again.

### Clear data

Clearing removes recruits, watchlist entries, the season number and the last update time. It keeps your role ratings and extension settings, and it cannot be undone.

1. On the Settings tab, click **Clear Data**.
2. Choose **Current Team Only** or **All Teams**. If you have one team, only All Teams is offered.
3. Read the impact summary, click **Clear Data**, then confirm.

You can skip **Check Database**. It is a diagnostic that reports only that the check finished.

### Support the project

The Settings tab has PayPal and Venmo links for optional donations. After 30 days of use, a support reminder can appear about once every 30 days.

## Working with multiple teams

Each team keeps its own recruits, watchlist, season, last update time and selected divisions. Role ratings, attribute highlights, column settings and page size are shared by all your teams.

### Switch teams

1. Switch teams in Gridiron Dynasty.
2. Return to the extension's tab. It usually detects the new team within a few seconds.
3. If the school name or recruit list still shows the old team, press F5 to reload the extension's tab.
4. The first time you use a team, and at the start of every new season, run **Initialize Season** for it.

### Fix the wrong team

Use **Sync Active Team** when the school name is wrong or shows Unknown School.

1. Open a Gridiron Dynasty page and make sure the game is on the right team.
2. On the Dashboard, click **Sync Active Team**.
3. Press F5 to reload the extension's tab, even if the status box says **Sync failed - check console for details**. In version 0.6.0 that message can appear after a sync that worked.
4. Check the school name at the top.

### Keep the game and the extension on the same team

Recruit data comes from whichever team is active in the game, but it is saved under the team shown in the extension. Before you click **Initialize Season** or **Refresh Data**, check that both show the same school. If they differ, one team's distances and watchlist can be saved under the other team.

## Keyboard shortcuts and accessibility

These shortcuts work on the extension's tab. On a Mac, use Cmd instead of Ctrl.

| Keys | Action |
| --- | --- |
| Ctrl+1 | Open the Dashboard tab |
| Ctrl+2 | Open the Recruits tab |
| Ctrl+3 | Open the Settings tab |
| Ctrl+F | Jump to the Position filter on the Recruits tab. This replaces Chrome's Find on this page |
| Esc | Close an open window |
| Tab, then Enter or Space | Move to a column header and sort by it |
| Up, Down, Enter, Esc | In the Considering School list: move, select, close |

The extension follows your system's high-contrast and reduced-motion settings. Table rows also carry labels for screen readers, including position, rating and signed status.

## Troubleshooting

Most problems come from being logged out of WhatIfSports or from the game and extension being on different teams. Version 0.6.0 also has three misleading messages, marked as known issues below.

| What you see | Why | What to do |
| --- | --- | --- |
| **Sync failed - check console for details** | Known issue: this can appear even when the sync worked | Press F5 on the extension's tab and check the school name |
| **Sync failed: No team detected** | The extension cannot find a team from your login | Log in, open your team in Gridiron Dynasty and try again |
| **Scraping timed out** or **Refresh timed out** about 2 minutes after a run | Known issue: this timer also fires after a run that succeeded | If Last Updated changed, ignore it. If not, run it again |
| A success message, but Last Updated did not change or a WhatIfSports tab stayed open | Known issue: a failed read can still report success. The usual cause is being logged out | Check the open tab, log in, close it and run it again |
| **Not authenticated** error | You are logged out of WhatIfSports | Log in in another tab and try again |
| **Refresh Data** is unavailable | No season is set up for this team | Run **Initialize Season** |
| **No results found** | Your filters exclude every recruit | Click **Clear Filters**, then **Clear All** under Attribute Filters |
| New recruits are missing after a refresh | **Refresh Data** updates saved recruits only | Run **Initialize New Season**, which replaces your list |
| Watched or Priority is out of date | These values come from the game | Change them in Gridiron Dynasty, then click **Refresh Data** |

## Privacy and permissions

Your recruit data stays in your browser. The extension has no server of its own and does not send your data anywhere.

- **Storage:** data is saved in Chrome on this computer and does not follow you to other computers. Removing the extension deletes it.
- **Network:** the extension connects only to whatifsports.com, using your logged-in session.
- **Links to other sites:** Hometown links open thenextguess.com and send it the town, your world and your division. The PayPal and Venmo links on the Settings tab open those sites. These happen only when you click.

| Chrome permission | What it is used for |
| --- | --- |
| `storage` | Saving your preferences |
| `cookies` | Reading your active team from your WhatIfSports cookie |
| `scripting`, `activeTab` | Reading recruit data from the game's pages |
| `declarativeNetRequest` | Setting a request header when reading recruit data from the game |
| Access to whatifsports.com | Running on Gridiron Dynasty pages |
