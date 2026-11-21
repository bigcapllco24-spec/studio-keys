# AI-6 build report · 15 Nov 2026 · assistant-dev · branch `preview-ai-6` (from `preview-ai-4`)

Four offline-brain bugs from the QA-1 daily session (bugs 2, 4, 5, 6) are fixed. `check.sh`: **CHECK OK, SMOKE OK: 59 checks** (4 new lines; bundle and worker syntax PASS, no page errors).

## 1. "Turn the voice note into a bassline" recorded a new voice note
- **Cause:** the transcribe rule in `src/maker.js` only knew one shape: "turn/convert/make X into/to (a) bass|chords|melody". Every other wording fell through to the `/voice note|record (my )?voice/` rule, which records. With no recording in the song, even the exact phrase recorded, which started the loop QA saw.
- **Fix:** a new `audioConvert(t)` runs before singing and voice notes. It understands:
  - "turn/convert/make/use/put/play X into/to/as/on (a) [adjective] part"
  - "make a bassline from/out of/using X"
  - "X to bassline" with no verb
  - "transcribe X"
  - targets including "base line" (a speech mistake), "synth bass", piano, keys and notes
  - X can be a track's name, "voice note / memo / recording / audio / clip / take / file" anywhere in it ("the voice note I just recorded"), or it/that/this (unless a hum is newer).
  
  With no recording in the song it answers honestly and records nothing: "There's no voice note or recording in this song yet. Say 'record a voice note' first…". "record a voice note", "record my voice", "just record me" and "take a voice note" still record.
- **Phrases, before → after** (with an imported "sing" recording):

  | Phrase | Before | After |
  |---|---|---|
  | make the voice note a bassline | records | transcribe bass |
  | use the voice note as a bassline | records | transcribe bass |
  | turn the voice note I just recorded into a bassline | records | transcribe bass |
  | turn the voice note into a synth bass | records | transcribe bass |
  | turn the voice note into a base line | records | transcribe bass |
  | put the voice note on a bass | records | transcribe bass |
  | voice note to bassline | records | transcribe bass |
  | make a bassline from the voice note | records | transcribe bass |
  | transcribe the voice note | records | transcribe melody |
  | no recording in the song: "turn the voice note into a bassline" | records | honest reply, nothing recorded |
  | convert my voice note to chords, turn my recording into a melody, turn sing into a bassline | worked | still work |

## 2. Level and tone words added or remade a part
- **Cause:** brainCore only knew level verbs placed before the part ("turn down the melody"). "turn the melody down", "bring the bass up", "drums too loud" and "the hats are too loud" fell through to the part words (add_melody, add_bass, add_drums, hats regen). "punchier" wasn't known at all, so "kick" meant add_drums.
- **Fix:** a new `levelFix(t)` in `src/maker.js` runs after `toneFix`. The rule is that a sentence about level or tone never adds, varies or replaces a part:
  - **Level:** a fader move in dB on every track of that part. About 3 dB for "a bit / a little / a touch", 5 plain, 8 for "a lot / way", or an exact "3 db".
  - **One drum inside the kit:** an EQ step on its band on the drums track: kick = low, snare/clap = mid, hats = high. 3 dB, or 2 for "a bit" and 5 for "a lot".
  - **Punch** ("punchier", "more punch", "hit harder", "snappier", "more knock"): compressor +20 on that part, plus 2 dB low end for the kick or drums (mids for the snare). Same pattern.
  - **Whole song:** "turn it down" or "make it louder" moves the master fader, with an honest reply when it is already at full.
  - **Honest replies:** a part that's already at full volume, and a part that doesn't exist yet ("There's no melody yet. Want me to add one?"), get a reply and no change.
  - **Exclusions keep the old meanings:** octave, transpose, speed, swing, reverb and the other fx words, another/different, add, mute/solo/remove, pump/build/strip it, hats patterns, "softer groove".
- **`src/actions.js`:**
  - `mix` takes two new optional fields: `db` (a relative fader move: gain is vol², so the step is 10^(dB/40); the chip says "down 3 dB (volume 61)" or "already at full volume") and `eq` (relative EQ steps, like `{"low":3}`).
  - `track_fx` with `effect:"eq"` now forwards to `mix eq`. Llama sent exactly that for "softer hats" in the prompt test.
  - No new action names.
