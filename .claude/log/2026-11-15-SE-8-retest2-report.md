# SE-8 re-check after fix 2 · qa-tester · 15 Nov 2026

**Verdict: READY.**
- Both bugs from my last report are fixed, with numbers below.
- The loop MP3 now peaks under -0.3 dBFS every time.
- check.sh passes. I added one smoke line for the AI path; it fails on the build before fix 2 and passes now.
- No new bugs from fix 2. One older behaviour is worth a note for later (note A); it doesn't block.

Tested: branch `preview-se-8` @ 3343e62 in `/home/claude/wt-se-8-qa`. For comparison I used the build before fix 2 (5d00345, its committed `index.html`) and main (9e39500). My smoke commit is c8ace68.

## Bugs
None blocking.

### Note A (low, older than fix 2, for later): once you've asked for 16ths, "different hats" keeps the same hats
**Steps** (offline brain, branch)
1. New song. "124 bpm drums like Stephan Bodzin", then "change the hats to 16ths".
2. Type any of these: "another one with different hats", "change up the hats", "new hats", "different hi-hats".

**Expected:** the hats change.

**Actual:**
- The offline parser sends `vary`, which keeps the asked-for hats. You get 16 of 16 five times in a row.
- "random hats" and "let the hats vary again" lock plain 8ths (9 steps ×5). That's maker.js's "hats named without a kind, so 8th" fallback, already known from my last report.
- The only way to free the hats is to name a new artist or style. Doing that works.

**Not a regression:**
- On main, the same words also give 16 ×5. There, Bodzin's 16ths have no gaps, and hats that differ from the style were already locked by `groove.js`.
- It also happens on the AI path when the AI answers "another one with different hats" with `add_drums` and no hats (16 ×4), or with `vary` (16 ×4). That's by design: the AI didn't name new hats.

**Fix idea (assistant-dev, later):** "different/new/change up the hats" could clear `hatsAsked`, in `maker.js` and in the prompt, the same way a new reference does.

## Re-run of my last report

| # | Last report | Now | Numbers |
|---|---|---|---|
| Bug 1 (medium) | AI path: hats you asked for are lost when "another one" comes back as `add_drums` | **Fixed** | 72 of 72 tries at 16; before: 13, 13, 13, 16 |
| Bug 2 (low) | `hatsSaid` counts "that", "what", "chat" and 160-169 as hat words | **Fixed** | 0 of 7 false hits; 18 of 18 real hat words still count |
| Loop MP3 (low) | -0.28 / -0.42 dBFS, just over the -0.3 margin | **Fixed** | 8 renders: -0.53 to -1.28 dBFS, 0 clipped |

### Bug 1: AI path, "another one" sent as `add_drums`
How I tested:
- I stubbed `/api/assistant` so `handleRequest` takes the AI branch with these actions.
- Each run starts from a gapped Bodzin groove. Then "change the hats to 16ths" (`hats 16th`), then "another one" ×4.
- I did 3 runs for each way the AI might answer.
- Hat steps are the fewest in any bar, closed and open hats together.

| What the AI sends for "another one" | Hats after the change | "another one" ×4 | Rest of the groove new | `hatsAsked` | Drums tracks |
|---|---|---|---|---|---|
| `add_drums` ref Bodzin + hats `16th` | 16 | 16/16/16/16 ×3 runs | 4/4 every run | true | 1 |
| `add_drums` ref Bodzin, no hats | 16 | 16 ×12 | 4/4 | true | 1 |
| plain `add_drums` | 16 | 16 ×12 | 4/4 | true | 1 |
| `add_drums` style melodic techno | 16 | 16 ×12 | 4/4 | true | 1 |
| `add_drums` hats `"16ths"` | 16 | 16 ×12 | 4/4 | true | 1 |
| `add_drums` with a fixed seed | 16 | 16 ×12 | 1/4 (the same seed gives the same groove, as expected) | true | 1 |

