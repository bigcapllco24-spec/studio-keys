# SE-10 branch check (qa-tester, 17 Nov 2026)

Branch `preview-se-10` at e1c7a3c, worktree /home/claude/qa-se-10 (clean, nothing committed). Baseline: main 5f3714d built at /tmp/qa/se-10/main.

## Verdict: READY (both bugs fixed, no regressions found). One caveat about check.sh, below.

### Caveat: check.sh failed 2 of 6 runs on the branch, on two save/reopen checks that SE-10 doesn't touch
- Branch runs: 4 passed (`SMOKE OK: 49 checks, CHECK OK`, 100-141 s, under the 3-minute limit). 2 failed with the same two checks:
  - `FAIL song: opening the app starts a new empty song; the last one reopens from the list intact · new song had 0 tracks; reopened "Smoke sing" 4 tracks, 3 sections`
  - `FAIL song: Undo right after opening a song stays in that song · after one change + Undo: "Smoke sing" 4 tracks, 3 sections`
- Main: 5 of 5 passed (47 checks) at the same machine load (load average 3-5; another tester was running Chrome at the same time).
- Why I think it's a timing flake, not SE-10: the diff only changes voice wiring (`core.js`), one call in `noteOn` (`play.js`) and Sound Lab extract (`lab.js`). None of that runs in the save → reload → reopen flow. The two new SE-10 checks run after these ones. In the failing runs the songs list still had an older save of the same song (4 tracks, from the "Smoke sing" step) and not the "Before reload" save (5 tracks). That points to the save made 600 ms before the reload not landing on a busy machine. In two instrumented runs side by side (double load) the reopen check passed both times. A different timing check failed instead: "a relaxed double-click (0.35 s) on a part opens the editor". So the suite has load-sensitive checks.
- What to do: rerun check.sh right before the merge (the release rule still applies: a FAIL blocks). I'll make the reopen check wait for the songs-list save before it reloads, as a QA test-upkeep item (tests/** only). I haven't changed anything on this branch.

## 1. check.sh
First run: `PASS bundle syntax`, `PASS worker syntax`, `SMOKE OK: 49 checks`, `CHECK OK`. index.html was up to date (no rebuild note). The 2 new smoke lines pass: "pitch and mod wheels bend the notes you play, not the song · song 0/2 wired, live 2 wired" and "Sound Lab says a silent part is silent and keeps Add off".

## 2. Re-running my repro paths (main → branch)
Headless Chrome, fake MIDI, master output tapped, pitch measured by autocorrelation.

Bug 1: the wheels bend the song
| | main | branch |
|---|---|---|
| Song bass A2, wheel at rest | 110.0 Hz | 110.0 Hz |
| Pitch wheel full up | 123.5 Hz (+200 cents) | 110.0 Hz (0 cents) |
| Pitch wheel full down | 98.2 Hz (-196 cents) | 110.0 Hz (0 cents) |
| Mod wheel 127, song bass spread (median 110.3) | 108.9-111.9 Hz | 109.7-111.1 Hz (same as mod 0: 110.0-111.4) |
| Song drum voices wired to the wheels in 2 s | 151/151 | 0/152 |
| Wheel already up, then press Play | bass 123.5 Hz (+200 c) | 110.0 Hz (0 c) |
| Live A3 on keys + song bass together, wheel up: song bass | 123.5 Hz | 110.0 Hz |
| Live A3 (piano), song running, rest / wheel up | 220.5 / 247.8 Hz | 220.5 / 247.8 Hz (+202 c, same) |
| Live A3, mod 127 spread | 217.2-252 Hz | 217.2-234.6 Hz (wobbles; my window is noisy on piano, median 221.6 on both) |
| Live A3, song stopped, rest / up | 220.5 / 247.8 | 220.5 / 247.8 |
| Sustain pedal: key released, note held by the pedal, then bend | +202 c | +202 c |
| Note recorded with the wheel up, played back with the wheel up | 1/1 wired | 0/1 wired |
| Editor note preview with the wheel up | 2/2 wired | 0/2 wired |
| Offline render of the bass, wheel up + mod 127 | 110.0 Hz, peak -4.33 dBFS | 110.0 Hz, peak -4.33 dBFS |
| On-screen keys, computer keys, drum pads, mic-played notes | all wired | all wired (same) |
| `A.wheelLive` counter after everything | (none) | 0, no leak |
| Page errors | 0 | 0 |

