# UX-1 Song view · branch re-check after fixes (qa-tester) · 13 Nov 2026

## Verdict: READY
- All six fixes are confirmed. I reproduced each original bug's steps with real mouse, touch and keyboard input, and none of the bugs happens now.
- `check.sh` passes: **CHECK OK, 31/31**.
- There are no page errors and no high or medium bugs.
- I found one new **low** issue, and it makes try step 5 only half true (bug N1 below). Before posting gate 2, either have the developer make a one-line fix or reword step 5. Nothing else is needed.

Branch `preview-ux-1`. The last commit is **37e64c9** ("UX-1 fix: smoke checks for the relaxed double-click, the Undo chip and the save label; keep a change made just before the page closes"). I checked that it is the head of origin. I didn't commit anything; `tests/smoke.mjs` is unchanged.

## check.sh
- **CHECK OK, SMOKE OK: 31 checks**, in 1 min 47 s (under the 3-minute limit).
- The 4 UX-1 fix checks pass:
  - The relaxed double-click: `{"on":true,"st":3,"ed":true}`.
  - The part chip: "Drums on in Break", then the resize chip "Outro: 12 bars (was 16)", and each Undo undid the right change.
  - Undo right after opening a song: it stays in "Before reload", 3 tracks, 3 sections.
  - The label after opening: "Saved 3:17 AM".
- The whole-song MP3 (Short layout, drums only): 33.02 s, peak −0.61 dBFS, RMS −6.8 dB, 27 s to make.

## Each fix, re-tested with the original bug's steps

1. **HIGH: Undo right after opening a song wiped it. CONFIRMED FIXED.**
   - Steps:
     1. Made a beat, bass and chords and named the song "QA retest".
     2. Reloaded. A new empty song opened, as designed.
     3. Clicked **Open song…**, then **Open** on QA retest.
     4. Clicked **Make it a song ▾ → Full track** (6 sections).
     5. Clicked the **↶ Undo** button.
   - Result: still "QA retest", 3 tracks, back to 1 section. Undo is then disabled, so nothing reaches the empty song. **Redo** brings the 6 sections back.
   - Right after the open, the undo history is empty and Undo is disabled.
   - Other ways in also stay in the song:
     - Open, click a part, then the chip's Undo: the part is back and the 6 sections stay.
     - Open "QA retest" from another song that has tracks, press **+ Section**, then Ctrl+Z: back to 6 sections. A second Ctrl+Z does nothing; the stack is empty.
     - Producer session: open, section menu **Longer (+8 bars)**, then Ctrl+Z: Outro 12 → 4, still "Bodzin sketch" with 4 tracks.

2. **MEDIUM: a relaxed double-click switched the part off. CONFIRMED FIXED.**
   - Test: real mouse down/up on Bassline in Drop 2, at gaps of **100, 260, 350 and 450 ms** (the original bug happened at 260, 350 and 450).
   - Each time the part stayed on, the undo stack was unchanged (2 → 2) and the editor opened.
   - Double-clicking a part that's off (Bassline in Intro) at 350 ms: it stays off and the editor opens.
   - A single click still switches a part: two single clicks 0.9 s apart went on → off → on.
   - Tablet (1024 px, touch): a double-tap at 0.3 s keeps the part on, keeps the stack the same (6 → 6) and opens the editor. A single tap still switches the part, with the chip "Bassline off in Drop 2". I checked this in Emerald, Velvet and Sapphire.

3. **MEDIUM: no Undo chip on a part click, and a stale chip label. CONFIRMED FIXED.**
   - Waited 8 s after Full track, then clicked a grey part (Bassline in Intro). The chip read **"Bassline on in Intro · Undo"**. The chip's Undo switched it off again, and the 6 sections stayed.
   - Stale-label case:
     - Short, then Full track: the chip reads "Full track: Intro 16 · …".
     - Clicked Drums in Break within 7 s: the chip changed to **"Drums on in Break"**.
     - The chip's Undo undid only the part. The 6 sections stayed, and the Short and Full track steps were still in the history.
   - A part click followed by a note edit hides the chip.
   - Section menu **Loop this section**: chip "Looping Drop" with no Undo button.
   - Rename has its own chip ("Renamed Drop 2 to Second big drop · Undo").

4. **LOW: the "New song" label stayed after opening a song. CONFIRMED FIXED.**
   - After Open song… → Open, the header reads **"Saved 3:19 AM"** (and "Saved 3:26 AM" in the producer session), never "New song".
   - After a reload, the new empty song correctly reads "New song".

5. **LOW: tablet section ⋯ and section names. CONFIRMED FIXED.**
   - Setup: 1024×768 with touch, `pointer:coarse` true, 8 sections (Full track plus Break 2 and Drop 3).
   - **At Fit:** blocks are 64 px with the ⋯ hidden. The names read "Intro, Build, Drop, Br1, Br2, Drop 2, Outro, Drop 3": none cut off, and all can be told apart.
   - **Zoomed in:** blocks are 117 px and the ⋯ is **44×44**. The names read "Intro, Bu, D1, Br1, Br2, D2, Ou, D3", all unique. Tapping a ⋯ opens the menu.
   - **Long-press, 0.75 s on Build:** the menu opens while you hold, and it **stays open after you lift** ("Rename, Duplicate, Longer…").
   - **Short tap on Outro:** it only selects Outro, with no menu.
   - No horizontal scroll at 1024 px.
   - All of this checked in Emerald, Velvet and Sapphire.

