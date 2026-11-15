## Fix 2 (15 Nov 2026, after the QA retest)
1. **Picking a key moves the parts when the key came from your notes** (the regression, `setKey` in `src/studio.js`). When you pick a key yourself (`from:'you'`: the `key` action or the Key menu) and the song had no set key, the parts now move from the key worked out from the notes (`keyStatus().key`), the nearest way, as a set-key move does. It is one undo step. The popover's Set still only relabels (`move:false`), and sung takes, Keys picks and vibe keys never move notes.
2. **The key chip follows piano-roll edits.** `edChanged` in `src/daw.js` now calls `renderKeyChip()` 150 ms after the last edit (debounced, so drags stay cheap). This was one small call in studio-ux-dev's file, as the brief allowed. Drawing, the transpose buttons and the arrow keys all go through `edChanged`.
3. (optional) With no key yet, the popover's button says **Close** instead of "Keep on auto" (`src/daw.js`).

Tested:
- **`bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 56 checks.** New smoke line 56:
  - A 12-note D minor hum ("D minor · from your humming"), then Keys' bass and chords: 27 notes outside C minor before, **0 after** the `key` action C minor. The hummed D4 lands on C4, and the chip says "C minor · set".
  - Undo brings back "D minor · from your humming" with D4 back in place.
  - Am–Dm–Em–Am played chords plus Keys' bass, then Key menu C minor: **0 outside C minor**, A3 lands on C4.
  - The popover's Set keeps the notes where they are.
  - Drawing Dm–B♭–F–C in the piano roll on an empty track: the chip goes from "no key yet" to "D minor · likely · or F major".
- **The tester's flow with the real hum path** (`humNote` ×12): melody, bass and chords had 11 notes outside C minor; after "put it in C minor" there were **0**. The popover now reads "Your notes sound like C minor". No page errors. `keyStatus()` takes 0.15–0.4 ms.

Known limits:
- **For the lead or assistant-dev:** the offline parser (`maker.js`) gives no action for "change the key to C minor" or "set the key to C minor". Its pattern needs "key C minor" or "in C minor". Main behaves the same, and the AI brain sends the `key` action anyway.
- The move only looks at the tonic, as the old set-key move did. D minor → F major moves the notes up 3 semitones, and so does D minor → F minor.
