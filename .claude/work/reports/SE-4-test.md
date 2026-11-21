# SE-4 branch check (qa-tester, 22 Nov 2026)
Branch `preview-se-4` at 6dfe2d7, my own clone /home/claude/sk-t2. Baseline: main b5e7016's index.html (worktree /home/claude/sk-main). Headless Chrome, offline parser and mocked actions.

## Verdict: NOT READY. Two small fixes, then ready.
The chords sound open, the low end stays clean, the percussion is straight, and the swing ladder works. Two things need fixing first:
- Problem 1 is a bug: the "IV I" progression holds each chord for 4 bars instead of 2.
- Problem 2 doesn't match the approved design: hip-hop and lo-fi still put a 7th on every chord.

Both are about one line each.

## Problems
1. **"IV I" holds each chord for 4 bars, not 2 (medium, bug).**
   - The progression is stored as `[3,3,0,0]`, which is already IV IV I I. It is also in `PROG_HOLD`, so in an 8-bar loop it plays IV for 4 bars and then I for 4 bars (`33330000`). The build report promises 2 bars each.
   - It comes up on about 1 major pick in 9 (35 of 300 picks).
   - Steps:
     1. Make a pop beat. The key is major.
     2. Set the loop to 8 bars.
     3. Ask for new chords until you get IV–I, or set `PROJ.prog=[3,3,0,0]`.
     4. Open the chords in the editor. It shows one chord for bars 1-4 and another for bars 5-8. Screenshot: se4-pop-chords-editor.png.
   - Likely fix (sound-engine-dev, `src/music.js`): take `'3,3,0,0'` out of `PROG_HOLD`. `'0,2,4,4'` (I iii V V → V for 4 bars) is right, since the pack holds both Vs.
2. **Hip-hop, lo-fi, deep house, boom bap, amapiano and liquid still use a 7th on every chord (design, for the lead).**
   - The owner chose D2 = A: "mostly plain chords with add9 or 7ths sometimes". The proposal said colour about 30% of the time "instead of always", and listed `seventh` among the styles it changes.
   - On the branch, the `seventh` family is 0% plain chords: every chord has a 7th, and about 20-24% also get a 9th. That is option B for those 6 styles.
   - The dev says so in the Try list ("hip-hop keeps its 7th chords").
   - Either bring `seventh` down to the colour rate, or put it in the gate-2 "changes vs design" so the owner sees it.
   - Steps: make a hip-hop beat, add chords, and open the editor. Every chord has 4 or 5 different notes, with the 7th.
3. **Try-list step 2 says "another one" (low, wording).**
   - Offline, a bare "another one" said after "add chords" varies the drums, not the chords. This is the same on main (`vary:drums` both times); the parser defaults to drums.
   - The live AI may also choose drums, depending on context.
   - "new chords", "give me new chords", "another chord progression" and "different chords" all go to the chords and change both the progression and the voicing.
   - Suggest the owner's step 2 reads: Say "new chords" two or three times.

Not caused by SE-4, for the lead:
- The rock and lo-fi full mixes go past 0 dBFS, the same on main and on the branch:
  - Rock: peak 1.019, 5 samples at 0.999 or above.
  - Lo-fi: peak 1.009 on the branch (1.025 on main), 2 samples.
  - The WAV and MP3 exports clamp them. This belongs to SE-1 (mix).
- `vary` writes the chord numerals in lower case ("i–vii–iv–vi"), as the dev already noted.
- Merging: SE-4 and UX-15 both add their smoke lines at the end of `tests/smoke.mjs`, so the second merge conflicts there. Keep both blocks and rebuild `index.html`.

## What I checked (numbers)
**check.sh**
- Run 1: FAIL. "test run · Runtime.callFunctionOn timed out", 1 of 57, after 5 m 31 s. Load average was 15.7 on 2 cores, with the other tester's Chrome running.
- Rerun: `SMOKE OK: 84 checks`, `CHECK OK`, no page errors. The 3 SE-4 lines pass: narrowest chord 19 semitones, lowest note 49, 6 of 6 new progressions, hold `00663355`.
- "sung chords" passes (5 chords, shortest 1 beat).

**Chord spans, 3 takes of every style (26 styles, 8-bar loops)**

| Style family | Span (semitones) | Lowest note |
|---|---|---|
| Pads, sustain, stabs, pulse8, plucks332, seventh | 15-24 | 48-53 (C3-F3) |
| Rock (power chords, unchanged) | 12 | 40 |
| Arp (afro, bhangra, punjabi) | — | 48-53, highest 76-83 |

- Main was 7-10 semitones (melodic house 10-22), with the lowest note at 55-57.
- Never below C3, so the voicer floor holds.
- The bass tops out at 41-53, so the chord root can double a bass octave note in house styles (48-53). It doesn't clash: low-mid energy went down, see the render table.

