# RES-6: Key and chord detection from songs (SE-7, building block for AI-3 and SE-6)
music-researcher, 14 Nov 2026. For: lead, sound-engine-dev, studio-ux-dev, assistant-dev.

## Bottom line
- **Our key label is wrong for a simple reason, and it is a small fix.** `projectKey()` only reads melody tracks. With no melody it shows "detected A minor", which is really just the default. Fix it this way:
  - read chords, bass and pads too, with bass weighted up;
  - return "no key yet" when there are too few notes;
  - add a confidence score and a "or C major" second guess.
- **Key from an imported song is doable in plain JS, with no download.** The method is a chroma vector (how much of each of the 12 notes is sounding) built with our own `makeFFT`, matched against key profiles made for dance music. Expect about 60-65% exact matches on club tracks, against about 89-94% for Mixed In Key. Most misses are relative major/minor swaps or keys a fifth away, which still mix fine. The same matching done with the classic textbook profiles only scores about 30% on electronic music.
- **Chords from a song are also doable in plain JS:**
  1. beat-aligned chroma;
  2. 24 major/minor chord templates plus "no chord";
  3. Viterbi smoothing (keeps a chord unless the evidence for a change is strong);
  4. snapping to the bar.

  Classic systems built this way score about 71-79% on pop, against about 81-85% for the best neural models. That is good enough for a chord lane the user can correct.
