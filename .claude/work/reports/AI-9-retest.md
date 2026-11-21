# AI-9 re-check (fix 1) · qa-tester · 22 Nov 2026 · preview-ai-9 @ 8ee32bd

## Verdict: NOT READY. Problems 1–3 must be fixed, 4–5 should be (they're on main too). The fixes look small, and everything from round 1 is fixed.
All 10 problems from AI-9-test.md are fixed except 6, which is the known engine issue. All 6 Try steps pass, and so do the memory chains, sung parts, Song view and the AI-1/4/6/8 checks.

New phrasings still break the owner's rule ("a comment about one element changes ONLY that element"):
- naming two protected parts as a list ("keep the drums and bass…");
- praise with no verb ("nice bassline!", "sick drums,");
- questions about the bass.

All three changed a part the user didn't ask to change.

**check.sh: CHECK OK, SMOKE OK, 98 checks, on the 3rd run (8:46).** Runs 1 and 2 each failed on one timeout at the whole-song MP3 step (`Runtime.callFunctionOn timed out`). This was CPU contention: 3 other agents were running check.sh and Chrome on this 2-core machine (load 10 to 15). Every other check passed in those runs. All 7 AI-9 smoke checks pass.

## Problems (numbered, with steps)
Setup for all of them: a new song, then a house loop of drums, bass, chords and melody (seeds 5300 to 5303, as in the smoke test). Basic mode (offline) unless it says AI.

1. **MEDIUM-HIGH: listing two protected parts still lets one of them be rewritten.** This is the owner's exact complaint.
   - a) Say "keep the drums and bass, just try another melody". Result: a **new bassline**, and the melody is unchanged. The reply says "Kept the drums as they are." The same happens with "keep the drums and the bass, …".
   - b) Say "leave the drums and bass alone, change the melody". Result: a new bassline, and the melody is unchanged.
   - c) AI path for (a), with [vary bass, vary melody]: the bass is rewritten as well.
   - Smaller: "keep the drums and the chords, new bassline" changes the right part, but the reply says only "Kept the drums as they are."
   - These work: "keep drums & bass, new melody", "don't touch the drums or the bass, change the melody", "the drums and bass are fine, change the melody".
   - Likely cause: `protectSaid` splits on "and", so "bass" lands in `rest` as a named part. Files: `src/actions.js` (`protectSaid` and `KEEP_SEP`, assistant-dev).
2. **MEDIUM: praise with no verb changes the praised part, not the part that was named.**
   - "nice bassline! now make the melody a bit shorter": the **bassline** gets shorter, and the melody is unchanged.
   - "great chords. make the melody simpler": the **chords** get simpler.
   - "sick drums, change the chords": the drums are regenerated and the chords change too.
   - The AI path is fine when Llama sends [reshape melody]. KEEP_PRAISE needs "is/are/sounds…", so "nice/great/sick/love those X" at the start of a sentence isn't seen as praise. The offline parser then takes the first part it finds. Main is wrong here too, in other ways. Files: `src/actions.js` `protectSaid`, `src/maker.js` `localBrain`.
3. **MEDIUM: questions about the bass rewrite the bass.**
   - In F# minor, "is the bass in F sharp or G flat?" gives new bassline notes, a new seed, and an Undo step. The reply is "Done: Bassline on Pluck Bass in F♯ minor."
   - "is the bass in F sharp?" and "what note is the bass playing?" give a new bass seed and an Undo step, with the reply "Bassline on Pluck Bass in A minor".
   - AI path: "what note is the bass playing?" with [add_bass] does the same.
   - Chord questions are fine: "which chords are these" and "is that an E flat or a D sharp in the chords?" change nothing and spell flats correctly.
   - This also happens on main, but fix 1 says questions change nothing (`askFix` only catches chord and key questions). Files: `src/maker.js` (askFix), `src/actions.js` `onePart` (`asked`).
4. **MEDIUM (known limit, worse than the report says): "slaps".**
   - "the drums slap, change the chords": the **drum track is switched to the Slap Bass instrument**, and the chords are unchanged.
   - "the beat slaps but the bass is too loud" and "the drums slap but the bass is too loud": the drums go down 5 dB, and the bass is unchanged.
   - "this kick slaps": a new drum pattern.
   - AI path for "the drums slap, change the chords" with [add_drums, vary chords]: the drums are regenerated.
   - "the beat is fire but the bass is too loud" works.
   - Main does the same. To a producer, "slaps" is everyday praise, so yes, it matters. Add "slap(s)/bang(s)/hit(s) hard/knock(s)" to the praise words, and never read "slap" as an instrument when it follows drums/beat/kick. Files: `src/actions.js` KEEP_PRAISE; the instrument word match in `src/maker.js`.
