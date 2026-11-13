# Tikorix: change log

Everything changed on the local working copy since 11 November 2026. Nothing has been deployed; the live spreadsheet and the live Apps Script project have not been touched.

- Original files: Git commit `e44842e`, and `Documents\Claude\backups\audit-20261111-pre-fixes`.
- Current files: the latest Git commit.

## 13 November: Dynamic collapsible artists dropdown in sidebar navigation

Hazel requested:
"think there should be dropdown tabs for the artist here as in : artist -> harsha, marita, savya or any other artist that would eventually be added"

| Change | Why | File |
|---|---|---|
| Dynamic collapsible artist sub-menu container (`#tkNavArtistsSub`) added to sidebar nav | Direct access to individual artist portfolios from the primary left sidebar | `index.html` |
| Collapsible toggle caret button (`⌃` expanded, `⌄` collapsed) with `toggleSidebarArtists(e)` | User can smoothly collapse or expand artist sub-items without leaving current page | `app.js`, `styles.css` |
| Runtime dynamic artist roster rendering (`renderSidebarArtists()`) | Renders `All Artists` and each active artist (`Harsha`, `Marita`, `Savya`, and future additions) dynamically | `app.js` |
| Bidirectional route synchronization (`#/artists/:artistName` & `onSidebarArtistClick`) | Selecting a sidebar sub-item switches on-page artist tab; switching page tabs synchronizes active sidebar item | `app.js` |
| Sub-item styling with single active border prevention | Indented (`36px` padding-left), clean hover states, with `.tk-nav-subitem::after { display: none !important; }` preventing double right indicator bars | `styles.css` |


## 13 November: Table count pill background colors matching stage status dots

Hazel requested:
"the no of rows in the table should take the colours assigned to the table,ex. this table has a green dot. so the bg of the no should be green intead"

| Change | Why | File |
|---|---|---|
| Section count pills (`.tk-count-pill`) styled with stage-specific dot colors | Direct visual association between stage status dots and row count pills | `styles.css` |
| Color mapping: Stage 1 amber (`#f59e0b`), Stage 2 green (`#16a34a`), Stage 3 blue (`#2563eb`), Stage 4 purple (`#8b5cf6`), Stage 5 gray (`#64748b`) | Matches status dot tokens across all 5 collapsible accordion stages | `styles.css` |
| Crisp white text (`color: #ffffff !important;`) with font-weight 700 on count pills | Guarantees high-contrast WCAG AA legibility against solid stage tones | `styles.css` |


## 13 November: Relaxed table cell font weights from 700 to 600

Hazel requested:
"I feel the weight of the bold items needs to be reduced a bit. currently they are the same size as the heading of the table which I feel is wrong"

| Change | Why | File |
|---|---|---|
| Row title styling (`.tk-cell-title`) relaxed from `700` to `600` (`13.5px`, line-height `1.3`) | Establishes clear hierarchy so row data does not compete with `15.5px / 700` section headings and `11.5px / 700` column headers | `styles.css` |
| Fee text styling relaxed to `13px / 600` semi-bold | Clean numeric readability without bold heaviness | `styles.css` |
| Urgent deadline styling relaxed to `13px / 600` semi-bold in red (`#dc2626`) | Retains urgency contrast without excessive weight | `styles.css` |


## 13 November: Center-aligned table column labels & cells, label-less ACTIONS header

Hazel requested:
"I feel like the column labels for both sheets need to be center aligned. also the 3 dots doesn't nee to have a lave. that would mean more space in both the tables for column width as well"

| Change | Why | File |
|---|---|---|
| Column headers & cells for columns 3–9 center-aligned (`CATEGORY`, `FEE`, `DEADLINE`, `STAGE`, `ARTIST`, `OWNER`, `ACTIONS`) | Balanced, clean vertical scanning down data columns; `OPPORTUNITY` stays left-aligned | `styles.css` |
| Removed text label from `<th class="tk-col-actions" aria-label="Actions"></th>` | Reclaims ~32px of table header width, reallocated directly to data columns | `app.js`, `styles.css` |
| Standardized 9-column colgroup widths: Checkbox (44px), Opportunity (30%), Category (11%), Fee (8%), Deadline (11%), Stage (13%), Artist (13%), Owner (14%), Actions (44px) | Strict 100% (+ 88px fixed) table distribution matching both Open Calls and Artists pages | `styles.css` |


## 13 November: Open Calls single-line fee & adaptive split-view table rules

