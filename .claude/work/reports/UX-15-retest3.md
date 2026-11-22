# UX-15 re-check 3 (fix 3) · qa-tester · 22 Nov 2026
Branch `preview-ux-15` at 57d0d4e, clone /home/claude/sk-t12. I used fake MIDI (a `navigator.requestMIDIAccess` stub) and connected with the Connect MIDI button. Pedal timing uses event timestamps, so it is exact to the millisecond. `PEDAL_ASKED` was reset between cases where the brief asked for it.

## Verdict: READY (no blocking problems; 2 low notes and 1 wording nit)
The lead's rule holds everywhere I looked:
- **A normal pedal never flips on its own, and nothing is saved for it.**
  - The 45-cell grid gives 0 asks, 0 flips and 0 saves, with both 6 taps and 4 taps per cell.
  - All 15 musical patterns give no ask and no flip.
- **A reversed pedal played legato from a chord gets the suggestion on the 3rd chord change.**
  - Flip and It's fine are saved per keyboard and survive a reload.
  - There is one suggestion per visit.
  - Rows read "CC 64" or "Reversed", and Flip does what the row says.

The suggestion only reaches some reversed-pedal players (note 2). That isn't a regression: Flip on the row is always there.

## Problems
1. **A normal pedal can get the suggestion (never a flip) after being held at Connect (low; the developer's "HeldConnectChordTaps").**
   - Steps:
     1. Hold the pedal down and press Connect MIDI (or reload).
     2. Play a chord while you keep holding the pedal.
     3. Lift the pedal while the keys are still down, within 0.6 s of striking them.
     4. Play a melody, then tap the pedal briefly on a chord. Do step 4 three times.
   - Result: "Notes ringing when your foot is up? Flip the pedal" appears.
     - This happened in 24 of the 45 grid cells, with the step 3 lift 0.1 s after the chord and also 0.3 s after it.
     - It never flipped and nothing was saved. It's fine ends it for good.
   - Lifting at rest, before playing, is clean: 0 of 45 (exactly what Try 2 says to do).
   - Does it matter? Only a little. It needs Try 2 done "wrong" (testing a chord before lifting) followed by tap-style pedalling. The messages are the same as from a reversed pedal pressed after a chord, so no rule can tell the two apart.
2. **The suggestion only reaches reversed-pedal players who press the pedal in a narrow way (low; the developer's first limit, wider than listed).** Measured on a reversed Casio, one page per case:
   - **The first press must come 30-600 ms after striking a key, with the key still held.** Otherwise there is no suggestion for the whole visit:
     - foot pressed first, then the chord (this is how Try 1 tells you to start)
     - foot pressed after letting go of the chord
     - foot pressed more than 0.6 s after the chord
     - foot pressed less than 30 ms after the chord
   - **A legato change only counts in a short window.** The lift has to come between about 0.1 s before and 0.08 s after the new chord, and the re-press within about 0.45 s of the chord.
     - Lifting 0.09-0.2 s after the chord: never asked (8 changes).
     - Lift held 0.5-0.6 s: never asked.
   - **A reversed pedal tapped briefly on chords is saved as "seen working normally"** (`pedalHow:'use'`). That keyboard is never asked again, even after a reload when it is then played legato.
   - Effect for the owner if his pedal is reversed and he follows the Try list in order:
     - Try 1 (press the foot first) uses up that visit's chance, and Try 4's message never comes.
     - Before Flip, the pedal works backwards: pressing it rings nothing, and with the foot up 4 notes kept ringing.
     - The way out, Flip on the row, works and is saved. Try 4 already mentions it.
   - Suggestion (lead, no code needed): reword Try 4 to "Reload the page, play a chord, then press the pedal… If no message appears, use Flip on its row (MIDI device → Controls detected)".
3. **Wording nit.** After Flip, the toast says "CASIO USB-MIDI: sustain pedal flipped. It now holds notes when it sends “off”." That is technical for a musician. Something like "pedal flipped: notes now ring while your foot is down" would read better.

## The developer's known limits: do they matter for a player?
- **A reversed pedal pressed before any key never gets the suggestion:** confirmed, and it is the most natural way to start (Try 1). It matters a little: it costs the whole visit's suggestion, but Flip on the row fixes it for good. See problem 2.
- **"HeldConnectChordTaps":** confirmed (24/45 cells). It is rare, it only shows a suggestion, and It's fine ends it. See problem 1.
- **A keyboard that sends CC 64 = 0 by itself near a key:** not probed. I don't know of such a keyboard.
- **A reversed pedal sounds wrong until Flip:** confirmed (above). This is the accepted price of never flipping on its own.

## What I checked (numbers)
**check.sh** (load average 0.1-1.6, one run): **PASS bundle syntax · PASS worker syntax · SMOKE OK: 87 checks · CHECK OK** in about 3 m 50 s. All controller lines pass, including the 3 rewritten pedal lines, and there are no page errors. Log: /home/claude/reports/ux15-r3-check1.log.

**45-cell timing grid** (normal pedal; each tap comes after a melody):
- Pedal down from 150 ms before to 150 ms after the chord, tap 0.2-0.6 s.
- 6 taps per cell: 0 ask, 0 flip, 0 save. The 27 old FLIP cells still collect 5 reversed votes each but show nothing, because the first sign is missing.
- 4 taps per cell: 0 / 0 / 0.
- Pedal held at Connect and lifted at rest, then the grid: 0 / 0 / 0.
- Held at Connect and lifted on a chord, then the grid: 24 asks, 0 flips, 0 saves (problem 1).

**Musical patterns** (normal pedal, 6 bars each; the flag was reset for each):

| Pattern | Asked | Flipped | Saved |
|---|---|---|---|
| Stabs | no | no | nothing |
| Trained legato | no | no | "seen working normally" |
| Untrained | no | no | nothing |
| HoldBar | no | no | nothing |
| My original case | no | no | nothing |
| StabsLate | no | no | nothing |
| House 124 / House 128 / Beat 120 | no | no | nothing |
| 3 dabs, then a 10.5 s pad hold with a 24-note arpeggio | no | no | nothing |
| Pedal held at Connect, first lift as a legato change | no (normal votes) | no | "seen working normally" |
| Try 2 then Try 3 (held, lifted at rest, 6 taps) | no | no | nothing |
| Try 1 then Try 3 | no | no | nothing |
| Fast legato, 12 changes | no | no | nothing |
| Held at rest, then stabs | no | no | nothing |

**Try 4 flow** (reversed Casio played legato from a chord, pedal 0.15 s after the chord):
- **Before Flip:**
  - The suggestion appears on change 3.
  - The toast reads "Notes ringing when your foot is up? Flip the pedal", with the buttons Flip and It’s fine (class `toast show act`).
  - Nothing is saved yet, the row reads "CC 64", and pressing the foot gives `sustainOn:false`, since the pedal still works backwards until Flip.
- **Flip:**
  - Saves `{pedalRev:true, pedalHow:'user'}`, and the row reads "Reversed".
  - Press (0) holds 1 note, and lift (127) frees it.
- **One suggestion per visit:** a second reversed keyboard, after 6 changes, is not asked and nothing is saved.
- **It's fine:**
  - With the flag reset, the toast names the keyboard ("Flip the CASIO CT-S1 pedal").
  - It's fine saves `{pedalRev:false, pedalHow:'user'}` and shows "OK, the CASIO CT-S1 pedal stays as it is.".
  - 6 more changes: no ask.
- **Ignored suggestion:** after the 9 s timeout nothing is saved, the row reads "CC 64", and the toast class goes back to `toast` (no click catching).
- **After a reload:**
  - The Flip keyboard is still reversed and holds and frees correctly.
  - The It's fine keyboard is still normal and is not asked after 6 changes.
  - The ignored keyboard is asked again on change 3, as designed.
- **Row tooltips and aria-labels:**
  - The reversed row: "Set this pedal back to normal" / "Flip the sustain pedal of CASIO USB-MIDI (now reversed)".
  - The normal rows: "Use this if notes ring when your foot is up" / "(now normal)".
  - Row Flip on Reversed gives normal ("set back to normal", saved). Again gives Reversed (saved).

**Pedal rows in the side panel** (318 px wide, two keyboards, one with a 36-character name):
- In Emerald, Velvet and Sapphire, each pedal row is one line, 35 px tall, with scrollWidth = width = 318.
- Long names end in "…", for example "Sustain pedal · Yamaha PSR-E3… CC 64 Flip".
- The suggestion toast is matte in all three themes:

  | Theme | Background | Background image |
  |---|---|---|
  | Emerald | rgb(15,32,25) | none |
  | Velvet | rgb(35,17,24) | none |
  | Sapphire | rgb(17,28,50) | none |

  Its pointer events are on while it shows its buttons. "It’s fine" wraps onto a second line, which is fine.

**Migration** (seeded):

| Saved before | After |
|---|---|
| Fix-1 automatic flip + knob | `{cc:{21:'fx0'}, how:{21:'auto'}}` (the Yamaha holds normally) |
| User flip | kept |
| `{pedalHow:'use'}` | kept |
| It's fine `{pedalRev:false, pedalHow:'user'}` | kept |
| First build's automatic flip | `{}` |
| First build's user flip | `{pedalRev:true, pedalHow:'user'}` |
| Akai map | kept |

**Try steps** (fake keyboards):
1. Pass. The pedal holds on the MPK, a generic keyboard, the Launchkey MIDI port and its DAW port (LED `led amber`), and lifting frees.
2. Pass. Held at Connect and lifted at rest gives no message and no change (0/45). See problem 1 for lifting on a chord.
3. Pass. Melody plus taps gives no message (0/45 grid, all patterns).
4. Pass for legato from a chord: the message comes on change 3, and Flip and It's fine are saved. See problem 2 for other ways of pedalling.
5. Pass. A long pad hold with an arpeggio gives no message, also after 3 dabs.
6. Pass. Sustain latch holds: `aria-pressed=true`, it survives a pedal press and lift, and pressing it again frees. On phones it is 84 × 44 px at 390 and 360, with page scrollWidth = width.
7. Pass.
   - CC 21 → K1 with "Knob 1 → Reverb (CC 21). Turn it to change the effect.", and the effect moves 0 → 0.149 on the first move.
   - CC 24 → K4, and CC 48 → K2.
   - On the Akai, the transport buttons are listed under "Buttons: CC 90 Stop, CC 117 Stop, CC 118 Play".
8. Pass. Rec with the pedal at 120 bpm, real time, recorded vs expected beats:

   | Note | Recorded | Expected |
   |---|---|---|
   | C4 | 3.02 | 3.02 |
   | E4 | 1.44 | 1.41 |
   | G4 | 0.70 | 0.70 |
   | C5 | 1.01 | 1.01 |
   | Re-struck C5 | 1.40 | 1.42 |
   | Latched E5 | 1.64 | 1.64 |

   0 notes held or active at the end.

**Earlier checks, all unchanged:**
- **Pedals:** sostenuto (C4 held, E4 free); 10 re-strikes leave 1 voice.
- **Knob response:**
  - Value scaling goes 0.10 → 0.976, with the biggest step 0.047.
  - An endless knob (2's complement) moves +0.20 and −0.10; 120, 127, 127, 127 is not taken for endless.
  - With all 8 knobs taken, the toast "All 8 effect knobs are taken… CC 85" appears.
- **Knob maps:**
  - The mod wheel is never mapped.
  - Akai: turning knob 4 first still gives 70..77 → K1..K8.
  - The Launchkey DAW knob goes to K2.
- **Transport:** MIDI Start/Stop/Continue, Mackie 94/93, Akai 118/117 and Launchkey 115/116 all work (playing / stopped).
- **Learn and reloads:**
  - Learn K6 with CC 31 → fx5 (`learn`, toast), moving it to K7 works, and Learn Stop with CC 90 works.
  - The Akai map survives a reload.
- **Page errors:** 0 in every probe.

## Files
- Probes: /home/claude/qa-t12/r3.cjs (r3.json), /home/claude/qa-t12/r3b.cjs (r3b.json), /home/claude/qa-t12/regress.cjs (regress.json), /home/claude/qa-t12/rec.cjs (rec.json), /home/claude/qa-t12/lib.cjs
- check.sh log: /home/claude/reports/ux15-r3-check1.log
- Screenshots, all in /home/claude/qa-t12/shots/:
  - suggest-desk.png, flow-rows.png
  - rows-emerald.png, rows-velvet.png, rows-sapphire.png
  - toast-emerald.png, toast-velvet.png, toast-sapphire.png, plus the -crop.png versions
  - theme-emerald.png, theme-velvet.png, theme-sapphire.png
  - phone-390-sus.png, phone-360-sus.png, akai-rows.png
