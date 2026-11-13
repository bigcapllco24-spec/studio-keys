// Studio Keys smoke test: loads the built index.html headless and exercises the main features.
// Usage: node tests/smoke.mjs [path-or-url]   (default: ./index.html). Exit code 1 if anything fails.
// Needs Chrome/Chromium and puppeteer-core (tools/check.sh installs it into /tmp/sk-test if missing).
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire(process.env.SK_NODE_MODULES ? path.join(process.env.SK_NODE_MODULES, 'x.js') : import.meta.url);
const pc = require('puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const target = process.argv[2] || 'file://' + path.join(root, 'index.html');
const chrome = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find(p => fs.existsSync(p))
  || (() => { try { const base = path.join(process.env.HOME, '.cache/ms-playwright'); const d = fs.readdirSync(base).filter(x => x.startsWith('chromium')).sort().pop(); const c = [path.join(base, d, 'chrome-linux/chrome'), path.join(base, d, 'chrome-linux64/chrome')].find(fs.existsSync); return c; } catch { return null; } })();
if (!chrome) { console.log('FAIL no Chrome/Chromium found (set CHROME=/path/to/chrome)'); process.exit(1); }
const fx = n => path.join(root, 'tests/fixtures', n);
const results = []; const ok = (name, pass, info = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${info ? ' · ' + info : ''}`); };
const b = await pc.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + fx('sing.wav')] });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1100 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => localStorage.clear());
const W = ms => new Promise(r => setTimeout(r, ms)), E = (f, ...a) => p.evaluate(f, ...a);
try {
  await p.goto(target, { waitUntil: 'load', timeout: 60000 }); await W(2500);
  await p.click('#audioPill'); await E(() => { ASSIST.voice = false; });
  // 1. vibe-aware drums, fresh variation each time
  const d = await E(() => { const r = runActions(localBrain('add 124 bpm drum and hihats with claps like ben bohmer').actions); const t = PROJ.tracks.find(t => t.role === 'drums'); const s1 = t.events.map(e => e.n + '@' + e.b).join();
    runActions(localBrain('give me another one').actions); const s2 = t.events.map(e => e.n + '@' + e.b).join(); return { r: r.join(' | '), bpm: CTRL.bpm, kit: t.inst, n: t.events.length, differs: s1 !== s2, drums: PROJ.tracks.filter(t => t.role === 'drums').length }; });
  ok('drums like Ben Böhmer at 124', d.bpm === 124 && d.kit === 'kitMelodic' && d.n > 40 && d.drums === 1, `${d.n} hits, ${d.kit}`);
  ok('"another one" makes a different groove', d.differs);
  // 2. full track by reference, chords/bass/melody follow the key
  const f = await E(() => { runActions([{ type: 'vibe', ref: 'Stephan Bodzin' }, { type: 'add_drums', ref: 'Stephan Bodzin' }, { type: 'add_bass' }, { type: 'add_chords' }, { type: 'add_melody' }]); return PROJ.tracks.map(t => t.role + ':' + t.inst + ':' + t.events.length).join(' '); });
  ok('track like Stephan Bodzin (drums, bass, chords, melody)', /bass:rollbass:\d+/.test(f) && /chords:darkpad/.test(f) && /melody:mhpluck/.test(f), f);
  // 3. editor: open, select all, duplicate, undo
  const ed = await E(() => { const t = PROJ.tracks.find(t => t.role === 'chords'); openEditor(t.id); const n0 = t.events.length; ED.sel = new Set(t.events.slice(0, 3)); edCopy(); edPaste(); const n1 = t.events.length; return { n0, n1, open: !$('#editor').hidden }; });
  await W(300); const un = await E(() => { undo(); return PROJ.tracks.find(t => t.role === 'chords').events.length; });
  ok('note editor copy/paste and undo', ed.open && ed.n1 === ed.n0 + 3 && un === ed.n0, `${ed.n0}→${ed.n1}→${un}`);
  // 3a. velocity lane fits in the editor box; dragging a selected bar moves all selected notes in one undo step (UX-2)
  await W(400); const vl = await E(() => { const t = PROJ.tracks.find(t => t.role === 'chords'); openEditor(t.id); $('#editor').scrollIntoView({ block: 'center' }); t.events.forEach((e, i) => e.v = i % 2 ? 0.5 : 0.7); ED.sel = new Set(t.events.slice(0, 6)); drawEditor(); saveProject();
    const w = $('#edWrap'), G = edGeom(), cr = $('#edCanvas').getBoundingClientRect(), e = t.events[0], vy = cr.top + G.gh + 8;
    return { fits: w.scrollHeight <= w.clientHeight && cr.top + G.gh + 8 + ED.velH <= innerHeight, x: cr.left + G.K + e.b * G.bw + 1, y0: vy + 3 + 0.3 * (ED.velH - 6), y1: vy + 3 + 0.1 * (ED.velH - 6), u0: UNDO.stack.length }; });
  await W(300); await p.mouse.move(vl.x, vl.y0); await p.mouse.down(); await p.mouse.move(vl.x, vl.y1, { steps: 4 }); await p.mouse.up(); await W(200);
  const vg = await E(u0 => { const ev = PROJ.tracks.find(t => t.role === 'chords').events; return { v: ev.slice(0, 7).map(e => e.v), steps: UNDO.stack.length - u0 }; }, vl.u0);
  ok('velocity lane visible; dragging a selected bar moves all selected', vl.fits && vg.v.slice(0, 6).every((v, i) => Math.abs(v - (i % 2 ? 0.7 : 0.9)) < 0.03) && vg.v[6] === 0.7 && vg.steps === 1, vg.v.join(' '));
  // 3b. MP3 download: render, encode, decode back
  const mp = await E(async () => { const m = await makeMp3(PROJ.tracks.filter(trackAudible), 4); const u = new Uint8Array(await m.blob.arrayBuffer()); const d = await A.ctx.decodeAudioData(u.buffer.slice(0)); return { size: m.blob.size, sync: u[0] === 0xff && (u[1] & 0xe0) === 0xe0, sec: m.seconds, dec: d.duration }; });
  ok('MP3 download (4 loops, decodes back)', mp.sync && mp.size > 50000 && Math.abs(mp.dec - mp.sec) < 0.5, `${(mp.size / 1024).toFixed(0)} KB, ${mp.dec.toFixed(1)} s`);
  // 3c. track effects, multi-select, one element at a time
  const fxr = await E(() => { const t = PROJ.tracks.find(t => t.role === 'bass'); const r = runActions([{ type: 'track_fx', track: 'bass', effect: 'reverb', amount: 30 }]);
    if (!FXOPEN.has(t.id)) document.querySelector(`[data-tfx="${t.id}"]`).click(); renderTracks(); const panel = !!document.querySelector('.tfx'); const sel = document.querySelector('.tfx [data-tfxadd]'); sel.value = 'width'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { r: r.join(), rev: t.fx.rev, width: t.fx.width, duck: t.fx.duck, panel }; });
  ok('track FX: panel, add effect, assistant reverb, sidechain preset', fxr.panel && fxr.rev === 0.3 && fxr.width > 0 && fxr.duck > 0, JSON.stringify(fxr));
  const ms = await E(() => { SEL.clear(); PROJ.tracks.slice(0, 2).forEach(t => SEL.add(t.id)); renderTracks(); document.querySelector('[data-sel="play"]').click(); const n = PROJ.tracks.filter(trackAudible).length; loopStop(); SEL.clear(); renderTracks(); return n; });
  ok('select two tracks and play them together', ms === 2, `${ms} audible`);
  const one = await E(() => JSON.stringify(localBrain('make a track like stephan bodzin').actions.map(a => a.type)));
  const parts = await E(() => { const n0 = PROJ.tracks.length; runActions(localBrain('add a choir').actions); runActions(localBrain('add a choir').actions); runActions(localBrain('add a melody').actions); const added = PROJ.tracks.slice(n0).map(t => t.name); loopStop(); return added; });
  ok('"add a choir" / "add a melody" make new tracks', parts.length === 3 && parts[0] === 'Choir' && parts[1] === 'Choir 2', parts.join(', '));
  ok('"make a track like…" starts with drums only', !/add_bass|add_chords|add_melody/.test(one), one);
  // 4. play for a moment
  await E(() => loopPlay()); await W(1500); const st = await E(() => LOOP.state); await E(() => loopStop());
  ok('plays the song', st === 'playing');
  // 4b. the Play button plays a new song made by the assistant (UX-2)
  const pl = await E(async () => { await newSong('Smoke play'); runActions(localBrain('add chords').actions); document.querySelector('#playBtn').click(); const r = TR.running; loopStop(); return r; });
  ok('Play button plays a new song made by the assistant', pl);
  // 5. import MIDI and audio, audio → notes
  await E(() => newSong('Smoke import')); await W(300);
  const inp = await p.$('#importFile'); await inp.uploadFile(fx('test.mid')); await W(800); await inp.uploadFile(fx('sing.wav')); await W(1500);
  const im = await E(() => { const r = runActions([{ type: 'transcribe', to: 'bass' }]); return { tracks: PROJ.tracks.map(t => t.name + ':' + t.kind).join(', '), r: r.join() }; });
  ok('import MIDI + audio, turn audio into a bassline', /Lead:notes/.test(im.tracks) && /sing:audio/.test(im.tracks) && /bassline/.test(im.tracks), im.tracks);
  // 6. sing a bassline over the beat (fake microphone sings C E G A C G)
  await E(() => newSong('Smoke sing')); await W(300);
  await E(() => { runActions([{ type: 'add_drums', style: 'house' }, { type: 'add_chords' }]); ASSIST.run('let me sing the bassline'); });
  await W(3500); const guide = await E(() => TAKE_GUIDE && PROJ.tracks.filter(trackAudible).every(t => t.role === 'drums'));
  ok('while singing, only the drums play', guide);
  await E(() => { window.__live = 0; const orig = noteOn; window.noteOn = function () { if (LOOP.state === 'take') window.__live++; return orig.apply(this, arguments); }; });
  await W(11000);
  const sb = await E(() => { const t = PROJ.tracks.find(t => t.take === 'bass'); return t ? { n: t.events.length, lo: Math.max(...t.events.map(e => e.n)) } : null; }); await E(() => loopStop());
  ok('sing the bassline → bass track', sb && sb.n >= 4 && sb.lo < 60, sb ? `${sb.n} notes` : 'no track');
  ok('a sung part doesn\'t add your raw voice as an extra track', await E(() => !PROJ.tracks.some(t => t.kind === 'audio')));
  ok('your voice isn\'t played back live while you sing, and the mic turns off after', await E(() => window.__live === 0 && !MIC.on));
  ok('humming isn\'t mistaken for talking', await E(() => !isSpeechy('la la la da da') && isSpeechy('add a bassline please')));
  // 6b. sung chords land on the beat, no repeats back to back, each at least a beat (UX-2)
  await E(() => { ASSIST.run('let me sing the chords'); }); await W(14500);
  const sc = await E(() => { const t = PROJ.tracks.find(t => t.take === 'chords'); if (!t) return null; const by = new Map(); t.events.forEach(e => { if (!by.has(e.b)) by.set(e.b, { b: e.b, d: e.d, ns: [] }); by.get(e.b).ns.push(e.n); });
    const ch = [...by.values()].sort((a, b) => a.b - b.b).map(c => ({ b: c.b, d: c.d, ns: c.ns.sort((x, y) => x - y).join('.') }));
    return { n: ch.length, beat: ch.every(c => Math.abs(c.b - Math.round(c.b)) < 1e-6), rep: ch.some((c, i) => i && c.ns === ch[i - 1].ns), min: Math.min(...ch.map(c => c.d)), gap: ch.slice(1).some((c, i) => { const g = c.b - (ch[i].b + ch[i].d); return g > 1e-6 && g < 1; }) }; }); await E(() => loopStop());
  ok('sung chords: on the beat, no repeats, each ≥ 1 beat', sc && sc.n >= 2 && sc.beat && !sc.rep && sc.min >= 1 && !sc.gap, sc ? `${sc.n} chords, shortest ${sc.min} beat` : 'no track');
  // 7. save and reopen
  const so = await E(async () => { await saveNamed(true); const id = PROJ.id; await newSong('x'); await loadNamed(id); return PROJ.name + ' ' + PROJ.tracks.length; });
  ok('save and reopen a song', /Smoke sing [1-9]/.test(so), so);
  // 8. phone width: no sideways scroll (UX-2)
  await p.setViewport({ width: 390, height: 844 }); await W(400); const sw = await E(() => document.documentElement.scrollWidth); await p.setViewport({ width: 1400, height: 1100 });
  ok('phone width has no sideways scroll', sw <= 390, `${sw} px`);
} catch (e) { ok('test run', false, e.message); }
ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
await b.close();
const failed = results.filter(x => !x).length; console.log(failed ? `SMOKE FAILED: ${failed} of ${results.length}` : `SMOKE OK: ${results.length} checks`); process.exit(failed ? 1 : 0);
