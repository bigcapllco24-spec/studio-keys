# SE-7a re-check after fix 1 (qa-tester) · 15 Nov 2026
Branch `preview-se-7` at f0e5cd1 ("SE-7a fix 1"), plus my smoke commit fbb3697. Worktree `/home/claude/wt-se-7`. Main has moved to dc54d34 (housekeeping only) and the branch merges into it cleanly.

## Verdict: NOT READY (one small fix needed)
All 4 bugs from my first check are fixed and stay fixed over repeated runs. The check passes. The chip and popover look right at 1400, 390 and 360 px in all three themes.
One new **medium** problem is a regression from main: if your key came from your own notes (a hum, a sung take or chords you played), asking Keys to change the key no longer moves anything. The song ends up labelled with the new key while every part stays in the old one. The fix is a few lines in `setKey`. There is also one low display bug (the chip doesn't follow edits in the piano roll).

## Bugs from the first check, re-tested
1. **Fixed: a sung melody on its own reads as the wrong key.** I sang with the fake mic (`sing.wav`) over a house beat, 3 runs: 10, 11 and 12 notes (A C G E). All 3 read **"A minor · from your singing"** with the reason "the tune starts on A". The other guesses were C major ("same notes as A minor") and G major. Nothing was stored as set. "Add a bassline" afterwards: 16 notes, **0 outside A minor** every run, and the take itself has 0 notes outside. Before the fix, run 1 read G major.
2. **Fixed: the reasons mention a bass that isn't there.** F♯m–E–D–E as chords only (root position, and again with inversions) reads **"F♯ minor · likely · or A major"**. The reasons are "the chords start on F♯", "same notes as F♯ minor" and "the chords keep coming back to E". None of them mention a bass.
3. **Fixed: "from your humming" shown when the key didn't come from humming.**
   - a) A minor chords, then a sung melody (real fake mic, 12 notes): the chip stays **"A minor · likely · or C major"** and the popover says "Worked out from your notes". There is no "humming" label.
   - b) After importing `test.mid` (chip "C major · likely · or G major"), I imported `sing.wav` and turned it into notes. The chip stays "C major · likely" with no source label. On an empty song the same recording gives only 6 notes, so the chip honestly shows "no key yet". The "from your recording" wording itself is covered by the smoke test.
4. **Fixed: the hum reply states the key as a fact.**
   - A 12-note hum on an empty song: "Got your hum: 12 notes **(it sounds like D minor)**…", chip "D minor · from your humming".
   - The same hum with D minor already set: "…12 notes **in D minor**…".
   - A 3-note hum: no key mentioned, "no key yet".

## New bugs
1. **(medium, regression from main) Changing the key doesn't move the parts when the key came from your notes. The song gets the new key's label while every part stays in the old key.**
   Steps:
   1. New song. Hum 12 notes in D minor (D F A G F E D C D F E D). The chip shows "D minor · from your humming".
   2. "Add a bassline", then "add chords".
   3. "Keys, change the key to C minor" (the `key` action), or pick C minor in the Key menu.
   Expected: every part moves down a tone and the chip says "C minor · set". This already works when the key was set or picked by Keys, and on main it worked after a hum, because a hum locked the key: after the change, 0 notes were outside C minor.
   Actual: nothing moves. The chip says "C minor · set" while the popover says "Your notes sound like D minor". **19 notes are outside C minor** (3 in the hummed melody, 16 in the chords). Every new part is now made in C minor, against parts that are still in D minor.
   The same happens with chords you play yourself: Am chords, then Keys' bassline, then Key menu → C minor. Nothing moves, and 13 notes end up outside C minor. Main does the same in this case, but main showed no key. Now the chip says "A minor", so a musician who picks C minor expects the music to move.
   Likely fix: `setKey` in `src/studio.js` only moves notes when the old key was a set key. When the user picks a key (`from:'you'`, without `move:false`) and the chip had a key from the notes (`keyStatus().key`), move by the distance from that key. The popover's **Set** should stay relabel-only, because it passes `move:false`.
   Owner: sound-engine-dev made this change (studio.js was in its brief).
2. **(low) The key chip doesn't update while you edit notes in the piano roll.**
   Steps:
   1. New song, empty instrument track. Open the editor and draw 12 notes (Dm, B♭, F and C triads). The chip still says "no key yet", although Keys already uses D minor (`keyStatusText()` = "D minor · likely · or F major").
   2. Or: on D minor chords, select all and press **+1** twice. The chip still says "D minor likely · or F major" while the notes now read E minor, even after closing the editor.
   Opening the popover shows the new reading, so the chip and the popover disagree. The chip only catches up on the next track change.
   File: `edChanged` in `src/daw.js` redraws the editor and the track rolls but doesn't call `renderKeyChip()`. Owner: studio-ux-dev (or sound-engine-dev with permission). Main had the same gap with its old "detected" label. Now the chip is the feature, so it shows more.

