# UX-4 · Studio Keys on a phone, with Keys first (design proposal)

Owner's request (13 Nov, 12:37 IST): "can we optimise the web app for phone as well, it is too mis aligned and one thing - let's keep the Keys assistant first for the phone app and tell me how we can convert this to an app once we have optimised it".

Status: design only (no code). Audit done on `main` at 50b6315 (UX-1 Song view included; UX-2 fixes not yet released).

## 1. What and why (plain words)

On a phone today Studio Keys is the desktop page squeezed into a narrow column: it is about 15,000 pixels tall (18 phone screens), the page slides sideways, and Keys (the assistant) only appears after two full screens of controller graphics. On a phone it should feel like a music app: you open it and Keys is right there with a big mic button; your song, the mixer and a playable keyboard are one tap away on a bar at the bottom; and Play/Stop is always under your thumb.

## 2. Audit: what is misaligned on a phone today

Measured with headless Chrome on the built `index.html` at iPhone 14/15 (390x844), a small Android (360x780) and iPad portrait (820x1180). Screenshots: `/home/claude/ux4/audit-<device>-NN-<screen>.png`.

Numbers (iPhone, with a 4-track song):
- Page height **15,182 px** (18 screens). Keys orb at **1,718 px** (third screen); the type box at 1,971 px; Play button at 2,681 px; tracks at 3,289 px.
- The page is **401 px wide on a 390 px phone** and **401 px on a 360 px phone** (41 px sideways slide on small Androids). Cause: the 8 controller knobs (fixed by UX-2) and the live-mixer strips (fixed by UX-2).
- **262 of 351** tappable things are smaller than 32 px (Apple and Google ask for 44/48 px).
- Every text box uses 15 px text, so **iPhone zooms the page in** when you tap the Keys box (iOS zooms any input under 16 px), and doesn't zoom back.
- iPad portrait: no sideways slide, but the orb still sits at 1,321 px, below the first screen (1,180 px).

Screen by screen (one line each):
- **Top bar** (`audit-iphone-01-open.png`): 240 px tall; the five section links wrap onto two rows; theme dots, "Sound on", "Studio empty" and "MIDI blocked" pills wrap to two more rows. "MIDI blocked" is shown in red on every iPhone (iPhones have no Web MIDI), which looks like an error.
- **Controller** (`02-controller`): the desktop hardware replica (pitch/mod wheels, LCD, 8 knobs, pads, Loop/Rec/Play/Stop) fills screens 1-2; knobs run off the right edge ("BE…" cut off); hints talk about computer keys (A W S E…) that a phone doesn't have.
- **On-screen keyboard** (`19-keyboard`): keys are 21 px wide (a fingertip is about 44 px); the strip opens at C2, so the playable middle (C4) is off screen to the right; it scrolls sideways inside a page that also scrolls.
- **Studio header** (`03-studio-top`): New song / Open / Save / Save a copy / Download MP3 / length / Ableton zip / MIDI only wrap into 4 rows before you reach Keys.
- **Keys assistant** (`04-assistant`, `06-assistant-chat`): the orb sits top-left, not centred; the type box is cut ("give m…") and causes the iPhone zoom; four settings (always listening, name, humming, speak replies) and ten suggestion chips stack into 8 rows; the chat window is only 210 px tall, so replies scroll inside a box inside the page.
- **Your sound** (`05-taste`): sits inside Keys; the Spotify setup and artist box push the transport another screen down.
- **Transport** (`07-transport`, Android `audit-android-07-transport.png`): Rec/Play/Stop, Play loop, position, Loop/Song, Make it a song, BPM, key, length, metronome, count-in, quantize and first loop stack into 9 rows (~820 px); on 360 px "Stop" drops to its own row.
- **Tracks** (`08-tracks`): readable, but each track card is about 190 px tall (name row, sound picker + volume, a text row, the note preview), so 4 tracks = 750 px; the bar ruler above is squeezed; "+ Empty instrument track / Empty beat / Voice note / Sing a melody / Import" take 3 rows.
- **Track FX** (`09-trackfx`): works, fits; sliders are narrow (110 px) and the × remove buttons are 18 px.
- **Song view** (`10-song`): UX-1's phone song map works (Intro/Drop/Outro blocks), but the hint says "Editing parts needs a tablet or a computer", the Undo chip text is cut ("Short: Intro 4 · Dr…"), and "Follow" floats alone on a row.
- **Note editor** (`11-editor`): the hint is mouse language ("Click… right-click deletes… Alt+drag"); the piano column takes a quarter of the width; you see one bar at a time, notes are 9 px tall (hard to hit with a finger); there is no full-screen mode, so the page scrolls when you drag.
- **Mixer** (`12-mixer`): each strip is wider than the phone and is cut off on the right (fixed by UX-2); 7 strips x 230 px = a long scroll; the "Live mixer" block repeats below the tracks (`13-livemixer`).
- **Your songs list** (`14-songs`): opens in the middle of the page over the controller; small "Open" and "Delete" buttons next to each other (easy to hit Delete).
- **Sounds** (`15-sounds`): 9 category buttons wrap to 3 rows; each sound card is 180 px tall with two small KEYS/PADS buttons (long scroll through ~60 sounds).
- **Effects · 8 knobs** (`16-effects`): fine on a phone but long (8 cards x 330 px), and the text is about hardware knobs.
- **Sing to play** (`17-sing`): the help paragraph is 9 lines; the sung-notes canvas's hint text runs off the right edge.
- **Controller profile / MIDI monitor** (`18-profile`): useless on an iPhone (no MIDI), still shown.
- **Toast** messages sit bottom-right and can cover the Send button; on 360 px the toast runs 23 px past the edge.
- **Safe areas**: nothing uses the notch/home-bar insets (`viewport-fit=cover` is not set), so in a home-screen app the top bar would sit under the clock and the bottom under the home bar.

