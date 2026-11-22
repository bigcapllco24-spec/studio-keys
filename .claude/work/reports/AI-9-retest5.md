# AI-9 re-check 5 (fix 5) · qa-tester · 22 Nov 2026 · preview-ai-9 @ 1b4f796

## Verdict: NOT READY
Fix 5 fixes everything re-check 4 listed. Every one of my re-check 4 sets now passes on this build:

| Set | Fix 5 | Main |
|---|---|---|
| p | 52/52 | |
| new | 96/96 | 43/96 |
| probe | 87/87 | 40/87 |
| probe2 | 13/13 | |
| probe3 | 42/42 | |
| probe4 | 20/20 | |
| sung | 18/18, one saved take | |
| old | 180/180 | |
| hr | 5/5 | |
| hr2 | 3/3 | |
| nits | 12/13 | |
| chains | 78/81 | |

The 3 chain misses are a sung-bass chord-fit nit. It's identical on fix 4 with the same saved take.

Two things still block:

- **A. New in fix 5 (HIGH): Keys's own questions and suggestions are deleted from its replies.**
  - The new honest-reply rule drops any sentence of the AI's reply that names a part that didn't change, and that includes questions and ideas:
    - "Want me to turn the bass up 3 dB?" is shown as "I couldn't turn that into a change. Try "add a trap beat at 140" …";
    - "How about new chords? Want me to try some?" becomes "Want me to try some?";
    - "Turned the bass up 3 dB. Want me to try new chords too?" loses the question.
  - Main and fix 4 keep every one of these.
  - Keys is meant to suggest the next step, and the "yes do it" flow depends on the user hearing the question.
- **B. The re-check 4 problems 1 and 2 are fixed only for the listed wordings.**
  - Close variants still keep the part the user asked to change and block the AI's correct action, which main runs. Examples:
    - "the drums need more punch rest is fine"
    - "dont change a thing except the bass make it louder"
    - "everything slaps except the bass give me a new one"
    - "i love everything apart from the hats make them simpler"
  - This is the same owner-rule inversion as before, so it needs a structural fix (below), not more phrases.

## Problems (blocking)
Setup for all: a new song, then a house loop of drums, bass, chords and melody (seeds 5300 to 5303). Type each sentence exactly as written. "AI" means the shown Llama actions and reply are stubbed through `handleRequest`.

1. **HIGH, new regression in fix 5: AI questions and suggestions are cut out of the reply.**
   All of these use AI [] (no action) with the reply in quotes, unless stated otherwise.

   | You say | AI reply | What the branch shows |
   |---|---|---|
   | "the bass feels kinda weak" | "Want me to turn the bass up 3 dB?" | **"I couldn't turn that into a change. Try "add a trap beat at 140", …"** |
   | "the bass feels weak" | "Should I turn the bass up or give it more low end?" | the same "couldn't" text |
   | "give me some ideas" | "You could make the melody simpler, or add reverb to the chords." | the same "couldn't" text |
   | "what should we do next" | "How about new chords? Want me to try some?" | "Want me to try some?" |
   | "what do you think of the chords" | "They work well. Maybe try a darker progression for more tension?" | "They work well." |
   | "the drums are fire" | "Thanks! Want me to make the bassline bouncier next?" | "Thanks!" |
   | "make the bass louder", AI [mix bass +3] | "Turned the bass up 3 dB. Want me to try new chords too?" | "Turned the bass up 3 dB." |

   - Kept on the branch: "It's in A minor. The bass and chords both sit nicely in it.", "The melody is on Analog Lead. Say the word if you want it on piano." and "A choir would fill out the chords nicely. Want me to add one?".
   - **Main and fix 4 (638c3c5) show every reply in full**: fix 4 got 8/8 and main 8/8 on this set (`hq.json`), plus `q5.json`.
   - Should happen: questions and suggestions are never claims of a change, so they stay. That covers sentences ending in "?", "want me to", "should I", "how about", "maybe", "you could", "next" and "try …".
   - Likely cause: the fix-5 `honestReply` change in `src/actions.js` that drops claims about parts that didn't change. assistant-dev.
