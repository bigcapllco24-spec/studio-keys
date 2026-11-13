# UX-1 Song view · branch check (qa-tester) · 13 Nov 2026

**Verdict: NOT READY.** One high bug blocks it. After opening a song from **Open song…**, the first **Undo** throws the whole song away and shows the empty new song. On this branch every app open starts a new empty song, so every returning user goes through Open song, and the owner will hit this the first time he undoes anything. Everything else in Song view works well: layouts, the scheduler, editing, patterns, sung takes, old songs, the phone map and themes. The fix is small (reset the undo history when a song is opened or a new one starts). After it, I'd expect "ready", with the rough edges below as polish.

Branch `preview-ux-1`, head **92d5372** (pushed). `check.sh`: **CHECK FAILED, 27 of 28 pass**, 1 m 24 s. The one FAIL is the new check I added for bug 1. Without it, all 27 pass (1 m 17 s to 1 m 39 s across 3 runs).

## Bugs

1. **HIGH · Undo right after opening a song wipes the song** (`src/daw.js` `loadNamed`/`newSong`, `src/edit.js` UNDO; studio-ux-dev)
   - Steps:
     1. Make a beat (any track) and reload the page. A new empty song opens, as designed.
     2. Press **Open song…**, then **Open** on the old song.
     3. Make any change (click a part, Make it a song → Short, add a note).
     4. Press **Undo** (the button or the chip).
   - Expected: the change is undone, and the song stays.
   - Actual: the screen shows "No tracks yet", Song mode with one "Main" section, and the title of the empty song. A second Undo is disabled. **Redo** brings the song back, and the song is still in the list, so no data is lost. But it looks lost.
   - Cause: `loadNamed` (and `newSong`) don't reset `UNDO.stack`, `UNDO.redo` or `UNDO.last`, so the first undo step after opening holds the previous song's state. The bug already exists on main, but there it only showed after a manual Open. On this branch every session starts with a new song, so it is now on the main path.
   - Measured: open → toggle part → Undo gave `{n: 0, name: 'Untitled song', secs: 1}`, and Redo gave `{n: 3, name: 'Edit session', secs: 8}`. Real-button run: open → Make it a song (Short) → Undo button gave 0 tracks.
   - New smoke check `song: Undo right after opening a song stays in that song` fails now and will pass when this is fixed.
2. **MEDIUM · Clicking a part shows no Undo chip** (`src/song.js` togglePart → `songFlash` without text). Try step 2 tells the owner "Press Undo on the chip if you change your mind".
   - Steps: Make it a song → Full track. Wait 8 s for the layout chip to go. Click a grey part.
   - Expected: a chip such as "Bassline on in Intro · Undo".
   - Actual: no chip; only the main ↶ Undo button works.
   - Related: inside the first 7 s, the old chip still reads "Full track: Intro 16 · Build 16…", but its Undo undoes the part click, not the layout. The label doesn't match what it undoes.
3. **LOW · "New song" status stays after opening a song.** Reload, then Open song… → Open "Edit session". The header reads "Edit session · New song" until the next save. Expected "Saved …" or nothing (screenshot a41).

## Rough edges (polish, not blockers)
- **Tablet 1024 px, Full track at Fit:** with 8 sections, the names shrink to "B…", "B…", "D…", "D…", "O…". Break and Build can't be told apart, and neither can Drop, Drop 2 and Drop 3. The ruler labels crowd at the end ("113 121 129"). Show the name with no ⋯ when narrow, or use 2-letter short names (a42).
- **Transport reflows between Loop and Song:** the readout "1 . 1 · Intro · bar 1 of 16" is much wider than "1 . 1". At 1400 px the key menu or BPM drops to the second row when you switch to Song. The readout width also changes with the section name during playback (a 3 px shift at 1024). A fixed min-width in Song mode would stop the jumps.
- **Songs list fills with "Untitled song":** each session's unnamed song gets its own entry. After 2 sessions there were two "Untitled song" rows, told apart only by time (a80). Suggestion: name new songs by vibe and date ("Ben Böhmer beat · 13 Nov").
- **Phone 390 px:** the Follow button sits alone on its own row above the map, and it does nothing useful there (a51). The page is 401 px wide, but that comes from the controller knobs (`#knobs`), not UX-1.
- **While a song plays,** the big button reads "RECORD IN THE LOOP". That is true, since Rec switches to Loop, but it reads oddly in Song mode.
- **Contrast:** checked all text in the song header, strip, hint, pattern row, transport and lanes in all 3 themes. Only Velvet's chip "Undo" is at 4.49:1, a hair under 4.5. No hard-coded colours in the new CSS or inline styles. The only literal is the menu's box-shadow `rgba(0,0,0,.4)`, the same as elsewhere.

