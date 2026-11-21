/* Sung-take synthesizer and scenarios (UX-14). Loaded into the built page by tests/sung-lab.mjs and tests/smoke.mjs.
   __sungSynth(notes, o) -> Float32Array: a voice-like take. notes: [{b (beat), len (beats), n (MIDI), legato}].
   o: bpm, sr, bars, seed, jitter (s, onsets off the grid by up to ±jitter), vib (cents), drift (cents), flat (cents, the
   singer's own tuning), scoop (cents below the note at its start), hpf (Hz, a laptop mic's low cut), weakF0 (quiet fundamental).
   __sungRun(part, notes, o) runs the take through TAKE.finish and returns the new track's events.
   __sungLab() runs every scenario and scores it. */
(function(){
  const rnd = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function synth(notes, o) {
    const sr = o.sr, s = 60 / o.bpm, len = Math.round(o.bars * 4 * s * sr), x = new Float32Array(len), R = rnd(o.seed || 7);
    const segs = notes.map((e, i) => { const j = (o.jitter || 0) * (2 * R() - 1); return { e, t0: e.b * s + (e.legato && i ? 0 : j), lvl: 0.55 + 0.45 * R() }; });
    segs.forEach((g, i) => { const nx = segs[i + 1]; g.t1 = nx && nx.e.legato ? nx.t0 : g.t0 + g.e.len * s * (g.e.legato || (nx && nx.e.legato) ? 1 : 0.8); });
    let ph = 0, drift = 0, hp1 = 0, hp2 = 0, px1 = 0, px2 = 0; const a = o.hpf ? Math.exp(-2 * Math.PI * o.hpf / sr) : 0;
    for (let i = 0, k = 0; i < len; i++) {
      const t = i / sr; while (k < segs.length - 1 && t >= segs[k].t1 && t >= segs[k + 1].t0) k++;
      const g = segs[k]; let y = 0;
      if (t >= g.t0 && t < g.t1 + 0.04) {
        const dt = t - g.t0, prev = segs[k - 1];
        if (i % 480 === 0) drift = Math.max(-1, Math.min(1, drift + (R() - 0.5) * 0.3));
        let c = (o.flat || 0) + (o.drift || 0) * drift + (o.vib || 0) * Math.sin(2 * Math.PI * 5.5 * dt) * Math.min(1, Math.max(0, (dt - 0.12) / 0.15));
        if (g.e.legato && prev) { if (dt < 0.05) c += (prev.e.n - g.e.n) * 100 * (1 - dt / 0.05); } else if (dt < 0.06) c -= (o.scoop || 0) * (1 - dt / 0.06);
        const f = 440 * Math.pow(2, (g.e.n - 69 + c / 100) / 12); ph += f / sr; if (ph > 1e6) ph -= 1e6;
        const env = (g.e.legato && prev ? 1 : Math.min(1, dt / 0.025)) * Math.min(1, Math.max(0, (g.t1 + 0.04 - t) / 0.04));
        for (let h = 1; h <= 14; h++) { const fh = f * h; if (fh > sr / 2.2) break; const am = (h === 1 && o.weakF0 ? 0.3 : 1 / Math.pow(h, 1.1)) * (1 + 1.5 * Math.exp(-Math.pow((fh - 700) / 300, 2)));
          y += am * Math.sin(2 * Math.PI * ph * h); }
        y *= 0.12 * env * g.lvl;
      }
      y += (R() - 0.5) * 0.004; /* room and mic noise */
      if (a) { const y1 = a * (hp1 + y - px1); px1 = y; hp1 = y1; const y2 = a * (hp2 + y1 - px2); px2 = y1; hp2 = y2; y = y2; }
      x[i] = y;
    }
    return x;
  }
  async function run(part, notes, o) {
    await newSong('Sung lab'); setTempo(o.bpm); PROJ.bars = o.bars; PROJ.key = o.key || null; PROJ.style = o.style || null; if ($('#keySel')) $('#keySel').value = PROJ.key ? `${PROJ.key.tonic}:${PROJ.key.mode}` : '';
    if (o.drums) runActions([{ type: 'add_drums', style: 'house', seed: 11 }]);
    if (o.keyAfterDrums) PROJ.key = o.key;
    const c = ensureAudio(), pcm = synth(notes, Object.assign({ sr: c.sampleRate }, o));
    const raw = audioToNotes(makeBuf(pcm.slice(), c.sampleRate));
    TR.t0 = 5; TAKE.part = part; TAKE.chunks = [{ t: 5, d: pcm }]; TAKE.notes = []; TAKE.open = null; TAKE.micByTake = false; LOOP.state = 'take';
    TAKE.finish(); loopStop();
    const t = PROJ.tracks.find(t => t.take === part); return { ev: t ? t.events.map(e => ({ b: e.b, d: e.d, n: e.n })) : [], raw: raw.map(r => ({ b: r.t0 / (60 / o.bpm), n: r.n })), key: PROJ.key };
  }
  const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], nm = n => NN[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
  function score(name, part, notes, out, o) {
    if (part === 'chords') {
      const by = new Map(); out.ev.forEach(e => { if (!by.has(e.b)) by.set(e.b, []); by.get(e.b).push(e.n); });
      const chords = [...by.entries()].map(([b, ns]) => { const pcs = [...new Set(ns.map(n => ((n % 12) + 12) % 12))]; const root = pcs.find(r => pcs.every(q => [0, 3, 4, 7].includes(((q - r) % 12 + 12) % 12))); return { b, root, ns }; });
      let ok = 0, m = 0, err = 0; const used = new Set(), diff = [];
      notes.forEach(e => { const c = chords.find(c => !used.has(c) && Math.abs(c.b - e.b) <= 0.5); if (!c) { diff.push(`${e.b}:${nm(e.n)} missing`); return; } used.add(c); m++; err += Math.abs(c.b - e.b);
        if (c.root === ((e.n % 12) + 12) % 12) ok++; else diff.push(`${e.b}:${nm(e.n)}→${c.root == null ? '?' : NN[c.root]} chord (${c.ns.map(nm).join(' ')})`); });
      return { name, in: notes.length, out: chords.length, matched: m, pitchOk: ok, onsetErr: m ? +(err / m).toFixed(3) : null, missing: notes.length - m, extra: chords.length - used.size, diff: diff.join(', ') || 'all chords on the sung roots' };
    }
    const shift = o.expectShift || 0, used = new Set(), diff = []; let m = 0, ok = 0, err = 0, okRaw = 0;
    notes.forEach(e => { let best = null; out.ev.forEach((f, i) => { if (used.has(i)) return; const d = Math.abs(f.b - e.b); if (d <= 0.375 && (!best || d + (f.n === e.n + shift ? 0 : 0.2) < best.s)) best = { i, s: d + (f.n === e.n + shift ? 0 : 0.2), f, d }; });
      if (!best) { diff.push(`${e.b}:${nm(e.n)} missing`); return; } used.add(best.i); m++; err += best.d; if (best.f.n === e.n + shift) ok++; else diff.push(`${e.b}:${nm(e.n)}→${nm(best.f.n)}`); if (best.d > 0.13) diff.push(`${e.b}:${nm(e.n)} at ${best.f.b}`);
      if (out.raw.some(r => Math.abs(r.b - e.b) < 0.4 && r.n === e.n)) okRaw++; });
    out.ev.forEach((f, i) => { if (!used.has(i)) diff.push(`extra ${f.b}:${nm(f.n)}`); });
    return { name, in: notes.length, out: out.ev.length, matched: m, pitchOk: ok, onsetErr: m ? +(err / m).toFixed(3) : null, missing: notes.length - m, extra: out.ev.length - used.size, note: `detector heard ${okRaw}/${notes.length} right`, diff: diff.join(', ') || 'all as sung' };
  }
  /* the takes (124 BPM, 4 bars) */
  const BASS = [[0, .75, 40], [1, .5, 40], [1.5, .5, 43], [2.5, 1, 45], [4, .75, 42], [5, .5, 40], [6, 1.5, 43], [8, .5, 45], [8.75, .5, 45], [9.5, 1, 44], [11, .75, 43], [12, 1, 40], [13.5, .5, 42], [14, 1.5, 45]].map(([b, len, n]) => ({ b, len, n }));
  const OFFBEAT = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5].map((b, i) => ({ b, len: 0.35, n: [45, 45, 45, 48, 41, 41, 41, 43, 45, 45, 45, 48, 43, 43, 40, 43][i] }));
  const MEL = [[0, 1, 62], [1, .5, 64, 1], [1.5, .5, 66, 1], [2, 1.5, 69, 1], [4, .5, 69], [4.5, .5, 71, 1], [5, 1, 69, 1], [6, 1, 66, 1], [8, .75, 64], [8.75, .75, 62, 1], [9.5, .5, 61, 1], [10, 2, 62, 1], [12.5, .5, 66], [13, .5, 64, 1], [13.5, 2, 62, 1]].map(([b, len, n, l]) => ({ b, len, n, legato: !!l }));
  const ROOTS_AM = [[0, 57], [4, 53], [8, 48], [12, 55]].map(([b, n]) => ({ b, len: 3.6, n }));
  const ROOTS_D = [[0, 50], [4, 45], [8, 47], [12, 54]].map(([b, n]) => ({ b, len: 3.6, n }));
  const base = { bpm: 124, bars: 4, jitter: 0.035, vib: 30, drift: 12, scoop: 60 };
  const SC = [
    ['bass E2-A2, song key E minor', 'bass', BASS, { key: { tonic: 4, mode: 'minor' } }],
    ['bass E2-A2, song key A minor (vibe)', 'bass', BASS, { key: { tonic: 9, mode: 'minor' } }],
    ['bass E2-A2, no key yet', 'bass', BASS, {}],
    ['bass, laptop mic (low cut 150 Hz)', 'bass', BASS, { key: { tonic: 4, mode: 'minor' }, hpf: 150, weakF0: true, seed: 3 }],
    ['bass sung an octave up (E3-A3)', 'bass', BASS.map(e => Object.assign({}, e, { n: e.n + 12 })), { key: { tonic: 4, mode: 'minor' }, expectShift: -12, seed: 5 }],
    ['offbeat house bass, short notes', 'bass', OFFBEAT, { key: { tonic: 9, mode: 'minor' }, seed: 9 }],
    ['melody D major legato, no key', 'melody', MEL, {}],
    ['melody D major, song key A minor', 'melody', MEL, { key: { tonic: 9, mode: 'minor' } }],
    ['melody, singer 35c flat, wide vibrato', 'melody', MEL, { key: { tonic: 2, mode: 'major' }, flat: -35, vib: 45, seed: 13 }],
    ['chord roots Am F C G, key A minor', 'chords', ROOTS_AM, { key: { tonic: 9, mode: 'minor' } }],
    ['chord roots D A Bm F#m, key A minor', 'chords', ROOTS_D, { key: { tonic: 9, mode: 'minor' } }],
    ['chord roots D A Bm F#m, no key', 'chords', ROOTS_D, {}],
  ];
  window.__sungSynth = synth; window.__sungRun = run; window.__sungScore = score; window.__sungScenarios = SC; window.__sungBase = base;
  window.__sungLab = async (only) => { const out = []; for (const [name, part, notes, o] of SC) { if (only && !only.includes(name)) continue; const oo = Object.assign({}, base, o); const r = await run(part, notes, oo); const sc = score(name, part, notes, r, oo); sc.key = r.key ? NN[r.key.tonic] + ' ' + r.key.mode : 'none'; out.push(sc); } return out; };
})();
