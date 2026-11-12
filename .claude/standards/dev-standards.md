# Studio Keys development standards
Owned by the lead. Every developer reads this before every job. Last updated: 13 Nov 2026.

## What Studio Keys is for (the owner's words, 12-13 Nov 2026)
- "A talk assistant to make, mix and produce music, and a software like Ableton/FL in it."
- The user should be able to recreate the song in their head just by talking to the assistant and singing to it.
- The assistant reacts to its name. Humming or singing notes goes onto a track. Asking for drums adds one drums track.
- Beats follow the vibe: "124 bpm drums with hi-hats and claps like Ben Böhmer or Stephan Bodzin" must sound like that, and asking again must give something different, not the same pattern.
- Personal taste: the assistant learns what the user likes (Spotify top artists, tracks and their own playlists, or artists they type) and leans that way when they don't name a style.
- Singing is part of talking to the assistant: on a beat the user made, they can sing a bassline or chords and it lands on the track.
- Editing must be as direct as Ableton: drag notes, select, copy, undo, drop in voice notes and files, move clips.
- The owner's own taste: melodic house and techno (Ben Böhmer, Stephan Bodzin, Afterlife sound). Use it as the quality reference.

## How we build
- Source in `src/`, one file per area (see `.claude/CLAUDE.md` for owners). `python3 tools/build.py` writes `index.html`; never edit `index.html` by hand.
- Plain modern JavaScript in the shared bundle (`'use strict'`, no modules, no build tools, no frameworks, no CDN imports). Functions and globals are shared across files, so search before naming something new (`grep -n "function name\|const name" src/*.js`).
- The page must keep working opened as a local file (no server), with the assistant falling back to the offline parser. Hosted features (AI, Spotify) degrade with a clear message.
- Everything the user makes stays in their browser (localStorage for settings, IndexedDB for songs and recordings). No accounts, no analytics, no third-party trackers.
- Keep `cloudflare/worker.js` free of backticks and `${` (the deploy embeds it with `String.raw`).

## Quality bar
- `bash .claude/tools/check.sh` passes: build, bundle syntax, Worker syntax, headless smoke test. No console errors.
- Every change is undoable (anything that changes the song goes through `saveProject`).
- Assistant: a request gets a spoken reply in under about 8 seconds on the live site; the reply says what changed in musical words. Every new action exists in the Worker prompt, `actions.js` and `maker.js`.
- Sound: no clipping on the master with a full song; drums and bass audible on laptop speakers and solid on big speakers; new sounds have effect presets and matched levels.
- UI: the "matte studio" theme (13 Nov 2026; the owner wants matte, neutral, classy colours, not gradients or neon, and nothing that looks like Gemini or playcapcade): warm charcoal panels (`--bg`, `--panel`, `--raised`), ivory text (`--ink`), one muted brass accent (`--accent`) for primary actions, sage (`--signal`) for pads and displays, muted category and track colours, Fraunces serif (`--serif`) only for headings, Manrope for everything else, a faint grain texture, no glows. Use the CSS variables, never hard-coded colours. Short musician-friendly labels, works from tablet to desktop, keyboard shortcuts shown in titles or hints.
- Performance: the page stays responsive while playing 6+ tracks; no work over ~50 ms on the main thread without a toast or chunking.

## How we work
- Two gates: the owner approves the design, then tries the test link. Bug fixes with no design choices skip the first gate.
- Test links: `https://studio-keys.bigcapllco24.workers.dev/p/preview-<id>/`. They use the live Worker, so prompt changes on a branch aren't active there until release.
- Reports are short and honest: what changed, how it was tested (with numbers), what's left.
- Copyright: no samples, presets, melodies or lyrics copied from songs or commercial packs. Artist references are about style (tempo, groove, sound choices), never copying their music.

## Owner preferences log
- 13 Nov 2026: wanted friendlier, more attractive colours, not orange (a little warm peach is fine). First tried a violet/pink theme; the owner said it looked like Gemini or playcapcade and asked for matte, neutral, classy colours. Shipped the matte studio theme.
- 13 Nov 2026: wants a dev team like the games team that uses the app, fixes bugs, looks for upgrades, suggests them and asks for final approval.
