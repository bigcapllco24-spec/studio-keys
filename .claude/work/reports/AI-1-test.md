# AI-1 branch check (qa-tester) · 15 Nov 2026
Branch `preview-ai-1` at fb43b64, plus my smoke commit (see "Smoke test changes").

## Verdict: NOT READY
The song-by-voice flow works well. Every step in proposal section 2 does what it says and is one undo step, and the owner's three choices behave as approved. Real Llama outputs are all usable.

Two things should be fixed before the owner tries it:
1. **The "gap before the drop" is not silent.** It is the owner's "silence before the drop", and every default build or break into a drop has one. With the roll-plus-gap ending, the gap beat is louder than the beat before it.
2. **The Worker prompt's own example still offers a riser.** Llama copies it, so Keys offers risers in about a third of song replies.

Both are small fixes. `bash .claude/tools/check.sh` now FAILs on a new smoke check that catches bug 1; it passes once that bug is fixed.

## Bugs

### 1. The gap before a drop has drum hits in it (medium-high · src/actions.js `transitionCut`, src/song.js `songFlat`; the tails part may need sound-engine-dev)
**Steps**
1. Start a new song and make a Bodzin loop (drums, bass, chords, melody).
2. Say "make an 8-bar intro, then build up and drop". The Build ends with a 2-bar snare roll plus a beat of silence.
3. Render the end of the Build offline.

**Expected:** the last beat before the Drop is (near) silent.

**Actual:**

| Build ending | Beat before | Gap beat | Second half of the gap |
|---|---|---|---|
| Roll + gap | −7.2 dB RMS | −5.6 dB (louder than the music before it) | −5.7 dB |
| Kick drop ("add some silence before the drop") | −13.5 dB | −19.7 dB | −34 dB |
| No transition, for reference | −6.3 dB | −6.6 dB | |

There is a snare and clap hit at the start of the kick-drop "silence".

**Cause:** the SE-3 drummer feel pushes the downbeat hits about 10-15 ms early. In `songFlat` the kick sits at −1.015 beats, the snare at −1.011 and the clap at −1.009 before the section end. They start just before the cut's `from` (len−1), so they are not cut, and the one-shot samples ring through the gap.

**Proof:** I patched `transitionCut` in the page only, to cut 1/16 beat earlier:
- kick-drop gap: −27.5 dB (second half −37.8)
- roll + gap: −10.7 dB, second half −13.3

So the roll's own sample and reverb tails still fill the roll + gap. The Break kick drop the developer measured didn't show this because that Break has no drums.

**Suggested fix:**
- In the cut, treat notes that start within about 1/16 beat before `from` as inside the gap.
- For a real gap after a roll, either end the roll a beat earlier or choke/shorten the drum tails.

**New smoke check (fails now):** "AI-1: the gap before the drop is empty…" counts notes that start in the last beat, including early pushes: `{"rollGap":3,"kickdrop":"kickdrop:2"}`.

### 2. The prompt example still offers a riser (medium · cloudflare/worker.js)
assistant-dev added "don't offer risers or filter sweeps as a next step". But the EXAMPLES block still says:

> User: "make the break longer" → reply "The break is 8 bars longer now. **Want a riser into the drop?**"

In my Llama run, 4 of 12 replies offered a riser:
- "make the break longer" copied the example word for word
- "break ko 8 bar chhota karo": "Want to add a riser into the next drop?"
- "full club track like Bodzin": "Want to add a riser before the main drop?"

If the user says yes, they get a snare roll and the "Risers aren't in the studio yet" note, so Keys offers something it then says it can't do.

**Fix:** change the example reply, for example to "Want a snare roll into the drop?".

### 3. Hinglish with the verb last, offline (low-medium · src/maker.js `songBrain`)
The build report says "ke baad" and "dusra" are understood. Offline (the AI off or failing), these fail:

| Said | Result |
|---|---|
| "drop ke baad break daal do" | "I couldn't turn that into a change" |
| "intro ke baad break daal do" | "I couldn't turn that into a change" |
| "dusra drop add karo" | "I couldn't turn that into a change" |
| "ek aur drop daal do" | "I couldn't turn that into a change" |
| "second drop daal do" | "I couldn't turn that into a change" |
| "drop ke baad break add karo" | "I couldn't turn that into a change" |
| "break ko loop karo" | not understood |
| "drop 2 se play karo" | plays from the start, not from Drop 2 |
| "outro mein drums mat bajao" | regenerates the whole drum pattern (1 undo step) instead of switching the drums off in the outro |

