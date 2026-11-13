/* Network wrapper extracted from app.js. Classic script; exposes window.TkApi.createApi(deps).
   deps: { isDevHost, getToken(), setToken(t), onPending(msg), onSignedOut(msg) } */
(function () {
'use strict';

// In-memory cache for read-only actions to provide instant navigation
const API_CACHE = new Map();
const CACHE_TTL_MS = 60000; // 1 minute fresh cache
const CACHEABLE_ACTIONS = new Set([
  'p2_getArtists',
  'p2_getPeople',
  'getCategories',
  'getFields',
  'p2_dashboard',
  'p2_pipeline',
  'dashboardStats'
]);

// Any write operation clears the read cache
const MUTATION_PREFIXES = ['save', 'update', 'delete', 'set', 'add', 'mark', 'move', 'approve', 'record', 'unassign', 'assign'];
function isMutation(action) {
  const lower = String(action || '').toLowerCase();
  return MUTATION_PREFIXES.some(prefix => lower.includes(prefix));
}

// On this computer only: when the app falls back to its built-in demo data (server not reachable, or this browser is not
// signed in), say so on screen. Demo data looked like real data and was mistaken for it.
function demoNotice_(why) {
  if (document.getElementById('demoBanner')) return;
  const d = document.createElement('div'); d.id = 'demoBanner'; d.setAttribute('role', 'alert');
  d.style.cssText = 'position:sticky;top:0;z-index:9999;background:#fee2e2;color:#991b1b;padding:10px 16px;font-size:13px;font-weight:600;text-align:center;';
  d.textContent = 'Demo data, not your real data. ' + why;
  document.body.insertBefore(d, document.body.firstChild);
}

function createApi(deps) {
  const IS_DEV_HOST_ = deps.isDevHost;
  return async function api(action, payload) {
    if (IS_DEV_HOST_ && (localStorage.getItem('oc_demo') === '1' || window.DEMO_MODE)) {
      demoNotice_('Demo mode is on.');
      return window.mockApi(action, payload);
    }
    if (!window.API_URL || window.API_URL.indexOf('/exec') === -1) {
      if (IS_DEV_HOST_ && window.mockApi) return window.mockApi(action, payload);
      return { ok: false, message: 'The app isn’t set up yet (API_URL in config.js).' };
    }

    if (isMutation(action)) {
      API_CACHE.clear();
    } else if (CACHEABLE_ACTIONS.has(action)) {
      const cacheKey = action + ':' + JSON.stringify(payload || {});
      const cached = API_CACHE.get(cacheKey);
      if (cached && (Date.now() - cached.time < CACHE_TTL_MS)) {
        return cached.data;
      }
    }

    const API_URL = window.API_URL;
    let currentToken = deps.getToken() || localStorage.getItem('oc_token') || '';
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
              deps.setToken(currentToken);
              localStorage.setItem('oc_token', currentToken);
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
          const fallback = window.mockApi(action, payload);
          if (fallback && fallback.ok) { demoNotice_('This browser is not signed in to the local server. Open the sign-in link printed by the server, then reload.'); return fallback; }
        }
        r.pending ? deps.onPending(r.message) : deps.onSignedOut(r.message);
      }

      if (r && r.ok && CACHEABLE_ACTIONS.has(action)) {
        const cacheKey = action + ':' + JSON.stringify(payload || {});
        API_CACHE.set(cacheKey, { time: Date.now(), data: r });
      }

      return r;
    } catch (e) {
      if (IS_DEV_HOST_ && window.mockApi) {
        const fallback = window.mockApi(action, payload);
        if (fallback && fallback.ok) { demoNotice_('The local server is not reachable. Start it, then reload.'); return fallback; }
      }
      return { ok: false, message: navigator.onLine ? 'Couldn’t reach the server. Check your connection and try again.' : 'You’re offline. Reconnect and try again.' };
    }
  };
}

window.TkApi = { createApi };
})();
