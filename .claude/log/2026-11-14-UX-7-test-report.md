# UX-7 branch check (qa-tester) · 14 Nov 2026

READY. Both bugs from this morning are fixed when tested with a real mouse and keyboard. I found no regressions against `main`: piano letters, MIDI, arrows, clipboard, Undo, Space, the audio-part toast and phone width all behave as before or better. Two low findings below. Neither blocks the test link.

Branch `preview-ux-7` @ 236393d. Tests not changed, nothing committed or pushed.

## check.sh
PASS build · PASS bundle syntax · PASS worker syntax · SMOKE OK: 36 checks (4 new UX-7) · CHECK OK · 1 min 19 s total (under the 3 min budget). Whole-song MP3: peak -0.68 dBFS, RMS -6.8 dB. No page errors.

## Problems (ranked)
1. **LOW: Tab onto the note editor shows no focus ring in any theme.** The brief expected a theme-coloured ring on Tab.
   Steps: open any track's editor, click Close's neighbour so focus is in the editor bar, press Tab twice. Focus lands on the canvas (`:focus-visible` matches), but nothing shows.
   Expected: a `--signal` outline, as on `.part:focus-visible`.
   Cause: `src/head.html:459` has `#edCanvas{outline:none}`, which beats the global `:focus-visible` rule. The build report's line "the global `:focus-visible` outline when someone Tabs to the canvas" is therefore not true.
   Fix (studio-ux-dev, `src/head.html`): add `#edCanvas:focus-visible{outline:2px solid var(--signal);outline-offset:-2px}`. A mouse double-click still shows no ring, which is correct (`:focus-visible` false).
2. **LOW, already on `main`, not a regression: what's left of bug 1 when the song area has the keys while the editor is open.**
   Steps: Full track in Song mode, double-click Chords in the Drop (editor opens). Single-click any part, e.g. Bassline in the Break, or double-click an audio part ("That's a recording" toast; the editor stays on Chords). Press Ctrl+A: all 20 Chords notes show as selected in the editor. Press Delete: the chip says "Deleted Break" (6 → 5 sections) and the notes stay.
   Expected: Ctrl+A should not highlight notes that Delete won't remove. Either the editor ignores keys while focus is in `#playlist`, or Ctrl+A/Delete both act on the notes.
   It's identical on `main` (sections 6 → 5, notes unchanged) and Undo brings the section back, so it's a follow-up, not a blocker. Files: `src/daw.js` (editor document keydown) / `src/song.js` (playlist keydown).

Also seen, not UX-7: at 390 and 360 px the page is 401 px wide (about 11 px of sideways scroll). It's the same on `main`, so it's probably UX-4's area.

## What I checked (branch vs `main` build, real mouse and keys via puppeteer, fake MIDI input stub)
- **Bug 1 (Song mode, double-click Chords in the Drop):** focus goes to `edCanvas`.
  - Ctrl+A, Delete: 48 → 0 notes, 6 sections, 96 bars. One Undo gives 48 back.
  - Delete or Backspace with nothing selected: nothing changes.
  - Ctrl+D: 48 → 96 → 48 with one Undo, sections stay 6.
  - Section name, then Delete: 6 → 5, and Undo gives 6.
  - On `main` the same steps hit the sections: Ctrl+D made 7 sections (96 → 112 bars).
- **MIDI toast:** "“Lead” and “Kick” play in Drop. Click their empty parts to add them elsewhere." (smoke). `main` named only Kick.
- **Ctrl+D past the end, one Undo:**
  - Loop mode: 4 bars/20 notes → 8/40 → Undo 4/20 → Redo 8/40. `main`: Undo left 8/40.
  - Song mode (last bar selected): 4/20 → 8/25 → Undo 4/20, song stays 96 bars, 6 sections. `main`: Undo gave 8/40.
- **Computer keyboard as piano (A, S) and MIDI note-on:** all three still play (`kb:60 kb:62 m1:64`), identical to `main`, in every case I tried:
  - Loop mode, before and after clicking the editor.
  - Song mode, after the double-click and after clicking a section name.
  - After clicking a piano key while the editor has focus. The canvas keeps focus and letters still play.
- **Arrows, clipboard, Undo, Escape in the editor (Song mode):**
  - Ctrl+A, then ArrowUp and ArrowRight: 55@0 → 56@0.25, all 20 selected, sections stay 6, focus stays on the canvas.
  - Ctrl+C, X, V, Z, Z, Y: notes 0, 20, 0, 20, 0. Correct, and sections untouched.
  - Escape: selection cleared, editor stays open, focus kept.
- **Close, then Delete:** nothing is deleted (focus on body), same as `main`. Clicking the Drop name, then Delete, then Undo gives 6 → 5 → 6.
- **Space:**
  - Song playing, double-click a part, Space, Space: running true → false → true. Focus stays on the canvas.
  - Section name, then Space, Space: true → false.
  - Loop mode with the canvas focused: Space plays and stops (true → false). This is new: on `main` the canvas couldn't take focus, so Space did nothing there.
  - No page scroll on Space.
- **Double-click an audio part (imported `sing.wav`):** the "That’s a recording…" toast shows, focus goes to the part (song area), no errors. See problem 2 for what Ctrl+A and Delete do next.
- **Phone, 390 and 360 px:** the Song map shows (308 / 278 px). Parts are collapsed at this width on both builds, as before. The editor opens, and tapping the canvas focuses it with no ring and a scroll change of 1 / 3 px, identical to `main`. No page errors.
- **Themes (Emerald, Velvet, Sapphire):** Tab reaches the canvas in 2 presses and `:focus-visible` matches, but the outline is `none` (problem 1). After a mouse double-click, `:focus-visible` is false.
- **Console:** only `net::ERR_TUNNEL_CONNECTION_FAILED` from the sandbox network, also on `main`. No page errors.
- **The developer's 4 smoke checks:** reviewed and kept. They use real mouse and keyboard, fail on `main` and pass on the branch, and add about 3 s.

## Screenshots
/tmp/claude-0/-home-claude/1e6a0fff-1ce7-5bfb-a93b-7912980c1191/scratchpad/shots/
- `branch-song-editor.png`: Drop chords editor after the double-click, Song mode.
- `branch-loop-editor.png`, `branch-song-audio.png`.
- `branch-tab-ring-{emerald,velvet,sapphire}.png`: no ring after Tab (problem 1).
- `branch-p390-song.png`, `branch-p390-editor.png`, `branch-p360-*.png`: phone.
- `main-*.png`: the same screens on the `main` build.

Scripts: `ux7.mjs`, `phone.mjs`, `ring.mjs`, `dbg.mjs`, all in /tmp/claude-0/-home-claude/1e6a0fff-1ce7-5bfb-a93b-7912980c1191/scratchpad/.
