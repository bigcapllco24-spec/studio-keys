# QA-2 fix 1: the focus check flake (22 Nov 2026)

Branch `preview-qa-2`, pushed at a7bd0b2 (on top of ac0b714). Only `tests/smoke.mjs` changed: 11 lines added, 6 removed, all small edits in place. Nothing was appended at the end of the file.

## Verdict
Fixed. The check is as strict as before, plus one new condition: Keys must have answered both typed requests. It passed 5 of 5 check.sh runs (3 on the branch, 2 on a local merge with AI-14), including a run with load average about 10. The branch still merges cleanly with AI-14, AI-9, UX-19 and UX-20.

## Cause
The check is "song/loop: after typing to Keys, double-click a part or click a note gives the editor the keys". Its test steps had three timing holes. The app was not at fault for the failure itself.

1. **Clicking Keys's box while the page was still scrolling.**
   - Just before the second typed request, `openEditor` scrolls the editor into view smoothly, and that scroll keeps going after an instant scroll.
   - kSay worked out where the box was and clicked at once. At CPU x4 I measured the page moving up to 107 px during that click. The box is about 40 px tall.
   - Under load the click can land beside the box. Focus then goes to the page body, the typing goes to the studio's keyboard shortcuts, and `kf2` is not `asIn`.
   - The failing log fits this. In the merge run that failed, every term the failure line printed was fine (`song`, `space`, `loop`, `notes`). The terms it didn't print were `kf0` and `kf2`, the focus after typing.
2. **The wait for the reply counted chat bubbles.** The chat keeps only 14 bubbles. Once it is full, the count of Keys bubbles stops going up, so the wait never succeeded. It timed out silently after 20 s (`.catch(() => {})`) and the check went on as if Keys had answered. My standalone repro hit this every 8th request.
3. **The double-click was too slow on a busy machine.**
   - The test pressed and released, waited 80 ms, then pressed and released again, awaiting each step.
   - On a loaded machine that took more than 230 ms. One press-to-release alone took 232 ms in my logs.
   - A part's single click switches it after 230 ms. When that switch landed between the second press and its release, the part was redrawn under the mouse. The double-click was then lost: the editor stayed closed and focus stayed on a removed button.
   - I reproduced this as a second failure of the same check under heavy load: `"song":""`. The same thing hit the UX-7 `kdbl` helper: `-1 → -1 notes`.

## Change (tests/smoke.mjs)
- **kSay:**
  - Waits for the page and every scroller to stand still (`settle('#asIn')`) before the click.
  - Then waits until the box really has the focus and holds the typed text before pressing Enter.
  - Waits for Keys's *new* reply (old bubbles get a `data-qa` mark first) and for `!ASSIST.busy`, instead of counting bubbles. Whether the reply came is recorded in `kRep`.
- **Double-click helper `dbl(x, y)`:** sends the four presses at once through CDP (`Input.dispatchMouseEvent` with clickCount 1, 1, 2, 2), so the gesture runs at human speed.
  - At CPU x6 it measured 1-14 ms from the first click to the dblclick, against the 230 ms switch delay.
  - It is used by this check (kf1) and by the UX-7 `kdbl` helper, which had the same pattern.
- **Verdict:** every earlier term is kept, and it now also needs `kRep` = 2 replies. The failure info now names every term: `{"typed":[kf0,kf2],"replied":[..],"song":..,"space":..,"loop":..,"notes":..}`.
- **Quick-close check (QA-2, ac0b714):** its failure info now also prints the local copy's song name (`last`), so a future failure says which side lost the edit. Diagnostics only: the verdict is unchanged.
- **Name clash:** the CDP session is named `inCdp`, because UX-20 has its own `const cdp` inside the try block.

## Runs
Other agents' Chrome jobs (`node run.mjs …/ai14g/fix2 …`) were running during every run below. Quiet-machine time was 2m29s to 2m45s on 22 Nov.

| # | Tree | Extra load | Load avg at start / end | Result | Focus check | Time |
|---|---|---|---|---|---|---|
| 1 | preview-qa-2 (worktree, = a7bd0b2) | another agent's Chrome job | 4.4 | CHECK OK, 92 of 92 | PASS, typed asIn/asIn, replied true/true | 3m36s |
| 2 | preview-qa-2 | another agent's Chrome job | 4.7 | CHECK OK, 92 of 92 | PASS | 4m01s |
| 3 | preview-qa-2 | another agent's Chrome job | 5.7 | CHECK OK, 92 of 92 | PASS | 3m05s |
| 4 | local merge, origin/preview-ai-14 213da50 + QA-2 (c94e969, not pushed) | another agent's Chrome job | 2.5 | CHECK OK, 120 of 120 | PASS | 4m16s |
| 5 | same merge | my Chrome loop (15 repro runs during the check) + another agent's job | 5.2 / 10.2 | CHECK OK, 120 of 120 | PASS | 7m26s |

The times are over 3 minutes only because of the shared load.

Before the fix, under heavy load (3 smoke runs at once plus another agent's job, load average about 12), the old double-click lost the editor in 1 of 3 runs (`"song":""`).

## Merge check (preview-qa-2 a7bd0b2 into each, local only)
- origin/preview-ai-14 (213da50): clean, `node --check` OK.
- origin/preview-ai-9 (5210af0): clean, `node --check` OK.
- origin/preview-ux-19 (2a9e73a): clean, `node --check` OK.
- origin/preview-ux-20 (6e1b080): clean, `node --check` OK.
- Merging all of them together does conflict: UX-19 against the others, and UX-20's appended smoke lines. Those conflicts are the same on main without QA-2 (main + UX-19 conflicts in index.html, src/actions.js and tests/smoke.mjs; main + UX-20 in tests/smoke.mjs). They come from those branches, not from QA-2.

## Found on the way (for the lead)
1. **Product: a slightly slow double-click on a song part is lost (studio-ux-dev, `src/song.js`, the `.part` click/dblclick handlers).**
   - Steps:
     1. Song view, Full track layout, Chords in the Drop on.
     2. Double-click the part, holding the second press a little: release 1, then press 2 about 100-200 ms later, then release 2 more than 230 ms after release 1.
   - Expected: the note editor opens and the part stays on.
   - Actual: the part switches **off** and the editor stays closed. The 230 ms single-click switch fires during the second press and redraws the part, so the click and the double-click have no part to land on.
   - Measured (CDP, idle machine):

     | Release 1 → press 2 | Press 2 → release 2 | Result |
     |---|---|---|
     | 80 ms | 0 ms | editor opens |
     | 150 ms | 150 ms | lost, part off |
     | 200 ms | 100 ms | lost, part off |
     | 100 ms | 200 ms | lost, part off |
     | 300 ms | 50 ms | editor opens (the relaxed-double-click path) |

   - An ordinary human double-click (release 1 to release 2 of about 200-300 ms) can hit this, and a tablet double-tap more often. Not filed; your call.
   - Repro script: `/tmp/claude-0/-home-claude/c9aab8d2-f491-5ce0-89c4-2a2d39c4016f/scratchpad/qa2f/dbl.mjs <index.html>`.
2. **At extreme load only** (4 Chrome jobs on 2 cores, load average about 12), not at the levels in the run table: UX-7's "Ctrl+D … one Undo" printed `48 → 96 → 96` in 3 of 3 runs, and the QA-2 quick-close check failed once (`label: "Saves automatically"` after 30 s). I didn't chase these further. The quick-close check now prints `last` to help next time.
