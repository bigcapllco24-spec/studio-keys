# AI-8 branch check · qa-tester · 16 Nov 2026 · preview-ai-8 @ 5104b88

**Verdict: READY.** check.sh passes, and all five Basic-mode bugs from my 16 Nov session are fixed with my own phrasings. I found no regressions in the AI-4/AI-6 phrases, "another one", singing a bassline or quantize. There were 0 page errors. I found 4 low issues in the new code. None of them blocks; they can be follow-ups. I also found 5 older bugs that this branch didn't cause (listed at the end, for filing).

## check.sh
```
PASS bundle syntax · PASS worker syntax · … 67 × PASS
SMOKE OK: 67 checks
CHECK OK      real 5m22s (load average 7-11: three branch checks running at once)
```
- No FAIL on the first run, so I didn't re-run it.
- The velocity drag, relaxed double-click and Undo-after-open checks all passed this time.
- The check took 5m22s, which is over the 3-minute target. That's the machine load. The whole-song MP3 step alone took 132 s.
- Log: /tmp/qa/ai-8/check1.log

## Problems (all low; steps use Basic mode, a song with Bodzin drums, bass, chords and melody unless it says "new song")
1. **"another one" in a two-part sentence remakes the drums, not the part you just added.**
   - Steps: type "add a bassline and give me another one" (or "add some chords, then make another one").
   - Expected: a new bassline, then another take of that bassline. The drums stay as they are.
   - Actual: `add_bass` + `vary:drums`, so the drums are rewritten too. The reply doesn't make that clear.
   - On preview-ai-6 the second half was ignored. Saying "another one" on its own after "add a bassline" also varies the drums, but that is older behaviour.
   - Likely cause: `splitAsks`/`brainOne` in src/maker.js. The "another one" half has no role, so it defaults to drums. It should inherit the role from the previous half.
2. **Typing "afrohouse" as one word still gives plain house.**
   - Steps: new song → type "afrohouse beat" (or "afrohouse beat at 120").
   - Expected: afro style.
   - Actual: house, 909, 124 BPM.
   - "afro house", "afro-house", "afro tech" and "afrobeats" all work. `STYLE_ALIAS` only fixes this on the live-AI path; `STYLE_WORDS` in src/maker.js doesn't know the joined word.
3. **A two-part quantize drops the second half without saying so.**
   - Steps: a song with a part you played → type "quantize the bass to 1/8 and the chords to 1/4".
   - Expected: both parts quantized, or the reply says the chords half was skipped.
   - Actual: only the bass is quantized, and the reply only mentions the bass.
   - Likely cause: "and the chords to 1/4" isn't split off: it doesn't start with a verb and isn't a mix line, so `askCarry` doesn't apply (src/maker.js).
4. **The second half's reply is worked out before the first half runs.**
   - Steps: type "mute the drums then unmute them".
   - Actual: the drums end up muted, and the reply says "Drums: muted. Nothing is muted."
   - It's a contrived sentence, but the reply contradicts itself. `muteSoloFix` reads the song before the batch runs (src/maker.js).

## What I checked (with numbers): AI-8 build vs preview-ai-6, same 105 phrases, headless Chrome
- **Afro house (bug 3).** These now give style afro, 118 BPM, with rim on 2 and 4, shuffled hats, shaker, congas and toms (preview-ai-6 gave house):
  - "afro house beat", "make an afro house groove with congas", "give me some afro house drums", "i want an afro-house groove", "afro tech beat", "afrobeats drums"
  - "afro house beat at 122 bpm" → 122.
  - Plain genres still map right: house 124, deep house 120, tech house 126, melodic techno 124, minimal techno → techno 130, uk garage 132.
  - "lofi house" and "chill house" now give deep house.
  - Note: plain afro house uses the 909 House Kit, while "like Black Coffee" uses Bongos & Percussion. That's a sound choice, not a bug.
