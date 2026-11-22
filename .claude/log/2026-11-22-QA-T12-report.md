# AI-9 re-check 3 (fix 3) · qa-tester · 22 Nov 2026 · preview-ai-9 @ b1d2bf8

## Verdict: NOT READY
Fix 3 does everything its report claims. All of my old sets now pass: p2 20/20, p3 12/12, p4 11/11, p6 13/13, hr 15/15, f2 62/62, n 33/33 and try 16/16. rv is 17/18, and the one miss is R3 ("go back" = Undo), which I already accepted. T1 to T10 show no regressions. The 8 Try steps work as written, apart from a small chord-fit point on step 6. check.sh passes.

The 28 new spoken phrasings, which the developer hasn't seen, still break the owner's rule or block the request in four patterns:
- **A filler word before praise ("nice …", "okay okay …") turns the praise guard off.** "nice the melody is great now" rewrites the melody offline. It also does so on the AI path when Llama sends a wrong action. Without the filler, the melody is protected.
- **A protect phrase with a pronoun or in Hinglish swallows the request.** Nothing happens, and the AI's correct action is blocked. Examples: "dont touch it", "leave those", "usko rehne do", "chords ko mat chhedo melody nayi do".
  - "chords ko mat chhedo melody nayi do" is a clear regression: main runs Llama's [vary melody] correctly, and the branch blocks it.
- **Praise words the guard doesn't know regenerate the praised drums.** "go crazy", "bahut acche hai", and trailing "… the drums are good though" all do this.
  - Offline this happens always. On the AI path it happens whenever Llama adds the wrong action, so the guard doesn't catch it.
  - Main does the same, so this isn't a regression, but it is exactly the owner's 19 Nov rule.
- **"so the beat is cool and all but the chords feel kinda flat can we try something else" blocks Llama's [vary chords].**

Compared with main the branch is much better overall:

| Set | Branch | Main |
|---|---|---|
| n3 | 29/43 | 11/43 |
| n3b | 14/28 | 4/28 |
| n3c | 5/12 | 1/12 |

Problems 1 and 2 still fail the owner's rule as the brief asks me to apply it.

**check.sh: CHECK OK, SMOKE OK, 102 checks** (one run, about 3.5 min, load 1 to 4, no flake). All 13 AI-9 smoke checks pass, including the 2 new fix-3 checks.

## Problems (numbered, with steps)
Setup for all: a new song, then a house loop of drums, bass, chords and melody (seeds 5300 to 5303). Type each sentence exactly as written: no punctuation, no apostrophes. "AI" means the Llama actions shown are stubbed through `handleRequest`.

1. **HIGH, owner rule: a leading filler word turns off praise protection.**
   - a) "nice the melody is great now" (offline): the melody is **replaced with new notes**. The reply is "Done: Melody (replaced) on Analog Lead. …".
     - "nice the melody is great" does the same.
     - These are protected: "the melody is great", "the melody is great now" and "nice melody" ("OK. Kept the melody as it is.").
     - Main adds a "Melody 2" track (also wrong).
   - b) AI, with Llama mistakenly sending [vary melody] for "nice the melody is great now": the melody is rewritten.
     - The same mistake for "the melody is great now" is blocked ("Kept the melody as it is.").
     - With [add_melody], the melody is replaced.
   - c) "okay okay the chords are fire bro" and "okay the chords are fire" (offline): the chords are re-added. The notes are the same, but the seed is new, `isNew` is set, there is an Undo step, and the reply is "Done: Chords (replaced) on Grand Piano in A minor".
     - AI with Llama mistakenly sending [vary chords]: **new chords**. The same mistake for "the chords are fire" is blocked ("Kept the chords as they are.").
     - With the correct AI action [] and the reply "Glad you like them!", both a) and c) are fine.
   - Likely cause: the fix-3 leading-filler strip in `speechComma` / `protectSaid` (`src/actions.js`). "nice", "okay okay" and "ok cool" are treated as filler, and the praise clause after them is no longer marked. assistant-dev.
