# SE-11 re-check 2 after fix 2 (qa-tester, 22 Nov 2026)
Branch `preview-se-11` @ 6bd0281, clone /home/claude/sk-t11. Baseline is the merge base 93981ea (main without SE-11), built in /home/claude/sk-t11-base. Same songs and seeds as before. Progress notes: /home/claude/qa-se11c/progress-notes.md

## Verdict: READY. One wording change is needed before gate 2, and it is text only.
Fix 2 does what option (a) promised:
- **Null test:** the stems plus the Master stem null against the Mix at -79 to -83 dB, in all 9 Drive/Bitcrush cases.
- **Mute test:** muting a stem now removes its plain sound. What is left sits 34 to 70 dB under everything that still plays. Before this fix it was -7 to -10 dB.
- **Nothing else moved:**
  - Nothing clips.
  - Drive off is unchanged.
  - The MP3 and live sound match main.
  - Export time is the same as main.
  - check.sh: CHECK OK.
- **The one miss (hip-hop chords at -29.8 dB):** it does not matter in Ableton. Don't add the 2 dB slew.

The text problem is problem 1. With Drive on, muting "01 Drums" still leaves a dull, crunchy kick on every beat. It is in the Master Drive stem, about as loud as the bass notes. It is not a copy of the drums: it is the Drive's own crunch and squash of the kick, which the design says stays. But try step 4 ("what's left is only the Drive's crunch") and the README line "mute a stem and its part goes" will make the owner expect silence. He will hear a kick and think the old bug is back.

## Problems
1. **(medium, text only) Muting Drums leaves a kick-shaped thump. The try list and README promise a clean mute.**
   Steps:
   1. New song: house drums, a bass and chords. Set DRIVE (K7) to 25%. Export for Ableton (.zip).
   2. In Ableton, load the 4 stems and add a Utility with +2.1 dB. Mute "01 Drums".

   Result: on every kick you still hear a dull, crunchy hit, from "04 Master Drive.wav". This is what is in the Master stem in the 80 ms after each kick (ghostvsbass.mjs, sync.mjs):

   | Band | Level vs the kick | Level vs the bass notes |
   |---|---|---|
   | Sub (30-110 Hz) | -8.8 dB | -0.6 dB |
   | Low-mid (110-400 Hz) | -4.1 dB | +2.9 dB |
   | Highs (2-12 kHz) | +3.1 dB | n/a |

   - 77% of the sub energy is the same on every hit, so the kick makes it. Its pitch is about 60 Hz.
   - Its correlation with the clean kick is only 0.09. So it is the kick's squash and harmonics, not a copy. Fix 1 was a copy: -1.3 dB, correlation 0.86.
   - The house beat has the bass on the off-beat, so this thump fills the gap on the beat. You hear a muffled four-on-the-floor.

   Other songs, sub band vs the kick:
   - house: -11.4 dB (Drive 10%), -7.9 dB (Drive 60%);
   - Drive 30% + Bitcrush 30%: -8.5 dB;
   - Bodzin: -11.6 dB; hip-hop: -10.7 dB;
   - voice note: -9.2 dB; Song mode: -8.8 dB.

   Bitcrush alone leaves nothing (-43 dB).

   **Engine fixes won't cure it.** I tried giving the Drums stem a fast level (11 ms windows; QA prototype /home/claude/qa-se11c/proto/fastdrums.js). The sub thump dropped from -8.8 to -15.7 dB, but:
   - the low-mid stayed at -4.7 dB (those are real harmonics);
   - the bass leak got worse, -21.6 dB.

   At Drive 25% the shaper's small-signal gain is about +14 dB (curveTanh(7.25) × 0.71), so a kick's crunch is genuinely loud. It belongs in the grit stem, and the text should say so.

   **Suggested wording:**
   - *Try step 4 (lead):* "Mute 01 Drums: the clean drums are gone, but the Drive's crunch of the kick stays in 04 Master Drive, a dull hit on each beat. Mute 04 Master Drive too and the drums are gone completely."
   - *Try step 5:* "Solo 04 Master Drive: crunch and fizz, loudest on the kicks, no clean copy of the beat."
   - *README (sound-engine-dev, `exportZip` in src/studio.js):* in the Stems line, after "stays in the Master Drive stem", add: "(with the Drive up, a kick's crunch is strong: you'll still hear a dull hit on each kick until you also mute the Master Drive stem)".

