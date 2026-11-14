# UX-8 build report (studio-ux-dev) · 15 Nov 2026
Bug: after a beat is made, the big loop button's 2nd press started an overdub instead of stopping.

## Did another branch already solve it? No.
Headless probe (built index.html of each branch, press the big loop button 3 times, 0.9 s apart):

| Branch | Beat made: press 1 / 2 / 3 | Empty song: press 1 / 2 / 3 |
|---|---|---|
| origin/main (UX-2 live) | plays / OVERDUB / keeps overdub, plays on | count-in / cancels / count-in |
| origin/preview-ux-4 | same as main (has UX-2) | same |
| origin/preview-ux-6 | same as main (has UX-2) | same |
| origin/preview-ux-7 (pre-UX-2) | count-in to RECORD / cancels it (stopped) / plays | same |
| origin/preview-ai-4 (pre-UX-2) | count-in to RECORD / cancels it / plays | same |

All five have the identical `loopPress()` (playing -> overdub). The old "press 2 stops" was really press 1 starting a count-in to record a new loop (the button still thought the studio was empty) and press 2 cancelling it; UX-2 made the button know there's a song, so press 2 reached the looper's overdub step.

## Fix (src/studio.js, tests/smoke.mjs; index.html rebuilt)
- New flag `LOOP.looping`: true only while a loop the button itself just recorded plays on (set in `finalizeFirst`); cleared by `loopPlay`, `loopStop`, `loopClear` and any count-in (`countInto`).
- Big loop button while playing: if `LOOP.looping` -> overdub (looper-pedal flow unchanged: Record loop -> close -> overdub -> keep); otherwise -> stop. Label shows "Stop loop" (or "Overdub" in the looper flow), with a tooltip saying what the press does.
- Unchanged: Rec (playing -> overdub, stopped -> count-in to overdub), sung takes, the UX-2 fix (press 1 on a new song plays at once), double-press to stop, Song mode ("Play song" then "Rec in loop").

## Tests
- `bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 48 checks (new: "loop button: press 1 plays a beat, press 2 stops, Rec overdubs" -> p1 playing, label "Stop loop", p2 stopped, Rec overdub, Rec again playing). No page errors.
- Probe on the fix: beat: plays / stops / plays; empty: count-in / cancel / count-in (as before).
- Record flows: Rec over a playing beat -> overdub, a note played -> 2 tracks, Rec -> playing, loop button -> stopped. Rec from stopped -> count-in -> overdub. Looper flow on an empty song: Record loop -> auto-close -> "Overdub" -> overdub -> keep -> double-press stops -> press plays ("Stop loop") -> press stops. Song mode: press 1 plays the song ("Rec in loop"), press 2 switches to Loop and counts in (unchanged).
- Screenshot of the button while playing in Emerald, Velvet, Sapphire: "STOP LOOP" fits the 170 px button, same green playing style.

## Notes for the lead
- In Song mode the big button's 2nd press still records ("Rec in loop", from UX-1's approved design). If the owner wants press 2 to stop there too, that's a small follow-up (one line), but it changes an approved design.
- A third press within 0.35 s of a stop is ignored (double-press-to-stop rule, as before).
