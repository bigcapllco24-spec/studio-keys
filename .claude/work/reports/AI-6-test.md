# AI-6 branch check · 15 Nov 2026 · qa-tester · `preview-ai-6` @ 1859f7f

**Verdict: NOT READY.** All four of this morning's bugs are fixed for the phrasings in the brief. But the fix breaks two things that worked on preview-ai-4. Both are small fixes in `src/maker.js` `levelFix`.
- Up/down words that describe a part's shape are now read as volume. "Let me sing a bassline that goes down" turns the bass down instead of starting the take.
- "Turn it down a bit" moves the master fader, which has no Undo. The next Undo removes an earlier change to the song instead.

`check.sh` on 1859f7f: **CHECK OK, 59 checks, 3 min 4 s** (load 3-4; the save/reopen checks passed first time).
I added one smoke line that guards bug 1. With it the branch reads **SMOKE FAILED: 1 of 60**, and the only FAIL is that line, as intended. It passes on preview-ai-4.

## Bugs

1. **Up/down describing a part now moves the fader: singing and making parts break** · assistant · MEDIUM · **regression**
   - Steps: Basic mode → "make a track like stephan bodzin", "add a bassline", "add chords", "add a melody" → type "let me sing a bassline that goes down".
   - Expected: count-in, then the take (as on preview-ai-4: "Sing the bassline after the count-in").
   - Actual: "Turned the bass down 5 dB, same notes." No take starts.
   - Same on this branch, against preview-ai-4:

     | Phrase | preview-ai-6 | preview-ai-4 |
     |---|---|---|
     | let me sing the bass, it walks up | bass +5 dB | sing |
     | sing the bassline going down | bass -5 dB | sing |
     | i want to sing a melody that goes up | melody +5 dB | sing |
     | let me hum a melody going up | melody +5 dB | sing |
     | write a melody that goes down | melody -5 dB | add_melody |
     | write me a melody that climbs up | melody +5 dB | add_melody |
     | create a bassline that walks up | bass +5 dB | add_bass |
     | compose chords that go up | chords +5 dB | add_chords |
     | i want a new melody going up | melody +5 dB | vary |
     | i need a bassline that steps down | bass -5 dB | add_bass |
     | play a melody going down | melody -5 dB | add_melody + play |
     | try a melody that rises up | melody +5 dB | add_melody |

   - On a song with no melody yet, "write a melody that goes down" answers "There's no melody yet. Want me to add one?" and does nothing.
   - Cause:
     - `LEVEL_UP` and `LEVEL_DOWN` end in a bare `up` / `down`.
     - `levelFix` runs before the sing rule.
     - Its "add" exclusion only knows add / give me / make (me) a. "make me a bassline that goes down" still adds; write, create, compose, I want, I need, play, try and all sing/hum verbs don't.
   - Guard: the new smoke line "direction words in sing / make requests keep their meaning (no fader move)".

2. **"Turn it down a bit" can't be undone, and Undo then removes earlier work** · assistant (+ studio) · MEDIUM · **new on this branch** (preview-ai-4 did nothing for these phrases)
   - Steps: the same 4-part Bodzin song → "turn the bass down a bit" → "turn it down a bit" (reply "Turned the whole song down 3 dB") → press Undo.
   - Expected: the master goes back to 100.
   - Actual: the master stays at 84 and the bass goes back up. Undo silently reverted the change before.
   - In a longer sequence the same Undo deleted my Melody track, and the next one deleted Chords.
   - Cause: the master fader is `MIX.master` (a studio setting saved by `saveMix`), not part of the song, so `mix track:"master"` never reaches the undo history.
   - It also carries into New song (0.63 after "turn it down a lot" stayed 0.63 in a fresh song) and isn't saved with the song.
   - Also affected: "turn the volume down", "make it louder", "turn it up".
   - Fix idea: lead's or dev's call. Either make the master change undoable, or have these phrases move the song's parts together.

