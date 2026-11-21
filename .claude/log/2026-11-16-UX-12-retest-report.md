# UX-12 re-check after fix 1 (qa-tester), 16 Nov 2026
Branch `preview-ux-12` @ 45adf4f, worktree /home/claude/sk-ux-12 (read-only, nothing committed, left clean).

## Verdict: READY
Bug 1 is fixed. After you delete the song you're in, Save (the button or the assistant) saves it again. You get the toast, it goes back in the list, and it survives a reload. Quiet saves still skip it. The full regression script passes. check.sh passed on the re-run.

## Bugs
None blocking.

Low notes (not blockers):
1. Right after a failed save, the next assistant "save" that works still replies "Trying to save “X” again: last time this browser couldn’t (quota)". The toast and header say "Saved", and the reply after that says "Saved". This is because `runActions` is synchronous; the developer already described it. The reverse case (the very first failure replies "Saved") is the same known limit. In both cases the toast and header tell the truth. Only seen with a forced storage failure.
2. Outside UX-12, also on main: the LCD says "1 TRACKS" (`src/controller.js:128`), which is cosmetic.

## check.sh
- Run 1: CHECK FAILED, 1 of 50: "velocity lane … dragging a selected bar moves all selected" (0.71/0.51). Load was 8, with two other re-checks running. This is the same timing flake I saw this morning.
- Run 2 (re-run once, as the brief allows): **CHECK OK, SMOKE OK: 50 checks**, at load 12. The new smoke line "Save after deleting the open song saves it again" passes.
- FYI: by mistake I first ran check.sh from the main checkout (/home/claude/studio-keys-repo, main @ bdc4c77). Nothing changed there; that tree was still clean afterwards. That one main run failed 2 of 47: the reload check "opening the app starts a new empty song…" and "Undo right after opening a song stays in that song". I didn't re-run it and it isn't this branch. The lead may want one clean check on main.

## Fix re-test: 13/13 PASS (/tmp/qa-ux12/retest.mjs, log retest1.log)
1. Delete "Gone" (open, 1 track), then wait 2.3 s: still gone, header "Not saved". Click **Save**: the record is back (Gone/1 track), toast "Saved “Gone”", header "Saved 7:51 AM", `DETACH` null, the `sk.detached` flag cleared.
2. It is back in the Open song list.
3. After that, a change (add bass) autosaves normally (2 tracks).
4. It survives a reload (Gone, 2 tracks).
5. Quiet saves still skip a deleted open song: the autosave wait, New song, Open song (another song), and a reload right after the delete.
6. Save a copy right after a delete: the original stays deleted, the copy "CopyMe (copy)" is saved.
7. Assistant `{type:'save'}` after a delete: saved, reply "Saved “Said”", toast shown.
8. Offline "save it" (gives `{type:'save'}`) after a delete: saved.
9. `{type:'save', name:'Said Again'}` after a delete: saved under the new name, and the reply names it.
10. Forced `IDB.put` failure:
    - `saveNamed(false)` returns false, header "Not saved", toast "Couldn’t save in this browser: quota".
    - The assistant then replies honestly ("…couldn’t (quota)").
    - Once storage works again, the save goes through ("Saved 7:52 AM"), and the next reply is "Saved “Said Again”".
11. No page errors.

## Regression: focus.mjs 38/38 PASS (/tmp/qa-ux12/focus5.log)
- All of A–G pass: Save a copy plus Undo, BPM box and Tap undo, delete current, copy twice, assistant tempo, MIDI clock, autosave/rename/25-step chain, delete another song, reload.
- The two info cases that showed the bug this morning now save:
  - C8 (Save button): `{"back":true,"label":"Saved 7:55 AM","toasts":["Saved “Revived”"]}`
  - G1 (assistant save): `"Saved “Gone”", saved: true`
- Still outside UX-12 (assistant-dev, `src/maker.js`): offline "save the song" exports an MP3 instead of saving.

## Screenshots (/tmp/qa-ux12/shots/)
- R1-save-button-after-delete.png: header "Saved 7:51 AM", toast "Saved “Gone”"
- R1-list-after-save.png
- R9-assistant-save-after-delete.png
- R12-failed-save.png: after recovery, "Saved 7:52 AM", toast "Saved “Said Again”"
- Layout unchanged, and the text reads fine.
