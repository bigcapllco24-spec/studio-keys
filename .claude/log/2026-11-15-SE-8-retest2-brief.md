# SE-8 re-check after fix 2 · qa-tester · 15 Nov 2026 (17:13 IST check-in)

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

Re-check branch `preview-se-8` (head 3343e62) after the developer's fix 2. Your last report: `.claude/work/reports/SE-8-retest.md`; the developer's "Fix 2" section is at the end of `.claude/work/reports/SE-8-build.md` (both on the branch). Work only in your worktree `/home/claude/wt-se-8-qa` (already on branch `preview-se-8`, tracking origin; never check out other branches there, never pull or merge main there). Other testers run at the same time in their own worktrees.

1. `bash .claude/tools/check.sh` (any FAIL blocks; the save/reopen checks are load-sensitive: rerun once).
2. Re-run each bug from your last report: fixed or not, with numbers. Then a short pass over the item's main flow and the developer's new behaviour (see Fix 2), and regressions near it. Add the smoke line the developer suggests in Fix 2 if it is cheap.
3. Keep it focused: about 30 minutes.
You may add smoke lines and commit/push them to `preview-se-8`; never product code, never `main`.

Report to `.claude/work/reports/SE-8-retest2.md` on the branch (commit and push). Verdict first: READY or NOT READY, then bugs, numbers. Final message: the report text.
