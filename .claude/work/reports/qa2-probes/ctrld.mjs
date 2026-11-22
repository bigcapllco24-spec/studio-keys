import { createRequire } from 'module'; const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
try { const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1100 }); await p.goto('file:///home/claude/sk-qa2/index.html', { waitUntil: 'load', timeout: 60000 }); await new Promise(r => setTimeout(r, 2500));
  const E = (f, ...a) => p.evaluate(f, ...a);
  for (const slow of [1, 2, 3, 4]) { await p.emulateCPUThrottling(slow);
    const r = await E(async () => { await newSong('ctrl d'); ASSIST.voice = false; runActions([{ type: 'add_drums', style: 'house', seed: 1 }, { type: 'add_chords', seed: 2 }, { type: 'add_bass', seed: 3 }, { type: 'add_melody', seed: 4 }, { type: 'add_melody', seed: 5 }]); loopStop(); songTemplate('club');
      const t = PROJ.tracks.find(t => t.role === 'chords'); openEditor(t.id, { sid: songFind('drop').id }); await new Promise(r => setTimeout(r, 1500)); edFocus();
      const n0 = edTrack().events.length, u0 = UNDO.stack.length, times = []; const o = undoNote; window.undoNote = function () { times.push(Math.round(performance.now())); return o.apply(this, arguments); };
      const key = (k) => $('#edCanvas').dispatchEvent(new KeyboardEvent('keydown', { key: k, ctrlKey: true, bubbles: true }));
      key('a'); key('d'); window.undoNote = o; const n1 = edTrack().events.length, steps = UNDO.stack.length - u0; undo(); const n2 = edTrack() ? edTrack().events.length : -1; closeEditor();
      return { n: `${n0} → ${n1} → ${n2} after one Undo`, steps, bars: PROJ.bars, gapMs: times.length > 1 ? times[times.length - 1] - times[0] : 0 }; });
    console.log(`cpu x${slow}: ${JSON.stringify(r)}`); }
} finally { await b.close(); }
