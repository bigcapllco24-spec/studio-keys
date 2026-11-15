# AI-1 re-check after fix 2 (qa-tester) · 15 Nov 2026

Read `.claude/standards/dev-standards.md` first. Worktree `/home/claude/wt-ai-1` on `preview-ai-1` (head 0c14317; `git pull --rebase` first). Your last report: `.claude/work/reports/AI-1-retest.md` (NOT READY, bug 1 AI's extra snare roll wipes the gap; bug 2 "out of the build" mutes the whole track). Fix notes: "Fix 2" in `.claude/work/reports/AI-1-build.md`.

Keep it focused (about 15 minutes):
1. `bash .claude/tools/check.sh` (any FAIL blocks; your bug-1 smoke check must pass).
2. Re-run your 13 saved Llama outputs (`/tmp/qa/2026-11-15/ai-1-retest/llm.json`, scripts in that folder) through `handleRequest`: gap beat dB for the Build / Break endings, no riser offers, no unusable actions. Check transitions the user does ask for still apply next to a new layout ("a 4 bar snare roll", "no gap before the drop").
3. Bug 2 wording: "take the bass out of the build", "outro se drums hata do", "intro ke liye bass band karo" (section only); "mute the drums" still whole track.
4. The tidy-ups: "Break 2 (16 bars)" wording, sections numbered in song order, tip doesn't repeat the request, no-op replies don't say "Done", make it longer/shorter in 8/16/32-bar phrases and never under about a minute. Quick regression: arrange flow, 'another one', one undo per request.
You may add or fix lines in `tests/smoke.mjs` and push to `preview-ai-1`; never change product code, never push main.

Save `.claude/work/reports/AI-1-retest2.md`, commit, push. Verdict first (READY / NOT READY), then bugs, rough edges, numbers. Final message: the report text.
