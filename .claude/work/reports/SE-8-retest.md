# SE-8 re-check after fix 1 · qa-tester · 15 Nov 2026

**Verdict: NOT READY, but only because of one narrow gap on the AI path (bug 1 below). Everything in my first report is fixed, with numbers. The gap needs either a one-line fix or one check with real AI output.**

- "Change the hats to 16ths" now gives 16 of 16 in Bodzin, techno, melodic techno and Böhmer, and the 16ths survive "another one": 160 of 160 tries.
- No stacked hits in 2,800 grooves (the build before the fix had 2,392).
- Whole-song MP3 peaks are -0.47 to -1.29 dBFS over 15 renders, with 0 clipped samples.
- "Another one" ×10 stays under 0.9 alike: worst pair 0.57 to 0.78 over 12 sessions.
- The gap: if the live AI answers "another one" with `add_drums` again (the Worker prompt allows that), the 16ths you asked for are lost, the same thing the owner would have seen in bug 1. With `vary` (the usual answer), or with no AI, it works.

Tested: branch `preview-se-8` @ 5648ed6, in worktree `/home/claude/wt-se-8-qa`. For comparison: the build before fix 1 (5a585e3) and main (9e39500), as built files. My test commit is listed at the end.

## Bugs

### 1. AI path: the hats you asked for are lost when the AI answers "another one" with `add_drums` · MEDIUM · assistant-dev (`src/actions.js`)
**Steps** (with the AI on; I mocked the AI's replies, see "AI path" below)
1. New song. "124 bpm drums like Stephan Bodzin", then "change the hats to 16ths". The AI sends `{type:"hats", pattern:"16th"}`, and you get 16 of 16 steps.
2. "another one". The AI sends `{type:"add_drums", ref:"Stephan Bodzin", hats:"16th"}`. The prompt says "use vary (or add_drums again with the same fields)", so this is allowed.

**Expected:** 16th hats, with the rest of the groove new.

**Actual:** gapped hats again. Four tries gave 13, 13, 13 and 16 steps. `hatsAsked` is false.

**Why:**
- `grooveOver` sets `hatsAsked` only when the current request has hat words. "Another one" has none.
- `add_drums` builds a fresh recipe, so the flag on the existing drums track is dropped.
- Bodzin's own hats are `16th`, so the old "differs from the style" rule doesn't save it either.
- On main this can't happen, because main never makes gapped 16ths.

**Fix idea:** in `grooveOver` (or `add_drums`), if the drums track already has `recipe.hatsAsked` and `a.hats` is missing or equals `recipe.hats`, keep `hatsAsked: true`. A new reference with no hat words should still unlock them (it does today; see "Regressions").

**Or:** the lead checks real Llama output for "another one" after a hats change. If it is always `vary`, this drops to low.

### 2. `hatsSaid()` takes words that only contain "hat" as hat words · LOW · assistant-dev (`src/actions.js`)
- The regex `/hat|\b16|…/` has no word boundary. So "that", "what", "chat", "whatever" and any tempo from 160 to 169 count as naming the hats.
- When the AI adds a hats value on its own, those hats then lock for the rest of the song: every "another one" keeps them.
- Mocked AI results, 6 × "another one" each:

| Request | Hats the AI added | Hats on each "another one" |
|---|---|---|
| "make me drums like that" | 16th | 16 ×6, locked |
| "what about some techno drums" | 16th | 16 ×6, locked |
| "160 bpm drum and bass" | 8th | 9 ×6, locked |
| control: "drums like Stephan Bodzin" | 16th | 16, 12, 16, 12, 8, 14, varies as it should |

- The rest of the groove still changes every time, so "another one" is still different. Only the hats stop varying.
- **Fix idea:** `\bhats?\b|hi-?hats?|hihats?` and `\b16(th|ths|s)?\b`, or reuse maker.js's hat normalisation.

### Not from SE-8 (same on main; offline parser `src/maker.js`, for the record)
- **"remove the hats" / "remove the hi-hats" deletes the whole Drums track.** It runs `{type:"remove", track:"drums"}`. Main does the same. A producer would expect only the hats to go. Worth a bug item for assistant-dev.
- **"no hats", "take out the hats" and "without hats" give 8th hats** instead of removing them. Main does the same. With SE-8, those 8ths now stay through "another one".
- **"hats off the beat" and "hats off-beat" make a whole new groove** with 8th hats. The word "beat" triggers `add_drums`, so kick and clap change too. Main does the same.
- **"mute the hats" mutes all the drums.** Main does the same.
- **The owner's sentence a second time locks plain 8th hats offline.** "124 bpm drums with hi-hats and claps like Ben Böhmer", typed when drums already exist, gives `hats:"8th"` from the offline parser (line 105 falls back to `8th` when hats are named without a kind). That's now asked-for 8ths: 8, 8, 8, 8, 9, 8, 8. The first time, the hats vary as they should (8-16).

## Re-run of my first report

| # | First report | Now | Numbers |
|---|---|---|---|
| Bug 1 | "change the hats to 16ths" ignored in Bodzin and techno | **Fixed** | See below |
| Bug 2 | Whole-song MP3 peak 0.00 dBFS in 1 of 3 smoke runs | **Fixed** | 15 renders: -0.47 to -1.29 dBFS, 0 clipped |
| Rough edge 1 | Stacked kicks and doubled hats | **Fixed** | 0 in 2,800 grooves (before: 2,392, of which 408 kicks and 1,648 hats) |
| Rough edges 2-4 | Long replies, "Bassline next?" every time, older items | Unchanged | Not in fix 1's scope |

### Bug 1: hats you name stay as asked (typed through `handleRequest`, offline brain)
Hat steps are the minimum over all bars of the loop, closed plus open hats, counted on the rounded 16th. The kick's early push moves a downbeat hat a hair before the bar line, so I count it in its own bar.

**"change the hats to 16ths" after a gapped groove (4 runs per request):**

| Request | Before | After | "another one" ×10 | Rest of the groove | Ride | Seed |
|---|---|---|---|---|---|---|
| 124 bpm drums like Stephan Bodzin | 8-12 | 16 (4/4) | 40/40 at 16 | identical 4/4 | identical 4/4 | kept 4/4 |
| techno drums | 12 | 16 (4/4) | 40/40 at 16 | identical 4/4 | identical 4/4 | kept 4/4 |
| drums like Ben Böhmer | 12-14 | 16 (4/4) | 40/40 at 16 | identical 4/4 | identical 4/4 | kept 4/4 |
| melodic techno drums | 8-14 | 16 (4/4) | 40/40 at 16 | identical 4/4 | identical 4/4 | kept 4/4 |

- After the change, the rest of the groove still changed on 10 of 10 "another one" tries in every run. Always exactly 1 drums track.

**Asked on the first try, 3 runs each:** "124 bpm drums with 16th hats like Stephan Bodzin", "techno drums with 16th hats" and "drums like Ben Böhmer with sixteenth hats" gave 16 on the first try and 16 on all 10 "another one" tries (99/99).

**Other wordings, on a gapped Bodzin groove, then "another one" ×6:**
- 16 every time, rest identical: "hi-hats on 16ths", "make the hats sixteenths", "16th hats please", "straight 16th hats", "put the hi hats on sixteenth notes".
- "change the hats to 8ths": 9 steps (8ths plus an open hat), kept through "another one".

**Other styles, then "another one" ×4:**
- trap → 16ths: 8 → 16, kept.
- house → 16ths: 12 → 16, kept.
- dnb → 8ths: 10 → 9, kept.

**Hats you don't name still vary** (hat steps over 1 + 10 tries, and distinct hat patterns):

| Request | Hat steps | Distinct patterns | `hatsAsked` |
|---|---|---|---|
| 124 bpm drums like Stephan Bodzin | 8-16 | 9/11 | never set |
| drums like Ben Böhmer | 8-16 | 11/11 | never set |
| techno drums | 8-16 | 11/11 | never set |
| house drums | 4-12 | 10/11 | never set |
| The owner's sentence, "124 bpm drums with hi-hats and claps like Ben Böhmer" | 8-16 | 11/11 | never set |

**AI path** (I stubbed `/api/assistant` so `handleRequest` takes the AI branch with these actions):
- `hats 16th`, then `vary` ×6: 12 → 16, then 16 ×6, rest identical.
- `add_drums` with hats `16th` for "drums like Stephan Bodzin" (no hat words): not locked, varies. Correct.
- `add_drums` again for "another one": bug 1 above.

### Bug 2: whole-song MP3 at -1 dBFS
`makeSongMp3`, Short layout (33 s), decoded back in Chrome.

| Render | Peak (dBFS) | RMS (dB) | Clipped samples |
|---|---|---|---|
| house drums ×2 | -0.86, -1.29 | -7.3, -7.5 | 0 |
| Bodzin drums ×2 | -0.85, -0.89 | -6.8, -6.5 | 0 |
| Böhmer drums ×2 | -1.08, -0.96 | -7.4 | 0 |
| techno drums ×2 | -0.94, -1.05 | -7.1, -6.7 | 0 |
| trap drums ×2 | -0.73, -1.21 | -6.4, -6.0 | 0 |
| dnb drums ×2 | -1.04, **-0.47** | -12.9, -12.5 | 0 |
| full mix (drums, bass, chords, melody): Bodzin, Böhmer, house | -0.93, -1.04, -0.90 | -7.4, -7.7, -7.8 | 0 |

- All 15 are under -0.3. The worst decoder overshoot is the dnb seed: +0.53 dB over the -1 target.
- Main, same Bodzin full mix (seed 5100): -0.29 dBFS. The branch: -1.09.
- **Time to make, at low load:**
  - Drums: 18 s on the branch, 21.5 s on main.
  - Full mix: 44.8 s on the branch, 46.3 s on main.
  - No slowdown. While other testers loaded the 2 cores (load 14-18), one drums render took up to 264 s. That's the shared machine, not the build.
- The loop MP3 (`makeMp3`, unchanged, target 0.97): -0.28 and -0.42 dBFS on the branch, -0.32 on main, 0 clipped. That's just over the -0.3 margin once. Low; the dev already offered the same one-line change.

### Rough edge 1: stacked hits
Sweep with `makeGroove(grooveRecipe(style))`: 28 styles × 4 and 8 bars × 50 seeds = 2,800 grooves.

| | Branch | Before fix 1 |
|---|---|---|
| Same drum twice within 0.02 beat | **0** | 2,392 |
| Of which kicks | 0 | 408 |
| Of which hats | 0 | 1,648 |
| Kick idea named but not heard | 0 | — |

- At most 7 hits land on one 16th (organic house, afro, amapiano, tech house), as before.
- The dedupe can't eat intended hits. The closest intended spacing (clap flam, kick roll, hat roll, trap rolls) is 1/12 to 1/8 beat, and the dedupe window is 0.02 beat.
- Grooves with no clash are event-for-event identical to before in most styles.
- Exception: styles with a ride, mainly techno, melodic techno and dnb (only 4-7 of 72-97 identical; house, melodic house, nu-disco and deep house lose 2-4). The ride now draws its own randomness, so the hats' velocity jitter shifts slightly. That's expected from the ride fix, and harmless.

### "Another one" ×10 (typed, 4 rounds per reference, 55 pairs each)

| Request | Worst pair | Mean | Different replies | Drums tracks | Memory |
|---|---|---|---|---|---|
| drums like Ben Böhmer | 0.68-0.71 | 0.47-0.51 | 10/10 | 1 | 11 |
| 124 bpm drums like Stephan Bodzin | 0.67-0.78 | 0.53-0.57 | 10/10 | 1 | 11 |
| house drums | 0.57-0.74 | 0.36-0.46 | 10/10 | 1 | 11 |

- The smoke runs gave worst pairs of 0.71 / 0.75 / 0.75, 0.61 / 0.65 / 0.60 and 0.69 / 0.73 / 0.68. All are under 0.9.

## Regressions near the fix
- **Save and reopen.**
  - Bodzin with 16ths, saved, then a new song with house drums, then reopened: the events are identical and `hatsAsked` is kept.
  - "Another one" ×5 after reopening: 16 every time.
- **Undo and redo.**
  - Undo of the hats change gives back the exact gapped groove (12 steps, `hatsAsked` false).
  - Redo gives 16 again, with `hatsAsked` true.
  - Typing "undo" also gives back the exact gapped groove.
- **Feel after the 16ths:**
  - "more swing" (66%), "less swing" (58%), "less energy" and "no swing": hats stay 16, and the 16th grid is identical.
  - "more energy": hats stay 16. The grid gets busier, which is expected.
- **A new reference unlocks the hats.** After 16ths in Bodzin, "drums like Ben Böhmer" gives `hatsAsked` false, and the hats vary again: 12, 8, 16, 8, 12, 16, 16. That's sensible.
- **8-bar loop:** 14 → 16 in all 8 bars, and the rest is identical.
- **Page errors:** none in any script. The only console line is a blocked network font request, from the sandbox.

## check.sh

| Run | Load | Result | Time |
|---|---|---|---|
| 1 (fresh machine, includes the puppeteer install) | 0.2 → 6 | CHECK OK, SMOKE OK 49 | 3 min 11 s |
| 2 | 6-8 | CHECK OK, SMOKE OK 49 | 2 min 25 s |
| 3 (with my new lines) | 2 | CHECK OK, SMOKE OK 50 | 1 min 42 s |

- The save/reopen checks passed in all 3 runs.
- Whole-song MP3 smoke peaks: -1.27, -0.91 and -0.79 dBFS.
- Run 1 is over 3 minutes only because it installed puppeteer-core after the machine restart.

## Smoke test changes (my commit on `preview-se-8`, `tests/smoke.mjs` only)
1. **The "change the hats to 16ths" line** now also types "another one" ×3 (offline brain) and needs 16 of 16 each time.
2. **New line: "no stacked hits … and no kick idea named that isn't heard, every style".** It checks 28 styles × 4/8 bars × 10 seeds = 560 grooves, in under 1 s.
3. **Whole-song MP3 line:** the peak must be under -0.3 dBFS (was under 0).

Against the build before fix 1, lines 1 and 2 FAIL as they should: Bodzin "12 → 12", and doubled hits in techno and melodic techno. On the branch, all pass (50 checks).

## Files
- **Screenshots:** `/tmp/qa/2026-11-15-se8-retest/shots/`
  - `s1-bodzin-gapped-hats-editor.png`: gapped hats.
  - `s2-after-change-hats-to-16ths-editor.png`: 16ths; closed hats skip only where the open hat plays.
  - `s3-chat-after-another-one.png`
  - `s4-another-one-editor.png`
  - `h1-*.png`, `r1-after-another-x10.png`, `r2-regressions.png`
- **Raw data:** `/tmp/qa/2026-11-15-se8-retest/`: `t1-hats.json`, `t2-vary.json`, `t3-sweep.json`, `t4-mp3-branch.json`, `t4-mp3-main.json`, `t4-mp3-branch1.json`, `t5-regress.json`, `check1.log`, `check2.log`, `check3.log`
- **Scripts:** `/tmp/qa/2026-11-15-se8-retest/js/`
