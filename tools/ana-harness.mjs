// SE-7b dev harness: renders 12 of our own songs (12 keys, both modes, 8+ styles, with and without melody) through the
// offline renderer, lays each out as a ~3-minute song (a short silence, an 8-bar drums-only intro, then the full loop
// repeated) and runs analyseAudio on it. Reports exact key, chords correct per bar (root + major/minor), BPM error,
// downbeat and time per song. Dev only (qa-tester turns it into tests/keys.mjs).
// Usage: SK_NODE_MODULES=/tmp/sk-test/node_modules node tools/ana-harness.mjs [index.html] [--secs 180] [--only 3] [--noworker] [--json out.json]
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire(process.env.SK_NODE_MODULES ? path.join(process.env.SK_NODE_MODULES, 'x.js') : import.meta.url);
const pc = require('puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const target = args[0] && !args[0].startsWith('--') ? args[0] : 'file://' + path.join(root, 'index.html');
const DUMP = flag('--dump', null), SECS = +flag('--secs', 180), ONLY = flag('--only', null), NOWORKER = args.includes('--noworker'), JSON_OUT = flag('--json', null);
const chrome = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const CASES = [
  { style: 'house', key: 'C minor', mel: false }, { style: 'techno', key: 'F# minor', mel: true },
  { style: 'hiphop', key: 'D minor', mel: false }, { style: 'lofi', key: 'E♭ major', mel: true },
  { style: 'trap', key: 'G minor', mel: true }, { style: 'pop', key: 'A major', mel: false },
  { style: 'melodichouse', key: 'B♭ minor', mel: true }, { style: 'afro', key: 'E minor', mel: false },
  { style: 'pop', key: 'F major', mel: true }, { style: 'rock', key: 'D major', mel: false },
  { style: 'house', key: 'B major', mel: true }, { style: 'techno', key: 'G# minor', mel: false },
];
const b = await pc.launch({ executablePath: chrome, headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(target, { waitUntil: 'load', timeout: 60000 }); await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const ap = document.querySelector('#audioPill'); if (ap) ap.click(); if (window.ASSIST) ASSIST.voice = false; });
const rows = [];
for (let ci = 0; ci < CASES.length; ci++) {
  if (ONLY != null && ci !== +ONLY) continue;
  const c = CASES[ci];
  const r = await p.evaluate(async (c, SECS, NOWORKER, ci, DUMP) => {
    { let sd = 1234567 + ci * 7919; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; }; }
    PROJ = newProject(); setBars(8);
    runActions([{ type: 'style', style: c.style }, { type: 'key', key: c.key }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]);
    const truthKey = keyStatus().key, plan = chordPlan().plan.map(x => { const iv = mod(x.pcs[1] - x.pcs[0], 12); return { root: x.root, q: iv === 3 ? 'min' : 'maj' }; });
    if (c.mel) runActions([{ type: 'add_melody' }]);
    await new Promise(r => setTimeout(r, 1200));
    const bpm = CTRL.bpm, L = PROJ.bars * 4, spb = 60 / bpm, sr = 44100;
    const drums = PROJ.tracks.filter(t => t.role === 'drums');
    const [dl, dr] = await renderAudio(drums, bpm, L, { context: PROJ.tracks });
    const [fl, fr] = await renderAudio(PROJ.tracks, bpm, L);
    const off = 0.31, total = Math.round(SECS * sr), A = new AudioContext({ sampleRate: sr }), buf = A.createBuffer(2, total, sr);
    const L0 = buf.getChannelData(0), R0 = buf.getChannelData(1), o0 = Math.round(off * sr), n = dl.length;
    let pk = 0; for (let i = o0, j = 0; i < total; i++, j++) { const loop = Math.floor(j / n), k = j % n, srcL = loop === 0 ? dl : fl, srcR = loop === 0 ? dr : fr; L0[i] = srcL[k] || 0; R0[i] = srcR[k] || 0; pk = Math.max(pk, Math.abs(L0[i])); }
    const t0 = performance.now(); const res = await analyseAudio(buf, { noWorker: NOWORKER }); const ms = performance.now() - t0;
    A.close();
    let dump = null; if (DUMP) { const x = await anaResample(buf); const i16 = new Int16Array(x.length); for (let i = 0; i < x.length; i++) i16[i] = Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767)));
      const u8 = new Uint8Array(i16.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); dump = { audio: btoa(bin), truth: { style: c.style, mel: c.mel, key: truthKey, plan, off, bpm, spb, secs: SECS } }; }
    /* grade the chords: the middle of every bar after the intro */
    const bars = Math.floor((SECS - off) / (4 * spb)), aspb = 60 / res.bpm; let ok = 0, tot = 0, rootOk = 0; const miss = [];
    const name = x => x && x.root != null ? PC_NAMES[x.root] + (x.q === 'min' || x.q === 'm7' ? 'm' : '') : 'N';
    const cls = x => x && x.root != null ? x.root + ':' + (x.q === 'min' || x.q === 'm7' ? 'min' : 'maj') : 'N';
    for (let k = 8; k < bars; k++) { const tm = off + (k * 4 + 2) * spb, bb = (tm - res.downbeat) / aspb; const ch = res.chords.find(x => bb >= x.b && bb < x.b + x.d); const tr = plan[(k - 8) % plan.length]; tot++;
      if (cls(ch) === cls(tr)) ok++; else if (miss.length < 6) miss.push(`bar ${k + 1}: ${name(ch)} for ${name(tr)}`); if (ch && ch.root === tr.root) rootOk++; }
    /* intro bars should read "no chord" */
    let introN = 0; for (let k = 0; k < 8; k++) { const tm = off + (k * 4 + 2) * spb, bb = (tm - res.downbeat) / aspb; const ch = res.chords.find(x => bb >= x.b && bb < x.b + x.d); if (!ch || ch.root == null) introN++; }
    /* downbeat: the analysed bar line should land on a true bar line (within 60 ms) */
    const db = res.downbeat, rel = ((db - off) / spb) % 4, dbOk = Math.abs(rel - Math.round(rel)) * spb < 0.06 && Math.round(rel) % 4 === 0;
    const k = res.key, same = k && k.tonic === truthKey.tonic && k.mode === truthKey.mode, relk = k && !same && relKey(truthKey).tonic === k.tonic && relKey(truthKey).mode === k.mode,
      fifth = k && !same && k.mode === truthKey.mode && (mod(k.tonic - truthKey.tonic, 12) === 7 || mod(k.tonic - truthKey.tonic, 12) === 5);
    return { style: c.style, truth: keyName(truthKey), got: k ? keyName(k) : 'none', level: k ? k.level : 0, alt: k ? keyName(k.alt) : '', dj: res.djKey, same, rel: relk, fifth, bpm, gotBpm: res.bpm, bpmConf: res.bpmConf,
      chordsPct: Math.round(ok / tot * 100), rootPct: Math.round(rootOk / tot * 100), introN, dbOk, db: res.downbeat, ms: Math.round(ms), resample: res.ms.resample, mel: c.mel, peak: Math.round(pk * 1000) / 1000,
      how: res.how, loop: res.loop ? res.loop.bars + ' bars from bar ' + (res.loop.start + 1) + ': ' + res.loop.chords.map(name).join(' ') : 'none', truthLoop: plan.map(name).join(' '), miss, tuning: res.tuning, nChords: res.chords.length, dump };
  }, c, SECS, NOWORKER, ci, !!DUMP);
  if (r.dump) { fs.mkdirSync(DUMP, { recursive: true }); fs.writeFileSync(path.join(DUMP, `case${ci}.i16`), Buffer.from(r.dump.audio, 'base64')); fs.writeFileSync(path.join(DUMP, `case${ci}.json`), JSON.stringify(r.dump.truth)); delete r.dump; }
  rows.push(r);
  console.log(`${String(ci + 1).padStart(2)} ${r.style.padEnd(13)} ${r.mel ? 'mel' : '   '} key ${r.truth.padEnd(9)} → ${r.got.padEnd(9)} (lvl ${r.level}, or ${r.alt}, DJ ${r.dj}) ${r.same ? 'EXACT' : r.rel ? 'relative' : r.fifth ? 'fifth' : 'WRONG'} · bpm ${r.bpm}→${r.gotBpm} (${r.bpmConf}) · chords ${r.chordsPct}% (roots ${r.rootPct}%) intro N ${r.introN}/8 · downbeat ${r.dbOk ? 'ok' : 'OFF ' + r.db} · ${r.ms} ms`);
  console.log(`     how ${JSON.stringify(r.how)}`); console.log(`     loop ${r.loop} | truth ${r.truthLoop}${r.miss.length ? ' | ' + r.miss.join('; ') : ''}`);
}
const n = rows.length, exact = rows.filter(r => r.same).length, near = rows.filter(r => r.rel || r.fifth).length;
const avgCh = Math.round(rows.reduce((a, r) => a + r.chordsPct, 0) / n), bpmErr = Math.max(...rows.map(r => Math.abs(r.gotBpm - r.bpm))), avgMs = Math.round(rows.reduce((a, r) => a + r.ms, 0) / n), maxMs = Math.max(...rows.map(r => r.ms));
console.log(`\nSUMMARY key exact ${exact}/${n}, relative or fifth ${near}, wrong ${n - exact - near} · chords ${avgCh}% of bars (min ${Math.min(...rows.map(r => r.chordsPct))}%) · max BPM error ${bpmErr} · downbeat ok ${rows.filter(r => r.dbOk).length}/${n} · ${SECS}s song: avg ${avgMs} ms, max ${maxMs} ms${NOWORKER ? ' (main-thread slices)' : ' (Worker)'}`);
if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 5).join(' | '));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(rows, null, 1));
await b.close();
