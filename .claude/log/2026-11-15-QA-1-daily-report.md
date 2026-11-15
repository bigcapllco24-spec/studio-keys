# QA-1 daily session · 15 Nov 2026 · `main` @ 16c847a (same product code as bb3d86f)

**Verdict: main is healthy. check.sh passes: 47 checks in 1 min 58 s, no page errors in any of 14 session scripts. What shipped yesterday works: UX-2 (Play works on a new song, velocity lane visible, no sideways scroll at 390 or 360 px), UX-5 (a part sung in Song mode plays only in the selected section, with the right toast), SE-3 (the swing ladder 70 → 66 → 58 → 54 → straight).**

**4 new medium bugs and 2 low ones:**
1. "Another one" repeats grooves.
2. "Turn the voice note into a bassline" records a new voice note (offline).
3. Sung basslines stutter (a 1/16 stub, then the same note again).
4. Offline, "turn the melody down" adds a melody and "kick punchier" replaces the drums.
5. (low) "Straighten it a bit" goes fully straight.
6. (low) The sing reply suggests what you just asked for.

**For the lead:** on main, the note editor's keyboard shortcuts (Delete, Ctrl+A/C/V/D/X/Z, arrows) do nothing if your last action was typing to Keys. Clicking the editor canvas leaves focus in the Keys box. This happens in Loop mode too, so it's wider than the Song-mode case in UX-7's title. I checked that preview-ux-7 fixes it (the canvas now takes focus, 6/6 click types). Not filed; it ships with UX-7.

## check.sh
```
PASS bundle syntax · PASS worker syntax · … (47 checks, all PASS)
PASS phone width has no sideways scroll · 390 px
PASS "more swing" is full triplet swing (off-16ths 1/12 beat late) · 0.083 beat
PASS "less swing" steps down (66 → 58 → 54 → straight) …
PASS no page errors
SMOKE OK: 47 checks
CHECK OK   (1 min 58 s)
```
Full log: /tmp/qa/2026-11-15/check.log

## Bugs (ranked)

1. **"Another one" gives back grooves you already had** · assistant (and engine) · MEDIUM
   - Steps: new song → type "drums like Ben Böhmer" → type "another one" 8 times.
   - Happens (on the 16th grid, against every earlier try in the same song):
     - Ben Böhmer: 0.79, 0.93, 0.87, 0.91, 0.86, **1.00, 1.00**, 0.86. Tries 6 and 7 are note-for-note repeats.
     - Stephan Bodzin at 124: 0.80, 0.85, then 0.97 for each of tries 3 to 8 (0.93 without the hats).
     - "house drums": try 5 = 1.00.
   - Only 5 or 6 of the 8 replies are different text.
   - The kick, clap and hats never change. Only the percussion pair (congas, rims, toms) and the 8-bar fill rotate, and there are only a few of each.
   - The seed is Math.random, so these are real repeats, not a test artifact.
   - Should: every "another one" is a groove you haven't heard in this song (the owner's north star).
   - Files: `vary` / `regenTrack` in src/actions.js, `makeGroove` in src/groove.js.
   - Not AI-1: AI-1's "another one" item is about Song-mode pattern B.

2. **"Turn the voice note into a bassline" records a new voice note** · assistant · MEDIUM (Basic mode, and whenever the AI call fails)
   - Steps: Import audio (tests/fixtures/sing.wav, or any recording) → type "turn the voice note into a bassline".
   - Happens:
     - "Recording a voice note after the count-in: 4 bars". The mic records into a new track, "Voice note 1".
     - Then Keys says: "Saved 'Voice note 1'… Say 'Keys, turn the voice note into a bassline' to play it on an instrument." Saying that records another one, so it loops (screenshot 14, top).
   - Should: convert the existing recording (transcribe), as Turn into notes… → Bassline does.
   - Cause: src/maker.js line 67 `/voice note|record (my )?voice…/` is checked before the "turn … into bass/chords/melody" rule on line 68.
   - Not changed on preview-ai-1, ai-4, se-7, ux-5 or ux-7.

