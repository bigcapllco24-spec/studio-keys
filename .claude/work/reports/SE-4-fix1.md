# SE-4 fix 1 · sound-engine-dev · 22 Nov 2026
Branch `preview-se-4`, head **952403c** (one commit on top of 6dfe2d7, pushed as a fast-forward). main is not merged in.

## What changed
- `src/music.js`
  1. **IV I hold.** I took `'3,3,0,0'` out of `PROG_HOLD`. It is stored as IV IV I I already, so holding it again gave 4 bars per chord. An 8-bar loop now plays `33003300`. The other held progressions are unchanged: i VII iv VI still plays `00663355`. I iii V V (`0,2,4,4`) still holds V for 4 bars, as the pack does and as the tester agreed.
  2. **7th-chord styles follow D2.** This covers hip-hop, lo-fi, deep house, boom bap, amapiano and liquid. About half of each take's chords keep the 7th: plain 7ths, plus about 30% of them with a 9th on top, which was their old colour. The rest are plain triads, or plain add9 about 30% of the time. On a plain chord the 7th in the voicing shape becomes the root an octave up, or the 9th for an add9.
     - The colour is fixed per chord degree, so the same chord has the same colour every time it comes round.
     - The odds lean back towards half and half within a take, so a 4-chord loop almost never comes out all 7ths or all plain.
     - The other styles are untouched. They use the same code path and the same random draws.
- `tests/smoke.mjs`: the existing SE-4 hold check now also checks that IV I in 8 bars plays `33003300`.
- `index.html`: rebuilt with `tools/build.py`.

## Numbers
**Colour split.** 40 random takes per style, 8-bar loops, each distinct chord counted once per take. I classified each chord against its own triad, so a chord with both a 9th and a 7th counts as "7th+9".

| Style | Plain | add9 | 7th | 7th+9 | Plain + add9 | Takes with all 7ths / none |
|---|---|---|---|---|---|---|
| Hip-hop | 35% | 14% | 36% | 15% | 49% | 0 / 0 |
| Lo-fi | 32% | 16% | 31% | 20% | 48% | 0 / 0 |
| Deep house | 34% | 14% | 38% | 14% | 48% | 0 / 0 |
| Boom bap | 41% | 13% | 32% | 14% | 54% | 0 / 1 |
| Amapiano | 35% | 15% | 37% | 13% | 50% | 1 / 0 |
| Liquid | 41% | 9% | 34% | 16% | 50% | 1 / 0 |
| Melodic house (control, unchanged) | 72% | 11% | 17% | 0% | 83% | — |
| Pop (control, unchanged) | 74% | 18% | 8% | 0% | 92% | — |

Before this fix, these 6 styles had 0% plain chords.
- In all styles, no chord changed colour when it came round again (0 changes).
- Spans stay at 15-24 semitones and the lowest note at 48-49, so the voicer floor still holds.

**Levels.** 4 bars, volume 100, same seeds and progression, before (6dfe2d7) → after.
- Chord stems:
  - Hip-hop: RMS -14.8 → -14.7 dB, peak 0.75 → 0.78.
  - Lo-fi: -14.7 → -14.8 dB.
  - Deep house: -14.1 → -14.0 dB.
  - Boom bap: -22.2 → -22.4 dB.
  - Amapiano: -14.7 → -14.5 dB.
  - Liquid: -13.1 → -13.2 dB.
- So levels are matched within 0.2 dB, and the chord stems never clip.
- Full-mix peaks are the same as before. **Lo-fi (1.009 → 1.013) and liquid (1.023 → 1.021) already go past 0 dBFS on 6dfe2d7.** This is the master issue the tester raised for SE-1, and it is not caused by this fix.

**check.sh**
- `SMOKE OK: 84 checks`, `CHECK OK` on the first run. No page errors.
- SE-4 lines:
  - Narrowest chord 19 semitones, lowest note 49.
  - 6 of 6 new progressions came up.
  - Holds: `00663355` (i VII iv VI) and `33003300` (IV I).

## AI-9 merge note
- My code doesn't depend on `melodyNotes()` including generated melodies. The hold logic and the voicer only read `PROJ.prog` and the chord plan.
- With AI-9's `!t.gen`, a generated melody no longer re-picks chords. That only makes a held progression stay put more often.
- `genBass` is untouched on my side, so AI-9's new `bsOver` argument should merge cleanly. The smoke conflict with UX-15 at the end of `tests/smoke.mjs` still applies.

## Updated try list (test link /p/preview-se-4/)
1. Say "make a melodic house track like Ben Böhmer", then "add chords". The pad should sound wide and deep: a low root and fifth underneath, airy notes on top.
2. Say "new chords" two or three times. Each time the progression and the spread of the chord change. Listen for i VII iv VI or VI III VII i.
3. Set the loop to 8 bars and ask for new chords a few times. Some progressions hold each chord for 2 bars, and the pad rings as one long chord.
4. Say "make a pop beat", then "add chords". Then say "make a hip-hop beat", then "add chords". The piano chords sound open, not muddy. Hip-hop now mixes plain chords with jazzy 7th chords, about half each, and a chord keeps its colour every time it comes round. On a melodic house beat, "more swing" and "less swing" still step through 66%, 58%, 54% and straight.

## Known limits
- Colours are random per take. A take can still come out with 3 of 4 chords in one colour, and in rare cases all 4 (about 1 take in 40).
- Lo-fi and liquid full mixes peak just over 0 dBFS. This was there before this fix and needs SE-1 (master headroom).
- One local note: `git pull --rebase` in /home/claude/sk-se4 rebased the local `preview-se-4` onto the new main, because it tracks origin/main. I didn't push that rebase, and I wasn't allowed to hard-reset it. I worked on a local branch `se4-fix1` made from origin/preview-se-4 and pushed that to preview-se-4 as a fast-forward. The local `preview-se-4` in that clone is stale, so use `se4-fix1` or origin.
