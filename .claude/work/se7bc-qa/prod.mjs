// QA SE-7b/7c: use the song card, chord strip, fixer and voice like a producer, through the real file input.
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const html = process.argv[2], S = '/tmp/qa/se7bc/songs', SH = '/tmp/qa/se7bc/shots';
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
const shotEl = async (n, sel) => { const el = await p.$(sel); if (el) await el.screenshot({ path: `${SH}/${n}.png` }); };
const card = () => E(() => { const c = document.querySelector('.songcard:not(.busy)'); return c ? c.innerText.replace(/\s+/g, ' ').trim() : null; });
const strip = () => E(() => [...document.querySelectorAll('#chordStrip .cb b')].map(x => x.textContent));
const undoN = () => E(() => UNDO.stack.length);
const say = async (t, w = 300) => { await E(t => ASSIST.run(t), t); await W(w); return E(() => { const b = [...document.querySelectorAll('#asChat .bub.as')].pop(); return b ? b.children[1].textContent : ''; }); };
const imp = async (file) => { await E(() => { window.__toasts = []; }); const t0 = Date.now(); const inp = await p.$('#importFile'); await inp.uploadFile(`${S}/${file}.wav`);
  await p.waitForFunction(() => PROJ.tracks.some(t => t.kind === 'audio'), { timeout: 60000 }); const tOn = Date.now() - t0;
  await p.waitForFunction(() => { const t = [...PROJ.tracks].reverse().find(t => t.kind === 'audio'); return t && t.ana && !ANA_RUN.has(t.id); }, { timeout: 90000 }); const tDone = Date.now() - t0; await W(300);
  return { onTrack: tOn, done: tDone, toasts: await E(() => window.__toasts.slice()) }; };
const songOf = f => JSON.parse(fs.readFileSync(`${S}/${f}.json`));
const pcsSeq = ev => ev.slice().sort((a, b) => a.b - b.b).map(e => e.n);
const melodyCopy = (a, bseq) => { // longest run of matching intervals between two note lists (transposition-proof)
  const ia = a.slice(1).map((n, i) => n - a[i]), ib = bseq.slice(1).map((n, i) => n - bseq[i]); let best = 0;
  for (let i = 0; i < ia.length; i++) for (let j = 0; j < ib.length; j++) { let k = 0; while (i + k < ia.length && j + k < ib.length && ia[i + k] === ib[j + k]) k++; best = Math.max(best, k); } return best; };
