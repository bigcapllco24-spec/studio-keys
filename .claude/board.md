# Studio Keys board (mirror of Studio Keys HQ)
Last updated: 13 Nov 2026, 11:45 IST

## Awaiting build OK (owner tries the test link, in HQ)
- UX-1 · studio-ux-dev · L · Song view (Loop/Song switch, Make it a song, sections, parts, patterns). Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-1/ · head 067a214 · tester READY (`.claude/work/reports/UX-1-test-c.md`, fix2).
- SE-3 · sound-engine-dev · S · Real drummer feel + swing ladder. Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-se-3/ · head adcf6db · tester READY (`SE-3-test-d.md`). Changes `cloudflare/worker.js`: deploy the Worker on release.
- UX-2 · studio-ux-dev · S · Bug fixes from the daily session: Play on a new song (high), velocity lane visible + group drag, sung chords on the beat, phone width. Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-2/ · head 8417930 · tester READY (`UX-2-test.md`).
- AI-4 · assistant-dev · S · Bug fixes from the daily session (offline brain): 'turn <recording> into a bassline' transcribes; mixing words change EQ/low cut, not notes. Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ai-4/ · head 158fd1f · tester READY on re-check (`AI-4-test-b.md`). Changes `cloudflare/worker.js` (2 prompt sentences): deploy the Worker and run the Llama check on release.
- Merge order note: UX-1/UX-2 share studio.js/daw.js; SE-3/AI-4 share maker.js/worker.js. Merge one after the other and rebuild index.html.

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
- UX-3 · studio-ux-dev · S · Singing a part you already have: replace it or mute it and keep a back-up (tester bug 5; needs the owner's choice, so a design first).
- RES-1 · music-researcher · S · How AI music tools and DAWs turn voice and humming into parts; ideas for Studio Keys.

## Research
- RES-4 · done 13 Nov · Chords (PML Chords For Life) and acoustic melodic house loops (PML bonus pack): progressions, voicings, percussion feel, mix shape; derived numbers only (`.claude/research/RES-4-pml-chords-and-acoustic-melodic-house.md`).
- RES-3 · done 13 Nov · Drum feel measured from Ableton Drum Essentials, 183 grooves; averaged numbers only, no samples or patterns (`.claude/research/RES-3-drum-essentials-feel.md`).
- RES-2 · done 13 Nov · Song structure: arrangement views and arranging by voice (`.claude/research/RES-2-song-structure.md`).

## Ongoing
- QA-1 · qa-tester · daily session on the live build, bugs and up to 3 ideas a day. 13 Nov: 8 bugs (6 fixed in UX-2/AI-4, 1 → UX-3, 1 → SE-1), 2 ideas in requests (Capture MIDI, variation history), 1 folded into AI-3 (`QA-1-daily-2026-11-13.md`).

## Follow-ups noted (not on the board yet)
- Space bar play/stop shortcut. Live AI can't see track EQ/low cut (add to projectState or a relative EQ field). Channel EQ is before the compressor, no 200-500 Hz band (SE-1). Undo after New song can restore the old song's tracks (check UX-1 at release). Loop recording makes one undo step per note.

## Done
- 13 Nov 2026 · Vibe-aware beats (genres, 40+ artist references, a fresh variation every time), Spotify/typed taste, singing bass/chords/melody through the assistant, voice notes, import audio/MIDI, audio to notes, Ableton-style editing (select, copy, velocity, undo), the dev team.
