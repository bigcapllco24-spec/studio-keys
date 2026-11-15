# UX-2 merge brief (studio-ux-dev), 13 Nov 2026 14:25 IST

Read `.claude/standards/dev-standards.md` first ("How we build", "Quality bar").

UX-1 (Song view) was just released to `main` (commit 50b6315). Your UX-2 bug-fix branch `preview-ux-2` (head 8417930, tester READY) now conflicts with main in `src/daw.js`, `src/studio.js`, `tests/smoke.mjs` and `index.html`. The owner has not tried UX-2 yet; we want its test link to include the Song view so what he tries is what ships.

Job:
1. Work in your own clone: `git clone https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-ux2 && cd /home/claude/sk-ux2 && git checkout preview-ux-2`. Set `git config user.name Claude; git config user.email noreply@anthropic.com`.
2. `git merge origin/main` (a merge commit, never rebase or force-push). Resolve conflicts so BOTH UX-1's Song view behaviour and every UX-2 fix stay: Play on a new song works at once (also in Song mode), the velocity lane is visible in the piano roll, sung chords snap to the beat, phone width has no sideways scroll. Keep both sets of smoke checks in `tests/smoke.mjs` (main's Song view block first, then yours). For `index.html` take either side and then rebuild with `python3 tools/build.py`.
3. Run `bash .claude/tools/check.sh`; every check must PASS. If a UX-2 fix interacts with the Song view (e.g. Play on a new song while in Song mode), fix it and add a smoke line.
4. Commit (end the message with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZAS3jBVpAdHnYGDKkHc) and `git push origin preview-ux-2`. Never push main.
5. Report (short): conflicts and how you resolved each, anything you changed beyond the merge, check result (number of checks), new head hash.
Stay in your files (`src/daw.js`, `src/studio.js`, `src/edit.js`, `src/body.html`, `src/head.html` etc. per your role) plus `tests/smoke.mjs` for the merge.
