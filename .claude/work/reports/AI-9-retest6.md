# AI-9 re-check 6 (fix 6) · qa-tester · 22 Nov 2026 · preview-ai-9 @ 4a37c43

## Verdict: NOT READY (narrow)
Fix 6 does what it says, and the structural rule mostly holds:
- Every one of my 19 earlier sets passes or equals fix 5. That includes the re-check 5 set r5 at 143/143 (main 94/143) and probe5 at 32/32.
- Keys's questions and ideas now appear **in full in the bubble**. I checked the text this time: hq6 12/12.
- The "yes after a question" flow works, including "thats perfect".
- check.sh passes.

Two things a musician will hit are still worse than main:
1. **Hinglish praise, then "par / lekin", then a complaint further on blocks the AI's correct action.** "drums acche hai par thode loud hai" gives "Kept the drums as they are." and nothing changes. Main turns the drums down. The English versions all work.
2. **When a part is already at full volume, "make the bass louder" makes Keys say just "Bassline."**, and any question in the AI reply is lost. This came in with fix 5. Main and fix 4 keep the reply.

Both look like small, local fixes, not another redesign.

## Problems (blocking)
Setup for all: a new song, then a house loop of drums, bass, chords and melody (seeds 5300 to 5303). Type each sentence exactly as written. "AI" means the shown Llama actions and reply are stubbed through `handleRequest`.

1. **HIGH (AI-path regression, Hinglish): praise, then par / lekin, then a complaint said later in the clause.**
   - The part is kept and the correct action is blocked:

     | Phrase | AI action | Branch | Main |
     |---|---|---|---|
     | "drums acche hai par thode loud hai" | [mix drums −3] | "Done. Kept the drums as they are.", no change; with an extra [vary melody], **only the melody changes** | turns the drums down |
     | "drums mast hai par thoda zyada loud hai" | [mix drums −3] | blocked | turns the drums down |
     | "melody acchi hai lekin thodi loud hai" | [mix melody −3] | blocked | turns the melody down |
     | "chords acche hai par boring lag rahe hai" | [vary chords] | blocked, "Kept the chords as they are." | changes the chords (and also the melody) |

   - Offline is blocked the same way.
   - These work: "the drums are good but kinda loud", "the bass is nice but its too loud", "i love the chords but theyre a bit loud", "the drums are fire but they are too loud", "bass badhiya hai bas thoda halka karo", "drums theek hai magar kick thoda tez karo", "chords mast hai bas thoda reverb daalo", "the melody is sick but a bit too loud", "nice bassline make it a bit darker".
   - Should happen: a complaint word anywhere in the clause after par / lekin / magar / but counts as asking to change that part. That covers loud hai, boring lag rahe, tez, halka, kam and zyada.
   - File: `askedParts` in `src/actions.js`. assistant-dev.
2. **MEDIUM-HIGH (regression since fix 5): when the action changes nothing, the reply becomes one word, "Bassline.", and the question is dropped.**
   - Steps: say "make the bass louder" (the bass reaches full volume), then "make the bass louder" again with AI [mix bass +3] and the reply "Turned the bass up 3 dB. Want me to try new chords too?".
   - Branch: **"Bassline."**, with the chip "Bassline: already at full volume".
   - Main and fix 4: "Turned the bass up 3 dB. Want me to try new chords too?" (the chip corrects the claim).
   - The same happens with the reply "Turned the bass up 3 dB." alone.
   - The melody case "melody aur loud karo" with "Melody is louder now. Should I add some reverb too?" keeps both sentences, so it isn't consistent.
   - Should happen: something like "The bass is already at full volume. Want me to try new chords too?". The question is kept, and nothing is cut down to a part name.
   - Likely cause: `shortDone` in `src/actions.js` turns "Bassline: already at full volume" into "Bassline", and the fix-6 question rule doesn't apply on this path.

### Suggested smoke lines
- "drums acche hai par thode loud hai", AI [mix drums −3, vary melody]: the drums go down and nothing else changes. Same offline.
- "chords acche hai par boring lag rahe hai", AI [vary chords]: the chords change (the bass may follow).
- Bass at full volume, then "make the bass louder" with AI [mix bass +3] and the reply "Turned the bass up 3 dB. Want me to try new chords too?": the bubble says the bass is already at full volume and still asks the question.

