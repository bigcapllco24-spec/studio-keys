# UX-14 build report: sung parts keep the notes you sang
studio-ux-dev · 22 Nov 2026 · branch `preview-ux-14`, head **329d851** (pushed; main untouched)

## Causes found (numbers from the new sung-notes lab)
I built a lab (`tests/sung-lab.mjs` + `tests/sung-synth.js`) that synthesizes voice-like takes: harmonics, vibrato, drift, a scoop into each note, onsets up to ±35 ms off the grid, breaths, and optionally a laptop mic low cut. It runs them through the real `TAKE.finish` and compares notes in with notes out. Scores are notes with the exact pitch out of notes sung ("late" means one 16th late).

| take | main | UX-10 only | UX-14 only | UX-10 + UX-14 |
|---|---|---|---|---|
| bass E2-A2, song key E minor | 13/14 | 13/14 | 14/14 | 14/14 |
| bass E2-A2, song key A minor (from a vibe) | 11/14 | 11/14 | 14/14 | 14/14 |
| bass, laptop mic (low cut 150 Hz) | 13/14 | 13/14 | 14/14 | 14/14 |
| bass sung an octave up (E3-A3) | 13/14 | 13/14 | 14/14 | 14/14 |
| octave-jump bass E2/E3, A2/A3 | 0/24 | 0/24 | 24/24 | 24/24 |
| offbeat house bass, short notes | 16/16 | 16/16 | 16/16 | 16/16 |
| melody D major legato, no key | 0/15 | 15/15 | 0/15 | 15/15 |
| melody D major, song key A minor | 0/15 | 11/15 | 0/15 | 15/15 |
| melody, singer 35 c flat, wide vibrato | 0/15 | 14/15, 4 late, +8 extra notes | 0/15 | 15/15, 2 late |
| melody with big scoops, noisy room | 0/13 | 13/13, 5 late | 0/13 | 13/13 |
| sloppy singer ±40 c per note | 0/13 | 13/13 | 0/13 | 13/13 |
| fast legato 16th run | 13/16, 14 late | 14/16 | 10/16, 7 late | 16/16 |
| repeated notes ("da da da") | 15/16 | 15/16 | 15/16 | 15/16 |
| chord roots Am F C G, key A minor | 4/4 | 4/4 | 4/4 | 4/4 |
| chord roots D A Bm F#m, key A minor | 2/4 | 2/4 | 4/4 | 4/4 |
| chord roots D A Bm F#m, no key | 2/4 | 2/4 | 4/4 | 4/4 |

1. **Key snapping (the main cause, mine, fixed).** `shapePart` snapped every bass and chord take to the song's key, and melodies too, because "Snap to the song's key" was on by default. The key is often one the user never chose: an artist or style vibe sets it. Over an A minor vibe, a bassline sung in E minor lost its F# and G# (3 of 14 notes changed). Chord roots off the key became other chords (F# became F, B became B diminished), and with no key yet, chords were built in C major. The live mic tracker and humming to Keys also snapped. Real fake-mic take, song key E major, sung C E G A: main gave B F# F# B, now it gives C E G A.
2. **Legato singing gave 0 notes on main** (the level gate sat above every frame), so the take fell back to the late, key-snapped live notes. **UX-10 fixes this** (its capped gate). I did not copy it.
3. **Detector errors (mine, fixed).** A note was named by its first frames, so a scoop or a flat singer gave a note a semitone off. Vibrato across the half-semitone split one held note into up to 8 extra notes. Legato onsets came a 16th late.
4. **Bass register.** The octave shift used the median, so an E2/E3 octave bassline went down to E1 (0/24). It now uses the low notes. Bass notes also held up to 2 beats over rests. Now they hold only across breaths of up to a 16th, and rests stay rests.
5. **AI path.** The prompt routes "sing" correctly, but nothing stops the AI from also sending `add_bass` or `vary` for the part being sung. The offline parser sends `add_bass` for "record my bassline" and "let me record the bass with my voice". Details under "Needs other owners".
6. **Regeneration (checked, not a cause).** Sung takes have no `gen` flag. `vary`, `regenTrack`, "another one", song layouts and AI-1's `freshEvents` all skip them. AI-12 (build the song track by track) must keep that rule.

## What I changed
- `src/edit.js`: `audioToNotes` gets a post-pass, `tidySung`. Only the return line of `audioToNotes` changed, so it merges cleanly with UX-10. The post-pass does four things:
  - starts legato onsets at the first frame on the new pitch;
  - takes each note's pitch from the median of its frames, leaving out the scoop and the glide into the next note;
  - joins vibrato pieces and scoops into the note they belong to (a re-sung note stays two notes);
  - measures the singer's own tuning across the take and returns `c`, how far each note sits from its semitone.

  Imports ("turn the voice note into a bassline") get the same treatment.
