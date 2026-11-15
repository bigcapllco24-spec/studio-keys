// Take lab (QA, UX-10 check, 15 Nov 2026): sings takes into the built page and measures the recorder.
// node tests/take-lab.mjs '<json opts>'   e.g. '{"url":"file:///<repo>/index.html","name":"x","busy":"light","parts":["bass","bass","again","chords","melody","voice"]}'
// opts: url, name, noWorklet (force the ScriptProcessor fallback), busy: none|light|heavy (main-thread stalls), singer: file (fake mic = wav) | synth
//   (a singer inside the audio clock, notes on beats 0,2,4… or pat:[[beat,len],…]), swing ('more swing' first), outLat (fake output latency, s),
//   bars, wav (fake mic file), dbg (per-block positions), edShot (screenshot of the editor), out (folder for json and screenshots)
// Not part of check.sh (it takes minutes). Prints notes / doubled / holes / onset offsets per take.
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire((process.env.SK_NODE_MODULES || '/tmp/sk-test/node_modules') + '/x.js'); const pc = require('puppeteer-core');
const o = Object.assign({ busy: 'none', singer: 'file', parts: ['bass', 'bass', 'bass', 'bass', 'bass'], bars: 4, out: '/tmp/qa/take-lab' }, JSON.parse(process.argv[2] || '{}'));
o.shots = o.shots || o.out; fs.mkdirSync(o.shots, { recursive: true });
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + (o.wav || path.join(root, 'tests/fixtures/sing.wav'))] });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1000 });
const errs = [], logs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text().slice(0, 200)); });
await p.evaluateOnNewDocument(o => {
  localStorage.clear();
  if (o.noWorklet) { try { delete window.AudioWorkletNode; } catch (e) {} window.AudioWorkletNode = undefined; }
  if (o.outLat != null) Object.defineProperty(AudioContext.prototype, 'outputLatency', { get() { return o.outLat; }, configurable: true });
  if (o.singer === 'synth') {
    navigator.mediaDevices.getUserMedia = async () => {
      const c = A.ctx, dst = c.createMediaStreamDestination();
      const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.002;
      const ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true; ns.connect(dst); ns.start();
      window.__sung = []; let last = -1;
      setInterval(() => { if (LOOP.state !== 'counting' || TR.t0 === last) return; last = TR.t0; const s = spb(), lat = typeof TAKE_REC !== 'undefined' ? TAKE_REC.latency() : 0.02;
        const pit = [45, 48, 52, 43, 45, 50, 47, 40], pat = o.pat || Array.from({ length: Math.floor(PROJ.bars * 2) }, (_, k) => [k * 2, 1.5]), n = pat.length, rec = { t0: TR.t0, lat, spb: s, notes: [] };
        for (let k = 0; k < n; k++) { const t = TR.t0 + pat[k][0] * s + lat, f = 440 * Math.pow(2, (pit[k % 8] - 69) / 12), D = pat[k][1];
          const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; const lp = c.createBiquadFilter(); lp.frequency.value = 900; const g = c.createGain(); g.gain.value = 0;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.01); g.gain.setValueAtTime(0.5, t + D * s - 0.03); g.gain.linearRampToValueAtTime(0, t + D * s);
          os.connect(lp).connect(g).connect(dst); os.start(t); os.stop(t + D * s + 0.05); rec.notes.push({ beat: pat[k][0], n: pit[k % 8] }); }
        window.__sung.push(rec); }, 10);
      return dst.stream; };
  }
}, o);
const W = ms => new Promise(r => setTimeout(r, ms)), E = (f, ...a) => p.evaluate(f, ...a);
const out = { name: o.name, opts: o, takes: [] };
try {
  await p.goto(o.url, { waitUntil: 'load', timeout: 90000 }); await W(2500);
  await p.click('#audioPill').catch(() => {}); await E(() => { ASSIST.voice = false; });
  out.setup = await E(async o => {
    const r = await ASSIST.run('124 bpm drums like Ben Böhmer'); if (o.swing) await ASSIST.run('more swing'); setBars(o.bars); loopStop();
    window.__tk = []; window.__micNotes = 0; const o2 = o; const on0 = window.noteOn; window.noteOn = function (n, v, src) { if (src === 'mic') window.__micNotes++; return on0.apply(this, arguments); };
    const zr = (x, sr) => { let a = 0; while (a < x.length && x[a] === 0) a++; let z = x.length - 1; while (z > a && x[z] === 0) z--; let short = 0, long = 0, shortIn = 0;
      for (let i = a + 1; i < z; i++) { if (x[i] !== 0) continue; let j = i; while (j < z && x[j] === 0) j++; const L = j - i; if (L >= 64 && L <= 0.06 * sr) short++; else if (L > 0.06 * sr) long++; i = j; }
      return { short, long, tailMs: +((x.length - 1 - z) / sr * 1000).toFixed(1), headMs: +(a / sr * 1000).toFixed(1) }; };
    window.__zr = zr;
    window.__a2n = audioToNotes; window.audioToNotes = function (buf) { const r = window.__a2n(buf); const x = buf.getChannelData(0);
      window.__last = { a2n: r.map(n => ({ t0: +n.t0.toFixed(4), t1: +n.t1.toFixed(4), n: n.n })), zeros: zr(x, buf.sampleRate) }; return r; };
    if (typeof TAKE_REC !== 'undefined') { const tk = TAKE_REC.take.bind(TAKE_REC); TAKE_REC.take = function (t0, len) {
      const ch = [...this.chunks].sort((a, b) => a.f - b.f); let gaps = 0, gapSmp = 0, over = 0, dup = 0; for (let i = 1; i < ch.length; i++) { const e = ch[i - 1].f + ch[i - 1].d.length, d = ch[i].f - e; if (d > 0) { gaps++; gapSmp += d; } else if (d < 0) { over++; if (ch[i].f === ch[i - 1].f) dup++; } }
      const f0 = Math.round((t0 + this.latency()) * this.ctx.sampleRate); const dbg = o.dbg ? ch.map(c => { let q = 0; for (let i = 0; i < c.d.length; i++) q += c.d[i] * c.d[i]; return [c.f - f0, +Math.sqrt(q / c.d.length).toFixed(3)]; }) : null; const r = tk(t0, len); window.__rec = { dbg, len, nowF: Math.round(this.ctx.currentTime * this.ctx.sampleRate) - f0, kind: this.kind, chunks: ch.length, blk: ch[0] ? ch[0].d.length : 0, gaps, gapMs: +(gapSmp / this.ctx.sampleRate * 1000).toFixed(1), over, dup, patched: this.holes, lat: +this.latency().toFixed(3), zeros: zr(r, this.ctx.sampleRate) }; return r; }; }
    const fin = TAKE.finish.bind(TAKE); window.__done = 0; TAKE.finish = function () { const t = performance.now(); const r = fin(); window.__finMs = performance.now() - t; window.__done++; return r; };
    const busy = { none: null, light: [35, 4, 25], heavy: [600, 120, 80] }[o.busy];
    if (busy) window.__busy = setInterval(() => { const t = performance.now() + busy[1] + Math.random() * busy[2]; while (performance.now() < t); }, busy[0]);
    return { r, bpm: CTRL.bpm, bars: PROJ.bars, swing: (PROJ.tracks.find(t => t.role === 'drums') || {}).swing, tracks: PROJ.tracks.map(t => t.name) };
  }, o);
  const say = { bass: 'let me sing the bassline', chords: 'let me sing the chords', melody: 'let me sing the melody', voice: 'record a voice note', again: o.againText || 'again' };
  for (let k = 0; k < o.parts.length; k++) {
    const part = o.parts[k];
    await E(s => { window.__last = null; window.__rec = null; window.__mid = null; ASSIST.run(s); }, say[part]);
    let mid = null;
    for (let i = 0; i < 120; i++) { await W(250);
      const st = await E(n => ({ st: LOOP.state, done: window.__done > n }), k);
      if (!mid && st.st === 'take') { await W(1500); mid = await E(() => ({ state: LOOP.state, guide: TAKE_GUIDE, audible: PROJ.tracks.filter(trackAudible).map(t => t.name), mic: MIC.on, micNotes: window.__micNotes, rec: typeof TAKE_REC !== 'undefined' ? TAKE_REC.kind : 'n/a' }));
        if (k === 0) await p.screenshot({ path: `${o.shots}/${o.name}-during-take.png` }); }
      if (st.done) break; }
    await W(600);
    const r = await E((part, k) => {
      const rp = part === 'again' ? (LAST_TAKE.part || 'bass') : part;
      const tr = rp === 'voice' ? PROJ.tracks.filter(t => /^Voice note/.test(t.name)).pop() : PROJ.tracks.find(t => t.take === rp);
      const ev = tr && tr.events ? [...tr.events].sort((a, b) => a.b - b.b) : [];
      let notesSeq = ev; if (rp === 'chords') { const by = {}; ev.forEach(e => (by[e.b] = by[e.b] || []).push(e.n)); notesSeq = Object.keys(by).map(Number).sort((a, b) => a - b).map(b => ({ b, n: by[b].sort().join('.') })); }
      const dbl = notesSeq.filter((e, i) => i && e.n === notesSeq[i - 1].n).length;
      const sungTracks = PROJ.tracks.filter(t => t.take === rp).length, audioTracks = PROJ.tracks.filter(t => t.kind === 'audio').map(t => t.name);
      let voiceZeros = null; if (rp === 'voice' && tr) { const bf = AUD.get(tr.id); if (bf) voiceZeros = window.__zr(bf.getChannelData(0), bf.sampleRate); }
      const sung = window.__sung ? window.__sung[window.__sung.length - 1] : null;
      let timing = null; if (sung && window.__last) { const s = sung.spb, offs = window.__last.a2n.map(x => { const bt = x.t0 / s, k = sung.notes.reduce((a, q) => Math.abs(q.beat - bt) < Math.abs(a - bt) ? q.beat : a, 1e9); return { k, ms: +((x.t0 - k * s) * 1000).toFixed(1) }; });
        const hit = new Set(offs.filter(x => Math.abs(x.ms) < 60).map(x => x.k)); timing = { expected: sung.notes.length, found: offs.length, onBeat: hit.size, offs: offs.map(x => x.ms), evBeats: ev.map(e => e.b + '/' + e.d), raw: window.__last.a2n.map(x => [+(x.t0 / s).toFixed(2), +((x.t1 - x.t0) / s).toFixed(2)]), lat: sung.lat }; }
      const res = { part, rp, state: LOOP.state, n: ev.length, steps: notesSeq.length, dbl, seq: notesSeq.map(e => `${e.n}@${e.b}`).join(' '), sungTracks, audioTracks, micOn: MIC.on, stream: !!MIC.stream, finMs: +(window.__finMs || 0).toFixed(0), rec: window.__rec, a2nZeros: window.__last && window.__last.zeros, a2nCount: window.__last && window.__last.a2n.length, voiceZeros, timing, say: (document.querySelector('#micStatus') || {}).textContent };
      loopStop(); return res; }, part, k);
    r.mid = mid; out.takes.push(r); await W(400);
  }
  await p.screenshot({ path: `${o.shots}/${o.name}-after.png` });
  if (o.edShot) { await E(() => { const t = PROJ.tracks.find(t => t.take === 'bass'); if (t) { openEditor(t.id); $('#editor').scrollIntoView({ block: 'center' }); } }); await W(800); const el = await p.$('#editor'); if (el) await el.screenshot({ path: `${o.shots}/${o.name}-editor.png` }); }
  out.end = await E(() => { if (window.__busy) clearInterval(window.__busy); return { tracks: PROJ.tracks.map(t => `${t.name}${t.kind === 'audio' ? '(audio)' : ''}:${(t.events || []).length}`), micOn: MIC.on, micNotes: window.__micNotes }; });
} catch (e) { out.error = e.message; }
out.errs = errs; out.logs = logs.slice(0, 8);
fs.writeFileSync(`${o.out}/${o.name}.json`, JSON.stringify(out, null, 1));
for (const t of out.takes) console.log(o.name, t.part, `n=${t.n} steps=${t.steps} dbl=${t.dbl}`, 'rec', JSON.stringify(t.rec), 'a2nZ', JSON.stringify(t.a2nZeros), t.timing ? 'timing ' + JSON.stringify(t.timing) : '', t.voiceZeros ? 'voiceZ ' + JSON.stringify(t.voiceZeros) : '', `fin ${t.finMs}ms mic ${t.micOn}`);
console.log(o.name, 'setup', JSON.stringify(out.setup), 'end', JSON.stringify(out.end), 'errs', JSON.stringify(errs), out.error || '');
await b.close();
