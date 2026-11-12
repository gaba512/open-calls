function doPost(e) {
  let body = {};
  try {
    const raw = (e.postData && e.postData.contents) || '';
    if (raw && raw.trim().charAt(0) === '{') body = JSON.parse(raw);
    else body = e.parameter || {};
    if (body.action === 'approveConfirm') return approvePage_(body.id, true);
    return jsonOut(route(body));
  } catch (err) { return jsonOut(failed('Request', err, body)); }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'approve') return approvePage_(p.id, false);
  return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:20px">Open Calls lives here: <a href="' + esc_(CONFIG.APP_URL) + '" target="_top">' + esc_(CONFIG.APP_URL) + '</a></p>');
}

// Fail-closed environment gate. 'production' is always allowed. 'local' is allowed only when the script is NOT a real
// Apps Script deployment: the local test harness reports a mock service URL, while a real deployment reports a
// https://script.google.com/macros/... URL. If the URL cannot be read, or anything else is set, requests are refused.
function envAllowed_() {
  if (CONFIG.ENV === 'production') return true;
  if (CONFIG.ENV !== 'local') return false;
  try { return /^https:\/\/script\.google\.com\/mock\/exec$/.test(String(ScriptApp.getService().getUrl() || '')); } catch (e) { return false; }
}

function route(b) {
  if (!envAllowed_()) return { ok: false, message: 'The server is not configured for this environment.' };
  switch (b.action) {
    case 'googleSignIn': return googleSignIn_(b.credential);
    case 'whoami': return whoami_(b.token);
    case 'signOut': return signOut_(b.token);
  }
  const who = member_(b.token);
  if (!who.ok) return who;
  b.sender = who.name; b.actingEmail = who.email;
  switch (b.action) {
    case 'artists': return guard_('Load artists', b, function () { return { ok: true, artists: artistNames() }; });
    case 'categories': return guard_('Load categories', b, function () { return getCategories(); });
    case 'formFields': return guard_('Load form fields', b, function () { return getFormFields(); });
    case 'saveArtistCallFields': return withLock_(function () { return guard_('Save details', b, function () { return p2_saveArtistCallFields(b); }); });
    case 'getReminders': return guard_('Load reminders', b, function () { return getReminders(); });
    case 'getReport': return guard_('Load report', b, function () { return getReport(b); });
    case 'exportDashboardTab': return withLock_(function () { return guard_('Export dashboard', b, function () { return exportDashboardTab(b); }); });
    case 'deleteReminder': return withLock_(function () { return guard_('Delete reminder', b, function () { return deleteReminder(b); }); });
    case 'deleteFormField': return withLock_(function () { return guard_('Remove form field', b, function () { return deleteFormFieldFromPage(b); }); });
    case 'dashboardStats': return guard_('Load dashboard stats', b, function () { return { ok: true, stats: dashboardStats_() }; });
    case 'uploadPaymentProof': return withLock_(function () { return guard_('Upload proof of payment', b, function () { return p2_uploadPaymentProof(b); }); });
    case 'saveReportTab': return withLock_(function () { return guard_('Save report', b, function () { return saveReportTab(b); }); });
    case 'openApplicationFolder': return withLock_(function () { return guard_('Open application folder', b, function () { return p2_openApplicationFolder(b); }); });
    case 'saveDocsChecklist': return withLock_(function () { return guard_('Save documents', b, function () { return p2_saveDocsChecklist(b); }); });
    case 'saveReminder': return withLock_(function () { return guard_('Save reminder', b, function () { return saveReminder(b); }); });
    case 'setReminderActive': return withLock_(function () { return guard_('Turn reminder on or off', b, function () { return setReminderActive(b); }); });
    case 'addFormField': return withLock_(function () { return guard_('Add field', b, function () { return addFormFieldFromPage(b); }); });
    case 'updateFormField': return withLock_(function () { return guard_('Update field', b, function () { return updateFormFieldFromPage(b); }); });
    case 'addCategory': return withLock_(function () { return guard_('Add category', b, function () { return addCategoryFromPage(b.name); }); });
    case 'addArtist': return withLock_(function () { return guard_('Add artist', b, function () { return addArtistFromPage(b.name, b.link, who.name); }); });
    case 'preview': return limited_(b, who.email) || previewFromPage(b);
    case 'stage': return limited_(b, who.email) || stageForReview(b);
    case 'getStaged': return guard_('Load review link', b, function () { return getStaged(b.id); });
    case 'save': return withLock_(function () { return saveCheckedFromPage(b); });
    case 'update': return withLock_(function () { return guard_('Save changes', b, function () { return updateEntry_(b, who.name); }); });
    case 'bulkArchive': return withLock_(function () { return guard_('Archive', b, function () { return bulkArchive_(b); }); });
    case 'deleteEntry': return withLock_(function () { return guard_('Delete', b, function () { return deleteEntry_(b); }); });
    case 'getQueue': return guard_('Load drafts', b, function () { return getQueue_('Pending'); });
    case 'getInbox': return guard_('Load open calls', b, function () { return getQueue_('Confirmed'); });
    case 'getArchived': return guard_('Load archive', b, function () { return getQueue_('Archived'); });
    case 'counts': return guard_('Load counts', b, function () { return getCounts_(); });
    case 'getSourceFiles': return guard_('Load source files', b, function () { return getSourceFiles_(b); });
    default:
      if (b.action && b.action.indexOf('p2_') === 0) return p2Route(b);
      return { ok: false, message: 'The app is out of date. Refresh the page.' };
  }
}

