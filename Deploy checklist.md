# Deploy Checklist: Tikorix Production Releases

**Last Updated:** 13 November 2026  
**Status:** Canonical Deployment Guide

This guide replaces the legacy pre-modular checklist. Tikorix consists of three distinct deployment targets:
1. **Google Apps Script Backend** (`backend/`)
2. **GitHub Pages Frontend** (`frontend/`)
3. **Cloudflare Worker Relay** (`worker/worker.js`)

---

## 1. Google Apps Script Backend Deployment

All backend files live in `backend/` and execute as a Google Apps Script Web App attached to your Google Sheet database.

### Pre-Deployment Verification:
1. Ensure the Apps Script Timezone is set to **`Asia/Kolkata`** (Project Settings).
2. Ensure Script Properties are populated:
   - `GEMINI_API_KEY`: API key from Google AI Studio / Cloud Console (required for AI parsing).
   - `META_APP_ID` & `META_CLIENT_TOKEN`: (Optional) For Instagram preview scraping.
3. Run test triggers from Apps Script editor:
   - Run `setupAlerts` to install the daily 08:00 AM deadline & token-pruning trigger.
   - Run `setupPart2` to verify all sheet columns exist.

### Push Options:
- **Automated (via Clasp):**
  ```bash
  clasp push
  ```
- **Manual (if not using Clasp):**
  In the Google Apps Script editor, copy and paste the contents of all 18 files from `backend/`:
  `AI.js`, `Alerts.js`, `Applications.js`, `Auth.js`, `Calendar.js`, `Categories.js`, `Config.js`, `Documents.js`, `Fields.js`, `Main.js`, `Part1_Inbox.js`, `Part2_Artists.js`, `Part2_Dashboard.js`, `Part2_Docs.js`, `Part2_Lifecycle.js`, `Reminders.js`, `Reports.js`, `Utils.js`.
- **Create New Deployment Version:**
  - Click **Deploy** > **Manage deployments** > **Edit**.
  - Select **New version**, then click **Deploy**.
  - Copy the `/exec` Web App URL.

---

## 2. Cloudflare Worker Relay Deployment

The relay (`worker/worker.js`) proxies frontend requests to Google Apps Script, adding required CORS headers.

1. In `worker/worker.js`, ensure `SCRIPT_URL` matches your deployed Apps Script `/exec` address.
2. Ensure `SITE_ORIGIN` matches your production frontend URL (e.g. `https://gaba512.github.io`).
3. Deploy the worker via the Cloudflare Dashboard or Cloudflare Wrangler CLI.

---

## 3. GitHub Pages Frontend Deployment

All client code lives in `frontend/`.

1. In `frontend/config.js`, verify `window.API_URL` points to your **Cloudflare Worker relay URL** (or Apps Script `/exec` URL).
2. Verify `window.GOOGLE_CLIENT_ID` and `window.ALLOWED_DOMAIN` (`artisteculture.com`).
3. Commit and push the repository to GitHub:
   ```bash
   git add frontend/
   git commit -m "Deploy latest frontend"
   git push origin main
   ```
4. Verify GitHub Pages finishes building.
5. In your browser, perform a hard refresh (`Ctrl + Shift + R`) to test live updates.
