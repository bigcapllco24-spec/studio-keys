# SE-11 re-check after fix 1 (qa-tester, 22 Nov 2026, 03:13 IST check-in)
Branch `preview-se-11` @ e1d945b, compared with `main` @ c1ed5d9 using the same seeds. The machine had restarted, so I rebuilt the harness: /home/claude/qa-se11b/run.mjs, /home/claude/qa-se11b/analyze.mjs, /home/claude/qa-se11b/leak.mjs.

## Verdict: NOT READY (one medium problem, a design trade-off for the lead to decide)
Everything the fix promised works. The stems plus the new "Master Drive / Master Bitcrush" stem null against the Mix at -64 to -66 dB in every case I tried: 5 Drive/Bitcrush settings, 4 styles, sidechain, a voice note with a muted track, and Song mode. Nothing clips, and the README names the Utility gain. With Drive off nothing changed. The MP3 and live sound are the same as main. check.sh: CHECK OK.

What fails is the try step "mute Master Drive and the stems play clean, at their level in the driven mix", and the README's description of that stem. With Drive on, about half of every instrument is also inside the Master Drive stem. So:
- muting a part's stem leaves that part playing at about -7 to -10 dB;
- the Master Drive stem is louder than the drums stem;
- muting the Master Drive stem drops the mix by about 5 LU.

A producer who mutes the drums stem in Ableton will still hear the drums. It can be fixed in two ways (see problem 1). If the lead picks (b), the wording fix, it is READY once the text changes.

## Problems
1. **(medium) With Drive on, the "Master Drive" stem holds roughly half of every part, not just the grit. Muted stems keep playing through it.**
   Steps:
   1. New song: drums (house), bass, chords (house adds sidechain on bass and chords).
   2. Turn DRIVE (K7) to 25%.
   3. Export for Ableton (.zip).
   4. In Ableton, load all 4 stems and mute "01 Drums".

   Result: the drums still play at about -9 dB, through "04 Master Drive.wav". I measured this with a least-squares fit of the Master stem onto the clean stems (the leak coefficient is how much of each part is copied into the Master stem):

   | Song, setting | Leak coefficient (drums / bass / chords) | Level left after muting a stem | Share of Master stem that is plain copies of the parts |
   |---|---|---|---|
   | house, Drive 10% | 0.49 / 0.71 / 0.58 | -9.7 / -7.6 / -8.7 dB | 52% |
   | house, Drive 25% | 0.55 / 0.75 / 0.67 | -9.0 / -7.3 / -7.9 dB | 41% |
   | house, Drive 60% | 0.53 / 0.57 / 0.47 | -9.2 / -8.8 / -9.9 dB | 32% |
   | house, Drive 30% + Bitcrush 30% | similar | -8.9 / -7.5 / -8.1 dB | 39% |
   | Bodzin, Drive 25% | (drums) | -7.7 dB | 48% |
   | hip-hop, Drive 25% | (drums) | -7.3 dB | 51% |
   | Bitcrush 30% only | | -14.5 to -22.5 dB | (milder) |

   Also at house Drive 25%:
   - The Master Drive stem is -10.0 LUFS, louder than the Drums stem (-11.45).
   - The clean stems alone sum to -10.8 LUFS against the Mix at -5.5, so muting Master Drive drops the mix by 5.2 LU. Try step 4 says they play "at their level in the driven mix"; they don't.
   - Soloed clean stems pump. The level change every clean stem gets (h) moves between -6.4 and -1.3 dB (5th to 95th percentile), with jumps of up to 6.7 dB inside 23 ms (Drive 10%: -5.1 to +0.3 dB; Drive 60%: -8.2 to -3.5 dB). The fix report calls this "ducks a little".

   Cause: `shaperSplit` sets h from the lowest of the 23 ms peak ratios. That sits well under the Drive's real gain on the body of the sound, so the difference goes into r, the Master stem.

   Two ways out (sound-engine-dev, `shaperSplit` in `src/mixer.js`; README in `exportZip`, `src/studio.js`):
   - **(a) Energy match.** I tried this in the page by overriding `shaperSplit` with a least-squares h per window, everything else unchanged, on house Drive 25%. Result:
     - residual -64.6 dB, 0 clipped samples;
     - muting a stem leaves its part under -40 dB (only 0.4% of the Master stem is plain copies of the parts);
     - the Master Drive stem drops to -17.2 LUFS and is real grit;
     - the clean stems sum to -6.5 LUFS against the Mix at -5.5.

     The cost: the README's Utility gain goes from 0 to +5.4 dB. Also, with Master Drive muted, the clean stems summed with that gain peak at +3.5 dBFS (the README already says to add a Saturator, then a Limiter). The dev rejected least-squares over headroom (4.5 dB at 10%); I think a stated +5 dB Utility gain costs less than stems that don't mute.
   - **(b) Keep it and say so.** The README and the Try list should tell a musician that the Master stem also carries about half of every part, so muting a stem only turns it down by about 8 dB. They should also say that muting the Master stem makes the stems about 5 dB quieter than the Mix. And drop "at their level in the driven mix".

