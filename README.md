# Tikorix (Open Calls & Artist Pipeline Management)

A web platform for contemporary art studios, artist representation agencies, and curatorial teams to collect opportunities (grants, residencies, exhibitions), match them to represented artists, track pitches through a five-stage pipeline, and compile automated running packs.

**Canonical Project Root:** `C:\Users\hazel\Documents\Projects\tikorix`  
**Master Docs Index:** [`docs/README.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/README.md)  
**Business Logic & Terms:** [`docs/tikorix-specs/6-Workflow-and-terms.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/docs/tikorix-specs/6-Workflow-and-terms.md)

---

## Architecture Overview

| Layer | Technology | Key Files |
| :--- | :--- | :--- |
| **Frontend** | Static Single Page Application (SPA), zero-build, ES Modules | `frontend/index.html`, `frontend/app.js`, `frontend/styles.css`, `frontend/config.js`, `frontend/js/`, `frontend/css/` |
| **Relay** | Cloudflare Worker (CORS reverse-proxy) | `worker/worker.js` |
| **Backend** | Google Apps Script (18 modular files attached to Google Sheets) | `backend/Main.js`, `backend/Auth.js`, `backend/Config.js`, `backend/Part1_Inbox.js`, `backend/Part2_*.js`, etc. |
| **Database** | Google Sheets & Google Drive | Remote Google Workspace (one central tracking sheet + per-artist dossiers) |
| **Documentation** | Canonical specs, UI/UX audits, decisions, and deploy checklists | `docs/tikorix-specs/`, `docs/ui-ux-audits/`, `docs/README.md` |
| **Testing** | Node.js test harness and 35 automated test suites | `tests/harness/`, `tests/audit-tests/`, `tests/stage1-tests/`, `tests/stage4-rehearsal/` |

---

## Core Views & Hash Routes

- `#/dashboard`: Urgency queues, KPI counters, and deadline alerts.
- `#/inbox`: Open opportunities catalog with status filters, search, bulk actions, and preview pane.
- `#/artists`: Cohort-wide pipeline board in five canonical pitch stages.
- `#/artists/:artistName`: Dedicated view for a single represented artist's pitches.
- `#/new`: Ingestion interface for manual entry or AI-assisted parsing (links, text, files).
- `#/entry/:id`: Opportunity detail pane, fee breakdown, artist matching, and review trail.
- `#/analytics`: Conversion rates, submitted proposals, and placed opportunities breakdown.
- `#/settings`: Form fields customization, email/app reminders, and team permissions.

---

## Local Development & Testing

1. **Run Local Test Server (Node Test Harness):**
   ```powershell
   node "tests\harness\server.js" --sample --dev-login
   ```
2. **Execute Full Test Suite (35 suites, 100% passing):**
   ```powershell
   node "tests\run-all-tests.js"
   ```

---

## Deployment & Production Sync

Refer to [`Deploy checklist.md`](file:///C:/Users/hazel/Documents/Projects/tikorix/Deploy%20checklist.md) for the exact step-by-step procedures to release backend updates to Google Apps Script, frontend updates to GitHub Pages, and relay updates to Cloudflare.
