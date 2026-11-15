# UX-4 build brief (studio-ux-dev, Build mode) · 13 Nov 2026, 21:20 IST

Read `.claude/standards/dev-standards.md` first. The sections that matter most here:
- "How we build": plain modern JS in the shared bundle (`'use strict'`, no modules, no frameworks, no CDN imports); search before naming a new global; never edit `index.html` by hand (`python3 tools/build.py`); the page must keep working opened as a local file.
- "Quality bar": `bash .claude/tools/check.sh` passes; every song change is undoable; three themes (Emerald default, Velvet, Sapphire), matte, all colours from CSS variables in `src/head.html` (never hard-code colours); Fraunces for headings only, Manrope for the rest; short musician-friendly labels; works from tablet to desktop; nothing over ~50 ms on the main thread.
- "How we work": reports short and honest, how you tested, with numbers.

## The job
Build UX-4, the phone layout with Keys first, exactly as approved. The approved proposal is `.claude/work/proposals/UX-4.md` (your own design, read it in full, especially sections 3-6: screens, the tab bar, mini transport, sheets, phone keyboard, editor full screen, and the build list). Your design report is `.claude/work/reports/UX-4-design.md`; audit numbers are in `.claude/work/reports/UX-4-audit-metrics.json`.

## The owner's choices (gate 1, 13 Nov 14:18 UTC, approve)
1. Phone navigation: **Tab bar at the bottom: Keys · Song · Mix · Play · More, opening on Keys, with Play always visible.**
2. iPhone talk: **Open typing and point to the iPhone keyboard's dictation mic** (free, nothing new leaves the phone) when speech recognition is missing or fails.
3. App path: **Installable web app only for now.** No store apps. The installable web app (manifest, service worker, icons, Worker routes) is a separate follow-up item, UX-6, built after this one. Do NOT build it in UX-4.

Owner's note: **"You should be able to fix the iOS bug coz it worked before."** Talking to Keys on iPhone used to work, so treat this as a likely regression on our side, not only an Apple bug:
- Look through the history of the speech code (`git log -p -- src/assistant.js src/mic.js src/boot.js`, commits b9f39ee and 4036ad3 changed singing/mic behaviour) for anything that would stop `webkitSpeechRecognition` on iOS Safari: recognition started outside a user tap, recognition and `getUserMedia` / an AudioContext fighting for the mic, the mic being switched off after singing and never released/reacquired, `continuous`/`interimResults` settings, restarting in `onend` without a gesture, audio playing while listening.
- Fix what you find so a tap on the Keys button starts listening in iPhone Safari again, keep the watchdog (restart if no result in a few seconds) and the typing + dictation-mic fallback for when it still fails (home-screen app, or no recognition at all).
- We can't run iOS here. Say plainly in your report what you found, what you changed and why you think it fixes it, and add a short "try on iPhone" step list for the owner.

## Files
Yours: `src/head.html`, `src/body.html`, `src/daw.js`, `src/edit.js`, `src/studio.js`, `src/play.js`, `src/midi.js`, `src/controller.js`, `src/mic.js`, `src/store.js`, `src/demo.js`, `src/boot.js`, and a new `src/phone.js` if you want it.
Explicitly allowed this time (keep small, list every change in your report):
- `src/assistant.js` (assistant-dev's file): the orb in the talk dock, the typing + dictation fallback, the listening watchdog, and the iOS speech fix above.
- `tools/build.py` (lead's file): only to add `src/phone.js` to the bundle order.
Not yours: sound generation, `cloudflare/worker.js`, the AI prompt, `tests/**` (the tester adds the phone smoke checks; list the checks you want in your report, the ones in section 6 of the proposal).
No new assistant actions, no prompt change, no new network calls.

## Branch
Work on `preview-ux-4` (already pushed). It starts from `main` (50b6315) plus UX-2 and UX-5 merged in (both passed the tester, both waiting for the owner's build OK), because UX-2 already fixes the phone width of the knobs and mixer strips. Repo: `/home/claude/studio-keys-repo` (already on that branch). Commit WIP at sensible checkpoints and push the branch (`git push origin preview-ux-4`), never `main`. Rebuild `index.html` with `python3 tools/build.py` before each commit.

## Must keep working
Desktop and tablet layouts unchanged (phone CSS in one block, under a phone breakpoint, e.g. `max-width: 600px` plus a coarse-pointer check where it matters). All three themes on phone. Song view (UX-1), parts, undo. Singing a part through Keys. No sideways scroll at 390 and 360 px; Keys visible on load without scrolling; no text box under 16 px; tap targets about 44 px.

## How to test
`bash .claude/tools/check.sh` must pass (paste the summary). Then headless Chrome (Playwright is pre-installed: `require('playwright')`) at 390x844, 360x780, 820x1180 and 1440x900: measure page width vs viewport, where Keys and Play sit, smallest tap target, input font sizes; walk every tab; open a part's sheet and the editor full screen; play/stop from the mini transport. Save screenshots under `/home/claude/ux4build/` (they become the owner's "what changed" pictures). Compare numbers with the audit (page 15,182 px tall, Keys at 1,718 px, 401 px wide on 360 px).

## Report (short, plain)
What you built vs the design (and anything you left out or changed, with why), the iOS speech findings and fix, every change in `assistant.js` / `build.py`, how you tested with numbers, screenshot paths, the smoke checks you want the tester to add, branch head commit, and 4-6 "try it" steps for a musician on a phone.