The add rule needs the verb before the section ("daal do break"), but Hinglish puts it last.

These work: "break ko lamba karo", "outro chhota karo", "intro se kick hata do", "intro mein bass daal do", "doosra drop alag karo", "break hata do", "drop se pehle roll/thoda silence daal do", "break ko 32 bar karo", "intro mein sirf drums", "poora gaana bana do".

With the AI on, Llama handled "intro se kick hata do aur bass daal do" and "break ko 8 bar chhota karo" correctly.

### 4. Typed "Keys, make an 8-bar intro, then build up and drop" fails offline (low · src/maker.js)
The assistant's name "keys" matches the part word "keys" (chords) in `songBrain`'s list check, so the section list isn't read and the result is "I couldn't turn that into a change".
- Speech strips the wake name, so only typed requests are affected.
- "Keys, make it a full track." works.
- The proposal's flow step 1 is written exactly this way.
- Fix: strip `ASSIST.name` at the start of typed text, or exclude it from the part words.

### 5. Offline "make it longer" / "make it shorter" / "make the song longer" not understood on an arranged song (low-medium · src/maker.js)
The approved D1 option says "'make it longer' stretches it".
- With the AI on, Llama sent `arrange minutes 4`, which worked (3:06 → 4:08, 1 undo step).
- Offline it fails. On main it isn't understood either (main has no song layout).

## Rough edges (not blocking)
- **Mini map on phones with 7-8 sections.** At 390 and 360 px each block is 23-24 px and the labels show "B..", "D..", "O." (map-8sec-390.png, map-8sec-360.png). With 6 sections or fewer at 390 it reads well (In Bu D1 Br D2 Ou). There's no sideways scroll at 1400, 390 or 360.
- **Offline replies.** Every song reply ends with the same "Shape the song: make the break longer, drop the drums in the outro, add a second drop", even right after adding a third drop.
- **Missing-part notes repeat.** The suggestion comes twice: "There's no bassline or chords yet: want them? Say "add a bassline". Bassline next? Say "add a bassline"…". The grammar is also off: "There's no chords yet: want one?" should be "There are no chords yet: want some?".
- **Two next steps with the AI on.** "arrange it" on drums only: Llama suggests a melody, then the executor note suggests a bassline.
- **"Second drop" when one exists.** "add a second drop" on a song that already has Drop 2 adds "Break 2 and Drop 3", so the reply names Drop 3.
- **Move that changes nothing.** "move the break after the first drop" when it's already there: Keys says "Moved Break after Drop", nothing changes, and there are 0 undo steps.
- **"Add a break" on a plain loop.** It makes "Break 16 · Main 8", so the song opens with the break. "add a drop" then goes after the loop.
- **Llama's riser loses the gap.** Llama sent a snare roll plus a crash; the executor kept the roll (good) but dropped the Break's existing "+gap" (snareroll 2 +gap became snareroll 2).
- **"The drop" follows the last touched drop.** After "play from the second drop", "loop the drop" loops Drop 2. This is the agreed rule, but the user may not expect it.
- **Sung bassline in a full track.** It plays only in the first Drop (the UX-5 rule; listed in the build report).
- **MP3 export of an arranged song is slow here.** A 64-bar (2:06) 4-track song took 182 s headless (load about 2.6), about 1.4× real time, so a 6-minute club track would take about 9 minutes here. This is UX-1's export, but long songs become common with AI-1. Worth measuring on a real laptop.

## What I checked (numbers)

### Check runs
1. `check.sh`, load about 5 (other testers running): FAIL "velocity lane… dragging" (pre-existing test, flaky).
2. Smoke alone: 2 FAIL in the "reopen song" tests (pre-existing, flaky: the 1.5 s autosave or `keepLastSong` was still writing).
   - I hardened both tests.
3. After that, at load about 0.5: 51 of 52 PASS in 1:38. The only FAIL is the new gap check (bug 1).

