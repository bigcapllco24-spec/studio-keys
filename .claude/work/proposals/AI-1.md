# AI-1 · Song sections by voice
assistant-dev · Design mode · 13 Nov 2026 · Size L

## 1. Why
Today Keys can only build one short loop. With this change you talk the loop into a whole song: "8-bar intro, then build up and drop" gives you real sections that play in order, and you shape them like a producer would ("make the break longer", "drop the drums in the outro", "add a second drop", "make it a full club track like Bodzin"). Every change is one Undo, and Keys tells you in musical words what moved.

## 2. Flow (what you say, what you hear and see)
The song starts as today's 4-bar Bodzin-style loop (drums, rolling bass, dark pad, pluck melody).

1. **"Keys, make an 8-bar intro, then build up and drop."**
   Keys: "Your loop is now a song: an 8-bar intro with just drums and pad, an 8-bar build with a snare roll, then a 16-bar drop with everything."
   The studio switches to Song, plays from bar 1, and the reply bubble shows a small song map (Intro 8 · Build 8 · Drop 16) with an Undo button.
2. **"Make it a full club track like Bodzin."**
   Keys: "Here's a Bodzin-style club track, about six minutes: a long drums-only intro, a build with a short roll and a gap before the drop, two drops and a long break."
   Sections: Intro 32 · Build 32 · Drop 32 · Break 32 · Drop 2 32 · Outro 32. If a part were missing (say no bass yet), Keys would add it first.
3. **"Make the break longer."**
   Keys: "The break is 8 bars longer, 40 in all." (No number said = 8 more bars.)
4. **"Take the kick out of the intro and bring the bass in."**
   Keys: "The intro now runs hats, pad and bass, no kick." Only the kick goes; hats and claps stay, because the beat is one drums track.
5. **"Drop the drums in the outro."**
   Keys: "Drums are out of the outro; it fades on pad and bass."
6. **"Add a second drop."** (on a song that only had one drop)
   Keys: "Added a break and a second drop before the outro, copied from the first drop."
7. **"Make the second drop different."**
   Keys: "Drop 2 has its own new melody; the first drop keeps the old one."
8. **"Yaar, drop se pehle thoda silence daal do."** (put a little silence before the drop)
   Keys: "Added a one-bar gap at the end of the break, so the drop hits harder."
9. **"Loop the break."** Keys: "Looping the break." The break plays round and round so you can work on it. **"Play the whole song."** Back to the start.
10. **"Undo that."** Keys: "Undid the last change." The whole previous request is undone in one step (all its sections and parts).

Also understood: "play from the second drop", "make the drop 16 bars", "remove the second break", "move the break after the first drop", "make the whole song about 4 minutes", "add a riser before the drop". "Make the loop 8 bars" still changes the loop length, as today.

## 3. What changes

### 3.1 New assistant actions (Worker prompt + `ACT` in `actions.js` + phrases in `maker.js`, same field names)
| Action | Fields | What it does |
|---|---|---|
| `arrange` | `template`: short / club / custom; `sections`: [{name, bars}] for custom; `ref` (artist); `minutes` | Lays out the whole song from the parts it has: section list from a template (by style and artist), which parts play in each, and the transitions. With `minutes` on an existing arrangement, stretches or shortens all sections (snapped to 8 bars). Turns Song on. |
| `section` | `do`: add / remove / length / move / duplicate / rename; `section`; `name`; `bars` or `change` (+8 / -8); `after` / `before` | Edits one section. "Add a Drop" copies the first drop and puts a break before it if there isn't one. |
| `parts` | `section`; `in[]`, `out[]`, `only[]`, `vary[]` | Which parts play in a section. Parts: drums, kick, hats, clap, perc, bass, chords, melody, voice, all, or a track name. `vary` gives that section its own new version of a part ("Make unique" plus a fresh generation). |
| `transition` | `section`; `to`: riser / snareroll / filter / kickdrop / fill / crash / none; `bars` | What happens at the end of a section into the next. Set on the section before the change. |
| `loop_section` | `section` (or "song") | Loops one section; "song" plays the whole song again. |
| `transport` (extended) | new `from` field | "Play from the second drop". |