// Writes addressed by sheet row must also say which open call they mean (its title) or use an ID.
// Without that, a row that moved since the page loaded would receive someone else's change.
const P2_ROW_WRITES_ = { p2_assignArtist: 1, p2_unassignArtist: 1, p2_updateApplicationDetails: 1, p2_movePitch: 1, p2_packRemove: 1 };
function rowWriteUnidentified_(b) {
  if (!P2_ROW_WRITES_[b.action] || b.openCallId || b.artistCallId) return false;
  return b.expectTitle === undefined || b.expectTitle === null || String(b.expectTitle).trim() === '';
}

function p2Route(b) {
  if (rowWriteUnidentified_(b)) return STALE_;
  switch (b.action) {
    case 'p2_getPeople':       return guard_('Load people', b, function () { return p2_getPeople(); });
    case 'p2_setMyPerson':     return withLock_(function () { return guard_('Choose person', b, function () { return p2_setMyPerson(b); }); });
    case 'p2_renamePerson':    return withLock_(function () { return guard_('Rename person', b, function () { return p2_renamePerson(b); }); });
    case 'p2_deletePerson':    return withLock_(function () { return guard_('Remove person', b, function () { return p2_deletePerson(b); }); });
    case 'p2_getArtistProfile':  return guard_('Load artist profile', b, function () { return p2_getArtistProfile(b); });
    case 'p2_saveArtistProfile': return withLock_(function () { return guard_('Save artist profile', b, function () { return p2_saveArtistProfile(b); }); });
    case 'p2_getArtists':        return guard_('Load artists', b, function () { return p2_getArtists(); });
    case 'p2_approveCall':     return withLock_(function () { return guard_('Approve call', b, function () { return p2_approveCall(b); }); });
    case 'p2_assignArtist':    return withLock_(function () { return guard_('Assign artist', b, function () { return b.openCallId ? assignArtistCall_(b.openCallId, { artistId: b.artistId, artist: b.artist }, b.actingEmail || '') : p2_assignArtist(b); }); });
    case 'p2_unassignArtist':  return withLock_(function () { return guard_('Unassign artist', b, function () { return b.openCallId ? unassignArtistCall_(b.openCallId, { artistId: b.artistId, artist: b.artist }, b.actingEmail || '') : p2_unassignArtist(b); }); });
    case 'p2_saveResponseComment': return withLock_(function () { return guard_('Save comment', b, function () { return p2_saveResponseComment(b); }); });
    case 'p2_recordArtistResponse': return withLock_(function () { return guard_('Artist response', b, function () { return p2_recordArtistResponse(b); }); });
    case 'p2_generateEmailText': return guard_('Write email text', b, function () { return p2_generateEmailText(b); });
    case 'p2_markSent':        return withLock_(function () { return guard_('Mark as sent', b, function () { return p2_markSent(b); }); });
    case 'p2_getArtistDoc':    return guard_('Load artist doc', b, function () { return p2_getArtistDoc(b); });
    // The pitch page's "Add to doc" and the doc review's "Approve" now use the running pack (both storage routes).
    case 'p2_addToDoc':        return withLock_(function () { return guard_('Add to doc', b, function () { const inbox = getInbox(), ti = headerIndex(inbox).map['title']; const r = p2_packAdd({ items: (b.rows || []).map(Number).filter(function (n) { return n >= 2 && n <= inbox.getLastRow(); }).map(function (n) { return { row: n, artist: b.artist, expectTitle: String(inbox.getRange(n, ti + 1).getValue() || '') }; }) }); if (r.ok !== false || r.added === 0) { try { r.docUrl = getOrCreateArtistDoc_(String(b.artist || '').trim()).getUrl(); } catch (e) {} } return r; }); });
    case 'p2_approveDoc':      return withLock_(function () { return guard_('Approve doc', b, function () { return p2_packSend(b); }); });
    case 'p2_pipeline':        return guard_('Load pipeline', b, function () { return p2_getPipeline(); });
    case 'p2_getAlerts':       return guard_('Load alerts', b, function () { return p2_getAlerts(); });
    case 'p2_dashboard':       return guard_('Load dashboard', b, function () { return p2_getDashboard(); });
    case 'p2_getNeedsAttention': return guard_('Load needs attention', b, function () { return p2_getNeedsAttention(); });
    case 'p2_getEntry':        return guard_('Load entry', b, function () { return p2_getEntry(b); });
    case 'p2_getArtistCall':   return guard_('Load application', b, function () { return p2_getArtistCall(b); });
    case 'p2_getArtistCallHistory': return guard_('Load history', b, function () { return artistCallHistory_(b); });
    case 'p2_updateEntry':     return withLock_(function () { return guard_('Update entry', b, function () { return p2_updateEntry(b); }); });
    case 'p2_updateApplicationDetails': return withLock_(function () { return guard_('Update application details', b, function () { return p2_updateApplicationDetails(b); }); });
    case 'p2_packGet':    return guard_('Load pack', b, function () { return p2_packGet(b); });
    case 'p2_packText':   return guard_('Copy pack text', b, function () { return p2_packText(b); });
    case 'p2_packAdd':    return withLock_(function () { return guard_('Add to pack', b, function () { return p2_packAdd(b); }); });
    case 'p2_packRemove': return withLock_(function () { return guard_('Remove from pack', b, function () { return p2_packRemove(b); }); });
    case 'p2_packSend':   return withLock_(function () { return guard_('Mark pack sent', b, function () { return p2_packSend(b); }); });
    case 'p2_movePitch': return withLock_(function () { return guard_('Move pitch', b, function () { return p2_movePitch(b); }); });
    case 'p2_getArtistPipeline': return guard_('Load artist pipeline', b, function () { return p2_getArtistPipeline(); });
    case 'p2_confirmSubmission': return withLock_(function () { return guard_('Confirm submission', b, function () { return b.artistCallId ? confirmSubmissionById_(String(b.artistCallId), b.actingEmail || '') : { ok: false, message: 'Pick an application first.' }; }); });
    default: return { ok: false, message: 'Unknown Part 2 action.' };
  }
}

