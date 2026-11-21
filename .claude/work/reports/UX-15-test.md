# UX-15 branch check (qa-tester, 22 Nov 2026)
Branch `preview-ux-15` at 5734c8b, worktree /home/claude/sk-t2-ux15. Baseline: main b5e7016.

Fake MIDI comes from a `navigator.requestMIDIAccess` stub, connected through the Connect MIDI button. The fake devices:
- MPK mini 3 (AKAI)
- Generic USB MIDI
- Launchkey Mini MK3 MIDI Port and its DAW Port
- CASIO USB-MIDI
- plus a "Yamaha PSR USB" for the false-flip test

## Verdict: NOT READY. Two sustain-pedal problems, both small fixes.
Most of it works on every device:
- sustain live and while recording, the on-screen latch, sostenuto
- automatic knobs and value scaling
- endless knobs and their self-heal
- the Akai map, transport, Learn
- phone widths and the three themes

But the owner's bug is "sustain doesn't work", and the new reversed-pedal guess can make a normal pedal work backwards (problem 1). With two keyboards connected, the Flip button changes the wrong keyboard (problem 2). He has an Akai and another device, so he could hit both.

## Problems
1. **A normal pedal can be flipped by mistake and then work backwards (medium).**
   - The app treats the first CC 64 from a device as a press. If that first message is "off", it decides the pedal is reversed and saves that for the device.
   - That happens when the foot is on the pedal while the page connects and is then lifted. It also happens with a keyboard that sends CC 64 = 0 when it connects or changes a voice.
   - Steps:
     1. Plug in a keyboard with a normal pedal and hold the pedal down.
     2. Open the test link (or press Connect MIDI).
     3. Lift the pedal. A toast says "Your sustain pedal is wired the other way round, so it was flipped".
     4. Press the pedal and play a chord, then let go of the keys. The notes stop.
     5. Lift the pedal. Sustain turns on, and the next notes ring on.
   - It stays like this, saved per device, until the player finds Flip.
   - Measured on the Yamaha fake: `pedalRev: true`; held while pressed: false; sustain on after lifting.
   - Suggested fix (studio-ux-dev, `src/midi.js` `pedal()`):
     - Only guess "reversed" from a 0 that arrives while keys are being played, or after a 0 → 127 → 0 pattern with notes.
     - Or don't save the guess until it is confirmed.
2. **With 2 keyboards connected, Flip changes the wrong one (medium).**
   - "Controls detected" and its Flip button belong to the primary device (the first one, the Akai) while "All connected controllers" is selected. The reversed toast for a second keyboard sends the player there.
   - Steps:
     1. Connect the MPK mini and a Casio.
     2. Press the Casio's pedal. If it is reversed, or if problem 1 flips it, the Casio is marked reversed and a toast appears.
     3. Go to MIDI device → Controls detected → Sustain pedal and press Flip.
     4. Result: the Casio stays reversed (`pedalRev: true`) and the Akai becomes reversed (`pedalRev: true`).
   - Only choosing the Casio under "Listening to" first gets it right.
   - Suggested fix: Flip acts on the device that sent the last CC 64, and the row says which keyboard it means.
3. **An ordinary knob resting at the top can be taken for an endless knob (low).**
   - Three 127s in a row from the same knob mark it endless (`rel2c`). Some controllers resend a value on a snapshot or bank change.
   - While it rests there, each extra 127 lowers the effect by 1%. Turning it down, the values 126-113 count as steps down (-1 to -15 each). It heals once the knob sends a value under 113.
   - Steps: send CC 26 with 120, 127, 127, 127. Result: `rel: rel2c` on CC 26.
4. **Controls detected → "Knobs & faders" lists the Akai's transport buttons as knobs (low, cosmetic).** It shows "CC 70, CC 117, CC 118, CC 119".
5. **The Sustain button is small on phones (low).**
   - It is 78 × 24 px at 390 and 360, under a 44 px tap target.
   - It is visible, fits, and nothing scrolls sideways.

Not caused by UX-15, for the lead:
- **SE-10 (the wheels only bend live notes) is not on main.** `preview-se-10` (e1c7a3c) was never merged, so on this branch and on main the pitch and mod wheels still bend the song: 9 of 9 song voices are wired to the wheels, on both.
  - UX-15 moved the mod-wheel code but kept it the same.
  - If the rule should be live, SE-10 needs a release. It conflicts with UX-15 only in `tests/smoke.mjs`.