2. **(low) README wording in the Drive paragraph.**
   - "Each stem has its level change but stays clean" doesn't read well for a musician (level change of what?). Something like "Each stem is clean (no drive) and turned down the way the Drive turned the mix down" would be clearer.
   - The "Stems:" line above it says "mute a stem and its reverb goes too", which is untrue with Drive on (problem 1).
   - The Bitcrush paragraph reuses "its extra loudness, grit and crunch"; "bit noise" fits Bitcrush better.
   - Otherwise it reads right. It names the Utility gain when there is one ("Add a Utility with Gain +3.3 dB …" on the voice-note song with Drive 25%; "Leave it at 0 dB." otherwise). It names the extra stem file exactly ("04 Master Drive.wav", "05 Master Bitcrush.wav", "04 Master Drive and Bitcrush.wav") and suggests Saturator / Redux, then a Limiter.

3. **(low, not caused by SE-11) check.sh under load, and its runtime.**
   - Run 1 (load 10-15): the smoke test stopped on a protocol timeout after 56 checks.
   - Run 2 (load about 9, another tester running): 81 of 83 passed. The 2 known song reload/Undo checks failed, the same flakes as in my first check.
   - Run 3 (quiet machine): CHECK OK in 2 min 57 s, right at the 3-minute budget. This is mine to fix: I'll trim it in the next test-upkeep job.

## What I checked (numbers)
Residual = the Mix minus all stems summed (with the README gain), relative to the Mix. Peak / RMS / LUFS are in dBFS / dB / LUFS. "Clipped" counts full-scale samples in every stem and in the gained sum.

| Song | Setting | Stems | README gain | Residual | Mix pk / RMS / LUFS | Stems summed | Clipped | Loudest stem | Master stem pk / LUFS |
|---|---|---|---|---|---|---|---|---|---|
| house 124 (sidechain .75/.55) | Drive 10% | 3+M | 0 | **-65.18** | -0.42 / -5.02 / -5.36 | identical | 0 | -0.36 | -2.89 / -11.4 |
| house | Drive 25% | 3+M | 0 | **-65.14** | -0.46 / -5.40 / -5.52 | identical | 0 | -0.83 | -1.94 / -10.0 |
| house | Drive 60% | 3+M | 0 | **-65.80** | -0.37 / -6.69 / -6.57 | identical | 0 | -1.60 (M) | -1.60 / -10.4 |
| house | Drive 100% | 3+M | 0 | **-65.17** | -0.68 / -7.94 / -7.68 | identical | 0 | -1.53 (M) | -1.53 / -11.3 |
| house | Bitcrush 30% | 3+M | +0.7 | **-64.93** | -0.70 / -6.46 / -7.02 | identical | 0 | -0.39 | -9.16 / -23.1 |
| house | Drive 30% + Bitcrush 30% | 3+M | +0.1 | **-65.24** | -0.30 / -5.56 / -5.64 | identical | 0 | -1.43 (M) | -1.43 / -10.0 |
| house | off (regression) | 3 | +1.1 | **-64.08** | -0.54 / -6.66 / -7.24 | identical | 0 | -0.36 | none |
| Bodzin 124 (deep-techno kit, rollbass, darkpad, pluck; sidechain .75/.55/.3) | Drive 25% | 4+M | 0 | **-65.35** | -0.43 / -5.47 / -6.41 | identical | 0 | -1.63 | -2.36 / -10.7 |
| Bodzin | Bitcrush 30% | 4+M | 0 | **-64.16** | -0.75 / -6.30 / -7.57 | identical | 0 | -0.55 | -8.64 / -22.6 |
| Bodzin | off | 4 | +0.2 | **-64.48** | -0.44 / -6.51 / -7.78 | identical | 0 | -0.36 | none |
| hip-hop boom bap 88 | Drive 25% | 3+M | 0 | **-65.35** | -0.64 / -5.67 / -5.32 | identical | 0 | -2.63 (M) | -2.63 / -10.1 |
| hip-hop | off | 3 | 0 | **-63.74** | -0.42 / -8.89 / -9.17 | identical | 0 | -0.84 | none |
| techno 130 (acid, supersaw) | Drive 25% | 3+M | 0 | **-65.08** | -0.53 / -5.26 / -6.37 | identical | 0 | -2.32 | -2.37 / -11.1 |
| techno | off | 3 | +0.2 | **-64.14** | -0.56 / -6.21 / -7.68 | identical | 0 | -0.35 | none |
| house + voice note (sing.wav) + muted Chords | Drive 25% | 3+M | +3.3 | **-65.43** | -0.45 / -5.35 / -5.43 | identical | 0 | -0.36 | -5.18 / -13.2 |
| same | Drive 30% + Bitcrush 30% | 3+M | +3.3 | **-65.85** | -0.38 / -5.49 / -5.53 | identical | 0 | -0.37 | -4.97 / -13.1 |
| same | off | 3 | +1.4 | **-65.12** | -0.55 / -6.67 / -7.19 | identical | 0 | -0.38 | none |
| house, Song mode on (Short layout, 16 bars) | Drive 25% | 3+M | 0 | **-65.67** | -0.40 / -5.41 / -5.54 | identical | 0 | -1.81 | -1.97 / -10.0 |

