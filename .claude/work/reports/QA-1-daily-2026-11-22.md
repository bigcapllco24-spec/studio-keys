# QA-1 daily session · 22 Nov 2026 · main @ b442b1e (product d18ef74)
(The tester's report.md write was blocked by its harness; this is the lead's copy of its final message, condensed. Full bug texts and steps: QA-1-daily-2026-11-22-bugs.json; idea: QA-1-daily-2026-11-22-ideas.json.)

Verdict: main healthy; AI-1 (song sections by voice, released last night) has gaps in Basic mode.
check.sh: 91 checks, 0 page errors, 2m29s (fresh machine, load 0.08).
Works: sections by voice (full track, longer intro, add/remove/duplicate drop, kick out of intro, snare roll, only pads in break, move/rename, longer/shorter, second drop different, Hinglish), Song view by mouse, undo/redo exact, save/reopen identical, both exports. In Song mode 24 one-part comments changed only that part and never the sections.

Bugs (9, filed in HQ as qa-2026-11-22-1..9):
1 HIGH assistant (AI-14): "take the kick out of the intro and bring the bass in" (AI-1 design step 4) remakes the bassline and doesn't bring it into the intro; "bring the bass in at the build", "start the bass at the build" the same.
2 HIGH assistant (AI-14): "mute the voice note" / "turn off the voice note" starts a new voice-note recording; "mute sing" starts a sung melody take.
3 MEDIUM assistant (AI-14): a comment naming a section changes the whole song or nothing ("the melody is too loud in the drop" = -5 dB everywhere; "give the drop more energy" says Done and changes nothing; "make the drop bigger" not understood).
4 MEDIUM assistant (AI-14): pan requests add parts (Melody 2, Chords 2) or remake the groove; "it sounds too dry" not understood.
5 MEDIUM engine (SE-12): sections as loud as the drop (Bodzin: Intro -5.8, Build -6.4, Drop -6.8 dB RMS; Break -25.2).
6 MEDIUM assistant (AI-14): "add a breakdown" on a loop starts the song with 31 s of pads; adds a second break next to an existing one; confusing reply.
7 LOW assistant (AI-14): "make it a short song/track" not understood (fullW regex, maker.js:185).
8 LOW assistant (AI-14): "the mix is muddy" cuts a muted voice-note track first and puts a 308 Hz low cut on a melody reaching 131 Hz.
9 LOW studio (UX-19): Song view drums label cut off on the left ("are, kick"), head.html .pwo.

Known, not filed: "make the bass simpler" rewrites the drums (AI-9), UX-14, SE-11, UX-17, SE-8 variety ("another one" overlap 69-93% on the 1/16 grid), LCD "1 TRACKS".
Numbers: listening 4-bar loops peak -0.48 to -0.73 dBFS, RMS -5.9 to -9.2, 0 clipped; sung bass 10 notes, chords 8 on sung roots; voice note to bassline 6/6 notes right; loop MP3 -8.0 LUFS TP -0.2, 18.9 s; song MP3 -8.1 LUFS, 43 s; Ableton zip 4 bars 38 s, 8 bars 106 s; phone 390 px no sideways scroll.
Idea (1, in requests as qa-2026-11-22-section-mix): mix one section on its own (per-section level and low-pass on each part, like Ableton clip gain).
Files on the tester machine: /home/claude/qa/2026-11-22/ (session.log, js/, shots/, downloads/).
