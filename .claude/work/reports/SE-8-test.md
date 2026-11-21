# SE-8 branch check · qa-tester · 15 Nov 2026

**Verdict: NOT READY. One medium bug (a regression in the owner's own style) and one flaky smoke check. The main fix works: "another one" ×10 now gives 10 different grooves in Böhmer, Bodzin and house.**

- Tested: branch `preview-se-8` @ 051b5e0, in worktree `/home/claude/wt-se-8`. Main for comparison: a310166, in a separate worktree.
- The rebase onto main only added `.claude/` files, so I reset to the branch head and tested that. Upstream is now `origin/preview-se-8`; no force push.
- My test commit: 1599283 (`tests/smoke.mjs`, +1 check), pushed to `preview-se-8`.

## Bugs

### 1. "Change the hats to 16ths" doesn't give 16ths in Bodzin or techno grooves · MEDIUM · regression vs main
**Steps**
1. New song.
2. Type "124 bpm drums like Stephan Bodzin". Then type "another one" until Keys says "16th hats with gaps", "galloping 16th hats" or "16th hats off the beat" (usually 1 or 2 tries).
3. Type "change the hats to 16ths".

**Expected:** closed hats on all 16 sixteenths, with the kick, clap and percussion kept.

**Actual:**
- Nothing changes. Keys replies "Hi-hats: … 16th hats with gaps …". Bar 1 still has hats on only 12 of 16 steps (screenshot `/tmp/qa/2026-11-15-se8/shots/p7-124_bpm_drums_like_Stephan_Bodzin.png`).
- "techno drums" does the same (12 → 12 steps).
- Ben Böhmer works (12 → 14-16 steps), because his default hats are a different kind.
- After you've asked for 16ths, "another one" goes back to galloping, gapped or 8th-plus-pickup hats. Bodzin: 9, 8 and 12 steps in a row.
- "124 bpm drums with 16th hats like Stephan Bodzin" gives "16th hats with gaps" (8 steps) on the very first try. "Another one" then gives 14, 16, 8, 14, 12 steps.
- On main, all of these give 16 of 16 every time.

**Cause:** `src/groove.js:221`
```
hatsAsked=!!rec.hatsAsked||(!!styleHats&&rec.hats!==styleHats)
```
`rec.hatsAsked` is never set anywhere (grep finds only this line). So hats the user names count as "asked" only when they differ from the style's default. Bodzin, techno and melodic techno default to `16th`, so a request for 16ths can't be told apart from the default, and the shape stays randomised.

**Fix idea:**
- `ACT.hats` should set `hatsAsked:true` in its recipe override (`src/actions.js`, assistant-dev's file).
- So should `add_drums` and `grooveOver` when the request names the hats.
- `groove.js` already honours the flag.

The new smoke line (below) catches this.

### 2. Whole-song MP3 smoke check: peak 0.00 dBFS in 1 of 3 runs · LOW for users, but a flaky blocking check
- Check run 2 failed with `whole-song MP3 of the Short layout, drums (decodes back, no clipping) · peak 0.00 dBFS`. Runs 1 and 3 passed, at -0.87 and -0.23 dBFS.
- That check uses house drums with a random seed.
- I couldn't reproduce it with 18 fixed house seeds through the same path (`makeSongMp3`, Short layout): decoded peaks were -0.39 to -0.78 dBFS. On main, 6 seeds gave -0.51 to -0.72.
- `makeSongMp3` normalises to -0.5 dBFS before encoding. The busier SE-8 grooves sometimes overshoot that by about 0.5 dB when decoded.
- Not load-related: offline rendering is deterministic, so only the groove changes from run to run.
- Fix ideas:
  - More headroom for the MP3 (-1 dBFS, the usual true-peak margin) in `src/studio.js` (studio-ux-dev).
  - Or a fixed seed in that smoke step (mine to do, if the lead prefers).

## Rough edges (not blocking)
1. **Stacked kicks, new on this branch.** "Ghost kicks" in non-four-on-the-floor styles can land on a step that already has the main kick. Then two kicks fire at the same moment (about 0.8 and 0.3 velocity).
   - Seen in pop, rock, synthwave, dnb, liquid, dubstep, UK garage and tech house.
   - Over 25 grooves per style: main has 0 doubled kicks; the branch has 1-30 per style.
   - Doubled hats are up too, from 6-24 to 36-72 in pop, rock and synthwave. Trap and drill had them already.
   - Audible effect is tiny (dnb peak -0.65 vs -0.72 deduped). But the reply then says "with ghost kicks" when no ghost kick can be heard.
   - Example: pop, seed 10774, steps 3 and 7 of every bar.
   - Where: `src/groove.js`, `V.ghostKick` against the kick pattern. Fix: skip ghost or pickup steps that already have a kick.
2. **Replies are long.** About 230-300 characters. The chip box under each reply repeats the whole description (already known from the daily session).
3. **Spoken replies after "another one" end with "Bassline next? …" every time.** Ten tries in a row means ten times the same suggestion.
4. **Not from SE-8 (same on main), for the record:**
   - "another one with less swing": the reply says "full triplet swing (about 66%)" inside the drum description, and then "Lighter: medium swing, about 58%".
   - "another one" drops a note you drew into the generated drums by hand.
   - Offline, "afro house drums" makes plain house drums ("afro drums" works).
   - Song mode: "another one" changes pattern A only, even when the Drop plays pattern B (AI-1's item).

## What I checked (numbers)

### check.sh
| Run | Load | Result | Time |
|---|---|---|---|
| 1 (branch as delivered) | about 2-4 | `CHECK OK`, `SMOKE OK: 48 checks` | 3 min 06 s |
| 2 (with my new line) | 4.6 | 2 FAIL: bug 1 (new line) and bug 2 (MP3 peak 0.00) | 1 min 44 s |
| 3 | 4.9 | 1 FAIL: bug 1 only | 2 min 49 s |

- The two save/reopen checks ("opening the app starts a new empty song", "Undo right after opening a song") passed in all 3 runs.
- SE-3 feel checks passed in all runs: hats lift on 2 and 4, "more swing" = 0.083 beat, the less-swing ladder, kick push -10.3 ms.
- New line on main: also FAIL. The kick and clap changed with the hats, and main never makes gapped hats. That's the bug SE-8 fixed, so the line pins both.
- Time: 3 min 06 s under load is just over the 3-minute budget. The machine was shared with other testers (load up to 11 on 2 cores).

### "Another one" ×10 per reference
Typed into the Keys box, Basic mode: the reference, then "another one" ×10, all in one song. That's 11 grooves and 55 pairs each. Similarity is Jaccard on drum@16th.

| Request | Worst pair | Mean | Worst without hats | Different replies | Tempo / kit | Kick on every beat | Peak / RMS (drums only, 4 bars) | Clipped |
|---|---|---|---|---|---|---|---|---|
| drums like Ben Böhmer | **0.70** | 0.47 | 0.63 | 10/10 | 122 BPM, Melodic House Kit (11/11) | 11/11 grooves | -0.67 to -0.81 / -6.4 to -6.6 dB | 0 |
| 124 bpm drums like Stephan Bodzin | **0.68** | 0.51 | 0.66 | 10/10 | 124 BPM, Deep Techno Kit (11/11) | 9/11 (2 with "a dropout on beat 4", as the reply says) | -0.64 to -0.77 / -5.6 to -5.9 dB | 0 |
| house drums | **0.72** | 0.48 | 0.63 | 10/10 | 124 BPM, 909 House Kit (11/11) | 10/11 (1 dropout) | -0.72 to -0.79 / -6.1 to -6.4 dB | 0 |

- Before the fix, the worst pair was 1.00 in all three: note-for-note repeats.
- The smoke runs' worst pairs: 0.65 / 0.74 / 0.64, 0.69 / 0.75 / 0.71 and 0.70 / 0.73 / 0.56.
- Always exactly 1 drums track. The groove memory grows 1 → 11.
- **Does each try sound clearly different?** (I counted which drum parts change from one try to the next, out of kick, clap/snare, closed hats, shaker, open hats, ride and percussion.)
  - Böhmer: 5-6 parts change each time. The kick changes in 8 of 10, and the clap, hats and percussion in 10 of 10.
  - Bodzin: 5-6 parts. Kick 8/10, open hats 10/10, ride 9/10.
  - House: 3-5 parts.
  - Hit counts swing a lot: Böhmer 111-174, Bodzin 99-143, house 65-103. So the density changes audibly, not only the details.
- **Still musical?** A sweep of 28 styles × 4 and 8 bars × 25 grooves (no audio) found:
  - The backbeat is on 2/4 (or 3 in half-time) in every bar of every style that has one. The styles with no 2/4 backbeat are organic house, afro, reggaeton and amapiano, the same on main.
  - A kick and a hat in every bar.
  - All velocities are in range.
  - No events outside the loop, except trap hat rolls ending exactly on the loop end (same on main).
  - At most 4-7 hits on one 16th.
  - The vibe holds: the first reply names the artist ("Ben Böhmer-style drums on Melodic House Kit"), and every later try keeps that tempo and kit. The "another one" replies say only "Drums: …".
- The AI path (mocked actions): `vary` ×10 gives a worst pair of 0.74. `add_drums` with Bodzin ×6 (asking for the reference again) gives 0.54, still with 1 drums track.

### Hats, swing and energy keep the groove
Same three references, after 2 tries each.
- "change the hats to 16ths": kick, clap and percussion are identical, event for event (3/3), and the seed is kept. House hats went from 20 to 56 closed-hat hits. Bodzin: bug 1.
- "more swing" → 66%: the 16th grid is identical (Jaccard 1.0) and the hit count is the same (3/3). "Less swing" → 58%: grid identical (3/3).
- "more energy": the kick is identical (3/3); the whole grid is 0.93-1.0 alike.
- Swing survives "another one" (0.333 → 0.333).

### Regressions near the change
- **Save and reopen.** After `saveNamed`, a new song and `loadNamed`:
  - The events, seed, description and groove memory (6 entries) are identical.
  - The same holds after a page reload and reopen.
  - A new song starts with empty memory.
  - 5 more "another one" after reopening came out 0.56-0.69 alike to the saved history, so the memory works across reopen.
- **Undo after "another one".** It restores the exact previous groove and seed, and the memory goes 3 → 2. Redo brings the new one back. Typing "undo" works too.
- **Song mode pattern B.** Short layout (Intro A, Drop B, Outro A), drums B made with `songMakeUnique` and edited. "Another one" changes A and leaves B untouched (105 notes), with 1 drums track. Same behaviour as main.
- **Loop lengths** (Bodzin, 10 tries each):
  - 8 bars: worst pair 0.79, mean 0.52.
  - 16 bars: worst 0.76, mean 0.53.
  - 0 events outside the loop. The kick is on every beat in 6-8 of 8 (or 14-16 of 16) bars; the missing ones are kick-drop fills and beat-4 dropouts.
  - 8-bar render: peak -0.58, RMS -5.8, LUFS -7.4, 0 clipped.
  - In 4-bar loops, the reply never says "every 8 bars" (0 of 700 grooves).
- **Other styles**, 1 + 10 tries each:

| Style | Worst pair | Mean | Different replies | Tempo, kit | Peak / RMS | Clipped |
|---|---|---|---|---|---|---|
| trap | 0.80 | 0.71 | 9/10 | 140, Trap Kit | -0.51 / -5.2 | 0 |
| drum and bass | 0.80 | 0.63 | 10/10 | 174, Stark Kit | -0.61 / -11.8 (sparse; not compared with main) | 0 |
| techno | 0.68 | 0.51 | 10/10 | 130, Deep Techno Kit | -0.54 / -5.7 | 0 |
| boom bap | 0.74 | 0.54 | 10/10 | 88, Hip-hop Kit | -0.73 / -11.2 | 0 |
| "afro house" (parsed as house, see rough edges) | 0.59 | 0.37 | 10/10 | 124 | -0.58 / -6.1 to -6.4 | 0 |

- **Speed.** A groove takes 0.3-8 ms (with up to 30 redraws). "Another one" on a 16-bar loop takes 8.8 ms. The memory caps at 24 grooves, about 11.5 KB in the song.
- No page errors in any of the 10 session scripts.

## Smoke test change (1599283)
New line after SE-8's own line: `"change the hats to 16ths" makes 16th hats and keeps kick, clap and percussion; "more swing" keeps the pattern`.
- For Bodzin and Böhmer it finds a fixed seed with gapped hats.
- It asks for 16ths: the closed and open hats must cover all 16 steps of bar 1, and everything else must be identical.
- Then "more swing": the 16th grid must be identical.
- It adds about 5 s. It FAILS now (bug 1). It will pass once the hats the user names stay as asked.

## Files
- Screenshots: `/tmp/qa/2026-11-15-se8/shots/`:
  - Bug 1: `p7-124_bpm_drums_like_Stephan_Bodzin.png`, `p7-techno_drums.png`
  - After 10 tries: `p1-drums_like_Ben_B_hmer-10.png`, `p1-124_bpm_drums_like_Stephan_Bodzin-10.png`, `p1-house_drums-10.png`
  - `p2-keep.png`, `p2-song.png`
- Raw data: `/tmp/qa/2026-11-15-se8/p1-r1.json`, `p2.json` (the keep tests are in `js/p2.out`), `p3-br.json` / `p3-main.json`, `p4.json`, `session.log`.
- Scripts: `/tmp/qa/2026-11-15-se8/js/`.
- Check logs: `/tmp/claude-0/-home-claude/ac717c87-a784-5c3e-b306-9aeb289d9946/scratchpad/check1.log`, `check2.log`, `check3.log`.
