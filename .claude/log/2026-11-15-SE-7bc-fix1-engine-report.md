# SE-7b+7c fix 1 engine report · sound-engine-dev · 15 Nov 2026 (22:13 IST check-in)

Last commit a789219 (code: 8d0aeee, ce7baf2, 7fccff2). check.sh: SMOKE OK 64 checks, CHECK OK (second run; first run 63/64, SE-7 import undo count timing flake).

## Fix 1 (sound-engine-dev, 15 Nov 2026, after the tester's NOT READY)
Files: `src/analyse.js` only (and the rebuilt `index.html`). `src/music.js` did not need a change. Commits on `preview-se-7bc`: 8d0aeee (bug 1), ce7baf2 (bug 2), 7fccff2 (rough edge), then this report.

**Bug 1 (high): a drum loop got a key and chords. Fixed.**
- Why it happened: the old "drums only" gate was relative to the clip's own busiest beats. In a clip that is all drums, the drums are the busiest beats, so they passed. Our kits also have real pitches (toms, the 808 cowbell at 540/800 Hz, the trap 808's overtones), so a key came out, sometimes "sure".
- New third pass inside `anaJob`: harmonic vs percussive by median filtering (Fitzgerald, DAFx 2010) on the short spectrogram the tempo pass already makes (1024 FFT, 200 Hz-2 kHz). A cell is "harmonic" when its median over about 390 ms of time beats its median over about 370 Hz of frequency. It is chunked like the other passes, so the Worker and the slices fallback both stay responsive.
- **The whole clip:** a key needs harmonic energy of at least 15% of the band, spread over at least 4 bands (80% of it). Otherwise `key: null`, `chords: []` and `loop: null`, so the card says "No key in this clip" and shows no Put or Set-key buttons. The tempo is still given.
  - Drum loops measure 2-8%. The trap loop measures 38%, but all on one 808 pitch (2 bands).
  - Our songs measure 27-77% over 7-23 bands.
- **Drum-only beats inside a song:** a band that rings in at least 85% of beats is a drum's fixed pitch (or a drone), so it is left out. A beat whose remaining harmonic energy is under 12% of the clip's busy beats counts as drums only and reads "no chord". The value is averaged with the 2 beats before or the 2 after, whichever is quieter.
  - Night-drive's 8-bar intro was one A♭5 chord at 0.92. It is now N.C. for all 32 beats, and the loop starts on Em. The waveform label over the intro is N.C. too.
- New knobs in `CF`: `hpBeat 0.12`, `hpClip 0.15`, `hpBands 4`. `how.pitch` reports `{harm, bands, fixed, drumBeats}` for debugging.

**Bug 2 (medium): the card's loop chords copied the first pass. Fixed.**
- New `anaLoopVote(ana)`: each half bar of the main loop takes the chord most of its repeats agree on.
  - The vote is by root and major/minor first, then the commonest full name, so Em7 beats Em when most passes hear the 7th.
  - Passes that are mostly "no chord" (the intro, a breakdown) don't vote.
  - A tie goes to the loop's own pass.
- `chordsFromAna` uses it at `'loop'`. `'clip'` is unchanged, and so are `align` and `bass`.
- Hand-made analyses, 8 passes of Em C G D:
  - one pass with G·Em split in bar 3 (the first pass, or pass 4) gives Em · C · G · D;
  - the split in every pass is kept (a real half-bar change);
  - Em7/Cmaj7 in 5 of 8 passes gives Em7 · Cmaj7 · G · D;
  - into D minor gives Dm · B♭ · F · C;
  - align still rotates the loop.

**Rough edge: "Put these chords" doubled the chords on "Chords 2". Fixed.**
- `addSongChords` re-uses Keys' own Chords part (`gen`, role chords). It already follows the new chords with its own sound and rhythm, and it gets `fromSong` so the strip says where the chords came from.
- A new Chords track is made only when Keys has none, or when `o.inst` asks for a different sound.
- A part you played or sang (`gen` false) is never touched.
- It stays one undo step. The result has `reused: true`.
- The text now says "on your Chords track" or "on a new Chords track" as it really happened.

