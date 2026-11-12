# UX-1 build report (studio-ux-dev) · Song view, slice 1

Branch `preview-ux-1`. Last commit **d0f9bbe**, pushed. All 6 build steps are done. `check.sh`: **CHECK OK** (build, bundle and Worker syntax, smoke test 18/18, no page errors).

## What I built, step by step
1. **`src/song.js`: model and API.** Sections are stored as `{id, name, kind, bars, end, off, parts:{trackId:{on, variant, without}}}`. Pattern A is `track.events`; extra patterns go in `track.patterns.B`, `.C` and so on.
   - `migrateSong` turns an old song into one automatic "Main" section. That section follows the loop length until someone edits it.
   - `songSync` runs before every undo snapshot. It drops parts that belong to deleted tracks. A new track is switched on only in the selected section (on all sections if none is selected or the song has one section), with a toast.
   - Templates: `songTemplate('short' | 'club' | 'full' | [{name, kind, bars}])`.
     - **Short:** Intro 4 · Drop 8 · Outro 4 (16 bars, 0:31 at 124).
     - **Full track:** six sections of 16 bars (96 bars, 3:06).
     - **Just the loop:** one section.
     - Parts follow the role table. The Intro drums play without clap or snare.
     - If no part would play in a section, everything plays there. So a song with one melody still works.
   - Read helpers: `songFlat` (cached, about 6-10 ms for 8 tracks × 192 bars, rebuilt only after a save), `songAt`, `songSummary` (in AI-1's format), `songFind` ("drop 2", "the second drop", "the break", "last drop", 3).
   - Edit helpers: `songAdd/Remove/Move/Resize/Duplicate/Rename/SetKind/Split/SetPart/MakeUnique/NewPattern`. Each one is a single undo step.
   - View helpers: `songMode`, `songLoop` (a section, `{from,to}` in bars, or null), `songSelect`, `songPlay({from})`.
   - Feedback: `songFlash`, `songFlashDiff(songSnapshot())`, the Undo chip.
   - For the sound engine: `SONG_HOOKS.sectionStart/sectionEnd`.
   - AI-1's names also work: `ensureSections`, `setSongMode`, `loopSection`, `forkPattern`, `flashSections`, `songBars`.
2. **Scheduler and new song on open** (`studio.js`, `boot.js`, `daw.js`).
   - In Song mode, `tick()` hands over to `songTick`. It finds notes by binary search and maps time to song position, so the loop brace can jump back.
   - Play from any bar. The song stops at the end after a 2-second tail. Tempo changes keep the position.
   - Loop mode runs exactly the old code.
   - Rec rule: in Song mode, Rec or overdub switches to Loop with a toast. A sung take switches to Loop and comes back to Song afterwards.
   - A new take of the same part plays in the same sections as the old one.
   - New song on open: on load, the last song is written into the songs list first, then a new empty song starts with a toast saying where the last one went. If the browser can't keep the list (IndexedDB fails), the last song opens as before, so nothing is lost.
   - Empty untouched songs no longer go into the list (`saveNamed` skips them).
3. **Song screen** (UI in `song.js`, plus small hooks in `daw.js`).
   - Desktop and tablet:
     - Loop | Song switch and **Make it a song ▾** in the transport.
     - The chooser shows bars and time for Short, Full track and Just the loop.
     - Section strip: click selects, drag moves, Alt+drag copies, the right edge resizes in steps of 4 (Alt: 1), double-click the name to rename, right-click or ⋯ for the menu.
     - Section menu: Rename, Duplicate, Longer +8, Shorter −8, Split in half, Loop / Stop looping, Type, Delete.
     - Ruler: click to play from that bar. The loop brace and the cursor are drawn on it.
     - Parts: click toggles, double-click opens the editor, a letter badge shows a pattern other than A, and a "no kick" style label shows muted drum pieces.
     - Playhead with Follow, which turns off when you scroll by hand.
     - Zoom: + and − buttons, Fit, Ctrl+wheel and pinch. Zoom moves the existing blocks instead of rebuilding them.
     - Flash and Undo chip after each change.
     - Readout: "33 . 1 · Drop · bar 1 of 16".
     - Shortcuts work only while the song area has focus: Space, Ctrl/Cmd+D, Delete, Ctrl/Cmd+L, + − W, Home, plus ← → to select and Alt+← → to move. Clicking anywhere outside the song area, the piano for example, gives the keys back to the notes.
     - The "Length" label reads "Pattern" in Song mode. The MP3 length menu is hidden in Song mode.
   - Phone (600 px and below): a song map of section blocks. Tap one to loop it and play.
4. **Editor patterns** (`daw.js`).
   - A row under the editor header shows "Pattern for Drop 2", buttons A / B / + New, and the "plays in" line, for example "Pattern A plays in Build, Drop, Drop 2: editing A changes all of them".
   - **Make unique for Drop** gives that section its own copy.
   - The editor edits the chosen pattern through a thin wrapper, so every editor feature keeps working (draw, select, copy, velocity, undo).
5. **Export** (`studio.js`).
   - In Song mode, **Download MP3** renders the whole song 16 bars at a time. Each piece starts with a run-up of at least 4 seconds, longer when a held note started earlier, so reverb and long notes carry over the joins.
   - Audio is kept as 16-bit with 6 dB of headroom and normalised to a peak of 0.94 before encoding. Encoding yields every 20 ms. Progress shows "Making the MP3… bar 33 of 96".
   - **MIDI only** exports the whole song.
   - The shared offline graph setup was split out (`renderGraph`). `renderAudio` (the loop export) behaves the same as before.
6. **Themes, accessibility, tests.**
   - Colours come only from variables. Section colours mix `--accent`, `--signal` and `--t*`. The ruler is a canvas using `TC` and redraws when the theme changes.
   - Checked in Emerald, Velvet and Sapphire at 1400 px, at 1024 px (tablet: ⋯ buttons, 44 px targets) and at 390 px (song map).
   - Parts have `aria-pressed` and labels. Section names, the Loop/Song switch and Follow have `aria-pressed`. The menus use `role=menu` and work with the arrow keys and Escape.

## Files touched
`src/song.js` (new, about 420 lines), `src/studio.js`, `src/daw.js`, `src/edit.js` (the sync before undo, migration on undo), `src/boot.js` (two lines), `index.html` (rebuilt).
- **`src/body.html`:** the Loop/Song switch and the Make it a song button in the transport; the song header (`#songHead`: length, Undo chip, + Section, zoom, Follow, ruler, strip); `#songMap`; `#songHint`; `#edPat` in the editor; `#songMenu`; a `#barsLbl` span around "Length".
- **`src/head.html`:** one block of styles at the end, "Song view (UX-1)".
- Not touched: `groove.js`, `maker.js`, `cloudflare/worker.js`, `tests/smoke.mjs`.

## How I tested (headless Chrome, `file://` build)
- **Old song plays the same.** I loaded the same song with no sections into **main's** `index.html` and this branch, in Loop mode, for 2 loops. Both scheduled 170 notes, identical (track, note, beat, length). In Song mode, the migrated song plays 85 notes, exactly one loop, then stops.
- **Templates.** Short = 16 bars ("16 bars · 0:31" at 124). Full track = 96 bars ("96 bars · 3:06"). `songSummary()` gives `1 Intro 16 [drums-clap-snare, chords] | 2 Build 16 [drums, bassline, chords] | 3 Drop 16 [all] | 4 Break 16 [chords, melody] | 5 Drop 2 16 [all] | 6 Outro 16 [drums, chords] · 96 bars · 3:06 · Song mode`.
- **Scheduler.**
  - Play from bar 33: the first note scheduled is the Drums at beat 128, in the Drop.
  - Loop the Drop and start at bar 11: playback wraps to bar 5, and the notes scheduled after the wrap fall at beats 18.75-28.5.
  - Short song started at bar 15: it stopped by itself after the end plus the tail.
  - Rec in Song mode switched to Loop and started the count-in.
- **Mouse and keyboard (real puppeteer input).**
  - Clicking a part toggles it, and one Undo restores it.
  - Double-clicking opens the editor on that section's pattern and doesn't toggle the part.
  - Make unique gives B. A note added to B left A unchanged (A 16 → 16 notes, B 16 → 17).
  - Dragging an edge made Build 16 → 20 bars. Dragging Break before Build reordered the sections. Alt+drag copied a Drop to the end ("Drop 3").
  - Ctrl+D duplicated a section and Delete removed it. Ctrl+L looped the selected section and started playback, Space stopped it, W fit the view and = zoomed in.
  - Double-click and typing renamed a section to "Climax". Clicking the ruler at bar 41 played from 41.
  - With focus outside the song area, W plays a note. Inside, it fits the view. After clicking the piano, W plays a note again.
- **Sung take in Song mode** (fake mic). During the take the studio is in Loop; afterwards it is back in Song and playing. The bassline (9 notes) plays in the selected Drop. A second take kept "Drop, Outro".
- **New song on open.** Made a song, reloaded the page: a new empty "Untitled song" opened, and the songs list held "Before reload" with 2 tracks. A second reload added no extra entries. Opening it from the list brought back the 2 tracks.
- **Whole-song MP3, Full track at 124 BPM** (4 tracks, Stephan Bodzin vibe):
  - Length: 187.81 s expected, 187.85 s decoded (MP3 padding 0.04 s). Size 4.3 MB.
  - Level: decoded peak −0.17 dBFS and RMS −7.4 dB on that run. I then lowered the target to 0.94. The re-run on a Short song decoded at peak **−0.63 dBFS**, RMS −6.9 dB.
  - The level around each 16-bar join is steady (−7.0 / −7.2 / −7.6 / −7.8 dB). The −16.6 dB at bar 65 is the Break-to-Drop 2 boundary, which is musical, not a gap.
  - The last final-buffer long task (56 ms) was removed by using `subarray`.
  - **Render time in this sandbox is slow:** 2 cores, about 0.4× real time, so 3 minutes of song took about 7.5 minutes. The old loop exporter is slower here per second of audio: a 16-bar loop, 62 s of audio, took 389 s. On a normal laptop it should be many times faster, but **the lead should check the real time on the owner's machine.**
- **Performance, 8 tracks × 192 bars** (11,776 notes; the song data is 20 KB and an undo snapshot 24 KB, the same size as before):
  - Scheduler tick: median 0.1 ms, p99 6.6-7.9 ms, max 11.7-18 ms. That includes creating the voices, the same work as in Loop mode.
  - Toggling a part with a full redraw: 21-32 ms. Full redraw of the tracks: 15-17 ms.
  - Scrolling, zoom and playback produced no long tasks.
  - In 2 of 4 runs, one 52-77 ms long task appeared about 0.1 s after a part toggle. I couldn't pin it to my code (it looks like garbage collection or the deferred save on this slow machine). In the other runs there was none.
- **`check.sh`:** CHECK OK (smoke 18/18).

## Smoke checks for qa-tester to add to `tests/smoke.mjs`
1. Old song: `PROJ` with no `sections` → `migrateSong(PROJ).sections.length===1` and the section is "Main" with bars equal to `PROJ.bars`; Loop playback unchanged.
2. `songTemplate('club')` → `songBars()===96`, `songLenText()` is "96 bars · 3:06" at 124. `songTemplate('short')` → 16 bars, sections Intro 4 · Drop 8 · Outro 4, `SONG.view.mode==='song'`.
3. Toggle a part: `songSetPart(sid, tid, {on:false})` then `undo()` → `on` is back to true.
4. `songPlay({from:33})` on the club layout → the first `scheduleEvent` call is at song beat ≥128 and `songAt(beat).section.name==='Drop'`.
5. `songLoop('break')` → `songLoopRange()` is `[192, 256]`, and after 2 s of playback past the end the beat is back inside the range.
6. `songMakeUnique(sid, bassId)` → returns 'B'; editing `track.patterns.B` leaves `track.events` unchanged.
7. `makeSongMp3` on `songTemplate('short')` at 124 → decoded duration ≈ 33.0 s (±0.1), decoded peak < 0 dBFS, RMS reported.
8. Reload with a song in progress → `PROJ.tracks.length===0`, and the songs list (IDB `projects`) contains the previous song.
9. Rec while in Song mode → `SONG.view.mode==='loop'`.

## For the lead and other developers
- **AI-1 (assistant-dev)** can call the `song*` API directly.
  - Take `songSnapshot()` before a batch and call `songFlashDiff(before, text)` after it for the flash and the Undo chip. This isn't wired into `runActions` yet, because `actions.js` isn't my file.
  - `songSummary()` is ready to put in the AI context.
  - The drum transitions hook is in place: `songFlat` merges `transitionEvents(section, drumsTrack)` when `section.end` is set. **Contract I assumed:** it returns `[{b, d, n, v}]` with `b` in beats from the section start. The notes are added on top of the pattern, not instead of it.
  - No assistant actions were added (AI-1 isn't approved yet).
- **Sound engine:** `SONG_HOOKS.sectionStart(section, time)` and `sectionEnd(section, time)` are called by the Song scheduler. `songAt(beat)` returns kind, bar in the section and bars left.
- **Test link:** Song mode needs no Worker change.

## Known limits and differences from the design
- **Loop mode always plays pattern A of every track.** Section jamming in Loop mode is slice 2, as the brief says.
- **Export for Ableton (.zip) still exports the loop**, not the whole song. Its tooltip says so in Song mode. Whole-song stems are slice 2.
- **Double-click on a section renames it.** Looping is on Ctrl/Cmd+L, the menu, or a double-click on the non-name part of the block (small). On tablets the ⋯ button gives the menu; there is no long-press menu.
- **Split in half** keeps the pattern running into the second half through an `off` field (the start offset in the pattern).
- **Not built (slice 2, per the brief):** ruler drag-to-loop, box-select of parts across sections, the energy line, whole-song stems, free clips, the long shortcut list.
- **MP3 render speed on real hardware is not measured** (see the numbers above).

## Try this (for the owner's test link)
1. Ask Keys for a beat, a bassline and chords. Press **Make it a song ▾** and choose **Short**: you get Intro, Drop and Outro, about 30 seconds. Press Play: it plays once from start to end and stops.
2. Click **Make it a song ▾** again and choose **Full track**. Click a grey dashed block to switch that part on, or a coloured one to switch it off. Press **Undo** on the chip if you change your mind.
3. Drag the right edge of the **Intro** to make it longer. Drag the **Break** to another place. Hold Alt while dragging a **Drop** to copy it.
4. Double-click the bassline in **Drop 2**, then press **Make unique for Drop 2** and change some notes. The other drops keep the old bassline.
5. Click the ruler at bar 33 to play from there. Right-click the **Break** and choose **Loop this section** to hear it over and over.
6. Press **Download MP3** in Song mode to get the whole song. Close and reopen the page: a new empty song opens, and your song is under **Open song…**.
