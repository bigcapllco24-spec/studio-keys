# UX-1 · Build mode brief (studio-ux-dev) · 13 Nov 2026

Read `.claude/standards/dev-standards.md` first. The sections that matter most for this job: "Production and assistant rules" (the four new owner notes dated 13 Nov at the end of that list), "How we build", "Quality bar" (themes and CSS variables only, `saveProject` for every song change, performance), "How we work".

You are studio-ux-dev. Read `.claude/agents/studio-ux-dev.md` and follow it as your role.

## Where to work
- Worktree: `/home/claude/wt/ux-1` (branch `preview-ux-1`, already pushed). Work ONLY there; another developer is working in `/home/claude/wt/se-3` at the same time on `src/groove.js`, `src/maker.js`, `cloudflare/worker.js` and `tests/smoke.mjs` — don't touch those files.
- The lead already added `src/song.js` (empty) to `tools/build.py` PARTS after `studio.js`. You own `src/song.js`.
- Save as you go: after each build step below, run `python3 tools/build.py`, commit (`UX-1 WIP: <step>`) and `git push`. A machine restart must not lose work. End every commit message with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HCuZAQiMb134PWfp7hriKs
- Run `bash .claude/tools/check.sh` before your final commit (any FAIL blocks). It uses fixed files in /tmp (`/tmp/sk-bundle.js` etc.) and the other developer may run it at the same moment: if a FAIL looks like a clash (a file from the other branch), just rerun it.

## What was approved (gate 1, round 1)
Your proposal `.claude/work/proposals/UX-1.md` (read all of it, including "Lead notes" at the end). The owner's choices:
- Place: on the Tracks screen; a Loop / Song switch turns the track lanes into the timeline.
- Start: press **Make it a song** (or say it) to get a layout from your loop, then change it.
- Parts: one block per track per section (on or off, pattern A or B); free clips later.

## The owner's note (apply it — it changes the design a little)
> "old songs can be opened from the past projects lane but as default a new empty project opens up. we are not making it necessary to be 3 minutes or whole song - it can be just few elements - influencers use it to create music for their reels, musicians to create music and envision..."

What this means for the build:
1. **App opens on a new empty project.** Today boot restores the last project from `store` (`PROJ` in `studio.js`). Change it: on open, the last project is kept (saved into the songs list, `saveNamed`) and a new empty song starts. Past songs open from the songs list as today ("past projects"). Make sure nothing is lost: a song with tracks is always saved before the new one starts. Don't create empty junk entries in the songs list on every open.
2. **Songs don't have to be 3 minutes.** "Make it a song" offers lengths, not one fixed layout: **Short** (for a reel or a sketch, about 30 s: e.g. Intro 4 · Drop 8 · Outro 4 at the song's tempo, use the role table to switch parts) and **Full track** (the 6-part, 96-bar club layout). Show the length in bars and time for each option. One-section songs and songs with just a couple of elements are first-class: nothing in Song mode nags about length or forces a full arrangement. Keep `songTemplate('short'|'club'|[...])` as the API.

## Scope for this build (slice 1 as adjusted by the lead notes)
In: `song.js` model, migration and API (with the names agreed in the proposal's AI-1 table, so AI-1 can call them later); scheduler in Song mode (play from a bar, loop brace, song end); the Song screen on desktop and tablet (strip, parts toggle/preview/badges, ruler, playhead, Follow, zoom, move/resize/duplicate/rename/menu/⋯, flash and Undo chip, the core focus-scoped shortcuts: Space, Ctrl/Cmd+D, Delete, Ctrl/Cmd+L, + − W, Home); the phone song map (tap a section to loop it); editor patterns A / B / + New with the "plays in" line and Make unique; whole-song MP3 in chunks and MIDI; migration of old songs; the two owner changes above; `SONG_HOOKS`, `songAt`, `songSummary`, `songFind` for the sound engine and AI-1.
Out (slice 2): Loop-mode section jamming, the long shortcut list, ruler drag-loop, box-select across sections, energy line, stems zip of the whole song, free clips.
Voice commands: AI-1 (the voice side) is NOT approved yet, so don't add assistant actions. Just make `song.js` ready for it. The "Make it a song" button is the way in for now.

## Build steps (commit + push after each)
1. `song.js`: model, `migrateSong`, API, templates (short + club), `songFlat`, `songAt`, `songSummary`, `songFind`.
2. Scheduler (Song mode, loop brace, play from bar, end of song, Rec rule) + new-project-on-open.
3. Song screen (desktop/tablet), then the phone song map.
4. Editor patterns (A / B / + New, plays-in line, Make unique).
5. Whole-song MP3 (chunked) and MIDI.
6. Themes (all three), accessibility, tests: add your smoke checks to a list in your report for qa-tester (don't edit `tests/smoke.mjs`), plus your own headless checks with numbers (old song plays identically over 2 loops, template lengths, MP3 length/peak/RMS, scheduler tick time with 8 tracks × 192 bars, no long tasks over 50 ms).

## Report (write it to `/home/claude/reports/UX-1-build.md` as you go, and return the full text as your final message)
Short and honest: what you built per step, files touched (list any `body.html`/`head.html` changes), how you tested with numbers, the check.sh summary, the last commit hash on `preview-ux-1`, what's left or not working, and 4-6 "try this" steps written for a musician (no jargon) for the owner's test link. If you run out of time, say exactly which step you stopped in; the next check-in resumes from the branch.
