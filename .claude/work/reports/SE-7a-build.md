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
