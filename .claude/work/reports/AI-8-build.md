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

## Fix 1 · 16 Nov 2026 (tester's 4 low issues + 5 older offline bugs)
`check.sh`: **CHECK OK, SMOKE OK: 68 checks** (1 new line). The first run failed 2 song-reopen checks ("opening the app starts a new empty song…", "Undo right after opening a song…"). They are UX timing checks in files I didn't touch. The re-run passed (load average about 2).

**Files**
- `src/maker.js`: all nine fixes below.
- `src/actions.js`: one Undo step per request, and a live-path guard so "add some reverb" can't lower an effect.
- `cloudflare/worker.js`: one prompt line. **The Worker needs a deploy at release.**
- `tests/smoke.mjs`: 1 new line, covering items 1, 5 and 9.

| # | Phrase (Basic mode; song with drums, bass, chords, melody) | Before | After |
|---|---|---|---|
| 1 | add a bassline and give me another one | add_bass + vary **drums** | add_bass + vary **bass** (drums untouched) |
| 1 | add some chords, then make another one | add_chords + vary drums | add_chords + vary chords (a new progression) |
| 2 | afrohouse beat / afrotech groove | house 124 | afro 118 |
| 2 | techhouse, deephouse, melodictechno, ukgarage, lofihiphop, minimaltechno beat | house 124 | tech house 126, deep house 120, melodic techno 124, UK garage 132, lo-fi 80, techno 130 |
| 3 | quantize the bass to 1/8 and the chords to 1/4 | bass only | bass 1/8 and chords 1/4; the reply names both |
| 3 | quantize the drums and the bass to 16ths | drums only | both to 1/16 (a grid said at the end applies to both) |
| 4 | mute the drums then unmute them | ends muted; "Drums: muted. Nothing is muted." | ends unmuted; "Drums: muted. Unmuted Drums." |
| 4 | solo the bass and then unsolo it | "Nothing is soloed." | solo off; the reply says so |
| 5 | mute everything but the drums | mutes the drums | mutes bass, chords and melody: "…so only the drums play" |
| 5 | mute everything except the drums and the bass | mutes the drums and the bass | mutes chords and melody |
| 5 | mute all the other tracks apart from the chords | new chord progression | mutes the other three |
| 6 | add some reverb to the chords (42%) | 25% | 52% (never lowers) |
| 6 | add some reverb and delay to the chords (42%) | reverb 25%, no delay | reverb 52%, delay 14 → 20% |
| 6 | mor reverb on teh chords (42%) | 25% | 62% |
| 6 | add some reverb to the chords (10%) / less reverb (42%) | 25% / 22% | 25% / 22% (unchanged) |
| 7 | house beat at 120 / techno beat at 135 with claps | 124 / 130 | 120 / 135 |
| 7 | drums like Black Coffee at 124 / afro house beat at 124 | 120 / 118 | 124 / 124 |
| 7 | make it 128 (and add a bassline) | skipped | tempo 128 |
| 7 | add a melody at bar 3 / swing at 60 / house beat at 50% swing | no tempo | no tempo (unchanged) |
| 8 | bring the drums back (drums muted) / bring back the bass (bass muted) | new drums / new bassline, still muted | unmuted, no new part |
| 8 | bring the drums back (bass soloed) / bring everything back | new drums / not understood | solo off on the bass / unmutes what's muted |
| 8 | bring the drums back (already playing) | new drums | "The drums are already playing. Say “another beat” for a new one." |
| 9 | save the song / save the track | MP3 export | save |
| 9 | save / save it / save my song / export the song / download the mp3 / save it as an mp3 / bounce the track | — | unchanged |
| — | add a basline (slow machine) | 2 Undo steps | 1 |

**How the fixes work**
- **"another one" after a part (1).** A half with no part named takes the part of the half before it. "another one" becomes another take of that part. A pronoun in a mute, solo, level or quantize half ("unmute them", "unsolo it") becomes that part.
- **Halves read in order (4).** Each later half is read against the song as the earlier halves leave it (mute, solo and fader only). The real song is put back before anything runs.
- **Quantize (3).** "and the chords to 1/4" carries its own grid.
- **Undo (the note in the brief).** `runActions` collapses any extra Undo steps pushed during one request. It's 2 lines in actions.js, so I did it.

