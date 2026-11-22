# UX-20 branch check (qa-tester, 22 Nov 2026)
Branch origin/preview-ux-20 @ 6e1b080 (off main ef6dec8). Test clone /home/claude/sk-ux20-test; main clone /home/claude/sk-ux20-main (ef6dec8); merge scratch /home/claude/sk-ux20-merge. Nothing pushed, no product code touched.

## Verdict: READY
The QA-2 bug is fixed. All five grouped actions are one Ctrl+Z, and Ctrl+Shift+Z puts back exactly the same state at CPU x1, at x4, and with a forced 250 ms track redraw. Normal note editing splits into Undo steps exactly as on main. 10 minutes of editing (30 rounds) gave 0 page errors and no wrong results. check.sh passed on the first run.

## Problems (none block the release)
1. **Merge conflict with preview-ux-19 in tests/smoke.mjs.** It is new with UX-20 and trivial to fix. Both branches add a check at the same spot, right after "Save after deleting the open song saves it again". Fix: keep both blocks (the UX-20 block ends in a `finally` that restores `renderTracks` and the CPU rate, so the order doesn't matter). Merged on its own into main, UX-19 has no conflicts.
2. **(low, already on main, not UX-20)** Typing a track name on a slow computer makes several Undo steps. Steps: CPU x4, triple-click a track name, type "Big drums" (60 ms per key), Enter. Expected: 1 Undo step. Actual: main 7 steps, branch 2 steps. Each keystroke saves, and the 120 ms merge rule decides the count, so the number changes from run to run. A candidate for the same treatment later (save on `change`, or group). Not caused by this branch.
3. **(nit, code)** `undoGroup` (src/edit.js:8) runs its tail only when `fn` returns normally. If something inside throws, the changes stay but no Undo step is pushed, so Ctrl+Z jumps past them. This was already true for the MIDI import. It is now used on 5 more paths, and none of them threw in any run. Optional: move the tail into the `finally`.
4. **(nit, already on main)** After Ctrl+Z on a paste past the end, the toast "No room after the end of the song, so I doubled its length first" stays on screen for a few seconds even though the loop is back to 4 bars (screenshot session/s3-songview.png).

## What I checked (numbers)
### 1. check.sh
- **Branch:** CHECK OK, SMOKE OK, 92 checks, 2m32s, passed on the first run (load 0.2 at the start). Log: /home/claude/reports/ux20-check1.log
- **Local merge with origin/preview-qa-2:** clean. QA-2 only touches tests/smoke.mjs and check.sh, and they auto-merged. CHECK OK, SMOKE OK, 93 checks, "CHECK OK in 2m14s". Log: /home/claude/reports/ux20-check-merge-qa2.log
- **The new smoke line:** it swaps `window.renderTracks` and sets the CDP CPU rate, and its `finally` blocks restore both. It is the last check, and the "no page errors" check after it passed.

### 2. QA-2 probe ctrld.mjs (paths parameterised; two runs per build)
| build | x1 | x4 | x10 |
|---|---|---|---|
| branch run 1 | 1 step, 48→96→48 | 1 step | 1 step |
| branch run 2 | 1 step | 1 step (gap 110 ms) | 1 step (gap 333 ms) |
| main run 1 | 1 step | **2 steps**, 96 notes and 8 bars left | **2 steps** |
| main run 2 | **2 steps** (gap 194 ms, machine busy) | 1 step | **2 steps** (gap 515 ms) |

Branch: 6/6 one step. Main: 4/6 two steps. Log: /home/claude/reports/ux20/probe.log

### 3. The grouped actions: one Ctrl+Z, then Ctrl+Shift+Z
Real keyboard Ctrl+Z / Ctrl+Shift+Z, real clicks on the selection bar (Ctrl+click two track heads), the real `#importFile` input, and the real "Turn into notes" select. A pass needs 1 step, a state after Undo equal to the state before (snapState), and a state after Redo equal to the state after the action.

| path | branch x1 | branch x4 | branch x1+250ms | branch x4+250ms | main x1+250ms | main x4+250ms |
|---|---|---|---|---|---|---|
| Ctrl+D at end, Song view Drop part (4→8→4→8 bars, 168→336→168→336 notes) | 1 | 1 | 1 | 1 | 2 (undo leaves 8 bars) | 2 |
| Ctrl+D at end, plain loop | 1 | 1 | 1 | 1 | 2 | 2 |
| Ctrl+C then Ctrl+V past end | 1 | 1 | 1 | 1 | 2 | 2 |
| Selection bar Duplicate, 2 tracks (3→5→3→5) | 1 | 1 | 1 | 1 | 2 (undo leaves 4) | 2 |
| Selection bar Delete, 2 tracks (3→1→3→1) | 1 | 1 | 1 | 1 | 2 (undo leaves 2) | 2 |
| Voice note into an empty song | 1 | 1 | 1 | 1 | 1* | 1* |
| Turn into notes (select; sets the key, adds the part, mutes the audio) | 1 | 1 | 1 | 1 | 3 | 3 |
| Turn into notes via the assistant (runActions) | 1 | 1 | 1 | 1 | 1 | 1 |

Undo and Redo were exact on every branch row. *A new song is already 4 bars and sing.wav (4.6 s) fits, so `setBars` does nothing. The voice note into an empty **1-bar or 2-bar** song with a 250 ms redraw: branch 1 step (1→4→1 bars, 0 tracks after Undo); main 2 steps (Undo leaves 4 bars). The empty song's first save adds an auto `sections` entry to the snapshot, the same on main and harmless. Logs: /home/claude/reports/ux20/groups-branch.log, groups-branch-lag.log, groups-main-lag.log

**Edge cases (extra.mjs; branch and main identical when the machine is quiet):**
- Ctrl+D at 8 bars: 1 step, 8→16→8.
- Ctrl+D at 16 bars: refused with a toast; 0 steps, nothing changed.
- Delete ALL 3 tracks with the selection bar: 1 step. The loop state goes empty→stopped on Undo and back to empty on Redo.
- Duplicate an audio track with a notes track: 1 step. The audio buffers are still there after Undo and Redo.
- Two Turn into notes in a row: 2 steps, and Undo removes only the second.
- A nudge right after Ctrl+D past the end stays its own step: Undo 1 = the nudge, Undo 2 = back to 4 bars.

**Normal note editing (edits.mjs, Undo steps per action, branch = main at x1 and x4):**
- drag a note: 1
- drag its pitch: 1
- 3 arrow nudges: 3
- 2 transposes: 2
- draw a note: 1
- Delete: 1
- Ctrl+A Ctrl+D: 1
- Ctrl+D twice inside the loop: 2
- velocity drag: 1
- typing a BPM: 1

No giant steps. To get all the way back: 16 Undo presses on both builds at x1.

### 4. 10 minutes of normal editing on the branch (session.mjs)
- **30 rounds in 10m13s at CPU x1.** Each round:
  - New song by asking (Böhmer, Bodzin, or techno drums), then bass and chords.
  - Piano roll: draw 4 notes, box-select, Ctrl+C, nudge, Ctrl+V, Ctrl+D, velocity drag, then Ctrl+A Ctrl+D past the end with Undo/Redo by keys.
  - "Make it a full track", then in Song view select a section, Ctrl+D, Delete, Undo x2.
  - Ctrl+D on the bass's Drop part, then Undo.
  - Import sing.wav, Turn into notes (bass/chords/melody in turn), Undo (the editor doesn't stay on the deleted track), Redo.
  - "Turn the voice note into chords" through the assistant.
  - Duplicate 2 tracks with the selection bar, then Undo.
  - Save, new song, reopen from the songs list.
- **About 14 assertions per round, about 420 in total: 0 failed. Page errors: 0.**
- Console: only `net::ERR_TUNNEL_CONNECTION_FAILED` (no network in the sandbox, expected).
- Log: /home/claude/reports/ux20/session.log

### 5. Merge check (git merge --no-commit --no-ff, then aborted)
| merged into | ai-9 (5210af0) | ux-19 (2a9e73a) | ux-14 (e92e25f) |
|---|---|---|---|
| main ef6dec8 | clean; index.html = rebuild | clean; index.html = rebuild | CONFLICT index.html, src/actions.js, tests/smoke.mjs |
| preview-ux-20 | clean; index.html = rebuild | **CONFLICT tests/smoke.mjs only** (keep both appended checks) | CONFLICT index.html, src/actions.js, tests/smoke.mjs (same as on main, nothing new) |

- src/edit.js merges cleanly with UX-14. UX-14's `c:n.c` change ends up inside the new `transcribeInto`, and its other changes don't call `transcribeTrack`.
- No branch uses the removed `ED.oneStep`.

## Screenshots
- /home/claude/reports/ux20/shots/*.png: each grouped path at x1 and x4, plus edits-x1.png and edits-x4.png.
- /home/claude/reports/ux20/session/s1-beat.png … s7-reopened.png. I looked at all of them: the layout is fine, the duplicated tracks sit right under their originals, and the editor closes when its track is undone.

## Scripts
/home/claude/reports/ux20/{ctrld,groups,edits,voice,extra,session}.mjs: run as `node <script> <repo> [cpu list] [lag ms]`.

## Fix list
None needed for gate 2. When merging with UX-19, keep both smoke blocks. Optional follow-ups: problems 2 and 3.
