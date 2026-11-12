# AI-1 design report (assistant-dev) · 13 Nov 2026
Proposal: `.claude/work/proposals/AI-1.md` (+ .json). No code changed.
1. Adds five section actions (`arrange`, `section`, `parts`, `transition`, `loop_section`) plus `from` on `transport` ("play from the second drop"); a one-line arrangement summary goes with every request; executor rules resolve which section, ±8 bars, where "add a second drop" goes; style-family templates; arrangement hints for ~20 artists in `ARTISTS`; `maker.js` offline phrases (incl. Hinglish) checked before the "N bars" rule.
2. Llama test on Workers AI via the Cloudflare connector (nothing deployed): round 1 9/12, round 2 8/8 usable after tightening; "make the loop 8 bars" still gives `bars 8`. Latency 1.9-7.0 s singly (avg 4.1 s); 9.5 s for "full club track" with 12 concurrent requests.
3. Depends on UX-1 slice 1 (song model, Song playback, export). Asks UX-1 for `section.kind`, `section.end`, `parts[].without` and helpers (ensureSections, setSongMode, songPlay({from}), loopSection, forkPattern, songBars, flashSections).
4. Effort L, ~25 h (slice A ~18 h covers done-when). Risks: Llama slips, >8 s under load, duplicate section names, reply written before the change runs.
5. Owner decisions: D1 full-track length (rec ~3 min unless club/extended/DJ); D2 missing parts (rec add only on "full track"); D3 risers (rec drum transitions now).
Flags: needs ~8 lines of CSS in `src/head.html` at build (approve in build brief); role file says "orange accent" but standards say Velvet (used Velvet; lead to fix the role file); guard for `instrument` + artist `ref`.

## Market check (music-researcher): great 5/5 — see `.claude/work/research/market/AI-1.json`
## Lead: mismatches with UX-1 to settle in the build brief
1. "The break" when there are two: use AI-1's rule (playing, else last touched, else first). 2. `songSummary` outputs AI-1's line format. 3. One template table in `songTemplate` (AI-1's parts and transitions). 4. Add `songWriteVariant(sid, tid, events)` in song.js. 5. After singing in Song mode, return to Song. 6. Only song.js helper names. 7. `transitionEvents` lives in song.js. 8. Drop the reply bubble's Undo (toolbar chip only). Also: phone song map moves into UX-1 slice 1.
