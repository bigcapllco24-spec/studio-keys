# UX-10 re-check after fix 1 · 15 Nov 2026 · qa-tester · `preview-ux-10` @ bde321f

**Verdict: NOT READY.** Everything fix 1 set out to fix is fixed. Imports match `main` note for note, a gating mic keeps repeated notes apart, the end of a take is no longer cut, and Stop during the tail cancels cleanly.

One problem is left, and the owner's own try step would hit it. **Hold each sung bass note with only a short breath between notes, and the take stutters exactly as before** (12-14 notes, 4-6 doubled, 0 of 8 on the beat).
- The recording is clean (no holes, nothing cut).
- `audioToNotes`' level gate sits above every frame, so the analysis finds 0 notes. The take then falls back to the old live pitch tracker.
- This isn't new: `main` does exactly the same. But it's the symptom UX-10 promises to fix, and the try step says "hold long notes".
- It's a one-line fix in `src/edit.js` (details in bug 1).

## Bugs

1. **Held notes with short breaths (or any audio that is sound most of the time) give 0 notes from the recording. The take falls back to the live tracker and stutters.** · studio (`src/edit.js` `audioToNotes`) · HIGH for this item · not a regression (`main` is identical)
   - Steps: drums like Ben Böhmer → "let me sing the bassline" → hold each note for most of 2 beats with a short breath between notes.
   - My test singer sang 8 notes, 1.8 of every 2 beats (about 0.1 s gaps), with a -54 dB noise floor and a busy page.
   - Expected: 8 notes on 0, 2, 4 … 14.
   - Actual on the branch:
     - 1.8 beats: 12 and 14 notes, 4 and 6 doubled, 0 of 8 on the beat (`a2n` found 0).
     - 1.7 beats: 10 and 12 notes, 2 and 4 doubled, 0 on the beat.
     - 2.0 beats (true legato): 7 and 8 notes, 0 on the beat, wrong pitches.
     - 1.5 beats: 8 of 8 on the beat, 0 doubled.
     - 1.0 beat: 8 of 8 on the beat, 0 doubled.
   - `main`, 1.8 beats: 13 and 12 notes, 5 and 4 doubled, 0 on the beat. The same.
   - The same cause hits imports.
     - A dense bounce (32 notes of 0.2 s, 40 ms gaps, no silence before or after; file `/tmp/qa/ux-10-retest/stacc-mixed-40-long.wav`): Import → Turn into notes gives no notes track at all, on main and on the branch.
     - The same 8 notes with 0.3 s of silence at each end give 8 notes.
   - Cause: `gate = max(0.006, rs[20%]*3, rs[97%]*0.07)`. When fewer than about 20% of the frames are quiet, the 20th-percentile frame is a sung frame. Three times its level is above the loudest frame (for the dense file: p20 0.156, so the gate is 0.469, while the loudest frame is 0.264). No frame counts as voiced.
   - Fix idea, tested only on these two signals: cap that term, `Math.min(rs[20%]*3, rs[97%]*0.25)`. It gives held 8/8 and dense 32/32 on the branch build. The developer needs to rerun the import, staccato and sing.wav checks with it.
   - Smoke line added (fails now, on main too): "held sung notes with short breaths, and a dense bounce, are still turned into notes" → `held 0/8, dense 0/32`.

2. **On the first playback after a take, the opening notes of the new part don't play** · studio (`src/studio.js` `TAKE.end`/`finish`) · LOW · made worse by fix 1
   - Steps: drums → "let me sing the bassline" (2 bars) → listen to the first loop pass after "Take saved … It's playing back now."
   - The take now finishes 0.15-0.27 s after the loop restarts (0.37-0.46 s with Bluetooth-like 0.25 s output latency). The scheduler has already passed that point, so notes there are skipped on that pass only.
     - Branch: the note on beat 0.25 was missing on pass 1 in 3 of 3 runs.
     - Branch with Bluetooth: the notes on beats 0 and 1 were missing in 3 of 3 runs.
     - From pass 2 on, everything plays.
   - `main` finished 0.01-0.07 s after the restart. From reading the code, it can only lose a note exactly on beat 0.
   - Fix idea: in `finish`, schedule the new part's notes that start between `now` and `TR.schedT` (the scheduler already passed them). Start a held note that has already begun late, instead of skipping it.

3. **ScriptProcessor fallback: improved, still limited** · LOW (no current browser uses it; agreed as a known limit)
   - Load 14-19 on 2 cores, light busy page.
   - Fake mic: 10, 10, 10, 11, 12 notes, 0 same-pitch doubles. The 2 bad takes have about 0.5-0.7 s of audio spliced in twice (`36 40 36 40`, an extra `43@0.5`).
   - Singer locked to the beat: 8/8, 8/8, 8/8, 7/8, 4/8 on the beat, with 1-3 extra notes 250-470 ms off.
   - First check: 0 notes in the recording in 5 of 7 takes. Better now.

## Fix 1 items, re-checked