**105-phrase comparison** (the tester's t1 list against `words-ai8.json`, which already matched ai6):
- 0 unintended differences.
- 6 rows differ on purpose: afrohouse at 120, bring the drums back, the two "another one" rows, dnb "at 174" (now an explicit tempo action, same BPM), and "add a basline" (2 Undo steps → 1).
- 5 more rows differ only in how the runner printed track ids.
- 0 page errors.

**Worker prompt** (Llama 3.3 70B through the Cloudflare connector, old vs new prompt, real `projectState` with the drums muted):
- The old prompt already handled these correctly, so I added no prompt text for them:
  - mute everything but the drums → mutes the 3 others
  - bring the drums back → mute false
  - save the song → save
  - house beat at 120 → style + tempo 120
  - the two-part quantize → 1/8 and 1/4
  - mute the drums then unmute them → mute, then unmute
- **One gap:** with the old prompt, "add a bassline and give me another one" gave add_bass + vary drums. I added one line to the vary entry. Now it gives add_bass + vary Bassline.
- No change: "another one" → vary drums, "sing the bassline" → sing bass.
- The prompt still has no backticks and no `${`.
- "add some reverb" got amount 40 from Llama. The AI can't see each track's effects in the song state, so `ACT.track_fx` now never lowers an effect when the request says add/some/more without less/lower/cut. Tested: 42% with amount 40 → 52%; "set the reverb to 20" still gives 20%; "less reverb" still lowers it.

**Known limits**
- "add some chords, then make another one" makes a new chord progression, so bass and melody follow it. That's what "another" on chords already did.
- "add a melody and then another one" is still one request (one new melody), same as before.
- The "…at 124 read as 122" note on the board: the artist's or style's tempo won because "at 124" wasn't read. It is now read (Black Coffee at 124 → 124).

## Fix 2 (16 Nov 2026) · assistant-dev

**What changed**
- `src/actions.js`
  - The "add some / more never lowers it" guard in `track_fx` reads only the part of the sentence about this effect and this part (`fxClause`). It applies only when that part says add/more/some and no number, "set", less, too wet, dry, off.
  - `remove` checks first for "remove / take off / kill / no / get rid of the <effect>". If the user said that about this part, it turns the effect off and keeps the part (`fxOffSaid`). This covers the AI path too.
  - `track_fx` with effect `all`/`effects` and `remove` turns every effect off on that part ("remove the effects from the chords").
  - One Undo per request counts the steps pushed during the request (`UNDO.pushes`), not the stack length, so it still works once the history is full (120).
- `src/maker.js`
  - Basic mode effects read each effect's own half of the sentence. A number sets it exactly ("to 20%", "at 30%", "reverb 15", "low cut at 60" Hz). Remove, kill, take off, get rid of or no turns it off. Less and more step it. The "+10 at or above default" step only applies to add/some with no number.
  - "mute everything" / "mute all" mutes every part.
- `src/edit.js` (one line, as the brief allowed): `undoNote` counts pushes in `UNDO.pushes`.
- `tests/smoke.mjs`: one new line covering bugs 1, 2 and 4.
- No change to `cloudflare/worker.js`, so there was no Llama re-test and nothing to deploy.

**Before → after** (chords reverb at 42%; AI path = the actions Llama sends, run with the sentence as said)
| Case | Before (20fd0da) | After |
|---|---|---|
| AI: "set the chords reverb to 20 and add some delay" | reverb 52%, delay 30% | reverb 20%, delay 30% |
| AI: "add a bassline and make the chords reverb 15" | 52% | 15% |
| AI: "the chords are too wet, add some clarity" (reverb 15) | 52% | 15% |
| AI: "add some reverb" (amount 40) / "add more reverb" (30) | 52% / 52% | 52% / 52% (kept) |
| AI: "add a melody and some reverb on the chords at 20%" | 52% | 20% |
| Basic: "set the reverb on the chords to 20%" | 52% | 20% |
| Basic: "set the reverb on the chords to 20% and add some delay" | 52% / delay 20% | 20% / delay 20% |
| Basic: "reverb at 30% on the chords" · "set the delay on the chords to 35" | 52% · delay 20% | 30% · delay 35% |
| Basic: "add some reverb" · "more reverb" · "less reverb" · "no reverb" | 52 · 62 · 22 · off | same |
| Basic: "more reverb on the chords and less on the melody" | 62 / 10 | 62 / 10 (kept) |
| Full history (120) + slow two-part request | 2 Undos | 1 Undo, exact |
| "remove the reverb from the chords" (Basic and AI `remove`) | Chords track deleted | Reverb off, Chords kept |
| "take the reverb off the chords" · "kill the reverb on the chords" · "get rid of the reverb on the chords" | new Chords 2 · 52% · 52% | reverb off (all three) |
| "remove the effects from the chords" | track deleted | all effects off, part kept |
| "remove the chords" · "delete the bass" · AI "remove the drums and no reverb on the bass" | removed | removed (kept) |
| Basic: "mute everything" / "mute all" | not understood | all 4 parts muted |

**How I tested**
- `bash .claude/tools/check.sh`: CHECK OK, 69 checks (68 + the new line `{"set":20,"add":52,"basic":20,"kept":true,"off":true}`), 1m54s, first run.
- Tester's `t8-undo.mjs` (slow machine, 200 ms per action):
  - All 6 requests: 1 step, exact Undo, exact Redo.
  - Full history 120 + two-part request: 1 Undo back (stack 120 → 119; the oldest step drops as before).
  - 10× "add a melody": 1 step and exact each time.
  - The BPM-box line is unchanged from fix 1 (known bug 9, `setTempo`, not in scope).
- Tester's `t7-fix1.mjs`: 84 rows, 73 the same.
  - The 7 intended changes are in the table above.
  - The other 4 are noise: how track ids print, and random progressions or notes.
- Tester's `t1-words.mjs` (105 phrases): 93 the same.
  - The other 12 are id-print noise, plus the known chance rows ("make it 100 bpm and add a bassline", "add some chords, then make another one").
  - 0 unintended differences.
  - "more reverb on the chords and less on the melody" kept 62/10. An earlier draft broke it (melody 40%); fixed by matching the clause that names the part.
- 0 page errors.
- Results: `/tmp/qa/ai-8r/fix1-f2.json`, `/tmp/qa/ai-8/words-ai8f2.json`.

**Known limits / found**
- In "add a melody and give me another one", the `vary` goes to the first Melody track, not the new Melody 2. The reply says "Melody: a new melody". This was the same on fix 1 (`findTrack('melody')` returns the first). Not fixed (out of scope); a one-line follow-up in `ACT.vary` would target the part just added.

## Fix 3 (16 Nov 2026) · assistant-dev

**What changed**
- `src/actions.js`: `fxOffSaid` now lets the clause that names THIS part decide (new helpers `fxPartSaid` and `removesPart`).
  - "remove / delete / get rid of the melody" aimed at the part removes it, even when another clause says "turn off the reverb" or "no reverb".
  - "remove the reverb from the chords", "remove the chords reverb", "remove the melody's reverb" still turn the effect off and keep the part.
  - A half with no verb ("…and the bass") borrows the verb of the half before it.
  - An effect-off clause that names no part ("remove the reverb") only counts when no clause names this part.
- `src/maker.js` (Basic mode): before the effects rule, `removesPart` is checked.
  - "remove the melody, no reverb" now removes the melody. The reply says: "Removed Melody. I skipped the reverb change, because that part is gone."
  - "remove the melody and turn off the reverb" removes the melody. The reply says the reverb half was left out (it has no part to act on).
- `tests/smoke.mjs`: the fix-2 line now also checks AI "remove the melody and turn off the reverb" and Basic "delete the drums and kill the reverb" (`rmAI`, `rmBasic`).
- No change to `cloudflare/worker.js`.

**Before (fix 2) → after**, on a song with drums, bass, chords at 42% reverb, and melody:

| Sentence | AI path (fix 2 → fix 3) | Basic mode (fix 2 → fix 3) |
|---|---|---|
| remove the melody and turn off the reverb | reverb off on Melody → Melody removed | reverb off on Melody → Melody removed, reverb half skipped |
| delete the drums and kill the reverb | reverb off on Drums → Drums removed | reverb off on Drums → Drums removed |
| kill the reverb and delete the bass | reverb off on Bassline → Bassline removed | reverb off on Bassline → Bassline removed |
| remove the melody, no reverb | reverb off on Melody → Melody removed | reverb off on Melody → Melody removed |

These are unchanged: remove/take off/kill/get rid of the reverb (on or from) the chords, "remove the chords reverb", "remove the effects from the chords", "remove the reverb", "remove the chords", "delete the bass", "remove the drums and no reverb on the bass", "no reverb on the chords and remove the melody", "delete the drums and the bass", and "remove the melody without the reverb" (removes it, as on fix 1).

**How I tested**
- `check.sh`: CHECK OK, SMOKE OK, 69 checks; the fix-2 line returned `{"set":20,"add":52,"basic":20,"kept":true,"off":true,"rmAI":true,"rmBasic":true}`.
  - The first run failed the 2 song-reopen timing checks seen on fix 1 (UX files I didn't touch). The re-run passed at load 1-2.
- Tester's `t14-rm.mjs`: matches `t14-f1.out` on every row, except "remove the reverb" (Chords' reverb off, kept from fix 2).
- My `/tmp/qa/ai-8f3/t-f3.mjs`: 16 AI rows and 13 Basic rows, all as in the table, 0 page errors. The output is in `/tmp/qa/ai-8f3/t-f3.out`.
- Tester's `t12-fix2.mjs`: 52 rows, 48 the same. The 4 that differ are the intended remove rows.
- Tester's `t13-manual.mjs`: identical to fix 2.
- Tester's `t7-fix1.mjs`: 84 rows, 0 action changes (only id printing, random fills and reply truncation differ).
- Tester's `t1-words.mjs` (105 phrases): 0 action differences beyond id printing, and the same steps and Undo on every row. The one changes row that differs is a random melody note count.
