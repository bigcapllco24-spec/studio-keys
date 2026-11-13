# UX-1 · fix round 2 (studio-ux-dev) · 13 Nov 2026

Branch `preview-ux-1`, last commit **067a214** (pushed; previous head 37e64c9). Files: `src/studio.js`, `src/edit.js`, `src/song.js`, `src/head.html`, `index.html` (rebuilt). `tests/smoke.mjs` is unchanged.
Note: my role file says "don't push", but the brief said to push to `preview-ux-1`, so I followed the brief.

## 1. N1: the Rec button no longer grows when Play starts in Song mode
- **Change:**
  - The Song-mode label while playing is now **"Rec in loop"**. It fits the existing 170 px button.
  - The full wording is in the button's tooltip: "Record in the loop: switches to Loop mode and records what you play".
  - I found a second jump at 1280 px. The top-bar status pill read "Song ready · song · 96 bars · 3:06", which was long enough to wrap the top bar onto two rows. Pressing Play shortened it to one row, so the whole page moved up 46 px.
  - The pill now reads "Song ready · 96 bars · 3:06" when stopped and "Playing song · 96 bars · 3:06" when playing. These are about the same length, so the top bar no longer rewraps.
- **Check (headless Chrome):** I measured the button, readout, BPM and key positions (x/y/width) for Song stopped → Song playing → stopped again at 1400, 1280, 1024 and 390 px.
  - **0 px movement** at every width.
  - `#loopBtn` stays 170 px wide and `#posDisp` stays 92 px.
  - At 1400 px: readout at x 530, BPM at 928, key at 1136 in all states (before the fix, BPM went 928 → 1006 and key 1136 → 1214).
  - No horizontal scroll at 1400, 1280 or 1024. At 390 px the page is 401 px wide, the same as before the fix (it comes from `#knobs`, as the tester noted).
  - Screenshots in Emerald, Velvet and Sapphire, stopped and playing: `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/fix2/tr-*.png`.

## 2. Undo after "Make it a song" now returns to Loop mode; Redo goes back to Song
- **Change:** in `applyState` (`edit.js`):
  - When an Undo or Redo removes the song layout (the song goes back to the single automatic section) while you are in Song mode, it switches to Loop mode. A toast says: "Back to the plain loop (Loop mode). Redo brings the song back."
  - When the layout comes back by Redo, it switches back to Song mode, with the chip "Song layout back · Song mode" (no Undo button on that chip).
  - The flag that remembers this is cleared when a song is opened (`undoReset`).
  - Other Undos made in Song mode don't change the mode.
- **Check:**
  - Bass and drums, then Full track, then Play.
  - **↶ Undo:** Loop mode, 1 section, still playing and now looping; the button reads "Overdub" and the pill "Playing · 4 bars"; Redo is enabled.
  - **↷ Redo:** Song mode, 6 sections, still playing, chip shown.
  - Same with the keys: Ctrl+Z gives Loop with 1 section, Ctrl+Shift+Z gives Song with 6 sections.
  - Switching a part off in Drop and then Undo stays in Song mode with 6 sections, and the part is back on.

## 3. A long chip stays on one line
- **Change:**
  - The chip row (`.sh-l1`) no longer wraps.
  - The chip shrinks with an ellipsis, while the Undo button and the length label keep their size.
  - The chip's full text is in its `title`.
  - The row reserves the chip's height (26 px), so showing or hiding any chip doesn't move the strip.
- **Check:**
  - At 1400 px: song strip top 1454 → 1454 → 1454 → 1454 for no chip, "Renamed Drop 2 to Second big drop", a short chip, then hidden again. Before the fix it moved 1452 → 1479.
  - Same at 1280 and 1024 px, including the long "Full track: Intro 16 · …" chip.
  - The text is clipped with "…" and Undo stays visible.
  - Screenshots `chip-{emerald,velvet,sapphire}.png` and `chip-1024.png` in the same folder.

## check.sh
**CHECK OK, SMOKE OK: 31 checks**, no page errors.
- Whole-song MP3 (Short layout, drums): 33.02 s, peak −0.70 dBFS, RMS −6.6 dB.

## For the tester / lead
- Suggested smoke line (tests are the tester's area): `songTemplate('club'); undo()` → `SONG.view.mode==='loop' && !songArranged()`; then `redo()` → `SONG.view.mode==='song' && songSections().length===6`.
- Known limit: if you Undo out of the song, switch to Song yourself, and then Redo, it just stays in Song. That is correct. The view mode is still not part of the undo history.

## Try this (https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-1/)
1. Say or type "make a track like Stephan Bodzin", then "add a bassline". Click **Make it a song ▾ → Full track**: six coloured sections appear above the tracks, and the song plays in Song mode.
2. Press **Play**. The big button reads "REC IN LOOP", and the bar readout, Loop/Song switch, BPM and key don't move. Press **Stop**: still nothing moves.
3. While it plays, press **↶ Undo**. You're back in the plain 4-bar loop in Loop mode, still looping. Press **↷ Redo** and the six sections come back in Song mode.
4. Click a grey part (for example Bassline in Intro) to switch it on. A chip says "Bassline on in Intro · Undo", and its Undo switches it off again.
5. Right-click Drop 2 → **Rename** and give it a long name like "Second big drop". The chip stays on one line (hover over it to read all of it), and the song strip doesn't jump.
6. Type a name for the song and click **Save**. Reload the page, then use **Open song…** → **Open**: it comes back with its sections, and the header shows when it was saved.
