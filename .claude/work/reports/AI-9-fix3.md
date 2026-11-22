# AI-9 fix 3 report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9`, head **b1d2bf8**, pushed. There are 5 WIP commits after c658c29: 9a77e90, 2abe286, a83bf8b, c62259b and b1d2bf8. `main` was not touched.

**check.sh: PASS bundle syntax, PASS worker syntax, SMOKE OK: 102 checks, CHECK OK** (load about 1.2).
- There were 100 checks before; I added 2 for fix 3.
- Run 1 failed on one of my own new checks. The offline "what if the chords were on strings" had already put the chords on Strings, so the AI half had nothing left to change. I switched the AI half to "how about the chords on an electric piano" [instrument epiano]. Run 2 passed.

Note on pushing: my role file says "don't push", but the brief says to commit and push `preview-ai-9` after each step. I followed the brief.

## Fixes
1. **Spoken praise followed by a request** (`src/actions.js`: new `speechComma`, run before `praiseComma` in `protectSaid`).
   - A comma now goes in at three places when the words after it name another part or start a request (try, change, give, make, new, swap and so on, also after now, so, just or but):
     - after the filler at the start: "ok cool", "yeah nice", "nice nice";
     - after "<part> is/are <praise>";
     - after Hinglish "<part> theek/mast hai".
   - "ok cool" is now filler, not praise of a part.
   - Leading filler is stripped from the rest of the sentence.
   - On the AI path, Llama's correct action for the other part now runs. Nothing is dropped, so the offline answer no longer replaces it.
   - "the drums are fine" and "the drums are ok now" on their own still keep the drums and change nothing. "the bass is fine make it a bit louder" still changes the bass.
2. **Lists after leave / don't touch.**
   - `speechComma` also puts a comma after "leave / keep / don't touch / dont touch / don't change" + a list of parts (joined with "and", "or", commas or plain spaces, optionally followed by "alone") when a request follows.
   - "or" now counts as a list word, so "the bass or the chords" is protected.
   - "don't change the drums, the bass or the chords, just the melody" now gives Melody (replaced) only. The bass and chords are no longer re-added.
3. **Question-shaped chord requests** (`src/maker.js`).
   - New rule for `askFix`, the same one `partAsk` uses: can / could / would / how about / what about / what if / should / is it possible + a change word is a request. A change word is a change verb, a mood (happier, darker), a shape (shorter, simpler), a level, or an instrument asked for as a sound ("on strings", "with an electric piano", "what about strings for the chords").
   - Offline, `partEditFix` now:
     - turns "what if the chords were on strings?" into the instrument action (same notes);
     - turns "a darker progression" and "darker chords" into a darker vary, while "make the chords darker" stays an EQ change;
     - picks the longest instrument name, so "electric piano" is not read as "piano".
   - These are still questions: "which chords are these?", "what chords are playing?", "what about the chords?", "are the chords in a minor?", "can you tell me the chords?".
4. **honestReply** (`src/actions.js`) and the short fallback (`src/assistant.js`).
   - A sentence that says a part was kept is now removed if another clause in it claims a change that didn't happen ("Here is a new bassline and a fresh melody, drums kept as they are.").
   - A corrected volume now catches "volume to 20" and "to 20%".
   - When every AI sentence is removed, the new `shortDone` gives the reply. It is short, has no tip, and leaves out "I only changed…". Examples:
     - "New melody. Kept the drums and the bassline as they are."
     - "Melody up 3 dB."
     - "Bassline down 3 dB."
     - "Bassline simpler."
     - "New chords, and the bassline follows them."
   - "New chords, drums kept." is no longer followed by a second "Kept the drums" sentence.
5. **"why is the bass so loud?"** now means "the bass is too loud" (−5 dB).
   - The same rule applies to "why is/are/does X (sound) so loud / quiet / busy / muddy / harsh …" (`askText`).
   - "why is the melody so busy?" simplifies the melody. "why does the bass sound so muddy" cleans up the low end.
6. **Going back.**
   - "bring back the first melody" now goes back to the first version. Before, "bring back" was read as unmute; it still means unmute when there is no word like first, previous, old or other.
   - Hinglish "pehle wale chords wapas lao" (also purane / pichhle … wapas) goes back to the previous version.
   - "sabse pehle wale" goes back to the first version.
