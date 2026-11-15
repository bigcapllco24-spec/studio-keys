// QA retest: tempo of hip-hop drum loops (and songs) over several seeds
import { createRequire } from 'module';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.goto('file://' + process.argv[2], { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const ap = document.querySelector('#audioPill'); if (ap) ap.click(); ASSIST.voice = false; });
for (const full of [false, true]) for (const seed of [4276, 99, 1, 2, 3, 4, 5, 6]) {
  const r = await p.evaluate(async (seed, full) => { let sd = seed; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    PROJ = newProject(); setBars(4); runActions([{ type: 'style', style: 'hiphop' }, { type: 'add_drums' }].concat(full ? [{ type: 'add_bass' }, { type: 'add_chords' }] : [])); await new Promise(r => setTimeout(r, 800));
    const [l, rr] = await renderAudio(PROJ.tracks, CTRL.bpm, PROJ.bars * 4); const n = l.length, reps = Math.ceil(40 / (n / 44100)), A = new AudioContext({ sampleRate: 44100 }), buf = A.createBuffer(2, n * reps, 44100);
    for (let k = 0; k < reps; k++) { buf.getChannelData(0).set(l, k * n); buf.getChannelData(1).set(rr, k * n); }
    const a = await analyseAudio(buf); A.close(); return { seed, full, bpm: CTRL.bpm, got: a.bpm, alt: a.bpmAlt, conf: a.bpmConf, key: a.key ? keyName(a.key) : null }; }, seed, full);
  console.log(JSON.stringify(r));
}
await b.close();
