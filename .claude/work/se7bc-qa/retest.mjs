// QA SE-7bc retest after fix 1: bugs 1-5, "Chords 2", the UX fixes, and a producer regression pass. Usage: node retest.mjs <index.html>
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const html = process.argv[2], S = '/tmp/qa/se7bc/songs', S2 = '/tmp/qa/se7bc-re/songs', SH = '/tmp/qa/se7bc-re/shots', FX = new URL('../../../tests/fixtures/', import.meta.url).pathname;
fs.mkdirSync(SH, { recursive: true });
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1000 });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::|Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('qa')) { localStorage.clear(); sessionStorage.setItem('qa', '1'); } });
await p.goto('file://' + html, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const ap = document.querySelector('#audioPill'); if (ap) ap.click(); ASSIST.voice = false;
  window.__toasts = []; new MutationObserver(() => { const t = document.querySelector('#toast').textContent; if (window.__toasts[window.__toasts.length - 1] !== t) window.__toasts.push(t); }).observe(document.querySelector('#toast'), { childList: true, characterData: true, subtree: true }); });
const W = ms => new Promise(r => setTimeout(r, ms)), E = (f, ...a) => p.evaluate(f, ...a);
const R = {}; let fails = 0; const ok = (n, pass, info = '') => { R[n] = { pass, info }; console.log((pass ? 'PASS ' : 'FAIL ') + n + (info ? ' · ' + info : '')); if (!pass) fails++; };
const shot = async n => { await p.screenshot({ path: `${SH}/${n}.png` }); };
const card = () => E(() => { const c = [...document.querySelectorAll('.songcard:not(.busy)')].pop(); return c ? c.innerText.replace(/\s+/g, ' ').trim() : null; });
const strip = () => E(() => [...document.querySelectorAll('#chordStrip .cb b')].map(x => x.textContent));
const undoN = () => E(() => UNDO.stack.length);
const last = () => E(() => { const b = [...document.querySelectorAll('#asChat .bub.as')].pop(); return b ? b.children[1].textContent : ''; });
const say = async (t, w = 400) => { await E(t => ASSIST.run(t), t); await W(w); return last(); };
const imp = async (path) => { await E(() => { window.__toasts = []; undoBoundary(); }); const t0 = Date.now(); const inp = await p.$('#importFile'); await inp.uploadFile(path);
  await p.waitForFunction(() => PROJ.tracks.some(t => t.kind === 'audio'), { timeout: 60000 }); const tOn = Date.now() - t0;
  await p.waitForFunction(() => { const t = [...PROJ.tracks].reverse().find(t => t.kind === 'audio'); return t && t.ana && !ANA_RUN.has(t.id) && document.querySelector('.songcard:not(.busy)'); }, { timeout: 90000 }); const tDone = Date.now() - t0; await W(300);
  return { onTrack: tOn, done: tDone, toasts: await E(() => window.__toasts.slice()) }; };
const songOf = f => JSON.parse(fs.readFileSync(`${S}/${f}.json`));
const pcsSeq = ev => ev.slice().sort((a, b) => a.b - b.b).map(e => e.n);
const melodyCopy = (a, bseq) => { const ia = a.slice(1).map((n, i) => n - a[i]), ib = bseq.slice(1).map((n, i) => n - bseq[i]); let best = 0;
  for (let i = 0; i < ia.length; i++) for (let j = 0; j < ib.length; j++) { let k = 0; while (i + k < ia.length && j + k < ib.length && ia[i + k] === ib[j + k]) k++; best = Math.max(best, k); } return best; };
