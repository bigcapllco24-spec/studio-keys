# UX-15 build report: sustain and knobs on any MIDI controller

Branch `preview-ux-15`, head **5734c8b** (2 commits on top of main b5e7016). Pushed; main untouched. Clone used: `/home/claude/sk-ux15`.

## Why it broke
1. **The sustain pedal code worked, but only in one case.** It needed a standard pedal on the keyboard's main port. Four other cases failed:
   - **Reversed pedals** (common with Casio or Yamaha pedals on another brand's keyboard) send "off" when pressed, so sustain ran backwards.
   - **Sustain and other standard messages from a second "DAW" port** were thrown away. Any unassigned CC on that port was dropped, CC 64 included.
   - **There was no Sustain button on screen.** "Sustain" next to Mod and Bend was only a light that looked like a button.
   - **Recording lost notes.** If you struck a key again while the pedal held it, the earlier note vanished from the recording. A held note that faded out before the pedal came up stayed open until the end of the take.
2. **Hardware Play crashed.** MIDI Start/Continue (0xFA/0xFB) and MMC Play called `LOOP.layers.length`, which belongs to the retired looper. Every Play threw a TypeError and did nothing.
3. **Knobs on other controllers looked dead.** There is no Akai-only code. Every device gets the same "first knob you turn takes the next free K slot" auto-map. Three things made it fail on other devices:
   - **Soft takeover:** a knob far from the effect's value did nothing until it crossed that value. The only feedback was "TURN TO x% TO TAKE OVER" on the small LCD.
   - **False endless-knob guess:** an ordinary knob that sent the same value twice (high-resolution knobs do this) was saved as an endless knob for good. After that, a value of 100 read as "-28 steps", so the effect jumped around or slammed to zero.
   - **Knobs on a DAW port were ignored.** Arturia's DAW mode and Mackie V-pots send their knobs on that port.

## The fix (files: `src/midi.js`, `src/play.js`, `src/body.html` one line, `tests/smoke.mjs`)
- **Sustain** (`play.js`):
  - The pedal and a new on-screen **Sustain** button both hold notes. The button is a latch with `aria-pressed`, styled like the other `.btn`s and checked in Emerald, Velvet and Sapphire.
  - Sostenuto (CC 66) holds only the notes that are down when you press it.
  - Re-striking a held key ends the held note there and starts a new one. Held notes end at pedal-up, both in sound and in the recording, so recorded lengths include the hold.
  - "All notes off" clears the latch too.
- **Reversed pedals:** if the first CC 64 message from a device is 0, the pedal is treated as reversed and saved per device, with a toast. Half-damper pedals (values between 0 and 127) undo that guess. **Controls detected → Sustain pedal** now has a **Flip** button and shows "reversed".
- **One controller map** (`midi.js`, comment at `KNOB_BANKS`). A CC is resolved in this order:
  1. The player's own assignment (the existing Learn buttons, saved in `DEVICES[key].cc` with `how[cc]='learn'`).
  2. Standard CCs on every device and port: 1 mod (unchanged, SE-10), 7 volume, 64 sustain, 66 sostenuto, 120/123 all notes off, 121 reset.
  3. Transport buttons: MIDI Start/Stop, MMC, Mackie Play/Stop/Rec notes on a DAW port, and the Launchkey and Akai transport CCs. These only count while the CC behaves like a button (sends only 0 and 127).
  4. Automatic knobs. The first time a knob moves, it takes an effect knob K1-K8. Known factory banks put knob 1 on K1, knob 2 on K2 and so on: MPK mini 70-77, Launchkey 21-28, Arturia, nanoKONTROL, then the common banks 70-77, 21-28, 22-29, 14-21, 16-23, 102-109 and 110-117. Anything else takes the first free K. A toast says "Knob 1 → Reverb (CC 21). Turn it to change the effect." When all 8 are taken, a toast says to use Learn.
- **Knobs respond at once:** an absolute knob away from the effect's value now moves the effect the same way, scaled so the two meet (Ableton's "value scaling"). Nothing jumps.
- **Endless knobs:** three codings are detected (2's complement, offset 64, Mackie sign bit). A wrong guess, including ones already saved, heals itself as soon as the knob sends a normal sweep.
- **Akai:** the MPK mini is pinned to CC 70-77 → K1-K8. Turning knob 1 to 8 in order gives the same map as before. The difference: knob 1 is now K1 even if you turn knob 3 first; before, whichever knob moved first became K1. Maps already saved in a browser are kept exactly as they are.
- **How a manual learn screen plugs in later:** it calls `assignCC(inp, cc, target, 'learn')` (targets `fx0`-`fx7`, `volume`, `vol:<channel>`, `next`, `prev`, `loop`, `stop`, `play`, `rec`). Button-type targets go through `doAction`. Today's Learn buttons in the Effects panel already write to the same table. A screen could list `DEVICES[key].cc` with `how` (auto or learn) and offer "Forget".

## Tests
- **check.sh:** `PASS bundle syntax · PASS worker syntax · SMOKE OK: 84 checks · CHECK OK` (index.html rebuilt with `tools/build.py`, no page errors). There are 3 new smoke lines, all passing:
  - "controller: sustain pedal holds a note on the Akai and on an unknown keyboard, the on-screen Sustain button too"
  - "controller: an unknown keyboard's first knob is picked up and moves an effect". Reverb went 0 → 0.47 and the toast said "Knob 1 → Reverb (CC 21)". It also checks MIDI Start → playing and Stop → stopped.
  - "controller: Akai MPK mini knobs keep CC 70-77 → K1-K8". It turns knob 4 (CC 73) first and K4 still gets it.
- **Fake MIDI** (`evaluateOnNewDocument` stub with "MPK mini 3" (AKAI), "Generic USB MIDI", a "Launchkey Mini MK3 DAW Port" and "Casio CT-S1"), 0 page errors:
  - **Sustain, live:** held on both devices and let go on pedal-up. Also tested: the on-screen latch, sostenuto (holds only C4), and the reversed Casio pedal (auto-flipped, then held and let go).
  - **Sustain while recording, measured in beats:**
    - The first note was held by the pedal and then struck again. It was recorded as 2.98 beats; the time from strike to re-strike was 2.98.
    - The re-struck note ran to pedal-up: recorded 6.15, measured 6.15. The note pressed after it also ended at pedal-up.
    - A note played after the pedal came up kept its plain length: recorded 0.66, measured 0.66. Same on the generic device. Nothing was left stuck.
  - **Knobs on the generic device:** CC 21 → K1, CC 24 → K4 (bank order). An endless knob on CC 10 was detected as 2's complement: 20 steps up gave 20%, 10 steps down gave 10%. A false "endless" guess on CC 25 (three 120s in a row) went back to a normal knob after one sweep. CC 1 stayed the mod wheel and was not mapped.
  - **Value scaling:** K3 at 50% with the knob at 8% moved to 59% while the knob went 10 → 30.
  - **Transport:** MIDI Start → playing, Stop → stopped, Mackie Play/Stop on the DAW port, Akai CC 118 → play.
  - **Learn:** still works (CC 30 → K6, `how: learn`). Flip toggles the pedal.
- **Screens:** the Sustain button checked in all three themes. At 390 px the page is 390 wide with no overflow.
- **Sound:** no sound generation changed, so no renders were needed.

## Notes for the lead
- No Worker deploy and no new assistant actions. Only my own files changed (`body.html` has one line: the Sustain light became a button). `mic.js` untouched.
- **Known limits:**
  - MMC transport (SysEx) only reaches the page if SysEx permission was granted. MIDI Start/Stop and CC/Mackie buttons work without it.
  - Hardware octave buttons on most keyboards shift notes inside the keyboard itself. That already worked: the on-screen range follows.
  - Transport CCs on unknown makers need Learn, because CC numbers clash between brands.
  - Not touched, but worth an item: a keyboard that sends MIDI clock (KeyStep, MPK mini plus) silently sets the song tempo, and that change can't be undone.
- **Suggested tester follow-up:** a real reversed pedal and an Arturia in DAW mode, if anyone has the hardware.

## Try it (with a real keyboard, at the test link)
1. Plug in your keyboard and press Connect MIDI. Hold the sustain pedal (or your keyboard's sustain button), play a chord, let go of the keys. The chord rings until you lift the pedal, and the Sustain light comes on.
2. No pedal? Click **Sustain** at the top of "Your controller", play, then click it again to let go.
3. Turn any knob on your keyboard. A message says "Knob 1 → Reverb" and the effect moves right away. Turn the others to fill K2-K8. This works on the Akai and on other keyboards.
4. Press Rec, hold the pedal while you play, and stop. The notes are as long as you held them with the pedal.

## Question for the owner
Which keyboard did the knobs not work on (make and model), and does it have a sustain button or a pedal? If notes ring when you let go of the pedal and stop when you press it, press **Flip** under MIDI device → Controls detected → Sustain pedal.
