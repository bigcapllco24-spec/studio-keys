# UX-19 fix 1 report (studio-ux-dev, 22 Nov 2026)

All four points of the fix-1 brief are done on `preview-ux-19`, and in the tester's 16 random owner-flow runs the notes now land in the key on the label every time (16/16). One change from the brief: ties between keys with the same notes are settled first by the bass's first note, and `detectKey` is only the fallback (point 1).

**Branch:** `preview-ux-19`, head `942a487`, pushed (WIP `79b7181` before it). `main` untouched. `bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 94 checks (93 before plus 1 new line; the label line is extended). Machine load was 0.4-3.3.

## Fixes
1. **Wrong starting key on generated loops** (`src/studio.js` lines 40-62). `loopKeyFor` is replaced by `loopKey()`, which returns the key the notes are actually in:
   - **(a) Generator memory.** While the key is auto, `noteGenKey` (called at the top of `addTrack`, line 27) saves the key a generated pitched part was written in (`projectKey()`) as `PROJ.genKey`.
     - The first one holds as long as the notes still fit it. This matters because a generated melody can tilt `projectKey()` to the relative major.
     - `loopKey` uses `PROJ.genKey` first whenever its scale share is within 2% of the best key's.
     - `PROJ.genKey` is saved with the song and comes back with undo. Choosing "Key: auto" again stores the key that was set.
   - **(b) Otherwise, scale share.** It takes the key with the most note time in its scale (`keyShare`, duration-weighted, all 24 keys). For ties, which happen whenever a key and its relative have the same notes:
     - The bass's first note (the downbeat root) decides first. If there's no bass, the lowest note at the first downbeat of the pitched tracks decides.
     - Then `detectKey`, then whichever tonic and fifth sound longest.
     - **Differs from the brief:** you asked for `detectKey` alone to break ties. I measured it on 60 generated loops with the memory turned off: `detectKey` as tie-break was right 33/60, tonic weight 41/60, the bass's first note 58/60. Both misses either keep the right tonic (A major for A minor, which moves the same distance) or are a lofi A-major loop read as F♯ minor.
2. **A key inside a request for something else no longer moves anything** (`src/actions.js`: 1 line inserted at 525, line 160 changed).
   - `runActions` records the batch's action types in `BATCH.types`.
   - `ACT.key` uses `move:true` only when the batch has no `vibe`, `style`, `add_*`, `vary`, `again`, `notes`, `sing`, `drum_pattern`, `convert`, `arrange`, `section` or `new_project`. Otherwise it only sets the label, like `vibe`.
   - "set the key"-only batches still move, and so do key + tempo/mix batches.
   - Tell assistant-dev: these are the only two actions.js lines, and the insert sits right after the `const acts=orderActions(...)` line in `runActions`.
3. **Mode change keeps the tonic** (lead decision). From auto, the notes move by the tonic difference from the key they're in, never to the relative key. Auto C minor with C major picked moves 0 (label only); D major moves +2. A key already set behaves the same, as before.
4. **Nits:**
   - A label-only pick shows a toast: "Key set to D minor, notes unchanged", or just "Key set to D minor" on an empty song.
   - When audio tracks exist, the toast and Keys' reply add ", audio parts stay as recorded".
   - The "no …" part label is hidden below 50 px (new class `pslim` in `src/song.js` line 305, kept up to date on zoom in `songRelayout` line 354; CSS in `src/head.html` line 652). It is still clipped with "…" from 50 px up, and the full text stays in the tooltips.

Files: `src/studio.js`, `src/actions.js` (2 lines), `src/song.js` (2 lines), `src/head.html` (1 line), `tests/smoke.mjs`, `index.html` (rebuilt).

## Numbers
- **16 random owner-flow runs** (offline Keys "make a house beat", "add a bassline", "add some chords", then Key menu D minor): **16/16 right**. Every run read A minor, moved +5, and ended 100% in D minor. Those runs included 4 with prog 0656 and 2 with prog 0365, which failed before.
- **Tester's search for a loop read as anything but A minor** (`c_bad`, up to 40 owner flows): found none.
- **Tester's fixed seeds** (`a8b`: house 11/21/31, dnb 17/27, techno 41, deephouse 51, melodichouse 61, afro 71 bass only, house 81 bass only, trap 91): all 12 read A minor, moved +5, 100% in D minor.
  - With the memory turned off, the scale share plus the bass's first note gets 58/60 generated loops in 10 styles.
- **Nearby checks:** `transpose` bass still +2. `vary chords` after a pick: 100% in D minor. A new bass after a pick: 100% in D minor. The editor opens.
- **Hand-made C minor loop:**
  - C major: 0, toast "Key set to C major, notes unchanged".
  - D major: +2. C minor again: 0, with the toast.
  - Set C minor, then C major: 0. Back to auto, then D minor: +2.
- **Sung bass:**
  - "add house drums in F minor" (parsed as style, key, add_drums): 0 moved, label F minor.
  - `[key F minor, vibe Ben Böhmer]` and `[vibe, key]`: 0 moved in both orders.
  - `key D minor` alone: +2. Key + tempo: +2.
- **3 notes:** unchanged, toast "Key set to D minor, notes unchanged".
- **Voice note present:** toast "Moved the notes up 2 semitones into D minor, audio parts stay as recorded"; reply "Key D minor, notes moved up 2 semitones, audio parts stay as recorded".
- **New smoke line:** house seed 21 with prog 0656. `detectKey` reads it as G major. The saved key and the no-memory read are both A minor. The menu moves +5 and the notes end 100% in D minor. A major picked moves 0 with the toast. The sung bass stays put after "add house drums in F minor".
- **Label smoke line (extended):** the part at 46 px hides the label.
- No page errors. The only console error was the sandbox's blocked network fetch. No sound-engine change.

## Known limits
- The offline parser still doesn't understand "set the key to F sharp minor" (assistant-dev, `src/maker.js` line 131; one-line fix suggested in the UX-19 build report).
- "add a bass in D minor" over generated parts in A minor now only sets the label (as on `main`), so the new bass is written in D minor over the A minor parts. That's the owner rule's trade-off: a key named inside a part request never moves existing notes.
- A user part with no generated parts, where the bass's first note isn't the tonic, can still be read as the relative key. The move distance is then off by 3. This affects sung or played material only.

## Try it (test link https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-19/)
1. Start a new song. Tell Keys "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. A note says the notes moved up 5 into D minor. Play it: the bass and chords sound right together in the new key, and the drums didn't change. Press Undo once and it's back as it was, on "Key: auto".
3. Try steps 1-2 again with two or three new songs. Every time, the parts land in the key you picked.
4. Pick "A major" on that A minor loop. The notes don't move; the note says "Key set to A major, notes unchanged".
5. On a new song, sing a bassline, then tell Keys "add house drums in F minor". Your sung notes stay exactly as you sang them; only the key label changes.
6. Make it a full song and zoom out in Song view. In short drum parts, the "no clap…" label shows its start and ends in "…", disappears when a part gets very narrow, and the full text is always in the hover tooltip.

## Fix 1b (22 Nov 2026, after the tester's re-check marked fix 1 READY)
Head `288e3af`, pushed on `preview-ux-19` (never main). `bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 94 checks (the fix-1 smoke line now covers both changes below). Load 0.2-5.3.

