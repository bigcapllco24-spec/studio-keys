# SE-7 · Key and chord finder: hear a song, see its key, chords and notes
sound-engine-dev · Design mode · 14 Nov 2026 · size L (three phases: 7a S, 7b M, 7c M)

## 1. What and why
The key label is wrong today. It only listens to melody tracks, so a song with chords and a bass but no melody says "detected A minor" whatever you played. Keys then writes new parts in that wrong key. We fix that first. Then Studio Keys learns to listen to a song you drop in: it shows the song's key and tempo, plus a strip of chords bar by bar, and says how sure it is. You fix any chord with one tap, and one tap (or "Keys, put those chords on my song") puts them on a new chords track in your song's key.

## What I found reproducing "the key detector isn't working"
I ran the current `main` build in headless Chrome (screenshots `00-bug-now-desktop.png`, `00-bug-now-phone.png`):
1. **Empty song:** the label says "detected A minor". Nothing was detected; A minor is the built-in default (`projectKey()` falls back to tonic 9).
2. **F major chords and an F bass, no melody:** the label still says "detected A minor", and the phone header says "A minor · 2 parts". `detectKey` run on all the tracks gives F major, but `projectKey()` only reads `role==='melody'`. Then I asked for a melody. Keys wrote it in A minor, with B naturals against my B♭ chord. Every generator (bass, chords, melody, `ensureProg`) uses this wrong key, so this is what the owner hears as "it isn't working".
3. **Imported audio song (my own E minor test render):** there is no analysis at all, and the label stays "detected A minor". "Turn into notes → chords" and "→ melody" give **0 notes**, because the pitch tracker follows one note at a time and gives up on a full mix.
4. **Too little input:** one note gives "C major". A hum of 4 notes, or a sung melody of 3, silently **locks** the key (`setKey`) as if you had chosen it. After that the label is blank and the menu shows that key as your choice.
5. **There is no confidence and no second guess.** The assistant is told `key: "auto (A minor)"`, so on the live site Keys would confidently answer "A minor". The offline parser has no answer to "what key is this song in" (it returns no actions).

## 2. User flow
**A. Your own parts (7a)**
1. You play or sing some chords and a bass. The key chip reads **"F major · likely · or D minor"** with a 4-step sureness meter. With fewer than 8 notes it reads **"no key yet"**.
2. You tap the chip. A small list shows F major, D minor and C major, each with a reason ("bass lands on F") and a **Set** button. Set locks the key (label **"set"**). "Keep on auto" leaves it on auto.
3. "Add a melody" now follows F major. If Keys has to pick a key itself (a beat with nothing tonal yet), the chip says **"A minor · Keys picked"**. A hummed take says **"from your humming"**. Only a key you chose says "set".

**B. A song you drop in (7b)**
4. You drop `Night Drive.mp3` onto the studio, or import it. A toast says "Listening to Night Drive… 40%". About 1-3 s on a laptop, a few seconds on a phone.
5. A song card appears: **"E minor · likely · or G major · DJ 9A · 124 BPM"**, with buttons **Put these chords on my song**, **Set my key to E minor** and **Use 124 BPM**. Nothing in your song changes until you tap something.

**C. The chord strip (7c)**
6. A **Chords** strip above the tracks shows one block per bar (Em · C · G · D?). Faded, dashed blocks are the unsure ones. Each block shows its notes (E G B). While the song plays, the current bar is highlighted, in sync, because the analysis was done ahead.
7. You tap a block: root keys, plus major / minor / sus / 7 / none, **Hear it**, and the second guess ("or Bm"). Fixing it updates every part that follows the chords. Undo works.
8. **Put these chords on my song** adds a new **Chords** track. It is our own voicing and rhythm on the style's chord sound, never the song's audio. It goes in your key: if your song is set to D minor, the E minor chords move down a tone, and Keys says so. If your song has no key yet, it takes the song's key. Bass and melody that Keys made follow the new chords. **Bass movement too** adds a bassline on the song's bass roots.
9. **By voice:** "Keys, what key is this?" gets the answer "E minor at 124, I'm fairly sure. It could be G major; the bass sits on E. Set your song to E minor?" The key changes only on **yes**. "Put those chords on my song", "make bar 4 B minor" and "match this loop to my key" all work by voice too. For a MIDI loop, match-key moves its notes. For audio, Keys offers to move your song to the loop's key instead (see risks).
10. **Copyright:** Keys never copies a song's melody. It offers "a new melody over these chords".