2. **HIGH (regression on the AI path) / MEDIUM: a protect phrase with a pronoun, "those", or in Hinglish swallows the request that follows. Nothing changes, and the AI's correct action is blocked.**
   - a) "chords ko mat chhedo melody nayi do": the reply is "Kept the chords and the melody as they are."
     - AI [vary melody]: blocked.
     - The reversed order "melody nayi do chords ko mat chhedo" [vary melody]: blocked.
     - **Main runs [vary melody] correctly** (melody only), so this is a regression.
   - b) "yo keys the bassline is sick dont touch it or the drums try new chords": "Kept the drums, the bassline and the chords as they are."
     - AI [vary chords] or [vary chords, vary bass]: blocked (screenshot `shot-f3-fail-chat.png`).
     - "the bassline is sick dont touch it try new chords": the same, offline and AI.
     - "dont touch the bass or the drums try new chords" works (chords only, bass fits).
     - Main ran the chords action but also rewrote the melody and bass.
   - c) "bass mast hai usko rehne do chords badlo": "Kept the bassline and the chords as they are." AI [vary chords]: blocked. Main rewrote bass and melody.
   - d) "the melody and the chords are vibing leave those make the bass bouncier": "Kept the melody, the bassline and the chords as they are." AI [reshape bass busier]: blocked. Main also does nothing.
   - e) "so the beat is cool and all but the chords feel kinda flat can we try something else":
     - offline: "I couldn't turn that into a change …";
     - AI [vary chords]: blocked, "Kept the chords as they are.";
     - "the chords feel kinda flat can we try something else" and "the beat is cool but the chords feel flat" work on the AI path;
     - main ran [vary chords] but also rewrote the melody.
   - Likely cause: the fix-3 list/protect comma in `speechComma` / `protectSaid` (`src/actions.js`):
     - the list after "dont touch / leave / rehne do / mat chhedo" runs on over plain spaces into the request's part name;
     - "it", "those" and "usko" aren't resolved to the praised part;
     - "and all" probably reads as a list.
3. **MEDIUM, owner rule (also on main): praise the guard doesn't recognise regenerates the praised drums.**
   - Offline, and on the AI path when Llama adds the wrong action:
     - a) "yo the drums go crazy bro give me some new chords", "the drums go crazy give me new chords" and "yo the drums are crazy give me new chords": **new drums**, and the chords are unchanged.
       - AI [vary chords]: correct.
       - AI [add_drums, vary chords]: the drums are rewritten as well.
       - "the drums go hard try new chords" works.
     - b) "yaar drums bahut acche hai bass badlo" and "drums acche hai bass badlo": **new drums**, and the bass is re-added (same notes).
       - "drums mast hai bass badlo" works.
       - AI [vary bass]: correct. AI [add_drums, vary bass]: the drums are rewritten.
     - c) "nah the melody is too busy make it simpler the drums are good though": **the drums are simplified** (energy 2 of 5), and the melody is untouched.
       - "make the melody simpler the drums are good though": no change at all.
       - AI [reshape melody simpler]: correct.
       - AI [reshape melody, groove energy 2]: the drums are simplified too.
   - Compare with "the drums are sick try new chords" + AI [add_drums, vary chords], which is guarded correctly.
   - Files: `src/actions.js` (`KEEP_PRAISE` / praise words: crazy, go crazy, acche, trailing "… are good though"), `src/maker.js` (offline "simpler" picks the drums named last). assistant-dev.
4. **LOW-MED: "the chords are beautiful keep them and the bass make the melody happier" (offline).**
   - The melody is replaced (not made "happier"). The bassline is re-added with the same notes and a new seed, and the reply says "Done: Bassline on Pluck Bass in A minor, Melody (replaced) …", which sounds like the bass was changed.
   - AI [vary melody happier] is correct.
