// Studio Keys phone smoke test (UX-4): the phone layout at 390x844 and 360x780 with touch, then back to desktop.
// Usage: node tests/phone.mjs [path-or-url]   (default: ./index.html). Exit code 1 if anything fails. Run by .claude/tools/check.sh.
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire(process.env.SK_NODE_MODULES ? path.join(process.env.SK_NODE_MODULES, 'x.js') : import.meta.url);
const pc = require('puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const target = process.argv[2] || 'file://' + path.join(root, 'index.html');
const chrome = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find(p => fs.existsSync(p));
if (!chrome) { console.log('FAIL no Chrome/Chromium found (set CHROME=/path/to/chrome)'); process.exit(1); }
const results = []; const ok = (name, pass, info = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${info ? ' · ' + info : ''}`); };
const b = await pc.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.join(root, 'tests/fixtures/sing.wav')] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const W = ms => new Promise(r => setTimeout(r, ms)), E = (f, ...a) => p.evaluate(f, ...a);
const tap = async sel => { const r = await E(s => { const el = document.querySelector(s); if (!el) return null; el.scrollIntoView({ block: 'center' }); const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, sel); if (!r) throw new Error('no ' + sel); await p.touchscreen.tap(r.x, r.y); await W(150); };
const TABS = { keys: '.assistant', song: '#tracks', mix: '#mixerView', play: '.grid>.keys', more: '#phMore' };
// what a phone tab shows: the tab's section is on screen, no sideways scroll, no text box under 16 px
const tabState = () => E(T => { const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && r.top < innerHeight; };
  const de = document.documentElement, shown = Object.entries(T).filter(([, s]) => vis(document.querySelector(s))).map(([k]) => k);
  const small = [...document.querySelectorAll('input:not([type=range]):not([type=checkbox]):not([type=file]),select,textarea')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id || el.className);
  return { tab: de.dataset.ptab, shown, sw: de.scrollWidth, cw: de.clientWidth, small }; }, TABS);
try {
  for (const [w, h] of [[390, 844], [360, 780]]) {
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await p.goto(target, { waitUntil: 'load', timeout: 60000 }); await W(1500); await E(() => { ASSIST.voice = false; });
    // 1-2. opens on Keys, the Keys button is on the first screen above the bottom bar
    const k = await E(() => { const o = $('#asOrb').getBoundingClientRect(), bb = $('#phBottom').getBoundingClientRect(); return { phone: document.documentElement.hasAttribute('data-phone'), tab: document.documentElement.dataset.ptab, top: Math.round(o.top), bot: Math.round(o.bottom), bar: Math.round(bb.top), sy: scrollY }; });
    ok(`${w}x${h}: opens on Keys with the Keys button on screen`, k.phone && k.tab === 'keys' && k.top >= 0 && k.bot <= k.bar && k.sy === 0, `orb ${k.top}-${k.bot}, bottom bar at ${k.bar}`);
    await E(() => { runActions(localBrain('drums like ben bohmer at 124').actions); runActions([{ type: 'add_bass' }]); });
    // 3, 1, 6. each tab shows its section, no sideways scroll, text boxes at least 16 px
    const bad = [];
    for (const t of Object.keys(TABS)) { await tap(`#phTabs [data-ptab="${t}"]`); await W(150); const s = await tabState();
      if (s.tab !== t || !s.shown.includes(t)) bad.push(`${t}: shows ${s.shown.join('+') || 'nothing'}`); if (s.sw !== s.cw) bad.push(`${t}: ${s.sw} px wide`); if (s.small.length) bad.push(`${t}: small text in ${s.small.slice(0, 3).join(',')}`); }
    ok(`${w}x${h}: each tab shows its section, no sideways scroll, text boxes ≥ 16 px`, !bad.length, bad.join('; ') || '5 tabs');
    // 4. Play in the mini transport starts and stops the loop
    await tap('#phTabs [data-ptab="keys"]'); await tap('#phPlay'); await W(500); const pl = await E(() => ({ st: LOOP.state, pr: $('#phPlay').getAttribute('aria-pressed') }));
    await tap('#phPlay'); await W(200); const ps = await E(() => ({ st: LOOP.state, pr: $('#phPlay').getAttribute('aria-pressed') }));
    ok(`${w}x${h}: mini transport Play starts and stops the loop`, PLAYING_OK(pl) && ps.pr === 'false' && ps.st === 'stopped', `${pl.st} → ${ps.st}`);
    // 5. tapping a part opens its sheet; Edit notes opens the editor full screen; back closes it
    await tap('#phTabs [data-ptab="song"]'); await tap('#tracks>.trk .trole'); await W(200);
    const sh = await E(() => ({ sheet: PH.sheet, open: !$('#phSheet').hidden, name: $('#phSheetT').textContent }));
    await tap('#phPartB [data-edit]'); await W(400);
    const ed = await E(() => { const e = $('#editor'), r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { open: !e.hidden, pos: cs.position, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), iw: innerWidth, ih: innerHeight, sheet: PH.sheet }; });
    await E(() => closeEditor()); await W(200);
    ok(`${w}x${h}: tap a part opens its sheet, Edit notes opens the editor full screen`, sh.sheet === 'part' && sh.open && ed.open && ed.pos === 'fixed' && ed.x <= 0 && ed.y <= 0 && ed.w >= ed.iw && ed.h >= ed.ih - 1 && !ed.sheet, `sheet "${sh.name}", editor ${ed.w}x${ed.h} ${ed.pos}`);
  }
  // 8-10. UX-4 fix 1 regressions at 390x844 (real touch events through CDP)
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  let cdp, bassId; const url390 = target;
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
  const fresh = async () => { await p.goto(url390, { waitUntil: 'load', timeout: 60000 }); await W(1500); await E(() => { ASSIST.voice = false; });
    cdp = await p.createCDPSession(); await E(() => { runActions(localBrain('drums like ben bohmer at 124').actions); runActions([{ type: 'add_bass' }]); });
    await tap('#phTabs [data-ptab="song"]'); bassId = await E(() => PROJ.tracks.find(t => t.role === 'bass').id); };
  const stillHere = async () => { try { return await E(() => typeof PH !== 'undefined' && PH.on); } catch (e) { return false; } };
  await fresh();
  // 8. Back from the editor opened through a part's sheet closes the editor and stays in the app (it used to leave the page)
  try {
    await tap(`#tracks>.trk[data-tid="${bassId}"] .tname`); await W(250); await tap('#phPartB [data-edit]'); await W(600);
    const url0 = p.url(), st0 = await E(() => ({ ed: !$('#editor').hidden, state: JSON.stringify(history.state) }));
    await E(() => history.back()); await W(700);
    const url1 = p.url(), st1 = await E(() => ({ ed: !$('#editor').hidden, phone: document.documentElement.hasAttribute('data-phone'), tab: PH.tab }));
    ok('390x844: Back from the editor (opened from a part) closes it and keeps the URL', st0.ed && !st1.ed && st1.phone && url1 === url0, `editor ${st0.ed}→${st1.ed}, state ${st0.state}, ${url1 === url0 ? 'same URL' : 'went to ' + url1}`);
  } catch (e) { ok('390x844: Back from the editor (opened from a part) closes it and keeps the URL', false, 'left the page? ' + e.message.slice(0, 80)); }
  // 9. A just-tapped 1/16 note (about 6 px wide) moves when dragged, it doesn't stretch
  try {
    if (!await stillHere()) await fresh(); /* check 8 failed by leaving the page */
    await tap('#phTabs [data-ptab="song"]');
    await tap(`#tracks>.trk[data-tid="${bassId}"] .tname`); await W(250); await tap('#phPartB [data-edit]'); await W(600);
    const n0 = await E(() => edTrack().events.length);
    const spot = await E(() => { const G = edGeom(), cr = $('#edCanvas').getBoundingClientRect(); return { x: cr.left + G.K + 9.1 * G.bw, y: cr.top + 4 * ED.rowH + ED.rowH / 2 }; });
    await p.touchscreen.tap(spot.x, spot.y); await W(300);
    const a = await E(() => { const t = edTrack(), e = t.events[t.events.length - 1], G = edGeom(), R = evRect(t, G, e), cr = $('#edCanvas').getBoundingClientRect(); return { n: t.events.length, ev: { b: e.b, d: e.d, n: e.n }, w: Math.round(R.w), x: cr.left + R.x + R.w / 2, y: cr.top + R.y + R.h / 2 }; });
    await touch('touchStart', [[a.x, a.y]]); for (let i = 1; i <= 6; i++) { await touch('touchMove', [[a.x + 8 * i, a.y - 5 * i]]); await W(30); } await touch('touchEnd', []); await W(300);
    const z = await E(() => { const e = edTrack().events[edTrack().events.length - 1]; return { b: e.b, d: e.d, n: e.n }; });
    await E(() => closeEditor()); await W(200);
    ok('390x844: dragging a just-tapped 1/16 note moves it without stretching it', a.n === n0 + 1 && z.d === a.ev.d && (z.b !== a.ev.b || z.n !== a.ev.n), `${a.w} px note ${JSON.stringify(a.ev)} → ${JSON.stringify(z)}`);
  } catch (e) { ok('390x844: dragging a just-tapped 1/16 note moves it without stretching it', false, e.message.slice(0, 120)); }
  // 10. Releasing after a 0.7 s hold on a song-map block leaves its menu open and the sections unchanged; Duplicate still works after
  try {
    if (!await stillHere()) await fresh();
    await E(() => songTemplate('short')); await W(300); await tap('#phTabs [data-ptab="song"]'); await E(() => scrollTo(0, 0)); await W(200);
    const before = await E(() => songSections().map(s => s.name + s.bars).join(' '));
    const s = await E(() => { const q = document.querySelector('#songMap .smb').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await touch('touchStart', [[s.x, s.y]]); await W(700); await touch('touchEnd', []); await W(500);
    const after = await E(() => ({ menu: !$('#songMenu').hidden, secs: songSections().map(s => s.name + s.bars).join(' ') }));
    let dup = '';
    if (after.menu) { const d = await E(() => { const b = [...$('#songMenu').querySelectorAll('button')].find(b => /^Duplicate/.test(b.textContent.trim())); if (!b) return null; const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
      if (d) { await p.touchscreen.tap(d.x, d.y); await W(400); dup = await E(() => songSections().length + ' sections'); } }
    ok('390x844: release after a 0.7 s hold on a song-map block leaves the menu open, sections unchanged', after.menu && after.secs === before && /^4 /.test(dup), `menu ${after.menu ? 'open' : 'closed'}, "${before}" → "${after.secs}", then Duplicate → ${dup || 'n/a'}`);
  } catch (e) { ok('390x844: release after a 0.7 s hold on a song-map block leaves the menu open, sections unchanged', false, e.message.slice(0, 120)); }
  // 7. back to a desktop window: the desktop layout returns
  await p.setViewport({ width: 1400, height: 900, isMobile: false, hasTouch: false }); await W(600);
  const dk = await E(() => ({ phone: document.documentElement.hasAttribute('data-phone'), orb: !!document.querySelector('.assistant>#asOrb'), name: !!document.querySelector('.songbar #projName'), themes: !!document.querySelector('.top .themes'), top: getComputedStyle($('.top')).display !== 'none', bar: getComputedStyle($('#phBottom')).display }));
  ok('1400 px: the desktop layout comes back', !dk.phone && dk.orb && dk.name && dk.themes && dk.top && dk.bar === 'none', JSON.stringify(dk));
} catch (e) { ok('phone test run', false, e.message); }
function PLAYING_OK(s) { return s.pr === 'true' && /playing|overdub/.test(s.st); }
ok('phone: no page errors', !errs.length, errs.slice(0, 3).join(' | '));
await b.close();
const failed = results.filter(x => !x).length; console.log(failed ? `PHONE FAILED: ${failed} of ${results.length}` : `PHONE OK: ${results.length} checks`); process.exit(failed ? 1 : 0);
