# QA-1 · Daily session · qa-tester · 21 Nov 2026
Read `.claude/standards/dev-standards.md` first (quality bar; the new "Owner rules from 19 Nov 2026" section tells you what the owner is unhappy about this week: Keys redoing the whole project when he comments on one part, sung notes not kept as sung, controller sustain/knobs).

Repo: clone your own copy: `git clone -q https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-qa && cd /home/claude/sk-qa` on `main` (d35b13f, released tonight: AI-4, AI-6, AI-8 offline-brain fixes, AI-7 listening off really stops the mic, UX-7 Delete in the note editor acts on notes, UX-12 Save a copy/tempo undo/deleted song, UX-13 long MIDI import, looped section follows edits, gapless MP3).

## Job
Daily session as in your role file: smoke test, then about 20 minutes of real use like a producer (beat by artist reference + "another one" twice; build a full track like an artist; sing a bassline and chords with the fake mic; edit notes: draw, drag-select, copy/paste/duplicate, velocity, undo; import a voice note and turn it into notes; mix by asking; save, new song, reopen; export). Spend extra time on: (1) comments about ONE part ("make the bass softer", "the hats are too loud", "change the chords") — does anything else change? (2) sung parts: how close are the notes to the fixture? (3) the things released tonight.
Known and already on the board (don't file again): Keys changes more than the named part (AI-9); sung notes not kept (UX-14); controller sustain/knobs (UX-15); duplicate/drag-select requests (UX-17); everything in the "Follow-ups noted" section of `.claude/board.md`; branches waiting for the owner (SE-7, SE-8, SE-9, SE-10, UX-4, UX-6, UX-8, UX-9, UX-10, AI-1).
Write `/tmp/qa/2026-11-21/report.md`, `bugs.json` and `ideas.json` (at most 3) as your role says. Commit nothing to main.

## Report back
Verdict on main (healthy / not), numbered bugs with steps and severity, what you checked with numbers, screenshot paths.
