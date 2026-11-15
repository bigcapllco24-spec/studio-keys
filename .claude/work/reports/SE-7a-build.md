# SE-7a build report: Honest key (sound-engine-dev, Build mode, 15 Nov 2026)
Branch `preview-se-7` (from origin/main e2bddbb). Test link: https://studio-keys.bigcapllco24.workers.dev/p/preview-se-7/

## What changed
**My file, `src/music.js`**
- `detectKey(notes, opts)` v2: weight = length x velocity, bass notes (bass track or below C3) and bar-start notes x1.5; `null` under 8 notes or 4 pitch classes (`opts.loose` for Keys' own pick).
  Scoring differs from the proposal's plain profile match, because that tested badly (69% exact on our loops): each of the 24 keys scores 2 x scale fit + 0.5 x Krumhansl-Schmuckler match + tonic evidence (bass root on downbeats 0.25, first chord 0.1, last chord 0.05). With no bass track, a bar's root is the root of the chord sounding there, not its lowest note (inversions fooled it). A near tie between major and minor goes to the style's mode.
  Returns `{tonic, mode, conf, level 1-4 (maybe / likely / fairly sure / sure), alt, cands[3] each with a reason ("the bass lands on F", "starts on F", "same notes as F major", "94% of the notes fit")}`.
- `pitchedNotes()` / `pitchedTrack()`: every notes track except drums, hats, percussion and percussive instruments.
- `keyStatus()`: `{key, from: you|keys|vibe|song|notes|none, conf, level, word, alt, enough, cands, hum, heard}`. `projectKey()` now = `keyStatus().key` or the style default.
- `keysPickKey()`: Keys pins a key (`from:'keys'`) when it makes a part on a song with no key (fits a few notes if there are 3+, else the style default).
- `takeKey(notes, detect)`: one rule for sung takes, hums and transcribed audio: a set key stays; otherwise a soft key (`from:'notes'`, "from your humming") only from 8+ notes heard together with the song's other parts. Never locks, never moves notes.
- `djKey(k)` ("7B", "9A"), `keyStatusText()` (chip/toasts), `keyContext()` (for the AI), `detectKeyV1` (old guess, migration only), `sameKey`, `relKey`.
- `migrateKey(p)`, run lazily on first `keyStatus()` (marker `PROJ.kv=2`): an old key with no `from` stays as "set"; an old song with no key but generated bass/chords/melody keeps the old default those parts were made in, as `from:'keys'`. Nothing moves on reopen.

**Other owners' files (explicit permission in the brief), all small**
- `src/studio.js` (studio-ux-dev): `setKey(k, from='you', {move})`. Changing a key that was set still moves the parts, as before; a soft key never moves notes; `{move:false}` only relabels (popover "Set"). `#keySel` = `from:'you'` and shows "Key: auto" for soft keys. Sung take uses `takeKey` instead of locking. The "Got it" reply says "(it sounds like F major)" for a guessed key. Ableton README line now reads the honest key plus DJ key, or "none yet".
- `src/edit.js` (studio-ux-dev): `transcribeTrack` uses `takeKey` (soft key, no lock).
- `src/daw.js` (studio-ux-dev): `renderKeyChip`, `renderKeyPop`, `keyPopOpen`. The chip is `#keyInfo` (now a button): "F major [meter] likely · or D minor", "no key yet", or, next to a set key in the menu, "set" / "Keys picked" / "from the vibe". Tap: popover with the key, DJ key, sureness, a plain explanation, the 3 best guesses with reason and **Set**, and "Keep on auto" / "Back to auto". Esc and outside click close it; it stays on screen at 360 px. `renderTracks` renders the chip first, so old songs migrate before the menu is drawn.
- `src/body.html` (studio-ux-dev): `#keyInfo` span became `<span class="keybox">` with the chip button and `#keyPop`.
- `src/head.html` (studio-ux-dev): about 20 lines of CSS (`.keybox`, `.keychip`, `.kc-meter`, `.keypop`), theme variables only, matte.
- `src/actions.js` (assistant-dev): `add_bass`, `add_chords` and `add_melody` call `keysPickKey()` before `ensureProg()`; the artist key from `adoptVibe` and `vibe` is `from:'vibe'`, and `vibe` no longer puts an artist's key over a key your own notes are in; the `key` action is `from:'you'`. Four one-line edits.
- `src/assistant.js` (assistant-dev): context `key` = `keyContext()` (for example "F major (DJ key 7B), worked out from the user's notes: likely, could also be D minor; starts on F", or "no key yet (...)"). The hum path uses `takeKey`.
- `cloudflare/worker.js` (assistant-dev): one rule line (KEY: answer "what key" from the status honestly, say how sure and the second guess, never claim a key it doesn't have, send a key action only when asked or on yes). No backticks or `${`; syntax checked.
- `tests/smoke.mjs`: 4 new checks (below).

## How I tested
- `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK 51 checks** (47 before plus 4 new), no page errors.
- New smoke lines: empty song says "no key yet" (chip too); F major chords plus bass with no melody read "F major · sure", and a new melody has 18 notes with 0 outside F major; a 3-note hum leaves `PROJ.key` null and says "no key yet"; an old song from IndexedDB (generated parts, no key) reopens with all events identical, reads "A minor · Keys picked", and a new bassline has 0 notes outside A minor.
- Accuracy harness (headless Chrome, 864 of our own loops: 12 styles x 24 keys x {bass+chords, bass+chords+melody, chords+melody}):
  - **new: 749/864 exact (87%)**, 98 relative key, 17 other (power chords with no third);
  - old app logic (melody-only guess, else default A minor): 221/864 (26%);
  - plain profile match with the bass as a tie-break only (my first attempt, as in the proposal): about 70%.
  - Sureness is honest: "sure" is right 99% of the time, "fairly sure" 97%, "likely" 79%, "maybe" 70%.
- Also checked: popover "Set" relabels without moving notes, Undo returns to auto; legacy key with no `from` reads "set" and doesn't move; Keys picks "A minor · Keys picked" for a bass on a drums-only song; DJ codes C major 8B, A minor 8A, E minor 9A, F major 7B, D minor 7A.
- UI: screenshots at 1400 and 390 px with the popover open (`/home/claude/se7-shots/key-chip-desktop.webp`, `key-chip-phone.webp`); at 360 px the popover sits at 16-344 px and there is no sideways scroll.
- Sound: no audio code changed; the smoke MP3 and whole-song checks still pass (peak -0.53 dBFS).

## For the lead
- Worker: `cloudflare/worker.js` changed (one prompt line), so deploy the Worker in the release. On the test link the chip, the offline brain and the new `key` context are live; the prompt line isn't until the Worker is deployed.
- AI-1 is editing `actions.js`, `assistant.js` and `worker.js` in parallel. My edits there are 4 + 2 + 1 lines, so a merge should be easy: keep the `keysPickKey();` calls and the `'vibe'` / `'you'` arguments to `setKey`.
- New globals other devs can use: `keyStatus`, `keyStatusText`, `keyContext`, `takeKey`, `keysPickKey`, `pitchedNotes`, `djKey`, `KEY_HARD`, `setKey(k, from, {move})`.

## Known limits
- Songs saved before this with a key locked by a hum now show "set" (the old app didn't record where a key came from). Tap the chip, then "Back to auto".
- The stored soft key (from a hum) still drives mic snap (`mic.js`) and the piano-roll scale shading. The chip re-reads the notes, so they can disagree briefly after a big change. Small; 7c can tidy it.
- The offline parser has no "what key is this" answer yet (planned in 7c with the other phrases).
- Accuracy numbers are on our own generated loops (progressions start on the tonic). Real songs will be lower; that's why the chip shows how sure it is and a second guess.

## Left for 7b / 7c
`analyseAudio` (audio songs), the song card, the chord strip, `PROJ.chords`, the new actions (`analyse_song`, `chords_from_audio`, `set_chord`, `match_key`, `key:"auto"`), offline phrases, and `tests/keys.mjs`. `keyStatus` already has `from:'song'` ready for 7b.

## Fix 1 (15 Nov 2026, after the QA check)
**What I fixed**
1. (medium) A sung tune no longer creates fake bass roots. `detectKey` only takes bar roots from real bass parts (`bass` notes: a bass track, or a low part played in that isn't a melody or chords track) and chord parts (`chord` notes: a chords track, or any track that mostly plays 3+ notes at once, so a piano part played in or imported counts). For a chord part the bar root is still the chord's root, with the lowest voice as the tie-break: plain "lowest voice" read inversions wrong. A tune on its own gets only a light hint from its first note ("the tune starts on A"). When Keys picks a key from fewer than 8 notes, only keys that all those notes fit can win. The QA take (A C G E G A C G G) now reads "C major · maybe · or A minor"; 7 of those notes plus "add a bassline" give "A minor · Keys picked" with 0 bass notes outside it (before: G major).
2. (low) Reasons say what's really there: "the bass lands on / starts on X" only with a bass part, otherwise "the chords keep coming back to / start on X", "the tune starts on X", "same notes as …" or "94% of the notes fit". The second guess never clashes with played notes when a same-notes key exists: F♯m–E–D–E now reads "F♯ minor · likely · or A major" (E major moves to third); harmonic minor Am–Dm–E–Am gives C major second instead of A major.
3. (low) The key is labelled by its real source. `takeKey(notes, detect, src, role)` with src `hum` / `sing` / `audio`: "from your humming", "from your singing", "from your recording", and only when the take decided the key (the other parts alone gave no key or another one). Chords that already said A minor stay "A minor · likely · or C major" after a sung take. Stored as `PROJ.key.src`; the old `hum:true` still reads as humming.
4. (low) Hum reply: "Got your hum: 12 notes (it sounds like D minor) …"; "in D minor" only for a key that was set. The sung-take reply now says "it sounds like" for every soft key.
Optional, done: i-VI-III-VII loops read fairer. When the best two keys are relatives and the loop opens on the winner's chord in the winner's mode (Dm in Dm–B♭–F–C) and doesn't end on the other key's tonic, "maybe" becomes "likely" (never higher). Dm–B♭–F–C and Am–F–C–G (with bass, and without) now read "likely".

**Files**: `src/music.js` (detectKey, chordyTrack, bassyTrack, pitchedNotes, keyStatus, takeKey, KEY_SRC, keyStatusText, keyContext); small edits in other owners' files: `src/daw.js` (chip and popover use `st.src`, 3 lines), `src/studio.js` (setKey stores `src`; the sung take passes `'sing'`; reply wording, 3 lines), `src/edit.js` (transcribe passes `'audio'` and the part, 2 lines), `src/assistant.js` (hum passes `'hum'`; reply wording, 2 lines). `tests/smoke.mjs`: 2 new checks.

**Tests**
- `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK 54 checks** (52 + 2 new), no page errors.
- Accuracy re-run, 864 loops: **760/864 exact (88%)**, up from 749 (87%); 94 relative key, 10 other. Sureness: sure 99% right (172 loops), fairly sure 97% (298), likely 77% (288), maybe 74% (106). The "likely" boost raised 223 loops: the 168 with a clear answer were all right; the other 55 are the vi-IV-I-V loop (Am–F–C–G) our generator labels C major and the app reads A minor with C major second. With the boost capped at "fairly sure" instead, "fairly sure" fell to 91% right, so I capped it at "likely".
- Fake mic, `sing.wav` over a house beat, 3 runs: 10 / 10 / 11 notes (A C G E), read A minor, C major, A minor ("from your singing" on runs 2 and 3); "add a bassline" afterwards: 0 notes outside the key every time (before: G major in run 1). Over A minor chords, a sung melody: "A minor · likely · or C major", no "humming" label. Hums: 3 notes → no key; 12 notes → "D minor · from your humming", reply "(it sounds like D minor)". MIDI fixture Lead: "C major · likely · or G major"; then `sing.wav` turned into notes: "C major · likely" (the Lead already gave it); on an empty song: "C major · from your recording".
- Fake MIDI keyboard played live (chords + bass on one piano track): Dm–B♭–F–C "D minor · likely" (was maybe), Am–Dm–E–Am "A minor · sure", E–C♯m–A–B "E major · likely"; Keys' melody over it 19 notes, 0 outside E major.
- Speed: `keyStatus()` 0.49 ms with 2,324 pitched notes.
- Screenshots retaken (reason text changed): `/home/claude/se7-shots/key-chip-desktop.webp`, `key-chip-phone.webp`.

**Known limits**
- A sung take is read before it's quantized and snapped; when C major and A minor are a near tie, the track can then read the other one. The chip then shows the plain reading (for example "A minor · maybe · or C major") without "from your singing". Honest, just less specific.
- The QA rough edges I didn't touch: "Keep on auto" with no key only closes the popover; the key box can wrap to the second transport row at 1400 px; mic snap and piano-roll shading still use the stored key.

## Fix 2 (15 Nov 2026, after the QA retest)
1. **Picking a key moves the parts when the key came from your notes** (the regression, `setKey` in `src/studio.js`). When you pick a key yourself (`from:'you'`: the `key` action or the Key menu) and the song had no set key, the parts now move from the key worked out from the notes (`keyStatus().key`), the nearest way, as a set-key move does. It is one undo step. The popover's Set still only relabels (`move:false`), and sung takes, Keys picks and vibe keys never move notes.
2. **The key chip follows piano-roll edits.** `edChanged` in `src/daw.js` now calls `renderKeyChip()` 150 ms after the last edit (debounced, so drags stay cheap). This was one small call in studio-ux-dev's file, as the brief allowed. Drawing, the transpose buttons and the arrow keys all go through `edChanged`.
3. (optional) With no key yet, the popover's button says **Close** instead of "Keep on auto" (`src/daw.js`).

Tested:
- **`bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 56 checks.** New smoke line 56:
  - A 12-note D minor hum ("D minor · from your humming"), then Keys' bass and chords: 27 notes outside C minor before, **0 after** the `key` action C minor. The hummed D4 lands on C4, and the chip says "C minor · set".
  - Undo brings back "D minor · from your humming" with D4 back in place.
  - Am–Dm–Em–Am played chords plus Keys' bass, then Key menu C minor: **0 outside C minor**, A3 lands on C4.
  - The popover's Set keeps the notes where they are.
  - Drawing Dm–B♭–F–C in the piano roll on an empty track: the chip goes from "no key yet" to "D minor · likely · or F major".
- **The tester's flow with the real hum path** (`humNote` ×12): melody, bass and chords had 11 notes outside C minor; after "put it in C minor" there were **0**. The popover now reads "Your notes sound like C minor". No page errors. `keyStatus()` takes 0.15–0.4 ms.

Known limits:
- **For the lead or assistant-dev:** the offline parser (`maker.js`) gives no action for "change the key to C minor" or "set the key to C minor". Its pattern needs "key C minor" or "in C minor". Main behaves the same, and the AI brain sends the `key` action anyway.
- The move only looks at the tonic, as the old set-key move did. D minor → F major moves the notes up 3 semitones, and so does D minor → F minor.