- **Note-by-note transcription needs a model.** Spotify's Basic Pitch is Apache-2.0, about 0.3-1 MB, and takes roughly 5 s for a 3-minute song on desktop WASM. It is only reliable on single instruments or stems, not full mixes. Pair it with SE-6 stems, not the full song.
- **Spotify no longer gives key data to new apps** (closed 27 Nov 2024). We must analyse audio ourselves.
- **Copyright line:** key and chords are fine (Chordify's whole business rests on that). Copying a song's melody note for note into a new song is the risk. Offer chords, key, tempo and bass movement; transcribe melodies only from the user's own audio or a stem they pick.

## What we found

### How others do it
| Product | What it detects | What the user sees | Praise / complaints |
|---|---|---|---|
| Mixed In Key 11/12 | Key, energy, cue points | Key as a Camelot code (8A) | Best scorer: 89% overall and 94% on club tracks in Dubspot's 200-track test (2026). Misses are relative-key swaps and modal tracks. |
| rekordbox 7 / Serato / Traktor / Engine | Key on import | Classic name or a number code (rekordbox "Alphanumeric", Traktor "Open Key") | 63-74% in community tests. Tools often disagree, by a relative key or a fifth. Engine users report fast techno being tagged major. |
| KeyFinder / Mixxx | Key (GPL v3 C++) | Key | 76% in Dubspot's test. The GPL licence rules out copying its code. |
| Chordify | Chords plus beat and downbeat (two neural networks) | Chord blocks hopping along the beat grid; users can edit | Good on simple pop; misses embellishments and jazz. |
| Moises | Chords and key, analysed ahead | Synced chord bar or grid, easy/medium/advanced detail, transpose | About 85-90% on mainstream music; weaker on dense mixes. Free tier covers only the first minute. |
| Chord ai (mobile) | Live chords from the mic, offline | Current chord in real time plus a timeline you can scroll back | Popular for learning. Free tier is limited to basic chord types. |
| Logic Pro 12 Chord ID (Jan 2026; better in 12.3) | Chords from audio (MIDI is rendered to audio first), including how often chords change | Fills the Chord Track; Session Players follow it | Reviewers say 85-95% on pop and electronic, but about 30% needs fixing on dense full mixes. Some forum users find it unreliable on simple chords. |
| Ableton Live 12 | Convert Harmony to New MIDI Track (polyphonic notes, not chord names) | A new MIDI clip with a piano | Best on isolated instruments. The manual recommends stems and clear attacks. |
| FL Studio 2026 / Studio One | FL: chord panel for MIDI only, plus "Remix a Song" (BPM and stems). Studio One: Detect Chords on audio | Chord name / chord lane | FL has no chord detection from audio |

**Producers expect:** one action on a clip; chords on a lane every instrument follows (Logic, Studio One); editable results; the original audio kept; a DJ code next to the key name.

**They complain about:** relative major/minor swaps; modal tracks (Phrygian acid techno labelled "minor"); key changes being ignored; no confidence shown, so a wrong key looks as sure as a right one.

### What runs in the browser, offline
| Option | Licence | Size | Speed (3-min song) | Fit |
|---|---|---|---|---|
| **Our own chroma + key profiles** (uses `makeFFT` in `src/dsp.js`) | ours | about 5 KB of code | about 1 s on a laptop if chunked or run in a Worker; a few seconds on a phone (estimate) | **Recommended for key and chords** |
| Essentia.js (KeyExtractor with `edma` profiles) | **AGPL-3.0** | several MB of WASM | fast | **No**: AGPL conflicts with our single shipped file. Re-derive the profile numbers from Faraldo's CC BY 4.0 paper instead of copying them from Essentia's source. |
| Meyda (chroma), tonal.js (chord and key naming) | MIT | small | real time | Usable, but we only need about 100 lines ourselves |
| Spotify Basic Pitch (polyphonic audio to MIDI) | Apache-2.0 | about 0.3 MB ONNX or about 1 MB TF.js weights, plus a runtime | about 60 ms per 2 s window on WASM, so about 5-6 s | For notes from stems or solo loops; rough on full mixes |
| madmom chord/key CNNs, Chordino (NNLS chroma) | models CC BY-NC-SA; Chordino GPL-2 | — | — | **No** (non-commercial or GPL); fine as accuracy references |
| Web beat detectors (web-audio-beat-detector, MIT; realtime-bpm-analyzer, Apache-2.0) | permissive | small | fast | BPM only, no downbeats; we need our own beat grid |

**Accuracy numbers to aim at:**
- Key on the GiantSteps dance-music set:
  - classic profile matching on chroma: about 30% exact;
  - EDM profiles (`edma`): 58%;
  - EDM profiles with high-pass and gating: about 64%;
  - commercial tools: 72-94%.
- Chords (major/minor) on pop sets:
  - Chordino-style systems: 74-79%;
  - best neural ensembles in MIREX 2025: about 81-85%.
- Log compression of the chroma (log(1+100·x)) is a known cheap accuracy gain.

### Live detection
- A stable chord needs about 0.5-1 s of audio. A live readout therefore lags about 0.5-1 s and updates about 10 times a second.
- A key settles after about 15-30 s.
- Basic Pitch cannot run live: it needs more than 1 s of input, adds about 120 ms of model delay, and decodes backwards in time.
- **From an imported file**, analyse ahead (a few seconds) and *display* in sync with playback, as Moises does. That gives zero lag and the best accuracy.
- **From the mic** (a song playing in the room), it works like Chord ai: big current chord, the last 8 bars scrolling, and "Keep these chords". Laptop mics lose the bass below about 100 Hz, so the bass/root vote is weaker. Expect it to be clearly worse than file analysis, and label it "listening (rough)".

### Turning chords into a part
1. **Grid:** estimate tempo (onset-strength autocorrelation, range 70-180, prefer 118-132 for house/techno), then beat phase, then downbeat (strongest kick/bass energy every 4 beats, plus the bar where chords change most).
2. **Chords:** average chroma per beat → template scores → Viterbi. Stay on the same chord with probability about 0.9 per beat, and favour chords of the detected key. Smallest chord: 2 beats. Snap changes to the bar or half bar. EDM harmony usually moves every 1 or 2 bars.
3. **Voicing is ours, not the song's:** 3-4 notes between C3 and C5, nearest inversion to the previous chord, and our role/style patterns (`chordPlan()`) on top. That makes the result a new part on the song's harmony.
4. **Copyright:** Chordify's position is that chord progressions are not protected, unlike lyrics or melody, and it removes songs on request. A forensic musicologist notes that very unusual progressions are a grey area. A melody copied note for note is the clear risk. Ableton and Logic give users the tool and leave the responsibility with them. We are an assistant that builds songs, so we should not auto-paste a famous topline.

## Recommendations
1. **SE-7a, fix now (S, bug):** fix the symbolic key detection. Use all pitched tracks, add confidence and the "or …" second guess, and make the label honest. *(sound-engine-dev: `music.js`; studio-ux-dev: `#keyInfo`)*
2. **SE-7b, audio analysis (M):** an `analyseAudio(buf)` function giving `{bpm, beats, downbeat, key, keyConf, alt, chords:[{bar,len,root,q,conf}]}`. Plain JS, chunked, cached per clip. AI-3 reads it, and on SE-6 stems it runs on bass plus "other" for better results. *(sound-engine-dev)*
3. **SE-7c, chord lane and "use these chords" (M):**
   - A chord strip above the tracks that the user can correct with one tap.
   - "Keys, take the chords from this song" fills `PROJ.chords`, and every generator follows it.
   - "What key is this?" is answered by voice, and the key is set on yes.

   *(studio-ux-dev; assistant-dev for actions in the worker prompt, `actions.js` and `maker.js`)*
4. **Later (M, after SE-6):** "Notes from a stem" with Basic Pitch, behind the same opt-in model download as SE-6. Use it for the user's own recordings or a stem they pick, never auto-applied to a song's lead melody.
5. **Live listen (M, later):** mic chord readout plus "keep the last 8 bars". This is a new mic mode and needs owner UX approval.

## For the devs
**sound-engine-dev**
- **`detectKey`:**
  - weight = duration × velocity;
  - bass ×1.5, and ×1.5 on notes that start a bar;
  - fewer than 8 notes or under 4 distinct pitch classes → `null`;
  - return `{tonic, mode, conf, alt}`, where conf = (best − second)/best;
  - relative-key tie-break when the margin is under about 0.05: bass root on downbeats, then the first and last chord root, then the style's mode. House/techno defaults to minor, because the GiantSteps set is mostly minor.
- **Chroma:**
  - mix to mono and resample to 22,050 Hz with OfflineAudioContext;
  - FFT 8192 (2.7 Hz bins, enough for C2), hop 2048 (93 ms), 65 Hz-2 kHz;
  - peak-pick, estimate the tuning offset from a cents histogram, then log(1+100·mag);
  - keep a separate 40-160 Hz "bass chroma" for roots;
  - gate frames with low harmonic energy (drum-only bars).
- **Key:** sum the gated chroma, high-pass about 120 Hz for the main chroma, and correlate with EDM-tuned major/minor profiles. Take the numbers from Faraldo et al. 2016/2017 (CC BY paper, with credit) or fit our own on the owner's library. Do not copy from the AGPL Essentia source.
- **Chords:** beat-averaged chroma, 24 binary templates plus N, cosine score, Viterbi as above, snapped to bars. Add sus2/sus4/m7 later (Logic and Moises show them).
- **Performance:** run in a Worker from a Blob URL (works in the single-file build) or in 40 ms chunks. Cache by clip id. Target under 3 s for a 3-minute song on a laptop.
- **Test fixtures:** render our own songs with known key and chords as WAV, and check exact key, relative swaps and chord recall. No commercial audio in `tests/`.

**studio-ux-dev**
- **Key label:**
  - "Key: A minor · set" (the user chose it);
  - "Key: A minor (likely) · or C major" (detected);
  - "No key yet: play or sing something" (too few notes);
  - one tap locks it.
- **DJ code:** show it next to the name ("8A"). The word "Camelot" is a registered Mixed In Key trademark (new filing Oct 2025), so label the column "DJ key" unless the lead clears it.
- **Chord strip:** blocks per bar, confidence shown as opacity, tap to change root or quality. File imports keep the stereo original (RES-5 note).

**assistant-dev**
- **New actions, each in the worker prompt, `actions.js` and `maker.js`, plus a smoke-test line:**
  - `analyse_song`;
  - reuse the existing `key` action to set or lock the key;
  - `chords_from_audio` → chord lane;
  - `match_key` (transpose a dropped loop or sample to the project key, nearest ±6 semitones; Ableton's Splice browser does "in key with your Set").
- **Reply style:** "A minor, 124 bpm, I'm fairly sure. It could be C major; the bass sits on A."
- **Copyright:** never transcribe a reference track's lead melody into the user's song. Offer "a new melody over these chords".
- **Spotify:** don't promise key data from Spotify.

## Sources
- Dubspot key-detection test 2026 (200 tracks): https://blog.dubspot.com/dubspot-lab-report-mixed-in-key-vs-beatport
- Dubspot, where Mixed In Key goes wrong: https://blog.dubspot.com/harmonic-mixing-pt-3-lab-report-is-mixed-in-key-accurate
- DJ TechTools key detection comparison (2015, old): https://djtechtools.com/2015/11/16/key-detection-software-comparison-2015-edition/
- Engine DJ forum, techno tagged major: https://community.enginedj.com/t/engine-dj-badly-analyses-track-key/52099
- Faraldo et al., multi-profile key estimation in EDM (CC BY 4.0): https://zenodo.org/records/3855499 and http://mtg.upf.edu/system/files/publications/aes_FARALDO_cameraReady.pdf
- Knees et al., GiantSteps datasets: https://mtg.upf.edu/system/files/publications/246_Paper.pdf
- Essentia Key profiles docs: https://essentia.upf.edu/reference/std_Key.html · Essentia.js (AGPL): https://github.com/mtg/essentia.js
- libKeyFinder (GPL v3): https://github.com/mixxxdj/libKeyFinder
- Chordify, how it works: https://support.chordify.net/hc/en-us/articles/360002221018-What-is-Chordify · Chordify copyright FAQ: https://support.chordify.net/hc/en-us/articles/360001420738-Does-this-not-infringe-copyright
- Moises chord detection help: https://help.moises.ai/hc/en-us/articles/6569274648220-How-do-I-use-Chord-Detection · Moises chords/key/lyrics: https://moises.ai/essentials/chords-keys-lyrics/
- Chord ai (Google Play): https://play.google.com/store/apps/details?hl=en_US&id=com.chordai
- Sound On Sound, Logic Pro 12 review: http://www.soundonsound.com/reviews/apple-logic-pro-12 · CDM hands-on: https://cdm.link/logic-pro-12-hands-on/ · Logic 12.3: https://synthanatomy.com/2026/01/apple-logic-pro-12.html
- Ableton manual, Converting audio to MIDI: https://www.ableton.com/en/manual/converting-audio-to-midi/ · Live 12 release notes (Splice key): https://www.ableton.com/en/release-notes/live-12
- FL Studio 2026: https://www.image-line.com/fl-studio/release/2026
- Fender Studio Pro Chord Track: https://fenderstudiopromanual.fender.com/en/Content/Arranging_Topics/Chord%20Track.htm
- Spotify Web API changes, 27 Nov 2024: https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api
- Basic Pitch: https://github.com/spotify/basic-pitch · browser ONNX demo: https://webai.show/models/basic-pitch-transcription · NeuralNote (why not real time): https://github.com/Ohfiftyb252/neuralnote · Basic Pitch in the browser, limits: https://dev.to/partfit3d/running-spotifys-basic-pitch-in-the-browser-for-audio-to-midi-44bc
- madmom licence (models CC BY-NC-SA): https://github.com/CPJKU/madmom/blob/main/LICENSE · Chordino (GPL-2): https://github.com/c4dm/nnls-chroma
- MIREX 2025 chord estimation results: https://music-ir.org/mirex/wiki/2025:Audio_Chord_Estimation_Results
- Jiang et al. 2011, chroma features for chord recognition: https://www.audiolabs-erlangen.de/content/05_fau/professor/00_mueller/03_publications/2011_JiangGroscheKonzMueller_ChordRecognitionEvaluation_AES42-Ilmenau.pdf
- Oudre et al. 2009, template-based chord recognition: https://ismir2009.ismir.net/proceedings/PS1-17.pdf
- Mic chord detection, how it works: https://chordshuffle.com/en/guides/guitar-chord-mic-detection
- CAMELOT WHEEL trademark filing: https://trademarks.justia.com/994/31/camelot-99431013.html
- Musicologize, are chord progressions protected: https://www.musicologize.com/chord-progressions-copyright
- web-audio-beat-detector (MIT): https://github.com/chrisguttandin/web-audio-beat-detector
