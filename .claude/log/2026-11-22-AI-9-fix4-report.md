# AI-9 fix 4 report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9`, head **638c3c5**, pushed. There are 4 WIP commits after b1d2bf8: 4edab37, fbd8bb6, 956098f and 638c3c5. `main` was not touched. Before I started, the branch head was still b1d2bf8, so no one else was working on it.

Files changed: `src/actions.js`, `src/maker.js`, `src/assistant.js` (one line, the tip), `tests/smoke.mjs` (one new check), and `index.html` (rebuilt). **`cloudflare/worker.js` is unchanged**: no prompt lines, so no Llama test was needed and nothing new needs deploying for fix 4.

**check.sh: CHECK OK, SMOKE OK, 103 checks** (102 before, plus 1 for fix 4), about 2.3 min.
- One known flake, not in my files. "song: opening the app starts a new empty song; the last one reopens…" and its follow-up "Undo right after opening a song…" failed in 2 of my 7 smoke runs: in 2 of 4 check.sh runs, and in 0 of 3 direct runs.
- When it fails, the reloaded song still has the old name, "Smoke sing". The rename save hadn't reached IndexedDB before the reload, which the test waits only 600 ms for.
- The baseline b1d2bf8 passed 3 of 3 runs that I ran alongside mine. The final check.sh run passed.
- This is studio-ux-dev / qa-tester ground (`store.js` / smoke timing), so it's worth a look.

## Fixes (problem numbers from re-check 3)
1. **A filler word before praise** ("nice the melody is great now", "okay okay the chords are fire bro", "okay the chords are fire").
   - When everything left after the praise is filler, the request is pure praise. The filler words are nice, okay okay, ok cool, yo, bro, so, honestly, nah, yaar, bhai, now, keys and the assistant's name.
   - The praised part stays protected. Offline, nothing changes, there is no Undo step, and the reply is "OK. Kept the melody as it is."
   - Llama's wrong [vary melody] / [add_melody] / [vary chords] is dropped.
2. **Keeps with a pronoun or in Hinglish no longer swallow the request.**
   - `speechComma` now ends the kept list at the request:
     - "dont touch it", "leave those", "keep them", "keep em";
     - "usko / unko rehne do", "unhe mat chhedo";
     - "chords ko mat chhedo" wherever it sits in the sentence (before or after "melody nayi do");
     - "drums chhod do", "waise hi rehne do".
   - `protectSaid` resolves it / them / those / usko / unko to the parts just praised or kept.
   - The list stops at a part that has its own request and no other part after it: "dont touch the drums chords badlo" keeps the drums and changes the chords.
   - "and all" / "and stuff" before "but" or at the end is filler. It no longer becomes "all but the chords" = "except the chords".
   - Hinglish request words (badlo, karo, nayi do, banao) count as requests.
   - All six re-check 3 sentences now change only the asked part, offline and with Llama's correct action. In the bass cases the bass is kept and the chords fit it.
3. **New praise words:**
   - go crazy, are crazy (but not "crazy loud"), vibing, a vibe, insane, unreal, bomb, legit, heat, magic, fantastic, epic;
   - "mad good", "hella good";
   - Hinglish acche / achhe / acchi / kamaal / jhakaas, with bahut / bohot / ekdum before them.

   Praise at the END or in the middle is its own clause: "…make it simpler the drums are good though", "change the bass the melody is great though", "bass badlo drums mast hai", "change the chords i love the drums". "so" and "just" before praise stay part of it ("the melody is so good now", "the drums are just perfect"). Before, "so" split the sentence.
   - In `maker.js`, offline "simpler / busier / shorter" goes to the part named just before the shape word when several parts are named (`roleBefore`), not the first part in the role list.
4. **"the chords are beautiful keep them and the bass make the melody happier"**: the melody only, and the chords and bass are untouched.
   - New: "make the melody happier / sadder" is `vary melody` with a mood. It picks, from 6 new melodies, the one that sits higher on the bright chord tones, or lower on the dark ones. The reply is "Melody: a new melody, leaning happier".
   - Praised lists are one clause: "i love the drums and the chords new bassline please" keeps both.
5. **"the drums and bass are perfect just do something with the melody"** now gives a new melody. "do something (with)…" and "something else / different" count as asking for a new version, not a question.

Also, found in my own sweep:
- "dont change anything except the chords" and "keep everything but the bass" now change that part. Before, the guard kept it.
- "what if we kept the drums and changed the melody" now changes the melody only.
- Pure praise of the whole song keeps every part, even when Llama sends a change. These phrases count: "everything sounds great", "this track is fire", "i love it", "leave it like that", "aise hi rehne do". Bare "sounds good" does NOT count, because it can mean yes to a question.
- "the bass and melody need work give me new ones" offline gives new versions of both.
- "make the bass bouncier" (bass named) gives a busier bass. "bounce" alone or on the beat is still swing.

