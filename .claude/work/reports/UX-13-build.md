# UX-13 build report (studio-ux-dev) · branch preview-ux-13 @ 746f97c (pushed)

## What changed
- src/edit.js: MIDI import grows the loop to fit the file (round up to 1/2/4/8/16 bars; 16 is the app's loop maximum). Every note is kept. Parts already there repeat to fill the longer loop, the same as choosing more bars in the Bars menu (setBars), so the beat sounds as before. Audio clips stay where they are. Toast: "Imported 2 MIDI tracks from long16.mid · the loop is now 16 bars". A file longer than 16 bars keeps the first 16 and says so: "The file is 24 bars and a loop holds at most 16, so 32 notes after bar 16 were left out". New undoGroup(fn) makes the whole import (tempo + bars + tracks) one Undo step. Corrupt file: "That MIDI file (corrupt.mid) couldn't be read". Audio over-length toast: "Only the first bar plays" / "Only the first N bars play".
- src/song.js: new songLoopFollow(), called from songTick. When the loop range changes while playing (the looped section was moved or resized, sections before it changed, or Undo/Redo), playback stays at the same spot inside the looped section. If that spot is gone (Shorter), it jumps to the loop's first bar at the same point in the bar, so the groove doesn't stumble. Playing from before a loop still plays into it, as in Ableton. Deleting the looped section clears the loop and playback carries on, as before. Duplicating leaves the loop on the original section.
- src/studio.js: gapless MP3. mp3Gapless() puts a LAME "Info" frame (Xing + LAME tag: 576 delay, computed end padding, frame/byte counts, seek table, tag CRC) in front of the lamejs output, for both the loop MP3 and the song MP3. I chose this over shifting the encode, because a shift can't remove the encoder's leading silence without cutting the first 25 ms of the music. WAV is untouched.
- tests/smoke.mjs: 3 new checks (long MIDI import keeps all notes and grows the loop with one Undo; the loop survives moving its section while playing; the MP3 is gapless).
- index.html rebuilt.

## How tested (headless Chrome, file://)
- check.sh: `SMOKE OK: 50 checks` / `CHECK OK` (47 before + 3 new).
- MIDI (QA's long16.mid into the "drums like Ben Böhmer" 4-bar beat): before, Melody had 16/64 notes and Drums 24/96. After: 64/64 and 96/96 (last melody note at beat 63), 16 bars, existing drums 172 → 688 (×4). One Undo gives back the 4-bar song byte-for-byte (JSON of tracks, bars and BPM identical); Redo works. 24-bar file: 64 kept, 32 dropped, with the message above. Empty song unchanged: 16 bars, 100 BPM from the file. corrupt.mid and empty.mid give friendly toasts.
- Loop, main vs branch (beat@section every 2 s after the edit):
  - A1 Full track, loop Drop 2, move it to the start. main: 263→280 in Break (left the loop). Branch: 7.6→24.2, staying in Drop 2 (loop 0-64), seamless.
  - A2 Short layout, loop Outro, move it to the start. main: ran into the Drop, then STOPPED. Branch: 7.5, 11.7, 15.8, 4.0, 8.1… (wraps in Outro 0-16).
  - B Drop 8 bars, Shorter in its 2nd half. main: STOPPED. Branch: jumps into Drop 32-48 and wraps (40.3, 44.4, 32.6, 36.7…). Longer while looping continues in the same spot. Undo of the resize while playing stays in the loop.
  - Delete the looped middle Drop: loop cleared, playback carries on in Break (131.4→143.9).
  - Notes: scheduleEvent hooked over 4 s around each edit (move/shorter/longer): 0 double triggers. Kick gaps stay 0.480-0.487 s (spb 0.484 plus drummer feel), so there's no stumble at the jump. Live voices 0 after Stop. 0 page errors.
- MP3 (Bodzin drums, 4 bars at 124 BPM), decoded with Chrome decodeAudioData and cross-correlated with renderAudio:
  - main: lag 1105 samples, 343296 samples (7.7845 s) for a 341419-sample loop. Song MP3: lag 1105, +2251 samples.
  - Branch: lag 0, 341419 samples (7.7419 s), exact. Song MP3: lag 0, 1453877 of 1453877 samples.
  - ffmpeg (what most DAWs and tools use) also decodes exactly 341419 samples.
  - Smoke: song MP3 32.97 s, peak -0.71 dBFS, RMS -6.8 dB (the audio itself is unchanged).

## Notes / limits
- A loop can hold at most 16 bars, so longer MIDI files are cut at bar 16 with a clear message. Song view can be longer, but importing into the song arrangement is a separate feature.
- Very old players that don't read LAME tags play the Info frame as 26 ms of silence. LAME has always worked this way, and Chrome, ffmpeg-based apps and DAWs honour the tag.
- No new assistant actions, no Worker or prompt changes, no UI layout changes (toasts only), so there was nothing to check per theme.
