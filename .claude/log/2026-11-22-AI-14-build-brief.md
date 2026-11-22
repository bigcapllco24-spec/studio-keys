# AI-14 · build (bug fix, no design gate) · assistant-dev · 22 Nov 2026 (16:13 IST check-in)

Read `.claude/standards/dev-standards.md` first. The sections that matter most here:
- "Production and assistant rules": the assistant builds ONE element at a time and only what was asked; "add a … " always adds a NEW track; replacing a part only when the user says replace or change. A song can be short (the Short layout exists).
- "Owner rules from 19 Nov 2026": a comment about one element changes ONLY that element; it never redoes or regenerates the rest of the project (AI-9).
- "Quality bar": every change is undoable (goes through `saveProject`, one undo step); the reply says what changed in musical words; any new action exists in the Worker prompt, `actions.js` and `maker.js`; `bash .claude/tools/check.sh` passes.

## The job
Fix the song-section words that the tester found on the live site after AI-1 shipped (bugs qa-2026-11-22-1,2,3,4,6,7,8). Full steps, expected and actual results for each are in `.claude/work/reports/QA-1-daily-2026-11-22-bugs.json` (bug 5 = SE-12 and bug 9 = UX-19 are NOT yours) and the session report `.claude/work/reports/QA-1-daily-2026-11-22.md`. In short (Basic / offline mode unless noted):
1. (HIGH) "take the kick out of the intro and bring the bass in" (step 4 of the approved AI-1 design, word for word) remakes the whole bassline instead of switching the existing bass part on in the intro. "bring the X in (at/in the <section>)" = turn that part on in that section; never regenerate it.
2. (HIGH) "mute the voice note" / "turn off the voice note" start a NEW voice-note recording. They must mute that audio track (and "unmute / bring back the voice note" undoes it).
3. (MEDIUM) A comment naming a section ("the melody is too loud in the drop") changes the whole song, or nothing, and the reply doesn't say which; "make the drop bigger" isn't understood. Per-section mixing doesn't exist yet (that's a future idea, requests/qa-2026-11-22-section-mix), so: do the honest thing with what exists (change the part and say plainly "I turned the melody down in the whole song; per-section mixing isn't in yet"), and map "make the drop bigger/hit harder" to something real that exists (e.g. what AI-1 offers for drops) or a clear honest reply. No silent whole-song changes.
4. (MEDIUM) Pan requests add or remake parts: "pan the melody left" adds Melody 2, "put the chords a bit to the left" adds Chords 2. Pan words must pan the existing track (left/right/a bit/hard/centre), one undo step.
6. (MEDIUM) "add a breakdown" on a plain loop makes a song that STARTS with a 16-bar Break (31 s of pads first). A breakdown goes after the first main section / before a drop, never first.
7. (LOW) "make it a short song" / "make it a short track" isn't understood; the Short layout exists (Make it a song menu). Map it.
8. (LOW) "the mix is muddy" spends its cuts on a MUTED track (voice note) and the reply leads with it. Skip muted tracks (and say nothing about them).
Plus the offline gap from the UX-19 build report (`.claude/work/reports/UX-19-build.md`, line ~26): "set the key to F sharp minor", "change the key to …", "set the key to F# minor", "make it F sharp minor" parse to no action offline. Let the key regex accept those, add a smoke line.

## Where to work
- Branch `preview-ai-14` OFF `origin/preview-ai-9` (head 5210af0), because AI-9 changes the same files (maker.js, actions.js) and is waiting for the owner's OK; AI-14 ships after it. Work in `/home/claude/sk-ai14` (clone the repo there, `git checkout -b preview-ai-14 origin/preview-ai-9`).
- Your files: `src/maker.js`, `src/actions.js`, `src/assistant.js`, `cloudflare/worker.js` (only if needed). Tests: you may append smoke lines at the END of `tests/smoke.mjs` (one block per bug, as AI-9 did); don't restructure the file.
- Prefer offline/executor fixes. If you change the Worker prompt, keep it minimal, keep it free of backticks and `${`, and list the exact prompt lines in your report so the lead can run the Llama check. The live AI path must be unchanged or better.
- Keep AI-9's rules intact (onePart(), askedParts, spoken-speech rules: no punctuation in test phrases, never block a correct AI action that main runs). Rerun AI-9's smoke block: nothing it passes may break.

## Steps (save as you go)
1. Reproduce each bug offline on the branch (headless, as the tester did) and note the cause.
2. Fix one bug at a time; after each, rebuild (`python3 tools/build.py`), add its smoke line, and commit + PUSH `preview-ai-14` (WIP commits are fine; never push main). The push is how other lead sessions know you're alive.
3. For each bug, also try 3-4 natural variants (other words a musician would say, a Hinglish one where it makes sense) and report pass counts before/after vs main and vs preview-ai-9.
4. `bash .claude/tools/check.sh` must pass at the end (any FAIL blocks; if a known flake fails, rerun once and say so).

## Report
Save to `/home/claude/reports/AI-14-build.md` as you go and reply with the full report: per bug, cause / fix / variants before→after; Worker prompt changes (exact lines, or "none"); check.sh summary; and an 8-step "Try" list written for a musician (what to say, what should happen). Done when: each phrase does what it says on one part or section only (or says honestly that it changed the whole song), with one undo step; smoke lines for each; the live AI path is unchanged or better.
