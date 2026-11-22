# AI-14 fix 2 · assistant-dev · 22 Nov 2026

Branch `preview-ai-14`, pushed. Head is **0903ad1** (started from 1faba80). Nothing went to main. Worked in /home/claude/sk-ai14.

Files changed: `src/maker.js`, `src/actions.js` (ACT.sing: one guard plus a small `singPart` helper), `tests/smoke.mjs` (2 new lines), `index.html` (rebuilt).
**Worker prompt changes: none.** `cloudflare/worker.js` did not change, and there are no new action names. At release, the lead still deploys the AI-14 prompt from the build report.

Commits:
- acafd20: fixes 1, 2, 4-7
- 213da50: smoke lines
- 5049205: "melody bahut left hai"
- 659f752: AI double sing
- 0903ad1: "silence the old take…"

## Must fixes

### 1. "pan the melody" → "Left or right?" → "right" did nothing
- **Cause:** panFix returned the question before setting `ASSIST.lastPan`. So `panJustDone()` was false, and a lone "right" counted as a yes.
- **Change (maker.js, panFix):** the question branch now records `ASSIST.lastPan` for that part before it asks.
- **Before → after:** "right" went from "I couldn't turn that into a change" to "Panned Melody right (R 40), same notes", with one undo step.
- **Guards still hold:**
  - "left" after "pan the chords" still pans (L 40).
  - "right" after "make the melody brighter" or "add a bassline" still does nothing.
  - "right" after a pan followed by an unrelated change ("make the bass louder") still does nothing.

### 2. The melody low cut could be pulled far down by a mud complaint
- **Cause:** the fix 1 floor was 0.85 × the lowest note. It had no lower limit and no outlier rule, and it lowered any cut sitting above that note, including one the user had set.
- **Change (maker.js, toneFix `cut()`):**
  - **Floor:** never under **100 Hz**.
  - **Lowest real note:** a single note more than an octave below the rest, and so low it would be under the floor anyway, is ignored as a stray (an octave slip in a sung take). A C3 under a C4-and-up melody still counts. That keeps the tester's "fine" C3 case at 111 Hz.
  - **What a mud complaint may lower:** only Keys's own starting cut (the melody `roleFx` value, 220 Hz), and only when it sits above the lowest real note. A higher cut, set by the user or an earlier step, stays where it is, on "the melody is muddy" and on "the mix is muddy". The low EQ still comes down 3 dB.
  - **Replies:**
    - "under its lowest note" appears only when it is true. It is not said for a stray, or when the 100 Hz floor sits above the notes.
    - A cut that stays reads "low cut stays at 300 Hz".
    - The mix reply says "low cuts set", "higher low cuts" or "low cuts kept", whichever really happened.
