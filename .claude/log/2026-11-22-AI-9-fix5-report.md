# AI-9 fix 5 report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9`, head **1b4f796**, pushed. There are 2 WIP commits after 638c3c5: 2d8a5ec and 1b4f796. `main` was not touched.

Files changed: `src/actions.js`, `src/maker.js`, `tests/smoke.mjs` (one merged check), and `index.html` (rebuilt). **`cloudflare/worker.js` is unchanged**: no prompt lines, so there was no Llama run and fix 5 adds nothing to the Worker deploy. The fix 2 and 3 prompt changes still need it at release.

**check.sh: CHECK OK, SMOKE OK, 104 checks** (103 before, plus 1 merged fix-5 check), about 2.5 min at load 3.
- The first run failed on my own new check. In the smoke's running song the melody was already as simple as it gets, so the offline "…except make the melody simpler" had nothing left to do.
- I switched that offline half to "…except make the melody busier". The AI half still sends "simpler" with Llama's extra drums action. The second run passed.

## Fixes (problem numbers from re-check 4)
1. **A request first, then "everything else / the rest / the others / baaki sab is fine"** (HIGH).
   - New `KEEP_OTH` / `KEEP_OTHP` / `KEEP_OTHK` in `src/actions.js`. They recognise:
     - everything else, every other part, all the others, the rest (of it / the song …), the others, baaki / baki / baqi (sab / kuch …);
     - followed by praise: is/are … fine, good, perfect, can stay, stays the same, mast/theek/sahi hai;
     - or a keep phrase: leave / keep / dont touch the rest, baaki ko mat chhedo, baaki rehne do.
   - `speechComma` makes that phrase its own clause wherever it is. `protectSaid` drops it from the request and keeps every part the request is NOT about. That part is the one named, or the part just worked on ("make it quieter everything else is fine").
   - When the phrase is said alone, it keeps everything.
   - The reply adds "Kept everything else as it is."
   - Result for "make the bass quieter everything else is fine":
     - offline and with [mix bass −3]: the bass goes down and nothing else changes;
     - with Llama's extra [vary chords]: the chords action is dropped.
   - All 9 of the tester's sentences now do this, including the Hinglish ones and "make the chords simpler the others are fine". Praise-first versions still work.
2. **"everything / all / its all is good except / apart from X + request"** (HIGH).
   - New `excNorm` (runs inside `fillNorm`) rewrites the sentence as "X + request, everything else is fine", so it goes through the same path as problem 1. Examples:
     - "everything is good except the bass give me a new one" → "the bass give me a new one, everything else is fine";
     - "keep everything the same except make the melody simpler" → "make the melody simpler, …".
   - It covers everything/it all/its all/all + praise, keep/leave everything (the same), and dont change/touch anything. The link words are except (for), apart from, other than, besides, minus, siwaay, and "but". "but" counts only when a part or a request follows, so "its all good but too loud" isn't rewritten.
   - When only parts follow ("dont change anything except the chords"), it becomes "change the chords, everything else is fine".
   - All 6 of the tester's sentences change only X, offline and AI. Llama's extra action on another part is dropped.
3. **Closing words after working on a part** (MEDIUM-HIGH, offline).
   - New `closingSaid`. It recognises:
     - thats it, thats the one, thats perfect/good/exactly what i wanted, its perfect;
     - keep it (like this), we're done, nailed it, love it/this, i like it a lot;
     - this sounds/is sounding amazing, sounds so good;
     - dont change anything, this track is sick;
     - two or more strong praise words like "nice nice nice".
   - These count as praise of the whole song: no change, no Undo step, and the reply is "Glad you like it. I kept everything as it is.".
   - A bare "sounds good" or "ok cool" stays unguarded, because it can mean yes to a question.
   - `focusText` (`maker.js`) now turns "it" into the part just worked on only when the sentence asks for something (make, turn, put, change, louder, simpler, karo …). "thats it" and "keep it" are left alone.
   - `localBrain` no longer adds a second copy of a part from a bare name after "thats / this is / its" ("thats the melody"). Instead it says the part is already in the song and how to add or change one. "just the melody" after a keep still changes the melody.
4. **Praise words** (done):
   - "melody its perfect" (its / it's / they're as the verb);
   - is hitting, are bumping, cooking, grooving, popping, slapping;
   - "too good to change / touch" ("too" no longer cancels the praise);
   - "alright alright …".
5. **Praise of the whole song with a Llama mistake** (done):
   - All 10 of the tester's phrases now keep every part when Llama sends a change, for example "this sounds amazing", "love this", "dont change anything", "this track is sick bro dont change anything", "nice nice nice" and "ok thats good".
   - Llama's correct [] was already fine.
   - "sounds good" alone still runs Llama's action.

Nits:
- **Honest reply.** When the guard drops nothing but Llama's reply claims a change to a kept part, or to any part that didn't change at all, that sentence is left out and the short honest reply is used. Examples:
  - "Done, new drums and a darker bass." with only [vary bass] becomes "New bassline. Kept the drums as they are.";
  - "Made the drums louder." for a shorter melody, "Here is a new melody!" for a simpler bass and "I changed the chords to piano." for the melody on piano are dropped the same way.
  - Sentences with a keep word stay.
  - The tester's hr set goes from 1/5 to 5/5.
- **"how many bars is the loop"** is now answered offline: "The loop is 4 bars long. …". With a song layout, the reply gives the song length too.