function guard_(where, body, fn) { try { return fn(); } catch (err) { return failed(where, err, body); } }
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, message: 'Someone else is saving right now. Try again in a moment.' }; }
  // Any save can change who is assigned to what, or move rows, so the Open Calls assignee cache is dropped.
  try { CacheService.getScriptCache().remove('assignees_by_row'); } catch (e) {}
  try { return fn(); } finally { lock.releaseLock(); }
}

function logProblem(where, level, message, body) {
  body = body || {};
  const fileCount = (body.files || []).length;
  const what = [fileCount ? fileCount + ' file(s)' : '', body.text || body.url || '', body.title || ''].filter(Boolean).join(' | ').slice(0, 300);
  try {
    const ss = SpreadsheetApp.getActive();
    let tab = ss.getSheetByName(CONFIG.ERRORS_TAB);
    if (!tab) { tab = ss.insertSheet(CONFIG.ERRORS_TAB); tab.appendRow(['When', 'Where', 'Level', 'Who', 'What was sent', 'Problem', 'Fixed?']); tab.getRange(1, 1, 1, 7).setFontWeight('bold'); tab.setFrozenRows(1); }
    tab.appendRow([new Date(), where, level, safe_(body.sender || ''), safe_(what), safe_(String(message).slice(0, 1000)), '']);
  } catch (e) {}
}

