// Sung-notes lab (UX-14, 21 Nov 2026): sings synthetic takes into the built page and measures notes in vs notes out.
// node tests/sung-lab.mjs [url] [--json out.json] [--only 'regex on scenario names']
// Each scenario synthesizes a voice-like take inside the page (harmonics, vibrato, slow drift, a scoop into each note,
// onsets off the grid by up to ±35 ms, breaths, optional laptop-mic low cut), feeds it through the real take pipeline
// (TAKE.finish: audioToNotes, quantize, part shaping) and compares the track's notes with what was "sung".
// Not part of check.sh (smoke.mjs runs a short version). Prints one line per scenario plus the misses.
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire((process.env.SK_NODE_MODULES || '/tmp/sk-test/node_modules') + '/x.js'); const pc = require('puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), ji = args.indexOf('--json'), jsonOut = ji >= 0 ? args.splice(ji, 2)[1] : null, oi = args.indexOf('--only'), only = oi >= 0 ? args.splice(oi, 2)[1] : null;
const url = args[0] || 'file://' + path.join(root, 'index.html');
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => localStorage.clear());
await p.goto(url, { waitUntil: 'load', timeout: 90000 }); await new Promise(r => setTimeout(r, 2500));
await p.click('#audioPill').catch(() => {});
await p.addScriptTag({ path: path.join(root, 'tests/sung-synth.js') });
const res = await p.evaluate(async (only) => { ASSIST.voice = false; ASSIST.say = () => {}; return await window.__sungLab(only ? window.__sungScenarios.map(x => x[0]).filter(n => new RegExp(only).test(n)) : undefined); }, only);
for (const r of res) console.log(`${r.name.padEnd(34)} in ${String(r.in).padStart(2)} out ${String(r.out).padStart(2)} · pitch ${r.pitchOk}/${r.matched} exact · onset err ${r.onsetErr} beats · missing ${r.missing} extra ${r.extra}${r.note ? ' · ' + r.note : ''}\n    ${r.diff}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(res, null, 1));
if (errs.length) console.log('page errors:', errs.slice(0, 3).join(' | '));
await b.close();
