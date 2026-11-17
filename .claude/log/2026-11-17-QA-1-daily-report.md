# QA-1 daily session · 17 Nov 2026 · `main` @ f665d11 (product code unchanged since the 14 Nov release)

**Verdict: main is healthy. check.sh passes (47 smoke checks, about 2 min on a quiet machine), and there were no page errors in 20 session runs. The paths the brief asked for turned up 3 medium bugs and 2 low ones. None of them is in the 13-16 Nov reports, the board's follow-ups or a waiting branch.**
- Medium: the pitch wheel and mod wheel bend and wobble the whole song (drums and bass too), not just what you play.
- Medium: importing a MIDI file that is longer than the song silently keeps only the first bars (16 of 64 notes).
- Medium: if you move or shorten a looped section while it plays, playback leaves the loop, runs to the end of the song and stops.
- Low: both MP3s start 25 ms late (encoder delay), so they don't sit on the grid and the "1 loop" MP3 doesn't loop cleanly.
- Low: the Sound Lab turns pure silence into a "Lead synth" and loads it on your keys, which then make no sound.

**Held up well:** the long session (8 tracks, a 96-bar song, 3 minutes of play), with flat memory, no late notes and no timing drift. Song-section editing with a real mouse, A/B patterns, the whole-song MP3 (no clicks at the 16-bar render joins), 30 fast Play/Stop presses, switching the instrument on a playing part through all 52 sounds, knob sweeps while playing, sustain and notes held across Stop or Rec, the Sound Lab with save and reopen, and 390 px.

**Note for the lead:** a voice note with no quiet stretch (legato humming, or a trimmed memo) gives zero notes on main ("I couldn't hear clear notes"). The same humming with 1 s of quiet before and after gives all 8 notes. preview-ux-10's new gate fixes it: I built it and checked, and all 8 notes came back for both files. So I didn't file it. Worth a smoke check with a legato fixture when UX-10 ships.

## check.sh
```
PASS bundle syntax · PASS worker syntax · … (47 smoke checks, all PASS)
PASS song: whole-song MP3 of the Short layout, drums (decodes back, no clipping) · 33.02 s, peak -0.44 dBFS, RMS -6.6 dB, 21 s to make
PASS no page errors
SMOKE OK: 47 checks
CHECK OK   (about 2 min, quiet machine)
```
Full log: /tmp/qa/2026-11-17/check.log

## Bugs (ranked)

1. **The pitch wheel and mod wheel bend the whole song, drums included** · controller/engine · MEDIUM
   - Steps:
     1. Make any beat with a bassline and press Play.
     2. Without pressing a key, push the controller's pitch wheel up (or move the mod wheel).
   - Happens:
     - The playing bassline goes from 110.0 Hz to 123.5 Hz (+200 cents, measured on the output with no keys pressed).
     - Mod wheel at 127 makes the song's bass wobble between 108.4 and 112.8 Hz.
     - All 152 drum voices scheduled in 2 s were wired to the wheels, so kicks and hats detune too.
   - Should: the wheels only change the notes you play on the keys, as in any DAW. A producer touching the wheel while jamming over the beat detunes the whole beat.
   - Cause: `Voice.src()` in src/core.js connects every voice made in the live AudioContext to `A.bend` and `A.vibGain`, including the song's scheduled notes (`scheduleEvent` in src/studio.js). Fix idea: wire the wheels only for voices started by `noteOn` (src/play.js).
   - Owner: sound-engine-dev (core.js), with studio-ux-dev for play.js. No preview branch touches this.

2. **Importing a MIDI file longer than the song silently drops most of it** · studio · MEDIUM
   - Steps:
     1. New song → "drums like Ben Böhmer" (4 bars, 122 BPM).
     2. Import (file picker or drag-in) a 16-bar MIDI file (melody 64 notes + drums 96 notes; mine: /tmp/qa/2026-11-17/fx/long16.mid).
   - Happens: the toast says "Imported 2 MIDI tracks from long16.mid", but Melody has **16 of 64 notes** and Drums **24 of 96**. The song stays 4 bars, and nothing says three quarters were cut (screenshot d2-01-midi-cut.png).
   - Audio import does warn ("Only the first 16 bars play; add bars to hear more"). MIDI cuts the notes for good: `importFile` (src/edit.js) filters `e.b<L` and trims lengths, so adding bars afterwards doesn't bring them back.
   - Should: grow the song to fit (or offer to), or at least keep the notes and say "only the first 4 bars play". Into an empty song it works (16 bars, 100 BPM taken from the file).
   - Owner: studio-ux-dev. Not changed on any preview branch.

