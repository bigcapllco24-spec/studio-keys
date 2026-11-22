# AI-14 · branch check · qa-tester · 22 Nov 2026 (16:13 IST check-in, ~18:10)

Read `.claude/standards/dev-standards.md` first (Quality bar; Owner rules from 19 Nov: a comment about one element changes ONLY that element; Production rules: one element at a time). Follow `.claude/agents/qa-tester.md`.

## What to test
Branch `origin/preview-ai-14` (head 2c6a876), built on `preview-ai-9` (5210af0, already READY on your re-check 8). The developer's report: `.claude/work/reports/AI-14-build.md` (causes, fixes, Llama results, 8-step Try list, known limits). It fixes your bugs qa-2026-11-22-1,2,3,4,6,7,8 (steps in `.claude/work/reports/QA-1-daily-2026-11-22-bugs.json`) plus offline "set the key to F sharp minor".
Note: the developer CHANGED one of your existing smoke lines: the AI-1 "Hinglish with the verb last" line used to expect "drop ke baad break daal do" to add a second break right next to the existing one, which is exactly bug 6. It now expects Keys to say the break is already there. Judge whether that's right and say so.

1. `bash .claude/tools/check.sh` on the branch (any FAIL blocks; a known timing flake under load: rerun once and say so). The steadier smoke test is on `preview-qa-2` (ac0b714); you may also run a local merge of preview-ai-14 + preview-qa-2 to get a reliable run (don't push that merge).
2. Each of your 7 bugs, word for word as you filed them, plus 4-6 fresh variants each that you write yourself (not the developer's), offline (Basic mode) on branch vs main vs preview-ai-9. Spoken phrasing: no punctuation, some Hinglish.
3. The live-AI path: replay the mocked-AI actions the developer lists (and Llama-style mistakes: add_bass for "bring the bass in at the build", sing for "mute the voice note", add_melody for "pan the melody left", groove for "make the drop bigger") and check the executor does the right thing.
4. Regression: AI-9's whole set (your r6/probe6/full/hq6 sets and re-check 8's 30 phrasings if still on the machine under /home/claude/qa/ or /home/claude/reports/) must not get worse. Plus 15 minutes of normal producer use on the branch (beat by reference, bass, chords, sing a part, make it a song, undo, save/reopen).
5. Undo: every fix is one undo step.

## Rules
Report only; never change product code. Save to `/home/claude/reports/AI-14-test.md` as you go. Verdict READY / NOT READY with ranked problems (each with exact words said, expected, actual), a before/after table, and anything the owner should know. If NOT READY, give the developer a short fix list.
