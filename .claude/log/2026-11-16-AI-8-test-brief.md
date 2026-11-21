# AI-8 test brief — qa-tester (branch check before gate 2)

Read `.claude/standards/dev-standards.md` first.
Item: AI-8, Basic-mode (offline brain) fixes from your 16 Nov daily session (bugs 3-7: afro house, unsolo/unmute, quantize, two requests in one sentence, artist names), plus typo words. Branch `preview-ai-8` (head 5104b88; built on preview-ai-6, which includes AI-4), worktree `/home/claude/sk-ai-8` (read-only for you). Developer report: `/home/claude/studio-keys-repo/.claude/work/reports/AI-8-build.md` (phrase table inside). Two Worker prompt lines changed (deploys at release; the live AI isn't testable here).

Do:
1. `bash .claude/tools/check.sh` in the worktree (paste the summary line). The developer saw different UX timing checks fail in 3 of 7 runs under load (velocity drag, relaxed double-click, Undo after opening a song).
2. Focused test like a user in Basic mode: your own phrasings (not the developer's table) for each of the five bugs, including the exact ones from your daily report; two-part sentences of your own (mix, mute/solo, tempo + add, add + vary) and sentences that must stay one request ("drums with hats and claps", "drum and bass beat", "rock and roll"); one Undo takes a two-part sentence back; quantize grids (1/8, 16ths, triplets) on a part you played with fake MIDI; artist echo ("like Black Coffee", "lofi hip hop", an artist not in the table); typos. Make sure nothing that used to work broke: the AI-4/AI-6 phrases, "another one", sing a bassline.
3. No console errors.
Load note: three branch checks run in parallel on this machine, so Chrome timing checks can be flaky. If check.sh has a FAIL, re-run it once; if the same check fails twice, run it on a main worktree too (`git worktree add --detach /tmp/qa-main-<item> origin/main`) and say whether main fails the same way. A FAIL that only appears on this branch twice blocks.
Verdict READY or NOT READY with numbered bugs (steps, expected, actual). Save the report as you go to `/tmp/reports/AI-8-test.md`. Short and plain. Final message: the report.
