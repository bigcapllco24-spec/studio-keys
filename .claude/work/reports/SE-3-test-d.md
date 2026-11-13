# SE-3 quick re-check 2 (qa-tester) · 13 Nov 2026

## Verdict: READY
- **check.sh passes:** CHECK OK, smoke 26/26, 46 s, on adcf6db.
- **N1, N2 and N3 are fixed.**
- **No regressions** in the round-1 replay (71 cases) or in the 10 ordinary Basic-mode requests.
- **0 page errors** on the branch and on main.

## What I checked (headless Chrome, offline parser, branch adcf6db vs main)
Main has moved only in `.claude/` since the branch point, so main's committed `index.html` is a fair baseline.

### 1. check.sh
- CHECK OK, 26/26.
- My N1 line passes: "swing said about a part or in the groove/hats only swings the drums".
- The developer's new line passes: "faster about a part keeps the tempo, add a snare roll keeps the clap" (bass faster 0, faster chords 0, make it faster +5, snare roll keeps the clap, add a snare gives a snare).

### 2. N1, N2, N3 (41 cases, each from a fresh song)
**N1: fixed.** The setup is house drums (16th ghost hats, 84 hits), bass and chords. Fourteen phrases change only the drums' swing:
- "more swing on the chords / melody / bass / pads"
- "make the bass swing more", "less swing on the bass"
- "more swing in the groove", "less swing in the drums", "less swing in the hats / hi-hats"
- "add more swing to the chords", "more swing for the whole track"
- "a bit less swing on the keys", "more swing into the percussion"

For all fourteen:
- No new tracks.
- The drum hits are identical (703:84 before and after).
- The hats stay "off-beat hats with 16th ghosts".
- The bassline is not rebuilt.

From straight, a "less" request replies "Already straight, no swing", and no undo step is added.

**N2: fixed.** At 124 BPM, these leave the tempo at 124:
- "make the bass faster", "make the chords faster", "faster chords", "make the melody faster"
- "speed up the bass", "slow down the chords", "make the bass a bit slower"

The part side of these phrases does the same as main: the bass is re-run, or Chords 2 / Melody is added (known P2 gap).

Real tempo phrases still work:

| Said | Tempo |
|---|---|
| "a bit faster", "speed it up", "faster please" | 129 |
| "make it slower" | 119 |
| "slow it down a lot" | 114 |
| "make it faster, 128 bpm" | 128 |
| "add a bassline and make it faster" | 129, plus the bass |
| "make it faster and add more swing" | 129, plus 66% |

**N3: fixed.**

| Said | Result |
|---|---|
| "add a snare roll", "add a snare fill", "add a clap roll" | "couldn't turn that into a change", the clap stays (same as main) |
| "add a snare sound to the keys" | adds an Electric Piano (same as main) |
| "add a snare", "add a snare please", "add a snare on 2 and 4", "add a snare instead", "add a snare too" | snare on 2 and 4 |
| "add a snare and more swing" | snare plus 66% |

### 3. Regressions
**Round-1 replay** (`fixes.mjs`, 71 cases; compared with my last run on a5febff): 18 of 78 outputs differ.
- 15 are unseeded beats or "another one" picking different percussion or fills, which is expected randomness. Swing, tempo, backbeat and track lists are the same.
- The other 3 are the intended N1/N2/N3 changes: "more swing on the bass" no longer re-runs the bass, "make the melody faster" / "faster chords" keep 124 BPM, and "add a snare roll" / "sound to the keys" no longer swap the clap.
- B1, B2, B3, the one-chip cases and B5 give the same results as before.

**10 ordinary requests in one song**, compared with main:

| # | Said | Branch | Main |
|---|---|---|---|
| 1 | "make a house beat" | House drums, 124 BPM, straight | same |
| 2 | "add a bassline" | Bassline on Pluck Bass | same |
| 3 | "add chords" | Chords on Grand Piano | same |
| 4 | "another one" | new drum groove, same swing and tempo | same |
| 5 | "make it faster" | 129 BPM | "couldn't" (SE-3 improvement) |
| 6 | "add a clap" | clap already on 2 and 4, no change | "couldn't" |
| 7 | "more reverb on the chords" | Reverb on Chords 44% | same |
| 8 | "let me sing the bassline" | count-in, 4-bar take, then a "Sung bassline" track with 10 notes | 12 notes (the fake mic loops, so the start differs) |
| 9 | "less swing" | "Already straight, no swing" | generic Groove chip |
| 10 | "undo" | "Undid the last change" | same |

More on the singing take (steps 8 to 10):
- The singing take behaves the same on both: drums only during the take, the notes land, and no raw audio track is added.
- Two "undo"s are needed to remove the sung bassline on both branch and main. The no-op "less swing" adds no undo step (checked with `UNDO.stack`), so this comes from the take. It is not SE-3, but worth a look for UX.

## Problems
None blocking. Known gaps are unchanged from main and already listed in the fix report: "make the bass faster" re-runs the bass, "faster chords" adds Chords 2, and there is no snare-roll action.

## Files
- check.sh log: `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/qa/check-d.log`
- Results, in `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/qa/d/`:
  - `d-branch.json`, `d-main.json`: N1–N3 and the ordinary requests
  - `fx-branch.json`, `fx-main.json`: the round-1 replay
  - `branch-sing.json`, `main-sing.json`: the singing take
- Scripts, same folder: `d.mjs`, `sing.mjs`, `u.mjs`
- Screenshots, same folder:
  - `branch-sing-during.png`, `branch-sing-after.png`, `main-sing-*.png`
  - `d-branch-end.png`, `fx-branch-chips.png`
- Worktree: `/home/claude/wt/qa-se-3`, detached at adcf6db, clean.
