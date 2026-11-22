# AI-14 fix 1 · assistant-dev · 22 Nov 2026

Branch `preview-ai-14`, pushed. The head is **1faba80**; the brief started from 2c6a876. Nothing went to main. I worked in /home/claude/sk-ai14.

Files changed:
- `src/maker.js`
- `src/actions.js`
- `src/assistant.js`: 2 lines, for the AI reply nit.
- `tests/smoke.mjs`: the AI-1 Hinglish line gets one more step, plus 5 new lines at the end.
- `index.html`: rebuilt.

`cloudflare/worker.js` did not change. **Worker prompt changes: none.** The lead still deploys the AI-14 build's prompt lines at release, as in the build report.

Commits: 5762131 (fixes 1-5), bb40639 (smoke lines), d42637a (lone "left", nice-to-haves), 1faba80 (AI reply nit).

## Per fix

### 1. "make the second drop bigger"
- **Cause:** `second` was in sectionSayFix's exclusion list. Any "second" made it return nothing.
  - Offline, that gave "I couldn't turn that into a change", or a drum rewrite through the groove rule.
  - On the AI path, Llama's groove ran across the whole song.
- **Change (maker.js):** "second" is now excluded only after "a / one more / ek aur / aur ek / extra". "The second drop" now resolves through the existing ord map to Drop 2. "add a second drop" still adds sections. The AI path calls the same function, so Llama's groove for these words gets the section answer too.
- **Before → after:** every phrase below went from a fail or a drum rewrite to a pass.
  - "make the second drop bigger", "give the second drop more energy", "more energy in the second drop", "the second drop needs more energy", "can the second drop go harder" and "make the 2nd drop bigger" all now reply "Drop 2 already has every part and a snare roll into it…". Nothing changes.
  - With the chords out of Drop 2, the reply is "Made Drop 2 bigger: Drop 2: Chords in" (one undo step).
  - AI groove energy 5 with Llama's reply "Made the second drop bigger." now gets the honest Drop 2 reply, and the drums are untouched.
  - "make the second drop hit harder" was a drum compressor; now it gets the Drop 2 answer.

### 2. A voice-note mute ate the take in the same sentence
- **Cause:** the ACT.sing guard ran audioMuteFix on the whole sentence. It turned every sing into a mute, even when the mute had already been sent or the sentence asked for a take.
- **Change (actions.js, ACT.sing):** the sentence is split into clauses with splitAsks.
  - **Another clause asks for a take** ("sing / hum / record / voice note …"): the voice note is muted, unless this request already mutes that same track, and the take still starts. The reply says "sing: muted. Recording a voice note after the count-in…".
  - **No other take is asked for:** the old guard runs. If the AI also sent the mute for that track, the stray sing is dropped quietly.
- **Change (maker.js), offline:**
  - "record a new one / another take / a new voice note" is a take: a voice note, or the last sung part.
  - A clause that starts with "sing / hum / whistle" is a sung take, never a newly made part. Before, "mute the bass and sing a new bassline" made a new bassline in Basic mode. Now it starts the bass take.
- **Before → after:**

| Case | Before | After |
|---|---|---|
| AI [mix sing mute, sing bass] | "sing is already muted", no take | muted + bass take |
| AI [mix mute, sing voice] | no take | muted + voice take |
| AI [sing voice] only, for "mute the voice note and record a new one" | muted, no take | muted + voice take |
| Offline "mute the voice note and sing the bassline" | "I couldn't do 'sing the bassline'" | muted + bass take |
| Offline "… and record a new one" (3 wordings) | no take | muted + voice take |

  - The guards still hold: AI [sing voice] for "mute the voice note" or "turn off the recording" mutes, with no take and no mic. "mute the bass and sing a new bassline" with AI actions is unchanged (bass muted, bass take).

### 3. A bare "right" panned the part
- **Cause:** focusText turned any lone left/right into "pan the <focus> …".
- **Change (maker.js):**
  - A lone "right" is a pan only if one of these is true:
    - it comes right after a pan (Keys remembers the last pan request; ACT.track_fx and panFix record it);
    - it comes with more / further / a bit / to the / slightly / thoda.
  - **This differs from the brief:** a lone "left" still pans. "Left" is never a yes, and the tester's own neighbour set expects it to pan (it passes on 2c6a876), so "never worse" decided it.
