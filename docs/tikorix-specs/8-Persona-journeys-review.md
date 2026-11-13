# Persona journeys review

12 November 2026. The local copy was run in the browser with sample data, through the full journey described in `6-Workflow-and-terms.md`, as five people.

**Status (later on 12 Nov): fixed:** H1, H3, H4, M1, M2, M3 (the Set owner part), M4, M6, M7. See `3-Change-log.md`. **Still open:** H2 (phone layout, needs approval), M3 (Verify and Archive in the row menu), M5 (where multi-select goes), and L1–L3.

**Severity:** **High** means someone is misled or blocked. **Medium** means friction or inconsistency. **Low** means polish.

## Personas

| # | Who | Journey run |
|---|---|---|
| P1 | **Scout**: finds an open call, often on the phone | Add an open call from a link, then save it to the Inbox |
| P2 | **Reviewer**: vets the Inbox | Open, verify, match an artist, set an owner |
| P3 | **Owner**: works one artist's pitches day to day | Send, record the reply, prepare, submit, close; use the running pack |
| P4 | **Director**: wants the big picture | Overview, then Analytics |
| P5 | **New team member** on their first day | Sign in, try to take ownership of work, find counts |

## Findings

### High

| # | Persona | What happens | Suggested fix |
|---|---|---|---|
| H1 | P4 | **Overview shows made-up figures.** Every opportunity's organiser reads "International Arts Foundation". The artist cards say "14 Active", "9 Active" and "12 Active". "Late Night Open" is listed under Marita although no artist is matched to it. Its stages ("In Preparation", "Needs Reply") are not the agreed ones. | Fill the Overview from the same pitch data as the Artists page and Analytics, keeping its layout (as was done for Analytics). |
| H2 | P1 | **On a phone, every main screen is cut off on the right.** The tables are about 1,000 px wide inside a 375 px screen and cannot be scrolled sideways. Buttons such as "Add Artist" and the date are clipped. Scouting by sharing a link from the phone is the main way calls come in. | Let tables scroll sideways on narrow screens, or show rows as cards. Stack the four Analytics cards two by two. This is a layout change. |
| H3 | P1 | **Artists picked on the Add form are silently dropped.** The form shows Harsha, Marita and Savya chips. Picking one saves nothing (by design, matching happens after Verify), but nothing tells the scout that. | Remove the chips from the Add form, or replace them with a note: "Artists are matched after the call is verified." |
| H4 | P2, P5 | **Nobody can be made an owner until they are added under Settings.** The signed-in person is not on the team list, so "Set owner" says "No team members yet". Because an opportunity only leaves the Inbox once every pitch has an owner, a new team gets stuck at the last review step. | Add the signed-in person to the team list automatically on first sign-in, or offer "Add me" in the owner picker. |

### Medium

| # | Persona | What happens | Suggested fix |
|---|---|---|---|
| M1 | P3 | The individual pitch page still uses the old steps: Sent, Awaiting Response, Application, Outcome, with Accepted, Declined and Not selected buttons. The Artists page uses the five agreed stages. Two vocabularies describe the same pitch. | Relabel the pitch page with the five stages and the same buttons as the 3-dot menu. Keep the layout. |
| M2 | P2 | "Verified by tester@artisteculture.com" shows an email address, not a name. | Show the person's name. |
| M3 | P2 | On Open Calls, the row menu offers "Set owner" on an opportunity with no artist. It then fails with an unrelated message. Verify and Archive are not in the menu, so every review needs the opportunity opened. | Hide "Set owner" until an artist is matched. Consider Verify and Archive in the row menu. |
| M4 | P1 | After saving, the message says "Approve it from the Inbox to send to artists". It should say Verify, and sending happens later, on the Artists page. | Reword: "Saved to the Inbox. Verify it there to match artists." |
| M5 | P3 | Ticking several pitches for the running pack works on the server but has no place on screen (removed with the look restore). Pitches go into the pack one at a time from the 3-dot menu. | Decide where the tick boxes go (for example, only on an artist's tab). |
| M6 | P2 | Open Calls tabs say "Active", "Drafts", "Archived". The agreed word is "Inbox". | Rename "Active" to "Inbox". |
| M7 | P5 | The Open Calls tab counts fall back to fixed numbers (2 and 11) before the lists load. The Artists badge in the menu is fixed at 3 and never updates. | Show nothing until loaded; count artists from the list. |

### Low

| # | Persona | What happens | Suggested fix |
|---|---|---|---|
| L1 | P4 | Analytics shows zeros until a pitch is submitted. That is correct, but at first it looks broken. | A one-line note: "Figures appear once applications are submitted." |
| L2 | P3 | "Follow up" and "Deadline passed" are plain text in the Stage badge (from the look restore), so they are easy to miss. | Optionally make the badge text bold or amber, inside the same badge. |
| L3 | P1 | One row-menu button has no visible label (its screen-reader label is "Opportunity options"). | None needed; noted for accessibility review. |

## Worked as intended

- Add from a link: the AI filled the form and Save to Inbox worked.
- Review: Verify, then match artists, then the Matched step reports which pitches still need an owner.
- Pitch buttons in the 3-dot menu, closing with a reason, reopen, automatic archive when every pitch closes.
- Flags: Deadline passed and the close-as-expired button.
- Running pack: add, In pack tag, Mark pack sent with confirmation and a dated copy.
- Analytics: every figure now comes from real pitches, with artist and year filters.

## Not covered

- A real Google Doc and real Google sign-in. The local server imitates both.
- Image and PDF upload on Add. Only a link was tried.
- Dark mode, and tablet width.