| Check | Result |
|---|---|
| Import → Turn into notes (melody, bass, chords) on stacc-20/40/80, stacc-mixed-40, a hard-edged stacc-mixed-40, sing.wav | **18 of 18 identical to `main`** note for note (melody/bass: 7, 8, 8, 8, 8, 6; chords 3, 3, 3, 12, 12, 18). Done through the track's "♪ Turn into notes…" menu. |
| Smoke "import: 8 notes on one pitch … stay 8 notes" | PASS `{"20 ms":8,"40 ms":8}` |
| Gating fake mic (stacc-mixed-40, 4-bar melody ×3) | 24, 24, 24 notes. The pairs AA CC GG AA stay 2 notes each; 0 patched. Hard-edged file: 24, 25, 24, 0 patched. `main`: 14, 14, 19, with 0 found in the recording. |
| Take end not cut | Missing audio at the end of the window was **0 ms in all 39 worklet takes** (fake mic, gate, synth singer, heavy, Bluetooth) and in all 10 fallback takes. First check: 68-451 ms. |
| Bluetooth-like 0.25 s latency with pickups on 14.5 and 15.5 (melody ×3) | 9 of 9 on the beat in 3 of 3 takes. Both pickups land (`14.5/0.75`, `15.5/0.25`). `main`: 0 of 9 found. |
| Stop during the tail (after the last beat, before analysis) | Cancelled, 0 finishes, no track, mic off, "Take cancelled.", no errors. Worklet and fallback. |
| Stop while draining (normal, and a drain slowed by 1.5 s) | The same, clean. Worklet and fallback. |
| Stop while draining, then "let me sing the chords" at once | The old drain doesn't finish into the new take: still recording 1.2 s later, then exactly 1 finish, with 5 chords (15 notes). |

- The last pickup comes out a 16th long (`15.5/0.25`; it was sung 0.5 beat). That's not a cut: the same happens without Bluetooth. `audioToNotes` places onsets about 30-40 ms late, which shortens short notes. Rough edge, not this branch.

## The original bug and its neighbours (worklet)

- **Fake mic sing.wav, busy page, load about 14** (`file://`):
  - bass ×5: 10, 10, 10, 10, 10 notes, 0 doubled, 0 holes, 0-2 patched;
  - "again": 10 notes;
  - chords: 10 chords, none repeated back to back;
  - melody: 10 notes, 0 doubled;
  - voice note: 0 holes.
- **Singer locked to the beat, heavy stalls + "more swing" ×3:** 8 of 8 on the beat in every take. Onsets +26 to +41 ms, the same as the first check.
- During every bass, chords and melody take only "Drums" is audible (`TAKE_GUIDE`). The voice note plays all tracks, as designed.
- Your voice is not played back live (0 `noteOn(…,'mic')`). The mic is off after every take. No raw-voice track is added.
- `TAKE.finish()` on the main thread: 0.24-1.8 s on the worklet, up to 5.0 s on the fallback, at load 14-19. Not a regression; noted in the first check.
- No page errors in any run (about 30 harness sessions, 3 checks).

## check.sh
- Run 1 (bde321f as pushed, load 0.2 → 6): **CHECK OK, 49 checks**, 4 min 05 s.
- Run 2 (+ my 2 new take lines, load 10-13): **CHECK OK, 51 checks**, 4 min 30 s.
- Run 3 (+ the dense-audio line, load 4-5): 51 PASS, **1 FAIL (intended: bug 1)** `held 0/8, dense 0/32`, 2 min 48 s.
- The save/reopen checks passed in every run; no rerun was needed.

## Smoke changes (pushed to `preview-ux-10`)
- "a sung take's last beat is recorded to the end (no audio cut at the end)": reads `TAKE_REC.tailMs` in the 5-takes line. Free. → `0 ms` ×5.
- "Stop right after a take's last beat cancels it: old take kept, mic off": one 2-bar take, about 6 s. → `{"at":0.154,"fin":0,"st":"stopped","mic":false,"same":true}`.
- "held sung notes with short breaths, and a dense bounce, are still turned into notes": offline, about 0.6 s. Fails until bug 1 is fixed (on main too).
- I didn't run the first two lines against `main`'s build. By the code, `tailMs` doesn't exist there and Stop at +5 ms comes after `finish`.

## Screenshots and data
- During a take (only Drums, "Recording take"): `/tmp/qa/ux-10-retest/lab/br-file-light-during-take.png`
- Sung bassline in the editor (10 clean notes): `/tmp/qa/ux-10-retest/lab/br-file-light-editor.png`
- After Stop during a slowed drain: `/tmp/qa/ux-10-retest/shots/stop-drainSlow-br.png` (also `stop-tail-*`, `stop-drain-*`, worklet and fallback)
- Import → melody: `/tmp/qa/ux-10-retest/shots/import-br.png`, `import-main.png`
- Per-run JSON: `/tmp/qa/ux-10-retest/lab/*.json`, `/tmp/qa/ux-10-retest/import-*.json`, `/tmp/qa/ux-10-retest/stop-*.json`
- Harnesses: `/tmp/qa/ux-10-retest/harness/` (imp, stoptail, replay, dense, gatedbg)
- Test files: `/tmp/qa/ux-10-retest/stacc-*.wav`
- Check logs: `/tmp/qa/ux-10-retest/check1.log` … `check3.log`
