# UX-20 · branch check · qa-tester · 22 Nov 2026 (16:13 IST check-in, ~19:00)
Read `.claude/standards/dev-standards.md` first (Quality bar: every change undoable; one user action = one undo step). Follow `.claude/agents/qa-tester.md`.
Branch `origin/preview-ux-20` (head 6e1b080, off main ef6dec8). Developer report: `.claude/work/reports/UX-20-build.md`. It fixes your QA-2 finding (Ctrl+D past the loop end needs two Undos on a slow computer) and groups four more multi-save actions into one undo step: Duplicate / Delete with several tracks selected, a voice note dropped into an empty song, "Turn into notes" on a recording. Note: its new smoke line briefly replaces the global `renderTracks` to fake a slow redraw (restored in a finally).
1. `bash .claude/tools/check.sh` (any FAIL blocks; rerun once on a known load flake and say so). Also a local merge with `origin/preview-qa-2` (don't push it).
2. Your probe `.claude/work/reports/qa2-probes/ctrld.mjs` at CPU x1, x4, x10 on branch vs main.
3. Each of the five grouped actions: one Ctrl+Z undoes all of it, Ctrl+Shift+Z redoes it exactly, at CPU x1 and x4. Normal note editing (drag, type, nudge) still merges/splits undo steps as on main (no giant steps).
4. 10 minutes of normal editing on the branch (piano roll, copy/paste, Song view sections, import a voice note, assistant transcribe) — no page errors.
5. Merge check vs `origin/preview-ai-9`, `origin/preview-ux-19`, `origin/preview-ux-14` (git merge --no-commit --no-ff, then abort): which conflict, where.
Report only, no pushes. Save to `/home/claude/reports/UX-20-test.md`; verdict READY / NOT READY with ranked problems and a fix list if not ready.
