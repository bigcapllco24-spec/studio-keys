# QA-1 daily session · 14 Nov 2026 · `main` @ cf0b16e (Song view UX-1 50b6315)

**Verdict: main is solid and check.sh passes (32 checks with one new one). The Song view mostly works like a producer expects: layouts, parts on/off, pattern B, play from a bar, loop brace, singing in Song mode, Undo/Redo, save/reopen and the whole-song MP3/MIDI were all correct. 1 high bug: after you double-click a part to edit its notes, Delete deletes the whole section (Ctrl+D duplicates it) instead of the notes. 2 low ones.** No page errors in any run. The console only showed the blocked Google Fonts request (sandbox) and Chrome's ScriptProcessorNode deprecation warning.

**Note for the lead:** typing or saying "make it a song" does nothing today. The reply is "I couldn't turn that into a change. Try "add a trap beat at 140"…". No song action exists in the Worker prompt, `actions.js` or `maker.js`. That matches the UX-1 report ("no assistant actions added, AI-1 isn't approved yet"), so I didn't file it as a bug. But the brief says "button or say it", so don't tell the owner it works by voice until AI-1 ships. Offline, "play the drop" and "play from bar 33" just press Play from where you are, and "loop the break", "make the intro longer" and "switch to song mode" do nothing. All of these are AI-1 scope.

## check.sh
```
PASS bundle syntax
PASS worker syntax
PASS drums like Ben Böhmer at 124 · 172 hits, kitMelodic
PASS "another one" makes a different groove
PASS track like Stephan Bodzin (drums, bass, chords, melody) · drums:kitDeepTechno:124 bass:rollbass:48 chords:darkpad:20 melody:mhpluck:64
PASS note editor copy/paste and undo · 20→23→20
PASS MP3 download (4 loops, decodes back) · 727 KB, 31.0 s
PASS track FX: panel, add effect, assistant reverb, sidechain preset
PASS select two tracks and play them together · 2 audible
PASS "add a choir" / "add a melody" make new tracks · Choir, Choir 2, Melody 2
PASS "make a track like…" starts with drums only · ["vibe"]
PASS plays the song
PASS import MIDI + audio, turn audio into a bassline
PASS while singing, only the drums play
PASS sing the bassline → bass track · 9 notes
PASS a sung part doesn't add your raw voice as an extra track
PASS your voice isn't played back live while you sing, and the mic turns off after
PASS humming isn't mistaken for talking
PASS save and reopen a song · Smoke sing 3
PASS song: an old song opens as one "Main" section … (13 Song view checks, all PASS)
PASS no page errors
SMOKE OK: 31 checks
CHECK OK   (86 s, run alongside my first session script)
```
Added one check (commit 809d713 on main, `tests/smoke.mjs` only, not pushed): `PASS song: MIDI only exports the whole song, pattern B where it plays · {"bars":96,"song":96,"last":383.87,"beats":384,"b40":true}`. The smoke test now has 32 checks and runs in 72 s on its own.

## Bugs (ranked)

1. **Song view: keys pressed after double-clicking a part act on the section, not the notes** · studio · HIGH
   - Steps: ask Keys for drums, a bassline and chords → Make it a song ▾ → Full track → double-click the Chords block in the Drop (the note editor opens on it) → Ctrl+A (all 20 notes highlight) → Delete.
   - Happens: the **Drop section is deleted**. The song goes from 96 to 80 bars and the chip says "Deleted Drop · Undo". The notes are untouched and still shown as selected, so it looks as if nothing happened (screenshot 18).
   - The same thing happens with Backspace, and with Delete when no notes are selected: double-click Drums in Build, press Delete, and Build is removed.
   - Ctrl+A then Ctrl+D duplicates the section ("Break 2") instead of the notes.
   - Undo brings it back.
   - Should: while the editor is open, Delete removes the selected notes and Ctrl+D duplicates them, as in Loop mode.
   - Suspect: the `#playlist` keydown handler in `src/song.js`, around line 432. Focus stays on the `.part` after the double-click (`document.activeElement` = "part on"), and a section is selected, so `songRemove(sel)` / `songDuplicate(sel)` run.
   - Fix idea: move focus to the editor when the double-click opens it, or skip Delete/Backspace/Ctrl+D in that handler while `ED.tid` is set and focus is on a `.part`.
   - Clicking inside the editor first avoids the bug, because that blurs the song area. Not fixed on any waiting branch (no `song.js` keydown changes in ux-2/4/5/6). Owner: studio-ux-dev.

