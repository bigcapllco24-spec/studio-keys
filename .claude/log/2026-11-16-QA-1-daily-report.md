# QA-1 daily session · 16 Nov 2026 · `main` @ d850947 (product code unchanged since the 14 Nov release)

**Verdict: main is healthy. check.sh passes (47 checks, 1 min 56 s), and there were no page errors in 9 session scripts. The new paths turned up 1 high bug, 4 medium bugs and 3 low ones.**
- High: Undo after "Save a copy" goes back into the original song and overwrites it.
- Medium: tempo changes typed in the BPM box aren't an undo step. Basic mode turns "afro house" into plain house, mishears "unsolo" and "un-mute", and adds a melody when asked to quantize.

Genres, the mixer, sidechain, MIDI recording with quantize, the songs list and 390 px all held up well. The numbers are below.

## check.sh
```
PASS bundle syntax · PASS worker syntax · … (47 checks, all PASS)
PASS track like Stephan Bodzin (drums, bass, chords, melody) · drums:kitDeepTechno:132 bass:rollbass:48 …
PASS phone width has no sideways scroll · 390 px
PASS no page errors
SMOKE OK: 47 checks
CHECK OK   (real 1m56s, quiet machine)
```
Full log: /tmp/qa/2026-11-16/check.log

## Bugs (ranked; none of these is in the 13-15 Nov reports, the board's follow-ups, or the waiting branches; checked against preview-ai-6, which includes ai-4)