- **Before → after:**
  - "right", "ok right" and "right ok" after "make the melody brighter": a pan → no change.
  - "to the right" and "a bit to the left": still pan.
  - "pan the melody left" then "right": R 40.
  - Pan, then something else, then "right": no pan.

### 4. "pan the melody left and the chords right"
- **Cause:** panFix took one part, the longer name with ties going to the chords, and the first side it found.
- **Change (maker.js):** a new `panMany` handles two or more parts joined by "and" or a comma.
  - Each part gets the side said next to it, with its own amount ("hard left … a bit right").
  - One side for all ("pan the melody and the chords left") pans them all.
  - Sides listed after the parts are taken in order.
  - If a part's side is unclear, Keys asks. It is one request, so one undo step.
- **Change (single path):** the single path now pans the part said first. "pan the melody to the left so it sits away from the chords" used to pan the CHORDS left; now it pans the melody.
- **Before → after:**
  - "pan the melody left and the chords right": Chords L 40, Melody unchanged → Melody L 40, Chords R 40, one undo step.
  - The same goes for "pan the chords right and the melody left", "put the melody on the left and the chords on the right", "pan the melody left, the chords right", "… hard left and the chords a bit right" (L 100 / R 20) and "… melody left and the bass right".
  - AI add_melody for the sentence: both parts pan.

### 5. Untrue replies
- **Break or outro "already has its drums":** the reply always said that when nothing could be added to a section that isn't a drop.
  - It now says what the section really has, then offers the first missing part.
  - Break: "The break has the chords, but not the drums, the bass and the melody. I can't make one section louder on its own yet. Want me to bring the drums in at the break?" Saying "bring the drums in at the break" then does it.
  - Outro: "The outro has the drums and the chords, but not the bass and the melody… Want me to bring the bass in at the outro?"
  - Build: says what it has and what it lacks.
  - "already has every part" only appears when it's true.
- **Grammar:** "Drop 2 already has…", "into Drop 2", "Made Drop 2 bigger". Before, these read "The drop 2…".
- **Mud fix:**
  - A melody whose low cut is above its lowest note is brought down under it, to 0.85 × the lowest note's frequency, and the reply says so. Case: 220 Hz on a melody down to C3 at 131 Hz → 111 Hz, reply "Melody (low cut down to 111 Hz, under its lowest note)". "the melody is muddy" gives "low cut down to 111 Hz (under its lowest note)".
  - The mix reply says "low cuts set" when a cut came down, and "under its lowest note" only when it is true.
  - The chords' cut is unchanged, as before (smoke line 62).

### 6. Smoke
- The AI-1 Hinglish line now also says "drop 2 ke baad break daal do". It checks that Break 2 lands right before the Outro, after Drop 2, and that the line's undo count is 2.
- New lines, all passing:
  - **AI-14 fix 1:** three second-drop wordings; an AI groove for one of them; chords back into Drop 2.
  - **fix 2:** an AI mute + bass take; an AI sing-only + voice take; offline bass and voice takes; the guard still holds.
  - **fix 3:** a bare "right" is no pan; "right" right after a pan pans R 40.
  - **fix 4:** melody L 40 and chords R 40, one undo step.
  - **fix 5:** the break reply is honest; "Drop 2 already has"; the melody cut is at or under C3.

### Extras (small, from the tester's nice-to-have list and the AI nit)
- "spread the chords wider" is the width (75%). Before, it replaced the chords.
- "the melody is too far left" steps the melody 20 back toward the centre, or says it isn't panned left. Before, it added Melody 2.
- AI reply nit (assistant.js): when the whole-song note is added, the AI's own "in the drop" is removed from its sentence.
  - Before: "Turned the melody down 3 dB in the drop. That's in the whole song…".
  - After: "Turned the melody down 3 dB. That's in the whole song, not only the drop…".
- Not done: "i want a breakdown" and "key ko D minor karo" offline.

