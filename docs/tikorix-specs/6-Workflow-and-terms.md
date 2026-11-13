# Tikorix workflow and terms

Agreed with Hazel on 12 November 2026. This is the single reference for words and logic.
**Implementation Status (13 November 2026):** Fully implemented across Rework Steps 1–6 in both `backend/` and `frontend/`. Pitches, review steps, pitch stages, per-artist owners, and the running pack engine are fully operational and verified by 35 test suites.

## 1. Terms

| Term | Means | Replaces |
|---|---|---|
| **Opportunity** | The open call itself. One shared record. | open call, call, opp |
| **Pitch** | One opportunity offered to one artist. All artist statuses and dates live here. | artist call, application, assignment |
| **Match** | Choosing an artist for an opportunity. Creates a pitch. | assigned to artist |
| **Owner** | The team member working on one pitch. Each artist's pitch has its own owner. | assigned to team member |
| **Review steps** | The four steps an opportunity goes through (phase 1). | 3-step pipeline, trail |
| **Pitch stages** | The five stages a pitch goes through (phase 2). | pipeline, stages, statuses |
| **Archived** | An opportunity rejected at review. | |
| **Closed** | A pitch that has stopped, with a reason. | Declined / Passed, Not accepted |
| **Running pack** | One Google Doc per artist that collects pitches to send together. | |

The word "assigned" is retired. "Pipeline" is not used for anything else.

## 2. Phase 1: the opportunity (Open Calls page)

**Capture.** The user adds a link, PDF or image. The AI fills in the form. The user chooses:
- **Save as draft**: still filling it in. Only the person who started it needs it.
- **Save to Inbox**: ready for the team to vet.
- **Cancel**: thrown away.

**Review steps**, in order:
1. **Inbox**: captured, being checked against the source.
2. **Verified**: the Verify button. The information is confirmed correct.
3. **Matched**: the Match artists button. One or more artists.
4. **Owner set**: the Set owner button.

Rules:
- Verify comes first. Match and Set owner can then happen in either order.
- If no artist suits it, the opportunity is **Archived** with a reason (not suitable, expired, bad information). It can be restored to the Inbox.
- If every pitch on a matched opportunity is later closed, the opportunity moves to Archive as **All pitches closed**. It can be rematched from there.
- When it is Verified, has at least one artist and has an owner, phase 1 is done. Its pitches appear on the Artists page automatically, in stage Pitched.
- It stays visible on the Open Calls page in the **Matched** section under the Inbox.
- Another artist can be matched later. That adds one new pitch in stage Pitched.

Tabs on Open Calls: Inbox (with the Matched section beneath), Archive, Drafts. Archive has one filter for **Rejected at review** and one for **All pitches closed**. Each item keeps its reason.

## 3. Phase 2: the pitch (Artists page)

**Pitch stages**, the same names on the Artists page and on the individual pitch page:

| Stage | Means | Tags shown |
|---|---|---|
| **Pitched** | The artist has not answered yet. | not sent yet / sent (date, time) / needs info / follow up |
| **Preparing** | The artist is interested. The team is gathering documents and filling in the application. | |
| **Submitted** | Applied. Waiting for the organiser. | follow up |
| **Won** | The artist got it. | |
| **Closed** | Stopped. Reason: not interested, withdrew, not selected, reassigned, expired. | |

Rules:
- **Sent** is a date and time on the pitch, not a stage.
- **Needs info** keeps the pitch in Pitched, with a comment saying what is needed.
- **Follow up** appears after 7 days without a reply. It is a tag; the pitch does not move.
- The artist can back out at any stage. The pitch goes to Closed with reason "withdrew".
- **Reassigning** to another artist: close the first pitch with reason "reassigned" and match the new artist. The opportunity itself does not move.
- Closed pitches are listed per artist, separate from the Open Calls archive.

**Buttons on a pitch:** Mark sent, Interested, Needs info, Not interested, Submitted, Won, Not selected.

**Artists page layout:** an All artists view grouped by artist, plus one tab per artist. Unchanged.

## 4. Running pack

- One Google Doc per artist.
- Add one pitch at a time from its page, or select several on the Artists page and add them together. The same selection can be copied to the clipboard.
- Marking the pack sent (or downloading it) stamps every pitch in it with the sent date and time. The doc then resets to blank.

## 5. How today's eight statuses map

| Today | Becomes |
|---|---|
| Added, Approved | Pitched, not sent yet |
| Awaiting response | Pitched, sent |
| Need more info | Pitched, needs info |
| Interested | Preparing |
| Applied | Submitted |
| Accepted | Won |
| Not accepted | Closed, not selected |
| "Not Interested" response | Closed, not interested |

## 6. Decisions (12 Nov)

1. **Owner:** each artist's pitch has its own owner.
2. **All pitches closed:** the opportunity moves to Archive, filter "All pitches closed", and can be rematched.
3. **Copy to clipboard:** does not count as sent. The user presses Mark sent separately.
4. **Deadline passes before submission:** the pitch is flagged, with an option to move it to Closed as "expired".
5. **Undo:** a closed pitch can be reopened, and a pitch can step back one stage.
6. **Told in person:** a pitch can go to Interested without a sent date.
