# RES-2 · Song sections and arrangement view (for AI-1 and UX-1)
Music researcher · 13 Nov 2026

## Bottom line
1. Build the song out of **named sections** (Intro, Build, Drop, Break, Outro), each with a length in bars and a list of which parts play. Each track's loop is a linked pattern. That's Logic's Arrangement track plus FL Studio's linked patterns, drawn like Ableton's arrangement lanes. Voice edits then land on sections instead of clip coordinates.
2. Give the assistant coarse, section-level actions and send it the current arrangement each time. Studies of chat-driven DAWs show open models get low-level edits wrong a lot, and we run Llama 3.3.
3. Default melodic house/techno template at 124 bpm: 16-bar phrases, kick and bass out in the break, a 4-8 bar riser or filter build into each drop. "Short" is 96 bars (about 3:06), "Club" is 192 bars (about 6:12).

## What we found

**1. How DAWs represent song structure**
- **Ableton Arrangement view:** tracks are lanes of clips. On top sit locators (named jump points), the loop brace and time selection. Time commands act across every track, Cmd+E splits, Cmd+J consolidates, and Follow scrolls with the playhead but pauses while you edit. Producers often jam scenes in Session view, then record them into Arrangement.
- **FL Studio:** a pattern (notes plus automation) gets placed in the Playlist as many pattern clips. Edit the pattern once and every copy changes. A PAT/SONG switch picks between looping one pattern and playing the whole song.
- **Logic Arrangement track:** this is the closest fit for voice. Section markers default to 8 bars, you resize them by the right edge, and each new one snaps after the previous. Dragging a marker moves all the regions under it and closes the gap. Option-drag duplicates a section. Logic's Session Players change their pattern for verse versus chorus, which makes the section type an input to the generator.
- **Bitwig:** launchable cue markers, a loop region, and a clip launcher next to the arranger, much like Ableton.
- **Smallest model that still feels like Ableton:** (a) an ordered list of sections {name, bars, colour}; (b) per track × section: on/off, which pattern variation, optional filter/level; (c) a loop brace over any bar range; (d) a scrolling playhead and a bar ruler. Free-floating clips, splits and consolidate can come in a later round.

**2. Interactions producers expect**
- Desktop: drag to move (snaps to the bar), drag the right edge to lengthen (content loops), Alt-drag to copy, Cmd+D duplicate, `0` mute, Cmd+L loop selection, +/- or Cmd+scroll zoom, W fit song, click the ruler to play from there, Space play/stop.
- Tablet: 44 pt handles, pinch zoom, long-press menu, tap a section to loop it (Logic for iPad has "set cycle to marker").
- Phone: show a song map strip (coloured section blocks) and leave out clip editing.

**3. AI tools that arrange by prompt**
- **Suno (v5.5 and Studio 2.0, 2026):** you set structure with lyric tags like [Intro] and [Chorus]. Guides admit tags are "wishes, not overrides": a [Chorus] can still sound like a verse. What works: one job per section, then targeted edits instead of regenerating. Studio 2.0 adds a multitrack timeline, stems and MIDI, but structure is still generated, not explicit.
- **Logic Session Players (Logic 11, 2024):** parts follow the Arrangement markers and the Chord track. This is the best existing example of "structure drives the parts".
- **LANDR Composer (2024):** "scenes", each with its own length and key, generating chords, bass, melody and arp. It's a section list with no timeline.
- **Mozart AI (2025)** offers a browser DAW with chat arranging (coverage is promotional). **AbletonMCP** (open source) drives Session clips and scenes, with Arrangement view still listed as future work.
- **DAWZY paper (Dec 2025, REAPER):** chat and voice turned into reversible edits. Users liked it (enjoyment 4.5/5) but rated *control* lowest (3.8). Open models made valid edits in only 25-50% of trials. What helped: fresh project state on every request, converting units for the model, plain-language summaries of each edit, and atomic undo.
- **The pattern:** users want to say what a section is *for* and then change one thing at a time. They get frustrated when a label doesn't change the sound, and when one edit regenerates everything.

