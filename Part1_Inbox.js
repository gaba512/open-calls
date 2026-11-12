function saveCheckedFromPage(p) { try { return saveOpportunity(p.data || {}, p.link || (p.data && p.data.link) || '', p.sender, pickedArtists(p.artists), !!p.confirmed, !!p.force, p.files || []); } catch (err) { return failed('Save', err, { sender: p.sender, text: p.link, title: p.data && p.data.title }); } }
function saveOpportunity(data, link, sender, picked, confirmed, force, files) {
  ensureFormColumns_(getInbox()); ensureFormColumns_(getInbox(), ['Fees', 'Required Docs']);
  const inbox = getInbox(), deadline = validDate_(data.deadline), dup = findDuplicate(inbox, data.title, link);
  if (dup && !force) { const hi = headerIndex(inbox); const t = inbox.getRange(dup, hi.map['title'] + 1).getValue(); const s = inbox.getRange(dup, hi.map['status'] + 1).getValue(); return { ok: false, duplicate: true, message: 'This looks like "' + t + '", already in ' + statusLabel_(s) + '. Save anyway?' }; }
  let sourceIds = ''; try { sourceIds = saveSourceFiles_(files, data.title); } catch (err) { logProblem('Save source files', 'warning', err.message, { sender: sender, title: data.title }); }
  // Step 1: the opportunity is also saved to the Opportunities tab with a permanent ID (repeats reuse it).
  const opp = upsertOpportunityRecord_(data, link, sender, confirmed, sourceIds, force);
  if (!opp.created) return { ok: false, duplicate: true, message: 'This looks like "' + data.title + '", already saved. Save anyway?' };
  updateRowByHeader(inbox, opp.row, { 'Added On': new Date(), 'Title': data.title || '', 'Status': confirmed ? 'Confirmed' : 'Pending', 'Confirmed On': confirmed ? new Date() : '', 'Verified By': confirmed ? sender : '', 'Review Stats': 'Checked by ' + sender, 'Category': data.type || '', 'Selection Month': deadline ? Utilities.formatDate(toDate(deadline), CONFIG.TIMEZONE, 'MMM yyyy') : '', 'Deadline': deadline ? toDate(deadline) : '', 'Application Fee': data.fee || '', 'Application Link': link, 'Event Dates': data.event_dates || '', 'Announcement Date': data.announcement_date || '', 'Organiser': data.organiser || '', 'Fees': feeScheduleJson_(data.fees), 'Required Docs': requiredDocsList_(data.required_docs).join(', '), 'Location': data.location || '', 'Eligibility': data.eligibility || '', 'Medium': data.medium || '', 'Summary': data.summary || '', 'Submitted By': sender || '', 'Calendar Event ID': '', 'Source Files': sourceIds, 'Additional Info': data.additional || '' });
  const row = opp.row; updateRowByHeader(inbox, row, customInboxValues_(data.custom, data.type || '', data.title || ''));
  const note = confirmed && picked.length ? ' Approve it from the Inbox to send to artists.' : '';
  return { ok: true, row: row, openCallId: opp.openCallId, message: (confirmed ? 'Confirmed and added to Inbox.' : 'Saved to Drafts.') + note };
}
function updateEntry_(body, verifier) {
  ensureFormColumns_(getInbox()); ensureFormColumns_(getInbox(), ['Fees', 'Required Docs']);
  const rowNum = Number(body.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, body.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), cell = function (h) { const i = hi.map[h]; return i === undefined ? '' : inbox.getRange(rowNum, i + 1).getValue(); };
  const oldTitle = String(cell('title') || ''), oldLink = String(cell('application link') || ''), data = body.data || {}, link = body.link || data.link || '', deadline = validDate_(data.deadline), picked = pickedArtists(cell('artists')) /* the sheet's own value: a client-supplied body.artists is ignored (Artists is a derived cache) */, oldStatus = String(cell('status') || 'Pending'), status = STATUSES.indexOf(data.status) !== -1 ? data.status : oldStatus;
  if (!body.force && (norm(cell('title')) !== norm(data.title) || String(cell('application link')) !== String(link))) { const dup = findDuplicate(inbox, data.title, link, rowNum); if (dup) return { ok: false, duplicate: true, message: 'This looks like "' + inbox.getRange(dup, hi.map['title'] + 1).getValue() + '", already in the sheet. Save anyway?' }; }
  const eventId = String(cell('calendar event id') || '');
  const fields = { 'Title': data.title || '', 'Status': status, 'Category': data.type || '', 'Selection Month': deadline ? Utilities.formatDate(toDate(deadline), CONFIG.TIMEZONE, 'MMM yyyy') : '', 'Deadline': deadline ? toDate(deadline) : '', 'Application Fee': data.fee || '', 'Application Link': link, 'Event Dates': data.event_dates || '', 'Announcement Date': data.announcement_date || '', 'Organiser': data.organiser || '', 'Fees': feeScheduleJson_(data.fees), 'Required Docs': requiredDocsList_(data.required_docs).join(', '), 'Location': data.location || '', 'Eligibility': data.eligibility || '', 'Calendar Event ID': eventId, 'Review Stats': 'Checked by ' + verifier, 'Additional Info': data.additional || '' };
  if (status === 'Confirmed' && oldStatus !== 'Confirmed') { fields['Verified By'] = verifier; fields['Confirmed On'] = new Date(); }
  // Changing an approved call means it has to be approved again.
  if (body.resetApproval) fields['Team Review'] = '';
  updateRowByHeader(inbox, rowNum, fields); updateRowByHeader(inbox, rowNum, customInboxValues_(data.custom, data.type || '', data.title || ''));
  if (typeof p2_propagateCallEdit_ === 'function' && picked.length) { const artistValues = {}; COPY_TO_ARTIST.forEach(function (h) { artistValues[h] = fields[h]; }); Object.assign(artistValues, customSyncValues_(data.custom, data.type || '', data.title || ''));try { p2_propagateCallEdit_(oldTitle, oldLink, data.title || '', link, picked, artistValues); } catch (e) {} }
  let message = 'Saved.'; if (status !== oldStatus) message = status === 'Archived' ? 'Archived.' : status === 'Confirmed' ? 'Moved to Inbox.' : 'Moved to Drafts.';
  if (body.pushToArtists && picked.length) message = 'Saved. Send from each artist\'s call screen.';
  return { ok: true, message: message, previousStatus: oldStatus };
}
function bulkPush_(body, verifier) {
  const inbox = getInbox(), hi = headerIndex(inbox), override = pickedArtists(body.artists), expectTitles = body.expectTitles || {}, rows = (body.rows || []).map(Number).filter(function (r) { return r >= 2 && r <= inbox.getLastRow(); });
  let sent = 0; const skipped = [];
  rows.forEach(function (rowNum) {
    if (expectTitles[rowNum] !== undefined && !rowMatches_(inbox, rowNum, expectTitles[rowNum])) { skipped.push(rowNum); return; }
    const own = splitNames(inbox.getRange(rowNum, hi.map['artists'] + 1).getValue()), names = override.length ? override : own;
    if (!names.length) { skipped.push(rowNum); return; }
    const updates = { 'Status': 'Confirmed', 'Artists': names.join(', '), 'Team Review': 'Approved to send' };
    if (String(inbox.getRange(rowNum, hi.map['status'] + 1).getValue()) !== 'Confirmed') { updates['Verified By'] = verifier; updates['Confirmed On'] = new Date(); }
    updateRowByHeader(inbox, rowNum, updates); sendRowToArtists(inbox, rowNum, true); sent++;
  });
  let msg = 'Sent ' + sent + ' open call' + (sent === 1 ? '' : 's') + '.'; if (skipped.length) msg += ' Skipped ' + skipped.length + ' with no artists assigned.';
  return { ok: sent > 0 || !skipped.length, message: msg };
}
function bulkArchive_(body) {
  const inbox = getInbox(), hi = headerIndex(inbox), status = STATUSES.indexOf(body.status) !== -1 ? body.status : 'Archived', expectTitles = body.expectTitles || {}, rows = (body.rows || []).map(Number).filter(function (r) { return r >= 2 && r <= inbox.getLastRow(); }), changed = [];
  rows.forEach(function (r) {
    if (expectTitles[r] !== undefined && !rowMatches_(inbox, r, expectTitles[r])) return;
    changed.push(r);
    const wasConfirmed = String(inbox.getRange(r, hi.map['status'] + 1).getValue()) === 'Confirmed';
    inbox.getRange(r, hi.map['status'] + 1).setValue(status);
    if (status === 'Confirmed' && !wasConfirmed) updateRowByHeader(inbox, r, { 'Confirmed On': new Date() });
    // The archive reason belongs to one stay in the Archive: it is cleared on the way in and on the way out.
    if (hi.map['archive reason'] !== undefined) inbox.getRange(r, hi.map['archive reason'] + 1).setValue('');
   
  });
  return { ok: true, message: (status === 'Archived' ? 'Archived' : status === 'Confirmed' ? 'Moved to Inbox' : 'Moved to Drafts') + ': ' + changed.length + '.' };
}
function deleteEntry_(body) {
  const rowNum = Number(body.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, body.expectTitle)) return STALE_;
  const hi = headerIndex(inbox); if (String(inbox.getRange(rowNum, hi.map['status'] + 1).getValue()) !== 'Archived') return { ok: false, message: 'Only archived entries can be deleted.' };
  if (artistCallsExistFor_(String(inbox.getRange(rowNum, hi.map['opencall id'] + 1).getValue() || ''), '').length) return { ok: false, message: 'This call has artist history (ArtistCalls) and cannot be deleted. Keep it archived.' };
  const title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || ''), artists = splitNames(inbox.getRange(rowNum, hi.map['artists'] + 1).getValue());
  const sentTo = typeof p2_sentArtistsFor_ === 'function' ? p2_sentArtistsFor_(title, link, artists) : []; if (sentTo.length) return { ok: false, message: 'Already sent to ' + sentTo.join(', ') + '. Archive it instead of deleting.' };
  if (typeof p2_removeCallFromArtistSheets_ === 'function') { try { p2_removeCallFromArtistSheets_(title, link, artists); } catch (e) {} }
  const evId = String(inbox.getRange(rowNum, hi.map['calendar event id'] + 1).getValue() || ''); if (evId && evId.indexOf('error') === -1) { try { const ev = getEventSafe_(evId); if (ev) ev.deleteEvent(); } catch (e) {} }
  splitNames(inbox.getRange(rowNum, hi.map['source files'] + 1).getValue()).forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} });
  inbox.deleteRow(rowNum); return { ok: true, message: 'Deleted.' };
}
function sendAndReport(inbox, rowNum, picked, resend) { sendRowToArtists(inbox, rowNum, resend); const lookup = artistLookup(), noSheet = picked.filter(function (n) { return !lookup[n.toLowerCase()]; }); const sentTo = String(inbox.getRange(rowNum, headerIndex(inbox).map['sent to'] + 1).getValue() || ''); let note = sentTo ? ' Sent to ' + sentTo + '.' : ''; if (noSheet.length) note += ' No sheet linked for ' + noSheet.join(', ') + '.'; return note; }
function sendRowToArtists(inbox, rowNum, resend) {
  const hi = headerIndex(inbox), row = inbox.getRange(rowNum, 1, 1, hi.width).getValues()[0], get = function (h) { const i = hi.map[h.toLowerCase()]; return i === undefined ? '' : row[i]; };
  const chosen = splitNames(get('Artists')), already = splitNames(get('Sent To')), lookup = artistLookup(), sent = already.filter(function (n) { return chosen.indexOf(n) !== -1 || !resend; }), problems = [];
  chosen.forEach(function (name) {
    if (!resend && already.indexOf(name) !== -1) return;
    const link = lookup[name.toLowerCase()]; if (!link) return;
    try { const target = openTab(link); if (typeof ensureArtistSheetP2Headers_ === 'function') ensureArtistSheetP2Headers_(target); const values = {}; COPY_TO_ARTIST.forEach(function (h) { values[h] = get(h); }); Object.assign(values, customSyncFromRow_(get)); const dupRow = findDuplicate(target, get('Title'), get('Application Link')); if (dupRow > 0) { const shi = headerIndex(target).map; if (shi['handoff on'] !== undefined && !target.getRange(dupRow, shi['handoff on'] + 1).getValue()) values['Handoff On'] = new Date(); if (shi['sent on'] !== undefined && !target.getRange(dupRow, shi['sent on'] + 1).getValue()) values['Sent On'] = new Date(); updateRowByHeader(target, dupRow, values); } else { values['Handoff On'] = new Date(); values['Sent On'] = new Date(); appendByHeader(target, values); } if (sent.indexOf(name) === -1) sent.push(name); } 
    catch (err) { problems.push(name + ' (' + err.message + ')'); }
  });
  if (hi.map['sent to'] !== undefined) inbox.getRange(rowNum, hi.map['sent to'] + 1).setValue(sent.join(', '));
  if (hi.map['team review'] !== undefined) updateRowByHeader(inbox, rowNum, { 'Team Review': 'Approved to send' });
 
  if (problems.length) logProblem('Send to artist sheet', 'error', 'Could not send to: ' + problems.join('; '), { title: get('Title') });
}
function getQueue_(targetStatus) {
  const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow(); if (last < 2) return { ok: true, entries: [] };
  const rows = inbox.getRange(2, 1, last - 1, hi.width).getValues(), statusCol = hi.map['status'], entries = [];
  for (let i = 0; i < rows.length; i++) { if (String(rows[i][statusCol] || '').trim() !== targetStatus) continue; const e = { row: i + 2 }; Object.keys(hi.map).forEach(function (k) { if (k === 'calendar event id' || k === 'source files') return; e[k] = rows[i][hi.map[k]]; }); e.hasSource = !!String(rows[i][hi.map['source files']] || '').trim(); if (e['added on'] instanceof Date) { e.addedTs = e['added on'].getTime(); e['added on'] = Utilities.formatDate(e['added on'], CONFIG.TIMEZONE, 'd MMM'); } if (e['deadline'] instanceof Date) e['deadline'] = Utilities.formatDate(e['deadline'], CONFIG.TIMEZONE, 'yyyy-MM-dd'); ['announcement date', 'event dates'].forEach(function (k) { if (e[k] instanceof Date) e[k] = Utilities.formatDate(e[k], CONFIG.TIMEZONE, 'd MMM yyyy'); }); entries.push(e); }
  // Open Calls list only: show which team member is handling each call. A problem reading an artist's sheet
  // must never stop the list from loading, so failures leave the field empty.
  if (targetStatus === 'Confirmed') { let who = {}; try { who = teamAssigneesByRow_(); } catch (e) { who = {}; } entries.forEach(function (e) { e['assigned to'] = (who[e.row] || []).join(', '); }); }
  return { ok: true, entries: entries.reverse() };
}
// The team member is stored on each artist's application (older rows on the artist's sheet, newer ones on
// their ArtistCalls tab), so this gathers them per open-call row. The result is cached for 5 minutes and the
// cache is cleared by every save (see withLock_), so a change shows up on the next load.
function teamAssigneesByRow_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('assignees_by_row'); if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const out = {}, add = function (row, name) { name = String(name || '').trim(); if (!row || !name) return; const list = out[row] || (out[row] = []); if (list.indexOf(name) === -1) list.push(name); };
  const lookup = artistLookup(), lk = inboxRowLookup_(), inbox = getInbox(), hi = headerIndex(inbox), idCol = hi.map['opencall id'], rowById = {};
  if (idCol !== undefined && inbox.getLastRow() >= 2) inbox.getRange(2, idCol + 1, inbox.getLastRow() - 1, 1).getValues().forEach(function (r, i) { if (r[0]) rowById[String(r[0])] = i + 2; });
  let tomb = {}; try { tomb = tombstonedIds_(); } catch (e) { tomb = {}; }
  Object.keys(lookup).forEach(function (nameLower) {
    const link = lookup[nameLower]; if (!link) return;
    try {
      const target = openTab(link), shi = headerIndex(target), aIdx = shi.map['assigned to'], hoIdx = shi.map['handoff on'], tIdx = shi.map['title'], lIdx = shi.map['application link'], last = target.getLastRow();
      if (aIdx !== undefined && hoIdx !== undefined && last >= 2) target.getRange(2, 1, last - 1, shi.width).getValues().forEach(function (r) {
        if (!r[hoIdx] || !r[aIdx]) return; const h = resolveInboxRow_(lk, tIdx !== undefined ? r[tIdx] : '', lIdx !== undefined ? r[lIdx] : ''); if (h) add(h.row, r[aIdx]);
      });
    } catch (e) {}
    try {
      const tab = SpreadsheetApp.openByUrl(link).getSheetByName(CONFIG.ARTISTCALLS_TAB); if (!tab || tab.getLastRow() < 2) return;
      const th = headerIndex(tab), a = th.map['assigned to'], oc = th.map['opencall id'], st = th.map['lifecycle status'], ac = th.map['artistcall id']; if (a === undefined || oc === undefined) return;
      tab.getRange(2, 1, tab.getLastRow() - 1, th.width).getValues().forEach(function (r) {
        if (!r[a]) return; if (st !== undefined && String(r[st] || '') === 'Unassigned') return; if (ac !== undefined && tomb[String(r[ac] || '')]) return; add(rowById[String(r[oc] || '')], r[a]);
      });
    } catch (e) {}
  });
  try { cache.put('assignees_by_row', JSON.stringify(out), 300); } catch (e) {}
  return out;
}
function getCounts_() { const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow(), counts = { Pending: 0, Confirmed: 0, Archived: 0 }; if (last >= 2) inbox.getRange(2, hi.map['status'] + 1, last - 1, 1).getValues().forEach(function (r) { const s = String(r[0]).trim(); if (counts[s] !== undefined) counts[s]++; }); return { ok: true, counts: counts }; }
function uploadsFolder_() { const props = PropertiesService.getScriptProperties(), id = props.getProperty('UPLOADS_FOLDER_ID'); if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} } const it = DriveApp.getFoldersByName(CONFIG.UPLOADS_FOLDER_NAME), folder = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.UPLOADS_FOLDER_NAME); props.setProperty('UPLOADS_FOLDER_ID', folder.getId()); return folder; }
function saveSourceFiles_(files, title) { if (!files || !files.length) return ''; const folder = uploadsFolder_(), stamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HHmm'), base = String(title || 'open call').replace(/[\\/:*?"<>|]/g, '').slice(0, 60); return files.slice(0, 10).map(function (f, i) { const ext = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[f.mimeType] || '.jpg', blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.mimeType, stamp + ' ' + base + ' ' + (i + 1) + ext); return folder.createFile(blob).getId(); }).join(','); }
function getSourceFiles_(b) { const inbox = getInbox(), rowNum = Number(b.row); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_; const hi = headerIndex(inbox), ids = splitNames(inbox.getRange(rowNum, hi.map['source files'] + 1).getValue()), files = []; let expired = 0; ids.forEach(function (id) { try { const f = DriveApp.getFileById(id); if (f.isTrashed()) { expired++; return; } const blob = f.getBlob(); files.push({ name: f.getName(), mimeType: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) }); } catch (e) { expired++; } }); return { ok: true, files: files, expired: expired, keepDays: CONFIG.SOURCE_KEEP_DAYS }; }
function cleanupSourceFiles() { const cutoff = Date.now() - CONFIG.SOURCE_KEEP_DAYS * 86400000, it = uploadsFolder_().getFiles(); let n = 0; while (it.hasNext()) { const f = it.next(); if (f.getDateCreated().getTime() < cutoff) { f.setTrashed(true); n++; } } const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow(); if (last >= 2 && hi.map['source files'] !== undefined) { const rng = inbox.getRange(2, hi.map['source files'] + 1, last - 1, 1), vals = rng.getValues(); let changed = false; vals.forEach(function (r) { if (!r[0]) return; const keep = splitNames(r[0]).filter(function (id) { try { return !DriveApp.getFileById(id).isTrashed(); } catch (e) { return false; } }).join(','); if (keep !== r[0]) { r[0] = keep; changed = true; } }); if (changed) rng.setValues(vals); } Logger.log('Trashed ' + n + ' old source files'); }
function addArtistFromPage(name, link, by) { name = String(name || '').trim().slice(0, 60); link = String(link || '').trim(); if (!name) return { ok: false, message: 'Enter a name.' }; if (/^[=+\-@]/.test(name)) return { ok: false, message: 'Names can’t start with = + - or @.' }; if (/,/.test(name)) return { ok: false, message: 'Names can’t contain commas.' }; if (link && !/^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(link)) return { ok: false, message: 'That doesn’t look like a Google Sheets link.' }; if (artistNames().some(function (n) { return n.toLowerCase() === name.toLowerCase(); })) return { ok: false, message: name + ' is already in the list.' }; let note = ' No sheet linked yet. Add their sheet link in the Artists tab.'; if (link) { try { note = ' Open calls will go to tab "' + openTab(link).getName() + '".'; } catch (err) { return { ok: false, message: 'Can’t open that sheet. Check it’s shared with the account running Open Calls.' }; } } SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTS_TAB).appendRow([safe_(name), link]); CacheService.getScriptCache().remove('artists_cache'); logProblem('Add artist', 'info', 'Added "' + name + '"', { sender: by }); return { ok: true, message: 'Added ' + name + '.' + note, artists: artistNames() }; }
function artistNames() { const cache = CacheService.getScriptCache(), cached = cache.get('artists_cache'); if (cached) return JSON.parse(cached); const tab = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTS_TAB); let names = []; if (tab && tab.getLastRow() >= 2) { names = tab.getRange(2, 1, tab.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); }).filter(Boolean); } cache.put('artists_cache', JSON.stringify(names), 600); return names; }
function artistLookup() { const tab = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTS_TAB), map = {}; if (!tab || tab.getLastRow() < 2) return map; tab.getRange(2, 1, tab.getLastRow() - 1, 2).getValues().forEach(function (r) { if (r[0]) map[String(r[0]).trim().toLowerCase()] = String(r[1]).trim(); }); return map; }