- **Before → after (tester's rt cases; 2c6a876 / 1faba80 / now):**

| Case | 2c6a876 | 1faba80 | now |
|---|---|---|---|
| a. One stray C1 note, cut 220, "the mix is muddy" | kept 220 | 28 Hz | **280 Hz**, no "under its lowest note" claim |
| b. One C2 note, cut 150, "the mix is muddy" | kept 150 | 56 Hz | **250 Hz** (as main) |
| c. Own 300 Hz cut, melody down to C3, "the melody is muddy" | "up to 300" (untrue) | 111 Hz | **stays 300 Hz**: "Cleaned up the melody: 3 dB less low boom (low cut stays at 300 Hz), same notes." |
| Normal: C3 note, cut 220, "the mix is muddy" | 220 (untrue "under") | 111 Hz | **111 Hz**, "under its lowest note" (true) |
| A melody really down to C2 (all notes), cut 150 or 220 | n/a | n/a | **100 Hz**, reply "low cut down to 100 Hz" (no "under" claim) |

### 3. Smoke lines (tests/smoke.mjs, both pass)
- **AI-14 re-check 1:** "pan the melody" asks "Left or right?" with no undo step. Then "right" gives Melody R 40, one step.
- **AI-14 re-check 2:**
  - A melody with a stray C1 note and a 220 Hz cut keeps its cut at 100 Hz or more on "the mix is muddy" (it gets 280), with no "under its lowest note" claim.
  - A 300 Hz cut stays 300 Hz on "the melody is muddy", and the reply says "stays at 300 Hz".
- I named them "re-check" so they don't clash with the fix 1 lines, which are already numbered "fix 1-5".

## Cheap fixes (all offline, never worse elsewhere)

### 4. Width words never replace the part
- **Cause:** FXRE had only `width|wider|stereo`, and its verb list lacked should/karo, so these fell through to the part rebuilder ("(replaced)" with a dead undo step).
- **Change:**
  - FXRE gains `widen | wide | narrow | narrower`, and "spread … out" (not "spread the notes …") counts as the width.
  - "should / needs / karo / kar do" are accepted as verbs.
  - narrow means less (−20).
  - "add a wide pad" and "a wider sound" are still a new part.
- **Before → after:**
  - "widen the chords", "the chords should be wider", "spread the chords out" and "chords ko wide karo": "Chords (replaced)", no change → **width 65 → 75%**, one step.
  - "make the chords narrower": **65 → 45%**.
  - Still true: "spread the chords wider" 75%, "make the pad wider" 75%, "spread the melody wider in the stereo" 50%.
  - "add a wide pad" still adds Warm Pad.
  - "spread the notes of the chords out" is unchanged (the tester's guard).

### 5. "mute the recording, I'll hum the melody" and "voice note mute karo aur bass gaane do"
- **Cause:** the comma plus "I'll" clause didn't split, because ASK_FILL lacked "I'll". "aur" wasn't a separator, and "gaane do" wasn't read as sing. So the whole-sentence guard muted and dropped the take.
- **Change (maker.js):**
  - ASK_FILL accepts "I'll / I will / I'm gonna".
  - ASK_SEP splits on "aur", only when the next half is a command of its own, the same rule as "and".
  - A verb-last Hinglish "… mute karo" counts as a command.
  - askText reads "X gaane do / gaunga / gaata hoon" as "let me sing X".
  - "silence the old take" mutes the recording, only when the song has one.
- **Change (actions.js, ACT.sing):** for AI [sing voice, sing melody] on these words, the voice sing is the mute. Only the melody take starts and is announced. Before, the reply said "Recording a voice note…" and then "Sing the melody".
- **Before → after:**
  - "mute the recording, I'll hum the melody": mute only → **muted + melody take** (offline and AI).
  - "voice note mute karo aur bass gaane do": mute only → **muted + bass take**.
  - "silence the old take and record another one": voice take, not muted → **muted + voice take**.
  - Guards hold, each checked on its own:
    - "mute the voice note" (offline, and AI [sing voice]): muted, no take, mic off.
    - "voice note mute karo": muted.
    - "record a new voice note": a take, no mute.
    - "mute the bass and sing a new bassline": bass muted + bass take.

### 6. "drop two" / "drop three"
- **Change:** askText turns "drop / break / intro / … one-four" into the digit after the, make, in, after, … It is not done before "more / of / bars / beats …".
- **Before → after:**
  - "make drop two bigger": talked about the first drop → "Drop 2 already has every part and a snare roll into it… Want a longer snare roll into Drop 2?"
  - "take the chords out of drop two": Drop 2 chords out, one step.
  - "make drop three bigger" on a song with two drops: "There's no drop in this song". **Known nit:** this should read "no Drop 3". It is the existing missing-section reply, and I left it for later.

### 7. "melody left, chords right" (no verb and no "and")
- **Change:**
  - panFix also triggers on two "<part> left/right" pairs. That path only accepts panMany's answer; the single-part path stays untouched.
  - panMany accepts a side word directly before the next part as the separator.
- **Before → after:**
  - "melody left, chords right": both parts replaced → **Melody L 40, Chords R 40**, one step.
  - "pan melody left chords right": melody only → **both**.
  - Unchanged:
    - "pan the melody to the left away from the chords" pans only the melody.
    - "melody on the left side and chords on the right side" pans both.
    - "melody left mein aur chords right mein daalo" pans both.

### Extra
- "melody bahut left hai": replaced the melody → **"Moved Melody back toward the centre (L 20), same notes."** When the melody isn't panned left, Keys says so.

## Tester sets vs 1faba80, 2c6a876, main
- I used the tester's scripts and harness unchanged: /home/claude/qa/ai14/run.mjs. The baselines are the tester's own outputs in /home/claude/ai14r/.
- The build was a snapshot of 0903ad1 in /home/claude/ai14g/fix2/.
- The machine ran at load 5-12 most of the time (another agent's Chrome).

| Set | main | 2c6a876 | 1faba80 | fix 2 (0903ad1) | worse vs any |
|---|---|---|---|---|---|
| bugs.js | 20/107 | 97/107 | 105/107 | **105/107** | 0 |
| ai.js | 17/33 | 29/33 | 30/33 | **30/33** (31/33 in one earlier run) | 0 |
| nb.js | 33/52 | 46/52 | 51/52 | **51/52** (52/52 in two earlier runs; the 1 is the count-in harness artefact) | 0 |
| ai9.js | n/a | baseline | 65 identical | **65/65 identical** (only random chord names differ) | 0 |
| rt.js, as is | 50/140 | 74/140 | 111/140 | **113/140** (117 and 121 on earlier near-identical runs) | see below |
| rt.js with settle time (all 4 builds rerun by me) | 50/140 | 74/140 | 111/140 | **122/140** at 659f752, **114/140** at 0903ad1 | **0** at 659f752; 1 flag at 0903ad1 (below) |

**rt.js as is: the only "worse" lines are harness flags on take cases.** In those cases the reply, the mute and the take are identical to the passing line.
- **"MIC":** the previous case's take keeps the mic on into the next case. "mute the voice note" (guard) got MIC because the case before it ("mute the recording, I'll hum the melody", AI) now correctly starts a take. On 1faba80 the same bleed shows on the lines after its own take cases.
- Run on its own, "mute the voice note" with AI [sing voice] gives muted, no take, mic false (my probe p4.js).
- **"UNDO-DIFF Drums/Bassline/Chords.ev":** Undo pressed during the count-in.

**Settle copy:** to compare fairly, I made /home/claude/ai14g/rt-settle.js. It is rt.js plus 0.8 s and two `stopTake()` calls before each case, with the same checks, and I ran it on all four builds.
- At 659f752 it is never worse on any case.
- At the final head, one take case flags UNDO-DIFF ("mute the voice note and sing the bassline", AI). It passed in the earlier settled run, and the 8 cases that differ between my two settled runs are all take cases with UNDO-DIFF.
- The tester's rtu.js (Undo with the take stopped) on the final head is identical to 1faba80. Muted + take cases undo exactly in one step.
- The 2 open ai.js fails are the same as on 1faba80: the old prompt's master reverb (needs the Worker deploy) and "add a second drop" (Break 2 + Drop 3, as on main).

**rt fails left (all the same as on 1faba80 or main, not in this brief):**
- "pump up the (second) drop", "dusra drop aur heavy karo", "the break feels empty": tester items 7-8.
- The AI groove for "the second drop needs to go off".
- "make a melody i can sing along to".
- "record a new song" (guard).
- "switch off the voice note and let me record a new take" after a chords take: nit 10.
- The take-timing flags above.

## check.sh
- **CHECK OK, 119 checks, 0 page errors**: 117 plus the 2 new lines, 157 s at load 0.8-1.6 on the final head 0903ad1.
- An earlier run at 213da50 also passed (8m42s at load 10-12). No flakes, and no reruns needed.
- `git status` is clean after the check, so the committed index.html is the build.

## Llama 3.3
Not rerun: the prompt did not change. The executor's handling of Llama's answers was checked with mocked AI actions:
- [sing voice, sing melody]
- [sing melody]
- [mix mute, sing melody]
- [mix mute, sing bass] for the Hinglish line
- [sing voice] for a plain mute

## Try it (8 steps, Basic mode or the test link)
1. Say "make a beat like Stephan Bodzin", then "add a bassline", "add some chords", "add a melody", "make it a full track". Then say "take the kick out of the intro and bring the bass in": the intro loses its kick and the bass comes in with the same notes. One Undo puts it back.
2. Drop a recording in (Import audio) and say "mute the voice note": it goes quiet, and no count-in starts. Say "unmute the voice note", then "mute the recording, I'll hum the melody" (or "voice note mute karo aur bass gaane do"): the recording is muted AND the count-in starts for your part.
3. Say "the melody is too loud in the drop": the melody goes down, and Keys says it's for the whole song.
4. Say "make drop two bigger" (or "make the second drop bigger"): Keys says Drop 2 already has every part and a roll into it, and the drums stay as they are. Say "take the chords out of drop two", then "make the second drop bigger" again: the chords come back into Drop 2.
5. Say "make the break bigger": Keys says what the break really has and offers to bring a part in. "bring the drums in at the break" does it.
6. On a loop:
   - Say "melody left, chords right": both move, and one Undo puts both back.
   - Say "pan the melody": Keys asks "Left or right?". Answer "right": it moves right.
   - Say "make the melody brighter", then "right": nothing pans.
7. Say "widen the chords" (or "chords ko wide karo"): the chords get wider and keep their notes. "make the chords narrower" brings them in.
8. Say "the mix is muddy": the chords and melody get cleaned up, and the bass and drums are untouched. A melody's low cut never drops under 100 Hz. If you set the melody's low cut high yourself (say 300 Hz in its FX), "the melody is muddy" keeps it and says so.

## For the lead
- **Worker prompt:** no new lines. **New action names:** none.
- **qa-tester:** smoke has 119 checks, with 2 new "AI-14 re-check" lines.
  - The rt.js take cases bleed mic/take state into the next case under load. A settle step before each case (as in /home/claude/ai14g/rt-settle.js) makes the line-by-line compare stable.
- **Left for later (tester 8-10 and the rest):**
  - lift words ("pump up", "go off", "heavy", "feels empty");
  - "yes" to the section offer;
  - the reply trim;
  - the record wordings;
  - the "no Drop 3" reply wording.
- **Files:**
  - probes: /home/claude/ai14g/p1.js - p5.js
  - set outputs: /home/claude/ai14g/*-final.txt, rts-*.txt, rtu-final.txt
  - check logs: /home/claude/ai14g/check1.txt, check2.txt
