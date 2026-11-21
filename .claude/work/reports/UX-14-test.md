# UX-14 branch check (includes UX-10) · qa-tester · 22 Nov 2026
Branch `preview-ux-14` at **e92e25f** (no commits from me).

## Verdict: READY
The owner's bug is fixed. Over the beat, the notes he sings are now the notes he gets, in pitch and rhythm.
- With the fake mic (`sing.wav`, sung A C G C E G A C G C), the sung bassline is **10/10 notes exact**. On 21 Nov it was 7/10 on preview-ux-10 (A came back as G#, E as F) and 5 notes on main.
- The sung melody is **10/10 exact** (7/10 on UX-10).
- Sung chords come out as **11 chords, all built on the notes as sung**. On UX-10 the same take became Ab-based chords in F minor.
- My own extra takes (octave-jump bass, a flat legato melody with vibrato) came out exact too.
- A key the user chose stays. Keys counts the notes kept outside it correctly.
- A vibe key gets replaced when only drums exist. Nothing generated replaced a sung take.
- UX-10's items still hold.

check.sh passed on the rerun; run 1 had one timing flake under load, in code this branch doesn't touch.

## Problems
None in UX-14's files. Low notes for later:
1. **A cut-off fragment at the very start of a take can become a 1-beat chord** (low · `src/studio.js` `shapePart` chords / `src/edit.js` `tidySung`).
   - Seen in 1 of 1 chord takes: drums like Ben Böhmer → "let me sing the chords" with the fake mic.
   - The detector heard `G4@0.05` 0.47 semitones off. That's the tail of a looped note, already sounding when the take began. It became a G major chord on beat 0 (1 beat), before the 11 real chords.
   - A real singer starts after the count-in, so this should be rare. Notes that are about half a semitone off and under a beat long at beat 0 could be dropped.
2. **One octave-bass note came out a 16th early** (low). The singer was off the grid by up to 25 ms, but one onset was read 70 ms early: `E3@13.36` → 13.25 (the others landed on .5). So 15/16 notes were on the grid, and all 16 pitches and octaves were right. The lab shows the same kind of rare 1/16 slip: 2 of 18 scenarios have one late note.
3. **Pre-existing on main, not UX-14 (assistant-dev, `src/maker.js`).** Same result on main and this branch:
   - "make the melody simpler" regenerates the **drums** (`groove:drums`, Drums events change). This breaks the 19 Nov rule "a comment about one element changes only that element". Medium, and new to the bug list (the open bugs only cover "drums busier at top energy").
   - "set the key to E major" and "change the key to E major" do nothing offline ("I couldn't turn that into a change"). Only "key E major" works. Low.
   - "record my bassline" and "let me record the bass with my voice" → `add_bass`, and "i'll hum it" → nothing. These were already handed to assistant-dev in the UX-14 report.

## What I checked (numbers)
### check.sh
| Run | Result | Time | Load |
|---|---|---|---|
| 1 | FAIL 1 of 92: "song: a relaxed double-click (0.35 s) on a part opens the editor…" `{"on":false,"st":4}`. The click waits 350 ms, which stretches past the double-click window under load. UX-14 doesn't touch song/daw code | 5:29 | 11-12 |
| 2 | **CHECK OK, SMOKE OK: 92 checks**, including the double-click line | 5:28 | 9-11 |

All UX-14/UX-10 smoke lines passed in both runs:
- the 4 sung takes keep their notes (14/14, 24/24, 4/4, 13/13);
- a sung take stands alone;
- held notes 8/8, dense 32/32;
- 5 sung basslines in a row: 0 holes, 0 doubled notes;
- last beat recorded to the end (0 ms cut);
- Stop right after the last beat cancels the take.

### The lab (`node tests/sung-lab.mjs`, run by me)
- 18 scenarios, 239 sung notes: **238 exact**, 1 missing (re-sung "da da da" repeat, a known limit), 0 extra.
- One note a 16th late in 2 scenarios: the 35 c flat melody with wide vibrato, and the noisy laptop bass.
- The octave-jump bass is 24/24, and all chord-root scenarios are 4/4 on the sung roots. No page errors.

### Fake-mic takes, typed requests, AI off
Times below are from "let me sing…" to the track (count-in plus 4 bars).

| Setup | Take | Key before → after | Result | Keys said |
|---|---|---|---|---|
| drums like Ben Böhmer (no key) | sing.wav bass | none → C major | A2 C3 G2 C2 E2 G2 A2 C3 G2 C2, **10/10**, bass register, 1-beat notes on the sung 16ths | "Got it: 10 notes in C major…" |
| same | sing.wav chords | C major (kept) | 11 chords on G A C G C E G A C G C (rough edge 1: the first G) | "11 chords built on the notes you sang…" |
| same | sing.wav melody | C major | A4 C5 G4 C4 E4 G4 A4 C5 G4 C4, **10/10** | "10 notes in C major" |
| key chosen with the **key menu**: E major, then drums like Böhmer | sing.wav bass, then melody | E major (by you) stays, the vibe didn't change it | 10/10 each | "10 notes in E major **(7 outside the key, kept as you sang them)**", which is right: 4 C + 3 G |
| "key E major" typed, then drums | same | E major stays | 10/10 each | same, 7 outside |
| track like Stephan Bodzin (vibe key A minor), drums only | my legato melody D E F# G A G F# E, 2 beats each, 30 c flat, vibrato | **A minor → E minor** (vibe key replaced) | 8 notes per 16 beats, all pitches exact, each 2 beats long, no stubs, ×2 takes | "9 notes in E minor" |
| Bodzin + generated bass + chords (A minor) | same melody | A minor stays | all pitches exact, F# kept | "(3 outside the key…)" / "(2 outside…)", which matches the F# count |
| Bodzin, drums only | my octave-jump bass E2/E3 A2/A3 G2/G3 D2/D3 | A minor | **16/16 pitches and octaves exact** (E2 stays E2), 15/16 on the grid (rough edge 2) | "16 notes in A minor" |

### A generated part never replaces a sung take
With sung bass, chords and melody in the song, these left all three takes note-for-note the same: "another one" ×2, "give me another bassline", "add a bassline", "change the chords", "make the melody simpler", "make it a full track".
- "give me another bassline" → "Sung bassline is your own part, so I left it as it is."
- "add a bassline" and "change the chords" add new tracks next to the takes.
- "make it a full track" isn't understood offline on this branch, because AI-1 isn't merged here.

### UX-10 items
- **Stop during the tail** (tail 0.14 s), with Stop clicked inside the page at +0.054 s, +0.132 s and +0.156 s after the last beat, and at -0.24 s: every time the state was stopped, the mic was off, no track was added and there were no errors.
- **No stutter:** smoke "5 in a row" passed with 0 holes and 0 doubled notes, and none of my takes had doubled notes.
- **Legato melody notes are found:** 8/8 per take on held 2-beat notes. On main this gave 0.

Page errors were 0 in every run.

## Files
- Screenshots: /home/claude/reports/qa-t1/shots/ux14-*.png. I looked at them: the reply "Got it: 10 notes in E major (7 outside the key, kept as you sang them)" reads clearly, and the key menu shows "E major".
- Logs: /home/claude/reports/qa-t1/check-ux14-run1.txt, check-ux14-run2.txt, lab.out, sing-*.out, session.log
- Scripts and fixtures: /home/claude/reports/qa-t1/js/sing.mjs, stop.mjs, parse.mjs, mkwav.py. The extra takes are in /tmp/qa/t1/wav/octbass124.wav and legmel124.wav; mkwav.py remakes them.
