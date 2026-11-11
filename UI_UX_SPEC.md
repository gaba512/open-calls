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
| `--tk-bg` | `#f4f5f1` | Primary workspace canvas background |
| `--tk-card` | `#ffffff` | Elevated surface cards, panels, and tables |
| `--tk-dark` | `#111827` | Primary text, brand headers, high-emphasis icons |
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
| `--tk-bg` | `#141612` | Canvas background |
| `--tk-card` | `#1c1e18` | Surface cards, panels, and tables |
| `--tk-sunk` | `#252820` | Sunk areas, modals and menus |
| `--tk-subtle` | `#191b15` | Form input and textarea backgrounds |
| `--tk-border` | `#2e3227` | Hairline borders |
| `--tk-dark` | `#f9fafb` | Primary text in dark mode |
| `--tk-muted` | `#9ca3af` | Subtitles, secondary metadata, and column headers |
| `--tk-lime` | `#d2e21a` | Brand emblem, active pills, key action buttons |

These are the values the dark `--tk-*` block in `styles.css` sets with `!important`, so they are what renders. The older obsidian set (`#0e100d`, `#161913`, `#293024`, `#9ea396`) still appears in a few component rules and should be migrated to these tokens.

---

## 3. Typography Scale
- **Display Page Titles**: `32px` / `800` (Extra Bold), line-height `1.2`, letter-spacing `-0.5px`
- **Section Headers (H2 / H3)**: `20px` - `24px` / `700` (Bold)
- **Card Subheaders (H4)**: `16px` - `17.5px` / `700` (Bold)
- **Table Column Headers**: `13.5px` / `700` (Bold), Uppercase, letter-spacing `0.05em`, color `#374151` (light) / `#9ea396` (dark). Single authoritative definition; see §11.
- **Body & Data Grid Text**: `14.5px` / `500` - `600`, line-height `1.5`
- **Microcopy & Metadata**: `12px` - `13px` / `500` (Medium)

---

## 4. Button Hierarchy & Standards
To prevent button duplication and visual clutter, Tikorix strictly enforces a 3-tier button hierarchy:

1. **Primary Actions**:
   - Styling: Solid dark pill (`background: #111827; color: #ffffff; border-radius: 9999px; padding: 8px 22px; font-weight: 700;`)
   - Examples: `Save Changes`, `+ Add Open Call`, `Approve Opportunity`
   - Limit: **At most one** primary action button per screen section.

2. **Secondary / Utility Actions**:
   - Styling: Soft ghost pill (`background: #ffffff; border: 1px solid #dcdfd5; color: #111827; border-radius: 9999px; padding: 7px 16px;`)
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
- **Columns for Open Calls**:
  1. Multi-select Checkbox
  2. `OPPORTUNITY` (Title + Funder)
  3. `CATEGORY` (Grant, Residency, Commission, etc.)
  4. `APPLICATION FEE` (Amount + perks, or "Free")
  5. `DEADLINE` (Date + countdown badge)
  6. `ASSIGNED TO` (Artist assignment pill or "Unassigned")
  7. `ACTIONS` (3-dots popover)
- **Columns for Artists Pipelines** (authoritative; matches the table `app.js` renders):
  1. `OPPORTUNITY` (Title + Funder)
  2. `CATEGORY` (Grant, Residency, Commission, etc.)
  3. `APPLICATION FEE` (Amount / Support)
  4. `DEADLINE` (Date or days left if <7 days)
  5. `STAGE` (Stage status badge)
  6. `ARTIST` (the represented artist)
  7. `ASSIGNED TO` (the team member responsible)
  8. `ACTIONS` (3-dots popover)

---

## 7. 3-Dots Action Menus & Clipping Prevention
- **Z-Index**: Elevated to `z-index: 99999` to float cleanly above table boundaries, sibling accordions, and collapsed sections.
- **Dynamic Upward Drop-Up (`.drop-up`)**: If the vertical distance between the trigger button and the viewport bottom is under `220px`, the dropdown automatically toggles `.drop-up` (`top: auto; bottom: calc(100% + 6px);`).
- **Standard 3-Dots Menu Items**:
  - `Edit details`
  - Assign to profile (opens `openAssignProfileModal`; SVG person icon)
  - View Call Files / Folder (links to artist drive; SVG folder icon)
  - `Send to artist` (only visible if assigned)
  - Approve Opportunity (SVG check icon)
- **Icons**: all interface icons are SVG (stroke, `currentColor`). Emojis are not used for interface icons; they remain allowed only in user-entered content.

---

## 8. Modals, Sheets & Split Pane Preview
1. **Half-Pane Preview (`#tkHalfPane`)**:
   - Opens when an opportunity row is clicked.
   - 50/50 desktop split container (`.tk-split-container`) with smooth transition.
   - Includes top `×` close button, badge metadata, brief summary, external URL pill, assigned artist profile chip, and `Edit Details` action.
2. **Settings Page (`#/settings`)**:
   - Dedicated route accessible from sidebar.
   - Houses 4 core administrative cards: Custom Form Fields, Automated Reminders, Reports & Export, and Team & People.
3. **User Profile Modal (`openProfileMenu`)**:
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


## 11. Table Visual Hierarchy & Column Sizing Specification

To maintain authoritative hierarchy over row data cells (`14.5px`), all table column headers adhere to:
- **Font Size**: `13.5px` (`0.84375rem`)
- **Font Weight**: `700` (Bold)
- **Transform**: `uppercase` with `letter-spacing: 0.05em`
- **Color**: `#374151` (Dark slate gray in Light Mode) / `#9ea396` (Muted sage in Dark Mode)
- **Cell Padding**: `16px 20px` with a crisp `2px solid #e5e7eb` bottom divider
- **Urgent Deadlines**: `< 7 days` rendered in `#dc2626` bold with `"X days left"` format.
