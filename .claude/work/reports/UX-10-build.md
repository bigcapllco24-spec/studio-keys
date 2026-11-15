# UX-10 build report: a sung bassline no longer stutters (studio-ux-dev, 15 Nov 2026)

Branch `preview-ux-10` (from `main` 043b319). Files: `src/studio.js`, `src/edit.js`, `tests/smoke.mjs` (allowed by the brief), `index.html` rebuilt with `tools/build.py`. No UI, sound, prompt or action changes.

## Cause
The take recorder in `TAKE` (`src/studio.js`) used a ScriptProcessor and put each 1024-sample block at the clock time of its callback (`currentTime - len - 0.02`). Those callbacks run late and in bursts, so blocks landed a few ms off. That left holes of exact zeros, and some blocks overlapped others or were written twice.
- Measured on `main` with the fake mic: 70-113 holes of 2-60 ms in every 4-bar take, 35-60 of them inside sung notes.
- I also recorded a test ramp signal (every sample stamped with its position). Chrome's ScriptProcessor itself drops and repeats blocks: with 1024-sample blocks, about 29 of 210 were out of order even on an idle page (`steps 3072 / -1024`). So "write blocks back to back" alone would still have repeated and dropped audio.
- `audioToNotes` (`src/edit.js`) then read the level dip at each hole as a new attack (the `reatt` rule) and split held notes in two.

## Fix
1. **A gapless recorder (`TAKE_REC` in `src/studio.js`).** An AudioWorklet copies the mic on the audio thread and stamps every 1024-sample block with its exact sample frame (`currentFrame`), so main-thread jitter can't move or drop audio.
   - The worklet code is inline. It loads from a `blob:` url on the website (Safari wants that) and from a `data:` url when the page is opened as a local file (`blob:null` fails on `file://`; `data:` works, tested).
   - Blocks are written back to back. The audio clock only moves them when it is clearly ahead or behind: a jump of more than 2048 samples, or a drift of more than 256 that lasts 8 blocks. A small clock wobble doesn't cut a held note.
   - Short holes that are left (audio that never arrived, or runs of 64 or more exact zeros, which a real mic never gives) are patched. `patchHole` carries the waveform on one pitch period at a time from both sides and crossfades the two (error 0.003 on a test sine). Holes longer than 60 ms stay silent.
   - **Fallback** when worklets can't load: a ScriptProcessor (now 4096-sample blocks, which repeat far less in tests) written back to back from one start point. It jumps on only when a block was really dropped, and gets the same hole patching.
   - The recorder starts at the count-in, so the first sung note isn't clipped.
2. **Lining up with the beat.** The take now moves earlier by the measured latency: `outputLatency` (or `baseLatency`) + the mic track's `latency` setting (0.01 s by default), capped at 0.4 s. A note lands on the beat the singer heard.
   - The old fixed 20 ms is replaced. In headless Chrome the new value is 0.04 s.
   - This also helps Bluetooth headphones (150-250 ms output latency). Before, their sung notes landed late by that much.
3. **Belt and braces in `audioToNotes`.** Runs of exact zeros of 1.5-60 ms between sound count as holes. For 8 frames after a hole there's no re-attack, and a frame spoilt by a hole doesn't count as silence, so a held note is never split by a hole. Imported files take the same path. Clean imports are unchanged: the smoke import → bassline check passes.

Every take uses this one recorder: sung bass, chords and melody, and voice notes (`TAKE.start(part)`). There is no other recorder in the code.

## Numbers, before → after (headless Chrome, 2 cores, 124 bpm Ben Böhmer drums, 4-bar takes, 5 takes in a row, busy page: 4-34 ms main-thread stalls every 35 ms)
| | `main` | `preview-ux-10` (worklet) | fallback (no worklet) |
|---|---|---|---|
| Notes per take, fake mic (sing.wav gives 10 in 4 bars) | 8, 14, 11, 12, 10 | 10, 10, 10, 10, 10 | 10, 10, 10, 10, 10 |
| Doubled notes (same pitch twice in a row; sing.wav never does that) | 2, 5, 2, 4, 1 (14 in total) | 0 in every take | 0 in every take |
| Holes of 2-60 ms in the recording | 93-113 per take | 0 | 0 |
| Same, on an idle page | 70-79 per take, 7 doubles over 5 takes | 0 | — |

**Timing: a synthetic singer inside the audio clock.** It sings one note every 2 beats, through a MediaStream like a real mic, with "more swing" drums and the busy page.
- `main`: the recording was too broken to read. 0-1 of 8 notes were found in it. The take fell back to the live pitch tracker: 10-12 notes, 4-5 of them doubled.
- After, worklet: 8 of 8 notes on beats 0, 2, 4 … 14 in all 5 takes. The average onset is 13-16 ms early (range -27 to +46 ms; a 1/16 at 124 bpm is 121 ms). No doubles.
- After, fallback: 8 of 8 on the beat, onsets 15-34 ms late.
- Swing: SE-3 swing moves the off 16ths at most 0.1 beat late (swing 0.4). That is still nearest its straight 16th, so the 1/16 rounding of sung notes is unchanged.

**Other paths, same run (busy page, fake mic):**
- Sung melody: 10 notes, 0 doubled.
- Sung chords: 10 chords, no repeats back to back.
- Voice note: saved as "Voice note 1" with 0 holes, recorded by the worklet.

**Main-thread cost:** `take()` with 4 missing blocks takes 34 ms. The worst case, 87 holes patched, takes 156 ms. That only happens when worklets are missing on a very glitchy machine. For comparison, `audioToNotes` already takes 139 ms on a 4-bar take.

## Check
- `bash .claude/tools/check.sh`: build, bundle syntax and Worker syntax PASS, **SMOKE OK: 48 checks**, CHECK OK.
- New smoke line: "5 sung basslines in a row: no holes in the recording, no doubled notes". It uses 2-bar takes, a busy page and the fake mic. On the branch it passes: 5 notes / 0 doubled / 0 holes in each take.
- I also ran the new line against `main`'s build, and it fails as it should: 7/3/30, 6/2/30, 9/3/22, 6/1/25, 6/1/26 (notes / doubled / holes). Two other checks also failed in that run (opening the app starts a new empty song; Undo right after opening a song). They pass on the branch, and I didn't look into why they failed there.

## For the lead
- No Worker deploy, no new actions, no prompt text.
- What to try on the test link: make a beat, then "let me sing the bassline". Hold long notes: each should come out as one note, not a short stub plus the same note again. Try "Keys, again" a few times. Try Bluetooth headphones if you have them.
- Known limits:
  - Headless Chrome's fake audio device skips its own clock sometimes. Those blocks are patched, and a real laptop should be cleaner.
  - Very old browsers without AudioWorklet use the fallback.
  - The last ~50 ms of a take can be cut, as before: blocks still on their way when the take ends.
  - Unchanged and not in this brief: the bass octave is picked from the median sung note, so one extra note can move the whole take an octave.

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
