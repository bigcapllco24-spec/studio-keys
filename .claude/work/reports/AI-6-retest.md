# AI-6 re-check after fix 1 · 15 Nov 2026 · qa-tester · `preview-ai-6` @ 5b8c089

**Verdict: READY.** All 5 bugs and the rough edges from my first report are fixed, with numbers below. Every item in the brief passes:
- Whole-song level moves every fader by the same dB, Undo works, and the master is untouched.
- 12+ changes then the same number of Undos come back exactly.
- Hinglish level, swing and voice-note phrases work.
- The reply and chip numbers match.
- Punchier stops at +6 dB.
- "Hats ko soft karo" is never a high cut offline.

I compared 141 phrases with preview-ai-4 and found no regressions. What's left is low-severity follow-up work, plus one sound point (the whole-song move is quieter on the faders than you hear) that the developer already raised for the engine.

**`check.sh`:**
- On 5b8c089: **CHECK OK, SMOKE OK: 63 checks, 3 min 33 s.** The save/reopen checks passed the first time.
- With my new smoke line: **CHECK OK, SMOKE OK: 64 checks, 4 min 33 s.** The load average was 13-14 because other testers were running.
- The check is now over the 3-minute budget on a busy machine. That's a test-upkeep item for me.

## Problems (none block; numbered for follow-up)

1. **"Turn it down a bit" says 3 dB but sounds about 0.6 dB quieter** · engine · MEDIUM · not a regression (preview-ai-4 did nothing for these phrases)
   - Steps:
     1. Make the 4-part Bodzin song.
     2. Type "turn it down a bit".
     3. Render 2 bars offline.
   - Every fader really moves -3.000 dB. But the mix RMS goes from -6.92 to -7.56 dB, which is **-0.64 dB**.
   - After "turn it down a lot" as well (-11 dB on the faders), the RMS drops only **-5.46 dB**.
   - Cause (the developer flagged it): the glue compressor and the limiter after the faders pull the level back up.
   - The reply's number is honest about the faders, not about what you hear.
   - Owner: sound-engine-dev (`src/studio.js` `renderGraph`, `src/core.js` live chain). The lead decides whether this needs an SE item before release.
2. **A muted part at full volume blocks "make it louder"** · assistant · LOW
   - Steps:
     1. Make the 4-part song.
     2. Set the melody to 100 and mute it.
     3. Type "make it louder".
   - Result: "The loudest part is already at full volume…" and nothing changes, though every part you can hear is below full.
   - Cause: `songDbStep` (`src/actions.js`) looks at muted tracks too.
3. **Some whole-song phrasings aren't understood** · assistant · LOW
   - These give "I couldn't turn that into a change":
     - "turn down the whole song"
     - "master down"
     - "lower everything"
     - "make it softer"
     - "drop the volume"
     - "cut the volume" (known)
   - These siblings work: "turn the song down a bit", "turn the whole thing down", "turn down the master", "reduce the volume".
   - Cause: the master regex in `levelFix` (`src/maker.js`).
4. **Punch on the bass goes to 100% compressor** · assistant · LOW
   - Steps: type "more punch on the bass" 4 times.
   - The compressor goes 40 → 60 → 80 → **100%**, then the honest reply.
   - The 90% cap only checks the value before the +20 step.
   - Also, "punchier drums" at the cap says "The drums **is** already as punchy…" (grammar).
5. **"More kick" / "kick louder" has no cap of its own** · assistant · LOW, rough edge
   - The punch-cap reply suggests "Try 'kick louder'". Three times "more kick" takes the drums' low EQ to **+11 dB** (it stops at +15).
   - There's no clipping from this alone: peak -0.20 dBFS, RMS -6.33 dB.
6. **All faders at 100 overshoot 0 dBFS slightly** · engine · LOW · **same on preview-ai-4**
   - Steps: make the 4-part song, then bring every part to full volume (by hand or with "bring the bass up", "chords louder", "the melody is too quiet").
   - Offline render peak and clipped samples:

     | State | preview-ai-6 | preview-ai-4 |
     |---|---|---|
     | All faders at full | +0.16 dBFS, 1 clipped | +0.18 dBFS, 3 clipped |
     | Plus drums low +11 | +0.24 dBFS, 5 clipped | +0.11 dBFS, 3 clipped |

   - The limiter lets about 0.2 dB through. Owner: sound-engine-dev.
7. **"Less bass" / "less drums" remake the part** · assistant · LOW · same on preview-ai-4
   - "less bass" → add_bass, "less drums" → add_drums. It's the same class as the level fix, but outside this brief.
   - Also outside this brief (known limits): "move the melody up an octave" and "transpose the melody down 2" add a melody. "lower the bass an octave" turns the bass down.
