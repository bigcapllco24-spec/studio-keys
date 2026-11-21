# AI-8 re-check after fix 1 · qa-tester · 16 Nov 2026 · preview-ai-8 @ 20fd0da

**Verdict: NOT READY, for one small regression (bug 1).**
- All 4 of my notes and all 5 older bugs are fixed, tested with my own phrasings.
- One Undo per request now holds on a simulated slow machine.
- But the new "add some reverb never lowers it" guard in `ACT.track_fx` (src/actions.js) also blocks lowering an effect the user explicitly asked to lower or set, whenever the same sentence contains "add", "some" or "more". That is on the live AI path.
- It's a one-line fix. Everything else is ready.

## check.sh
```
PASS bundle syntax · PASS worker syntax · … 68 × PASS (incl. the new fix-1 smoke line)
SMOKE OK: 68 checks
CHECK OK      real 1m53s (machine quiet, load average about 2)
```
- First run, with no FAIL.
- The worktree is clean afterwards (index.html rebuilt identically, nothing committed).
- Log: /tmp/qa/ai-8r/check1.log

## Bugs (steps: song with drums, bass, chords and melody; chords reverb at its default 42%)
1. **Medium, caused by fix 1: an explicit lower or set value gets raised to 52% on the live path.**
   - Steps: run the actions Llama sends, with the sentence as the user said it:
     - "set the chords reverb to 20 and add some delay" → `track_fx reverb 20` + `delay 30`
     - "add a bassline and make the chords reverb 15" → `add_bass` + `track_fx reverb 15`
     - "the chords are too wet, add some clarity" → `track_fx reverb 15`
   - Expected: reverb 20% / 15% / 15%. That's what 5104b88 gave.
   - Actual: reverb 52% in all three, and the reply says "Reverb on Chords: 52%".
   - Cause: src/actions.js line 223. The guard checks the whole sentence for add/more/some, not the part about this effect, and it ignores a number the user said.
   - Fix idea: skip the guard when the sentence has a number, or "set", "to N" or "too wet/too much". Or apply it only when the add/more word is in the same half as this effect.
   - Still right: "add some reverb" (amount 40) → 52%, "set the reverb on the chords to 20" → 20%, "less reverb" → 20%.
2. **Low, Basic mode, worse than before: "set the reverb on the chords to 20%" gives 52%.**
   - Before the fix it gave 25%. Both ignore the 20.
   - Also "set the reverb on the chords to 20% and add some delay" → reverb 52%, delay 20%.
   - Cause: src/maker.js. The new "+10 when the effect is at or above its default" applies to any reverb request without less/more, including "set … to N".
   - Fix idea: read the number, or don't step up when a number is said.
3. **Low, edge case (same before the fix): one Undo per request stops working once the Undo history is full.**
   - Steps: make 120+ edits, then make a multi-part request on a slow machine (saves more than 120 ms apart).
   - Result: stack 120 → 120, and it takes 2 Undos to get back.
   - Cause: `UNDO.stack` drops its oldest entry at 120, so `runActions` sees no growth and doesn't collapse the steps (src/actions.js line 241). On a phone, 120 edits is a normal 20-minute session.
   - Fix idea: count the pushes during the request (for example, a counter in `undoNote`) instead of comparing stack lengths.

## What I re-checked (numbers)
**My 4 notes.** All fixed (/tmp/qa/ai-8r/fix1-f1.json, compared with the same script on 5104b88: fix1-old.json).
- "another one" after a part:
  - "add a bassline and give me another one" → add_bass + vary bass. The drums are untouched.
  - "add some chords, then make another one" → vary chords.
  - "add a melody and give me another one" → vary melody (Melody 2).
  - "another one" alone still varies the drums. "give me another bassline" still works.
  - Limit (as the dev said): "add a bassline, then another one" stays a single add_bass.
- Joined words (5104b88 gave house 124 for all of these):
  - afrohouse → afro 118, and "afrohouse beat at 120" → afro 120
  - afrotech → afro 118
  - techhouse → tech house 126
  - deephouse → deep house 120
  - melodictechno → melodic techno 124
  - ukgarage → UK garage 132
  - lofihiphop → lo-fi 80
  - minimaltechno → techno 130
  - "drum n bass" → dnb 174
- Two-part quantize:
  - "quantize the bass to 1/8 and the chords to 1/4" → bass on the 1/8 grid, chords on the 1/4 grid, and the reply names both.
  - Reversed order also works.
  - "quantize the drums and the bass to 16ths" → both.
  - "… and the melody too" → both at 1/8.
- Halves read in order:
  - "mute the drums then unmute them" → ends unmuted: "Drums: muted. Unmuted Drums."
  - "solo the bass and then unsolo it" → solo off.
  - "mute the bass and then unmute it" → ends unmuted.

**The 5 older bugs.** All fixed.
- Mute everything but X. These now mute the right parts; 5104b88 muted X or made a new part:
  - "mute everything but the drums"
  - "… except the drums and the bass"
  - "… apart from the chords"
  - "… other than the melody"
  - In the UI, the M buttons light up correctly (screenshot r-03).
- Add some reverb (offline):
  - 42% → 52%.
  - "add some reverb and delay" → 52% / delay 14→20%.
  - "mor reverb on teh chords" → 62%.
  - At 10% → 25%.
  - "less reverb" → 22%, and "no reverb" → off.
