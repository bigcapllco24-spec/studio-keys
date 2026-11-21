# SE-11 branch check (qa-tester, 22 Nov 2026)
Branch `preview-se-11` @ c022418 (base 93981ea). Compared against the base build 93981ea, using the same song seeds.

## Verdict: NOT READY (one fix needed, otherwise solid)
The normal case is fixed. Stems now add up to the Mix at about -64 dB in all 4 styles, in a song with a voice note and a muted track, with the master FX on, and in Song mode. No stem clips, and the MP3, the live sound and the export time are unchanged. The fix still needed: with the master **Drive** (or Bitcrush) knob on, the stems still add up much louder than the Mix and clip, and the README tells the user they need no limiter.

## Problems
1. **(medium) Master Drive on: stems sum to +6 to +7 dBFS and clip, but the README says "no limiter or compressor needed".**
   Steps:
   1. New song: drums (house), bass, chords.
   2. Turn the DRIVE knob (K7 on the on-screen controller) to 10%.
   3. Export for Ableton (.zip).
   4. Follow the README: Utility +1.2 dB on the master. Then play all the stems.

   Result: the summed stems peak at +6.27 dBFS with 43,831 clipped samples and are 1.7 LU louder than the Mix. The residual is -7.9 dB, about as bad as the original bug (-9 dB). Drive 25%: +6.96 dBFS, residual -4.8 dB. Drive 50%: +6.77 dBFS, 45,216 clipped samples, residual -3.2 dB, 2.7 LU louder. Bitcrush 30%: +2.15 dBFS, 758 clipped samples, residual -25.9 dB.

   The README note says "the stems add up to the Mix closely but not exactly", and the line above it says "no limiter or compressor needed". Both are wrong in this case. Drive is one of the 8 default knobs on the controller, so this case is easy to reach.

   Suggested fix (sound-engine-dev, `exportZip` in `src/studio.js`): when `bent` is true, size the headroom from the summed stems too, not only from the loudest single stem. Change the README to say the stems won't match the Mix, and to put a limiter on the master. Or find a level match that gets close.
2. **(low, not caused by SE-11) check.sh is flaky under load.** Run 1 failed 2 song reload/Undo checks ("opening the app starts a new empty song…", "Undo right after opening a song…"). Run 2 failed "velocity lane… dragging a selected bar". The load average was 5-7 for both runs. Run 3 on a quiet machine: CHECK OK. None of these checks touch the export code.

## What I checked (numbers)
**check.sh** on the branch, run 3: `CHECK OK`, `SMOKE OK: 82 checks`, 2 min 28 s. The new smoke line passes (residual -65.9 dB, stems +0.8 dB, loudest stem -0.32 dBFS).
**main + branch merged** (clean auto-merge; `index.html` already matches a rebuild): `CHECK OK`, `SMOKE OK: 92 checks`, 2 min 25 s.

**Null test.** Residual = Mix minus the summed stems, with the README gain added (dB vs the Mix):

| Song | Stems | README gain | Residual | Mix pk / RMS / LUFS | Stems+gain pk / RMS / LUFS | Loudest stem | Base residual |
|---|---|---|---|---|---|---|---|
| House 124 | 4 | +0.6 | **-64.6** | -0.45 / -6.87 / -7.36 | -0.44 / -6.87 / -7.36 | -0.32 (drums) | -8.9 (raw sum +5.70 dBFS) |
| Hip-hop (boom bap) 88 | 4 | 0 | **-63.6** | -0.45 / -9.26 / -8.67 | same | -0.79 | -7.9 (+6.31) |
| Bodzin melodic techno 124, sidechain 0.75/0.55/0.3 | 4 | 0 | **-64.2** | -0.43 / -6.61 / -7.82 | same | -0.52 | -8.6 (+5.09) |
| Techno 130 | 4 | +0.1 | **-64.0** | -0.55 / -6.43 / -7.79 | same | -0.31 | -10.2 (+4.70) |
| House + voice note (sing.wav) + muted Chords | 3 | +1.3 | **-64.9** | -0.48 / -6.57 / -7.09 | same | -0.36 | -9.5 (+5.37) |
| Master FX on (reverb 50, echo 40, gate 50, chorus 50, cutoff 30) | 3 | +1.4 | **-61.5** | -0.72 / -8.15 / -8.71 | same | -0.38 | n/a |
| Song mode on | 3 | 0 | **-63.7** | -0.56 / -6.65 / -7.12 | same | -0.61 | n/a |
| Master Drive 50 | 3 | +2.0 | **-3.2** | -0.43 / -6.25 / -6.14 | **+6.77** / -3.92 / -3.46 | -0.36 | n/a |

