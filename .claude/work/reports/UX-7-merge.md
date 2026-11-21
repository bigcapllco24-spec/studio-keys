# UX-7 merge main (studio-ux-dev) · 15 Nov 2026

`origin/main` (bb3d86f: UX-2, UX-5, SE-3 and housekeeping) merged into `preview-ux-7`. No new features.

## Conflicts and how they were resolved
- **`src/daw.js`, editor canvas `pointerdown`.** UX-7 swapped `cv.focus()` for `edFocus()`. UX-2 rewrote the velocity-lane drag: the selected group, its lead note, Alt, and the original values. The merge keeps UX-2's velocity drag line as it is and calls `edFocus()` at the start. The rest of `daw.js` merged on its own and keeps both sides: UX-7's `edFocus`, Space in the editor, and the one-undo Ctrl+D (`ED.oneStep` in `edChanged`/`edPaste`), plus UX-2's `edFitH`/`edGeom` and the editor's top row fitted to the grid.
- **`src/song.js`, `songSync` toast.** Both sides changed the "plays in" toast. UX-7 collected the names of new tracks until the toast fired, so a MIDI file names every track. UX-5 kept track ids and read them when the toast shows (`songFreshToast`), so a sung take toasts after it returns to Song mode, and `songFreshCancel` covers a re-sung take. The merge keeps UX-5's design: ids, `songBackSoon()`, `songFreshToast` and `songFreshCancel`. It also takes UX-7's behaviour: ids **build up** across saves (with no duplicates) instead of being replaced on each save, and the toast uses UX-7's grammar for several tracks. The result is one toast, never two.
- **`index.html`.** I took main's side and then rebuilt it with `python3 tools/build.py` from the merged `src/` (9,805,587 bytes).
- `src/head.html` and `tests/smoke.mjs` merged on their own. The smoke file keeps main's checks and UX-7's 4 checks.

## Toast wording now
- One track (a sung part, or an added part): "“Sung chords” plays in Intro. Click its empty parts to add it elsewhere." (UX-5's wording, unchanged)
- Several tracks (a MIDI file): "“Lead” and “Kick” play in Drop. Click their empty parts to add them elsewhere." With three or more: "“A”, “B” and “C” play in …"

## Check
`bash .claude/tools/check.sh`: PASS build · PASS bundle syntax · PASS worker syntax · SMOKE OK: 51 checks · CHECK OK. No page errors.
- All 4 UX-7 checks pass: Ctrl+A then Delete gives 48 → 0 → 48 notes with 6 sections and 96 bars. Ctrl+D gives 48 → 96 → 48. Clicking a section name, then Delete, removes the section and Undo restores it. The MIDI import names both Lead and Kick.
- Main's UX-5 sung-chords toast passes with the exact text. UX-2's velocity lane and group drag pass, including on pattern B with one undo step. Phone width is 390 px with no sideways scroll.
- Whole-song MP3: peak -0.43 dBFS, RMS -6.6 dB.

## For the lead
- Nothing to deploy: no Worker or prompt change and no new actions.
- The tester may want to re-try the test link, since the editor's pointerdown and the song toast now combine both items.
