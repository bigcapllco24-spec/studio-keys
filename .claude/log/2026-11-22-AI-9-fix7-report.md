# AI-9 fix 7 report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9`, head **3e1639f**, pushed. There are 3 WIP commits after 4a37c43: 2cfb6d2, b85a4c7 and 3e1639f. `main` was not touched.

Files changed: `src/actions.js`, `src/assistant.js`, `src/maker.js`, `tests/smoke.mjs` (the existing AI-9 check now has 24 sub-checks), and `index.html` (rebuilt). **`cloudflare/worker.js` is unchanged**: no prompt lines, so there was no Llama run and fix 7 adds nothing to the Worker deploy. The fix 2 and 3 prompt changes still need it at release.

**check.sh: CHECK OK, SMOKE OK, 104 checks.** Two runs, both passed: at load 1.3, and again at load 3 to 8.

## Fixes
1. **Hinglish praise, then par / lekin / magar / bas, then a complaint** (HIGH).
   - After Hinglish praise, "par / pr / lekin / magar" now read as "but", and "bas" reads as "just". "lekin" and "magar" read as "but" anywhere.
   - `askedParts` now looks at what joins two clauses. If a clause comes after but / though / however / just, names no part, and has a complaint, it's about the part just named. That covers English complaint words and Hinglish ones: loud, boring, lag rahe, tez, halka, kam, zyada, dull, flat, weak, thin, muddy, bekar …
   - When no part is named elsewhere, that part becomes the request's part. So:
     - "drums acche hai par thode loud hai" [mix drums −3, vary melody]: only the drums go down;
     - offline: "Turned the drums down 5 dB".
   - All 4 of the tester's sentences pass.
2. **"Already at full volume" keeps the reason and Keys' question** (MEDIUM-HIGH).
   - The cause was a bracket bug in the fix-6 question rule in `honestReply`. A question sentence was still checked for claims, so "Want me to try new chords too?" was dropped. That is fixed.
   - `shortDone` turns "Bassline: already at full volume" into "The bassline is already at full volume.", not "Bassline.".
   - When every change was "already like that", Keys gives that reason instead of the AI's claim and keeps the AI's questions, in any language. For example: "The bassline is already at full volume. Want me to try new chords too?".
3. **Negations and "no need to change X"** (done):
   - offline "no need to change the melody make the chords quieter" turns the chords down;
   - "dont make the bass louder" and "i dont want new chords" now keep that part, offline and when Llama sends the action anyway;
   - the same for "the drums dont need to change", "i wouldnt change the bass at all", and "you dont need to change the bass make the chords brighter" (the bass stays, so it no longer follows the new chords);
   - "dont make it so loud" is still a complaint.
   - The request verb closest to the part now decides. In "the chords dont need to change make the bass quieter", "make" is the request.
4. **Praise that sounds like a complaint** (done):
   - "could not be better" and "couldnt sound better" count as praise;
   - so do full, rich, fat, thick, lush, huge and massive ("too full" is still a complaint);
   - "please dont add anything" changes nothing.
5. **A leading no after a question keeps everything** (done): "no", "nah leave it", "no thanks", "nahi rehne do", "nope its fine", "no its perfect as it is", "actually no keep it".
   - If Llama sends the action anyway, nothing changes.
   - "no make the bass louder instead" still turns the bass up.
