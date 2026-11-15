## Fix 1 (studio-ux-dev, 13 Nov 2026) · branch preview-ux-4, head 404d774 (pushed)

### Bugs
1. **HIGH: phone back from the note editor left the app.** Fixed.
   - Cause: Edit notes closes the part sheet. That calls `history.back()`, which is async. The editor's `pushState` ran before that back landed, so the back removed the editor's entry.
   - Fix (`src/phone.js`): `phPush` now waits while a back is still in flight (`PH.pendPush`), and the `popstate` handler pushes the new entry once the back lands. `phPop` cancels a waiting push instead of going back twice. This covers every path where one overlay replaces another, not just Edit notes.
   - Verified with a headless touch run at 390x844. I opened the editor from a part card and from a card's FX button: `history.state` = `{ph:"editor"}` in both cases. Back closed the editor, the URL stayed the same, and the app stayed on the Song tab. Back still closes a part sheet and a More page. Closing the editor with its own close button leaves no stray history entry behind.
2. **MEDIUM: a freshly tapped 1/16 note stretched instead of moving.** Fixed.
   - Fix (`src/daw.js` `hit()`): with a finger, the right-end resize zone only exists on notes at least 24 px wide (a third of the note, up to 14 px). With a mouse it stays at 7 px.
   - Verified on a 5 px tapped note: dragged up and right, it moved from `{b:1,d:0.25,n:40}` to `{b:3,d:0.25,n:42}` and kept its length. A 47 px note still stretches from its right end (d 2 → 4), and dragging its middle moves it (b 4 → 6).
   - The touch hint now says "drag the end of a long note to stretch it · double-tap deletes".
3. **MEDIUM: holding a section ran the menu item under the finger on release.** Fixed (`src/phone.js`; `src/song.js` untouched).
   - Cause: on a phone the menu opens as a bottom sheet, and it can land under the finger. The release tap then clicked whatever item was there.
   - Fix: any `#songMenu` that opens while a touch is still down ignores the release tap (450 ms window). A MutationObserver watches the menu, so this also covers the tablet song-strip long-press in `song.js`.
   - Map holds now open the menu under the block instead of at the finger.
   - I also found and fixed a related bug: the map's hold flag was never reset when the release went to the menu, so the next tap on the map was swallowed.
   - Verified in the test: the release made a real click on "Rename", and it was ignored. The menu stayed open and the sections were unchanged. A later tap on Duplicate worked (3 → 4 sections). A quick tap on a section still loops it. On iPad, holding a section in the strip opens the menu and the release changes nothing.
4. **MEDIUM: iPad text boxes were under 16 px.** Fixed.
   - Fix (`src/head.html`): the `(pointer:coarse)` rule now also covers `.as-form input.input` and `#mp3Len`.
   - Verified at 820x1180 with touch: `#asIn` 16 px, `#mp3Len` 16 px, no visible text box under 16 px. Desktop at 1400 keeps 15 px and 12 px.

### Rough edges fixed
- **Phone wording:**
  - The selection bar says "Tap or hold a part to add or remove it" (desktop keeps the Ctrl/Cmd wording).
  - The section menu drops "Ctrl/Cmd+D", "Ctrl/Cmd+L" and "Delete key".
  - The Play-tab keys hide the computer-key letters (desktop keeps its 18 letters).
- **Colours:**
  - The `.ph-scrim` colour now comes from `--t0` at 72%.
  - The theme-slot fallback uses `var(--t6)`.
  - The JS theme-color fallback `#07120e` is gone (it uses `--t1`, then `--bg`). The static `<meta>` default in the HTML stays.
- The "Your sound" pill text is centred (14 px above and 14 px below, in a 44 px pill).
- **Sideways Play tab (844x390):**
  - Before: the pads and keyboard sat below the fold.
  - Now: the two sounds sit on one row next to All sounds and Octave (labels hidden; the selects keep their aria-labels), and the 8 pads fit in one row at 44 px.
  - The keyboard fills the space left (keys at 185-285, transport at 286). The page is still 420 px tall, so about 30 px scroll remains.
- Left as is: the Keys orb (design call for the owner), and the sideways Keys chat height (still 41 px; fixing it means moving the dock, which isn't small).

### Files touched
- `src/phone.js`
- `src/daw.js`
- `src/head.html`
- `index.html` (rebuilt)
- No changes to `src/song.js`, `src/assistant.js`, `tools/build.py`, `tests/**` or `.claude/`.

### Tests
- `bash .claude/tools/check.sh`: **CHECK OK**. 39 of 39 smoke checks and 10 of 10 phone checks passed (1 min 54 s).
- My focused touch test: 21 of 21 passed in each theme (Emerald, Velvet, Sapphire), with no page errors. Script: `/home/claude/ux4build/fix1/fix1.mjs`.
- Screenshots are in `/home/claude/ux4build/fix1/`: `<theme>-{keys,editor,section-hold,select,play,sheet}.png` and `844x390-{keys,play}.png`.
- For the tester, suggested lines for `tests/phone.mjs`:
  - Back (`history.back()`) from an editor opened through the part sheet keeps the URL and closes `#editor`.
  - Dragging a just-tapped 1/16 note changes `b`/`n`, not `d`.
  - The release after a 0.7 s hold on `#songMap .smb` leaves the menu open and the sections unchanged.
