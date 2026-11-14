# UX-8 branch check (qa-tester) · 15 Nov 2026

## Verdict: READY
The big loop button now does what a producer expects: with a beat, press 1 plays and press 2 stops. Rec still records over the beat, and the button's own looper-pedal flow still overdubs. The labels fit at 390 and 360 px in all three themes. I found no UX-8 bugs and no regressions from this change.

## Bugs
None from UX-8.

Pre-existing bug found nearby (also on `main`, there since the first commit, not caused by this branch; file it separately):
1. **A hardware controller's Start / Continue button crashes and doesn't play** (medium, `src/midi.js`, studio-ux-dev).
   - Steps: plug in a MIDI controller (or a DAW sending MIDI clock transport), make a beat ("add drums"), press the controller's Play/Start (MIDI 0xFA or 0xFB).
   - Expected: the beat plays.
   - Actual: nothing plays, and the page throws `TypeError: Cannot read properties of undefined (reading 'length')` at `onMIDI`.
   - Cause: `src/midi.js` line 107 (`if(LOOP.layers.length) loopPlay()`) and line 193 (MMC Play) use `LOOP.layers`, which only exists in the old `src/looper.js`. That file isn't in the build. It probably should be `PROJ.tracks.length`.
   - Not added to the smoke test, because a smoke line would fail this branch for a bug UX-8 didn't cause. Add it with the fix.

## Rough edges (no action needed for UX-8)
- **Song mode still records on press 2 ("Rec in loop"), while Loop mode now stops on press 2.** It's the same button with two meanings depending on the mode. The developer flagged this and it was approved in UX-1. Worth asking the owner whether press 2 should stop in Song mode too, for one consistent rule.
- **"STOP LOOP" is drawn in the green "playing" style** (`--ok`) in every theme, Velvet and Sapphire included. This is the existing playing style, and it reads fine as "it's playing". Some producers may expect a stop action to look neutral.
- **The controller map's default "loop button" is "MMC record"** (the panel under the mixer). A hardware Record press that reaches `loopPress` now stops a playing beat instead of recording over it. In practice MMC never arrives, because MIDI is opened with `sysex:false`, and learned CC/note "loop" controls act like the big button as intended. A "rec" target for controllers could come later.
- **The double-press rule is wall-clock based** (350 ms, `performance.now()`). On a heavily loaded test machine, scripted clicks can land more than 350 ms apart and miss it. At a real 150 ms gap it works every time (numbers below). This is a test-harness issue only.

## What I checked (headless Chrome, fake MIDI input, real clicks about 0.9 s apart)
1. `bash .claude/tools/check.sh`:
   - Run 1: CHECK FAILED, 2 of 48, in 3m07s. "Opening the app starts a new empty song…" and "Undo right after opening a song…" failed because the reopened song had the old name "Smoke sing". The machine was at load average 5 with parallel testers. `keepLastSong` didn't finish within the test's 15 s wait, so the reopen read the old copy. This is a timing flake, not UX-8 (the branch doesn't touch store/daw).
   - Run 2: CHECK OK, 48 checks, 2m06s.
   - Run 3, after my test changes: CHECK OK, 49 checks, 2m22s. No page errors.
2. Beat made, then press, press, press, press: playing/"Stop loop" → stopped/"Play loop" → playing → stopped. Tooltip while playing: "Stop playing. To record over it, press Rec".
3. Rec over a playing beat: overdub ("Overdubbing · press to keep"). Four fake-MIDI notes went in, giving 1 → 2 tracks. Rec again returned to playing/"Stop loop", and the loop button then stopped.
4. Rec from stopped: count-in, then overdub. Two notes went in (2 → 3 tracks). The loop button kept the take (playing), and the next press stopped.
5. Empty song, press × 4: count-in → cancel (empty) → count-in → cancel. Unchanged.
6. Looper flow on an empty song (1-bar loop): Record loop → count-in → recording → auto-close → playing with the label "Overdub" (`LOOP.looping` true). Press: overdub. Press: keep, label stays "Overdub" (2 tracks). Double-press: stopped. Press: playing/"Stop loop". Press: stopped.
7. Double-press, scripted in-page at a 151–155 ms gap:
   - Beat playing → stopped.
   - Beat stopped → stopped (play then stop).
   - Looper loop playing → stopped.
   - Overdub → stopped.
8. Song mode (Short layout): label "Play song". Press 1 plays the song (label "Rec in loop"). Press 2 switches to Loop and counts in. Unchanged.
9. Nearby checks, all fine:
   - Play button then loop button: stops.
   - Keys "play" then loop button: stops.
   - Stop button: stops.
   - Space: stops.
   - Keys "record" while playing: overdub.
   - Recorded loop with Keys adding drums while it plays: the label ("Overdub") and the next press (overdub) agree.
   - Undo while playing, then press: stops.
   - A learned controller "loop" control acts like the big button (plays, then stops).
10. Label fit, for "Stop loop" and "Overdub" in Emerald, Velvet and Sapphire at 1400, 390 and 360 px: the button is 170 px, the label is 101 px ("Stop loop") / 85 px ("Overdub"). No overflow, and no sideways page scroll (document width = window width) at 390 and 360. All 18 combinations pass.

## Test changes (tests/smoke.mjs, pushed to preview-ux-8)
- New check: "looper flow: Record loop → 'Overdub' → overdub → keep; replayed, the button stops". It covers the new `LOOP.looping` flag, which the developer's line (beat only) didn't. It adds about 5 s.
- The reload check now waits up to 40 s (was 15 s) for `keepLastSong` before reopening the song, so parallel checks on a busy machine don't flake. The check itself (old song reopens intact, with its name, tracks and sections) is unchanged.

## Screenshots (scratchpad, this session)
`/tmp/claude-0/-home-claude/fa928ce0-b28c-5357-8d40-e846e3f15247/scratchpad/ux8/shots/` contains:
- `A1-beat-playing.png`
- `B2-overdub.png`
- `D1-countin.png`
- `E2-looper-playing.png`
- `G1-song-playing.png`
- `I-390-*.png` and `I-360-*.png` (Emerald, Velvet and Sapphire, "Stop loop" and "Overdub")
- `I-1400-emerald-*.png`

Test scripts:
- `.../scratchpad/ux8/focus.mjs`
- `.../scratchpad/ux8/dbl.mjs`
- `.../scratchpad/ux8/midistart.mjs`
