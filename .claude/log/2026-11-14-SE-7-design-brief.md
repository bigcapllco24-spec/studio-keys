# SE-7 design brief (sound-engine-dev, Design mode), 14 Nov 2026
Read `.claude/standards/dev-standards.md` first. Sections that matter most here: "How we build" (plain JS in the shared bundle, no CDN imports, works as a local file, everything stays in the browser), "Quality bar" (Performance: no main-thread work over ~50 ms without chunking; UI themes from CSS variables only; every change undoable), and "Copyright" (no melodies copied from songs).

Then read your role file `.claude/agents/sound-engine-dev.md` and work in **Design mode** (no code changes; `git status` clean at the end).

## Item SE-7 · L · Key and chord finder: hear a song, see its key, chords and notes
The owner's request (HQ, 14 Nov): "the key detector aint working - check that. we should be able to detect live keys//chords from the songs being played and replciate elements. and also tell us the notes and places it on the project"

Done when: dropping in or playing a song shows the right key (checked on 10+ test songs) and its chords bar by bar; one tap or "Keys, put those chords on my song" adds them as a chords track in the project's key; the key label never says "detected" when it only guessed.

## What we know
- Research pack RES-6 (read it all): `.claude/research/RES-6-key-and-chords.md`. Use its "For the devs" notes (detectKey weighting/confidence/alt, chroma settings, dance-music key profiles from Faraldo's CC BY paper or fitted ourselves, beat-synchronous chord templates + Viterbi, tempo/downbeat, licence limits: no Essentia.js/libKeyFinder/Chordino/madmom; "Camelot" is a trademark, use "DJ key").
- Market check (pre-design): great 4/5. Must-haves: show confidence plus a second-guess key, one-tap correction, use SE-6 stems when they exist, answer "what key is this?" by voice and set the project's key only on yes.
- Code: `detectKey`/`projectKey`/`melodyNotes` in `src/music.js`; key label `#keyInfo` in `src/daw.js` and `src/body.html`; `audioToNotes`/`transcribeTrack`/import in `src/edit.js`; key action in `src/actions.js`, `src/maker.js`, worker prompt in `cloudflare/worker.js`. First reproduce the owner's "key detector isn't working" in the current build (headless Chrome; e.g. a beat with chords and bass but no melody, an imported audio song, a sung melody) and say exactly what goes wrong.
- Related items: AI-3 (reference track: tempo, key, groove, tonal balance) will consume your analysis; SE-6 (stems via HTDemucs) comes later, so "notes from a stem" (Basic Pitch) is a later phase, not this build. Live listening from the microphone is a new mic mode; you may propose it as an option/later phase.

## What to design
The whole user flow (drop a song or play one in the studio → see key, tempo and a chord strip → correct with a tap → "put those chords on my song" / "what key is this?" / "match this loop to my key"), plus the symbolic key fix. Split the build into phases the owner can approve together or one by one (RES-6 suggests 7a key fix S, 7b analyseAudio M, 7c chord strip + voice actions M). This crosses areas: describe exactly what studio-ux-dev (label, chord strip, import UI) and assistant-dev (new actions in worker prompt + actions.js + maker.js + smoke lines) would build, so the lead can brief them.

Mockups: the key label states and the chord strip, desktop 1400x900 and phone 390x844 (the phone layout from UX-4 is on branch `preview-ux-4`; look at it read-only with `git show`/`git worktree` in /tmp, don't switch the main checkout). Use the Emerald theme variables from `src/head.html`.

Decisions for the owner: at most 3, each with your recommendation (e.g. which phases now; live mic listening now or later; show the DJ key code).

## Output
`/tmp/proposals/SE-7/proposal.md` and PNGs in `/tmp/proposals/SE-7/`. Save as you go. Keep the proposal readable for a musician (about 1,000-1,500 words). Final message: the proposal path, the PNG list, a 3-line summary, the decisions with recommendations, and what you found when reproducing the bug.