- Every file is exactly one loop long: 341,419 samples at 124 BPM, 481,091 at 88, 325,662 at 130.
- The muted Chords is left out of the stems, the MIDI and the README track list. The voice note exports as "03 sing.wav", and the Master stem is numbered after it ("04 Master Drive.wav").
- Song mode still exports the 4-bar loop, as before; not new.
- "Stems summed" matched the Mix to 0.01 dB in peak, RMS and LUFS in every case.

**MP3 and live sound, main vs branch.** Same seeds, Math.random seeded on both. The waveforms differ because the branch now seeds noise per track; the levels don't.

| Song | What | main pk / RMS / LUFS | branch pk / RMS / LUFS |
|---|---|---|---|
| house, off | loop render | -0.52 / -6.70 / -7.27 | -0.52 / -6.67 / -7.25 |
| house, off | decoded MP3 | -0.63 / -7.99 / -8.20 | -0.56 / -7.94 / -8.16 |
| house, off | live, 16 s | -0.56 / -6.73 / -7.30 | -0.58 / -6.67 / -7.25 |
| house, Drive 25% | loop render | -0.56 / -5.39 / -5.48 | -0.41 / -5.40 / -5.52 |
| house, Drive 25% | decoded MP3 | 0.00 / -6.69 / -6.43 | -0.59 / -6.71 / -6.50 |
| house, Drive 25% | live | -0.42 / -5.42 / -5.53 | -0.38 / -5.41 / -5.54 |
| Bodzin, off | loop render | -0.49 / -6.70 / -7.85 | -0.44 / -6.52 / -7.79 |
| Bodzin, off | decoded MP3 | -0.44 / -8.02 / -8.82 | -0.49 / -7.87 / -8.76 |
| Bodzin, off | live | -0.51 / -6.70 / -7.85 | -0.48 / -6.49 / -7.75 |

- All within 0.2 dB RMS and 0.1 LU.
- No silence and no clipping on the branch. The 1 clipped sample was in main's Drive MP3, from decoder overshoot.
- MP3 length is exact (341,419 of 341,419 samples) and the size is the same (187,453 bytes).

**Export time** (house, back to back, load about 2):
- Branch, Drive off: 25.7 s and 26.4 s. Main: 24.2 s.
- Branch, Drive 25%: 28.9 s and 29.3 s. Main: 24.3 s. That is +5 s for the extra Master stem render.
- Under load 10-15 (another tester running), exports took 150-480 s on any setting.

**check.sh:**
- Run 3 on the branch (quiet): `CHECK OK`, `SMOKE OK: 83 checks`, 2 min 57 s.
- `PASS Ableton zip … residual -65.9 dB (stems +1.3 dB)`
- `PASS Ableton zip with the master Drive on … residual -66.0 dB (stems +3.1 dB), loudest stem -0.34 dBFS`
- The committed index.html matches a rebuild.
- The branch merges cleanly into main @ c1ed5d9; index.html needs a rebuild after the merge.

**Page errors:** none in any run. The only console error is the blocked font fetch.

## Files
- Harness: /home/claude/qa-se11b/run.mjs (`DRV=drive:0.25,crush:0.3 node run.mjs <index.html> <label> <house|hiphop|bodzin|techno|voice|song> zip,mp3,live,h`; `LS=1` runs the least-squares experiment), /home/claude/qa-se11b/analyze.mjs, /home/claude/qa-se11b/leak.mjs
- Unpacked zips and numbers: /home/claude/qa-se11b/out/<label>-<song>-<setting>-zip/ and the matching .analysis.json files. The experiment is in /home/claude/qa-se11b/out/ls-br-house-drive_0.25-zip.
- READMEs:
  - Drive with gain: /home/claude/qa-se11b/out/br-voice-drive_0.25-zip/QA ji1 124bpm 4bars/README.txt
  - Drive + Bitcrush: /home/claude/qa-se11b/out/br-house-drive_0.3_crush_0.3-zip/QA t73 124bpm 4bars/README.txt
- Queue logs: /home/claude/qa-se11b/queue1.log, /home/claude/qa-se11b/queue2.log
- check.sh logs: /home/claude/sk-t7-check1.log, /home/claude/sk-t7-check2.log, /home/claude/sk-t7-check3.log
- Screenshots (all looked at; the export status reads "Downloaded … .zip", and the knobs show the setting): /home/claude/qa-se11b/out/br-house-drive_0.25-export.png, /home/claude/qa-se11b/out/br-house-crush_0.3-export.png, /home/claude/qa-se11b/out/br-voice-drive_0.25-export.png, /home/claude/qa-se11b/out/br-song-drive_0.25-export.png, and /home/claude/qa-se11b/out/*-export.png for every run.