- No stem clips: 0 clipped samples in every stem, and every stem peaks at or below -0.30 dBFS. The drums stem is never louder than the Mix (LUFS -8.7 vs -7.4 for house). Every file is exactly one loop long (341,419 samples at 124 BPM).
- The muted track is left out of the Mix, the Stems and the README's track list. The voice note exports as stem "03 sing.wav" and nulls too.
- Solo: soloing the bass exports the Mix plus "01 Bassline.wav" only. A track with no notes exports a silent stem with no error.
- Quiet single track with no compression: stem vs Mix -65.1 dB, and the README says "Leave it at 0 dB".
- Repeatable: exporting the same song twice gives Mix -68.5 dB and stems -68 to -70 dB (float noise). Mix.wav vs the plain render the MP3 uses: -67.9 dB. Loop seams are clean: the bass and chords stems jump 0.002 and 0.011 at the seam, and the drums jump comes from a kick on beat 1.
- The README gain changes a little from session to session for the same seeds (0.2 to 0.6 dB on house), because track ids seed the noise. Within one song it is exact.

**README text:** says "drag in the Mix OR all the Stems (not both)", explains what a stem contains (with its reverb and echo), and has the master line "no limiter or compressor needed. Add a Utility with Gain +X dB (or raise the master fader by X dB)…" or "Leave it at 0 dB." The numbers are exact: summed stems × 10^(X/20) = Mix. With Drive or Bitcrush on it adds a note, but see problem 1.

**MP3 and live sound unchanged.** Base vs branch, same seeds, with Math.random seeded on both. Differences come from the new seeded noise:
- Loop render feeding the MP3: within ±0.11 dB RMS and ±0.09 LU in all 5 songs (house -6.93/-7.42 vs -6.87/-7.36; Bodzin identical, -6.61/-7.82).
- Decoded MP3: within ±0.08 dB RMS and ±0.08 LU. Peaks within 0.27 dB (noise-driven).
- MP3 length: exact (341,419 of 341,419 samples).
- Live AudioContext output (house loop, 2 × 16 s captures): base -0.43/-6.88/-7.32 and -0.44/-6.88/-7.31; branch -0.48/-6.87/-7.37 and -0.45/-6.87/-7.36 (peak/RMS/LUFS). No silence and no clipping.

**Export time** (house, 4 tracks, run back to back on a quiet machine): base 26.6 s and 26.8 s, branch 25.2 s and 26.1 s, so unchanged. The plain loop render is 9.1-9.3 s on base and 8.7-8.8 s on the branch. Earlier runs under load took 47-122 s on both builds.

**Song-mode zip:** works ("Downloaded QA song mode 124bpm 4bars.zip"). It still exports the 4-bar loop, not the arrangement, as before; that is not new.
**Page errors:** none. The only console error is one blocked font fetch, from the sandbox network.

## Files
- Harness: /home/claude/qa-se11/run.mjs, /home/claude/qa-se11/extra.mjs
- Numbers: /home/claude/qa-se11/out/branch.json, /home/claude/qa-se11/out/base.json, /home/claude/qa-se11/out/branch-extra.json, /home/claude/qa-se11/out/drv-*.json, /home/claude/qa-se11/out/t-*.json
- READMEs from the zips: /home/claude/qa-se11/out/branch-*-README.txt (Drive case: /home/claude/qa-se11/out/branch-drive-README.txt)
- check.sh logs: /home/claude/sk-t4-check1.log, /home/claude/sk-t4-check2.log, /home/claude/sk-t4-check3.log, /home/claude/sk-merge-check.log
- Screenshots: /home/claude/qa-se11/out/branch-house-export.png, /home/claude/qa-se11/out/branch-songmode-export.png, /home/claude/qa-se11/out/base-house-export.png, /home/claude/qa-se11/out/branch-extra.png
