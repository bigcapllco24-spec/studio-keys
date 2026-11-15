// SE-7b dev tool: sweeps analysis knobs on cached songs (see ana-node.mjs). Usage: node tools/ana-sweep.mjs DIR '[{...},{...}]'
import fs from 'fs'; import path from 'path'; import vm from 'vm';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), DIR = process.argv[2], SETS = JSON.parse(process.argv[3] || '[{}]');
const { anaJob } = vm.runInNewContext(fs.readFileSync(path.join(root, 'src/dsp.js'), 'utf8') + fs.readFileSync(path.join(root, 'src/analyse.js'), 'utf8') + ';({anaJob})', { performance, Math, console });
const mod = (a, n) => ((a % n) + n) % n, relKey = k => k.mode === 'major' ? { tonic: mod(k.tonic + 9, 12), mode: 'minor' } : { tonic: mod(k.tonic + 3, 12), mode: 'major' };
const cls = x => x && x.root != null ? x.root + ':' + (x.q === 'min' || x.q === 'm7' ? 'min' : 'maj') : 'N', chordOk = (c, t) => c && c.q === '5' ? c.root === t.root : cls(c) === cls(t);
const jobs = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4))).map(f => { const ci = parseInt(f.slice(4)), T = JSON.parse(fs.readFileSync(path.join(DIR, f))), raw = fs.readFileSync(path.join(DIR, `case${ci}.i16`)), i16 = new Int16Array(raw.buffer, raw.byteOffset, raw.length >> 1);
  const j = anaJob(Float32Array.from(i16, v => v / 32767), 22050); while (!j.step(1e9)); return { ci, T, j }; });
const grade = (T, res) => { const { off, spb, plan, secs } = T, bars = Math.floor((secs - off) / (4 * spb)), aspb = 60 / res.bpm; let ok = 0, tot = 0;
  for (let k = 8; k < bars; k++) { const tm = off + (k * 4 + 2) * spb, bb = (tm - res.downbeat) / aspb, ch = res.chords.find(c => bb >= c.b && bb < c.b + c.d); tot++; if (chordOk(ch, plan[(k - 8) % plan.length])) ok++; }
  const k = res.key, tk = T.key, same = k && k.tonic === tk.tonic && k.mode === tk.mode, rk = relKey(tk), d = k ? mod(k.tonic - tk.tonic, 12) : -1;
  const rel = ((res.downbeat - off) / spb) % 4; return { same, near: !same && k && ((rk.tonic === k.tonic && rk.mode === k.mode) || (k.mode === tk.mode && (d === 5 || d === 7))), ch: ok / tot, bpm: Math.abs(res.bpm - T.bpm) < 0.5, db: Math.abs(rel - Math.round(rel)) * spb < 0.06 && mod(Math.round(rel), 4) === 0 }; };
for (const P of SETS) { const g = jobs.map(o => grade(o.T, o.j.refinish(P))), n = g.length;
  console.log(`${JSON.stringify(P).padEnd(70)} exact ${g.filter(x => x.same).length}/${n} near ${g.filter(x => x.near).length} · chords ${Math.round(g.reduce((a, x) => a + x.ch, 0) / n * 100)}% min ${Math.round(Math.min(...g.map(x => x.ch)) * 100)}% · bpm ${g.filter(x => x.bpm).length} · db ${g.filter(x => x.db).length} · per case ${g.map(x => (x.same ? 'K' : x.near ? 'k' : 'x') + Math.round(x.ch * 100) + (x.db ? '' : '*')).join(' ')}`); }
