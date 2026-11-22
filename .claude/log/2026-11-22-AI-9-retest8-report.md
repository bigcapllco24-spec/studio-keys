# AI-9 re-check 8 (fix 8) · qa-tester · 22 Nov 2026 · preview-ai-9 @ 5210af0

## Verdict: READY
Fix 8 closes the re-check 7 blocker: "it all" / "the whole thing" after working on a part now means the whole song. A real "it" still means the part just worked on.

Every set I've built across re-checks 4 to 8 passes in full:
- r7 81/81, redo 20/20, redo2 20/20, try7 54/54;
- r6 108/108, probe6 30/30, full 4/4, hq6 12/12 (bubble text checked);
- p 52/52, new 96/96, probe 87/87, probe2 to probe5 all full, r5 143/143;
- hq 8/8, q5 4/4, sung 18/18, hr 5/5, hr2 3/3, old 180/180;
- chains 81/81, chainC 24/24;
- nits 12/13 (the accepted offline wording).

None of them shows anything main does right that the branch blocks.

check.sh passed **3 of 3** (104 checks), and the seeded fix-4 sub-check didn't flake.

My 30 new phrasings around "it" vs "it all", and around the fix-8 nits, found nothing a musician would hit that main doesn't also have. With Llama's correct action, every one is right. What's left only happens with a Llama mistake, or offline, and main does the same or worse there. Those are listed as nits for a follow-up.

## What I checked (numbers)
Everything is in `/home/claude/qa/ai9r4/`:
- harness `q.mjs`, with the saved sung take;
- new cases: `mk8.py` → `r8.json`, plus `it8.json` and `try8.json`;
- outputs: `*-br8.txt`, `r8-main.txt`;
- comparison builds: `fix6build/` and `fix7build/`.

Main is origin/main c6a34df (no product changes since b442b1e). Each step diffs every track and expects exactly one Undo step, with Undo and Redo exact. No change must leave no Undo step.

- **check.sh:**

  | Run | Result | Time |
  |---|---|---|
  | 1 | CHECK OK, SMOKE OK 104 | 2m25s |
  | 2 | CHECK OK, SMOKE OK 104 | 2m23s |
  | 3 | CHECK OK, SMOKE OK 104 | 3m16s, with my Try chain running alongside |

  - No rebuild note, and no flakes.
  - The fix-4 sub-check is now seeded, and the reload pair passed in all 3 runs.
  - Run 3 went over the 3-minute target only because of the extra load.
- **Every earlier set on fix 8:** all full, as listed under the verdict. sung was 18/18 with the one saved take.
- **New: `r8.json`, 30 phrasings, 69 steps. Branch 61/69, main 38/69.** The branch is better in 23 steps and **worse in none.**
  - A real "it" after working on a part, offline and AI, means that part (8 phrasings):
    - "make it a bit warmer"
    - "actually bring it back up"
    - "give it more reverb"
    - "can you make it punchier"
    - "put it on an 808"
    - "swap it for something else"
    - "keep it but make it shorter"
    - "uska volume thoda kam karo" (AI; offline is a nit)
  - "it all" / "the whole thing" means the song (10 phrasings). These are right on the AI path, and offline where noted:
    - "now make it all a bit louder"
    - "turn it all down except the bass" (the bass stays)
    - "is it all in key" (an answer, no change)
    - "it is all good except the melody change it" (only the melody; "it" here means the melody)
    - "make it all darker apart from the drums"
    - "the whole thing needs more energy"
    - "leave it all as is"
    - "sab kuch thoda loud karo"
  - Nit follow-ups: these are right, offline and with a Llama mistake:
    - "drums ekdum mast hai bas rehne do"
    - "never mind about the chords give me a new melody"
    - "the drums sound tight and punchy"
    - "the melody has way too much going on" (simpler)
    - "never mind make the drums louder"
    - "the bass is too thick"
    - After "Want me to try brighter chords?": "maybe later" keeps everything, and "go for it" / "later maybe try it now actually" give brighter chords.
- **`it8.json`** (offline volume with "it" after a part): branch 6/16, fix 7 6/16, main 0/16. See nit 3.
- **Try chain (`try8.json`):** the 8 Try steps below, 3 seeds, offline (8 steps) and AI (10 steps, with Llama extras): **54/54.**
- **Sound:**

  | Renders | Peak | RMS | Clipped samples | Silent 100 ms blocks |
  |---|---|---|---|---|
  | Ends of the 9 chains | −0.42 to −0.50 dBFS | −6.7 to −7.0 dB | 0 | 0 |
  | Try chains (quieter after the volume steps) | −0.63 to −0.71 dBFS | −8.1 to −9.4 dB | 0 | 0 |

- **Page errors:** 0 in every run.

## Nits for a follow-up (not blocking; main does the same or worse)
1. **After a question from Keys, when Llama wrongly sends the action anyway:**
   - "not yet", "abhi nahi baad mein" and "never mind" still run it. "maybe later", "no", "no thanks" and "nahi rehne do" are stopped.
   - With Llama's correct [], nothing changes.
   - The fix-8 report says "not yet" is covered. It isn't after the question "Want me to try brighter chords?".
2. **Whole-song praise said with "it all", plus a Llama mistake:** "i love it all now" and "it all sounds great keep it" let a Llama [vary …] through. Main is the same.
3. **Offline only (main is worse):**
   - "make it a bit softer again", "make it a bit quieter again" and "make it louder again" after a part change the right part, but the reply says "Turned the whole song down 3 dB, same balance.", while the chip says "Melody: down 3 dB". Same on fix 7.
   - "uska volume kam karo" offline turns the whole song down; main does too.
   - "isko thoda loud karo" isn't understood offline.
   - "turn it all down except the bass" and "make it all darker apart from the drums" do nothing offline.
   - The AI path is right for all of these.
4. **Known limits:**
   - "which instrument is playing the chords" lists the chord names.
   - "the bass is great the chords need work" offline re-adds the chords.
   - The offline wording "Melody: shorter, tighter notes".
   - The Worker still needs the fix 2 and 3 prompt deploy at release; the test link uses the live Worker.

## Try list for a musician (say it like this)
Start with a beat that has drums, bass, chords and melody. Step 7 needs the AI, so try it on the test link.
1. **the bassline is sick dont touch it try new chords**: new chords, and the bassline stays exactly the same.
2. **make the bass quieter everything else is fine**: only the bass goes down.
3. **drums acche hai par thode loud hai**: only the drums go down.
4. **dont change a thing except the melody make it louder**: only the melody gets louder.
5. **make the bass quieter**, then **change it all except the bass**: new drums, chords and melody, and the bass stays.
6. **never mind the drums change the bass**: a new bassline, and the drums stay.
7. **the chords feel kinda dull**: Keys asks if it should try brighter chords. Say **go for it** and you get brighter chords. Say **no thanks** instead and nothing changes.
8. **nice the melody is great now**: nothing changes, and Keys says it kept the melody.

## Screenshots (`/home/claude/qa/ai9r4/`)
- `r8shot-good.png`:
  - "make the bass quieter", then "change it all except the bass": new drums, chords and melody, with the bass kept;
  - "make it a bit softer again" after the melody: the melody goes down, but the reply says "whole song" (nit 3).
- `r8shot-good2.png`:
  - a question, then "go for it": brighter chords;
  - "never mind the drums change the bass": "Kept the drums as they are." with a new bassline;
  - "the bass sounds full and warm": "Nice! Kept the bassline as it is."
