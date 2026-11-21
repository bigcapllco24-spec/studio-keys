# SE-11 fix 1 report: stems add up to the Mix with the master Drive or Bitcrush on
sound-engine-dev · 22 Nov 2026 · branch `preview-se-11` (pushed), head **e1d945b** (on top of c022418). I did not touch `main`.

## What I chose, and why
I chose to make the stems match: they now add up exactly to the Mix with Drive or Bitcrush on. They don't just come with a warning.
Drive and Bitcrush work on the whole mix at once, so any one stem driven by itself can never add up to the mix. I tested three ways to fix it:
1. **Share the exact per-sample Drive gain with every stem.** The sum is exact, but each soloed stem gets audio-rate modulation from the other parts. It spikes up to 3-7x where the kick and the bass cancel. Rejected: the stems sound broken.
2. **Clean stems plus "add a Saturator" in the README.** Ableton's Saturator has a different curve and a different level, and the master glue gain was measured after our Drive. The stems would never match. Rejected.
3. **Chosen: clean stems with the Drive's level change, plus one extra stem for the Drive itself.** Each stem gets the shaper's latency (128 samples for Chrome's 2x oversampling, found by correlation) and a smooth level change measured on the mix. That level change is the peak of the Drive's output over the peak of its input, taken in 23 ms windows across both channels, using the lowest of the windows each sample falls in. Everything else the Drive adds (its extra loudness, harmonics, crunch and clipping, or Bitcrush's bit noise) is printed as its own stem: "NN Master Drive.wav", "Master Bitcrush" or "Master Drive and Bitcrush". All the stems together null against Mix.wav.
   Why this is the most useful for an Ableton user: the plain stems sound clean and at their real level, nothing is hidden, and the README says exactly what the extra stem is. To redo the grit yourself, mute that stem and put a Saturator (Drive) or a Redux (Bitcrush), then a Limiter, on the master.
   The level change uses peaks, not a least-squares fit, so a clean stem isn't louder than its part in the mix. At Drive 10%, a least-squares fit needed 4.5 dB of stem headroom and the peak method needed 1.6 dB. Taking the lowest window stops a kick right after a quiet bit from being boosted.
- Headroom is now sized from the summed stems as well as from the loudest single stem, so nothing can clip.

## Files
- `src/mixer.js`: `SHAPE_TYPES`, `shapeKnob`, `shapeOn`, `shaperSplit(X,Z)` → `{h, D, r}` (new, after `masterGain`).
- `src/studio.js` (studio-ux-dev's file; the brief pointed at `exportZip`):
  - `renderGraph`: with `o.tapShape`, an 8-channel tap that adds the bus going into Drive/Bitcrush and what comes out of them. With `o.shape`, Drive/Bitcrush are replaced by a delay plus a gain driven by `h`, and `r` is fed in at the same point.
  - `renderAudio`: 8 channels when `tapShape` is set, and returns `shape`.
  - `exportZip`: the extra stem, headroom from the sum, and the README paragraph.
  - With no Drive or Bitcrush on, the path is unchanged.
- `tests/smoke.mjs`: one new line, "Ableton zip with the master Drive on…" (drums + bass, Drive 25%: 3 stems including Master Drive, null < -40 dB, no clipping, README paragraph, FX knobs restored afterwards).
- `index.html` rebuilt.

## Numbers
I used the tester's harness and scenario: house drums, bass and chords, 124 BPM, 4 bars. Residual is the Mix minus the stems summed with the README gain, relative to the Mix. Peak, RMS and loudness are dBFS / dB / LUFS.

| Case | Residual (before → now) | Mix pk / RMS / LUFS | Stems summed (with README gain) | Clipped samples | README gain | Loudest clean stem | Master stem pk / LUFS |
|---|---|---|---|---|---|---|---|
| Drive 10% | -7.9 → **-65.4 dB** | -0.60 / -4.95 / -5.27 | -0.60 / -4.95 / -5.27 | 0 (was 43,831) | +0.2 dB | -0.37 (drums) | -3.19 / -11.6 |
| Drive 25% | -4.8 → **-65.4 dB** | -0.43 / -5.34 / -5.43 | -0.42 / -5.34 / -5.43 | 0 | 0 | -1.55 | -2.10 / -10.0 |
| Drive 50% | -3.2 → **-65.3 dB** | -0.36 / -6.29 / -6.20 | -0.36 / -6.29 / -6.20 | 0 (was 45,216) | 0 | -2.81 | -1.46 / -10.2 |
| Bitcrush 30% | -25.9 → **-64.5 dB** | -0.71 / -6.44 / -6.99 | -0.71 / -6.44 / -6.99 | 0 (was 758) | 0 | -0.80 | -8.33 / -22.3 |
| Drive 30% + Bitcrush 50% | **-65.5 dB** | -0.23 / -5.50 / -5.55 | -0.23 | 0 | +0.1 dB | -2.24 | -2.03 / -10.0 |

- Before the fix, the summed stems peaked at +6.3 to +7.0 dBFS and ran 1.7 to 2.7 LU louder than the Mix. Now the loudness of the summed stems equals the Mix's to 0.01 LU.
- The Master Drive stem is loud at heavy Drive (about 4-6 LU under the Mix at 25-50%), because at those settings the Drive really does add that much.
- Worst README gain I saw: +3.8 dB, on the smoke song (drums + bass, Drive 25%), with an older smoothing. It is +2.6 dB with the final method, and +0 dB in check run 2 (the noise seeds come from track ids, so they change from session to session). The cause is the kick and bass cancelling inside the mix. The README states the exact number, and nothing clips.
- No Drive (regression check): house 4 tracks, residual -64.5 dB, README gain +1.1 dB. That matches the tester's -64.6 dB.
- Cost: one extra offline render (the Master stem) and `shaperSplit`, which takes about 144 ms for a 4-bar loop on this loaded box while "Rendering the mix…" shows. On this box (load 5-10), export times were 58-71 s for Drive vs 74 s for the no-Drive house song. Nothing changes when Drive and Bitcrush are off.
- `check.sh`: run 1 `CHECK OK`, `SMOKE OK: 83 checks`. The final build (run 2) also gave `CHECK OK`, `SMOKE OK: 83 checks`:
  - `PASS Ableton zip: stems add up to the mix (null test), nothing clips · residual -65.8 dB … loudest stem -0.38 dBFS`
  - `PASS Ableton zip with the master Drive on: stems plus a Master Drive stem add up to the mix, nothing clips · residual -65.5 dB vs the mix (stems +0 dB), mix peak -0.34, stems summed -0.34, loudest stem -0.33 dBFS`
- No page errors. The only console error is the blocked font fetch from the sandbox network.

## Try it (Ableton or any DAW)
1. Make drums (house), bass and chords. Turn the DRIVE knob (K7) to about 25%. Tap Export for Ableton (.zip).
2. The Stems folder now has one more file, "04 Master Drive.wav". Drag all four stems onto tracks at the README tempo, and add the Utility gain if the README names one. Play: it sounds like the Mix, and nothing clips on the master.
3. Null test: add Mix.wav with Utility Phase invert. Play it with all the stems: near silence (about -65 dB).
4. Mute "Master Drive" and the stems play clean, at their level in the driven mix. Put a Saturator, then a Limiter, on the master to drive it your own way.
5. Same with Bitcrush at 30%: you get "Master Bitcrush.wav" (the README suggests Redux).

## Limits
- A soloed stem carries the Drive's level change measured on the whole mix (like the glue gain), so it ducks a little where the mix is driven hardest.
- Muting a stem doesn't remove that part's share of the grit, which stays in the Master stem. The README says the grit can't be split by track.
- The tester's harness copy with the multi-knob option is at /tmp/claude-0/se11fix/run.mjs. For the next tester run: `DRV=drive:0.1 node run.mjs <index.html> <label> drive` (also `DRV=drive:0.3,crush:0.5`).
- No Worker, assistant-action or sample changes. `index.html` grew by about 0.4 KB.
