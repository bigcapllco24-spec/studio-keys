# AI-4 re-check after the fix round (qa-tester) · 13 Nov 2026 · `preview-ai-4` @ 0f479d2

**Verdict: READY.**
- All 7 problems from my first check are fixed. Problem 6 was a note, and the dev made the first step a bit bigger.
- check.sh passes with 26 checks, 0 page errors.
- Every mixing change and every transcribe is one undo step.
- Singing, voice notes, "add a bassline" and "another one" behave as on main.
- Three LOW notes are left below. None blocks the release.

## check.sh
```
PASS bundle syntax
PASS worker syntax
PASS drums like Ben Böhmer at 124 · 168 hits, kitMelodic
PASS "another one" makes a different groove
PASS track like Stephan Bodzin (drums, bass, chords, melody) · drums:kitDeepTechno:120 bass:rollbass:48 chords:darkpad:20 melody:mhpluck:64
PASS note editor copy/paste and undo · 20→23→20
PASS MP3 download (4 loops, decodes back) · 727 KB, 31.0 s
PASS track FX: panel, add effect, assistant reverb, sidechain preset
PASS "the bass is muddy" cleans the bass EQ, same notes · low cut 28→50 Hz
PASS "the mix is muddy" changes the mix FX · chords low cut 170→238 Hz
PASS "add a bassline", "sing the bassline", "voice note", "another one" unchanged · add_bass | sing:bass | sing:voice | vary
PASS "boost the lows on the bass" raises the bass low EQ · low 0→3 dB
PASS "still muddy" after "the bass is muddy" goes further on the bass · low cut 60→70 Hz
PASS "add brighter chords" adds chords; "another one with more low end" makes a new groove · add_chords | vary
PASS select two tracks and play them together · 2 audible
PASS "add a choir" / "add a melody" make new tracks · Choir, Choir 2, Melody 2
PASS "make a track like…" starts with drums only · ["vibe"]
PASS plays the song
PASS "turn the voice note into a bassline" transcribes · transcribe
PASS "turn <recording name> into chords" transcribes that track · 6 chords
PASS import MIDI + audio, turn audio into a bassline
PASS while singing, only the drums play
PASS sing the bassline → bass track · 12 notes
PASS a sung part doesn't add your raw voice as an extra track
PASS your voice isn't played back live while you sing, and the mic turns off after
PASS humming isn't mistaken for talking
PASS save and reopen a song · Smoke sing 3
PASS no page errors
SMOKE OK: 26 checks
CHECK OK
```
- Worker: `node --check` OK, 0 backticks, 0 `${`.

## Problems 1-7 from the first check
1. **Worker prompt EQ numbers: FIXED.**
   - The new sentence sends only a `track_fx` low cut (bass 45 / drums 40 / chords 200 / melody 250 / vocal 150 Hz). It says never to send mix low/mid/high for mixing words.
   - I replayed those actions with `runActions` on a 4-part Böhmer song:
     - "the mix is muddy": Chords low cut 170→200 Hz, Melody 220→250 Hz. The low EQ is untouched (-6 / -4), so no low end is added any more.
     - "the bass is muddy": 28→45 Hz. "still muddy" (a third higher): 45→60 Hz.
   - I can't run the live model here. The lead should run the usual Llama check before the Worker deploy.
2. **"More low end" no longer cuts it: FIXED.** Each one raises the low EQ and leaves the low cut alone:
   - "boost the lows on the bass": +3 dB
   - "not enough low end on the bass": +3
   - "the bass needs more low end": +3
   - "the kick lacks low end": drums +3
   - "the low end is weak": drums and bass +2
   - "cut the lows on the bass" still cleans up (low cut 80→90 Hz).
3. **"still muddy" stays on the part: FIXED.**
   - After "the bass is muddy": "still muddy" 50→60, "even more muddy" →70, "muddy again" →80 Hz.
   - It works for every kind: "still harsh" after the drums (high -2→-5), "still dull" after the chords (+3→+6), "still boxy" after the melody (mid -2→-5).
   - After "the chords are muddy", "still muddy" stays on the chords (238→333). It still does after an unrelated "more reverb on the chords" in between (→466).
   - At the limit the reply is honest: "The bass is already cleaned as far as I'd go (low cut 90 Hz, low EQ -9 dB)…".
4. **Add sentences build parts: FIXED.** Typed results match main:
   - "add brighter chords" and "add some dull chords" give add_chords (new Chords tracks).
   - "add a sub bass for more low end", "add a bassline with more low end" and "make a bassline with more low end" give add_bass.
   - "another one with more low end" gives vary (drums 172→184 hits).
5. **Drums only: FIXED.** "add more low end" now replies "2 dB more low end on the drums". "the mix is muddy" with drums and bass asks which one.
6. **First "the bass is muddy" (note): IMPROVED.**
   - The first step is now 50 Hz / -3 dB.
   - Bass stem render: sub <120 Hz -10.5 → -11.4 dB, RMS -9.8 → -10.7 dB.
   - Mix: peak -0.5 dBFS, 0 clipped samples, no silence.
   - The dev's engine note stands: the channel EQ sits before the compressor, and there is no 200-500 Hz band. That's a sound-engine item, not this one.
