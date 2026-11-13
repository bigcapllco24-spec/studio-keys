# SE-3 Real drummer feel · branch check (qa-tester) · 13 Nov 2026

## Verdict: READY for the owner to try
The drum feel, swing ladder, chips and levels all work. There is one regression in the offline parser (B1, medium). It is only hit when the AI is down or in Basic mode, so it won't show on the test link. Fix it before release; it's a small change in `src/maker.js`. B4 is an older timing gap that full swing makes easier to hear: a follow-up, not a blocker.

Branch preview-se-3 @ 114a066, plus my test commit cc09ff3 (tests/smoke.mjs only, not pushed).

## Bugs
**B1 (medium, regression, src/maker.js, assistant-dev): with a beat present, swing words swallow the rest of the request in the offline parser.**
Steps: Basic mode (file://, or the AI fails) → "make a house beat" → "add a bassline with some swing".
Expected: a bassline is added (plus more swing).
Actual: only the drums' swing changes (chip "Full triplet swing, about 66%"). No bassline.
The same happens with "add chords with a bit of swing", "add some congas with swing", "more swing and add a clap" and "make it faster and add more swing": only the swing changes, and the chords, congas, clap or tempo are dropped. On main, "add a bassline with some swing" adds the bassline, because main only took over "more/add swing".
Cause: in `localBrain`, the new early return `if(sws!=null&&hasDrums&&!/another|.../) return {groove…}` runs before the add-part parsing. It should only return early when swing is the whole request; otherwise it should add the groove action next to the others.

**B2 (low, src/maker.js): some swing phrases aren't understood.**
- "make it less swingy", "it swings too much", "can you take the swing out" and "swing 100%" → "I couldn't turn that into a change".
- "make a deep house beat straight" keeps deep house's 54%.
- Expected: lighter, lighter, straight, 70%, straight.

**B3 (low, cosmetic, src/groove.js swingName/swingWords): the words don't line up.**
- 0.18 is "medium swing (about 59%)", but 0.2 is "strong swing (about 60%)": a 1% step changes the word.
- "a bit less swing" from 70% replies "Lighter swing, about 66%", and the beat description then says "full triplet swing".

**B4 (medium, follow-up, pre-existing; src/studio.js TAKE.finish (studio-ux-dev) and genBass/genChords in src/music.js): sung and generated parts don't follow the drums' swing.**
Steps: "make a boom bap beat" → "more swing" (66%, 88 BPM) → "let me sing the bassline" (fake mic).
Expected: sung notes on off-16ths line up with the swung kick and hats.
Actual: notes snap to the straight 16th grid (q=0.25), so they land 47-51 ms ahead of the swung kick. On straight or light-swing beats it's fine: on melodic house the kick is 10.3 ms ahead of the sung note (drummer push).
This was already true on main, but main's maximum was 60% swing (about 34 ms gap); 66% makes it more audible.

**Note (pre-existing, also on main): "another one" on house and techno sometimes repeats the same hit positions.** Out of 21 takes, the branch gave 16 different patterns on house and 18 on techno (main: 17 and 19); the repeats differ only in velocity. One back-to-back repeat happened on house. Melodic house, UK garage, boom bap and lo-fi gave 21 of 21. In my 5-in-a-row run, the 5th house take matched an earlier one. This isn't caused by SE-3.

## What I checked
**1. check.sh: CHECK OK, 23/23** (22 from the developer plus 1 I added), about 70 s, no page errors, index.html not stale.
- Review of the developer's 4 checks, run against main's build:
  - "more swing", "less swing" and "kick push" fail on main, so they're sound.
  - "hats lift on 2 and 4 vs off-16ths" passed on main (0.77 vs 0.47), because main's accents treat every quarter the same.
- Added "hats: beats 2 and 4 louder than beats 1 and 3 (measured feel)": the average of 5 house 16th grooves must be ×1.06 or more.
  - Over 400 seeds: branch 1.04-1.27 per groove (median 1.15), main 0.97-1.03.
  - Results: main ×0.99 FAIL, branch ×1.17 PASS.

**2. Producer use (offline brain through handleRequest, chips read from the chat):**
- **Styles:**

  | Style | Swing | Chip |
  |---|---|---|
  | house | 0 | |
  | melodic house | 0.04 | no swing word |
  | techno | 0 | |
  | UK garage | 0.18 | "medium swing (about 59%)" |
  | boom bap | 0.18 | "medium swing (about 59%)" |
  | lo-fi | 0.2 | "strong swing (about 60%)" |

- **Swing ladder:**
  - "more swing": 66%, "Full triplet swing, about 66%". Off-16ths sit 0.083 beat late.
  - "less swing" ×4: 58%, then 54%, then "Straight, no swing", then "Already straight, no swing".
  - "a bit more swing": 54%. "swing 58%": 58%. "no swing": straight.
  - "more swing" ×2: 66%, then "Heavy swing, about 70% (the most it goes)".
  - Other phrasings that work: "too much swing", "lots of swing", "make it swing", "make it straight", "a little less swing", "58 percent swing", "set swing to 62", "swing 54", "add some shuffle", "less shuffle".
- **"another one" ×5:** every take was a new groove and the swing was kept, but the 5th matched an earlier take's hit positions (see the note).
- **"another one with less swing":** a new groove plus 58%.
- **Undo** after "more swing" restores 58%. **Save and reopen** keeps 62%.
- **First requests:** "make a boom bap beat with lots of swing" gives 66%. "make a lofi beat, swing 58%" gives 58%. "make a techno beat with no swing" gives straight.
- **Levels:** offline render through the master chain, 2-bar loops, average of 2 grooves per style.
  - Drums peak is -0.58 to -0.84 dBFS on the branch (main -0.58 to -0.79), with 0 clipped samples and no silent gaps.
  - Hats RMS is within 0.3 dB of main and hat high end within 1.5 dB.
  - Hats vs kick is within 0.5 dB of main, except lo-fi at +1.2 dB. Not buried, not harsher.
  - Full melodic house mix: peak -0.50, RMS -6.3 (main -0.64 / -6.8).
  - Techno at 66% swing with bass and chords: -0.64 / -6.2.
- **Hat profile** (beats 2 and 4 / 1 and 3 / off-16ths; main in brackets):

  | Style | Branch | Main |
  |---|---|---|
  | melodic house | .75 / .66 / .55 | .75 / .71 / .35 |
  | techno | .89 / .83 / .65 | 1.0 / .99 / .44 |
  | UK garage | .94 / .62 / .48 | .76 / .75 / .49 |
  | boom bap | .95 / .67 | .83 / .85 |

- **Singing over melodic house** (human feel, fake mic): 11 notes on the grid, only drums during the take, mic off after, no raw voice track, no live playback. PASS. Boom bap at 66%: see B4.

**3. Worker:**
- 0 backticks and 0 `${`.
- The prompt's swing lines match the engine: 0.08 = 54%, 0.16 = 58%, 0.33 = 66%, max 0.4 (70%), and the ladder 66 → 58 → 54 → straight. The groove SWING words are the ones `resolveSwing` accepts.
- Remember the Worker deploy on release.

## Files
- Screenshots: /tmp/claude-0/-home-claude/abf86642-da80-5057-aa5f-87b64948abe7/scratchpad/se3/shots/ (swing-more.png, swing-chips.png, styles-chat.png, sing-melodic.png, sing-boom.png)
- Raw data: /tmp/claude-0/-home-claude/abf86642-da80-5057-aa5f-87b64948abe7/scratchpad/se3/ (swing.json, r-branch.json, r-main.json)
- Test commit: cc09ff3 on preview-se-3 (tests/smoke.mjs), not pushed.