5. **MEDIUM (memory): "make it shorter", "shorter" and "make them longer" right after a part comment don't work.**
   - "change the melody", then "make it shorter", gives "I couldn't turn that into a change." The focus is lost, so the next "a bit louder" turns up the **whole song** (+1.8 dB on every part).
   - The same happens after "make the melody simpler", after "no, the other one", and with "make them longer" after "new chords". Seeds 5300, 7100 and 9100, all the same.
   - These work: "make it simpler", "make it brighter", "softer", "louder", "turn it down a bit", "another one". Main is the same.
   - Files: `src/maker.js` `focusText`. `BARE_LEVEL` already lists shorter and longer on the AI path.
6. **LOW-MED: on the AI path, the reply keeps the AI's false claim after the guard has removed the action.**
   - "the bass is too loud" with [mix all −3] and the AI reply "Turned the whole song down 3 dB.": only the bass moved, but the reply still says the whole song.
   - "the drums are fine, just change the chords" with [add_drums, vary chords] and the reply "Here are fresh drums and new chords.": the reply becomes "Here are fresh drums and new chords. Kept the drums as they are."
   - "new chords" with [vary chords, add_melody] and the reply "New chords and a new melody on top.": the reply adds "I only changed what you asked about…".
   - When the guard drops something, the reply should be rebuilt from what actually changed, as `BATCH.retold` already does for unnamed parts. File: `src/assistant.js`.
7. **LOW-MED: on the AI path, arrange and vibe ride along with a one-part comment when nothing is protected.**
   - "the bass is too loud" with [mix bass −3, arrange full]: the song is laid out as a 96-bar full track.
   - "new drums" with [vibe trap, add_drums trap]: `PROJ.prog` changes ([0,2,5,6] to [0,5,0,6]) but the chord notes don't. "which chords are these" then answers "A minor, F, A minor, G" while Am Am F G plays.
   - Fix 1 drops vibe, style, new_project and arrange only when a part is protected. File: `src/actions.js` `onePart`.
8. **LOW: on the AI path, an absolute volume on a named part can go the wrong way.**
   - "the melody is too quiet" with [mix melody volume 20], starting from 40: the melody goes down to 20. Only `track:"all"` is guarded.
   - "play the bass an octave lower" sent as [mix bass volume 60] is a volume change, not a transpose. The prompt fix should prevent it, but the executor doesn't.
9. **LOW: "everything except the melody should be quieter" gives "I couldn't turn that into a change."**
   - "turn everything down except the melody" works. Main turned the melody down, which was worse.
10. **LOW: going back twice doesn't reach the original chords.**
   - "new chords" ×2, then "go back to the previous chords" ×2, moves between the last two versions: back 1 is version 1, and back 2 is version 2 again.
   - "go back to the original chords" and "go back to the first chords" also give the previous version, with the reply "back to the previous version".
   - The bassline follows every time.
11. **Known and unchanged (engine):** "make the drums busier" says "energy N of 5". In my runs, hits did change.

## The two known limits: does a musician care?
- **"the drums slap, change the chords": yes.** See 4. It's worse than "can slip through": the drum kit turns into Slap Bass and the chords never change. "Slaps" and "bangs" are among the most common things producers say.
- **"the drums are fine, make it louder": only a little.** The drums go up 1.8 dB to full volume, with one Undo and a clear reply. Most people mean the song, or the rest of the song, not the part they just praised. Turning up only the praised part is the least likely meaning, but it's harmless. Low.

## What I checked (numbers)
Scripts are in `/home/claude/reports/qa-ai9r/`. Each case starts from a fresh loop and diffs the **whole project**: every field of every track, plus the song's tempo, key, prog, sections and master. I also counted Undo steps and checked that Undo restores the song exactly.
- **T1, every round-1 problem (31 cases, offline and AI):** 31/31. Every change was one Undo, and every Undo restored the song exactly.
  - P1: offline and AI, with the drums untouched and "Kept the drums as they are."
  - P3: no Melody 2 and no new drums.
  - P4: notes replace on a sung or played part is refused, with "as you sang them" or "as you played them".
  - P5: Hinglish ×4 is now right, and "brighten up" is high EQ only.
  - P7: octave = transpose ±12, exact, and playback doesn't start. "two octaves up" also works.
  - P8: F minor reads "F minor, D flat, B flat minor, C minor"; B♭ major uses flats; E minor uses sharps.
  - P9: song-wide mix and fx move onto the bass only.
  - P10: the grammar fixes, "louder" after the melody, and "make it softer" with no focus = whole song −5 dB.
