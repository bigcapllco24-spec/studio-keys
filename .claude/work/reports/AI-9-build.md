# AI-9 build report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9` (built on `preview-ai-1` adf0a70), head **798b23d**, pushed. Main not touched.
check.sh: **PASS bundle syntax, PASS worker syntax, SMOKE OK: 96 checks, CHECK OK** (91 before plus 5 new AI-9 checks). Two full runs, no flakes.

## Causes
1. **The wrong part changed.** In `maker.js`, "simpler", "busier" and "less busy" always went to the drum groove, whatever part was named. There was no way to make one part simpler or busier.
2. **A second copy instead of a change.** "change/replace the chords", "change the melody", "make the chords warmer/shorter/longer", "the melody is too busy", "put the chords on a piano" and "which chords are these" all fell through to `add_chords`/`add_melody`, and those always make a new track. On the AI path nothing in `actions.js` caught it either: `ACT.vary` used whatever track the AI sent ("add a bassline and give me another one" → vary drums).
3. **"new chords" didn't change the chords.** `chordPlan()` fits every bar to `melodyNotes()`, and that included generated melodies, so a new progression gave the same chords. `vary` then regenerated the bass and the melody too. The reply's numerals were all lower case.
4. **"change the bassline" gave the same bassline.** The house `offbeat` bass pattern (and others) is fully determined by the chords, so a new seed changed nothing.
5. **No memory.** The page sent only the last 8 chat lines. Nothing told the AI which part the last request was about or what it changed.
6. **LOW bugs.** "stop listening" went to the parser and matched "stop", so it stopped playback. "busier drums" at energy 5 regenerated an identical groove. `regenTrack` dropped the `cs` override. The hum flush still snapped hummed notes to the key.

## What changed
- **`src/actions.js`**
  - **Guard `onePart()` (in `runActions`, before `orderActions`).** It works out the parts the request is about: the parts the user's words name, or, for it/that/another one, the focus part. It drops `vary`, `add_*`, `hats`, `groove`, `drum_pattern`, `notes`, `instrument`, `convert`, `transpose`, `quantize`, `remove`, `reshape` and `revert` aimed at other parts. A swing-only `groove` is allowed when swing words were said. It also drops a `key`, `tempo` or `bars` change the words don't ask for.
    - A dropped "another one" goes to the part just added or named.
    - A dropped action whose words say simpler/busier becomes `reshape` on the named part.
    - `mix all` for "make it softer" right after a part goes to that part (`BATCH.retold`, and the reply says what really changed).
    - It is a separate function, so UX-14's `singAlone()` can wrap it: `orderActions(singAlone(onePart(raw)))` or the other way round. Either order works.
  - **`inPlace()`.** `add_bass`/`add_chords`/`add_melody` for a part that exists, with no add word (add, another, second, layer, extra…):
    - becomes `instrument` when a new sound is named;
    - becomes `reshape` for simpler/busier/shorter/longer;
    - becomes an EQ step for warm/bright/dark;
    - becomes `vary` for change/replace/new/different/happier;
    - otherwise becomes `replace:true`.
    - Never a second copy. A user's own (sung or played) part is never replaced; the reply says so.
  - **New actions.**
    - `reshape {track, do: simpler|busier|shorter|longer}` works on the part's own notes:
      - simpler keeps about 55% of the onsets per bar, strongest beats first;
      - busier adds 16th pickups (bass), splits long notes into scale steps (melody), or turns held chords into a rhythm;
      - shorter halves note lengths; longer holds each note to the next one.
      - The result is stored as `t.dens`/`t.art`, so later takes keep it. On drums it is one energy step. On the user's own part: an honest reply, no change.
    - `revert {track}` brings back that part's previous version from this session (`VERSIONS`, kept by `runActions` for every notes/sound change, up to 24). Going back to earlier chords also restores the bass that followed them and `PROJ.prog`. Repeating it toggles between the last two versions ("no, the other one"). Versions identical to the current part are skipped (after an Undo, say).
  - **`vary`.**
    - **Chords:** `pickProg(mood)` picks a progression that differs from what plays now (at least half the bars preferred) and best fits the melody that stays, leaning brighter or darker for `mood`. It regenerates the chords on their own seed, and a generated bass follows. The melody is never touched. With the user's own melody it sets `PROJ.progLocked`, otherwise the chords would refit to the same melody. The reply reads e.g. "New chords: i–VI–III–VII (were i–iv–v–i), same melody; the bassline follows the new chords".
    - **Bass, melody and chord rhythm:** each try is checked against the current part. Up to 8 tries; the bass moves to a sister pattern (`BASS_ALT`) when seeds alone give the same line.
  - **Other changes.**
    - `regenTrack` passes `t.cs` (SE-4 note) and `t.bs`, and applies `shapeEvents`. `freshShape` resets these on a new or replaced part.
    - `groove`: at energy 5 (or 1) with an energy-only change it says "already at full energy (5 of 5)…" and changes nothing (`BATCH.declined`). The reply now says "Drums busier (energy 4 of 5)".
    - `instrument`: if the part is already on that sound, it says so. The reply adds "same notes".
    - `vibe`: a key the user names sets `PROJ.keyBy='you'` (UX-14).
    - `sing` melody clears `progLocked`.
    - Helpers: `romans()` (VI–III–VII–i in minor), `chordsSaid()`, `partsSaid()`.
