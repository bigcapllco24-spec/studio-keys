# UX-10 re-check after fix 2 · 15 Nov 2026 · qa-tester · `preview-ux-10` @ aeb73b8

**Verdict: READY.** Both bugs from the last check are fixed.

- **Held sung notes now turn into notes.** Holding each bass note 1.7, 1.8 or 2.0 beats with a short breath (or none) gives 8 notes, 8 of 8 on the beat, in 17 of 18 takes. The last check gave 0 notes and a stuttering take.
- **The first pass after a take plays the new part's opening notes.** Every note still sounding when the analysis finishes is played, none twice.
- **Nothing near it broke:**
  - Imports are identical to `main`, note for note (18 of 18).
  - Fake-mic takes give the same numbers as fix 1.
  - The mic turns off after each take, and only the drums play during a take.
- `check.sh` passes with 53 checks, including a new smoke line for bug 2.

One low note, below. It doesn't block.

## Problems

1. **One held take was split in two after an audio dropout under heavy machine load** · studio (`src/edit.js` `audioToNotes`, hole handling) · LOW · seen once, not reproduced
   - Steps: drums → "let me sing the bassline" → hold each note the full 2 beats (true legato). The machine was at load 13, from other tests running in parallel.
   - In 1 of 9 legato takes, the recorder patched one dropout (`patched 1`, gap 73 ms). The held note on beat 12 came out as `35@12/0.73` plus `35@12.75/1.25`, so one doubled note.
   - The other 8 legato takes had no patch and were clean (8 notes, 8 on the beat). So were 3 held takes on a heavily stalled page (120-200 ms stalls).
   - Likely cause: the level dip around a patched hole is read as a new attack on the same pitch. Worth a look if a user reports doubled notes on a slow laptop. It isn't new in fix 2 (the hole logic is from fix 1).

2. **Known limit, as the developer said:** a note that has already ended by the time the analysis finishes can't play on the first pass.
   - At load 11-13 the analysis took 0.2-1.0 s, after a 0.15-1.0 s drain. So the first 1-2 short notes were missed on pass 1 in 5 of 6 bass runs.
   - Every one of them had already ended (classified "ended" below).
   - Pass 2 was complete every time.

## Bugs from the last check, re-run

### Bug 1: held notes with short breaths gave 0 notes. FIXED
Synth singer locked to the beat, light busy page, bass ×3 per row, 4 bars, machine load 7-13:

