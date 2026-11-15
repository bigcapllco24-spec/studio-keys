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
  // QA, 14 Nov: "MIDI only" in Song mode exports the whole layout (96 bars), not the 4-bar loop; Drop 2 carries pattern B
  const mx = await E(() => { songMode('song'); const tr = PROJ.tracks.filter(trackAudible), fl = songFlatTracks(tr), u = buildMidi(fl, CTRL.bpm, songBeats(), 'qa');
    let i = 14, t = 0; if (String.fromCharCode(...u.slice(i, i + 4)) === 'MTrk') { const end = i + 8 + ((u[i + 4] << 24) | (u[i + 5] << 16) | (u[i + 6] << 8) | u[i + 7]); i += 8;
      while (i < end) { let v = 0, c; do { c = u[i++]; v = (v << 7) | (c & 127); } while (c & 128); t += v; if (u[i] === 0xff) { i += 2; let l = 0; do { c = u[i++]; l = (l << 7) | (c & 127); } while (c & 128); i += l; } else break; } }
    const last = Math.max(...fl.flatMap(x => x.events.map(e => e.b + e.d))), bass = fl.find(x => x.role === 'bass' || x.take === 'bass'), d2 = songStartOf(songFind('drop 2'));
    return { bars: t / 480 / 4, song: songBars(), last: +last.toFixed(2), beats: songBeats(), b40: !!bass && bass.events.some(e => e.n === 40 && Math.abs(e.b - d2 - 0.5) < 1e-6) }; });
  ok('song: MIDI only exports the whole song, pattern B where it plays', mx.bars === mx.song && mx.song === 96 && mx.last <= mx.beats && mx.last > mx.beats - 8 && mx.b40, JSON.stringify(mx));
  // QA, 13 Nov (UX-2 with UX-1): editor opened on Drop 2's pattern B: velocity lane fits, group drag moves the selected B notes only, A untouched, one undo step
  const vb = await E(() => { const t = PROJ.tracks.find(t => t.take === 'bass' || t.role === 'bass'), s = songFind('drop 2'); openEditor(t.id, { sid: s.id, pat: 'B' }); $('#editor').scrollIntoView({ block: 'center' });
    const ev = edTrack().events, k = Math.min(6, ev.length - 1); ev.forEach((e, i) => e.v = i % 2 ? 0.5 : 0.7); ED.sel = new Set(ev.slice(0, k)); drawEditor(); saveProject();
    const w = $('#edWrap'), G = edGeom(), cr = $('#edCanvas').getBoundingClientRect(), e = ev[0], vy = cr.top + G.gh + 8;
    return { pat: ED.pat, k, a0: JSON.stringify(t.events.map(e => e.v)), fits: w.scrollHeight <= w.clientHeight && vy + ED.velH <= innerHeight, x: cr.left + G.K + e.b * G.bw + 1, y0: vy + 3 + 0.3 * (ED.velH - 6), y1: vy + 3 + 0.1 * (ED.velH - 6), u0: UNDO.stack.length }; });
  await W(300); await p.mouse.move(vb.x, vb.y0); await p.mouse.down(); await p.mouse.move(vb.x, vb.y1, { steps: 4 }); await p.mouse.up(); await W(200);
  const vbr = await E(o => { const t = PROJ.tracks.find(t => t.take === 'bass' || t.role === 'bass'), B = t.patterns.B.events; const r = { v: B.slice(0, o.k + 1).map(e => +e.v.toFixed(2)), aSame: JSON.stringify(t.events.map(e => e.v)) === o.a0, steps: UNDO.stack.length - o.u0 }; closeEditor(); return r; }, vb);
  ok('song: editor on a part\'s pattern B shows the velocity lane; group drag edits B only', vb.pat === 'B' && vb.k >= 2 && vb.fits && vbr.v.slice(0, vb.k).every((v, i) => Math.abs(v - (i % 2 ? 0.7 : 0.9)) < 0.03) && vbr.v[vb.k] === (vb.k % 2 ? 0.5 : 0.7) && vbr.aSame && vbr.steps === 1, `B ${vbr.v.join(' ')}, A same ${vbr.aSame}, ${vbr.steps} undo step`);
  const sp = await E(async () => { setTempo(124); songTemplate('short'); const t0 = performance.now(); const dr = PROJ.tracks.filter(t => trackAudible(t) && t.role === 'drums'); const m = await makeSongMp3(dr, null, { context: PROJ.tracks.filter(trackAudible) }); /* drums only keeps the check fast */ const ms = performance.now() - t0;
    const u = new Uint8Array(await m.blob.arrayBuffer()), d = await A.ctx.decodeAudioData(u.buffer.slice(0)); let pk = 0; for (let c = 0; c < d.numberOfChannels; c++) { const x = d.getChannelData(c); for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; } }
    return { dec: d.duration, pk: 20 * Math.log10(pk || 1e-9), rms: 20 * Math.log10(m.rms || 1e-9), sec: ms / 1000 }; });
  ok('song: whole-song MP3 of the Short layout, drums (decodes back, no clipping)', Math.abs(sp.dec - 33.0) < 0.1 && sp.pk < 0 && sp.rms > -40, `${sp.dec.toFixed(2)} s, peak ${sp.pk.toFixed(2)} dBFS, RMS ${sp.rms.toFixed(1)} dB, ${sp.sec.toFixed(0)} s to make`);
  const rc = await E(() => { songMode('song'); recordPress(); const m = SONG.view.mode; loopStop(); return m; });
  ok('song: Rec in Song mode switches to Loop', rc === 'loop', rc);
  // UX-5: a part sung in Song mode lands like a part Keys adds (selected section only) and says where it plays, once back in Song mode
  // a chords take left by check 6b would make this a re-sung take (keeps its old placement, no toast), so start from no chords take
  await E(() => { PROJ.tracks.filter(t => t.take === 'chords').forEach(t => removeTrack(t.id)); songTemplate('short'); songSelect('intro'); window.__toasts = []; const o = toast; window.toast = function (m) { window.__toasts.push(m); return o.apply(this, arguments); };
    runActions([{ type: 'add_melody' }]); window.__ref = PROJ.tracks[PROJ.tracks.length - 1].id; ASSIST.run('let me sing the chords'); });
  await p.waitForFunction(() => PROJ.tracks.some(t => t.take === 'chords') && LOOP.state !== 'take', { timeout: 40000 }).catch(() => {}); await W(1300); // the toast shows 0.9 s after the take
  const sg = await E(() => { const S = songSections(), t = PROJ.tracks.find(t => t.take === 'chords'), on = id => S.filter(s => s.parts[id] && s.parts[id].on).map(s => s.name).join(',');
    const r = { mode: SONG.view.mode, sung: t ? on(t.id) : null, ref: on(window.__ref), toast: window.__toasts.find(m => /Sung chords/.test(m)) || null }; loopStop(); return r; });
  ok('song: sing the chords in Song mode → plays in the selected section like an added part, and a toast says so', sg.mode === 'song' && sg.sung === 'Intro' && sg.sung === sg.ref && /^“Sung chords” plays in Intro\. Click its empty parts/.test(sg.toast || ''), JSON.stringify(sg));
  const before = await E(async () => { songTemplate('short'); PROJ.name = 'Before reload'; saveProject(); await new Promise(r => setTimeout(r, 600)); return { id: PROJ.id, n: PROJ.tracks.length, s: songSections().length }; });
  await p.reload({ waitUntil: 'load', timeout: 60000 }); await W(1500);
  await p.waitForFunction(() => { const s = document.querySelector('#saveState'); return s && /New song/.test(s.textContent); }, { timeout: 15000 }).catch(() => {}); // keepLastSong is async: wait for it on a busy machine
  // keepLastSong writes the list in the background: poll up to 5 s for the renamed song (QA 15 Nov: 1 run in 4 read the list before the write landed)
  const rl = await E(async id => { const n0 = PROJ.tracks.length, name0 = PROJ.name; let r = null; for (let i = 0; i < 20; i++) { try { r = await IDB.get(id, 'projects'); } catch (e) {} if (r && r.name === 'Before reload') break; await new Promise(x => setTimeout(x, 250)); } if (r) await loadNamed(id);
    return { n0, name0, listed: !!r, name: PROJ.name, n: PROJ.tracks.length, s: songSections().length, label: $('#saveState').textContent }; }, before.id);
  ok('song: opening the app starts a new empty song; the last one reopens from the list intact', rl.n0 === 0 && rl.listed && rl.name === 'Before reload' && rl.n === before.n && rl.s === before.s, `new song had ${rl.n0} tracks; reopened "${rl.name}" ${rl.n} tracks, ${rl.s} sections`);
  // QA, 13 Nov: after opening a song from the list, Undo must step back inside that song, never to the empty song opened before it
  const uo = await E(async () => { const s = songSections()[0], t = PROJ.tracks[0]; songSetPart(s.id, t.id, { on: !(s.parts[t.id] && s.parts[t.id].on) }); await new Promise(r => setTimeout(r, 200)); undo(); await new Promise(r => setTimeout(r, 200)); return { name: PROJ.name, n: PROJ.tracks.length, s: songSections().length }; });
  ok('song: Undo right after opening a song stays in that song', uo.name === 'Before reload' && uo.n === before.n && uo.s === before.s, `after one change + Undo: "${uo.name}" ${uo.n} tracks, ${uo.s} sections`);
  ok('song: after opening a song the header shows when it was saved, not "New song"', /^Saved /.test(rl.label), rl.label);
  // 9. phone width: no sideways scroll (UX-2)
  await p.setViewport({ width: 390, height: 844 }); await W(400); const sw = await E(() => document.documentElement.scrollWidth); await p.setViewport({ width: 1400, height: 1100 });
  ok('phone width has no sideways scroll', sw <= 390, `${sw} px`);
  // 8. SE-3 drum feel: hats lift on 2 and 4, "more swing" = full triplet swing, "less swing" steps down, drummer push
  await E(() => newSong('Smoke feel')); await W(300);
  const fe = await E(() => { const R = {}, avg = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length), drums = () => PROJ.tracks.find(t => t.role === 'drums');
    const said = txt => { LAST_TEXT.text = txt; const r = runActions(localBrain(txt).actions); LAST_TEXT.text = ''; return { r: r.join(), sw: drums().recipe.swing }; };
    runActions([{ type: 'add_drums', style: 'house', hats: '16th', seed: 4242 }]); const pos = e => Math.round((e.b % 4) * 4), h = drums().events.filter(e => e.n === 42);
    R.on24 = avg(h.filter(e => [4, 12].includes(pos(e))).map(e => e.v)); R.on13 = avg(h.filter(e => [0, 8].includes(pos(e))).map(e => e.v)); R.off = avg(h.filter(e => pos(e) % 2 === 1).map(e => e.v));
    R.more = said('more swing'); const odd = drums().events.filter(e => e.n === 42 && Math.floor(e.b * 4 + 0.3) % 2 === 1).map(e => (e.b * 4 - Math.floor(e.b * 4 + 0.3)) / 4); R.lag = avg(odd);
    R.less = [said('less swing'), said('less swing'), said('less swing')]; R.exact = said('swing 58%'); R.none = said('no swing');
    runActions([{ type: 'add_drums', style: 'boombap', swing: 0 }]); const bpm = CTRL.bpm; R.kickMs = avg(drums().events.filter(e => e.n === 36 && e.b > 0).map(e => (e.b - Math.round(e.b * 4) / 4) * 60000 / bpm));
    return R; });
  // on main beats 1/3 and 2/4 got the same accent, so 2/4 > 1/3 is what tells the measured feel apart
  ok('hats lift on beats 2 and 4, in-between 16ths sit back', fe.on24 > fe.on13 * 1.05 && fe.on24 > fe.off * 1.2, `2/4 ${fe.on24.toFixed(2)} vs 1/3 ${fe.on13.toFixed(2)} vs off-16ths ${fe.off.toFixed(2)}`);
  ok('"more swing" is full triplet swing (off-16ths 1/12 beat late)', fe.more.sw > 0.32 && Math.abs(fe.lag - 1 / 12) < 0.01 && /66%/.test(fe.more.r), `${fe.lag.toFixed(3)} beat · ${fe.more.r}`);
  ok('"less swing" steps down (66 → 58 → 54 → straight), exact "swing 58%", "no swing"', fe.less.map(x => x.sw).join() === '0.16,0.08,0' && /58%/.test(fe.less[0].r) && Math.abs(fe.exact.sw - 0.16) < 0.005 && fe.none.sw === 0, fe.less.map(x => x.r).join(' → '));
  ok('human styles: kick pushes about 10 ms early', fe.kickMs < -6 && fe.kickMs > -14, `${fe.kickMs.toFixed(1)} ms`);
  // with the AI on (mocked like the old live prompt, which sends swing 0 for "less swing"), the user's words still step down
  const ai = await E(async () => { const of = window.fetch, eng = ASSIST.engine, drums = () => PROJ.tracks.find(t => t.role === 'drums');
    window.fetch = async (u, o) => String(u).includes('/api/assistant') ? new Response(JSON.stringify({ reply: 'Less swing.', actions: [{ type: 'groove', swing: 0 }] }), { status: 200 }) : of(u, o);
    try { ASSIST.engine = 'llama'; runActions([{ type: 'groove', swing: 0.333 }]); await handleRequest('less swing'); return drums().recipe.swing; } finally { window.fetch = of; ASSIST.engine = eng; } });
  ok('with the AI on, "less swing" still steps 66% → 58% (your words win over its number)', ai === 0.16, String(ai));
  // SE-3 fix B1: swing words next to another request do both (offline parser through handleRequest)
  const b1 = await E(async () => { const eng = ASSIST.engine, drums = () => PROJ.tracks.find(t => t.role === 'drums');
    try { ASSIST.engine = null; runActions([{ type: 'add_drums', style: 'house', swing: 0 }]); const n0 = PROJ.tracks.filter(t => t.role === 'bass').length;
      await handleRequest('add a bassline with some swing'); return { bass: PROJ.tracks.filter(t => t.role === 'bass').length - n0, sw: drums().recipe.swing }; } finally { ASSIST.engine = eng; } });
  ok('"add a bassline with some swing" adds the bassline AND swings the drums', b1.bass === 1 && b1.sw > 0.3, `+${b1.bass} bass, swing ${b1.sw}`);
  // SE-3 re-check: swing said about a part or "in the groove/hats" only swings the drums (no new tracks, no new beat, hats kept)
  const b1b = await E(async () => { const eng = ASSIST.engine, drums = () => PROJ.tracks.find(t => t.role === 'drums'), R = [];
    try { ASSIST.engine = null;
      for (const s of ['more swing on the chords', 'more swing in the groove', 'less swing in the hats']) {
        await newSong('Smoke swing words'); runActions([{ type: 'add_drums', style: 'house', hats: '16th', swing: 0.16, seed: 5150 }, { type: 'add_chords', seed: 5151 }]); loopStop();
        const n0 = PROJ.tracks.length, hats0 = drums().recipe.hats, sw0 = drums().recipe.swing;
        await handleRequest(s); loopStop(); const d = drums(); R.push({ s, extra: PROJ.tracks.length - n0, hats: hats0 === d.recipe.hats, moved: d.recipe.swing !== sw0 }); }
      return R; } finally { ASSIST.engine = eng; } });
  const b1bBad = b1b.filter(x => x.extra || !x.hats || !x.moved);
  ok('swing said about a part or "in the groove/hats" only changes the drums\' swing', !b1bBad.length, b1bBad.map(x => `"${x.s}": +${x.extra} tracks${x.hats ? '' : ', hats changed'}${x.moved ? '' : ', swing unchanged'}`).join('; ') || 'ok');
  // SE-3 fix 2: "faster" about a part keeps the song tempo; only the plain "add a snare" swaps the clap backbeat
  const n23 = await E(async () => { const eng = ASSIST.engine, drums = () => PROJ.tracks.find(t => t.role === 'drums'), R = {};
    try { ASSIST.engine = null;
      for (const s of ['make the bass faster', 'faster chords', 'make it faster', 'add a snare roll', 'add a snare']) {
        await newSong('Smoke faster snare'); runActions([{ type: 'add_drums', style: 'house', seed: 5160 }, { type: 'add_bass', seed: 5161 }]); loopStop();
        const bpm0 = CTRL.bpm; await handleRequest(s); loopStop(); R[s] = { bpm: CTRL.bpm - bpm0, back: drums().recipe.back }; }
      return R; } finally { ASSIST.engine = eng; } });
  ok('"faster" about a part keeps the tempo, "add a snare roll" keeps the clap', n23['make the bass faster'].bpm === 0 && n23['faster chords'].bpm === 0 && n23['make it faster'].bpm === 5 && n23['add a snare roll'].back !== 'snare' && n23['add a snare'].back === 'snare', JSON.stringify(n23));
  // SE-7a: the honest key (chip, every pitched part counts, short hums don't lock it, old songs don't move)
  const hk = await E(async () => { await newSong('Smoke key'); const R = { empty: keyStatusText(), chip: $('#keyInfo').textContent.trim() };
    const ev = [], bs = []; [[5, 9, 0], [10, 2, 5], [0, 4, 7], [5, 9, 0]].forEach((c, i) => { c.forEach(pc => ev.push({ b: i * 4, d: 3.9, n: nearestAbove(pc, 57), v: 0.7 })); [0, 2].forEach(o => bs.push({ b: i * 4 + o, d: 1.9, n: nearestAbove(c[0], 36), v: 0.9 })); });
    addTrack({ role: 'chords', inst: 'piano', name: 'My chords', events: ev }); addTrack({ role: 'bass', inst: 'bass', name: 'My bass', events: bs }); R.det = keyStatusText(); R.detChip = $('#keyInfo').innerText.replace(/\s+/g, ' ').trim();
    runActions([{ type: 'add_melody' }]); loopStop(); const sc = scaleOf({ tonic: 5, mode: 'major' }), m = PROJ.tracks.find(t => t.role === 'melody'); R.n = m.events.length; R.out = m.events.filter(e => !sc.includes(mod(e.n, 12))).length;
    await newSong('Smoke hum'); takeKey([60, 64, 67].map((n, i) => ({ b: i, d: 1, n, v: 0.8 }))); R.hum = keyStatusText(); R.humKey = PROJ.key;
    /* a song saved before SE-7: parts generated in the old default key (A minor), no key stored */
    await newSong('Smoke old'); PROJ.style = 'house'; PROJ.key = { tonic: 9, mode: 'minor' }; PROJ.prog = [0, 5, 2, 6];
    const old = { id: 'psmokeold', name: 'Smoke old key', bars: 4, key: null, style: 'house', prog: [0, 5, 2, 6], tracks: [
      { id: 'to1', kind: 'notes', role: 'bass', inst: 'pluckbass', gen: true, name: 'Bassline', events: genBass('house', 16, 5), vol: 0.8, lo: 0, mid: 0, hi: 0, fx: {} },
      { id: 'to2', kind: 'notes', role: 'chords', inst: 'piano', gen: true, name: 'Chords', events: genChords('house', 16, 9), vol: 0.6, lo: 0, mid: 0, hi: 0, fx: {} }] };
    const before = JSON.stringify(old.tracks.map(t => t.events)); PROJ.key = null;
    await IDB.put(old.id, { key: old.id, name: old.name, bpm: 124, bars: 4, tracks: 2, savedAt: Date.now(), proj: old }, 'projects'); await newSong('Smoke other'); await loadNamed(old.id);
    R.oldSame = JSON.stringify(PROJ.tracks.map(t => t.events)) === before; R.old = keyStatusText();
    runActions([{ type: 'add_bass', new: true }]); loopStop(); const nb = PROJ.tracks[PROJ.tracks.length - 1], am = scaleOf({ tonic: 9, mode: 'minor' }); R.oldNew = nb.events.filter(e => !am.includes(mod(e.n, 12))).length;
    return R; });
  ok('key: an empty song says "no key yet"', hk.empty === 'no key yet' && hk.chip === 'no key yet', hk.chip);
  ok('key: F major chords + bass (no melody) read F major, and a new melody uses only F major notes', /^F major/.test(hk.det) && hk.n > 4 && hk.out === 0, `${hk.det} (chip "${hk.detChip}"), melody ${hk.n} notes, ${hk.out} outside F major`);
  ok('key: a 3-note hum does not lock the key', hk.hum === 'no key yet' && hk.humKey === null, hk.hum);
  ok('key: a song saved before SE-7 reopens without its parts moving, and new parts stay in its old key', hk.oldSame && hk.old === 'A minor · Keys picked' && hk.oldNew === 0, `${hk.old}, parts unchanged ${hk.oldSame}, new bass ${hk.oldNew} notes outside A minor`);
  // SE-7a (QA): the key popover's Set only relabels (notes stay), Undo goes back to auto, Back to auto works; Keys picks a key for a bass on a drums-only song
  const kpop = await E(async () => { await newSong('Smoke key pop'); const ch = []; [[9, 0, 4], [5, 9, 0], [0, 4, 7], [7, 11, 2]].forEach((c, i) => c.forEach(pc => ch.push({ b: i * 4, d: 3.9, n: nearestAbove(pc, 55), v: 0.7 }))); addTrack({ role: 'chords', inst: 'piano', name: 'My chords', events: ch });
    const R = { auto: keyStatusText() }, n0 = JSON.stringify(PROJ.tracks.map(t => t.events.map(e => e.n))); await new Promise(r => setTimeout(r, 200));
    $('#keyInfo').click(); R.open = !$('#keyPop').hidden; R.rows = document.querySelectorAll('#keyPop [data-kset]').length; document.querySelector('#keyPop [data-kset="1"]').click();
    R.set = keyStatusText(); R.menu = $('#keySel').value; R.same = JSON.stringify(PROJ.tracks.map(t => t.events.map(e => e.n))) === n0; R.closed = $('#keyPop').hidden;
    await new Promise(r => setTimeout(r, 200)); undo(); R.undo = keyStatusText(); redo(); $('#keyInfo').click(); document.querySelector('#keyPop [data-kauto]').click(); R.back = keyStatusText();
    await newSong('Smoke key picked'); runActions([{ type: 'add_drums', style: 'house' }, { type: 'add_bass' }]); loopStop(); R.picked = keyStatusText(); R.chip = $('#keyInfo').innerText.trim(); return R; });
  ok('key: popover Set relabels without moving notes, Undo goes back to auto, "Back to auto" works; Keys picks a key for a bass on a drums-only beat', kpop.open && kpop.rows === 3 && / · set$/.test(kpop.set) && kpop.menu !== '' && kpop.same && kpop.closed && kpop.undo === kpop.auto && kpop.back === kpop.auto && /· Keys picked$/.test(kpop.picked) && kpop.chip === 'Keys picked', `${kpop.auto} → ${kpop.set} → undo ${kpop.undo} → back ${kpop.back}; drums + bass: ${kpop.picked}`);
  // SE-7a fix 1 + 3: a sung tune alone is never read through fake "bass" roots (A C G E G A C G G reads C major or A minor, and
  // Keys builds its bass in a key those notes fit); the key's label names its real source (singing, recording, or plain notes)
  const kfix = await E(async () => { const R = {}; const tune = [[0, 69], [1, 60], [2, 67], [4, 64], [5, 67], [6, 69], [8, 72], [10, 67], [12, 67]].map(([b, n]) => ({ b, d: 1, n, v: 0.85 }));
    const okKey = k => !!k && ((k.tonic === 0 && k.mode === 'major') || (k.tonic === 9 && k.mode === 'minor'));
    await newSong('Smoke tune'); PROJ.style = 'house'; addTrack({ role: 'melody', inst: 'lead', name: 'Sung melody', events: tune }); const st = keyStatus(); R.tune = keyStatusText(st); R.tuneOk = okKey(st.key) && !/bass/.test(st.why);
    await newSong('Smoke short tune'); PROJ.style = 'house'; runActions([{ type: 'add_drums', style: 'house' }]); addTrack({ role: 'melody', inst: 'lead', name: 'Sung melody', events: tune.slice(0, 7) }); runActions([{ type: 'add_bass' }]); loopStop();
    const pk = keyStatus().key, bb = PROJ.tracks.find(t => t.role === 'bass'); R.picked = keyStatusText(); R.pickOk = okKey(pk) && bb && bb.events.every(e => scaleOf(pk).includes(mod(e.n, 12)));
    await newSong('Smoke sung'); takeKey(tune, true, 'sing'); R.sung = keyStatusText();
    await newSong('Smoke rec'); takeKey(tune, true, 'audio'); R.rec = keyStatusText();
    await newSong('Smoke chords then sing'); const ch = []; [[9, 0, 4], [5, 9, 0], [0, 4, 7], [7, 11, 2]].forEach((c, i) => c.forEach(pc => ch.push({ b: i * 4, d: 3.9, n: nearestAbove(pc, 55), v: 0.7 }))); addTrack({ role: 'chords', inst: 'piano', name: 'My chords', events: ch });
    takeKey(tune, true, 'sing'); R.overChords = keyStatusText(); return R; });
  ok('key: a sung tune alone reads C major or A minor (no fake bass roots), and Keys builds a bass for 7 sung notes in a key they fit', kfix.tuneOk && kfix.pickOk, `tune: ${kfix.tune}; 7 notes + bass: ${kfix.picked}`);
  ok('key: the label names its real source (singing, recording; chords that already gave the key stay plain)', / · from your singing$/.test(kfix.sung) && / · from your recording$/.test(kfix.rec) && /^A minor/.test(kfix.overChords) && !/from your/.test(kfix.overChords), `${kfix.sung} / ${kfix.rec} / chords then a sung take: ${kfix.overChords}`);
  // SE-7a fix 1 (QA retest): with no bass part the reasons never mention a bass, and F♯m–E–D–E's second guess is A major (same notes);
  // a 12-note hum on an empty song says "it sounds like D minor" (a guess), not "in D minor"
  const kwhy = await E(async () => { await newSong('Smoke why'); const ch = []; [[6, 9, 1], [4, 8, 11], [2, 6, 9], [4, 8, 11]].forEach((c, i) => c.forEach(pc => ch.push({ b: i * 4, d: 3.8, n: nearestAbove(pc, 55), v: 0.7 }))); addTrack({ role: 'chords', inst: 'piano', name: 'My chords', events: ch });
    const st = keyStatus(), R = { text: keyStatusText(st), why: st.cands.map(c => c.why).join(' / ') };
    await newSong('Smoke hum reply'); Object.assign(ASSIST, { listening: true, hum: true, speaking: false, busy: false, speechAt: -99 });
    for (const n of [62, 65, 69, 67, 65, 64, 62, 60, 62, 65, 64, 62]) { humNote(n, true); await new Promise(r => setTimeout(r, 150)); humNote(n, false); await new Promise(r => setTimeout(r, 30)); }
    for (let i = 0; i < 20 && !PROJ.tracks.length; i++) await new Promise(r => setTimeout(r, 250)); ASSIST.listening = false;
    const bub = [...document.querySelectorAll('#asChat .bub.as')].pop(); R.reply = bub ? bub.textContent : ''; R.hum = keyStatusText(); return R; });
  ok('key: reasons name what is there (no bass → no "bass" reason, F♯m–E–D–E second guess A major); a hum\'s key is a guess', /^F♯ minor · \w[\w ]* · or A major$/.test(kwhy.text) && !/bass/.test(kwhy.why) && /it sounds like D minor/.test(kwhy.reply) && !/ in D minor/.test(kwhy.reply) && kwhy.hum === 'D minor · from your humming', `${kwhy.text} (${kwhy.why}); hum: ${kwhy.hum}`);
  // SE-7a fix 2 (QA retest): picking a key moves the parts when the key came from your notes (a hum, chords you played), one undo
  // step; the popover's Set still only relabels; the key chip follows piano-roll edits
  const kmv = await E(async () => { const out = (k) => PROJ.tracks.reduce((s, t) => s + (t.kind === 'notes' && t.role !== 'drums' ? t.events.filter(e => !scaleOf(k).includes(mod(Math.round(e.n), 12))).length : 0), 0);
    const R = {}, cm = { tonic: 0, mode: 'minor' }, wait = ms => new Promise(r => setTimeout(r, ms));
    await newSong('Smoke key move'); PROJ.style = 'house'; const hum = [62, 65, 69, 67, 65, 64, 62, 60, 62, 65, 64, 62].map((n, i) => ({ b: i, d: 0.9, n, v: 0.8 }));
    takeKey(hum, true, 'hum'); addTrack({ role: 'melody', inst: 'lead', name: 'Hum', events: hum }); runActions([{ type: 'add_bass' }, { type: 'add_chords' }]); loopStop();
    R.hum = keyStatusText(); R.before = out(cm); await wait(250); runActions([{ type: 'key', key: 'C minor' }]); R.after = out(cm); R.set = keyStatusText(); R.hn = PROJ.tracks.find(t => t.name === 'Hum').events[0].n;
    await wait(250); undo(); R.undo = keyStatusText(); R.hn0 = PROJ.tracks.find(t => t.name === 'Hum').events[0].n;
    await newSong('Smoke key move 2'); PROJ.style = 'house'; const ch = []; [[57, 60, 64], [53, 57, 62], [52, 55, 59], [57, 60, 64]].forEach((c, r) => c.forEach(n => ch.push({ b: r * 4, d: 3.8, n, v: 0.7 })));
    addTrack({ role: 'chords', inst: 'piano', name: 'My chords', events: ch }); runActions([{ type: 'add_bass' }]); loopStop(); R.am = keyStatusText();
    const sel = $('#keySel'); sel.value = '0:minor'; sel.dispatchEvent(new Event('change')); R.menu = out(cm); R.chordN = PROJ.tracks.find(t => t.name === 'My chords').events[0].n;
    await newSong('Smoke key relabel'); addTrack({ role: 'chords', inst: 'piano', name: 'My chords', events: ch.map(e => Object.assign({}, e)) }); R.rel0 = PROJ.tracks[0].events[0].n; $('#keyInfo').click(); document.querySelector('#keyPop [data-kset="0"]').click(); R.relabel = PROJ.tracks[0].events[0].n; R.relKey = keyStatusText();
    await newSong('Smoke key chip'); const t = addTrack({ role: 'free', inst: 'piano', name: 'Draw', events: [] }); R.chip0 = $('#keyInfo').textContent.trim(); openEditor(t.id);
    [[62, 65, 69], [58, 62, 65], [65, 69, 72], [60, 64, 67]].forEach((c, i) => c.forEach(n => edTrack().events.push({ b: i * 4, d: 3.5, n, v: 0.7 }))); edChanged(); await wait(300); R.chip1 = $('#keyInfo').textContent.replace(/\s+/g, ' ').trim();
    ED.sel = new Set(edTrack().events); edShift(1); edShift(1); await wait(300); R.chip2 = $('#keyInfo').textContent.replace(/\s+/g, ' ').trim(); closeEditor();
    /* QA retest 2: a key Keys or a vibe picks never moves notes whose key came from a hum */
    R.soft = []; for (const [tonic, from] of [[0, 'keys'], [5, 'vibe']]) { await newSong('Smoke key soft'); const hm = [62, 65, 69, 67, 65, 64, 62, 60, 62, 65, 64, 62].map((n, i) => ({ b: i, d: 0.9, n, v: 0.8 }));
      takeKey(hm, true, 'hum'); addTrack({ role: 'melody', inst: 'lead', name: 'Hum', events: hm }); setKey({ tonic, mode: 'minor' }, from); R.soft.push(PROJ.tracks[0].events[0].n); } return R; });
  ok('key: picking a key moves parts whose key came from your notes (hum, played chords), one undo; Set only relabels; Keys/vibe keys never move notes; chip follows the piano roll (draw, transpose)',
    / · from your humming$/.test(kmv.hum) && kmv.before > 0 && kmv.after === 0 && kmv.set === 'C minor · set' && kmv.hn === 60 && kmv.hn0 === 62 && /^D minor/.test(kmv.undo)
    && /^A minor/.test(kmv.am) && kmv.menu === 0 && kmv.chordN === 60 && kmv.relabel === kmv.rel0 && / · set$/.test(kmv.relKey) && /no key yet/.test(kmv.chip0) && /^D minor/.test(kmv.chip1) && /^E minor/.test(kmv.chip2) && kmv.soft.join() === '62,62',
    `hum ${kmv.hum}: ${kmv.before} → ${kmv.after} outside C minor (${kmv.set}), undo ${kmv.undo}; played Am → menu C minor: ${kmv.menu} outside; Set → ${kmv.relKey}, note ${kmv.rel0} → ${kmv.relabel}; chip ${kmv.chip0} → ${kmv.chip1} → +2: ${kmv.chip2}; Keys/vibe key on a hum: notes ${kmv.soft.join(' / ')}`);
  // SE-7b/7c (QA, 15 Nov): a dropped-in song's key, tempo and chords; the song card, chord strip, fixer, setKey and voice
  await E(async () => { await newSong('Smoke song card'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]); setTempo(120); loopStop();
    PROJ.tracks.push(makeTrack({ role: 'chords', inst: 'grand', gen: false, name: 'My chords', events: [62, 65, 69].map(n => ({ n, b: 0, d: 3.5, v: 0.8 })) })); saveProject(); window.__toasts = []; if (!window.__toastSpy) { window.__toastSpy = 1; const o = toast; window.toast = function (m) { (window.__toasts = window.__toasts || []).push(m); return o.apply(this, arguments); }; } });
  const q7su0 = await E(() => { undoBoundary(); return UNDO.stack.length; }); await (await p.$('#importFile')).uploadFile(fx('song-em124.wav'));
  await p.waitForFunction(() => { const t = PROJ.tracks.find(t => t.kind === 'audio'); return t && t.ana && !ANA_RUN.has(t.id) && document.querySelector('.songcard:not(.busy)'); }, { timeout: 60000 }).catch(() => {});
  const q7sc = await E(q7su0 => { const t = PROJ.tracks.find(t => t.kind === 'audio'), c = document.querySelector('.songcard:not(.busy)');
    return { ana: !!(t && t.ana), key: t && t.ana && t.ana.key ? keyName(t.ana.key) : null, bpm: t && t.ana && t.ana.bpm, card: c ? c.innerText.replace(/\s+/g, ' ') : '', prog: (window.__toasts || []).some(m => /Listening to .+ \d+%/.test(m)), steps: UNDO.stack.length - q7su0 }; }, q7su0);
  ok('song: an imported song is heard (progress toast) and its card shows key, DJ key and BPM; listening is not an undo step', q7sc.ana && q7sc.key === 'E minor' && q7sc.bpm === 124 && /E minor/.test(q7sc.card) && /DJ key 9A/.test(q7sc.card) && /124 BPM/.test(q7sc.card) && /LOOP Em · C · G · D On your song/.test(q7sc.card) && q7sc.prog && q7sc.steps === 1, `${q7sc.key} ${q7sc.bpm} · progress toast ${q7sc.prog} · undo +${q7sc.steps} · ${q7sc.card.slice(0, 160)}`);
  await W(300); const q7sp0 = await E(() => UNDO.stack.length); await p.click('[data-scput]').catch(() => {}); await W(400);
  const q7sput = await E(q7sp0 => { const t = PROJ.tracks.find(t => t.fromSong && t.role === 'chords'), my = PROJ.tracks.find(t => t.name === 'My chords'); return { tr: !!(t && t.gen), keysCh: PROJ.tracks.filter(t => t.gen && t.role === 'chords').map(t => t.name).join(), my: my ? my.events.map(e => e.n).join() : '-', ch: PROJ.chords ? chordsText(PROJ.chords) : '', lane: !$('#chordLane').hidden, strip: [...document.querySelectorAll('#chordStrip .cb b')].map(x => x.textContent).join(), blocks: chordBlocks().map(chordName).join(), steps: UNDO.stack.length - q7sp0 }; }, q7sp0);
  ok('song: "Put these chords on my song" puts them on Keys\' Chords track (no "Chords 2") in my key (D minor), my own chords part untouched, the strip shows them, one undo step', q7sput.tr && q7sput.keysCh === 'Chords' && q7sput.my === '62,65,69' && /^Dm · B♭ · F · C/.test(q7sput.ch) && q7sput.lane && q7sput.strip === q7sput.blocks && q7sput.steps === 1, `${q7sput.ch} · strip ${q7sput.strip} · +${q7sput.steps} · Keys' chords tracks ${q7sput.keysCh} · mine ${q7sput.my}`);
  await W(300); const q7sf0 = await E(() => ({ u: UNDO.stack.length, ch: chordsText(PROJ.chords) }));
  await p.click('#chordStrip [data-cb="1"]').catch(() => {}); await W(200); const q7cp = await E(() => document.body.classList.contains('cp-open')); await p.click('[data-croot="11"]').catch(() => {}); await p.click('[data-cq="min"]').catch(() => {}); await p.click('[data-capply]').catch(() => {}); await W(300);
  const q7sfx = await E(q7sf0 => { const r = { n: chordName(chordBlocks()[1]), steps: UNDO.stack.length - q7sf0.u, cp: document.body.classList.contains('cp-open') }; undo(); r.back = chordsText(PROJ.chords) === q7sf0.ch; return r; }, q7sf0);
  ok('song: the chord fixer turns bar 2 into Bm in one undo step, and Undo brings the song\'s chord back (cp-open on while it is open)', q7sfx.n === 'Bm' && q7sfx.steps === 1 && q7sfx.back && q7cp && !q7sfx.cp, JSON.stringify(Object.assign({ cpOpen: q7cp }, q7sfx)));
  const q7skey = await E(async () => { await new Promise(r => setTimeout(r, 200)); setKey({ tonic: 4, mode: 'minor' }, 'you'); const a = chordsText(PROJ.chords); undo(); return { a, b: chordsText(PROJ.chords) }; });
  ok('song: changing the key moves the song\'s chords too (D minor → E minor), Undo moves them back', /^Em · C · G/.test(q7skey.a) && /^Dm · B♭ · F/.test(q7skey.b), `${q7skey.a} → undo ${q7skey.b}`);
  const q7sv = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)), last = () => { const b = [...document.querySelectorAll('#asChat .bub.as')].pop(); return b ? b.children[1].textContent : ''; };
    await W(200); undo(); OFFER.actions = null; const k0 = keyStatusText(); ASSIST.run('Keys, what key is this?'); await W(300); const what = last(), k1 = keyStatusText(); ASSIST.run('haan'); await W(400); const yes = last(), k2 = keyStatusText();
    ASSIST.run('make bar 4 B minor'); await W(300); const bar = last(), ch = chordsText(); ASSIST.run('bar 9 ko E kar do'); await W(300); const b9 = last(), ch9 = chordsText();
    const P = s => JSON.stringify(localBrain(s).actions.map(a => a.type + (a.bar ? ':' + a.bar + ':' + a.chord : '') + (a.key ? ':' + a.key : '')));
    return { k0, what, k1, yes, k2, bar, ch, b9, same: ch9 === ch, parse: [P('is gaane ki key kya hai'), P('ye chords mere gaane mein daal do'), P('bar 4 ko B minor kar do'), P('key back to auto'), P('add chords')] }; });
  ok('song: "what key is this?" answers from the song without changing the key; "haan" sets it from the song', /^E minor at 124/.test(q7sv.what) && q7sv.k1 === q7sv.k0 && q7sv.k2 === 'E minor · from the song', `${q7sv.what} | ${q7sv.k0} → ${q7sv.k2}`);
  ok('song: "make bar 4 B minor" fixes bar 4; "bar 9 ko E kar do" in a 4-bar loop changes nothing', /^Bar 4 is now Bm/.test(q7sv.bar) && / · Bm$/.test(q7sv.ch) && /no bar 9/.test(q7sv.b9) && q7sv.same, `${q7sv.bar} · ${q7sv.ch} · ${q7sv.b9}`);
  ok('song: offline phrases (Hinglish too) map to analyse_song, chords_from_audio, set_chord, key auto; "add chords" still adds chords',
    q7sv.parse[0] === '["analyse_song"]' && /^\["chords_from_audio"/.test(q7sv.parse[1]) && q7sv.parse[2] === '["set_chord:4:Bm"]' && q7sv.parse[3] === '["key:auto"]' && q7sv.parse[4] === '["add_chords"]', q7sv.parse.join(' '));
  const q7spc = await E(() => [['Bm', 'Bm'], ['F#7', 'F♯7'], ['Am/E', 'Am/E'], ['C sharp minor', 'C♯m'], ['N.C.', 'N.C.']].every(([a, w]) => chordName(parseChord(a)) === w) && parseChord('xyz') === null);
  ok('song: parseChord reads Bm, F#7, Am/E, "C sharp minor", N.C. and refuses "xyz"', q7spc);
  // SE-7bc fix 1 (QA retest, 15 Nov): a song's name is a name, not an effect; an honest reply to "copy the melody"; one undo step per typed request
  const q7nm = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)), last = () => { const b = [...document.querySelectorAll('#asChat .bub.as')].pop(); return b ? b.children[1].textContent : ''; };
    const t = PROJ.tracks.find(t => t.kind === 'audio'), nm0 = t.name; t.name = 'night-drive'; const A = s => (localBrain(s).actions || []).map(a => [a.type, a.track, a.effect].filter(Boolean).join(':')).join(' ');
    const r = { put: A('put the chords from night drive on my song'), mel: A('turn night-drive into a melody'), what: A('what key is night drive in'), drive: A('add drive to the chords'), copy: localBrain('copy the melody of this song') };
    loopStop(); undoBoundary(); await W(150); const u = UNDO.stack.length; ASSIST.run('put the chords from night drive on my song'); await W(900); r.steps = UNDO.stack.length - u; r.reply = last(); loopStop();
    r.names = PROJ.tracks.map(t => t.name).join(); const n = PROJ.tracks.length; ASSIST.run('copy the melody of this song'); await W(300); r.copyReply = last(); r.copyAdded = PROJ.tracks.length - n; t.name = nm0; return r; });
  ok('song: a song called "night drive" is a name, not a Drive effect (put its chords, turn it into a melody, what key is it in); "add drive to the chords" is still Drive',
    /^chords_from_audio:night-drive/.test(q7nm.put) && !/track_fx/.test(q7nm.put) && /^transcribe:night-drive/.test(q7nm.mel) && /^analyse_song:night-drive/.test(q7nm.what) && /^track_fx:chords:drive/.test(q7nm.drive), `${q7nm.put} | ${q7nm.mel} | ${q7nm.what} | ${q7nm.drive}`);
  ok('song: typed "put the chords from night drive on my song" is one undo step with no "Chords 2"; "copy the melody of this song" adds nothing and replies honestly',
    q7nm.steps === 1 && /on your Chords track/.test(q7nm.reply) && !/Chords 2/.test(q7nm.names) && !q7nm.copy.actions.length && q7nm.copyAdded === 0 && /Turn into notes/.test(q7nm.copyReply), `+${q7nm.steps} · ${q7nm.reply.slice(0, 70)} · copy: +${q7nm.copyAdded} "${q7nm.copyReply.slice(0, 60)}"`);
  // SE-7bc fix 1: a drum loop dropped in reads "No key in this clip", with no Put or Set-key buttons, and the song's key stays
  const q7dr = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); let sd = 99; const rnd = Math.random; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    await newSong('Smoke drum loop'); runActions([{ type: 'style', style: 'techno' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }]); loopStop(); Math.random = rnd; await W(300); saveProject(); const k0 = keyStatusText();
    const [l] = await renderAudio(PROJ.tracks, CTRL.bpm, PROJ.bars * 4), sr = 22050, step = 2, n = Math.floor(l.length / step), reps = 3, N = n * reps, dv = new DataView(new ArrayBuffer(44 + N * 2)), ws = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    ws(0, 'RIFF'); dv.setUint32(4, 36 + N * 2, true); ws(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, N * 2, true);
    for (let j = 0; j < N; j++) dv.setInt16(44 + j * 2, Math.max(-32767, Math.min(32767, Math.round((l[(j % n) * step] || 0) * 32767))), true);
    const inp = $('#importFile'), dt = new DataTransfer(); dt.items.add(new File([dv.buffer], 'drum loop.wav', { type: 'audio/wav' })); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }));
    for (let i = 0; i < 150; i++) { await W(200); const t = PROJ.tracks.find(t => t.kind === 'audio'); if (t && t.ana && !ANA_RUN.has(t.id) && document.querySelector('.songcard:not(.busy)')) break; }
    const t = PROJ.tracks.find(t => t.kind === 'audio'), c = document.querySelector('.songcard:not(.busy)');
    return { sec: +(N / sr).toFixed(1), bpm: CTRL.bpm, key: t && t.ana ? t.ana.key : 'none', got: t && t.ana && t.ana.bpm, chords: t && t.ana ? t.ana.chords.filter(c => c.root != null).length : -1, card: c ? c.innerText.replace(/\s+/g, ' ').slice(0, 60) : '', put: !!document.querySelector('[data-scput]'), setk: !!document.querySelector('[data-sckey]'), k0, k1: keyStatusText() }; });
  ok('song: a drum loop dropped in says "No key in this clip" with its BPM, no chords, no Put or Set-key buttons; my key stays', q7dr.key === null && q7dr.chords === 0 && /^No key in this clip/.test(q7dr.card) && Math.abs(q7dr.got - q7dr.bpm) < 0.6 && !q7dr.put && !q7dr.setk && q7dr.k1 === q7dr.k0, JSON.stringify(q7dr));
} catch (e) { ok('test run', false, e.message); }
ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
await b.close();
const failed = results.filter(x => !x).length; console.log(failed ? `SMOKE FAILED: ${failed} of ${results.length}` : `SMOKE OK: ${results.length} checks`); process.exit(failed ? 1 : 0);