## Not blocking (main does the same unless noted)
3. **Negated requests and "no need to change X":**
   - Offline:
     - "dont make the bass louder" turns the bass up;
     - "i dont want new chords" gives new chords;
     - "the drums dont need to change" gives new drums;
     - "i wouldnt change the bass at all" gives a new bassline;
     - "no need to change the drums make the bass louder" turns the drums up;
     - "you dont need to change the bass make the chords brighter" brightens or re-makes the bass.
   - With a Llama mistake, the protection is missing: "dont make the bass louder" [mix bass +3] and "i dont want new chords" [vary chords] both run.
   - "you dont need to change the bass make the chords brighter" with the correct [vary chords happier] also changes the bass, because the bass follows the chords. The user said to keep it.
   - **One offline case is worse than main:** "no need to change the melody make the chords quieter" gives **new chords** instead of quieter chords. Main turns the chords down 5 dB. The AI path is right.
4. **Praise that sounds like a complaint, offline and with a Llama mistake:**
   - "the melody could not be better": the melody is replaced.
   - "the chords couldnt sound better": the chords are replaced.
   - "the bass sounds so full now": the bass is re-added.
   - "please dont add anything" with [add_melody]: a Melody 2 track is added.
5. **"no" after a question when Llama wrongly sends the action anyway.** After "Want me to turn the bass up 3 dB?", each of these with [mix bass +3] still turns the bass up:
   - "no"
   - "nah leave it"
   - "no thanks"
   - "nahi rehne do"
   - "nope its fine"
   - "no its perfect as it is"
   - "actually no keep it"

   With [] they're fine, and Llama is unlikely to send an action for "no". Since fix 6 makes closing words a yes after a question, a leading no / nah / nope / nahi / actually no should switch that off.
6. **Offline "change everything except X" is weak** (the developer lists this as a known limit). The AI path is right in every case:
   - "redo it all apart from the bass" does nothing;
   - "new everything except the chords" changes only the drums;
   - "bass ko chhod ke sab kuch thoda kam karo" says "Kept the bassline as it is." with no change;
   - "everything is good except the drums and the bass make them quieter" turns down only the drums.

## Nits
- **Chord fit over the sung bass:**
  - With the one saved take, the sung set gave 16/18, 16/18 and 18/18 over three runs. s1 or s4 sometimes fits 1 of 2 bars, depending on the random chord choice. Fix 5 gave 18/18 in its one run.
  - The chain C second chord change is 1/2 on all seeds, the same as on fix 4 and fix 5.
  - The developer notes that Keys's own bar-by-bar check reads 3/4 on this take. The reply doesn't warn at 1/2.
- "Done." for "thats perfect" when the bass was already at full volume. The chip says so, but the text should too.
- **Known limits, unchanged:**
  - "which instrument is playing the chords" lists the chord names.
  - "the bass is great the chords need work" offline gives "Chords (replaced)".
  - The offline wording "Melody: shorter, tighter notes" is fine.

## What I checked (numbers)
Everything is in `/home/claude/qa/ai9r4/`:
- harness `q.mjs`, with the saved take `sung-take.json`, 11 notes;
- new cases: `mk6.py` → `r6.json`, plus `probe6.json`, `full.json`, and `hq6.json` (hq and q5 with the bubble text checked);
- outputs: `*-br6.txt`, `r6-main.txt`, `probe6-main.txt`, `hq6-main.txt`;
- comparison builds: `fix4build/` (638c3c5) and `fix5build/` (1b4f796).

Main is origin/main e990684, which has no product changes since b442b1e. Each step diffs every track and expects exactly one Undo step, with Undo and Redo exact. No change must leave no Undo step.