## 3. Screens
- `01-key-label-desktop.png`: the honest key chip in four states, plus the tap-to-correct list.
- `02-song-chords-desktop.png`: the song card, the chord strip in sync with playback, the chord fixer, Keys' reply.
- `03-song-chords-phone.png`: the phone Song tab (UX-4 layout): the key in the header, the song card, the swipeable chord strip, and the fixer as a bottom sheet.
- `04-what-key-phone.png`: the phone Keys tab with "what key is this?" and "put those chords on my song".
- `00-bug-now-*.png`: today's build showing "detected A minor" over F major chords.

## 4. How it will be built
**7a · Honest key (S; bug fix, can ship alone)**
- *sound-engine-dev, `src/music.js`:*
  - `detectKey(notes)` v2:
    - weight = duration × velocity, bass ×1.5, notes on a bar start ×1.5;
    - returns `null` under 8 notes or 4 pitch classes;
    - returns `{tonic, mode, conf, alt, cands[3]}`, with conf = (best − second)/best;
    - when the margin is under about 0.05, breaks the relative-key tie on the bass root on downbeats, then the first and last chord, then the style's mode.
  - New `pitchedNotes()`: every notes track except drums and percussion.
  - New `keyStatus()`: `{key, from: you|keys|vibe|notes|song, conf, alt, enough}`.
  - `projectKey()` uses `pitchedNotes()`. `djKey(k)` gives "9A"-style codes.
  - Migration: an old song with no key and generated parts keeps its old default as `from:'keys'`, so nothing moves on reopen.
- *studio-ux-dev:*
  - `#keyInfo` becomes the key chip plus a popover (`src/body.html`, `src/daw.js`).
  - `setKey(k, from)` in `src/studio.js`. The `#keySel` choice means `from:'you'`.
  - The sung-take path (`studio.js`) and `transcribeTrack` (`edit.js`) set a *soft* key (`from:'notes'`) instead of locking one.
  - On the UX-4 phone layout, the header subtitle shows the same state.
- *assistant-dev:*
  - `assistant.js`: the context sends `keyStatus()` instead of `"auto (A minor)"`, and the hum path sets a soft key.
  - `actions.js`: generators that pick a key on an empty song set `from:'keys'`, and `vibe` sets `from:'vibe'`.
  - Worker prompt: answer "what key" from that status, honestly.

**7b · `analyseAudio(buf)` (M, sound-engine-dev)**
- New file `src/analyse.js`. The lead adds it to `PARTS` in `tools/build.py` after `music.js`. I can fold it into `music.js` instead if preferred.
- Plain JS, about 300 lines, using our `makeFFT`:
  - mono, resampled to 22,050 Hz with OfflineAudioContext;
  - FFT 8192, hop 2048, 65 Hz-2 kHz;
  - peak picking, tuning offset from a cents histogram, log(1+100·x) compression;
  - a separate 40-160 Hz bass chroma for roots;
  - drum-only frames gated out.
- **Tempo and beats:** autocorrelation of onset strength, 70-180 BPM, preferring 118-132 for house and techno; then beat phase, then the downbeat (strongest kick and bass every 4 beats, plus the bar where chords change most).
- **Key:** EDM major/minor profiles, re-typed from Faraldo et al. (CC BY 4.0, credited in the README), *not* copied from Essentia's AGPL source. Returns conf, alt and the top 3.
- **Chords:** beat-averaged chroma; 24 major/minor templates plus "no chord", with a sus4 and dominant-7 check on the winner; bass-root bonus; Viterbi smoothing (stay on a chord with p ≈ 0.9 per beat, chords in the key favoured, at least 2 beats per chord); changes snapped to the bar or half bar. Also finds the song's main 4- or 8-bar loop.
- **Output:** `{bpm, bpmConf, beats, downbeat, key, chords:[{b,d,root,q,conf,alt}], loop, bassRoots}`.
- **Speed:** runs in a Worker built from a Blob URL (works as a local file), falling back to 40 ms chunks. The result is cached on the audio track (`t.ana`, small JSON, saved with the song). Target: under 3 s for a 3-minute song on a laptop.
- *studio-ux-dev, `edit.js` `importFile`:* call it after import (progress toast, then the song card).

**7c · Chord strip and voice (M)**
- *sound-engine-dev:*
  - `PROJ.chords` `[{b, d, root, q, conf, from}]`;
  - `chordPlan()` follows `PROJ.chords` when present, including chords outside the key;
  - helpers `chordPcs`, `chordName`, `parseChord`, `fitChordsToKey` (shift to the project key through the relative mode);
  - correcting a chord rerolls the following generated parts with their own seed.
