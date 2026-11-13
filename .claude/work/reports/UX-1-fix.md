# UX-1 fix round · studio-ux-dev · 13 Nov 2026

**All six items are fixed and pushed to `preview-ux-1`. The last commit is `37e64c9`.** check.sh: **CHECK OK, smoke 31/31** (bundle and worker syntax pass). That count includes the tester's "Undo right after opening a song" check and 3 new checks of mine.

## What changed, per bug
1. **HIGH: Undo right after opening a song.**
   - Fix: `undoReset()` in `src/edit.js` clears `UNDO.stack`, `redo` and `t`, sets `last` to the opened song and hides the chip. It's called at the end of `loadNamed` and `newSong`, and in `keepLastSong`'s fallback, all in `src/daw.js`.
   - Also in `loadNamed`: before it opens the new song, it saves the song you're leaving (`saveNamed(true)`). Before, a change made in the last 1.5 s before Open could be lost.
   - Checked:
     - Through the list: open, then Make it a song → Full track with the real button, then the Undo button. The song stays ("Fix test", 3 tracks, back to 1 section), and Undo is then disabled.
     - Redo brings the 6 sections back.
     - The tester's smoke check passes.
2. **MEDIUM: a relaxed double-click switched the part off.**
   - Fix, in the part wiring in `src/song.js`: `togglePart` notes the part's state, the undo history and any chip just before it switches the part. If a `dblclick` arrives within 0.8 s, `untogglePart` puts the part back without making an undo step. It drops the extra history entry, restores redo and restores the earlier chip, then opens the editor.
   - Checked with real mouse input (puppeteer `mouse.down`/`up`, clickCount 1 then 2), at gaps of 100, 180, 260, 350 and 450 ms:
     - New code: the part is unchanged, the undo stack is unchanged and the editor opens, every time.
     - Old code (92d5372) on the same script: 260, 350 and 450 ms switch the part. That confirms the test reproduces the bug.
   - New smoke check with a 0.35 s double-click.
3. **MEDIUM: Undo chip.**
   - A part click now shows "Bassline on in Intro · Undo" (or "off").
   - The chip remembers the undo state right after its change. `undoNote` (`src/edit.js`) calls `songChipNote`, so any newer change hides the chip; changes merged into the same undo step keep it. Undo or redo from anywhere hides it too.
   - The chip's Undo (`songChipUndo`) only undoes when the chip's change is still the latest one.
   - Rename and Type now have their own chips. "Looping X" / "Stopped looping X" chips have no Undo, because looping isn't a change; before, their Undo undid something else.
   - Checked:
     - Click a part: chip "Bassline on in Break". The chip's Undo puts it back, and the 6 sections stay.
     - Click a part, then edit a note: the chip hides.
     - New smoke check: a part chip, then a resize chip replaces it, and each Undo undoes the right thing.
4. **LOW: save label.** After opening a song, `loadNamed` shows "Saved 2:41 PM", or "Saved 12 Nov" if it was saved on another day (`savedLabel()` in `src/daw.js`). `keepLastSong` no longer writes "New song" if you already opened another song. Checked by hand and with a new smoke check.
5. **LOW: tablet.**
   - Section ⋯ button:
     - With a touch screen (`@media (pointer:coarse)`, end of the Song CSS in `src/head.html`), the section ⋯ is **44×44 px**. The strip is 52 px tall, and the resize handle is 14 px wide with matching padding.
     - On blocks narrower than 92 px (class `slim`), the ⋯ is hidden on touch, and **holding a section for 0.55 s opens the same menu** (pointer handlers in `src/song.js`).
     - Lifting your finger after the hold leaves the menu open. A short tap still only selects. A page scroll (`pointercancel`) cancels the hold.
   - Short names: when a name doesn't fit its block, `songFitNames()` swaps in a short name that's unique within the song (`songShortNames()`): In, Bu, Br1/Br2, D1/D2/D3, Ou. Names in the same family go short together, so Drop, Drop 2 and Drop 3 show D1, D2 and D3, never "D…". The full name stays in the tooltip and as `aria-label`.
   - The hint and tooltip now say "right-click (or hold on a tablet) for more" (one-line text edit in `src/body.html` and in the tooltip in `src/song.js`).
   - Checked at 1024×768 with touch emulation (`pointer: coarse` true):
     - **8 sections at Fit:** blocks are 64 px and the names read "Intro Build Drop Br2 Drop 3 Br1 Drop 2 Outro".
     - **Zoomed in:** blocks are 117 px with a 44×44 ⋯, and the names read "Intro Bu D1 Br2 D3 Br1 D2 Ou". Tapping the ⋯ opens the menu.
     - **Long-press** on a 64 px block opens "Rename, Duplicate…" and it stays open after lift.
   - Screenshots in Emerald, Velvet and Sapphire.
