# SE-3 Real drummer feel: branch check (qa-tester) · 13 Nov 2026

## Verdict: READY
Branch `preview-se-3`, tested at 114a066. Nothing blocks it, and nothing got worse compared with `main`. Everything SE-3 promised works with the offline parser and with a mocked AI:
- hats lift on beats 2 and 4
- "more swing" is full triplet swing (66%)
- "less swing" steps down 66 → 58 → 54 → straight, so swing can always be lightened, as the owner asked
- exact amounts work ("swing 58%")
- "another one" is different every time
- the kick pushes about 10 ms ahead in human styles
- nothing clips

I tightened the smoke test and pushed it to the branch (7e7406d, `tests/smoke.mjs` only). **check.sh: CHECK OK, 23/23, 1 min 44 s.** All 5 SE-3 checks now FAIL on `main` and PASS on the branch.

Problem 2 below is older than SE-3, but full swing makes it easier to hear. It's worth its own item.

## Problems (none block release)
1. **(low) "another one with less swing" shows two chips that disagree.** Owner: assistant-dev, `src/actions.js` (vary's chip is written before groove changes the swing).
   - Steps: make a melodic house beat, say "more swing", then say "another one with less swing".
   - Expected: one swing amount, 58%.
   - Actual: the first chip and the reply say "…full triplet swing (about 66%)…", and the second chip says "Lighter swing, about 58%". The swing really is 58%. The same happens with the mocked AI (vary + groove).
2. **(medium, older than SE-3, louder now) Sung and generated parts don't follow the drums' swing.** Owners: studio-ux-dev (quantizing a sung take, `src/mic.js` / `audioToNotes`) and sound-engine-dev (`genBass` / `genChords` in `src/music.js`, which ignore `recipe.swing`). Only the drums swing; every other part sits on the straight grid.
   - Steps: make a boom bap beat (59% swing), then say "let me sing the bassline" (fake mic `sing.wav`).
   - Expected: notes on off-16ths line up with the swung drum hits.
   - Actual: 10 of 17 sung bass notes sit on off-16ths, all on the straight grid (0 ms off-grid). They land 31 ms ahead of the drums' swung 16ths. After "more swing" (66%) the gap is 57 ms at 88 BPM, which you can hear as a flam. A generated bassline does the same (off-16th notes 0.000 late).
   - On main the gap after "more swing" was 34 ms (0.2). SE-3 didn't cause this, but it makes it more audible. The kick push itself is fine with sung parts (−10 ms vs sung notes on the grid).
3. **(low, older than SE-3) On boom bap and lo-fi, "more swing" doesn't move the hats.** Owner: sound-engine-dev (`src/groove.js`).
   - Steps: make a boom bap beat (8th hats), say "more swing".
   - Actual: the reply says "Full triplet swing, about 66%", but only 22 of 73 hits move (16 ghost snares, 4 kicks, 2 percussion). No hat moves, because 16th swing doesn't touch 8th notes. That's correct MPC behaviour, but a producer listens for swing in the hats. Lo-fi moves its shaker (32 hits), so it's audible there.
   - Idea: in 8th-hat styles, add 16th hat ghosts when swing goes above 58%.
4. **(low, older than SE-3) Swing words with no beat get the generic "I couldn't turn that into a change. Try…" reply.** Owner: assistant-dev (`src/maker.js`).
   - Steps: in a new empty song, say "less swing" or "more swing".
   - Better: "There's no beat yet. Say 'make a house beat' first."
5. **(note for the lead, not a bug)** "add some swing" and "make a house beat with swing" go straight to full 66%. That follows the owner's D1 choice for "more swing". "Some swing" might be expected to mean about 58%. Raise it only if the owner finds house too swung.

## What I checked (numbers from headless Chrome, branch vs main)
**check.sh:** build, bundle syntax and Worker syntax pass, smoke 23/23, no page errors. The only console error was the blocked network font/AI fetch, which happens on main too.

**Smoke-test review.** The developer's hat check would have passed on main by accident: main's house 16ths had 2/4 at 0.86 vs off-16ths at 0.39. I made these changes:
- The hat check now uses a fixed seed, and it requires beats 2 and 4 to be 5% above beats 1 and 3. On main those beats were equal (0.84 vs 0.86 → FAIL). On the branch it's 0.79 vs 0.70 → PASS.
- New check: AI on, with a fetch mocked like the old live prompt, which sends `swing:0` for "less swing". The user's words win and it steps 66% → 58% (main: 0 → FAIL).
- The other 3 checks already fail on main: lag 0.050 instead of 1/12, no stepping, kick 0.0 ms.

**Styles (offline parser, 3 runs each).** Hat velocity is shown as beats 1/3, beats 2/4, off-16ths (main values in brackets).

| Style | Hats 1/3 · 2/4 · off-16ths | Swing | Drummer push |
|---|---|---|---|
| house | off-beat hats are open; 16th ghosts 0.46 (0.43) | straight | none |
| melodic house | 0.66 · 0.75 · 0.54 (main 0.79 · 0.74 · 0.44: 2/4 now lifts) | 52% | kick −10.1 ms, snare −3.6 ms |
| techno | 0.82 · 0.92 · 0.64 (main 0.95 · 0.94 · 0.48) | straight | none (not a human style) |
| UK garage | 0.65 · 0.91 · 0.49 | 59% (reply says "medium swing (about 59%)") | none |
| boom bap | 0.68 · 0.97 · 8ths 0.60 | 59% | kick −10.1 ± 2.3 ms, snare −3.6 ± 1.8 ms, hats ± 7.6 ms (10 seeds, measured on even 16ths) |
| lo-fi | 0.66 · 0.96 · 8ths 0.58 | 60% | kick −10.1 ms, snare −3.3 ms |

On main the human styles had no push (kick 0 ms).

**Swing conversation (melodic house, boom bap, house).** The same results on all three:

| Said | Result |
|---|---|
| "more swing" | 66% (house off-16th hats 0.083 beat late = 1/12) |
| "more swing" again | 70% "(the most it goes)" |
| "less swing" ×4 | 66 → 58 → 54 → straight |
| "a bit more swing" ×2 | 54 → 58 |
| "a bit less swing" | 54 |
| "swing 58%" | 58 |
| "no swing", "make it straight", "straight" | straight |
| "swing 62 percent" | 62 |
| "too much swing" | one step down |
| "swing it a bit less" when already straight | "Already straight, no swing" |

- Every reply and chip says the amount in musician words ("Lighter swing, about 58%").
- On main, every "less" went straight to 0 and every "more" to 0.2.
- Phrases that look like swing but aren't don't change it: "swing 120 bpm" sets the tempo, "swing 8 bars" sets the length, "go straight to the chorus" leaves the swing alone.

**"Another one" five times.** Every take differs (6/6 unique signatures on house, techno, melodic house and boom bap; main had 5/6 on house and techno). Swing is kept across takes. Overlap on the grid with the previous take: house 0.79–0.91, techno 0.88–0.90, melodic house 0.88–0.95, boom bap 0.58–0.88. Main was similar.

**Mocked AI (old live prompt guesses a number).** On a boom bap beat:

| Said | AI sent | Result |
|---|---|---|
| "make a boom bap beat with lots of swing" | 0.3 | 66% |
| "less swing" | 0 | 58%, then 54% |
| "more swing" | 0.2 | 66% |
| "a bit less swing" | 0.1 | 62% |
| "swing 58%" | 58 | 58% |
| "harder" | (no swing) | swing kept at 54% |

So the user's words win on the test link, even though the Worker there is the old one.

**Undo, save and reopen:**
- "more swing" then undo goes back to 59%.
- Save, new song and reopen keeps 66%.
- "less swing" after reopening goes to 58%.

**Levels (offline render through the master chain). No clipping anywhere (0 clipped samples):**
- Drums peaks are −0.5 to −0.8 dBFS on every style. House full-mix RMS is −6.5 dB (main −6.4).
- Drum RMS over 3 fixed seeds, branch vs main: boom bap −10.6 vs −11.3, lo-fi −10.9 vs −11.7, UK garage −8.2 vs −8.8, melodic house −6.6 vs −6.5.
- **Hats vs drums.** Hats are not buried:

  | Style | Branch | Main |
  |---|---|---|
  | melodic house | −12.2 dB | −12.4 dB |
  | UK garage | −12.1 dB | −11.1 dB |
  | lo-fi | −13.7 dB | −12.9 dB |
  | boom bap | −16.4 dB | −15.5 dB |

  The swung and 8th-hat styles sit 0.8–1.0 dB lower than on main, which is within matching range. Hat brightness is unchanged or a little darker (boom bap −3.9 vs −2.2 dB), so they are not harsh.

**Singing over a human-feel beat (boom bap, fake mic):**
- While singing, only the drums play.
- 17 bass notes, all quantized to the 1/16 grid. Main gave 20; same melody, different take detection.
- The kick push doesn't throw the take off.
- The swing mismatch is problem 2.

**Worker:**
- `cloudflare/worker.js` has 0 backticks and 0 `${`.
- The add_drums swing line ("0 (straight) to 0.4, 0.08 light (about 54%), 0.16 medium (about 58%), 0.33 full triplet swing (about 66%)") matches `SWING_STEPS` [0, 0.08, 0.16, 0.333, 0.4] and `swingPct`.
- The groove SWING line describes the steps 66 → 58 → 54 → straight, which is what the engine does.
- The example "too much swing, bring it down a bit" sends "less"; the app's own reading of those words is also "less".
- The Worker must be deployed on release for the AI to send swing words.

**For the merge:** `main` is 2 housekeeping commits ahead (`.claude/log`, `.claude/work` only). That's why `git diff main` shows those files as deleted; it isn't a conflict.

## Screenshots
All in `/tmp/claude-0/-home-claude/826c6c09-16b9-58db-a0b8-fab3a3d0eb5a/scratchpad/se3/shots/` (`branch-*` and matching `main-*`):
- `branch-style-make_a_<style>_beat.png`, one per style
- `branch-conv-make_a_house_beat.png` (chip "Straight, no swing")
- `branch-conv-make_a_melodic_house_beat.png`, `branch-conv-make_a_boom_bap_beat.png`
- `branch-edge.png`, `branch-sing-take.png`, `branch-sing-after.png`
- `branch-drum-editor.png` (boom bap with the sung bass track; layout fine)

Raw numbers: `/tmp/claude-0/-home-claude/826c6c09-16b9-58db-a0b8-fab3a3d0eb5a/scratchpad/se3/res-branch.json`, `res-main.json`, `res2-branch.json`, `res2-main.json`. Scripts: `run.mjs`, `run2.mjs` in the same folder.