- **check.sh, run 1:** CHECK OK, SMOKE OK 104, 2m30s, load about 1 to 3. No rebuild note.
- **check.sh, run 2:** CHECK OK, SMOKE OK 104, 2m26s.
- **Smoke, branch and main side by side, 2 rounds at load about 4:** branch 2 of 2 OK (104 checks), main 2 of 2 OK (91 checks).
- **Reload pair:** it passed in all 4 branch runs this round, so 14 of 14 across re-checks 4 to 6.
- **Earlier sets on fix 6:**

  | Set | Fix 6 | Main |
  |---|---|---|
  | p | 52/52 | 9/52 |
  | new | 96/96 | 43/96 |
  | probe | 87/87 | |
  | probe2 | 13/13 | |
  | probe3 | 42/42 | |
  | probe4 | 20/20 | |
  | probe5 | 32/32 | 25/32 |
  | r5 | 143/143 | 94/143 |
  | hq | 8/8 | |
  | q5 | 4/4 | |
  | sung | 16/18, 16/18, 18/18 | |
  | nits | 12/13 | |
  | hr | 5/5 | |
  | hr2 | 3/3 | |
  | old | 180/180 | |
  | chains | 78/81 | |
  | chainC | 21/24 | |

  The chains and chainC misses are the same sung-fit case as on fix 5.
- **hq6 (question and idea text in the bubble): branch 12/12, main 11/12, fix 5 cut 5 of 8.** Every one of these is now shown in full:
  - "Want me to turn the bass up 3 dB?"
  - "Should I turn the bass up or give it more low end?"
  - "You could make the melody simpler, or add reverb to the chords."
  - "How about new chords? Want me to try some?"
  - "They work well. Maybe try a darker progression for more tension?"
  - "Thanks! Want me to make the bassline bouncier next?"
  - "Turned the bass up 3 dB. Want me to try new chords too?"
- **New phrasings, none in earlier sets or the developer's n5/n6: 57.**
  - `r6.json`: 42 phrasings, 108 steps. **Branch 77/108, main 58/108.** The branch is better in 22 steps and worse in 3 ("drums acche hai par thode loud hai" ×2, and the "no need to change the melody…" offline case).
    - Requests inside praise of the same part: 9 phrasings. 8 pass offline and on the AI path, including "the bass is great but it could be louder", "love the chords they would be even better with more reverb", "drums are good just a little too busy", "the chords are fire but can they be on strings", "i like the melody but give it some delay" and "chords mast hai bas thoda reverb daalo". The miss is problem 1.
    - Double excepts on the AI path: 3/3, with Llama's extra action on a kept part dropped. "keep everything except the bass and the drums change those", "dont touch anything except the chords and the melody give me new ones" (the bass is kept) and "everything is good except the drums and the bass make them quieter".
    - Change everything except, on the AI path: 5/5. "make everything louder except the melody", "redo it all apart from the bass", "new everything except the chords", "bass ko chhod ke sab kuch thoda kam karo" and "melody ke alawa sab mast hai melody badlo".
    - Negated requests: 6 (problem 3). "no need to change the melody make the chords quieter" and "dont make the drums busier make them hit harder" are right on the AI path.
    - Traps for rule (b), praise that sounds like a complaint: 6. "the bass is perfect dont make it louder" is guarded; the others are problem 4.
    - Questions, then yes, no or nah: 12 chains plus 1 offline. The question is always shown in full. "yes but only a little", "haan thoda sa", "go on then", "yeah thatd be great" and "thats perfect" run the action. "nah" with [] changes nothing. "no" with a Llama mistake is problem 5.
  - `probe6.json`: 15 praise-then-complaint and "no need to" variants. **Branch 21/30, main 23/30.**
  - `full.json`: replies when the action changes nothing. **Branch 2/4, main 4/4, fix 5 2/4, fix 4 4/4** (problem 2).
- **Sound** (offline `renderAudio`, 4-bar loop at the end of each of the 9 chains):

  | Measure | Range |
  |---|---|
  | Peak | −0.39 to −0.54 dBFS |
  | RMS | −6.6 to −7.0 dB |
  | Clipped samples | 0 |
  | Silent 100 ms blocks | 0 of 77 |

- **Page errors:** 0 in every run.

## Screenshots (`/home/claude/qa/ai9r4/`)
- `r6shot-good.png`: "dont change a thing except the bass make it louder" with a Llama extra, the question "Want me to turn the bass up 3 dB?" followed by "thats perfect", and then problem 2: "Bassline." for "make the bass louder" at full volume.
- `r6shot-fail.png`: problem 1. "Kept the melody as it is." and "Kept the chords as they are." with no change, for the Hinglish par / lekin complaints.
