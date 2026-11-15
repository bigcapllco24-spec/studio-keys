# Studio Keys board (mirror of Studio Keys HQ)
Last updated: 16 Nov 2026, 00:55 IST

## Awaiting build OK (owner tries the test link, in HQ)
- AI-7 · assistant-dev · S · Bug (owner request 15 Nov): Keys kept listening after 'Always listening' was turned off (mic left open, two listeners after a quick off/on). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ai-7/ · head 153caf6 · tester READY (34/34 focused, 48 smoke; `AI-7-test.md`), 3 rough edges fixed. No Worker change. Note for UX-4: phone off controls must call stopListening(); user-opened mic uses micStart(true).
- AI-1 · assistant-dev · L · Song sections by voice (arrange, sections, parts, drum transitions with a beat of silence before the drop, loop/play from a section, mini song map). Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-ai-1/ · head 848933a · tester READY after 3 rounds (`AI-1-retest2.md`), 57 checks. Test link uses the live AI prompt; release deploys the Worker. Leftovers: longer on a 6-min club track, reel lengths offline, 'drop se pehle' offline, same-energy groove empty undo, house Build no gap.
- SE-7 (7a) · sound-engine-dev · L · Honest key chip (sureness, second guess, reasons, DJ key; key change moves parts; chip follows edits). Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-se-7/ · head 5f6f5c7 · tester READY after 3 rounds (`SE-7-retest2.md`), 56 checks. Release deploys the Worker (1 prompt line). Then 7b + 7c.
- UX-9 · studio-ux-dev · S · Bug: controller Start/Continue/MMC Play play the studio (was a LOOP.layers crash). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-9/ · head f9bc925 · tester READY, no bugs (`UX-9-test.md`).
- UX-8 · studio-ux-dev · S · Loop button 2nd press stops again (owner's UX-2 note). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-8/ · tester READY.
- UX-7 · studio-ux-dev · S · Delete in the note editor acts on notes, not the song section (also: editor shortcuts after typing to Keys). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-7/ · head 899d002, main merged in 15 Nov (conflicts resolved) · tester READY again (`UX-7-retest.md`, 52 checks).
- UX-4 · studio-ux-dev · L · Phone layout with Keys first + iPhone talking fixes. Round 2. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-4/ · tester READY.
- UX-6 · studio-ux-dev · S · Install on the phone's home screen (on top of UX-4; Worker routing update ships with it). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-6/ · tester READY.
- AI-4 · assistant-dev · S · Assistant bug fixes (offline brain). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ai-4/ · head 80f031a, main merged in 15 Nov (worker prompt conflict resolved by the lead), check OK 55 · release deploys the Worker.

- SE-8 · sound-engine-dev · S · 'another one' never repeats a groove in the song. https://studio-keys.bigcapllco24.workers.dev/p/preview-se-8/ · tester READY (retest 2).
- AI-6 · assistant-dev · S · Offline: voice note → bassline, level/tone words about a part, 'a bit straighter', sing reply hint. https://studio-keys.bigcapllco24.workers.dev/p/preview-ai-6/ · tester READY. Built on AI-4: ships with/after it; release deploys the Worker.
- UX-10 · studio-ux-dev · S · Sung bassline stutters: gapless AudioWorklet take recorder. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-10/ · tester READY (retest 2).
- SE-7b+7c (inside SE-7) · https://studio-keys.bigcapllco24.workers.dev/p/preview-se-7bc/ · head de75944 · includes 7a · fix 1 (drum loops 'No key in this clip', loop chords voted over repeats, Put re-uses Keys' Chords, 'drive' song names, honest copy reply) · tester re-check READY (`SE-7bc-retest.md`, 67 checks). Released after 7a with its own OK. Leftovers: 2/8 hip-hop drum loops read ~122 BPM (unsure); drum-loop card hint/toast/Put tooltip wording.

## In build
- nothing (everything built is waiting for the owner's test-link OK).

- Merge notes: AI-1 and SE-7a conflict (worker.js prompt line, actions.js, assistant.js, smoke): whichever ships second merges main and re-runs the check. UX-4 before UX-6.

## Awaiting design OK (owner, in HQ)
- UX-11 · studio-ux-dev (+ assistant-dev) · M · Mute/solo single drum sounds (owner request 15 Nov): M/S per row in the drum editor, KIT panel on drum tracks, 'Keys, mute the open hats' (new drum_sounds action). Round 1. Proposal `.claude/work/proposals/UX-11.md`. Market great 5/5. 3 decisions.
- SE-4 · sound-engine-dev · S-M · Producer chords (open voicings, more progressions) and organic house percussion feel, from the owner's PML packs (RES-4). Round 1. Proposal `.claude/work/proposals/SE-4.md`. Builds right after SE-3.

## Top priority (owner feedback, 13 Nov)
- SE-1 · sound-engine-dev · M · Club-ready melodic house/techno sound, professional mix (first pass shipped: per-track FX, sidechain, sends, master chain).
- SE-2 · sound-engine-dev + music-researcher · L · Sound recipes from the owner's Spotify artists.
- AI-3 · assistant-dev · L · Reference track: drop a song you love; the assistant matches tempo, key, groove and tonal balance.

## Up next (the team designs these first; the owner approves in HQ)
- SE-6 · sound-engine-dev (+ studio-ux-dev, assistant-dev) · L · Split a song into stems: karaoke ("play the background") and remixes (owner request 13 Nov). RES-5 done: HTDemucs in the browser via ONNX Runtime Web; next a device speed spike, then design. Owner decisions: model hosting, licence, rights text.
- AI-5 · assistant-dev · S · One-tap Spotify connect: build in the owner's Spotify app Client ID (waiting for him to send it; it is public, not a secret).
- AI-2 · assistant-dev · M · The assistant remembers what you like ("softer claps", "always Rolling Bass") and uses it next time. Done when: preferences said once are applied in later songs.
- SE-5 · sound-engine-dev + studio-ux-dev · S · Sung and generated parts follow the drums' swing (tester finding B4). Done when: off-16th notes sit on the swung grid within 5 ms.
- UX-3 · studio-ux-dev · S · Singing a part you already have: replace it or mute it and keep a back-up (tester bug 5; needs the owner's choice, so a design first).
- RES-1 · music-researcher · S · How AI music tools and DAWs turn voice and humming into parts; ideas for Studio Keys.

## Research
- RES-6 · done 14 Nov · Finding key and chords in a song: plain-JS chroma + EDM key profiles + chord templates; licences; 'DJ key' not 'Camelot' (`.claude/research/RES-6-key-and-chords.md`).
- RES-5 · done 13 Nov · Stem separation in the browser + phone app options (`.claude/research/RES-5-stem-separation.md`; market good 4/5).
- RES-4 · done 13 Nov · Chords (PML Chords For Life) and acoustic melodic house loops (PML bonus pack): progressions, voicings, percussion feel, mix shape; derived numbers only (`.claude/research/RES-4-pml-chords-and-acoustic-melodic-house.md`).
- RES-3 · done 13 Nov · Drum feel measured from Ableton Drum Essentials, 183 grooves; averaged numbers only, no samples or patterns (`.claude/research/RES-3-drum-essentials-feel.md`).
- RES-2 · done 13 Nov · Song structure: arrangement views and arranging by voice (`.claude/research/RES-2-song-structure.md`).

## Ongoing
- QA-1 · qa-tester · daily session on the live build, bugs and up to 3 ideas a day. 13 Nov: 8 bugs (6 fixed in UX-2/AI-4, 1 → UX-3, 1 → SE-1), 2 ideas in requests (Capture MIDI, variation history), 1 folded into AI-3 (`QA-1-daily-2026-11-13.md`). 14 Nov: Song view solid; 1 high bug → UX-7, 2 low → AI-1/UX-7; 3 ideas (song builds energy, Extended mix, Drop as a variation) (`QA-1-daily-2026-11-14.md`). 15 Nov: main healthy (UX-2, UX-5, SE-3 work); 6 bugs → SE-8, AI-6 (4), UX-10; 3 ideas in requests (scale mode in the editor, export just the section, 'another one but keep the …') (`QA-1-daily-2026-11-15.md`).

## Follow-ups noted (not on the board yet)
- 16 Nov: tapping the orb while listening isn't an off switch (only the tick is); quantized performance mutes ('drop the hats at the next bar') idea from the UX-11 market check; if choke groups are added, a muted closed hat must not cut the open hat.
- 15 Nov: 'turn it down' moves every fader -3 dB but the master glue/limiter pulls output back (~0.6 LUFS quieter): needs a stored post-limiter output gain (SE). 'transpose/move the melody up an octave', 'speed up the melody' still add parts offline (AI). Typed 'Keys, again' does nothing (AI). Whole-song MP3 very slow and the status only updates every 16 bars. Keys reply repeated in the chip box under it. Loop MP3 (makeMp3) still targets 0.97 peak. Save/reopen smoke checks flaky under heavy machine load; check.sh 3-5 min under load. Space bar play/stop shortcut. Song area focused with the editor open: Ctrl+A highlights notes, Delete removes the section. ~11 px sideways scroll at 390/360 px. newSong() keeps the last song's tempo. Short/Just the loop replaces an edited layout without asking. Live AI can't see track EQ/low cut (add to projectState or a relative EQ field). Channel EQ is before the compressor, no 200-500 Hz band (SE-1). A re-sung take moves to the bottom of the track list. newSong() always opens in Loop mode. Loop recording makes one undo step per note. Offline parser reads '...at 124' as 122 bpm (maker.js). Song-mode editor shows 'Pattern for Intro: A' next to 'Pattern A plays only in Drop'. Sideways Keys chat 41 px tall on phones. Keys orb has a gradient (owner's call).

## Done
- 14 Nov 2026 · UX-2 studio fixes, UX-5 sung-part placement, SE-3 drummer feel + swing ladder (Worker deployed) · 0442d78.
- 13 Nov 2026 · UX-1 Song view (Loop/Song switch, Make it a song, sections, parts, patterns A/B) · 50b6315.
- 13 Nov 2026 · Vibe-aware beats (genres, 40+ artist references, a fresh variation every time), Spotify/typed taste, singing bass/chords/melody through the assistant, voice notes, import audio/MIDI, audio to notes, Ableton-style editing (select, copy, velocity, undo), the dev team.
