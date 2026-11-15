## Fix 2 (15 Nov, after the tester's re-check)
Files: `src/actions.js`, `src/assistant.js`, `index.html` (rebuilt). No change to `cloudflare/worker.js` or `src/maker.js`, so no Worker redeploy is needed beyond the AI-1 release itself and no new Llama run was needed. `bash .claude/tools/check.sh`: **CHECK OK, 56 of 56** (the tester's "AI's own snare roll keeps the gap" line passes: `{"to":"snareroll","bars":2,"gap":true}`).

### 1. The AI's extra snare roll no longer wipes the beat of silence (`ACT.transition`, `runActions`)
- A `transition` that arrives in the same request as `arrange` is ignored unless the user's words name a transition (roll, fill, silence, gap, pause, riser, sweep, crash, kick drop, transition, khamoshi, chup). The new layout already has its rolls and gaps.
- A snare roll (or riser) with no `bars` keeps the roll length that is there; with no `gap` field it keeps the beat of silence that is there (also after a kick drop), unless the user says "no gap / without the silence / gap hata do".
- A request that says "riser" but gets `snareroll` from the AI now also counts as a riser (the stand-in note shows unless the reply already says it's a roll).
- Real Llama outputs from the tester's run, through `handleRequest` (offline render, RMS dB, left channel):

| Request | Section end | Beat before | Gap beat | Gap 2nd half |
|---|---|---|---|---|
| "make an 8-bar intro, then build up and drop" (arrange + transition Build snareroll) | Build roll 2 + gap | -10.3 | **-21.6** (was -7.9) | -32.1 |
| "add a riser before the drop" (transition Break snareroll, then bars 4) | Break roll 4 + gap | -13.2 | **-22.7** | -29.6 |
| "break ke baad ek aur drop daal do" (section add + transition Break snareroll) | Break roll 2 + gap | -13.5 | **-23.1** | -30.4 |

- Asked-for transitions next to a new layout still apply: "a build with a 4 bar snare roll" → Build roll 4 + gap; "full track, no gap before the drop" → Build roll 2, no gap.

### 2. Section mute wording (`secSaid`)
Added "out of (the) X", "X se" (not "X se pehle/baad"), "X ke liye". With the AI sending `mix mute`: "take the bass out of the build" → Build bass out, track not muted, Drop bass still on; "outro se drums hata do" → Outro drums out; "intro ke liye bass band karo" → Intro bass out; "mute the drums" and "drop se pehle bass mute karo" still mute the whole track.

### 3. Reply tidy-ups
- "Added Break 2 (16 bars) and Drop 3 (16 bars) before Outro" (was "Break 2 16").
- Same-kind sections are renumbered in song order after every action in the request has run (so the AI's later actions still find "Drop 3" by the name it gave), and the reply uses the new names. "break ke baad ek aur drop daal do" → Break · Drop 2 · Drop 3 · Outro; offline "drop ke baad break daal do" → "Added Break (16 bars) before Break 2". Only sections that still have plain names (Drop, Drop 2 …) are renumbered; a section the user renamed is left alone.
- The next-step tip skips the move the user just asked for ("make the break longer" no longer gets the tip "make the break longer"; same for second drop, outro drums, roll, intro kick). The riser guard offers "a different second drop" instead of a snare roll when the user just asked for a roll.
- No-op requests (0 undo steps, only song edits): no "Done", no claimed changes. "intro mein bass mat bajao" when it's out → "It’s already like that, so nothing changed: Intro: bass out." plus a tip. Llama on "make the intro more exciting" → "It’s already like that, so nothing changed: Intro: drum fill into Build. Want a snare roll into the drop?" When the executor knows why (the 1-minute floor, every part at 8 bars), it says that instead.
- "Make it longer / shorter" (`songScaleTo`): every section is an 8, 16 or 32-bar phrase (64 only above 48 ideal bars). It tries the phrase just under and just over each section's share and picks the layout closest to the time asked ("shorter" at or under it, "longer" at or over), drops matched and longest, builds 16 or less. Never under about a minute unless the user asks for seconds or a reel.

| From | Request | Result |
|---|---|---|
| 96 bars, 3:06 | longer | Intro 16 · Build 16 · Drop 32 · Break 16 · Drop 2 32 · Outro 16, 128 bars 4:08 |
| 128 bars | shorter | Intro 8 · Build 16 · Drop 16 · Break 16 · Drop 2 16 · Outro 16, 88 bars 2:50 |
| 96 bars | shorter | 8 · 8 · 16 · 8 · 16 · 8, 64 bars 2:04 |
| 64 bars | shorter | all 8, 48 bars 1:33, "Every part is already 8 bars, so it can’t get shorter without losing one. Say “remove the break”…" |
| 32 bars, 1:02 | shorter | unchanged, "It’s about a minute already, the shortest a full song goes here." (was 0:31 with a 4-bar build) |
| 192 bars club | shorter | Intro 16 · Build 16 · Drop 32 · Break 32 · Drop 2 32 · Outro 32, 160 bars 5:10 |

### Tested
- check.sh CHECK OK (56/56), no page errors.
- All 13 real Llama outputs from the re-check through `handleRequest`: 1 undo step for each change, 0 for "what next" and the no-op; no gap lost anywhere; no riser offers.
- 26 offline / mocked-AI requests (above), no page errors.

### For the owner (unchanged on purpose)
The house template's own Build default is still `snareroll 4` with no gap (drums-only "arrange it" in house); the Bodzin/electronic Build ends roll 2 + gap. The owner may want the silence there too.
### Known limits
- "the drop" when there are two still means the playing or last-touched one, so a riser can land on the Break (Llama does this too).
- Shortening a 6-section song below about 1:30 needs a section removed; Keys says so.
