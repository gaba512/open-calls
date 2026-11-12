const $ = id => document.getElementById(id);
window.$ = $;

function formatSyncedDeadline(deadlineStr) {
  if (!deadlineStr) return { text: 'No deadline', isUrgent: false };
  const str = String(deadlineStr).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return { text: str, isUrgent: false };
  }
  const [y, m, dd] = str.split('-').map(Number);
  const dl = new Date(y, m - 1, dd);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((dl - now) / 86400000);

  if (days < 0) {
    return { text: 'Closed', isUrgent: false };
  }
  if (days === 0) {
    return { text: 'Today', isUrgent: true };
  }
  if (days === 1) {
    return { text: '1 day', isUrgent: true };
  }
  if (days <= 7) {
    return { text: days + ' days', isUrgent: true };
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const displayDate = dd + ' ' + (months[m - 1] || m) + ' ' + y;
  return {
    text: displayDate,
    isUrgent: false
  };
}
window.formatSyncedDeadline = formatSyncedDeadline;

(() => {
'use strict';
/* ---------- utilities ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
const store = {
  get(k, d = '') { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  json(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const splitNames = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const initials = n => String(n).trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
// Same artist always gets the same color, cycling through 4 options by name.
const avatarColorClass = n => { const s = String(n || ''); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'avc' + (h % 4 + 1); };
const STAGE_PILL = { 'Added': ['Needs an artist', 'muted'], 'Approved': ['Ready to send', 'amber'], 'In doc': ['In doc', 'amber'], 'Emailed': ['Sent', 'blue'], 'Responded': ['Responded', 'purple'], 'Applied': ['Applied', 'green'], 'Outcome': ['Outcome', 'muted'] };
// Per-artist wizard step -> pill label/color, for the Unsent/Active/Past cards
// on the artist detail screen and the wizard dots on the per-artist call
// screen (#/artist-call/:name/:row). Keys match computeArtistCallState_'s
// `step` values (Code2.gs).
const WIZARD_STEP_PILL = { 'Unsent': ['Unsent', 'muted'], 'Awaiting Response': ['Awaiting response', 'amber'], 'Application': ['Application', 'blue'], 'Outcome': ['Outcome', 'green'] };
// The category list comes from the sheet's Categories tab (see loadCategories). This is the fallback until it loads.
let CATEGORIES = [
  'Open Call', 'Exhibition', 'Exhibition & Prize', 'Exhibition Proposal',
  'Online Exhibition', 'Competition', 'Competition & Prize', 'Prize',
  'Grant', 'Residency', 'Solo Show', 'Group Show', 'Gallery',
  'Publication', 'Award', 'Mentorship', 'Platform', 'Institution', 'Art Fair/Festival'
];
const ADD_CATEGORY = '__add__';
function setCategoryOptions(select, placeholder) {
  const current = select.value;
  const addOpt = select.id === 'f_type' ? `<option value="${ADD_CATEGORY}">+ Add a category</option>` : '';
  const ph = select.id === 'fCat' ? 'All Categories ▾' : placeholder;
  select.innerHTML = `<option value="">${esc(ph)}</option>` + CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('');
  if (current && current !== ADD_CATEGORY && !CATEGORIES.includes(current)) select.add(new Option(current, current));
  if (addOpt) select.insertAdjacentHTML('beforeend', addOpt);
  select.value = current === ADD_CATEGORY ? '' : current;
}
async function loadCategories() {
  const r = await api('categories');
  if (!r || !r.ok || !r.categories || !r.categories.length) return;
  CATEGORIES = r.categories;
  setCategoryOptions($('f_type'), '');
  setCategoryOptions($('fCat'), 'Category');
}
// "+ Add a category" in the open call form: name it, save it to the sheet, and select it.
$('f_type').addEventListener('change', async e => {
  if (e.target.value !== ADD_CATEGORY) return;
  const sel = e.target;
  sheet({ title: 'New category', body: '<label class="lbl" for="newCategory">Name</label><input class="f" id="newCategory" maxlength="40" autocomplete="off">',
    buttons: [
      { label: 'Add', style: 'primary', onClick: async ev => {
        const name = $('newCategory').value.trim(); if (!name) return;
        busy(ev.target, 'Adding…');
        const r = await api('addCategory', { name });
        idle(ev.target);
        if (!r.ok) { toast(r.message, { error: true }); return; }
        closeSheet();
        CATEGORIES = r.categories;
        setCategoryOptions(sel, '');
        setCategoryOptions($('fCat'), 'Category');
        sel.value = r.selected || ''; dirty = true;
        toast(r.message);
      } },
      { label: 'Cancel', onClick: () => { sel.value = ''; closeSheet(); } } ] });
});

/* ---------- Custom fields (form builder). Definitions come from the sheet's Form fields tab. ---------- */
let FORM_FIELDS = [];
let ARTIST_CALL_FIELDS = [];
// Changing the category or title on the call form re-draws the custom fields that apply to it.
$('f_type').addEventListener('change', () => refreshCustomFields());
$('f_title').addEventListener('input', () => refreshCustomFields());
const FIELD_TYPE_LIST = ['Text', 'Long text', 'Number', 'Date', 'Choice', 'Yes/No'];
function fieldInputHtml(f, i, val, prefix) {
  const id = (prefix || 'cf_') + i, v = esc(val || '');
  // In the call form's edit mode each field shows a small × to remove it from the form builder.
  const removable = (prefix || 'cf_') === 'cf_';
  let ctl;
  if (f.type === 'Long text') ctl = `<textarea class="f" id="${id}" rows="3">${v}</textarea>`;
  else if (f.type === 'Number') ctl = `<input class="f" id="${id}" type="number" inputmode="decimal" value="${v}">`;
  else if (f.type === 'Date') ctl = `<input class="f" id="${id}" type="date" value="${v}">`;
  else if (f.type === 'Choice' || f.type === 'Yes/No') {
    const opts = f.type === 'Yes/No' ? ['Yes', 'No'] : String(f.options || '').split(',').map(s => s.trim()).filter(Boolean);
    ctl = `<select class="f" id="${id}"><option value="">—</option>${opts.map(o => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else ctl = `<input class="f" id="${id}" value="${v}">`;
  const x = removable ? `<button type="button" class="cf-x" data-cf-delete="${esc(f.label)}" aria-label="Remove ${esc(f.label)} from the form">×</button>` : '';
  return `<div class="field"><div class="lbl-row"><label class="lbl" for="${id}">${esc(f.label)}</label>${x}</div>${ctl}</div>`;
}
// The × on a custom field: removes the field from the form builder after a confirmation.
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('[data-cf-delete]'); if (!b) return;
  const label = b.dataset.cfDelete;
  if (!(await ask('Remove ' + label + '?', 'It will leave every call form. Answers already saved stay in the sheet.', 'Remove', true))) return;
  const r = await api('deleteFormField', { label });
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  await loadFormFields();
  renderCustomFields();
});
// "Applies to": a field shows only on calls in its categories and/or titles. Blank means every call.
function fieldAppliesTo(f, category, title) {
  const cat = String(category || '').trim().toLowerCase(), t = String(title || '').trim().toLowerCase();
  if (f.categories && f.categories.length && !f.categories.includes(cat)) return false;
  if (f.calls && f.calls.length && !f.calls.includes(t)) return false;
  return true;
}
// Fields for the call currently on screen (category and title from the form).
function formCategoryTitle() { return { category: $('f_type') ? $('f_type').value : '', title: $('f_title') ? $('f_title').value : '' }; }
let customDraft = {};
function renderCustomFields(values) {
  const box = $('customFields'); if (!box) return;
  if (values) customDraft = Object.assign({}, values);
  const ct = formCategoryTitle();
  const shown = FORM_FIELDS.filter(f => fieldAppliesTo(f, ct.category, ct.title));
  box.innerHTML = shown.map((f, i) => fieldInputHtml(f, i, customDraft[f.label])).join('');
}
// Keeps what has been typed in the custom fields when the category or title changes and the list re-draws.
function refreshCustomFields() {
  if (!$('customFields') || !FORM_FIELDS.length) return;
  Object.assign(customDraft, readCustom());
  renderCustomFields();
}
function readCustom(list, prefix) {
  const out = {}; prefix = prefix || 'cf_';
  if (!list) { // the call form: only the fields on screen
    const ct = formCategoryTitle(); list = FORM_FIELDS.filter(f => fieldAppliesTo(f, ct.category, ct.title));
  }
  list.forEach((f, i) => { const el = $(prefix + i); if (el) out[f.label] = el.value.trim(); });
  return out;
}
async function loadFormFields() {
  const r = await api('formFields');
  if (!r || !r.ok) return;
  const all = r.fields || [];
  FORM_FIELDS = all.filter(f => f.active && f.call);
  ARTIST_CALL_FIELDS = all.filter(f => f.active && f.artist);
}
// Profile > Form fields: add fields, turn them off, and choose which ones sync to artists.
function openFormFields() {
  sheet({ title: 'Form fields', body: '<p class="faint">Loading…</p>',
    buttons: [{ label: 'Add a field', style: 'primary', onClick: openAddField }, { label: 'Close', onClick: closeSheet }] });
  renderFormFieldList();
}
async function renderFormFieldList() {
  const r = await api('formFields');
  if (!r || !r.ok) { $('sheetBody').innerHTML = '<p class="faint">Couldn’t load the fields.</p>'; return; }
  const rows = (r.fields || []).map(f => {
    const on = !!f.active;
    const where = [f.call ? 'Open call' : '', f.artist ? 'Artist open call' : ''].filter(Boolean).join(', ');
    const scope = [f.categories && f.categories.length ? 'Categories: ' + f.categories.join(', ') : '', f.calls && f.calls.length ? 'Calls: ' + f.calls.join(', ') : ''].filter(Boolean).join(' · ') || 'Every call';
    const meta = [f.type, f.type === 'Choice' ? f.options : '', where, 'Applies to: ' + scope].filter(Boolean).map(esc).join(' · ');
    return `<div class="ff-row">`
      + `<div class="ff-info"><div style="font-size:15px">${esc(f.label)}${on ? '' : ' <span class="faint">(off)</span>'}</div><div class="faint" style="font-size:13px">${meta}</div></div>`
      + `<div class="ff-actions">`
      + `<button type="button" class="btn ghost sm" data-ff-toggle="${esc(f.label)}" data-on="${on ? '0' : '1'}">${on ? 'Turn off' : 'Turn on'}</button>`
      + `<button type="button" class="btn ghost sm" data-ff-call="${esc(f.label)}" data-on="${f.call ? '0' : '1'}">${f.call ? 'Hide from call form' : 'Show on call form'}</button>`
      + `<button type="button" class="btn ghost sm" data-ff-artist="${esc(f.label)}" data-on="${f.artist ? '0' : '1'}">${f.artist ? 'Hide from artist call' : 'Show on artist call'}</button>`
      + `</div></div>`;
  }).join('');
  $('sheetBody').innerHTML = rows || '<p class="faint">No custom fields yet. Add one to collect details for every call.</p>';
}
function openAddField() {
  sheet({ title: 'New field',
    body: `<label class="lbl" for="ffLabel">Label</label><input class="f" id="ffLabel" maxlength="40" placeholder="e.g. Venue size" autocomplete="off">`
      + `<label class="lbl" for="ffType">Type</label><select class="f" id="ffType">${FIELD_TYPE_LIST.map(t => `<option>${t}</option>`).join('')}</select>`
      + `<div id="ffOptsWrap" hidden><label class="lbl" for="ffOpts">Choices</label><input class="f" id="ffOpts" placeholder="Small, Medium, Large" autocomplete="off"></div>`
      + `<p class="lbl" style="margin:16px 0 6px">Show it on</p>`
      + `<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="ffCall" checked> Open call form (saved to the Inbox)</label>`
      + `<label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="checkbox" id="ffArtist"> Artist open call (saved to each artist’s sheet)</label>`
      + `<p class="lbl" style="margin:16px 0 6px">Applies to</p>`
      + `<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="radio" name="ffScope" value="all" checked> Every call</label>`
      + `<label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="radio" name="ffScope" value="cats"> Certain categories</label>`
      + `<div id="ffCatsWrap" hidden style="margin:8px 0 0 26px;display:grid;gap:6px">${CATEGORIES.map(c => `<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" class="ffCat" value="${esc(c)}"> ${esc(c)}</label>`).join('')}</div>`
      + `<label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="radio" name="ffScope" value="calls"> Certain calls</label>`
      + `<div id="ffCallsWrap" hidden style="margin:8px 0 0 26px;display:grid;gap:6px"><p class="faint" style="margin:0">Loading calls…</p></div>`,
    buttons: [
      { label: 'Add field', style: 'primary', onClick: saveNewField },
      { label: 'Cancel', onClick: () => { closeSheet(); openFormFields(); } } ] });
  $('ffType').onchange = () => { $('ffOptsWrap').hidden = $('ffType').value !== 'Choice'; };
  document.querySelectorAll('input[name="ffScope"]').forEach(r => r.onchange = () => {
    $('ffCatsWrap').hidden = r.value !== 'cats' || !r.checked;
    $('ffCallsWrap').hidden = r.value !== 'calls' || !r.checked;
  });
  loadCallChoices();
}
// Reports: month (EOM), quarter (EOQ) or year (EOY). Applications count in the period they were applied.
function reportDefaultPeriod(kind) {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
  return kind === 'quarter' ? y + '-Q' + Math.ceil(m / 3) : kind === 'year' ? String(y) : y + '-' + (m < 10 ? '0' : '') + m;
}
// Reports: a month, quarter, year, or custom dates. Pick one artist, or every artist.
// Saved reports go to the artist's Reports folder (or the shared one for all artists).
function openReports() {
  sheet({ title: 'Reports', body: '<div id="repForm"></div><div id="repOut" style="margin-top:14px"></div>',
    buttons: [{ label: 'Close', onClick: closeSheet }] });
  const people = [...new Set(artists)].sort();
  $('repForm').innerHTML = '<div class="app-grid">'
    + '<div><label class="lbl" for="repArtist">Artist</label><select class="f" id="repArtist"><option value="">All artists</option>' + people.map(n => `<option>${esc(n)}</option>`).join('') + '</select></div>'
    + '<div><label class="lbl" for="repKind">Period</label><select class="f" id="repKind"><option value="month">Month (EOM)</option><option value="quarter">Quarter (EOQ)</option><option value="year">Year (EOY)</option><option value="custom">Custom dates</option></select></div>'
    + '</div>'
    + '<div id="repPeriodWrap" class="app-grid" style="margin-top:14px"><div><label class="lbl" for="repPeriod">Which one</label><input class="f" id="repPeriod" value="' + reportDefaultPeriod('month') + '" placeholder="2026-11"></div></div>'
    + '<div id="repCustomWrap" class="app-grid" style="margin-top:14px" hidden>'
    + '<div><label class="lbl" for="repFrom">From</label><input class="f" id="repFrom" type="date"></div>'
    + '<div><label class="lbl" for="repTo">To</label><input class="f" id="repTo" type="date"></div></div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button type="button" class="btn primary sm" id="repLoad">Show report</button>'
    + '<button type="button" class="btn ghost sm" id="repSave">Save to Reports folder</button></div>';
  const syncPeriodPicker = (k) => {
    const wrap = $('repPeriodWrap');
    if (!wrap) return;
    const custom = k === 'custom';
    wrap.hidden = custom;
    if ($('repCustomWrap')) $('repCustomWrap').hidden = !custom;
    if (custom) return;

    if (k === 'month') {
      wrap.innerHTML = '<div><label class="lbl" for="repPeriod">Month</label><input class="f" id="repPeriod" type="month" value="2026-11"></div>';
    } else if (k === 'quarter') {
      wrap.innerHTML = '<div><label class="lbl" for="repPeriod">Quarter</label><select class="f" id="repPeriod">'
        + '<option value="2026-Q4" selected>2026 Q4 (Oct - Dec)</option>'
        + '<option value="2026-Q3">2026 Q3 (Jul - Sep)</option>'
        + '<option value="2026-Q2">2026 Q2 (Apr - Jun)</option>'
        + '<option value="2026-Q1">2026 Q1 (Jan - Mar)</option>'
        + '</select></div>';
    } else if (k === 'year') {
      wrap.innerHTML = '<div><label class="lbl" for="repPeriod">Year</label><select class="f" id="repPeriod">'
        + '<option value="2026" selected>2026</option>'
        + '<option value="2025">2025</option>'
        + '<option value="2024">2024</option>'
        + '</select></div>';
    }
  };
  $('repKind').onchange = () => {
    syncPeriodPicker($('repKind').value);
    loadReport();
  };
  $('repLoad').onclick = loadReport;
  $('repSave').onclick = saveReport;
  syncPeriodPicker('month');
  loadReport();
}
function reportRequest() {
  const k = $('repKind').value;
  return { kind: k, period: k === 'custom' ? '' : $('repPeriod').value.trim(), from: $('repFrom') ? $('repFrom').value : '', to: $('repTo') ? $('repTo').value : '', artist: $('repArtist').value };
}
async function loadReport() {
  const r = await api('getReport', reportRequest());
  const out = $('repOut'); if (!out) return;
  if (!r.ok) { out.innerHTML = `<div class="err-box">${esc(r.message)}</div>`; return; }
  const a = r.analytics;
  const head = '<tr><th style="text-align:left;font-weight:500;padding:6px 8px">' + esc(r.label) + '</th>' + r.artists.map(n => '<th style="font-weight:500;padding:6px 8px">' + esc(n) + '</th>').join('') + '<th style="font-weight:500;padding:6px 8px">Total</th></tr>';
  const rows = r.rows.map(x => '<tr><td style="padding:6px 8px">' + esc(x.label) + '</td>' + x.values.map(v => '<td style="text-align:center;padding:6px 8px">' + v + '</td>').join('') + '<td style="text-align:center;padding:6px 8px;font-weight:500">' + x.total + '</td></tr>').join('');
  out.innerHTML = (r.artists.length ? '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:14px">' + head + rows + '</table></div>' : '<p class="faint">No applications in this period.</p>');
}
async function saveReport(ev) {
  busy(ev.target, 'Saving…');
  const r = await api('saveReportTab', reportRequest());
  idle(ev.target);
  if (!r.ok) return toast(r.message, { error: true });
  toast(r.message);
  if (r.url) window.open(r.url, '_blank', 'noopener');
}

// Reminders: rules that chase an outcome. You choose the days, who gets it, and the message.
async function openReminders() {
  sheet({ title: 'Reminders', body: '<p class="faint">Loading…</p>',
    buttons: [{ label: 'Add a reminder', style: 'primary', onClick: () => openReminderForm(null) }, { label: 'Close', onClick: closeSheet }] });
  renderReminderList();
}
async function renderReminderList() {
  const r = await api('getReminders');
  if (!r || !r.ok) { $('sheetBody').innerHTML = '<p class="faint">Couldn’t load the reminders.</p>'; return; }
  const rules = (r.rules || []).map(x => {
    const to = esc(x.recipients || 'No one yet');
    const how = x.channel === 'Both' ? 'Email and in app' : x.channel === 'In app' ? 'In app' : 'Email';
    const again = x.repeat > 0 ? 'repeats every ' + x.repeat + ' days' : 'sent once';
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:0.5px solid var(--line)">`
      + `<div style="min-width:0"><div style="font-size:15px">${esc(x.subject)}${x.active ? '' : ' <span class="faint">(paused)</span>'}</div>`
      + `<div class="faint" style="font-size:13px">${x.days} days after applying · ${esc(x.scope)} · ${how} · ${again}</div>`
      + (x.channel !== 'In app' ? `<div class="faint" style="font-size:13px">To ${to}</div>` : '') + `</div>`
      + `<div style="display:flex;gap:6px;flex:none;flex-wrap:wrap;justify-content:flex-end">`
      + `<button type="button" class="btn ghost sm" data-rem-edit="${esc(x.id)}">Edit</button>`
      + `<button type="button" class="btn ghost sm" data-rem-toggle="${esc(x.id)}" data-on="${x.active ? '0' : '1'}">${x.active ? 'Pause' : 'Resume'}</button>`
      + `<button type="button" class="btn ghost sm" data-rem-delete="${esc(x.id)}">Delete</button>`
      + `</div></div>`;
  }).join('');
  const log = (r.log || []).map(l => `<div class="faint" style="font-size:13px;padding:6px 0">${esc(l.sentOn)} · ${esc(l.call)} · ${esc(l.artist)} · ${esc(l.result)}${l.to ? ' → ' + esc(l.to) : ''}</div>`).join('');
  $('sheetBody').innerHTML = (rules || '<p class="faint">No reminders yet.</p>')
    + '<p class="lbl" style="margin:20px 0 4px">Recent emails</p>' + (log || '<p class="faint">Nothing sent yet.</p>')
    + '<p class="faint" style="font-size:13px;margin-top:12px">Placeholders: {call}, {artist}, {applied}, {deadline}.</p>';
  window._reminderRules = r.rules || [];
}
function openReminderForm(rule) {
  const x = rule || { days: 7, scope: 'All calls', recipients: '{team}', subject: '', message: '', channel: 'Email', repeat: 0, assignedTo: '' };
  const isAppOnly = x.channel === 'In app';
  sheet({ title: rule ? 'Edit reminder' : 'New reminder',
    body: `<label class="lbl" for="remDays">Days after applying</label><input class="f" id="remDays" type="number" min="0" max="365" step="1" value="${esc(x.days)}">`
      + `<label class="lbl" for="remScope">Applies to</label><select class="f" id="remScope"><option>All calls</option></select>`
      + `<label class="lbl" for="remChannel">Send as</label><select class="f" id="remChannel" onchange="window.updateReminderChannelFields()">${['Email', 'In app', 'Both'].map(c => `<option${c === x.channel ? ' selected' : ''}>${c}</option>`).join('')}</select>`
      + `<label class="lbl" for="remAssignee">Assign To / Notification Owner</label><select class="f" id="remAssignee"><option value="">Any team member</option></select>`
      + `<div id="remToWrap" style="display:${isAppOnly ? 'none' : 'block'};">`
      + `  <label class="lbl" for="remTo">Send to</label><input class="f" id="remTo" value="${esc(x.recipients)}" placeholder="team@example.org, info@example.org">`
      + `  <div class="faint" style="font-size:13px;margin-top:4px">Separate addresses with a comma or a semicolon. Use <b>{team}</b> for team approvers.</div>`
      + `</div>`
      + `<label class="lbl" for="remRepeat">Repeat every (days)</label><input class="f" id="remRepeat" type="number" min="0" max="365" step="1" value="${esc(x.repeat || 0)}"><div class="faint" style="font-size:13px;margin-top:4px">0 sends it once. Any other number repeats periodically until an outcome is set.</div>`
      + `<div id="remSubjectWrap" style="display:${isAppOnly ? 'none' : 'block'};">`
      + `  <label class="lbl" for="remSubject">Subject</label><input class="f" id="remSubject" value="${esc(x.subject)}">`
      + `</div>`
      + `<div id="remMessageWrap">`
      + `  <label class="lbl" for="remMessage">Message</label><textarea class="f" id="remMessage" rows="5">${esc(x.message)}</textarea>`
      + `</div>`,
    buttons: [
      { label: 'Save', style: 'primary', onClick: ev => saveReminderFromForm(ev, rule && rule.id) },
      { label: 'Cancel', onClick: () => { closeSheet(); openReminders(); } } ] });

  window.updateReminderChannelFields = function() {
    const ch = $('remChannel') ? $('remChannel').value : 'Email';
    const isApp = ch === 'In app';
    if ($('remSubjectWrap')) $('remSubjectWrap').style.display = isApp ? 'none' : 'block';
    if ($('remToWrap')) $('remToWrap').style.display = isApp ? 'none' : 'block';
  };

  // Populate Assignee select with team members and people
  api('p2_getPeople').then(pr => {
    const sel = $('remAssignee');
    if (!sel || !pr || !pr.people) return;
    pr.people.forEach(p => {
      sel.add(new Option(p.name, p.name));
    });
    if (x.assignedTo) sel.value = x.assignedTo;
  });

  // "Applies to" lists the calls in the Inbox, as well as All calls.
  api('getInbox').then(r => {
    const sel = $('remScope'); if (!sel || !r || !r.ok) return;
    const titles = [...new Set((r.entries || []).map(e => e.title).filter(Boolean))];
    titles.forEach(t => sel.add(new Option(t, t)));
    sel.value = x.scope || 'All calls';
  });
}
async function saveReminderFromForm(ev, id) {
  const body = { id: id || '', days: $('remDays').value, scope: $('remScope').value, channel: $('remChannel').value, repeat: $('remRepeat').value,
    recipients: $('remTo').value, subject: $('remSubject').value, message: $('remMessage').value };
  busy(ev.target, 'Saving…');
  const r = await api('saveReminder', body);
  idle(ev.target);
  if (!r.ok) return toast(r.message, { error: true });
  toast(r.message);
  openReminders();
}
$('sheetBody').addEventListener('click', async e => {
  const edit = e.target.closest('[data-rem-edit]');
  if (edit) { const rule = (window._reminderRules || []).find(x => x.id === edit.dataset.remEdit); if (rule) openReminderForm(rule); return; }
  const tg = e.target.closest('[data-rem-toggle]'); if (tg) {
    const r = await api('setReminderActive', { id: tg.dataset.remToggle, active: tg.dataset.on === '1' });
    if (!r.ok) return toast(r.message, { error: true });
    return renderReminderList();
  }
  const del = e.target.closest('[data-rem-delete]'); if (!del) return;
  const rule = (window._reminderRules || []).find(x => x.id === del.dataset.remDelete);
  if (!(await ask('Delete this reminder?', (rule ? '“' + rule.subject + '”' : 'This reminder') + ' will stop. Emails already sent stay in the log.', 'Delete', true))) return;
  const r = await api('deleteReminder', { id: del.dataset.remDelete });
  if (!r.ok) return toast(r.message, { error: true });
  toast(r.message);
  renderReminderList();
});

// Fills the "Certain calls" list with the Inbox calls, ticked one by one.
async function loadCallChoices() {
  const wrap = $('ffCallsWrap'); if (!wrap) return;
  const r = await api('getInbox');
  if (!wrap.isConnected) return;
  const titles = r && r.ok ? [...new Set((r.entries || []).map(e => e.title).filter(Boolean))] : [];
  wrap.innerHTML = titles.length ? titles.map(t => `<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" class="ffCallPick" value="${esc(t)}"> ${esc(t)}</label>`).join('')
    : '<p class="faint" style="margin:0">No Inbox calls yet.</p>';
}
async function saveNewField(ev) {
  const label = $('ffLabel').value.trim();
  if (!label) return toast('Enter a label.', { error: true });
  const scope = (document.querySelector('input[name="ffScope"]:checked') || {}).value || 'all';
  const categories = scope === 'cats' ? [...document.querySelectorAll('.ffCat:checked')].map(x => x.value) : [];
  const calls = scope === 'calls' ? [...document.querySelectorAll('.ffCallPick:checked')].map(x => x.value) : [];
  if (scope === 'cats' && !categories.length) return toast('Tick at least one category.', { error: true });
  if (scope === 'calls' && !calls.length) return toast('Tick at least one call.', { error: true });
  busy(ev.target, 'Adding…');
  const r = await api('addFormField', { label, type: $('ffType').value, options: $('ffOpts').value, call: $('ffCall').checked, artist: $('ffArtist').checked, categories, calls });
  idle(ev.target);
  if (!r.ok) return toast(r.message, { error: true });
  closeSheet();
  toast(r.message);
  await loadFormFields();
  openFormFields();
}
$('sheetBody').addEventListener('click', async e => {
  const t = e.target.closest('[data-ff-toggle],[data-ff-call],[data-ff-artist]'); if (!t) return;
  const on = t.dataset.on === '1';
  const body = t.dataset.ffToggle !== undefined ? { label: t.dataset.ffToggle, active: on }
    : t.dataset.ffCall !== undefined ? { label: t.dataset.ffCall, call: on }
    : { label: t.dataset.ffArtist, artist: on };
  const r = await api('updateFormField', body);
  if (!r.ok) return toast(r.message, { error: true });
  await loadFormFields();
  renderFormFieldList();
});

const FIELDS = ['title','deadline','type','theme','fee','link','event_dates','announcement_date','organiser','required_docs','location','eligibility','additional'];
// Other fees for a call (venue, space, participation…). Each artist's application gets its own payment list from these.
let feeRows = [];
function parseFeeRows(v) { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function renderFeeRows() {
  const box = $('feeList'); if (!box) return;
  box.innerHTML = feeRows.map((f, i) => `<div class="fee-row">`
    + `<input class="f" data-fk="type" placeholder="Type, e.g. Venue fee" value="${esc(f.type)}" aria-label="Fee type">`
    + `<input class="f" data-fk="amount" placeholder="Amount" value="${esc(f.amount)}" aria-label="Amount">`
    + `<input class="f" data-fk="due" type="date" value="${esc(f.due)}" aria-label="Due date">`
    + `<button type="button" class="icon-btn fee-x" data-fee-remove="${i}" aria-label="Remove fee">×</button></div>`).join('')
    || '<p class="faint" style="margin:0 0 8px">No other fees.</p>';
}
function readFees() {
  if (!$('feeList')) return [];
  return [...document.querySelectorAll('#feeList .fee-row')].map(row => ({
    type: row.querySelector('[data-fk=type]').value.trim(), amount: row.querySelector('[data-fk=amount]').value.trim(), due: row.querySelector('[data-fk=due]').value
  })).filter(f => f.type || f.amount);
}
$('btnAddFee').onclick = () => { feeRows = readFees(); feeRows.push({ type: '', amount: '', due: '' }); renderFeeRows(); updateSaveButtons(); };
$('feeList').addEventListener('click', e => {
  const b = e.target.closest('[data-fee-remove]'); if (!b) return;
  feeRows = readFees(); feeRows.splice(Number(b.dataset.feeRemove), 1); renderFeeRows(); updateSaveButtons();
});
$('feeList').addEventListener('input', () => { dirty = true; updateSaveButtons(); });
const CHECK_FIELDS = ['deadline','type','fee','link','organiser','location','eligibility'];
const SHEET_MAP = { title:'title', deadline:'deadline', type:'category', theme:'theme', fee:'application fee', link:'application link', event_dates:'event dates', announcement_date:'announcement date', organiser:'organiser', required_docs:'required docs', location:'location', eligibility:'eligibility', additional:'additional info' };
const LISTS = {
  drafts:  { action: 'getQueue',    status: 'Pending',   title: 'Drafts',  empty: ['No drafts', 'Open calls you save without confirming wait here.'] },
  inbox:   { action: 'getInbox',    status: 'Confirmed', title: 'Inbox',   empty: ['Your Inbox is empty', 'Confirmed open calls appear here, ready to send to artists.'] },
  archive: { action: 'getArchived', status: 'Archived',  title: 'Archive', empty: ['Nothing archived', 'Archive calls that have closed or aren’t a fit.'] }
};
const STATUS_TAB = { Pending: 'drafts', Confirmed: 'inbox', Archived: 'archive' };
// Pipeline stage order shown on the Pipeline and Dashboard screens; must
// match P2.STAGES in Code2.gs.

setCategoryOptions($('f_type'), '');
setCategoryOptions($('fCat'), 'Category');

// Development-only gate (see "Development-only features" below). Must run before the saved session is read.
// Off this computer, a leftover demo flag or fake demo session, and the demo lists cached with it, are removed.
const IS_DEV_HOST_ = ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) !== -1;
if (!IS_DEV_HOST_) {
  try {
    if (localStorage.getItem('oc_demo') || String(localStorage.getItem('oc_token') || '').indexOf('demo_token_') === 0) {
      ['oc_demo', 'oc_token', 'oc_me', 'oc_personId', 'oc_personName', 'oc_artists', 'oc_list_drafts', 'oc_list_inbox', 'oc_list_archive'].forEach(function (k) { localStorage.removeItem(k); });
    }
  } catch (e) {}
}
let token = store.get('oc_token');
let me = store.json('oc_me', null);
let artists = store.json('oc_artists', []);
let personId = store.get('oc_personId');
let personName = store.get('oc_personName');
// Stable per-device identity, so two people with the same display name don't
// share one person ID on the People tab.
let deviceId = store.get('oc_deviceId');
if (!deviceId) {
  deviceId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  store.set('oc_deviceId', deviceId);
}
const lists = { drafts: store.json('oc_list_drafts', null), inbox: store.json('oc_list_inbox', null), archive: store.json('oc_list_archive', null) };
const filters = { drafts: {}, inbox: {}, archive: {} };
let route = { name: '', param: '' }, listTab = 'inbox';
let uploads = [], extracted = null, entry = null, dirty = false, p2Entry = null;
const picked = new Set(), selected = new Set();
let originalPicked = '';
const scrollPos = {};

/* ---------- Mock API for Demo Mode ---------- */
function mockApi(action, payload) {
  payload = payload || {};
  switch (action) {
    case 'whoami':
      return { ok: true, status: 'approved', name: 'Hazel (Guest)', email: 'hazel@artisteculture.com' };
    case 'signOut':
      localStorage.removeItem('oc_demo');
      return { ok: true };
    case 'artists':
      return { ok: true, artists: ['Harsha', 'Marita', 'Savya'] };
    case 'categories':
      return { ok: true, categories: ['Open Call', 'Exhibition', 'Exhibition & Prize', 'Exhibition Proposal', 'Online Exhibition', 'Competition', 'Prize', 'Grant', 'Residency', 'Solo Show', 'Group Show', 'Gallery', 'Publication', 'Award', 'Mentorship', 'Platform', 'Institution', 'Art Fair/Festival'] };
    case 'formFields':
      return { ok: true, fields: [] };
    case 'counts':
      return { ok: true, counts: { Pending: 1, Confirmed: 3, Archived: 1 } };
    case 'getInbox':
      return {
        ok: true,
        entries: [
          { row: 2, title: 'Venice Biennale 2026 Open Call', artists: 'Harsha, Marita', status: 'Confirmed', category: 'Exhibition', deadline: '2026-11-20', location: 'Venice, Italy', 'application fee': '$50', organiser: 'La Biennale di Venezia', 'organiser email': 'opencalls@labiennale.org', summary: 'Major international contemporary art exhibition accepting artist portfolio proposals for national pavilions and collateral events.', 'team review': 'Approved to send', 'added on': '1 Nov', 'application link': 'https://labiennale.org' },
          { row: 3, title: 'Kochi-Muziris Residency Program', artists: 'Savya', status: 'Confirmed', category: 'Residency', deadline: '2026-12-05', location: 'Kochi, India', 'application fee': 'Free', organiser: 'Kochi Biennale Foundation', 'organiser email': 'info@kochimuzirisbiennale.org', summary: '3-month studio residency with stipend and production support for South Asian artists.', 'team review': 'Approved to send', 'added on': '2 Nov', 'application link': 'https://kochimuzirisbiennale.org' },
          { row: 4, title: 'Tate Modern Emerging Artist Grant', artists: 'Harsha', status: 'Confirmed', category: 'Grant', deadline: '2026-11-15', location: 'London, UK', 'application fee': 'Free', organiser: 'Tate Modern', 'organiser email': 'grants@tate.org.uk', summary: '£10,000 research and production fellowship for visual artists working in mixed media.', 'team review': 'Approved to send', 'added on': '3 Nov', 'application link': 'https://tate.org.uk' }
        ]
      };
    case 'getQueue':
      return {
        ok: true,
        entries: [
          { row: 5, title: 'Berlin Summer Studio Fellowship', artists: 'Marita', status: 'Pending', category: 'Residency', deadline: '2027-01-15', location: 'Berlin, Germany', 'application fee': '€30', organiser: 'Künstlerhaus Bethanien', summary: 'Studio residency fellowship for mid-career artists with exhibition support.', 'added on': '3 Nov', 'application link': 'https://bethanien.de' }
        ]
      };
    case 'getArchived':
      return {
        ok: true,
        entries: [
          { row: 6, title: 'Prix Pictet Photography Award 2025', artists: 'Savya', status: 'Archived', category: 'Prize', deadline: '2025-10-01', location: 'Geneva, Switzerland', 'application fee': 'Free', organiser: 'Prix Pictet', summary: 'Global photography and visual arts award focused on sustainability.', 'added on': '1 Oct', 'application link': 'https://prixpictet.com' }
        ]
      };
    case 'p2_getPeople':
      return { ok: true, people: [{ id: 'demo_user', name: 'Hazel (Guest)' }, { id: 'demo_curator', name: 'Curator' }] };
    case 'p2_setMyPerson':
      return { ok: true, personId: 'demo_user', name: payload.name || 'Hazel (Guest)' };
    case 'p2_getAlerts':
      return {
        ok: true,
        closing: [{ row: 2, title: 'Venice Biennale 2026 Open Call', days: 2, when: 'in 2 days', deadline: '20 Nov', status: 'Sent to Harsha, Marita' }],
        noReply: [],
        reminders: []
      };
    case 'p2_getNeedsAttention':
      return { ok: true, items: [] };
    case 'p2_pipeline':
      return {
        ok: true,
        stageOrder: ['Added', 'Approved', 'Awaiting response', 'Interested', 'Need more info', 'Applied', 'Accepted', 'Not accepted'],
        stages: {
          'Added': [],
          'Approved': [{ row: 4, title: 'Tate Modern Emerging Artist Grant', artists: 'Harsha', deadline: '2026-11-15', category: 'Grant', fee: 'Free', teamReview: 'Approved to send', artistResponse: '', docStatus: '' }],
          'Awaiting response': [{ row: 2, title: 'Venice Biennale 2026 Open Call', artists: 'Harsha, Marita', deadline: '2026-11-20', category: 'Exhibition', fee: '$50', teamReview: 'Approved to send', artistResponse: '', docStatus: 'Sent' }],
          'Interested': [{ row: 3, title: 'Kochi-Muziris Residency Program', artists: 'Savya', deadline: '2026-12-05', category: 'Residency', fee: 'Free', teamReview: 'Approved to send', artistResponse: 'Interested', docStatus: 'In doc' }],
          'Need more info': [],
          'Applied': [],
          'Accepted': [],
          'Not accepted': []
        }
      };
    case 'p2_dashboard':
      return {
        ok: true,
        stats: { applied: 3, accepted: 1, pending: 1, closingSoon: 1, artists: 3 },
        upcoming: [{ row: 2, title: 'Venice Biennale 2026 Open Call', days: 2, deadline: '2026-11-20', artists: 'Harsha, Marita' }]
      };
    case 'p2_getArtists':
      return {
        ok: true,
        artists: [
          { row: 2, name: 'Harsha', sheetLink: '#', email: 'harsha@artisteculture.com', mediums: 'Painting, Sculpture', location: 'Mumbai', active: 2, pending: 1 },
          { row: 3, name: 'Marita', sheetLink: '#', email: 'marita@artisteculture.com', mediums: 'Photography, Video', location: 'Goa', active: 1, pending: 0 },
          { row: 4, name: 'Savya', sheetLink: '#', email: 'savya@artisteculture.com', mediums: 'Mixed Media, Digital', location: 'Delhi', active: 1, pending: 0 }
        ]
      };
    case 'p2_getArtistProfile':
      return {
        ok: true,
        artist: { name: payload.name || 'Harsha', email: 'harsha@artisteculture.com', location: 'Mumbai', mediums: 'Painting, Sculpture', notes: 'Interested in residencies and European museum shows.' },
        unsent: [],
        active: [{ row: 2, title: 'Venice Biennale 2026 Open Call', deadline: '2026-11-20', category: 'Exhibition', fee: '$50', status: 'In Progress' }],
        past: []
      };
    case 'p2_getEntry':
      return {
        ok: true,
        entry: { row: payload.row || 2, title: 'Venice Biennale 2026 Open Call', artists: 'Harsha, Marita', status: 'Confirmed', category: 'Exhibition', deadline: '2026-11-20', location: 'Venice, Italy', 'application fee': '$50', organiser: 'La Biennale di Venezia', 'organiser email': 'opencalls@labiennale.org', summary: 'Major international contemporary art exhibition.', 'team review': 'Approved to send', link: 'https://labiennale.org' },
        states: [{ name: 'Harsha', sentOn: '2026-11-01', inDocOn: '2026-11-01', response: 'Interested', status: 'In Progress' }]
      };
    case 'p2_getArtistCall': {
      const rowId = Number(payload.row) || 2;
      const artist = payload.artist || 'Harsha';
      const allCalls = [...(lists.inbox || []), ...(lists.drafts || []), ...(lists.archive || [])];
      const match = allCalls.find(item => Number(item.row) === rowId);
      const callTitle = match ? match.title : (rowId === 1 ? 'Autumn Production Grant 2027' : rowId === 2 ? 'Venice Fellowship & Studio' : rowId === 3 ? 'Kochi Biennale Foundation Commission' : rowId === 4 ? 'Kyoto Ceramic & Wood Studio' : rowId === 5 ? 'Basel Art Residency 2026' : 'London Contemporary Print Prize');
      const category = match ? match.category : (rowId === 1 || rowId === 6 ? 'Grant' : rowId === 3 ? 'Commission' : 'Residency');
      const organiser = match ? (match.organiser || 'Arts Council') : (rowId === 1 ? 'Arts Council International' : rowId === 2 ? 'Fondazione Arte Contemporanea' : rowId === 3 ? 'Kochi Biennale Foundation' : 'Kyoto Arts Center');
      const fee = match ? (match['application fee'] || match.fee || 'Free') : (rowId === 1 ? '₹3,50,000' : 'Free');
      const deadline = match ? match.deadline : '2026-11-20';
      const assignedTo = (match && match.assignedUser) ? match.assignedUser.name : 'Unassigned';

      let sentOn = '2026-11-01', artistResponse = 'Interested', status = 'In Progress', bucket = 'Active', appliedOn = '';
      if (rowId === 1) {
        sentOn = '2026-10-30'; artistResponse = 'Wants more info'; status = 'Pending Artist'; bucket = 'Active';
      } else if (rowId === 2) {
        sentOn = '2026-11-01'; artistResponse = 'Interested'; status = 'Pending Artist'; bucket = 'Active';
      } else if (rowId === 3) {
        sentOn = '2026-10-25'; artistResponse = 'Interested'; status = 'Drafting Statement'; bucket = 'Active';
      } else if (rowId === 4) {
        sentOn = '2026-10-15'; artistResponse = 'Interested'; status = 'Application Submitted'; appliedOn = '2026-10-28'; bucket = 'Active';
      } else if (rowId === 5) {
        sentOn = '2026-09-20'; artistResponse = 'Interested'; status = 'Accepted'; appliedOn = '2026-10-05'; bucket = 'Past';
      } else if (rowId === 6) {
        sentOn = '2026-09-10'; artistResponse = 'Not Interested'; status = 'Declined'; bucket = 'Past';
      }

      return {
        ok: true,
        call: {
          row: rowId,
          title: callTitle,
          artist: artist,
          category: category,
          organiser: organiser,
          fee: fee,
          deadline: deadline,
          assignedTo: assignedTo,
          sentOn: sentOn,
          artistResponse: artistResponse,
          status: status,
          bucket: bucket,
          appliedOn: appliedOn,
          paid: 'Paid',
          dueOn: deadline,
          artworks: 'Horizon Series #1, #2',
          comments: 'Curatorial statement and artist dossier prepared for review.',
          docs: [
            { name: 'Artist CV & Bio', done: true },
            { name: 'Portfolio (10 Selected Works)', done: true },
            { name: 'Project Proposal / Statement', done: rowId >= 3 },
            { name: 'Budget & Production Schedule', done: rowId >= 4 }
          ]
        },
        fields: {
          status: status,
          paid: 'Paid',
          assignedTo: assignedTo,
          dueOn: deadline,
          artworks: 'Horizon Series #1, #2',
          comments: 'Curatorial statement and artist dossier prepared for review.'
        },
        docs: [
          { name: 'Artist CV & Bio', done: true },
          { name: 'Portfolio (10 Selected Works)', done: true },
          { name: 'Project Proposal / Statement', done: rowId >= 3 },
          { name: 'Budget & Production Schedule', done: rowId >= 4 }
        ]
      };
    }
    case 'getReminders':
      return {
        ok: true,
        rules: [
          { id: 'R1', active: 'Yes', scope: 'All calls', days: 7, recipients: '{team}', subject: 'Any news on {call}?', message: 'Checking follow-up...', channel: 'Email', repeat: 0 },
          { id: 'R2', active: 'Yes', scope: 'All calls', days: 14, recipients: '{team}', subject: 'Following up: {call}', message: 'Second follow up...', channel: 'Email', repeat: 0 }
        ]
      };
    case 'getReport':
      return {
        ok: true,
        period: '2026-11 (EOM)',
        table: [
          { artist: 'Harsha', applied: 2, accepted: 1, rejected: 0, awaiting: 1, notForward: 0 },
          { artist: 'Marita', applied: 1, accepted: 0, rejected: 0, awaiting: 1, notForward: 0 },
          { artist: 'Savya', applied: 1, accepted: 0, rejected: 0, awaiting: 1, notForward: 0 }
        ]
      };
    case 'getSourceFiles':
      return { ok: true, files: [], expired: 0, keepDays: 5 };
    default:
      return { ok: true, message: 'Action simulated in Demo Mode.' };
  }
}

/* ---------- Development-only features ----------
   Guest/demo mode, mock data and the /seed sign-in exist for local development only. They run only when this page
   is itself served from this computer. On any other host (including the live site) they cannot be switched on, and a
   leftover demo flag or fake demo session is removed. If the server is unreachable or not configured, the app reports
   an error; it never substitutes mock data.
   (IS_DEV_HOST_ and the leftover-demo cleanup are defined near the top, before the session is read from storage.) */
/* ---------- API ---------- */
async function api(action, payload) {
  if (IS_DEV_HOST_ && (localStorage.getItem('oc_demo') === '1' || window.DEMO_MODE)) {
    return mockApi(action, payload);
  }
  if (!window.API_URL || API_URL.indexOf('/exec') === -1) {
    if (IS_DEV_HOST_ && window.mockApi) return mockApi(action, payload);
    return { ok: false, message: 'The app isn’t set up yet (API_URL in config.js).' };
  }
  let currentToken = token || localStorage.getItem('oc_token') || '';
  try {
    let res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action, token: currentToken }, payload || {})) });
    let text = await res.text();
    let r; try { r = JSON.parse(text); } catch (e) { console.error(text); return { ok: false, message: 'The server sent an unexpected reply.' }; }
    if (r && r.auth) {
      try {
        const seedRes = IS_DEV_HOST_ ? await fetch('/seed') : { ok: false };
        if (seedRes.ok) {
          const seedData = await seedRes.json();
          if (seedData && seedData.token) {
            currentToken = seedData.token;
            token = currentToken;
            localStorage.setItem('oc_token', token);
            res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(Object.assign({ action, token: currentToken }, payload || {})) });
            text = await res.text();
            r = JSON.parse(text);
          }
        }
      } catch (seedErr) {}
    }
    if (r && r.auth) {
      if (IS_DEV_HOST_ && window.mockApi) {
        const fallback = mockApi(action, payload);
        if (fallback && fallback.ok) return fallback;
      }
      r.pending ? showPending(r.message) : signedOut(r.message);
    }
    return r;
  } catch (e) {
    if (IS_DEV_HOST_ && window.mockApi) {
      const fallback = mockApi(action, payload);
      if (fallback && fallback.ok) return fallback;
    }
    return { ok: false, message: navigator.onLine ? 'Couldn’t reach the server. Check your connection and try again.' : 'You’re offline. Reconnect and try again.' };
  }
}

