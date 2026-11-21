# UX-18 build report · studio-ux-dev · 22 Nov 2026

**Result:** fixed. Autosave no longer moves anything on screen at any width. Branch `preview-ux-18` is pushed, head **7739b7c** (2 commits on top of origin/main c1ed5d9). main was not touched.

## What changed (4 files, +9/-4)
- `src/head.html` (1 line): the save status (`.save-state`) is now a fixed-width box, 19 characters wide. That fits the longest label, "Saves automatically". It also has no wrapping, an ellipsis as a safety net for long locale times, and tabular numbers. The look is unchanged: same font and colour (`--muted`).
- `src/daw.js` (1 line): fixes a related bug I found while testing. If you changed a brand-new empty song (for example, renamed it), the header showed "Saving…" forever, because the quiet autosave skips empty new songs without updating the label. It now goes back to "Saves automatically".
- `tests/smoke.mjs` (+5): a new line, "Autosave text never moves the Studio header at 1400 px". It cycles all six status texts and a real Saving… → Saved flip, and checks that the Keys input top never changes.
- `index.html`: rebuilt with `python3 tools/build.py`.
- Nothing in the toast code was touched, so the UX-15 merge should be clean. My only `head.html` change is the one `.save-state` line.

## Measurements
I measured the Keys input top (page y) while setting the status to "Saves automatically", "New song", "Saving…", "Not saved", "Saved 11:52 PM", "Saved 12:52 AM", "Saved 12 Nov" and "Saved 23:52".

| Width (px) | Before | After |
|---|---|---|
| 360 / 390 | stable at 2066 | stable at 2066 |
| 768 | stable at 1477 | stable at 1477 |
| 1024 | stable at 1189 | stable at 1189 |
| 1280 | stable at 974 | stable at 974 |
| 1400 / 1440 / 1600 / 1920 | **jumped 974 ↔ 937 (37 px)**; New song button x moved 41 ↔ 516 at 1400 | stable at 974 |

- 1920 also jumped before the fix: the page is width-capped, so it behaves like 1400.
- After the fix, the status box is 137 px for every text at every width. There is no horizontal scroll at 360 or 390.
- The button row now always sits on a second line at desktop widths. That is how it already looked whenever the status read "Saved …", which is the normal state.

## How I tested
- Real autosave flip in headless Chrome:
  - Empty song: "Saving…" → "Saves automatically". The Keys input stayed at 974.
  - Song with a drums track: "Saving…" → "Saved 3:57 AM". The Keys input stayed at 974/974/974.
  - Passed in all three themes (Emerald, Velvet, Sapphire).
- `bash .claude/tools/check.sh`:
  - **CHECK OK, 92 smoke checks** (run 5). The new line passed: `{"tops":[1184],"mid":"Saving…","end":"Saved 4:06 AM"}`.
  - Runs 1–4 failed because the machine was overloaded, not because of this change. The load average was 14–17 on 2 cores, with UX-15's check running at the same time.
  - In those runs, Puppeteer hit its 180 s protocol timeout inside the existing MP3 render tests.
  - Run 4 also failed once on the "after typing to Keys, double-click a part…" focus test. It passed in runs 2 and 5, so it is timing-sensitive.

## Try it (for a musician)
1. Open the test link on a laptop or wide window, then type a new song name or add a beat. Watch the header while it says "Saving…" and then "Saved …": the buttons and the Keys box stay put.
2. Click New song and rename it before adding anything. The label goes back to "Saves automatically" instead of hanging on "Saving…".

## Known limits / for the lead
- For QA (`tests/**` belongs to the tester): the MP3 smoke tests can go past Puppeteer's default 180 s protocol timeout on a busy 2-core machine. A `protocolTimeout` in `tests/smoke.mjs`'s launch would stop these false fails.
- A very long localized time label would be cut off with "…" rather than reflow the header. No common locale reaches 19 characters.
