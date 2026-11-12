# Tikorix UI/UX Design System Specification

## 1. Design Philosophy & Brand Foundation
Tikorix is a professional curatorial workspace platform engineered for contemporary art studios, artist representation agencies, and institutional curatorial teams. 

The interface emphasizes:
- **Calm, High-Information Density**: Warm, organic neutrals paired with sharp deep slate typography and lively lime-green brand accents.
- **Consistent Visual Hierarchy**: Pill-shaped action badges, soft 20px card enclosures, crisp 12px input controls, and subtle hairline borders.
- **Accessible & Dyslexia-Friendly**: Uses one typeface, `Poppins`, for headings and body (this is what `styles.css` applies everywhere; the earlier Atkinson body font is retired), high contrast ratios (WCAG AA compliant), and spacious interactive touch targets (minimum 44x44px).

---

## 2. Color System & Design Tokens

### Light Theme (Default)
| Token | Value | Semantic Usage |
|---|---|---|
| `--tk-bg` | `#faf9f5` | Primary workspace canvas background |
| `--tk-card` | `#ffffff` | Elevated surface cards, panels, and tables |
| `--tk-dark` | `#151e11` | Primary text, brand headers, high-emphasis icons |
| `--tk-border` | `#dcdfd5` | Structural borders, card outlines |
| `--tk-border-light` | `#e5e7eb` | Table dividers, inner hairlines |
| `--tk-muted` | `#6b7280` | Subtitles, secondary metadata |
| `--tk-slate` | `#374151` | Body text, table column headers |
| `--tk-lime` | `#d2e21a` | Brand highlight, accent pill fills, logo emblem |
| `--tk-green-bg` | `#dcfce7` | Confirmed status, success alerts, assigned pills |
| `--tk-green-text` | `#15803d` | Confirmed labels, positive metrics, approve actions |
| `--tk-urgent-bg` | `#fef2f2` | Urgent deadlines (<7 days), danger actions |
| `--tk-urgent-text` | `#dc2626` | Urgent countdowns, delete buttons |

One value per token. These match the final `:root` block in `styles.css` (the "pixel-perfect mockup" layer), which is what the app renders. Earlier alternates (`#151e11`, `#4b5563`, `#166534`, `#991b1b`, `#f0fdf4`, `#fee2e2`) are retired and must not be used in new code.

### Dark Theme (`data-theme="dark"`) - High-Contrast Obsidian / Zinc
| Token | Value | Semantic Usage |
|---|---|---|
| `--tk-bg` | `#09090b` | Canvas background |
| `--tk-card` | `#18181b` | Surface cards, panels, and tables |
| `--tk-sunk` | `#202024` | Sunk areas, modals and menus |
| `--tk-subtle` | `#141417` | Form input and textarea backgrounds |
| `--tk-border` | `#27272a` | Hairline borders |
| `--tk-dark` | `#f9fafb` | Primary text in dark mode |
| `--tk-muted` | `#a1a1aa` | Subtitles, secondary metadata, and column headers |
| `--tk-lime` | `#d2e21a` | Brand emblem, active pills, key action buttons |

These are the values the dark `--tk-*` block in `styles.css` sets with `!important`, so they are what renders. The older obsidian set (`#0e100d`, `#161913`, `#293024`, `#9ea396`) still appears in a few component rules and should be migrated to these tokens.

---

## 3. Typography Scale
- **Display Page Titles**: `32px` / `800` (Extra Bold), line-height `1.2`, letter-spacing `-0.5px`
- **Section Headers (H2 / H3)**: `20px` - `24px` / `700` (Bold)
- **Pipeline Stage Accordion Headings**: `15.5px` / `700` (Bold) with colored stage status dot and stage-colored count pill
- **Card Subheaders (H4)**: `16px` - `17.5px` / `700` (Bold)
- **Table Column Headers**: `11.5px` / `700` (Bold), Uppercase, letter-spacing `0.06em`, color `#374151` (light) / `#9ea396` (dark). Single authoritative definition; see §11.
- **Table Row Titles (`.tk-cell-title`)**: `13.5px` / `600` (Semi-Bold), line-height `1.3`, color `#151e11` (light) / `#f9fafb` (dark). Relaxed from 700 to 600 so row data does not visually compete with section and column headings.
- **Table Row Fee & Deadline**: `13px` / `600` (Semi-Bold). Urgent deadlines (<7 days) rendered in `#dc2626`.
- **Body & Data Grid Text**: `14.5px` / `500` - `600`, line-height `1.5`
- **Microcopy & Metadata**: `12px` - `13px` / `500` (Medium)

