# QA-1 daily session · 13 Nov 2026 · `main` @ 04a0490

**Verdict: main is usable and check.sh passes, but there is 1 high bug (Play does nothing on a new song after the assistant adds tracks) and 5 medium ones (offline brain misreads voice-note and mixing requests, hidden velocity lane, double bassline after singing, choppy sung chords).** No page errors in the whole session; console only showed the blocked Google Fonts request (sandbox, not a bug) and Chrome's ScriptProcessorNode deprecation warning.

## check.sh
```
PASS bundle syntax
PASS worker syntax
PASS drums like Ben Böhmer at 124 · 172 hits, kitMelodic
PASS "another one" makes a different groove
PASS track like Stephan Bodzin (drums, bass, chords, melody) · drums:kitDeepTechno:128 bass:rollbass:48 chords:darkpad:20 melody:mhpluck:64
PASS note editor copy/paste and undo · 20→23→20
PASS MP3 download (4 loops, decodes back) · 727 KB, 31.0 s
PASS track FX: panel, add effect, assistant reverb, sidechain preset
PASS select two tracks and play them together · 2 audible
PASS "add a choir" / "add a melody" make new tracks · Choir, Choir 2, Melody 2
PASS "make a track like…" starts with drums only · ["vibe"]
PASS plays the song
PASS import MIDI + audio, turn audio into a bassline
PASS while singing, only the drums play
PASS sing the bassline → bass track · 8 notes
PASS a sung part doesn't add your raw voice as an extra track
PASS your voice isn't played back live while you sing, and the mic turns off after
PASS humming isn't mistaken for talking
PASS save and reopen a song · Smoke sing 3
PASS no page errors
SMOKE OK: 18 checks
CHECK OK   (46 s)
```

## Bugs (ranked)

1. **Play does nothing on a new song after the assistant adds tracks** · studio · HIGH
   Steps: open the app (or New song) → type "add chords" (or "124 bpm drums like Ben Böhmer") → press Play.
   Happens: nothing plays; toast "Add a track or record something first." Space and the controller PLAY do nothing too; the Loop button starts a count-in recording. Works only after pressing Stop once (state goes empty→stopped).
   Should: play the song.
   Suspect: `addTrack()` in `src/studio.js` never moves `LOOP.state` from `'empty'` to `'stopped'` (the importers in `src/edit.js` do; `loopStop()` does). The Play handler only plays when state is `'stopped'`. Same code on preview-ux-1 and preview-se-3. The smoke test calls `loopPlay()` directly, so it never saw this. Owner: studio-ux-dev.

2. **The assistant's own "turn … into a bassline" hint fails (offline brain)** · assistant · MEDIUM
   Steps: import a voice memo or record a voice note, then type the phrase the assistant suggests:
   - "turn New Recording 3 into a bassline" → regenerates the existing Bassline ("Bassline: a new bassline").
   - "turn hook idea into a bassline" → regenerates the Bassline AND adds a Melody track.
   - "turn the voice note into a bassline" → records a NEW voice note from the mic.
   - "turn sing into chords" → starts a chords singing take.
   Should: turn that audio track into notes (the "Turn into notes…" dropdown does this correctly).
   Suspect: `localBrain` in `src/maker.js`: the voice-note regex and `singRole` are checked before the transcribe regex, and the transcribe regex only accepts `voice note|voice|recording|audio|vocal|it` straight after the verb, so a track name falls through to `vary` (the word "new") or `add_bass`/`add_melody`. Live AI not checked; the lead should try the same phrases on the live site. Owner: assistant-dev.

3. **Mixing words rewrite the part instead of mixing it (offline brain)** · assistant · MEDIUM
   Steps: drums like Ben Böhmer, "add a bassline", then "the bass is muddy" / "clean up the low end on the bass" / "cut the lows on the bass".
   Happens: each one replaces the bass notes with a new bassline; FX unchanged (hp 28 Hz before and after). "the mix is muddy" → "I couldn't turn that into a change."
   Should: low cut / EQ on the bass (or the mix), reply says what changed.
   Suspect: the FX regex in `src/maker.js` has no muddy/boomy/low end/lows/harsh/thin words, so the text reaches `add_bass`. Owner: assistant-dev.

