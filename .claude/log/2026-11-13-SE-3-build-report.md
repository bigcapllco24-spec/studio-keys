# SE-3 build report (sound-engine-dev) · 13 Nov 2026

Branch `preview-se-3`, last commit **114a066** (pushed). `bash .claude/tools/check.sh`: **CHECK OK**: build, bundle syntax and Worker syntax pass, and the smoke test is **22/22** (4 new checks). No page errors.

**`cloudflare/worker.js` changed, so the lead must deploy the Worker on release.** It still contains no backticks and no `${`.

## What changed
- **`src/groove.js`** (my file)
  - `HAT_ACCENTS` (random accents) is gone. In its place is a data-driven `FEELS` table with `straight`, `swing16` and `live`. It holds the RES-3 averages: velocity shapes for closed hats, open hats, shaker and percussion, plus the live kit's push, spread and how much of the spread we keep. To add a measured feel later, you add one entry. `pickFeel(rec)` chooses swing16 when swing is above 0.15, otherwise straight. A recipe can also name a feel directly.
  - `makeGroove` keeps each pattern and multiplies every hat, open hat, shaker and perc hit by the measured shape, so beats 2 and 4 lift and the in-between 16ths sit back. This applies to every style (D2). `feelShape` adds a ±6% random wobble to the shape for each seed, so "another one" still varies. Rows with gaps in the data are pulled towards flat.
  - Styles marked `human` now get the live drummer's timing in place of the old uniform jitter: kick about 9.9 ms early, snare and clap about 3.6 ms early, hats and perc wander more. The wander is scaled down by `keep` (0.15 for kick and snare, 0.3 for hats and perc) so club beats stay tight. Milliseconds are converted to beats at the current tempo.
  - New swing helpers:
    - `SWING_STEPS` [0, 0.08, 0.16, 0.333, 0.4]
    - `swingPct` (MPC-style percent)
    - `swingName`
    - `resolveSwing(value, current)`: takes a number, a percent like "58%", or the words more, less, a bit more, a bit less, none
    - `swingWords` builds the reply, e.g. "Lighter swing, about 58%".
  - The beat description now says "full triplet swing (about 66%)" in place of just "swing".
- **`src/actions.js`** (brief permission, groove action only)
  - New `swingOver()`. `grooveOver(a, curSwing)` now resolves swing relative to the beat's current swing.
  - If the user's own words mention swing (`LAST_TEXT.text` parsed by `swingSaid`), those words win over the AI's number, once per request. This makes "less swing" step down even when the AI sends a guess.
  - Numbers above 1 are read as percent: 50 or more is MPC-style, below 50 keeps the old /100 rule.
  - `add_drums` passes the style's default swing. `groove` returns the swing in musician words.
- **`src/maker.js`** (brief permission)
  - New `swingSaid(text)` reads these phrases:
    - more / add / some / lots of / with swing
    - a bit or a little more
    - less / lighter / too much swing
    - a bit less
    - no swing / no more swing / straight / make it straight / straighten
    - exact amounts: "swing 58%", "58 percent swing", "set swing to 62"
  - With a beat already there, these change its swing. "another one with less swing" gives vary plus groove. "make a boom bap beat with lots of swing" carries the swing into `add_drums`.
  - The old fixed `swing:0.2` and `swing:0` lines are gone.
- **`cloudflare/worker.js`** (brief permission, swing lines only)
  - add_drums: swing range is now "0 (straight) to 0.4, 0.08 light (54%), 0.16 medium (58%), 0.33 full triplet swing (66%)", matching the engine (it said 0 to 0.3 before).
  - groove: new SWING line telling the AI to send the words "more", "a bit more", "less", "a bit less", 0 or "58%", and to describe the change in musician words.
  - One new example: "too much swing, bring it down a bit" → `{"type":"groove","swing":"less"}`.
- **`tests/smoke.mjs`**: 4 new checks in section 8, run in a fresh song: hats lift on 2 and 4; "more swing" = 1/12 beat; "less swing" steps down plus the exact amount and "no swing"; boom bap kick pushes early.
- **`index.html`**: rebuilt with `tools/build.py` (about +0.6 KB).

## Numbers (headless Chrome, offline parser)
- **Hat velocity, beats 2 and 4 vs off-16ths** (new; main in brackets):

  | Style | Beats 2 and 4 | Off-16ths |
  |---|---|---|
  | house 16ths | 0.81 (0.78) | 0.55 (0.46) |
  | melodic house | 0.79 (0.84) | 0.56 (0.38) |
  | techno | 0.94 (0.85) | 0.66 (0.43) |
  | UK garage | 0.88 (0.82) | 0.49 (0.49) |

  Beats 1 and 3 now sit between the two (house 0.69). On main they were as loud as 2 and 4. Boom bap 8ths: 0.91 on beats 2 and 4, 0.64 on 1 and 3.
