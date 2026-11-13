# UX-4 retest brief (qa-tester) · 13 Nov 2026, 22:50 IST
Read .claude/standards/dev-standards.md first. preview-ux-4 is now at 404d774 (studio-ux-dev Fix 1: `.claude/work/reports/UX-4-fix1.md`). Your earlier report: `.claude/work/reports/UX-4-test.md`.
1. git pull, run bash .claude/tools/check.sh (paste the summary).
2. Re-check your 4 bugs with your session scripts in /home/claude/ux4test/ (back from the editor on every path, drag a just-tapped 1/16 note, section hold + release, iPad 16 px text boxes) and the rough edges they say they fixed (phone wording, colours, Your sound pill, sideways Play tab).
3. Add the 3 regression checks to tests/phone.mjs (back from editor keeps the URL and closes it; dragging a just-tapped 1/16 note moves it without lengthening; release after a 0.7 s hold on a song-map block leaves the menu open, sections unchanged). Keep check.sh green. Push to preview-ux-4.
4. A quick 5-minute regression pass on phone 390 and desktop 1440 (beat, play, sing a part, Song mode, editor, themes). Console errors.
Report READY / NOT READY, short. Save to /home/claude/ux4test/UX-4-retest.md and return it.
