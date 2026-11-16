# AI-8 re-check 2 (fix 2) · qa-tester · 16 Nov 2026 · preview-ai-8 @ 16ad4b6

**Verdict: NOT READY, for one new regression (bug 1 below).** All four of my bugs from the last check are fixed, and manual Undo/Redo is unchanged. But fix 2's new "remove the reverb keeps the part" rule also stops real part removals on the live AI path. It's a small fix in `fxOffSaid` (src/actions.js).

## check.sh
```
PASS ... 71 PASS lines, incl. the new line:
PASS "set the chords reverb to 20 and add some delay" gives 20%, "add some reverb" still raises it, "remove the reverb from the chords" keeps the chords · {"set":20,"add":52,"basic":20,"kept":true,"off":true}
SMOKE OK: 69 checks
CHECK OK      real 1m52s
```
- It passed on the first run.
- The worktree is clean afterwards: index.html rebuilt byte-identical, nothing committed.
- Log: /tmp/qa/ai-8r2/check1.log

## Bugs
1. **Medium, caused by fix 2 (AI path): "remove the melody and turn off the reverb" keeps the melody.**
   - Steps: song with drums, bass, chords and melody. Run the actions Llama would send with the sentence as said (`LAST_TEXT.text`), e.g. `[{type:'remove',track:'melody'},{type:'fx',effect:'reverb',amount:0}]`.
   - Expected: the melody is removed (fix 1 did this).
   - Actual: "Reverb off on Melody", and the melody stays.
   - Same for:
     - "delete the drums and kill the reverb" → drums kept
     - "kill the reverb and delete the bass" → bass kept
     - "remove the melody, no reverb" → melody kept
     - "remove the reverb" with an AI `remove chords` → chords kept. This one is arguably right.
   - It happens even when the AI also sends the right second action.
   - Cause: `fxOffSaid` (src/actions.js) accepts an effect-off clause that names no part ("turn off the reverb") for any track, even when another clause in the sentence says to remove this part.
   - Fix idea: when the effect clause names no part, only treat it as "effect off" if no other clause says remove/delete/get rid of this part. Or only when the sentence has a single clause.
   - Basic mode gives "reverb off on Melody" for "remove the melody and turn off the reverb" on both builds (not new).

## What I checked (numbers; fix 1 = 20fd0da, fix 2 = 16ad4b6, same script on both)
**Bug 1 (AI path: explicit numbers beat the guard).** Fixed. Chords reverb starts at 42%.
- "set the chords reverb to 20 and add some delay" → 20% and delay 30% (fix 1: 52%)
- "add a bassline and make the chords reverb 15" → 15% (fix 1: 52%)
- "the chords are too wet, add some clarity" → 15% (fix 1: 52%)
- "add some reverb" (amount 40) → 52% · "add more reverb" (30) → 52% · "a bit more reverb" (30) → 52%
- My own phrasings:
  - "add some delay and set the chords reverb to 20" → 20/30
  - "add some reverb on the chords at 20%" → 20
  - "drop the chords reverb to 10" → 10
  - "the reverb on the chords is too much, add some delay instead" → 20/30
  - "make the chords drier and add some delay" → 20/30
  - "add some reverb to the melody and set the chords reverb to 20" → melody 30, chords 20

**Bug 2 (Basic mode reads effect numbers).** Fixed.
- "set the reverb on the chords to 20%" → 20 (fix 1: 52)
- "reverb at 30% on the chords" → 30
- "… to 20% and add some delay" → 20, delay 14→20
- More:
  - "set the delay on the chords to 35" → 35
  - "put 35% reverb on the chords" → 35
  - "make the chords reverb 20 percent" → 20
  - "set the reverb on the bass to 10% and the delay to 40%" → 10/40
  - "low cut on the bass at 60" → 60 Hz
  - "set the chords reverb to 0" → off
- Unchanged:
  - add some → 52, more → 62, less → 22, no → off
  - "more reverb on the chords and less on the melody" → 62/10
  - "add some reverb and delay" → 52/20
  - from 10%, "add some" → 25
- Not new: "chords reverb 25", with no verb, adds a new Chords 2 track (same on fix 1).

