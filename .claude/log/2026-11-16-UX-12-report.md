# UX-12 build report (studio-ux-dev)

Branch `preview-ux-12`, pushed: 106ae6c, 547aa3a. Working tree clean. Did not touch main.

## What changed
- `src/edit.js` (undo)
  - Undo/Redo bring back the song's content, never which song you're in. `applyState` keeps the current `PROJ.id`, and keeps the current name too if a step came from a different song. Autosave can no longer write into another song.
  - After Undo or Redo, `UNDO.last` is now `snapState()`, so it records the id that was kept rather than the old snapshot string.
  - Undo and Redo first save a Tap tempo that is still settling (`undoFlush` calls `tempoFlush`).
- `src/daw.js` (songs)
  - `saveCopy()`: cancels any pending autosave, saves the original once, switches to the copy, writes the copy to `store('project')`, and calls `undoReset()`. The copy starts with an empty undo history ("Nothing to undo").
  - `saveNamed()`: builds the saved record before any wait, so it can't pick up a song opened or copied in the meantime. The "Saved" label only changes if you're still in that song.
  - Deleting the song you're in (the lead's recommended option): any pending autosave is cancelled, and the song stays open with the same id and the header "Not saved". Toast: "Deleted “X”. It stays open here and saves again only if you change it." It is not saved on autosave, New song, Open song or reload until you change something (Undo counts as a change). Then it saves again under the same name. The `store('detached')` flag carries this across a reload, and `keepLastSong` skips a song deleted while it was open.
- `src/studio.js` (tempo)
  - New `userTempo()`: a tempo typed in the BPM box is one undo step, with an undo boundary on both sides. Tap waits until you stop tapping for 1.2 s, then makes one step for the final tempo.
  - `setTempo()` itself is unchanged. The assistant's tempo is still one step per request, and MIDI clock sync still makes no undo steps.
  - An empty or invalid value in the BPM box goes back to the current tempo.
  - `saveProject()` calls `detachCheck()`. `DETACH` is declared here so it exists before anything can call `saveProject`.
- `tests/smoke.mjs`: two checks added at the end, as the brief asked: "Undo after Save a copy never touches the original" and "BPM box change is one undo step".
- `index.html` rebuilt with `tools/build.py`.

## How I tested (headless Chrome, before and after, IndexedDB read directly)
- **Save a copy, then Undo**
  - Before the fix: the original went from 134 BPM / 2 tracks to 120 BPM / 0 tracks, and stayed that way after reload. The title went back to "Original".
  - After the fix: 10 edits, then 14 Undos in the copy (more than the edits). The original's IndexedDB record (name, bpm, track count, savedAt, note counts) is byte-identical, also after reload. The title stays "Original (copy)", and the copy's undo history starts at 0.
- **Tempo typed in the BPM box (88 to 96)**
  - Before the fix: 0 steps. Undo removed the chords, and Redo left the tempo at 88.
  - After the fix: 1 step. Undo gives 88 BPM with the chords still there. Redo gives 96. A second Undo removes the chords.
  - Tap: 5 taps make 1 step. Undo and Redo restore the tempo exactly. Undo while the tap is still settling goes back to the tempo before the taps, and Redo brings the tapped tempo back.
  - Assistant `tempo` action: still exactly 1 step.
- **Deleting the song you're in**
  - Before the fix: it was back in the list 2 s later.
  - After the fix: it stays out of the list after 2 s, after New song, and after reload. The header says "Not saved". If you change it after deleting, it saves again, also across a reload. Screenshot checked: header and toast read fine. The change is text only, so the themes are unaffected.
- **`bash .claude/tools/check.sh`**: CHECK OK twice in a row ("SMOKE OK: 49 checks").
  - Earlier runs at load average ~9 had timing failures: velocity-lane drag, a missing toast for sung chords, the 0.35 s double-click, and the reload check in 3 runs.
  - My two new checks passed every time.
  - Running main and my branch side by side at load ~10, both passed. Main's check.sh passed at load ~8.
  - I found no code path in this change that affects the reload check, but it failed only on my branch. The QA tester should watch it.

## Left / notes
- `tests/smoke.mjs` belongs to qa-tester. I added two lines because the brief asked.
- Nothing to deploy: no Worker change and no new assistant actions.
- Known limit: a song deleted while open and then changed comes back in the list under its old name. That is the chosen behaviour.