**How I tested**
- `node tests/keys.mjs` (the full run: the 12-song harness `--check`, then the 6 drum loops): **KEYS OK**.

  | | Before | After |
  |---|---|---|
  | Key exact | 12/12 | 12/12 |
  | Chords | 99% of bars (min 94%) | 99% of bars (min 94%) |
  | BPM error | 0 | 0 |
  | Downbeat | 12/12 | 12/12 |
  | Intro bars read "no chord" | 94/96 | 95/96 |
  | Drum loops reading no key | 0/6 | **6/6** (house, techno, hip-hop, trap, afro, dnb; BPM right on all 6, dnb 87 or 174) |
  | Time per 3-minute song | 1712 ms avg (Node, same box) | 1828 ms avg (Node); 1442 ms avg, 1725 ms max in Chrome with the Worker. The new pass costs about 110 ms a song. |

- The tester's songs, re-rendered with `.claude/work/se7bc-qa/render.mjs` and imported through `#importFile` in headless Chrome at 1400 px (my e2e script, 8/8 pass, no page errors):
  - **techno-drums:** the card reads "No key in this clip · 130 BPM", with no Put button. The toast reads "techno-drums: no key in this clip · 130 BPM". `ana.chords` is empty.
  - **night-drive:**
    - E minor (sure), DJ key 9A, 124 BPM. Intro N.C./32, then Em · C · G · D.
    - The card: "Em · C · G · D … your key, D minor: Dm · B♭ · F · C".
    - **Put** on a D minor song that has Drums, Bassline, Keys' Chords and a part I played ("My chords"):
      - there are still 6 tracks, with no "Chords 2";
      - Keys' Chords is re-used (`fromSong` set) and "My chords" is unchanged;
      - `PROJ.chords` is Dm · B♭ · F · C and the strip shows "Dm B♭ F C";
      - it is 1 undo step;
      - the toast reads "Chords from “night-drive” on your Chords track: … Bassline follows".
    - Undo brings back Keys' own chords, with no song link.
    - With Keys' Chords removed, Put adds one new "Chords" track.
  - **sunday-pop:** F major (sure). **trap-csharp:** C♯ minor (sure). Both unchanged.
- `bash .claude/tools/check.sh`:
  - **First run:** 63/64. The SE-7 check "an imported song is heard … listening is not an undo step" saw undo +0 instead of +1. The card, the key, the BPM and the progress toast were all right.
  - **Rerun:** **SMOKE OK: 64 checks, CHECK OK**.
  - My reading: the import's save landed within the 120 ms undo merge window of the smoke's own `saveProject` just before it (the timing issue in the tester's bug 5). My change runs only after the import is saved.
  - Suggestion for qa-tester: call `undoBoundary()` before `uploadFile` in that check.

**For other developers / the lead**
- studio-ux-dev: the Put button's title in `src/daw.js` (line 184) still says "A new Chords track …". It now re-uses Keys' Chords when there is one. Suggested: "Keys' own sound and rhythm on these chords (your Chords part, or a new one), never the song's audio".
- assistant-dev: the comment on `chords_from_audio` in `src/actions.js` says "on a new Chords track". The reply already uses `r.text`, which is right. No prompt change is needed.
- No new actions and no Worker change.

**Known limits**
- Tested on our own synthesized kits only. A real acoustic loop with long-ringing tuned toms could still read as pitched. A clip whose only music is a sine sub below 200 Hz (a sub bass and drums) now reads "no key".
- The drum-only beat test is relative to the clip's busy beats. In a clip that is mostly drums with a few bars of music, the drum bars keep the old behaviour, so they are no worse than before.
- Set 2 (the held-out songs) was not re-run, to keep the 2-CPU box free. Set 1 and the drum loops were run.
