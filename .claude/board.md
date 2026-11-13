# Studio Keys board (mirror of Studio Keys HQ)
Last updated: 13 Nov 2026, 23:05 IST

## Awaiting build OK (owner tries the test link, in HQ). All links include the Song view (main 50b6315).
- UX-4 · studio-ux-dev · L · Phone layout with Keys first (tabs Keys · Song · Mix · Play · More, mini transport, sheets, full-screen editor) + iPhone talking fixes. Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-4/ · head 3bf75ff (main + UX-2 + UX-5) · tester READY after 4 fixes (`UX-4-retest.md`), 39 smoke + 13 phone checks. Ships after UX-2 and UX-5.
- UX-2 · studio-ux-dev · S · Studio bug fixes: Play on a new song, velocity lane + group drag, sung chords on the beat, phone width. Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-2/ · head 94c2d43 (main merged in) · tester READY (`UX-2-test-b.md`). Heads-up in HQ: the loop button's 2nd press overdubs instead of stopping on this branch.
- UX-5 · studio-ux-dev · S · Bug fix: a part sung in Song mode says which section it plays in (tester F1). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-5/ · head 45391b5 · tester READY (`UX-5-test.md`). Ship after UX-2 (studio.js).
- SE-3 · sound-engine-dev · S · Real drummer feel + swing ladder. Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-se-3/ · head edbef43 (main merged in, 39 checks). Deploy the Worker on release.
- AI-4 · assistant-dev · S · Assistant bug fixes (offline brain). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ai-4/ · head 18e0ad3 (main merged in). Deploy the Worker and run the Llama check on release.
- Merge order: UX-2, UX-5, then UX-4; SE-3 then AI-4 (maker.js/worker.js). Rebuild index.html after each.

## Awaiting design OK (owner, in HQ)
- AI-1 · assistant-dev · L · Song sections by voice. Round 1. Market: great 5/5. Proposal `.claude/work/proposals/AI-1.md`. Builds together with UX-1.
- SE-4 · sound-engine-dev · S-M · Producer chords (open voicings, more progressions) and organic house percussion feel, from the owner's PML packs (RES-4). Round 1. Proposal `.claude/work/proposals/SE-4.md`. Builds right after SE-3.

## Top priority (owner feedback, 13 Nov)
- SE-1 · sound-engine-dev · M · Club-ready melodic house/techno sound, professional mix (first pass shipped: per-track FX, sidechain, sends, master chain).
- SE-2 · sound-engine-dev + music-researcher · L · Sound recipes from the owner's Spotify artists.
- AI-3 · assistant-dev · L · Reference track: drop a song you love; the assistant matches tempo, key, groove and tonal balance.

## Up next (the team designs these first; the owner approves in HQ)
- UX-6 · studio-ux-dev (+ Worker routes) · S · Install on the phone's home screen (manifest, service worker, icons). Approved with UX-4 (owner: installable web app only for now); goes straight to build after UX-4. Worker deploy at release.
- SE-6 · sound-engine-dev (+ studio-ux-dev, assistant-dev) · L · Split a song into stems: karaoke ("play the background") and remixes (owner request 13 Nov). RES-5 done: HTDemucs in the browser via ONNX Runtime Web; next a device speed spike, then design. Owner decisions: model hosting, licence, rights text.
- AI-5 · assistant-dev · S · One-tap Spotify connect: build in the owner's Spotify app Client ID (waiting for him to send it; it is public, not a secret).
- AI-2 · assistant-dev · M · The assistant remembers what you like ("softer claps", "always Rolling Bass") and uses it next time. Done when: preferences said once are applied in later songs.
- SE-5 · sound-engine-dev + studio-ux-dev · S · Sung and generated parts follow the drums' swing (tester finding B4). Done when: off-16th notes sit on the swung grid within 5 ms.
- UX-3 · studio-ux-dev · S · Singing a part you already have: replace it or mute it and keep a back-up (tester bug 5; needs the owner's choice, so a design first).
- RES-1 · music-researcher · S · How AI music tools and DAWs turn voice and humming into parts; ideas for Studio Keys.

## Research
- RES-5 · done 13 Nov · Stem separation in the browser + phone app options (`.claude/research/RES-5-stem-separation.md`; market good 4/5).
- RES-4 · done 13 Nov · Chords (PML Chords For Life) and acoustic melodic house loops (PML bonus pack): progressions, voicings, percussion feel, mix shape; derived numbers only (`.claude/research/RES-4-pml-chords-and-acoustic-melodic-house.md`).
- RES-3 · done 13 Nov · Drum feel measured from Ableton Drum Essentials, 183 grooves; averaged numbers only, no samples or patterns (`.claude/research/RES-3-drum-essentials-feel.md`).
- RES-2 · done 13 Nov · Song structure: arrangement views and arranging by voice (`.claude/research/RES-2-song-structure.md`).

## Ongoing
- QA-1 · qa-tester · daily session on the live build, bugs and up to 3 ideas a day. 13 Nov: 8 bugs (6 fixed in UX-2/AI-4, 1 → UX-3, 1 → SE-1), 2 ideas in requests (Capture MIDI, variation history), 1 folded into AI-3 (`QA-1-daily-2026-11-13.md`).

## Follow-ups noted (not on the board yet)
- Space bar play/stop shortcut. Live AI can't see track EQ/low cut (add to projectState or a relative EQ field). Channel EQ is before the compressor, no 200-500 Hz band (SE-1). A re-sung take moves to the bottom of the track list. newSong() always opens in Loop mode. Loop recording makes one undo step per note. Offline parser reads '...at 124' as 122 bpm (maker.js). Song-mode editor shows 'Pattern for Intro: A' next to 'Pattern A plays only in Drop'. Sideways Keys chat 41 px tall on phones. Keys orb has a gradient (owner's call).

## Done
- 13 Nov 2026 · UX-1 Song view (Loop/Song switch, Make it a song, sections, parts, patterns A/B) · 50b6315.
- 13 Nov 2026 · Vibe-aware beats (genres, 40+ artist references, a fresh variation every time), Spotify/typed taste, singing bass/chords/melody through the assistant, voice notes, import audio/MIDI, audio to notes, Ableton-style editing (select, copy, velocity, undo), the dev team.
