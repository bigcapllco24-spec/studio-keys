# SE-9 build report: master ceiling (extreme boosts no longer clip)

Branch `preview-se-9` (pushed, 4 commits). `bash .claude/tools/check.sh`: **SMOKE OK: 48 checks / CHECK OK**.

## What changed
- `src/core.js`: a new last stage on the master, after the glue compressor and the old DynamicsCompressor "limiter": a look-ahead **true-peak limiter at -0.3 dBTP** (`CEIL_DB`, one number for every path). It is an AudioWorklet (`sk-ceiling`, source inline as `CEIL_SRC`, loaded from a `data:` URL so it also works from `file://`; a `blob:` URL is the second try). It checks 4x-oversampled peaks (the BS.1770 filter), uses 72 samples (1.6 ms) of look-ahead, an 80 ms release and one gain for both channels. **Below the ceiling its gain is exactly 1**, so normal mixes pass through unchanged. If AudioWorklet is missing or fails (old Safari), a 4x-oversampled soft clipper that tops out just under the ceiling takes its place. Live: `liveCeiling()` puts it between `A.comp` and `A.analyser`, so the meter shows the real output. The soft clipper covers the first few ms while the module loads.
- `src/studio.js` (small changes, all in the render path): `renderGraph` ends with `renderCeiling()` and returns its delay (`lat`). `renderAudio` and `renderSongSpan` add `CEIL_LA` to the context length and start their slice `lat` samples later, so renders stay sample-aligned with the grid. Before vs after on the same seed: max difference 0.0004 at shift 0. `renderAudio` also blends its last 256 samples (5.8 ms) into the audio just before the loop's first sample, so a looped WAV wraps seamlessly. Without the blend, random-phase synths (supersaw chords) left a 1.1 step at the wrap: an inter-sample over (+0.13 dBTP on a stem) and a small click in Ableton.
- `tests/smoke.mjs`: a new line, "master ceiling: extreme boosts stay under -0.3 dBTP, no clipped samples in Mix.wav" (techno drums + bass, every knob at max, measures peak, 4x true peak and full-scale 16-bit samples in `wavBytes`).
- `index.html` rebuilt.

## Numbers (offline renders in headless Chrome, 4 bars, fixed random seed; true peak = BS.1770 4x, measured as a loop; LUFS integrated)
| Loop | Before peak / TP / LUFS / clipped | After |
|---|---|---|
| House (Ben Böhmer, 4 parts) | -0.42 / -0.41 / -7.49 / 0 | -0.42 / -0.41 / -7.49 / 0 (identical) |
| Techno (Charlotte de Witte) | -0.59 / -0.46 / -7.66 / 0 | -0.59 / -0.46 / -7.66 / 0 (identical) |
| Hip-hop 90 | -0.37 / -0.34 / -9.26 / 0 | -0.37 / -0.34 / -9.26 / 0 (identical) |
| Extreme (QA bug 8 steps) | **+0.55 / +0.57 / -7.06 / 415** | **-0.30 / -0.30 / -7.37 / 0** |
| Extreme + every EQ band +15 everywhere | **+1.54 / +1.55 / -6.83 / 1891** | **-0.30 / -0.30 / -7.69 / 0** |
| Extreme stems (Ableton zip) | max TP +0.13 (chords, at the wrap) | max TP -0.30, all 4 |
| Live playback, extreme, analyser 8 s | **+2.37 dBFS, 1607 samples over 0** | **-0.36 dBFS, 0 over** |
| Whole-song render span (32 beats, extreme) | +0.79 dBFS | -0.30 dBFS |
| Song MP3 (extreme, decoded) | -1.00 dBFS | -0.52 dBFS |
| Loop MP3 (extreme, decoded) | -0.22 dBFS | -0.06 dBFS (see limits) |
| Loop MP3 (normal house, decoded) | -0.66 dBFS | -0.66 dBFS |

Normal mixes measure identically (0.00 dB difference in peak, true peak and LUFS). The extreme case loses about 0.3 dB LUFS because the limiter now holds the overs that used to clip.

## Decisions
- Stems share the master path, so **stems also get the ceiling** (each stem stays at or under -0.3 dBTP). As before, each stem goes through the master chain on its own.
- MP3s: unchanged code. The loop MP3 still normalises to 0.97 only when the peak is over 0.97, so after the ceiling it no longer triggers. On the extreme loop the decoded MP3 peaks at -0.06 dBFS: never over 0, but above -0.3. The cause is MP3 codec overshoot, not the master. Normal loops decode around -0.66, the same as before. If the lead wants the MP3 under -0.3 too: in `makeMp3` (`src/studio.js`), change `pk>0.97?0.97/pk:1` to `pk>0.94?0.94/pk:1`, like `makeSongMp3`. That turns normal loop MP3s down about 0.1-0.2 dB, which breaks the "same within 0.1 dB" rule, so I didn't do it.
- "Turn it down" follow-up: not touched. The glue and old limiter settings are the same. The ceiling sits after them and only acts above -0.3 dBTP, so it doesn't make that issue worse.