7. **Short audio names: FIXED.** Tested with `kick.wav` and `New Recording 3.wav` imported:

   | Phrase | Result |
   |---|---|
   | "make the kick sit next to the bass" | add_drums + add_bass, as on main (no transcribe) |
   | "make the kick louder" | mix drums |
   | "the kick is muddy" | low cut on the Drums track, not the audio |
   | "turn kick into a bassline", "turn the kick into a bassline", "turn kick into notes" | transcribe the kick audio |
   | "turn new into a bassline" | no transcribe |
   | "turn rec into a bassline" | no transcribe |
   | "turn New Recording 3 into a bassline", "turn recording 3 into chords", "turn new recording into a melody", "turn the recording into a bassline", "turn it into a bassline" | transcribe New Recording 3 |

## Regression sweep (near the change)
- **a1 (23 mixing requests, typed):** notes identical in all 23, and 21/21 undo + redo OK.
  - The other 2 "mismatches" are requests that changed nothing: "boomy" at the limit, and "the mix is muddy" asking which part. Undo there correctly undoes the previous change.
  - "make the drums louder": volume 100. "more reverb on the chords": reverb 62%. "turn up the bass": volume 97.
  - Spoken "undo", "undo", "redo" walk the chords' high EQ -9 → -6 → -3 → -6.
- **a2 (render + add sentences + empty song):** 0 clipped samples at every stage. "turn the bass into chords" is unchanged from main.
  - Empty song: "the bass is muddy" says "There's no bass yet to fix"; the other mixing words say "nothing in the song to mix yet". No track is added.
  - Harness flake: both a2 runs this round hit a Puppeteer "detached frame" in the empty-song part, after the long offline renders. Run on its own (a11.mjs), the same steps pass on AI-4 and main. I think it's headless memory pressure from the renders, not the app.
- **a3 (transcribe + nearby requests):**
  - Every transcribe phrase picks the right track.
  - The original hint phrases work, and undo is one step.
  - A recorded fake-mic voice note → "turn the voice note into a bassline" (8 notes) → "turn it into chords" (8 chords).
  - "add a bassline", "another one" (drums 168→172 hits), "let me sing the bassline" and "hum the chords" all work, with no raw audio track added.
  - In the first parallel run, one undo and one "sing the melody" looked off. Alone, the undo is back to normal. A direct main vs AI-4 run (a8.mjs) shows "let me sing the melody" twice in a row starts a take both times on both builds (12 and 11 notes). The miss was my script checking too early.
- **a5 (main vs AI-4 offline brain):** all add / another sentences give the same actions as main. The low-end sentences now give EQ boosts where main gave add_bass / add_drums.
- **Console:** 0 page errors in every run. The only messages are the blocked Google Fonts request (sandbox) and the ScriptProcessorNode warning.

## LOW notes (not blockers)
1. **The AI and the offline brain can undo each other's low cut.** The prompt gives fixed Hz targets, `track_fx` sets an absolute value, and `projectState()` doesn't show a track's low cut. So a later AI "the bass is muddy" can lower a cut the offline brain already raised. This only happens in a session that mixes the two (the AI fails once, then comes back).
   - Steps: offline "the bass is muddy", then "still muddy" (low cut 60). Then the AI's "the bass is muddy" action `{track_fx bass low cut 45}`.
   - Happened: the low cut went from 80 to 45 Hz in my replay.
   - Should: never lower an existing cut. Either `track_fx` hp keeps `max(current, new)` for mixing calls, or `projectState` includes `hp`. The dev's follow-up idea already covers this. Also, asking "the bass is muddy" twice on the AI (rather than "still muddy") sends 45 again, so nothing changes.
2. **"Fattened" keeps the earlier low cut.**
   - Steps: "the bass is muddy" ×5 (low cut 90 Hz), then "the bass needs more low end".
   - Happened: low EQ +3 dB, but the low cut stays at 90 Hz. The reply says "3 dB more low end".
   - Should: thin could pull the low cut back down a step, or the reply could mention the cut. It's a judgement call for the dev.
3. **"still harsh" / "still dull" / "still boxy" have no floor or ceiling.** Mud stops at -9 / -12 dB. Harsh kept going: chords high -3 → -6 → -9 after three asks. Harmless for now; worth a cap like mud's.

Not regressions (same on main, for the lead):
- "more reverb" / "add some reverb" with no part named, and "even more" / "again" on their own, give "I couldn't turn that into a change".
- "make the kick sit next to the bass" rebuilds the drums and the bassline (add_drums + add_bass), so the user's parts are replaced. The change is undoable.
- "turn the bass into chords" regenerates the bass and adds chords. After a sung take, "turn it into a bassline" uses the older voice note.

## Files
- Screenshots in `/tmp/qa/2026-11-13-ai4/shots/`:
  - `b-a6-after-mixing.png`
  - `b-a6-short-names.png`
  - `b-a8-sung-parts.png`
- Outputs from this round are in `/tmp/qa/2026-11-13-ai4/b/`:
  - `a1.out`, `a2.out`, `a2-rerun.out`, `a3.out`, `a3-rerun.out`, `a4.out` (old-prompt replay, now outdated), `a5.out`
  - `a6.out`
  - `a7-*.out`, `a8-main.out`, `a8-ai4.out`
- New scripts are in `/tmp/qa/2026-11-13-ai4/js/`:
  - `a6.mjs`: still-X memory, thin after a clean, short names, new-prompt AI actions
  - `a8.mjs`: sing parts back to back, main vs AI-4
  - `a9.mjs`: "even more" / "again" / spoken undo
  - `a10.mjs`, `a11.mjs`: main vs AI-4 brain, empty-song repro
  - `lib.mjs` now takes a `file` option.
- Smoke test: the dev's 3 new checks cover the earlier suggestions. I added nothing.
