# AI-9 re-check 7 (fix 7) · qa-tester · 22 Nov 2026 · preview-ai-9 @ 3e1639f

## Verdict: NOT READY (one problem, plus one flaky smoke check)
Fix 7 does what its report says. **Every earlier set passes in full:**
- p 52/52, new 96/96, probe 87/87, probe2 13/13, probe3 42/42, probe4 20/20, probe5 32/32;
- r5 143/143, r6 108/108, probe6 30/30;
- full 4/4, hq 8/8, hq6 12/12 (bubble text checked), q5 4/4;
- sung 18/18 three times with the same take;
- nits 12/13 (the accepted wording), hr 5/5, hr2 3/3, old 180/180;
- chains 81/81, chainC 24/24.

Nothing in those sets that main does right is blocked.

My 34 new phrasings aimed at fix 7 pass the important parts:
- Negation-shaped requests run: "dont you think the bass should be louder", "why dont we try new chords", "cant we make the drums busier", "no wait make it louder", "not bad but the chords need work", "isnt the bass a bit too loud".
- Hinglish par / lekin / bas works.
- "too full" works on the AI path.
- Yes and no after a question work, including "why not", "no problem go ahead" and "haan kyun nahi".

One thing still blocks. It's a problem a musician will hit mid-session, and it also lives in fix 6 (my re-check 6 set never worked on a part first):

**After you've just worked on a part, "change it all except the bass" or "redo it all except the chords" changes only the part you just worked on. That can be the very part you said to keep.** On the AI path it also blocks Llama's correct actions, which main runs for "redo it all except the chords".

## Problem (blocking)
Setup: a new song, then a house loop of drums, bass, chords and melody (seeds 5300 to 5303). "AI" means the shown Llama actions are stubbed through `handleRequest`.

1. **HIGH (AI path; "redo it all except the chords" is worse than main): "it all" after working on a part is read as that part.**
   - Steps: "make the bass quieter", then **"change it all except the bass"**.
     - AI [vary drums, vary chords, vary melody]: **only the bass changes** ("Done: Bassline: a new bassline …"). That is the one part the user excluded (screenshot `r7shot-fail.png`).
     - Offline does the same.
   - Steps: "make the melody louder", then "change it all except the bass": only the melody changes. AI and offline are the same.
   - "redo it all except the chords":
     - after the bass: only the bass changes;
     - after the melody: only the melody changes;
     - **main runs the AI's [vary drums, vary bass, vary melody] correctly.**
   - "redo it all apart from the bass":
     - after "give me new chords": only the chords;
     - after "make the melody louder": only the melody;
     - after "make the bass quieter everything else is fine": **only the bass**.
   - "make it all new apart from the melody" is the same.
   - These work in every context: "redo everything but the drums", "new everything except the chords", "sab kuch naya karo bass chhod ke" (AI), and every "it all" phrase in a fresh song.
   - Main gets the "change it all except the bass" cases wrong too: it changes all four parts, bass included. But it never changes only the excluded part, and it runs "redo it all except the chords" correctly.
   - Should happen: "it all / all of it / everything" never resolves to the focus part. "X it all except Y" changes every part except Y.
   - Likely cause: `focusText` (`src/maker.js`) or the pronoun step in `askedParts` (`src/actions.js`) turns "it" into the part just worked on before "all" is seen. That then drives both the offline parser and the guard. assistant-dev.
   - **Smoke lines:**
     - "make the bass quieter", then "change it all except the bass" [vary drums, vary chords, vary melody]: the drums, chords and melody change, and the bass doesn't.
     - "make the melody louder", then "redo it all except the chords" [vary drums, vary bass, vary melody]: the drums, bass and melody change.

## Flaky smoke check (fix before release; not a product bug)
- "AI-9 fix 4 …" failed once in 4 branch runs this round: 2 check.sh runs plus 2 smoke runs. The detail was `"end":""`. Its offline half, "nah the melody is too busy make it simpler the drums are good though", changed nothing.
- In the smoke's running song, the melody is regenerated without a seed before this step, so sometimes it's already at its simplest and "simpler" has nothing to do.
- The developer saw the same thing on the AI half in fix 4.
- Because any FAIL blocks a release, the check should seed that melody, or accept "already as simple as it goes". I own `tests/**`, but I'm leaving it to the developer, since it's their sub-check. Tell me if you want me to fix it.
- The same round also had one "after typing to Keys, double-click a part … gives the editor the keys" FAIL at load 7.5. That's editor timing under load, not AI-9 code.
- **Extra runs:** 3 more smoke runs at low load all passed (104 checks). That makes the fix-4 sub-check fail 1 of 7 branch runs this round, and 0 times in 14 earlier runs.

## Nits (not blocking; main does the same)
- **"not now"** and **"nahi nahi rehne do"** after a question, when Llama wrongly sends the action anyway: the melody is simplified.
  - Main shows no change here only because it can't simplify the melody at all.
  - "no", "no thanks", "nah leave it" and "nahi rehne do" are stopped.
