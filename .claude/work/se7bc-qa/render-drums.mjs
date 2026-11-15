// QA retest: render a 40 s drum loop in each of 6 styles to 44.1 kHz stereo WAVs (/tmp/qa/se7bc-re/songs/drums-<style>.wav)
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const html = process.argv[2], out = '/tmp/qa/se7bc-re/songs'; fs.mkdirSync(out, { recursive: true });
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.goto('file://' + html, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const ap = document.querySelector('#audioPill'); if (ap) ap.click(); ASSIST.voice = false; });
function wav(i16, sr) { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + i16.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(i16.length, 40); return Buffer.concat([h, i16]); }
for (const [i, style] of ['house', 'techno', 'hiphop', 'trap', 'afro', 'dnb'].entries()) {
  const r = await p.evaluate(async (style, i) => { let sd = 4242 + i * 17; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    PROJ = newProject(); setBars(4); runActions([{ type: 'style', style }, { type: 'add_drums' }]); await new Promise(r => setTimeout(r, 800));
    const [l, rr] = await renderAudio(PROJ.tracks, CTRL.bpm, PROJ.bars * 4); const n = l.length, reps = Math.ceil(40 / (n / 44100)), total = n * reps, i16 = new Int16Array(total * 2); let pk = 0, ss = 0;
    for (let j = 0; j < total; j++) { const a = l[j % n] || 0, c = rr[j % n] || 0; pk = Math.max(pk, Math.abs(a), Math.abs(c)); ss += a * a; i16[2 * j] = Math.max(-32767, Math.min(32767, Math.round(a * 32767))); i16[2 * j + 1] = Math.max(-32767, Math.min(32767, Math.round(c * 32767))); }
    const u8 = new Uint8Array(i16.buffer); let bin = ''; for (let q = 0; q < u8.length; q += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(q, q + 0x8000));
    return { audio: btoa(bin), truth: { style, kit: PROJ.tracks[0].inst, bpm: CTRL.bpm, sec: total / 44100, peakDb: 20 * Math.log10(pk), rmsDb: 10 * Math.log10(ss / total) } }; }, style, i);
  fs.writeFileSync(`${out}/drums-${style}.wav`, wav(Buffer.from(r.audio, 'base64'), 44100)); fs.writeFileSync(`${out}/drums-${style}.json`, JSON.stringify(r.truth)); console.log(JSON.stringify(r.truth));
}
await b.close();
