# UX-13 branch check · qa-tester

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

Branch `preview-ux-13` is checked out (detached) in `/home/claude/qa-ux-13`. Work only there; don't commit or push.
The brief is `.claude/log/2026-11-17-UX-13-brief.md` and the developer's report is `.claude/work/reports/UX-13-build.md` (both in /home/claude/studio-keys). The original repro scripts and files from your 17 Nov daily session are in /tmp/qa/2026-11-17/.

1. `bash .claude/tools/check.sh` in the worktree (paste the summary; any FAIL blocks).
2. Re-run your own repro paths for each bug in the brief: is each one fixed, with numbers?
3. Regression hunt around the change (15 minutes): what else touches the same code? Try the nearby things a producer would do and compare with main where useful.
4. Verdict: **READY** or **NOT READY** (with the exact failing steps). Also write 2-4 short "try" steps a musician can follow on the test link to see the fix.

Save the report as you go to `/tmp/reports/UX-13-test.md`. Final message: the report.
