# QA-2 smoke-test upkeep (qa-tester, 22 Nov 2026)

## Verdict: done. The smoke test is stable under load on `preview-qa-2` (head ac0b714, pushed; main not touched)
- **Branch:** passed all 14 normal and loaded runs (6 of them on the final head), at load up to 10.4. No check was dropped. One check was added, so there are 92 (main has 91).
  - CPU x3 throttled runs: the final head passed.
  - An earlier head failed once because of a test bug, which I fixed (settle).
  - Another earlier head failed once on Ctrl+D, which is bug 1 below.
- **Main, same day, same machine:** failed in 3 of 10 normal runs, plus 5 instrumented runs that all passed.
  - 2 were the reload pair, both at load 1-5.
  - 1 was Ctrl+D under CPU x3.
- **check.sh time:**
  - On a quiet machine: 2m08s to 2m24s on the branch, 2m20s to 2m38s on main.
  - Under load from other agents: 2m50s to 3m34s.
  - At load 9-10: 5m56s to 6m21s.
- **One flake is left, and it's a real product bug, not a test problem.** On a slow or busy machine, Ctrl+D at the end of the loop needs two Undos (bug 1 below). I kept the check strict.

## What I changed and why (only `tests/smoke.mjs` and `.claude/tools/check.sh`)
All smoke edits are small and stay on the existing lines, except:
- one helper block after the `W`/`E` line (near the top);
- one new check after the reload checks (middle of the file).

Nothing at the end of the file changed, so the branches that append there still merge. Edits, in order:

1. **Helpers** (new block after line 20):
   - `until(fn, arg, timeout)` waits on app state. It returns false on timeout, so the check after it reports the failure.
   - `settle(sel)` waits until the page and every scroller have stood still for 300 ms (at most 6 s).
   - `closeChrome()`: `b.close()`, raced against 15 s, then SIGKILL to Chrome's process group.
   - A 15-minute watchdog.
   - SIGINT, SIGTERM and SIGHUP handlers, and an unhandled-rejection handler; each closes Chrome.
   - `SK_CPU_SLOW=<n>` runs the page on an n-times slower CPU, to find timing flakes on purpose.
2. **`protocolTimeout: 600000`** on launch. The default 180 s caused the `Runtime.callFunctionOn timed out` aborts at the whole-song MP3 step under load.
3. **Chrome is always closed:** the last line is `await closeChrome()` instead of `await b.close()`.
4. **Save/reopen before reload** (the reload pair): `saveProject()` used to be followed by a fixed 600 ms wait.
   - Now the test waits (at most 30 s) until all three are true:
     - the local copy is written (`projSaveT` is 0 and `store.project.name` is 'Before reload');
     - the songs list (IDB) has 'Before reload';
     - the header says Saved.
   - Since that check now waits for the autosave, I **added a check**: "closing the app right after an edit keeps it: the songs list has it on the next open".
     - Steps: rename, `saveProject`, reload at once, then the songs list must have the edit.
     - This keeps covering pagehide + keepLastSong, which the old 600 ms version only covered by accident.
5. **Sing the bassline:**
   - waits for the reply instead of 300 ms;
   - checks "only the drums play" once `LOOP.state === 'take'`, instead of after 3.5 s;
   - waits for the take to finish (bass take track exists, state not take/counting), up to 60 s, instead of a fixed 11 s.
6. **Sung chords:** waits for the take to finish instead of 14.5 s. In Song mode, it waits for the "Sung chords" toast instead of 1.3 s.
7. **Listening off:**
   - waits for `MIC.on` instead of 1.2 s;
   - after off-on-off, waits for: mic off, no start pending, no recogniser live; then asserts as before.
8. **Imports:** waits for the Lead track and then the audio track, instead of 0.8 s and 1.5 s. The MIDI file into the Drop waits for its toast (+0.5 s), instead of 1.6 s.
9. **Velocity lane drag, relaxed double-click, Song-mode editor keys, section click, after typing to Keys:** `settle()` runs before every measure-then-click.
   - **Root cause found with a probe:** `openEditor()` scrolls smoothly, and that scroll keeps going even after the test's own instant `scrollIntoView`.
   - At CPU x3, a part kept moving for about 1.7 s: y went 517 → 396 → 356 px. So the mouse landed on the wrong place.
   - That explains the velocity-drag "0.71/0.51", the relaxed double-click, and the "−1 notes" editor-keys FAILs.
