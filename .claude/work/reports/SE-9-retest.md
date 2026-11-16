# SE-9 re-check after fix 1 (qa-tester, 16 Nov 2026)
Branch `preview-se-9` @ 3d7f911, worktree /home/claude/sk-se-9 (read only, nothing committed). Baseline: the main renders from my first check (/tmp/qa-se9/main, built from /tmp/qa-main-se-9, same seeds).

## Verdict: READY
Both bugs are fixed. Every fallback file is now on the grid (lag 0), and the limiter hand-over has no clicks or gaps. The limiter path gives the same numbers as at my first check. I found one new low-severity issue (below). It doesn't block. It's cheap to fix if the lead wants it before gate 2.

## Bugs
1. **Low (new): a short level dip at the hand-over when the sound is already over the ceiling.** There's no click, just a quick duck of about 3.5-4 dB that recovers over about 60 ms.
   Steps: on a fresh AudioContext, send a steady 110 Hz tone at 1.3 (+2.3 dBFS) through `liveCeiling()`. Record it with an AudioWorklet tap and measure the peak of each cycle (`/tmp/qa-se9r/js/swapq.mjs <root> 1.3 6`).
   Expected: a steady 0.965 the whole time.
   Actual: 6 of 6 runs dip to -3.4 to -4.1 dB right after the swap (per cycle: 0.947 → 0.618 → 0.69 → 0.76 → 0.82 → 0.87 → 0.91 → 0.955 → 0.965). At 0.5 amplitude (under the ceiling) it's flat, 6 of 6.
   Cause (measured): in a live context, if the limiter worklet starts on a hot signal that's already playing, it starts with far too much gain reduction (first cycle 0.158 at 1.3, 0.151 at 2.0) and then releases over about 110 ms. The 40 ms wait before the crossfade lands inside that recovery. The same mid-stream start in an OfflineAudioContext is clean (0.965 from the first cycle, even when it starts with a step), so renders aren't affected.
   In the app: Play pressed as the very first action on my extreme mix showed one 30 ms dip to 0.71 exactly at the hand-over time in 1 of 3 runs. Normal mixes are under the ceiling at that moment, so they aren't affected.
   Fix ideas: wait about 150-200 ms before the crossfade, or find why the live worklet's first blocks over-reduce. File: `src/core.js` (`liveCeiling` / `CEIL_SRC`), sound-engine-dev.

**Test note (mine, not a product bug):** the smoke line's "live limiter on / soft clip" label reads `A.ceil.latency`, which is now 72 on both paths, so it would say "on" in the fallback. The label should read `A.ceil.worklet` (`tests/smoke.mjs` line 215). It only changes the label, not pass/fail. I didn't change it because the worktree is read only. I can do it on the branch or on main when asked.

## What I checked (numbers)
**check.sh:** run 1 `SMOKE OK: 48 checks` / `CHECK OK` (50 PASS lines, 2m12s, load about 2). Ceiling line: "peak -0.30 dBFS, true peak -0.30 dBTP, 0 full-scale samples, live limiter on". No re-run needed.

**Bug 1 (fallback 192 samples late): FIXED.** With AudioWorklet blocked, every file I compared against main is lag 0 (FFT cross-correlation over ±400 samples). That's 14 files:
- Extreme zip: Mix.wav and 4 stems. Null vs main is -41 to -59 dB (before: +1.7 to +3.6 dB at 192 samples).
- Afro zip: Mix.wav and 3 stems, null -43 to -59 dB.
- Loop WAVs: extreme and afro, null -43 dB.
- MP3s, decoded: afro loop, extreme loop, whole song (Short layout).

The first onset is at sample 0 in every WAV. The same script on my first check's fallback files still reports +192, so the test does catch the old bug. Limiter path: the same 14 files plus dnb and lofi loops are all lag 0, null -36 to -70 dB, the same as before.

**Bug 2 (click or gap at the hand-over): FIXED.** I recorded with an AudioWorklet tap, as the developer suggested.
- At 0.5 amplitude: 6 of 6 runs have a max sample step of 0.0078. That equals the tone's own step and the no-ceiling control. No zero runs, and the level stays flat (0.00 dB).
- At 1.3 amplitude: 6 of 6 runs have a max step of 0.0204, the same as the control, and no zero runs. Only the level dip above remains.
- The pre-fix build (/tmp/claude-0/se9f/old) caught a 0.226 step in 2 of 4 runs, so the test is sensitive.
- In the app, Play as the first action (3 runs): no silence (longest zero run: 1 sample), peak -0.31 dBFS, 0 overs. Main on the same mix: +0.27 to +0.59 dBFS with 115-376 overs.

**Extreme case, repeated (branch / fallback; first check in brackets):**
- Loop and zip Mix.wav: peak -0.30 / -0.53, 4x TP -0.21 / -0.52, ffmpeg TP -0.2 / -0.5, LUFS -6.6 / -6.5, 0 clipped (same as before).
- Loop MP3: -0.41 / -0.62, 0 over.
- Whole-song MP3: -0.69 / -0.76, 0 over.
- Live, 22 s with start/stop and tempo changes: -0.30 dBFS, 0 over (fallback -0.49; before -0.18). Analyser meter -0.34 / -0.49. After a reload the limiter comes back on (latency 72, worklet true): -0.31, 0 over.

**Normal loop (afro house 124, main → branch → fallback):**
- Peak -0.04 → -0.31 → -0.55. LUFS -5.4 for all three. RMS -4.38 → -4.41 → -4.41.
- Wrap jump 0.214 → 0.016 → 0.016. Null vs main -46.8 dB. 0 clipped.
- dnb and lofi on the branch: peak -0.31, lag 0, null -48 / -52 dB.

**Regressions (branch and fallback, the same as main):**
- Sidechain duck 0 → 1: 4.14 → -1.04 dB (fallback 4.18 → -1.03).
- Reverb send 0 → 1: -18.61 → -16.95 dB.
- Mute and solo give the same audible sets and gains.
- Solo render vs bass stem: -15.1 dB.
- Page errors: none. The console shows only the 2 blocked font loads, the same on main.

**Speed:** not re-benchmarked. Machine load was 8-13 from the parallel re-checks (extreme zip took 309 s on the branch and 415 s on the fallback), so render times from this run aren't meaningful.

## Files
- Report: /tmp/reports/SE-9-retest.md
- check.sh log: /tmp/qa-se9r/check1.log
- Results: /tmp/qa-se9r/{branch,fallback}/results.json; WAVs, zips and MP3s in the same folders; decoded MP3s in /tmp/qa-se9r/mp3/
- Hand-over: /tmp/qa-se9r/swap-branch-05.json, swap-branch-13.json, swap-old-05.json, firstplay.txt
- Scripts: /tmp/qa-se9r/js/lagall.py (lag and null for every file), swapq.mjs (hand-over with an AudioWorklet tap and level envelope), midconnect.mjs (limiter started mid-stream, live vs offline), onset.mjs and onsetstep.mjs (offline limiter onset), firstplay.mjs (Play as the first action)
- Screenshots: /tmp/qa-se9r/{branch,fallback}/shots/01-extreme-tracks.png, 02-extreme-exported.png, 03-normal-loop.png, 04-end.png (looked at; nothing off)