---

## 4. Button Hierarchy & Standards
To prevent button duplication and visual clutter, Tikorix strictly enforces a 3-tier button hierarchy:

1. **Primary Actions**:
   - Styling: Solid dark pill (`background: #151e11; color: #ffffff; border-radius: 9999px; padding: 8px 22px; font-weight: 700;`)
   - Examples: `Save Changes`, `+ Add Open Call`, `Approve Opportunity`
   - Limit: **At most one** primary action button per screen section.

2. **Secondary / Utility Actions**:
   - Styling: Soft ghost pill (`background: #ffffff; border: 1px solid #dcdfd5; color: #151e11; border-radius: 9999px; padding: 7px 16px;`)
   - Examples: `Cancel`, `Back to Open Calls`, `View Dossier & Files`, `Manage Profile`

3. **Danger Actions**:
   - Styling: Soft red pill (`background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 9999px; padding: 8px 18px;`)
   - Examples: `Delete Call`, `Sign out`, `Decline / Pass`

4. **Action Placement Rule**:
   - In detail/edit screens (`#/entry/:id`), actions live in the **top navigation toolbar** and are not redundantly duplicated in bottom sticky bars.

---

## 5. Form & Input Specifications
Form controls must avoid weird squished pill shapes and maintain modern, standard rectangular inputs:
- **Border Radius**: `12px` uniform across text inputs, date pickers, selects, and textareas.
- **Border**: `1.5px solid #dcdfd5` (Dark mode: `#293024`, token `--line`).
- **Background**: `#ffffff` (Dark mode: `#121510`, token `--input`).
- **Padding**: `10px 14px`.
- **Minimum Height**: `44px` for single-line inputs and select dropdowns; `88px` for textareas.
- **Focus State**: `border-color: #151e11; box-shadow: 0 0 0 3px rgba(21, 30, 17, 0.12); outline: none;`
- **Editability Guarantee**: Inputs remain fully interactive and editable in edit modes without artificial pointer-event blocks.

---

## 6. Table & Grid Standards
- **Container**: `.tk-table-card` with `border-radius: 16px`, `background: #ffffff`, and `overflow: visible` on desktop so action popups never clip.
- **Strict Table Layout & Colgroup Alignment**: All pipeline stage tables (`table.tk-pipeline-table`) and open calls tables use `table-layout: fixed; width: 100%; border-collapse: collapse;` paired with explicit `<colgroup>` definitions. This enforces mathematically identical horizontal column alignment across separate collapsible stage tables (Stage 1 through Stage 5).
- **Column Alignment Rules**:
  - **Left-Aligned**: `OPPORTUNITY` (column 2) is left-aligned (`text-align: left`) with `-webkit-line-clamp: 2` title truncation, secondary funder/location subtitle, and full title hover tooltips.
  - **Center-Aligned**: All metadata columns (`CATEGORY`, `FEE`, `DEADLINE`, `STAGE`, `ARTIST`, `OWNER`) and action columns are strictly center-aligned across both `<th>` headers and `<td>` data cells (`text-align: center; justify-content: center;`).
