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

## Fix 1 · 15 Nov 2026 · assistant-dev · `preview-ai-6`
This fixes the tester's NOT READY report (`.claude/work/reports/AI-6-test.md`): all 5 bugs and both rough edges. `check.sh`: **CHECK OK, SMOKE OK: 63 checks**. That is the tester's 60, including the up/down guard, plus 3 new lines. The first full run failed 3 checks: sung chords, plus the two save/reopen checks. Load average was about 8, and the check before it had passed both. The rerun was clean.

**1. Up/down that describes a part's shape no longer moves a fader (MEDIUM)**
- `LEVEL_UP` and `LEVEL_DOWN` in `src/maker.js` no longer accept a bare up or down.
- A bare up/down now counts only right after a part word: "bass up", "bass up a bit", "drums down 3 db", "volume up". The level verbs still work: turn, bring, push or crank … up/down, louder, too loud.
- New guards in `levelFix`:
  - `LEVEL_CREATE`: add, write, compose, create, generate, sing, hum, whistle, record, let me, try a, play a, I want/need a … followed by a part.
  - `LEVEL_SHAPE`: goes, going, walks, steps, climbs, rises, falls, moves, descends … up/down/higher/lower, unless the sentence also has a level word (louder, volume, dB, turn, too loud).
- The old `mixVerb` fallback in `brainCore` is guarded the same way. "make a lower bassline" used to give mix -12; it now adds a bassline.
- All 12 of the tester's phrases now behave as on preview-ai-4:

  | Phrases | Result |
  |---|---|
  | let me sing a bassline that goes down, let me sing the bass it walks up, sing the bassline going down | sing:bass |
  | i want to sing a melody that goes up, let me hum a melody going up | sing:melody |
  | write a melody that goes down, write me a melody that climbs up, play a melody going down (+ play), try a melody that rises up | add_melody |
  | create a bassline that walks up, i need a bassline that steps down, make me a bassline that goes down | add_bass |
  | compose chords that go up | add_chords |
  | i want a new melody going up | vary |

- Also fixed: "write a melody that goes lower", "write a softer melody", "sing the bassline lower".

**2. Whole-song level is part of the song, so Undo works (MEDIUM)**
- "Turn it down a bit", "make it louder", "turn the volume down" and "awaaz kam karo" now send `mix` with `track:"all"`. Every part's fader moves by the same dB, so the balance stays the same.
- Going up stops when the loudest part reaches full volume. When it is already there, Keys says so honestly and changes nothing.
- `MIX.master` is never touched. A relative `db` or `change` that the AI sends on `"master"` is also routed to all parts. An absolute master `volume` still sets the studio fader.
- Undo test:
  - 4-part Bodzin song, 12 changes in a row: bass up, softer hats, more kick, punchier ×3, song down, louder ×2, down a lot, and three Hinglish ones.
  - Then 12 Undos.
  - Every track's volume, low/mid/high EQ, compressor and note count came back exactly. The master stayed at 1.
  - New smoke line: "turn it down a bit" moves every part 3 dB and Undo restores exactly.

**3. "Very" and Hinglish level sentences change the mix only (MEDIUM)**
- "is/are … loud/quiet" now takes any run of intensifiers: very, super, pretty, quite, too, bahut, thoda …
- Hinglish level words added:
  - Down: kam karo, ghatao, neeche, soft/halka/dheema karo, bahut/zyada loud, loud hai.
  - Up: upar karo, badhao, zyada/loud karo, awaaz badhao, kam hai.
  - "Thoda" counts as "a bit" (3 dB).
