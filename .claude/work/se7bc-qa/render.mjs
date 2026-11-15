// QA: render 4 of our own songs to 44.1 kHz stereo WAVs (drum intro, then the full loop), with their truth
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const html = process.argv[2], out = '/tmp/qa/se7bc/songs';
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.goto('file://' + html, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const ap = document.querySelector('#audioPill'); if (ap) ap.click(); ASSIST.voice = false; });
const SONGS = [
  { file: 'night-drive', style: 'house', key: 'E minor', bpm: 124, chords: ['Em', 'C', 'G', 'D'], mel: true, intro: 2, loops: 8 },
  { file: 'sunday-pop', style: 'pop', key: 'F major', bpm: 100, chords: ['F', 'C', 'Dm', 'Bb'], mel: true, intro: 1, loops: 6 },
  { file: 'trap-csharp', style: 'trap', key: 'C# minor', bpm: 140, chords: null, mel: false, intro: 1, loops: 8 },
  { file: 'techno-drums', style: 'techno', key: null, bpm: 128, chords: null, mel: false, drumsOnly: true, intro: 0, loops: 8 },
];
function wav(i16, sr) { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + i16.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(i16.length, 40); return Buffer.concat([h, i16]); }
for (const [i, s] of SONGS.entries()) {
  const r = await p.evaluate(async (s, i) => {
    let sd = 777 + i * 31; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    PROJ = newProject(); setBars(4);
    runActions([{ type: 'style', style: s.style }].concat(s.key ? [{ type: 'key', key: s.key }] : [])); setTempo(s.bpm);
    if (s.chords) setChords(s.chords);
    runActions([{ type: 'add_drums' }].concat(s.drumsOnly ? [] : [{ type: 'add_bass' }, { type: 'add_chords' }]).concat(s.mel ? [{ type: 'add_melody' }] : []));
    await new Promise(r => setTimeout(r, 1500));
    const bpm = CTRL.bpm, L = PROJ.bars * 4, sr = 44100;
    const [dl, dr] = await renderAudio(PROJ.tracks.filter(t => t.role === 'drums'), bpm, L, { context: PROJ.tracks });
    const [fl, fr] = await renderAudio(PROJ.tracks, bpm, L);
    const n = dl.length, loops = s.intro + s.loops, total = n * loops, i16 = new Int16Array(total * 2); let pk = 0, ss = 0;
    for (let j = 0; j < total; j++) { const lp = Math.floor(j / n), k = j % n, a = (lp < s.intro ? dl : fl)[k] || 0, c = (lp < s.intro ? dr : fr)[k] || 0; pk = Math.max(pk, Math.abs(a), Math.abs(c)); ss += a * a;
      i16[2 * j] = Math.max(-32767, Math.min(32767, Math.round(a * 32767))); i16[2 * j + 1] = Math.max(-32767, Math.min(32767, Math.round(c * 32767))); }
    const u8 = new Uint8Array(i16.buffer); let bin = ''; for (let q = 0; q < u8.length; q += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(q, q + 0x8000));
    const mel = PROJ.tracks.find(t => t.role === 'melody');
    return { audio: btoa(bin), truth: { key: keyStatus().key ? keyName(keyStatus().key) : null, bpm, chords: chordsText(), sec: total / sr, peakDb: 20 * Math.log10(pk), rmsDb: 10 * Math.log10(ss / total), tracks: PROJ.tracks.map(t => t.name), melody: mel ? mel.events.map(e => ({ n: e.n, b: e.b, d: e.d })) : null } };
  }, s, i);
  fs.writeFileSync(`${out}/${s.file}.wav`, wav(Buffer.from(r.audio, 'base64'), 44100)); fs.writeFileSync(`${out}/${s.file}.json`, JSON.stringify(r.truth));
  console.log(s.file, JSON.stringify({ ...r.truth, melody: r.truth.melody ? r.truth.melody.length + ' notes' : null }));
}
await b.close();
