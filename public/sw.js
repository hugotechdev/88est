// Service worker: inafanya app ifunguke haraka na iwekwe kwenye simu
const VERSION = '88est-v7';
const SHELL = ['/', '/index.html', '/css/style.css', '/css/app.css', '/js/common.js', '/js/locations.js', '/js/app.js', '/js/agent.js', '/icon.svg', '/img-placeholder.svg', '/bg/bg-mobile.jpg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VERSION + '-img').map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // API: daima mtandaoni
  if (url.pathname.startsWith('/api/')) return;
  // Picha za matangazo: hifadhi baada ya kupakuliwa mara ya kwanza
  if (url.pathname.startsWith('/img/') && !url.search) {
    e.respondWith(
      caches.open(VERSION + '-img').then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }
  // Kurasa na faili nyingine: mtandao kwanza, cache kama hakuna mtandao
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && SHELL.includes(url.pathname)) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
  );
});
