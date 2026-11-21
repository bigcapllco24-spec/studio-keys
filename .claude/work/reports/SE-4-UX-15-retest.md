# Re-checks SE-4 and UX-15 · qa-tester · 22 Nov 2026 (saved by the lead from the hand-back)

## SE-4 (preview-se-4 @ 952403c): READY
check.sh 84 OK first run. IV I holds 2 bars per chord (33003300 at 8 bars); other holds unchanged. Six 7th-styles now 48-53% without a 7th (were 0% plain); 0 of 240 takes all 7ths; colour stable per chord; no wrong notes; spans 15-24, lowest 48-49. Voicing-only vary 20/20, "new chords" progression 10/10. Chord stems within ±0.4 dB, full mix within 0.1 dB, no clipping. Known, not SE-4: lo-fi and liquid full mixes just past 0 dBFS (SE-1 headroom).

## UX-15 (preview-ux-15 @ 7d891d9): NOT READY (one medium, small fix)
1. MEDIUM a normal pedal can still auto-flip: melody without pedal, then a chord with a 0.5 s pedal tap, 4 times → flipped (toast with Undo), and pedalHow:'use' stops learning, so it stays backwards across reloads. Fix: keep learning after an automatic decision (only a user Flip stops it), or keep auto flips per session until more evidence.
2. LOW toastAct leaves class `act` on #toast, so later plain toasts block clicks under them (pointer-events auto).
3. LOW a normal pedal held 10 s through an arpeggio gets the "Flip it?" suggestion (confusing for the owner's held-pad style).
All 5 earlier problems fixed (pedal held at connect, legato learning with Undo, per-keyboard Flip rows, endless guess, Buttons row, 84×44 phone Sustain). Everything from the first check passes again. check.sh 86 OK (3:18 and 4:10 under load).
Merge note: SE-4 and UX-15 both append smoke lines at the end of tests/smoke.mjs; keep both.
Files: /home/claude/qa-t2/ (probes, json, shots).
