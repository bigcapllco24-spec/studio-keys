# UX-15 fix 1 report (studio-ux-dev, 22 Nov 2026)
Branch `preview-ux-15`, head **7d891d9** (pushed; main untouched). Clone: /home/claude/sk-ux15.
Files: `src/midi.js`, `src/head.html` (2 small CSS rules), `tests/smoke.mjs` (2 lines), `index.html` rebuilt.

## Fixes
1. **Pedal direction (medium).** The app no longer decides from the first message. Every pedal starts as normal, so a pedal held while the page connects and then lifted, or a keyboard that sends "off" on connect, changes nothing.
   - The direction is learned from playing. In legato pedalling, a short lift (under 0.7 s) with a new chord struck in it, after a hold of at least 0.8 s in which keys were let go, shows which side is "up".
   - 3 such changes more one way than the other flip the pedal. A toast says so ("The sustain pedal on CASIO USB-MIDI works the other way round, so it was flipped.") and has an **Undo** button.
   - 2 changes the normal way confirm a normal pedal.
   - If the pedal has been "on" for 10 s or more and 8 or more keys have been let go, the app only suggests a flip: a toast with a **Flip it** button, once per session. It never flips by itself in that case.
   - The Flip button always wins and is saved as the player's choice (`pedalHow: 'user'`). A half-damper value still cancels an automatic flip.
   - Old automatic guesses saved by the first build (`pedalAuto: true`) are dropped on load. A Flip the player pressed before is kept.
   - Brief deviation: the brief suggested a toast with Undo and saving only once use confirms it. I combined both: an automatic flip needs evidence from use, is saved, and always comes with Undo. A weak sign only gives a suggestion.
2. **Flip with 2 keyboards (medium).** "Controls detected" shows one "Sustain pedal · <keyboard name>" row for every keyboard that has sent CC 64 while "All connected controllers" is selected. Each row has its own Flip button (`data-pedalflip=<input id>`, with an aria-label that names the keyboard). Flip changes only that keyboard. The row reads "Reversed" or "CC 64".
3. **Endless-knob false positive (low).** Repeats of 0 or 127 alone never mark a knob endless. A real 2's-complement encoder turned down slowly (127 127 …) is still caught once it also steps up: the last 4 values are all in the band and switch between up and down at least twice.
4. **Buttons vs knobs (low).** A CC that has only ever sent 0 and 127, and is not mapped to an effect, is listed under a new **Buttons** row with its job, e.g. "CC 117 Stop, CC 118 Play, CC 119 Record". "Knobs & faders" lists only real knobs.
5. **Phone tap target (low).** `@media (pointer:coarse){#susBtn{min-height:44px}}`. Desktop stays 78×24. On a 390 px touch screen it is 84×44, with no sideways scroll (scrollWidth 390).

New global helpers in `midi.js`: `toastAct(msg,label,fn)`, which shows a toast with a button for 9 s (CSS `.toast.act.show{pointer-events:auto}`), and `flipPedal(inp)`. `core.js` is not touched; `toastAct` reuses its `toastTimer`.

## Tests
- **check.sh:** `PASS bundle syntax · PASS worker syntax · SMOKE OK: 86 checks · CHECK OK`, no page errors. Two new smoke lines pass:
  - "controller: a pedal held while connecting and then lifted is not flipped; a reversed pedal is flipped from how it is played, with Undo"
  - "controller: with two keyboards, Flip changes only the keyboard on its own row" (rows pa,py,pc; after Flip on py: Akai false, Yamaha true, Casio true)
- **Probe** (fake devices, timestamps written into the messages):
  - **Held-then-lifted Yamaha:** first message 0 → `pedalRev` false, nothing saved, sustain off.
  - **Then 3 normal press, chord, release, lift cycles:** held 3 of 3 and freed 3 of 3. No flip and no toast.
  - **Normal legato pedalling:** confirmed normal (`pedalHow: use`) after 2 changes.
  - **Reversed Casio played legato:** first 0 → not flipped. After 3 changes it was flipped, with the Undo toast. It then held a note while pressed (0) and let go on 127. Undo → normal, `how: user`.
  - **Undecided pedal "on" for 10.8 s with 9 releases:** the "Flip it" toast appeared and nothing was flipped.
  - **Flip with 3 pedals listed, All selected:** only the Yamaha changed; the Akai stayed false.
  - **CC 26 sending 120, 127, 127, 127:** not endless. **CC 12 sending 127 127 127 1 1 127 1:** rel2c. **CC 13 sending 1 1 1:** rel2c.
  - **Akai Buttons row:** "CC 117 Stop, CC 118 Play, CC 119 Record". Knobs: "CC 12, CC 13, CC 26, CC 70 · endless".
  - **Migration:** `{pedalRev:true,pedalAuto:true}` → `{}`; `{pedalRev:true,pedalAuto:false}` → `{pedalRev:true,pedalHow:'user'}`.
  - 0 page errors.
- **Screens:**
  - Controls detected with 2 pedal rows and the Buttons row, checked in Emerald, Velvet and Sapphire: matte and readable. The Undo toast looks right.
  - Phone 390 (touch emulation): Sustain is 44 px tall, with nothing scrolling sideways.
  - Shots: /tmp/claude-0/-home-claude/6d9676c1-ae5d-5d79-9dc8-54fa8ffa864f/scratchpad/ux15/seen-all.png, toast-desk.png, phone-390.png
- **Sound:** no sound generation changed.

## Known limits
- A reversed pedal used without legato pedalling (press, play, let go of keys, lift) isn't flipped automatically. The player gets the "Flip it" suggestion after about 10 s of ringing, and Flip is on the device row.
- A normal pedal tapped briefly on chords after long stretches without pedal could count toward "reversed". It needs 3 more such changes than normal ones, and the flip always comes with Undo.
- Behaviour change from the first build: a reversed pedal is no longer flipped on its very first press.

## Updated try list (test link, real keyboard)
1. Plug in your keyboard and press Connect MIDI. Hold the sustain pedal, play a chord, and let go of the keys. The chord rings until you lift the pedal, and the Sustain light comes on.
2. Hold the pedal down while you press Connect MIDI (or reload), then lift it. Nothing changes: the pedal still works the right way.
3. If your pedal works backwards (notes ring when your foot is up), play a few chords changing the pedal between them, or press **Flip it** in the message. You can also go to MIDI device → Controls detected → Sustain pedal → **Flip**. With two keyboards, each has its own Flip.
4. No pedal? Tap **Sustain** at the top of "Your controller". On a phone it is now a full-size button.
5. Turn any knob on your keyboard. A message says "Knob 1 → Reverb" and the effect moves right away. The transport buttons show under "Buttons", not "Knobs & faders".
6. Press Rec, hold the pedal while you play, and stop. The notes are as long as you held them with the pedal.
