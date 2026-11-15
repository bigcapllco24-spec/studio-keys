# UX-9 branch check (qa-tester) · 15 Nov 2026

**Verdict: READY.** Branch `preview-ux-9` at 2d06741. A controller's Start, Continue and MMC Play now play the studio in both Loop mode and Song mode. Stop and MMC Stop/Pause stop it. An empty song stays quiet with no errors. I found no bugs and no regressions.

## Bugs
None.

## Rough edges (not blocking)
1. **No message when there is nothing to play.** On an empty song, the on-screen Play button shows "Add a track or record something first." A controller's Play/Start does nothing and shows nothing. Only the MIDI monitor shows "Start transport". The brief asked for exactly this ("nothing should happen"), but a short toast would tell the user why nothing played. Severity: low. Owner: studio-ux-dev (`src/midi.js` `midiPlay`).
2. **Monitor labels are uneven.** Real-time messages show as "Start transport", "Continue transport" and "Stop transport", while MMC shows "MMC Play" and "MMC Stop". Readable, just two styles. Low.
3. **The check is over its time target.** `check.sh` took 3 min 24 s, over the 3-minute target. Most of that is the whole-song MP3 check (68 s to make). I kept the new focused test out of `check.sh` so it doesn't get longer. A test-upkeep job for me.
4. **Can't test the "no click yet" case headless.** The developer noted audio may stay off until the first click on a page that has never been clicked. Headless Chrome starts audio anyway, even without the autoplay flag, so I couldn't reproduce it. This needs a real Chrome: open the test link, don't click, press Play on a controller. On load the app opens an empty song, so in practice the user clicks something first.

## What I checked (numbers)
- `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK 48 checks**, no page errors, 3 min 24 s. Includes the developer's new smoke line: `{"start":true,"stop":true,"mmcPlay":true,"mmcStop":true,"emptyQuiet":true,"errors":[]}`.
- New focused test `tests/midi-transport.mjs` (mine; not in check.sh, run by hand): **28 of 28 PASS, 0 page errors**. The fake controller is a `navigator.requestMIDIAccess` stub that the app's own `initMIDI` picks up at boot (2 inputs).
  - Empty song, before any click: Start, Continue, MMC Play (cmd 2), MMC Deferred Play (cmd 3), Stop, MMC Stop and MMC Pause all leave the state at `empty`, nothing runs, 0 errors.
  - Loop mode (house drums + bass): Start → playing, 7 voices scheduled. Start again while playing changes nothing (same start time, no restart). Stop → stopped, 0 voices. Continue → playing. MMC Pause, Deferred Play, Stop and Play all work.
  - Song mode (Short layout, Drop selected): Start plays from the cursor at beat 16 (the Drop), 1 song segment, 7 voices; the playhead is in the Drop in the screenshot. Stop → stopped and song segments cleared. Continue, MMC Pause and MMC Play work.
  - Recording: during the count-in, Start does nothing and Stop cancels. In overdub, Start does nothing, 2 notes played on the keys are kept (96 → 98 notes), and Stop ends the overdub. On the first recording of an empty song, Continue does nothing and Stop closes the loop with the played note (1 track, 1 note). MMC Record still works like the loop button (stopped → plays).
  - Keys (ch 1, C4) go to keys and pads (ch 10, C2) go to pads while the transport runs.
  - MIDI monitor shows, newest first: MMC Stop, MMC Play, Stop transport, Continue transport, Start transport.
  - With a single input selected, Start from the other port is ignored. 24 clock ticks (0xF8) and active sensing (0xFE) don't start playback.
- Regressions: the on-screen Play/Stop, the Loop button (stopped → play → overdub), the controller panel's Play/Stop, and Space in the song area (play, then stop) all work. A controller Start after a Space stop plays.
- Console: 1 error, `net::ERR_TUNNEL_CONNECTION_FAILED`. It's a network fetch blocked in this sandbox (file:// run), not related to UX-9.
- Code read: the diff is only `src/midi.js` (new `midiPlay()`, the same logic as the Play button; Start/Continue/Stop logged to the monitor), `tests/smoke.mjs` and the rebuilt `index.html`. No `LOOP.layers` is left in any built file.

## Files
- Test: `tests/midi-transport.mjs`. Run it with `SK_NODE_MODULES=/tmp/sk-test/node_modules node tests/midi-transport.mjs [index.html] [screenshot dir]`.
- Screenshots: `/tmp/qa/2026-11-15/ux9/ux9-01-loop-playing.png` (controller screen reads PLAY, top bar "Playing · 4 bars"), `ux9-02-monitor.png` (transport in the MIDI monitor), `ux9-03-song-playing.png` (Song mode, playhead in the Drop), `ux9-04-overdub.png` (monitor during overdub), `ux9-05-end.png`.
