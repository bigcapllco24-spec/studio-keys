# AI-9 re-check 2 (fix 2) · qa-tester · 22 Nov 2026 · preview-ai-9 @ c658c29

## Verdict: NOT READY
Everything the fix-2 report lists works when the sentence is typed with commas: all 10 old problems (62/62), the 7 Try steps (16/16 as chains), and the T1 to T10 sets with no regressions. check.sh passes.

It breaks when the sentence is **spoken**. Chrome's speech recogniser gives no punctuation, and the owner talks to Keys.
- "the drums are fine try new chords" (Try-list wording, spoken) now **changes nothing**. Keys says "Kept the drums and the chords as they are."
- "ok cool the drums are sick try new chords" **regenerates the drums**: the praised part, which is the owner's exact complaint.
- The in-page guard does this on the AI path too, so it **blocks the correct Llama action** (vary chords). Main runs that action.
- Question-shaped chord requests ("how about some happier chords?", "what if the chords were on strings?") get the chord list and nothing changes, even when Llama sends the right action. Main does them.

Problems 1 and 3 below are regressions against main on the AI path, which is the live-site path. Problem 2 is old problem 1 coming back in spoken form.

**check.sh: CHECK OK, SMOKE OK, 100 checks (run 2, 5:56, load 15 to 20).**
- Run 1 (4:45, load 4 to 13) failed 1 of 100: "song: Ctrl+D in the editor duplicates the notes, not the section (one Undo)", 48 → 96 → 96. The Undo hadn't landed within the test's 150 ms wait. That is not an AI-9 file, and it passed in run 2 (48 → 96 → 48), so it was a load flake.
- All 9 AI-9 smoke checks passed in both runs.

## Problems (numbered, with steps)
Setup for all of them: a new song, then a house loop of drums, bass, chords and melody (seeds 5300 to 5303). Type the sentence exactly as written, with no punctuation unless shown. "AI" means the Llama actions shown are stubbed through `handleRequest`.

1. **HIGH: "<part> is/are <praise>" followed by a request, with no comma or "but", protects both parts.** The request does nothing, or changes the praised part. This happens offline and on the AI path.
   - a) "the drums are fine try new chords": no change. The reply is "OK. Kept the drums and the chords as they are. What should I change next?"
     - On the AI path with [vary chords], there is still no change, and the reply is "Done. Kept the drums and the chords as they are."
     - "the drums are great change the chords", "the drums are sick try new chords", "the drums are sick now try new chords", "yeah nice the drums are fire new chords" and "the drums are sick, ... " phrasings without the comma do the same.
     - With [vary chords] and the AI reply "New chords, drums kept.", the final reply is "New chords, drums kept. Kept the drums and the chords as they are.", and nothing changed (screenshot `shot-f2-chat-speech-ai.png`).
     - **Main** runs [vary chords] for these, so this is a regression on the live path.
   - b) "the melody is perfect give me a new bassline", "the bass is good make the melody simpler" and "nice nice the chords are perfect make the bass simpler": no change. The AI's [vary bass] and [reshape bass simpler] are dropped too.
   - c) **"ok cool the drums are sick try new chords" regenerates the drums and keeps the chords.** The reply is "Done: House drums on 909 House Kit … Kept the chords as they are."
     - Same with a comma: "ok cool the drums are sick, try new chords".
     - On the AI path, with [vary chords] alone or with [add_drums, vary chords], the drums are rewritten and the chords stay.
     - "ok the drums are great, …", "cool, the drums are fine, …" and "ok cool, the drums are sick, new chords" work.
   - d) "dont touch the drums make the melody simpler" (no apostrophe): no change, and the reply says the melody is kept. The AI's [reshape melody] is dropped too.
   - These work:
     - "the drums are fine just change the chords";
     - "the drums are sick but try new chords";
     - "i like the drums change the chords";
     - "sick drums change the chords";
     - "the drums slap change the chords";
     - "nice bassline now make the melody a bit shorter";
     - "keep the drums and bass just try another melody";
     - "the chords are nice but the bass is too loud".
   - Likely cause: without punctuation, `protectSaid` (KEEP_PRAISE clause) runs the praise clause on into the next part name. `praiseComma` doesn't split "is/are <adj>" from the next request, and "ok cool" is read as `KEEP_ADJ` + part. In 1c the page's offline answer replaces the AI's actions. Files: `src/actions.js` (`protectSaid`, `praiseComma`, `KEEP_PRAISE`/`KEEP_ADJ`, `onePart`), assistant-dev.
