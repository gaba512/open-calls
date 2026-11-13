# Step 6 plan: the running pack

Written 12 November 2026. **Built the same day** with the recommended answers to all three decisions; see `3-Change-log.md`.

## What exists today

- Each artist already has one Google Doc, "<Artist> — Open Calls", in a shared Drive folder (`Part2_Docs.js`).
- **Add to doc** appends one opportunity (title, deadline, fee, link, eligibility, an interest checkbox line) and stamps `In Doc On`.
- **Approve doc** marks every pitch that is in the doc as sent.
- **Copy to clipboard** and **Open doc** exist on the individual pitch page, one opportunity at a time.

## What is missing

1. **It only works for older pitches.** Pitches made through the newer route (the ArtistCalls tab) are refused with "has not been assigned this call yet".
2. **The doc never resets.** Old opportunities stay in it forever.
3. **No multi-select.** You cannot pick several pitches on the Artists page and add or copy them together.
4. **You can't see what is in the pack.** Nothing on the Artists page says "in pack".
5. **No way to take something back out** of the pack.

## Proposed build

| # | Change | Where |
|---|---|---|
| 1 | Add to pack and Mark pack sent work for both storage routes. | Server |
| 2 | **Mark pack sent** stamps the sent date and time on every pitch in the pack, saves a dated copy of the doc ("Harsha — sent 12 Nov 2026") in the same folder, then clears the doc back to its heading. | Server |
| 3 | A Pitched pitch in the pack shows the tag **In pack**. | Server, Artists page |
| 4 | Artists page: a checkbox on each Pitched, not-sent row, and a bar with **Add to pack**, **Copy text**, **Open pack**, **Mark pack sent**. On All Artists, each pitch goes to its own artist's pack. | Artists page |
| 5 | **Remove from pack** on a pitch's menu. | Server, Artists page |
| 6 | The single-pitch buttons on the pitch page keep working and use the same pack. | Pitch page |
| 7 | Tests for both routes, reset, and the dated copy; browser check. | Tests |

Limit: the local test server only imitates Google Docs, so the real document layout can only be checked on the rehearsal account or live.

## Decisions needed

1. **Removing from the pack.** To take an item out, the doc has to be rebuilt from the pack list, which would undo any hand edits made in the doc. Options:
   - (a) allow Remove, rebuilt on each change (recommended);
   - (b) no Remove; edit the doc by hand instead.
2. **Download.** Does downloading the pack count as sent? Copying does not, by your earlier decision. Recommended: keep it separate, so download and then press Mark pack sent.
3. **Dated copy on reset.** Keep a copy of each sent pack in Drive as a record? Recommended: yes.
