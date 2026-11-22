# AI-9 fix 2 report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9`, head **c658c29**, pushed (5 WIP commits after 8ee32bd: 95d9d32, 7a6a6e5, 1f00b98, b90ec85, c658c29). `main` not touched.
check.sh: **PASS bundle syntax, PASS worker syntax, SMOKE OK: 100 checks, CHECK OK** (6:48, load 13). There were 98 checks before; I added 2 AI-9 fix 2 checks.
- Run 1 failed on one `Runtime.callFunctionOn` timeout at load 17–35 (other agents' Chrome runs). Only 7 checks had run by then.
- Run 2, after the load dropped, passed.

## Fixes (numbers are the retest's problems)
1. **A list after keep, leave or don't touch protects every part in it.**
   - `protectSaid` (actions.js) now handles a list after keep, leave or don't touch:
     - Clauses that contain only part names ("bass", "bass alone", "the chords too") right after one of those words, joined by "and", "," "&" or "or", are kept too.
     - Empty clauses (", just") no longer reset the list.
   - Phrases that now work:
     - "keep the drums and bass, just try another melody"
     - "keep the drums and the bass, …"
     - "leave the drums and bass alone, change the melody"
     - "keep the drums, bass and chords, new melody"
   - On the AI path, [vary bass, vary melody] gives the melody only.
   - The reply names every kept part: "Kept the drums and the chords as they are." or "Kept the drums, the bassline and the chords as they are."
2. **Praise with no verb keeps the part.**
   - New `KEEP_ADJ` covers a clause that starts with praise:
     - nice, great, good, sick, fire, dope, lovely, sweet, killer, banging, solid, awesome, amazing, beautiful, perfect, wicked, brilliant, epic, lit, cool, tight;
     - or love / loving / like / digging + the/those + a part.
   - `praiseComma` puts a comma after the praise phrase when speech has no punctuation, for example "great chords make the melody simpler".
   - Phrases that now work:
     - "nice bassline! now make the melody a bit shorter": melody only.
     - "great chords. make the melody simpler": melody only.
     - "sick drums, change the chords": chords, with the bass following.
     - "love the drums, change the melody" and "fire beat, new chords".
     - "nice bassline!" on its own: "OK. Kept the bassline as it is. What should I change next?", with no change.
   - "make the melody nice and simple" still works.
3. **A question about a part changes nothing and gets an answer.**
   - New `partAsk` in maker.js (inside `askFix`) answers from the song:
     - "The bassline plays A, C, F and G, in A minor, on Pluck Bass."
     - In F♯ minor, "…or G flat?" adds: "F sharp and G flat are the same note; in F sharp minor it's written F sharp."
     - "is the melody in key?" gives "Yes, every note of the melody is in A minor" (or names the notes outside the key).
     - The drums answer with their pattern description.
   - None of these adds an Undo step.
   - "can you…", "could you…", "why…", and anything with make/change/new/too stays a request. "can you make the bass simpler?" still simplifies it.
   - AI path: when the guard drops the AI's change for a question (add_bass or vary bass), the reply is this answer (`BATCH.local`).
4. **"slaps", "bangs", "hits hard" and "knocks" are praise.**
   - New `KEEP_SLAP` matches a part followed by slaps/bangs/knocks/hits hard/goes hard/rips/rocks.
   - It is not praise after make, let or can ("make the bass slap more" is a request).
   - The Slap Bass word in `INST_WORDS` no longer matches after drums/beat/kick/it/this.
   - Phrases that now work:
     - "the drums slap, change the chords": chords plus the following bass, and the drums stay.
     - "the beat slaps but the bass is too loud": bass −5 dB only.
     - "this kick slaps": no change, "Kept the drums as they are."
     - "the beat bangs, new melody" and "the drums hit hard, make the chords simpler".
   - "make the bass a slap bass" still switches the bass to Slap Bass.
5. **"make it shorter", "shorter" and "make them longer" after a part.**
   - `focusText` no longer treats longer and shorter as words about the whole song. The song is still meant when the words say song, loop, intro and so on.
   - "make the notes shorter" goes to the focus part.
   - `noteChange` keeps the focus when a request changed nothing and named no part, so one failure can't send the next "a bit louder" to the whole song.
   - Result: "change the melody", then "make it shorter" (melody shorter), then "a bit louder" gives melody +3 dB only.
6. **The AI's reply is checked against what really changed.**
   - New `honestReply` (actions.js) runs on the AI path in assistant.js. It removes the AI's sentences about:
     - a part the guard dropped that didn't change;
     - "whole song" or "everything" when a move was put onto one part;
     - full track or sections when arrange was dropped;
     - vibe or style when vibe was dropped;
     - key or tempo when those were dropped;
     - "volume N" when the volume was corrected.
   - Sentences that say a part was kept stay. If nothing is left, the reply is the list of real changes.
   - Examples:
     - [mix all −3] for "the bass is too loud": "Done: Bassline: down 3 dB (volume 72)."
     - "Here are fresh drums and new chords." becomes "Done: New chords: …; the bassline follows the new chords. Kept the drums as they are."
     - "New chords and a new melody on top." becomes "Done: New chords: …".
     - An honest AI reply ("Turned the bassline down 3 dB.") is kept as it is.
7. **Arrange and vibe no longer ride along with a one-part comment** (`onePart`).
   - When a part is named and the words aren't about the song, these are dropped:
     - arrange, unless the words say full track, arrange, structure, intro, outro, drop, break, build, section or song;
     - vibe, style or new_project, unless the words say vibe, genre, style, new song or start over, or the song has no other parts yet.
   - "the bass is too loud" + [mix bass −3, arrange full] changes only the bass volume.
   - "new drums" + [vibe trap, add_drums] changes only the drums. `PROJ.prog` stays, so "which chords are these" matches what plays.
   - "make it a full track" and "make it more trap" still work.
8. **Volume direction and octave on the AI path.**
   - New `volFix`: an absolute volume on a named part that goes against the words becomes a 3 dB step the right way. "too quiet", "can't hear" and "not loud enough" mean up.
   - "the melody is too quiet" [volume 20 from 40] gives +3 dB (0.48).
   - "the melody is too loud" [volume 100] gives −3 dB.
   - A mix or track_fx sent for "octave" words, with no transpose, is dropped, and the offline brain does the transpose. "play the bass an octave lower" [mix bass volume 60] gives "Bassline an octave lower, same notes and rhythm" (notes −12, volume unchanged).
9. **"everything except the melody should be quieter" and "everything but the melody is too loud".**
   - New `exceptNorm` turns "everything but the X" into "everything except the X".
   - It also moves an except phrase in the middle of a sentence to the end ("everything should be quieter except the melody").
   - Both phrases turn every part but the melody down 5 dB: "Turned every part but the melody down 5 dB, same notes. Kept the melody as it is."
10. **Going back.**
    - `ACT.revert` no longer uses up versions. It remembers which version each part went back to (`REVERT_AT`).
    - Going back again right after going back walks one more version back: "back to the version before that".
    - "original" or "first" (or `"to":"first"` from the AI) goes to the oldest version this session: "back to the first version".
    - Past the first version, Keys says honestly "These are already the first chords of this session. Say "new chords" for another one.", with no change.
    - "no, the other one" still toggles between the last two.
    - The bassline follows the chords at every step.

## Numbers (headless Chrome, whole-project diffs, tester's harness; my probes are in /home/claude/reports/ai9-fix2/)
- **New f2 set, 62 cases** covering all 10 problems plus my extra phrasings, offline and stubbed AI:
  - before: 17/62 right;
  - after: **62/62**.
  - Every change is one Undo, and every Undo restores the song exactly.
  - Questions and pure praise leave no Undo step.
- **Going back (t10b), 8 cases: 8/8.**
  - original/first after 2× new chords;
  - back ×2 = start;
  - back ×3 after 3× new = start;
  - the honest no;
  - "other one" toggles twice;
  - AI revert to first.
- **Memory chains (tester's m.mjs), 3 seeds:**
  - new chords ×2, then go back ×2, ends on the starting chords, with the bass root in the chord in 4/4 bars at every step (15/15 states).
  - "change the melody", then "no, the other one", then "make it shorter", then "a bit louder": melody only each time.
- **Tester's sets rerun on this build:**

  | Set | Result |
  |---|---|
  | T1 (round-1 problems) | 31/31 |
  | T3 | 27/27 |
  | T3b | 19/19 |
  | T4 (AI path) | 28/28 |
  | T6 (Song view, AI-1/4/6/8 phrasings) | 56/56 |
  | T7 | 12/12 |
  | T9 | 5/5 |
  | T10 | 10/10 |
  | T5 (sung bassline, imported Lead) | kept every time |

- **Sound** (offline `renderAudio`, 4-bar loop): no clipping and no silent blocks in any state.

  | State | Peak | RMS |
  |---|---|---|
  | Baseline | −0.58 dBFS | −6.8 dB |
  | After Try steps 1–2 | −0.65 dBFS | −6.8 dB |
  | After step 4 | −0.56 dBFS | −6.8 dB |

- **Page errors:** 0. The only console error is fonts.googleapis.com, which the proxy blocks.

## Prompt changes (`cloudflare/worker.js`; no backticks or `${`, syntax OK)
- **revert:** "\"go back\" again walks one more version back. Add \"to\":\"first\" for \"the original chords\" or \"the first bassline\"."
- **ONE PART AT A TIME**, after "Kept the drums as they are.": "A list protects every part in it ("keep the drums and bass, try another melody" = vary melody only). Praise with no verb protects too: "nice bassline!", "sick drums", "love those chords", "the drums slap", "the beat bangs", "this kick hits hard" (slap here is praise, never the Slap Bass sound). A question about a part ("is the bass in F sharp?", "what note is the bass playing?") changes nothing: answer it from the song, actions []. A comment about one part never brings arrange, vibe, style or new_project along. "too quiet" goes up, "too loud" goes down: use db steps, not an absolute volume."
- **New field:** `revert.to = "first"`. The executor also reads "original"/"first" from the words, so the test link works before the Worker deploy. No new action names.
- **Not run against Llama.** The connector's sandbox can't fetch the file from GitHub (403), so I didn't run the Llama test. Please run it at release (suggested requests below).

## For the lead
- **Worker deploy at release:** the prompt changed. Every guard runs in the page as well, so the test link behaves the same before the deploy.
- **Suggested Llama requests** (use the house loop state: drums, bass, chords, melody):
  1. "keep the drums and bass, just try another melody": expect vary melody only.
  2. "nice bassline! now make the melody a bit shorter": expect reshape melody shorter.
  3. "the drums slap, change the chords": expect vary chords only, with no instrument change.
  4. "what note is the bass playing?": expect actions [] and an answer.
  5. "the melody is too quiet": expect mix melody +db, not a lower volume.
  6. "the bass is too loud": expect mix bass only, with no arrange.
  7. "go back to the original chords": expect revert chords to first.
  8. "bassline badhiya hai, bas melody badal do": expect vary melody only.
- **Smoke:** I added 2 checks to the AI-9 block of `tests/smoke.mjs` (same page load) for problems 1–5. They cover the list, list on the AI path, nice bassline, sick drums, drums slap, beat slaps + bass too loud, the question offline and on the AI path, and "make it shorter" then "a bit louder".

## Files
- `src/actions.js`:
  - `KEEP_ADJ`, `KEEP_SLAP`, `KEEP_IMP`, `exceptNorm`, `praiseComma`, and the list logic in `protectSaid`;
  - `volDir`/`volFix` (with `ontoPart` using it);
  - `onePart` (arrange/vibe guard, octave guard, volume guard, the question answer, `BATCH.redirected`/`guardActs`);
  - `honestReply`;
  - `ACT.revert` and `REVERT_AT`.
- `src/maker.js`: `partAsk` (called from `askFix`), `focusText` (shorter/longer and notes), and the Slap Bass word guard in `INST_WORDS`.
- `src/assistant.js`: `honestReply` on the AI path; `noteChange` keeps the focus when nothing changed.
- `cloudflare/worker.js`: the prompt (above).
- `tests/smoke.mjs`: 2 checks.
- `index.html`: rebuilt.

## Known limits
- `partAsk` answers with the part's notes in the order they first sound (up to 6). It doesn't say whether "F sharp" is the bass's root. "Is the bass in F sharp?" gets the notes and the key, not a yes/no.
- "the drums are fine, make it louder" still turns up the drums, as in fix 1: the praised part is the target when nothing else is named.
- When `honestReply` removes every AI sentence, the reply is the change list ("Done: Bassline: down 3 dB (volume 72)."). It's correct, but it reads less naturally than the AI's sentence.
- Praise adjectives work only at the start of a clause. "the chords, nice, but…" isn't seen as praise.
- With no style word, "new drums" on an existing song keeps the song's tempo and vibe. To change the vibe, the user says "make it trap", or "trap vibe" for the whole song.

## Try it (for a musician; start with a house loop: drums, bass, chords, melody)
1. Say "keep the drums and bass, just try another melody". Only the melody changes, and Keys says "Kept the drums and the bassline as they are."
2. Say "nice bassline! now make the melody a bit shorter", then "sick drums, change the chords". First the melody gets shorter, then the chords change and the bassline follows them. The drums and the bassline's sound stay.
3. Say "the drums slap, change the chords", then "the beat slaps but the bass is too loud". The chords change, then only the bass gets quieter. The drums never change and never turn into Slap Bass.
4. Say "what note is the bass playing?" and "is the melody in key?". Keys answers from the song (notes, key and sound), and nothing changes. There's no new Undo step.
5. Say "change the melody", then "make it shorter", then "a bit louder". Each step changes only the melody.
6. Say "everything except the melody should be quieter". Every part but the melody goes down.
7. Say "new chords" twice, then "go back to the previous chords" twice. You're back on the chords you started with, and the bassline plays along each time. "go back to the original chords" jumps straight there.