## What I checked (with numbers)
**Smoke checks.** The developer's 9 checks were already on the branch, committed in 80cf953 before this run. I reviewed them against the report's list and they match. The MP3 check uses Short and drums only: 33.02 s decoded, peak −0.47 to −0.53 dBFS, RMS −6.7 to −6.8 dB, 24-26 s to make. Another session pushed f679ca1 (wait for keepLastSong after reload, against flakiness). I rebased onto it and added the Undo-after-open check (92d5372).

**Producer session, 1400 px, Emerald, offline assistant:**
- "make a beat like ben bohmer" + "add a bassline" + "add chords" gave 3 tracks, 122 BPM, F minor.
- **Make it a song** is disabled on an empty song. Its menu shows Short (16 bars · 0:31), Full track (96 bars · 3:09) and Just the loop.
- **Short:** Intro 4 [drums without clap and snare, chords] · Drop 8 [all] · Outro 4. Play went through once and stopped by itself after 34.4 s (31.5 s of song plus the tail).
- **Full track:** 6 × 16 bars.
- **Part click:** it turned on after the 230 ms delay. One Undo turned it off again.
- **Resize:** dragging the Intro's right edge made it 16 → 20 bars (steps of 4).
- **Move:** dragging Break onto Build gave "Intro, Break, Build…".
- **Alt+drag:** Alt+dragging a Drop to the end added "Drop 3 16".
- **Ctrl+D and Delete:** Ctrl+D on Outro gave "Outro 2" after it. Delete removed it, and Undo restored it. Focus stayed on the section.
- **Make unique:** double-clicking Bassline in Drop 2 opened the editor with "Pattern A plays in Build, Drop, Drop 2, Drop 3". **Make unique for Drop 2** switched to B and the line read "Pattern B plays only in Drop 2". Drawing one note gave B 48 → 49 and A still 48, with Drop on A and Drop 2 on B. Undo gave B 48.
- **Ruler click:** clicking bar 33 played from "33 . 3 · Break · bar 13 of 16", which is correct after the edits.
- **Loop a section:** right-click Break → Loop this section, range beats 80-144. Over 36 s the beats went 86 … 143.2 → 85.5, so it wrapped cleanly.
- **Tempo change while playing:** 124 → 128 kept the position (47.1 → 47.4).
- **New track with Break selected** (`add_melody`): it plays only in Break, and a toast follows after 0.9 s, as designed.
- **"another one" in Song mode:** the drums changed, and the sections and mode stayed.
- **Loop mode after making pattern B:** it plays only pattern A (74 notes in 1.5 s, 0 from other patterns), as designed for slice 1.

**Singing in Song mode** (fake mic, Drop selected, "let me sing the bassline"):
- During the take: Loop mode, state `take`, only the drums audible.
- After: back in Song mode and playing. A new "Sung bassline" track with 12 notes plays in Drop only. The mic is off and no audio track was added.

**Reload:**
- A new empty "Untitled song" opens in Loop mode with the song header hidden.
- The list holds "Edit session · 124 BPM · 132 bars · 4:15 · 3 tracks".
- Opening it brings back all 8 sections, the moved Break, Intro at 20 bars, and Bassline patterns A and B intact.

**Old song saved by main's build** (same browser profile, main first, then this branch):
- Opening the app shows a new empty song and the toast "“Old main song” is saved: open it again from Open song…". The list shows "Old main song · 122 BPM · 4 bars · 4 tracks".
- The opened project is identical to what main saved; the only difference is an added `bpm` field.
- **Loop playback, ~4.5 s each (145 notes): exactly the same** track, pitch, time, length and velocity for all 145. Only the order of the scheduler calls differs.

**Themes:** Emerald, Velvet and Sapphire at 1400 px, including the Velvet menu, and Velvet and Sapphire on the phone. All are readable; see contrast above.

**Tablet 1024 px:** no page overflow. The ⋯ buttons show, parts are 66 px tall and sections 44 px.

