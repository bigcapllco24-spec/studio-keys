# UX-19 re-check (fix 1) · qa-tester · 22 Nov 2026

**Verdict: READY.** Every problem and nit from my first check is fixed:
- The owner's flow lands in the key on the label 16/16 times.
- A key named inside another request never moves a sung part, whichever order the actions arrive in.
- Key-only requests still move the notes.
- The label toast, the audio note and the hiding of the label below 50 px all work.

I found one new, low-severity edge (problem 1 below). It can't happen in the Try steps; whether to fix it now or later is the lead's call. One side effect of the lead's tonic rule is noted for the lead (note 2).

Branch `preview-ux-19` at 942a487, clone `/home/claude/sk-ux19t` (clean, nothing committed). Load was 0.4-2.4.

## Problems

1. **Low: the remembered generator key goes stale once the generated parts are gone.** (studio-ux-dev, `src/studio.js` `loopKey` / `noteGenKey`)
   1. Start a new song with house drums, a generated bass and chords (key auto). `PROJ.genKey` becomes A minor.
   2. Remove the bass and the chords (`remove`). Only drums are left, but `genKey` is still A minor.
   3. Add your own C major melody: C E G C G E F D C E G C, starting on C.
   4. Pick "D major" in the Key menu.

   **Result:** the toast says "Moved the notes up 5 semitones into D major" and only 33% of the notes are in D major. The melody fits A minor and C major equally, and the stale memory picks A minor. Without the memory, the read is C major (lowest note on the first downbeat), which moves +2 and lands 100% in D major.

   **Suggested fix (1 line):** use `PROJ.genKey` only while at least one generated pitched track (`t.gen` and `keyedTrack`) is still in the song. Alternatively, clear it when the last one is removed.

## Note for the lead (side effect of the tonic rule, not a blocker)

2. **Picking the relative major now moves the notes.** On an auto A minor loop, picking C major moves the notes **up 3**. The toast says "into C major", but the notes are now C minor, and only 44% of them are in C major. Before the move, 100% of the notes were already in C major.

   This is consistent with the rule ("keep the tonic: the label's tonic decides"), and the same happens on a key that was already set. Still, a producer who picks C major for an A minor loop (the same notes) may be surprised.

   **Option:** if the picked key's scale already holds 98% or more of the notes, only set the label. That is a 1-line check in `setKey`. Same-tonic picks behave as the rule says: A minor to A major moves 0 and shows "Key set to A major, notes unchanged".

## Nits

3. Offline, the reply text and its chip still say the same thing ("Key G minor, notes moved down 2 semitones, audio parts stay as recorded" twice). This is the normal chip pattern, same as before.
4. Already known, for assistant-dev: offline "set the key to…", "change the key to…" and "switch to…" still do nothing.

## What I checked (numbers)

**check.sh**
- Run 1: CHECK OK, SMOKE OK 94, no FAIL, 2m27s.
- Run 2: CHECK OK, SMOKE OK 94, no FAIL, 2m30s.
- New smoke lines that pass:
  - prog 0656: `detectKey` reads G major, the memory reads A minor, the menu moves +5 and the notes are 100% in D minor.
  - Mode change keeps the tonic.
  - A sung bass is left alone after "add house drums in F minor".
  - The label hides under 50 px.
- No flakes.

**Owner flow, 16 random runs** (handleRequest "make a house beat", "add a bassline", "add some chords", then Key menu D minor)
- **16/16 right:** every run moved +5, ended 100% in D minor, and left the drums unchanged.
- The runs included 3 with prog 0365 and 1 with prog 0656, the progressions that failed before.

