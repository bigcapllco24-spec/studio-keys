# UX-10 branch check · 15 Nov 2026 · qa-tester · `preview-ux-10` @ 4d282f7

**Verdict: NOT READY. The main fix works very well, but it breaks one thing: importing a file now merges repeated notes. That needs a small fix before the owner tries it.**

With the AudioWorklet recorder, which every current browser uses:
- 17 sung bass takes with the fake mic: 0 doubled notes and 0 holes in the recording.
- A singer locked to the beat: 8 of 8 notes land on the beat in every take.

**The problem:** `audioToNotes` now treats any short run of exact digital silence (1.5-60 ms) as a recording hole. That also changes imported files.
- An imported bounce of "da da da" on one note, with 20-40 ms of digital silence between the notes, becomes **one long note**. On `main` it stays 8 notes.
- The brief's done-when said import → Turn into notes stays unchanged.

The ScriptProcessor fallback still stutters and loses the beat (bug 2, low).

## Bugs

1. **Imported audio: repeated notes on one pitch merge into one note** · studio (`src/edit.js` `audioToNotes`) · MEDIUM · regression
   - Steps: new song → Import audio → a file with the same note played 8 times (0.2 s each) and 20-40 ms of exact silence between the notes. This is what a gated synth bass or a bounce from another DAW looks like (my file: `/tmp/qa/ux-10/stacc-40.wav`) → Turn into notes… → Melody.
   - Expected: 8 notes, as on `main`.
   - Actual: 1 note, 2.16 s long. More results:
     - 20 ms gaps: 7 notes on main → 1 note.
     - A mixed file (A A C C G G A A): 8 → 4.
     - 80 ms gaps: unchanged (8). sing.wav: unchanged (its gaps are 100 ms; bass, chords and melody are identical to main).
   - Cause: the "hole" rule (exact zeros, 1.5-60 ms, between sound) can't tell a dropout from a musical gap. During a hole frame the note never ends, and for 8 frames after it there's no re-attack.
   - The take patcher (`TAKE_REC.take` → `patchHole`) has the same blind spot for a mic that gates to digital zero:
     - Test: fake mic = the A A C C G G A A file. 20-21 gaps were patched (filled with waveform) per take, and same-pitch pairs merged: 14 notes instead of about 24.
     - Real mics rarely give exact zeros, so this part is minor.
   - Fix ideas:
     - Only run the hole logic on takes (an option to `audioToNotes`; imports don't come from the recorder).
     - Or only count a zero run as a hole when the waveform is cut off (a large sample right before it, or the recorder marked it as missing with `got[]`), not when it fades to zero.
   - Smoke line added (fails on this branch, passes on main): "import: 8 notes on one pitch with short exact-silence gaps stay 8 notes" → `{"20 ms":1,"40 ms":1}`. On main: `{"20 ms":8,"40 ms":8}`.

2. **The ScriptProcessor fallback still doubles notes and loses the beat on a busy machine** · studio (`src/studio.js` `TAKE_REC` fallback) · LOW (no current Chrome, Safari or Firefox uses it; the worklet loads on both `file://` and `http://`)
   - Steps: force the fallback (`window.AudioWorkletNode = undefined` before load) → drums like Ben Böhmer → "let me sing the bassline" ×5 with the light or heavy busy page. The machine was at load 7-13 on 2 cores.
   - With sing.wav:
     - Light busy page: 3 of 7 takes had 2 doubled notes each (12/13/11 notes instead of 10).
     - Heavy busy page: 2 of 4 takes (3 and 2 doubles).
     - Each bad take had a 78-279 ms jump in the block stream that wasn't patched (over 60 ms) inside a sung note.
     - One take lost its last 980 ms.
   - With a singer locked to the beat:
     - In 5 of 7 takes the recording gave 0 notes. The block dump shows blocks repeated or shuffled by one 4096 block (85 ms) back and forth.
     - The take then fell back to the live pitch tracker: 10-15 notes, 4-7 doubled, off the beat.
     - In the other 2 takes the onsets were scattered from -460 to +840 ms.
   - That's no worse than `main` (main: 7 doubles in 5 takes, 31-70 holes per take). But it doesn't meet the brief's "and the ScriptProcessor fallback".
   - The developer measured the fallback as clean (8/8 on the beat, onsets 15-34 ms late). My machine was much busier.

## Rough edges (not blocking)
- **The end of a take is cut by 0.07-0.45 s.** `TAKE.finish()` runs as soon as the clock passes the take's last beat. The worklet's last block (up to 21 ms) and any blocks still in the message queue are lost.
  - The take is also shifted later by the latency, so its window ends `latency()` seconds after `finish` runs.
  - Measured as missing audio at the end of the take:
    - Busy page: 68-451 ms (median about 185).
    - Heavy stalls: 45-370 ms.
    - Bluetooth-like output latency (0.25 s, idle page): 248-311 ms, about half a beat at 124 bpm.
  - A note sung on beat 15 (0.9 beats long) still came out (15/0.98) in 3/3 takes, but only 0.48-0.72 beats of it were recorded. A pickup on the last off-beat would be lost with Bluetooth.
  - Fix idea: finish the take `latency() + ~0.1 s` after the last beat, or ask the worklet for a final flush before analysing.
- **`TAKE.finish()` takes 0.26-2.2 s on the main thread under load** (main 0.2-2.1 s; not a regression). The standards say about 50 ms, or show a toast or split the work.
- **Typed "Keys, again" does nothing** (`localBrain` → `[]`) on main and on the branch. Spoken it works, because the wake name is stripped. Typed "again" works. Not this branch; noting it for AI.
- "Again" after a voice note records Voice note 2 (adds, doesn't replace). That seems right for voice notes.

## check.sh
- Run 1 (load about 6): 2 FAIL, "opening the app starts a new empty song" and "Undo right after opening a song". The reopened song was the older copy ("Smoke sing"). 4 min 12 s.
- Run 2 (rerun): **CHECK OK, 48 checks**. 5 min 31 s (load 8-11).
- Both are load-related.
  - The reload check waited only 15 s for the app to file the last song, then read the older copy.
  - I raised that wait to 45 s, and the line now prints how long it took (0.0-1.0 s since then).
  - The same smoke on `main`'s build passed both checks. Its only FAIL was the new sung-bassline line, as expected.
- Runs 3 and 4, with my new import line: that line FAILs as intended (bug 1). One timing check also flaked in each run under load 10-13:
  - Run 3: "relaxed double-click (0.35 s) opens the editor".
  - Run 4: "velocity lane drag".
  - Each passes in the other runs and on main. The branch doesn't touch those files.
- The whole check takes 3:54-5:31 under today's load (over the 3-minute target; others are testing in parallel).
- The developer's new line "5 sung basslines in a row" passed in all 4 runs: 5 notes / 0 doubled / 0 holes ×5. On main: 4/1/7, 4/2/8, 2/0/5, 2/0/3, 4/0/10.

## What I checked (numbers)
Headless Chrome on 2 cores at load 6-13, 124 bpm Ben Böhmer drums, 4-bar takes.
- "Light busy" = 4-29 ms stalls every 35 ms.
- "Heavy" = 120-200 ms stalls every 600 ms.
- "Holes" = runs of 64 or more exact zeros (up to 60 ms) inside the take.

**This morning's bug (sung bass, fake mic sing.wav), worklet recorder:**

| Run | Notes per take | Doubled | Holes | Patched |
|---|---|---|---|---|
| `file://` light ×5 | 10 10 10 10 10 | 0 | 0 | 0-1 |
| `file://` heavy ×5 | 9 10 10 10 10 | 0 | 0 | 0-1 |
| `http://` (blob worklet) light ×3 | 10 10 10 | 0 | 0 | 0-2 |
| bass, "again", "again" | 10 9 10 | 0 | 0 | — |
| **main**, light ×5 | 8 9 6 10 2 | 2 2 1 2 0 | 42 69 70 47 31 | — |

- Sung chords: 10 chords, none repeated back to back. Main: 4.
- Sung melody: 10 notes, 0 doubled. Main: 5.
- Voice note (`file://` and `http://`): 0 holes. Main: 53 holes.

**Timing: a singer inside the audio clock**
- It sings every 2 beats at "beat + latency()", like a real singer hearing the beat late, with a -54 dB noise floor.
- 8 of 8 notes found and on the beat in every take (19 takes):
  - light ×4; light + "more swing" ×4; heavy ×3; `http://` ×2;
  - Bluetooth 0.25 s ×3; 5 notes ending on beat 15 ×3 (5/5).
- Raw onsets were **+26 to +41 ms** (same in every take; they include the in-page loopback and audioToNotes' onset bias). Quantized notes are exactly on 0, 2, 4 … 14.
- "More swing" changes nothing in the sung part.
- **Main:** 0 of 8 found in the recording. It fell back to the live tracker: 14/12/8 notes, 6/5/3 doubled.
- Recorder `latency()`: 0.04 s headless, 0.26 with `outputLatency` 0.25.

**Near the change (all OK):**
- During every bass, chords and melody take only "Drums" is audible (`TAKE_GUIDE` true). The voice-note take plays all tracks (by design).
- Your voice is not played back live: 0 `noteOn(…,'mic')` calls in every run.
- The mic is off after every take (`MIC.on` false, stream released).
- No audio track is added for sung parts: the only audio tracks are "Voice note 1/2".
- "Again" re-take replaces "Sung bassline" (still 1 track).
- Import → Turn into notes with sing.wav: identical to main (bassline, chords, melody note for note).
- Song-mode sung part toast (UX-5): smoke PASS in all 4 runs.
- No page errors in any session (23 harness runs, 4 checks). The only console noise is blocked fonts, plus `/api` 404s on my http server.

## Smoke and tools changes (pushed to `preview-ux-10`)
- `tests/smoke.mjs`:
  - The reload check waits up to 45 s for "New song" (was 15 s) and prints the time.
  - New line: "import: 8 notes on one pitch with short exact-silence gaps stay 8 notes". It fails on this branch until bug 1 is fixed.
- `tests/take-lab.mjs` (new; not in check.sh): the take harness I used. It runs fake mic or beat-locked singer takes, a busy page, a forced fallback, fake output latency and per-block dumps, and prints notes, doubles, holes and onset offsets per take.

## Screenshots and data
- Sung bassline in the editor:
  - `/tmp/qa/ux-10/shots/ed-br-editor.png` (branch: 10 clean notes)
  - `/tmp/qa/ux-10/shots/ed-main-editor.png` (main: 6 notes, a stub plus a double on C2)
- During a take (only Drums play, "Recording take"): `/tmp/qa/ux-10/shots/br-file-light-during-take.png`
- After the takes: `/tmp/qa/ux-10/shots/br-file-light-after.png`
- Per-run JSON (every take's notes, recorder stats, timing): `/tmp/qa/ux-10/*.json`
- Check logs: `/tmp/qa/ux-10/check1.log` … `check4.log`, `/tmp/qa/ux-10/smoke-main.log`
- Test files: `/tmp/qa/ux-10/stacc-20.wav`, `stacc-40.wav`, `stacc-80.wav`, `stacc-mixed-40.wav`
