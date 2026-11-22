# UX-15 re-check 2 (fix 2) · qa-tester · 22 Nov 2026
Branch `preview-ux-15` at 54883bd, clone /home/claude/sk-t8.
Fake MIDI comes from a `navigator.requestMIDIAccess` stub, connected with the Connect MIDI button. The tests use event timestamps, so pedal timing is exact to the millisecond.

## Verdict: NOT READY (one medium problem, same root cause as before; small fix)
Most of fix 2 works:
- My exact case from the last check (0.5 s tap 60 ms after the chord) no longer flips.
- An automatic flip is never saved, and a reload clears it.
- Keep, Undo and the per-keyboard Flip all work.
- The toast `act` class is fixed.
- A long hold on its own no longer suggests a flip.
- Migration is correct.

But a normal pedal still flips after 3 short taps with chords. This happens for the pedalling that try step 3 itself asks for ("tap the pedal briefly on a few chords"). It also happens for one chord per bar at house tempo with the pedal lifted before beat 2. The developer lists this as a known limit, but it covers much more than "pressed first, chord 0.1 s later". The owner is likely to hit it on the test link.

## Problems
1. **A normal pedal tapped briefly on chords still flips for the visit (medium).**
   - Steps (any keyboard with a normal pedal):
     1. Press Connect MIDI.
     2. Play a short melody without the pedal.
     3. Play a chord and tap the pedal with it: down at the same moment, up about 0.3 s later.
     4. Repeat steps 2–3 three more times.
   - Result:
     - The toast says "The sustain pedal on … seems to work the other way round, so it's flipped for now. Undo Keep".
     - The row reads "Reversed?".
     - On the next tap, the notes ring after the foot comes up (`sustainOn: true`, 1 note held).
   - Measured, 4 taps each (the first tap gives no vote, the next 3 flip it). The pedal-down time is relative to the chord:

     | Pedal down vs chord | 0.2 s | 0.3 s | 0.4 s | 0.5 s | 0.6 s |
     |---|---|---|---|---|---|
     | 150 ms before | FLIP | FLIP | FLIP | FLIP | FLIP |
     | 100 ms before | FLIP | FLIP | FLIP | FLIP | ok |
     | 50 ms before | FLIP | FLIP | FLIP | FLIP | ok |
     | 20 ms before | FLIP | FLIP | FLIP | ok | ok |
     | same time | FLIP | FLIP | FLIP | ok | ok |
     | 30 ms after | FLIP | FLIP | FLIP | ok | ok |
     | 60 ms after | FLIP | FLIP | ok | ok | ok |
     | 100 / 150 ms after | ok | ok | ok | ok | ok |

     That is 27 of 45 cells. The rule underneath: it flips whenever the pedal goes down no later than about 80 ms after the chord and comes up within 0.45 s of it.
   - Musical patterns, 4 bars each, normal pedal:

     | Pattern | Result |
     |---|---|
     | One chord per bar, pedal held about one beat (124 bpm, lifted at 0.85 beat; 128 bpm at 0.95 beat; 120 bpm half a beat) | FLIP each time |
     | Chord stab with a 0.32 s dab | FLIP |
     | Keys 40 ms before the pedal, 0.3 s dab | FLIP |
     | Trained legato | stays normal, 5 normal votes, saves "seen working normally" |
     | Untrained pedalling (down with the chord, held the bar, lifted before the next one) | stays normal |
     | Pedal held 1.5 s on a chord, then a melody without it | stays normal |
     | My case from last time | stays normal |
   - "Normal pedalling puts it back" only works if the player switches to legato. More taps keep voting "reversed", so the pedal stays backwards for the whole visit.
   - The way out is Undo in the toast (shown 9 s), Flip on the row, or a reload. Undo then saves the pedal as normal for good (`pedalRev:false, pedalHow:'user'`). After that, 6 more taps don't flip it again.
   - Why it matters:
     - The owner's complaint was "sustain doesn't work". A normal pedal is the common case and a reversed one is rare, yet this pattern is ordinary producer pedalling.
     - Try step 3 tells him to do exactly this.
   - Suggested fix (studio-ux-dev, `src/midi.js` `pedalDecide`):
     - Simplest and safest: don't flip on its own. After 3 reversed-looking changes, show only the suggestion "Notes ringing when your foot is up? Flip it", and leave the pedal as it is until the player says so.
     - Or a narrower rule: count a change only when the chord comes at least about 30 ms after the lift starts (you lift, then strike), and raise the count to 5. This removes the same-time and pedal-after cells, but not the pedal-before ones.
