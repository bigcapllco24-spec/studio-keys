# SE-3 re-check after fixes (qa-tester) · 13 Nov 2026

## Verdict: NOT READY (one medium regression from the B1 fix, small fix in `src/maker.js`)
All 5 fixes work. I replayed every original bug's steps and none of them happen any more.

The B1 fix opened a new hole of the same kind as B1:
- If the request names a part, or says "in the groove" or "in the hats", the offline parser now does more than swing the drums.
- Depending on the words, it adds new Chords or Melody tracks, rebuilds the bassline, rebuilds the beat, or turns 16th hats into 8ths.
- `main` only changed the drums' swing for the same words.

It only shows in Basic mode (AI off or failing). On the test link the AI picks the actions, so the owner can try the link meanwhile if you want. It needs fixing before release.

I added a smoke check for it and pushed it to the branch (**a572436**, `tests/smoke.mjs` only). It passes on `main` and fails on a5febff, so **check.sh now FAILS on the branch until this is fixed**. That is on purpose.

## Fixes: confirmed or not
Tested in headless Chrome through `handleRequest` with the offline parser. Each case starts from a fresh song. `main` was run the same way for comparison.

| Bug | What I tried | Branch result | Main result |
|---|---|---|---|
| **B1** swing swallowed the request | On a house beat: "add a bassline with some swing" | Bassline added + 66% | |
| | "add chords with a bit of swing" | Chords added + 54% | |
| | "add some congas with swing" | rims/congas/cowbell + 66%, one chip | |
| | "more swing and add a clap" | 66% | |
| | "make it faster and add more swing" | 124 → 129 BPM + 66% | |
| | **Fixed** | | |
| **B2** missing phrases | From 66%: "make it less swingy", "it swings too much" | 58% | "couldn't turn that into a change" |
| | "can you take the swing out", "take out the swing", "get rid of the swing" | straight | "couldn't turn that into a change" |
| | "swing 100%" | "Heavy swing, about 70% (the most it goes)" | "couldn't turn that into a change" |
| | "swing 100%" again | "Already at the most it goes: heavy swing, about 70%" | "couldn't turn that into a change" |
| | "make a deep house beat straight", empty song | swing 0 | 0.08 |
| | "make a deep house beat straight", over a beat | swing 0 | 0.08 |
| | **Fixed** | | |
| **B3** words vs numbers | From 70%, "a bit less swing" ×5 | 66 "full triplet" → 62 "strong" → 58 "medium" → 54 "light" → straight; the reply word matches the beat description each time | |
| | Style defaults | UK garage 59% and lo-fi 60% are both "medium swing" now (lo-fi was "strong") | |
| | **Fixed** | | |
| **Two chips** | Melodic house → "more swing" → "another one with less swing" | One chip: "Lighter: medium swing, about 58%; Drums: … medium swing (about 58%) …". Engine 0.16. | Two chips (66% and 58%) |
| | Mocked AI vary + groove "less" | One chip, 58% | Two chips |
| | Mocked AI vary only | One chip, 58% | |
| | Mocked AI groove `swing:0` for "less swing" | 58% | |
| | **Fixed** | | |
| **B5** no beat yet | Empty song: "more swing", "less swing", "make it straight", "add some swing" | "There's no beat yet. Say 'make a house beat' first." | generic "couldn't" reply |
| | "make a boom bap beat with lots of swing" | still makes the beat at 66% | |
| | **Fixed** | | |

Unchanged and correct:
- "swing 120 bpm" only sets the tempo.
- "go straight to the chorus" doesn't touch the swing.
- "another one" keeps 66% and gives a new groove.
- "harder" works.
- "more swing and make it harder" gives one chip with both changes.
- "make the groove swing more" now swings the drums (main made a new beat).

## New bugs