**Bug 3 (one Undo with a full history) and manual Undo.** Fixed. t8 on fix 2:
- Full history (120) plus a slow two-part request: the stack goes 120 → 119, and 1 Undo goes back exactly. Fix 1 needed 2.
- The 6 slow-machine requests: 1 step each, exact Undo and Redo.
- 10× "add a melody": 1 step and exact every time.
- Saying "undo" after a two-part request: exact.
- A manual edit made before a request survives 1 Undo.

Manual Undo/Redo is unchanged. t13 gives byte-identical results on fix 1 and fix 2:
- 10 spaced edits (volume, mute, add note, velocity, delete note, move notes, tempo, fx): 10 exact Undos, then 10 exact Redos.
- Fast edits under 120 ms merge into 1 step.
- A new edit clears Redo.
- 130 edits leave 120 Undos, all exact, and 120 Redos.
- Request, then a manual edit, then 2 Undos: both exact.

Ctrl+Z (t9): after M, it goes back to the request, then to before the request. Same as fix 1. The BPM box still makes no Undo step (known bug 9, not in scope).

**Older bug 4 (remove).** Fixed for the phrases in the brief.
- "remove the reverb from the chords": the Chords track stays and its reverb goes off. Checked in Basic mode, with an AI `remove` and with an AI `track_fx`.
- "take the reverb off" / "kill the delay on" / "get rid of the reverb on the chords" → that effect off.
- "remove the effects from the chords" → all effects off, and the part stays.
- These still remove the track:
  - "remove the chords" and "delete the bass" (Basic and AI)
  - "remove the drums and no reverb on the bass" (AI and Basic) → drums removed, bass reverb off
  - "remove the chords and take the reverb off the bass" (AI) → chords removed
- "mute everything" / "mute all" / "mute all the tracks" / "please mute everything" → all 4 parts muted, 1 Undo step, exact.
- In the UI, the 4 M buttons light up and one Undo click unmutes all 4.

**Re-runs.**
- Fix-1 script (t7, 84 rows; fix1-q2.json vs fix1-f1.json):
  - 46 are identical.
  - 7 are the intended changes: mute everything, the two Basic "set … 20%" rows, "remove the reverb from the chords", and the three AI rows.
  - The other 31 are noise: random drum-detail text, track ids printing as ids, random chord progressions.
  - 0 unintended differences.
- 105 phrases (t1; words-ai8q2.json vs words-ai8f1.json):
  - With ids, hashes and drum-detail text masked, 75 are identical.
  - 27 differ only in the random drum description in the reply.
  - The other 3 are the known chance rows: "add a bassline and give me another one" (bassline came out the same, known bug 11), "add some chords, then make another one" (melody follows the new chords), and "add chords and a melody" (random notes).
  - 0 unintended differences.
- 0 page errors in every run. The only console error is the blocked font request (sandbox).

## Seen in passing (one line each, not new)
- "add a melody and give me another one" varies the first Melody, not the new Melody 2. In 2 of 3 runs the first Melody ended up note-identical to Melody 2 (dev's known limit; `ACT.vary`).
- "chords reverb 25" (no verb) adds a Chords 2 track in Basic mode (same on fix 1).
- The BPM box makes no Undo step (known bug 9).

## Files
- Scripts:
  - /tmp/qa/ai-8/js/t12-fix2.mjs (fix-2 cases)
  - /tmp/qa/ai-8/js/t13-manual.mjs (manual Undo/Redo)
  - /tmp/qa/ai-8r2/js/t14-rm.mjs (remove regression)
  - /tmp/qa/ai-8r2/js/t15-ui.mjs (UI)
  - /tmp/qa/ai-8r2/js/cmp2.mjs (comparison)
- Results:
  - /tmp/qa/ai-8r2/: t12-f2.out, t12-f1.out, t14-f2.out, t14-f1.out, t8-f2.out, t13-f2.out, t13-f1.out, t9-f2.out, t7-q2.out, t1-q2.out, cmp-words.txt, f2cases-*.json
  - /tmp/qa/ai-8r/fix1-q2.json
  - /tmp/qa/ai-8/words-ai8q2.json
- Builds compared: /tmp/qa/ai-8r2/f1/index.html (20fd0da), /tmp/qa/ai-8r2/f2/index.html (16ad4b6)
- Screenshots: /tmp/qa/ai-8r2/shots/q2-01-set20.png, q2-02-remove-reverb.png, q2-03-mute-everything.png, q2-04-undo.png
