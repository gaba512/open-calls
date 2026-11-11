// Custom fields (a simple form builder). Each field is defined once on the "Form fields" tab and chooses:
//   Shown on: Open call (the call form and the Inbox sheet) and/or Artist open call (that artist's call screen and sheet).
//   Applies to: Categories and/or Calls. Blank means every call. A field shows only on calls in its scope.
// Turning a field off hides it everywhere; its data stays in the sheets.

const FORM_FIELDS_TAB = 'Form fields';
const FIELD_TYPES = ['Text', 'Long text', 'Number', 'Date', 'Choice', 'Yes/No'];
// Names the app already uses, so a custom field can't clash with them.
const RESERVED_FIELD_NAMES = ['Added On', 'Title', 'Artists', 'Sent To', 'Status', 'Confirmed On', 'Verified By', 'Review Stats',
  'Category', 'Selection Month', 'Deadline', 'Application Fee', 'Application Link', 'Event Dates', 'Announcement Date',
  'Organiser', 'Organiser Email', 'Location', 'Eligibility', 'Medium', 'Summary', 'Submitted By', 'Calendar Event ID', 'Source Files',
  'Team Review', 'Additional Info', 'Handoff On', 'In Doc On', 'Sent On', 'Interested', 'Artist Review', 'Artist Response',
  'Paid', 'Applied On', 'Submitted Docs', 'Comments on Applications', 'Response Updated On', 'Response Updated By', 'Response Comment',
  'Assigned To', 'Due On', 'Artworks', 'Required Docs', 'Docs Checklist', 'Application Folder', 'Payments', 'Fees', 'Reminder', 'Name', 'Sheet Link', 'Email', 'Phone', 'Eligibility Notes', 'Notes', 'Active', 'Pending'];

const FORM_FIELDS_HEADERS = ['Label', 'Type', 'Options', 'Shown on', 'Active', 'Categories', 'Calls'];

function formFieldsTab_() {
  const ss = SpreadsheetApp.getActive();
  let tab = ss.getSheetByName(FORM_FIELDS_TAB);
  if (!tab) {
    tab = ss.insertSheet(FORM_FIELDS_TAB);
    tab.appendRow(FORM_FIELDS_HEADERS);
    tab.setFrozenRows(1);
  }
  // Older tabs may lack the newer columns: add any that are missing.
  const width = Math.max(tab.getLastColumn(), 1);
  const have = tab.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); });
  FORM_FIELDS_HEADERS.forEach(function (h, i) { if (have[i] !== h) tab.getRange(1, i + 1).setValue(h); });
  tab.getRange(1, 1, 1, FORM_FIELDS_HEADERS.length).setFontWeight('bold');
  return tab;
}