3. **Moving or shortening a looped section while it plays makes playback leave the loop and stop at the end** · studio (Song view) · MEDIUM
   - Steps A:
     1. Full track → double-click Drop 2's block to loop it (it plays).
     2. Drag Drop 2 to the start of the song.
   - Happens: the loop brace moves with Drop 2 (now bars 1-16), but the playhead carries on at bar 96 in "Drop 3". It plays the rest of the song and stops at the end. The loop label still says Drop 2.
   - Short layout, looping the Outro, then moving the Outro to the start: beats 51 → 64, then **stopped** 8 s later.
   - Steps B: loop the Drop (8 bars) → while it's in its second half, right-click → Shorter (or drag its edge to 4 bars).
   - Happens: the playhead is now past the loop's new end. It plays the Outro and stops instead of going back to the Drop's start.
   - Should: playback stays in the looped section (jump to its start, or follow it).
   - Cause: `songTick` (src/song.js) wraps only when the playhead crosses the loop end from inside (`b0<lr[1]&&b1>lr[1]`), so a playhead already past the end never wraps.
   - Owner: studio-ux-dev. preview-ai-1 and preview-ux-7 don't touch this.

4. **Both MP3s start 25 ms late, and the "1 loop" MP3 isn't loop-length** · studio (export) · LOW
   - Steps: Download MP3 with "1 loop" (or a Song-mode MP3) → decode it → line it up with the app's own render.
   - Happens:
     - Cross-correlation puts the decoded MP3 **1105 samples (25.1 ms) behind** the render, in both the loop MP3 and the song MP3 (correlation 0.995 and 0.996).
     - The 4-bar loop at 124 BPM should be 7.742 s; the MP3 is 7.784 s.
   - Dropped into a DAW at 124 BPM, the kick sits 25 ms after the grid, and a looped "1 loop" MP3 gets a gap or flam at every repeat.
   - Cause: lamejs adds the encoder delay and padding, and the files carry no gapless (LAME) info that tells players to trim them.
   - Should: trim the delay (encode with the 1105-sample offset and pad the end), or write the gapless header.
   - Owner: studio-ux-dev (`makeMp3` / `makeSongMp3` in src/studio.js). SE-9 adds latency compensation for its ceiling only, not this.

5. **The Sound Lab makes an instrument out of silence and puts it on your keys** · engine · LOW
   - Steps: Sound Lab → load a silent file (3 s of silence) → Extract → Add as sampler.
   - Happens: "Done in 0.3 s. No clean sustained note found, so the loudest part was used". The result is titled "Lead synth from 'silence'", Root "Not detected · mapped to C4", Noise content "High · 1.00". Add → toast "'Lead synth · silence' is on your rack", **and it's loaded on the keys, which now play nothing** (screenshot i03-lab-silent.png).
   - Should: "That part is silent, pick a section with sound", with Add disabled. A 0.1 s file is handled ("Select at least half a second.").
   - Owner: sound-engine-dev (src/lab.js `extract` / `addCustom`).