## Rough edges (not bugs)
- **Sung bassline, same tune:** I sang a bassline (A C G E, the same tune) on a drums-only beat, 2 runs. Both read **"G major · likely"**, with the reason "the bass lands on G" (the bass sits on G in 2 of 4 bars). The same tune sung as a melody reads A minor. G major is defensible (no F or F♯ is sung), and Keys' chords then go in G major with 0 notes outside it, but a musician would hear A minor.
- **Sung chords on a drums-only beat:** Keys built Am–C–G–C–Em–G–Am–C–G. Run 1 read "E minor · likely", run 2 read **"G major · sure"**. "Sure" is strong for that loop. After Keys adds a bass, the word drops to "maybe".
- **Off-key notes in sung bass takes:** a sung bass take on a song with no key keeps stray notes (G♯2, C♯3), because there's no key to snap to (a bass take doesn't give a key). Main does the same (a C♯2 in my main run).
- **Still as in my first check (the developer didn't touch these):**
  - With no key, "Keep on auto" only closes the popover.
  - At 1400 px the key box jumps from row 1 to row 2 when the chip text grows. The popover starts at x = 1024 for short chips and x = 54 for long ones.
  - Mic snap and piano-roll shading still follow the stored key.
- **The standards mention `tests/phone.mjs`, but it isn't on this branch.** I did the phone checks with my own scripts.

## What I checked (numbers)
- **`bash .claude/tools/check.sh`:**
  - Run 1: **CHECK OK, SMOKE OK 54**, 198 s. That includes installing puppeteer-core into a fresh `/tmp`.
  - Run 2: 2 FAIL in an old check that SE-7 doesn't touch (the reload / last-song checks). It read the song list before the background write had landed. It passed in the next 2 runs and 0 of 10 times in a separate repro.
  - I made that check wait (up to 5 s) for the list write. After that: **CHECK OK, SMOKE OK 55 checks, 106 s**. Runs without the install take 103–122 s, under the 3-minute limit.
- **New smoke line (55):** with no bass, the reasons never say "bass", F♯m–E–D–E's second guess is A major, and a 12-note hum replies "it sounds like D minor" and labels it "from your humming". Against the build before fix 1 (9f86614) it fails, as do the developer's 2 new lines, so it guards bugs #2 and #4.
- **Chip states:** no key yet / likely / Keys picked / from your humming / set × 1400, 390 and 360 px × Emerald, Velvet and Sapphire: **45 screens, popover open**.
  - No sideways scroll on any of them.
  - The popover sits at 16–374 px (390) and 16–344 px (360), and stays fully in view.
  - The smallest button is 36 px tall.
  - The popover background equals `--panel` in each theme (Emerald #0e1c17, Velvet #1f0f16, Sapphire #0f182c).
- **Popover with real clicks:**
  - Opens with focus on the first Set button and `aria-expanded=true`. Esc closes it, and so does a click outside.
  - Set on the 2nd guess → "F major · set": the menu shows 5:major, notes unchanged, one undo step, toast "Key set to F major. New parts follow it."
  - A new melody after that: 19 notes, 0 outside F major.
  - Undo ×2 → back to "D minor · likely · or F major" with the notes the same. Redo → set again.
  - Back to auto → auto, the menu shows "Key: auto". Undo → set again.
  - Key menu G minor on the set F major key: notes move +2, Undo brings them back.
- **New parts follow the key:**
  - F♯m chords (auto): bass 0 and melody 0 of 19 notes outside.
  - Drums → bass, chords, melody: "A minor · Keys picked", 0 / 0 / 0 outside.
  - "Another one": key kept, 0 / 0 / 0 outside.
  - Ben Böhmer vibe: "F minor · from the vibe", bass 0 outside.
  - Hummed D minor: bass and chords 0 / 0 outside.
- **Old songs reopening:** each one with notes unchanged and no extra undo step.
  - A legacy song with a set key and no `from` → "D minor · set".
  - A legacy song with generated parts and no key → "A minor · Keys picked".
  - A legacy song with a hum-locked key (`hum:true`) → "G major · set". This is the known limit.
  - An auto-key song saved and reopened: same reading ("A minor · likely · or C major") and same notes.
- **Regressions near the change:**
  - A sung bass over a set F major key: 13 notes, 0 outside, "in F major" in the reply, key still set.
  - Fake MIDI keyboard played live, Am–Dm–E–Am with bass (32 notes): "A minor · sure".
  - AI context: "A minor (DJ key 8A), worked out from the user's notes: sure, could also be C major; the chords keep coming back to A".
- **Speed:** `keyStatus()` 0.10–0.20 ms on a 16-bar song (about 400 notes), and 9.6 ms on an extreme 47,712-note song. `renderTracks()` 10.8 ms here vs 10.6 ms on main.
- **No page errors.** The only console line is a blocked network fetch (offline sandbox), the same on main.

## Smoke changes (pushed, fbb3697)
- New line: key reasons and the hum reply wording (above).
- The reload check polls the song list up to 5 s before it asserts (it was flaky: 1 run in 4).

## Screenshots
`/home/claude/qa-se7r/`:
- `L-<1400|390|360>-<emerald|velvet|sapphire>-<none|likely|keys|hum|set>.png`: 45 layout shots with the popover open
- `sing-run1.png` … `sing-run3.png`: the sung melody runs
- `b2.png`: F♯m chords
- `b3a.png`: chords, then a sung melody
- `draw.png`: the piano roll after drawing 12 notes (the chip, above it and out of shot, still said "no key yet")

Scripts and logs: `/home/claude/qa-se7r/r1.mjs` … `r10.mjs`, `check2.log`, `check3.log`.
