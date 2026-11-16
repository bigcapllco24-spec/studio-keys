# SE-9 test brief — qa-tester (branch check before gate 2)

Read `.claude/standards/dev-standards.md` first.
Item: SE-9, bug 8 from your 16 Nov daily session: extreme EQ boosts pushed the master over 0 dBFS and the Ableton zip's Mix.wav clipped. Fix: a look-ahead true-peak limiter at -0.3 dBTP as the master's last stage (AudioWorklet loaded from a data: URL, soft-clip fallback), on live output and every render; loop WAVs now wrap seamlessly. Branch `preview-se-9` (head f922ba6), worktree `/home/claude/sk-se-9` (read-only for you). Developer report: `/home/claude/studio-keys-repo/.claude/work/reports/SE-9-build.md`.

Do:
1. `bash .claude/tools/check.sh` in the worktree (paste the summary line).
2. Focused test with numbers: your daily-session extreme case (peak, 4x true peak, clipped samples) on live playback (analyser), loop MP3, whole-song MP3, the Ableton zip (Mix.wav and stems); 3 normal loops of your own (different genres) main vs branch — peak, LUFS within 0.1 dB, and listen for pumping or dulling; a looped WAV wrap (no click at the seam: sample jump at the loop point); playback start/stop and tempo changes with the limiter (no glitches, no silence on first play, works after a page reload and when the worklet can't load — try blocking AudioWorklet to hit the fallback).
3. Regressions: sidechain, sends, mute/solo still sound right; export timings still line up with the grid (first kick at sample 0 in Mix.wav); no console errors.
Load note: three branch checks run in parallel on this machine, so Chrome timing checks can be flaky. If check.sh has a FAIL, re-run it once; if the same check fails twice, run it on a main worktree too (`git worktree add --detach /tmp/qa-main-<item> origin/main`) and say whether main fails the same way. A FAIL that only appears on this branch twice blocks.
Verdict READY or NOT READY with numbered bugs (steps, expected, actual). Save the report as you go to `/tmp/reports/SE-9-test.md`. Short and plain. Final message: the report.
