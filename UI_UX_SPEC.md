# Tikorix UI/UX and Design System Specification

Corrected 13 November 2026. This replaces the earlier version of this file; it is the only UI/UX specification. History of changes lives in `Tikorix-docs\3-Change-log.md`, not here.

## 0. How to read this document

**Standing rule.** Do not remove, replace or simplify existing functionality while improving the interface unless Hazel authorises it in writing. A change is not finished until the regression gate in §14 passes.

**Status of this document (13 Nov, evening).** The specification was written as a documentation-only exercise. Since then, and as authorised by Hazel, these decisions were implemented in code: N2 (one colour per stage: `styles.css`, `app.js`), N3 (Drive folder link: `backend\Config.js`, `backend\Part2_Artists.js`, `app.js`). N5 keeps the danger style (no change). N4 is postponed. Every other requirement in this file is still unbuilt unless its row says otherwise. The 35 automated suites pass after these changes. Rows M17, P7, D-F1 and the decision table in §15 record the outcome.

**Words.** Product terms are defined only in `Tikorix-docs\6-Workflow-and-terms.md`. This document uses them and defines none. Where the two disagree, the terms document wins.

**Every requirement has four labels.**

| Label | Values |
|---|---|
| Tag | `UI` look and CSS · `UX` behaviour the user sees · `FN` data, server, routing |
| Class | `EXISTING — DOCUMENT` built, was undocumented · `EXISTING — FIX` built, defective · `MISSING — IMPLEMENT` required, not built · `CONFLICTING — RESOLVE` sources disagree · `OPTIONAL — IMPROVEMENT` not an agreed requirement |
| Evidence | `CONFIRMED` seen in the running app and in code · `CODE-ONLY` read in code, not run · `INFERRED` likely, not established · `UNVERIFIED` not enough evidence |
| Check | The test that decides whether it is done |

**How the evidence was gathered (13 Nov 2026).** Local harness server with sample data (`tools\harness\server.js --sample --dev-login`), real backend code against a mock Google, signed in as "Tester". Pages opened: Open Calls (Inbox), opportunity form, Artists (All and one artist), pitch page, Overview, Analytics, Settings. Widths: about 1024px, 768px, 375px. Light and dark. Keyboard keys were real key presses; clicks were dispatched on the real elements. Code read: the functions named in the Evidence columns, in `frontend\app.js`. Automated suites: 35 of 35 pass.

**Not examined.** `frontend\styles.css` was measured through computed styles and searched, not read in full. `frontend\index.html` was inspected through the live DOM. `backend\` was not read; server behaviour is known only through the harness and the tests. Not run: real Google sign-in, real Drive or Docs, file upload on Add, screen readers, `prefers-reduced-motion`, widths above 1024px, Doc review page, artist profile page, Reports, Reminders, Custom Form Fields. Anything about those is marked `CODE-ONLY` or `UNVERIFIED`.

**Open decisions.** Five items are marked `NEEDS USER DECISION` (N1 to N5, listed in §15). Nothing that depends on them may be built until they are answered.

---

## 1. Design foundations

### 1.1 Principles

- Calm, dense, readable: warm neutral canvas, dark slate text, lime accent.
- One typeface, Poppins, for everything. `CONFIRMED` (computed `font-family` on `body`).
- Colour is never the only signal: every status also has text.
- Accessibility targets are stated in §11. This document makes **no claim of WCAG conformance**; measured failures are listed there.

### 1.2 Colour tokens (single authoritative set)

One family, `--tk-*`. One light block on `:root`, one dark block on `[data-theme="dark"]`. No component may state a hex value.

| Token | Light | Dark (zinc) | Use |
|---|---|---|---|
| `--tk-bg` | `#faf9f5` | `#09090b` | Page canvas |
| `--tk-card` | `#ffffff` | `#18181b` | Cards, panels, tables |
| `--tk-sunk` | `#f3f4ed` | `#202024` | Modals, menus, sunk areas |
| `--tk-subtle` | `#f8faf5` | `#141417` | Input and textarea background |
| `--tk-border` | `#dcdfd5` | `#27272a` | Card and control borders |
| `--tk-border-light` | `#e5e7eb` | `#27272a` (no separate dark value is defined) | Table dividers |
| `--tk-dark` | `#151e11` | `#f9fafb` | Primary text, primary button fill (light) |
| `--tk-slate` | `#374151` | use `--tk-muted` | Body text, column headers |
| `--tk-muted` | `#6b7280` | `#a1a1aa` | Secondary text |
| `--tk-lime` | `#d2e21a` | `#d2e21a` | Accent fill. Always with dark text on top. |
| `--tk-green-bg` / `--tk-green-text` | `#dcfce7` / `#15803d` | not defined | Success |
| `--tk-urgent-bg` / `--tk-urgent-text` | `#fef2f2` / `#dc2626` | not defined | Urgent, danger |

Light values for `--tk-bg`, `--tk-card`, `--tk-border`, `--tk-dark`, `--tk-muted`, `--tk-sunk`, `--tk-subtle` and the dark values for `--tk-bg`, `--tk-card`, `--tk-border`, `--tk-dark`, `--tk-sunk`, `--tk-subtle` were read from the running app and match. `CONFIRMED`

The older obsidian dark palette is retired. Its values are named once here so they can be searched for and removed from code: `#0e100d`, `#161913`, `#293024`, `#121510`, `#9ea396`. No requirement in this document uses them.

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| F1 | UI | One token family. The three in use (`--tk-*`; `--ink`, `--line`, `--surface`, `--bg`, `--input`…; `--accent-*`) are consolidated into `--tk-*`. | EXISTING — FIX | CONFIRMED. In dark mode `--tk-bg` is `#09090b` while `--bg` is `#121311`, `--surface` `#1a1c18`, `--line` `#2e302b`; `body` renders `rgb(14,16,13)` (obsidian), not `--tk-bg`. `styles.css` has 39 `:root` blocks and 58 custom property names. | Exactly one `:root` block and one dark block define colour tokens. In dark mode the computed background of `body`, cards, table headers and modals equals a `--tk-*` value. |
| F2 | UI | No hard-coded colours in components, including inline `style=""` written by `app.js`. | EXISTING — FIX | CONFIRMED. 1,110 hex literals (245 distinct) in `styles.css`; `app.js` writes inline colours in `loadArtistsList`, `renderListTable`, `openAssignProfileModal`, `packBarHtml_`, `demoNotice_`. Primary text renders `rgb(17,24,39)`, not `--tk-dark`. | A search for `#` hex values outside the two token blocks returns none in any rule or template touched by a change. |
| F3 | UI | Dark `--tk-muted` is `#a1a1aa`. | EXISTING — FIX | CONFIRMED. Renders `#9ca3af`. | Computed value equals the table above. |
| F4 | UI | Dark values for success, urgent and each stage colour are added to the token table. | MISSING — IMPLEMENT | CONFIRMED absent from the previous spec; the app does render dark stage badges (Pitched: `rgb(242,196,110)` on `rgb(59,44,18)`). | Each status token has a light and dark value recorded here before migration starts. Zinc chosen 13 Nov. Proposed dark stage pills (text on fill, all at least 7 : 1, computed): Pitched `#fde68a` on `#78350f`; Preparing `#bfdbfe` on `#1e3a8a`; Submitted `#ddd6fe` on `#4c1d95`; Won `#bbf7d0` on `#14532d`; Closed `#e4e4e7` on `#3f3f46`. Final colours follow N2. |
| F5 | UI | Reduce `!important`. No new `!important`; one may be removed only together with the rule it overrides. `toggleRowMenu` writes `!important` inline styles and is included. | EXISTING — FIX | CONFIRMED count 2,023 in `styles.css`; `app.js:1334,1353`. | The count never rises between commits. |

### 1.3 Typography

Poppins. Sizes that are specified and were measured:

