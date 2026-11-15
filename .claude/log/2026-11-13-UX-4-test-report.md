# UX-4 test report (qa-tester, branch check) · 13 Nov 2026

## Verdict: NOT READY for the owner
The phone layout is good: it opens on Keys, the five tabs work, Play/Stop sits under the thumb, there's no sideways scroll, text boxes are 16 px, desktop hasn't moved, and every iPhone talk path behaves as designed. But 4 bugs should go back to studio-ux-dev first. Bug 1 throws a phone user out of the app with the most common gesture there is.

## check.sh (branch preview-ux-4, head 4cfeb70)
```
PASS bundle syntax
PASS worker syntax
... (39 smoke checks, all PASS, including the fixed UX-5 check
     "song: sing the chords in Song mode → plays in the selected section ... toast")
PASS 390x844: opens on Keys with the Keys button on screen · orb 609-701, bottom bar at 725
PASS 390x844: each tab shows its section, no sideways scroll, text boxes ≥ 16 px · 5 tabs
PASS 390x844: mini transport Play starts and stops the loop · playing → stopped
PASS 390x844: tap a part opens its sheet, Edit notes opens the editor full screen · sheet "Drums", editor 390x844 fixed
PASS 360x780: (same 4 checks) · orb 545-637, bottom bar at 661 · editor 360x780 fixed
PASS 1400 px: the desktop layout comes back
PASS phone: no page errors
PHONE OK: 10 checks
SMOKE OK: 39 checks
CHECK OK          (1 min 53 s, under the 3-minute budget)
```

## What I changed in tests (pushed to preview-ux-4: 1fe4945, 4cfeb70)
1. **UX-5 sung-chords check: confirmed it's a test conflict, not a product bug.** UX-2's check 6b leaves a `take==='chords'` track behind. That makes the UX-5 check a *re-sung* take, and UX-5 handles that as designed: the old placement is kept ("Intro,Drop,Outro") with no toast. The `waitForFunction` also returned at once because a chords take already existed (mode was still `loop`). Fix: the check now starts by removing any chords take. Result: PASS.
   - **`preview-ux-5` alone passes without the fix** (32/32 on a quiet machine). It has no 6b check, so I put the fix on `preview-ux-4` only. A first run there showed 2 FAILs in the reload checks, but that was load from my parallel session; a rerun was clean.
2. **New `tests/phone.mjs`** covers the 7 phone checks the brief asked for, at 390x844 and 360x780 with touch, plus the return to 1400 px. `smoke.mjs` runs it at the end, so I didn't need to commit anything under `.claude/` (no change to check.sh).
3. **Hardened the "reload keeps the last song" check.** It now waits for the song to reach the songs list, because it failed on a busy machine.

## Bugs (send back to studio-ux-dev)
1. **HIGH: the back gesture inside the note editor leaves Studio Keys.** This hits anyone who opens the editor from a part's sheet, which is the only way on a phone.
   1. Phone (Android 390x844 or iPhone), Song tab, tap a part, tap **Edit notes**.
   2. Press Android back (or swipe back on iPhone).
   3. Expected: the editor closes. Actual: the browser leaves the page (headless went to `about:blank`). `history.state` is `null` while the editor is open.
   - Cause: tapping Edit notes closes the sheet, which calls `phPop()` → `history.back()` (async). The editor then calls `phPush('editor')`, and the queued back undoes that push.
   - Back works correctly from a sheet, a More page and the Song sheet.
   - Files: `src/phone.js` (`phSheetClose`/`phEditor`; e.g. `replaceState` when one overlay replaces another).
2. **MEDIUM: a note you just tapped in can't be dragged; dragging stretches it instead.**
   1. Phone editor, tap an empty spot. A 1/16 note is added, only 6 px wide at 24 px per beat.
   2. Put a finger on it and drag up and to the right.
   3. Expected: it moves. Actual: it gets longer (d 0.25 → 2.25) and stays on its pitch.
   - The "right end resizes" zone is the last 7 px, so any note under about 8 px is all resize zone. Long notes move fine (60→61, both selected notes moved).
   - Files: `src/daw.js` (`hit()` edge zone; keep a minimum move area on touch) or `src/phone.js`.
