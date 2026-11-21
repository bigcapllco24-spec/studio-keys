# UX-7 re-check after merging main (qa-tester) · 15 Nov 2026

**READY.** I tested the merge (09c5bbd: UX-7 plus UX-2, UX-5 and SE-3) with a real mouse and keyboard in headless Chrome. Every point in the brief passes. The editor's pointerdown, which now holds both `edFocus()` and UX-2's velocity group drag, works for both, and the "plays in" toast fires once with UX-5's wording. My finding from this morning (editor shortcuts dead after typing to Keys) is fixed in Loop mode and in Song mode. The earlier LOW finding (no focus ring when you Tab to the canvas) is also fixed: `#edCanvas:focus-visible` is in `src/head.html`.

I found no blocking bugs. One low note is below.

## Problems
1. **LOW, seen once, not reproduced: a first Ctrl+Z after Ctrl+D did nothing.**
   - Steps: Full track in Song mode → type "more reverb on the chords" to Keys → double-click Chords in the Drop → Ctrl+A, ArrowUp, ArrowRight, Ctrl+C, Delete, Ctrl+V, Ctrl+A, Ctrl+D (40 notes) → Ctrl+Z.
   - Expected: 20 notes, the pasted state.
   - Actual, once: still 40 notes. Each later Ctrl+Z then landed one step behind (40 → 20 → 0 → 20 → 20).
   - The same sequence passed **11 times after that**: 1 + 3 full runs (3 of them in parallel under load), plus 6 loops with every undo push logged. Each time it went 40 → 20 → 0 → 20 → 20 → 20 (original), with exactly one undo step per key.
   - My guess: an extra undo snapshot sometimes lands right after the paste. It could also be a harness timing glitch on a loaded machine (load 3-10 from other agents). It's not a merge regression, since the sequence never touches the merged lines.
   - If it comes back, look at `edPaste`, `setBars` and `ED.oneStep` (`src/daw.js`) and the 120 ms merge in `undoNote` (`src/edit.js`). Not filed.

## check.sh
- On the branch as given: PASS build · PASS bundle syntax · PASS worker syntax · SMOKE OK: 51 checks · CHECK OK · **1 min 47 s** at load about 3.
- With my 1 new and 2 tightened checks: **SMOKE OK: 52 checks · CHECK OK**, twice. Both runs took **4 min 13-14 s**, at load 10-11 because other agents' Chrome instances were running. The whole-song MP3 step alone went from 21 s to 82 s, so the time is from load, not from the new check. The new check adds about 3-4 s (two typed Keys replies), so on a quiet machine the total should be about 1 min 50 s, under the 3 min budget.
- Whole-song MP3 (Short, drums): 33.02 s, peak -0.82 / -0.35 dBFS, RMS -6.7 / -6.8 dB, no clipping. No page errors.

## What I checked
Branch `preview-ux-7` @ 09c5bbd, built index.html, 1400×1100 unless noted. Real mouse and keys via puppeteer, fake MIDI input, fake mic `sing.wav`. Focused script: 24/24 pass on 4 full runs.

**A. Song mode, typed to Keys, then double-click Chords in the Drop** (Full track, 6 sections, 96 bars)
- Focus goes from `asIn` to `edCanvas`.
- Ctrl+A selects 20/20. ArrowUp and ArrowRight move the notes; still 6 sections and 96 bars.
- Ctrl+C, Delete, Ctrl+V, Ctrl+A, Ctrl+D: 20 → 0 → 20 → 40 notes. Sections stay 6, bars stay 96.
- Ctrl+Z ×5: 20 (paste) → 0 → 20 (after arrows) → 20 → 20 (original). Ctrl+Y redoes one note step, and sections stay 6.

**B. Section name, then Delete**
- Click the Break name (focus on `.sname`), Delete: 6 → 5 sections. Ctrl+Z: 6. The editor's 20 notes are untouched.

**C. Editor already open, type to Keys, click a note**
- Focus goes from `asIn` to `edCanvas`, 1 note selected. Delete: 20 → 19. Ctrl+Z: 20. Sections stay 6.