- `src/studio.js`:
  - `shapePart` no longer snaps any pitch. A note sung clearly between two semitones (25-50 c off, after the singer's tuning) goes to the neighbour that is in the key. A note sung on its semitone always stays.
  - Chords are built on the sung root: in the song's key when the root fits, otherwise in the key that holds all the roots, otherwise as a borrowed major or minor chord.
  - Bass octave and breaths work as described in cause 4.
  - The take sets the song's key from the singing when there is no key yet, or when the key came from a vibe and only drums exist. A key the user chose (key menu or "key E major") is never changed (new `PROJ.keyBy='you'`).
  - The reply says when notes were kept outside the key, e.g. "Got it: 11 notes in E major (8 outside the key, kept as you sang them)".
- `src/mic.js`: the key snap now applies only when playing live in the Sing panel, never to takes or hums.
- `src/body.html`: the checkbox now reads "Snap live notes to the key" (tooltip: sung takes keep your notes). The panel text no longer says the voice is saved as a track (owner rule of 13 Nov). Checked in Emerald, Velvet and Sapphire.
- `src/actions.js` (small, for the AI-1 merge tonight):
  - (a) new `singPart(a)`, used by `ACT.sing` (same parsing as before);
  - (b) new `singAlone(list)`, called on the first line of `runActions` (`for(const raw of singAlone(list||[]))`). When a request sings a part, it drops `add_<part>`, `vary`, `notes` and `convert` for that same part and any second sing. Other parts (e.g. add_chords plus sing bass) still run;
  - (c) `ACT.key` sets `PROJ.keyBy='you'`.
- Tests:
  - `tests/smoke.mjs`: 5 new lines (4 sung takes keep their notes; a sung take stands alone);
  - `tests/sung-synth.js`, `tests/sung-lab.mjs`: the lab (`node tests/sung-lab.mjs [--only regex]`, about 90 s, not part of check.sh).

## UX-10 is needed
Without UX-10, legato melodies still give 0 analysed notes, as on main today. My fix covers basslines, chords and detached melodies on its own. **Release UX-10 first, then UX-14.**

I merged both in a scratch tree (not pushed):
- `src/edit.js` merges cleanly.
- `src/studio.js` has one conflict line in `TAKE.finish`. Keep UX-10's `audioToNotes(makeBuf(pcm,sr),{holes:TAKE_REC.patched})` and my `c:x.c` in the `det.map`.
- `tests/smoke.mjs` conflicts only between UX-10 and newer main.

On the merged build, the lab got the right-hand column above and the smoke test passed (86 checks, with main's smoke file). The lab drives UX-10's `TAKE_REC` too.

## Needs other owners (assistant-dev)
1. `cloudflare/worker.js` prompt:
   - In the sing part list, replace "chords (they sing one note per chord and each becomes a chord in key)" with "chords (they sing one note per chord and each becomes a chord built on the note they sang)".
   - After "Use whenever they want to sing, hum, beatbox a line or record their voice." add: "What they sing is their own part: their notes are kept exactly as sung (pitch and rhythm). Never send add_bass, add_chords, add_melody, vary or notes for the part they are about to sing in the same reply, and never offer to correct their notes. \"record my bassline\", \"let me record the bass with my voice\", \"I'll hum it\" = sing. Right after a sung take, \"again\", \"one more time\", \"let me try that again\" or \"another take\" = again, never vary."
2. `src/maker.js`: "record my bassline" and "let me record the bass with my voice" give `add_bass` today; they should give `sing:bass`. "i'll hum it" gives nothing; it should give `sing:melody`.
3. `src/assistant.js`, hum flush (about line 158): delete `if(key) ev.forEach(e=>e.n=snapToKey(e.n,key));`. Hummed melodies still snap there.
4. `src/actions.js` `vibe`: when the user names a key (`a.key`), set `PROJ.keyBy='you'` so a take keeps it.

## Testing
- `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK: 86 checks**. The first full run failed once on "Save after deleting the open song saves it again" (a save-timing check that doesn't touch this code); the rerun passed.
- Lab: four builds as in the table.
- Real takes with the fake mic (`sing.wav`), song key E major:
  - main snapped the take to B, F# and B;
  - UX-14 kept C, E, G and A. With only drums and a vibe key, the key became C major for the bass take and A minor for the melody take. With a key the user chose, it stayed E major and Keys said "8 outside the key, kept as you sang them".
- No sound changes, so no render levels to report. `tidySung` adds only a few ms to the take analysis.

## Known limits
- On main's tracker alone, fast legato 16th runs still come out a 16th late (10/16, 13/16 on main); with UX-10 they are 16/16.
- Same-note repeats with under ~30 ms of silence can merge (15/16, same as main).
- Chords on an in-key 7th degree are still diminished, as UX-2 designed (e.g. B in A minor gives B dim).

## Try it (for the owner)
1. Ask Keys for drums "like Ben Böhmer", then say "Keys, let me sing the bassline" and sing a line with a note that isn't in the song's key. Each note you sang plays back, and Keys says how many it kept outside the key.
2. Sing a bassline that jumps octaves (low E, high E). It stays in the bass register with the jumps intact.
3. Say "let me sing the chords" and sing D, A, B, F#. You get D, A, Bm, F#m, built on your notes.
4. Sing a melody slightly flat with vibrato. You get one note per sung note, no extra stubs (best with UX-10 merged).
