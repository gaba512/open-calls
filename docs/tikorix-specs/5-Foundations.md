> **UPDATE 13 Nov 2026.** Section 1 (Git repository) and Section 2 (`config.js` clash resolved via `frontend/` and `backend/` folder separation) are done and verified. Sections 3 and 4 remain for production deployment.

# Tikorix: Stage 0 foundations (research and recommendations)

Nothing in this document has been carried out. Each section ends with what needs your approval.

## 1. Version control (Git)

**Why it matters.** Today the only history is renamed copies and dated backup folders. Git records every change with a date and a note, shows exactly what differs between two versions, and lets any change be undone.

**What I found.** Git is not installed on this computer. `winget` (the Windows package installer) is not available in this shell, so there is no one-line install.

| Option | What it is | Needs admin rights | Notes |
|---|---|---|---|
| **A. Portable Git (recommended)** | A self-contained folder from the official Git for Windows project (git-scm.com), unpacked into `Documents\Claude\tools\git` | No | Same approach already used for Node in `tools\node`. Nothing is added to Windows; delete the folder to remove it. Only this project uses it. |
| B. Git for Windows installer | The standard installer from git-scm.com | Usually yes | Adds Git system-wide, plus right-click menu entries. Best if you will use Git for other projects. |
| C. GitHub Desktop | A point-and-click app that includes its own Git | No | Easiest to use by hand. I cannot drive it from here as easily as a command-line Git. |

**Recommended set-up once Git exists**
1. Create the repository in the working folder (`...\New folder (2)\from-Downloads`). This adds a hidden `.git` folder and changes no project file.
2. Add a `.gitignore` that leaves out the old copies (`*.v1.*`, `*.v2-fast.*`, `*.bak`, `index.pre-redesign-backup.html`) and the `.cairn` tool files. They stay on disk, untracked.
3. First commit: the original files from `backups\audit-20261111-pre-fixes`, so history starts at the true starting point. Second commit: today's state. The change log entries become the commit notes.
4. Keep the repository **local only** at first. `Config.js` holds the sign-in client ID, calendar ID, approver addresses and artist sheet IDs. These must not go to a public GitHub repository. A private remote can be added later.

**Needs your approval:** which option (A, B or C), and permission to download it. State the file name, source and size before downloading is part of my rules, so I will show those first.

## 2. `config.js` and `Config.js` (RESOLVED)

> **Resolved on 12 November 2026:** The repository was organized into `backend/` (Apps Script files, including `Config.js`) and `frontend/` (website files, including `config.js`). The Windows case-insensitivity conflict is permanently resolved, and all 35 test suites pass.

**The problem in plain English.** The website loads a small settings file called `config.js` (it holds three values: the server address, the sign-in client ID and the allowed domain). The server code has its own settings file called `Config.js`. Windows treats those two names as the same file, so this folder can only hold one of them. It currently holds the server one. If this folder were uploaded to the website as it is, the site would receive the server's settings instead of its own and would show "The app isn't set up yet".

The website's real `config.js` exists only in the older copy at `scratch\open-calls\frontend\config.js`, and on the live site.

