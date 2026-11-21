## Fix 2 · 15 Nov 2026 · sound-engine-dev

Branch `preview-se-8`, code commit 94bd1e4 (on top of the tester's 5d00345). Both items from `SE-8-retest.md` are fixed, plus the optional loop MP3 line.

**1. Hats you asked for stay when the AI answers "another one" with `add_drums` (MEDIUM, fixed).** `src/actions.js`, `ACT.add_drums`, 2 lines before the recipe:
- If the drums track already has `recipe.hatsAsked`, and this request keeps the same vibe (same style, and no other artist named), the new groove keeps those hats with `hatsAsked: true`.
- That happens when `a.hats` is missing, equals the asked hats, or the user's words have no hat words (so an AI that copies the first request's `hats` into "another one" can't undo "change the hats to 8ths"). This goes one step past the brief's rule; hat words in the request still win.
- A new artist or a new style unlocks them, as before.

**2. Hat words need word boundaries (LOW, fixed).** `hatsSaid()` now uses `\bhats?\b|\bhi-?hats?\b|\bhihats?\b|\b16(th|ths|s)?\b|sixteenth|\b8(th|ths|s)\b|eighth|…`. So "that", "what", "chat" and tempos from 160 to 169 no longer count as hat words.

**3. Loop MP3 at -1 dBFS (optional, done).** `src/studio.js` `makeMp3`, 1 line: the peak target is 0.89, as in the song MP3 (was 0.97).

**Tests (AI stubbed at `/api/assistant`, as the tester did; hat steps = the minimum over the bars)**

| Case | Before | After |
|---|---|---|
| Gapped Bodzin, then hats 16th, then "another one" as `add_drums` ref Bodzin + hats 16th, ×4 (2 runs) | 16, 8, 14, 13 · 16, 8, 12, 12; `hatsAsked` false | 16 ×8; `hatsAsked` true; rest of the groove new 8 of 8 times |
| Same, `add_drums` ref Bodzin with no hats | 12, 12, 16, 12 · 16, 12, 12, 12 | 16 ×8 |
| Same, plain `add_drums` | 12, 12, 8, 12 · 16, 8, 12, 12 | 16 ×8 |
| Asked 8ths, then "another one" as `add_drums` ref Bodzin (style hats 16th) | 13, 16, 12, 8 | 9 ×4 (8ths plus an open hat), `hatsAsked` true |
| New reference after 16ths: `add_drums` ref Ben Böhmer, then `vary` ×6 | 8, 8, 8, 8, 16, 13 | 12, 8, 13, 16, 12, 8; unlocked |
| New style after 16ths: `add_drums` style techno, then `vary` ×6 | unlocked | unlocked: 16, 16, 13, 16, 16, 12 |
| "make me drums like that" (AI hats 16th), `vary` ×6 | locked, 16 ×6 | not locked: 12, 13, 16, 12, 12, 8 |
| "what about some techno drums" (AI hats 16th) | locked, 16 ×6 | not locked: 13, 16, 12, 13, 8, 16 |
| "160 bpm drum and bass" (AI hats 8th) | locked, 9 ×6 | not locked: 11, 10, 11, 9, 10, 9 |
| "chat, give me drums like Stephan Bodzin" | locked | not locked |
| Hats named: "…with 16th hats", "hi-hats on 16ths…", "hihats on sixteenths", "16s on the hat" | locked 16 | still locked, 16 ×6 each |

- Always 1 drums track. No page errors.

**Loop MP3 (`makeMp3`, 4 loops, full mix of drums, bass, chords and melody, decoded back in Chrome; peak / RMS dBFS)**

| Mix | Before | After | Clipped |
|---|---|---|---|
| Bodzin | -0.39 / -7.2 | -1.08 / -7.6 | 0 |
| Böhmer | -0.29 / -7.0 | -0.80 / -7.5 | 0 |
| house | -0.42 / -7.1 | -0.87 / -7.7 | 0 |
| dnb | -0.14 / -9.6 | -0.68 / -10.2 | 0 |

- About 0.5 dB quieter, and now under -0.3 dBFS every time.

**check.sh:** 3 runs at load 6-12.
- Runs 1 and 3: CHECK OK, SMOKE OK 50.
- Run 2: 2 FAILs, "opening the app starts a new empty song" and "Undo right after opening a song". Both are the known load-sensitive save/reopen checks: the reload reopened the song from the step before, because the save hadn't landed yet. They passed in runs 1 and 3. This fix touches neither.
- Whole-song MP3 smoke peaks: -0.76 and -1.03 dBFS.

**Files**
- `src/actions.js` (assistant-dev's file, the lead's permission for this item): `hatsSaid` (1 line), plus 2 lines and a comment at the top of `ACT.add_drums`.
- `src/studio.js` (studio-ux-dev's file): 1 line in `makeMp3`.
- `index.html`: rebuilt.
- No Worker, `maker.js` or `tests/` changes, and no new actions.

**For the tester:** add an AI-path smoke line. Stub `/api/assistant`, ask for 16ths on a gapped Bodzin groove, answer "another one" ×3 with `add_drums` ref Bodzin + hats 16th, and expect 16 of 16 each time.

**Known limits**
- If the AI picks hats on its own that differ from the style's hats, they still stay the same on every "another one". Example: `add_drums` ref Ben Böhmer with hats 16th, with no hat words in the request. This comes from `groove.js`'s "differs from the style" rule and is older than SE-8. The rest of the groove still changes.
- "remove/mute/no hats" in `maker.js` is still for assistant-dev, as the brief says.
