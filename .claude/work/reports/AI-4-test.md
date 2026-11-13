# AI-4 branch check (qa-tester) · 13 Nov 2026 · `preview-ai-4` @ 4be6bca

**Verdict: NOT READY (small fixes).** Both bugs are fixed with real typing in the assistant box. check.sh passes (23 checks, 0 page errors). Every mixing change and every transcribe is a single undo step. The singing, voice-note, "add a bassline" and "another one" requests still work.

Four problems in the new code should be fixed before the owner sees it:
- The new Worker sentence tells the AI to send fixed EQ values. On the live AI, "the mix is muddy" would add low end to the pads.
- Phrases that ask for MORE low end ("boost the lows", "not enough low end", "lacks low end") now cut the low end.
- "still muddy", which the reply itself suggests, works on a different part.
- "add brighter chords" no longer adds chords.

Each is a small fix in `src/maker.js` `toneFix` or in the prompt sentence.

## check.sh
```
PASS bundle syntax
PASS worker syntax
PASS drums like Ben Böhmer at 124 · 176 hits, kitMelodic
PASS "another one" makes a different groove
PASS track like Stephan Bodzin (drums, bass, chords, melody)
PASS note editor copy/paste and undo · 20→23→20
PASS MP3 download (4 loops, decodes back) · 727 KB, 31.0 s
PASS track FX: panel, add effect, assistant reverb, sidechain preset
PASS "the bass is muddy" cleans the bass EQ, same notes · low cut 28→45 Hz
PASS "the mix is muddy" changes the mix FX · chords low cut 170→238 Hz
PASS "add a bassline", "sing the bassline", "voice note", "another one" unchanged
PASS select two tracks and play them together · 2 audible
PASS "add a choir" / "add a melody" make new tracks
PASS "make a track like…" starts with drums only
PASS plays the song
PASS "turn the voice note into a bassline" transcribes
PASS "turn <recording name> into chords" transcribes that track · 6 chords
PASS import MIDI + audio, turn audio into a bassline
PASS while singing, only the drums play
PASS sing the bassline → bass track · 14 notes
PASS a sung part doesn't add your raw voice as an extra track
PASS your voice isn't played back live while you sing, and the mic turns off after
PASS humming isn't mistaken for talking
PASS save and reopen a song · Smoke sing 3
PASS no page errors
SMOKE OK: 23 checks
CHECK OK   (56 s)
```
Worker: `node --check` OK, 0 backticks, 0 `${`.

## Problems

1. **The Worker prompt tells the AI to set fixed EQ values, so "the mix is muddy" adds low end to the pads** · assistant (worker.js) · MEDIUM, ships with the Worker deploy
   - Steps: on the live AI, with drums, bass, chords and melody, say "the mix is muddy". Following the new sentence, the AI sends `track_fx low cut 200` and `mix low -3` on chords and melody. I replayed exactly those actions with `runActions`.
   - Happened: `mix.low` is an absolute value, not a change. Chords went from their preset low EQ of -6 dB to -3 dB (3 dB MORE low end), and melody from -4 to -3. Following "dull = mix high +3" on the bass set its high EQ from -4 to +3 (+7 dB). A second "still muddy" sends the same numbers, so nothing changes. `projectState()` doesn't include a track's EQ or low cut, so the AI can't work out a relative value.
   - Should: muddy always lowers the low end from where it is now.
   - Fix options: (a) a relative EQ field (the executor already has `change` for volume), or (b) send `lo/mid/hi/hp` in `projectState` and tell the AI to subtract. Option (a) needs `actions.js` and the prompt. Or leave the second sentence out of this release.