- **`src/assistant.js`**
  - **`noteChange()` (called from `runActions`).** It keeps a per-request log line (`"what was said" → what changed`, last 20) and `ASSIST.focus` (the one part the request named or touched; reset by song-wide actions).
  - **`projectState()`** now sends `recent` (last 10 lines), `focus` and `chords` (e.g. "Am F C G (i–VI–III–VII) in A minor") straight after `arrangement`. The state was 980 to 1,070 characters in tests, far under the 7,000 cut.
  - **`MIC_OFF`.** "stop listening", "keys stop listening", "turn off the mic", "mic off", "mute the mic", "go to sleep" stop listening and close the mic, before any brain. Playback never stops.
  - **Replies.** A declined request replies with the executor's reason instead of the AI's claim. When the guard dropped AI actions, it adds "I only changed what you asked about; the rest stays as it was."
  - **Hum flush.** The key snap is deleted (UX-14 item 3).
- **`src/maker.js`**
  - `askFix` answers "which chords are these", "what key is it in" and "what tempo". Named chords ("make the chords Am F C G", "a minor f c g") get an honest reply and no track.
  - `partEditFix` handles revert phrasings (before undo); simpler/busier/shorter/longer (with a level clause kept: "simpler and a bit louder"); change/replace/redo/new/different on a part (vary, or instrument when a sound is named); and happier/sadder chords.
  - `focusText`: "make it softer" or "another one" right after a part is about that part. Song-wide words, transport, arrangement and length words keep their meaning.
  - "redo the melody" is a new melody; "redo" alone is still redo.
  - The swap verbs now include put, play, replace, have and try.
  - `toneFix` has a `warm` kind.
  - Sung parts: "record my bassline" and "let me record the bass with my voice" give `sing:bass`; "i'll hum it" gives `sing:melody` (`sing:bass` right after talking about the bass).
