# Tikorix UI/UX specification: gap analysis and resolution

Updated 13 November 2026 (second pass). The first pass, earlier the same day, was based on reading the documents and **counting patterns** in the code. This pass traced the code and ran the app. `UI_UX_SPEC.md` in the app folder has been rewritten from the results and is now the single specification; requirement IDs below (F1, C8, T16…) refer to it.

Documentation only. No application code, stylesheet, HTML or backend file was changed.

## 1. Resolution of D1–D14

| # | Decision | Status | Outcome |
|---|---|---|---|
| D1 | Vocabulary | **Resolved** | Terms document wins. Spec §12.3 lists every on-screen string to change. The page keeps the name Open Calls; the record is an opportunity. |
| D2 | Column name | **Resolved** | `OWNER`. The running app already uses it. |
| D3 | Stage names | **Resolved** | Five single names. The app still shows dual names ("Stage 1: Pitched · Pending Artist Review"…): spec P6, to fix. |
| D4 | Dark-mode values | **Resolved** | Zinc `--tk-*` tokens only; obsidian values removed from the spec. The app still renders a mix: spec F1, F3. |
| D5 | `#151e11` | **Resolved** | It is the live value of `--tk-dark` (read from the running app), so it is current. The "retired" entry was the error. |
| D6 | Card radius | **Resolved** | Named tokens: input 12, table card 16, card 20, modal 24, pill 9999. Existing per-component values, now named (F8). |
| D7 | 44px touch target | **Resolved** | Kept as a minimum hit area for touch. Measured: row menu 34×34, checkbox 16×16 (C6). |
| D8 | Count-pill contrast | **Resolved as a requirement**; colours wait on N2 | Measured on screen: 3.19, 3.30, 5.17, 3.30, 2.54. Four of five fail 4.5:1 (P8). The WCAG AA claim is removed from the spec. |
| D9 | Urgent boundary | **Resolved** | 7 days or fewer, including today. This is what the code does; the spec's "under 7" was wrong. My first-pass recommendation (0–6) is withdrawn because it would change behaviour (X1). |
| D10 | Fee format | **Resolved** | As entered, no conversion; "Free" only when stated; unknown is "Not stated". The app shows "Free" for a missing fee on Open Calls (T12). |
| D11 | Phone layout | **Resolved (documented accurately)** | The page area scrolls sideways, so columns are reachable; the table does not scroll on its own, and the half-pane opens below the table off screen (R1, H5). Persona H2 is partly met. |
| D12 | Bulk select | **Resolved for the bulk bar**; pack controls wait on N4 | Checkboxes and the bulk bar work on both tables. The running-pack bar is never placed on the page (T17). |
| D13 | `user-select: none` | **Resolved** | Limit to buttons, menu triggers, accordion headers. Corrected scope: table and half-pane text is already selectable; the rule sits on `.card` and 17 other selectors (A7). |
| D14 | Sign out as danger | **Resolved 13 Nov (N5)**: keep red | No change. Sign out stays a danger action. |

## 2. Needs your decision

Full options are in spec §15.

| # | Question | Recommended |
|---|---|---|
| N1 | Keep or remove "Send to artist" and "Pitch Opportunity" (placeholder email overlay; one of the three buttons is broken) | Remove |
| N2 | One colour per stage: dots, pills and badges disagree | Badge mapping: amber, blue, purple, green, grey, in shades that pass contrast |
| N3 | Add Artist asks for a Drive folder link the server cannot store | Add server support, or remove the field |
| N4 | Where the running-pack controls go; Mark pack sent is unreachable today | A bar on each one-artist tab |
| N5 | Sign out styled as danger | Make it secondary |

## 3. Corrections to the first pass

The first pass made these claims from pattern counts. Tracing and running the app showed they were wrong or imprecise.

| First-pass claim | What is true |
|---|---|
| "Skeleton code: 0. Not built." | A skeleton exists: `.skel` blocks in `loadList`. I searched for the word "skeleton". |
| "Unsaved-changes guard on page unload only." | In-app navigation is guarded too: "Discard changes?" on leaving a changed opportunity form. Confirmed. |
| "Arrow keys in menus exist." | Only in the **sidebar**. Row menus ignore arrow keys. Confirmed. |
| "Filters and search: not specified, unknown." | Kept per tab for the session. Confirmed. |
| "Sorting: unverified." | One control, Deadline or Added. Confirmed. |
| "Spec routes `#/settings`… should be verified." | `#/settings` and `#/analytics` exist and load. |
| "`user-select: none` on `.card` means text on every card cannot be copied." | No `.card` element was on screen on the three main pages; table and pane text is selectable. Where it applies is unverified. |
| "Row menu z-index 99999." | Rendered value is 999999. |
| "Breakpoints match." | They do, but the layouts at those widths have defects (below). |

## 4. Investigation report

### 4.1 Files inspected

