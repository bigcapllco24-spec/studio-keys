# UX-1 · Song view: lay out a whole track like Ableton (design proposal)
studio-ux-dev · Design mode · 13 Nov 2026 · size L

## 1. Why
Today a song is one loop of 1 to 16 bars that repeats forever. Real tracks have an intro, a build, a drop, a break and an outro. This adds a **Song** view: coloured sections across the top, and for each track you choose which sections it plays in. Press Play in Song mode and you hear the whole 3-minute track from start to end. You can then download it as one MP3.

## 2. Flow (what the user clicks, sees and hears)
1. **Open a song.** Old songs open the way they do today. The transport has a new **Loop | Song** switch, set to Loop. Loop still repeats the loop, so nothing changes until you switch.
2. **Switch to Song.** The track lanes become a timeline. A song made before this change shows a single section, called "Main", that is as long as the loop, with every track switched on. A button in the strip says **Make it a song**.
3. **Make it a song**, by clicking or by saying "Keys, make it a full track". Six sections appear: Intro, Build, Drop, Break, Drop 2 and Outro, 16 bars each. That's 96 bars, about 3:06 at 124 BPM, shown as "96 bars · 3:06". Tracks switch on by role, following the research template. The Intro has drums and pad. The Build adds bass and chords. The Drops play everything. The Break drops the drums and the bass. The Outro keeps drums and chords. The new parts flash once and an **Undo** chip appears.
4. **Shape it.**
   - Click a part (one track in one section) to switch it on or off. Each part shows a small picture of its notes.
   - Drag a section to move it, and everything in it moves too. Drag its right edge to make it longer or shorter, in steps of 4 bars (hold Alt for 1 bar).
   - Alt-drag a section, or press Ctrl/Cmd+D, to duplicate it. Double-click its name to rename it.
   - Right-click a section, or tap **⋯** on a tablet, for Rename, Duplicate, Longer (+8), Shorter (−8), Split in half, Loop this section, Type (Intro, Build, Drop, Break, Outro, Verse, Chorus) and Delete.
   - **+ Add** at the end adds an 8-bar section.
5. **Change one section only.** Double-click a part to open the note editor on its pattern. A line in the editor says where that pattern plays: "Pattern A plays in Build, Drop, Drop 2: editing A changes all of them". Click **Make unique for this section** and that section gets its own copy, pattern B, which you can edit without touching the others. The A / B / + New buttons in the editor header switch which pattern a section uses. A part that doesn't use pattern A shows a small letter badge.
6. **Listen.** Press Play (or Space) in Song mode and the playhead runs through the sections. The view scrolls with it (Follow), and stops following while you scroll by hand. The position readout says "37 . 1 · Drop · bar 5 of 16". Click the ruler to play from that bar. Double-click a section, or press Ctrl/Cmd+L, to loop it; a loop brace appears over it on the ruler. The song stops at the end, unless a loop is set.
7. **Jam in Loop mode.** In Loop mode, clicking a section plays that section's parts as a short loop. The switch to the new section happens at the end of the current loop, so you can jump between Intro, Drop and Break live, a bit like launching scenes in Ableton. Recording, overdubs and sung parts work in Loop mode as they do today. They go into the patterns of the selected section.
8. **Ask Keys.** For example: "make the intro 32 bars", "drop the drums in the outro", "add a second drop", "loop the break". The parts and sections that changed flash, and the chip reads, for example, "Keys · Drums and bass out in the Break · Undo". Each request is one undo step. The voice part is designed in AI-1.
9. **Download.** In Song mode, **Download MP3** renders the whole song as laid out, with no length menu. It shows progress ("Making the MP3… bar 40 of 96") and the page keeps working while it renders. **MIDI only** exports the whole song as well.
10. **Zoom.** Use + and −, Ctrl/Cmd+scroll, pinch on a tablet, or **Fit** (W) to see the whole song. Scroll sideways to move along the timeline. On a phone you get a song map only: coloured section blocks you tap to loop. Editing parts needs a tablet or a computer.

