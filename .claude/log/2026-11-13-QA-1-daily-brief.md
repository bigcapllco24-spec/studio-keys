# Daily session brief (qa-tester) · 13 Nov 2026 · QA-1 · build on `main`

Read `.claude/standards/dev-standards.md` first. The sections that matter most today:
- **Quality bar**: `check.sh` passes, no console errors, every change undoable, the assistant's reply says what changed in musical words, no clipping, three themes from CSS variables.
- **Production and assistant rules**: one element at a time; the vibe is kept; while a part is sung only the drums play and the singer is never played back live; the raw sung recording is NOT added as a track (only explicit voice notes are audio tracks); "add a choir / melody / flute" adds a NEW track; the app opens a NEW empty project and old songs open from the past-projects list.

You are qa-tester: read `.claude/agents/qa-tester.md` and follow it as your role. You never change product code (`src/`, `cloudflare/`, `index.html`). You own `tests/**` and `.claude/tools/check.sh`; small additions to the smoke test are welcome if they lock in a bug you find (commit them on `main` only under `tests/` with a clear message; do NOT push, the lead pushes).

Repo: `/home/claude/studio-keys-repo`, branch `main` (the live build). Work only on `main`; leave `preview-*` branches alone.

## The job: the first daily session
1. Run `bash .claude/tools/check.sh` on `main` and paste its summary.
2. Then about 20 minutes of real use in headless Chrome (Playwright is pre-installed; fake MIDI and fake microphone from `tests/fixtures/sing.wav`, as the smoke test does). Use it like a producer who loves melodic house (Ben Böhmer, Stephan Bodzin, Afterlife):
   - Make a beat by reference with the assistant (typed requests go to the offline parser here, which is fine): "124 bpm drums with hats and claps like Ben Böhmer", then "another one" twice: is each one different? Does it keep the vibe?
   - Add one element at a time ("add a bassline", "add chords", "add a choir"): does each add exactly one new track and suggest the next step instead of adding more?
   - Sing a part over the beat (fake mic): a bassline, then chords. Do the notes land on a track, quantized? Is no raw vocal track added? Does the mic turn off after the take?
   - Edit notes in the piano roll: select, drag, copy/paste, velocity, Ctrl/Cmd multi-select of tracks, undo/redo. Per-track FX button.
   - Import a voice note (an audio file, e.g. `tests/fixtures/sing.wav`) and a MIDI file (`tests/fixtures/test.mid`).
   - Save, reload the page: a NEW empty project opens, and the saved song reopens from the past-projects list with everything in it.
   - Switch the three themes; check a tablet width (1024x768) and a phone width (390x844) for layout breaks.
   - Download MP3 / export: does it produce a file?
   - Watch the console the whole time.
3. Skip anything that needs the live AI, real speech recognition or Spotify login; say so in one line.

## What to hand back
Write your report to `/home/claude/studio-keys-repo/.claude/work/reports/QA-1-daily-2026-11-13.md` as you go (save after each part so a restart doesn't lose it), then reply with the same content:
- `check.sh` summary.
- **Bugs** (real ones only, ranked): for each, a one-line title, area (assistant | studio | engine | controller | other), severity (high / medium / low), exact steps, what happened vs what should happen, and the file or function you suspect if you can tell. Don't report anything that the UX-1 or SE-3 branches already fix (Song view, swing ladder) or SE-5 (sung parts not following swing), which is already on the board.
- **Ideas**: at most 3 improvement ideas, one line each with why a producer would care.
- One line on what you could not test.

Keep each step small and save files as you go.

Commit messages end with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZAURt1FEme7E1HDXYnU