1. **Undo after "Save a copy" takes you back into the original song and overwrites it** · studio · HIGH
   - Steps:
     1. New song. Type "drums like Charlotte de Witte", then "add a bassline", then press Save.
     2. Press **Save a copy**. The title says "Original (copy)" and the toast says "Saved 'Original (copy)'".
     3. Press **Undo** once.
   - Happens: the title switches back to "Original" with 1 track (`PROJ.id` = the original's id). From now on every change, and every further Undo, autosaves into the original.
   - In a longer run: copy, add a bassline to the copy, then Undo ×3. The saved original "DnB Three renamed" (174 BPM, 1 track) became "DnB Three", **78 BPM, 0 tracks**. Its content was lost after reload (screenshot p3b-copy-undo.png).
   - Should: the copy starts its own history, so Undo stays in the copy and the original is never touched.
   - Suspect: `saveCopy()` in src/daw.js doesn't call `undoReset()`. The undo snapshots still carry the original's `PROJ.id`, and `applyState` (src/edit.js) restores it. `newSong`/`loadNamed` both reset.
   - Not changed on any preview branch. Owner: studio-ux-dev.

2. **Changing the tempo in the BPM box (or with Tap) isn't an undo step; Undo then undoes the edit before it too, and Redo loses the tempo** · studio · MEDIUM
   - Steps: "hip hop beat at 88 bpm like J Dilla" → "add chords" → type 96 in the BPM box, Enter → Undo → Redo.
   - Happens:
     - Undo removes the chords **and** puts the tempo back to 88.
     - Redo brings the chords back but the tempo stays at **88**, so the 96 is gone.
     - In a 12-change chain, the tempo change and the next edit (a rename) undid together (10 undo steps for 11 changes).
   - Should: a tempo change is one undo step, like every other change.
   - Suspect: the `#bpm` change handler and Tap call `setTempo()` (src/studio.js:49-56), which never calls `saveProject()`, so `undoNote` never sees it.
   - Same code on every preview branch. Owner: studio-ux-dev.

3. **Basic mode: "afro house" makes plain house** · assistant · MEDIUM
   - Steps: new song → type "afro house beat" (or "make an afro house groove with congas").
   - Happens: "House style, House drums on 909 House Kit: … clap on 2 and 4", 124 BPM. You get no rim, shaker or afro percussion, and the style is `house`.
   - Only "drums like Black Coffee" or "Keinemusik" gets afro (120 BPM, Bongos & Percussion kit, rim, shaker, congas).
   - Should: afro style (rim on 2 and 4, shuffled hats, shaker, percussion, about 118-122 BPM).
   - Cause: `STYLE_WORDS` in src/maker.js lists `['house',/\bhouse\b/]` before `['afro',/\b(afro|…|afro house)\b/]`, so the first match wins.
   - Live AI is fine: the Worker prompt sends the key `afro`.
   - Same on preview-ai-1/4/6/7. Owner: assistant-dev.

4. **Basic mode: "unsolo the bass" rewrites the bassline and leaves it soloed; "un-mute the drums" mutes them** · assistant · MEDIUM
   - Steps: a song with drums, bass, chords and melody. Press S on the bass → type "unsolo the bass".
   - Happens: "Bassline on Rolling Bass in A minor": a new bassline (`add_bass`), and the solo stays on.
   - "un-mute the drums" (drums muted) → "Drums: muted".
   - "remove the solo" → "I couldn't turn that into a change".
   - Should: clear the solo or unmute, and never touch the notes.
   - Cause (src/maker.js): `mixVerb` matches `\bmute\b` inside "un-mute", and "unsolo" matches no verb, so the bass word falls through to `add_bass`.
   - Still the same on preview-ai-6 (which fixes "is the bass too loud?", "turn everything down" and "the mix is too loud"; I checked). Owner: assistant-dev.

5. **Basic mode: "quantize my melody" adds a new melody track** · assistant · MEDIUM
   - Steps: any song with a melody → type "quantize my melody to 1/8".
   - Happens: "Melody 2 (new track) on Melodic Pluck". "quantize it", "quantize the keys" and "tighten up the timing" → "I couldn't turn that into a change".
   - Should: run the existing `quantize` action. It is in src/actions.js and the Worker prompt, but `maker.js` has no rule for it. This is a natural thing to say right after recording from a keyboard.
   - Not on any preview branch. Owner: assistant-dev.

6. **Basic mode: two requests in one sentence do the wrong thing or drop the second half without saying so** · assistant · LOW
   - "more reverb on the chords and less on the melody" → the chords' reverb goes **down** (24% → 22%), because "less" anywhere makes it a cut.
   - "make the drums louder and the bass quieter" → only the drums. "mute the drums and solo the bass" → only the mute. "set the tempo to 128 and add a shaker" → shaker only, tempo unchanged.
   - In every case the reply doesn't mention the skipped part.
   - Same on preview-ai-6. Owner: assistant-dev.

7. **Keys names an artist you didn't say** · assistant · LOW
   - "drums like Black Coffee" → "**Keinemusik**-style drums…". "lofi hip hop beat" / "chill lo-fi beat" → "**Lofi Girl**-style drums…".
   - `PROJ.ref` is set to that name, so later replies keep naming it.
   - Cause: the reply uses `artist.name` (the first name in the `ARTISTS` row). "lofi" is in the Lofi Girl row's aliases.
   - Should: echo the name the user said, or "lo-fi drums". Owner: assistant-dev (`ARTISTS` table / reply text).

8. **Big EQ boosts clip the master and the Ableton zip's Mix.wav** · engine · LOW
   - Steps: Charlotte de Witte drums + bass + chords + melody → every fader at 100 → Low +15 and High +15 on drums and bass → Master Low +15, plus max reverb/delay/drive/comp.
   - Render: peak **+0.23 dBFS**, **54 clipped samples per loop**, true peak +0.1 dBTP, -6.5 LUFS. The live analyser also showed 1 over.
   - The zip's Mix.wav goes through the same `renderAudio` + `wavBytes` path, which clamps (hard clips). The MP3 normalises to 0.97, so it's fine.
   - Realistic settings are fine: all faders at 100 gives -0.33 dBFS and 0 clipped samples. With Low +6 on drums and bass: -0.32 dBFS, true peak -0.2.
   - Should: the master never exceeds 0 dBFS. That needs a real brickwall/clip guard after the `DynamicsCompressor` "limiter", or the zip mix gets the same normalise as the MP3.
   - Owner: sound-engine-dev (src/studio.js `renderGraph`, src/core.js master chain).

## Rough edges (not filed)
- **Deleting the current song** from Open song… removes it from the list, but the studio keeps showing it. The next change saves it back under a new id ("DnB Three" reappeared). A "this is the song you're in: start a new one?" prompt would be clearer.
- The master strip's EQ and volume (`MIX.master`) are global, outside the song and outside undo. Undoing all 19 steps of the mixer session left Master Low at +15, and it carries into every new song.
- Charlotte de Witte "add a melody" → Melody on **Acid Bass** (the artist's lead sound). It sounds right for techno, but the label reads like a second bassline.
- "liquid drum and bass like Netsky" only sets the vibe (no drums), because "drum and bass" becomes "dnb" and no part word is left. That's defensible as "vibe first", but surprising.
- Basic mode doesn't answer simple questions ("what key is this in?", "what tempo are we at?", "why is it so quiet?"). It doesn't handle typos ("add a basline", "ad some cords", "anothr one", "make it fastr", "add a melodie") or Hinglish ("aur ek try karo", "ek aur", "isko slow karo"). The fallback always suggests "add a trap beat at 140". preview-ai-6 already handles "bass ki awaaz kam karo" and "drums ko thoda tez karo" as level words. See idea 3.
- Known and skipped: the editor's arrow and Delete keys did nothing after typing to Keys (UX-7). Loop recording makes one undo step per note (board follow-ups).

## Ideas (max 3; not in HQ requests)
1. **A master meter with peak, LUFS and a clip light** on the Master strip (short-term LUFS, peak or true peak, red when over 0). Why: today a mix can go +0.2 dBFS and you can't see it (bug 8). Producers check this all the time, and the brief asks "around a sensible LUFS". Our mixes sit at -7 to -8 LUFS, which is loud.
2. **Audition songs from the Open song… list** (▶ plays 4 bars of each saved song without opening it). Why: with several sketches ("Techno One", "Lofi Two", "DnB Three") you pick by ear, not by name. Opening each one costs a save, a load and a reset of undo.
3. **Basic mode: answer simple questions and catch near-misses.** Questions like "what key / tempo is this?" can be answered from the project. Typos can get "did you mean 'add a bassline'?" with a one-tap chip, instead of the trap-beat fallback. Why: Basic mode is what people get whenever the AI fails, and typed requests have typos. 7 of my 34 natural phrasings got "I couldn't turn that into a change".

## What I checked (with numbers)

**1. Genres, typed to Keys (Basic mode, a new song each), replies in 0.6-1.0 s**

| Request | Style | BPM | Kit | Swing | Groove |
|---|---|---|---|---|---|
| drums like Charlotte de Witte | techno | 134 | Deep Techno Kit | 0 | four-floor, 16th hats, ride, energy 5 |
| hard techno beat at 138 bpm | techno | 138 | Deep Techno | 0 | energy 4 |
| lofi hip hop beat | lofi | 78 | Hip-hop Kit | 60% | boom-bap kick (3/bar), shaker |
| hip hop beat at 88 bpm like J Dilla | boombap | 88 | Hip-hop Kit | 61% | ghost notes |
| afro house beat | **house** | 124 | 909 | 0 | clap (bug 3) |
| drums like Black Coffee | afro | 120 | Bongos & Percussion | 0 | rim, shaker, congas (reply says Keinemusik, bug 7) |
| drum and bass beat / jungle beat | dnb | 174 | Stark Kit | 0 | two-step kick 2.5-3/bar, ride |
| dnb at 172 bpm | dnb | 172 | Stark | 0 | |
| amapiano beat | amapiano | 113 | Bongos | 55% | |
| uk garage beat | ukg | 132 | Studio Kit | 59% | broken kick |

- Tempo, swing and kit fit the words everywhere except afro house.
- Charlotte de Witte "another one" ×2: still 134 BPM, Deep Techno Kit, vibe kept, 2 tracks.
- Loops with drums + bass:

| Loop | Integrated | Peak | Clipped samples | Silence |
|---|---|---|---|---|
| Techno | -7.4 LUFS | -0.55 dBFS | 0 | none |
| DnB | -8.0 LUFS | -0.59 dBFS | 0 | none |
| Afro (house) | -6.9 LUFS | -0.55 dBFS | 0 | none |
| Lo-fi | -8.8 LUFS | -0.46 dBFS | 0 | none |

**2. Mixer and per-track FX (Charlotte de Witte drums, acid bass, super-saw chords, acid melody)**
- Base mix: -7.6 LUFS, peak -0.48 dBFS, 0 clipped. Live analyser peak -0.54 dBFS.
- Clicking the right end of each track fader sets it to 100. Big changes: see bug 8.
- Solo bass + chords (S buttons): only those 2 are audible, and the strip gains are drums 0, bass 0.93, chords 1.20, melody 0. Then muting the bass leaves only Chords: render -12.1 LUFS. Clearing everything returns all 4. PASS.
- **Sidechain:** bass level at the kick vs the off-beat is +3.2 dB with duck 0 and -2.8 dB with duck 1 (a 6 dB dip at the measuring window). PASS.
- **EQ:** Low -15 on the bass cuts energy below ~120 Hz by 3.4 dB. Low +15 adds only +0.6 dB, because the compressor and drive come after the EQ (known: SE-1 "EQ before the compressor").
- Keys, on main: "make the bass quieter" → 88, "mute/unmute/solo the drums/bass" work. "turn everything down" and "the mix is too loud" aren't understood on main but work on preview-ai-6 (-5 dB on all). "unsolo": bug 4.
- Undo ×19 walked the whole mixer session back to the empty song. (Master EQ isn't in undo; see rough edges.)

**3. Songs manager (persistent profile, Chrome restarted)**
- Three songs: "Techno One" (134, 2 tracks), "Lofi Two" (78, 2 tracks), "DnB Three" (174, autosave only, never pressed Save). All listed correctly.
- Renaming in the title box shows up in the list within 1.5 s.
- Delete needs two clicks ("Confirm delete"). Deleting "Techno One" removed only it.
- Reopening "Lofi Two" was identical (Drums 84 + Grand Piano 16 notes, 78 BPM).
- After the restart the list and the IndexedDB contents matched.
- Save a copy: bug 1. Deleting the current song: rough edges.

**4. Fake MIDI keyboard while the beat runs**
- The fake input "QA Keys 49" is detected. A chord on the keys while the (muted) beat plays raises the analyser from -32.1 to -13.8 dB, so you hear what you play.
- Quantize Off. Rec while playing → OVERDUB. 16 eighth notes played ±25 ms → a "Grand Piano" part with 16 notes. Timing error vs the 1/8 grid: -23…+40 ms (my jitter plus timer jitter).
- Editor Quantize puts all 16 on the 1/16 grid (0 off-grid), lengths 0.5.
- Long chain of 24 actions: editor keys, fader, EQ, reverb, Keys "add a bassline / another one / more swing / faster", mute. 23 Ctrl+Z presses landed exactly on the starting state. Redo by button walked forward. The one break in step-by-step matching is the tempo bug (2).

**5. Natural typing (34 phrasings, Basic mode, run on main and on preview-ai-6)**
- Works: "can you add some chords?", "could you make the drums harder?", "bhai ek techno beat bana do" (techno, 130 BPM), "chords daal do", "add a bassline and make it faster" (tempo +5 and bass), "add chords and a melody" (both).
- Bugs 3-6 and the rough edges above. Log: /tmp/qa/2026-11-16/session.log (lines `[main]` and `[ai-6]`).

**6. 390 px (touch emulation)**
- scrollWidth 390 = innerWidth with the bass FX panel open (panel 51-342 px, nothing outside the screen), the Live Mixer (41-349 px) and the Open song… list (right edge 351 px). PASS. The FX panel is clear and readable (p6-390-fx.png).

**Console:** 0 page errors. Only the blocked Google Fonts request (sandbox) and the ScriptProcessorNode warning showed.

## Could not test
Live AI (Workers AI/Claude), real speech recognition and spoken replies, Spotify, real MIDI hardware (stubbed), real phones.

## Files
- Screenshots: /tmp/qa/2026-11-16/shots/
  - p1-*.png (genres)
  - p2-01-base, p2-02-big (full page), p2-03-mutesolo, p2-04-mixer
  - p3-01-list3, p3-02-after-delete, p3-03-del-current, p3-04-list-restart, p3b-copy-undo (bug 1)
  - p4-01-recorded, p4-02-quantized, p4b-01-chain-end
  - p6-390-fx, p6-390-mixer, p6-390-songs
- Renders: /tmp/qa/2026-11-16/dl/*.wav. Real zip export: /tmp/qa/2026-11-16/dl/QA Loud 134bpm 4bars.zip
- Scripts: /tmp/qa/2026-11-16/js/ (lib.mjs, p1-genres, p2-mixer, p3-songs, p4-midi, p4b-redo, p4c-diff, p5-words, p6-misc, p6b-phone)
- Log: /tmp/qa/2026-11-16/session.log
- I built preview-ai-6 and preview-ai-1 in temporary worktrees under /tmp/qa/2026-11-16 to check phrasings, then removed them. Nothing was committed or pushed, and the worktree is clean.