## 3. Screens
- `.claude/work/mockups/UX-1-1.png`: desktop at 1280, Song mode while playing the Drop. The section strip, the ruler, six track lanes with part previews and A/B badges. Keys just took drums and bass out of the Break: those parts flash and the Undo chip shows in the toolbar.
- `.claude/work/mockups/UX-1-2.png`: desktop editing. The right-click menu on Drop 2, with a loop brace over Drop 2. Below it, the note editor on the Bassline's pattern B, with the line "Pattern B plays only in Drop 2 · Pattern A plays in Build, Drop" and the **Make unique** button.
- `.claude/work/mockups/UX-1-3.png`: tablet at 1024 (landscape), with larger parts and **⋯** buttons on the sections. An inset shows the phone song map.
- All three were also checked in Sapphire and Emerald (scratch copies, not committed). Section colours come only from `--accent`, `--signal` and `--t4` mixes, so each theme recolours them.

## 4. What changes

### Data model (shared with AI-1; changes to the shared draft are marked ⚑)
```
PROJ.sections = [{ id:'s3', name:'Drop', kind:'drop', bars:16, end:null,          // end = {to:'snareroll', bars:2}
                   parts:{ <trackId>: { on:true, variant:'A', without:['kick'] } } }]
track.events                  // = pattern A (unchanged, so every generator, the editor and the AI keep working)
track.patterns = { B:{ events:[...] }, C:{...} }   // extra variations, only when "Make unique" / "+ New" is used
```
- ⚑ **`variant` is a letter per track.** 'A' always means `track.events`. Patterns are not global ids. This keeps all of today's code (generators, `addTrack(..., {replaceRole})`, the editor, imports, sung takes) writing pattern A without changes.
- ⚑ **`kind`** (intro, build, drop, break, verse, chorus, bridge, hook, outro or other) is an added field. AI-1 asked for it under this name, and the name avoids a clash with `track.role`. It drives the colour and is the hook for the sound engine. If it's missing, it is taken from the name ("Drop 2" gives drop).
- ⚑ **`end = {to, bars}`** (to: snareroll, kickdrop, fill, crash, riser, filter or none; AI-1's field) is drawn as a small mark at the end of the section. Drum transitions use the notes from AI-1's `transitionEvents(section, drumsTrack)`. `songFlat` merges them into the drums track, so playback and export both play them. Risers and filters need SE later.
- ⚑ **`parts[tid].without`** (AI-1's field: drum pieces muted in that section while the pattern stays linked, for example `['kick']`): `songFlat` leaves those pieces out, and the part shows a small "no kick" label. It costs almost nothing to support.
- ⚑ **A missing `parts[trackId]` means off.** A new track is switched on in the selected section only. If the song has one section, that is the same as today. The toast says "Chords play in Drop. Click empty parts to add them elsewhere." AI-1 sets parts explicitly whenever it adds a track to an arranged song.
- `bars` is a whole number from 1 to 64. The UI snaps to 4. The pattern length (today's "Length", 1-16 bars, `PROJ.bars`) is unchanged and is labelled "Pattern" in Song mode. A pattern repeats inside a section; if the section length isn't a multiple of the pattern length, the last repeat is cut.
- ⚑ **View state is kept out of the song data**, so it isn't undoable and doesn't create save churn: Loop/Song mode, selected section, loop brace, zoom, scroll and Follow. It's stored per song in `store` (`songView:<id>`). AI-1 changes it through `songMode()` and `songLoop()`.
- **Migration** (`migrateSong(p)`, run in boot, `loadNamed` and `applyState`): no `sections` gives `[{id:'s1', name:'Main', kind:'other', bars:PROJ.bars, parts: every track on with variant 'A'}]`. Old songs play exactly as before.
- **Song size stays small.** Sections only point at patterns, so a 192-bar song stores the same notes as a 4-bar loop. Undo snapshots (`JSON.stringify(PROJ)`, up to 120) don't grow with song length.

### Files and functions
- **New `src/song.js`** (studio-ux-dev; the lead adds it to `PARTS` in `tools/build.py` after `studio.js`, before `daw.js`). It holds the model and API, and both the UI and AI-1 use it:
  - `songSections()`, `migrateSong(p)`, `songFind(ref)` (finds "drop 2", "second drop", "the break" = the last break, "intro"), `songSummary()` (one line for the AI context: `Intro 16 [drums,pad] | Build 16 [+bass,chords] | …`).
  - Edits (each goes through `saveProject`): `songAdd({name,kind,bars,at,copyOf})`, `songRemove(id)`, `songMove(id,index)`, `songResize(id,bars)`, `songDuplicate(id)`, `songRename(id,name)`, `songSplit(id)`, `songSetPart(sid,tid,{on,variant})`, `songTemplate('short'|'club'|[{name,kind,bars}])` (assigns parts by track role from the RES-2 table), `songMakeUnique(sid,tid)`.
  - View: `songMode('loop'|'song')`, `songLoop(sid|{from,to}|null)`, `songSelect(sid)`.
  - Feedback: `songFlash(changes, text)` flashes parts and sections and shows the Undo chip. `runActions` in `actions.js` calls `songFlashDiff(before)` after a batch, so AI-1 gets the flash for free.
  - Timeline: `songFlat(track)` returns a cached, sorted list of every note on the song timeline (song beat, length, note, velocity). The cache is rebuilt after each `saveProject` (about 1,500 notes per drum track for 96 bars, well under 1 ms). `songAt(beat)` returns `{section, index, barInSection, barsLeft}`, used by the position readout and by SE later.
- **`src/studio.js`:**
  - `tick()`: in Song mode, the scheduler takes notes from `songFlat` for the window [b0, b1) with a binary search. At the loop brace it splits the window in two, the same way it wraps the loop today. It stops at the song end plus a 2-second tail.
  - In Loop mode, the loop length stays `PROJ.bars*4`, but the scheduler plays the selected section's parts and variants. A section switch waits for the next loop boundary.
  - `loopPlay(fromBeat)` starts from a position. `uiLoop` shows the Loop/Song state.
  - Audio tracks (voice notes) work as parts too. A clip starts at the section start and repeats every pattern length, as in today's loop.
  - Recording and takes keep running in Loop mode. Capture maps the time to the selected section's pattern. In Song mode, Rec switches to Loop on the selected section and shows a toast.
  - `removeTrack` and `duplicateTrack` clean up or copy the `parts` entries. `addTrack` switches the new track on in the selected section.
- **Export (`studio.js`):** in Song mode, `makeMp3` renders in **16-bar chunks**. Each chunk includes the notes that start in the 4 seconds before it, so reverb, echo and long notes carry over the joins. Each chunk is encoded to MP3 right away and only 16-bit audio plus one peak value is kept, about 33 MB for 3 minutes. The old way would keep all the float audio: about 65 MB for 3 minutes, or 127 MB for 6. Gain is applied while encoding, so it can't clip. `buildMidi` takes the flattened song.
- **`src/daw.js`:** `renderTracks` and `drawRolls` have a Song-mode layout. One horizontal scroller holds a sticky track-header column, the section strip (DOM buttons), the ruler canvas with the loop brace, and lanes of part blocks (DOM buttons with `aria-pressed`). Each part's preview is one small pattern picture, drawn once per pattern change in the track colour from `TC`, repeated with CSS. That keeps redraws cheap and draws only what's visible. Also in `daw.js`: the playhead and Follow, zoom (px per bar, W fits), drag to move or resize, Alt-drag to copy, menus, and a long-press menu on tablets. The editor works on `ED.pat` (the pattern letter): the A / B / + New buttons, the "plays in" line and **Make unique**.
- **Keyboard (`daw.js`):** shortcuts only work while the song area has focus. You click into it, and it shows an outline. This matters because today letters, digits and Z/X play notes and pick sounds. Shortcuts: Space play/stop · Ctrl/Cmd+D duplicate · Delete removes the section (or switches the selected parts off) · 0 switches the selected parts on/off · Ctrl/Cmd+L loops the section · Ctrl/Cmd+E splits it · [ ] shorter/longer · ← → select the previous/next section · Alt+← → moves the section · + − zoom · W fit · F follow · Home goes to the start. Clicking the keyboard gives the notes back. A hint line in the strip header lists the shortcuts.
- **`src/body.html` / `src/head.html`:**
  - The Loop | Song switch (`.seg`) in the transport, and the song toolbar (length, + Section, zoom, Follow).
  - Styles go at the end of `head.html`, using only `--t*`, `--accent`, `--signal` and `--ink`. They're matte, with flat outlines for flashes (no glows) and 44 px targets under 1100 px wide. The song map applies under 600 px.
  - `#mp3Len` is hidden in Song mode.
- **`src/store.js`:** `songView:<id>` per song.
- **`src/edit.js`:** `applyState` calls `migrateSong` and redraws the song view.

### How the assistant hooks in (AI-1)
AI-1's proposal (`AI-1.md` §3.4) was read after this one was drafted. Its three fields are adopted above. Its helper names map onto `song.js`:

| AI-1 helper | `song.js` |
|---|---|
| `ensureSections` | `migrateSong` / `songSections` |
| `setSongMode` | `songMode` |
| `songPlay({from})` | `songPlay({from})` (wraps `loopPlay(fromBeat)`) |
| `loopSection` | `songLoop` |
| `forkPattern` | `songMakeUnique` |
| `songBars` | `songBars` |
| `flashSections` | `songFlash` |

The final names are agreed at build; I'll export both spellings if that helps.

AI-1 adds the voice actions (for example `arrange`, `section`, `parts`, `transition`, `loop_section`) in the Worker prompt, `actions.js` and `maker.js`. Each one calls the `song*` API above and never builds clip coordinates. It sends `songSummary()` with every request and finds sections with `songFind()`. Undo and the flash come for free through `runActions`. Today's `bars` action stays as the pattern length. "N-bar intro" uses `songResize`.

### Hooks left for the sound engine (later item, no sound change here)
- `songAt(beat)` returns `{section, kind, barInSection, barsLeft}`.
- `section.kind` and `section.end` are stored.
- The scheduler calls `SONG_HOOKS.sectionStart(section, time)` and `SONG_HOOKS.sectionEnd(section, time)`. Both are empty for now; SE can use them to schedule a crash on a drop or a fill or riser before a drop.

## 5. Risks and how I'll test
| Risk | What I'll do |
|---|---|
| Loop, record, overdub and sung takes break | Loop mode keeps today's code path for a single section. I'll test record, overdub and a sung take with the fake microphone, and compare the notes scheduled over 2 loops before and after on an old saved song (they must be identical). |
| Linked patterns confuse people ("I edited the Drop and the Build changed") | The "plays in" line in the editor, letter badges on the parts, and a one-click **Make unique**. |
| Long songs are slow to draw or play | DOM parts plus one picture per pattern, and only visible bars on the ruler. Test with 8 tracks × 192 bars: scheduler tick under 2 ms, scrolling and zooming with no frame over 50 ms (long-task observer). |
| MP3 of a 6-minute song runs out of memory or freezes the page | Chunked render. I'll test 3:06 and 6:12 renders: length within ±0.05 s, peak ≤ −0.3 dBFS, RMS reported, no main-thread task over 50 ms. |
| Keyboard shortcuts clash with playing notes on the computer keyboard | Shortcuts only work while the song area has focus, with a visible outline and a hint. Test that the QWERTY notes still play when the song area doesn't have focus. |
| AI-1 and UX-1 are designed in parallel and drift | The ⚑ items above go to assistant-dev through the lead before build. `song.js` is the single API both use. |
| Old saved songs | Migration test: open a song saved with today's build, check that it plays identically and that undo works. |

**Tests added to `tests/smoke.mjs`** (or a list for qa-tester): migrate an old project; apply the template (96 bars, 186 s at 124 BPM); toggle a part and undo it; play from bar 33 and check the first notes scheduled come from the Drop; loop the Break; Make unique; render the whole-song MP3 and report peak and RMS. Screenshots in all three themes at 1400 and 1024.

## 6. Build steps and effort
**Slice 1 (meets the done-when; about 26 hours):**
1. `song.js`: model, migration, API, template, `songFlat` and `songAt` (5 h).
2. Scheduler: Song mode, the loop brace, play from a bar, the end of the song, section switching in Loop mode, the Rec rule (5 h).
3. Song screen on desktop and tablet: the strip (move, resize, duplicate, rename, menu, ⋯), parts (toggle, preview, badge), ruler, playhead, Follow, zoom (+, −, W, Ctrl+scroll, pinch), focus-scoped shortcuts, flash and Undo chip (10 h).
4. Editor patterns: A / B / + New, the "plays in" line, Make unique (2 h).
5. Whole-song MP3 (chunked) and MIDI (2 h).
6. Themes, accessibility, tests and numbers (2 h).

**Slice 2 (about 8 hours, after the owner tries slice 1):** the phone song map; dragging on the ruler to set a loop range; box-select of parts and copy/paste across sections; an energy line under the strip; a stems zip for the whole song; free audio clips that can run across sections.

**Effort: L.** Slice 1 is about 26 hours, the full item about 34.

**For the lead:**
- Add `song.js` to `tools/build.py` `PARTS` and give `studio-ux-dev` ownership.
- Pass the ⚑ items to assistant-dev for AI-1.
- Tell sound-engine-dev about `SONG_HOOKS`, `songAt` and `section.kind`/`end` for a later SE item.
- `src/looper.js` isn't in the build any more. It's an old copy of the looper, so it can be deleted (lead's call).

## 7. Decisions for the owner
1. **Where does the song timeline live?**
   - A) On the Tracks screen: the Loop / Song switch turns the track lanes into the timeline. One screen, and the track names stay where they are. ← recommended
   - B) In a separate "Song" tab next to Tracks and Mixer.
2. **How does a loop become a song?**
   - A) Press **Make it a song**, or say "make it a full track". You get the 6-part, 3-minute layout from your loop, and then you change it. ← recommended
   - B) Every new beat starts as a 3-minute song by itself.
   - C) Start with one section and add sections yourself.