5. **LOW: "the drums and bass are perfect just do something with the melody" (offline) answers instead of acting.**
   - The reply is "The melody plays A, E, C, F, B and G …".
   - AI [vary melody] is correct.
   - Main is worse: new drums and a Melody 2 track.

## Nits (not blocking)
- **Rule 7, chords under a kept bass.**
  - Try step 6 ("I really like that bassline now change the chords") gave 3/4 in 4 of 5 chain runs and 4/4 in 1.
  - Over 6 seeds × 3 phrasings (fitp.mjs): 4/4 in 10/18 and 3/4 in 8/18, never below 3/4. The fix-3 report says 4/4 in 14/18.
  - The off bar is always the bass's E (or D) under the VII chord (G major), a 6th, so it's a mild colour, not a clash.
  - Over a sung bass, new chords fit 4/4 in all cases except "happier chords" (3/4).
  - The Try wording "the new chords sit on its notes" slightly over-promises.
- **Known limit "the bass is great the chords need work" (offline).** It does not give new chords: the chords are re-added with the same notes, the seed is new, and the reply is "Chords (replaced) on Grand Piano". The bass is kept. AI [vary chords] works (bass kept, fit ≥ 3/4).
- **Short fallback replies read aloud well:**
  - "New melody. Kept the drums and the bassline as they are."
  - "Melody up 3 dB."
  - "Bassline simpler."
  - "Bassline down an octave."
  - "Chords now on Strings."
  - "New chords, and the bassline follows them. Kept the drums as they are."
  - "New bassline. Kept the melody as it is."
  - "Melody shorter notes." reads clunky (better: "Shorter melody notes.").
- **honestReply miss.** With AI [mix bass −3] and the AI reply "Turned the whole song down a bit.", the reply is kept while the chip says "Bassline: down 3 dB".
- **Offline replies are still long**: "Done: … Shape it with effects (“more reverb on the chords”), mix it, …". The chords tip appears even when working on the bass.
- **Real questions:**
  - "how many bars is the loop" gives "I couldn't turn that into a change …";
  - "which instrument is playing the chords" lists the chord names, not "Grand Piano".
  - Both are unchanged from main.
- Plain "go back" acts as Undo (rv R3, accepted earlier).

## What I checked (numbers)
Scripts and outputs are in `/home/claude/reports/qa-ai9r3/`. Each case diffs the whole project and checks for exactly one Undo step, with Undo exact. Questions and praise must leave no Undo step. Main comparison: `/home/claude/sk-t10-main` (b59812f; same `src/` and `cloudflare/` as origin/main ebbc437). The built `index.html` on the branch matches the commit.

- **Old sets on this build:**

  | Set | Result |
  |---|---|
  | p2 spoken | 20/20 |
  | p3 AI spoken | 12/12 |
  | p4 question-shaped | 11/11 |
  | p6 | 13/13 |
  | hr honest replies | 15/15 |
  | rv | 17/18 (R3 accepted) |
  | f2 | 62/62 |
  | n | 33/33 |
  | try (fix-2 chains) | 16/16 |
  | p1 | 28/28 |
  | T1 | 31/31 |
  | T3 | 27/27 |
  | T3b | 19/19 |
  | T4 | 28/28 |
  | T6 (Song view and AI-1/4/6/8) | 56/56 |
  | T7 | 12/12 |
  | T9 | 5/5 |
  | T10 | 10/10 |
  | T10b | 8/8 |

  All match the developer's numbers, with no regressions.
- **The 8 fix-3 Try steps, exactly as written, as chains (try3.mjs): 71/75.** That is 3 offline seeds plus 2 seeds with the fix-3 Llama actions. The 4 misses are step 6's strict 4/4 fit (3/4, nit above).
  - Step 1: new chords with the bass following, 4/4 fit, drums untouched.
  - Steps 2 to 4: only the named part changes.
  - Step 5: brighter chords, then the same notes on Strings.
  - Step 7: −5 dB offline and −3 dB on AI, same notes.
  - Step 8: first melody restored exactly; "pehle wale chords wapas lao" gives the previous version, and "sabse pehle wale" gives the first version, with the bass restored.