| Role | Size / weight | Evidence |
|---|---|---|
| Page title | 32px / 800, line-height 1.2, letter-spacing −0.5px | UNVERIFIED (32px appears once in CSS; 30px six times) |
| Section headers | 20–24px / 700 | UNVERIFIED |
| Stage accordion heading | 15.5px / 700 | CODE-ONLY |
| Card subheaders | 16–17.5px / 700 | UNVERIFIED |
| Table column header | 11.5px / 700, uppercase, letter-spacing 0.06em, `--tk-slate` (light), `--tk-muted` (dark) | CONFIRMED light: 11.5px / 700 / `rgb(55,65,81)` |
| Table row title `.tk-cell-title` | 13.5px / 600, line-height 1.3 | CONFIRMED |
| Fee, deadline in rows | 13px / 600 | CODE-ONLY (urgent deadline measured 13.5px / 600) |
| Dates, metadata | 13px / 500 | CODE-ONLY |
| Subtitles, microcopy | 12–13px / 400–500, `--tk-muted` | CONFIRMED 12.5px / 400 for "No owner" |
| Body | 15px on `body` | CONFIRMED. The previous spec said 14.5px; the app does not use it as the base. |

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| F6 | UI | A type scale of at most eight steps, as tokens. Every `font-size` maps to one. | MISSING — IMPLEMENT | CONFIRMED 26 distinct sizes in `styles.css`. | No `font-size` value outside the scale in touched rules. |

### 1.4 Spacing, radius, shadow, layers, motion, icons

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| F7 | UI | Spacing scale `4, 8, 12, 16, 24, 32, 48` as `--space-*`. | MISSING — IMPLEMENT | No scale exists. | New or edited rules use scale values only. |
| F8 | UI | Radius tokens: input 12px, table card 16px, card 20px, modal 24px, pill 9999px. These are the values the previous spec already gave per component; they are now named, not changed. | CONFLICTING — RESOLVE (resolved, D6) | CONFIRMED 18 distinct radii in CSS. | Every `border-radius` in touched rules is a token. |
| F9 | UI | Shadow tokens: card, dropdown (`0 10px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)`), modal. | MISSING — IMPLEMENT | Dropdown value from previous spec; others undefined. | Every `box-shadow` in touched rules is one of the three tokens. |
| F10 | UI | Layer tokens in this order: sticky header, half-pane, bulk bar, dropdown, modal backdrop, modal, toast. | EXISTING — FIX | CONFIRMED row menu renders `z-index: 999999` (`app.js:1353`); previous spec said 99999. | A toast is visible above an open modal; a row menu is visible above the half-pane; no z-index literal above the toast token. |
| F11 | UI | Motion tokens: 120ms hover, 180ms expand, 220ms pane and modal, one easing. | MISSING — IMPLEMENT | About 12 durations in CSS. | Every `transition` duration in touched rules is one of the three tokens. |
| F12 | UI | Reduced motion: when `prefers-reduced-motion: reduce`, transitions and animations are off. **Preserve.** | EXISTING — DOCUMENT | CODE-ONLY: `@media (prefers-reduced-motion:reduce){*{transition:none;animation:none!important}}`. Not run under the setting. Note `transition:none` has no `!important`, so rules that set transitions with `!important` may still animate. | With the OS setting on, opening the half-pane, a modal and an accordion shows no animation. |
| F13 | UI | Icons are inline SVG, stroke `currentColor`, 15–18px, `aria-hidden` when decorative. No emoji or text glyphs as icons. | EXISTING — FIX | CONFIRMED glyphs in use: `•••` (Artists row menu button), `▶` (accordion chevron), `✓ Owner` (owner picker), `×` (pane close), `⋯` (pitch page), `→`, and an emoji in the pitch email text (`app.js:1399`). The Open Calls row menu uses an SVG. | No text-glyph icons in the rendered DOM. |

---

## 2. Global layout and navigation

### 2.1 Breakpoints (authoritative; match the CSS media queries)

| Range | Navigation | Evidence |
|---|---|---|
| Below 768px | Fixed bottom tab bar, five labelled items: Overview, Open Calls, Artists, Analytics, Settings | CONFIRMED at 375px |
| 768–1023px | 72px icon sidebar | CONFIRMED at 768px |
| 1024px and above | Full sidebar, 250px | CONFIRMED at about 1024px |

### 2.2 Routes

| Route | Screen | Evidence |
|---|---|---|
| `#/dashboard` | Overview | CONFIRMED |
| `#/inbox`, `#/drafts`, `#/archive` | Open Calls, one tab each | CONFIRMED (`#/inbox`); CODE-ONLY others |
| `#/add` | Add (link, PDF, image, text) | CODE-ONLY |
| `#/new` | New opportunity form after capture | CODE-ONLY |
| `#/entry/:row` | Opportunity form | CONFIRMED |
| `#/artists`, `#/artists/:name` | Artists page, all or one artist | CONFIRMED |
| `#/artist/:name` | Artist profile page | CODE-ONLY |
| `#/artist-call/:name/:row` | Pitch page | CONFIRMED |
| `#/doc-review/:name` | Doc review | CODE-ONLY |
| `#/analytics` | Analytics | CONFIRMED |
| `#/settings` | Settings | CONFIRMED |
| `#/pipeline` | Redirects to `#/artists` | CODE-ONLY |
| anything else | Redirects to `#/dashboard` | CONFIRMED (`#/workflows`) |

### 2.3 Requirements

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| G1 | UI | Single-row top bar on every page except Overview: Back, page title, date pill (`13 November 2026`), notification bell. | EXISTING — DOCUMENT | CONFIRMED | Present and on one row at each breakpoint. |
| G2 | UX | Back returns to the page the user came from; with no history it goes to the page's parent (`backMap` in `render`). | EXISTING — DOCUMENT | CONFIRMED Inbox → form → Back; CODE-ONLY others | From a pasted `#/entry/:row` URL, Back opens Open Calls. |
| G3 | UX | Sidebar shows the current section with `aria-current="page"`. | EXISTING — DOCUMENT | CODE-ONLY (`render`, `highlight`) | One and only one nav link has `aria-current`. |
| G4 | UX | Sidebar Artists sub-menu lists All Artists and each artist from the live roster, opens on the Artists page, and marks the active artist. Clicking a sub-item selects that artist's tab. Sub-items: padding 8px 16px 8px 36px, 13px / 500; active item 700 with a tinted background and no right-hand indicator bar. Choosing another section keeps the sub-menu state and removes the sub-item highlight. | EXISTING — DOCUMENT | CONFIRMED behaviour; styling CODE-ONLY | Adding an artist adds a sub-item without reload. |
| G5 | UX | Clicking an artist **tab** on the Artists page updates the address to `#/artists/:name`. | EXISTING — FIX | CONFIRMED: sidebar highlight updates, address stays `#/artists`, so reload and Back lose the tab. | After clicking the Marita tab, the address ends `/artists/Marita` and a reload opens that tab. |
| G6 | UI | The sidebar holds two artist lists (`#tkNavArtistsSub` and `#navArtists` with Profile and Doc links). Only one is shown at a time. | EXISTING — FIX | CONFIRMED both sets of links are in the DOM. At 768px the sub-menu text overflows the 72px sidebar and overlaps the table. | At 768–1023px no sidebar text overlaps page content. |
| G7 | UX | Sidebar keyboard: Up and Down arrows move between visible sidebar links; Escape closes open sidebar groups. **Preserve.** | EXISTING — DOCUMENT | CODE-ONLY (`nav.tabs` keydown handler, `app.js:2383`) | With focus in the sidebar, Down moves to the next link and wraps. |
| G8 | UX | Sidebar open or closed state is remembered on the device (`oc_nav`). | EXISTING — DOCUMENT | CODE-ONLY | Collapse Artists, reload: still collapsed. |
| G9 | UX | Quick jump: `/` or Ctrl/Cmd+K focuses the search; typing lists pages, artists and opportunities (up to eight); Enter opens the first; Escape clears; "No matches" when empty. | EXISTING — DOCUMENT | CODE-ONLY (`renderQuickResults`) | Typing an artist name and pressing Enter opens that artist. |
| G10 | UX | Overview width is 100% of the content area, the same as other pages. | EXISTING — DOCUMENT | CODE-ONLY | At 1280px the Overview content is as wide as the Open Calls content. |
| G11 | FN | Service worker registration. | EXISTING — FIX | INFERRED: three console errors "An unknown error occurred when fetching the script" on load; `app.js:4668` registers `sw.js`, and no `sw.js` is in `frontend\`. May be harness-only. | No console errors on load. |

---

## 3. Components and interaction states

### 3.1 Buttons

Three tiers. Shapes and colours unchanged from the previous spec.

| Tier | Style | Examples (current labels) |
|---|---|---|
| Primary | Solid `--tk-dark` pill, white text, 700, padding 8px 22px | Save to Inbox, Save Changes, Add Artist |
| Secondary | White pill, 1px `--tk-border`, padding 7px 16px | Cancel, Back, View Dossier & Files |
| Danger | `--tk-urgent-bg` pill, `--tk-urgent-text`, 1px `#fecaca` border, padding 8px 18px | Delete permanently, Archive, Close pitch |

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| C1 | UI | At most one primary button per screen section. | EXISTING — DOCUMENT | UNVERIFIED across all pages | Review per page. |
| C2 | UX | Detail-screen actions sit in the top toolbar and are not duplicated in a bottom bar. | EXISTING — DOCUMENT | CODE-ONLY | No detail screen shows the same action in both a top and a bottom bar. |
| C3 | UX | Loading state: while a request runs the button is disabled and its label changes ("Saving…", "Adding…", "Deleting…"); it returns to normal on success or failure (`busy`, `idle`). **Preserve.** | EXISTING — DOCUMENT | CODE-ONLY: used by save, delete, add artist. | Double-clicking Save creates one record. |
| C4 | UX | Every button that calls the server uses C3. | EXISTING — FIX | CODE-ONLY: `movePitch`, `assignCallToUser`, `assignSelectedCallsToUser`, `bulkArchive`, `packAddPicked`, `packSend` do not disable their trigger. | Clicking any such control twice quickly sends one request. |
| C5 | UX | Save Changes is disabled until the form has changed. Save to Inbox and Save Draft are always enabled and validate on click. | EXISTING — DOCUMENT | CONFIRMED | On an unchanged Inbox opportunity Save Changes is disabled; after one edit it is enabled. |
| C6 | UI | Minimum hit area 44×44px for touch (`pointer: coarse`); the visible control may be smaller. | EXISTING — FIX (D7) | CONFIRMED row menu button 34×34px, row checkbox 16×16px. | On a touch device every control's hit area measures at least 44×44. |

