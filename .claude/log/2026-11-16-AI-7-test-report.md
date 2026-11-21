# AI-7 test report (qa-tester): "Keys keeps listening after you turn it off"

Branch `preview-ai-7` @ 1800bb9, worktree /home/claude/sk-ai-7. Compared with main (6c2d9b1, the branch base) at /home/claude/studio-keys-repo.

## Verdict: READY

No blocking bugs. Every check in the brief passes on the branch. On main, 19 of the same 34 checks fail, so the fix is real.

## Problems (none block; all also happen on main)
1. **Low: the status line says "Press the orb and speak" in the middle of a sung take.**
   Steps: tick Always listening, say "let me sing the bassline", wait for "Sing the bassline now", then untick Always listening.
   Expected: the status keeps "Sing the bassline now: 4 bars…".
   Actual: it changes to "Press the orb and speak, or type below…" and the orb goes idle while the take is still recording (the take itself is fine). Cause: `stopListening()` sets the orb to idle unless Keys is speaking or busy, and it doesn't check for a take or count-in. Screenshot: 09-status-after-off-in-take.png.
2. **Low: 2 recognisers can run for a moment.**
   Steps: listening off, tap the orb, then tick Always listening before the tap times out.
   Actual: 2 recognisers are alive until the tap's one ends (then 1). `startListening` doesn't drop `ASSIST.tapRec`. Real Chrome may raise an "aborted" error on one of them. This is harmless here, but a one-line fix in startListening (kill tapRec).
3. **Cosmetic: after listening is turned off, the sung-notes strip (mic G4 C4 E4…) stays on screen for a few seconds.** Screenshot: 03-listening-off.png.

## What I checked
- `bash .claude/tools/check.sh`: **SMOKE OK: 48 checks · CHECK OK** (1 min 50 s).
- Focused test `qa-ai7.mjs`. It runs in headless Chrome with the fake mic (sing.wav) and a fake SpeechRecognition that counts live recognisers and ends itself every 300 ms like Chrome. Live recognisers are sampled 12 times over 600 ms. Result: **branch 34/34, main 15/34**. The branch scored 33/34 in the full run. The one miss was in my test: a single-sample live count that landed in the 250 ms restart gap. It passes in the re-check (qa-ai7-b.mjs) and fails the same way on main. The console errors were font requests failing because the sandbox has no internet.

| Check | Branch | Main |
|---|---|---|
| On: mic open, 1 recogniser, restarts | pass | pass |
| "Keys add drums" while on adds drums | pass | pass |
| Off: MIC.on false, all mic tracks ended | pass | FAIL (mic stays live) |
| Off: 0 recognisers at 1 s and 2 s, no new starts | pass | pass |
| Off: orb idle, box unticked | pass | pass |
| "Keys add drums" after off (and a late result on the old handler) does nothing | pass (0 tracks, 0 chat) | FAIL (+1 track, 5 chat bubbles) |
| Fast on/off/on/off; on/off/on (1 recogniser, 1 mic track) | pass | FAIL (mic on / 2 recognisers) |
| On/off/on/off with 30, 80, 150 ms gaps; 10 fast taps | pass | FAIL (mic on) |
| Humming box off while listening: mic closes, listening continues; on again reopens | pass | FAIL |
| Mic-button mic survives listening on→off; button still closes it | pass | FAIL |
| Listening opened mic → Mic button stop/start → listening off keeps the user's mic | pass | FAIL |
| Sing bassline, listening off: bass track (9-10 notes, all below C4), no audio track, mic closes | pass | pass |
| Sing bassline, listening on: bass track, listening and its mic stay on, 1 recogniser | pass | pass |
| Listening off during the take: mic stays, take records (14 notes), mic closes at the end | pass | FAIL (mic stays open) |
| Listening off during the count-in: same | pass | FAIL |
| Humming off + listening, off during the take (the take opened the mic): closes at the end | pass | FAIL |
| Listening off→on during the take: take records, listening and mic on after, then off closes all | pass | FAIL on the final off |
| Orb tap (listening off) → "add drums": drums added, orb idle, nothing left listening | pass | FAIL (mic left on from before) |
| Orb tap while listening → "add a bassline" without the name: handled, 1 recogniser | pass | pass |
| Reload after listening was on: off, unticked, mic closed, 0 recognisers created | pass | pass |
| No page errors or console errors (apart from offline font fetches) | pass | pass |

Not tested: real Chrome speech (it can't run headless), and turning listening off while a take's own mic permission prompt is still open. The fake UI grants permission at once, so that path can't be reached here. From reading the code, the take would quietly not start in that case.

## Files
- Test script: /tmp/claude-0/-home-claude/fd1231b3-9e27-5e0c-bb94-ca302bfe6d7f/scratchpad/qa-ai7.mjs (re-check: qa-ai7-b.mjs)
- Logs: /tmp/reports/AI-7-check.log, /tmp/reports/AI-7-qa-branch.log, /tmp/reports/AI-7-qa-main.log
- Screenshots: /tmp/reports/AI-7-shots/branch/ (01-start, 02-listening-on, 03-listening-off, 04-hum-off-while-listening, 05-mic-button-survives, 06-off-during-take, 07-orb-tap, 08-after-reload, 09-status-after-off-in-take), /tmp/reports/AI-7-shots/main/