- Tempo without "bpm":
  - "house beat at 120" → 120
  - "techno beat at 135 with claps" → 135
  - "drums like Black Coffee at 124" → 124 (Black Coffee and the Bongos kit kept)
  - "afro house beat at 124" → 124
  - "make it 128" → 128
  - "give me a beat at 90" → 90
  - "make a 4 bar loop at 122" → 122
  - "techno at 140" → 140
  - No false tempo from "add a melody at bar 3", "swing at 60", "house beat at 50% swing" or "make it 2 bars".
- Bring back (5104b88 made new parts that stayed muted):
  - drums muted → unmuted
  - bass muted (two phrasings) → unmuted
  - bass soloed → solo off
  - "bring everything back" → unmutes all
  - drums already playing → "The drums are already playing. Say "another beat" for a new one."
- Save:
  - "save the song" and "save the track" now save. The song is in IndexedDB 154 ms later, the toast shows, and there's no MP3 (5104b88 exported an MP3).
  - Unchanged: save, save it, save my song.
  - These still export the MP3: export the song, download the mp3, save it as an mp3, bounce the track.

**One Undo per request** (/tmp/qa/ai-8r/t8.out vs t8-old.out).
- Slow machine test: every action waits 200 ms and saves, so the saves are over 120 ms apart. The fix gives 1 step and an exact Undo for all 6 requests, and Redo also comes back exactly:
  - "add a bassline, chords and a melody": 3 steps on 5104b88, Undo not exact.
  - "make a house beat, then add a bassline": 3 steps before.
  - "set the tempo to 100 and add a shaker": 2 steps before.
  - "mute the drums and solo the bass": 2 steps before.
  - "add a melody"
  - "add some reverb and delay to the chords"
- "add a melody" 10 times at normal speed: 1 step and exact every time.
- Manual edits around a Keys request:
  - After "add a melody and make the drums quieter", I clicked M on the bass. Ctrl+Z undid only the M. The next Ctrl+Z undid the whole request exactly. Redo ×2 came back exactly.
  - A fader change made before a request survives 1 Undo of the request.
  - Saying "undo" to Keys after a two-part request puts it back exactly.
  - In the UI: "make it 126 and mute the bass", then one click on the Undo button → exact.

**105-phrase comparison** (words-ai8f1.json vs words-ai8.json):
- 49 rows are identical.
- 44 differ only by random drum hit counts or how track ids print. That's noise, because the base song's drums are random on each run.
- The intended changes:
  - "afrohouse beat at 120" → afro 120
  - "bring the drums back" → unmute
  - the two "another one" rows
  - dnb "at 174" is now an explicit tempo action (same BPM)
  - "add a basline" → 2 Undo steps before, now 1 and exact
  - "mor reverb on teh chords" → 25% before, 62% now
- One row looked different: "make it 100 bpm and add a bassline" left the bass unchanged. That's chance. "add a bassline" gives the identical bassline 2-3 times in 12 on both builds (see note 11).
- 0 unintended differences.

**Other checks.**
- Sound: full 4-part song render, peak -0.47 dBFS, true peak -0.1, -7.5 LUFS, 0 clipped samples, no silence.
- Errors: 0 page errors in all runs. The only console error is the blocked font request (sandbox).
- Speed: offline replies took 0.3-1.0 s.
- Worker: still no backticks or `${`. The vary line was added.

## Found while testing, not caused by AI-8 (same on 5104b88; for the lead to file)
4. **"remove the reverb from the chords" deletes the whole Chords track.** Undo brings it back. Medium · assistant (src/maker.js).
5. **"just the drums and bass" and "only play the drums" remake those parts instead of muting the others.** "only play the drums" also starts playback. Low · assistant.
6. **"turn the drums down then bring them back up" remakes the drums.** Low · assistant.
7. **"mute everything" isn't understood in Basic mode.** Low · assistant.
8. **"save the beat" saves and also remakes the drums.** Low · assistant.
9. **Typing a tempo in the BPM box makes no Undo step.**
   - The next Undo reverts the tempo and also the edit before it. Here, that removed the drums and bass.
   - Low-medium · studio-ux-dev (src/studio.js `setTempo` doesn't go through `saveProject`).
10. **The reply to "save the song" adds the "Shape it with effects…, or download the MP3" tip after "Saved".** Cosmetic. Low · assistant.
11. **"add a bassline" on a song that has a bass sometimes regenerates the identical bassline** (2-3 of 12 tries), while the reply says it made one. Low · assistant/engine.

## Files
- Scripts: /tmp/qa/ai-8/js/t7-fix1.mjs, t8-undo.mjs, t9-ctrlz.mjs, t10-bass.mjs, t11-ui.mjs (plus the original t1-words.mjs)
- Results: /tmp/qa/ai-8r/ (check1.log, t1.out, t7.out, t7-old.out, t8.out, t8-old.out, t9.out, t10-old.out, fix1-f1.json, fix1-old.json), /tmp/qa/ai-8/words-ai8f1.json
- Pre-fix build used for comparison: /tmp/qa/ai-8r/old/index.html (5104b88)
- Screenshots: /tmp/qa/ai-8r/shots/ (r-01-house120 … r-09-undo) and /tmp/qa/ai-8/shots/r-undo-01-after-edits.png, r-undo-02-undone.png
- Render: /tmp/qa/ai-8r/dl/r-song.wav
