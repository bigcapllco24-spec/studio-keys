# UX-2 branch check (qa-tester) · 13 Nov 2026 · `preview-ux-2` @ 3cef56f

**Verdict: READY.** All 4 bugs are fixed when I repeat my original steps with real clicks and keys. I found no regressions in the transport, undo/redo, New song, Open song, the editors at 1400x1100 and 1024x768, sung bass and melody, or the tablet layout. Nothing on this branch blocks gate 2. I found 2 old bugs that main has too and 2 low edge cases; they are listed below for the lead to file.

## check.sh
```
PASS bundle syntax
PASS worker syntax
PASS drums like Ben Böhmer at 124 · 164 hits, kitMelodic
PASS "another one" makes a different groove
PASS track like Stephan Bodzin (drums, bass, chords, melody) · drums:kitDeepTechno:128 bass:rollbass:48 chords:darkpad:20 melody:mhpluck:64
PASS note editor copy/paste and undo · 20→23→20
PASS velocity lane visible; dragging a selected bar moves all selected · 0.9 0.7 0.9 0.7 0.9 0.7 0.7
PASS MP3 download (4 loops, decodes back) · 727 KB, 31.0 s
PASS track FX: panel, add effect, assistant reverb, sidechain preset
PASS select two tracks and play them together · 2 audible
PASS "add a choir" / "add a melody" make new tracks · Choir, Choir 2, Melody 2
PASS "make a track like…" starts with drums only · ["vibe"]
PASS plays the song
PASS Play button plays a new song made by the assistant
PASS import MIDI + audio, turn audio into a bassline · Lead:notes, Kick:notes, sing:audio, sing → bassline:notes
PASS while singing, only the drums play
PASS sing the bassline → bass track · 10 notes
PASS a sung part doesn't add your raw voice as an extra track
PASS your voice isn't played back live while you sing, and the mic turns off after
PASS humming isn't mistaken for talking
PASS sung chords: on the beat, no repeats, each ≥ 1 beat · 9 chords, shortest 1 beat
PASS save and reopen a song · Smoke sing 4
PASS phone width has no sideways scroll · 390 px
PASS no page errors
SMOKE OK: 22 checks
CHECK OK   (1 min 18 s; was 46 s, still under the 3-minute budget)
```
The 4 new smoke checks look right to me: each one tests the bug as a user would hit it, and the developer showed they fail on main.

## The 4 fixed bugs, repeated with my original steps

1. **Play on a new song (was HIGH): FIXED.** Steps: open the app, type "124 bpm drums with hats and claps like Ben Böhmer", then click ▶ Play.
   - Result: it plays. The state goes empty → stopped → playing, and the pill reads "Song ready · 4 bars", then "Playing · 4 bars".
   - Same result for New song → "add chords" → Play, and for New song → "add a bassline" → controller ▶ PLAY.
   - The Loop button on a ready song now plays it. Before, it started a count-in recording.
   - Space still does nothing, because the app has no Space shortcut. The developer suggests adding one as a follow-up; I agree.
2. **Velocity lane and group drag (was MEDIUM): FIXED** at 1400x1100 and 1024x768, with real mouse and keys.
   - When the editor opens, the lane is inside the box and on screen. Chords and melody: canvas 469 px in a 471 px box, no inner scroll, 31 rows at 13 px. Drums: 13 rows at 24 px, 378 px canvas.
   - Melody, 32 notes, Ctrl+A, then Shift+click to drop the last note (31 selected).
   - Plain drag on a selected bar: 0.7/0.5 alternating became 0.9/0.7 for all 31, differences kept. The unselected note stayed at 0.5. 1 undo step.
   - Alt+drag: all 31 set to 0.4. 1 undo step.
   - Dragging the unselected bar changed only that note (0.5 → 0.2).
   - Dragging past the top clamps at 1.
   - 4× Ctrl+Z restored every velocity exactly, and the editor stayed open.
   - Hint text: Draw mode says "Bottom lane sets loudness: drag a selected bar to move all selected, Alt sets them equal". Select mode says "Bottom lane sets the loudness of the selected notes". Both read well.
