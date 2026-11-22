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
await p.evaluateOnNewDocument(() => { window.__sr = []; class SR { start() { this.on = true; window.__sr.push(this); } stop() { this.end(); } abort() { this.end(); } end() { if (this.on) { this.on = false; setTimeout(() => this.onend && this.onend(), 10); } } }
  window.SpeechRecognition = window.webkitSpeechRecognition = SR; }); // speech can't run headless: a fake recogniser that counts live ones
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
  await W(400); await E(() => { const t = PROJ.tracks.find(t => t.role === 'chords'); openEditor(t.id); $('#editor').scrollIntoView({ block: 'center' }); t.events.forEach((e, i) => e.v = i % 2 ? 0.5 : 0.7); ED.sel = new Set(t.events.slice(0, 6)); drawEditor(); saveProject(); });
  await W(400); // QA: measure after the page settles (on a busy machine the drag missed the bar: flaky FAIL 15 Nov)
  const vl = await E(() => { const t = PROJ.tracks.find(t => t.role === 'chords'); $('#editor').scrollIntoView({ block: 'center' });
    const w = $('#edWrap'), G = edGeom(), cr = $('#edCanvas').getBoundingClientRect(), e = t.events[0], vy = cr.top + G.gh + 8;
    return { fits: w.scrollHeight <= w.clientHeight && cr.top + G.gh + 8 + ED.velH <= innerHeight, x: cr.left + G.K + e.b * G.bw + 1, y0: vy + 3 + 0.3 * (ED.velH - 6), y1: vy + 3 + 0.1 * (ED.velH - 6), u0: UNDO.stack.length }; });
  await W(300); await p.mouse.move(vl.x, vl.y0); await p.mouse.down(); await p.mouse.move(vl.x, vl.y1, { steps: 4 }); await p.mouse.up(); await W(200);
  const vg = await E(u0 => { const ev = PROJ.tracks.find(t => t.role === 'chords').events; return { v: ev.slice(0, 7).map(e => e.v), steps: UNDO.stack.length - u0 }; }, vl.u0);
  ok('velocity lane visible; dragging a selected bar moves all selected', vl.fits && vg.v.slice(0, 6).every((v, i) => Math.abs(v - (i % 2 ? 0.7 : 0.9)) < 0.03) && vg.v[6] === 0.7 && vg.steps === 1, vg.v.join(' '));
  // 3b. MP3 download: render, encode, decode back
  const mp = await E(async () => { const m = await makeMp3(PROJ.tracks.filter(trackAudible), 4); const u = new Uint8Array(await m.blob.arrayBuffer()); const d = await A.ctx.decodeAudioData(u.buffer.slice(0)); return { size: m.blob.size, sync: u[0] === 0xff && (u[1] & 0xe0) === 0xe0, sec: m.seconds, dec: d.duration }; });
  ok('MP3 download (4 loops, decodes back)', mp.sync && mp.size > 50000 && Math.abs(mp.dec - mp.sec) < 0.5, `${(mp.size / 1024).toFixed(0)} KB, ${mp.dec.toFixed(1)} s`);
  // UX-13 (QA, 17 Nov): the MP3 carries a LAME gapless header, so it decodes on the beat and exactly one loop long
  const mg = await E(async () => { const tr = PROJ.tracks.filter(trackAudible), m = await makeMp3(tr, 1), u = new Uint8Array(await m.blob.arrayBuffer()), d = await A.ctx.decodeAudioData(u.buffer.slice(0));
    return { info: String.fromCharCode(...u.slice(36, 40)), lame: String.fromCharCode(...u.slice(156, 160)), want: Math.round(m.seconds * 44100), got: d.length }; });
  ok('MP3 is gapless: one loop decodes to exactly the loop length', mg.info === 'Info' && mg.lame === 'LAME' && Math.abs(mg.got - mg.want) <= 88, `${mg.got} of ${mg.want} samples`);
  // 3c. track effects, multi-select, one element at a time
  const fxr = await E(() => { const t = PROJ.tracks.find(t => t.role === 'bass'); const r = runActions([{ type: 'track_fx', track: 'bass', effect: 'reverb', amount: 30 }]);
    if (!FXOPEN.has(t.id)) document.querySelector(`[data-tfx="${t.id}"]`).click(); renderTracks(); const panel = !!document.querySelector('.tfx'); const sel = document.querySelector('.tfx [data-tfxadd]'); sel.value = 'width'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { r: r.join(), rev: t.fx.rev, width: t.fx.width, duck: t.fx.duck, panel }; });
  ok('track FX: panel, add effect, assistant reverb, sidechain preset', fxr.panel && fxr.rev === 0.3 && fxr.width > 0 && fxr.duck > 0, JSON.stringify(fxr));
  // 3d. mixing words change EQ / low cut and keep the notes
  const mud = await E(() => { const t = PROJ.tracks.find(t => t.role === 'bass'), c = PROJ.tracks.find(t => t.role === 'chords'); const n0 = JSON.stringify(t.events), hp0 = t.fx.hp || 0, ch0 = c.fx.hp || 0, n1 = PROJ.tracks.length;
    const L = localBrain('the bass is muddy'); runActions(L.actions); const bass = { same: JSON.stringify(t.events) === n0, hp: t.fx.hp, hp0, reply: L.reply };
    const M = localBrain('the mix is muddy'); runActions(M.actions); return { bass, mix: { ch0, ch: c.fx.hp, types: M.actions.map(a => a.type).join() }, added: PROJ.tracks.length - n1 }; });
  ok('"the bass is muddy" cleans the bass EQ, same notes', mud.bass.same && mud.bass.hp > mud.bass.hp0 && mud.added === 0 && /low cut/.test(mud.bass.reply), `low cut ${mud.bass.hp0}→${mud.bass.hp} Hz`);
  ok('"the mix is muddy" changes the mix FX', mud.mix.ch > mud.mix.ch0 && /track_fx/.test(mud.mix.types), `chords low cut ${mud.mix.ch0}→${mud.mix.ch} Hz`);
  const still = await E(() => ['add a bassline', 'let me sing the bassline', 'record a voice note', 'another one'].map(s => localBrain(s).actions.map(a => a.type + (a.part ? ':' + a.part : '')).join('+')).join(' | '));
  ok('"add a bassline", "sing the bassline", "voice note", "another one" unchanged', still === 'add_bass | sing:bass | sing:voice | vary', still);
  // QA (AI-6 check): up/down describing a part's shape is not a level change ("let me sing a bassline that goes down" sings; "write a melody that goes down" makes one)
  const dir = await E(() => ['let me sing a bassline that goes down', 'i want to sing a melody that goes up', 'write a melody that goes down', 'create a bassline that walks up'].map(s => localBrain(s).actions.map(a => a.type + (a.part ? ':' + a.part : '')).join('+')).join(' | '));
  ok('direction words in sing / make requests keep their meaning (no fader move)', /^sing:bass \| sing:melody \| (add_melody|vary) \| (add_bass|vary)$/.test(dir), dir);
  // AI-6: level and punch words change the fader / EQ / compressor and never add or remake a part
  const lv = await E(() => { const T = r => PROJ.tracks.find(t => t.role === r), m = T('melody'), d = T('drums'), sig = () => PROJ.tracks.map(t => t.id + ':' + t.events.map(e => e.n + '@' + e.b).join()).join('|');
    const s0 = sig(), n0 = PROJ.tracks.length, v0 = m.vol, c0 = d.fx.comp || 0, hi0 = d.hi || 0, lo0 = d.lo || 0, R = {};
    for (const s of ['turn the melody down a bit', 'make the kick punchier', 'bring the bass up', 'chords louder', 'drums too loud', 'softer hats']) R[s] = runActions(localBrain(s).actions).join(', ');
    return { db: 40 * Math.log10(m.vol / v0), comp: [c0, d.fx.comp], hi: [hi0, d.hi], lo: [lo0, d.lo], same: sig() === s0, added: PROJ.tracks.length - n0, R }; });
  ok('"turn the melody down a bit" = -3 dB, "kick punchier" = more compressor, "softer hats" = less highs; no part added or remade', Math.abs(lv.db + 3) < 0.1 && lv.comp[1] > lv.comp[0] && lv.hi[1] < lv.hi[0] && lv.same && lv.added === 0, `melody ${lv.db.toFixed(1)} dB, comp ${lv.comp.join('→')}, drums high ${lv.hi.join('→')} dB, +${lv.added} tracks`);
  // AI-6 fix 1: the whole song's level moves every part by the same dB (in the song, so Undo restores it exactly; the master fader is untouched)
  const song = await E(() => { const vols = () => PROJ.tracks.map(t => t.vol.toFixed(4)).join(','), m0 = MIX.master ? MIX.master.vol : 1, v0 = vols(), n0 = PROJ.tracks.length;
    const L = localBrain('turn it down a bit'), chip = runActions(L.actions).join(), v1 = vols(), r = PROJ.tracks.map(t => t.vol).filter(v => v > 0); undo();
    return { down: L.actions.map(a => a.type + ':' + a.track + ':' + a.db).join(), chip, reply: L.reply, changed: v1 !== v0, back: vols() === v0, master: (MIX.master ? MIX.master.vol : 1) === m0, added: PROJ.tracks.length - n0 }; });
  ok('"turn it down a bit" moves every part 3 dB and Undo puts it back exactly (master fader untouched)', song.down === 'mix:all:-3' && song.changed && song.back && song.master && song.added === 0 && /3 dB/.test(song.chip) && /3 dB/.test(song.reply), `${song.down} · ${song.chip} · undo exact ${song.back}`);
  // QA (AI-6 retest): "punchier" stops at +6 dB low EQ and 90% compressor (then an honest reply), and Undo puts the drums back exactly
  const pc6 = await E(() => { const D = () => PROJ.tracks.find(t => t.role === 'drums'), s = () => [D().lo || 0, D().fx.comp || 0].join(), s0 = s(), u0 = UNDO.stack.length; let last = ''; /* Undo swaps the track objects, so look the drums up each time */
    for (let i = 0; i < 6; i++) { const L = localBrain('make the kick punchier'); runActions(L.actions); last = L.actions.length ? '' : L.reply; }
    const lo = D().lo || 0, comp = Math.round((D().fx.comp || 0) * 100); while (UNDO.stack.length > u0) undo(); return { lo, comp, last, back: s() === s0 }; });
  ok('"make the kick punchier" x6 stops at +6 dB low EQ / 90% compressor with an honest reply; Undo restores', pc6.lo <= 6 && pc6.comp <= 90 && /already as punchy/.test(pc6.last) && pc6.back, `low +${pc6.lo} dB, comp ${pc6.comp}%`);
  // AI-6 fix 1: "very" and Hinglish level sentences change the mix only
  const hin = await E(() => { const n0 = PROJ.tracks.length; const R = ['the drums are very loud', 'the bass is very quiet', 'drums bahut loud hai', 'drums ki awaaz kam karo', 'melody thoda kam karo', 'hats ko soft karo', 'bass ko thoda upar karo'].map(s => { const L = localBrain(s); return L.actions.map(a => a.type).join('+') || (/full volume/.test(L.reply || '') ? 'full' : ''); });
    return { R: R.join(' | '), ok: R.every(x => /^(mix(\+mix)*|full)$/.test(x)), added: PROJ.tracks.length - n0 }; });
  ok('"very" and Hinglish level words ("bahut loud hai", "thoda kam karo", "soft karo") only move the mix', hin.ok && hin.added === 0, hin.R);
  const tone = await E(() => { const t = PROJ.tracks.find(t => t.role === 'bass'), n0 = JSON.stringify(t.events), lo0 = t.lo || 0;
    runActions(localBrain('boost the lows on the bass').actions); const boost = { lo0, lo: t.lo || 0, same: JSON.stringify(t.events) === n0 };
    runActions(localBrain('the bass is muddy').actions); const hp1 = t.fx.hp; const S = localBrain('still muddy'); runActions(S.actions);
    const add = localBrain('add brighter chords').actions.map(a => a.type).join(), another = localBrain('another one with more low end').actions.map(a => a.type).join();
    return { boost, hp1, hp2: t.fx.hp, stillBass: S.actions.length > 0 && S.actions.every(a => a.track === t.id), add, another }; });
  ok('"boost the lows on the bass" raises the bass low EQ', tone.boost.lo > tone.boost.lo0 && tone.boost.same, `low ${tone.boost.lo0}→${tone.boost.lo} dB`);
  ok('"still muddy" after "the bass is muddy" goes further on the bass', tone.stillBass && tone.hp2 > tone.hp1, `low cut ${tone.hp1}→${tone.hp2} Hz`);
  ok('"add brighter chords" adds chords; "another one with more low end" makes a new groove', tone.add === 'add_chords' && tone.another === 'vary', `${tone.add} | ${tone.another}`);
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
  const tv = await E(() => { const a = PROJ.tracks.find(t => t.kind === 'audio'); const x = localBrain('turn the voice note into a bassline').actions, y = localBrain('turn ' + a.name + ' into chords').actions; return { x: x.map(q => q.type).join(), y: y.map(q => q.type + ':' + q.to + ':' + (q.track === a.id)).join(), n: PROJ.tracks.length, r: runActions(y).join(), n2: PROJ.tracks.length }; });
  ok('"turn the voice note into a bassline" transcribes', tv.x === 'transcribe', tv.x);
  const tv2 = await E(() => ['make the voice note a bassline', 'turn the voice note I just recorded into a bassline', 'make a bassline from the voice note', 'turn the voice note into a base line', 'record a voice note'].map(s => localBrain(s).actions.map(a => a.type + ':' + (a.to || a.part)).join('+')).join(' | '));
  ok('voice note phrasings convert the recording ("record a voice note" still records)', tv2 === 'transcribe:bass | transcribe:bass | transcribe:bass | transcribe:bass | sing:voice', tv2);
  const tv3 = await E(() => ['voice note ko bassline bana do', 'is recording se chords banao', 'meri recording ko melody mein badlo'].map(s => localBrain(s).actions.map(a => a.type + ':' + (a.to || a.part)).join('+')).join(' | '));
  ok('Hinglish voice note requests convert the recording ("voice note ko bassline bana do")', tv3 === 'transcribe:bass | transcribe:chords | transcribe:melody', tv3);
  ok('"turn <recording name> into chords" transcribes that track',tv.y === 'transcribe:chords:true' && tv.n2 === tv.n + 1 && /chords/.test(tv.r), tv.r);
  const im = await E(() => { const r = runActions([{ type: 'transcribe', to: 'bass' }]); return { tracks: PROJ.tracks.map(t => t.name + ':' + t.kind).join(', '), r: r.join() }; });
  ok('import MIDI + audio, turn audio into a bassline', /Lead:notes/.test(im.tracks) && /sing:audio/.test(im.tracks) && /bassline/.test(im.tracks), im.tracks);
  // UX-13 (QA, 17 Nov): a 16-bar MIDI file into a 4-bar beat keeps every note, the loop grows to 16 bars, one Undo puts it back
  const lm = await E(async () => { await newSong('Smoke long MIDI'); runActions([{ type: 'add_drums', style: 'house' }]); setBars(4); undoBoundary(); const n0 = PROJ.tracks[0].events.length;
    const ev = []; for (let i = 0; i < 64; i++) ev.push({ b: i, d: 0.5, n: 60 + (i % 12), v: 0.8 });
    await importFile(new File([buildMidi([{ name: 'Long', kind: 'notes', role: 'melody', inst: 'piano', events: ev }], CTRL.bpm, 64, 'long')], 'long16.mid'));
    const t = PROJ.tracks.find(x => x.name === 'Long'), r = { bars: PROJ.bars, notes: t ? t.events.length : 0, last: t ? Math.max(...t.events.map(e => e.b)) : 0, toast: $('#toast').textContent };
    undo(); r.undoBars = PROJ.bars; r.undoTracks = PROJ.tracks.length; r.undoDrums = PROJ.tracks[0].events.length === n0; return r; });
  ok('long MIDI import keeps all notes and grows the loop (one Undo)', lm.bars === 16 && lm.notes === 64 && lm.last === 63 && /loop is now 16 bars/.test(lm.toast) && lm.undoBars === 4 && lm.undoTracks === 1 && lm.undoDrums, JSON.stringify(lm));
  // 6. sing a bassline over the beat (fake microphone sings C E G A C G)
  await E(() => newSong('Smoke sing')); await W(300);
  await E(() => { runActions([{ type: 'add_drums', style: 'house' }, { type: 'add_chords' }]); window.__sayLog = []; const o = ASSIST.say; ASSIST.say = function (m, op) { window.__sayLog.push(m); ASSIST.say = o; return o.call(this, m, op); }; ASSIST.run('let me sing the bassline'); });
  await W(300); const sr = await E(() => (window.__sayLog || [])[0] || '');
  ok('the sing reply doesn\'t suggest singing what you just asked for', /Sing the bassline/.test(sr) && !/let me sing|Bassline next/.test(sr), sr);
  await W(3500); const guide = await E(() => TAKE_GUIDE && PROJ.tracks.filter(trackAudible).every(t => t.role === 'drums'));
  ok('while singing, only the drums play', guide);
  await E(() => { window.__live = 0; const orig = noteOn; window.noteOn = function () { if (LOOP.state === 'take') window.__live++; return orig.apply(this, arguments); }; });
  await W(11000);
  const sb = await E(() => { const t = PROJ.tracks.find(t => t.take === 'bass'); return t ? { n: t.events.length, lo: Math.max(...t.events.map(e => e.n)) } : null; }); await E(() => loopStop());
  ok('sing the bassline → bass track', sb && sb.n >= 4 && sb.lo < 60, sb ? `${sb.n} notes` : 'no track');
  ok('a sung part doesn\'t add your raw voice as an extra track', await E(() => !PROJ.tracks.some(t => t.kind === 'audio')));
  ok('your voice isn\'t played back live while you sing, and the mic turns off after', await E(() => window.__live === 0 && !MIC.on));
  const lo = await E(async () => { const w = ms => new Promise(r => setTimeout(r, ms)), cb = $('#asListen'); cb.click(); await w(1200); const on = MIC.on, tr = MIC.stream && MIC.stream.getTracks()[0];
    cb.click(); cb.click(); cb.click(); await w(1200); return { on, off: !MIC.on && !MIC.pending, ended: !!tr && tr.readyState === 'ended', live: __sr.filter(r => r.on).length, orb: $('#asOrb').dataset.state }; });
  ok('listening off (even off-on-off fast) releases the mic and leaves no recogniser running', lo.on && lo.off && lo.ended && lo.live === 0 && lo.orb === 'idle', JSON.stringify(lo));
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
  // UX-7 (QA, 14 Nov): after a double-click opens the note editor on a part, Ctrl+A / Delete / Ctrl+D act on its notes, never on the song's sections
  const kxy = await E(() => { songTemplate('club'); const s = songFind('drop'), t = PROJ.tracks.find(t => t.role === 'chords'); const el = document.querySelector(`.part[data-sid="${s.id}"][data-tid="${t.id}"]`); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const kdbl = async () => { await p.mouse.move(kxy.x, kxy.y); await p.mouse.down(); await p.mouse.up(); await W(80); await p.mouse.down({ clickCount: 2 }); await p.mouse.up({ clickCount: 2 }); await W(400); };
  const kmod = async k => { await p.keyboard.down('Control'); await p.keyboard.press(k); await p.keyboard.up('Control'); await W(150); };
  const kst = () => E(() => ({ secs: songSections().length, bars: songBars(), notes: edTrack() ? edTrack().events.length : -1, ed: !$('#editor').hidden }));
  await kdbl(); const k0 = await kst(); await kmod('a'); await p.keyboard.press('Delete'); await W(150); const k1 = await kst();
  await p.keyboard.press('Delete'); await p.keyboard.press('Backspace'); await W(150); const k2 = await kst(); await E(() => undo()); await W(150); const k3 = await kst();
  ok('song: double-click Chords in the Drop, Ctrl+A, Delete removes its notes, not the Drop; Delete with nothing selected changes nothing; Undo brings the notes back', k0.ed && k0.notes > 0 && k1.secs === 6 && k1.bars === 96 && k1.notes === 0 && k2.secs === 6 && k2.bars === 96 && k3.notes === k0.notes, `${k0.notes} → ${k1.notes} → ${k3.notes} notes, ${k2.secs} sections, ${k2.bars} bars`);
  await kmod('a'); await kmod('d'); const k4 = await kst(); await E(() => undo()); await W(150); const k5 = await kst();
  ok('song: Ctrl+D in the editor duplicates the notes, not the section (one Undo)', k4.secs === 6 && k4.notes === 2 * k0.notes && k5.notes === k0.notes, `${k0.notes} → ${k4.notes} → ${k5.notes} notes, ${k4.secs} sections`);
  const bxy = await E(() => { const el = document.querySelector(`.sec[data-sid="${songFind('break').id}"] .sname`); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(bxy.x, bxy.y); await W(300); await p.keyboard.press('Delete'); await W(150);
  const k6 = await E(() => { const r = { secs: songSections().length, gone: !songFind('break') }; undo(); r.back = songSections().length; r.brk = !!songFind('break'); closeEditor(); return r; });
  ok('song: click a section name, then Delete still removes the section, and Undo restores it', k6.secs === 5 && k6.gone && k6.back === 6 && k6.brk, JSON.stringify(k6));
  // QA, 15 Nov (UX-7 re-check): after typing to Keys, the editor still takes the keyboard (double-click a part in Song mode, click a note in Loop mode); Space plays/stops there
  const kSay = async txt => { const n0 = await E(() => document.querySelectorAll('#asChat .bub.as').length); await p.$eval('#asIn', el => el.scrollIntoView({ block: 'center' })); await p.click('#asIn', { clickCount: 3 }); await p.keyboard.type(txt); await p.keyboard.press('Enter');
    await p.waitForFunction(n => document.querySelectorAll('#asChat .bub.as').length > n, { timeout: 10000 }, n0).catch(() => {}); await W(300); await E(() => loopStop()); return E(() => document.activeElement.id); };
  const kf0 = await kSay('more reverb on the chords'); const kxy2 = await E(() => { const el = document.querySelector(`.part[data-sid="${songFind('drop').id}"][data-tid="${PROJ.tracks.find(t => t.role === 'chords').id}"]`); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(kxy2.x, kxy2.y); await p.mouse.down(); await p.mouse.up(); await W(80); await p.mouse.down({ clickCount: 2 }); await p.mouse.up({ clickCount: 2 }); await W(400);
  const kf1 = await E(() => document.activeElement.id); await p.keyboard.press(' '); await W(250); const kr1 = await E(() => TR.running); await p.keyboard.press(' '); await W(250); const kr2 = await E(() => TR.running);
  await E(() => { closeEditor(); songMode('loop'); openEditor(PROJ.tracks.find(t => t.role === 'chords').id); }); const kf2 = await kSay('a bit louder chords');
  const knx = await E(() => { const t = edTrack(), G = edGeom(); $('#editor').scrollIntoView({ block: 'center' }); const cr = $('#edCanvas').getBoundingClientRect(); for (const e of t.events) { const R = evRect(t, G, e); if (R && R.y > 2 && R.y + R.h < G.gh - 2) return { x: cr.left + R.x + Math.min(4, R.w / 2), y: cr.top + R.y + R.h / 2, n: t.events.length }; } return null; });
  await p.mouse.click(knx.x, knx.y); await W(200); const kf3 = await E(() => document.activeElement.id); await p.keyboard.press('Delete'); await W(150); const kn = await E(() => edTrack().events.length); await E(() => { undo(); closeEditor(); songMode('song'); });
  ok('song/loop: after typing to Keys, double-click a part or click a note gives the editor the keys (Space plays/stops, Delete removes the note)', kf0 === 'asIn' && kf1 === 'edCanvas' && kr1 && !kr2 && kf2 === 'asIn' && kf3 === 'edCanvas' && kn === knx.n - 1, JSON.stringify({ song: kf1, space: [kr1, kr2], loop: kf3, notes: `${knx.n}→${kn}` }));
  const pl = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); const calls = []; const orig = scheduleEvent; window.scheduleEvent = function (tr, e) { calls.push(e.B); return orig.apply(this, arguments); };
    songPlay({ from: 33 }); await W(400); loopStop(); const first = calls[0], sec = first != null ? songAt(first).section.name : null;
    calls.length = 0; songLoop('break', { play: false }); const range = songLoopRange(); songPlay({ from: 64 }); await W(2900); const beat = songBeatAt(A.ctx.currentTime), wrapped = calls.some(B => B < 200); loopStop(); songLoop(null); window.scheduleEvent = orig;
    return { first, sec, range, beat, wrapped }; });
  ok('song: play from bar 33 starts in the Drop', pl.first >= 128 && pl.first < 132 && pl.sec === 'Drop', `first note at beat ${pl.first} (${pl.sec})`);
  ok('song: loop the Break jumps back to its start', JSON.stringify(pl.range) === '[192,256]' && pl.beat >= 192 && pl.beat < 210 && pl.wrapped, `range ${JSON.stringify(pl.range)}, beat ${pl.beat && pl.beat.toFixed(1)}`);
  // UX-13 (QA, 17 Nov): moving the looped section while it plays keeps playback in it (it used to run on to the end and stop)
  const lf = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); songLoop('break', { play: false }); songPlay({ from: 'break' }); await W(600);
    undoBoundary(); songMove('break', 0); await W(1500); const beat = songBeatAt(A.ctx.currentTime), r = { range: songLoopRange(), beat: +beat.toFixed(1), at: songAt(beat).section.name, run: TR.running };
    loopStop(); undo(); songLoop(null); r.back = songStartOf(songFind('break')); return r; });
  ok('song: loop survives moving its section while playing', lf.run && JSON.stringify(lf.range) === '[0,64]' && lf.beat > 0 && lf.beat < 64 && lf.at === 'Break' && lf.back === 192, JSON.stringify(lf));
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
  // UX-7 (QA, 14 Nov): importing a MIDI file with the Drop selected names every new track in the note
  await E(() => { songTemplate('club'); closeEditor(); songSelect(songFind('drop').id); window.__toasts = []; const o = window.toast; window.toast = function (m) { window.__toasts.push(m); return o.apply(this, arguments); }; window.__toastO = o; });
  await (await p.$('#importFile')).uploadFile(fx('test.mid')); await W(1600);
  const mtn = await E(() => window.__toasts.filter(m => /plays? in /.test(m)).length);
  const mt = await E(() => { const m = window.__toasts.find(m => / in Drop\b/.test(m)) || ''; window.toast = window.__toastO; return m; });
  ok('song: a MIDI file imported into the Drop names both new tracks (one toast)', /Lead/.test(mt) && /Kick/.test(mt) && /play in Drop/.test(mt) && mtn === 1, `${mtn} toast: ${mt}`);
  const rc = await E(() => { songMode('song'); recordPress(); const m = SONG.view.mode; loopStop(); return m; });
  ok('song: Rec in Song mode switches to Loop', rc === 'loop', rc);
  // UX-5: a part sung in Song mode lands like a part Keys adds (selected section only) and says where it plays, once back in Song mode
  // a chords take left by check 6b would make this a re-sung take (keeps its old placement, no toast), so start from no chords take
  await E(() => { PROJ.tracks.filter(t => t.take === 'chords').forEach(t => removeTrack(t.id)); songTemplate('short'); songSelect('intro'); window.__toasts = []; const o = toast; window.toast = function (m) { window.__toasts.push(m); return o.apply(this, arguments); };
    runActions([{ type: 'add_melody' }]); window.__ref = PROJ.tracks[PROJ.tracks.length - 1].id; ASSIST.run('let me sing the chords'); });
  await p.waitForFunction(() => PROJ.tracks.some(t => t.take === 'chords') && LOOP.state !== 'take', { timeout: 40000 }).catch(() => {}); await W(1300); // the toast shows 0.9 s after the take
  const sg = await E(() => { const S = songSections(), t = PROJ.tracks.find(t => t.take === 'chords'), on = id => S.filter(s => s.parts[id] && s.parts[id].on).map(s => s.name).join(',');
    const r = { mode: SONG.view.mode, sung: t ? on(t.id) : null, ref: on(window.__ref), toast: window.__toasts.find(m => /Sung chords/.test(m)) || null, n: window.__toasts.filter(m => /Sung chords.* plays? in /.test(m)).length }; loopStop(); return r; });
  ok('song: sing the chords in Song mode → plays in the selected section like an added part, and one toast says so', sg.mode === 'song' && sg.sung === 'Intro' && sg.sung === sg.ref && /^“Sung chords” plays in Intro\. Click its empty parts/.test(sg.toast || '') && sg.n === 1, JSON.stringify(sg));
  const before = await E(async () => { songTemplate('short'); PROJ.name = 'Before reload'; saveProject(); await new Promise(r => setTimeout(r, 600)); return { id: PROJ.id, n: PROJ.tracks.length, s: songSections().length }; });
  await p.reload({ waitUntil: 'load', timeout: 60000 }); await W(1500);
  await p.waitForFunction(() => { const s = document.querySelector('#saveState'); return s && /New song/.test(s.textContent); }, { timeout: 15000 }).catch(() => {}); // keepLastSong is async: wait for it on a busy machine
  const rl = await E(async id => { const n0 = PROJ.tracks.length, name0 = PROJ.name; let r = null;
    for (let i = 0; i < 30; i++) { try { r = await IDB.get(id, 'projects'); } catch (e) {} if (r && r.name === 'Before reload') break; await new Promise(q => setTimeout(q, 500)); } // QA: keepLastSong may still be writing on a busy machine (flaky FAIL 15 Nov)
    if (r) await loadNamed(id);
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
  // AI-6: "straighten it a bit" / "a bit straighter" / "a little less bounce" step one rung; "make it bouncier" steps up; "straighten it" is straight
  const sw6 = await E(() => { const drums = () => PROJ.tracks.find(t => t.role === 'drums'), said = txt => { LAST_TEXT.text = txt; runActions(localBrain(txt).actions); LAST_TEXT.text = ''; return drums().recipe.swing; };
    runActions([{ type: 'add_drums', style: 'house', swing: '70%' }]); const down = ['too swingy, straighten it a bit', 'a bit straighter', 'a little less bounce', 'straighten the hats a little'].map(said);
    const up = said('make it bouncier'); runActions([{ type: 'groove', swing: '70%' }]); return { down, up, full: said('straighten it') }; });
  ok('"straighten it a bit" steps 70 → 66 → 58 → 54 → straight; "bouncier" swings; "straighten it" is straight', sw6.down.join() === '0.333,0.16,0.08,0' && sw6.up > 0.3 && sw6.full === 0, `${sw6.down.join(' → ')} · bouncier ${sw6.up} · straighten ${sw6.full}`);
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
  // AI-1: the song by voice (offline parser through handleRequest): sections, lengths, parts, a second drop, a gap, Undo, one undo step per request
  const ai1 = await E(async () => { const eng = ASSIST.engine, R = {}; ASSIST.engine = null;
    const say = async t => { const u0 = UNDO.stack.length; await handleRequest(t); loopStop(); return UNDO.stack.length - u0; };
    try { await newSong('Smoke AI-1'); runActions([{ type: 'vibe', ref: 'Stephan Bodzin' }, { type: 'add_drums', ref: 'Stephan Bodzin' }, { type: 'add_bass' }, { type: 'add_chords' }]); loopStop();
      R.s1 = await say('make an 8-bar intro, then build up and drop'); R.lay1 = songSections().map(s => s.name + ' ' + s.bars).join(' · '); R.mode = SONG.view.mode;
      const last = [...document.querySelectorAll('#asChat .bub.as')].pop(); R.map = last && last.querySelectorAll('.as-map i').length; R.chip = !$('#songChip').hidden && !$('#songChipU').hidden;
      R.s2 = await say('make it a full track'); R.full = songBars();
      const b0 = songFind('break').bars; R.s3 = await say('make the break longer'); R.brk = songFind('break').bars - b0;
      await say('drop the drums in the outro'); const dr = PROJ.tracks.find(t => t.role === 'drums'); R.outro = !!songFind('outro').parts[dr.id].on;
      await say('remove the second drop'); const n0 = songSections().length; R.s4 = await say('add a second drop'); R.tail = songSections().slice(-3).map(s => s.name).join(','); R.added = songSections().length - n0;
      await say('drop se pehle thoda silence daal do'); const S = songSections(), d2 = songFind('drop 2'), pre = S[S.indexOf(d2) - 1], end = songStartOf(pre) + pre.bars * 4;
      R.gap = pre.end && pre.end.to; R.inGap = PROJ.tracks.filter(t => t.kind === 'notes' && t.role !== 'drums').reduce((a, t) => a + songFlat(t).filter(e => e.B >= end - 1 && e.B < end).length, 0) + songFlat(dr).filter(e => e.B >= end - 1 && e.B < end).length;
      undo(); undo(); R.undo = songSections().length === n0 && !songFind('drop 2');
      R.loop = localBrain('make the loop 8 bars').actions.map(a => a.type + ':' + a.bars).join();
      /* QA 15 Nov: the gap before a drop must be silent with the drums playing. Count every note that starts in the last beat, including hits the drummer pushes up to 1/16 early */
      await say('make it a full track'); const SB = songSections(), bu = SB.find(s => s.kind === 'build'), bEnd = songStartOf(bu) + bu.bars * 4;
      const early = () => PROJ.tracks.filter(t => t.kind === 'notes').reduce((a, t) => a + songFlat(t).filter(e => e.B >= bEnd - 1.0625 && e.B < bEnd).length, 0);
      R.gapRoll = bu.end && bu.end.gap ? early() : 'no gap'; await say('add some silence before the first drop'); const bu2 = songSections().find(s => s.kind === 'build'); R.gapKick = (bu2.end && bu2.end.to) + ':' + early();
      await newSong('Smoke AI-1b'); const u0 = UNDO.stack.length; runActions([{ type: 'vibe', ref: 'Ben Böhmer' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }, { type: 'add_melody' }, { type: 'arrange', template: 'full' }, { type: 'transport', do: 'play' }]); loopStop(); R.one = UNDO.stack.length - u0; R.oneLen = songBars();
    } finally { ASSIST.engine = eng; } return R; });
  ok('AI-1: "8-bar intro, then build up and drop" → Intro 8 · Build 8 · Drop 16 in Song mode, with the song map and one Undo chip', ai1.lay1 === 'Intro 8 · Build 8 · Drop 16' && ai1.mode === 'song' && ai1.map === 3 && ai1.chip && ai1.s1 === 1, JSON.stringify({ lay: ai1.lay1, map: ai1.map, steps: ai1.s1 }));
  ok('AI-1: "full track" is 96 bars; "make the break longer" adds 8; "drop the drums in the outro" switches them off', ai1.full === 96 && ai1.brk === 8 && ai1.outro === false && ai1.s2 === 1 && ai1.s3 === 1, JSON.stringify({ full: ai1.full, brk: ai1.brk, outro: ai1.outro }));
  ok('AI-1: "add a second drop" (after the break) adds Drop 2 before the Outro; Hinglish silence = a gap before it; Undo goes back', ai1.tail === 'Break,Drop 2,Outro' && ai1.added === 1 && ai1.s4 === 1 && ai1.gap === 'kickdrop' && ai1.inGap <= 1 && ai1.undo, JSON.stringify({ tail: ai1.tail, gap: ai1.gap, notesInGap: ai1.inGap, undo: ai1.undo }));
  ok('AI-1: "make the loop 8 bars" still sets the loop; arrange with four new parts is one undo step (Böhmer: long break)', ai1.loop === 'bars:8' && ai1.one === 1 && ai1.oneLen >= 96, JSON.stringify({ loop: ai1.loop, steps: ai1.one, bars: ai1.oneLen }));
  ok('AI-1: the gap before the drop is empty: no hit starts in the last beat, even one the drummer pushes early (roll + gap, kick drop)', ai1.gapRoll === 0 && ai1.gapKick === 'kickdrop:0', JSON.stringify({ rollGap: ai1.gapRoll, kickdrop: ai1.gapKick }));
  // AI-1 fix 1 (QA 15 Nov): Hinglish verb last, "make it longer/shorter", the reply guard, a section mute → parts, and the AI's own extra roll keeping the gap
  const ai1c = await E(async () => { const eng = ASSIST.engine, of = window.fetch, R = {}, dr = () => PROJ.tracks.find(t => t.role === 'drums');
    const steps = async (t, j) => { const u0 = UNDO.stack.length; if (j) { ASSIST.engine = 'workers-ai'; window.fetch = async () => new Response(JSON.stringify(j), { status: 200 }); } try { await handleRequest(t); } finally { window.fetch = of; ASSIST.engine = null; } loopStop(); return UNDO.stack.length - u0; };
    const full = async () => { await newSong('Smoke AI-1c'); runActions([{ type: 'vibe', ref: 'Stephan Bodzin' }, { type: 'add_drums', ref: 'Stephan Bodzin' }, { type: 'add_bass' }, { type: 'add_chords' }]); loopStop(); await steps('make it a full track'); };
    const reply = () => ASSIST.history[ASSIST.history.length - 1].content, names = () => songSections().map(s => s.name).join(',');
    try { ASSIST.engine = null; await full();
      R.hs = await steps('drop ke baad break daal do'); const S = songSections(), di = S.findIndex(s => s.kind === 'drop'); R.hAdd = S.length === 7 && S[di + 1].kind === 'break';
      R.hs += await steps('outro mein drums mat bajao'); R.hOut = !songFind('outro').parts[dr().id].on;
      await full(); R.ls = await steps('make it longer'); R.longer = songBars(); R.ls += await steps('make it shorter'); R.shorter = songBars(); R.phr = songSections().map(x => x.bars).join(',');
      await full(); await steps('make the break longer', { reply: 'The break is 8 bars longer now. Want a filter sweep into the second drop?', actions: [{ type: 'section', do: 'length', section: 'break', change: 8 }] }); R.guard = /snare roll/.test(reply()) && !/sweep/i.test(reply());
      await steps('drop the drums in the outro', { reply: 'Drums are out of the outro.', actions: [{ type: 'mix', track: 'drums', mute: true }] }); R.mute = !dr().mute && !songFind('outro').parts[dr().id].on && !!songFind('drop').parts[dr().id].on;
      await newSong('Smoke AI-1d'); runActions([{ type: 'vibe', ref: 'Stephan Bodzin' }, { type: 'add_drums', ref: 'Stephan Bodzin' }, { type: 'add_bass' }]); loopStop();
      await steps('make an 8-bar intro, then build up and drop', { reply: 'Intro, build and drop.', actions: [{ type: 'arrange', template: 'custom', sections: [{ name: 'Intro', bars: 8 }, { name: 'Build' }, { name: 'Drop' }] }, { type: 'transition', section: 'Build', to: 'snareroll' }, { type: 'transport', do: 'play' }] }); /* real Llama 3.3 output, 15 Nov */
      const bu = songFind('build'); R.llmGap = JSON.stringify(bu.end);
      /* fix 2: "out of the build" mutes the section only; a drop the AI adds after the Break is numbered in song order */
      await full(); const bs = () => PROJ.tracks.find(t => t.role === 'bass'); await steps('take the bass out of the build', { reply: 'ok', actions: [{ type: 'mix', track: 'bass', mute: true }] }); R.outOf = !bs().mute && !songFind('build').parts[bs().id].on && !!songFind('drop').parts[bs().id].on;
      await steps('break ke baad ek aur drop daal do', { reply: 'ok', actions: [{ type: 'section', do: 'add', name: 'Drop 3', after: 'Break' }, { type: 'parts', section: 'Drop 3', in: ['all'] }, { type: 'transition', section: 'Break', to: 'snareroll' }] }); R.order = names(); R.brkEnd = JSON.stringify(songFind('break').end);
    } finally { ASSIST.engine = eng; window.fetch = of; } return R; });
  ok('AI-1: offline Hinglish with the verb last ("drop ke baad break daal do", "outro mein drums mat bajao"), one undo step each', ai1c.hAdd && ai1c.hOut && ai1c.hs === 2, JSON.stringify({ add: ai1c.hAdd, outro: ai1c.hOut, steps: ai1c.hs }));
  ok('AI-1: "make it longer" on a 96-bar song is about 4 minutes, "make it shorter" goes back under 3', ai1c.longer >= 120 && ai1c.longer <= 136 && ai1c.shorter < 96 && ai1c.ls === 2, JSON.stringify({ longer: ai1c.longer, shorter: ai1c.shorter }));
  ok('AI-1: the AI\'s "filter sweep" offer becomes a snare roll; its "mute the drums" said about the outro only takes them out of the outro', ai1c.guard && ai1c.mute, JSON.stringify({ guard: ai1c.guard, mute: ai1c.mute }));
  ok('AI-1: when the AI adds its own snare roll to a new layout, the Build still ends in a beat of silence', /"gap":true/.test(ai1c.llmGap) || /kickdrop/.test(ai1c.llmGap), ai1c.llmGap);
  ok('AI-1: "make it shorter" keeps 8/16/32-bar phrases; "take the bass out of the build" (AI mix mute) takes it out of the Build only; an added drop is numbered in song order and the Break keeps its gap', /^((8|16|32),)*(8|16|32)$/.test(ai1c.phr) && ai1c.outOf && /Break,Drop 2,Drop 3,Outro/.test(ai1c.order) && /"gap":true/.test(ai1c.brkEnd), JSON.stringify({ phrases: ai1c.phr, outOf: ai1c.outOf, order: ai1c.order, brk: ai1c.brkEnd }));
  // AI-8: Basic mode: compound genres, unsolo/unmute, quantize, two requests in one sentence, the artist the user named
  const a8 = await E(async () => { const eng = ASSIST.engine, R = {};
    try { ASSIST.engine = null;
      await newSong('Smoke AI-8 afro'); PROJ.style = null; await handleRequest('afro house beat'); loopStop(); R.afro = PROJ.style;
      await newSong('Smoke AI-8 lofi'); PROJ.ref = undefined; PROJ.style = null; await handleRequest('lofi hip hop beat'); loopStop(); R.lofi = PROJ.style + '/' + (PROJ.ref || '');
      await newSong('Smoke AI-8 ref'); PROJ.ref = undefined; await handleRequest('drums like Black Coffee'); loopStop(); R.ref = PROJ.ref;
      await newSong('Smoke AI-8 mix'); runActions([{ type: 'add_drums', style: 'house', seed: 5180 }, { type: 'add_bass', seed: 5181 }, { type: 'add_chords', seed: 5182 }, { type: 'add_melody', seed: 5183 }]); loopStop();
      const tr = r => PROJ.tracks.find(t => t.role === r), n0 = PROJ.tracks.length;
      await handleRequest('solo the bass'); await handleRequest('unsolo the bass'); R.unsolo = !tr('bass').solo && PROJ.tracks.length === n0;
      await handleRequest('un-mute the drums'); R.unmute = !tr('drums').mute;
      await handleRequest('mute the drums and solo the bass'); R.both = tr('drums').mute && tr('bass').solo; await handleRequest('remove the solo'); await handleRequest('unmute everything'); R.clear = !PROJ.tracks.some(t => t.solo || t.mute);
      const rc = (tr('chords').fx || {}).rev || 0, rm = (tr('melody').fx || {}).rev || 0, u0 = UNDO.stack.length;
      await handleRequest('more reverb on the chords and less on the melody'); R.fx = tr('chords').fx.rev > rc && ((tr('melody').fx || {}).rev || 0) <= rm; R.undo1 = UNDO.stack.length - u0;
      const p = addTrack({ role: 'melody', inst: 'piano', name: 'Played keys', events: [{ b: 0.07, d: 0.4, n: 60, v: .8 }, { b: 1.12, d: 0.3, n: 64, v: .8 }] }); saveProject();
      await handleRequest('quantize my melody to 1/8'); R.q = p.events.map(e => e.b).join() + '/' + PROJ.tracks.length;
      return R; } finally { ASSIST.engine = eng; } });
  ok('Basic mode: afro house is afro, lofi hip hop is lo-fi with no artist, "like Black Coffee" stays Black Coffee', a8.afro === 'afro' && a8.lofi === 'lofi/' && a8.ref === 'Black Coffee', `${a8.afro}, ${a8.lofi}, ${a8.ref}`);
  ok('Basic mode: unsolo / un-mute / "remove the solo" / "unmute everything"; two requests in one sentence both run (one Undo)', a8.unsolo && a8.unmute && a8.both && a8.clear && a8.fx && a8.undo1 === 1, JSON.stringify(a8));
  ok('Basic mode: "quantize my melody to 1/8" snaps your own part to 1/8 and adds no track', a8.q === '0,1/5', a8.q);
  // AI-8 fix 1: "another one" after adding a part varies that part, "mute everything but the drums", "save the song" saves (no MP3)
  const f8 = await E(async () => { const eng = ASSIST.engine, R = {};
    try { ASSIST.engine = null;
      await newSong('Smoke AI-8 fix'); runActions([{ type: 'add_drums', style: 'house', seed: 5190 }, { type: 'add_bass', seed: 5191 }, { type: 'add_chords', seed: 5192 }]); loopStop();
      const tr = r => PROJ.tracks.find(t => t.role === r);
      R.another = localBrain('add a bassline and give me another one').actions.map(a => a.type + ':' + (a.track || '')).join();
      await handleRequest('mute everything but the drums'); R.but = !tr('drums').mute && tr('bass').mute && tr('chords').mute;
      R.save = localBrain('save the song').actions.map(a => a.type).join();
      return R; } finally { ASSIST.engine = eng; } });
  ok('Basic mode: "add a bassline and give me another one" varies the bass, "mute everything but the drums" mutes the rest, "save the song" saves', f8.another === 'add_bass:,vary:bass' && f8.but && f8.save === 'save', JSON.stringify(f8));
  // AI-8 fix 2: an explicit number beats the "add some never lowers" guard (AI path), "add some reverb" still raises, "remove the reverb from the chords" keeps the part
  const g8 = await E(async () => { const eng = ASSIST.engine, R = {};
    try { ASSIST.engine = null;
      await newSong('Smoke AI-8 fix 2'); runActions([{ type: 'add_drums', style: 'house', seed: 5200 }, { type: 'add_chords', seed: 5201 }]); loopStop();
      const ch = () => PROJ.tracks.find(t => t.role === 'chords'), rv = () => Math.round(((ch() || {}).fx || {}).rev * 100);
      const ai = (text, acts) => { LAST_TEXT.text = text; try { runActions(acts); } finally { LAST_TEXT.text = ''; } };
      ch().fx.rev = 0.42; ai('set the chords reverb to 20 and add some delay', [{ type: 'track_fx', track: 'chords', effect: 'reverb', amount: 20 }, { type: 'track_fx', track: 'chords', effect: 'delay', amount: 30 }]); R.set = rv();
      ch().fx.rev = 0.42; ai('add some reverb to the chords', [{ type: 'track_fx', track: 'chords', effect: 'reverb', amount: 40 }]); R.add = rv();
      ch().fx.rev = 0.42; await handleRequest('set the reverb on the chords to 20%'); R.basic = rv();
      await handleRequest('remove the reverb from the chords'); R.kept = !!ch(); R.off = ch() ? ch().fx.rev == null : null;
      /* fix 3: a clause that names the part with remove/delete removes it, even next to "turn off the reverb" */
      const has = r => PROJ.tracks.some(t => t.role === r);
      runActions([{ type: 'add_melody', seed: 5202 }]); ai('remove the melody and turn off the reverb', [{ type: 'remove', track: 'melody' }, { type: 'fx', effect: 'reverb', amount: 0 }]); R.rmAI = !has('melody');
      await handleRequest('delete the drums and kill the reverb'); R.rmBasic = !has('drums') && has('chords');
      return R; } finally { ASSIST.engine = eng; } });
  ok('"set the chords reverb to 20 and add some delay" gives 20%, "add some reverb" still raises it, "remove the reverb from the chords" keeps the chords, "remove the melody and turn off the reverb" removes the melody', g8.set === 20 && g8.add === 52 && g8.basic === 20 && g8.kept && g8.off && g8.rmAI && g8.rmBasic, JSON.stringify(g8));
  // UX-12: Save a copy starts its own history; Undo in the copy never touches the original (in the songs list too)
  const cu = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)), rec = async k => { const r = await IDB.get(k, 'projects'); return r ? JSON.stringify([r.name, r.bpm, r.tracks, r.savedAt, r.proj.tracks.map(t => t.events.length)]) : null; };
    await newSong('Smoke original'); runActions([{ type: 'add_drums', style: 'house', seed: 5170 }]); await W(150); runActions([{ type: 'add_bass', seed: 5171 }]); const oid = PROJ.id; await saveCopy(); await W(200); const o0 = await rec(oid);
    for (let i = 0; i < 4; i++) { PROJ.tracks[0].events.push({ b: i / 2, d: 0.25, n: 40 + i, v: 0.8 }); saveProject(); await W(150); }
    for (let i = 0; i < 7; i++) { undo(); await W(150); } await W(1800); return { same: o0 === await rec(oid), id: PROJ.id !== oid, name: PROJ.name, n: PROJ.tracks.length }; });
  ok('Undo after Save a copy never touches the original', cu.same && cu.id && cu.name === 'Smoke original (copy)' && cu.n === 2, JSON.stringify(cu));
  // UX-12: a tempo typed in the BPM box is one undo step; Undo and Redo restore it exactly
  const tb = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); await newSong('Smoke tempo box'); runActions([{ type: 'add_drums', style: 'house', seed: 5180 }]); await W(150); runActions([{ type: 'tempo', bpm: 88 }]); await W(150); runActions([{ type: 'add_chords', seed: 5181 }]); await W(150);
    const s0 = UNDO.stack.length, el = $('#bpm'); el.value = '96'; el.dispatchEvent(new Event('change')); const steps = UNDO.stack.length - s0; undo(); const u = [CTRL.bpm, PROJ.tracks.length]; redo(); return { steps, u, r: [CTRL.bpm, PROJ.tracks.length] }; });
  ok('BPM box change is one undo step', tb.steps === 1 && tb.u.join() === '88,2' && tb.r.join() === '96,2', JSON.stringify(tb));
  // UX-12 fix 1: Save after deleting the open song saves it again (autosave keeps skipping it)
  const sd = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)), has = async () => !!(await IDB.get(PROJ.id, 'projects'));
    await newSong('Smoke gone'); runActions([{ type: 'add_drums', style: 'house', seed: 5190 }]); await saveNamed(true); const k = PROJ.id;
    await openSongs(); for (let i = 0; i < 2; i++) { document.querySelector(`[data-pdel="${k}"]`).click(); await W(150); } $('#projModal').hidden = true;
    await saveNamed(true); const quiet = await has(); await saveNamed(false); const saved = await has(); return { quiet, saved, hdr: $('#saveState').textContent, flag: store.get('detached', null) }; });
  ok('Save after deleting the open song saves it again', !sd.quiet && sd.saved && /^Saved/.test(sd.hdr) && !sd.flag, JSON.stringify(sd));
  // UX-19: picking a key on a "Key: auto" loop moves the notes from the key they are in (menu and Keys), drums stay, one undo step; a vibe key never moves a sung part
  const ux19 = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)), eng = ASSIST.engine, R = {};
    const cm = async name => { await newSong(name); runActions([{ type: 'add_drums', style: 'house', seed: 5300 }]); await W(150);
      addTrack({ role: 'bass', inst: 'bass', name: 'Bass', events: [36, 36, 32, 34, 31, 36, 39, 43].map((n, i) => ({ b: i * 2, d: 1.5, n, v: 0.8 })) });
      addTrack({ role: 'chords', inst: 'piano', name: 'Chords', events: [[48, 51, 55], [44, 48, 51], [46, 50, 53], [43, 46, 50]].flatMap((c, i) => c.map(n => ({ b: i * 4, d: 4, n, v: 0.7 }))) });
      PROJ.key = null; saveProject(); await W(200); };
    const pit = () => PROJ.tracks.filter(t => t.role !== 'drums').flatMap(t => t.events.map(e => e.n)), dr = () => PROJ.tracks.filter(t => t.role === 'drums').flatMap(t => t.events.map(e => e.n)).join();
    const moved = a => [...new Set(pit().map((n, i) => n - a[i]))].join();
    try { ASSIST.engine = null;
      await cm('Smoke UX-19 menu'); const p0 = pit(), d0 = dr(), s0 = UNDO.stack.length, el = $('#keySel'); el.value = '2:minor'; el.dispatchEvent(new Event('change'));
      R.menu = [moved(p0), keyName(PROJ.key), dr() === d0, UNDO.stack.length - s0].join('|'); undo(); await W(100); R.undo = [pit().join() === p0.join(), PROJ.key, $('#keySel').value].join('|');
      await handleRequest('put it in the key of F sharp minor'); await W(150); R.say = [moved(p0), keyName(PROJ.key), dr() === d0].join('|'); undo(); await W(100); R.undo2 = [pit().join() === p0.join(), PROJ.key].join('|');
      const bt = PROJ.tracks.find(t => t.role === 'bass'); bt.patterns = { B: { events: bt.events.map(e => Object.assign({}, e, { n: e.n + 12 })) } }; saveProject(); await W(150);
      runActions([{ type: 'key', key: 'D minor' }]); R.pat = bt.patterns.B.events.map(e => e.n).join() === bt.events.map(e => e.n + 12).join() && moved(p0) === '2';
      await cm('Smoke UX-19 sung'); PROJ.tracks = PROJ.tracks.filter(t => t.role !== 'chords'); Object.assign(PROJ.tracks.find(t => t.role === 'bass'), { name: 'Sung bassline', take: 'bass' }); saveProject();
      const q0 = pit().join(); runActions([{ type: 'vibe', ref: 'Ben Böhmer' }]); R.vibe = [keyName(PROJ.key), pit().join() === q0].join('|');
      return R; } finally { ASSIST.engine = eng; } });
  ok('Key menu on an auto-key C minor loop picks D minor: notes up 2, drums stay, one undo step back to auto; "put it in the key of F sharp minor" moves them too; patterns move; a vibe key leaves a sung bass as sung',
    ux19.menu === '2|D minor|true|1' && ux19.undo === 'true||' && ux19.say === '6|F♯ minor|true' && ux19.undo2 === 'true|' && ux19.pat && ux19.vibe === 'F minor|true', JSON.stringify(ux19));
  // UX-19 fix 1: a generated i-VII-VI-VII loop (prog 0656, which detectKey reads as E minor) moves from the key it was written in (A minor) to D minor;
  // without that memory the scale share and the bass's first note still read A minor; a mode change alone keeps the tonic; a key inside "add house drums in F minor" leaves a sung bass as sung
  const kf = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)), eng = ASSIST.engine, R = {};
    const pit = () => PROJ.tracks.filter(t => t.kind === 'notes' && t.role !== 'drums').flatMap(t => t.events.map(e => e.n)), moved = a => [...new Set(pit().map((n, i) => n - a[i]))].join();
    const inKey = k => { const sc = SCALES[k.mode].map(x => (x + k.tonic) % 12), ns = pit(); return Math.round(100 * ns.filter(n => sc.includes(((n % 12) + 12) % 12)).length / ns.length); };
    try { ASSIST.engine = null;
      await newSong('Smoke UX-19 fix 1'); runActions([{ type: 'add_drums', style: 'house', seed: 21 }]); PROJ.prog = [0, 6, 5, 6]; runActions([{ type: 'add_bass', seed: 22 }, { type: 'add_chords', seed: 23 }]); await W(100);
      const ev = PROJ.tracks.filter(t => t.kind === 'notes' && t.role !== 'drums').flatMap(t => t.events); R.prog = PROJ.prog.join(''); R.detect = keyName(detectKey(ev)); R.gen = keyName(PROJ.genKey);
      const g = PROJ.genKey; delete PROJ.genKey; R.noMemory = keyName(loopKey()); PROJ.genKey = g;
      const p0 = pit(), el = $('#keySel'); el.value = '2:minor'; el.dispatchEvent(new Event('change')); R.menu = [moved(p0), inKey(PROJ.key)].join('|'); undo(); await W(100);
      el.value = '9:major'; el.dispatchEvent(new Event('change')); R.mode = [moved(p0), keyName(PROJ.key), $('#toast').textContent].join('|'); undo(); await W(100);
      /* fix 1c: the relative key (C major on this A minor loop, the same scale) only changes the label, from auto and from a set key */
      el.value = '0:major'; el.dispatchEvent(new Event('change')); R.rel = [moved(p0), $('#toast').textContent].join('|'); undo(); await W(100);
      el.value = '9:minor'; el.dispatchEvent(new Event('change')); el.value = '0:major'; el.dispatchEvent(new Event('change')); R.relSet = moved(p0); undo(); await W(60); undo(); await W(100);
      /* fix 1d: the next pick moves from the key the notes are in, never from the label: C major → A major → D minor, and C major → auto → D minor */
      const pick = async v => { el.value = v; el.dispatchEvent(new Event('change')); await W(40); return moved(p0); };
      R.seqA = [await pick('0:major'), await pick('9:major'), await pick('2:minor'), inKey(PROJ.key)].join('|');
      undo(); await W(80); R.undoA = [moved(p0), keyName(PROJ.key), keyName(PROJ.noteKey)].join('|'); undo(); await W(60); undo(); await W(80);
      R.seqB = [await pick('0:major'), await pick(''), await pick('2:minor'), inKey(PROJ.key)].join('|'); undo(); await W(60); undo(); await W(60); undo(); await W(80);
      R.seqC = [await pick('9:major'), await pick('2:major')].join('|'); undo(); await W(60); undo(); await W(80); R.back = [moved(p0), PROJ.key].join('|');
      /* fix 1b: the remembered key goes when the generated parts go: remove bass and chords, add your own C major melody, pick D major */
      ['bass', 'chords'].forEach(r => removeTrack(PROJ.tracks.find(t => t.role === r).id));
      addTrack({ role: 'melody', inst: 'piano', name: 'My melody', events: [60, 64, 67, 72, 67, 64, 65, 62, 60, 64, 67, 72].map((n, i) => ({ b: i, d: 1, n, v: 0.8 })) }); await W(100);
      const m0 = pit(); el.value = '2:major'; el.dispatchEvent(new Event('change')); R.stale = [moved(m0), inKey(PROJ.key)].join('|');
      /* fix 1c: a bass-only A minor line (it also fits D minor) still moves to D minor when D minor is picked */
      await newSong('Smoke UX-19 bass only'); runActions([{ type: 'add_drums', style: 'house', seed: 81 }, { type: 'add_bass', seed: 82 }]); await W(100);
      const b0 = pit(); el.value = '2:minor'; el.dispatchEvent(new Event('change')); R.bassOnly = [keyName(PROJ.genKey), moved(b0), inKey(PROJ.key)].join('|');
      await newSong('Smoke UX-19 sung key'); runActions([{ type: 'add_drums', style: 'house', seed: 5300 }]); await W(100);
      addTrack({ role: 'bass', inst: 'bass', name: 'Sung bassline', take: 'bass', events: [48, 44, 36, 43, 43, 45, 48, 48, 43].map((n, i) => ({ b: i * 1.5, d: 1, n, v: 0.8 })) }); await W(100);
      const s0 = pit(); await handleRequest('add house drums in F minor'); await W(150); R.sung = [moved(s0), keyName(PROJ.key)].join('|');
      return R; } finally { ASSIST.engine = eng; } });
  ok('Key menu on a generated i-VII-VI-VII loop moves from A minor to D minor (+5, all notes in D minor); A major picked keeps the tonic (no move); C major (same notes) only relabels, auto or set; later picks move from the notes’ key (C major → A major → D minor +5, C major → auto → D minor +5); after the generated parts go, an own C major melody to D major moves +2; a bass-only A minor line moves +5 to D minor; "add house drums in F minor" leaves a sung bass as sung',
    kf.prog === '0656' && kf.gen === 'A minor' && kf.noMemory === 'A minor' && kf.menu === '5|100' && /^0\|A major\|Key set to A major, notes unchanged/.test(kf.mode) && /^0\|Key set to C major, notes unchanged/.test(kf.rel) && kf.relSet === '0' && kf.seqA === '0|0|5|100' && kf.undoA === '0|A major|A minor' && kf.seqB === '0|0|5|100' && kf.seqC === '0|5' && kf.back === '0|' && kf.stale === '2|100' && kf.bassOnly === 'A minor|5|100' && kf.sung === '0|F minor', JSON.stringify(kf));
  // UX-19 (QA bug 9): a long "no clap, snare, kick" label in a narrow Song-view part clips on the right (start visible), full text in the tooltip
  const pwo = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); await newSong('Smoke UX-19 label'); runActions([{ type: 'add_drums', style: 'house', seed: 5400 }, { type: 'add_bass', seed: 5401 }]); await W(150);
    runActions([{ type: 'arrange', length: 'full' }]); loopStop(); await W(200); const S = songSections(), dr = PROJ.tracks.find(t => t.role === 'drums');
    songSetPart(S[0].id, dr.id, { on: true, without: ['clap', 'snare', 'kick'] }); songRender(); songZoom(0.4); songRender(); await W(200);
    const e = document.querySelector('.pwo'); if (!e) return null; const pr = e.parentElement.getBoundingClientRect(), r = e.getBoundingClientRect();
    const out = { left: r.left >= pr.left - 0.5, right: r.right <= pr.right + 0.5, clipped: e.scrollWidth > e.clientWidth, ell: getComputedStyle(e).textOverflow, title: e.title };
    songZoom(0.8); const e2 = document.querySelector('.pwo'); out.w = Math.round(e2.parentElement.getBoundingClientRect().width); out.hiddenUnder50 = getComputedStyle(e2).display === 'none';
    songMode('loop'); return out; });
  ok('Song view: a long part label clips on the right with an ellipsis and keeps its full text as a tooltip; under 50 px it hides', !!pwo && pwo.left && pwo.right && pwo.clipped && pwo.ell === 'ellipsis' && pwo.title === 'no clap, snare, kick' && pwo.w < 50 && pwo.hiddenUnder50, JSON.stringify(pwo));
} catch (e) { ok('test run', false, e.message); }
ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
await b.close();
const failed = results.filter(x => !x).length; console.log(failed ? `SMOKE FAILED: ${failed} of ${results.length}` : `SMOKE OK: ${results.length} checks`); process.exit(failed ? 1 : 0);