- **Phrases, before → after** (Bodzin song with drums, bass, chords and melody):

  | Phrase | Before | After |
  |---|---|---|
  | turn the melody down a bit | add_melody ("Melody 2") | melody -3 dB |
  | turn the melody down | add_melody | -5 dB |
  | make the kick punchier | add_drums (groove replaced) | drums compressor 30→50%, low EQ +2 dB, same hits |
  | give the kick more punch, the kick needs more punch, punchier drums | add_drums | punch |
  | make the drums hit harder | groove energy +1 (new hits) | punch |
  | bring the bass up | add_bass (bassline remade) | bass up (2.8 dB to full volume, said in the reply) |
  | bring up the bass a little | add_bass | bass up 3 dB |
  | the bass is too quiet, turn the bass up a lot, bass up | add_bass | bass up |
  | drums too loud, the drums are too loud | add_drums | drums -5 dB |
  | the hats are too loud | hats regen | drums high EQ -3 dB |
  | softer hats | whole-kit volume -12 | drums high EQ -3 dB |
  | louder hats | whole-kit volume +12 | drums high EQ +3 dB |
  | more kick, kick louder | add_drums / kit +12 | drums low EQ +3 dB |
  | snare louder | nothing | drums mid EQ +3 dB |
  | the melody is a bit loud | add_melody | -3 dB |
  | i cant hear the chords | add_chords | chords +5 dB |
  | chords louder, the chords a bit louder | +12 | +5 / +3 dB |
  | lower the chords a touch | -12 | -3 dB |

  - **Unchanged:** add a melody, add a bassline, another melody, softer groove, pump it up, build it up, switch it up, the bass is muddy, the kick is boomy, more reverb on the chords, mute/solo/remove/drop.
  - **Undo:** three level/punch/hats changes undo back to the exact starting volume, EQ and compressor.
- **Sound** (offline `renderAudio`, 2 bars of the Bodzin song with 4 parts, measured as peak / RMS dBFS, no clipped samples anywhere):

  | State | Mix | Drums stem | Melody stem |
  |---|---|---|---|
  | start | -0.3 / -6.7 | -0.4 / -5.6 | |
  | punchier ×1 | -0.4 / -6.8 | -0.4 / -5.6 | |
  | punchier ×3 | -0.5 / -7.1 | -0.6 / -5.9 | |
  | melody down a bit | -0.6 / -6.9 | | -3.5 / -20.7 (fader exactly -3.0 dB) |
  | drums too loud | -0.7 / -8.9 | -1.5 / -8.9 | |
  | softer hats | -0.7 / -8.9 | -1.1 / -8.9 | |

## 3. "Straighten it a bit" removed all the swing
- **Cause:** in `swingSaid` (`src/maker.js`) the `\bstraighten\b` no-swing rule came before any "a bit" rule. "straighter" and the "bounce" words weren't swing words at all, so they did nothing.
- **Fix:** a step rule runs first. These now return "less", one rung down (70 → 66 → 58 → 54 → straight):
  - "straighten it / the hats a bit / a little / slightly / up a bit"
  - "a bit straighter", "straighter"
  - "a little less bounce", "less bounce", "too bouncy"

  Up and off:
  - "make it bouncier", "more bounce", "bouncy" = "more" (full triplet swing, the SE-3 rule)
  - "a bit bouncier" = "a bit more"
  - "no bounce" = 0
  - "straighten it", "no swing" and "make it straight" stay fully straight
  - "bounce the song to mp3" is still an export
  
  `swingOnly` ignores the bounce words.
- **Tested from 70%:**
  - The step phrases go 0.4 → 0.333 → 0.16 → 0.08 → 0 ("Lighter: full triplet swing, about 66%" … "Straight, no swing").
  - "make it bouncier" from straight → 66%, then 70% ("the most it goes").
  - "straighten it" → straight.
  - The existing SE-3 checks ("less swing" ladder, AI-mocked "less swing", "add a bassline with some swing", swing words about parts) all still PASS.

