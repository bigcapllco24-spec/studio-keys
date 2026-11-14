# UX-8 branch check (qa-tester) · 15 Nov 2026

Read `.claude/standards/dev-standards.md` first (Quality bar; the UX-4 phone note: every UI change checked at 390 and 360 px).

Check branch `preview-ux-8` before the owner sees it. Work only in your own worktree `/home/claude/wt-ux-8` (it is on `preview-ux-8`; run `git pull --rebase` there first; don't check out other branches there). The developer's report is `.claude/work/reports/UX-8-build.md` in that worktree.

1. `bash .claude/tools/check.sh` from `/home/claude/wt-ux-8` (any FAIL blocks).
2. A focused test of the item in headless Chrome, used like a producer: the big loop button: with a beat, press 1 plays, press 2 stops, Rec still overdubs (and Rec again returns to playing), empty song press 1 counts in, the looper-pedal flow on an empty song still overdubs on the button, double-press to stop, Song mode press behaviour unchanged, the label ('Stop loop' / 'Overdub') fits at 390 and 360 px.
3. Look for regressions near the change.
You may add or fix lines in `tests/smoke.mjs` (your file) and commit/push them to `preview-ux-8` (`git push origin preview-ux-8`); never change product code and never push main.

Save your report to `.claude/work/reports/UX-8-test.md` in the worktree, commit and push it. Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