4. **Velocity lane hidden in the piano roll** · studio · MEDIUM
   Steps: add chords → Edit notes (1400x1100 window) → look for the "bottom lane" the hint mentions.
   Happens: not visible. `#edWrap` is max 480 px tall but the canvas is 534 px, so the lane sits below the fold and the mouse can't reach it until you scroll inside the editor box. After scrolling, dragging works (0.55→0.77). With several notes selected (Ctrl+A), a plain drag changes only the note under the mouse; Alt+drag changes all, which the hint doesn't say.
   Should: lane visible when the editor opens; dragging a selected note's bar sets all selected (as in Ableton).
   Suspect: `#edWrap` CSS in `src/head.html`, `edGeom`/`setVel` in `src/daw.js`. Owner: studio-ux-dev.

5. **Singing the bassline adds a second bassline** · studio · MEDIUM
   Steps: drums like Ben Böhmer → "add a bassline" → "let me sing the bassline" → sing.
   Happens: "Sung bassline" is added next to "Bassline" and both play (audible: drums, bass, chords, choir, bass). Same for sung chords next to Chords.
   Should (lead/owner call): the sung take replaces the generated part, or mutes it and says so with a way back.
   Suspect: `TAKE.finish` in `src/studio.js` only removes earlier takes (`t.take===part`). Owner: studio-ux-dev.

6. **Sung chords come out choppy** · studio · MEDIUM
   Steps: drums like Ben Böhmer → "let me sing the chords" → sing (fake mic, sing.wav).
   Happens: 11 chords in 4 bars, starts not on the beat, the same chord twice in a row, some 1/16 long. Beat+length: 0.5+1.23, 1.75+1.23, 3+3.48, 6.5+0.48, 7+0.48 (same chord), 7.5+0.25, 7.75+0.98 (same chord), 8.75+1.23, 10+1.23, 11.25+1.23, 12.5+3.48.
   Should: chord changes on beats or half bars, identical neighbours merged, each at least 1 beat.
   Suspect: `shapePart()` chords branch in `src/studio.js`. Owner: studio-ux-dev (with sound-engine-dev if the shaping lives in music code).

7. **Pads buried in the mix** · engine · LOW
   Steps: drums like Ben Böhmer, add a bassline, add chords, add a choir, add a melody → Export for Ableton (.zip) → measure with ffmpeg ebur128.
   Numbers: mix -7.6 LUFS, peak -0.4 dBFS, 0 clipped samples, no silence. Stems: Drums -7.9, Bassline -9.7, Chords (Deep Pad) -24.0, Choir -14.8, Melody (Melodic Pluck) -21.8 LUFS. Choir and Deep Pad share a 0.55 fader yet differ by 9 LU.
   Should: pads and lead sit closer to the groove for melodic house (by ear check against a reference).
   Suspect: default part volumes / Deep Pad and pluck gain (`src/music.js`, `src/instruments.js`). Owner: sound-engine-dev.