- **Columns for Open Calls & Artists Pipeline Tables**:
  1. `CHECKBOX` (`44px` / fixed): Multi-select row checkbox, center-aligned.
  2. `OPPORTUNITY` (`30%` / flex): Opportunity title (13.5px / 600) + funder/location microcopy, left-aligned.
  3. `CATEGORY` (`11%` / flex): Pill badge (`.tk-cat-grant`, `.tk-cat-residency`, `.tk-cat-exhibition`), center-aligned.
  4. `FEE` (`8%` / flex): Clean single-line formatting (`Free` or `$50`, 13px / 600 bold), center-aligned. Full fee perks/descriptions remain accessible via hover tooltip and the half-pane preview card.
  5. `DEADLINE` (`11%` / flex): Date or countdown badge (e.g. `7 days` in bold red `#dc2626`), center-aligned.
  6. `STAGE` (`13%` / flex): Soft rounded status badge (`badge-stage-*` with subtle tinted background and distinct stage color), center-aligned.
  7. `ARTIST` (`13%` / flex): Represented artist pill (`Harsha`, `Marita`, `Savya`), center-aligned.
  8. `OWNER` (`14%` / flex): Assigned workspace curator name or `No owner` in muted slate, center-aligned.
  9. `ACTIONS` (`44px` / fixed): Label-less 3-dots popover (`<th class="tk-col-actions" aria-label="Actions"></th>`), center-aligned.

---

## 7. 3-Dots Action Menus & Clipping Prevention
- **Label-less Action Header**: Table header for the action column has no visible text label (`<th class="tk-col-actions" aria-label="Actions"></th>`), freeing ~32px of horizontal table space directly back to data columns.
- **Z-Index & Elevation**: Elevated to `z-index: 99999` with a deep elevation shadow (`box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`) to float cleanly above table boundaries, sibling accordions, and collapsed sections.
- **Viewport-Aware Fixed Positioning (`toggleRowMenu`)**: Uses `position: fixed` computed from the trigger's bounding rect, escaping container overflow clipping and stacking contexts entirely:
  - If vertical space between trigger bottom and viewport edge is under `220px`, the menu anchors upward (`.drop-up` mode) with top-boundary clamping (`Math.max(12, ...)`).
  - If space permits, it anchors downward with bottom-boundary clamping.
- **Standard 3-Dots Menu Items**:
  - `Edit details`
  - `Set owner` (opens curator assignment picker sheet)
  - `View Call Files / Folder` (links to artist Google Drive dossier; SVG folder icon)
  - `Add to pack` / `Remove from pack` (for pitches in stage Pitched)
  - Pitch stage action buttons (`Mark sent`, `Interested`, `Needs info`, `Not interested`, `Withdrew`, `Mark submitted`, `Won`, `Not selected`, `Close: deadline passed`)
- **Icons**: All interface icons are crisp SVGs (stroke, `currentColor`). Emojis are never used for UI icons.

---

## 8. Modals, Sheets & Split Pane Preview
1. **Half-Pane Preview (`#tkHalfPane`)**:
   - Opens when an opportunity row is clicked.
   - 50/50 desktop split container (`.tk-split-container`) with smooth transition.
   - **Adaptive Split-View Table Rules (`.tk-split-container.has-preview-pane`)**:
     - When half-pane preview is active, duplicate columns (`CATEGORY`, `FEE`, `OWNER`) are suppressed (`display: none !important`) from the table because they are prominently featured in the right-hand preview card.
     - `ACTIONS` column width compresses to `40px`.
     - Remaining columns expand smoothly without horizontal crushing or multi-line stacking: `OPPORTUNITY` (36%), `DEADLINE` (18%), `STAGE` (22%), `ARTIST` (22%).
     - Badges in the collapsed columns retain `overflow: visible; white-space: nowrap;` so text is never truncated.
     - Horizontal swipe fallback (`overflow-x: auto; -webkit-overflow-scrolling: touch;`) on `.tk-table-wrap` ensures smooth scrolling without viewport overflow.
   - Includes top `×` close button, badge metadata, brief summary, external URL pill, assigned artist profile chip, and `Edit Details` action.
