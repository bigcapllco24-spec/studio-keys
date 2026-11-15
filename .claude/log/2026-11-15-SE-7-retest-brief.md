# SE-7a re-check after fix 1 (qa-tester) · 15 Nov 2026 07:13 IST check-in

Read `.claude/standards/dev-standards.md` first (Quality bar; the UX-4 phone note: every UI change checked at 390 and 360 px).

Re-check branch `preview-se-7` (head f0e5cd1, "SE-7a fix 1") before the owner sees it. Work only in your own worktree `/home/claude/wt-se-7` (already on `preview-se-7`; `git pull --rebase` first; don't check out other branches there). Your first report is `.claude/work/reports/SE-7-test.md` (READY with 1 medium + 3 low); the developer's fix notes are in `.claude/work/reports/SE-7a-build.md` ("fix 1" section). The earlier re-check was lost in a restart, so start fresh.

1. `bash .claude/tools/check.sh` (any FAIL blocks).
2. Re-test each of your 4 bugs with the same steps (sung melody alone with the fake mic `tests/fixtures/sing.wav`, run it 3 times; chords only F#m-E-D-E; "from your humming" wording for chords + sung melody and for imported audio; the hum reply wording). Then a quick pass over the chip states (no key yet / likely / Keys picked / from your humming / set), popover Set / Back to auto / Undo, new parts following the key, old songs reopening without notes moving, at 1400, 390 and 360 px in Emerald, Velvet and Sapphire.
3. Look for regressions near the change.
You may add or fix lines in `tests/smoke.mjs` (your file) and commit/push them to `preview-se-7`; never change product code and never push main. Save files as you go.

Save your report to `.claude/work/reports/SE-7-retest.md` in the worktree, commit and push it. Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
