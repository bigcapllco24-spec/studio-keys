# AI-6 branch check · 15 Nov 2026 (12:13 IST check-in) · qa-tester

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

Check branch `preview-ai-6` (head 1859f7f) before the owner sees it. It fixes your own bugs from this morning's daily session (bugs 2, 4, 5, 6; `.claude/work/reports/QA-1-daily-2026-11-15.md`). The developer's report: `.claude/work/reports/AI-6-build.md`. Work only in the worktree `/home/claude/wt-ai-6` (`git pull --rebase` first; don't check out other branches there).

1. `bash .claude/tools/check.sh` (any FAIL blocks). Note: today two save/reopen checks ("opening the app starts a new empty song", "Undo right after opening a song") failed once under heavy load on two branches and passed on rerun. If they fail, rerun once and say whether it's load-related (and if it also happens on `main`).
2. Focused test of the fix with your own steps from this morning, then the brief's own done-when: offline (Basic mode / AI down): 'turn the voice note into a bassline' and the other phrasings transcribe the recording you have, 'record a voice note' still records; 'turn the melody down a bit', 'make the kick punchier', 'drums too loud', 'softer hats', 'bring the bass up' change level/EQ/compressor and never add, vary or replace a part (Undo restores exactly); 'straighten it a bit' steps 70 → 66 → 58 → 54 → straight, 'make it bouncier' works, 'straighten it' is fully straight; 'let me sing the bassline' gives no next-step hint for the same part. Also try 6-8 sibling phrasings of your own (Hinglish too).
3. Look for regressions near the change: AI-4's fixes (muddy words, voice note → chords), SE-3 swing checks, 'add a melody' / 'another one' still add or vary, 'bounce to mp3' still exports, no clipping after 'punchier' three times. The branch is built on preview-ai-4; the Worker prompt change is not live on the test link.
You may add or fix lines in `tests/smoke.mjs` and commit/push them to `preview-ai-6`; never change product code, never push `main`. Save files as you go.

Report to `/home/claude/wt-ai-6/.claude/work/reports/AI-6-test.md` (commit and push it). Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
