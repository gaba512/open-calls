/* Pure helpers extracted from app.js. Classic script (no build step); exposes window.TkUtils. */
(function () {
'use strict';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
const splitNames = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const initials = n => String(n).trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
// Same artist always gets the same color, cycling through 4 options by name.
const avatarColorClass = n => { const s = String(n || ''); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'avc' + (h % 4 + 1); };

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

  if (days < 0) return { text: 'Closed', isUrgent: false };
  if (days === 0) return { text: 'Today', isUrgent: true };
  if (days === 1) return { text: '1 day', isUrgent: true };
  if (days <= 7) return { text: days + ' days', isUrgent: true };
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return { text: dd + ' ' + (months[m - 1] || m) + ' ' + y, isUrgent: false };
}

window.TkUtils = { esc, safeUrl, splitNames, initials, avatarColorClass, formatSyncedDeadline };
window.formatSyncedDeadline = formatSyncedDeadline;
})();
