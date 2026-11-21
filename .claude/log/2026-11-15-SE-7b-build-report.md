# SE-7b build report (sound-engine-dev, 15 Nov 2026)

Branch `preview-se-7bc` (from `preview-se-7`). Engine part of 7b only; no UI, no import hook, no assistant actions.

## What I built
**New file `src/analyse.js`** (325 lines, +35 KB to `index.html`), added to `PARTS` after `music.js` in `tools/build.py` (lead's permission). Nothing else in `src/` changed.

- `analyseAudio(buf, {onProgress, maxSec, noWorker})` → Promise of
  `{v, dur, bpm, bpmConf, bpmAlt, tonalBeats, beats:[s], downbeat:s, key:{tonic, mode, conf, level 1-4, alt, cands[3] with a reason each, why}, djKey, chords:[{b, d, root, q, conf, alt}], loop:{start, bars, chords, conf}, bassRoots:[{b, d, root}], tuning, ms}`.
  - `b`/`d` are beats counted from the first downbeat (b 0 = bar 1).
  - `root` is a pitch class; `q` is `maj | min | 7 | m7 | maj7 | sus4 | 5 | none`. `5` means a power chord: root and fifth, no third.
  - `key.level` uses the same 1-4 scale and words as `detectKey` (`KEY_WORDS`).
  - `djKey` comes from 7a's `djKey()`.
  - `bpmAlt` is the half or double tempo when that is plausible (drum & bass reads 87, alt 174; trap 140, alt 70).
  - `bpm` and `key` are `null` for silence or clips under 6 s. `key` is also `null` with fewer than 8 beats of pitched music (drum loops).
- `anaJob(x, sr)`: the pure, chunkable core (stepper with `step(ms)` and `progress()`).
- `anaResample(buf)`: mono at 22,050 Hz through OfflineAudioContext, with a fallback.
- `anaRun(x, sr)`: Worker from a Blob URL (one song at a time), else ~40 ms main-thread slices. It also falls back to the slices if the Worker errors.
- Cache helpers for 7c:
  - `anaCache(res, buf)` → the object for `t.ana`: the result without `beats` (`beat0` + `bpm` rebuild them) plus a clip stamp (length + 64-sample checksum). At most 9.5 KB for a 3-minute song.
  - `anaCached(t, buf)` → the cached result, or null if the clip changed or `ANA_VER` moved.
- `anaChordName(c)` → "Em", "G7", "Dsus4", "B5", "N.C." (uses `PC_NAMES`).

**How it listens.** The method is as in the proposal; these are the changes I made after measuring:
- **Chroma bands.** Harmony chroma uses 130 Hz-2 kHz (65 Hz let the kick in). Bass chroma uses 40-250 Hz, with each pitch's song-wide floor subtracted to remove the kick's steady pitch.
- **Overtones.** A peak at 3/5/6/7 times a stronger lower peak counts 0.3.
- **Drum-only gate.** A beat counts as drums only when the median energy between 200 Hz and 1 kHz is low. That band separates drum intros from music by about 40x.
- **Two frames per FFT.** Each complex FFT carries two real frames, which halves the FFT time. The onset hop is 512.
- **Tempo.** Onset autocorrelation over 1, 2 and 4 beats with a pull towards 118-132. I removed the 3-beat term: it caused a 4/3 error (hip-hop at 90 read as 122).
- **Beat phase.** One bar of kick-band and snare-band onsets is matched to "kick on 1 (then 3), backbeat on 2 and 4". When there are four even kicks a bar, the kicks alone set the phase.
  - The strongest single hit in hip-hop is the syncopated kick, and house hats sit on the offbeat.
  - Techno's offbeat stabs and bass needed the four-kick rule.
- **Downbeat.** Chord, chroma and bass change, plus the kick's bar position.
- **Chords.** Viterbi chord tracking, then each chord gets at least 2 beats and changes snap to the half bar. Each chord is then re-scored on its whole segment (a second guess, then a 7th/maj7/sus4/power check). A near tie between major and minor goes to the key.
- **Key.** The key profiles score first. Then come the chords and bass:
  - share of chord time that fits the key;
  - time on the tonic chord;
  - bass on the tonic;
  - the main loop's first chord.

  If that lands on a key with different notes, the chords are heard again in that key.
- **Main loop.** The loop of 4 or 8 bars that repeats most.

**Deviation from the brief (EDM profiles).** I could not get Faraldo's profile numbers. The CC BY paper on Zenodo shows them only as a figure, and the repo with numbers has no clear licence. I never looked at Essentia. So the profiles are our own numbers, shaped after the paper's published description (tonic and fifth strongest; major nearly empty on ♭2, ♭3, ♯4, ♭6; minor flatter) and fitted on our renders. The code comment credits the paper for the idea. Lead: add a README credit line if you want one; nothing was copied, so it is courtesy, not a licence condition.

## Harness and numbers
Dev tools in `tools/`, none shipped:
- `ana-harness.mjs`: renders 12 of our songs in headless Chrome.
  - Each song is 0.31 s of silence (to test the beat phase), then an 8-bar drums-only intro, then the full loop to 3:00, at 44.1 kHz stereo.
  - It runs `analyseAudio` through the Worker and grades:
    - key: exact, relative, or a fifth away;
    - chords: root and major/minor in the middle of every bar after the intro;
    - BPM;
    - downbeat: within 60 ms of a true bar line;
    - "no chord" on the intro;
    - time per song.
  - Flags: `--check` (pass/fail), `--set 2` (held-out set), `--dump DIR` (caches the renders).
- `ana-node.mjs` and `ana-sweep.mjs`: fast tuning in Node on the cached renders.
- `ana-browser.mjs`: Worker against slices, plus timing.

**Set 1 (the 12 songs in the brief), fresh render, Worker, `ana-harness.mjs --check` → PASS keys:**

| | Result | Goal |
|---|---|---|
| Key exact | **12/12** (C m, F♯ m, D m, E♭, G m, A, B♭ m, E m, F, D, B, A♭ m; house, techno, hip-hop, lo-fi, trap, pop, melodic house, afro, rock; 6 with melody) | ≥10 |
| Chords correct | **99% of bars** (min 94%) | ≥80% |
| BPM error | **0** on all 12 | |
| Downbeat | **12/12** | |
| Drum intro read as "no chord" | 94/96 bars | |
| Time per 3-minute song | **avg 1.17 s, max 1.36 s** in headless Chrome on this 2-core cloud box | <3 s |

DJ keys check out (C minor 5A, F major 7B, A major 11B).

**Set 2 (held out, tuned on nothing):** deep house, melodic techno, drum & bass, reggaeton, synthwave, UK garage, progressive, tech house, organic house, nu-disco, Bollywood, house; other keys and seeds.

| | Result |
|---|---|
| Key exact | **11/12**; nu-disco F♯ major read as its relative D♯ minor |
| Chords | **87% of bars** |
| BPM | 11/12; drum & bass reads 87 with `bpmAlt` 174 |
| Downbeat | 11/12; the DnB one is a half-time effect |

The weak cases are on the dense organ and rumble mixes:
- tech house: 44%; organ stabs plus a bassline that leans on the fifth;
- melodic techno: 65%;
- drum & bass: 74%.

**Worker against slices** (`ana-browser.mjs`, 4 songs at 44.1 kHz stereo):
- Both paths give an identical result on 4 of 4.
- Worker: avg 1.2 s; resampling is about 270 ms of that, asynchronous.
- Main-thread slices: avg 1.4 s.
- Long tasks (PerformanceObserver):
  - Worker path: none.
  - Slices path: one task of 63 ms (the final key/chord stage). It runs only without a Worker, with the progress toast showing.

**Edge cases.** Silence, 1 s of noise, a 5 s tone and a 50 ms clip all return cleanly with `bpm: null, key: null`. An 8 s held C major chord gives C major and one chord; its tempo is meaningless, so its `bpmConf` is low.

**Check.** `bash .claude/tools/check.sh` → PASS bundle syntax, PASS worker syntax, SMOKE OK: 56 checks, **CHECK OK**.

## What 7c needs
**From me (sound-engine-dev, next on this branch):**
- `PROJ.chords` from `res.chords` (or `res.loop` for "use the loop").
- `chordPlan()` following it.
- `chordPcs` / `parseChord` / `fitChordsToKey`. `anaChordName` already exists and can become `chordName`.
- Rerolling the following generated parts with their own seeds.
- Converting analysed beats to song beats. This needs the song at the analysed tempo ("Use 124 BPM"), with `t.start`.

**studio-ux-dev:**
- **On import** (`edit.js` `importFile`, audio files): `const c = anaCached(t, buf) || anaCache(await analyseAudio(buf, {onProgress: p => toast(...)}), buf); t.ana = c; saveProject()`.
  - It takes about 1-2 s on a laptop, more on a phone.
  - Run it after the clip is on the track; never block the import on it.
- **Song card:**
  - key: `keyName(ana.key)` plus `KEY_WORDS[ana.key.level]`, "or `keyName(ana.key.alt)`", "DJ key `ana.djKey`";
  - tempo: `ana.bpm`, with "or `ana.bpmAlt`" when set;
  - when `ana.key` is null, say "no key in this clip" (a drum loop or a short clip);
  - treat `bpmConf < 0.15` as "tempo unsure".
- **Strip:** one block per chord with `b`/`d` from `ana.downbeat`. Use opacity from `conf`; `alt` is the second guess.

**assistant-dev:**
- `analyse_song` can answer with `key.why` / `cands[].why`:
  - "the bass sits on E";
  - "the loop starts on E minor";
  - "the chords keep coming back to E".
- For an audio loop, `match_key` uses `ana.key`.
- The key is set only on "yes", as designed.

**qa-tester:** turn `tools/ana-harness.mjs --check` into `tests/keys.mjs`. It takes about 30 minutes for 12 renders, because the offline render is slow headless, so run it on demand, not in `check.sh`. Use `--dump` once and `ana-node.mjs` for fast reruns.

## Known limits
- These numbers are on our own renders, which are clean and steady. Expect real club tracks to be lower: RES-6 says about 60-65% exact keys. Dense organ, acid or rumble mixes are the weak spot.
- Tempo is a steady grid with no drift tracking, so live-played songs with a changing tempo will slide.
- Half or double time is offered as `bpmAlt` rather than solved.
- Drum intros with tuned percussion sometimes get a faint chord (low `conf`).
- No key changes inside a song; one key per song.
- Phrygian tracks read as minor, as the proposal says.

Commits: WIP checkpoints, then the final one, all pushed to `origin/preview-se-7bc`. `main` was not touched.