## For the lead
- Merge: `preview-se-7` and `preview-se-7bc` also change `src/studio.js`, but in other places (around line 34, 239 and exportZip about 411). My changes are in `renderGraph`, `renderAudio` and `renderSongSpan` (lines 299-336). Expect a clean merge, then rebuild `index.html`.
- No new assistant actions, no Worker change, no new network calls.
- The live output now has 1.6 ms more delay (limiter look-ahead). Metronome and playback move together, so you can't hear it.

## Known limits
- Where AudioWorklet is missing (very old Safari), the soft-clip fallback rounds peaks above about -1.4 dBFS. Normal mixes would lose a fraction of a dB of peak there. Chrome, Firefox and Safari 14.1+ use the limiter.
- CPU: the limiter costs about 100 multiply-adds per sample on loud material. That is small next to the reverb convolver.

## Fix 1 (16 Nov, after the tester's branch check)
Only `src/core.js` changed (plus the rebuilt `index.html`). The limiter worklet is untouched.
- **Fallback renders were 192 samples late.** Renders keep the 4x soft clipper (it's the cleaner one) and now report its real delay. The delay is measured once per sample rate: an impulse goes through it in a tiny offline render (Safari's delay may differ from Chrome's, so we measure instead of hard-coding 192). If that can't be measured, the soft clip runs without oversampling and reports 0. `CEIL_LOOK=72` is the limiter look-ahead. `CEIL_LA` (used by `studio.js` for room at the end of a render) is now 512, the most delay any ceiling path may report. `studio.js` itself is unchanged.
- **Click or gap at the live hand-over.** The live soft clip is now not oversampled and passes through a 72-sample DelayNode, so it lines up sample for sample with the limiter. The swap is a 6 ms crossfade that starts 40 ms after the limiter is connected, so its look-ahead buffer is already full. The old path is disconnected about 0.3 s later. If the worklet never loads (very old Safari), this unoversampled soft clip stays on for live play. Renders still use the 4x one.
- `A.ceil` now has `worklet: true|false`. The smoke line's "live limiter on/soft clip" label still reads `A.ceil.latency`, which is now 72 on both paths. The tester could switch that label to `A.ceil.worklet`. It only affects the label, not the pass/fail result.

Tests (headless Chrome, `file://`, seeded random, against `/tmp/qa-main-se-9`):
| | lag vs main | impulse: reported / measured | max diff vs main (excl. last 256 wrap samples) | peak / RMS |
|---|---|---|---|---|
| Loop render, limiter | 0 | 72 / 72 | 0.0012 (main vs main: 0.0012) | -0.57 / -6.12 (main -0.57 / -6.12) |
| Loop render, fallback (addModule rejected) | **0** (before: 192) | **192 / 192** (before: 0 / 192) | 0.013 (soft knee) | -0.69 / -6.12 |
| Song span (beats 16-48), limiter | 0 | 72 / 72 | 0.023 (same as before this fix) | -0.58 / -6.40 |
| Song span, fallback | **0** (before: 192) | 192 / 192 | 0.025 | -0.67 / -6.40 |

Live hand-over: a fresh AudioContext with a steady 110 Hz tone through `liveCeiling()`, captured on the audio thread with an AudioWorklet tap. The tester's ScriptProcessor capture drops buffers in headless Chrome, and its control run without any ceiling showed jumps too. 6 runs at 0.5 amplitude and 6 runs at 1.3 (over the ceiling, so both paths are limiting during the swap): the max sample step was 0.0078 and 0.0204, exactly the tone's own step and the same as the direct control. Silent runs: none. The same test on the pre-fix build caught a 0.474 step at the swap.
`check.sh`: SMOKE OK, 48 checks, CHECK OK. Ceiling line: peak -0.30 dBFS, TP -0.30 dBTP, 0 full-scale samples.

Inter-sample note (ffmpeg reads -0.21 to -0.26 dBTP): I left it alone. A real improvement means 8x detection with a new, longer filter, which roughly doubles the limiter's cost while it's working and needs its own testing. The free alternative is a 0.1 dB safety margin inside the limiter, but that moves the extreme numbers the tester measured (to about -0.40 on our meter). If the lead wants stricter meters to read -0.3, the margin is one line: `ceil:CEIL*Math.pow(10,-0.1/20)` in `ceilingNode`.