7. **New chords under a kept bassline** (`pickProg`).
   - When the bassline stays (praised, kept, or the user's own), candidate progressions are ranked first by how many bars have the bass's first note inside the chord: 4/4, then at least 3/4, then the rest. The fit with the melody comes after that.
   - Keys says so only below 3/4: "The bassline stays as it is, so it sits outside the new chords in N of M bars. Say "new bassline" if that clashes."
   - Result over 6 seeds × 3 phrasings: **4/4 in 14 of 18 and 3/4 in 4 of 18.** It never dropped below 3/4, so the sentence never came up.
   - A sung bassline now also gets chords that fit it.

## Numbers (tester's scripts, rerun on this build; my copies and outputs are in /home/claude/reports/ai9-fix3/)

| Set | Before (fix 2) | Now |
|---|---|---|
| p2 spoken | 13/20 | **20/20** |
| p3 AI path, spoken | 3/12 | **12/12** |
| p4 question-shaped | 4/11 | **11/11** |
| p6 problem 1 probes | 6/13 | **13/13** |
| hr honest replies | 12/15 | **15/15** |
| rv revert | 16/18 | **17/18** |

- The one rv miss is R3: plain "go back" acts as Undo. The tester already accepted this.
- Every changing case is one Undo step, and Undo restores the song exactly.
- Regression sets, all passing:

  | Set | Result |
  |---|---|
  | f2 | 62/62 |
  | n | 33/33 |
  | p1 | 28/28 |
  | T1 | 31/31 |
  | T3 | 27/27 |
  | T3b | 19/19 |
  | T4 | 28/28 |
  | T6 | 56/56 |
  | T7 | 12/12 |
  | T9 | 5/5 |
  | T10 | 10/10 |
  | T10b | 8/8 |
  | Try chains | 16/16 |
  | Memory chains | bass fits 4/4 in 30/30 states |

- **Sung bassline (T5).** It was kept in every comment. "the drums are sick try new chords" with AI [vary chords, vary bass] now changes the chords and keeps the sung bass, which was one of the tester's notes.
- **Sound** (offline `renderAudio`, 4-bar loop, Try chain). No clipping and no silent blocks:

  | State | Peak | RMS |
  |---|---|---|
  | r0 | −0.57 dBFS | −6.7 dB |
  | r1 | −0.52 dBFS | −6.8 dB |
  | r2 | −0.90 dBFS | −9.2 dB |
  | r3 | −0.74 dBFS | −9.2 dB |
  | r4 | −0.81 dBFS | −9.2 dB |

- **Screenshots** (/home/claude/reports/ai9-fix3/): `shot-f2-chat-speech-ai.png` ("ok cool the drums are sick try new chords" gives "New chords, drums kept." with the new-chords chip) and `shot-f2-chat-honest-reply.png` ("New melody. Kept the drums and the bassline as they are.", then "Melody up 3 dB.").
- **Page errors:** 0. The only console error is the blocked fonts request.

## Llama 3.3 test (real Workers AI call, branch prompt)
- **How I built the prompt.** I read the live Worker's source, which matched `main` byte for byte (sha 93a8b1ac), and applied the branch's edits in the connector's sandbox. The result matched the branch `worker.js` exactly (sha ef05201f).
- **Setup.** The real house-loop `projectState()` and instrument list, sent in the Worker's message format with temperature 0.4.
- **Result: 12/12 right.**

| Request | Llama's actions |
|---|---|
| the drums are fine try new chords | [vary chords] |
| ok cool the drums are sick try new chords | [vary chords] |
| the melody is perfect give me a new bassline | [vary Bassline] |
| leave the drums and bass alone change the melody | [vary Melody] |
| don't touch the drums, the bass or the chords, change the melody | [vary Melody] |
| how about some happier chords? | [vary chords mood happier] |
| what if the chords were on strings? | [instrument Chords Strings] |
| could the chords be shorter? | [reshape Chords shorter, transport play] |
| why is the bass so loud? | [mix Bassline db −3] |
| pehle wale chords wapas lao (focus chords) | [revert chords] |
| sing the bassline | [sing part bass] |
| another one (focus chords) | [vary chords] |

- I ran these exact Llama outputs and replies through the page (l.mjs).
  - 10 of 10 change the right part.
  - The one harness flag is the extra `transport play` in "could the chords be shorter?". Starting playback alone shows up as a change in the harness (checked with a play-only control), so that flag is the test, not a bug.
- Small known limit: for "how about some happier chords?" Llama said "keeping the same melody and bassline", but the generated bassline follows the new chords. The chip says so, and honestReply doesn't catch it because nothing was dropped.

## Prompt changes (`cloudflare/worker.js`; no backticks or `${`; syntax OK)
- **CONVERSATION:** "\"bring back the first melody\" = revert melody to first; Hinglish \"pehle wale chords wapas lao\" = revert chords."
- **ONE PART AT A TIME**, after the question rule: "But a question that asks for a change is a request, so do it: \"how about some happier chords?\" = vary chords mood happier, \"what if the chords were on strings?\" = instrument chords, \"could the chords be shorter?\" = reshape chords shorter, \"why is the bass so loud?\" = the bass is too loud. Speech has no punctuation: \"ok cool the drums are sick try new chords\" = keep the drums, vary chords only; \"leave the drums and bass alone change the melody\" = vary melody only."
- No new action names or fields.

## For the lead
- **Worker deploy at release.** The prompt changed in fixes 2 and 3. Every guard also runs in the page, so the test link behaves correctly before the deploy.
- **Smoke.** 2 new checks in the AI-9 block of `tests/smoke.mjs` (same page load). They cover the spoken praise cases, the question-shaped chord cases and the spoken lists, each offline and with the correct AI action.
- **Not mine (studio-ux-dev, from the brief):** `setKey` in `studio.js` doesn't move the notes when the key was 'auto'.
- **Known limits.**
  - "the bass is great the chords need work" gives new chords: "need work" is read as a request.
  - "make the drums sound good" still counts as praise and changes nothing. This is older behaviour; I left it because changing it would mean new drums.

## Try list for a musician (said the way you'd say it, no punctuation)
Start with a beat that has drums, bass, chords and melody.
1. "ok cool the drums are sick try new chords": new chords, the drums stay, and the bassline follows the chords.
2. "the melody is perfect give me a new bassline": only the bassline changes.
3. "leave the drums and bass alone change the melody": only the melody changes.
4. "dont touch the drums the bass or the chords change the melody": only the melody changes.
5. "how about some happier chords": brighter chords. Then "what if the chords were on strings": the same chords on strings.
6. "I really like that bassline now change the chords": the bassline stays exactly as it is, and the new chords sit on its notes.
7. "why is the bass so loud": the bass goes down, with the same notes.
8. "change the melody", then "change the melody" again, then "bring back the first melody": the first melody comes back. In Hinglish: "pehle wale chords wapas lao".