- *studio-ux-dev:*
  - chord strip lane above `#tracks` (`daw.js`, `body.html`): opacity = confidence, playhead highlight, tap → fixer popover (desktop) or bottom sheet (phone);
  - song card;
  - every edit goes through `saveProject` so it can be undone.
- *assistant-dev* (each one in the worker prompt, `actions.js`, `maker.js`, plus a smoke line):
  - `analyse_song {track}`: reports key, BPM and chords and never changes the song;
  - `chords_from_audio {track, bars, to:"mine"|"song"}`: fills `PROJ.chords` and adds the chords track;
  - `set_chord {bar, chord:"Bm"}`;
  - `match_key {track}`;
  - the existing `key` action gains `"from"` and `"key":"auto"` to unlock.
  - Offline phrases: "what key is this (song)", "what chords", "analyse this song", "put/take/use those chords on my song", "make bar 4 B minor", "match this loop to my key".
  - Reply style and copyright rule as in step 10.
- **Tests:**
  - A test file (`tests/keys.mjs`, written by qa-tester from my harness) renders 12 of our own songs in headless Chrome: 12 keys, both modes, 8 styles, with and without a melody. It runs `analyseAudio` and checks exact key on ≥10/12 (the rest must be relative or a fifth away) and correct chords on ≥80% of bars.
  - Smoke lines:
    - empty song says "no key yet";
    - F major chords plus bass mean a new melody uses only F major notes;
    - `chords_from_audio` adds a track;
    - maker parses the phrases.
  - The owner checks 10 of his own songs on the test link (never stored).

**Order:** 7a needs nothing else. 7c's phone parts build on UX-4 (bottom tabs), so they wait until UX-4 is on `main`.

## 5. Effort, risks, decisions
**Effort:** 7a S (about half a day across three devs), 7b M, 7c M. **L overall.**

**Risks**
- **Real club tracks:** expect about 60-65% exact keys (Mixed In Key is about 90%). Most misses are the relative key or a fifth away, which still mix. That is why we show sureness, the second guess and one-tap fixing. Phrygian or acid tracks will read as "minor".
- **Tempo and downbeat:** a half or double tempo, or a downbeat one beat early, shifts the strip. The fixer gets a "chords start a beat later" nudge if testing shows we need it.
- **Phones:** a 3-minute song takes a few seconds. We show a progress toast and use a Worker.
- **Audio match-key:** there is no clean pitch-shifter yet (`playbackRate` would change the speed too). For audio, `match_key` offers to move *your* song to the loop's key. A real pitch-shift comes later.
- **Changing how the key is worked out could move old songs:** handled by the migration in 7a.
- **Copyright:** chords and key only, voiced by us. Never a melody note for note.

**Decisions for the owner**
1. **Which phases now?** Approve 7a + 7b + 7c, shipped as two test links: 7a first (the bug fix, a few hours), then 7b + 7c together, since chords without the strip aren't worth trying. *Recommended.* Alternatives: 7a only; or all three on one link.
2. **Live listening from the microphone** (a song playing in the room, chords appearing as it plays, "keep the last 8 bars")? *Recommend later* (phase 7d after 7c). It is a new mic mode, laptop mics lose the bass, so it will be clearly rougher than a file. Notes from a single stem (Basic Pitch) also stays later, with SE-6.
3. **Show the DJ key code** ("9A") next to the key, labelled "DJ key" (never "Camelot", which is a trademark)? *Recommend yes:* small, and DJs and producers look for it.

## 6. Research used and questions
- **From RES-6 I used:** the 7a/7b/7c split; the detectKey weighting, confidence, alt and tie-break; the chroma settings; EDM profiles from Faraldo (CC BY, not Essentia); beat-synchronous templates plus Viterbi; Worker or chunking; our own renders as fixtures; "DJ key" naming; the reply style; and the no-melody copyright line.
- **From the market check I used:** confidence plus a second key, one-tap correction, "what key is this?" by voice with the key set only on yes, and SE-6 stems used when they exist (`analyseAudio` will take the bass and "other" stems).
- **Questions for the researcher:**
  1. Confirm the exact Faraldo `edma`/`edmm` profile numbers in the CC BY paper, and the credit wording.
  2. Is there any freely licensed (CC0 or CC BY) dance-music audio with key and chord labels that we could use locally to measure accuracy (not shipped)?
  3. How do Logic and Chordify let users fix a downbeat that is off by a beat?