## Rough edges (not filed)
- **First visit on a laptop (1366x768):** the first screen is the controller. The Keys box is at y = 974, below the fold, on a page 5,852 px tall, so a newcomer sees a MIDI keyboard and "Sound off · click to start" before the assistant. Typing "make me a chill beat" worked first time (Downtempo, 95 BPM, sound started on that keypress), and Play played. See idea 2.
- The sampler and the synth made from the same Sound Lab slice both get the name "Lead synth · Demo loop", so the rack shows two identical names.
- Song-mode "Export for Ableton (.zip)" exports only the 4-bar loop. The button's tooltip says so, but nothing exports the arrangement as WAV or stems (idea 1).
- Whole-song MP3 of a 126-bar, 4-track song: 396 s on a quiet 2-core machine (1.6× the song's length). The status moves every 16 bars ("bar 17 of 126" for about 60 s). This is the known follow-up, with today's numbers.
- Basic mode: "add an arp" did nothing (no reply line), while choir, strings and flute each added a track.
- Known and skipped: Delete right after double-clicking a part deleted the section again (Drop 2 gone, 7 → 6 sections). That's the 14 Nov bug, covered by UX-7. A new song keeps the last tempo (follow-ups).

## Ideas (max 3; not in HQ requests)
1. **Export the whole arrangement for Ableton**: stems and MIDI of the song as laid out, not just the loop. Why: in Song mode the zip gives one 4-bar loop and the MP3 is the only whole-song audio. Producers who finish in Ableton want the arrangement's stems, each starting at bar 1.
2. **On a computer, the first visit starts at Keys.** Scroll to Keys or put a one-line "Tell Keys what you want" with 3 starter chips above the controller. Why: the product is talking to Keys, but a first-time laptop user lands on a keyboard and a "Sound off" pill, and the Keys box is a full screen below.
3. **Tempo-match a dropped audio loop.** Detect its BPM and offer "fit to 124 BPM" or "set the song to 128". Why: producers drag loops and voice memos in all the time. Today they play at their own speed and get cut at the song's length, so a 128 BPM loop drifts against a 124 BPM beat.

## What I checked (with numbers)

**1. Song mode, real mouse (Bodzin drums, bass, chords, melody → Full track, 96 bars)**
- Drag Break to the end: "Moved Break". Ctrl+Z undoes it. Drag Break to the start: works.
- Resize Drop by its edge: +8 → 24 bars. Alt+drag → 23 (1-bar steps). Dragging far left → 1 bar (minimum). Undo restores 16.
- Alt+drag Drop after Break → "Copied Drop to Drop 3 · 23 bars". Click Intro + Ctrl+D → "Intro 2". Delete key → gone. Right-click → Delete Outro → Undo brings it back (126 bars).
- A/B: Make unique for Drop 2 → "Pattern B plays only in Drop 2". Editing B (48 → 44) leaves A at 48. Clicking A puts Drop 2 back on A; clicking B puts it on B again.
- Play from a section: double-click a section body loops it (beat 378.98 from start 376). Ruler clicks at bars 1/17/49/81 start at beats 1.3/65.4/193.4/321.3. Zoomed and scrolled: bar 39 as expected.
- Deleting the section that's playing: playback carries on in the next section, no stuck notes (LIVE 0 after Stop). Loop brace: bug 3.

**2. Whole-song MP3 (126 bars with 23-bar sections, pattern B in Drop 2)**
- "QA Export Song 124bpm song.mp3": 245.92 s = 243.87 s layout + 2 s tail + MP3 delay. 192 kbps, 44.1 kHz stereo, 5.6 MB.
- -8.6 LUFS integrated, LRA 9.0 LU (Break), peak -0.48 dBFS, RMS -7.4 dB.
- No silence inside (silencedetect -60 dB / 0.3 s found none). The last audio is at 245.70 s, after the 1.5 s fade.
- **Clicks at joins:** high-frequency spikes in a 60 ms window at each 16-bar render join (bars 17, 33, 49, 65, 81, 97, 113) were 6.5-13.9 dB over the window's median. Ordinary downbeats measured 4.1-14.8 dB. The RMS just before and after each join is continuous. Section joins (bars 56, 79, 95, 111) look the same: no clicks. PASS.
- Start offset: bug 4.

**3. Imports (file picker and synthetic drag-and-drop on the Studio)**
- Dragging shows the drop highlight (`playlist drop`). Picker and drag give identical results, and dropping 2 files adds both.
- Into an empty song, a 16-bar MIDI at 100 BPM → 16 bars, 100 BPM, Melody 64 + Drums 96. Into a 4-bar song: bug 2.
- Type-0 MIDI with a tempo change imports its 16 notes.
- Bad files:
  - empty.mid → "empty.mid has no notes".
  - corrupt.mid → "Couldn't read corrupt.mid: Offset is outside the bounds of the DataView". It works, but it's a raw JS message.
  - A text file named .mp3 → "Couldn't open notaudio.mp3. Try WAV, MP3…".
- A 0.15 s WAV into an empty song → a 1-bar song. A 72 s WAV after it → "Only the first 1 bars play" (grammar: "1 bars").
- 8-bit 8 kHz and silent WAVs import fine. Turn into notes on silence → "I couldn't hear clear notes in that recording." PASS.
- Legato voice notes: see the note for the lead.

**4. Sounds while playing (Böhmer loop, 4 parts)**
- Switching the melody through all 52 instruments in 14.5 s while it plays: 0 errors, 0 long tasks, at most 34 live voices. Each switch is one undo step.
- Switching keys sounds with 2-5 while holding a MIDI chord: 0 stuck notes after release. LIVE 0 after Stop.
- Knob sweeps over 1.5 s while playing (Drive, Cutoff, DJ filter both ways, Echo, Reverb, Gate, Chorus): the click metric (2nd-difference energy, max over median) during a sweep was 17.9-33.9 dB, against 23.8-32.8 dB with the knob still. No zipper noise above the music's own level.
- 30 Play/Stop clicks at 80-480 ms → stopped cleanly, LIVE 0. The next 8 s of play scheduled 247 events with 0 doubles.

**5. Long session (8 tracks: drums, bass, chords, melody, choir, strings, flute + sing.wav; 96-bar song; 2 min + 60 s of play)**
- Heap after GC 89.4 MB before → 90.5 MB after 3 min. 60 fps throughout, 0 long tasks.
- 3,719 events scheduled, 0 late (the closest was 19 ms ahead). Audio-callback gaps: 0 over 3× the buffer (max 62.6 ms).
- Song position vs elapsed time: a steady 0.12-beat start offset at every sample from 10 to 120 s. No drift, and the audio clock and UI clock stay within 5 ms.
- Up to 66 voices live in the Drop. Playing 16 keys over the busy Drop cut 0 song notes.
- Opening the editor while playing took 12 ms, zooming 30 ms.

**6. Keyboard and controller (fake MIDI "QA Keys 49")**
- Sustain: pedal down, play, release keys → 2 notes held. Stop with the pedal down keeps them; pedal up releases them (LIVE 0).
- A key held across Stop keeps sounding and stays lit until you let go (correct).
- A key held when you stop Rec is saved as C5@0.94, 0.81 beats long.
- Velocity curves (vel 20/64/127): soft 0.33/0.66/1, linear 0.16/0.5/1, hard 0.05/0.33/1, fixed 0.8.
- Hold A, press X (octave up), release A → no stuck note. X ×10 stops at C7. A transpose change while a note is held → no stuck note.
- Wheels: bug 1.

**7. Sound Lab**
- Demo loop → Lead synth: D5 587.2 Hz, saw, A 5 ms / D 40 ms / S 52% / R 250 ms, sustain loop found, done in 1.0 s.
- Add as synth and Add as sampler both work. The melody switched to the sampler while playing renders at -5.0 dBFS peak.
- After a full Chrome restart, "QA Lab Song" reopens with the custom sampler still on the melody (renders -5.0 dBFS).
- Silence: bug 5.

**8. First visit (empty storage, 1366x768) and 390 px**
- First load: 0.74 s, 4 long tasks of 60-116 ms (the demo loop render). Play is disabled on an empty song. Rec starts a count-in.
- 390 px: no sideways scroll (scrollWidth 390) on the first view, Song view with a 23-bar Drop and the Sound Lab. The keyboard scrolls inside its own box.
- At 390 px the Keys box is at y = 2066 (UX-4 territory, not filed).

**Console:** 0 page errors in all session scripts. Only the blocked Google Fonts request (sandbox) showed.

## Could not test
Live AI (Workers AI/Claude), real speech recognition and spoken replies, Spotify, real MIDI hardware (stubbed), real phones, real audio-device underruns (headless has no playout stats, so I used callback gaps as a stand-in), and listening by ear.

## Files
- Screenshots: /tmp/qa/2026-11-17/shots/
  - a01-first-view, a02-after-first-request, a03-playing, a04-a07 (Lab, Sounds, Sing, Effects)
  - b01-make-menu, b02-full-track, b03-sec-menu, b04-after-edits, b05-editor-B, b06-loop-drop2, b07-deleted-while-playing, b2-01-after-move, b2-02-zoomed
  - c01-mp3-done, d01-midi-16bars, d02/d2-01-midi-cut (bug 2), d03-d06 (audio imports, Lab silent)
  - e01-after-switching, f01-after-rec, f02-wheels, g01-8-tracks-song, g02-playing-2min
  - h01-h04 (390 px), i01-lab-result, i02-open-list, i03-lab-silent (bug 5)
- Exports: /tmp/qa/2026-11-17/dl/ (QA Export Song 124bpm song.mp3, loop1.mp3, loop2.mp3, short-song.mp3)
- Test files I made: /tmp/qa/2026-11-17/fx/ (long16.mid, type0_tempo.mid, empty.mid, corrupt.mid, short/silent/lofi8k/long70/legato/breaths/legato_pad.wav)
- Scripts: /tmp/qa/2026-11-17/js/ (lib.mjs, a-first, a2-boot, b-song, b2-loopmove, c-export, c2-joins, d-import, d2-import, d3-legato, d3b-ux10, e-sounds, e2-startstop, f-ctrl, g-long, g2-steal, h-phone, i-lab, j-mp3off, j2-xcorr). Log: /tmp/qa/2026-11-17/session.log
- I built preview-ux-10 in a temporary worktree (/tmp/qa/2026-11-17/wt-ux10) to check legato humming, then removed it. Nothing was committed or pushed.
