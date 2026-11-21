# SE-7a branch check (qa-tester) · 15 Nov 2026
Branch `preview-se-7` at 81a9479 (+ my smoke commit). Worktree `/home/claude/wt-se-7`.

## Verdict: READY
Nothing broken, no regressions, check passes, the chip and popover work at 1400 / 390 / 360 px in all three themes. One medium and three low problems, all about **what the key reading says**, not about notes moving. #1 and #2 are small fixes in `src/music.js`. They can go back to sound-engine-dev before the owner tries it, or be noted for 7c. The owner will sing over a beat, so I'd fix #1 and #2 first if there's time.

## Bugs
1. **(medium) A sung melody on its own can read as the wrong key, and Keys then locks that key in.** Melody notes at the start of a bar are counted as "bass" roots.
   Steps: New song → `add_drums` (house) → "let me sing the melody" with the fake mic (`tests/fixtures/sing.wav`) → wait for the take → "add a bassline".
   Expected: the take (A C G E G A C G G) reads as C major or A minor, and the bass is built in that key.
   Actual: run 1 of 2 read **G major**, with the reason "the bass lands on G" (there is no bass). The take had 7 notes, too few for a reading, so Keys picked a key by itself and stored "G major · Keys picked". The bassline was built in G major. A second take that came out with 9 notes also read G major before the bass. After Keys added the bass the chip changed to "C major · sure". Run 2 read A minor.
   Files: `src/music.js` `detectKey` (`barRoot`, `why`) and `keysPickKey`. Owner: sound-engine-dev.
2. **(low) The reasons say "the bass lands on X" when the song has no bass part.**
   Steps: New song, chords only (no bass track): F♯m–E–D–E. Tap the key chip.
   Expected: a reason about the chords. A musician would also expect A major (same notes) as the second guess.
   Actual: chip "F♯ minor · likely · or **E major**". In the popover, E major's reason is "the bass lands on E", but there is no bass, and E major has D♯ while the chords play D. A major only comes third.
   Fix idea: when no notes are low or on a bass track, say "the chords keep coming back to E", and lean the second guess toward the relative key. File: `src/music.js` `why`.
3. **(low) "from your humming" shows up when the key didn't come from humming.**
   a) Steps: A minor chords (chip "A minor · maybe · or C major"), then sing a melody. Actual: chip "A minor · from your humming"; the key came from the chords.
   b) Steps: Import `test.mid`, import `sing.wav`, turn the audio into notes. Actual: "C major · from your humming" for an imported audio file.
   Expected: "from your notes", or "from your humming" only when the take decided the key. Files: `takeKey` in `src/music.js` (it always sets `hum:true`).
4. **(low) The hum reply states the key as a fact.** Hum 12 notes on an empty song. Actual: "Got your hum: 12 notes in D minor…". The sung-take reply now says "(it sounds like …)" for a guessed key. File: `src/assistant.js` (around line 144; not changed in 7a).

## Rough edges (not bugs)
- Dm–B♭–F–C and Am–F–C–G with the bass on the roots read only **"maybe"**. That progression (i-VI-III-VII) is the most common one in the owner's genre, so his own loops will often look unsure. The key is right; the word is honest; it may still look weak.
- With a harmonic-minor V chord, the second guess is the parallel major ("A minor · sure", 2nd "A major — the bass lands on A") even though C naturals are played. It only shows in the popover.
- With no key yet, the popover's "Keep on auto" button only closes the popover.
- At 1400 px the key box jumps from the first transport row to the second when the chip text grows from "no key yet" to "F♯ minor likely · or E major", so Length, Metronome and the others shift.
- Piano-roll scale shading and mic snap still read the stored `PROJ.key`, so a key the chip only works out from the notes gives no shading or snap. Same as main; the developer lists it as a known limit.
- Offline parser, not part of this change: "change the key to e minor" gives no action, because the regex needs "key e minor" or "in e minor" (already like this on main; `maker.js` untouched). "what key is this" has no offline answer yet (planned for 7c).

