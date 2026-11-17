# QA-1 daily session · 17 Nov 2026 (10:13 IST check-in) · qa-tester

Read `.claude/standards/dev-standards.md` first (Quality bar, How we work). Your role file is `.claude/agents/qa-tester.md`.

Daily session on the **live build (`main`)**. Work only in your own worktree `/home/claude/wt-qa-daily` (detached at origin/main; don't check out other branches there, never push `main`, don't commit).

**Main's product code has not changed since 14 Nov** (last release: UX-2, UX-5, SE-3), and four daily sessions already covered it. So don't repeat earlier paths. Read `.claude/work/reports/QA-1-daily-2026-11-13.md`, `-14.md`, `-15.md` and `-16.md` first, and don't refile anything in them or in the "Follow-ups noted" list of `.claude/board.md`. Also skip anything already fixed on a preview branch (AI-1 song sections by voice, AI-4 offline mixing words, AI-6 voice note → bassline / level words, AI-7 listening off, AI-8 offline afro house / unsolo / quantize / two requests / artist names, SE-7 key chip + key/chords of loops, SE-8 'another one' repeats, SE-9 master ceiling, UX-4 phone layout, UX-6 install, UX-7 editor Delete/shortcuts, UX-8 loop button, UX-9 controller Play, UX-10 sung bassline stutter, UX-12 Save a copy undo / tempo undo / deleted song coming back; UX-11 drum-sound mute is a design).

1. `bash .claude/tools/check.sh` (paste the summary).
2. About 20 minutes of real use like a producer, in headless Chrome (fake MIDI; fake mic from `tests/fixtures/sing.wav`), on paths the last four sessions covered least:
   - Song mode end to end: "make it a song" from a loop, then move, resize, duplicate and delete section blocks, switch pattern A/B, play from a section, and export the whole song (WAV/MP3 length, silence at start/end, clicks at section joins);
   - import: a voice note / audio file (use the fixture) and a MIDI file if the app takes one; drag-in vs file picker; what happens with a very short or silent file;
   - sound presets and the Sound Lab: switch instruments on a playing part, change knobs while playing (zipper noise, stuck notes, CPU), stop/start many times;
   - long sessions: 8+ tracks, 64+ bars, play for 2 minutes; look at memory growth, timing drift between tracks, audio dropouts;
   - keyboard and controller: sustain pedal, pitch bend / mod wheel, octave shift, velocity curve, notes held across Stop;
   - first-time user: open the site fresh (empty storage), follow whatever the app shows first, and note anything confusing.
   Listen with numbers (peaks, LUFS, timing in ms where you can). Check 390 px once.
3. File only **real, new** bugs (steps, expected, actual, severity) and **at most 3** improvement ideas that aren't already in HQ requests (Capture MIDI, variation history, song builds energy, Extended mix, Drop as a variation, export section, 'another one but keep', scale mode, audition songs, master meter, Basic mode answers questions).

Save your report as you go to `/home/claude/wt-qa-daily/.claude/work/reports/QA-1-daily-2026-11-17.md` (the lead files it). Also write `/home/claude/wt-qa-daily/.claude/work/reports/QA-1-daily-2026-11-17.json` with `{"bugs":[{"area":"assistant|studio|engine|controller|other","text","steps","severity","owner"}],"ideas":[{"area","text"}]}`. Verdict first in the report, then bugs, rough edges, numbers. If you find nothing new, say so plainly; that's a fine result. Final message: the report text.
