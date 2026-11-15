# SE-7c engine report (sound-engine-dev, 15 Nov 2026)

Branch `preview-se-7bc`. This is the engine part of 7c only. There is no UI, no import hook and no assistant actions. Files changed: `src/music.js` (the chord model; chordPlan and the generators follow it) and `src/analyse.js` (song analysis to song chords). `index.html` is rebuilt. No other files changed.

## What I built

### The data: `PROJ.chords`
`PROJ.chords = [{b, d, root, q, conf, from, bass?, alt?}]`
- `b` and `d` are in loop beats (b 0 = bar 1). The list is sorted with no overlaps.
- `root` is a pitch class 0-11. It is `null` when `q` is `'none'`.
- `q` is one of `maj | min | 7 | m7 | maj7 | sus4 | sus2 | dim | 5 | none`.
  - `sus2` and `dim` are new. I added them to `ANA_Q` so that "Bdim" and "Csus2" can be typed.
  - `none` means no chord: generated parts rest there.
- `from` is `'audio'` (heard in a song) or `'user'` (fixed by hand or by voice).
  - **Deviation from the brief:** there is a third value, `'keys'`. It marks Keys' own progression when it is written out the first time you fix one bar.
- `bass` (optional) is a pitch class under the chord: a slash chord such as "C/E", from "bass movement too". Bass, chords and melody all read it.
- `alt` (optional) is the analysis' second guess, `{root, q}`, for the fixer's "or Bm".
- It is saved with the song as a normal `PROJ` field (checked: serialize, reopen, undo/redo).
  - Old songs have no `PROJ.chords` and **behave exactly as today**.
  - Before and after outputs of `genBass`, `genChords` (plus pads) and `genMelody` are identical in 2016 of 2016 cases: every style × 3 keys × 4 progressions × with/without a melody × 3 seeds.
- If the chords cover fewer bars than the loop, they repeat.

### `chordPlan()`
`chordPlan(chords?)` follows `PROJ.chords` when it is present, including chords outside the key.
- Each plan entry gains `q`, `ninth`, `bass` and `none`.
- Two new methods:
  - `at(beat)`: the chord at a beat.
  - `segs(b, d)`: a note cut where the chord changes, as `[{b, d, c}]`.
- Chords can change on the half bar. Whole-bar hits, pads and bass notes are cut at the change, and each piece plays its own chord.
- Over a chord outside the key, the melody gets that chord's notes, and drops the scale notes a semitone away from them. Example: E major in A minor puts G♯ in and takes G out.

### Helpers (all global, in `music.js` unless noted)
- `chordPcs(root, q)` or `chordPcs({root, q})` → pitch classes, root first (`[]` for none). Example: `chordPcs(7,'7')` = `[7,11,2,5]`.
- `chordName(root, q)` or `chordName({root, q, bass})` → "Em", "G7", "Dsus4", "B5", "C/E", "N.C." (uses `anaChordName`).
- `parseChord(text | {root, q})` → `{root, q, bass?}` or `null`.
  - Reads: "Bm", "F#7", "Esus4", "B♭maj7", "Bbm", "Am/E", "C sharp minor", "B flat major", "A minor", "CM7", "Cm7", "D5", "Csus2", "Gdim", "Dm7b5" (as dim), "Emaj9" (as maj7), "Fadd9" (as F).
  - "N.C.", "none" and "no chord" give `{root:null, q:'none'}`.
  - "xyz" and "bar" give `null`.
- `keyShift(fromKey, toKey)` → semitones, the nearest way (-5..+6), through the relative mode.
- `fitChordsToKey(chords, fromKey, toKey)` → a moved copy (roots, bass notes and second guesses all move).
  - E minor to F major moves Em C to Dm B♭.
  - E minor to D minor moves Em C/E to Dm B♭/D.
- `transposeChords(chords, semitones)` → a moved copy.
- `chordBlocks()` → the song's chords as blocks over the whole loop. **This is the chord strip's data**, and it is a copy.
  - With `PROJ.chords`, they are repeated to the loop length.
  - Without them, Keys' progression is read from the parts as they sound now, one chord per bar, with `from:'keys'`. The bar's chord comes from the chords track Keys made, else from its bassline's root, else from `PROJ.prog`.
