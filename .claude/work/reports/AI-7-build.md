# AI-7 build report: listening off really turns Keys off (assistant-dev)

Branch `preview-ai-7`, worktree `/home/claude/sk-ai-7`, commit `1800bb9` (not pushed).

## What I found (the lead's points checked)
- Confirmed: `stopListening()` never closed the microphone that `startListening()` opened for humming. The mic indicator stayed on and the pitch tracker kept running.
- Confirmed: every recogniser's `onend` restarted itself while `ASSIST.listening` was true. A quick off then on left the old one restarting as well, so 2 were live. `stop()` also let a final result arrive after "off". On main, a fake "Keys add drums" sent after off still added 2 tracks.
- Confirmed: unticking the humming box never closed the mic.
- A second race the lead didn't list: turning on and then off before mic permission resolved still opened the mic afterwards. A quick off/on could also open two mic streams.
- Reload: `store.set('asListen')` is written but never read anywhere, so listening never switches itself back on after a reload. That meaning is unchanged. The browser can restore the old tick on the checkbox after a reload, which shows "on" while Keys is off, so I now clear it at boot.
- Orb tap: while listening is on, a tap only re-arms. It is not an "off" control. On main the only off control is the "Always listening for my name" tick. I didn't change what the orb does (that would be a design change).

## What changed
- `src/assistant.js`
  - `dropRec`/`killRec`: on off, the recogniser loses its handlers and is aborted, so it gets no restart and no late results.
  - Restarts and results only count for the current recogniser (`ASSIST.rec===rec`). `startListening` drops any old recogniser first.
  - New `releaseListenMic()`, called by `stopListening` and by humming off. It closes the mic unless the user opened it with the Mic button (`MIC.byUser`). During a sung take (`LOOP.state` take or counting) it keeps the mic open and sets `TAKE.micByTake=true`, so the take closes it when it ends.
  - `stopListening` also aborts a pending orb-tap recogniser, clears pending hum notes and the wake window, and sets the orb to idle.
  - `#asListen` is unticked at boot.
- `src/mic.js` (studio-ux-dev's file, a small helper as the brief allows)
  - `micStart(byUser)` runs one opening at a time: a second call waits for the first.
  - `micStop()` while permission is pending cancels the opening.
  - `MIC.byUser` is set when the Mic button opened the mic.
  - The async body is now `micOpen()`. Existing callers (`TAKE.start`'s `await micStart()`) work unchanged.
- `tests/smoke.mjs`
  - One `evaluateOnNewDocument` fake SpeechRecognition (speech can't run headless anyway).
  - One check: "listening off (even off-on-off fast) releases the mic and leaves no recogniser running".
- `index.html` rebuilt with `tools/build.py`.

## How I tested
Focused headless test, saved at `/tmp/reports/AI-7-listen-test.mjs`. It uses the fake mic `sing.wav` and a fake recogniser that ends itself every 300 ms like Chrome does and counts live instances. Results: **branch 14/14, main 5/14**.

| Check | Branch | Main |
|---|---|---|
| On: mic open, 1 recogniser, restarts | yes (3 starts in 1.5 s) | yes |
| Off: MIC.on false, tracks ended, 0 live, orb idle, no restarts 1 s later | yes | no (mic on, 1 live track) |
| On→off→on fast | 1 live, 1 track | 2 live |
| Off→on→off fast | 0 live, mic off, nothing pending | no (mic on) |
| On→off before permission | opening cancelled, 0 tracks | no (mic opened) |
| Mic-button mic survives listening off | yes, and the button still closes it | n/a |
| Humming off while listening | mic closed, listening stays (1 live); humming on reopens it | no |
| Listening off during a take | mic stays for the take, closes at the end | no (stays on) |
| Speech after off | ignored (0 bubbles) | 13 bubbles, 2 tracks added |
| Reload with asListen=true stored | off and unticked | same |
| Page errors | 0 | 0 |

`bash .claude/tools/check.sh` result: **SMOKE OK: 48 checks · CHECK OK**. The existing "mic turns off after a take" check still passes.

## For the lead and other developers
- UX-4 (phone layout): any phone off control must call `stopListening()`, or untick `#asListen` and dispatch `change`. It must not just hide the panel. Code that opens the mic for the user should call `micStart(true)` so Keys never closes it.
- `micStart` is no longer an `async function` but still returns a Promise, so `await micStart()` works.
- No Worker or prompt change, so no Worker deploy is needed.

## Known limits
- Real Chrome speech can't run headless. The recogniser is faked; the mic and stream tracks are real (fake device).
- If the user opens the mic with the Mic button while listening's own permission request is still pending, the mic is marked as the user's. I think that's the right call.

## Fix 1 (lead's notes after QA) · commit `153caf6`
- `stopListening()` during a sung take or count-in (`LOOP.state` take/counting) no longer resets the orb, the status or the sung-notes strip, so the take's own status stays on screen. Outside a take it still goes to idle.
- `startListening()` now drops a pending orb-tap recogniser (`ASSIST.tapRec`). Off, then tap the orb, then tick Always listening leaves exactly 1 recogniser.
- (optional, done) Listening off clears the sung-notes strip (`#asNotes` hidden, `ASSIST.sung` emptied) when no take is running.
- Only `src/assistant.js` changed, plus the rebuilt `index.html`.
- Tests: `/tmp/reports/AI-7-listen-test.mjs` now has 3 more checks: count-in status kept ("Get ready…" and the orb still listening), orb tap then listen gives 1 live and 0 after off, and the strip clears. Result: **17/17**. `check.sh`: **SMOKE OK: 48 checks · CHECK OK**.
