// Service worker: la app se abre al instante y funciona sin conexión.
// Los datos NO se guardan aquí (van a IndexedDB); aquí solo la "carcasa" de la app.
const VERSION = '9.0.0-c8268730d4';
const FILES = ["./css/app.css","./icons/apple-touch-icon.png","./icons/favicon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./js/app.js","./js/desktop.js","./js/files.js","./js/logic.js","./js/qr.js","./js/stl.js","./js/store.js","./js/ui.js","./js/views/archivos.js","./js/views/clientes.js","./js/views/config.js","./js/views/home.js","./js/views/ia.js","./js/views/informes.js","./js/views/noticias.js","./js/views/notificaciones.js","./js/views/pedidos.js","./js/views/productos.js","./js/views/redes.js","./js/views/setup.js","./js/views/tareas.js","./manifest.webmanifest","./"];
self.addEventListener('install', e => { e.waitUntil(caches.open('cd-' + VERSION).then(c => c.addAll(FILES))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cd-') && k !== 'cd-' + VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/local/')) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).catch(() => caches.match('./index.html'))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(ws => { const w = ws[0]; if (w) { w.focus(); if (e.notification.data && e.notification.data.path) w.navigate('./#/' + e.notification.data.path); } else self.clients.openWindow('./' + (e.notification.data && e.notification.data.path ? '#/' + e.notification.data.path : '')); }));
});
