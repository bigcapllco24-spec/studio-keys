# SE-3 fix round: report (sound-engine-dev) · 13 Nov 2026

All 5 bugs are fixed and pushed to `preview-se-3`. The last commit is **a5febff**. check.sh: **CHECK OK, smoke 24/24** (23 before plus the new B1 line), no page errors.
`cloudflare/worker.js` did **not** change. Nothing needs a Worker deploy for this round.

Note on the brief vs my role file: the role file says "never push", but the brief says to push to `preview-se-3`. I followed the brief and pushed only that branch. I didn't touch `main`.

## What changed, per bug
1. **B1, swing words swallowed the rest of the request (`src/maker.js`)**
   - `localBrain` is now a small wrapper around the old parser, which I renamed `brainCore`. The early swing return inside it is gone.
   - New `swingOnly(raw, hasDrums)` removes swing words and filler words ("more", "a bit", "the", "make it", and, when there is a beat, "beat"/"hats"/"drums"). Only when nothing is left does the request become one `groove` swing action.
   - Otherwise the full request goes through the parser, and the swing is added next to the result:
     - it goes onto an existing drums `groove` action (congas, clap), or
     - it is carried by `add_drums`, or
     - it becomes its own `groove` action placed before any `transport`.
   - Two missing phrases were needed for the brief's examples:
     - "add some congas" / "add some shakers" now match (they used to need "add congas").
     - "add a clap" / "add a snare" on an existing beat are new: a `groove` with claps/snare.
     - "faster" / "slower" / "speed it up" / "slow it down" are new: ±5 BPM, or ±10 with "a lot", "much" or "way".
   - New smoke line: "add a bassline with some swing" must add a bass track AND swing the drums.
2. **B2, missing phrases (`swingSaid` in `src/maker.js`)**
   - "make it less swingy" and "it swings too much" now mean lighter.
   - "take the swing out", "take out the swing" and "get rid of the swing" now mean straight.
   - "swing 100%" now works (the amount can be 3 digits). It is capped at 70% with "(the most it goes)". If the beat is already at 70%, the reply is "Already at the most it goes: heavy swing, about 70%".
   - "make a deep house beat straight" now means straight ("beat/groove/drums/hats straight", but not "straight to").
3. **B3, words didn't match the amounts (`swingName` and `swingWords` in `src/groove.js`)**
   - The name now comes from the shown percentage:

     | Percent | Name |
     |---|---|
     | 52–53 | a touch of swing |
     | 54–56 | light swing |
     | 57–61 | medium swing (so 59% and 60% are both medium) |
     | 62–64 | strong swing |
     | 65–67 | full triplet swing |
     | 68–70 | heavy swing |

   - Replies use the same name as the beat description. For example, "a bit less swing" from 70% replies "Lighter: full triplet swing, about 66%", and the beat says "full triplet swing (about 66%)".
   - Lighter replies now read "Lighter: medium swing, about 58%" instead of "Lighter swing, about 58%".
4. **Two chips that disagreed (`src/actions.js`)**
   - Fixed in `vary`, with small changes in `groove` and `add_drums`.
   - When the user's words include swing, `vary` on the drums sets the new swing first (`swingOver`) and then makes the new take. It returns one chip, for example: "Lighter: medium swing, about 58%; Drums: …, medium swing (about 58%) …".
   - A following `groove` action that only repeats the same swing in the same request (`BATCH.swingShown`) no longer makes a second chip.
   - This works the same with the offline parser and with the AI sending vary + groove.
5. **No beat yet (`localBrain`)**
   - In an empty song, a swing-only request ("more swing", "less swing", "make it straight") replies: "There's no beat yet. Say 'make a house beat' first."
   - "make a boom bap beat with lots of swing" in an empty song still makes the beat at 66%.

## How I checked
- **Headless Chrome on the built `index.html`, through `handleRequest`** with the offline parser. Each case started from a fresh song (`await newSong()`) with a beat.
- **B1:**

  | Said | Result |
  |---|---|
  | "add a bassline with some swing" | Bassline added + swing 66% |
  | "add chords with a bit of swing" | Chords added + 54% |
  | "add some congas with swing" | congas/rims/cowbell + 66% in one chip |
  | "more swing and add a clap" | clap + 66% |
  | "make it faster and add more swing" | 124 → 129 BPM + 66% |

