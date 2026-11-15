# AI-1 re-check after fix 1 (qa-tester) · 15 Nov 2026
Branch `preview-ai-1` at 84b2c0e ("AI-1 fix 1"), plus my smoke commit 6dc7abd.

## Verdict: NOT READY (one small fix left)
Both bugs from my first report are fixed. With the offline brain, every default silence before a drop is now 11-15 dB below the music. Keys no longer offers risers or filter sweeps: the reply guard caught both offers Llama still made (2 of 13). All the other fix-1 items work.

One thing is left before the owner tries it. **With the AI on, Llama often adds its own snare roll to a new layout. That roll replaces the Build's "roll + beat of silence", so the silence is gone again.** This happens on the owner's first request, "make an 8-bar intro, then build up and drop", with real Llama output. The gap beat then measures -7.9 dB, at the level of the music, against -22.5 dB without the extra roll. It is a small executor fix in `src/actions.js`.

`bash .claude/tools/check.sh` FAILs on purpose on one new smoke check that catches this bug. It should pass once the bug is fixed. The other 55 checks pass, and the whole check takes 2:09 at load about 2.7.

## Bugs

### 1. The AI's extra snare roll wipes the beat of silence before the drop (medium · `src/actions.js`, transition / arrange in one batch)
**Steps** (AI on, real Llama 3.3 output with the branch prompt):
1. Start a new song and make a Bodzin loop (drums, bass, chords, melody).
2. Say "make an 8-bar intro, then build up and drop".

Llama sends these actions:
- `arrange custom [Intro 8, Build, Drop]`
- `transition section Build to snareroll` (no bars, no gap)
- `transport play`

