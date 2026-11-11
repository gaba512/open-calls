function docsFolder_() { const props = PropertiesService.getScriptProperties(), id = props.getProperty('DOCS_FOLDER_ID'); if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} } const it = DriveApp.getFoldersByName(P2.DOCS_FOLDER_NAME), folder = it.hasNext() ? it.next() : DriveApp.createFolder(P2.DOCS_FOLDER_NAME); props.setProperty('DOCS_FOLDER_ID', folder.getId()); return folder; }
function getOrCreateArtistDoc_(artistName) {
  const folder = docsFolder_(), docName = artistName + ' — Open Calls', props = PropertiesService.getScriptProperties(), legacyKey = 'doc_' + artistName.toLowerCase().replace(/[^a-z0-9]/g, '_'), key = 'doc_' + Utilities.base64Encode(artistName.toLowerCase(), Utilities.Charset.UTF_8).replace(/[^A-Za-z0-9]/g, ''), savedId = props.getProperty(key) || props.getProperty(legacyKey);
  if (savedId) { try { const doc = DocumentApp.openById(savedId); if (!DriveApp.getFileById(savedId).isTrashed()) { props.setProperty(key, savedId); return doc; } } catch (e) {} }
  const files = folder.getFilesByName(docName); if (files.hasNext()) { const file = files.next(); props.setProperty(key, file.getId()); return DocumentApp.openById(file.getId()); }
  const doc = DocumentApp.create(docName), file = DriveApp.getFileById(doc.getId()); file.moveTo(folder); props.setProperty(key, doc.getId());
  const body = doc.getBody(); body.clear(); body.appendParagraph('Open Calls for ' + artistName).setHeading(DocumentApp.ParagraphHeading.HEADING1); body.appendParagraph('This document lists open calls selected for ' + artistName + '. Review each one and reply with your interest.').setItalic(true); body.appendHorizontalRule(); doc.saveAndClose(); return DocumentApp.openById(doc.getId());
}
function p2_getArtistDoc(b) { const artistName = String(b.artist || '').trim(); if (!artistName) return { ok: false, message: 'No artist specified.' }; try { const doc = getOrCreateArtistDoc_(artistName), lastApproval = latestApproval_('doc', artistName); return { ok: true, docId: doc.getId(), docUrl: doc.getUrl(), artist: artistName, lastEmailed: lastApproval ? Utilities.formatDate(lastApproval.date, CONFIG.TIMEZONE, 'd MMM') : '' }; } catch (err) { return failed('Get artist doc', err, b); } }
function p2_addToDoc(b) {
  const artistName = String(b.artist || '').trim(), rows = (b.rows || []).map(Number); if (!artistName) return { ok: false, message: 'No artist specified.' }; if (!rows.length) return { ok: false, message: 'No calls selected.' };
  const inbox = getInbox(), hi = headerIndex(inbox), doc = getOrCreateArtistDoc_(artistName), body = doc.getBody(), lookup = artistLookup(), sheetLink = lookup[artistName.toLowerCase()];
  let target = null, shi = null; if (sheetLink) { try { target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); shi = headerIndex(target); } catch (e) { target = null; } }
  let added = 0; const problems = [], alreadyHandled = [];
  rows.forEach(function (rowNum) {
    if (!(rowNum >= 2 && rowNum <= inbox.getLastRow())) return;
    const cell = function (h) { var i = hi.map[h.toLowerCase()]; return i !== undefined ? String(inbox.getRange(rowNum, i + 1).getValue() || '').trim() : ''; }, title = cell('Title'), deadline = cell('Deadline'), fee = cell('Application Fee'), link = cell('Application Link'), category = cell('Category'), organiser = cell('Organiser'), eligibility = cell('Eligibility');
    let dupRow = 0; if (target) { try { dupRow = findDuplicate(target, title, link); } catch (e) {} }
    if (dupRow <= 0) { problems.push(artistName + ' has not been assigned this call yet — assign them first.'); return; }
    const inDocOn = target.getRange(dupRow, shi.map['in doc on'] + 1).getValue(), sentOn = target.getRange(dupRow, shi.map['sent on'] + 1).getValue();
    if (inDocOn || sentOn) { alreadyHandled.push(title || 'Untitled'); return; }
    body.appendParagraph(''); body.appendParagraph(title || 'Untitled').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    const details = []; if (deadline) details.push('Deadline: ' + formatDateForDoc_(deadline)); if (category) details.push('Category: ' + category); if (fee) details.push('Fee: ' + fee); if (organiser) details.push('Organiser: ' + organiser); if (eligibility) details.push('Eligibility: ' + eligibility); if (link) details.push('Apply: ' + link);
    details.forEach(function (line) { body.appendParagraph(line); }); body.appendParagraph('Your interest: ☐ Interested  ☐ Not interested  ☐ Need more info'); body.appendHorizontalRule();
    updateRowByHeader(target, dupRow, { 'In Doc On': new Date() }); added++;
  });
  doc.saveAndClose();
  let message = 'Added ' + added + ' call' + (added === 1 ? '' : 's') + ' to ' + artistName + '\'s doc.';
  if (alreadyHandled.length) message = added ? message + ' ' + alreadyHandled.length + ' already in the doc or sent — not added again.' : (alreadyHandled.length === 1 ? 'Already' : 'All ' + alreadyHandled.length + ' already') + ' in ' + artistName + '\'s doc or sent — nothing added again.';
  const result = { ok: added > 0 || alreadyHandled.length > 0, message: message, docUrl: doc.getUrl() }; if (alreadyHandled.length) result.alreadyHandled = alreadyHandled; if (problems.length) result.problems = problems; return result;
}
function formatDateForDoc_(d) { if (d instanceof Date) return Utilities.formatDate(d, CONFIG.TIMEZONE, 'd MMM yyyy'); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) { return Utilities.formatDate(toDate(d), CONFIG.TIMEZONE, 'd MMM yyyy'); } // Sheet cells read as text (e.g. "Wed Mar 10 2027 ...") still get formatted.
  const parsed = new Date(d); if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, CONFIG.TIMEZONE, 'd MMM yyyy'); return String(d); }
