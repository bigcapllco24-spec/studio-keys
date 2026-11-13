# AI-4 build report (assistant-dev) · 13 Nov 2026

Branch `preview-ai-4`, code commit `223b8bf` (pushed). The diff against main is 4 files: `src/maker.js`, `cloudflare/worker.js` (2 prompt sentences), `tests/smoke.mjs`, `index.html` (rebuilt). `src/actions.js` did not change.

## What changed
1. **"turn … into a bassline" (bug 1), `localBrain` in `src/maker.js`.** A new check runs first, before voice notes and singing: "turn/convert/make/transcribe <X> into (a/the) bass(line)/chords/melody/notes/piano/instrument/midi". It only runs when the song has an audio track. `<X>` is matched to an audio track name, ignoring case and punctuation; a partial match is fine. Role words like "the melody" or "the bass" only match an exact name. Generic words (the voice note, voice memo, recording, audio, vocal, clip, take, it/that/this) pick the newest audio track. "It/that/this" go to a hum instead when a hummed track is newer. The parser sends `{type:'transcribe', track:<id>, to}`. `ACT.transcribe` (in `src/edit.js`) already takes `track`, so no new field was needed. I removed the old transcribe regex. The hint texts ("turn <name> into a bassline", "turn it…", "turn the voice note…") now all work.
2. **Mixing words (bug 2): new `toneFix(t)` in `src/maker.js`, called right after the existing FX block.** It uses only the existing actions: `track_fx` (low cut / high cut) and `mix` (low/mid/high EQ). Each change is relative to the current setting, so saying "still muddy" goes a step further.
   - muddy, mud, boomy, rumble, low mids, low end, lows, "clean up": raises the low cut (bass to at least 45 Hz, drums 40, chords 200, melody 250, voice 150, up to a cap) and lowers the low EQ (bass by 2 dB, others by 3 dB).
   - boxy: mid -3. harsh / too bright: high -3. dull / brighter: high +3, and opens a high cut that sits below 16 kHz by 1.5x. thin / more low end: low +3.
   - "the mix is …": muddy raises the low cuts and lowers the low EQ by 3 dB on every part except bass and drums. If the song only has drums and bass, it asks which part instead. Harsh, dull and boxy change every part's EQ by 2 dB (boxy skips the drums). Thin adds 2 dB of low end to bass and drums. All of this is per song and undoable; I didn't use the global master EQ.
   - Replies are musical, for example "Cleaned up the bass: low cut up to 45 Hz and 2 dB less low boom, same notes. Say "still muddy" to go further." If the part doesn't exist, the reply is honest ("There's no bass yet to fix. Want me to add one?") and no part is added. "Add a bassline …" sentences skip this check.
   - Limit: the mixer's mid band is fixed at 1 kHz and the low shelf at 120 Hz, so "less 250 Hz" isn't possible. The muddy fix uses the low cut plus the low shelf instead.
3. **Worker prompt (bug 3), `cloudflare/worker.js`: two sentences, no backticks, no `${`.**
   - After the transcribe line: use the audio track's exact name as `track`. Phrases like "turn hook idea into a bassline", "turn the voice note into chords" and "turn it into a melody" (right after a recording) mean transcribe, never sing or add_bass.
   - After the track_fx line: mixing words never rewrite notes. Muddy = higher low cut plus mix low -3; boxy / harsh / dull / thin map to the mid / high / low EQ. "The mix is muddy" = low cut and low -3 on every part except bass and drums.
   - **The Worker must be deployed at release; this isn't active on the test link.** I couldn't test it against the live model, and I didn't call Workers AI.

## How I tested
- `bash .claude/tools/check.sh`: PASS bundle syntax, PASS worker syntax, **SMOKE OK: 23 checks, CHECK OK**. There are 5 new checks:
  - "the bass is muddy": low cut 28→45 Hz, same notes, no track added
  - "the mix is muddy": chords low cut 170→238 Hz through `track_fx`
  - "add a bassline" / "let me sing the bassline" / "record a voice note" / "another one" are unchanged (add_bass, sing:bass, sing:voice, vary)
  - "turn the voice note into a bassline" gives transcribe
  - "turn sing into chords" transcribes that track: 6 chords added, Bassline untouched
- Focused headless run (Ben Böhmer drums + bassline, then `sing.wav` imported):
  - "the bass is muddy", "clean up the low end on the bass", "cut the lows on the bass" and "the bass sounds boomy": low cut 45 Hz, low EQ +3→+1, notes identical. Saying it again goes to 55 Hz.
  - undo after "the mix is muddy" restores the chords' low cut to 170 Hz.
  - "turn New Recording 3 into a bassline", "turn hook idea into a bassline" (track renamed), "Turn Hook Idea into chords", "turn it into a melody" and "make the recording into notes" all give transcribe of that audio track. 0 page errors.
- Render (4 bars, Ben Böhmer drums + bass + chords):
  - bass alone: peak -1.5 / RMS -9.7 dB before, -1.1 / -10.2 after "the bass is muddy"
  - full mix: peak -0.6 / RMS -6.4 dB before, -0.6 / -6.3 after "the mix is muddy"
  - nothing clips or vanishes

## Left / for the lead
- Deploy the Worker at release for the two prompt sentences.
- `ACT.transcribe` (edit.js, studio-ux-dev): if the AI sends a `track` name that matches a notes track (for example "bass"), it does nothing instead of falling back to the newest audio track. That's a one-line fix if wanted.
- Not fixed (out of scope, existing behaviour): "turn the bass into chords" (a notes track) still gives add_bass + add_chords instead of `convert`. The `convert` phrase only accepts "it / the hum / the melody".
- Merge with preview-se-3: I didn't touch the swing lines. My maker.js edits are one block after the zip export, one line after the FX block, the removed old transcribe lines and the new function at the end of the file. The worker.js edits are inside the transcribe and track_fx lines.