**4. Melodic house/techno arrangement conventions**
- Tempo is 122-125 bpm (Beatportal 2025). Phrases run 8/16/32 bars, and something gets added or removed at every 8- or 16-bar boundary (Attack, EDMProd).
- DJ intros are usually 16 or 32 bars, mostly drums. Outros thin back to drums (Mixgraph). In a 63-track sample, extended mixes had a median length of 4:31. The 2015 Beatport Top 100 averaged 5:53, but that data is old. Afterlife-style extended mixes often run 6-8 minutes; that's our observation, not measured.
- Beatportal's map: intro 16 (kick, hats, atmos), build 16 (+bass, pads, FX), drop 16 (all), breakdown 16 (pads, FX), climax 16 (all plus automation).
- EDMProd's reading of a Böhmer track at 124 bpm is a slow layering: a new element every 16 bars, then a long 32-bar delay-heavy breakdown with a new melody, a 16-bar break with the bass back in, and a return to the drop. Böhmer gets tension from automation (delay feedback, filters) more than snare rolls. That's an opinion drawn from interviews and breakdowns.
- Afterlife-style (Massano breakdown): filtered kick and bass open slowly in the intro, the lead is teased filtered before the drop, there's a short silence before the drop, and the kit stays lean.
- Common moves into a drop: high-pass filter on the drums over the last 4-8 bars, a noise riser or reverse cymbal, a clap/snare roll that doubles in speed (more techno than Böhmer), a 1-bar kick drop or silence, then a crash or impact on the downbeat.

**Default template the assistant can use (124 bpm)**

| Section | Short | Club | Plays | Transition at end |
|---|---|---|---|---|
| Intro | 16 | 32 | kick, hats, atmos pad (filtered). Club: bass joins at bar 17 | crash into next |
| Build / Groove | 16 | 32 | + bass, perc, chords; lead teased with filter | 4-bar filter-up |
| Drop 1 | 16 | 32 | everything, lead open | fill on last bar |
| Break | 16 | 32 | kick and bass out; pads, lead or new melody, big reverb/delay | last 8: riser + snare roll, 1-bar gap |
| Drop 2 / Climax | 16 | 32 | everything + counter-melody, open hats or ride | fill |
| Outro | 16 | 32 | lead out, then chords; bass out halfway; drums to the end | none |
| **Total** | **96 bars ≈ 3:06** | **192 bars ≈ 6:12** | | |

Rule of thumb: change something every 8 bars, and never let a part play unchanged for more than 32 bars.