// Splits a list cell into trimmed, lower-case items. Blank means "no limit".
// Categories are separated by commas; call titles by semicolons (titles can contain commas).
function listCell_(v, sep) {
  return String(v || '').split(sep || ',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}
function callListCell_(v) { return listCell_(v, ';'); }
// Does a field apply to a call with this category and title?
function fieldAppliesTo_(f, category, title) {
  if (f.categories.length && f.categories.indexOf(String(category || '').trim().toLowerCase()) === -1) return false;
  if (f.calls.length && f.calls.indexOf(String(title || '').trim().toLowerCase()) === -1) return false;
  return true;
}

// "Shown on" text for the sheet, e.g. "Open call, Artist open call".
function shownOnText_(call, artist) {
  return [call ? 'Open call' : '', artist ? 'Artist open call' : ''].filter(Boolean).join(', ');
}
// Reads the "Shown on" cell. Older rows used Yes/No for the artist sheets: Yes = both, No = open call only.
function parseShownOn_(v) {
  const s = String(v || '').trim();
  if (s === 'Yes') return { call: true, artist: true };
  if (s === '' || s === 'No') return { call: true, artist: false };
  const parts = s.split(',').map(function (p) { return p.trim().toLowerCase(); });
  return { call: parts.indexOf('open call') !== -1, artist: parts.indexOf('artist open call') !== -1 };
}

// Every definition, in the order it was added. Each carries its row so it can be updated.
function formFields_() {
  const tab = formFieldsTab_(), last = tab.getLastRow(), out = [];
  if (last < 2) return out;
  tab.getRange(2, 1, last - 1, FORM_FIELDS_HEADERS.length).getValues().forEach(function (r, i) {
    const label = String(r[0] || '').trim();
    if (!label) return;
    const shown = parseShownOn_(r[3]);
    out.push({ row: i + 2, label: label, type: String(r[1] || 'Text'), options: String(r[2] || ''),
      call: shown.call, artist: shown.artist, active: String(r[4] || 'Yes') === 'Yes',
      categories: listCell_(r[5]), calls: callListCell_(r[6]) });
  });
  return out;
}
function activeFormFields_() { return formFields_().filter(function (f) { return f.active; }); }
// Fields on the open call form (and the Inbox sheet). Pass the call's category and title to apply "Applies to".
// Called without them, it returns every field shown on open calls.
function callFields_(category, title) { return activeFormFields_().filter(function (f) { return f.call && (category === undefined || fieldAppliesTo_(f, category, title)); }); }
// Fields on each artist's call screen (and the artist sheet).
function artistFields_(category, title) { return activeFormFields_().filter(function (f) { return f.artist && (category === undefined || fieldAppliesTo_(f, category, title)); }); }
// Column names the artist sheets need for the artist fields (all of them, so a column exists whichever call uses it).
function syncFieldLabels_() { return activeFormFields_().filter(function (f) { return f.artist; }).map(function (f) { return f.label; }); }

// Adds any missing custom columns to a sheet (labels defaults to the open call fields).
function ensureFormColumns_(sheet, labels) {
  const width = Math.max(sheet.getLastColumn(), 1);
  const have = new Set(sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); }));
  const wanted = labels || callFields_().map(function (f) { return f.label; });
  const missing = wanted.filter(function (l) { return !have.has(l.toLowerCase()); });
  if (missing.length) sheet.getRange(1, width + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
}

// Values to write on the Inbox row: the open call fields the form sent, for this call's scope.
function customInboxValues_(custom, category, title) {
  const out = {}; custom = custom || {};
  callFields_(category, title).forEach(function (f) { if (custom[f.label] !== undefined) out[f.label] = String(custom[f.label]); });
  return out;
}
// Values to copy from the Inbox to an artist's sheet: fields that are on both.
function customSyncValues_(custom, category, title) {
  const out = customInboxValues_(custom, category, title), synced = {};
  callFields_(category, title).forEach(function (f) { if (f.artist && out[f.label] !== undefined) synced[f.label] = out[f.label]; });
  return synced;
}
// Same, read from an Inbox row through a getter(label).
function customSyncFromRow_(getter) {
  const out = {};
  callFields_(getter('Category'), getter('Title')).forEach(function (f) { if (f.artist) out[f.label] = getter(f.label); });
  return out;
}
// Values for an artist's sheet from the artist call screen: the artist fields for this call's scope.
function artistCustomValues_(custom, category, title) {
  const out = {}; custom = custom || {};
  artistFields_(category, title).forEach(function (f) { if (custom[f.label] !== undefined) out[f.label] = String(custom[f.label]); });
  return out;
}
// Reads the artist fields from one row of an artist's sheet, for this call's scope.
function artistCustomFromSheet_(sheet, row) {
  const out = {}, hi = headerIndex(sheet);
  const cell = function (label) { const i = hi.map[label.toLowerCase()]; return i === undefined ? '' : sheet.getRange(row, i + 1).getValue(); };
  artistFields_(cell('Category'), cell('Title')).forEach(function (f) { out[f.label] = String(cell(f.label) || ''); });
  return out;
}

function artistSheetsForFields_() {
  const lookup = artistLookup(), out = [];
  Object.keys(lookup).forEach(function (name) { try { out.push(openTab(lookup[name])); } catch (e) {} });
  return out;
}
function ensureArtistFieldColumns_() {
  artistSheetsForFields_().forEach(function (s) { try { ensureArtistSheetP2Headers_(s); } catch (e) {} });
}