6. **LOW: transport readout. FIXED for the readout itself.**
   - `#posDisp` is **92 px** in every state: Loop stopped, Loop playing, Song stopped, Song at bar 1, Song at bar 67, and with a 15-character section name.
   - The readout shows "67 . 3 / Drop 2 · 3/16". A long name becomes "Second big dr…".
   - Phone, 390 px: the readout is 92 px and the map has 6 blocks. The page is 401 px wide, the same as before (from `#knobs`).
   - **But see N1:** the BPM and key still move when Song mode plays, because a different control grows.

**Extra fix: a rename just before a reload is kept. CONFIRMED.**
- Steps: renamed the song, called `saveProject`, then reloaded at once. Repeated 5 times.
- All 5 times the list had "Late name 0…4" and it reopened with its 4 tracks.
- I didn't see the developer's one-off "no saved song at all" case.

## New bugs

**N1 · LOW · BPM, key and the Loop/Song switch slide 78 px to the right when you press Play in Song mode**
- Owner: studio-ux-dev. Files: `src/studio.js` line 256 (the `#loopLbl` text) and `src/head.html` (transport CSS).
- Steps:
  1. Make a beat and choose **Make it a song → Full track**.
  2. At 1400 px, press **Play**, or switch Loop → Song while it plays.
- Expected (try step 5): "the BPM and key don't move".
- Actual:
  - The big Rec button changes from "PLAY SONG" or "OVERDUB" (170 px) to **"RECORD IN THE LOOP" (248 px)**.
  - Everything to its right moves right by 78 px: the readout (530 → 608), Loop/Song, Make it a song, BPM (928 → 1006) and key (1136 → 1214).
  - It jumps back when you stop, or switch to Loop while playing.
  - It's the same at 1280 px. At 1024 px, BPM and key are already on row 2, but the readout and switch still move.
  - Nothing wraps to a new row any more.
- Fix idea: give `#loopBtn` a fixed min-width (about 250 px), or use a shorter Song-mode label ("REC IN LOOP"). The label's wording was already noted as out of scope for this round.
- Or reword try step 5 to "the bar readout stays the same size".
- Screenshots: r11-transport-song.png, r13-transport-song-playing-1400.png (compare with r06-undo-after-open.png).

## Rough edges (polish, not blocking)
- **Undo after "Make it a song" leaves you in Song mode with one 4-bar "Main" section** (header "PLAY SONG"), not in Loop mode.
  - Pressing Play then plays the 4 bars once and stops, instead of looping.
  - The song content is right. The view mode just isn't part of the undo history.
  - Try step 2 says "back to the plain loop", which is true for the content but not for the mode (r06).
- **A long chip pushes the song strip down 27 px.** A chip like "Renamed Drop 2 to Second big drop · Undo" wraps to its own line, so the strip and lanes shift down 27 px and back up when the chip hides (strip top 1452 → 1479 → 1452). Short chips fit on one line (r08, r12).

## Producer session (about 12 minutes, 1400 px, Emerald, offline brain)
- **Beat by reference:**
  - "make a track like stephan bodzin" gives the vibe and drums only: Deep Techno Kit, 124 BPM, A minor.
  - "another one" twice: all three grooves are different, and there is still 1 drums track.
  - Added a bassline (48 notes) and chords (20 notes).
- **Make it a song → Short** (real menu click): Intro 4 · Drop 8 · Outro 4.
- **Sing a bassline** (fake mic, Drop selected):
  - During the take: Loop mode, state `take`, only the drums audible, mic on.
  - Afterwards: "Sung bassline" (9-16 notes across runs) plays only in Drop. The mic is off, no audio track was added, and it's back in Song mode and playing.
- **Edit:**
  - A real double-click on Chords in Drop opens the editor.
  - Drawing a note with the mouse: 20 → 21. Ctrl+Z: 20. Ctrl+Shift+Z: 21.
- **Play:** Song mode plays and shows "2 . 3 / Intro · 2/4".
- **Save and reopen:**
  - Typed the name "Bodzin sketch" and clicked **Save**. The header reads "Saved 3:26 AM".
  - After a reload: a new empty song with "New song".
  - Open song… → Open: identical tracks (Drums 120, Bassline 48, Chords 20, Sung bassline 16), sections and BPM. The header reads "Saved 3:26 AM" and Undo is disabled.
- **Page errors:** none in any run (bug scripts, tablet in 3 themes, session, phone).
- **Test harness note:** puppeteer's `mouse.click({clickCount: 2})` does not give a real double-click; it sends one click with detail 1. Use `mouse.down/up({clickCount: 2})`, as the smoke test does.

## Screenshots (`/home/claude/reports/UX-1-shots-c/`)
- **Bugs 1 and 4:** r01-beat, r02-reload, r03-list, r04-opened, r05-make-menu, r06-undo-after-open, r07-chip-after-open
- **Bug 3:** r08-part-chip, r09-sec-menu
- **Bug 2:** r10-dblclick-350
- **Bug 6 and N1:** r11-transport-song, r12-transport-longname, r13-transport-song-playing-1400 / -1280 / -1024
- **Bug 5:**
  - t01-1024-fit-{emerald,velvet,sapphire}
  - t02-longpress-{emerald,velvet,sapphire}
  - t03-zoomed-{emerald,velvet,sapphire}
- **Session:** s01-loop, s02-singing, s03-after-sing, s04-editor, s04b-editor-drawn, s05-reload, s06-reopened
- **Phone:** m01-390-playing

Test scripts: `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/qa/` (a.mjs bugs, t.mjs tablet, s.mjs session, geo.mjs transport, ed.mjs editor, m.mjs chip and phone).
