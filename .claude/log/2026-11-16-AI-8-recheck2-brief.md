# AI-8 re-check 2 brief — qa-tester

Read `.claude/standards/dev-standards.md` first. Branch `preview-ai-8` head 16ad4b6, worktree `/home/claude/sk-ai-8` (read-only for you; commit nothing; run check.sh only in that worktree). Your last report: `.claude/work/reports/AI-8-retest.md`. The developer's "Fix 2" section is at the end of `/tmp/reports/AI-8-build.md`.

Check only what fix 2 touched, with your own scripts (`/tmp/qa/ai-8/js/`):
1. Your bug 1: explicit lower/set values on the live path win over the "add some never lowers" guard (your three sentences → 20 / 15 / 15), and "add some reverb" (amount 40) still → 52.
2. Your bug 2: Basic mode reads effect numbers ("set the reverb on the chords to 20%", "reverb at 30%", "… to 20% and add some delay").
3. Your bug 3: one Undo per request with a full (120+) history on a simulated slow machine. It also added one line in `src/edit.js` `undoNote` — make sure manual undo/redo is unchanged.
4. Your older bug 4: "remove the reverb from the chords" keeps the track and turns reverb off; "remove the chords" / "delete the bass" still remove the track; "remove the drums and no reverb on the bass" removes the drums only; "mute everything" mutes all.
5. Re-run the 105-phrase comparison and the fix-1 script; say what differs.
6. `bash .claude/tools/check.sh` (paste the summary; re-run once if a timing check you didn't cause fails).

Verdict READY or NOT READY with numbered bugs. Don't hunt for new unrelated bugs this time (list anything you happen to see in one line each). Save the report as you go to `/tmp/reports/AI-8-retest2.md`. Short and plain. Final message: the report.