Already being fixed elsewhere: UX-2 (on `preview-ux-2`, not released) removes the knob overflow and the mixer-strip overflow, which is most of the sideways slide. UX-4 builds on top of it.

## 3. The phone layout: Keys first

Applies only to phones (screen 600 px wide or less, portrait or landscape under 500 px tall). Tablets and computers keep today's page, with two small tablet fixes (below). Nothing is removed: everything on the desktop page is reachable on the phone, just one tap deeper.

Mockups (Emerald; Keys screen also in Velvet and Sapphire):
- `/home/claude/ux4/mockup-overview.png` (four phone screens side by side, 1400x900)
- `/home/claude/ux4/mockup-1-keys.png` · `mockup-1-keys-velvet.png` · `mockup-1-keys-sapphire.png`
- `/home/claude/ux4/mockup-2-singing.png`
- `/home/claude/ux4/mockup-3-song.png`
- `/home/claude/ux4/mockup-4-track-sheet.png`
- `/home/claude/ux4/mockup-5-play.png`
- `/home/claude/ux4/mockup-6-editor-landscape.png` (844x390)
- Source: `/home/claude/ux4/mockups.html` (real theme variables from `src/head.html`; fonts fall back to system fonts in the sandbox)

### The frame (every phone screen)
- **Top bar, 52 px**: the logo, the song name with "▾" (tap: Your songs, New song, Save a copy, Download MP3, Export for Ableton, MIDI only), the key and track count underneath, and one button on the right (Undo; on the Keys tab, the Keys settings gear). Theme dots, section links and the Sound/Studio/MIDI pills leave the top bar (they move to More).
- **Mini transport, 60 px, always visible** just above the tabs: big Play/Stop (46 px), Rec, bar.beat position, Loop | Song, BPM (tap to change BPM, key, length, metronome, count-in, quantize, first-loop length in a sheet). This is the thumb zone: Play is never more than one thumb movement away.
- **Tab bar, 58 px**: **Keys · Song · Mix · Play · More**. Keys is selected when the app opens.
- **Safe areas**: the page uses the whole screen (`viewport-fit=cover`); the top bar is pushed below the notch/Dynamic Island and the tab bar above the home bar (`env(safe-area-inset-*)`), so nothing sits under the clock or the home line. Heights use `100dvh` so the Safari address bar doesn't hide the tabs.
- **Sizes**: every button at least 44 px; text boxes at 16 px so iPhone no longer zooms in; toasts appear above the mini transport, full width, never covering Play.
- **Sound on**: the first tap anywhere (the Keys button, Play, a key) turns the sound on; the "Sound off · click to start" pill goes away on phones. On iPhone the app also asks to play through the silent switch where the phone supports it (`navigator.audioSession.type = 'playback'`), otherwise a one-line tip: "No sound? Flip the silent switch."
- **Screen stays on** while the song plays or you sing (Screen Wake Lock, where supported).

