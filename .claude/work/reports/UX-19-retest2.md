# UX-19 final check (fix 1b + 1c) · qa-tester · 22 Nov 2026

**Verdict: NOT READY.** Everything the brief listed passes. The new relative-key relabel from fix 1c, though, leaves the label naming a different tonic from the notes, and the next pick moves from the label:
- Try step 3, as the dev wrote it ("Pick C major … Pick A major: nothing moves"), actually drops the song 3 semitones.
- C major followed by D minor lands the notes in B minor under a "D minor" label (63% in key).

This is a small fix, and the Try list then works as written.

Branch `preview-ux-19` at 1204291, clone `/home/claude/sk-ux19t` (clean, nothing committed). Load 0.2-1.6.

## Problem

1. **After a relative-key relabel, the next pick moves from the label instead of from the notes.** (studio-ux-dev, `src/studio.js` `setKey`)

   **Case A, Try step 3 as written:**
   1. New song. Offline Keys: "make a house beat", "add a bassline", "add some chords". The loop is in A minor, Key menu on auto.
   2. Pick "C major". The notes don't move; the toast says "Key set to C major, notes unchanged". Correct.
   3. Pick "A major". **Actual:** "Moved the notes down 3 semitones into A major". The bass now centres on F♯, and only 63% of the notes are still in A minor. **Expected (and what the Try step promises):** nothing moves, because A is the notes' root.
   4. Then pick "D minor". The total move is +2 and only **63%** of the notes are in D minor. The notes are in B minor.

   **Case B:** a fresh loop, pick C major, then D minor. The toast says "Moved the notes up 2 semitones into D minor", and 63% of the notes are in D minor (B minor notes). This is the same whether the C major was picked from auto or from a set A minor.

   **Case C:** C major, then "Key: auto", then D minor: also +2 and 63%. Going back to auto saves the label C major as `genKey`. The scale share ties C major with A minor (same notes), so `genKey` wins, and auto doesn't re-read the A minor root.

   **Why:** `from` is the label (`PROJ.key`, or `genKey` after going back to auto). After a relative relabel, the label's tonic is no longer the notes' tonic, and the tonic rule then moves by the wrong distance.

   **Suggested fix:** remember the key the notes are in, separately from the label. For example, `PROJ.noteKey`:
   - When the notes move, set it to `{tonic: k.tonic, mode: from.mode}`. A mode change keeps their mode, per the tonic rule.
   - A relative relabel leaves it unchanged.
   - Going back to auto stores it as `genKey`, not the label.
   - `setKey` moves from it and checks the relative case against it.

   The sequence above then gives:

   | Pick | Moves | Notes end up in |
   |---|---|---|
   | C major | 0 | A minor |
   | A major | 0 | A minor |
   | D minor | +5 | D minor (100%) |

   Smoke line to add: auto A minor loop, then C major, then A major (0), then D minor (+5, 100%). Also: C major, then auto, then D minor (+5).

   For comparison, here is the tonic rule from fix 1, which works as you decided: an A minor loop with A major picked (0), then D major, gives +5. The notes are in D minor (100%) under the label D major (56% in D major). That's the accepted "label major, notes minor" case, not this bug.

## What passed (the brief's list)

- **check.sh:** CHECK OK, SMOKE OK 94, no FAIL, 2m25s. The reload-pair flake the dev saw did not show up.
- **Stale-key case** (generated parts removed, own C major melody, pick D major): **+2, 100% in D major**, toast "Moved the notes up 2 semitones into D major".
- **Relative-key pick as a single step:**
  - From auto, C major on the A minor loop: 0, "Key set to C major, notes unchanged".
  - From a set A minor: 0, same toast.
  - A D minor loop with F major picked: 0, "Key set to F major, notes unchanged".
  - The problem is only the pick after it (above).
- **Bass-only seeds, D minor:** afro 71 and house 81 both moved **+5, 100% in D minor**, toast "Moved the notes up 5 semitones into D minor".
- **16 random owner flows** (menu D minor): **16/16** moved +5, 100% in D minor, drums unchanged. They covered every progression the generator used, including 4 × 0656 and 2 × 0365.
- **Sung bass** (fake mic, 13 notes):
  - "add house drums in F minor": **0**, label F minor.
  - The batch [key, vibe]: 0.
- **Render** (owner-flow loop, D minor):
  - Chroma shift measured at +5, matching the note change.
  - Pitched parts: peak -1.0 dBFS before, -1.2 after.
  - Full mix: peak -0.5 dBFS, RMS -6.6 dB, **0 clipped**, 0% silence.
- **Page errors:** none. The only console error is the sandbox's blocked network fetch.

## Try list (final, valid once problem 1 is fixed; as written today, step 3 fails)

1. Start a new song. Tell Keys "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. A note says the notes moved up 5 into D minor. Play it: the bass and chords sound right together in the new key, and the drums didn't change. Press Undo once, and it's back as it was, on "Key: auto".
3. Pick "C major", which uses the same notes as A minor. Nothing moves, and the note says "Key set to C major, notes unchanged". Then pick "A major": nothing moves (same root note). Then pick "D minor": the notes move up 5 into D minor.
4. Remove the bass and chords, then play or draw your own C major tune on a new track. Pick "D major": your tune moves up 2 and fits D major.
5. On a new song, sing a bassline, then tell Keys "add house drums in F minor". Your sung notes stay exactly as you sang them; only the key label changes.
6. Make it a full song and zoom out in Song view. In short drum parts, the "no clap…" label shows its start and ends in "…", disappears when a part gets very narrow, and the full text is always in the hover tooltip.

## Files

- Results: /home/claude/qa-ux19/rf.json and /home/claude/qa-ux19/rseq.json (the Try step 3 replay).
- Scripts: /home/claude/qa-ux19/r_final.mjs and /home/claude/qa-ux19/r_seq.mjs.
- Screenshots: /home/claude/qa-ux19/shots/f-render-dminor.png and /home/claude/qa-ux19/shots/f-try3-amajor.png.
- check.sh log: /home/claude/sk-ux19t-recheck3.log.
