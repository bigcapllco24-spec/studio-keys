# UX-21 branch check (qa-tester, 22 Nov 2026 ~22:35 IST)
Branch `origin/preview-ux-21` head fdcc990 (3 commits on main b5fa3f3). Own clones: `/home/claude/sk-ux21-test` (branch), `/home/claude/sk-ux21-main` (main 958e8c0), `/home/claude/sk-ux21-merge` (local merges, not pushed).

## Verdict: READY
The slow double-click is fixed in every mouse gap, stopped and playing, with no stray undo steps. Single click, keyboard, section rename and loop work as before. check.sh passes on the branch, on the merge with preview-qa-2, and on a combined merge with preview-ux-19, preview-ux-20 and preview-qa-2. Nothing blocks.

## Problems
None in UX-21. Two older issues, both the same on main. Neither blocks this item.
1. (low, pre-existing, touch) A slow double-tap of 350-450 ms between taps gives two single taps. The part switches off and back on, leaves 2 undo steps, and the editor does not open. Main and the branch behave the same. Chrome sends no dblclick at that spacing, so the `untogglePart` fallback never runs. Steps: on a touch screen (or CDP touch emulation), in Song view, tap a lit part, wait 450 ms, then tap it again. Result: the part is lit, the editor is closed, and Undo shows 2 steps. Taps 80-250 ms apart (and 350 ms while stopped) open the editor correctly.
2. (low, pre-existing, note editor, outside this item) In Draw mode, double-clicking an empty grid spot adds a note and then deletes it (daw.js:252: dblclick on a note deletes it). Net result: no note and 2 undo steps. A producer coming from Ableton double-clicks to add a note and sees nothing happen. Steps: open a bass part's editor, double-click an empty cell. Note count is unchanged and Undo gains 2 steps. Main is the same (48 -> 48 notes, +4 steps for two double-clicks).
3. (info) The known limit from the dev report doesn't match what I saw. When the second press drags off the part before release, the editor opens for the pressed part (the 700 ms memory fallback) and the part stays as it was with 0 steps. The report said nothing happens. This behaviour is fine. On main the same gesture switched the part, 1 step.

