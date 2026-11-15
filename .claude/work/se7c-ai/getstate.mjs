import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.goto('file://' + (process.argv[2] || '/home/claude/studio-keys/index.html'), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
const out = await p.evaluate(() => { PROJ = newProject(); setBars(4); runActions([{ type: 'vibe', ref: 'Ben Böhmer' }, { type: 'key', key: 'D minor' }, { type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]);
  const ev = []; [67, 70, 74, 72, 70, 69, 67, 62].forEach((n, i) => ev.push({ b: i * 1.5, d: 1, n, v: .8 })); PROJ.tracks.push(makeTrack({ role: 'melody', inst: 'piano', name: 'My loop', events: ev }));
  const t = makeTrack({ kind: 'audio', role: 'voice', name: 'Night Drive', inst: null, start: 0, trim: 0, events: [] }); t.ana = { v: ANA_VER, bpm: 124, bpmConf: .6, downbeat: 0, djKey: '9A', key: { tonic: 4, mode: 'minor', conf: .1, level: 3, alt: { tonic: 7, mode: 'major' }, why: 'the bass lands on E', cands: [] }, chords: [{ b: 0, d: 4, root: 4, q: 'min', conf: .9 }, { b: 4, d: 4, root: 0, q: 'maj', conf: .9 }, { b: 8, d: 4, root: 7, q: 'maj', conf: .9 }, { b: 12, d: 4, root: 2, q: 'maj', conf: .9 }], loop: { start: 0, bars: 4, conf: .9 }, bassRoots: [] }; PROJ.tracks.push(t);
  const st = projectState(); const instruments = ORDER.map(id => { const I = INST.get(id); return `${id}: ${I.name} (${I.cat})`; }); return { st, instruments }; });
fs.writeFileSync('state.json', JSON.stringify(out)); console.log(JSON.stringify(out.st).length, out.instruments.join('; ').length); await b.close();
