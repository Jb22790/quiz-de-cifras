// Service worker: guarda o app no aparelho pra funcionar offline.
// IMPORTANTE: troque o número de CACHE sempre que mudar qualquer arquivo da lista.
const CACHE = 'cifraquiz-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './fonts/fredoka-latin.woff2',
  './fonts/jetbrainsmono-latin.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/core/chords.js',
  './js/core/edit.js',
  './js/core/model.js',
  './js/core/parser.js',
  './js/core/quiz.js',
  './js/core/store.js',
  './js/ui/cifra.js',
  './js/ui/dom.js',
  './js/ui/editor.js',
  './js/ui/home.js',
  './js/ui/paste.js',
  './js/ui/play.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).catch(() => caches.match('./index.html'))),
  );
});
