# SE-7a re-check after fix 2 (qa-tester) · 15 Nov 2026

Read `.claude/standards/dev-standards.md` first. Worktree `/home/claude/wt-se-7` on `preview-se-7` (head 2ede507; `git pull --rebase` first). Your last report: `.claude/work/reports/SE-7-retest.md` (NOT READY: changing the key didn't move parts when the key came from the user's notes; chip didn't follow piano-roll edits). Fix notes: "Fix 2" in `.claude/work/reports/SE-7a-build.md` (also small edits in `src/daw.js`).

Keep it focused (about 15 minutes):
1. `bash .claude/tools/check.sh` (any FAIL blocks).
2. Your exact steps for new bug 1 (hum D minor, bass, chords, "Keys, change the key to C minor" through the AI action mock, and the Key menu; also Am chords played + Keys' bass + Key menu C minor): notes outside the new key, popover text, one undo step, Undo restores. Check the popover Set still only relabels and sung takes / Keys-picked / vibe keys don't move notes on their own.
3. New bug 2: draw notes on an empty track and transpose all +2: the chip follows (and no lag while dragging notes).
4. Quick regression: chip states at 390 px in one theme, a sung melody, new parts follow the key.
Note: the offline parser has no action for "change the key to C minor" (same as main) - not this fix.
You may add or fix lines in `tests/smoke.mjs` and push to `preview-se-7`; never change product code, never push main.

Save `.claude/work/reports/SE-7-retest2.md`, commit, push. Verdict first (READY / NOT READY), then bugs, rough edges, numbers. Final message: the report text.
