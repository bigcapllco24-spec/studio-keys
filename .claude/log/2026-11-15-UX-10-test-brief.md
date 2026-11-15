# UX-10 branch check · 15 Nov 2026 (12:13 IST check-in) · qa-tester

Read `.claude/standards/dev-standards.md` first (Quality bar). Your role file is `.claude/agents/qa-tester.md`.

Check branch `preview-ux-10` (head 4d282f7) before the owner sees it. It fixes your own bugs from this morning's daily session (bug 3; `.claude/work/reports/QA-1-daily-2026-11-15.md`). The developer's report: `.claude/work/reports/UX-10-build.md`. Work only in the worktree `/home/claude/wt-ux-10` (`git pull --rebase` first; don't check out other branches there).

1. `bash .claude/tools/check.sh` (any FAIL blocks). Note: today two save/reopen checks ("opening the app starts a new empty song", "Undo right after opening a song") failed once under heavy load on two branches and passed on rerun. If they fail, rerun once and say whether it's load-related (and if it also happens on `main`).
2. Focused test of the fix with your own steps from this morning, then the brief's own done-when: drums → 'let me sing the bassline' with the fake mic, 5 takes in a row: one note per sung note, 0 doubled stubs, no zero-holes in the take recording; sung chords and melody and a voice note the same; timing: sung notes land on the beat (report onset offsets) with and without 'more swing'; a busy page (stalls) too. Check the recorder works when the page is opened as a local file (file://, worklet via data: url) and the ScriptProcessor fallback.
3. Look for regressions near the change: the drums still play alone while singing, your voice isn't played back live, the mic turns off after, no raw voice track added, import → Turn into notes unchanged, 'Keys, again' re-take, Song-mode sung part toast (UX-5), no page errors.
You may add or fix lines in `tests/smoke.mjs` and commit/push them to `preview-ux-10`; never change product code, never push `main`. Save files as you go.

Report to `/home/claude/wt-ux-10/.claude/work/reports/UX-10-test.md` (commit and push it). Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers. Final message: the report text.