- **Unsolo and unmute (bug 4).** These now all turn the solo off, with the notes untouched. Before, they made a new bassline, deleted the bass, or did nothing:
  - "unsolo the bass" (my exact phrase), "remove the solo", "take the solo off the bass", "turn off solo", "un solo everything", "stop soloing the bass", "remove the solo on the bass", "bass ka solo hatao"
  - From the UI, I pressed S on the bass, then typed "take the bass out of solo": solo off.
  - "un-mute the drums" (exact), "unmute all", "unmute the bass please" and "drums ka mute hatao" now unmute.
  - When nothing is soloed or muted, the reply is honest: "The bass isn't soloed.", "The chords aren't muted."
  - With two parts soloed, "unsolo the bass" says "Chords still soloed", and "remove the solo" clears both.
  - Still right: "solo the bass", "mute the drums", "remove the bass" and "delete the drums".
- **Quantize (bug 5).**
  - In the text test (a played part at 0.07 1.12 2.4 … 15.95 beats):
    - "quantize my melody to 1/8" (exact): snaps the played part, with no new track.
    - These quantize the played part to 1/16: "quantize it", "quantize the keys", "tighten up the timing", "my timing is sloppy", "snap my notes to the grid", "quantize kar do".
    - "quantise … to quarter notes" → 1/4, "to eighth notes" → 1/8, "to 1/16 triplets" → 1/16t (2.4 → 2.333).
    - "quantize the drums" works on the drums only, and "quantize everything to 1/8" covers all 5 note parts.
    - In an empty song you get "There are no notes to quantize yet."
  - On a part I played on the fake MIDI keyboard (16 notes, played loose), typed in the UI:
    - "quantize what I just played to 1/8": 0 of 16 notes off the grid.
    - "now quantize it to 16ths": 0 of 16 off the grid.
    - "quantize it to 1/8 triplets": all on the 1/3-beat grid (8.333, 8.667 …).
    - No track was added in any of these (screenshots t2-02, t2-03).
- **Two requests in one sentence (bug 6).** All these do both halves with 1 undo step, and a single Undo restored the exact state (snapState equal):
  - The 4 exact ones from my report:
    - "more reverb on the chords and less on the melody": chords 42→62%, melody 30→10%.
    - "make the drums louder and the bass quieter"
    - "mute the drums and solo the bass"
    - "set the tempo to 128 and add a shaker"
  - Mine:
    - "turn the chords down and bring the melody up"
    - "less delay on the melody and more on the chords"
    - "mute the melody and the chords"
    - "solo the drums, then mute the bass"
    - "unmute the drums and solo the chords"
    - "make it 100 bpm and add a bassline"
    - "change the tempo to 90, then add some chords"
    - "add a shaker and then make it faster"
    - "bring the bass up and the drums down a bit"
    - "make a house beat, then add a bassline"
  - Through the UI:
    - "turn the bass down and more reverb on the melody", with no melody track: the bass goes down, and the reply says the reverb half was left out. One click on Undo puts it back exactly.
    - "set the tempo to 100 and mute the drums": one Undo click → 120 BPM in the box, drums unmuted, exact.
  - "mute the drums and add a riser" names the skipped half. "start a new song and make a house beat" starts the song and asks again.
- **Phrases that stay one request.** Each still does one thing:
  - "drums with hats and claps" (house drums), "drum and bass beat" (dnb 174), "rock and roll beat" (rock 116), "make a beat with kicks and snares", "rhythm and blues beat", "make a drum and bass track at 174"
  - "add 124 bpm drum and hihats with claps like ben bohmer" (124, Ben Böhmer kit)
  - "hey keys, mute the drums"
  - "the bass sounds great and the drums are too loud": only the drums down 5 dB.
  - "add chords and a melody", "add drums and bass" and "add a bassline, chords and a melody" add each part, as before.
- **Artist echo (bug 7).**
  - "drums like Black Coffee" / "a beat like black coffee" → "Black Coffee-style…", and the saved ref is Black Coffee.
  - "adam port" → Adam Port, "massano" → Massano, "amelie lens" → Amelie Lens.
  - "lofi hip hop beat" and "chill lo-fi beat" give Lo-fi at 80 BPM with no artist named or saved.
  - Artists not in the table ("drums like Bob Moses", "a beat like Tame Impala"): plain house, and no invented artist is named or saved.
