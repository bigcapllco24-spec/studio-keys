# UX-18 branch check · qa-tester · 22 Nov 2026
Branch `preview-ux-18` at 7739b7c, clone /home/claude/sk-t9.
Baseline: main 37fe9f0 (a temporary worktree, removed after the run).

## Verdict: READY
- The header no longer moves during autosave at any width I measured, in any theme.
- The empty new song no longer hangs on "Saving…".
- Nothing scrolls sideways and nothing is cut off.
- One cosmetic note for later (problem 1).

## Problems
1. **Korean (and probably other CJK) time labels push the phone layout down 2 px when "Saved …" appears (low, cosmetic).**
   - Steps:
     1. Use Chrome with Korean as the language, at a 390 px width.
     2. Add a beat.
   - Result:
     - The label reads "Saved 오전 5:14". The status line is 17 px tall instead of 15 px, because the Hangul comes from a fallback font.
     - The buttons and the Keys box move down 2 px (2082 → 2084).
   - At 1400 px nothing below moves: the status sits in the title row, whose height comes from the song-name box.
   - en-GB ("Saved 5:13") and de-DE ("Saved 5:14") don't move at all.
   - Fix if wanted: one line in `src/head.html`, giving `.save-state` a fixed `line-height`/`height` (for example 16 px).

## What I checked (numbers)
**check.sh** (the machine is shared; other developers' Chrome jobs pushed the load to 13–36)

| Run | Load | Result |
|---|---|---|
| 1 | 33 | `FAIL test run · Runtime.callFunctionOn timed out` after 6 checks (a timeout flake) |
| 2 | 13–14, with my header probes running at the same time | 2 FAIL in the reload test: "opening the app starts a new empty song…" and "Undo right after opening a song…" |
| 3 | about 12, none of my jobs running | **PASS bundle syntax · PASS worker syntax · SMOKE OK: 92 checks · CHECK OK in 5 m 19 s** |

- In run 2, the IndexedDB copy still had the old name "Smoke sing": the rename 600 ms before the reload hadn't been stored. This is the known busy-machine flake from 15 Nov. It passed in run 3 ("reopened 'Before reload' 7 tracks, 3 sections"), and UX-18's change only touches empty songs (0 tracks).
- The new line passed in run 3: "Autosave text never moves the Studio header at 1400 px · {"tops":[1184],"mid":"Saving…","end":"Saved 5:21 AM"}".

**Header through real autosave flips.** Every width × every theme (Emerald, Velvet, Sapphire), sampled on every animation frame. The page used the app's real fonts (Manrope, IBM Plex Mono and Fraunces, loaded from npm @fontsource, because Google Fonts is blocked here). Each run covered:
- a new empty song renamed: "Saving…" → "Saves automatically";
- a beat added: "Saving…" → "Saved 5:0x AM";
- all labels set one by one: "Saves automatically", "New song", "Saving…", "Not saved", "Saved 11:52 PM", "Saved 12:52 AM", "Saved 12 Nov", "Saved 23:52".

I measured the Keys input top (page y) and the box of each of these: the song name, the status, New song, Open song…, Save, Save a copy, Download MP3, the MP3 length menu, Export for Ableton, MIDI only.

| Width | Branch: layouts seen | Keys input top | New song (x, y) | main: what moved |
|---|---|---|---|---|
| 360 | 1 | 2101 | 41, 1689 | only the status box |
| 390 | 1 | 2082 | 41, 1670 | **everything below: Keys 2059 ↔ 2082 (23 px), buttons 1647 ↔ 1670** |
| 768 | 1 | 1496 | 41, 1323 | only the status box |
| 1024 | 1 | 1203 | 41, 1083 | only the status box |
| 1280 | 1 | 984 | 41, 889 | **Keys 945 ↔ 984 (39 px); New song jumps 422,847 ↔ 41,889 (the buttons swap rows)** |
| 1400 | 1 | 945 | 542, 847 | only the status box |
| 1440 | 1 | 945 | 562, 847 | only the status box |
| 1600 | 1 | 945 | 642, 847 | only the status box |
| 1920 | 1 | 945 | 802, 847 | only the status box |

- On the branch:
  - 27 of 27 width/theme runs saw exactly 1 layout, and 0 elements moved.
  - The status is 137 px wide for every text: 19ch, with no ellipsis on any label.
  - The page `scrollWidth` equals the width at every size, so there is no sideways scroll.
  - No button goes past the song bar or the screen.
- With real fonts, main jumps at 390 and 1280. The developer saw the jump at 1400–1920 with the fallback fonts. Both cases are fixed now.
- Locales on the branch: en-GB ("Saved 5:13") and de-DE ("Saved 5:14") at 1400 and 390 show 1 layout and nothing cut off. For ko-KR see problem 1. There was no ellipsis in any locale.
- In the screenshots the header looks the same as before. At 1400+ the buttons sit right-aligned on the title row, and at 1280 and below they sit on a second row. The status is matte grey mono in all three themes.

**New empty song: "Saves automatically"**

| Case | Branch | main |
|---|---|---|
| New song button, rename | "New song" → "Saving…" → "Saves automatically", not put in the songs list | ends "New song" (a race in my test with the slow first save) |
| Change the BPM on an empty song | "Saving…" → "Saves automatically", not listed | **stays "Saving…"** (the bug) |
| Rename, then add a beat 0.5 s later | "Saved 5:00 AM", listed | same |
| A saved song with all tracks removed | still "Saved …" (it is in the list) | same |
| Rename an empty song, then open another song | label "Saved 5:00 AM" for the opened song, no stale text | same |
| Save button on an empty song | "Saved …" and the toast 'Saved "Empty F"', listed | same |

- In the header runs, the empty song went "Saving…" → "Saves automatically" at all 9 widths × 3 themes. On main it stayed on "Saving…" at all 9 widths.
- 0 page errors.

**The smoke line really runs at 1400 px**
- `tests/smoke.mjs` sets 1400×1100 at the start. Its only other viewport change (line 267, the 390 px scroll check) sets 1400×1100 back before the UX-18 line (line 426).
- I ran a copy of the smoke test that also records `innerWidth` in that line, against main's `index.html` (the copy, `tests/qa-smoke-w.mjs`, is local and not committed). That line reports `{"tops":[1184,1147],"mid":"Saving…","end":"Saved 5:29 AM","iw":1400,"vw":1400}`:
  - It runs at exactly 1400 px.
  - It catches main's 37 px jump: it was the only FAIL of 92 on main.
- Run 3 on the branch: `{"tops":[1184],...}`, PASS.

## Files
- Probes:
  - /home/claude/qa-t9/header.cjs (raw: h-branch.json, h-main.json, h-gb.json, h-ko.json, h-de.json)
  - /home/claude/qa-t9/empty.cjs (empty-branch.json, empty-main.json)
- check.sh logs: /home/claude/reports/ux18-check.log, ux18-check2.log, ux18-check3.log; the smoke copy on main: /home/claude/reports/ux18-smoke-main-1400.log.
- Screenshots: /home/claude/qa-t9/shots/:
  - branch-{360,390,768,1024,1280,1400,1440,1600,1920}-emerald.png
  - branch-1400-{velvet,sapphire}.png
  - main-*-emerald.png (before)
  - gb-*, ko-*, de-1400-emerald.png