6. **Offline "everything except X"** (the tester's item 6, done):
   - "redo it all apart from the bass" and "new everything except the chords" make new takes of every other part;
   - "bass ko chhod ke sab kuch thoda kam karo" turns every part but the bass down;
   - "everything is good except the drums and the bass make them quieter" turns both down.

Also:
- **Chord fit over a kept or sung bass** now counts only the bars where a chord sounds under the bass note, which is how the tester measures it. When no chord sounds there, the chord chart decides.
- This removed the random 1/2 picks: sung 18/18, chains 81/81 and chainC 24/24, up from 16/18, 78/81 and 21/24.

## Numbers: every set, fix 7 against fix 6 and main, case by case
**Fix 7 is not worse than fix 6 or main on any case in any set.**

**Tester's sets** (`/home/claude/qa/ai9r4/`, q.mjs with the saved take; my runs and `cmp7.py` are in `/home/claude/reports/ai9-fix7/qa/`). The fix 6 and main numbers are the tester's own runs.

| Set | Main | Fix 6 | Fix 7 |
|---|---|---|---|
| p | 9/52 | 52/52 | **52/52** |
| new | 43/96 | 96/96 | **96/96** |
| probe | 40/87 | 87/87 | **87/87** |
| probe2 | 8/13 | 13/13 | **13/13** |
| probe3 | n/a | 42/42 | **42/42** |
| probe4 | 17/20 | 20/20 | **20/20** |
| probe5 | 24/32 | 32/32 | **32/32** |
| probe6 | 22/30 | 21/30 | **30/30** |
| r5 | 94/143 | 143/143 | **143/143** |
| r6 | 58/108 | 77/108 | **108/108** |
| hq | 8/8 | 8/8 | **8/8** |
| hq6 (reply text) | 11/12 | 12/12 | **12/12** |
| q5 | n/a | 4/4 | **4/4** |
| full | 4/4 | 2/4 | **4/4** |
| chains | n/a | 78/81 | **81/81** |
| chainC | n/a | 21/24 | **24/24** |
| sung | n/a | 16/18 | **18/18** |
| old | n/a | 180/180 | **180/180** |
| nits | n/a | 12/13 | **12/13** |
| hr | n/a | 5/5 | **5/5** |
| hr2 | n/a | 3/3 | **3/3** |

The nits miss is the accepted offline wording "Melody: shorter, tighter notes".

**My sets** (`/home/claude/reports/ai9-fix5/mine/`; every case run on fix 7, fix 6 and main):

| Set | Main | Fix 6 | Fix 7 |
|---|---|---|---|
| p | 10/53 | 53/53 | **53/53** |
| new | 32/90 | 90/90 | **90/90** |
| x | 23/52 | 51/52 | **51/52** (the same accepted "yo keys" miss) |
| old | 67/180 | 180/180 | **180/180** |
| nits | 3/10 | 10/10 | **10/10** |
| n5 | 61/128 | 128/128 | **128/128** |
| n6 | 51/91 | 90/91 | **91/91** |
| **n7 (new)** | 33/66 | 37/66 | **66/66** |

**n7, the new fix-7 sweep.** 18 phrasings, each offline, with Llama's correct action, and with a Llama mistake, plus 12 flows:
- **Hinglish and English "praise but complaint":**
  - "bass mast hai par thoda zyada boomy hai"
  - "melody acchi hai lekin thodi fast lag rahi hai"
  - "chords theek hai magar thode dull hai"
  - "drums badhiya hai par kick thoda halka hai"
  - "bass acha hai bas thoda kam karo"
  - "melody kamaal hai par thodi loud hai"
  - "chords mast hai par thode boring hai naye do"
  - "the drums are great but kinda loud now"
  - "i like the bass but its a bit muddy"
  - "the chords are nice though a bit dull"
- **Negations:**
  - "dont make the drums busier"
  - "i dont want a new melody"
  - "the chords dont need to change make the bass quieter"
  - "no need to touch the drums just make the melody shorter"
- **Praise that sounds like a complaint:**
  - "the melody could not be better"
  - "the chords couldnt sound better"
  - "the bass sounds so full now"
  - "please dont add anything" [add_melody]
- **Replies after "Want me to make the melody simpler?":**
  - no / nah its fine / nahi mat karo / no thanks i like it / actually no leave it: nothing changes;
  - "no make the bass louder instead": the bass goes up;
  - yes / perfect do it / haan karo: the melody gets simpler.
- **Bass already at full volume,** with 3 AI replies including a Hinglish one ("Bass ab aur loud hai. Want me to add some reverb?"). Each bubble says it is already at full volume and keeps the question.

**Sound** (`renderAudio`, 4-bar loop, after the 10-sentence chain × 3 seeds):
- peak −0.43 to −0.54 dBFS, RMS −6.7 to −6.9 dB, 0 clipped samples;
- the sung bass was kept in 3/3 chains;
- page errors: 0.

**Smoke:** the tester's 3 lines are merged into the existing AI-9 check, now 24 sub-checks with no new page load:
- "drums acche hai par thode loud hai" [mix drums −3, vary melody]: only the drums go down, and the same offline;
- "chords acche hai par boring lag rahe hai" [vary chords]: the chords change;
- with the bass already at full volume, "make the bass louder" [mix bass +3] with the question reply: the bubble says "already at full volume" and keeps "Want me to try new chords too?".

## For the lead
- No Worker change in fix 7. The fix 2 and 3 prompt changes still need the deploy at release.
- Known limits (unchanged):
  - "which instrument is playing the chords" lists the chord names;
  - "the bass is great the chords need work" offline re-adds the chords;
  - a bare wake word with a made-up Llama action isn't guarded.

## Try list for a musician (say it like this, no punctuation)
Start with a beat that has drums, bass, chords and melody.
1. "drums acche hai par thode loud hai": only the drums go down. Also try "chords acche hai par boring lag rahe hai" for new chords.
2. "make the bass louder" a few times until Keys says the bass is already at full volume. It still asks its follow-up question.
3. "make the bass quieter everything else is fine": only the bass goes down.
4. "dont change a thing except the bass make it louder": only the bass gets louder.
5. "the melody feels a bit busy": Keys offers to make it simpler. Say "no thanks i like it" and nothing changes; ask again and say "yes" and the melody gets simpler.
6. "no need to change the melody make the chords quieter": only the chords go down.
7. "i dont want new chords": nothing changes, and Keys says it kept the chords.
8. "redo it all apart from the bass": new drums, chords and melody, and the bass stays.
