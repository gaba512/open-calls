// Deadline alerts. Shared by the daily email, the Dashboard "Deadlines" section and the bell.
// Run setupAlerts() once from the Apps Script editor to install the daily email trigger.
// Run sendDeadlineAlerts() by hand to test (it only emails when there is something to say).

const ALERT_DAYS = [7, 2, 0];          // calls whose deadline is this many days away (0 = today)
const NO_REPLY_DAYS = 14;              // flag an artist who hasn't replied this many days after being sent the call
const ALERT_RECIPIENTS = CONFIG.APPROVERS;

function setupAlerts() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDeadlineAlerts' || t.getHandlerFunction() === 'sendDueReminders' || t.getHandlerFunction() === 'purgeExpiredTokens') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDeadlineAlerts').timeBased().everyDays(1).atHour(8).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('sendDueReminders').timeBased().everyDays(1).atHour(8).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('purgeExpiredTokens').timeBased().everyDays(1).atHour(3).inTimezone(CONFIG.TIMEZONE).create();
  Logger.log('Deadline alerts and reminders set: every day at 08:00 ' + CONFIG.TIMEZONE);
}

// Builds the alert list: { closing: [...], noReply: [...] }. Each item carries the Inbox row so the app can link to it.
function buildAlerts_() {
  const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow();
  const closing = [], noReply = [];
  if (last < 2) return { closing: closing, noReply: noReply };
  const rows = inbox.getRange(2, 1, last - 1, hi.width).getValues();
  const lookup = artistLookup(), sheetCache = {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const now = new Date();

  rows.forEach(function (r, i) {
    if (String(r[hi.map['status']] || '').trim() !== 'Confirmed') return;
    const row = i + 2;
    const title = String(r[hi.map['title']] || '').trim() || 'Untitled';
    const link = String(r[hi.map['application link']] || '').trim();
    const deadline = r[hi.map['deadline']];
    const artists = splitNames(r[hi.map['artists']]);
    const sent = splitNames(r[hi.map['sent to']]);

    // Calls closing soon
    if (deadline instanceof Date) {
      const days = Math.round((deadline - today) / 86400000);
      if (ALERT_DAYS.indexOf(days) !== -1) {
        let status;
        if (!artists.length) status = 'No artist assigned';
        else if (sent.length < artists.length) status = 'Not sent to ' + artists.filter(function (n) { return sent.indexOf(n) === -1; }).join(', ');
        else status = 'Sent to ' + sent.join(', ');
        closing.push({ row: row, title: title, days: days, when: days === 0 ? 'today' : 'in ' + days + ' day' + (days === 1 ? '' : 's'),
          deadline: Utilities.formatDate(deadline, CONFIG.TIMEZONE, 'd MMM'), status: status });
      }
    }

    // Artists who haven't replied after a while
    artistCallStatesForRow_(artists, title, link, lookup, sheetCache).forEach(function (s) {
      const sentOn = s.sentOn instanceof Date ? s.sentOn : null;
      const replied = s.response && s.response !== 'No response yet';
      if (!sentOn || replied) return;
      const waited = Math.floor((now - sentOn) / 86400000);
      if (waited >= NO_REPLY_DAYS) noReply.push({ row: row, title: title, artist: s.name, waited: waited });
    });
  });
  closing.sort(function (a, b) { return a.days - b.days; });
  return { closing: closing, noReply: noReply };
}

// For the app: the Dashboard section and the bell.
function p2_getAlerts() {
  const a = buildAlerts_();
  return { ok: true, closing: a.closing, noReply: a.noReply, reminders: inAppReminders_() };
}

function sendDeadlineAlerts() {
  const a = buildAlerts_();
  if (!a.closing.length && !a.noReply.length) return;

  const closingLines = a.closing.map(function (c) { return '- ' + c.title + ' (closes ' + c.when + ', ' + c.deadline + '): ' + c.status; });
  const replyLines = a.noReply.map(function (n) { return '- ' + n.artist + ' has not replied to "' + n.title + '" (sent ' + n.waited + ' days ago)'; });
  const parts = [];
  if (closingLines.length) parts.push('Calls closing soon:', closingLines.join('\n'));
  if (replyLines.length) parts.push('', 'No reply from artists:', replyLines.join('\n'));
  parts.push('', 'Open the app: ' + CONFIG.APP_URL);
  const subject = 'Open Calls: ' + (a.closing.length ? a.closing.length + ' closing soon' : '') + (a.closing.length && a.noReply.length ? ', ' : '') + (a.noReply.length ? a.noReply.length + ' waiting for a reply' : '');
  try {
    MailApp.sendEmail(ALERT_RECIPIENTS.join(','), subject, parts.join('\n'));
  } catch (err) {
    logProblem('Deadline alerts', 'error', 'Could not send the alert email: ' + err.message, {});
  }
}
