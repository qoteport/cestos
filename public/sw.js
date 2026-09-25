const SHELL_CACHE = 'cestos-pwa-shell-v2';
const SHELL_ASSETS = ['/offline.html', '/assets/pwa/icon-192.png', '/assets/pwa/icon-512.png', '/assets/pwa/icon-maskable-512.png'];
const STATIC_CACHE = 'cestos-pwa-static-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('cestos-pwa-') && ![SHELL_CACHE, STATIC_CACHE].includes(key)).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // Next dev output and HMR assets change constantly; don't let the PWA cache proxy them.
  if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.pathname.startsWith('/_next/')) return;
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      let cache;
      let cached;
      try {
        cache = await caches.open(STATIC_CACHE);
        cached = await cache.match(request);
      } catch { /* Fall through to the network if cache access is unavailable. */ }
      if (cached && self.navigator.onLine === false) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && cache) await cache.put(request, response.clone()).catch(() => {});
        if (!response.ok && cached) return cached;
        return response;
      } catch {
        return cached || new Response('', { status: 504, statusText: 'Offline and asset is not cached' });
      }
    })());
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/offline.html')) || Response.error()));
    return;
  }
  if (SHELL_ASSETS.includes(url.pathname)) event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.navigate(target).then(() => existing.focus());
    return self.clients.openWindow(target);
  }));
});
