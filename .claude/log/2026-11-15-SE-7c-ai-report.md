# SE-7c assistant report (assistant-dev, 15 Nov 2026)

Branch `preview-se-7bc`. Build mode, assistant part of 7c. Files: `src/actions.js`, `src/maker.js`, `src/assistant.js`, `cloudflare/worker.js` (prompt only), `index.html` rebuilt. Test scripts are in `.claude/work/se7c-ai/` (not shipped). No other files touched. `main` not touched.

## New and changed actions (all three places: Worker prompt, `ACT` in actions.js, maker.js phrases)
- **`analyse_song {track}`**: reports a song's key, tempo, how sure, the second guess with its reason (`key.why`), and the main loop's chords. It never changes the song. It ends with an offer, and only a "yes" changes anything.
  - Example reply: "E minor at 124, I'm fairly sure. It could be G major; the bass lands on E. The main loop goes Em · C · G · D. Set your song to E minor at 124 BPM?" The tempo is only offered when it differs and `bpmConf >= 0.15`.
  - If your key is already set: "Move your song to E minor?" If the song is already in that key: "That's your song's key already. Want those chords on your song?"
  - `track:"mine"`, or a project with no audio, answers about your own song from `keyStatus()`: "Your song sounds like F major at 120 BPM, I think. It could be D minor; the bass starts on F. The chords go F · C · Dm · B♭. Set it to F major?"
  - A clip with no `t.ana` yet (import hook not run, or an old song): Keys replies "Listening to “Night Drive”, one moment." It runs `analyseAudio` (Worker), caches `t.ana = anaCache(...)`, then says the result. One job per clip (`ANA_JOBS`).
  - Drums only or silence: an honest "no key in this clip".
- **`chords_from_audio {track, bars, to:"mine"|"song", bass}`**: calls `addSongChords(t, {bars, to, bass})`. The reply is `r.text` plus "I can write a new melody over these chords." If there are no chords, or no song in the project, it says so.
- **`set_chord {bar, chord, beat?, bars?}`**: calls `setChord`. The reply is `r.text` ("Bar 4 is now Bm; Bassline, Chords follow."). A bad bar gets "Your loop has 4 bars, so there's no bar 9." A chord it can't read gets an honest reply too.
- **`match_key {track}`**:
  - A notes loop you brought in: its notes move the nearest way (`keyShift`) from its detected key into the song's key. The song's key is worked out without the loop. Reply: "Moved “My loop” down 5 semitones, from G minor into your key, D minor."
  - An audio loop: an offer instead. "...I can't re-pitch audio yet without changing its speed, so shall I move your song to E minor instead?"
  - Generated parts and drums get honest replies.
- **`key`** gains:
  - `"key":"auto"`: unlocks the key, `setKey(null)`.
  - `"from":"song"`: labelled "from the song". Your parts move with it, as when you pick a key yourself. Internally it calls `setKey(k,'you')` and then relabels.
  - `"key":"song"`: the key heard in the newest analysed song.
  - After a yes, it chains the next offer: "Your song is in E minor now, the song's key. Want its chords on your song too?"
- **Offers and "yes"**:
  - `OFFER` (in actions.js) holds the actions that a "yes" runs, for 3 minutes. It is cleared by any other change, or by "no".
  - Offline: yes, sure, ok, do it, haan, haan ji, theek hai, kar do... run them. "no", "nahi" drop them ("OK, I left it as it is.").
  - The AI sees the offer as `offer: {keysAsked, ifUserSaysYes}`.
- **Replies**:
  - These actions set `BATCH.say`, which replaces the AI's reply, so Keys speaks what the app really heard and did.
  - The `key` action's chained offer uses `BATCH.reply`, which is used only when there is no AI reply.
  - `speak()` reads chord symbols as words: "Em · C/E · F♯7 · B♭maj7" is spoken "E minor, C over E, F sharp 7, B flat major 7". The bubble keeps the symbols.
- **AI context** (`projectState`):
  - `chords`: "Dm · F · Dm · Gm (Keys' own progression / taken from a song / fixed by the user)".
  - `heard` on each audio track: key with sureness, the second guess and why, DJ key, BPM and the main loop. Or "not listened to yet".
  - `offer`.
  - Own tracks carry `own:true`.
  - About 1 KB for a 5-track song.
- **Engine dev's two notes, done**:
  - `vary` chords calls `clearChords()` first when `PROJ.chords` is set. It says "New chord progression: … in place of the song's chords … Say undo to get them back."
  - `regenTrack` passes `heldChordStyle(t.inst, s)`. "Another one" on a strings chords part keeps its held pads (longest note 3.95 beats before and after).
