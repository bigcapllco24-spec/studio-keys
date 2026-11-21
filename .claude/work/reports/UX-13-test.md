# UX-13 branch check (qa-tester) · preview-ux-13 @ 746f97c · 17 Nov 2026

## Verdict: READY

All three bugs are fixed, and I measured each one. I found no regressions near the change. The only FAIL I hit was the known load-sensitive save/reopen pair in the smoke test. It failed on the first run while the other tester was also running (load about 3-4 on 2 cores), then passed on two reruns. It fails the same way on main and on other branches (see the UX-1, SE-8, UX-10 and AI-8 reports), and this branch doesn't touch that code.

## 1. check.sh
- Run 1 (load about 3-4, the other tester running): 48 of 50. FAIL "opening the app starts a new empty song…" and FAIL "Undo right after opening a song…". The test reopened the older "Smoke sing" save because the rename's autosave hadn't landed yet. Time 2 min 46 s.
- Smoke rerun: `SMOKE OK: 50 checks`.
- Full rerun: `SMOKE OK: 50 checks` / `CHECK OK` in 114 s. index.html is current (no rebuild note), and the worktree is clean.
- The 3 new lines pass: long MIDI import (64 notes, 16 bars, one Undo), loop survives a move (range [0,64], still in the moved section), gapless MP3 (341419 of 341419 samples).

## 2. The bugs, with my own repro scripts (main 5f3714d vs branch)
**Bug 1: long MIDI import. FIXED.** "Drums like Ben Böhmer" (4 bars), then import long16.mid:
| | main | branch |
|---|---|---|
| Picker | Melody 16/64, Drums 24/96, 4 bars | 64/64, 96/96, 16 bars, last note at beat 63 |
| Drag-in | same cut | 64/64, 96/96 |
| Toast | "Imported 2 MIDI tracks" | "Imported 2 MIDI tracks from long16.mid · the loop is now 16 bars" |
| Existing drums | — | 164 → 656 (×4), each 4-bar block identical to the original |
| 1 Undo | — | byte-identical to before (tracks, bars, BPM); Redo works |
- 2-bar file: stays 4 bars, 8/8 notes. 5-bar file: grows to 8 bars, 20/20. A 4-bar file into an 8-bar loop stays 8 bars. 24-bar file: 16 bars, 64 kept, and the toast says "The file is 24 bars and a loop holds at most 16, so 32 notes after bar 16 were left out". Each one is identical after one Undo.
- A 100 BPM file into the 122 BPM beat leaves the tempo alone. Into an empty song, the file's tempo is used as before (long16 at 100, type0_tempo at 90).
- Import while the loop plays: playback keeps going, 0 errors.
- Import into an arranged Full track (Drop split, Drop looped and playing): the song stays 96 bars and the sections don't change. The existing drums and bass play exactly the same notes at the same song times (39118 events before and after). The new parts land in Drop, the loop stays [128,160] and playback carries on. Undo is identical.
- Wording: corrupt.mid now gives "That MIDI file (corrupt.mid) couldn't be read" (main showed the raw DataView error). Audio in a 1-bar loop says "Only the first bar plays"; 2 bars says "Only the first 2 bars play".

**Bug 2: looped section in Song view. FIXED.** Playhead positions (beat@section), sampled every 2 s:
- A. Full track, loop Drop 2, move it to the start. Main: 264.7@Break … 285.5@Break (left the loop). Branch: 3.6, 8.7 … 29.5, all in Drop 2. Real mouse drag: 5.5 → 27.4, in Drop 2.
- A2. Short, loop Outro, move it to the start. Main: ran into the Drop, then STOPPED at 48. Branch: 8.7, 12.9, 1.0, 5.2… (wraps inside Outro 0-16).
- B. Short, loop Drop (8 bars), Shorter to 4 in its second half. Main: Outro, then STOPPED. Branch: jumps 36.5 → 17.0 (same place in the bar) and wraps 22.2, 26.4, 30.5, 18.7… Real mouse edge drag: same result, 17.5 then wrapping.
- B2. Full track, loop Drop, Shorter (−8 bars) from the right-click menu at beat 163. Main: plays on into the Break. Branch: 131.8 and stays in Drop [128,160].
- Around every edit: 0 double triggers (same note on the same track within 4 ms). Kick gaps 0.461-0.493 s against 0.484 expected, so no stumble. 0 page errors.
- Nearby, all fine on the branch: Undo of the move while playing (stays in Drop 2), Longer (+8) while looping, duplicating the looped section in front of itself (the loop stays on the original, same spot), moving another section in front of the loop, a tempo change while looping, switching the loop to another section, loop off (plays on), deleting the looped section (loop cleared, plays on in the Break), and a loop moved behind the playhead while playing from the Intro (jumps into it). A bar-range loop (bars 33-36) stays on those bars when sections move, as before.