Hazel reported:
1. Artist pitch page looks perfect, but Open Calls opportunity page was messed up when opening half-pane preview (columns collided as `CATEGFFEE DEADLINSTAGE`).
2. FEE column had 2 lines (`No fee \n Free entry` or `$50 \n Application fee`) causing unnecessary row bloating; user requested: "there should just be one line here".
3. Table rules between Artists and Open Calls should be similar (clean alignment, single-line fee, badges) but also different (Open Calls needs split-view responsiveness for master-detail inspection).

| Change | Why | File |
|---|---|---|
| FEE column changed to single line (`Free` or `$50`) on Open Calls table | Replaces 2-line `No fee \n Free entry` clutter; perks remain in tooltip and right preview card | `app.js` |
| Adaptive split-view rules (`.tk-split-container.has-preview-pane`) | When half-pane opens, duplicate columns (Category, Fee, Owner) are cleanly hidden so Opportunity, Deadline, Stage, Artist fit with zero collision | `styles.css` |
| Horizontal scroll fallback with smooth touch scrolling on `.tk-table-wrap` | Guarantees the master list never crushes or overflows regardless of viewport width | `styles.css` |


## 13 November: Strict table column alignment, unclipped row menu & balanced widths

Hazel reported:
1. Column alignment shifted between collapsible pipeline stages (Stage 2 vs Stage 3).
2. Title wrapped into 4 lines with uneven whitespace, while other columns floated vertically.
3. 3-dot dropdown menu was clipped at the top when opening upward on first rows.
4. ACTIONS header was tight or truncated.

| Change | Why | File |
|---|---|---|
| `<col>` elements in `<colgroup>` explicitly styled with exact width rules matching `th` and `td` | Guarantees identical horizontal column X-coordinates across all stage tables | `styles.css` |
| Balanced column widths: Checkbox (44px), Opportunity (32%), Category (11%), Fee (8%), Deadline (11%), Stage (12%), Artist (13%), Owner (13%), Actions (76px) | Sums to exactly 100% (+ 120px fixed); eliminates title wrapping into 4 lines while keeping full titles visible | `styles.css` |
| Title styling upgraded with `-webkit-line-clamp: 2` and `title` hover tooltips | Sleek single or double line rendering with no multi-line blowout | `app.js`, `styles.css` |
| Row dropdown menu (`toggleRowMenu`) upgraded to viewport-aware fixed positioning with boundary clamping | Escapes all container overflow clipping; opens downward when space permits and upward with top-bound safety | `app.js`, `styles.css` |
| Category badge classes applied in `loadArtistsList` (`tk-cat-exhibition`, `tk-cat-residency`, `tk-cat-grant`) | Visual consistency with the Open Calls table | `app.js` |


## 12 November: Repository reorganization into backend/ and frontend/

| Change | Why | Destination |
|---|---|---|
| 18 Google Apps Script files moved into `backend/` | Single folder for Apps Script deployment; resolves `Config.js` vs `config.js` collision | `backend/` |
| Web app files moved into `frontend/` (`index.html`, `app.js`, `styles.css`, `config.js`) | Single folder for GitHub Pages deployment | `frontend/` |
| Real live `config.js` added to `frontend/` | Connects cleanly to the live relay URL | `frontend/config.js` |
| Obsolete files deleted (45,000+ lines: `*.v1.*`, `*.v2-fast.*`, `*.bak`, `cairn.*`, `backup-20261106-0049/`, `meta/`, `map.*`, `AGENTS.md`) | Clutter cleanup per Hazel's request | Deleted |
| Harness & tests updated to locate files in `backend/` and `frontend/` | All 35 test files pass (100% green) | `tools/` |


## 12 November: Fee table column & opportunity multi-select Set Owner

| Change | Why | File |
|---|---|---|
| Column header renamed from `APPLICATION FEE` to `FEE` on both Opportunity (Open Calls) and Pitch (Artists) tables | Agreed wording | `app.js` |
| Opportunity multi-select bar updated to: **Clear**, **Archive** (or Restore), and **Set owner**; old `bulkSend` removed | Direct curation workflow from table selection | `index.html`, `app.js` |
| Multi-select Set owner opens curator picker sheet, sets owner across selected opportunities and updates matched pitches via `p2_updateApplicationDetails` | Bulk assignment | `app.js` |
| New test suite `a8-fee-header-and-bulk-test.js` (11 checks) | Verification | `tools\audit-tests` |