- **Merging:** SE-4 and UX-15 both add smoke lines at the end of `tests/smoke.mjs`, so the second merge conflicts there. Keep both blocks and rebuild.
- **Check time:** check.sh took 2 m 48 s at low load with 84 checks. With both branches in, it will be about 3 minutes. I'll look at trimming it as a test-upkeep job.

## What I checked (numbers)
**check.sh:** `SMOKE OK: 84 checks`, `CHECK OK`, 2 m 48 s, load average 0.9. The 3 new controller lines pass. No page errors; the only console error is a blocked font request.

**Sustain, live**
- The pedal holds and releases on each port: MPK, Generic, Launchkey MIDI port, and the Launchkey DAW port (pedal on the DAW port, notes on the MIDI port). The LED is amber while held.
- Reversed Casio: the first press sent 0, so it was auto-flipped with a toast. It held, then let go on 127. A half-damper value (40) undid the guess.
- On-screen latch:
  - It holds notes, shows `aria-pressed=true` and the `on` style, and lights the LED.
  - Pressing and lifting the pedal while the latch is on keeps the notes held.
  - Pressing the latch again frees them. "All notes off" also clears the latch.
- Sostenuto: holding C4 and pressing CC 66 holds only C4. E4, played after, stops normally. Lifting CC 66 frees C4.
- Re-striking under the pedal: 10 strikes leave 1 held voice (no pile-up).

**Sustain while recording (beats, recorded vs measured)**

| Note | Recorded | Measured |
|---|---|---|
| Held note, ended by a re-strike | 2.009 | 2.00 |
| The re-struck note, to pedal-up | 2.357 | 2.39 |
| A note pressed during the hold | 1.927 | 1.93 |
| A note after pedal-up | 0.691 | 0.69 |
| A latched note, to the end of the take | 1.405 | 1.40 |

Nothing was left stuck (0 held, 0 active).

**Knobs**
- Generic CC 21 → K1, with the toast "Knob 1 → Reverb (CC 21). Turn it to change the effect." The effect moves on the first move: 0.20 → 0.32 while the knob goes 60 → 70.
- CC 24 → K4 (bank order). An unknown CC 48 → the first free K (K2).
- Value scaling: the effect started at 50% with the knob at 8%. Steps went 0.509 … 0.628 with the biggest jump 0.017, and the effect reached 100% at the top.
- Endless CC 10, detected as 2's complement: 20 steps up +0.20, 10 down -0.10.
- A false guess on CC 25 (120 ×3) healed after one sweep. An old wrong guess saved before reload (CC 30) healed too.
- All 8 used: the toast "All 8 effect knobs are taken. Press Learn on an effect to give it CC 86."
- The mod wheel (CC 1) is never mapped. Pitch bend is separate.
- Akai: turning knob 4 first gives {70..77 → fx0..fx7}. A map saved before ({70: fx2, 71: fx0}) is kept after reload.
- The Launchkey DAW port's knob (CC 22, ch 16) → K2.

**Transport**
- MIDI Start → playing, Stop → stopped, Continue → playing.
- Mackie on the DAW port: note 94 → playing, 93 → stopped.
- Akai CC 118 → playing, CC 117 → stopped, CC 119 → overdub.
- Launchkey CC 115 → playing, CC 116 → stopped.
- Start on an empty song does nothing.

**Learn**
- Learn K6 with CC 31 → fx5 (`how: learn`), with the toast "CC 31 now controls K6 Beat Repeat".
- Learning K7 with a CC that already had a K moves it.
- Learn Stop with CC 90 → stop.

**Screens**
- Desktop, Emerald, Velvet and Sapphire, Sustain on and off: matte, and readable in all three.
- Phone 390 and 360: page `scrollWidth` equals the width (390 / 360), no sideways scroll. The keyboard strip scrolls inside its own box at 360.

## Screenshots
- /home/claude/qa-t2/shots/ux15-b-desk-{emerald,velvet,sapphire}-{on,off}.png
- /home/claude/qa-t2/shots/ux15-b-devseen.png
- /home/claude/qa-t2/shots/ux15-flip-before.png, ux15-flip-after.png (the "CC 64 · reversed · Flip" row)
- /home/claude/qa-t2/shots/ux15-b-phone-{390,360}-{top,play,devseen}.png

Probe scripts and raw numbers:
- Scripts: /home/claude/qa-t2/ux15probe.mjs, /home/claude/qa-t2/ux15flip.mjs
- Results: /home/claude/qa-t2/ux15-branch.json, /home/claude/qa-t2/ux15-check1.log