## What I checked (numbers)
- `bash .claude/tools/check.sh`: **CHECK OK, SMOKE OK 52 checks** (51 plus 1 new from me), no page errors, **150 s** in total (under 3 min).
- **Key readings, 14 progressions typed in like a player** (slightly off the beat, varied velocity, some inversions):
  - 13 of 14 read exactly the expected key. The 14th (Am–F–C–G with no bass) read A minor, and C major / A minor is a fair call there.
  - Words given: sure ×6, likely ×7, maybe ×1. The second guess was the relative key 10 of 14 times.
  - Covered: C, G, B♭, E♭, A, D major and A, E, F♯, C, G, D minor, including ii-V-I with 7ths, harmonic minor, inversions with no bass, and bass only.
- **Fake MIDI keyboard, played in real time while recording:**
  - Dm–B♭–F–C (+ bass): D minor · maybe
  - Am–Dm–E–Am (G♯): A minor · sure
  - E–C♯m–A–B: E major · likely
  - Keys' melody over the E major take: 20 notes, 0 outside E major.
- **New parts follow the key:** F♯ minor (auto): melody 19 notes / 0 outside, bass 16 / 0 outside, and the key stays on auto. Old song (smoke): 0 outside A minor. Vibe (Ben Böhmer → F minor · from the vibe): bass 0 outside. "Another one" on a G minor bass: 0 outside, key kept.
- **Popover:** 3 guesses, each with a DJ key and a reason.
  - Set on the 2nd guess → "C major · set", the menu shows C major, the notes don't move, the popover closes, toast "Key set to C major. New parts follow it."
  - Undo → back to auto; Redo → set again; "Back to auto" → auto with a toast; Undo of Back to auto → set again.
  - Esc and an outside click close it; focus goes into the popover when it opens.
- **Key menu:** picking F major on an F song doesn't move notes. Then G major moves them +2, and Undo brings them back. "Key: auto" goes back to the reading. The user `key` action (C minor) on a Keys-picked A minor song moves the parts +3.
- **Keys picked:** drums-only, then add a bass → "A minor · Keys picked", the menu shows A minor, and the AI context says "picked by Keys for the first part (the user didn't choose it)".
- **Hums and takes:**
  - A 3-note hum through the assistant leaves the key empty ("no key yet"); a 12-note hum gives "D minor · from your humming" (soft, not stored as set).
  - A sung bass over a set F major key gives 8 notes, 0 outside F, and the key stays set. Undo removes the take in one step.
  - A 7-note sung take gives "no key yet", which is correct (it needs 8).
- **Old songs:** a legacy song with a key and no `from` reads "D minor · set" and its notes don't move. A song with an auto key reopens with the same reading. A new song leaves no extra undo step.
- **Import MIDI fixture:** Lead (8 notes, C D E G A) → "C major · likely · or A minor"; the Kick track is ignored.
- **Zip README:** "Key: D minor (DJ key 7A)". AI context: "D minor (DJ key 7A), worked out from the user's notes: maybe, could also be F major; starts on D".
- **Vibe over your own notes:** soft F major chords, then "make it like Ben Böhmer" or vibe Stephan Bodzin → stays F major (the artist key doesn't override).
- **Layout:** 1400 / 390 / 360 px × Emerald / Velvet / Sapphire × no key / auto / set, 27 screens in all.
  - No sideways scroll anywhere; the popover stays 16 px from both sides (16–374 at 390, 16–344 at 360); the smallest button is 36 px.
  - The background follows the theme (`--panel`). The only fixed colour is the popover's shadow, the same as the existing song menu and toast.
- **Speed:** `keyStatus()` 0.56 ms on a 96-bar song with 4,704 pitched notes; `renderTracks()` 9.9 ms.

## Smoke lines
- The developer's 4 lines are sound. I changed the chip text in the F major line to read "F major sure" instead of "F majorsure" (wording only).
- I added 1 line: the popover's Set only relabels (notes stay), Undo goes back to auto, "Back to auto" works, and Keys picks a key for a bass on a drums-only beat.
- Not covered by smoke: the reasons' wording (#2) and sung-take readings (#1). I'll add them once they're fixed.

## Screenshots
`/home/claude/qa-se7/`:
- `L-<width>-<theme>-<none|soft|set>.png`: 27 layout shots with the popover open
- `live-dminor.png`, `sing-melody.png`
- `pop-desktop-*.png`, `pop-keys-picked.png`: clipped wrong, use the L- shots instead

Scripts: `/tmp/claude-0/-home-claude/fa928ce0-b28c-5357-8d40-e846e3f15247/scratchpad/qa1.mjs` … `qa5b.mjs` (logs `qa*.log`).
