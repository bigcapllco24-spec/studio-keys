# AI-1 branch check 3 (after the main merge) · qa-tester · 22 Nov 2026
Branch `preview-ai-1` at **adf0a70** (no commits from me).

## Verdict: READY
Song by voice works offline end to end on the merged branch. Everything from main (AI-4/6/8, AI-7, UX-7/12/13) still behaves the same. I found no new bugs. The only check.sh failure was a protocol timeout under machine load, and the rerun passed.

## Problems
None blocking. Rough edges, mostly known from my 15 Nov re-check:
1. **Stale tips (known).** Right after "drop the drums in the outro", the tip offers "take the kick out of the intro", which the user did two requests earlier. That's `nextStep` in `src/assistant.js`.
2. **"A beat of silence before the drop" swaps the snare roll for a kick drop.** The Build already ended in roll + gap (last beat -21.4 dB). After the request it becomes `kickdrop 1` (last beat -27.9 dB) and the roll is gone. It works as designed (smoke checks it), but a producer who just wanted the gap might miss the roll. Low.
3. **Extended/DJ length with a Böhmer vibe is 7:21** ("make an extended mix for my DJ set": 224 bars, Break 64). The approved length is "about 6 minutes". A Bodzin club track is 6:12, as approved. The Böhmer long-break row also makes a drums-only "full track" 3:40 (Break 32). That follows the design ("Böhmer: long break"); I'm flagging it only so the owner isn't surprised. Low.
4. **"add a bassline and give me another one" with a bass already there** answers "Bassline on Pluck Bass in C major", even though the song showed A minor. It's 1 Undo step and changes only the bass notes. The key name in the reply probably comes from `projectKey()` re-reading the notes after I added a played C-E-G part. Low, cosmetic.

## What I checked (numbers)
### check.sh
| Run | Result | Time | Load |
|---|---|---|---|
| 1 | FAIL 1 of 57: "test run · Runtime.callFunctionOn timed out" (protocolTimeout, during the song checks). Other agents had 19 Chrome renderers running | 5:23 | 15-20 on 2 cores |
| 2 | **CHECK OK, SMOKE OK: 91 checks** (bundle + worker syntax PASS) | 6:52 | 13-18 |

The run time is over the 3-minute budget only because of the load (it was 1:50 at load 2 on 15 Nov). For test upkeep, I suggest setting `protocolTimeout` in `tests/smoke.mjs` so that heavy load gives a slow PASS, not a FAIL. I haven't committed that.

### AI-1 flows, typed into the Keys box, AI off (offline brain), Bodzin loop with 4 parts
| Said | Undo steps | Result |
|---|---|---|
| make it a full track | 1 | Intro 16 · Build 16 · Drop 16 · Break 16 · Drop 2 16 · Outro 16 = **96 bars, 3:06**, Song mode. Still 4 tracks |
| make the break longer | 1 | Break 16 → 24 (104 bars, 3:21) |
| a beat of silence before the drop | 1 | Build end → kick drop. Last beat **-27.9 dB** vs -6.4 to -6.6 dB in the bars before; 0 hits start in the last beat |
| (Break into Drop 2, untouched) | | roll 2 + gap: last beat -21.6 dB vs -13.4 dB before; 0 hits |
| add a riser before the drop | 1 | Build → riser = roll + crash 4 bars + gap. Reply: "Risers aren't in the studio yet, so it's a snare roll with a crash." |
| loop the break | 0 | loop range [192, 288] = exactly the 24-bar Break |
| play from drop 2 | 0 | playing, at beat 291.9 (Drop 2 starts at 288), Drop 2 selected |
| mute the kick in the intro | 1 | Intro drums without kick: kick hits in the Intro 64 → **0**, hats and the rest unchanged, Drop kick untouched, drums track not muted |
| make the second drop different | 1 | Drop 2 melody → pattern B; Drop 1 keeps A |
| drop the drums in the outro · remove the second drop · add a second drop | 1 each | Outro drums off; Drop 2 removed, then added back before the Outro |
| Undo × 5 | | back to exactly 96 bars, 3:06, all sections 16 |
| arrange it (drums + bass only) | 1 | Full layout with **no parts added** (2 tracks). The reply suggests chords |
| make it a full club track (Bodzin) | 1 | all sections 32 = **192 bars, 6:12** |
| make an extended mix for my DJ set (Böhmer) | 1 | 224 bars, 7:21 (rough edge 3) |
| make it a full track (Böhmer, drums only) | 1 | 112 bars, 3:40. No parts added. The Break plays the drums (no silent sections) |

Page errors: 0. Reply times offline were 1.1 to 5.8 s under load.

### main's fixes on the merged branch (typed, AI off, house loop with 4 parts)
| Said | Steps | Result |
|---|---|---|
| solo the bass / unsolo the bass | 1 / 1 | solo on, then off ("so every part plays again") |
| mute the drums / unmute the drums | 1 / 1 | OK |
| mute everything but the drums | 1 | Bassline, Chords, Melody muted; drums play |
| unmute everything | 1 | all back |
| more reverb on the chords → remove the reverb from the chords | 1 / 1 | reverb 24 → 44 → **0**; Chords track kept (48 notes) |
| make the bass louder and add some delay to the melody | **1** | bass +2.8 dB and melody delay 16 → 20%; one Undo puts both back |
| quantize my keys to 1/8 (my own part at 0.07, 1.12, 2.71) | 1 | 0, 1, 2.5; no track added |
| add a bassline and give me another one | 1 | the bass notes change, no second bass track |

### Covered by smoke run 2 (all PASS)
- AI-7: listening off (even off-on-off fast) releases the mic and leaves no recogniser running.
- UX-7: Delete in the editor removes the notes, not the Drop; Delete with nothing selected changes nothing; Ctrl+D duplicates notes, not the section.
- UX-12: Undo after Save a copy never touches the original; Save after deleting the open song saves it again.
- UX-13: a long MIDI import keeps all 64 notes and grows the loop to 16 bars (one Undo); the MP3 is gapless.
- The 10 AI-1 smoke lines, including the gap before the drop, which is empty even for early drummer hits.
- Save/reopen did not flake this time.

## Files
- Screenshots: /home/claude/reports/qa-t1/shots/ai1-01-bodzin-loop.png … ai1-08-loop-mix.png. I looked at all of them: the song map in the reply and the header "104 bars · 3:21" plus the Undo chip are readable, and nothing overlaps.
- Logs: /home/claude/reports/qa-t1/check-ai1-run2.txt, /home/claude/reports/qa-t1/ai1.out
- Scripts: /home/claude/reports/qa-t1/js/ai1.mjs, ai1b.mjs, ai1c.mjs (lib.mjs)