8. **Note for the lead's Worker test at release (not a bug offline)**
   - The safety net turns the AI's `track_fx high cut amount 60` into a **2.9 kHz** high cut on the whole kit. That's safe, but it still dulls the snare and kick top.
   - The developer checked the "never a high cut" prompt line only with a shortened prompt.
   - Please re-run "hats ko soft karo" and "softer hats" on Llama with the full prompt before the deploy.

## What I checked (numbers)
Unless noted, everything ran on the 4-part Bodzin song built by typing into the Keys box: "make a track like stephan bodzin", "add a bassline", "add chords", "add a melody".

**First-report bugs**
- **Bug 1 (shape up/down): fixed.**
  - All 12 phrases from the first report behave as on preview-ai-4 (sing:bass, sing:melody, add_melody, add_bass, add_chords, vary).
  - So do 17 new siblings of mine, for example:
    - "hum a bassline that goes up" → sing:bass
    - "let me sing chords that go up" → sing:chords
    - "write a bassline that drops down" → add_bass
    - "give me a melody that goes higher" → add_melody
    - "i want the bass to walk down" → add_bass
    - "can i sing a bassline going up" → sing:bass
    - "the bassline should go down at the end" → add_bass
  - "make a lower bassline" now adds a bassline. preview-ai-4 turned the bass down, so this is better.
  - Real take: typed "let me sing a bassline that goes down".
    - Reply: "Done: Sing the bassline after the count-in: 4 bars." No next-step hint.
    - Count-in, then 7 notes on "Sung bassline". The mic is off afterwards.
  - Level phrases still work: "bass up" +2.8 (to full), "drums down 3 db" -3, "volume up", "turn up the bass".
- **Bug 2 (whole song): fixed.**
  - "turn it down a bit" → `mix all db -3`. Every fader moves exactly -3.000 dB, with 1 undo step. The master stays at 1.
  - One click on the Undo button restores the song exactly.
  - Then 8 more phrases, each moving every part by the same dB:

    | Phrase | Move |
    |---|---|
    | make it louder | +1.83 (loudest part now at full) |
    | make it louder | honest "already at full", no change |
    | turn the volume down | -5 |
    | turn it down a lot | -8 |
    | awaaz kam karo | -5 |
    | turn it up | +5 |
    | louder | +5 |
    | everything quieter please | -5 |

  - The master stayed at 1 throughout. 7 × Ctrl+Z put the song back exactly.
  - The AI paths `mix master db -3` and `mix master change -10` go to all parts, and Undo is exact.
  - Save: "turn it down a lot" → New song (master 1, 0 tracks) → reopen from the song list. The faders came back exactly as saved: 0.5679, 0.5363, 0.3470, 0.4543.
  - On an empty song, "turn it down a bit" gives the honest reply "nothing in the song yet".
- **12 changes then Undo: exact.**
  - Fresh song. 14 phrases, each one undo step:
    - bring the bass up, softer hats, more kick
    - punchier ×3
    - turn it down a bit, make it louder, turn it down a lot
    - drums bahut loud hai, melody thoda kam karo, bass ko thoda upar karo
    - make it louder, hats ko soft karo
  - 14 Undo-button clicks: every intermediate state matched exactly (volume, low/mid/high EQ, compressor, high/low cut, note counts), and the end equalled the start. The master was 1 throughout.
  - Redo ×14 reached the last state exactly.
- **Bug 3 ("very" / Hinglish levels): fixed.**
  - All 6 phrases from the first report change only the mix: drums -5, bass +2.8 (full), drums -5, drums -5, melody -3, bass +3, drums high EQ -3.
  - So do 10 new Hinglish ones, for example:
    - "bass ki awaaz badhao" +5
    - "chords thoda soft karo" -3
    - "drums ko halka karo" -5
    - "melody bahut tez hai" -5
    - "gaane ki awaaz kam karo" whole song -5
    - "chords ka volume badhao" +5
    - "kick thoda zyada karo" low EQ +2
- **Bug 4 (Hinglish voice notes): fixed.**
  - No recording in the song: all 5 phrases give the honest reply, record nothing and stay stopped. That's my first report's 3 plus "is voice note se melody banao" and "voice note ko chords mein badlo".
  - With sing.wav imported, each one converts it: bass 6 notes, chords 6, melody 6, melody 6, chords 6.
  - "record a voice note" still records.
