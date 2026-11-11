// Drive folders and the documents each application needs.
//   Open Calls / Artists / <Artist> / Master docs      (the artist's own files, reused for every application)
//   Open Calls / Calls / <Call title> / <Artist>        (the files for one application, made when you open it)
// Each call lists its required documents ("Required Docs"). Each artist's application ticks them off ("Docs Checklist").

const APP_ROOT_NAME = 'Open Calls';

function appRootFolder_() {
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('APP_ROOT_FOLDER_ID');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const it = DriveApp.getFoldersByName(APP_ROOT_NAME), folder = it.hasNext() ? it.next() : DriveApp.createFolder(APP_ROOT_NAME);
  props.setProperty('APP_ROOT_FOLDER_ID', folder.getId());
  return folder;
}
// Finds a child folder by name, or creates it.
function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function artistMasterFolder_(artist) {
  return childFolder_(childFolder_(childFolder_(appRootFolder_(), 'Artists'), artist), 'Master docs');
}
function applicationFolder_(title, artist) {
  return childFolder_(childFolder_(childFolder_(appRootFolder_(), 'Calls'), safeFolderName_(title)), safeFolderName_(artist));
}
// Drive names can't hold slashes; keep the names readable.
function safeFolderName_(s) { return String(s || 'Untitled').replace(/[\\\/:*?"<>|#]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Untitled'; }

// Required documents for a call: a comma-separated list on the Inbox row.
function requiredDocsList_(v) {
  return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 40);
}
// The checklist for one application: every required document, ticked or not.
function docsChecklist_(required, stored) {
  let saved = []; try { saved = JSON.parse(String(stored || '[]')); } catch (e) { saved = []; }
  const ticked = {}; (Array.isArray(saved) ? saved : []).forEach(function (d) { if (d && d.done) ticked[String(d.name)] = true; });
  return required.map(function (name) { return { name: name, done: !!ticked[name] }; });
}

// Opens (and creates, the first time) the application folder and the artist's master docs folder. Returns both links.
function p2_openApplicationFolder(b) {
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || '');
  const link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || ''), artist = String(b.artist || '').trim();
  const lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()]; if (!sheetLink) return { ok: false, message: artist + ' is not assigned to this call.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target);
  const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return { ok: false, message: artist + ' is not assigned to this call.' };
  const app = applicationFolder_(title, artist), master = artistMasterFolder_(artist);
  updateRowByHeader(target, dupRow, { 'Application Folder': app.getUrl() });
  return { ok: true, applicationFolder: app.getUrl(), masterFolder: master.getUrl() };
}

// Saves the ticked documents for one application.
function p2_saveDocsChecklist(b) {
  const rowNum = Number(b.row), inbox = getInbox(); if (!rowMatches_(inbox, rowNum, b.expectTitle)) return STALE_;
  const hi = headerIndex(inbox), title = String(inbox.getRange(rowNum, hi.map['title'] + 1).getValue() || ''), link = String(inbox.getRange(rowNum, hi.map['application link'] + 1).getValue() || '');
  const artist = String(b.artist || '').trim(), lookup = artistLookup(), sheetLink = lookup[artist.toLowerCase()]; if (!sheetLink) return { ok: false, message: artist + ' is not assigned to this call.' };
  const target = openTab(sheetLink); ensureArtistSheetP2Headers_(target);
  const dupRow = findDuplicate(target, title, link); if (dupRow <= 0) return { ok: false, message: artist + ' is not assigned to this call.' };
  const docs = (Array.isArray(b.docs) ? b.docs : []).map(function (d) { return { name: String((d && d.name) || '').slice(0, 100), done: !!(d && d.done) }; }).filter(function (d) { return d.name; });
  updateRowByHeader(target, dupRow, { 'Docs Checklist': JSON.stringify(docs) });
  return { ok: true, message: 'Documents saved.' };
}
