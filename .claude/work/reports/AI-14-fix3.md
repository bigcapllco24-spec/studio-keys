# AI-14 fix 3 · assistant-dev · 22 Nov 2026 · preview-ai-14 @ fb765f7 (pushed; WIP 58e0fae)

## Cause
toneFix `cut()` in src/maker.js had a "down" branch: when Keys's own 220 Hz melody cut sat above the tune's lowest note, a mud complaint set the cut to 0.85 × that note. On a melody down to C3 that gave 111 Hz, which opened up 60-220 Hz. Mud got worse. The same 0.85 × cap made a C4 to F#4 melody go 220 → 222 Hz, which changes nothing.

## Change (src/maker.js toneFix, tests/smoke.mjs; index.html rebuilt; no Worker change)
- A mud complaint never lowers a low cut. The "down" branch and its reply wording are gone.
- The cut rises as on main (×1.4, up to the role maximum). On a melody, the rise stops at the lowest real note's fundamental (not 0.85 × it), with a floor of 100 Hz.
- A capped rise under 10% doesn't count as a change, so the cut stays.
- The stray rule now handles up to two slipped notes. They must be more than an octave under the rest and under about 118 Hz, with at least 3 other notes.
- When the tune holds the cut back, the reply says "low cut stays at N Hz" and the low EQ takes 6 dB instead of 3 (floor -12).
- "under its lowest note" is said only when the note capped the cut and the claim is true. The mix reply gives each part's own dB, for example "Melody (low cut stays at 220 Hz, 6 dB)".
- Item 2: "hard right", "hard left", "right side", "left side", "the right side", "all the way left" and "fully right" now answer Keys's "Left or right?". A lone "right" is still treated as agreement unless a pan just happened.
- Smoke tests:
  - fix 5 line: a cut above C3 stays, and the reply says "stays", never "down" or "under".
  - re-check 1 line: adds "hard left" → L 100.
  - re-check 2 line: the stray C1 case ends at 220 Hz or more, plus a two-stray case.
  - new band check: 110-220 Hz must go down.

## Band table (melody alone, 4 bars, band share in dB, tester's band.js / band2.js)
| Case | main | 0903ad1 | fb765f7 |
|---|---|---|---|
| C3 melody, "the melody is muddy": cut | 220→308 | 220→111 | 220→220 (stays), lo -4→-10 |
| … 110-220 Hz | -5.5→-10.2 (**-4.7**) | -6.2→-3.6 (**+2.6**) | -5.5→-6.2 / -5.7→-6.5 (**-0.7/-0.8**) |
| … 60-110 Hz | -6.6 | +9.4 | -3.4/-3.5 |
| C3 melody, "the mix is muddy" 110-220 Hz | -5.7→-10.5 (-4.8) | -5.5→-3.2 (+2.3) | -5.7→-6.4 (-0.7) |
| C4 melody, "the melody is muddy": cut | 220→308 | 220→222 | 220→261 ("under its lowest note", true) |
| … 110-220 Hz | -32.7→-38.5 (-5.8) | -32.4→-32.9 (-0.5) | -32.1→-35.1 (-3.0) |
| Full mix, C3 melody, "mix is muddy" 110-220 | -13.2→-13.3 | -13.6→-13.5 | -13.6→-13.6 |
| Pan answers (right, hard right, right side, to the right, a little right, left, hard left) | all 0 | 40, 0, 0, 40, 20, -40, 0 | 40, 100, 40, 40, 20, -40, -100 |

## Sets (vs 0903ad1)
| Set | 0903ad1 | fb765f7 |
|---|---|---|
| ai.js | 30/33 | 30/33, same lines |
| nb.js | 51/52 | 51/52, same lines |
| ai9.js | 65 | 65, diffs and undo identical |
| bugs.js | 105/107 | 99/107 |
| bugs.js with b8 updated to the new rule | — | 105/107, same 2 fails as 0903ad1 |
| rt.js (settled), run 1 | 117/140 | 115/140 |
| rt.js (settled), run 2 | 117/140 | 116/140 |
| rtu.js | — | identical to 0903ad1 (1 Undo, exact, for all 3 muted-plus-take cases) |

- **bugs.js:** the 6 new fails are the b8 lines. That check asserts the melody cut goes to 131 Hz or under (the old "lower it" rule this brief removes). With the predicate changed to "the cut stays at 220" (/home/claude/qa/ai14f3/bugs-f3.js), every b8 line passes. The tester should update b8 to match.
- **rt.js:** the flipped lines change between runs, and each one is UNDO-DIFF Drums.ev;Bassline.ev;Chords.ev on a take during the count-in. That is the known harness timing; this change touches none of that code.

## check.sh
CHECK OK, SMOKE OK: 120 checks, 0 FAIL, 0 page errors. Load about 1-2; no rerun needed. The new band check reads 110-220 Hz -5.07 → -5.74 dB, with the cut kept at 220.

## Known limit and a decision for the lead
On a melody that goes down to C3, a cut held at the note can only cut low EQ. The low shelf sits at 120 Hz, so 110-220 Hz drops just 0.7 dB. On main it dropped 4.7 dB, because main raised the cut to 308 Hz, deep into the tune; bug 8 called that thinning the tune.
- If the owner's sound bar wants the bigger drop, one option is to let a repeated "still muddy" raise the cut above the lowest notes once the low EQ is used up, with an honest reply.
- Today the third "still muddy" says "already cleaned as far as I'd go".

## Files
- Outputs: /home/claude/ai14f3/ (band-f3, band2-f3, ai/nb/ai9/bugs/rt/rt-run2/rtu, bugs-b8new-f3, check-f3)
- Probe: /home/claude/qa/ai14f3/probe.js
