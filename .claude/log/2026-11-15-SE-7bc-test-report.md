# SE-7b+7c branch check (qa-tester, 15 Nov 2026)

Branch `preview-se-7bc`, head 5141a21 (tests added on top). Desktop flows tested in headless Chrome against the built `index.html`, importing real WAVs through `#importFile`. Phone widths were checked for the plain fallback only.

## Verdict: NOT READY

Most of it works well. The card, Put chords, the strip, the fixer, setKey, save/reopen and the typed phrases all behave as designed. One rule from the design fails, though: a drum loop must say "no key in this clip". Every drum-only clip I tried got a key, often marked "sure", along with chords you can put on your song. The owner's rule is that the key is shown honestly, so this breaks it. The fix is in `src/analyse.js` (sound-engine-dev). Bugs 2 and 3 are smaller and can go in the same round.

## Bugs

**1. A drum loop gets a key, often "sure", plus chords (high, sound-engine-dev, `src/analyse.js`)**
Steps:
1. New song.
2. Import a 60 s drum loop: our techno drums at 130 (`/tmp/qa/se7bc/songs/techno-drums.wav`).

- Expected: "No key in this clip", the BPM, and no Put or Set-key buttons. This is design step 4 and the 7b report's drum-only gate.
- Actual:
  - The card reads "F♯ major · maybe · or C♯ major · DJ key 2B · 130 BPM".
  - Chords: "8-bar loop B♭m · C♯ · A♭m · B♭m".
  - The buttons offered are "Put these chords on my song" and "Set my key to F♯ major".
  - The toast says "techno-drums: F♯ major · 130 BPM".
- It happens for drum loops in all 6 styles I tried (60 s each, `tests/keys.mjs --quick`):

  | Style | Kit | Key read | Level |
  |---|---|---|---|
  | house | kit909 | F minor | 2 |
  | techno | kitDeepTechno | C♯ major | 1-2 |
  | hip-hop | kitKit8 | A♭ major | 3 |
  | trap | kitTrap | C♯ minor | 4 ("sure") |
  | afro | kit909 | C♯ minor | 4 |
  | dnb | kitStark | A minor | 4 |

  The tempo was right in all 6; dnb read 87 with "or 174".
- The same thing shows inside full songs. In night-drive, the 8-bar drum intro is read as one A♭5 chord (conf 0.92), and the waveform label over the intro says "A♭5" (screenshot `a2-put-chords-1400.png`).
- The harness's own intros mostly pass (31/32 bars read as no chord), so the gate seems to fail on whole drum clips and longer runs of drums.

**2. The card's chords come from the first pass of the loop, which can hold a misread (medium, sound-engine-dev, `chordsFromAna` at `'loop'`)**
Steps:
1. Render our E minor house song at 124: Em C G D, with a melody, and 2 loops of drums first (`songs/night-drive.wav`).
2. Import it.

- Expected: "Em · C · G · D". The analysis' own `loop.chords` says exactly this, and 7 of the 8 passes read it.
- Actual:
  - The card shows "Em · C · G · Em · D".
  - Bar 3 of the first pass was read as G for two beats, then Em for two beats, and `chordsFromAna` copies that pass's raw chords.
  - Put then writes "Dm · B♭ · F · Dm · C" into a D minor song, with a stray half-bar chord in bar 3.
- Suggestion: take each bar's most common chord across the loop's repeats, or start at the pass that agrees most with `loop.chords`.

**3. Song names with "drive" turn into a Drive effect (medium, assistant-dev, `src/maker.js`; the bug is also on `main`)**
Typed with the offline parser, which the live site uses while the Workers AI quota is used up:
- "put the chords from night drive on my song" gives `track_fx chords drive`. Keys adds distortion to the chords and doesn't put any chords on.
- "turn night-drive into a melody" gives "Done: Drive on Melody: 30%".

"Night Drive" is the design's own example song, so this will come up. The effect word should only count when no audio track's name contains it.
- Same area, low: "what key is night drive in" gives `analyse_song track:"mine"`, so Keys answers about your own song instead of the dropped-in one.

**4. "Copy the melody of this song" quietly adds a new Keys melody (low, assistant-dev)**
- Offline it adds a new Melody track, and the reply reads "Done: Melody (new track) on Analog Lead".
- That is not a copy, so the copyright rule holds. But the user asked for the song's tune and the reply doesn't say they got a new one.
- Expected (SE-7c-ai.md): an honest line, plus the free pass. For example: "That's a new melody of mine. Want the song's own tune? Say 'turn night-drive into a melody'."

**5. One typed "put those chords on my song" took 2 undo steps (low, seen once, not reproduced)**
- It happened during my first run, while the machine was very busy (load about 9, other testers running).
- In 4 later runs, from the same sequence (what key, yes, no, put), it was 1 undo step every time, by voice and by card.
- It probably comes from the 120 ms undo merge window when the play that follows lands late.

