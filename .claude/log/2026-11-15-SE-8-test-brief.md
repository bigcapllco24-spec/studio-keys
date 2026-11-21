# SE-8 branch check · 15 Nov 2026 (12:13 IST check-in) · qa-tester

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

Check branch `preview-se-8` (head 051b5e0) before the owner sees it. It fixes your own bugs from this morning's daily session (bug 1; `.claude/work/reports/QA-1-daily-2026-11-15.md`). The developer's report: `.claude/work/reports/SE-8-build.md`. Work only in the worktree `/home/claude/wt-se-8` (`git pull --rebase` first; don't check out other branches there).

1. `bash .claude/tools/check.sh` (any FAIL blocks). Note: today two save/reopen checks ("opening the app starts a new empty song", "Undo right after opening a song") failed once under heavy load on two branches and passed on rerun. If they fail, rerun once and say whether it's load-related (and if it also happens on `main`).
2. Focused test of the fix with your own steps from this morning, then the brief's own done-when: 'drums like Ben Böhmer', '124 bpm drums like Stephan Bodzin' and 'house drums' each followed by 'another one' ×10 in one song: every pair under 0.9 alike on the 16th grid (report worst/typical), 10 different replies, still that artist's vibe (tempo, kit, four-on-the-floor where expected), and listen: does each try sound clearly different and still musical? 'change the hats to 16ths' keeps the kick and percussion; 'more swing' keeps the pattern.
3. Look for regressions near the change: SE-3 feel/swing checks, save and reopen keeps the groove and its memory, Undo after 'another one', Song mode pattern B, drums-only peaks/no clipping, 4- and 8-bar loops, a few other styles (trap, dnb, techno).
You may add or fix lines in `tests/smoke.mjs` and commit/push them to `preview-se-8`; never change product code, never push `main`. Save files as you go.

Report to `/home/claude/wt-se-8/.claude/work/reports/SE-8-test.md` (commit and push it). Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
