# UX-16 · Design mode (no code) · studio-ux-dev · 22 Nov 2026
Read `.claude/standards/dev-standards.md` first (UI quality bar: three matte themes Emerald/Velvet/Sapphire, CSS variables only, no gradients/glows, no orange; Fraunces only for headings; phone layout from UX-4 stays; "Owner rules from 19 Nov 2026": more like Ableton, one element at a time).
Research pack (read it): `.claude/research/RES-7-ableton-ui-ducking-models.md`, part A (ranked 6 elements: one-screen frame, dense track lanes, control bar, bottom Clip/Device panel, vertical mixer strips, browser sidebar + hint line) and "For the devs (UX-16)".
Repo: `git clone -q https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-ux16d` (main). Study src/head.html, src/body.html, src/daw.js, src/song.js, src/studio.js.

## Owner request (19 Nov)
"The UI should still be better — similar to that of Ableton." Lead's note: propose what to improve first, one element at a time.

## Write a proposal: /home/claude/reports/UX-16-proposal.md
- Why (plain).
- The ranked plan (all steps, one line each), then the FIRST step in full detail (recommended: the one-screen studio frame on screens ≥1024 px with the controller in a drawer — or argue for another first step).
- Flow for step 1: what the user sees and does when the page opens, where Keys, tracks, editor, transport and the controller are, how they reach Sounds/Effects/Sing.
- Mockups: build static HTML mockups with the real theme variables (copy the :root and [data-theme] blocks from src/head.html) and screenshot them with headless Chrome at 1440x900 (deviceScaleFactor 2): (a) today, (b) step 1 in Emerald, (c) step 1 in Velvet, (d) laptop 1366x768. Save PNGs to /home/claude/mockups/UX-16/. Make them look like a real pro DAW, matte, dense, not AI-looking.
- What changes (files), risks (phones untouched; keyboard shortcuts; the controller stays the brand), effort per step.
- Decisions for the owner (2-3) with a recommended option each (e.g. which step first; controller drawer open or closed by default; Keys box placement: right sidebar vs bottom strip).
No product code changes. Return the proposal as your final message (list the mockup paths).