1. **The remembered key went stale** (`src/studio.js`). New `genKeyLive()` returns `PROJ.genKey` only while a generated pitched track (`t.gen`) is still in the song. `loopKey` and `noteGenKey` both use it, so a new generated part after the old ones were removed records a fresh key.
   - Tester's case (drums plus generated bass and chords, remove the bass and chords, add your own melody C E G C G E F D C E G C, pick D major): **+2, 100% in D major** (before: +5, 33%).
   - Editing a generated part in the note editor clears its `gen` flag, so that loop falls back to scale share plus the bass's first note (58/60 earlier).
2. **A key whose scale already holds the notes only changes the label** (lead decision). In `setKey`, if the picked key's scale holds at least 98% of the pitched note time (and there are at least 4 notes), the notes don't move and the toast says "Key set to C major, notes unchanged". This applies from auto and on a key that was already set. Otherwise the tonic rule applies as before.
   - Prog-0656 A minor loop, C major picked: 0, with the toast.
   - Set A minor, then C major: 0.
   - A major picked: 0 (tonic rule). D minor: +5, 100%.
   - **Side effect for the lead:** a bass-only loop often uses so few notes that it already fits the picked key. The tester's fixed seeds afro 71 and house 81 (bass only, A minor) now stay put when D minor is picked. The label changes and the notes are 100% in D minor, but the bass still centres on A. The other 10 fixed seeds (bass, chords, melody) move +5 to 100% D minor as before. If the lead wants sparse parts to move anyway, the rule could apply only when 3 or more tracks or 5 or more different notes are present.

