# AI-9 fix 6 report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9`, head **4a37c43**, pushed. There are 2 WIP commits after 1b4f796: 7f982d3 (pushed about 10 minutes in) and 4a37c43. `main` was not touched.

Files changed: `src/actions.js`, `tests/smoke.mjs` (the existing fix-5 check now has 20 sub-checks), and `index.html` (rebuilt). `src/maker.js` and **`cloudflare/worker.js` are unchanged**: no prompt lines, so there was no Llama run and fix 6 adds nothing to the Worker deploy. The fix 2 and 3 prompt changes still need it at release.

**check.sh: CHECK OK, SMOKE OK, 104 checks.** Two runs, both passed: about 2.4 min at load 0.7, and again at load 4 to 9.

## Fixes
1. **Keys' questions and ideas are never cut from its reply** (HIGH, new in fix 5).
   - A new rule, `REPLY_ASKS`, protects these sentences:
     - any sentence ending in "?";
     - sentences with: want me to, should I, shall I, how about, what about, maybe, you could, we could, could try, you can, you might, next, try, if you want, if you like, say the word, would you like, do you want, let me know, or I can, I can also.
   - `honestReply` never drops them and never counts them as a claim.
   - Sentences that CLAIM a change to a part that didn't change are still dropped. hr stays 5/5. For example:
     - "Made the drums louder." when only the melody changed;
     - "Here is a new melody!" when the melody didn't change.
   - Every question or idea reply in my n6 set is shown in full (7/7, fix 5: 1/7). The tester's hq set is 8/8, but it doesn't check reply text.
   - "Turned the bass up 3 dB. Want me to try new chords too?" keeps both sentences.
2. + 3. **Structural, not more phrases** (HIGH, AI-path regressions).
   - **(a) except / apart from / other than / besides / but not / siwaay / chhod ke / ke alawa + a part** (`excAny`).
     - When the words before it only praise or keep, that part is the one to change and everything else stays. That covers any praise word, love/like/dig, keep/leave, and dont change/touch (a thing / anything).
     - When the words before it change everything, the part is the one left alone, as before: "mute everything except the drums", "make everything quieter except the drums", "everything except the melody should be quieter".
     - Hinglish "X chhod ke …", "siwaay X ke …" and "X ke alawa …" are read the same way.
   - **(b) A part the sentence asks to change is never protected** (`askedParts`). Each part mention is checked for:
     - a request verb just before it that isn't negated: make, give, change, try, swap, put, turn, new, another, simpler, louder, nayi …;
     - a complaint or change after it: needs, could be, should be, too (not "too good to"), feels/sounds/is weak, flat, boring, thin, muddy, loud, quiet …, louder, simpler, punchier, karo, badlo, kam;
     - more / less / up / down / thoda right after it;
     - "it / them / they" after a request: the part just named, or the part just worked on.

     Words like "mat badlo" and a part right after except, when everything is changing, don't count. Praise and keep words then protect only the parts not asked about, and a clause that was dropped as praise comes back if it holds the asked part.
   - **"rest / others / other stuff / everything else / baaki" + praise or a keep** is now one general pattern:
     - any of: the rest, rest (no "the"), the rest of it/the song/…, others, other parts/stuff/things/bits/sounds, all the other stuff, every other part, everything else, anything else, baaki/baki (sab/kuch …);
     - followed by any praise word, "slaps / bangs / hits / works / sits well", "stays / can stay the same", Hinglish praise, or a keep phrase.
   - Examples that now work:
     - "the drums need more punch rest is fine" [track_fx drums compressor]: the drums run;
     - "the melody could be a bit louder rest of it is perfect" [mix melody +3]: the melody goes up, and an extra [vary bass] is dropped;
     - "swap the bass sound for an 808 all the other stuff is good" [instrument bass 808]: the bass sound changes.
4. **After a question from Keys, closing words are a yes** (MEDIUM; AI path).
   - If Keys' last reply asked something (ends in "?", or has want me to / should I / how about / do you want / would you like), closing or praise words don't protect anything. "thats perfect", "perfect", "nice", "mast hai" and "love it" now run Llama's action.
   - With no question pending, fix 5 behaviour stays: "thats perfect" after "Turned the bass up 3 dB." keeps everything.
   - Offline stays as in fix 5, because offline can't answer a yes.
