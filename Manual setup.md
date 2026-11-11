# Manual setup: what you need to do

The code is finished. These steps need your Google account, your GitHub Pages site, or a decision only you can make. Work through them in order. The file-by-file upload is in [Deploy checklist.md](C:\Users\hazel\Downloads\Deploy%20checklist.md).

## 1. Apps Script project

1. **Upload every file.** Add the new files (`Applications.js`, `Reminders.js`, `Documents.js`, `Reports.js`) and replace the changed ones listed in the deploy checklist. Save.
2. **Check the project timezone.** Project Settings → Time zone → **Asia/Kolkata**. The daily reminder and alert times depend on it.
3. **Set the script properties.** Project Settings → Script properties:

   | Property | Needed for | Required? |
   |---|---|---|
   | `GEMINI_API_KEY` | Reading calls from pasted text, images and links | Yes, for AI reading |
   | `META_APP_ID` and `META_CLIENT_TOKEN` | Reading Instagram posts | Only if you want Instagram reading |

   The Gemini key must belong to a project with billing enabled, or Google will refuse the requests.
4. **Run `setupAlerts`** once from the function picker. It installs the 08:00 daily triggers for deadline alerts and reminders. Check the log says so.
5. **Run `setupPart2`** once if you haven't since the last update. It makes sure the sheet columns are in place.
6. **Authorise again.** The new features use Drive, Docs, Sheets, Gmail and Calendar. Run any function from the editor and approve each permission Google asks for. Use the team account you want the app to send mail and create files as.
7. **Redeploy the web app.** Deploy → Manage deployments → edit → New version → Deploy. The web address stays the same.

## 2. Google sign-in

- In Google Cloud Console, open the OAuth client `403289948637-…`.
- Check **Authorised JavaScript origins** includes `https://gaba512.github.io`.
- Check the domain is still `artisteculture.com`, which is set in `Config.js`.

## 3. GitHub Pages

- Upload `site/index.html` and `site/config.js` to the `open-calls` repository. Edit `config.js` first and paste your web app address (ending in `/exec`) in place of `PASTE_WEB_APP_URL_ENDING_IN_/exec`.
- Wait for the Pages build to finish, then hard-refresh (Ctrl+Shift+R) so the browser doesn't keep the old copy.

## 4. Your team and the data

- **Approvers:** the reminders' `{team}` and the deadline emails go to `info@` and `curator@` (set in `Config.js`). Change them there if the list is different.
- **People:** add everyone who will apply for calls under **Manage people**. "Assigned to" only accepts names on that list.
- **Artists:** each artist needs a row on the Artists tab with a link to their sheet, or their calls can't be found.
- **Sharing Drive:** the `Open Calls` folder in Drive belongs to the account that runs the script. Team members can't see it until you share it with them. Share `Open Calls` (Editor for the team, Viewer if they only need to read).
- **Google Docs for artists:** these are created in the same Drive. Share the artist docs the same way if the team needs them.

## 5. Things to review before going live

- **Test data:** delete any rows named "SAMPLE:" or "Contract Probe" and any test artists. The sample data was only in the test harness, not your sheet, but check your real sheet anyway.
- **Legacy columns:** you can remove the unused old Inbox columns (listed in the earlier notes). Back up the workbook first.
- **Reminder defaults:** the two default reminders (7 and 14 days, send once) go to the approvers. Review them under Reminders.
- **Mail quota:** Google limits how many emails a Gmail account can send each day. The daily digest and reminders count toward it.
- **Errors tab:** check it after the first few days. Problems the app can't handle are written there.

## 6. Quick test once everything is in

- Open the app on a phone and on a computer. Sign in with a team account.
- Save a call with a fee and a required document. Approve it, assign a person, and check the Drive folders appear.
- Send yourself a test reminder from **Reminders** with channel "Email", then check the reminder log and your inbox.
- Open **Dashboard** and check each tab shows real numbers.

## Decisions only you can make

- Whether reminders should repeat by default (currently: send once).
- Whether the approvers list should be `info@` and `curator@` or someone else.
- Whether team members should get edit access to the Drive folders or only view them.