**D. Typing in the Keys box with 3 notes selected**
- I typed "asd fg", then Backspace, then Delete. The box reads "asd f".
- 0 piano notes played, 0 notes deleted, no playback. So focusing the editor doesn't steal keys from the text box.

**E. Velocity lane group drag after typing to Keys** (UX-2 inside the merged pointerdown)
- 6 selected bars moved together: 0.7/0.5 → 0.9/0.7. The 7th, unselected, stayed at 0.7.
- 1 undo step. Focus is on the canvas, and Ctrl+Z restored all 6.

**F. Space**
- Editor in Song mode: plays, then stops. No page scroll (scrollY 2092 → 2092), no notes changed.
- Song area (Drop name focused): plays, then stops.
- In the Keys box: types a space, doesn't play.

**G. Loop mode**
- Type "add a melody" to Keys, then click the Chords lane: the editor opens. Ctrl+A, Delete, Ctrl+Z: 20 → 0 → 20.
- Editor open, type "a bit more swing", click a note: focus goes from `asIn` to `edCanvas`. Ctrl+A, Ctrl+D: 20 → 40. One Ctrl+Z: 20.
- Space in the editor: plays, then stops.

**H. Sung chords in Song mode** (Short layout, Intro selected)
- Exactly **1** "plays in" toast: "“Sung chords” plays in Intro. Click its empty parts to add it elsewhere." That's UX-5's text, and Song mode comes back afterwards.
- Singing the chords again: still 1 Sung chords track and **0** "plays in" toasts (`songFreshCancel` works).

**I. Toasts for new tracks**
- MIDI file into the Drop: exactly **1** toast, "“Lead” and “Kick” play in Drop. Click their empty parts to add them elsewhere."
- Two parts added quickly with the Break selected (melody, then "add a choir"): **1** toast, "“Melody 2” and “Choir” play in Break. …". So the ids build up, as the merge report says.
- One part ("add a flute", Intro selected): 1 toast, singular wording, "“Flute” plays in Intro. Click its empty parts …".
- MIDI import in Loop mode: only "Imported 2 MIDI tracks from test.mid", no "plays in" toast.
- Side note: "add a bassline" when a bass already exists replaces it, so it adds no track and shows no toast. That's correct.

**J. Phone width**
- 390 px: page 390 px wide, also 390 with the editor open.
- 360 px: 360, also 360 with the editor open. No sideways scroll.
- The 401 px overflow I noted on 14 Nov is gone.

**Page errors:** none in any run. The console shows only the sandbox's blocked-network errors.

## Tests added (tests/smoke.mjs, committed to preview-ux-7)
- New: "song/loop: after typing to Keys, double-click a part or click a note gives the editor the keys (Space plays/stops, Delete removes the note)". It types into `#asIn` like a user. I didn't run it against `main`, but it should fail there: this morning's daily session found that clicking the canvas on `main` leaves focus in the Keys box.
- Tightened: the MIDI-import toast check and the UX-5 sung-chords toast check now require **exactly one** "plays in" toast, which guards against a double toast from the merged `songSync`.

## Screenshots
/tmp/claude-0/-home-claude/ac717c87-a784-5c3e-b306-9aeb289d9946/scratchpad/ux7r/shots/
- `branch-01-song-full.png`, `branch-02-song-dbl-after-keys.png` (Chords editor for the Drop after the double-click, Song mode)
- `branch-03-song-section-delete-undo.png`, `branch-04-song-velocity.png`, `branch-05-loop-editor.png`
- `branch-06-song-sung-toast.png` (the one UX-5 toast), `branch-07-song-midi-toast.png` (the Lead and Kick toast)
- `branch-08-phone-390.png`, `branch-09-phone-390-editor.png`, `branch-08-phone-360.png`, `branch-09-phone-360-editor.png`
- `rep1-*`, `rep2-*`, `rep3-*`: the repeat runs.

Scripts (`t1.mjs` is the focused test, `t4.mjs` the undo repeat) and logs are in /tmp/claude-0/-home-claude/ac717c87-a784-5c3e-b306-9aeb289d9946/scratchpad/ux7r/