5. **More whole-song praise:** "yep thats the vibe right there", "beautiful we are done", "bas yahi chahiye tha", "mast hai yaar ekdum" and "i love how this sounds now" keep every part when Llama sends a change and no question is pending.
6. **"thats it for the drums now change the bass"** changes only the bass. "thats it / done / we're done with/for the X" marks X as finished, so it stays.

Also:
- **New chords over a kept bassline** rank the bass fit before the mood. "make the chords happier" over a kept or sung bass picks the brightest progression that still sits on the bass. In my first fix-6 run, sung case s1 ("nice bassline i sang make the chords happier") dropped to 1/2; with the new order it is back to 2/2, and sung is 18/18.
- The fit is now measured on the chord notes that really sound when each bar's first bass note starts.

## Numbers: before (fix 5) and after (fix 6), every set
Every case is compared with fix 5 and main. **Fix 6 is not worse than fix 5 or main on any case in any set.**

**Tester's sets** (`/home/claude/qa/ai9r4/`, q.mjs with the saved take; my runs and comparison are in `/home/claude/reports/ai9-fix5/qa/`: `*-f6.txt`, `cmp6.py`):

| Set | Main | Fix 5 | Fix 6 |
|---|---|---|---|
| p | 9/52 | 52/52 | **52/52** |
| new | 43/96 | 96/96 | **96/96** |
| probe | 40/87 | 87/87 | **87/87** |
| probe2 | 8/13 | 13/13 | **13/13** |
| probe3 | n/a | 42/42 | **42/42** |
| probe4 | 17/20 | 20/20 | **20/20** |
| probe5 | 24/32 | 22/32 | **32/32** |
| r5 (re-check 5) | 94/143 | 120/143 | **143/143** |
| hq (Keys' questions) | 8/8 | 8/8 | **8/8** |
| q5 | n/a | n/a (fix 4: 4/4) | **4/4** |
| chains | n/a | 78/81 | **78/81** |
| chainC | n/a | 21/24 | **21/24** |
| sung | n/a | 18/18 | **18/18** |
| old | n/a | 180/180 | **180/180** |
| nits | n/a | 12/13 | **12/13** |
| hr | n/a | 5/5 | **5/5** |
| hr2 | n/a | 3/3 | **3/3** |

hq has no checks on the reply text, so it passes on fix 5 too (I reran it on the fix 5 build: 8/8). The question cut is measured by r5 (fix 5: 120/143) and by the question cases in my n6 set:

| n6 question cases | Main | Fix 5 | Fix 6 |
|---|---|---|---|
| question or idea shown in full | 6/7 | 1/7 | **7/7** |
| yes after a question runs the action | 7/7 | 5/7 | **7/7** |
| closing words, no question pending, keep everything | 0/3 | 3/3 | **3/3** |

**About the chains and chainC misses** (unchanged from fix 5): they are the second "new chords please the bass is perfect" over the saved 11-note sung take, where the tester's check reads 1/2. I traced it:
- The tester's check only counts bars where a chord is sounding when the bar's first bass note starts. On this take that is only bars 1 and 3.
- By Keys' own bar-by-bar check, the chosen chords fit 3 of 4 bars ("fits most bars").
- The only progression that fits all four bars was used by the first chord change. A second change has to differ from it, so it lands on a 3/4 one.

**The nits miss** is the accepted offline wording "Melody: shorter, tighter notes".

**My sets** (`/home/claude/reports/ai9-fix5/mine/`; same cases run on fix 5, fix 6 and main):

| Set | Main | Fix 5 | Fix 6 |
|---|---|---|---|
| p | 10/53 | 53/53 | **53/53** |
| new | 32/90 | 90/90 | **90/90** |
| x | 23/52 | 51/52 | **51/52** |
| old | 67/180 | 180/180 | **180/180** |
| nits | 3/10 | 10/10 | **10/10** |
| n5 | 61/128 | 128/128 | **128/128** |
| **n6 (new)** | 51/91 | 49/91 | **90/91** |

**n6 is the new fix-6 sweep: 25 new phrasings plus question flows.** Each phrasing runs offline, with Llama's correct action, and with a Llama mistake.
- Except and apart-from:
  - "dont change a single thing except the chords give me new ones"
  - "everything bangs except the melody try another one"
  - "i love all of it except the bass make it quieter"
  - "its all vibing apart from the drums make them simpler"
  - "sab badhiya hai siwaay melody ke nayi melody do"
  - "chords chhod ke baaki sab mast hai chords badlo"
  - "i like everything other than the hats make them busier"
  - "keep it all exactly like this except the bass give me a new one"
- Change-everything controls (the except part stays): "mute everything except the drums", "change everything except the drums".
- Rest-is-fine:
  - "the bass needs more low end rest is fine"
  - "make the chords a bit wider all the other stuff is good"
  - "the melody sounds a bit thin the others are perfect"
  - "drums need to hit harder everything else slaps"
  - "put the melody on a flute the rest of it sounds sick"
  - "bass thoda neeche karo baaki sab ekdum sahi hai"
  - "the chords could be darker other parts are good"
  - "just swap the drum kit everything else is perfect"
- Finished-with-a-part: "thats it for the bass now make the melody happier", "we are done with the drums now try new chords".
- The 5 whole-song praise phrases from item 5.
- Question flows:
  - 7 replies that are questions or ideas, all shown in full;
  - 7 yes-replies after "Want me to turn the bass up 3 dB?": "thats perfect", "perfect", "nice", "yes do it", "sounds good", "mast hai" and "love it" all turn the bass up;
  - 3 closing phrases with no question pending: they keep everything.
- The one miss, "change everything except the drums" offline, misses on fix 5 too. Offline can't change three parts from that sentence; the AI path is fine.

**Sound** (`renderAudio`, 4-bar loop, after the 10-sentence chain × 3 seeds): peak −0.38 to −0.53 dBFS, RMS −6.7 to −6.8 dB, 0 clipped samples. The sung bass was kept in 3/3 chains. Page errors: 0.

**Smoke:** the tester's 6 lines are merged into the existing "AI-9 fix 5" check, now 20 sub-checks with no new page load:
- "the bass feels kinda weak" with the AI question "Want me to turn the bass up 3 dB?" shows the question. Then "yes do it" [mix bass +3] turns the bass up.
- "make the bass louder" with the two-sentence reply shows both sentences.
- "the drums need more punch rest is fine": the drums compressor runs (checked at the guard).
- "dont change a thing except the bass make it louder" [mix bass +3, vary drums]: only the bass moves.
- "everything slaps except the bass give me a new one" [vary bass]: only the bass changes.
- "i love everything apart from the hats make them simpler" [hats 8th, vary bass]: only the hats change (checked at the guard).

## For the lead
- No Worker change in fix 6. The fix 2 and 3 prompt changes still need the deploy at release.
- **For the tester:** the chainC "1/2" checks only count bars where a chord sounds at the bass note's start. Keys measures every bar from the chord chart (3/4 here), so the two numbers will differ on this take.
- Known limits:
  - Offline "change everything except the drums" does nothing; the AI path is fine.
  - "which instrument is playing the chords" lists the chord names.
  - "the bass is great the chords need work" offline re-adds the chords.
  - Pure wake words ("yo keys") aren't guarded.

## Try list for a musician (say it like this, no punctuation)
Start with a beat that has drums, bass, chords and melody.
1. "make the bass quieter everything else is fine": only the bass goes down. Also try "the drums need more punch rest is fine".
2. "dont change a thing except the bass make it louder": only the bass gets louder.
3. "i love everything apart from the hats make them simpler": only the hi-hats change.
4. "everything slaps except the bass give me a new one": a new bassline only.
5. "the bass feels kinda weak": Keys asks if it should turn the bass up. Say "yes do it" (or "thats perfect") and the bass goes up.
6. "thats it for the drums now change the bass": a new bassline, and the drums stay.
7. "make the melody happier", then "perfect thats it": the second one changes nothing.
8. "chords chhod ke baaki sab mast hai chords badlo": new chords, and everything else stays.
