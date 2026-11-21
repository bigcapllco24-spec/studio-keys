# SE-9 branch check (qa-tester, 16 Nov 2026)
Branch `preview-se-9` @ f922ba6, worktree /home/claude/sk-se-9. Baseline: origin/main 5486a77 (same product code as the branch base) in /tmp/qa-main-se-9.

## Verdict: NOT READY (two small fixes). The main path is good.
In Chrome with the limiter running, every number is right: no clipping anywhere, loop wraps are seamless, normal mixes don't change, and timing lines up with the grid. The problems are the fallback path (renders come out 4.4 ms late) and one click when the limiter takes over.

## Bugs
1. **Medium: with the fallback (no AudioWorklet), every render is 192 samples (4.4 ms) late, so Mix.wav and the stems are off the grid.**
   Steps: block AudioWorklet (`AudioWorklet.prototype.addModule = () => Promise.reject()` before load), make any loop, Export for Ableton (.zip). Cross-correlate Mix.wav and the stems with the same seed on main.
   Expected: lag 0 (first kick at sample 0), like main and like the branch with the limiter on.
   Actual: lag +192 samples on Mix.wav, every stem, and the loop/MP3 renders (every file checked, 4 genres). The loop is rotated, so the first 192 samples hold the end of the bar and the kick lands at sample 192.
   Cause (confirmed with an impulse in an OfflineAudioContext): `ceilingNode(oc,false)` reports `latency:0`, but its impulse comes out at sample 192. The WaveShaper's `oversample='4x'` adds 192 samples in Chrome. The worklet path reports 72 and its impulse comes out at 72, which is correct.
   Fix: report the real delay for the soft-clip path (measure it once per context, since Safari may differ), or use `oversample='none'` for offline renders. File: `src/core.js` (sound-engine-dev).
