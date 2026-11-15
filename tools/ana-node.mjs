// SE-7b dev tool: runs anaJob (src/analyse.js) in Node on songs cached by `ana-harness.mjs --dump DIR`, for fast tuning.
// Usage: node tools/ana-node.mjs DIR [--only N] [--v]
import fs from 'fs'; import path from 'path'; import vm from 'vm';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), DIR = args[0], ONLY = args.includes('--only') ? +args[args.indexOf('--only') + 1] : null, V = args.includes('--v'), PRM = args.includes('--p') ? JSON.parse(args[args.indexOf('--p') + 1]) : null, Q = args.includes('--q');
const code = fs.readFileSync(path.join(root, 'src/dsp.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/analyse.js'), 'utf8') + '\n;({makeFFT, anaJob})';
const { anaJob } = vm.runInNewContext(code, { performance, Math, console });
const mod = (a, n) => ((a % n) + n) % n, PCN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const kn = k => k ? PCN[k.tonic] + ' ' + k.mode : 'none', relKey = k => k.mode === 'major' ? { tonic: mod(k.tonic + 9, 12), mode: 'minor' } : { tonic: mod(k.tonic + 3, 12), mode: 'major' };
const chordOk = (c, t) => c && c.q === '5' ? c.root === t.root : cls(c) === cls(t);
const name = x => x && x.root != null ? PCN[x.root] + (x.q === 'min' || x.q === 'm7' ? 'm' : '') : 'N', cls = x => x && x.root != null ? x.root + ':' + (x.q === 'min' || x.q === 'm7' ? 'min' : 'maj') : 'N';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)));
const rows = [];
for (const f of files) {
  const ci = parseInt(f.slice(4)); if (ONLY != null && ci !== ONLY) continue;
  const T = JSON.parse(fs.readFileSync(path.join(DIR, f))), raw = fs.readFileSync(path.join(DIR, `case${ci}.i16`)), i16 = new Int16Array(raw.buffer, raw.byteOffset, raw.length >> 1), x = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) x[i] = i16[i] / 32767;
  const t0 = performance.now(), j = anaJob(x, 22050, { p: PRM }); while (!j.step(1e9)); const res = j.result(), ms = Math.round(performance.now() - t0);
  const { off, spb, plan, secs } = T, bars = Math.floor((secs - off) / (4 * spb)), aspb = 60 / res.bpm; let ok = 0, tot = 0, rootOk = 0; const miss = [], seq = [];
  const at = k => { const tm = off + (k * 4 + 2) * spb, bb = (tm - res.downbeat) / aspb; return res.chords.find(c => bb >= c.b && bb < c.b + c.d); };
  for (let k = 8; k < bars; k++) { const ch = at(k), tr = plan[(k - 8) % plan.length]; tot++; if (chordOk(ch, tr)) ok++; else if (miss.length < 5) miss.push(`b${k + 1}:${name(ch)}/${name(tr)}`); if (ch && ch.root === tr.root) rootOk++; }
  for (let k = 0; k < 20; k++) seq.push(name(at(k)));
  let introN = 0; for (let k = 0; k < 8; k++) { const ch = at(k); if (!ch || ch.root == null) introN++; }
  const rel = ((res.downbeat - off) / spb) % 4, dbOk = Math.abs(rel - Math.round(rel)) * spb < 0.06 && mod(Math.round(rel), 4) === 0;
  const k = res.key, tk = T.key, same = k && k.tonic === tk.tonic && k.mode === tk.mode, relk = k && !same && relKey(tk).tonic === k.tonic && relKey(tk).mode === k.mode, d = k ? mod(k.tonic - tk.tonic, 12) : -1, fifth = k && !same && k.mode === tk.mode && (d === 7 || d === 5);
  const r = { ci, style: T.style, mel: T.mel, same, relk, fifth, chords: Math.round(ok / tot * 100), roots: Math.round(rootOk / tot * 100), bpmErr: Math.abs(res.bpm - T.bpm), dbOk, introN, ms };
  rows.push(r);
  if (!Q) console.log(`${String(ci + 1).padStart(2)} ${T.style.padEnd(13)}${T.mel ? 'mel' : '   '} ${kn(tk).padEnd(9)}→ ${kn(k).padEnd(9)} lvl ${k && k.level} or ${k && kn(k.alt)} ${same ? 'EXACT' : relk ? 'relative' : fifth ? 'fifth' : 'WRONG'} · bpm ${T.bpm}→${res.bpm} (${res.bpmConf}) · chords ${r.chords}% (roots ${r.roots}%) · intro N ${introN}/8 · db ${dbOk ? 'ok' : 'OFF ' + res.downbeat} · ${ms} ms`);
  if (V) { console.log('    truth', plan.map(name).join(' '), '| got', seq.join(' '), '| miss', miss.join(' ')); console.log('    bass ', res.bassRoots.slice(0, 12).map(b => b.root == null ? 'N' : PCN[b.root] + 'x' + b.d / 4).join(' '), '| loop', res.loop ? res.loop.bars + '@' + res.loop.start + ' ' + res.loop.chords.map(name).join(' ') : '-', '| how', JSON.stringify(res.how)); }
}
const n = rows.length;
console.log(`SUMMARY exact ${rows.filter(r => r.same).length}/${n}, rel/fifth ${rows.filter(r => r.relk || r.fifth).length} · chords avg ${Math.round(rows.reduce((a, r) => a + r.chords, 0) / n)}% min ${Math.min(...rows.map(r => r.chords))}% · bpm ok ${rows.filter(r => r.bpmErr < 0.5).length}/${n} · db ok ${rows.filter(r => r.dbOk).length}/${n} · intro N ${rows.reduce((a, r) => a + r.introN, 0)}/${8 * n} · avg ${Math.round(rows.reduce((a, r) => a + r.ms, 0) / n)} ms`);