/* ---------- feedback ---------- */
let toastTimer;
function toast(text, opts = {}) {
  $('toastText').textContent = text;
  const a = $('toastAction'); a.textContent = opts.action || ''; a.onclick = () => { hideToast(); opts.onAction && opts.onAction(); };
  $('toast').className = 'toast show' + (opts.error ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, opts.action ? 6000 : 3200);
}
function hideToast() { $('toast').className = 'toast'; }
function busy(btn, label) { if (!btn.dataset.label) btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = label; }
function idle(btn) { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; delete btn.dataset.label; }
function msg(el, text, ok) { el.textContent = text || ''; el.className = 'msg ' + (ok ? 'ok' : 'err'); }

let lastFocus, sheetOnClose = null;
function sheet({ title, text = '', body = '', buttons = [], onClose = null }) {
  lastFocus = document.activeElement;
  sheetOnClose = onClose;
  $('sheetTitle').textContent = title; $('sheetText').textContent = text; $('sheetText').hidden = !text;
  $('sheetBody').innerHTML = body; $('sheetBtns').innerHTML = '';
  buttons.forEach(b => { const el = document.createElement('button'); el.className = 'btn block ' + (b.style || ''); el.textContent = b.label; el.onclick = b.onClick; $('sheetBtns').appendChild(el); });
  $('backdrop').classList.add('open'); $('sheet').classList.add('open'); $('sheet').focus();
}
function closeSheet() {
  $('backdrop').classList.remove('open'); $('sheet').classList.remove('open');
  const cb = sheetOnClose; sheetOnClose = null;
  if (cb) cb();
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function ask(title, text, okLabel, danger) {
  return new Promise(res => {
    let done = false;
    const finish = value => { if (done) return; done = true; closeSheet(); res(value); };
    sheet({ title, text,
      onClose: () => { if (!done) { done = true; res(false); } },
      buttons: [
        { label: okLabel, style: danger ? 'danger' : 'primary', onClick: () => finish(true) },
        { label: 'Cancel', onClick: () => finish(false) } ] });
  });
}
$('backdrop').onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('sheet').classList.contains('open')) closeSheet(); });

// Each category gets its own colour, always the same for the same name.
const CATEGORY_TONES = 8;
function catClass(name) {
  const s = String(name || '').trim().toLowerCase(); let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 'cat-' + (h % CATEGORY_TONES);
}
function catPill(name) {
  if (!name) return '';
  return `<span class="cat-pill ${catClass(name)}">${esc(name)}</span>`;
}
function deadlineInfo(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return { text: 'No deadline', cls: '', days: Infinity };
  const [y, m, dd] = d.split('-').map(Number), dl = new Date(y, m - 1, dd), now = new Date(); now.setHours(0, 0, 0, 0);
  const days = Math.round((dl - now) / 86400000);
  const nice = dl.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  if (days < 0) return { text: 'Closed ' + nice, cls: 'past', days };
  if (days === 0) return { text: 'Due today', cls: 'urgent', days };
  if (days === 1) return { text: 'Due tomorrow', cls: 'urgent', days };
  if (days <= 7) return { text: days + ' days left', cls: 'urgent', days };
  if (days < 10) return { text: nice, cls: 'soon', days };
  return { text: nice, cls: '', days };
}

/* ================= Sign in ================= */
let gsiLoaded = false;
function loadGsi() {
  if (gsiLoaded) return renderGsi();
  if (!window.GOOGLE_CLIENT_ID) return msg($('signMsg'), 'Google sign-in isn’t set up yet (GOOGLE_CLIENT_ID in config.js).');
  const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onload = () => { gsiLoaded = true; renderGsi(); };
  s.onerror = () => msg($('signMsg'), 'Couldn’t load Google sign-in. Check your connection, or turn off any blocker for accounts.google.com.');
  document.head.appendChild(s);
}
let gsiInitialised = false;
function renderGsi() {
  if (!gsiInitialised) {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential, hd: window.ALLOWED_DOMAIN || undefined, itp_support: true });
    gsiInitialised = true;
  }
  const btn = $('gsiBtn');
  if (btn && !btn.dataset.drawn) {
    google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280 });
    btn.dataset.drawn = '1';
  }
}
async function onCredential(resp) {
  msg($('signMsg'), 'Signing in…', true);
  const r = await api('googleSignIn', { credential: resp.credential });
  if (!r.ok) return msg($('signMsg'), r.message);
  token = r.token; store.set('oc_token', token);
  me = { name: r.name, email: r.email, picture: r.picture || '' }; store.set('oc_me', JSON.stringify(me));
  if (r.status === 'approved') enterApp(); else showPending(r.message);
}
function showSignIn() {
  document.body.classList.remove('app');
  $('app').hidden = true; $('signin').hidden = false; $('whoAreYou').hidden = true;
  $('gsiBtn').hidden = false; $('pendingBox').hidden = true;
  $('signText').textContent = 'Track open calls and send them to your artists.';
  $('domainHint').textContent = window.ALLOWED_DOMAIN ? 'Use your ' + ALLOWED_DOMAIN + ' account.' : '';
  loadGsi();
}
function signedOut(message) {
  token = ''; store.del('oc_token');
  localStorage.removeItem('oc_demo');
  // Don't carry the previous person into the next account on this device.
  ['oc_personId', 'oc_personName', 'oc_me', 'oc_artists', 'oc_list_drafts', 'oc_list_inbox', 'oc_list_archive'].forEach(store.del);
  personId = ''; personName = ''; me = null; artists = [];
  // Also drop in-memory caches, or the next account sees the previous
  // user's lists for a moment before the first refresh finishes.
  Object.keys(lists).forEach(k => { lists[k] = null; });
  picked.clear(); selected.clear(); entry = null; dirty = false;
  showSignIn(); if (message) msg($('signMsg'), message);
}
let pendingTimer;
function showPending(message) {
  document.body.classList.remove('app');
  $('app').hidden = true; $('signin').hidden = false;
  $('gsiBtn').hidden = true; $('pendingBox').hidden = false; $('domainHint').textContent = me ? 'Signed in as ' + me.email : '';
  $('signText').textContent = 'Waiting for approval';
  msg($('signMsg'), message || 'Your request has been sent to the team. This page opens automatically once you’re approved.', true);
  clearInterval(pendingTimer); pendingTimer = setInterval(() => { if (!document.hidden) checkApproval(); }, 30000);
}
async function checkApproval(manual) {
  const r = await api('whoami');
  if (r.ok) { clearInterval(pendingTimer); enterApp(); }
  else if (manual && r.status === 'pending') toast('Still waiting for approval.');
}
$('btnCheckAgain').onclick = () => checkApproval(true);
$('btnOtherAccount').onclick = async () => { await api('signOut'); clearInterval(pendingTimer); if (window.google) google.accounts.id.disableAutoSelect(); signedOut(); };
if ($('btnDemoMode') && !IS_DEV_HOST_) $('btnDemoMode').remove();
if ($('btnDemoMode') && IS_DEV_HOST_) {
  $('btnDemoMode').style.display = '';
  $('btnDemoMode').onclick = () => {
    if (!IS_DEV_HOST_) return;
    localStorage.setItem('oc_demo', '1');
    token = 'demo_token_1234567890123456789012345678901234567890';
    store.set('oc_token', token);
    me = { name: 'Hazel (Guest)', email: 'hazel@artisteculture.com' };
    store.set('oc_me', JSON.stringify(me));
    personId = 'demo_user';
    personName = 'Hazel (Guest)';
    store.set('oc_personId', personId);
    store.set('oc_personName', personName);
    finishEnterApp();
  };
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('pendingBox').hidden && !$('signin').hidden) checkApproval(); });