2. **Song mode: "another one" never changes a section's own pattern B, and the reply doesn't say which sections changed** · assistant · LOW
   - Steps: Full track → double-click Drums in Drop 2 → Make unique for Drop 2 (B) → select Drop 2 → type "another one".
   - Happens: pattern A (Intro, Build, Drop, Outro) gets a new groove. Pattern B, the one you're looping and listening to, is unchanged. The reply ("Drums: four-to-the-floor kick…") names no section.
   - Should: change the selected section's pattern, or say "new drums in Intro, Build, Drop and Outro; Drop 2 keeps its own pattern".
   - Likely AI-1 scope: the `vary` / `add_drums` actions in `src/actions.js` write only `t.events`. The lead can fold it into AI-1.

3. **Song mode: the reply for a part added to one section doesn't say where it plays; the MIDI-import toast names only one of two tracks** · assistant/studio · LOW
   - Steps: Full track → click the Break to select it → type "add a melody".
   - Happens: the reply (spoken) says "Melody (new track) on Melodic Pluck…". The melody plays only in the Break, and only a toast 0.9 s later says so. Someone talking to Keys then plays the Drop and hears no melody.
   - Also: with the Drop selected, importing `test.mid` adds Lead and Kick (both only in the Drop), but the toast names only "Kick".
   - Should: the reply says "plays in the Break", and the toast names every new track.
   - This is not UX-5: UX-5 is about the sung take's toast; this is the assistant's spoken reply.
   - Suspect: the reply text in `src/actions.js`; the toast in `songSync` (`src/song.js`) is reset on each save, so only the last new track is named.

