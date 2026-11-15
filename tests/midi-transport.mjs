// Studio Keys: focused MIDI transport test (UX-9). Not part of check.sh (keeps the check short); run by hand:
//   SK_NODE_MODULES=/tmp/sk-test/node_modules node tests/midi-transport.mjs [index.html] [screenshot dir]
// Fake controller (navigator.requestMIDIAccess stub, picked up by the app's own initMIDI at boot).
// Covers: Start 0xFA, Continue 0xFB, Stop 0xFC, MMC Play/Deferred Play/Stop/Pause/Record, empty song, Loop mode,
// Song mode, count-in, recording, overdub, keys and pads while playing, MIDI monitor, other-port filter, page errors,
// plus the on-screen transport buttons and Space in the song area.
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire(process.env.SK_NODE_MODULES ? path.join(process.env.SK_NODE_MODULES, 'x.js') : import.meta.url);
const pc = require('puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const target = process.argv[2] || 'file://' + path.join(root, 'index.html');
const shots = process.argv[3] || ''; if (shots) fs.mkdirSync(shots, { recursive: true });
const chrome = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const results = []; const ok = (name, pass, info = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${info ? ' · ' + info : ''}`); };
const autoplay = process.env.SK_NO_AUTOPLAY ? [] : ['--autoplay-policy=no-user-gesture-required'];
const b = await pc.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', ...autoplay] });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1100 });
const errs = [], cerr = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') cerr.push(m.text()); });
await p.evaluateOnNewDocument(() => {
  localStorage.clear();
  const mk = (id, name) => ({ id, name, manufacturer: 'Fake', type: 'input', state: 'connected', connection: 'open', onmidimessage: null });
  const ins = new Map([['k1', mk('k1', 'Fake Keys 49')], ['k2', mk('k2', 'Other Synth')]]);
  window.__ins = ins;
  window.__send = (bytes, id = 'k1') => { const i = ins.get(id); if (i.onmidimessage) i.onmidimessage({ data: new Uint8Array(bytes), timeStamp: performance.now() }); return !!i.onmidimessage; };
  navigator.requestMIDIAccess = async () => ({ inputs: ins, outputs: new Map(), onstatechange: null, sysexEnabled: false });
});
const W = ms => new Promise(r => setTimeout(r, ms)), E = (f, ...a) => p.evaluate(f, ...a);
const shot = async n => { if (shots) await p.screenshot({ path: path.join(shots, n + '.png') }); };
const ST = () => E(() => ({ st: LOOP.state, run: TR.running, mode: SONG.view.mode, segs: SONG.segs.length, voices: LOOP.voices.size, ctx: A.ctx && A.ctx.state, pill: (document.querySelector('#loopLbl') || {}).textContent }));
const send = async (bytes, ms = 250, id) => { await E((x, i) => __send(x, i), bytes, id); await W(ms); return ST(); };
const MMC = c => [0xF0, 0x7F, 0x7F, 0x06, c, 0xF7];
try {
  await p.goto(target, { waitUntil: 'load', timeout: 60000 }); await W(2500);
  const hooked = await E(() => ({ st: M.state, n: M.inputs.length, h: !!__ins.get('k1').onmidimessage }));
  ok('fake controller connects at boot', hooked.st === 'ready' && hooked.n === 2 && hooked.h, JSON.stringify(hooked));
  // A. empty song, no click yet: everything quiet
  let s = await send([0xFA]); const a1 = s; s = await send([0xFB]); const a2 = s; s = await send(MMC(2)); const a3 = s; s = await send(MMC(3)); const a4 = s;
  s = await send([0xFC]); s = await send(MMC(1)); s = await send(MMC(9));
  ok('empty song: Start, Continue, MMC Play/Deferred Play, Stop, Pause do nothing, no errors', [a1, a2, a3, a4, s].every(x => !x.run && x.st === 'empty') && !errs.length, JSON.stringify(a1) + ' errs ' + errs.length);
  await p.click('#audioPill'); await E(() => { ASSIST.voice = false; });
  // B. Loop mode with a beat
  await E(() => { runActions([{ type: 'add_drums', style: 'house', seed: 4242 }, { type: 'add_bass' }]); loopStop(); });
  s = await send([0xFA], 600); const b1 = s;
  ok('Loop mode: Start plays (notes scheduled)', b1.run && b1.st === 'playing' && b1.mode === 'loop' && b1.voices > 0, JSON.stringify(b1));
  await shot('ux9-01-loop-playing');
  const t0 = await E(() => TR.t0); s = await send([0xFA], 200); const t1 = await E(() => TR.t0);
  ok('Start while playing keeps playing (no restart, no error)', s.run && s.st === 'playing' && t0 === t1, `t0 same ${t0 === t1}`);
  s = await send([0xFC], 300); const b2 = s;
  ok('Stop stops and silences', !b2.run && b2.st === 'stopped' && b2.voices === 0, JSON.stringify(b2));
  s = await send([0xFB], 400); ok('Continue plays', s.run && s.st === 'playing', JSON.stringify(s));
  s = await send(MMC(9), 300); ok('MMC Pause stops', !s.run && s.st === 'stopped');
  s = await send(MMC(3), 300); ok('MMC Deferred Play (cmd 3) plays', s.run && s.st === 'playing');
  s = await send(MMC(1), 300); ok('MMC Stop stops', !s.run && s.st === 'stopped');
  s = await send(MMC(2), 300); ok('MMC Play plays', s.run && s.st === 'playing'); await send([0xFC], 200);
  // C. monitor list
  await E(() => { document.querySelector('#clearMon').click(); });
  await send([0xFA], 150); await send([0xFB], 150); await send([0xFC], 150); await send(MMC(2), 150); await send(MMC(1), 300);
  const mon = await E(() => [...document.querySelectorAll('#monitor li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()));
  ok('MIDI monitor shows Start, Continue, Stop, MMC Play, MMC Stop (newest first)', mon.length >= 5 && /Start/.test(mon[4]) && /Continue/.test(mon[3]) && /^Stop/.test(mon[2]) && /MMC.*Play/.test(mon[1]) && /MMC.*Stop/.test(mon[0]), JSON.stringify(mon.slice(0, 6)));
  await E(() => { const m = document.querySelector('#monitor'); if (m) m.scrollIntoView(); }); await shot('ux9-02-monitor');
  // D. Song mode
  const sm = await E(() => { setTempo(124); songTemplate('short'); loopStop(); const secs = songSections(); songSelect(secs[1].id); return { mode: SONG.view.mode, cur: SONG.cursor, drop: songStartOf(secs[1]) }; });
  s = await send([0xFA], 600); const d1 = s;
  const pos = await E(() => (TR.running ? ((A.ctx.currentTime - TR.t0) * CTRL.bpm / 60) : null));
  ok('Song mode: Start plays the song from the cursor (Drop)', d1.run && d1.st === 'playing' && d1.mode === 'song' && d1.segs > 0 && d1.voices > 0, JSON.stringify({ d1, sm, pos }));
  await E(() => { const m = document.querySelector('#playlist'); if (m) m.scrollIntoView(); }); await W(300); await shot('ux9-03-song-playing');
  s = await send([0xFC], 300); ok('Song mode: Stop stops, song segments cleared', !s.run && s.st === 'stopped' && s.segs === 0, JSON.stringify(s));
  s = await send([0xFB], 400); ok('Song mode: Continue plays', s.run && s.st === 'playing' && s.segs > 0);
  s = await send(MMC(9), 300); ok('Song mode: MMC Pause stops', !s.run);
  s = await send(MMC(2), 400); ok('Song mode: MMC Play plays', s.run && s.st === 'playing' && s.mode === 'song'); await send([0xFC], 200);
  // E. Recording: count-in, recording, overdub. Start does nothing, Stop finishes like the Stop button.
  await E(() => { songMode('loop'); CTRL.countIn = true; });
  await E(() => recordPress()); await W(150); const c0 = await ST();
  s = await send([0xFA], 200); ok('count-in: Start does nothing', c0.st === 'counting' && s.st === 'counting', `${c0.st} → ${s.st}`);
  s = await send([0xFC], 200); ok('count-in: Stop cancels', !s.run && s.st === 'stopped', s.st);
  await E(() => { CTRL.countIn = false; }); await E(() => recordPress()); await W(200);
  const r0 = await ST(); const n0 = await E(() => PROJ.tracks.reduce((a, t) => a + (t.events ? t.events.length : 0), 0));
  s = await send([0xFA], 150); const r1 = s;
  await send([0x90, 60, 100], 120); await send([0x80, 60, 0], 80); await send([0x90, 64, 90], 120); await send([0x80, 64, 0], 80);
  await shot('ux9-04-overdub');
  s = await send([0xFC], 300);
  const n1 = await E(() => PROJ.tracks.reduce((a, t) => a + (t.events ? t.events.length : 0), 0));
  ok('overdub: Start does nothing, notes from the keys are kept, Stop ends the take', r0.st === 'overdub' && r1.st === 'overdub' && !s.run && s.st === 'stopped' && n1 === n0 + 2, `${r0.st}/${r1.st} → ${s.st}, notes ${n0} → ${n1}`);
  s = await send(MMC(6), 300); const mr = s; // MMC Record = loop button press (stopped → plays)
  ok('MMC Record still works (loop button: stopped → plays)', mr.st === 'playing', mr.st); await send([0xFC], 200);
  // first recording on an empty song via the loop
  await E(async () => { await newSong('QA MIDI rec'); CTRL.countIn = false; loopPress(); }); await W(200);
  const f0 = await ST(); s = await send([0xFB], 150); const f1 = s;
  await send([0x90, 62, 100], 150); await send([0x80, 62, 0], 100);
  s = await send([0xFC], 300);
  const fr = await E(() => ({ tr: PROJ.tracks.length, ev: PROJ.tracks.reduce((a, t) => a + t.events.length, 0) }));
  ok('first recording: Continue does nothing, Stop closes the loop with the played note', f0.st === 'recording' && f1.st === 'recording' && s.st === 'stopped' && fr.tr === 1 && fr.ev === 1, `${f0.st}/${f1.st} → ${s.st}, ${JSON.stringify(fr)}`);
  // F. keys and pads still play while the transport runs
  await E(() => { runActions([{ type: 'add_drums', style: 'house', seed: 99 }]); loopStop(); });
  await send([0xFA], 300);
  const kp = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); const before = A.ctx ? 1 : 0;
    __send([0x90, 60, 100]); await W(80); const k = (M.log[0] || {}).val; __send([0x80, 60, 0]);
    __send([0x99, 36, 110]); await W(80); const pd = (M.log[0] || {}).val; __send([0x89, 36, 0]); return { k, pd, before }; });
  ok('keys and pads play notes while playing', /→ keys/.test(kp.k || '') && /→ pads/.test(kp.pd || ''), JSON.stringify(kp));
  await send([0xFC], 200);
  // G. "Selected input" filter: another port's Start is ignored
  const fil = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); M.selected = 'k1'; __send([0xFA], 'k2'); await W(250); const r = TR.running; M.selected = 'all'; return r; });
  ok('Start from a non-selected port is ignored', fil === false);
  // H. clock (0xF8) and active sensing (0xFE) still ignored by the transport
  s = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 24; i++) { __send([0xF8]); await W(20); } __send([0xFE]); await W(100); return TR.running; });
  ok('clock and active sensing do not start playback', s === false);
  // I. regressions: on-screen transport and Space
  const ui = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)), q = x => document.querySelector(x), R = {};
    q('#playBtn').click(); await W(150); R.play = LOOP.state; q('#stopBtn').click(); await W(100); R.stop = LOOP.state;
    q('#loopBtn').click(); await W(150); R.loop = LOOP.state; await W(400); q('#loopBtn').click(); await W(150); R.loop2 = LOOP.state; loopStop();
    q('#hwTransport [data-tp="play"]').click(); await W(150); R.hwPlay = LOOP.state; q('#hwTransport [data-tp="stop"]').click(); await W(100); R.hwStop = LOOP.state;
    return R; });
  ok('transport buttons: Play, Stop, Loop (play → overdub), controller-panel Play/Stop', ui.play === 'playing' && ui.stop === 'stopped' && ui.loop === 'playing' && ui.loop2 === 'overdub' && ui.hwPlay === 'playing' && ui.hwStop === 'stopped', JSON.stringify(ui));
  await E(() => { loopStop(); songTemplate('short'); loopStop(); document.querySelector('#playlist').focus(); });
  await p.keyboard.press('Space'); await W(300); const sp1 = await ST(); await p.keyboard.press('Space'); await W(200); const sp2 = await ST();
  ok('Space in the song area plays and stops (Song mode)', sp1.run && sp1.st === 'playing' && !sp2.run, `${sp1.st} → ${sp2.st}`);
  // after Space, a controller Start still works
  s = await send([0xFA], 400); ok('controller Start after Space-stop plays', s.run && s.st === 'playing'); await send([0xFC], 200);
  await shot('ux9-05-end');
} catch (e) { ok('test run', false, e.stack || e.message); }
ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log('console errors: ' + cerr.length + (cerr.length ? ' · ' + cerr.slice(0, 3).join(' | ') : ''));
await b.close();
const fails = results.filter(r => !r).length;
console.log(fails ? `MIDI TRANSPORT FAIL: ${fails} of ${results.length}` : `MIDI TRANSPORT OK: ${results.length} checks`);
process.exit(fails ? 1 : 0);