2. **MEDIUM-HIGH: some lists of protected parts still rewrite one of them (old problem 1, spoken or with "or").**
   - a) "leave the drums and bass alone change the melody" (no comma): a **new bassline**, and the melody is unchanged. AI [vary bass, vary melody]: the bass is rewritten.
   - b) "don't touch the drums, the bass or the chords, change the melody" (with commas): a new bassline, and the melody is unchanged. AI [vary bass, vary melody]: the bass is rewritten.
   - c) "don't change the drums, the bass or the chords, just the melody" (and "don't touch …"):
     - the bass and chords are re-added (same notes, new seed, `isNew`);
     - the reply is "Done: Bassline on Pluck Bass in A minor, Chords (replaced) on Grand Piano in A minor, Melody (replaced) on Analog Lead. Kept the drums as they are."
     - Main is worse here (it also adds tracks).
   - These work:
     - "keep the drums, bass and chords, new melody";
     - "keep the drums, chords and melody, change the bass";
     - "leave the drums bass and chords alone and give me a new melody";
     - "don't touch the drums or the bass, change the melody";
     - "keep the drums and bass just try another melody".
   - Files: `src/actions.js` `protectSaid` (list after leave/don't touch with "or" in a list of three, or with no comma before the request).
3. **MEDIUM (regression on the AI path): question-shaped requests about the chords are answered and the AI's correct action is dropped.**
   - The reply is "The chords are A minor, F, C, G, in A minor. Say “new chords” for others, or “happier chords”.", and nothing changes, for:
     - "how about some happier chords?" [vary chords mood happier];
     - "what about a darker progression for the chords?" [vary chords darker];
     - "what if the chords were on strings?" [instrument Strings];
     - "how about the chords on an electric piano?" [instrument];
     - "could the chords be shorter?" [reshape chords shorter].
   - **Main does the first four.**
   - Offline is the same, but main is wrong there in another way (it adds a "Chords 2" or "Strings" track).
   - The bass and melody versions work: "how about a busier bassline?", "what if the bass played longer notes?" and "is it possible to make the melody simpler?".
   - Likely cause: `onePart`'s `asked` uses `askFix`'s chord answer, which doesn't exclude can/could/how about/what about/what if or request words (happier, darker, on strings, shorter) the way `partAsk` does. Files: `src/maker.js` (`askFix`, chord question), `src/actions.js` (`onePart`).
4. **LOW-MED: `honestReply` misses mixed sentences and corrected volumes (old problem 6, partly fixed).**
   - "keep the drums and bass, just try another melody", AI [vary bass, vary melody], AI reply "Here is a new bassline and a fresh melody, drums kept as they are.":
     - the reply is kept word for word, plus "I only changed what you asked about; the rest stays as it was.";
     - the bassline did not change. This is Try step 1 with a realistic Llama reply.
   - "the melody is too quiet", AI [mix melody volume 20], AI reply "Set the melody volume to 20.":
     - the reply is kept, while the chip says "Melody: up 3 dB (volume 86)" (screenshot `shot-f2-chat-honest-reply.png`);
     - the fix-2 report says this sentence is removed, but its test used the reply "Done.".
   - Works:
     - "Turned the whole song down 3 dB…" becomes the bass change;
     - "Glad you like them! I refreshed the drums and swapped the chords…" becomes "Glad you like them! Kept the drums as they are. New chords: …";
     - full-track, trap-vibe and new-melody sentences are removed;
     - honest replies ("Brightened the chords with a little more top end.", "Kept your drums and tried a new chord progression…") are kept.
   - Naturalness: when only the AI's false sentence goes, the reply still reads well. When every AI sentence goes, it reads as a change list ("Done: Bassline: down 3 dB (volume 72). Shape it with effects (“more reverb on the chords”), mix it, …"). That is correct but robotic when spoken, and the generic tip about the chords is off-topic when the user is working on the bass. Acceptable for now.
   - File: `src/actions.js` `honestReply`.
5. **LOW: "why is the bass so loud?" re-adds the bassline.**
   - The notes stay the same, the seed is new, and the reply is "Done: Bassline on Pluck Bass in A minor." There is no volume change. "why is the melody so busy?" replaces the melody instead of simplifying it.
   - Main is the same.
   - Works: "is the bass too loud?" (−5 dB), "the bass is so loud" (−8 dB), and AI [mix bass −3].
   - File: `src/maker.js`.
6. **LOW: revert phrasings.**
   - "bring back the first melody" gives "The melody is already playing. Say “another melody” for a new one." (main is the same).
   - Hinglish "pehle wale chords wapas lao" re-adds the chords ("Chords (replaced)", same notes), not the earlier version. Main adds a "Chords 2" track.
   - "go back to the first/original chords", "back" ×2 and ×3, and the honest "already the first chords" all work.
   - File: `src/maker.js` `partEditFix` (revert words).
7. **LOW, design question for the lead: a praised bass with new chords can clash.**
   - With "I really like that bassline, now change the chords" or "the bass is great, new chords", the bassline is kept exactly, and the reply says so honestly.
   - The bass root is then outside the new chord in 1 or 2 of 4 bars (fit 3/4 and 2/4).
   - This follows the owner rule, but a producer would expect the new chords to fit the kept bass: pick a progression with those roots.
8. **Known limits, unchanged and low:**
   - "the drums are fine, make it louder" turns the drums up 1.8 dB.
   - "is the bass in F sharp?" lists the notes, not yes or no.

Outside AI-9 (pre-existing, `src/studio.js` `setKey`, studio-ux-dev): `{type:'key', key:'F# minor'}` on a loop whose key is still "auto" sets the label but doesn't move the notes, because it only transposes when a key was set before. "is the bass in F sharp or G flat?" then answers "plays A, F and G, in F sharp minor".

## What I checked (numbers)
Scripts and outputs are in `/home/claude/reports/qa-ai9r2/`. Each case starts from a fresh loop and diffs the **whole project**: every field of every track, plus the song's tempo, key, prog, sections and master. Each case also checks for exactly one Undo step, and that Undo restores the song exactly. Questions and praise must leave no Undo step.

- **All 10 problems (dev's f2 set, punctuated): 62/62.** Every change is one Undo, every Undo is exact, and questions and praise add no Undo step.
  - 1 list
  - 2 praise with no verb
  - 3 questions (answers like "The bassline plays A, C, F and G, in A minor, on Pluck Bass.")
  - 4 slaps
  - 5 "make it shorter", then "a bit louder", stays on the melody
  - 6 reply honesty with short replies
  - 7 arrange and vibe dropped
  - 8 volume direction and octave
  - 9 except
  - 10 original/first and walking back
- **Try steps 1–7 as chains: 16/16.**
  - Step 2: the bass sound is unchanged and the bass fits 4/4.
  - Step 3: no drum track becomes Slap Bass.
  - Step 4: no Undo step.
  - Step 5: melody shorter, then +3 dB on the melody only.
  - Step 7: back ×2 ends on the starting chords and the starting bass notes; "original" jumps straight there.
- **New phrasings: 33 written (n.mjs), plus 20 spoken versions (p2), plus 25 probes (p1, p6). Fails: problems 1–3 and 5.** n.mjs alone: 29/33.
  - Mid-sentence praise works with commas or "but": "the chords are nice but can you make the melody simpler", "yo that melody is fire, bass a bit quieter", "man the drums go hard, now give me a new bassline".
  - Three kept parts: N6, N7 and N9 (AI) work. N8 and V16 fail (problem 2).
  - Questions that are requests:
    - "can you make the bass simpler?", "could the melody be a bit shorter?" and "can we try different chords?" change their part;
    - "is the bass too loud?" turns it down;
    - "is the melody too busy?" simplifies it;
    - "what sound is the bass?" and "what key are we in?" answer;
    - "what if the chords were on strings?" fails (problem 3).
  - Slap as an instrument: "put the bass on slap bass", "can the bass be a slap bass?", "switch it to slap bass" (focus bass), "add a slap bass" (replaces the generated bass) and "the drums slap, now make the bass a slap bass" all work: Bassline on Slap Bass, drums kept. "make the drums slap more" gives new drums (fine).
  - Hinglish: these work:
    - "drums ekdum mast hai, chords badlo";
    - "bass mat chhedo, drums badal do";
    - "melody thodi chhoti karo";
    - "bass kaunsa note baja raha hai?" (answer, no change);
    - "drums aur bass rehne do, melody badlo";
    - "bass thoda zyada loud hai".
  - Spoken forms (p2) on main for comparison: 0/20 (main is much worse offline).
- **AI path with the correct Llama actions:**
  - Spoken forms, p3: 3/12 on the branch and 4/12 on main. A6, A7, A11 and A15s are regressions.
  - Question-shaped requests, p4: 4/11 on the branch and 2/11 on main. Q1, Q2, Q5 and Q6 are regressions; Q3, Q4 and Q8 are better on the branch.
- **Honest replies with realistic Llama sentences (hr.mjs): 13/15 correct.** H4 and H5 fail (problem 4). H2's flag was my regex catching the standard tip "make it a full track"; the reply is honest.
- **Revert (rv.mjs, 9 cases):** 7/9.
  - Back ×3 after 3 new = the start, with the bass fitting 4/4.
  - Back ×4 gives "These are already the first chords of this session.".
  - Original, then new chords, then "go back" = the original.
  - "go back to the original bassline" works.
  - Undo after "original" is exact.
  - AI revert twice walks back.
  - Fails: R5 and R8 (problem 6). R3 is fine: plain "go back" acts as Undo.
- **Song view (96-bar full track): 9/9** fix-2 phrasings changed only their part and left the sections alone:
  - keep list, nice bassline, drums slap, the bass question, except, back ×2, AI [mix bass, arrange full], make it shorter after the melody;
  - "make the song shorter" shortens the sections (64 bars, 2:04).
  - Plus the T6 set below.
- **Regression sets on this build:**

  | Set | Result |
  |---|---|
  | T1 | 31/31 |
  | T3 | 27/27 |
  | T3b | 19/19 |
  | T4 (AI path) | 28/28 |
  | T6 (Song view 12, AI-1 song moves 13, AI-4/6/8 phrasings 31) | 56/56 |
  | T7 | 12/12 |
  | T9 | 5/5 |
  | T10 | 10/10 |

  T6 is identical to the fix-1 run case for case, so AI-1/4/6/8 match main except for the 2 known improvements.
- **Memory chains (3 seeds, offline and AI):**
  - simpler bass, then softer (−2.5 dB vol, same notes), then an octave lower (exactly −12);
  - new chords ×2, then back ×2, ends on the starting chords in all 6 chains, with the bass fitting 4/4 at every step (30/30 states) and the melody untouched;
  - "change the melody", then "no, the other one", then "make it shorter", then "a bit louder": melody only;
  - `projectState().recent` is 1,184 characters.
- **Sung and imported parts:**
  - A sung bassline (fake mic, 4 notes this run) was kept in **26 of 26** comments, including 10 new fix-2 phrasings:
    - nice bassline, keep list, the question, drums slap, new chords, "original";
    - "make it shorter" goes to the chords (the focus);
    - AI [mix all −3] goes to the sung bass volume only;
    - Hinglish "bass ko thoda chhota karo".
    - The replies say "your bassline stays as you sang it".
    - One of the 26 ("the drums are sick try new chords" with AI [vary chords, vary bass]) also shows problem 1: the bass was kept, but the chords didn't change either.
  - The imported MIDI "Lead" was kept in 6 of 6.
- **Sound** (offline `renderAudio`, 4-bar loop, fix-2 Try chain):

  | State | Peak | RMS | Clipping | Silent blocks |
  |---|---|---|---|---|
  | Baseline | −0.51 dBFS | −6.8 dB | 0 samples | 0 |
  | After Try 1–3 | −0.62 dBFS | −6.8 dB | 0 samples | 0 |
  | After Try 5–6 | −0.90 dBFS | −9.2 dB | 0 samples | 0 |
  | After Try 7 | −0.88 dBFS | −9.2 dB | 0 samples | 0 |
  | Song view after keep-list | −0.71 dBFS | −9.2 dB | 0 samples | 0 |

  The RMS drop is "everything except the melody should be quieter", as expected.
- **Page errors:** 0. The only console error is a fonts request the proxy blocks.
- For comparisons, a main build is at `/home/claude/sk-t10-main` (a git worktree of `origin/main`, built locally). The main outputs are `*-main.txt` in the harness folder.

## Screenshots
`/home/claude/reports/qa-ai9r2/`:
- `shot-f2-start.png`
- `shot-f2-try1.png`
- `shot-f2-try3.png`
- `shot-f2-try4.png`
- `shot-f2-try7.png`
- `shot-f2-speech-ai-blocked.png`
- `shot-f2-song-view-keep.png`
- `shot-f2-chat-speech-ai.png` (problem 1: "New chords, drums kept. Kept the drums and the chords as they are." with no change; then "ok cool…" regenerating the drums)
- `shot-f2-chat-honest-reply.png` (problem 4: "Here is a new bassline…" and "Set the melody volume to 20." next to the chip "up 3 dB (volume 86)")
- `shot-sung.png`
- `shot-sung-after.png`

No layout problems: the bubbles and chips read cleanly, and the Song map chips show after a one-part comment.

## Suggested fix checks (for the developer)
Add a spoken (no punctuation) version of every AI-9 smoke phrase, and run each with the correct AI action as well as offline:
- "the drums are fine try new chords"
- "ok cool the drums are sick try new chords"
- "leave the drums and bass alone change the melody"
- "don't touch the drums, the bass or the chords, change the melody"
- "how about some happier chords?" [vary chords]
- "what if the chords were on strings?" [instrument]
