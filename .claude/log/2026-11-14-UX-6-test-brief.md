# UX-6 test brief (qa-tester, branch check) - 14 Nov 2026

Read `.claude/standards/dev-standards.md` first ("Quality bar" and "How we work").

Branch: `preview-ux-6` (head 8d7c605, built on preview-ux-4). Repo /home/claude/studio-keys-repo (`git fetch && git checkout preview-ux-6`). Item UX-6: install Studio Keys on the phone's home screen (manifest, service worker, icons, More → Add to Home Screen, one-time tip, Worker routes for the app files). Developer report: `.claude/work/reports/UX-6-build.md`. The developer's own test scripts (a local server running the real worker.js with GitHub raw mapped to the build, worker routing test, PWA test, UI test) are in /tmp/claude-0/-home-claude/0ea7d9b5-5dab-52c4-a2a3-57210a67d7e2/scratchpad/ux6/ - reuse them, but check independently; don't just rerun them.

1. `bash .claude/tools/check.sh` - any FAIL blocks. Paste the summary.
2. Focused test like a phone user (390 and 360 px, iPhone and Android user agents) over http(s) on a local server:
   - Manifest valid and linked; icons load at stated sizes; Chrome reports it installable (no installability errors).
   - Service worker registers with the page's own scope (main "/" vs "/p/preview-ux-6/" kept separate); never on file://.
   - Online: a changed page shows on the next reload (network first). Offline after one visit: the studio opens, saved songs are there, the offline assistant parser works; /api/* never served from cache.
   - The More → Add to Home Screen page and the one-time tip: Android Install button (fake beforeinstallprompt), iPhone picture steps, hidden once installed (display-mode standalone), tip never covers the Keys button and never returns after dismissal. All three themes.
   - Worker routing: /manifest.webmanifest, /sw.js, /icons/*.png at root and under /p/preview-ux-6/ with right content types; unknown file 404; /, /p/preview-ux-6/ and /api/config unchanged; other paths still redirect to /.
   - Regression: the normal studio still works (make a beat, play, sing a part with the fake mic, edit a note, save and reopen) with the service worker active.
3. If useful and small, add an http check for the manifest link + service worker registration + offline reload to tests/ (you own tests/** and check.sh); keep check.sh fast. Commit tests on preview-ux-6 and push the branch only.

Report: READY or NOT READY, bugs with steps (ranked), numbers, and at most 2 rough edges. Save it as you go to /home/claude/studio-keys-repo/.claude/work/reports/UX-6-test.md.
