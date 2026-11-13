# SE-3 · quick branch re-check 2 (qa-tester) · 13 Nov 2026, 09:12 IST

Read `.claude/standards/dev-standards.md` ("Quality bar"). You are qa-tester; follow `.claude/agents/qa-tester.md`. Never change product code.

Branch `preview-se-3` head **adcf6db**. Use your worktree `/home/claude/wt/qa-se-3` (`git fetch && git checkout --detach origin/preview-se-3`). 
Check, quickly (10 minutes of testing at most):
1. `bash .claude/tools/check.sh` (any FAIL blocks).
2. Your N1, N2, N3 cases from `.claude/work/reports/SE-3-test-c.md` (main repo `/home/claude/studio-keys`): all gone? The developer's report is `.claude/work/reports/SE-3-fix2.md`.
3. Re-run your round-1 fix cases (your `fixes.mjs` in `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/qa/`) for regressions, plus 10 ordinary Basic-mode requests ("make a house beat", "add a bassline", "add chords", "another one", "make it faster", "add a clap", "more reverb on the chords", "let me sing the bassline", "less swing", "undo") compared with main.
Report to `/home/claude/reports/SE-3-test-d.md`, verdict first (READY / NOT READY), short; return the full text.
