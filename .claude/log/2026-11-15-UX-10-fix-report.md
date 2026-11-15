## Fix 1 (15 Nov 2026, after the tester's NOT READY)
Files: `src/edit.js`, `src/studio.js`, `index.html` (rebuilt). Two test files: `tests/smoke.mjs` and `tests/take-lab.mjs` now pass `audioToNotes`' new second argument through their wrappers, and take-lab also prints `cutMs`. No UI, sound, prompt or action changes.

**1. Imports no longer merge repeated notes (medium, fixed).**
- `audioToNotes(buf, o)` now finds no holes on its own. Only a take passes `o.holes`: the sample ranges the recorder marked as missing and patched.
  - Imports pass nothing, so the hole rule never runs on an import. It behaves exactly as on `main`.
- `TAKE_REC.take` only patches audio that really never arrived:
  - blocks missing from the recorder (`got[]`);
  - or a device dropout: 64 samples to 60 ms of exact zeros that cut the waveform off sharply on both sides (both edge samples above 15% of the nearby peak).
  - Silence that fades out and back in is never touched. A gate, a bounce or staccato notes give that kind of silence.
- Import → Turn into notes, with the tester's files:

  | File | `main` | Before this fix | Now |
  |---|---|---|---|
  | stacc-40 | 8 | 1 | 8 |
  | stacc-20 | 7 | 1 | 7 |
  | stacc-80 | 8 | 8 | 8 |
  | stacc-mixed-40 | 8 | 4 | 8 |

  - sing.wav as bass, chords and melody: note for note the same as `main`.
- The tester's smoke line "import: 8 notes on one pitch with short exact-silence gaps stay 8 notes" now passes: `{"20 ms":8,"40 ms":8}`.
- A gating mic (fake mic playing stacc-mixed-40, 4-bar melody takes): 22-25 notes per take with 0 patched. Before this fix: 14 notes and 20-21 patched gaps. `main`: 7-8.
  - The repeated pairs stay two notes each.

**2. The end of a take is no longer cut (rough edge, fixed).**
- The take now ends `latency() + 0.1 s` after its last beat (`TAKE.tail`, worked out when singing starts).
- Then it waits for the recorder's last blocks before it analyses the take (`TAKE.end` → `TAKE_REC.drain`):
  - The worklet sends its last part-block, then a "drained" reply on the same port, so every block has arrived first.
  - The wait gives up after 0.5 s.
- The loop and the drums keep their timing. Only the analysis waits, and "Recording take…" shows for about 0.15 s longer (about 0.35 s with Bluetooth).
- Audio missing at the end of the take window was 0 ms in all 21 takes I measured (busy page, Bluetooth, fallback). The tester measured 68-451 ms before.
- Test with Bluetooth-like 0.25 s output latency and a busy page: the singer sings a pickup on beat 14.5 and another on the last off-beat (15.5, half a beat).
  - Both landed whole in 3 of 3 takes: `14.5/0.98` and `15.5/0.5`. All 6 of 6 notes were on the beat.
- Stopping during the extra wait, or while the recorder is draining (I slowed the drain down on purpose to test it), cancels cleanly: no track is added, the mic goes off, no errors.

**3. ScriptProcessor fallback (low, improved, not perfect).**
- **Bigger blocks.** The fallback now uses 16384-sample blocks (was 4096). I sent a stamped test signal straight into a ScriptProcessor on a busy page for 9 s:

  | Block size | Light stalls | Heavy stalls |
  |---|---|---|
  | 4096 | 2 dropped, 5 spliced (of 97 blocks) | 11 dropped, 14 spliced, 1 doubled (of 97) |
  | 16384 | none dropped or spliced (of 24) | none dropped or spliced (of 24) |

- **Lining up by sample count.** A callback can only run late, never early. Its clock stamp was 0 to 13440 samples behind the true position, and exactly on it every few blocks.
  - So `take()` moves each back-to-back run of blocks by the smallest difference between its clock stamps and its positions.
  - A late first callback no longer shifts the whole take. Before, whole takes were 120-280 ms late.
  - The "a block went missing" test now needs 6 late blocks in a row (was 4). On a stalled page, 4 callbacks in a row came 0.28 s late, and that caused a false 1.1 s jump.
- **Results** (load 9-11 on 2 cores):
  - Fake mic, busy page: 10, 12, 10, 10, 10 notes, 2 doubles over 5 takes. The tester saw 3 of 7 takes with 2 doubles each.
  - Singer locked to the beat: 8/8, 8/8, 7/8, 6/8, 4/8 on the beat. Most onsets land 26-46 ms after the beat, as with the worklet. The tester saw 0 notes in the recording in 5 of 7 takes.
- **Limit:** under heavy load the MediaStream path into a ScriptProcessor still splices about 0.3-0.45 s of audio now and then. Its block positions look right, so this can't be detected.
  - About 1 take in 3 can still split one note or add a double.
  - The worklet, on the same page and load, was perfect: 8/8 on the beat, 0 doubles in every take.
  - No current browser uses the fallback.

**Check and numbers (final build):**
- `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK: 49 checks** in 3 min 40 s at load about 9. That includes the tester's import line and "5 sung basslines in a row" (5 notes / 0 doubled / 0 holes ×5).
- Worklet recorder, busy page:
  - bass ×5: 10 notes each, 0 doubled;
  - chords: 10 chords, none repeated back to back;
  - melody: 10 notes, 0 doubled;
  - voice note: 0 patched.
- During every sung take only "Drums" plays. The mic is off after each take, and your voice is never played back live (0 `noteOn(…,'mic')` calls).
- Worklet with a singer locked to the beat on a heavy busy page: 8/8 on the beat in 3/3 takes.
- No page errors in any run.

**Left as before:** `TAKE.finish()` still takes 0.2-2.3 s on the main thread under load (not a regression; the tester noted it). The analysis now runs about 0.15 s into the next loop pass instead of right on the loop's first beat.