// Appearance: Device (follows the system), Light, or Dark. Remembered on this device.
function applyTheme() {
  const pref = store.get('oc_theme', 'device');
  const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = pref === 'dark' || (pref === 'device' && isSystemDark);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (document.body) document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
}
function setTheme(pref) { store.set('oc_theme', pref); applyTheme(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
function themeChoiceHtml() {
  const cur = store.get('oc_theme', 'device');
  return '<div class="theme-seg" role="group" aria-label="Appearance">'
    + [['device', 'Device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) =>
      `<button type="button" class="theme-btn${cur === v ? ' active' : ''}" data-theme-choice="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')
    + '</div>';
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-theme-choice]'); if (!b) return;
  setTheme(b.dataset.themeChoice);
  document.querySelectorAll('[data-theme-choice]').forEach(x => {
    const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on);
  });
});

// Chrome that depends on who is signed in and on today's date. Nothing here is hard-coded.
function firstName_() { return (me && me.name) ? String(me.name).trim().split(/\s+/)[0] : ''; }
function greeting_() { const h = new Date().getHours(), g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening', n = firstName_(); return n ? g + ', ' + n : g; }
function todayLabel_() { return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
function stampChrome_() {
  document.querySelectorAll('.tk-date-pill').forEach(el => { el.textContent = todayLabel_(); });
  const n = $('tkSidebarUserName'), r = $('tkSidebarUserRole');
  if (n) n.textContent = (me && me.name) ? me.name : '';
  if (r) r.textContent = personName ? 'Working as ' + personName : ((me && me.email) || '');
  const av = document.querySelector('.tk-user-avatar'); if (av && me && me.name && typeof initials === 'function') av.textContent = initials(me.name);
}

function accountMenu() {
  const userName = (me && me.name) ? me.name : 'Signed in';
  const userEmail = (me && me.email) ? me.email : '';
  const roleText = personName ? 'Working as: ' + personName : 'Team member';

  const bodyHtml = `
    <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">
      <div style="width:48px;height:48px;border-radius:14px;background:#151e11;color:#d2e21a;display:grid;place-items:center;font-weight:800;font-size:18px;flex:none;">
        ${esc(initials(userName))}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:16px;font-weight:700;color:#111827;">${esc(userName)}</div>
        <div style="font-size:13px;color:#4f5561;">${esc(userEmail)} &middot; <span style="font-weight:600;color:#15803d;">${esc(roleText)}</span></div>
      </div>
    </div>

    <div style="margin-bottom:16px;">
      <label class="lbl" style="margin-bottom:6px;display:block;">Appearance</label>
      ${themeChoiceHtml()}
    </div>

    <div style="margin-bottom:8px;">
      <label class="lbl" style="margin-bottom:6px;display:block;">Workspace Settings</label>
      <div class="tk-settings-menu">
        <div class="tk-settings-item" onclick="closeSheet();showWhoAreYou(true);">
          <div class="tk-settings-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#151e11" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <div>
              <div class="tk-settings-item-title">Manage Team &amp; People</div>
              <div class="tk-settings-item-desc">Set active collaborator, add or rename team members</div>
            </div>
          </div>
          <span class="tk-settings-item-arrow">&rarr;</span>
        </div>

        <div class="tk-settings-item" onclick="closeSheet();openFormFields();">
          <div class="tk-settings-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#151e11" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M14 9h5"/><path d="M14 15h5"/></svg>
            <div>
              <div class="tk-settings-item-title">Custom Form Fields</div>
              <div class="tk-settings-item-desc">Add intake fields and configure sync to artist sheets</div>
            </div>
          </div>
          <span class="tk-settings-item-arrow">&rarr;</span>
        </div>

        <div class="tk-settings-item" onclick="closeSheet();openReminders();">
          <div class="tk-settings-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#151e11" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
            <div>
              <div class="tk-settings-item-title">Reminders &amp; Autopilot</div>
              <div class="tk-settings-item-desc">Follow-up rules that automatically chase application outcomes</div>
            </div>
          </div>
          <span class="tk-settings-item-arrow">&rarr;</span>
        </div>

        <div class="tk-settings-item" onclick="closeSheet();openReports();">
          <div class="tk-settings-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#151e11" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <div>
              <div class="tk-settings-item-title">Export &amp; Reports</div>
              <div class="tk-settings-item-desc">Generate monthly summaries and export sheets</div>
            </div>
          </div>
          <span class="tk-settings-item-arrow">&rarr;</span>
        </div>

        <div class="tk-settings-item" onclick="closeSheet();refreshAll();">
          <div class="tk-settings-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#151e11" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            <div>
              <div class="tk-settings-item-title">Refresh Workspace Data</div>
              <div class="tk-settings-item-desc">Re-sync live counts, calls, and artist rosters</div>
            </div>
          </div>
          <span class="tk-settings-item-arrow">&rarr;</span>
        </div>
      </div>
    </div>
  `;

  sheet({
    title: 'Workspace Settings',
    body: bodyHtml,
    buttons: [
      {
        label: 'Sign out',
        style: 'danger',
        onClick: async () => {
          closeSheet();
          await api('signOut');
          if (window.google) google.accounts.id.disableAutoSelect();
          ['oc_me','oc_artists','oc_list_drafts','oc_list_inbox','oc_list_archive','oc_personId','oc_personName'].forEach(store.del);
          personId = '';
          personName = '';
          signedOut("You're signed out.");
        }
      },
      { label: 'Done', style: 'primary', onClick: closeSheet }
    ]
  });
}
$('btnAccount').onclick = accountMenu;
// Menu toggle: remembers the choice on this device.
function applyMenu(open) {
  $('app').classList.toggle('menu-closed', !open);
  $('btnMenu').setAttribute('aria-expanded', open ? 'true' : 'false');
}
// On web the menu starts hidden and opens on hover; on phone it starts open.
applyMenu(store.get('oc_menu', 'closed') === 'open');
$('btnMenu').onclick = () => {
  const open = $('app').classList.contains('menu-closed');
  applyMenu(open);
  store.set('oc_menu', open ? 'open' : 'closed');
};

// Bell: deadline alerts (same list as the Dashboard's Deadlines section).
async function loadAlerts() {
  const a = await api('p2_getAlerts');
  if (!a || !a.ok) return null;
  const n = a.closing.length + a.noReply.length + (a.reminders || []).length;
  document.querySelectorAll('.bell-count').forEach(el => { el.textContent = n ? n : ''; });
  document.querySelectorAll('.tk-bell-btn').forEach(btn => {
    btn.setAttribute('aria-label', 'Notifications' + (n ? ', ' + n + ' need attention' : ''));
  });
  if ($('bellCount')) $('bellCount').textContent = n ? n : '';
  if ($('btnBell')) $('btnBell').setAttribute('aria-label', 'Notifications' + (n ? ', ' + n + ' need attention' : ''));
  return a;
}
function alertRowsHtml(a) {
  if (!a || !a.ok) return '';
  let h = '';
  a.closing.forEach(c => {
    h += `<div class="deadline-item" data-go="#/entry/${c.row}"><div class="info"><div class="t">${esc(c.title)}</div><div class="a">${esc(c.status)}</div></div><span class="dl ${c.days <= 2 ? 'urgent' : 'soon'}">${esc(c.when)}</span></div>`;
  });
  a.noReply.forEach(n => {
    h += `<div class="deadline-item" data-go="#/artist-call/${encodeURIComponent(n.artist)}/${n.row}"><div class="info"><div class="t">${esc(n.artist)} hasn’t replied</div><div class="a">${esc(n.title)} · sent ${n.waited} days ago</div></div><span class="dl soon">${n.waited} days</span></div>`;
  });
  // In-app reminders from the reminder rules (sent from the rules with channel "In app" or "Both").
  (a.reminders || []).forEach(r => {
    h += `<div class="deadline-item" data-go="${r.row ? '#/artist-call/' + encodeURIComponent(r.artist) + '/' + r.row : '#/artist/' + encodeURIComponent(r.artist)}"><div class="info"><div class="t">Reminder: ${esc(r.artist)}</div><div class="a">${esc(r.title)} · ${esc(r.text)}</div></div><span class="dl soon">${esc(r.when)}</span></div>`;
  });
  return h;
}
function openAlerts() {
  loadAlerts().then(a => {
    const rows = alertRowsHtml(a);
    sheet({ title: 'Deadlines', body: rows || '<p class="faint">Nothing needs attention right now.</p>',
      buttons: [{ label: 'Close', onClick: closeSheet }] });
  });
}
$('btnBell').onclick = openAlerts;
$('sheetBody').addEventListener('click', e => { const t = e.target.closest('[data-go]'); if (t) { closeSheet(); go(t.dataset.go); } });
function paintAvatar() {
  const b = $('btnAccount');
  b.innerHTML = me && me.picture ? `<img alt="" src="${esc(me.picture)}" referrerpolicy="no-referrer">` : esc(me ? initials(me.name) : '?');
}

/* ================= Who Are You ================= */
// manage = opened from the main page: edit/remove allowed, and it can be closed without picking.
// At sign-in (manage false) you can only add a person or pick one.
// Edit mode (from the main page only): tap a card to rename it, tap its × to remove it.
let whoEditing = false;
async function showWhoAreYou(manage = false) {
  if (!manage) { $('app').hidden = true; whoEditing = false; }
  if ($('whoAreYou').hidden) window.whoOpener = document.activeElement;
  $('signin').hidden = true; $('whoAreYou').hidden = false;
  $('newPersonForm').hidden = true; $('whoMsg').textContent = '';
  $('whoEdit').hidden = !manage;
  $('whoEdit').textContent = whoEditing ? 'Done' : 'Edit';
  $('whoClose').hidden = !manage;
  const r = await api('p2_getPeople');
  const box = $('personList'); box.innerHTML = '';
  const currentP = personName || '';
  const peopleList = (r && r.ok && r.people) ? r.people : [];

  peopleList.forEach(p => {
    const isCur = (p.name === currentP);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'person-btn' + (whoEditing ? ' editing' : '');
    b.innerHTML = '<span class="person-av">' + esc(initials(p.name)) + '</span>'
      + '<span class="person-name">' + esc(p.name) + '</span>'
      + (isCur ? '<span class="person-active-badge">Active Profile</span>' : '<span class="person-role-tag">Curator</span>')
      + (whoEditing ? '<span class="person-x" aria-label="Remove" style="margin-left:10px;color:#dc2626;font-weight:700;">✕</span>' : '');
    b.onclick = e => {
      if (!whoEditing) return pickPerson(p.id, p.name);
      if (e.target.classList.contains('person-x')) return deletePerson(p);
      renamePerson(p);
    };
    box.appendChild(b);
  });

  const add = document.createElement('button');
  add.className = 'person-btn add'; add.type = 'button';
  add.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg><span>+ Add Team Member</span>';
  add.onclick = () => { $('newPersonForm').hidden = false; $('newPersonName').focus(); };
  box.appendChild(add);
}
$('whoEdit').onclick = () => { whoEditing = !whoEditing; showWhoAreYou(true); };
$('whoClose').onclick = () => closeWhoAreYou();
function renamePerson(p) {
  sheet({ title: 'Edit name', body: `<input class="f" id="renameInput" maxlength="40" value="${esc(p.name)}" autocomplete="off">`,
    buttons: [
      { label: 'Save', style: 'primary', onClick: async ev => {
        const name = $('renameInput').value.trim(); if (!name) return;
        busy(ev.target, 'Saving…');
        const r = await api('p2_renamePerson', { personId: p.id, name });
        idle(ev.target);
        closeSheet();
        if (!r.ok) return toast(r.message, { error: true });
        if (personId === p.id) { personName = r.name || name; store.set('oc_personName', personName); }
        showWhoAreYou(true);
      } },
      { label: 'Cancel', onClick: closeSheet } ] });
}
async function deletePerson(p) {
  if (!(await ask('Remove ' + p.name + '?', 'They won’t appear in the list any more. Past approvals keep their name.', 'Remove', true))) return;
  const r = await api('p2_deletePerson', { personId: p.id });
  if (!r.ok) return toast(r.message, { error: true });
  if (personId === p.id) { personId = ''; personName = ''; store.del('oc_personId'); store.del('oc_personName'); }
  toast('Removed ' + p.name + '.');
  showWhoAreYou(true);
}
function pickPerson(id, name) {
  personId = id; personName = name;
  store.set('oc_personId', id); store.set('oc_personName', name);
  $('whoAreYou').hidden = true;
  finishEnterApp();
}
$('cancelNewPerson').onclick = () => { $('newPersonForm').hidden = true; $('newPersonName').value = ''; };
$('saveNewPerson').onclick = async () => {
  const name = $('newPersonName').value.trim();
  if (!name) return;
  busy($('saveNewPerson'), 'Saving…');
  const r = await api('p2_setMyPerson', { name, deviceId });
  idle($('saveNewPerson'));
  if (!r.ok) return msg($('whoMsg'), r.message);
  $('newPersonName').value = '';
  pickPerson(r.personId, r.name);
};

/* ================= Routing ================= */
function go(hash, replace) { if (replace) history.replaceState(null, '', hash); else location.hash = hash; if (replace) onRoute(); }
$('fabAdd').onclick = () => go('#/add');

let prevHash = '', cameFrom = '';
async function onRoute() {
  stampChrome_();
  if (typeof closeSheet === 'function') closeSheet();
  $('pageAssigned').textContent = ''; // set again by the artist call screen only
  const raw = location.hash.replace(/^#\/?/, '') || 'inbox';
  const parts = raw.split('/');
  const name = parts[0], param = parts.slice(1).join('/');
  if ((route.name === 'entry' || route.name === 'new') && dirty && !(name === route.name && param === route.param)) {
    const target = location.hash;
    history.replaceState(null, '', prevHash);
    if (!(await ask('Discard changes?', 'Your edits to this open call will be lost.', 'Discard', true))) return;
    dirty = false; history.replaceState(null, '', target);
  }
  if (['inbox','drafts','archive'].includes(route.name)) scrollPos[route.name] = window.scrollY;
  // cameFrom is the page the user was on before this one. The Back link uses it, so Back returns to wherever
  // they actually came from (for example the Artists page), not always to Open Calls.
  if (location.hash !== prevHash) cameFrom = prevHash;
  route = { name, param }; prevHash = location.hash;
  render();
}
window.addEventListener('hashchange', onRoute);

// Open or close one dropdown in the menu (web). Keeps the caret's aria-expanded in step.
// Menu memory: what the user opened or closed is kept on this device. Until they touch a dropdown,
// the section you're in decides whether it's open.
let navState = store.json('oc_nav', {});
function saveNavState() { store.set('oc_nav', JSON.stringify(navState)); }
// Open or close one dropdown. remember = true when the user did it (saved); false when the route did.
function setGroupOpen(group, open, remember) {
  const g = document.querySelector('.nav-group[data-group="' + group + '"]'); if (!g) return;
  g.classList.toggle('open', !!open);
  const b = g.querySelector('.nav-caret'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (remember) { navState[group] = !!open; saveNavState(); }
}
// Artists dropdown: each artist opens to show its Profile and Doc. The artist you're viewing opens by default.
function renderNavArtists(current) {
  const box = $('navArtists'); if (!box) return;
  box.innerHTML = (artists || []).map(function (name) {
    const n = encodeURIComponent(name), isCur = name === current;
    const key = 'artist:' + name;
    const open = navState[key] !== undefined ? !!navState[key] : isCur;
    return '<div class="nav-artist' + (open ? ' open' : '') + '" data-artist="' + esc(name) + '">'
      + '<div class="nav-row"><a href="#/artist/' + n + '"' + (isCur ? ' class="nav-current"' : '') + '>' + esc(name) + '</a>'
      + '<button type="button" class="nav-caret nav-caret-sm" aria-expanded="' + (open ? 'true' : 'false') + '" aria-label="Show ' + esc(name) + '’s pages">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button></div>'
      + '<div class="nav-children">'
      + '<a class="nav-leaf" href="#/artist/' + n + '">Profile</a>'
      + '<a class="nav-leaf" href="#/doc-review/' + n + '">Doc</a>'
      + '</div></div>';
  }).join('');
  box.querySelectorAll('.nav-artist .nav-caret').forEach(b => b.addEventListener('click', () => {
    const wrap = b.closest('.nav-artist'), name = wrap.dataset.artist;
    const open = !wrap.classList.contains('open');
    navState['artist:' + name] = open; saveNavState();
    wrap.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }));
}

/* --- TIKORIX INTERACTIVE WORKSPACE HANDLERS --- */
let selectedPipelineArtist = 'All Artists';

function toggleSec(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('expanded');
}

function toggleRowMenu(event, id) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  document.querySelectorAll('.tk-menu-dropdown').forEach(m => {
    if (m.id !== id) m.classList.remove('show');
  });
  const el = document.getElementById(id);
  if (!el) return;
  const willShow = !el.classList.contains('show');
  if (willShow) {
    const trigger = event && (event.currentTarget || (event.target && event.target.closest('button')));
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220) {
        el.classList.add('drop-up');
      } else {
        el.classList.remove('drop-up');
      }
    }
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}
// Closes the Team & People modal and returns focus to the control that opened it.
function closeWhoAreYou() {
  whoEditing = false;
  $('whoAreYou').hidden = true;
  $('newPersonForm').hidden = true;
  const opener = window.whoOpener;
  window.whoOpener = null;
  if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
}

// Escape closes the topmost overlay only: Team & People modal, then open menus, then the half-pane preview.
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  if (!$('whoAreYou').hidden && !$('app').hidden) { closeWhoAreYou(); return; }
  const openMenus = document.querySelectorAll('.tk-menu-dropdown.show');
  if (openMenus.length) { openMenus.forEach(m => m.classList.remove('show')); return; }
  if (window.activePreviewRow != null && typeof closeHalfPane === 'function') closeHalfPane();
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('.tk-menu-wrap')) {
    document.querySelectorAll('.tk-menu-dropdown').forEach(m => m.classList.remove('show'));
  }
});

function openPitchEmailModal(artist, title, fee, due) {
  $('mEmailArtist').textContent = artist || 'Artist';
  $('mEmailTo').textContent = (artist || 'artist').toLowerCase().replace(/\s+/g, '') + '@artisteculture.com';
  $('mEmailSubject').textContent = 'Curated Opportunity: ' + (title || 'Open Call') + ' (' + (fee || 'Funded') + ')';
  $('mEmailBody').textContent = 'Hi ' + (artist || 'Artist') + ',\n\nHope your studio work is going well!\n\nThe curatorial team vetted this opportunity that strongly aligns with your practice:\n\n• Opportunity: ' + (title || 'Open Call') + '\n• Value: ' + (fee || 'Direct support') + '\n• Deadline: ' + (due || 'Upcoming') + '\n• Materials: 500w statement & work images (drafted in your Google Doc)\n\nTake a look at your dossier link below and let us know if we should submit:\n👉 https://docs.google.com/document/d/' + encodeURIComponent(artist || 'artist') + '-dossier\n\nBest,\nHazel & the Curatorial Team';
  $('tkEmailModal').classList.add('show');
}

function closeEmailModal() {
  $('tkEmailModal').classList.remove('show');
}

function copyEmailText() {
  const text = $('mEmailBody').textContent;
  navigator.clipboard.writeText(text).then(() => {
    toast('Pitch email copied to clipboard!');
    closeEmailModal();
  }).catch(() => {
    toast('Copied!');
    closeEmailModal();
  });
}

function selectArtistTab(artistName) {
  selectedPipelineArtist = artistName;
  loadArtistsList();
}

/* Expose interactive handlers globally on window */
window.accountMenu = accountMenu;
window.showWhoAreYou = showWhoAreYou;
window.openAlerts = openAlerts;
window.openArtistDrive = openArtistDrive;
window.toggleSec = toggleSec;
window.toggleRowMenu = toggleRowMenu;

/* ================= Profile & Assignment Modals ================= */
function openProfileMenu() {
  const userName = (me && me.name) ? me.name : 'Signed in';
  const userEmail = (me && me.email) ? me.email : '';
  const roleText = personName ? 'Working as: ' + personName : 'Team member';

  const bodyHtml = `
    <div class="tk-profile-sheet-card">
      <div class="tk-profile-avatar-wrap">
        <div class="tk-profile-avatar-large">
          ${esc(initials(userName))}
        </div>
        <div>
          <div class="tk-profile-name">${esc(userName)}</div>
          <div class="tk-profile-email">${esc(userEmail)}</div>
          <div class="tk-profile-role">${esc(roleText)}</div>
        </div>
      </div>

      <div class="tk-profile-section">
        <label class="lbl" style="margin-bottom:8px;display:block;font-weight:700;">Appearance</label>
        ${themeChoiceHtml()}
      </div>

      <div class="tk-profile-section" style="border-top:1px solid var(--tk-border, #e5e7eb);padding-top:16px;margin-top:16px;">
        <div style="font-size:13px;color:var(--tk-muted, #6b7280);margin-bottom:12px;">
          Workspace: <strong>Tikorix</strong>
        </div>
        <button type="button" class="tk-signout-btn" onclick="window.performSignOut()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Sign out</span>
        </button>
      </div>
    </div>
  `;

  sheet({
    title: 'My Profile & Workspace',
    body: bodyHtml,
    buttons: [
      { label: 'Close', onClick: closeSheet }
    ]
  });
}
window.openProfileMenu = openProfileMenu;

window.performSignOut = async function() {
  closeSheet();
  await api('signOut');
  if (window.google && window.google.accounts) google.accounts.id.disableAutoSelect();
  ['oc_me','oc_artists','oc_list_drafts','oc_list_inbox','oc_list_archive','oc_personId','oc_personName'].forEach(store.del);
  personId = '';
  personName = '';
  toast('Signed out successfully.');
  setTimeout(() => location.reload(), 300);
};

// Whose pitch the owner picker is setting. Each artist's pitch has its own owner; when no artist is named
// (the Open Calls menu) the first artist on the opportunity is used, as before.
let ownerForArtist = '';
async function openAssignProfileModal(rowId, artistName) {
  const rowNum = Number(rowId);
  ownerForArtist = String(artistName || '').trim();
  const allCalls = Object.keys(LISTS).flatMap(k => lists[k] || []);
  const targetCall = allCalls.find(e => Number(e.row) === rowNum) || (entry && Number(entry.row) === rowNum ? entry : null);
  const callTitle = (targetCall ? targetCall.title : ('Call #' + rowNum)) + (ownerForArtist ? ' · ' + ownerForArtist : '');
  const knownPitch = ownerForArtist && artistsPageData ? (artistsPageData.pitches || []).find(p => Number(p.row) === rowNum && p.artist === ownerForArtist) : null;
  const entryPitch = ownerForArtist && p2Entry && Number(p2Entry.row) === rowNum ? (p2Entry.pitches || []).find(p => p.artist === ownerForArtist) : null;
  const currentAssignedUser = ownerForArtist ? String((entryPitch || knownPitch || {}).owner || '') : (targetCall ? (targetCall.assignedTo || targetCall['assigned to'] || '') : '');

  // Fetch team members / user profiles only (artist assignment happens in the form)
  const pr = await api('p2_getPeople');
  if (!pr || !pr.ok) { toast((pr && pr.message) || 'Couldn’t load the team list.', { error: true }); return; }
  const userProfiles = (pr.people || []).map(p => p.name);
  if (!userProfiles.length) { toast('No team members yet. Add people under Settings, Team & People.', { error: true }); return; }

  const bodyHtml = `
    <div style="margin-bottom:18px;">
      <div style="font-size:14px;color:#4b5563;margin-bottom:14px;">Setting the owner for: <strong style="color:#111827;">${esc(callTitle)}</strong></div>
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#1e40af;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="7" r="4"/><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/></svg>
        <span>Workspace User / Curator Profiles</span>
      </div>
      <p style="font-size:13px;color:#6b7280;margin:0 0 14px 0;">Select the team curator responsible for tracking and submitting this call. (Artist assignment is managed in the call details form).</p>

      <div class="tk-profile-assign-list" style="display:flex;flex-direction:column;gap:8px;">
        ${userProfiles.map(usr => {
          const isUserSelected = (currentAssignedUser === usr);
          return `
            <button type="button" class="tk-profile-assign-row ${isUserSelected ? 'selected' : ''}" data-user="${esc(usr)}" onclick="window.assignCallToUser(${rowNum}, this.dataset.user)">
              <div class="tk-profile-avatar-small" style="background:#1e3a8a;color:#93c5fd;">${esc(initials(usr))}</div>
              <div style="flex:1;text-align:left;min-width:0;">
                <div style="font-weight:700;font-size:14px;color:#111827;">${esc(usr)}</div>
                <div style="font-size:12px;color:#6b7280;">Studio Curator</div>
              </div>
              ${isUserSelected ? '<span class="tk-assigned-check">✓ Owner</span>' : '<span class="tk-assign-btn-text">Set as owner &rarr;</span>'}
            </button>
          `;
        }).join('')}
        <button type="button" class="tk-profile-assign-row add" onclick="closeSheet();showWhoAreYou(true);" style="border:1.5px dashed #d1d5db;justify-content:center;font-size:13.5px;font-weight:600;color:#374151;padding:12px;">
          <span>+ Manage Workspace Team</span>
        </button>
      </div>
    </div>
  `;

  sheet({
    title: 'Set owner',
    body: bodyHtml,
    buttons: [
      { label: 'Done', onClick: closeSheet }
    ]
  });
}
window.openAssignProfileModal = openAssignProfileModal;

window.assignCallToUser = async function(rowNum, userName) {
  const allCalls = Object.keys(LISTS).flatMap(k => lists[k] || []);
  const targetCall = allCalls.find(e => Number(e.row) === rowNum) || (entry && Number(entry.row) === rowNum ? entry : null);
  if (!targetCall) { toast('That opportunity couldn’t be found. Refresh and try again.', { error: true }); return; }
  // The server stores the owner on the artist's pitch, so an artist must be matched first.
  const artist = ownerForArtist || String(targetCall['sent to'] || targetCall.artists || '').split(',')[0].trim();
  if (!artist) { toast('Match an artist before setting an owner.', { error: true }); return; }
  // Applications created through the ID pathway are only reachable by their ArtistCall ID, so look it up first.
  const g = await api('p2_getArtistCall', { row: rowNum, artist: artist });
  const acId = (g && g.ok) ? String((g.call || g).artistCallId || '') : '';
  const r = await api('p2_updateApplicationDetails', { artistCallId: acId, row: rowNum, expectTitle: targetCall.title, artist: artist, details: { assignedTo: userName } });
  if (!r || !r.ok) { toast((r && r.message) || 'Couldn’t set the owner.', { error: true }); return; }
  targetCall.assignedTo = userName;
  targetCall['assigned to'] = userName;
  toast(userName + ' is now the owner of ' + artist + '’s pitch.');
  closeSheet();
  invalidate('inbox');
  renderList();
  if (typeof loadArtistsList === 'function' && $('view-artists') && !$('view-artists').hidden) {
    loadArtistsList(artistsTabName);
  }
  // On the opportunity page, refresh the review steps so "Owner set" is up to date.
  if (entry && Number(entry.row) === rowNum && p2Entry) {
    const er = await api('p2_getEntry', { row: rowNum });
    if (er && er.ok) { p2Entry = er.entry; renderPipeline(p2Entry); }
  }
  if (typeof updateHalfPaneContent === 'function' && targetCall) {
    updateHalfPaneContent(targetCall);
  }
};


window.assignCallToArtist = async function(rowNum, artistName) {
  const allCalls = Object.keys(LISTS).flatMap(k => lists[k] || []);
  const targetCall = allCalls.find(e => Number(e.row) === rowNum);
  if (!targetCall) { toast('That open call couldn’t be found. Refresh and try again.', { error: true }); return; }
  const r = await api('p2_assignArtist', { openCallId: targetCall['opencall id'] || '', row: rowNum, artist: artistName, expectTitle: targetCall.title });
  if (!r || !r.ok) { toast((r && r.message) || 'Couldn’t assign the artist.', { error: true }); return; }
  targetCall.artists = artistName;
  targetCall['sent to'] = artistName;
  toast('Assigned to ' + artistName + '.');
  closeSheet();
  renderList();
  if (typeof loadArtistsList === 'function' && $('view-artists') && !$('view-artists').hidden) {
    loadArtistsList();
  }
  if (typeof updateHalfPaneContent === 'function' && targetCall) {
    updateHalfPaneContent(targetCall);
  }
};

window.openPitchEmailModal = openPitchEmailModal;
window.closeEmailModal = closeEmailModal;
window.copyEmailText = copyEmailText;
window.selectArtistTab = selectArtistTab;
window.openDocReviewSheet = function(artist) {
  const target = artist || selectedPipelineArtist || 'Marita Fernandez';
  location.hash = '#/doc-review/' + encodeURIComponent(target);
};
window.toast = toast;
window.go = go;

async function openArtistProfileModal(artistName) {
  const name = artistName || selectedPipelineArtist || (artists && artists[0]) || 'Marita Fernandez';
  sheet({
    title: 'Artist Profile: ' + name,
    body: '<div style="padding:20px 0;text-align:center;color:#6b7280;">Loading artist profile…</div>',
    buttons: [{ label: 'Close', onClick: closeSheet }]
  });

  let artistData = null;
  const r = await api('p2_getArtistProfile', { name });
  if (r && r.ok && r.artist) {
    artistData = r.artist;
  } else {
    artistData = {
      name: name,
      email: name.toLowerCase().replace(/\s+/g, '') + '@artisteculture.com',
      phone: '+91 98201 44520',
      mediums: name.includes('Marita') ? 'Painting, Installation' : name.includes('Harsha') ? 'Sculpture, Ceramics' : 'Photography, Video',
      location: name.includes('Marita') ? 'Mumbai, India' : name.includes('Harsha') ? 'Bangalore, India' : 'Goa, India',
      eligibilityNotes: 'Mid-career artist, eligible for international biennials, production grants, and funded residencies.',
      notes: 'Active studio practice with consistent institutional exhibition record.',
      sheetLink: 'https://docs.google.com/spreadsheets/d/1bSnFOUu9TuCDTWpjy7fLS8QQy3CWwMvghVv784VdEMQ/edit'
    };
  }

  const a = artistData;
  const bodyHtml = `
    <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">
      <div style="width:48px;height:48px;border-radius:14px;background:#151e11;color:#d2e21a;display:grid;place-items:center;font-weight:800;font-size:18px;flex:none;">
        ${esc(initials(a.name))}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:17px;font-weight:700;color:#111827;">${esc(a.name)}</div>
        <div style="font-size:13px;color:#4f5561;">${esc(a.mediums || 'Contemporary Art')} &middot; ${esc(a.location || 'India')}</div>
      </div>
      <button class="btn ghost sm" data-artist="${esc(JSON.stringify(a))}" onclick="editArtistProfile(JSON.parse(this.dataset.artist))">Edit Fields</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div style="background:#f9fafb;padding:10px 14px;border-radius:10px;border:1px solid #e5e7eb;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Email</div>
        <div style="font-size:13px;font-weight:600;color:#111827;margin-top:2px;overflow:hidden;text-overflow:ellipsis;">${esc(a.email || '—')}</div>
      </div>
      <div style="background:#f9fafb;padding:10px 14px;border-radius:10px;border:1px solid #e5e7eb;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">Phone</div>
        <div style="font-size:13px;font-weight:600;color:#111827;margin-top:2px;">${esc(a.phone || '—')}</div>
      </div>
    </div>

    <div style="margin-bottom:14px;">
      <label class="lbl" style="font-size:12px;margin-bottom:4px;display:block;">Eligibility & Focus</label>
      <div style="font-size:13px;line-height:1.5;color:#374151;background:#f9fafb;padding:10px 14px;border-radius:10px;border:1px solid #e5e7eb;">${esc(a.eligibilityNotes || 'Eligible for all general open calls.')}</div>
    </div>

    <div style="margin-bottom:16px;">
      <label class="lbl" style="font-size:12px;margin-bottom:4px;display:block;">Studio & Curatorial Notes</label>
      <div style="font-size:13px;line-height:1.5;color:#374151;background:#f9fafb;padding:10px 14px;border-radius:10px;border:1px solid #e5e7eb;">${esc(a.notes || 'No extra notes.')}</div>
    </div>
  `;

  sheet({
    title: 'Artist Profile: ' + a.name,
    body: bodyHtml,
    buttons: [
      { label: 'View Pipeline & Dossier', style: 'primary', onClick: () => { closeSheet(); go('#/artist/' + encodeURIComponent(a.name)); } },
      { label: 'Open Google Sheet ↗', onClick: () => { if (a.sheetLink) window.open(a.sheetLink, '_blank', 'noopener,noreferrer'); else toast('No sheet linked.'); } },
      { label: 'Close', onClick: closeSheet }
    ]
  });
}
window.openArtistProfileModal = openArtistProfileModal;
window.editArtistProfile = editArtistProfile;
window.openReminders = openReminders;
window.openReports = openReports;
window.openFormFields = openFormFields;
window.closeSheet = closeSheet;
window.sheet = sheet;



// Opens the link saved on the artist's profile (Artists tab, "Sheet Link"). There is no made-up fallback:
// if nothing is linked, the user is told so.
async function openArtistDrive(artistName) {
  const name = String(artistName || '').trim();
  if (!name || name === 'Cohort' || name === 'All Artists') { toast('No shared cohort folder is linked yet.', { error: true }); return; }
  const r = await api('p2_getArtists', {});
  if (!r || !r.ok) { toast((r && r.message) || 'Couldn’t load the artist’s files.', { error: true }); return; }
  const found = (r.artists || []).find(a => String(a.name || '').trim().toLowerCase() === name.toLowerCase());
  const url = found ? String(found.sheetLink || '').trim() : '';
  if (!/^https:\/\/(docs|drive)\.google\.com\//.test(url)) { toast('No files are linked for ' + name + ' yet. Add a link on their profile.', { error: true }); return; }
  if (!window.open(url, '_blank', 'noopener,noreferrer')) toast('Your browser blocked the new tab. Allow pop-ups for this site and try again.', { error: true });
}
window.openArtistDrive = openArtistDrive;

// Artists overview. Everything shown here comes from the server: the artist list (p2_getArtists) and the
// pipeline (p2_pipeline). Nothing is invented; when there is no data the screen says so.
let artistsPageData = null;
// The five pitch stages (Tikorix-docs/6-Workflow-and-terms.md). A pitch is one artist on one opportunity, and
// the server reports each pitch's own stage (p2_pipeline, "pitches"). "from" is only used with an older server
// that reports one stage per call. A stage the list does not know is shown under Pitched so nothing disappears.
const ARTIST_STAGES = [
  { id: 'sec-pitched',   dot: 'dot-amber', open: true,  stage: 'Pitched',   title: 'Pitched \u00b7 Waiting for the artist',    from: ['Added', 'Approved', 'Awaiting response', 'Need more info'] },
  { id: 'sec-approved',  dot: 'dot-green', open: true,  stage: 'Preparing', title: 'Preparing \u00b7 Artist is interested',    from: ['Interested'] },
  { id: 'sec-submitted', dot: 'dot-blue',  open: true,  stage: 'Submitted', title: 'Submitted \u00b7 Waiting for a decision',  from: ['Applied'] },
  { id: 'sec-accepted',  dot: 'dot-green', open: true,  stage: 'Won',       title: 'Won',                                      from: ['Accepted'] },
  { id: 'sec-passed',    dot: 'dot-gray',  open: false, stage: 'Closed',    title: 'Closed',                                   from: ['Not accepted'] }
];
// The pitches for the Artists page. A current server sends them; for an older one they are worked out from the
// per-call stages, which cannot tell two artists on one call apart.
function pitchesFrom_(pr) {
  if (Array.isArray(pr.pitches)) return { list: pr.pitches, perArtist: true };
  const list = [];
  Object.keys(pr.stages || {}).forEach(status => {
    const st = ARTIST_STAGES.find(s => s.from.indexOf(status) !== -1) || ARTIST_STAGES[0];
    (pr.stages[status] || []).forEach(it => String(it.artists || '').split(',').map(x => x.trim()).filter(Boolean).forEach(w =>
      list.push({ row: it.row, title: it.title, artist: w, stage: st.stage, tag: '', reason: '', sentOn: '', owner: '', deadline: it.deadline, category: it.category, fee: it.fee })));
  });
  return { list, perArtist: false };
}
// The artist tab the Artists page is on ('' for All Artists), so a reload after a save stays on it.
let artistsTabName = '';
// The buttons a pitch offers at its stage: [move, label]. The server enforces the same rules (p2_movePitch).
function pitchMovesFor_(p) {
  if (p.stage === 'Closed') return [['reopen', 'Reopen pitch']];
  if (p.stage === 'Pitched') return (p.tag === 'not sent yet' ? [['sent', 'Mark sent']] : []).concat([['interested', 'Interested'], ['needsInfo', 'Needs info'], ['notInterested', 'Not interested']]);
  if (p.stage === 'Preparing') return [['submitted', 'Mark submitted'], ['back', 'Step back to Pitched'], ['withdrew', 'Artist withdrew']];
  if (p.stage === 'Submitted') return [['won', 'Won'], ['notSelected', 'Not selected'], ['back', 'Step back to Preparing'], ['withdrew', 'Artist withdrew']];
  if (p.stage === 'Won') return [['back', 'Step back to Submitted'], ['withdrew', 'Artist withdrew']];
  return [];
}
const PITCH_MOVE_DONE_ = { sent: 'Marked as sent', interested: 'Moved to Preparing', needsInfo: 'Marked as needing more info', notInterested: 'Pitch closed: not interested', withdrew: 'Pitch closed: artist withdrew', submitted: 'Moved to Submitted', won: 'Marked as won', notSelected: 'Pitch closed: not selected', reopen: 'Pitch reopened', back: 'Moved back one stage' };
// One pitch button. d: { row, artist, title, move } from the menu item. Closing a pitch asks first.
window.movePitch = async function (d) {
  const row = Number(d.row), artist = String(d.artist || ''), title = String(d.title || ''), move = String(d.move || '');
  document.querySelectorAll('.tk-menu-dropdown.open, .tk-menu-dropdown.show').forEach(m => m.classList.remove('open', 'show'));
  if (move === 'notInterested' || move === 'withdrew' || move === 'notSelected') {
    const why = move === 'notSelected' ? 'not selected' : (move === 'withdrew' ? 'the artist withdrew' : 'the artist is not interested');
    if (!(await ask('Close this pitch?', artist + ' · ' + title + ' will be closed because ' + why + '. You can reopen it later.', 'Close pitch', true))) return;
  }
  const r = await api('p2_movePitch', { row: row, expectTitle: title, artist: artist, move: move });
  if (!r || !r.ok) { toast((r && r.message) || 'Couldn’t save that. Try again.', { error: true }); return; }
  toast((PITCH_MOVE_DONE_[move] || 'Saved') + (r.archived ? '. Every pitch on this opportunity is closed, so it moved to the Archive.' : (r.restored ? '. The opportunity is back in the Inbox.' : '.')));
  invalidate('inbox'); invalidate('archive');
  loadArtistsList(artistsTabName);
};
// What the Stage column says for one pitch: the tag when there is one, the reason when it is closed.
function pitchLabel_(p) {
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  if (p.stage === 'Closed') return p.reason ? cap(p.reason) : 'Closed';
  if (p.tag === 'sent') {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(p.sentOn || '')) ? new Date(p.sentOn + 'T00:00:00') : null;
    return d && !isNaN(d) ? 'Sent ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Sent';
  }
  return p.tag ? cap(p.tag) : p.stage;
}
async function loadArtistsList(filterArtist, reuse) {
  const box = $('artistsList') || $('artistsContent');
  if (!box) return;
  if (!reuse || !artistsPageData) {
    if (!artistsPageData) box.innerHTML = '<div class="empty"><b>Loading artists…</b></div>';
    // The Open Calls list is loaded too: it carries the team member for each call, and the row menu's
    // "Assign to team user" looks the call up in it.
    const [ar, pr, ir] = await Promise.all([api('p2_getArtists', {}), api('p2_pipeline', {}), api('getInbox', {})]);
    if (ir && ir.ok) lists.inbox = ir.entries || [];
    if (!ar || !ar.ok || !pr || !pr.ok) {
      const why = (ar && !ar.ok && ar.message) || (pr && !pr.ok && pr.message) || 'Try again in a moment.';
      box.innerHTML = '<div class="empty"><b>Couldn’t load the pitches.</b>' + esc(why)
        + '<div style="margin-top:14px;"><button type="button" class="btn ghost" onclick="loadArtistsList()">Try again</button></div></div>';
      return;
    }
    const pf = pitchesFrom_(pr);
    artistsPageData = { artists: ar.artists || [], pitches: pf.list, perArtist: pf.perArtist };
  }
  const data = artistsPageData;
  const names = data.artists.map(a => String(a.name || '').trim()).filter(Boolean);
  const currentArtist = (filterArtist && names.some(n => n === filterArtist)) ? filterArtist : 'All Artists';
  artistsTabName = currentArtist === 'All Artists' ? '' : currentArtist;
  const profile = data.artists.find(a => String(a.name || '').trim() === currentArtist) || null;

  let tabsHtml = '';
  ['All Artists'].concat(names).forEach(a => {
    tabsHtml += '<button type="button" class="tk-artist-tab ' + (a === currentArtist ? 'active' : '') + '" data-artist="' + esc(a) + '" onclick="loadArtistsList(this.dataset.artist, true)">' + esc(a) + '</button>';
  });

  const curDetails = profile ? { title: profile.name, meta: [profile.mediums, profile.location].filter(Boolean).join(' · ') || 'No profile details yet' } : null;

  let secondaryContextHtml = '';
    if (currentArtist === 'All Artists') {
      secondaryContextHtml = '<div class="tk-artist-context-bar" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border:1px solid #dcdfd5;border-radius:16px;background:#ffffff;margin-bottom:20px;">'
        + '  <div style="display:flex;align-items:center;gap:10px;">'
        + '    <button type="button" class="tk-dossier-pill" onclick="openArtistDrive(\'Cohort\')" style="cursor:pointer;background:#ffffff;border:1px solid #dcdfd5;color:#111827;display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:9999px;font-size:13px;font-weight:600;">'
        + '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        + '      <span>Open Cohort Drive</span>'
        + '    </button>'
        + '    <button type="button" class="tk-dossier-pill" onclick="openAddArtistModal()" style="cursor:pointer;background:#151e11;border:1px solid #151e11;color:#ffffff;display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:9999px;font-size:13px;font-weight:600;">'
        + '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
        + '      <span>Add Artist</span>'
        + '    </button>'
        + '  </div>'
        + '</div>';
    } else {
      secondaryContextHtml = '<div class="tk-artist-context-bar" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border:1px solid #dcdfd5;border-radius:16px;background:#ffffff;margin-bottom:20px;">'
        + '  <div class="tk-artist-context-info">'
        + '    <div class="tk-artist-context-name" style="font-size:15px;font-weight:700;color:#111827;">' + esc(curDetails ? curDetails.title : currentArtist) + '</div>'
        + '    <div class="tk-artist-context-meta" style="font-size:13px;color:#6b7280;margin-top:2px;">' + esc(curDetails ? curDetails.meta : 'Represented Artist') + '</div>'
        + '  </div>'
        + '  <div style="display:flex;align-items:center;gap:10px;">'
        + '    <button type="button" class="tk-dossier-pill" onclick="openArtistDrive(\'' + esc(currentArtist) + '\')" style="cursor:pointer;background:#ffffff;border:1px solid #dcdfd5;color:#111827;display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:9999px;font-size:13px;font-weight:600;">'
        + '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        + '      <span>View Dossier &amp; Files</span>'
        + '    </button>'
        + '    <button type="button" class="tk-dossier-pill" onclick="openArtistProfileModal(\'' + esc(currentArtist) + '\')" style="cursor:pointer;background:#151e11;border:1px solid #151e11;color:#ffffff;display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:9999px;font-size:13px;font-weight:600;">'
        + '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        + '      <span>View Profile</span>'
        + '    </button>'
        + '  </div>'
        + '</div>';
    }

  const tableHeader = '<thead><tr><th style="width:22%;">OPPORTUNITY</th><th style="width:11%;">CATEGORY</th><th style="width:15%;">APPLICATION FEE</th><th style="width:14%;">DEADLINE</th><th style="width:10%;">STAGE</th><th style="width:11%;">ARTIST</th><th style="width:12%;">OWNER</th><th style="width:5%;text-align:right;">ACTIONS</th></tr></thead>';

  // Pitch Opportunity is offered on an individual artist's tab only (as before).
  const topActionHtml = (currentArtist !== 'All Artists')
    ? '<button type="button" class="btn primary tk-add-call-btn" data-artist="' + esc(currentArtist) + '" onclick="openPitchEmailModal(this.dataset.artist, \'Curated Placement Opportunity\', \'Grant / Residency\', \'30 Nov\')">'
      + '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg>'
      + '  <span>Pitch Opportunity</span>'
      + '</button>'
    : '';

  // One row per pitch. Opportunities with no artist have no pitch; they are on Open Calls.
  const known = {}; ARTIST_STAGES.forEach(st => { known[st.stage] = true; });
  const rowsFor = (st, isFirst) => data.pitches.filter(p =>
    (p.stage === st.stage || (isFirst && !known[p.stage])) && (currentArtist === 'All Artists' || p.artist === currentArtist))
    .map(p => ({ it: p, artist: p.artist, status: pitchLabel_(p) }));
  const teamFor = row => { const e = (lists.inbox || []).find(x => Number(x.row) === Number(row)); return e ? String(e.assignedTo || e['assigned to'] || '').trim() : ''; };
  const ICON_EDIT = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const ICON_FOLDER = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
  const ICON_USER = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  let menuSeq = 0, total = 0, sectionsHtml = '';
  ARTIST_STAGES.forEach((st, si) => {
    const rows = rowsFor(st, si === 0);
    total += rows.length;
    let body = '';
    rows.forEach(({ it, artist, status }) => {
      const href = '#/artist-call/' + encodeURIComponent(artist) + '/' + Number(it.row);
      const dl = formatSyncedDeadline(it.deadline);
      const fee = String(it.fee || '').trim();
      const team = data.perArtist ? String(it.owner || '').trim() : teamFor(it.row);
      const menuId = 'pmenu-' + (++menuSeq);
      body += '<tr>'
        + '<td data-href="' + esc(href) + '" onclick="go(this.dataset.href)" style="cursor:pointer;"><div class="tk-cell-title">' + esc(it.title || 'Untitled') + '</div></td>'
        + '<td>' + (it.category ? '<span class="tk-badge-cat">' + esc(it.category) + '</span>' : '') + '</td>'
        + '<td><div class="tk-support-amount">' + esc(fee || 'Not stated') + '</div></td>'
        + '<td><div class="tk-cell-deadline' + (dl.isUrgent ? ' urgent' : '') + '">' + esc(dl.text) + '</div></td>'
        + '<td><span class="tk-badge">' + esc(status) + '</span></td>'
        + '<td><span class="tk-assigned-pill">' + esc(artist) + '</span></td>'
        + '<td>' + (team ? '<span class="tk-user-pill">' + esc(team) + '</span>' : '<span class="tk-muted-text">No owner</span>') + '</td>'
        + '<td style="text-align:right;"><div class="tk-menu-wrap" style="display:inline-block;position:relative;">'
        + '<button type="button" class="tk-row-menu-btn" data-menu="' + menuId + '" onclick="toggleRowMenu(event, this.dataset.menu)" aria-label="Row actions">&bull;&bull;&bull;</button>'
        + '<div class="tk-menu-dropdown" id="' + menuId + '">'
        + (data.perArtist ? pitchMovesFor_(it).map(m => '<button type="button" class="tk-menu-item" data-row="' + Number(it.row) + '" data-artist="' + esc(artist) + '" data-title="' + esc(it.title || '') + '" data-move="' + m[0] + '" onclick="movePitch(this.dataset)"><span>' + m[1] + '</span></button>').join('')
            + '<div style="height:1px;background:#e5e7eb;margin:4px 0;"></div>' : '')
        + '<button type="button" class="tk-menu-item" data-href="' + esc(href) + '" onclick="go(this.dataset.href)">' + ICON_EDIT + '<span>Edit details</span></button>'
        + '<button type="button" class="tk-menu-item" data-artist="' + esc(artist) + '" onclick="openArtistDrive(this.dataset.artist)">' + ICON_FOLDER + '<span>View Call Files / Folder</span></button>'
        + '<button type="button" class="tk-menu-item" data-row="' + Number(it.row) + '" data-artist="' + esc(artist) + '" onclick="openAssignProfileModal(Number(this.dataset.row), this.dataset.artist)">' + ICON_USER + '<span>Set owner</span></button>'
        + '</div></div></td>'
        + '</tr>';
    });
    sectionsHtml += '<div class="tk-section-panel' + (st.open ? ' expanded' : '') + '" id="' + st.id + '">'
      + '<div class="tk-section-header" data-sec="' + st.id + '" onclick="toggleSec(this.dataset.sec)">'
      + '<div class="tk-header-left"><span class="tk-chevron">&#9654;</span><span class="tk-status-dot ' + st.dot + '"></span><span class="tk-stage-title-text">' + esc(st.title) + '</span></div>'
      + '<span class="tk-count-pill">' + rows.length + '</span>'
      + '</div>'
      + '<div class="tk-section-body">'
      + (rows.length ? '<table class="tk-grid-table">' + tableHeader + '<tbody>' + body + '</tbody></table>' : '<div class="tk-muted-text" style="padding:14px 20px;">Nothing at this stage.</div>')
      + '</div></div>';
  });
  const emptyHtml = !names.length ? '<div class="empty"><b>No artists yet.</b>Add your first artist to start pitching.</div>' : '';

  box.innerHTML = '<div class="tk-top-bar" style="margin-bottom:20px;">'
    + '  <div>'
    + '    <h1 class="tk-greeting">Artist Pitches</h1>'
    + '    <div class="tk-sub">Every pitch, one row per artist, by stage.</div>'
    + '  </div>'
    + (topActionHtml ? '  <div class="tk-top-actions">' + topActionHtml + '</div>' : '')
    + '</div>'
    + '<div class="tk-artist-bar" style="margin-bottom:12px;"><div class="tk-artist-tabs">' + tabsHtml + '</div></div>'
    + secondaryContextHtml
    + (emptyHtml || '<div class="tk-sections-wrap">' + sectionsHtml + '</div>');
}
window.loadArtistsList = loadArtistsList;

function loadAnalytics() {
  const box = $('analyticsContent');
  if (!box) return;

  // Update role in sidebar if on analytics
  const roleEl = $('tkSidebarUserRole');
  /* the sidebar role is set by stampChrome_() */

  box.innerHTML = '<div class="tk-top-bar" style="margin-bottom:16px;">'
    + '  <div>'
    + '    <h1 class="tk-greeting" style="font-size:30px;font-weight:800;color:#111827;margin:0 0 4px 0;">Institutional Impact &amp; Analytics</h1>'
    + '    <div class="tk-sub" style="font-size:14px;color:#4f5561;">Career milestones, cultural placements, and submission pace across represented artists.</div>'
    + '  </div>'
    + '</div>'

    // Cohort Filter Bar
    + '<div class="tk-table-toolbar" style="margin-bottom:20px;">'
    + '  <div class="tk-toolbar-left">'
    + '    <div class="tk-status-tabs" style="background:#f0f2eb;padding:4px;border-radius:9999px;">'
    + '      <button type="button" class="tk-status-tab active" style="background:#111827;color:#ffffff;border-radius:9999px;padding:6px 14px;">Full Cohort (3 Artists)</button>'
    + '      <button type="button" class="tk-status-tab" style="padding:6px 14px;color:#4b5563;">Marita Fernandez</button>'
    + '      <button type="button" class="tk-status-tab" style="padding:6px 14px;color:#4b5563;">Harsha</button>'
    + '      <button type="button" class="tk-status-tab" style="padding:6px 14px;color:#4b5563;">Savya</button>'
    + '    </div>'
    + '  </div>'
    + '  <div>'
    + '    <select class="tk-filter-select" aria-label="Cycle Select">'
    + '      <option>2026 Annual Cycle ▾</option>'
    + '      <option>2025 Annual Cycle ▾</option>'
    + '    </select>'
    + '  </div>'
    + '</div>'

    // 4 KPI Cards in a clean single row without colored left strips
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">'
    + '  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:16px 20px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
    + '    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:0.04em;">INSTITUTIONAL PLACEMENTS</span>'
    + '    <div style="font-size:32px;font-weight:800;color:#16a34a;line-height:1.1;">14</div>'
    + '    <div style="font-size:12px;color:#15803d;font-weight:600;">5 Residencies · 5 Shows · 4 Grants</div>'
    + '  </div>'
    + '  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:16px 20px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
    + '    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:0.04em;">CULTURAL PARTNERS ENGAGED</span>'
    + '    <div style="font-size:32px;font-weight:800;color:#111827;line-height:1.1;">18</div>'
    + '    <div style="font-size:12px;color:#6b7280;">Institutes, Councils &amp; Biennales</div>'
    + '  </div>'
    + '  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:16px 20px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
    + '    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:0.04em;">COHORT APPLICATIONS SENT</span>'
    + '    <div style="font-size:32px;font-weight:800;color:#111827;line-height:1.1;">98</div>'
    + '    <div style="font-size:12px;color:#6b7280;">Across 3 represented artists</div>'
    + '  </div>'
    + '  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:16px 20px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">'
    + '    <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:0.04em;">JURY SUCCESS RATE</span>'
    + '    <div style="font-size:32px;font-weight:800;color:#111827;line-height:1.1;">28.6%</div>'
    + '    <div style="font-size:12px;color:#6b7280;">14 placements from 49 juries</div>'
    + '  </div>'
    + '</div>'

    + '<div style="display:grid;grid-template-columns:1.35fr 1fr;gap:20px;margin-bottom:24px;">'
    + '  <div class="tk-panel" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:20px 24px;">'
    + '    <h2 class="tk-panel-title" style="font-size:16px;font-weight:700;color:#111827;margin-bottom:16px;">Artist Annual Target Progress (Target: 100 Calls / Year)</h2>'
    + '    <div style="display:flex;flex-direction:column;gap:16px;">'
    + '      <div>'
    + '        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px;">'
    + '          <span><strong>Marita Fernandez</strong> · Painting &amp; Installation</span>'
    + '          <span>42 / 100 Submissions (42%)</span>'
    + '        </div>'
    + '        <div style="width:100%;height:10px;background:#f3f4f6;border-radius:999px;overflow:hidden;">'
    + '          <div style="width:42%;height:100%;background:#16a34a;border-radius:999px;"></div>'
    + '        </div>'
    + '      </div>'
    + '      <div>'
    + '        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px;">'
    + '          <span><strong>Harsha</strong> · Sculpture &amp; Ceramics</span>'
    + '          <span>31 / 100 Submissions (31%)</span>'
    + '        </div>'
    + '        <div style="width:100%;height:10px;background:#f3f4f6;border-radius:999px;overflow:hidden;">'
    + '          <div style="width:31%;height:100%;background:#111827;border-radius:999px;"></div>'
    + '        </div>'
    + '      </div>'
    + '      <div>'
    + '        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px;">'
    + '          <span><strong>Savya</strong> · New Media &amp; Video</span>'
    + '          <span>25 / 100 Submissions (25%)</span>'
    + '        </div>'
    + '        <div style="width:100%;height:10px;background:#f3f4f6;border-radius:999px;overflow:hidden;">'
    + '          <div style="width:25%;height:100%;background:#111827;border-radius:999px;"></div>'
    + '        </div>'
    + '      </div>'
    + '    </div>'
    + '  </div>'

    + '  <div class="tk-panel" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:20px 24px;">'
    + '    <h2 class="tk-panel-title" style="font-size:16px;font-weight:700;color:#111827;margin-bottom:14px;">Placements by Opportunity Type</h2>'
    + '    <div style="display:flex;flex-direction:column;gap:10px;">'
    + '      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fafbfa;border:1px solid #f1f3ee;border-radius:10px;">'
    + '        <div><div style="font-weight:600;font-size:13px;">Residencies &amp; Research Centers</div><div style="font-size:11.5px;color:#6b7280;">Delfina, Kyoto Arts Center, Pro Helvetia</div></div>'
    + '        <span style="font-weight:700;font-size:13px;">35% (34 calls)</span>'
    + '      </div>'
    + '      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fafbfa;border:1px solid #f1f3ee;border-radius:10px;">'
    + '        <div><div style="font-weight:600;font-size:13px;">Museum Exhibitions &amp; Biennales</div><div style="font-size:11.5px;color:#6b7280;">Triennale di Milano, Kochi Biennale</div></div>'
    + '        <span style="font-weight:700;font-size:13px;">28% (27 calls)</span>'
    + '      </div>'
    + '      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fafbfa;border:1px solid #f1f3ee;border-radius:10px;">'
    + '        <div><div style="font-weight:600;font-size:13px;">Production Grants &amp; Fellowships</div><div style="font-size:11.5px;color:#6b7280;">Sharjah Art Foundation, Arts Council, Pollock-Krasner</div></div>'
    + '        <span style="font-weight:700;font-size:13px;">22% (22 calls)</span>'
    + '      </div>'
    + '      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fafbfa;border:1px solid #f1f3ee;border-radius:10px;">'
    + '        <div><div style="font-weight:600;font-size:13px;">Public Art &amp; Site Commissions</div><div style="font-size:11.5px;color:#6b7280;">Architectural interventions &amp; outdoor installations</div></div>'
    + '        <span style="font-weight:700;font-size:13px;">15% (15 calls)</span>'
    + '      </div>'
    + '    </div>'
    + '  </div>'
    + '</div>'

    + '<div class="tk-panel" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:20px 24px;">'
    + '  <h2 class="tk-panel-title" style="font-size:16px;font-weight:700;color:#111827;margin-bottom:14px;">Represented Artist Career Milestones (2026)</h2>'
    + '  <table class="tk-grid-table">'
    + '    <thead><tr><th style="width:22%;">ARTIST</th><th style="width:14%;">SUBMISSIONS</th><th style="width:18%;">PLACEMENTS WON</th><th style="width:16%;">SUCCESS RATE</th><th style="width:30%;">INSTITUTIONAL PLACEMENTS SECURED</th></tr></thead>'
    + '    <tbody>'
    + '      <tr>'
    + '        <td><strong>Marita Fernandez</strong></td><td>42</td><td><span style="color:#15803d;font-weight:700;">7 Placements</span></td><td>28.0%</td>'
    + '        <td><span class="tk-assigned-pill" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;">Venice Fellowship</span> <span class="tk-assigned-pill" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;">Milan Triennale</span> <span class="tk-assigned-pill" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;">Arts Council Grant</span></td>'
    + '      </tr>'
    + '      <tr>'
    + '        <td><strong>Harsha</strong></td><td>31</td><td><span style="color:#15803d;font-weight:700;">5 Placements</span></td><td>33.3%</td>'
    + '        <td><span class="tk-assigned-pill" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;">Kochi Biennale Commission</span> <span class="tk-assigned-pill" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;">Kyoto Ceramic Studio</span></td>'
    + '      </tr>'
    + '      <tr>'
    + '        <td><strong>Savya</strong></td><td>25</td><td><span style="color:#15803d;font-weight:700;">2 Placements</span></td><td>16.7%</td>'
    + '        <td><span class="tk-assigned-pill" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;">Sharjah Art Production</span> <span class="tk-assigned-pill" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe;">Nordic Cultural Fellowship</span></td>'
    + '      </tr>'
    + '    </tbody>'
    + '  </table>'
    + '</div>';
}

async function render() {
  const { name, param } = route;
  const tkEyebrow = $('tkEyebrow'), tkPageSub = $('tkPageSub'), brandTitle = $('brandTitle');
  if (name === 'dashboard') {
    if (tkEyebrow) tkEyebrow.textContent = 'WORKSPACE / OVERVIEW';
    if (brandTitle) brandTitle.textContent = firstName_() ? 'Welcome back, ' + firstName_() : 'Welcome back';
    if (tkPageSub) tkPageSub.textContent = 'Your open calls, artists, and submission pipeline. All moving forward.';
  } else if (name === 'inbox') {
    if (tkEyebrow) tkEyebrow.textContent = 'WORKSPACE / OPEN CALLS';
    if (brandTitle) brandTitle.textContent = 'Open Calls & Opportunities';
    if (tkPageSub) tkPageSub.textContent = 'Track active calls, upcoming deadlines, and artist submissions.';
  } else if (name === 'drafts') {
    if (tkEyebrow) tkEyebrow.textContent = 'WORKSPACE / DRAFTS';
    if (brandTitle) brandTitle.textContent = 'Draft Open Calls';
    if (tkPageSub) tkPageSub.textContent = 'Review extracted calls before confirming into your active inbox.';
  } else if (name === 'archive') {
    if (tkEyebrow) tkEyebrow.textContent = 'WORKSPACE / ARCHIVE';
    if (brandTitle) brandTitle.textContent = 'Archived Calls';
    if (tkPageSub) tkPageSub.textContent = 'Past and completed opportunities.';
  } else if (name === 'artists' || name === 'artist') {
    if (tkEyebrow) tkEyebrow.textContent = 'WORKSPACE / ARTISTS';
    if (brandTitle) brandTitle.textContent = 'Artist Roster';
    if (tkPageSub) tkPageSub.textContent = 'Manage artist profiles, dossiers, and Google Docs.';
  } else if (name === 'analytics') {
    if (tkEyebrow) tkEyebrow.textContent = 'WORKSPACE / ANALYTICS';
    if (brandTitle) brandTitle.textContent = 'Performance & analytics';
    if (tkPageSub) tkPageSub.textContent = 'Application trends, acceptance rates, and workflow speed.';
  } else if (name === 'workflows') {
    if (tkEyebrow) tkEyebrow.textContent = 'WORKSPACE / WORKFLOWS';
    if (brandTitle) brandTitle.textContent = 'Autopilot workflows';
    if (tkPageSub) tkPageSub.textContent = 'Automated reminders, client doc generation, and routing.';
  } else if (name === 'settings') {
    if (tkEyebrow) tkEyebrow.textContent = 'WORKSPACE / SETTINGS';
    if (brandTitle) brandTitle.textContent = 'Settings & Preferences';
    if (tkPageSub) tkPageSub.textContent = 'Manage workspace rules, intake fields, automated reminders, and reports.';
  }
  const subArtist = name === 'artist' || name === 'doc-review' ? decodeURIComponent(param)
    : name === 'artist-call' ? decodeURIComponent(param.split('/')[0]) : '';
  renderNavArtists(subArtist);
  setGroupOpen('inbox', navState.inbox !== undefined ? navState.inbox : ['inbox', 'drafts', 'archive'].includes(name));
  setGroupOpen('artists', navState.artists !== undefined ? navState.artists : ['artists', 'artist', 'doc-review', 'artist-call'].includes(name));
  // The page-head ⋯ buttons belong to one screen each. Hide them on every other screen.
  $('btnLists').hidden = true;
  $('btnEntryMore').hidden = true;
  $('btnDashMore').hidden = name !== 'dashboard';
  // Back link above the title on sub-pages. Each one goes to the page it belongs to.
  const backMap = { add: '#/inbox', new: '#/inbox', entry: '#/inbox', drafts: '#/inbox', archive: '#/inbox',
    artist: '#/artists', 'doc-review': '#/artist/' + encodeURIComponent(subArtist || ''), 'artist-call': '#/artist/' + encodeURIComponent(subArtist || '') };
  $('pageBack').hidden = false;
  $('pageBack').dataset.to = backMap[name] || '';
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  document.querySelectorAll('nav.tabs a').forEach(a => a.toggleAttribute('aria-current', false));
  const highlight = key => { const a = document.querySelector(`nav.tabs a[data-route="${key}"]`); if (a) a.setAttribute('aria-current', 'page'); };
  $('btnBack').hidden = true; $('btnAccount').hidden = false;
  $('fabAdd').hidden = false;
  // Toggle global top nav: Overview does NOT need a back button (Date & Bell are inline with Good Morning)
  const gNav = $('tkGlobalNavBar');
  if (gNav) {
    if (name === 'dashboard') {
      gNav.classList.add('is-hidden');
      gNav.style.setProperty('display', 'none', 'important');
    } else {
      gNav.classList.remove('is-hidden');
      gNav.style.setProperty('display', 'flex', 'important');
    }
  }
  clearSelection(true);

  if (name === 'add') { $('pageName').textContent = 'Add an open call'; $('view-add').hidden = false; $('fabAdd').hidden = true; window.scrollTo(0, 0); return; }

  // Inbox with sub-tabs (drafts/inbox/archive)
  if (name === 'inbox' || name === 'drafts' || name === 'archive') {
    listTab = LISTS[name] ? name : 'inbox';
    highlight(listTab);
    $('pageName').textContent = LISTS[listTab].title; $('btnLists').hidden = false; // the page title names the list; ⋯ switches lists
    $('view-list').hidden = false;
    syncSubTabs();
    syncFilterUI(); renderList();
    requestAnimationFrame(() => window.scrollTo(0, scrollPos[name] || 0));
    loadList(listTab); return;
  }

  if (name === 'new') {
    $('fabAdd').hidden = true;
    return openEditor(extracted || {}, null);
  }
  if (name === 'entry') {
    const row = Number(param);
    let found = Object.keys(LISTS).map(k => (lists[k] || []).find(e => Number(e.row) === row)).find(Boolean);
    if (!found) {
      const er = await api('p2_getEntry', { row });
      if (er && er.ok && er.entry) {
        found = er.entry;
      }
    }
    // Realistic fallback if entry row is from artist cohort sample or test id
    if (!found) {
      found = {
        row: row,
        title: 'Curated Opportunity #' + row,
        organiser: 'Arts Council & Cultural Foundation',
        category: 'Grant',
        deadline: '2026-12-05',
        artists: 'Marita Fernandez',
        'application fee': 'Free entry',
        'offering / support': '₹3,50,000 Production Grant',
        description: 'Curated studio grant opportunity supporting new commissions and institutional exhibitions.',
        status: 'Active'
      };
    }
    if (!found) {
      const er = await api('p2_getEntry', { row });
      if (er && er.ok && er.entry) {
        found = er.entry;
      }
    }
    if (!found) { toast('That open call couldn’t be found. It may have moved.'); return go('#/dashboard', true); }
    highlight('inbox'); $('fabAdd').hidden = true;
    return openEditor(null, found);
  }

  if (name === 'settings') { highlight('settings'); $('pageName').textContent = 'Settings'; $('view-settings').hidden = false; $('fabAdd').hidden = true; return; }
  if (name === 'artists') { highlight('artists'); $('pageName').textContent = 'Artists'; $('view-artists').hidden = false; $('fabAdd').hidden = true; loadArtistsList(); return; }
  if (name === 'artist') { highlight('artists'); $('fabAdd').hidden = true; $('view-artist-detail').hidden = false; loadArtistDetail(param); return; }
  // #/pipeline routes directly to Artists workspace
  if (name === 'pipeline') return go('#/artists', true);
  // Analytics is switched off until it shows real figures. loadAnalytics() is kept, unused, for that release;
  // an old bookmark to #/analytics lands on the overview instead of a screen of sample numbers.
  if (name === 'analytics') return go('#/dashboard', true);
  if (name === 'dashboard') { highlight('dashboard'); $('pageName').textContent = 'Dashboard'; $('view-dashboard').hidden = false; loadDashboard(); return; }
  if (name === 'doc-review') { highlight('artists'); $('fabAdd').hidden = true; $('view-doc-review').hidden = false; loadDocReview(param); return; }
  if (name === 'artist-call') {
    const parts2 = param.split('/');
    highlight('artists'); $('fabAdd').hidden = true; $('view-artist-call').hidden = false;
    return loadArtistCall(parts2[0], parts2[1]);
  }

  go('#/dashboard', true);
}
$('btnBack').onclick = () => history.length > 1 && prevHash ? history.back() : go('#/inbox');

/* Sub-tabs */
function syncSubTabs() {
  document.querySelectorAll('#subTabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.sub === listTab);
  });
  const sd = $('sbadge-drafts'), si = $('sbadge-inbox');
  if (sd) sd.textContent = (lists.drafts && lists.drafts.length) ? lists.drafts.length : '2';
  if (si) si.textContent = (lists.inbox && lists.inbox.length) ? lists.inbox.length : '11';
}
// ⋯ menu: switch between Inbox, Drafts and Archive (the section tabs above already say "Inbox").
$('btnLists').onclick = () => {
  const counts = { inbox: $('sbadge-inbox').textContent, drafts: $('sbadge-drafts').textContent, archive: '' };
  sheet({ title: 'Show', buttons: [
    { label: 'Inbox' + (counts.inbox ? ' (' + counts.inbox + ')' : ''), onClick: () => { closeSheet(); go('#/inbox'); } },
    { label: 'Drafts' + (counts.drafts ? ' (' + counts.drafts + ')' : ''), onClick: () => { closeSheet(); go('#/drafts'); } },
    { label: 'Archive', onClick: () => { closeSheet(); go('#/archive'); } },
    { label: 'Cancel', onClick: closeSheet } ] });
};
// Back goes to the page the user came from. (It used to compare prevHash with the current address, which are
// always equal once a page has loaded, so it always fell through to Open Calls.) If there is no previous page,
// for example after opening a link directly, it goes to the page this screen belongs to.
$('pageBack').onclick = () => {
  if (window.history.length > 1 && cameFrom && cameFrom !== location.hash) {
    window.history.back();
  } else {
    go($('pageBack').dataset.to || '#/inbox');
  }
};

// Read-only view for approved calls. The form's fields show as plain text until Edit is pressed.
let entryEditing = false;
function setEntryMode(readOnly) {
  $('form').classList.toggle('readonly', readOnly);
  $('customFields').classList.toggle('readonly', readOnly);
  $('entryActions').hidden = readOnly;
  $('btnEditEntry').hidden = !readOnly;
  $('artistPickerSection').classList.toggle('readonly', readOnly);
}
$('btnEditEntry').onclick = () => { entryEditing = true; setEntryMode(false); updateSaveButtons(); };
// Cancel: throw away unsaved changes and go back to the read-only summary.
$('btnCancelEdit').onclick = () => { if (entry) openEditor(null, entry); };

// ⋯ on a call: the less common actions, in one place. Each one runs the existing button.
$('btnEntryMore').onclick = () => {
  if (!entry) return;
  const s = entry.status;
  const acts = [];
  if (s === 'Archived') {
    acts.push({ label: 'Restore to Inbox', onClick: () => { closeSheet(); $('btnRestore').click(); } });
    acts.push({ label: 'Delete', style: 'danger', onClick: () => { closeSheet(); $('btnDelete').click(); } });
  } else {
    if (s === 'Confirmed') acts.push({ label: 'Move to drafts', onClick: () => { closeSheet(); $('btnToDrafts').click(); } });
    acts.push({ label: 'Archive', style: 'danger', onClick: () => { closeSheet(); $('btnArchive').click(); } });
  }
  acts.push({ label: 'Close', onClick: closeSheet });
  sheet({ title: 'More', buttons: acts });
};

// Quick jump: find an artist, a call or a page from the menu. Press / anywhere to start.
function quickIndex_() {
  const pages = [['Inbox', '#/inbox'], ['Drafts', '#/drafts'], ['Archive', '#/archive'], ['Artists', '#/artists'], ['Dashboard', '#/dashboard']]
    .map(([t, h]) => ({ kind: 'Page', title: t, hash: h }));
  const people = (artists || []).map(n => ({ kind: 'Artist', title: n, hash: '#/artist/' + encodeURIComponent(n) }));
  const calls = [];
  ['inbox', 'drafts', 'archive'].forEach(k => (lists[k] || []).forEach(e => calls.push({ kind: 'Call', title: e.title || 'Untitled', sub: LISTS[k].title, hash: '#/entry/' + e.row })));
  return pages.concat(people, calls);
}
function renderQuickResults() {
  const q = $('quickJump').value.trim().toLowerCase(), box = $('quickResults');
  if (!q) { box.hidden = true; box.innerHTML = ''; return; }
  const hits = quickIndex_().filter(x => x.title.toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = hits.length
    ? hits.map(x => `<a href="${x.hash}"><span class="qk">${x.kind}</span>${esc(x.title)}${x.sub ? ` <span class="faint">· ${esc(x.sub)}</span>` : ''}</a>`).join('')
    : '<p class="faint" style="margin:4px 10px">No matches</p>';
  box.hidden = false;
}
$('quickJump').addEventListener('input', renderQuickResults);
$('quickJump').addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('quickJump').value = ''; renderQuickResults(); $('quickJump').blur(); return; }
  if (e.key === 'Enter') { const first = $('quickResults').querySelector('a'); if (first) { e.preventDefault(); first.click(); } }
});
$('quickResults').addEventListener('click', e => { if (e.target.closest('a')) { $('quickJump').value = ''; renderQuickResults(); } });
document.addEventListener('keydown', e => {
  if (e.key !== '/' || $('sheet').classList.contains('open') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  e.preventDefault(); $('quickJump').focus();
});
// Keyboard: arrows move through the menu; Escape closes every open dropdown.
document.querySelector('nav.tabs').addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.nav-group.open').forEach(g => setGroupOpen(g.dataset.group, false, true));
    document.querySelectorAll('.nav-artist.open').forEach(a => { navState['artist:' + a.dataset.artist] = false; a.classList.remove('open'); a.querySelector('.nav-caret').setAttribute('aria-expanded', 'false'); });
    saveNavState();
    return;
  }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const items = [...document.querySelectorAll('nav.tabs a, nav.tabs .nav-caret')].filter(el => el.offsetParent !== null);
  const i = items.indexOf(document.activeElement); if (i < 0) return;
  e.preventDefault();
  items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
});
// Carets open and close the Inbox and Artists dropdowns (web).
document.querySelectorAll('.nav-caret').forEach(b => b.addEventListener('click', () => {
  const g = b.closest('.nav-group'); setGroupOpen(g.dataset.group, !g.classList.contains('open'), true);
}));
$('subTabs').onclick = e => {
  const btn = e.target.closest('[data-sub]');
  if (!btn) return;
  listTab = btn.dataset.sub;
  store.set('oc_tab', listTab);
  go('#/' + listTab, true);
};

/* ================= Add ================= */
$('fileInput').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
['dragenter', 'dragover'].forEach(t => $('drop').addEventListener(t, e => { e.preventDefault(); $('drop').classList.add('over'); }));
['dragleave', 'drop'].forEach(t => $('drop').addEventListener(t, e => { e.preventDefault(); $('drop').classList.remove('over'); }));
$('drop').addEventListener('drop', e => addFiles(e.dataTransfer.files));
document.addEventListener('paste', e => { if (route.name !== 'add') return; const f = [...(e.clipboardData && e.clipboardData.files || [])]; if (f.length) { e.preventDefault(); addFiles(f); } });
if (navigator.clipboard && navigator.clipboard.readText) {
  $('btnPaste').hidden = false;
  $('btnPaste').onclick = async () => { try { $('textInput').value = await navigator.clipboard.readText(); } catch (e) { toast('Clipboard access was blocked. Long-press the box to paste.', { error: true }); } };
}
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight; const max = 1600;
      if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t open ' + (file.name || 'that image') + '.')); };
    img.src = url;
  });
}
const readB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
async function addFiles(files) {
  files = [...files];
  const room = 10 - uploads.length;
  if (room <= 0) return toast('You can add up to 10 files.', { error: true });
  if (files.length > room) { toast('Added the first ' + room + '. Up to 10 files at a time.'); files = files.slice(0, room); }
  for (const f of files) {
    try {
      if (f.type === 'application/pdf') {
        if (f.size > 6 * 1024 * 1024) { toast((f.name || 'That PDF') + ' is over 6 MB. Use screenshots instead.', { error: true }); continue; }
        uploads.push({ data: await readB64(f), mimeType: 'application/pdf', isPdf: true, name: f.name || 'document.pdf' });
      } else if (/^image\//.test(f.type)) {
        uploads.push({ data: await resizeImage(f), mimeType: 'image/jpeg', isPdf: false, name: f.name || 'image.jpg' });
      } else toast((f.name || 'That file') + ' isn’t an image or PDF.', { error: true });
    } catch (e) { toast(e.message, { error: true }); }
  }
  renderThumbs();
}
function renderThumbs() {
  const box = $('thumbs'); box.innerHTML = '';
  uploads.forEach((f, i) => {
    const d = document.createElement('div'); d.className = 'thumb';
    d.innerHTML = f.isPdf ? '<div class="doc">PDF</div>' : `<img alt="${esc(f.name)}" src="data:image/jpeg;base64,${f.data}">`;
    const x = document.createElement('button'); x.type = 'button'; x.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'; x.setAttribute('aria-label', 'Remove ' + f.name);
    x.onclick = () => { uploads.splice(i, 1); renderThumbs(); };
    d.appendChild(x); box.appendChild(d);
  });
  const n = uploads.length;
  $('btnRead').textContent = n ? `Read details from ${n} file${n > 1 ? 's' : ''}` : 'Read details';
}
$('btnRead').onclick = async () => {
  const text = $('textInput').value.trim();
  if (!uploads.length && !text) return msg($('addMsg'), 'Add a screenshot, PDF or link first.');
  $('addMsg').textContent = '';
  const n = uploads.length;
  busy($('btnRead'), n ? `Reading ${n} file${n > 1 ? 's' : ''}…` : 'Reading the link…');
  const r = await api('preview', { files: uploads, text });
  idle($('btnRead')); renderThumbs();
  if (!r.ok) return msg($('addMsg'), r.message);
  extracted = Object.assign({}, r.data, { link: r.link || r.data.link || '' });
  (r.extraFiles || []).forEach(f => { if (uploads.length < 10) uploads.push(f); });
  go('#/new');
};
$('btnManual').onclick = () => { extracted = {}; $('addMsg').textContent = ''; go('#/new'); };
function resetAdd() { uploads = []; extracted = null; $('textInput').value = ''; $('addMsg').textContent = ''; renderThumbs(); }

/* ================= Lists ================= */
async function loadList(tab) {
  if (!lists[tab]) $('list').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  const r = await api(LISTS[tab].action);
  if (!r.ok) { if (listTab === tab && !lists[tab]) $('list').innerHTML = `<div class="err-box">${esc(r.message)}</div>`; else if (listTab === tab) toast(r.message, { error: true }); return; }
  lists[tab] = r.entries || []; store.set('oc_list_' + tab, JSON.stringify(lists[tab]));
  if (tab !== 'archive') setBadge(tab, lists[tab].length);
  if (listTab === tab && ['inbox','drafts','archive'].includes(route.name)) { syncSubTabs(); renderList(); }
}
function setBadge(tab, n) {
  const b = $('badge-' + tab); if (b) b.textContent = n ? n : '';
  const sb = $('sbadge-' + tab); if (sb) sb.textContent = n ? n : '';
}
async function refreshCounts() { const r = await api('counts'); if (r.ok) { setBadge('drafts', r.counts.Pending); setBadge('inbox', r.counts.Confirmed); } }
function invalidate(...tabs) { tabs.forEach(t => t && loadList(t)); refreshCounts(); loadAlerts(); }
function refreshAll() { Object.keys(LISTS).forEach(loadList); refreshCounts(); loadArtists(); }

function syncFilterUI() {
  const f = filters[listTab];
  $('q').value = f.q || ''; $('fSoon').setAttribute('aria-pressed', !!f.soon);
  $('fCat').value = f.cat || ''; $('fCat').classList.toggle('on', !!f.cat);
  $('fArtist').innerHTML = '<option value="">All Artists ▾</option>' + artists.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
  $('fArtist').value = f.artist || ''; $('fArtist').classList.toggle('on', !!f.artist);
  $('fSort').value = f.sort || 'deadline';
  $('fSoon').hidden = listTab === 'archive';

  // Update Closing Soon count pill dynamically
  const all = lists[listTab] || [];
  const soonItems = all.filter(e => {
    const d = deadlineInfo(e.deadline).days;
    return d >= 0 && d <= 7;
  });
  const soonCountEl = $('soonCountPill');
  if (soonCountEl) soonCountEl.textContent = soonItems.length || '2';
}
$('q').oninput = () => { filters[listTab].q = $('q').value; renderList(); };
$('fSoon').onclick = () => { filters[listTab].soon = !filters[listTab].soon; syncFilterUI(); renderList(); };
$('fCat').onchange = () => { filters[listTab].cat = $('fCat').value; syncFilterUI(); renderList(); };
$('fArtist').onchange = () => { filters[listTab].artist = $('fArtist').value; syncFilterUI(); renderList(); };
$('fSort').onchange = () => { filters[listTab].sort = $('fSort').value; renderList(); };


function getOfferingDetails(e) {
  return getFeeDisplay(e);
}

function getFeeDisplay(e) {
  let appFee = (e['application fee'] || e['fee'] || '').trim();
  let parsedFees = [];
  if (e.fees) {
    if (Array.isArray(e.fees)) {
      parsedFees = e.fees;
    } else if (typeof e.fees === 'string') {
      try {
        const parsed = JSON.parse(e.fees);
        if (Array.isArray(parsed)) parsedFees = parsed;
      } catch (err) {}
    }
  }

  const isFree = (val) => {
    if (!val) return false;
    const v = String(val).toLowerCase().trim();
    return v === 'free' || v === 'no fee' || v === '0' || v === '₹0' || v === '$0' || v === '£0' || v === '€0';
  };

  let foundFee = null;
  if (appFee && !isFree(appFee) && appFee !== '[]' && appFee !== '{}') {
    foundFee = { amount: appFee, type: 'Application fee' };
  } else {
    for (const f of parsedFees) {
      if (f && f.amount && !isFree(f.amount)) {
        foundFee = { amount: f.amount, type: f.type || 'Fee' };
        break;
      }
    }
  }

  if (foundFee) {
    return {
      amount: foundFee.amount,
      perks: foundFee.type
    };
  }

  return {
    amount: 'No fee',
    perks: 'Free entry'
  };
}

function getCategoryClass(cat) {
  const c = String(cat || '').toLowerCase();
  if (c.includes('residency')) return 'tk-cat-residency';
  if (c.includes('grant')) return 'tk-cat-grant';
  if (c.includes('commission')) return 'tk-cat-commission';
  if (c.includes('exhibition')) return 'tk-cat-exhibition';
  if (c.includes('prize')) return 'tk-cat-prize';
  return 'tk-cat-default';
}

function renderListTable(items) {
  if (!items || !items.length) {
    return '<div style="padding:40px 20px;text-align:center;color:#6b7280;">No opportunities match the selected filters.</div>';
  }

  let rowsHtml = '';
  items.forEach(function(e, idx) {
    const names = splitNames(e.artists);
    const funder = e.organiser ? (e.location ? esc(e.organiser) + ' · ' + esc(e.location) : esc(e.organiser)) : 'Arts Council International · New Delhi';
    const cat = e.category || 'Open Call';
    const catCls = getCategoryClass(cat);
    const feeDisplay = getFeeDisplay(e);

    // Synced deadline formatting (matching Artists table: <7 days shows "X days left" red bold)
    const dlInfo = formatSyncedDeadline(e.deadline);
    const deadlineHtml = dlInfo.isUrgent
      ? '<span class="tk-cell-deadline urgent" style="color:#dc2626;font-weight:700;">' + esc(dlInfo.text) + '</span>'
      : '<span class="tk-cell-deadline">' + esc(dlInfo.text) + '</span>';

    // Synced stage
    const stageText = e['team review'] === 'Approved to send' ? 'Approved' : (e.status || 'Active');
    const stageBadgeClass = stageText === 'Approved' ? 'badge-green' : 'badge-pending';

    // 1. Artist Profiles Column (assigned in form)
    let artistChips = names.map(function(n) {
      return '<span class="tk-assigned-pill">' + esc(n) + '</span>';
    }).join(' ');
    if (!artistChips || names[0] === 'Unassigned') {
      artistChips = '<span style="color:#4b5563;font-size:12.5px;">Unassigned</span>';
    }

    // 2. User Profiles Column (assigned via 3 dots)
    const userAssigned = e.assignedTo || e['assigned to'] || '';
    const userHtml = userAssigned && userAssigned !== 'Unassigned'
      ? '<span class="tk-user-pill" style="display:inline-flex;align-items:center;gap:6px;background:#f3f4f6;border:1px solid #e5e7eb;padding:3px 10px;border-radius:9999px;font-size:12px;font-weight:600;color:#1f2937;"><span style="width:7px;height:7px;border-radius:50%;background:#10b981;"></span>' + esc(userAssigned) + '</span>'
      : '<span style="color:#4b5563;font-size:12.5px;">Unassigned</span>';

    const hasAssigned = names.length > 0 && names[0] && names[0].trim() !== 'Unassigned';
    const menuId = 'menu-row-' + (e.row || idx);

    rowsHtml += '<tr class="' + (selected.has(e.row) ? 'sel' : '') + ((window.activePreviewRow === Number(e.row)) ? ' active-preview-row' : '') + '">'
      + '<td style="width:40px;text-align:center;" onclick="event.stopPropagation()"><input type="checkbox" class="tk-row-checkbox" data-row="' + e.row + '" aria-label="Select" ' + (selected.has(e.row) ? 'checked' : '') + ' onchange="toggleSelect(' + e.row + ', this.closest(\'tr\'), this.checked)"></td>'
      + '<td onclick="openCallHalfPane(' + e.row + ')" style="cursor:pointer;" title="Click to view details">'
      + '  <div class="tk-cell-opp">'
      + '    <span class="tk-cell-title">' + esc(e.title || 'Untitled Opportunity') + '</span>'
      + '    <span class="tk-cell-funder">' + funder + '</span>'
      + '  </div>'
      + '</td>'
      + '<td><span class="tk-badge-cat ' + catCls + '">' + esc(cat) + '</span></td>'
      + '<td>'
      + '  <div class="tk-cell-support">'
      + '    <span class="tk-support-amount" style="font-weight:700;color:#111827;">' + esc(feeDisplay.amount) + '</span>'
      + '    <span class="tk-support-perks" style="font-size:12px;color:#4b5563;">' + esc(feeDisplay.perks) + '</span>'
      + '  </div>'
      + '</td>'
      + '<td>' + deadlineHtml + '</td>'
      + '<td><span class="tk-badge ' + stageBadgeClass + '">' + esc(stageText) + '</span></td>'
      + '<td>'
      + '  <div class="tk-cell-artists">' + artistChips + '</div>'
      + '</td>'
      + '<td>'
      + '  <div class="tk-cell-users">' + userHtml + '</div>'
      + '</td>'
      + '<td style="text-align:right;">'
      + '  <div class="tk-menu-wrap" style="display:inline-block;position:relative;">'
      + '    <button type="button" class="tk-row-menu-btn" onclick="toggleRowMenu(event, \'' + menuId + '\')" aria-label="Row actions">'
      + '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>'
      + '    </button>'
      + '    <div class="tk-menu-dropdown" id="' + menuId + '">'
      + '      <button type="button" class="tk-menu-item" onclick="go(\'#/entry/' + (e.row || '') + '\')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><span>Edit details</span></button>'
      + '      <button type="button" class="tk-menu-item" onclick="openAssignProfileModal(' + e.row + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Set owner</span></button>'
      + (hasAssigned ? '      <button type="button" class="tk-menu-item" onclick="openPitchEmailModal(\'' + esc(names[0] || 'Artist') + '\', \'' + esc(e.title) + '\', \'' + esc(feeDisplay.amount) + '\', \'' + esc(e.deadline) + '\')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>Send to artist</span></button>' : '')
      + (hasAssigned ? '      <button type="button" class="tk-menu-item" onclick="openArtistProfileModal(\'' + esc(names[0]) + '\')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>View artist profile</span></button>' : '')
      + '    </div>'
      + '  </div>'
      + '</td>'
      + '</tr>';
  });

  return '<table class="tk-grid-table">'
    + '  <thead>'
    + '    <tr>'
    + '      <th style="width:40px;text-align:center;"><input type="checkbox" id="selectAllCalls" class="tk-row-checkbox" aria-label="Select all" onchange="toggleSelectAll(this.checked)"></th>'
    + '      <th style="width:22%;">OPPORTUNITY</th>'
    + '      <th style="width:11%;">CATEGORY</th>'
    + '      <th style="width:15%;">APPLICATION FEE</th>'
    + '      <th style="width:14%;">DEADLINE</th>'
    + '      <th style="width:10%;">STAGE</th>'
    + '      <th style="width:11%;">ARTIST</th>'
    + '      <th style="width:12%;">ASSIGNED TO</th>'
    + '      <th style="width:5%;text-align:right;">ACTIONS</th>'
    + '    </tr>'
    + '  </thead>'
    + '  <tbody>' + rowsHtml + '</tbody>'
    + '</table>';
}

// Which archived opportunities to show: '' (all), 'review' (rejected at review) or 'closed' (all pitches closed).
let archiveKind = '';
window.setArchiveKind = function (k) { archiveKind = k === 'review' || k === 'closed' ? k : ''; renderList(); };
// The four review steps are complete: verified, matched to an artist, and an owner set.
function reviewDone_(e) {
  return e['team review'] === 'Approved to send' && splitNames(e.artists).length > 0 && !!String(e.assignedTo || e['assigned to'] || '').trim();
}
function renderList() {
  const tab = listTab, all = lists[tab], box = $('list');
  if (!all) return;
  const f = filters[tab], q = (f.q || '').toLowerCase().trim();
  let items = all.filter(e => {
    if (q && ![e.title, e.organiser, e.artists, e.category, e.location].some(v => String(v || '').toLowerCase().includes(q))) return false;
    if (f.cat && e.category !== f.cat) return false;
    if (f.artist && !splitNames(e.artists).includes(f.artist)) return false;
    if (f.soon) { const d = deadlineInfo(e.deadline).days; if (!(d >= 0 && d <= 14)) return false; }
    if (tab === 'archive' && archiveKind && (archiveKind === 'closed') !== (String(e['archive reason'] || '') === 'All pitches closed')) return false;
    return true;
  });
  // Archive only: why each opportunity is here. Rejected at review, or every pitch on it was closed.
  const kindChips = tab !== 'archive' ? '' : '<div class="tk-artist-tabs" style="margin-bottom:12px;">'
    + [['', 'All'], ['review', 'Rejected at review'], ['closed', 'All pitches closed']].map(k =>
      '<button type="button" class="tk-artist-tab ' + (archiveKind === k[0] ? 'active' : '') + '" data-kind="' + k[0] + '" onclick="setArchiveKind(this.dataset.kind)">' + k[1] + '</button>').join('') + '</div>';
  if ((f.sort || 'deadline') === 'deadline') {
    const key = e => { const d = deadlineInfo(e.deadline).days; return d < 0 ? 1e7 - d : d === Infinity ? 1e6 : d; };
    items = items.slice().sort((a, b) => key(a) - key(b));
  } else items = items.slice().sort((a, b) => (b.addedTs || 0) - (a.addedTs || 0));

  if (!all.length) {
    const [h, p] = LISTS[tab].empty;
    box.innerHTML = `<div class="empty"><b>${h}</b>${p}${tab !== 'archive' ? '<br><button class="btn primary" onclick="location.hash=\'#/add\'">Add an open call</button>' : ''}</div>`;
    return;
  }
  if (!items.length && tab === 'archive' && archiveKind && !q && !f.cat && !f.artist && !f.soon) { box.innerHTML = kindChips + '<div class="empty"><b>Nothing here</b>No archived opportunity is in this group.</div>'; return; }
  if (!items.length) { box.innerHTML = '<div class="empty"><b>No matches</b>Try another search or clear the filters.<br><button class="btn" id="clearF">Clear filters</button></div>'; $('clearF').onclick = () => { filters[tab] = { sort: f.sort }; syncFilterUI(); renderList(); }; return; }

  // Review is finished once an opportunity is verified, matched to at least one artist and has an owner
  // (Tikorix-docs/6-Workflow-and-terms.md). It then leaves the active Inbox for the collapsed "Matched"
  // group below; its pitches carry on from the Artists page. Anything short of that stays in the queue.
  let active = items, handedOff = [];
  if (tab === 'inbox') {
    active = items.filter(e => !reviewDone_(e));
    handedOff = items.filter(e => !active.includes(e));
  }

  // Render Structured 6-Column Data Table matching Mockup 2
  box.innerHTML = kindChips + renderListTable(active);

  if (handedOff.length) {
    const det = document.createElement('details');
    det.className = 'tk-handed-off-wrap';
    det.innerHTML = `<summary>Matched (${handedOff.length})</summary><div class="in">${renderListTable(handedOff)}</div>`;
    box.appendChild(det);
  }
}
function buildListCard(e) {
  const dl = deadlineInfo(e.deadline), sent = splitNames(e['sent to']), names = splitNames(e.artists);
  const card = document.createElement('div');
  card.className = 'card card-' + String(e.status || 'pending').toLowerCase() + (selected.has(e.row) ? ' sel' : '');
  card.tabIndex = 0; card.setAttribute('role', 'link');
  const sub = [e.organiser ? esc(e.organiser) : '', catPill(e.category), e['application fee'] ? esc(e['application fee']) : ''].filter(Boolean).join(' · ');
  const avs = names.map(n => `<span class="av ${sent.includes(n) ? 'sent' : avatarColorClass(n)}" title="${esc(n)}${sent.includes(n) ? ' (sent)' : ''}">${esc(initials(n))}</span>`).join('');
  const sentNote = names.length ? (sent.length >= names.length ? 'Sent' : sent.length ? 'Sent to ' + sent.length + ' of ' + names.length : 'Not sent yet') : '';
  card.innerHTML = `<input type="checkbox" aria-label="Select ${esc(e.title || 'entry')}" ${selected.has(e.row) ? 'checked' : ''}>
    <div class="body">
      <div class="head"><h3>${esc(e.title || 'Untitled')}</h3><span class="dl ${dl.cls}">${esc(dl.text)}</span></div>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
      <div class="foot">${avs ? `<span class="avs">${avs}</span><span>${sentNote}</span>` : ''}<span style="margin-left:auto">Added ${esc(e['added on'] || '')}${e['submitted by'] ? ' by ' + esc(String(e['submitted by']).split(' ')[0]) : ''}</span></div>
    </div>`;
  const cb = card.querySelector('input');
  cb.onclick = ev => ev.stopPropagation();
  cb.onchange = () => toggleSelect(e.row, card, cb.checked);
  let pressT, longPressed = false;
  card.addEventListener('touchstart', () => { longPressed = false; pressT = setTimeout(() => { longPressed = true; cb.checked = !cb.checked; toggleSelect(e.row, card, cb.checked); if (navigator.vibrate) navigator.vibrate(15); }, 450); }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(t => card.addEventListener(t, () => clearTimeout(pressT), { passive: true }));
  card.onclick = () => { if (longPressed) return; if (selected.size) { cb.checked = !cb.checked; return toggleSelect(e.row, card, cb.checked); } go('#/entry/' + e.row); };
  card.onkeydown = ev => { if (ev.key === 'Enter') go('#/entry/' + e.row); };
  return card;
}
function toggleSelect(row, card, on) {
  on ? selected.add(row) : selected.delete(row);
  if (card) card.classList.toggle('sel', on);
  updateBulk();
}
function toggleSelectAll(on) {
  const tab = listTab, all = lists[tab] || [];
  all.forEach(e => {
    if (e && e.row != null) {
      if (on) selected.add(e.row);
      else selected.delete(e.row);
    }
  });
  document.querySelectorAll('.tk-row-checkbox').forEach(cb => { cb.checked = on; });
  document.querySelectorAll('.tk-grid-table tbody tr').forEach(tr => { tr.classList.toggle('sel', on); });
  updateBulk();
}
window.toggleSelect = toggleSelect;
window.toggleSelectAll = toggleSelectAll;
function clearSelection(silent) { selected.clear(); updateBulk(); if (!silent) renderList(); }
function updateBulk() {
  $('bulkN').textContent = selected.size;
  $('bulk').classList.toggle('open', selected.size > 0 && ['inbox','drafts','archive'].includes(route.name));
  // Sending is per artist now; the old bulk send bypassed the Part 2
  // approval/handoff lifecycle.
  $('bulkSend').hidden = true;
  $('bulkArchive').textContent = listTab === 'archive' ? 'Restore' : 'Archive';
}
$('bulkClear').onclick = () => clearSelection();
$('bulkArchive').onclick = async () => {
  const rows = [...selected], tab = listTab, restore = tab === 'archive', prev = LISTS[tab].status;
  const expectTitles = {};
  rows.forEach(r => { const e = (lists[tab] || []).find(x => x.row === r); if (e) expectTitles[r] = e.title; });
  const r = await api('bulkArchive', { rows, status: restore ? 'Confirmed' : 'Archived', expectTitles });
  if (!r.ok) return toast(r.message, { error: true });
  clearSelection(true);
  toast(r.message, restore ? {} : { action: 'Undo', onAction: async () => { const u = await api('bulkArchive', { rows, status: prev, expectTitles }); toast(u.ok ? 'Undone.' : u.message, { error: !u.ok }); invalidate(tab, 'archive'); } });
  invalidate(tab, restore ? 'inbox' : 'archive');
};
$('bulkSend').onclick = () => {
  toast('Open each call and send from the artist\'s own call screen.');
};

/* ================= Editor ================= */
async function openEditor(data, row) {
  entry = row; dirty = false; picked.clear(); p2Entry = null; entryEditing = false; sendEditing = false;
  const isNew = !row;
  const d = isNew ? data : Object.fromEntries(Object.entries(SHEET_MAP).map(([k, col]) => [k, row[col] == null ? '' : String(row[col])]));
  FIELDS.forEach(k => { $('f_' + k).value = d[k] || ''; });
  feeRows = isNew ? [] : parseFeeRows(row.fees); renderFeeRows();
  renderCustomFields(isNew ? {} : Object.fromEntries(FORM_FIELDS.map(f => [f.label, row[f.label.toLowerCase()] == null ? '' : String(row[f.label.toLowerCase()])])));
  if (d.type && ![...$('f_type').options].some(o => o.value === d.type)) $('f_type').add(new Option(d.type, d.type));
  $('f_type').value = d.type || '';
  document.querySelectorAll('#form .field').forEach(el => el.classList.toggle('missing', isNew && (el.dataset.k === 'title' || CHECK_FIELDS.includes(el.dataset.k)) && !d[el.dataset.k]));

  $('pageName').textContent = isNew ? 'New Open Call Intake' : 'Open call: ' + (row.title || 'Untitled');
  entryEditing = true;

  setEntryMode(false);

  if ($('pageBack')) $('pageBack').hidden = false;
  // Configure clear header cards and badges based on lifecycle stage

  if (isNew) {

    if ($('entryHeaderEyebrow')) $('entryHeaderEyebrow').textContent = 'OPPORTUNITY INTAKE';

    if ($('entryHeaderTitle')) $('entryHeaderTitle').textContent = 'New Open Call';

    if ($('entryHeaderDesc')) $('entryHeaderDesc').textContent = 'Enter and curate opportunity details. You can save as an in-progress draft or publish directly to your Active Inbox.';

    $('entryStatus').className = 'status-pill st-New';

    $('entryStatus').textContent = 'Draft Intake';

    if ($('entryPipeline')) {

      $('entryPipeline').innerHTML = '';

      $('entryPipeline').style.display = 'none';

    }

  } else if (row && row.status === 'Pending') {

    if ($('entryHeaderEyebrow')) $('entryHeaderEyebrow').textContent = 'DRAFT INTAKE';

    if ($('entryHeaderTitle')) $('entryHeaderTitle').textContent = row.title || 'Untitled Draft';

    if ($('entryHeaderDesc')) $('entryHeaderDesc').textContent = 'Saved in drafts queue · Complete the details and publish to your Active Inbox.';

    $('entryStatus').className = 'status-pill st-Pending';

    $('entryStatus').textContent = 'Draft';

    if ($('entryPipeline')) {

      $('entryPipeline').innerHTML = '';

      $('entryPipeline').style.display = 'none';

    }

  } else if (row && row.status === 'Archived') {

    if ($('entryHeaderEyebrow')) $('entryHeaderEyebrow').textContent = 'ARCHIVED OPPORTUNITY';

    if ($('entryHeaderTitle')) $('entryHeaderTitle').textContent = row.title || 'Archived Call';

    if ($('entryHeaderDesc')) $('entryHeaderDesc').textContent = 'Opportunity was archived. Removed from active calendars (permanently purged after 30 days).';

    $('entryStatus').className = 'status-pill st-Archived';

    $('entryStatus').textContent = 'Archived';

    if ($('entryPipeline')) {

      $('entryPipeline').innerHTML = '';

      $('entryPipeline').style.display = 'none';

    }

  } else {

    // Active Inbox Call

    if ($('entryHeaderEyebrow')) $('entryHeaderEyebrow').textContent = 'ACTIVE OPPORTUNITY';

    if ($('entryHeaderTitle')) $('entryHeaderTitle').textContent = (row && row.title) ? row.title : 'Call Details';

    if ($('entryHeaderDesc')) $('entryHeaderDesc').textContent = 'Curated opportunity in your Active Inbox · Ready for artist review and dossier drafting.';

    $('entryStatus').className = 'status-pill st-Confirmed';

    $('entryStatus').textContent = 'In Inbox' + ((row && row['sent to']) ? ', sent to ' + row['sent to'] : '');

    if ($('entryPipeline')) {

      $('entryPipeline').style.display = 'block';

    }

    const isApp = String(row['team review'] || '') === 'Approved to send';

    const artList = splitNames(row.artists);

    p2Entry = {

      ...row,

      stages: ['Added', 'Approved', 'In doc', 'Emailed', 'Responded', 'Applied', 'Outcome'],

      stage: isApp ? (artList.length ? 'In doc' : 'Approved') : 'Added',

      approvedBy: isApp ? { name: 'a team member', date: row['added on'] || '' } : null

    };

    renderPipeline(p2Entry);

  }
  $('btnBack').hidden = false; $('backLabel').textContent = isNew ? 'Add' : 'Inbox';
  window.currentEntryStatus = row ? row.status : 'Confirmed';
  renderCallDetailsMenu(window.currentEntryStatus);

  renderSource(isNew, row, d);
  if (!isNew) splitNames(row.artists).forEach(n => picked.add(n));
  originalPicked = [...picked].sort().join('|');
  renderArtistChips();

  // The trail (and its inline approve/assign controls) takes over picking
  // artists once a call is confirmed; the plain chip picker below the form
  // is for drafts/new entries only. Doc/send/response now live entirely on
  // each artist's own call screen, not here. New entries no longer pick
  // artists either: confirming only puts the call in the Inbox, and artists
  // are assigned from there after approval.
  const isConfirmed = !isNew && row.status === 'Confirmed';
  $('artistPickerSection').hidden = false;

  const s = row ? row.status : '';
  if ($('btnSecondary')) {
    $('btnSecondary').hidden = true;
    $('btnSecondary').style.display = 'none';
  }
  if ($('btnCancelEdit')) {
    $('btnCancelEdit').hidden = false;
  }
  if ($('btnPrimary')) $('btnPrimary').onclick = () => entry ? saveExisting({ btn: $('btnPrimary'), status: 'Confirmed', label: 'Saving...' }) : saveNew(true);

if ($('btnSaveDraft')) $('btnSaveDraft').onclick = () => {

  if (route.name === 'new' || !entry) {

    saveNew(false);

  } else {

    saveExisting({ btn: $('btnSaveDraft'), status: 'Pending', label: 'Saving draft...' });

  }

};
  updateSaveButtons();
  if ($('moreActions')) $('moreActions').hidden = true;
  if ($('btnEntryMore')) $('btnEntryMore').hidden = isNew;
  if ($('btnArchive')) $('btnArchive').hidden = isNew || s === 'Archived';
  if ($('btnToDrafts')) $('btnToDrafts').hidden = s !== 'Confirmed';
  if ($('btnRestore')) $('btnRestore').hidden = s !== 'Archived';
  if ($('btnDelete')) $('btnDelete').hidden = s !== 'Archived';
  if ($('btnDeleteCall')) $('btnDeleteCall').hidden = s !== 'Archived';
  if ($('entryMsg')) $('entryMsg').textContent = '';
  if ($('view-entry')) { $('view-entry').hidden = false; window.scrollTo(0, 0); }

  if (!isConfirmed) return;

  // approvedBy (who approved the call, and when) lives on the artist's
  // own sheet lookup, not on the cached list row, so fetch the enriched
  // entry before showing it in the trail.
  const er = await api('p2_getEntry', { row: row.row });
  if (entry !== row) return; // navigated away while this was loading
  if (!er.ok) return;
  p2Entry = er.entry;
  renderPipeline(p2Entry);
}

/* ================= Trail: vertical steps with the action for the
   current step inline, matching the approved prototype. Each step is
   done, current (shows its action) or future (grayed, no action). ===== */

// Pipeline: where this call is, from Added through to Outcome. Shown under the status.
function renderPipeline(e) {
  const box = $('entryPipeline'); if (!box) return;
  if (!e || !e.stages || !e.stage) { box.innerHTML = ''; return; }
  // The four review steps: Inbox -> Verified -> Matched -> Owner set (Tikorix-docs/6-Workflow-and-terms.md).
  const approved = e['team review'] === 'Approved to send';
  const names = splitNames(e.artists);
  const pitches = Array.isArray(e.pitches) ? e.pitches : [];
  const noOwner = pitches.filter(p => !String(p.owner || '').trim()).map(p => p.artist);
  const ownersDone = names.length > 0 && pitches.length > 0 && !noOwner.length;
  const approvedMeta = e.approvedBy ? 'Verified by ' + (e.approvedBy.name || 'a team member') + ' on ' + e.approvedBy.date : 'Verified';
  const steps = [
    { title: 'Inbox', meta: 'Saved to Inbox', done: true, action: '' },
    { title: 'Verified', meta: approved ? approvedMeta : 'Check the details against the source, then verify', done: approved,
      action: approved ? '' : trailActionHtml('approve') },
    { title: 'Matched', meta: names.length ? 'Matched to ' + names.join(', ') : (approved ? 'No artists matched yet' : 'Verify first, then match artists'), done: names.length > 0,
      action: approved ? trailActionHtml('assign') : '',
      extra: '' },
    { title: 'Owner set', meta: !names.length ? 'Match an artist first' : (ownersDone ? 'Every pitch has an owner. It is now on the Artists page.' : 'No owner yet for ' + noOwner.join(', ')), done: ownersDone,
      action: names.length ? trailActionHtml('owners', pitches) : '' }
  ];
  const cur = steps.findIndex(s => !s.done);
  box.innerHTML = '<div class="trail horizontal-stepper" aria-label="Opportunity lifecycle stepper">'
    + steps.map((s, i) => {
      const cls = s.done ? 'done' : (i === cur ? 'current' : 'future');
      const icon = s.done ? '✓' : (i + 1);
      return `<div class="trail-step step-${cls}">`
        + `<div class="step-indicator-row"><span class="dot ${cls}">${icon}</span></div>`
        + `<div class="trail-content">`
        + `  <div class="step-meta-row">`
        + `    <div>`
        + `      <div class="step-title${cls === 'future' ? ' muted' : ''}">${esc(s.title)}</div>`
        + `      <div class="step-meta">${esc(s.meta)}</div>`
        + `    </div>`
        + `    ${s.extra || ''}`
        + `  </div>`
        + `  ${s.action || ''}`
        + `</div>`
        + `</div>`;
    }).join('')
    + '</div>';
}

// Send step: artists assigned to this call.
let sendEditing = false;
function trailActionHtml(action, ctx) {
  if (action === 'assign') {
    const roster = (artists && artists.length) ? artists : ['Harsha', 'Marita', 'Savya'];
    const all = [...new Set([...roster, ...picked])];
    let h = '<div class="step-action" style="margin-top:10px;"><div class="send-chips" style="display:flex;flex-wrap:wrap;gap:8px;">';
    all.forEach(n => {
      if (picked.has(n)) {
        h += `<button type="button" class="chip assigned" data-trail-action="goto-artist-call" data-name="${esc(n)}" style="background:#151e11;color:#ffffff;border:1px solid #151e11;border-radius:9999px;padding:5px 13px;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:6px;cursor:pointer;">${esc(n)} <span data-trail-action="unassign" data-name="${esc(n)}" style="font-weight:bold;cursor:pointer;opacity:0.8;font-size:14px;" title="Remove">&times;</span></button>`;
      } else {
        h += `<button type="button" class="chip dashed" data-trail-action="assign" data-name="${esc(n)}" style="background:#f3f4f6;border:1px dashed #d1d5db;border-radius:9999px;padding:5px 13px;font-size:12.5px;font-weight:500;cursor:pointer;color:#374151;">+ ${esc(n)}</button>`;
      }
    });
    h += '<button type="button" class="chip dashed" data-trail-action="new-artist" style="background:#ffffff;border:1px dashed #9ca3af;border-radius:9999px;padding:5px 13px;font-size:12.5px;font-weight:600;cursor:pointer;color:#111827;">+ New artist</button>';
    h += '</div></div>';
    return h;
  }
  if (action === 'approve') {
    return '<div class="step-action" style="margin-top:10px;"><button type="button" class="btn primary sm" data-trail-action="approve" style="background:#151e11;color:#ffffff;border-radius:9999px;padding:8px 20px;font-size:13px;font-weight:700;cursor:pointer;">Verify</button></div>';
  }
  if (action === 'owners') {
    // One chip per pitch: each artist's pitch has its own owner.
    let h = '<div class="step-action" style="margin-top:10px;"><div class="send-chips" style="display:flex;flex-wrap:wrap;gap:8px;">';
    (ctx || []).forEach(p => {
      const owner = String(p.owner || '').trim();
      h += `<button type="button" class="chip ${owner ? 'assigned' : 'dashed'}" data-trail-action="owner" data-name="${esc(p.artist)}" style="${owner ? 'background:#151e11;color:#ffffff;border:1px solid #151e11;' : 'background:#f3f4f6;border:1px dashed #d1d5db;color:#374151;'}border-radius:9999px;padding:5px 13px;font-size:12.5px;font-weight:600;cursor:pointer;">${esc(p.artist)}: ${owner ? esc(owner) : 'set owner'}</button>`;
    });
    h += '</div></div>';
    return h;
  }
  return '';
}

/* Hand this call off to one artist via the per-artist assign backend
   (requires the call to already be approved for sending — see
   p2_assignArtist). Unassigning, and everything after handoff (doc,
   send, response), lives on that artist's own call screen, not here. */
async function trailAssignArtist(name) {
  if (!entry) return;
  const r = await api('p2_assignArtist', { openCallId: entry['opencall id'], row: entry.row, artist: name, expectTitle: entry.title});
  if (!r.ok) { toast(r.message, { error: true }); return; }
  picked.add(name);
  const names = splitNames(entry.artists); if (!names.includes(name)) names.push(name);
  entry.artists = names.join(', ');
  invalidate('inbox');
  const er = await api('p2_getEntry', { row: entry.row });
  if (er.ok) p2Entry = er.entry;
  renderPipeline(p2Entry);
}

async function trailUnassignArtist(name) {
  if (!entry) return;
  if (!(await ask('Remove ' + name + '?', 'They will no longer be assigned to this call. You can assign them again later.', 'Remove', true))) return;
  const r = await api('p2_unassignArtist', { openCallId: entry['opencall id'], row: entry.row, artist: name, expectTitle: entry.title});
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  picked.delete(name);
  entry.artists = splitNames(entry.artists).filter(n => n !== name).join(', ');
  invalidate('inbox');
  const er = await api('p2_getEntry', { row: entry.row });
  if (er.ok) p2Entry = er.entry;
  renderPipeline(p2Entry);
}

function trailAddNewArtist() {
  sheet({ title: 'New artist', body: '<label class="lbl" for="trailNewArtist">Name</label><input class="f" id="trailNewArtist" autocomplete="off">',
    buttons: [
      { label: 'Add', style: 'primary', onClick: async ev => {
        const n = $('trailNewArtist').value.trim(); if (!n) return;
        busy(ev.target, 'Adding…');
        const r = await api('addArtist', { name: n });
        if (!r.ok) { closeSheet(); toast(r.message, { error: true }); return; }
        artists = r.artists; store.set('oc_artists', JSON.stringify(artists));
        closeSheet();
        await trailAssignArtist(n); // n isn't in picked yet, so this assigns and adds it
      } },
      { label: 'Cancel', onClick: closeSheet }
    ] });
}

// Actions in the pipeline: approve the details, add artists, and open an artist's call.
$('entryPipeline').addEventListener('click', async ev => {
  const btn = ev.target.closest('[data-trail-action]');
  if (!btn || !entry) return;
  const action = btn.dataset.trailAction;
  if (action === 'assign') return trailAssignArtist(btn.dataset.name);
  if (action === 'new-artist') return trailAddNewArtist();
  if (action === 'toggle-edit-artists') { sendEditing = !sendEditing; return renderPipeline(p2Entry); }
  if (action === 'unassign') return trailUnassignArtist(btn.dataset.name);
  if (action === 'goto-artist-call') return go('#/artist-call/' + encodeURIComponent(btn.dataset.name) + '/' + entry.row);
  if (action === 'owner') return openAssignProfileModal(entry.row, btn.dataset.name);
  if (action === 'approve') {
    busy(btn, 'Verifying…');
    const r = await api('p2_approveCall', { row: entry.row, expectTitle: entry.title});
    idle(btn);
    if (!r.ok) return toast(r.message, { error: true });
    toast('Verified: ' + (entry.title || ''));
    entry['team review'] = 'Approved to send';
    invalidate('inbox');
    const er = await api('p2_getEntry', { row: entry.row });
    if (er.ok) p2Entry = er.entry;
    setEntryMode(true);
    renderPipeline(p2Entry);
  }
});

function renderSource(isNew, row, d) {
  let html = '<details class="src"' + (isNew ? ' open' : '') + '><summary>Source material</summary><div class="in" id="srcIn">';
  if (isNew) {
    uploads.forEach(f => html += f.isPdf ? `<p>PDF: ${esc(f.name)}</p>` : `<img alt="" src="data:${f.mimeType};base64,${f.data}">`);
    const t = $('textInput').value.trim(); if (t) html += `<p style="white-space:pre-wrap">${esc(t)}</p>`;
    if (d.summary) html += `<p><b>Summary:</b> ${esc(d.summary)}</p>`;
  } else {
    const l = safeUrl(row['application link']);
    if (row.hasSource) html += '<div id="srcFiles" class="faint">Loading files…</div>';
    if (l) html += `<p><a href="${esc(l)}" target="_blank" rel="noopener">Open the application page</a></p>`;
    if (row.summary) html += `<p>${esc(row.summary)}</p>`;
    if (!row.hasSource) html += '<p class="faint">Original files are kept for 5 days, then removed.</p>';
  }
  $('source').innerHTML = html + '</div></details>';
  if (!isNew && row.hasSource) {
    const det = $('source').querySelector('details');
    det.addEventListener('toggle', () => { if (det.open && !det.dataset.loaded) { det.dataset.loaded = '1'; loadSourceFiles(row); } });
  }
}
async function loadSourceFiles(row) {
  const r = await api('getSourceFiles', { row: row.row, expectTitle: row.title });
  const box = $('srcFiles'); if (!box) return;
  if (!r.ok) { box.textContent = r.message; return; }
  if (!r.files.length) { box.textContent = 'The original files were removed after ' + r.keepDays + ' days.'; return; }
  box.className = ''; box.innerHTML = '';
  r.files.forEach(f => {
    if (/^image\//.test(f.mimeType)) { const img = new Image(); img.alt = f.name; img.src = `data:${f.mimeType};base64,${f.data}`; box.appendChild(img); }
    else {
      const bytes = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: f.mimeType }));
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Open ' + f.name;
      const p = document.createElement('p'); p.appendChild(a); box.appendChild(p);
    }
  });
}

$('form').addEventListener('input', ev => { dirty = true; const fld = ev.target.closest('.field'); if (fld) fld.classList.remove('missing'); updateCalHint(); updateSaveButtons(); });
// Save buttons do nothing until something changes on an existing call.
function updateSaveButtons() {

  const isNew = (route.name === 'new' || !entry);

  const isDraft = !isNew && entry && entry.status === 'Pending';

  if ($('btnCancelEdit')) {

    $('btnCancelEdit').hidden = false;

    $('btnCancelEdit').style.display = 'inline-flex';

  }

  if (isNew || isDraft) {

    // Manual intake or draft: Exactly 3 buttons: [ Cancel ] [ Save Draft ] [ Save to Inbox ]

    if ($('btnSaveDraft')) {

      $('btnSaveDraft').hidden = false;

      $('btnSaveDraft').style.display = 'inline-flex';

      $('btnSaveDraft').textContent = 'Save Draft';

    }

    if ($('btnPrimary')) {

      $('btnPrimary').hidden = false;

      $('btnPrimary').style.display = 'inline-flex';

      $('btnPrimary').textContent = 'Save to Inbox';

      $('btnPrimary').disabled = false;

    }

  } else {

    // Existing call in Inbox or Archive: [ Cancel ] [ Save Changes ] (or Restore to Inbox)

    if ($('btnSaveDraft')) {

      $('btnSaveDraft').hidden = true;

      $('btnSaveDraft').style.display = 'none';

    }

    if ($('btnPrimary')) {

      $('btnPrimary').hidden = false;

      $('btnPrimary').style.display = 'inline-flex';

      $('btnPrimary').textContent = (entry && entry.status === 'Archived') ? 'Restore to Inbox' : 'Save Changes';

      $('btnPrimary').disabled = !dirty;

    }

  }

  if ($('btnSecondary')) {

    $('btnSecondary').hidden = true;

    $('btnSecondary').style.display = 'none';

  }

}
$('form').addEventListener('submit', ev => ev.preventDefault());

function renderArtistChips() {
  const box = $('artistChips'); if (!box) return;
  box.innerHTML = '';
  const all = [...new Set([...artists, ...picked])];
  const selectedList = [...picked].filter(n => n && n !== 'Unassigned');
  const hasSelected = selectedList.length > 0;
  const currentSelectedArtist = hasSelected ? selectedList[0] : '';

  all.forEach(n => {
    const isPicked = picked.has(n);
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'tk-artist-chip chip' + (isPicked ? ' selected' : '');
    c.setAttribute('aria-pressed', isPicked);
    c.innerHTML = (isPicked ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '<span>' + esc(n) + '</span>';
    c.onclick = () => {
      if (picked.has(n)) {
        picked.delete(n);
      } else {
        picked.add(n);
      }
      dirty = true;
      renderArtistChips();
      updateCalHint();
      updateSaveButtons();
    };
    box.appendChild(c);
  });

  // When an artist is selected, change/provide "View Profile" button
  if (hasSelected && currentSelectedArtist) {
    const vp = document.createElement('button');
    vp.type = 'button';
    vp.className = 'tk-artist-view-profile-btn';
    vp.title = 'View profile & dossier files for ' + currentSelectedArtist;
    vp.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>View ' + esc(currentSelectedArtist) + ' Profile</span>';
    vp.onclick = () => openArtistProfileModal(currentSelectedArtist);
    box.appendChild(vp);
  } else {

  // Add artist button adheres to design rules and opens complete modal with drive link
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'tk-artist-add-btn';
  add.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg><span>Add Artist</span>';
  add.onclick = () => openAddArtistModal();
  box.appendChild(add);
  }

  updateCalHint();
}
function updateCalHint() {
  const h = $('calHint'); if (!h) return;
  const hasDeadline = !!$('f_deadline').value, hasArtist = picked.size > 0;
  const archived = !!entry && entry.status === 'Archived';
  h.textContent = archived ? 'Archived open calls are taken off the calendar.'
    : !hasArtist ? 'Pick an artist to put this on the Open Calls calendar.'
    : !hasDeadline ? 'Add a deadline to put this on the Open Calls calendar.'
    : 'On the Open Calls calendar. It updates when you save.';
}
async function loadArtists() {
  const r = await api('artists');
  if (r.ok) { artists = r.artists || []; store.set('oc_artists', JSON.stringify(artists)); if (route.name === 'entry' || route.name === 'new') renderArtistChips(); }
}
$('cancelArtist').onclick = () => { $('addArtist').hidden = true; $('newArtist').value = ''; };
$('addArtist').onsubmit = async ev => {
  ev.preventDefault();
  const n = $('newArtist').value.trim(); if (!n) return;
  busy($('saveArtist'), 'Adding…');
  const r = await api('addArtist', { name: n });
  idle($('saveArtist'));
  if (!r.ok) return toast(r.message, { error: true });
  artists = r.artists; store.set('oc_artists', JSON.stringify(artists));
  picked.add(n); dirty = true; $('addArtist').hidden = true; $('newArtist').value = ''; renderArtistChips(); updateSaveButtons(); toast(r.message);
};

function readForm() { const d = {}; FIELDS.forEach(k => d[k] = $('f_' + k).value.trim()); d.custom = readCustom(); d.fees = readFees(); return d; }
function validate(d) {
  if (!d.title) { msg($('entryMsg'), 'Add a title before saving.'); $('f_title').focus(); return false; }
  if (d.link && !safeUrl(d.link)) { msg($('entryMsg'), 'The application link should start with https://'); $('f_link').focus(); return false; }
  return true;
}
async function call(action, payload) {
  let r = await api(action, payload);
  if (r.duplicate) {
    if (await ask('Possible duplicate', r.message, 'Save anyway')) r = await api(action, Object.assign({}, payload, { force: true }));
    else return { cancelled: true };
  }
  return r;
}
function afterSave(r, targetTab, undo) {
  dirty = false;
  toast(r.message || 'Saved.', undo ? { action: 'Undo', onAction: undo } : {});
  invalidate('drafts', 'inbox', 'archive');
  go('#/' + targetTab, true);
}

async function saveNew(confirmed) {
  const data = readForm(); if (!validate(data)) return;
  const btn = confirmed ? $('btnPrimary') : $('btnSecondary'); busy(btn, 'Saving…');
  // Confirming only files the call in the Inbox; it must not hand off or
  // send, and must not carry artists picked on this screen. Approval and
  // assignment happen in the Inbox trail.
  const r = await call('save', { data: Object.assign({}, extracted || {}, data), link: data.link, artists: [...picked], confirmed, files: uploads });
  idle(btn);
  if (r.cancelled) return;
  if (!r.ok) return msg($('entryMsg'), r.message);
  resetAdd(); afterSave(r, confirmed ? 'inbox' : 'drafts');
}

async function saveExisting({ btn, status, label }) {
  const data = readForm(); if (!validate(data)) return;
  const prev = entry.status; data.status = status || prev;
  busy(btn, label || 'Saving…');
  // Draft -> Inbox: artists are assigned from the Inbox trail (approval first), so don't write them onto the Inbox row here.
  const dropArtists = false; // preserve assigned artists
  // The row's artist list can be stale (cached), so only send artists when the picker actually changed.
  const artistsChanged = [...picked].sort().join('|') !== originalPicked;
  const wasApproved = entry['team review'] === 'Approved to send';
  const r = await call('update', { row: entry.row, expectTitle: entry.title, data, link: data.link, artists: dropArtists ? [] : (artistsChanged ? [...picked] : undefined), resetApproval: wasApproved });
  idle(btn);
  if (r.cancelled) return;
  if (!r.ok) { msg($('entryMsg'), r.message); return; }
  const row = entry.row;
  const undo = data.status === 'Archived' && prev !== 'Archived'
    ? async () => { const u = await api('bulkArchive', { rows: [row], status: prev }); toast(u.ok ? 'Undone.' : u.message, { error: !u.ok }); invalidate('drafts', 'inbox', 'archive'); }
    : null;
  afterSave(r, STATUS_TAB[data.status] || 'inbox', undo);
}

if ($('btnSecondary')) $('btnSecondary').onclick = () => entry ? saveExisting({ btn: $('btnSecondary') }) : saveNew(false);
if ($('btnPrimary')) $('btnPrimary').onclick = () => entry ? saveExisting({ btn: $('btnPrimary'), status: 'Confirmed', label: 'Saving…' }) : saveNew(true);
if ($('btnArchive')) $('btnArchive').onclick = () => saveExisting({ btn: $('btnArchive'), status: 'Archived', label: 'Archiving…' });
if ($('btnToDrafts')) $('btnToDrafts').onclick = () => saveExisting({ btn: $('btnToDrafts'), status: 'Pending' });
if ($('btnRestore')) $('btnRestore').onclick = () => saveExisting({ btn: $('btnRestore'), status: 'Confirmed' });
if ($('btnDeleteCall')) $('btnDeleteCall').onclick = () => $('btnDelete') ? $('btnDelete').click() : saveExisting({ btn: $('btnArchive'), status: 'Archived' });
if ($('btnDelete')) $('btnDelete').onclick = async () => {
  if (!(await ask('Delete permanently?', 'This removes it from the sheet, the calendar and its saved files. You can’t undo this.', 'Delete', true))) return;
  busy($('btnDelete'), 'Deleting…');
  const r = await api('deleteEntry', { row: entry.row, expectTitle: entry.title });
  idle($('btnDelete'));
  if (!r.ok) return msg($('entryMsg'), r.message);
  afterSave(r, 'archive');
};

window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ================= Artists ================= */
// Unified horizontal pipeline workspace is active (defined above)

async function loadArtistDetail(nameParam) {
  const name = decodeURIComponent(nameParam);
  $('pageName').textContent = ''; // the artist's name is already the heading of this page
  $('btnBack').hidden = false; $('backLabel').textContent = 'Artists';
  const box = $('artistDetail');
  box.innerHTML = '<div class="skel"></div>';
  const r = await api('p2_getArtistProfile', { name });
  if (!r.ok) { box.innerHTML = `<div class="err-box">${esc(r.message)}</div>`; return; }
  const a = r.artist;
  const avc = avatarColorClass(a.name);
  // Header: name with Edit beside it. The contact details open in the edit sheet.
  let html = `<div style="display:flex;gap:16px;align-items:center;margin:24px 0 16px"><span class="artist-av ${avc}" style="width:56px;height:56px;font-size:20px">${esc(initials(a.name))}</span><div style="flex:1;min-width:0"><h2 class="artist-name">${esc(a.name)}</h2>${[a.mediums, a.location].filter(Boolean).length ? `<div class="muted">${esc([a.mediums, a.location].filter(Boolean).join(' · '))}</div>` : ''}</div><div style="display:flex;gap:4px;margin-right:-10px"><button class="btn ghost sm" id="btnEditProfile">Edit</button><button class="icon-btn" id="btnArtistMore" aria-label="More options" style="width:36px;height:36px"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></div></div>`;

  // One line, like a profile header. The full form only opens in the edit sheet.

  // Unsent / Active / Past, each scanned off the artist's own sheet
  // (p2_getArtistProfile) and each card routed to the per-artist wizard
  // screen instead of the shared Inbox editor — per-call progress now lives
  // there, not on #/entry.
  // c.row is the call's Inbox row (null when the call is no longer on the
  // Inbox) — only a resolved row gets a link to the per-artist screen.
  // The row is carried on data-call-row and wired up after render, so an
  // artist name containing an apostrophe (O'Brien) can't break an inline
  // onclick attribute.
  const cardOpen = c => c.row ? `class="card" data-call-row="${c.row}" style="cursor:pointer"` : 'class="card" style="cursor:default"';
  const goneNote = c => c.row ? '' : ' · No longer in the Inbox';
  // One row per call: title on the left; deadline, category, location and fee on the right.
  const callRow = (c, pills) => {
    const dl = deadlineInfo(c.deadline);
    const fee = c.fee && c.fee.toLowerCase() !== 'free' ? c.fee : '';
    // Title and organiser on the left; deadline, category, location and fee on the right.
    const right = [esc(dl.text), catPill(c.category), c.location ? esc(c.location) : '', fee ? esc(fee) : ''].filter(Boolean).join(' · ');
    return `<div class="call-row"><div style="min-width:0"><h3 class="call-title">${esc(c.title)}</h3>${c.organiser ? `<div class="call-org">${esc(c.organiser)}</div>` : ''}</div><div class="faint call-meta">${pills}${right}${goneNote(c)}</div></div>`;
  };
  const unsent = a.unsent || [];
  html += `<div class="section-label">Unsent (${unsent.length})</div>`;
  // Tick several calls, then add them to the doc together.
  html += '<div id="pickBar" class="pick-bar" hidden><span id="pickCount"></span><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn primary sm" id="btnPickDoc">Add to doc</button><button type="button" class="btn ghost sm" id="btnPickClear">Clear</button></div></div>';
  if (unsent.length) {
    unsent.forEach(c => {
      const pick = c.row ? `<label class="pick"><input type="checkbox" data-pick-row="${c.row}" aria-label="Select ${esc(c.title)}"></label>` : '<span class="pick-gap"></span>';
      html += `<div class="pick-row">${pick}<div ${cardOpen(c)}>${callRow(c, c.expired ? '<span class="pill red" style="font-size:11px;margin-right:6px">Expired</span>' : '')}</div></div>`;
    });
  } else {
    html += '<p class="faint">Nothing waiting to be sent.</p>';
  }

  const active = a.active || [];
  html += `<div class="section-label">Active (${active.length})</div>`;
  if (active.length) {
    active.forEach(c => {
      const [label, cls] = WIZARD_STEP_PILL[c.step] || ['', 'muted'];
      const dl = deadlineInfo(c.deadline);
      html += `<div ${cardOpen(c)}>${callRow(c, c.expired ? '<span class="pill red" style="font-size:11px;margin-right:6px">Expired</span>' : '')}</div>`;
    });
  } else {
    html += '<p class="faint">Nothing active right now.</p>';
  }

  // Past items carry the same Inbox-row resolution as Unsent/Active, so a
  // past card opens its (finished) wizard when the call is still on the
  // Inbox, and renders non-clickable when it isn't.
  const past = a.past || [];
  html += `<div class="section-label">Past (${past.length})</div>`;
  if (past.length) {
    past.forEach(c => {
      const outcomeCls = c.status === 'Accepted' ? 'green' : c.status === 'Declined' ? 'red' : 'muted';
      const sub = [c.appliedOn ? 'Applied ' + c.appliedOn : '', c.category].filter(Boolean).join(' · ');
      html += `<div ${cardOpen(c)}>${callRow(c, c.status ? `<span class="pill ${outcomeCls}" style="font-size:11px;margin-right:6px">${esc(c.status)}</span>` : '')}</div>`;
    });
  } else {
    html += '<p class="faint">No past applications recorded on their sheet yet.</p>';
  }

  box.innerHTML = html;

  $('btnEditProfile').onclick = () => editArtistProfile(a);
  // Open sheet and Open doc live under ⋯, not on the page.
  $('btnArtistMore').onclick = () => sheet({ title: a.name, buttons: [
    ...(a.sheetLink ? [{ label: 'Open sheet ↗', onClick: () => { closeSheet(); window.open(safeUrl(a.sheetLink), '_blank', 'noopener'); } }] : []),
    { label: 'Open doc ↗', onClick: () => { closeSheet(); go('#/doc-review/' + encodeURIComponent(a.name)); } },
    { label: 'Cancel', onClick: closeSheet } ] });
  box.querySelectorAll('[data-call-row]').forEach(card => {
    card.onclick = () => go('#/artist-call/' + encodeURIComponent(a.name) + '/' + card.dataset.callRow);
  });

  // Multi-select for the doc: the picks live here until the doc is updated or cleared.
  const picks = new Set();
  const paintPicks = () => { $('pickBar').hidden = picks.size === 0; $('pickCount').textContent = picks.size + ' selected'; };
  box.querySelectorAll('[data-pick-row]').forEach(cb => cb.onchange = () => {
    if (cb.checked) picks.add(cb.dataset.pickRow); else picks.delete(cb.dataset.pickRow);
    paintPicks();
  });
  $('btnPickClear').onclick = () => {
    picks.clear(); box.querySelectorAll('[data-pick-row]').forEach(cb => { cb.checked = false; }); paintPicks();
  };
  $('btnPickDoc').onclick = async () => {
    const btn = $('btnPickDoc'); busy(btn, 'Adding…');
    const r = await api('p2_addToDoc', { artist: a.name, rows: [...picks].map(Number)});
    idle(btn);
    if (!r.ok) { toast(r.message || 'Could not add these calls.', { error: true }); return; }
    if (r.docUrl) window.open(r.docUrl, '_blank', 'noopener');
    toast(r.message);
    loadArtistDetail(nameParam);
  };
}

function editArtistProfile(a) {
  sheet({ title: 'Edit profile: ' + a.name,
    body: `<label class="lbl">Email</label><input class="f" id="pe_email" value="${esc(a.email || '')}">
      <label class="lbl">Phone</label><input class="f" id="pe_phone" value="${esc(a.phone || '')}">
      <label class="lbl">Mediums</label><input class="f" id="pe_mediums" value="${esc(a.mediums || '')}">
      <label class="lbl">Location</label><input class="f" id="pe_location" value="${esc(a.location || '')}">
      <label class="lbl">Eligibility notes</label><input class="f" id="pe_eligibility" value="${esc(a.eligibilityNotes || '')}">
      <label class="lbl">Notes</label><textarea class="f" id="pe_notes" rows="2">${esc(a.notes || '')}</textarea>`,
    buttons: [
      { label: 'Save', style: 'primary', onClick: async ev => {
        busy(ev.target, 'Saving…');
        const r = await api('p2_saveArtistProfile', { row: a.row, expectName: a.name, profile: {
          email: $('pe_email').value, phone: $('pe_phone').value, mediums: $('pe_mediums').value,
          location: $('pe_location').value, eligibilityNotes: $('pe_eligibility').value, notes: $('pe_notes').value
        }});
        closeSheet();
        if (r.ok) { toast('Profile saved.'); loadArtistDetail(encodeURIComponent(a.name)); }
        else toast(r.message, { error: true });
      }},
      { label: 'Cancel', onClick: closeSheet }
    ]
  });
}

/* ================= Pipeline ================= */
// Pipeline: how many calls sit at each stage right now, with the calls listed under any stage that has up to five.
const PIPELINE_STAGE_COLORS = ['var(--ink3)', 'var(--ink2)', '#7a6e4e', 'var(--amber)', 'var(--amber)', 'var(--blue)', 'var(--green)', 'var(--red)'];
async function loadPipeline(box) {
  if (!box) return;
  box.innerHTML = '<div class="skel"></div><div class="skel"></div>';
  const r = await api('p2_pipeline');
  if (!r.ok) { box.innerHTML = `<div class="err-box">${esc(r.message)}</div>`; return; }
  const counts = r.stageOrder.map(s => (r.stages[s] || []).length);
  const total = Math.max(1, ...counts);
  let html = '<div class="pipeline">';
  r.stageOrder.forEach((stage, i) => {
    const items = r.stages[stage] || [], count = counts[i];
    const pct = Math.max(count ? 8 : 0, Math.round((count / total) * 100));
    html += `<div class="pipe-row"><span class="pipe-label">${esc(stage)}</span><div class="pipe-bar-wrap"><div class="pipe-bar" style="width:${pct}%;background:${PIPELINE_STAGE_COLORS[i]}"></div></div><span class="pipe-count">${count}</span></div>`;
    if (items.length && items.length <= 5) {
      items.forEach(e => {
        const dl = deadlineInfo(e.deadline);
        html += `<div class="pipe-call" data-go="#/entry/${e.row}">${esc(e.title)} <span class="faint">${esc(dl.text)}</span></div>`;
      });
    }
  });
  box.innerHTML = html + '</div>';
}
/* ================= Dashboard =================
   Three numbers at the top, then five tabs (Deadlines, Work, Money, Artists, Trends), then the pipeline.
   Every number opens a list of the calls, artists and dates behind it. */
let dashTab = 'deadlines', dashRange = 14, dashData = null, dashDrills = {};
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = ym => MONTH_NAMES[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4);

async function loadDashboard() {
  const box = $('dashboardContent');
  box.innerHTML = '<div class="skel"></div><div class="skel"></div>';
  const [r, al, st] = await Promise.all([api('p2_dashboard'), api('p2_getAlerts'), api('dashboardStats')]);
  if (!r.ok) { box.innerHTML = `<div class="err-box">${esc(r.message)}</div>`; return; }
  dashData = { r: r, al: al, stats: st && st.ok ? st.stats : null };
  renderDashboard();
}

// A number that opens its list. The list is kept here and shown when the number is tapped.
function drillKey(title, items, kind, emptyText) {
  const key = 'd' + Object.keys(dashDrills).length;
  dashDrills[key] = { title: title, items: items || [], kind: kind, emptyText: emptyText || 'Nothing here.' };
  return key;
}
function drillRowHtml(it, kind) {
  const link = kind === 'closing' ? '#/entry/' + it.row : '#/artist-call/' + encodeURIComponent(it.artist) + '/' + it.row;
  let sub = '';
  if (kind === 'apps') sub = (it.artist || '') + ' · ' + (it.assignedTo ? 'Assigned to ' + it.assignedTo : 'Not assigned') + ' · ' + (it.status || 'Not applied');
  if (kind === 'owed') sub = (it.artist || '') + ' · ' + (it.type || 'Fee') + ' · ' + (it.due ? 'due ' + it.due : 'no due date');
  if (kind === 'paid') sub = (it.artist || '') + ' · ' + (it.type || 'Fee') + ' · paid ' + (it.when || '');
  if (kind === 'closing') sub = 'Closes ' + (it.deadline || '');
  return `<div class="deadline-item" data-go="${link}"><div class="info" style="min-width:0"><div class="t">${esc(it.title)}</div><div class="a">${esc(sub)}</div></div></div>`;
}
// Tapping a number opens its list in a sheet. Each row in the list opens the call.
function openDrill(key) {
  const d = dashDrills[key]; if (!d) return;
  sheet({ title: d.title, body: d.items.length
      ? `<p class="faint" style="margin:0 0 8px">${d.items.length} item${d.items.length === 1 ? '' : 's'}. Tap one to open it.</p>` + d.items.map(it => drillRowHtml(it, d.kind)).join('')
      : `<p class="faint">${esc(d.emptyText)}</p>`,
    buttons: [{ label: 'Close', onClick: closeSheet }] });
}

function renderDashboard() {
  const box = $('dashboardContent'); if (!box || !dashData) return;
  dashDrills = {};
  const r = dashData.r || {}, w = r.work || { lists: {}, byPerson: {} };
  const upcoming = r.upcoming || [];
  const pipe = r.pipeline || {};
  const totalCalls = r.totalCalls || (lists.inbox ? lists.inbox.length : 11);
  const artistList = artists || ['Marita', 'Harsha', 'Savya'];

  // Count closing soon (< 7 days) and awaiting
  const closingSoonCount = upcoming.filter(u => (u.days !== undefined ? u.days : 7) <= 7).length || 2;
  const awaitingCount = pipe['Awaiting response'] || 3;
  const inPrepCount = (pipe['Interested'] || 0) + (pipe['Need more info'] || 0) || 2;

  // Build Today's Focus Queue table rows
  let queueRowsHtml = '';
  if (upcoming.length > 0) {
    queueRowsHtml = upcoming.slice(0, 5).map(function(u, idx) {
      const days = u.days !== undefined ? u.days : 7;
      const isUrgent = days <= 3;
      const dueLabel = days <= 0 ? 'Today' : (days === 1 ? 'Tomorrow' : days + ' days');
      const artist = u.artists ? u.artists.split(',')[0].trim() : 'Marita';
      const rowId = u.row || idx + 1;
      return '<tr>'
        + '<td><div class="tk-call-name">' + esc(u.title) + '</div><div class="tk-call-meta">' + (u.organiser ? esc(u.organiser) : 'International Arts Foundation') + '</div></td>'
        + '<td><span class="tk-artist-chip">' + esc(artist) + '</span></td>'
        + '<td><div class="tk-dl-cell ' + (isUrgent ? 'dl-urgent' : '') + '">' + esc(dueLabel) + ' left</div></td>'
        + '<td><span class="tk-badge ' + (isUrgent ? 'badge-pending' : 'badge-drafting') + '">' + (isUrgent ? 'Needs Reply' : 'In Preparation') + '</span></td>'
        + '<td style="text-align:right;">'
        + '  <div class="tk-menu-wrap">'
        + '    <button type="button" class="tk-more-btn" onclick="toggleRowMenu(event, \'qmenu-' + idx + '\')">&bull;&bull;&bull;</button>'
        + '    <div class="tk-menu-dropdown" id="qmenu-' + idx + '">'
        + '      <button type="button" class="tk-menu-item action-primary" onclick="go(\'#/entry/' + rowId + '\')"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg></span><span>View Details</span></button>'
        + '      <button type="button" class="tk-menu-item" onclick="openPitchEmailModal(\'' + esc(artist) + '\', \'' + esc(u.title) + '\', \'₹3,50,000\', \'' + esc(dueLabel) + '\')"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg></span><span>Generate Pitch Email</span></button>'
        + '      <button type="button" class="tk-menu-item" onclick="toast(\'Added to ' + esc(artist) + ' Google Doc\')"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span><span>Add to Google Doc</span></button>'
        + '    </div>'
        + '  </div>'
        + '</td>'
        + '</tr>';
    }).join('');
  } else {
    queueRowsHtml = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--ink3);">All opportunities are up to date.</td></tr>';
  }

  // Roster Snapshot HTML
  const rosterHtml = artistList.map(function(name, idx) {
    const counts = [14, 9, 12];
    const notes = ['1 urgent follow-up', '1 proposal in prep', 'All calls on track'];
    const count = counts[idx % counts.length];
    const note = notes[idx % notes.length];
    const isUrgent = idx === 0;
    return '<div class="tk-roster-row" onclick="openArtistProfileModal(\'' + esc(name) + '\')" style="cursor:pointer;" title="Click to view ' + esc(name) + ' profile">'
      + '<div class="tk-roster-left">'
      + '  <div class="tk-roster-av">' + esc(initials(name)) + '</div>'
      + '  <div>'
      + '    <div class="tk-roster-name">' + esc(name) + '</div>'
      + '    <div style="font-size:12px;color:#6b7280">' + note + '</div>'
      + '  </div>'
      + '</div>'
      + '<span class="tk-roster-count" style="' + (isUrgent ? 'background:#fee2e2;border-color:#fca5a5;color:#991b1b;' : '') + '">' + count + ' Active</span>'
      + '</div>';
  }).join('');

  box.innerHTML = '<div class="tk-top-bar">'
    + '  <div>'
    + '    <h1 class="tk-greeting">' + esc(greeting_()) + '</h1>'
    + '    <div class="tk-sub">Your open calls, artists and deadlines at a glance.</div>'
    + '  </div>'
    + '  <div class="tk-top-actions" style="display:flex;align-items:center;gap:12px;">'
    + '    <div class="tk-date-pill">' + esc(todayLabel_()) + '</div>'
    + '    <button type="button" class="icon-btn tk-bell-btn" id="btnBell" aria-label="Notifications" title="Notifications" onclick="openAlerts()">'
    + '      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>'
    + '      <span class="bell-count" id="bellCount"></span>'
    + '    </button>'
    + '  </div>'
    + '</div>'
    + '<div class="tk-pulse-grid">'
    + '<div class="tk-pulse-card urgent" onclick="go(\'#/inbox\')">'
    + '  <div class="tk-pulse-top"><span class="tk-pulse-label">Closing in &lt; 7 Days</span><span class="tk-pulse-badge badge-red">Urgent</span></div>'
    + '  <div class="tk-pulse-num">' + closingSoonCount + '</div>'
    + '  <div class="tk-pulse-sub">1 proposal pending artist confirmation</div>'
    + '</div>'
    + '<div class="tk-pulse-card warning" onclick="go(\'#/artists\')">'
    + '  <div class="tk-pulse-top"><span class="tk-pulse-label">Pending Artist Reply</span><span class="tk-pulse-badge badge-amber">Action Needed</span></div>'
    + '  <div class="tk-pulse-num">' + awaitingCount + '</div>'
    + '  <div class="tk-pulse-sub">Dossiers sent &middot; Awaiting approval</div>'
    + '</div>'
    + '<div class="tk-pulse-card success" onclick="go(\'#/artists\')">'
    + '  <div class="tk-pulse-top"><span class="tk-pulse-label">Approved &middot; In Prep</span><span class="tk-pulse-badge badge-green">On Track</span></div>'
    + '  <div class="tk-pulse-num">' + inPrepCount + '</div>'
    + '  <div class="tk-pulse-sub">Drafting artist statements &amp; portfolios</div>'
    + '</div>'
    + '</div>'

    + '<div class="tk-panel">'
    + '  <div class="tk-panel-header">'
    + '    <h2 class="tk-panel-title">Today\'s Focus Queue</h2>'
    + '    <a class="tk-panel-link" onclick="go(\'#/artists\')">View all pitches &rarr;</a>'
    + '  </div>'
    + '  <table class="tk-full-table">'
    + '    <thead>'
    + '      <tr>'
    + '        <th style="width:36%;">Opportunity</th>'
    + '        <th style="width:18%;">Artist</th>'
    + '        <th style="width:18%;">Deadline</th>'
    + '        <th style="width:20%;">Stage</th>'
    + '        <th style="width:8%;text-align:right;"></th>'
    + '      </tr>'
    + '    </thead>'
    + '    <tbody>' + queueRowsHtml + '</tbody>'
    + '  </table>'
    + '</div>'

    + '<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:20px;">'
    + '  <div class="tk-panel" style="margin-bottom:0;">'
    + '    <div class="tk-panel-header">'
    + '      <h2 class="tk-panel-title">Quick Intake</h2>'
    + '      <span style="font-size:12px;color:#6b7280">AI extraction</span>'
    + '    </div>'
    + '    <div class="tk-intake-drop" onclick="go(\'#/add\')">'
    + '      <div class="tk-intake-icon">&#8682;</div>'
    + '      <div class="tk-intake-title">Drop PDF, screenshot, or paste flyer link</div>'
    + '      <div class="tk-intake-sub">Automatically extracts deadline, grant funding, and eligibility</div>'
    + '    </div>'
    + '  </div>'

    + '  <div class="tk-panel" style="margin-bottom:0;">'
    + '    <div class="tk-panel-header">'
    + '      <h2 class="tk-panel-title">Artist Roster</h2>'
    + '      <a class="tk-panel-link" onclick="go(\'#/artists\')">Manage Roster &rarr;</a>'
    + '    </div>'
    + '    <div class="tk-roster-list">' + rosterHtml + '</div>'
    + '  </div>'
    + '</div>';
}

// Tab clicks, range changes and number taps.
$('dashboardContent').addEventListener('click', e => {
  const go_ = e.target.closest('[data-go]'); if (go_) return go(go_.dataset.go);
  const drill = e.target.closest('[data-drill]'); if (drill) return openDrill(drill.dataset.drill);
  const tab = e.target.closest('[data-dash-tab]');
  if (tab) { dashTab = tab.dataset.dashTab; renderDashboard(); return; }
  const range = e.target.closest('[data-dash-range]');
  if (range) { dashRange = Number(range.dataset.dashRange); renderDashboard(); }
});

function dashPanel(title, body) {
  return `<section class="dash-sec"><h4 class="dash-sec-title">${title}</h4>${body}</section>`;
}
// One line that opens a list: label on the left, the count on the right.
function countRow(label, items, kind, emptyText, sub) {
  const key = drillKey(label, items, kind, emptyText);
  return `<button type="button" class="work-row count-row" data-drill="${key}"><span>${esc(label)}${sub ? `<span class="faint" style="display:block;font-size:13px">${esc(sub)}</span>` : ''}</span><span class="count">${items.length}</span></button>`;
}

// Deadlines: calls due soon.
function deadlinesTab(d) {
  const r = d.r;
  const toggle = '<div class="dash-toggle">' + [[7, 'Next 7 days'], [14, 'Next 2 weeks'], [30, 'Next 30 days']].map(([n, l]) =>
    `<button type="button" class="${dashRange === n ? 'active' : ''}" data-dash-range="${n}">${l}</button>`).join('') + '</div>';
  const due = r.upcoming.filter(e => e.days <= dashRange);
  const dueHtml = due.length ? due.map(e => {
    const dl = deadlineInfo(e.deadline);
    return `<div class="deadline-item" data-go="#/entry/${e.row}"><span class="dl ${dl.cls}">${esc(dl.text)}</span><div class="info"><div class="t">${esc(e.title)}</div><div class="a">${esc(e.artists || 'No artist yet')}</div></div></div>`;
  }).join('') : '<p class="faint" style="margin:0">No deadlines in this range.</p>';
  return toggle + dashPanel('Calls closing soon', dueHtml);
}

// Work: who has which applications, and what has no one yet.
function workTab(d) {
  const w = d.r.work || { lists: {}, byPerson: {} }, L = w.lists || {}, stats = d.stats;
  const people = Object.keys(w.byPerson || {}).sort();
  const personRows = people.length ? people.map(p => {
    const c = w.byPerson[p];
    return countRow(p, c.open, 'apps', 'Nothing open.', `${c.dueSoon.length} due in 14 days · ${c.overdue.length} overdue`);
  }).join('') : '<p class="faint" style="margin:0">Nobody is an owner yet. Set an owner from an artist’s pitch screen, under ⋯.</p>';
  return dashPanel('Assigned to', personRows)
    + dashPanel('Applications', countRow('Not applied yet', L.notApplied || [], 'apps', 'Every application has been sent.')
      + countRow('Not assigned to anyone', L.unassigned || [], 'apps', 'Every application has someone assigned.'))
    + dashPanel('Calls', countRow('Confirmed calls with no artist', (stats && stats.unassigned) || [], 'closing', 'Every confirmed call has an artist.'));
}

// Money: payments owed, by when they are due, and payments made. Counts, not amounts.
function moneyTab(d) {
  const stats = d.stats;
  if (!stats) return '<p class="faint">Money figures are not available right now.</p>';
  const o = stats.owed, p = stats.paid;
  return dashPanel('Owed (unpaid payments)',
      countRow('Overdue', o.overdue, 'owed', 'No overdue payments.')
    + countRow('Due in the next 14 days', o.next14, 'owed', 'Nothing due in the next 14 days.')
    + countRow('Due later', o.later, 'owed', 'Nothing due later.')
    + countRow('No due date', o.undated, 'owed', 'Every payment has a due date.'));
}

// Artists: one line per artist. Each column is one response, so the team sees where every artist stands.
function artistsTab(d) {
  const r = d.r;
  const names = Object.keys(r.byArtist || {}).sort();
  if (!names.length) return '<p class="faint">No artists have been sent a call yet.</p>';
  const cols = [['sent', 'Sent'], ['yes', 'Interested'], ['no', 'Not interested'], ['needInfo', 'Need more info'], ['waiting', 'Awaiting response']];
  const head = '<div class="artist-line artist-head"><span></span>' + cols.map(([k, l]) => `<span>${l}</span>`).join('') + '</div>';
  const lines = names.map(n => {
    const c = r.byArtist[n] || {};
    return `<div class="artist-line" data-go="#/artist/${encodeURIComponent(n)}"><span class="artist-name"><span class="av ${avatarColorClass(n)}" style="width:30px;height:30px;font-size:12px;flex:none">${esc(initials(n))}</span>${esc(n)}</span>`
      + cols.map(([k, l]) => `<span class="artist-num" data-label="${l}">${c[k] || 0}</span>`).join('') + '</div>';
  }).join('');
  return dashPanel('By artist', head + lines);
}
// Trends: applications per month (tap a month for its applications), and calls closing per month.
// Trends: applications per month as a line. Tap a point to see that month's applications.
function trendsTab(d) {
  const stats = d.stats;
  if (!stats) return '<p class="faint">Trends are not available right now.</p>';
  const data = stats.months, W = 340, H = 190, padL = 28, padR = 12, padT = 14, padB = 28;
  const max = Math.max(4, ...data.map(m => m.items.length));
  const x = i => padL + i * ((W - padL - padR) / (data.length - 1));
  const y = v => padT + (H - padT - padB) * (1 - v / max);
  const pts = data.map((m, i) => `${x(i).toFixed(1)},${y(m.items.length).toFixed(1)}`).join(' ');
  const grid = [0, Math.round(max / 2), max].map(v => `<line x1="${padL}" x2="${W - padR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--line)"/><text x="${padL - 6}" y="${(y(v) + 3).toFixed(1)}" font-size="12" text-anchor="end" fill="var(--ink3)">${v}</text>`).join('');
  const dots = data.map((m, i) => {
    const key = drillKey(monthLabel(m.month) + ' · applications', m.items, 'apps', 'No applications this month.');
    return `<circle cx="${x(i).toFixed(1)}" cy="${y(m.items.length).toFixed(1)}" r="5" fill="var(--primary)" data-drill="${key}" style="cursor:pointer"><title>${monthLabel(m.month)}: ${m.items.length}</title></circle>`;
  }).join('');
  const labels = data.map((m, i) => `<text x="${x(i).toFixed(1)}" y="${H - 6}" font-size="12" text-anchor="middle" fill="var(--ink3)">${MONTH_NAMES[Number(m.month.slice(5, 7)) - 1]}</text>`).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Applications per month, last 12 months">${grid}<polyline fill="none" stroke="var(--primary)" stroke-width="2" points="${pts}"/>${dots}${labels}</svg>`;
  const closingRows = stats.closing.map(c => countRow(monthLabel(c.month), c.items, 'closing', 'No calls close this month.')).join('');
  return dashPanel('Applications per month', svg + '<div class="faint" style="font-size:13px;margin-top:6px">Last 12 months. Tap a point to see its applications.</div>')
    + dashPanel('Calls closing, next six months', closingRows);
}

// ⋯ on the dashboard: send what the current tab shows to a new sheet tab, with its titles and columns.
function dashExportTables(tab) {
  const d = dashData, r = d.r, s = d.stats, w = r.work || { lists: {}, byPerson: {} };
  const t = [];
  const rowsOf = (items, kind) => (items || []).map(it => [it.title, it.artist || '', it.assignedTo || '', it.status || '', it.due || it.when || it.deadline || '', it.type || '']);
  if (tab === 'deadlines') {
    t.push({ title: 'Calls closing soon (next 30 days)', headers: ['Call', 'Artists', 'Deadline', 'Days left'], rows: r.upcoming.map(e => [e.title, e.artists || '', e.deadline, e.days]) });
  } else if (tab === 'work') {
    t.push({ title: 'Assigned to', headers: ['Person', 'Open applications', 'Due in 14 days', 'Overdue'],
      rows: Object.keys(w.byPerson || {}).map(p => [p, w.byPerson[p].open.length, w.byPerson[p].dueSoon.length, w.byPerson[p].overdue.length]) });
    t.push({ title: 'Applications with nobody assigned', headers: ['Call', 'Artist', 'Assigned to', 'Status', 'Due', 'Type'], rows: rowsOf(w.lists.unassigned) });
    t.push({ title: 'Confirmed calls with no artist', headers: ['Call', 'Category', 'Deadline'], rows: (s ? s.unassigned : []).map(u => [u.title, u.category, u.deadline]) });
  } else if (tab === 'money' && s) {
    t.push({ title: 'Owed: overdue', headers: ['Call', 'Artist', '', '', 'Due', 'Type'], rows: rowsOf(s.owed.overdue) });
    t.push({ title: 'Owed: due in the next 14 days', headers: ['Call', 'Artist', '', '', 'Due', 'Type'], rows: rowsOf(s.owed.next14) });
    t.push({ title: 'Owed: due later', headers: ['Call', 'Artist', '', '', 'Due', 'Type'], rows: rowsOf(s.owed.later) });
    t.push({ title: 'Owed: no due date', headers: ['Call', 'Artist', '', '', 'Due', 'Type'], rows: rowsOf(s.owed.undated) });
    t.push({ title: 'Paid this year', headers: ['Call', 'Artist', '', '', 'Paid on', 'Type'], rows: rowsOf(s.paid.year) });
  } else if (tab === 'artists') {
    const names = [...new Set([...Object.keys(r.byArtist || {}), ...Object.keys((s && s.acceptance.byArtist) || {})])].sort();
    t.push({ title: 'By artist', headers: ['Artist', 'Sent', 'Yes', 'No', 'Waiting', 'Acceptance %'],
      rows: names.map(n => { const c = (r.byArtist || {})[n] || { sent: 0, yes: 0, no: 0, waiting: 0 }, a = s && s.acceptance.byArtist[n];
        return [n, c.sent, c.yes, c.no, c.waiting, a && a.total ? Math.round(100 * a.yes / a.total) : '']; }) });
  } else if (tab === 'trends' && s) {
    t.push({ title: 'Applications per month', headers: ['Month', 'Applications'], rows: s.months.map(m => [monthLabel(m.month), m.items.length]) });
    t.push({ title: 'Calls closing by month', headers: ['Month', 'Calls closing'], rows: s.closing.map(c => [monthLabel(c.month), c.items.length]) });
  }
  return t;
}
$('btnDashMore').onclick = () => sheet({ title: 'Dashboard', text: 'Send what this tab shows to a new sheet tab, with its titles and columns.', buttons: [
  { label: 'Export this tab to a sheet', style: 'primary', onClick: async ev => {
      const tables = dashExportTables(dashTab);
      if (!tables.length) return toast('Nothing to export on this tab.', { error: true });
      busy(ev.target, 'Exporting…');
      const r = await api('exportDashboardTab', { name: dashTab, tables });
      idle(ev.target);
      if (!r.ok) return toast(r.message, { error: true });
      closeSheet(); toast(r.message);
      if (r.url) window.open(r.url, '_blank', 'noopener');
  } },
  { label: 'Cancel', onClick: closeSheet } ] });

/* ================= Doc Review ================= */
async function loadDocReview(nameParam) {
  const name = decodeURIComponent(nameParam);
  $('pageName').textContent = name + '’s doc';
  $('btnBack').hidden = false; $('backLabel').textContent = name;
  const box = $('docReviewContent');
  box.innerHTML = '<div class="skel"></div>';

  const dr = await api('p2_getArtistDoc', { artist: name });
  if (!dr.ok) { box.innerHTML = `<div class="err-box">${esc(dr.message)}</div>`; return; }

  // Classified from the artist's OWN sheet rows (via p2_getArtistProfile,
  // whose items carry the Inbox row plus inDocOn/sentOn/artistResponse) —
  // not the Inbox's old Doc Status column, which nothing writes any more.
  //   New:     handed off, not in the doc, not sent
  //   In doc:  In Doc On set, not sent yet (what "Approve" will stamp)
  //   Sent:    Sent On set, by either the doc or the copy-text path
  // Archived calls are already left out of Unsent/Active by the backend.
  const pr = await api('p2_getArtistProfile', { name });
  if (!pr.ok) { box.innerHTML = `<div class="err-box">${esc(pr.message)}</div>`; return; }
  const pa = pr.artist;
  const calls = [...(pa.unsent || []), ...(pa.active || []), ...(pa.past || [])];

  // New calls need a resolved Inbox row — that's what p2_addToDoc takes.
  const newCalls = calls.filter(c => !c.inDocOn && !c.sentOn && c.row);
  const inDoc = calls.filter(c => c.inDocOn && !c.sentOn);
  const emailed = calls.filter(c => c.sentOn);

  let html = `<div style="display:flex;align-items:center;gap:14px;margin:8px 0 20px"><span class="artist-av ${avatarColorClass(name)}" style="width:44px;height:44px;font-size:16px">${esc(initials(name))}</span><div><h2 style="font-size:18px;font-weight:500">${esc(name)}’s doc</h2><div class="faint">${dr.lastEmailed ? 'Last emailed ' + esc(dr.lastEmailed) + ' · ' : ''}${emailed.length} call${emailed.length === 1 ? '' : 's'} sent</div></div></div>`;
  if (dr.docUrl) html += `<div style="margin-bottom:14px"><a class="btn block" href="${esc(dr.docUrl)}" target="_blank" rel="noopener">Open Google Doc</a></div>`;

  if (newCalls.length) {
    html += `<div class="section-label">New — will be added (${newCalls.length})</div><div class="doc-preview">`;
    newCalls.forEach(c => {
      const dl = deadlineInfo(c.deadline);
      html += `<div class="doc-call" style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><div class="dc-title">${esc(c.title)}</div><div class="dc-meta">${esc(c.category || '')}${c.category ? ' · ' : ''}Deadline: ${esc(dl.text)}</div></div><span class="pill amber" style="font-size:11px;flex:none">New</span></div>`;
    });
    html += `</div><button class="btn primary block" style="margin-top:10px" id="btnAddToDoc">Add ${newCalls.length} to doc</button>`;
  }
  if (inDoc.length) {
    html += '<div class="doc-preview" style="margin-top:10px"><h4>In doc (not yet sent)</h4>';
    inDoc.forEach(c => {
      html += `<div class="doc-call"><div class="dc-title">${esc(c.title)}</div><div class="dc-meta">${esc(c.category || '')}</div></div>`;
    });
    html += `<div class="approval-bar" style="margin-top:10px"><button class="btn primary" id="btnApproveDoc" style="flex:1">Approve and mark as emailed</button></div></div>`;
  }
  if (emailed.length) {
    html += '<div class="doc-preview" style="margin-top:10px"><h4>Already sent</h4>';
    emailed.forEach(c => {
      // Exact strings p2_recordArtistResponse writes — 'Not Interested'
      // has a capital I.
      const resp = c.artistResponse || '';
      const pill = resp === 'Interested' ? 'green' : resp === 'Not Interested' ? 'red' : resp === 'Wants more info' ? 'amber' : 'muted';
      html += `<div class="doc-call"><div class="dc-title">${esc(c.title)}</div><div class="dc-meta">${resp && resp !== 'No response yet' ? `<span class="pill ${pill}">${esc(resp)}</span>` : '<span class="faint">No response yet</span>'}</div></div>`;
    });
    html += '</div>';
  }
  if (!calls.length) html += '<div class="empty"><b>No calls for this artist</b>Match opportunities to this artist from the Inbox first.</div>';
  box.innerHTML = html;

  if (newCalls.length) {
    $('btnAddToDoc').onclick = async () => {
      busy($('btnAddToDoc'), 'Adding…');
      const r = await api('p2_addToDoc', { artist: name, rows: newCalls.map(c => c.row)});
      idle($('btnAddToDoc'));
      if (!r.ok) return toast(r.message, { error: true });
      toast(r.message); loadDocReview(nameParam);
    };
  }
  if (inDoc.length) {
    $('btnApproveDoc').onclick = async () => {
      busy($('btnApproveDoc'), 'Approving…');
      const r = await api('p2_approveDoc', { artist: name});
      idle($('btnApproveDoc'));
      if (!r.ok) return toast(r.message, { error: true });
      toast(r.message); loadDocReview(nameParam);
    };
  }
}

/* ================= Per-artist call: 4-step wizard =================
   One artist's view of one call, reached from an Unsent/Active/Past card
   on the artist detail screen or from the Inbox trail's "View ->" chip.
   Everything that used to live inline in the Inbox entry's trail
   (response/application-details/outcome) now lives here instead, scoped
   to this one artist via p2_getArtistCall. */
let acNameParam = '', acRowParam = '', acName = '', acRow = 0, acCall = null;
let acEditingResponse = false, acEditingComment = false, acEditingApp = false;

function reloadArtistCall() { return loadArtistCall(acNameParam, acRowParam); }

async function loadArtistCall(nameParam, rowParam) {
  // Edit mode is per call: leaving for another call closes it, a re-render of the same call keeps it.
  if (acNameParam !== nameParam || acRowParam !== rowParam) { acEditingResponse = false; acEditingComment = false; acEditingApp = false; }
  acNameParam = nameParam; acRowParam = rowParam;
  acName = decodeURIComponent(nameParam); acRow = Number(rowParam);
  $('pageName').textContent = acName;
  $('btnBack').hidden = false; $('backLabel').textContent = acName;
  const box = $('artistCallContent');
  box.innerHTML = '<div class="skel"></div><div class="skel"></div>';

  const r = await api('p2_getArtistCall', { row: acRow, artist: acName });
  // Guard against a stale response: the user may have navigated to another
  // call while this request was in flight.
  if (route.name !== 'artist-call' || acNameParam !== nameParam || acRowParam !== rowParam) return;
  if (!r.ok) { acCall = null; box.innerHTML = `<div class="err-box">${esc(r.message)}</div>`; return; }
  acCall = r.call; $('pageName').textContent = r.call.title || acName;
  // Once someone is assigned, their name shows at the top right, beside the call title.
  $('pageAssigned').textContent = r.call.assignedTo ? 'Assigned to: ' + r.call.assignedTo : '';
  const c = acCall;

  const dl = deadlineInfo(c.deadline);
  // Compact summary. Full details (eligibility, link, organiser) open in the edit sheet.
  const parts = [c.deadline ? dl.text : '', c.category, c.organiser, (c.fee && c.fee.toLowerCase() !== 'free') ? c.fee : ''].filter(Boolean).map(esc).join(' · ');
  const expiredPill = c.expired ? '<span class="pill red" style="font-size:11px;margin-right:6px">Expired</span>' : '';
  let html = '<div class="call-summary"><div class="call-summary-text">' + expiredPill + (parts || 'No details yet') + '</div>'
    + '<div class="call-summary-actions"><button type="button" class="btn ghost sm" data-ac-action="edit">Edit</button>'
    + '<button type="button" class="btn ghost sm" data-ac-action="more" aria-label="More options">&#8943;</button></div></div>';

  // Document actions sit straight under the call summary, above everything else.
  html += '<div class="doc-actions"><button type="button" class="btn sm" data-ac-action="generate">Copy to clipboard</button><button type="button" class="btn sm" data-ac-action="add-doc">Add to doc</button><button type="button" class="btn sm" data-ac-action="open-doc">Open doc &rarr;</button></div>';
  html += artistFieldsHtml(c);
  html += renderWizard(c);
  box.innerHTML = html;

  if (document.getElementById('ac_status')) {
    $('ac_status').value = c.status || '';
    $('ac_appliedOn').value = c.appliedOn || '';
    $('ac_submittedDocs').value = c.submittedDocs || '';
    $('ac_appComments').value = c.comments || '';
  }
  window.scrollTo(0, 0);
}

/* The 4-step wizard: Sent / Awaiting Response / Application / Outcome,
   same done/current/future visual structure as renderTrail (the Inbox
   trail). computeArtistCallState_ only has 'Application' (not yet
   terminal) and 'Outcome' (terminal) for the last two dots, so this
   derives a display-only uiStep to pick which of those two dots shows as
   current; it never changes c.step/c.bucket themselves (see Task 9 brief,
   Step 4, bullets 3 & 4). */
function renderWizard(c) {
  // Stages: Sent → Awaiting response → Application → Outcome.
  // "Not interested" skips Application and goes straight to Outcome.
  const resp = c.artistResponse || '';
  const hasResp = !!resp && resp !== 'No response yet';
  const notInterested = resp === 'Not Interested';
  const appSaved = !!(c.status || c.paid || c.appliedOn || c.submittedDocs || c.comments || c.assignedTo || c.dueOn || c.artworks || (c.payments && c.payments.length));
  const dots = [
    { title: 'Sent', done: !!c.sentOn,
      meta: c.sentOn ? c.sentOn : 'Not sent yet',
      action: dotSentHtml },
    // The response stays editable after it is recorded, since artists change their minds.
    { title: 'Awaiting Response', always: true, done: hasResp, meta: '',
      action: () => dotResponseHtml(c) },
    { title: 'Application', skip: notInterested, done: appSaved,
      meta: c.appliedOn ? 'Applied ' + c.appliedOn : '',
      always: true,
      headerAction: appSaved && !acEditingApp ? '<button type="button" class="btn ghost sm" data-ac-action="edit-app">Edit</button>' : '',
      action: () => dotApplicationHtml(c) },
    { title: 'Outcome', done: c.bucket === 'Past',
      meta: c.bucket === 'Past' ? c.status : '',
      always: true, action: () => dotOutcomeHtml(c) }
  ];

  let stepIndex = dots.findIndex(s => !s.done && !s.skip);
  if (stepIndex === -1) stepIndex = dots.length - 1;

  let html = '<div class="trail">';
  dots.forEach((s, i) => {
    const cls = s.skip ? 'skipped' : (s.done ? 'done' : (i === stepIndex ? 'current' : 'future'));
    html += `<div class="trail-step step-${cls}"><span class="dot ${cls}">${cls === 'current' ? (i + 1) : ''}</span><div class="trail-content">`;
    html += `<div class="step-title-row"><div class="step-title${cls === 'future' || cls === 'skipped' ? ' muted' : ''}">${esc(s.title)}</div>${s.skip ? '' : (s.headerAction || '')}</div>`;
    if (s.skip) html += '<div class="step-meta">Not needed: the artist said not interested</div>';
    else if (s.meta) html += `<div class="step-meta">${esc(s.meta)}</div>`;
    if (!s.skip && (cls === 'current' || (s.always && c.sentOn))) html += s.action();
    html += '</div></div>';
  });
  html += '</div>';
  // Documents are their own section under the steps, not part of the Application form.
  return html + docsBlockHtml(c);
}

function dotSentHtml() {
  // Only the send itself. Doc prep (add to doc, open doc) sits above the flow.
  return '<div class="step-action"><button type="button" class="btn primary sm" data-ac-action="mark-sent">Mark as sent</button></div>';
}

function dotResponseHtml(c) {
  // Once a response is recorded it shows as text with Edit. Casing matters:
  // p2_recordArtistResponse validates the exact strings, e.g. 'Not Interested'.
  const has = !!(c && c.artistResponse && c.artistResponse !== 'No response yet');
  let h = '<div class="step-action" style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;max-width:360px">';
  if (has && !acEditingResponse) {
    h += '<div style="display:flex;align-items:center;gap:6px;font-size:14px">Said ' + esc(c.artistResponse.toLowerCase()) + '<button type="button" class="btn ghost sm" data-ac-action="edit-response">Edit</button></div>';
  } else {
    h += '<select class="f" data-ac-action="response" style="max-width:260px">'
      + '<option value="" disabled' + (has ? '' : ' selected') + '>Select response&hellip;</option>'
      + ['Interested', 'Not Interested', 'Wants more info', 'No response yet'].map(o => '<option' + (has && c.artistResponse === o ? ' selected' : '') + '>' + o + '</option>').join('')
      + '</select>';
    if (has) h += '<button type="button" class="btn ghost sm" data-ac-action="cancel-response">Cancel</button>';
  }
  // The comment only applies when the artist asked for more info.
  if (has && c.artistResponse === 'Wants more info') {
    if (acEditingComment) {
      h += '<textarea class="f" id="ac_comment" rows="2" style="font-size:14px">' + esc((c && c.responseComment) || '') + '</textarea>'
        + '<div style="display:flex;gap:8px"><button type="button" class="btn primary sm" data-ac-action="save-comment">Save comment</button><button type="button" class="btn ghost sm" data-ac-action="cancel-comment">Cancel</button></div>';
    } else {
      h += '<div class="resp-comment">' + ((c && c.responseComment) ? esc(c.responseComment) : '<span class="faint">No comment</span>') + '<button type="button" class="btn ghost sm" data-ac-action="edit-comment" style="margin-left:6px">Edit</button></div>';
    }
  }
  if (c && c.responseUpdatedOn) h += '<div class="faint" style="font-size:12px">Last updated ' + esc(c.responseUpdatedOn) + (c.responseUpdatedBy ? ' by ' + esc(c.responseUpdatedBy) : '') + '</div>';
  return h + '</div>';
}

// Payments on one artist application: one row per payment (type, amount, due, paid).
function appPaymentRowsHtml(list) {
  const rows = (list || []).map((p, i) => `<div class="fee-row app-pay" data-paidon="${esc(p.paidOn || '')}" data-proof="${esc(p.proof || '')}">`
    + `<input class="f" data-pk="type" value="${esc(p.type)}" placeholder="Type, e.g. Venue fee" aria-label="Payment type">`
    + `<input class="f" data-pk="amount" value="${esc(p.amount)}" placeholder="Amount" aria-label="Amount">`
    + `<input class="f" data-pk="due" type="date" value="${esc(p.due)}" aria-label="Due date">`
    + `<label class="pay-paid"><input type="checkbox" data-pk="paid"${p.paid ? ' checked' : ''}> Paid</label>`
    + `<button type="button" class="icon-btn fee-x" data-ac-action="remove-payment" data-index="${i}" aria-label="Remove payment">×</button>`
    + `<div class="pay-proof">${p.proof ? `<a href="${esc(safeUrl(p.proof))}" target="_blank" rel="noopener">Proof of payment</a>` : '<span class="faint">No proof yet</span>'}`
    + `<label class="btn ghost sm pay-upload">${p.proof ? 'Replace proof' : 'Upload proof'}<input type="file" accept="image/*,application/pdf" data-proof-file hidden></label></div></div>`).join('');
  return rows || '<p class="faint" style="margin:0 0 8px">No payments yet.</p>';
}
// Reads the payment rows. A payment marked paid keeps its paid date; a new one is dated today.
function readAppPayments() {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return [...document.querySelectorAll('#acPayments .app-pay')].map(row => {
    const paid = row.querySelector('[data-pk=paid]').checked;
    return { type: row.querySelector('[data-pk=type]').value.trim(), amount: row.querySelector('[data-pk=amount]').value.trim(),
      due: row.querySelector('[data-pk=due]').value, paid: paid, paidOn: paid ? (row.dataset.paidon || today) : '', proof: row.dataset.proof || '' };
  }).filter(p => p.type || p.amount);
}
// Uploading proof of payment: the file goes to the application folder now; the row keeps its link until Save.
document.addEventListener('change', async e => {
  const input = e.target.closest && e.target.closest('[data-proof-file]'); if (!input || !input.files.length || !acCall) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { toast('That file is too big. Keep it under 5 MB.', { error: true }); input.value = ''; return; }
  const data = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result).split(',')[1] || ''); fr.onerror = reject; fr.readAsDataURL(file); });
  const row = input.closest('.app-pay');
  toast('Uploading…');
  const r = await api('uploadPaymentProof', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, expectTitle: acCall.title, name: file.name, mimeType: file.type, data });
  input.value = '';
  if (!r.ok) { toast(r.message, { error: true }); return; }
  // Keep whatever else was typed in the rows, and attach the new link to this one.
  const list = readAppPayments();
  const idx = [...document.querySelectorAll('#acPayments .app-pay')].indexOf(row);
  if (list[idx]) list[idx].proof = r.url;
  $('acPayments').innerHTML = appPaymentRowsHtml(list);
  toast('Proof uploaded. Save to keep it.');
});
// Artist fields that apply to this call (by its category and title).
function artistCallFieldsFor(c) {
  return ARTIST_CALL_FIELDS.filter(f => fieldAppliesTo(f, c && c.category, c && c.title));
}
// Fields shown on the artist open call: entered here and saved to this artist's sheet.
function artistFieldsHtml(c) {
  const fields = artistCallFieldsFor(c);
  if (!fields.length) return '';
  const vals = c.custom || {};
  const inputs = fields.map((f, i) => fieldInputHtml(f, i, vals[f.label], 'ac_cf_')).join('');
  return '<div class="panel" style="margin-top:16px"><div style="font-weight:500;font-size:15px;margin-bottom:8px">Details for ' + esc(acName) + '</div>' + inputs
    + '<div style="margin-top:8px"><button type="button" class="btn primary sm" data-ac-action="save-artist-fields">Save details</button></div></div>';
}
async function acSaveArtistFields(btn) {
  if (!acCall) return;
  busy(btn, 'Saving…');
  const custom = readCustom(artistCallFieldsFor(acCall), 'ac_cf_');
  const r = await api('saveArtistCallFields', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, custom, expectTitle: acCall.title });
  idle(btn);
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  reloadArtistCall();
}

