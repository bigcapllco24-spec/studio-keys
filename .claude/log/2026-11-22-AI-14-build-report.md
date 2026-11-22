# AI-14 build report · assistant-dev · 22 Nov 2026

Branch `preview-ai-14`, made from `origin/preview-ai-9` (5210af0). It is pushed, and the head is **2c6a876**. Nothing went to main. I worked in /home/claude/sk-ai14.
Files changed: `src/maker.js`, `src/actions.js`, `cloudflare/worker.js` (two prompt additions), `tests/smoke.mjs` (8 new lines at the end, plus 1 existing AI-1 line changed, see "For the lead"), and `index.html` (rebuilt). `src/assistant.js` did not change.
A note on my role file: it says "never push", but the brief says to push `preview-ai-14` after each step. I followed the brief.

## Results per bug
I tested each bug with natural variants in Basic mode (offline, headless) and compared three builds: main / preview-ai-9 / this branch. The script is /home/claude/ai14-test/v.js and the outputs are in v-main.txt, v-ai9.txt and v-new.txt.

| Bug | main | ai-9 | AI-14 |
|---|---|---|---|
| 1 bring the bass in (section) | 1/6 | 1/6 | 6/6 |
| 2 mute the voice note | 0/6 | 0/6 | 6/6 |
| 3 section named in a mix comment, make the drop bigger | 0/11 | 0/11 | 11/11 |
| 4 pan, too dry | 0/7 | 0/7 | 7/7 |
| 6 breakdown placement | 0/7 | 0/7 | 7/7 |
| 7 short song | 0/5 | 0/5 | 5/5 |
| 8 mix is muddy with a muted voice note | 0/4 | 0/4 | 4/4 |
| key words offline | 0/5 | 0/5 | 5/5 |

### 1 (HIGH) "take the kick out of the intro and bring the bass in"
- **Cause:** The sentence is split into two halves. The second half, "bring the bass in", has no section in it, so it fell through to add_bass and the bassline was made again. Also, "at the build" was not read as a section, because "at" was missing from the section words.
- **Fix (maker.js):**
  - "at" now counts as a section word.
  - A second half that only switches a part in or out keeps the first half's section, if that part exists.
  - A bare "bring the bass in" never makes a new bass. In a song layout, Keys says where the bass already plays and asks which section. If the bass is muted, it is unmuted. On a loop, Keys says it is already playing.
  - "hata do aur … daal do" is now read as two clauses.
- **Fix (actions.js), live AI path:** If the AI sends add_bass or vary for "bring the bass in at the intro", the offline parts action runs instead.
- **Variants tested:** "bring/start/let the bass come in at the intro", "intro mein bass daal do", "intro se kick hata do aur bass daal do", "… and drop the bass". The last one used to delete the bassline; now it takes the bass out of the intro only.

### 2 (HIGH) "mute the voice note" started a recording
- **Cause:** The rule that starts a voice-note recording (and the "sing" take for "mute sing") was checked before any mute rule for audio tracks.
- **Fix (maker.js):** A new `audioMuteFix` runs early. It handles mute, turn off, switch off, silence and "band karo", and the opposites unmute, turn back on, bring back and "wapas lao". It works on "the voice note", "the recording", "the vocal", or a track's own name ("sing"). It mutes or unmutes that audio track, and the reply says what happened. When there is no voice note, Keys says so.
- **Fix (actions.js), live AI path:** If the AI sends a sing for these words, the track is muted and no take starts.

### 3 (MEDIUM) A section named in a mix comment
- **Fix (maker.js):**
  - A level, EQ, effect or pan comment that names a part and a section ("the melody is too loud in the drop", "make the hats softer in the break") is now read without the section words. So the right rule runs: "make the hats softer in the break" softens the hats' highs instead of moving the whole drums fader.
  - "make the drop bigger / huge / hit harder", "give the drop more energy", "more energy in the drop", "make the build more intense" and "drop ko aur bada karo" now do what the song layout really can:
    - bring in the parts the drop is missing,
    - bring back drum pieces left out of the section,
    - add a snare roll and a gap into the drop if it has none.
    - If the drop already has all of that, Keys says so honestly, with no change: "The drop already has every part and a snare roll into it. I can't make one section louder on its own yet. Want me to take the bass out of the build so the drop lands harder?"
  - "the drop is too loud" gets an honest answer: levels are for the whole song.
- **Fix (actions.js):**
  - When the words name a section and a whole-song change runs (mix, effect, groove, hats, reshape or instrument), the reply now adds: "That's in the whole song, not only the drop: one section can't be mixed on its own yet." This works offline and on the AI path.
  - If the AI sends a groove or mix for "make the drop bigger", the section answer above runs instead.
  - "at" and "inside" now count as section words, so "mute the bass at the build" switches the bass off in the build only.

