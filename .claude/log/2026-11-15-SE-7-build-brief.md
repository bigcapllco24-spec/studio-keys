# SE-7 phase 7a build brief (sound-engine-dev, Build mode) · 15 Nov 2026

Read `.claude/standards/dev-standards.md` first. Most relevant: "Production and assistant rules" (the new 14 Nov SE-7 line), "How we build", "Quality bar" (check.sh, undo, no hard-coded colours: all colours from CSS variables, Emerald/Velvet/Sapphire themes, matte), and the UX-4 note (UI checked at 390 and 360 px too).

## The job: phase 7a only, "Honest key" (the bug fix), on its own test link
The approved proposal is `.claude/work/proposals/SE-7.md`; build section 4 "7a · Honest key" and flow section 2A. Do NOT build 7b or 7c yet (they come next, together, on the same item).

## The owner's choices (gate 1, 14 Nov)
- Phases: all three; 7a (the bug fix) on a test link first, then 7b + 7c together.
- DJ key: yes, labelled "DJ key" (never "Camelot", a trademark). In 7a, `djKey(k)` exists and the chip/popover may show "DJ key 9A" small.
- Live mic listening: later, as phase 7d.
- Owner note: "If user wants the same melodies or chords, it lets them do it - the user has a free pass." (Applies to 7b/7c: if the user asks for the same melody or chords as a song they dropped in, Keys does it. Nothing to build for it in 7a; just don't add a refusal anywhere.)

## Files
Your own: `src/music.js` (detectKey v2, pitchedNotes, keyStatus, projectKey, djKey, migration).
This brief gives you explicit permission for the small 7a parts the proposal assigns to the others, so one person builds 7a end to end (list every one of these changes in your report):
- studio-ux-dev's parts: the `#keyInfo` key chip + popover (`src/body.html`, `src/daw.js`, CSS in `src/head.html`), `setKey(k, from)` in `src/studio.js` and the `#keySel` choice meaning `from:'you'`, the sung-take path in `studio.js` and `transcribeTrack` in `src/edit.js` setting a soft key (`from:'notes'`), the UX-4 phone header subtitle only if it exists on `main` (UX-4 is NOT on main yet; don't build for it).
- assistant-dev's parts: `src/assistant.js` context sends `keyStatus()` instead of "auto (A minor)"; `src/actions.js` generators that pick a key on an empty song set `from:'keys'` and `vibe` sets `from:'vibe'`; ONE or two short sentences in the Worker prompt (`cloudflare/worker.js`) so "what key is this" is answered from the status honestly. Keep worker.js free of backticks and `${`. Keep these edits minimal: assistant-dev is building AI-1 in parallel on another branch in the same files.
- `tests/smoke.mjs`: add the 7a smoke lines (empty song says "no key yet"; F major chords + bass → a new melody uses only F major notes; a 3-note hum does not lock the key; an old song reopens without its parts moving).

## How
- `git -C /home/claude/studio-keys-repo pull --rebase`, then `git checkout -b preview-se-7 origin/main`. Commit WIP and `git push origin preview-se-7` at checkpoints. Never push `main`.
- Rebuild with `python3 tools/build.py`; `bash .claude/tools/check.sh` until CHECK OK.
- Take two screenshots of the new key chip (desktop 1400 wide, and 390 px) in headless Chrome for the owner and save them as WebP under `/home/claude/se7-shots/` (e.g. `key-chip-desktop.webp`, `key-chip-phone.webp`). Don't commit them.
- Save your report to `.claude/work/reports/SE-7a-build.md` on the branch (what changed by file, which files outside your own you touched and why, test numbers, what's left for 7b/7c), commit and push.
- Final message: the report, the branch head, and 3-5 "try" steps written for a musician for the test link https://studio-keys.bigcapllco24.workers.dev/p/preview-se-7/ (note: the Worker prompt sentence isn't live on the test link; the offline brain and the chip are).