- Small extra: offline "set the key to F minor" now works. Before, only "key of F minor" and "in F minor" did.

## Offline phrases (maker.js, `songTalk`)
- **"what key is this (song)"** and the like give `analyse_song`. Also: "what chords are in this song", "analyse this song", "what bpm is this track", "is gaane ki key kya hai", "chords kya hain", "what key is my song in" (= `mine`).
- **"put those chords on my song"** and the like give `chords_from_audio` plus play. Also: "take the chords from this song", "use the song's chords", "ye chords mere gaane mein daal do".
  - "... with the bassline too" adds `bass:true`.
  - "... in the song's key" gives `to:"song"`.
- **"make bar 4 B minor"** and the like give `set_chord`. Also: "bar 2 should be F#7", "change the chord in bar 3 to C/E", "make the fourth bar a minor", "make bar 4 beat 3 E", "make bars 1 and 2 F sharp 7", "bar 4 ko B minor kar do".
- **`match_key`**: "match this loop to my key", "put the loop in my key", "is loop ko meri key mein kar do", "match Night Drive to my key".
- **`key`**: "key back to auto" gives `key:"auto"`, and "use the song's key" gives `key:"song"`.
- **Not caught by mistake**: "add chords" (still `add_chords`), "what chords should I add next" (`add_chords`), "make bar 4 louder" (nothing), "make it 8 bars" (`bars`).

## How I tested
- `bash .claude/tools/check.sh` gave **CHECK OK**: SMOKE OK, 56 checks, plus bundle and Worker syntax. One earlier run had 2 load-sensitive failures; the rerun passed.
- `.claude/work/se7c-ai/se7c-ai.mjs` runs in headless Chrome against the built `index.html` and passes **27/27**. It renders a real E minor house song at 124 (2 loops of drums, then 8 full loops) and runs `analyseAudio` on it. It drives `ASSIST.run(text)`, which on `file://` means the offline parser, the actions and the reply.
  - **Fresh clip:** "Listening…", then about 1-2 s later the full answer (E minor at 124, the main loop Em · C · G · D). The key stays on auto.
  - **"yes" then "sure":** the first gives "E minor · from the song" at 124 BPM plus the chords offer; the second puts the chords on a new track.
  - **D minor song:**
    - "put those chords on my song" adds Chords 2 with Dm · B♭ · F · C, "moved down a tone". **One undo** restores every track.
    - "in the song's key with the bass too" keeps Em · C · G · D, and the D minor key you set stays.
  - **set_chord:** "make bar 4 B minor" gives chords ending in Bm, and the parts follow. Bar 9 gets an honest reply; "bars 1 and 2 F sharp 7" works.
  - **vary chords** clears the fixed chords.
  - **match_key:**
    - A G minor MIDI loop moves -5 into D minor, with 0 notes outside the key.
    - An audio loop gives the offer, then "haan" sets E minor from the song.
    - "key back to auto" unlocks.
  - Your own F major chords and bass, with no audio, give "Your song sounds like F major…".
  - The parser table passes 26/26, plus 5 checks with a song in.
  - The `sayChords` output and the AI context with an open offer are checked.
  - No page errors.
- No sound changed, so I made no render-level measurements. The Chords track comes from `addSongChords` (the engine report measured it at -29.0 dB RMS, the same as a normal Chords track).

## Llama prompt test: NOT DONE (blocked)
I called `/accounts/d9810812643ee32e2460689ca2ff73eb/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast` through the Cloudflare connector with the new prompt, a realistic state and 10 requests. Every call returned **HTTP 429: "you have used up your daily free allocation of 10,000 neurons"**.
- **Lead, important:** the live site's assistant is very likely in Basic mode until the quota resets (00:00 UTC). Workers AI errors fall back to the offline parser.
- I did not retry, and I changed nothing in Cloudflare. Upgrading is a paid plan and needs the owner.
- **To run it later:**
  1. In `.claude/work/se7c-ai/`, run `python3 llama-test-build.py > llama_code.js`. It reads the prompt from `cloudflare/worker.js` and the state from `state.json`.
  2. Paste the output as the `code` of `mcp__cloudflare__execute`.
  - The 10 requests: "keys what key is this song", "yes" (with an open offer and history), "put those chords on my song", "use the song's chords but keep the song's key, and the bass movement too", "make bar 4 B minor", "match this loop to my key", "bar 2 ko F sharp 7 kar do", "what key is my song in", "give me another chord progression", "copy the melody of this song too".
  - Expected: `analyse_song` with track Night Drive; the offer's actions; `chords_from_audio`; `chords_from_audio` with to "song" and bass true; `set_chord` 4 Bm; `match_key` with My loop; `set_chord` 2 F#7; `analyse_song` with mine; `vary` chords; `transcribe` to melody, or an honest offer of `add_melody`.