### 4 (MEDIUM) Pan requests added or remade parts
- **Fix (maker.js), pan:** A new `panFix` pans the existing track with the track pan effect:
  - plain left or right is 40, "a bit" is 20, "hard" is 100, and a number is used as said;
  - centre or middle puts it back in the centre;
  - Hinglish "thoda left mein daalo" works;
  - "a bit more to the left" right after a pan goes to the same part;
  - "pan the melody" with no side asks left or right;
  - "pan the hats right" says the hats are inside the drums track and offers "pan the drums right".
- **Fix (maker.js), space:** A new `spaceFix`:
  - "it sounds too dry", "needs more space" and "give the melody more space" add 15% reverb to the chords, melody and vocals (or to the part named). Bass and drums stay dry.
  - "too wet" takes 15% off.
- **Fix (actions.js), live AI path:** If the AI sends an add or a vary for pan words, the offline pan runs instead.

### 6 (MEDIUM) Breakdown placement
- **Fix (maker.js):** A break (or bridge) asked for on a plain loop now makes Main 8, Break 16, Main 8. An intro or build still goes first, and an outro still goes last. "put a breakdown in" is now understood.
- **Fix (actions.js), songAddSec:** A break placed right next to an existing break is refused: "There's already a 16-bar break there (Break, after Drop). Say 'make the break longer' to stretch it."

### 7 (LOW) "make it a short song"
- **Fix:** The full-track phrase now allows a word before "song": short, quick, mini, reel and similar. "short song/track", "make it a reel" and "chhota song bana do" also work. "chhota" and "choti" are now short words (`SHORT_WORDS` in actions.js). Before, "chhota song bana do" made a full 3-minute track.

### 8 (LOW) "the mix is muddy" cut a muted voice note
- **Fix (maker.js):** The whole-mix mud fix skips muted parts. A melody's low cut is kept under its lowest note (0.85 × that note's frequency), and the reply says the cut was kept. On the QA case, "Melody (low cut kept at 220 Hz, under its lowest note)" replaces the old 308 Hz.
- I left the chords' low cut as it was. The existing smoke line 62 needs the chords' cut to rise, and pads are usually high-passed anyway.

### Offline key words (from the UX-19 report)
- "set the key to F sharp minor", "change the key to D minor", "set the key to F# minor", "make it F sharp minor" and "transpose to E minor" are now key changes.
- A key or pan word right after working on a part no longer gets taken as that part's name.

### Extra: AI-9 smoke flake fixed
- In the AI-9 fix 8 check, "change it all except the bass" failed in 2 of 3 full runs.
- **Cause:** `vary` on the drums sometimes gave the same beat back, about 2 times in 25 on both builds.
- **Fix (actions.js):** The drums now retry up to 6 times until the beat differs, as the bass and melody already did. After the fix, 25 of 25 runs gave a different beat.

## Worker prompt changes (cloudflare/worker.js, not deployed)
There are no backticks and no `${` in the file, and node --check passes. Two additions, nothing removed:

1. Added at the end of the "Song rules:" paragraph, after `("The break is 8 bars longer, 24 in all").`:
```
 Levels, EQ and effects are for the whole song (there is no per-section mix yet): for \"the melody is too loud in the drop\" send the mix for the melody and say it is in the whole song. \"Make the drop bigger\" or \"more energy in the drop\" is parts with in for the parts that section is missing and a transition into it, never a groove or mix change; if it already has them, say so. \"Bring the bass in at the build\" is parts with in, never add_bass. A breakdown on a plain loop is arrange custom with Main, Break, Main, never a Break first.
```
2. Added at the end of the "Mixing requests" rule, after `Say it in the reply (\"Turned the melody down 3 dB, same notes.\").`:
```
 Muting, unmuting or panning a part or a voice note never records, adds or varies anything: \"mute the voice note\" = mix that audio track mute true; \"pan the melody left\" = track_fx melody pan -40 (\"a bit\" -20, \"hard\" -100, right is plus); \"it sounds too dry\" = track_fx reverb change 15 on the chords and melody.
```

### Llama 3.3 check
I ran the old and new prompts side by side on the real model through the Cloudflare connector. It used realistic song states: a full Bodzin track, a 4-part loop with a voice note, and a 3-part loop.

