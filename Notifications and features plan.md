# Notifications and features plan

## 1. Notification rules

| # | Event | Who gets it | Where | When | Repeats |
|---|---|---|---|---|---|
| 1 | Call closes in 7, 2 or 0 days, and no artist has been sent it | Team | Email digest, bell, Dashboard | 8:00 daily | Each day until it closes or is archived |
| 2 | Call closes in 7, 2 or 0 days, and some artists are not yet sent it | Team | Email digest, bell, Dashboard | 8:00 daily | Each day until it closes or is archived |
| 3 | An artist has not replied 14 days after being sent a call | Team | Email digest, bell | 8:00 daily | Every 7 days after the first alert |
| 4 | An artist replies (Interested, Not Interested, Wants more info) | The person who recorded the call | Bell | Immediately | Once per reply |
| 5 | A reply is changed | The person who recorded the call | Bell | Immediately | Once per change |
| 6 | A call is waiting for approval for more than 2 days | Approvers | Email digest, bell | 8:00 daily | Each day until approved or archived |
| 7 | A call is approved or assigned by someone else | Team | Bell | Immediately, grouped by 10 minutes | Once |
| 8 | A doc is approved and its calls are marked sent | Team | Bell | Immediately | Once |
| 9 | An app error (AI read, email send, sheet write) | Approvers | Email digest, Errors tab | 8:00 daily | Each day while unresolved |
| 10 | Deadline has passed and no outcome is recorded | Team | Dashboard (Expired), email digest | 8:00 daily | Each day until an outcome is set |
| 11 | Access requested | Approvers | Email | Immediately | Once (exists) |
| 12 | Access granted | The new member | Email | Immediately | Once (exists) |

### Delivery rules
- **One alert per event per person per day.** Repeats follow the table, never more often.
- **Immediate in-app, digest by email.** Emails are only sent as the daily digest, except access requests.
- **Every alert links to the item** (call, artist, or the Errors tab).
- **Read state per person.** Opening the bell or the alert marks it read for that person only.
- **Quiet hours.** No emails on Sundays. In-app alerts still appear.
- **Stop rules.** Alerts for a call stop when it's archived or its outcome is set.

### Preferences (Account > Notifications)
- Turn each event on or off, per person.
- Choose email digest on or off, and the time (default 8:00).
- Team-wide events (6, 9, 10) go to approvers by default.

### Storage
- A **Notifications** tab on the sheet: When, For (person), Event, Link, Read (Yes/No). The app writes to it, so the bell and history survive a reload.
- A **Notification settings** tab: Person, Event, On, Email digest.

### What exists today
- **Notifications centre**: Persistent alert bell button (`.tk-bell-btn`) and active badge count on every view header. Clicking opens the deadlines & alert sheet with read state and link navigation.
- **Urgent countdowns**: Automatic calculation and visual highlighting of `< 7 days` remaining deadlines across Dashboard, Open Calls, and Artists tables.
- **Bulk actions**: Multi-select header and row checkboxes on Open Calls table, with bulk actions bar (assign artist, add to doc, mark sent, archive).
- **Reminders automation**: Configurable reminders sheet with dynamic channel form adaptations (In App hides email-only fields; Email/Both displays Subject & Recipients) and team member assignee selector.
- **Periodic reports**: Reports generator supporting Month (EOM), Quarter (EOQ) with `YYYY-QN` picker, Year (EOY), and Custom date ranges with artist breakdowns. Redundant analytics summary block removed.
- **Workspace appearance & settings**: Theme switcher for Device (Auto), Light, and Dark mode with live CSS variable updates. Direct access to Manage Team & People modal.
- **Artist Google Drive integration**: Context bar with direct links to individual artist dossiers or cohort master folder.
- **Fee parsing**: Automatic normalization of JSON fee arrays, values, and free entries.
- Rule 1 & 2: covered by the Deadlines bell sheet and urgent pills.
- Rule 11 & 12: access request and granting emails.

## 2. Features missing across the app

### High value
- **Notifications centre:** bell list, read state, and preferences (section 1).
- **Activity log:** who changed what, when, on each call. The Approvals tab only covers approvals.
- **Bulk actions:** assign one artist to many calls, approve many, archive many, add many to an artist's doc.
- **Undo for delete:** archive has undo, delete does not. Keep deleted calls for 7 days.
- **Send email from the app:** the artist email is written by the app but sent by hand. Send from the team's address and log it.

### Medium value
- **Search everywhere:** quick jump finds titles, but not notes, eligibility or custom field values.
- **Roles:** Approver, Team member, Read only. Right now everyone can do everything.
- **Exports:** CSV of calls and artist status, and a printable doc.
- **Reports:** a monthly summary of calls, replies and outcomes.
- **Settings page:** profile, notifications, form fields and categories are spread across the account menu. One Settings page with sections is clearer.
- **Calendar feed:** an ICS link so the team can subscribe to deadlines.

### Lower value or later
- **Offline drafts:** save a draft with no signal and send it when back online.
- **Duplicate check:** fuzzy matching on title and organiser, not only exact title or link.
- **Source file retention:** choose to keep an important call's files beyond 5 days.
- **Artist-facing view:** explicitly out of scope for now (see the design doc).

## 3. Decisions needed
1. Should emails go out as a digest only, or also immediately for rules 4 and 6?
2. Who are the approvers? Currently info@ and curator@.
3. Should Read only be a role, or is one team level enough?
4. Do you want the activity log before or after bulk actions?
