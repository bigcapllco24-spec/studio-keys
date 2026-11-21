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
