# UX-21 build report (studio-ux-dev, 22 Nov 2026)
Branch `preview-ux-21` (pushed, 3 commits on origin/main b5fa3f3; head fdcc990). Files: `src/song.js`, `tests/smoke.mjs`, `index.html` (rebuilt with tools/build.py). Never touched main.

## Cause
A single click on a part waits 230 ms before it switches the part, so a double-click can open the editor. If that timer fired between the second press and the second release, the switch redrew the Song view, so the `.part` button under the pointer was replaced. Press 2 then landed on the old element and release 2 on the new one. Chrome sent no matching click and **no dblclick at all** (checked with a capture listener: none on 150/150, `part flash` on 300/50). The editor stayed closed, the part stayed off, and an undo step was left behind. The `untogglePart` fallback never ran because there was no dblclick.

## Fix (src/song.js, part handlers in the song wiring)
- A new `mousedown` on `#tracks` remembers the part under the press. When the press is the second press of a double-click (`e.detail>1`) on the **same** part that has a switch waiting, the switch is cancelled at once. Nothing redraws, so the dblclick arrives, and no undo step is ever made.
- The click handler records which part the waiting switch belongs to. A single click still switches after the same 230 ms delay. Keyboard (detail 0) still switches at once.
- `dblclick` reads the part from its target. If a redraw still got in the way (for example during playback), it falls back to the part remembered from the press (within 700 ms). A press outside a part clears that memory.
- `untogglePart` is unchanged. It still covers the case where the second press comes after the switch fired (300/50 ms), and it restores the history cleanly.

## Gap table (release 1 -> press 2 / press 2 -> release 2, CDP input, 1400x1100, Song view, club layout, chords part in the drop)
Mouse:
| gaps (ms) | before (main) | after |
|---|---|---|
| 80/0 | opens, on, 0 undo steps | opens, on, 0 |
| 150/150 | LOST: off, editor closed, 1 undo step | opens, on, 0 |
| 200/100 | LOST, 1 step | opens, on, 0 |
| 100/200 | LOST, 1 step | opens, on, 0 |
| 300/50 | opens, on, 0 | opens, on, 0 |
| 120/400 (long hold) | LOST, 1 step | opens, on, 0 |
| single click | switches off after delay, 1 step, undo restores | same |
Mouse while playing (loopPlay): every row after the fix opens the editor, keeps the part on, 0 steps.
Touch (CDP touchStart/End, hasTouch, tap 2 held up to 120 ms): every gap opened the editor with the part on and 0 steps, before AND after. Taps send their mouse events all at once on touch end, so they never split across a redraw. Single tap switches the part, 1 step, and undo restores it.

## Tests
- New smoke line at the end of tests/smoke.mjs: "A slow double-click on a song part opens the editor and keeps it on; a single click still switches it". It uses CDP presses with 150/150 and 200/100 gaps and a single click. It PASSES on the branch and FAILS on the main build (proof it catches the bug).
- `bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 92 checks (at 9318620 and again on the final fdcc990). Two runs in between (comment-only change) failed two older checks while qa-tester's Chrome was loading the machine (load avg about 4.5-5 on 2 cores): "song: opening the app starts a new empty song; the last one reopens from the list intact" and "song: Undo right after opening a song stays in that song" (the reopened song still had its old name "Smoke sing"). The main build fails the same two checks on the same load, so they are a pre-existing load flake, not this change. Tester: the rename's save may not reach IndexedDB within the 600 ms before the reload on a busy machine; consider waiting for the saved record's name before reloading.

## Try (for the owner)
1. Make a beat with chords, switch to Song view and pick a layout.
2. Double-click a lit part a little slowly (a relaxed double-click, or a double-tap on a tablet): the note editor opens for that part and the part stays lit.
3. Click a part once: it switches off after a moment. Press Ctrl+Z once and it comes back.

## Known limits
- If a second press is followed by dragging off the part before release, nothing happens: the part does not switch and the editor does not open. A double press counts as a double-click attempt.
- Clicking part A and then part B quickly (the browser counts it as a double-click) still behaves as before: it opens B.