2. **3 short taps, then a long pad hold, gives "Flip it?" on a normal pedal (low).**
   - This is what is left of my old problem 3, from the same cause.
   - Steps:
     1. Tap the pedal 3 times on chords after a melody (pedal first, chord 0.1 s later, 0.3 s tap). That gives 2 reversed votes, not yet a flip.
     2. Hold the pedal and play a 24-note arpeggio for about 10.5 s.
   - Result: "Notes keep ringing after you lift the pedal? The … pedal may be wired the other way round. Flip it".
   - The fix for 1 fixes this too.
   - Without taps, the long hold alone gives no hint (checked), and neither does 1 tap (checked).
3. **Flip on a "Reversed?" row sets the pedal to normal (low; the developer's known limit 3).**
   - Steps:
     1. On a reversed pedal, let it auto-flip.
     2. Wait for the toast to go away.
     3. Go to MIDI device → Controls detected and press Flip on "Sustain pedal · Reversed?".
   - Result:
     - "sustain pedal set back to normal" (saved as the player's choice).
     - A second Flip makes it Reversed (saved).
   - A player who presses Flip to confirm "yes, it's reversed" gets the opposite.
   - The button's tooltip is still "Use this if notes hold when you let go of the pedal".
   - Suggested fix: on a "Reversed?" row, show Keep and Undo like the toast, or label the button by what it will do ("Make normal").
   - Cosmetic: in the 320 px side panel the "Reversed?" row wraps onto two lines, with the text above Flip. "CC 64 · Flip" fits on one line (shots/theme-velvet.png).

## The developer's known limits: do they matter for a player?
- **Limit 1, normal taps can flip:** yes. See problem 1. It covers pedal-with-chord and pedal-before-chord taps up to 0.45 s, not only "pressed first, chord 0.1 s later".
- **Limit 2, a reversed pedal is guessed again every visit until Keep:** confirmed.
  - Visit 1: 3 legato changes flipped it, with the toast, and nothing was saved.
  - After a reload: normal again.
  - Then 3 more changes flipped it again, with the toast.
  - It matters little: Keep, or Flip on the row, saves it for good.
- **Limit 3, two Flips to make a guess permanent:** confirmed. Problem 3; low.
- **Not listed by the developer:**
  - A reversed pedal before any learning makes everything ring while the foot is up. One press and lift, then a melody with the foot off, left 4 notes ringing.
  - Nothing hints until the player pedals legato 3 times. Flip on the row is the way out.
  - Low: reversed pedals are rare, and this is the price of not guessing from the first message.

## What passed (numbers)
**check.sh**
- Run 1 (load 15.6): 1 FAIL, "a relaxed double-click (0.35 s) on a part opens the editor…" (`{"on":false,"st":4,"ed":true}`). This is a timing test outside UX-15's files.
- Run 2 (load about 6): **PASS bundle syntax · PASS worker syntax · SMOKE OK: 87 checks · CHECK OK in 4 m 02 s.**
- All 6 controller lines pass. No page errors in any probe.

**My 3 open problems**
- **1, my exact case:** melody, chord, then 60 ms later a 0.5 s tap, ×4. Not flipped, 0 votes, nothing saved. The wider pattern still flips (problem 1 above).
- **2, toast `act` class:** fixed.

  | Toast state | Class | Pointer events | What is under the toast's centre |
  |---|---|---|---|
  | With buttons | `toast show act` | auto | the toast |
  | After a plain toast | `toast show` | none | the page (a DIV) |
  | After a button press | `toast` | none | — |
  | After the 9 s timeout | `toast` | none | — |
  | Real flow: the flip toast replaced by "Knob 1 → Reverb" | `toast show` | none | — |

  Two button toasts in a row show only the newest button.
- **3, a long hold alone:** fixed. A normal pedal held 10.5 s through a 24-note arpeggio gives no hint, and with 1 tap before, none either. A reversed-looking pedal (2 legato changes), then the hold, gives "Flip it", as designed.

**Try steps (fake keyboards)**
1. **Normal pedal (Yamaha):**
   - Hold the pedal and play a chord: 3 held, 0 active, LED `led amber`.
   - Lift: freed, LED off.
2. **Pedal held at Connect, then lifted:**
   - No flip, no toast.
   - The same after a reload with the pedal held.
   - A voice change sending CC 64 = 0: still normal, and the pedal holds a note.
3. **Melody plus brief taps:** fails for brief taps (problem 1). The Undo is there, and a reload clears the guess (checked).
4. **Reversed pedal (Casio-style):**
   - 3 legato changes give the toast with Undo/Keep. The row says "Reversed?", with the tooltip "Flipped for this visit only, from how you play". Saved `{}`.
   - Pressing the pedal (0) holds and lifting (127) frees.
   - Keep saves `{pedalRev:true, pedalHow:'user'}` and the row says "Reversed". After a reload it is still reversed and holds correctly.
   - Undo on a second Casio saves it as normal (user), and that survives a reload.
   - **Two keyboards (MPK mini held at Connect, plus a reversed Casio):**
     - The Akai stays normal and saves "seen working normally".
     - The Casio is flipped, and the Akai still holds and frees its own note.
     - Rows: "Sustain pedal · MPK mini 3 · CC 64 · Flip" and "Sustain pedal · CASIO USB-MIDI · Reversed? · Flip".
     - Keep in the toast saves only the Casio.
     - Flip on the Akai row changes only the Akai.
5. **Long pad hold:** no "Flip it?" on its own (see problem 2 for the taps case).
6. **On-screen Sustain:**
   - The latch holds (`aria-pressed=true`, `on`, LED amber) and survives a pedal press and lift. Pressing it again frees the notes.
   - On phones the button is 84 × 44 px at 390 and 360. The page `scrollWidth` equals the width (390 / 360).
7. **Knobs:**
   - Generic CC 21 → K1, with the toast "Knob 1 → Reverb (CC 21). Turn it to change the effect." The effect moves on the first move: 0 → 0.149 for knob 60 → 70.
   - CC 24 → K4 (bank order), and an unknown CC 48 → K2 (the first free one).
   - Akai: CC 117/118 (and a learned CC 90) appear under "Buttons: CC 90 Stop, CC 117 Stop, CC 118 Play", not under Knobs.
8. **Rec with the pedal (120 bpm, real time), recorded vs measured beats:**

   | Note | Recorded | Measured |
   |---|---|---|
   | C4 held to pedal-up | 4.96 | 4.96 |
   | E4 pressed during the hold | 2.14 | 2.05 |
   | G4 after pedal-up | 1.20 | 1.22 |
   | C5, ended by a re-strike | 1.40 | 1.41 |
   | The re-struck C5, to pedal-up | 2.82 | 2.83 |
   | Latched E5, to the end of the take | 2.06 | 2.06 |

   Nothing was left stuck (0 held, 0 active).

**Migration**

| Saved before | After loading this build |
|---|---|
| Fix-1 automatic flip `{pedalRev:true, pedalHow:'use', cc:{21:'fx0'}}` | `{cc:{21:'fx0'}, how:{21:'auto'}}`. The flip and "use" are dropped, the knob is kept, and the pedal holds normally. |
| User flip `{pedalRev:true, pedalHow:'user'}` | kept |
| `{pedalHow:'use'}` | kept |
| First build's automatic `{pedalRev:true, pedalAuto:true}` | `{}` |
| First build's user `{pedalRev:true, pedalAuto:false}` | `{pedalRev:true, pedalHow:'user'}` |
| An Akai map saved before (70 → fx2, 71 → fx0) | kept |

**Everything from the first two checks still passes**
- **Sustain on each port:** MPK, Generic, Launchkey MIDI port, and the Launchkey DAW port (pedal on the DAW port, notes on the MIDI port) all hold and free, with the LED amber.
- **Sostenuto:** C4 held, E4 after it stops, and lifting frees C4.
- **Re-striking:** 10 strikes under the pedal leave 1 voice.
- **Value scaling:** the effect at 50 % with the knob at 8 % goes to 0.10, then up to 0.976. The biggest step is 0.047 for a knob step of 6.
- **Endless knob** (2's complement): 20 steps up +0.20, 10 down −0.10. Sending 120, 127, 127, 127 is not taken for endless.
- **All 8 knobs used:** the toast "All 8 effect knobs are taken. Press Learn on an effect to give it CC 85."
- **Mod wheel:** never mapped.
- **Akai:** turning knob 4 first gives 70..77 → K1..K8.
- **Launchkey DAW port knob** (CC 22, ch 16) → K2.
- **Transport:**
  - MIDI Start/Stop/Continue: playing, stopped, playing.
  - Mackie 94/93: playing, stopped.
  - Akai CC 118/117: playing, stopped.
  - Launchkey CC 115/116: playing, stopped.
- **Learn:**
  - K6 with CC 31 → fx5 (`how: learn`), with the toast "CC 31 now controls K6 Beat Repeat".
  - Learning K7 with the same CC moves it.
  - Learn Stop with CC 90 → stop.
  - The map survives a reload.
- **Screens:** the toast and rows are matte in Emerald, Velvet and Sapphire (solid backgrounds rgb(15,32,25) / rgb(35,17,24) / rgb(17,28,50), no gradient) and readable.

## Files
- Probes and raw results: /home/claude/qa-t8/pedal.cjs (pedal.json), pedal2.cjs (pedal2.json), regress.cjs (regress.json), rec.cjs, lib.cjs.
- check.sh logs: /home/claude/reports/ux15-check.log (run 1), /home/claude/reports/ux15-check2.log (run 2).
- Screenshots: /home/claude/qa-t8/shots/:
  - try1-desk.png, grid-after.png
  - rev-rows.png, two-rows.png, akai-rows.png
  - theme-{emerald,velvet,sapphire}.png
  - phone-{390,360}-sus.png
