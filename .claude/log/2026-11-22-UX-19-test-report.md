# UX-19 branch check · qa-tester · 22 Nov 2026

**Verdict: NOT READY.** Part (b), the label fix, is ready. Part (a), the key move, works as designed on most loops, but about 1 in 4 loops from the owner's own flow ("make a house beat", "add a bassline", "add some chords", then pick D minor) end up with the label saying D minor while the notes are in a different key. One more problem: a key named inside a request for something else can now move a sung part.

Branch `preview-ux-19` at 58c9a46, clone `/home/claude/sk-ux19t`. Machine load was 10-14 the whole time (the other tester was running).

## Problems (must fix)

1. **The Key menu (and Keys' key action) reads the wrong starting key on about 25% of generated loops, so the notes don't land in the key on the label.** (studio-ux-dev, `src/studio.js` `loopKeyFor`)
   Steps:
   1. New song. Ask Keys (offline) "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto". Keys' own reply says "Bassline on Pluck Bass **in A minor**".
   2. Pick "D minor" in the Key menu.
   3. Expected: the notes move +5 (A minor to D minor). Actual, when the random progression is i-VII-VI-VII (prog 0656): the toast says "Moved the notes down 2 semitones into D minor". The notes are now in G minor, and only 88% of them are in D minor. When the progression is i-iv-VII-VI (prog 0365), the loop reads as D minor, nothing moves and no toast shows. The label says D minor, but the notes stay in A minor (B natural against D minor's B♭, 94% in scale).
   Numbers: 16 runs of that exact owner flow with random seeds gave **4 of 16 wrong** (3 × "-2 → G minor", 1 × "0 → left in A minor"). In all 16, the notes were 100% in A minor before the pick. With fixed seeds: house 21, house 31 and dnb 27 read as E minor; house 81 bass-only read as D minor.
   Why: `detectKey` (Krumhansl correlation) favours G major/E minor or F major/D minor on these progressions, even though every note fits A minor and not those keys.
   It matters because everything made afterwards follows the label. A new melody, bass or "vary chords" is written in D minor over parts left in G minor or A minor, so any E or B♭ it plays clashes with the moved E♭ or the unmoved B. In the one case I measured (prog 0365, left in A minor, then `add_melody`), the melody used only D E F G A, so 0 of 19 notes clashed that time. The risk is real but depends on the seed. Screenshot: `c1-wrong-read-after-melody.png`.
   Suggested fix (either one):
   - (a) While the key is auto, remember the key the generators used (`projectKey()` when a generated part is made; the bass reply already names it). `loopKeyFor` should use that first.
   - (b) In `loopKeyFor`, choose among the 12 keys of the mode asked for the one with the highest share of notes in scale (weighted by duration), and use `detectKey` only to break ties. On every failing case above, the scale share picks A minor (100%) over E minor (88%) and D minor (94%).
   Then add a smoke line with a prog-0656 loop, for example `add_chords` with a fixed seed that gives 0656, as in house seed 21.

2. **A key named in a request for something else now transposes a sung part.** (assistant-dev / studio-ux-dev; `src/actions.js` `ACT.key` and `src/maker.js:131`)
   Steps:
   1. New song, house drums. "let me sing the bassline" (fake mic). Sung notes: 48,44,36,43,43,45,48,48,43. The key stays auto.
   2. Type "add house drums in F minor". Offline, this parses to `style + key:f minor + add_drums`.
   3. Actual: the sung bass is transposed into F minor. On main, the key action on auto only set the label.
   The same thing happens with an AI batch `[{key:"F minor"},{vibe:"Ben Böhmer"}]`: the sung notes move down 4 ("Key F minor, notes moved down 4 semitones"). In the other order, `[{vibe},{key}]`, they don't move. So whether your sung part survives depends on the order the AI sends the actions. "make it like Ben Böhmer" and `vibe` on its own are fine (label only, notes as sung).
   This conflicts with the owner rule from 19 Nov ("Sung parts keep the user's notes as sung") whenever the user didn't actually ask to change the key of what's there.
   Suggested fix: in `ACT.key`, use `move:true` only when the key is the whole request, i.e. the batch has no `vibe`, `style` or `add_*` action. Otherwise treat it as a fill-in, the same as `vibe`. Add a smoke line: sung bass, then "add house drums in F minor", and the sung notes stay the same.

## Decision for the lead (not a blocker, but the owner will hear it)

3. **Major/minor on an auto loop.** The dev flagged this. A C minor loop with C major picked moves the notes **down 3** (the toast says "into C major"). The bass now starts on A, so it sounds like A minor. The same pick on a song whose key was already set moves nothing (the known-key path keeps the tonic), and then only 60% of the notes are in C major. So the same menu pick gives two different results depending on whether the key was auto. I'd keep the tonic in both paths (no move, label only, the same as the known-key path), because a musician picking "C major" on a C minor loop expects it to stay on C.

## Nits

4. A pick with fewer than 4 pitched notes, or one where the loop already reads as that key, only changes the label and gives no feedback. A short toast such as "Key set to D minor (notes unchanged)" would tell the user it was heard.
5. Voice notes and other audio tracks don't move with the key, which is expected, but nothing says so when the label changes. Maybe add "(audio parts stay as recorded)" to the toast or reply when there are audio tracks.
6. The offline reply repeats itself: "Done: Key F♯ minor, notes moved down 3 semitones. A melody or hook next? … ", and the chip under it says the same "Key F♯ minor, notes moved down 3 semitones". That's the normal chip pattern, so it's fine.
7. Label at tablet width (768 px, zoomed out, part 46 px wide): both "no clap, snare, kick" and "no clap" show as just "no …", which tells you almost nothing. Consider hiding the label below about 50 px, like `.tiny`, or a shorter form such as "−clap…".
8. check.sh took 3m14s (run 1) and 8m06s (run 2), over the 3-minute target. Load was 10-14 because of the parallel tester and my own sessions, so this isn't on the dev. I'll trim it in test upkeep.
9. Known (already in the dev's report for assistant-dev): offline, "set the key to F sharp minor", "change the key to G minor", "make it F sharp minor", "transpose it to G minor" and "switch to A minor" all parse to no action. "put it in the key of…", "key of G minor", "in G minor please" and "make it in E major" do parse.

## What I checked (numbers)

- **check.sh run 1: CHECK OK, SMOKE OK 93 checks**, no FAIL. Both new UX-19 lines pass. The Space/editor flake the dev saw didn't show up. Run 2, at load 13-14 alongside my own Chrome sessions: CHECK OK, SMOKE OK 93, no FAIL, but it took 8m06s (run 1 took 3m14s).
- **(a) Key menu, owner flow** (house beat + bass + chords via offline Keys, auto key, read as A minor): D minor moves every pitched note +5, the drums are identical, 1 undo step, the toast "Moved the notes up 5 semitones into D minor" shows, and 100% of notes are in D minor.
  - Undo button: notes back, key null, menu "Key: auto". Redo button: +5 again, menu "D minor". Ctrl+Z from the keyboard: back to auto. All good.
  - Listening (offline render of bass + chords): the chroma peak moved from A to D, a measured shift of +5, which matches. Pitched peak -1.0 dBFS before and after. Full mix: peak -0.6 dBFS, RMS -6.7 dB, **0 clipped samples**, 0% silence.
- **Offline Keys "put it in the key of F sharp minor"** (from auto, A minor loop): -3 to F♯ minor, the shortest way. Drums are the same, 1 undo step, 100% in scale. Reply: "Key F♯ minor, notes moved down 3 semitones". Undo goes back to auto.
- **Song mode with patterns:** arranged full song, with Drop 2 given its own bass and chords (pattern B; layout `Drop 2:ABB`). Key menu G minor: the main loop and pattern B (64 notes) both moved -2, 100% in G minor, drums the same, 1 undo step, stayed in Song mode, 6 sections kept. Drop 2 render: peak -0.4 dBFS, RMS -6.6 dB, **0 clipped**. Undo: auto, still Song mode, 6 sections.
- **Sung bass + vibe:** a real fake-mic take (9 notes), key auto. "make it like Ben Böhmer" offline and the `vibe` action both set the label to F minor and leave the sung notes as sung. The key-in-request cases are problem 2.
- **Few notes:** 3 pitched notes, then D minor: label only, notes 36,39,43 unchanged, no toast (nit 4).
- **Key already set:** set to A minor, then the menu B minor gives +2 and the toast "into B minor" (known-key path, same as before). "Key: auto" moves nothing. Picking C♯ minor again from auto gives +2 from the detected key. All good.
- **Major/minor:** C minor (auto) to C major: -3. To E♭ major: 0. To G major: +4, 100% in scale. Known C minor to C major: 0, 60% in scale (decision 3).
- **Generated loops in 8 styles** (house, techno, lofi, pop, trap, afro, dnb, hiphop; bass + chords + melody, then D in the style's mode): drums never moved, and notes stayed in a playable range (29-86). House seed 11 and dnb seed 17 landed 84% and 89% in the target key (problem 1). The hip-hop full mix after the move: peak -0.5 dBFS, 0 clipped.
- **Near it (didn't break):** the `transpose` action still moves only the bass (+2). `vary chords` after a pick is 100% in the new key. A new `add_bass` after a pick is 100% in the new key. The note editor opens normally after a key change.
- **(b) Label:** arranged song, with the Intro drums set to no clap, snare or kick and the Build to no clap.
  - At 100% zoom (part 149 px): the full text shows, not clipped.
  - Zoomed out to 0.4 (part 58 px): "no clap, snare, kick" is 48 px wide, inside the part on both sides, ends in "…" and reads "no cla…". The short "no clap" fits (41 px).
  - Same in Emerald, Velvet and Sapphire. Matte background from `--t2`, text `--ink2`, no glow (computed: Emerald rgb(213,232,222) on rgb(11,25,20), Velvet rgb(236,216,220) on rgb(28,13,19), Sapphire rgb(214,225,240) on rgb(13,22,40)).
  - Label title "no clap, snare, kick". Part tooltip "Drums in Intro (no clap, snare, kick): click to switch off · double-click to edit the notes". aria-label "Drums in Intro, no clap, snare, kick".
  - **Phone 390 px:** the Song view lanes are hidden below 600 px by design (head.html:691, also on main), so there's no part label to clip. The Song map shows instead ("Editing parts needs a tablet or a computer"), with no horizontal scroll. Tablet 768 px: inside and clipped (nit 7).
- **Page errors:** none. The only console error was a blocked network fetch (ERR_TUNNEL_CONNECTION_FAILED; the sandbox has no internet).

## Screenshots (/home/claude/qa-ux19/shots/)

- a1-before-menu.png, a1-after-menu-dminor.png (toast), a1-after-undo.png, a2-keys-fsharp-minor.png, a5-few-notes.png
- b1-song-after-key.png, b2-sung-bass-vibe.png, b4-after-melody.png, c1-wrong-read-after-melody.png, c2-editor-after-key.png
- d-emerald-zoom40.png, d-velvet-zoom40.png, d-sapphire-zoom40.png, d-emerald-zoom100.png, d-tablet-768-zoom40.png, d-phone-390-songview.png, d-phone-390-keymenu.png

Raw results: /home/claude/qa-ux19/{a,a8b,b,c,d,d2}.json. Test scripts: /home/claude/qa-ux19/*.mjs.
