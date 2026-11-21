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
