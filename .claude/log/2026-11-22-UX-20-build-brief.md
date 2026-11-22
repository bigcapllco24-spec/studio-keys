# UX-20 · build (bug fix, no design gate) · studio-ux-dev · 22 Nov 2026 (16:13 IST check-in, ~18:10)

Read `.claude/standards/dev-standards.md` first. What matters here, from "Quality bar": every change is undoable, and ONE user action is ONE undo step (anything that changes the song goes through `saveProject`). Performance: the page stays responsive while playing; it must also behave the same on a slow computer.

## The bug (found by qa-tester in QA-2, 22 Nov; full notes in `.claude/work/reports/QA-2-upkeep.md`, "Still flaky / problems found" item 1, probe `.claude/work/reports/qa2-probes/ctrld.mjs`)
On a slow or busy computer, Ctrl+D (duplicate) at the end of the loop needs TWO Undos.
Steps: make a 4-bar loop with drums, chords, bass and 2 melodies; Song view → Full track; double-click Chords in the Drop; Ctrl+A, then Ctrl+D (the loop doubles to 8 bars and the notes are pasted); with DevTools CPU 4x slowdown, Ctrl+Z once. Result: still 8 bars and 96 notes; a second Ctrl+Z is needed. Probe: 1 undo step at CPU x1-x3 (two saves 13-109 ms apart), 2 steps at CPU x4 (156 ms apart).
Cause (tester): `edPaste` (`src/daw.js`) calls `setBars()` (`src/studio.js`), which saves and re-renders before the paste is saved; `undoNote` (`src/edit.js`) only merges saves under 120 ms apart.
Fix idea: wrap the loop doubling and the paste in `undoGroup()` (or the equivalent you already use), so it's one step whatever the timing. Check the other places that call `setBars()` or several saves for one user action (paste past the loop end, duplicate in Song view, drag a clip past the end, Ctrl+V) and fix the same way where needed. Don't change the 120 ms merge rule for normal typing.

## Where to work
Branch `preview-ux-20` off `origin/main`; work in `/home/claude/sk-ux20`. Your files only (daw.js, studio.js, edit.js; tests: append one smoke line at the END of `tests/smoke.mjs` that runs the Ctrl+D case with the CPU throttled (CDP `Emulation.setCPUThrottlingRate` 4) and checks one Ctrl+Z restores 4 bars and the old note count). Rebuild with `python3 tools/build.py`, commit + PUSH `preview-ux-20` after each step (never main). Another agent may be running Chrome on this machine at the same time.
`bash .claude/tools/check.sh` must pass. Save your report to `/home/claude/reports/UX-20-build.md` as you go and reply with it: cause, fix, every path you checked, test numbers (CPU x1 and x4), check.sh summary, and a 4-step Try list for a musician.