Not filed (known, cosmetic, or by design):
- The Play button does nothing on a fresh assistant-built song, in Song mode too. This is the known UX-2 bug; UX-2's `syncLoopState` fixes both modes.
- Two basslines after singing in Song mode (UX-3). No "plays in Drop" toast after a sung take (UX-5). Velocity lane below the fold, still there in the Song-mode editor (UX-2). 11 px sideways scroll at 390 px (UX-2/UX-4).
- After reopening a song whose Drop was looped, Play starts at bar 1 and only loops once it reaches the Drop. Choosing Loop from the menu starts inside the section, as expected.
- "Short" or "Just the loop" chosen on an edited 124-bar song replaces the layout without asking. The chip's Undo restores it exactly (checked), so this is fine.
- The new empty song after a reload keeps the previous song's tempo (123).
- The section ⋯ buttons are 21x23 px at 1024 px in headless Chrome. The 44 px size only applies under `pointer: coarse`, so a real iPad should get 44 px (I didn't check on a device).
- Track colours (green drums, blue chords) stay the same in the Velvet and Sapphire themes. This is the existing per-track palette, not new.
- The fallback reply suggests "add a trap beat at 140" even when the song's vibe is Ben Böhmer.

## Ideas (max 3)
1. **"Make it a song" builds energy.** Intro and Outro start filtered and a little quieter, the Build gets a riser, filter sweep and snare roll, each Drop opens with a crash or impact, and the music filters down into the Break. Why: on my Full track export, Intro (-7.1 dB), Build (-6.8 dB) and Drop (-6.9 dB RMS) are equally loud, so the arrangement sounds flat until the Break, and melodic house lives on builds and drops. `SONG_HOOKS` and `transitionEvents` are already in place.
2. **An "Extended mix" layout.** 32-bar drums-only intro and outro, about 6-7 minutes at 124. Why: melodic house is released and DJed as extended mixes, and DJs need beat-only ends to mix in and out.
3. **"Duplicate as a variation" when you Alt+drag or Duplicate a Drop.** The copy gets its own pattern B with a fresh groove or fill. Why: producers never repeat a drop exactly. Today you have to Make unique and edit by hand, and "another one" never touches B (bug 2).

## Could not test
Live AI (Workers AI or Claude), real speech recognition and wake word, spoken replies, Spotify login, real MIDI hardware (stubbed), real touch devices (I emulated phone and tablet sizes and used a touch tap on the phone map), and MP3 render speed on a real laptop.

## What I checked (with numbers)

### Part 1: beat by reference (typed into the assistant box, offline parser)
- "124 bpm drums like Ben Böhmer": 1 Drums track, Melodic House Kit, 124 BPM, vibe Ben Böhmer, 176 hits.
- "another one" ×2: a different groove each time (hit-set similarity 0.35 / 0.35 / 0.32). Kit, tempo and vibe kept; still one drums track.
- "add a bassline" added 1 track (Sub Bass, F minor) and "add chords" added 1 (Deep Pad). One element at a time, with the next step suggested.
- Make it a song ▾ offers Short (16 bars · 0:31), Full track (96 bars · 3:06) and Just the loop (4 bars · 0:08). Full track gives "Intro [drums-clap-snare, chords] | Build [all] | Drop [all] | Break [chords] | Drop 2 [all] | Outro [drums, chords]" in Song mode.

### Part 2: Song view with a real mouse (Full track, 1400x1100)
- **Parts:** clicking Bassline in the Intro switched it on, with the chip "Bassline on in Intro · Undo". Clicking Drums in the Break switched it on.
- **Pattern B:** a real double-click on Bassline in Drop 2 opened the editor: "Pattern for Drop 2 · A · + New · Pattern A plays in Intro, Build, Drop, Drop 2… · Make unique for Drop 2".
  - Make unique gave B ("Pattern B plays only in Drop 2").
  - A note drawn in B: B 16→17 notes, A stayed at 16. The block shows a "B" badge. PASS.
- **Play from a bar:** clicking the ruler at bar 33 → readout "33 . 3 Drop", beat 131 after 1.5 s. PASS.
- **Loop brace:** right-clicking the Break gives Rename / Duplicate / Longer / Shorter / Split / Loop this section / Delete.
  - Loop this section plays the Break: beats 195.6→214.2 over 10 s (2.07 beats per second = 124 BPM).
  - Ruler click at bar 63 while looping: beats 250, 252, 254, then 192.2 (wraps).
  - Ruler click at bar 9, outside the brace: plays on from bar 9. PASS.
- **Loop/Song switch while playing:** Song → Loop keeps playing the 4-bar loop; Loop → Song continues at the Drop (33 . 4). Space in the song area plays and stops. PASS.
- **Section edits:** + Section adds "Section 8 bars". Dragging Intro's right edge made it 16→20 bars. Alt+drag of the Drop to the end made "Drop 3". PASS.
- **×2 pattern length in Song mode:** the pattern goes 4→8 bars and the song stays 124 bars. PASS.
- **Adding a part in Song mode:** "add a melody" with a section selected puts the melody only in that section, and a toast follows 0.9 s later. With nothing selected, it plays in every section. PASS, except bug 3.
- **Undo/Redo:** Undo ×5 walked back the melody, the B note, Make unique, the Break drums and the Intro bass, to the plain Full track. The 6th Undo undid Make it a song (back to the 4-bar loop in Loop mode). Redo ×12 landed exactly on the final state (deep compare). PASS.

### Part 3: singing in Song mode (fake mic, Drop selected)
- During the take: Loop mode, state 'take', only Drums audible, mic on.
- After the take: back in Song mode and playing, mic off, 0 live voice notes. "Sung bassline" has 10 notes, all in F minor (G#2, C3, G2, C2, F2), and plays only in the Drop. No audio track was added.
- One Undo removes it and Redo brings it back. PASS.

### Part 4: save and reopen with sections (persistent profile, Chrome closed and reopened)
- The song: Drop 2 renamed Climax, bass pattern B with 17 notes, Outro shortened to 8 bars, drums on in the Break, Drop looped, 123 BPM. Save → "Saved 3:52 AM".
- Reload, and also a full Chrome restart: a new empty "Untitled song" opens (0 tracks, Loop mode).
- Open song… lists "QA Reopen Song · 123 BPM · 88 bars · 2:52 · 3 tracks". Opening it restored the layout, A/B note counts, BPM, Song mode and the Drop loop identically, and Play works. PASS.

### Part 5: editing in Song mode
- In pattern B: box-select (Select tool) 5 notes, drag +1 beat, Ctrl+C / Ctrl+V (B 20→25). Pattern A untouched. Ctrl+Z ×2 returned exactly; Ctrl+Shift+Z ×2 went forward again. PASS.
- The per-track FX panel opens in Song mode with the bass preset: high-pass 28 Hz, low-pass 4.2 kHz, comp 40%, drive 18%, sidechain 75%. PASS.
- Keyboard right after a double-click: bug 1.

### Part 6: imports in Song mode (Drop selected)
- `sing.wav` became an audio track "sing" (4.6 s) that plays only in the Drop. Its audio segments start at beats 128, 144, 160 and 176.
- `test.mid` added Lead (8 notes) and Kick (8 notes).
- "Turn into notes… → Bassline" made "sing → bassline" (6 notes), muted the audio, opened the editor, and the new part plays only in the Drop. PASS.

### Part 7: whole-song export (Full track with Drop 2 made 24 bars: 104 bars, 3:21 at 124, 4 parts)
- **MIDI only:** "QA Song Full 124bpm song 104bars.mid", 39.7 KB, 124 BPM, track end at bar 104.00.
  - Drums: 3,560 notes. Bassline: first note at bar 17.1 (it starts in the Build), last note ends at bar 88 (the end of Drop 2).
  - Melody: first note at bar 33 (the Drop).
  - All match the layout. PASS.
- **Download MP3:** "QA Song Full 124bpm song.mp3", 4.7 MB, 192 kbps, 44.1 kHz stereo. It decodes to 203.34 s = the 201.29 s layout + a 2.05 s tail; the status said "3 min 23 s". It took 356 s headless, with other Chrome sessions running.
  - Peak -0.44 dBFS, 0 clipped samples, overall RMS -7.7 dB, no silence inside the layout (longest gap 0.00 s).
  - Section RMS: Intro -7.1, Build -6.8, Drop -6.9, Break -21.6, Drop 2 -7.0, Outro -7.2 dB.
  - The 16-bar render joins are seamless (-7.3→-7.1, -7.0→-7.0, -7.1→-7.0, -7.4→-7.4 dB). PASS.

### Part 8: themes and sizes (Song view)
- **Desktop 1400:** Emerald, Velvet and Sapphire all switch cleanly. No overflow (scrollWidth 1400).
- **Tablet 1024x768:** no overflow. Parts 86x66 px. The strip shows ⋯ buttons (21x23 px with a fine pointer; see notes).
- **Phone 390x844:** the song map shows 6 blocks (73x58 and 151x58 px). Tapping the Drop loops it and plays (beat 130.4). There is still 11 px of sideways scroll (known).

### Console
0 page errors across 11 session scripts. The only messages were the blocked Google Fonts request (`ERR_TUNNEL_CONNECTION_FAILED`, sandbox) and the ScriptProcessorNode deprecation warning.

## Smoke checks to add once bug 1 is fixed (not added now: they would fail check.sh and block releases)
```js
// Delete right after double-clicking a part edits the notes, never deletes the section
const dk = await E(() => { songTemplate('club'); const s = songFind('drop'), t = PROJ.tracks.find(t => t.role === 'chords'); const el = document.querySelector(`.part[data-sid="${s.id}"][data-tid="${t.id}"]`); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await p.mouse.move(dk.x, dk.y); await p.mouse.down(); await p.mouse.up(); await W(80); await p.mouse.down({ clickCount: 2 }); await p.mouse.up({ clickCount: 2 }); await W(500);
await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control'); await p.keyboard.press('Delete'); await W(300);
const dr = await E(() => { const r = { secs: songSections().length, n: edTrack() ? edTrack().events.length : -1 }; undo(); closeEditor(); return r; });
ok('song: Delete in the editor after a double-click deletes notes, not the section', dr.secs === 6 && dr.n === 0, JSON.stringify(dr));
```

## Files
- bugs.json and ideas.json for HQ: /tmp/qa/2026-11-14/bugs.json, /tmp/qa/2026-11-14/ideas.json
- Screenshots: /tmp/qa/2026-11-14/shots/. Key ones:
  - 18-dblclick-then-delete.png (bug 1: "Deleted Drop", notes still selected)
  - 05-song-full.png, 05c-song-crop.png (Full track)
  - 07-editor-drop2.png (pattern row)
  - 11-loop-brace.png
  - 13-sing-in-song-mode.png, 14-after-sing-song.png
  - 17-reopened-song.png
  - 22-imports-song.png
  - 24-song-desk-emerald.png, 24-song-desk-velvet.png, 24-song-desk-sapphire.png, 24-song-tablet-emerald.png
  - 25-phone-map-tap.png
- Exports: /tmp/qa/2026-11-14/dl/ (whole-song MP3 and MIDI)
- Session scripts: /tmp/qa/2026-11-14/js/ (lib.mjs, p1-p11.mjs, midlen.py); check.sh log: /tmp/qa/2026-11-14/check.log
