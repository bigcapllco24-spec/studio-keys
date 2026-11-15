# UX-5 branch check (qa-tester), 13 Nov 2026
Branch `preview-ux-5` @ 45391b5, clone `/home/claude/sk-qa5`.

## Verdict: READY
No bugs found in the fix.

## Check
`bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 32 checks (new UX-5 check passes), no page errors, 1 m 34 s.

## F1 re-run (fake mic, tests/fixtures/sing.wav, Short layout Intro/Drop/Outro, Song mode)
1. Chords with Intro selected: "Sung chords" on in Intro only; back in Song mode; toast "“Sung chords” plays in Intro. Click its empty parts to add it elsewhere." Take 11.9 s.
2. Bassline with Drop selected: "Sung bassline" on in Drop only; toast "“Sung bassline” plays in Drop. …". 10 notes.
3. Turned Sung chords on in Drop, selected Outro, re-sang chords: keeps Intro + Drop (not moved to Outro), no toast. Pass.
4. Undo once: the previous take comes back with its notes (identical) and Intro + Drop. Undo again: Drop part off again. Redo x2 returns to the re-sung take. Mode stays Song throughout.
5. Loop mode, one section ("Main"): sung chords on in Main (plays everywhere, audible, 30 notes), no toast. Pass.
Page errors: 0. Only console message: a font request blocked by the sandbox network (not the app).

## Note (not from this branch, low)
A re-sung take moves to the bottom of the track list (removed and re-added). Already true on main; not a blocker.

## Files
Script: /tmp/qa/2026-11-13-ux5/run.mjs
Screenshots: /tmp/qa/2026-11-13-ux5/1-chords-intro.png, 2-bass-drop.png, 3-resung.png, 4-undo.png, 5-loop.png