## check.sh
| build | result | time |
|---|---|---|
| branch fdcc990 | CHECK OK, SMOKE OK 92 checks, new UX-21 line PASS {150/150 ed+on 0 steps, 200/100 same, single off 1 step undone} | 2m32s (load ~0.1-2) |
| branch + preview-qa-2 a7bd0b2 (clean auto-merge) | CHECK OK, SMOKE OK 93 | 3m30s (load ~3.5, other agents' Chrome) |
| branch + ux-20 6e1b080 + ux-19 2a9e73a + qa-2 (index.html rebuilt) | CHECK OK, SMOKE OK 97 | 3m34s (load 3.8-5.3) |
The two longer runs are over the 3-minute target. They had QA-2's state waits and a loaded machine. The branch alone takes 2m32s.

**Older flaky checks:** both are covered by preview-qa-2. "opening the app starts a new empty song…" and "Undo right after opening a song…" share the `before` setup. On main it reloads after a fixed 600 ms. QA-2 (commit ac0b714 and earlier) replaces that with a wait until the saved record is in IndexedDB and the songs list, with no pending `projSaveT`. That is exactly what the developer suggested. Both checks PASS in both QA-2 merges ("Before reload" 7 tracks, 3 sections).

## Merge check
- preview-qa-2: clean auto-merge (tests/smoke.mjs, check.sh).
- preview-ux-20 (base ef6dec8, older than main): one conflict in tests/smoke.mjs. Both branches append a block at the end, so keep both. index.html auto-merges but must be rebuilt.
- preview-ux-19 (base b442b1e): one conflict in tests/smoke.mjs, the same end-of-file append, keep both. src/song.js auto-merges: UX-19 changes the part button HTML (`pslim`, tooltips, `pwo` title), not the click handlers. index.html must be rebuilt.
- Combined result: check OK 97, and the gap table on the merged build matches the branch exactly.

## Gap table (release 1 -> press 2 / press 2 -> release 2, CDP input, 1400x1100, Song view club layout, chords part in the Drop)
Cells: editor opened on that part / part still on / undo steps added.

| input | gaps (ms) | main stopped | main playing | branch stopped | branch playing | merged stopped / playing |
|---|---|---|---|---|---|---|
| mouse | 80/0 | open, on, 0 | open, on, 0 | open, on, 0 | open, on, 0 | same as branch |
| mouse | 150/150 | **LOST: closed, off, 1** | **LOST, 1** | open, on, 0 | open, on, 0 | same |
| mouse | 200/100 | **LOST, 1** | **LOST, 1** | open, on, 0 | open, on, 0 | same |
| mouse | 100/200 | **LOST, 1** | **LOST, 1** | open, on, 0 | open, on, 0 | same |
| mouse | 300/50 | open, on, 0 | open, on, 0 | open, on, 0 | open, on, 0 | same |
| mouse | 120/400 | **LOST, 1** | **LOST, 1** | open, on, 0 | open, on, 0 | same |
| touch (tap gap / hold 2) | 80/40, 150/60, 250/120 | open, on, 0 | open, on, 0 | open, on, 0 | open, on, 0 | same |
| touch | 350/120 | open, on, 0 | closed, on, 2 | open, on, 0 | closed, on, 2 | open,0 / open,0 |
| touch | 450/60 | closed, on, 2 | closed, on, 2 | closed, on, 2 | closed, on, 2 | same |
On the branch, the redo stack was kept in every mouse row (main lost it in the LOST rows). Touch at 350-450 ms is problem 1 above: pre-existing, timing-dependent, and not changed by UX-21.

## Other checks (branch)
- **Single click** (stopped and playing): the part is still on at 100 ms and switches off after the delay. 1 undo step, the editor stays closed, and one Undo restores it exactly to the start. Single tap: switches, 1 step, Undo restores.
- **Keyboard:** focus a part and press Enter. It switches at once (off by 60 ms), 1 step, and focus stays on the part. Enter again switches it back (2 steps total), and one Undo reverts only the last one.
- **Click part A, then part B quickly** (known limit): opens B's editor, A stays as it was, 0 steps. Same as main.
- **Section strip:** double-clicking the name opens rename (fast 80/30 and slow 200/100). Typing "Breakdown" + Enter renames it. Double-clicking the body loops the section (fast and slow). Both match main.
- **Song-view session** (Bodzin beat via localBrain, plus bass, chords and melody, club layout, song playing):
  - 4 relaxed double-clicks while playing (bass Drop 170/140, chords Build 220/90, melody Drop 130/260, drums Intro 200/200): all 4 opened the right editor, the part stayed on, 0 steps. On main, 3 of 4 were lost.
  - Double-click on an OFF part (Intro bass): the editor opens, the part stays off, 0 steps. On main it switched on, 1 step, no editor.
  - Triple click: the editor opens, the part stays on, 0 steps.
  - 3 single clicks, then 3x Ctrl+Z: exactly 3 steps back.
  - Rename, loop, Ctrl+D (made "Drop 3"), Alt+Right move, and + - W zoom all work.
  - Undo back to the session start took 7 steps (4 editor, rename, duplicate, move). The song is identical to the start, and redo replays all 7.
  - Save, new song, reopen: sections identical, still in Song view.
  - No page errors. The only console error is the sandbox's blocked network fetch (ERR_TUNNEL_CONNECTION_FAILED), the same on main.
  - Long tasks: 5 of 207-266 ms on the branch vs 6 of 205-392 ms on main, under load average 3-4. They come from layout and render, not the click handlers.

## Screenshots (looked at)
`/home/claude/reports/ux21-shots/`:
- `branch-s01-song-club.png` (club layout)
- `branch-s02-editor-from-dbl.png` (editor opened by a slow double-click while playing, part still lit)
- `branch-s03-editor-drawn.png`
- `branch-s04-after-single-clicks.png`
- `branch-s05-section-loop.png`
- `branch-s06-sections-edited.png` ("Breakdown", "Drop 3")
- `branch-s07-reopened.png`
- `branch-sec-fast.png` and `branch-sec-slow.png`
- `branch-editor.png`, `branch-song.png`, `branch-loop.png`
- the `main-*` equivalents, and `merged-song.png` / `merged-editor.png`

## Probe scripts (scratchpad)
`/tmp/claude-0/-home-claude/c9aab8d2-f491-5ce0-89c4-2a2d39c4016f/scratchpad/`:
- `gaps.mjs` (gap table, single, keyboard, A then B, touch)
- `sec.mjs` (section rename and loop)
- `session.mjs` (Song-view session)
- results: `branch1.json`, `main1.json`, `merged1.json`, `sess-branch.json`, `sess-main.json`

check.sh logs: `/home/claude/ux21-check-branch.log`, `/home/claude/ux21-check-merge-qa2.log`, `/home/claude/ux21-check-merge-all.log`.