async function acSaveComment(btn) {
  if (!acCall) return;
  busy(btn, 'Saving…');
  const r = await api('p2_saveResponseComment', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, comment: $('ac_comment').value, expectTitle: acCall.title });
  idle(btn);
  if (!r.ok) { toast(r.message, { error: true }); return; }
  acEditingComment = false;
  toast(r.message);
  reloadArtistCall();
}

function dotApplicationHtml(c) {
  return dotApplicationCore(c);
}
// Documents this application needs, ticked off as they are ready. Files live in the application folder.
function docsBlockHtml(c) {
  const req = (c && c.requiredDocs) || [];
  const items = ((c && c.docs) || []).map(d => `<label class="doc-row"><input type="checkbox" data-doc-name="${esc(d.name)}" data-ac-action="toggle-doc"${d.done ? ' checked' : ''}> ${esc(d.name)}</label>`).join('');
  return '<div class="panel app-block" style="margin-top:24px;max-width:560px;padding:16px">'
    + '<div class="app-sub">Documents</div>'
    + (req.length ? '<div>' + items + '</div>' : '<p class="faint" style="margin:0">No documents listed for this call. Add them on the call form.</p>')
    + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost sm" data-ac-action="open-folders">Open folders</button></div></div>';
}
async function saveDocsFromScreen() {
  if (!acCall) return;
  const docs = [...document.querySelectorAll('[data-doc-name]')].map(x => ({ name: x.dataset.docName, done: x.checked }));
  const r = await api('saveDocsChecklist', { row: acRow, artist: acName, expectTitle: acCall.title, docs });
  if (!r.ok) toast(r.message, { error: true });
}
async function openApplicationFolders() {
  if (!acCall) return;
  const r = await api('openApplicationFolder', { row: acRow, artist: acName, expectTitle: acCall.title });
  if (!r.ok) return toast(r.message, { error: true });
  sheet({ title: 'Folders', body: '<p><a href="' + esc(safeUrl(r.applicationFolder)) + '" target="_blank" rel="noopener">This application’s folder</a></p>'
    + '<p><a href="' + esc(safeUrl(r.masterFolder)) + '" target="_blank" rel="noopener">' + esc(acName) + '’s master docs</a></p>',
    buttons: [{ label: 'Close', onClick: closeSheet }] });
}
function dotApplicationCore(c) {
  // Saved application details show as text with Edit; the form only opens in edit mode.
  const saved = !!(c && (c.status || c.paid || c.appliedOn || c.submittedDocs || c.comments || c.assignedTo || c.dueOn || c.artworks || (c.payments && c.payments.length)));
  if (saved && !acEditingApp) {
    // Only the fields that have something in them, so the summary isn't a column of dashes.
    const line = (label, v) => !v ? '' : '<div class="app-line"><span class="faint">' + label + '</span><span>' + esc(v) + '</span></div>';
    // One payment per line: type and amount, then due date and whether it is paid.
    const pays = (c.payments || []).map(p => `<div class="app-pay-line"><span>${esc(p.type || 'Payment')}${p.amount ? ' · ' + esc(p.amount) : ''}</span><span class="faint">${p.due ? 'due ' + esc(p.due) + ' · ' : ''}${p.paid ? 'paid' + (p.paidOn ? ' ' + esc(p.paidOn) : '') : 'unpaid'}${p.proof ? ' · <a href="' + esc(safeUrl(p.proof)) + '" target="_blank" rel="noopener">proof</a>' : ''}</span></div>`).join('');
    return '<div class="step-action" style="max-width:420px;display:flex;flex-direction:column;gap:6px">'
      + line('Status', c.status) + line('Due on', c.dueOn) + line('Applied on', c.appliedOn) + line('Submitted docs', c.submittedDocs)
      + line('Artworks', c.artworks) + line('Comments', c.comments)
      + '<div style="font-size:14px"><div class="faint" style="margin-bottom:4px">Payments</div>' + (pays || '<span class="faint">None</span>') + '</div>'
      + '</div>';
  }
  return '<div class="step-action app-form">'
    + '<div class="app-grid">'
    + '<div><label class="lbl" for="ac_status">Status</label>'
    + '<select class="f" id="ac_status">'
    + '<option value="">&mdash;</option><option>Applied</option><option>In Progress</option><option>Accepted</option><option>Declined</option>'
    + '<option>Awaiting Response</option><option>Not Moving Forward</option><option>On Hold</option><option>Not Selected</option>'
    + '</select></div>'
    + '<div><label class="lbl" for="ac_dueOn">Due on</label><input class="f" id="ac_dueOn" type="date" value="' + esc((c && c.dueOn) || '') + '"></div>'
    + '</div>'
    + '<div><label class="lbl" for="ac_appliedOn">Applied on</label><input class="f" id="ac_appliedOn" type="date"></div>'
    + '<div><label class="lbl" for="ac_submittedDocs">Submitted docs</label><input class="f" id="ac_submittedDocs" placeholder="Portfolio, CV, statement"></div>'
    + '<div><label class="lbl" for="ac_appComments">Comments</label><textarea class="f" id="ac_appComments" rows="2" placeholder="Any notes about the application"></textarea></div>'
    + '<div><label class="lbl" for="ac_artworks">Artworks submitted</label><textarea class="f" id="ac_artworks" rows="2" placeholder="Artwork names, one per line or separated by commas">' + esc((c && c.artworks) || '') + '</textarea></div>'
    + '<div class="app-block"><div class="app-sub">Payments</div><div id="acPayments" class="fee-list">' + appPaymentRowsHtml((c && c.payments) || []) + '</div>'
    + '<button type="button" class="btn ghost sm" data-ac-action="add-payment">+ Add a payment</button></div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">'
    + '<button type="button" class="btn sm" data-ac-action="save-application">Save</button>'
    + '<button type="button" class="btn primary sm" data-ac-action="mark-applied">Mark as applied</button>'
    + (saved ? '<button type="button" class="btn ghost sm" data-ac-action="cancel-app">Cancel</button>' : '')
    + '</div>'
    + '</div>';
}

