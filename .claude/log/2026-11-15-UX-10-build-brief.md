# UX-10 bug fix · 15 Nov 2026 (12:13 IST check-in) · studio-ux-dev

Read `.claude/standards/dev-standards.md` first. Sections that matter: "What Studio Keys is for" (singing a bassline or chords over the beat must just work), "Quality bar". Your role file is `.claude/agents/studio-ux-dev.md`.

Bug fix, no design (stage build). From today's tester session (`.claude/work/reports/QA-1-daily-2026-11-15.md` bug 3, HQ bugs/qa-2026-11-15-4): **a sung bassline stutters.** Drums → "let me sing the bassline" with the fake mic (`tests/fixtures/sing.wav`): 2-4 of 11-13 notes come out as a 1/16 stub then the same note again (e.g. G2@8.75/0.25 then G2@9). The take's recording built by `TAKE.finish` in `src/studio.js` has ~87 runs of exact zeros (256-768 samples, 5-16 ms) inside sung notes: chunks are placed by `AudioContext.currentTime` at each ScriptProcessor callback, so callback jitter leaves gaps. `audioToNotes` in `src/edit.js` then reads each gap as a new attack (the reatt rule). Importing the same file and Turn into notes is clean.

Fix the cause: write chunks back to back with a running sample count (aligned to the take start once), so the recording has no holes; and make `audioToNotes` ignore a re-attack that follows a short hole of exact zeros (belt and braces). Keep timing alignment with the beat (a sung note must still land where it was sung; check against SE-3 swing). Also check the sung chords and melody paths and voice notes use the same recorder.

Work only in your worktree `/home/claude/wt-ux-10` (branch `preview-ux-10` from `main`). Add a smoke line in `tests/smoke.mjs` (allowed for this brief): 5 sung bass takes in a row, no zero-runs over 2 ms inside notes and no doubled stubs. Rebuild with `python3 tools/build.py`; `bash .claude/tools/check.sh` must pass. Commit and push `preview-ux-10` at checkpoints (never `main`).

Report to `/home/claude/wt-ux-10/.claude/work/reports/UX-10-build.md` (commit it): cause, fix, numbers before → after (notes per take, doubled stubs, zero-runs, timing offset), check summary. Final message: the report text.
