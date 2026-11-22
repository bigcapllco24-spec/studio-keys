# AI-14 · re-check 3 (final, focused) · qa-tester · 22 Nov 2026 (~22:50 IST)
Read `.claude/standards/dev-standards.md` first; follow `.claude/agents/qa-tester.md`. Branch `origin/preview-ai-14` head fb765f7 (fix 3 on 0903ad1). Developer report: `.claude/work/reports/AI-14-fix3.md`; your re-check 2: `.claude/work/reports/AI-14-retest2.md`.
About 25 minutes:
1. check.sh on fb765f7, and a local merge with origin/preview-qa-2 (a7bd0b2), not pushed.
2. Mud: your band.js / band2.js on main / 0903ad1 / fb765f7 (C3 melody, C4 melody, stray C1, two strays, own 300 Hz cut, full mix), plus 3 fresh mud wordings. A mud complaint must never let more low end in, and the reply must be true. Update your b8 check to the new rule (cut never lowered) if you agree, and say so.
3. Pan answers: "hard right", "right side", "hard left", "all the way left" after "pan the melody"; guards (lone "right" after a non-pan) hold.
4. Rerun bugs/ai/nb/ai9/rt on fb765f7 vs 0903ad1: never worse (apart from known take-timing flags; say which).
5. Your view, for the owner, on the developer's open question: on a melody down to C3 the fix holds the cut at the note, so "the melody is muddy" drops 110-220 Hz by only 0.7 dB (main 4.7 dB by cutting into the tune at 308 Hz). Is that acceptable for release, or does it need the "still muddy raises past the lowest notes, honestly said" step first?
Report only, no pushes. Save to `/home/claude/reports/AI-14-retest3.md`; verdict READY / NOT READY and a final 8-step Try list if READY.