**Regression numbers:**
- 16 random owner-flow runs: 16/16 right (+5, 100% in D minor).
- Hand-made C minor loop: C major 0 (toast), D major +2, C minor again 0, set C minor then C major 0, back to auto then D minor +2.
- Sung bass: "add house drums in F minor" 0; key then vibe 0; vibe then key 0; key alone +2; key plus tempo +2.
- 3 notes: unchanged with the toast.
- Voice note: toast and reply add ", audio parts stay as recorded".
- No page errors.

## Try it, updated (test link https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-19/)
1. Start a new song. Tell Keys "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. A note says the notes moved up 5 into D minor. Play it: the bass and chords sound right together in the new key, and the drums didn't change. Press Undo once and it's back as it was, on "Key: auto".
3. Pick "C major", which uses the same notes as A minor. Nothing moves; the note says "Key set to C major, notes unchanged". Pick "A major": nothing moves either (same root note).
4. Remove the bass and chords, then play or draw your own C major tune on a new track. Pick "D major": your tune moves up 2 and fits D major.
5. On a new song, sing a bassline, then tell Keys "add house drums in F minor". Your sung notes stay exactly as you sang them; only the key label changes.
6. Make it a full song and zoom out in Song view. In short drum parts, the "no clap…" label shows its start and ends in "…", disappears when a part gets very narrow, and the full text is always in the hover tooltip.

