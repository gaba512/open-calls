function getPeopleTab_() { const ss = SpreadsheetApp.getActive(); let tab = ss.getSheetByName(P2.PEOPLE_TAB); if (!tab) { tab = ss.insertSheet(P2.PEOPLE_TAB); tab.appendRow(['Person ID', 'Display Name', 'Created On', 'Device ID']); tab.getRange(1, 1, 1, 4).setFontWeight('bold'); tab.setFrozenRows(1); } else { const width = Math.max(tab.getLastColumn(), 1), have = new Set(tab.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); })); if (!have.has('device id')) tab.getRange(1, width + 1, 1, 1).setValues([['Device ID']]).setFontWeight('bold'); } return tab; }
function p2_getPeople() { const tab = getPeopleTab_(), last = tab.getLastRow(); if (last < 2) return { ok: true, people: [] }; const rows = tab.getRange(2, 1, last - 1, 3).getValues(); const people = rows.map(function (r) { return { id: String(r[0]), name: String(r[1]).trim() }; }).filter(function (p) { return p.name; }); return { ok: true, people: people }; }
function p2_setMyPerson(b) {
  const name = String(b.name || '').trim().slice(0, 40); if (!name) return { ok: false, message: 'Pick a name.' };
  const deviceId = String(b.deviceId || '').trim(), tab = getPeopleTab_(), last = tab.getLastRow();
  if (last >= 2) { const rows = tab.getRange(2, 1, last - 1, 4).getValues(); let nameMatch = -1, deviceMatch = -1; for (let i = 0; i < rows.length; i++) { const rowName = String(rows[i][1]).trim(), rowDevice = String(rows[i][3] || '').trim(); if (rowName.toLowerCase() !== name.toLowerCase()) continue; if (nameMatch === -1) nameMatch = i; if (deviceId && rowDevice === deviceId) deviceMatch = i; } const pick = deviceMatch !== -1 ? deviceMatch : nameMatch; if (pick !== -1) { const id = String(rows[pick][0]); if (deviceId && String(rows[pick][3] || '').trim() !== deviceId) tab.getRange(pick + 2, 4).setValue(deviceId); return { ok: true, personId: id, name: String(rows[pick][1]).trim() }; } }
  const id = Utilities.getUuid().replace(/-/g, '').slice(0, 12); tab.appendRow([id, safe_(name), new Date(), deviceId]); return { ok: true, personId: id, name: name };
}
// Rename or remove a person from the People tab. Past approvals keep the name they were saved with.
function p2_renamePerson(b) {
  const id = String(b.personId || ''), name = String(b.name || '').trim().slice(0, 40); if (!id || !name) return { ok: false, message: 'Enter a name.' };
  const tab = getPeopleTab_(), last = tab.getLastRow(); if (last < 2) return { ok: false, message: 'Person not found.' };
  const ids = tab.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { tab.getRange(i + 2, 2).setValue(safe_(name)); return { ok: true, name: name, message: 'Name updated.' }; } }
  return { ok: false, message: 'Person not found.' };
}
function p2_deletePerson(b) {
  const id = String(b.personId || ''); if (!id) return { ok: false, message: 'Person not found.' };
  const tab = getPeopleTab_(), last = tab.getLastRow(); if (last < 2) return { ok: false, message: 'Person not found.' };
  const ids = tab.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { tab.deleteRow(i + 2); return { ok: true, message: 'Removed.' }; } }
  return { ok: false, message: 'Person not found.' };
}
function personName_(personId) { if (!personId) return ''; const tab = getPeopleTab_(), last = tab.getLastRow(); if (last < 2) return ''; const rows = tab.getRange(2, 1, last - 1, 2).getValues(); for (let i = 0; i < rows.length; i++) { if (String(rows[i][0]) === String(personId)) return String(rows[i][1]).trim(); } return ''; }
function ensureArtistProfileHeaders_() {
  const tab = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTS_TAB); if (!tab) return;
  const width = Math.max(tab.getLastColumn(), 1), headers = tab.getRange(1, 1, 1, width).getValues()[0];
  let renamed = false; headers.forEach(function (h, i) { if (String(h).trim().toLowerCase() === 'sheet link (with the tab open)') { headers[i] = 'Sheet Link'; renamed = true; } });
  if (renamed) tab.getRange(1, 1, 1, width).setValues([headers]);
  const have = new Set(headers.map(function (h) { return String(h).trim().toLowerCase(); })), missing = P2.ARTIST_PROFILE_HEADERS.filter(function (h) { return !have.has(h.toLowerCase()); });
  if (missing.length) tab.getRange(1, width + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
}
function computeArtistCallState_(f) { if (!f.sentOn) return { step: 'Unsent', bucket: 'Unsent' }; if (['Accepted', 'Declined', 'Not Selected', 'Not Interested'].indexOf(f.status) !== -1) return { step: 'Outcome', bucket: 'Past' }; if (['Applied', 'In Progress', 'Not Moving Forward', 'On Hold', 'Application', 'Application Sent'].indexOf(f.status) !== -1) return { step: 'Application', bucket: 'Active' }; if (f.artistResponse !== 'Interested') return { step: 'Awaiting Response', bucket: 'Active' }; return { step: 'Application', bucket: 'Active' }; }
function artistCallStatesForRow_(artists, title, link, lookup, sheetCache) {
  const out = []; (artists || []).forEach(function (name) { const sheetLink = lookup[String(name).toLowerCase()]; if (!sheetLink) return; try { let target = sheetCache[sheetLink]; if (target === undefined) { target = openTab(sheetLink); sheetCache[sheetLink] = target; } const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return; const shi = headerIndex(target), get = function (h) { const i = shi.map[h.toLowerCase()]; return i === undefined ? '' : target.getRange(dupRow, i + 1).getValue(); }; out.push({ name: name, paid: String(get('Paid') || '').trim(), status: String(get('Status') || '').trim(), sentOn: get('Sent On'), inDocOn: get('In Doc On'), response: String(get('Artist Response') || '').trim() }); } catch (e) {} });
  return out;
}
// The stage is the furthest one any of the call's artists has reached:
// Added > Approved > Awaiting response > Interested > Need more info > Applied > Accepted > Not accepted.
function pipelineStageForCall_(teamReview, artists, states) {
  if (String(teamReview || '').trim() !== 'Approved to send') return 'Added';
  if (!(artists || []).length || !states.length) return 'Approved';
  const any = function (fn) { return states.some(fn); };
  if (any(function (s) { return s.status === 'Accepted'; })) return 'Accepted';
  if (any(function (s) { return ['Applied', 'In Progress', 'On Hold', 'Not Moving Forward', 'Awaiting Response'].indexOf(s.status) !== -1; })) return 'Applied';
  if (any(function (s) { return s.response === 'Wants more info'; })) return 'Need more info';
  if (any(function (s) { return s.response === 'Interested'; })) return 'Interested';
  if (any(function (s) { return !!s.sentOn; })) return 'Awaiting response';
  if (any(function (s) { return ['Declined', 'Not Selected'].indexOf(s.status) !== -1; })) return 'Not accepted';
  return 'Approved';
}function addInboxSentTo_(rowNum, artist) { const inbox = getInbox(), hi = headerIndex(inbox), si = hi.map['sent to']; if (si === undefined) return; const current = splitNames(inbox.getRange(rowNum, si + 1).getValue()); if (current.indexOf(artist) === -1) { current.push(artist); inbox.getRange(rowNum, si + 1).setValue(current.join(', ')); } }
function callApprovalRef_(title, link) { return link ? 'link:' + link : 'title:' + norm(title); }
function p2_propagateCallEdit_(oldTitle, oldLink, newTitle, newLink, artists, values) { const lookup = artistLookup(); (artists || []).forEach(function (name) { const sheetLink = lookup[String(name).toLowerCase()]; if (!sheetLink) return; try { const target = openTab(sheetLink), dupRow = findDuplicate(target, oldTitle, oldLink); if (dupRow > 0) { const updates = Object.assign({}, values || {}); updates['Title'] = newTitle; updates['Application Link'] = newLink; updateRowByHeader(target, dupRow, updates); } } catch (e) {} }); }
// Artists whose sheet row for this call already has "Sent On". Errors count as sent (refuse rather than risk data loss).
function p2_sentArtistsFor_(title, link, artists) { const lookup = artistLookup(), sent = []; (artists || []).forEach(function (name) { const sheetLink = lookup[String(name).toLowerCase()]; if (!sheetLink) return; try { const target = openTab(sheetLink), dupRow = findDuplicate(target, title, link); if (dupRow > 0) { const si = headerIndex(target).map['sent on']; if (si !== undefined && target.getRange(dupRow, si + 1).getValue()) sent.push(name); } } catch (e) { sent.push(name); } }); return sent; }
function p2_removeCallFromArtistSheets_(title, link, artists) { const lookup = artistLookup(); (artists || []).forEach(function (name) { const sheetLink = lookup[String(name).toLowerCase()]; if (!sheetLink) return; try { const target = openTab(sheetLink), dupRow = findDuplicate(target, title, link); if (dupRow > 0) target.deleteRow(dupRow); } catch (e) {} }); }
function inboxRowLookup_() {
  const inbox = getInbox(), hi = headerIndex(inbox), byLink = {}, byTitle = {}, statusByRow = {}, last = inbox.getLastRow();
  if (last >= 2) { const li = hi.map['application link'], ti = hi.map['title'], si = hi.map['status'], rows = inbox.getRange(2, 1, last - 1, hi.width).getValues(); for (let i = 0; i < rows.length; i++) { const rowNum = i + 2, rl = li !== undefined ? String(rows[i][li] || '') : '', rt = ti !== undefined ? norm(rows[i][ti]) : ''; if (rl && byLink[rl] === undefined) byLink[rl] = rowNum; if (rt && byTitle[rt] === undefined) byTitle[rt] = rowNum; statusByRow[rowNum] = si !== undefined ? String(rows[i][si] || '').trim() : ''; } }
  return { byLink: byLink, byTitle: byTitle, statusByRow: statusByRow };
}
function resolveInboxRow_(lk, title, link) { const l = String(link || ''), t = norm(title), hits = []; if (l && lk.byLink[l] !== undefined) hits.push(lk.byLink[l]); if (t && lk.byTitle[t] !== undefined) hits.push(lk.byTitle[t]); if (!hits.length) return null; const row = Math.min.apply(null, hits); return { row: row, status: lk.statusByRow[row] || '' }; }
function artistCallCounts_() {
  const counts = {}, lookup = artistLookup(), lk = inboxRowLookup_();
  Object.keys(lookup).forEach(function (nameLower) {
    const tally = { unsent: 0, active: 0 }; counts[nameLower] = tally; let target; try { target = openTab(lookup[nameLower]); } catch (e) { return; }
    const shi = headerIndex(target), hoIdx = shi.map['handoff on']; if (hoIdx === undefined) return;
    const soIdx = shi.map['sent on'], stIdx = shi.map['status'], arIdx = shi.map['artist response'], tiIdx = shi.map['title'], liIdx = shi.map['application link'], last = target.getLastRow(); if (last < 2) return;
    const rows = target.getRange(2, 1, last - 1, shi.width).getValues();
    rows.forEach(function (r) {
      if (!r[hoIdx]) return;
      const state = computeArtistCallState_({ sentOn: soIdx !== undefined ? r[soIdx] : '', status: stIdx !== undefined ? String(r[stIdx] || '').trim() : '', artistResponse: arIdx !== undefined ? String(r[arIdx] || '').trim() : '' });
      const hit = resolveInboxRow_(lk, tiIdx !== undefined ? r[tiIdx] : '', liIdx !== undefined ? r[liIdx] : '');
      if (!hit) return; if (hit.status === 'Archived' || hit.status === 'Pending') return;
      if (state.bucket === 'Unsent') tally.unsent++; else if (state.bucket === 'Active') tally.active++;
    });
  });
  return counts;
}
// Artist IDs by lower-case name, read-only (never creates tabs or profiles). A name shared by more than one profile,
// or held by a profile with no valid ID, maps to '' so the caller never gets a guess.
function artistIdsByNameReadOnly_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTIST_PROFILES_TAB), out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  const hi = headerIndex(sh), ni = hi.map['artist name'], ii = hi.map['artist id']; if (ni === undefined || ii === undefined) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, hi.width).getValues().forEach(function (r) {
    const k = String(r[ni] || '').trim().toLowerCase(); if (!k) return;
    const id = String(r[ii] || '').trim();
    out[k] = (out[k] === undefined && isId_(id)) ? id : '';
  });
  return out;
}
function p2_getArtists() {
  ensureArtistProfileHeaders_(); const tab = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTS_TAB); if (!tab || tab.getLastRow() < 2) return { ok: true, artists: [] };
  const hi = headerIndex(tab), rows = tab.getRange(2, 1, tab.getLastRow() - 1, hi.width).getValues(), counts = artistCallCounts_(), idsByName = artistIdsByNameReadOnly_();
  const artists = rows.map(function (r, i) {
    const get = function (h) { var idx = hi.map[h.toLowerCase()]; return idx !== undefined ? String(r[idx] || '').trim() : ''; };
    const name = get('Artist Name'), c = counts[name.toLowerCase()] || { unsent: 0, active: 0 };
    return { row: i + 2, name: name, artistId: idsByName[name.toLowerCase()] || '', sheetLink: get('Sheet Link'), email: get('Email'), phone: get('Phone'), mediums: get('Mediums'), location: get('Location'), eligibilityNotes: get('Eligibility Notes'), notes: get('Notes'), active: c.active, pending: c.unsent };
  }).filter(function (a) { return a.name; }); return { ok: true, artists: artists };
}
// One cell from the Inbox row (the artist sheet doesn't carry Location).
function inboxCell_(row, header) { const inbox = getInbox(), hi = headerIndex(inbox), i = hi.map[header]; return i === undefined ? '' : String(inbox.getRange(row, i + 1).getValue() || '').trim(); }
function p2_getArtistProfile(b) {
  const name = String(b.name || '').trim(); if (!name) return { ok: false, message: 'No artist name.' };
  const r = p2_getArtists(); if (!r.ok) return r; const artist = r.artists.find(function (a) { return a.name.toLowerCase() === name.toLowerCase(); }); if (!artist) return { ok: false, message: 'Artist not found.' };
  const unsent = [], active = [], past = [];
  if (artist.sheetLink) {
    try {
      const target = openTab(artist.sheetLink), shi = headerIndex(target), hoIdx = shi.map['handoff on'], last = target.getLastRow();
      if (hoIdx !== undefined && last >= 2) {
        const rows = target.getRange(2, 1, last - 1, shi.width).getValues(), lk = inboxRowLookup_(), dateStr = function (v) { return v instanceof Date ? Utilities.formatDate(v, CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(v || ''); };
        rows.forEach(function (r2) {
          if (!r2[hoIdx]) return;
          const get = function (h) { const idx = shi.map[h.toLowerCase()]; return idx !== undefined ? r2[idx] : ''; };
          const status = String(get('Status') || '').trim(), artistResponse = String(get('Artist Response') || '').trim(), sentOnVal = get('Sent On'), state = computeArtistCallState_({ sentOn: sentOnVal, status: status, artistResponse: artistResponse });
          const title = String(get('Title') || '').trim(), link = String(get('Application Link') || ''), category = String(get('Category') || '').trim(), deadlineVal = get('Deadline'), deadline = deadlineVal instanceof Date ? Utilities.formatDate(deadlineVal, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '';
          const inboxHit = resolveInboxRow_(lk, title, link); if (!inboxHit) return;
          const inboxRow = inboxHit.row, inactive = inboxHit.status === 'Archived' || inboxHit.status === 'Pending';
          const base = { row: inboxRow, title: title, category: category, deadline: deadline, fee: String(get('Application Fee') || '').trim(), location: inboxCell_(inboxRow, 'location'), organiser: inboxCell_(inboxRow, 'organiser'), step: state.step, sentOn: dateStr(sentOnVal), inDocOn: dateStr(get('In Doc On')), artistResponse: artistResponse };
          if (state.bucket === 'Unsent') { if (inactive) return; base.expired = isExpired_(deadline, state.step); unsent.push(base); } 
          else if (state.bucket === 'Active') { if (inactive) return; base.expired = isExpired_(deadline, state.step); active.push(base); } 
          else { base.status = status; base.appliedOn = dateStr(get('Applied On')); past.push(base); }
        });
      }
    } catch (e) {}
  }
  artist.unsent = unsent; artist.active = active; artist.past = past; return { ok: true, artist: artist };
}
function p2_saveArtistProfile(b) {
  ensureArtistProfileHeaders_(); const tab = SpreadsheetApp.getActive().getSheetByName(CONFIG.ARTISTS_TAB); if (!tab) return { ok: false, message: 'Artists tab not found.' };
  const wanted = String(b.expectName || '').trim().toLowerCase(), last = tab.getLastRow();
  let rowNum = Number(b.row);
  if (wanted) { const nameAt = function (r) { return (r >= 2 && r <= last) ? String(tab.getRange(r, 1).getValue()).trim().toLowerCase() : ''; }; if (nameAt(rowNum) !== wanted) { rowNum = 0; if (last >= 2) { const names = tab.getRange(2, 1, last - 1, 1).getValues(); for (let i = 0; i < names.length; i++) { if (String(names[i][0]).trim().toLowerCase() === wanted) { rowNum = i + 2; break; } } } } }
  if (!(rowNum >= 2 && rowNum <= last)) return { ok: false, message: 'Artist row not found.' };
  const profile = b.profile || {}, fields = {};
  ['Email', 'Phone', 'Mediums', 'Location', 'Eligibility Notes', 'Notes'].forEach(function (k) { if (profile[k.toLowerCase().replace(/ /g, '')] !== undefined || profile[k] !== undefined) fields[k] = String(profile[k.toLowerCase().replace(/ /g, '')] || profile[k] || ''); });
  if (profile.email !== undefined) fields['Email'] = profile.email; if (profile.phone !== undefined) fields['Phone'] = profile.phone; if (profile.mediums !== undefined) fields['Mediums'] = profile.mediums; if (profile.location !== undefined) fields['Location'] = profile.location; if (profile.eligibilityNotes !== undefined) fields['Eligibility Notes'] = profile.eligibilityNotes; if (profile.notes !== undefined) fields['Notes'] = profile.notes;
  updateRowByHeader(tab, rowNum, fields); return { ok: true, message: 'Profile saved.' };
}