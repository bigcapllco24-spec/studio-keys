# UX-1 · branch re-check after fixes (qa-tester) · 13 Nov 2026, 08:45 IST

Read `.claude/standards/dev-standards.md` first ("Quality bar"). You are qa-tester. Read `.claude/agents/qa-tester.md` and follow it as your role.

## Where
- Branch `preview-ux-1` at **37e64c9** (pushed). Make your own worktree: `git -C /home/claude/studio-keys worktree add /home/claude/wt/qa-ux-1 origin/preview-ux-1` (detached is fine). Don't touch `/home/claude/wt/se-3` or `/home/claude/wt/ux-1`. Another tester checks the other branch at the same time; if check.sh fails in a way that looks like a /tmp clash, rerun it.
- You may add or fix smoke lines in `tests/smoke.mjs`; commit and push them to `preview-ux-1` (end commit messages with
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HCuZASXv5gM1W5JsBFAK37). Never change product code.

## What to check
1. `bash .claude/tools/check.sh` (any FAIL blocks).
2. Every fix in the developer's report `.claude/work/reports/UX-1-fix.md` (main repo `/home/claude/studio-keys`), against the bugs in `.claude/work/reports/UX-1-test.md` and `UX-1-test-b.md`: reproduce each original bug's steps; it must be gone.
3. A short producer session for regressions around the fixes (15 minutes max): make a beat by reference, add parts, sing a part (fake mic), edit, save and reopen.
4. Keep it quick: this is a re-check, not a full session.

## Report (write to `/home/claude/reports/UX-1-test-c.md`, return the full text)
Verdict first: READY / NOT READY. Then: each fix confirmed or not, any new bug (severity, steps, expected, actual, owner file), check.sh summary, last commit on the branch.