### 3.2 Row menu (three dots)

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| C7 | UX | Opens from the trigger; only one menu open at a time; positioned `fixed` from the trigger's rectangle so it is never clipped; flips upward when there is less room below than the menu needs. **Preserve.** | EXISTING — DOCUMENT | CONFIRMED open and position; CODE-ONLY flip (`toggleRowMenu`) | A menu on the last visible row is fully on screen. |
| C8 | UX | Closes on outside click, on page scroll, and on Escape. | EXISTING — FIX | CONFIRMED defect: Escape removes the `show` class but leaves the inline `display:flex !important`, so **the menu stays on screen**. Outside click and scroll are CODE-ONLY. | After Escape no menu is visible (`getComputedStyle(menu).display === 'none'`). |
| C9 | UX | Keyboard: Enter or Space on the trigger opens it; Tab reaches the items. **Preserve.** | EXISTING — DOCUMENT | CONFIRMED | Focus the trigger and press Enter: the menu opens. Tab focuses its first item. |
| C10 | UX | Up and Down arrows move between items; focus returns to the trigger on close; trigger has `aria-haspopup` and `aria-expanded`; menu has `role="menu"`. | MISSING — IMPLEMENT | CONFIRMED: Down does nothing in a row menu; after Escape focus stays on a menu item; no ARIA attributes. Arrow keys exist only in the sidebar (G7). | Down moves to the next item; after Escape `document.activeElement` is the trigger. |
| C11 | UX | Items, Open Calls rows: Edit details; Set owner, Send to artist and View artist profile only once an artist is matched. | EXISTING — DOCUMENT | CONFIRMED | Unmatched row shows only Edit details. |
| C12 | UX | Items, Artists rows: the pitch moves for that stage (§7.3), then Edit details, View Call Files / Folder, Set owner. | EXISTING — DOCUMENT | CONFIRMED for a Pitched row | A Pitched, unsent row lists Add to pack, Mark sent, Interested, Needs info, Not interested, Edit details, View Call Files / Folder, Set owner. |
| C13 | UI | The actions column header has no visible text and carries `aria-label="Actions"`. | EXISTING — DOCUMENT | CODE-ONLY | The header cell shows no text and exposes the name "Actions". |

### 3.3 Sheet (the app's modal)

One component, `#sheet` with `#backdrop`, used for confirmations, pickers and small forms (`sheet`, `closeSheet`, `ask`).

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| C14 | UX | Has `role="dialog"`, `aria-modal="true"`, labelled by its title. Closes on backdrop click, Escape, its buttons, and on any route change. Focus returns to the element that opened it. **Preserve.** | EXISTING — DOCUMENT | CONFIRMED attributes and Escape; CODE-ONLY focus return | Escape closes an open sheet and focus is on the control that opened it. |
| C15 | UX | Focus moves into the sheet when it opens and Tab cannot leave it. | EXISTING — FIX | CONFIRMED: after opening, focus is on `body`; eight Tab presses reached a row button behind the sheet. | With a sheet open, 30 Tab presses never focus anything outside it. |
| C16 | UX | Confirm pattern `ask(title, text, okLabel, danger)`: OK and Cancel; closing any other way counts as Cancel. | EXISTING — DOCUMENT | CONFIRMED ("Discard changes?") | Pressing Escape on a confirm leaves the record unchanged. |
| C17 | UX | A sheet holding typed input warns before it is closed by backdrop, Escape or route change. | MISSING — IMPLEMENT | CONFIRMED: Add Artist with a typed name closed on backdrop click with no warning. | Typing a name then clicking the backdrop asks before discarding. |
| C18 | UI | Radius 24px, blurred backdrop (`backdrop-filter: blur(8px)`). | EXISTING — DOCUMENT | CONFIRMED visually | Sheet computed radius is 24px and the backdrop is blurred. |
| C19 | UX | The Team & People overlay (`#whoAreYou`), the pitch email overlay (`#tkEmailModal`) and the half-pane follow C14 and C15. | EXISTING — FIX | CONFIRMED only `#sheet` has dialog semantics. | Each overlay has a role, a name and a focus trap. |

### 3.4 Escape key (layered)

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| C20 | UX | Escape closes only the topmost layer, in this order: sheet, Team & People, open row menus, half-pane. **Preserve the existing order for the last three.** | EXISTING — FIX | CONFIRMED defect: two separate handlers (`app.js:813` and `:1373`). With a sheet open over the half-pane, one Escape **closes both**. The Team & People → menus → half-pane order is CODE-ONLY. | Open the half-pane, open Set owner, press Escape once: sheet closed, half-pane still open. Press again: half-pane closed. |

### 3.5 Toasts

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| C21 | UX | One toast at a time, `role="status"`, `aria-live="polite"`. Plain toast hides after 3.2s; a toast with an action (Undo) after 6s. Error style via `{ error: true }`. **Preserve.** | EXISTING — DOCUMENT | CONFIRMED | A plain toast is gone after 4s; an Undo toast is still shown at 5s. |
| C22 | UX | Error toasts stay until dismissed and have a dismiss control. | MISSING — IMPLEMENT | CONFIRMED: an error toast disappeared after about 3.2s; no dismiss button. | An error toast is still visible after 10s. |
| C23 | FN | A failed server call never produces a success toast. | EXISTING — FIX | CODE-ONLY, two cases: `assignSelectedCallsToUser` ignores every server reply and always toasts success (`app.js:2871–2889`); `copyEmailText` toasts "Copied!" when the clipboard write fails (`app.js:1412`). | With the server stopped, bulk Set owner shows an error and leaves owners unchanged on screen. |