2. **HIGH (regression on the AI path): request first, then a "rest is fine" wording the new `KEEP_OTH*` list doesn't know.** The asked part is kept, the correct AI action is blocked, and main runs it:
   - "the drums need more punch rest is fine" (no "the"):
     - AI [track_fx drums compressor] is blocked with "Kept the drums as they are.";
     - offline does the same.
   - "the melody could be a bit louder rest of it is perfect":
     - AI [mix melody +3] is blocked with "Kept the melody as it is.";
     - AI [mix melody +3, vary bass] changes **only the bass**.
   - "swap the bass sound for an 808 all the other stuff is good":
     - AI [instrument bass 808] is blocked;
     - with an extra [vary chords], only the chords change.
   - Listed wordings now work, and so do these new ones:
     - "make the drums louder everything else slaps"
     - "new chords please everything else is fire bro"
     - "new melody the rest is fire"
     - "bass ko loud karo baaki sab kamaal hai"
     - "bass thoda loud karo baki sab badhiya hai"
     - "make the melody louder the rest of it is great"
     - "put the chords on strings all the other parts are good"
     - "give me some new drums everything else sounds sick"
     - "drums thode busy karo baaki sab ekdum sahi hai"
     - "just make it quieter everything else is fine" (after the melody)
     - "new melody but dont touch anything else"
3. **HIGH (regression on the AI path): "except / apart from X" where the praise is said another way.** X is kept and the correct AI action is blocked. Main runs each one:
   - "dont change a thing except the bass make it louder": [mix bass +3] is blocked; with an extra [vary drums], **only the drums change**.
   - "dont change a thing apart from the drums": [vary drums] is blocked.
   - "everything slaps except the bass give me a new one": [vary bass] is blocked.
   - "love it all apart from the melody give me another one": [vary melody] is blocked.
   - "i love everything apart from the hats make them simpler": [hats 8th] is blocked; with an extra [vary bass], only the bass changes.
   - "all of it slaps except the melody try something else": [vary melody] is blocked.
   - "i like it all except the chords change them": [vary chords] is blocked. Main also gets this wrong (it changes the melody too).
   - These work: "everything sounds great except the drums make them busier", "everything is cool other than the chords they feel boring", "sab kuch mast hai siwaay chords ke naye chords do", "its all good but the drums are too loud".
   - **Suggested structural fix** (it covers problems 2 and 3 and future wordings):
     - (a) a part named right after except / apart from / other than / besides / siwaay is always the part to change, whatever comes before it;
     - (b) the guard never drops an AI action on the part the sentence asks to change (the part with its own request verb). Praise can only protect parts that are not asked about.
4. **MEDIUM (AI path, regression): "thats perfect" said as a yes to Keys's question blocks the action.**
   - Steps:
     - "the bass feels kinda weak", with AI [] and the question "Want me to turn the bass up 3 dB?";
     - then "thats perfect" with AI [mix bass +3].
   - Result: "Done. Kept everything as it is." and nothing changes. Main turns the bass up.
   - The developer lists this as a known limit.
   - These all run the action after a question: "sounds good", "ok cool", "yes do it", "yeah go for it", "haan karo", "sure", "perfect do that", "nice yes", "ok", "yes please", "haan try karo". That's 13 of 14 yes-replies.
   - Suggestion: when Keys's last reply was a question, closing words are a yes.

### Suggested smoke lines
- AI [] with the reply "Want me to turn the bass up 3 dB?" for "the bass feels kinda weak": the bubble shows the question. Then "yes do it" with [mix bass +3]: bass up.
- "make the bass louder", AI [mix bass +3], reply "Turned the bass up 3 dB. Want me to try new chords too?": both sentences are shown.
- "the drums need more punch rest is fine", AI [track_fx drums compressor +20]: drums only.
- "dont change a thing except the bass make it louder", AI [mix bass +3, vary drums]: bass up only.
- "everything slaps except the bass give me a new one", AI [vary bass]: bass only.
- "i love everything apart from the hats make them simpler", AI [hats 8th, vary bass]: drums only.

## Not blocking (same on main)
5. **Closing words and whole-song praise the guard doesn't know, with a Llama mistake.** The correct [] is fine:
   - "yep thats the vibe right there"
   - "beautiful we are done"
   - "bas yahi chahiye tha"
   - "mast hai yaar ekdum"
   - "i love how this sounds now"

   Guarded now: "nailed it bro", "ok perfect leave it there", "thats exactly it", "this beat is crazy", "wow this is so good", "this is fire dont change a thing".
6. **"thats it for the drums now change the bass"** gives new drums as well as the new bass, offline and with AI [vary bass, vary drums]. Main does the same.

## Nits
- **Darker chords over a kept bass clash:**
  - "darker chords please everything else is vibing" keeps the bass (right), but the darker chords sit outside it in 3 of 4 bars offline and in 2 of 4 on the AI path.
  - The reply says so honestly ("…sits outside the new chords in 3 of 4 bars. Say "new bassline" if that clashes.").
  - Non-darker new chords over a kept bass fit 3/4 or 4/4.
- **Sung bass chord fit, chain C** ("new chords please the bass is perfect" as the second chord change over the saved 11-note take):
  - It fits 1 of 2 bars on all 3 seeds, the same on fix 4 with the same take, so this is not a fix-5 change.
  - The first chord change fits 2/2.
  - The reply doesn't warn at 1/2.
