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

## Production and assistant rules (owner, 13 Nov 2026)
- The assistant builds ONE element at a time and only what was asked; it suggests the next step instead of adding it. "Make a track like X" = vibe + drums, then ask.
- It keeps the song's vibe: never switches artist or style unless the user names one (the app also guards against invented references).
- Every new part gets a producer's starting effects for its role and style (`roleFx` in `src/music.js`): low cuts, compression, kick sidechain on bass/pads/plucks in club styles, reverb and dotted-1/8 delay sends, width. Each track has an FX button (EQ plus effects users add as needed).
- The bar is professional, club-ready sound that matches the owner's Spotify artists, never amateur or "AI-generated". Measure against reference tracks.
- Singing is part of talking to the assistant: while a part is sung, only the drums play (`TAKE_GUIDE`), humming is never thrown away as speech (`isSpeechy`), the singer's notes are NEVER played back live (the owner found the delayed copy confusing), and the part is only heard once it's analysed from the recording (`audioToNotes`), quantized and mixed. The mic turns off after a take it started. The raw recording of a sung part is NOT added as a track (owner, 13 Nov: no default vocal part); only explicit voice notes are audio tracks.
- "Add a choir / melody / flute" always adds a NEW track; replacing a part only when the user says replace or change.

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
- UI: three colour themes chosen with the dots in the top bar (13 Nov 2026; the owner wants colours of passion, creativity and emotion; no orange, brass or charcoal, nothing that looks AI-generated, Gemini-like or like playcapcade): **Emerald** (default since 13 Nov, the owner's favourite: bottle green, jade, mint), **Velvet** (wine red, crimson, rose) and **Sapphire** (deep navy, azure, ice). Matte: solid colours, no gradients or glows. All colours come from CSS variables in `:root` and `:root[data-theme=...]` in `src/head.html` (surface tiers `--t0`..`--t9`, `--bg`, `--panel`, `--raised`, `--line`, `--ink`, `--muted`, `--accent`, `--signal`); canvases read them through `TC` (refreshed by `setTheme`). Never hard-code colours. Fraunces (`--serif`) for headings only, Manrope for everything else. Short musician-friendly labels, works from tablet to desktop, keyboard shortcuts shown in titles or hints.
- Performance: the page stays responsive while playing 6+ tracks; no work over ~50 ms on the main thread without a toast or chunking.

## How we work
- Two gates: the owner approves the design, then tries the test link. Bug fixes with no design choices skip the first gate.
- Test links: `https://studio-keys.bigcapllco24.workers.dev/p/preview-<id>/`. They use the live Worker, so prompt changes on a branch aren't active there until release.
- Reports are short and honest: what changed, how it was tested (with numbers), what's left.
- Copyright: no samples, presets, melodies or lyrics copied from songs or commercial packs. Artist references are about style (tempo, groove, sound choices), never copying their music.

## Owner preferences log
- 13 Nov 2026: wanted friendlier, more attractive colours, not orange (a little warm peach is fine). First tried a violet/pink theme; the owner said it looked like Gemini or playcapcade and asked for matte, neutral, classy colours. Then tried matte charcoal with brass; the owner said the orange-ish accent looked AI-generated and disliked the background, and asked for colours of passion, creativity and emotion. Shipped three themes; the owner loved Velvet (wine red) and asked for two other shades, so the set is Velvet, Sapphire and Emerald. Users can flip between them.
- 13 Nov 2026 (later): wants per-track FX, Ctrl/Cmd multi-select, singing inside the assistant, one element at a time, professional sound that matches his Spotify artists, and the green theme as default.
- 13 Nov 2026: users must be able to download what they make as an MP3 (shipped: Download MP3 button and the assistant's export action).
- 13 Nov 2026: wants a dev team like the games team that uses the app, fixes bugs, looks for upgrades, suggests them and asks for final approval.
