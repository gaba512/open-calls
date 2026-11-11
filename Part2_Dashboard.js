function p2_getPipeline() {
  ensureInboxP2Headers_(); const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow(), stages = {}; P2.STAGES.forEach(function (s) { stages[s] = []; }); const lookup = artistLookup(), sheetCache = {};
  const pitches = [], acCache = {}, ocCol = hi.map['opencall id']; let tomb = null;
  if (last >= 2) {
    const rows = inbox.getRange(2, 1, last - 1, hi.width).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][hi.map['status']] || '').trim() !== 'Confirmed') continue;
      const title = String(rows[i][hi.map['title']] || '').trim(), link = String(rows[i][hi.map['application link']] || '').trim(), artistsStr = String(rows[i][hi.map['artists']] || '').trim(), artists = splitNames(artistsStr), teamReview = String(rows[i][hi.map['team review']] || '').trim(), deadline = rows[i][hi.map['deadline']], deadlineStr = deadline instanceof Date ? Utilities.formatDate(deadline, CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(deadline || '');
      const states = artistCallStatesForRow_(artists, title, link, lookup, sheetCache), stage = pipelineStageForCall_(teamReview, artists, states), responses = [];
      states.forEach(function (s) { if (s.response && s.response !== 'No response yet' && responses.indexOf(s.response) === -1) responses.push(s.response); });
      const entry = { row: i + 2, title: title, artists: artistsStr, deadline: deadlineStr, category: String(rows[i][hi.map['category']] || '').trim(), fee: String(rows[i][hi.map['application fee']] || '').trim(), teamReview: teamReview, artistResponse: responses.join(', '), docStatus: states.some(function (s) { return !!s.sentOn; }) ? 'Sent' : (states.some(function (s) { return !!s.inDocOn; }) ? 'In doc' : '') };
      if (stages[stage]) stages[stage].push(entry); else stages['Added'].push(entry);
      const ocId = ocCol !== undefined ? String(rows[i][ocCol] || '').trim() : '';
      artists.forEach(function (name) {
        const sheetLink = lookup[String(name).toLowerCase()]; let rec = null, old = null;
        if (sheetLink && ocId) { if (tomb === null) { try { tomb = tombstonedIds_(); } catch (e) { tomb = {}; } } rec = artistCallsFor_(sheetLink, acCache, tomb)[ocId] || null; }
        states.forEach(function (s) { if (s.name === name) old = s; });
        const p = pitchStageFor_(rec, old), src = rec || old || {};
        pitches.push({ row: i + 2, title: title, artist: name, stage: p.stage, tag: p.tag, reason: p.reason, sentOn: dateYmd_(src.sentOn), owner: String(src.owner || '').trim(), deadline: deadlineStr, category: entry.category, fee: entry.fee });
      });
    }
  }
  return { ok: true, stages: stages, stageOrder: P2.STAGES, pitches: pitches, pitchStages: PITCH_STAGES_ };
}
// A pitch is one artist on one opportunity. Its stage is that artist's own, never the furthest of the group.
const PITCH_STAGES_ = ['Pitched', 'Preparing', 'Submitted', 'Won', 'Closed'];
// rec: the artist's ArtistCalls record (newer route). old: the row on the artist's own sheet (older route).
function pitchStageFor_(rec, old) {
  const at = function (stage, tag, reason) { return { stage: stage, tag: tag || '', reason: reason || '' }; };
  const sentTag = function (v) { return v ? 'sent' : 'not sent yet'; };
  if (rec) {
    const s = String(rec.status || '');
    if (s === 'Accepted') return at('Won');
    if (s === 'Declined') return at('Closed', '', 'not selected');
    if (s === 'Not Interested') return at('Closed', '', 'not interested');
    if (s === 'Application Sent') return at('Submitted');
    if (s === 'Interested' || s === 'Application') return at('Preparing');
    if (s.indexOf('Need More Info') !== -1) return at('Pitched', 'needs info');
    return at('Pitched', sentTag(rec.sentOn));
  }
  if (old) {
    const s = String(old.status || ''), r = String(old.response || '');
    if (s === 'Accepted') return at('Won');
    if (s === 'Declined' || s === 'Not Selected') return at('Closed', '', 'not selected');
    if (s === 'Not Interested' || s === 'Not Moving Forward' || r === 'Not Interested') return at('Closed', '', 'not interested');
    if (s === 'Applied' || s === 'Awaiting Response' || s === 'Application Sent') return at('Submitted');
    if (s === 'In Progress' || s === 'On Hold' || s === 'Application' || r === 'Interested') return at('Preparing');
    if (r === 'Wants more info') return at('Pitched', 'needs info');
    return at('Pitched', sentTag(old.sentOn));
  }
  return at('Pitched', 'not sent yet');
}
// One artist's ArtistCalls records, keyed by OpenCall ID. Unassigned and tombstoned records are left out.
function artistCallsFor_(sheetLink, cache, tomb) {
  if (cache[sheetLink]) return cache[sheetLink];
  const out = {}; cache[sheetLink] = out;
  try {
    const tab = SpreadsheetApp.openByUrl(sheetLink).getSheetByName(CONFIG.ARTISTCALLS_TAB); if (!tab || tab.getLastRow() < 2) return out;
    const th = headerIndex(tab), oc = th.map['opencall id'], st = th.map['lifecycle status'], ac = th.map['artistcall id'], so = th.map['sent on'], a = th.map['assigned to']; if (oc === undefined || st === undefined) return out;
    tab.getRange(2, 1, tab.getLastRow() - 1, th.width).getValues().forEach(function (r) {
      const id = String(r[oc] || '').trim(), status = String(r[st] || '').trim(); if (!id || status === 'Unassigned') return; if (ac !== undefined && tomb[String(r[ac] || '')]) return;
      out[id] = { status: status, sentOn: so !== undefined ? r[so] : '', owner: a !== undefined ? r[a] : '' };
    });
  } catch (e) {}
  return out;
}
function p2_getDashboard() {
  ensureInboxP2Headers_(); const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow(), pipelineCounts = {}, upcoming = [], fees = { paid: [], pending: [], afterSelection: [] }, byArtist = {};
  P2.STAGES.forEach(function (s) { pipelineCounts[s] = 0; }); let totalCalls = 0; const appStatus = { applied: 0, awaiting: 0, accepted: 0 }; let expiredCount = 0; const lookup = artistLookup(), sheetCache = {};
  if (last >= 2) {
    const rows = inbox.getRange(2, 1, last - 1, hi.width).getValues(), now = new Date(); now.setHours(0, 0, 0, 0);
    for (let i = 0; i < rows.length; i++) {
      const status = String(rows[i][hi.map['status']] || '').trim(); if (status === 'Archived' || status === 'Pending') continue; totalCalls++;
      const title = String(rows[i][hi.map['title']] || '').trim(), link = String(rows[i][hi.map['application link']] || '').trim(), artistsStr = String(rows[i][hi.map['artists']] || '').trim(), artists = splitNames(artistsStr), deadline = rows[i][hi.map['deadline']], deadlineStr = deadline instanceof Date ? Utilities.formatDate(deadline, CONFIG.TIMEZONE, 'yyyy-MM-dd') : '', fee = String(rows[i][hi.map['application fee']] || '').trim(), teamReview = String(rows[i][hi.map['team review']] || '').trim(), states = artistCallStatesForRow_(artists, title, link, lookup, sheetCache), stage = pipelineStageForCall_(teamReview, artists, states);
      if (pipelineCounts[stage] !== undefined) pipelineCounts[stage]++;
      // A call where every artist already has an outcome is finished: it no longer counts as closing soon.
      const resolved = states.length > 0 && states.every(function (s) { return ['Accepted', 'Declined', 'Not Selected'].indexOf(s.status) !== -1; });
      if (deadline instanceof Date && !resolved) { const days = Math.round((deadline - now) / 86400000); if (days >= 0 && days <= 30) upcoming.push({ row: i + 2, title: title, artists: artistsStr, deadline: deadlineStr, days: days }); }
      let paidFlag = false, afterFlag = false, appliedFlag = false, acceptedFlag = false, awaitingFlag = false, expiredFlag = false;
      states.forEach(function (s) { if (!byArtist[s.name]) byArtist[s.name] = { sent: 0, yes: 0, no: 0, needInfo: 0, waiting: 0 }; if (s.paid === 'Paid') paidFlag = true; else if (s.paid === 'After Selection') afterFlag = true; if (s.status === 'Applied' || s.status === 'In Progress') appliedFlag = true; else if (s.status === 'Accepted') acceptedFlag = true; else if (s.status === 'Awaiting Response' || s.status === 'On Hold') awaitingFlag = true; const step = computeArtistCallState_({ sentOn: s.sentOn, status: s.status, artistResponse: s.response }).step; if (isExpired_(deadlineStr, step)) expiredFlag = true; if (s.sentOn) { byArtist[s.name].sent++; if (s.response === 'Interested') byArtist[s.name].yes++; else if (s.response === 'Not Interested') byArtist[s.name].no++; else if (s.response === 'Wants more info') byArtist[s.name].needInfo++; else byArtist[s.name].waiting++; } });
      if (expiredFlag) expiredCount++; if (appliedFlag) appStatus.applied++; else if (acceptedFlag) appStatus.accepted++; else if (awaitingFlag) appStatus.awaiting++;
      if (fee && fee.toLowerCase() !== 'free' && fee !== '0' && fee !== '-' && teamReview === 'Approved to send') { const feeEntry = { row: i + 2, title: title, fee: fee, artists: artistsStr }; if (paidFlag) fees.paid.push(feeEntry); else if (afterFlag) fees.afterSelection.push(feeEntry); else fees.pending.push(feeEntry); }
    }
  }
  upcoming.sort(function (a, b) { return a.days - b.days; });
  const work = dashboardWork_();
  return { ok: true, pipeline: pipelineCounts, stageOrder: P2.STAGES, upcoming: upcoming.slice(0, 15), fees: fees, byArtist: byArtist, totalCalls: totalCalls, appStatus: appStatus, expiredCount: expiredCount, work: work };
}
function isExpired_(deadlineStr, step) { if (!deadlineStr || step === 'Outcome') return false; if (!/^\d{4}-\d{2}-\d{2}$/.test(String(deadlineStr))) return false; return String(deadlineStr) < Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd'); }
function p2_getNeedsAttention() {
  const inbox = getInbox(), hi = headerIndex(inbox), last = inbox.getLastRow(), unassigned = [], stalledUnsent = [], silentArtists = [], closingSoon = [];
  if (last >= 2) {
    const rows = inbox.getRange(2, 1, last - 1, hi.width).getValues(), now = new Date(), today = new Date(); today.setHours(0, 0, 0, 0);
    const daysSince_ = function (d) { return Math.floor((now - d) / 86400000); }, lookup = artistLookup(), sheetCache = {};
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][hi.map['status']] || '').trim() !== 'Confirmed') continue;
      const rowNum = i + 2, title = String(rows[i][hi.map['title']] || '').trim(), link = String(rows[i][hi.map['application link']] || '').trim(), artistsStr = String(rows[i][hi.map['artists']] || '').trim(), artists = splitNames(artistsStr), confirmedOnVal = rows[i][hi.map['confirmed on']], deadlineVal = rows[i][hi.map['deadline']];
      if (!artists.length) { if (confirmedOnVal instanceof Date && daysSince_(confirmedOnVal) > 2) unassigned.push({ row: rowNum, title: title, days: daysSince_(confirmedOnVal) }); continue; }
      let deadlineDays = null; if (deadlineVal instanceof Date) deadlineDays = Math.round((deadlineVal - today) / 86400000);
      artists.forEach(function (name) {
        const sheetLink = lookup[name.toLowerCase()]; if (!sheetLink) return;
        try { let target = sheetCache[sheetLink]; if (target === undefined) { target = openTab(sheetLink); sheetCache[sheetLink] = target; } const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return; const shi = headerIndex(target), hoIdx = shi.map['handoff on'], soIdx = shi.map['sent on'], stIdx = shi.map['status'], arIdx = shi.map['artist response']; const handoffOnVal = hoIdx !== undefined ? target.getRange(dupRow, hoIdx + 1).getValue() : '', sentOnVal = soIdx !== undefined ? target.getRange(dupRow, soIdx + 1).getValue() : '', statusVal = stIdx !== undefined ? String(target.getRange(dupRow, stIdx + 1).getValue() || '').trim() : '', artistResponseText = arIdx !== undefined ? String(target.getRange(dupRow, arIdx + 1).getValue() || '').trim() : ''; if (handoffOnVal instanceof Date && !sentOnVal) { const days = daysSince_(handoffOnVal); if (days > 3) stalledUnsent.push({ row: rowNum, title: title, artist: name, days: days }); } if (sentOnVal instanceof Date && (!artistResponseText || artistResponseText === 'No response yet')) { const days = daysSince_(sentOnVal); if (days > 14) silentArtists.push({ row: rowNum, title: title, artist: name, days: days }); } if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7) { const state = computeArtistCallState_({ sentOn: sentOnVal, status: statusVal, artistResponse: artistResponseText }); if (state.step !== 'Application' && state.step !== 'Outcome') closingSoon.push({ row: rowNum, title: title, artist: name, days: deadlineDays }); } } catch (e) {}
      });
    }
  }
  return { ok: true, unassigned: unassigned, stalledUnsent: stalledUnsent, silentArtists: silentArtists, closingSoon: closingSoon };
}
function p2_getEntry(b) {
  ensureInboxP2Headers_(); const rowNum = Number(b.row), inbox = getInbox(); if (!(rowNum >= 2 && rowNum <= inbox.getLastRow())) return { ok: false, message: 'Entry not found.' };
  const hi = headerIndex(inbox), row = inbox.getRange(rowNum, 1, 1, hi.width).getValues()[0], entry = { row: rowNum };
  Object.keys(hi.map).forEach(function (k) { if (k !== 'calendar event id' && k !== 'source files') entry[k] = row[hi.map[k]]; });
  if (entry['deadline'] instanceof Date) entry['deadline'] = Utilities.formatDate(entry['deadline'], CONFIG.TIMEZONE, 'yyyy-MM-dd'); if (entry['added on'] instanceof Date) entry['added on'] = Utilities.formatDate(entry['added on'], CONFIG.TIMEZONE, 'd MMM');
  ['announcement date', 'event dates'].forEach(function (k) { if (entry[k] instanceof Date) entry[k] = Utilities.formatDate(entry[k], CONFIG.TIMEZONE, 'd MMM yyyy'); });
  entry.hasSource = !!String(row[hi.map['source files']] || '').trim(); entry.approvedBy = null;
  if (String(entry['team review'] || '').trim() === 'Approved to send') { const ref = callApprovalRef_(String(entry['title'] || ''), String(entry['application link'] || '')); const a = latestApproval_('call', ref) || latestApproval_('call', rowNum); if (a) entry.approvedBy = { name: a.name, date: Utilities.formatDate(a.date, CONFIG.TIMEZONE, 'd MMM') }; }
  // Where the call is in the pipeline (Added → Approved → In doc → Emailed → Responded → Applied → Outcome).
  const artistNames = splitNames(entry.artists);
  const states = artistCallStatesForRow_(artistNames, String(entry.title || ''), String(entry['application link'] || ''), artistLookup(), {});
  entry.stage = pipelineStageForCall_(entry['team review'], artistNames, states);
  entry.stages = P2.STAGES;
  return { ok: true, entry: entry };
}
function p2_getArtistCall(b) {
  if (b.artistCallId) { const byId = artistCallDetailById_(String(b.artistCallId)); if (byId) return byId; }
  const fromNew = artistCallDetailForRow_(Number(b.row), String(b.artist || '').trim()); if (fromNew) return fromNew;
  const rowNum = Number(b.row), artist = String(b.artist || '').trim(), inbox = getInbox(); if (!(rowNum >= 2 && rowNum <= inbox.getLastRow())) return { ok: false, message: 'Call not found.' };
  const hi = headerIndex(inbox), cell = function (h) { var i = hi.map[h.toLowerCase()]; return i !== undefined ? String(inbox.getRange(rowNum, i + 1).getValue() || '').trim() : ''; }, deadlineVal = hi.map['deadline'] !== undefined ? inbox.getRange(rowNum, hi.map['deadline'] + 1).getValue() : '', deadline = deadlineVal instanceof Date ? Utilities.formatDate(deadlineVal, CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(deadlineVal || '');
  const title = cell('Title'), link = cell('Application Link'), notAssigned = { ok: false, message: artist + ' is not assigned to this call.' }, lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()]; if (!sheetLink) return notAssigned;
  const target = openTab(sheetLink), dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return notAssigned;
  const shi = headerIndex(target), get = function (h) { const idx = shi.map[h.toLowerCase()]; return idx !== undefined ? target.getRange(dupRow, idx + 1).getValue() : ''; }, dateStr = function (v) { return v instanceof Date ? Utilities.formatDate(v, CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(v || ''); };
  const handoffOnVal = get('Handoff On'), sentOnVal = get('Sent On'), status = String(get('Status') || '').trim(), artistResponse = String(get('Artist Response') || '').trim(), state = computeArtistCallState_({ sentOn: sentOnVal, status: status, artistResponse: artistResponse });
  const call = { title: title, deadline: deadline, fee: cell('Application Fee'), link: link, organiser: cell('Organiser'), eligibility: cell('Eligibility'), category: cell('Category'), handoffOn: dateStr(handoffOnVal), sentOn: dateStr(sentOnVal), artistResponse: artistResponse, status: status, paid: String(get('Paid') || '').trim(), appliedOn: dateStr(get('Applied On')), submittedDocs: String(get('Submitted Docs') || '').trim(), comments: String(get('Comments on Applications') || '').trim(), step: state.step, bucket: state.bucket, expired: isExpired_(deadline, state.step), responseUpdatedOn: dateStr(get('Response Updated On')), responseUpdatedBy: String(get('Response Updated By') || '').trim(), responseComment: String(get('Response Comment') || '').trim(), custom: artistCustomFromSheet_(target, dupRow), assignedTo: String(get('Assigned To') || '').trim(), dueOn: dateStr(get('Due On')), artworks: String(get('Artworks') || ''), payments: parseFeeList_(get('Payments')), fees: parseFeeList_(cell('Fees')), organiserEmail: cell('Organiser Email'), requiredDocs: requiredDocsList_(cell('Required Docs')), docs: docsChecklist_(requiredDocsList_(cell('Required Docs')), get('Docs Checklist')), applicationFolder: String(get('Application Folder') || '') };
  return { ok: true, call: call };
}
function p2_updateEntry(b) {
  ensureInboxP2Headers_(); const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const fields = {}, allowed = ['Team Review'], data = b.data || {};
  allowed.forEach(function (k) { const key = k.toLowerCase().replace(/ /g, ''); if (data[key] !== undefined) fields[k] = String(data[key]); if (data[k] !== undefined) fields[k] = String(data[k]); });
  if (!Object.keys(fields).length) return { ok: false, message: 'Nothing to save.' }; updateRowByHeader(inbox, rowNum, fields); return { ok: true, message: 'Updated.' };
}
function p2_updateApplicationDetails(b) {
  if (b.artistCallId) return updateDetailsById_(String(b.artistCallId), b);
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || ''), artist = String(b.artist || '').trim(); if (!artist) return { ok: false, message: 'Assign an artist before setting application details.' };
  const d = b.details || {}, fields = {}; if (d.status !== undefined) fields['Status'] = String(d.status); if (d.appliedOn !== undefined) fields['Applied On'] = String(d.appliedOn); if (d.submittedDocs !== undefined) fields['Submitted Docs'] = String(d.submittedDocs); if (d.comments !== undefined) fields['Comments on Applications'] = String(d.comments);
  if (d.assignedTo !== undefined) {
    // Only people from Manage people can be assigned.
    const assignee = String(d.assignedTo).trim();
    if (assignee && p2_getPeople().people.map(function (p) { return p.name; }).indexOf(assignee) === -1) return { ok: false, message: assignee + ' is not in Manage people. Add them there first.' };
    fields['Assigned To'] = assignee.slice(0, 60);
  }
  if (d.dueOn !== undefined) fields['Due On'] = String(d.dueOn);
  if (d.artworks !== undefined) fields['Artworks'] = String(d.artworks).slice(0, 5000);
  // Payments are tracked per application. The Paid column keeps a short summary of them.
  if (d.payments !== undefined) { const payments = parseFeeList_(JSON.stringify(d.payments)); fields['Payments'] = JSON.stringify(payments); fields['Paid'] = paymentSummary_(payments); }
  if (!Object.keys(fields).length) return { ok: true, message: 'Nothing to save.' }; const lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()]; if (!sheetLink) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target); const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return { ok: false, message: artist + ' has not been assigned this call yet.' };
  if (d.status === 'Applied' && !fields['Applied On']) { const shi = headerIndex(target), ai = shi.map['applied on'], current = ai !== undefined ? target.getRange(dupRow, ai + 1).getValue() : ''; delete fields['Applied On']; if (!current) fields['Applied On'] = new Date(); }
  updateRowByHeader(target, dupRow, fields); return { ok: true, message: 'Application details saved.' };
}
function setupEverything() { const ss = SpreadsheetApp.getActive(); getInbox(); let tab = ss.getSheetByName(CONFIG.ARTISTS_TAB); if (!tab) { tab = ss.insertSheet(CONFIG.ARTISTS_TAB); tab.getRange(1, 1, 1, 2).setValues([['Artist Name', 'Sheet Link']]).setFontWeight('bold'); tab.setFrozenRows(1); tab.getRange(2, 1, STARTING_ARTISTS.length, 2).setValues(STARTING_ARTISTS); tab.setColumnWidth(2, 500); } getTeam_(); getCalendar(); uploadsFolder_(); const keep = ['onTeamOrArtistsEdit', 'cleanupSourceFiles', 'syncAllCalendar']; ScriptApp.getProjectTriggers().forEach(function (t) { const h = t.getHandlerFunction(); if (keep.indexOf(h) !== -1 || h === 'onArtistsEdit' || h === 'healthCheck') ScriptApp.deleteTrigger(t); }); ScriptApp.newTrigger('onTeamOrArtistsEdit').forSpreadsheet(ss).onEdit().create(); ScriptApp.newTrigger('cleanupSourceFiles').timeBased().everyDays(1).atHour(3).create(); const lookup = artistLookup(); Object.keys(lookup).forEach(function (n) { try { Logger.log('OK: ' + n + ' -> tab "' + openTab(lookup[n]).getName() + '"'); } catch (err) { Logger.log('PROBLEM: ' + n + ' -> ' + err.message); } }); const cal = getCalendar(); Logger.log('Setup done. Calendar: "' + cal.getName() + '" (ID: ' + cal.getId() + '). Uploads folder: ' + uploadsFolder_().getUrl()); }
function setupPart2() { getPeopleTab_(); getApprovalsTab_(); ensureArtistProfileHeaders_(); ensureInboxP2Headers_(); docsFolder_(); const lookup = artistLookup(); Object.keys(lookup).forEach(function (name) { try { var target = openTab(lookup[name]); ensureArtistSheetP2Headers_(target); Logger.log('OK: ' + name + ' sheet updated with Part 2 columns'); } catch (err) { Logger.log('PROBLEM: ' + name + ' -> ' + err.message); } }); Logger.log('Part 2 setup done. Docs folder: ' + docsFolder_().getUrl()); }