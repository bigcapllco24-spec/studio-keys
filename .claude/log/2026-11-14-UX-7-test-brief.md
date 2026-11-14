# UX-7 branch check brief (qa-tester) · 14 Nov 2026

Read `.claude/standards/dev-standards.md` first (Quality bar: check.sh passes, no console errors, every change undoable). You are qa-tester: read `.claude/agents/qa-tester.md` and follow it as your role. Never change product code.

Repo `/home/claude/studio-keys-repo`. Check out branch `preview-ux-7` (head 236393d, pushed; `git fetch && git checkout preview-ux-7`). The developer's report: `.claude/work/reports/UX-7-build.md` on that branch.

## What UX-7 fixes (your bugs from this morning)
1. After double-clicking a part in the Song view, keys now go to the note editor (the canvas takes focus): Ctrl+A + Delete removes notes, not the section; Ctrl+D duplicates notes; Delete with nothing selected does nothing; clicking a section name then Delete still removes the section. Space plays/stops in the editor too.
2. The MIDI import toast in Song mode names every new track ("“Lead” and “Kick” play in Drop…").
3. Extra (not asked): Ctrl+D past the loop end (loop doubles) is now ONE Undo step (was two, one Undo left notes doubled), Loop and Song mode.
The developer added 4 smoke checks to `tests/smoke.mjs` (your file; review them, keep or tidy).

## The job
1. `bash .claude/tools/check.sh` on the branch; paste the summary.
2. Re-run your own bug-1 and MIDI-toast steps with a real mouse and keyboard.
3. Regressions to look for, since the editor canvas can now hold keyboard focus:
   - The computer keyboard as a piano (the letter keys that play notes) and the MIDI keyboard: do they still play after you click in the editor, in Loop and Song mode, the same as on `main`? If clicking the editor used to leave piano keys working and now doesn't (or the reverse), report it.
   - Arrow keys, Ctrl+C/X/V, Ctrl+Z/Y in the editor; Escape; closing the editor and then Delete on a selected section.
   - Space in the editor while the song plays; Space after clicking a section name.
   - Double-click on an audio part still shows the "That's a recording" toast and doesn't break focus.
   - Phone width 390 px: the Song map and editor still open; no new focus ring or scroll jump (the canvas uses focus with preventScroll).
   - Three themes: the focus ring (only shown on Tab) uses theme colours.
4. Verdict: READY or NOT READY with ranked bugs (steps, what happened vs expected).

Write your report to `/home/claude/studio-keys-repo/.claude/work/reports/UX-7-test.md` as you go, then reply with the same content. If you change tests, commit on `preview-ux-7` only under `tests/`, do NOT push. Keep it focused (about 15 minutes).

Commit messages end with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZARJzRgFvLd7sGMPQuG
