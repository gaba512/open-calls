# The four missing Artists-page buttons: what they were and what they would need

Nothing here is implemented. This is for you to decide the workflow first.

**What I read for this.** In full: the original Artists page code (from the first Git commit), and every server function that decides or stores a stage or status: `p2_getPipeline`, `artistCallStatesForRow_`, `pipelineStageForCall_`, `computeArtistCallState_`, `p2_recordArtistResponse`, `recordResponseById_`, `confirmSubmissionById_`, `PIPELINE_SECTIONS_`, `RESPONSE_TO_STATUS_`, and the status lists in `Config.js`. I did not read all of `app.js` and `Utils.js` line by line; where I am unsure it is marked "not verified".

## 1. What each button originally did

All four lived in the 3-dot menu of rows on the Artists page. In the original code each one showed a message and opened or closed two sections. None sent anything to the server, so nothing was saved and the row did not actually move.

| Button | Shown on rows in | Message shown | What it represented |
|---|---|---|---|
| **Approve Opportunity** | Stage 1 | "Marked Approved! Moved to Dossier Drafting." | The artist has said yes to a call that was pitched to them |
| **Decline / Pass** | Stage 1 | "Marked as Declined/Passed." | The artist has said no, or the team is dropping it for that artist |
| **Mark Submitted** | Stage 2 | "Moved to Stage 3: Application Submitted!" | The application for that artist has been sent to the organiser |
| **Mark Accepted / Won** | Stage 3 | "Congratulations! Moved to Stage 4: Accepted / Won Placement!" | The organiser has accepted that artist |

**A naming clash to settle.** "Approve" already means something else on the Open Call page: step 2 of the Details, Approve, Send trail is the *team* approving a call as worth sending. On the Artists page "Approve Opportunity" meant the *artist* approving. Two different decisions share one word.

## 2. Who each action is about

| Button | About | Whose decision |
|---|---|---|
| Approve Opportunity | One artist on one call | The artist (recorded by the team) |
| Decline / Pass | One artist on one call | The artist, or the team on their behalf |
| Mark Submitted | One artist's application | The team (an action they took) |
| Mark Accepted / Won | One artist's application | The organiser (recorded by the team) |

None of the four is about the opportunity as a whole, and none is the internal "approve this call" decision.

## 3. What would be saved, and where

The app stores an artist's progress in one of two places, depending on how the artist was assigned:

- **Older storage:** a row on the artist's own Google Sheet (columns such as `Sent On`, `Artist Response`, `Status`, `Applied On`).
- **Newer storage (Stages 2 and 3 work):** a row on the artist's `ArtistCalls` tab, with one `Lifecycle Status` column.

| Button | Server action that already exists | Older storage: what changes | Newer storage: what changes |
|---|---|---|---|
| Approve Opportunity | `p2_recordArtistResponse` with "Interested" | `Artist Response` = Interested, `Interested` = true, `Artist Review` = Artist Reviewed, plus who and when | `Lifecycle Status` = Interested, `Interested On`, who and when |
| Decline / Pass | `p2_recordArtistResponse` with "Not Interested" | `Artist Response` = Not Interested | `Lifecycle Status` = Not Interested |
| Mark Submitted | Older: `p2_updateApplicationDetails` with status "Applied". Newer: `p2_confirmSubmission` | `Status` = Applied, `Applied On` = date | `Lifecycle Status` = Application Sent, `Submission Confirmed On` and `By`. Only allowed when the status is "Application" |
| Mark Accepted / Won | Older: `p2_updateApplicationDetails` with status "Accepted" | `Status` = Accepted | `Lifecycle Status` = Accepted. Which function writes this: not verified |

So no new kind of save is needed for three of the four; the application page already uses these actions. The Artists-page buttons would be shortcuts to them.

## 4. Effect on the eight statuses and five stages

| Button | Underlying status after | Visual stage after | Problem |
|---|---|---|---|
| Approve Opportunity | Interested | Stage 2 | None found |
| Decline / Pass | *stays* "Awaiting response" in older storage | *stays* Stage 1 | **Gap.** The server only counts a call as "Not accepted" when `Status` is Declined or Not Selected. A "Not Interested" response does not move it. Either the button should set `Status` = Declined, or the server rule should treat "Not Interested" as Stage 5. Your decision. |
| Mark Submitted | Applied | Stage 3 | In newer storage it is refused unless the status is already "Application"; the step from Interested to Application has no button anywhere (not verified where it is set) |
| Mark Accepted / Won | Accepted | Stage 4 | None found in older storage |

Two things the original buttons never covered: the organiser saying **no** (Stage 3 to Stage 5), and **undoing** a mistaken click. Both need deciding.

## 5. Are artist statuses stored separately or shared per call?

**Stored separately. Shown shared.** This is the most important finding.

- Storage: each artist has their own row for each call, in both storages. Marita can be "Interested" while Savya is "Awaiting response" on the same call. The application page reads and writes per artist.
- The list the Artists page uses (`p2_pipeline`) throws that detail away. It works out one stage for the whole call: "the furthest one any of the call's artists has reached" (the code's own comment). The order it checks is Accepted, Applied, Need more info, Interested, Awaiting response, Not accepted.

**Consequence.** With two artists on a call, pressing a button for one would visibly move both rows, and the second artist would be shown at a stage they have not reached. The Artists page has this inaccuracy today even without the buttons.

**So there is a prerequisite.** Before any of the four buttons is added, the list needs to return each artist's own status. The information is already gathered inside the server function and then discarded, so this is a small server change, but it changes what the list returns and needs its own tests.

## 6. Decisions I need from you

1. **Wording:** keep "Approve Opportunity", or rename it (for example "Artist interested") so it cannot be confused with the team's approval?
2. **Decline / Pass:** is this the artist's answer (record "Not Interested") or a final outcome (record status "Declined")? And should it move the row to Stage 5?
3. **Per-artist stages:** approve the prerequisite change so each artist's row shows their own stage.
4. **Mark Submitted:** should it be allowed straight from Stage 2, or only after an "application in progress" step?
5. **Organiser says no:** add a fifth action ("Not selected"), or leave that to the application page?
6. **Undo:** should each action offer Undo for a few seconds, as archive does?
7. **Confirmation:** should the two that end a pipeline (Decline, Accepted) ask "Are you sure?" first?