2. **Asking for MORE low end cuts the low end** · assistant (`toneFix` in `src/maker.js`) · MEDIUM, regression
   - Steps: drums like Ben Böhmer, then "add a bassline", then say each of these:
     - "boost the lows on the bass"
     - "not enough low end on the bass"
     - "the kick lacks low end"
     - "the low end is weak"
   - Happened:
     - Bass: low cut 28→45 Hz and low EQ -2 dB. The reply says "Cleaned up the bass … less low boom".
     - Kick: low cut 28→40 Hz, low -3.
     - "the low end is weak": cleaned the chords and melody (low cuts up to 466 / 600 Hz).
     - On main, "boost the lows on the bass" gave a `mix` action on the bass.
   - Should: these are "thin". The `thin` regex only matches "more/boost low end" with nothing in between, and doesn't match "the lows", "not enough", "lacks" or "weak". Everything else falls through to `mud` because of `low ?end|lows`.

3. **"still muddy", the reply's own suggestion, doesn't continue on the same part** · assistant (`toneFix`) · MEDIUM
   - Steps: drums, bass, chords and melody, then "the bass is muddy" (reply ends "Say “still muddy” to go further."), then "still muddy".
   - Happened: it cleaned Chords (238 Hz, low -9) and Melody (308 Hz, low -7), and the reply says "bass and kick untouched". With only drums and bass it answers "Tell me which one".
   - Should: carry on with the bass (remember the last tone target when "still …" names no part). "the bass is still muddy" works (45→55 Hz).

4. **"add brighter chords" / "add some dull chords" no longer add chords; "another one with more low end" no longer makes a new groove** · assistant (`toneFix`) · LOW-MEDIUM, regression
   - Steps: drums and bass, then "add brighter chords".
   - Happened: "There are no chords yet to fix. Want me to add some?" and nothing is added. On main this gave `add_chords`. "another one with more low end" now only boosts the EQ (main: `vary`). The add-part guard only matches "add (a/an/some)(new) <part>", so an adjective or "sub" in between slips past it. Example: "add a sub bass for more low end" boosts the existing bass instead of adding one.
   - Should: an add / another / make-a-part sentence goes to the part builder. The mixing words can be applied after it, or ignored.

5. **"add more low end" with drums only says "on the drums and bass"** · assistant · LOW
   - Steps: drums only, then "add more low end".
   - Happened: the drums' low EQ goes +2. The reply says "2 dB more low end on the drums and bass", but there is no bass.

6. **The first "the bass is muddy" is very subtle** · assistant/engine · LOW (note, not a blocker)
   - Offline render, 4 bars, Böhmer drums + bass + chords + melody:
     - Bass stem: below 120 Hz -10.7→-11.3 dB; 200-500 Hz -23.7→-24.0 dB; RMS -9.9→-10.4 dB.
     - Mix: 200-500 Hz -23.5→-23.6 dB.
   - A producer may hear no change on the first ask. The mud band (200-500 Hz) has no mixer band (the dev already noted the fixed 120 Hz shelf and 1 kHz mid).

7. **Short audio-track names cause false transcribes** · assistant · LOW
   - Steps: import a file named `kick.wav`, then "make the kick sit next to the bass".
   - Happened: `transcribe kick → bass`, because the partial name match is `x.includes(name)`.
   - Should: require the name to start the phrase, or match whole words.

Not regressions (same on main, for the lead to decide):
- "turn the bass into chords" still gives `add_bass` + `add_chords`, with or without an audio track. It regenerates the bassline and adds a Chords track. The dev flagged this.
- After a sung take ("let me hum a melody"), "turn it into a bassline" transcribes the older voice note, not the sung part. `ASSIST.lastHum` isn't set by takes.
- Reply text repeated in the chips; the reply gives the change ("3 dB more low end") while the chip shows the absolute value ("Bassline: low -4 dB").

## What I checked (with numbers)

### Bug 2: "turn <recording> into …" (offline brain, typed into the assistant box)
- Original steps: drums + bassline, import `New Recording 3.wav`, then type the assistant's own hint "turn New Recording 3 into a bassline".
  - Result: transcribe of that track, 6 notes on Sub Bass; the audio is muted and the Bassline is untouched.
  - Same for "turn hook idea into a bassline".
  - One Undo removes the new track and unmutes the audio (state identical). FIXED.
