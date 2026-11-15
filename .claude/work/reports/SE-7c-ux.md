# SE-7c studio report (studio-ux-dev, 15 Nov 2026)

Branch `preview-se-7bc`, commits `8125fdd` and `cb11b5d`. I built the desktop parts. Phones get a plain, usable fallback; the bottom sheet and the swipe strip wait for UX-4.

## What I built

**Files:** `src/edit.js`, `src/daw.js`, `src/body.html`, `src/head.html`, `src/studio.js` (the `setKey` change only). `index.html` is rebuilt. I did not touch any engine, assistant or test files.

1. **Listening on import** (`edit.js`)
   - When an audio file of 6 s or more is imported, the clip goes on its track first. 0.4 s later, `listenToSong(t)` starts in the background, so the import never waits for it.
   - A progress toast shows "Listening to night-drive… 40%". At the end the toast reads "night-drive: E minor · 124 BPM. Its key and chords are on the track."
   - The result is cached on the track as `t.ana` (`anaCached` || `anaCache(await analyseAudio(...))`) and saved with the song.
   - **Storing `t.ana` is not an undo step.** It patches `UNDO.last` and saves without a snapshot. If an undo goes back to a state without it, `ANA_MEM` puts it back, so Undo never "forgets" a song.
   - `listenToSong(t, {again, quiet})` returns a Promise of the analysis. A second call during a listen gets the same promise, and a listen that `actions.js` already started (`ANA_JOBS`) is reused.
   - An audio track with no analysis yet (a voice note, or a song imported before 7b) gets a **♪ Find key** link. Tapping it listens on demand.

2. **Song card** (`daw.js` `songCardHTML`). It sits under any analysed audio track.
   - Example: "**E minor** · fairly sure · or G major · DJ key 9A · 124 BPM (or 62)".
     - Clips with no key say "No key in this clip".
     - If `bpmConf` < 0.15 it adds "tempo unsure".
   - Below that come the reason (`key.why`, e.g. "the loop starts on E minor") and "CHORDS · 4-BAR LOOP Em · C · G · D".
   - It also says what will happen to them, for example "On your song they go in your key, D minor (down a tone): Dm · B♭ · F · C", "They fit your key" or "Your song has no key yet, so it takes the song's key".
   - **Buttons:**
     - **Put these chords on my song** calls `addSongChords(t, {to:'mine', bass})` and shows `r.text` as a toast.
     - **Bass movement too** is a toggle (`aria-pressed`).
     - **Set my key to E minor** changes to "Your key is E minor ✓" once it is set.
     - **Use 124 BPM** has "or 62" next to it when there is a `bpmAlt`.
     - **Hide** closes the card. The track's **♪ Key & chords** link brings it back.
   - Nothing changes until you tap. Each tap is exactly one undo step.
   - **Set my key** uses `setKey(songKey, 'song', {shift})`, with the shift from `keyShift` (the relative mode). The chip then reads "E minor · from the song". Your parts and `PROJ.chords` move the nearest way (for example "your parts moved up a tone to fit"). G major parts stay where they are when the song is in E minor.

3. **Chord strip** (`body.html` `#chordLane`, `daw.js` `renderChordLane`)
   - It is a lane above the tracks, lined up with the clips: one block per chord from `chordBlocks()`, showing the name and its notes ("Em / E G B").
   - **How a block looks:**
     - Its colour strength follows `conf`.
     - It is dashed and gets "?" when `conf` < 0.5.
     - "N.C." blocks are dashed and say "rest".
     - Bars you fixed get a mint border.
   - **The current chord lights up** in sync with playback (`chordLaneTick` in the playhead loop; it touches the DOM only when the chord changes). The playhead now runs through the strip too.
   - The corner says where the chords came from: "Keys' chords", "from “night-drive”" or "· fixed". There is also a **↺ Use Keys' chords** link (`clearChords()`, one undo step) for when the song has its own chords.
   - **When it shows:** only when there is something to show (`PROJ.chords`, or bass/chords/melody parts that Keys made). It is hidden in Song mode (see limits).
   - **On an audio clip, the song's own chords** are drawn as small labels along the top of the waveform, where they really sound (`anaSongChords(t)`, at the current tempo). Unsure ones are faded and get "?".

