// Service Worker: App startet auch ohne Netz. Daten liegen ohnehin lokal und werden vom Abgleich nachgereicht.
// /api/ wird nie zwischengespeichert. Externe Dienste (Wetter) laufen direkt über das Netz.
const CACHE = 'wir-app-v3';
const scope = new URL(self.registration.scope);
// Bei Änderungen an dieser Datei Versionsnummer erhöhen, damit alte Caches entfernt werden.
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'].map((p) => new URL(p, scope).href);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== scope.origin || url.pathname.startsWith('/api/')) return;

  // Seitenaufrufe: zuerst Netz (neue Version), sonst die gespeicherte App.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(new URL('index.html', scope).href, copy));
          return res;
        })
        .catch(() => caches.match(new URL('index.html', scope).href)),
    );
    return;
  }

  // Gebaute Dateien tragen einen Hash im Namen und ändern sich nie: zuerst Cache.
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone(); // vor der Rückgabe kopieren – danach liest der Browser den Inhalt
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Übrige eigene Dateien: Cache sofort, im Hintergrund aktualisieren.
  e.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});

// ---- Erinnerungen per Push ----
self.addEventListener('push', (e) => {
  let msg = {};
  try {
    msg = e.data ? e.data.json() : {};
  } catch {
    msg = { title: 'WIR. Wochenplaner', body: e.data?.text() };
  }
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Ist die App gerade sichtbar, blendet sie die Erinnerung selbst ein.
      if (msg.tag !== 'test' && list.some((c) => c.visibilityState === 'visible')) return;
      return self.registration.showNotification(msg.title || 'WIR. Wochenplaner', {
        body: msg.body || '',
        tag: msg.tag,
        icon: new URL('icon-192.png', scope).href,
        badge: new URL('icon-192.png', scope).href,
        data: { url: new URL(msg.url || './', scope).href },
        requireInteraction: false,
      });
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || scope.href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(scope.href));
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