## Rough edges (not blocking)
- **Two identical chord parts.** "Put these chords" on a song that already has Keys' Chords adds a second track, "Chords 2". Both are on Grand Piano and both follow the same chords, so the chords double up and get louder. A producer would expect one chords part, or to be asked "replace your Chords?" (`a2-put-chords-1400.png`).
- **Playhead over the card.** While playing, the playhead line is drawn over the song card's text at 1400 px (`a3-playing-1400.png`).
- **Toast over the fixer on phones.** At 390 px, the toast from the last action covers the bottom sheet's "Use B♭" and "Or type one" for about 3 s (`f-fixer-390.png`).
- **Smoke run time.** The smoke test is now 64 checks and takes 3 m 10 s to 4 m alone, over the 3-minute goal. The machine was shared with other testers (load 4-10). The new SE-7 block adds about 10 s.

## What I checked (numbers)
**Build and check**
- `python3 tools/build.py`: `index.html` unchanged.
- `bash .claude/tools/check.sh` before my tests: CHECK OK, 56 checks, 4 m 05 s.
- After adding the SE-7 lines: CHECK OK, 64 checks. Two runs before that failed only on the known load-sensitive velocity-lane drag, which runs before the new lines. The third run passed.

**Our 4 songs** (rendered by us, 44.1 kHz stereo WAV, through the real file input)

| Song | Truth | Card | Clip on track | Card shown |
|---|---|---|---|---|
| night-drive | house, E minor 124, Em C G D, with melody | E minor · sure · or G major · DJ key 9A · 124 BPM | 1.2 s | 5.4 s after drop (10 progress toasts) |
| sunday-pop | pop, F major 110, F C Dm B♭, with melody | F major · sure · or D minor · DJ 7B · 110 BPM; chords F · C · Dm · B♭maj7 | | 3.2 s |
| trap-csharp | trap, C♯ minor 140 | C♯ minor · sure · or E major · DJ 12A · 140 BPM (or 70); C♯m · B · Amaj7 · B | | 4.0 s |
| techno-drums | drums only, 130 | F♯ major ... (bug 1) | | 3.5 s |

**Card, strip and fixer (D minor Keys song, then night-drive)**
- **Listening:** not an undo step (the import is 1).
- **Use 124 BPM:** tempo 124, 1 undo step.
- **Put these chords:**
  - adds a Chords track (notes, our voicing, `fromSong`), never the song's audio;
  - moves the chords down a tone into D minor, and the toast says so;
  - Bassline, Chords and Melody follow;
  - 1 undo step;
  - the strip equals `chordBlocks()` and says from "night-drive".
- **Play:** the lit chord matched the playhead in 8 of 8 samples over 6 s.
- **Fixer, mouse:**
  - bar 2: B to Minor, then Hear it, then "Use Bm" gives Bm;
  - 1 undo step;
  - the popover closes and focus goes back to the block.
- **Fixer, keyboard:** → and Enter open bar 3, typing "F#7" then Enter gives F♯7 in 1 step, and Esc closes with focus back on the block.
- **Second guess:** "or D" applies in 1 step.
- **Undo:** two undos bring back the song's chords exactly.
- **Key menu:** D minor → E minor moves `PROJ.chords` too, in 1 step. A `setChord` after that keeps bars 1-3 of every generated part at 0 notes outside E minor.
- **Set my key to E minor:** "E minor · from the song", the chords move up a tone, the button shows "Your key is E minor ✓", 1 step.
- **Bass movement too:** gives slash chords (Dm/F), the existing Keys bassline follows the song's bass, 1 step.
- **Save, new song, reopen:** 6 tracks come back with `t.ana`, the audio, the card, the strip and the same chords.

**Song with no key yet**
- The card says "Your song has no key yet, so it takes the song's key".
- Put gives "F major · from the song" and F · C · Dm · B♭maj7, with no melody track.
- The loop length was set from the clip (16 bars).

**Into a song in another key (F major song, trap song)**
- The chords move into F major via its relative, D minor: Dm · C · B♭maj7 · C.
- 0 of 96 notes outside F major. The key stays "F major · set".

**No melody copying**
- Keys' melody after Put keeps its own rhythm (20/20 notes on the same beats). Its longest run of matching intervals with the song's melody is 2 of 18.
- "add a melody" over the pop song's chords: 79 notes, longest matching run 2 of 16.
- Put only ever adds chord parts (and a bass with Bass movement too).