- `chordsText(list?, sep=' · ')` → "Em · C · G · D" (default: `chordBlocks()`). Use it in replies and the assistant's context.
- `chordSpanBars(list)` → the number of bars the chords cover.
- `chordFollowers()` → the bass, chords and melody tracks Keys made (`t.gen`). It never includes your own played or sung parts, or drums.
- `heldChordStyle(inst, style)` → `'pads'` for held sounds (pad, strings, choir, organ...), the same rule as `add_chords`.
- `followChords()` → remakes every follower on the current chords with **its own seed** (`t.seed`). The rhythm and feel stay; notes change only where the chords changed.
  - It returns the names of the parts that moved.
  - It does not save; the caller saves.

### Editing (one `saveProject` each, so one undo step)
- `setChord(bar, chord, {beat, bars})` → `{bar, chord, name, moved:[names], text}` or `null`.
  - `bar` is **1-based**. `chord` is "Bm", `{root, q}` or "N.C.".
  - `beat` (2-4) fixes only from that beat to the end of that chord in the bar.
  - `bars` (default 1) fixes several bars.
  - It returns `null` for a bar outside the loop or a chord it can't read.
  - If the song has no `PROJ.chords` yet, Keys' progression is written out first (`chordBlocks()`), so the other bars keep sounding the same.
  - Example `text`: "Bar 4 is now E; Bassline, Chords, Melody follow".
- `setChords(["Am","F","C","G"] | [{b, d, root, q}], from='user')` → replaces all the chords. Names go one per bar. Returns the names of the parts that moved, or `null`.
- `clearChords()` → goes back to Keys' own progression (`PROJ.prog`). The followers follow. Returns the names of the parts that moved.

### From a song (in `analyse.js`)
- `anaClipOffset(t, ana)` → the song beat where analysed beat 0 lands: `t.start + (ana.downbeat - t.trim) × ana.bpm / 60`.
- `anaSongChords(t, ana?)` → the analysed chords where they sit under the clip, in song beats, at the **current** tempo; blocks before the song's start are cut.
  - Use this for a strip drawn over the audio track, in sync with playback.
  - It changes nothing.
- `chordsFromAna(ana, {bars, to, at, track, bass, align, key})` → `PROJ.chords`-shaped array with `from:'audio'`. It is pure (changes nothing) and returns `[]` when there are no chords.
  - The song is assumed to be at the analysed tempo.
  - `at`:
    - `'loop'` is the default when the analysis has a main loop: the main 4- or 8-bar loop's chords, from bar 1. Full analysed chords are used, so 7ths and half-bar changes are kept.
    - `'clip'`: the chords as they sit under the clip from bar 1 of the song (uses `t.start` and `t.trim`). The offset is rounded to a quarter beat.
  - `bars`: the default is the loop's length for `'loop'` and `PROJ.bars` for `'clip'`. A shorter loop repeats; a longer one is cut.
  - `to`:
    - `'mine'` (the default) moves the chords into your song's key (`keyStatus().key`, or `key`) through the relative mode.
    - `'song'` keeps them as they are, and so does `'mine'` when your song has no key yet.
  - `bass: true` puts `ana.bassRoots` under the chords as slash chords. A chord is split at a bar line where the bass moves.
  - `align: true` (with `track`, at `'loop'`) starts the loop where the clip is in it, so the new chords line up with the clip in Song mode.
- **`addSongChords(track | id | null, {bars, to, at, bass, align, inst, seed, grow, ana})`** → `{chords, track, bass, key, songKey, shift, to, bars, moved, text}` or `null`. It does the whole "Put these chords on my song" in one undo step:
  1. It sets `PROJ.chords` from `chordsFromAna`. The default track is the newest audio track with chords in `t.ana`.
  2. If the result is `to:'song'`, it sets the key to the song's key (`setKey(k,'song',{move:false})`). It never replaces a key you set yourself (`from:'you'`).
  3. It grows a shorter loop to fit (4 to 8 bars) unless `grow:false`.
  4. The bass, chords and melody Keys made follow.
  5. It adds a new **"Chords"** track. This is our own voicing and rhythm (`genChords`) on the style's chord sound (`inst` overrides it), with the role's effects. It is never the song's audio. The track has `fromSong: <audio track id>`.
  6. With `bass:true` and no bassline Keys made, it adds a new **"Bassline"** on the song's bass notes. If there is one, it follows them.
  - Example `text`: "Chords from “Night Drive” on a new Chords track: Dm · F · C moved down a tone into your key, D minor".

