# UX-4 design brief (studio-ux-dev, Design mode), 13 Nov 2026 14:25 IST

Read `.claude/standards/dev-standards.md` first. Quoted: "Short musician-friendly labels, works from tablet to desktop"; three matte themes from CSS variables in `src/head.html` (Emerald default), never hard-code colours, Fraunces for headings only, Manrope for the rest; "no work over ~50 ms on the main thread"; the page must keep working as a local file.

The owner's request (HQ, 13 Nov 12:37 IST, his words): "can we optimise the web app for phone as well, it is too mis aligned and one thing - let's keep the Keys assistant first for the phone app and tell me how we can convert this to an app once we have optimised it".

Context: main now has UX-1's Song view (released today). UX-2 (on `preview-ux-2`, not yet released) fixes an 11 px sideways scroll at 390 px and the controller knob row overflow. The owner's north star: make the song in your head just by talking and singing to Keys.

Design mode: NO product code. Work read-only in `/home/claude/studio-keys` (branch main; don't commit there). For screenshots you may run the built `index.html` in headless Chromium (Playwright is pre-installed: `require('playwright')`), e.g. at iPhone 14/15 (390x844), a small Android (360x780) and an iPad portrait (820x1180); save them under `/home/claude/ux4/` as PNG.

Deliver:
1. An audit: screenshots of what's misaligned on phone today (every screen: top bar, Keys assistant, Tracks/Song view, piano roll/editor, mixer, controller, songs list, Your sound), each problem in one line.
2. A proposal for a phone layout where the Keys assistant comes first: what the user sees on opening, how they talk/sing/type to Keys, how they get to tracks, the song, the editor, mixer and keyboard, what's hidden or simplified on phone, thumb reach, safe areas (notch, home bar), the mic and the play button. Step-by-step flow ("open the app → …"). Two or three small mockups of the key phone screens (HTML rendered to PNG with the real theme variables is ideal; save to `/home/claude/ux4/mockup-*.png`).
3. "From web app to phone app": the path once it's optimised. Cover: (a) installable web app now (manifest, icon, home screen, full screen, offline cache) and what that gives on iPhone vs Android; (b) store apps later: Android via a Trusted Web Activity, iPhone/Android via a wrapper such as Capacitor; what each costs (developer accounts: Apple $99/year, Google one-time $25), what changes for the microphone, MIDI (Web MIDI isn't in iPhone Safari), Spotify login and saving songs; your recommendation. Keep it plain for the owner. Note anything that needs his approval (money, new services).
4. Risks, size (S/M/L), what changes by file, and 1-3 decisions for the owner, each with options and a recommended option.
Write the proposal to `/home/claude/ux4/UX-4.md` as you go (save often). Final message: the proposal text, the list of image paths, and decisions as JSON `[{id, question, options[], recommended}]`.
