# UX-7 merge main · 15 Nov 2026 (12:13 IST check-in) · studio-ux-dev

Read `.claude/standards/dev-standards.md` first (How we build, Quality bar). Your role file is `.claude/agents/studio-ux-dev.md`.

UX-7 (Delete in the note editor acts on notes, not the song section; plus the MIDI import toast naming every new track) passed the tester and is waiting for the owner on its test link. Since then `main` got UX-2 (studio fixes), UX-5 (a part sung in Song mode says which section it plays in) and SE-3, and **`preview-ux-7` no longer merges cleanly with `main`**: conflicts in `src/daw.js`, `src/song.js` and `index.html`. Your build report is `.claude/work/reports/UX-7-build.md`.

Work only in your worktree `/home/claude/wt-ux-7` (on `preview-ux-7`; don't check out other branches there).
1. `git fetch origin && git merge origin/main`. Resolve `src/daw.js` and `src/song.js` keeping **both** sides' behaviour (UX-7's edFocus / Space in editor / one-undo Ctrl+D / batched import toast, and main's UX-2 + UX-5 changes, e.g. UX-5's section-named reply/toast in `songSync`: make the two toasts one sensible message, not two). For `index.html` take either side and **rebuild** with `python3 tools/build.py`.
2. `bash .claude/tools/check.sh` must pass with all of main's checks and UX-7's 4 checks.
3. Commit the merge and push `preview-ux-7` (never `main`). No new features.

Save files as you go. Write a short report to `/home/claude/wt-ux-7/.claude/work/reports/UX-7-merge.md` (commit it on the branch): how each conflict was resolved, the toast wording now, check summary. Final message: the report text.
