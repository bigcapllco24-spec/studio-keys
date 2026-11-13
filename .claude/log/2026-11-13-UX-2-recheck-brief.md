# UX-2 re-check brief (qa-tester), 13 Nov 2026

Read `.claude/standards/dev-standards.md` first ("Quality bar").
UX-2 (studio fixes: Play on a new song, velocity lane visible + group drag, sung chords on the beat, phone width) was READY at 8417930. main has since shipped UX-1's Song view, and studio-ux-dev merged main into `preview-ux-2` (new head 373ff00; conflicts in daw.js, studio.js, smoke.mjs; report in `.claude/log/2026-11-13-UX-2-merge-report.md`).
Job: in your own clone (`git clone https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-qa && cd /home/claude/sk-qa && git checkout preview-ux-2`):
1. `bash .claude/tools/check.sh` (any FAIL blocks).
2. Focused test in headless Chrome: each UX-2 fix still works, in Loop mode AND Song mode (Play on a new song; velocity lane visible and group drag when the editor opens from a Song part / pattern B; sung chords snapped; 390 px and 360 px no sideways scroll, incl. the Song view). Then the Song view basics still work on this branch (Make it a song, part on/off + Undo, play from a bar, open editor from a part). Fake mic from `tests/fixtures/sing.wav`.
3. Verdict READY or NOT READY with numbered bugs (steps, expected, actual). Don't change product code; you may add smoke lines in tests/ and push them to the branch (commit message ending with the two attribution lines: "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" and "Claude-Session: https://claude.ai/code/session_01HCuZAS3jBVpAdHnYGDKkHc").
Save your report to `/home/claude/sk-qa-UX-2-test-b.md` as you go. Final message: verdict, bugs, check summary.
