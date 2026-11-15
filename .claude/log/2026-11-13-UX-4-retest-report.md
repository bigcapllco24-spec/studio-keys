# UX-4 retest (qa-tester) · 13 Nov 2026 · branch preview-ux-4

## Verdict: READY for the owner
All 4 bugs are fixed and the rough edges the developer listed are fixed too. `check.sh` passes, now with 3 more phone checks. The 5-minute regression pass at 390 and 1440 was clean, with no page or console errors. I found no new problems from fix 1.

## check.sh (head 3bf75ff = fix 1 404d774 + my test commit)
```
PASS ... 39 smoke checks (unchanged, all PASS)
PASS 390x844 / 360x780: opens on Keys, 5 tabs, mini transport, part sheet + full-screen editor (8 checks)
PASS 390x844: Back from the editor (opened from a part) closes it and keeps the URL · editor true→false, state {"ph":"editor"}, same URL
PASS 390x844: dragging a just-tapped 1/16 note moves it without stretching it · 5 px note {"b":9,"d":0.25,"n":53} → {"b":11,"d":0.25,"n":54}
PASS 390x844: release after a 0.7 s hold on a song-map block leaves the menu open, sections unchanged · menu open, "Intro4 Drop8 Outro4" → "Intro4 Drop8 Outro4", then Duplicate → 4 sections
PASS 1400 px: the desktop layout comes back
PASS phone: no page errors
PHONE OK: 13 checks
SMOKE OK: 39 checks
CHECK OK          (2 min 04 s, under the 3-minute budget)
```

## Test change (pushed to preview-ux-4: 3bf75ff)
- I added 3 regression checks to `tests/phone.mjs`. They use real touch events through CDP at 390x844, and each check stands on its own: if Back leaves the page, the next check reloads.
- I proved the checks work by running them against the build from before the fix (4cfeb70). All 3 FAIL there, each for the right reason:
  - Back: the page navigated away.
  - Short note: it stretched, d 0.25 → 2.25.
  - Section hold: the menu was closed after the release.
- On 404d774, all 3 PASS.
- The new checks add about 5 s. I changed nothing under `.claude/`.

## The 4 bugs (rerun with my session scripts s3, s4, s12, s7)
1. **Back from the editor (HIGH): fixed.**
   - Sheet → Edit notes: `history.state` is `{ph:"editor"}`. Back closes the editor, the URL is unchanged, and `history.length` stays 3.
   - Back also closes a part sheet, a More page and the Song sheet.
   - The editor's Close button and a sheet's ✕ leave no stray history entry.
2. **Dragging a just-tapped note (MEDIUM): fixed.**
   - A 5 px note at `{n77,b9,d0.25}` moved to `{n78,b11,d0.25}`.
   - A long note with 2 selected still moves as a group (60/63 → 61/64, +1 beat).
   - Double tap still deletes (21 → 20). Two-finger scroll still works (scrollLeft 0 → 62).
3. **Section hold + release (MEDIUM): fixed.**
   - Holding Intro puts "Rename" under the finger. After the release, the menu stays open, the sections are unchanged (Intro4 Drop8 Outro4) and the undo stack is unchanged (3).
   - The next tap on Duplicate works (3 → 4 sections).
4. **iPad text boxes (MEDIUM): fixed.** At 820x1180 (coarse pointer), no visible text box is under 16 px.

## Rough edges they fixed (checked)
- **Phone wording:**
  - The selection bar says "Tap or hold a part to add or remove it".
  - The section menu has no "Ctrl/Cmd+D", "Ctrl/Cmd+L" or "Delete key".
  - The Play-tab keys show 0 of 17 computer-key letters.
  - Desktop 1400 keeps all three (the Ctrl/Cmd hint, the shortcuts and 18 letters).
- **Colours:**
  - theme-color follows `--t1`: #07120e, #160a0e and #09101f for the three themes.
  - The scrim is `--t0` at 72%.
  - There are no hard-coded colours left in the diff.
- **Your sound pill:** 44 px tall, with the text exactly in the middle (14 px above and 14 px below).
- **Sideways Play tab (844x390):**
  - The 8 pads fit in one row at 44 px.
  - The keyboard is at 185-285, on the first screen, and tapping the first white key plays C4.
  - About 30 px of scroll is left (420 of 390). That's as the developer said, and not a blocker.

## Regression pass, about 5 minutes (r2.mjs), phone 390 (iPhone) and desktop 1440
| | 390 phone | 1440 desktop |
|---|---|---|
| Beat "drums like Ben Böhmer at 124 bpm" | 164 hits, 124 bpm | 168 hits, 124 bpm |
| "another one" | different groove | different groove |
| Play / stop | ▶ playing at 1.3, ■ stopped | loop playing |
| Sing → Bassline (fake mic) | 10 notes, mic off after, no audio track | 11 notes, mic off after, no audio track |
| Song mode (Short) | Intro4 Drop8 Outro4 | same |
| Editor: add a note, Undo | 10 → 11 → 10, full screen 390 px; Back closes it, same URL | 11 → 12 → 11 |
| Themes (Velvet, Sapphire, Emerald) | all fine, sideways scroll 0 | fine |
| Page / console errors | none / none | none / none |

Only the offline Google Fonts request fails (file://), as before.

## Notes for the lead (not UX-4 bugs)
- **The desktop loop button behaves differently from main.**
  - After a beat, the 1st press plays and the 2nd press starts an overdub. On main, the 1st press counts in and the 2nd stops.
  - The same happens on preview-ux-2 and on the pre-UX-4 merge 44da0b9, so it comes from UX-2 ("Play works on new songs"), not UX-4. It's worth knowing when UX-2 ships.
- **The editor in Song mode is confusing** (from UX-1/UX-2, on phone and desktop). It shows "Pattern for **Intro**: A" next to "Pattern A plays only in **Drop**" for a sung bassline that sits in Drop only. That's a candidate for the UX list.
- **Still open, as the developer said:** the Keys orb gradient is a design call for the owner, and the sideways Keys chat is still 41 px tall.

## Screenshots: /home/claude/ux4test/
- Contact sheets: `sheet-retest-phone.png`, `sheet-retest-desk.png`.
- Pass: `r2-i390-0{1..7}-*.png`, `r2-d1440-0{1..7}-*.png`.
- Rough edges: `r-i390-pill.png`, `r-i390-selbar.png`, `r-i390-section-menu.png`, `r-i390-play.png`, `r-i390-sheet-scrim.png`, `r-l844-play.png`.
- Logs: `check3.txt` (before the test change), `check4.txt` (after).
- Scripts: `r1.mjs`, `r2.mjs`, `r3.mjs`/`r3b.mjs` (loop button comparison), plus the earlier `s3`, `s4`, `s7`, `s12`.
