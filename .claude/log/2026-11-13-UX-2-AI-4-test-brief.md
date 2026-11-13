# Branch check brief (qa-tester) · 13 Nov 2026 · UX-2 and AI-4 (bug fixes from your daily session)

Read `.claude/standards/dev-standards.md` first (Quality bar; Production and assistant rules). You are qa-tester: follow `.claude/agents/qa-tester.md`. Never change product code; you own `tests/**` and `.claude/tools/check.sh`. Don't push anything; the lead pushes.

Two testers run at the same time, one per branch, each in its own worktree. `check.sh` writes fixed files in /tmp (`/tmp/sk-bundle.js`, `/tmp/sk-index-before.html`, `/tmp/sk-worker.mjs`): if a FAIL looks like a clash with the other run, rerun it.

## Your branch
- **UX-2** in `/home/claude/sk-ux-2` (branch `preview-ux-2`). Developer report: `.claude/work/reports/UX-2-build.md` in that worktree. Fixes your bugs 1 (Play on a new song), 4 (velocity lane + group drag), 6 (sung chords choppy), 8 (phone sideways scroll).
- **AI-4** in `/home/claude/sk-ai-4` (branch `preview-ai-4`). Developer report: `.claude/work/reports/AI-4-build.md` in that worktree. Fixes your bugs 2 ("turn <recording> into a bassline" in the offline brain) and 3 (mixing words like muddy / harsh / thin rewrite the part). Also adds 2 sentences to the Worker prompt (not testable here; just confirm `node --check` passes and there are no backticks or `${`).

Your original report: `/home/claude/studio-keys-repo/.claude/work/reports/QA-1-daily-2026-11-13.md`; your scripts: `/home/claude/bugs/qa-2026-11-13/js/`.

## The job
1. `bash .claude/tools/check.sh` in the worktree; paste the summary. Any FAIL blocks.
2. Repeat your original steps for each fixed bug with real clicks/keys: is it fixed?
3. Look for regressions near the change. UX-2: transport (Play/Stop/Loop/record a loop/overdub/controller PLAY), undo/redo of tracks, New song, opening a saved song, the piano roll and drum editor at 1400x1100 and 1024x768 (all rows reachable, scroll wheel, notes out of view hints), sung bass and melody unchanged, tablet layout unchanged. AI-4: "add a bassline", "let me sing the bassline", "record a voice note", "another one", "make the drums louder", "more reverb on the chords", "make it brighter"(?), "add more low end" with no bass, "turn the bass into chords"; undo of every mixing change; the replies read well.
4. Verdict: READY or NOT READY, with each problem as steps / happened / should, and severity.

Write the report as you go to `.claude/work/reports/<ID>-test.md` in that worktree (don't commit; the lead does). Reply with the same text.
