# AI-14 re-check 3 (final) · qa-tester · 22 Nov 2026 · preview-ai-14 @ fb765f7

## Verdict: READY

- A mud complaint no longer lets more low end in. I tested 16 melody cases and 5 wordings: the low cut was never lowered, and every reply matched what changed.
- The pan answers all work: "hard right", "right side", "hard left", "all the way left" and 11 more. The lone-"right" guards still hold.
- check.sh passes on the branch (120) and on the local merge with QA-2 (121). The branch also merges cleanly with main.
- Against 0903ad1, no set case is worse, apart from the known take-timing harness flags (listed below).
- Nothing blocks release. My view on the mud question is in its own section: release as is, and do a follow-up for a stronger melody mud fix.

## Problems
None must-fix. Nits and follow-ups:
1. **Wording nit.** Steps:
   - Use a C3 melody.
   - Say "the melody is muddy", then "the mix is muddy", then "still muddy".
   - Keys says: "...less low end on Chords (333 Hz, 3 dB) and Melody (low cut stays at 220 Hz)".
   - The melody changed nothing on that step: its low EQ was already at the -12 dB floor. It's listed under "less low end on" anyway.
   - Better: "Melody (already as clean as I'd go)".
2. **Follow-up (on main too, not AI-14).** The chords' low cut has no note guard. On "the mix is muddy" and then "still muddy" it climbs 170 → 238 → 333 Hz. Chord voicings that go down to C3 get thinned the way bug 8 found for the melody.
3. **By design, noted.** "hard right" or "right side" after a change that isn't a pan, such as "make the melody brighter", pans the part in focus (Melody R 100 / R 40). The words are clear, so I'd keep it.
   - A lone "right", "right on", "that's right", "alright" or "all right" changes nothing. They do get the generic "I couldn't turn that into a change. Try 'add a trap beat at 140'…", which is robotic for agreement. That was already the case before AI-14.
4. **Honest by 0.6 Hz.** On a C4 melody the cut goes 220 → 261 Hz, "under its lowest note". C4 is 261.6 Hz, so that's true. A 12 dB/oct cut sitting on the note still takes about 3 dB off its fundamental. Fine for release.

## 1. check.sh
| Build | Result |
|---|---|
| fb765f7 (/home/claude/ai14t/head) | CHECK OK, SMOKE OK 120 checks, 0 FAIL, 0 page errors, 2m43s (load 1.5-2) |
| Local merge fb765f7 + origin/preview-qa-2 a7bd0b2 (896075c, /home/claude/ai14t/merge, not pushed) | CHECK OK, SMOKE OK 121 checks, 2m25s |
| Merge with origin/main 6023e75 | Clean (`git merge-tree`). Main moved only by .claude housekeeping. |

The new smoke line "AI-14 fix 3" passes: 110-220 Hz goes -5.07 → -5.74 dB, the cut stays at 220 and the low EQ ends at -10. The stray lines give 308 Hz, and the 300 Hz cut stays 300.

## 2. Mud: band table
Setup for every row: the melody alone, 4 bars, rendered offline with `renderSongSpan`. Each value is the change in the 110-220 Hz band's share of the melody's total, in dB. Brackets give the change in absolute band level; "tot" is the change in the melody's overall level. Script: /home/claude/qa/ai14/band3.js.