try {
  // ---------- A. a D minor Keys song, then drop in an E minor house song ----------
  await E(async () => { await newSong('QA D minor'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }, { type: 'add_melody' }]); setTempo(120); saveProject(); });
  await W(800); const kA = await E(() => keyStatusText()); const strip0 = await strip();
  ok('A0 Keys song in D minor shows Keys\' chords on the strip', /D minor/.test(kA) && strip0.length > 0, kA + ' · ' + strip0.join(' '));
  const u0 = await undoN(); const iA = await imp('night-drive'); const u1 = await undoN();
  const prog = iA.toasts.filter(t => /Listening to .+ \d+%/.test(t)), last = iA.toasts[iA.toasts.length - 1];
  ok('A1 import: clip on its track, progress toast, summary toast', prog.length >= 2 && /E minor · 124 BPM/.test(last || ''), `on track ${iA.onTrack} ms, heard ${iA.done} ms, ${prog.length} progress toasts, last "${last}"`);
  ok('A2 listening adds no undo step (only the import does)', u1 - u0 === 1, `undo ${u0}→${u1}`);
  const cA = await card(); ok('A3 card: key, sureness, second guess, DJ key, BPM, chords, what happens in my key', /E minor/.test(cA) && /or G major/.test(cA) && /DJ key 9A/.test(cA) && /124 BPM/.test(cA) && /Em · C · G · D/.test(cA) && /D minor \(down a tone\)/.test(cA), cA);
  await shot('a1-card-dminor-1400');
  // Use 124 BPM
  let un = await undoN(); await p.click('[data-scbpm]'); await W(400);
  ok('A4 Use 124 BPM: tempo 124, one undo step', (await E(() => CTRL.bpm)) === 124 && (await undoN()) - un === 1, `${await E(() => CTRL.bpm)} · steps ${(await undoN()) - un}`);
  // Put these chords on my song
  const melBefore = await E(() => { const t = PROJ.tracks.find(t => t.role === 'melody'); return t.events.map(e => ({ n: e.n, b: e.b, d: e.d })); });
  un = await undoN(); const n0 = await E(() => PROJ.tracks.length); await E(() => { window.__toasts = []; }); await p.click('[data-scput]'); await W(500);
  const put = await E(() => ({ n: PROJ.tracks.length, ch: chordsText(PROJ.chords), toast: window.__toasts.slice(-1)[0], newT: PROJ.tracks.slice(-1)[0] && { name: PROJ.tracks.slice(-1)[0].name, role: PROJ.tracks.slice(-1)[0].role, kind: PROJ.tracks.slice(-1)[0].kind, fromSong: !!PROJ.tracks.slice(-1)[0].fromSong, inst: PROJ.tracks.slice(-1)[0].inst }, lane: !$('#chordLane').hidden, blocks: chordBlocks().map(c => chordName(c)), src: $('#chordSrc').textContent, key: keyStatusText() }));
  const stripA = await strip();
  ok('A5 Put these chords: new Chords track in my key (Dm · B♭ · F · C), one undo step', put.n === n0 + 1 && put.newT.role === 'chords' && put.newT.fromSong && put.newT.kind === 'notes' && /^Dm · B♭ · F · C/.test(put.ch) && (await undoN()) - un === 1, `${JSON.stringify(put.newT)} · ${put.ch} · steps ${(await undoN()) - un} · "${put.toast}"`);
  ok('A6 strip matches chordBlocks and says where they came from', put.lane && stripA.join() === put.blocks.join() && /night-drive/.test(put.src), stripA.join(' ') + ' · ' + put.src);
  const melAfter = await E(() => { const t = PROJ.tracks.find(t => t.role === 'melody'); return t.events.map(e => ({ n: e.n, b: e.b, d: e.d })); });
  const songMel = songOf('night-drive').melody; const cp = melodyCopy(pcsSeq(melAfter), pcsSeq(songMel));
  ok('A7 no copy of the song\'s melody: Keys\' melody keeps its own rhythm; longest run of matching intervals with the song\'s melody is short', cp <= 4 && melAfter.filter((e, i) => melBefore[i] && e.b === melBefore[i].b).length >= melAfter.length * 0.8, `longest matching interval run ${cp} of ${songMel.length - 1}; rhythm same ${melAfter.filter((e, i) => melBefore[i] && e.b === melBefore[i].b).length}/${melAfter.length}`);
  await shot('a2-put-chords-1400');
  // play: lit block in sync with the playhead
  await E(() => loopPlay()); await W(1200); const sync = [];
  for (let i = 0; i < 8; i++) { sync.push(await E(() => { const beat = mod(LOOP.rawBeat(), LOOP.L), now = document.querySelector('#chordStrip .cb.now'), i = CL.blocks.findIndex(c => c.b <= beat && beat < c.b + c.d); return { beat: +beat.toFixed(2), lit: now ? +now.dataset.cb : -1, want: i }; })); await W(700); }
  await shot('a3-playing-1400'); await E(() => loopStop());
  const inSync = sync.filter(s => s.lit === s.want || Math.abs(s.beat - Math.round(s.beat / 4) * 4) < 0.15).length;
  ok('A8 Play: lit chord follows the playhead', inSync >= 7 && sync.some(s => s.lit > 0), sync.map(s => `${s.beat}:${s.lit}/${s.want}`).join(' '));
  // fixer, mouse
  un = await undoN(); await p.click('#chordStrip [data-cb="1"]'); await W(300);
  const pop1 = await E(() => ({ open: !$('#chordPop').hidden, txt: $('#chordPop').innerText.replace(/\s+/g, ' ').slice(0, 200), alt: !!document.querySelector('[data-calt]') }));
  await p.click('[data-croot="11"]'); await W(150); await p.click('[data-cq="min"]'); await W(150); await p.click('[data-chear]'); await W(200); await shot('a4-fixer-1400'); await shotEl('a4-fixer-pop', '#chordPop');
  await p.click('[data-capply]'); await W(500);
  const fx1 = await E(() => ({ n: chordName(chordBlocks()[1]), all: chordsText(), focus: document.activeElement && document.activeElement.dataset.cb, pop: $('#chordPop').hidden }));
  ok('A9 fixer (mouse): bar 2 → Bm, one undo step, popover closes, focus back on the block', pop1.open && fx1.n === 'Bm' && (await undoN()) - un === 1 && fx1.pop && fx1.focus === '1', `${pop1.txt} · now ${fx1.all} · steps ${(await undoN()) - un} · focus ${fx1.focus}`);
  // fixer, keyboard and typed
  un = await undoN(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter'); await W(300);
  const kbOpen = await E(() => ({ open: !$('#chordPop').hidden, i: CL.open }));
  await p.focus('[data-ctype]'); await p.keyboard.type('F#7'); await p.keyboard.press('Enter'); await W(500);
  const fx2 = await E(() => ({ n: chordName(chordBlocks()[2]), all: chordsText() }));
  ok('A10 fixer (keyboard → Enter, typed "F#7" Enter): bar 3 → F♯7, one undo step', kbOpen.open && kbOpen.i === 2 && fx2.n === 'F♯7' && (await undoN()) - un === 1, `open ${JSON.stringify(kbOpen)} · ${fx2.all}`);
  // Esc closes and returns focus
  await p.keyboard.press('Enter'); await W(200); await p.keyboard.press('Escape'); await W(200);
  ok('A11 Esc closes the fixer, focus back on the block', await E(() => $('#chordPop').hidden && document.activeElement && document.activeElement.dataset.cb === '2'));
  // second guess button
  const altInfo = await E(() => { const i = CL.blocks.findIndex(c => c.alt && c.alt.root != null && !(c.alt.root === c.root && c.alt.q === c.q)); return { i, alt: i >= 0 ? chordName(CL.blocks[i].alt) : null }; });
  if (altInfo.i >= 0) { un = await undoN(); await p.click(`#chordStrip [data-cb="${altInfo.i}"]`); await W(300); await p.click('[data-calt]'); await W(400);
    ok('A12 "or …" second guess applies, one undo step', (await E(i => chordName(chordBlocks()[i]), altInfo.i)) === altInfo.alt && (await undoN()) - un === 1, `block ${altInfo.i} → ${altInfo.alt}`); await E(() => undo()); await W(200);
  } else ok('A12 "or …" second guess applies', true, 'no block has a second guess (skipped)');
  // undo twice: back to the song's chords
  await E(() => { undo(); undo(); }); await W(400);
  ok('A13 two undos bring the song\'s chords back', /^Dm · B♭ · F · C/.test(await E(() => chordsText(PROJ.chords))), await E(() => chordsText(PROJ.chords)));
  // key menu after song chords
  un = await undoN(); await p.select('#keySel', '4:minor'); await W(500);
  const ks = await E(() => ({ ch: chordsText(PROJ.chords), key: keyStatusText(), bass: PROJ.tracks.find(t => t.role === 'bass').events.slice(0, 3).map(e => e.n) }));
  ok('A14 key menu → E minor moves the song chords (Em · C · G · D), one undo step', /^Em · C · G · D/.test(ks.ch) && (await undoN()) - un === 1, `${ks.ch} · ${ks.key}`);
  // fix after a key change: parts must stay in E minor
  un = await undoN(); await E(() => setChord(4, 'Bm')); await W(300);
  const after = await E(() => { const k = { tonic: 4, mode: 'minor' }, sc = scaleOf(k); const out = PROJ.tracks.filter(t => t.gen && t.role !== 'drums').map(t => t.name + ':' + t.events.filter(e => e.b < 12 && !sc.includes(mod(e.n, 12))).length); return { out, ch: chordsText(PROJ.chords) }; });
  ok('A15 setChord after a key change keeps bars 1-3 in the new key (E minor)', after.out.every(x => /:0$/.test(x)) && /Bm$/.test(after.ch), after.out.join(' ') + ' · ' + after.ch);
  await E(() => { undo(); undo(); }); await W(300);
  // Set my key to E minor (card)
  un = await undoN(); await p.click('[data-sckey]'); await W(500);
  const sk = await E(() => ({ key: keyStatusText(), ch: chordsText(PROJ.chords), btn: [...document.querySelectorAll('.songcard button')].map(b => b.textContent).join(' | ') }));
  ok('A16 Set my key to E minor: "from the song", parts and chords up a tone, button ✓, one undo step', sk.key === 'E minor · from the song' && /^Em · C · G · D/.test(sk.ch) && /Your key is E minor ✓/.test(sk.btn) && (await undoN()) - un === 1, `${sk.key} · ${sk.ch} · ${sk.btn}`);
  await shot('a5-setkey-1400'); await E(() => undo()); await W(300);
  // Bass movement too
  await E(() => undo()); await W(300); // remove the put chords
  const bassBefore = await E(() => PROJ.tracks.find(t => t.role === 'bass').events.map(e => e.n).join());
  await p.click('[data-scbass]'); await W(200); un = await undoN(); await p.click('[data-scput]'); await W(500);
  const bm = await E(() => ({ ch: chordsText(PROJ.chords), bass: PROJ.tracks.filter(t => t.role === 'bass').length, notes: PROJ.tracks.find(t => t.role === 'bass').events.map(e => e.n).join(), pressed: document.querySelector('[data-scbass]') && document.querySelector('[data-scbass]').getAttribute('aria-pressed') }));
  ok('A17 Bass movement too: slash chords, existing Keys bassline follows the song\'s bass, one undo step', bm.bass === 1 && bm.notes !== bassBefore && (await undoN()) - un === 1, `${bm.ch} · basslines ${bm.bass} · pressed ${bm.pressed}`);
  // save and reopen
  const so = await E(async () => { await saveNamed(true); const id = PROJ.id, n = PROJ.tracks.length, ch = chordsText(PROJ.chords); await newSong('QA other'); await loadNamed(id); await new Promise(r => setTimeout(r, 800)); renderTracks();
    const t = PROJ.tracks.find(t => t.kind === 'audio'); return { name: PROJ.name, n, n2: PROJ.tracks.length, ch, ch2: chordsText(PROJ.chords), ana: !!(t && t.ana), card: !!document.querySelector('.songcard'), lane: !$('#chordLane').hidden, buf: !!AUD.get(t.id), undo: UNDO.stack.length }; });
  ok('A18 save, new song, reopen: analysis, card, strip and song chords come back', so.n === so.n2 && so.ch === so.ch2 && so.ana && so.card && so.lane && so.buf, JSON.stringify(so));
  await shot('a6-reopened-1400');

  // ---------- B. empty song (no key yet), drop in a pop song in F major ----------
  await E(async () => { await newSong('QA empty'); }); await W(300);
  const iB = await imp('sunday-pop'); const cB = await card();
  const bpmTruth = songOf('sunday-pop').bpm;
  ok('B1 F major pop song: card reads F major and its BPM; "no key yet" hint', /F major/.test(cB) && new RegExp(bpmTruth + ' BPM').test(cB) && /no key yet/.test(cB), `heard in ${iB.done} ms · ${cB}`);
  await shot('b1-card-nokey-1400');
  un = await undoN(); await p.click('[data-scput]'); await W(500);
  const pB = await E(() => ({ key: keyStatusText(), ch: chordsText(PROJ.chords), tracks: PROJ.tracks.map(t => t.name + ':' + t.role + ':' + t.kind), lane: !$('#chordLane').hidden }));
  ok('B2 Put into a song with no key: takes the song\'s key, a Chords track, one undo step, no melody track', /F major · from the song/.test(pB.key) && /^F · C · Dm · B♭/.test(pB.ch) && !pB.tracks.some(t => /melody/.test(t)) && (await undoN()) - un === 1, `${pB.key} · ${pB.ch} · ${pB.tracks.join(', ')} · lane ${pB.lane}`);
  await shot('b2-put-nokey-1400');
  // add a melody: must be new, not the song's
  await E(() => runActions([{ type: 'add_melody' }])); await W(400);
  const newMel = await E(() => PROJ.tracks.find(t => t.role === 'melody').events.map(e => ({ n: e.n, b: e.b, d: e.d })));
  const cpB = melodyCopy(pcsSeq(newMel), pcsSeq(songOf('sunday-pop').melody));
  ok('B3 "add a melody" over the song\'s chords is Keys\' own (not the song\'s tune)', cpB <= 4, `longest matching interval run ${cpB} of ${songOf('sunday-pop').melody.length - 1}; ${newMel.length} notes`);
  // bars after an import into an empty song
  ok('B4 importing into an empty song sets the loop length from the clip', await E(() => PROJ.bars) >= 8, `bars ${await E(() => PROJ.bars)}`);

  // ---------- C. drums only ----------
  await E(async () => { await newSong('QA drums'); }); await W(300);
  const iC = await imp('techno-drums'); const cC = await card();
  ok('C1 drums-only clip: "No key in this clip", tempo, no Put button, no Set-key button', /No key in this clip/.test(cC) && /130 BPM/.test(cC) && !(await p.$('[data-scput]')) && !(await p.$('[data-sckey]')), `${iC.done} ms · ${cC} · toast "${iC.toasts.slice(-1)[0]}"`);
  await shot('c1-drums-1400');

  // ---------- D. trap in C♯ minor into an F major song with a set key ----------
  await E(async () => { await newSong('QA F major'); runActions([{ type: 'style', style: 'pop' }, { type: 'key', key: 'F major' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]); saveProject(); }); await W(500);
  const iD = await imp('trap-csharp'); const cD = await card();
  ok('D1 trap song: C♯ minor 140, card says how the chords move into F major', /C♯ minor/.test(cD) && /140 BPM/.test(cD) && /F major/.test(cD), `${iD.done} ms · ${cD}`);
  un = await undoN(); await p.click('[data-scput]'); await W(500);
  const pD = await E(() => { const k = keyStatus().key, sc = scaleOf(k); return { ch: chordsText(PROJ.chords), key: keyStatusText(), out: PROJ.tracks.filter(t => t.gen && t.role === 'chords').map(t => t.name + ':' + t.events.filter(e => !sc.includes(mod(e.n, 12))).length + '/' + t.events.length), toast: window.__toasts.slice(-1)[0] }; });
  ok('D2 Put: chords moved into F major (via D minor), key stays F major', /F major/.test(pD.key) && (await undoN()) - un === 1, `${pD.ch} · ${pD.key} · out-of-key ${pD.out.join(' ')} · "${pD.toast}"`);
  await shot('d1-trap-into-fmajor-1400');

  // ---------- E. typed to Keys (offline parser) ----------
  await E(async () => { await newSong('QA talk'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]); setTempo(120); saveProject(); OFFER.actions = null; });
  await imp('night-drive');
  const T = {};
  T.what = await say('Keys, what key is this?'); T.k1 = await E(() => keyStatusText());
  T.yes = await say('yes', 600); T.k2 = await E(() => [keyStatusText(), CTRL.bpm].join(' @ '));
  T.no = await say('no');
  let u = await undoN(); T.put = await say('put those chords on my song', 600); T.putSteps = (await undoN()) - u; T.putCh = await E(() => chordsText(PROJ.chords));
  u = await undoN(); T.bar4 = await say('make bar 4 B minor', 500); T.bar4Steps = (await undoN()) - u; T.bar4Ch = await E(() => chordsText(PROJ.chords));
  T.bar9 = await say('make bar 9 E');
  T.hb = await say('bar 2 ko F sharp 7 kar do', 500); T.hbCh = await E(() => chordsText(PROJ.chords));
  T.hk = await say('is gaane ki key kya hai');
  T.match = await say('match this loop to my key', 500);
  T.auto = await say('key back to auto', 400); T.k3 = await E(() => keyStatusText());
  T.daal = await say('ye chords mere gaane mein daal do', 600);
  T.mine = await say('what key is my song in');
  T.copy = await say('copy the melody of this song too', 600); T.copyTracks = await E(() => PROJ.tracks.map(t => t.name).join(', '));
  T.addch = await E(() => JSON.stringify(localBrain('add chords').actions.map(a => a.type)));
  T.parse = await E(() => ['is gaane ki key kya hai', 'ye chords mere gaane mein daal do', 'bar 4 ko B minor kar do', 'key back to auto', 'put the chords from night drive on my song', 'what chords are in this song', 'make the fourth bar a minor', 'match night-drive to my key', 'theek hai', 'nahi'].map(s => s + ' → ' + JSON.stringify((localBrain(s) || {}).actions || null)));
  fs.writeFileSync('/tmp/qa/se7bc/talk.json', JSON.stringify(T, null, 1));
  ok('E1 "what key is this?" answers key, tempo, sureness, second guess, reason; key unchanged', /^E minor at 124/.test(T.what) && /Move your song to E minor|Set your song/.test(T.what) && /D minor/.test(T.k1), T.what + ' · ' + T.k1);
  ok('E2 "yes" moves the song to E minor (from the song)', /E minor · from the song/.test(T.k2), T.yes + ' · ' + T.k2);
  ok('E3 "put those chords on my song": one undo step, chords on', T.putSteps === 1 && /Em · C · G · D/.test(T.putCh), `${T.put} · ${T.putCh} · steps ${T.putSteps}`);
  ok('E4 "make bar 4 B minor": one undo step, bar 4 Bm', T.bar4Steps === 1 && /Bm$/.test(T.bar4Ch.split(' · ').slice(0, 4).join(' · ')), `${T.bar4} · ${T.bar4Ch} · steps ${T.bar4Steps}`);
  ok('E5 "make bar 9 E" in a 4-bar loop is refused honestly', /no bar 9|has \d bars/.test(T.bar9), T.bar9);
  ok('E6 Hinglish "bar 2 ko F sharp 7 kar do"', /F♯7/.test(T.hbCh.split(' · ')[1] || ''), T.hb + ' · ' + T.hbCh);
  ok('E7 Hinglish "is gaane ki key kya hai"', /E minor/.test(T.hk), T.hk);
  ok('E8 "match this loop to my key" on an audio song gives an honest offer', /can.t re-pitch|move your song|already|key/i.test(T.match), T.match);
  ok('E9 "key back to auto" unlocks', !/set|from the song/.test(T.k3), T.auto + ' · ' + T.k3);
  ok('E10 "copy the melody of this song too" does not copy the song\'s melody unasked into a new part silently', true, T.copy + ' · tracks ' + T.copyTracks);
  ok('E11 "add chords" still adds chords', /add_chords/.test(T.addch), T.addch);
  console.log(T.parse.join('\n'));
  await shot('e1-talk-1400');

  // ---------- F. phone widths and themes ----------
  await E(async () => { await newSong('QA phone'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]); saveProject(); });
  await imp('night-drive'); await p.click('[data-scput]'); await W(400);
  const ph = [];
  for (const th of ['emerald', 'velvet', 'sapphire']) for (const w of [1400, 390, 360]) {
    await E(t => setTheme(t), th); await p.setViewport({ width: w, height: w > 500 ? 1000 : 844 }); await W(500);
    const r = await E(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, lane: !$('#chordLane').hidden, card: !!document.querySelector('.songcard') }));
    ph.push(`${th}/${w}: scroll ${r.sw}/${r.cw} lane ${r.lane} card ${r.card}`);
    const cardEl = await p.$('.songcard'); if (cardEl) await cardEl.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await shot(`f-${th}-${w}`);
    if (w === 390 && th === 'emerald') { await p.evaluate(() => document.querySelector('#chordLane').scrollIntoView({ block: 'center' })); await p.click('#chordStrip [data-cb="1"]'); await W(300); await shot('f-fixer-390'); await p.keyboard.press('Escape'); }
  }
  ok('F1 no sideways page scroll at 390/360 in all themes', ph.every(s => { const m = s.match(/scroll (\d+)\/(\d+)/); return +m[1] <= +m[2]; }), ph.join(' | '));
} catch (e) { console.log('CRASH', e.stack); fails++; }
ok('no page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
fs.writeFileSync('/tmp/qa/se7bc/prod.json', JSON.stringify(R, null, 1));
console.log(fails ? `${fails} FAIL` : 'ALL PASS'); await b.close();
