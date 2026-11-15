# UX-9 branch check (qa-tester) · 15 Nov 2026 07:13 IST check-in

Read `.claude/standards/dev-standards.md` first (Quality bar).

Check branch `preview-ux-9` (head 2d06741) before the owner sees it. Bug (yours, HQ bugs/qa-2026-11-15-1): a controller's Play/Start, Continue or MMC Play threw a TypeError (LOOP.layers) and nothing played. Work only in your own worktree `/home/claude/wt-ux-9` (already on `preview-ux-9`; `git pull --rebase` first; don't check out other branches there). The developer's report is `.claude/work/reports/UX-9-build.md`.

1. `bash .claude/tools/check.sh` (any FAIL blocks).
2. Focused test in headless Chrome with fake MIDI: MIDI Start (0xFA), Continue (0xFB), Stop (0xFC), MMC Play/Stop/Pause, in Loop mode and Song mode, on an empty song (nothing should happen, no error) and with a beat; while recording; the MIDI monitor list showing transport; keys and pads still play notes; no page errors.
3. Look for regressions near the change (transport buttons, loop button, Space).
You may add or fix lines in `tests/smoke.mjs` (your file) and commit/push them to `preview-ux-9`; never change product code and never push main. Save files as you go.

Save your report to `.claude/work/reports/UX-9-test.md` in the worktree, commit and push it. Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
