# Tikorix: status and decisions

As of 13 November 2026. Local working copy.

## Where things stand

- **Server code:** Sound. 35 of 35 test suites pass (100% green).
- **Project Structure:** Pruned and cleanly organized into `frontend/` and `backend/`. All 45,000+ lines of obsolete files removed.
- **Workflow & Pitches:** Rework Steps 1–6 complete. Pitches are tracked individually per artist with their own stage, owner, and running pack.
- **App & Analytics:** All screens show verified real data. Analytics is fully active with real placements, win rates, and submission tallies.
- **UI/UX & Alignment:** Strict table colgroup alignment, center-aligned metadata columns, single-line fee formatting, adaptive split-view preview pane, relaxed typography hierarchy (600 semi-bold), stage-colored count pills, and dynamic collapsible sidebar artists dropdown.
- **Version control:** Fully tracked in local Git repository.
- **Not deployable yet:** Production rehearsal on the live Google Workspace account has not yet been executed.

---

## Recent Decisions & Fixes Completed (12–13 November)

| Area | Decision / Fix | Status |
|---|---|---|
| **Per-Artist Pitches** | Replaced per-call stage with individual pitch records per artist (`pitches`). Two artists on the same opportunity move through stages independently. | Completed (Rework Steps 1–2) |
| **Workflow Logic** | Implemented agreed review steps (Inbox, Verified, Matched, Owner set) and pitch stages (Pitched, Preparing, Submitted, Won, Closed). | Completed (Rework Steps 3–4) |
| **Running Pack** | Added running pack engine (`p2_pack*`) allowing pitches to be bundled into artist Google Docs. | Completed (Rework Step 6) |
| **Analytics** | Restored Analytics to main navigation, driven by real pitch outcomes. | Completed |
| **Folder Reorganization** | Separated Apps Script backend into `backend/` and static web app into `frontend/`. Resolved `config.js` vs `Config.js` collision cleanly. | Completed |
| **Multi-Select Checkboxes** | Added row checkboxes and floating bulk action bar across Open Calls and Artists tables. | Completed |
| **Table Column Alignment** | Enforced explicit `<colgroup>` styles across all accordion stages. Center-aligned metadata columns (`CATEGORY`, `FEE`, `DEADLINE`, `STAGE`, `ARTIST`, `OWNER`, `ACTIONS`) while keeping `OPPORTUNITY` left-aligned. | Completed |
| **Label-less Actions Header** | Removed text from `<th class="tk-col-actions" aria-label="Actions"></th>`, reclaiming ~32px of table width for data columns. | Completed |
| **Single-Line Fee** | Simplified FEE column to single line (`Free` or `$50`); descriptions remain in tooltip and half-pane preview. | Completed |
| **Adaptive Split-View** | When half-pane opens, duplicate columns (`CATEGORY`, `FEE`, `OWNER`) hide automatically so table columns fit without collision. | Completed |
| **Typography Hierarchy** | Relaxed table row titles, fees, and urgent deadlines from `700` bold to `600` semi-bold so table rows do not compete visually with section headers (`15.5px / 700`) or column headers (`11.5px / 700`). | Completed |
| **Stage Count Pills** | Accordion header row count pills inherit stage status dot colors (amber, green, blue, purple, gray) with high-contrast white text. | Completed |
| **Sidebar Artists Dropdown** | Interactive collapsible sub-menu under "Artists" (`#tkNavArtistsSub`) dynamically populated from the active artist roster, bidirectionally synced with page tabs and routes (`#/artists/:artistName`). | Completed |

---

## Known problems still open

| Problem | Notes |
|---|---|
| Approval links never expire | They carry no expiration date. |
| Rehearsal | Needs to be run against the rehearsal Google account before production deploy. |
| Production manifest | Live `appsscript.json` to be verified against repository permissions before live update. |

---

## Waiting on you

1. **Production Rehearsal:** Permission to run read-only step S0 and rehearsal test scenarios S1–S9 in `Documents\Claude\stage4-rehearsal`.
2. **Backups:** Confirm company backup folder and schedule in Google Drive prior to deployment.