### N1 (medium, regression from the B1 fix): swing said about a part, or "in the groove/hats", changes or adds parts nobody asked for
- **Owner:** `src/maker.js` (`swingOnly` / `localBrain`). The B1 fix was written by sound-engine-dev; the file belongs to assistant-dev.
- **Steps:** Basic mode (opened as a file, or the AI fails). Say "make a house beat", "add a bassline" and "add chords". Then say each of the phrases below.
- **Expected:** only the drums' swing changes. That is what `main` does. Swing on the other parts themselves is B4, the follow-up item.
- **Actual:**

  | Said | What happens |
  |---|---|
  | "more swing on the chords" | Adds a new **Chords 2** track |
  | "more swing on the melody" | Adds **Melody 2** |
  | "more swing on the bass", "make the bass swing more", "less swing on the bass" | Re-runs `add_bass`, with the chip "Bassline on Pluck Bass…" and the generated bassline replaced. If the bass was **sung**, it adds a **second Bassline track** next to it. "less swing on the bass" with straight drums also says "Already straight". |
  | "more swing in the groove", "less swing in the drums" | Runs `add_drums` again. The chip reads "House drums on 909 House Kit: …", the groove is rebuilt (house test: 84 → 88 hits) and the user's hat choice (16ths) goes back to the style default. |
  | "less swing in the hats" | Swing goes down, and the hats switch from 16th-ghost or shuffled to **8th hats** (two chips) |

- **Cause:**
  - `swingOnly()` strips "on", but not "in", "for" or part names (bass, bassline, chords, melody, pad, keys, groove after "in").
  - So the leftover word goes through `brainCore`, which reads "bass", "chords" or "groove" as an add or new-beat request.
- **Suggested fix (for the dev):**
  - When swing words are present, treat part names and "in/for/into/to the" as filler (swing goes to the drums only).
  - Or only let `brainCore`'s add actions through when the request has an add verb.
- Every case can be undone (undo restores the bass and the drums).
- **New smoke line:** "swing said about a part or "in the groove/hats" only changes the drums' swing".
  - Branch: FAIL ("more swing on the chords": +1 track; "more swing in the groove" and "less swing in the hats": hats changed).
  - Main: PASS.

### N2 (low, regression from the new "faster/slower" phrases): "faster" said about a part changes the song tempo
- **Owner:** `src/maker.js`.
- **Steps:** a house beat with bass and chords at 124 BPM. Say "make the bass faster", "make the chords faster", "faster chords" or "make the melody faster".
- **Expected:** no tempo change. The user means that part's rhythm, so the assistant should do that or ask.
- **Actual:**
  - Tempo goes 124 → 129, and a part gets added or rebuilt as well (that part was already happening on main).
  - "a bit faster", "speed it up", "slow it down a lot" and "make it faster, 128 bpm" are correct (129, 129, 114, 128).
  - "the hats are too fast" / "make the hats faster" don't touch the tempo. They give 8th hats, as on main.

### N3 (low, regression from the new "add a snare" phrase): "add a snare roll" / "add a snare fill" swaps the clap for a snare on 2 and 4
- **Owner:** `src/maker.js`.
- **Steps:** a house beat (clap on 2 and 4), then say "add a snare roll".
- **Expected:** a snare roll or fill, or an honest "couldn't".
- **Actual:**
  - The backbeat changes to "snare on 2 and 4" and the fill doesn't change.
  - "add a snare sound to the keys" does the same.
  - Main replied "couldn't turn that into a change", which is better than an unasked change.
  - "add a clap roll" is harmless: the clap is already there.

