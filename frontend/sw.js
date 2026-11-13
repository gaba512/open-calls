// Bump this whenever you publish changes, so phones pick up the new version.
const CACHE_NAME = 'open-calls-v7';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME && k !== 'shared').map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Android share sheet → stash the post and open the Add screen
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      const fd = await e.request.formData();
      const file = fd.get('image');
      const text = [fd.get('title'), fd.get('text'), fd.get('url')].filter(Boolean).join('\n');
      const cache = await caches.open('shared');
      await cache.put('shared-text', new Response(text));
      if (file && file.size) await cache.put('shared-image', new Response(file, { headers: { 'content-type': file.type || 'image/jpeg' } }));
      else await cache.delete('shared-image');
      return Response.redirect(new URL('./?shared=1#/add', self.registration.scope).href, 303);
    })());
    return;
  }

  // Only our own GET requests. API calls (Apps Script) and Google sign-in are never cached.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network first so updates show straight away; cache is the offline fallback.
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request);
      if (res.ok) (await caches.open(CACHE_NAME)).put(e.request, res.clone());
      return res;
    } catch (err) {
      return (await caches.match(e.request, { ignoreSearch: true })) || (await caches.match('./')) || Response.error();
    }
  })());
});
