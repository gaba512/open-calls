# Decisions on the 30 issues (13 November 2026, evening)

Your calls on the issues illustrated in `issue-visuals\index.html`. The numbers match that page and `9-UIUX-gap-analysis.md`.

## Accepted as stated

1, 2, 3, 4, 5, 7, 10 (half-pane as a full sheet when below desktop), 11, 13, 15, 16, 17, 18, 21, 26, 28, 30.

## Accepted with your amendments

| # | Fix as described | Your amendment |
|---|---|---|
| **8** | Columns never overlap. | On desktop, give the row that holds the table a horizontal scroll bar; let that row scroll sideways rather than squashing columns. |
| **9** | Sidebar's artist list stops overlapping the table at tablet widths. | At that width, move navigation to the bottom of the screen (phone-style bottom bar). |
| **12** | "Send to artist" in the preview pane does the same thing as the row menu's "Send to artist" and carries the same label. | — |
| **13** | Preview pane shows only stored values; "Not stated" where there is none. | All the placeholder strings currently in `app.js` go into one file of their own (e.g. `frontend\js\placeholders.js`) so none are inlined with the component code. |
| **14** | `#/entry/{row}` for a row that does not exist shows "not found". | If the "99999" fallback exists only to show an invented record, remove it from the code — everything it produced was dummy data. |
| **22** | Deadline column no longer collides with the Closed pitch stage. | Keep the word "Closed" in the deadline column, drawn in red. Rule for the opportunity itself: for up to **7 days** after the deadline passes it stays in the Inbox (with the red Closed label); after 7 days with no action it moves to the Archive automatically, filed under a new filter "Deadline passed". |
| **24** | Bulk Set owner reports true results. | Also fix the selection logic: the bulk bar's actions must apply only to the rows the user ticked. |
| **25** | On Artists, bulk Archive acts on the ticked pitch only. | A ticked pitch in Archive closes that pitch (not the opportunity). Reason default: "withdrew" (same wording as the terms document). |
| **27** | Closing Soon count and filter use the same window and show a true count, 0 included. | Window is **7 days**. |
| **29** | "Pitch Opportunity" builds its email from a real pitch. | The body template still contains boilerplate: move that boilerplate into the same placeholders file created for issue 13. The modal fills it from the pitch it was opened from. |

## Not accepted

| # | Your answer |
|---|---|
| **19** | Keep Save Draft on Inbox opportunities. (No change.) |

## Postponed

| # | Reason |
|---|---|
| **20** | Keyboard-only click targets. Not a priority now. |
| **23** | Console error on load. Postponed. |

## Dark palette: Zinc (chosen)

The `--tk-*` dark values already in `UI_UX_SPEC.md` §1.2 stand: `--tk-bg #09090b`, `--tk-card #18181b`, `--tk-sunk #202024`, `--tk-subtle #141417`, `--tk-border #27272a`, `--tk-dark #f9fafb`, `--tk-muted #a1a1aa`, `--tk-lime #d2e21a`. Stage pills in dark (proposed; final colours depend on N2):

| Stage | Text | Fill | Contrast (computed) |
|---|---|---|---|
| Pitched | `#fde68a` | `#78350f` | 7.28 : 1 |
| Preparing | `#bfdbfe` | `#1e3a8a` | 7.29 : 1 |
| Submitted | `#ddd6fe` | `#4c1d95` | 7.89 : 1 |
| Won | `#bbf7d0` | `#14532d` | 7.52 : 1 |
| Closed | `#e4e4e7` | `#3f3f46` | 8.23 : 1 |

Body text on canvas 19.04 : 1; muted on card 6.91 : 1. The contrast figures printed on the template page were my estimates; these are the computed values and replace them.

## Open decisions, latest

- **N2:** Option A (one colour per stage).
- **N3:** Option A (add server support for a Drive folder link).
- **N5:** keep as danger (red). Spec to record it.
- **N4:** postponed. The feature needs more detail first (questions in [11-Work-list-from-decisions.md](11-Work-list-from-decisions.md)). Naming is also open.

## Carries into the open decisions

- **Issues 12 and 29 together answer N1**: keep the "Send to artist" and "Pitch Opportunity" controls (as (b) in the spec's §15), rebuilt on real pitch data, with boilerplate moved into the placeholders file.
- N2 (one colour per stage), N3 (Drive folder link), N4 (where the running-pack controls go) and N5 (Sign out as danger) are still open.

## What now changes in the spec

`UI_UX_SPEC.md` in the app folder will be updated to:

- Remove C8, C15, C20, C10, F1, F3, F4, P10, P2, P8, T1, T19, G6, H5, R1, H3, H2, M12, G5, S2, S4, C22, C17, M16, C23, T16, T12, T7, C4, P9, §12.3 from "needs decision" status where they were, and record the amended checks above.
- Add a new requirement T20 (desktop table horizontal scroll bar).
- Add a new requirement G12 (tablet bottom navigation).
- Add a new requirement P12 (opportunity moves to Archive 7 days after a passed deadline with no action; "Deadline passed" filter in Archive).
- Add a new requirement X3 (placeholders file: one source for every stock string).
- Add a new requirement M22 (bulk bar selection scope: only ticked rows).
- Close N1 with (b) + placeholder file.
- Leave N2–N5 open.
- Mark 19 "accepted as working": Save Draft stays on Inbox.
- Mark 20 and 23 "deferred".
