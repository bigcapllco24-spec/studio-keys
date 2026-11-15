# UX-9 build report (studio-ux-dev) · 15 Nov 2026

Bug: a controller's Play/Start (0xFA), Continue (0xFB) or MMC Play threw `TypeError: Cannot read properties of undefined (reading 'length')` in `onMIDI` and nothing played. Cause: `src/midi.js` still checked `LOOP.layers`, which only exists in the old `src/looper.js` (not in the build).

## What changed
- `src/midi.js`: new `midiPlay()` = exactly what the Play button does (`if(LOOP.state==='stopped') loopPlay()`), so Song mode plays the song from the cursor. Nothing to play, or already playing/recording: does nothing, quietly. Used for 0xFA, 0xFB and MMC Play (cmd 2 and 3).
- MIDI Stop (0xFC) and MMC Stop/Pause already called `loopStop()` and worked; unchanged.
- Small extra: Start, Continue and Stop now show in the MIDI monitor list (MMC already did), so a user can see the controller's transport arriving.
- No other `LOOP.layers` use in the built files (`src/looper.js` has many, but it is not in `tools/build.py` PARTS).
- `tests/smoke.mjs`: new last check "controller Start plays, Stop stops (and MMC Play/Stop), no errors" (fake MIDI input via `attachAccess`, restores `M` afterwards).
- `index.html` rebuilt.

## Tests
- `bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 48 checks, no page errors.
- Fake MIDI (`navigator.requestMIDIAccess` stub, drums + bass): Loop mode Start → playing, Stop → stopped; Song mode Start → playing with the song scheduled, Stop → stopped; Continue → playing; 0 page errors.
- Same script on the old `origin/main` build: nothing plays and 3 page errors ("Cannot read properties of undefined (reading 'length')").

## Limits
- Start while already playing does not restart from the top (same as the Play button).
- If the browser has never had a click/tap on the page, the audio may stay suspended until the first click (browser autoplay rule); the first click on the page fixes it.