2. **(low) README: a soloed stem rides in level more than "turned up or down" suggests.**
   - Per beat, against the Drive-off stem of the same song (beatdiff.mjs):

     | Song, stem | Level change per beat |
     |---|---|
     | house drums | +0.2 to +0.7 dB |
     | house bass | -0.3 to +1.5 dB |
     | house chords | -4.2 to +2.4 dB |
     | Bodzin chords | -7.5 to +3.0 dB |
     | hip-hop chords | -2.7 to +9.2 dB |

   - This matches the Mix, where the Drive lifts quiet moments and squashes the kick.
   - The beat-level shape stays close to Drive off (pump.mjs, the level across the 4 sixteenth-notes of a beat):

     | Song, stem | Swing across the beat, Drive off | Drive on |
     |---|---|---|
     | house (all stems) | within 1-3 dB of each other | |
     | hip-hop chords | 2.0 dB | 6.0 dB |
     | Bodzin chords | 2.8 dB | 6.2 dB |

   - Suggested wording: "Each stem is clean (no drive); its level rides with the Drive moment to moment, as in the Mix, so a soloed quiet part can rise and fall a few dB."
   - Nit: "On the Ableton master: no limiter or compressor needed. Leave it at 0 dB." "It" has no noun. Suggest "Leave the master at 0 dB."

3. **(low, mine) check.sh took 177 s, close to the 3-minute budget.** It passed. I'll trim it in the next test-upkeep job.

## Judgement: the hip-hop chords miss (-29.8 dB, floor -34.5)
It does not matter in Ableton:
- After muting the chords, what is left of them sits **44.5 dB under** everything still playing (41.8 dB in the worst bar). That is about -47 LUFS against a mix at -5.3 LUFS.
- The leftover sits inside the Master stem, about 35 dB under that stem's own grit (-12.6 LUFS).
- The chords' own crunch, which stays by design, is far louder than this leftover.

A 2 dB slew would make every soloed stem ride faster for an inaudible gain. Keep 1.5 dB.

Several other values also sit a few dB above their floor, all at least 34 dB under the rest:
- house drums: -38.8 (floor -43.6);
- house bass: -33.4 (floor -39);
- hip-hop drums: -34.7 (floor -42).

## What I checked (numbers)
Harness: /home/claude/qa-se11c/. It holds the developer's run.mjs, analyze.mjs, leak.mjs (signed) and leak2.mjs (floor), with paths moved, plus my own scripts:
- leak3.mjs: the fit per bar, plus "audible" (the leftover part vs everything still playing after the mute);
- ghost.mjs, sync.mjs, ghostvsbass.mjs, thump.mjs: the kick-band checks;
- pump.mjs, beatdiff.mjs: how soloed stems move;
- the loop-point jump (in leak3.mjs).

Load was 13-24 during batch 1 (another tester and a developer were running), so those export times are slow and only comparable with each other.

How to read the table:
- **Leak:** a signed least-squares fit of the Master stem onto the stems, giving the level left after muting each stem.
- **Floor:** the same fit against time-shifted stems, i.e. an unrelated signal.
- **Audible:** the leftover part vs everything still playing.
- **Step:** the hook's maximum level change per 23 ms, including across the loop point.
- **Clean sum:** the clean stems without the Master stem, with the README gain. LUFS are as played with that gain.