**Executor rules (in `actions.js`, so the AI only has to name intent):**
- **Finding a section** (`findSection`): number from the arrangement ("3"), numbered name ("drop 2", "second drop", "first break"), plain name ("the break"), "last", "this" (the one playing). Plain "the break" when there are two: the one playing, else the one Keys touched last, else the first; the chip always says which ("Break 2: 16 → 24 bars").
- Lengths snap to 4 bars and stay 4-64. "Longer/shorter" with no number is ±8. A kick-drop gap is clamped to 1 bar; a snare roll to 2-8 bars.
- Drum pieces (kick, hats, clap, perc) are switched inside the one drums track (see 3.4), so "no kick in the intro" keeps the rest of the beat.
- Section names auto-number: Drop, Drop 2, Drop 3.
- Guards found in the Llama test (3.6): `arrange` with `minutes` on an existing arrangement ignores `template`; a `section` named "Silence"/"Gap" becomes a kick-drop transition; with a known artist `ref`, an `instrument` field is ignored unless the user's own words name that instrument (handleRequest passes the text to `BATCH`).
- Existing actions in Song mode: `vary`, `add_drums` and the other generators change the track's main pattern, so every section using it follows (linked); sections with their own version keep it. `bars` still means loop (pattern) length. `export` in Song mode downloads the whole song. `sing` records over a loop as today: Keys switches to Loop for the take, then back to Song.
- One request = one undo step (runActions already sets an undo boundary; arrangement edits are synchronous, so they land in one snapshot).

### 3.2 Arrangement context sent to the AI
`projectState()` gets an `arrangement` line, placed first so the Worker's 7,000-character cut never drops it:
`1 Intro 16 [drums-kick, chords] | 2 Build 16 [drums, bass, chords] >snareroll 4 | 3 Drop 16 [all] | 4 Break 16 [chords, melody] >riser 8 | 5 Drop 2 16 [all] | 6 Outro 16 [drums, chords] · 96 bars, 3:06 · Song mode · playing: Break`
or `none (one 4-bar loop)`. This is the research's "fresh state on every request" fix for open models.

### 3.3 Templates and artist hints
**Section templates by style family** (16-bar "short"; 32-bar "club"):
| Family | Sections | Parts |
|---|---|---|
| Electronic (house, techno, melodic, progressive, afro, amapiano, organic) | Intro, Build, Drop, Break, Drop 2, Outro (96 / 192 bars, 3:06 / 6:12 at 124) | Intro: drums without clap, pad. Build: + bass, chords; snare roll 4. Drop: all. Break: pad, melody, voice (kick and bass out); roll 8 with a 1-beat gap. Drop 2: all. Outro: drums, pad. |
| Pop / band / Bollywood / Punjabi | Intro 8, Verse 16, Chorus 16, Verse 2, Chorus 2, Bridge 8, Chorus 3, Outro 8 | Verses lighter (no melody), choruses full, bridge pads and voice. |
| Hip-hop / trap / drill / lo-fi | Intro 8, Hook 8, Verse 16, Hook, Verse 2, Hook, Outro 8 | Hooks full; verses drums and bass. |
| DnB / liquid / dubstep | Intro 32, Build 16, Drop 32, Break 32, Build 2 16, Drop 2 32, Outro 32 | As electronic. |

**`ARTISTS` arrangement hints** (a new last field `arr` per artist; one line each):
- **Ben Böhmer**: slow layering (a new part every 16 bars across intro and build), break twice as long, no snare rolls (fill plus a gap; a filter sweep once the sound engine has one).
- **Stephan Bodzin**: drums-only intro, bass enters in the build, big arp lead only in drops, short roll then a 1-bar gap before each drop.
- **Afterlife (Massano, Argy, Innellea, Kevin de Vries, Adriatique) / Anyma / Tale Of Us**: lean intro, lead teased in the break, long break with a riser, short silence before the drop.
- **Lane 8, Yotto, Rüfüs Du Sol, Monolink**: long soft intro, break on chords, fills instead of rolls.
- **Fisher, Chris Lake, John Summit, Dom Dolla (tech house)**: short break (8) with hats and perc kept, 4-bar roll, bass-heavy drop.
- **Charlotte de Witte, Amelie Lens, Adam Beyer (techno)**: 32-bar phrases, break keeps hats, riser.
- Pop, hip-hop, DnB, Bollywood and Punjabi artists use their family template.
Hints shape the sections; length (short or club) is decision D1.

### 3.4 What I need from UX-1's shared layout (flagged)
The shared draft works as is. I ask for **three optional fields**; UX-1 can ignore them and the assistant falls back:
1. `section.kind`: intro / build / drop / break / verse / chorus / bridge / hook / outro / other. Lets you rename a section "Climax" and Keys still knows it's a drop. Fallback: guess from the name.
2. `section.end = {to, bars}`: the transition at the end of the section. Fallback: none.
3. `parts[trackId].without = ["kick", "clap", "hats", "perc"]`: drum pieces muted in that section while the pattern stays linked. Fallback: fork a drum version without those notes ("Make unique"), which loses the link.