## Fix 1c (22 Nov 2026, lead: the bass-only side effect of 1b isn't OK)
Head `1204291`, pushed on `preview-ux-19` (never main). `bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 94 checks. The first run had 2 FAILs in the reload test ("opening the app starts a new empty song…" and "Undo right after opening a song…", smoke line 261). These don't touch the key code; the next smoke run and the next check.sh both passed in full, so it's a timing flake.

- **Change** (`src/studio.js`, `setKey`): the 98% scale-share rule is gone. Only the relative key now changes just the label: the picked key has the other mode and the same scale as the key the notes are in (A minor and C major, D minor and F major, and so on). The notes' key is `loopKey()` on auto, or the key that was set. Every other pick follows the tonic rule.
- **Numbers:**
  - The tester's fixed seeds afro 71 and house 81 (bass only, A minor) move +5 into D minor again (100% in D minor). All 12 fixed seeds now move +5 to 100% D minor.
  - Prog-0656 A minor loop, C major picked: still 0 with "Key set to C major, notes unchanged". Set A minor then C major: 0. A major: 0 (tonic rule).
  - Owner flow, 16 random runs: 16/16.
  - Stale-key case (generated parts removed, own C major melody, pick D major): still +2, 100% in D major.
  - Hand-made C minor loop: C major 0, D major +2, back to auto then D minor +2.
  - Sung bass with "add house drums in F minor": 0.
- **Smoke line:** adds a bass-only A minor loop (house seed 81/82). D minor gives +5 and 100% in key.

## Try it, final (test link https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-19/)
1. Start a new song. Tell Keys "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. A note says the notes moved up 5 into D minor. Play it: the bass and chords sound right together in the new key, and the drums didn't change. Press Undo once and it's back as it was, on "Key: auto".
3. Pick "C major", which uses the same notes as A minor. Nothing moves, and the note says "Key set to C major, notes unchanged". Pick "A major": nothing moves either (same root note).
4. Remove the bass and chords, then play or draw your own C major tune on a new track. Pick "D major": your tune moves up 2 and fits D major.
5. On a new song, sing a bassline, then tell Keys "add house drums in F minor". Your sung notes stay exactly as you sang them; only the key label changes.
6. Make it a full song and zoom out in Song view. In short drum parts, the "no clap…" label shows its start and ends in "…", disappears when a part gets very narrow, and the full text is always in the hover tooltip.

## Fix 1d (22 Nov 2026, tester re-check 2: later picks moved from the label)
Head `ebdffc1`, pushed on `preview-ux-19` (never main). `bash .claude/tools/check.sh`: CHECK OK, SMOKE OK 94 checks. The first run of this round only failed on a quote typo in my new smoke label, which I fixed.

- **Change** (`src/studio.js`): every key pick now moves from the key the **notes** are in, never from the label.
  - New `PROJ.noteKey` is set on every pick: `{tonic:k.tonic, mode:from.mode}` after a move or a same-tonic mode change, and unchanged by a relative relabel. It is part of the song, so undo and redo restore it with the notes and the label.
  - New `notesKey()` decides where a move starts:
    1. `PROJ.noteKey`, while the notes still fit it (scale share within 2% of the best key);
    2. then the label, if the notes fit it (songs saved before this change);
    3. then the notes read again with `loopKey()`;
    4. with fewer than 4 notes, the last known key.
  - Going back to "Key: auto" keeps `noteKey`. The old "auto stores the label as genKey" line is gone.
  - A `setKey` call without `move` (internal fill-ins, vibe/artist keys, a key named inside a part request) never moves notes, now also when a key was already set. On `main`, "add house drums in F minor" on a song with a set key transposed everything. On a song with no notes yet it clears `noteKey`, so new parts follow the label.
- **Numbers:**
  - Prog-0656 A minor loop on auto (smoke): C major → A major → D minor gives 0, 0, +5, with 100% in D minor. One undo goes back to A major with the notes as before and `noteKey` A minor. C major → auto → D minor gives 0, 0, +5, 100%.
  - The tonic-rule case A major → D major still gives 0 then +5 (notes in D minor, label D major, accepted). Undo after each run returns to auto with the notes as before.
  - Set A minor then C major: 0. C major alone: 0 with the toast. A major alone: 0.
  - Owner flow, 16 random runs: 16/16. Fixed seeds: 12/12 move +5 to 100% D minor, including the bass-only afro 71 and house 81.
  - Stale-key case (own C major melody, pick D major): +2, 100%.
  - Sung bass with "add house drums in F minor": 0 on auto, and 0 after the key was set to D minor. Key alone: +2. Key plus tempo: +2.
  - 3 notes: unchanged with the toast. Voice note: ", audio parts stay as recorded".
  - Hand-made C minor loop: C major 0, D major +2, back to auto then D minor +2.
  - No page errors.
- **Smoke:** the fix-1 line now also checks both sequences, undo of the sequence (notes, label, `noteKey`), and A major → D major.

## Try it, final (test link https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-19/)
1. Start a new song. Tell Keys "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. A note says the notes moved up 5 into D minor. Play it: the bass and chords sound right together in the new key, and the drums didn't change. Press Undo once and it's back as it was, on "Key: auto".
3. Pick "C major", which uses the same notes as A minor. Nothing moves, and the note says "Key set to C major, notes unchanged". Pick "A major": nothing moves either (same root note).
4. Remove the bass and chords, then play or draw your own C major tune on a new track. Pick "D major": your tune moves up 2 and fits D major.
5. On a new song, sing a bassline, then tell Keys "add house drums in F minor". Your sung notes stay exactly as you sang them; only the key label changes.
6. Make it a full song and zoom out in Song view. In short drum parts, the "no clap…" label shows its start and ends in "…", disappears when a part gets very narrow, and the full text is always in the hover tooltip.