- Also transcribe the right track:
  - "turn the voice note into a bassline" (newest audio)
  - "Turn Hook Idea into chords" (6 chords / 18 notes, Deep Pad)
  - "turn it into a melody"
  - "make the recording into notes"
  - "turn new recording into a bassline" (partial name)
  - "convert the audio to midi"
  - "turn my voice memo into chords"
- Recorded voice note (fake mic):
  - "record a voice note": 4-bar take, "Voice note 1" audio track, hint "turn the voice note into a bassline".
  - That hint: 12 notes, one undo step.
  - "turn it into chords": 12 chords.
- No recording take started on any transcribe phrase (before the fix, 2 of 4 did).

### Bug 3: mixing words (Böhmer drums + bassline; later + chords + melody)
- Notes identical and track count unchanged in every case, and each one is a single undo/redo step (state compared before and after):
  - "the bass is muddy": low cut 28→45 Hz, low EQ +3→+1. Reply: "Cleaned up the bass: low cut up to 45 Hz and 2 dB less low boom, same notes."
  - "the bass is still muddy" 55 Hz, "clean up the low end on the bass" 65 Hz, "cut the lows on the bass" 75 Hz, "the bass sounds boomy" 85 Hz (cap 90).
  - "the mix is muddy", drums + bass only: asks which part (no change).
  - "the mix is muddy", 4 parts: Chords 170→238 Hz / low -6→-9, Melody 220→308 Hz / -4→-7. Bass and drums untouched.
  - "the chords are harsh": high -3. "the mix is harsh": every part -2. "make it brighter": every part +2. "make the chords brighter" +3. "the melody sounds dull" +3. "the mix is boxy": mid -2 on all but drums. "the bass is thin" / "the bass needs more low end": low +3.
- Unchanged: "make the drums louder" gives volume 100; "more reverb on the chords" gives Reverb 62%. Both undo cleanly.
- Empty song: "the bass is muddy" gives "There's no bass yet to fix. Want me to add one?" "the mix is muddy" / "make it brighter" / "add more low end" give "There's nothing in the song to mix yet…". No track added.
- Render, 4 parts, before → after "the bass is muddy" → after 2× "the mix is muddy":
  - Mix: peak -0.4 / -0.4 / -0.3 dBFS; RMS -6.5 / -6.6 / -6.6 dB.
  - 0 clipped samples, no silence. Chords stem RMS -26.7 → -28.0 dB.

### Nearby requests (with an audio track in the song)
- "add a bassline" gives a new Bassline (16 notes).
- "another one" gives a new drum groove (176→160 hits).
- "let me sing the bassline" (11 notes), "let me sing the melody" (10) and "hum the chords" (39 notes) each start a take; no audio track is added and the mic turns off after.
- "record a voice note" still records.

### Worker prompt
- Two sentences were added, read in the diff: transcribe naming, and mixing words never rewrite notes.
- Syntax OK, no backticks, no `${`. They aren't testable against the live model here; see problem 1 for the executor mismatch.

### Console
- 0 page errors in all runs. Only the blocked Google Fonts request (sandbox) and the ScriptProcessorNode deprecation warning.

## Files
- Screenshots: `/tmp/qa/2026-11-13-ai4/shots/`
  - `a1-mix-muddy-drums-bass.png`, `a1-end.png`, `a2-A-after-mix.png`
  - `a3-after-imports.png`, `a3-voice-note-recorded.png`, `a3-voice-note-transcribed.png`
- Scripts and outputs: `/tmp/qa/2026-11-13-ai4/js/`
  - `a1.mjs` (mixing words + undo/redo), `a2.mjs` (render numbers, add-part collisions, empty song), `a3.mjs` (transcribe + regressions)
  - `a4.mjs` (AI actions from the new prompt), `a5.mjs` (main vs AI-4 offline brain)
  - Outputs: `a1.out`, `a2.out`, `a3.out`
- Smoke test: the dev already added 5 checks for AI-4; I added nothing. Suggested extra lines once 2-4 are fixed: "boost the lows on the bass" gives low EQ up; "add brighter chords" gives add_chords; "still muddy" after "the bass is muddy" changes the bass.