3. **Sung chords choppy (was MEDIUM): FIXED.** Steps: "124 bpm drums like Ben Böhmer" → "let me sing the chords" → sing (fake mic, sing.wav).
   - Result: 8 chords, all on whole beats, no repeats back to back, no gaps, shortest 1 beat: `1+1 Am · 2+1 C/G · 3+4 G · 7+2 Em/G · 9+1 G · 10+1 Am · 11+2 C/G · 13+3 G`.
   - The message counts correctly: "8 chords built on the notes you sang". Only the drums played during the take, and the mic was off after.
   - I fed the same sung notes to main's code: 10 chords starting at 0.75, 1.5, 2.75, 7.25, 8, 8.5 … with lengths of 0.48 to 0.73 beats. So the old problem is gone.
   - Edge inputs (one note, one note held all song, notes at the very end, slow singing, fast 8th notes, repeated note, a 1-bar song): no errors, no overlaps, nothing past the song end. Slow singing gives 4 one-bar chords. Fast 8th notes give a chord on every beat (16 in 4 bars), as the brief allows.
4. **Phone sideways scroll (was LOW): FIXED.**

   | Window | scrollWidth on main | scrollWidth on branch | Knobs on branch | Mixer cards end |
   |---|---|---|---|---|
   | 390x844 | 401 | 390 | 2 rows of 4, right edge 323 px | 349 px |
   | 360x740 | 401 | 360 | 2 rows of 4 | 319 px |
   | 414x896 | 414 | 414 | 2 rows of 4 | 373 px (main: 401) |

   - scrollTo(200, …) leaves scrollX at 0 on the branch. Main moved 11 px at 390 and 41 px at 360.
   - Tablet 1024x768 gives the same numbers on both: knobs 1 row of 8 ending at 945 px, mixer 2 columns (508/983 px), no overflow.

## Regression sweep near the change (all on the branch, real clicks)
- **Transport** (`t1.mjs`): 25 of 29 checks passed. The 4 failures were mistakes in my script: one undo case is covered under pre-existing bug A, and the loop length is free by default so the loop doesn't close itself. I reran both correctly in `t1b.mjs`.
  - Play, Stop, controller PLAY and STOP all work.
  - Loop button: play → overdub → played 4 keys → Loop again keeps them (172 → 176 events, new "Grand Piano" track) → playing.
  - Rec from stopped: count-in, then overdub; Stop gives stopped.
  - New song gives empty and "Studio empty"; Play there does nothing.
  - Deleting every track (two-click confirm) gives empty and "Studio empty".
  - First loop on an empty song: Loop → count-in → recording → played 8 keys → Loop closes it → playing a 3-bar loop.
- **Undo/redo of tracks:** on a fresh song, undoing back to 0 tracks gives empty with Play disabled. Redo gives stopped, and Play plays. Undo while playing keeps playing.
- **Open song:** save → New song → open gives stopped, and Play plays.
  - Reload with a saved song (persistent profile): restored as stopped, and Play plays.
- **Takes on empty songs** (`t5.mjs`):
  - "let me sing the bassline" with no tracks: count-in → Sung bassline → playing, mic off.
  - "record a voice note" on a new song: "Voice note 1" audio track → playing.
  - Importing sing.wav into a new song: stopped, then Play plays.
  - The "Sing a melody" button over drums: Sung melody, playing.
- **Sung bass and melody unchanged:** same input notes on main and branch give identical output (bass 11 → 11 notes, melody 14 → 14, byte-for-byte equal). Real takes: bass 11 notes on Sub Bass, melody 14 notes in C major on Melodic Pluck. Only the drums were audible during each take, and the mic was off after each.
- **Piano roll:**
  - The mouse wheel scrolls pitch (ED.top 90 → 114 → 54) and doesn't scroll the page (scrollY unchanged).
  - The "▲ 8 higher (scroll)" hint shows when notes are out of view.
  - 31 rows is enough for the chords and melody on open.
