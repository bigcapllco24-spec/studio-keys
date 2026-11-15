# UX-4 build report (studio-ux-dev), 13 Nov 2026

Branch `preview-ux-4`, head **606049e** (pushed; WIP commit 8438f9b before it). Built on main + UX-2 + UX-5 as briefed.

## What I built (vs the approved design)
On phones (`(max-width:600px), (max-height:500px) and (pointer:coarse)`), `html[data-phone]` + `html[data-ptab]` switch the page with CSS. Each tab shows an existing section. While the phone layout is on, a few existing controls are moved into the sheets, and they go back when it's off (checked: resizing to 1400 px restores everything).
- **Frame:** a 52 px top bar (logo, song name ▾ opening the Song sheet, Keys-settings gear on the Keys tab, Undo), a 60 px mini transport that is always visible (Rec, a 46 px Play/Stop, bar.beat, Loop|Song, BPM sheet) and a 58 px tab bar (Keys · Song · Mix · Play · More). The app always opens on Keys. Uses `viewport-fit=cover`, safe-area insets and `100dvh`, plus a `theme-color` that follows the theme. Toasts sit above the transport at full width.
- **Keys tab:** status line, a "Your sound" pill, the chat filling the screen, one row of chips that scrolls sideways (the next-step chip goes first), and the talk dock (Type · a 92 px Keys button · Sing). A new empty song shows the welcome bubble with 3 chips. Sing opens a sheet: Bassline / Chords / Melody / Voice note. The **singing card** shows during a take: title, bar boxes (done / now / to come), the big sung note, an in-tune bar, the last notes, and Cancel · Start again · Done (Done ends early and keeps what was sung).
- **Song tab:** "Loop · 4 bars" or "Song · 16 bars · 0:31", + Section (Song mode), Make it a song ▾, + Add a part (a sheet: Ask Keys, Empty instrument, Empty beat, Sing a melody, Voice note, Import). Parts are compact cards about 96 px tall: name, ▶, FX, M, S, the role line and a note preview. **Tap** opens the part's sheet; **FX** opens it at the effects; **hold** selects, and the selection bar appears from 1 part on a phone. UX-1's song map works as before, and **holding a section** opens its menu.
- **Part sheet:** name, Play alone / Mute / Solo, sound, volume, the full FX panel (EQ dials plus effects), Edit notes / Copy / Delete (asks once, Undo brings it back). It reuses the track-row handlers, so everything is undoable as before.
- **Note editor:** full screen, sized to the room left, with the velocity lane always on screen. 22 px rows and a narrower piano column on phones. Touch words in the hint, plus "turn your phone sideways" when upright. Touch: tap adds a note, drag moves, the right end resizes, **hold adds a note to the selection**, **pinch zooms (1–4×)**, **two fingers scroll**. New toolbar buttons Copy / Paste / Delete (shown when there's a selection or a clipboard, on desktop too), plus Undo and Play on phones.
- **Mix tab:** the mixer as a list (master first, the live Keys/Pads last), full-width volume, 44 px M/S, and "Effects ▾" per part, which opens the part sheet. The second "Live mixer" block is hidden on phones.
- **Play tab:** Keys-sound and Pads-sound pickers, "All sounds…", octave −/+, 74 px pads, and a C4–E5 keyboard (two octaves sideways, about 36 px keys, 220 px tall). The controller picture, wheels, LCD, knobs and computer-key hints are hidden on phones.
- **More tab:** Your songs, Your sound, Sounds, Effects, Sing to play, Sound Lab, MIDI controller (only where Web MIDI exists), Colour theme, Add to Home Screen (text tips only), Sound credits. Each opens full screen with a back bar.
- **Back button:** Android back (and iPhone swipe-back) closes a sheet, the editor or a More page (history state).
- **Screen wake lock** while playing, recording or singing (where supported).
- **Tablets (pointer:coarse):** 44 px targets and 16 px text boxes. In portrait under 1100 px, the Studio (with Keys) sits above the controller: on iPad 820x1180 the orb is now at **313 px** (it was 1,321).
- `midi.js`: browsers with no Web MIDI (every iPhone) no longer show a red pill. The pill is hidden.

**Changed or left out (and why):**
- iPhone silent switch: I show the tip "No sound? Flip the silent switch…" once on the first Play. I did **not** set `navigator.audioSession.type='playback'`, because a playback session can block the mic and speech recognition, which is the very thing we're fixing.
- The full sound list on the Play tab opens the More → Sounds page, not a separate sheet.
- Sheets move focus to their close button and close on Escape, outside tap, drag down or back. There is no strict focus trap.
- No manifest, service worker or install prompt: that is UX-6, as the owner decided.
- Two-finger cancel: if the first finger had painted a drum step, that step stays. A newly drawn note or a moved note is undone.

## iPhone talking: what I found and what I changed
The orb tap code hasn't changed since d49f280, so the regression isn't one bad line. The likely culprits on our side:
1. **An open mic blocks recognition on iPhone.** With "Always listening" on, `startListening()` opened the hum mic (`getUserMedia`) together with recognition (hum is on by default). After a take, `releaseMic()` kept the mic on while listening with hum. "Sing to play" can also leave the mic open. iOS gives recognition nothing while another capture is open.
2. **Spoken replies.** Since b9f39ee replies are longer (they add the next step). Tapping Keys while it was still speaking started recognition during TTS, and iOS hears nothing then.
3. **Audio playing.** WebKit bug 321436 (iOS 27) stops results after the page plays audio. Our AudioContext runs all the time once sound is on.
4. **No "final" result.** iOS often never marks a result final, and our code only sent on `isFinal`. You'd see "Hearing: drums like Ben Böhmer" and then nothing.
5. The singing ScriptProcessor stayed connected forever after the first take.

Fixes (assistant.js, studio.js):
- A tap stops any speech first, then lets go of an open mic (iPhone), then starts recognition first thing in the tap. After that it unlocks the sound in the same tap and, on iPhone, pauses the sound engine while listening if no song plays. Both come back right after. If the sound can't resume, a toast says "Tap anywhere to turn the sound back on".
- The words heard so far are sent after a 1.5 s pause, or when recognition ends without a final result. A second tap sends or stops.
- **Watchdog:** no words in 6 s → one fresh try. Still nothing → typing opens with "Type below, or tap the 🎤 on your keyboard to talk". After 2 silent tries in a row, the Keys button goes straight to typing and shows a "Try talking again" link. Errors are covered too: blocked (iPhone wording: aA › Website Settings), network, audio-capture.
- On iPhone, "Always listening" no longer opens the hum mic.
- `TAKE.releaseMic()` always lets go of the mic on iPhone and disconnects the ScriptProcessor after every take.
- I can't run iOS here. A fake recognizer with an iPhone user agent checked every path (numbers below). Why I think it fixes it: causes 1, 2 and 4 are definitely handled now. Cause 3 is Apple's bug; pausing our audio while listening is the reported workaround, and the watchdog plus typing covers whatever is left.

## Every change outside my usual files
- **`src/assistant.js`:** tap-to-talk rewritten as `TALK` / `talkStart` / `talkSend` / `talkFallback` / `talkFreeMic` / `talkPause` / `talkResume`, all with the same behaviour on desktop Chrome. `startListening` and the Hum toggle skip the hum mic on iOS. `idleText` has a phone wording ("Tap Keys and talk, or type. Sing a part with Sing."). No new actions, no prompt change, no network calls.
- **`tools/build.py`:** `'phone.js'` added to `PARTS` after `studio.js`.
- Mine: `src/phone.js` (new, ~240 lines), `head.html` (meta tags, tablet block, one phone block at the end), `body.html` (phone chrome, sheets, More pages, editor buttons), `daw.js`, `edit.js`, `studio.js`, `play.js`, `midi.js`, `boot.js` (calls `phoneInit()`). I did not touch `song.js`.

## How I tested (numbers)
- `bash .claude/tools/check.sh`: build PASS, bundle syntax PASS, worker syntax PASS. Smoke: **37 of 38**. The one FAIL ("sing the chords in Song mode … toast") **already failed on the branch before my changes** (twice). It's a test-order clash from the merge: UX-2's check 6b leaves a `take==='chords'` track, so the UX-5 check's `waitForFunction` returns before the new take even starts. With one line added at the start of that check (`PROJ.tracks.filter(t => t.take === 'chords').forEach(t => removeTrack(t.id));`), a copy of the smoke test against my build gives **SMOKE OK: 38 checks**. Tester: please add that line. `tests/**` isn't mine.
- Playwright (Chrome) results:
  - **390x844:** page 390 wide = viewport (audit: 401). Page height on the Keys tab **844 px** = one screen (audit: 15,182). Keys button at **609–701 px** (audit: 1,718). Play at 733. Text boxes at least **16 px**. On the Keys, Play and More tabs, the only element under 40 px is gone (Your-sound pill now 44). Leftovers are 32 px range sliders and 36 px EQ dials. Song 844 tall, Mix 1,092, Play 844.
  - **360x780:** 360 wide, no sideways scroll on any tab. Keys button at 545–637. Play at 669.
  - **844x390 (sideways):** Keys tab 390 tall, Keys button 201–265, editor full screen with the velocity lane visible.
  - **820x1180 (iPad, not phone mode):** orb at 313.
  - **1440 / 1100 / 700 desktop:** page heights identical to before (5,759 / 6,979 / 8,773), and a pixel diff against the pre-change build differs only in the randomly generated Sound Lab demo waveform.
- Interaction run at 390, touch, fake mic `sing.wav`:
  - mini transport: Play → playing at 1.3, Stop → stopped. In Song mode it shows "1 . 2 / Intro · 1/4".
  - all 5 tabs open their section.
  - part sheet: Mute (mute true, button lit), sound change (epiano), Delete with confirm (part gone, sheet closes), Undo brings it back.
  - Back closes the sheet.
  - editor: a tap adds 1 note; pinch → zoom 2.72 with no stray note; hold on a second note → 2 selected, Copy/Delete shown, Paste after Copy.
  - long-press on a card → selection bar.
  - Sing → Chords: card shown with 4 bar boxes; Done → chords part added, mic off, ScriptProcessor released.
  - More → Sounds and back; theme → Velvet with theme-color `#160a0e`.
  - resize to 1400 restores the desktop DOM.
  - no page errors.
- Fake recognizer, iPhone user agent:
  - interim-only results → "drums like Ben Böhmer" sent and the drums made; sound engine `suspended` while listening, `running` after.
  - a final result is sent.
  - silent recognizer → 2 starts (watchdog retry), then typing opens with the dictation hint; a second failure → locked with the "Try talking again" link; the link resets it.
  - with Sing to play on, the mic was off when recognition started and came back on after.
- Checked in all three themes (Emerald, Velvet, Sapphire).

Screenshots: `/home/claude/ux4build/`. The main ones:
- `390x844-emerald-01-keys.png`, `-02-keys-chat`, `-03-song`, `-03-mix`, `-03-play`, `-03-more`, `-04-part-sheet`, `-05-editor`, `-06-song-sheet`, `-07-bpm-sheet`, `-08-sing-sheet`, `-09-gear-sheet`, `-10-type`
- the same at `360x780-*` and `844x390-*` (sideways editor: `844x390-emerald-05-editor.png`)
- the Velvet and Sapphire sets, and `themes-overview.png`
- `390-11-select`, `390-12-editor-select`, `390-13/14-singing*`, `390-15-after-sing`, `390-16-song-mode`, `390-17-more-sounds`, `390-18-theme`, `390-19-songs`, `390-20-talk-fallback`, `390-21-talk-iphone`
- `820x1180-emerald-01-keys.png`, `1440x900-emerald-01-keys.png`

## Smoke checks for the tester to add (tests/**)
At 390x844 and 360x780 (`hasTouch`, `isMobile`):
1. `scrollWidth === clientWidth` on every tab.
2. `#asOrb` bottom < innerHeight on load; `html[data-ptab=keys]`.
3. Each `#phTabs [data-ptab]` shows its section (`#mixerView` visible on Mix, `.keys` on Play, `#phMore` on More).
4. `#phPlay` starts and stops the loop.
5. Tapping a `.tracks>.trk` opens `PH.sheet==='part'`; `[data-edit]` opens the editor `position:fixed` and full screen.
6. No visible text box under 16 px.
7. Resizing to 1400 returns `.assistant>#asOrb` and `.songbar #projName`.

Also the one-line fix for the UX-5 check above.

## Try it on a phone (for the owner)
1. Open the test link on your phone. It opens on **Keys**: tap the big Keys button and say "drums like Ben Böhmer at 124". The beat plays; Play/Stop is at the bottom.
2. Tap **Sing → Bassline**, sing four bars over the drums, then tap **Done**. The bassline appears. Use **Undo** (top right) if you don't like it.
3. Tap **Song**, then tap the Bassline card. Change its sound, turn it down, add reverb, then **Edit notes**. Turn the phone sideways, drag a note, pinch to zoom.
4. Tap **Mix** to balance parts, **Play** to jam on the pads and keys, and the song name ▾ to **Download MP3**.

**iPhone talking:**
- In **Safari** (not the home-screen icon), tap Keys once and speak. It should send after a short pause.
- With the song playing, tap Keys and speak again.
- If nothing happens within about 6 seconds, typing opens: tap the 🎤 on the iPhone keyboard and speak. Please tell us which of these happened, and your iOS version.

## Known limits
- iPhone speech can't be tested here; if Apple's iOS 27 bug still bites, the typing fallback is what users get.
- The phone note editor is usable but slower than a mouse ("ask Keys" stays the main way).
- On a phone held sideways, the Keys tab is tight (a 64 px Keys button).