### Proposal section 2 through `handleRequest`, offline brain (ASSIST.engine = null), Bodzin loop
Every change was exactly 1 undo step. Loop and play requests were 0 steps.
- "make an 8-bar intro, then build up and drop"
  - Layout: Intro 8 (fill) · Build 8 (roll 2 + gap) · Drop 16, 32 bars · 1:02, Song mode.
  - The map has 3 outlined blocks, with the Undo chip.
- "Make it a full club track like Bodzin"
  - 192 bars · 6:12.
  - Intro: drums with no clap or snare. Build: drums and bass. Break: chords. The lead plays only in the drops.
- "Make the break longer": 32 → 40.
- "Take the kick out of the intro and bring the bass in": Intro has drums minus clap, snare and kick, plus bass.
- "Drop the drums in the outro": drums off.
- "Make the second drop different": only Drop 2 gets melody pattern B. The other drops keep A, checked by index.
- "Yaar, drop se pehle thoda silence daal do": the Break gets a kick drop into Drop 2.
- "Loop the break": looping Break. "Play the whole song": loop cleared. "play from the second drop": plays from Drop 2.
- "Undo that": reverted the last change (the Break ending went back to roll 2 + gap).
- Also worked:
  - "add a riser / a 4 bar snare roll before the drop"
  - "make the whole song about 4 minutes" (4:08)
  - "remove the second drop", "duplicate the drop", "rename the intro to Opening", "make the drop 16 bars"
  - "make the second drop longer", "make drop two shorter", "no roll before the drop", "only drums in the intro", "bring the melody into the break"
  - "remove the second break" (there is none): an honest "couldn't find".

### Owner's choices
- **D1 (length)**
  - "full track", "make it a song" and "arrange it": 96 bars · 3:06 (16-bar sections).
  - "club track", "extended mix" and "DJ version": 192 bars · 6:12.
  - "make it 6 minutes": 5:56.
  - AI sending `club` when the user said "make it a full track like bodzin": 96 bars (guard OK).
