# UX-1 Song view · branch check (qa-tester rerun, 13 Nov 2026)

## Verdict: NOT READY (one medium bug, a small fix). Everything else passes.
check.sh: CHECK OK, smoke 27/27 (after a test-timing fix, below). Old songs from main open and play identically. The branch does not make the loop MP3 slower.

## Bugs
1. **Double-clicking a part to edit it switches the part off when the two clicks are more than about 0.23 s apart** (medium, studio-ux-dev, `src/song.js` part click handler, around line 395: single click toggles after a 230 ms timer; the dblclick handler only clears the timer, so a slower double-click has already toggled).
   - Steps: make a beat, bass and chords; Make it a song ▾ → Full track; double-click the Bassline block in Drop 2 at a relaxed speed (about 0.3 s between clicks; OS double-click allows up to 0.5 s; a double-tap on a tablet is often this slow).
   - Expected: the editor opens on Drop 2's bassline and the part stays on.
   - Actual: the editor opens, but the Bassline in Drop 2 is switched off (dashed). Notes you edit are not heard in that section until you notice and switch it back. Measured with real mouse input: gaps 100 and 180 ms OK; 260, 350 and 450 ms toggle the part off. This is try step 4 for the owner.
   - Fix idea: in the dblclick handler, undo the toggle if the timer already fired (or keep the part's state from before the first click).

## Rough edges (low, not blocking)
2. **Tablet ⋯ button is small.** At 1024 px with touch (pointer: coarse), the section ⋯ button is 21×23 px; it is the only way to the section menu on a tablet (no right-click or long-press). The build report says 44 px targets; the zoom buttons are 44×44, the ⋯ isn't.
3. **Section names unreadable at 1024 px for a full track.** At Fit zoom the strip shows "Br…", "B…", "D…", "O…"; Drop, Drop 2 and Drop 3 all read "D…" (the ⋯ takes the room). Screenshot w1024-menu.png.
4. **Undo chip shows a stale label.** After Full track, the chip "Full track: … Undo" stays 7 s. Toggling a part doesn't update it, so pressing that Undo undoes the part toggle, not the layout the chip names.
5. Opening a song from the list leaves the save label reading "New song" (from the new-song-on-open toast) until the next save.

## What I checked (with numbers)
**Step 1: smoke checks (commit 80cf953).** The 9 Song view checks are sound and match the developer's list (the MP3 check uses the Short layout, drums only).
- First run: FAIL on "opening the app starts a new empty song; the last one reopens from the list intact" (it reopened the older "Smoke sing" autosave). Cause: test timing. `keepLastSong()` runs async after load, and the check read IndexedDB 2.5 s after reload while the machine was busy (the MP3 check took 64 s instead of 24 s). Not a product bug: the same flow passes in my session tests.
- Fix (tests only, commit f679ca1, pushed to preview-ux-1): after reload, wait for the save label to read "New song" (up to 15 s). Then two full runs: CHECK OK, 27/27. Whole check took 1 min 40 s under load (under the 3-minute limit).

**Old song saved by main's build, opened in the branch (same browser profile).**
- main: "Old main song" (122 BPM; Drums 168, Bassline 24, Chords 20 notes), saved.
- branch: opens a new empty "Untitled song". Toast: "New song. “Old main song” is saved: open it again from Open song…". The list shows it (122 BPM · 4 bars · 3 tracks); it reopens intact as one auto "Main" section in Loop mode.
- Loop playback, one loop: main 234 scheduled notes (212 unique), branch 234 (212 unique). Instrument, note, beat, length and velocity are all identical.
- Song mode on that song plays one loop (212 notes) and stops. No page errors.

**Producer session at 1400 px, Emerald (real mouse and keys).**
- Beat, bass and chords from the offline brain: Drums 132, Bassline 48, Chords 20 notes at 124 BPM.
- Make it a song menu:
  - The three choices read "Short · Intro 4 · Drop 8 · Outro 4 (0:31)", "Full track (96 bars · 3:06)" and "Just the loop".
  - Short switches to Song mode, 16 bars · 0:31. Started at bar 15, it played and stopped by itself.
  - Full track gives 96 bars · 3:06, with an Undo chip.
- Part clicks toggle the part. The Undo chip and Ctrl+Z both undo it.
- Section edits:
  - Dragging the edge made the Intro 16 → 20 bars.
  - Dragging the Break before the Build reordered them.
  - Alt+drag copied a Drop to the end as "Drop 3".
  - Ctrl+D made "Outro 2" and Delete removed it.
  - Split in half: Outro 16 → Outro 8 + Outro 2 8.
  - Arrow keys select, Alt+→ moves, Space plays and stops, Ctrl+L loops the selected section and plays.
- Make unique for Drop 2 (button in the editor):
  - The editor row reads "Pattern B plays only in Drop 2 · Pattern A plays in Build, Drop".
  - A note drawn with the mouse goes to B only (A 48, B 48 → 49). Ctrl+Z and Ctrl+Y work.
  - Song notes: Drop has 192 bass notes, Drop 2 has 196.
- Clicking the ruler at bar 33 played from 33 . 1. Right-clicking the Break → Loop this section gives the brace and the chip "Looping Break".
- Sing a bassline in Song mode (fake mic, Drop selected):
  - During the take the studio is in Loop mode, recording the take.
  - Afterwards it's back in Song mode and playing. "Sung bassline" (7 notes) plays in [Drop] and the mic is off.
- Reload:
  - A new empty song opens in Loop mode.
  - The list shows "QA Song view · 124 BPM · 116 bars · 3:45 · 4 tracks".
  - It reopens intact: the same song summary and tracks, including the sung part.
- 390 px phone:
  - The song map shows 7 blocks with bar counts.
  - Tapping Drop 2 loops beats 256-320 and plays. Tapping it again stops the loop.
  - No horizontal scroll.
- 1024 px: no horizontal scroll, and the section menu works from ⋯ (see items 2 and 3 for the problems).
- Themes: Emerald, Velvet and Sapphire are all readable. The song styles use only CSS variables (plus one rgba shadow, the same as the other menus), and the song canvases use TC.
- No page errors in any run. The only console errors are the expected blocked network calls.

**Step 3: loop MP3 export time, same 8-bar loop (seeded, identical notes: kitDeepTechno 256, rollbass 96, darkpad 40), 124 BPM, 15.5 s of audio.**

| Run | main | branch |
|---|---|---|
| 1 (main first; load ~10 → 2) | 244 s | 64 s |
| 2 (branch first; load ~1.6 → 5) | 106 s | 46 s |

- The branch was faster in both orders, so it doesn't make the old export slower. Both builds give the same output: 364 KB, peak −0.55 dBFS, RMS −7.13 dB.
- The 2-core sandbox shared with the other tester is far slower than a laptop; absolute times aren't meaningful.

## Screenshots (/tmp/qa/2026-11-13/ux-1/)
s01-loop, s02-make-menu, s03-short, s04-full, s05-parts-toggled, s06-moved, s09-ruler-play, s10-section-menu, s11-looping, s12-after-sing, s13-after-reload, s14-list, s15-reopened, p2-1-unique, p2-2-drawn, p2-3-after-edits, d1-dblclick, t-emerald-1400, t-velvet-1400, t-sapphire-1400, w1024-song, w1024-menu, w390-map, w390-tapped, upgrade-1-main … upgrade-4-branch-reopened. MP3 timing log: mp3time.log.
