import { createRequire } from 'module';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1100 });
const W = ms => new Promise(r => setTimeout(r, ms)), E = (f, ...a) => p.evaluate(f, ...a);
await p.goto('file://' + process.argv[2], { waitUntil: 'load', timeout: 60000 }); await W(2500); await p.click('#audioPill');
await E(() => { runActions([{ type: 'add_drums', style: 'house' }, { type: 'add_chords' }]); loopStop(); songMode('song'); songTemplate('club'); });
const cdp = await p.createCDPSession();
for (const [g1, g2] of [[80, 0], [150, 150], [200, 100], [100, 200], [300, 50]]) {
  await E(() => { closeEditor(); window.scrollTo(0, 0); }); await W(800);
  const xy = await E(() => { const el = document.querySelector(`.part[data-sid="${songFind('drop').id}"][data-tid="${PROJ.tracks.find(t => t.role === 'chords').id}"]`); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, on: songFind('drop').parts[PROJ.tracks.find(t => t.role === 'chords').id].on }; });
  await W(500); const ev = (type, c) => cdp.send('Input.dispatchMouseEvent', { type, x: xy.x, y: xy.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: c });
  await ev('mousePressed', 1); await ev('mouseReleased', 1); await W(g1); await ev('mousePressed', 2); await W(g2); await ev('mouseReleased', 2); await W(600);
  const r = await E(() => ({ ed: !$('#editor').hidden, a: document.activeElement.id || document.activeElement.tagName, on: songFind('drop').parts[PROJ.tracks.find(t => t.role === 'chords').id].on }));
  console.log(`up1→down2 ${g1} ms, down2→up2 ${g2} ms:`, JSON.stringify({ before: xy.on, ...r }));
  if (!r.on) await E(() => undo());
}
await b.close();
