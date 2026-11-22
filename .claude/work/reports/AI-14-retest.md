# AI-14 re-check after fix 1 · qa-tester · 22 Nov 2026 · preview-ai-14 @ 1faba80

## Verdict: NOT READY (very close: 2 small fixes, about 30 minutes)
All 5 problems from my first check are fixed, word for word, offline and on the mocked AI path. No case is worse than main. check.sh passes (117), and the local merge with preview-qa-2 passes (118).

Against 2c6a876, two things got worse. Both come from fix 1 itself:
1. A "right" that answers Keys's own question "Left or right?" now does nothing.
2. The new melody low-cut rule can pull the cut far down (to 28 Hz) when the user says the mix is muddy.

Everything else below is the same as 2c6a876 or better, and can ship later.

## Problems (ranked)

### Must fix (worse than 2c6a876)

1. **A "right" after Keys asks "Left or right?" does nothing (regression vs 2c6a876; main does nothing too).**
   - Steps: on a loop with a melody, say "pan the melody".
   - Keys asks: "Left or right? Say “pan melody a bit left” or “pan melody hard right”."
   - Then say "right".
   - Expected: "Panned Melody right (R 40), same notes."
   - Actual: "I couldn’t turn that into a change. Try “add a trap beat at 140” …". No change.
   - "left" in the same spot works. 2c6a876 panned right.
   - Cause: panFix returns the "Left or right?" question before it sets `ASSIST.lastPan`, so `panJustDone()` is false for the answer.
   - Fix: record `ASSIST.lastPan` (with the part) when Keys asks the question.

2. **The melody low cut is pulled far down by a mud complaint (new side effect of the 0.85 × lowest-note floor).**
   - Case a: a melody with one very low note (C1, as a sung take with an octave slip can give) and the default 220 Hz cut. Say "the mix is muddy".
     - Reply: "Cleaned up the mix: low cuts set and 3 dB less low end on Chords (238 Hz) and Melody (low cut down to 28 Hz, under its lowest note)".
     - The melody's cut is effectively gone. 2c6a876 kept 220.
   - Case b: a melody down to C2 with a 150 Hz cut. "the mix is muddy" sets the cut to 56 Hz.
   - Case c: a melody down to C3 that I cut at 300 Hz myself. Say "the melody is muddy".
     - Reply: "Cleaned up the melody: low cut down to 111 Hz (under its lowest note) and 3 dB less low boom, same notes."
     - A complaint about mud lets more low end in.
   - Fine: the normal case, a melody down to C3 at 220 Hz, now goes to 111 Hz, and the reply is true.
   - Expected: a mud fix never drops a melody's cut below a sane floor (about 100 Hz, or ignore a single stray low note). When the user's own cut already sits above the floor, keep it and say so.
   - Fix: in toneFix `cut()`, use `fl = Math.max(100, floorHz(T))`, or base the floor on a low percentile of the notes. Only lower the cut on "the mix is muddy", never on "the melody is muddy".

### Should fix (same on 2c6a876, found with fresh wordings)

3. **Width asks other than "spread … wider" still claim a replace.**
   - These five all reply "Done: Chords (replaced) on Deep Pad in A minor":
     - "widen the chords"
     - "the chords should be wider"
     - "spread the chords out"
     - "make the chords narrower"
     - "chords ko wide karo"
   - In my runs the notes didn't change and the width didn't change, but one Undo step was added that does nothing (seen in the session).
   - Main adds a "Chords 2" for each.
   - "spread the chords wider", "make the pad wider" and "spread the melody wider in the stereo" work.
   - Fix: add widen / narrower / narrow / wide to FXRE, and "should be" / "karo" to the verb list. Never replace on a width word.
4. **"mute the recording, I’ll hum the melody" mutes and drops the take.**
   - Reply: "Muted sing. Say “unmute sing” to bring it back." No count-in.
   - Main does the take (without the mute).
   - "mute the recording and hum the melody" works.
   - "voice note mute karo aur bass gaane do" also mutes only. "gaane do" isn't read as sing.
   - Cause: the comma and "I’ll" clause doesn't split, so the whole-sentence guard runs.
5. **"make drop two bigger" talks about the FIRST drop.**
   - Reply: "The drop already has every part … Want me to take the bass out of the build so the drop lands harder?"
   - Speech often types "two". Same on 2c6a876; main added Break 2 + Drop 3.
   - Fix: map one / two / three after a section word to a number.