- **Drum editor:**
  - Clicking step 6 on the Kick row adds a hit (172 → 173).
  - Lane drag changes only that hit (0.96 → 0.30).
  - Labels are centred on their rows.
- **Console:** 0 page errors and 0 warnings in every run (apart from the blocked Google Fonts request in the sandbox).

## Problems found
None caused by UX-2. Old bugs and edge cases, for the lead to file or skip:

A. **Undo after New song brings back the previous song's tracks** · studio · MEDIUM · also on main (same numbers on both builds)
   - Steps:
     1. "124 bpm drums like Ben Böhmer", then "add a bassline".
     2. Click New song.
     3. "add chords".
     4. Click Undo.
   - Happened: the new song now has Drums and Bassline from the old song. A second Undo leaves just Drums.
   - Should: undo history starts fresh with each new or opened song. Undoing "add chords" should leave an empty song.
   - Suspect: `newSong`/`loadNamed` in `src/daw.js` don't reset `UNDO` (`src/edit.js`). Owner: studio-ux-dev.

B. **Recording a loop makes one undo step per note** · studio · LOW · also on main
   - Steps: on an empty song, press Loop, play 8 keys, press Loop to close, then press Undo.
   - Happened: the undo stack grew by 9 for one recording, and Undo removes one note at a time.
   - Should: one recording = one undo step (Ableton).

C. **Drum kits with more than about 25 pieces push the velocity lane out of view again** · studio · LOW · edge case
   - Steps: a drum track using 31 different notes (for example an imported General MIDI drum file with many toms and percussion) → Edit notes.
   - Happened: rows stop shrinking at 16 px, so the canvas is 562 px in a 480 px box. The box scrolls 84 px inside, and the lane is hidden until you scroll. The kits the assistant makes (13 rows) are fine.
   - Also: the drum editor's mouse wheel does nothing, so the only way down is the box's scrollbar.

D. **Chord velocity bars overlap** · studio · LOW · also on main
   - Steps: open Chords with nothing selected, then drag a chord's bar.
   - Happened: only 1 of the 5 stacked notes changes, because all 5 bars sit at the same x.
   - Workaround: select the chord first; the new group drag then moves all its notes.
   - Should: maybe treat a drag on a stacked bar as the whole chord.

Cosmetic (not filed):
- At phone width, the K6 knob label is cut to "BEAT RE…".
- At 1024 px, the drum grid in an 8-bar song is wider than the box (184 px sideways scroll inside the editor). It was like this before.

## Screenshots (/tmp/qa/ux2/shots/)
- Transport: `t1-01-playing-after-drums.png`, `t1-02-after-delete-all.png`, `t1-04-reopened.png`
- Editor 1400x1100: `t2-1400x1100-chords-open.png`, `t2-1400x1100-melody-open.png`, `t2-1400x1100-melody-groupdrag.png`, `t2-1400x1100-melody-wheel-up.png`, `t2-1400x1100-drums-open.png`, `t2-1400x1100-drums-bigkit.png`
- Editor 1024x768: `t2-1024x768-chords-open.png`, `t2-1024x768-drums-open.png`, `t2-1024x768-drums-bigkit.png`
- Sung chords: `t3-after-sung-chords.png`, `t3-playing-sung.png`
- Phone and tablet: `t4-branch-390-knobs.png`, `t4-branch-390-mixer.png`, `t4-branch-360-top.png`, `t4-branch-1024-knobs.png`, plus the `t4-main-*` versions for comparison
- Reload: `t5-after-reload.png`

Scripts: `/tmp/qa/ux2/js/` (lib.mjs, t1, t1b, t2, t2w, t3, t3cmp, t3edge, t4, t5). Set `ROOT=/home/claude/studio-keys-repo` to run any of them against main.