3. **Sung bassline stutters: a held note becomes a 1/16 stub plus the same note again** · studio · MEDIUM
   - Steps: "124 bpm drums like Ben Böhmer" → "let me sing the bassline" → sing (fake mic: sing.wav has steady notes with 0.1 s gaps).
   - Happens: 11 to 13 notes, 2 to 4 of them doubled.
     - Take 1: A2@0.5 (1/16) then A2@0.75; G2@3 (1/16) then G2@3.25.
     - Take 2: G2@8.75/0.25 then G2@9/1.48; G2@12.5/0.25 then G2@12.75/2.
   - The same file through Import → Turn into notes gives clean notes (one chord or note per sung note).
   - Evidence: the PCM that `TAKE.finish` (src/studio.js) builds had **87 runs of exact zeros, each 256 to 768 samples (5 to 16 ms)**, inside sung notes.
     - Chunks are placed by `AudioContext.currentTime` at each ScriptProcessor callback, so callback jitter leaves holes.
     - `audioToNotes` (src/edit.js) then sees each level jump back up as a re-attack (`reatt`) and splits the note.
   - Fix idea: write chunks back to back (a running sample counter, aligned once at the start), or ignore a re-attack right after a run of exact zeros.
   - Seen in headless Chrome on a busy machine (load 5 on 2 cores). A real laptop with main-thread jitter likely hits it too.
   - Not UX-3: UX-3 is about getting two bass tracks. Here one track has stuttering notes.

4. **Offline, mix words about a part add or remake that part** · assistant · MEDIUM
   - Steps: Basic mode → "make a track like Stephan Bodzin", "add a bassline", "add a melody" →
     - "turn the melody down a bit" → "Melody 2 (new track)": two identical melodies, so it's louder, not quieter.
     - "make the kick punchier" → a whole new drum pattern; the groove you had is gone (Undo recovers it).
   - localBrain gives `add_melody` / `add_drums` for these on main and on preview-ai-4 (checked). AI-4 fixes "the bass is muddy" but not these.
   - "melody quieter" already works (mix -12).
   - Should: change level or tone, and never add or replace a part for a mix sentence.

5. **"Straighten it a bit" removes all the swing** · assistant · LOW
   - From heavy swing (70%):
     - "too swingy, straighten it a bit" → "Straight, no swing". "straighten the hats a little" does the same.
     - "too swingy" and "less shuffle" step down correctly (→ 58).
     - "a bit straighter", "a little less bounce" and "make it bouncier" do nothing; the fallback suggests "add a trap beat at 140".
   - Cause: `\bstraighten\b` in swingSaid's no-swing rule is checked before the "a bit less" rule (src/maker.js).

6. **The sing reply suggests what you just asked for** · assistant · LOW
   - "let me sing the bassline" → "Done: Sing the bassline after the count-in: 4 bars. **Bassline next? Say 'add a bassline', or sing it: 'let me sing the bassline'.**" This plays during the count-in.
   - nextStep() (src/assistant.js) runs before the sung part exists.

## Covered by a waiting branch or known (not filed)
- Editor shortcuts dead after typing to Keys: fixed on preview-ux-7 (verified; see the note for the lead above).
- "the bass is muddy" remakes the bassline: fixed on preview-ai-4 (verified: low cut).
- Pads buried (SE-1): in the Bodzin loop the chords are -23.2 LUFS, against drums -7.5, bass -11.2 and melody -17.7.
- Song energy is flat (13/14 Nov idea, already in requests): Short layout, Intro -7.8, Drop -8.1, Outro -7.9 LUFS, LRA 0.4 LU. The Drop, with every part playing, is a little quieter than the Intro.
- Phone layout (UX-4): on main the Loop/Song switch and Play are far below Keys at 390 px. There's no tab bar yet.

## Rough edges
- **Whole-song MP3 is very slow, and its status doesn't move.** On the 120-bar, 9-track song, the status read "bar 1 of 120" for 3.5 min and "bar 17" for another 3.5 min. It reached only "bar 49 of 120" after 15 min, and I stopped it. The machine was busy (other agents, load 5 on 2 cores), so real laptops will be faster. But the label only updates every 16 bars, so it looks frozen. A percentage or per-bar progress would help.
- Each Keys reply repeats its text in a monospace chip box under it. On a 390 px phone that doubles the reading (screenshot 21).
- "more groove" makes a new drum pattern (fine). The fallback reply still suggests a trap beat when the vibe is Böhmer (known).
- A part sung over drums only sets the song key from the singing (A minor from C E G A C G). Good, just noting it.

## What I checked (with numbers)
**1. Beat by reference (typed into the Keys box, Basic mode)**
- "drums like Ben Böhmer": 1 Drums track, Melodic House Kit, 122 BPM, 172 hits, reply in about 1.6 s.
- "another one" ×3: still 1 track, same kit and tempo. 16th-grid similarity 0.78 / 0.78 / 0.98 to the first; the third try is nearly the first again (bug 1).

**2. Swing in my own words**
- "give it more shuffle" → 66%. "swing it harder" → 70% ("the most it goes"). "add a bit of swing back" → 54%. "make it straight" → "Already straight".
- "tighter, less swing" 70 → 66. "swing at 60%" → 60.
- Mistakes: bug 5.

