/* Brasalud - service worker
   v14: el index.html ahora se pide SIEMPRE a la red primero.
   Asi, cuando subas una version nueva a GitHub, el celular la toma
   sola al abrir la app. Si no hay internet, usa la copia guardada. */

const CACHE = 'brasalud-v14';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7/babel.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        ARCHIVOS.map((url) =>
          c.add(url).catch((err) => console.log('No se pudo cachear', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((llaves) =>
        Promise.all(llaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Mensaje desde la app para forzar la actualizacion
self.addEventListener('message', (e) => {
  if (e.data === 'actualizar') self.skipWaiting();
});

function esLaApp(req) {
  return req.mode === 'navigate' || req.url.includes('index.html');
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // La app: RED PRIMERO. Siempre trae lo ultimo que subiste.
  if (esLaApp(e.request)) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copia));
          return resp;
        })
        .catch(() =>
          caches.match('./index.html').then((r) => r || caches.match('./'))
        )
    );
    return;
  }

  // Lo demas (iconos, React, Babel): guardado primero, es mas rapido.
  e.respondWith(
    caches.match(e.request).then((guardado) => {
      if (guardado) return guardado;
      return fetch(e.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copia));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
