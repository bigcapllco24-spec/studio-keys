# AI-8 re-check 3 (fix 3) · qa-tester · 16 Nov 2026 · preview-ai-8 @ 6bec67c

**Verdict: READY.** Bug 1 from re-check 2 is fixed on the AI path and in Basic mode. "delete the drums and the bass" removes both. t12, t13, t14 and the 105 phrases differ from re-check 2 only in the intended remove rows and in known random output.

## check.sh
- CHECK OK, SMOKE OK, 69 checks, 71 PASS lines, real 1m54s. It passed on the first run.
- The fix-2 smoke line now returns `{"set":20,"add":52,"basic":20,"kept":true,"off":true,"rmAI":true,"rmBasic":true}`.
- The worktree is clean afterwards: index.html rebuilt byte-identical (md5 9be315b0...), nothing committed.
- Log: /tmp/qa/ai-8r3/check1.log

## Problems
None that block.
1. Low (wording, Basic mode, not a blocker): the same situation gets two different replies.
   - "remove the melody and turn off the reverb" → "Removed Melody. I couldn't do 'turn off the reverb' in Basic mode, so I left that part out."
   - "remove the melody, no reverb" → "I skipped the reverb change, because that part is gone."
   - The first wording suggests Basic mode can't turn reverb off, but it can ("no reverb on the chords" works). The second wording is the clearer one.
   - The same split shows for "delete the drums and kill the reverb" and "kill the reverb and delete the bass" (first wording), and for "get rid of the bass and turn the reverb off" (second wording).

## What I checked
**Fix 3, t16 (my script, 38 rows, each run on fix 2 and fix 3).**
- Setup for every row: a song with drums, bass, chords at 42% reverb, and melody.
- 17 rows are identical on both builds. The 21 that differ are all intended.

**AI path (`LAST_TEXT` = the sentence)**
- Each sentence ran with the remove alone, and with the remove plus the `fx reverb 0` or `track_fx` action Llama tends to add.
- "remove the melody and turn off the reverb" → Melody removed. Fix 2 kept it.
- "delete the drums and kill the reverb" → Drums removed. Fix 2 kept them.
- "kill the reverb and delete the bass" → Bassline removed. Fix 2 kept it. Same result with the actions in the other order.
- "remove the melody, no reverb" → Melody removed. Fix 2 kept it.
- "delete the drums and the bass" → both removed. Same on fix 2.

**Basic mode**
- The same four sentences → the part is removed, and the reverb half is skipped and the reply says so. On fix 2, all four only turned the reverb off.
- "delete the drums and the bass" → both removed, same on fix 2.

**Still keep the part**
- "remove the reverb from the chords" (AI and Basic) → reverb off, Chords kept.
- "remove the reverb" (AI `remove chords`) → reverb off, Chords kept.
- "no reverb on the chords and remove the melody" (AI and Basic) → Chords reverb off and Melody removed.
- "remove the drums and no reverb on the bass" (Basic) → drums removed and bass reverb off.
- "remove the chords reverb" and "remove the melody's reverb" (AI `remove`) → reverb off, part kept. On fix 2 these removed the whole part, so fix 3 also fixes this.

**My own phrasings (AI and Basic):** all remove the named part.
- "get rid of the bass and turn the reverb off"
- "turn off the delay and remove the chords"
- "take out the melody and kill the reverb"
- "remove the chords and the reverb"
- "kill the reverb on the chords and delete the bass" → Chords reverb off and Bassline removed
- "remove the melody and the chords" (Basic) → both removed

**Undo and errors**
- Every row is 1 Undo step, and 1 Undo goes back exactly.
- 0 page errors.
- Not new: Basic "remove the reverb" gives "I couldn't turn that into a change". It is the same on fix 2.

**Re-runs against re-check 2**

| Script | Result vs re-check 2 |
|---|---|
| t12 | 52 rows, 48 the same, including per-track changes. The 4 that differ are the intended rows: AI "remove the melody and turn off the reverb", AI "delete the drums and kill the reverb", AI "remove the melody, no reverb", and Basic "remove the melody and turn off the reverb". Each now removes the part. |
| t13 (manual Undo/Redo) | Byte-identical to fix 2: 10/10 Undo, 10/10 Redo, fast edits merge to 1 step, 120/120 exact on a full history, request then edit gives exact Undo. |
| t14 | 8 rows. 5 differ, all intended: the 2 "remove the melody and turn off the reverb" rows and "kill the reverb and delete the bass" now remove the part; "remove the melody without the reverb" removes the melody again, as on fix 1. "remove the reverb" still keeps Chords. The other 3 are unchanged. |
| 105 phrases (t1) | With the noise mask, 65 are identical. 0 action differences. The 40 that differ are noise: 34 are random drum-detail text in the reply ("a tom fill" vs "a clap build", "rims" vs "toms"); 2 are track ids printing as ids instead of names (#37, #39); 1 is random melody notes (#67, "add chords and a melody"); 2 are "another one" choosing which part follows the new chords (#58, Melody on fix 2 and Bassline on fix 3); and 1 is #99 "add a bassline and make it faster" coming out note-identical this run (known bug 11). |

- Fix 3's diff doesn't touch add_bass or vary, so #99 is chance.
- 0 page errors. The only console error is the blocked font request (sandbox).

## Files
- Scripts:
  - /tmp/qa/ai-8r3/js/t16-fix3.mjs (fix-3 cases)
  - /tmp/qa/ai-8r3/js/t17-bass.mjs (bassline repeat)
  - /tmp/qa/ai-8r3/js/t18-shot.mjs (UI shots)
- Results:
  - /tmp/qa/ai-8r3/: t16-f3.out, t16-f2.out, f3rm-f3.json, f3rm-f2.json, t12-q3.out, t13-q3.out, t14-q3.out, t1-q3.out, cmp-t12.txt, cmp-words.txt
  - /tmp/qa/ai-8r2/f2cases-q3.json
  - /tmp/qa/ai-8/words-ai8q3.json
- Builds: /tmp/qa/ai-8r3/f3/index.html (6bec67c) vs /tmp/qa/ai-8r2/f2/index.html (16ad4b6)
- Screenshots: /tmp/qa/ai-8r3/shots/r3-01-before.png, r3-02-remove-the-melody.png, r3-03-kill-the-reverb.png (Basic replies, Drums and Chords left)
