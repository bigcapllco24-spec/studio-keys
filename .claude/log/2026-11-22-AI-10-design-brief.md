# AI-10 · Design mode (no code) · assistant-dev · 22 Nov 2026
Read `.claude/standards/dev-standards.md` first ("Owner rules from 19 Nov 2026": music ducks while the user talks; "Saying Keys wakes it" is AI-13, related; singing rules: only drums play during a take).
Research pack (read it, use its numbers): `.claude/research/RES-7-ableton-ui-ducking-models.md`, part B and its "For the devs (AI-10)".
Repo: read-only copy `git clone -q https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-ai10d` (main). Study src/assistant.js (listening, recogniser, TTS), src/mic.js, src/mixer.js/src/core.js (master chain; sound-engine-dev owns those — your proposal names what they'd change).

## Owner request (19 Nov)
"When I am talking, the sound being played should ease off so that Keys can listen to the microphone and the person talking properly."

## Write a proposal: /home/claude/reports/AI-10-proposal.md
- Why (one paragraph, plain).
- Flow: what the user does and hears, step by step (music playing → says "Keys, ..." or taps the orb → dip → speaks → Keys replies → music returns), incl. typing, singing takes (never duck), always-listening mode.
- What changes per file and per owner (assistant-dev: triggers, echo-cancelled mic track for recognition where Chrome supports rec.start(track); sound-engine-dev: one duck gain node after the master; studio-ux-dev: a small setting, if any).
- A small mockup if there's any UI (e.g. a "Duck while talking: Off / Light / Normal / Deep" setting): make it as a tiny HTML file using the theme variables from src/head.html and screenshot it to /home/claude/mockups/AI-10/*.png (headless Chrome, deviceScaleFactor 2), or say none is needed.
- Risks (iPhone/Safari, echo, pumping, recognition latency).
- Effort (S/M/L, hours).
- Decisions for the owner (2-3), each with options and a recommended one: depth default, trigger (only after "Keys" vs any voice), mid-cut style vs plain dip.
Plain English for a musician. No code changes. Return the proposal as your final message.
