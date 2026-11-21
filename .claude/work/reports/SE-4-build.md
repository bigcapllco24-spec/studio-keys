# SE-4 build report (sound-engine-dev, 22 Nov 2026)

Branch `preview-se-4`, pushed, head **6dfe2d7** (4 WIP commits on top of origin/main b5e7016). main was not touched.

## What changed
- `src/music.js`
  - **Open voicings in every style (D1 = B).** New `chordVoicer()` puts the root low, never under C3 (MIDI 48), usually with the fifth beside it, and the third and any colour note an octave up. The upper notes move as little as possible from one chord to the next, the way a player's hands would. Pads, sustain, seventh, plucks332, stabs, pulse8 and arp all use it. Rock keeps its power chords (already open). The old close `voice()` is unchanged and still used by melodies and sung chords.
  - **Colour notes about 30% of the time (D2 = A).** add9 about 15%, a 7th about 12%, otherwise a plain triad. A chord gets the same colour every time it comes round. Colours only go where they sound right: a 9th a whole tone above the root, a 7th on chords with a perfect fifth. `pads` no longer adds a 7th and a 9th to every chord.
  - **New progressions in `PROGS`.** Minor: i VII iv VI, v VI i VII, VI III VII i, i v VI v, v VI VII i, VI i VII v. Major: IV I, I iii V V, I IV vi IV. These are scale degrees only, from RES-4.
  - **2-bar holds.** In loops of 8 bars or more, the progressions the pack holds for 2 bars (i VII iv VI, i v VI v, IV I, I iii V V, I IV vi IV) play each chord for 2 bars. Bass and melody follow, because they read the same `chordPlan`. A held pad sounds as one long chord, with no new attack in its second bar. `PROJ.progHold` (true/false) can force holds on or off if assistant-dev wants a "hold the chords longer" command later.
  - **"Another one" changes the voicing.** Each new take uses a different voicing shape from the last one (4 held shapes, 3 seventh shapes, 3 short ones).
- `src/groove.js` (ARTISTS not touched)
  - New measured feel `FEELS.amh` (RES-4, 44 PML percussion loops), used by melodic and organic house. It is straight, with the pack's accent curve on hats, shaker and percussion (downbeats strong, 8ths medium, off-16ths soft) and about 5.5 ms timing spread on hats and percussion. Kick and clap stay on the grid.
  - Default swing for melodic house goes from 0.04 to 0, and for organic house from 0.07 to 0.
  - With this feel the shaker plays every 16th, shaped by the curve, at the same energy as before. Other styles keep the old off-beat shaker.
  - SE-3's swing ladder still works: "more swing" (over 58%) switches to the swung feel, and "less swing" steps down as before.
- `tests/smoke.mjs`: 3 checks added (below).
- `index.html` rebuilt.

## How it sounds different
The pads used to be one tight cluster around A3 to E4, the same spot every time. They now spread over 15 to 24 semitones: deep root and fifth underneath, airy third on top.

Example, an A minor chord:
- Before: A3 C4 E4 (pads: G3 A3 C4 E4 B4).
- Now, depending on the take: A3 E4 A4 C5, A3 E4 C5 E5, or A3 A4 C5 E5.
- Hip-hop and lo-fi keep their 7ths, voiced like a keys player would: A3 G4 C5 E5 (Am7), or A3 E4 G#4 C#5 (Amaj7 in lo-fi).

Most chords are now plain, with an occasional add9 or 7th, so the progression sounds less like a keyboard preset. In 8-bar loops some progressions breathe on 2-bar chords. Melodic and organic house percussion is straight and tighter: hat and percussion timing wander dropped from 7.6–8.7 ms to 4.5–4.7 ms, and the kick wander from about 3 ms to 0.

## Numbers
**Chord spans, from the headless probe** (A minor or major, 8 bars, 3 takes per style):

| | Narrowest chord | Widest chord | Lowest note |
|---|---|---|---|
| Before | 7–11 semitones | 8–19 semitones | 55–57 |
| After | 15–22 semitones | 24 (maximum allowed) | 48 to 50 (C3–D3) |

- Pack target: median 16, range 14–40.
- Rock is unchanged at 12 (power chords).

**Low-mid energy, chords stem in context, 120–500 Hz** (`renderAudio`, 8 bars, full project of drums, bass, chords and melody, volume 100):

