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
