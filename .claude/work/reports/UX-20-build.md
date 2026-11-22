# UX-20 build report: Ctrl+D at the loop end is one Undo on any computer (studio-ux-dev, 22 Nov 2026)

Branch `preview-ux-20` (off origin/main ef6dec8), pushed: 0024c4a (fix), 6e1b080 (smoke line). Never touched main.
Files: `src/daw.js`, `src/edit.js`, `tests/smoke.mjs` (one check appended at the end), `index.html` rebuilt with `tools/build.py`. No changes to `src/studio.js`, no new actions, no Worker change.

## Cause
`edPaste` (`src/daw.js`) handled a paste past the loop end by calling `setBars()` (`src/studio.js`). `setBars` saves and then redraws every track. After that, the paste saved a second time. The two saves only merged into one Undo step if they came less than 120 ms apart (`undoNote`, `src/edit.js`). The old `undoBoundary()` + `ED.oneStep` trick depended on that timing. On a slow or busy machine the track redraw takes longer than 120 ms, so the paste became a second step.

## Fix
- **`edPaste`:** the loop doubling and the paste now run inside `undoGroup()`, the helper that MIDI import already uses. It is one Undo step however long the redraw takes. The 16-bar limit check comes first, so a refused paste changes nothing. The now-unused `ED.oneStep` flag is removed from `edChanged`. The 120 ms merge rule for normal edits is unchanged.
- **Same pattern, fixed the same way** (several saves with a track redraw between them, for one user action):
  - **Selection bar, Duplicate with several tracks selected:** this was one step per track. Now it is one step.
  - **Selection bar, Delete with several tracks selected:** this was one step per track. Now it is one step.
  - **Dropping or importing a voice note into an empty song** (the loop is resized to fit the file, then the clip is added): this was 2 steps. Now it is one.
  - **"Turn into notes" on a recording** (it can set the key, add the new part and mute the recording): this was up to 3 steps. Now it is one. `transcribeTrack` wraps a new inner `transcribeInto`. The assistant's `transcribe` action keeps working, since runActions already treats one request as one step.

## Paths checked
| Path | Result |
|---|---|
| Ctrl+D at the loop end, in Song view Drop part | was the bug, fixed |
| Ctrl+D at the loop end, plain loop | fixed |
| Ctrl+C then Ctrl+V past the end | same path, fixed |
| Ctrl+D inside the loop, pressed twice | 2 steps as expected, no bar change |
| Selection bar Duplicate (2 tracks) | fixed |
| Selection bar Delete (2 tracks) | fixed |
| Voice note into an empty song | fixed |
| Turn into notes | fixed |
| MIDI import | already grouped, fine |
| Song view Duplicate section (Ctrl+D) and other section edits | `songEdit` saves once, fine |
| Dragging an audio clip | clamps to the loop and never grows it, one save, fine |
| Bars menu, "+ bars" button, assistant `bars` action | one save each; the assistant is grouped by runActions |
| Single-save handlers in `daw.js` / `studio.js` (FX, mute/solo, rename, key, add/remove track) | fine |

## Numbers
**QA probe (`ctrld.mjs`): 4-bar loop, Song → club, Chords in the Drop, Ctrl+A, Ctrl+D, one Undo**

| Build | CPU | Undo steps | Notes after one Undo | Gap between the two saves |
|---|---|---|---|---|
| main | x1 | 1 | 48 → 96 → 48 | 24-53 ms |
| main | x4 | 1 | 48 → 96 → 48 | 84-114 ms |
| main | x10 | **2** | 48 → 96 → 96, still 8 bars | 222 ms |
| main | x20 | **2** | 48 → 96 → 96, still 8 bars | 528 ms |
| branch | x1 | 1 | 48 → 96 → 48, back to 4 bars | 24 ms |
| branch | x4 | 1 | 48 → 96 → 48, back to 4 bars | 89 ms |
| branch | x10 | 1 | 48 → 96 → 48, back to 4 bars | 270 ms |
| branch | x20 | 1 | 48 → 96 → 48, back to 4 bars | 360 ms |

On main, x4 passed on this machine when it was quiet. Under load it failed (see the smoke line below).

**Every path, with each track redraw forced to take 250 ms**
- **main:**
  - Each action gave 2 Undo steps (3 for Turn into notes).
  - After one Undo, Ctrl+D was still at 8 bars with 96 notes.
  - The voice note was still there, and the key stayed set.
- **branch at CPU x1, at CPU x4, and with the forced 250 ms redraw:**
  - Ctrl+D: 1 step, 4 → 8 → 4 bars and 48 → 96 → 48 notes. Redo returns to 8 bars and 96 notes.
  - Ctrl+V: 1 step, back to 4 bars and 48 notes.
  - Duplicate 2 tracks: 1 step, 3 → 5 → 3 tracks.
  - Delete 2 tracks: 1 step, 3 → 1 → 3 tracks.
  - Voice note into an empty 1-bar song: 1 step. The loop grows to 4 bars, and one Undo leaves 0 tracks and 1 bar.
  - Turn into notes: 1 step, 6 notes. One Undo removes the part, unmutes the recording and clears the key.
  - No page errors.

**New smoke line (last in `tests/smoke.mjs`)**
- What it does: sets CDP `Emulation.setCPUThrottlingRate` to 4, then runs the Ctrl+D case twice (plain, then with a 250 ms track redraw so it also catches the race on a fast machine). It resets the rate to 1 afterwards.
- Branch: PASS (`[{"lag":0,"b":[4,8,4],"n":[48,96,48]},{"lag":250,"b":[4,8,4],"n":[48,96,48]}]`).
- main: **FAIL** (`b [4,8,8]`, `n [48,96,96]` in both runs), so it catches the bug.

## check.sh
- **First run: FAIL.** The test run hit "Runtime.callFunctionOn timed out" at check 6, at load average 16. Another agent's Chrome was running; nothing in that run pointed at this change.
- **Rerun once: CHECK OK, SMOKE OK: 92 checks**, and every other step passed.

## For the lead / tester
- Nothing to deploy. No new actions, no Worker or prompt change.
- The smoke line replaces the renderTracks global for a moment to simulate a slow redraw and restores it in a `finally`. The tester may want to know this.

## Known limits
- Each file in a multi-file drop is still its own Undo step (one step per file). This is on purpose.

## Try it (for a musician)
1. Make a 4-bar loop with drums, chords and bass. Go to Song view, choose Full track, and double-click Chords in the Drop.
2. Press Ctrl+A, then Ctrl+D. The loop grows to 8 bars and the chords repeat.
3. Press Ctrl+Z once. You are back to 4 bars with the original chords, even on a slow laptop. Ctrl+Shift+Z brings the 8 bars back.
4. Select two tracks with Ctrl+click and press Duplicate (or Delete) in the selection bar. One Ctrl+Z undoes both tracks at once.
