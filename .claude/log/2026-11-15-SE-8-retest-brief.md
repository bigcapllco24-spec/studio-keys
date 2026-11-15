# SE-8 re-check after fix 1 · qa-tester (for the next check-in to launch)

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

Re-check branch `preview-se-8` (head 5648ed6) after the developer's fix 1. Your first report: `.claude/work/reports/SE-8-test.md`; the developer's "Fix 1" section is at the end of `.claude/work/reports/SE-8-build.md` (both on the branch). Work in a worktree on `preview-se-8` (e.g. `git worktree add /home/claude/wt-se-8-qa origin/preview-se-8`, then `git switch -c`/track that branch; never `git pull --rebase` against main there).

1. `bash .claude/tools/check.sh` (any FAIL blocks; the two save/reopen checks are load-sensitive: rerun once).
2. Re-run every bug and rough edge from your first report: fixed or not, with numbers. Also: 'change the hats to 16ths' in Bodzin/techno/Böhmer gives 16/16 and survives 'another one'; hats not named still vary; no stacked kicks or doubled hats over many seeds; whole-song MP3 peak under -0.3 dBFS over ~10 seeds (new -1 dBFS target); 'another one' ×10 still all under 0.9 alike.
3. Regressions near the fix.
You may add smoke lines and commit/push them to `preview-se-8`; never product code, never `main`.

Report to `.claude/work/reports/SE-8-retest.md` on the branch (commit and push). Verdict first: READY or NOT READY, then bugs, numbers. Final message: the report text.
