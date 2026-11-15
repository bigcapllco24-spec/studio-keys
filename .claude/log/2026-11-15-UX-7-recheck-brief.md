# UX-7 re-check after merging main · 15 Nov 2026 (12:13 IST check-in) · qa-tester

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

`preview-ux-7` (head 09c5bbd) had merge conflicts with `main` and studio-ux-dev merged `main` in (UX-2, UX-5, SE-3). Report: `.claude/work/reports/UX-7-merge.md`. The editor canvas `pointerdown` (UX-7's `edFocus()` + UX-2's velocity group drag) and the "plays in" toast in `songSync` (UX-5 + UX-7) now hold both items' code.

Work only in your worktree `/home/claude/wt-ux-7` (`git pull --rebase` first; don't check out other branches there).
1. `bash .claude/tools/check.sh` (any FAIL blocks).
2. Focused: double-click a part → Ctrl+A / Delete / Ctrl+D / arrows / Undo act on notes, not the section; clicking a section name then Delete removes the section; the editor takes focus after typing to Keys (your finding today) in Loop and Song mode; velocity lane group drag still works (one undo); sung part in Song mode gives one toast with UX-5's text; a MIDI import names every new track in one toast; Space plays/stops in the editor and in the song area; 390 px no sideways scroll.
You may add smoke lines and commit/push them to `preview-ux-7`; never product code, never `main`.

Report to `/home/claude/wt-ux-7/.claude/work/reports/UX-7-retest.md` (commit and push it). Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), numbers. Final message: the report text.