6. **Two-part pans without "and" or "pan".**
   - "melody left, chords right" REPLACES both parts: "Done: Chords (replaced) on Deep Pad in A minor, Melody (replaced) on Melodic Pluck".
   - "pan melody left chords right" pans only the melody, and the reply says so.
   - Same class on 2c6a876, and main adds Chords 2 + Melody 2.
   - The 7 other fresh two-part wordings all work.
7. **The AI path, for a wording outside the lift words:**
   - Request: "the second drop needs to go off". Llama sends a groove at energy 5.
   - The drums are rewritten in the whole song, with Llama's "The second drop goes off now." Same on all three builds.
   - Not understood offline (all builds):
     - "pump up the second drop"
     - "pump up the drop"
     - "dusra drop aur heavy karo"
     - "the break feels empty"
8. **The section offer can't be accepted in Basic mode.**
   - Steps: "make the break bigger", then "yes".
   - Keys asks: "… Want me to bring the drums in at the break?"
   - On "yes": "I couldn’t turn that into a change." The old pattern, the same on all builds. Saying the words works.
   - Musically, offering the drums first for a break is odd. The melody first, or a roll at the end, suits a break better (nit).

### Nits

9. **The reply trim cuts the AI's words a little too hard:**
   - "Turned the melody down 3 dB in the drop and in the break." becomes "Turned the melody down 3 dB and in the break."
   - "Want me to bring the chords back in the drop too?" becomes "Want me to bring the chords back too?"
   - The 4 other wordings read well.
10. **Record wordings:**
    - "record a new take on the keyboard" and "let me record a new take on the keys" start a voice note (mic), not a keyboard recording. This is still better than 2c6a876 and main, which REGENERATED the drums for these.
    - "record a fresh take of the bass" generates a new bassline (all builds).
    - After a sung chords take, "switch off the voice note and let me record a new take" starts a chords take. The sentence names the voice note, so a voice take fits better. "mute the voice note and record a new one" gives the voice take correctly.
11. **(Mine, not AI-14) The merge check failed once in 3.** QA-2's focus check ("after typing to Keys, double-click a part … gives the editor the keys") failed on run 1 and passed on runs 2 and 3. It's a test timing flake; I'll fix it under QA-2.

### The lone "left" (judged)
It's fine to keep:
- "left" is never a yes. After "make the melody brighter", "left" gives "Panned Melody left (L 40), same notes." That is one Undo step, and the reply names the part.
- The "right" fix holds for every agreement I tried, with no pan:
  - "right"
  - "right, nice"
  - "yeah right"
  - "right on"
  - "thats right"
  - "right okay cool"
  - "haan right"
  - "right right"
  - "right" after "add a bassline"
  - "right" after an unrelated change
- "pan the melody left" then "right" gives R 40.

## Before / after
- main is 2812bfe; its product code is the same as c6a34df.
- "Offline" means Basic mode.
- Take cases count as a pass when muted plus the right take. The harness's "UNDO-DIFF" on those comes from pressing Undo during the count-in. With the take stopped first, one Undo is exact (rtu.js, 3 of 3).

| Set | main | AI-14 2c6a876 | AI-14 fix 1 1faba80 |
|---|---|---|---|
| bugs.js (my first-check bug set) | 20/107 | 97/107 | **105/107** ("i want a breakdown", "key ko D minor karo") |
| ai.js (mocked AI path) | 17/33 | 29/33 | **30/33** (see note 1) |
| nb.js (neighbours) | 33/52 | 46/52 | **51/52** (the 1 fail is the count-in harness artefact; it passes functionally) |
| ai9.js (65 AI-9 phrasings) | n/a | baseline | **65/65 signatures identical** (only random chord names differ) |
| **rt.js (new, 140 cases)** | 55/140 | 77/140 | **123/140**. Line by line against 2c6a876: 39 better, 1 worse (problem 1). Problem 2 is worse by judgement, not by this checker. |

Note 1, the 3 ai.js fails on 1faba80:
- the count-in artefact on "mute the voice note and sing the bassline", which is functionally right;
- the old-prompt master reverb, which needs the Worker deploy;
- "add a second drop", which gives Break 2 + Drop 3, as on main.

rt.js by problem:

| Group | main | 2c6a876 | 1faba80 |
|---|---|---|---|
| P1 second drop, filed words (4 offline + 2 AI groove) | 0/6 | 0/6 | **6/6** |
| P1 fresh wordings (8 offline + 2 AI + 2 with chords out) | 2/12 | 2/12 | 8/12 |
| P1 guards ("add a second drop", loop) | 3/3 | 3/3 | 3/3 |
| P2 voice-note mute + take, filed words (2 AI + 2 offline) | 2/4 | 0/4 | **4/4** |
| P2 fresh wordings (6 offline + 3 AI) | 1/9 | 2/9 | 5/9 |
| P2 guards (mute only, no mic; record a new voice note; mute the bass and sing) | 2/5 | 4/5 | 5/5 |
| P3 "right" as a yes (filed + 9 fresh) | 9/9 | 7/9 | **9/9** |
| P3 pan context (after a pan, after the question, stale) | 1/6 | 5/6 | 5/6 (problem 1) |
| P4 two-part pan, filed | 0/1 | 0/1 | **1/1** |
| P4 fresh (incl. 3 parts, hard / a bit, drums, Hinglish, AI) | 1/12 | 1/12 | 10/12 |
| P5 section replies (understood and true) | 1/12 | 4/12 (6 untrue "already has its drums") | 10/12 ("the break feels empty" and "yes" not understood) |
| Width: the width really changes | 1/8 | 1/8 | 3/8 (problem 3) |
| "too far left" | 0/6 | 2/6 | 5/6 ("melody bahut left hai" replaces the melody, as on 2c6a876) |

Filed words, exact replies on 1faba80:
- **P1 "make the second drop bigger":** "Drop 2 already has every part and a snare roll into it. I can’t make one section louder on its own yet. Want a longer snare roll into Drop 2?" Nothing changes.
  - The same reply comes for the AI groove 5 path. Llama's "Made the second drop bigger." is replaced.
  - With the chords out of Drop 2, "the second drop needs more energy" gives "Made Drop 2 bigger: Drop 2: Chords in". One Undo step, exact.
- **P2, AI [mix sing mute, sing bass]:** "sing: muted. Sing the bassline after the count-in: 4 bars".
  - Offline gives "Muted sing … Done: Sing the bassline after the count-in".
  - "… and record a new one" gives a voice take.
  - In the session, a real sung take landed: "Got it: 11 notes in A minor on “Sung bassline”". The voice note stayed muted and the mic was off after.
- **P3:** "make the melody brighter", then "right": "I couldn’t turn that into a change", with no pan.
- **P4 "pan the melody left and the chords right":** "Panned Melody left (L 40) and Chords right (R 40), same notes." One Undo step.
- **P5:**
  - "make the break bigger": "The break has the chords, but not the drums, the bass and the melody. … Want me to bring the drums in at the break?"
  - Outro: "has the drums and the chords, but not the bass and the melody".
  - "Drop 2 already has …". No "The drop 2" anywhere.

New behaviour (item 4 of the brief):
- **panMany:** 9 of 11 two-part wordings are right, including:
  - 3 parts with "keep the bass in the middle";
  - "a little to the right … hard left" (R 20 / L 100);
  - the drums;
  - a missing part ("There’s no melody in the song yet to pan").
  - Guards hold: "… and add some strings", "… and turn the chords up", "… so it sits away from the chords".
- **"spread the chords wider":** width 75%.
- **"the melody is too far left":** L 40 → L 20 → centre. When the melody isn't panned left, Keys says "Melody isn’t panned left; it’s in the centre." "the chords are too far to the right" on a hard-right part gives R 80. "the melody starts too far left in the bar" is not taken as a pan.
- **Sing / hum / whistle clauses:** 7 of 7 start the right take with no new part:
  - "sing a new melody"
  - "hum the chords"
  - "whistle a tune"
  - "sing the bassline again"
  - "let me sing a new hook"
  - "i’ll hum the bass"
  - "and then sing the melody"
  - Also, "add a humming melody" still makes a melody. "make a melody i can sing along to" starts a take (same on all builds).
