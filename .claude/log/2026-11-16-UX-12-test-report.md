# UX-12 branch check (qa-tester), 16 Nov 2026
Branch `preview-ux-12` @ 547aa3a, worktree /home/claude/sk-ux-12 (left clean, nothing committed).

## Verdict: NOT READY (one small fix)
All three fixes work: Save a copy + Undo, typed and tapped tempo undo, and deleting the open song. check.sh passed 3 out of 3 runs. The reload check passed all 12 times I ran it. One new problem in the delete behaviour: after you delete the song you're in, an explicit Save does nothing. The Save button gives no message, and the assistant's "save" even replies "Saved".

## Bugs
1. **Explicit Save is ignored after deleting the song you're in, and the assistant says "Saved" anyway** (medium; studio-ux-dev, `src/daw.js` `saveNamed`/`detachedNow`)
   Steps: make a song "Gone" with drums, wait for autosave. Open song…, then Delete, Confirm delete on "Gone" (the current song), then Close. Click **Save**, or type/say "save" (action `{type:'save'}`).
   Expected: Save is a direct request to save, so it saves "Gone" again with a "Saved “Gone”" toast. At minimum it should say why it didn't save.
   Actual: nothing is saved (IndexedDB has no record), with no toast. The header stays "Not saved". The assistant replies `Saved “Gone”`, which is false. If the user then reloads, the song is gone.
   Likely fix: `saveNamed(false)` (Save button, assistant `save`) should clear `DETACH` and the `store('detached')` flag before saving. Only quiet saves (autosave, New song, Open song, reload) should skip.

## Outside UX-12 (also on main, not a blocker)
- The offline parser turns "save the song" into an MP3 export (`localBrain('save the song')` gives `[{type:'export',format:'mp3'}]`). "save", "save it" and "save my song" correctly give `{type:'save'}`. This is in `src/maker.js` (assistant-dev). It only affects offline/basic mode.
- The velocity-lane drag check failed once at load 8-10, in a cut-down smoke run, and passed in all 3 full runs. The developer also saw this timing flake under load. It didn't fail twice, so I didn't compare it with main.

## check.sh
- Run 1: CHECK OK, SMOKE OK: 49 checks (5m24s, load falling from ~5)
- Run 2: CHECK OK, SMOKE OK: 49 checks (4m12s, load 7-8, other branch checks running)
- Run 3: CHECK OK, SMOKE OK: 49 checks (3m19s, load ~9)
- Reload check ("song: opening the app starts a new empty song…"):
  - 3/3 full runs passed.
  - 2/2 cut-down smoke runs passed (the same steps up to the reload check, load ~10).
  - A reload-only test passed 8/8, run 4 at a time at load 17-21. Waiting for "New song" took 0.4-2.3 s.
  - Likely cause of the developer's failures: in the first commit, 106ae6c, `let DETACH` sat in daw.js. `saveProject` (studio.js) reads it through `detachCheck`, so a save before daw.js ran would throw (temporal dead zone). 547aa3a moved the declaration into studio.js, and I saw no failures after that.

## Focused test (headless Chrome, IndexedDB read directly): 30/30 PASS (/tmp/qa-ux12/focus.mjs)
- **Bug 1 (Save a copy, then Undo):** "Original" was 134 BPM with 2 tracks.
  - After Save a copy: the title is "Original (copy)", the undo history is empty ("Nothing to undo") and Undo is disabled.
  - Then I did Undo, 10 edits, 14 undos and 5 redos. The original's record (name, bpm, tracks, savedAt, full proj) stayed byte-identical to the record right after the copy, also after reload. The copy did not change the original's content.
  - The title stays the copy. After reload both songs are in the list: "Original 134/2" and "Original (copy) 134/2".
- **BPM box:**
  - 100 → 113.5 is 1 undo step. Undo gives exactly 100 (box shows "100"), with the chords kept. Redo gives 113.5. A second Undo removes the chords, and a double Redo brings both back.
  - An empty box goes back to the current tempo. Typing the same value makes no step.
- **Tap tempo:**
  - 6 taps make 1 step (119.6). Undo goes back to exactly 113.5, and Redo brings back 119.6.
  - Undo while a tap is still settling goes back to 119.6. Redo brings back 143.9 and adds no extra step later.
- **Deleting the open song:**
  - Header shows "Not saved", plus a toast. The song is gone from the list, stays gone after 2.5 s, and stays open (2 tracks).
  - It is still gone after New song, Open song (another song) and reload. It is also gone after reloading right after the delete.
  - Changing it saves it again under the same id and name. Undo also counts as a change, as designed.
  - Deleting another song (not open) doesn't touch the current song (no "Not saved").
- **Save a copy twice:**
  - Clicked 50 ms apart: Base, Base (copy) and Base (copy) (copy) are all in the list. Undos in the second copy leave the original and the first copy's content untouched.
  - Clicked 1.5 s apart: same result.
- **Save a copy, then open the original and Undo:** "Nothing to undo". You stay in "Base". An edit plus Undo leaves the content intact.
- **Assistant tempo action:** 1 step, and Undo/Redo give exactly 124/97. "make it faster" (offline parser) is also 1 step.
- **MIDI clock (fake input, 24 ppq):** the tempo follows to 128, then 90, with 0 undo steps.
- **Regressions:**
  - Autosave writes edits.
  - Renaming in the name box saves. Undo of a rename restores the old name in the same song (same id), and Redo saves the new name.
  - A 25-step undo chain: 25 steps back to the start, redo to the top, and the saved record matches the top.
  - Deleting another song from the list works. After reload the app opens on a new empty song, and the list is correct.
- No page errors in any scenario.

## Screenshots (/tmp/qa-ux12/shots/)
- A-copy-after-undos.png (LCD "ORIGINAL (COPY) · 134 BPM", "Nothing to undo")
- C-delete-current.png (list shows only "Keeper"; toast "Deleted “Doomed”. It stays open here…")
- C-after-save-click.png (Save clicked after delete: still "Not saved", no save toast; bug 1)
- G-assistant-save-after-delete.png, F-songs-list.png, F-after-reload.png
The header and toast text read fine, and the layout is unchanged.
