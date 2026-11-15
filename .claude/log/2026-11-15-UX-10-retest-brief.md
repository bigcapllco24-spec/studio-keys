# UX-10 re-check after fix 1 · qa-tester (for the next check-in to launch)

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

Re-check branch `preview-ux-10` (head bde321f) after the developer's fix 1. Your first report: `.claude/work/reports/UX-10-test.md`; the developer's "Fix 1" section is at the end of `.claude/work/reports/UX-10-build.md` (both on the branch). Work in a worktree on `preview-ux-10` (e.g. `git worktree add /home/claude/wt-ux-10-qa origin/preview-ux-10`, then `git switch -c`/track that branch; never `git pull --rebase` against main there).

1. `bash .claude/tools/check.sh` (any FAIL blocks; the two save/reopen checks are load-sensitive: rerun once).
2. Re-run every bug and rough edge from your first report: fixed or not, with numbers. Also: import → Turn into notes on /tmp/qa/ux-10/stacc-*.wav (or regenerate them) matches main; a gating fake mic keeps repeated notes apart; take end no longer cut (Bluetooth-like 0.25 s latency, last off-beat pickup lands); Stop during the take tail cancels cleanly; fallback recorder improved but limited (low).
3. Regressions near the fix.
You may add smoke lines and commit/push them to `preview-ux-10`; never product code, never `main`.

Report to `.claude/work/reports/UX-10-retest.md` on the branch (commit and push). Verdict first: READY or NOT READY, then bugs, numbers. Final message: the report text.