| Option | Change | Risk to the live site | Risk to the live server |
|---|---|---|---|
| **A. Rename the server file locally to `Settings.js` (recommended)** | One local file renamed; the test tools' file list updated | None. The site keeps loading `config.js` exactly as now. | None. Apps Script does not care what a file is called: every file shares one space, so `Config.gs` in the live project can keep its name or be renamed at the next deploy with no change in behaviour. |
| B. Rename the website file to `site-config.js` | `index.html` changed to load the new name | **Yes.** `index.html` and the new file must be uploaded together. If only one is uploaded, the site stops working. | None |
| C. Split the folder into `backend\` and `site\` | Every file moves | None in itself | None, but the test tools and the deploy checklist all need rewriting. This is the restructuring you asked me not to start. |

**Why A is safest.** The only thing that can break for real users is the public website, and option A does not touch it. After the rename, the website's `config.js` can sit in the working folder beside `index.html`, so the folder finally matches what is uploaded.

**Work involved in A (not done):** rename one file; update `tools\harness\gas-env.js` (file list), four test files that name `Config.js`, the hash manifest in `stage4-rehearsal`, and the deploy checklist; copy the website's `config.js` in from the older copy and confirm its three values against the live site; run all tests.

**Needs your approval:** option A, B or C.

## 3. Getting `appsscript.json` from the live project

**What it is.** A small settings file inside the Apps Script project. It lists the Google permissions the app asks for, the time zone, the runtime, and who may use the web app. It exists only in the live project today, so the permissions cannot be reviewed or rebuilt from the local files.

**How to retrieve it (viewing only; nothing about how the app runs changes)**
1. Open the live workbook, then **Extensions > Apps Script**.
2. In the left bar click the gear icon, **Project Settings**.
3. Tick **Show "appsscript.json" manifest file in editor**. This only makes the file visible.
4. Click the **Editor** icon (`< >`). `appsscript.json` now appears in the file list.
5. Open it, select all, copy.
6. Paste into a new file named `appsscript.json` in the working folder, or paste it to me and I will save it. Do not edit it in the editor.
7. Optional: untick the box again in Project Settings.

**What I will check once it is local:** that the permission list contains only what the code uses (Sheets, Drive, Calendar, sending mail, external requests, script properties), that the web app is set to run as you and be reachable by the intended audience, and that the time zone matches `Asia/Kolkata`.

**Note.** A manifest already exists at `stage4-rehearsal\rehearsal-project\appsscript.json`, but that is the rehearsal project's own (it includes settings added for the rehearsal). It is not a substitute for the live one.

**Needs you:** steps 1 to 6. I cannot and should not open the live project.

## 4. Workbook backup and restore

**What needs backing up.** The app's data is not one file:
- the main workbook (open calls, team, people, reminders, the ArtistCalls index, errors);
- **one separate spreadsheet per artist** (their applications), linked from the Artists tab;
- Drive folders (uploaded source files, artist documents, saved reports);
- a few values stored inside the Apps Script project (the AI key, folder IDs, sign-in sessions). Sessions do not need backing up. The AI key should be recorded in your password manager.

### Proposed routine

| When | What | Where | Keep |
|---|---|---|---|
| **Before every deployment** (mandatory) | "File > Make a copy" of the main workbook and of each artist sheet | A Drive folder named `Tikorix backups`, in a dated subfolder such as `2026-11-12 before deploy` | The last 5 |
| **Weekly** (Monday) | The same copies | `Tikorix backups\weekly\<date>` | 8 weeks |
| **Monthly** (first Monday) | The same copies, plus "File > Download > Microsoft Excel" of each, saved off Google | `Tikorix backups\monthly\<date>`, and the downloads on a computer or other storage outside Google Drive | 12 months |
| **Before any bulk change** (a repair or backfill tool) | "File > Version history > Name current version" | Inside the workbook itself | Indefinitely |

The backup folder should be owned by a shared company account (for example the `info@` account), not one person, and shared view-only with the team.

**Why copies and not just version history.** Version history is the fastest way back from a small mistake, but it lives inside the same file. If the file is deleted or the account is lost, the history goes with it. Copies in a separate folder, plus a monthly download outside Google, cover those cases.

### How restoring works

| Situation | Method | Effect |
|---|---|---|
| A few rows wrong, or a bad edit in the last days | Workbook: **File > Version history > See version history**, pick the version, **Restore this version** | Restores the whole workbook in place. The app keeps working because the file is the same file. Any changes made after that version are lost, so note the time first. |
| One tab damaged | Open the backup copy, right-click the tab, **Copy to > Existing spreadsheet**, choose the live workbook. Rename the damaged tab (do not delete yet), then rename the copied tab to the original name. | Only that tab is replaced. |
| One artist's sheet damaged | Same as above, inside that artist's spreadsheet | The link in the Artists tab stays valid. |
| The live workbook is deleted or unrecoverable | Restore it from Drive's bin first (30 days). If that fails: copy the backup, then the server code must be re-attached and re-deployed to the new file, and the website's `config.js` pointed at the new address. | This is the slow path and is the reason to restore **into** the live workbook wherever possible: a copy is a different file with a different server address. |

**Rule for every restore:** stop the team using the app first, take a fresh copy of the current (damaged) state before changing anything, restore, then check the Open Calls list, one artist's page and the Errors tab before telling the team to carry on.

**Restore drill.** Practise once in the rehearsal account before relying on this: take a copy, damage a tab on purpose, restore it by each method, and time it.

### Later, with your approval (not proposed for now)
A scheduled server function could make the weekly copies automatically and delete old ones. It needs no new Google permission (the app already uses Drive), but it is a change to the live Apps Script project and creates files in your Drive every week, so it should go through rehearsal first.

**Needs your approval:** the folder location and owner, the frequencies, and who does the weekly copy until it is automated.
