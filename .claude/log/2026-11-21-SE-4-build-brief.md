# SE-4 · Build mode · sound-engine-dev · 21 Nov 2026
Read `.claude/standards/dev-standards.md` first. Sections that matter: "Production and assistant rules" (professional, club-ready sound; owner's taste: melodic house/techno), "Quality bar" (Sound: no clipping, levels matched), "How we work" (copyright: derived numbers only, never copied MIDI or loops from the PML packs), "Owner preferences log" (13 Nov: keep learning from his uploaded packs).

Repo: clone your own copy: `git clone -q https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-se4 && cd /home/claude/sk-se4 && git checkout -b preview-se-4 origin/main` (main is d35b13f, released tonight).

## Approved design
`.claude/work/proposals/SE-4.md` (read it all) and the research `.claude/research/RES-4-pml-chords-and-acoustic-melodic-house.md`.
Owner's choices at gate 1 (19 Nov): **D1 = B: open voicings in EVERY style** (not only electronic). **D2 = A: mostly plain chords with add9 or 7ths sometimes, like the pack.** No note.
Because D1 is every style, take care of the risk the proposal names: pop, rock and hip-hop must still sound right with open voicings (keep the low root no lower than about C3 when a bass track plays; keep voicings playable and not muddy). Check a few genres by ear-numbers (render, look at low-mid energy vs today).

## Build
- `src/music.js`: open `voice()` mode used by pads, seventh, plucks332, sustain; colour notes ~30% of the time; new PROGS entries (e.g. i VII iv VI, VI III VII i); 2-bar holds in 8-bar loops; "another one" on chords changes the voicing too.
- `src/groove.js` (not ARTISTS): melodic and organic house percussion follows the RES-4 accent curve, straight, about 5 ms spread. Keep SE-3's swing ladder and "less swing" working.
- Smoke lines in tests/smoke.mjs are the tester's, but add the 3 checks from the proposal yourself (new pad chords span ≥14 semitones; a new progression can come up; "another one" changes the voicing) and list them in your report.
- `python3 tools/build.py`; `bash .claude/tools/check.sh` must pass (the save/reopen pair can flake under load; rerun if only those two fail).
- Commit and push `preview-se-4` after each step (WIP commits are fine). Never push main.

## Report (short, plain)
What changed, how it sounds different in musical words, numbers (chord spans, low-mid energy before/after for 4 genres, peak/LUFS), check.sh line, head hash, what's left. Write a "try" list of 3-4 steps a musician can follow on the test link.