- **Swing alone still gives one groove change** (boom bap at 66%):

  | Said | Result |
  |---|---|
  | "more swing" | 70% (the most it goes) |
  | "less swing" | 58% |
  | "make it straight", "straight hats", "no swing on the hats", "make the beat straight" | straight; no hats change and no new beat |
  | "swing 58%" | 58% |
  | "swing it harder" | 70% |

  Unchanged: "swing 120 bpm" only sets the tempo, and "go straight to the chorus" leaves the swing alone.
- **B2** (from 66%):

  | Said | Result |
  |---|---|
  | "less swingy", "swings too much" | 58% |
  | "take the swing out", "take out the swing" | straight |
  | "swing 100%" | 70% (the most it goes) |
  | "make a deep house beat straight" | deep house at 0 swing, with or without a beat already there |

- **B3:**
  - From 70%, "a bit less swing" gives 66%. The reply says "Lighter: full triplet swing" and the description says "full triplet swing (about 66%)".
  - Names checked at 0.18/0.19/0.2/0.22: 59–61%, all medium.
- **Chips:**
  - Melodic house, then "more swing", then "another one with less swing": one chip, 58% in both places. The engine is at 0.16.
  - Mocked AI (vary + groove "less") gives the same single chip at 58%.
  - Mocked AI groove `swing:0` for "less swing" gives 58% (user's words still win).
  - Mocked AI add_bass + groove 0.3 for "add a bassline with some swing" gives the bass track plus 66%.
- **B5:** "more swing", "less swing" and "make it straight" in an empty song give the no-beat reply.
- 0 page errors.
- **Sound:** no sound changed in this round (only parsing, names and chips), so I didn't do a new render. The check.sh MP3 render still decodes (727 KB, 31 s).
- **check.sh: CHECK OK.** Build, bundle syntax and Worker syntax pass; smoke 24/24. The SE-3 lines pass: hats 2/4 0.79 vs 1/3 0.70, lag 0.083 beat, ladder 58 → 54 → straight, kick −9.9 ms, AI-on 0.16, and the new B1 line (+1 bass, swing 0.333).

## Commits on preview-se-3 (all pushed)
- 90ff9a8: B1, B2, B5 (`src/maker.js`, `tests/smoke.mjs`)
- 9a89d26: B3 (`src/groove.js`)
- a5febff: chips (`src/actions.js`) and the rebuilt `index.html`

## For the lead / tester
- No new action types. The new phrases ("add a clap", "faster/slower", "add some congas") produce existing `groove` and `tempo` actions.
- The Worker prompt is unchanged. Its swing lines (54/58/66/70%, "lighter swing", "full triplet swing") still match the engine.
- Reply wording changed from "Lighter swing, about 58%" to "Lighter: medium swing, about 58%". The smoke checks match only the percentages.
- Known limits:
  - Swing said next to a part only changes the drums. Sung and generated parts still don't follow the swing (B4, the follow-up item).
  - The "faster/slower" step is a fixed ±5 BPM.
  - The swing-only check works by removing filler words, so an unusual phrasing with an extra word goes through the full parser. The swing is still applied there, but the extra word could also trigger another change.

## Try this (for the owner, on the test link)
On the test link the live AI handles requests, and for these phrases your swing words win over its guess. In Basic mode (AI off, or opened as a file) the offline parser handles all of them directly. No Worker deploy is needed for any step.
1. Say "make a melodic house beat", then "add a bassline with some swing". You get a bassline AND full triplet swing (about 66%). With the AI on, the swing still lands only if the AI sends a swing change, because your words decide how much but not whether.
2. Say "another one with less swing". You get a new take and one note in the chat with one swing amount (about 58%).
3. Say "a bit less swing" a few times, then "swing 100%". The words follow the numbers (medium, light…), and 100% stops at "heavy swing, about 70% (the most it goes)".
4. Start a new song and say "more swing". It tells you there's no beat yet (Basic mode). With the AI on, the reply comes from the AI.