**5. What would delight a producer, and the risks**
- Delight: "make it a full track" gives a playable 3- or 6-minute song; a coloured song map with an energy line; "loop the break" just works; each voice edit flashes with an Undo chip; transitions appear by themselves; linked patterns (fix the drums once, every drop updates); MP3 export of the whole song.
- Risks: loop vs song confusion (use a Loop/Song switch like FL's PAT/SONG; old songs become one section); phone screens; performance (190+ bars to draw, a 6-minute render is about 127 MB of float audio, so chunk it); ambiguous edits ("the break" when there are two); Llama 3.3 getting fine edits wrong.

## For the devs

### For assistant-dev (AI-1)
1. Add a few coarse actions in the Worker prompt, `actions.js` and `maker.js` (names are suggestions): `arrange` (template: short / club / custom section list), `section` (add, remove, length, move, duplicate, with name and bars), `parts` (section plus `in[]` / `out[]` roles, e.g. "drop the drums in the outro"), `transition` (riser, snareroll, filter, kickdrop, none) and `loop_section`. Never ask the model for clip coordinates.
2. Ground every request: put a one-line arrangement summary in the context (`Intro 16 [drums,pad] | Build 16 [+bass,chords] | Drop 16 [all] ...`). Resolve names by order ("second drop" = the 2nd Drop; plain "the break" = the most recent break, or ask).
3. Use fixed relative defaults: "longer" or "shorter" means ±8 bars, snapped to 4. "A second drop" means duplicating Drop 1 after the next break, adding a break first if none exists. "Build up and drop" means a Build with an automatic transition.
4. Keep "N-bar intro" apart from today's `bars` action (the 1-16 loop length). Update the prompt rule for "full track like X" so it ends with `arrange`.
5. The reply names what changed in musical words ("Break is now 32 bars, kick and bass drop out"), and each voice request is one undo step.
6. In `maker.js`, cover these offline phrases: "N-bar intro/outro", "make the X longer/shorter", "drop/remove/bring back X in the Y", "add a second drop", "full arrangement".
7. For the ARTISTS table, add an `arrange` hint per artist: Böhmer means long layering and a 32-bar break with automation instead of rolls. Bodzin and Afterlife mean filtered intros, a lead teased before the drop, and a short silence before the drop.

### For studio-ux-dev (UX-1)
1. Data model: ordered sections {name, bars, colour}. Per track × section: on/off plus pattern variation. Patterns are linked, with "Make unique" for variations. Today's loop becomes one section, so old songs open fine.
2. Screen: a section strip on top (drag edges to resize, drag to move with content, Alt-drag or Cmd+D to duplicate, double-click to loop). Below it, track lanes where each cell is a clip block (click toggles, `0` mutes). Then a bar ruler with a loop brace, a playhead that follows (pauses while the user scrolls), and an overview or zoom (+/-, Cmd+scroll, W fit, pinch).
3. A Loop/Song switch in the transport. Song plays sections in order, and Loop keeps today's behaviour.
4. Tablet: 44 pt handles and a long-press menu (Duplicate, Longer, Shorter, Mute, Delete, Loop this). Phone: song map only.
5. Performance: draw only the visible bars, schedule a couple of bars ahead, and render MP3 export in chunks.
6. Flash the cells the assistant changed, and show an Undo chip.
7. Note for sound-engine-dev (via the lead): drum/bass generators should take a section's role and energy, so a Build gets rising energy and a fill, and a Drop gets a crash. Transitions (riser, kick drop, filter sweep) need sounds.

## Sources
- Ableton Live 12 manual, Arrangement View: https://www.ableton.com/de/live-manual/12/arrangement-view/
- MusicRadar, Session to Arrangement in Ableton (2019): https://musicradar.com/how-to/how-to-arrange-tracks-in-ableton-live-from-session-to-arrangement-view
- FL Studio manual, Playlist patterns: https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/playlist_patterns.htm
- MusicRadar, Logic Arrangement track (2019): https://www.musicradar.com/how-to/how-to-use-logic-pro-xs-arrangement-track-to-try-out-ideas
- Sound On Sound, Logic Pro Session Players (2024): https://www.soundonsound.com/techniques/logic-pro-session-players
- Apple, Logic Pro for iPad markers: https://support.apple.com/guide/logicpro-ipad/lpipcf2eb4a7/ipados
- Bitwig user guide, Playing back the Arranger: https://www.bitwig.com/userguide/latest/playing_back_the_arranger/
- Jack Righteous, Why Suno v5.5 meta tags still aren't working (2026): https://jackrighteous.com/blogs/guides-using-suno-ai-music-creation/why-your-suno-v5-5-meta-tags-still-arent-working
- Jack Righteous, Suno Studio 2.0 guide (2026): https://jackrighteous.com/blogs/guides-using-suno-ai-music-creation/suno-studio-2-0-guide-browser-daw
- Gearnews, LANDR Composer (2024): https://gearnews.com/landr-composer-studio
- AI Musicpreneur, Mozart AI (2025): https://the-ai-musicpreneur.beehiiv.com/p/talk-to-your-daw-like-it-s-human
- Ableton MCP Extended (GitHub): https://github.com/uisato/ableton-mcp-extended
- DAWZY paper, arXiv 2512.03289 (2025): https://arxiv.org/html/2512.03289v1
- Beatportal, Melodic house and techno step by step (2025): https://www.beatportal.com/articles/899368-step-by-step-guide-to-creating-a-melodic-house-techno-track-anyma-miss-monique-artbat-stephan-bodzin
- EDMProd, How to make melodic house: https://www.edmprod.com/how-to-make-melodic-house/
- The Producer School, Melodic techno like Massano (2024): https://theproducerschool.com/blogs/featured-blogs/how-to-make-melodic-techno-like-massano-afterlife
- We Rave You, Ben Böhmer breaks down Beyond Beliefs (2021): https://weraveyou.com/tech/ben-bohmer-breaks-down-how-he-made-beyond-beliefs/
- Attack, 4 ways to break out of the loop (2020): https://www.attackmagazine.com/technique/tutorials/4-ways-to-break-out-of-the-loop/
- EDMProd, Avoid the 8-bar loop trap: https://www.edmprod.com/how-to-avoid-the-8-bar-loop-trap/
- EDMProd, Beatport Top 100 analysis (2015, old): https://www.edmprod.com/beatport-analysis/
- Mixgraph, Track structure and intros: https://www.mixgraph.io/glossary/intro