| Style | Before | After | Change |
|---|---|---|---|
| Melodic house (darkpad) | -19.5 | -21.6 dB | -2.1 |
| Pop (piano) | -13.2 | -12.0 dB | +1.2 |
| Hip-hop (epiano) | -9.7 | -10.3 dB | -0.6 |
| House (piano) | -16.3 | -16.8 dB | -0.5 |

Below 120 Hz the chords rise, because the root now goes down to C3. The rise is largest in pop (-43.5 to -25.1 dB). It still sits 17 dB or more under the mix's own low band, which barely moves (pop -8.0 to -8.1, hip-hop -7.8 to -7.4, house -4.6 to -4.7). It does not fight the bass.

**Full mix, approximate LUFS, before → after:**

| Style | LUFS before | LUFS after | Peak after |
|---|---|---|---|
| Melodic house | -2.3 | -2.5 | 0.983 |
| Pop | -5.2 | -5.2 | 0.995 |
| Hip-hop | -5.2 | -5.0 | 0.997 |
| House | -2.7 | -2.7 | 0.988 |

- Peaks are linear, and no sample goes over 1.0.
- Chords-stem loudness moved by 1.2 dB at most: melodic house is 1.2 dB quieter (4 notes instead of 5), pop +0.2, hip-hop -0.3, house +0.5.

**Percussion feel, melodic house:**
- Average velocity: downbeat 0.65, 8ths 0.58, off-16ths 0.43, in the pack's order. Before it was 0.52 / 0.43 / 0.52.
- Organic house: 0.68 / 0.64 / 0.44.

**Check:** `bash .claude/tools/check.sh` gave `SMOKE OK: 84 checks` and `CHECK OK`. After a small test fix the smoke test was run twice more and passed 84/84 both times. The baseline on main also passed (81), but one run on the loaded machine failed with a protocol timeout.

## Smoke checks added (tests/smoke.mjs, end of file)
1. `SE-4: new pad chords are open (every chord spans ≥ 14 semitones, low root C3 or above)`: Ben Böhmer vibe plus chords. Measured: narrowest 19, lowest note 48.
2. `SE-4: the new progressions come up, and hold 2 bars each in an 8-bar loop`: 6 of the 6 new minor progressions came up in 60 picks, and i VII iv VI over 8 bars gives 0 0 6 6 3 3 5 5.
3. `SE-4: "another one" on the chords changes the voicing too`: checked through both `vary` with `progression:false` and `localBrain('give me another chord progression')`.

## For other developers / the lead
- **assistant-dev (`src/actions.js`):**
  - The `vary` reply writes every numeral in lower case ("vi–iii–vii–i"). In minor that should read VI–III–VII–i. Cosmetic, and older than this change, but the new progressions show it more.
  - `regenTrack` drops the `cs` override that `add_chords` gives held instruments (strings, choir or organ on a stabs style become pads). "Another one" on such a track goes back to the style's own rhythm. Also older than this change; the fix is to store `t.cs` and pass it through.
- **studio-ux-dev (`src/studio.js:207`):** sung chords still use the close `voice(triad,55)`. If the owner wants open voicings there too (D1 says every style), the fix is one line: use `chordVoicer(k,'held',rng(seed))` per chord. I left it alone, since that file isn't mine and UX-14 is about keeping sung notes as sung.
- No new actions, no Worker or prompt change, no new samples, and `index.html` grew by about 5 KB.

## Known limits / what's left
- The pack's short "push" (a chord landing half a beat early, 9% of chord starts) isn't built. It wasn't in the brief.
- The full mix at volume 100 sits near 0 dBFS on the limiter, at about -2 to -5 LUFS. That was already the case before this change. Worth a look in SE-1 (mix).
- Voicing shapes alternate per take for the whole session (`VOICE_LAST`), so one seed can give a different voicing if it is regenerated later. Nothing in the app regenerates chords with an old seed today.

## Try list (test link /p/preview-se-4/)
1. Say "make a melodic house track like Ben Böhmer", then "add chords". The pad should sound wide and deep: low root and fifth underneath, airy notes on top.
2. Say "another one" (or "new chords") two or three times. Each time the progression and the spread of the chord change; listen for i VII iv VI or VI III VII i.
3. Set the loop to 8 bars and ask for new chords a few times. Some progressions hold each chord for 2 bars, and the pad rings as one long chord.
4. Try "make a pop beat", then "add chords", and "make a hip-hop beat", then "add chords". The piano chords sound open, not muddy, and hip-hop keeps its 7th chords. On a melodic house beat, "more swing" and "less swing" still step 66%, then 58%, 54% and straight.
