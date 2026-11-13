# Work list from the open decisions (13 Nov 2026)

Decisions made: **N2 Option A**, **N3 Option A**, **N5 keep as danger (red)**. **N4 is open**, see below.

## N4: postponed

Decision on where the pack controls go is postponed until the feature itself is specified in more detail. Nothing in this list is built for N4 yet.

Current state, in plain terms: each artist has a single Google Doc that gathers the opportunities being sent to them, so several can go in one email. The code for adding to that doc and marking it sent exists, but no button for it is on the page.

Questions to settle before N4 can be decided (this is the detail still needed):
- What is the doc's actual content: one heading per opportunity, or the full application text?
- Who sends it: the team by hand, or the app?
- What does "sent" mean: after the artist has approved, or after it reaches the organiser?
- What happens to a pitch that is removed from the doc, or added to two artists' docs?
- Is the name "running pack" right for the team? It is not in plain English. Options to consider: "artist batch", "submission bundle", "send list".

## Work to build (for later)

### N2 · One colour per stage (Option A) — built
- [x] One colour per stage on dots, count pills and badges: Pitched amber, Preparing blue, Submitted purple, Won green, Closed grey (`frontend\styles.css`, `frontend\app.js` section list).
- [x] Contrast: count pills 8.26 (amber, dark text), 6.70 (blue), 5.70 (purple), 5.02 (green), 7.56 (grey), measured.
- [ ] Dark-mode stage colours: not done here. Use the Zinc values in `10-Decisions-13-Nov-visuals.md` when the dark-mode migration (spec F4) is built.
- [ ] Re-measure the count pills in the running app.

### N3 · Drive folder link (Option A) — built
- [x] Backend: new column "Drive Folder Link" on the artist profile (`backend\Config.js`); saved and returned (`backend\Part2_Artists.js`). Server refuses anything that is not a Google Drive folder link.
- [x] Frontend: Add Artist accepts a Drive folder link and saves it; Sheets links still go to the sheet. Other values are refused with a message.
- [x] "Open" for an artist uses the Drive folder link first, then the sheet link.
- [ ] Not tested in the running app or with a real Google account. Backend test for the new column not yet added.
- [ ] Update spec rows M17 and D-F1.

### N5 · Sign out (keep as danger) — decided
- [x] No change: it is already red.
- [ ] Record in `UI_UX_SPEC.md` §15.

### N4 · Pack controls (postponed)
- [ ] Specify the feature (see questions above).
- [ ] Choose the name.
- [ ] Then decide the location and build.

## Also carried from the 13 Nov calls (not yet built)

These were accepted in `10-Decisions-13-Nov-visuals.md`:
- Issues 8, 9, 10 (layout at narrow widths), 12 and 29 (Send to artist / Pitch Opportunity rebuilt on real pitch data), 13, 14, 22, 24, 25, 27.
- Dark palette: Zinc, already in the spec.

Postponed: 20 (keyboard click targets), 23 (console error).
Not accepted: 19 (Save Draft stays on Inbox items).
