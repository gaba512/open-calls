function safe_(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function jsonOut(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function splitNames(v) { return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
function extractUrl(s) { const m = String(s).match(/https?:\/\/[^\s"'<>]+/); return m ? m[0] : ''; }
function toDate(ymd) { return Utilities.parseDate(String(ymd) + ' 00:00:00', CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'); }
function validDate_(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? String(d) : ''; }
function pickedArtists(v) { if (Array.isArray(v)) v = v.join(','); return splitNames(String(v || '').replace(/\n/g, ',')); }
function statusLabel_(s) { return s === 'Confirmed' ? 'Inbox' : s === 'Archived' ? 'Archive' : 'Drafts'; }

function bump_(key, limit, seconds) { const lock = LockService.getScriptLock(); try { lock.waitLock(5000); } catch (e) { return true; } try { const c = CacheService.getScriptCache(), n = Number(c.get('rl_' + key) || 0); if (n >= limit) return false; c.put('rl_' + key, String(n + 1), seconds); return true; } finally { lock.releaseLock(); } }
function limited_(b, who) { const files = b.files || []; if (files.length > 10) return { ok: false, message: 'Up to 10 files.' }; const total = files.reduce(function (n, f) { return n + String(f.data || '').length; }, 0); if (total > CONFIG.MAX_UPLOAD_CHARS) return { ok: false, message: 'Files too big.' }; if (String(b.text || '').length > CONFIG.MAX_TEXT_CHARS) b.text = String(b.text).slice(0, CONFIG.MAX_TEXT_CHARS); const okAll = bump_('reads_all', CONFIG.MAX_READS_PER_HOUR_ALL, 3600), okOne = bump_('reads_' + who, CONFIG.MAX_READS_PER_HOUR, 3600); if (!okAll || !okOne) { logProblem('Rate limit', 'warning', 'Hourly read limit reached.', b); return { ok: false, message: 'Hourly limit reached.' }; } return null; }

// The opportunity list. Step 2: every screen now reads and writes the Opportunities tab.
function getInbox() {
  const s = opportunitiesSheet_();
  ensureHeaderColumns_(s, INBOX_HEADERS);
  return s;
}
function headerIndex(sheet) { const width = Math.max(sheet.getLastColumn(), 1), h = sheet.getRange(1, 1, 1, width).getValues()[0], map = {}; h.forEach(function (name, i) { const k = String(name).trim().toLowerCase(); if (k && map[k] === undefined) map[k] = i; }); return { map: map, width: width }; }
function appendByHeader(sheet, values) { const hi = headerIndex(sheet), row = new Array(hi.width).fill(''); Object.keys(values).forEach(function (k) { const i = hi.map[k.toLowerCase()]; if (i !== undefined) row[i] = safe_(values[k]); }); sheet.appendRow(row); }
function updateRowByHeader(sheet, rowNum, values) { const hi = headerIndex(sheet); Object.keys(values).forEach(function (k) { const i = hi.map[k.toLowerCase()]; if (i !== undefined) sheet.getRange(rowNum, i + 1).setValue(safe_(values[k])); }); }
function findDuplicate(sheet, title, link, ignoreRow) { const last = sheet.getLastRow(); if (last < 2) return 0; const hi = headerIndex(sheet), li = hi.map['application link'], ti = hi.map['title'], rows = sheet.getRange(2, 1, last - 1, hi.width).getValues(), t = norm(title); for (let i = 0; i < rows.length; i++) { if (i + 2 === ignoreRow) continue; const rl = li !== undefined ? String(rows[i][li] || '') : '', rt = ti !== undefined ? norm(rows[i][ti]) : ''; const hit = (link && rl) ? rl === String(link) : !!(t && rt && rt === t); if (hit) return i + 2; } return 0; }
function openTab(link) { const ss = SpreadsheetApp.openByUrl(link), m = link.match(/gid=(\d+)/); if (m) { const gid = Number(m[1]), tab = ss.getSheets().find(function (s) { return s.getSheetId() === gid; }); if (tab) return tab; } return ss.getSheets()[0]; }
function rowMatches_(inbox, rowNum, expectTitle) { if (!(rowNum >= 2 && rowNum <= inbox.getLastRow())) return false; if (expectTitle === undefined || expectTitle === null) return true; return norm(inbox.getRange(rowNum, headerIndex(inbox).map['title'] + 1).getValue()) === norm(expectTitle); }
const STALE_ = { ok: false, stale: true, message: 'This entry changed since you opened it. Go back and open it again.' };
// ---- Stable IDs and new-architecture tabs (Stage 3) ----
// Permanent random IDs (UUID v4). Generated once, never changed.
function newId_() { return Utilities.getUuid(); }
function isId_(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || '')); }

// Header rows for the new tabs. Lookups are always by header name, never by column position.
const NEW_TAB_HEADERS_ = {
  OPPORTUNITIES: ['OpenCall ID', 'Added On', 'Title', 'Category', 'Deadline', 'Application Fee', 'Application Link', 'Event Dates', 'Announcement Date', 'Organiser', 'Organiser Email', 'Location', 'Eligibility', 'Medium', 'Summary', 'Fees', 'Required Docs', 'Status', 'Team Review', 'Review Stats', 'Selection Month', 'Verified By', 'Confirmed On', 'Submitted By', 'Source Files', 'Additional Info', 'Artists Cache Map'],
  ARTIST_PROFILES: ['Artist ID', 'Artist Name', 'Sheet Link', 'Drive Folder ID', 'Email', 'Phone', 'Mediums', 'Location', 'Eligibility Notes', 'Notes'],
  ARTISTCALLS_INDEX: ['ArtistCall ID', 'Artist ID', 'OpenCall ID', 'Artist Sheet ID', 'Application Folder ID', 'Calendar Event ID', 'Creation State', 'Created On', 'Unassigned On', 'Restored On'],
  ARTISTCALL_HISTORY: ['Event ID', 'ArtistCall ID', 'Artist ID', 'OpenCall ID', 'Event', 'At', 'By'],
  ARTISTCALLS: ['ArtistCall ID', 'Artist ID', 'OpenCall ID', 'Lifecycle Status', 'Working Stage', 'Payment Status', 'Assigned To', 'Handoff On', 'Sent On', 'Interested On', 'Applied On', 'Response Comment', 'Application Folder ID', 'Calendar Event ID', 'Created On', 'Payments', 'Payment Status', 'Docs Checklist', 'Artworks', 'Due On', 'Response Updated On', 'Response Updated By', 'Status Before Unassignment', 'Unassigned On', 'Unassigned By', 'Prior Calendar Event ID', 'Restored On', 'Restored By']
};

// Creates any missing new-architecture tab with its header row. Existing tabs are never changed.
function ensureNewTabs_() {
  const ss = SpreadsheetApp.getActive();
  const plan = [[CONFIG.OPPORTUNITIES_TAB, NEW_TAB_HEADERS_.OPPORTUNITIES], [CONFIG.ARTIST_PROFILES_TAB, NEW_TAB_HEADERS_.ARTIST_PROFILES], [CONFIG.ARTISTCALLS_INDEX_TAB, NEW_TAB_HEADERS_.ARTISTCALLS_INDEX]];
  const created = [];
  plan.forEach(function (p) { const existing = ss.getSheetByName(p[0]); if (!existing) { const s = ss.insertSheet(p[0]); s.appendRow(p[1]); s.setFrozenRows(1); created.push(p[0]); } else { ensureHeaderColumns_(existing, p[1]); } });
  return created;
}
// Adds any header names a tab is missing, at the end. Existing columns are never moved or renamed.
function ensureHeaderColumns_(sheet, headers) {
  const width = Math.max(sheet.getLastColumn(), 1), have = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const missing = headers.filter(function (h) { return have.indexOf(h.toLowerCase()) === -1; });
  if (missing.length) sheet.getRange(1, width + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  return missing;
}
// Adds an ArtistCalls tab to an artist's own spreadsheet if it is missing.
function ensureArtistCallsTab_(artistSs) {
  if (artistSs.getSheetByName(CONFIG.ARTISTCALLS_TAB)) { ensureHeaderColumns_(artistSs.getSheetByName(CONFIG.ARTISTCALLS_TAB), NEW_TAB_HEADERS_.ARTISTCALLS); return false; }
  const s = artistSs.insertSheet(CONFIG.ARTISTCALLS_TAB); s.appendRow(NEW_TAB_HEADERS_.ARTISTCALLS); s.setFrozenRows(1); return true;
}
// ---- Time (spec 3.11). The SERVER clock is the only clock: a time sent by the browser is never read. Tests replace serverNow_. ----
const REASSIGN_WINDOW_MS_ = 24 * 60 * 60 * 1000;
const PITCHED_STATUSES_ = ['Pitched — Awaiting Response', 'Pitched — Need More Info'];
const ARTISTCALL_HISTORY_TAB_ = 'ArtistCall History';
function serverNow_() { return new Date(); }
// Stamps are ISO-8601 UTC text with milliseconds, so the value is exact and cannot drift in a spreadsheet date cell.
function stampText_(d) { return d.toISOString(); }
function parseStamp_(v) {
  if (v instanceof Date) { const t = v.getTime(); return isNaN(t) ? null : t; }
  const s = String(v == null ? '' : v).trim(); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)) return null;
  const t = Date.parse(s); return isNaN(t) ? null : t;
}
// Writes a stamp as plain text (a spreadsheet would otherwise turn it into a date and round it).
function setStampCell_(sheet, rowNum, header, text) {
  const c = headerIndex(sheet).map[header.toLowerCase()]; if (c === undefined) return;
  const r = sheet.getRange(rowNum, c + 1); try { r.setNumberFormat('@'); } catch (e) { /* the formatting is a courtesy; the ISO text is what counts */ }
  r.setValue(text);
}
function stampOf_(sheet, rowNum, header) { const v = cellText_(sheet, rowNum, header); return v instanceof Date ? v.toISOString() : String(v == null ? '' : v); }
function cellText_(sheet, rowNum, header) { const c = headerIndex(sheet).map[header.toLowerCase()]; return c === undefined ? '' : sheet.getRange(rowNum, c + 1).getValue(); }

// ---- Append-only history: one row per Unassigned / Restored event, never edited or deleted. Keyed, so a retry adds nothing. ----
function artistCallHistoryTab_() {
  const ss = SpreadsheetApp.getActive(); let t = ss.getSheetByName(ARTISTCALL_HISTORY_TAB_);
  if (!t) { t = ss.insertSheet(ARTISTCALL_HISTORY_TAB_); t.appendRow(NEW_TAB_HEADERS_.ARTISTCALL_HISTORY); t.setFrozenRows(1); }
  return t;
}
function appendArtistCallHistory_(acId, artistId, openCallId, event, atText, by) {
  const key = acId + '|' + event + '|' + atText, t = artistCallHistoryTab_();
  if (t.getLastRow() >= 2 && t.getRange(2, 1, t.getLastRow() - 1, 1).getValues().some(function (r) { return String(r[0]) === key; })) return false;
  appendByHeader(t, { 'Event ID': key, 'ArtistCall ID': acId, 'Artist ID': artistId, 'OpenCall ID': openCallId, 'Event': event, 'At': atText, 'By': by || '' });
  return true;
}

// ---- ArtistCall creation (spec 3.1, 3.5, 3.11). Every step is safe to repeat. ----
// 3.1: no ArtistCall without a real artist on a real, approved opportunity.
function validateArtistCallInputs_(artistId, openCallId, artistSheetUrl) {
  if (!isId_(artistId) || !artistProfileById_(artistId)) return { ok: false, message: 'Pick a valid artist first. That artist could not be found.' };
  if (!isId_(openCallId)) return { ok: false, message: 'That opportunity could not be found.' };
  const opp = findOpportunityById_(openCallId); if (!opp) return { ok: false, message: 'That opportunity could not be found.' };
  if (opp.teamReview !== 'Approved to send') return { ok: false, message: 'Approve the opportunity for sending first.' };
  if (!String(artistSheetUrl || '').trim()) return { ok: false, message: 'That artist has no sheet linked.' };
  return null;
}
// All index records for one artist and opportunity, in sheet order.
function pairRecords_(index, ih, artistId, openCallId) {
  const out = [], last = index.getLastRow(); if (last < 2) return out;
  const col = function (h) { return ih.map[h]; };
  index.getRange(2, 1, last - 1, ih.width).getValues().forEach(function (r, i) {
    if (String(r[col('artist id')]) !== String(artistId) || String(r[col('opencall id')]) !== String(openCallId)) return;
    out.push({ rowNum: i + 2, acId: String(r[col('artistcall id')]), state: String(r[col('creation state')] || '').trim(), sheetUrl: String(r[col('artist sheet id')] || ''), unassignedOn: col('unassigned on') === undefined ? '' : r[col('unassigned on')] });
  });
  return out;
}
function isActiveState_(s) { return s === 'Pending' || s === 'SheetRow' || s === 'Linked'; }
// Finds the row for an ArtistCall in the artist's own tab. Returns null if the tab or row is missing.
function artistSheetRowFor_(sheetUrl, acId, readOnly) {
  let ss; try { ss = SpreadsheetApp.openByUrl(sheetUrl); } catch (e) { return null; }
  const tab = ss.getSheetByName(CONFIG.ARTISTCALLS_TAB); if (!tab || tab.getLastRow() < 2) return null;
  if (!readOnly) ensureHeaderColumns_(tab, NEW_TAB_HEADERS_.ARTISTCALLS);
  const th = headerIndex(tab), ids = tab.getRange(2, th.map['artistcall id'] + 1, tab.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === String(acId)) return { tab: tab, row: i + 2, th: th }; }
  return null;
}
// Writes the tombstone on the artist-sheet row (authoritative). Does nothing if the row is already Unassigned. Status flips LAST.
function writeSheetTombstone_(f, stamp, actor) {
  const status = String(cellText_(f.tab, f.row, 'lifecycle status') || '').trim(); if (status === 'Unassigned') return false;
  const prior = String(cellText_(f.tab, f.row, 'calendar event id') || '').trim() || String(cellText_(f.tab, f.row, 'prior calendar event id') || '').trim();
  updateRowByHeader(f.tab, f.row, { 'Status Before Unassignment': status, 'Unassigned By': actor || '', 'Prior Calendar Event ID': prior });
  setStampCell_(f.tab, f.row, 'Unassigned On', stamp);
  updateRowByHeader(f.tab, f.row, { 'Calendar Event ID': '' });
  updateRowByHeader(f.tab, f.row, { 'Lifecycle Status': 'Unassigned' });
  return true;
}
// Is this tombstone restorable right now? Reads the artist-sheet row (authoritative). Returns { ok, resume?, row, why }.
function restoreEligibility_(cand, artistId, openCallId, now, actor) {
  const f = artistSheetRowFor_(cand.sheetUrl, cand.acId); if (!f) return { ok: false, why: 'row missing' };
  const get = function (h) { return cellText_(f.tab, f.row, h); };
  if (String(get('artist id')) !== String(artistId) || String(get('opencall id')) !== String(openCallId)) return { ok: false, why: 'different artist or opportunity' };
  let status = String(get('lifecycle status') || '').trim(), unassignedAt = parseStamp_(get('unassigned on'));
  const restoredAt = parseStamp_(get('restored on'));
  if (status !== 'Unassigned') {
    // An earlier restore wrote the sheet and was interrupted before the index: finish it, never start a new one.
    if (unassignedAt !== null && restoredAt !== null && restoredAt >= unassignedAt) return { ok: true, resume: true, row: f };
    // An earlier UNASSIGN was interrupted after the index: finish that first (the stamp comes from the index), then judge the window as usual.
    const idxStamp = cand.unassignedOn instanceof Date ? cand.unassignedOn.toISOString() : String(cand.unassignedOn || '');
    if (parseStamp_(idxStamp) === null) return { ok: false, why: 'no readable unassignment stamp' };
    writeSheetTombstone_(f, idxStamp, actor);
    appendArtistCallHistory_(cand.acId, artistId, openCallId, 'Unassigned', idxStamp, String(get('unassigned by') || ''));
    status = 'Unassigned'; unassignedAt = parseStamp_(get('unassigned on'));
  }
  if (unassignedAt === null) return { ok: false, why: 'no readable unassignment stamp' };
  const elapsed = now.getTime() - unassignedAt; if (elapsed < 0 || elapsed >= REASSIGN_WINDOW_MS_) return { ok: false, why: 'outside the window' };
  if (PITCHED_STATUSES_.indexOf(String(get('status before unassignment') || '').trim()) === -1) return { ok: false, why: 'was not a first-pitch call' };
  if (get('sent on') || get('applied on') || get('submission confirmed on')) return { ok: false, why: 'was sent or progressed' };
  return { ok: true, resume: false, row: f };
}
// Restores the ORIGINAL ArtistCall (same ID, row and folder). Order: sheet row, history, index (last). Nothing from the unassignment is changed.
function restoreArtistCall_(index, ih, cand, artistId, openCallId, el, now, actor) {
  const f = el.row, acId = cand.acId;
  if (!el.resume) {
    const stamp = stampText_(now);
    setStampCell_(f.tab, f.row, 'Restored On', stamp);
    updateRowByHeader(f.tab, f.row, { 'Restored By': actor || '' });
    updateRowByHeader(f.tab, f.row, { 'Lifecycle Status': String(cellText_(f.tab, f.row, 'status before unassignment')) });
  }
  const restoredText = stampOf_(f.tab, f.row, 'restored on'), restoredBy = String(cellText_(f.tab, f.row, 'restored by'));
  appendArtistCallHistory_(acId, artistId, openCallId, 'Restored', restoredText, restoredBy);
  const fresh = pairRecords_(index, ih, artistId, openCallId).filter(function (r) { return r.acId === acId; })[0];
  if (fresh && fresh.state !== 'Linked') { setStampCell_(index, fresh.rowNum, 'Restored On', restoredText); updateRowByHeader(index, fresh.rowNum, { 'Creation State': 'Linked' }); }
  return { ok: true, artistCallId: acId, state: 'Linked', existing: false, restored: true, restoredOn: restoredText };
}
// Returns { ok, artistCallId, state, existing, restored }. A failed step leaves the state where it stopped; calling again resumes.
function createArtistCallSteps_(artistId, openCallId, artistSheetUrl, artistName, callTitle, actor) {
  const bad = validateArtistCallInputs_(artistId, openCallId, artistSheetUrl); if (bad) return bad;
  const ss = SpreadsheetApp.getActive(), index = ss.getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB);
  if (!index) return { ok: false, message: 'Set up the new tabs first.' };
  ensureHeaderColumns_(index, NEW_TAB_HEADERS_.ARTISTCALLS_INDEX);
  const ih = headerIndex(index), now = serverNow_();
  // 1. An ACTIVE record for this artist and opportunity is returned or resumed: a retry never duplicates.
  const found = pairRecords_(index, ih, artistId, openCallId);
  let acId = null, state = null; const active = found.filter(function (r) { return isActiveState_(r.state); })[0];
  if (active) {
    acId = active.acId; state = active.state;
    if (state === 'Linked' && artistSheetRowFor_(active.sheetUrl || artistSheetUrl, acId)) return { ok: true, artistCallId: acId, state: 'Linked', existing: true };
  } else {
    // 2. No active record. The most recent tombstone is restored if it is inside the 24-hour window; otherwise a new ArtistCall follows.
    const tombs = found.filter(function (r) { return r.state === 'Unassigned'; });
    if (tombs.length) {
      let cand = tombs[tombs.length - 1], best = parseStamp_(cand.unassignedOn);
      tombs.forEach(function (t) { const p = parseStamp_(t.unassignedOn); if (p !== null && (best === null || p >= best)) { cand = t; best = p; } });
      const el = restoreEligibility_(cand, artistId, openCallId, now, actor);
      if (el.ok) return restoreArtistCall_(index, ih, cand, artistId, openCallId, el, now, actor);
    }
    // 3. New ID, index row marked Pending. If another request got an active row in first, join that one and drop ours.
    acId = newId_(); state = 'Pending';
    appendByHeader(index, { 'ArtistCall ID': acId, 'Artist ID': artistId, 'OpenCall ID': openCallId, 'Artist Sheet ID': artistSheetUrl, 'Creation State': 'Pending', 'Created On': now });
    const now2 = pairRecords_(index, ih, artistId, openCallId).filter(function (r) { return isActiveState_(r.state); });
    if (now2.length > 1 && now2[0].acId !== acId) {
      const mine = now2.filter(function (r) { return r.acId === acId; })[0]; if (mine) index.deleteRow(mine.rowNum);
      acId = now2[0].acId; state = now2[0].state;
      if (state === 'Linked' && artistSheetRowFor_(now2[0].sheetUrl || artistSheetUrl, acId)) return { ok: true, artistCallId: acId, state: 'Linked', existing: true };
    }
  }
  // 4. Row in the artist's own ArtistCalls tab.
  const artistSs = SpreadsheetApp.openByUrl(artistSheetUrl);
  ensureArtistCallsTab_(artistSs);
  const tab = artistSs.getSheetByName(CONFIG.ARTISTCALLS_TAB), th = headerIndex(tab);
  const rowFound = tab.getLastRow() >= 2 ? tab.getRange(2, th.map['artistcall id'] + 1, tab.getLastRow() - 1, 1).getValues().some(function (r) { return String(r[0]) === acId; }) : false;
  if (!rowFound) {
    // Fees from the opportunity become this application's payments. Payment Status starts as Pending when there is a fee, otherwise Not Required.
    const oppFields = findOpportunityById_(openCallId) ? oppRowFields_(findOpportunityById_(openCallId).row) : {};
    const payments = paymentsFromFees_(oppFields['fees'] || '');
    appendByHeader(tab, { 'ArtistCall ID': acId, 'Artist ID': artistId, 'OpenCall ID': openCallId, 'Lifecycle Status': 'Pitched — Awaiting Response', 'Payments': JSON.stringify(payments), 'Payment Status': payments.length ? 'Pending' : 'Not Required', 'Created On': now });
  }
  setIndexState_(index, acId, 'SheetRow');
  // 5. Folder: Artists / <Artist> / ArtistCalls / <ArtistCall ID> / Application Documents
  const artistRoot = childFolder_(childFolder_(appRootFolder_(), 'Artists'), safeFolderName_(artistName));
  const folder = childFolder_(childFolder_(artistRoot, 'ArtistCalls'), acId);
  childFolder_(folder, 'Application Documents');
  childFolder_(folder, 'Payments');
  updateRowByHeaderValue_(tab, 'artistcall id', acId, { 'Application Folder ID': folder.getId() });
  updateRowByHeaderValue_(index, 'artistcall id', acId, { 'Application Folder ID': folder.getId() });
  setIndexState_(index, acId, 'Linked');
  return { ok: true, artistCallId: acId, state: 'Linked', existing: false, restored: false };
}
function setIndexState_(index, acId, state) { updateRowByHeaderValue_(index, 'artistcall id', acId, { 'Creation State': state }); }
function updateRowByHeaderValue_(sheet, keyHeader, keyValue, values) {
  const h = headerIndex(sheet), k = h.map[keyHeader]; if (k === undefined || sheet.getLastRow() < 2) return false;
  const col = sheet.getRange(2, k + 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < col.length; i++) { if (String(col[i][0]) === String(keyValue)) { updateRowByHeader(sheet, i + 2, values); return true; } }
  return false;
}
// Entry point. Any failure is returned as a readable result; the index keeps the last completed state so a retry resumes.
function createArtistCall_(artistId, openCallId, artistSheetUrl, artistName, callTitle, actor) {
  try { return createArtistCallSteps_(artistId, openCallId, artistSheetUrl, artistName, callTitle, actor); }
  catch (err) { return { ok: false, message: 'Setting up this application did not finish. Try again.', detail: String(err && err.message || err) }; }
}
// ---- Step 1: saving new opportunities to the Opportunities tab (UUID, idempotent) ----
// Returns the sheet used for opportunities, with the columns the form needs.
function opportunitiesSheet_() {
  ensureNewTabs_();
  const s = SpreadsheetApp.getActive().getSheetByName(CONFIG.OPPORTUNITIES_TAB);
  ensureFormColumns_(s, NEW_TAB_HEADERS_.OPPORTUNITIES);
  ensureFormColumns_(s, ['Fees', 'Required Docs']);
  ensureFormColumns_(s);
  return s;
}
// Writes one opportunity to the Opportunities tab. A repeat of the same title and link returns the
// existing record instead of creating another, so retries and double-clicks cannot duplicate it.
function upsertOpportunityRecord_(data, link, sender, confirmed, sourceIds, force) {
  const sheet = opportunitiesSheet_(), hi = headerIndex(sheet), idCol = hi.map['opencall id'] + 1;
  const dup = force ? 0 : findDuplicate(sheet, data.title, link);
  if (dup) {
    let id = String(sheet.getRange(dup, idCol).getValue());
    if (!isId_(id)) { id = newId_(); sheet.getRange(dup, idCol).setValue(id); }
    return { openCallId: id, created: false, row: dup };
  }
  const deadline = validDate_(data.deadline), id = newId_(), now = new Date();
  appendByHeader(sheet, {
    'OpenCall ID': id, 'Added On': now, 'Title': data.title || '', 'Status': confirmed ? 'Confirmed' : 'Pending',
    'Confirmed On': confirmed ? now : '', 'Verified By': confirmed ? sender : '', 'Review Stats': 'Checked by ' + sender,
    'Category': data.type || '', 'Selection Month': deadline ? Utilities.formatDate(toDate(deadline), CONFIG.TIMEZONE, 'MMM yyyy') : '',
    'Deadline': deadline ? toDate(deadline) : '', 'Application Fee': data.fee || '', 'Application Link': link,
    'Event Dates': data.event_dates || '', 'Announcement Date': data.announcement_date || '', 'Organiser': data.organiser || '',
    'Fees': feeScheduleJson_(data.fees), 'Required Docs': requiredDocsList_(data.required_docs).join(', '),
    'Location': data.location || '', 'Eligibility': data.eligibility || '', 'Medium': data.medium || '', 'Summary': data.summary || '',
    'Submitted By': sender || '', 'Source Files': sourceIds || '', 'Additional Info': data.additional || ''
  });
  const row = sheet.getLastRow();
  updateRowByHeader(sheet, row, customInboxValues_(data.custom, data.type || '', data.title || ''));
  return { openCallId: id, created: true, row: row };
}
// ---- Step 3: artist assignment and unassignment through the ArtistCall workflow ----
// Artist Profiles holds one permanent ID per artist. The old Artists tab is only read here, never written.
function artistProfilesSheet_() {
  ensureNewTabs_();
  const s = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTIST_PROFILES_TAB);
  ensureFormColumns_(s, NEW_TAB_HEADERS_.ARTIST_PROFILES);
  return s;
}
// Creates a profile for each artist on the old Artists tab that does not have one yet. Repeat runs add nothing.
function ensureArtistProfiles_() {
  const profiles = artistProfilesSheet_(), ph = headerIndex(profiles);
  const have = {};
  if (profiles.getLastRow() >= 2) profiles.getRange(2, 1, profiles.getLastRow() - 1, ph.width).getValues().forEach(function (r) { have[String(r[ph.map['artist name']]).trim().toLowerCase()] = true; });
  const old = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTS_TAB);
  const created = [];
  if (!old || old.getLastRow() < 2) return created;
  const oh = headerIndex(old), nameCol = oh.map['artist name'], linkCol = oh.map['sheet link'];
  old.getRange(2, 1, old.getLastRow() - 1, oh.width).getValues().forEach(function (r) {
    const name = String(r[nameCol] || '').trim(), link = String(r[linkCol] || '').trim();
    if (!name || !link || have[name.toLowerCase()]) return;
    appendByHeader(profiles, { 'Artist ID': newId_(), 'Artist Name': name, 'Sheet Link': link });
    have[name.toLowerCase()] = true; created.push(name);
  });
  return created;
}
function artistProfileFor_(name) {
  const profiles = artistProfilesSheet_(), ph = headerIndex(profiles);
  if (profiles.getLastRow() < 2) return null;
  const rows = profiles.getRange(2, 1, profiles.getLastRow() - 1, ph.width).getValues();
  for (let i = 0; i < rows.length; i++) { if (String(rows[i][ph.map['artist name']]).trim().toLowerCase() === String(name).trim().toLowerCase()) return { id: String(rows[i][ph.map['artist id']]), link: String(rows[i][ph.map['sheet link']]) }; }
  return null;
}
// ---- Who is meant by "this artist": the permanent Artist ID wins; a name is only accepted when it is unambiguous ----
function artistProfilesAll_() {
  const profiles = artistProfilesSheet_(), ph = headerIndex(profiles);
  if (profiles.getLastRow() < 2) return [];
  return profiles.getRange(2, 1, profiles.getLastRow() - 1, ph.width).getValues().map(function (r) {
    return { id: String(r[ph.map['artist id']] || '').trim(), name: String(r[ph.map['artist name']] || '').trim(), link: String(r[ph.map['sheet link']] || '').trim() };
  }).filter(function (p) { return p.name || p.id; });
}
function artistProfileById_(artistId) {
  const id = String(artistId || '').trim(); if (!isId_(id)) return null;
  const hits = artistProfilesAll_().filter(function (p) { return p.id === id; });
  return hits.length === 1 ? hits[0] : null;
}
function artistProfilesNamed_(name) {
  const k = String(name || '').trim().toLowerCase(); if (!k) return [];
  return artistProfilesAll_().filter(function (p) { return p.name.toLowerCase() === k; });
}
// ref = { artistId, artist }. Returns { ok: true, profile } or { ok: false, message }.
function resolveArtistRef_(ref) {
  ref = ref || {};
  const typedName = String(ref.artist || '').trim();
  let profile = null;
  if (ref.artistId) {
    profile = artistProfileById_(ref.artistId);
    if (!profile) return { ok: false, message: 'That artist could not be found. Refresh and try again.' };
    if (typedName && typedName.toLowerCase() !== profile.name.toLowerCase()) return { ok: false, message: 'The artist details do not match. Refresh and try again.' };
  } else {
    if (!typedName) return { ok: false, message: 'Pick an artist.' };
    const hits = artistProfilesNamed_(typedName);
    if (!hits.length) return { ok: false, message: 'No artist named ' + typedName + ' has a sheet linked.' };
    if (hits.length > 1) return { ok: false, message: 'More than one artist is named ' + typedName + '. Pick them from the Artists list instead.' };
    profile = hits[0];
  }
  if (!isId_(profile.id)) return { ok: false, message: 'The artist ' + profile.name + ' has no permanent ID yet. Ask the team to set up their profile.' };
  return { ok: true, profile: profile };
}
// Assign: the opportunity must exist on the Opportunities tab; the artist must have a profile with a sheet link.
// artistRef is { artistId, artist } (or just a name for older callers).
function assignArtistCall_(openCallId, artistRef, actor) {
  const ref = typeof artistRef === 'string' ? { artist: artistRef } : (artistRef || {});
  const opp = findOpportunityById_(openCallId);
  if (!opp) return { ok: false, message: 'That opportunity could not be found.' };
  if (opp.teamReview !== 'Approved to send') return { ok: false, message: 'Approve the call for sending first.' };
  ensureArtistProfiles_();
  const who = resolveArtistRef_(ref); if (!who.ok) return who;
  const profile = who.profile;
  if (!profile.link) return { ok: false, message: profile.name + ' has no sheet linked.' };
  const made = createArtistCall_(profile.id, openCallId, profile.link, profile.name, opp.title, actor);
  if (made.ok) { made.artistId = profile.id; refreshArtistsCacheSafe_(openCallId, undefined, made); }
  return made;
}
// The Artists cache is derived. If it cannot be refreshed the ArtistCall change still stands; the result carries a warning and repair finishes it.
function refreshArtistsCacheSafe_(openCallId, opts, result) {
  try { syncArtistsColumn_(openCallId, opts); }
  catch (e) { (result.warnings = result.warnings || []).push('The artist list on the call could not be refreshed. It will be corrected by the next repair.'); }
}
// Unassign: only applications that have not been sent can be removed. The Drive folder is kept.
// The ArtistCall is found by Artist ID + OpenCall ID, and its sheet comes from the index record (the same place every reader uses).
function unassignArtistCall_(openCallId, artistRef, actor) {
  const ref = typeof artistRef === 'string' ? { artist: artistRef } : (artistRef || {});
  const typedName = String(ref.artist || '').trim();
  let artistId = '', label = typedName || 'This artist';
  if (ref.artistId) {
    if (!isId_(ref.artistId)) return { ok: false, message: label + ' is not assigned to this call.' };
    artistId = String(ref.artistId).trim();
    const p = artistProfileById_(artistId);
    if (p) { if (typedName && typedName.toLowerCase() !== p.name.toLowerCase()) return { ok: false, message: 'The artist details do not match. Refresh and try again.' }; label = p.name; }
  } else {
    if (!typedName) return { ok: false, message: 'Pick an artist.' };
    const hits = artistProfilesNamed_(typedName);
    if (hits.length > 1) return { ok: false, message: 'More than one artist is named ' + typedName + '. Remove them from their own screen instead.' };
    if (!hits.length || !isId_(hits[0].id)) return { ok: false, message: typedName + ' is not assigned to this call.' };
    artistId = hits[0].id;
  }
  const index = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB);
  if (!index) return { ok: false, message: 'Nothing to remove.' };
  ensureHeaderColumns_(index, NEW_TAB_HEADERS_.ARTISTCALLS_INDEX);
  const ih = headerIndex(index), recs = pairRecords_(index, ih, artistId, openCallId), rec = recs.filter(function (r) { return isActiveState_(r.state); })[0];
  let acId, f, unassignedText;
  if (rec) {
    if (rec.state !== 'Linked') return { ok: false, message: 'Setting up ' + label + ' on this call did not finish. Assign them again to finish it first.' };
    acId = rec.acId; f = artistSheetRowFor_(rec.sheetUrl, acId);
    if (!f) return { ok: false, message: 'That application could not be found.' };
    const status = String(cellText_(f.tab, f.row, 'lifecycle status') || '').trim();
    // 3.4: a sent or progressed call can never be unassigned.
    if (cellText_(f.tab, f.row, 'sent on')) return { ok: false, message: label + ' has already been sent this call.' };
    if (cellText_(f.tab, f.row, 'applied on') || cellText_(f.tab, f.row, 'submission confirmed on') || PITCHED_STATUSES_.indexOf(status) === -1) return { ok: false, message: label + ' has already moved past the first pitch, so this call cannot be unassigned.' };
    // The index is tombstoned FIRST (it is what every reader and the write guard consult), then the artist-sheet row. Each is repeatable.
    unassignedText = stampText_(serverNow_());
    setStampCell_(index, rec.rowNum, 'Unassigned On', unassignedText);
    updateRowByHeader(index, rec.rowNum, { 'Calendar Event ID': '', 'Creation State': 'Unassigned' });
  } else {
    // No active record. A tombstone whose artist-sheet row was never finished is completed; a finished one is a duplicate request.
    const tombs = recs.filter(function (r) { return r.state === 'Unassigned'; }), t = tombs[tombs.length - 1], tf = t ? artistSheetRowFor_(t.sheetUrl, t.acId) : null;
    if (!t) return { ok: false, message: label + ' is not assigned to this call.' };
    if (!tf || String(cellText_(tf.tab, tf.row, 'lifecycle status') || '').trim() === 'Unassigned' || parseStamp_(cellText_(tf.tab, tf.row, 'restored on')) >= parseStamp_(t.unassignedOn)) return { ok: false, message: label + ' has already been unassigned from this call.' };
    acId = t.acId; f = tf; unassignedText = stampOf_(index, t.rowNum, 'unassigned on');
  }
  writeSheetTombstone_(f, unassignedText, actor);
  // The artist-sheet stamp is authoritative: if another request tombstoned the row first, adopt its stamp (index and history agree with it).
  const sheetStamp = stampOf_(f.tab, f.row, 'unassigned on');
  if (sheetStamp && sheetStamp !== unassignedText) {
    unassignedText = sheetStamp;
    const ir = pairRecords_(index, ih, artistId, openCallId).filter(function (r) { return r.acId === acId; })[0];
    if (ir) setStampCell_(index, ir.rowNum, 'Unassigned On', sheetStamp);
  }
  appendArtistCallHistory_(acId, artistId, openCallId, 'Unassigned', unassignedText, String(cellText_(f.tab, f.row, 'unassigned by') || ''));
  const prior2 = String(cellText_(f.tab, f.row, 'prior calendar event id') || ''), artistName = label, rec2 = rec || { sheetUrl: pairRecords_(index, ih, artistId, openCallId).filter(function (r) { return r.acId === acId; })[0].sheetUrl };
  // Calendar and cache are derived: a failure there never undoes the tombstone.
  const result = { ok: true, artistCallId: acId, artistId: artistId, artistName: artistName, sheetUrl: rec2.sheetUrl, tombstoned: true, unassignedOn: unassignedText, message: 'Removed ' + artistName + ' from this call.' };
  try { removeArtistCallEvent_(acId, prior2); } catch (e) { (result.warnings = result.warnings || []).push('The calendar entry could not be removed. It will be removed by the next repair.'); }
  refreshArtistsCacheSafe_(openCallId, { removed: [{ id: artistId, name: artistName, link: rec2.sheetUrl }] }, result);
  return result;
}
function findOpportunityById_(openCallId) {
  const s = opportunitiesSheet_(), h = headerIndex(s);
  if (s.getLastRow() < 2) return null;
  const rows = s.getRange(2, 1, s.getLastRow() - 1, h.width).getValues();
  for (let i = 0; i < rows.length; i++) { if (String(rows[i][h.map['opencall id']]) === String(openCallId)) return { row: i + 2, title: String(rows[i][h.map['title']] || ''), teamReview: String(rows[i][h.map['team review']] || '').trim() }; }
  return null;
}
// The Artists column on the Opportunities tab is a DERIVED DISPLAY CACHE (the legacy list screens still read it), never the
// record. This keeps it in step with the ArtistCalls index for ONE opportunity, by Artist ID, without ever merging people by name:
//  - Names in the cell that no ArtistCall owns are legacy-only and are kept (until explicitly migrated or retired).
//  - Every active ArtistCall is shown under its artist's CURRENT profile name; a rename replaces the old name in place.
//  - 'Artists Cache Map' (JSON [{id,name,legacy?}]) remembers which entries are ID-backed, so a rename or removal affects only
//    that entry. 'legacy' marks an ID-backed name that is also a legacy assignment: it stays when the ArtistCall is removed.
//  - A name shared by more than one profile is ambiguous: it is never merged with anything and never guessed away.
//  - Case-insensitive repeats are shown once only when the name belongs to exactly one profile.
// opts.removed = [{ id, name, link }]: artists just taken off this call (used for caches written before the map existed).
function syncArtistsColumn_(openCallId, opts) {
  opts = opts || {};
  const opp = findOpportunityById_(openCallId); if (!opp) return false;
  const lc = function (v) { return String(v == null ? '' : v).trim().toLowerCase(); };
  const s = opportunitiesSheet_(), h = headerIndex(s), row = opp.row, aCol = h.map['artists'] + 1, mCol = h.map['artists cache map'] + 1;
  const rawNames = String(s.getRange(row, aCol).getValue() || ''), rawMap = String(s.getRange(row, mCol).getValue() || '');
  const cur = splitNames(rawNames); let prev = [];
  try { const v = JSON.parse(rawMap || '[]'); if (Array.isArray(v)) prev = v.filter(function (e) { return e && isId_(e.id) && String(e.name || '').trim(); }); } catch (e) { prev = []; }
  const profiles = artistProfilesAll_(), byId = {}, nameCount = {};
  profiles.forEach(function (p) { if (isId_(p.id)) byId[p.id] = p; const k = lc(p.name); if (k) nameCount[k] = (nameCount[k] || 0) + 1; });
  const removed = {}; (opts.removed || []).forEach(function (r) { if (r && r.id) removed[String(r.id)] = r; });
  // Active ArtistCalls for this opportunity, in index order.
  const active = [], seenIds = {}, index = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB);
  if (index && index.getLastRow() >= 2) {
    const ih = headerIndex(index);
    index.getRange(2, 1, index.getLastRow() - 1, ih.width).getValues().forEach(function (r) {
      if (String(r[ih.map['opencall id']]) !== String(openCallId) || String(r[ih.map['creation state']] || '').trim() === 'Unassigned') return;
      const id = String(r[ih.map['artist id']] || '').trim(); if (!isId_(id) || removed[id] || seenIds[id]) return;
      const p = byId[id], before = prev.filter(function (e) { return e.id === id; })[0], name = p ? p.name : (before ? before.name : '');
      if (!name) return; seenIds[id] = true; active.push({ id: id, name: name });
    });
  }
  const activeById = {}; active.forEach(function (e) { activeById[e.id] = e; });
  const queue = {}; prev.forEach(function (e) { (queue[lc(e.name)] = queue[lc(e.name)] || []).push(e); });
  const placed = {}, out = [];
  cur.forEach(function (n) {
    const q = queue[lc(n)];
    if (q && q.length) {
      const e = q.shift(), a = activeById[e.id];
      if (a && !placed[e.id]) { out.push({ name: a.name, id: e.id, legacy: !!e.legacy }); placed[e.id] = true; }
      else if (!a && e.legacy) out.push({ name: n, id: '' });   // the ArtistCall is gone but a legacy assignment of the same name remains
      return;
    }
    out.push({ name: n, id: '' });
  });
  active.forEach(function (e) { if (!placed[e.id]) { out.push({ name: e.name, id: e.id, legacy: false }); placed[e.id] = true; } });
  // Names just removed from a cache that has no map entry for them: drop the plain entry only when it is provably theirs.
  Object.keys(removed).forEach(function (id) {
    const r = removed[id], k = lc(r.name); if (!k || prev.some(function (e) { return e.id === id; })) return;
    if ((nameCount[k] || 0) !== 1) return;                   // ambiguous: never guess
    let legacyRow = true; try { const t = openTab(String(r.link || '')), title = String(opp.title || ''), l = String(oppRowFields_(row)['application link'] || ''); legacyRow = findDuplicate(t, title, l) > 0; } catch (e) { legacyRow = true; }
    if (legacyRow) return;                                   // a legacy row still exists: the name stays as legacy-only
    for (let i = 0; i < out.length; i++) { if (!out[i].id && lc(out[i].name) === k) { out.splice(i, 1); break; } }
  });
  // Show a repeated name once only when it belongs to exactly one profile; legacy duplicates of an ID-backed name fold into it.
  const idByName = {}; out.forEach(function (x) { if (x.id) idByName[lc(x.name)] = x; });
  const finalOut = [], seenLegacy = {};
  out.forEach(function (x) {
    if (!x.id) {
      const k = lc(x.name), one = (nameCount[k] || 0) === 1;
      if (one && idByName[k]) { idByName[k].legacy = true; return; }
      if (one && seenLegacy[k]) return;
      if (one) seenLegacy[k] = true;
    }
    finalOut.push(x);
  });
  const newNames = finalOut.map(function (x) { return x.name; }).join(', ');
  const mapArr = finalOut.filter(function (x) { return x.id; }).map(function (x) { const o = { id: x.id, name: x.name }; if (x.legacy) o.legacy = true; return o; });
  const newMap = mapArr.length ? JSON.stringify(mapArr) : '';
  if (newNames !== rawNames) s.getRange(row, aCol).setValue(newNames);
  if (newMap !== (rawMap === '[]' ? '' : rawMap)) s.getRange(row, mCol).setValue(newMap);
  return true;
}
// ---- Application Detail on the new records (keyed by permanent IDs only) ----
function oppRowFields_(row) {
  const s = opportunitiesSheet_(), h = headerIndex(s), vals = s.getRange(row, 1, 1, h.width).getValues()[0], o = {};
  Object.keys(h.map).forEach(function (k) { o[k] = vals[h.map[k]]; });
  return o;
}
function dateYmd_(v) { return v instanceof Date ? Utilities.formatDate(v, CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(v || ''); }
// Finds the index record for an ArtistCall ID. Returns null when it does not exist (retired or never created).
function indexRecordById_(acId) {
  const index = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB);
  if (!index || index.getLastRow() < 2 || !acId) return null;
  const ih = headerIndex(index), rows = index.getRange(2, 1, index.getLastRow() - 1, ih.width).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][ih.map['artistcall id']]) === String(acId)) return { artistCallId: String(acId), artistId: String(rows[i][ih.map['artist id']]), openCallId: String(rows[i][ih.map['opencall id']]), sheetUrl: String(rows[i][ih.map['artist sheet id']]), folderId: String(rows[i][ih.map['application folder id']] || ''), state: String(rows[i][ih.map['creation state']] || '').trim() };
  }
  return null;
}
// Finds the index record for an artist and an opportunity, using their IDs.
function indexRecordFor_(artistId, openCallId) {
  const index = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB);
  if (!index || index.getLastRow() < 2) return null;
  const ih = headerIndex(index), rows = index.getRange(2, 1, index.getLastRow() - 1, ih.width).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][ih.map['artist id']]) === String(artistId) && String(rows[i][ih.map['opencall id']]) === String(openCallId) && isActiveState_(String(rows[i][ih.map['creation state']] || '').trim())) return indexRecordById_(rows[i][ih.map['artistcall id']]);
  }
  return null;
}
// Builds the detail the screen expects, from the Opportunities row and the artist's ArtistCalls row.
function artistCallDetailById_(acId) {
  const rec = indexRecordById_(acId); if (!rec) return null;
  const tab = SpreadsheetApp.openByUrl(rec.sheetUrl).getSheetByName(CONFIG.ARTISTCALLS_TAB); if (!tab || tab.getLastRow() < 2) return null;
  const th = headerIndex(tab), rows = tab.getRange(2, 1, tab.getLastRow() - 1, th.width).getValues();
  let a = null;
  for (let i = 0; i < rows.length; i++) { if (String(rows[i][th.map['artistcall id']]) === String(acId)) { a = {}; Object.keys(th.map).forEach(function (k) { a[k] = rows[i][th.map[k]]; }); break; } }
  const opp = findOpportunityById_(rec.openCallId); if (!a || !opp) return null;
  const artistRowIdx = rows.findIndex(function (r) { return String(r[th.map['artistcall id']]) === String(acId); }) + 2;
  const o = oppRowFields_(opp.row), status = String(a['lifecycle status'] || '').trim(), sentOn = dateYmd_(a['sent on']);
  // The response the screen shows, in the exact words it compares against. Once an application moves past Interested,
  // the response stays "Interested" as long as the Interested date was recorded.
  const artistResponse = status === 'Pitched — Need More Info' ? 'Wants more info' : status === 'Not Interested' ? 'Not Interested'
    : (status === 'Interested' || (a['interested on'] && ['Application', 'Application Sent', 'Accepted', 'Declined'].indexOf(status) !== -1)) ? 'Interested' : '';
  const state = computeArtistCallState_({ sentOn: sentOn, status: status, artistResponse: artistResponse });
  const deadline = dateYmd_(o['deadline']), req = requiredDocsList_(o['required docs']), tombstoned = status === 'Unassigned' || rec.state === 'Unassigned';
  return { ok: true, call: {
    tombstoned: tombstoned, readOnly: tombstoned, unassignedOn: String(a['unassigned on'] || ''), unassignedBy: String(a['unassigned by'] || ''), restoredOn: String(a['restored on'] || ''), restoredBy: String(a['restored by'] || ''),
    artistCallId: String(acId), artistId: rec.artistId, openCallId: rec.openCallId,
    title: String(o['title'] || ''), deadline: deadline, fee: String(o['application fee'] || ''), link: String(o['application link'] || ''),
    organiser: String(o['organiser'] || ''), eligibility: String(o['eligibility'] || ''), category: String(o['category'] || ''),
    handoffOn: dateYmd_(a['handoff on']), sentOn: sentOn, artistResponse: artistResponse, status: status,
    paid: String(a['payment status'] || ''), appliedOn: dateYmd_(a['applied on']), submittedDocs: '', comments: String(a['comments on applications'] || ''),
    step: state.step, bucket: state.bucket, expired: isExpired_(deadline, state.step),
    responseUpdatedOn: '', responseUpdatedBy: '', responseComment: String(a['response comment'] || ''),
    custom: artistCustomFromSheet_(tab, artistRowIdx), assignedTo: String(a['assigned to'] || ''), dueOn: dateYmd_(a['due on']), artworks: String(a['artworks'] || ''),
    payments: parseFeeList_(a['payments']), fees: parseFeeList_(o['fees']), organiserEmail: String(o['organiser email'] || ''),
    requiredDocs: req, docs: docsChecklist_(req, a['docs checklist'] || ''), applicationFolder: rec.folderId
  } };
}
// Screen entry point: the opportunity row plus the artist name. Keyed by IDs, so a row or name alone never matches an old record.
function artistCallDetailForRow_(rowNum, artistName) {
  const s = getInbox(); if (!(rowNum >= 2 && rowNum <= s.getLastRow()) || !artistName) return null;
  const h = headerIndex(s), openCallId = String(s.getRange(rowNum, h.map['opencall id'] + 1).getValue() || '');
  const profile = artistProfileFor_(artistName); if (!openCallId || !profile) return null;
  const rec = indexRecordFor_(profile.id, openCallId); if (!rec) return null;
  return artistCallDetailById_(rec.artistCallId);
}
// ---- Step 4: Application Detail actions by ArtistCall ID ----
// Finds the ArtistCalls row for an ID. Returns null if the application does not exist.
function artistCallRowById_(acId) {
  const rec = indexRecordById_(acId); if (!rec) return null;
  const tab = SpreadsheetApp.openByUrl(rec.sheetUrl).getSheetByName(CONFIG.ARTISTCALLS_TAB); if (!tab) return null;
  ensureHeaderColumns_(tab, NEW_TAB_HEADERS_.ARTISTCALLS);
  const th = headerIndex(tab);
  if (tab.getLastRow() < 2) return null;
  const ids = tab.getRange(2, th.map['artistcall id'] + 1, tab.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === String(acId)) return { rec: rec, tab: tab, row: i + 2, th: th }; }
  return null;
}
// 3.2 Write guard. EVERY writer goes through this. It refuses, before any status rule and before any write, a record with no
// valid artist ("no valid artist") and a tombstone ("unassigned, read-only"). Reads (detail, history) stay allowed.
function artistCallRowForWrite_(acId) {
  const f = artistCallRowById_(acId); if (!f) return { ok: false, message: 'That application could not be found.' };
  const rowArtist = String(f.tab.getRange(f.row, f.th.map['artist id'] + 1).getValue() || '').trim(), status = String(f.tab.getRange(f.row, f.th.map['lifecycle status'] + 1).getValue() || '').trim();
  if (!isId_(rowArtist) || !artistProfileById_(rowArtist) || rowArtist !== f.rec.artistId) return { ok: false, message: 'This application has no valid artist, so it cannot be changed. Ask the team to fix it.' };
  if (status === 'Unassigned' || f.rec.state === 'Unassigned') return { ok: false, message: 'This application is unassigned and read-only.' };
  return f;
}
// Lifecycle status for each response the screen can record. The approved status names are used throughout.
const RESPONSE_TO_STATUS_ = { 'Interested': 'Interested', 'Not Interested': 'Not Interested', 'Wants more info': 'Pitched — Need More Info', 'No response yet': 'Pitched — Awaiting Response' };
function markSentById_(acId, actor) {
  const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
  const sentCol = f.th.map['sent on'], current = f.tab.getRange(f.row, sentCol + 1).getValue();
  if (!current) { updateRowByHeader(f.tab, f.row, { 'Sent On': new Date() }); recordApproval_('send', 'artistcall|' + acId, '', actor || ''); }
  return { ok: true, message: 'Marked as sent.' };
}
function recordResponseById_(acId, response, actor) {
  if (!Object.prototype.hasOwnProperty.call(RESPONSE_TO_STATUS_, response)) return { ok: false, message: 'Invalid response.' };
  const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
  const now = new Date(), values = { 'Lifecycle Status': RESPONSE_TO_STATUS_[response], 'Response Updated On': now, 'Response Updated By': actor || '' };
  if (response === 'Interested' && !f.tab.getRange(f.row, f.th.map['interested on'] + 1).getValue()) values['Interested On'] = now;
  updateRowByHeader(f.tab, f.row, values);
  setArtistCallEvent_(acId);
  return { ok: true, message: 'Response recorded.' };
}
function commentById_(acId, comment, actor) {
  const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
  updateRowByHeader(f.tab, f.row, { 'Response Comment': String(comment || '').slice(0, 2000), 'Response Updated On': new Date(), 'Response Updated By': actor || '' });
  return { ok: true, message: 'Comment saved.' };
}
// The fields shown on the open call for this artist (custom fields for the call's category).
function saveFieldsById_(acId, b) {
  const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
  const opp = findOpportunityById_(f.rec.openCallId); if (!opp) return { ok: false, message: 'That opportunity could not be found.' };
  const o = oppRowFields_(opp.row);
  const values = artistCustomValues_(b.custom, String(o['category'] || ''), String(o['title'] || ''));
  ensureHeaderColumns_(f.tab, Object.keys(values));
  updateRowByHeader(f.tab, f.row, values);
  return { ok: true, message: 'Details saved.' };
}
// ---- Step 5: Edit application details, payment proof, and payment status, by ArtistCall ID ----
// Payment Status (approved values only): Not Required (no fees), Paid (every fee paid), otherwise Pending.
// It changes only when the team marks fees paid, never because a file was uploaded.
function paymentStatusFor_(payments) {
  if (!payments || !payments.length) return 'Not Required';
  return payments.every(function (p) { return !!p.paid; }) ? 'Paid' : 'Pending';
}
// Old application statuses map onto the approved Lifecycle Status. The original value is kept in Application Status.
function lifecycleFor_(status, sentOn) {
  if (status === 'Accepted') return 'Accepted';
  if (status === 'Declined' || status === 'Not Selected') return 'Declined';
  if (status === 'Not Moving Forward') return 'Not Interested';
  if (status === 'Applied' || status === 'In Progress' || status === 'On Hold') return 'Application';
  return sentOn ? 'Application Sent' : 'Pitched — Awaiting Response';
}
function updateDetailsById_(acId, b) {
  const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
  const d = b.details || {}, fields = {};
  if (d.status !== undefined) fields['Application Status'] = String(d.status);
  if (d.appliedOn !== undefined) fields['Applied On'] = String(d.appliedOn);
  if (d.submittedDocs !== undefined) fields['Submitted Docs'] = String(d.submittedDocs);
  if (d.comments !== undefined) fields['Comments on Applications'] = String(d.comments);
  if (d.dueOn !== undefined) fields['Due On'] = String(d.dueOn);
  if (d.artworks !== undefined) fields['Artworks'] = String(d.artworks).slice(0, 5000);
  if (d.assignedTo !== undefined) {
    const assignee = String(d.assignedTo).trim();
    if (assignee && p2_getPeople().people.map(function (p) { return p.name; }).indexOf(assignee) === -1) return { ok: false, message: assignee + ' is not in Manage people. Add them there first.' };
    fields['Assigned To'] = assignee.slice(0, 60);
  }
  if (d.payments !== undefined) {
    const payments = parseFeeList_(JSON.stringify(d.payments));
    fields['Payments'] = JSON.stringify(payments);
    fields['Paid'] = paymentSummary_(payments);
    fields['Payment Status'] = paymentStatusFor_(payments);
  }
  if (d.status !== undefined) {
    const sentOn = f.tab.getRange(f.row, f.th.map['sent on'] + 1).getValue();
    fields['Lifecycle Status'] = lifecycleFor_(String(d.status), sentOn);
    if (d.status === 'Applied') { const current = f.tab.getRange(f.row, f.th.map['applied on'] + 1).getValue(); if (!current && !fields['Applied On']) fields['Applied On'] = new Date(); }
  }
  if (!Object.keys(fields).length) return { ok: true, message: 'Nothing to save.' };
  ensureHeaderColumns_(f.tab, Object.keys(fields));
  updateRowByHeader(f.tab, f.row, fields);
  if (fields['Lifecycle Status']) setArtistCallEvent_(acId);
  return { ok: true, message: 'Application details saved.' };
}
// Proof of payment goes in this application's own folder (the decision recorded earlier). It does not change Payment Status.
function uploadProofById_(acId, b) {
  const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
  const mime = String(b.mimeType || '');
  if (!/^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(mime)) return { ok: false, message: 'Upload a photo, a screenshot or a PDF.' };
  const bytes = Utilities.base64Decode(String(b.data || ''));
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) return { ok: false, message: 'That file is too big. Keep it under 5 MB.' };
  if (!f.rec.folderId) return { ok: false, message: 'This application has no folder yet. Try again shortly.' };
  const folder = childFolder_(DriveApp.getFolderById(f.rec.folderId), 'Payments');
  const file = folder.createFile(Utilities.newBlob(bytes, mime, safeFolderName_(b.name || 'proof')));
  return { ok: true, url: file.getUrl(), name: file.getName() };
}
// ---- Calendar: one event per artist application, created when the artist becomes Interested ----
// Rules: create at Interested; keep through Application and later; remove only on Not Interested (withdrawal) or unassignment.
// Never created from opportunity saves or team approval. Each event holds one artist only.
const CAL_KEEP_STATUSES_ = ['Interested', 'Application', 'Application Sent', 'Accepted', 'Declined'];
function artistCallEventTitle_(artistName, oppTitle) { return artistName + ' – ' + oppTitle; }
function findEventForArtistCall_(cal, acId, day) {
  const evs = cal.getEventsForDay(day) || [];
  for (let i = 0; i < evs.length; i++) { if (evs[i].getTag('artistCallId') === String(acId)) return evs[i]; }
  return null;
}
// Brings the calendar in line with one application's current status. Safe to repeat.
function setArtistCallEvent_(acId) {
  const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
  const status = String(f.tab.getRange(f.row, f.th.map['lifecycle status'] + 1).getValue() || '');
  const idCol = f.th.map['calendar event id'] + 1;
  const existingId = String(f.tab.getRange(f.row, idCol).getValue() || '');
  const cal = getCalendar();
  const opp = findOpportunityById_(f.rec.openCallId); if (!opp) return { ok: false, message: 'That opportunity could not be found.' };
  const o = oppRowFields_(opp.row);
  const artistName = String(artistProfileNameById_(f.rec.artistId) || '');
  if (status === 'Not Interested') {
    if (existingId) { const ev = cal.getEventById(existingId); if (ev) ev.deleteEvent(); }
    if (existingId) { f.tab.getRange(f.row, idCol).setValue(''); updateRowByValueSafe_(f.rec.artistCallId, { 'Calendar Event ID': '' }); }
    return { ok: true, message: 'Calendar entry removed.' };
  }
  if (CAL_KEEP_STATUSES_.indexOf(status) === -1) return { ok: true, message: 'No calendar entry at this stage.' };
  const deadline = validDate_(dateYmd_(o['deadline'])); if (!deadline) return { ok: false, message: 'This opportunity has no deadline, so no calendar entry was made.' };
  const day = toDate(deadline);
  let ev = existingId ? cal.getEventById(existingId) : null;
  if (!ev) ev = findEventForArtistCall_(cal, acId, day);
  if (ev) {
    ev.setTitle(artistCallEventTitle_(artistName, String(o['title'] || '')));
    ev.setDescription('Artist: ' + artistName + '\nOpen call: ' + String(o['title'] || '') + '\nApplication link: ' + String(o['application link'] || ''));
  } else {
    ev = cal.createAllDayEvent(artistCallEventTitle_(artistName, String(o['title'] || '')), day, { description: 'Artist: ' + artistName + '\nOpen call: ' + String(o['title'] || '') + '\nApplication link: ' + String(o['application link'] || '') });
    ev.setTag('artistCallId', String(acId));
    ev.removeAllReminders();
  }
  const newId = ev.getId();
  if (newId !== existingId) { f.tab.getRange(f.row, idCol).setValue(newId); updateRowByValueSafe_(f.rec.artistCallId, { 'Calendar Event ID': newId }); }
  return { ok: true, calendarEventId: newId, message: 'Calendar entry saved.' };
}
function artistProfileNameById_(artistId) {
  const profiles = artistProfilesSheet_(), ph = headerIndex(profiles);
  if (profiles.getLastRow() < 2) return '';
  const rows = profiles.getRange(2, 1, profiles.getLastRow() - 1, ph.width).getValues();
  for (let i = 0; i < rows.length; i++) { if (String(rows[i][ph.map['artist id']]) === String(artistId)) return String(rows[i][ph.map['artist name']]); }
  return '';
}
// Writes the calendar ID to the central index for this application.
function updateRowByValueSafe_(acId, values) {
  const index = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB);
  return index ? updateRowByHeaderValue_(index, 'artistcall id', acId, values) : false;
}
// Removes this application's calendar entry, if it has one (used on unassignment).
function removeArtistCallEvent_(acId, existingId) {
  if (!existingId) return;
  const ev = getCalendar().getEventById(existingId); if (ev) ev.deleteEvent();
}
// ---- Artist Pipeline data: the five approved sections, grouped by Lifecycle Status (never Working Stage) ----
const PIPELINE_SECTIONS_ = [
  { key: 'pitched', title: 'Pitched', statuses: ['Pitched — Awaiting Response', 'Pitched — Need More Info'] },
  { key: 'interested', title: 'Interested', statuses: ['Interested'] },
  { key: 'application', title: 'Application', statuses: ['Application'] },
  { key: 'applicationSent', title: 'Application Sent', statuses: ['Application Sent'] },
  { key: 'outcome', title: 'Outcome', statuses: ['Accepted', 'Declined'] }
];
function pipelineSectionFor_(status) {
  for (let i = 0; i < PIPELINE_SECTIONS_.length; i++) { if (PIPELINE_SECTIONS_[i].statuses.indexOf(status) !== -1) return PIPELINE_SECTIONS_[i].key; }
  return null;
}
// ArtistCall IDs whose index record is a tombstone.
function tombstonedIds_() {
  const out = {}, index = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB); if (!index || index.getLastRow() < 2) return out;
  const ih = headerIndex(index);
  index.getRange(2, 1, index.getLastRow() - 1, ih.width).getValues().forEach(function (r) { if (String(r[ih.map['creation state']] || '').trim() === 'Unassigned') out[String(r[ih.map['artistcall id']])] = true; });
  return out;
}
// Read-only history for one opportunity or one artist: every ArtistCall (active and tombstoned) with both stamps and its events.
function artistCallHistory_(b) {
  const openCallId = String(b.openCallId || '').trim(), artistId = String(b.artistId || '').trim();
  if (!openCallId && !artistId) return { ok: false, message: 'Say which opportunity or which artist.' };
  const index = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB); if (!index || index.getLastRow() < 2) return { ok: true, records: [] };
  const ih = headerIndex(index), hist = SpreadsheetApp.getActive().getSheetByName(ARTISTCALL_HISTORY_TAB_), evs = {};
  if (hist && hist.getLastRow() >= 2) { const hh = headerIndex(hist); hist.getRange(2, 1, hist.getLastRow() - 1, hh.width).getValues().forEach(function (r) { const id = String(r[hh.map['artistcall id']]); (evs[id] = evs[id] || []).push({ event: String(r[hh.map['event']]), at: String(r[hh.map['at']]), by: String(r[hh.map['by']]) }); }); }
  const records = [];
  index.getRange(2, 1, index.getLastRow() - 1, ih.width).getValues().forEach(function (r) {
    if (openCallId && String(r[ih.map['opencall id']]) !== openCallId) return; if (artistId && String(r[ih.map['artist id']]) !== artistId) return;
    const id = String(r[ih.map['artistcall id']]), f = artistSheetRowFor_(String(r[ih.map['artist sheet id']] || ''), id), state = String(r[ih.map['creation state']] || '').trim();
    const rec = { artistCallId: id, artistId: String(r[ih.map['artist id']]), openCallId: String(r[ih.map['opencall id']]), state: state, status: state === 'Unassigned' ? 'Unassigned' : (f ? String(cellText_(f.tab, f.row, 'lifecycle status')) : ''), unassignedOn: '', unassignedBy: '', restoredOn: '', restoredBy: '', events: evs[id] || [] };
    if (f) { rec.unassignedOn = stampOf_(f.tab, f.row, 'unassigned on'); rec.unassignedBy = String(cellText_(f.tab, f.row, 'unassigned by') || ''); rec.restoredOn = stampOf_(f.tab, f.row, 'restored on'); rec.restoredBy = String(cellText_(f.tab, f.row, 'restored by') || ''); }
    records.push(rec);
  });
  return { ok: true, records: records };
}
// Every ArtistCall across all artist sheets, with its opportunity and artist names. Read-only.
function p2_getArtistPipeline() {
  const profiles = artistProfilesSheet_(), ph = headerIndex(profiles);
  const sections = {}; PIPELINE_SECTIONS_.forEach(function (s) { sections[s.key] = []; });
  let notInPipeline = 0;
  if (profiles.getLastRow() < 2) return { ok: true, sections: PIPELINE_SECTIONS_.map(function (s) { return { key: s.key, title: s.title, items: [] }; }), notInPipeline: 0 };
  const oppCache = {}, tomb = tombstonedIds_();
  profiles.getRange(2, 1, profiles.getLastRow() - 1, ph.width).getValues().forEach(function (pr) {
    const artistId = String(pr[ph.map['artist id']]), artistName = String(pr[ph.map['artist name']]), link = String(pr[ph.map['sheet link']] || '');
    if (!artistId || !link) return;
    let tab = null; try { tab = SpreadsheetApp.openByUrl(link).getSheetByName(CONFIG.ARTISTCALLS_TAB); } catch (e) { return; }
    if (!tab || tab.getLastRow() < 2) return;
    const th = headerIndex(tab);
    tab.getRange(2, 1, tab.getLastRow() - 1, th.width).getValues().forEach(function (r) {
      const acId = String(r[th.map['artistcall id']] || ''), ocId = String(r[th.map['opencall id']] || '');
      if (!acId || String(r[th.map['artist id']]) !== artistId) return;
      const status = String(r[th.map['lifecycle status']] || '');
      if (status === 'Unassigned' || tomb[acId]) return;      // history, not part of the pipeline
      const key = pipelineSectionFor_(status);
      if (!key) { notInPipeline++; return; }
      if (!oppCache[ocId]) { const opp = findOpportunityById_(ocId); oppCache[ocId] = opp ? oppRowFields_(opp.row) : {}; }
      const o = oppCache[ocId];
      sections[key].push({ artistCallId: acId, artistId: artistId, openCallId: ocId, artist: artistName, opportunity: String(o['title'] || ''), deadline: dateYmd_(o['deadline']), status: status, sentOn: dateYmd_(r[th.map['sent on']]), paymentStatus: String(r[th.map['payment status']] || ''), assignedTo: String(r[th.map['assigned to']] || '') });
    });
  });
  return { ok: true, sections: PIPELINE_SECTIONS_.map(function (s) { return { key: s.key, title: s.title, items: sections[s.key] }; }), notInPipeline: notInPipeline };
}
// ---- Application Sent: only by explicit team confirmation of submission ----
// Documents, payments, checklists and Working Stage never change this status.
function confirmSubmissionById_(acId, actor) {
  const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
  const status = String(f.tab.getRange(f.row, f.th.map['lifecycle status'] + 1).getValue() || '');
  if (status !== 'Application') return { ok: false, message: 'Only an application that is in progress can be confirmed as submitted.' };
  const now = new Date();
  const values = { 'Lifecycle Status': 'Application Sent', 'Submission Confirmed On': now, 'Submission Confirmed By': actor || '' };
  ensureHeaderColumns_(f.tab, Object.keys(values));
  updateRowByHeader(f.tab, f.row, values);
  return { ok: true, message: 'Marked as submitted.' };
}
// Legacy-path guards (spec section 2). Records for an opportunity (any state) / for a named artist on it.
function artistCallsExistFor_(openCallId, artistName) {
  const index = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB); if (!index || index.getLastRow() < 2 || !openCallId) return [];
  const ih = headerIndex(index), hits = artistName ? artistProfilesNamed_(artistName).map(function (p) { return p.id; }) : null, out = [];
  index.getRange(2, 1, index.getLastRow() - 1, ih.width).getValues().forEach(function (r) {
    if (String(r[ih.map['opencall id']]) !== String(openCallId)) return;
    if (hits && hits.indexOf(String(r[ih.map['artist id']])) === -1) return;
    out.push({ state: String(r[ih.map['creation state']] || '').trim() });
  });
  return out;
}
// ---- Repair (spec 3.8): run by hand from the Apps Script editor, never reachable from the web app ----
// previewRepairArtistCalls() only reports. runRepairArtistCalls() finishes interrupted work: it resumes unfinished creations, rebuilds a
// missing index record from its sheet row, completes half-done tombstones and restorations, removes leftover calendar entries and refreshes the
// derived cache. It NEVER creates a new ArtistCall, never reactivates a tombstone, never guesses an artist; what it cannot decide is reported in
// needsHuman. Two active records for one artist and call: it stops and writes nothing. The log gets counts only. Running it again changes nothing.
function previewRepairArtistCalls() { return repairLogged_(repairArtistCalls_(false)); }
function runRepairArtistCalls() { return withLock_(function () { return guard_('Repair ArtistCalls', {}, function () { return repairLogged_(repairArtistCalls_(true)); }); }); }
function repairLogged_(r) {
  Logger.log(!r.ok ? 'Repair ArtistCalls — ' + (r.apply ? 'APPLY' : 'PREVIEW') + ' REFUSED. ' + r.message
    : 'Repair ArtistCalls — ' + (r.apply ? 'APPLIED' : 'PREVIEW (nothing was written)') + ': ' + r.fixed + (r.apply ? ' fixed' : ' to fix') + ', ' + r.needsHuman.length + ' need a person');
  return r;
}
function repairArtistCalls_(apply) {
  const ss = SpreadsheetApp.getActive(), index = ss.getSheetByName(CONFIG.ARTISTCALLS_INDEX_TAB), res = { ok: true, apply: apply, fixed: 0, needsHuman: [] };
  if (!index || index.getLastRow() < 2) return res;
  if (apply) ensureHeaderColumns_(index, NEW_TAB_HEADERS_.ARTISTCALLS_INDEX);
  const ih = headerIndex(index), g = function (r, h) { return ih.map[h] === undefined ? '' : r[ih.map[h]]; };
  const recs = index.getRange(2, 1, index.getLastRow() - 1, ih.width).getValues().map(function (r, i) {
    return { rowNum: i + 2, acId: String(g(r, 'artistcall id')), artistId: String(g(r, 'artist id')).trim(), openCallId: String(g(r, 'opencall id')), sheetUrl: String(g(r, 'artist sheet id')), state: String(g(r, 'creation state') || '').trim(), unassignedOn: g(r, 'unassigned on'), folderId: String(g(r, 'application folder id') || '') };
  }).filter(function (x) { return x.acId || x.artistId; });
  const seen = {};
  for (let i = 0; i < recs.length; i++) { const x = recs[i]; if (!isActiveState_(x.state) || !isId_(x.artistId)) continue; const k = x.artistId + '|' + x.openCallId; if (seen[k]) return { ok: false, apply: apply, fixed: 0, needsHuman: [], message: 'Two active records exist for the same artist and call. Nothing was changed. A person must decide which to keep.' }; seen[k] = true; }
  const profiles = {}; artistProfilesAll_().forEach(function (p) { profiles[p.id] = p; });
  const fix = function (fn) { res.fixed++; if (apply) fn(); }, need = function (x, problem) { res.needsHuman.push({ artistCallId: x.acId, problem: problem }); };
  const hist = ss.getSheetByName(ARTISTCALL_HISTORY_TAB_), histKeys = {};
  if (hist && hist.getLastRow() >= 2) hist.getRange(2, 1, hist.getLastRow() - 1, 1).getValues().forEach(function (r) { histKeys[String(r[0])] = true; });
  const known = {};
  recs.forEach(function (x) {
    known[x.acId] = true;
    const p = profiles[x.artistId];
    if (!isId_(x.artistId) || !p) { need(x, 'The record has no valid artist.'); return; }
    if (!isId_(x.openCallId) || !findOpportunityById_(x.openCallId)) { need(x, 'The record points at an opportunity that does not exist.'); return; }
    if (x.state === 'Pending' || x.state === 'SheetRow') { fix(function () { createArtistCall_(p.id, x.openCallId, p.link, p.name, '', ''); }); return; }
    const f = x.sheetUrl ? artistSheetRowFor_(x.sheetUrl, x.acId, true) : null;
    if (f && !isId_(String(cellText_(f.tab, f.row, 'artist id') || '').trim())) { need(x, 'The row in the artist sheet has no valid artist.'); return; }
    const status = f ? String(cellText_(f.tab, f.row, 'lifecycle status') || '').trim() : '';
    if (x.state === 'Linked') {
      if (!f) { need(x, 'The record says it is active but its row in the artist sheet is gone.'); return; }
      if (status === 'Unassigned') { fix(function () { setStampCell_(index, x.rowNum, 'Unassigned On', stampOf_(f.tab, f.row, 'unassigned on')); updateRowByHeader(index, x.rowNum, { 'Calendar Event ID': '', 'Creation State': 'Unassigned' }); }); return; }
      if (CAL_KEEP_STATUSES_.indexOf(status) !== -1 && !String(cellText_(f.tab, f.row, 'calendar event id') || '').trim()) need(x, 'Interested or later, but there is no calendar entry.');
      return;
    }
    if (x.state === 'Unassigned' && f) {
      const idxStamp = x.unassignedOn instanceof Date ? x.unassignedOn.toISOString() : String(x.unassignedOn || '');
      if (status !== 'Unassigned') {
        const un = parseStamp_(cellText_(f.tab, f.row, 'unassigned on')), re = parseStamp_(cellText_(f.tab, f.row, 'restored on'));
        if (un !== null && re !== null && re >= un) fix(function () { setStampCell_(index, x.rowNum, 'Restored On', stampOf_(f.tab, f.row, 'restored on')); appendArtistCallHistory_(x.acId, x.artistId, x.openCallId, 'Restored', stampOf_(f.tab, f.row, 'restored on'), String(cellText_(f.tab, f.row, 'restored by') || '')); updateRowByHeader(index, x.rowNum, { 'Creation State': 'Linked' }); });
        else fix(function () { writeSheetTombstone_(f, parseStamp_(idxStamp) === null ? '' : idxStamp, ''); });
        return;
      }
      const live = String(cellText_(f.tab, f.row, 'calendar event id') || '').trim(), prior = String(cellText_(f.tab, f.row, 'prior calendar event id') || '').trim();
      if (live) fix(function () { if (!prior) updateRowByHeader(f.tab, f.row, { 'Prior Calendar Event ID': live }); updateRowByHeader(f.tab, f.row, { 'Calendar Event ID': '' }); try { removeArtistCallEvent_(x.acId, live); } catch (e) { /* reported again by the next run */ } });
      else if (prior) { let ev = null; try { ev = getCalendar().getEventById(prior); } catch (e) { ev = null; } if (ev) fix(function () { ev.deleteEvent(); }); }
      const at = stampOf_(f.tab, f.row, 'unassigned on');
      if (parseStamp_(at) !== null && !histKeys[x.acId + '|Unassigned|' + at]) fix(function () { appendArtistCallHistory_(x.acId, x.artistId, x.openCallId, 'Unassigned', at, String(cellText_(f.tab, f.row, 'unassigned by') || '')); });
    }
  });
  // Sheet rows that have no index record: rebuild the record (never invent a new ArtistCall).
  Object.keys(profiles).forEach(function (pid) {
    const p = profiles[pid]; if (!p.link) return;
    let tab = null; try { tab = SpreadsheetApp.openByUrl(p.link).getSheetByName(CONFIG.ARTISTCALLS_TAB); } catch (e) { return; }
    if (!tab || tab.getLastRow() < 2) return;
    const th = headerIndex(tab), cg = function (r, h) { return th.map[h] === undefined ? '' : r[th.map[h]]; };
    tab.getRange(2, 1, tab.getLastRow() - 1, th.width).getValues().forEach(function (r) {
      const id = String(cg(r, 'artistcall id')); if (!id || known[id]) return;
      if (String(cg(r, 'artist id')).trim() !== pid || !isId_(String(cg(r, 'opencall id')))) { need({ acId: id }, 'A row in an artist sheet has no valid artist or opportunity.'); return; }
      const st = String(cg(r, 'lifecycle status') || '').trim(), folder = String(cg(r, 'application folder id') || '');
      fix(function () { appendByHeader(index, { 'ArtistCall ID': id, 'Artist ID': pid, 'OpenCall ID': String(cg(r, 'opencall id')), 'Artist Sheet ID': p.link, 'Application Folder ID': folder, 'Calendar Event ID': String(cg(r, 'calendar event id') || ''), 'Creation State': st === 'Unassigned' ? 'Unassigned' : (folder ? 'Linked' : 'SheetRow'), 'Created On': cg(r, 'created on'), 'Unassigned On': st === 'Unassigned' ? String(cg(r, 'unassigned on') || '') : '' }); });
    });
  });
  // The Artists cache on each opportunity is derived: refresh it, and count it only when it actually changed.
  if (apply) {
    const ids = {}; recs.forEach(function (x) { if (isId_(x.openCallId)) ids[x.openCallId] = true; });
    Object.keys(ids).forEach(function (oid) {
      const opp = findOpportunityById_(oid); if (!opp) return;
      const s = opportunitiesSheet_(), h = headerIndex(s), cells = function () { return String(s.getRange(opp.row, h.map['artists'] + 1).getValue() || '') + '|' + String(s.getRange(opp.row, h.map['artists cache map'] + 1).getValue() || ''); };
      const before = cells(); try { syncArtistsColumn_(oid); } catch (e) { return; } if (cells() !== before) res.fixed++;
    });
  }
  return res;
}
// ---- Permanent IDs: one-time backfill, run by hand from the Apps Script editor (not reachable from the web app) ----
// previewBackfillMissingIds() only reports what it would do. runBackfillMissingIds() gives a new UUID to each Opportunities
// row and each Artist Profiles row whose ID cell is blank. It never changes a cell that already has a value (a hand-typed
// value that is not a UUID is only reported), skips completely blank rows, stops without writing anything if two rows share
// an ID, and writes only the ID cells. Running it again changes nothing.
function previewBackfillMissingIds() { return backfillLogged_(backfillMissingIds_(false)); }
function runBackfillMissingIds() { return withLock_(function () { return guard_('Backfill IDs', {}, function () { return backfillLogged_(backfillMissingIds_(true)); }); }); }
// Writes the report to the execution log (counts and row numbers only, never titles or IDs) and returns it unchanged.
function backfillLogged_(report) { Logger.log(backfillLogText_(report)); return report; }
function backfillLogText_(r) {
  const mode = r.apply ? 'APPLIED' : 'PREVIEW';
  if (!r.ok) return 'Backfill missing IDs — ' + (r.apply ? 'APPLY' : 'PREVIEW') + ' REFUSED. ' + r.message;
  const part = function (label, x) {
    return label + ': ' + (r.apply ? x.filled + ' filled' : x.toFill + ' to fill') + ', ' + x.valid + ' already valid, ' + x.invalid + ' not a UUID (left alone), ' + x.blankRows + ' blank rows'
      + (x.skipped ? ', ' + x.skipped + ' skipped because the row changed (sheet rows ' + x.skippedRows.join(', ') + '; run again to finish them)' : '');
  };
  return 'Backfill missing IDs — ' + mode + (r.apply ? '' : ' (nothing was written)') + '\n' + part('Opportunities', r.opportunities) + '\n' + part('Artist Profiles', r.profiles);
}
function backfillMissingIds_(apply) {
  const ss = SpreadsheetApp.getActive();
  const targets = [
    { key: 'opportunities', tab: CONFIG.OPPORTUNITIES_TAB, idHeader: 'opencall id', labelHeader: 'title', ensure: opportunitiesSheet_ },
    { key: 'profiles', tab: CONFIG.ARTIST_PROFILES_TAB, idHeader: 'artist id', labelHeader: 'artist name', ensure: artistProfilesSheet_ }
  ];
  const report = { ok: true, apply: apply }, plans = [];
  for (let t = 0; t < targets.length; t++) {
    const target = targets[t], res = { toFill: 0, filled: 0, valid: 0, invalid: 0, blankRows: 0, skipped: 0, skippedRows: [] };
    report[target.key] = res;
    const sheet = apply ? target.ensure() : ss.getSheetByName(target.tab);
    if (!sheet || sheet.getLastRow() < 2) continue;
    const hi = headerIndex(sheet), idCol = hi.map[target.idHeader], labelCol = hi.map[target.labelHeader], values = sheet.getRange(2, 1, sheet.getLastRow() - 1, hi.width).getValues(), seen = {}, rowsToFill = [];
    for (let i = 0; i < values.length; i++) {
      const r = values[i];
      if (r.every(function (v) { return v === '' || v === null; })) { res.blankRows++; continue; }
      const id = idCol === undefined ? '' : String(r[idCol] === null ? '' : r[idCol]).trim();
      if (!id) { rowsToFill.push({ row: i + 2, label: labelCol === undefined ? '' : String(r[labelCol] === null ? '' : r[labelCol]) }); res.toFill++; continue; }
      if (!isId_(id)) { res.invalid++; continue; }
      if (seen[id]) return { ok: false, apply: apply, message: 'Two rows on ' + target.tab + ' have the same ID (rows ' + seen[id] + ' and ' + (i + 2) + '). Nothing was changed. Fix that first.' };
      seen[id] = i + 2; res.valid++;
    }
    plans.push({ sheet: sheet, idCol: idCol, labelCol: labelCol, rows: rowsToFill, res: res });
  }
  // Just before each write, re-read the row: the ID must still be blank and the title/name must be the one that was planned.
  // Anything else (someone typed in, sorted or deleted rows meanwhile) is skipped and reported, never overwritten.
  if (apply) plans.forEach(function (p) {
    p.rows.forEach(function (item) {
      const idNow = p.sheet.getRange(item.row, p.idCol + 1).getValue(), labelRaw = p.labelCol === undefined ? '' : p.sheet.getRange(item.row, p.labelCol + 1).getValue();
      const nowId = String(idNow == null ? '' : idNow).trim(), nowLabel = String(labelRaw == null ? '' : labelRaw);
      if (nowId !== '' || nowLabel !== item.label) { p.res.skipped++; p.res.skippedRows.push(item.row); return; }
      p.sheet.getRange(item.row, p.idCol + 1).setValue(newId_()); p.res.filled++;
    });
  });
  return report;
}
