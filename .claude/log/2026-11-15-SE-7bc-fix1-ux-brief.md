# SE-7b+7c fix 1, studio · studio-ux-dev · 15 Nov 2026 (17:13 IST check-in)

Read `.claude/standards/dev-standards.md` first (Quality bar: one undo step per action; honest key display is the owner's rule). The tester's first check of `preview-se-7bc` (head 4afe858) is NOT READY: read `.claude/work/reports/SE-7bc-test.md` on the branch (its test scripts are in `.claude/work/se7bc-qa/`, the drum-loop check is `node tests/keys.mjs --quick`, rendered test songs may still be in `/tmp/qa/se7bc/songs/`). Your role file is `.claude/agents/studio-ux-dev.md`.

Fix two small rough edges (your files only; keep it small, about 30 minutes):
1. While playing, the playhead line is drawn over the song card's text (1400 px). The card should sit above the playhead (or the playhead stop at the lanes).
2. At 390 px, the last action's toast covers the fixer sheet's "Use …" button and the "Or type one" box for ~3 s. Move the toast clear of the fixer while it is open.
Check 1400, 390 and 360 px in Emerald, Velvet and Sapphire; screenshots to `/home/claude/shots/se-7c/fix1-*.png`.

Work only in your worktree `/home/claude/wt-se-7bc-ux` (local branch `se-7bc-ux` tracking `origin/preview-se-7bc`). Two other developers push to this branch at the same time from their own worktrees. Before each push: `git pull --rebase`; if `index.html` conflicts, take either side, rerun `python3 tools/build.py`, add it and continue. Rebuild `index.html` with `python3 tools/build.py`; `bash .claude/tools/check.sh` must pass (load-sensitive save/reopen and velocity-drag checks: rerun once). Commit and push with `git push origin HEAD:preview-se-7bc` (never main). Add a "Fix 1" section to `.claude/work/reports/SE-7c-ux.md` (commit and push). Final message: the Fix 1 section text.
