# UX-2 build report (studio-ux-dev) · 13 Nov 2026

Branch `preview-ux-2` (pushed). Commits: 3a090a5 (fixes), 9541557 (smoke checks), plus this report. Diff vs main: `src/daw.js` +14/-9, `src/studio.js` +17/-6, `src/head.html` +2/-1, `tests/smoke.mjs` +19, `index.html` rebuilt. No refactors or moves, so it should merge cleanly with preview-ux-1.

## What changed
1. **Play does nothing on a new song (HIGH).** `src/studio.js`: new `syncLoopState()`. When the transport is idle, it sets `LOOP.state` from the song: `empty` becomes `stopped` when there are tracks, and `stopped` becomes `empty` when there are none. Active states (playing, recording, take, count-in) are never changed. It runs at the start of `saveProject()` and `uiLoop()`. Every way a track appears already goes through one of them: the assistant, a sung take, import, undo/redo, opening a song, the replace-role branch of `addTrack`. So the Play button, controller PLAY and Loop all see `stopped` on a new song made by the assistant. Deleting every track returns the song to empty ("Studio empty").
2. **Velocity lane hidden (MEDIUM).** `src/daw.js`:
   - New `edFitH()`/`edGeomRows()`. `edGeom()` now fits the grid into `#edWrap`'s max-height (480 px) minus the lane. The piano roll shows up to 31 rows instead of 36, at the same 13 px row height. Drum rows shrink only when there are more than about 16 of them (minimum 16 px).
   - `openEditor` centres the notes using the fitted row count. Drum labels are now centred on the row height.
   - Velocity drag: a plain drag on a selected note's bar moves all selected notes together and keeps their differences, as in Ableton. Alt+drag sets them all to the same value. Dragging an unselected bar changes only that note. Each drag is one undo step.
   - The hint text now says this in Draw and Select mode, for both notes and drums.
   - No CSS change was needed.
3. **Sung chords choppy (MEDIUM).** `src/studio.js` `shapePart()`, chords branch only; bass and melody are unchanged. Chord starts snap to beats, or to half bars when the median gap between sung notes is 2 beats or more. In each slot, the note sung longest picks the chord. Identical neighbouring chords merge. Each chord holds to the next one; if the next chord is more than a bar away, it holds a bar or as long as it was sung, so any gap is at least a beat. Shortest chord: 1 beat. The take message now counts chords exactly (it used to divide the note count by 3).
4. **Phone sideways scroll (LOW).** `src/head.html`:
   - `.mixer` columns are now `minmax(min(360px,100%),1fr)`. The Live Mixer cards were the only elements wider than the page.
   - Under 560 px the knobs sit in 2 rows of 4.
   - Tablet 1024 px is unchanged: knobs still in 1 row of 8, mixer still 2 columns.

## How I tested
- `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK: 22 checks**, no page errors. I added 4 checks:
  - "Play button plays a new song made by the assistant" (the tester's snippet, real `#playBtn` click).
  - "velocity lane visible; dragging a selected bar moves all selected" (real mouse: 6 selected notes go 0.7/0.5 to 0.9/0.7, the 7th unselected note stays 0.7, 1 undo step).
  - "sung chords: on the beat, no repeats, each ≥ 1 beat" (a real fake-mic take, about 14 s).
  - "phone width has no sideways scroll" (390 px).
  - The same smoke file run against main's `index.html` fails exactly these 4 (401 px, 12 chords with the shortest 0.5 beat, the velocity group drag doesn't move, Play doesn't start). So the checks catch the bugs.
- Play, in headless Chrome: Play button after "add chords" and after "124 bpm drums like Ben Böhmer", and controller PLAY after "add a bassline". All three start playback, state goes empty → stopped → playing. Undo to 0 tracks gives empty and "Studio empty"; redo gives stopped and plays. Deleting all tracks gives empty.
- Editor at 1400x1100:
  - Chords: canvas 469 px in a 469 px box, scrollHeight = clientHeight, so no inner scroll and the lane is on screen.
  - Drums: 378 px, 13 rows at 24 px, unchanged.
  - Single-bar drag changed only the target note. Alt+drag set all 6 to 0.58.
  - Undo of a group drag restored all values.
  - Checked in Emerald, Velvet and Sapphire.
- Sung chords (fake mic, sing.wav, 124 BPM): 9 chords on whole beats (1+1, 2+1, 3+4, 7+1, 8+1, 9+1, 10+1, 11+2, 13+3), no repeated neighbours, no gaps, mic off after.
  - The tester's 11-chord input from the report gives the same 9.
  - A slow test line gives 4 chords of a bar each, on half-bar starts.
  - Bass shaping output is identical to before.
- Phone 390x844: scrollWidth 390 (was 401). Knobs' right edge 323 px, all 8 visible. Mixer cards end at 349 px. Checked by screenshot in Emerald and Sapphire. Tablet 1024x768: scrollWidth 1024, layout as before.

## Notes and known limits
- There is no Space-bar play/stop shortcut in the app (no key handler for Space exists), so "Space does nothing" was not about the transport state. Adding Space = play/stop is a small new shortcut; I left it out to keep this diff to the bugs. Suggest it as a follow-up.
- The piano roll now shows 31 rows (about 2.5 octaves) instead of 36. The mouse wheel still scrolls, and "▲/▼ n higher/lower" still flags notes out of view.
- With singing at about 1 note per beat (like sing.wav), the result is still a chord per beat in busy places, as the brief asked ("beats, or half bars when slow"). If the owner wants fewer changes, the threshold for half-bar snapping is one number in `shapePart`.
- `src/edit.js` lines 105/112 and `daw.js` `loadNamed`/`newSong` still set the state themselves. They agree with `syncLoopState` and I left them alone to keep the diff small.
- The brief said to push WIP to `preview-ux-2`; my role file says not to push. I followed the brief (branch only, never main).
