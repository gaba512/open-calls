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
// ---- The running pack (rework step 6, Tikorix-docs/7-Running-pack-plan.md) ----
// One Google Doc per artist holds the pitches waiting to be sent. A pitch is "in the pack" when it has an In Doc On
// date and no Sent On date and is still at Pitched. The doc is always rebuilt from that list, so it matches the
// list exactly; Mark pack sent stamps every pitch as sent, keeps a dated copy of the doc, and leaves it empty.
// Works for both storage routes: the ArtistCalls tab (newer) and the row on the artist's own sheet (older).
function pitchRecord_(rowNum, artist) {
  const det = artistCallDetailForRow_(rowNum, artist), acId = det && det.ok !== false ? String((det.call || det).artistCallId || '') : '';
  if (acId) {
    const f = artistCallRowForWrite_(acId); if (f.ok === false) return f;
    const get = function (h) { const i = headerIndex(f.tab).map[h]; return i === undefined ? '' : f.tab.getRange(f.row, i + 1).getValue(); };
    return { ok: true, acId: acId, get: get, set: function (v) { ensureHeaderColumns_(f.tab, Object.keys(v)); updateRowByHeader(f.tab, f.row, v); },
      stage: function () { return pitchStageFor_({ status: String(get('lifecycle status') || '').trim(), sentOn: get('sent on') }, null).stage; } };
  }
  const inbox = getInbox(), hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || '');
  const sheetLink = artistLookup()[String(artist).toLowerCase()], notMatched = { ok: false, message: artist + ' is not matched to "' + (title || 'this opportunity') + '".' }; if (!sheetLink) return notMatched;
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return notMatched;
  const get = function (h) { const i = headerIndex(target).map[h]; return i === undefined ? '' : target.getRange(dupRow, i + 1).getValue(); };
  return { ok: true, acId: '', get: get, set: function (v) { ensureHeaderColumns_(target, Object.keys(v)); updateRowByHeader(target, dupRow, v); },
    stage: function () { return pitchStageFor_(null, { status: String(get('status') || '').trim(), response: String(get('artist response') || '').trim(), sentOn: get('sent on') }).stage; } };
}
// The opportunity fields printed in the pack and in copied text.
function packOpportunity_(rowNum) {
  const inbox = getInbox(), hi = headerIndex(inbox), row = inbox.getRange(rowNum, 1, 1, hi.width).getValues()[0], get = function (h) { const i = hi.map[h]; return i === undefined ? '' : row[i]; };
  return { row: rowNum, title: String(get('title') || '').trim() || 'Untitled', deadline: get('deadline'), category: String(get('category') || '').trim(), fee: String(get('application fee') || '').trim(), organiser: String(get('organiser') || '').trim(), eligibility: String(get('eligibility') || '').trim(), link: String(get('application link') || '').trim(), status: String(get('status') || '').trim(), artists: splitNames(get('artists')) };
}
function packLines_(o) {
  const lines = []; if (o.deadline) lines.push('Deadline: ' + formatDateForDoc_(o.deadline)); if (o.category) lines.push('Category: ' + o.category); if (o.fee) lines.push('Fee: ' + o.fee); if (o.organiser) lines.push('Organiser: ' + o.organiser); if (o.eligibility) lines.push('Eligibility: ' + o.eligibility); if (o.link) lines.push('Apply: ' + o.link);
  return lines;
}
// Every pitch in one artist's pack, oldest addition first.
function packItems_(artist) {
  const inbox = getInbox(), last = inbox.getLastRow(), out = []; if (last < 2) return out;
  for (let r = 2; r <= last; r++) {
    const o = packOpportunity_(r); if (o.status !== 'Confirmed' || o.artists.indexOf(artist) === -1) continue;
    let rec; try { rec = pitchRecord_(r, artist); } catch (e) { continue; } if (!rec || rec.ok === false) continue;
    const inDoc = rec.get('in doc on'); if (!inDoc || rec.get('sent on') || rec.stage() !== 'Pitched') continue;
    o.inDocOn = inDoc instanceof Date ? inDoc.getTime() : 0; o.rec = rec; out.push(o);
  }
  return out.sort(function (a, b) { return a.inDocOn - b.inDocOn; });
}
function rebuildPackDoc_(artist, items) {
  const doc = getOrCreateArtistDoc_(artist), body = doc.getBody(); body.clear();
  body.appendParagraph('Open Calls for ' + artist).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(items.length ? 'This document lists open calls selected for ' + artist + '. Review each one and reply with your interest.' : 'Nothing in the pack yet.').setItalic(true);
  body.appendHorizontalRule();
  items.forEach(function (o) { body.appendParagraph(''); body.appendParagraph(o.title).setHeading(DocumentApp.ParagraphHeading.HEADING2); packLines_(o).forEach(function (l) { body.appendParagraph(l); }); body.appendParagraph('Your interest: ☐ Interested  ☐ Not interested  ☐ Need more info'); body.appendHorizontalRule(); });
  doc.saveAndClose(); return doc;
}
function packSummary_(artist, items, doc) { return { ok: true, artist: artist, count: items.length, docUrl: doc ? doc.getUrl() : '', items: items.map(function (o) { return { row: o.row, title: o.title }; }) }; }
function p2_packGet(b) {
  const artist = String(b.artist || '').trim(); if (!artist) return { ok: false, message: 'Pick an artist.' };
  const items = packItems_(artist); return packSummary_(artist, items, getOrCreateArtistDoc_(artist));
}
// b: { items: [{ row, expectTitle, artist }] }. Each pitch goes into its own artist's pack.
function p2_packAdd(b) {
  const list = Array.isArray(b.items) ? b.items : [], inbox = getInbox(), now = new Date(), touched = {}, skipped = []; let added = 0;
  if (!list.length) return { ok: false, message: 'Pick at least one pitch.' };
  list.forEach(function (it) {
    const rowNum = Number(it.row), artist = String(it.artist || '').trim(), label = (it.expectTitle || 'Untitled') + ' (' + artist + ')';
    if (!artist || it.expectTitle === undefined || !rowMatches_(inbox, rowNum, it.expectTitle)) { skipped.push(label + ': changed since you opened it'); return; }
    const rec = pitchRecord_(rowNum, artist); if (rec.ok === false) { skipped.push(label + ': ' + rec.message); return; }
    if (rec.stage() !== 'Pitched' || rec.get('sent on')) { skipped.push(label + ': already sent or past Pitched'); return; }
    if (!rec.get('in doc on')) { rec.set({ 'In Doc On': now }); added++; }
    touched[artist] = true;
  });
  Object.keys(touched).forEach(function (a) { rebuildPackDoc_(a, packItems_(a)); });
  const msg = added ? 'Added ' + added + ' to the pack.' : 'Nothing new to add.';
  return { ok: added > 0 || Object.keys(touched).length > 0, message: skipped.length ? msg + ' Not added: ' + skipped.join('; ') + '.' : msg, added: added, skipped: skipped };
}
function p2_packRemove(b) {
  const rowNum = Number(b.row), artist = String(b.artist || '').trim(), inbox = getInbox();
  if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const rec = pitchRecord_(rowNum, artist); if (rec.ok === false) return rec;
  if (rec.get('sent on')) return { ok: false, message: 'This pitch has already been sent.' };
  if (!rec.get('in doc on')) return { ok: false, message: 'This pitch is not in the pack.' };
  rec.set({ 'In Doc On': '' }); rebuildPackDoc_(artist, packItems_(artist));
  return { ok: true, message: 'Removed from ' + artist + '’s pack.' };
}
// Marks every pitch in the pack as sent, keeps a dated copy of the doc, then empties it for the next batch.
function p2_packSend(b) {
  const artist = String(b.artist || '').trim(); if (!artist) return { ok: false, message: 'Pick an artist.' };
  const items = packItems_(artist); if (!items.length) return { ok: false, message: artist + '’s pack is empty.' };
  const doc = rebuildPackDoc_(artist, items), stamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'd MMM yyyy, HH:mm');
  const copy = DriveApp.getFileById(doc.getId()).makeCopy(artist + ' — sent ' + stamp, docsFolder_());
  const actor = b.actingEmail || '', failedOn = [];
  items.forEach(function (o) {
    const r = o.rec.acId ? markSentById_(o.rec.acId, actor) : p2_markSent({ row: o.row, expectTitle: o.title === 'Untitled' ? '' : o.title, artist: artist, actingEmail: actor });
    if (!r || r.ok === false) failedOn.push(o.title);
  });
  recordApproval_('doc', artist, artist + ' pack', actor);
  rebuildPackDoc_(artist, packItems_(artist));
  const sent = items.length - failedOn.length;
  return { ok: sent > 0, message: 'Marked ' + sent + ' pitch' + (sent === 1 ? '' : 'es') + ' as sent to ' + artist + '. A copy of the pack was saved.' + (failedOn.length ? ' Not marked: ' + failedOn.join(', ') + '.' : ''), sent: sent, copyUrl: copy.getUrl() };
}
// Text for the clipboard, grouped by artist. Copying never marks anything as sent.
function p2_packText(b) {
  const list = Array.isArray(b.items) ? b.items : [], byArtist = {}, order = [];
  list.forEach(function (it) { const a = String(it.artist || '').trim(), r = Number(it.row); if (!a || !(r >= 2 && r <= getInbox().getLastRow())) return; if (!byArtist[a]) { byArtist[a] = []; order.push(a); } byArtist[a].push(packOpportunity_(r)); });
  if (!order.length) return { ok: false, message: 'Pick at least one pitch.' };
  const blocks = order.map(function (a) { return ['Hi ' + a + ',', '', 'Here are some open calls for you:'].concat(byArtist[a].map(function (o) { return '\n' + o.title + '\n' + packLines_(o).join('\n'); })).join('\n'); });
  return { ok: true, text: blocks.join('\n\n----------\n\n') };
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