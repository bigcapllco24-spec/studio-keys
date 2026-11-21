# SE-10 build report (sound-engine-dev)

Branch `preview-se-10` (pushed; commits 3232a65, e1c7a3c). Never touched main.

## What changed
- `src/core.js`: `Voice` now wires its sources to the pitch wheel (`A.bend`) and mod wheel (`A.vibGain`) only when it was made inside the new `playLive(inst,c,dest,n,v,t)` (a counter flag `A.wheelLive`, set while the instrument builds the voice). Everything else (song tracks, recorded/generated parts, looper/scheduler, editor previews, offline renders) is never wired. Bend range, vibrato depth (35 cents) and rate (5.6 Hz) are unchanged.
- `src/play.js` (studio-ux-dev's file, one line): `noteOn` calls `playLive(...)` instead of `inst.play(...)`. That one path covers MIDI keys and pads, on-screen keys, computer keys, pads and mic-played notes.
- `src/lab.js`: silence guard at -50 dBFS peak. Checked twice: on the raw selection before separating, and on the chosen slice at its real level (before normalising; in stem mode the stem gain is undone first). If it's silent: status "That part is silent — pick a section with sound.", the result panel goes back to empty, `LAB.res` is cleared, and both Add buttons are disabled. A real extract turns them back on.
- `tests/smoke.mjs` (2 new lines, as the brief asked): "pitch and mod wheels bend the notes you play, not the song" and "Sound Lab says a silent part is silent and keeps Add off".
- `index.html` rebuilt with `tools/build.py`.

## How tested (headless Chrome with fake MIDI, the master output tapped, pitch found by autocorrelation; main build = before, branch = after)
| | before (main) | after (branch) |
|---|---|---|
| Song bass A2, wheel at rest | 110.3 Hz | 110.3 Hz |
| Song bass, pitch wheel full up | 123.9 Hz (+201 cents) | 110.3 Hz (0 cents) |
| Song bass, mod wheel 127 (spread) | 108.9–111.6 Hz | 110.0–110.3 Hz |
| Song drum sources wired to wheels in 2 s | 154 / 154 | 0 / 154 |
| Song scheduler voice (`scheduleEvent`) wired | 2 / 2 | 0 / 2 |
| Live note while song plays: song+live sources wired | 87 / 87 | 1 / 79 (just the live note) |
| Live note A3 (song stopped): rest / bend up | 220.5 / 247.8 Hz (+202 c) | 220.5 / 247.8 Hz (+202 c) |
| Live note, mod 127 (spread) | 217.2–222.7 Hz | 217.2–222.7 Hz |
| Wheel held up, then key pressed | +202 c | +202 c |
| Offline render (16 beats, drums+bass) with wheel up and mod 127 | 0 wired, peak -0.67 dBFS, RMS -6.83 dB | 0 wired, peak -0.61 dBFS, RMS -6.78 dB (same within groove randomness) |

Sound Lab (branch):
- Tester's repro (3 s digital silence, Lead, Extract, then click Add): "That part is silent — pick a section with sound.", Add disabled, nothing added to the rack, keys still on piano.
- White noise at -60 dBFS: refused the same way.
- 220 Hz sine at -40 dBFS: extracts as Lead, Bass and Kick; also in "already a separated stem" mode. Add enabled.
- Silence in stem mode: refused.
- After a refusal, a real extract (-20 dBFS) turns Add back on and Add puts it on the rack (1 sound).
- Demo loop, Lead: "Done in 1.8 s", result shown, Add enabled.
- Screenshot: /tmp/reports/SE-10/lab-silent.png. No page errors in any run.

`bash .claude/tools/check.sh`: **SMOKE OK: 49 checks, CHECK OK**.

Test scripts and raw numbers: /tmp/reports/SE-10/ (wheel.mjs, lab.mjs, before.json, after.json, lab-after.json).

## Corner cases
- A note held while recording: it still bends live (made through noteOn). The recorded part plays back through the song scheduler, so it never follows the wheel. Bend was never recorded before either.
- Looper/song playback, editor note previews (`previewNote`) and the Sound Lab preview: not wired.
- Notes played with the song stopped: bend and wobble as before.
- Offline renders and exports: never wired (another AudioContext, and the flag is only set inside the live noteOn).

## Known limits / for others
- No Worker or prompt change, and no new actions.
- The `play.js` one-line change is in studio-ux-dev's file (allowed by the brief).
- The -50 dBFS threshold applies to the isolated part. Asking for e.g. a Kick from a section with no low end at all now says "That part is silent" instead of building a near-empty sound. I think that's right, but the wording is generic.
