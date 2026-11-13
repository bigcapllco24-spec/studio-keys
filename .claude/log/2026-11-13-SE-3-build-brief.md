# SE-3 · Build mode brief (sound-engine-dev) · 13 Nov 2026

Read `.claude/standards/dev-standards.md` first. The sections that matter most: "Production and assistant rules" (the new 13 Nov note: feel settings like swing must stay adjustable by the user), "How we build" (keep `cloudflare/worker.js` free of backticks and `${`), "Quality bar", "How we work" (copyright: derived numbers only).

You are sound-engine-dev. Read `.claude/agents/sound-engine-dev.md` and follow it as your role.

## Where to work
- Worktree: `/home/claude/wt/se-3` (branch `preview-se-3`, already pushed). Work ONLY there. Another developer is working in `/home/claude/wt/ux-1` at the same time on the studio UI and scheduler; don't touch `src/studio.js`, `src/daw.js`, `src/song.js`, `src/body.html`, `src/head.html`.
- **Permission for this item only:** besides `src/groove.js`, you may edit `src/maker.js` (the swing phrases), the swing lines of the Worker prompt in `cloudflare/worker.js`, the swing handling in `src/actions.js` (`groove` action) and add smoke-test lines to `tests/smoke.mjs`. List every change to those files in your report.
- Save as you go: commit (`SE-3 WIP: ...`) and `git push` at sensible points. Rebuild `index.html` with `python3 tools/build.py`; never edit it by hand. End every commit message with:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01HCuZAQiMb134PWfp7hriKs
- Run `bash .claude/tools/check.sh` before the final commit (any FAIL blocks). It uses fixed files in /tmp and the other developer may run it at the same moment: if a FAIL looks like a clash, rerun it.

## What was approved (gate 1, round 1)
The proposal `.claude/work/proposals/SE-3.md` (data: `.claude/research/data/RES-3-drum-feel.json`, report `.claude/research/RES-3-drum-essentials-feel.md`). The owner's choices:
- D1: **Full triplet swing (66%)** for "more swing", like the pack.
- D2: the new hat feel applies to **every style**.

The owner's note: "users can adjust the swing if it feels too heavy." So, on top of the proposal:
- "less swing" steps DOWN from the current amount (e.g. 66% → about 58% → 54% → straight) instead of jumping to zero; "no swing" / "straight" = 0; an exact amount works ("swing 58%", "58 percent swing") in both the offline parser and the Worker prompt; "a bit more swing" steps up. The reply says the amount in musician words ("lighter swing, about 58%").
- Make sure the Worker prompt's swing range matches the engine (today it says "swing: 0 to 0.3"; `actions.js` clamps 0..0.4) and says 0.33 = full triplet swing.
- His longer note: the team keeps learning from his uploaded packs, his linked Spotify artists and his preferences to keep improving the sound. Keep the FEELS table data-driven (easy to add more measured feels later) and mention in your report one or two next steps you'd take from the data.

## Done when
Straight beats accent hats on 2 and 4 (in-betweens softer) following the RES-3 curve; "more swing" reaches 66% (off-16ths about 1/12 beat late); styles marked human push the kick about 10 ms early and the snare about 4 ms; "less swing" steps down; "another one" still varies; smoke test checks these; check.sh passes.

## Report (write it to `/home/claude/reports/SE-3-build.md` and return the full text as your final message)
Short and honest: what changed (files, functions), the numbers you measured (hat velocities on 2/4 vs off-16ths, swing offset, kick push, variation between two "another one" runs), check.sh summary, last commit hash on `preview-se-3`, whether `cloudflare/worker.js` changed (the lead must deploy the Worker on release), what's left, and 3-4 "try this" steps for the owner written for a musician. Note: the test link uses the LIVE Worker, so the new swing words only work there through the offline parser until release; say which phrases work on the test link.