- **"bass badhiya hai bas mat chhedo"** ("great, just don't touch it"): the bass is regenerated offline, and a Llama [vary bass] goes through.
- **"never mind the drums change the bass"**: new drums as well as the new bass, offline and with a Llama extra.
- **"the bass sounds full and warm"**: offline makes the bass warmer (EQ), and a Llama [vary bass] goes through. "the bass sounds so full now" is fine.
- **"the chords sound way too full"** offline adds a Chords 2 track. The AI path is right.
- **Known limits:** "which instrument is playing the chords" lists the chord names. The offline wording "Melody: shorter, tighter notes" is fine.

## What I checked (numbers)
Everything is in `/home/claude/qa/ai9r4/`:
- harness `q.mjs`, with the saved take `sung-take.json`;
- new cases: `mk7.py` → `r7.json`, plus `redo.json`, `redo2.json` and `try7.json`;
- outputs: `*-br7.txt`, `r7-main.txt`, `redo*-main-out.json`;
- comparison builds: `fix4build/`, `fix5build/`, `fix6build/`.

Main is origin/main 884c8e4 (no product changes since b442b1e). Each step diffs every track and expects exactly one Undo step, with Undo and Redo exact. No change must leave no Undo step.

- **check.sh:**

  | Run | Result | Time |
  |---|---|---|
  | 1 | CHECK OK, SMOKE OK 104 | 2m20s |
  | 2 | CHECK OK, SMOKE OK 104 | 2m23s |

- **Side-by-side smoke runs (load 6 to 10):**
  - Branch: round 1 OK; round 2 had 2 FAILs (the flaky check above, plus the editor-keys check at load 7.5).
  - Main: 2 of 2 OK.
  - The reload pair passed every time.
- **Every earlier set on fix 7:** all of the numbers listed in the verdict above.
- **New: `r7.json`, 34 phrasings, 81 steps. Branch 72/81, main 46/81.**
  - Negation-shaped requests: 14, all run offline and on the AI path, with Llama extras on other parts dropped:
    - "dont you think the bass should be louder"
    - "why dont we try new chords"
    - "cant we make the drums busier"
    - "no wait make it louder" (after the melody)
    - "not bad but the chords need work"
    - "wouldnt it be cool if the melody was on a flute"
    - "isnt the bass a bit too loud"
    - "dont be shy make the drums hit harder"
    - "i dont know maybe try a darker bassline"
    - "the drums arent loud enough"
    - "the melody doesnt hit hard enough make it louder"
    - "dont stop now give me a new melody"
    - "no no the other chords were better go back"

    The miss is "never mind the drums change the bass" (nit).
  - Hinglish par / lekin / bas: 7, and 6 pass:
    - "bass toh mast hai par chords thode boring hai" (the bass is kept)
    - "melody theek hai lekin drums thode slow lag rahe hai"
    - "sab acha hai bas melody thodi loud hai"
    - "drums mast hai par bass thoda kam karo"
    - "chords acche hai par melody bekar hai nayi do"
    - "drums acche hai par thode aur loud karo"

    The miss is "bass badhiya hai bas mat chhedo" (nit).
  - "too full" / "full": "the bass is too full" and "the bass is full but a bit muddy" are right. "the chords sound way too full" is right on the AI path. "the bass sounds full and warm" is a nit.
  - After "Want me to make the melody simpler?" (shown in full):
    - "no wait actually yes", "why not", "no problem go ahead", "no doubt do it" and "haan kyun nahi" simplify the melody;
    - "not sure what do you think" changes nothing;
    - "no not the melody make the drums simpler" changes only the drums;
    - "not now" and "nahi nahi rehne do" with a Llama mistake are nits.
  - The only steps where the branch is worse than main are "not now" and "nahi nahi rehne do" with a Llama mistake. Those are artefacts: main can't simplify a melody at all.
- **`redo.json` and `redo2.json` (the problem):**
  - Fresh song: "it all" phrases pass.
  - After working on a part: "change it all / redo it all / make it all new except X" pass 0 of 16 steps.
  - Fix 6 fails the same way.
- **Try-style chains (`try7.json`, 3 seeds):**
  - AI chain: 10 steps × 3, all right. It covers "the bassline is sick dont touch it try new chords", "make the bass quieter everything else is fine", "drums acche hai par thode loud hai", "dont change a thing except the melody make it louder", a question then "no thanks i like it", then "actually make the melody simpler", a question then "yes do it", and "this sounds amazing".
  - Offline chain: 8 steps × 3. Only "redo it all apart from the bass" misses, which is the problem above.
- **Sound** (renders at the end of the 9 chains):

  | Measure | Range |
  |---|---|
  | Peak | −0.35 to −0.58 dBFS |
  | RMS | −6.6 to −7.0 dB |
  | Clipped samples | 0 |
  | Silent 100 ms blocks | 0 of 77 |

  The Try chains measure −0.53 to −0.70 dBFS and RMS −8.1 to −9.2 dB, quieter because of the volume steps in them.
- **Page errors:** 0 in every run.

## Screenshots (`/home/claude/qa/ai9r4/`)
- `r7shot-good.png`:
  - "drums acche hai par thode loud hai" with a Llama extra: only the drums go down;
  - the question "Want me to make the melody simpler?", then "no thanks i like it": nothing changes;
  - "dont you think the bass should be louder": the bass goes up.
- `r7shot-fail.png`: "make the bass quieter", then "change it all except the bass" gives "Done: Bassline: a new bassline".
