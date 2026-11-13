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
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('skSmoke')) { localStorage.clear(); sessionStorage.setItem('skSmoke', '1'); } }); // clear once, so the reload check keeps the last song
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
  const pn = await E(async () => { await newSong('Smoke play'); runActions(localBrain('add chords').actions); document.querySelector('#playBtn').click(); const r = TR.running; loopStop(); return r; });
  ok('Play button plays a new song made by the assistant', pn);
  // 4c. ... also when the Song view is on (UX-2 with UX-1)
  const ps = await E(async () => { await newSong('Smoke play song'); songMode('song'); runActions(localBrain('add chords').actions); document.querySelector('#playBtn').click(); const r = { run: TR.running, mode: SONG.view.mode, st: LOOP.state }; loopStop(); songMode('loop'); return r; });
  ok('Play button plays a new song in Song mode', ps.run && ps.mode === 'song' && ps.st === 'playing', JSON.stringify(ps));
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
  // 8. Song view (UX-1): old songs, layouts, parts, play from a bar, loop a section, patterns, whole-song MP3, Rec, new song on open
  const sm = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); const old = serialize(PROJ); delete old.sections; const m = migrateSong(old), s0 = m.sections[0];
    const mig = m.sections.length === 1 && s0.name === 'Main' && s0.bars === PROJ.bars && PROJ.tracks.every(t => s0.parts[t.id] && s0.parts[t.id].on);
    songMode('loop'); const calls = []; const orig = scheduleEvent; window.scheduleEvent = function (tr, e, t, d) { calls.push({ tr, e, t }); return orig.apply(this, arguments); };
    loopPlay(); await W(900); const t0 = TR.t0, L = PROJ.bars * 4; loopStop(); window.scheduleEvent = orig;
    const same = calls.length > 0 && calls.every(c => c.tr.events.includes(c.e) && Math.abs(mod((c.t - t0) / spb(), L) - c.e.b) < 1e-6);
    return { mig, loopN: calls.length, same }; });
  ok('song: an old song opens as one "Main" section and Loop plays its notes as before', sm.mig && sm.same, `${sm.loopN} notes in Loop`);
  const tp = await E(() => { setTempo(124); songTemplate('club'); const club = songBars() + ' ' + songLenText(); songTemplate('short');
    return { club, short: songSections().map(s => s.name + ' ' + s.bars).join(' · '), bars: songBars(), mode: SONG.view.mode }; });
  ok('song: Full track = 96 bars · 3:06, Short = Intro 4 · Drop 8 · Outro 4 in Song mode', tp.club === '96 96 bars · 3:06' && tp.short === 'Intro 4 · Drop 8 · Outro 4' && tp.bars === 16 && tp.mode === 'song', `${tp.club} | ${tp.short}`);
  const pt = await E(() => { songTemplate('club'); const s = songFind('drop'), t = PROJ.tracks[0]; const a = s.parts[t.id].on; songSetPart(s.id, t.id, { on: false }); const b = songFind('drop').parts[t.id].on; undo(); return { a, b, c: songFind('drop').parts[t.id].on }; });
  ok('song: switch a part off, Undo brings it back', pt.a === true && pt.b === false && pt.c === true, JSON.stringify(pt));
  // UX-1 fix: a relaxed double-click (0.35 s, a tablet double-tap) opens the editor and leaves the part and the undo history as they were
  const dsel = await E(() => { songTemplate('club'); const s = songFind('drop 2'), t = PROJ.tracks[0]; const el = document.querySelector(`.part[data-sid="${s.id}"][data-tid="${t.id}"]`); el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, on: !!(s.parts[t.id] && s.parts[t.id].on), st: UNDO.stack.length }; });
  await p.mouse.move(dsel.x, dsel.y); await p.mouse.down(); await p.mouse.up(); await W(350); await p.mouse.down({ clickCount: 2 }); await p.mouse.up({ clickCount: 2 }); await W(400);
  const dc = await E(() => { const s = songFind('drop 2'), t = PROJ.tracks[0]; const r = { on: !!(s.parts[t.id] && s.parts[t.id].on), st: UNDO.stack.length, ed: !$('#editor').hidden && ED.tid === t.id }; closeEditor(); return r; });
  ok('song: a relaxed double-click (0.35 s) on a part opens the editor and leaves the part as it was', dc.ed && dc.on === dsel.on && dc.st === dsel.st, JSON.stringify(dc));
  // UX-1 fix: each change shows its own Undo chip, and the chip only undoes what it names
  const chp = await E(() => { const s = songFind('break'), t = PROJ.tracks[0], el = () => document.querySelector(`.part[data-sid="${s.id}"][data-tid="${t.id}"]`); const was = !!(s.parts[t.id] && s.parts[t.id].on);
    el().click(); const text = $('#songChip').hidden ? null : $('#songChipT').textContent; $('#songChipU').click(); const back = !!songFind('break').parts[t.id].on === was;
    el().click(); undoBoundary(); songResize('outro', 12); const label = $('#songChipT').textContent; undo(); undo(); return { text, back, label, outro: songFind('outro').bars }; });
  ok('song: clicking a part shows its own Undo chip, and that Undo undoes exactly it', /^\S.* (on|off) in Break$/.test(chp.text || '') && chp.back && /^Outro: 12 bars/.test(chp.label) && chp.outro === 16, JSON.stringify(chp));
  const pl = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); const calls = []; const orig = scheduleEvent; window.scheduleEvent = function (tr, e) { calls.push(e.B); return orig.apply(this, arguments); };
    songPlay({ from: 33 }); await W(400); loopStop(); const first = calls[0], sec = first != null ? songAt(first).section.name : null;
    calls.length = 0; songLoop('break', { play: false }); const range = songLoopRange(); songPlay({ from: 64 }); await W(2900); const beat = songBeatAt(A.ctx.currentTime), wrapped = calls.some(B => B < 200); loopStop(); songLoop(null); window.scheduleEvent = orig;
    return { first, sec, range, beat, wrapped }; });
  ok('song: play from bar 33 starts in the Drop', pl.first >= 128 && pl.first < 132 && pl.sec === 'Drop', `first note at beat ${pl.first} (${pl.sec})`);
  ok('song: loop the Break jumps back to its start', JSON.stringify(pl.range) === '[192,256]' && pl.beat >= 192 && pl.beat < 210 && pl.wrapped, `range ${JSON.stringify(pl.range)}, beat ${pl.beat && pl.beat.toFixed(1)}`);
  const mu = await E(() => { const t = PROJ.tracks.find(t => t.take === 'bass' || t.role === 'bass'), s = songFind('drop 2'), a0 = JSON.stringify(t.events); const L = songMakeUnique(s.id, t.id);
    t.patterns.B.events.push({ b: 0.5, d: 0.25, n: 40, v: 0.9 }); saveProject(); const st = songStartOf(s), d1 = songStartOf(songFind('drop')), fl = songFlat(t);
    return { L, same: JSON.stringify(t.events) === a0, inB: fl.some(e => e.n === 40 && Math.abs(e.B - st - 0.5) < 1e-6), inA: fl.some(e => e.n === 40 && Math.abs(e.B - d1 - 0.5) < 1e-6) }; });
  ok('song: Make unique gives Drop 2 its own pattern B; the other drops keep A', mu.L === 'B' && mu.same && mu.inB && !mu.inA, JSON.stringify(mu));
  const sp = await E(async () => { setTempo(124); songTemplate('short'); const t0 = performance.now(); const dr = PROJ.tracks.filter(t => trackAudible(t) && t.role === 'drums'); const m = await makeSongMp3(dr, null, { context: PROJ.tracks.filter(trackAudible) }); /* drums only keeps the check fast */ const ms = performance.now() - t0;
    const u = new Uint8Array(await m.blob.arrayBuffer()), d = await A.ctx.decodeAudioData(u.buffer.slice(0)); let pk = 0; for (let c = 0; c < d.numberOfChannels; c++) { const x = d.getChannelData(c); for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; } }
    return { dec: d.duration, pk: 20 * Math.log10(pk || 1e-9), rms: 20 * Math.log10(m.rms || 1e-9), sec: ms / 1000 }; });
  ok('song: whole-song MP3 of the Short layout, drums (decodes back, no clipping)', Math.abs(sp.dec - 33.0) < 0.1 && sp.pk < 0 && sp.rms > -40, `${sp.dec.toFixed(2)} s, peak ${sp.pk.toFixed(2)} dBFS, RMS ${sp.rms.toFixed(1)} dB, ${sp.sec.toFixed(0)} s to make`);
  const rc = await E(() => { songMode('song'); recordPress(); const m = SONG.view.mode; loopStop(); return m; });
  ok('song: Rec in Song mode switches to Loop', rc === 'loop', rc);
  const before = await E(async () => { songTemplate('short'); PROJ.name = 'Before reload'; saveProject(); await new Promise(r => setTimeout(r, 600)); return { id: PROJ.id, n: PROJ.tracks.length, s: songSections().length }; });
  await p.reload({ waitUntil: 'load', timeout: 60000 }); await W(1500);
  await p.waitForFunction(() => { const s = document.querySelector('#saveState'); return s && /New song/.test(s.textContent); }, { timeout: 15000 }).catch(() => {}); // keepLastSong is async: wait for it on a busy machine
  const rl = await E(async id => { const n0 = PROJ.tracks.length, name0 = PROJ.name; let r = null; try { r = await IDB.get(id, 'projects'); } catch (e) {} if (r) await loadNamed(id);
    return { n0, name0, listed: !!r, name: PROJ.name, n: PROJ.tracks.length, s: songSections().length, label: $('#saveState').textContent }; }, before.id);
  ok('song: opening the app starts a new empty song; the last one reopens from the list intact', rl.n0 === 0 && rl.listed && rl.name === 'Before reload' && rl.n === before.n && rl.s === before.s, `new song had ${rl.n0} tracks; reopened "${rl.name}" ${rl.n} tracks, ${rl.s} sections`);
  // QA, 13 Nov: after opening a song from the list, Undo must step back inside that song, never to the empty song opened before it
  const uo = await E(async () => { const s = songSections()[0], t = PROJ.tracks[0]; songSetPart(s.id, t.id, { on: !(s.parts[t.id] && s.parts[t.id].on) }); await new Promise(r => setTimeout(r, 200)); undo(); await new Promise(r => setTimeout(r, 200)); return { name: PROJ.name, n: PROJ.tracks.length, s: songSections().length }; });
  ok('song: Undo right after opening a song stays in that song', uo.name === 'Before reload' && uo.n === before.n && uo.s === before.s, `after one change + Undo: "${uo.name}" ${uo.n} tracks, ${uo.s} sections`);
  ok('song: after opening a song the header shows when it was saved, not "New song"', /^Saved /.test(rl.label), rl.label);
  // 9. phone width: no sideways scroll (UX-2)
  await p.setViewport({ width: 390, height: 844 }); await W(400); const sw = await E(() => document.documentElement.scrollWidth); await p.setViewport({ width: 1400, height: 1100 });
  ok('phone width has no sideways scroll', sw <= 390, `${sw} px`);
} catch (e) { ok('test run', false, e.message); }
ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
await b.close();
const failed = results.filter(x => !x).length; console.log(failed ? `SMOKE FAILED: ${failed} of ${results.length}` : `SMOKE OK: ${results.length} checks`); process.exit(failed ? 1 : 0);
