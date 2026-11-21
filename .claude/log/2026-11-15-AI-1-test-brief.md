# AI-1 branch check (qa-tester) · 15 Nov 2026

Read `.claude/standards/dev-standards.md` first (Quality bar; the UX-4 phone note: every UI change checked at 390 and 360 px).

Check branch `preview-ai-1` before the owner sees it. Work only in your own worktree `/home/claude/wt-ai-1` (it is on `preview-ai-1`; run `git pull --rebase` there first; don't check out other branches there). The developer's report is `.claude/work/reports/AI-1-build.md` in that worktree.

1. `bash .claude/tools/check.sh` from `/home/claude/wt-ai-1` (any FAIL blocks).
2. A focused test of the item in headless Chrome, used like a producer: song sections by voice (arrange, section, parts, transition, loop_section, transport from). Test the whole flow in proposal section 2 through handleRequest with the offline brain (ASSIST.engine = null), Hinglish lines, 'make the loop 8 bars' still changing the loop, 'another one' and 'let me sing the bassline' regressions, one undo step per request, the owner's choices (3-minute default, club/extended/DJ = 6 minutes, arrange never adds parts and suggests bass/chords, riser = roll + crash and Keys says so), the mini song map in the reply bubble at 1400 and 390 px, MP3 export of an arranged song with transitions (no clipping). If you have the Cloudflare connector, also run 8-10 song requests through /accounts/d9810812643ee32e2460689ca2ff73eb/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast with the branch's SYSTEM prompt (same settings as askLlama in cloudflare/worker.js), including the line assistant-dev added after its run (don't offer risers or filter sweeps), and say whether the actions are usable. Review assistant-dev's 4 new smoke lines.
3. Look for regressions near the change.
You may add or fix lines in `tests/smoke.mjs` (your file) and commit/push them to `preview-ai-1` (`git push origin preview-ai-1`); never change product code and never push main.

Save your report to `.claude/work/reports/AI-1-test.md` in the worktree, commit and push it. Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