3. **MEDIUM: holding a section in the song map opens its menu, then letting go fires the menu item under your finger.**
   1. Song tab, Song mode (Make it a song → Short).
   2. Hold **Intro** for about 0.6 s, then lift the finger.
   3. The menu opens at the finger (so "Rename" sits under it). On release, the click lands on that item: the item runs and the menu closes.
   - Traced: `songMenuClose` is called from the menu's `[data-mi]` click handler. Lower on the screen, the item under the finger could be Duplicate or Longer.
   - Files: `src/phone.js` (long-press on `#songMap`), `src/song.js` (`songMenuOpen` position).
4. **MEDIUM: on iPad (and other touch tablets) the Keys text box is still 15 px, so iPad Safari zooms in when you tap it.**
   1. iPad 820x1180 (`pointer:coarse`).
   2. The computed `font-size` of `#asIn` is 15 px, and `#mp3Len` is 12 px.
   - Cause: `.as-form .input{font-size:15px}` and `#mp3Len{font-size:12px}` are more specific than the new tablet rule `input.input,...{font-size:16px}`. Phones are fine: `html[data-phone]` uses `!important`.
   - Files: `src/head.html` (the tablet block around line 692).

## Rough edges (not blockers; for the developer's list)
- **Keys orb looks like it has a gradient, as the brief suspected.** It's a `radial-gradient` with a white `.orb-core` highlight and a 6 px ring shadow, which isn't matte. The style comes from main (head.html lines 300-301, 536-541), but on the phone it's now the hero. The piano keys use linear gradients too (from main). This is a design call for the lead.
- **Sideways (844x390):** the Keys tab chat is only 41 px tall, so the conversation is hidden. On the Play tab the pads and keyboard are completely below the fold: the bars take about 190 of 390 px, and you must scroll to play.
- **Upright editor:** the toolbar plus hint take about 295 px, so the grid shows about 1.5 bars and about 11 rows. A toast covers the grid's bottom rows.
- **Desktop wording on the phone:** the selection bar says "Ctrl/Cmd+click a track to add or remove it". The Play-tab keys still show computer-key letters (A W S E…), and the section menu shows "Ctrl/Cmd+D" and "Delete key".
- The "Your sound: tap to add…" pill has its text sitting high, with empty space below (390 and 360).
- A double tap on a note deletes it (the desktop double-click). It can be undone, but the hint doesn't mention it.
- Tiny hard-coded colours: `#333` fallback in `#phThemeSlot`, `.ph-scrim rgba(0,0,0,.55)`, and the JS fallback `#07120e` for theme-color.
- From main, not UX-4: the offline parser hears "drums like Ben Böhmer at 124" as 122 bpm ("…at 124 bpm" gives 124). It's the same on main and only matters offline. Owner: assistant-dev (`src/maker.js`).

## What I checked (with numbers)
- **iPhone 390x844 (touch, iPhone UA, fake mic):**
  - Opens on Keys, page 844 tall, Keys button at 609-701.
  - Typed "drums like Ben Böhmer at 124" → Melodic House Kit, 172 hits. "another one" → different groove, still 1 drums track.
  - Mini Play → playing at 1.4, Stop → stopped. The silent-switch tip shows once. Undo returns the first groove.
- **Singing:**
  - Sing → Bassline: card with 4 bar boxes and the live note; 10 notes landed; mic off after; no audio track added.
  - Song mode (Short, Intro selected), Sing → Chords: placed in Intro only; toast "“Sung chords” plays in Intro. Click its empty parts to add it elsewhere."; mic off.
  - + Section → 24 bars, Undo → back to 3 sections.
- **Part sheet:**
  - Sound → epiano; volume slider → 0.18; FX panel with EQ + 5 effects and "+ Add effect"; FX button on a card opens the sheet at the effects (top 277).
  - Mute toggles; Delete asks "Confirm delete" then deletes (toast); Undo brings it back (3 parts).
  - Holding a card → selection bar (1 part).
- **Editor (full screen 390x844):**
  - Tap adds 1 note (1 undo step).
  - Hold a second note → selection 2.
  - Drag a long note moves the selected group.
  - Pinch → zoom 1 → 3 with no stray note; two-finger scroll → scrollLeft 0 → 62.
  - Copy/Paste/Delete buttons appear with a selection.
- **Mix:** list with master first, 44 px M/S, no sideways scroll (1,092 px tall).
- **Play:**
  - C4–E5 keyboard; C4 key 34x218 px at the left edge (middle C reachable), and a tap plays it.
  - 8 pads at 79x74; Octave + → C5.