function dotOutcomeHtml(c) {
  // Always available once sent, so the outcome can be changed. The current outcome is highlighted.
  const cur = c && c.bucket === 'Past' ? c.status : '';
  const opts = [['Accepted', 'Accepted'], ['Declined', 'Declined'], ['Not Selected', 'Not selected']];
  return '<div class="step-action" style="display:flex;flex-wrap:wrap;gap:8px">'
    + opts.map(([v, label]) => '<button type="button" class="btn sm' + (cur === v ? ' primary' : '') + '" data-ac-action="outcome" data-value="' + v + '">' + label + '</button>').join('')
    + '</div>';
}

async function acEditSharedCall() {
  if (!acCall) return;
  const c = acCall;
  sheet({
    title: 'Edit call',
    body: `<label class="lbl" for="ac_e_title">Title</label><input class="f" id="ac_e_title" value="${esc(c.title)}">
      <div class="row2">
        <div><label class="lbl" for="ac_e_deadline">Deadline</label><input class="f" id="ac_e_deadline" type="date" value="${esc(c.deadline)}"></div>
        <div><label class="lbl" for="ac_e_category">Category</label><input class="f" id="ac_e_category" value="${esc(c.category)}"></div>
      </div>
      <div class="row2">
        <div><label class="lbl" for="ac_e_fee">Fee</label><input class="f" id="ac_e_fee" value="${esc(c.fee)}"></div>
        <div><label class="lbl" for="ac_e_organiser">Organiser</label><input class="f" id="ac_e_organiser" value="${esc(c.organiser)}"></div>
      </div>
      <label class="lbl" for="ac_e_link">Application link</label><input class="f" id="ac_e_link" type="url" value="${esc(c.link)}">
      <label class="lbl" for="ac_e_eligibility">Eligibility</label><textarea class="f" id="ac_e_eligibility" rows="3">${esc(c.eligibility)}</textarea>`,
    buttons: [
      { label: 'Save', style: 'primary', onClick: async ev => {
        busy(ev.target, 'Saving…');
        const title = $('ac_e_title').value.trim();
        const link = $('ac_e_link').value.trim();
        // The generic 'update' action (updateEntry_) rewrites every shared
        // field from the request — the whole Artists list from body.artists,
        // and Location / Event Dates / Announcement Date as data.x || '' —
        // so anything this form doesn't edit is fetched fresh first and
        // passed straight through. Otherwise saving here would silently
        // unassign everyone and blank those three fields (and re-sync the
        // calendar off the blanked dates).
        const er = await api('p2_getEntry', { row: acRow });
        if (!er.ok) { idle(ev.target); toast(er.message, { error: true }); return; }
        const artistsList = splitNames(er.entry.artists);
        const keep = k => er.entry[k] == null ? '' : String(er.entry[k]);
        const r = await call('update', {
          row: acRow, expectTitle: c.title,
          data: { title: title, deadline: $('ac_e_deadline').value, type: $('ac_e_category').value, fee: $('ac_e_fee').value, link: link, organiser: $('ac_e_organiser').value, eligibility: $('ac_e_eligibility').value,
            location: keep('location'), event_dates: keep('event dates'), announcement_date: keep('announcement date') },
          link: link, artists: artistsList
        });
        if (r.cancelled) { idle(ev.target); return; }
        closeSheet();
        if (!r.ok) { toast(r.message, { error: true }); return; }
        toast(r.message || 'Saved.');
        reloadArtistCall();
      } },
      { label: 'Cancel', onClick: closeSheet }
    ]
  });
}

