import { createRequire } from 'module'; const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
try { const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1100 }); await p.goto('file:///home/claude/sk-qa2/index.html', { waitUntil: 'load', timeout: 60000 }); await new Promise(r => setTimeout(r, 2500));
  await p.emulateCPUThrottling(+process.env.SLOW || 3);
  const E = (f, ...a) => p.evaluate(f, ...a);
  await E(() => { ASSIST.voice = false; runActions([{ type: 'add_drums', style: 'house' }, { type: 'add_bass' }, { type: 'add_chords' }]); loopStop(); songTemplate('club'); });
  const r = await E(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); const t = PROJ.tracks.find(t => t.role === 'chords'), s = songFind('drop 2');
    const el = () => document.querySelector(`.part[data-sid="${s.id}"][data-tid="${t.id}"]`); el().scrollIntoView({ block: 'center' }); const pos = () => { const r = el().getBoundingClientRect(); return Math.round(r.x) + ',' + Math.round(r.y) + ' sy' + Math.round(scrollY); };
    const out = ['start ' + pos()]; openEditor(t.id, { sid: s.id }); edFocus(); const t0 = performance.now(); closeEditor(); songTemplate('club'); const s2 = songFind('drop'); const el2 = document.querySelector(`.part[data-sid="${s2.id}"][data-tid="${t.id}"]`); el2.scrollIntoView({ block: 'center' });
    const p2 = () => { const r = el2.getBoundingClientRect(); return Math.round(r.x) + ',' + Math.round(r.y) + ' sy' + Math.round(scrollY); };
    for (let i = 0; i < 20; i++) { out.push(Math.round(performance.now() - t0) + 'ms ' + p2()); await W(100); } return out; });
  console.log(r.join('\n'));
} finally { await b.close(); }
