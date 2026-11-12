// Reminders that chase an outcome. You write the rules: how many days after an artist applied, who gets the email,
// and the message. Rules live on the "Reminders" tab, every email sent is written to "Reminder log", and the
// daily job (sendDueReminders, installed by setupAlerts) sends what is due.
// A rule stops for an artist-call as soon as its outcome is recorded (Accepted, Declined or Not Selected).

const REMINDERS_TAB = 'Reminders', REMINDER_LOG_TAB = 'Reminder log';
const REMINDER_HEADERS = ['ID', 'Active', 'Scope', 'Days after applied', 'Recipients', 'Subject', 'Message', 'Created On', 'Channel', 'Repeat every days'];
const REMINDER_CHANNELS = ['Email', 'In app', 'Both'];
const REMINDER_LOG_HEADERS = ['Sent On', 'Rule ID', 'Call', 'Artist', 'Sent to', 'Result'];
const REMINDER_OUTCOMES = ['Accepted', 'Declined', 'Not Selected'];
const REMINDER_ALL = 'All calls';

// Default rules, created the first time the tab is made. Edit or turn them off as you like.
const REMINDER_DEFAULTS = [
  ['R1', 'Yes', REMINDER_ALL, 7, '{team}', 'Any news on {call}?',
    'Hello,\n\nWe applied to {call} for {artist} on {applied}. Could you let us know the outcome, or when we can expect it?\n\nThank you,\nOpen Calls'],
  ['R2', 'Yes', REMINDER_ALL, 14, '{team}', 'Following up: {call}',
    'Hello,\n\nWe are following up on our application to {call} for {artist}, made on {applied}. Could you share the outcome?\n\nThank you,\nOpen Calls']
];

function remindersTab_() {
  const ss = SpreadsheetApp.getActive();
  let tab = ss.getSheetByName(REMINDERS_TAB);
  if (!tab) {
    tab = ss.insertSheet(REMINDERS_TAB);
    tab.getRange(1, 1, 1, REMINDER_HEADERS.length).setValues([REMINDER_HEADERS]).setFontWeight('bold');
    tab.setFrozenRows(1);
    REMINDER_DEFAULTS.forEach(function (d) { tab.appendRow(d.concat([new Date(), 'Email', 0])); });
  }
  // Tabs made before channels and repeats existed: add the new columns.
  const width = Math.max(tab.getLastColumn(), 1), have = tab.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); });
  REMINDER_HEADERS.forEach(function (h, i) { if (have[i] !== h) tab.getRange(1, i + 1).setValue(h); });
  tab.getRange(1, 1, 1, REMINDER_HEADERS.length).setFontWeight('bold');
  return tab;
}
function reminderLogTab_() {
  const ss = SpreadsheetApp.getActive();
  let tab = ss.getSheetByName(REMINDER_LOG_TAB);
  if (!tab) { tab = ss.insertSheet(REMINDER_LOG_TAB); tab.getRange(1, 1, 1, REMINDER_LOG_HEADERS.length).setValues([REMINDER_LOG_HEADERS]).setFontWeight('bold'); tab.setFrozenRows(1); }
  return tab;
}