| File | How |
|---|---|
| `frontend\app.js` | Read: lines 1–66, 470–515, 717–815, 1196–1625, 1725–2025, 2132–2406, 2479–2903, 3277–3510, 4650–4994 (about 45% of the file), covering routing, API wrapper, toasts, sheets, Escape handling, sidebar, row menus, owner picker, pitch moves, running pack, Artists page, Open Calls table, filters, bulk bar, form validation and save, half-pane, Add Artist. Function index for the rest. |
| `frontend\index.html` | Through the live DOM only. |
| `frontend\styles.css` | Computed styles in the running app, plus targeted searches. Not read in full. |
| `backend\*` | **Not read.** |
| `tools\harness\server.js` | First 60 lines (what it serves and seeds). |
| Tikorix docs 0, 1, 6, 8; old `UI_UX_SPEC.md` | Read in full. |

Not inspected: `ARCHITECTURE.md`, `README.md`, the app's `docs\` folder, `tikorix-ui-ux-audit\`, and these parts of `app.js`: custom fields, reports, reminders, sign-in, artist profile page, doc review, dashboard rendering, pitch page internals.

### 4.2 Workflows traced (code and running app)

Open an opportunity in the half-pane · open and close a row menu by keyboard · Set owner from a row · Escape with layers stacked · edit an opportunity, navigate away, Cancel and Discard · save with a missing title and a bad link · Inbox → form → Back (scroll, search, sort) · Artists → pitch → Back (scroll, accordions) · tick a pitch and read the bulk bar · switch artist tab · Add Artist with an empty name and backdrop close · open a row that does not exist · error toast lifetime.

Traced in code only: pitch moves, running pack, bulk archive, bulk set owner, duplicate prompt, save and delete, demo fallback.

### 4.3 Runtime tests performed

Local harness, sample data, signed in as Tester. Widths about 1024, 768 and 375px. Light and dark. Real key presses for Enter, Tab, Arrow and Escape; clicks dispatched on the real elements. Console read. Contrast computed from rendered colours. Automated suites: **35 of 35 pass**.

### 4.4 Tests not possible, and why

| Not tested | Why |
|---|---|
| Real Google sign-in, Drive, Docs, Calendar | The harness imitates Google. |
| Screen reader output | No screen reader in this environment. |
| `prefers-reduced-motion` | The browser tool cannot emulate it. |
| Widths above about 1024px | Limited by the preview pane. |
| Bulk Archive and bulk Set owner on Artists; pitch moves; pack actions | Not run, to avoid altering data while auditing. Read in code. |
| Touch input | Clicks arrive as mouse clicks. |
| File upload on Add | Not attempted. |

### 4.5 Confirmed defects (seen in the running app)

| # | Defect | Spec ID |
|---|---|---|
| 1 | Escape leaves the row menu visible on screen (class removed, inline `display` left behind). | C8 |
| 2 | One Escape closes both a sheet and the half-pane beneath it. | C20 |
| 3 | Sheets do not take focus or trap it; Tab reaches the page behind. | C15 |
| 4 | Row menus: no arrow keys, no ARIA, focus not returned to the trigger. | C10 |
| 5 | Dark mode: Artists row titles are invisible (1.03:1); artist tab bar and Overview focus queue stay white. | P10, P2 |
| 6 | Dark mode mixes two palettes: `--tk-bg` is zinc, `body` renders obsidian. | F1 |
| 7 | Count pills fail contrast (four of five); "Not sent yet" badge 4.40:1. | P8, A3 |
| 8 | Table columns overlap at about 1024px, on both tables, and worse with the half-pane open. | T1, T19 |
| 9 | At 768px the sidebar's artist list overlaps the table. | G6 |
| 10 | At 768px and 375px the half-pane opens below the table, off screen. | H5 |
| 11 | At 375px the whole page area scrolls sideways rather than the table. | R1 |
| 12 | Half-pane "Send to artist" has a broken `onclick`. | H3 |
| 13 | Half-pane shows invented text: every artist "Oil painting, Installation, Mixed media", "CONFIRMED", filler theme. | H2 |
| 14 | A non-existent opportunity opens as an editable invented record. | M12 |
| 15 | Clicking an artist tab does not update the address. | G5 |
| 16 | Artists page: scroll position and accordion state are lost on return. | S2, S4 |
| 17 | Error toasts vanish after about 3 seconds with no dismiss. | C22 |
| 18 | Add Artist closes on backdrop click with typed data and no warning; labels not linked. | C17, M16 |
| 19 | Save Draft shows on an Inbox opportunity. | M5 |
| 20 | Non-button click targets with no keyboard access: opportunity cells, accordion headers, Overview cards. | A1, T4, C26 |
| 21 | Retired wording on screen: "Artist Pipelines", dual stage titles, "ASSIGNED ARTIST ROSTER", "Archived" tab, and others. | §12.3 |
| 22 | Past deadlines read "Closed", colliding with the pitch stage. | X2 |
| 23 | Three console errors on load (service worker script). May be harness-only. | G11 |

Defects found in code, not run:

