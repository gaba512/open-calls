# Tikorix (Open Calls)

A web app for an art studio's team to collect open calls (grants, residencies, exhibitions), decide which to pursue, assign them to represented artists, and follow each artist's application to an outcome.

Project documents (status, change log, audit, decisions) are in `C:\Users\hazel\Documents\Claude\Tikorix-docs`. Start with `0-START-HERE.md`.

## How it is built

| Part | What it is | Files |
|---|---|---|
| Website | A single page, no build step, hosted on GitHub Pages | `index.html`, `app.js`, `styles.css`, plus a small `config.js` holding the server address (not in this folder: see the foundations document) |
| Server | Google Apps Script attached to a Google Sheet. One address receives every request. | `Main.js` (request router), `Auth.js`, `Config.js`, `Utils.js`, `Part1_Inbox.js`, `Part2_*.js`, `Applications.js`, `Reports.js`, `Reminders.js`, `Alerts.js`, `AI.js`, `Calendar.js`, `Documents.js`, `Fields.js`, `Categories.js` |
| Data | Google Sheets: one main workbook, plus one spreadsheet per artist. Uploaded files and documents in Google Drive. | Not in this folder |
| Design rules | Colours, buttons, tables, breakpoints | `UI_UX_SPEC.md` |

The website sends a small message naming an action (for example `getInbox`) and a sign-in token; the server checks the token, does the work, and replies.

## Screens

| Address | Screen |
|---|---|
| `#/dashboard` | Overview: what needs attention |
| `#/inbox`, `#/drafts`, `#/archive` | Open Calls list. Click a row for the side panel; "Handed off" calls are grouped below. |
| `#/new`, `#/add` | Add an open call (paste a link or files; the AI reads it) |
| `#/entry/<row>` | One open call, with the Details, Approve, Send trail |
| `#/artists` | Artist pipelines in five stages |
| `#/artist/<name>` | One artist's calls |
| `#/artist-call/<name>/<row>` | One artist's application for one call |
| `#/doc-review/<name>` | Review an artist's document before sending |
| `#/settings` | Form fields, reminders, reports, team |

Analytics exists in the code but is hidden until it shows real figures.

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

30 files. There are no automated tests of the screens themselves yet; those are checked by hand in a browser.

## Deploying

Not documented yet. `Deploy checklist.md` is out of date and must not be followed as written. Before any deployment: run the rehearsal (`Documents\Claude\stage4-rehearsal`) on the exact files, and take a copy of the workbook.

## Old files in this folder

`*.v1.*`, `*.v2-fast.*`, `*.bak`, `index.pre-redesign-backup.html` and `backup-20261106-0049\` are earlier copies, kept for reference and not used. `AGENTS.md`, `map.*`, `cairn.*` and `meta\` belong to a third-party tool.
