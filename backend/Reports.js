// Reports: how the applications went in a month (EOM), a quarter (EOQ) or a year (EOY).
// Each application is counted in the period of its Applied On date. Outcomes are read as they stand now.
// The table matches the "Opportunities Report Stats" sheet: one column per artist, one row per outcome.

const REPORT_ROWS = [
  { key: 'applied', label: 'Total applications applied for' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'awaiting', label: 'Awaiting response' },
  { key: 'notForward', label: 'Not moving forward' }
];

// "2026-11" (month), "2026-Q4" (quarter) or "2026" (year).
function reportPeriodOf_(date, kind) {
  const y = date.getFullYear(), m = date.getMonth() + 1;
  if (kind === 'quarter') return y + '-Q' + Math.ceil(m / 3);
  if (kind === 'year') return String(y);
  return y + '-' + (m < 10 ? '0' : '') + m;
}
function reportPeriodLabel_(kind, period) {
  if (kind === 'quarter') return period.replace('-', ' ') + ' (EOQ)';
  if (kind === 'year') return period + ' (EOY)';
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return names[Number(period.slice(5, 7)) - 1] + ' ' + period.slice(0, 4) + ' (EOM)';
}
// The currency symbol in an amount, e.g. ₹ in '₹1,500'. Blank when there is none.
function currencyOf_(s) { const m = String(s || '').match(/[^\d.,\s]+/); return m ? m[0] : ''; }
// Money in a fee or payment amount, e.g. "₹1,500" → 1500. Unreadable amounts count as 0.
function amountNumber_(s) {
  const n = parseFloat(String(s || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// One record per artist-application on every confirmed call that has an artist.
function reportRecords_() {
  const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow(), out = [];
  if (last < 2) return out;
  const rows = inbox.getRange(2, 1, last - 1, hi.width).getValues();
  const lookup = artistLookup();
  rows.forEach(function (r, i) {
    const title = String(r[hi.map['title']] || '').trim(), link = String(r[hi.map['application link']] || '').trim();
    const category = String(r[hi.map['category']] || '').trim() || 'Uncategorised';
    splitNames(r[hi.map['artists']]).forEach(function (artist) {
      const sheetLink = lookup[artist.toLowerCase()]; if (!sheetLink) return;
      let target; try { target = openTab(sheetLink); } catch (e) { return; }
      const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return;
      const shi = headerIndex(target);
      const get = function (h) { const i = shi.map[h]; return i === undefined ? '' : target.getRange(dupRow, i + 1).getValue(); };
      const appliedRaw = get('applied on');
      const appliedOn = appliedRaw instanceof Date ? appliedRaw : (appliedRaw ? new Date(appliedRaw) : null);
      let payments = []; try { payments = JSON.parse(String(get('payments') || '[]')); } catch (e) { payments = []; }
      out.push({ row: i + 2, artist: artist, title: title, category: category, appliedOn: appliedOn && !isNaN(appliedOn.getTime()) ? appliedOn : null,
        status: String(get('status') || '').trim(), sentOn: get('sent on') instanceof Date,
        payments: Array.isArray(payments) ? payments : [] });
    });
  });
  return out;
}

// The report for one period: the table, the analytics and the categories.
function buildReport_(kind, period, opts) {
  opts = opts || {};
  const inRange = function (x) {
    if (kind === "custom") { const d = Utilities.formatDate(x.appliedOn, CONFIG.TIMEZONE, "yyyy-MM-dd"); return d >= opts.from && d <= opts.to; }
    return reportPeriodOf_(x.appliedOn, kind) === period;
  };
  const records = reportRecords_().filter(function (x) { return x.appliedOn && inRange(x) && (!opts.artist || x.artist === opts.artist); });
  const artists = [...new Set(records.map(function (x) { return x.artist; }))].sort();
  const table = {};
  REPORT_ROWS.forEach(function (row) { table[row.key] = {}; artists.forEach(function (a) { table[row.key][a] = 0; }); });
  const categories = {};
  let feesPaid = 0, feesOutstanding = 0, responded = 0, sent = 0;
  records.forEach(function (x) {
    const a = x.artist, s = x.status;
    table.applied[a]++;
    if (s === 'Accepted') table.accepted[a]++;
    if (s === 'Declined' || s === 'Not Selected') table.rejected[a]++;
    if (s === 'Awaiting Response') table.awaiting[a]++;
    if (s === 'Not Moving Forward') table.notForward[a]++;
    categories[x.category] = (categories[x.category] || 0) + 1;
    if (x.sentOn) { sent++; if (s && s !== 'Applied' && s !== 'In Progress') responded++; }
    x.payments.forEach(function (p) { const n = amountNumber_(p.amount); if (p.paid) feesPaid += n; else feesOutstanding += n; });
  });
  const outcomes = records.filter(function (x) { return x.status === 'Accepted' || x.status === 'Declined' || x.status === 'Not Selected'; }).length;
  const accepted = records.filter(function (x) { return x.status === 'Accepted'; }).length;
  return {
    label: kind === 'custom' ? period.replace('..', ' to ') : reportPeriodLabel_(kind, period), kind: kind, period: period, artists: artists,
    rows: REPORT_ROWS.map(function (row) { return { label: row.label, values: artists.map(function (a) { return table[row.key][a]; }), total: artists.reduce(function (t, a) { return t + table[row.key][a]; }, 0) }; }),
    analytics: {
      applications: records.length,
      acceptanceRate: outcomes ? Math.round(100 * accepted / outcomes) : null,
      responseRate: sent ? Math.round(100 * responded / sent) : null,
      feesPaid: feesPaid, feesOutstanding: feesOutstanding
    },
    categories: Object.keys(categories).sort().map(function (k) { return { name: k, count: categories[k] }; })
  };
}

// Dashboard stats. Every number can be opened: each one keeps the calls, artists and dates behind it.
function dashboardStats_() {
  const records = reportRecords_();
  const now = new Date(), today = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const ymNow = today.slice(0, 7), yNow = today.slice(0, 4), qNow = Math.ceil(Number(ymNow.slice(5, 7)) / 3);
  const in14 = Utilities.formatDate(new Date(now.getTime() + 14 * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  // Fees: lists of payments, by when they are due, and by when they were paid. No amounts are added up here.
  const owed = { overdue: [], next14: [], later: [], undated: [] };
  const paid = { month: [], quarter: [], year: [] };
  const acc = {}, applied = {};
  records.forEach(function (x) {
    const item = { row: x.row, title: x.title, artist: x.artist };
    x.payments.forEach(function (p) {
      if (p.paid) {
        const pd = String(p.paidOn || ''), pi = Object.assign({}, item, { type: p.type, when: pd });
        if (pd.slice(0, 7) === ymNow) paid.month.push(pi);
        if (pd.slice(0, 4) === yNow && Math.ceil(Number(pd.slice(5, 7)) / 3) === qNow) paid.quarter.push(pi);
        if (pd.slice(0, 4) === yNow) paid.year.push(pi);
      } else {
        const due = String(p.due || ''), bucket = !due ? 'undated' : due < today ? 'overdue' : due <= in14 ? 'next14' : 'later';
        owed[bucket].push(Object.assign({}, item, { type: p.type, due: due }));
      }
    });
    const s = x.status;
    if (s === 'Accepted' || s === 'Declined' || s === 'Not Selected') {
      acc[x.artist] = acc[x.artist] || { yes: 0, total: 0 };
      acc[x.artist].total++; if (s === 'Accepted') acc[x.artist].yes++;
    }
    if (x.appliedOn) {
      const m = Utilities.formatDate(x.appliedOn, CONFIG.TIMEZONE, 'yyyy-MM');
      applied[m] = applied[m] || [];
      applied[m].push(item);
    }
  });
  // Last 12 months of applications, oldest first, each with the applications in it.
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1), k = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM');
    months.push({ month: k, items: applied[k] || [] });
  }
  // Calls closing in the next six months, from the Inbox deadlines.
  const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow();
  const nextMonths = []; for (let i = 0; i < 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); nextMonths.push(Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM')); }
  const closing = {}; nextMonths.forEach(function (m) { closing[m] = []; });
  const unassigned = [];
  if (last >= 2) {
    inbox.getRange(2, 1, last - 1, hi.width).getValues().forEach(function (r, i) {
      if (String(r[hi.map['status']] || '').trim() !== 'Confirmed') return;
      const title = String(r[hi.map['title']] || '').trim(), cat = String(r[hi.map['category']] || '').trim() || 'Uncategorised';
      const dl = r[hi.map['deadline']], dlStr = dl instanceof Date ? Utilities.formatDate(dl, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '';
      if (dlStr && closing[dlStr.slice(0, 7)] && dlStr >= today) closing[dlStr.slice(0, 7)].push({ row: i + 2, title: title, deadline: dlStr });
      if (!splitNames(r[hi.map['artists']]).length && title) unassigned.push({ row: i + 2, title: title, deadline: dlStr, category: cat });
    });
  }
  unassigned.sort(function (a, b) { return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1; });
  return {
    owed: owed,
    paid: paid,
    acceptance: { byArtist: acc },
    months: months,
    closing: nextMonths.map(function (m) { return { month: m, items: closing[m] }; }),
    unassigned: unassigned,
    labels: { month: ymNow, quarter: 'Q' + qNow, year: yNow }
  };
}
// For the app: a report for a period. kind is "month", "quarter", "year" or "custom" (from and to dates).
// artist is one artist's name, or blank for every artist.
function getReport(b) {
  const kind = ['month', 'quarter', 'year', 'custom'].indexOf(b.kind) !== -1 ? b.kind : 'month';
  const artist = String(b.artist || '').trim();
  if (kind === 'custom') {
    const from = String(b.from || ''), to = String(b.to || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return { ok: false, message: 'Pick a start and an end date.' };
    if (from > to) return { ok: false, message: 'The start date is after the end date.' };
    return Object.assign({ ok: true }, buildReport_('custom', from + '..' + to, { from: from, to: to, artist: artist }));
  }
  const period = String(b.period || '').trim() || reportPeriodOf_(new Date(), kind);
  if (kind === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return { ok: false, message: 'Use the month as YYYY-MM, e.g. 2026-11.' };
  if (kind === 'quarter' && !/^\d{4}-Q[1-4]$/.test(period)) return { ok: false, message: 'Use the quarter as YYYY-Q1 to YYYY-Q4.' };
  if (kind === 'year' && !/^\d{4}$/.test(period)) return { ok: false, message: 'Use the year as YYYY.' };
  return Object.assign({ ok: true }, buildReport_(kind, period, { artist: artist }));
}
// Saves what the dashboard shows (one tab's tables) as a new sheet tab, each table under its own title.
// Everything in an export comes from the browser, so every cell is untrusted. Text that starts with = + - or @ would be
// read by Sheets as a formula (for example =IMPORTXML), so it is stored as plain text (safe_ adds a leading apostrophe).
const EXPORT_LIMITS_ = { tables: 20, rows: 5000, columns: 50, cellChars: 5000, titleChars: 200, nameChars: 40 };
function exportCell_(c) {
  if (c === null || c === undefined) return '';
  if (typeof c === 'number' || typeof c === 'boolean') return c;
  return safe_(String(c).slice(0, EXPORT_LIMITS_.cellChars));
}
// The label typed by the browser is stripped of [ ] * ? : / \ (awkward in formulas and invalid in Excel) and capped; the
// timestamp keeps its colon as before. A name that already exists gets " (2)", " (3)" ... because insertSheet throws on duplicates.
function exportTabName_(ss, label) {
  const clean = String(label || 'view').replace(/[\[\]*?:\/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, EXPORT_LIMITS_.nameChars) || 'view';
  const base = 'Dashboard ' + clean + ' ' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  let name = base, n = 2;
  while (ss.getSheetByName(name)) { name = base + ' (' + n + ')'; n++; }
  return name;
}
function exportDashboardTab(b) {
  const tables = Array.isArray(b.tables) ? b.tables : [];
  if (!tables.length) return { ok: false, message: 'Nothing to export on this tab.' };
  const L = EXPORT_LIMITS_;
  if (tables.length > L.tables) return { ok: false, message: 'Too many tables to export (up to ' + L.tables + ').' };
  const cleaned = [];
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i] || {}, headers = Array.isArray(t.headers) ? t.headers : [], rows = Array.isArray(t.rows) ? t.rows : [];
    if (headers.length > L.columns) return { ok: false, message: 'A table has too many columns (up to ' + L.columns + ').' };
    if (rows.length > L.rows) return { ok: false, message: 'A table has too many rows (up to ' + L.rows + ').' };
    const width = Math.min(L.columns, Math.max(1, headers.length, rows.reduce(function (m, r) { return Math.max(m, Array.isArray(r) ? r.length : 0); }, 0)));
    const pad = function (arr) { const out = []; for (let k = 0; k < width; k++) out.push(exportCell_(Array.isArray(arr) ? arr[k] : '')); return out; };
    cleaned.push({ title: safe_(String(t.title || '').slice(0, L.titleChars)), headers: pad(headers.length ? headers : ['']), rows: rows.map(pad), width: width });
  }
  const ss = SpreadsheetApp.getActive();
  const name = exportTabName_(ss, b.name);
  const tab = ss.insertSheet(name);
  let row = 1;
  cleaned.forEach(function (t) {
    tab.getRange(row, 1).setValue(t.title).setFontWeight('bold'); row++;
    tab.getRange(row, 1, 1, t.width).setValues([t.headers]).setFontWeight('bold'); row++;
    if (t.rows.length) {
      tab.getRange(row, 1, t.rows.length, t.width).setValues(t.rows);
      row += t.rows.length;
    } else { tab.getRange(row, 1).setValue('Nothing here.'); row++; }
    row++;
  });
  return { ok: true, message: 'Saved as “' + name + '”.', url: ss.getUrl() + '#gid=' + tab.getSheetId() };
}

// Saves a report as its own tab on the sheet, laid out like the Opportunities Report Stats sheet.
// Saves a report as a sheet file in the artist's "Reports" folder (inside their master docs), or in the
// shared Reports folder when the report covers every artist. Returns the link to the file.
function saveReportTab(b) {
  const r = getReport(b); if (!r.ok) return r;
  const artist = String(b.artist || '').trim();
  const folder = artist ? childFolder_(artistMasterFolder_(artist), 'Reports') : childFolder_(appRootFolder_(), 'Reports');
  const name = 'Report ' + (artist || 'all artists') + ' · ' + r.label;
  const file = SpreadsheetApp.create(name);
  DriveApp.getFileById(file.getId()).moveTo(folder);
  const tab = file.getSheets()[0];
  tab.setName('Report');
  writeReportLayout_(tab, r);
  return { ok: true, message: 'Saved to ' + (artist ? artist + '’s' : 'the shared') + ' Reports folder.', url: file.getUrl() };
}
// The report's layout: the table, the analytics, and the categories.
function writeReportLayout_(tab, r) {
  const header = [r.label].concat(r.artists).concat(['Total']);
  const body = r.rows.map(function (row) { return [row.label].concat(row.values).concat([row.total]); });
  tab.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (body.length) tab.getRange(2, 1, body.length, header.length).setValues(body);
  let next = body.length + 3;
  const a = r.analytics;
  const lines = [['Analytics', ''], ['Applications', a.applications], ['Acceptance rate', a.acceptanceRate === null ? 'No outcomes yet' : a.acceptanceRate + '%'],
    ['Response rate', a.responseRate === null ? 'No sent calls yet' : a.responseRate + '%'], ['Fees paid', a.feesPaid], ['Fees outstanding', a.feesOutstanding]];
  tab.getRange(next, 1, lines.length, 2).setValues(lines);
  tab.getRange(next, 1).setFontWeight('bold');
  next += lines.length + 1;
  tab.getRange(next, 1, 1, 2).setValues([['Category', 'Applications']]).setFontWeight('bold');
  if (r.categories.length) tab.getRange(next + 1, 1, r.categories.length, 2).setValues(r.categories.map(function (c) { return [c.name, c.count]; }));
  tab.setFrozenRows(1);
}