## 4. The sing reply suggested what you'd just asked for
- **Cause:** `handleRequest` (`src/assistant.js`) appended `nextStep()` before the sung part existed, so "let me sing the bassline" got "Bassline next? … 'let me sing the bassline'".
- **Fix:** no next-step hint while a take is starting (`BATCH.take` set). The reply is now "Done: Sing the bassline after the count-in: 4 bars." The take order is unchanged: reply first, then `TAKE.start` after the speech.

## Worker prompt (`cloudflare/worker.js`; active only after the Worker deploy at release)
- **mix fields:** adds `db` (relative fader dB: -3 "a bit quieter", -5 plain, -8 "a lot") and `eq` (relative EQ steps, `{"low":3}`). Low/mid/high are now labelled absolute.
- **Mixing rule:** a sentence about level or tone NEVER adds, varies or replaces a part. It lists the mappings for melody down a bit, bass up, drums too loud, kick louder / more kick, snare/clap louder, softer hats and punchier kick.
- **SWING:** "straighten it a bit", "a bit straighter" and "a little less bounce" = "less" (one step). Bounce means swing ("bouncier" = "more"). "straighten it" = 0.
- **Next-step rule:** when the request starts a sung take, skip the next-step suggestion.
- **New example:** "turn the melody down a bit and make the kick punchier" → mix db -3, track_fx compressor +20, mix eq low +2.
- The file still has no backticks and no `${`, and passes `node --check`.
- **Llama 3.3 70B test** (Cloudflare connector, new prompt, Bodzin song state with a "Voice note 1"):

  | Request | Actions |
  |---|---|
  | turn the melody down a bit | mix Melody db -3 ("Turned the melody down 3 dB, same notes.") |
  | make the kick punchier | track_fx Drums compressor +20, mix Drums eq low +2 |
  | bring the bass up | mix Bassline db 5 (+ play) |
  | drums too loud | mix Drums db -5 (+ play) |
  | softer hats | track_fx Drums effect "eq" amount {high:-3}. Wrong shape, now handled by the `track_fx` eq forward: it gives "Drums: high EQ -2 dB" (absolute, from +1) |
  | straighten it a bit | groove swing "less" |
  | make it bouncier | groove swing "more" |
  | turn the voice note into a bassline | transcribe "Voice note 1" to bass |
  | bass thoda louder karo | mix Bassline db 3 |
  | let me sing the bassline | sing bass; the reply suggests "a melody after", which is the next part, not the same one |

  No request added or replaced a part. I ran every Llama action list through `runActions`: 0 tracks added, no page errors.

## Smoke lines added (`tests/smoke.mjs`)
- "turn the melody down a bit" = -3 dB, "kick punchier" = more compressor, "softer hats" = less highs; no part added or remade
- voice note phrasings convert the recording ("record a voice note" still records)
- "straighten it a bit" steps 70 → 66 → 58 → 54 → straight; "bouncier" swings; "straighten it" is straight
- the sing reply doesn't suggest singing what you just asked for

## Files
`src/maker.js`, `src/actions.js`, `src/assistant.js`, `cloudflare/worker.js`, `tests/smoke.mjs`, `index.html` (rebuilt).

## For the lead
- **Worker deploy at release:** the prompt changes above. The offline fixes work without it. With the AI on, the app's swing words override the AI's number anyway.
- **No new action names.** `mix` has two new optional fields (`db`, `eq`), and `track_fx` with effect "eq" now forwards to `mix`.
- **Open question for sound-engine-dev / SE-3:** "a bit less swing" still uses `resolveSwing`'s -0.08 step (70 → 65%, off the ladder). The brief's step phrases use the one-rung "less". Aligning "a bit less" with the ladder would be a one-line change in `src/groove.js`, which is not my file.

## Known limits (same class, outside this brief)
- These offline sentences about a part still add or change the wrong thing: "transpose the melody down 2" and "move the melody up an octave" add a melody (the transpose action exists); "speed up the melody" and "slow down the bass" add a part; "lower the bass an octave" turns the bass down. Worth a small follow-up item.
- A single drum is changed through its EQ band on the drums track, not that drum's own level. The kit is one track, so "louder hats" also brightens the rides and shakers a little.
- `renderAudio` on this machine (load average 8-9) took about 40 s per 2-bar render, so I measured 2 bars, not the whole loop.
