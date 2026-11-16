// Révizz — fonctionne hors ligne pour l'agenda et le minuteur, et affiche les notifications
const CACHE = 'revizz-v24';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // jamais de cache pour le serveur de données
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// ----- notifications -----
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { corps: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titre || 'Révizz', {
    body: d.corps || 'Nouveau message',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: 'g-' + (d.groupe_id || ''),
    renotify: true,
    data: { groupe_id: d.groupe_id || null }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const gid = e.notification.data && e.notification.data.groupe_id;
  const url = new URL('./?ouvrir=' + encodeURIComponent(gid || ''), self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope)) { c.postMessage({ type: 'ouvrir', groupe_id: gid }); return c.focus(); }
    }
    return clients.openWindow(url);
  }));
});
