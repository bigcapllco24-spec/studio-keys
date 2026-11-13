# AI-4 build brief (assistant-dev) · 13 Nov 2026 · bug fixes, no design gate

Read `.claude/standards/dev-standards.md` first. Sections that matter most here:
- **Quality bar**: `bash .claude/tools/check.sh` passes; the reply says what changed in musical words; every new action exists in the Worker prompt, `actions.js` and `maker.js`.
- **Production and assistant rules**: one element at a time, only what was asked; "add a choir / melody / flute" adds a NEW track, replacing a part only when the user says replace or change; keep the song's vibe.
- **How we build**: keep `cloudflare/worker.js` free of backticks and `${`.

You are assistant-dev: follow `.claude/agents/assistant-dev.md`. Your files: `src/maker.js`, `src/actions.js`, `src/assistant.js`, and `cloudflare/worker.js` only if the prompt really needs it (say so in the report: a Worker change has to be deployed at release and isn't active on the test link). Plus `tests/smoke.mjs` for new checks. Rebuild `index.html` with `python3 tools/build.py`.

Work in the worktree `/home/claude/sk-ai-4` (already on branch `preview-ai-4`, made from `main`). Don't touch `/home/claude/studio-keys-repo` or other worktrees: studio-ux-dev works in `/home/claude/sk-ux-2` at the same time. `check.sh` writes fixed files in /tmp (`/tmp/sk-bundle.js` etc.): if a FAIL looks like a clash with the other run, rerun it. Save WIP commits and push the branch (`git push -u origin preview-ai-4`) after each fix. Never push `main`.

**Keep the diff small and local.** `preview-se-3` (drummer feel, waiting for the owner) changes `src/maker.js` (swing words), `src/actions.js` and one line of `cloudflare/worker.js`; whichever releases second is merged onto the other, so touch only the lines these fixes need.

## The bugs (tester's daily session; full report `.claude/work/reports/QA-1-daily-2026-11-13.md`; the tester's scripts in `/home/claude/bugs/qa-2026-11-13/js/`)

1. **The assistant's own hint "turn … into a bassline" fails in the offline brain.** Import a voice memo or record a voice note, then type the phrase the assistant suggests:
   - "turn New Recording 3 into a bassline" replaces the existing Bassline with a new random one;
   - "turn hook idea into a bassline" replaces the Bassline and also adds a Melody track;
   - "turn the voice note into a bassline" records a NEW voice note from the mic;
   - "turn sing into chords" starts a chords singing take.
   Should: transcribe that audio track into notes (the "Turn into notes…" dropdown does it right). Tester's diagnosis: `localBrain` in `src/maker.js` checks the voice-note regex and `singRole` before the transcribe regex, and the transcribe regex only accepts `voice note|voice|recording|audio|vocal|it` right after the verb, so a track name falls through to `vary` (the word "new") or `add_bass`/`add_melody`. Fix: check transcribe first when the sentence is "turn/convert/make <X> into a bass/chords/melody/notes" and an audio track exists; match `<X>` against audio track names (case-insensitive, partial ok), "the voice note/recording/audio/it/that", and pick the named track (or the newest audio track). If `transcribe` can't target a named track today, add a `track` field in `actions.js` (and document it in the Worker prompt's transcribe line if it's missing there). Also check that the hint text the assistant shows uses a phrase that works.
2. **Mixing words rewrite the part instead of mixing it.** Drums like Ben Böhmer, "add a bassline", then "the bass is muddy", "clean up the low end on the bass", "cut the lows on the bass": each replaces the bass notes with a new bassline; FX don't change (low cut stays 28 Hz). "the mix is muddy" gets "I couldn't turn that into a change". Should: change that part's EQ / low cut (for "the mix": the low cut of the non-bass, non-kick parts), keep its notes, and reply in musical words ("Cleaned up the bass: low cut up to 45 Hz, less 250 Hz"). Cover muddy, boomy, boxy, low end, lows, harsh, bright/too bright, thin, dull. Tester's diagnosis: the FX regex in `src/maker.js` has none of these words, so the request reaches `add_bass`. Use the existing FX actions (`fx` / EQ actions in `actions.js`); add one only if nothing fits (then Worker prompt + actions + maker).
3. Look at the Worker prompt: does the live AI already get "muddy / low end" and "turn <track> into notes" right? If the prompt clearly lacks guidance, add one short line each (no backticks, no `${`) and list it in the report; don't test the live model (you can't reach it).

## Tests
- Smoke checks in `tests/smoke.mjs`: "turn the voice note into a bassline" → `transcribe` (after the step that imports `sing.wav`), "turn <imported track name> into chords" → transcribe of that track, "the bass is muddy" → bass FX change and the bass notes unchanged, "the mix is muddy" → an FX change. Make sure "add a bassline", "let me sing the bassline", "record a voice note" and "another one" still do what they did.
- `bash .claude/tools/check.sh` must pass. Paste its summary.

## Report
Save a short report as you go to `.claude/work/reports/AI-4-build.md` (commit it on the branch): what you changed (files, functions), whether the Worker changed, how you tested (numbers), the head commit, anything left. Reply with the same text.

Commit messages end with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZAURt1FEme7E1HDXYnU