### 3.6 Other components

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| C24 | UX | Artist tabs and Open Calls sub-tabs expose `role="tab"` and `aria-selected`. | MISSING — IMPLEMENT | CONFIRMED absent on `.tk-artist-tab`. | Each tab has `role="tab"`; exactly one has `aria-selected="true"`. |
| C25 | UX | Stage accordion: header toggles the section; default open state per stage. | EXISTING — DOCUMENT | CONFIRMED | Clicking a header shows or hides that stage's table. |
| C26 | UX | Accordion header is a `<button>` with `aria-expanded`. | EXISTING — FIX | CONFIRMED: it is a `<div onclick>` with no `tabindex` or role; cannot be reached by keyboard. | Tab reaches each header; Enter toggles it. |
| C27 | UX | Tooltips (native `title`) are never the only way to reach information. | EXISTING — FIX | CONFIRMED: Open Calls opportunity cell `title` is "Click to view details", not the full title; fee detail is in `title` and in the half-pane. | Every truncated title is readable in full without hovering (half-pane or form). |
| C28 | UX | Theme switch (Device, Light, Dark) in the profile sheet; stored as `oc_theme`. | EXISTING — DOCUMENT | CONFIRMED storage; CODE-ONLY control | Choosing Dark sets `data-theme="dark"` and it survives a reload. |

---

## 4. Tables

### 4.1 Structure (unchanged requirements)

Both the Open Calls table and each Artists stage table use `table.tk-grid-table`, `table-layout: fixed`, and the same `<colgroup>` so columns line up across stage tables. `CONFIRMED`

| # | Column | Width | Align | Content |
|---|---|---|---|---|
| 1 | checkbox | 44px | centre | Row checkbox; header checkbox selects all |
| 2 | OPPORTUNITY | 30% | left | Title 13.5px / 600, two-line clamp; organiser · location below (Open Calls) |
| 3 | CATEGORY | 11% | centre | Category pill |
| 4 | FEE | 8% | centre | One line |
| 5 | DEADLINE | 11% | centre | Date or countdown |
| 6 | STAGE | 13% | centre | Review step (Open Calls) or pitch stage and tag (Artists) |
| 7 | ARTIST | 13% | centre | Artist pill(s), or "Not matched" |
| 8 | OWNER | 14% | centre | Owner pill, or "No owner" |
| 9 | actions | 44px | centre | Row menu, no header text |

Header cells: 11.5px / 700 uppercase, padding 12px 14px, bottom divider. Container `.tk-table-card`, radius 16px, `overflow: visible` so menus are not clipped.

### 4.2 Requirements

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| T1 | UI | Columns never overlap. The table has a minimum width; below it the table scrolls sideways inside its own wrapper. Text is never shrunk to fit. | EXISTING — FIX | CONFIRMED at about 1024px content width: table 661px, FEE column 46px, CATEGORY 63px; "CATEGORY" and "FEE" headers touch and category pills run under fee text. Same on the Artists table ("Not stated" over the deadline). | At 768, 1024 and 1280px no cell's content crosses its column edge. |
| T2 | UI | The scroll wrapper is `.tk-table-wrap`. | EXISTING — FIX | CONFIRMED: no element with that class is in the DOM; the previous spec relied on it. | Each table sits in a `.tk-table-wrap` with `overflow-x: auto`. |
| T3 | UX | Clicking the opportunity cell opens the half-pane (Open Calls) or the pitch page (Artists). Checkbox and menu clicks never do. | EXISTING — DOCUMENT | CONFIRMED | Clicking a checkbox or a row menu leaves the half-pane and the address unchanged. |
| T4 | UX | The opportunity cell is reachable and operable by keyboard. | EXISTING — FIX | CONFIRMED: `<td onclick>` with no `tabindex`; 12 such cells on Open Calls. The row menu's Edit details is the only keyboard route. | Tab reaches the title; Enter opens it. |
| T5 | UX | Sorting: one control, Deadline (default; overdue last, undated after dated) or Added (newest first). No per-column sorting. | EXISTING — DOCUMENT | CONFIRMED control and persistence; CODE-ONLY order (`renderList`) | Changing the sort reorders rows; the choice is still set after opening a form and returning. |
| T6 | UX | Filters on Open Calls: search (title, organiser, artist, category, location), category, artist, Closing soon. Kept in memory per tab for the session. | EXISTING — DOCUMENT | CONFIRMED search and sort survive opening a form and returning | A search term is still applied after opening a form and pressing Back. |
| T7 | UX | Closing soon: the count on the pill and the filter use the same number of days, and the count shows the real number. | EXISTING — FIX | CODE-ONLY: pill counts deadlines within 7 days, filter keeps those within 14 (`syncFilterUI`, `renderList`); pill shows `2` when the count is zero (`soonItems.length \|\| '2'`). | With no deadlines inside the window the pill shows 0 or is empty. |
| T8 | UX | Pagination. | OPTIONAL — IMPROVEMENT | CONFIRMED none exists; all rows render. | Not planned until a list exceeds a length Hazel sets. |
| T9 | UX | Column visibility controls, per-column sort, infinite scroll. | OPTIONAL — IMPROVEMENT | Not built, not agreed. | Not planned. |
| T10 | UI | Row states: hover, selected (`.sel`), previewed (`.active-preview-row`). | EXISTING — DOCUMENT | CONFIRMED previewed row highlight; others CODE-ONLY | Each state is distinguishable in both themes. |
| T11 | UX | Empty, loading and error states: see §9. | — | — | See §9. |
| T12 | FN | Missing data is shown as missing, never as invented text. | EXISTING — FIX | CONFIRMED/CODE-ONLY: organiser falls back to "Arts Council International · New Delhi" (`renderListTable`); a missing fee shows **"Free"** on Open Calls but "Not stated" on Artists (`getFeeDisplay`). | A row with no organiser shows none; a row with no fee shows "Not stated" on both tables. |

### 4.3 Bulk selection and the bulk bar. **Preserve.**

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| T13 | UX | Ticking any row on Open Calls or Artists opens the floating bulk bar (`#bulk`, `role="region"`, label "Selection") showing "N selected" with Clear, Archive (Restore on the Archive tab) and Set owner. Unticking the last row closes it. | EXISTING — DOCUMENT | CONFIRMED on Artists; CODE-ONLY on Open Calls | Existing bulk actions still work after any CSS change. |
| T14 | UX | Header checkbox selects every row in the current tab (Open Calls) or in that stage table (Artists). Selection is cleared on every route change. | EXISTING — DOCUMENT | CODE-ONLY (`toggleSelectAll`, `toggleArtistTableSelectAll`, `render`) | The header checkbox ticks every row in scope; after navigating away and back none is ticked. |
| T15 | UX | Bulk Archive shows an Undo toast for 6s. | EXISTING — DOCUMENT | CODE-ONLY (`bulkArchive` handler) | Bulk Archive then Undo within 6s returns the rows to their tab. |
| T16 | FN | On the Artists page, bulk actions act on the ticked **pitches**. | EXISTING — FIX | CODE-ONLY: selection stores the opportunity row only. Archive there archives the whole opportunity using the last Open Calls tab; Set owner sets the owner on **every** artist's pitch for that opportunity, not the ticked one. Not run, to avoid changing data. | Ticking Marita's pitch on a two-artist opportunity and setting an owner changes only Marita's pitch. |
| T17 | UX | Running-pack multi-select (Add several to pack, Copy text, Mark pack sent). | EXISTING — FIX · **NEEDS USER DECISION N4** | CONFIRMED: the functions exist (`packAddPicked`, `packCopyPicked`, `packSend`) but the bar that holds them (`#packBar`) is never added to the page, so **Mark pack sent, Copy text and multi-add cannot be reached**. Single Add to pack (row menu) and Open Google Doc Pack work. | Once placed: a user can mark a pack as sent from the Artists page. |

### 4.4 Split view (half-pane open). **Preserve.**

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| T18 | UI | When the half-pane is open, CATEGORY, FEE and OWNER are hidden from the table (they are shown in the pane); the actions column narrows to 40px; remaining columns: OPPORTUNITY 36%, DEADLINE 18%, STAGE 22%, ARTIST 22%. | EXISTING — DOCUMENT | CONFIRMED the three columns are hidden | With the pane open CATEGORY, FEE and OWNER compute to `display: none`; closing it restores them. |
| T19 | UI | The remaining columns stay readable with the pane open. | EXISTING — FIX | CONFIRMED at about 1024px: table 277px, pane 360px; headers overlap ("OPPORTUNIT·DEADLIN·STAGE"). | With the pane open at 1024 and 1280px no header or cell overlaps. |

---

## 5. Forms, validation and modals