### Pre-existing (also on main, not caused by the fixes; for the backlog)
- **P1 (low, `src/actions.js` groove):** after the drums are hand-edited (`gen` false), "more swing" changes nothing (0.16 stays 0.16, hats not moved), but the chip says "Medium swing, about 58%" as if it did something.
  - Main also did nothing, and showed a generic "Groove: …" chip.
  - Better: swing the edited hits, or say "your drums are hand-edited, so I left the swing" (like vary's "is your own part" reply).
- **P2 (low, `src/maker.js`):** phrases that still aren't understood. Same on main.
  - "another one, but straight" keeps 66%.
  - "can you swing the groove a bit more for me" rebuilds the drums with no swing change.
  - "add a clap" in an empty song gets the generic "couldn't" (could get the new no-beat reply).
- **P3 (cosmetic):** a joined reply capitalises mid-sentence: "Done: Bassline on Pluck Bass in A minor, Full triplet swing, about 66%." Main does the same with other chips.
- **P4 (also on main, `src/maker.js`):** "less swing on the drums and more reverb on the chords" puts the reverb change on the Drums at 0% ("Reverb on Drums: 0%"). The swing part now works.

## Producer session (Basic mode, fake mic, about 10 minutes)
- **Beat by reference:**
  - "make a beat like ben bohmer" gives Melodic House Kit, 122 BPM, 52%.
  - "another one" ×2 gives 3 of 3 different grooves.
  - Replies took 8–143 ms.
- **Parts:**
  - "a bit more swing" gives 56% "light swing". Main gave 0.2 with no word.
  - "add a bassline with some swing" gives Bassline + 66%.
  - "add chords" works.
  - "another one with less swing" gives one chip at 58%.
- **Sing the chords (fake mic `sing.wav`):**
  - During the take only the drums play.
  - 27 notes, all on the 1/16 grid, in a "Sung chords" track.
  - The mic turns off after, there's no raw audio track, and the swing (58%) is unchanged.
  - Same as main.
- **Edit (real mouse and keys in the Bassline editor):**
  - A click draws a note (16 → 17).
  - Ctrl+A selects 17 and Ctrl+C / Ctrl+V pastes 17 more. The song doubled to 8 bars with a toast, which is expected.
  - Ctrl+Z undoes the paste (34 → 17).
  - Velocity drag 0.90 → 0.39, and Ctrl+Z gives back 0.90.
- **Hand-edited drums, then "more swing":** see P1. "undo" works ("Undid the last change").
- **Save, new song, reopen:** every track and note count kept (Drums 168, Bassline 17, Chords 20, Sung chords 27), swing 0.16 kept, 122 BPM. "less swing" after reopening gives 54%.
- **Levels:** offline render of the whole song, 7.9 s.

  | | Peak | RMS | Clipped samples | Silent gaps |
  |---|---|---|---|---|
  | Branch | −0.61 dBFS | −6.46 dB | 0 | none |
  | Main | −0.50 dBFS | −6.50 dB | | |

- **Errors:** 0 page errors. The only console error is the blocked network fetch (`ERR_TUNNEL_CONNECTION_FAILED`), which is the same on main.
- **Screenshots:** the layout is fine; the chat chips read cleanly ("Heavy swing, about 70% (the most it goes)", "Already at the most it goes…").

## check.sh
- **On a5febff (as delivered): CHECK OK, smoke 24/24, 71 s.**
  - Build, bundle syntax and Worker syntax pass.
  - The SE-3 lines give: hats 2/4 0.79 vs 1/3 0.70, lag 0.083 beat, ladder 58 → 54 → straight, kick −9.6 ms, AI-on 0.16, B1 +1 bass at 0.333.
- **On a572436 (with my new line): CHECK FAILED, smoke 24/25, 57 s.** The only failure is the new N1 check. It passes against `main`'s build, so it is a real regression guard.

## Last commit on the branch
`a572436` QA: smoke check that swing said about a part or "in the groove/hats" only swings the drums. It is on top of the developer's `a5febff` and is pushed to `origin/preview-se-3`.

## Files
- Screenshots: `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/qa/shots/`
  - `branch-1-beat.png`, `branch-2-parts.png`, `branch-3-singing.png`, `branch-4-after-sing.png`
  - `branch-5-editor.png`, `branch-6-reopened.png`, `branch-7-velocity.png`, `branch-8-chat.png`
  - `main-*` counterparts
- Chip screenshots: `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/qa/branch-chips.png`, `main-chips.png`
- Raw results:
  - Fix replay: `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/qa/branch.json`, `main.json` (71 cases)
  - Probes: `p2-branch.json`, `p2-main.json`
  - Session: `shots/branch-session.json`, `shots/main-session.json`
- Scripts, in the same folder: `fixes.mjs`, `probe2.mjs`, `p3.mjs`, `session.mjs`, `vel.mjs`, `chipshot.mjs`
- Worktree: `/home/claude/wt/qa-se-3` (detached at a572436)
