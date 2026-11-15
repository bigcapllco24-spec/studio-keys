// Studio Keys key/tempo/chord accuracy check (SE-7b). Run on demand, NOT in check.sh: it renders our own songs offline and
// takes about 3-8 minutes a song headless. Usage: node tests/keys.mjs [--set 2] [--only N] [--secs 180] [--dump DIR] [--quick]
//   1) tools/ana-harness.mjs --check: 12 of our songs (drum intro, then the loop) must read the exact key on >= 10/12 (the rest
//      relative or a fifth away), chords right on >= 80% of bars, BPM exact, under 3 s a song (timing is load-sensitive)
//   2) drums only: a 60 s drum loop in 6 styles must read "no key" (QA 15 Nov: 6/6 read a key on preview-se-7bc)
// --quick skips 1). Exit code 1 if either part fails.
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { spawnSync } from 'child_process';
const nm = process.env.SK_NODE_MODULES || (fs.existsSync('/tmp/sk-test/node_modules/puppeteer-core') ? '/tmp/sk-test/node_modules' : null);
const require = createRequire(nm ? path.join(nm, 'x.js') : import.meta.url); const pc = require('puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), args = process.argv.slice(2);
const target = 'file://' + path.join(root, 'index.html'); let fail = 0;
if (!args.includes('--quick')) {
  const r = spawnSync('node', [path.join(root, 'tools/ana-harness.mjs'), '--check', ...args.filter(a => a !== '--quick')], { stdio: 'inherit', env: Object.assign({}, process.env, nm ? { SK_NODE_MODULES: nm } : {}) });
  if (r.status !== 0) fail++;
}
const chrome = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const b = await pc.launch({ executablePath: chrome, headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.goto(target, { waitUntil: 'load', timeout: 60000 }); await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const ap = document.querySelector('#audioPill'); if (ap) ap.click(); if (window.ASSIST) ASSIST.voice = false; });
for (const style of ['house', 'techno', 'hiphop', 'trap', 'afro', 'dnb']) {
  const r = await p.evaluate(async style => { let sd = 99; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    PROJ = newProject(); setBars(4); runActions([{ type: 'style', style }, { type: 'add_drums' }]); await new Promise(r => setTimeout(r, 800));
    const [l, rr] = await renderAudio(PROJ.tracks, CTRL.bpm, PROJ.bars * 4); const n = l.length, reps = Math.ceil(60 / (n / 44100)), A = new AudioContext({ sampleRate: 44100 }), buf = A.createBuffer(2, n * reps, 44100);
    for (let k = 0; k < reps; k++) { buf.getChannelData(0).set(l, k * n); buf.getChannelData(1).set(rr, k * n); }
    const a = await analyseAudio(buf); A.close(); return { kit: PROJ.tracks[0].inst, bpm: CTRL.bpm, key: a.key ? keyName(a.key) + ' (level ' + a.key.level + ')' : null, got: a.bpm, alt: a.bpmAlt, chords: a.chords.filter(c => c.root != null).length }; }, style);
  const pass = r.key === null && (Math.abs(r.got - r.bpm) < 0.5 || Math.abs((r.alt || 0) - r.bpm) < 0.5);
  console.log(`${pass ? 'PASS' : 'FAIL'} drums only, ${style} (${r.kit}) · key ${r.key || 'none'} · BPM ${r.bpm} → ${r.got}${r.alt ? ' (or ' + r.alt + ')' : ''} · ${r.chords} chord blocks`); if (!pass) fail++;
}
await b.close();
console.log(fail ? 'KEYS FAILED' : 'KEYS OK'); process.exit(fail ? 1 : 0);