| Case (Keys's 220 Hz cut unless noted) | main 2812bfe | 0903ad1 | fb765f7 |
|---|---|---|---|
| C3 melody, "the melody is muddy" | 220→308 · **-4.7** (abs -6.3) · tot -1.6 | 220→**111 LOWERED** · **+2.5** (abs +3.2) · tot +0.7 | 220 stays, lo -4→-10 · **-0.7** (abs -1.1) · 60-110 -3.5 · tot -0.4 |
| … "still muddy" | 431 · -10.2 · tot -3.0 | 111 · +2.1 | 220, lo -12 · -1.0 (abs -1.6) |
| … "still muddy" again | 600 · -15.1 · tot -4.6 | 111 · +1.9 | no change: "already cleaned as far as I'd go (low cut 220 Hz, low EQ -12 dB). Try a softer sound or turn it down a little." |
| C3 melody, "the mix is muddy" | 308 · -4.8 | 111 LOWERED · +2.6 | 220 stays, Melody 6 dB · -0.8 |
| C4 melody, "the melody is muddy" | 308 · -5.8 | 222 (no-op) · -0.5 | 261 "under its lowest note" (true) · **-3.1** |
| C4 + one stray C1, "the mix is muddy" | 308 · -6.0 | 222 · -0.6 | 261, no "under" claim · -3.3 |
| C4 + two strays C1, "the melody is muddy" | 308 · -6.1 | **100 LOWERED** · +4.4 | 261, no claim · -3.3 |
| C3 + one stray C1, "the melody is muddy" | 308 · -4.8 | 111 LOWERED · +2.5 | 220 stays · -0.8 |
| C3, own 300 Hz cut | 420 · -5.4 | 300 · -0.4 | 300 stays, 6 dB · -0.9 |
| C3, user's 180 Hz cut | 252 · -3.5 | **111 LOWERED** · +0.8 | 180 stays · -0.7 |
| C2 melody | 308 · -5.0 | **100 LOWERED** · +2.0 | 220 stays · -0.9 |
| C5 melody | 308 · -6.5 | 308 · -6.4 | 308 · -6.5 |
| Fresh wordings on the C3 melody: "the lead sounds boomy", "too much low end in the melody", "melody mein mud hai", "everything sounds a bit muddy" | 308 · -4.7 to -4.8 | 111 LOWERED · +2.4 to +2.5 | 220 stays · -0.7 to -0.8; each reply true ("6 dB less low boom (low cut stays at 220 Hz)", or the per-part mix reply) |
| Full mix (drums, bass, chords, C3 melody), "the mix is muddy" | -0.1 | +0.2 | -0.1 |

Rule check: a mud complaint never let more low end in.
- fb765f7 never lowered a cut: 0 of 16 cases.
- 110-220 Hz went down in every case.
- Every "stays", "up to" and "under its lowest note" claim matched the state.
- Undo was one step each time.

**My b8 check is updated to the new rule.** I agree with it. File: /home/claude/qa/ai14/bugs.js; the old file is kept as bugs-v2.js. The new b8 passes only when:
- the melody's cut is never lowered;
- it is never raised past the lowest real note (C3, 131 Hz);
- something on the melody changes: the cut goes up, the low EQ goes down, or Keys gives the honest "already cleaned" reply;
- the muted voice note is untouched.

Results: main fails it (308 Hz), 0903ad1 fails it (111 Hz), fb765f7 passes.

## 3. Pan answers
After "pan the melody", Keys asks "Left or right?". Script: /home/claude/qa/ai14/pan3.js. Each answer below moved the right part and was one undo step, exact:

| Answer | Result |
|---|---|
| "hard right" | R 100 |
| "right side" | R 40 |
| "hard left" | L 100 |
| "all the way left" | L 100 |
| "the right side" | R 40 |
| "fully right" | R 100 |
| "all the way to the right" | R 100 |
| "left side" | L 40 |
| "right" | R 40 |
| "left" | L 40 |
| "a bit right" | R 20 |
| "ok hard right please" | R 100 |
| "the right" | R 40 |
| "pan the chords" → "hard right" | Chords R 100 |
| "pan the bass" → "all the way left" | Bassline L 100 |

Guards hold: no change, no undo step, for each of these:
- "right" after "make the melody brighter", after "add a bassline" and after "make the bass louder";
- "right on", "that's right" and "alright" after "brighter";
- "all right" after "add some chords";
- pan, then "right", then "make the bass louder", then "right".

"right, now add a pad" adds Warm Pad only, with no pan. Nit 3 above covers "hard right" and "right side" after a change that isn't a pan.

## 4. Sets: fb765f7 vs 0903ad1
| Set | 0903ad1 | fb765f7 | Worse? |
|---|---|---|---|
| ai.js (mocked AI) | 30/33 | 30/33 | Same lines |
| nb.js | 51/52 | 51/52 | Same lines |
| ai9.js (65 phrasings) | 65 | 65 | Diffs and undo counts identical; only random chord and drum names differ |
| bugs.js, new b8 (main: 21/107) | 100/107 (5 b8 fail: cut lowered to 111) | **105/107** | No. The 2 fails are known on both builds: b6 "i want a breakdown", key "key ko D minor karo" |
| rt.js (settled) | 117/140 | 115/140 | Harness only, see below |
| rtu.js | 1 Undo step, exact, for all 3 muted-plus-take cases | Identical | No |

rt.js has 4 verdict flips, all take-timing:
- Three new F lines: "turn off my voice memo and let me sing the bass", "mute the voice note then sing the chords", and "mute the voice note and record a new one" (after chords).
- One new P line: "mute the recording, I'll hum the melody".
- Each flip is UNDO-DIFF Drums.ev;Bassline.ev;Chords.ev: stopping a take during the count-in rehashes those events.
- Compared with the verdict and undo flags stripped, the replies, takes and mute diffs are identical.
- The only other rt differences are the intended mud lines and random drum-pattern names.

## 5. The mud question: release as is? Yes, release.
The question: on a melody down to C3, "the melody is muddy" now drops 110-220 Hz by only 0.7 dB. Main drops it 4.7 dB, by moving the cut to 308 Hz. Is that acceptable, or does it first need a "still muddy" step that raises the cut past the lowest notes, said honestly?

My view: acceptable for release. I would not add an automatic "raise past the notes" step. Reasons, with numbers:
- **The 220 Hz cut already sits above C3.** Keys's starting cut is a 12 dB/oct high-pass (Q 0.7). It already takes about 9.5 dB off the C3 fundamental. What's left in 110-220 Hz on this melody is the tune's own lowest notes (C3 to A3), not mud from somewhere else.
- **Main's 4.7 dB came from cutting the tune.** The melody gets 1.6 dB quieter overall. Two more "still muddy" take it to 600 Hz: the melody 4.6 dB quieter and 110-220 Hz down 15 dB. That is exactly bug 8's "thins the tune".
- **In a full mix the difference is close to nothing.** The mud band moves 0.2 dB or less on all three builds (main -0.1, fb765f7 -0.1), because kick and bass own that band. The gap is audible only with the melody alone or in a break.
- **What fb765f7 does is true and safe.** The low boom under 110 Hz goes down 3.5-4.6 dB. The reply says what it did ("6 dB less low boom, low cut stays at 220 Hz"). The third "still muddy" honestly stops and points to a softer sound or a lower level.

Follow-up items (not blockers):
- **(a) sound-engine, S.** A low-mid dip for mud: a peaking band around 200-300 Hz, or a mud mode where the melody's low shelf sits near 200 Hz. Today's low shelf sits at 120 Hz, so the low EQ barely reaches 110-220. With a dip, "the melody is muddy" could take 2-3 dB off without moving the cut into the notes.
- **(b) assistant, S.** On the third "still muddy", Keys asks instead of acting. For example: "The rest is the melody's lowest notes (C3). Want me to move them up an octave, or cut into them?" That covers the developer's "raise past the lowest notes" step, but as the user's choice, said up front.

## Try list for the test link (8 steps)
1. Say "make a beat like Stephan Bodzin", then "add a bassline", "add some chords" and "add a melody". Say "melody left, chords right": they move apart. One Undo puts both back.
2. Say "pan the melody": Keys asks "Left or right?". Answer "hard right": the melody goes all the way right. Say "pan the melody" again and answer "all the way left" (or just "left"). Then say "make the melody brighter", then "right": nothing pans.
3. Say "widen the chords" (or "chords ko wide karo"): the chords sound wider and keep their notes. "the chords should be narrower" brings them back in.
4. Say "make it a full track", then "make drop two bigger": Keys tells you what Drop 2 already has. Say "take the chords out of drop two", then "make drop two bigger" again: the chords come back into Drop 2.
5. Say "make the break bigger": Keys says what the break really has and offers a part. Say "bring the melody in at the break": it comes in there only.
6. Say "the melody is too loud in the drop": the melody goes down, and Keys says it's for the whole song.
7. Import a voice recording (Import audio). Say "mute the voice note": it goes quiet, and no count-in starts. Say "unmute the voice note", then "mute the recording, I'll hum the melody" (or "voice note mute karo aur bass gaane do"): the recording mutes and the count-in starts. Hum: your notes land on a new track.
8. Say "the melody is muddy": the low boom goes down, and Keys says the low cut stays (or goes up), never lower; the tune keeps its body. Say "the mix is muddy": the chords and melody get cleaned, each with its own amount, and the bass and kick are untouched. Say "still muddy" until Keys says it has gone as far as it would.

## Files
- Worktrees (detached, nothing pushed): /home/claude/ai14t/head (fb765f7), /home/claude/ai14t/merge (896075c = fb765f7 + a7bd0b2)
- Check logs: /home/claude/ai14t/check-head.txt, /home/claude/ai14t/check-merge.txt
- Band: /home/claude/ai14t/band3-main.txt, /home/claude/ai14t/band3-f2.txt, /home/claude/ai14t/band3-f3.txt (script /home/claude/qa/ai14/band3.js)
- Pan: /home/claude/ai14t/pan3-f3.txt (script /home/claude/qa/ai14/pan3.js)
- Sets: /home/claude/ai14t/{ai,nb,ai9,bugs,rt,rtu}-f3.txt, /home/claude/ai14t/bugs-f2.txt, /home/claude/ai14t/bugs-main.txt; 0903ad1 baselines in /home/claude/ai14s/*-head.txt
- Updated b8 check: /home/claude/qa/ai14/bugs.js (old: /home/claude/qa/ai14/bugs-v2.js)
- Screenshots (looked at; clean, nothing ugly): /home/claude/qa/ai14/shots/r3-01-mud-pan.png, /home/claude/qa/ai14/shots/r3-02-keys-chat.png (the "hard right" answer in the Keys panel)
