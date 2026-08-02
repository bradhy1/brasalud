/* Brasalud - service worker
   Sube el numero de CACHE cada vez que cambies index.html (v13, v14...)
   para que el celular tome la version nueva. */

const CACHE = 'brasalud-v12';

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
      // addAll falla entero si un archivo falla; guardamos uno por uno
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

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Cache primero: abre al instante y funciona sin señal.
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