## How I tested
All runs were in headless Chrome against the built `index.html`. Scripts are in `/tmp/claude-0/se7c/` and are not shipped.

**Old songs unchanged.** `baseline.mjs` dumped the generator outputs before any change and compared them after: **0 of 2016 cases differ**.

**End to end (`e2e.mjs`): 25/25 pass.**
- **Parsing and keys:**
  - `parseChord` and `chordName`: 23 inputs.
  - `chordPcs` and `fitChordsToKey` through the relative mode.
- **Hand-made analysis** (4 intro bars, then the loop Em C G D·B7 with bass E E B D):
  - loop into D minor: `Dm B♭ F C A7`;
  - `bars` 8 repeats the loop and `bars` 2 cuts it;
  - `bass:true` gives `Dm B♭/D F/A C A7/C`;
  - clip mode follows `t.start` and `t.trim`;
  - `align` starts the loop on G;
  - `anaSongChords` and `anaClipOffset` give the expected song beats;
  - no chords gives `[]`, and `addSongChords` returns `null`.
- **Real render:** our own E minor house song (2 bars of drums, then 8 loops, at 124) through `analyseAudio`.
  - The analysis gives E minor, 124 BPM and a 4-bar loop.
  - In a D minor song, `addSongChords` adds a Chords track with the chords moved down a tone. That is **one undo step**, and Undo restores the song exactly.
  - In a song with no key, it takes "E minor · from the song".
  - `bass:true` adds a new Bassline on the song's bass.
- **F major chords and bass played by the user (no melody), then "add a melody":** all notes are in F major, and the key reads F major.
- **`setChord(4,'E')` in A minor (outside the key):**
  - bar 4's chords play G♯;
  - the melody in bar 4 uses only E and G♯, with no G;
  - the bass plays E;
  - bars 1-3 of every generated part are unchanged;
  - your own hummed part and the drums are unchanged;
  - **one undo step**, and two Undos restore the song exactly.
- **`setChord` edge cases:**
  - `{beat:3}` splits the bar (0+4 4+2 6+2 ...);
  - bar 9 of a 4-bar loop gives `null`, and so does "blah".
- `PROJ.chords` survives save and reopen, and a new song has none.
- **Sound (full project: drums, bass, melody, plus song chords on darkpad):**
  - master peak **-0.54 dBFS**, RMS **-6.5 dB**, so no clipping;
  - on a 16-bar loop the song-chords track renders at **-29.0 dB RMS**, against **-29.1 dB** for a normal Chords track. Same generator, same `ROLE_MIX` and `roleFx`, so the levels match;
  - master peak -0.51 dBFS with both.
- **Speed** (16-bar loop with 5 followers): `setChord` **26 ms**, including the redraw; `addSongChords` with 32 chords **37 ms**. Both are under 50 ms, so they need no toast.

**Check:** `bash .claude/tools/check.sh` → PASS bundle syntax, PASS worker syntax, SMOKE OK: 56 checks, **CHECK OK**.

## Smoke lines for qa-tester (`tests/smoke.mjs`)
1. **F major chords plus bass, then a new melody:** add your own (non-generated) F-Bb-C-Dm chord and bass tracks, then `runActions([{type:'add_melody'}])`. Every melody note must be in F major. (7a covers part of this already; this version also checks it with `setChords(['F','Bb','C','Dm'])` set first.)
2. **`chordsFromAna` and `addSongChords` add a track:** use a hand-made `t.ana` like the one in `e2e.mjs` 2b, on an audio track, with the song key set to D minor. `addSongChords(t)` must:
   - return a result;
   - add 1 track with role `chords` and `gen`;
   - give `chordsText(PROJ.chords) === 'Dm · B♭ · F · C · A7'`;
   - give `shift === -2`.
3. **`setChord` is one undo step:** use Keys' A minor drums, bass, chords and melody, then wait 300 ms. `setChord(4,'E')` must:
   - return text starting "Bar 4 is now E";
   - change bar 4 of the chords track to include G♯ (pc 8);
   - leave the generated parts' bars 1-3 and your own parts unchanged;
   - push `UNDO.stack` by exactly 1;
   - restore every track's events on `undo()`, with `PROJ.chords` gone.
4. **`parseChord`:** "Bm", "F#7", "Am/E", "C sharp minor" and "N.C." give the names Bm, F♯7, Am/E, C♯m, N.C.; "xyz" gives `null`.