2. **Stage Accordion Count Pills**:
   - Section count pills (`.tk-count-pill`) inherit the background color of their corresponding stage status dot:
     - Stage 1 (Pitched / Pending): `.dot-amber` (`background: #f59e0b; color: #ffffff;`)
     - Stage 2 (Preparing / Dossier): `.dot-green` (`background: #16a34a; color: #ffffff;`)
     - Stage 3 (Submitted / Awaiting): `.dot-blue` (`background: #2563eb; color: #ffffff;`)
     - Stage 4 (Won / Outcome): `.dot-purple` (`background: #8b5cf6; color: #ffffff;`)
     - Stage 5 (Closed / Archived): `.dot-gray` (`background: #64748b; color: #ffffff;`)
   - High-contrast white count text guarantees WCAG AA legibility against solid stage tones.
3. **Settings Page (`#/settings`)**:
   - Dedicated route accessible from sidebar.
   - Houses 4 core administrative cards: Custom Form Fields, Automated Reminders, Reports & Export, and Team & People.
4. **User Profile Modal (`openProfileMenu`)**:
   - Triggered by bottom-left user avatar.
   - Contains user avatar, identity, workspace title, 3-way appearance switcher (`Device`, `Light`, `Dark`), and brand-consistent pill `Sign out` button.

---

## 9. Mobile Responsiveness & Breakpoints
- **Approved breakpoints** (authoritative):
  - **Mobile**: below `768px`. Navigation is a fixed bottom tab bar with five labelled items.
  - **Tablet**: `768px`–`1023px`. Navigation is a compact 72px icon sidebar; content uses the remaining width.
  - **Desktop**: `1024px` and above. Full sidebar (`250px`).
- **Mobile details**:
  - Sidebar becomes a bottom tab bar.
  - Tables enable horizontal swipe (`overflow-x: auto; -webkit-overflow-scrolling: touch;`).
  - Two-column form bundles collapse gracefully into a single-column stack.
  - Half-pane transitions from side-by-side to full bottom sheet preview.

## 10. Tikorix v4 Architecture & Design Alignment (November 2026)

### 10.1 Single-Row Header Layout
- Every view provides unified `.tk-top-bar` where back navigation buttons (e.g. `< Back to Open Calls` or `< Back`), page title/breadcrumbs, Date Pill (`4 November 2026`), and Notification Bell are strictly aligned on the same horizontal row.
- The orphaned `#pageBack` element floating outside the view has been permanently removed.

### 10.2 Refined Select & 3-Dots Action Menus
- Raw emojis (`📁`, `✓`, `✕`, `👤`, `↗`, `✉`, `📄`) have been replaced with sharp, scalable SVG icons.
- Dropdown menus feature `user-select: none; cursor: pointer;` preventing text I-beam cursors from appearing on interaction.
- "Send to artist" action is conditionally rendered only when the opportunity has been assigned to an artist.
- All detail actions ("Edit details") reliably open the corresponding opportunity view or half-pane without throwing empty or unhandled states.

### 10.3 Artists Cohort Bar & + Add Artist
- Redundant text ("Full Cohort Overview" and subtitle counts) removed from the top bar when "All Artists" is active.
- Secondary bar provides direct "Open Cohort Drive" / "View Dossier & Files" buttons dynamically mapped to Google Drive folder links for each artist.
- "Manage Profile" replaced with `+ Add Artist` button opening a modal with Artist Full Name, Primary Mediums, Studio Location, and Google Drive Folder URL.
- Table columns: see §6 (the single definition). `DEADLINE` shows "X days left" when under 7 days.

### 10.4 Redesigned "Who Are You" / Team & People Modal
- Full design parity with Tikorix card language: 24px border radius, blurred backdrop overlay (`backdrop-filter: blur(8px)`).
- Team members displayed as interactive cards with 38px dark/lime avatar initials, bold member name, role tag, and "Active Profile" status badge.
- Includes clean `+ Add Team Member` pill button with inline expandable form.

### 10.5 Standardized Overview Width
- Removed legacy 860px max-width container restriction on `#dashboardContent`. Overview container now matches the 100% responsive width of Open Calls and Artists pages.