Bug 2: the Sound Lab makes an instrument out of silence
| | main | branch |
|---|---|---|
| 3 s digital silence, Lead, Extract | "Lead synth from 'silence'", Add on | "That part is silent — pick a section with sound.", result panel empty, Add hidden and disabled |
| Then Add as sampler + Add as synth | 2 sounds added, keys switch to "Lead synth · silence" | nothing added, keys stay on Grand Piano |
| White noise at -60 dBFS | instrument made | refused |
| Silence, "already a separated stem" mode | n/a | refused |
| 220 Hz sine at -45 dBFS (Lead) / -48 dBFS (Bass) | made | made, root 220 Hz |
| Sine at -45 dBFS in stem mode | made | made |
| Good Bass extract, then silence | n/a | old result cleared, Add off |
| Silence, then demo-loop Lead | n/a | Add back on, Add puts 1 sound on the rack, plays from MIDI at peak -4.8 dBFS |
| Phone (390 px) | n/a | message wraps cleanly, no sideways scroll |

## 3. Regression hunt
- Every instrument (55, including 3 Sound Lab customs: Lead sampler, Lead resynth, Kick one-shot) played live through `noteOn` and through the song scheduler (`scheduleEvent`). Live: 141/141 sources wired on the branch, the same per instrument as main. Song: 0 wired on the branch (113 on main). No errors, and no instrument makes its voice late, so none can slip past the flag.
- Every `inst.play` call site checked: song (`studio.js`), looper (`looper.js`) and editor preview (`daw.js`) are not wired. MIDI keys and pads, on-screen keys, computer keys, pads and the mic all go through `noteOn` → `playLive`.
- Demo loop at 0, -20, -30 and -40 dB for all 7 elements (Kick, Snare, Hats, Bass, Lead, Pad, Vocal): 28 of 28 extracted, same roots as main (bass 45.8, lead 587.2, pad 98.5, vocal 109.9 Hz). No false refusals.
- Real singing (`tests/fixtures/sing.wav`, peak -10.6 dBFS) as Vocal, Lead and Bass at 0 and -30 dB: all extract (root 392 Hz). At -40 dB (peak -50.6 dBFS, below the threshold) it is refused. That matches the design: the threshold is about 40 dB below a normal recording.
- Offline render and export: never wired on either build. Level is unchanged.

## 4. Try steps for the test link (for a musician)
1. Press Play on a beat with a bassline. Push the pitch wheel all the way up and wiggle the mod wheel, without touching any keys. The song stays in tune and the drums don't change.
2. Now hold a key while the song plays and push the pitch wheel up. The note you play still bends up a whole tone and wobbles with the mod wheel, like before.
3. In the Sound Lab, load a silent recording (or select a silent stretch), pick Lead synth and press Extract. It says "That part is silent — pick a section with sound." and you can't add it.
4. Press "Reload demo loop", pick Lead synth, Extract. The sound appears and "Add as sampler" works.

## Files
- Scripts: /tmp/qa/se-10/js/w-wheel.mjs, /tmp/qa/se-10/js/w2.mjs, /tmp/qa/se-10/js/l-lab.mjs, /tmp/qa/se-10/js/s-sweep.mjs, /tmp/qa/se-10/js/p-phone.mjs
- Raw numbers: /tmp/qa/se-10/js/w-main.out, /tmp/qa/se-10/js/w-branch.out, /tmp/qa/se-10/js/w2-main.out, /tmp/qa/se-10/js/w2-branch.out, /tmp/qa/se-10/lab-branch.json, /tmp/qa/se-10/lab-main.json, /tmp/qa/se-10/sweep-branch.json, /tmp/qa/se-10/sweep-main.json
- check.sh logs: /tmp/qa/se-10/check.log (pass), /tmp/qa/se-10/check2.log and /tmp/qa/se-10/check3.log (the flaky fails), /tmp/qa/se-10/check4.log, /tmp/qa/se-10/alt-*.log, /tmp/qa/se-10/main-check*.log
- Screenshots: /tmp/qa/se-10/shots/branch-lab-silent.png, /tmp/qa/se-10/shots/main-lab-silent.png, /tmp/qa/se-10/shots/branch-phone-lab-silent.png, /tmp/qa/se-10/shots/branch-lab-end.png, /tmp/qa/se-10/shots/branch-w-end.png
