# AI-1 re-check after fix 1 (qa-tester) · 15 Nov 2026 07:13 IST check-in

Read `.claude/standards/dev-standards.md` first (Quality bar; the UX-4 phone note: every UI change checked at 390 and 360 px).

Re-check branch `preview-ai-1` (head 84b2c0e, "AI-1 fix 1") before the owner sees it. Work only in your own worktree `/home/claude/wt-ai-1` (already on `preview-ai-1`; `git pull --rebase` first; don't check out other branches there). Your first report (NOT READY) is `.claude/work/reports/AI-1-test.md`; the developer's fix notes are in `.claude/work/reports/AI-1-build.md`. The earlier check-in that started this re-check was lost in a restart, so start fresh.

1. `bash .claude/tools/check.sh` (any FAIL blocks; your gap check must now pass).
2. Re-test both bugs from your first report: (a) the gap before the drop is (near) silent for roll + gap, kick drop and "add some silence before the drop" (render offline, give dB numbers like last time); (b) Keys no longer offers risers or filter sweeps (prompt + reply guard). Then the other fix-1 items: section mute -> parts, Hinglish verb-last and wake name offline, "make it longer/shorter", reply tidy-ups. If you have the Cloudflare connector, run 8-10 song requests through `/accounts/d9810812643ee32e2460689ca2ff73eb/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast` with the branch's SYSTEM prompt (same settings as askLlama in `cloudflare/worker.js`) and count riser/filter-sweep offers and unusable actions.
3. Quick regression pass on the main flow from proposal section 2 (arrange, sections, parts, loop_section, play from), 'another one', 'let me sing the bassline', one undo per request, mini song map at 1400 and 390 px, MP3 export of an arranged song (no clipping).
You may add or fix lines in `tests/smoke.mjs` (your file) and commit/push them to `preview-ai-1`; never change product code and never push main. Save files as you go.

Save your report to `.claude/work/reports/AI-1-retest.md` in the worktree, commit and push it. Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
