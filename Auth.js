function googleSignIn_(credential) {
  if (!credential) return { ok: false, message: 'Sign-in didn�?Tt complete. Try again.' };
  let info;
  try { const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential), { muteHttpExceptions: true }); if (res.getResponseCode() !== 200) return { ok: false, message: 'Sign-in failed.' }; info = JSON.parse(res.getContentText()); } catch (err) { return failed('Google sign-in', err, {}); }
  if (info.aud !== CONFIG.GOOGLE_CLIENT_ID) { logProblem('Google sign-in', 'error', 'Token mismatch: ' + info.aud, {}); return { ok: false, message: 'Sign-in isn�?Tt set up correctly.' }; }
  if (Number(info.exp) * 1000 < Date.now()) return { ok: false, message: 'Sign-in expired.' };
  if (String(info.email_verified) !== 'true') return { ok: false, message: 'Email isn�?Tt verified.' };
  const email = String(info.email || '').toLowerCase();
  if (info.hd !== CONFIG.ALLOWED_DOMAIN || !email.endsWith('@' + CONFIG.ALLOWED_DOMAIN)) return { ok: false, message: 'Use your ' + CONFIG.ALLOWED_DOMAIN + ' account.' };
  const name = String(info.name || info.given_name || email.split('@')[0]).slice(0, 60), picture = String(info.picture || '');
  let tr = teamRow_(email);
  if (tr && tr.status === 'Removed') return { ok: false, message: 'Access removed.' };
  if (!tr) { const status = CONFIG.AUTO_APPROVE_DOMAIN ? 'Approved' : 'Pending'; getTeam_().appendRow([safe_(name), email, status, new Date(), CONFIG.AUTO_APPROVE_DOMAIN ? 'domain' : '']); clearTeamCache_(email); tr = teamRow_(email); if (status === 'Pending') askApprovers_(name, email); }
  const token = issueToken_(email);
  if (tr.status === 'Approved') return { ok: true, status: 'approved', token: token, name: tr.name || name, email: email, picture: picture };
  return { ok: true, status: 'pending', token: token, name: name, email: email, picture: picture, message: 'Your request has been sent to the team.' };
}
function issueToken_(email) { const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); PropertiesService.getScriptProperties().setProperty('tok_' + token, JSON.stringify({ e: email, t: Date.now() })); return token; }
function signOut_(token) { if (token && String(token).length >= 40) PropertiesService.getScriptProperties().deleteProperty('tok_' + token); return { ok: true }; }
function member_(token) {
  const fail = { ok: false, auth: true, message: 'Sign in to continue.' }; if (!token || String(token).length < 40) return fail;
  const props = PropertiesService.getScriptProperties(), raw = props.getProperty('tok_' + token); if (!raw) return fail;
  let rec; try { rec = JSON.parse(raw); } catch (e) { props.deleteProperty('tok_' + token); return fail; }
  const age = Date.now() - Number(rec.t || 0); if (age > CONFIG.TOKEN_EXPIRY_DAYS * 86400000) { props.deleteProperty('tok_' + token); return { ok: false, auth: true, message: 'Sign in again.' }; }
  // Fixed session length: no renewal on use. Sign-in is required again after TOKEN_EXPIRY_DAYS.
  const tr = teamRow_(rec.e, true); if (!tr || tr.status === 'Removed') return { ok: false, auth: true, message: 'Access removed.' };
  if (tr.status !== 'Approved') return { ok: false, auth: true, pending: true, message: 'Waiting for approval.' };
  return { ok: true, email: rec.e, name: tr.name };
}
function whoami_(token) { const m = member_(token); if (m.ok) return { ok: true, status: 'approved', name: m.name, email: m.email }; return { ok: false, status: m.pending ? 'pending' : 'signedout', message: m.message }; }
function getTeam_() { const ss = SpreadsheetApp.getActive(); let t = ss.getSheetByName(CONFIG.TEAM_TAB); if (!t) { t = ss.insertSheet(CONFIG.TEAM_TAB); t.appendRow(['Name', 'Email', 'Status', 'Requested On', 'Approved By']); t.getRange(1, 1, 1, 5).setFontWeight('bold'); t.setFrozenRows(1); CONFIG.APPROVERS.forEach(function (em) { t.appendRow([em.split('@')[0], em, 'Approved', new Date(), 'setup']); }); } return t; }
function teamRow_(email, fresh) { email = String(email || '').toLowerCase(); const cache = CacheService.getScriptCache(), cached = fresh ? null : cache.get('team_' + email); if (cached) return JSON.parse(cached); const t = getTeam_(); if (t.getLastRow() < 2) return null; const rows = t.getRange(2, 1, t.getLastRow() - 1, 5).getValues(); for (let i = 0; i < rows.length; i++) { if (String(rows[i][1]).trim().toLowerCase() === email) { const res = { row: i + 2, name: String(rows[i][0]), status: String(rows[i][2]).trim() }; cache.put('team_' + email, JSON.stringify(res), 300); return res; } } return null; }
function clearTeamCache_(email) { CacheService.getScriptCache().remove('team_' + String(email || '').toLowerCase()); }
function onTeamOrArtistsEdit(e) { try { if (e.range.getSheet().getName() === CONFIG.TEAM_TAB) clearTeamCache_(e.range.getSheet().getRange(e.range.getRow(), 2).getValue()); if (e.range.getSheet().getName() === CONFIG.ARTISTS_TAB) CacheService.getScriptCache().remove('artists_cache'); } catch (err) {} }
function askApprovers_(name, email) { const id = Utilities.getUuid().replace(/-/g, ''); PropertiesService.getScriptProperties().setProperty('appr_' + id, email); const url = ScriptApp.getService().getUrl() + '?action=approve&id=' + id; try { MailApp.sendEmail(CONFIG.APPROVERS.join(','), 'Access request: ' + name, name + ' (' + email + ') wants access. Approve: ' + url); } catch (err) {} }
function approvePage_(id, confirmed) {
  const props = PropertiesService.getScriptProperties(), email = id ? props.getProperty('appr_' + String(id)) : null;
  const page = function (html) { return HtmlService.createHtmlOutput('<div style="font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px">' + html + '</div>').setTitle('Access'); };
  if (!email) return page('<h2>Invalid link</h2>');
  const tr = teamRow_(email); if (!tr) return page('<h2>Not found</h2>');
  if (!confirmed) return page('<h2>Approve access?</h2><p><b>' + esc_(tr.name) + '</b><br>' + esc_(email) + '</p><form method="post" action="' + esc_(ScriptApp.getService().getUrl()) + '" target="_top"><input type="hidden" name="action" value="approveConfirm"><input type="hidden" name="id" value="' + esc_(id) + '"><button>Approve</button></form>');
  const t = getTeam_(); t.getRange(tr.row, 3).setValue('Approved'); clearTeamCache_(email); props.deleteProperty('appr_' + id);
  try { MailApp.sendEmail(email, 'Access Granted', 'You now have access:\n' + CONFIG.APP_URL); } catch (e) {}
  return page('<h2>Approved</h2>');
}
