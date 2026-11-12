// Fees and payments. A call has a fee schedule (Fees, on the Inbox row). Each artist's application gets its own
// payment list (Payments, on the artist's sheet), copied from the schedule when the call is handed to them.

// Reads a stored fee or payment list (JSON) into clean objects. Anything malformed becomes an empty list.
function parseFeeList_(v) {
  let arr = [];
  try { arr = JSON.parse(String(v || '[]')); } catch (e) { arr = []; }
  if (!Array.isArray(arr)) return [];
  return arr.map(function (f) {
    f = f || {};
    return { type: String(f.type || '').trim().slice(0, 40), amount: String(f.amount || '').trim().slice(0, 30),
      due: String(f.due || '').trim().slice(0, 10), paid: !!f.paid, paidOn: String(f.paidOn || '').trim().slice(0, 10),
      proof: String(f.proof || '').trim().slice(0, 300) };
  }).filter(function (f) { return f.type || f.amount; });
}

// Proof of payment: a photo, screenshot or PDF, saved in the application folder under "Proof of payment".
// Returns the file's link, which the payment row keeps.
function p2_uploadPaymentProof(b) {
  if (b.artistCallId) return uploadProofById_(String(b.artistCallId), b);
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || '');
  const artist = String(b.artist || '').trim(), lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()];
  if (!sheetLink) return { ok: false, message: artist + ' is not assigned to this call.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target);
  if (findDuplicate(target, title, link) <= 0) return { ok: false, message: artist + ' is not assigned to this call.' };
  const mime = String(b.mimeType || '');
  if (!/^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(mime)) return { ok: false, message: 'Upload a photo, a screenshot or a PDF.' };
  const bytes = Utilities.base64Decode(String(b.data || ''));
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) return { ok: false, message: 'That file is too big. Keep it under 5 MB.' };
  const folder = childFolder_(applicationFolder_(title, artist), 'Proof of payment');
  const file = folder.createFile(Utilities.newBlob(bytes, mime, safeFolderName_(b.name || 'proof')));
  return { ok: true, url: file.getUrl(), name: file.getName() };
}
// Stores a fee schedule (from the call form) as JSON.
function feeScheduleJson_(fees) { return JSON.stringify(parseFeeList_(JSON.stringify(fees || []))); }
// A new artist application's payments: a copy of the call's fees, all unpaid.
function paymentsFromFees_(feesValue) {
  return parseFeeList_(feesValue).map(function (f) { return { type: f.type, amount: f.amount, due: f.due, paid: false, paidOn: '' }; });
}
// Short summary for the Paid column: "Paid", "1 of 3 paid", or blank when there are no payments.
function paymentSummary_(payments) {
  const n = payments.length; if (!n) return '';
  const paid = payments.filter(function (p) { return p.paid; }).length;
  return paid === n ? 'Paid' : paid + ' of ' + n + ' paid';
}
// Every open application (not yet an outcome), with who it's assigned to, when it's due and what is unpaid.
function dashboardApplications_() {
  const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow(), out = [];
  if (last < 2) return out;
  const rows = inbox.getRange(2, 1, last - 1, hi.width).getValues(), lookup = artistLookup();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  rows.forEach(function (r, i) {
    if (String(r[hi.map['status']] || '').trim() !== 'Confirmed') return;
    const title = String(r[hi.map['title']] || '').trim(), link = String(r[hi.map['application link']] || '').trim();
    const deadlineRaw = r[hi.map['deadline']];
    splitNames(r[hi.map['artists']]).forEach(function (artist) {
      const sheetLink = lookup[artist.toLowerCase()]; if (!sheetLink) return;
      let target; try { target = openTab(sheetLink); } catch (e) { return; }
      const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return;
      const shi = headerIndex(target);
      const get = function (h) { const idx = shi.map[h]; return idx === undefined ? '' : target.getRange(dupRow, idx + 1).getValue(); };
      const status = String(get('status') || '').trim();
      if (['Accepted', 'Declined', 'Not Selected'].indexOf(status) !== -1) return;
      const dueRaw = get('due on'), dueOn = dueRaw instanceof Date ? dueRaw : (dueRaw ? new Date(dueRaw) : null);
      const validDue = dueOn && !isNaN(dueOn.getTime()) ? dueOn : null;
      const days = validDue ? Math.round((new Date(validDue.getFullYear(), validDue.getMonth(), validDue.getDate()) - today) / 86400000) : null;
      let payments = []; try { payments = JSON.parse(String(get('payments') || '[]')); } catch (e) { payments = []; }
      const unpaid = (Array.isArray(payments) ? payments : []).filter(function (p) { return !(p && p.paid); })
        .reduce(function (t, p) { return t + amountNumber_(p.amount); }, 0);
      out.push({ row: i + 2, title: title, artist: artist, assignedTo: String(get('assigned to') || '').trim(),
        dueOn: validDue ? Utilities.formatDate(validDue, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '', days: days,
        status: status || 'Not applied', applied: !!get('applied on'), unpaid: unpaid });
    });
  });
  return out;
}
// The Work section: every open application, grouped so each number can be opened to see its calls.
function dashboardWork_() {
  const apps = dashboardApplications_(), byPerson = {};
  const slim = function (a) { return { row: a.row, title: a.title, artist: a.artist, assignedTo: a.assignedTo, dueOn: a.dueOn, days: a.days, status: a.status, applied: a.applied }; };
  const lists = { open: [], notApplied: [], unassigned: [], overdue: [], awaiting: [] };
  apps.forEach(function (a) {
    const s = slim(a), late = a.days !== null && a.days < 0 && !a.applied;
    lists.open.push(s);
    if (!a.applied) lists.notApplied.push(s);
    if (!a.assignedTo) lists.unassigned.push(s);
    if (late) lists.overdue.push(s);
    if (a.status === 'Awaiting Response') lists.awaiting.push(s);
    if (a.assignedTo) {
      if (!byPerson[a.assignedTo]) byPerson[a.assignedTo] = { open: [], overdue: [], dueSoon: [] };
      byPerson[a.assignedTo].open.push(s);
      if (late) byPerson[a.assignedTo].overdue.push(s);
      // Due in the next 14 days, not overdue and not yet applied.
      if (a.days !== null && a.days >= 0 && a.days <= 14 && !a.applied) byPerson[a.assignedTo].dueSoon.push(s);
    }
  });
  return { lists: lists, byPerson: byPerson };
}
// A contact email is optional, but if it's given it must look like one.
function validEmail_(s) { return !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim()); }
