# QA-2 · smoke-test upkeep · qa-tester · 22 Nov 2026 (16:13 IST check-in)

Read `.claude/standards/dev-standards.md` first ("Quality bar": `bash .claude/tools/check.sh` passes: build, bundle syntax, Worker syntax, headless smoke test, no console errors). Then follow `.claude/agents/qa-tester.md`.

## The job
Make the smoke test reliable under machine load, without dropping any check. Flakes seen in the last two days (see `.claude/work/reports/AI-9-retest8.md`, `UX-19-retest4.md`, `QA-1-daily-2026-11-22.md`, and the board's "Follow-ups noted"):
- save / reopen (song-reload) pair fails under load: wait for the autosave to finish (status text or the store's promise) instead of a fixed delay.
- editor keys after typing, Ctrl+D under load, sing-bassline 3 notes: wait on state, not on time.
- Puppeteer/Chrome: set `protocolTimeout` high enough, close the browser in a `finally` (and on failure), so a hung run doesn't leave Chrome behind.
- Keep the whole `check.sh` run at about 3 minutes on this machine (report the time before and after; 3 runs each).

## Rules
- You own `tests/**` and `.claude/tools/check.sh`; touch nothing else.
- Branch `preview-qa-2` off `origin/main`, work in `/home/claude/sk-qa2`. Many open preview branches APPEND smoke lines at the end of `tests/smoke.mjs` (AI-9, UX-19, UX-15, UX-18, UX-14, SE-4, SE-10…). Keep your changes small and local (helpers near the top, targeted edits to the flaky checks); don't reorder, rename or reformat the file, so those branches still merge cleanly.
- Commit + PUSH `preview-qa-2` after each step (never main).
- Prove it: run `bash .claude/tools/check.sh` 3 times on main and 3 times on your branch, and once more on your branch while another Chrome job is loading the machine (e.g. a second smoke run in parallel). Report pass/fail per run and the times.
- Also check your branch merges cleanly with `origin/preview-ai-9` and `origin/preview-ux-19` (`git merge --no-commit --no-ff`, then abort) and say so.

## Report
Save to `/home/claude/reports/QA-2-upkeep.md` as you go and reply with the full report: what you changed and why, the run table, merge check, anything still flaky.
