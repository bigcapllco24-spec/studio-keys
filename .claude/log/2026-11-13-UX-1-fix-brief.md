# UX-1 · Build mode FIX brief (studio-ux-dev) · 13 Nov 2026, 08:20 IST check-in

Read `.claude/standards/dev-standards.md` first. Sections that matter most: "What Studio Keys is for" (owner's words: a new empty project opens by default, old songs from the list; not every song has to be 3 minutes), "How we build", "Quality bar" (44 px touch targets, themes via CSS variables, phone and tablet fit).

You are studio-ux-dev. Read `.claude/agents/studio-ux-dev.md` and follow it as your role.

## Where to work
- Worktree: `/home/claude/wt/ux-1` (branch `preview-ux-1`, tracking origin, head 92d5372). Work ONLY there. Another developer works in `/home/claude/wt/se-3` at the same time on sound/parser files; don't touch `src/groove.js`, `src/maker.js`, `src/actions.js`, `cloudflare/worker.js`.
- Your files plus `src/song.js` (new in this item). Tests: you may add smoke lines to `tests/smoke.mjs`; don't weaken the tester's checks.
- Save as you go: commit (`UX-1 fix: ...`) and `git push` at each fixed bug. Rebuild `index.html` with `python3 tools/build.py`; never edit it by hand. End every commit message with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HCuZASXv5gM1W5JsBFAK37
- Run `bash .claude/tools/check.sh` before the final push (any FAIL blocks). The other developer may run it at the same moment; if a FAIL looks like a clash over /tmp files, rerun it.

## Context
UX-1 slice 1 (Song view: Loop/Song switch, Make it a song, sections, parts, patterns) was approved at gate 1 and built by you on this branch. Two tester runs say NOT READY. Full reports: `.claude/work/reports/UX-1-test.md` and `.claude/work/reports/UX-1-test-b.md` in the main repo `/home/claude/studio-keys` (read them; your build report is `.claude/work/reports/UX-1-build.md`).

## Fix these (before the owner sees the test link)
1. **HIGH: Undo right after opening a song wipes the view.** `loadNamed` and `newSong` (`src/daw.js`) don't reset the undo history (`UNDO.stack`, `UNDO.redo`, `UNDO.last` in `src/edit.js`). Reset it whenever a song is opened or a new one starts. The tester's smoke check "song: Undo right after opening a song stays in that song" (92d5372) must pass.
2. **MEDIUM: a relaxed double-click on a part switches it off.** In `src/song.js` (part click handler around line 395), single click toggles after a 230 ms timer; a double-click with 260-450 ms between clicks (normal on tablets) toggles AND opens the editor. Fix so a double-click never leaves the part changed (e.g. undo the toggle in dblclick if the timer already fired, or keep the state from before the first click). Add a smoke line with a ~350 ms double-click.
3. **MEDIUM: Undo chip.** Clicking a part shows no chip; the old layout chip keeps its label ("Full track: …") while its Undo undoes the newer part click. Each change shows its own chip ("Bassline on in Intro · Undo"), replacing the old one, and the chip's Undo undoes exactly what it names.
4. **LOW: save label.** After opening a song from the list the header keeps "New song". Show the saved state (or nothing) after opening.
5. **LOW: tablet.** At 1024 px with touch (pointer: coarse) the section ⋯ button is 21×23 px; make it 44 px. At Fit zoom with 8 sections the names shrink to "B…", "D…"; when a section is narrow, drop the ⋯ room or use short names (Br, Bu, D1, D2…) so Break/Build and Drop/Drop 2/Drop 3 can be told apart.
6. **LOW, if quick:** give the transport readout a fixed min-width in Song mode so the BPM/key don't jump to a second row when switching Loop/Song at 1400 px.

Not in this round (later items): naming new songs by vibe and date, the phone Follow button, "RECORD IN THE LOOP" wording, swing for sung parts.

## Done when
All of 1-5 fixed (6 if quick), each checked in headless Chrome with real mouse input where it matters, smoke tests pass, check.sh passes, pushed to `preview-ux-1`.

## Report (write to `/home/claude/reports/UX-1-fix.md` and return the full text as your final message)
Short: what you changed per bug (file, function), how you checked each, check.sh summary, last commit hash on `preview-ux-1`, any `src/body.html`/`src/head.html` edits, and 5-6 "try this" steps for the owner written for a musician (on the test link https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-1/).