- **Try steps 1–6:** all pass.
  - Step 1: chords and bass change; the drums stay identical.
  - Step 2 as a chain: melody only, then bass vol only.
  - Step 3: the bass root is in the chord in 4/4 bars at every step, over 3 seeds, offline and AI (24 of 24 states).
  - Step 4: bass simpler, then −5 dB with the same notes, then exactly −12 with the volume kept, over 3 seeds.
  - Step 5: flats.
  - Step 6: Always listening on while playing, then "Keys, stop listening": the song keeps playing, and listening and the mic are off.
- **New phrasings, offline (23 plus the known limits):** 18/23 right. The 5 failures are problems 1, 2, 3, 4 and 9 above.
  - Right: praise plus change, "don't touch", Hinglish ("drums theek hai, bass ko thoda kam karo", "bass mat chhedo, melody badal do", "chords mast hai, bas melody thodi simple karo", "bassline badhiya hai, chords thode chhote karo"), "change the bass, not the drums", "the snare is great but the hats are too loud", "I like the drums but they're a bit loud", and "the chords are fine" on its own (no change).
  - Extra probes (t3b and t10): see problems 1–4, 9.
- **AI path, stubbed Llama actions through `handleRequest` with fetch mocked (28 + 10 + 5 cases):** the guard holds in 24 of 28.
  - Right: wrong-part vary, add_chords for "change the chords" (no copy), add_bass and notes-replace for "simpler" (become reshape), song-wide mix and fx after a one-part comment, protected parts named in actions (A10–A16, A24, A26), questions with a key action, and "happier" with a key change (key dropped).
  - Failures: problems 7 and 8. Reply honesty: problem 6.
- **Memory chains (3 seeds):**
  - simpler bass, then "softer", then "an octave lower": exact (only the bass, volume −5 dB with the same notes, then every note −12).
  - new chords ×2, then go back ×2: the bass follows in 4/4 bars at every step (see 10 for the toggle).
  - "change the melody", then "no, the other one": back to the exact previous melody. Then "make it shorter" fails (problem 5).
  - `projectState().recent` holds the change log, 1,175 characters.
- **Sung and played parts:** a real sung bassline (fake mic, 11 notes) was kept in **16 of 16** comments: 8 offline, 6 AI (reshape, vary, add_bass, notes replace, vary chords+bass, drums-fine+vary bass), Hinglish, and softer (volume only). "new chords" says "your bassline stays as you sang it". An imported MIDI part ("Lead") was kept in 6 of 6.
- **Song view (96-bar full track):** 12 of 12 one-part comments changed only their part, with the sections untouched. On main, 9 of these 12 change the wrong part or add tracks.
- **AI-1 song moves (13):** identical to main.
- **AI-4/6/8 phrasings (31):** 29 identical to main. The other 2 are better on the branch: "make the chords happier" now gives new chords, where main added Chords 2, and "make the bass warmer" is an EQ change, where main regenerated the bass.
- **Sound** (offline `renderAudio`, 4-bar loop):

  | State | Peak | RMS | Clipping | Silent blocks |
  |---|---|---|---|---|
  | Baseline | −0.54 dBFS | −6.7 dB | 0 samples | 0 |
  | After Try steps 1–2 | −0.61 dBFS | −6.8 dB | 0 samples | 0 |
  | After step 4 | −0.67 dBFS | −6.8 dB | 0 samples | 0 |

- **Page errors:** 0 in every run. The only console error is fonts.googleapis.com, which the sandbox proxy blocks.
- **check.sh:**

  | Run | Result | Time |
  |---|---|---|
  | 1 | FAIL, timeout at the whole-song MP3 | 7:53 |
  | 2 | FAIL, same step, 58 PASS / 1 FAIL | 8:58 |
  | 3 | **SMOKE OK 98, CHECK OK** | 8:46 |

  Other agents' check.sh and Chrome runs (sk-t7, sk-ux15b) were running at the same time, on 2 CPUs. The developer measured 2:43 on a quiet machine. I didn't change the test.
  - Test upkeep for later: when a step times out, `tests/smoke.mjs` leaves Chrome running. One orphaned renderer kept a core busy until I killed it. A `finally { b.close() }` and a higher `protocolTimeout` would help.

## Screenshots
`/home/claude/reports/qa-ai9r/`:
- `shot-t2-start.png`
- `shot-t2-drums-fine.png`
- `shot-t2-kick-great.png`
- `shot-t2-octave.png`
- `shot-t2-stop-listening.png`
- `shot-song-view-bass-simpler.png`
- `shot-sung.png`
- `shot-sung-after.png`

No layout problems: the chat bubble and chips read correctly, and the Song map chips show after a one-part comment.
