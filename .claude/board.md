# Studio Keys board (mirror of Studio Keys HQ)
Last updated: 22 Nov 2026, 03:20 IST (end of the Sat 23:13 IST check-in)

## Awaiting build OK (owner tries the test link, in HQ)
- UX-14 · studio-ux-dev · M · Bug (owner 19 Nov): sung notes kept exactly as sung (no key snapping, better note detection, octave basslines, chords built on sung roots, AI can't add a generated part over a take). INCLUDES UX-10 (gapless take recorder): approving UX-14 releases UX-10. Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-14/ · head e92e25f · tester READY (`UX-14-test.md`, 92 checks, lab 238/239 notes exact). No Worker change. Merge note: singAlone() + AI-9's onePart() at the top of runActions.
- SE-4 · sound-engine-dev · S-M · Producer chords (open voicings every style; mostly plain + add9/7ths; 9 new progressions; 2-bar holds; straight melodic/organic house percussion). Round 1. https://studio-keys.bigcapllco24.workers.dev/p/preview-se-4/ · head 952403c · tester READY after fix 1 (`SE-4-UX-15-retest.md`, 84 checks). No Worker change.
- SE-10, SE-9, SE-8, SE-7 (7a + 7b/7c on preview-se-7bc), UX-10 (also inside UX-14), UX-9, UX-8, UX-4, UX-6: unchanged since 17 Nov (see HQ).

## Awaiting design OK (owner, in HQ)
- AI-10 · assistant-dev (+ sound-engine-dev, studio-ux-dev) · M · Music ducks while you talk to Keys (-15 dB in ~75 ms, -10 dB while Keys answers, back over 0.8 s; never during takes; echo-cancelled mic on Chrome). Round 1. `.claude/work/proposals/AI-10.md`. Market great 5/5. 3 decisions.
- UX-16 · studio-ux-dev · L (step 1) · Ableton-like studio in 6 steps; step 1 = one-screen frame on laptops (Keys right sidebar, controller drawer, docked editor, side panel). Round 1. `.claude/work/proposals/UX-16.md`. Market good 4/5. Built after UX-4. 3 decisions.
- UX-11 · drum-sound mute/solo (since 15 Nov).

## In build (fix rounds; next check-in resumes from `.claude/work/reports/`)
- AI-9 · assistant-dev · M · Keys changes only the part you name + conversation memory (owner bug 19 Nov; QA bugs 21 Nov 1,2,4,5,6). preview-ai-9 head 8ee32bd. Tester NOT READY (`AI-9-test.md`), fix 1 done (`AI-9-fix1.md`, 98 checks). NEXT: tester re-check, Llama test of the prompt (ONE PART AT A TIME, THE CONVERSATION, reshape/revert actions), then test link; release deploys the Worker.
- SE-11 · sound-engine-dev · S · Ableton zip stems add up to the mix (QA bug 21 Nov). preview-se-11 head e1d945b. Tester NOT READY (Drive/Bitcrush case, `SE-11-test.md`), fix 1 done (`SE-11-fix1.md`, Master Drive stem). NEXT: tester re-check.
- UX-15 · studio-ux-dev · M · Sustain + knobs on any MIDI controller (owner bug 19 Nov). preview-ux-15 head 7d891d9. Re-check NOT READY (one medium: a normal pedal tapped on chords can auto-flip and then stops learning; low: toast `act` class click-through; 'Flip it?' hint after a long held pedal) (`SE-4-UX-15-retest.md`). NEXT: fix 2 brief to studio-ux-dev, then re-check. Owner question: which other keyboard?
- UX-18 · studio-ux-dev · S · Header jumps 37 px on autosave at 1400-1600 px (QA 21 Nov). Not started.

## Up next (designs, owner-approved requests)
- AI-11 · better AI model (owner question 19 Nov): side-by-side test gpt-oss-120b (Workers AI) vs Claude Haiku 5.5 (needs owner key + OK). RES-7 part C.
- AI-12 · 'make it a song' builds the whole track per instrument like a producer (AI-1 note).
- AI-13 · say 'Keys' any time to wake it (AI-7 note); shares listening code with AI-10.
- UX-17 · drag-select, copy/paste/duplicate everywhere (AI-6 note).

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
- QA-1 · qa-tester · daily session on the live build, bugs and up to 3 ideas a day. 13 Nov: 8 bugs (6 fixed in UX-2/AI-4, 1 → UX-3, 1 → SE-1), 2 ideas in requests (Capture MIDI, variation history), 1 folded into AI-3 (`QA-1-daily-2026-11-13.md`). 14 Nov: Song view solid; 1 high bug → UX-7, 2 low → AI-1/UX-7; 3 ideas (song builds energy, Extended mix, Drop as a variation) (`QA-1-daily-2026-11-14.md`). 15 Nov: main healthy (UX-2, UX-5, SE-3 work); 6 bugs → SE-8, AI-6 (4), UX-10; 3 ideas in requests (scale mode in the editor, export just the section, 'another one but keep the …') (`QA-1-daily-2026-11-15.md`). 16 Nov: main healthy (new genres, mixer, songs list, MIDI recording); 8 bugs → UX-12 (2), AI-8 (5), SE-9 (1); 3 ideas in requests (master meter, audition songs from the list, Basic mode answers questions / did you mean) (`QA-1-daily-2026-11-16.md`).

## Follow-ups noted (not on the board yet)
- 17 Nov (QA): long loops render slowly (4 bars 13 s, 8 bars 40 s, 16 bars 155 s headless; a 16-bar loop MP3 about 3 min; more common after UX-13); double-clicking a Song-view section mostly starts a rename (name covers 122 of 149 px; song.js ~427, `.sec .sname` in head.html) instead of looping; in Song view the import toast is replaced at once by "'Drums' plays in Drop"; save/reopen smoke pair flakes under load (tester offers to wait for the autosave instead of a fixed 600 ms); Basic 'add an arp' does nothing; first visit on a laptop shows the controller, Keys box below the fold (also an idea in requests); Sound Lab sampler and synth from the same slice share a name; Song-mode Ableton zip exports only the loop (idea in requests); a legato voice note with no quiet stretch gives zero notes on main (fixed by UX-10's gate; add a legato smoke check when UX-10 ships).
- 16 Nov (QA): offline 'just the drums and bass', 'turn the drums down then bring them back up', 'save the beat' remake parts; 'add a melody and give me another one' varies the first Melody (`ACT.vary`); Basic 'chords reverb 25' adds Chords 2; 'add a bassline' gives the identical bassline 2-3 in 12; reply to 'save the song' ends with the MP3 tip; LCD '1 TRACKS' (controller.js:128); master EQ shared by every song and not in undo; Charlotte de Witte melody uses Acid Bass; 'liquid dnb like Netsky' sets only the vibe; assistant reply says 'Saved' on the very first failed save (sync runActions); Llama's own reply can claim 'saved'.
- 16 Nov: tapping the orb while listening isn't an off switch (only the tick is); quantized performance mutes ('drop the hats at the next bar') idea from the UX-11 market check; if choke groups are added, a muted closed hat must not cut the open hat.
- 15 Nov: 'turn it down' moves every fader -3 dB but the master glue/limiter pulls output back (~0.6 LUFS quieter): needs a stored post-limiter output gain (SE). 'transpose/move the melody up an octave', 'speed up the melody' still add parts offline (AI). Typed 'Keys, again' does nothing (AI). Whole-song MP3 very slow and the status only updates every 16 bars. Keys reply repeated in the chip box under it. Loop MP3 (makeMp3) still targets 0.97 peak. Save/reopen smoke checks flaky under heavy machine load; check.sh 3-5 min under load. Space bar play/stop shortcut. Song area focused with the editor open: Ctrl+A highlights notes, Delete removes the section. ~11 px sideways scroll at 390/360 px. newSong() keeps the last song's tempo. Short/Just the loop replaces an edited layout without asking. Live AI can't see track EQ/low cut (add to projectState or a relative EQ field). Channel EQ is before the compressor, no 200-500 Hz band (SE-1). A re-sung take moves to the bottom of the track list. newSong() always opens in Loop mode. Loop recording makes one undo step per note. Song-mode editor shows 'Pattern for Intro: A' next to 'Pattern A plays only in Drop'. Sideways Keys chat 41 px tall on phones. Keys orb has a gradient (owner's call).

## Done
- 22 Nov 2026 · AI-1 song sections by voice (Worker deployed) · d18ef74.
- 21 Nov 2026 · AI-4, AI-6, AI-8 offline Keys fixes, AI-7 listening off, UX-7, UX-12, UX-13 (Worker deployed) · d35b13f.
- 14 Nov 2026 · UX-2 studio fixes, UX-5 sung-part placement, SE-3 drummer feel + swing ladder (Worker deployed) · 0442d78.
- 13 Nov 2026 · UX-1 Song view (Loop/Song switch, Make it a song, sections, parts, patterns A/B) · 50b6315.
- 13 Nov 2026 · Vibe-aware beats (genres, 40+ artist references, a fresh variation every time), Spotify/typed taste, singing bass/chords/melody through the assistant, voice notes, import audio/MIDI, audio to notes, Ableton-style editing (select, copy, velocity, undo), the dev team.