function getFormFields() { return { ok: true, fields: formFields_() }; }

// Shared validation for adding and changing a field.
function checkFieldScope_(call, artist, categories, calls) {
  if (!call && !artist) return 'Choose where it shows: the open call, the artist open call, or both.';
  return '';
}

function addFormFieldFromPage(b) {
  const label = String(b.label || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const type = FIELD_TYPES.indexOf(b.type) !== -1 ? String(b.type) : '';
  const options = String(b.options || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).join(', ');
  const call = !!b.call, artist = !!b.artist;
  const categories = listCell_(Array.isArray(b.categories) ? b.categories.join(',') : b.categories);
  const calls = callListCell_(Array.isArray(b.calls) ? b.calls.join(';') : b.calls);
  if (!label) return { ok: false, message: 'Enter a label for the field.' };
  if (/^[=+\-@]/.test(label)) return { ok: false, message: 'Labels can’t start with = + - or @.' };
  if (!type) return { ok: false, message: 'Pick a type.' };
  if (type === 'Choice' && !options) return { ok: false, message: 'Add the choices, separated by commas.' };
  const scopeErr = checkFieldScope_(call, artist, categories, calls); if (scopeErr) return { ok: false, message: scopeErr };
  const lower = label.toLowerCase();
  if (RESERVED_FIELD_NAMES.some(function (n) { return n.toLowerCase() === lower; })) return { ok: false, message: label + ' is already used by the app.' };
  if (formFields_().some(function (f) { return f.label.toLowerCase() === lower; })) return { ok: false, message: label + ' is already a field.' };

  formFieldsTab_().appendRow([label, type, type === 'Choice' ? options : '', shownOnText_(call, artist), 'Yes', categories.join(', '), calls.join('; ')]);
  if (call) ensureFormColumns_(getInbox(), [label]);
  if (artist) ensureArtistFieldColumns_();
  return { ok: true, message: 'Added ' + label + '.' };
}

// Removes a field from the form builder. Its values stay in the sheets' columns, so nothing is lost.
function deleteFormFieldFromPage(b) {
  const label = String(b.label || '');
  const f = formFields_().find(function (x) { return x.label === label; });
  if (!f) return { ok: false, message: 'Field not found.' };
  formFieldsTab_().deleteRow(f.row);
  return { ok: true, message: 'Removed ' + label + '. Its old answers are still in the sheet.' };
}

// Change a field: turn it on or off, change where it shows, or change which calls it applies to.
function updateFormFieldFromPage(b) {
  const label = String(b.label || '');
  const f = formFields_().find(function (x) { return x.label === label; });
  if (!f) return { ok: false, message: 'Field not found.' };
  const tab = formFieldsTab_();
  if (b.active !== undefined) tab.getRange(f.row, 5).setValue(b.active ? 'Yes' : 'No');
  const call = b.call !== undefined ? !!b.call : f.call;
  const artist = b.artist !== undefined ? !!b.artist : f.artist;
  const categories = b.categories !== undefined ? listCell_(Array.isArray(b.categories) ? b.categories.join(',') : b.categories) : f.categories;
  const calls = b.calls !== undefined ? callListCell_(Array.isArray(b.calls) ? b.calls.join(';') : b.calls) : f.calls;
  const scopeErr = checkFieldScope_(call, artist, categories, calls); if (scopeErr) return { ok: false, message: scopeErr };
  if (b.call !== undefined || b.artist !== undefined) tab.getRange(f.row, 4).setValue(shownOnText_(call, artist));
  if (b.categories !== undefined || b.calls !== undefined) tab.getRange(f.row, 6, 1, 2).setValues([[categories.join(', '), calls.join('; ')]]);
  if (call) ensureFormColumns_(getInbox(), [label]);
  if (artist) ensureArtistFieldColumns_();
  return { ok: true, message: 'Saved ' + label + '.' };
}