## 12 November: demo data can no longer pass for real data

Hazel's screenshot (La Biennale di Venezia: every step ticked, yet listed under Stage 1) was the app's built-in **demo data**, shown when a browser clicks "Preview UI as Guest (Demo Mode)" or cannot reach the local server. The demo list and the demo pitch pages disagreed.

| Change | File |
|---|---|
| A red bar across the top says "Demo data, not your real data" and why (demo mode on, not signed in, or server unreachable), whenever the app uses demo data on this computer | `app.js` |
| Demo list now agrees with the demo pitch pages (Venice and Kochi under Preparing, Tate Modern under Submitted) | `app.js` |
| If the server sends no stage, the pitch page works it out with the same rule (it no longer ticks steps because details were saved) | `app.js` |
| Test: demo data is always announced | `a2` |

Checked in the browser: with demo mode on the bar shows, and Venice shows Preparing & Submitted as the current step.

## 12 November: pitch page steps now agree with the Artists page

Hazel: a pitch sat in Stage 1 on the Artists page, but its page showed every step done except Result.

| Change | Why | File |
|---|---|---|
| The pitch page asks the server for the pitch's stage (`pitchStage`, from the same rule the Artists page uses) and ticks a step only once the pitch has moved past it. Before, saving any application detail (an owner, a payment, a comment) ticked "Preparing & Submitted", so a pitch still at Preparing looked finished. | One rule, two screens | `Part2_Dashboard.js`, `app.js` |
| The built-in demo data (used only when the local server is not reachable) listed Tate Modern at Pitched while its page said submitted. The demo list now puts it under Submitted. | The screen you saw was this demo data: the local server had stopped | `app.js` |
| Tests: 4 checks that the page and the list report the same stage on both routes (including an owner saved on a pitch that is only Preparing); 1 static check | | `tools\audit-tests` |

Checked in the browser: a Preparing pitch with payments saved now shows Pitched and Artist's reply done, Preparing & Submitted current, Result not started.

## 12 November: stage colours

Hazel: the app read as monotone. Approved from a preview. **Badge colour only**; no layout, spacing or wording changed.

| Where | Colours |
|---|---|
| Artists page Stage column, Overview Today's Focus Queue | Pitched amber, Preparing blue, Submitted purple, Won green, Closed red |
| Open Calls Stage column (review steps) | Inbox amber, Verified blue, Matched purple, Owner set green, archived reasons red |

The colours are five new badge classes (`badge-stage-*` at the end of `styles.css`) that use the existing palette tokens, so dark mode follows. Checked in the browser in light and dark.
Not done: the pitch page's step dots, and the Analytics bars, are still one colour. Say if you want those next.

## 12 November: persona review fixes (H1, H3, H4, M1–M4, M6, M7)

Report: `8-Persona-journeys-review.md`. No layout changed; H2 (phone layout) waits for approval.

| # | Change | File |
|---|---|---|
| H1 | Overview filled from the pitches: the three cards (closing within 7 days, waiting for the artist, being prepared) and their notes, Today's Focus Queue (open pitches, nearest deadline first, real organiser, stage and flags), and the Artist Roster (open pitches per artist and what needs attention). Removed: "International Arts Foundation", 14/9/12 "Active", fixed notes, fallback numbers, the "₹3,50,000" in pitch emails, and the "Add to Google Doc" button that only showed a message (it now really adds to the pack). | `app.js` |
| H3 | Add form: the artist chips are replaced by "Artists are matched after the opportunity is verified in the Inbox." (picks there were never saved) | `app.js` |
| H4 | The owner picker adds the signed-in person to the team list if they are missing | `app.js` |
| M1 | Pitch page steps renamed: Pitched, Artist's reply, Preparing & Submitted, Result. Result buttons: Won, Not selected ("Declined" meant the same and is shown as Not selected). "Mark as applied" is "Mark submitted". | `app.js` |
| M2 | "Verified by" shows the person's name, not their email | `Part2_Lifecycle.js` |
| M3 | Open Calls menu offers "Set owner" only once an artist is matched | `app.js` |
| M4 | Save message: "Saved to the Inbox. Verify it there to match artists." | `Part1_Inbox.js` |
| M6 | Open Calls tab "Active" is now "Inbox" | `index.html` |
| M7 | Tab counts and the Artists menu badge show real numbers (they had fixed 11, 2 and 3) | `index.html`, `app.js` |

Checked: 34 test files pass; each fix checked in the browser.