## What studio-ux-dev must call
- **Chord strip (over the loop):** draw `chordBlocks()`. Each block is `{b, d, root, q, conf, from, bass?, alt?}`.
  - The name is `chordName(block)`; its notes are `chordPcs(block)` mapped to `PC_NAMES`.
  - Fade by `conf` and dash when `conf < 0.5`. `from:'keys'` and `'user'` have conf 1.
- **Strip over an audio clip, in sync with playback:** use `anaSongChords(t)`.
- **Fixer:**
  - root keys plus major / minor / sus / 7 / none → `setChord(bar1Based, {root, q})`, or `setChord(bar, 'N.C.')`;
  - "or Bm" → `block.alt` through `chordName(block.alt)`;
  - "Hear it" → play `chordPcs(block)` voiced with `voice(pcs, 57)`;
  - after the call, re-render the strip. `setChord` already saves, calls `renderTracks()` and calls `uiLoop()`.
- **Song card "Put these chords on my song":**
  - `const r = addSongChords(t, {to: 'mine', bass: false}); if (r) toast(r.text);`
  - "Bass movement too" is `{bass: true}`.
  - Without the key-move option, use `{to: 'song'}`.
- **`setKey` (`studio.js`), one line needed:** where it moves notes by `d`, also move the chords:
  - add `if(PROJ.chords) PROJ.chords=transposeChords(PROJ.chords,d);`;
  - with `{move:false}`, do nothing.
  - Without it, the next `setChord` or `followChords` would put the parts back in the old key.
- **The import hook** is as in the 7b report: `t.ana = anaCached(t, buf) || anaCache(await analyseAudio(buf, ...), buf)`.

## What assistant-dev must call
- **`analyse_song {track}`:** read `t.ana`. Give the key with `keyName(ana.key)`, `ana.key.why` and `ana.bpm`; the chords as `chordsText(chordsFromAna(ana,{to:'song'}))` (the main loop).
- **`chords_from_audio {track, bars, to:"mine"|"song", bass}`:** `addSongChords(trackOrId, {bars, to, bass})`. Reply with `r.text`, plus Keys' copyright line: "I can write a new melody over these chords".
- **`set_chord {bar, chord:"Bm", beat?}`:** `setChord(bar, chord, {beat})`. It returns `null` when the bar or the chord is bad, so say so. Reply with `r.text`.
- **Context for the AI:** send `chords: chordsText()` and `PROJ.chords ? 'from the song / fixed' : 'Keys progression'`.
- **`vary` on chords** (`actions.js`, "new chord progression"): when `PROJ.chords` is set, call `clearChords()` before `ensureProg(true)`. Otherwise the new `PROJ.prog` is ignored and the reply claims a change that didn't happen. An alternative is to ask first: "Your chords are from the song; replace them?"
- **`regenTrack`, a small existing bug:** it remakes a chords track without `csOver`, so a pad, strings or choir chords part loses its held pads on "another one". Pass `heldChordStyle(t.inst, s)` as the 4th argument of `genChords`; `followChords` already does.
- **Offline phrases** (`maker.js`): "make bar 4 B minor" → `{type:'set_chord', bar:4, chord:'Bm'}`. `parseChord` reads "B minor", "b flat major" and "F#7" directly.

## Known limits
- `chordsFromAna` assumes the song is at the analysed tempo. Clip mode at another tempo gives chords that drift from the audio; `anaSongChords` uses the real tempo instead.
- Clip mode often lands on a drums-only intro: the chords are all N.C. and `addSongChords` returns `null`. That is why `'loop'` is the default. The UI could offer "line the clip up" (set `t.trim` to the loop start: `ana.downbeat + ana.loop.start*4*60/ana.bpm`).
- Only `track.events` (pattern A) follow the chords. Song-section variants (`track.patterns.B…`) keep their notes.
- Writing out Keys' progression on the first `setChord` freezes it: after that, chords no longer bend towards a melody you play. That is intended (you fixed the chords), but say it in the fixer's hint.
- **What the analysis heard in my test render:** I deliberately rendered C as C/E (an E bass under C). The analysis read that bar as part of a two-bar Em, so the loop came back as Em G D. That limit is the 7b analysis's, not 7c's.
- The 'keys' value of `from` is an addition to the brief's 'audio' | 'user'.

Commits: WIP and final on `origin/preview-se-7bc`. `main` was not touched.
