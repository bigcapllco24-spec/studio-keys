// SE-7b dev check: runs analyseAudio in headless Chrome on songs cached by `ana-harness.mjs --dump DIR`, through the
// Worker and through the main-thread slices, at 44.1 kHz stereo (so the resampling path runs too). Reports the time per
// song, whether both paths agree, and the longest main-thread task while it listens (PerformanceObserver longtask).
// Usage: SK_NODE_MODULES=/tmp/sk-test/node_modules node tools/ana-browser.mjs DIR [N cases]
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const require = createRequire(process.env.SK_NODE_MODULES ? path.join(process.env.SK_NODE_MODULES, 'x.js') : import.meta.url);
const pc = require('puppeteer-core');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), DIR = process.argv[2], NC = +(process.argv[3] || 4);
const chrome = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const b = await pc.launch({ executablePath: chrome, headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'load', timeout: 60000 }); await new Promise(r => setTimeout(r, 2000));
await p.evaluate(() => { window.__long = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(e.duration))).observe({ entryTypes: ['longtask'] }); } catch (e) { } });
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4))).slice(0, NC);
const out = [];
for (const f of files) {
  const ci = parseInt(f.slice(4)), T = JSON.parse(fs.readFileSync(path.join(DIR, f))), b64 = fs.readFileSync(path.join(DIR, `case${ci}.i16`)).toString('base64');
  const r = await p.evaluate(async (b64, T) => {
    const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const i16 = new Int16Array(u8.buffer), A = new AudioContext({ sampleRate: 44100 }), n = i16.length * 2, buf = A.createBuffer(2, n, 44100), L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (let i = 0; i < n; i++) { const a = i16[i >> 1] / 32767, c = (i >> 1) + 1 < i16.length ? i16[(i >> 1) + 1] / 32767 : a, v = i & 1 ? (a + c) / 2 : a; L[i] = v; R[i] = v; }
    A.close();
    const run = async noWorker => { window.__long.length = 0; let ticks = 0, gap = 0, last = performance.now(); const iv = setInterval(() => { const t = performance.now(); gap = Math.max(gap, t - last); last = t; ticks++; }, 10);
      const prog = []; const t0 = performance.now(); const res = await analyseAudio(buf, { noWorker, onProgress: x => prog.push(Math.round(x * 100)) }); const ms = performance.now() - t0; clearInterval(iv);
      return { res, ms: Math.round(ms), longest: Math.round(Math.max(0, ...window.__long)), gap: Math.round(gap), prog: prog.length, last: prog[prog.length - 1] }; };
    const w = await run(false), s = await run(true);
    const strip = x => { const o = Object.assign({}, x); delete o.ms; delete o.how; return JSON.stringify(o); };
    return { style: T.style, truth: keyName(T.key), key: w.res.key ? keyName(w.res.key) + ' (' + w.res.djKey + ')' : 'none', bpm: w.res.bpm, worker: { ms: w.ms, resample: w.res.ms.resample, longest: w.longest, gap: w.gap, prog: w.prog }, slices: { ms: s.ms, longest: s.longest, gap: s.gap, prog: s.prog }, same: strip(w.res) === strip(s.res), bytes: JSON.stringify(anaCache(w.res, buf)).length, name: anaChordName(w.res.chords.find(c => c.root != null)) };
  }, b64, T);
  out.push(r); console.log(JSON.stringify(r));
}
const avg = k => Math.round(out.reduce((a, r) => a + r[k].ms, 0) / out.length);
console.log(`SUMMARY ${out.length} songs (${JSON.parse(fs.readFileSync(path.join(DIR, files[0]))).secs}s, 44.1 kHz stereo): Worker avg ${avg('worker')} ms (longest main-thread task ${Math.max(...out.map(r => r.worker.longest))} ms), slices avg ${avg('slices')} ms (longest task ${Math.max(...out.map(r => r.slices.longest))} ms) · same result both ways ${out.filter(r => r.same).length}/${out.length} · cache ${Math.max(...out.map(r => r.bytes))} bytes max${errs.length ? ' · PAGE ERRORS ' + errs.join(' | ') : ''}`);
await b.close();
