> **ARCHITECTURAL OVERVIEW (Updated 13 Nov 2026).** The production backend is Google Apps Script deployed in `backend/` attached to a Google Sheet; the local Node harness (`tools/harness`) emulates this environment for rapid local testing. The frontend is a static web app located in `frontend/`.

# Tikorix Architecture Specification

## 1. Overview & Philosophy

Tikorix is structured as a resilient, zero-build static single-page application (SPA). It communicates with a backend service (Google Sheets / Cairn backend via local Node harness) over clean JSON API endpoints.

```mermaid
flowchart TD
    User([User Browser]) --> Router[Hash Router #/...]
    Router --> Views[View Manager]
    Views --> V1[#/dashboard - Overview]
    Views --> V2[#/inbox - Open Calls]
    Views --> V3[#/artists - Artist Pipelines]
    Views --> V4[#/analytics - Performance]
    Views --> V5[#/settings - Settings Hub]
    Views --> V6[#/entry/:id - Call Detail]
    Views --> V7[#/new - Add Intake]
    
    Views --> API[API Client Layer api]
    API --> Backend[(Node Harness / Google Sheets API)]
    
    Views --> DriveMap[Google Drive Resolver]
    DriveMap --> GDrive[(Google Drive Folders)]
```

---

## 2. File Organization

```
New folder (2)/
├── frontend/
│   ├── index.html            # Core HTML markup, view templates, modals & SVG icons
│   ├── styles.css            # Design system, CSS variables, dark/light themes, layouts
│   ├── app.js                # Application state, hash router, API calls, event handlers
│   └── config.js             # Client runtime configuration pointing to live relay / local backend
├── backend/
│   ├── Main.js               # Entrypoint & doPost router
│   ├── Auth.js               # Google identity & session validation
│   ├── Config.js             # Server environment variables, Sheet IDs, approvers
│   ├── Part1_Inbox.js        # Opportunity intake, verification, & deduplication
│   ├── Part2_*.js            # Lifecycle, Dashboard, Docs, Artists, Pack engines
│   └── ...                   # Reports, Reminders, Alerts, Categories, Fields, AI
├── UI_UX_SPEC.md             # Comprehensive UI/UX Design System Specification
├── ARCHITECTURE.md           # Technical design, data flow, and interface contracts
└── README.md                 # Project overview, feature guide, and running instructions
```

---

## 3. Data Flow & Routing

### 3.1 Hash Navigation (`onRoute`)
Routes are managed by listening to `window.addEventListener('hashchange', onRoute)`.
- `#/dashboard`: Aggregated focus queue, KPI statistics, and alerts.
- `#/inbox`: Full catalog of open calls, category filters, search input, multi-select bulk actions, and adaptive split-view preview pane.
- `#/artists`: Cohort roster navigation, secondary artist context bar, collapsible stage accordion tables, and Drive dossier links.
- `#/artists/:artistName`: Dedicated sub-route filtering pipeline tables by specific artist (e.g. `#/artists/Harsha`), bidirectionally synchronized with the sidebar dropdown.
- `#/analytics`: Performance metrics, placements won, applications by artist, opportunity type distribution, and deadline-year filter.
- `#/settings`: Administrative settings hub containing cards for Form Fields, Reminders, Reports, and Team & People.
- `#/new`: Intake ingestion card (link scraping / file drop) and manual detail submission form.
- `#/entry/:id`: Comprehensive call breakdown, fee analysis, artist matching, and review trail.

### 3.2 Dynamic Sidebar Navigation
The left sidebar features dynamic sub-navigation for artists:
- `renderSidebarArtists()`: Generates sub-navigation links dynamically from the live artist cohort (`All Artists`, followed by each roster artist).
- `toggleSidebarArtists(e)`: Toggles sub-menu visibility and animates the caret indicator (`⌃` vs `⌄`).
- `onSidebarArtistClick(artistName)`: Handles sub-item selection, updates active state, and synchronizes with the on-page tab selection.

### 3.3 State Management & Global Scope Exposure
Because `app.js` runs as a strictly scoped IIFE to avoid polluting the global window object, functions called directly by inline HTML event attributes (`onclick`, `onchange`) are explicitly bound to `window`:
- `window.openProfileMenu`: Dedicated user profile, appearance switch & sign-out sheet
- `window.openAssignProfileModal`: 3-dots opportunity assignment to artist profile
- `window.showWhoAreYou`: Team & people manager
- `window.openAlerts`: Notifications sheet trigger
- `window.openArtistDrive`: Google Drive folder router
- `window.toggleSelect`: Table row multi-select handler
- `window.toggleSelectAll`: Table header select-all handler
- `window.toggleSidebarArtists`: Sidebar artists accordion collapse/expand handler
- `window.onSidebarArtistClick`: Sidebar artist item selection router
- `window.renderSidebarArtists`: Dynamic sidebar artist list renderer
- `window.openReports`: Reporting modal
- `window.openReminders`: Automated reminder configuration
- `window.openCallHalfPane` / `window.closeHalfPane`: Split-container half-pane preview

