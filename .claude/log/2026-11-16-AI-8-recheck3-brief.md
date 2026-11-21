# AI-8 re-check 3 brief — qa-tester (short)

Read `.claude/standards/dev-standards.md` first. Branch `preview-ai-8` head 6bec67c, worktree `/home/claude/sk-ai-8` (read-only; commit nothing; run check.sh only there). Your last report: `/tmp/reports/AI-8-retest2.md`; the developer's "Fix 3" section is at the end of `/tmp/reports/AI-8-build.md`.

Check only fix 3: your bug 1 from re-check 2 (the four sentences on the AI path remove the part: "remove the melody and turn off the reverb", "delete the drums and kill the reverb", "kill the reverb and delete the bass", "remove the melody, no reverb"), the same four in Basic mode, plus "delete the drums and the bass" (both go). Then re-run t12, t13, t14 and the 105 phrases and say what differs from re-check 2 (only the intended remove rows should). `bash .claude/tools/check.sh` (re-run once if a timing check you didn't cause fails).

Verdict READY or NOT READY. Save to `/tmp/reports/AI-8-retest3.md`. Short. Final message: the report.
