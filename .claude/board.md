# Studio Keys board (mirror of Studio Keys HQ)
Last updated: 13 Nov 2026, 09:30 IST

## Awaiting build OK (owner tries the test link, in HQ)
- UX-1 · studio-ux-dev · L · Song view (Loop/Song switch, Make it a song, sections, parts, patterns). Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-1/ · head 067a214 · tester READY (`.claude/work/reports/UX-1-test-c.md`, fix2).
- SE-3 · sound-engine-dev · S · Real drummer feel + swing ladder. Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-se-3/ · head adcf6db · tester READY (`SE-3-test-d.md`). Changes `cloudflare/worker.js`: deploy the Worker on release.

## Awaiting design OK (owner, in HQ)
- AI-1 · assistant-dev · L · Song sections by voice. Round 1. Market: great 5/5. Proposal `.claude/work/proposals/AI-1.md`. Builds together with UX-1.
- SE-4 · sound-engine-dev · S-M · Producer chords (open voicings, more progressions) and organic house percussion feel, from the owner's PML packs (RES-4). Round 1. Proposal `.claude/work/proposals/SE-4.md`. Builds right after SE-3.

## Top priority (owner feedback, 13 Nov)
- SE-1 · sound-engine-dev · M · Club-ready melodic house/techno sound, professional mix (first pass shipped: per-track FX, sidechain, sends, master chain).
- SE-2 · sound-engine-dev + music-researcher · L · Sound recipes from the owner's Spotify artists.
- AI-3 · assistant-dev · L · Reference track: drop a song you love; the assistant matches tempo, key, groove and tonal balance.

## Up next (the team designs these first; the owner approves in HQ)
- AI-2 · assistant-dev · M · The assistant remembers what you like ("softer claps", "always Rolling Bass") and uses it next time. Done when: preferences said once are applied in later songs.
- SE-5 · sound-engine-dev + studio-ux-dev · S · Sung and generated parts follow the drums' swing (tester finding B4). Done when: off-16th notes sit on the swung grid within 5 ms.
- RES-1 · music-researcher · S · How AI music tools and DAWs turn voice and humming into parts; ideas for Studio Keys.

## Research
- RES-4 · done 13 Nov · Chords (PML Chords For Life) and acoustic melodic house loops (PML bonus pack): progressions, voicings, percussion feel, mix shape; derived numbers only (`.claude/research/RES-4-pml-chords-and-acoustic-melodic-house.md`).
- RES-3 · done 13 Nov · Drum feel measured from Ableton Drum Essentials, 183 grooves; averaged numbers only, no samples or patterns (`.claude/research/RES-3-drum-essentials-feel.md`).
- RES-2 · done 13 Nov · Song structure: arrangement views and arranging by voice (`.claude/research/RES-2-song-structure.md`).

## Ongoing
- QA-1 · qa-tester · daily session on the live build, bugs and up to 3 ideas a day.

## Done
- 13 Nov 2026 · Vibe-aware beats (genres, 40+ artist references, a fresh variation every time), Spotify/typed taste, singing bass/chords/melody through the assistant, voice notes, import audio/MIDI, audio to notes, Ableton-style editing (select, copy, velocity, undo), the dev team.