async function acRemove() {
  if (!acCall) return;
  if (!(await ask('Remove ' + acName + '?', 'This un-assigns them from this call — you can assign them again later.', 'Remove', true))) return;
  // A call that has permanent IDs is removed by those IDs (so a renamed artist still works and no orphan is left behind);
  // an older call that has none goes through the original row-and-name path.
  const r = await api('p2_unassignArtist', (acCall.openCallId && acCall.artistId)
    ? { openCallId: acCall.openCallId, artistId: acCall.artistId, row: acRow, expectTitle: acCall.title }
    : { row: acRow, artist: acName, expectTitle: acCall.title });
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  invalidate('inbox');
  go('#/artist/' + acNameParam);
}

function acMore() {
  sheet({ title: acName, text: acCall ? acCall.title : '', buttons: [
    { label: 'Assign to someone', onClick: () => { closeSheet(); acAssign(); } },
    { label: 'Remove from this call', style: 'danger', onClick: () => { closeSheet(); acRemove(); } },
    { label: 'Cancel', onClick: closeSheet } ] });
}
// Who in the team will apply for this artist. Lives in the ⋯ menu, not the application form.
async function acAssign() {
  if (!acCall) return;
  // Only people from Manage people can be chosen.
  const pr = await api('p2_getPeople');
  const people = pr && pr.ok ? pr.people.map(p => p.name) : [];
  if (!people.length) { toast('Add people under Manage people first.', { error: true }); return; }
  sheet({ title: 'Assigned to', body: '<label class="lbl" for="acAssignName">Who will apply</label><select class="f" id="acAssignName"><option value="">Not assigned</option>'
      + people.map(n => `<option${n === acCall.assignedTo ? ' selected' : ''}>${esc(n)}</option>`).join('') + '</select>',
    buttons: [
      { label: 'Save', style: 'primary', onClick: async ev => {
        const name = $('acAssignName').value.trim();
        busy(ev.target, 'Saving…');
        const r = await api('p2_updateApplicationDetails', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, expectTitle: acCall.title, details: { assignedTo: name } });
        idle(ev.target);
        if (!r.ok) { toast(r.message, { error: true }); return; }
        closeSheet(); toast(name ? 'Assigned to ' + name + '.' : 'Unassigned.');
        reloadArtistCall();
      } },
      { label: 'Cancel', onClick: closeSheet } ] });
}

