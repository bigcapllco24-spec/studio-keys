# SE-11 · Bug fix (Build mode) · sound-engine-dev · 22 Nov 2026
Read `.claude/standards/dev-standards.md` first (Quality bar: Sound; "Production and assistant rules").
Branch: `git clone -q https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-se11 && cd /home/claude/sk-se11 && git checkout -b preview-se-11 origin/main`.

## Bug (tester, 21 Nov)
Ableton zip stems don't add up to the Mix. Make a 4-part loop → Export for Ableton (.zip) → sum Stems/*.wav: summed stems peak +6.04 dBFS (RMS -4.79 dB) vs Mix.wav -0.52 dBFS (RMS -6.56 dB); drums stem alone louder than the mix; mix minus summed stems residual only 9.6 dB below the mix. Cause: each stem goes through the master glue and limiter on its own. The README tells users to drag in the Mix or the Stems; stems together clip and sound squashed.

## Job
Make stems that sum back to the mix (null test residual below -40 dB relative, or explain the limit): render stems post-fader, post-track-FX, with sends/returns handled sensibly (reverb/delay returns as their own stem or printed into each stem — pick the one Ableton users expect and say why), and no master glue/limiter on individual stems; give the stems the headroom they need (e.g. -6 dB on all, or the same gain the master would apply) and say in the README what to put on the Ableton master to match Mix.wav. You may edit `exportZip` and the README text in the studio files (studio-ux-dev's area) for this; list the lines. Check a few styles (house, hip-hop, melodic house with sidechain). Add a smoke line (sum of stems vs mix). `python3 tools/build.py`; check.sh passes (save/reopen pair flakes under load). Commit and push preview-se-11 after each step. Never push main.

## Report
Cause, fix, null-test numbers before/after, check.sh line, head hash, 3 "try" steps for the owner (Ableton or any DAW).