4. **Chord fixer popover** (opens when you click a block)
   - Header: "Bar 2 · B♭", its notes, and the source ("heard in the song, sure", "fixed by you", "Keys' chord").
   - Controls:
     - 12 root keys;
     - Major | Minor | Sus | 7 | None;
     - a live preview ("Bm · B D F♯");
     - **▶ Hear it**;
     - **Use Bm**;
     - **or B♭m** (the second guess, `block.alt`);
     - an **Or type one** box, which reads anything `parseChord` reads: "F#7", "B♭/D", "N.C.".
   - Picking a root or a type plays the chord when the song is stopped.
   - Applying uses `setChord(bar, chord, {bars})` for whole-bar blocks and `{beat}` for blocks that start mid-bar. Any other span (for example the first half of a bar) goes through `setChords` with only that block replaced. That keeps the second chord in a half-bar split. Each fix is one undo step.
   - The first fix shows the engine dev's hint: the chords then stay as they are, and stop bending towards melodies you play.
   - **Keyboard:**
     - Tab reaches the strip; ←/→, Home and End move between chords (roving tabindex).
     - Enter opens the fixer. Esc closes it and puts focus back on the block.
     - After a fix, focus returns to the same block.
   - Labels and states: the blocks have spoken labels ("Bar 2: B flat major"), the fixer is a dialog, and the toggles have `aria-pressed`.

5. **`setKey` (`studio.js`)**
   - Where it moves notes by `d`, it now also does `if(PROJ.chords) PROJ.chords=transposeChords(PROJ.chords,d)`.
   - A new `{shift: n}` option moves the parts by exactly n semitones; the song card uses it.
   - With `{move:false}`, nothing moves, as before.

**Phones (390/360):**
- The strip goes full width and scrolls sideways inside itself when bars get narrower than 46 px.
- The fixer becomes a fixed sheet at the bottom, with 44 px targets.
- The card's buttons wrap.
- The page never scrolls sideways.

## How I tested
I imported a real 62 s WAV in headless Chrome against the built `index.html` (my own render: E minor house at 124, 8 drum bars and then Em C G D) through the real file input. Scripts are in my scratchpad (`ux.mjs`, `ux2.mjs`) and are not shipped. **29 of 29 checks pass:**
- **Import**
  - The clip is on the track in 0.6-4.5 s (decoding).
  - Listening is done 2-8 s after the drop. The range depends on the box's load; `analyseAudio` alone takes 1.1 s.
  - 7-11 progress toasts, then the summary.
- **Card** reads "E minor · fairly sure · or G major · DJ key 9A · 124 BPM" and "Em · C · G · D" (4-bar loop).
- **D minor Keys song + Put these chords**
  - adds a new Chords track;
  - the strip reads "Dm B♭ F C" from “night-drive”;
  - Bassline and Melody follow;
  - exactly 1 undo step.
- **Playing:** the lit block matches the playhead's chord.
- **Fixer**
  - bar 2 → Bm: 1 undo step, the popover closes, focus is back on the block;
  - → then Enter opens bar 3, typing "F#7" then Enter fixes it;
  - two undos bring back Dm · B♭ · F · C exactly.
- **Key menu** D minor → E minor moves `PROJ.chords` to Em · C · G · D, and Undo restores it.
- **Use 124 BPM:** tempo is 124, 1 undo step.
- **Set my key to E minor:** "E minor · from the song", parts and chords up a tone, the buttons show ✓.
- **Hide, ♪ Key & chords, ↺ Use Keys' chords** all work. Undo of the import removes the track, and Redo brings it back with its analysis.
- **Song alone** (no other parts, 16 bars): there is a card but no strip. After Put with Bass movement too, there is a Chords track plus a Bassline, and the song's key reads "from the song".
- **Song mode** hides the strip, and Loop mode shows it again.
- **Save, new song, reopen:** `t.ana`, the card and the strip all come back.
- **Speed:**
  - fixing a chord on a 16-bar song with 3 followers takes 15-25 ms;
  - `renderTracks` takes 5 ms;
  - `drawRolls` takes 2 ms with the overlay.