| # | Defect | Spec ID |
|---|---|---|
| 24 | Bulk Set owner always reports success, whatever the server replies. | C23 |
| 25 | On Artists, bulk Archive archives the whole opportunity and bulk Set owner changes every artist's pitch on it. | T16 |
| 26 | "Copied!" toast when copying failed. | C23 |
| 27 | Closing soon: count uses 7 days, filter uses 14; shows "2" when the count is zero. | T7 |
| 28 | Missing organiser shown as "Arts Council International · New Delhi"; missing fee shown as "Free". | T12 |
| 29 | "Pitch Opportunity" opens an overlay of fixed placeholder text. | P9 |
| 30 | Several server-calling controls do not disable while the request runs. | C4 |

**Update, 13 Nov afternoon (visuals pass).** Screenshots of every issue are in `issue-visuals\index.html`. They were taken from a frozen export of commit `cfdf6b4`, because the app folder was being changed by other work (Phase 1 and Phase 2a commits) during capture. That run also changed the status of these items:

- **24, 25, 26 and 29 are now confirmed in the running app**, not code-only. For 25, ticking only Savya's pitch for Spring Prize and pressing Archive removed Harsha's pitch too and filed the opportunity as "Rejected at review".
- **4:** Arrow Down does not just do nothing; it closes the row menu.
- **8:** on Artists the fee text already touches the deadline at 1280px, not only at 1024px.
- **27:** the mismatch is visible (count 2, filter lists 3). The "2 when zero" fallback is still code-only.
- **17:** on the local server a failed network request falls back to demo mode ("Action simulated in Demo Mode") and does not show an error. The error toast was tested with a refused server reply.
- 28 and 30 remain code-only.

### 4.6 Missing functionality (required, not built)

Focus trap and focus placement in overlays (C15, C19, H4) · arrow keys and ARIA in row menus (C10) · tab and accordion semantics (C24, C26) · persistent error toasts (C22) · unsaved-changes protection beyond the opportunity form (C17, M15) · `aria-invalid` on fields (M3) · scroll and accordion restoration on Artists (S2, S4) · Archive filters for "Rejected at review" and "All pitches closed" (P4) · reachable running-pack controls (T17, N4) · type, spacing, shadow, layer and motion tokens (F6, F7, F9, F11) · dark values for status colours (F4) · sheet sizes per breakpoint (R5).

### 4.7 Existing functionality that only needed documenting

Discard-changes prompt and browser leave warning (M13, M14) · sidebar arrow keys and Escape (G7) · Enter and Tab in row menus (C9) · toasts with Undo (C21, L12) · button loading state (C3) · reduced-motion reset (F12) · bulk bar and select-all (T13–T15) · scroll, search, filter and sort restoration on Open Calls (S1, S3, T5, T6) · skeleton on first load (L1) · error states with Try again (L3) · empty and no-results states (L5–L7) · offline and session-ended handling (L8, L9) · duplicate prompt (M4) · title and link validation (M1, M2) · row menu positioning and flip (C7) · half-pane column hiding (T18) · quick jump (G9) · sidebar memory (G8) · routes (§2.2) · pitch moves per stage (§7.3) · localhost-only demo fallback (L10).

### 4.8 Unverified areas

Backend behaviour beyond what the 35 suites cover, including the "deleted after 30 days" sentence (M7) and artist-name duplicates (M19) · where `.card` renders (A7) · artist profile, doc review, Reports, Reminders, Custom Form Fields, sign-in screens · pitch page at stages other than Pitched · layouts above 1024px · reduced motion in practice · whether the service-worker error occurs in production · typography sizes marked UNVERIFIED in spec §1.3.

## 5. Risks

| Risk | Mitigation |
|---|---|
| Fixing dark mode or tokens changes the light theme, because 2,023 `!important` and 39 `:root` blocks make cascade order load-bearing. | One page per change; screenshots before and after (spec §14.5). |
| Removing placeholder text (H2, M12, T12) exposes how much real data is missing. | Expected; show "Not stated", not filler. |
| T16: a user ticking pitches on Artists and pressing Archive archives opportunities. | Until fixed, consider hiding Archive in the bulk bar on Artists. That is a functional change and needs your approval. |
| The half-pane is hard to use below 1280px (T19, H5). | Decide the overlay behaviour before any table work. |
| About 55% of `app.js` and all of `backend\` were not read. | Treat spec items marked CODE-ONLY or UNVERIFIED as unproven. |
| Two documents drifting again. | This file records the audit; requirements live only in `UI_UX_SPEC.md`. |

## 6. Suggested order of work (after N1–N5)

1. Small, visible, low risk: C8, C20, H3, M12, C23, T7, X2, wording in §12.3.
2. Dark-mode legibility: P10, P2, then F1 page by page.
3. Keyboard and focus: C15, C10, C26, T4, A2.
4. Layout: T1, T19, H5, R1, G6.
5. State: G5, S2, S4.
6. Tokens: F2, F6–F11.