---

## 4. Theming System

The app utilizes CSS custom properties with dedicated support for `device` (OS media query `prefers-color-scheme`), `light`, and `dark` modes:

```css
:root, [data-theme="light"] {
  --tk-bg: #f4f5f1;
  --tk-card: #ffffff;
  --tk-dark: #111827;
  --tk-border: #dcdfd5;
  --tk-muted: #6b7280;
  --tk-lime: #d2e21a;
}

:root[data-theme="dark"],
body[data-theme="dark"],
[data-theme="dark"] {
  --tk-bg: #141612 !important;
  --tk-card: #1c1e18 !important;
  --tk-dark: #f9fafb !important;
  --tk-border: #2e3227 !important;
  --tk-muted: #9ca3af !important;
  --tk-lime: #d2e21a !important;
  background-color: #141612 !important;
  color: #f3f4f6 !important;
}
```

Themes are toggled in real time without page reload via `setTheme(themeKey)` which sets `document.documentElement.setAttribute('data-theme', theme)` and `document.body.setAttribute('data-theme', theme)`.

---

## 5. Google Drive Integration

Artist folders and dossiers are mapped via `ARTIST_DRIVE_MAP`:
```javascript
const ARTIST_DRIVE_MAP = {
  'All Artists': 'https://drive.google.com/drive/folders/1AllArtistsCohortMaster',
  'Harsha': 'https://drive.google.com/drive/folders/1HarshaDossiersAndPortfolios',
  'Marita Fernandez': 'https://drive.google.com/drive/folders/1MaritaFernandezStudio',
  'Marita': 'https://drive.google.com/drive/folders/1MaritaFernandezStudio',
  'Savya': 'https://drive.google.com/drive/folders/1SavyaPrintmakingDossier'
};
```
Invoked dynamically via `openArtistDrive(artistName)`.


## 8. Synchronized Data Views & Responsibilities

| Context | Columns / Fields | Assignment Responsibility |
| :--- | :--- | :--- |
| **Open Calls Table** | `CHECKBOX` (44px), `OPPORTUNITY` (30%), `CATEGORY` (11%), `FEE` (8%), `DEADLINE` (11%), `STAGE` (13%), `ARTIST` (13%), `OWNER` (14%), `ACTIONS` (44px) | Multi-select Bar / 3-Dots -> Set Owner |
| **Artists Pipeline Table** | `CHECKBOX` (44px), `OPPORTUNITY` (30%), `CATEGORY` (11%), `FEE` (8%), `DEADLINE` (11%), `STAGE` (13%), `ARTIST` (13%), `OWNER` (14%), `ACTIONS` (44px) | 3-Dots -> Set Owner & Pitch Moves |
| **Open Calls Split Preview** | Adaptive reduction: `CATEGORY`, `FEE`, `OWNER` hidden; `OPPORTUNITY` (36%), `DEADLINE` (18%), `STAGE` (22%), `ARTIST` (22%), `ACTIONS` (40px) | Preview Card -> Direct Edit & Verification |
| **Full Entry Edit View** | Full opportunity editor: title, funder, fee, deadline, category, guidelines, location, dossier links | Review Trail -> Verify, Match, Set Owner |

### 8.1 Table Formatting & Alignment Rules
1. **Colgroup Enforcement**: Explicit `<colgroup>` tags and styling enforce mathematical alignment across separate accordion stages.
2. **Metadata Center-Alignment**: Columns 3 through 9 (`CATEGORY`, `FEE`, `DEADLINE`, `STAGE`, `ARTIST`, `OWNER`, `ACTIONS`) are strictly center-aligned across headers and cells. `OPPORTUNITY` remains left-aligned.
3. **Single-Line Fee Formatting**: Fees display concisely as `Free` or `$50` with relaxed semi-bold weight (`13px / 600`).
4. **Stage-Colored Count Pills**: Accordion header pills inherit stage status dot tones (`.dot-amber`, `.dot-green`, `.dot-blue`, `.dot-purple`, `.dot-gray`) with high-contrast white text.
