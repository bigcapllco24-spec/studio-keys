# AI-1 re-check after fix 2 (qa-tester) · 15 Nov 2026
Branch `preview-ai-1` at 0c14317 ("AI-1 fix 2"), plus my smoke commit on top.

## Verdict: READY
Both bugs from my last re-check are fixed, and so are all the tidy-ups:
- **The AI's extra snare roll no longer removes the beat of silence.** I re-ran all 13 real Llama outputs. Every Build and Break that leads into a drop now has a gap beat 9-15 dB quieter than the beat before it. On the owner's first request the gap beat was -7.9 dB last time and is -21.9 dB now.
- **Section mutes now cover the missing wordings.** "Take the bass out of the build", "outro se drums hata do" and "intro ke liye … band karo" take the part out of that section only. "Mute the drums" still mutes the whole track.

`bash .claude/tools/check.sh`: **CHECK OK, 57 of 57**. That includes my new fix-2 line and last time's "AI's own roll keeps the gap" line, which passes now. The whole check takes **1:50** at load about 2.

I found four small problems, all edge cases. They are listed below for a later fix and should not hold up gate 2. None of them affect the main flow: making the song, arranging it, the gaps, "another one", and undo.

## Problems (none blocking)

### 1. Asking a 6-minute club track to get longer does nothing, and the reply doesn't explain (low-medium · `src/actions.js` `songScaleTo` / no-op reply)
1. Loop like Bodzin, then "make it a full club track like Bodzin". You get 192 bars, 6:12, every section 32 bars.
2. Say "make it longer", or "make it 8 minutes". Llama's `arrange minutes 8` gives the same result.
- **Expected:** the song gets longer, for example 64-bar drops, or Keys says why it can't (for example "every part is already 32 bars; say 'make the break longer' or 'add a second drop'").
- **Actual:** 0 undo steps, and the reply is "It's already like that, so nothing changed." That's confusing, because the user asked for a change, not for something that's already there.

### 2. Reels: "30 seconds" isn't understood offline, and the AI's reply claims 30 s when the song is 1:33 (low-medium · `src/maker.js`, `src/actions.js` `songScaleTo` / reply)
1. Full track (96 bars, 3:06).
2. **Offline:** "make it 30 seconds for a reel", "make it a 30 second reel" and "make it 45 seconds" all get "I couldn't turn that into a change. Try 'add a trap beat at 140'…". "Make it shorter for a reel" gives 2:04.
3. **AI on:** for "make it 30 seconds for a reel" the AI sends `arrange minutes 0.5`. The result is all 8-bar sections, 48 bars, **1:33**. The reply says "Cut it to about 30 seconds for a reel. Every part is already 8 bars, so it can't get shorter without losing one…".
- **Expected:** fix 2 says the 1-minute floor is lifted when the user asks for seconds or a reel. The owner wants reel-length songs (UX-1 approval). So either drop sections down to about 30 s (for example Build 8 · Drop 8), or don't let the AI's "about 30 seconds" claim stand.
- **Actual:** 1:33, and the first sentence of the reply is false.

### 3. Offline "drop se pehle bass mute karo" takes the bass out of the Drop itself (low · `src/maker.js`; probably older than fix 2, since `maker.js` didn't change)
1. Full track, AI off.
2. Say "drop se pehle bass mute karo" ("mute the bass before the drop").
- **Actual:** "Done: Drop: bass out". The bass is gone from the first drop, which is the opposite of what was asked, and it's still on in the Build.
- **Same request in other forms:**
  - With the AI (`mix bass mute`), and in English offline ("mute the bass before the drop"): the whole bass track is muted for the entire song. That's what fix 2 intended, but a producer saying this means the bars before the drop, so the Build.
- **Suggestion:** "X se pehle" / "before the X" → the section before X.