- **"record a new one":** a voice note by default, the last sung part after a sung take (bass in the session). "record a new beat" and "record a new song" keep their old meaning.
- **Honest replies:** all true on a Bodzin full track (I checked each against the section's parts).
- **The melody low cut:** see problem 2.

## check.sh
| Run | Result | Time |
|---|---|---|
| 1faba80 | CHECK OK, 117 checks | 2m36s |
| Local merge 1faba80 + origin/preview-qa-2 (ac0b714), clean, not pushed, run 1 | FAILED, 1 of 118 (QA-2 focus check, a flake) | 2m45s |
| Merge, run 2 | CHECK OK, 118 | 2m29s |
| Merge, run 3 | CHECK OK, 118 | 2m40s |

- index.html matches the build on all three trees.
- 0 page errors in every run.

## Producer session (1faba80, typed into the Keys box, Basic mode, 37 requests plus a real sung take)
1. Bodzin beat, bass, chords and melody.
2. Pans:
   - "pan the melody left and the chords right": L 40 / R 40.
   - "make the bass a bit louder", then "right": nothing.
   - "pan the melody", then "right": nothing (problem 1).
   - "too far left" twice: L 20, then the centre.
3. Width:
   - "spread the chords wider": 75%.
   - "widen the chords" and "make the chords narrower": the untrue "Chords (replaced)" reply and a dead Undo step (problem 3).
4. Full track:
   - The second drop: the honest reply. Chords out, then "needs more energy": Chords in.
   - Break: the honest reply. "yes" isn't understood. "bring the melody in at the break" works.
   - Outro: the honest reply. "make drop two bigger" talks about the first drop.
5. "the melody is too loud in the drop": down 5 dB, with the whole-song note.
6. Imported sing.wav:
   - mute and unmute: no count-in, mic off;
   - "mute the voice note and sing the bassline": muted, and a real 11-note "Sung bassline" landed;
   - "record a new one": a bass take.
7. "the mix is muddy": Chords 238 Hz; Melody 280 Hz, under its lowest note at 330 Hz, and the reply is true.
8. Save, new song, reopen: identical.
9. Undo: 17 changes, 17 exact after one Undo, 0 with more than one step. 2 Undo steps changed nothing (the "replaced" width replies). Redo was exact for all.
10. Every reply took 1.0 to 1.7 s. 0 page errors.
11. Offline render, 4 bars from the middle of each section:

| Section | Peak | RMS | Clipped | L/R |
|---|---|---|---|---|
| Drop | -0.6 dBFS | -6.6 dB | 0 | 0.0 dB |
| Break | -1.1 dBFS | -12.6 dB | 0 | -0.6 dB |
| Drop 2 | -0.6 dBFS | -6.7 dB | 0 | 0.0 dB |

## Fix list for assistant-dev
Must:
1. panFix: when Keys asks "Left or right?", set `ASSIST.lastPan` for that part, so a following "right" pans it.
2. toneFix `cut()`: put a floor on the melody cut (about 100 Hz, or ignore single outlier notes). Don't lower a cut the user set on "the melody is muddy". Keep the honest "under its lowest note" wording.

Then add smoke lines for both: "pan the melody" → "right" gives R 40; a C1 note gives a cut of at least 100 Hz.

Should (fine after release):
3. Width words: widen / narrow(er) / wide / "should be wider" / "spread … out" are the width, never a replace.
4. "mute the recording, I’ll hum the melody" and "… aur bass gaane do": the take still starts.
5. "drop two" / "drop three" is Drop 2 / Drop 3.
6. "melody left, chords right" (no verb, no "and") pans both and never replaces.
7. Lift words: "pump up", "go off", "heavy", "feels empty".
8. Basic mode: "yes" to the section offer runs the offer. For a break, offer the melody or a roll before the drums.
9. Reply trim: don't leave "… and in the break." or change a question's meaning.

## Files
- Trees (worktrees of /home/claude/studio-keys-repo, detached, nothing pushed):
  - /home/claude/ai14r/main
  - /home/claude/ai14r/old (2c6a876)
  - /home/claude/ai14r/new (1faba80)
  - /home/claude/ai14r/merge (1faba80 + preview-qa-2)
- Check logs:
  - /home/claude/ai14r/check-new.txt
  - /home/claude/ai14r/check-merge.txt
  - /home/claude/ai14r/check-merge2.txt
  - /home/claude/ai14r/check-merge3.txt
- Set outputs:
  - /home/claude/ai14r/{bugs,ai,nb,ai9,rt}-{main,old,new}.txt
  - /home/claude/ai14r/rtu-{new,main}.txt
  - compare script /home/claude/ai14r/cmp.py
- New scripts:
  - /home/claude/qa/ai14/rt.js (140 cases)
  - /home/claude/qa/ai14/rtu.js (undo with the take stopped)
  - /home/claude/qa/ai14/sess2.mjs
  - session log /home/claude/qa/ai14/sess-rt.txt
- Screenshots:
  - /home/claude/qa/ai14/shots/rt-01-loop.png
  - rt-02-pan-two.png
  - rt-03-width.png
  - rt-04-full.png
  - rt-05-break.png
  - rt-06-sung-bass.png
  - rt-07-after.png
  - rt-08-reopened.png