| Song, setting | README gain | Null vs Mix | Mix LUFS | Clean sum LUFS (peak) | Master stem LUFS | Leak (dB) | Floor | Audible | Step (dB) | Clipped (stems / sum) | Export (s, loaded) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| house, Drive 10% | +3.2 | **-81.6** | -5.36 | -6.02 (+3.1) | -14.1 | -39.3/-36.6/-30.3 | -46.8/-39.9/-27.0 | -34.2/-44.5/-48.6 | 1.03/1.50/1.50 | 0/0 | 185 |
| house, Drive 25% | +2.1 | **-82.5** | -5.49 | -6.75 (+2.6) | -11.6 | -38.8/-33.4/-30.6 | -43.6/-39.0/-24.4 | -34.9/-41.9/-49.2 | 1.19/1.50/1.50 | 0/0 | 194 |
| house, Drive 60% | 0 | **-83.4** | -6.59 | -8.37 (+1.3) | -11.4 | -39.2/-34.0/-35.6 | -41.6/-36.1/-24.3 | -36.0/-42.9/-54.6 | 1.24/1.50/1.50 | 0/0 | 188 |
| house, Bitcrush 30% | +0.3 | **-82.7** | -7.02 | -7.04 (+1.3) | -30.8 | -56.7/-62.6/-53.2 | -58.9/-51.8/-45.2 | -49.8/-70.1/-71.0 | 0.21/1.50/1.50 | 0/0 | 114 |
| house, Drive 30% + Bitcrush 30% | +1.7 | **-82.8** | -5.65 | -7.02 (+1.9) | -11.4 | -39.4/-34.3/-31.6 | -42.8/-37.6/-24.1 | -35.6/-43.0/-50.5 | 1.21/1.50/1.50 | 0/0 | 110 |
| Bodzin, Drive 25% (4 parts) | +1.4 | **-82.0** | -6.38 | -7.53 (+2.2) | -12.3 | -42.5/-36.6/-38.8/-27.0 | -42.5/-31.1/-19.3/-26.4 | -37.0/-48.0/-66.4/-50.3 | 0.83/1.50/1.50/1.50 | 0/0 | 340 |
| hip-hop, Drive 25% | +5.0 | **-79.1** | -5.32 | -6.36 (+6.5) | -12.6 | -34.7/-50.0/-29.8 | -42.0/-44.6/-34.5 | -38.0/-49.5/-44.5 | 1.50/1.50/1.50 | 0/0 | 96 |
| house + voice note, Chords muted, Drive 25% | +2.2 | **-83.4** | -5.45 | -6.73 (+2.9) | -11.5 | -38.5/-33.7/-44.8 | -41.8/-40.7/-31.4 | -34.7/-42.1/-63.4 | 1.25/1.50/1.50 | 0/0 | 172 |
| house, Song mode, Drive 25% | +1.9 | **-82.7** | -5.52 | -6.77 (+2.0) | -11.6 | -38.9/-33.7/-32.1 | -43.6/-38.1/-24.1 | -34.9/-42.3/-50.8 | 1.19/1.50/1.50 | 0/0 | 274 |

**Leak and soloing:**
- My numbers match the developer's within 0.6 dB.
- **No hidden copy.** I re-ran the fit one bar at a time (leak3.mjs). It agrees within about 1-4 dB of the whole-loop fit, and stays at or near the floor. So no copy is hiding by flipping sign between bars.
- **Solo the Master stem:**
  - The part of it that is a plain copy of the stems is 0.0-0.2% (floor 0.1-0.2%).
  - Level: 4-6 LU under the drums (house 25%: -11.6 vs -7.6 LUFS), about 6 LU under the Mix.
  - Bitcrush alone: -30.8 LUFS of bit noise.
  - So it is grit, but the kick's crunch dominates it (problem 1).
- **Mute the Master stem:** the clean stems play 0.0 dB (Bitcrush) to 1.8 LU (Drive 60%) under the Mix.
  - With the README gain they peak up to +3.1 dBFS, or +6.5 on hip-hop.
  - The README says to keep a Limiter, after a Saturator.
- **Loop point:** no click in any stem. The sample jump at the wrap is 0.0-0.99 times the stem's normal 99.9th-percentile step. The level step across the wrap is at most 1.5 dB per 23 ms.
- **Voice note:** the muted Chords stay out of the stems. The voice note is "03 sing.wav" and the Master stem is "04".

**README** (read for house 25%, 60%, Bitcrush, Drive+Bitcrush and hip-hop):
- It names the gain: "Add a Utility with Gain +5 dB (or raise the master fader by 5 dB)". At Drive 60% it says "Leave it at 0 dB.", and drops "after the Utility" from the Limiter sentence.
- It says "turned up or down the way the Drive changed the mix's level".
- It names the stem file exactly: "04 Master Drive.wav", "04 Master Bitcrush.wav", "04 Master Drive and Bitcrush.wav".
- It gives the Limiter advice: "mute that stem and put a Saturator (Redux for Bitcrush; both for both), then a Limiter … (keep the Limiter: the clean stems together can go over 0 dB)".
- The grit is described as "crunch and extra harmonics" for Drive, "bit noise" for Bitcrush, and all three for both.
- It reads clearly for a musician, apart from problems 1 and 2.

**Drive off is unchanged** compared with fix 1 (my last retest):

| Song | Null now (fix 1) | Mix LUFS now (fix 1) |
|---|---|---|
| house | -64.57 (-64.08) | -7.24 (-7.24) |
| hip-hop | -63.47 (-63.74) | -9.17 (-9.17) |
| Bodzin | -64.30 (-64.48) | -7.77 (-7.78) |

- House stems: -8.2 / -14.8 / -22.3 LUFS, the same as fix 1.
- In the code, the Drive-off path only gained an unused `pre` slice.
- Main's own export doesn't null (-9.6 dB, 28,975 clipped samples in the sum), as expected, since SE-11 is the fix for that.