const ERROR_RULES_ = [
  [/GEMINI_API_KEY is not set/i, 'The AI key hasn’t been set up.'], [/API key not valid|API_KEY_INVALID|key expired/i, 'The AI key isn’t working.'], [/Gemini 403|PERMISSION_DENIED/i, 'The AI key doesn’t have permission.'], [/billing/i, 'The AI account needs billing turned on.'], [/RESOURCE_EXHAUSTED|quota|rate limit|Gemini 429/i, 'The AI is at its usage limit.'], [/models\/[^\s]+ (is )?not found|no longer available|deprecated|not supported for generateContent|Gemini 404/i, 'MODEL'], [/overloaded|UNAVAILABLE|Gemini 50\d|INTERNAL/i, 'The AI service is having trouble.'], [/DEADLINE_EXCEEDED|timed out|timeout|cut off/i, 'The AI took too long.'], [/payload size|too large|413/i, 'Those files are too big.'], [/SAFETY|RECITATION|PROHIBITED/i, 'The AI refused to read this material.'], [/EMPTY_AI_RESPONSE/i, 'The AI returned nothing.'], [/Unsupported MIME|mime type/i, 'One of the files is a type the AI can’t read.'], [/password|encrypted/i, 'That PDF is password-protected.'], [/Service invoked too many times.*urlfetch|Bandwidth quota/i, 'The daily limit for reading links has been reached.'], [/Service invoked too many times|too many simultaneous/i, 'Google is limiting requests right now.'], [/Exceeded maximum execution time/i, 'This took too long.'], [/Service Spreadsheets/i, 'Google Sheets is slow right now.'], [/Service Drive|DriveApp/i, 'Google Drive is slow right now.'], [/do not have permission|not have permission|Access denied/i, 'Can’t open one of the sheets.'], [/Requested entity was not found|Document .* is missing/i, 'An artist’s sheet couldn’t be found.'], [/out of bounds|Range not found/i, 'The sheet changed while you were working.'], [/DNS error|Address unavailable/i, 'That website address doesn’t exist.'], [/SSL|certificate/i, 'That website has a security problem.']
];
function failed(where, err, body) {
  const msg = String(err && err.message || err);
  logProblem(where, 'error', msg, body || {});
  for (let i = 0; i < ERROR_RULES_.length; i++) {
    if (ERROR_RULES_[i][0].test(msg)) {
      if (ERROR_RULES_[i][1] === 'MODEL') return { ok: false, message: 'The AI model "' + CONFIG.MODEL + '" isn’t available. Update CONFIG.MODEL.' };
      return { ok: false, message: ERROR_RULES_[i][1] };
    }
  }
  return { ok: false, message: where + ' didn’t work. Check the Errors tab.' };
}