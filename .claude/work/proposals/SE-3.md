# SE-3 · Real drummer feel in every beat (design proposal)
lead (design written from RES-3 data) · 13 Nov 2026 · size S

## Why
Your Drum Essentials pack shows how pro grooves actually breathe: hats that swell and dip across the bar, swing that really swings, live kits where the kick pushes slightly ahead. Studio Keys beats use random accents and light swing today, which is part of why they can sound "programmed". This bakes the pack's measured feel into the groove engine. No Ableton sounds or patterns are copied (licence), only averaged numbers.

## Flow
1. "Make a deep house beat." Same beat style as today, but the hats follow a real 16-step accent curve (beats 2 and 4 loudest, in-betweens softer), so it grooves instead of ticking.
2. "More swing." The off-16ths go to full triplet swing (66%), like every swung groove in the pack. Today it stops at about 60%.
3. "Make a boom bap beat" (or lo-fi, hip-hop, afro, amapiano, downtempo, melodic house: the styles marked human). The kick pushes about 10 ms early, the snare about 4 ms, hats drift more: a drummer's feel, not random wobble.
4. "Another one." Still a fresh variation each time: the curves get small random changes.

## What changes
- `src/groove.js` (sound-engine-dev): new `FEELS` table (straight, swing16, live) from `.claude/research/data/RES-3-drum-feel.json`; `makeGroove` uses its hat and perc velocity curves, picks swing16 when swing > 0.15, and uses per-role push and spread for `human` styles. `HAT_ACCENTS` goes.
- `src/maker.js` + Worker prompt (assistant-dev): "more swing" → 0.33 (today 0.2); the prompt says swing 0.33 is "full swing".
- Smoke test (qa-tester): hats in a straight house beat louder on beats 2 and 4 than on off-16ths; "more swing" puts off-16ths about 1/12 beat late; boom bap kicks average slightly early.

## Risks
- Heavier swing could feel too much on house: only when asked, or for styles that already swing (UK garage, boom bap, J Dilla-style artists). D1.
- Push-ahead timing could flam with sung or recorded parts: offsets are 4-10 ms, well under what ears hear as a flam.

## Effort
S, about 3 hours plus a test.

## Decisions for the owner
- **D1. How hard should "more swing" go?** A) Full triplet swing (66%), like the pack. **Recommended.** B) Keep today's lighter swing (about 60%). C) Two steps: "more swing" 60%, "lots of swing" 66%.
- **D2. Where does the new hat feel apply?** A) Every style. **Recommended**, since it's the biggest audible gain. B) Only styles marked human (hip-hop, lo-fi, afro, melodic and deep house).