### Keys tab (what you see on opening) — `mockup-1-keys.png`
- A status line ("Keys is ready · AI on" / "Basic mode") and your taste ("Your sound: Ben Böhmer, Lane 8"; tap to change it).
- The conversation fills the screen (newest at the bottom, like a messaging app), with the "done" chips under each reply.
- One row of suggestion chips that scrolls sideways (the same smart chips as today, led by "● Sing the bassline" when it's the next step).
- The **talk dock** in thumb reach: **Type** (left), the big **Keys** button (92 px, centre), **Sing** (right).
  - Tap Keys → it listens (button pulses, status says "Listening…"); tap again or stop talking to send. Replies are spoken if "Speak replies" is on.
  - Type → a text box slides up with the phone keyboard (16 px, Send button). The iPhone keyboard's own dictation mic works here too.
  - Sing → a small sheet: "Bassline · Chords · Melody · Voice note" (the existing sing actions).
- The gear (top right) holds the four assistant settings: always listening for my name, Keys' name, turn humming into a track, speak replies.
- On a new empty song the chat shows one welcome bubble: "Tell me a vibe or an artist, or hum an idea." plus chips "Drums like Ben Böhmer", "Make a beat", "Hum an idea".

### Singing a part — `mockup-2-singing.png`
Shown on the Keys tab while a sung take runs (same rules as today: only the drums play, the singer is never played back, the part appears after analysis, the mic turns off after the take).
- Title ("Sing the bassline") and one line of what happens.
- 4 bar boxes: done / now (red outline) / to come, so you know when to start and stop.
- The note you're singing, big (A♭2), with an in-tune bar and the last few notes.
- Buttons: **Cancel · Start again · Done** (Done ends early and keeps what you sang).
- When it's analysed, the chat gets Keys' reply ("Your bassline is in: 16 notes in F minor, on the beat") with Undo.

### Song tab — `mockup-3-song.png`
- Line 1: "Song · 16 bars · 0:31" and "+ Section" (in Loop mode: "Loop · 4 bars" and "Make it a song ▾").
- In Song mode, the section map from UX-1 (tap a section to loop it, hold for its menu: rename, duplicate, longer/shorter, split, delete). The UX-1 desktop timeline stays for tablets and computers.
- Parts as compact cards (about 84 px): colour stripe, name, sound, a one-line note preview, and FX / M / S buttons (44 px). Tap the card → the part's sheet. Long-press → select several (the selection bar appears at the top: Play these, Mute, Delete).
- "+ Add a part": a sheet with Ask Keys, Empty instrument, Empty beat, Voice note, Sing a melody, Import a file (audio or MIDI from Files).

### A part's sheet — `mockup-4-track-sheet.png`
Slides up from the bottom (drag down or tap outside to close): name, M / S, sound picker, volume, the part's effects as tiles (tap a tile to set it with a big slider, × to remove), + Add effect, and **Edit notes · Copy · Delete** (Delete asks once, and Undo brings it back).

### Note editor — `mockup-6-editor-landscape.png`
- Opens full screen from "Edit notes" and asks to turn the phone sideways (it also works upright, showing one bar).
- Toolbar: back, part name, Draw | Select, Grid, Undo, Copy, −1/+1, Play.
- Touch: tap to add a note, drag to move, drag the right end to lengthen, **hold** a note to select it (then Copy/Delete appear in the toolbar), two fingers to scroll, pinch to zoom. Notes are drawn at least 22 px tall on phones. The velocity lane stays at the bottom.
- The hint is in touch words: "Tap to add · drag to move · hold to select · pinch to zoom".

### Mix tab
The mixer as a list: per part one row with name, a full-width volume slider, M / S, and a "▾" that opens its EQ dials and effects (the same sheet as above). Master at the top. The second "Live mixer" block under the tracks is not shown on phones (the Keys and Pads live sounds become two rows at the bottom of this list).

### Play tab — `mockup-5-play.png`
- Pickers for the Keys sound and the Pads sound (the full sound list opens as a sheet with the category filters and search).
- 8 pads, 74 px tall.
- Octave − / + and a keyboard of about 1⅓ octaves (C4–E5) with 36 px keys, 220 px tall; sideways it shows two octaves. The 3D controller picture (wheels, screen, knobs) is not shown on phones.
- Rec in the mini transport records what you play over the loop, as today.
- On Android a USB or Bluetooth MIDI keyboard works (Chrome has Web MIDI). On iPhone there is no MIDI in the browser, so the "MIDI blocked" warning is replaced by nothing at all (no red pill).

### More tab
A plain list that opens each of today's sections full screen with a back arrow: **Your songs**, **Your sound** (Spotify, artists), **Sounds**, **Effects (8 knobs)**, **Sing to play** (the tuner), **Sound Lab**, **MIDI controller** (only where MIDI exists), **Colour theme** (the three dots), **Add to Home Screen** (install help, see section 5), Sound credits.

### Tablets (iPad portrait 820 px)
- Studio (with Keys) moves above the controller, so Keys is on the first screen (today the orb is at 1,321 px, below the fold).
- Every tappable thing gets the 44 px minimum on touch screens (`pointer: coarse`), and text boxes 16 px.
Everything else on tablets stays as it is.

## 4. User flow, step by step (phone)

1. Open the app (or the home-screen icon). A new empty song opens on the **Keys** tab: "Tell me a vibe or an artist, or hum an idea."
2. Tap the big **Keys** button (this also turns the sound on) and say "drums like Ben Böhmer at 124". Keys answers in the chat and out loud; the beat starts playing; the mini transport shows 1.1, 1.2…
3. Tap the chip **● Sing the bassline** (or say it, or tap **Sing → Bassline**). The singing screen counts in; you sing four bars over the drums; you see each note as you sing it.
4. Keys analyses the take and replies "Your bassline is in…"; the bass plays with the drums. "Sounds wrong?" → tap **Undo** in the top bar or say "undo".
5. Say "add chords" or tap the chip. Repeat for a melody. Each reply suggests one next step.
6. Tap **Song**: you see the parts. Tap **Bassline** → its sheet: change the sound, turn it down, add reverb, or **Edit notes** (turn the phone sideways to drag notes).
7. Tap **Make it a song ▾ → Short** to lay it out as Intro / Drop / Outro; tap **Song** in the mini transport to hear it start to end.
8. Tap **Mix** to balance levels, or just ask Keys "mix it".
9. Tap **Play** to jam on pads and keys over the loop; Rec captures it as a new part.
10. Tap the song name ▾ → **Download MP3** to share the idea (a reel, a voice note to a friend). The song is saved on the phone; next time it's in **Your songs**.

## 5. From web app to phone app

### Step A: installable web app now (recommended next, size S-M)
What we add: a web app manifest (name "Studio Keys", short name "Keys", theme colours, `display: standalone`, portrait), app icons (192/512 px plus an Apple touch icon, drawn from the 3x3 logo), and a small service worker that keeps a copy of the app so it opens offline. The Worker (`cloudflare/worker.js`) serves these extra files (`/manifest.webmanifest`, `/sw.js`, `/icons/*`); today it redirects every other address to `/`. No new Cloudflare settings, bindings or costs. The local-file version keeps working (the service worker only registers on the website).

What it gives:
| | Android (Chrome) | iPhone (Safari) |
|---|---|---|
| How to install | Chrome offers "Install app" (we can show our own "Add to Home Screen" button) | Share → Add to Home Screen (we show a one-time picture tip; Safari has no install button for sites) |
| Opens full screen with our icon | Yes | Yes (since iOS 26 every home-screen site opens as an app) |
| Works offline | Yes: the studio, sounds and saved songs (the AI and Spotify need the internet; offline it uses the basic parser) | Yes, same |
| Talk to Keys (speech recognition) | Yes | **Not reliable**: Apple doesn't offer speech recognition to home-screen web apps, and iOS 27 has a bug where it stops after music plays. On iPhone the Keys button falls back to "Type" with the iPhone keyboard's dictation mic, which works everywhere. Singing works (that uses the microphone directly, not speech recognition). |
| Microphone for singing | Yes | Yes (asks once per session) |
| MIDI keyboard | Yes (USB/Bluetooth) | No (no Web MIDI on any iPhone browser) |
| Songs kept safe | Yes; we ask Chrome to keep storage ("persistent") | Better than in Safari: Safari can wipe a website's saved data after 7 days without a visit; home-screen apps are exempt |
| Spotify login | Works | Works, but log in inside the installed app (it keeps its own storage, separate from Safari) |
| Cost | Free | Free |

### Step B: store apps later (only if we want to be found in the stores)
**Android, Google Play, via a Trusted Web Activity (TWA).** A tiny Android app that opens our live site full screen in Chrome (made with Google's Bubblewrap or PWABuilder). Everything works like the installed web app (mic, speech, MIDI, offline); every release of the website updates the app automatically. Needs: Google Play developer account, **$25 once**; the Worker serves a `/.well-known/assetlinks.json` file that proves we own the site; a store listing (icon, screenshots, privacy policy text). Google asks new personal accounts to run a closed test with **12 testers for 14 days** before going public. Effort: S-M plus about 2-3 weeks of waiting.

**iPhone (and Android), App Store, via a wrapper such as Capacitor.** Our `index.html` is packed inside a real iOS app (a web view). Needs: Apple developer account, **$99 per year**, a Mac with Xcode (or a cloud build service) to build and upload; Apple review. What changes:
- **Speech**: speech recognition inside an app's web view needs the app's permission text; to make "Hey Keys" reliable we'd add a native speech plugin (uses Apple's speech engine). Medium work.
- **Microphone**: works (permission text in the app); singing stays the same.
- **MIDI**: still not in the web view; a native CoreMIDI plugin could pass notes into the app. Medium work, optional.
- **Spotify login**: needs a new redirect address for the app registered in the Spotify developer dashboard (an owner step), and an in-app browser for the login.
- **AI**: calls the same Worker (`/api/assistant`) at its full address; the Worker must accept requests from the app (a small Worker change).
- **Saving songs**: stays on the phone inside the app (removed if the app is deleted); we'd add "Save to Files" backup.
- **Updates**: each new version goes through Apple review (1-2 days); the web version keeps updating instantly.
- **Risk**: Apple rejects apps that are "just a website". Ours works offline with built-in sounds, which helps, but the native touches (speech, share sheet, Files) make approval more likely.
Effort: M-L, then ongoing yearly fee and review rounds.

### Recommendation
1. Ship the phone layout (this item) and Step A (installable web app) first. Free, works on both phones, offline, and it's what most music tools on the web do.
2. Then Android on Google Play with a TWA ($25 once) if you want a store listing: almost no extra code, updates itself.
3. Do the iPhone App Store (Capacitor, $99/year) only when the phone version is proven, mainly because it's the only way to get reliable talking to Keys and MIDI on iPhone.
Needs your approval: any developer account (money), the Spotify redirect change, and the store listing text (privacy wording).

## 6. How it will be built

Approach: one page, same HTML for every screen size. On phones a `data-phone` attribute on `<html>` (set from a `(max-width:600px), (max-height:500px) and (pointer:coarse)` media query) and a `data-ptab="keys|song|mix|play|more"` attribute switch the layout with CSS: each tab shows only its existing section, nothing is duplicated and no feature is rewritten. A few new bits of HTML (top bar, mini transport, tab bar, sheets) only show on phones and call the existing functions (`loopPlay`, `loopStop`, the Rec button, `openEditor`, `undo`, the assistant's `handleRequest`). Builds on UX-2 (merge it first).

Files (studio-ux-dev):
- `src/head.html`: a phone block at the end (tabs, mini transport, sheets, compact track cards, 44 px targets, 16 px inputs, safe-area padding, `100dvh`), a tablet block (Studio above the controller under 1100 px portrait, 44 px on `pointer:coarse`), `viewport-fit=cover`, the manifest link and theme-color meta. Only theme variables; checked in all three themes.
- `src/body.html`: phone top bar, mini transport, tab bar, the "+ Add a part", song menu, BPM/settings and part sheets (empty containers filled by JS), the More list, the install tip.
- New `src/phone.js` (about 250 lines): tab switching (remembered per device), sheets (open/close, drag down, focus trap, Escape/back), the mini transport mirroring `TR`/`LOOP` state, the talk dock (Keys / Type / Sing), the singing screen (reads the existing take state and `MIC` notes), long-press select on track cards, Android back button closes sheets (history state), screen wake lock while playing or singing, iOS silent-switch handling, install prompt (Android `beforeinstallprompt`, iPhone tip). Needs the lead to add it to `PARTS` in `tools/build.py` (after `studio.js`).
- `src/daw.js`: the track card on phones (compact row + preview), the part sheet content (reuses the FX panel renderer), the mixer as a list on phones; the note editor's touch gestures (hold to select, pinch to zoom, two-finger scroll, 22 px minimum note height, full-screen class).
- `src/edit.js`: touch hint text; the editor toolbar gets Copy/Delete buttons when notes are selected (touch has no Ctrl+C or right-click).
- `src/studio.js`: transport extras (key, length, metronome, count-in, quantize, first loop) render into the BPM sheet on phones.
- `src/play.js` / `src/controller.js`: phone keyboard range C4–E5 (two octaves sideways), 36 px keys, scroll to the octave; hide the controller picture on phones.
- `src/assistant.js` (assistant-dev's file; small, named here so the brief can allow it): the orb in the talk dock; when speech recognition is missing or fails (iPhone home-screen app), the Keys button opens Type with "Use the mic on your keyboard to talk"; a watchdog that restarts listening if no result comes within a few seconds (iOS 27 bug).
- `src/midi.js`: no red "MIDI blocked" pill when the browser has no MIDI at all.
- Installable web app (Step A, can be a separate item): `pwa/manifest.webmanifest`, `pwa/sw.js` (cache the page and nothing else; network first for `/api/*`), `pwa/icon-192.png`, `pwa/icon-512.png`, `pwa/apple-touch-icon.png`; `src/boot.js` registers the service worker on https only; `cloudflare/worker.js` (assistant-dev / lead deploy) serves `/manifest.webmanifest`, `/sw.js` and `/icons/*` from the same branch as the page (previews included), with the right content types. The service worker must not cache preview pages forever (network first, cache fallback).
- No new assistant actions. No prompt change.
- `tests/smoke.mjs` (qa-tester): at 390x844 and 360x780: no sideways scroll (`scrollWidth === clientWidth`), the Keys button visible on load without scrolling, all five tabs open their section, Play in the mini transport starts and stops the loop, a part's sheet opens and "Edit notes" opens the editor full screen, no text box under 16 px.

## 7. Effort, risks, decisions

**Effort: L** for the phone layout (UX-4), plus **S-M** for the installable web app (suggest a separate item, e.g. UX-5, after UX-4). Store apps are separate later items.

Risks:
- **Speech on iPhone.** Talking to Keys works in Safari but not reliably in a home-screen app, and iOS 27 has a known bug where speech stops after audio plays. Mitigation: a clear fallback to typing with the keyboard's dictation mic, and a test on the owner's iPhone before release. Singing is not affected.
- **Two layouts to keep working.** Every future UI change must be checked at phone size too. Mitigation: the smoke test runs at 390 px and 360 px; the phone CSS sits in one block.
- **The note editor on a phone** will never be as quick as a mouse. Mitigation: full screen, sideways, hold-to-select; "ask Keys" stays the main way to change notes on a phone.
- **Performance on older phones**: the page is 9.5 MB with all sounds; first load on mobile data takes a while (offline cache fixes repeat visits). Rendering 6+ parts while singing must stay under 50 ms per task; test on a mid-range Android.
- **iPhone silent switch** mutes web audio; the newer audio-session setting fixes it where available, otherwise a tip.
- **Velvet theme**: the accent (Play) and the record red are close; the Rec button keeps a distinct shape (dot) and the Play button an icon, so they're not confused.
- **Gestures**: long-press and pinch must not fight the page scroll; the editor and keyboard block page scrolling only inside themselves.

Decisions for the owner:
1. **Phone navigation.** (a) A tab bar at the bottom: Keys · Song · Mix · Play · More, opening on Keys *(recommended: one thing per screen, Play always in reach, feels like an app)*; (b) one long scrolling page reordered with Keys at the top (less work, but still long and fiddly).
2. **On iPhone, when talking doesn't work in the home-screen app.** (a) The Keys button opens typing with the keyboard's dictation mic and says so *(recommended: works today, no extra services, nothing leaves the phone except the text to the AI as now)*; (b) record the voice and send the audio to a speech-to-text service on our Worker (works everywhere, but a new service: costs and privacy text need your approval).
3. **The path to an app.** (a) Installable web app now (free), Google Play next via TWA ($25 once), iPhone App Store later only if needed ($99/year) *(recommended)*; (b) installable web app only for now; (c) go straight to Capacitor store apps for both (about $124 the first year, more work, Apple review).

## 8. Research questions (for the researcher, via the lead)
1. How do Suno, BandLab and Koala Sampler lay out their phone apps (tabs vs one screen; where record and play sit)? Any pattern producers love for "talk to the app"?
2. Current status (Nov 2026) of Web Speech recognition in iOS 27 home-screen web apps and in WKWebView (the 321436 WebKit bug): fixed in 27.2/27.3?
3. App Store review: recent examples of Capacitor music apps approved or rejected under guideline 4.2 (minimum functionality).
