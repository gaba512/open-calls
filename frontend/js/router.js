/* Hash router extracted from app.js. Classic script (no build step); exposes window.TkRouter.
   Call TkRouter.init(deps) once the app is ready.
   deps: { render, stampChrome_, closeSheet, ask, getDirty, setDirty } */
(function () {
'use strict';

let _render, _stampChrome, _closeSheet, _ask, _getDirty, _setDirty;

/* Mutable router state — read via getters below. */
let route   = { name: '', param: '' };
let prevHash = '';
let cameFrom = '';
const scrollPos = {};

/* Navigate to a hash. If replace=true the entry is replaced in the browser history
   (so Back doesn't return to it) and onRoute() is fired immediately because
   hashchange won't fire when replaceState is used. */
function go(hash, replace) {
  if (replace) {
    history.replaceState(null, '', hash);
  } else {
    location.hash = hash;
  }
  if (replace) onRoute();
}

async function onRoute() {
  _stampChrome();
  if (typeof _closeSheet === 'function') _closeSheet();
  const pageAssigned = document.getElementById('pageAssigned');
  if (pageAssigned) pageAssigned.textContent = ''; // set again by the artist call screen only

  const raw   = location.hash.replace(/^#\/?/, '') || 'inbox';
  const parts = raw.split('/');
  const name  = parts[0], param = parts.slice(1).join('/');

  // Dirty-state guard: if the user is on an edit screen with unsaved changes and tries
  // to navigate away, ask them to confirm before leaving.
  if ((route.name === 'entry' || route.name === 'new') && _getDirty() && !(name === route.name && param === route.param)) {
    const target = location.hash;
    history.replaceState(null, '', prevHash);
    if (!(await _ask('Discard changes?', 'Your edits to this open call will be lost.', 'Discard', true))) return;
    _setDirty(false);
    history.replaceState(null, '', target);
  }

  // Remember scroll position for list tabs so we can restore it on back-navigation.
  if (['inbox', 'drafts', 'archive'].includes(route.name)) {
    scrollPos[route.name] = window.scrollY;
  }

  // cameFrom is the page the user was on before this one. The Back link uses it, so Back returns to wherever
  // they actually came from (for example the Artists page), not always to Open Calls.
  if (location.hash !== prevHash) cameFrom = prevHash;
  route = { name, param };
  prevHash = location.hash;

  _render();
}

window.addEventListener('hashchange', onRoute);

function init(deps) {
  _render      = deps.render;
  _stampChrome = deps.stampChrome_;
  _closeSheet  = deps.closeSheet;
  _ask         = deps.ask;
  _getDirty    = deps.getDirty;
  _setDirty    = deps.setDirty;
}

window.TkRouter = {
  init,
  go,
  onRoute,
  get route()     { return route; },
  get prevHash()  { return prevHash; },
  get cameFrom()  { return cameFrom; },
  scrollPos,
};

/* Expose go() as a plain window global so all the existing onclick="go(...)" calls
   in app.js and in HTML strings continue to work without any other edits. */
window.go = go;

})();
