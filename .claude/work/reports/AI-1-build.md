# AI-1 build report (assistant-dev) · 15 Nov 2026
Branch `preview-ai-1` (from origin/main e2bddbb). `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK 51 checks** (47 before + 4 new AI-1 checks).

## What changed
- **src/actions.js**: five new actions plus `transport.from`:
  - `arrange` (template full / club / short / custom, plus ref and minutes)
  - `section` (add, remove, length, move, duplicate, rename)
  - `parts` (in, out, only, vary; kick, hats, clap, snare and perc switch inside the one drums track through `without`)
  - `transition` (snareroll, riser, fill, kickdrop, crash, none)
  - `loop_section`
  - Supporting pieces: style-family templates (electronic, pop, hip-hop, DnB), artist shaping (`songShape`), default transitions (`songAutoEnds`) and scaling to a length in minutes.
  - `transitionEvents(section, drums)` gives the roll, fill and crash (the crash lands on the next downbeat). `transitionCut(section, track)` takes out the kick and bass in the kick-drop bar, then everything on the last beat.
  - `runActions` changes:
    - song edits wait in memory (`SONG.batch`) and are saved once, so one request is one undo step;
    - `arrange` runs after the parts in the same request, and playback runs last;
    - the song view flashes the changed sections and shows one Undo chip for the whole request;
    - `BATCH.notes` holds what the executor knows and the AI doesn't (a clamped length, a riser played as a roll, missing bass or chords).
  - Guards:
    - with a known artist, an instrument the user didn't say is ignored on add_bass, add_chords and add_melody;
    - a crash sent after a roll on the same section keeps the roll;
    - `remove` with a section name (Llama sent "remove the second drop" as a track) does nothing, and the section action removes it.
- **src/maker.js**: `songBrain()` runs before the old rules, so "8-bar intro" is a section and "make the loop 8 bars" is still the loop. It understands:
  - "X then build up and drop"
  - "full / club / extended / short track", "arrange it", "make it N minutes"
  - "make the X longer / shorter / N bars"
  - "add a (second) X", "after / before the Y"
  - "remove / duplicate / move / rename the X"
  - "take / drop / bring / only P in the X"
  - "make the X different"
  - "riser / roll / fill / crash / silence before the X"
  - "loop the X", "play from the X", "play the whole song"
  - Hinglish: lamba, chhota, hata do, daal do, se pehle, ke baad, dusra
  - If the song has no layout yet, it answers honestly. I compared 44 everyday phrases against main's parser on an unarranged song: identical output.
- **src/assistant.js**:
  - `projectState().arrangement` comes first in the state (`songSummary()`, for example `1 Intro 16 [drums-clap-snare] >fill 1 | … · 96 bars · 3:06 · Song mode`).
  - Executor notes are added to the reply.
  - The reply bubble shows a mini song map: blocks sized by bars, changed sections outlined in `--signal`, short names (In Bu D1 Br D2 Ou) when there are more than 4 sections. It has no Undo of its own; the song-view chip is the only Undo.
  - `nextStep()` suggests song moves once the song has a layout.
- **cloudflare/worker.js**: new SONG ARRANGEMENT block, the "full track" rule (arrange, never add parts), and two examples. The prompt grew from 11,768 to 15,206 characters. It has no backticks or `${`.
- **src/groove.js** (`ARTISTS`): a new last field `arr` on 12 rows (about 30 artists) for how each one arranges: Böhmer, Bodzin, Lane 8, Yotto, Tale Of Us, Anyma, Afterlife, Rüfüs, Monolink/Nora En Pure, Fisher group, Charlotte de Witte group, Boris Brejcha. Each hint sets the parts in the intro, build and break, a longer intro or break, the lead only in the drops, the transition into the drop, roll length and a gap.
- **tests/smoke.mjs**: 4 AI-1 checks (see below).

## The owner's choices, as built
- **D1.** "full track", "make it a song" and "arrange it" give 16-bar sections (electronic: 96 bars, 3:06 at 124). The 32-bar club layout (192 bars, 6:12) only comes when the user's own words say club, extended, DJ or 6 minutes. If Llama sends `club` without those words, the executor uses the full length.
- **D2.** `arrange` only arranges the tracks that exist. A missing bassline or chords become a spoken suggestion (executor note, unless the AI already said it). It never adds a part. On an empty song, "make a full track like X" is vibe + drums (the existing "track like X" rule) and then arrange.
- **D3.** Drum transitions only:
  - snare roll (it speeds up, last beat in 32nds)
  - fill (snare 16ths into a tom run)
  - kick drop (no kick or bass for the last bar, then one beat of silence)
  - crash on the next downbeat
  - A "riser" is stored as `riser` (a roll plus an open-hat swell and a crash, so it can become a real riser later), and Keys says "Risers aren't in the studio yet, so it's a snare roll with a crash." A filter sweep becomes a fill, and Keys says so.
- **Lead notes.**
  - There is one layout and one finder: `songFind` was extended.
  - Transitions live in the song code, so playback and the MP3 use them.
  - The song-view chip is the only Undo.
  - Timing was re-measured (below); the prompt wasn't trimmed, because every request stayed under 8 s.

## Changes in studio-ux-dev's files (permission in the brief)
**src/song.js**
1. `songEdit` has a batch mode: with `SONG.batch` set, it edits in memory and bumps `SONG.ver`, without its own undo boundary or save.
2. `songChip` stores its text instead of showing it while a batch runs.
3. `songFlat`:
   - transition notes play even when the drums are switched off in that section (a roll at the end of a break);
   - they may run up to 4 beats into the next section (for the crash);
   - only the first drums track plays them;
   - new optional hook `transitionCut` skips or shortens notes for the kick drop and gap;
   - new helper `songTry`.
4. `songSummary` shows `+gap`.
5. `songFind`:
   - a bare kind word ("drop", "the break") uses the playing / last touched / first rule even when a section is named exactly "Drop" (before this, "the drop" always meant the section named Drop);
   - it also understands "this", "last", "first" and "section 3".

**src/head.html**: 5 lines of CSS for `.as-map`, using theme variables only. The section colours come from the existing `.k-*` classes.

## Llama 3.3 test (Workers AI run endpoint, same settings as askLlama, new SYSTEM, real `projectState()` from the built page)
24 requests in total. All 24 gave usable actions after the executor guards. Times are from inside the Cloudflare sandbox: 1.5 to 6.2 s, mean 3.7 s, all under 8 s.

**Loop of Bodzin drums, bass, chords and melody (no layout)**

| Request | Actions | Time |
|---|---|---|
| "make an 8-bar intro, then build up and drop" | arrange custom [Intro 8, Build, Drop] | 5.7 s |
| "make it a full club track like Bodzin" | arrange club ref Bodzin, play | 4.1 s |
| "make it a full track" | arrange full (+ ref = the song's vibe, harmless), play | 3.2 s |
| "make the loop 8 bars" | bars 8, play | 2.6 s |
| "another one" | vary drums, play | 3.3 s |
| "let me sing the bassline" | sing bass | 3.0 s |

**Full track (Intro / Build / Drop / Break / Drop 2 / Outro)**

| Request | Actions | Time |
|---|---|---|
| "make the break longer" | section length break change 8 | 3.3 s |
| "take the kick out of the intro and bring the bass in" | parts intro out [kick] in [bass] | 2.5 s |
| "drop the drums in the outro" | parts outro out [drums] | 2.4 s |
| "make the second drop different" | parts "Drop 2" vary [Melody] | 3.1 s |
| "yaar drop se pehle thoda silence daal do" | transition Break kickdrop | 2.7 s |
| "add a riser before the first drop" | transition Build snareroll 2, then transition Build crash (guard keeps the roll) | 3.5 s |
| "loop the break" | loop_section break | 2.8 s |
| "play from the second drop" | transport play from "drop 2" | 1.5 s |
| "make the whole song about 4 minutes" | arrange minutes 4 | 2.6 s |
| "remove the second drop" | remove track "Drop 2" (guarded, nothing happens), section remove "5" | 6.1 s |

**Drums only (house)**

| Request | Actions | Time |
|---|---|---|
| "arrange it" | arrange full, play (reply doesn't name bass or chords, so the executor adds "There's no bassline or chords yet…") | 4.0 s |

**Empty song**

| Request | Actions | Time |
|---|---|---|
| "make a full track like Ben Bohmer" | vibe Böhmer, add_drums, arrange full, play | 6.2 s |

**Böhmer Intro 8 / Build 8 / Drop 16**

| Request | Actions | Time |
|---|---|---|
| "add a second drop" | section add name "Drop 2" after Drop (executor puts a break before it) | 3.9 s |
| "make the intro 16 bars" | section length intro bars 16 | 5.7 s |
| "add a 4 bar snare roll before the drop" | transition Build snareroll 4 | 5.6 s |
| "drop ko thoda lamba karo" | section length Drop change 8 | 5.4 s |
| "make it a club version" | arrange club | 2.6 s |
| "add a riser before the drop" | transition Build snareroll 1 + crash (roll kept, clamped to 2 bars, note added) | 3.9 s |

Llama's replies often offered a "filter sweep" as the next step. I added "don't offer risers or filter sweeps as a next step" to the prompt after the run; that one line hasn't been re-tested.

## Headless tests (offline parser, built index.html)
- **Proposal flow 1 to 10 through `handleRequest`.** Every change is exactly **1 undo step**. Loop and play requests are 0 steps, with a chip that has no Undo. "Undo that" reverts the last request. Results:
  - Intro 8 · Build 8 · Drop 16 (1:02)
  - Full track like Bodzin: 96 bars · 3:06 (Bodzin hints: drums-only intro, bass from the build, lead only in the drops, 2-bar roll plus a gap)
  - Break 16 → 24
  - Intro kick out, bass in
  - Outro drums out
  - Second drop added before the Outro
  - Drop 2 gets its own melody (pattern B, newly generated)
  - Hinglish silence → kick drop on the Break before Drop 2
  - Loop Break; play the whole song; play from Drop 2
- **Arrange + four generators in one request:** 1 undo step.
- **Section renders** (renderSongSpan, Bodzin full track, raw master before the MP3 normaliser): peaks −0.4 to −1.0 dBFS, no clipping. RMS about −6 to −7 dB in the drums sections and −23.7 dB in the pad-only break.
  - Kick drop at the end of the Build: bar before −6.3 dB RMS, kick-drop bar −9.7, last beat −19.4, last half-beat −33.4. That is measurably silent.
  - Same section with no transition: −6.5 on the last beat.
  - Kick drop at the end of a pad-only Break: only −28.5 vs −25.8, because the pad's release and reverb tails carry through. No new notes start in the gap (0 notes).
  - Snare roll: 64 snare hits in the last 4 bars of the Build, with a crash on the Drop's downbeat.
- **Screenshots:** reply bubble with the mini map at 1400×900 (Emerald) and 390×844 (Velvet). The map fits at phone width with short names, and the changed section is outlined.

## New smoke checks (tests/smoke.mjs; qa-tester please review)
1. "8-bar intro, then build up and drop" → Intro 8 · Build 8 · Drop 16, Song mode, map with 3 blocks, Undo chip, 1 undo step.
2. "full track" = 96 bars; "make the break longer" = +8; "drop the drums in the outro" = drums off; each 1 step.
3. "add a second drop" after the break → Break, Drop 2, Outro (+1 section). Hinglish silence → kickdrop with no notes in the gap. Two Undos go back.
4. "make the loop 8 bars" → `bars:8`. Arrange with four new parts = 1 undo step; Böhmer's layout is at least 96 bars because of his long break.

## For the lead
- **Worker deploy at release:** `cloudflare/worker.js` changed (prompt only). Until it's deployed, the test link uses the old prompt, so with the AI on, song requests won't produce the new actions there. Offline mode (local file, or the AI failing) uses the new parser.
- **New action names:**

  | Action | Fields |
  |---|---|
  | `arrange` | template, sections, ref, minutes |
  | `section` | do, section, name, bars, change, after, before |
  | `parts` | section, in, out, only, vary |
  | `transition` | section, before, to, bars, gap |
  | `loop_section` | section |
  | `transport` | new field `from` |

- **New global functions** for other developers: `transitionEvents`, `transitionCut`, `findSec`, `songFamily`, `songMapHTML`.

## Known limits and differences
- **Parts added after arranging.** A part added after arranging ("add a bassline") follows UX-5's rule: it plays only in the selected section. Arranging selects the first drop or chorus, so a new bassline lands in the drop and the UX-5 toast says so; the user can say "bring the bass into the build". If the owner wants added parts placed by section kind (bass in builds and drops), that needs a UX-1/UX-5 decision; I didn't change the shared rule.
- **Gap at the end of a pad-only break.** It is quieter but not silent, because of release and reverb tails (numbers above). A real silence would need the engine to cut tails, or a 2-beat cut on pads.
- **"Riser" and "filter".** "Riser" is a roll plus an open-hat swell plus a crash; "filter" is a fill. Both wait on sound-engine work.
- **Pop and hip-hop.**
  - The "club" length for these styles is scaled to about 6 minutes.
  - Hip-hop transitions are kick drops without a crash.
  - These templates haven't had a musical listening review.
- **"Make it N minutes"** snaps sections to 8 bars and spreads the rounding, so the result is close to, not exact (4 min asked → 4:08, 2.5 → 2:35, 5 → 4:54).
- **Not changed:** `vary` and the other generators still change a part's main pattern, so every section using it follows. Sections with their own version (B) keep it.

## Fix 1 (15 Nov 2026, after the tester's NOT READY)
`bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK 52 checks** (the tester's new gap check passes: `{"rollGap":0,"kickdrop":"kickdrop:0"}`).

### 1. The beat of silence before a drop is now quiet
- `src/song.js` `songFlat`: a cut (gap, kick drop) starts 1/16 beat early (`SONG_EARLY`), so the kick, snare and clap the SE-3 drummer feel pushes 10-25 ms early no longer start just before the gap. Same tolerance for transition notes.
- `src/actions.js` `transitionCut`: with a roll + gap, the kick also sits out the beat before the gap. The Deep Techno kick rings 1.39 s (about 3 beats at 124), so the beat-3 kick filled the gap even with no new hits in it. The roll itself was not the cause (ending it half a beat earlier changed the gap by under 1 dB).
- Renders (Bodzin loop, "make an 8-bar intro, then build up and drop", end of the Build, the tester's own script, two runs):

  | Ending | Beat before | Gap beat | Second half of gap |
  |---|---|---|---|
  | Roll + gap, before | -7.2 | -5.6 | -5.7 |
  | Roll + gap, now | -10.5 | -21.4 | -32.3 |
  | Kick drop, before | -13.5 | -19.7 | -34 |
  | Kick drop, now | -18.3 | -31.2 | -39.7 |
  | No transition (reference) | -6.5 | -6.3 | -6.6 |

  RMS dB. Roll + gap: the gap is 11 dB under the beat before and 15 dB under the bar's music. Only notes were removed, so peaks can't rise.
- **Tails (not done, not my files):** drum voices are one-shots and the scheduler ignores their note end. A choke would get the gap lower still and would let the kick play on beat 3 again. Simulated in the page: roll + gap -21.6 / -53 dB (with the beat-3 kick), kick drop -30.2 / -53. What it needs (studio-ux-dev, `src/studio.js`): in `scheduleEvent` and in `renderSongSpan`, when the voice is a one-shot and the song note carries a cut time, call `v.kill(t + cut * secondsPerBeat)` (`Voice.kill` in core.js already fades in 6 ms). `songFlat` could then mark notes before a gap with `cut` (beats to the gap). Optional; the current numbers meet the brief.

### 2. Prompt no longer offers risers (`cloudflare/worker.js`)
- The example reply is now "Want a snare roll into the drop?". The suggestion rule says what to offer on an arranged song (snare roll, fill, beat of silence, longer break, different second drop, part in or out). New song rule: taking a part out of one section is `parts` with `out`, never `mix mute`. Prompt 15,612 characters (was 15,206). No backticks or `${`.
- Llama runs (run endpoint, askLlama settings, sha256 of SYSTEM checked against the file):
  - Run A (example fixed only): 10 requests, 0 riser offers, 2 filter-sweep offers; "drop the drums in the outro" came back as `mix mute Drums` (whole song).
  - Final prompt (sha256 0e08605f…): 16 requests, 0 riser offers, 6 filter-sweep offers ("Want a filter sweep into the second drop?"). Llama keeps reaching for a filter sweep even with the rule; naming it more often made it worse. All actions usable: break ±8, intro bars 16, outro drums out (as `parts` both times, plus the Hinglish one), arrange club / full, arrange minutes 4.33, section remove "Drop 2", parts intro out kick, riser → snareroll 4 + crash. 2.2 to 10.8 s, mean 4.3 s (two club / add-drop calls over 6 s).
- So the app guards it (`src/assistant.js` `handleRequest`): unless the user said riser or sweep, a question in the AI's reply offering a riser, uplifter or (filter) sweep is replaced with "Want a snare roll into the drop?" (removed when there's no layout). Checked with Llama's real replies through `handleRequest`: "Want a filter sweep into the second drop?" becomes "Want a snare roll into the drop?"; the explicit riser reply and "more DJ filter" are left alone.
- Executor guard (`src/actions.js` `mix`): a mute or unmute while the user's words name a section ("in the outro", "outro mein", "from the intro") becomes `parts` out / in for that section. "mute the drums" still mutes the whole track.

### 3. Offline Hinglish with the verb last (`src/maker.js` `songBrain`)
All 9 of the tester's phrases now work offline through `handleRequest`, 1 undo step each:
- "drop ke baad break daal do" / "drop ke baad break add karo" → section add break after drop; "intro ke baad break daal do" → Break 2 after the Intro.
- "dusra drop add karo", "ek aur drop daal do", "second drop daal do" → Break 2 + Drop 3 before the Outro.
- "break ko loop karo" → looping Break; "drop 2 se play karo" → playing from Drop 2 (cursor at beat 256).
- "outro mein drums mat bajao" → Outro: drums out (`mat`, `band`, `nahi`, `bina` are "out"; `bajao`, `chalao` are "in").
- Still fine: "intro mein bass daal do", "intro se kick hata do", "break ko lamba karo", "yaar drop se pehle thoda silence daal do", "make the loop 8 bars".

### 4. Typed wake name (`src/maker.js` `localBrain`)
A leading "Keys," (or "hey Keys", or "Keys make/add/…") is stripped before parsing. "Keys, make an 8-bar intro, then build up and drop" → Intro 8 · Build 8 · Drop 16 (1:02). "Keys, add a bassline" → add_bass.

### 5. "Make it longer / shorter" offline
On an arranged song, "make it longer", "make the song longer", "song ko lamba karo" → `arrange minutes` = current rounded + 1 (3:06 → 4:08); "make it shorter" → current − 1 (3:06 → 2:04), or half for songs under 1.5 minutes. Same action Llama sends. On a plain loop it is unchanged (not understood, as on main).

### Also fixed
- Offline replies no longer repeat the missing-part suggestion: "There’s no bassline or chords yet: want them? Say “add a bassline”." and no second "Bassline next?". Grammar: "There are no chords yet: want some?" / "There’s no bassline yet: want one?".
- "move the break after the first drop" when it's already there: "Break is already after Drop.", no chip, 0 undo steps.
- The offline "Shape the song" tip now changes between requests and only offers what fits the layout (no "add a second drop" when there are two; no "drop the drums in the outro" when they're already out).

### Not changed
- "add a break" on a plain loop still opens the song with the break; Llama's "add a second drop" names the new one Drop 3 when Drop 2 exists (the executor names it in order). Both as the tester described.
- Smoke: no new lines (the tester's gap check covers fix 1). Suggested for the tester: one offline line for "drop ke baad break daal do" + "outro mein drums mat bajao", and one for "make it longer" on a 96-bar song (→ about 4 minutes).