### 10.6 Dual-Column Artist & User Profiles Architecture
- **Distinct Profile Columns**:
  - **Column 1 (`ARTIST`)**: The represented contemporary artist whose portfolio is submitted for the opportunity (e.g., *Marita Fernandez*, *Harsha*, *Savya*).
  - **Column 2 (`ASSIGNED TO / USER`)**: The workspace team member or curator responsible for overseeing and managing the submission lifecycle (e.g., *Hazel F.*, *Studio Curator*).
- **Assign to Profile Modal**:
  - Organized into a clean 2-column layout:
    - **Column 1 (Left)**: *Artist Profiles* with one-click cohort artist assignment.
    - **Column 2 (Right)**: *User Profiles* with one-click workspace curator assignment.
  - Interactive status badges indicate active assignments (SVG check icon + `Assigned`, per the no-emoji rule in §7) with dedicated shortcut buttons to add new artists or manage team members.

### 10.7 Dynamic Collapsible Sidebar Artists Dropdown
- **Navigation Placement**: Positioned directly underneath the "Artists" primary item in the left workspace sidebar (`#tkNavArtistsSub`).
- **Interactive Collapsible Caret**: The "Artists" navigation item includes an interactive toggle caret (`⌃` when expanded, `⌄` when collapsed) driven by `toggleSidebarArtists(e)`.
- **Dynamic Roster Population**: Sub-navigation items are populated at runtime from the live artist cohort (`renderSidebarArtists()`), automatically adapting as new artists are added:
  - `All Artists` (`#/artists`)
  - `Harsha` (`#/artists/Harsha`)
  - `Marita` (`#/artists/Marita`)
  - `Savya` (`#/artists/Savya`)
  - Future artists added via `+ Add Artist` modal dynamically appear in the dropdown.
- **Bidirectional Route Synchronization**:
  - Clicking any sidebar artist link navigates to `#/artists/:artistName` and automatically selects that artist's tab on the Artists page.
  - Clicking an artist tab on the Artists page automatically synchronizes the active state of the sidebar dropdown link.
  - Selecting another primary nav section (Overview, Open Calls, Analytics, Settings) keeps the dropdown state intact while gracefully de-highlighting sub-items.
- **Visual Styling**:
  - Sub-items are indented (`padding: 8px 16px 8px 36px`) with `font-size: 13px; font-weight: 500; color: #4b5563;`.
  - Active sub-item receives high-emphasis styling (`color: #151e11; font-weight: 700; background: rgba(0,0,0,0.04);`) and suppresses redundant right indicator bars (`.tk-nav-subitem::after { display: none !important; }`).


## 11. Table Visual Hierarchy & Column Sizing Specification

To maintain clear visual hierarchy between section headers, table column headers, and data rows, typographic weights are strictly calibrated:
- **Section & Accordion Headings**: `15.5px` / `700` (Bold) with colored stage status dot and stage-colored count pill.
- **Table Column Headers**:
  - **Font Size**: `11.5px` (`0.71875rem`)
  - **Font Weight**: `700` (Bold)
  - **Transform**: `uppercase` with `letter-spacing: 0.06em`
  - **Color**: `#374151` (Light Mode) / `#9ea396` (Dark Mode)
  - **Cell Padding**: `12px 14px` with a crisp bottom divider
  - **Column Alignment**: Columns 3–9 (`CATEGORY`, `FEE`, `DEADLINE`, `STAGE`, `ARTIST`, `OWNER`, `ACTIONS`) are strictly center-aligned across headers and cells. `OPPORTUNITY` is left-aligned.
- **Table Row Data Cells**:
  - **Row Title (`.tk-cell-title`)**: `13.5px` / `600` (Semi-Bold), line-height `1.3`, color `#151e11`. Relaxed from 700 to 600 so row data does not visually overpower section headings and column headers.
  - **Fee (`Free` or `$50`)**: `13px` / `600` (Semi-Bold).
  - **Urgent Deadlines (`< 7 days`)**: `13px` / `600` (Semi-Bold) rendered in `#dc2626`.
  - **Standard Dates & Metadata**: `13px` / `500` (Medium).
  - **Subtitles & Microcopy**: `12px` / `400` - `500` (Regular to Medium) in `#6b7280`.