- **Phone widths:** no page side-scroll at 390 and 360 in all three themes. No page errors.
- **Main thread while listening:** the Worker path leaves **one task of about 90-120 ms**, with the progress toast showing. It is inside the engine (resample or hand-off), not the UI. The many long tasks right after page load come from sample loading, not from listening.
- **`bash .claude/tools/check.sh`:** PASS bundle syntax, PASS worker syntax, SMOKE OK 56 checks, **CHECK OK**.
  - One earlier run had a load-sensitive flake on the velocity-lane drag. A plain smoke rerun once failed on the two save/reopen checks the brief warns about.
  - The reruns passed.

**Screenshots** in `/home/claude/shots/se-7c/`:
- `01-song-card-desktop.png`
- `02-strip-playing-desktop.png` (lit chord and playhead)
- `03-fixer-desktop.png`
- `04-after-key-desktop.png`
- `05-fixer-phone-390.png`
- `06-card-phone-390.png`
- `07-song-alone-16bars-desktop.png` (the song's chords on the waveform, Bass movement too)
- `t-<theme>-<1400|390|360>.png` for Emerald, Velvet and Sapphire

## Smoke lines for qa-tester
1. **Import listens.** Put a ≥ 6 s WAV on `#importFile` (`uploadFile`), then wait for `t.ana`. Check:
   - a toast matched `/Listening to .+ \d+%/`;
   - `.songcard` exists and shows `keyName(t.ana.key)`;
   - `UNDO.stack` did not grow from the listening.
2. **Song card → strip.** In a D minor Keys song (drums, bass, melody), click `[data-scput]`. Check:
   - a new track with role `chords` and `fromSong`;
   - `#chordLane` is visible;
   - the `#chordStrip .cb` names equal `chordBlocks().map(chordName)`;
   - `UNDO.stack` grew by 1.
3. **Fixer.** Click `#chordStrip [data-cb="1"]`, then `[data-croot="11"]`, `[data-cq="min"]` and `[data-capply]`. Check that `chordName(chordBlocks()[1]) === 'Bm'`, that it was 1 undo step, and that `undo()` restores the previous chords.
4. **setKey moves the chords.** With `PROJ.chords` Dm · B♭ · F · C, `setKey({tonic:4,mode:'minor'},'you')` must give `chordsText(PROJ.chords)` starting with "Em".

## Try steps for the owner (desktop)
1. Open the test link, ask Keys for a beat with a bassline (or make anything), and set the key to D minor.
2. Drop one of your songs (an MP3 or WAV) onto the tracks. It plays straight away. A toast says "Listening to <song>… 40%", and a card appears under the song: its key, how sure it is, a second guess, the DJ key and the BPM, plus its chords.
3. Tap **Use 124 BPM** if the tempos differ, then **Put these chords on my song**. A Chords track appears in your key, and a Chords strip appears above the tracks. Press Play: the current chord lights up as it plays.
4. Click any chord in the strip. Pick another root or type (or the "or Bm" guess), press **▶ Hear it**, then **Use Bm**. Your bass, chords and melody follow. Ctrl+Z undoes it.
5. Optional: tap **Set my key to E minor** on the card. Your parts move to the song's key and the chip says "from the song".

## Known limits and notes for others
- **Song mode** hides the strip, because the chords are the loop's and every section repeats them. A song-length strip would need a design.
- **Lining the song up.** The song's chords go on your loop from bar 1, while the audio clip still starts with its intro. If the intro isn't a whole number of loops, the audio and the new chords clash when both play.
  - The waveform labels show where the song's chords really are.
  - A "line the song up" button (`t.trim` to the loop start, per the engine report) would fix it. It was not in the approved design, so I didn't add it.
- Chords that are fixed change only that bar of the loop, even when `PROJ.chords` was a shorter loop repeating (the engine writes the full loop out). This is the same as `setChord`.
- **For assistant-dev:**
  - `actions.js` `listen` (the `ANA_JOBS` path) saves `tt.ana` with `saveProject()`, which makes an undo step. Switching it to `listenToSong(t)` (a Promise of the analysis, no undo step, shares the toast and the card's "Listening…" state) would avoid that and stop a second listen of the same clip.
  - `listenToSong` already reuses a running `ANA_JOBS` job.
- Imports shorter than 6 s are not analysed automatically (the engine returns no key or tempo for them anyway); **♪ Find key** still works on them.
- **Phones:** the bottom sheet and the swipe strip from the proposal wait for UX-4, as briefed. What ships now is the plain fallback described above.

## Fix 1 (15 Nov 2026, after the tester's first check of 4afe858)
**What changed** (`src/head.html` CSS, `src/daw.js` 2 lines, `index.html` rebuilt)
- **Playhead over the song card (1400 px).** A track's song card and its FX panel now sit above the playhead, so the line runs over the lanes and disappears behind the card (`.trk>.songcard,.trk>.tfx{position:relative;z-index:3}`, both have solid backgrounds).
  - A muted (faded) track used to fade as a whole, which made its own layer, and the line still showed through the card. When a track has a card or FX panel open, it now fades its parts instead, and the card and panel fade their contents, so they look the same but still hide the line.
- **Toast over the phone fixer (390 px).** While the chord fixer sheet is open on a phone (600 px or less), messages show at the top of the screen instead of the bottom, so they never cover "Use …" or "Or type one". `chordPopOpen` toggles `body.cp-open`, and every open or close path goes through it (click, Escape, click outside, apply, strip hidden). When the sheet closes, the next message is back at the bottom. Desktop is unchanged: there the fixer is a popover under the strip, away from the bottom-right toast.

**How I tested**
- Headless Chrome against the built `index.html`, with `night-drive.wav` imported through `#importFile`, then "Put these chords", Play, and the fixer opened right after a toast. Ran at 1400, 390 and 360 px in Emerald, Velvet and Sapphire (9 runs).
  - Fixer: in all 9 runs the toast was showing and did not overlap the sheet, "Use …" or "Or type one". At 390 and 360 px the toast is at y 12-78 and the sheet starts at y 444; before the fix the toast was at y 760-826, over "Or type one". After Escape the sheet is closed and the toast is back at the bottom (y 760). The page never scrolls sideways (scrollWidth equals width). No page errors.
  - Playhead: checked by screenshot (the line has `pointer-events:none`, so hit tests can't see it). It stops at the card's top edge and starts again below it, in all themes. With the track muted and its FX panel open, the card is fully opaque (computed opacity 1, contents 0.5) and the line is hidden behind both the card and the panel.
- `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK: 64 checks** (load average 6-9).
  - My first version used `body:has(#chordPop:not([hidden]))`. With it, the save/reopen and undo-after-open checks failed twice in a row while load was 10-14. The base commit 4afe858 passed those two checks on the same box (it failed "sing the bassline" instead, another load-sensitive check).
  - A whole-page `:has()` gets rechecked on every DOM change, so I switched to the `cp-open` class. The full check then passed. I can't prove the `:has()` caused it, since load was also lower, but the class is the cheaper choice either way.
- Screenshots: `/home/claude/shots/se-7c/fix1-playing-<theme>-<1400|390|360>.png`, `fix1-fixer-<theme>-<1400|390|360>.png` and `fix1-edge-muted-fx-<1400|390>.png`. Before shots: `before-playing-emerald-1400.png` and `before-fixer-emerald-390.png`.

**Known limits**
- At phone widths the lane sits under the track's name row, so the playhead still crosses the name rows (and the Copy and Delete row) of tracks below the chord strip. This was already the case and is outside this fix. The card itself is clear. Covering it would need the playhead drawn per lane.
- The playhead still has `box-shadow:0 0 8px var(--signal)`, a soft glow, which the standards' "no glows" rule doesn't allow. I left it as it is (not in the brief). It's a one-word change if the lead wants it.
- The "Chords 2" doubling in the tester's report is not part of this fix.
