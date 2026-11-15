# SE-8 build report · "another one" never repeats a groove · sound-engine-dev · 15 Nov 2026

Branch `preview-se-8` (from `main` @ 043b319), pushed. `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK 48 checks** (47 old + 1 new), no page errors.

## Cause
1. **Too few choices per style.** In `makeGroove`, a four-to-the-floor style's kick, clap, closed hats, open hats (always 2/6/10/14), shaker and ride were fixed. Only the percussion pair (2-3 stock motifs per voice) and the fill rotated, and a few velocities moved.
2. **Short loops lost the rest.** A new song is 4 bars. The A/B phrase needs 8 bars and the fill came every 8 bars, so a 4-bar loop had no B bars and no fill. That left about 10-20 possible grooves, so repeats came within 5-8 tries.
3. **No memory.** Nothing remembered which grooves the song had already had.
4. **Smaller:** shuffles used `sort(() => random - 0.5)`, which is implementation-defined. Everything came from one random stream, so changing one setting (the hats) reshuffled the whole groove.

## What changed
- **`src/groove.js`** (`makeGroove` rewritten, new `freshGroove`, plus helpers: `mix32`, `subRng`, `pickR`, `shuf`, `wpick`, `HAT_MASKS`, `genMotif`, `mutMotif`, `grooveFP`, `grooveSim`). SE-3's measured feel is unchanged: velocity curves, drummer push, swing ladder.
  - **Its own random stream per part.** The kick, backbeat, hats, percussion, fills, timing and every style choice each draw from their own stream, hashed from the seed. "Change the hats", "more swing" and "more energy" (same seed) now keep the kick, clap and percussion exactly. Tested: kick/clap/perc identical after a hats change, seed kept, and the swing change keeps the 16th grid.
  - **Groove memory per song: `PROJ.grooveHist`.** It holds the last 24 fingerprints (which drum on which 16th, first 8 bars) and is saved with the song. A fresh groove (new seed) is compared with all of them. While it is more than 0.80 alike (Jaccard), it is redrawn, up to 30 times, and the least-alike draw wins. Same-seed edits are never redrawn, but they are remembered too.
  - It is per song rather than per drums track, so replacing the drums ("drums like Bodzin" again) still avoids what you already heard. Candidates are checked on 8 bars only, so this stays cheap on long loops. Tested: the first 8 bars are identical at 8 and 64 bars in 1092/1092 cases. A groove takes about 1.4 ms to make.
- **`src/actions.js`** (assistant-dev's file, 3 one-line edits, nothing else). `regenTrack` and `add_drums` call `freshGroove(rec, L_(), seed, keep)` instead of `makeGroove`, and store `g.seed`, the seed it settled on.
  - `keep = !!opts.seed` in `regenTrack` and `!!+a.seed` in `add_drums`.
  - Should merge easily with AI-1's `vary` change, because `vary` itself is untouched.
- **`tests/smoke.mjs`** (allowed by the brief). New line at the end: 10 tries each for Ben Böhmer, Stephan Bodzin and house in one song, every pair < 0.9 alike, still one drums track.
- **`index.html`** rebuilt (+0.9 KB of code, no new samples).

## What now varies, per style (all generic patterns, made from the seed; nothing copied)
- **Kick, four-to-the-floor styles.** The four always stays; only one or two soft extras are added.
  - Plain, kick pickups (14/15/7/11 on B or odd bars), ghost kicks (3, 11, 13, 3+11, 7+15, 10, about 0.3 velocity), a double kick every other bar (energy 3+), or a dropout on beat 4 every 4th bar.
  - Techno-type styles favour ghost kicks. Melodic, deep and organic house favour dropouts.
- **Kick, other styles.** Pop, boom bap, half-time, dnb and garage get pickups or ghost kicks sometimes, plus a second pattern from the family in the B bars. Trap and drill keep their patterns.
- **Clap/snare/rim.** The backbeat stays on 2 and 4. Extras: a late one (a 16th after) every other bar, a pickup into each 4 bars, or a double every other bar. Ghost snares are a seeded subset of 9 positions, sized by the style's ghost amount, with one more in the B bars.
- **Closed hats.**
  - 16th styles (Bodzin, techno): all 16ths, off the beat (e-and-a), galloping (and-a), 8ths with 16th pickups (rarer at energy 4+), or with gaps.
  - Shuffled styles (Böhmer, melodic house): the same shapes plus e-and.
  - B bars can open up to full 16ths.
  - Off-beat house hats: the off-beats stay; the ghosts are all odd 16ths, the "a", the "e", 7/15, a seeded subset, or none.
  - 8th styles: 16th pickups.
  - Accent shapes: as measured, off-beat lift, or drive.
  - Hats the user named ("16th hats") stay exactly as asked.
- **Open hats.** Off-beats, the and of 2 and 4, end of bar, 2+10, 10+14; every bar, every other bar, or B bars only.
- **Shaker** (if the style has one): 16ths, off-beats, in-between 16ths, off the beat, or 8ths.
- **Ride** (if the style has one): off-beats, 8ths, plus pickups; always (energy 4+) or B bars.
- **Percussion.** Voices are still taken from the style's set (`PERC_SETS`). Each voice's motif is a stock one (40%) or made up for this groove (2-5 hits, mostly between beats). The B bars answer with 1-2 hits moved, or a new motif. Entry: every bar, every other bar, the second half, or B bars only.
- **A/B in short loops.** None, every other bar, or the 4th bar.
- **Fills.** Snare roll (1 or 2 beats), snare build, tom fill, kick drop, open-hat lift, clap build, conga roll, kick roll (techno-type), hat roll (non-four). A 4-bar loop gets a turnaround at its end 55% of the time; before, it never had one.
- **Description.** Now says what is special, e.g. "four-to-the-floor kick with ghost kicks, clap on 2 and 4, a double clap every other bar, 16th hats with gaps, open hats between the beats, ride, rims, a kick drop at the end of the loop". A fill that never plays in the loop is no longer mentioned ("every 8 bars" in a 4-bar loop).

## Similarity numbers (QA's metric: Jaccard of drum@16th; new song, the reference, then "another one")

| Request | Before: worst pair in 10 tries | After: worst pair in 10 tries (3 runs) | After: average pair | After: worst pair without hats | Different replies (of 10) |
|---|---|---|---|---|---|
| drums like Ben Böhmer | **1.00** (×2 runs; mean 0.85-0.86) | 0.68 / 0.68 / 0.69 | 0.44-0.49 | 0.51-0.54 | 7-9 → **10** |
| 124 bpm drums like Stephan Bodzin | **1.00** (×2; mean 0.81-0.85) | 0.72 / 0.74 / 0.69 | 0.52-0.56 | 0.68-0.69 | 7-8 → **10** |
| house drums | **0.96 / 1.00** (mean 0.69) | 0.54 / 0.64 / 0.61 | 0.39-0.41 | 0.52-0.69 | 6-9 → **10** |

Before, the "without hats" worst pair was 0.92-1.00. In the smoke run the worst pairs were 0.61, 0.76 and 0.65.

**Every style, 25 tries.** I ran all 28 styles in `GROOVES` at 4 and 8 bars, 25 tries each.
- All stayed below 0.9. The highest were dubstep 0.87-0.88, trap 0.84-0.86 and synthwave 0.85. Those are sparse styles, so the memory does more of the work there.
- No bad events (time, velocity range) and no page errors.

## Sound check (offline `renderAudio`, drums alone, 4 bars, 5 tries each; peak / RMS dBFS)

| Request | Before (main) | After |
|---|---|---|
| Böhmer | -0.50 to -0.73 / -6.6 to -6.8 | -0.53 to -0.71 / -6.5 to -6.7 |
| Bodzin | -0.63 to -0.76 / -5.9 to -6.0 | -0.58 to -0.73 / -5.8 to -5.9 |
| house | -0.76 to -0.84 / -6.3 to -6.5 | -0.57 to -0.71 / -6.1 to -6.3 |

- Nothing clips, and the levels are within about 0.2 dB of before.
- The smoke test's whole-song MP3 (Short layout, drums): peak -0.47 dBFS, RMS -6.7 dB.
- The number of hits now varies more from try to try (Böhmer 105-188, Bodzin 89-149, house 63-102), but loudness stays the same.

## check.sh
- **Run 1 (load about 9):** 2 FAIL, "opening the app starts a new empty song…" and "Undo right after opening a song…". The rename's autosave hadn't reached IndexedDB within the test's 600 ms wait, so the previous song reopened. Neither touches grooves.
- **Run 2 (load about 2.4):** `CHECK OK`, `SMOKE OK: 48 checks`, including `PASS "another one" ×10 never repeats a groove (Böhmer, Bodzin, house: every pair < 0.9 alike) · Ben Böhmer 0.61 · Stephan Bodzin 0.76 · house 0.65`.
- All SE-3 feel checks pass: hats lift on 2 and 4, "more swing" = 0.083 beat, the less-swing ladder, kick push.

## For the lead / others
- **assistant-dev:** the 3-line `actions.js` change is listed above. Nothing new for the Worker prompt or `maker.js`, and no new actions.
- **Replies are longer.** A drums reply now names the variation, about 150-230 characters against about 140 before. If spoken replies feel long, assistant-dev could speak only the first 3 parts.
- **Undo** restores the earlier groove's notes. `PROJ.grooveHist` is part of the song state, so Undo also forgets the newest fingerprint. That's harmless: worst case, a groove you undid can come back once.
- **Known limit:** the memory covers the last 24 grooves of a song. Sparse styles (dubstep, trap, synthwave) sit closer to the 0.8 redraw line.
- **Tester ideas:** on the test link, "drums like Ben Böhmer" then "another one" ×10 should give 10 different replies and audibly different hats, shaker, kick and perc. "Change the hats to 16ths" should keep the kick and percussion.
