# SE-7 branch check (qa-tester) · 15 Nov 2026

Read `.claude/standards/dev-standards.md` first (Quality bar; the UX-4 phone note: every UI change checked at 390 and 360 px).

Check branch `preview-se-7` before the owner sees it. Work only in your own worktree `/home/claude/wt-se-7` (it is on `preview-se-7`; run `git pull --rebase` there first; don't check out other branches there). The developer's report is `.claude/work/reports/SE-7a-build.md` in that worktree.

1. `bash .claude/tools/check.sh` from `/home/claude/wt-se-7` (any FAIL blocks).
2. A focused test of the item in headless Chrome, used like a producer: phase 7a 'honest key': the key chip (no key yet / likely / Keys picked / from your humming / set), its popover (guesses with reasons and DJ key, Set, Back to auto), new parts following the detected key, a short hum not locking the key, old songs reopening without notes moving, Undo of Set, the Key menu, at 1400, 390 and 360 px in all three themes (Emerald, Velvet, Sapphire; colours only from theme variables). Try real use too: play chords + bass in a few keys (major and minor), sing a part with the fake mic, import the MIDI fixture, and check the chip reads sensibly. Review its 4 new smoke lines.
3. Look for regressions near the change.
You may add or fix lines in `tests/smoke.mjs` (your file) and commit/push them to `preview-se-7` (`git push origin preview-se-7`); never change product code and never push main.

Save your report to `.claude/work/reports/SE-7-test.md` in the worktree, commit and push it. Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