10. **Editor keys:**
    - after a double-click, waits for the editor to be open (and to have focus, after typing to Keys), instead of 400 ms;
    - waits for the selection after Ctrl+A, for the note count after Delete and Ctrl+D, and for `TR.running` after each Space, instead of 150-250 ms;
    - "after typing to Keys" also waits for `!ASSIST.busy` (20 s), not only for the reply bubble.
11. **check.sh:**
    - runs the smoke under `timeout -k 20 1200` (a backstop for a hung node);
    - removes its own `/tmp/sk-check.*` folder on exit (main's runs leave an 11 MB folder each);
    - prints `CHECK OK in 2m24s` / `CHECK FAILED in …` ("CHECK OK" is still the first word).

## Run table (all on this 2-core machine; AI-14's own smoke runs were often going at the same time = real load)
Logs: `/home/claude/reports/qa2/<label>.log`. Summary lines: `/home/claude/reports/qa2/times.txt`.

| Label | Code | Kind | Load (min to max) | Result | Time |
|---|---|---|---|---|---|
| main-1 | main | check.sh | 0.5 to 2.7 | OK 91 | 2m38s |
| main-2 | main | check.sh | 2.7 to 1.9 | OK 91 | 2m20s |
| main-3 | main | check.sh | 1.9 to 3.6 | OK 91 | 2m33s |
| final-main-1 | main | check.sh, alternating with branch runs | 3.4 to 5.3 | OK 91 | 3m21s |
| final-main-2 | main | check.sh, alternating | 2.8 to 5.0 | **FAIL 2 of 91: reload pair** (reopened "Smoke sing" 6 tracks) | 3m07s |
| final-main-3 | main | check.sh, alternating | 1.0 to 3.5 | **FAIL 2 of 91: reload pair** | 3m14s |
| slow3-main | main | smoke, CPU x3 | ~9 | **FAIL 1 of 91: Ctrl+D 48 → 96 → 96** | 6m53s |
| load-main-smoke-A, v2-load-main, v2h-load-main-a | main | smoke as load | 4.5 to 9.7 | OK 91 ×3 | 3m30s to 5m28s |
| branch-1/2/3 | 1735819 | check.sh | 1.6 to 4.9 | OK 91 ×3 | 3m15s / 3m08s / 2m50s |
| branch-loaded-A | 1735819 | check.sh + main smoke in parallel | 1.6 to 8.9 | OK 91 | 5m00s |
| slow3-branch | cf997de | smoke, CPU x3 | ~9 | FAIL 3 (double-click missed because the part was still scrolling → my first settle only checked 3 frames; fixed in 7dc7e5a) | 4m41s |
| slow3-branch-b | 7dc7e5a | smoke, CPU x3 | ~5 | FAIL 1 of 91: **Ctrl+D 48 → 96 → 96** (bug 1) | 4m04s |
| final-branch-1/2/3 | 7dc7e5a | check.sh, alternating with main | 1.7 to 5.5 | OK 91 ×3 | 2m38s / 3m22s / 3m34s |
| branch-loaded-B | 7dc7e5a | check.sh + 3 instrumented main smokes + AI-14 | 3.0 to 9.0 | OK 91 | 6m21s |
| merged-ai9-qa2 | 7dc7e5a + preview-ai-9 (local merge) | check.sh | 6.8 to 10.4 | OK **104** | 5m52s |
| **v2-branch-1/2/3** | **ac0b714 (final)** | check.sh | 1.3 to 2.8 | **OK 92 ×3** | **2m24s / 2m08s / 2m12s** |
| **v2-branch-loaded** | **ac0b714** | check.sh + main smoke in parallel | 2.2 to 4.6 | **OK 92** | **3m32s** |
| **v2-slow3-branch** | **ac0b714** | smoke, CPU x3 | ~2 | **OK 92** | 2m51s |
| **v2-branch-heavy** | **ac0b714** | check.sh + 2 smokes in parallel | 1.5 to 9.7 | **OK 92** | **5m56s** |

Same machine, similar load (2-3): main took 2m20s to 2m38s, the final branch 2m08s to 2m24s. The state waits are usually shorter than the old fixed delays; settle() adds about 2 s in total.

## Merge check (`git merge --no-commit --no-ff`, then abort; head ac0b714)
- **origin/preview-ai-9 (5210af0): clean.** **origin/preview-ux-19 (2a9e73a): clean.**
  - I also ran the qa-2 + ai-9 merge for real: check.sh OK, 104 checks, at load 10.
- Also clean: preview-ux-18, preview-ux-15, preview-se-4, preview-se-11, preview-ai-1.
- preview-ux-14 and preview-se-10 already conflict with **main** in `tests/smoke.mjs`: one block each, the same block with or without qa-2. ux-14 also conflicts in `index.html` and `src/actions.js`. These conflicts were there before qa-2.
- Note for the lead: ai-9 and ux-19 conflict **with each other** in `index.html` and `src/actions.js` (main + ai-9, then ux-19). The test files merge fine.

## Still flaky / problems found
1. **(product bug, medium; studio-ux-dev) Ctrl+D at the loop's end needs two Undos on a slow or busy computer.**
   - Steps:
     1. Make a 4-bar loop with drums, chords, bass and 2 melodies.
     2. Song view → Full track.
     3. Double-click Chords in the Drop.
     4. Press Ctrl+A, then Ctrl+D. The loop doubles to 8 bars and the notes are pasted.
     5. On a busy machine (DevTools CPU 4x slowdown), press Ctrl+Z once.
   - Result: the loop stays 8 bars with 96 notes. A second Ctrl+Z is needed.
   - Probe (`probes/ctrld.mjs`):
     - CPU x1 to x3: 1 undo step (13-109 ms between the two saves).
     - CPU x4: **2 steps**, 156 ms apart; 48 → 96 → 96 after one Undo.
   - Cause:
     - `edPaste` in `src/daw.js` calls `setBars()` (`src/studio.js`), which saves and then re-renders the tracks, and then saves the paste.
     - The two saves are only merged into one step if they're under 120 ms apart (`undoNote` in `src/edit.js`).
     - The render in between can take longer than that.
   - Fix idea: wrap the doubling plus paste in `undoGroup()`.
   - The smoke line "Ctrl+D in the editor duplicates the notes, not the section (one Undo)" stays strict. It is right to fail when this happens. The race showed in 2 of the 3 throttled runs where the editor opened (1 main, 1 branch), and in none of the 14 normal and loaded branch runs.
2. **(unresolved, low) Why main's reload pair fails** (2 of 3 alternating runs at load 1-5; it reopened an older "Smoke sing" record with 6 tracks).
   - I couldn't pin the cause. Five instrumented main runs all passed. The IDB read I added before the reload may itself hide the race.
   - The app's own quick-close path is fine. In a direct probe (`probes/reload.mjs`, CPU x1/x3, reload 100 ms and 600 ms after an edit), pagehide + keepLastSong kept the edit 4 of 4 times.
   - The new "closing the app right after an edit" check passed in every run. If it ever fails, that's a real "last edit lost" bug for studio-ux-dev (`src/daw.js` keepLastSong / `src/studio.js` pagehide).
3. **(product, low; not a test bug) Sung takes lose audio when the main thread is busy.**
   - Bassline notes per run:
     - 10-13 on a quiet machine;
     - 9 at CPU x3;
     - 7 at load 9.
   - The take is recorded with a ScriptProcessor, which runs on the page's main thread. The check needs at least 4 notes. I never saw 3 today. The board's "3 notes" would need even heavier load.
   - My waits make sure the count is read only after the take has fully finished. The lost audio itself is product code; UX-10's recorder-tail work sits in preview-ux-14.

## Other notes
- When main's check.sh exits, it leaves `/tmp/sk-check.*` (about 11 MB each). There are 10 on this machine, from main runs and other agents. The branch's check.sh cleans up after itself.
- No Chrome or smoke processes were left running after my runs.
- Probes and runners: `/home/claude/reports/qa2/probes/` (`ctrld.mjs`, `reload.mjs`, `scroll.mjs`, `run.sh`, `smoke.sh`).
- To reproduce a timing flake on purpose: `SK_CPU_SLOW=3 SK_NODE_MODULES=/tmp/sk-test/node_modules node tests/smoke.mjs`.
