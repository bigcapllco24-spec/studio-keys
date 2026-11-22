# AI-14 re-check 2 (after fix 2) · qa-tester · 22 Nov 2026 · preview-ai-14 @ 0903ad1

## Verdict: NOT READY. One small must-fix (about 15 minutes), and I should have caught it last round.

Both must-fixes from re-check 1 are fixed word for word. The four cheap fixes (4-7) work, and so do their guards. check.sh passes on the branch (119) and on the local merge with QA-2 (120). Against 1faba80 and main, no set case is worse except take-timing harness flags.

The blocker is in the mud rule. I listened with numbers this time by rendering the melody alone. On "the melody is muddy" (or "the mix is muddy"), a melody that goes down to about C3 gets its low cut LOWERED from 220 to 111 Hz. Measured, that adds mud:
- the 110-220 Hz band goes up 2.6 dB;
- the 60-110 Hz band goes up 9.4 dB;
- the melody's overall level goes up 0.8 dB.

On main, the same request takes 110-220 Hz down 4.7 dB. This came in with fix 1 (1faba80 measures the same). In re-check 1, I wrongly called that case "fine" because the reply was true.

## The set table

| Set | main (2812bfe = b5fa3f3 product code) | 1faba80 | 0903ad1 | 0903ad1 worse than either |
|---|---|---|---|---|
| check.sh | (not rerun) | 117 OK | **119 OK**, 192 s, 0 page errors | — |
| Local merge 0903ad1 + preview-qa-2 a7bd0b2 (21ae2d7, not pushed) | — | — | **120 OK**, 313 s (shared CPU, load 4-7) | — |
| bugs.js | 20/107 | 105/107 | **105/107** | 0 |
| ai.js (mocked AI) | 17/33 | 30/33 | **30/33** | 0 |
| nb.js | 33/52 | 51/52 | **51/52** | 0 |
| ai9.js (65 phrasings) | — | baseline | **65/65 identical** (only random chord names differ) | 0 |
| rt.js, now with the settle step | 50/140 | 111/140 | **117/140** (dev's settled run on 0903ad1: 114) | 1 flag, harness only (below) |
| Melody mud, band energy (new) | 110-220 Hz −4.7 dB | +2.4 dB | **+2.6 dB** | **worse than main: must-fix 1** |

How I read the sets:
- **rt.js:** I agreed with the developer's settle step and folded it in: 0.8 s plus two `stopTake()` calls before each case. The old file is kept as rt-v1.js.
  - The one "worse" line is "mute the voice note and sing the bassline" (AI): UNDO-DIFF. Its reply, mute and take are identical to the passing line.
  - That flag is harness timing. Stopping a take changes the Drums, Bassline and Chords event hashes, the same on all builds (rtu.js). An Undo pressed during the count-in therefore reads as a diff.
  - With the take stopped first, rtu.js on 0903ad1 gives one Undo step, exact, for all 3 muted-plus-take cases. That matches 1faba80, and it's better than main, which drops the undo step in 2 of 3.
  - The other 22 rt fails are the known open items from re-check 1. Most of them are the same take-timing flag.

## Problems (ranked)

### Must fix
1. **A mud complaint makes a low melody muddier (from fix 1, kept in fix 2).**
   - Steps:
     - Make a loop (Bodzin drums, bass, chords, melody) whose melody goes down to C3. That's common for a sung melody or a lower lead.
     - Its low cut is Keys's starting 220 Hz.
     - Say "the melody is muddy".
   - Reply: "Cleaned up the melody: low cut down to 111 Hz (under its lowest note) and 3 dB less low boom, same notes."
   - Measured on the melody alone (4 bars, rendered offline, each band's share of the total):

     | Build | Cut | 60-110 Hz | 110-220 Hz | 220-400 Hz | Total |
     |---|---|---|---|---|---|
     | main | 220 → 308 | −40.6 → −47.2 | −5.5 → **−10.2** | −4.1 → −4.2 | −1.6 dB |
     | 1faba80 | 220 → 111 | −41.7 → −32.3 | −5.7 → **−3.3** | | +0.9 dB |
     | 0903ad1 | 220 → 111 | −41.7 → −32.3 | −6.2 → **−3.6** | | +0.8 dB |

   - "the mix is muddy" does the same to the melody.
   - In the full mix, the mud band moves less than 0.4 dB on all builds, because kick and bass dominate. In a break, or with a melody up front, the user hears the melody get boomier after asking for less mud.
   - **Related, the same root cause:** for a melody from C4 to F#4, the raise is capped at 0.85 × the lowest note. So "the melody is muddy" gives "low cut up to 222 Hz" (from 220). That's +2 Hz, a no-op reported as a change. Main gives 308 Hz, which is 5.8 dB less in 110-220 Hz.
   - **Fix (maker.js toneFix `cut()`):**
     - A mud complaint never lowers a low cut. Remove the "down" branch at line ~597.
     - Raise it as main does (×1.4, up to the role max). If you want to protect the tune, cap at the lowest real note's fundamental rather than 0.85 × it.
     - When the cut can't go up, keep it and say "low cut stays at N Hz". Keep the honest wording: no "under its lowest note" unless it's true.
     - Update the 2 "AI-14 re-check" smoke lines to match (the stray C1 case should stay ≥ 220).

### Should fix (not regressions; fine after release)
2. **"hard right" / "hard left" / "right side" don't answer Keys's own question.**
   - Steps: "pan the melody". Keys says "Left or right? Say “pan melody a bit left” or “pan melody hard right”." Answer "hard right".
   - Result: "I couldn’t turn that into a change".
   - "right", "to the right" and "a bit to the right" work (R 40, R 40, R 20). Main does nothing for any of them, so this is not a regression.
3. **The two-stray-notes case.** Two slipped C1 notes (not one) defeat the stray rule, so the cut goes to the 100 Hz floor. The floor holds, so this is low priority; it's moot once problem 1 is fixed.
4. **"Only Keys's own 220 Hz cut may be lowered" is really "any cut at or under 220".** A cut the user set at 180 Hz goes down to 111 Hz on "the melody is muddy". Also moot once problem 1 is fixed.
5. **Known from re-check 1, unchanged:**
   - lift words: "pump up", "go off", "heavy", "feels empty";
   - "yes" to the section offer;
   - "make drop three bigger" on a two-drop song says "There’s no drop in this song" (should say "no Drop 3");
   - "switch off the voice note and let me record a new take" after a chords take starts a chords take;
   - "add a wider sounding synth" isn't understood (main: the same class);
   - "spread the notes of the chords out" still says "Chords (replaced)" with a dead undo step. This is the guard as the developer describes it, unchanged from 1faba80.

### Nit
6. "the mix is muddy" after "the melody is muddy" says "Melody (low cut stays at 280 Hz, under its lowest note)". The wording is true but long. The whole reply runs to 3 lines in the Keys panel (screenshot f2-07).

## Must-fixes from re-check 1, word for word plus fresh wordings (f2.js, settled)
- **"pan the melody" → "right":** "Panned Melody right (R 40), same notes." One step, exact Undo.
  - Fresh wordings:
    - "pan the chords" → "right": Chords R 40
    - "pan the bass" → "right": Bassline R 40
    - "can you pan the melody" → "to the right": R 40
    - "a bit to the right": R 20
    - "hard right" and "right side": nothing (problem 2)
  - Guards:
    - "pan the chords" → "left": L 40
    - "right" after "make the melody brighter", after "add a bassline", and after a pan followed by "make the bass louder": nothing
    - "right on" after a pan: nothing
- **Melody low cut:**
  - Stray C1 at 220, "the mix is muddy": 280, no "under" claim. ✓
  - Stray D1: 280. ✓
  - Melody all at C2, 150 → 100 on "the mix is muddy" and 220 → 100 on "the melody is muddy" (floor holds). ✓
  - Own 300, "the melody is muddy" / "the mix is muddy" / "the melody sounds muddy" / "clean up the mud in the mix": "low cut stays at 300 Hz". ✓
  - Plain C3 at 220: 111, "under its lowest note" (true). ✗ by sound (problem 1).
  - Fresh wordings for the stray case: "the melody sounds muddy", "the melody is boomy", "clean up the mud in the mix", "mix mein bahut mud hai", "everything sounds muddy". All give 280, with no false claim.
  - "still muddy": the cut stays and the low EQ goes another 3 dB down.
- **Judging the new rules:**
  - The 100 Hz floor is right.
  - The stray rule is right but narrow (problem 3).
  - "Only Keys's own cut may be lowered" is the wrong direction: a mud complaint shouldn't lower any cut (problem 1).

## Cheap fixes 4-7 (fresh wordings and guards)
- **4, width:** these keep the notes and don't add tracks:
  - "widen the chords" 65→75
  - "make the chords wider" 75
  - "the chords need to be wider" 75
  - "widen the melody" 40→50
  - "spread the melody out" 50
  - "chords ko narrow karo" 45
  - "the chords should be narrower" 45

  In the session: "chords ko wide karo" 75→85 with the chord notes unchanged. Guard: "add a wide pad" adds Warm Pad.
- **5, mute plus take:** each one mutes the voice note and starts the right take, one step:
  - "mute the recording, I’ll hum the melody"
  - "voice note mute karo aur bass gaane do"
  - "mute the voice note, I'm gonna sing the bass"
  - "mute the recording, I will hum the chords"
  - "recording mute karo aur melody gaane do"
  - "silence the old take and record another one" (voice take)
  - AI [sing voice, sing melody] and AI [mix mute, sing bass]: muted plus the take.
  - Guards:
    - "mute the voice note", "voice note mute karo", "mute the voice note and leave it", "silence the voice note" and AI [sing voice]: muted, no take, no mic.
    - "record a new voice note": take, no mute.
    - "silence the old take and record another one" with no recording in the song: says so, then a voice take.
  - In the session, a real take landed: "mute the recording, I’ll hum the melody" gave an 11-note "Sung melody", the voice note stayed muted, and the mic was off after.
- **6, drop two:**
  - "make drop two bigger" gets the honest Drop 2 reply.
  - "take the chords out of drop two" and "take the bass out of drop two" work on Drop 2 only.
  - "bring the melody out of drop one" works on Drop 1.
  - In the session, "make drop two bigger" after the chords came out brought them back in.
  - Guard: "make the drop two bars longer" means the bar count, not Drop 2. It extended Drop 2 16→24: it picked Drop 2, as before; this is not new.
- **7, two parts without a verb:** each pans both parts, one step:
  - "melody left, chords right"
  - "bass left, melody right"
  - "chords left melody right"
  - "melody hard left, chords a bit right" (L 100 / R 20)
  - "pan melody left chords right"
  - Guards:
    - "pan the melody to the left away from the chords": melody only.
    - The Hinglish line pans both.
    - "melody bahut left hai" on a centred melody: "Melody isn’t panned left; it’s in the centre."

## Producer session (0903ad1, 5 minutes, typed into Keys, Basic mode; log /home/claude/ai14s/sess-f2.log)
- **Requests:** Bodzin beat, bass, chords and melody, then:
  - "melody left, chords right"; "right" after a volume change (nothing); centring both
  - "pan the melody" → "right"; "right" after "brighter" (nothing); "melody bahut left hai"
  - three width changes; full track; drop two out and back in; break and outro replies
  - "the melody is too loud in the drop"
  - import sing.wav, mute and unmute, then a real hummed take with the mute
  - "record a new one", melody and mix mud
- **Undo:** 21 changes, 21 exact after one Undo, 0 with more than one step, Redo exact. One "step with no change" is the harness: its signature leaves out EQ, so "brighter" looks empty.
- **Speed:** replies took 1.0-2.3 s.
- **Errors:** 0 page errors.
- **Save, new song, reopen:** identical.
- **Render (4 bars from the middle of each section):**
  - Drop: peak −0.5 dBFS, RMS −6.6 dB, 0 clipped
  - Break: peak −1.0 dBFS, RMS −20.6 dB, L/R −3.5 dB (right louder, from the melody at R 40; I checked the pan direction separately: pan +0.4 gives L/R −6.2 dB)
  - Drop 2: the same as the Drop

## Try list (for the test link once problem 1 is fixed; from the developer's, with step 8 changed)
1. Say "make a beat like Stephan Bodzin", then "add a bassline", "add some chords", "add a melody". Say "melody left, chords right": both move apart. One Undo puts both back.
2. Say "pan the melody": Keys asks "Left or right?". Answer "right": the melody moves right. Then say "make the melody brighter", then "right": nothing pans.
3. Say "widen the chords" (or "chords ko wide karo"): the chords sound wider and keep their notes. "the chords should be narrower" brings them back in.
4. Say "make it a full track", then "make drop two bigger": Keys tells you what Drop 2 already has. Say "take the chords out of drop two", then "make drop two bigger" again: the chords come back into Drop 2.
5. Say "make the break bigger": Keys says what the break really has and offers a part. Say "bring the melody in at the break": it comes in there only.
6. Say "the melody is too loud in the drop": the melody goes down, and Keys says it's for the whole song.
7. Import a voice recording (Import audio). Say "mute the voice note": it goes quiet, and no count-in starts. Say "unmute the voice note", then "mute the recording, I’ll hum the melody" (or "voice note mute karo aur bass gaane do"): the recording mutes and the count-in starts. Hum, and your notes land on a new track.
8. Say "the melody is muddy": the melody gets cleaner, with less low boom and its low cut the same or higher, never lower. Say "the mix is muddy": the chords and melody get cleaned up, and the bass and kick are untouched.

## Files
- Trees (worktrees, detached, nothing pushed):
  - /home/claude/ai14s/head (0903ad1)
  - /home/claude/ai14s/merge (21ae2d7 = 0903ad1 + a7bd0b2)
- Check logs:
  - /home/claude/ai14s/check-head.txt
  - /home/claude/ai14s/check-merge.txt
- Set outputs:
  - /home/claude/ai14s/{bugs,ai,nb,ai9,rt,rtu}-head.txt
  - baselines: /home/claude/ai14r/*-{main,new}.txt
  - settled rt baselines: /home/claude/ai14g/rts-{main,new,final}.txt
- Focused probe: /home/claude/qa/ai14/f2.js → /home/claude/ai14s/f2-head.txt
- Band energy:
  - /home/claude/qa/ai14/band.js and band2.js
  - /home/claude/ai14s/band-{head,new,main}.txt and band2-{head,new,main}.txt (full mix and pan answers)
- Pan direction: /home/claude/qa/ai14/panchk.js → /home/claude/ai14s/panchk.txt
- rt.js now has the settle step; the old one is /home/claude/qa/ai14/rt-v1.js
- Session:
  - script: /home/claude/qa/ai14/sess3.mjs
  - log: /home/claude/ai14s/sess-f2.log
- Screenshots (looked at; nothing ugly beyond the long mud reply):
  - /home/claude/qa/ai14/shots/f2-01-loop.png
  - /home/claude/qa/ai14/shots/f2-02-pan-two.png
  - /home/claude/qa/ai14/shots/f2-03-width.png
  - /home/claude/qa/ai14/shots/f2-04-full.png
  - /home/claude/qa/ai14/shots/f2-05-break.png
  - /home/claude/qa/ai14/shots/f2-06-sung-melody.png
  - /home/claude/qa/ai14/shots/f2-07-after.png
  - /home/claude/qa/ai14/shots/f2-08-reopened.png