### 5.1 Opportunity form (`#/new`, `#/entry/:row`)

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| M1 | UX | Title is required. Saving without it shows "Add a title before saving." under the form and focuses the title field. | EXISTING — DOCUMENT | CONFIRMED | Saving with an empty title shows the message and focuses the title; nothing is saved. |
| M2 | UX | Application link, when filled, must start `http://` or `https://`; otherwise "The application link should start with https://" and the field is focused. | EXISTING — DOCUMENT | CONFIRMED | Saving with `ftp://x` in the link shows the message; nothing is saved. |
| M3 | UX | Invalid fields carry `aria-invalid="true"` and `aria-describedby` pointing at the message. | MISSING — IMPLEMENT | CONFIRMED absent. The message area has `role="alert"`. | A screen reader announces the error and the field it belongs to. |
| M4 | FN | Possible duplicate: the server replies `duplicate`; the user sees "Possible duplicate" with Save anyway or Cancel. **Preserve.** | EXISTING — DOCUMENT | CODE-ONLY (`call`) | Saving an opportunity with an existing link asks first. |
| M5 | UX | Buttons. New or draft: Cancel, Save Draft, Save to Inbox. Inbox: Cancel, Save Changes. Archive: Cancel, Restore to Inbox. | EXISTING — FIX | CONFIRMED: on an Inbox opportunity **Save Draft is also visible**. | An Inbox opportunity shows no Save Draft button. |
| M6 | UX | More menu on the form: Move to drafts (Inbox, Archive); Restore to Inbox (Drafts, Archive); Archive opportunity (Inbox, Drafts); Delete permanently (Archive only, after "Delete permanently?" confirm). | EXISTING — DOCUMENT | CODE-ONLY (`renderCallDetailsMenu`) | Each status shows exactly the items listed. |
| M7 | FN | The Archive menu states "Items in archive are permanently deleted after 30 days." | CONFLICTING — RESOLVE | UNVERIFIED: no such rule was found in the frontend; backend not read. | Either the server does this and a test proves it, or the sentence is removed. |
| M8 | UX | Server error on save: the form stays open with values kept and the message shown under it. | EXISTING — DOCUMENT | CODE-ONLY (`saveNew`, `saveExisting`) | With the server stopped, Save leaves the form open with all values and shows the error. |
| M9 | UX | Archiving from the form shows an Undo toast. | EXISTING — DOCUMENT | CODE-ONLY | Archive from the form, then Undo: the opportunity is back in its tab. |
| M10 | UX | On new opportunities and drafts the artist area shows "Artists are matched after the opportunity is verified in the Inbox." instead of chips. | EXISTING — DOCUMENT | CODE-ONLY (`renderArtistChips`) | A new opportunity form shows the note and no artist chips. |
| M11 | UI | Inputs: rectangular, radius 12px, 1.5px `--tk-border`, background `--tk-card` (light) / `--tk-subtle` (dark), padding 10px 14px, min-height 44px (88px textarea). Focus: A2. Inputs stay editable in edit mode with no pointer-event blocks. | EXISTING — DOCUMENT | UNVERIFIED by measurement | Computed input radius is 12px and min-height 44px; every field accepts typing in edit mode. |
| M12 | FN | Opening a form for a row that does not exist says so. | EXISTING — FIX | CONFIRMED: `#/entry/99999` opens an editable form filled with an invented record ("Curated Opportunity #99999", "Arts Council & Cultural Foundation", `app.js:2228`). The "couldn't be found" message can never run. | `#/entry/99999` shows "That opportunity couldn't be found." and returns to Open Calls. |

### 5.2 Unsaved changes. **Preserve.**

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| M13 | UX | Leaving a changed opportunity form by any in-app navigation asks "Discard changes?" (Discard, Cancel). Cancel keeps the user on the form with edits intact; the address is restored. | EXISTING — DOCUMENT | CONFIRMED both branches | Edit the title, click a sidebar link: the prompt appears. Cancel keeps the edit and the address; Discard leaves. |
| M14 | UX | Closing or reloading the tab with a changed form triggers the browser's leave warning (`beforeunload`). | EXISTING — DOCUMENT | CODE-ONLY (`app.js:3509`) | Edit the title and reload: the browser asks before leaving. |
| M15 | UX | The same protection covers the pitch page, artist profile edits and sheet forms. | MISSING — IMPLEMENT | CONFIRMED for sheets (C17); CODE-ONLY for the rest: the `dirty` flag is set only by the opportunity form. | Editing a pitch comment then navigating away asks first. |

### 5.3 Add Artist (sheet)

| Field | Rule today | Evidence |
|---|---|---|
| Artist full name | Required. Empty: toast "Please enter artist name." and the sheet stays open. | CONFIRMED |
| Primary mediums | Optional free text (not a multi-select). Saved to the artist profile after the artist is created. | CODE-ONLY |
| Studio location | Optional free text. Saved with mediums. | CODE-ONLY |
| Google Drive folder link | **Not saved.** Only a Google Sheets link can be stored; a folder link produces the message "The folder link wasn't saved…". | CODE-ONLY (`openAddArtistModal`) |

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| M16 | UX | Labels are linked to their inputs (`for`/`id`); the name input is marked required. | EXISTING — FIX | CONFIRMED: four labels with no `for`; no `required`. | Clicking a label focuses its input. |
| M17 | FN | Drive folder link. | CONFLICTING — RESOLVE · **NEEDS USER DECISION N3** | The previous spec required a Drive folder URL; the server cannot store one. | See §15. |
| M18 | UX | On success the sheet closes, a toast confirms, and the new artist appears in tabs and sidebar without reload. | EXISTING — DOCUMENT | CODE-ONLY | After Add Artist the new name is in the tabs and the sidebar without a reload. |
| M19 | FN | Duplicate artist name is rejected or confirmed. | — | UNVERIFIED (server) | Establish what the server does and record it here. |

### 5.4 Set owner (sheet)

Opens from a row menu, the bulk bar, or the opportunity form. Lists team members; the signed-in person is added to the team automatically if missing. Choosing a person saves at once, toasts "<name> is now the owner of <artist>'s pitch.", closes the sheet and refreshes the lists. On failure an error toast shows and the sheet stays open. `CODE-ONLY` for the save; `CONFIRMED` the sheet opens with the team list.

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| M20 | UX | Set owner is offered only when an artist is matched. | EXISTING — DOCUMENT | CONFIRMED | A row with no artist has no Set owner item. |
| M21 | UX | Wording in the sheet uses the agreed terms. | EXISTING — FIX | CONFIRMED text: "Workspace User / Curator Profiles", "(Artist assignment is managed in the call details form)", "Studio Curator" under every name, "+ Manage Workspace Team". | See §12.3. |

### 5.5 Other sheets and overlays

| Item | Requirement | Class | Evidence |
|---|---|---|---|
| Profile sheet | Avatar, name, email, "Working as", theme switch, Sign out. | EXISTING — DOCUMENT | CODE-ONLY |
| Team & People (`#whoAreYou`) | Member cards with initials avatar, name, role, active badge; "+ Add Team Member" with inline form; focus returns to the opener on close. | EXISTING — DOCUMENT | CODE-ONLY |
| Close pitch confirm | "Close this pitch?" naming artist, opportunity and reason; "You can reopen it later." | EXISTING — DOCUMENT | CODE-ONLY (`movePitch`) |
| Mark pack sent confirm | States how many pitches will be marked and that a dated copy is kept. | EXISTING — DOCUMENT | CODE-ONLY; unreachable today (T17) |
| Pitch email overlay | See N1. | CONFLICTING — RESOLVE · N1 | CODE-ONLY: overlay text is placeholder. Check: after N1 is applied, the overlay uses a real pitch or is absent. |

---

