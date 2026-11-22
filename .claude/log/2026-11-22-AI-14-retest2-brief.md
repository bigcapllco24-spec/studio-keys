# AI-14 · re-check 2 after fix 2 · qa-tester · 22 Nov 2026 (~21:35 IST)
Read `.claude/standards/dev-standards.md` first; follow `.claude/agents/qa-tester.md`. Branch `origin/preview-ai-14` head 0903ad1 (fix 2 on 1faba80). Developer report: `.claude/work/reports/AI-14-fix2.md`; your re-check 1: `.claude/work/reports/AI-14-retest.md` (builds/outputs in /home/claude/ai14r/, scripts in /home/claude/qa/ai14/; the developer's settle variant of rt.js is /home/claude/ai14g/rt-settle.js — fold a settle step into rt.js if you agree, so take cases don't leak mic state into the next case).
Keep it focused (about 30-40 minutes):
1. check.sh on the branch, and a local merge with origin/preview-qa-2 (a7bd0b2), not pushed.
2. Your two must-fixes word for word (+3 fresh wordings each): "pan the melody" → "right"; the melody low cut on mud complaints (stray C1, melody down to C2, own 300 Hz cut, plain C3 case). Judge the new rules (100 Hz floor, stray-note rule, only Keys' own 220 Hz cut may be lowered).
3. The cheap fixes 4-7 (width words, mute + hum/gaane do, drop two/three, "melody left, chords right") with 2-3 fresh wordings each, and their guards ("add a wide pad", "record a new voice note", "mute the voice note" alone).
4. Rerun all sets (bugs, ai, nb, ai9, rt) on 0903ad1 vs 1faba80 vs main: never worse on any case (separate real regressions from take-timing harness flags, and say which).
5. 5 minutes of producer use, one undo step per change.
Report only, no pushes. Save to `/home/claude/reports/AI-14-retest2.md`; verdict READY / NOT READY, and if READY a final 8-step Try list written for a musician (you may start from the developer's).
