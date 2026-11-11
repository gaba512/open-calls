# Tikorix — Open Calls & Artist Pipeline Management

Tikorix is a high-performance web platform designed for contemporary art studios, artist representation agencies, and curatorial teams to track, evaluate, pitch, and submit open calls, grants, residencies, and exhibition opportunities across a roster of represented artists.

---

## 🌟 Core Features

### 1. Unified Dashboard (`#/dashboard`)
- **Focus Queue**: Live table of priority opportunities with urgent countdown indicators (`< 7 days` highlighted in red).
- **Status Cards**: Immediate metrics for closing calls, pending artist replies, and approved proposals.
- **Persistent Header**: Workspace title, live date indicator (`4 November 2026`), and alert bell with active notification badge on every view.

### 2. Curated Open Calls (`#/inbox`)
- **Interactive Split View & Viewable Half-Pane**: Clicking any call title reveals an elegant right-hand viewable form taking half the viewport. The viewable pane features an `×` close button, curatorial theme guidelines, 2x2 logistics card, eligibility criteria, official URL link, assigned artist cards, and an immediate **Edit Details** action.
- **Application Fee & Assigned To Columns**: Standardized headers for **APPLICATION FEE** and **ASSIGNED TO**, presenting grants, stipends, and artist assignments clearly.
- **Multi-Select & Bulk Actions**: Select-all header checkbox, row checkboxes, and a bulk action bar for assignment, doc generation, or archiving.
- **Contextual 3-Dots Action Menu**:
  - `Edit details`
  - `👤 Assign to profile` (opens quick artist selector modal)
  - `Send to artist` (conditionally displayed when assigned to an artist)
  - `View artist profile`
- **Clipping-Free Drop-Up Menus**: Dynamic upward positioning (`.drop-up`) prevents menu cutoff near the bottom of tables or next to collapsed accordions.

### 3. Redesigned Open Call Form (`#/entry/:id` & `#/new`)
- **Modern Input Controls**: Standardized 12px rounded input controls replacing capsule/pill shapes for clean data entry.
- **Directly Editable Fields**: Immediate interactive text editing across title, URL, categories, dates, and logistics.
- **Curatorial Theme Field**: Dedicated `Theme / Curatorial Focus` question for curatorial briefs and conceptual frameworks.
- **Streamlined Button Hierarchy**: Standardized top-bar navigation (`Back to Open Calls`, status badge, `Cancel`, `Save Changes`), eliminating duplicate bottom actions and redundant back buttons.
- **Consolidated Artist Assignment**: Single dedicated artist assignment section without duplicate controls.

### 4. Artist Pipelines (`#/artists`)
- **Cohort Navigation**: "All Artists" default view alongside individual artist tabs (*Marita Fernandez*, *Harsha*, *Savya*).
- **Secondary Context Bar**: Displays artist disciplines, location, active calls count, and direct links to Google Drive dossiers (`View Dossier & Files`) and profile settings (`Manage Profile`).
- **Dynamic Google Drive Integration**:
  - `All Artists` &rarr; Cohort Master Drive Folder
  - `Harsha` &rarr; Harsha's Dossiers & Portfolios Folder
  - `Marita Fernandez` &rarr; Marita's Studio & Submissions Folder
  - `Savya` &rarr; Savya's Printmaking Dossier Folder
- **Pipeline Stage Tables**: Columns organized into `OPPORTUNITY`, `APPLICATION FEE`, `DEADLINE`, `STAGE`, `ASSIGNED TO`, and `ACTIONS`. Deadlines within 7 days dynamically convert to bold countdown pills (`X days left`). Call files, dossiers, and profile assignments are directly accessible from the 3-dots action menu.

### 5. Dedicated Settings Page (`#/settings`)
Accessible via the sidebar navigation, providing dedicated cards for:
1. **Custom Form Fields**: Configure intake metadata, curatorial tags, and sync definitions.
2. **Reminders & Autopilot**: Configure automated chase rules, deadline alerts, and recipient assignments.
3. **Reports & Export**: Monthly, quarterly (`YYYY-QN`), annual, or custom date reports with export actions.
4. **Team & People**: Manage collaborators, assign reviewers, and edit workspace member permissions.