**Bug 3: MP3 starts 25 ms late. FIXED.** Decoded in Chrome (decodeAudioData) and cross-correlated with the app's own render (same random seed):
| Case | main (17 Nov session) | branch lag | branch length |
|---|---|---|---|
| 4 bars @124, 1 loop | lag 1105, 343296 samples (+1877) | 0 | 341419 = 341419 |
| 4 loops | — | 0 | 1365676 exact |
| About 1 minute | — | 0 | 2731352 exact |
| 1 bar @100 | — | 0 | 105840 exact |
| 8 bars @128 | — | 0 | 661500 exact |
| 16 bars @128 | — | 0 | 1323000 exact |
| Song MP3, Short layout | lag 1105, 1456128 samples | 0 | 1453877 exact, peak −0.63 dBFS |
- ffmpeg decodes every file to the exact sample count with 0 warnings and reads the "LAME3.100" tag. FYI: ffprobe's container duration still says 7.78 s (its estimate ignores the gapless trim), but the decoded audio is exact.

## 3. Not caused by UX-13 (main behaves the same; for the board, not blocking)
1. **Medium (speed): long loops render very slowly.** Offline render time, Bodzin drums + bass at 128 BPM, headless on an idle 2-core machine: 4 bars (7.5 s of audio) 13 s; 8 bars (15 s) 40 s; 16 bars (30 s) 155 s. Doubling the length costs about 3.5× the time. A 16-bar loop MP3 took about 3 min to make on both main and the branch (render 137-206 s, MP3 178-183 s). UX-13 makes 16-bar loops much more common (any long MIDI import), so "Download MP3" after an import will feel stuck. Likely in `renderAudio` (src/studio.js) or the engine: studio-ux-dev / sound-engine-dev.
2. **Low (Song view): double-clicking a section almost always renames it instead of looping.** The name covers 122 of the 149 px of a section block, and a double-click on the name starts a rename, so the loop only works on the right ~25 px. Right-click → "Loop this section" or Ctrl/Cmd+L works. src/song.js line 427 with `.sec .sname{flex:1 1 auto}` in src/head.html. studio-ux-dev.
3. **Low: in Song view, the import toast gets replaced right away** by "'Drums' plays in Drop. Click its empty parts…", so the user never sees "the loop is now 16 bars". studio-ux-dev.
4. **Test upkeep (mine):** the save/reopen smoke pair still flakes under load. I can make it wait for the autosave instead of a fixed 600 ms if the lead wants a QA item.

## Try steps for the test link (for the owner)
1. Ask "drums like Ben Böhmer", then press **Import audio / MIDI** and pick a 16-bar MIDI file. The message says "the loop is now 16 bars" and the whole melody is there. Press **Undo** once and you're back to the 4-bar beat.
2. Choose **Make it a song → Full track**. Right-click **Drop 2 → Loop this section**. While it plays, drag Drop 2 to the start: it keeps looping Drop 2 and doesn't run on to the end.
3. Right-click the looped **Drop → Shorter (−8 bars)** while the playhead is in its second half. It jumps back into the shorter Drop on the beat and keeps looping.
4. **Download MP3** (1 loop) and play it on repeat in any player or DAW. It starts right on the kick and loops with no gap.

## Files
- Scripts: /tmp/qa/ux-13/js/ (a-import, b-loop, c-mouse, d-mp3*, e-songimport, f-phone, g2-scale), log /tmp/qa/ux-13/session.log
- check logs: /tmp/qa/ux-13/check.log (run 1), /tmp/qa/ux-13/check2.log (clean)
- MP3s: /tmp/qa/ux-13/dl/
- Screenshots: /tmp/qa/ux-13/shots/branch-a1-after-pick.png, branch-a4-toast.png, branch-a6-playing-after-import.png, branch-b-a1-after-move.png, branch-c2-after-drag.png, branch-c3-after-resize.png, branch-c4-after-shorter.png, branch-e-song-after-import.png, branch-f-phone-toast.png (the 24-bar toast fits at 390 px, no sideways scroll)
