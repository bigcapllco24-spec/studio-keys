# QA-1 daily session · 16 Nov 2026 (10:13 IST check-in) · qa-tester

Read `.claude/standards/dev-standards.md` first (Quality bar, How we work). Your role file is `.claude/agents/qa-tester.md`.

Daily session on the **live build (`main`)**. Work only in your own worktree `/home/claude/wt-qa-daily` (detached at origin/main; don't check out other branches there, never push `main`, don't commit).

**Main's product code has not changed since yesterday's session** (last release 14 Nov: UX-2, UX-5, SE-3). So don't repeat yesterday's paths. Read `.claude/work/reports/QA-1-daily-2026-11-13.md`, `-14.md` and `-15.md` first and don't refile anything in them or in the "Follow-ups noted" list of `.claude/board.md`. Also skip anything already fixed on a preview branch (AI-1 song sections by voice, AI-4 offline mixing words, AI-6 voice note → bassline / level words / straighter, AI-7 listening off, SE-7 key chip + key/chords of loops, SE-8 'another one' repeats, UX-4 phone layout, UX-6 install, UX-7 editor Delete/shortcuts, UX-8 loop button, UX-9 controller Play, UX-10 sung bassline stutter; UX-11 drum-sound mute is a design).

1. `bash .claude/tools/check.sh` (paste the summary).
2. About 20 minutes of real use like a producer, in headless Chrome (fake MIDI; fake mic from `tests/fixtures/sing.wav`), on paths the last three sessions covered least:
   - genres other than melodic house: techno ("drums like Charlotte de Witte", 130+ bpm), hip-hop / lo-fi (~85-90 bpm), afro house, drum & bass (~172) — does tempo, swing and kit fit the words?
   - the mixer and per-track FX: faders, mute/solo, EQ, sends, sidechain; does the master stay below 0 dBFS and around a sensible LUFS after big changes?
   - songs manager: several songs, rename, duplicate, delete one, reopen the others (nothing lost or mixed up);
   - playing the keyboard with fake MIDI while the beat runs: record into a track, quantize, undo/redo a long chain (20+ steps);
   - typing to Keys in unusual but natural ways (questions, Hinglish, two requests in one sentence, typos) in Basic/offline mode.
   Listen with numbers (peaks, LUFS where you can). Check 390 px once.
3. File only **real, new** bugs (steps, expected, actual, severity) and **at most 3** improvement ideas that aren't already in HQ requests (Capture MIDI, variation history, song builds energy, Extended mix, Drop as a variation, export section, 'another one but keep', scale mode).

Save your report as you go to `/home/claude/wt-qa-daily/.claude/work/reports/QA-1-daily-2026-11-16.md` (the lead files it). Also write `/home/claude/wt-qa-daily/.claude/work/reports/QA-1-daily-2026-11-16.json` with `{"bugs":[{"area":"assistant|studio|engine|controller|other","text","steps","severity"}],"ideas":[{"area","text"}]}`. Verdict first in the report, then bugs, rough edges, numbers. If you find nothing new, say so plainly; that's a fine result. Final message: the report text.
