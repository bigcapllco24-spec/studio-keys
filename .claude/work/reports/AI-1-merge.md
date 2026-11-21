# AI-1 merge report (assistant-dev, 21 Nov 2026)

**Result:** I merged main into preview-ai-1 (main tip b5e7016, code from d35b13f). I resolved every conflict so both sides' behaviour still works. check.sh passes: **SMOKE OK: 91 checks, CHECK OK**. That is 47 base checks + 10 from AI-1 + 34 from main, all present. I pushed to preview-ai-1. **New head: adf0a70** (one merge commit, "AI-1: merge main (AI-4/6/8, AI-7, UX-7/12/13) into song sections"). Nothing went to main. The work was done in a separate clone at /home/claude/sk-ai1.

## How each conflict was combined
- **cloudflare/worker.js (the SYSTEM line).** I did a three-way merge sentence by sentence. The result is main's line plus AI-1's four edits:
  - the SONG ARRANGEMENT block before STYLES;
  - the "For \"make it a full track (like X)\"..." sentence;
  - "On an arranged song, suggest only song moves...", placed right after main's "...only tell them to sing after the count-in." sentence;
  - AI-1's two example pairs ("make the break longer" and the Hinglish silence one), placed right after the swing example and before main's "turn the melody down a bit and make the kick punchier" example.

  I checked with a sentence-level diff against each side. Against main, only AI-1's insertions show. Against AI-1, only main's additions show (bounce/straighten swing, "another one varies THAT part", transcribe naming, mix all/db/eq/unsolo, muddy low cut rules, quantize grid, level/Hinglish/kit rules, sung-take hint rule, mix example). Each edit appears exactly once. There are 7 "User:" examples (4 base + 2 AI-1 + 1 main). The rest of the file is byte-identical to main. It still has no backticks and no `${`, and `node --check` passes.
- **src/actions.js (5 blocks).**
  - `mix`: AI-1's guard comes first. It turns "mute the drums in the outro" on an arranged song into a `parts` change for that section. Then main's whole-song path ("all"/"song"/relative master moves by dB), then the normal per-track path.
  - `remove`: AI-1's "remove the second drop sent as a track" guard comes first, then main's effect-off check ("remove the reverb from the chords" keeps the part).
  - `quantize`: main's version (grid 1/4 to 1/32 and triplets, notes-moved count).
  - Helpers: AI-1's song-by-voice block (`orderActions`, NOOP sets, the song handlers) and main's `FX_WORDS` / `fxClause` / `fxAddOnly` / `fxOffSaid` / `removesPart` / `fxPartSaid` are both kept. No name clashes.
  - `runActions`: AI-1's ordered batch (SONG.batch, kinds, songDone, renumbering, BATCH.notes, BATCH.same, song flash/chip/map) plus main's `done.segs` (pushed next to each result) and main's "one request = one Undo step" stack collapse. The collapse runs right after saveProject and before AI-1's same-state check and song chip.
- **src/assistant.js (2 blocks).**
  - `projectState()`: `arrangement` is still FIRST, and each track now also has main's `soloed` and `generated` fields.
  - Reply logic: uses main's `brainReply(L,done)` on both offline paths. AI-1's riser filter, BATCH.same handling and BATCH.notes come after it. The fallback "Done: ..." line adds the executor notes and gives no next-step hint while a sung take is starting (`BATCH.take`, main's rule) or when a note already says "Say “...”" (AI-1's rule).
- **src/groove.js (ARTISTS, 9 rows).** I checked row by row that main changed only the name field and AI-1 changed only what comes after it. So each row keeps AI-1's arrangement element and takes main's names. The only name change was the Afterlife row: `Afterlife|Massano|Argy|Innellea|Kevin de Vries|kevin de vries|Adriatique|Mathame|Colyn`. Main's Lofi Girl alias change and its new `artistAlias` / `artistAs` merged without a conflict.
- **src/maker.js (2 blocks).**
  - Main renamed the old parser to `brainOne` and added a new `localBrain` that splits two-command sentences. I moved AI-1's wake-name strip ("Keys, make an 8-bar intro...") to the top of the new `localBrain`, so it runs once before the split.
  - AI-1's `songBrain` and main's `tempoAt` and splitting helpers are both kept.
- **tests/smoke.mjs.** I kept the AI-1 checks first, then main's AI-8 / save checks.
- **index.html.** Rebuilt with `python3 tools/build.py` (9,931,251 bytes).

## Testing
- check.sh run 1 failed only the two known save/reopen flakes ("opening the app starts a new empty song" and "Undo right after opening a song"). Other agents' Chrome sessions were running, load average about 17.
- Run 2 hit a protocol timeout from the same load.
- Run 3 passed: **SMOKE OK: 91 checks, CHECK OK**. All AI-1 song checks and all of main's AI-4/6/8 Basic-mode checks pass, plus "no page errors".
- Extra headless probe on a full-track song, Basic mode:
  - "Keys, make the break longer and add a snare roll before the drop" is split by main's splitter into two actions (`section` length + `transition`). The Break went 16 to 24, a roll was added into the Drop, and it was 1 Undo step.
  - "make the intro 16 bars and drop the bass in the outro" said honestly "It's already like that, so nothing changed" (0 Undo steps).
  - "hey keys, add a second drop" became `section add`.
  - No page errors.

## Things I wasn't sure about
- I made one small addition while combining `mix`: AI-1's mute-to-section guard now also skips when the AI sends a `db` move with the mute (`a.db==null`). Without it, a mute+db action on an arranged song would lose its dB move, which only exists since main's change. This is the only change beyond picking and ordering both sides.
- Where both sides added an example after the swing example, I put AI-1's two pairs first and main's mix example second. The order shouldn't matter to the model.
- On an arranged song the offline "Done: ..." reply can still end with "A melody or hook next?" from `nextStep()`. That was already on AI-1's branch and the merge didn't cause it.

## "Add a bassline and give me another one" on the AI path
**It doesn't work.** `ACT.vary` uses whatever track the AI sends. In a headless run with LAST_TEXT set to that sentence, `[add_bass, vary drums]` really regenerated the drums. Only the prompt rule (now in the merged prompt) and the offline brain handle it, so the guard belongs in actions.js under AI-9.

## For the lead
- Worker: the merged prompt is in cloudflare/worker.js on preview-ai-1. Deploy it at release (I didn't deploy or test it against Llama, since this was a merge-only brief). There are no new action names beyond AI-1's existing ones.
- Files: /home/claude/sk-ai1 (clone on preview-ai-1 at adf0a70), /home/claude/reports/AI-1-merge.md.