## 12 November: Analytics turned back on

| Change | Why | File |
|---|---|---|
| Analytics is back in the menu. Same layout as the original design; every figure now comes from the pitches: placements won, organisers applied to, applications sent, success rate (won ÷ decided), applications by artist, pitches by opportunity type, and a per-artist table with won titles. Artist tabs and a deadline-year filter work. | It had been hidden because every number was made up | `app.js`, `index.html` |
| Changed wording on Analytics: "Applications by Artist" (there is no agreed yearly target, so the made-up "Target: 100 Calls" was dropped); "Pitches by Opportunity Type"; "Organisers applied to" | Truthful labels for real figures | `app.js` |
| `a2` test updated: Analytics shown, and no fixed figures | | `tools\audit-tests` |

## 12 November: original look restored, new behaviour kept

Hazel: the rework had changed the UI/UX without approval. Every screen was put back to its pre-rework look; the agreed words stay.

| Reverted | Now |
|---|---|
| Opportunity step tracker in 4 columns (`styles.css`) | Original 3 columns, original spacing. Steps: Inbox, Verified, Matched. Matched is complete once every matched artist's pitch has an owner; its note says who still needs one. |
| Owner chips on the opportunity page | Removed. Owners are set from the existing 3-dot menu ("Set owner") on Open Calls or the Artists page. |
| Artists page pack bar and row tick boxes | Removed. Single pitches go into the pack from the 3-dot menu; the pitch page's existing Add to doc / Open doc buttons still work. Multi-select is built on the server but has no screen place until you approve one. |
| Coloured Follow up / Deadline passed pills | Shown as text inside the existing Stage badge, e.g. "Sent 12 Nov · Follow up". |
| Divider line in the 3-dot menu | Removed. |
| Page title "Artist Pitches" and new stage headings | Original title and subtitle; headings back to "Stage 1: …" format with the agreed stage names. |
| Archive filter button row | Removed. The reason shows in the Stage column. |

## 12 November: rework step 6, the running pack

Plan and decisions: `7-Running-pack-plan.md` (built with the recommended answers: Remove allowed, download is not "sent", a dated copy is kept).