8. **Phone width scrolls sideways** · studio · LOW
   Steps: open at 390x844, swipe left.
   Happens: page moves 11 px (scrollWidth 401 vs 390); controller knobs K6-K8 cut off (#knobs right edge 493 px), Live Mixer cards run past the panel edge. Tablet 1024x768: no overflow.
   Owner: studio-ux-dev (`src/head.html`).

Not filed (already covered or cosmetic):
- Reloading reopens the last song instead of a new empty one (owner rule, 13 Nov): on main the app restores the last song; "new empty song on open" is in UX-1, so not filed. The saved song itself reopens perfectly from Open song (see 6).
- "less swing" regenerates the groove (new pattern, reply doesn't mention swing): covered by SE-3 (swing ladder).
- Cosmetic: each reply shows the same sentence twice (text + chip); LCD says "1 TRACKS"; "another one" reply drops "Ben Böhmer-style"; the live note strip ("listening G♯4 …") stays after the take ends; `drawEditor` hard-codes `#efe7e2` and the mixer master strip `#ece7dd` (standards say colours come from CSS variables); 1-minute MP3 render stalls the main thread for about 0.7 s headless (status text shows progress).
- Housekeeping for the lead: `src/looper.js` is not in `tools/build.py` and duplicates `renderAudio`/`exportZip`/`saveFile` from `studio.js`; dead file.

## Ideas (max 3)
1. **Capture what I just played**: "Keys, keep that" or a Capture button turns the last 4-8 bars played on the keyboard into a quantized clip without pressing Record (Ableton's Capture MIDI). Why: most ideas come while jamming and get lost.
2. **Variation history after "another one"**: chips "← previous / keep this one" on the part. Why: auditioning variations is the core beat-making loop, and Undo also throws away later edits.
3. **Reference A/B**: drop a reference track (kept only in the browser) and flip between it and the mix at matched loudness, with a simple LUFS / low-end meter. Why: producers check against a Böhmer or Bodzin track constantly; it's how you hear "pads too quiet".

## Could not test
Live AI (Workers AI / Claude), real speech recognition and wake word, spoken replies, and Spotify login: they don't run headless / offline; every typed request went to the offline brain (`localBrain`). Real MIDI hardware (stubbed).

## What I checked (with numbers)

### 1. Beat by reference + "another one" twice (typed into the assistant box, offline parser)
- "124 bpm drums with hats and claps like Ben Böhmer" → 1 Drums track, Melodic House Kit, 124 BPM, F minor, vibe Ben Böhmer / melodichouse, 176 hits. Reply in 15 ms.
- "another one" ×3: each different (hit-set similarity 0.28 / 0.31 / 0.31 between successive grooves), kit, tempo and vibe kept every time. Still one drums track. PASS.
- Reply on "another one" says only "Drums: …" (drops "Ben Böhmer-style"), so the user doesn't hear that the vibe was kept. Cosmetic.
- Reply text is shown twice in each bubble (sentence + a chip with the same long sentence). Cosmetic.

### 2. One element at a time
- "add a bassline" → +1 track (Bassline, Sub Bass, F minor), suggests chords. "add chords" → +1 (Chords, Deep Pad), suggests melody. "add a choir" → +1 NEW track (Choir), suggests melody. PASS: exactly one track each, next step suggested, not added.

### 3. Singing over the beat (fake mic, sing.wav = C E G A C G loop)
- "let me sing the bassline": during the take only drums audible (TAKE_GUIDE true), mic on; after: mic off, new "Sung bassline" (Sub Bass, 11 notes, all in F minor, starts on the 1/16 grid). No audio track added. PASS.
- "let me sing the chords": "Sung chords" Deep Pad, 13 chords / 39 notes, all in key, mic off after. PASS on the rules, but see bug: chords include 1/16-long blips.
- The sung bassline is added NEXT TO the existing generated "Bassline", and both play together (two basslines). See bug list.

### 4. Piano roll (real mouse and keyboard on the Chords track, 1400x1100)
- Draw click adds a note (20→21), drag moves it +2 beats / +2 semitones, box-select bar 1 = 5 notes, Ctrl+C / Ctrl+V pastes 5 after them (21→26), ArrowUp nudges, Delete removes (26→21), right-click deletes. Each is one undo step; Ctrl+Z ×5 returns exactly to the start; Ctrl+Shift+Z and Ctrl+Y redo exactly. Editor stays open through undo. PASS.
- Drum step grid: click toggles a hit (172→173). PASS.
- Velocity lane: NOT visible when the editor opens. The canvas is 534 px tall inside `#edWrap` (max-height 480px, overflow auto), so the velocity lane is below the fold and the mouse can't reach it until you scroll inside the editor box. After scrolling, dragging works (0.55→0.77). With several notes selected, a plain drag changes only the one under the mouse; Alt+drag changes all (not mentioned in the hint).

### 5. Tracks, FX, mixing by asking, imports
- Click + Ctrl+click track headers selects Drums + Chords; the selection bar appears ("2 tracks selected … Play these together, Mute, Solo, FX, Duplicate, Delete"); Play plays exactly those 2; Mute mutes both. PASS.
- FX button on Bassline opens the panel with the role preset (low cut 28 Hz, high cut 4.2 kHz, drive 18%, comp 40%, sidechain 75%, EQ +3/-1/-4). PASS.
- "more reverb on the chords" → Reverb 62%. "make the drums louder" → volume 100. PASS.
- "the bass is muddy", "clean up the low end on the bass", "cut the lows on the bass" (offline parser) → each one REWRITES the bassline notes (new random bassline) and leaves the FX untouched. "the mix is muddy" → "I couldn't turn that into a change". BUG.
- Import `sing.wav` → audio track "sing" + assistant hint `say "Keys, turn sing into a bassline"`. Import `test.mid` → Lead + Kick tracks. "Turn into notes… → Melody" dropdown → "sing → notes" (6 notes), audio muted, editor opens. PASS.
- The assistant's own hint phrase fails every time (offline parser): "turn the voice note into a bassline" starts a NEW voice-note recording from the mic; "turn New Recording 3 into a bassline" regenerates the existing Bassline; "turn hook idea into a bassline" regenerates the Bassline AND adds a Melody track; "turn sing into chords" starts a chords singing take. BUG.

### 6. Save, reload, reopen
- Persistent Chrome profile: built drums + bass + chords (reverb 62%) + sung bassline + imported audio, deleted a chord note, Save → "Saved 4:54 AM". Closed Chrome, reopened: the app reopened the last song (UX-1 covers new-empty-on-open). Open song… lists 1 song ("124 BPM · 4 bars · 5 tracks"), no empty "Untitled song" clutter. Opening it restores all 5 tracks identically (names, instruments, note counts incl. the deleted note, reverb, key F minor, vibe Ben Böhmer, 124 BPM) and the audio clip loads. Undo right after opening does nothing harmful (5→5). PASS.

### 7. Export
- Download MP3 (About 1 minute): "QA Bohmer 124bpm.mp3", 1.49 MB, 61.96 s, 44.1 kHz stereo 192 kbps (ffprobe), 20.8 s headless. Assistant "download the mp3" → another MP3 in 17.7 s. Export for Ableton (.zip): 8.2 MB, Mix + 5 stems WAV (7.74 s each = exactly 4 bars at 124), 6 MIDI files, song.json, README, 46.8 s headless. MIDI only: 2.4 KB. PASS.
- Offline render of the 5-track song: peak -0.5 dBFS, RMS -7.0 dB, 0 clipped samples, longest silence 0 ms.

### 8. Themes and sizes
- Emerald (default), Velvet, Sapphire dots: switch instantly, body background and accent change (#1fbf83 / #e5384f / #2e9bff), choice saved. Screens look clean and matte. PASS.
- Tablet 1024x768: no horizontal overflow, tracks and editor fit. Phone 390x844: 11 px sideways scroll (bug 8); editor usable but narrow.

### 9. Console
- 0 page errors across all runs. Only "Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED" (Google Fonts blocked in the sandbox) and the ScriptProcessorNode deprecation warning.

## Files
- bugs.json / ideas.json for HQ: /tmp/qa/2026-11-13/bugs.json, /tmp/qa/2026-11-13/ideas.json
- Screenshots: /tmp/qa/2026-11-13/shots/ (key ones: 25-play-does-nothing.png, 07-editor-open.png, 10-velocity-lane-scrolled.png, 06-after-sing.png, 12-fx-panel.png, 16-reopened.png, 18-theme-*.png, 20-phone-top.png, 22-phone-tracks.png)
- Test scripts: /tmp/qa/2026-11-13/js/ (p1-p9.mjs, lib.mjs)

## Smoke checks to add once bugs 1-2 are fixed (not added now: they would fail check.sh and block releases)
```js
// Play button works on a new song made by the assistant
const pl = await E(async () => { await newSong('Smoke play'); runActions(localBrain('add chords').actions); document.querySelector('#playBtn').click(); const r = TR.running; loopStop(); return r; });
ok('Play button plays a new song made by the assistant', pl);
// the hint phrase turns an imported recording into notes (put it after step 5, which imports sing.wav)
const tn = await E(() => { const n0 = PROJ.tracks.length; const a = localBrain('turn the voice note into a bassline').actions.map(x => x.type); return a.join(); });
ok('"turn the voice note into a bassline" transcribes', tn === 'transcribe', tn);
```