const sig = t => JSON.stringify(t.events.map(e => [e.n, e.b, e.d]));
const mine = () => E(() => PROJ.tracks.filter(t => !t.gen && t.kind === 'notes').map(t => t.name + '=' + JSON.stringify(t.events.map(e => [e.n, e.b, e.d]))).join('|'));
try {
  // ---------- A. D minor Keys song + a part I played + a part from my voice, then night-drive ----------
  await E(async () => { await newSong('QA D minor'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }, { type: 'add_melody' }]); setTempo(120);
    PROJ.tracks.push(makeTrack({ role: 'chords', inst: 'grand', gen: false, name: 'My chords', events: [[62, 65, 69], [58, 62, 65], [65, 69, 72], [60, 64, 67]].flatMap((c, i) => c.map(n => ({ n, b: i * 4, d: 3.5, v: 0.8 }))) }));
    saveProject(); renderTracks(); });
  // a sung part: sing.wav turned into a bassline (my own notes, gen false)
  await (await p.$('#importFile')).uploadFile(FX + 'sing.wav'); await p.waitForFunction(() => PROJ.tracks.some(t => t.kind === 'audio' && t.name === 'sing'), { timeout: 30000 }); await W(1500);
  await say('turn sing into a bassline', 4000);
  await E(() => { const s = PROJ.tracks.find(t => t.kind === 'audio' && t.name === 'sing'); if (s) { PROJ.tracks = PROJ.tracks.filter(t => t !== s); saveProject(); renderTracks(); } });
  const mine0 = await mine(); const a0 = await E(() => ({ tracks: PROJ.tracks.map(t => t.name + (t.gen ? '' : '*')).join(', '), key: keyStatusText() }));
  ok('A0 D minor song with my played chords and a part from my voice', /My chords\*/.test(a0.tracks) && (mine0.match(/=/g) || []).length >= 2, a0.tracks + ' · ' + a0.key);
  const u0 = await undoN(); const iA = await imp(`${S}/night-drive.wav`); const u1 = await undoN();
  const cA = await card(); const anaA = await E(() => { const t = PROJ.tracks.find(t => t.kind === 'audio'); const nc = t.ana.chords.filter(c => c.b < 32); return { introNC: nc.every(c => c.root == null) ? 'all N.C.' : nc.map(c => chordName(c)).join(' '), loop: t.ana.loop && t.ana.loop.chords ? t.ana.loop.chords.map(c => chordName(c)).join(' · ') : null }; });
  const lastT = iA.toasts[iA.toasts.length - 1];
  ok('A1 night-drive: E minor, 124, DJ 9A, card chords exactly Em · C · G · D (bug 2)', /E minor/.test(cA) && /DJ key 9A/.test(cA) && /124 BPM/.test(cA) && /Em · C · G · D(?! ·)/.test(cA) && !/Em · C · G · Em/.test(cA), cA);
  ok('A2 drum intro reads no chord (bug 1, in a song)', anaA.introNC === 'all N.C.', JSON.stringify(anaA));
  ok('A3 listening adds no undo step', u1 - u0 === 1, `undo +${u1 - u0}, heard in ${iA.done} ms, toast "${lastT}"`);
  await shot('a1-card-1400');
  const melBefore = await E(() => PROJ.tracks.find(t => t.role === 'melody' && t.gen).events.map(e => ({ n: e.n, b: e.b, d: e.d })));
  let un = await undoN(); const n0 = await E(() => PROJ.tracks.length); await E(() => { window.__toasts = []; }); await p.click('[data-scput]'); await W(600);
  const put = await E(() => ({ n: PROJ.tracks.length, names: PROJ.tracks.map(t => t.name).join(', '), ch: chordsText(PROJ.chords), toast: window.__toasts.slice(-1)[0], keysCh: PROJ.tracks.filter(t => t.gen && t.role === 'chords').map(t => t.name + ':' + !!t.fromSong), strip: [...document.querySelectorAll('#chordStrip .cb b')].map(x => x.textContent).join(' '), src: $('#chordSrc').textContent }));
  ok('A4 Put re-uses Keys\' Chords (no "Chords 2"), Dm · B♭ · F · C, one undo step', put.n === n0 && !/Chords 2/.test(put.names) && put.keysCh.join() === 'Chords:true' && /^Dm · B♭ · F · C$/.test(put.ch) && (await undoN()) - un === 1, `${put.names} · ${put.ch} · steps ${(await undoN()) - un} · "${put.toast}"`);
  ok('A5 Put never changes a part I played or sang', (await mine()) === mine0, 'mine unchanged: ' + ((await mine()) === mine0));
  ok('A6 strip shows them and says from night-drive', put.strip === 'Dm B♭ F C' && /night-drive/.test(put.src), put.strip + ' · ' + put.src);
  const melAfter = await E(() => PROJ.tracks.find(t => t.role === 'melody' && t.gen).events.map(e => ({ n: e.n, b: e.b, d: e.d })));
  const cp = melodyCopy(pcsSeq(melAfter), pcsSeq(songOf('night-drive').melody));
  ok('A7 Keys\' melody is not the song\'s', cp <= 4, `longest matching interval run ${cp} of ${songOf('night-drive').melody.length - 1}`);
  await shot('a2-put-1400');
  // play: playhead under the card, strip follows
  await E(() => { const c = document.querySelector('.songcard'); if (c) c.scrollIntoView({ block: 'center' }); loopPlay(); }); await W(1500); const sync = [];
  for (let i = 0; i < 6; i++) { sync.push(await E(() => { const beat = mod(LOOP.rawBeat(), LOOP.L), now = document.querySelector('#chordStrip .cb.now'), i = CL.blocks.findIndex(c => c.b <= beat && beat < c.b + c.d); return { beat: +beat.toFixed(2), lit: now ? +now.dataset.cb : -1, want: i }; })); await W(600); }
  const zc = await E(() => { const c = document.querySelector('.songcard'), ph = document.querySelector('.playhead,#playhead,.ph'); return { card: c && getComputedStyle(c).zIndex, cardPos: c && getComputedStyle(c).position, ph: ph ? ph.className || ph.id : 'none', phZ: ph && getComputedStyle(ph).zIndex }; });
  await shot('a3-playing-1400'); const cardEl = await p.$('.songcard'); if (cardEl) await cardEl.screenshot({ path: `${SH}/a3-playing-card.png` });
  await E(() => loopStop());
  ok('A8 Play: lit chord follows the playhead; card above the playhead', sync.filter(s => s.lit === s.want || Math.abs(s.beat - Math.round(s.beat / 4) * 4) < 0.15).length >= 5, sync.map(s => `${s.beat}:${s.lit}/${s.want}`).join(' ') + ' · ' + JSON.stringify(zc));
  // fixer
  un = await undoN(); await p.click('#chordStrip [data-cb="1"]'); await W(300); await p.click('[data-croot="11"]'); await W(150); await p.click('[data-cq="min"]'); await W(150); await p.click('[data-capply]'); await W(500);
  const fx1 = await E(() => ({ n: chordName(chordBlocks()[1]), all: chordsText() }));
  ok('A9 fixer: bar 2 → Bm in one step; my parts unchanged', fx1.n === 'Bm' && (await undoN()) - un === 1 && (await mine()) === mine0, fx1.all);
  await E(() => undo()); await W(300);
  // Set my key to E minor
  un = await undoN(); await p.click('[data-sckey]'); await W(500);
  const sk = await E(() => ({ key: keyStatusText(), ch: chordsText(PROJ.chords) }));
  ok('A10 Set my key to E minor: from the song, chords up a tone, one step', sk.key === 'E minor · from the song' && /^Em · C · G · D/.test(sk.ch) && (await undoN()) - un === 1, `${sk.key} · ${sk.ch}`);
  R.A10mine = { info: 'Set my key and my played/sung parts: ' + ((await mine()) === mine0 ? 'unchanged' : 'MOVED') }; console.log(R.A10mine.info);
  await E(() => undo()); await W(300);
  // undo the Put: Keys' own chords back, no song link
  await E(() => undo()); await W(400);
  const back = await E(() => ({ ch: PROJ.chords ? chordsText(PROJ.chords) : '-', link: PROJ.tracks.filter(t => t.gen && t.role === 'chords').map(t => !!t.fromSong).join(), n: PROJ.tracks.length }));
  ok('A11 Undo of Put: Keys\' own chords back, no song link', back.link === 'false' && !/^Dm · B♭ · F · C$/.test(back.ch), JSON.stringify(back));
  // Put again via the card then save/new/reopen
  await p.click('[data-scput]'); await W(500);
  const so = await E(async () => { await saveNamed(true); const id = PROJ.id, n = PROJ.tracks.length, ch = chordsText(PROJ.chords); await newSong('QA other'); await loadNamed(id); await new Promise(r => setTimeout(r, 800)); renderTracks();
    const t = PROJ.tracks.find(t => t.kind === 'audio'); return { n, n2: PROJ.tracks.length, ch, ch2: chordsText(PROJ.chords), ana: !!(t && t.ana), card: !!document.querySelector('.songcard'), lane: !$('#chordLane').hidden, buf: !!AUD.get(t.id) }; });
  ok('A12 save, new song, reopen: card, strip and chords back', so.n === so.n2 && so.ch === so.ch2 && so.ana && so.card && so.lane && so.buf, JSON.stringify(so));
  ok('A13 reopened: my parts still unchanged', (await mine()) === mine0);
  await shot('a4-reopened-1400');

  // ---------- B. empty song + sunday-pop (no Keys chords: a new Chords track) ----------
  await E(async () => { await newSong('QA empty'); }); await W(300);
  await imp(`${S}/sunday-pop.wav`); const cB = await card();
  un = await undoN(); await E(() => { window.__toasts = []; }); await p.click('[data-scput]'); await W(500);
  const pB = await E(() => ({ key: keyStatusText(), ch: chordsText(PROJ.chords), names: PROJ.tracks.map(t => t.name).join(', '), toast: window.__toasts.slice(-1)[0] }));
  ok('B1 Put into a song with no key: song\'s key, one new Chords track, one step, says "a new Chords track"', /F major · from the song/.test(pB.key) && /^F · C · Dm · B♭/.test(pB.ch) && (pB.names.match(/Chords/g) || []).length === 1 && /a new Chords track/.test(pB.toast || '') && (await undoN()) - un === 1, `${cB} → ${pB.key} · ${pB.ch} · ${pB.names} · "${pB.toast}"`);
  // put again: still one chords part
  await p.click('[data-scput]'); await W(400);
  ok('B2 Put a second time: still one Chords part', await E(() => PROJ.tracks.filter(t => t.role === 'chords').length) === 1, await E(() => PROJ.tracks.map(t => t.name).join(', ')));
  await shot('b1-put-nokey-1400');

  // ---------- C. drum loops: 6 styles + techno-drums, through the file input ----------
  const C = [];
  for (const f of ['techno-drums', ...['house', 'techno', 'hiphop', 'trap', 'afro', 'dnb'].map(s => 'drums-' + s)]) {
    await E(async () => { await newSong('QA drums'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }]); saveProject(); }); await W(300);
    const k0 = await E(() => keyStatusText());
    const path = f === 'techno-drums' ? `${S}/${f}.wav` : `${S2}/${f}.wav`; const truth = JSON.parse(fs.readFileSync(path.replace('.wav', '.json')));
    const i = await imp(path); const c = await card(); const btn = await E(() => ({ put: !!document.querySelector('[data-scput]'), key: !!document.querySelector('[data-sckey]'), ana: (() => { const t = PROJ.tracks.find(t => t.kind === 'audio'); return { key: t.ana.key, chords: t.ana.chords.filter(c => c.root != null).length, bpm: t.ana.bpm, alt: t.ana.bpmAlt }; })(), k: keyStatusText() }));
    const say1 = await say('put those chords on my song', 600); const k1 = await E(() => keyStatusText());
    const pass = /No key in this clip/.test(c) && !btn.put && !btn.key && !btn.ana.key && btn.ana.chords === 0 && btn.k === k0 && k1 === k0 && (Math.abs(btn.ana.bpm - truth.bpm) < 0.6 || Math.abs((btn.ana.alt || 0) - truth.bpm) < 0.6);
    C.push(pass); ok(`C ${f}: "No key in this clip", no Put/Set-key, BPM right, my key unchanged`, pass, `${c} · toast "${i.toasts.slice(-1)[0]}" · bpm ${btn.ana.bpm}/${truth.bpm} · typed put → "${say1}" · key ${k0} → ${k1}`);
    if (f === 'techno-drums') await shot('c1-drums-1400');
  }

  // ---------- D. trap in C♯ minor into an F major song ----------
  await E(async () => { await newSong('QA F major'); runActions([{ type: 'style', style: 'pop' }, { type: 'key', key: 'F major' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]); saveProject(); }); await W(500);
  await imp(`${S}/trap-csharp.wav`); const cD = await card();
  un = await undoN(); await p.click('[data-scput]'); await W(500);
  const pD = await E(() => { const k = keyStatus().key, sc = scaleOf(k); return { ch: chordsText(PROJ.chords), key: keyStatusText(), names: PROJ.tracks.map(t => t.name).join(', '), out: PROJ.tracks.filter(t => t.gen && t.role !== 'drums').map(t => t.name + ':' + t.events.filter(e => !sc.includes(mod(e.n, 12))).length + '/' + t.events.length) }; });
  ok('D1 trap → F major song: C♯ minor 140 read, chords moved into F major, no Chords 2, 0 notes out of key', /C♯ minor/.test(cD) && /F major/.test(pD.key) && !/Chords 2/.test(pD.names) && pD.out.every(x => /^[^:]+:0\//.test(x)) && (await undoN()) - un === 1, `${cD} · ${pD.ch} · ${pD.key} · ${pD.out.join(' ')}`);

  // ---------- E. typed to Keys (offline) ----------
  await E(async () => { await newSong('QA talk'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]); setTempo(120); saveProject(); OFFER.actions = null; });
  await imp(`${S}/night-drive.wav`);
  const T = {};
  T.parse = await E(() => Object.fromEntries(['put the chords from night drive on my song', 'turn night-drive into a melody', 'what key is night drive in', 'add drive to the chords', 'more drive on the bass', 'copy the melody of this song', 'give me the melody of night drive', 'iski dhun chahiye is gaane ki', 'add a melody', 'add reverb to night drive', 'mute night drive', 'make the night drive song quieter', 'put the chords from Night_Drive on my song'].map(s => { const r = localBrain(s) || {}; return [s, { a: (r.actions || []).map(a => Object.entries(a).map(([k, v]) => k + ':' + v).join(' ')), say: (r.say || r.reply || '').slice(0, 160) }]; })));
  const P = s => T.parse[s].a.join(' | ');
  ok('E1 "put the chords from night drive on my song" → chords_from_audio night-drive, no Drive (bug 3)', /type:chords_from_audio/.test(P('put the chords from night drive on my song')) && /night-drive/.test(P('put the chords from night drive on my song')) && !/track_fx/.test(P('put the chords from night drive on my song')), P('put the chords from night drive on my song'));
  ok('E2 "turn night-drive into a melody" → transcribe (bug 3)', /^type:transcribe/.test(P('turn night-drive into a melody')), P('turn night-drive into a melody'));
  ok('E3 "what key is night drive in" → analyse_song night-drive', /type:analyse_song.*night-drive/.test(P('what key is night drive in')), P('what key is night drive in'));
  ok('E4 "add drive to the chords" / "more drive on the bass" still Drive', /track_fx.*drive/i.test(P('add drive to the chords')) && /track_fx.*drive/i.test(P('more drive on the bass')), P('add drive to the chords') + ' / ' + P('more drive on the bass'));
  ok('E5 "add reverb to / mute / quieter night drive" act on that track', [P('add reverb to night drive'), P('mute night drive'), P('make the night drive song quieter')].every(x => /night-drive/.test(x)), [P('add reverb to night drive'), P('mute night drive'), P('make the night drive song quieter')].join(' || '));
  ok('E6 "Night_Drive" spelling matches too', /chords_from_audio/.test(P('put the chords from Night_Drive on my song')), P('put the chords from Night_Drive on my song'));
  const n1 = await E(() => PROJ.tracks.length); T.copy = await say('copy the melody of this song', 600); const n2 = await E(() => PROJ.tracks.length);
  ok('E7 "copy the melody of this song": honest reply, no new track (bug 4)', n1 === n2 && /Turn into notes/.test(T.copy) && /turn night-drive into a melody/.test(T.copy), `${T.copy} · tracks ${n1}→${n2}`);
  ok('E8 "give me the melody of night drive" / Hinglish: no actions', T.parse['give me the melody of night drive'].a.length === 0 && T.parse['iski dhun chahiye is gaane ki'].a.length === 0, JSON.stringify([T.parse['give me the melody of night drive'], T.parse['iski dhun chahiye is gaane ki']]));
  ok('E9 "add a melody" still adds one', /add_melody/.test(P('add a melody')), P('add a melody'));
  T.what = await say('what key is night drive in', 500);
  ok('E10 "what key is night drive in" answers about the dropped-in song', /^E minor at 124/.test(T.what), T.what);
  // typed put: one undo step, 3 runs (bug 5)
  const steps = [];
  for (let k = 0; k < 3; k++) { await E(() => undoBoundary()); await W(200); const u = await undoN(); await say('put the chords from night drive on my song', 1200); steps.push((await undoN()) - u);
    const nm = await E(() => PROJ.tracks.map(t => t.name).join(', ')); T['put' + k] = (await last()) + ' · ' + nm; await E(() => { loopStop(); undo(); }); await W(400); }
  ok('E11 typed "put the chords from night drive on my song": one undo step, 3 of 3; no Chords 2, no Drive', steps.every(s => s === 1) && !/Chords 2/.test(T.put0) && !/Drive on/.test(T.put0), `steps ${steps.join(',')} · ${T.put0}`);
  // a listen still running + typed put (assistant fix 4)
  await E(async () => { await newSong('QA listen'); runActions([{ type: 'style', style: 'pop' }, { type: 'key', key: 'C major' }, { type: 'add_drums' }, { type: 'add_chords' }]); saveProject(); undoBoundary(); }); await W(300);
  const uL = await undoN(); await (await p.$('#importFile')).uploadFile(`${S}/sunday-pop.wav`); await p.waitForFunction(() => PROJ.tracks.some(t => t.kind === 'audio'), { timeout: 60000 }); await W(200);
  T.listenPut = await say('put those chords on my song', 200);
  await p.waitForFunction(() => { const t = PROJ.tracks.find(t => t.kind === 'audio'); return t && t.ana && !ANA_RUN.has(t.id); }, { timeout: 90000 }); await W(1500);
  const lp = await E(() => ({ ch: PROJ.chords ? chordsText(PROJ.chords) : '-', names: PROJ.tracks.map(t => t.name).join(', ') })); await E(() => loopStop());
  ok('E12 typed put while still listening: import + put = 2 steps total, chords on, no Chords 2', (await undoN()) - uL === 2 && /C · G · Am · F|F · C · Dm/.test(lp.ch) && !/Chords 2/.test(lp.names), `${T.listenPut} · ${lp.ch} · ${lp.names} · steps ${(await undoN()) - uL}`);
  fs.writeFileSync('/tmp/qa/se7bc-re/talk.json', JSON.stringify(T, null, 1));
  await shot('e1-talk-1400');

  // ---------- F. phones: toast above the fixer sheet; playhead behind the card ----------
  await E(async () => { await newSong('QA phone'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]); saveProject(); });
  await imp(`${S}/night-drive.wav`); await p.click('[data-scput]'); await W(400);
  const F = [];
  for (const th of ['emerald', 'velvet', 'sapphire']) for (const w of [1400, 390, 360]) {
    await E(t => setTheme(t), th); await p.setViewport({ width: w, height: w > 500 ? 1000 : 844 }); await W(500);
    const sw = await E(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (w < 500) { await E(() => { document.querySelector('#chordLane').scrollIntoView({ block: 'center' }); toast('QA: a message just before the fixer'); }); await W(150); await p.click('#chordStrip [data-cb="1"]'); await W(400);
      const r = await E(() => { const t = document.querySelector('#toast').getBoundingClientRect(), s = document.querySelector('#chordPop').getBoundingClientRect(), shown = document.querySelector('#toast').classList.contains('show');
        return { shown, toast: [Math.round(t.top), Math.round(t.bottom)], sheet: [Math.round(s.top), Math.round(s.bottom)], overlap: shown && t.bottom > s.top && t.top < s.bottom, cls: document.body.classList.contains('cp-open') }; });
      await shot(`f-fixer-${th}-${w}`); await p.keyboard.press('Escape'); await W(200); const after = await E(() => document.body.classList.contains('cp-open'));
      F.push({ th, w, sw, ...r, after });
    } else { await E(() => { const c = document.querySelector('.songcard'); c.scrollIntoView({ block: 'center' }); loopPlay(); }); await W(1200); await shot(`f-playing-${th}-${w}`); await E(() => loopStop()); F.push({ th, w, sw }); }
  }
  ok('F1 phones: toast never covers the fixer sheet, cp-open cleared on Esc, no sideways scroll', F.every(f => f.sw <= 0 && (f.w > 500 || (!f.overlap && f.cls && !f.after))), JSON.stringify(F));
} catch (e) { console.log('CRASH', e.stack); fails++; }
ok('no page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
fs.writeFileSync('/tmp/qa/se7bc-re/retest.json', JSON.stringify(R, null, 1));
console.log(fails ? `${fails} FAIL` : 'ALL PASS'); await b.close();
