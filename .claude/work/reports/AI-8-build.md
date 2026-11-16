# AI-8 build report · 16 Nov 2026 · assistant-dev · branch `preview-ai-8` (from `preview-ai-6`)

All five Basic-mode bugs are fixed, plus the typo words. `check.sh`: **CHECK OK, SMOKE OK: 67 checks** (3 new lines). Under heavy machine load (load avg 8-10, other worktrees running checks), single UX timing tests flaked on some runs and passed on the others: velocity drag, the relaxed double-click, Undo after opening a song. None of them touch my files.

## What changed
- `src/maker.js`
  1. **Genre order.** Compound genres are now checked before the plain words inside them:
     - afro (afro house, afro tech, afrobeats) comes before house
     - lofi comes before hip-hop
     - "deep tech" and "minimal house/tech" are tech house
     - "lofi house" and "chill house" are deep house
     - Already right before: melodic techno vs techno, UK garage, minimal techno = techno.
  2. **Unsolo and unmute.** New `muteSoloFix`, which runs before the mix and remove rules. It handles:
     - unsolo / un-solo, "remove/clear/cancel the solo", "clear all solos", "turn the solo off", "take the bass off solo"
     - unmute / un-mute, "unmute everything"
     - Hinglish: "solo hatao", "mute hatao"
     - It works on one part, a named track, or everything. When nothing is soloed or muted, it replies honestly.
     - "remove the solo on the bass" no longer deletes the bass.
  3. **Quantize.** New `quantizeFix`.
     - Phrases: "quantize", "tighten up the timing", "tighten it up", "snap … to the grid", "fix the timing".
     - Grid: 1/4, 1/8, 1/16, 1/32, "16ths", "8th", triplets ("1/8t", "1/8 triplets").
     - Target: a part you name prefers your own (played or sung) track of that role. Otherwise the track open in the editor or selected, else the newest part you played or sang. "everything" quantizes every note track.
     - Audio tracks get an honest reply.
  4. **Two requests in one sentence.** New `splitAsks`, and `localBrain` now wraps `brainOne` (the old body).
     - The sentence splits on and / , / then / also / plus only when the next half is a command of its own: it starts with a verb, or it is a level line like "the bass quieter".
     - A half that only names a part repeats the previous mix command for that part. "and less on the melody" becomes "less reverb on the melody", and "and the bass" becomes "mute the bass".
     - Everything else stays one request: "drums with hats and claps", "drum and bass", "add chords and a melody".
     - A half that needs the first one ("make a house beat and add a shaker") is read together with it.
     - All halves run as one batch, so one Undo takes the whole sentence back. A tempo said in one half is kept by a genre in the other.
     - The reply says what each half did. A half that can't be done gets "I couldn't do “add a riser” in Basic mode, so I left that part out." "start a new song and …" starts the song and asks for the rest again.
  5. **Typos** are fixed in a new `askText` normaliser: basline, anothr/anotehr/antoher, melodie/meoldy/mellody, chrods/cords. "un-mute" and "un-solo" are joined into one word.
- `src/groove.js` (`ARTISTS` only)
  - New `artistAlias`/`artistAs`: the name the user said ("Black Coffee", "Massano") is used. A lower-case spelling maps to its proper name ("bohmer" becomes Ben Böhmer).
  - Removed the `lofi|lo-fi` aliases from the Lofi Girl row.
  - Capitalised the Afterlife row's artists, so Massano and the others show as said.
- `src/actions.js`
  - **Artist names on the live path.** `resolveVibe` shows and saves the name the user said, even when the AI sends "Keinemusik" for "like Black Coffee". When the user named a genre but no artist ("afro house beat", "lofi hip hop beat"), an AI-picked artist is dropped and the genre is used. The song's own vibe artist is kept.
  - **Joined-up genre names.** New `STYLE_ALIAS`, because the live AI really sends `style:"afrohouse"`: afrohouse, ukgarage, deeptech and others map to studio styles.
  - **Quantize action.** `quantize` now reads `grid` as "1/8", "1/16t", "8th", "triplets" or a number (≤4 is beats, 3-64 is a note value). It wraps a note at the loop end and says the grid and how many notes moved.
  - `runActions` adds `done.segs` (which half each chip came from).
- `src/assistant.js`
  - `brainReply(L, done)` builds a two-part reply after the actions run.
  - `projectState()` tracks now include `soloed` and `generated`, so the AI can tell which part is soloed and which one the user played.
- `cloudflare/worker.js` (prompt only, **needs the Worker deploy at release**):
  - The mix line says mute and solo are true/false, and that "unsolo / remove the solo / unmute" are false and never add or remove a part.
  - The quantize line documents `grid` (1/4, 1/8, 1/16 default, 1/32, 1/8t, 1/16t). "quantize it" or "tighten up the timing" means the part they played or sang (`generated` false, the newest), never a new part.
  - Still no backticks and no `${`.
- `tests/smoke.mjs`: 3 new lines (genres plus artist as said; unsolo, unmute and two-part sentences with one Undo; quantize to 1/8).

