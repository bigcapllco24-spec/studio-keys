# SE-3 · Build mode FIX brief (sound-engine-dev) · 13 Nov 2026, 08:20 IST check-in

Read `.claude/standards/dev-standards.md` first. Sections that matter most: "Production and assistant rules" (feel settings like swing must stay adjustable; the assistant is conversational), "How we build" (keep `cloudflare/worker.js` free of backticks and `${`), "Quality bar".

You are sound-engine-dev. Read `.claude/agents/sound-engine-dev.md` and follow it as your role.

## Where to work
- Worktree: `/home/claude/wt/se-3` (branch `preview-se-3`, tracking origin, head 7e7406d). Work ONLY there. Another developer works in `/home/claude/wt/ux-1` at the same time; don't touch any studio UI file.
- Permission for this item (same as the build): `src/groove.js`, `src/maker.js` (swing phrases), the swing handling in `src/actions.js`, the swing lines of `cloudflare/worker.js`, and `tests/smoke.mjs` (add lines; don't weaken the tester's checks). List every change in your report.
- Save as you go: commit (`SE-3 fix: ...`) and `git push` at each fixed bug. Rebuild `index.html` with `python3 tools/build.py`; never edit it by hand. End every commit message with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HCuZASXv5gM1W5JsBFAK37
- Run `bash .claude/tools/check.sh` before the final push (any FAIL blocks). The other developer may run it at the same moment; if a FAIL looks like a clash over /tmp files, rerun it.

## Context
SE-3 (real drummer feel, swing ladder) was approved at gate 1 and built by you on this branch. The tester says it's ready except for the bugs below. Full tester reports: `.claude/work/reports/SE-3-test.md` and `.claude/work/reports/SE-3-test-b.md` in the main repo `/home/claude/studio-keys` (read them).

## Fix these (before the owner sees the test link)
1. **B1 (medium, regression) in `localBrain` (`src/maker.js`)**: with a beat present, swing words swallow the rest of the request. "add a bassline with some swing", "add chords with a bit of swing", "add some congas with swing", "more swing and add a clap", "make it faster and add more swing" must do BOTH the swing change and the other change. Only return early with the groove action when swing is the whole request; otherwise add the groove action next to the other actions. Add a smoke line for "add a bassline with some swing" (bass track added AND swing changed).
2. **B2 (low)**: understand "make it less swingy", "it swings too much" (lighter), "take the swing out" (straight), "swing 100%" (the max, 70%, say "the most it goes"), and "make a deep house beat straight" (straight).
3. **B3 (low, words)**: `swingName`/`swingWords` in `src/groove.js` must line up with the amounts: no word jump between 59% and 60%; a reply after "a bit less swing" from 70% and the beat description must use the same word.
4. **Chips disagree (low, `src/actions.js`)**: "another one with less swing" shows a chip "full triplet swing (about 66%)" from vary and a second "Lighter swing, about 58%". Write vary's chip/reply after the swing change (or merge them) so there is one swing amount, the real one.
5. **No beat yet (low, `src/maker.js`)**: "more swing"/"less swing" in an empty song should reply "There's no beat yet. Say 'make a house beat' first." instead of the generic can't-do reply.

Not in this round (it becomes its own follow-up item, don't do it): B4, sung and generated parts don't follow the drums' swing; the 8th-hat styles and "another one" repeats on house/techno.

## Done when
All 5 fixed, each with a quick check (offline parser through handleRequest, and the mocked-AI path still works), smoke test has the new B1 line, check.sh passes, pushed to `preview-se-3`.

## Report (write to `/home/claude/reports/SE-3-fix.md` and return the full text as your final message)
Short: what you changed per bug (file, function), how you checked each, check.sh summary, last commit hash on `preview-se-3`, whether `cloudflare/worker.js` changed, and 3-4 "try this" steps for the owner written for a musician (say which phrases work on the test link through the offline parser vs only after the Worker deploy).
