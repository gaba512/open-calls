// Change this version number every time you update Upload.html
const CACHE_NAME = 'open-calls-v5'; 

// Receives posts shared from other apps (Android) and hands them to the page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      const fd = await e.request.formData();
      const file = fd.get('image');
      const text = [fd.get('title'), fd.get('text'), fd.get('url')].filter(Boolean).join('\n');
      const cache = await caches.open('shared');
      await cache.put('shared-text', new Response(text));
      if (file && file.size) {
        await cache.put('shared-image', new Response(file, { headers: { 'content-type': file.type || 'image/jpeg' } }));
      } else {
        await cache.delete('shared-image');
      }
      return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
    })());
  }
});