- **More:**
  - Songs list: Open/Delete are 44 px tall with a 14 px gap, and Delete asks to confirm, so it's not easy to hit by mistake.
  - Sounds and Theme pages open; back closes them.
- **Themes:** Emerald, Velvet and Sapphire on all 5 tabs (screenshots `i390-th-*`). theme-color follows (#07120e / #160a0e / #09101f). The phone CSS has no gradients or glows apart from the orb, which comes from main.
- **360x780 Android:** no sideways scroll on any tab, Keys button at 545-637, sheet and editor fit (grid 566 px tall).
- **844x390 sideways:** phone layout on, Keys button 64 px at 201-265, no sideways scroll. Editor full screen with the velocity lane visible.
- **iPad 820x1180:**
  - Orb at 338 px; it was 1,321 on main.
  - Buttons under 44 px: 287 total, 223 → 17 vs main.
  - Text boxes: see bug 4.
- **Desktop 1440x900 vs main:**
  - Page height 5,986 = 5,986.
  - Orb, tracks and top bar at identical positions.
  - Pixel diff only in the random drum/bass patterns, plus the "Song ready · 4 bars / Play loop / STOP" labels. Those labels come from the UX-2/UX-5 merge (`syncLoopState`), not from UX-4.
- **iPhone talk (fake `webkitSpeechRecognition`, iPhone UA):**
  - Interim-only words "drums like Ben Böhmer at 124" are sent after the pause and the drums are made. The engine is `suspended` while listening and `running` after.
  - A final result is sent at once ("add a bassline" → bass).
  - Silent recognizer that never ends: retry at 6 s (2 starts), then typing opens at about 12 s with "…tap the 🎤 on your keyboard to talk". A second silent round shows the "Try talking again" link and the button goes straight to typing; the link resets it.
  - Silent quick end (iOS): fallback at once.
  - With Sing to play on: mic off when recognition starts, back on after.
  - While Keys is speaking: speech is cancelled first and the request still works.
  - While a song plays: the engine keeps running.
  - Android UA: the same, except the mic isn't released and the empty end says "I didn't hear anything…" (as designed).
- **Console:** no page errors in any session. The only console error is the blocked Google Fonts request (offline file://).

## Try it on your phone (for the owner, after the fixes)
1. Open the test link. It opens on **Keys**. Tap Keys, say "drums like Ben Böhmer at 124", then press ▶ and ■ at the bottom.
2. Tap **Sing → Bassline**, hum 4 bars over the drums, then tap **Done**. Your bassline appears and the mic turns off.
3. Tap **Song**, tap the Bassline card: change its sound, turn it down and add reverb. Tap **Edit notes**, add a note with a tap and drag it, then press your phone's **back**. You should land back on the Song tab, still in the app.
4. In Song mode, hold a section (Intro) and choose **Duplicate** from its menu.
5. Try **Mix**, **Play** (middle C is the first key on the left) and **More → Colour theme**.
6. iPhone: tap Keys in Safari and speak. If nothing happens in about 12 s, typing opens; tap 🎤 on the keyboard. Tell us which happened and your iOS version.

## Screenshots: /home/claude/ux4test/
- iPhone 390: `i390-01-open`, `-03-beat`, `-04-playing`, `-05-sing-sheet`, `-07-singing`, `-08-after-bass`, `-09-song-tab`, `-10-make-menu`, `-11-song-mode`, `-14-after-chords`, `-16-part-sheet`, `-17-part-fx`, `-18-delete-confirm`, `-19-editor`, `-20/21/22-editor-*`, `-24-editor-shortdrag`, `-30-mix`, `-32-play`, `-33-more`, `-34-songs`, `-35-songs-delete`, `-36-sounds`, `-37-theme`, `-41-select`, `-44-section-hold` (menu under the finger), `-45-section-release` (gone).
- Themes: `i390-th-{emerald,velvet,sapphire}-{keys,song,mix,play,more}`; contact sheets `sheet-a.png`, `sheet-b.png`.
- Android 360: `a360-*` (`sheet-c.png`). Sideways: `l844-*` (`sheet-d.png`).
- iPad and desktop: `ipad820-{main,br}-{top,full}`, `d1440-{main,br}-{top,full}`, diff crops `d1440-diffs.png`.
- Talk: `iphone-talk-0{1,2,3}-*`, `android-talk-*`.
- Test scripts: `/home/claude/ux4test/s1.mjs` … `s12.mjs`, `lib.mjs` (fake recognizer included).
