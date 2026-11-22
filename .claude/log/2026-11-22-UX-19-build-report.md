# UX-19 build report (studio-ux-dev, 22 Nov 2026)

**Branch:** `preview-ux-19`, head `58c9a46` (pushed; earlier `7446180` key fix, `d5cd469` WIP). main untouched. `bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 93 checks (91 before plus 2 new lines).

## What changed
- `src/studio.js` lines 36-55:
  - New helpers `keyedTrack` / `keyedLists()`: the note lists that follow the key (every notes track except role `drums` or a percussive instrument; main loop plus every pattern, each list once).
  - `loopKeyFor(mode)`: the loop's key from all its pitched notes with `detectKey`. It returns null below 4 notes. A relative-key reading (a C minor loop read as E♭ major) is turned into the mode the user picked, so a C minor loop going to D minor moves +2, not -1.
  - `setKey(k, {move:true})`: when the key is auto, the notes move from the detected key by the shortest way, the same as the known-key path. With a key already set, nothing changes from before. Without `move` (all the internal fill-ins: actions.js ~88 and ~123, assistant.js ~179, edit.js ~76, studio.js ~249) an auto key only sets the label, as before, so a vibe or artist key never moves sung parts. It now returns the semitones moved.
  - Key menu: `setKey(k,{move:true})` between two `undoBoundary()` calls, so it is one undo step. When the notes move it shows a toast: "Moved the notes up 2 semitones into D minor".
- `src/actions.js` line 160 (the one-line change the brief allows): `ACT.key` calls `setKey(k,{move:true})`. Its reply now says "Key D minor, notes moved up 2 semitones" when the notes moved.
- `tests/smoke.mjs`: one line added at the end (UX-19), and a second one for bug 9 (below).
- `index.html` rebuilt.

## How I tested
Headless Chrome on the built file with a C minor loop (house drums, bass C C A♭ B♭ G C E♭ G, chords Cm A♭ B♭ Gm), key auto. `detectKey` reads it as C minor.
- Key menu set to D minor: every pitched note moves +2, label "D minor", the menu shows D minor, drums are unchanged, 1 undo step, the toast shows. Undo brings back the notes, the key (null) and the menu ("Key: auto").
- Offline assistant "put it in the key of F sharp minor": notes +6, label F♯ minor, drums unchanged. Undo brings both back.
- A bass with a B pattern (Song mode), then the `key` action D minor: the main loop and pattern B both move +2.
- A sung bass ("Sung bassline", take bass) on auto, then `vibe` Ben Böhmer: the key becomes F minor and the sung notes don't move.
- Only 2 pitched notes, then key D minor: only the label is set (notes 36, 39 stay). The known-key path still works: D minor to E minor gives +2.
- C major picked on the C minor loop: notes move -3 (to the A minor / C major notes). Reply: "Key C major, notes moved down 3 semitones".
- No page errors. No sound-engine change, so I didn't render audio; the notes are only transposed.

## For the lead / other devs
- **Offline parser gap (assistant-dev, `src/maker.js` line 131):** "set the key to F sharp minor" (and "change the key to …", "set the key to F# minor", "make it F sharp minor") parses to no action offline. "put it in F sharp minor", "key of …" and "in the key of …" do parse. So the smoke line uses "put it in the key of F sharp minor". Suggested one-line fix for assistant-dev: let the key regex accept "key to" / "key into" (e.g. `(?:in|key of|key(?: to| into)?)\s+…`), then add "set the key to F sharp minor" to the smoke line. The live Llama path isn't affected. Its `key` action goes through `ACT.key`, which now moves the notes.
- No Worker change. No new action names.
- **Decision (small) for the lead:** picking the other mode (C major on a C minor loop) moves the notes to the relative pitch set (-3). After that the label and the notes agree. A real minor-to-major change (rewriting scale degrees) is a different feature. A key that was set before still moves tonic to tonic, as before (C minor to C major doesn't move). If the owner would rather keep the tonic (C stays C, label major), it's a 1-line change in `loopKeyFor`.

## Known limits
- Detection needs at least 4 pitched notes; fewer only sets the label.
- A vibe or artist key set over the user's existing parts on auto still only labels them (owner rule: sung parts keep the notes as sung). The label can then differ from what they sang, as before.

## Add-on: QA bug 9, Song view part label cut off on the left (commit `58c9a46`)
- **Cause:** `.pwo` (the "no clap, snare, kick" label at the bottom right of a part) is anchored on the right with `white-space:nowrap` and no width limit. In a narrow part it grew leftwards past the part's edge, and the part's `overflow:hidden` cut off the start ("are, kick").
- **`src/head.html` line 651:** `.pwo` gets `max-width:calc(100% - 8px); overflow:hidden; text-overflow:ellipsis; box-sizing:border-box`. The label stays inside the part and the start stays readable ("no cla…"). No colour changes; it still uses `--ink2` / `--t2`.
- **`src/song.js` line 305 (`songLaneHTML`):** song.js is not in my file list; the coordinator asked for the tooltip, and it is the only place the label is built. The label has its full text as `title`. The part button's tooltip and `aria-label` also say it: "Drums in Intro (no clap, snare, kick): click to switch off…" and "Drums in Intro, no clap, snare, kick". Screen readers now hear what is left out.
- **Tested:** headless Chrome, arranged song, drums in the Intro without clap, snare and kick, zoomed out so the part is 58 px wide. The label is 48 px wide, inside the part on both sides, clipped with an ellipsis, title "no clap, snare, kick". A short "no clap" in a wider part is not clipped. I looked at screenshots in Emerald, Velvet and Sapphire: it reads "no cla…" in all three, with the matte label background and no glow. There's a new smoke line for this.
- **Flake:** the first full check after this change had 1 FAIL in the existing line "song/loop: after typing to Keys, double-click a part or click a note gives the editor the keys" (Space didn't stop the second time). The smoke test then passed twice on its own, and check.sh passed (CHECK OK, 93). That line runs before my new ones and doesn't use the label, so it looks like a timing flake (load ~1.7-2.0). Worth a note to qa-tester if it shows up again.

## Try it (test link https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-19/)
1. Start a new song. Ask Keys for house drums, then a bassline and chords. Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. The bass and chords move to D minor (a note says how far they moved) and the drums stay the same. Press play to hear it.
3. Press Undo once. The notes go back and the menu says "Key: auto" again.
4. Tell Keys "put it in the key of F sharp minor". The parts move to F sharp minor and Keys says how far.
5. Sing a bassline on a new song, then ask for a vibe ("make it like Ben Böhmer"). Your sung notes stay exactly as you sang them.
6. Make a beat with drums and bass, ask Keys to make it a full song, then zoom out with the minus button in Song view. In the short sections, the drums' small label (for example "no clap, snare, kick" in the intro) now starts from the left and ends in "…" when there's no room. Hover over it to see the full text.