Nits done:
- The short reply now says "Shorter melody notes.".
- honestReply drops "Turned the whole song down a bit." when only one part moved. The reply becomes "Bassline down 3 dB.". "Kept everything else as it is." stays.
- The offline tip names the part being worked on, for example "more reverb on the bass".
- Rule 7: the Try wording below says "fits most bars".

## Numbers (my harness `/home/claude/reports/ai9-fix4/h.mjs`)
How each case runs: fresh 4-part house loop (seeds 5300 to 5303), then `handleRequest`. For AI cases, `/api/assistant` is stubbed with Llama's actions and a reply. The harness diffs every track (sound, seed, volume, EQ, effects, notes) and checks exactly one Undo step, that Undo is exact, and 0 Undo steps for no change.

| Set | Before (b1d2bf8) | Now |
|---|---|---|
| p: re-check 3 problems 1 to 5 (offline + correct AI + Llama mistakes) | 12/53 | **53/53** |
| new: 30 new spoken phrasings × (offline, correct AI, wrong AI) | n/a | **90/90** |
| x: 16 more new phrasings × 3, plus 4 honest-reply checks | n/a | **52/52**, 1 accepted |
| old: rebuilt p2/p3/p4/p6/f2/n/try phrases (89 phrases × offline + correct AI, plus 5 Llama mistakes) | n/a | **180/180** |
| nits: honest reply, tip, song praise | n/a | **10/10** |

- The p set compares against the baseline. The other sets are new, so they have no baseline number.
- The one accepted miss in the x set is "yo keys" with a made-up [vary drums]. Pure wake-word filler with no praise isn't guarded, and Llama doesn't send that.
- Chains (`try.mjs`): the 10 re-check 3 sentences in a row, over 3 seeds, all right.
- **Sung bassline**: the same chains with the bass marked as sung. The bass was kept in 30/30 comments, and "make the bass bouncier" leaves the sung bass alone.
- **Sound** (`renderAudio`, 4-bar loop), 0 clipped samples:

  | State | Peak | RMS |
  |---|---|---|
  | start | −0.54 dBFS | −6.7 dB |
  | end of chain, seed 5300 | −0.55 dBFS | −6.7 dB |
  | end of chain, seed 6100 | −0.51 dBFS | −6.7 dB |
  | end of chain, seed 7300 | −0.44 dBFS | −6.9 dB |

- Page errors: 0.
- **Smoke:** one new check, "AI-9 fix 4". It covers the tester's 6 suggested lines, offline and with the AI. The Llama mistakes are [vary melody], [vary chords], [vary chords, vary bass], [reshape melody, groove drums energy 2] and [add_drums, vary chords].
  - "nice the melody is great now" also checks that there is no Undo step.
  - Its AI half for the trailing-praise line checks only that the drums aren't touched. In the smoke's running song, the melody is already at its simplest by then.
- **The tester's lost scripts are rebuilt only from the phrases in the reports.** The T1–T10 Song-view and export sets were not rebuilt one for one. The smoke checks covering them pass.

## For the lead
- No Worker change in fix 4. The fix 2 and 3 prompt changes still need the deploy at release.
- The reload smoke flake is described above.
- Known limits:
  - "the bass is great the chords need work" offline still re-adds the chords.
  - "make the drums sound good" is still read as praise.
  - "which instrument is playing the chords" lists the chords.
  - "how many bars is the loop" isn't answered offline.

## Try list for a musician (say it like this, no punctuation)
Start with a beat that has drums, bass, chords and melody.
1. "nice the melody is great now": nothing changes, and Keys says it kept the melody. Same with "okay okay the chords are fire bro".
2. "the bassline is sick dont touch it try new chords": new chords, the bassline stays exactly as it is, and the new chords fit it in most bars.
3. "chords ko mat chhedo melody nayi do": a new melody, and the chords stay. Also try "bass mast hai usko rehne do chords badlo".
4. "yo the drums go crazy bro give me some new chords": new chords, the drums stay, and the bassline follows the new chords.
5. "nah the melody is too busy make it simpler the drums are good though": the melody gets simpler, and the drums stay.
6. "the melody and the chords are vibing leave those make the bass bouncier": only the bassline gets busier.
7. "the chords are beautiful keep them and the bass make the melody happier": a new, brighter melody, and the chords and bass stay.
8. "the drums and bass are perfect just do something with the melody": a new melody. Then "everything sounds great": nothing changes.
