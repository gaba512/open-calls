# Tikorix (Open Calls)

A web app for an art studio's team to collect open calls (grants, residencies, exhibitions), decide which to pursue, assign them to represented artists, and follow each artist's application to an outcome.

Project documents (status, change log, audit, decisions) are in `C:\Users\hazel\Documents\Claude\Tikorix-docs`. Start with `0-START-HERE.md`.

## How it is built

| Part | What it is | Files |
|---|---|---|
| Website | A single page, no build step, hosted on GitHub Pages | `frontend/index.html`, `frontend/app.js`, `frontend/styles.css`, `frontend/config.js` |
| Server | Google Apps Script attached to a Google Sheet. One address receives every request. | `backend/Main.js` (request router), `backend/Auth.js`, `backend/Config.js`, `backend/Utils.js`, `backend/Part1_Inbox.js`, `backend/Part2_*.js`, `backend/Applications.js`, `backend/Reports.js`, `backend/Reminders.js`, `backend/Alerts.js`, `backend/AI.js`, `backend/Calendar.js`, `backend/Documents.js`, `backend/Fields.js`, `backend/Categories.js` |
| Data | Google Sheets: one main workbook, plus one spreadsheet per artist. Uploaded files and documents in Google Drive. | Remote Google Workspace |
| Design rules | Colours, buttons, typography scale, colgroup tables, breakpoints | `UI_UX_SPEC.md` |

The website sends a small message naming an action (for example `getInbox`) and a sign-in token; the server checks the token, does the work, and replies.

## Screens

| Address | Screen |
|---|---|
| `#/dashboard` | Overview: what needs attention |
| `#/inbox`, `#/drafts`, `#/archive` | Open Calls list. Click a row for the adaptive split-view preview; bulk actions bar for selected rows. |
| `#/new`, `#/add` | Add an open call (paste a link or files; the AI reads it) |
| `#/entry/<row>` | One open call, with the Verify, Match, Set Owner review trail |
| `#/artists` | Artist pipelines in five stages, with dynamic sidebar artist dropdown |
| `#/artists/<name>` | One artist's calls (bidirectionally synced with sidebar sub-menu) |
| `#/artist-call/<name>/<row>` | One artist's application for one call |
| `#/doc-review/<name>` | Review an artist's document before sending |
| `#/analytics` | Performance metrics, placements won, applications by artist, and opportunity breakdown |
| `#/settings` | Form fields, reminders, reports, team |

Analytics is fully active and computes real placement figures, win rates, and submission tallies directly from live pitch records.

## Signing in

Google sign-in, limited to the studio's Google Workspace domain. A new person waits for an approver. There is one level of access: approved team member.

## Running it on this computer

The local test server runs the real server code against a pretend Google, with sample data. It listens on this computer only and never contacts the live workbook.

```bash
node "C:\Users\hazel\Documents\Claude\tools\harness\server.js" --sample --dev-login
```

Run it from `C:\Users\hazel\Downloads\New folder (2)`. It prints a one-time sign-in link.

## Tests

```bash
node "C:\Users\hazel\Documents\Claude\tools\run-all-tests.js"
```

35 test suites (100% passing). In addition, visual regression and UI behavior are verified directly in browser sessions.

## Deploying

Not documented yet. `Deploy checklist.md` is out of date and must not be followed as written. Before any deployment: run the rehearsal (`Documents\Claude\stage4-rehearsal`) on the exact files, and take a copy of the workbook.

## Repository Cleanliness

The repository has been pruned and organized into clean `frontend/` and `backend/` structures. Over 45,000 lines of obsolete files (`*.v1.*`, `*.v2-fast.*`, `*.bak`, `cairn.*`, `backup-20261106-0049/`, `meta/`, `map.*`, `AGENTS.md`) were permanently removed.
