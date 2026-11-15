# UX-7 build brief (studio-ux-dev) · 14 Nov 2026 · Bug fix, Build mode (no design gate)

Read `.claude/standards/dev-standards.md` first. The sections that matter most here:
- **Quality bar**: `bash .claude/tools/check.sh` passes, no console errors, every change is undoable (anything that changes the song goes through `saveProject`), keyboard shortcuts shown in titles or hints.
- **How we build**: plain JS in the shared bundle, `python3 tools/build.py` rebuilds `index.html` (never edit it by hand). Every UI change is checked at 390 and 360 px too (`tests/phone.mjs` if it exists on your branch base).

You are studio-ux-dev: read `.claude/agents/studio-ux-dev.md` and follow it as your role. For this job you may edit `src/song.js` (the Song view, which you built in UX-1) as well as your own files. Don't touch sound generation or the AI prompt.

Repo: `/home/claude/studio-keys-repo`. Create branch `preview-ux-7` from `main` (`git checkout -b preview-ux-7 origin/main` after `git fetch`; main has the tester's new smoke check 809d713). Commit WIP as you go; do NOT push (the lead pushes).

## The bugs (tester, daily session 14 Nov; report `.claude/work/reports/QA-1-daily-2026-11-14.md`, screenshot `/home/claude/bugs/qa-2026-11-14-1/18-dblclick-then-delete.png`)

1. **HIGH: keys pressed after double-clicking a part act on the section, not the notes.**
   Steps: ask Keys for drums, a bassline and chords → Make it a song ▾ → Full track → double-click the Chords block in the Drop (the note editor opens on it) → Ctrl+A (all 20 notes highlight) → Delete.
   Happens: the Drop section is deleted (96 → 80 bars, chip "Deleted Drop · Undo"); the notes are untouched and still look selected. Backspace the same; Delete with no notes selected removes the section; Ctrl+A then Ctrl+D duplicates the section ("Break 2") instead of the notes.
   Should: while the note editor is open and in use, Delete/Backspace remove the selected notes and Ctrl+D duplicates them, exactly as in Loop mode. With nothing selected in the editor, Delete must do nothing to the song layout (no surprise section delete).
   Tester's suspect: the `#playlist` keydown handler in `src/song.js` (~line 432): after the double-click focus stays on the `.part`, a section is selected, so `songRemove(sel.id)` / `songDuplicate(sel.id)` run. The dblclick handler (~line 427) calls `songSelect` then `openEditor`.
   Fix direction (your call): when a double-click opens the editor, move keyboard focus to the editor; and/or have the playlist handler leave Delete/Backspace/Ctrl+D/Ctrl+A to the editor while it's open for that part. Whatever you pick: once the user clicks back on a section name or the song lanes (not the editor), Delete on a selected section must still delete the section as today. Space play/stop must keep working in both places.

2. **LOW: the note after importing a MIDI file in Song mode names only one of the new tracks.**
   Steps: Full track layout, select the Drop, import `tests/fixtures/test.mid` → it adds Lead and Kick, both only in the Drop, but the toast says only "Kick plays in Drop".
   Should: name every new track ("Lead and Kick play in Drop. Click their empty parts to add them elsewhere."). Suspect: the `songSync` toast in `src/song.js` (reset on each save). Keep the toast wording style of UX-5 / added parts.
   (Out of scope: the assistant's own reply saying where a part plays; that goes into AI-1.)

## Done when
- Bug 1 steps: Ctrl+A then Delete in the editor removes the 20 notes; the song still has 6 sections and 96 bars; one Undo brings the notes back. Ctrl+D duplicates notes, not the section. Delete with no notes selected changes nothing. Clicking a section name then Delete still removes the section (and Undo restores it).
- Bug 2: the toast names both tracks.
- Smoke checks added to `tests/smoke.mjs` for both (the tester suggested: double-click Chords in the Drop, Ctrl+A, Delete → expect 6 sections and 0 chord notes in that pattern; and a section Delete still works).
- `python3 tools/build.py`, then `bash .claude/tools/check.sh` passes; paste its summary.

## Note on other branches
UX-2, UX-5, UX-4 and UX-6 are waiting for the owner and also touch the Song view area (UX-2/UX-5 touch `src/studio.js`; UX-4 the phone layout). The tester says none of them change this keydown handler. Keep your change small and local to the handlers so it merges cleanly; say in the report which functions you changed.

## What to hand back
Write your report to `/home/claude/studio-keys-repo/.claude/work/reports/UX-7-build.md` (save as you go), then reply with the same content: what you changed (functions), how you tested (numbers), the check.sh summary, the branch head commit, and anything left. Keep each step small.

Commit messages end with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZARJzRgFvLd7sGMPQuG
