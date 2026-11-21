# UX-15 fix 2 report (studio-ux-dev, 22 Nov 2026)
Branch `preview-ux-15`, head **54883bd** (pushed; main untouched). Clone: /home/claude/sk-ux15b.
Files: `src/midi.js`, `tests/smoke.mjs` (2 existing lines adapted, 1 new check), `index.html` rebuilt. No change to `src/head.html` or `core.js`.

## Fixes
1. **Normal pedal auto-flip (medium).**
   - **An automatic flip lasts for this visit only.** It is never saved. A wrong guess is gone after a reload.
   - **Learning never stops on its own.** Only the player's own choice ends it: Flip on the device row, or Undo or Keep in the message (`pedalHow: 'user'`).
   - **Normal pedalling undoes a wrong flip in the same visit.** After an automatic flip, 2 normal pedal changes put the pedal back, with a toast: "...works the normal way after all, so it's back to normal". The next automatic flip in that visit then needs 5 changes, not 3, so it doesn't flip back and forth.
   - **The flip message has Undo and Keep.** Keep saves the flip as the player's choice.
   - **The row tells you it's a guess.** It reads "Reversed?" (tooltip "Flipped for this visit only, from how you play"). After Keep or Flip it reads "Reversed".
   - **Fewer false votes.** A pedal change only counts when the new chord is caught by the pedal within 0.45 s of the strike, as in real legato pedalling. Your case (a chord, then a 0.5 s tap after a melody without pedal) no longer counts at all.
   - **A normal pedal that was seen working is harder to flip.** Two normal changes save "seen working normally" (`pedalHow: 'use'`). Later visits then need 5 changes before any automatic flip.
   - **Old guesses are cleared on load.** An automatic flip saved by fix 1 (`pedalRev` with `pedalHow:'use'`) is dropped and saved. A Flip the player pressed is kept.
2. **Toast clicks (low).** The `act` class now goes away in three cases:
   - when the button toast times out
   - when one of its buttons is pressed
   - when any plain toast replaces it (a MutationObserver on `#toast` in midi.js, so `core.js` is not touched)

   `toastAct` now takes extra buttons.
3. **Long hold alone (low).** "Flip it?" is now suggested only when the long ringing (10 s or more, 8 or more keys let go) comes with at least 2 reversed-looking changes and no normal ones. It is never suggested after an automatic flip or for a pedal seen working normally.

## Tests
- **check.sh:** `PASS bundle syntax · PASS worker syntax · SMOKE OK: 87 checks · CHECK OK` (6:53), no page errors.
  - The 4 earlier runs failed only on unrelated timeouts and slow steps while the machine was loaded (load average 13-18 on 2 CPUs): "Navigating frame was detached", "callFunctionOn timed out", the sing take and the velocity lane.
  - The same build passed once the load dropped.
- **New smoke line passes:** "controller: an automatic pedal flip is never saved and normal pedalling puts it back; Keep saves it; plain toasts don't catch clicks", with `{"tapFlip":true,"tapSaved":false,"back":true,"rev":true,"kept":true,"act":false}`.
  - The 2 fix-1 pedal lines now read the effective direction (`pedalRevOf`). They pass: `casio:true`, `flip: pa,py,pc · false,true,true`.
- **Probe** (fake devices with timestamps; /tmp/claude-0/-home-claude/8f011bf6-a859-5a1d-89cc-c895f4dc55d3/scratchpad/ux15b/probe.json):

  | Case | Votes | Result |
  |---|---|---|
  | The tester's case: 6-note melody without pedal, chord, 0.5 s tap, ×4 | rev 0, norm 0 | not flipped, nothing saved |
  | Press the pedal, chord 100 ms later, 0.4 s tap, ×4 | rev 3 | flipped for the visit with Undo/Keep, saved `{}` |
  | Worst case, 0.25 s taps right on the chord, ×4 | — | flipped for the visit, saved `{}`. Then 3 normal legato changes put it back to normal with a toast. After a reload: Roland `{}`, Yamaha `{}` |
  | Reversed pedal played legato ×3 | — | "Reversed?", holds while pressed (sends 0), lets go on 127. Keep → saved `{pedalRev:true, pedalHow:'user'}`, still there after a reload |
  | Normal pedal held through a 24-note arpeggio, about 10.5 s | — | no suggestion (`hinted:false`) |
  | Reversed-looking pedal (2 changes), then the same long hold | — | "Flip it" suggestion |

  - **Toast clicks:** with buttons, class "toast show act". After a plain toast, "toast show" and `pointer-events: none`. After a button press, "toast".
  - **Migration:** `{pedalRev:true,pedalHow:'use'}` → `{}` (saved). User flip kept. `{pedalHow:'use'}` kept.
  - 0 page errors.
- **Screens:** I checked the pedal rows ("Reversed?" / "CC 64" with Flip, one line each) and the Undo/Keep toast in Emerald, Velvet and Sapphire. All are matte and readable. Shots: /tmp/claude-0/-home-claude/8f011bf6-a859-5a1d-89cc-c895f4dc55d3/scratchpad/ux15b/rows.png and seen-{emerald,velvet,sapphire}.png.
- **Sound:** no sound generation changed.

## Known limits
- **Some normal taps still flip for the visit.** A normal pedal pressed first, with the chord struck about 0.1 s later and lifted within about 0.45 s, still looks like reversed legato. It is the same pattern in time, so it can still flip after 3 such taps, for this visit only. It comes with Undo/Keep, shows "Reversed?", and normal legato pedalling puts it back. A reload always clears it.
- **A reversed-pedal player who never presses Keep is guessed again every visit.** That takes 3 legato changes and shows the toast each time. Flip on the row also saves it.
- **Making a guessed flip permanent after the message has gone takes two Flips.** Flip on a "Reversed?" row sets the pedal to normal (saved), and a second Flip sets it to Reversed (saved). Keep is only in the message.

## Updated try list (test link, real keyboard)
1. Plug in your keyboard and press Connect MIDI. Hold the sustain pedal, play a chord and let go of the keys. The chord rings until you lift the pedal, and the Sustain light comes on.
2. Hold the pedal down while you press Connect MIDI (or reload), then lift it. Nothing changes: the pedal still works the right way.
3. Play a melody without the pedal, then tap the pedal briefly on a few chords. The pedal stays normal. If the app ever guesses wrong, the message has **Undo**, and a reload always clears a guess.
4. If your pedal works backwards (notes ring when your foot is up), play a few chords changing the pedal between them. A message says it was flipped for now. Press **Keep** to remember it, or go to MIDI device → Controls detected → Sustain pedal → **Flip**. With two keyboards, each has its own Flip.
5. Hold a pad with the pedal down for a long time while you play an arpeggio. No "Flip it?" message appears.
6. No pedal? Tap **Sustain** at the top of "Your controller". On a phone it is a full-size button.
7. Turn any knob on your keyboard. A message says "Knob 1 → Reverb" and the effect moves right away. The transport buttons are listed under "Buttons", not "Knobs & faders".
8. Press Rec, hold the pedal while you play, and stop. The notes are as long as you held them with the pedal.
