# UX-12 test brief — qa-tester (branch check before gate 2)

Read `.claude/standards/dev-standards.md` first.
Item: UX-12, bug fix from your 16 Nov daily session (bugs 1, 2 and the "deleted song comes back" rough edge). Branch `preview-ux-12` (head 547aa3a), worktree `/home/claude/sk-ux-12` (read-only for you; don't commit product code). Developer report: `/home/claude/studio-keys-repo/.claude/work/reports/UX-12-build.md`.

Do:
1. `bash .claude/tools/check.sh` in the worktree (paste the summary line). The developer saw the reload check "song: opening the app starts a new empty song…" fail 3 times under heavy load, only on this branch: run check.sh at least twice and that check alone a few times.
2. Focused test like a user (headless Chrome, read IndexedDB directly): your own repro of bug 1 (Save a copy → Undo, then 10 more edits and undos, reload: original untouched, title stays the copy); BPM box and Tap tempo undo/redo (one step each, exact tempo back); delete the song you're in (stays deleted after 2 s, New song, Open song, reload; saves again only after a change). Also: Save a copy twice in a row, Save a copy then open the original from the list and undo there, assistant tempo change still one undo step, MIDI clock tempo makes no steps.
3. Regressions: autosave, songs list (rename/duplicate/delete others), undo chains (20+ steps) as in your daily session.
Load note: three branch checks run in parallel on this machine, so Chrome timing checks can be flaky. If check.sh has a FAIL, re-run it once; if the same check fails twice, run it on a main worktree too (`git worktree add --detach /tmp/qa-main-<item> origin/main`) and say whether main fails the same way. A FAIL that only appears on this branch twice blocks.
Verdict READY or NOT READY with numbered bugs (steps, expected, actual). Save the report as you go to `/tmp/reports/UX-12-test.md`. Short and plain. Final message: the report.