## 6. Half-pane preview (Open Calls). **Preserve.**

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| H1 | UX | Clicking an opportunity opens `#tkHalfPane` beside the table (50/50 on desktop), highlights the row, and shows status, category, title, organiser, deadline, fee, location, type, theme, eligibility, brief, application link, matched artists, and Edit Details. Close with ×, or Escape. | EXISTING — DOCUMENT | CONFIRMED | Clicking a row opens the pane with that opportunity's data; × and Escape close it. |
| H2 | FN | The pane shows only real data. | EXISTING — FIX | CONFIRMED: every matched artist is labelled "Oil painting, Installation, Mixed media" and "CONFIRMED"; a missing theme, eligibility, brief, organiser, location or link is replaced by invented text (`renderHalfPaneHtml`, including `https://example.org/apply`). | An opportunity with no theme shows no theme text. |
| H3 | UX | The pane's Send to artist button works or is removed. | EXISTING — FIX · N1 | CONFIRMED: its `onclick` attribute is cut off at `openPitchEmailModal('` by a quoting error (`app.js:4789`); the button cannot work. | After N1: the button performs its action or is absent. |
| H4 | UX | Opening the pane moves focus to it; closing returns focus to the row. | MISSING — IMPLEMENT | CONFIRMED focus stays where it was; the pane has an `aria-label` but no role. | Opening moves focus into the pane; closing returns it to the row. |
| H5 | UI | Below 1024px the pane does not sit beside the table. Below 768px it is a bottom sheet over the page. | EXISTING — FIX | CONFIRMED: at 768px and 375px the pane renders **below the table** (about 960px and 860px down the page), outside the viewport; tapping a row appears to do nothing. | At 375px, tapping a row shows the pane within the viewport without scrolling. |
| H6 | UX | Pane labels use the agreed terms. | EXISTING — FIX | CONFIRMED "ASSIGNED ARTIST ROSTER", "No artists assigned yet", "+ Match Artist", status pill "CONFIRMED". | See §12.3. |

---

## 7. Pages and workflows

Workflow rules are in the terms document and are enforced by the server; they are not repeated here. This section records what each page shows and does.

### 7.1 Overview (`#/dashboard`)

Greeting, date, three summary cards (closing within 7 days; waiting on the artist; in preparation), Today's Focus Queue table with row menus, artist roster, intake drop area. Figures come from pitch data. `CONFIRMED` layout and that figures are populated; individual figures not checked against the data.

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| P1 | UX | Summary cards, roster rows and the intake drop area are keyboard operable. | EXISTING — FIX | CONFIRMED: seven `div` click targets with no `tabindex`. | Tab reaches each card, roster row and the drop area; Enter activates it. |
| P2 | UI | Dark mode applies to every panel. | EXISTING — FIX | CONFIRMED: Today's Focus Queue stays white in dark mode. | In dark mode no Overview panel has a white background. |

### 7.2 Open Calls (`#/inbox`, `#/drafts`, `#/archive`)

Tabs Inbox, Drafts, Archive with counts (blank until loaded). Inbox lists opportunities still in review; opportunities that are Verified, matched and have an owner move to a collapsed **Matched (n)** group beneath. Stage column shows the review step: Inbox, Verified, Matched, Owner set; in Archive it shows the reason. `CONFIRMED` tabs, counts and Matched rows; `CODE-ONLY` the rest.

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| P3 | UX | The Archive tab is labelled "Archive". | EXISTING — FIX | CONFIRMED label is "Archived". | The tab reads "Archive". |
| P4 | UX | Archive has filters for "Rejected at review" and "All pitches closed". | MISSING — IMPLEMENT | CODE-ONLY: `setArchiveKind` exists; its controls were removed (`kindChips = ''`). Required by the terms document §2. | Both filters are on the Archive tab and narrow the list. |
| P5 | UX | Verify and Archive are available from the row menu. | OPTIONAL — IMPROVEMENT | Persona review M3; not agreed. | Not planned. |

### 7.3 Artists (`#/artists`, `#/artists/:name`)

Tabs: All Artists and one per artist. Context bar: Open Cohort Drive and Add Artist (All); View Dossier & Files, Open Google Doc Pack, View Profile (one artist). Five stage sections, one table each, with a count pill. Empty stage: "Nothing at this stage." No artists: "No artists yet. Add your first artist to start pitching." `CONFIRMED`

Stage column shows the tag where there is one (Not sent yet, In pack, Sent 13 Nov, Needs info), the reason when Closed, plus " · Follow up" (sent 7 or more days ago, no reply) and " · Deadline passed" (not yet submitted). `CONFIRMED` tags; `CODE-ONLY` flags.

Row menu moves by stage (`pitchMovesFor_`, enforced again by the server): `CONFIRMED` for Pitched; others `CODE-ONLY`.

| Stage | Moves offered |
|---|---|
| Pitched | Add to pack or Remove from pack, Mark sent (only while not sent); Interested; Needs info; Not interested; Close: deadline passed (when flagged) |
| Preparing | Mark submitted; Step back to Pitched; Artist withdrew; Close: deadline passed (when flagged) |
| Submitted | Won; Not selected; Step back to Preparing; Artist withdrew |
| Won | Step back to Submitted; Artist withdrew |
| Closed | Reopen pitch |

Closing moves ask for confirmation first. Each move toasts its result, including when the opportunity moves to the Archive because every pitch is closed, or returns to the Inbox.

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| P6 | UX | Page heading and section titles use the agreed terms: five single stage names. | EXISTING — FIX | CONFIRMED heading "Artist Pipelines"; titles "Stage 1: Pitched · Pending Artist Review", "Stage 2: Preparing · Dossier Drafting", "Stage 3: Submitted · Awaiting Decision", "Stage 4: Won · Placement / Commission", "Stage 5: Closed". | Section titles read Pitched, Preparing, Submitted, Won, Closed. |
| P7 | UI | One colour per stage, the same on the dot, the count pill and the stage badge. | CONFLICTING — RESOLVE · **NEEDS USER DECISION N2** | CONFIRMED: pills render amber, green, blue, green, grey (Won and Preparing are the same green); badges are defined as amber, blue, purple, green, red (`stageBadgeClass_` comment); the previous spec said amber, green, blue, purple, grey. | See §15. |
| P8 | UI | Count pill text contrast at least 4.5:1. | EXISTING — FIX (D8) | CONFIRMED measured, white 12px / 700 text: Pitched `#d97706` 3.19, Preparing `#16a34a` 3.30, Submitted `#2563eb` 5.17, Won `#16a34a` 3.30, Closed `#9ca3af` 2.54. Four of five fail. | Each pill measures 4.5:1 or more in both themes. |
| P9 | UX | "Pitch Opportunity" button (one-artist tab). | EXISTING — FIX · N1 | CONFIRMED present. CODE-ONLY: it opens the email overlay with fixed placeholder text ("Curated Placement Opportunity", "Grant / Residency", "30 Nov") and an invented address. | After N1: the button uses real pitch data or is absent. |
| P10 | UI | Dark mode: row titles and tabs are legible. | EXISTING — FIX | CONFIRMED: row title `rgb(17,24,39)` on `rgb(26,28,24)` = **1.03:1 (invisible)**; the tab bar stays white; inactive tab 2.42:1. | Row titles measure 4.5:1 or more in dark mode. |

### 7.4 Pitch page (`#/artist-call/:name/:row`)

