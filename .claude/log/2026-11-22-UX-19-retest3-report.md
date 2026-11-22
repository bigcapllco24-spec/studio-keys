# UX-19 re-check 3 (fix 1d) · qa-tester · 22 Nov 2026

**Verdict: READY.** Key picks now move from the key the notes are in. Every sequence from my last report lands correctly:
- auto, then C major, A major, D minor: moves 0, 0, +5, ending 100% in D minor.
- C major, then auto, then D minor: moves +5.

Undo and redo bring back the notes, the label and `noteKey` at every step. Everything else on the list passes too.

There is one decision for the lead. The new rule ("a key inside a part request never moves notes, even when a key is set") works as designed, but it makes a new part clash with the old ones on generated loops (6 of 20 melody notes in my test). On `main` the old parts moved with it. See note 1. It is not a blocker.

Tested on `preview-ux-19` at ebdffc1 in `/home/claude/sk-ux19t` (clean, nothing committed). Load was 0.5-1.4.

## Note for the lead (behaviour change, not a blocker)

1. **A key named inside a part request now leaves the old parts in the old key, even on generated loops with a key already set.**
   Steps:
   1. Owner flow: house beat, bassline and chords.
   2. Pick A minor in the menu.
   3. Type "add a melody in F minor" (offline this parses to key + add_melody).

   Result:
   - The label changes to F minor. The bass and chords stay in A minor (moved 0).
   - The new melody is written 100% in F minor, which is only 50% in A minor.
   - **6 of 20 melody notes sit a semitone against the bass or chords sounding under them.**

   On `main`, the set key moved every part to F minor first, so the result was coherent. With sung parts this is exactly the owner rule, and sung parts stay put: 0 moves on auto and with a set key.

   **Option:** for a key named inside a part request, move only generated parts (`t.gen`) and never the user's own or sung ones. That keeps the owner rule and avoids the clash. Otherwise, keep it as is, and Keys could add "your other parts stay in A minor" to its reply.

## What passed

- **check.sh:** CHECK OK, SMOKE OK 94, no FAIL, 2m26s. No flakes.
- **Sequence 1** (auto A minor loop, prog 0526), Key menu picks:

  | Pick | Moves | Label | `noteKey` | Notes | Toast |
  |---|---|---|---|---|---|
  | C major | 0 | C major | A minor | 100% A minor | "Key set to C major, notes unchanged" |
  | A major | 0 | A major | A minor | — | "Key set to A major, notes unchanged" |
  | D minor | +5 | D minor | D minor | 100% D minor | "Moved the notes up 5 semitones into D minor" |

  - Undo ×3 steps back through A major, then C major (`noteKey` A minor both times), then auto (`noteKey` none), with the menu matching each time.
  - Redo ×3 steps forward through C major, A major and D minor (+5), with the notes, label, `noteKey` and menu all matching.
- **Sequence 2:** C major, then auto (`noteKey` stays A minor), then D minor: **+5**, 100% in key. Undo gives auto with the notes as before. Redo gives +5 again.
- **More sequences:**
  - D minor, then F major (relative): 0, with "notes unchanged". Then G minor: +5 more from D minor, 100% in G minor.
  - Tonic rule: A major (0), then D major (+5). The notes are in D minor under a D major label; this is the accepted case. Then A minor brings the total back to 0.
- **Save and reopen:**
  - Picking C major on an A minor loop, then saving, opening another song and reopening it keeps the label C major and `noteKey` A minor.
  - Picking D minor after that: **+5**, 100% in D minor.
- **16 random owner flows** (menu D minor): **16/16** moved +5, 100% in D minor, drums unchanged. They included 3 × prog 0656.
- **Stale-key case** (generated parts removed, own C major melody, pick D major): +2, 100% in D major.
- **Bass-only seeds, D minor:** afro 71 and house 81 both moved +5, 100% in D minor.
- **Sung bass** (fake mic, 9 notes):
  - "add house drums in F minor" on auto: 0.
  - [key, vibe] and [vibe, key]: 0 in both orders.
  - After the vibe set the label to F minor, picking G minor read the sung notes as A minor and moved them -2 into G minor (100% in key). The label is no longer used as the starting point.
  - With the key set to D minor (+5, 100%), "add house drums in F minor" moved 0. Then "put it in the key of G minor" moved +5, `noteKey` G minor.
- **Song mode with patterns** (Drop 2 with pattern B), pick G minor:
  - The main loop and pattern B (64 notes) both moved -2, 100% in G minor; the drums were unchanged and it stayed in Song mode.
  - Drop 2 render: peak -0.5 dBFS, 0 clipped.
  - Undo brought back the notes and patterns, and the label returned to auto.
- **Render** (owner-flow loop, D minor):
  - Chroma shift measured at +5, matching the note change.
  - Pitched parts: peak -1.0 dBFS before and after.
  - Full mix: peak -0.5 dBFS, RMS -6.6 dB, **0 clipped**, 0% silence.
- **Page errors:** none. The only console error is the sandbox's blocked network fetch.

## Final Try list

1. Start a new song. Tell Keys "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. A note says the notes moved up 5 into D minor. Play it: the bass and chords sound right together in the new key, and the drums didn't change. Press Undo once, and it's back as it was, on "Key: auto".
3. Pick "C major", which uses the same notes as A minor. Nothing moves, and the note says "Key set to C major, notes unchanged". Then pick "A major": nothing moves either (same root note). Then pick "D minor": the notes move up 5 into D minor.
4. Remove the bass and chords, then play or draw your own C major tune on a new track. Pick "D major": your tune moves up 2 and fits D major.
5. On a new song, sing a bassline, then tell Keys "add house drums in F minor". Your sung notes stay exactly as you sang them; only the key label changes.
6. Make it a full song and zoom out in Song view. In short drum parts, the "no clap…" label shows its start and ends in "…", disappears when a part gets very narrow, and the full text is always in the hover tooltip.

## Files

- Results: /home/claude/qa-ux19/rd.json
- Script: /home/claude/qa-ux19/r_d.mjs
- Screenshot: /home/claude/qa-ux19/shots/g-render-dminor.png
- check.sh log: /home/claude/sk-ux19t-recheck4.log