- **D2 (missing parts)**
  - Drums-only "arrange it": still 1 track, and Keys says "There's no bassline or chords yet".
  - Drums + bass: suggests chords.
  - Empty song + "make a full track like Ben Bohmer": vibe and drums only, then arranged (112 bars · 3:40, Böhmer's long break, fill + gap, no rolls).
  - Empty song + "make it a full track": an honest "nothing to arrange yet".
- **D3 (risers)**
  - "add a riser before the drop": the Build ends in a riser of 4 bars, which plays 58 snare hits, an 8-step open-hat swell and a crash on the Drop's downbeat. The reply says "Risers aren't in the studio yet, so it's a snare roll with a crash."
  - "filter sweep before the second drop": a drum fill, plus "Filter sweeps aren't in the studio yet, so it's a drum fill."

### Regressions near the change
- No regression vs main on 20 everyday phrases (main built from e2bddbb, same probe). Phrases that fail on the branch also fail on main, for example "add a snare roll", "add a riser", "make it longer" on a plain loop.
- "make the loop 8 bars": `bars:8`, and the layout is unchanged in Song mode.
- "another one" ×2 in an arranged song: 3 different drum patterns, layout kept.
- **"let me sing the bassline" in Song mode (fake mic):**
  - It switches to Loop for the take, with only the drums playing.
  - It gets 11 notes, the lowest note number 36.
  - The voice isn't played back live (0 live notes), and the mic is off after the take.
  - It returns to Song mode, keeps all 5 transitions, and adds no raw audio track.
  - "another one" right after still works.
- The instrument guard with a known artist works:
  - "piano chords like bodzin" gives Grand Piano.
  - "chords like bodzin" with the AI sending piano gives Deep Pad.
  - "808 bassline like bodzin" gives 808 Bass.
  - "add a choir" gives Choir.
- No page errors in any run.

### Mini song map (screenshots)
- At 1400 px the map is 948 px wide and no label is clipped.
- At 390 and 360 px, 3 or 6 sections fit. 8 sections are truncated (see rough edges).
- The changed sections are outlined.
- Section colours follow the theme (checked Emerald, Velvet and Sapphire).

### MP3 of an arranged song with transitions
Layout: Intro 8 fill · Build 8 roll + gap · Drop 16 fill · Break 16 kick drop · Drop 2 16 (64 bars, 2:04).
- **File:** 2,951 KB. Length 125.91 s, expected 125.87.
- **Level:** peak −0.3 dBFS, 0 clipped samples, RMS −7.8 dB.
- **Before the MP3 encoder:** peak −0.53 dBFS (Build into Drop) and −0.4 dBFS (Break into Drop 2), so no clipping.
- **Section RMS:** Intro −6.2, Build −6.7, Drop −7.1, Break −19.1, Drop 2 −7.1. The longest silence in the file is 0.04 s.
- **Break kick drop (Break has no drums):** last bar −20.6, last beat −25.2, last half-beat −29.1, then −8.1 on the Drop 2 downbeat.
- **Time to make it:** 182 s.

### Llama 3.3 on Workers AI
Branch SYSTEM prompt, sha256 identical to the branch's worker.js (5c3445…). Same settings as `askLlama`: max_tokens 1800, temperature 0.4, the same JSON schema and the same context format, with real `projectState()` output. 12 requests, 3 at a time.
- **Usable:** all 12 gave usable actions.
- **Timing:** 1.7 to 6.1 s, mean 3.3 s.
- **Through the real `handleRequest`** (fetch mocked to return Llama's JSON): each was 1 undo step, the map was present, and the executor notes were added where needed.

| Request | Actions | Time |
|---|---|---|
| "make it a full track" | arrange full (ref Bodzin), play: 96 bars | 3.3 s |
| "make it a full club track like Bodzin" | arrange club: 192 bars | 3.5 s |
| "make the loop 8 bars" | bars 8 | 3.2 s |
| "another one" | vary drums | 3.1 s |
| "let me sing the bassline" | sing bass | 3.2 s |
| "make the break longer" | section length change 8 (16 → 24) | 3.0 s |
| "add a riser before the second drop" | transition Break snareroll 2 + crash (the roll is kept; the reply says snare roll and crash "like a riser") | 6.1 s |
| "make it longer" | arrange minutes 4 (4:08) | 2.6 s |
| "intro se kick hata do aur bass daal do" | parts intro out kick, in bass | 3.5 s |
| "remove the second drop" | section remove "5" | 1.7 s |
| "break ko 8 bar chhota karo" | section length change −8 | 1.7 s |
| "arrange it" (drums only) | arrange full; never adds parts; executor note about bass and chords | 4.3 s |

The new "don't offer risers" line does not hold, because of the example (bug 2).

### Review of assistant-dev's 4 smoke lines
They are good and fast, and they go through `handleRequest` with the offline brain.
- **Line 3:** it allows `inGap <= 1` and measures a Break with no drums, so it cannot catch bug 1. I added a separate check, below.
- **Gaps:** none of the 4 lines checks the reply text or the riser note. Fine for now.

## Smoke test changes (tests/smoke.mjs, committed to preview-ai-1)
1. **Velocity-lane drag:** measures the editor after the page settles (it was a flaky FAIL under load).
2. **"Opening the app starts a new song; the last one reopens":** waits up to 15 s for the saved list to hold the renamed song (it was a flaky FAIL under load).
3. **New check, AI-1:** the gap before the drop is empty, counting hits the drummer pushes early, for both roll + gap and kick drop. It **FAILs now** (bug 1) and should pass after the fix.

Whole check: 1:38 at normal load.

## Screenshots and scripts (`/tmp/qa/2026-11-15/ai-1/`)
- **Mini map:**
  - map-3sec-1400.png, map-6sec-1400.png, map-8sec-1400.png (Emerald)
  - map-3sec-390.png, map-6sec-390.png, map-8sec-390.png (Velvet)
  - map-3sec-360.png, map-6sec-360.png, map-8sec-360.png (Sapphire)
- **Song view after the voice edits:** m4-songview-1400.png
- **Phone page with the reply:** f3-map-3sec-390.png, f4-map-7sec-390.png
- **After singing:** s1-after-sing-1400.png
- **Raw numbers:** results.json, results-b.json
- **Scripts:** scripts/
  - ai1.mjs: flow, owner choices, regressions
  - ai1b.mjs: singing, MP3
  - gap*.mjs: the gap renders
  - probe.mjs: main vs branch
  - llm.mjs: Llama outputs through handleRequest
