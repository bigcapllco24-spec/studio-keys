# AI-9 re-check 4 (fix 4) · qa-tester · 22 Nov 2026 · preview-ai-9 @ 638c3c5

## Verdict: NOT READY
Fix 4 does what its report says:
- All re-check 3 problems 1 to 5 pass: 52/52, offline, with Llama's correct action and with its typical mistake. Main gets 9/52 on the same set.
- The developer's rebuilt old sets pass 180/180.
- Sung parts are kept in 42 of 42 comments.
- Renders are clean.
- check.sh passes.

My new spoken phrasings found one new pattern that **blocks a correct action that main runs**. A request said **first**, followed by praise of "the rest", "everything else", "the others" or "baaki sab", protects the part that was just asked for. Nothing happens and Keys says "Kept the bassline as it is." Any extra Llama action on the praised parts still goes through, which is the opposite of the owner's 19 Nov rule. Musicians say this all the time ("make the bass quieter everything else is fine"), so this blocks.

Two smaller patterns (2 and 3 below) are also new compared with main.

## Problems (blocking)
Setup for all: a new song, then a house loop of drums, bass, chords and melody (seeds 5300 to 5303). Type each sentence exactly as written. "AI" means the shown Llama actions are stubbed through `handleRequest`.

1. **HIGH, regression on the AI path: a request followed by "the rest / everything else / the others / baaki sab is fine" protects the asked part and blocks the request.**
   - **"make the bass quieter everything else is fine"**
     - AI [mix bass −3]: nothing changes. The reply is "Done. Kept the bassline as it is."
     - Offline: "OK. Kept the bassline as it is."
     - AI [mix bass −3, vary chords]: **the chords change** and the bass doesn't.
     - Main turns the bass down.
   - The same happens, offline and AI, with the correct action blocked every time and main running it every time:
     - "make the bass quieter the rest is perfect"
     - "change the drums the rest is fine"
     - "new bassline please everything else is perfect"
     - "bass thoda kam karo baaki sab mast hai"
     - "yaar bass thoda kam karo baaki sab theek hai"
     - "melody badlo baaki sab theek hai"
     - "melody thodi loud karo baaki sab sahi hai"
     - "make the chords simpler the others are fine" (main doesn't change this one either)
   - With the praise first, it works:
     - "the rest is fine just change the drums"
     - "everything else is perfect but the bass is too loud"
     - "everything else stays the same just make the bass quieter"
   - Should happen: only the asked part changes, and every other part is kept. "Everything else / the rest / the others / baaki sab" means the parts that were not asked about.
   - Likely cause: the fix-4 rule that makes praise at the end its own clause (`speechComma` / `protectSaid` / `KEEP_PRAISE` in `src/actions.js`). The trailing "… is fine" seems to bind to the last part named before it, which is the asked part. assistant-dev.
2. **HIGH (regression on the AI path for some phrases): "everything / all / its all is good except / apart from X + request" protects X and blocks the request.**
   - "everything is good except the bass give me a new one":
     - offline: "I couldn't turn that into a change";
     - AI [vary bass]: blocked, "Kept the bassline as it is.";
     - AI [vary bass, vary chords]: **only the chords change**;
     - main runs [vary bass].
   - "all good apart from the melody try another one": the same, and main runs it.
   - "its all good except the chords change them": AI [vary chords] is blocked, and [vary chords, vary melody] changes **only the melody**. Main changes the chords plus extra parts.
   - "keep everything the same except make the melody simpler", "keep everything except make the melody simpler" and "keep everything the same except the melody make it simpler":
     - AI [reshape melody simpler] says "Kept the melody as it is.";
     - AI [reshape melody simpler, groove drums energy 2] **simplifies the drums** instead;
     - main doesn't change the melody either, but it doesn't claim to have kept it.
   - These work: "keep everything but the bass" (fix 4), "everything is fine but the bass change it", "keep it all the same but make the melody simpler", "keep everything the same but change the chords".
   - Should happen: "except / apart from X" makes X the part to change.
   - Files: same as problem 1.
3. **MEDIUM-HIGH (offline regression): after working on a part, closing words re-make that part.**
   - Steps: "make the melody happier", then any of these:
     - "perfect thats it"
     - "thats it"
     - "thats perfect keep it"
     - "thats it bro thats the one"
   - Result: **a new "Melody 2" track** is added (screenshot `shot-fail-thatsit.png`).
   - After "make the bass simpler", the same phrases give a new bassline.
   - Main does nothing.
   - With no recent part, nothing happens.
   - The AI's correct [] is fine, so on the live site this shows only when the AI falls back to offline.
   - Cause: `focusText` in `src/maker.js` swaps "it" for the focus part. "thats it" becomes "thats the melody", which `localBrain` reads as `add_melody`. Fix it by leaving praise or closing phrases alone, or by never adding a part from a bare part name with no verb. assistant-dev.

### Suggested smoke lines
Run each offline and with the correct AI action. The Llama mistake to include is in brackets.
- "make the bass quieter everything else is fine" [mix bass −3, vary chords]: bass down only.
- "change the drums the rest is fine" [vary drums]: drums only.
- "bass thoda kam karo baaki sab mast hai" [mix bass −3, vary chords]: bass down only.
- "everything is good except the bass give me a new one" [vary bass, vary chords]: bass only.
- "keep everything the same except make the melody simpler" [reshape melody simpler, groove drums energy 2]: melody only.
- "make the melody happier", then "perfect thats it" offline: no change, no Undo step. Also check "thats perfect keep it".

## Not blocking (owner rule, same on main)
4. **Praise words the guard still doesn't know, offline.** The praised part is regenerated:
   - "melody its perfect": the melody is replaced. "the bass its fire dont touch it" and "the melody is perfect just leave it" are fine.
   - "the bass is hitting": the bass is re-added.
   - "alright alright the bass is hitting now lets get a new melody": a new bassline as well as the new melody, and the same with AI [vary melody, vary bass].
   - "the drums are bumping change the chords": new drums as well.
   - "the drums are too good to change": new drums.
   - "the drums are too good to change but the melody needs a rework": new drums plus a Melody 2 track.
   - With Llama's correct action, all of them are right.
5. **Praise of the whole song with a Llama mistake changes a part.** The correct AI [] is always fine. These phrases are not covered:
   - "this sounds amazing"
   - "love this"
   - "its perfect"
   - "sounds so good bro"
   - "this is sounding really good now"
   - "i like it a lot keep it like this"
   - "dont change anything"
   - "this track is sick bro dont change anything"
   - "nice nice nice"
   - "ok thats good"

   Covered: "everything sounds great", "keep it like this", "everything is fire now".

## Nits
- **Honest reply:**
  - When the guard drops nothing, the AI's wrong reply is spoken as is.
  - The worst case is a contradiction: "the drums are great make the bass darker" with only [vary bass darker] and the reply "Done, new drums and a darker bass." becomes "Done, new drums and a darker bass. Kept the drums as they are."
  - When the guard does drop an action, the fix-4 replies work (3/3): "Shorter melody notes. Kept the drums as they are.", "Bassline down 3 dB. Kept the chords as they are." (the whole-song claim dropped) and "New bassline. Kept the drums as they are."
- **"Darker chords" means two different things:**
  - offline "actually the chords could be darker" turns the chords' high EQ down 3 dB (tone);
  - the AI path gives a darker progression.
- **Chord fit under a kept bass:**
  - "I really like that bassline now change the chords" fits 4/4 bars in 2 of 6 runs and 3/4 in 4 of 6, never lower.
  - Over a sung bassline it fits 1/1 every time.
  - The Try wording "fits most bars" is honest.
- **Known limits, unchanged:**
  - "the bass is great the chords need work" offline gives "Chords (replaced)". The AI path is fine.
  - "how many bars is the loop" gets no answer.
  - "which instrument is playing the chords" lists the chord names.
- The offline reply for "make the melody shorter" is "Melody: shorter, tighter notes, same notes." That reads fine. The new "Shorter melody notes." shows only as the short fallback.

## What I checked (numbers)
Scripts and outputs are in `/home/claude/qa/ai9r4/`. The harness is `q.mjs`, and the case builders are `mk.py` and `mkchain.py`. Each step diffs every track (name, sound, seed, volume, EQ, effects, mute, recipe, notes) and expects exactly one Undo step, with Undo and Redo both exact. No change must leave no Undo step. Main means origin/main b442b1e (no product changes missing from the branch). The built `index.html` matches `src/`: check.sh printed no rebuild note.

- **check.sh:**

  | Run | Result | Time | Load |
  |---|---|---|---|
  | 1 | CHECK OK, SMOKE OK 103 | 3m12s | 2 to 4, the other tester running |
  | 2 | CHECK OK, SMOKE OK 103 | 2m20s | 1 |

- **Reload flake ("song: opening the app…" and the Undo-after-open check that follows it): 0 failures in 6 branch runs** (2 check.sh plus 4 smoke runs) **and 0 in 4 main runs.**
  - Branch and main ran side by side, at load 10 to 15.
  - At that load, one other timing check flaked once on each, neither in AI-9 files:
    - branch: "Ctrl+D in the editor duplicates the notes…", 1 of 6 runs (48 → 96 → 96 notes). It passed in check run 2.
    - main: "listening off … releases the mic", 1 of 4 runs.
- **Re-check 3 problems 1 to 5** (`p.json`; offline, correct AI, Llama mistakes): **branch 52/52, main 9/52.**
  - "nice the melody is great now" and "okay okay the chords are fire bro" leave no Undo step and block [vary]/[add_melody].
  - The Hinglish, pronoun and "and all" phrases now change only the asked part.
  - "go crazy", "bahut acche" and trailing "…the drums are good though" are guarded.
  - "make the melody happier" gives "a new melody, leaning happier".
  - "do something with the melody" acts.
- **Developer's rebuilt old sets (`old.json`, 180 cases): 180/180** with my harness.
- **New spoken phrasings, not in any earlier set: about 110 distinct.**
  - Main set `new.json`: 35 phrasings × (offline, correct AI, Llama mistake) = 96 cases. **Branch 79/96, main 43/96.**
    - The branch is better than main in 41 cases and worse in 4 (n07, n23: problems 1 and 2).
    - Working well:
      - filler ("umm so like the drums are kinda nice but uh can you change the bassline", "okay um the melody is cool i guess but the chords are a bit too dark");
      - Hinglish ("bhai chords toh kamaal hai bass thoda simple karo", "melody ekdum jhakaas hai isko mat badlo drums badal do", "drums ko aise hi rehne do aur melody thodi chhoti karo", "melody ko piano pe daal do chords mast hai");
      - pronouns ("the chords are lovely leave em alone and change the drums", "that bassline is perfect keep it that way and make the melody quieter", "i like what the drums are doing dont change that just give me new chords");
      - praise at the end ("give me a darker bassline the chords sound amazing by the way", "make the drums a bit busier the bass is perfect btw", "turn the chords down a little the melody is beautiful");
      - questions ("can we hear the melody on a flute instead", "what if the drums had more swing", "could we try a sadder melody keeping everything else the same");
      - negations ("the drums are not good change them but keep the bass", "the bass isnt great try another one", "the melody is good but not great try another one", "i dont love the chords");
      - "keep everything but change the drums", "leave everything else alone just swap the chords", "dont make the bass louder make the drums louder".
  - Variant probes:
    - `probe.json`: 32 phrasings. Branch 45/87, main 40/87; the branch is worse in 11 cases, all from problems 1 and 2.
    - `probe2` and `probe3` ("thats it" family, problem 3).
    - `probe4`: request-then-praise. Branch 12/20, main 17/20.
- **Chains** (`chains.json`, 3 chains × 3 seeds, 81 comments): **75/81.**
  - The 6 misses are "perfect thats it" offline, 3 times (problem 3), and "this track is sick bro dont change anything" with Llama [vary melody], 3 times (problem 5).
  - Chain A (10 offline comments) runs: drums kept, then new chords, then melody up 3 dB, then a happier melody, then melody down 3 dB, then busier drums with the bass kept, then a new melody, then the whole song kept.
  - Chain B (9 AI comments, most with a Llama mistake): every mistake was stopped except problem 5.
  - Chain C (8 comments over a sung bassline): all correct.
- **Sung bassline** (a real take from the fake mic, 12 to 14 notes, snapped to each song's key; `sung.json` plus chain C): **kept in 42/42 comments.**
  - "make the bass busier" and "change the bassline" keep the notes ("Sung bassline is your own part…"), offline and AI.
  - New chords fit it, and the reply says "your bassline stays as you sang it".
  - Hinglish "bass jo maine gaaya woh rehne do drums badlo" changes only the drums.
- **Sound** (offline `renderAudio`, 4-bar loop at the end of each of the 9 chains):

  | Measure | Range |
  |---|---|
  | Peak | −0.35 to −0.59 dBFS |
  | RMS | −6.7 to −7.1 dB |
  | Clipped samples | 0 |
  | Silent 100 ms blocks | 0 of 77 |

- **Speed:** `handleRequest` took 3 to 900 ms per comment with the AI stubbed, under load.
- **Page errors:** 0 in every run.

## Screenshots (`/home/claude/qa/ai9r4/`)
- `shot-start.png`
- `shot-good.png`: fix-4 lines working: "Kept the bassline as it is" with only new chords, and "Kept the chords and the bassline as they are" with a happier melody.
- `shot-fail-rest.png`: problems 1 and 2. "Done. Kept the bassline as it is." with no change, and then new chords for "bass thoda kam karo baaki sab mast hai".
- `shot-fail-thatsit.png`: problem 3. The Melody 2 track after "perfect thats it".

The chat bubbles and chips read cleanly.
