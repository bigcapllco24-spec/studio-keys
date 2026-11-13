# UX-2 build brief (studio-ux-dev) · 13 Nov 2026 · bug fixes, no design gate

Read `.claude/standards/dev-standards.md` first. Sections that matter most here:
- **Quality bar**: `bash .claude/tools/check.sh` passes; no console errors; every change goes through `saveProject` and is undoable; colours only from CSS variables (`TC` on canvases); works from phone to desktop.
- **Production and assistant rules**: singing rules stay exactly as they are (only drums play during a take, no live playback of the singer, no raw vocal track added, mic turns off after the take).

You are studio-ux-dev: follow `.claude/agents/studio-ux-dev.md`. Your files only (`src/head.html`, `src/body.html`, `src/daw.js`, `src/edit.js`, `src/studio.js`, `src/play.js`, `src/midi.js`, `src/controller.js`, `src/mic.js`, `src/store.js`, `src/demo.js`, `src/boot.js`), plus `tests/smoke.mjs` for new checks. Rebuild `index.html` with `python3 tools/build.py`.

Work in the worktree `/home/claude/sk-ux-2` (already on branch `preview-ux-2`, made from `main`). Don't touch `/home/claude/studio-keys-repo` or other worktrees: assistant-dev works in `/home/claude/sk-ai-4` at the same time. `check.sh` writes fixed files in /tmp (`/tmp/sk-bundle.js` etc.): if a FAIL looks like a clash with the other run, rerun it. Save WIP commits as you go and push the branch (`git push -u origin preview-ux-2`) after each fix. Never push `main`.

**Keep the diff small and local.** `preview-ux-1` (Song view, waiting for the owner) changes `src/studio.js`, `src/daw.js`, `src/head.html`, `src/edit.js` heavily; whichever releases second will be merged onto the other, so touch only the lines these fixes need, no refactors or moves.

## The bugs (from the tester's daily session, report `.claude/work/reports/QA-1-daily-2026-11-13.md`; screenshots in `/home/claude/bugs/qa-2026-11-13/`; the tester's Playwright scripts in `/home/claude/bugs/qa-2026-11-13/js/`)

1. **HIGH: Play does nothing on a new song.** Open the app (or New song), type "add chords" (or "124 bpm drums like Ben Böhmer"), press Play: toast "Add a track or record something first."; Space and controller PLAY do nothing; Loop starts a count-in recording. Works only after pressing Stop once. Tester's diagnosis: `addTrack()` in `src/studio.js` never moves `LOOP.state` from `'empty'` to `'stopped'` (importers in `src/edit.js` and `loopStop()` do). Fix it at the root so every way a track appears (assistant, sung take, import, demo, undo/redo, opening a song) leaves the transport playable, and an empty song (all tracks deleted) goes back to empty. Screenshot `25-play-does-nothing.png`.
2. **MEDIUM: velocity lane hidden.** At 1400x1100, Edit notes: `#edWrap` is max 480 px tall but the canvas is 534 px, so the velocity lane the hint mentions is below the fold until you scroll inside the editor. Make the lane visible when the editor opens (fit the canvas/lane into the box, or keep the lane pinned at the bottom). Also: with several notes selected, a plain drag on a selected note's velocity bar should change all selected notes (Ableton behaviour); today only Alt+drag does. Dragging an unselected note's bar changes just that note. One undo step per drag. Update the hint text. Suspects: `#edWrap` CSS in `src/head.html`, `edGeom`/`setVel` in `src/daw.js`. Screenshots `07-editor-open.png`, `10-velocity-lane-scrolled.png`.
3. **MEDIUM: sung chords come out choppy.** "let me sing the chords" with `tests/fixtures/sing.wav`: 11 chords in 4 bars, starts off the beat, the same chord repeated back to back, one only 1/16 long (numbers in the report). Make the chords branch of `shapePart()` in `src/studio.js`: snap chord starts to beats (or half bars when the singing is slow), merge identical neighbouring chords, minimum length 1 beat, no gaps of under a beat between chords. Keep bass and melody shaping unchanged. Screenshot `06-after-sing.png`.
4. **LOW: phone width scrolls sideways.** At 390x844 the page is 401 px wide (11 px sideways scroll); controller knobs K6-K8 are cut off (`#knobs` right edge at 493 px) and Live Mixer cards run past the panel. Fix with CSS in `src/head.html` (wrap or scroll the knob row inside its own box; no page-level horizontal scroll). Tablet 1024x768 must stay as it is. Screenshots `20-phone-top.png`, `22-phone-tracks.png`.

Not in this job: sung part next to a generated part (that's UX-3, waiting for a design); pads level (SE-1).

## Tests
- Add smoke checks to `tests/smoke.mjs` for 1 (use the real `#playBtn` click on a new song made by the assistant, e.g. the tester's snippet below), 2 (lane visible on open; group velocity drag), 3 (sung chords: starts on the beat grid, no identical neighbours, each ≥ 1 beat) and 4 (scrollWidth ≤ 390 at phone size).
```js
const pl = await E(async () => { await newSong('Smoke play'); runActions(localBrain('add chords').actions); document.querySelector('#playBtn').click(); const r = TR.running; loopStop(); return r; });
ok('Play button plays a new song made by the assistant', pl);
```
- `bash .claude/tools/check.sh` must pass. Paste its summary.

## Report
Save a short report as you go to `.claude/work/reports/UX-2-build.md` (commit it on the branch): what you changed per bug (files and functions), how you tested (numbers), the head commit, anything left. Reply with the same text.

Commit messages end with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZAURt1FEme7E1HDXYnU