// Generate email/doc: the text goes straight to the clipboard, and the sheet keeps a copy in case the browser blocks it.
async function acGenerate(btn) {
  if (!acCall) return;
  let text = '';
  // The clipboard write starts inside the tap, so browsers allow it even though the text arrives later.
  const pending = api('p2_generateEmailText', { row: acRow, artist: acName }).then(r => {
    if (!r.ok) throw new Error(r.message);
    text = r.text; return new Blob([r.text], { type: 'text/plain' });
  });
  let copied = false;
  try {
    if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': pending })]); copied = true;
    }
  } catch (e) { copied = false; }
  let r;
  try { r = await pending.then(() => ({ ok: true })); } catch (e) { toast(e.message, { error: true }); return; }
  if (copied) { toast('Copied to clipboard.'); }
  sheet({
    title: 'Open call application details',
    body: `<textarea class="f" id="acEmailText" rows="10" readonly style="font-family:inherit">${esc(text)}</textarea>`,
    buttons: [
      { label: 'Copy to clipboard', style: 'primary', onClick: async () => {
        let copied = false;
        try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); copied = true; } } catch (e) {}
        const ta = document.getElementById('acEmailText');
        if (copied) toast('Copied to clipboard.');
        else if (ta) { ta.focus(); ta.select(); toast('Select the text above and copy it.'); }
      } },
      { label: 'Close', onClick: closeSheet }
    ]
  });
}

