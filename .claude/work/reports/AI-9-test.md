# AI-9 branch check · qa-tester · 22 Nov 2026 · preview-ai-9 @ 798b23d
(Saved by the lead from the tester's hand-back; the harness blocked the tester's own file.)

## Verdict: NOT READY (4 medium fixes). The owner's bug itself is fixed.
0 bad of 48 re-run phrasings (21 Nov evidence), 29/32 new phrasings, memory chains work, Song view keeps its sections, AI-1 and AI-4/6/8 unchanged vs main. check.sh 96 OK twice (2:43, 2:54 — near the 3-minute budget).

## Problems
1. MEDIUM "X is fine, just change Y" changes X (offline and AI path): "the drums are fine, just change the chords" regenerates drums; "don't touch the drums, make the melody simpler" lowers drum energy; "the kick is great but the bass is too loud" cuts kick low end. Praised/protected parts ("is fine/great/good", "don't touch", "keep", "leave") must not count as named (partsSaid/onePart, maker.js). AI [add_drums, vary chords] passes because drums are "named".
2. MEDIUM going back twice leaves the bassline on the wrong chords: new chords ×2, then "go back to the previous chords" ×2 → chords toggle but the bass stays (0% chord tones in 1-2 bars; 3/3 seeds). VERSIONS.follow is only filled by vary, so a version saved by revert has no bass.
3. MEDIUM AI path: any add_* passes the guard (`added.has(r)&&/^add_/`): "new chords" + AI [vary chords, add_melody] adds Melody 2. Only allow add_* when the words name that part or use an add word.
4. MEDIUM AI path: `notes` (mode replace) rewrites a sung/played part (sung bassline → 1 note for "make the bass simpler"). Refuse like vary/add/reshape.
5. LOW-MED Hinglish "chords badal do", "koi aur chords try karo", "chords ko lamba karo", "melody mein aur notes daalo" reply "replaced" with identical notes (+1 undo step); "brighten up the melody" replaces the melody (should be +3 dB highs like "make the melody brighter").
6. LOW "make the drums busier" says "energy N of 5" when 0 hits changed (groove engine energy levels collapse; engine area).
7. LOW (also main) "play the bass an octave lower" lowers volume and starts playback; should transpose -12.
8. LOW chord names use sharps in flat keys (F minor: "C sharp" for D flat) in chordsSaid/PC_NAMES.
9. LOW AI path song-wide mix on a one-part comment: [mix all db -3, mix bass db -5] for "the bass is too loud" turns the whole song down; mix all eq / track_fx all low cut / mix all volume 60 change nothing but the AI reply is shown; master fx high-pass for "the bass is muddy" not guarded.
10. NITs: "The chords is already…", "The chords notes are…", sung bass "kept your notes as you played them", "Done: … your own part, so I left it as it is", one-word "louder" after a melody comment raises the whole song, "make it softer" with no focus → "I couldn't turn that into a change", "make the chords busier" turns held pads into a 5-hit rhythm 6 dB quieter.

## Checked
T1 48 phrasings 0 bad, 1 Undo each, exact restore; "new chords" ×5 chords changed 5/5, melody/drums identical; "change the bassline" ×10 0 identical; bug 4 stop listening 5/5; bug 5 honest at energy 5. T2 32 new: 29 OK. T3 memory chains bass/chords/melody all correct; state 1,179 chars. T4 AI path 36 stubbed cases: brief's list all OK, failures = 1, 3, 9. T5 sung/played parts kept 15/15 offline; AI notes rewrote (4). T6 Song view 11 comments 0 bad (main 8/11 bad); AI-1 11 song moves same as main; AI-4/6/8 31 phrasings same as main. Renders: mix peak -0.43..-0.52, no clipping. 0 page errors.
Files: /home/claude/reports/qa-ai9/ (scripts, logs, shots).
