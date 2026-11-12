# SE-4 · Chords that sound like a producer played them (design proposal)
lead (design written from RES-4 data) · 13 Nov 2026 · size S-M

## Why
Your PML packs show what pro melodic house chords look like: wide, open voicings (low root and fifth, the third and colour notes up high), mostly plain triads with a little add9, chords that hold for 2 bars, and percussion that grooves without swinging. Our chords stack notes close together and always add 7ths and 9ths, which can sound like a keyboard preset. Only progressions and averages are used; no PML files are copied.

## Flow
1. "Make a melodic house track like Ben Böhmer." Same parts as today, but the pad plays open, spread chords: deeper underneath, airier on top.
2. "New chords" / "another progression." There are more progressions to pick from (for example i VII iv VI and VI III VII i), and in 8-bar loops chords can hold for 2 bars.
3. "Another one" on the chords. The voicing changes too, not just the notes.
4. Organic and melodic house percussion follows the pack's accent curve: straight, lightly human, with softer off-16ths.

## What changes
- `src/music.js` (sound-engine-dev): new open `voice()` mode, used by `pads`, `seventh`, `plucks332` and `sustain`; colour notes (add9 / 7th) used about 30% of the time instead of always; new `PROGS` entries; 2-bar holds in 8-bar loops.
- `src/groove.js` (sound-engine-dev): melodic and organic house percussion uses the RES-4 accent curve and about 5 ms spread. Lands together with SE-3.
- Smoke test (qa-tester): new pad chords span at least 14 semitones; a new progression can come up; "another one" changes the voicing.

## Risks
- Wider chords take up more low-mid space next to the bass: the low root goes no lower than about C3 when a bass track is playing.
- Pop and hip-hop chords could feel too spread: D1.

## Effort
S-M, about 4 hours plus a test. Best built right after SE-3 (same files, same test).

## Decisions for the owner
- **D1. Where do open voicings apply?** A) Electronic, downtempo and lo-fi styles; pop, rock and hip-hop keep today's tighter chords. **Recommended.** B) Every style.
- **D2. Chord colour.** A) Mostly plain chords with add9 or 7ths sometimes, like the pack. **Recommended.** B) Keep today's always-rich 7th and 9th chords.
