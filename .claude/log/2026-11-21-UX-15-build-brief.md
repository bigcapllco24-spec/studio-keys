# UX-15 · Bug fix (Build mode) · studio-ux-dev · 21 Nov 2026
Read `.claude/standards/dev-standards.md` first. Sections that matter: "Owner rules from 19 Nov 2026" (MIDI controllers line), "Quality bar" (undoable, works tablet to desktop, shortcuts shown), "How we build".

Repo: `git clone -q https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-ux15 && cd /home/claude/sk-ux15 && git checkout -b preview-ux-15 origin/main` (main d35b13f).

## The owner's bug (19 Nov, his words)
"The keyboard buttons such as sustain, etc aren't working, and when we map the MIDI to the connected — for example Akai — the knobs should be mapped to the effects automatically depending on the MIDI, but when I connected it to another MIDI, the knobs didn't do anything."

## Job
1. Find why sustain (CC64 pedal and sustain buttons that send CC64, plus common transport/octave buttons) does nothing. Fix so sustain holds notes in live play and when recording (note-offs deferred until release; recorded note lengths include the hold).
2. Knobs: today the mapping seems tied to the Akai (check `src/midi.js`, `src/controller.js`). Add a generic fallback for unknown devices: the first knobs/encoders a device sends (common CC ranges 1, 7, 10, 11, 70-79, 21-28, 14-21, 102-119, relative-encoder modes) map to the same effects the Akai map uses on the selected track, picked up automatically the first time a CC moves, and shown on screen (a toast or the controller panel says "Knob 1 → Filter" etc). The Akai keeps its exact current mapping. Mod wheel (CC1) and pitch bend keep their SE-10 behaviour (only live-played notes).
3. Don't build a manual MIDI learn UI now (that needs a design); but structure the mapping table so learn can be added later, and note in your report how it would plug in.
4. Test with the fake MIDI stub (navigator.requestMIDIAccess in evaluateOnNewDocument): an "Akai MPK mini" device and an unknown "Generic USB MIDI" device; sustain on both; knobs on both. Add smoke lines for: sustain holds a note, unknown device knob moves an effect, Akai map unchanged.
5. `python3 tools/build.py`; `bash .claude/tools/check.sh` must pass (save/reopen pair can flake under load; rerun if only those two fail). Commit and push preview-ux-15 after each step (WIP fine). Never push main. Stay in your files; any tiny edit elsewhere must be listed.

## Report (short, plain)
The cause, the fix, numbers from tests, check.sh line, head hash, 3-4 "try" steps for a musician with a real keyboard, and one question for the owner if you need to know his other device.