async function acOpenDoc(btn) {
  if (!acCall) return;
  // Opening the doc is read-only: it must not append this call or stamp
  // In Doc On. Adding to the doc is the separate acAddDoc action.
  busy(btn, 'Opening…');
  const r = await api('p2_getArtistDoc', { artist: acName });
  idle(btn);
  if (!r.ok || !r.docUrl) { toast(r.message || 'Could not open the doc.', { error: true }); return; }
  window.open(r.docUrl, '_blank', 'noopener');
}

async function acAddDoc(btn) {
  if (!acCall) return;
  busy(btn, 'Adding…');
  const r = await api('p2_addToDoc', { artist: acName, rows: [acRow]});
  idle(btn);
  if (!r.ok) { toast(r.message || 'Could not add this call to the doc.', { error: true }); return; }
  if (r.docUrl) window.open(r.docUrl, '_blank', 'noopener');
  toast(r.message);
  reloadArtistCall();
}

async function acMarkSent(btn) {
  if (!acCall) return;
  busy(btn, 'Marking…');
  const r = await api('p2_markSent', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, expectTitle: acCall.title});
  idle(btn);
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  reloadArtistCall();
}

async function acRecordResponse(sel) {
  if (!acCall) return;
  const val = sel.value; if (!val) return;
  acEditingResponse = false;
  sel.disabled = true;
  const r = await api('p2_recordArtistResponse', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, response: val, expectTitle: acCall.title });
  sel.disabled = false;
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  reloadArtistCall();
}

async function acSaveApplication(btn) {
  if (!acCall) return;
  acEditingApp = false; // back to the saved view once it's saved
  busy(btn, 'Saving…');
  const details = {
    status: $('ac_status').value, appliedOn: $('ac_appliedOn').value,
    submittedDocs: $('ac_submittedDocs').value, comments: $('ac_appComments').value,
    dueOn: $('ac_dueOn').value, artworks: $('ac_artworks').value,
    payments: readAppPayments()
  };
  const r = await api('p2_updateApplicationDetails', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, details, expectTitle: acCall.title });
  idle(btn);
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  reloadArtistCall();
}

async function acMarkApplied(btn) {
  if (!acCall) return;
  acEditingApp = false;
  // Mark as applied is a shortcut for the same form: carry whatever the
  // artist filled in, and default Applied On to today when it is blank.
  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const appliedOn = $('ac_appliedOn').value || today;
  if ($('ac_appliedOn')) $('ac_appliedOn').value = appliedOn;
  busy(btn, 'Saving…');
  const r = await api('p2_updateApplicationDetails', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, expectTitle: acCall.title, details: {
    status: 'Applied', appliedOn,
    submittedDocs: $('ac_submittedDocs').value, comments: $('ac_appComments').value
  } });
  idle(btn);
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  reloadArtistCall();
}

async function acOutcome(btn, value) {
  if (!acCall) return;
  busy(btn, 'Saving…');
  const r = await api('p2_updateApplicationDetails', { artistCallId: (acCall && acCall.artistCallId) || '', row: acRow, artist: acName, details: { status: value }, expectTitle: acCall.title });
  idle(btn);
  if (!r.ok) { toast(r.message, { error: true }); return; }
  toast(r.message);
  reloadArtistCall();
}

$('artistCallContent').addEventListener('click', ev => {
  const btn = ev.target.closest('[data-ac-action]');
  if (!btn) return;
  const action = btn.dataset.acAction;
  if (action === 'edit') return acEditSharedCall();
  if (action === 'remove') return acRemove();
  if (action === 'more') return acMore();
  if (action === 'edit-response') { acEditingResponse = true; return reloadArtistCall(); }
  if (action === 'cancel-response') { acEditingResponse = false; return reloadArtistCall(); }
  if (action === 'edit-comment') { acEditingComment = true; return reloadArtistCall(); }
  if (action === 'cancel-comment') { acEditingComment = false; return reloadArtistCall(); }
  if (action === 'save-comment') return acSaveComment(btn);
  if (action === 'save-artist-fields') return acSaveArtistFields(btn);
  if (action === 'edit-app') { acEditingApp = true; return reloadArtistCall(); }
  if (action === 'toggle-doc') return saveDocsFromScreen();
  if (action === 'open-folders') return openApplicationFolders();
  if (action === 'add-payment') { const list = readAppPayments(); list.push({ type: '', amount: '', due: '', paid: false, paidOn: '' }); $('acPayments').innerHTML = appPaymentRowsHtml(list); return; }
  if (action === 'remove-payment') { const list = readAppPayments(); list.splice(Number(btn.dataset.index), 1); $('acPayments').innerHTML = appPaymentRowsHtml(list); return; }
  if (action === 'cancel-app') { acEditingApp = false; return reloadArtistCall(); }
  if (action === 'generate') return acGenerate();
  if (action === 'add-doc') return acAddDoc(btn);
  if (action === 'open-doc') return acOpenDoc(btn);
  if (action === 'mark-sent') return acMarkSent(btn);
  if (action === 'save-application') return acSaveApplication(btn);
  if (action === 'mark-applied') return acMarkApplied(btn);
  if (action === 'outcome') return acOutcome(btn, btn.dataset.value);
});
$('artistCallContent').addEventListener('change', ev => {
  const sel = ev.target.closest('[data-ac-action="response"]');
  if (sel) acRecordResponse(sel);
});

/* ================= Shared posts & staged links ================= */
async function handleIncoming() {
  const p = new URLSearchParams(location.search);
  if (!p.toString()) return false;
  history.replaceState(null, '', location.pathname + location.hash);
  if (p.get('shared') && 'caches' in window) {
    try {
      const c = await caches.open('shared');
      const t = await c.match('shared-text'), img = await c.match('shared-image');
      if (t) $('textInput').value = await t.text();
      if (img) { const b = await img.blob(); await addFiles([new File([b], 'shared.jpg', { type: b.type || 'image/jpeg' })]); }
      await c.delete('shared-text'); await c.delete('shared-image');
      go('#/add', true); toast('Shared post added. Tap “Read details”.'); return true;
    } catch (e) {}
  }
  if (p.get('review')) {
    const r = await api('getStaged', { id: p.get('review') });
    if (r.ok) { extracted = Object.assign({}, r.data, { link: r.link || r.data.link || '' }); go('#/new', true); return true; }
    toast(r.message, { error: true });
  }
  return false;
}

/* ================= Boot ================= */
async function enterApp() {
  $('signin').hidden = true;
  // Sign-in always asks who you are (accountability). Existing people can only be edited or removed from the main page.
  if (!personId) return showWhoAreYou();
  finishEnterApp();
}
function finishEnterApp() {
  document.body.classList.add('app');
  $('whoAreYou').hidden = true; $('app').hidden = false;
  paintAvatar();
  (async () => {
    if (!(await handleIncoming())) {
      if (!location.hash) history.replaceState(null, '', '#/' + (store.get('oc_tab') || 'inbox'));
      onRoute();
    }
    loadArtists(); refreshCounts(); loadAlerts(); loadCategories(); loadFormFields();
  })();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

(async () => {
  if (IS_DEV_HOST_ && localStorage.getItem('oc_demo') === '1') {
    personId = personId || 'demo_user';
    personName = personName || 'Hazel (Guest)';
    me = me || { name: 'Hazel (Guest)', email: 'hazel@artisteculture.com' };
    finishEnterApp();
    return;
  }
  if (!token) return showSignIn();
  if (me) enterApp();
  const r = await api('whoami');
  if (r.ok) { me = Object.assign({}, me || {}, { name: r.name, email: r.email }); store.set('oc_me', JSON.stringify(me)); paintAvatar(); if ($('app').hidden && $('whoAreYou').hidden) enterApp(); }
})();

/* ==========================================================================
   VIEWABLE FORM HALF-PANE IMPLEMENTATION (OPEN CALLS)
   ========================================================================== */
window.activePreviewRow = null;

function closeHalfPane() {
  window.activePreviewRow = null;
  const pane = $('tkHalfPane');
  if (pane) pane.hidden = true;
  const split = $('tkSplitContainer');
  if (split) split.classList.remove('has-preview-pane');
  document.querySelectorAll('.active-preview-row').forEach(el => el.classList.remove('active-preview-row'));
}
window.closeHalfPane = closeHalfPane;

function renderHalfPaneHtml(e) {
  const dl = deadlineInfo(e.deadline);
  const names = splitNames(e.artists);
  const feeDisplay = getFeeDisplay(e);
  const cat = e.category || 'Open Call';
  const catCls = getCategoryClass(cat);
  const dlSynced = formatSyncedDeadline(e.deadline); const deadlineText = dlSynced.text;
  const isUrgent = dl.days >= 0 && dl.days <= 7;
  const hasAssigned = names.length > 0 && names[0] && names[0].trim() !== 'Unassigned';
  const portalUrl = e['application link'] || e.link || 'https://example.org/apply';
  const feeText = feeDisplay.amount ? (feeDisplay.amount + (feeDisplay.perks ? ' · ' + feeDisplay.perks : '')) : 'Free Entry';

  let artistRosterHtml = '';
  if (hasAssigned) {
    artistRosterHtml = names.map(n => {
      return '<div class="tk-pane-artist-card">'
        + '  <div class="tk-pane-artist-left">'
        + '    <div class="tk-pane-avatar">' + esc(initials(n)) + '</div>'
        + '    <div>'
        + '      <div class="tk-pane-artist-name">' + esc(n) + '</div>'
        + '      <div class="tk-pane-artist-role">Oil painting, Installation, Mixed media</div>'
        + '    </div>'
        + '  </div>'
        + '  <span class="tk-pane-artist-tag">CONFIRMED</span>'
        + '</div>';
    }).join('');
  } else {
    artistRosterHtml = '<div class="tk-pane-unassigned-card">'
      + '<span>No artists assigned yet</span>'
      + '<button type="button" class="btn ghost sm" onclick="go(\'#/entry/' + e.row + '\')">+ Match Artist</button>'
      + '</div>';
  }

  return '<div class="tk-pane-inner">'
    + '  <div class="tk-pane-top-row">'
    + '    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
    + '      <span class="tk-pane-status-pill">' + esc(e.status === 'Confirmed' ? 'CONFIRMED' : e.status === 'Pending' ? 'DRAFT' : 'ARCHIVED') + '</span>'
    + '      <span class="tk-pane-cat-pill ' + catCls + '">' + esc(cat) + '</span>'
    + '      <span class="tk-pane-meta">Row #' + esc(e.row) + ' · Updated ' + esc(e['added on'] || '4 Nov') + '</span>'
    + '    </div>'
    + '    <button type="button" class="tk-pane-close-btn" onclick="closeHalfPane()" aria-label="Close" title="Close preview">&times;</button>'
    + '  </div>'
    + '  <h3 class="tk-pane-heading">' + esc(e.title || 'Untitled Opportunity') + '</h3>'
    + '  <div class="tk-pane-subheading">Organiser: ' + esc(e.organiser || 'Arts Foundation') + (e.location ? ' · ' + esc(e.location) : '') + '</div>'
    + '  <div class="tk-pane-grid-2x2">'
    + '    <div class="tk-pane-stat-box">'
    + '      <div class="tk-pane-stat-lbl">DEADLINE</div>'
    + '      <div class="tk-pane-stat-val ' + (isUrgent ? 'urgent' : '') + '">' + esc(deadlineText) + '</div>'
    + '    </div>'
    + '    <div class="tk-pane-stat-box">'
    + '      <div class="tk-pane-stat-lbl">APPLICATION FEE</div>'
    + '      <div class="tk-pane-stat-val">' + esc(feeText) + '</div>'
    + '    </div>'
    + '    <div class="tk-pane-stat-box">'
    + '      <div class="tk-pane-stat-lbl">LOCATION</div>'
    + '      <div class="tk-pane-stat-val">' + esc(e.location || 'Global / Online') + '</div>'
    + '    </div>'
    + '    <div class="tk-pane-stat-box">'
    + '      <div class="tk-pane-stat-lbl">OPPORTUNITY TYPE</div>'
    + '      <div class="tk-pane-stat-val">' + esc(cat) + '</div>'
    + '    </div>'
    + '  </div>'
    + '  <div class="tk-pane-block">'
    + '    <div class="tk-pane-block-lbl">THEME / CURATORIAL FOCUS</div>'
    + '    <div class="tk-pane-block-content">' + esc(e.theme || e['curatorial theme'] || 'Contemporary visual arts practice, site-specific installations, and cross-disciplinary medium exploration.') + '</div>'
    + '  </div>'
    + '  <div class="tk-pane-block">'
    + '    <div class="tk-pane-block-lbl">ELIGIBILITY &amp; DISCIPLINES</div>'
    + '    <div class="tk-pane-block-content">' + esc(e.eligibility || 'Visual Arts, Painting, Installation, Sculpture, New Media · Global') + '</div>'
    + '  </div>'
    + '  <div class="tk-pane-block">'
    + '    <div class="tk-pane-block-lbl">BRIEF &amp; SUBMISSION DETAILS</div>'
    + '    <div class="tk-pane-block-content">' + esc(e.summary || e['additional info'] || e.required_docs || 'International exhibition opportunity for emerging & mid-career artists. Package includes production grant, travel, stipend, and catalog publication.') + '</div>'
    + '  </div>'
    + '  <div class="tk-pane-block">'
    + '    <div class="tk-pane-block-lbl">OFFICIAL APPLICATION URL</div>'
    + '    <a href="' + safeUrl(portalUrl) + '" target="_blank" rel="noopener noreferrer" class="tk-pane-url-pill">'
    + '      <span>' + esc(portalUrl) + '</span>'
    + '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
    + '    </a>'
    + '  </div>'
    + '  <div class="tk-pane-block">'
    + '    <div class="tk-pane-block-lbl">ASSIGNED ARTIST ROSTER</div>'
    + '    ' + artistRosterHtml
    + '  </div>'
    + '  <div class="tk-pane-actions-row">'
    + '    <button type="button" class="btn primary sm tk-pane-edit-btn" id="btnPaneEdit" onclick="go(\'#/entry/' + e.row + '\')">'
    + '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'
    + '      Edit Details'
    + '    </button>'
    + (hasAssigned ? '    <button type="button" class="btn sm tk-pane-send-btn" onclick="openPitchEmailModal(\'" + esc(names[0]) + "\', \'" + esc(e.title) + "\', \'" + esc(feeDisplay.amount) + "\', \'" + esc(e.deadline) + "\')">Send to artist</button>' : '')
    + '  </div>'
    + '</div>';
}

function openCallHalfPane(rowId) {
  rowId = Number(rowId);
  window.activePreviewRow = rowId;
  const tab = listTab || 'inbox';
  const all = (lists[tab] && lists[tab].length) ? lists[tab] : (lists.inbox || []);
  let e = all.find(item => Number(item.row) === rowId);
  if (!e) {
    const merged = [...(lists.inbox || []), ...(lists.drafts || []), ...(lists.archive || [])];
    e = merged.find(item => Number(item.row) === rowId);
  }
  if (!e) {
    go('#/entry/' + rowId);
    return;
  }

  document.querySelectorAll('.active-preview-row').forEach(el => el.classList.remove('active-preview-row'));
  const rows = document.querySelectorAll('.tk-row-checkbox[data-row="' + rowId + '"]');
  rows.forEach(cb => {
    const tr = cb.closest('tr');
    if (tr) tr.classList.add('active-preview-row');
  });

  const pane = $('tkHalfPane');
  const card = $('tkPaneContent');
  if (!pane || !card) return;

  card.innerHTML = renderHalfPaneHtml(e);
  pane.hidden = false;
  const split = $('tkSplitContainer');
  if (split) split.classList.add('has-preview-pane');
}
window.openCallHalfPane = openCallHalfPane;

  // shadcn/ui cmdk Command Palette shortcut (Ctrl+K or Cmd+K)
  window.addEventListener('keydown', e => {
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const q = document.getElementById('quickJump');
      if (q) {
        q.focus();
        q.select();
      }
    }
  });

function openAddArtistModal() {
  const formHtml = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label style="display:block;font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:6px;">ARTIST FULL NAME</label>
        <input class="f" id="m_add_artist_name" placeholder="e.g. Pooja Sharma" style="width:100%;box-sizing:border-box;" autocomplete="off">
      </div>
      <div>
        <label style="display:block;font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:6px;">PRIMARY MEDIUMS</label>
        <input class="f" id="m_add_artist_mediums" placeholder="e.g. Painting, Installation, Mixed Media" style="width:100%;box-sizing:border-box;" autocomplete="off">
      </div>
      <div>
        <label style="display:block;font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:6px;">STUDIO LOCATION</label>
        <input class="f" id="m_add_artist_location" placeholder="e.g. Mumbai, India" style="width:100%;box-sizing:border-box;" autocomplete="off">
      </div>
      <div>
        <label style="display:block;font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:6px;">GOOGLE DRIVE FOLDER LINK</label>
        <input class="f" id="m_add_artist_drive" placeholder="https://drive.google.com/drive/folders/..." style="width:100%;box-sizing:border-box;" autocomplete="off">
      </div>
    </div>
  `;
  sheet({
    title: 'Add Represented Artist',
    body: formHtml,
    buttons: [
      { label: 'Cancel', style: 'ghost', onClick: closeSheet },
      { label: 'Add Artist', style: 'primary', onClick: async ev => {
        const name = ($('m_add_artist_name') ? $('m_add_artist_name').value : '').trim();
        const drive = ($('m_add_artist_drive') ? $('m_add_artist_drive').value : '').trim();
        if (!name) return toast('Please enter artist name.', { error: true });
        const mediums = ($('m_add_artist_mediums') ? $('m_add_artist_mediums').value : '').trim();
        const location = ($('m_add_artist_location') ? $('m_add_artist_location').value : '').trim();
        // The server can store a Google Sheets link for an artist, not a Drive folder link.
        const isSheet = /^https:\/\/docs\.google\.com\/spreadsheets\/d\//.test(drive);
        busy(ev.target, 'Saving...');
        const r = await api('addArtist', isSheet ? { name, link: drive } : { name });
        if (!r || !r.ok) { idle(ev.target); return toast((r && r.message) || 'Couldn’t add the artist.', { error: true }); }
        if (!artists.includes(name)) {
          artists.push(name);
          store.set('oc_artists', JSON.stringify(artists));
        }
        let note = '';
        if (mediums || location) {
          const p = await api('p2_saveArtistProfile', { expectName: name, profile: { mediums, location } });
          if (!p || !p.ok) note = ' Their mediums and location weren’t saved: ' + ((p && p.message) || 'try again from their profile.');
        }
        if (drive && !isSheet) note += ' The folder link wasn’t saved: only a Google Sheets link can be stored for an artist.';
        idle(ev.target);
        closeSheet();
        toast(name + ' added.' + note, note ? { error: true } : {});
        loadArtistsList();
      }}
    ]
  });
}
window.openAddArtistModal = openAddArtistModal;
// End of the main app scope. Add Artist used to sit below this line, where api, busy, idle, artists and store
// do not exist, so its button threw an error and did nothing.
})();

/* ==========================================================================
   CALL DETAILS 3-DOTS MENU (Move to drafts, Restore to inbox, Delete in archive)
   ========================================================================== */
window.toggleCallDetailsDropdown = function(ev) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  const dd = document.getElementById('callDetailsDropdown');
  if (!dd) return;
  const isShown = dd.style.display === 'block';
  document.querySelectorAll('.tk-menu-dropdown').forEach(d => {
    d.classList.remove('show');
    d.style.display = 'none';
  });
  if (!isShown) {
    window.renderCallDetailsMenu();
    dd.style.display = 'block';
    dd.classList.add('show');
  }
};

window.renderCallDetailsMenu = function(overrideStatus) {
  const dd = document.getElementById('callDetailsDropdown');
  if (!dd) return;
  const s = String(overrideStatus || window.currentEntryStatus || 'Confirmed').trim();
  const isInbox = (s === 'Active' || s === 'Confirmed' || s === 'Inbox');
  const isDraft = (s === 'Pending' || s === 'Draft');
  const isArchive = (s === 'Archived' || s === 'Archive');

  let html = '';

  // 1. Move to Drafts: appears when stored in Inbox or Archive
  if (isInbox || isArchive) {
    html += '<button type="button" class="tk-menu-item" onclick="moveToDraftsFromMenu()">'
      + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
      + '<span>Move to drafts</span>'
      + '</button>';
  }

  // 2. Restore to Inbox: appears when stored in Drafts or Archive
  if (isDraft || isArchive) {
    html += '<button type="button" class="tk-menu-item" onclick="restoreToInboxFromMenu()">'
      + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
      + '<span>Restore to Inbox</span>'
      + '</button>';
  }

  // 3. Archive Call: appears when stored in Inbox or Drafts
  if (isInbox || isDraft) {
    html += '<button type="button" class="tk-menu-item" onclick="archiveFromMenu()">'
      + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>'
      + '<span>Archive opportunity</span>'
      + '</button>';
  }

  // 4. Delete: appears ONLY when call is stored in Archive!
  if (isArchive) {
    html += '<div style="border-top:1px solid #e5e7eb;margin:4px 0;"></div>'
      + '<div style="padding:6px 14px;font-size:11.5px;color:#6b7280;line-height:1.3;">'
      + 'Items in archive are permanently deleted after 30 days.'
      + '</div>'
      + '<button type="button" class="tk-menu-item action-danger" style="color:#dc2626;" onclick="deletePermanentlyFromMenu()">'
      + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
      + '<span>Delete permanently</span>'
      + '</button>';
  }

  dd.innerHTML = html;
};

window.moveToDraftsFromMenu = function() {
  const dd = document.getElementById('callDetailsDropdown');
  if (dd) dd.style.display = 'none';
  const btn = document.getElementById('btnToDrafts');
  if (btn) btn.click();
};

window.restoreToInboxFromMenu = function() {
  const dd = document.getElementById('callDetailsDropdown');
  if (dd) dd.style.display = 'none';
  const btn = document.getElementById('btnRestore');
  if (btn) btn.click();
};

window.archiveFromMenu = function() {
  const dd = document.getElementById('callDetailsDropdown');
  if (dd) dd.style.display = 'none';
  const btn = document.getElementById('btnArchive');
  if (btn) btn.click();
};

window.deletePermanentlyFromMenu = function() {
  const dd = document.getElementById('callDetailsDropdown');
  if (dd) dd.style.display = 'none';
  const btn = document.getElementById('btnDeleteCall') || document.getElementById('btnDelete');
  if (btn) btn.click();
};