## Numbers
Before = fix 4 (638c3c5); for the tester's sets that's the tester's own re-check 4 run. Main is the tester's run on origin/main. I compared every case: **fix 5 is not worse than fix 4 or main on any case.** The only exception is one sung-take fit case, explained below.

**Tester's sets** (`/home/claude/qa/ai9r4/`, q.mjs, run on my build; copies and outputs in `/home/claude/reports/ai9-fix5/qa/`, comparison `cmp.py`):

| Set | Main | Fix 4 | Fix 5 |
|---|---|---|---|
| p (re-check 3) | 9/52 | 52/52 | **52/52** |
| new (35 phrasings × 3) | 43/96 | 79/96 | **96/96** |
| probe | 40/87 | 45/87 | **87/87** |
| probe2 ("thats it" family) | 8/13 | 5/13 | **13/13** |
| probe3 | n/a | 34/42 | **42/42** |
| probe4 (request then praise) | 17/20 | 12/20 | **20/20** |
| chains (81 comments) | n/a | 75/81 (73/81 rerun today) | **81/81** (2 runs) |
| sung | n/a | 18/18 | 17/18 |
| old (180) | n/a | 180/180 | **180/180** |
| nits | n/a | 11/13 | **12/13** |
| hr (honest reply) | n/a | 1/5 | **5/5** |
| hr2 | n/a | 3/3 | **3/3** |

- **Sung miss (s4).** It is "new chords please" over a sung bass, and it fit 2/3 bars against the 0.75 bar.
  - q.mjs records a new fake-mic take every run (9 to 13 notes), so the fit depends on the take.
  - Fix 4 misses the same case in a same-day run with its own take (17/18).
  - In the chains runs, both fix 4 and fix 5 dip to 1/2 bars on some takes.
- **nits miss.** It is "make the melody shorter" offline: the reply is "Melody: shorter, tighter notes", not "Shorter melody notes". The tester already said that wording reads fine.

**My sets** (`/home/claude/reports/ai9-fix4/h.mjs` against the fix 5 build): no change from fix 4.

| Set | Fix 5 |
|---|---|
| p | 53/53 |
| new | 90/90 |
| x | 51/52 (the same accepted "yo keys" miss) |
| old | 180/180 |
| nits | 10/10 |

**New fix-5 sweep** (`/home/claude/reports/ai9-fix5/n5.json`): 128 cases, **fix 4 48/128, fix 5 128/128.**
- 22 new request-then-praise and except phrasings, each offline, with Llama's correct action, and with a Llama mistake. Examples:
  - "turn the drums down a bit everything else sounds great"
  - "try a different bassline the others are fine bro"
  - "make the melody shorter everything else can stay"
  - "drums badlo baki sab mast hai"
  - "melody ko simple karo baaki ko mat chhedo"
  - "new drums please leave everything else alone"
  - "change the chords and keep the rest"
  - "everything is perfect except the drums are too loud"
  - "its all fire apart from the bass try another bassline"
  - "keep it all the same except make the drums simpler"
  - "sab theek hai bas bass thoda kam karo"
  - "dont touch anything except the melody give me a new one"
  - "okay so everything is great except the bass change it up"
- The tester's problem 4 and 5 phrases, each × 3.
- 6 closing phrases after "make the melody happier", plus a Llama mistake after "make the bass simpler".
- "make it quieter everything else is fine" right after the bass, offline and AI.
- "sounds good" and "ok cool" with a Llama action: these still run it.
- The hr5 contradiction case.

**Chains and sound** (`try.mjs`, the 10 re-check 3 sentences × 3 seeds, plus the same over a sung bass):
- All parts changed as expected, and the sung bass was kept in 3/3 chains.
- Sound: peak −0.50 to −0.51 dBFS, RMS −6.7 to −6.8 dB, 0 clipped samples.
- Page errors: 0.

**Smoke:** one merged check, "AI-9 fix 5", with 12 sub-checks:
- the tester's 6 suggested lines, offline and with the Llama mistake, comparing volumes as well as notes;
- "perfect thats it" and "thats perfect keep it" after "make the melody happier": no change and no Undo step.

## For the lead
- No Worker change in fix 5. The fix 2 and 3 prompt lines still need the deploy at release.
- **For the tester:** q.mjs records a new fake-mic take each run, so the sung-bass fit checks (0.75) can pass or miss depending on the take. That happens on fix 4 too. Reusing one saved take would make those runs repeatable.
- Known limits (unchanged):
  - "the bass is great the chords need work" offline re-adds the chords.
  - "which instrument is playing the chords" lists the chord names.
  - Pure wake words ("yo keys") aren't guarded against a made-up Llama action.
  - Closing words protect every part, so "thats perfect" after Keys asks "want me to make the bass louder?" won't change the bass. A part that doesn't exist yet can still be added.

## Try list for a musician (say it like this, no punctuation)
Start with a beat that has drums, bass, chords and melody.
1. "make the bass quieter everything else is fine": only the bass goes down. In Hinglish: "bass thoda kam karo baaki sab mast hai".
2. "change the drums the rest is fine": new drums, and the bass, chords and melody stay exactly as they are.
3. "everything is good except the bass give me a new one": a new bassline only.
4. "keep everything the same except make the melody simpler": only the melody gets simpler.
5. "make the melody happier", then "perfect thats it": the second one changes nothing and adds no Undo step. Also try "thats perfect keep it".
6. "the bassline is sick dont touch it try new chords": new chords, the bassline stays, and the chords fit it in most bars.
7. "chords ko mat chhedo melody nayi do": a new melody, and the chords stay.
8. "this sounds amazing": nothing changes, and Keys says it kept everything.
