# RES-3 · Drum feel from Ableton Drum Essentials (13 Nov 2026)

The owner uploaded his copy of Ableton's Drum Essentials pack (107 Drum Racks, 183 MIDI grooves at 60-160 bpm, about 1,250 samples). Ableton's licence lets him use the sounds in his music but not redistribute them, and this repo and the live site are public, so **no samples, kits or note-for-note patterns go into Studio Keys**. The owner chose "grooves only": we measured how the grooves *feel* and keep only averaged numbers.

Data: `.claude/research/data/RES-3-drum-feel.json`. Scripts (run on a local copy of the pack, not in the build): `.claude/research/scripts/parse_grooves.py`, `templates.py`.

## What the grooves show
1. **Straight is the norm.** 154 of 183 grooves sit on a straight 16th grid, hip-hop tempos included.
2. **When they swing, they swing hard.** All 15 swung grooves put the off-16ths a full third of a 16th late (classic 66% / triplet swing, `swing: 0.333` in our units). Our engine tops out at 0.22, and "more swing" sets 0.2 (about 60%): lighter than any swung groove in the pack.
3. **Hats breathe in 16 steps, not 4.** Straight hats: downbeats about 0.7, beats 2 and 4 the loudest (0.76 / 0.73), everything in between about 0.5. Swung hats accent beats 2 and 4 harder (0.8) and drop the off-16ths to about 0.35-0.45. Our engine picks one of five hand-made 4-step accent shapes at random.
4. **Ghost snares sit at about a third of the backbeat** (0.33 straight, 0.27 swung, 0.4 live kits). Ours are 0.22-0.32 absolute: about right.
5. **Live (acoustic) kits drift by role, not at random.** In the 12 loose grooves the kick pushes about 10 ms early, the snare about 4 ms early, hats spread widely (±27 ms) around the grid. Our `human` flag adds the same ±8 ms random wobble to every drum.

## For sound-engine-dev
- Replace `HAT_ACCENTS` with the 16-step `vel.hatc` curves per feel (straight / swing16), with small random variation so "another one" still differs.
- Let swing reach 0.33: "more swing" → 0.33, cap 0.4.
- For `human` styles, use per-role push (kick −10 ms, snare −4 ms) and spread (`offset_ms`) instead of one uniform jitter. Clamp so nothing lands before beat 0.