And these **helpers from UX-1**, so voice and mouse edit the song the same way (names to agree at build): `ensureSections()` (old song → one section), `setSongMode(on)`, `songPlay({from})`, `loopSection(i | null)`, `forkPattern(track, sectionId)`, `songBars()`, `flashSections(ids)` (flash the changed sections in the arrangement view). The Song scheduler and the export play `section.end` through a pure function I provide in `actions.js`: `transitionEvents(section, drumsTrack)` returns drum notes for the last bars (snare roll, kick gap, fill, crash) from the track's own kit. Risers and filter sweeps need sound-engine work (D3).

### 3.5 What works if UX-1 isn't built yet
- Without UX-1's **model and Song playback**, nothing can be heard as a song: the arrangement needs a scheduler that plays sections in order. That part is the minimum.
- **The full arrangement screen is not needed**: the assistant can arrange, edit, play, loop and export the song by voice with only UX-1's first slice (model, old-song migration, Loop/Song switch, Song playback, export). The mini song map in the reply bubble (mockups below) gives voice users enough to see what changed.
- Plan: I build the prompt, `maker.js` phrases, section finder, templates and artist hints first (they only need the agreed data shape), then wire them onto `preview-ux-1`'s first slice.

### 3.6 Worker prompt (tested, see 4)
A new "SONG ARRANGEMENT" block (about 2,900 characters, no backticks or `${`) listing the five actions and these rules: "bars" is only the loop length; an "N-bar intro" is a section; with no arrangement, sections asked for become `arrange` custom; `arrange` already picks parts and transitions (only add `parts`/`transition` for what the user asked); a silence or gap before a drop is a `kickdrop` transition; never use note positions for structure; replies name the change in musical words. The "full track like X" rule becomes: vibe, the missing parts, `arrange` (with ref), play. One example is added ("make the break longer" → `change: 8`). The prompt grows from about 9,300 to 13,000 characters.