2. **Low: a click or 1.6 ms dropout when the limiter takes over from the soft clip while sound is already playing** (the first ~15-75 ms after the sound turns on, e.g. when Play, a key or a pad is the first thing you press).
   Steps: on a fresh AudioContext, send a steady 110 Hz tone through `liveCeiling()` and record the output.
   Expected: a clean sine (normal sample step 0.008).
   Actual: steps up to 0.86 at 15-75 ms, and in 1 of 2 runs exactly 72 samples of silence (the limiter's look-ahead buffer starts empty while the old path is cut). The control run without the ceiling has no jumps in that window.
   Fix idea: give the soft-clip path a 72-sample DelayNode so both paths line up, and crossfade over a few ms. File: `src/core.js` `liveCeiling`.

## What I checked (numbers)
**check.sh:** run 1 `SMOKE FAILED: 2 of 48` (song reopen after reload, and Undo after opening: it reopened "Smoke sing" instead of "Before reload"; the machine load was about 8 and the whole-song MP3 took 141 s). Run 2 `SMOKE OK: 48 checks / CHECK OK` (4m25s). This is a load flake in files SE-9 doesn't touch. The new line "master ceiling … peak -0.30 dBFS, true peak -0.30 dBTP, 0 full-scale samples, live limiter on" passes.

**Extreme case (my bug 8 steps: CdW drums, bass, chords, melody, all faders 100, EQ +15 on drums and bass, master Low +15, max reverb/delay/drive/comp), same seed:**
| | main | branch | fallback |
|---|---|---|---|
| Loop render peak / 4x TP / clipped 16-bit | 0.00 / +0.03 / 22 | -0.30 / -0.21 / 0 | -0.53 / -0.52 / 0 |
| Zip Mix.wav peak / TP / clipped / LUFS | 0.00 / +0.03 / 22 / -6.5 | -0.30 / -0.21 / 0 / -6.6 | -0.53 / -0.52 / 0 / -6.5 |
| Zip stems max peak | -0.21 (drums TP -0.13) | -0.30 (all 4 ≤ -0.30) | -0.47 |
| Live capture after the analyser, 21 s (play, 5x start/stop, 4 tempo changes) | 0.00 dBFS, 44 samples ≥ 1.0 | -0.30 dBFS, 0 over | -0.18, 0 over |
| App analyser meter, 5 s | -0.02 | -0.32 | -0.57 |
| Live after page reload | +0.04, 9 over | -0.31, 0 over, limiter back on (latency 72) | -0.44, 0 over |
| Loop MP3, decoded | -0.52, 0 over | -0.43, 0 over | -0.63 |
| Whole-song MP3 (Short layout, drums and bass), decoded | -0.79, 0 over | -0.69, 0 over | -0.80 |

The true peak is measured with a long oversampling filter (scipy, and ffmpeg ebur128, which gives -0.2). Branch files reach -0.21 to -0.26 dBTP, about 0.1 dB above the -0.3 target, because the limiter's 12-tap BS.1770 estimate reads a little low. It's still far from 0, so this is a note, not a bug.

**Three normal loops of my own (same seed, main → branch):** afro house (124), drum and bass (174), lofi hip hop (78). These run hot on main (peaks -0.04 / -0.14 / -0.15), so the limiter does work on them.
- LUFS: -5.4 → -5.4, -5.4 → -5.4, -6.5 → -6.5 (RMS change -0.03 / -0.01 / -0.01 dB). Within 0.1 dB.
- Peak: → -0.31 for all three. Null residual vs main: -44 / -48 / -52 dB.
- Pumping and dulling: the biggest cut in any 10 ms window is 0.26 / 0.16 / 0.16 dB (only 1-4% of windows are cut more than 0.1 dB, none more than 0.5 dB). Energy above 5 kHz changes by -0.04 / -0.02 / 0.00 dB. No pumping, no dulling. Extreme case: at most 0.43 dB, highs -0.14 dB.
- Timing: cross-correlation lag 0 for every branch file vs main (loops, Mix.wav, stems). First onset at sample 0.

**Loop wrap (jump from the last sample to the first, compared with the 99.9th-percentile step inside the file):**
- Afro Mix 0.213 → 0.016 (the step inside the file is 0.113)
- Afro drums stem 0.227 → 0.016
- Extreme chords stem (supersaw) 0.478 → 0.029
- dnb 0.035 → 0.013, lofi 0.022 → 0.014
Wrap true peak is unchanged or lower. Seamless.

**Live start/stop and tempo** (branch, with the limiter on from the start): no silence after the first play, steady level, stops clean.
- With play pressed 1.5 s after the sound turns on, 2 of 2 runs had no gaps (first sound 175 / 326 ms; main 214 / 185 ms).
- Tempo changes 134 → 131 → 118 → 140 → 126 while playing: no dropouts.
- Headless capture shows a few sample jumps at render-quantum edges on both main and branch (108 vs 149 over 21 s, with the load at 9-21). That's machine load, not SE-9.
- When Play itself turns the sound on, the first ~100 ms can be choppy in headless on both main (1 of 3) and branch (2 of 4). I can't separate this from the headless audio start, apart from bug 2.

**Fallback (AudioWorklet blocked):** the soft clip takes over, nothing reaches 0, and normal loops lose about 0.25 dB of peak with LUFS unchanged. But timing is late (bug 1).

**Regressions:**
- Sidechain: bass level on the kick vs the off-beat, duck 0 → 1: 4.14 → -1.04 dB on both main and branch (same).
- Sends: chords with reverb send 0 → 1: -18.61 → -16.95 dB, same on main and branch.
- Mute and solo: same audible sets and strip gains on both. The zip leaves out muted tracks.
- First kick at sample 0 in Mix.wav: yes, lag 0.
- Page errors: none. The only console errors are the 2 font loads the sandbox blocks (ERR_TUNNEL_CONNECTION_FAILED), the same on main.

**Speed:** renders are about 10-15% slower.
- Interleaved A/B in one browser, 4-track loop: main 16.3 / 17.9 / 17.0 s, branch 18.2 / 19.5 / 20.7 s.
- The ceiling on its own runs 30 s of audio in 0.55 s.
- The bigger gaps in my full runs (up to 5x) came from machine load (load average 9-21 while 3 checks ran), not the branch.

Can't test here: real Safari or Firefox (whether the `data:`/`blob:` worklet loads there), and listening on speakers.

## Files
- Results: /tmp/qa-se9/{main,branch,fallback}/results.json; WAVs and MP3s in each folder's wav/ and zip-*/
- Screenshots: /tmp/qa-se9/{main,branch,fallback}/shots/01-extreme-tracks.png, 02-extreme-exported.png, 03-normal-loop.png, 04-end.png
- Scripts: /tmp/qa-se9/js/run.mjs (full run), an.py (peak/TP/LUFS/wrap/null), live.py, bench2.mjs (speed A/B), firstclick2.mjs (first play), swap2.mjs (hand-over click), ws.mjs (delay of each ceiling path)
- check.sh logs: /tmp/qa-se9/check1.log, /tmp/qa-se9/check2.log