- **New spoken phrasings, 28 distinct:**
  - Includes filler (yo, bro, okay so, nah, honestly), Hinglish (yaar/bhai/mast/acche/rehne do/mat chhedo/nayi do/badlo), praise + request for each part, lists of 2 to 3 kept parts, question-shaped requests and real questions.
  - Offline: 17/30 cases pass.
  - AI with the correct Llama action: 19/27.
  - AI with a Llama mistake the guard should stop: 3/9 (main 0/9).
  - What works:
    - "okay so the bassline is fire but the melody is kinda boring change it";
    - "i love the drums and the chords new bassline please";
    - "keep the bass and the melody switch up the chords";
    - "bhai melody mast hai chords thode sad karo" (darker);
    - "can you make the chords a bit sadder";
    - "could you try a different bassline";
    - "would it sound better if the melody was shorter";
    - "honestly the chords slap bro now the bass needs to be quieter";
    - "okay so keep the drums the bass and the chords and give me another melody" (also with a wrong AI [vary bass]);
    - "dont change the melody or the chords give me new drums";
    - "i like the bass a lot can we change the chords around it";
    - "bro that melody is so good dont change it just try different drums";
    - questions "what key is this song in", "what chords are these", "whats the bass playing".
- **Short fallback replies (rp.mjs, AI reply fully false): 12/12 correct changes.** Replies are listed under Nits.
- **Sung bassline (fake mic, 13 notes): kept in 38/38 comments.** This includes all fix-3 Try phrasings, offline and AI. "why is the bass so loud" turns the sung bass down 5 dB, notes kept. The **imported MIDI part was kept in 6/6** comments.
- **Song view (full track):**
  - T6 56/56;
  - Try steps 1, 3 and 7 in the full track change only their part, and the sections stay;
  - screenshot `shot-f3-song-view.png`.
- **Sound** (offline `renderAudio`, 4-bar loop, Try chain):

  | State | Peak | RMS |
  |---|---|---|
  | r0 | −0.38 dBFS | −6.8 dB |
  | r1 | −0.49 dBFS | −6.7 dB |
  | r2 | −0.53 dBFS | −6.7 dB |
  | r3 | −0.56 dBFS | −6.8 dB |
  | r4 | −0.59 dBFS | −6.8 dB |
  | Song view | −0.59 dBFS | −6.8 dB |

  0 clipped samples and 0 silent blocks.
- **Page errors:** 0. The only console error is the blocked fonts request.

## Screenshots (`/home/claude/reports/qa-ai9r3/`)
- `shot-f3-start.png`
- `shot-f3-try1-3.png`
- `shot-f3-try4-5.png`
- `shot-f3-try6-8.png`
- `shot-f3-fail-chat.png` (problem 3c: the drums simplified, then problem 2b: "Kept the drums, the bassline and the chords as they are." with no change)
- `shot-f3-song-view.png`
- `shot-sung.png`
- `shot-sung-after.png`

Layout is clean: the bubbles and chips read well.

## Suggested fix checks (for the developer)
Add to smoke, offline and with the correct AI action, plus one Llama mistake:
- "nice the melody is great now" [vary melody] → no change
- "okay okay the chords are fire bro" [vary chords] → no change
- "chords ko mat chhedo melody nayi do" [vary melody] → melody only
- "the bassline is sick dont touch it try new chords" [vary chords] → chords only, bass kept
- "nah the melody is too busy make it simpler the drums are good though" [reshape melody, groove energy 2] → melody only
- "yo the drums go crazy bro give me some new chords" [add_drums, vary chords] → chords (and the bass following) only
