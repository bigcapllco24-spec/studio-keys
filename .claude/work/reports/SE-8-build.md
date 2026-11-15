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

## Fix 1 (15 Nov 2026, after the tester's NOT READY)
Branch `preview-se-8`, pushed (commits 4391524, the ride fix, and this report). `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK 49 checks**, including the tester's new line. One earlier run, at load 12, failed the 2 known save/reopen timing checks; a rerun at load 0.4 passed.

**1. Hats you name now stay as asked (MEDIUM, fixed).**
- `src/actions.js`. The lead allowed these small edits:
  - A new helper, `hatsSaid()`. It checks whether the request mentions hats: hat, 16ths, 8ths, off-beat, shuffle, quarter, rolls, 8/8.
  - In `grooveOver`, when a request sets the hats and the user said hat words, it sets `hatsAsked: true`. This covers `add_drums` and `groove`.
  - `ACT.hats` always sets `hatsAsked: true`, both when it changes the hats and when it falls back to `add_drums`.
- The flag lives in the drums recipe. So "another one" keeps it, and new grooves still vary everything except the hats.
- If the AI picks hats on its own (for an artist the app doesn't know, with no hat words from the user), the hats still vary. With no text at all (tests, `runActions`), hats count as asked.
- I found a second cause: the ride drew from the hats' random stream. A hats change still moved every ride hit a little, which the tester's line caught once hats really changed. Fix in `src/groove.js`: the ride has its own streams (`RR.ride`, `TT.ride`) and keeps the hats' feel. After "change the hats to 16ths", everything except the hats is now event-for-event identical.
- Test, typed through `handleRequest` (minimum hat steps over the loop's bars):

| Request | Before the fix | After "change the hats to 16ths" | Then "another one" ×6 |
|---|---|---|---|
| Bodzin | 12 | 16 | all 16 |
| techno | 8 | 16 | all 16 |
| Böhmer | 13 | 16 | all 16 |

  - "124 bpm drums with 16th hats like Stephan Bodzin": 16 on the first try, and 16 on all 6 "another one" tries.
  - Bodzin with no hat words still varies: 8-16.
  - The owner's sentence ("124 bpm drums with hi-hats and claps like Ben Böhmer") still varies: 8-15, `hatsAsked` false.

**2. Whole-song MP3 at -1 dBFS (LOW, fixed).**
- `src/studio.js` `makeSongMp3`, one line (the lead allowed it): the encoded peak is now -1 dBFS (0.89), not -0.5 (0.94).
- Decoded peaks, Short layout, drums:

| Run | Decoded peak (dBFS) | Clipped samples |
|---|---|---|
| 18 house seeds (10 fixed, 8 random) | -0.66 to -1.15 | 0 |
| 3 melodic techno / techno seeds | -0.91 to -1.11 | 0 |
| Smoke runs | -0.56 and -1.07 | 0 |

  - All are below -0.3. The worst decoder overshoot was +0.45 dB.
  - RMS is about 0.3-0.5 dB lower than before: -6.4 to -7.4 dB.
- Not changed: the loop MP3 (`makeMp3`, still 0.97). Its smoke check doesn't test the peak. If the lead wants the same margin, it is the same one-line change.

**3. No stacked kicks or hats (rough edge, fixed).** `src/groove.js`:
- Pickups, ghost kicks and double kicks are added only where the kick pattern has no kick, and never inside a kick-drop fill.
- The random stream stays in step whether a hit is skipped or not, so grooves with no clash are unchanged.
- The reply says "ghost kicks", "kick pickups" or "a double kick" only when at least one is actually heard. Otherwise it says plain.
- After building, one hit is kept per drum per moment (within 0.02 beat, the louder one). This removes a fill's hat roll stacking on the 8th hats in pop, rock and synthwave, trap rolls over a hat, and ghost snares under a snare roll.
- Sweep: 28 styles × 4 and 8 bars × 25 seeds. 0 duplicate hits (same drum, same time) and 0 kick ideas named but not heard. Before, there were 1-30 doubled kicks per style and up to 198 doubled hats.

**Sound (offline `renderAudio`, drums alone, 4 bars, 4 seeds each; peak / RMS dBFS)**

| Request | Peak | RMS |
|---|---|---|
| Böhmer | -0.53 to -0.64 | -6.6 to -6.9 |
| Bodzin | -0.68 to -0.75 | -5.8 to -6.0 |
| house | -0.69 to -0.81 | -6.3 to -6.6 |
| pop | -0.56 to -0.65 | -8.6 to -9.4 |
| dnb | -0.62 to -0.74 | -11.6 to -12.1 |

- No clipping. Böhmer, Bodzin and house are within 0.2 dB of the first build.

**Other smoke numbers**
- "Another one" ×10 worst pairs: Böhmer 0.67-0.72, Bodzin 0.70-0.76, house 0.58-0.65. All are below 0.9.
- SE-3 feel checks pass.

**Files**
- `src/actions.js` (assistant-dev's file): `hatsSaid`, the `grooveOver` hats branch, and the 2 `ACT.hats` lines.
- `src/groove.js`: the ride streams, kick extras through `kx`, the same-drum dedupe, the honest kick wording.
- `src/studio.js` (studio-ux-dev's file): 1 line, the `makeSongMp3` peak target.
- `index.html`: rebuilt.
- No Worker or `maker.js` changes, and no new actions.

## Fix 2 · 15 Nov 2026 · sound-engine-dev

Branch `preview-se-8`, code commit 94bd1e4 (on top of the tester's 5d00345). Both items from `SE-8-retest.md` are fixed, plus the optional loop MP3 line.

**1. Hats you asked for stay when the AI answers "another one" with `add_drums` (MEDIUM, fixed).** `src/actions.js`, `ACT.add_drums`, 2 lines before the recipe:
- If the drums track already has `recipe.hatsAsked`, and this request keeps the same vibe (same style, and no other artist named), the new groove keeps those hats with `hatsAsked: true`.
- That happens when `a.hats` is missing, equals the asked hats, or the user's words have no hat words (so an AI that copies the first request's `hats` into "another one" can't undo "change the hats to 8ths"). This goes one step past the brief's rule; hat words in the request still win.
- A new artist or a new style unlocks them, as before.

**2. Hat words need word boundaries (LOW, fixed).** `hatsSaid()` now uses `\bhats?\b|\bhi-?hats?\b|\bhihats?\b|\b16(th|ths|s)?\b|sixteenth|\b8(th|ths|s)\b|eighth|…`. So "that", "what", "chat" and tempos from 160 to 169 no longer count as hat words.

**3. Loop MP3 at -1 dBFS (optional, done).** `src/studio.js` `makeMp3`, 1 line: the peak target is 0.89, as in the song MP3 (was 0.97).

**Tests (AI stubbed at `/api/assistant`, as the tester did; hat steps = the minimum over the bars)**

| Case | Before | After |
|---|---|---|
| Gapped Bodzin, then hats 16th, then "another one" as `add_drums` ref Bodzin + hats 16th, ×4 (2 runs) | 16, 8, 14, 13 · 16, 8, 12, 12; `hatsAsked` false | 16 ×8; `hatsAsked` true; rest of the groove new 8 of 8 times |
| Same, `add_drums` ref Bodzin with no hats | 12, 12, 16, 12 · 16, 12, 12, 12 | 16 ×8 |
| Same, plain `add_drums` | 12, 12, 8, 12 · 16, 8, 12, 12 | 16 ×8 |
| Asked 8ths, then "another one" as `add_drums` ref Bodzin (style hats 16th) | 13, 16, 12, 8 | 9 ×4 (8ths plus an open hat), `hatsAsked` true |
| New reference after 16ths: `add_drums` ref Ben Böhmer, then `vary` ×6 | 8, 8, 8, 8, 16, 13 | 12, 8, 13, 16, 12, 8; unlocked |
| New style after 16ths: `add_drums` style techno, then `vary` ×6 | unlocked | unlocked: 16, 16, 13, 16, 16, 12 |
| "make me drums like that" (AI hats 16th), `vary` ×6 | locked, 16 ×6 | not locked: 12, 13, 16, 12, 12, 8 |
| "what about some techno drums" (AI hats 16th) | locked, 16 ×6 | not locked: 13, 16, 12, 13, 8, 16 |
| "160 bpm drum and bass" (AI hats 8th) | locked, 9 ×6 | not locked: 11, 10, 11, 9, 10, 9 |
| "chat, give me drums like Stephan Bodzin" | locked | not locked |
| Hats named: "…with 16th hats", "hi-hats on 16ths…", "hihats on sixteenths", "16s on the hat" | locked 16 | still locked, 16 ×6 each |

- Always 1 drums track. No page errors.

**Loop MP3 (`makeMp3`, 4 loops, full mix of drums, bass, chords and melody, decoded back in Chrome; peak / RMS dBFS)**

| Mix | Before | After | Clipped |
|---|---|---|---|
| Bodzin | -0.39 / -7.2 | -1.08 / -7.6 | 0 |
| Böhmer | -0.29 / -7.0 | -0.80 / -7.5 | 0 |
| house | -0.42 / -7.1 | -0.87 / -7.7 | 0 |
| dnb | -0.14 / -9.6 | -0.68 / -10.2 | 0 |

- About 0.5 dB quieter, and now under -0.3 dBFS every time.

**check.sh:** 3 runs at load 6-12.
- Runs 1 and 3: CHECK OK, SMOKE OK 50.
- Run 2: 2 FAILs, "opening the app starts a new empty song" and "Undo right after opening a song". Both are the known load-sensitive save/reopen checks: the reload reopened the song from the step before, because the save hadn't landed yet. They passed in runs 1 and 3. This fix touches neither.
- Whole-song MP3 smoke peaks: -0.76 and -1.03 dBFS.

**Files**
- `src/actions.js` (assistant-dev's file, the lead's permission for this item): `hatsSaid` (1 line), plus 2 lines and a comment at the top of `ACT.add_drums`.
- `src/studio.js` (studio-ux-dev's file): 1 line in `makeMp3`.
- `index.html`: rebuilt.
- No Worker, `maker.js` or `tests/` changes, and no new actions.

**For the tester:** add an AI-path smoke line. Stub `/api/assistant`, ask for 16ths on a gapped Bodzin groove, answer "another one" ×3 with `add_drums` ref Bodzin + hats 16th, and expect 16 of 16 each time.

**Known limits**
- If the AI picks hats on its own that differ from the style's hats, they still stay the same on every "another one". Example: `add_drums` ref Ben Böhmer with hats 16th, with no hat words in the request. This comes from `groove.js`'s "differs from the style" rule and is older than SE-8. The rest of the groove still changes.
- "remove/mute/no hats" in `maker.js` is still for assistant-dev, as the brief says.