**Colour notes (random seeds, about 90 distinct chords per style)**

| Style | Plain | add9 | 7th |
|---|---|---|---|
| Melodic house | 62% | 19% | 20% |
| House | 65% | 20% | 15% |
| Pop | 73% | 14% | 13% |
| Trap | 77% | 13% | 10% |
| Progressive | 79% | 13% | 8% |
| Hip-hop | 0% | 23% | 77% |
| Lo-fi | 0% | 30% | 70% |

- Main: melodic house had 0% plain (every chord had a 7th or 9th). House and pop were 100% plain triads.
- The median span is 19 (pack target 16, range 14-40).
- Side note: consecutive seeds (500, 501, …) give correlated colours, only about 4% add9. The app uses random seeds, so users won't see this.

**Progressions and holds**
- Over 300 picks, all 14 minor and all 9 major progressions come up, each 17-39 times.
- i VII iv VI: `0635` in 4 bars, `00663355` in 8 bars, and the same doubled in 16. An old progression in 8 bars stays one chord per bar (`05260526`). `PROJ.progHold=false` turns the hold off.
- The bass plays the chord root on 100% of its notes in all 8 bars.
- A held pad is one long chord: attacks at beats 0/8/16/24, each 7.95 beats long. Adding a melody keeps the plan `00663355`.

**"Another one" and new chords**
- `vary chords`, 10 times in a row: the progression changed 10/10 and the voicing 10/10.
- `vary progression:false` (voicing only): 25/25 changed in house, pop, trap, melodic house and progressive; 23/25 in hip-hop and lo-fi. On main it was 0/25.

**Renders, 4 bars, volume 100, same seeds and progression, main → branch (dB)**

| Style | Chords stem < 120 Hz | Chords stem 120-500 Hz | Full mix 120-500 Hz | Mix < 120 Hz | Mix peak |
|---|---|---|---|---|---|
| Pop | -47.9 → -35.9 | -19.0 → -18.6 | -16.4 → -16.3 | -10.2 | 0.993 → 0.997 |
| Hip-hop | -42.9 → -36.2 | -15.3 → -17.0 | -15.1 → -15.7 | -11.6 → -11.5 | 1.014 → 0.995 |
| Lo-fi | -43.1 → -37.5 | -15.6 → -16.3 | -17.3 → -17.5 | — | 1.025 → 1.009 |
| House | -49 → -39.7 | -21.0 → -22.9 | -19.4 → -19.8 | -7.3 | 0.975 → 0.979 |
| Melodic house | -49.6 → -47.3 | -24.9 → -26.6 | -21.1 → -20.6 | -6.5 → -7.0 | 0.987 → 0.975 |
| Rock | unchanged | unchanged | unchanged | — | 1.02 |

- The chords stem gains energy under 120 Hz, but it stays 22-40 dB under the mix's low band.
- Chord stems: no clipping, no silent blocks.
- The bass stems are unchanged.

**Percussion (main → branch)**
- Melodic house:
  - Swing 0.04 → 0.
  - Kick timing spread 3.21 → 0 ms. Hat spread 8.74 → 5.13 ms.
  - The shaker plays all 16 steps. Its velocities run downbeat 0.55, 8ths 0.52, off-16ths 0.35; on main the off-16ths were the loudest (0.35 / 0.30 / 0.51).
- Organic house:
  - Swing 0.07 → 0. Kick spread 3.12 → 0 ms; hat spread 9.0 → 5.0 ms.
  - The shaker went from 8 steps to 16. Velocities 0.48 / 0.47 / 0.30.
- Deep house (swing 0.08) and afro are unchanged.
- The swing ladder on melodic house reads 50 → "more swing" 66 → 58 → 54 → straight (50) → "Already straight". Above 58% the feel switches to the swung feel, below it uses the AMH feel. Replies are correct.
- "Another one" on the drums gives a new groove and stays straight.

**Other**
- Sung chords: `voice()` is unchanged (A minor → 57, 60, 64) and `studio.js` is untouched.
- Page errors: 0. The only console error is a blocked font request.

## Screenshots
- /home/claude/qa-t2/shots/se4-mh-chords-editor.png: Ben Böhmer pad, open voicing from C3 to C5.
- /home/claude/qa-t2/shots/se4-pop-chords-editor.png: pop IV–I, 4 bars per chord (problem 1).
- /home/claude/qa-t2/shots/se4-pop-tracks.png

Probe scripts and raw numbers:
- Scripts: /home/claude/qa-t2/se4probe.mjs, /home/claude/qa-t2/se4colour.mjs
- Results: /home/claude/qa-t2/se4-branch.json, /home/claude/qa-t2/se4-main.json, /home/claude/qa-t2/colour-*.json
