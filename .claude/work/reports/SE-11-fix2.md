# SE-11 fix 2 report (sound-engine-dev, 22 Nov 2026)

Branch `preview-se-11`, head **6bd0281** (pushed). WIP commits before it: 10d95a5, d360388. `main` not touched. check.sh: **CHECK OK**, SMOKE OK 83 checks, 2 min 46 s, load about 5.

## What changed
**Problem 1, option (a), with one change from the brief.** With Drive or Bitcrush on, the Master stem now holds only the grit. Muting a stem mutes that part.
- `src/mixer.js`
  - `shaperLatency(X, Z)` measures the shaper's delay (same code as before).
  - `shaperSplit(Y, P)` is rewritten. It matches each clean stem's level to the driven mix by energy: a least-squares fit per window, as the tester tried.
- **Where it differs from the brief: one level per stem, not one level for the whole mix.** The tester's version gave the whole mix one level, which still leaves a part behind when its stem is muted:
  - chords at -15 dB on house Drive 25%, measured with `leak.mjs` (it hid negative leak coefficients as `null`; I re-ran it showing both signs);
  - drums at -25 dB on hip-hop.

  The reason is that the Drive squashes a loud kick much more than the quieter parts riding on it, so no single level fits every part.
- How the fit works now:
  - It fits all stems at once, in ~280 ms windows that wrap around the loop.
  - Both channels share one level, so stems keep their stereo image.
  - In quiet or unclear windows, a stem's level is pulled toward the whole mix's level.
  - Each level moves at most 1.5 dB per 23 ms. That limit also applies across the loop point, so stems loop without a jump.
- The Master stem is the driven mix minus the levelled stems.
- `src/studio.js`
  - `renderGraph`: with the Drive on, a stem is rendered without Drive/Bitcrush, delayed by their latency. The old level-curve gain and the grit buffer injection are gone.
  - `renderAudio`'s tap also returns the signal going into the master glue (`pre`), aligned with the stems.
  - `exportZip` renders the clean stems, then runs `shaperSplit`; the status line reads "Matching the stems to the master Drive…".
  - The Master stem no longer needs its own render, so a Drive-on export is about 2 s faster than fix 1 (27.6 s quiet vs 28.9-29.3 s).
  - The null is now exact by construction: -79 to -84 dB, against -65 dB before.
- **Problem 2, README** (`exportZip` text only):
  - Stems line: "(mute a stem and its part goes, reverb and echo too; the grit the master Drive added stays in the Master Drive stem, see below)".
  - Drive paragraph: "Each stem is clean (no drive) and turned up or down the way the Drive changed the mix's level. The grit it adds (crunch and extra harmonics) is in its own stem, "04 Master Drive.wav". Play it with the other stems and they add up exactly to the Mix. To make the drive yourself, mute that stem and put a Saturator, then a Limiter, on the Ableton master after the Utility (keep the Limiter: the clean stems together can go over 0 dB)."
  - Bitcrush says "(no bitcrush)" and "The grit it adds (bit noise)", and suggests Redux. Drive and Bitcrush together: "(no drive or bitcrush)", "crunch, extra harmonics and bit noise".
  - **Wording differs from the brief:** I wrote "turned up or down … changed the mix's level" instead of "turned down … turned the mix down". The Drive turns quiet parts *up*. The median stem level is +1.8 dB at Drive 10%, +0.7 dB at 25%, -2.1 dB at 60%, and +2 to +5 dB on hip-hop. So "turned down" would be wrong in most songs.
  - The Utility sentence is unchanged and names the gain ("Add a Utility with Gain +2.2 dB …"). The smoke-test pattern "Master Drive: … add up exactly to the Mix" still matches.