- **Typos.**
  - These now work: "add a basline", "ad some cords", "anothr one", "antoher one", "add a melodie", "add some chrods".
  - Out of scope as stated in the report (not fixed, same as before): "make it fastr", "drums lik charlotte de wite", "ek aur".
- **Nothing broke.**
  - 47 of the 105 phrases do exactly the same as on preview-ai-6. The other 58 differ only where AI-8 meant to change them (listed above).
  - Unchanged: "the bass is muddy", "turn everything down", "the mix is too loud", "is the bass too loud?", "bass ki awaaz kam karo", "drums ko thoda tez karo", "make the kick punchier", "more/less swing", "another one", "sing the bassline", the voice-note reply.
  - "make an afro house beat like Black Coffee" → "another one" ×2: three different grooves (180/172/176 hits). Black Coffee, afro, 120 BPM and the Bongos kit were kept.
  - Drums render: peak -0.58 dBFS, -7.0 LUFS, 0 clipped samples, no silence.
  - Sung a bassline with the fake mic: "Sung bassline", 8 notes in A minor on Sub Bass.
  - Full song render: peak -0.18 dBFS, true peak -0.2, -6.6 LUFS, 0 clipped, no silence.
- **Console.** 0 page errors in all runs. The only console error was the blocked Google Fonts request (sandbox).
- **Speed.** The offline replies took 0.26-1.4 s under heavy load.
- **Worker.** The prompt still has no backticks or `${`. The live AI isn't testable here.

## Found while testing, not caused by AI-8 (same on preview-ai-6; for the lead to file)
5. **"mute everything but the drums" mutes the drums**, the opposite of what was asked. Medium · assistant (src/maker.js).
6. **"add some reverb to the chords" lowers the reverb when it's already above 25%** (42% → 25%). "add some reverb and delay to the chords" also skips the delay, and the typo "mor reverb on teh chords" does the same cut. Low · assistant.
7. **A tempo said without "bpm" is ignored:** "house beat at 120" gives 124. "make it 128 and add a bassline" now honestly says it skipped "make it 128". Low · assistant.
8. **One request sometimes needs two Undos on a slow machine.**
   - Steps: type "add a melody" 10 times, from the same song each time, at load average about 11.
   - Result: 1-2 of the 10 left 2 undo steps.
   - Cause: `addTrack` saves at once, and `runActions` saves again at the end. Under load the gap is about 212 ms, which is longer than the 120 ms merge window in `undoNote`.
   - It was the same on ai6 (1 of 10 for "add some chords"). It could show up on phones.
   - Fix idea: hold one undo batch across `runActions`. Low · assistant-dev (src/actions.js `runActions`) / studio-ux-dev (src/edit.js).
9. **"bring the drums back" (with the drums muted) remakes the drums and leaves them muted.** Low · assistant.

## Files
- Scripts: /tmp/qa/ai-8/js/ (lib.mjs, t1-words.mjs, t2-use.mjs, t3-extra.mjs, t4-rec.mjs, t5-rep.mjs, t6-who.mjs)
- Raw results:
  - /tmp/qa/ai-8/t1.out (AI-8) and /tmp/qa/ai-8/t1-ai6.out (ai-6), plus words-ai8.json / words-ai6.json
  - /tmp/qa/ai-8/t2.out, /tmp/qa/ai-8/t3.out, /tmp/qa/ai-8/t3-ai6.out
  - /tmp/qa/ai-8/session.log
- Screenshots: /tmp/qa/ai-8/shots/
  - t2-01-afro, t2-02-recorded, t2-03-quantized, t2-04-twopart, t2-05-soloed, t2-06-unsoloed, t2-07-sung
  - words-end-ai8, words-end-ai6
- Renders: /tmp/qa/ai-8/dl/t2-afro-drums.wav, /tmp/qa/ai-8/dl/t2-song.wav
- The worktree /home/claude/sk-ai-8 is clean: check.sh rebuilt index.html identically, and nothing was committed. The temporary ai-6 worktree has been removed.
