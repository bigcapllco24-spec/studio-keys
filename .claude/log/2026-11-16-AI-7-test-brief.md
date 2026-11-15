# AI-7 test brief — qa-tester (branch check before gate 2)

Read `.claude/standards/dev-standards.md` first.
Item: AI-7, bug fix "Keys keeps listening after you turn it off" (owner request 15 Nov). Branch `preview-ai-7` (commit 1800bb9), worktree `/home/claude/sk-ai-7` (read-only for you; don't commit product code). Developer report: `/home/claude/studio-keys-repo/.claude/work/reports/AI-7-build.md` (and its test script `/tmp/reports/AI-7-listen-test.mjs`).

Do:
1. `bash .claude/tools/check.sh` in the worktree (any FAIL blocks; paste the summary line).
2. Focused test like a user, in headless Chrome with the fake mic (`tests/fixtures/sing.wav`) and a fake SpeechRecognition (count live recognisers, end every ~300 ms like Chrome): turn Always listening on then off — mic released (MIC.on false, tracks ended), no recogniser alive 1-2 s later, orb idle, a fake "Keys add drums" after off does nothing; fast on/off/on/off; humming box off while listening; Mic button mic survives listening off; listening off during a sung take (take still records, mic closes at the end); reload starts with listening off. Compare with main where useful.
3. Regressions: singing a bassline through Keys (sing action → take) still works with listening on and off; the orb one-tap request still works; no console errors.
Verdict READY or NOT READY with numbered bugs (steps, expected, actual). Save the report as you go to `/tmp/reports/AI-7-test.md`. Short and plain.
