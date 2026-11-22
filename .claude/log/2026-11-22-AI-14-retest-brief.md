# AI-14 · re-check after fix 1 · qa-tester · 22 Nov 2026 (~19:25 IST)
Read `.claude/standards/dev-standards.md` first; follow `.claude/agents/qa-tester.md`. Branch `origin/preview-ai-14` head 1faba80 (fix 1 on top of 2c6a876). Developer report: `.claude/work/reports/AI-14-fix1.md`; your first check: `.claude/work/reports/AI-14-test.md` (scripts in /home/claude/qa/ai14/).
1. check.sh on the branch (and a local merge with origin/preview-qa-2; don't push it).
2. Rerun all your sets (bugs.js, ai.js, nb.js, ai9.js) on 1faba80 vs 2c6a876 vs main: never worse on any case.
3. Your 5 problems from the first check, word for word, plus 3-4 fresh wordings each that the developer hasn't seen (spoken phrasing, some Hinglish). Note the developer kept a lone "left" as a pan (a lone "right" is now yes): judge it.
4. New behaviour to probe for side effects: two-part pans (`panMany`), "spread the chords wider" = width, "the melody is too far left", sing/hum/whistle clauses, "record a new one", the honest break/outro replies, the melody low cut at 0.85 × the lowest note.
5. 10 minutes of producer use on the branch; one undo step per change.
Report only, no pushes. Save to `/home/claude/reports/AI-14-retest.md`; verdict READY / NOT READY with ranked problems and a fix list if not ready.