### 4. A `groove` with the same energy makes an empty undo step, so the AI's false claim gets through (low · `src/actions.js` `ACT.groove`)
1. Full track.
2. The AI sends Llama's "make the intro more exciting" actions without the trailing `transport play`: `section length change 0`, `transition intro fill`, `groove energy 4`.
- **Actual:** 1 undo step, but the only change is that the drum events lose `cyc: -1`. I checked all 128 changed fields, and nothing else changes in the layout or the recipe. The reply keeps the AI's "I added a fill and made the drums more driving".
- **With the trailing `transport play`** (Llama's real output): 0 steps and the honest "It's already like that, so nothing changed: Intro: drum fill into Build". So the real case passes, but a `groove` that changes nothing shouldn't save an undo step.

## Rough edges
- **Tips suggest moves already done in earlier requests.** None of them repeats the request just made, which was the fix. But in the main flow, after "take the kick out of the intro", the next 4 replies still offer "take the kick out of the intro". After "make the second drop different", it is offered again 2 requests later.
- **A shorten that hits the floor gives two messages at once:** "Done: About 1.5 minutes: … 48 bars · 1:33, Playing. Every part is already 8 bars, so it can't get shorter without losing one." Something like "That's as short as it goes with every part kept" would read better.
- **No-op replies still show a change chip.** For example, "Intro: bass out" in a box, plus the song map. It looks like the chip on a real change. See reply-1400.png and reply-390.png.
- **"Drop" targeting is unchanged** (a known limit). "Add a riser before the drop" and "drop se pehle silence" go to the Break, into the playing or last-touched drop, not the Build. The reply is honest that it's a snare roll.
- **Adding a break right after the first drop** gives "Added Break (16 bars) before Break 2". The user's existing Break is renamed Break 2. That's correct in song order, but it may surprise some users.
- **Llama's "what next" reply** suggests "a transition before the second drop, like a snare roll", even though there already is one (roll 2 + gap). That comes from the prompt, not the executor.
- **For the owner (unchanged):** the house template's Build still ends `snareroll 4` with no gap (gap beat -6.8 dB). The Bodzin/club Build has the gap.
- **For the lead:** the test link runs on the live Worker's old prompt. Song requests with the AI on won't behave like this report until the prompt is deployed.

## What I checked (numbers)

### 1. check.sh
| Run | Result | Time | Load |
|---|---|---|---|
| Run 1 (branch as delivered) | CHECK OK, 56/56; "AI's own snare roll keeps the gap" gives `{"to":"snareroll","bars":2,"gap":true}` | | |
| Run 2 (with my new line) | CHECK OK, 57/57 | 1:50 | about 2 |

### 2. The 13 real Llama outputs through `handleRequest`, plus 5 asked-for transitions next to a new layout
- **Setup:** fetch is mocked with Llama's saved JSON. Bodzin loop, or a full track (96 bars), or drums only (house).
- **Measurement:** the gap is rendered offline for every section that leads into a drop (RMS dB, left channel, the last beat of the section).
- **Overall:** no errors and no page errors. Every change was 1 undo step; "what next" and the no-op were 0. Riser or sweep offers: **0 of 18**. Replies saying "Done" to a no-op: 0. Unusable actions: none crashed. `section length change 0` is harmless.

| Request (state) | Section into the drop | Beat before | Gap beat | Gap 2nd half |
|---|---|---|---|---|
| full club track like Bodzin (loop) | Build roll 2 + gap / Break roll 2 + gap | -10.4 / -13.5 | **-21.9 / -22.8** | -32.7 / -30.2 |
| 8-bar intro, build up and drop (arrange + Llama's extra `transition Build snareroll`) | Build roll 2 + gap | -10.5 | **-21.9** (was -7.9) | -31.8 |
| make the break longer | Build / Break (24) | -10.5 / -13.4 | **-21.7 / -22.9** | |
| drop the drums in the outro | Build / Break | -10.6 / -13.4 | **-22.2 / -22.9** | |
| add some silence before the second drop | Break kick drop 1 | -24.9 | -29.0 | -31.0 |
| make the second drop different | Build / Break | -10.2 / -13.6 | **-22.1 / -22.7** | |
| add a riser before the drop | Break roll **4** + gap | -13.4 | **-22.5** | -30.3 |
| make it longer (`arrange minutes 4`) | 128 bars, 4:08; Build / Break | -10.5 / -13.4 | **-22.6 / -22.8** | |
| break ke baad ek aur drop daal do | Break roll 2 + gap; order Break · **Drop 2 · Drop 3** · Outro | -13.3 | **-23.1** | -30.7 |
| make the intro more exciting | 0 steps, "It's already like that, so nothing changed: Intro: drum fill into Build." | | | |
| arrange it (drums only, house) | Build `snareroll 4`, no gap (house default) / Break roll 4 + gap | -6.7 / -12.9 | -6.8 / **-26.1** | |
| *asked:* intro, a build with a **4 bar snare roll**, then drop | Build roll 4 + gap | -10.0 | **-22.1** | -32.5 |
| *asked:* full track, **no gap** before the drop | Build roll 2, no gap (Break keeps its gap) | -6.5 | -7.4 | -8.6 |
| *asked:* full track with a **kick drop** | Build kick drop | -17.2 | **-27.3** | -37.8 |
| *asked:* full track with a **fill** into the drop | Build fill 1 | -6.5 | -6.8 | |
| *asked:* "no gap before the drop" on a full track | Build roll 2, no gap | -7.2 | -8.1 | |

Transitions the user asks for still apply next to a new layout. One the user didn't ask for no longer wipes the gap.

### 3. Bug 2 wording (each run with the AI sending `mix <track> mute`, and with the AI off)
| Said | Result (AI / offline) |
|---|---|
| take the bass out of the build | Build bass out, Drop bass on, track not muted, 1 step / same |
| outro se drums hata do | Outro drums out only / same |
| intro ke liye drums band karo | Intro drums out only / same |
| intro ke liye bass band karo | already out in the Intro: 0 steps, track not muted / "It's already like that…" |
| build se bass hata do | Build bass out only / same |
| take the chords out of the break | Break chords out only / same |
| mute the drums | **whole track muted** / same |
| mute the bass | whole track muted / same |
| drop se pehle bass mute karo | whole track muted / **Drop bass out** (problem 3) |

### 4. Tidy-ups (AI off unless noted)
**Wording and section numbering**
- "Break 2 (16 bars)": "add a second drop" → "Added Break 2 (16 bars) and Drop 3 (16 bars) before Outro". PASS
- Numbered in song order:
  - With the AI, "break ke baad ek aur drop daal do" → Break · Drop 2 · Drop 3 · Outro. PASS
  - Offline, "drop ke baad break daal do" → Drop · Break · Break 2 · Drop 2, with the reply "Added Break (16 bars) before Break 2". PASS
  - A renamed section ("Peak") is left alone: "add a drop after the break" → Drop 2 · Peak. PASS

**Tips:** across 6 requests in a row, none of the tips repeats the request just made. PASS (stale tips: see rough edges)

**No-op replies:** none of these says "Done" or claims a change. PASS (one exception: problem 4)

| Request | Steps | Reply |
|---|---|---|
| "intro mein bass mat bajao" twice | 0 | "It's already like that, so nothing changed: Intro: bass out." |
| "break se pehle fill daal do" | 0 | "It's already like that… Drop: drum fill into Break" |
| "drop the drums in the outro" twice | 0 | "It's already like that" |
| "add a snare roll before the drop" | 0 | "It's already like that… Build: snare roll 2 bars + a beat of silence into Drop" |
| "move the break after the first drop" | 0 | "Break is already after Drop." |

**Longer and shorter:** every result is made of 8/16/32-bar phrases, and nothing goes under about a minute. PASS (except club longer and reels: problems 1 and 2)

| From | Request | Result |
|---|---|---|
| 96 bars | longer / "song ko lamba karo" | 16 · 16 · 32 · 16 · 32 · 16, 128 bars, 4:08 |
| 96 bars | longer twice | 160 bars, 5:10 |
| 96 bars | shorter / "gaana chhota karo" / "make it 2 minutes" | 8 · 8 · 16 · 8 · 16 · 8, 64 bars, 2:04 |
| 96 bars | shorter, three times | 64 → 48 (all 8, 1:33) → 0 steps, "Every part is already 8 bars…" |
| 32 bars, 1:02 | shorter | 0 steps, "It's about a minute already…" |
| 32 bars, 1:02 | longer | 16 · 16 · 32, 2:04 |
| 192 bars (club) | shorter | 16 · 16 · 32 · 32 · 32 · 32, 160 bars, 5:10 |
| 192 bars (club) | longer / "8 minutes" | **0 steps, "already like that"** (problem 1) |

**Quick regression** (offline, the proposal's main flow, typed with "Keys,")
- Intro 8 · Build 8 · Drop 16, then a club track (192 bars, 6:12), Break 32 → 40, intro kick out and bass in, outro drums out, Drop 2's own melody, Hinglish silence. Each was **1 undo step**.
- "Loop the break" → beat 385.3, loop on Break. "Play the whole song" → beat 1.5. "Play from the second drop" → beat 545.4. Each was 0 steps.
- "Undo that" → -1.
- "Another one" twice on a Böhmer loop: 3 different patterns.
- "Another one" twice in an arranged song: 3 different patterns, the layout is kept, 2 steps for the 2 requests.
- Page errors: none.

## Smoke test change (`tests/smoke.mjs`, pushed to preview-ai-1)
I added one line. It reuses the fix-1 block and adds about 6 s.
- **The line:** `AI-1: "make it shorter" keeps 8/16/32-bar phrases; "take the bass out of the build" (AI mix mute) takes it out of the Build only; an added drop is numbered in song order and the Break keeps its gap`
- **Result:** PASS `{"phrases":"8,16,16,16,16,16","outOf":true,"order":"Intro,Build,Drop,Break,Drop 2,Drop 3,Outro","brk":"{\"to\":\"snareroll\",\"bars\":2,\"gap\":true}"}`

## Files (`/tmp/qa/2026-11-15/ai-1-retest2/`)
- **Screenshots:** `reply-1400.png`, `reply-390.png` (an 8-section map and a no-op reply), `chat-1400.png`
- **Numbers:**
  - `llm-through.json`: the 13 Llama outputs plus 5 asked-for transitions, with gap dB
  - `words.json`: mute wording, tidy-ups, longer and shorter
  - `probe.json`: more wording, reels, club longer
  - `probe2.json`: the empty groove undo step
  - `reg.json`: the regression run
- **check.sh output:** `check2.out`, and `/tmp/qa/2026-11-15/ai-1-retest2-check.out` (run 1)
- **Scripts:** `scripts/` (`h.mjs`, `llm2.mjs`, `words.mjs`, `probe.mjs`, `probe2.mjs`, `reg2.mjs`, `shot.mjs`)
