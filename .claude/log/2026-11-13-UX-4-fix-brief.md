# UX-4 fix brief (studio-ux-dev, continued session) · 13 Nov 2026, 22:32 IST

The tester's branch check (`.claude/work/reports/UX-4-test.md`, head 4cfeb70, CHECK OK incl. 10 new phone checks in tests/phone.mjs) says NOT READY. Fix on preview-ux-4 (git pull first; the tester pushed test commits):
1. HIGH: phone back from the note editor leaves the app (phSheetClose's async history.back() cancels the editor's pushed entry). Back must close the editor and stay in the app, from every path into the editor.
2. MEDIUM: a freshly tapped 1/16 note (6 px) can't be dragged; the drag lengthens it (7 px right-end zone). On touch, make the resize zone proportional / only for wider notes, or use a separate handle, so a short note moves.
3. MEDIUM: hold on a section opens its menu at the finger and the release clicks the item under it (Rename, could be Duplicate/Longer). Ignore the release that ended the long-press, and/or open the menu as a sheet away from the finger.
4. MEDIUM: iPad Keys text box is 15 px (.as-form .input) and #mp3Len 12 px, beating the tablet 16 px rule, so Safari zooms. Fix in src/head.html tablet block.
Rough edges worth fixing now if small: desktop wording on phone ("Ctrl/Cmd+click", computer-key letters on Play keys, Ctrl/Cmd shortcuts in the section menu), the hard-coded colours (#333, a scrim rgba, #07120e → CSS variables), the "Your sound" pill text alignment, double-tap deletes a note but the hint doesn't say so. Leave the Keys orb as it is (design call for the owner). Sideways Keys chat / Play tab height: fix only if small.
Rebuild index.html, run bash .claude/tools/check.sh (must say CHECK OK), push, append a short "Fix 1" section to your report.