**Expected:** the Build ends like the offline result, with a 2-bar roll and a beat of silence (the owner's "silence before the drop").

**Actual:** the Build ends with a 4-bar snare roll (half of the 8-bar Build) and no gap.

| Build ending | Beat before | Gap beat | Second half of the gap |
|---|---|---|---|
| With Llama's extra roll: `snareroll 4` | -7.6 dB RMS | -7.9 | -9.2 |
| `arrange` alone: `snareroll 2 +gap` | -10.5 | -22.5 | -32.5 |

**The same thing in other requests in my run:**
- "break ke baad ek aur drop daal do": Llama also sent `transition Break snareroll`, and the Break's `snareroll 2 +gap` became `snareroll 4`.
- "add a riser before the drop": `snareroll 4` on the Break, and its gap was lost too. That one was a request for a roll, but it was still a request for silence too.
- In my first report this was a rough edge ("Llama's riser loses the gap"). It now hits the first request of the main flow.

**Suggested fix (assistant-dev):** in the executor, when a `transition` asks for a snare roll and gives no `gap` field, keep the section's existing `gap: true`. Also keep its existing roll length when no `bars` is sent. Optionally, ignore a transition sent in the same request as `arrange` unless the user's words name a roll, fill, silence or riser. The prompt already tells Llama not to send one.

**Smoke check (FAILs now):** "AI-1: when the AI adds its own snare roll to a new layout, the Build still ends in a beat of silence". It mocks the AI with Llama's exact output and currently gives `{"to":"snareroll","bars":4}`.

### 2. Section mute guard misses "out of the build" and similar wording (low-medium · `src/actions.js` `secSaid`)
**Steps:**
1. Arranged full track, AI on.
2. Say "take the bass out of the build", with the AI sending `mix bass mute`.

**Expected:** bass out of the Build only.

**Actual:** the whole Bassline track is muted for the entire song, and the Build part is still on.

**Cause:** `secSaid` only matches "in / during / for / from / throughout the X" and "X mein / me / main". So "out of the X", "outro se drums hata do" and "X ke liye" fall through to a whole-track mute.

**What works:** "drop the drums in the outro" and "outro mein drums band karo" (both sent as `mix mute`) correctly become `parts out` for the Outro only. "mute the drums" still mutes the whole track.

**Fix:** add `out of (the) X` and `X se` to the regex.

## Rough edges (not blocking)
- **Llama aims "the drop" at the wrong one.** For "add a riser before the drop", Llama put the roll on the Break (into Drop 2), not the Build (into the first drop). Its reply then said "Added a snare roll before the drop" with no "risers aren't in the studio yet" note, because Llama sent `snareroll`, not `riser`. The reply is still honest that it's a snare roll.
- **New sections are numbered out of order.** These are cases where a new section goes after a section that is already followed by one of the same kind:
  - Llama, "break ke baad ek aur drop daal do": Break · Drop 3 · Drop 2. Two drops back to back, numbered 3 then 2.
  - Offline, "drop ke baad break daal do": Drop · Break 2 · Break · Drop 2, and the reply says "Added Break 2 16 before Break".
- **Reply wording "Added Break 2 16 and Drop 3 16 before Outro".** The section name and its bar count run together. "Break 2 (16 bars)" would read better.
- **The next-step tip repeats what was just done.**
  - "Make the break longer" → tip "make the break longer".
  - "make the second drop different" → tip "make the second drop different".
- **"Make it shorter" uses odd numbers.**
  - On a 3:06 song it gives 12-bar Drops, Break and Outro. Dance music phrases in 8, 16 or 32 bars; DJs expect that.
  - On a 1:02 song it gives "About 0.5 minutes", with a 4-bar Build that is entirely a 4-bar snare roll.
- **No-op replies say "Done".**
  - "intro mein bass mat bajao" when the bass is already out: "Done: Intro: bass out" with 0 undo steps.
  - Llama on "make the intro more exciting": the reply claims "added a fill and made the drums more driving", but nothing changed (0 undo steps). The Intro already ended in a fill, the energy was already 4, and it sent `section length change 0`.
- **Mini map with 8 sections on phones** (unchanged). Blocks are 23-24 px at 390 and 360 px, so names show as "B..", "D..". It reads well with 6 sections or fewer, and there's no sideways scroll at any width.
- **MP3 export of an arranged song is slow** (unchanged, UX-1). A 64-bar song (2:04) took 231 s headless at load about 3.
- **Sung bassline in a full track** plays only in the first Drop (the UX-5 rule, unchanged).
- **House "build up and drop" has no gap:** the Build ends in `snareroll 4`. That's the house template's own default, not the bug above, but the owner may expect silence there too.
- **For the lead:** the test link uses the live Worker's old prompt, which has no `arrange` / `section` / `parts` / `transition` actions. If the owner tries the song requests there with the AI on, they won't behave like this report. Either deploy the prompt first or tell him to test with the AI off.

## What I checked (numbers)

### check.sh
1. **First run** (machine just restarted, load about 6): CHECK OK, 52 of 52 checks, 3:13.
2. **With my 4 new lines** (load about 2.7): 55 PASS, 1 FAIL (bug 1, intended), 2:09.

### Bug (a): the gap before the drop, rendered offline
Offline brain, Bodzin loop, `renderSongSpan`, RMS dB of the left channel.

| Case | Ending | Beat before | Gap beat | Gap, 2nd half | Drop downbeat |
|---|---|---|---|---|---|
| "8-bar intro, then build up and drop" | roll 2 + gap | -10.2 | **-21.3** | **-31.6** | -7.1 (peak -0.5) |
| + "add some silence before the drop" | kick drop | -13.8 | **-23.6** | **-36.2** | -7.1 |
| + "yaar drop se pehle thoda silence daal do" | kick drop | -14.0 | **-23.7** | **-36.1** | -7.2 |
| + "no roll before the drop" (reference) | none | -6.9 | -6.7 | -7.9 | -6.6 |
| Full track, Build | roll 2 + gap | -10.2 | **-21.4** | **-31.6** | -7.1 |
| Full track, Break → Drop 2 (pad-only Break) | roll 2 + gap | -13.6 | **-22.6** | **-30.4** | -7.2 |
| + "add some silence before the second drop" | kick drop | -24.7 | -28.7 | -30.8 | -7.1 |
| House loop, kick drop | kick drop | -12.8 | **-27.7** | **-38.0** | -7.0 |

In my first report the gap beat was louder than the music before it (-5.6). It is now 11-15 dB under it. The pad-only Break with a kick drop is only about 4 dB down, from pad tails, as the developer noted. The smoke gap check passes: `{"rollGap":0,"kickdrop":"kickdrop:0"}`.

### Bug (b): risers and filter sweeps
**Prompt:** the branch SYSTEM, sha256 0e08605f…, matches the file. In my Cloudflare sandbox run it had the same settings as `askLlama` (max_tokens 1800, temperature 0.4, the same JSON schema and context format), with real `projectState()` from the built page. There were 13 requests, 3 at a time.

**Raw Llama replies:** 2 of 13 offered a riser or sweep:
- "Want to add a filter sweep before the outro?"
- "Want a riser or a snare roll before the build?"

In my first report it was 4 of 12. The other 11 offered a snare roll, a different second drop, a longer break, chords or a melody.

**Through the real `handleRequest`** (fetch mocked with Llama's JSON): **0 of 13** replies offer a riser or sweep. Both offers became "Want a snare roll into the drop?".

**Timing:** 1.9 to 5.9 s, mean 3.6 s, all under 8 s.

| Request (state) | Llama actions | Result through the executor | Undo steps |
|---|---|---|---|
| full club track like Bodzin (loop) | arrange club ref Bodzin, play | 192 bars · 6:12 | 1 |
| 8-bar intro, build up and drop (loop) | arrange custom + transition Build snareroll + play | Build snareroll 4, **gap lost** (bug 1) | 1 |
| another one (loop) | vary drums, play | new pattern | 1 |
| make the break longer | section length +8 | 16 → 24 | 1 |
| drop the drums in the outro | parts outro out drums | Outro [chords]; filter-sweep offer replaced | 1 |
| add some silence before the second drop | transition Break kickdrop | Break kickdrop | 1 |
| make the second drop different | parts Drop 2 vary Melody | melody (B) in Drop 2 only | 1 |
| add a riser before the drop | transition Break snareroll + transition Break bars 4 | roll on the Break (not the Build), gap lost | 1 |
| what should I do next? | none | snare roll or fill suggested | 0 |
| make it longer | arrange minutes 4 | 3:06 → 4:08 | 1 |
| break ke baad ek aur drop daal do | section add "Drop 3" after Break, parts, transition Break snareroll, play | Break · Drop 3 · Drop 2, Break gap lost | 1 |
| arrange it (drums only) | arrange full, play | 96 bars; reply suggests melody or chords | 1 |
| make the intro more exciting | section length change 0, transition intro fill, groove energy 4, play | nothing changed; riser offer replaced | 0 |

**Unusable actions:**
- None crashed.
- 1 no-op: `section length change 0`.
- 1 transition with no `to` (merged into the roll as bars 4).
- 3 transitions the user didn't ask for (bug 1). Two of them went to the wrong section or overwrote a default.

### The other fix-1 items (offline brain, full Bodzin track, 1 undo step each unless noted)
**Section mute → parts** (AI mocked to send `mix mute`):
- "drop the drums in the outro": Outro drums out, Drop drums still on, track not muted.
- "outro mein drums band karo": same.
- "mute the drums": whole track muted, as it should be.
- "take the bass out of the build": whole track muted (bug 2).

**Hinglish with the verb last.** All 9 phrases from my first report work now:
- "drop ke baad break daal do", "drop ke baad break add karo": a Break is added after the Drop.
- "intro ke baad break daal do": Break 2 after the Intro.
- "dusra drop add karo", "ek aur drop daal do", "second drop daal do": Break 2 + Drop 3 before the Outro.
- "break ko loop karo": loops the Break (0 steps).
- "drop 2 se play karo": plays from Drop 2 (0 steps).
- "outro mein drums mat bajao": Outro drums out.

Also checked:
- "outro mein bass bajao": bass in.
- "break ko 8 bar lamba karo": 16 → 24.
- "intro ko chhota karo": 16 → 8.
- "drop 2 hata do": removed.
- "break se pehle fill daal do": already a fill (0 steps).

**Typed wake name:**
- "Keys, make an 8-bar intro, then build up and drop" and "hey keys make an 8-bar intro…": Intro 8 · Build 8 · Drop 16 (1:02).
- "Keys add a bassline": a bassline, with no extra track.
- "keys, make it a full track": 96 bars.
- "add some keys" still adds an Electric Piano track.

**Make it longer / shorter:**
- "make it longer", "make the song longer", "make the track longer", "make it way longer", "song ko lamba karo": 3:06 → 4:08 (128 bars).
- "make it shorter", "make it a bit shorter", "gaana chhota karo": 3:06 → 2:04 (64 bars).
- On a 1:02 song: shorter gives 0:31, longer gives 2:04.
- On a plain loop "make it longer" is still not understood, as on main.

**Reply tidy-ups:**
- Drums only + "arrange it": "There's no bassline or chords yet: want them? Say “add a bassline”." It appears once now, not twice.
- Drums + bass: "There are no chords yet: want some?"
- Drums + chords: "There's no bassline yet: want one?"
- "move the break after the first drop" when it's already there: "Break is already after Drop.", 0 steps.
- The "Shape the song" tip changes between requests (6 different tips in 6 requests) and stops offering "add a second drop" or "drop the drums in the outro" once they're done. It does sometimes repeat the move just made (rough edge).

### Regression pass
**Proposal section 2 flow** through `handleRequest`, offline, typed with "Keys,". Every change was 1 undo step. Loop and play requests were 0 steps, and "Undo that" went back one.
1. Intro 8 · Build 8 · Drop 16.
2. Club track like Bodzin: 192 bars · 6:12.
3. Break 32 → 40.
4. Intro: kick out, bass in.
5. Outro: drums out.
6. Drop 2 gets its own melody.
7. Hinglish silence: kick drop into Drop 2.
8. "Loop the break": the playhead is at beat 385.2, and the Break starts at 384.
9. "Play the whole song": loop cleared, beat 1.2.
10. "play from the second drop": beat 545.1, and Drop 2 starts at 544.

**"Another one" twice:**
- On a Böhmer loop: 3 different drum patterns.
- On the same song arranged: 3 different patterns, the layout is kept, and each request is 1 undo step.

**"Let me sing the bassline" in a full track** (fake mic):
- It switches to Loop for the take, with only the drums audible.
- 12 notes, the lowest note number 36.
- 0 live voice notes, and the mic is off after the take.
- It goes back to Song mode with all transitions kept.
- No raw audio track is added, and the take is 1 undo step.
- "another one" right after still works.

**Mini song map:**

| Width | Theme | 3 sections | 6 sections | 8 sections |
|---|---|---|---|---|
| 1400 | Emerald | 979 px | 841 px, short names | 979 px |
| 390 | Velvet | 210 px wide | blocks 32-41 px | blocks 24 px |
| 360 | Sapphire | 200 px wide | blocks 30-39 px | blocks 23 px |

- No text is clipped inside a block at any width.
- There's no sideways page scroll at any width.
- The changed section is outlined.

**MP3 export of an arranged song with transitions:**
- **Layout:** Intro 8 fill · Build 8 roll + gap · Drop 16 fill · Break 16 kick drop · Drop 2 16 (64 bars).
- **File:** 2,951 KB. It decodes back to 125.91 s.
- **Level:** peak -0.65 dBFS, **0 clipped samples**, RMS -8.5 dB.
- **Longest silence:** 0.24 s, the kick-drop gap before Drop 2. It was 0.04 s in my first report, so the gap is now really silent.
- **Time to make it:** 231 s.

**Page errors:** none in any run.

## Smoke test changes (tests/smoke.mjs, commit 6dc7abd on preview-ai-1)
These 4 checks cover fix 1 and bug 1. They add about 10 s, and the whole check is 2:09.
1. Offline Hinglish with the verb last: "drop ke baad break daal do" + "outro mein drums mat bajao", 1 undo step each. PASS
2. "make it longer" on a 96-bar song gives 120-136 bars; "make it shorter" goes under 96. PASS (128, 92)
3. Reply guard plus section mute: the AI's "filter sweep" offer becomes a snare roll, and its `mix mute drums` said about the outro becomes Outro drums out. PASS
4. The AI's own extra snare roll keeps the Build's beat of silence, using real Llama output. **FAIL (bug 1)**

## Files (`/tmp/qa/2026-11-15/ai-1-retest/`)
- **Screenshots:**
  - map-3sec-1400.png, map-6sec-1400.png, map-8sec-1400.png (Emerald)
  - map-3sec-390.png, map-6sec-390.png, map-8sec-390.png (Velvet)
  - map-3sec-360.png, map-6sec-360.png, map-8sec-360.png (Sapphire)
  - songview-1400.png
- **Raw numbers:**
  - gap.json (gap renders), llmgap.json (Llama roll vs arrange alone)
  - llm.json (the raw Llama outputs), llm-through.json (them through `handleRequest`)
  - fix1.json (fix-1 items), reg.json (regression pass)
- **Scripts:** scripts/ (h.mjs harness, gap.mjs, states.mjs, llm.mjs, llmgap.mjs, fix1.mjs, reg.mjs)