6. **LOW: transport readout.**
   - `#posDisp` is now **92 px wide in both modes**. In Song mode it shows two lines: "67 . 1" and "Drop 2 · 3/16". Long names get "…", and the tooltip has the whole thing.
   - Count-in uses a smaller font so it fits.
   - Checked at 1400 px: every control stays on the same row in Loop, in Song, at bar 67, and with a 15-character section name; the BPM and key no longer jump.
   - Side effect: the Loop readout no longer widens when playback passes bar 9.
   - Checked in Velvet, Sapphire and at 390 px (no new overflow; the page is still 401 px wide because of `#knobs`, as before).

**Extra fix (found while running check.sh):**
- **Problem:** the reload smoke check failed once. It reopened the song with its old name "Smoke sing".
- **Cause:** `saveProject` writes the project to localStorage after 0.25 s, so a rename just before closing or reloading the page was lost. This is a real user case too.
- **Fix:** `src/studio.js` now writes any pending save on `pagehide`.
- **Checked:** a rename followed by an immediate reload kept "Before reload" in 5 out of 5 runs; without the fix it came back as "Smoke sing". One earlier run with the fix opened with no saved song at all (`LAST_PROJ` was null); I couldn't explain it or make it happen again.

## Checks
- `bash .claude/tools/check.sh`:
  - First run: 2 FAILs (the reload pair above, which led to the pagehide fix).
  - Then: smoke alone 31/31, and **check.sh CHECK OK, 31/31**.
- **MP3 render level** (from the smoke check): whole-song MP3 of the Short layout, drums only, peak −0.81 dBFS, RMS −6.6 dB, 33.02 s. No sound code changed.
- No page errors in any run.

## Files
`src/song.js`, `src/edit.js`, `src/daw.js`, `src/studio.js`, `src/head.html` (Song CSS block: `#posDisp` rules and a `pointer:coarse` block), `src/body.html` (one hint sentence), `tests/smoke.mjs` (3 new checks, plus `label` added to the reload check's return; none of the tester's checks were weakened), `index.html` (rebuilt).

## Known limits
- On touch, blocks under 46 px (tiny) still show a cut-off short name.
- The 92 px readout cuts off section names longer than about 8 characters in Song mode; the tooltip has the full text.
- If the key hint gets longer (for example "detected F# minor"), the key can wrap at 1400 px, but it wraps the same way in Loop and Song, so it no longer jumps.
- Not in this round, as the brief says: names for new songs, the phone Follow button, the "RECORD IN THE LOOP" wording, swing for sung parts.

## Try this (test link https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-1/)
1. Make a beat with a bassline, then reload the page. Press **Open song…** and open your beat. The header should say "Saved" with a time, not "New song".
2. Press **Make it a song → Full track**, then **Undo**. You should still be in your song, back to the plain loop. Press **Redo** to get the sections back.
3. Click a grey part, for example the Bassline under the Break. A chip says "Bassline on in Break · Undo". Press that Undo and only that part goes back.
4. Double-click a part slowly, the way you'd double-tap on a tablet. The note editor opens, and the part stays as it was.
5. Press Play in Song mode, and switch between **Loop** and **Song**. The bar readout stays the same size and the BPM and key don't move.
6. On an iPad or a touch laptop with a Full track: each section has a big **⋯** button. If the sections are narrow, hold one for half a second to open its menu. Drop, Drop 2 and Drop 3 read D1, D2 and D3 when they're short.