- Results:
  - The drums are very loud: drums -5 dB.
  - The bass is very quiet: bass +2.8 dB (it was at 0.85, so that's full volume).
  - Drums bahut loud hai: drums -5.
  - Drums ki awaaz kam karo: drums -5.
  - Melody thoda kam karo: melody -3.
  - Melody ka volume kam karo: melody -5.
  - Bass ko thoda upar karo: bass up to full.
  - Hats ko soft karo: drums high EQ -3.
  - Bass thoda louder karo and kick ko punchy banao still work.
- New smoke line.

**4. Hinglish voice-note requests (LOW)**
- `audioConvert` understands "X ko/se TARGET (mein) bana do / banao / badlo / kar do", with Hindi determiners (is, meri, ye, woh …).
- With sing.wav imported:
  - "voice note ko bassline bana do" → transcribe bass.
  - "is recording se chords banao" → transcribe chords.
  - "meri recording ko melody mein badlo" → transcribe melody.
- With no recording in the song, all three give the honest reply and record nothing.
- New smoke line.

**5. The reply and the chip say the same number (LOW)**
- New helpers in `src/actions.js` (`dbTxt`, `faderDb`, `songDbStep`) feed both the reply and the chip.
- The EQ chip now shows the change and the new setting.

  | Phrase | Reply | Chip |
  |---|---|---|
  | bring the bass up | up 2.8 dB (that's full volume) | up 2.8 dB (volume 100) |
  | softer hats | 3 dB less highs | high EQ -3 dB (now -2) |
  | turn it down a bit | whole song down 3 dB | Whole song: down 3 dB (every part, same balance) |
  | make it louder | up 3 dB (the loudest part is now at full volume) | up 3 dB |

- "can you make the bass a little louder" used to say 3 dB when it moved 2.8. It now says 2.8.
- The odd "say 'make it louder' after turning a part down" text is gone.

**Rough edges**
- **Punchier is capped.**
  - The low EQ boost stops at +6 dB and the compressor at 90%. Then Keys says "The kick is already as punchy as I'd push it. Try 'kick louder'".
  - ×5 from the start: low +2 → +5 (an earlier "more kick") → +6, compressor 30 → 50 → 70 → 90, then the honest reply twice.
- **EQ steps hold at the ±15 dB end.** A step there gets an honest reply instead of a fake one.
- **Hinglish swing:**
  - "swing thoda kam karo" and "thoda kam swing" step one rung lighter ("less").
  - "zyada swing" and "swing badhao" = "more".
  - "swing hatao" = straight.
- **High cut from the AI:**
  - In the Llama test, "hats ko soft karo" first came back as `track_fx high cut amount 60`. That would have meant a 60 Hz high cut, clamped to 800 Hz on the drums.
  - `track_fx` now reads a high-cut amount from 0 to 100 as how much to cut, on the log scale: 60 gives about 2.9 kHz.
  - The prompt now says "softer hats" or "hats ko soft karo" = eq high -3 (never a high cut).

**Regression check:** I compared 107 phrases between the old branch head (4056709) and this one on the same 4-part song. They included every English sibling from the test report, add/another/vary, swing, sing, voice notes, mute/solo/remove, tempo and export. The only differences were the intended ones: the shape phrases, whole-song "all" instead of master, "too quiet"/"everything louder" now working, and 2.8 vs 3 dB. There were 0 page errors in every script.

**Sound** (offline `renderAudio`, 2 bars of the 4-part song, peak / RMS / LUFS, 0 clipped samples, no silence):

| State | Peak dBFS | RMS dB | LUFS |
|---|---|---|---|
| start | -0.38 | -6.4 | -7.6 |
| turn it down a bit | -0.59 | -7.0 | -8.2 |
| make it louder ×2 | -0.16 | -6.3 | -7.5 |

**Worker prompt (`cloudflare/worker.js`, active only after the Worker deploy):**
- The mix track list now includes `"all"` (the whole song, the same dB on every part, undoable), never `"master"` for "turn it down" or "make it louder".
- The mixing rule gained these lines:
  - "the drums are very loud" = drums db -5
  - "turn it down a bit" = mix all db -3
  - shape up/down is not a level ("let me sing a bassline that goes down" = sing bass, "write a melody that goes up" = add_melody)
  - a Hinglish glossary (kam karo, upar karo/badhao, bahut loud hai, soft karo; voice note ko bassline bana do = transcribe; swing thoda kam karo = swing "less")
  - "hats ko soft karo" = eq high -3
- No backticks or `${`; `node --check` passes.

**Llama 3.3 70B test** (Cloudflare connector, full new prompt, Bodzin song state with a Voice note 1):

| Request | Actions |
|---|---|
| turn it down a bit | mix all db -3 |
| make it louder | mix all db 3 |
| let me sing a bassline that goes down | sing bass (no next-step hint) |
| write a melody that goes up | add_melody |
| the drums are very loud | mix Drums db -5 |
| drums ki awaaz kam karo | mix Drums db -5 |
| melody thoda kam karo | mix Melody db -3 |
| voice note ko bassline bana do | transcribe Voice note 1 → bass |
| swing thoda kam karo | groove swing "less" |
| hats ko soft karo | first run: track_fx high cut 60 (now made safe, see above) |

After the "never a high cut" line I re-ran four requests with a shortened prompt (the mixing section word for word):
- "hats ko soft karo" and "softer hats" → mix drums eq high -3.
- "turn the volume down" → mix all db -3.
- "bass ko thoda upar karo" → mix bass db 5.

**Files:** `src/maker.js`, `src/actions.js`, `cloudflare/worker.js`, `tests/smoke.mjs` (3 lines), `index.html` (rebuilt).

**For the lead**
- **Worker deploy at release** for the prompt lines above. The offline fixes work without it.
- **No new action names.** `mix` accepts `track:"all"` (also "song", "everything", "the mix"). Relative master moves are routed there.
- **For sound-engine-dev (not my files):** the whole-song move is a real -3 dB on every fader, but it measures only about -0.6 LUFS. The glue compressor and the -3 dB limiter come after the faders and after the master strip (`renderGraph` in `src/studio.js`, `core.js` live chain), and they pull the level back up. The old master-fader route went through the same chain, so it would have measured about the same. If "turn it down" should sound clearly quieter, the engine needs an output gain after the limiter that the song can hold (for Undo).

**Known limits**
- "Bring it down" means the whole song quieter. A producer might mean a breakdown; it was the same before this fix.
- "Cut the volume" does nothing (no direction word).
- From the earlier report, still open: "move the melody up an octave" and "transpose the melody down 2".