function p2_approveDoc(b) {
  const artistName = String(b.artist || '').trim(); if (!artistName) return { ok: false, message: 'No artist specified.' };
  const lookup = artistLookup(), sheetLink = lookup[artistName.toLowerCase()]; let count = 0;
  if (sheetLink) { const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); const shi = headerIndex(target), hoIdx = shi.map['handoff on'], idIdx = shi.map['in doc on'], soIdx = shi.map['sent on'], tiIdx = shi.map['title'], liIdx = shi.map['application link'], last = target.getLastRow(), lk = inboxRowLookup_(); if (hoIdx !== undefined && idIdx !== undefined && soIdx !== undefined && last >= 2) { const rows = target.getRange(2, 1, last - 1, shi.width).getValues(); for (let i = 0; i < rows.length; i++) { if (rows[i][hoIdx] && rows[i][idIdx] && !rows[i][soIdx]) { updateRowByHeader(target, i + 2, { 'Sent On': new Date() }); const hit = resolveInboxRow_(lk, tiIdx !== undefined ? rows[i][tiIdx] : '', liIdx !== undefined ? rows[i][liIdx] : ''); if (hit) addInboxSentTo_(hit.row, artistName); count++; } } } }
  recordApproval_('doc', artistName, artistName + ' doc', b.actingEmail || '');
  const message = count > 0 ? artistName + '\'s doc approved — marked ' + count + ' call' + (count === 1 ? '' : 's') + ' as sent.' : artistName + '\'s doc approved. Nothing left in the doc that wasn\'t already marked sent.';
  return { ok: true, message: message };
}
function ensureArtistSheetP2Headers_(sheet) { const width = Math.max(sheet.getLastColumn(), 1), have = new Set(sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); })), missing = P2.ARTIST_EXTRA_HEADERS.concat(syncFieldLabels_()).filter(function (h) { return !have.has(h.toLowerCase()); }); if (missing.length) sheet.getRange(1, width + 1, 1, missing.length).setValues([missing]).setFontWeight('bold'); }