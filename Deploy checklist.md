> **OUT OF DATE (noted 11 Nov 2026). Do not follow this as written.** It predates `app.js` and `styles.css` being separate files and leaves out several server files. A current deployment guide has not been written yet.

# Deploy checklist: applications, reminders, documents and reports

Work through these in order. Everything is in the Downloads folder.

## 1. Add these new files to the Apps Script project
In the Apps Script editor, click + next to Files, choose Script, and paste the whole contents of each file. Give each file the same name.

- `Applications.js`
- `Reminders.js`
- `Documents.js`
- `Reports.js`

## 2. Replace these existing files
Copy the full contents over the old version of each file.

- `Config.js`
- `Fields.js`
- `Alerts.js`
- `Main.js`
- `Part1_Inbox.js`
- `Part2_Lifecycle.js`
- `Part2_Dashboard.js`

Do not change the files you didn't list here.

## 3. Save and check for errors
- Save the project.
- Run any function (for example `setupAlerts`) and check that it doesn't show a syntax error. If it does, the file it names is the one to re-paste.

## 4. Install the daily trigger
- In the function picker, choose `setupAlerts` and click Run.
- Approve the permissions if asked.
- Check the log says "Deadline alerts and reminders set: every day at 08:00 Asia/Kolkata".

## 5. Publish the web app
- Deploy > Manage deployments > edit the current deployment > New version > Deploy.
- The app's web address stays the same, so you don't need to change `index.html`.

## 6. Upload the new index.html
- Upload `index.html` to the GitHub Pages site (https://gaba512.github.io/open-calls/), as you do for every change.
- Hard-refresh the page (Ctrl+Shift+R) so the browser doesn't use the old copy.

## 7. Check it works
- Open a call and set a **Contact email** and an **Other fees** row. Save. Reopen it and check both are still there.
- Approve the call and assign an artist. On the artist's screen, check **Payments** has one row per fee, all unpaid.
- Tick a payment as paid, add some artwork names and an assigned name, and save. Reload and check the **Paid** summary shows "1 of 2 paid".
- Open **Reminders** from the avatar menu. You should see two default rules (7 and 14 days). Add a test rule to yourself and turn it off again.
- Open **Reports** from the avatar menu. Choose this month and check the table loads. Then try **Save as a sheet tab**.
- On an artist's screen, open **Open folders**. Check two Drive folders appear under "Open Calls".

## 8. New sheet columns
The app adds these on first use, so you don't need to make them by hand:
- Inbox: `Organiser Email`, `Fees`, `Required Docs`
- Artist sheets: `Assigned To`, `Due On`, `Artworks`, `Payments`, `Docs Checklist`, `Application Folder`
- New tabs: `Reminders`, `Reminder log`, and one `Report …` tab each time you save a report.

## Things to know
- Reminders only go out in the daily 08:00 run. To test without waiting, run `sendDueReminders` by hand.
- The old `Paid` dropdown on artist applications has been replaced by the per-payment list. Old values still show as text.
- If something fails, check the **Errors** tab on the sheet.
