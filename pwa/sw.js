/* Studio Keys service worker (UX-6): keeps one copy of the app so it opens without a connection.
   - The page: network first (every release shows up at once when online); the saved copy only when offline.
   - The manifest and icons: network first too, saved copy offline.
   - Nothing else is touched: /api/* (the assistant, Spotify settings), fonts and everything else always go to the network.
   Served from the page's folder, so its scope is "/" on the main site and "/p/preview-<id>/" on a test link;
   each scope keeps its own cache, so a test link never mixes with the main site. */
'use strict';
const VERSION = 'v1';
const SCOPE = new URL(self.registration.scope).pathname;          // "/" or "/p/preview-ux-6/"
const CACHE = 'studio-keys-' + VERSION + '-' + SCOPE;
const PREFIX = 'studio-keys-';
const FILES = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
const PAGE = SCOPE;                                                 // the page is saved under the scope address

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([PAGE, ...FILES].map(p => c.add(p).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && scopeOf(k) === SCOPE).map(k => caches.delete(k))))   // older versions of this scope only
    .then(() => self.clients.claim()));
});

function scopeOf(name) { if (!name.startsWith(PREFIX)) return null; const i = name.indexOf('-', PREFIX.length); return i < 0 ? null : name.slice(i + 1); }

function kind(req) {
  if (req.method !== 'GET') return null;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin || !u.pathname.startsWith(SCOPE)) return null;
  const rest = u.pathname.slice(SCOPE.length);
  if (rest.startsWith('api/') || u.pathname.startsWith('/api/')) return null;     // the assistant: always the network, never a saved copy
  if (req.mode === 'navigate') return (rest === '' || rest === 'index.html') ? PAGE : null;  // only this page, never another test link
  return FILES.includes(rest) ? rest : null;
}

self.addEventListener('fetch', e => {
  const key = kind(e.request);
  if (!key) return;                                                 // not ours: the browser handles it as if there were no service worker
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok && res.type === 'basic' && !res.redirected) { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(key, copy))); }
    return res;
  }).catch(() => caches.open(CACHE).then(c => c.match(key)).then(hit => hit || Response.error())));
});
