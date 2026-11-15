# AI-1 build brief (assistant-dev, Build mode) · 15 Nov 2026

Read `.claude/standards/dev-standards.md` first. The sections that matter most: "Production and assistant rules" (one element at a time; the new 14 Nov AI-1 lines), "How we build" (plain JS bundle, worker.js has no backticks and no `${`), "Quality bar" (check.sh passes, every change undoable, reply under ~8 s, every new action in Worker prompt + actions.js + maker.js + a smoke line).

## The job
Build AI-1 "Song sections by voice" as approved. The approved proposal is `.claude/work/proposals/AI-1.md` (read all of it, including "Lead notes" at the bottom). UX-1 (the Song view) is LIVE on `main`: `src/song.js` already has the shared layout (`PROJ.sections` with `kind`, `end`, `parts[trackId].without`), the helpers (`songTemplate`, `songAdd`, `songRemove`, `songMove`, `songResize`, `songRename`, `songSetPart`, `songMakeUnique`, `songNewPattern`, `songFind`, `songSummary`, `songEdit`, `songMode`, `songPlay`, `songLoop`, `songChip`, `SONG_TEMPLATES`), and it already calls `transitionEvents(section, drumsTrack)` from `songFlat` if that function exists. Use these; don't build a second layout.

## The owner's choices (gate 1, 14 Nov)
- D1: "make it a full track" = about 3 minutes (16-bar sections) unless the user says club, extended or DJ (then about 6 minutes, 32-bar sections).
- D2: "arrange it" / "make it a song / full track" arranges ONLY the parts that exist and the reply suggests adding bass or chords. It never adds parts by itself. (Your proposal's flow step 2 said Keys would add a missing part first: don't; suggest it instead.)
- D3: ship now with drum transitions (snare roll, gap/kick-drop before the drop, fill, crash). A "riser" request uses a snare roll plus crash and Keys says so in the reply.
- No owner note.

## Lead notes (already settled)
- One layout with UX-1 in `src/song.js`; one rule for "the break" when there are two (playing one, else last touched, else first). Use/extend `songFind` rather than a second finder.
- Transitions live with the song code so playback and MP3 export use them (songFlat already wires `transitionEvents`).
- One Undo: the chip in the song view. The reply bubble shows the mini song map without its own Undo.
- Re-measure reply timing; trim the prompt if a full-track request is over 8 seconds.

## Files you may touch
Your own: `src/assistant.js`, `src/actions.js`, `src/maker.js`, `cloudflare/worker.js`, `ARTISTS` in `src/groove.js`.
Explicit permission for this job: `src/song.js` (small additions only, e.g. a template length option, `findSection` behaviour, anything AI-1 needs from the shared layout; studio-ux-dev owns it, so list every change in your report), and about 8 lines of CSS in `src/head.html` for the mini song map (theme variables only, no hard-coded colours). `tests/smoke.mjs`: add your smoke lines (qa-tester will review them).

## How
- `git -C /home/claude/studio-keys-repo pull --rebase`, then `git checkout -b preview-ai-1 origin/main`. Commit WIP to `preview-ai-1` and `git push origin preview-ai-1` at sensible checkpoints (after the prompt + actions, after maker.js, at the end) so a machine restart loses nothing. Never push `main`.
- Keep worker.js free of backticks and `${`. You can't deploy the Worker; test the prompt with Llama: the lead deploys on release. If you have the Cloudflare connector (`mcp__cloudflare__execute`, account d9810812643ee32e2460689ca2ff73eb), call `/accounts/<id>/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast` with the new SYSTEM prompt (same settings as askLlama) and at least 12 requests from proposal section 4, and report them request by request with actions and timing. If you can't reach it, say so plainly.
- Rebuild with `python3 tools/build.py`; run `bash .claude/tools/check.sh` until CHECK OK (it takes a few minutes).
- Save your report to `/home/claude/studio-keys-repo/.claude/work/reports/AI-1-build.md` (short and honest: what changed by file, the owner's choices applied, song.js/head.html changes listed, Llama results, smoke results with numbers, what's left), commit it on the branch and push.
- Your final message: the report text, plus the branch head commit.