- **Swing:** "more swing" puts the off-16ths **0.083 beat late (1/12)**, i.e. 66%.
  - "less swing" steps 66% → 58% → 54% → straight.
  - "a bit more swing" from straight gives 54%.
  - "swing 58%" gives exactly 0.16, "62 percent swing" gives 0.24.
  - "more swing" at 66% goes to 70%, the ceiling.
  - Replies are "Full triplet swing, about 66%", "Lighter swing, about 58%", "Straight, no swing".
- **Drummer push** (mean ± spread):

  | Style | Kick | Snare | Hats |
  |---|---|---|---|
  | boom bap | −10.3 ± 2.6 ms | −3.4 ± 2.0 ms | +1.5 ± 7.8 ms |
  | melodic house | −9.6 ± 2.5 ms | −3.2 ± 2.2 ms | ± 7.4 ms |
  | techno (not human) | 0 | 0 | 0 |

- **"Another one":** the smoke check still passes. Boom bap grid overlap between two runs is 0.65 (73 vs 61 hits). Melodic house hit times are fully different between runs: 2% exact-match overlap.
- **Level** (melodic house, drums + bass + chords + melody, 8 s offline render through the master chain):

  | Render | Peak | RMS | Main: peak | Main: RMS |
  |---|---|---|---|---|
  | Full mix | −0.47 dBFS | −6.2 dB | −0.60 | −6.6 |
  | Drums only | −0.67 | −6.6 | −0.69 | −6.6 |
  | Hats only | −0.63 | −18.6 | −1.2 | −19.4 |

  No clipping. Hats are +0.8 dB, which is within matching range.

## Different from the proposal or the brief
- Hat feel uses the measured shape multiplied by each pattern's own base level, not the raw averages. This keeps each hat style's character and loudness, e.g. offbeat hats stay offbeat-loud.
- The live feel is used for timing only, not for velocities: the live kit's velocity curves suit a rock kit, not electronic styles.
- "more swing" goes to 66% when below it; if already at 66% it goes to 70%, the ceiling. "a bit more" / "a bit less" move about 4% (0.08).
- The first kick of the loop can't move earlier than beat 0, so it stays on the grid.

## For the lead
- **Deploy the Worker on release.** The new swing words for the AI only work after that.
- **One line for assistant-dev (optional):** `projectState()` in `src/assistant.js` doesn't send the drums' current swing. So the AI can't say "about 58%" itself. The prompt tells it to say "lighter swing", and the app's chip shows the exact percent. Adding `swing: t.recipe && t.recipe.swing` to the drums track in `projectState` would let the AI say the number. I didn't touch it because it's outside this brief.

## On the test link (live Worker, old prompt)
When the AI is up, the live AI picks the action, but the swing steps still work: the app reads the user's own words and they override the AI's number. These work on the test link:
- "more swing", "add some swing"
- "a bit more swing"
- "less swing", "too much swing"
- "a bit less swing"
- "no swing", "straight"
- "swing 58%", "58 percent swing"

The swing amount shows as a chip under the reply ("Lighter swing, about 58%"), but the spoken reply comes from the old prompt. Hat accents and push need no Worker. If the old AI sends no groove action at all for a phrase, nothing changes until the Worker is deployed.

## Known limits
- Only 15 swung and 12 live grooves are behind the swing16 and live rows, so those curves are noisier. Rows with gaps are trusted less.
- There's no swing slider yet: swing is adjusted by talking.

## Next steps from the data
1. Measure feels per style from the owner's PML and Drum Essentials packs (e.g. a "house" feel and a "breakbeat" feel), and add them as `FEELS` rows picked by style or artist. That's data only, no code.
2. Use the measured kick, snare and clap curves too, as ghost-note weights and fill velocity, and set each style's swing default from his Spotify artists' measured swing (Kaytranada, J Dilla rows).

## Try this (for the owner)
1. Say "make a melodic house beat". Listen to the hats: beats 2 and 4 now lift and the 16ths in between are softer.
2. Say "more swing". It goes to full triplet swing (66%), and the chip says "Full triplet swing, about 66%".
3. Say "less swing" a few times. It steps lighter (58%, then 54%, then straight). Say "swing 58%" to set an exact amount, or "no swing".
4. Say "make a boom bap beat", then "another one". The kick sits slightly ahead like a drummer, and each take is a different groove.
