# SE-7b+7c re-check after fix 1 · qa-tester · 15 Nov 2026 (22:13 IST check-in)

Read `.claude/standards/dev-standards.md` first (Quality bar; UI checked at 1400, 390 and 360 px). Your role file is `.claude/agents/qa-tester.md`.

Re-check of branch `preview-se-7bc` (head a789219) after fix 1. Your first check (`.claude/work/reports/SE-7bc-test.md`) was NOT READY. Fix 1 is in three parts, each with a "Fix 1" section in its report on the branch: engine `.claude/work/reports/SE-7c-engine.md` (drum clips read "No key in this clip", drum-only beats in a song read no chord, loop chords voted over all repeats, Put re-uses Keys' own Chords track instead of "Chords 2"), assistant `SE-7c-ai.md` (song names with "drive" no longer turn into a Drive effect, "what key is night drive in" answers about the dropped-in song, honest reply to "copy the melody of this song", one undo step per request), studio `SE-7c-ux.md` (playhead behind the song card and FX panel, toast placement with the phone chord fixer). Approved design: `.claude/work/proposals/SE-7.md`.

Work only in your worktree `/home/claude/wt-se-7bc-qa` (local branch `se-7bc-qa` on `preview-se-7bc`; never check out other branches, never merge main). Your scripts from the first check are in `.claude/work/se7bc-qa/`; the engine dev re-rendered your songs into `/tmp/qa/se7bc/songs/` (re-render with `render.mjs` if missing).

1. `python3 tools/build.py` then `git status`: `index.html` must be unchanged. Then `bash .claude/tools/check.sh` (any FAIL blocks; the SE-7 import undo check and save/reopen are load-sensitive: rerun once). The engine dev suggests calling `undoBoundary()` before `uploadFile` in the SE-7 import check: add it if it is right.
2. Re-test each of your bugs 1-5 and the "Chords 2" rough edge with your original steps. Drum loops in all 6 styles must read "No key in this clip" with no Put/Set-key buttons; night-drive must read Em · C · G · D.
3. Regression pass, like a producer, about 20 minutes: songs with music still get the right key (run `node tests/keys.mjs --quick`, and the full run if time allows), Put into another key and into a song with no key, Set my key, chord fixer, Play with the strip, save and reopen, the typed phrases from SE-7c-ai.md. A part you played or sang must never be changed by Put. Nothing copies a song's melody.
4. Cheap smoke lines for the fixes (commit and push to `preview-se-7bc`, never product code, never `main`).
Keep it to about 45 minutes. Save files as you go.

Report to `.claude/work/reports/SE-7bc-retest.md` on the branch (commit and push). Verdict first: READY or NOT READY, then bugs (steps, expected, actual, severity), rough edges, numbers, and 4-6 try steps written for a musician (what to drop in, what to say or tap, what they should see and hear). Final message: the report text.