## Tester's scripts (/home/claude/qa/ai14/), run on the new build
Outputs are in /home/claude/ai14f/: `bugs-new.txt`, `ai-new.txt`, `nb-new.txt`, `r9-new.txt`, plus my own sets `f1.js` and `f4.js` with their outputs.

| Set | main | AI-14 2c6a876 | AI-14 fix 1 (1faba80) |
|---|---|---|---|
| Whole offline bug set (bugs.js) | 20/107 | 97/107 | **105/107** (left: "i want a breakdown", "key ko D minor karo") |
| Mocked AI path (ai.js) | 18/33 | 29/33 | **30/33** |
| Neighbours (nb.js) | 33/52 | 46/52 | **52/52** |
| AI-9 regression (ai9.js, 65 phrasings) | n/a | 63 same + 2 better vs AI-9 | **65/65 signatures identical to 2c6a876** (still 2 better vs AI-9) |

- **No case got worse than 2c6a876 or main on any set.** Line by line, the only changes are fail→pass or a more honest reply.
- The 3 AI-path cases still failing in ai.js (the harness ran before the reply-nit commit):
  - **The bubble nit:** fixed in 1faba80, checked separately with mocked AI (f5.js).
  - **"add a second drop":** gives Break 2 + Drop 3, same as main.
  - **"it sounds too dry" with the old prompt's master reverb:** this needs the Worker deploy.
- A harness note: once in nb.js, "mute the voice note and sing the bassline" showed UNDO-DIFF (Drums/Bassline/Chords events). That is the tester's harness pressing Undo while the count-in runs. I reproduced it with a plain "sing the bassline" on 2c6a876 too. Undo after the take stops is exact in my probe (f3.js), and the line passed on the rerun.

## Llama 3.3 check
Not rerun, because the prompt did not change. The executor handles Llama's answers through the mocked AI cases above:
- the groove for the second drop;
- [mix mute, sing bass], [sing voice];
- add_melody for a two-part pan;
- two correct track_fx pans.

## check.sh
- **CHECK OK, 117 checks, 0 page errors.** It passed at 19:04 (3m27s, load about 3.6) and again at 19:21 on the final head (2m43s).
- No flakes.

## Try it (8 steps, Basic mode or the test link)
1. Say "make a beat like Stephan Bodzin", then "add a bassline", "add some chords", "add a melody", "make it a full track". Then say "take the kick out of the intro and bring the bass in": the intro loses its kick and the bass comes in there with the same notes. One Undo puts it back. "bring the bass in" on its own asks which section.
2. Drop a recording in (Import audio), then say "mute the voice note": it goes quiet and no count-in starts. Now say "mute the voice note and sing the bassline" (after "unmute the voice note"): the recording is muted AND the count-in starts for your bassline.
3. Say "the melody is too loud in the drop": the melody goes down, and Keys says it's for the whole song.
4. Say "make the second drop bigger" (or "give the second drop more energy"): Keys says Drop 2 already has every part and a roll into it, and the drums stay as they are. Say "take the chords out of the second drop", then "make the second drop bigger" again: the chords come back into Drop 2.
5. Say "make the break bigger": Keys says what the break really has (only the chords) and offers to bring the drums in. "bring the drums in at the break" does it.
6. On a loop, say "pan the melody left and the chords right": the melody goes left and the chords go right, and one Undo puts both back. Then say "make the melody brighter" and "right": nothing pans (it's a yes). "pan the melody left" then "right" moves it right.
7. Say "it sounds too dry": the chords and melody get more reverb, and the bass and drums stay dry. "the mix is muddy" never cuts a melody above its lowest note.
8. Start a new song with drums, bass and chords. Say "add a breakdown": Main, Break, Main. Undo, then say "make it a short song" (or "chhota song bana do"). On a full track, "drop 2 ke baad break daal do" adds a break before the outro.

## For the lead
- **Worker prompt:** no new lines. Deploy the AI-14 prompt from the build report at release.
- **No new action names.**
- **qa-tester:** the smoke file has the extra AI-1 step and 5 new AI-14 fix lines (117 checks in all).
- **Role file:** it says "never push". The brief said to push `preview-ai-14` after each step, and I followed the brief.
