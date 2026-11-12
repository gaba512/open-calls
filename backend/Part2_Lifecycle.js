function getApprovalsTab_() { const ss = SpreadsheetApp.getActive(); let tab = ss.getSheetByName(P2.APPROVALS_TAB); if (!tab) { tab = ss.insertSheet(P2.APPROVALS_TAB); tab.appendRow(['Approval ID', 'Type', 'Reference', 'Reference Title', 'Approved By', 'Approved By Name', 'Approved On']); tab.getRange(1, 1, 1, 7).setFontWeight('bold'); tab.setFrozenRows(1); } return tab; }
// displayName: the signed-in person's name, shown as "Verified by …" (before, the email address was shown).
function recordApproval_(type, reference, referenceTitle, personId, displayName) { const tab = getApprovalsTab_(), id = Utilities.getUuid().replace(/-/g, '').slice(0, 12), name = String(displayName || '').trim() || personName_(personId) || personId; tab.appendRow([id, type, String(reference), safe_(referenceTitle), personId, safe_(name), new Date()]); return id; }
function latestApproval_(type, reference) { const tab = getApprovalsTab_(), last = tab.getLastRow(); if (last < 2) return null; const rows = tab.getRange(2, 1, last - 1, 7).getValues(); let best = null; rows.forEach(function (r) { if (String(r[1]) === type && String(r[2]) === String(reference)) { if (!best || r[6] > best.date) best = { name: String(r[5] || ''), date: r[6] }; } }); return best; }
function p2_approveCall(b) {
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || '');
  ensureInboxP2Headers_(); const link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || '');
  updateRowByHeader(inbox, rowNum, { 'Team Review': 'Approved to send' }); recordApproval_('call', callApprovalRef_(title, link), title, b.actingEmail || '', b.sender || '');
  return { ok: true, message: 'Approved: ' + title };
}
function ensureInboxP2Headers_() { const inbox = getInbox(), width = Math.max(inbox.getLastColumn(), 1), have = new Set(inbox.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); })), missing = ['Team Review'].filter(function (h) { return !have.has(h.toLowerCase()); }); if (missing.length) inbox.getRange(1, width + 1, 1, missing.length).setValues([missing]).setFontWeight('bold'); }
function p2_assignArtist(b) {
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), row = inbox.getRange(rowNum, 1, 1, hi.width).getValues()[0], get = function (h) { const i = hi.map[h.toLowerCase()]; return i === undefined ? '' : row[i]; };
  if (String(get('Team Review') || '').trim() !== 'Approved to send') return { ok: false, message: 'Approve the call for sending first.' };
  const artist = String(b.artist || '').trim(), title = String(get('Title') || ''), link = String(get('Application Link') || '');
  if (!artist) return { ok: false, message: 'Pick an artist.' };
  if (artistCallsExistFor_(get('OpenCall ID'), artist).length) return { ok: false, message: 'This artist (' + artist + ') already has an ArtistCall on this call. Use the call page to change them.' };
  const lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()]; if (!sheetLink) return { ok: false, message: artist + ' has no sheet linked.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); const dupRow = findDuplicate(target, title, link);
  if (dupRow > 0) { const shi = headerIndex(target), existingHandoff = target.getRange(dupRow, shi.map['handoff on'] + 1).getValue(), existingPayments = target.getRange(dupRow, shi.map['payments'] + 1).getValue(); const up = {}; if (!existingHandoff) up['Handoff On'] = new Date(); if (!existingPayments) { const p = paymentsFromFees_(get('Fees')); up['Payments'] = JSON.stringify(p); up['Paid'] = paymentSummary_(p); } if (Object.keys(up).length) updateRowByHeader(target, dupRow, up); }
  else { const values = {}; COPY_TO_ARTIST.forEach(function (h) { values[h] = get(h); }); Object.assign(values, customSyncFromRow_(get)); values['Handoff On'] = new Date(); const payments = paymentsFromFees_(get('Fees')); values['Payments'] = JSON.stringify(payments); values['Paid'] = paymentSummary_(payments); appendByHeader(target, values); }
  const current = splitNames(get('Artists')); if (current.indexOf(artist) === -1) { current.push(artist); updateRowByHeader(inbox, rowNum, { 'Artists': current.join(', ') }); }
  return { ok: true, message: 'Handed off to ' + artist + ': ' + title };
}
function p2_unassignArtist(b) {
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), artist = String(b.artist || '').trim(), current = splitNames(inbox.getRange(rowNum, hi.map['artists'] + 1).getValue());
  const ocId = String(inbox.getRange(rowNum, hi.map['opencall id'] + 1).getValue() || '');
  if (artist && artistCallsExistFor_(ocId, artist).some(function (x) { return x.state !== 'Unassigned'; })) return unassignArtistCall_(ocId, { artist: artist }, b.actingEmail || '');
  if (current.indexOf(artist) === -1) return { ok: false, message: artist + ' is not assigned to this call.' };
  const title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || ''), lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()];
  if (sheetLink) { const target = openTab(sheetLink), dupRow = findDuplicate(target, title, link); if (dupRow > 0) { const shi = headerIndex(target), sentOn = target.getRange(dupRow, shi.map['sent on'] + 1).getValue(); if (sentOn) return { ok: false, message: artist + ' has already been sent this call.' }; target.deleteRow(dupRow); } }
  const remaining = current.filter(function (n) { return n !== artist; }); updateRowByHeader(inbox, rowNum, { 'Artists': remaining.join(', ') });
  return { ok: true, message: 'Unassigned ' + artist + '.' };
}
function p2_recordArtistResponse(b) {
  if (b.artistCallId) return recordResponseById_(String(b.artistCallId), String(b.response || '').trim(), b.actingEmail || '');
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const response = String(b.response || '').trim(); if (['Interested', 'Not Interested', 'Wants more info', 'No response yet'].indexOf(response) === -1) return { ok: false, message: 'Invalid response.' };
  const artist = String(b.artist || '').trim(), hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || ''), lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()];
  if (!sheetLink) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  const recorded = response !== 'No response yet', fields = { 'Artist Response': response, 'Interested': response === 'Interested', 'Artist Review': recorded ? 'Artist Reviewed' : 'To be Reviewed' };
  if (response === 'Not Interested') { fields['Status'] = 'Declined'; } 
  else { const shi = headerIndex(target), si = shi.map['status'], ari = shi.map['artist response']; const currentStatus = si !== undefined ? String(target.getRange(dupRow, si + 1).getValue() || '').trim() : '', previousResponse = ari !== undefined ? String(target.getRange(dupRow, ari + 1).getValue() || '').trim() : ''; if (currentStatus === 'Declined' && previousResponse === 'Not Interested') fields['Status'] = ''; }
  fields['Response Updated On'] = new Date(); fields['Response Updated By'] = b.sender || b.actingEmail || '';
  updateRowByHeader(target, dupRow, fields); return { ok: true, message: 'Response recorded for ' + artist + '.' };
}
// Saves the note under the artist's response. Stamps who changed it and when, like a response change.
function p2_saveResponseComment(b) {
  if (b.artistCallId) return commentById_(String(b.artistCallId), b.comment, b.actingEmail || '');
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const artist = String(b.artist || '').trim(), hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || ''), lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()];
  if (!sheetLink) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  updateRowByHeader(target, dupRow, { 'Response Comment': String(b.comment || '').slice(0, 2000), 'Response Updated On': new Date(), 'Response Updated By': b.sender || b.actingEmail || '' });
  return { ok: true, message: 'Comment saved.' };
}
// Saves the fields shown on the artist open call to that artist's sheet.
function p2_saveArtistCallFields(b) {
  if (b.artistCallId) return saveFieldsById_(String(b.artistCallId), b);
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const artist = String(b.artist || '').trim(), hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || ''), lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()];
  if (!sheetLink) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  const category = String(inbox.getRange(rowNum, hi.map['category'] + 1).getValue() || '');
  updateRowByHeader(target, dupRow, artistCustomValues_(b.custom, category, title));
  return { ok: true, message: 'Details saved for ' + artist + '.' };
}
function p2_generateEmailText(b) {
  const rowNum = Number(b.row), artist = String(b.artist || '').trim(), inbox = getInbox(); if (!(rowNum >= 2 && rowNum <= inbox.getLastRow())) return { ok: false, message: 'Call not found.' };
  const hi = headerIndex(inbox), cell = function (h) { var i = hi.map[h.toLowerCase()]; return i !== undefined ? String(inbox.getRange(rowNum, i + 1).getValue() || '').trim() : ''; }, title = cell('Title'), deadline = cell('Deadline'), fee = cell('Application Fee'), link = cell('Application Link'), eligibility = cell('Eligibility');
  const lines = ['Hi ' + artist + ',', '', title || 'Untitled']; if (deadline) lines.push('Deadline: ' + formatDateForDoc_(deadline)); if (fee) lines.push('Fee: ' + fee); if (link) lines.push('Apply: ' + link); if (eligibility) lines.push('Eligibility: ' + eligibility);
  return { ok: true, text: lines.join('\n') };
}
function p2_markSent(b) {
  if (b.artistCallId) return markSentById_(String(b.artistCallId), b.actingEmail || '');
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), artist = String(b.artist || '').trim(), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || ''), lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()];
  if (!sheetLink) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  const shi = headerIndex(target), existingSentOn = target.getRange(dupRow, shi.map['sent on'] + 1).getValue();
  if (!existingSentOn) { updateRowByHeader(target, dupRow, { 'Sent On': new Date() }); recordApproval_('send', artist + '|' + callApprovalRef_(title, link), title, b.actingEmail || ''); }
  addInboxSentTo_(rowNum, artist); return { ok: true, message: 'Marked as sent to ' + artist + '.' };
}