- **Known limits:**
  - "which instrument is playing the chords" still lists the chord names.
  - "the bass is great the chords need work" offline gives "Chords (replaced)".
  - The offline reply for "make the melody shorter" is "Melody: shorter, tighter notes" (fine).
- **Fixed:** "how many bars is the loop" now answers "The loop is 4 bars long." The fix-5 honest reply gets hr 5/5 for false claims about changes. The problem is only with questions and suggestions (problem 1).

## What I checked (numbers)
Scripts and outputs are in `/home/claude/qa/ai9r4/`:
- harness `q.mjs`, which now reuses one saved fake-mic take, `sung-take.json`, 11 notes;
- new cases `mk5.py` → `r5.json`, plus `probe5.json` and `hq.json`;
- re-check 4 sets rerun as `*-br5.txt`.

Main is origin/main 8b2f85c (no product changes since b442b1e; its earlier outputs are reused). The fix 4 build for comparison is `fix4build/index.html` (638c3c5). Each step diffs every track and expects exactly one Undo step, with Undo and Redo exact. No change must leave no Undo step.

- **check.sh, run 1:** CHECK OK, SMOKE OK 104 checks, 2m21s, load about 1. No rebuild note.
- **check.sh, run 2:** CHECK OK, SMOKE OK 104 checks, 2m23s.
- **Smoke, branch and main side by side, 2 rounds at load 3 to 5:**
  - Branch 1 of 2 runs had one FAIL: "sing the bassline → bass track · 3 notes". The fake-mic take came out short under load; this is mic timing, not AI-9 code. Main passed that round.
  - Main 0 of 2 failed.
  - **The reload pair passed in all 4 branch runs** (2 check.sh plus 2 smoke). Across re-checks 4 and 5 it has now passed 10 of 10 branch runs and 6 of 6 main runs.
- **Re-check 4 sets on fix 5:**
  - p 52/52, new 96/96, probe 87/87, probe2 13/13, probe3 42/42, probe4 20/20.
  - sung 18/18 with the saved take, and the sung bass is kept in every comment.
  - nits 12/13, hr 5/5, hr2 3/3, old 180/180.
  - chains 78/81. The 3 misses are the chord-fit nit; the same 3 miss on fix 4 with the same take. "perfect thats it" and "this track is sick bro dont change anything" are fixed.
- **New phrasings, none in earlier sets or in the developer's n5 sweep: 74.**
  - `r5.json`: 58 phrasings, 143 steps. **Branch 120/143, main 94/143.** The branch is better in 36 steps and worse in 10 (problems 2, 3 and 4).
    - Request-then-"everything else is fine": 7.
    - except / apart from / other than / but: 6.
    - Closing words after a bass change: 6. Offline 6/6; Llama mistakes 3/6 stopped.
    - Whole-song praise: 5. Llama mistakes 3/5 stopped.
    - Praise or keep words next to a real request: 20, which must still run. **19/20 pass, offline and AI.**
      - Examples: "love it now add some reverb to the chords", "perfect now make the melody louder", "this sounds amazing can you add more reverb to the melody", "nice nice now try a darker bassline", "keep it like this but turn the chords down", "i like it a lot but the melody is too busy", "it all sounds good now give me a new melody", "turn everything down except the bass", "make everything quieter except the drums", "new drums but keep the kick", "make the bass louder but not too much".
      - The miss is problem 6.
    - Yes after Keys asks a question: 14 chains. **13/14 run Llama's action**; "thats perfect" is blocked (problem 4). Main 14/14.
  - `probe5.json`: 16 more variants. **Branch 22/32, main 25/32.** The branch is worse in 8 steps (problems 2 and 3) and better in 6.
  - `hq.json`: 8 AI replies with questions or suggestions. The cases pass, but the shown text is cut in 5 of 8 on the branch, 0 of 8 on fix 4 and 0 of 8 on main (problem 1).
- **Sound** (offline `renderAudio`, 4-bar loop at the end of each of the 9 chains):

  | Measure | Range |
  |---|---|
  | Peak | −0.39 to −0.51 dBFS |
  | RMS | −6.7 to −7.0 dB |
  | Clipped samples | 0 |
  | Silent 100 ms blocks | 0 of 77 |

- **Page errors:** 0 in every run.

## Screenshots (`/home/claude/qa/ai9r4/`)
- `r5shot-good.png`: fixes working. "make the bass quieter everything else is fine" with a Llama extra, "everything is good except the bass give me a new one", and "perfect thats it" after a melody change.
- `r5shot-fail.png`: problems 2 and 3. "Done. Kept the bassline as it is." twice with no change.
- `r5shot-fail-yes.png`: problems 1 and 4. The question is replaced by the "couldn't" text, and then "thats perfect" keeps everything.
