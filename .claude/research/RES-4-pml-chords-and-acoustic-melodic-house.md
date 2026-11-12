# RES-4 · Chords and acoustic melodic house, from two PML packs (13 Nov 2026)

The owner uploaded two Production Music Live packs: **Chords For Life** (20 chord MIDI files, all 120 bpm) and **Acoustic Melodic House bonus pack** (119 audio loops: chords, arps, bass, percussion, atmos, sequences). PML's info sheet says the MIDI is royalty-free for your own productions. Neither pack allows redistribution, and this repo is public, so **only scale-degree progressions, averages and measurements are kept**. No files, notes or audio are copied.

Data: `.claude/research/data/RES-4-chords-and-amh.json`. Scripts: `.claude/research/scripts/chords.py`, `chord_stats.py`, `audio_feel.py`.

## Chords (18 of 20 files usable; 2 had key labels that didn't match their notes)
1. **Open, spread voicings.** The median chord is 4 notes over **16 semitones** (bass root and fifth low, third and colour notes an octave up), with a range of 14 to 40. Our `voice()` stacks everything close together above G3 (spread about 7-10), which is part of why our pads sound like a keyboard preset and not a producer's chord.
2. **Colour is used sparingly.** 70% plain triads, 15% add9, 12% sevenths, a few sus chords. Ours: `pads` always adds a 7th and a 9th.
3. **Chords hold longer.** Many 8-bar loops with 4 chords at 2 bars each; some 1-bar loops use a short push (a chord landing half a beat early, 9% of chord starts).
4. **Progressions we don't have yet** (scale degrees, 0 = tonic; these are common progressions, not anyone's song): minor `i VII iv VI`, `v VI i VII`, `VI III VII i`, `i v VI v`, `v VI VII i`, `VI i VII v`; major `IV I`, `I iii V V`, `I IV vi IV`.

## Acoustic melodic house loops (119)
1. **Tempo** 119-128, mostly 120 / 122 / 124 (median 122). 88 of 96 keyed loops are minor. Our melodic house at 122 is right on it; organic house at 116 sits below this pack.
2. **Percussion is straight and lightly human:** swing median 0, timing spread about 5-6 ms (live drum kits in RES-3: 14-27 ms). Accents dip hard on the off-16ths: downbeats about 0.6, 8ths about 0.5, off-16ths about 0.3 (stronger contrast than RES-3's straight hats).
3. **Mix shape by part** (for SE-1): bass loops near mono (width 0.11), chords, arps and combos wide (0.7-0.8), percussion in between (0.42). Bass is the densest (crest about 11 dB), chords and percussion stay dynamic (18-20 dB). The top end is soft: the 2-8 kHz band sits about 19-28 dB under the whole loop, so the warm "acoustic" sound comes from not pushing the highs.

## For sound-engine-dev
- `voice()`: open voicings (root and fifth low, third and colour above, 4-5 notes, about 16 semitones wide) for pads and chords, with a few variations so "another one" changes the voicing too.
- Add the new progressions to `PROGS`; allow 2-bar holds (degrees repeated) in 8-bar loops.
- Melodic and organic house percussion: use the RES-4 16-step accent curve and about 5 ms spread (not RES-3's live-kit push).
- SE-1 mix targets: bass mono below about 120 Hz, chords and arps wide, highs gentle on organic and melodic house.