| Request | Old prompt | New prompt |
|---|---|---|
| the melody is too loud in the drop | mix melody -3, reply "in the Drop sections" (untrue) | mix melody -3, reply "softer in the whole song" |
| make the drop bigger | groove energy 5 plus drums EQ (whole song) | parts in for the drop plus a snare roll into it; the executor answers "already like that" |
| it sounds too dry | master fx reverb 30 | reverb 40 on chords and melody |
| add a breakdown | custom Intro, Break | custom Main, Break, Main |

These were the same with both prompts, and correct:
- take the kick out of the intro and bring the bass in = parts out kick, in bass
- bring the bass in at the build = parts in
- mute the voice note = mix mute
- pan the melody left = pan -40 (old -50), put the chords a bit to the left = -20, chords thoda left mein daalo = -20
- make it a short song = arrange short
- sing the bassline = sing bass
- give me another one = vary drums
- make the bass a bit louder = mix +2 dB

I also ran Llama's new answers through the executor in the page:
- "make the drop bigger" ends with no change and an honest "already like that".
- Llama's old groove answer for "make the drop bigger" now gets the section answer instead.
- "too dry" sets reverb on chords and melody.

## Testing
- **`bash .claude/tools/check.sh`: CHECK OK, 112 checks, 0 page errors** (17:37 IST).
  - Two earlier runs failed only on timing lines I didn't touch, while another job's Chrome kept the 2-core machine at load 6-8:
    - "song: Ctrl+D in the editor duplicates the notes…"
    - "song/loop: after typing to Keys…" (the flake the UX-19 report already notes)
    - and once, "opening the app starts a new empty song…"
  - After that job finished, the check passed.
- The full AI-9 block passes, all 14 lines.
- New smoke lines, all at the end of `tests/smoke.mjs`: an `A14` helper, then one line each for bugs 1, 2, 3, 4, 6, 7 and 8, and one for the key words.

## For the lead
- **Deploy the Worker when AI-14 is released.** The prompt lines are above. There are no new action names and no new fields; the pan effect already existed.
- **I changed one existing smoke line (qa-tester's file).** The AI-1 line "offline Hinglish with the verb last" expected "drop ke baad break daal do" to add a second break right after the existing one, which is the bug 6 behaviour. It now expects Keys to say the break is already there (6 sections, `hs === 1`, reply "already a 16-bar break"). Please tell qa-tester.
- Rebase note: this branch sits on AI-9. UX-19 (the key menu moving notes) is not in it, so the key replies here are AI-9's.

## Known limits
- A section still can't have its own level, EQ or effects. Keys says so honestly (the future idea is requests/qa-2026-11-22-section-mix). "Make the drop bigger" on a full layout that already has every part changes nothing and suggests taking the bass out of the build.
- On the AI path, AI-9's `honestReply` sometimes cuts Llama's first sentence. Example: for "the melody is too loud in the drop" the reply was the question plus my whole-song note, without "3 dB softer".
- Llama's breakdown answer can take every part out of the break (it sent parts out bass and chords on a loop with no melody, which left an empty Break). The executor allows that.
- Only a melody's low cut is kept under its lowest note.
- On my fake voice-note track (no audio data), "turn sing into a bassline" can't transcribe. I didn't test this with a real recording.

## Try it (for a musician, Basic mode or the test link)
1. Say "make a beat like Stephan Bodzin", then "add a bassline", "add some chords", "add a melody" and "make it a full track". Then say "take the kick out of the intro and bring the bass in". The intro loses its kick and the bass comes in there with the same notes. One Undo puts it back.
2. Say "bring the bass in". Keys says where the bass already plays and asks which section. Nothing changes.
3. Drop a recording in (Import audio), then say "mute the voice note". The recording goes quiet and no count-in starts. "unmute the voice note" brings it back.
4. Say "the melody is too loud in the drop". The melody is turned down, and Keys says it's for the whole song because sections can't be mixed on their own yet.
5. Say "make the drop bigger". Keys says the drop already has every part and a snare roll into it, and offers to take the bass out of the build. Then say "take the chords out of the drop" and "make the drop bigger" again. The chords come back into the drop.
6. On a loop, say "pan the melody left", then "a bit more to the left", then "put the chords a bit to the left". Each part moves left in the stereo field and no new track appears. "pan the hats right" explains that the hats are inside the drums.
7. Say "it sounds too dry". The chords and melody get more reverb, and the bass and drums stay dry.
8. Start a new song with drums, bass and chords, then say "add a breakdown". The song becomes Main, Break, Main, so it starts with the beat. Undo, then say "make it a short song" (or "chhota song bana do") for the short Intro, Drop, Outro version. "set the key to F sharp minor" changes the key.