| Change | Why | File |
|---|---|---|
| New server actions: `p2_packAdd` (one or many pitches, each to its own artist's pack), `p2_packRemove`, `p2_packText` (clipboard text, grouped by artist), `p2_packGet`, `p2_packSend` | The pack had to work for both storage routes; the newer route was refused before | `Part2_Docs.js`, `Main.js` |
| The artist's doc is rebuilt from the pack list on every change, so Remove works and it never repeats an item | Decision 1 | `Part2_Docs.js` |
| Mark pack sent: stamps every pitch as sent, saves a dated copy ("Marita — sent 12 Nov 2026, 19:40") in the docs folder, and empties the doc | Agreed: reset on send; decision 3 | `Part2_Docs.js` |
| A pitch that is closed or moves past Pitched drops out of the pack automatically | | `Part2_Docs.js` |
| Pitch tag **In pack** (Pitched, not sent, in the pack) | | `Part2_Dashboard.js` |
| Artists page: tick boxes on Pitched, not-sent rows; a bar with Add to pack, Copy text, Clear; on an artist's tab also Open pack and Mark pack sent (count). Menu: Add to pack / Remove from pack. | Agreed: multi-select | `app.js` |
| The pitch page's existing "Add to doc" and the doc review's "Approve" now use the same pack | One pack, not two | `Main.js` |
| New test `a7-running-pack-test.js` (24 checks). The test server's imitation of Drive can now copy a file. | | `tools` |

Limit: the local server only imitates Google Docs. The real doc's look (headings, the interest line) is unchanged from before but has not been checked in a real Google Doc.
Checked: 34 test files pass; in the browser, tick, Add to pack, In pack tag, menu, and Mark pack sent with its confirmation all worked.

## 12 November: rework step 5, and the rest of step 4

| Change | Why | File |
|---|---|---|
| Artists page Stage column shows **Follow up** (sent 7+ days ago, artist has not answered) and **Deadline passed** (deadline before today, not yet submitted). Flags never move a pitch. | Agreed: follow up after 7 days; flag deadlines | `app.js` |
| New pitch button "Close: deadline passed", offered only when that flag shows. Closes the pitch with reason "expired"; it can be reopened. | Agreed: flag, with an option to close | `app.js`, `Part2_Dashboard.js` |
| Open Calls table: Stage column now shows the review step (Inbox, Verified, Matched, Owner set); "Assigned to" is "Owner"; "Unassigned" is "Not matched" (artist) or "No owner" | Agreed terms | `app.js` |
| New test `a6-pitch-flags-test.js` (15 checks); 12 checks added to `a5` | | `tools\audit-tests` |
| Dev sign-in clears leftover demo mode, which had shown made-up data instead of the local server's | Found when a sign-in showed the old screens | `tools\harness\server.js` |

Not done: no "Follow up" flag on Submitted pitches (the screen does not have the submitted date yet).
Checked: 33 test files pass; in the browser, "Open Air Show / Marita" shows Deadline passed with the close button, and the Open Calls table shows the new words.

## 12 November: rework steps 3 and 4

Terms and logic: `6-Workflow-and-terms.md`.

| Change | Why | File |
|---|---|---|
| New server action `p2_movePitch`: sent, interested, needs info, not interested, withdrew, submitted, won, not selected, reopen, step back. It moves one artist's pitch only, on either storage route, and refuses a move that does not fit the pitch's stage. It must name the opportunity by title. | The pitch buttons need one checked way to save | `Part2_Dashboard.js`, `Main.js` |
| Closing a pitch saves the reason and where it was, so Reopen puts it back at the stage it left | Agreed: closed pitches can be reopened | `Part2_Dashboard.js` |
| "Interested" on a pitch with no sent date stamps the sent date | Agreed: artist told in person | `Part2_Dashboard.js` |
| When the last open pitch on an opportunity closes, the opportunity is archived with the reason "All pitches closed". Its closed pitches stay listed on the Artists page. Reopening one returns the opportunity to the Inbox. | Agreed | `Part2_Dashboard.js`, `Part1_Inbox.js` |
| Artists page 3-dot menu now has the pitch buttons for the pitch's stage, above the three existing items. Closing asks first. "Set owner" there sets the owner of that artist's pitch. | Step 3 | `app.js` |
| Opportunity page shows four review steps: Inbox, Verified, Matched, Owner set. "Approve Opportunity" is now "Verify". Artists can be matched only after verifying. Owner set has one chip per artist. | Step 4 | `app.js`, `styles.css` |
| Open Calls "Matched" group now holds opportunities that are verified, matched and have an owner (before: every matched artist had been sent). | Agreed rule for leaving the Inbox | `app.js` |
| Archive has three filter buttons: All, Rejected at review, All pitches closed | Step 4 | `app.js` |
| New test `a5-pitch-moves-test.js` (61 checks); 4 checks added to `a2` | | `tools\audit-tests` |

New columns are added when first needed: `Closed Reason`, `Status Before Close`, `Closed On`, `Closed By` on artist sheets, and `Archive Reason` on the Inbox sheet. On the live system this would add those columns to the real sheets.
Not done: no reason is asked when archiving at review; a pitch with no owner still shows on the Artists page ("No owner") so nothing disappears; the Open Calls table still says "Assigned to", "Unassigned" and "Approved".
Checked: 32 test files pass; in the browser, mark sent, interested, withdrew, auto-archive, the archive filters, Verify trail and per-artist owner all worked on sample data.

## 12 November: rework steps 1 and 2 (commit `5d220c4`)

Terms and logic: `6-Workflow-and-terms.md`.

| Change | Why | File |
|---|---|---|
| The pipeline reply now includes `pitches`: one entry per artist on each opportunity, with that artist's own stage, tag, closing reason, sent date and owner. The old per-call stages are still sent. | The Artists page showed one stage for the whole call, so two artists on a call always moved together | `Part2_Dashboard.js`, `Part2_Artists.js` |
| Artists page groups by the five pitch stages (Pitched, Preparing, Submitted, Won, Closed) using each pitch's own stage. The Stage column shows the tag (Not sent yet, Sent 12 Nov, Needs info) or the closing reason. The Owner column shows that pitch's own owner. | Agreed design | `app.js` |
| Visible labels renamed: Artist Pitches, Owner, No owner, Set owner, Match Artists, + Match Artist, Matched (was Handed off), View all pitches | Agreed terms | `app.js`, `index.html` |
| New test `a4-pitch-stages-test.js` (36 checks); `a2` updated for the new names | | `tools\audit-tests` |

Changed on purpose: older rows with status In Progress or On Hold now show under Preparing (they showed under the "Applied" stage before).
Not renamed yet: messages, pop-ups and the open call editor still say "assign" in places; the opportunity's three-step trail is unchanged (rework step 4).
Checked: 31 test files pass; in the browser, City Art Fair shows Marita under Pitched and Savya under Preparing.

## Server

| Change | Why | File |
|---|---|---|
| Add artist, save artist profile and choose person now run inside the save lock with error handling | Two people saving at once could create duplicates | `Main.js` |
| Assign, unassign and update-details are refused unless they name the open call (title or ID) | A row that had moved could receive someone else's change | `Main.js` |
| 22 read actions now go through the common error handler | Failures were logged without saying which action failed | `Main.js` |
| Open Calls list includes the team member for each call | It showed "Unassigned" again after a reload | `Part1_Inbox.js`, `Main.js` |
| Rate limiter checks both limits before counting, and refuses when busy | It let reads through when busy; a blocked user used up the shared allowance | `Utils.js` |
| Daily clean-up of expired sign-in sessions (starts once `setupAlerts` is run) | They were never removed | `Auth.js`, `Alerts.js` |
| Three sign-in messages repaired | They showed corrupted characters | `Auth.js` |

## App (browser)

| Change | Why | File |
|---|---|---|
| Assign team member and assign artist check the server's answer before saying "Assigned" | They always claimed success, even when refused | `app.js` |
| Assign team member works for artists assigned through the newer ID route | The server rejected it | `app.js` |
| Add Artist works; saves mediums and location; says so when a folder link cannot be stored | The button had never worked (its code sat outside the app's main scope) | `app.js` |
| Rows with nobody assigned show "Unassigned" | They showed invented names | `app.js` |
| Drive buttons open the artist's saved link, or say none is saved | They opened made-up addresses | `app.js` |
| Artists page shows real artists and real calls, in the five approved stages | It showed invented artists, biographies and rows | `app.js` |
| Signed-in person's name, today's date and the real team list are shown | "Hazel F.", "4 November 2026" and a fixed team list were hard-coded | `app.js`, `index.html` |
| Back returns to the page you came from | It always went to Open Calls | `app.js` |
| Analytics hidden from the menu; its address goes to Overview | It showed fixed sample figures. Screen code kept for later. | `index.html`, `app.js` |
| Empty lines removed from `app.js` (35,942 to about 4,700 lines) and `index.html` | 88% of the file was blank lines. Code otherwise identical. | `app.js`, `index.html` |
| 12 buttons given an explicit type; link to a missing manifest file removed | Housekeeping | `index.html` |

## Design system

| Change | Why | File |
|---|---|---|
| Design spec reconciled: one value per colour token, one column list, one font | It contradicted itself | `UI_UX_SPEC.md` |
| 54 unused colour definitions from old themes removed | Dead layers that later ones already overrode. Verified: no visible change on 5 screens, light and dark. | `styles.css` |

## Removed, and not yet restored

Four items in the Artists page 3-dot menu: Approve Opportunity, Decline / Pass, Mark Submitted, Mark Accepted / Won. In the original they showed a message and saved nothing. See `2-Four-buttons-workflow.md`.

## Mistakes made along the way, and corrected

| Mistake | Correction |
|---|---|
| Rebuilding the Artists page, I replaced the five stages with the server's eight statuses and cut the 3-dot menu to two items, without flagging it | Five stages, three menu items and the Pitch Opportunity button restored |
| First stylesheet clean-up removed three colour tokens still in use | Caught by the before-and-after check; restored |
| Removed a development-only sign-in call that an existing test requires | Put back |

## Tests

| | Before any change | Now |
|---|---|---|
| Test files | 27 | 30 (3 new suites, 101 new checks) |
| Passing | 26 | 30 |
| Known failures | `journeys.js` A5 and A8 | None |

A5 and A8 were out of date: they expected artists picked while adding a call to be saved, which Stage 3 removed on purpose (`STAGE3-SPEC.md` rule 1 and section 3.9). They now check the Stage 3 rule.

Browser checks on the local test server (sample data): assign and unassign artist, assign team member (valid, invalid, no artist), reload, update details, add artist (normal, with folder link, duplicate, bad name), Drive buttons, Analytics hidden, Artists page stages and menu, Back from three starting points. All pass.

## Tools added

`tools\run-all-tests.js` (one command for all tests), `tools\audit-tests\` (three suites), `tools\git` (Git 2.56.1, unpacked from the official Git for Windows release, checksum verified).


## 12 Nov 2026: Stylesheet audit & dead-rule pruning

| What changed | Why | Files |
|---|---|---|
| Pruned 108 dead rule blocks and 3 shadowed pulse-card override blocks | Dead classes from earlier v1 prototypes (dash-tabs, month-row, card-pending, dead Framer mock classes) removed | rontend/styles.css |
| Replaced retired Atkinson Hyperlegible declarations with Poppins | Reconciled font usage per UI_UX_SPEC.md | rontend/styles.css |
| Impeccable UI anti-patterns reduced from 16 to 5 | Removed repeated thick side-tab stripes on cards | rontend/styles.css |
| Verified all 35 test suites pass with 0 failures | Ensures strict test & design integrity | 	ools/run-all-tests.js |


## 12 Nov 2026: Authoritative design decisions applied (1B, 2B, 3B, 4A, 5A)

| Decision | Applied Value | Details |
|---|---|---|
| Primary Text (1B) | #151e11 (Warm Olive-Dark) | Replaces #111827 across page titles, logo emblem, and primary headings |
| Light Canvas (2B) | #faf9f5 (Warm Fine-Art Paper) | Replaces #f4f5f1 across workspace canvas and background |
| Dark Theme Surface (3B) | #09090b canvas / #18181b card surfaces / #27272a borders | Neutral Zinc dark mode palette replaces older olive/obsidian values |
| Brand Accent (4A) | #d2e21a (Electric Lime) | Retained as authoritative accent on logos, active dots, and CTAs |
| Media Queries (5A) | Strict 3-Tier standard (<768px, 768-1023px, ≥1024px) | Normalized all 41 arbitrary sub-breakpoints (380px, 420px, 560px, 640px, 840px) |
| Verification | All 35 test suites pass | 0 failures in test runner |


## 12 Nov 2026: Step 3 component deduplication completed

| Component | What was consolidated | Files |
|---|---|---|
| body | Merged 11 declarations into 1 clean authoritative block using #faf9f5 canvas and #151e11 text per spec | frontend/styles.css |
| header.top | Pruned 16 dead sub-rules across 400 lines; maintained single clean display: none !important; rule | frontend/styles.css |
| .bulk (#bulk) | Unified docked vs floating conflict into 1 modern floating pill bar (bottom: 24px, radius: 20px) | frontend/styles.css |
| .btn | Consolidated button rules into authoritative pill shape (radius: 9999px, height: 40px/32px) per UI_UX_SPEC §4 | frontend/styles.css |
| .card | Standardized card radius to 20px with 1px border across .card, .tk-card, and .tk-table-card | frontend/styles.css |
| nav.tabs | Removed obsolete 220px desktop width; aligned with 250px standard and 3-tier responsive specification | frontend/styles.css |
| Verification | All 35 test suites verified passing (0 failures) | tools/run-all-tests.js |


## 13 Nov 2026: Strict Table Cell Alignment and Fixed Layout Rules

| Component | What was changed | Files |
|---|---|---|
| `.tk-grid-table` layout | Added `table-layout: fixed !important; width: 100% !important;` to ensure all collapsible pipeline sections (Pitched, Preparing, Submitted, Won, Closed) and Open Calls tables have pixel-perfect, locked column alignments across sections. | `frontend/styles.css` |
| Table headers & cells padding | Normalized padding across both `th` and `td` to eliminate horizontal text shifting between header and row content. | `frontend/styles.css` |
| Strict column rules | Added dedicated column classes (`.tk-col-check`, `.tk-col-opp`, `.tk-col-cat`, `.tk-col-fee`, `.tk-col-deadline`, `.tk-col-stage`, `.tk-col-artist`, `.tk-col-owner`, `.tk-col-actions`) with explicit width allocations, text alignments, and vertical centering. | `frontend/styles.css`, `frontend/app.js` |
| `<colgroup>` definitions | Added structured `<colgroup>` column definitions across `loadArtistsList` and `renderListTable` so all browser render engines strictly lock column geometry. | `frontend/app.js` |
| Badge & cell truncation | Handled extended stage badge content (`Preparing · Deadline passed`) with graceful ellipsis and increased column allocation to prevent text overlapping into neighboring cells. | `frontend/styles.css` |
| Verification | All 35 test suites verified 100% passing (0 failures). | `tools/run-all-tests.js` |


## 13 Nov 2026: Center-Aligned Column Labels & Compact Action Column

| Component | What was changed | Files |
|---|---|---|
| Column Headers & Cells | Center-aligned column labels (`<th>`) and data cells (`<td>`) for `CATEGORY`, `FEE`, `DEADLINE`, `STAGE`, `ARTIST`, and `OWNER` across both Artists Pipeline and Open Calls tables. `OPPORTUNITY` remains left-aligned with title text to preserve reading hierarchy. | `frontend/styles.css` |
| Actions Header (`...`) | Removed the `ACTIONS` text label from table headers (`<th class="tk-col-actions" aria-label="Actions"></th>`), freeing ~32px of table width that is reclaimed by data columns. | `frontend/app.js`, `frontend/styles.css` |
| Column Width Allocations | Balanced full-table column percentages (`OPPORTUNITY`: 30%, `CATEGORY`: 11%, `FEE`: 8%, `DEADLINE`: 11%, `STAGE`: 13%, `ARTIST`: 13%, `OWNER`: 14%, `ACTIONS`: 44px, `CHECKBOX`: 44px) so badges like "Preparing" have ample breathing room without clipping. | `frontend/styles.css` |
| Split View Adaptation | In Open Calls half-pane split view, hid duplicate columns (`Category`, `Fee`, `Owner`) that are already detailed in the preview pane, resized the 3-dots action column to 40px, and widened `STAGE` (22%) and `ARTIST` (22%) to prevent badge truncation. | `frontend/styles.css` |
| Verification | All 35 test suites verified 100% passing (0 failures). | `tools/run-all-tests.js` |


## 13 Nov 2026: Visual Hierarchy & Font Weight Reduction for Table Data

| Component | What was changed | Files |
|---|---|---|
| Opportunity Titles | Reduced font weight from heavy bold `700` to semi-bold `600` and sized to `13.5px` across `.tk-cell-title`. Removes visual conflict with table section headings (`Stage 2: Preparing`, 15.5px 700) and headers. | `frontend/styles.css` |
| Fee Display | Reduced fee text weight from `700` to `600` and sized to `13px` across `.tk-support-amount`, removing heavy black ink blocks from `$50` / `Free`. | `frontend/styles.css`, `frontend/app.js` |
| Urgent Deadlines | Reduced urgent deadline text (`.tk-cell-deadline.urgent`) from heavy bold `700` to clean semi-bold `600` at `13px`. | `frontend/styles.css` |
| Verification | All 35 test suites verified 100% passing (0 failures). | `tools/run-all-tests.js` |


## 13 Nov 2026: Stage-Colored Count Pills for Pipeline Table Headers

| Component | What was changed | Files |
|---|---|---|
| Stage Count Pills (`.tk-count-pill`) | Dynamic stage dot color binding added to each section count pill (`.tk-count-pill.dot-green`, `.dot-amber`, `.dot-blue`, `.dot-gray`, `.dot-purple`). Background of the count pill now directly mirrors the stage color dot (e.g. green for Stage 2, amber for Stage 1, blue for Stage 3) with crisp white text. | `frontend/app.js`, `frontend/styles.css` |
| Sizing & Centering | Added `min-width: 24px`, flex centering, and normalized padding to ensure single and double-digit counts maintain balanced circular pill geometry. | `frontend/styles.css` |
| Verification | All 35 test suites verified 100% passing (0 failures). | `tools/run-all-tests.js` |


## 13 Nov 2026: Sidebar Dynamic Artists Dropdown & Filtering

| Component | What was changed | Files |
|---|---|---|
| Sidebar Artists Dropdown | Added an interactive dropdown beneath `Artists` in the main sidebar (`#tkNavArtistsSub`), dynamically populated from the active artist roster (`All Artists`, `Harsha`, `Marita`, `Savya`, plus any dynamically added artists). | `frontend/index.html`, `frontend/app.js`, `frontend/styles.css` |
| Navigation & State Sync | Clicking an artist in the sidebar routes to that artist's view (`#/artists/:name`), activates their top artist tab, displays their profile banner and pitch opportunity button, and filters their pipeline pitches. Bidirectionally synchronized with the top artist tabs. | `frontend/app.js` |
| Toggle Caret | Added a clean toggle chevron next to the artists count badge allowing users to expand or collapse the sidebar artist list on demand; auto-opens when navigating to the Artists section. | `frontend/index.html`, `frontend/styles.css`, `frontend/app.js` |
| Verification | All 35 test suites verified 100% passing (0 failures). | `tools/run-all-tests.js` |