**Phone 390 px:**
- The song map shows 8 blocks (70-81 × 58 px) and the lanes are hidden.
- Tapping Drop loops it and plays (range 208-272, "Drop · looping"). Tapping again stops the loop and playback continues.

**Performance** (7 tracks, Full track, headless on a machine at load 6-10 on 2 cores):
- 10 s of playback: no long tasks.
- Tempo change: none. A part click while playing: none. Make unique while playing: none.
- 3 zooms in one task: 80 ms.
- One 133 ms task in a combined run (tempo + 3 part clicks); I couldn't reproduce it on its own.

**Download MP3 button in Song mode** (Short, 6 tracks):
- Progress text: "Making the MP3… bar N of 16", then "encoding N%", then "Downloaded Perf song 124bpm song.mp3 (33 s, 0.8 MB)".
- Took 75 s; the file arrived (792 KB).

**No page errors** in any run. The only console error is the blocked network fetch (`ERR_TUNNEL_CONNECTION_FAILED`, sandbox).

## MP3 timing: loop export, main vs branch
Same 8-bar loop (122 BPM, Drums 344 / Bass 48 / Chords 40 / Melody 58 notes, made on main and loaded into both builds). Two timings each:
- **Render:** one pass of `renderAudio`, 15.7 s of audio.
- **MP3:** `makeMp3(tracks, 60)`, which is what **Download MP3** with "About 1 minute" does in Loop mode: 4 loops, 63 s, 1476 KB. It includes its own render.

| run | build | render | MP3 | CPU used | load |
|---|---|---|---|---|---|
| 1 | main | 268 s | 305 s | – | 6-10 |
| 2 | branch | 163 s | 149 s | – | 6-9 |
| 3 | main | 141 s | 130 s | – | 6-7 |
| 4 | branch | 309 s | 243 s | – | 7-11 |
| 5 (side by side) | main | 222 s | 168 s | **321.5 CPU-s** | 6-10 |
| 5 (side by side) | branch | 206 s | 175 s | **311.5 CPU-s** | 6-10 |

**Conclusion: the branch did not make the loop export slower.**
- Wall times swing about 2× with the other tester's load.
- In the fair side-by-side run, the branch took 381 s against main's 390 s wall, and 311.5 against 321.5 CPU-seconds: within 3 %.
- The code agrees: `renderAudio` was only split into `renderGraph` plus the same render. It uses the same offline context length, events and graph.
- The output matches: peak −0.46 to −0.62 dBFS and RMS −6.63 dB on both builds. Sample hashes differ run to run on both builds, from the instruments' own randomness.
- The whole-song MP3 of a 33 s Short song took 75 s here, so per second of audio it was faster than the loop export.
- All of these times are this 2-core sandbox under heavy load. Real-machine time still needs the owner's laptop.

## Screenshots (`/home/claude/reports/UX-1-shots/`)
- **Loop and layouts:**
  - a01-empty, a02-loop-3tracks: empty song, then the 3-track loop
  - a03-make-menu: the Make it a song menu
  - a04-short, a05-short-playing, a06-full: Short, Short playing, Full track
- **Reopen and editing:**
  - a10-after-reload, a11-open-list, a12-reopened: first-run reload and reopen
  - a13-part-on, a14-resized, a15-moved, a16-dup: editing in the strip
  - a17-editor, a18-pattern-B: editor, Make unique and pattern B
  - a19-play-from-33, a20-sec-menu, a21-looping: play from a bar, section menu, looping
- **Reload, singing, themes and widths:**
  - a30-open-new, a31-reopened: second reload and reopen
  - a32-singing, a33-after-sing: singing in Song mode
  - a40-emerald-1400, a40-velvet-1400, a40-sapphire-1400, a41-velvet-menu: themes
  - a42-1024, a43-1024-playing: tablet
  - a44-390-map, a50-390-map, a51-390-looping, a52-390-velvet, a52-390-sapphire: phone
- **Load, MP3 and bugs:**
  - a60-6tracks-playing, a61-mp3-done: 6+ tracks playing, MP3 done
  - a80-list-untitled: list with duplicate "Untitled song"
  - a81-undo-wiped: bug 1
- **Old song:**
  - o01-main-old-song, o02-branch-open, o03-branch-list, o04-branch-old-song-loop
