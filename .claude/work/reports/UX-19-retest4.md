# UX-19 re-check 4 (fix 1e) · qa-tester · 22 Nov 2026

**Verdict: READY.**
- "add a melody in F minor" now moves Keys' bass and chords into F minor first, whether a key was set or not. Every note of the song is 100% in F minor, and the melody sits with the other parts as well as a normal same-key melody does.
- Sung parts never move.
- The fix-1d sequences, undo and the 16 owner flows all still pass.

One follow-up for later, not a blocker: in a mixed song (sung bass plus Keys' chords), a key named inside a part request moves the chords away from the sung bass. The dev listed this as a known limit, and Keys' reply says the sung bass stayed. Details below.

Branch `preview-ux-19` at 2a9e73a, clone `/home/claude/sk-ux19t` (clean, nothing committed). Load was 0.3-2.

## Follow-up (low; not in the Try list; Keys says what happened)

1. **Mixed song: the chords move away from the sung bass.**
   Steps:
   1. Sing a bassline (fake mic, 11 notes, A minor).
   2. Ask Keys for chords (generated, A minor).
   3. Pick A minor in the Key menu.
   4. Type "add a melody in F minor".

   What happens:
   - The chords move -4 into F minor. The sung bass stays as sung, and the label changes to F minor.
   - Chords sounding a semitone against the bass go from **2 of 48 to 10 of 48**. The new melody is 5 of 20 against the bass and 1 of 20 against the chords.
   - Reply: "Key F minor, Keys’ parts moved down 4 semitones, your sung bassline stays as you sang it, Melody (new track)…".
   - One Undo brings back the chords and A minor, and the melody is gone.

   **Option for later:** when a user part would be left behind, keep everything where it is, write the new part in the notes' key, and have Keys say "your sung bassline is in A minor, so I kept A minor; pick F minor in the Key menu to move everything".

## What passed

- **check.sh:** CHECK OK, SMOKE OK 94, no FAIL, 2m28s.
- **The decision case:** 8 owner flows, 4 with A minor set first and 4 on auto, then "add a melody in F minor".
  - The bass and chords moved -4 every time, and every note of the song was 100% in F minor.
  - My semitone-clash count was 0-3 per melody of about 20 notes (0, 1, 1, 1, 2, 3, 3, 3).
  - **Baseline:** "add a melody" with no key named, everything in A minor, gives 1-3 per melody (1, 1, 1, 2, 2, 2, 2, 3). The remaining clashes are in-key passing notes, at the same level as the baseline. Before fix 1e it was 6 of 20.
  - Reply: "Key F minor, notes moved down 4 semitones, Melody (new track)…".
- **Sung bass only:**
  - "add house drums in F minor": 0 moved on auto, and 0 with A minor set. Reply: "…Key F minor, your sung bassline stays as you sang it, House drums…".
  - [key, vibe] and [vibe, key]: 0 in both orders.
- **Fix-1d sequences:**
  - C major → A major → D minor: 0, 0, +5, 100% in D minor, with `noteKey` A minor, then A minor, then D minor.
  - Undo ×3 goes back through A major, C major, then auto (`noteKey` none). Redo ×3 gets back to +5, 100%.
  - C major → auto → D minor: +5, 100%.
- **Try steps 3 and 4 in one song** (C major, A major, then "add a melody in F minor"): the bass and chords moved -4, everything is 100% in F minor, and the melody had 3 of 20 clashes (baseline level).
- **Key-only:** "put it in the key of F sharp minor" moved -3, `noteKey` F♯ minor.
- **16 random owner flows** (menu D minor): **16/16** moved +5, 100% in D minor, drums unchanged. They included 3 × prog 0656 and 1 × 0365.
- **Render** (A minor set, then "add a melody in F minor", full mix): peak -0.5 dBFS, RMS -6.7 dB, **0 clipped**, 0% silence.
- **Page errors:** none. The only console error is the sandbox's blocked network fetch.

## Final Try list

1. Start a new song. Tell Keys "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. A note says the notes moved up 5 into D minor. Play it: the bass and chords sound right together in the new key, and the drums didn't change. Press Undo once and it's back as it was, on "Key: auto".
3. Pick "C major", which uses the same notes as A minor. Nothing moves, and the note says "Key set to C major, notes unchanged". Then pick "A major": nothing moves either (same root note).
4. Now tell Keys "add a melody in F minor". The bass and chords move to F minor first, and the new melody plays along with them in the same key.
5. On a new song, sing a bassline, then tell Keys "add house drums in F minor". Your sung notes stay exactly as you sang them, and Keys says so; only the key label changes.
6. Make it a full song and zoom out in Song view. In short drum parts, the "no clap…" label shows its start and ends in "…", disappears when a part gets very narrow, and the full text is always in the hover tooltip.

## Files

- Results: /home/claude/qa-ux19/re.json
- Scripts: /home/claude/qa-ux19/r_e.mjs, /home/claude/qa-ux19/r_base.mjs
- Screenshots: /home/claude/qa-ux19/shots/h-mixed-reply.png, /home/claude/qa-ux19/shots/h-render-melody-f.png
- check.sh log: /home/claude/sk-ux19t-recheck5.log