### 6. User Profile & Appearance Modal
Triggered from the bottom-left sidebar avatar:
- Displays user identity (*Hazel F.*, `hazel@artisteculture.com`), role (*Curatorial Lead · Workspace Owner*), and workspace details.
- Appearance switcher supporting **Device**, **Light**, and **Dark** themes with full palette token propagation.
- Brand-consistent pill-shaped **Sign out** button matching the Tikorix design language.

---

## 🛠️ Architecture & Tech Stack

- **Zero-Build Static Architecture**: Built on pure semantic HTML5, modern CSS custom properties, and modular ES6 JavaScript without compilation or bundle overhead.
- **Single Page Application (SPA)**: Hash-based routing (`#/dashboard`, `#/inbox`, `#/artists`, `#/analytics`, `#/settings`, `#/new`, `#/entry/:id`).
- **Design System Spec**: Documented in [`UI_UX_SPEC.md`](UI_UX_SPEC.md).
- **Backend API**: Powered by a lightweight Node.js harness connecting to Google Sheets / Cairn database contracts (`p2_getArtists`, `getReport`, `getReminders`, `p2_getPeople`, etc.).

---

## 🚀 Getting Started

### Running the App
1. Start the local server harness:
   ```powershell
   node tools/harness/server.js --sample
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:8787/index.html#/dashboard
   ```

---

## 🧪 Verification & Quality Assurance

- **Functional Test Suite**: Selenium automated test suite validating routes, modals, tables, and workflows.
- **WCAG AA Accessibility**: 0 Axe Core violations across all screens.

### Release v4.0 (November 2026)
- **Dual Profile Columns**: Tables and Assignment modal split into two clear columns: Column 1 for Artists (cohort representation) and Column 2 for Users (workspace curators).
- **Top Bar Alignment**: Back button, Date Pill, and Notification Bell aligned on a single horizontal row across all pages; orphaned floating back button removed.
- **Clean Dropdowns**: 3-dots menus upgraded to clean SVGs (no raw emojis), `user-select: none`, and conditional "Send to artist" logic.
- **Artists Cohort Bar**: Redundant overview text removed; "+ Add Artist" modal integrated with Google Drive folder link input; table columns updated to Application Fee, Deadline, Stage, and Assigned To.
- **Modern Dark Palette**: High-contrast obsidian/zinc palette (`#0e100d`, `#161913`, `#293024`, `#f4f5f0`, `#d2e21a`).
- **Team & People Modal**: Completely redesigned with Tikorix card layout, avatars, role tags, and active status indicators.
- **Overview Alignment**: Standardized to full responsive width matching Open Calls and Artists tables.


### Recent Refinements & Synchronized Data Architecture (v4.2)
- **Unified Inline Toolbar**: Search input, Categories dropdown, All Artists selector, and Closing Soon alert pill are now locked into the exact same horizontal baseline without wrapping.
- **Synchronized 8-Column Data Tables**: Open Calls and Artists tables share identical column ordering: `OPPORTUNITY`, `CATEGORY`, `APPLICATION FEE`, `DEADLINE`, `STAGE`, `ARTIST`, `ASSIGNED TO`, `ACTIONS`.
- **Synchronized Deadline Formatting**: Open calls and pipeline stages use unified deadline countdowns (< 7 days displays in bold red `X days left`; >= 7 days displays formatted date and day count e.g. `14 Nov (10 days)`).
- **Separated Assignment Responsibility**:
  - **User Profiles** (Curators & Team Members) are assigned via the 3-dots row menu.
  - **Represented Artists** are assigned exclusively inside the Open Call forms (Half-Pane and full entry view).
- **Global Navigation Bar Alignment**:
  - Global nav bar renders `< Back` on the far left and Date (`4 November 2026`) + Notification Bell on the far right.
  - Overview page suppresses the back button and aligns Date and Bell inline with "Good morning, Hazel".
- **WCAG AA Compliance**: 100% passing across all pages (Dashboard, Open Calls, Artists, Analytics) with 0 violations.
