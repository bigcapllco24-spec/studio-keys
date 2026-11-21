# AI-9 fix 1 report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9`, head **8ee32bd** (WIP a5a13f8 before it), pushed. Main not touched.
check.sh: **PASS bundle syntax, PASS worker syntax, SMOKE OK: 98 checks, CHECK OK**, 2:43 (96 before; +2 AI-9 fix checks added to the existing AI-9 block, so no new page load).

## Fixes (tester's list in `.claude/work/reports/AI-9-test.md`)
1. **Praised or protected parts never change, on both paths (the owner's words).** New `protectSaid(text)` in `actions.js` finds praised or protected parts and returns `{kept, rest}`:
   - praise: "is/are/sounds fine, great, good, perfect…", "I like/love the X", Hinglish "theek hai", "badhiya hai";
   - protect: "don't touch/change/mess with", "keep/leave the X", "mat chhedo", "not the X", "except the X".
   - `rest` is the request with those clauses taken out. "the drums and the bass are fine" protects both parts.
   - The praised part is the target after all when the rest names no part: "the melody is good but too loud" and "I love the melody but it's too loud" turn the melody down.
   - The praised clause is dropped when the rest names the same part: "the kick is great but the snare is too loud" means the snare (mids −3).
   - **Offline:** `localBrain` parses `rest`. "the drums are fine" on its own replies "OK. Kept the drums as they are. What should I change next?"
   - **AI path:** in `onePart`, `partsSaid` leaves kept parts out of the named parts. Every action on a kept part is dropped: add, vary, groove, reshape, mix, track_fx and the others. A one-part request also drops vibe, style, new_project and arrange, unless whole-song words were said. A song-wide relative mix ("turn everything down except the drums") becomes one move per other part, and the reply says "every part but the drums".
   - `vary chords` doesn't regenerate a protected bassline.
   - The reply always ends with "Kept the drums as they are." (or "the bassline … as it is"), unless the AI's reply already says so for that part.
2. **Going back twice keeps the bass on its chords.** `revert` adds the tracks that followed the chords to `BATCH.follow`, so the version it saves keeps them too. Tested over 3 seeds, "new chords" ×2 then "go back" ×3: the bass root was in the chord in 12/12 bars at every step (before: 0% in 1–2 bars). `pickProg` also prefers progressions not heard this session.
3. **add_* guard.** An `add_*` the AI sends next to another part passes only when the words name that part, use an add word, or the song doesn't have that part yet. "new chords" + [vary chords, add_melody] no longer gives Melody 2.
4. **`notes` never rewrites the user's part.** `ACT.notes` with mode replace on a non-generated part gives an honest note ("…kept your notes as you sang them") and changes nothing, unless the words dictate pitches like "C4". `notes` replace for a simpler/busier comment on a part the words name becomes `reshape` on that part: generated parts get simpler, and sung parts get the honest no.
5. **Hinglish and "brighten".**
   - Hinglish (`partEditFix` and `reshapeSaid`):
     - "badal do", "koi aur", "naya", "dusra", "alag" give new chords or a new part (vary);
     - "lamba" makes notes longer and "chhota" shorter;
     - "aur notes" makes a part busier and "kam notes" simpler.
   - "brighten up the melody" is now +3 dB highs (toneFix), not a replaced melody.
   - All 5 tester phrasings are correct now. "melody mein aur notes daalo" and "chords ko lamba karo" on the test loop honestly say the part is already as busy or long as it goes, with no undo step.
7. **Octave.** "play the bass an octave lower" (also higher, up, down and two octaves) is `transpose ±12`, and the reply is "Bassline an octave lower, same notes and rhythm". The transpose chip says "down an octave" or "up 2 semitones".
8. **Flats in flat keys.** `chordsSaid` spells roots for the key. F minor reads "Fm D♭ A♭ E♭" and is spoken "F minor, D flat, A flat, E flat". Sharp keys (G, D, A, E, B major and their minors) use sharps. I didn't touch `PC_NAMES` or `keyName` in `music.js`.
9. **Song-wide moves for a one-part comment.**
   - `mix` or `track_fx` on "all" when the words or the focus name one part goes onto that part. It is dropped when the AI also sent the same kind of move for that part. "the bass is too loud" [mix all −3, mix bass −5] now changes only the bass.
   - An absolute `volume` that would go the wrong way becomes a 3 dB step.
   - Master `fx` for a one-part comment is dropped.
   - When the guard drops everything the AI sent, the offline brain's one-part change runs instead, with its reply. "the bass is muddy" sent as a master high-pass gives a bass low cut of 50 Hz.
   - When the AI's mix or fx moves change nothing ("the mix is muddy" sent as mix all eq), the offline brain handles it. If nothing changes after that either, the reply says so honestly.
10. **Nits.**
    - Grammar: "The chords are already as simple as I'd make them" and "The chords are already as long as they go".
    - Sung parts say "as you sang them"; "your bassline stays as you sang it" after new chords.
    - vary on the user's own part is a note, not "Done: …".
    - A one-word "louder", "a bit softer" or "simpler" goes to the focus part, offline (`focusText`) and on the AI path (`BARE_LEVEL`).
    - "make it softer" with no focus turns the whole song down 5 dB (`levelFix` now knows "softer").
    - "make the chords busier" on held pads keeps the level: RMS −18.1 → −18.7 dB (it was 6 dB quieter), and the gates run to the next hit.
    - A level comment sent as [mix bass, vary bass] drops the vary, so the notes stay.
    - "make the bass softer" sent as add_bass replace is a −3 dB fader step, not a fake "replaced".
    - "make the bass a bit faster" no longer changes the tempo: faster or slower with a part named is about the part.
    - A question ("which chords are these") with add_chords from the AI changes nothing.
- **6 not fixed** (groove engine): "make the drums busier" says "energy N of 5" when the energy step changes 0 hits. It's sound-engine-dev's `makeGroove` energy levels.

## Numbers (headless Chrome, the tester's scripts rerun on this build)
- **T2 offline, 32 new phrasings:** 0 bad (it was 3 bad: the three protected-part phrasings). Each is one Undo, and Undo restores exactly.
- **T4 AI path, 36 stubbed cases:** 0 bad (it was 5: problems 1, 3 and 9, plus "make the bass a bit faster" changing the tempo).
- **T1, 48 earlier phrasings:** 0 bad.
- **T3 memory chains:** all checks true, including the "no, the other one" toggle and going back to the exact chords and bass.
- **T5 own parts, 28 cases:** sung and played notes kept, apart from 2 the user asked for: "quantize the bass" (they asked) and the AI's transpose for "fix my melody" (not changed, same as before).
- **T6 Song view and AI-1/AI-4/6/8 phrases, 53:** identical to the tester's branch run.
- **New T9, 27 cases:** 0 bad. 18 are offline: protected parts (praise, don't touch, keep, leave, both parts, Hinglish, except), same-part praise, one-word follow-ups, "make it softer" with no focus, and octave. 9 are on the AI path: [add_drums, vary chords] and [vary drums, vary chords, groove +1] for "the drums are fine…"; [groove −1, reshape melody]; [mix drums eq low −3, mix bass −5] for "the kick is great…"; "change everything except the drums"; "louder" with focus melody; and "the mix is muddy" as mix all eq.
- **Sound** (offline `renderAudio`, 4-bar Böhmer loop): the mix peak is −0.45 to −0.58 dBFS and RMS −6.6 to −6.8 dB across baseline, bass simpler/busier and new chords/shorter/longer. No clipping. Held strings busier: peak −6.0 → −6.7, RMS −18.1 → −18.7 dB.
- 0 page errors in all runs.

## Prompt changes (`cloudflare/worker.js`, for the lead's Llama test)
1. **ONE PART AT A TIME** gains these sentences after "…for a comment about one part.":
   - "A comment about one part never uses mix \"all\" or fx (the master knobs)."
   - "Parts the user praises or protects (\"the drums are fine, just change the chords\", \"don't touch the drums\", \"keep the bass\", \"I like the chords\", \"the kick is great but the bass is too loud\") never change: send no action for them at all (no add_drums, vary, groove, reshape, mix or track_fx), and say \"Kept the drums as they are.\""
   - "\"play the bass an octave lower\" = transpose bass -12, never a volume move."
2. **New example** before "go back to the previous chords": User "the drums are fine, just change the chords" → `{"reply":"New chords under the same melody; the bassline follows them. Kept the drums as they are.","actions":[{"type":"vary","track":"chords"}]}`.

No new action names. No backticks or `${`. Worker syntax OK. The executor guards all of this on its own, so the test link works even before the Worker deploy.

Suggested Llama requests:
- "the drums are fine, just change the chords"
- "don't touch the drums, make the melody simpler"
- "the kick is great but the bass is too loud"
- "the bass is muddy"
- "play the bass an octave lower"
- "louder" with focus melody

## Files
- `src/actions.js`: `protectSaid`/`keptTxt`, `onePart` (rewritten: protected parts, song-wide moves onto the part, question guard, level-only guard, add_* guard, notes → reshape, offline fallback), `ontoPart`, `BARE_LEVEL`, `inPlace` (level), `reshapeSaid` (Hinglish), `pcKey` (flats), `vary`/`reshape`/`notes`/`revert`/`transpose`, `busyPart` (held chords), `pickProg`.
- `src/assistant.js`: AI-path replies: `BATCH.local` (offline reply when the guard used it), the fallback when mix moves change nothing, `BATCH.sayInstead`, no "I only changed…" when "Kept…" is there.
- `src/maker.js`: `localBrain` uses `protectSaid`; `partEditFix` (octave, Hinglish fresh words); `focusText` (bare one-word follow-ups); `toneFix` (brighten); `levelFix` (softer = whole song).
- `cloudflare/worker.js`: the prompt (above).
- `tests/smoke.mjs`: 2 checks inside the AI-9 block, covering problems 1–4.
- `index.html`: rebuilt.

## Known limits
- `protectSaid` is phrase-based. Unusual phrasings can slip through, for example "the drums slap, change the chords" ("slap" isn't a praise word). The AI-path guard only drops a kept part when the words name it.
- "the drums are fine, make it louder": the praised part becomes the target (nothing else is named), so the drums get louder. That reading is debatable.
- `music.js` is unchanged in this fix.

## Try it (updated, for the owner)
1. Make a house loop with drums, bass, chords and melody. Say "the drums are fine, just change the chords". The chords change, the bassline follows them, and the drums stay exactly the same. Keys says "Kept the drums as they are."
2. Say "don't touch the drums, make the melody simpler", then "the kick is great but the bass is too loud". Only the melody gets simpler, then only the bass gets quieter. The drums don't change at all.
3. Say "new chords" twice, then "go back to the previous chords" twice. Each time the chords switch back, the bassline still plays along with them.
4. Say "make the bass simpler", then just "softer", then "play the bass an octave lower". Only the bassline changes each time: simpler, then quieter, then an octave down.
5. Say "which chords are these" on a song in F minor. Keys answers with flats ("D flat", not "C sharp") and adds nothing.
6. Turn on Always listening, play the loop and say "Keys, stop listening". The music keeps playing and the mic turns off.
