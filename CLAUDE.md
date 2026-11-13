# Tikorix Project Guidelines for Claude & Antigravity

**Project Canonical Location:** `C:\Users\hazel\Documents\Projects\tikorix`  
**Last Updated:** 13 November 2026

To any agent (Claude Code, Antigravity, or other assistants) working on this repository:

1. **Single Source of Truth:**
   * All active development occurs in `C:\Users\hazel\Documents\Projects\tikorix`.
   * Do NOT recreate loose files in `Documents\Claude` or `%USERPROFILE%\.gemini\antigravity\scratch`.
   * The directory junction at `C:\Users\hazel\Downloads\New folder (2)` points directly to this project for backward-compatibility with testing tools.

2. **Repository Architecture:**
   * `backend/`: 18 Google Apps Script files deployed via Clasp to Google Apps Script.
   * `frontend/`: Single-page client web app (`index.html`, `app.js`, `styles.css`, `frontend/js/`, `frontend/css/`) hosted on GitHub Pages.
   * `worker/`: Cloudflare Worker CORS relay (`worker.js`).
   * `docs/`: Master documentation. Canonical terminology and rules are strictly defined in `docs/tikorix-specs/6-Workflow-and-terms.md`.
   * `tests/`: Automated test suites and rehearsal kits (`stage4-rehearsal/`).
   * `_archive/`: Historical stage snapshots.

3. **Tooling Paths:**
   * Node: `C:\Users\hazel\Documents\Claude\tools\node`
   * Git: `C:\Users\hazel\Documents\Claude\tools\git\cmd\git.exe`
