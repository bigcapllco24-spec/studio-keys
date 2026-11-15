# UX-4 test brief (qa-tester, branch check) · 13 Nov 2026, 22:00 IST

Read `.claude/standards/dev-standards.md` first ("Quality bar" and "How we work" matter most: check.sh passes, no console errors, three matte themes from CSS variables, no gradients or glows, works from tablet to desktop, reports short and honest with numbers).

Branch: `preview-ux-4`, head 606049e, repo `/home/claude/studio-keys-repo` (already on it; `git pull` first). It is main (50b6315) + UX-2 + UX-5 (both passed your checks earlier) + the UX-4 phone layout: on phones the app opens on Keys with a bottom tab bar (Keys · Song · Mix · Play · More), a mini transport with Play always visible, sheets for song menu / Keys settings / tempo / Sing / Add a part / each part, a full-screen touch note editor, and finger-sized pads and keys. Tablets get 44 px targets and 16 px text boxes. Desktop should look exactly as before. Plus iPhone talk fixes in `src/assistant.js` (mic released before recognition, speech stopped first, sound engine paused while listening on iOS, words sent after 1.5 s pause if never "final", 6 s watchdog, typing + "tap the 🎤 on your keyboard" fallback). Developer's report: `.claude/work/reports/UX-4-build.md` (read it). Approved design: `.claude/work/proposals/UX-4.md`.

## 1. Fix the one failing smoke check (your file)
check.sh gives 37/38 on this branch; the FAIL is the UX-5 sung-chords check. The developer says it is a test conflict from merging UX-2 and UX-5: UX-2's check 6b leaves a sung-chords track behind, so UX-5's wait returns before the new take starts. Suggested fix at the start of the UX-5 check:
`PROJ.tracks.filter(t => t.take === 'chords').forEach(t => removeTrack(t.id));`
Confirm that's the real cause (not a product bug from the merge), fix it in `tests/smoke.mjs`, commit on `preview-ux-4`.
Then make the same test-only fix on `preview-ux-5` too if it applies there (it will matter when UX-2 and UX-5 are released one after the other); if `preview-ux-5` alone passes without it, put the fix only on `preview-ux-4` and say so.

## 2. Add phone smoke checks (at 390x844 and 360x780)
1. No sideways scroll on any tab (`scrollWidth === clientWidth`). 2. The Keys button is visible on load without scrolling. 3. Each of the five tabs shows its section. 4. Play in the mini transport starts and stops the loop. 5. Tapping a part opens its sheet, and Edit notes opens the editor full screen. 6. No text box under 16 px. 7. Resizing to 1400 px puts the desktop layout back.
Keep them fast. Commit on `preview-ux-4`.

## 3. Focused test like a musician on a phone (about 20 minutes)
Headless Chrome with touch (`hasTouch`, `isMobile`) at 390x844 (iPhone UA), 360x780 (Android), 844x390 sideways, iPad 820x1180, and desktop 1440x900. Fake mic from `tests/fixtures/sing.wav`.
- Make a beat by voice/typing ("drums like Ben Böhmer at 124"), Play/Stop from the mini transport, Undo.
- Sing → Bassline and Sing → Chords; check the part lands, the mic goes off after, Song mode still places it (UX-5 toast).
- Song tab: Make it a song, open a part's sheet, change sound, volume, FX, Mute, Delete + Undo; Edit notes full screen: tap to add, drag, pinch, long-press select, copy/paste.
- Mix, Play (pads and keys under a finger, middle C reachable), More (songs list: open, and Delete must not be easy to hit by mistake; sounds; theme dots).
- All three themes on the phone; look for hard-coded colours, gradients or glows (the Keys orb looks like it has a gradient: flag it if so, the standard says matte).
- Desktop 1440 and tablet: nothing moved vs `main` (compare screenshots).
- iPhone talk with a fake `webkitSpeechRecognition` and an iPhone user agent: non-final words get sent, silent recognizer → one retry → typing opens with the dictation hint.
- Console errors anywhere.

## Report
READY / NOT READY for the owner, check.sh summary (paste it), bugs found (steps, severity), rough edges, and 4-6 "try it on your phone" steps. Screenshots under `/home/claude/ux4test/`. Push your test commits to `preview-ux-4` (and `preview-ux-5` if needed); never push `main`, never change product code. Commit messages end with:

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZAQs1yZU3Xk3m2eQ3sH

Write the report to `/home/claude/studio-keys-repo/.claude/work/reports/UX-4-test.md` (don't commit it) and return it as your final message.
