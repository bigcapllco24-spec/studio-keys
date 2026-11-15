# SE-7b+7c re-check after fix 1 (qa-tester, 15 Nov 2026)

Branch `preview-se-7bc`, head a789219, plus my test commits on top. Tested in headless Chrome against the built `index.html`. Songs went in through the real file input: my 4 renders, plus 6 new drum loops made with different grooves from last time. The machine was quiet (load 0.2-1.9).

## Verdict: READY

All 5 bugs and the "Chords 2" rough edge are fixed. I checked each one with my original steps.
- Drum loops in all 6 styles, plus my techno loop, read "No key in this clip". None of them shows a Put or Set-key button.
- Night-drive reads Em · C · G · D, and its drum intro reads no chord.
- Put leaves parts I played or sang alone.
- `check.sh` passed twice in a row. The full key harness gives KEYS OK.

The two problems left are small and don't block:
- a hip-hop tempo misread that was already there before this fix;
- some card and toast wording.

## Bugs (not blocking)

**1. Some 90 BPM hip-hop drum loops read about 122 BPM (low-medium, sound-engine-dev, `src/analyse.js` tempo; already there before fix 1, since the tempo code didn't change)**
Steps:
1. Start a new song in D minor.
2. Import `/tmp/qa/se7bc-re/songs/drums-hiphop.wav`. It is a 90 BPM kitKit8 groove, 43 s.

- Expected: "No key in this clip · 90 BPM (or 180)".
- Actual: "No key in this clip · 121.5 BPM · tempo unsure", and the card offers a "Use 121.5 BPM" button. The key part is right. The tempo is wrong, but the card does say it's unsure.
- How often: 2 of 8 hip-hop drum grooves (seeds 4276 and 4) read 121.5 and 123.8, with tempo confidence 0.09-0.13 and no second guess. The other 6 read 90 (or 180).
- The same 8 grooves with bass and chords added read 90 every time. All other styles read the right tempo.
- Suggestion: when the tempo is this unsure, hide "Use … BPM" or offer the half/double choice. Probe: `.claude/work/se7bc-qa/tempo-probe.mjs`.

**2. The no-key card and toast still talk about chords (low, studio-ux-dev, wording)**
Steps: import any drum loop.
- The toast reads "techno-drums: no key in this clip · 130 BPM. **Its key and chords are on the track.**" (`src/edit.js:153`).
- The card says "A drum loop or a short clip: no key or chords to use", then "Keys plays the chords with its own sound, never the song's audio" (`src/daw.js:185`).
- Expected: neither line on a no-key card. For example, the toast could read "techno-drums: no key in this clip · 130 BPM."
- Same area: the Put button's tooltip still says "A new Chords track …" (`src/daw.js:184`). It now re-uses Keys' Chords part, as the engine dev's report says.

## Rough edges
- **Put gives no "done" sign on the card.** After Put, the card still shows "Put these chords on my song" as the main button. "Use 124 BPM" turns into "124 BPM ✓", so a "✓ On your song" state would match it. This was already the case before fix 1.
- **"Set my key to E minor" also moves parts I played or sang.** Its tooltip says so ("parts Keys and you made move to fit"), and it is one undo step, so this is by design. I'm noting it because the "never touched" rule applies only to Put, and Put does keep to it.
- The UX dev's note on the playhead's soft glow (`box-shadow`) against the "no glows" rule is still open. That is the lead's call.

## Re-test of my earlier bugs (original steps)
| # | Was | Now |
|---|---|---|
| 1 | Drum loops got a key, often "sure", plus chords and a Put button | Fixed. 7/7 drum loops through the file input read "No key in this clip": techno-drums, plus house, techno, hip-hop, trap, afro and dnb with new grooves. No chords, no Put or Set-key buttons, and my D minor key unchanged. Typing "put those chords on my song" gets: "I couldn't hear clear chords in “drums-house”: it sounds like drums only…". `tests/keys.mjs --quick`: 6/6. |
| 1b | Night-drive's drum intro was read as A♭5 | Fixed. The intro reads N.C. for all 32 beats, and the loop is Em · C · G · D. |
| 2 | The card read Em · C · G · Em · D | Fixed. The card reads "4-BAR LOOP Em · C · G · D". In D minor it is Dm · B♭ · F · C, with no stray half bar. |
| 3 | "night drive" turned into the Drive effect | Fixed. "put the chords from night drive on my song" gives `chords_from_audio night-drive` plus play. "turn night-drive into a melody" gives `transcribe`. "Night_Drive" also matches. "add reverb to night drive", "mute night drive" and "make the night drive song quieter" all act on that track. "add drive to the chords" and "more drive on the bass" still add Drive. |
| 3b | "what key is night drive in" answered about my own song | Fixed. It answers about night-drive: "E minor at 124, I'm sure. … Move your song to E minor at 124 BPM?" |
| 4 | "copy the melody of this song" quietly added a melody | Fixed. Nothing is added, and the reply reads: "I write my own melodies rather than copy a song's tune … say “turn night-drive into a melody”, or use Turn into notes on its track." The same happens for "give me the melody of night drive" and "iski dhun chahiye is gaane ki". "add a melody" still adds one. |
| 5 | A typed put sometimes took 2 undo steps | Fixed. 1 step in 3 of 3 typed runs. Typing a put while the song is still being heard adds 1 step on top of the import's own step, with the chords landing once the listen ends. |
| RE | Put added a doubled "Chords 2" | Fixed. Put re-uses Keys' Chords: the track count is the same, the toast says "on your Chords track", and putting a second time still leaves one Chords part. Undo brings back Keys' own chords with no song link. With no Keys chords (an empty song), it makes one new "Chords" track and says "on a new Chords track". |
| UX | The playhead was drawn over the song card | Fixed. The card is z-index 3 and the playhead 2. In screenshots at 1400 px in all 3 themes, the line stops at the card's top edge and starts again below it. |
| UX | The toast covered the phone fixer | Fixed. At 390 and 360 px in all 3 themes, the toast sits at y 12-57 and the sheet at y 444-828, so they don't overlap. `cp-open` is on while the sheet is open and off after Esc. |

## Regression pass (producer use)
- **A D minor song (Drums, Bassline, Chords, Melody) plus "My chords", which I played, and "sing → bassline", from my voice. Then I dropped in night-drive.**
  - The card: E minor · sure · or G major · DJ key 9A · 124 BPM. It was heard in 1.4 s. Listening adds no undo step.
  - Put gives Dm · B♭ · F · C on Keys' Chords in 1 step. Bassline and Melody follow. **My two parts are unchanged, note for note.**
  - The strip shows "Dm B♭ F C, from “night-drive”".
  - Keys' melody is not the song's: the longest run of matching intervals is 2 of 18.
- **Play:** the lit chord followed the playhead in 6 of 6 samples.
- **Fixer:** bar 2 to Bm in 1 step, with my parts unchanged.
- **Set my key to E minor:** "E minor · from the song", Em · C · G · D, 1 step.
- **Save, new song, reopen:** 7 tracks, the same chords, the card, the strip and the audio all come back. My parts are still unchanged.
- **Into a song with no key (sunday-pop):** "F major · from the song", F · C · Dm · B♭maj7, 1 step, with one Chords track.
- **Into another key:**
  - trap in C♯ minor into an F major song gives Dm · C · B♭maj7 · C. Out-of-key notes: Bassline 0/32, Chords 0/96. The key stays "F major · set" and there is no Chords 2.
  - sunday-pop into a C major song gives C · G · Am · Fmaj7.
- **Nothing copies a song's melody:** Put only adds or re-uses chord parts, and "copy the melody" does nothing.
- **Key accuracy:** `node tests/keys.mjs`, the full run, gives **KEYS OK**.
  - Key exact 12/12.
  - Chords right on 99% of bars (min 94%).
  - BPM error 0.
  - Downbeat 12/12.
  - Intro bars read "no chord": 95/96.
  - Time per 3-minute song: avg 1509 ms, max 1971 ms.
  - Drums only: 6/6 read no key.
  - My 3 songs with music: exact key 3/3 (E minor, F major, C♯ minor).
- **Phones:** 390 and 360 px in Emerald, Velvet and Sapphire. No sideways scroll and no page errors in any run.

## Build and check
- `python3 tools/build.py`: `index.html` unchanged.
- First `check.sh` before my changes: 63/64. The import check saw "undo +0" on a quiet box (load 0.2). This is a test timing problem, not a product bug: the import's save landed within 120 ms of the test's own setup save, so the two merged into one step. The engine dev's suggestion is right. The check now calls `undoBoundary()` before `uploadFile`.
- After my changes: **CHECK OK, SMOKE OK: 67 checks**, twice in a row (2 m 06 s and 2 m 07 s for the whole check). That is under the 3-minute goal.

## Smoke lines added (`tests/smoke.mjs`, commit 5e9bbc3)
- **Import check:** `undoBoundary()` before the import. The card must also read exactly "LOOP Em · C · G · D" (the chord vote, bug 2).
- **Put:**
  - it uses Keys' Chords track, so there is only one Keys chords track and no "Chords 2";
  - a part I played ("My chords", `gen:false`) stays exactly the same.
- **Fixer:** `body.cp-open` is on while it is open and off after "Use".
- **New:** a track named night-drive is read as a name, not the Drive effect. Put its chords, turn it into a melody, and what key is it in all act on that track, and "add drive to the chords" still adds Drive.
- **New:** typing "put the chords from night drive on my song" is 1 undo step and says "on your Chords track". "copy the melody of this song" adds nothing and points to Turn into notes.
- **New:** a techno drum loop rendered in the page goes through `#importFile` (22 kHz, 22 s, no fixture file). The checks:
  - `ana.key` null and 0 chords;
  - the card reads "No key in this clip" with 130 BPM;
  - no Put or Set-key button;
  - my key stays the same.
- **Retest scripts** are in `.claude/work/se7bc-qa/`: `retest.mjs` (39 checks; 38 pass, the one failure is bug 1 here), `render-drums.mjs` and `tempo-probe.mjs`.

## Try steps for the owner (desktop)
1. Make a beat with Keys (drums, bass and chords) and set the key to D minor. Play a few chords of your own on a new track too.
2. Drop one of your songs (MP3 or WAV) onto the tracks. After a "Listening to …" toast, a card appears under it with the song's key, how sure Keys is, the DJ key, the BPM, and its 4-bar loop of chords (for example "Em · C · G · D").
3. Tap **Put these chords on my song**. Your Chords track now plays the song's chords moved into D minor (no second Chords track). Your bass and melody follow, and the chords you played stay exactly as they were. Press Play: the chord strip lights up in time. Ctrl+Z puts Keys' own chords back.
4. Click a chord in the strip, pick B and Minor, press **Hear it**, then **Use Bm**. On a phone the sheet opens from the bottom, and messages show at the top so they don't cover it.
5. Type to Keys "what key is night drive in" (use your song's name), then "put the chords from night drive on my song". Keys answers about that song and puts its chords on. It doesn't add a Drive effect.
6. Drop a plain drum loop. The card says "No key in this clip" with its BPM, and offers no chords and no key button.

## Screenshots (`/tmp/qa/se7bc-re/shots/`)
- `a1-card-1400.png`
- `a2-put-1400.png`
- `a3-playing-1400.png` and `a3-playing-card.png`
- `a4-reopened-1400.png`
- `b1-put-nokey-1400.png`
- `c1-drums-1400.png`
- `e1-talk-1400.png`
- `f-playing-<emerald|velvet|sapphire>-1400.png`
- `f-fixer-<theme>-<390|360>.png`

Logs are in `/tmp/qa/se7bc-re/`: `check1.log`, `check2.log`, `check3.log`, `retest.log`, `retest.json`, `talk.json` and `keys-full.log`. The new drum loops are in `/tmp/qa/se7bc-re/songs/`.