**MP3 and live vs main** (merge base 93981ea; peak / RMS / LUFS):

| Song | What | main | branch |
|---|---|---|---|
| house, Drive 25% | loop render | -0.56 / -5.39 / -5.48 | -0.53 / -5.37 / -5.49 |
| house, Drive 25% | decoded MP3 | 0.00 / -6.69 / -6.43 | 0.00 / -6.65 / -6.43 |
| house, Drive 25% | live, 16 s | -0.36 / -5.44 / -5.55 | -0.38 / -5.42 / -5.54 |
| house, off | loop render | -0.52 / -6.70 / -7.27 | -0.58 / -6.67 / -7.24 |
| house, off | decoded MP3 | -0.63 / -7.99 / -8.20 | -0.33 / -7.93 / -8.15 |
| house, off | live | -0.41 / -6.82 / -7.37 | -0.58 / -6.68 / -7.25 |
| Bodzin, off | loop render | -0.49 / -6.70 / -7.85 | -0.36 / -6.51 / -7.78 |
| Bodzin, off | decoded MP3 | -0.44 / -8.02 / -8.82 | -0.47 / -7.85 / -8.74 |
| Bodzin, off | live | -0.51 / -6.67 / -7.84 | -0.42 / -6.51 / -7.88 |

- Everything is within 0.2 dB RMS and 0.12 LU, the same pattern as the last check. The differences come from the per-track seeded noise.
- MP3 length is exact (341,419 samples) and the size is identical (187,453 bytes).
- There is no silence. The 1 full-scale sample in the decoded Drive MP3 is on both main and the branch (decoder overshoot).
- The live captures in the table were taken one at a time at load 6-7. My first live captures, at load 15, were off by up to 0.7 dB on both builds, so I re-ran them.

**Export time**, house, Drive 25%, quiet machine (load 1-2), alternating runs:
- branch 26.9 s and 27.1 s, against main 26.7 s and 26.1 s: about +0.6 s;
- fix 1 took 28.9-29.3 s;
- Drive off: branch 33.2 s, main 29.6 s, at load about 5.5, single runs.

**check.sh** (load 2, one run, no flake): `CHECK OK`, `SMOKE OK: 83 checks`, 177 s.
- `PASS Ableton zip … residual -64.9 dB … loudest stem -0.37 dBFS`
- `PASS Ableton zip with the master Drive on … residual -84.9 dB (stems +1.5 dB), mix peak -0.53, stems summed -0.53, loudest stem -0.39 dBFS`
- No page errors.

**Repo:**
- The committed index.html is byte-identical to a rebuild.
- main has moved to b59812f (AI-9 and other work in actions/assistant/groove/song/smoke). The branch merges cleanly; index.html needs a rebuild after the merge, and check.sh should be run again.

## Files
- Harness and scripts: /home/claude/qa-se11c/ (run.mjs, one.sh, analyze.mjs, leak2.mjs, leak3.mjs, ghost.mjs, sync.mjs, ghostvsbass.mjs, thump.mjs, pump.mjs, beatdiff.mjs; the prototype is proto/fastdrums.js)
- Exports and numbers: /home/claude/qa-se11c/out/br-<song>-<setting>-zip/, with matching .analysis.json, .leak2.json, .l3all.json and .l3bar.json files. Main exports are /home/claude/qa-se11c/out/base-*. The fast-drums prototype export is /home/claude/qa-se11c/out/fd-br-house-drive_0.25-zip.
- Run summaries: /home/claude/qa-se11c/res_*.txt and mres_*.txt
- MP3 and live raw files: /home/claude/qa-se11c/out/m-*.f32 and /home/claude/qa-se11c/out/lv-*.f32
- check.sh log: /home/claude/qa-se11c/check1.log
- READMEs:
  - /home/claude/qa-se11c/out/br-hiphop-drive_0.25-zip/*/README.txt
  - /home/claude/qa-se11c/out/br-house-drive_0.3_crush_0.3-zip/*/README.txt
  - /home/claude/qa-se11c/out/br-house-drive_0.6-zip/*/README.txt
- Screenshots, all looked at (each shows the knob settings and "Downloaded … .zip"):
  - /home/claude/qa-se11c/out/br-house-drive_0.25-export.png
  - /home/claude/qa-se11c/out/br-house-drive_0.3_crush_0.3-export.png
  - every other run in /home/claude/qa-se11c/out/*-export.png