- MP3 export and live sound: no code they use was changed (`makeMp3` and live go through `renderAudio`'s plain path and the live chain). Drive off: the export takes the same code path as before.

## Numbers
Harness: the tester's `run.mjs`/`analyze.mjs`, copied to /home/claude/se11c-h with a hook that records each stem's level curve during the real export. Same songs and seeds as the retest.
- "Left after muting" is `leak.mjs` (joint least-squares fit of the Master stem onto the 16-bit stems), with signed coefficients.
- "Floor" is the same fit against the stems shifted in time, i.e. an unrelated signal. A value at or near the floor is below what this method can measure.
- LUFS are as played with the README gain.

| Song, setting | README gain | Residual vs Mix | Mix pk / LUFS | Clean stems summed LUFS (pk) | Master stem LUFS (file) | Drums stem LUFS | Left after muting each stem (dB) | Floor | Level step, max per 23 ms | Clipped |
|---|---|---|---|---|---|---|---|---|---|---|
| house, Drive 10% | +2.5 | -82.4 | -0.55 / -5.36 | -6.01 (+2.8) | -14.1 (-16.6) | -7.0 | -39.3 / -36.3 / -30.7 | -47 / -40 / -27 | 1.03 / 1.50 / 1.50 | 0 |
| house, Drive 25% | +2.2 | -82.4 | -0.36 / -5.54 | -6.79 (+2.5) | -11.6 (-13.8) | -7.7 | -39.1 / -34.2 / -31.2 | -43 / -39 / -24 | 1.20 / 1.50 / 1.50 | 0 |
| house, Drive 60% | 0 | -83.4 | -0.60 / -6.57 | -8.34 (+1.5) | -11.3 (-11.3) | -9.2 | -39.4 / -33.9 / -37.8 | -42 / -38 / -24 | 1.24 / 1.50 / 1.50 | 0 |
| house, Bitcrush 30% | +0.4 | -82.6 | -0.75 / -7.02 | -7.04 (+1.8) | -30.7 (-31.1) | -8.0 | -56.5 / -63.4 / -53.1 | -59 / -52 / -45 | 0.21 / 1.50 / 1.50 | 0 |
| house, Drive 30% + Bitcrush 30% | +1.4 | -83.1 | -0.30 / -5.65 | -7.01 (+1.6) | -11.4 (-12.8) | -7.9 | -39.4 / -33.8 / -31.7 | -42 / -38 / -24 | 1.21 / 1.50 / 1.50 | 0 |
| Bodzin, Drive 25% (4 parts) | +1.3 | -82.1 | -0.50 / -6.37 | -7.52 (+2.6) | -12.2 (-13.5) | -8.1 | -42.3 / -37.5 / -33.3 / -29.8 | -43 / -32 / -26 / -29 | 0.83 / 1.50 / 1.50 / 1.50 | 0 |
| hip-hop, Drive 25% | +5.0 | -79.1 | -0.64 / -5.33 | -6.36 (+6.5) | -12.6 (-17.6) | -10.0 (bass -8.7) | -34.7 / -49.8 / -29.8 | -42 / -45 / -35 | 1.50 / 1.50 / 1.50 | 0 |
| house + voice note, Drive 25% | +2.1 | -83.5 | -0.53 / -5.43 | -6.71 (+2.9) | -11.4 (-13.5) | -7.6 | -38.8 / -33.4 / -42.2 | -42 / -40 / -31 | 1.26 / 1.50 / 1.50 | 0 |
| house, Song mode, Drive 25% | +1.8 | -82.8 | -0.41 / -5.51 | -6.76 (+2.2) | -11.6 (-13.4) | -7.7 | -39.1 / -34.5 / -30.3 | -43 / -38 / -24 | 1.19 / 1.50 / 1.50 | 0 |

Against the targets:
- **Residual ≤ -60 dB:** yes, -79 to -84 dB in every case.
- **Muted part below -35 dB:**
  - Drums: met in all cases but hip-hop (-34.7).
  - Bass: -33.4 to -37.5 on house-type songs (target ~-35), -49.8 on hip-hop.
  - Chords and the Bodzin melody: -29.8 to -33.3, but on house and Bodzin those sit at or within a few dB of the floor, so that's as low as this method can measure. A part that quiet (about 19-28 dB under the mix) left at -30 dB is 50 dB or more under the mix.
  - The one real miss is **hip-hop chords at -29.8 (floor -35)**. The Drive pumps a quiet boom-bap mix hardest: the chords' level swings about 15 dB between hits. With a 2 dB per 23 ms limit, my tuning run got them to -37.
  - Before this fix, a muted stem was left at -7 to -10 dB.
- **Master Drive stem well below the drums:**
  - house 25%: -11.6 vs -7.7 LUFS as played.
  - In raw file terms: -13.8 vs -9.9.
  - The tester's -17.2 was the raw file with a +5.4 dB README gain. That is -11.8 as played, so it's the same grit level as here (about 6 LU under the Mix).
  - Hip-hop: the Master stem is 2.6 LU under the drums.
  - Bitcrush 30%: the Master stem is only bit noise, at -31 LUFS.
- **Clean stems summed within ~1 LU of the Mix:**
  - 0.0 (Bitcrush), 0.65 (Drive 10%), 1.0-1.4 (Drive 25-30%), 1.8 (Drive 60%).
  - The gap is the grit's own energy: grit and clean stems don't overlap, so they add up by power. The tester's one-level version had 1.0 at 25%.
- **No clipped samples in any written stem:** yes. Stems are scaled as before and the README states the gain: 0 to +2.5 dB on most songs, +5.0 dB on hip-hop.
- **Clean stems with Master Drive muted:** with the gain they peak up to +2.5 dBFS (+6.5 on hip-hop). The README says to keep a Limiter.
- **Smooth levels:** at most 1.5 dB per 23 ms on every stem, across the loop point too. Fix 1 jumped up to 6.85 dB.
- **Drive off:** same code path as before. Levels match the fix 1 build within run-to-run noise (track ids change the per-track seeds each run):
  - house: residual -63.9 vs -63.6 dB, stems -8.2 / -14.8 / -22.3 vs -8.2 / -14.8 / -22.2 LUFS;
  - hip-hop: -63.7 vs -63.8, identical stem LUFS;
  - Bodzin: -64.1 vs -64.3, identical stem LUFS.
- **MP3 and live**, house, this branch vs fix 1, peak / RMS / LUFS:
  - Drive 25%, loop render: -0.41 / -5.38 / -5.50 vs -0.46 / -5.39 / -5.52.
  - Drive 25%, decoded MP3: -0.21 / -6.68 / -6.46 vs -0.68 / -6.69 / -6.47.
  - Drive 25%, live (run one at a time): -0.38 / -5.41 / -5.54 on both, identical.
  - Drive off: loop -6.66 vs -6.65 RMS; MP3 -7.93 vs -7.92.
- **Main thread:** `shaperSplit` takes about 65-140 ms (up to 280 ms under load), once per export, with the status line shown.
- **Size:** `index.html` is about 2.5 KB larger than fix 1.
- **Page errors:** none.

## For the lead and tester
- The tester's `leak.mjs` prints `null` for negative coefficients, so a part that is in the Master stem inverted looks clean. Use `20·log10(|a|/|1+a|)`, as in /home/claude/se11c-h/leak.mjs, and the floor check in /home/claude/se11c-h/leak2.mjs.
- The tester's `run.mjs` `h` mode reads `M.shape.h`, which no longer exists (`renderAudio` now returns `shape: {D}`). My copy /home/claude/se11c-h/run.mjs records the per-stem levels during the real export instead (`res.hs`).
- No Worker, assistant action, sample or smoke-test changes. The smoke test still passes: Drive case residual -84.8 dB.

## Known limits
- Muting a stem removes its plain sound, but the Drive's crunch *of* that part stays in the Master Drive stem (the README says so). Muting drums still leaves their fizz.
- Hip-hop chords miss -35 (-29.8) under the 1.5 dB limit, as above. Your call if 2 dB is acceptable; it's one constant (`SLEW`).
- Soloed clean stems still move in level (up to 1.5 dB per 23 ms), following the Drive: quiet stretches come up, kicks push others down.

## Try list (for the test link)
1. Make drums (house), a bass and chords. Turn DRIVE (K7) to about 25%. Tap Export for Ableton (.zip).
2. In Ableton, set the tempo from the README and drag the four stems onto tracks. On the master, add a Utility with the gain the README names (about +2 dB here). Play: it sounds exactly like the Mix, and nothing clips.
3. Null test: add Mix.wav on its own track with a Utility set to phase invert. Play it with all four stems: near silence (about -80 dB).
4. Mute "01 Drums": the drums' clean sound is gone. What's left is only the Drive's crunch from them, in "04 Master Drive". Try the same with the bass and the chords.
5. Solo "04 Master Drive": you hear only crunch and fizz, no plain copy of the beat.
6. Mute "04 Master Drive": the clean stems play about 1 dB quieter than the Mix. Add a Saturator, then a Limiter, after the Utility to drive it your own way.
7. Same with Bitcrush at 30% and Drive off: you get "04 Master Bitcrush.wav", a quiet layer of bit noise, and the README suggests Redux.
8. A hip-hop beat with Drive 25%: the README asks for about +5 dB on the Utility. Do that, and keep the Limiter if you mute the Master stem.

## Files
- Code: /home/claude/sk-se11c/src/mixer.js (`shaperLatency`, `shaperSplit`), /home/claude/sk-se11c/src/studio.js (`renderGraph`, `renderAudio`, `exportZip` and its README text), /home/claude/sk-se11c/index.html (rebuilt)
- Harness and results: /home/claude/se11c-h/ (`one.sh`, `run.mjs`, `leak2.mjs`, `tune2.mjs`, `split2.js` prototype, `out/g-f2-*-zip` and their `.analysis.json` files, `check1.log`)
