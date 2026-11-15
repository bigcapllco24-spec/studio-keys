# SE-7c engine part · 15 Nov 2026 (17:13 IST check-in) · sound-engine-dev

Read `.claude/standards/dev-standards.md` first. Sections that matter most: "How we build" (plain JS in the shared bundle, no modules/CDN, works as a local file, everything stays in the browser), "Quality bar" (one undo step per action; nothing over ~50 ms on the main thread without a toast or chunking), and "How we work" → Copyright (never copy a song's melody; chords are fine, the owner gave users a free pass to use the same chords). Your role file is `.claude/agents/sound-engine-dev.md`.

**Item SE-7, phase 7c, engine part only (Build mode).** Owner's approved choices (14 Nov): ship 7a first (on `preview-se-7`, waiting for him), then 7b + 7c on one test link; label "DJ key" (never "Camelot"); live mic later as 7d. His note: "If user wants the same melodies or chords, it lets them do it - the user has a free pass." Approved proposal: `.claude/work/proposals/SE-7.md` (section 2 C steps 6-10 and section 4 "7c"). Your 7b report with "What 7c needs" is `.claude/work/reports/SE-7b-build.md`.

Build now (your files only):
- `PROJ.chords` `[{b, d, root, q, conf, from}]` (b/d in song beats; `from`: "audio" | "user"), saved with the song; old songs without it behave exactly as today.
- `chordPlan()` follows `PROJ.chords` when present, including chords outside the key.
- Helpers, exported on the shared scope for the UI and assistant devs: `chordPcs(root,q)`, `chordName(root,q)` (from `anaChordName`), `parseChord("Bm"|"F#7"|"Esus4")`, `fitChordsToKey(chords, fromKey, toKey)` (shift through the relative mode, as in the proposal).
- `chordsFromAna(ana, {bars, to:"mine"|"song"})` → PROJ.chords converted from analysed beats to song beats (the song is assumed at the analysed tempo, use `t.start`), and a function that adds the **Chords** track (our own voicing and rhythm on the style's chord sound, never the song's audio), plus an optional "bass movement too" bassline on `ana.bassRoots`.
- `setChord(bar, chord)`: corrects one chord and rerolls the generated parts that follow the chords (bass, melody, chords tracks Keys made) with their own seeds; user-played/sung parts never move. One `saveProject` so one undo step.
- Smoke-test lines are qa-tester's file; describe in your report the 3-4 checks you want (F major chords + bass → new melody uses only F major notes; `chordsFromAna` adds a track; setChord is one undo).

Leave the UI (chord strip, song card, import hook) to studio-ux-dev and the assistant actions to assistant-dev; they build next on this same branch from your report, so write down every function name and its shape.

Work only in your worktree `/home/claude/wt-se-7bc` (branch `preview-se-7bc`, already checked out and tracking origin; don't check out other branches there, don't merge main). Rebuild `index.html` with `python3 tools/build.py`; `bash .claude/tools/check.sh` must pass (the save/reopen checks are load-sensitive: rerun once). **Save WIP commits and push `preview-se-7bc` at checkpoints** (never `main`), so a restart doesn't lose work. Keep each step small.

Write your report to `/home/claude/wt-se-7bc/.claude/work/reports/SE-7c-engine.md` (commit and push it): what you built (function names and shapes), how you tested, check summary, exactly what studio-ux-dev and assistant-dev must call. Final message: the report text.