## Phrases (Basic mode, headless Chrome, `ASSIST.run`; song = house drums, bass, chords, melody plus an off-grid "Played keys" part)
| Phrase | Before | After |
|---|---|---|
| afro house beat | House, 909, 124 | Afro house drums, 118 BPM |
| make an afro house groove with congas | House | Afro house drums + congas |
| afro tech beat | afro (already right) | Afro house |
| deep tech beat | default house beat | Tech house 126 |
| lofi house beat | Lo-fi 80 | Deep house 120 |
| lofi hip hop beat | "Lofi Girl-style", ref saved | Lo-fi 80, Hip-hop kit, no ref |
| melodic techno / minimal techno / uk garage beat | right | still right |
| drums like Black Coffee | "Keinemusik-style" | "Black Coffee-style", ref Black Coffee |
| drums like massano / a beat like bohmer | "Afterlife-style" / right | "Massano-style" / "Ben Böhmer-style" |
| unsolo the bass (soloed) | new bassline, still soloed | Solo off, "every part plays again" |
| unsolo the bass (not soloed) | new bassline | "The bass isn't soloed." |
| remove the solo / clear all solos / turn the solo off / take the bass off solo / bass ka solo hatao | nothing / some deleted the bass | solo off on the soloed track |
| un-mute the drums | MUTED them | unmuted |
| unmute everything / drums ka mute hatao | nothing | unmuted all muted / the drums |
| quantize my melody to 1/8 | added a Melody track | Played keys snapped to 1/8, no new track |
| quantize it / tighten up the timing | not understood | Played keys to 1/16 (0.07 1.12 2.4 3.9 15.95 → 0 1 2.5 4 0) |
| quantize to 1/8 triplets | — | 1/8 triplets (2.4 → 2.333) |
| quantize everything to 1/16 | — | all 5 note tracks, one short reply |
| quantize it (empty song) | — | "There are no notes to quantize yet." |
| more reverb on the chords and less on the melody | chords reverb DOWN | chords 24% → 44%, melody down; 1 undo step |
| make the drums louder and the bass quieter | drums only | drums up (to full), bass −5 dB; reply names both |
| mute the drums and solo the bass | mute only | both |
| set the tempo to 128 and add a shaker | shaker only, tempo lost | 128 BPM + shaker |
| set the tempo to 128 and make a house beat | 124 | 128 + house drums |
| mute the drums and the bass | drums only | both muted |
| make a house beat and add a shaker (empty) | house beat, no shaker | house beat with shaker |
| mute the drums and add a riser | mute only, silent about the riser | mute + "I couldn't do “add a riser” in Basic mode…" |
| unsolo the bass and unmute the drums | — | both halves answered |
| add a basline / anothr one / add a melodie | (worked by luck / vary / melody) | add_bass / vary / add_melody |

**Kept as before:** "add 124 bpm drum and hihats with claps like ben bohmer", "drum and bass beat", "drums with hi-hats and claps", "add chords and a melody", "make a beat with kick and bass", "rock and roll beat", "hey keys, mute the drums", "make a track like stephan bodzin", "124 bpm drums … like Ben Böhmer or Stephan Bodzin" (one request each).

**Regression vs `preview-ai-6`:** 107 phrases from the AI-4/AI-6 reports and the smoke lists went through `localBrain` on both builds. There were 0 differences in actions (9 rows differed only in how my runner printed track ids).

## Live path (actions.js, runActions with LAST_TEXT set)
- AI ref "Keinemusik" for "drums like Black Coffee": shows and saves Black Coffee.
- AI ref "Lofi Girl" or "lofi" for "lofi hip hop beat": Lo-fi with no artist.
- AI ref "Black Coffee" for "afro house beat": Afro house with no artist.
- AI `style:"afrohouse"`: afro.
- AI ref "Afterlife" for "a track like massano": "Vibe: Massano".
- Spotify taste "Black Coffee": Black Coffee-style.

## Worker prompt test (Workers AI, Llama 3.3 70B fp8-fast, new prompt, real `projectState`: afro song, bass soloed, drums muted, "Played keys" generated false)
- unsolo the bass / remove the solo / bass ka solo hatao → `mix Bassline solo:false`
- un-mute the drums → `mix Drums mute:false`
- quantize my melody to 1/8 → `quantize Melody grid 1/8`
- tighten up the timing / quantize it → `quantize Played keys grid 1/16`. With the first prompt wording and no `generated` field it picked the generated Melody, so I added that field and the prompt hint.
- quantize the played keys to 16th triplets → `grid 1/16t`
- more reverb on the chords and less on the melody → chords +20, melody −20
- mute the drums and solo the bass → both
- make the drums louder and the bass quieter → db +5 / −5
- another one → vary drums
- sing the bassline → sing bass
- drums like Black Coffee → ref Black Coffee
- afro house beat → `style:"afrohouse"`, now mapped to afro by `STYLE_ALIAS`

## For the lead
- **Deploy the Worker at release** (prompt lines for mix mute/solo and quantize grid). No new action names, no new fields beyond `grid` (already in `ACT.quantize`) and the `soloed` and `generated` state fields.
- Flaky UX timing tests under load (above): worth a look by qa-tester; not caused by this branch.

## Known limits
- A sentence is only split when each half starts with a verb or is a level line. "louder and punchier" is still one request, and it does the punch only (same as before).
- "quantize" has no strength (always 100%). Quantizing a generated beat straightens any swing in its notes, which is what was asked.
- Typo fixes cover only the listed words; I didn't add fuzzy matching (too risky for artist names and Hinglish).
