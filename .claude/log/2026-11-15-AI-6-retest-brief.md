# AI-6 re-check after fix 1 · qa-tester (for the next check-in to launch)

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

Re-check branch `preview-ai-6` (head 5b8c089) after the developer's fix 1. Your first report: `.claude/work/reports/AI-6-test.md`; the developer's "Fix 1" section is at the end of `.claude/work/reports/AI-6-build.md` (both on the branch). Work in a worktree on `preview-ai-6` (e.g. `git worktree add /home/claude/wt-ai-6-qa origin/preview-ai-6`, then `git switch -c`/track that branch; never `git pull --rebase` against main there).

1. `bash .claude/tools/check.sh` (any FAIL blocks; the two save/reopen checks are load-sensitive: rerun once).
2. Re-run every bug and rough edge from your first report: fixed or not, with numbers. Also: whole-song 'turn it down a bit' now moves every fader by the same dB (undoable, master untouched); 12 changes then 12 Undos restore exactly; Hinglish level, swing and voice-note phrases; reply and chip numbers match; 'punchier' caps at +6 dB low EQ; 'hats ko soft karo' never becomes a high cut. The branch sits on preview-ai-4.
3. Regressions near the fix.
You may add smoke lines and commit/push them to `preview-ai-6`; never product code, never `main`.

Report to `.claude/work/reports/AI-6-retest.md` on the branch (commit and push). Verdict first: READY or NOT READY, then bugs, numbers. Final message: the report text.
