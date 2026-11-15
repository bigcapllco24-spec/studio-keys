// SE-7c assistant checks against the built index.html
import { createRequire } from 'module';
const require = createRequire('/tmp/sk-test/node_modules/x.js'); const pc = require('puppeteer-core');
const html = process.argv[2];
const b = await pc.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::/.test(m.text())) errs.push(m.text()); });
await p.goto('file://' + html, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const ap = document.querySelector('#audioPill'); if (ap) ap.click(); ASSIST.voice = false; });
let fails = 0; const ok = (n, pass, info) => { console.log((pass ? 'PASS ' : 'FAIL ') + n + (info ? ' · ' + info : '')); if (!pass) fails++; };
const lastBubble = () => p.evaluate(() => { const b = [...document.querySelectorAll('#asChat .bub.as')].pop(); return b ? b.children[1].textContent : ''; });
const say = async (text, wait = 150) => { await p.evaluate(t => ASSIST.run(t), text); await new Promise(r => setTimeout(r, wait)); return lastBubble(); };

// render a real E minor song to analyse (drums for 2 loops, then the full loop), 124 BPM
await p.evaluate(async () => {
  let sd = 4242; Math.random = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  PROJ = newProject(); setBars(4);
  runActions([{ type: 'style', style: 'house' }, { type: 'key', key: 'E minor' }, { type: 'tempo', bpm: 124 }]);
  setChords(['Em', 'C', 'G', 'D']);
  runActions([{ type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]);
  await new Promise(r => setTimeout(r, 1200));
  const bpm = CTRL.bpm, L = PROJ.bars * 4, sr = 44100;
  const [dl, dr] = await renderAudio(PROJ.tracks.filter(t => t.role === 'drums'), bpm, L, { context: PROJ.tracks });
  const [fl, fr] = await renderAudio(PROJ.tracks, bpm, L);
  const n = dl.length, total = n * 10, A = new AudioContext({ sampleRate: sr }), buf = A.createBuffer(2, total, sr);
  const L0 = buf.getChannelData(0), R0 = buf.getChannelData(1);
  for (let j = 0; j < total; j++) { const lp = Math.floor(j / n), k = j % n; L0[j] = (lp < 2 ? dl : fl)[k] || 0; R0[j] = (lp < 2 ? dr : fr)[k] || 0; }
  window.__buf = buf; Math.random = window.__mr || Math.random;
});
const fresh = (o = {}) => p.evaluate(o => {
  PROJ = newProject(); undoReset(); OFFER.actions = null; setBars(4);
  runActions([{ type: 'style', style: 'house' }].concat(o.key ? [{ type: 'key', key: o.key }] : [])); setTempo(120);
  if (o.parts) runActions([{ type: 'add_drums' }, { type: 'add_bass' }, { type: 'add_chords' }]);
  if (o.song) { const t = makeTrack({ kind: 'audio', role: 'voice', name: 'Night Drive', inst: null, start: 0, trim: 0, events: [] }); PROJ.tracks.push(t); AUD.set(t.id, window.__buf); if (window.__ana && o.cached !== false) t.ana = window.__ana; saveProject(); renderTracks(); }
  undoReset(); return PROJ.tracks.length;
}, o);

// 1. analyse_song, not analysed yet: listens, then says the result
await fresh({ song: true, cached: false });
const r1 = await say('what key is this song?', 50);
ok('analyse_song on a fresh clip says it is listening', /Listening to “Night Drive”/.test(r1), r1);
await p.waitForFunction(() => { const b = [...document.querySelectorAll('#asChat .bub.as')].pop(); return b && /at 124/.test(b.textContent); }, { timeout: 60000 });
const r1b = await lastBubble(); await p.evaluate(() => { window.__ana = PROJ.tracks.find(t => t.kind === 'audio').ana; });
ok('...then answers with key, tempo, sureness, second guess, reason, chords and an offer', /^E minor at 124/.test(r1b) && /Set your song to E minor at 124 BPM\?$/.test(r1b) && /main loop goes/.test(r1b), r1b);
const ks1 = await p.evaluate(() => keyStatusText());
ok('analyse_song changes nothing (key still auto)', !/E minor · (set|from the song)/.test(ks1), ks1);
const y = await say('yes');
ok('"yes" reply offers the chords next', /Want its chords on your song too\?/.test(y), y);
const y2 = await say('sure'); const s1 = await p.evaluate(() => PROJ.tracks.filter(t => t.fromSong).length);
ok('"sure" then puts them on', s1 === 1 && /Chords from/.test(y2), y2);
const ks2 = await p.evaluate(() => [keyStatusText(), CTRL.bpm]);
ok('"yes" sets the key from the song (and its tempo)', ks2[0] === 'E minor · from the song' && ks2[1] === 124, ks2.join(' / ') + ' · ' + y);

// 2. cached analysis, user song in D minor: report + "no"
await fresh({ song: true, key: 'D minor', parts: true });
const r2 = await say('Keys, what key is this in');
ok('cached analysis answers at once and offers to move a set key', /^E minor at 124/.test(r2) && /Move your song to E minor/.test(r2), r2);
const n2 = await say('no thanks'); const off = await p.evaluate(() => !!offerOpen());
ok('"no" drops the offer', /left it/.test(n2) && !off, n2);

// 3. chords_from_audio into D minor, undo
const before = await p.evaluate(() => JSON.stringify(PROJ.tracks.map(t => t.events.length)));
const r3 = await say('put those chords on my song');
const s3 = await p.evaluate(() => ({ n: PROJ.tracks.length, ct: PROJ.tracks.filter(t => t.role === 'chords').length, ch: chordsText(PROJ.chords), playing: TR.running }));
ok('"put those chords on my song" adds a Chords track in my key and says so', s3.ct === 2 && /moved down a tone into your key, D minor/.test(r3) && /new melody over these chords/.test(r3), r3 + ' · ' + s3.ch);
await p.evaluate(() => { loopStop(); undo(); });
const after = await p.evaluate(() => JSON.stringify(PROJ.tracks.map(t => t.events.length)) + (PROJ.chords ? ' chords' : ''));
ok('one undo restores the song', after === before, before + ' → ' + after);
const r3b = await say('use the chords from this song in the song\'s key with the bass too');
const s3b = await p.evaluate(() => ({ ch: chordsText(PROJ.chords), key: keyStatusText() }));
ok('to "song" keeps the song key chords (my set key stays), bass movement', /Em/.test(s3b.ch) && /D minor · set/.test(s3b.key) && /bass/.test(r3b), r3b + ' · ' + s3b.ch + ' · ' + s3b.key);

// 4. set_chord by voice
await fresh({ key: 'A minor', parts: true });
const r4 = await say('make bar 4 B minor');
const s4 = await p.evaluate(() => chordsText());
ok('"make bar 4 B minor" sets it, parts follow', /^Bar 4 is now Bm/.test(r4) && /Bm$/.test(s4), r4 + ' · ' + s4);
const r4b = await say('bar 9 ko E kar do');
ok('a bar outside the loop gets an honest reply', /no bar 9/.test(r4b), r4b);
const r4c = await say('make bars 1 and 2 F sharp 7');
ok('two bars, spoken chord name', /^Bar 1-2 is now F♯7/.test(r4c), r4c);
const r4d = await say('another chord progression'); const s4d = await p.evaluate(() => [!!PROJ.chords, chordsText()]);
ok('vary chords clears fixed chords and makes a new progression', !s4d[0] && /in place of your chords/.test(r4d), r4d + ' · ' + s4d[1]);

// 5. match_key
await fresh({ key: 'D minor', parts: true });
await p.evaluate(() => { const ev = []; [67, 70, 74, 72, 70, 69, 67, 62, 67, 70].forEach((n, i) => ev.push({ b: i * 1.5, d: 1, n, v: .8 })); [43, 43, 39, 41].forEach((n, i) => ev.push({ b: i * 4, d: 3.5, n, v: .9 })); PROJ.tracks.push(makeTrack({ role: 'melody', inst: 'piano', name: 'My loop', events: ev })); saveProject(); });
const r5 = await say('match this loop to my key');
const s5 = await p.evaluate(() => PROJ.tracks.find(t => t.name === 'My loop').events.map(e => e.n % 12).filter(pc => ![2, 4, 5, 7, 9, 10, 0].includes(pc)).length);
ok('a MIDI loop in G minor moves into D minor', /^Moved “My loop” (down|up) .*from G minor into your key, D minor/.test(r5) && s5 === 0, r5 + ' · outside D minor: ' + s5);
await fresh({ key: 'D minor', song: true });
const r5b = await say('is loop ko meri key mein kar do');
ok('an audio loop offers to move the song instead', /can't re-pitch audio yet/.test(r5b) && /E minor/.test(r5b), r5b);
const y5 = await say('haan'); const k5 = await p.evaluate(() => keyStatusText());
ok('"haan" accepts it', k5 === 'E minor · from the song', y5 + ' · ' + k5);
const a5 = await say('set the key back to auto'); const k5b = await p.evaluate(() => [PROJ.key, keyStatusText()]);
ok('key auto unlocks', k5b[0] === null && /auto/i.test(a5), a5 + ' · ' + JSON.stringify(k5b));

// 6. my own song, no audio
await fresh({ parts: false });
await p.evaluate(() => { runActions([{ type: 'notes', track: 'Chords', role: 'chords', notes: [['F3', 'A3', 'C4'], ['Bb2', 'D3', 'F3'], ['C3', 'E3', 'G3'], ['D3', 'F3', 'A3']].flatMap((ch, i) => ch.map(x => ({ beat: i * 4, len: 4, pitch: x }))) }, { type: 'notes', track: 'Bass', role: 'bass', notes: ['F2', 'Bb1', 'C2', 'D2'].map((x, i) => ({ beat: i * 4, len: 3, pitch: x })) }]); });
const r6 = await say('what key is my song in');
ok('no song dropped in: answers about your own song', /^Your song sounds like F major/.test(r6), r6);

// 7. regenTrack keeps held pads on strings
await fresh({ key: 'A minor' });
const r7 = await p.evaluate(() => { runActions([{ type: 'add_chords', instrument: 'strings' }]); const t = PROJ.tracks.find(x => x.role === 'chords'); const d0 = Math.max(...t.events.map(e => e.d)); runActions([{ type: 'vary', track: t.name, progression: false }]); const d1 = Math.max(...t.events.map(e => e.d)); return [t.inst, d0, d1]; });
ok('"another one" on a strings chords part keeps the held pads', r7[1] >= 3 && r7[2] >= 3, r7.join(' '));

// 8. parser table
const table = await p.evaluate(() => {
  const ins = ['what key is this', 'what chords are in this song', 'analyse this song', 'is gaane ki key kya hai', 'chords kya hain', 'what bpm is this track',
    'put those chords on my song', 'take the chords from this song', "use the song's chords", 'ye chords mere gaane mein daal do', 'copy the chords from the track with the bassline too',
    'make bar 4 B minor', 'bar 2 should be F#7', 'change the chord in bar 3 to C/E', 'make the fourth bar a minor', 'make bar 4 beat 3 E', 'bar 4 ko B minor kar do',
    'match this loop to my key', 'put the loop in my key', 'key back to auto', "use the song's key", 'set the key to F minor',
    'add chords', 'make bar 4 louder', 'make it 8 bars', 'what chords should I add next'];
  return ins.map(s => s + ' => ' + JSON.stringify(localBrain(s).actions.map(a => { const o = Object.assign({}, a); Object.keys(o).forEach(k => o[k] === undefined && delete o[k]); return o; })));
});
table.forEach(l => console.log('  ' + l));
await fresh({ song: true });
const t2 = await p.evaluate(() => ['what key is this', 'what key is my song in', 'use the chords from this song in the song\'s key', "use the song's key", 'match Night Drive to my key'].map(s => s + ' => ' + JSON.stringify(localBrain(s).actions)));
t2.forEach(l => console.log('  ' + l));
ok('with a song in: "this" = the song, "my song" = mine, song key words', /analyse_song"}/.test(t2[0]) && /"mine"/.test(t2[1]) && /chords_from_audio","to":"song"/.test(t2[2]) && /"key":"song"/.test(t2[3]) && /match_key","track":"Night Drive"/.test(t2[4]), '');
const want = [/analyse_song/, /analyse_song/, /analyse_song/, /analyse_song/, /analyse_song/, /analyse_song/, /chords_from_audio/, /chords_from_audio/, /chords_from_audio/, /chords_from_audio/, /chords_from_audio.*"bass":true/,
  /set_chord","bar":4,"chord":"Bm"/, /"bar":2,"chord":"F♯7"/, /"bar":3,"chord":"C\/E"/, /"bar":4,"chord":"Am"/, /"bar":4,"chord":"E","beat":3/, /"bar":4,"chord":"Bm"/,
  /match_key/, /match_key/, /"key":"auto"/, /"key":"song"/, /"key":"f minor"/, /add_chords/, /^((?!set_chord).)*$/, /"bars":8/, /add_chords/];
const bad = table.filter((l, i) => !want[i].test(l.split(' => ')[1]));
ok('offline phrases parse (' + (table.length - bad.length) + '/' + table.length + ')', !bad.length, bad.join(' | '));

// 9. spoken chord names, context
const sp = await p.evaluate(() => sayChords('The main loop goes Em · C/E · F♯7 · B♭maj7 · N.C. A minor at 124, DJ key 9A.'));
ok('chord symbols are spoken as words', sp === 'The main loop goes E minor, C over E, F sharp 7, B flat major 7, no chord A minor at 124, DJ key 9A.', sp);
await fresh({ song: true, key: 'D minor', parts: true });
const st = await p.evaluate(() => { ACT.analyse_song({}); const s = projectState(); return { len: JSON.stringify(s).length, chords: s.chords, heard: s.tracks.find(t => t.heard).heard, offer: s.offer }; });
ok('the AI sees the chords, what Keys heard and the open offer', /Keys' own progression/.test(st.chords) && /E minor/.test(st.heard) && st.offer && st.offer.ifUserSaysYes[0].type === 'key', JSON.stringify(st));
ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(fails ? 'FAILED ' + fails : 'ALL OK'); await b.close(); process.exit(fails ? 1 : 0);
