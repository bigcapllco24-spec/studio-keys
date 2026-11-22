import { createRequire } from 'module'; const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
try { const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1100 }); const url = 'file://' + (process.env.HTML || '/home/claude/sk-qa2-main/index.html');
  await p.goto(url, { waitUntil: 'load', timeout: 60000 }); await new Promise(r => setTimeout(r, 2500)); const E = (f, ...a) => p.evaluate(f, ...a);
  for (const slow of (process.env.SLOWS || '1,3').split(',').map(Number)) for (const ms of [100, 600]) {
    await p.emulateCPUThrottling(1);
    const id = await E(async () => { ASSIST.voice = false; await newSong('Probe ' + Date.now()); runActions([{ type: 'add_drums', style: 'house', seed: 1 }, { type: 'add_chords', seed: 2 }, { type: 'add_bass', seed: 3 }]); loopStop(); await saveNamed(true); await new Promise(r => setTimeout(r, 2000)); return PROJ.id; });
    await p.emulateCPUThrottling(slow);
    const pre = await E(async ms => { songTemplate('short'); PROJ.name = 'Before reload'; saveProject(); await new Promise(r => setTimeout(r, ms)); return { ls: (store.get('project', {}) || {}).name, pend: !!projSaveT, label: $('#saveState').textContent }; }, ms);
    await p.reload({ waitUntil: 'load', timeout: 120000 }); await p.emulateCPUThrottling(1); await new Promise(r => setTimeout(r, 1500));
    const post = await E(async id => { const t0 = Date.now(); let r = null; while (Date.now() - t0 < 15000) { r = await IDB.get(id, 'projects'); if (r && r.name === 'Before reload' && /New song/.test($('#saveState').textContent)) break; await new Promise(q => setTimeout(q, 200)); } return { last: LAST_PROJ && LAST_PROJ.name, idb: r && r.name, label: $('#saveState').textContent, ms: Date.now() - t0 }; }, id);
    console.log(`cpu x${slow}, reload ${ms} ms after the rename: before ${JSON.stringify(pre)} after ${JSON.stringify(post)}`); }
} finally { await b.close(); }