### 3.7 Small visible change (assistant panel)
The reply bubble for an arrangement change shows a mini song map (section blocks sized by bars, the changed ones outlined) and an Undo button, using theme variables only. Files: `assistant.js` (bubble) and about 8 lines of CSS in `src/head.html` (needs the lead's OK, listed in my report). If UX-1's arrangement view already shows an Undo chip, I drop the bubble's Undo.

Mockups (real studio, Velvet theme, rendered headless; not committed):
- `/tmp/proposals/AI-1/assistant-desktop.png` (copy: `.claude/work/mockups/AI-1-1.png`): three voice edits with chips and the mini song map.
- `/tmp/proposals/AI-1/assistant-phone.png` (copy: `.claude/work/mockups/AI-1-2.png`): the same at phone width; section labels shorten (on phone I'll use I · B · D · Br · D2 · O).

## 4. Risks and how I'll test
**Llama reliability (tested now, not guessed).** I ran the proposed prompt on Workers AI (Llama 3.3 70B fp8-fast, same settings as the Worker) with a realistic song state:
- Round 1 (12 requests): 9 right. Misses: "make the break longer" gave bars 32 instead of +8; Hinglish "silence before the drop" invented a section called Silence; "8-bar intro, build and drop" overrode the template's parts. With two breaks, "the break" didn't ask which.
- Round 2, after tightening the rules and adding one example (8 requests): 8 of 8 usable. "Break longer" → `change: 8`; Hinglish silence → `transition kickdrop` on the break; "second drop different" → `parts vary`; "riser before the first drop" → `transition` on section 2; "whole song about 4 minutes" → `arrange minutes 4`; "full track like Ben Böhmer" → vibe, drums, bass, chords, melody, arrange, play. Leftovers handled in the executor: kick-drop asked as 4 bars (clamped to 1), "32 bars" sent as `change 16` (same result), Böhmer chose club length unasked (D1), instrument set alongside ref (guard).
- Regressions: "make the loop 8 bars" still gave `bars 8`.

**Timing.** Sequential replies took 1.9-7.0 s (mean 4.1 s); "full track" 6.1 s. One run with 12 requests in parallel reached 9.5 s for "full club track", over the 8-second bar. The prompt grows 40%; I'll keep it tight and re-measure at build.

**Ambiguity.** Two breaks: the executor picks the playing one or the last touched and the chip names it; Keys won't stop to ask unless nothing fits.

**AI reply vs what really happened.** The AI writes its sentence before the executor runs. When the executor changes a number (clamp, snap), Keys adds the executor's own line ("Break 2 is now 24 bars").

**Dependency on UX-1.** If UX-1 drops `without`, kick-out works by forking the drum pattern (unlinked). If UX-1 slips, AI-1 can't ship (see 3.5).

**Tests at build:**
- Llama prompt test: at least 12 requests (all of section 2, Hinglish, "another one" and "sing the bassline" regressions, "make the loop 8 bars"), reported request by request with actions and timing.
- Smoke-test lines for `tests/smoke.mjs` (offline parser): "make an 8-bar intro, then build up and drop" → Intro 8, Build, Drop, Song on; "make the break longer" → +8; "drop the drums in the outro" → outro drums off; "add a second drop" → Break then Drop 2 before the Outro; `undo()` → previous arrangement; an old song with no sections opens as one section.
- Offline render (`renderAudio` per section): peak and RMS per section, low-end energy lower in a no-kick break, no clipping on the drop, gap measurably silent.
- Headless: one request with arrange plus four generators is exactly one undo step.

## 5. Build steps and effort
1. Worker prompt block and the new "full track" rule; Llama test (3 h).
2. `actions.js`: `findSection`, templates, `arrange`, `section`, `parts`, `transition`, `loop_section`, `transport from`, guards, `transitionEvents` (9 h).
3. `maker.js` offline phrases, placed before today's "N bars" rule so "8-bar intro" isn't read as loop length: "N-bar intro/outro/break/drop", "X then build up and drop", "full track / arrange it / club version / extended", "make the X longer/shorter", "drop/remove/bring back/only Y in the X", "add a (second) drop / a break", "remove/duplicate/move the X", "riser/roll/silence/gap before the X", "loop the X", "play from the X", "play the whole song", Hinglish "lamba / chhota / hata do / daal do / ke baad / se pehle" (3 h).
4. `ARTISTS` `arr` hints for about 20 artists (2 h).
5. `assistant.js`: `arrangement` context line, executor-truth line in the reply, mini song map bubble (3 h).
6. Wire onto UX-1's first slice, headless tests, smoke lines, render numbers (5 h).

**Effort: L, about 25 hours** (most after UX-1's first slice lands). If it helps scheduling, slice A (steps 1-3, 5, 6 with short template only) covers the done-when in about 18 h; slice B (artist hints, club and `minutes`, `vary` per section) adds about 7 h.

## 6. Decisions for the owner
**D1. How long should "make it a full track" be?**
- A. About 3 minutes (16-bar sections) unless you say "club", "extended" or "DJ" (then about 6 minutes). **Recommended**: quick to listen through and tweak; "make it longer" stretches it.
- B. Always about 6 minutes, club length.
- C. The artist decides (Bodzin, Böhmer, Afterlife about 6 minutes; pop and hip-hop radio length).

**D2. If the song is missing parts (say only drums), what should "arrange it" do?**
- A. Arrange only what's there and suggest adding bass or chords.
- B. Always add the missing parts first.
- C. Add missing parts only when you say "full track"; otherwise arrange what's there. **Recommended**: keeps your parts yours unless you ask for a whole track.

**D3. Risers and filter sweeps need new sounds from the sound engine. Until then:**
- A. Ship now with drum transitions (snare roll, gap before the drop, fill, crash); a "riser" request uses a snare roll plus crash and Keys says so. Add real risers later. **Recommended**.
- B. Wait and ship together with the new riser and sweep sounds.

## 7. Research used, and questions
Used from RES-2 "For assistant-dev": all seven notes (the five coarse actions; arrangement line in every request; ±8 and "second drop" defaults; "N-bar intro" kept apart from `bars`; "full track like X" ends with `arrange`; replies in musical words with one undo per request; the listed offline phrases; per-artist hints). One change: the "short silence before the drop" is a 1-bar kick drop, clamped, because Llama asked for 4 bars.
Questions for the researcher (optional): (1) Real section maps (bars per section) for 2-3 well-known tracks each by Anyma, Lane 8 and Fisher, to tune the hints. (2) In melodic techno, should "make the break longer" add 8 bars or a full 16-bar phrase?

## Notes for the lead
- The brief asked for the proposal in `.claude/work/proposals/`, so `git status` shows these new untracked files (no code touched). The role file says `/tmp/proposals/AI-1/`; the mockups are there and copied to `.claude/work/mockups/`.
- The role file says "orange accent"; the standards say Velvet with no orange, so the mockups use the real Velvet theme.
- 3.4 lists what UX-1 should add or agree; please pass it to studio-ux-dev.


## Lead notes (settled before build, no choice needed from you)
- One song layout shared with UX-1 in a new `song.js`: one template table, one rule for "the break" when there are two (the one playing, else the last one touched, else the first), one summary line for the AI.
- Transitions (snare roll, fill, crash) live in the song code so playback and MP3 export use them too.
- Only one Undo: the chip in the song view (the reply bubble shows the mini song map without its own Undo).
- Keys' reply timing gets re-measured at build; the prompt gets trimmed if a full-track request is over 8 seconds.