Header (deadline · category · organiser), Edit, more menu, Copy to clipboard, Add to doc, Open doc, four steps (Pitched; Artist's reply; Preparing & Submitted; Result), Documents, Open folders. `CONFIRMED` for a Pitched pitch. Other stages `CODE-ONLY`.

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| P11 | UX | Button labels match the Artists row menu and the terms document. | EXISTING — FIX | CONFIRMED "Mark as sent" here, "Mark sent" in the row menu and terms document. | One label per action across both screens. |

### 7.5 Add (`#/add`), Analytics, Settings, Sign-in

| Page | What exists | Evidence |
|---|---|---|
| Add | Link, pasted text, drag-and-drop or pasted files; AI fills the form; then the opportunity form (§5.1). | CODE-ONLY |
| Analytics | Heading, artist and year filters, figures from real pitches; note that figures appear once applications are submitted; error state with Try again. | CONFIRMED loads; figures not checked |
| Settings | Four cards: Custom Form Fields (Configure), Reminders & Autopilot (Manage Rules), Reports & Export (View Reports), Team & People (Manage Team). | CONFIRMED cards; sheets not opened |
| Sign-in, "Who are you", pending approval | Google sign-in, then choose or add a person. | CODE-ONLY; real Google not available |

---

## 8. State preservation

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| S1 | UX | Scroll position is restored when returning to Inbox, Drafts or Archive. **Preserve.** | EXISTING — DOCUMENT | CONFIRMED: Inbox at 300px → form → Back → 300px | Scroll Inbox to 300px, open a form, press Back: scroll is 300px. |
| S2 | UX | Scroll position is restored on the Artists page. | MISSING — IMPLEMENT | CONFIRMED: 250px → pitch page → Back → 0px. Only `inbox`, `drafts`, `archive` are saved (`onRoute`). | Open a pitch from a scrolled Artists page, press Back: same position. |
| S3 | UX | Search, filters and sort on Open Calls persist per tab for the session. **Preserve.** | EXISTING — DOCUMENT | CONFIRMED | Same as T6. |
| S4 | UX | Accordion open or closed state on Artists survives leaving and returning. | MISSING — IMPLEMENT | CONFIRMED: resets to defaults. | Collapse Pitched, open a pitch, press Back: Pitched is still collapsed. |
| S5 | UX | The selected artist tab survives reload and Back. | EXISTING — FIX | See G5. | Same as G5. |
| S6 | UX | Last Open Calls tab is remembered on the device (`oc_tab`); lists are cached locally so the page renders before the server replies. | EXISTING — DOCUMENT | CODE-ONLY | Reload with no address on a device that last used Drafts: Drafts opens and the list shows before the server replies. |
| S7 | UX | Browser Back closes the half-pane before leaving the page. | OPTIONAL — IMPROVEMENT | Not built; not agreed. | Not planned. |

---

## 9. Loading, empty, success and error states

| ID | Tag | State | Requirement | Class | Evidence |
|---|---|---|---|---|---|
| L1 | UX | Loading, Open Calls | Three skeleton blocks (`.skel`) on first load; cached list shown immediately on later loads. **Preserve.** | EXISTING — DOCUMENT | CODE-ONLY (`loadList`) |
| L2 | UX | Loading, Artists and Analytics | "Loading artists…" / "Loading analytics…" | EXISTING — DOCUMENT | CODE-ONLY |
| L3 | UX | Error, Artists and Analytics | "Couldn't load the pitches." with the reason and **Try again**. | EXISTING — DOCUMENT | CODE-ONLY |
| L4 | UX | Error, Open Calls | Error box when nothing is cached; error toast when a cached list is on screen. No retry button. | EXISTING — FIX | CODE-ONLY. Add Try again, as on Artists. |
| L5 | UX | Empty tab | Inbox: "Your Inbox is empty"; Drafts: "No drafts"; Archive: "Nothing archived"; with an Add button except on Archive. | EXISTING — DOCUMENT | CODE-ONLY. Wording to fix: §12.3. |
| L6 | UX | No results | "No matches. Try another search or clear the filters." with **Clear filters**. | EXISTING — DOCUMENT | CODE-ONLY |
| L7 | UX | Empty stage | "Nothing at this stage." | EXISTING — DOCUMENT | CONFIRMED |
| L8 | FN | Offline or unreachable | "You're offline. Reconnect and try again." / "Couldn't reach the server. Check your connection and try again." returned by `api`. | EXISTING — DOCUMENT | CODE-ONLY |
| L9 | FN | Session ended | Any reply with `auth` shows the sign-in or pending screen. | EXISTING — DOCUMENT | CODE-ONLY |
| L10 | FN | Demo data | On localhost only, when not signed in to the local server, sample data is shown under a red "Demo data, not your real data" banner. Never on a production host. | EXISTING — DOCUMENT | CODE-ONLY (`api`, `demoNotice_`) |
| L11 | UX | Success | Toast naming what changed (§3.5). | EXISTING — DOCUMENT | CODE-ONLY |
| L12 | UX | Undo | Archive (single and bulk): Undo toast. Closed pitches: Reopen. Any pitch: step back one stage. Permanent delete, close pitch and mark pack sent: confirm first. | EXISTING — DOCUMENT | CODE-ONLY |
| L13 | UX | Autosave indicator, slow-response message | Not built. | OPTIONAL — IMPROVEMENT | Not planned. |

Check for L1–L12: with the server stopped, each page shows its error state and no success message; with an empty sheet, each list shows its empty state.

---

## 10. Responsive behaviour

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| R1 | UI | Phone: tables scroll sideways inside their own wrapper; the page itself does not. | EXISTING — FIX | CONFIRMED at 375px: the table is 660px in a 342px container with `overflow: visible`; the whole `<main>` scrolls sideways instead (677px), taking the filters and tabs with it. All columns are reachable only by scrolling the page. Persona finding H2 is therefore partly met. | At 375px `main.scrollWidth === main.clientWidth` and the table wrapper scrolls. |
| R2 | UI | Tablet 768–1023px: see G6 (sidebar overlap) and H5 (pane position). | EXISTING — FIX | CONFIRMED | Same as G6 and H5. |
| R3 | UI | About 1024px: see T1 and T19 (column overlap). | EXISTING — FIX | CONFIRMED | Same as T1 and T19. |
| R4 | UI | Two-column form groups stack to one column below 768px. | EXISTING — DOCUMENT | UNVERIFIED | At 375px every form field is full width. |
| R5 | UI | Sheet width and maximum height per breakpoint; button stacking order; bulk bar position above the bottom tab bar. | MISSING — IMPLEMENT | UNVERIFIED | Values are recorded here per breakpoint; the bulk bar never covers the bottom tab bar. |
| R6 | UX | On phones the Add button is the header "Add Open Call" control; the floating add button is hidden. | EXISTING — DOCUMENT | CONFIRMED | At 375px the header Add control is visible and the floating button is not. |

---

## 11. Accessibility

Target: WCAG 2.1 AA. **Not met today**; no conformance is claimed. Measured state:

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| A1 | UX | Every action is operable by keyboard. | EXISTING — FIX | CONFIRMED non-button click targets without `tabindex`: opportunity cells (12 on Inbox), sidebar user block, accordion headers, 7 on Overview. | A full keyboard walk-through of each page reaches and operates every control. |
| A2 | UI | One focus style for every control via `:focus-visible`: 2px solid ring, 3:1 against its background, same in both themes. | EXISTING — FIX | CONFIRMED: focused row-menu item shows `box-shadow 0 0 0 3px rgba(255,94,91,.35)` (coral at 35%); the row-menu trigger shows about 0.5px at 5.5%; the previous spec described a dark ring. CSS has 4 `:focus-visible` rules and 16 `outline: none`. | Tab through each page: the ring is always visible and looks the same. |
| A3 | UI | Text contrast 4.5:1 (3:1 for 18px+ or 14px+ bold). | EXISTING — FIX | CONFIRMED failures: count pills (P8); "Not sent yet" badge 4.40:1; dark-mode row titles 1.03:1; dark-mode inactive artist tab 2.42:1. Passes: column headers 9.86, category pills 6.4–9.4, urgent deadline 6.47, "No owner" 4.83, dark stage badge 8.29. | Automated scan (axe) reports no contrast failures on each page in both themes. |
| A4 | UX | Every input has a programmatic label. | EXISTING — FIX | CONFIRMED on Inbox: 3 of 34 controls unlabelled (`q`, `fSort`, `newPersonName`); Add Artist labels not linked (M16). | Scan reports no unlabelled controls. |
| A5 | UX | Dialogs: C14, C15, C19. Menus: C10. Tabs: C24. Accordions: C26. | — | — | See the rows named. |
| A6 | UX | Status messages are announced: toast and form messages use live regions. | EXISTING — DOCUMENT | CONFIRMED `#toast`, `#list`, `#signMsg`, `#whoMsg`, `#addMsg`, `#calHint` are live; `#entryMsg` is `role="alert"`. | Triggering a toast or a form error is announced by a screen reader. |
| A7 | UI | Text can be selected and copied. `user-select: none` only on buttons, menu triggers and accordion headers. | EXISTING — FIX (D13) | CONFIRMED: table cells, titles and half-pane text are selectable. CODE-ONLY: `.card` carries `user-select: none` (`styles.css:173`) and 17 other rules set it; no `.card` element was on screen on Open Calls, Overview or Artists, so where it bites is UNVERIFIED (artist profile and doc review pages not opened). | A user can select and copy text inside any card. |
| A8 | UI | Motion: F12. Touch targets: C6. | — | — | See F12 and C6. |

---

## 12. Microcopy and terminology

### 12.1 Rules

- Terms: `Tikorix-docs\6-Workflow-and-terms.md`. Opportunity, Pitch, Match, Owner, Review steps, Pitch stages, Archived, Closed, Running pack. The page is still named **Open Calls**.
- Buttons: verb first, sentence case ("Save changes", "Add artist"). `EXISTING — FIX`: the app mixes "Save Changes", "Save Draft", "Edit Details", "Add Artist" with "Save to Inbox", "Mark sent".
- Dates: `13 November 2026` in headers; `13 Dec 2026` in tables; `Sent 13 Nov` in tags. `CONFIRMED`
- Fees: shown as entered, with the currency symbol as entered (sample data uses ₹). "Free" only when the fee is stated as free. Unknown: "Not stated". No conversion. (D10; fix in T12.)
- Errors: say what happened and what to do ("Couldn't set the owner." + server reason). Confirmations: name the thing and say whether it can be undone.

### 12.2 Deadlines

| Case | Table text today | Evidence |
|---|---|---|
| More than 7 days | `13 Dec 2026` | CONFIRMED |
| 2 to 7 days | `4 days`, red, 600 | CONFIRMED |
| 1 day | `1 day`, red | CODE-ONLY |
| Today | `Today`, red | CODE-ONLY |
| Past | `Closed` | CONFIRMED |
| None | `No deadline` | CODE-ONLY |

| ID | Tag | Requirement | Class | Evidence | Check |
|---|---|---|---|---|---|
| X1 | UX | Urgent means 7 days or fewer, including today, everywhere (table, half-pane, Overview, Closing soon). | CONFLICTING — RESOLVE (resolved, D9) | The code uses 0–7 inclusive (`formatSyncedDeadline`); the previous spec said "under 7" in three places and showed "7 days" in red in a fourth. The code's rule is adopted so behaviour does not change. Overview says "4 days left"; tables say "4 days". | One function decides urgency; a deadline exactly 7 days away is red on every screen. |
| X2 | UX | A passed deadline reads "Deadline passed", not "Closed". | EXISTING — FIX | CONFIRMED "Closed" in the Deadline column. "Closed" is a pitch stage with a different meaning. | A past deadline reads "Deadline passed" in every table. |

### 12.3 On-screen strings that must change

Retired wording appears in this document only as quoted evidence of what is on screen today, and in this table. Code identifiers (`assignedTo`, `.tk-assigned-pill`, `openAssignProfileModal`) are not renamed in this phase.

| Where | Now | Becomes | Evidence |
|---|---|---|---|
| Artists heading | Artist Pipelines | Artists | CONFIRMED |
| Stage titles | "Stage 1: Pitched · Pending Artist Review" and the other four | Pitched, Preparing, Submitted, Won, Closed | CONFIRMED |
| Open Calls tab | Archived | Archive | CONFIRMED |
| Header button, empty state | Add Open Call, Add an open call | Add opportunity | CONFIRMED |
| Half-pane | ASSIGNED ARTIST ROSTER; No artists assigned yet; status CONFIRMED | Matched artists; No artist matched yet; the review step | CONFIRMED |
| Set owner sheet | Workspace User / Curator Profiles; "Artist assignment is managed in the call details form"; Studio Curator | Team; "Artists are matched on the opportunity."; remove the fixed role | CONFIRMED |
| Inbox empty text | "Confirmed open calls appear here, ready to send to artists." | "Opportunities saved to the Inbox appear here, ready to verify." | CODE-ONLY |
| Toasts | "Assigned to <artist>."; "Couldn't assign the artist."; "That open call couldn't be found." | "Matched to <artist>."; "Couldn't match the artist."; "That opportunity couldn't be found." | CODE-ONLY |
| Dirty prompt | "Your edits to this open call will be lost." | "Your edits to this opportunity will be lost." | CONFIRMED |
| Pitch page | Mark as sent | Mark sent | CONFIRMED |
| Previous spec only | Approve Opportunity; Decline / Pass; Delete Call; ASSIGNED TO / USER; Assign to Profile Modal | Verify; Not interested / Close pitch; Delete permanently; OWNER; Set owner | Not found on the screens tested |

---

## 13. Functional dependencies

UI requirements that cannot be met by frontend work alone.

| ID | Depends on | For |
|---|---|---|
| D-F1 | Server stores a Drive folder link per artist | M17 / N3 |
| D-F2 | Server accepts a pitch identity (row + artist) for bulk archive and bulk owner | T16 |
| D-F3 | Server rule for deleting archived items after 30 days, or removal of the sentence | M7 |
| D-F4 | Server duplicate check for artist names | M19 |
| D-F5 | `sw.js` exists and is served | G11 |
| D-F6 | Approval links expire (open in `1-Status-and-decisions.md`) | Outside this document |

All server calls go through `api(action, payload)`, which returns `{ ok, message, … }`. Every write sends `expectTitle` so a stale row number cannot change the wrong record. `CODE-ONLY`. Preserve both.

---

## 14. QA and regression gate

A change to the interface is accepted only when all of these pass.

1. `node tools\run-all-tests.js`: 35 of 35, before and after. (13 Nov baseline: 35 ok, 0 failures.)
2. **Functional inventory.** Every route in §2.2, every button and menu item named in §3–§7, still present and working. The list may not get shorter without written approval.
3. **Journeys.** The five persona journeys in `8-Persona-journeys-review.md`, run in the harness.
4. **Existing behaviour that must still work** (each is a named check):
   - Discard-changes prompt on leaving a changed opportunity form (M13) and the browser leave warning (M14).
   - Escape closes sheet, Team & People, menus, half-pane (C20).
   - Sidebar arrow keys (G7); Enter and Tab in row menus (C9).
   - Toasts with Undo (C21, L12).
   - Reduced-motion reset (F12).
   - Bulk bar: tick, Clear, Archive with Undo, Set owner (T13–T15).
   - Scroll and filter restoration on Inbox, Drafts, Archive (S1, S3).
   - Half-pane column hiding (T18); row menu never clipped (C7).
   - Duplicate prompt (M4); skeleton on first load (L1).
5. **Screens.** Each page at 375, 768, 1024 and 1280px, light and dark, compared with the previous capture. No overlap, no clipped control, no sideways page scroll.
6. **Keyboard.** Each page walked with Tab, Shift+Tab, Enter, Space, Escape and arrows.
7. **Automated accessibility scan** (axe or equivalent) per page, both themes.
8. **Failure test.** With the server stopped: no success toast appears anywhere; forms and pickers keep what the user entered.
9. **Data honesty.** No placeholder or invented text appears where data is missing (T12, H2, M12).
10. `git status` shows only the intended files changed.

---

## 15. Open decisions

| # | Question | Options | Recommendation |
|---|---|---|---|
| **N1** | "Send to artist" (Open Calls row menu and half-pane) and "Pitch Opportunity" (artist tab) open an email overlay built from placeholder text and an invented address. The half-pane button is broken. The agreed workflow sends pitches through the running pack and Mark sent. | (a) Remove all three. (b) Keep and rebuild on real pitch data as a "copy pitch email" helper that never marks anything sent. | (a). The pack already does this job; the overlay shows data that is not real. |
| **N2** | Stage colours disagree in three places (P7). | (a) Pitched amber, Preparing blue, Submitted purple, Won green, Closed grey. (b) The previous spec's amber, green, blue, purple, grey. | **DECIDED 13 Nov: (a). Built** in `styles.css` and `app.js` (section dots). Count pills measured 5.0–8.3 : 1. Dark-mode stage colours still to do (F4). |
| **N3** | Add Artist asks for a Drive folder link the server cannot store (M17). | (a) Add server support for a folder link. (b) Relabel the field "Google Sheets link". (c) Remove the field. | **DECIDED 13 Nov: (a). Built** (`Drive Folder Link` column; Add Artist and Open use it). Not yet tested against a real Google account. |
| **N4** | Where the running-pack controls go (T17). Today Mark pack sent, Copy text and multi-add cannot be reached. | (a) A bar above the tables on each one-artist tab. (b) Fold them into the existing bulk bar when the ticked rows are unsent pitches. | **POSTPONED 13 Nov.** The feature needs more detail first (doc content, who sends, what "sent" means, naming). |
| **N5** | Sign out is styled as a danger action. | (a) Secondary. (b) Leave as danger. | **DECIDED 13 Nov: (b). Keep red.** No change. |
