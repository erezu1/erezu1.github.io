// Conifer's service worker: the pages you have opened stay readable offline. A page is fetched from the network
// first, so a new version shows at once; if the network has not answered within 3 seconds and a copy is kept, the
// copy is shown and the fetch still refreshes it for next time. A figure's file is named by its content, so a kept
// one is used as it is. The icons and the manifest are kept from the start.
const CACHE = 'conifer-v4';
const KEEP = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const SLOW = 3000;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(KEEP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/img\/[^/]+\.(png|jpe?g|webp|svg|gif)$/.test(url.pathname)) {          // a figure: kept as it is
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(e.request)) || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });  // (a 304 when nothing changed)
    const kept = await c.match(e.request, { ignoreSearch: true });
    if (!kept) return net.catch(() => Response.error());
    e.waitUntil(net.catch(() => {}));
    return Promise.race([net.catch(() => kept), new Promise(res => setTimeout(() => res(kept), SLOW))]);
  }));
});
