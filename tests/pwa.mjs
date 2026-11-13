// Studio Keys installable-app check (UX-6), over http with the real Worker (cloudflare/worker.js).
// raw.githubusercontent.com/<branch>/<file> is mapped to this repo's built files, so it tests what the branch will serve.
// Checks: the Worker's app routes; the manifest link and Chrome's installability; the service worker's scope ("/" and a test link);
// /api/* always reaches the network; offline reload opens the studio with the saved song; no service worker on file://.
// Usage: node tests/pwa.mjs   (run by .claude/tools/check.sh). Exit code 1 if anything fails.
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import http from 'http';
const require = createRequire(process.env.SK_NODE_MODULES ? path.join(process.env.SK_NODE_MODULES, 'x.js') : import.meta.url);
const pc = require('puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const chrome = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find(p => fs.existsSync(p));
if (!chrome) { console.log('FAIL no Chrome/Chromium found (set CHROME=/path/to/chrome)'); process.exit(1); }
const results = []; const ok = (name, pass, info = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'} pwa: ${name}${info ? ' · ' + info : ''}`); };
const W = ms => new Promise(r => setTimeout(r, ms));
// the Worker, with GitHub raw mapped to the repo
const RAW = 'https://raw.githubusercontent.com/bigcapllco24-spec/studio-keys/', realFetch = globalThis.fetch;
globalThis.fetch = async u => { u = String(u); const m = u.startsWith(RAW) && u.slice(RAW.length).match(/^(main|preview-[a-z0-9-]+)\/(.+)$/); const f = m && path.join(root, m[2]);
  return f && f.startsWith(root + path.sep) && fs.existsSync(f) ? new Response(fs.readFileSync(f)) : new Response('404', { status: 404 }); };
const wtmp = path.join(fs.mkdtempSync('/tmp/sk-pwa-'), 'worker.mjs'); fs.copyFileSync(path.join(root, 'cloudflare/worker.js'), wtmp);
const worker = (await import(wtmp)).default; const hits = {};
const server = http.createServer(async (req, res) => { const u = new URL(req.url, 'http://localhost'); hits[u.pathname] = (hits[u.pathname] || 0) + 1;
  try { const r = await worker.fetch(new Request(u, { method: req.method }), { SPOTIFY_CLIENT_ID: 'test-id' }); res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); } catch (e) { res.writeHead(500); res.end(String(e)); } });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const O = 'http://localhost:' + server.address().port;
const offline = () => new Promise(r => { server.close(r); server.closeAllConnections(); });
let b;
try {
  // 1. Worker routes for the app files, at the root and on a test link
  const want = { 'manifest.webmanifest': 'application/manifest+json', 'sw.js': 'text/javascript', 'icons/icon-192.png': 'image/png', 'icons/icon-512.png': 'image/png', 'icons/icon-maskable-512.png': 'image/png', 'icons/apple-touch-icon.png': 'image/png' };
  const bad = [];
  for (const base of ['/', '/p/preview-qa/']) for (const [f, ct] of Object.entries(want)) { const r = await realFetch(O + base + f, { redirect: 'manual' }); if (r.status !== 200 || !(r.headers.get('content-type') || '').startsWith(ct)) bad.push(`${base}${f} ${r.status} ${r.headers.get('content-type')}`); }
  for (const [u, st] of [['/icons/nope.png', 404], ['/p/preview-qa/icons/x.png', 404], ['/random/path', 302], ['/sw.js/', 302], ['/p/preview-qa', 302]]) { const r = await realFetch(O + u, { redirect: 'manual' }); if (r.status !== st) bad.push(`${u} ${r.status} (want ${st})`); }
  const cfg = await (await realFetch(O + '/api/config')).json(); if (cfg.spotifyClientId !== 'test-id') bad.push('/api/config ' + JSON.stringify(cfg));
  ok('Worker serves the manifest, sw.js and icons (root and test link); unknown files 404; other paths redirect', !bad.length, bad.join('; ') || '12 files, 5 other paths, /api/config');
  b = await pc.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const E = (f, ...a) => p.evaluate(f, ...a);
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const cdp = await p.createCDPSession();
  // 2. a test link: manifest, installability, its own service worker scope
  await p.goto(O + '/p/preview-qa/', { waitUntil: 'load', timeout: 60000 });
  const sc = await E(() => Promise.race([navigator.serviceWorker.ready.then(r => r.scope), new Promise(r => setTimeout(() => r(null), 20000))]));
  const m = await cdp.send('Page.getAppManifest'); let inst = null; try { inst = (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors.map(e => e.errorId); } catch (e) { inst = []; }
  ok('test link: manifest linked and valid, Chrome finds no installability errors, service worker scope is the test link', m.url === O + '/p/preview-qa/manifest.webmanifest' && !m.errors.length && !inst.length && sc === O + '/p/preview-qa/', `manifest ${m.url.replace(O, '')}, errors ${JSON.stringify(m.errors.concat(inst))}, scope ${sc && sc.replace(O, '')}`);
  // 3. the main site: its own scope; /api/* always goes to the network; a saved song survives an offline reload
  await p.goto(O + '/', { waitUntil: 'load', timeout: 60000 });
  const sc2 = await E(() => Promise.race([navigator.serviceWorker.ready.then(r => r.scope), new Promise(r => setTimeout(() => r(null), 20000))]));
  await p.reload({ waitUntil: 'load', timeout: 60000 }); await W(800);
  const a0 = hits['/api/config'] || 0;
  const on = await E(async () => { for (let i = 0; i < 2; i++) await fetch('/api/config'); const rs = await navigator.serviceWorker.getRegistrations();
    return { ctl: navigator.serviceWorker.controller && new URL(navigator.serviceWorker.controller.scriptURL).pathname, regs: rs.map(r => new URL(r.scope).pathname).sort().join(' '), caches: (await caches.keys()).length }; });
  ok('main: its own service worker controls the page; the two scopes stay separate; /api/* reaches the network', sc2 === O + '/' && on.ctl === '/sw.js' && on.regs === '/ /p/preview-qa/' && on.caches === 2 && (hits['/api/config'] || 0) - a0 === 2, `${JSON.stringify(on)}, /api/config ${(hits['/api/config'] || 0) - a0} of 2`);
  const sv = await E(async () => { ASSIST.voice = false; runActions(localBrain('drums like ben bohmer').actions); PROJ.name = 'PWA offline'; await saveNamed(true);
    for (let i = 0; i < 20; i++) { let r = null; try { r = await IDB.get(PROJ.id, 'projects'); } catch (e) {} if (r && r.name === 'PWA offline') break; await new Promise(r => setTimeout(r, 250)); } return { id: PROJ.id, n: PROJ.tracks.length }; });
  await offline(); let loaded = true; try { await p.reload({ waitUntil: 'load', timeout: 30000 }); } catch (e) { loaded = false; } await W(1200);
  const off = loaded ? await E(async id => { if (typeof PROJ === 'undefined') return { app: false, text: document.body.innerText.slice(0, 80) }; let api = 'served';
    try { await fetch('/api/config'); } catch (e) { api = 'network error'; } await loadNamed(id); return { app: true, name: PROJ.name, n: PROJ.tracks.length, api }; }, sv.id).catch(e => ({ app: false, text: e.message })) : { app: false, text: 'reload failed' };
  ok('offline: reload opens the studio from the saved copy, the saved song reopens, /api/* is not served from it', off.app && off.name === 'PWA offline' && off.n === sv.n && off.api === 'network error', JSON.stringify(off));
  ok('no page errors (http)', !errs.length, errs.slice(0, 3).join('; '));
  // 4. a local file: no service worker, no manifest link
  const f = await b.newPage(); await f.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'load', timeout: 60000 }); await W(800);
  const fi = await f.evaluate(async () => ({ app: typeof PROJ !== 'undefined', link: !!document.querySelector('link[rel=manifest]'), sw: await navigator.serviceWorker.getRegistrations().then(r => r.length, () => 0) }));
  ok('file://: no manifest link and no service worker', fi.app && !fi.link && fi.sw === 0, JSON.stringify(fi));
} catch (e) { ok('ran without errors', false, e.stack.split('\n').slice(0, 3).join(' | ')); }
if (b) await b.close(); try { await offline(); } catch (e) {}
fs.rmSync(path.dirname(wtmp), { recursive: true, force: true });
console.log(results.every(Boolean) ? `PWA OK: ${results.length} checks` : `PWA FAILED: ${results.filter(x => !x).length} of ${results.length}`);
process.exit(results.every(Boolean) ? 0 : 1);
