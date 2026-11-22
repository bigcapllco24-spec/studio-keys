# AI-14 branch check · qa-tester · 22 Nov 2026 · preview-ai-14 @ 2c6a876

## Verdict: NOT READY (close, about 5 small fixes)
Every bug as I filed it is fixed, word for word, offline and on the AI path. My own variants pass 97 of 107 (main and AI-9 pass 20). check.sh passed 3 of 3, plus a clean local merge with preview-qa-2 (113 checks). The whole AI-9 set is unchanged (63 of 65 identical; the other 2 are better).

Three things hold it back:
- It leaves bug 3 open for the most natural phrase in a song with two drops: "make the second drop bigger".
- It adds two small regressions: a voice-note mute now swallows a take asked for in the same sentence, and a bare "right" pans the part.
- Two of the new replies say things that are untrue.

All of these are small, contained changes in maker.js and actions.js.

## Problems (ranked)

1. **"Second drop" escapes the bug 3 fix, and the drums are rewritten for the whole song (medium-high; same as main, so not a regression, but it's the bug this item closes).** Setup: Bodzin full track (Intro, Build, Drop, Break, Drop 2, Outro).
   - "make the second drop bigger"
     - Expected: what the drop can do (parts in, a roll), or the honest "already has every part".
     - Actual, offline: "I couldn't turn that into a change." Even with the chords taken out of Drop 2, nothing comes back.
   - "give the second drop more energy", "the second drop needs more energy" and "can the second drop go harder"
     - Actual: "Done: Drums busier (energy 5 of 5) …". The drum pattern is rewritten in every section, with no whole-song note.
   - AI path, when Llama sends groove energy 5 for "make the second drop bigger" or "give the second drop more energy":
     - The groove runs, and the drums are rewritten in the whole song.
     - The reply says "Made the second drop bigger." That is untrue.
   - "make the first drop bigger", "make drop 2 bigger" and "make the last drop huge" all work.
   - Cause: sectionSayFix's exclusion regex `/\b(add|another|new|second|copy|…)\b/` returns null on any "second". The `ord` map already handles "second".
2. **Regression: a mute of the voice note eats the take asked for in the same sentence (medium).** Setup: a loop with an imported voice note "sing".
   - AI path: "mute the voice note and sing the bassline", with Llama's correct `[mix sing mute, sing bass]`.
     - Expected: mute it, then the bass take, which is what main does ("sing: muted · Sing the bassline after the count-in").
     - Actual: "sing is already muted. Say “unmute sing” to bring it back." No bass take.
   - Same for "mute the voice note and record a new one", with `[mix mute, sing voice]`.
   - Offline: "mute the voice note and sing the bassline" gives "Muted sing … I couldn't do “sing the bassline” in Basic mode, so I left that part out. sing is already muted." (Main offline was wrong in another way: it started a voice-note take.)
   - "mute the bass and sing a new bassline" is fine.
   - Cause: ACT.sing runs audioMuteFix on the whole LAST_TEXT. It should only take over when the sentence has no other take, or when the AI sent nothing but the sing.
3. **Regression: a bare "right" pans the part (low-medium, Basic mode only).** "make the melody brighter", then "right" (a musician agreeing) gives "Panned Melody right (R 40), same notes."
   - Main: no change.
   - With the AI engine it's fine.
   - Cause: the new focusText rule turns a lone left/right into "pan the melody right". Fix: require "left", or "more/further/a bit … right", or a pan done just before.
4. **"pan the melody left and the chords right" pans the chords LEFT and leaves the melody alone (medium-low; main is worse, it adds Chords 2 and Melody 2).** panFix takes one part and the first side it finds. Expected: melody L 40, chords R 40.
5. **Untrue replies from the new section rule (low).**
   - On a full track, "make the break bigger" or "make the break fuller" gives "The break already has its drums. … Want a snare roll at the end of the break?" The break has no drums (Chords only).
   - "make the outro more energetic" gives "already has its drums". The outro has drums, but the bass is missing.
   - Grammar: "The drop 2 already has every part" should read "Drop 2 already has…".
6. **Bug 8 half done (low).**
   - Done: the muted voice note is now skipped (7 of 7).
   - Not done: on a melody whose lowest note is C3 (131 Hz), "the mix is muddy" replies "Melody (low cut kept at 220 Hz, under its lowest note)". 220 Hz is above 131 Hz, so the reply is untrue, and the existing 220 Hz cut still thins that note.
   - The chords' cut still goes over their lowest note: in my session, Chords went to 238 Hz with the lowest note G3 at 196 Hz. The developer left that on purpose (smoke line 62).
   - Fix: say "kept at 220 Hz" without "under its lowest note" unless it really is; or lower the cut to the floor.
7. **Smaller, same as main or AI-9 (not blocking):**
   - "spread the chords wider" replaces the chords: "Chords (replaced) on Deep Pad". On main it adds Chords 2. "make the chords wider" works.
   - "the melody is too far left" adds Melody 2.
   - "i want a breakdown" and "key ko D minor karo" aren't understood offline.
   - On a Böhmer loop, "add a breakdown" makes Main 8 · Break 32 · Main 2 8: 62 seconds of pads in a 94-second song. The artist table's break length is used as-is; AI-9 was the same, with the break first.
   - AI path: Llama's own "Turned the melody down 3 dB in the drop." is followed by the new "That's in the whole song…" note in one bubble. The new prompt makes Llama say "whole song", so this is a nit.

## Before / after (offline = Basic mode; my sets, not the developer's)
Each cell is passes / cases.

| Set | main c6a34df | preview-ai-9 5210af0 | AI-14 2c6a876 |
|---|---|---|---|
| Bug 1, words as filed | 0/3 | 0/3 | 3/3 |
| Bug 1, my variants (incl. loop, bare "bring the bass in") | 3/10 | 3/10 | 10/10 |
| Bug 2, as filed | 0/4 | 0/4 | 4/4 |
| Bug 2, variants + unmute (+ in a song) | 2/11 | 2/11 | 11/11 |
| Bug 2, guards (record / sing / mute the bass / no voice note) | 4/5 | 4/5 | 5/5 |
| Bug 3, as filed (11 phrases) | 0/11 | 0/11 | 11/11 |
| Bug 3, variants | 1/12 | 1/12 | 11/12 ("second drop go harder") |
| Bug 4, as filed | 0/4 | 0/4 | 4/4 |
| Bug 4, variants + "a bit more to the left" chain | 1/12 | 1/12 | 11/12 ("spread … wider") |
| Bug 6, as filed | 0/2 | 0/2 | 2/2 |
| Bug 6, variants | 3/9 | 3/9 | 8/9 ("i want a breakdown") |
| Bug 7, as filed | 0/2 | 0/2 | 2/2 |
| Bug 7, variants | 1/6 | 1/6 | 6/6 |
| Bug 8, voice note left alone | 0/7 | 0/7 | 7/7 |
| Bug 8, melody cut under its lowest note (strict) | 0/7 | 0/7 | 0/7 (not raised any more, but the reply is untrue) |
| Key words, as filed / variants | 0/1, 1/5 | 0/1, 1/5 | 1/1, 4/5 |
| **Whole offline bug set** | **20/107** | **20/107** | **97/107** |
| Mocked AI path (33: right actions, Llama mistakes, guards) | 18/33 | 17/33 | 29/33 |
| Neighbours (52: two-clause, section parts, lift, width, pan, focus, key, Hinglish, short) | 33/52 | n/a | 46/52 |
| AI-9 regression (65 phrasings, signature vs AI-9) | n/a | baseline | 63 identical, 2 better, 0 worse |

On the mocked AI path:
- Every Llama mistake from the brief is corrected:
  - add_bass for "bring the bass in at the build";
  - vary for "bring the bass in at the intro";
  - sing for "mute the voice note" and "turn off the recording";
  - add_melody or vary for "pan the melody left";
  - groove or mix drums for "make the drop bigger";
  - groove with the chords out of the drop (they come back in).
- Two-action AI answers still do both: "pan the melody left and add some strings", "pan the chords right and add a melody", "take the bass out of the intro and add a melody line".
- The 4 AI fails:
  - problem 2;
  - the bubble nit (problem 7);
  - "add a second drop": the AI-1 Break 2 + Drop 3, same as main;
  - an old-prompt master reverb that my snapshot can't see.

Undo: every change was one Undo step, and Undo brought back the exact state (each case checked with Undo then Redo, the transport stopped). No change ever left an Undo step behind. One earlier "UNDO-DIFF" turned out to be my harness undoing while the song played; it was exact once stopped (main behaves the same).

## check.sh
| Run | Result | Time |
|---|---|---|
| 1 | CHECK OK, 112 | 5m14s (my 3 Chromes and another agent at load 23) |
| 2 | CHECK OK, 112 | 2m52s |
| 3 | CHECK OK, 112 | 2m34s |
| Local merge preview-ai-14 + preview-qa-2 (clean, not pushed) | CHECK OK, 113 | 2m17s |

No flakes, no rebuild note, 0 page errors.

## The changed AI-1 Hinglish smoke line
The change is right. The old line required "drop ke baad break daal do" to put a second 16-bar break back to back with the existing one, which is exactly bug 6. The new reply ("There's already a 16-bar break there (Break, after Drop). Say “make the break longer” to stretch it.") is what a producer wants.

It does lose coverage, though: the line no longer proves that a Hinglish verb-last request actually ADDS a section (hs went from 2 to 1). I'd add one step to that line: "drop 2 ke baad break daal do". On the branch that adds Break 2 before the Outro in one Undo step; "outro se pehle break daal do" does the same. This keeps the add path tested. I can add it in a QA upkeep item; I didn't touch tests on this branch.

## Producer session (branch, typed into the Keys box, Basic mode, about 15 min)
1. Bodzin beat, then "another one" twice: each beat differed from the one before.
2. "add a bassline", "add some chords", then a sung melody with the fake mic: "Sung melody", 9 notes.
3. "make it a full track": 96 bars.
4. "take the kick out of the intro and bring the bass in": "Intro: kick out, Intro: bass in", same bass notes. Undo was exact.
5. "bring the bass in": the which-section question. "bring the bass in at the intro" switched it on there.
6. Import sing.wav, then "mute the voice note": muted, transport stopped, mic off. "unmute" brought it back.
7. "the melody is too loud in the drop": down 5 dB, with the whole-song note.
8. "make the drop bigger": the honest answer. "take the chords out of the drop", then "make the drop bigger" again: "Drop: Chords in".
9. "make the second drop bigger": not understood (problem 1). "make the break bigger": the untrue reply (problem 5).
10. Pan left, "a bit more to the left" (L 50), chords a bit left (L 20), the hats explained, "too dry" (reverb on chords, melody and voice; bass and drums dry).
11. "turn the voice note into a melody", then "the mix is muddy" (cuts as noted in problem 6).
12. "set the key to F sharp minor": Key F♯ minor.
13. New song: Böhmer drums, bass and chords.
    - "add a breakdown": Main, Break, Main (Break 32; problem 7).
    - "make it a short song" and "chhota song bana do": Intro 4 · Drop 8 · Outro 4, one Undo each.
14. Save, start a new song, reopen: the same tracks and layout.

Every reply took 1.0 to 1.6 s (the voice-note transcription took 4.5 s). 0 page errors.

Offline render of the full track, 4 bars from the middle of each section (peak / RMS):

| Section | Peak | RMS |
|---|---|---|
| Intro | -0.7 dBFS | -5.9 dB |
| Build | -0.7 dBFS | -6.2 dB |
| Drop | -0.6 dBFS | -6.4 dB |
| Break | -10.5 dBFS | -24.6 dB |
| Drop 2 | -0.6 dBFS | -6.4 dB |
| Outro | -0.6 dBFS | -6.1 dB |

There were 0 clipped samples and 0 silent blocks. The quiet-intro / loud-drop problem is the known SE bug 5, not this item.

## Fix list for assistant-dev
1. sectionSayFix: drop `second` from the exclusion regex, or only exclude "a/another/one more second". Then "make/give the second drop bigger / more energy" behaves like "first drop", offline and when Llama sends a groove.
2. ACT.sing guard: don't turn a sing into a mute when the sentence also asks for a take ("… and sing the bassline", "… and record a new one"), or when the AI also sent the mix mute. The simplest version: skip the guard when the list already holds a mix mute for that track. Offline: let the split clause "sing the bassline" run as its own take.
3. focusText: a lone "right" (or "right ok") is agreement, not a pan. Only treat "left/right" as a pan after a pan, or with "more/further/a bit/to the".
4. panFix: two parts with two sides ("pan the melody left and the chords right") pans both, or asks; never the wrong part to the wrong side.
5. The replies:
   - "make the break/outro bigger" mustn't claim "already has its drums" when it doesn't. Offer bringing parts in, or say what's missing.
   - "Drop 2 already has" instead of "The drop 2".
   - "the mix is muddy" mustn't say "under its lowest note" when the kept cut is above it.

Nice to have: "spread the chords wider" should be width, not a replace; "the melody is too far left" should be a pan; "key ko D minor karo"; "i want a breakdown".

## Files
- Harness: `/home/claude/qa/ai14/run.mjs`, `lib.js`; sets `bugs.js`, `ai.js`, `nb.js`, `ai9.js`, session `sess.mjs`.
- Outputs:
  - `bugs-br.txt`, `bugs-ai9.txt`, `bugs-main.txt`;
  - `ai-sk-ai14-test.txt`, `ai-sk-t-ai9.txt`, `ai-sk-t-main.txt`;
  - `nb-sk-ai14-test.txt`, `nb-sk-t-main.txt`;
  - `r9-sk-ai14-test.txt`, `r9-sk-t-ai9.txt`;
  - `sess-br.txt`, `p3.js` output (second drop, right);
  - check logs `check1.txt`, `check2.txt`, `check3.txt`, `check-merge.txt`.
- Screenshots: `/home/claude/qa/ai14/shots/br-01-beat.png` … `br-12-reopened.png`. Key ones:
  - `br-04-kick-bass-intro.png`;
  - `br-05-mute-vn.png`;
  - `br-06-drop-bigger.png`;
  - `br-07-pan.png`;
  - `br-09-breakdown.png`;
  - `br-10-short.png`;
  - `br-12-reopened.png`.