## Prompt text added (cloudflare/worker.js; no backticks, no `${`; module imports fine)
- **`key`:** "auto", `from:"song"` and `key:"song"`.
- **Four new action entries:** `analyse_song`, `chords_from_audio`, `set_chord`, `match_key`. Each gives its fields and when to use it. `analyse_song` adds: "the app speaks what it really heard (your reply is replaced)… Never guess a key or chords yourself." `chords_from_audio` carries the free pass and the "new melody over these chords" line.
- **Rules:**
  - KEY: answer about a dropped-in song with `analyse_song`; "heard" is in the state.
  - OFFERS: on yes (including Hinglish), send the offer's actions exactly; on no, send none.
  - CHORDS: what the state's `chords` means, and that vary replaces chords taken from a song.
- **Three examples:** "what key is this song" leads to `analyse_song`; "put those chords on my song" leads to `chords_from_audio` plus play; "bar 4 ko B minor kar do" leads to `set_chord`.
- The prompt grew from about 11.9 K to 15.5 K characters.
- **The Worker needs a deploy at release** (lead). Until then, on the test link, the live Worker doesn't know these actions. The offline parser still handles the phrases when the AI fails, but while the old prompt is live, the AI may answer "what key is this" by itself without `analyse_song`.

## For other developers / the lead
- **studio-ux-dev: `setKey` must move `PROJ.chords`.** Add `if(PROJ.chords) PROJ.chords=transposeChords(PROJ.chords,d);` where it moves the notes, as the engine report says. It was not on the branch when I last pulled. Without it, this happens:
  1. You put the chords on your song (D minor).
  2. You say yes to "Move your song to E minor?"
  3. The parts move, but the next chord fix or `followChords` puts them back in D minor.
- **studio-ux-dev, import hook:** if it analyses on import, it can reuse `anaThen(t, fn)` / `ANA_JOBS` (actions.js) or just set `t.ana`. My actions use `t.ana` when it is there and only start their own analysis when it is missing. If both run at once, the same clip is analysed twice (harmless, about 1 s extra).
- **Song card buttons** can call the same actions: `runActions([{type:'chords_from_audio', track:t.name}])`, and `runActions([{type:'key', key:keyName(t.ana.key), from:'song'}])` for "Set my key to E minor".
- **New globals** (actions.js): `OFFER`, `makeOffer`, `offerOpen`, `songTrack`, `trackAna`, `anaThen`, `withAna`, `keyWithout`, `anaReport`, `mineReport`. In maker.js: `songTalk`, `barChord`, `wantsSongChords`, `YES_RE`, `NO_RE`. In assistant.js: `sayChords`, `songChordsContext`, `anaContext`.

## Smoke lines for qa-tester (`tests/smoke.mjs`)
1. **"what key is this" on a hand-made cached `t.ana`** (E minor, 124, loop Em C G D) on an audio track:
   - The reply starts "E minor at 124" and ends with an offer.
   - `keyStatusText()` is unchanged.
   - Then "yes" gives `keyStatusText() === 'E minor · from the song'`.
2. **"put those chords on my song"** in a D minor song with that `t.ana`:
   - One new chords track, `chordsText(PROJ.chords) === 'Dm · B♭ · F · C'`, the reply says "moved down a tone".
   - One `undo()` restores the track list.
3. **"make bar 4 B minor"** on Keys' A minor drums, bass and chords:
   - The reply starts "Bar 4 is now Bm" and `chordsText()` ends with "Bm".
   - "bar 9 ko E kar do" in a 4-bar loop gives "no bar 9" and changes nothing.
4. **"match this loop to my key"**: a user notes track in G minor in a D minor song has 0 notes outside D minor afterwards.
5. **Parser:** `localBrain` gives the right actions for "is gaane ki key kya hai", "ye chords mere gaane mein daal do", "bar 4 ko B minor kar do", "key back to auto". It still gives `add_chords` for "add chords".

## Known limits
- No Llama run (quota), so how well the AI picks these actions is untested. The prompt follows the patterns that work for the other actions.
- With the AI, `analyse_song`, `chords_from_audio`, `set_chord` and `match_key` replace the AI's reply with the app's own text, so any next-step suggestion from the AI is lost there. Each text ends with its own suggestion or offer.
- `chords_from_audio` doesn't change the tempo; the "yes" to `analyse_song`'s offer does. In loop mode (the default), the chords land per bar whatever the tempo.
- "put the chords on my song", with "the" rather than "those" and no word for the song, stays `add_chords` offline (ambiguous).
- Audio can't be re-pitched (as designed), so `match_key` on audio only offers to move your song.