- **Bug 5 (numbers): fixed.** Reply and chip match in all 14 phrases I tried:

  | Phrase | Reply / chip |
  |---|---|
  | bring the bass up | 2.8 / 2.8 (volume 100) |
  | softer hats | "3 dB less highs" / "high EQ -3 dB (now -2)" |
  | turn it down a bit | 3 / 3 |
  | make it louder | 1.8 / 1.8 |
  | can you make the bass a little louder | 2.8 / 2.8 |
  | drums too loud | 5 / 5 |
  | kick a bit louder | 2 / +2 |
  | hats are way too loud | 5 / -5 |
  | bring down the chords 2 db | 2 / 2 |
  | chords louder | 5 / 5 |
  | make the kick punchier | 2 / +2 |

  - Each one undid exactly.

**Rough edges from the first report**
- **Punchier cap: fixed.**
  - From the start: low EQ +2 → +4 → +6 → 6 → 6 → 6, compressor 30 → 50 → 70 → 90%, then "The kick is already as punchy as I'd push it" three times.
  - With low EQ already at +11 ("more kick" ×3), punchier only adds compressor and never lowers the EQ.
  - Snare punch stops at +6 dB mids.
- **Hinglish swing: fixed.**
  - From 70%, "swing thoda kam karo" / "thoda kam swing" step the ladder: 0.333 → 0.16 → 0.08 → 0 → "already straight".
  - "zyada swing" → 66%, "swing badhao" → 70% (the most it goes), "swing hatao" → straight.
  - The English ladder ("straighten it a bit", "a bit straighter", "make it bouncier", "straighten it") is unchanged.
- **"hats ko soft karo": fixed offline.**
  - Typed, it becomes `mix drums eq {high:-3}`, with no high cut (lp unset).
  - AI-shaped actions:
    - high cut amount 60 → 2.9 kHz; 100 → 800 Hz; 8000 → 8 kHz; hz 300 → 800 Hz (clamped)
    - `track_fx eq {high:-3}` and `band high change -3` → high EQ -3
    - low cut 60 → 60 Hz (still read as Hz)
  - Each one undid exactly.

**Regressions near the fix**
- **Phrase comparison (141 phrases, localBrain on the same song) against preview-ai-4 (80f031a):**
  - Every difference is intended: levels and punch now go to the mix, whole-song goes to `all`, Hinglish swing works, and the straighten/bounce ladder.
  - "make the vocal louder" with no vocal now honestly says "There's no vocal yet".
  - "turn the pad down" now turns the chords down (preview-ai-4 changed the instrument).
- **Against the first-test head (4056709):** 73 of 141 differ, all intended (shape phrases, all instead of master, very/Hinglish, swing).
- **Unchanged:** add a melody/bassline/pad, another one, another melody, sing, record a voice note, softer groove, pump it up, build it up, switch it up, the bass is muddy (low cut 50 Hz), more reverb on the chords, hats on 16ths, mute/solo/remove, tempo words, bounce to mp3.
- **"write a melody that goes down" on the full song** adds "Melody 2", as before.
- **Sound** (offline 2-bar render, peak / RMS, 0 clipped samples and no silence unless noted):

  | State | Peak dBFS | RMS dB |
  |---|---|---|
  | start | -0.30 | -6.92 |
  | down a bit | -0.56 | -7.56 |
  | + down a lot | -2.93 | -12.38 |
  | + louder ×3 | -0.13 | -6.67 |
  | more kick ×3 + punchier ×2 | -0.20 | -6.33 |
  | + bass/chords/melody up | +0.06 (4 clipped) | -6.86 |

  - The last row is problem 6 (pre-existing).
- **Console:** 0 page errors in every script. The only console error is a blocked network font load in this sandbox.
- **Screens:** the replies and chips read well at 1400 px and at 390 px (phone). The longest chip, "Whole song: down 3 dB (every part, same balance)", fits on one line on desktop. On the phone, the two punch chips each fit on one line.

## Smoke line added (`tests/smoke.mjs`, committed to `preview-ai-6`)
`"make the kick punchier" x6 stops at +6 dB low EQ / 90% compressor with an honest reply; Undo restores`. It passes: low +6 dB, compressor 90%.

## Files
- Screenshots: /tmp/qa/ai6r/shots/
  - r01-song, r02-song-down, r03-numbers, r04-punch, r05-voice
  - r06-mix-after, r07-mixer, r08-singing, r09-after-sing, r10-reply-chips
  - r11-phone-390, r12-phone-punch
- Logs: /tmp/qa/ai6r/check1.log (63, OK), /tmp/qa/ai6r/check2.log (64, OK)
- Scripts and output: /tmp/qa/ai6r/js/
  - base.mjs, p1-phrases.mjs, p1-new.json, p1-ai4.json, p1-old.json
  - p2-state.mjs, p2-new.out, p3-sound.mjs, p3-new.out
  - p4-clip.mjs, p4-new.out, p4-ai4.out, p5-edge.mjs