| Hold (of 2 beats) | last check (fix 1) | fix 2 |
|---|---|---|
| 1.8 | 12-14 notes, 4-6 doubled, 0 on the beat | **8, 8, 8 notes, 0 doubled, 8/8 on the beat** |
| 1.7 | 10-12 notes, 2-4 doubled, 0 on the beat | **8, 8, 8, 0 doubled, 8/8** |
| 2.0 (legato) | 7-8 notes, 0 on the beat | **8, 9, 8** (the 9 is problem 1), then 8 ×6 in two more sessions, 8/8 on the beat in all 9 takes |
| 1.0 | 8/8 | 8/8 ×3 (unchanged) |
| 1.8 on a heavily stalled page | — | 8/8 ×3, 0 doubled |
| Sung melody, true legato | 5 of 8 on the beat (developer's number) | 8/8 ×2 |

- Onsets are +26 to +42 ms, as before.
- `TAKE.finish` takes 0.3-2.2 s at load 7-13.
- Dense bounce import (`stacc-mixed-40-long`, 32 notes of 0.2 s with 40 ms gaps), Import → Turn into notes: melody 32, bass 32, chords 36. The hard-edged copy gives the same. The pitch order AA CC GG AA ×4 is exact. On `main` and fix 1, this file gave no track at all.
  - Correction to my last report: this file has 0.3 s of silence at each end, not none. It is still under 20% quiet, which is what triggered the bug.
- Smoke "held sung notes with short breaths, and a dense bounce …" → `held 8/8, dense 32/32` (it failed before).

### Bug 2: the first pass after a take dropped the opening notes. FIXED
I ran the developer's replay harness, plus a check of whether each missed note had already ended when the analysis finished. It covers 2-bar takes with the fake mic (sing.wav), 3 runs per row, at load 11-13.

| Case | last check (fix 1) | fix 2 |
|---|---|---|
| bass, normal output | note on 0.25 missing in 3/3 | missing: `0.5 ended`, `0.25 ended`, none. Late starts +391 ms. **0 missed while still due** |
| bass, 0.25 s output latency | notes on 0 and 1 missing in 3/3 | missing: only `0 ended` ×3. Note on 0.75 / 1 plays +179 to +480 ms late. **0 missed while still due** |
| chords | — | all 15 notes play, the first chord 373-425 ms late, 0 missed |

- In every run, no note played twice, nothing of the new part played during the take pass, and pass 2 was complete.
- In an earlier run without the ended/due split, I saw the same pattern. One note was missing in each run (on 0 or 0.25), plus 0 and 1 with 0.25 s latency when the drain took 1.0 s. All of these fit the limit in problem 2.
- New smoke line: "the first pass after a take plays the new part's opening notes (none missed, none twice)" → `{"n":5,"fin":1.09,"due":4,"missing":[],"dbl":0,"early":0}`.

### Bug 3: ScriptProcessor fallback (known limit). Not re-run
Fix 2 didn't touch the recorder. The developer reports 11, 10, 10 notes, 0 doubled.

## Main flow and regressions near it

- **Fake mic sing.wav, busy page** (bass, bass, again, chords, melody, voice):
  - bass: 10 and 10 notes; "again": 10;
  - chords: 10 chords (30 notes), none repeated back to back;
  - melody: 10;
  - voice note: 0 short holes.
  - 0 doubled. The mic is off after every take. During each take only "Drums" is audible (the voice note plays all tracks, as designed). No raw-voice track is added. No page errors.
  - These are the same numbers as fix 1.
- **Import → Turn into notes** (melody, bass, chords) on stacc-20/40/80, stacc-mixed-40, hard-edged and sing.wav: **18 of 18 identical to `main`**, note for note.
- **Fix 1 checks**, in the smoke run: the take end is not cut (`0 ms` ×5), 5 basslines in a row have no holes and no doubles, and Stop right after the last beat cancels cleanly (`fin 0`, mic off, old take kept).

## check.sh
- Run 1 (aeb73b8 as pushed, load about 7): **CHECK OK, 52 checks**, 4 min 21 s.
- Run 2 (+ my new line, load 11-13): 51 PASS, 2 FAIL. Both are the load-sensitive save/reopen lines: "reopens from the list intact … no 'New song' label in 45 s" and "Undo right after opening a song". The new line passed.
- Run 3 (rerun as the brief says, load 7-13): **CHECK OK, SMOKE OK: 53 checks**, 4 min 17 s.
- The full check runs over the 3-minute target only because the machine was shared (the developer measured 2 min 46 s at load 3-5). My new line adds about 8 s.

## Smoke change (pushed to `preview-ux-10`)
- New line: "the first pass after a take plays the new part's opening notes (none missed, none twice)". It runs one 2-bar sung bass take and wraps `scheduleEvent` and `TAKE.finish`. Then it checks:
  - every note of the new part still sounding 70 ms after the finish is scheduled on pass 1;
  - no note is scheduled twice;
  - nothing is scheduled in the take pass.
- It takes about 8 s.

## Screenshots and data
- During a held take (only Drums, "Recording take"): `/tmp/qa/ux-10-retest2/lab/held-1.8-during-take.png`
- Sung bassline in the editor (10 clean notes): `/tmp/qa/ux-10-retest2/lab/file-light-editor.png`
- After the takes: `/tmp/qa/ux-10-retest2/lab/*-after.png`
- Import → melody: `/tmp/qa/ux-10-retest2/shots/import-br.png`
- Data:
  - per-take JSON: `/tmp/qa/ux-10-retest2/lab/*.json` (held-2.0.json has the split take);
  - imports: `/tmp/qa/ux-10-retest2/import-br.json`, `import-brlong.json`;
  - replay logs: `/tmp/qa/ux-10-retest2/replay.log`, `replay2.log`.
- Harnesses: `/tmp/qa/ux-10-retest2/harness/` (imp, replay, replay2 with the ended/due split).
- Check logs: `/tmp/qa/ux-10-retest2/check1.log` … `check3.log`
