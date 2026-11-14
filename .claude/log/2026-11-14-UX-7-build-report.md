# UX-7 build report (studio-ux-dev) · 14 Nov 2026

Branch `preview-ux-7` (from origin/main 809d713 + b25f08c), not pushed. Both bugs fixed; check.sh passes (36 smoke checks, 4 new).

## What changed (functions)
- **Bug 1 (HIGH), keys after a double-click hit the section.** Cause: after the double-click, keyboard focus stayed on the `.part` inside `#playlist`, so the song area's keydown handler ran first: `songRemove` / `songDuplicate` on the selected section, then `stopPropagation`, and the editor never saw the key. The editor canvas could not take focus because it had no tabindex, so clicking it only blurred the song area.
  Fix: double-clicking a part now gives the keyboard to the note editor.
  - `src/body.html`: `#edCanvas` gets `tabindex="0"` and a fuller aria-label (Ctrl+A, Delete, Space).
  - `src/daw.js`: new `edFocus()` (focuses the canvas with `preventScroll`). The canvas `pointerdown` calls it (it already tried `cv.focus()`, which did nothing before). The editor's document keydown handler adds **Space = play/stop** when the canvas has focus, so Space works in both places.
  - `src/song.js`: the parts `dblclick` handler calls `edFocus()` after `openEditor`. **The `#playlist` keydown handler is unchanged.** Clicking a section name or the song lanes focuses the song area again, so Delete / Ctrl+D on a selected section work as before.
- **Extra (same area, small): Ctrl+D past the loop end is now one Undo step.** `edPaste` doubles the loop with `setBars` and then pastes, and that made two undo snapshots, so one Undo left the notes doubled. This happened in Loop mode on main too. Changed `edPaste` (an `undoBoundary()` before `setBars`, then `ED.oneStep`) and `edChanged` (skips its boundary once) in `src/daw.js`.
- **Bug 2 (LOW), the MIDI import note named one track.** Cause: a MIDI file adds its tracks one save at a time. Each `songSync` call cleared the pending 900 ms toast and started a new one that named only that save's new tracks. Fix in `songSync` (`src/song.js`): the names collect in `songFreshN` until the toast fires. Text: "“Lead” and “Kick” play in Drop. Click their empty parts to add them elsewhere." A single track still reads "“Kick” plays in Drop. Click its empty parts to add it elsewhere." I kept the existing curly quotes around names. The brief's example has no quotes, so the quotes are easy to drop if the lead prefers.

## How I tested
- I reproduced the bug on the main build with a puppeteer script using real mouse double-clicks and keystrokes: Full track, double-click Chords in the Drop, Ctrl+A, Delete.
  - Main: sections 6 → 5, bars 96 → 80, chip "Deleted Drop", notes still 48 and still selected. Ctrl+D gave "Copied Drop to Drop 3". Delete with nothing selected deleted the Drop, then Backspace deleted the Break. Focus was on `part on flash` / `playlist`.
  - Branch: focus is on `edCanvas`. Ctrl+A selects 48 notes and Delete leaves 0 notes with 6 sections and 96 bars. One Undo brings back 48. Ctrl+D gives 96 notes and 6 sections, and one Undo gives 48. Delete or Backspace with nothing selected changes nothing. Space in the editor plays and stops (TR.running true → false). Clicking a section name, then Space, plays. Clicking the Break name, then Delete, gives 5 sections, and Undo gives 6. No page errors.
- Ctrl+D undo, Loop and Song mode: on main, notes went 48 → 96 → 96 after one Undo (2 snapshots). On the branch they go 48 → 96 → 48 (1 snapshot).
- MIDI import with the Drop selected: main toasts "“Kick” plays in …", the branch toasts "“Lead” and “Kick” play in Drop. Click their empty parts to add them elsewhere."
- I looked at a screenshot of the editor open from the Drop after Ctrl+A (Emerald theme): the notes show as selected, and there is no focus ring after a mouse double-click. The only possible visual change is the global `:focus-visible` outline (`var(--signal)`) when someone Tabs to the canvas. It is theme-safe and there are no layout changes. `tests/phone.mjs` does not exist on this base, so I did not run a phone check (no layout changed).
- New checks in `tests/smoke.mjs`, using real mouse and keyboard:
  1. Double-click Chords in the Drop, Ctrl+A, Delete: 48 → 0 notes, still 6 sections and 96 bars. Delete and Backspace with nothing selected change nothing. Undo gives 48.
  2. Ctrl+D duplicates the notes, not the section (48 → 96 → 48, one Undo).
  3. Clicking a section name, then Delete, still removes the section, and Undo restores it.
  4. A MIDI import into the Drop names both Lead and Kick.

  Against the main build, checks 1 and 2 FAIL and check 3 errors out (the Break had already been deleted by the bug). All pass on the branch.

## check.sh summary
PASS build · PASS bundle syntax · PASS worker syntax · SMOKE OK: 36 checks · CHECK OK. The whole-song MP3 check measured peak -0.53 dBFS and RMS -6.6 dB. Sound is unchanged.

## Notes for the lead
- Files: `src/body.html` (1 attribute), `src/daw.js` (`edFocus` new, canvas pointerdown, editor keydown Space, `edPaste`, `edChanged`), `src/song.js` (parts dblclick handler, `songSync` and its toast state), `tests/smoke.mjs`, `index.html` rebuilt. The playlist keydown handler is not touched, so it should merge cleanly with UX-2/4/5/6.
- `tests/smoke.mjs` belongs to qa-tester. The brief asked me to add these checks, so let the tester know.
- Known limit, not changed: in Song mode, Ctrl+D past the end doubles the *pattern* length, as in Loop mode, and the toast says "doubled its length". That wording is about the loop, not the song. It could be reworded later.
- Nothing to deploy (no Worker or prompt change, no new actions).