3. **"Very" and Hinglish level sentences still replace or add parts** · assistant · MEDIUM · same class as bug 4, not new (same on preview-ai-4)

   | Phrase | Result |
   |---|---|
   | the drums are very loud | add_drums: **the groove is replaced** |
   | the bass is very quiet | add_bass: **the bassline is remade** |
   | drums bahut loud hai, drums ki awaaz kam karo | new drum pattern |
   | melody thoda kam karo, melody ka volume kam karo | adds "Melody 2" (louder, not quieter) |
   | bass ko thoda upar karo | add_bass |
   | hats ko soft karo | hat pattern changed to 8ths |

   - "very" isn't in the `(is|are) (a bit|…|really|kind of)? loud|quiet` intensifiers.
   - The Hindi words for less, very and up (kam, bahut, upar) aren't level words.
   - "bass thoda louder karo" and "kick ko punchy banao" work.

4. **Hinglish voice-note requests still record or add** · assistant · LOW · not new

   | Phrase | Result |
   |---|---|
   | voice note ko bassline bana do | **records a new voice note** (this morning's bug 2 symptom) |
   | is recording se chords banao | adds generic chords |
   | meri recording ko melody mein badlo | adds a melody |

5. **Reply and chip numbers disagree** · assistant · LOW

   | Phrase | Reply | Chip |
   |---|---|---|
   | make it louder (master at 84) | "Turned the whole song up 5 dB" | "up 3 dB (volume 100)" |
   | bring the bass up | "2.8 dB (that's full volume)" | "up 3 dB" |

   - EQ chips show the absolute band and the reply the step: "3 dB less highs", chip "high EQ -2 dB".
   - The full-master reply says to say "make it louder" again after turning a part down, which reads oddly.

## Rough edges
- "Make the kick punchier" keeps adding +2 dB low EQ after the compressor caps at 90%. After 4 asks the drums' low EQ goes from +2 to +10 dB. There's no clipping (numbers below), but there's no cap either.
- The kit is one track, so "softer hats" and "louder kick" are EQ bands on the whole kit (the developer notes this).
- Hinglish swing ("swing thoda kam karo", "thoda kam swing") gets "I couldn't turn that into a change".
- Known limits from the build report are confirmed: "move the melody up an octave" still adds Melody 2.

## What I checked (numbers)
**Brief done-when (offline, typed into the Keys box like a user, each from the same 4-part Bodzin song, then Undo)**

| Phrase | Result | Notes / tracks | Undo exact |
|---|---|---|---|
| turn the melody down a bit | Melody -3 dB (vol 0.72 → 0.606) | same / +0 | yes |
| make the kick punchier | drums compressor 30 → 50%, low EQ +2 → +4 | same | yes |
| drums too loud | -5 dB (0.9 → 0.675) | same | yes |
| softer hats | drums high EQ 1 → -2 | same | yes |
| bring the bass up | 0.85 → 1.0 ("2.8 dB, that's full volume") | same | yes |

- My English siblings all change only the mix, and Undo is exact for every one:
  - "the chords are too quiet" +5
  - "can you lower the bass a little" -3
  - "pull the melody back" -5
  - "kick a bit louder" low +2
  - "the snare is too loud" mid -3
  - "make the drums punchier"
  - "hats are way too loud" high -5
  - "bring down the chords 2 db" -2
  - "the melody is too loud", "chords a bit quieter please", "turn the hats down"
  - "can you make the bass a little louder", "the kick needs to be louder"
  - "make the snare hit harder" (comp + mid +2), "more punch on the bass" (comp 40 → 60)
- Punchier ×4 then Undo ×4: back to the exact start.
- **Voice notes:**
  - No recording in the song: "turn the voice note into a bassline", "make the voice note a bassline" and "turn my recording into chords" all give the honest reply, record nothing, and leave the state stopped.
  - "record a voice note" still records (count-in, part voice, "Voice note 1" saved).
  - With sing.wav imported, 17 of 20 phrasings convert it: 6 bass notes / 18 chord notes / 6 melody notes. This includes my own:
    - "can you turn that recording into a bass line please"
    - "make chords out of my voice note"
    - "play my voice note on a piano"
    - "turn the audio into notes"
    - "turn the voice memo into a melody"
  - The 3 misses are the Hinglish ones (bug 4).
  - With both "sing" and a newer "Voice note 1": "the voice note" → Voice note 1, "sing" → sing, "it" → Voice note 1. Correct.
  - Voice note 1's own reply ("say 'turn the voice note into a bassline'") now converts instead of looping.
- **Swing, typed, from 70%:**
  - "straighten it a bit" 0.333 (66%) → again 0.16 (58%) → "a bit straighter" 0.08 (54%) → "a little less bounce" 0.
  - "make it bouncier" from straight → 66%, then 70% ("the most it goes"). "straighten it" → 0.
  - The SE-3 swing smoke checks pass.
- **Sing reply:** "let me sing the bassline" → "Done: Sing the bassline after the count-in: 4 bars." with no next-step hint. The real take (fake mic) gave 11 notes on "Sung bassline". Afterwards: "Got it: 11 notes … Say 'Keys, again'", and the take no longer owns the mic. "let me sing the chords" and "i want to sing the melody" reply the same way.
- **Regressions near the change (all fine apart from bug 1):**
  - "add a melody" adds Melody, and again adds Melody 2. "add a pad" adds Warm Pad. "another one" ×2 changes the groove each time (and differs from the first). "another melody" varies it.
  - AI-4: "the bass is muddy" low cut 28 → 50 Hz, same notes. "the mix is muddy" gives chords 238 Hz / melody 308 Hz.
  - "more reverb on the chords" 62%. "pump it up" / "build it up" / "softer groove" change the groove. "hats on 16ths" works.
  - "bounce the song to mp3" exports.
- **Sound:**
  - Offline render, 2 bars of the 4-part song (peak / RMS / LUFS):
    - Start: mix -0.22 dBFS / -6.7 dB / -7.8 LUFS; drums -0.56 / -5.5 / -7.1.
    - After punchier ×4: mix -0.23 / -6.9 / -8.0; drums -0.76 / -5.5 / -7.2.
    - 0 clipped samples and no silence in either.
  - "bounce the song to mp3": "Untitled song 124bpm.mp3", 61.96 s, 192 kbps, ready in 21 s. ffmpeg: -8.0 LUFS, LRA 0.3, sample peak about -0.7 dBFS, no silence (-60 dB / 0.3 s).
- **Console:** 0 page errors in every script.
- **Phrase-by-phrase comparison:** with preview-ai-4 (80f031a, a temporary detached worktree, now removed).

## Smoke line added (`tests/smoke.mjs`, committed to `preview-ai-6`)
`direction words in sing / make requests keep their meaning (no fader move)`. It checks 4 phrases:
- "let me sing a bassline that goes down" → sing:bass
- "i want to sing a melody that goes up" → sing:melody
- "write a melody that goes down" → add_melody or vary
- "create a bassline that walks up" → add_bass or vary

Today it FAILS on this branch (`mix | mix | mix | mix`), and its logic passes against preview-ai-4's results. With it, `check.sh` reads SMOKE FAILED: 1 of 60 (3 min 8 s).

## Files
- Screenshots: /tmp/qa/ai6/shots/
  - ai6-01-song, ai6-03-punchier (replies and chips after punchier ×4)
  - ai6-04-recording-voice, ai6-05-voice-note-bass, ai6-06-singing-bass, ai6-07-after-sing-bass
  - ai6-08-song, ai6-09-master
- Logs: /tmp/qa/ai6/check1.log (CHECK OK, 59), /tmp/qa/ai6/check2.log (with the new line, 1 FAIL)
- Scripts and output: /tmp/qa/ai6/js/ (p1-p6, base.mjs, *.out; p4-ai4.out and base-ai4.out are the preview-ai-4 comparison)
- MP3: /tmp/qa/ai6/dl/Untitled song 124bpm.mp3