**3. Singing a bassline over the beat (fake mic)**
- During the take: state 'take', only drums audible, mic on. After: mic off, no audio track added, no live playback.
- 13 notes in A minor, which match the sung pitches (stutter: bug 3).
- Drums + sung bass loop: -7.5 LUFS, peak -0.74 dBFS, 0 clipped. The bass alone is -12.1 LUFS.

**4. Piano roll (real mouse and keys)**
- Box-select bar 1-2: 7 notes. Dragged +1 beat and +2 semitones (A2@0.5 → B2@1.5).
- Velocity drag on a selected bar: all 7 went from 0.98-1.0 to 0.39-0.41.
- Draw click adds a note, right-click deletes it.
- With the editor opened by double-clicking the clip:
  - Ctrl+C/V: 48 → 60 notes. Ctrl+D: 72. Arrow Up: +1 semitone. Arrow Right: +1/16. Delete: 60. Ctrl+A: 60 selected. Ctrl+X: 0.
  - Ctrl+Z ×6 back to 48; Ctrl+Shift+Z redoes.
- Editor shortcuts after typing to Keys: see the note for the lead.

**5. A full track like Stephan Bodzin, one part at a time**
- Vibe and drums first (124 BPM, A minor), then the bassline (Rolling Bass), chords (Deep Pad) and melody (Melodic Pluck). Each reply suggests the next step.
- Loop render: -8.1 LUFS, peak -0.25 dBFS, 0 clipped, no silence.
- "more reverb on the chords" → Reverb 62%. Mix words: bug 4.

**6. Voice note → chords**
- Importing sing.wav gives the toast "Added 'sing' (4.6 s)…".
- Turn into notes… → Chords gives "sing → chords" (Deep Pad), 6 chords / 18 notes: C, Em, G, Am, C, G, each starting on a sung note, with smooth voice-leading (screenshot 12). The audio is muted and the editor opens.

**7. Make it a song and edit sections**
- The menu offers Short (16 bars · 0:31), Full track (96 bars · 3:06) and Just the loop.
- Full track: Intro, Build, Drop, Break, Drop 2, Outro in Song mode.
- Right-click Break → Longer (16 → 24 bars). Drop → Duplicate ("Drop 3"). Outro → Delete. Undo brought the Outro back.
- Double-clicking a section name opens rename (checked with a real dblclick event sequence).
- Sing the chords with the Break selected: 9 chords, plays only in the Break, toast "'Sung chords' plays in Break…".

**8. Save and reopen (persistent profile, Chrome closed and reopened)**
- The Save button shows "Saved 7:10 AM". After the restart the app opens a new empty "Untitled song".
- Open song… lists "QA Afterlife · 124 BPM · 120 bars · 3:52 · 9 tracks".
- Reopening: sections, tracks and note counts and BPM are identical, Song mode, both audio clips restored (4.6 s and 7.7 s). Play works ("2 . 1 Intro").

**9. MP3 export (Download MP3 button, Song mode)**
- Short layout with drums, bass, chords and melody: "QA Short Band 124bpm song.mp3", 33.02 s (31.0 s layout + tail), 192 kbps, 44.1 kHz stereo. Made in 183 s on the busy machine.
- ffmpeg: integrated -8.0 LUFS, LRA 0.4 LU, sample peak -0.33 dBFS, RMS -6.9 dB, no silence inside (silencedetect -60 dB / 0.3 s found none).
- Full 120-bar song: see rough edges.

**10. Phone widths (touch emulation)**
- 390 and 360 px: scrollWidth = innerWidth (no sideways scroll).
- The Keys box works.
- The note editor scrolls inside its own box (scrollWidth 1102 vs 284/254 px client).

**Console:** 0 page errors. Only the blocked Google Fonts request (sandbox) shows.

## Could not test
Live AI (Workers AI/Claude), real speech recognition and wake word, spoken replies, Spotify, real MIDI hardware (stubbed), real phones, and MP3 speed on a quiet laptop.

## Files
- Screenshots: /tmp/qa/2026-11-15/shots/. The key ones:
  - 02-drums-bohmer, 05-singing-bass, 06-after-sing-bass, 07-editor-bass, 08-editor-edits
  - 09-editor-focus, 12-voice-note-chords, 13-make-song-menu
  - 14-song-full (shows bug 2's replies at the top), 15-song-edited, 16-song-sung-chords
  - 18-open-list, 19-reopened, 20-23 phone 390/360
- MP3: /tmp/qa/2026-11-15/dl/QA Short Band 124bpm song.mp3
- Session scripts: /tmp/qa/2026-11-15/js/ (lib.mjs, p1-p9.mjs, phr.mjs). Log: /tmp/qa/2026-11-15/session.log
- I checked preview-ux-7 and preview-ai-4 in temporary worktrees, built with tools/build.py; I removed both afterwards. Nothing was committed or pushed.