Style-only songs (no artist), 4 × "another one" as `add_drums`:
- techno with `style`, techno with `style` + hats, techno with plain `add_drums`, and house with `style`: hats went from 12 (house: 6) to 16, then 16 ×4 every time.
- The rest of the groove was new 4 of 4 times.

**The developer's extension and the edges around it:**

| Case | Result |
|---|---|
| Asked 8ths, then the AI copies `hats 16th` into "another one" (`add_drums`) ×3 | 9, 9, 9: stays 8ths (plus the open hat), locked. Right. |
| Asked 8ths, then "another one with 16th hats" (`add_drums` hats 16th) | 16, locked at 16th, then 16 on `add_drums` and on `vary`. Your new words win. |
| 16ths, then "make the hats 8ths" sent as `add_drums` hats 8th | 9, then 9 ×3 on "another one" with a copied `16th`. Right. |
| 16ths, then "drums like Ben Böhmer" (`add_drums` ref Böhmer) | Unlocked. Then `vary` ×5: 16, 12, 13, 12, 12. |
| 16ths, then "techno drums" (`add_drums` style techno) | Unlocked. Then 14, 13, 16, 12, 12. |
| 16ths, then the AI makes up "Ben Böhmer" for a plain "another one" | The app's guard drops the made-up artist, so it stays Bodzin and stays locked at 16 ×3. Right. |
| Undo / redo of an `add_drums` "another one" | Undo gives the exact groove from before, still locked. Redo gives the new one back. |
| Control: hats never named, `add_drums` ×8 | 14, 13, 12, 12, 16, 13, 8, 16, 16; never locked. |

### Bug 2: hat words with word boundaries
I set the request text and called `hatsSaid()` directly.
- **Not hat words now (correct):** "make me drums like that", "what about some techno drums", "chat, give me drums like Stephan Bodzin", "whatever you think", "160 bpm drum and bass", "165 bpm jungle", "that sounds great, another one", "128 bpm", "another one".
- **Still hat words (correct):** "hats on 16ths", "hi hats", "hi-hats please", "hihats", "the hat", "16ths", "16th hats", "16s on the hat", "sixteenth notes", "8th hats", "8ths", "eighth notes", "offbeat hats", "off-beat", "shuffle", "quarter notes".
- **Still counted, low impact:** "add a snare roll" and "give it a shuffle". These only matter if the AI also sends a hats value in the same answer. I left them alone.

End to end: the AI picks hats on its own, then `vary` ×6.

| Request | Locked | Hat steps |
|---|---|---|
| "make me drums like that" | no | 16, 8, 16, 13, 12, 8, 14 |
| "what about some techno drums" | no | 13, 16, 12, 14, 16, 12, 12 |
| "160 bpm drum and bass" | no | 9, 9, 9, 11, 9, 10, 9 |
| "chat, give me drums like Stephan Bodzin" | no | 12, 12, 16, 14, 8, 16, 16 |
| "drums like Ben Böhmer with 16th hats" | yes | 16 ×7 |
| "hihats on sixteenths, techno drums" | yes | 16 ×7 |

### Loop MP3 (`makeMp3`, 4 loops, decoded back in Chrome)

| Render | Peak (dBFS) | RMS (dB) | Clipped | Silent ½ s | Length |
|---|---|---|---|---|---|
| Bodzin full mix (drums, bass, chords, melody) | -0.96 | -7.6 | 0 | 0 | 31.0 s |
| Böhmer full mix | -0.89 | -7.6 | 0 | 0 | 31.5 s |
| house full mix | -0.81 | -7.8 | 0 | 0 | 31.0 s |
| dnb full mix | -0.74 | -10.0 | 0 | 0 | 22.1 s |
| techno drums | -1.10 | -7.2 | 0 | 0 | 29.6 s |
| trap drums | -1.28 | -6.4 | 0 | 0 | 27.5 s |
| Bodzin drums | **-0.53** | -6.7 | 0 | 0 | 31.0 s |
| house drums | -0.94 | -7.1 | 0 | 0 | 31.0 s |

