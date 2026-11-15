// QA probes: undo steps of the typed "put those chords", bar 4 split, drum-only clips in several styles, yes-words
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const html = process.argv[2], S = '/tmp/qa/se7bc/songs';
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1000 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + html, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const ap = document.querySelector('#audioPill'); if (ap) ap.click(); ASSIST.voice = false; });
const W = ms => new Promise(r => setTimeout(r, ms)), E = (f, ...a) => p.evaluate(f, ...a);
const say = async (t, w = 400) => { await E(t => ASSIST.run(t), t); await W(w); return E(() => { const b = [...document.querySelectorAll('#asChat .bub.as')].pop(); return b ? b.children[1].textContent : ''; }); };
const imp = async f => { const inp = await p.$('#importFile'); await inp.uploadFile(`${S}/${f}.wav`); await p.waitForFunction(() => { const t = [...PROJ.tracks].reverse().find(t => t.kind === 'audio'); return t && t.ana && !ANA_RUN.has(t.id); }, { timeout: 90000 }); await W(300); };
const snap = () => E(() => ({ tracks: PROJ.tracks.map(t => t.name).join(','), ch: PROJ.chords ? chordsText(PROJ.chords) : '-', key: keyStatusText(), bpm: CTRL.bpm }));
// 1. typed put: what are the two undo steps?
await E(async () => { await newSong('P1'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]); setTempo(120); saveProject(); });
await imp('night-drive');
const ana = await E(() => { const t = PROJ.tracks.find(t => t.kind === 'audio'); return { chords: t.ana.chords.slice(0, 40).map(c => `${c.b}+${c.d}:${chordName(c)}(${(c.conf||0).toFixed(2)})`).join(' '), loop: t.ana.loop, dl: t.ana.downbeat }; });
console.log('ANA night-drive', JSON.stringify(ana));
await E(() => { undoBoundary(); }); await W(300);
let u0 = await E(() => UNDO.stack.length); await say('Keys, what key is this?'); await say('yes', 600); await say('no'); u0 = await E(() => UNDO.stack.length); const r = await say('put those chords on my song', 1200); const u1 = await E(() => UNDO.stack.length);
console.log('typed put:', r, 'steps', u1 - u0, JSON.stringify(await snap()), 'playing', await E(() => LOOP.state), JSON.stringify(await E((u0) => UNDO.stack.slice(u0).concat([UNDO.last]).map(s => { const o = JSON.parse(s); return { n: o.p.tracks.map(t=>t.name).join(','), ch: o.p.chords ? chordsText(o.p.chords) : '-', key: o.p.key && keyName(o.p.key) + ':' + o.p.key.from, bars: o.p.bars, bpm: o.bpm }; }), u0-1)));
await E(() => loopStop()); await W(200);
await E(() => undo()); console.log(' after 1 undo', JSON.stringify(await snap()));

await E(() => { redo(); }); await W(400); console.log(' after redo', JSON.stringify(await snap()));
// the card path
u0 = await E(() => UNDO.stack.length); await p.click('[data-scput]'); await W(800); console.log('card put steps', (await E(() => UNDO.stack.length)) - u0);
await E(() => undo()); await W(300);
// typed without play
u0 = await E(() => UNDO.stack.length); await E(() => runActions([{ type: 'chords_from_audio', to: 'mine' }])); await W(600); console.log('runActions chords_from_audio (no play) steps', (await E(() => UNDO.stack.length)) - u0);
await E(() => undo()); await W(300);
u0 = await E(() => UNDO.stack.length); await E(() => runActions([{ type: 'chords_from_audio', to: 'mine' }, { type: 'transport', do: 'play' }])); await W(1500); console.log('runActions chords_from_audio + play steps', (await E(() => UNDO.stack.length)) - u0, JSON.stringify(await E(() => UNDO.stack.slice(-2).map(s => { const o = JSON.parse(s); return { n: o.p.tracks.length, ch: o.p.chords ? chordsText(o.p.chords) : '-', bars: o.p.bars, bpm: o.bpm }; }))));
await E(() => loopStop());
// 2. bar 4 split: "make bar 4 B minor"
await E(() => undo()); await W(300); await E(() => runActions([{ type: 'chords_from_audio', to: 'mine' }])); await W(300);
console.log('blocks before', await E(() => chordBlocks().map(c => `${c.b}+${c.d}:${chordName(c)}`).join(' ')));
const r2 = await say('make bar 4 B minor'); console.log('bar4:', r2, await E(() => chordBlocks().map(c => `${c.b}+${c.d}:${chordName(c)}`).join(' ')));
// 3. yes words
await E(async () => { await newSong('P3'); runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }]); saveProject(); OFFER.actions = null; });
await imp('night-drive');
for (const w of ['haan', 'theek hai', 'ok', 'nahi']) { await say('what key is this song', 300); const rr = await say(w, 500); console.log(`offer + "${w}":`, rr, '·', await E(() => keyStatusText())); await E(() => { setKey({ tonic: 2, mode: 'minor' }, 'you', { move: false }); }); await W(200); }
// 4. copy the melody
const rc = await say('copy the melody of this song', 800); console.log('copy melody:', rc, await E(() => PROJ.tracks.map(t => t.name).join(',')));
const rc2 = await say('turn night-drive into a melody', 3000); console.log('transcribe melody:', rc2, await E(() => PROJ.tracks.map(t => t.name + ':' + t.events.length).join(',')));
// 5. drums only in several styles
for (const style of ['house', 'techno', 'hiphop', 'trap', 'afro', 'dnb']) {
  const res = await E(async style => { let sd = 99; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    PROJ = newProject(); setBars(4); runActions([{ type: 'style', style }, { type: 'add_drums' }]); await new Promise(r => setTimeout(r, 800));
    const t = PROJ.tracks[0]; const kinds = [...new Set(t.events.map(e => e.n))].join(' ');
    const [l, r] = await renderAudio(PROJ.tracks, CTRL.bpm, PROJ.bars * 4); const n = l.length, reps = Math.ceil(60 / (n / 44100)), A = new AudioContext({ sampleRate: 44100 }), buf = A.createBuffer(2, n * reps, 44100);
    for (let k = 0; k < reps; k++) { buf.getChannelData(0).set(l, k * n); buf.getChannelData(1).set(r, k * n); }
    const a = await analyseAudio(buf); A.close(); return { style, kit: t.inst, notes: kinds, bpm: CTRL.bpm, key: a.key ? keyName(a.key) + ' lvl ' + a.key.level + ' conf ' + a.key.conf.toFixed(2) : null, gotBpm: a.bpm, tonal: a.tonalBeats, chords: a.chords.filter(c => c.root != null).length + '/' + a.chords.length }; }, style);
  console.log('drums only', JSON.stringify(res));
}
console.log('errors', errs.slice(0, 3));
await b.close();
