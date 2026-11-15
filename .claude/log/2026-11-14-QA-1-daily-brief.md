# Daily session brief (qa-tester) · 14 Nov 2026 · QA-1 · build on `main`

Read `.claude/standards/dev-standards.md` first. The sections that matter most today:
- **Quality bar**: `check.sh` passes, no console errors, every change undoable, the assistant's reply says what changed in musical words, no clipping, three themes from CSS variables.
- **Production and assistant rules**: one element at a time; the vibe is kept; while a part is sung only the drums play and the singer is never played back live; the raw sung recording is NOT added as a track (only explicit voice notes are audio tracks); "add a choir / melody / flute" adds a NEW track; the app opens a NEW empty project and old songs open from the past-projects list.

You are qa-tester: read `.claude/agents/qa-tester.md` and follow it as your role. You never change product code (`src/`, `cloudflare/`, `index.html`). You own `tests/**` and `.claude/tools/check.sh`; small additions to the smoke test are welcome if they lock in a bug you find (commit them on `main` only under `tests/` with a clear message; do NOT push, the lead pushes).

Repo: `/home/claude/studio-keys-repo`, branch `main` (the live build). Work only on `main`; leave `preview-*` branches alone.

## What's new on main since yesterday's session
The **Song view** (UX-1, 50b6315): a Loop / Song switch on the Tracks screen, "Make it a song" (button or say it) builds a 6-part, ~3-minute layout from the loop, sections with one block per track (on/off, pattern A or B), play from a bar, loop brace, whole-song MP3 and MIDI export, Undo of "Make it a song". Today's session should spend most of its time here.

## The job: the daily session
1. Run `bash .claude/tools/check.sh` on `main` and paste its summary.
2. Then about 20 minutes of real use in headless Chrome (Playwright is pre-installed; fake MIDI and fake microphone from `tests/fixtures/sing.wav`, as the smoke test does). Use it like a producer who loves melodic house (Ben Böhmer, Stephan Bodzin, Afterlife):
   - Make a beat by reference with the assistant (typed requests go to the offline parser): "124 bpm drums like Ben Böhmer", "another one", then add a bassline and chords one at a time.
   - **Song view:** "Make it a song" (button and typed), switch Loop/Song, turn blocks on/off, switch a block to pattern B and edit B, play from a bar, loop a section with the brace, add a part while in Song mode, sing a part in Song mode, Undo/Redo through all of it, save and reopen a song that has sections, export the whole song as MP3 and MIDI (does the length match the layout?).
   - Sing a bassline over the beat (fake mic): notes land on a track, quantized, no raw vocal track, mic off after.
   - Edit notes in the piano roll (select, drag, copy/paste, velocity, undo/redo), per-track FX.
   - Import a voice note (`tests/fixtures/sing.wav`) and a MIDI file (`tests/fixtures/test.mid`).
   - Save, reload: a NEW empty project opens; the saved song reopens from the past-projects list with everything in it.
   - Three themes; tablet (1024x768) and phone (390x844) widths for the Song view.
   - Watch the console the whole time.
3. Skip anything that needs the live AI, real speech recognition or Spotify login; say so in one line.

## Don't re-report (already on the board or fixed on a waiting test branch)
- Yesterday's bugs (see `.claude/work/reports/QA-1-daily-2026-11-13.md`): Play doing nothing on a new song, velocity lane, choppy sung chords, double bassline, phone width (UX-2); offline brain misreading "turn X into a bassline" and "the bass is muddy" (AI-4); singing over a part you already have (UX-3); mix issues (SE-1).
- Song-mode sung part placement message (UX-5), phone layout (UX-4, a whole new phone layout is waiting), home-screen install (UX-6), swing and drummer feel (SE-3), sung parts not on the swung grid (SE-5), the key label showing "A minor" as a default / reading only melody tracks (SE-7).
- Already noted follow-ups: space bar play/stop, "...at 124" read as 122 bpm, 'Pattern for Intro: A' next to 'Pattern A plays only in Drop', a re-sung take moving to the bottom, newSong() opening in Loop mode, loop recording one undo step per note, sideways Keys chat 41 px tall on phones.
If a bug looks like one of these but is clearly different or worse, report it and say how it differs.

## What to hand back
Write your report to `/home/claude/studio-keys-repo/.claude/work/reports/QA-1-daily-2026-11-14.md` as you go (save after each part so a restart doesn't lose it), then reply with the same content:
- `check.sh` summary.
- **Bugs** (real ones only, ranked): for each, a one-line title, area (assistant | studio | engine | controller | other), severity (high / medium / low), exact steps, what happened vs what should happen, and the file or function you suspect if you can tell.
- **Ideas**: at most 3 improvement ideas, one line each with why a producer would care. Yesterday's ideas (Capture MIDI, variation history) are already filed; don't repeat them.
- One line on what you could not test.

Keep each step small and save files as you go.

Commit messages end with:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HCuZARJzRgFvLd7sGMPQuG