**More styles and seeds** (22 styles × 3 part sets: bass+chords, bass+chords+melody, chords+melody; random target tonic in the generator's mode)
- **64/66:** the move equals the tonic distance and the notes land 100% in the target key.
- The 2 exceptions are both progressive. The generator itself writes those loops only 88% and 90% in A minor (chromatic notes), and they land at the same 88% and 90% in the target. The move distance was right, so this is not a UX-19 problem.

**Without the memory** (as for songs saved before fix 1; 10 styles × 3 part sets)
- 29/30 read the same key as the generator.
- The miss is pop bass+chords (A major read as F♯ minor), the case the dev already reported.

**Saved song**
- Save, start a new song, reopen it: `genKey` is still A minor. D minor then moves +5, 100% in key.

**Undo and redo**
- 1 undo step.
- The Undo button brings back the notes and "Key: auto".
- Redo moves +5 again and shows "D minor".
- Ctrl+Z goes back to auto.

**Listening** (offline render of the owner-flow loop)
- The chroma peak moved from A to D, a measured shift of +5, matching the note change.
- Pitched parts: peak -1.0 dBFS before, -1.2 after.
- Full mix: peak -0.6 dBFS, RMS -6.6 dB, **0 clipped**, 0% silence.

**Key-only requests still move the notes**
- "put it in the key of F sharp minor": -3, 100% in key. Reply "Key F♯ minor, notes moved down 3 semitones".
- These batches each moved -2 and landed 100% in G minor: `key` alone, key + tempo, key + transport play, key + mix, key + fx.
- Typed "in G minor please": -2.
- Typed "make it 120 bpm in the key of G minor" (parses as tempo + key): -2, 120 BPM.

**A key inside another request never moves a sung part** (real fake-mic sung bass, 9 notes, key auto)
- Typed requests, which only changed the label:
  - "add house drums in F minor" (style+key+add_drums)
  - "make it like Ben Böhmer"
  - "add chords in F minor"
  - "make a techno beat in G minor"
- Batches, which also only changed the label:
  - [key, vibe] and [vibe, key] (both orders)
  - [key, add_chords] and [add_melody, key]
  - [style, key]
  - [key, vary drums]
  - [key, arrange]
- The sung notes were the same after every case, and every undo brought back the exact take and auto.
- Explicit key changes on the sung bass did move it: "put it in the key of F minor", key alone, and key + tempo each moved -4. That is expected.

**Mode keeps the tonic** (lead decision)
- Auto A minor → A major: 0, toast "Key set to A major, notes unchanged".
- The same pick on a set A minor: 0.
- A minor → D major: +5.
- Back to auto, then B minor: +2, 100% in key.
- Relative-major pick: see note 2.

**Nits from the first check, all fixed**
- Empty song: toast "Key set to D minor".
- 3 notes: unchanged, toast "Key set to D minor, notes unchanged".
- Voice note imported:
  - The menu shows "Moved the notes up 5 semitones into D minor, audio parts stay as recorded".
  - Keys replies "Key G minor, notes moved down 2 semitones, audio parts stay as recorded".
  - A label-only pick shows "Key set to A minor, notes unchanged, audio parts stay as recorded".

**Song mode with patterns** (full arrangement; Drop 2 has its own bass and chords as pattern B, layout `Drop 2:ABB`), Key menu G minor
- The main loop and pattern B (64 notes) both moved -2, 100% in G minor; the drums were unchanged.
- 1 undo step, stayed in Song mode.
- Drop 2 render: peak -0.5 dBFS, RMS -6.6 dB, **0 clipped**.
- Undo brought back the notes and patterns, auto, still Song mode. Redo moved -2 again.

**Song view label**
- Desktop, part 58 px: "no clap, snare, kick" is 48 px wide, inside the part, ends in "…"; "no clap" fits. Same in Emerald, Velvet and Sapphire.
- Tablet 768 px, part 46 px: the label is hidden (class `pslim`), and the full text is in the part's tooltip and aria-label.
- Zooming out and back in with `songZoom`: 149 → 60 px shown, 47/46 px hidden, 58 px and wider shown again. It updates live on zoom.
- Phone 390 px: lanes are hidden by design and the Song map shows; no horizontal scroll.

**Page errors:** none. The only console error is the sandbox's blocked network fetch.

## Try list (for the owner)

1. Start a new song. Tell Keys "make a house beat", then "add a bassline", then "add some chords". Leave the Key menu on "Key: auto".
2. Pick "D minor" in the Key menu. A note says the notes moved up 5 into D minor. Press play: the bass and chords sound right together in the new key, and the drums are the same. Press Undo once and it's back as it was, on "Key: auto".
3. Do steps 1-2 again on two more new songs. Each time the parts land in the key you picked.
4. Pick "A major" on that A minor loop. Nothing moves, and the note says "Key set to A major, notes unchanged".
5. On a new song with a beat, sing a bassline, then tell Keys "add house drums in F minor". Your sung notes stay exactly as you sang them; only the key label changes. Then tell Keys "put it in the key of G minor": now your bassline moves, because you asked for that.
6. Make the loop a full song and zoom out in Song view with the minus button. In short drum parts, the "no clap…" label shows its start and ends in "…", and it disappears when a part gets very narrow. Hover over a part to see the full text.

## Screenshots (/home/claude/qa-ux19/shots/)

- r3-after-menu.png: toast after the D minor pick
- r6-audio-toast.png: label-only toast with the audio note, and Keys' reply with the audio note
- r2-sung-bass.png, r2-song-mode.png
- r-d-emerald-zoom40.png, r-d-velvet-zoom40.png, r-d-sapphire-zoom40.png, r-d-emerald-zoom100.png
- r-d-tablet-768-zoom40.png: label hidden in 46 px parts
- r-d-phone-390-songview.png

Raw results are in `/home/claude/qa-ux19/r.json`, `r2.json` and `r3.json`. The scripts are `r_main.mjs`, `r_two.mjs`, `r_label.mjs` and `r_zoom.mjs` in the same folder. check.sh logs: `/home/claude/sk-ux19t-recheck1.log` and `/home/claude/sk-ux19t-recheck2.log`.