// Recipients: emails separated by commas or semicolons. {team} stands for the approvers in the config.
function parseRecipients_(v) {
  return String(v || '').split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean);
}
function resolveRecipients_(list) {
  const out = [];
  list.forEach(function (r) {
    // {team} stands for the approvers set in the config.
    const addresses = r === '{team}' ? (CONFIG.APPROVERS || []) : [r];
    addresses.forEach(function (e) { if (e && out.indexOf(e) === -1) out.push(e); });
  });
  return out;
}
function fillTemplate_(text, vars) {
  return String(text || '').replace(/\{(call|artist|applied|deadline)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
}

// Every rule, as the app shows it.
function reminderRules_() {
  const tab = remindersTab_(), last = tab.getLastRow(), out = [];
  if (last < 2) return out;
  tab.getRange(2, 1, last - 1, REMINDER_HEADERS.length).getValues().forEach(function (r, i) {
    const id = String(r[0] || '').trim(); if (!id) return;
    const channel = REMINDER_CHANNELS.indexOf(String(r[8] || '')) !== -1 ? String(r[8]) : 'Email';
    out.push({ row: i + 2, id: id, active: String(r[1] || 'Yes') === 'Yes', scope: String(r[2] || REMINDER_ALL).trim() || REMINDER_ALL,
      days: Number(r[3]), recipients: String(r[4] || ''), subject: String(r[5] || ''), message: String(r[6] || ''),
      channel: channel, repeat: Number(r[9]) || 0 });
  });
  return out;
}

function reminderLog_(limit) {
  const tab = reminderLogTab_(), last = tab.getLastRow(), out = [];
  if (last < 2) return out;
  tab.getRange(2, 1, last - 1, REMINDER_LOG_HEADERS.length).getValues().forEach(function (r) {
    out.push({ sentOn: r[0] instanceof Date ? Utilities.formatDate(r[0], CONFIG.TIMEZONE, 'd MMM yyyy HH:mm') : String(r[0] || ''),
      rule: String(r[1] || ''), call: String(r[2] || ''), artist: String(r[3] || ''), to: String(r[4] || ''), result: String(r[5] || '') });
  });
  return out.reverse().slice(0, limit || 30);
}

function getReminders() {
  return { ok: true, rules: reminderRules_(), log: reminderLog_(30), scopes: [REMINDER_ALL] };
}

// Adds a rule (no id) or changes one (with id). Validates before writing.
function saveReminder(b) {
  const days = Number(b.days);
  const scope = String(b.scope || REMINDER_ALL).trim() || REMINDER_ALL;
  const subject = String(b.subject || '').trim(), message = String(b.message || '').trim();
  const recipients = parseRecipients_(b.recipients);
  const channel = REMINDER_CHANNELS.indexOf(b.channel) !== -1 ? b.channel : 'Email';
  const repeat = b.repeat === undefined || b.repeat === '' ? 0 : Number(b.repeat);
  if (!(days >= 0 && days <= 365 && Math.floor(days) === days)) return { ok: false, message: 'Days after applied should be a whole number from 0 to 365.' };
  if (!(repeat >= 0 && repeat <= 365 && Math.floor(repeat) === repeat)) return { ok: false, message: 'Repeat every should be a whole number of days from 0 to 365 (0 means send once).' };
  if (channel !== 'In app' && !recipients.length) return { ok: false, message: 'Add at least one recipient, or {team} for the approvers.' };
  const bad = recipients.filter(function (r) { return r !== '{team}' && !validEmail_(r); });
  if (bad.length) return { ok: false, message: bad[0] + ' doesn’t look like an email.' };
  if (!subject) return { ok: false, message: 'Add a subject.' };
  if (!message) return { ok: false, message: 'Add a message.' };
  const tab = remindersTab_();
  const values = [null, 'Yes', scope, days, recipients.join(', '), subject, message, new Date(), channel, repeat];
  if (b.id) {
    const rule = reminderRules_().find(function (x) { return x.id === String(b.id); });
    if (!rule) return { ok: false, message: 'That reminder no longer exists.' };
    tab.getRange(rule.row, 3, 1, 5).setValues([[scope, days, recipients.join(', '), subject, message]]);
    tab.getRange(rule.row, 9, 1, 2).setValues([[channel, repeat]]);
    if (b.active !== undefined) tab.getRange(rule.row, 2).setValue(b.active ? 'Yes' : 'No');
    return { ok: true, message: 'Reminder saved.' };
  }
  const id = 'R' + (new Date().getTime()).toString(36);
  values[0] = id;
  tab.appendRow(values);
  return { ok: true, message: 'Reminder added.' };
}

// Deletes a reminder rule. Its past emails stay in the log.
function deleteReminder(b) {
  const rule = reminderRules_().find(function (x) { return x.id === String(b.id); });
  if (!rule) return { ok: false, message: 'That reminder no longer exists.' };
  remindersTab_().deleteRow(rule.row);
  return { ok: true, message: 'Reminder deleted.' };
}

function setReminderActive(b) {
  const rule = reminderRules_().find(function (x) { return x.id === String(b.id); });
  if (!rule) return { ok: false, message: 'That reminder no longer exists.' };
  remindersTab_().getRange(rule.row, 2).setValue(b.active ? 'Yes' : 'No');
  return { ok: true, message: b.active ? 'Reminder turned on.' : 'Reminder turned off.' };
}

function logReminder_(ruleId, call, artist, to, result) {
  reminderLogTab_().appendRow([new Date(), ruleId, call, artist, to, result]);
}

// In-app reminders sent in the last 30 days, for the bell. The call is linked by its title on the Inbox.
function inAppReminders_() {
  const tab = reminderLogTab_(), last = tab.getLastRow(), out = [];
  if (last < 2) return out;
  const cutoff = Date.now() - 30 * 86400000, inbox = getInbox(), hi = headerIndex(inbox), rows = inbox.getLastRow() >= 2 ? inbox.getRange(2, 1, inbox.getLastRow() - 1, hi.width).getValues() : [];
  tab.getRange(2, 1, last - 1, REMINDER_LOG_HEADERS.length).getValues().forEach(function (r) {
    if (String(r[5]) !== 'In app reminder' || !(r[0] instanceof Date) || r[0].getTime() < cutoff) return;
    const title = String(r[2]), idx = rows.findIndex(function (x) { return String(x[hi.map['title']] || '').trim() === title; });
    out.push({ row: idx >= 0 ? idx + 2 : 0, artist: String(r[3]), title: title, text: 'due for an outcome', when: Utilities.formatDate(r[0], CONFIG.TIMEZONE, 'd MMM') });
  });
  return out.reverse().slice(0, 20);
}

// Keys of everything already logged, so each rule goes out once per artist and call.
function reminderLogKeys_() {
  const tab = reminderLogTab_(), last = tab.getLastRow(), keys = {};
  if (last < 2) return keys;
  tab.getRange(2, 1, last - 1, REMINDER_LOG_HEADERS.length).getValues().forEach(function (r) {
    // The value is when it was last sent, so a repeating reminder knows when it is next due.
  keys[String(r[1]) + '|' + String(r[2]).toLowerCase() + '|' + String(r[3]).toLowerCase()] = r[0] instanceof Date ? r[0] : true;
  });
  return keys;
}

// The daily job: sends every reminder that is due and has not gone out yet.
function sendDueReminders() {
  const rules = reminderRules_().filter(function (r) { return r.active && r.days >= 0; });
  if (!rules.length) return;
  const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow();
  if (last < 2) return;
  const rows = inbox.getRange(2, 1, last - 1, hi.width).getValues();
  const lookup = artistLookup(), logged = reminderLogKeys_();
  const todayMs = (function () { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();

  rows.forEach(function (r) {
    const title = String(r[hi.map['title']] || '').trim(); if (!title) return;
    const link = String(r[hi.map['application link']] || '').trim();
    const contact = String(r[hi.map['organiser email']] || '').trim();
    const deadline = r[hi.map['deadline']];
    const artists = splitNames(r[hi.map['artists']]);
    artists.forEach(function (artist) {
      const sheetLink = lookup[artist.toLowerCase()]; if (!sheetLink) return;
      let target; try { target = openTab(sheetLink); } catch (e) { return; }
      const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return;
      const shi = headerIndex(target);
      const get = function (h) { const i = shi.map[h]; return i === undefined ? '' : target.getRange(dupRow, i + 1).getValue(); };
      // An outcome stops every reminder for this artist and call.
      if (REMINDER_OUTCOMES.indexOf(String(get('status') || '').trim()) !== -1) return;
      const appliedRaw = get('applied on'), appliedOn = appliedRaw instanceof Date ? appliedRaw : (appliedRaw ? new Date(appliedRaw) : null);
      if (!appliedOn || isNaN(appliedOn.getTime())) return;
      const appliedMs = new Date(appliedOn.getFullYear(), appliedOn.getMonth(), appliedOn.getDate()).getTime();
      const daysSince = Math.round((todayMs - appliedMs) / 86400000);

      rules.forEach(function (rule) {
        if (rule.scope !== REMINDER_ALL && rule.scope.toLowerCase() !== title.toLowerCase()) return;
        if (daysSince < rule.days) return;
        const key = rule.id + '|' + title.toLowerCase() + '|' + artist.toLowerCase();
        // Sent once; a repeating rule sends again every "repeat" days until the outcome is set.
        if (logged[key]) {
          const last = logged[key];
          const due = rule.repeat > 0 && last instanceof Date && (Date.now() - last.getTime()) >= rule.repeat * 86400000;
          if (!due) return;
        }
        logged[key] = new Date();
        const vars = { call: title, artist: artist, applied: Utilities.formatDate(appliedOn, CONFIG.TIMEZONE, 'd MMM yyyy'),
          deadline: deadline instanceof Date ? Utilities.formatDate(deadline, CONFIG.TIMEZONE, 'd MMM yyyy') : '' };
        const wantsEmail = rule.channel !== 'In app', wantsApp = rule.channel !== 'Email';
        if (wantsApp) logReminder_(rule.id, title, artist, 'In app', 'In app reminder');
        if (!wantsEmail) return;
        const recipients = resolveRecipients_(parseRecipients_(rule.recipients));
        if (!recipients.length) { logReminder_(rule.id, title, artist, '', 'Not sent: no recipient'); return; }
        try {
          MailApp.sendEmail({ to: recipients.join(','), subject: fillTemplate_(rule.subject, vars), body: fillTemplate_(rule.message, vars) });
          logReminder_(rule.id, title, artist, recipients.join(', '), 'Sent');
        } catch (err) {
          logReminder_(rule.id, title, artist, recipients.join(', '), 'Failed: ' + err.message);
          logProblem('Reminder email', 'error', 'Could not send a reminder: ' + err.message, { title: title, artist: artist });
        }
      });
    });
  });
}