- **`src/music.js` (sound-engine file, two small changes, please tell sound-engine-dev):**
  1. `melodyNotes()` skips generated melodies (`&& !t.gen`). A generated melody already follows the chords, so it no longer moves them, and the auto key no longer flips A minor to C major (it did in tests). Sung, hummed and played melodies still shape the chords as before.
  2. `genBass(style,L,seed,bsOver)` takes an optional bass pattern override (like `genChords`' `csOver`).

  Neither touches the lines SE-4 changes in `chordPlan`/`PROGS`/`genChords`. I didn't test-merge with preview-se-4.
- **`cloudflare/worker.js`.** The prompt changes are below. The user turn now ends with a focus hint when `state.focus` is set. No backticks and no `${`.
- **`tests/smoke.mjs`.** 5 new checks: one-part phrasings, new chords and going back, focus/"change the bassline"/questions, the AI-path guard, and sung phrases/full energy/"stop listening"/state log.

## Numbers
- **Offline, 70 phrasings.** Each one starts from the same 4-part house loop (drums, bass, chords, melody, all generated), and the whole project is snapshot-diffed. "Bad" means a part the words didn't name changed, or a track was added.
  - **Before** (preview-ai-1 build, 46 of them): 26 bad, plus 1 that changed nothing ("redo the melody").
  - **After:** 0 of 70 bad. The 24 extra phrasings include Hinglish ("bass ko simple karo", "melody thodi busy karo", "chords ko simple karo"), "i don't like the chords, change them", "swap the bass for a reese", "put the melody on a flute", "hold the chords longer" and "thin out the chords".
  - "new chords", "different chords", "try other chords", "change/replace the chords" and "happier/sadder chords" change only Chords and Bassline, plus the progression.
- **"change the bassline" ×10:** identical 6/10 before (QA), **0/10** after, and 0/8 in the smoke check.
- **User's own melody, "new chords" ×5:** the melody is unchanged 5/5, the chords changed 5/5, and no track was added.
- **Memory chain, offline:**
  - "make the bass simpler" → "make it softer" (bass −5 dB) → "another one" (new bassline) → "no, the other one" (previous bassline back) → "turn it down a bit" (bass −3 dB).
  - "new chords" → "make the melody softer" → "go back to the previous chords" gives back exactly the original chords (and their bass).
- **AI path (`handleRequest` with a stubbed `/api/assistant` returning these actions):**
  - [add_bass, vary drums] → the bass is varied, the drums are untouched.
  - [groove drums −1] or [vary drums] for "make the bass simpler" → the bass gets simpler.
  - [add_chords] for "change the chords" → in place, no copy.
  - [add_chords Strings] for "put the chords on strings" → instrument swap.
  - [vary chords, vary bass, vary melody] → the melody is kept.
  - [add_chords replace] for "warmer" → EQ.
  - [key C major, vary chords] for "happier" → the key is dropped.
  - Swing-only groove for "more swing on the chords" → kept.
  - [mix all] for "make it a bit softer" with focus bass → the bass only.
  - Full energy → "already at full energy" and nothing changed.
- **Llama 3.3 (Cloudflare connector, `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, full new prompt, realistic state, 26 calls in 3 runs):**
  - **Correct, 11 of 12 in run 1:**
    - "make the bass simpler" → reshape Bassline simpler;
    - "new chords" → vary chords;
    - "add a bassline and give me another one" → add_bass + vary bass;
    - "go back to the previous chords" → revert Chords;
    - "change the chords to something happier" → vary chords mood happier;
    - "put the chords on strings" → instrument Chords Strings;
    - "record my bassline" → sing bass;
    - "bass ko thoda simple karo" → reshape Bassline simpler;
    - "which chords are these" → [] with "Am, F, Am, G";
    - "make the chords warmer" → mix Chords eq {low 2, high −3};
    - "another one" (focus melody) → vary melody.
  - **Wrong, 1 of 12:** "make it softer" (focus bass) → mix all.
  - **Run 2 (prompt v2):** "the melody is too busy" → reshape simpler; "no, the other one" → revert bass; "make the drums busier" → groove +1; "chords ko strings pe daal do" → instrument Strings; "make the chords Am F C G" → [] with an honest reply; "let me sing the chords" → sing chords; "change the melody" → vary Melody. But Llama still sent mix all for "make it softer" and "turn it down a bit" with focus bass, even with the rule in the system prompt.
  - **Run 3, with the focus hint added to the user turn (Worker change):** "make it softer", "turn it down a bit" → mix Bassline −3; "make it a bit louder" → mix bass +3; "another one" → vary bass. **4/4.** The executor also catches it, so the reply is right either way.
- **Sound** (offline `renderAudio`, 4-bar house loop at 124 BPM):

  | Render | Peak | RMS |
  |---|---|---|
  | Mix, baseline | −0.5 dBFS | −6.7 dB |
  | Mix, after "new chords" | −0.5 dBFS | −6.7 dB |
  | Bass, baseline | −0.9 dBFS | −11.0 dB |
  | Bass, simpler | −0.9 dBFS | −13.7 dB |
  | Bass, busier | −0.9 dBFS | −10.7 dB |
  | Chords, baseline | −4.1 dBFS | −19.9 dB |
  | Chords, longer | −3.5 dBFS | −16.6 dB |
  | Chords, busier | −3.6 dBFS | −17.5 dB |
  | Melody, baseline | −6.6 dBFS | −23.4 dB |
  | Melody, busier | −5.8 dBFS | −23.1 dB |

  Nothing clips and nothing vanishes.
- A held Strings chord track (cs "pads" on a house song) stays held after "another one" and after "new chords".

## Exact prompt changes (`cloudflare/worker.js`, for the lead's Llama test)
1. **vary:** "track "chords" gives a new chord progression and the bass and melody follow it." is replaced by: "It changes that part on its own track and always gives something different. track "chords" gives new chords: a new progression that fits the melody, which stays exactly as it is; a generated bassline follows the new chords (say so). Add "mood":"happier" or "darker" for "happier chords", "something sadder"." The end of that line adds: "With no part named, "another one" is the focus part."
2. **add_chords/add_melody:** "send "replace": true only when the user says replace, change or redo that part." is replaced by: "When that part already exists, "change", "replace", "redo", "new" or "different" chords/melody/bass is vary on that part (new notes on the same track), and a new sound for it ("put the chords on a piano", "replace the chords with strings", "play the melody on strings", "switch the bass to an 808") is instrument (same notes); never add_chords, add_melody or add_bass for these, so there is never a second copy playing."
3. **New action lines after `again`:**
   - `reshape` (simpler/busier/shorter/longer on ONE part; drums are one energy step; never vary another part for these).
   - `revert` (the part's previous version, the rest stays; track left out = the focus part; differs from undo).
4. **sing (UX-14):** "each becomes a chord in key" now reads "each becomes a chord built on the note they sang". A second sentence block was added: their notes are kept as sung; no add_*/vary/notes for the sung part; "record my bassline", "let me record the bass with my voice", "I'll hum it" = sing; right after a take, "again"/"one more time"/"another take" = again, never vary.
5. **New sections before THE USER'S TASTE:**
   - **THE CONVERSATION:** recent, focus and chords; it/that/another one = the focus part; "go back to the previous chords" = revert; answer "which chords are these" from chords with no actions; named chords get an honest reply and no track.
   - **ONE PART AT A TIME:** only the named part changes; "make the bass simpler" = reshape bass; "new chords" never touches the melody or drums; "make the chords warmer" = mix chords eq {high −3, low 2}; no key, tempo or loop change for a one-part comment.
6. **mix "all" and the mixing rule:** "turn it down a bit" / "make it louder" are the whole song only when focus is null; with a focus part, they mean that part.
7. **Four new examples:** "make the bass simpler", "new chords", "make it softer" (focus bass), "go back to the previous chords".
8. **Not prompt text:** the user turn appends "(The last request was about the <focus>. If this one says it, that, them or another one without naming a part, it means the <focus>, not the whole song.)" when `state.focus` is set. The value is cleaned to letters, at most 12.

## For the lead / other devs
- **Worker deploy needed at release.** New action names: `reshape`, `revert`; new optional field `vary.mood`; new state fields `recent`, `focus`, `chords`. The test link uses the live Worker, so the new prompt is not active there: the guard and offline parser still give one-part behaviour, but the live AI won't send `reshape`/`revert` until the deploy.
- **UX-14 merge.** My guard is `onePart()`, a separate function on the same line where UX-14 calls `singAlone()`, so keep both (e.g. `orderActions(singAlone(onePart(raw)))`). I didn't duplicate their `ACT.key` keyBy (I only did `vibe`). UX-14's `ACT.sing` refactor (`singPart`) touches the line where I added `delete PROJ.progLocked` for melody takes, so keep that line in the merge.
- **sound-engine-dev:** two small `music.js` changes, listed above.
- **qa-tester:** the 5 smoke lines are in. Worth adding a real-speech pass on the live site after the deploy (it/that follow-ups, "no, the other one").

## Known limits
- Versions for "go back" live only for this session (not saved with the song). Undo is unchanged.
- "simpler/busier/shorter" only work on generated parts. The user's own parts get an honest reply (owner rule: never rewrite what they sang).
- Chords named by letter are still not played (separate idea); Keys says so.
- Chord answers come from `chordPlan()`, so a part the user has since edited by hand may differ.
- The "another one" overlap for drums (53–98%) is SE-8's territory and untouched.

## Try it (for the owner)
1. Make a house loop with drums, bass, chords and a melody. Say "make the bass simpler", then "make it softer". Only the bassline gets simpler and then quieter; the drums and chords stay exactly as they were.
2. Say "new chords" a few times. The chords really change (Keys names them, e.g. "VI–III–VII–i"), the melody stays the same and the bassline follows. Then say "go back to the previous chords".
3. Say "change the bassline" several times. Every take is different, and there is still only one Bassline track. Say "no, the other one" to hear the last one again.
4. Say "put the chords on strings", then "make the chords warmer", then "which chords are these". Same notes on strings, a warmer tone, and a spoken answer. No new tracks.
5. Turn on Always listening and play the loop, then say "Keys, stop listening". The music keeps playing and the mic turns off.