- All are under -0.3 dBFS. The worst decoder overshoot is +0.47 dB over the -1 target.
- Render times were 36-124 s, at a load of 8-10 from other testers on the 2 cores. That's the machine, not the build.
- Whole-song MP3 (smoke runs): -0.97, -1.06 and -0.92 dBFS.

## Main flow and regressions (offline brain unless noted)
- **The owner's sentence:** "124 bpm drums with hi-hats and claps like Ben Böhmer", then "another one" ×4.
  - 124 BPM.
  - Hats 8, 8, 12, 12, 8, with 5 of 5 hat patterns different. Never locked.
  - Every reply describes a different groove.
- **Bodzin, typed:** gapped (12), then "change the hats to 16ths" gives 16, then "another one" ×5 gives 16 ×5. The editor screenshot shows the closed hats on every 16th except where the open hat plays.
- **Save and reopen after the AI-path lock:** I saved a Bodzin song with locked 16ths, made a new house song, then reopened the first one.
  - The events are identical and `hatsAsked` is kept.
  - "another one" ×4 as `add_drums` after reopening: 16 ×4.
  - 1 track.
- **"another one" ×10 (smoke):** worst pairs 0.71 (Böhmer), 0.73 (Bodzin), 0.67 (house). All under 0.9.
- **Page errors:** none. The only console line is a blocked network request from the sandbox.

## check.sh

| Run | Load | Result | Time |
|---|---|---|---|
| 1 | 5-8 | 48 of 50: the 2 known load-sensitive save/reopen checks failed ("opening the app starts a new empty song…", "Undo right after opening a song…") | 3 min 29 s |
| 2 (rerun) | 9-13 | CHECK OK, SMOKE OK 50 | 3 min 30 s |
| 3 (with my new line) | 10 → 4 | CHECK OK, SMOKE OK 51 | 2 min 16 s |

- Runs 1 and 2 go over 3 minutes only because of the shared machine's load. At lower load, run 3 took 2 min 16 s.
- The save/reopen flake is the same one the developer saw. Fix 2 doesn't touch that code. It's worth a QA item to make those two checks wait for the save rather than a fixed delay.

## Smoke test change (commit c8ace68 on `preview-se-8`, `tests/smoke.mjs` only)
New line: **"with the AI on, 16ths you asked for stay when "another one" comes back as add_drums; a new artist unlocks them"**.
- It stubs `/api/assistant` and finds a gapped Bodzin groove.
- It answers "change the hats to 16ths" with `hats 16th`, then "another one" ×4 with `add_drums` ref Bodzin + hats 16th. It needs 16 in every bar each time and a new groove 4 of 4 times.
- Then "drums like Ben Böhmer" (`add_drums` ref Böhmer) must unlock the hats. Always 1 drums track.
- It restores `fetch` and the engine after the line.
- Against the build before fix 2 it FAILS, as it should: "12/12/13/16" and "16/14/14/13" in 2 runs. On the branch it passes: "12 → 16, ×4: 16/16/16/16, new groove 4/4, Böhmer unlocks: yes".
- It counts the fewest hat steps in any bar, not just bar 1. My first draft counted bar 1 only and missed the bug.

## Files
- **Screenshots** (`/tmp/qa/2026-11-15-se8-retest2/shots/`):
  - `f1-owner-sentence-another-x4.png`
  - `f2-bodzin-16ths-after-another-editor.png`: the 16ths in the editor.
  - `f3-after-reopen-another-x4.png`
  - `a1-after-ai-path.png`
- **Raw data** (`/tmp/qa/2026-11-15-se8-retest2/`): `t1-ai.json`, `t2-edges-branch.json`, `t2-edges-main.json`, `t3-loopmp3-branch.json`, `t4-flow.json`, `check1.log`, `check2.log`, `check3.log`, `smoke-prefix2.log`
- **Scripts:** `/tmp/qa/2026-11-15-se8-retest2/js/`