3. **In this first version, what is a "part" on the timeline?**
   - A) One block per track per section that you switch on or off and give pattern A or B; free clips anywhere come later. It's quicker to build, and the assistant gets it right more often. ← recommended
   - B) Free clips placed anywhere on the timeline, like Ableton, from day one. That's about 2 more days of work and harder for the assistant to edit by voice.

## 8. Research used, and questions
- **RES-2 recommendations used:** all seven "For studio-ux-dev" notes:
  1. The data model.
  2. The strip and lanes.
  3. The Loop/Song switch.
  4. Tablet ⋯ and long-press, phone song map (slice 2).
  5. Draw only what's visible, and a chunked export.
  6. Flash and Undo chip.
  7. Hooks for sound-engine-dev.
- **RES-2 notes not used yet:** pinch zoom on the phone, and the energy line (slice 2).
- **Research questions (optional, for music-researcher):**
  1. On iPad DAWs (Logic for iPad, FL Mobile, Koala), does a single tap on a clip select it or switch it on or off? Which one do people expect?
  2. Do producers want the section to switch at the end of the bar or at the end of the loop when they jump between sections in Loop mode?


## Lead notes (settled before build, no choice needed from you)
- Following the market check, the phone song map (tap a section to loop it) moves into the first slice, so phones get the song from day one; Loop-mode section jamming and the long shortcut list move to slice 2.
- One song layout shared with Keys (AI-1) in a new `song.js`, with one template table and a helper so Keys can write a different pattern for one section ("make the second drop different").
- After singing a part in Song mode, the studio goes back to Song mode.
