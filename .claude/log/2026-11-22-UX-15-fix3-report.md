# UX-15 fix 3 report (studio-ux-dev, 22 Nov 2026)
Branch `preview-ux-15`, head **57d0d4e** (pushed; main untouched). Clone /home/claude/sk-ux15c.
Files: `src/midi.js` (pedal block and the pedal row), `src/head.html` (1 CSS line, pedal rows only), `tests/smoke.mjs` (3 pedal lines rewritten), `index.html` rebuilt.

## Fixes
1. **The pedal never flips on its own (medium).** Every pedal works the normal way until the player says otherwise. There is no automatic or visit-only flip any more (AUTO_REV, "flipped for now", Undo/Keep, "back to normal" are gone).
   - **One suggestion instead:** toast "Notes ringing when your foot is up? Flip the pedal" with **Flip** and **It's fine** (with two keyboards: "Flip the CASIO USB-MIDI pedal").
     - Flip saves the pedal as reversed (the player's choice, `pedalRev:true, pedalHow:'user'`).
     - It's fine saves it as normal (the player's choice, `pedalRev:false, pedalHow:'user'`), says "OK, the … pedal stays as it is", and that keyboard is never asked again, also after a reload.
     - At most one suggestion per visit (for all keyboards together). Ignoring it (toast times out) changes nothing.
   - **Why a new evidence rule.** A normal pedal tapped on a chord sends exactly the same messages as a reversed pedal played legato (the tester's grid shows it), so votes from chord changes alone can't tell them apart. The suggestion now needs two separate signs:
     1. **The first pedal message from that keyboard in the visit is "off" while it catches a chord**: keys held, a key struck 30–600 ms before. That is a reversed pedal pressed from rest. A normal pedal's first message is always "on" (a press). When it was held while the page connected, its first message is a lift, usually before you play, and that doesn't count.
     2. **Reversed-looking legato changes:** 3 more than normal ones (same rule as fix 2), or 2 and none normal followed by a long ringing hold (10 s, 8 keys let go).
   - Keyboards "seen working normally" (`pedalHow:'use'`) or with a saved choice are never asked.
2. **3 taps then a 10 s pad hold (low):** fixed by the same rule. A normal pedal starts with a press, so it never gets the first sign.
3. **Flip on a row does what the label says (low).**
   - Rows read only "CC 64" (normal) or "Reversed" (saved), and Flip toggles the saved choice.
   - Tooltips: "Use this if notes ring when your foot is up" on a normal row, "Set this pedal back to normal" on a reversed row. The aria-label says the current state.
   - Migration kept: old automatic flips are dropped, user flips kept (checked again, table below).
   - **Row wrap fixed:** pedal rows get a `ped` class: the label can shrink, with "…" on a long keyboard name (full name in the tooltip), and the value never wraps. In the 318 px panel both pedal rows are one line (35 px tall, scrollWidth = width = 318) in all three themes. Other rows are unchanged.

Kept from fix 2: the toast `act` fix (MutationObserver), the long-hold rule (now also needs the first sign), per-keyboard rows and Flip, migration, the half-damper rule (a value between 0 and 127 saves "seen working normally").

## Tests
- **check.sh:** 3 runs on a loaded shared machine (load average 13-22 on 2 CPUs).
  - Runs 1 and 2 failed only on timing tests outside UX-15's files:
    - run 1: a `callFunctionOn` timeout plus 2 song-editor lines reading −1 notes
    - run 2: the velocity lane drag

    All controller lines passed in run 2.
  - **Run 3 (load about 10): PASS bundle syntax · PASS worker syntax · SMOKE OK: 87 checks · CHECK OK.** All 6 controller lines pass, with no page errors. Logs: /home/claude/reports/ux15-fix3-check{,2,3}.log.
- **Smoke:** the 3 pedal lines rewritten, and all pass:
  - "a pedal held while connecting and then lifted is not flipped; a reversed pedal played legato gets a Flip suggestion (not flipped until Flip)": `{"held":true,"free":true,"notFlipped":true,"casio":true,"casioFlip":true}`.
  - "with two keyboards, Flip changes only the keyboard on its own row": `pa,py,pc · false,true,true · CC 64 Flip|Reversed Flip|Reversed Flip`.
  - "a normal pedal tapped on chords never flips or asks; It's fine keeps the pedal as it is and stops asking; plain toasts don't catch clicks": `{"tap":"false,false,false,9","asked":true,"fine":true,"again":false,"act":false}`. 9 reversed-looking votes, no ask, no flip, nothing saved.
- **The tester's grid**, rerun with their harness: 45 cells, pedal offset −150..+150 ms × tap 0.2–0.6 s, **6 taps each** (the tester used 4). Probe at /tmp/claude-0/-home-claude/8f011bf6-a859-5a1d-89cc-c895f4dc55d3/scratchpad/ux15c/probe.cjs, output probe.json.
  - **0 of 45 ask, 0 flip, 0 save.** The 27 cells that flipped before still collect 5 reversed votes each, but no ask without the first sign.
- **Musical patterns**, 6 bars each:

  | Pattern | Asked | Flipped |
  |---|---|---|
  | Stabs | no | no |
  | Trained legato | no | no |
  | Untrained | no | no |
  | HoldBar | no | no |
  | Original case | no | no |
  | StabsLate | no | no |
  | House 124 (lift 0.85 beat) | no | no |
  | House 128 (lift 0.95 beat) | no | no |
  | Beat 120 (lift half a beat) | no | no |
  | 3 dabs then a 10.5 s pad hold with a 24-note arpeggio | no | no |
  | Try 2 then Try 3 in one visit: pedal held at Connect and lifted, then melody + 6 taps | no | no |

- **Reversed pedal (Casio), legato from a chord** (chord, foot down 150 ms later, then lift and re-press around each new chord):
  - The suggestion shows on the **3rd chord change**.
  - Before Flip: not flipped, saved `{}`, row "CC 64".
  - Flip saves `{pedalRev:true, pedalHow:'user'}` and the row reads "Reversed". Pressing the foot (0) holds a note and lifting (127) frees it.
  - A second reversed keyboard in the same visit: 0 more suggestions, nothing changed.
  - Row Flip on "Reversed" → normal ("set back to normal"), and again → Reversed.
- **It's fine:** a reversed-looking pedal (first sign, plus 2 legato changes and a 10.5 s ringing passage) asked through the long-hold path.
  - It's fine saved `{pedalRev:false, pedalHow:'user'}` and the row reads "CC 64".
  - 5 more legato changes with the per-visit flag reset: no ask.
  - After a reload, 5 more: no ask, still saved normal.
- **Migration** (seeded):

  | Saved before | After loading this build |
  |---|---|
  | `{pedalRev:true, pedalHow:'use', cc:{21:'fx0'}}` | `{cc:{21:'fx0'}, how:{21:'auto'}}` |
  | User flip | kept |
  | `{pedalHow:'use'}` | kept |
  | First build's automatic flip | `{}` |
  | First build's user flip | `{pedalRev:true, pedalHow:'user'}` |

- **Screens:** shots at /tmp/claude-0/-home-claude/8f011bf6-a859-5a1d-89cc-c895f4dc55d3/scratchpad/ux15c/: rows-{emerald,velvet,sapphire}.png and rows-desk.png.
  - Two pedal rows on one line each ("Sustain pedal · CASIO USB-… Reversed Flip").
  - The suggestion toast with Flip / It's fine, on a matte solid background (rgb 15,32,25 / 35,17,24 / 17,28,50, no gradient).
- 0 page errors. No sound generation changed.

## Known limits
- **A reversed pedal whose first press comes before any key is never suggested.** Pressing the foot first and then playing sends the same messages as a normal pedal held at Connect and lifted. Flip on its row (MIDI device → Controls detected) is the way out, and it is saved.
  - This changes the tester's reversed probes: their pattern starts with the foot pressed 300 ms after Connect, before any note. To get the suggestion, start with a chord and press the pedal about 0.15 s after it.
- **Two rare normal cases can still show the suggestion (never a flip):**
  - A normal pedal held at Connect, a chord played while it is held, the pedal lifted while the keys are still down (within 0.6 s of a key), then tap-style pedalling (probe "HeldConnectChordTaps": asked).
  - A keyboard that sends CC 64 = 0 by itself within 0.6 s of a key while keys are held, before any real pedal press.

  In both cases It's fine ends it for good.
- **A reversed pedal sounds wrong until the player presses Flip.** Notes ring with the foot up and are cut with it down. This is the price of never flipping on its own.

## Try list (test link, real keyboard)
1. Plug in your keyboard and press Connect MIDI. Hold the sustain pedal, play a chord and let go of the keys. The chord rings until you lift the pedal, and the Sustain light comes on.
2. Hold the pedal down while you press Connect MIDI (or reload), then lift it. Nothing changes: the pedal works the right way, and no message appears.
3. Play a melody without the pedal, then tap the pedal briefly on a few chords (with the chord, or for about a beat at house tempo). The pedal stays normal and no message appears, however many chords you play.
4. If your pedal works backwards (notes ring when your foot is up), play a chord, press the pedal, and change the pedal between a few chords. After about 3 changes a message asks "Notes ringing when your foot is up? Flip the pedal".
   - Press **Flip** to fix it for good.
   - Press **It's fine** if the pedal is OK, and it won't ask again for that keyboard.
   - You can always flip it yourself: MIDI device → Controls detected → Sustain pedal → **Flip**. The row says "CC 64" (normal) or "Reversed". With two keyboards, each has its own row and Flip.
5. Hold a pad with the pedal down for a long time while you play an arpeggio. No message appears.
6. No pedal? Tap **Sustain** at the top of "Your controller". On a phone it is a full-size button.
7. Turn any knob on your keyboard. A message says "Knob 1 → Reverb" and the effect moves right away. The transport buttons are listed under "Buttons", not "Knobs & faders".
8. Press Rec, hold the pedal while you play, and stop. The notes are as long as you held them with the pedal.

## For the tester
- Reversed-pedal probes need a chord before the first press (step 4 above).
- `PEDAL_ASKED` (global) is the per-visit flag. Probes that check many keyboards in one page reset it to `false` between cases.
