# UX-2 re-check (qa-tester), 13 Nov 2026, branch preview-ux-2 @ 373ff00 (+ QA smoke commit 94c2d43)

## Verdict: READY
Every UX-2 fix still works after the merge with UX-1's Song view, in Loop mode and in Song mode. The Song view basics work on this branch. No page errors. One finding (F1) is not caused by UX-2: it behaves the same on main 50b6315, so it is a UX-1 follow-up and doesn't block UX-2.

## check.sh
- On 373ff00: CHECK OK · SMOKE OK 36 checks · 1m37s (build, bundle and Worker syntax PASS, no page errors)
- After the QA smoke line (94c2d43, pushed to preview-ux-2): CHECK OK · SMOKE OK 37 checks · 1m36s
- New line: "song: editor on a part's pattern B shows the velocity lane; group drag edits B only" · B 0.9 0.7 0.9 0.7 0.9 0.7 0.7, A unchanged, 1 undo step

## Focused test (headless Chrome, fake MIDI, fake mic tests/fixtures/sing.wav, real mouse clicks where it matters)
Scripts: /tmp/claude-0/-home-claude/7e2c589d-1c85-5384-9f6a-4f8347082a98/scratchpad/ux2.mjs, phone.mjs, sungsong.mjs

Play on a new song
- 1a PASS empty new song: Play greyed out (Loop and Song)
- 1b PASS Loop: assistant makes drums + chords, click Play: 41 notes scheduled; Play greyed out while playing; Stop stops
- 1c PASS Song mode (real Loop/Song switch): new song + assistant parts, click Play: 18 notes scheduled, stays in Song mode
- 1d PASS "Make it a song ▾" menu → Short (Intro 4 · Drop 8 · Outro 4, 16 bars · 0:31), Play plays it

Velocity lane and group drag
- 2a PASS Loop: lane inside the editor box (lane bottom 839 / box 840); 6 selected go 0.7/0.5 → 0.9/0.7, the 7th stays 0.7, 1 undo step
- 2b PASS Song: real double-click on Chords in Drop 2 opens the editor on Drop 2, pattern A; the part stays on (also at 0 ms, 120 ms and 350 ms between clicks)
- 2c PASS Song, editor opened from a part: lane inside (863/864), group drag OK, 1 undo step
- 2d PASS "Make unique" → pattern B: lane inside, group drag edits B only, A unchanged, 1 undo step
- 2e PASS Undo after the B drag puts B back (0.7 0.5)

Sung chords snapped
- 3a PASS Loop: 9 chords, all start on whole beats, no repeats back to back, shortest 1 beat, mic off afterwards
- 3b PASS Song (Short layout): 9 chords, same rules; goes back to Song mode afterwards (but see F1)

Phone width (390 px and 360 px, mobile + touch)
- 4 PASS no sideways scroll in Loop (390/360), in the Song view (map layout: "Editing parts needs a tablet or a computer") and with the editor open in Song mode (390/360). The velocity lane sits inside the editor box, and a group drag on the phone gives 0.9 0.7 … in 1 undo step. No element sticks out past the screen edge.

Song view basics on this branch
- 5a PASS click a part off → chip "Drums off in Drop" → the chip's Undo turns it back on; Ctrl+Z does too
- 5b PASS real ruler click at bar 33 → first note at beat 128 (Drop)
- 5c PASS Undo of "Make it a song" → back to Loop mode
- Open the editor from a part: see 2b

## Findings
F1 (medium, NOT a UX-2 regression: same on main 50b6315; UX-1 area, likely src/song.js songSync + src/studio.js take end / backSong)
A part sung in Song mode lands only in the selected section, and nothing tells you.
Steps: 1. New song, "add drums", "add a bassline". 2. Make it a song ▾ → Short (Intro is selected). 3. Say "let me sing the chords" and sing 4 bars. 4. Play the song.
Expected: the sung chords play across the song, or at least a message like the one the assistant gives ("“Melody” plays in Intro. Click its empty parts to add it elsewhere.").
Actual: the "Sung chords" track is on in Intro only (Drop and Outro empty) and no toast appears. songSync runs while the take is in Loop mode, so the songOn() toast branch is skipped. The same happens with a sung bassline. Screenshot: /tmp/qa/2026-11-13-ux2b/12-sing-song-done.png

Test-harness notes (not app bugs)
- Play is greyed out while playing by design (Stop is a separate button).
- In Puppeteer, mouse.click({clickCount:2}) without a first click sends no dblclick. Real double-clicks work.
- Switching Puppeteer to isMobile reloads the page, so the app opens a new empty song (expected).

## Screenshots (/tmp/qa/2026-11-13-ux2b/)
00-open, 01-play-loop, 02-play-songmode, 03-make-menu, 04-short-song, 05-vel-loop-before/after, 06-full-track, 07-editor-from-part, 08-vel-song-A-before/after, 09-pattern-B, 10-vel-song-B-before/after, 11-sing-loop-singing/done, 12-sing-song-singing/done, 13-part-off, 14-play-from-bar, 15-phone-390/360-loop, 16-phone-390/360-song, 17-phone-390/360-editor