**Typed to Keys (offline)**
- "Keys, what key is this?" gives "E minor at 124, I'm sure. The loop starts on E minor. The main loop goes Em · C · G · Em · D. Move your song to E minor at 124 BPM?" The key stays D minor · set.
- "yes", "haan", "theek hai" and "ok" each give "E minor · from the song" at 124, then offer the chords. "nahi" gives "OK, I left it as it is."
- "put those chords on my song" works. "make bar 4 B minor" gives "Bar 4 is now Bm; … follow".
- "make bar 9 E" gives "Your loop has 4 bars, so there's no bar 9."
- "bar 2 ko F sharp 7 kar do" works.
- "is gaane ki key kya hai" gives `analyse_song`.
- "match this loop to my key" on audio gives an honest reply.
- "key back to auto" unlocks.
- "ye chords mere gaane mein daal do" gives `chords_from_audio` plus play.
- "make the fourth bar a minor" gives Am in bar 4.
- "add chords" still gives `add_chords`.

**Phones:** at 390 and 360 px, in Emerald, Velvet and Sapphire, the page never scrolls sideways (scrollWidth equals the width). The card buttons wrap, the strip shows, and the fixer is a bottom sheet. No page errors in any run.

**Accuracy (`tools/ana-harness.mjs --check`, set 1)**
- I stopped it after 4 of 12 songs: the offline render took about 8 minutes a song on the shared box.
- Key exact 4/4 (C m, F♯ m, D m, E♭), chords 100% of bars on all 4, BPM exact 4/4, downbeat 4/4, drum intro read as no chord 31/32 bars.
- Time per 3-minute song: 4.6-5.9 s. That is over the 3 s goal, but it was measured under load 9 on 2 cores; the developer measured 1.2 s on a quiet box.
- With my 3 songs that have music: **exact key 7/7**. Chords match the bars apart from bug 2's half bar; the Amaj7 and B♭maj7 readings have the right roots.
- **Drum-only clips: 0/6 read "no key"** (bug 1).

## Tests added (pushed to `preview-se-7bc`)
- **`tests/smoke.mjs`:** 8 new checks (the SE-7b/7c block). They take about 10 s.
  1. A real WAV import is heard: progress toast, card shows key, DJ key and BPM, listening adds no undo step.
  2. Put gives a Chords track with Dm · B♭ · F · C, the strip, and 1 step.
  3. The fixer gives Bm in 1 step, and Undo restores the chord.
  4. setKey moves the song's chords, and Undo moves them back.
  5. "what key is this?" plus "haan".
  6. "make bar 4 B minor" works, and "bar 9 ko E kar do" changes nothing.
  7. The offline phrases, Hinglish included.
  8. `parseChord`.
- **`tests/fixtures/song-em124.wav`:** 15.5 s, mono, 11 kHz, 341 KB. It is 8 bars of our own E minor house render.
- **`tests/keys.mjs`:** run on demand, not in check.sh.
  - It runs the harness with `--check`, then a drums-only check in 6 styles: a drum loop must read no key.
  - `--quick` runs only the drums part (about 2 minutes). It fails now because of bug 1.
- **My QA scripts** are in `.claude/work/se7bc-qa/` (`render.mjs`, `prod.mjs`, `probe.mjs`) for the retest.

## Try steps for the owner (desktop, once bugs 1-2 are fixed)
1. Make a beat with Keys (drums, bass and chords), then set the key to D minor with the key menu.
2. Drop one of your own songs (MP3 or WAV) onto the tracks. You get a "Listening to …" toast, then a card under the song with its key, how sure Keys is, a second guess, the DJ key, the BPM and its chords.
3. Tap **Use … BPM**, then **Put these chords on my song**. A Chords track appears, moved into D minor, and the Chords strip above the tracks shows them. Press Play: the current chord lights up as it plays.
4. Click a chord in the strip, pick B and Minor, press **▶ Hear it**, then **Use Bm**. Your bass, chords and melody follow. Ctrl+Z puts it back.
5. Type to Keys: "what key is this?", then "yes". Your song moves to the song's key. Then "make bar 4 B minor".
6. Drop a drum loop. The card should say "No key in this clip" and offer no chords.

## Screenshots (`/tmp/qa/se7bc/shots/`)
- **1400 px:**
  - `a1-card-dminor-1400.png`
  - `a2-put-chords-1400.png`
  - `a3-playing-1400.png`
  - `a4-fixer-1400.png` and `a4-fixer-pop.png`
  - `a5-setkey-1400.png`
  - `a6-reopened-1400.png`
  - `b1-card-nokey-1400.png`
  - `b2-put-nokey-1400.png`
  - `c1-drums-1400.png` (bug 1)
  - `d1-trap-into-fmajor-1400.png`
  - `e1-talk-1400.png`
- **Each theme at each width:** `f-<emerald|velvet|sapphire>-<1400|390|360>.png`
- **Phone fixer:** `f-fixer-390.png`

Logs are in `/tmp/qa/se7bc/`: `prod.log`, `probe.log`, `talk.json` and `harness1.log`. The rendered songs are in `/tmp/qa/se7bc/songs/`.
