# AI-9 fix 8 report (assistant-dev) · 22 Nov 2026
Branch `preview-ai-9`, head **5210af0**, pushed. There are 2 WIP commits after 3e1639f: 2d02303 and 5210af0. `main` was not touched.

Files changed: `src/actions.js`, `src/maker.js`, `tests/smoke.mjs` (the AI-9 check now has 26 sub-checks), and `index.html` (rebuilt). **`cloudflare/worker.js` is unchanged**: no prompt lines and no Llama run. The fix 2 and 3 prompt changes still need the deploy at release.

**check.sh, two runs in a row:** both CHECK OK, SMOKE OK, 104 checks (loads 2.9 and 2.0). Two more direct smoke runs, side by side under load, both passed too: **4 of 4 runs green.**

One slip I caught myself: my first fix-8 edit used `KEEP_PW` before it was defined, so the page failed to load. The harness caught it before any commit; I moved the line and the commit passed check.sh.

## Fixes
1. **"it all" right after working on a part** (HIGH).
   - "it all", "all of it", "them all", "all of them" and "the whole thing / song / track / loop" now always mean the whole song. Three places used to turn the "it" into the part just worked on:
     - `focusText` (`maker.js`) no longer swaps that "it" for the focus part;
     - `askedParts` skips "it" before "all" and after "all of / whole of";
     - the guard's `BACK_SAID` ignores those phrases, and `SONG_SAID` now counts "it all", "them all" and "all of them" as the whole song.
   - Examples:
     - "make the bass quieter", then "change it all except the bass" [vary drums, vary chords, vary melody]: the drums, chords and melody change, and the bass stays (offline too);
     - "make the melody louder", then "redo it all except the chords": the drums, bass and melody change.
   - Offline "make it all new apart from the melody", "redo the whole thing except the drums" and Hinglish "sab kuch naya karo bass chhod ke" now give new takes of every other part.
   - A real "it" still means the part just worked on: "make it a bit louder" right after the bass changes the bass, and "change it" right after the melody changes the melody.
2. **The fix-4 smoke sub-check can no longer flake** (release blocker).
   - Before the "nah the melody is too busy make it simpler the drums are good though" step, the smoke now resets the song's melody to a fixed version: seed 5303, density and articulation reset.
   - "make it simpler" therefore always has notes to take out, whatever the earlier steps did.
   - 4 of 4 runs passed.

Nits, all done:
- After a question from Keys, "not now", "not yet", "maybe later", "abhi nahi" and "nahi nahi rehne do" keep everything. Repeated no's count as one no.
- "bass badhiya hai bas mat chhedo": a bare "mat chhedo / rehne do / dont touch / chhod do" after praise points at the part just praised, so the bass stays, offline and with [vary bass].
- "never mind the drums change the bass" changes only the bass: "never mind (about) the X" keeps X.
- "the bass sounds full and warm" is praise. A rest made only of praise words ("and warm", "and punchy") no longer makes the praised part the one to change.
- Offline "the chords sound way too full" makes the chords simpler instead of adding Chords 2. "too full / too thick / too dense / too much going on" now mean simpler.

## Numbers: every set, fix 8 against fix 7 and main, case by case
**Fix 8 is not worse than fix 7 or main on any case in any set.**

**Tester's sets** (`/home/claude/qa/ai9r4/`, q.mjs with the saved take; my runs and `cmp8.py` are in `/home/claude/reports/ai9-fix8/qa/`). The fix 7 and main numbers are the tester's own runs.

| Set | Main | Fix 7 | Fix 8 |
|---|---|---|---|
| p | 9/52 | 52/52 | **52/52** |
| new | 43/96 | 96/96 | **96/96** |
| probe | 40/87 | 87/87 | **87/87** |
| probe2 | 8/13 | 13/13 | **13/13** |
| probe3 | n/a | 42/42 | **42/42** |
| probe4 | 17/20 | 20/20 | **20/20** |
| probe5 | 24/32 | 32/32 | **32/32** |
| probe6 | 22/30 | 30/30 | **30/30** |
| r5 | 94/143 | 143/143 | **143/143** |
| r6 | 58/108 | 108/108 | **108/108** |
| **r7** | 46/81 | 72/81 | **81/81** |
| **redo** | 5/20 | 14/20 | **20/20** |
| **redo2** | 4/20 | 6/20 | **20/20** |
| **try7** | n/a | 51/54 | **54/54** |
| hq | 8/8 | 8/8 | **8/8** |
| hq6 | 11/12 | 12/12 | **12/12** |
| q5 | n/a | 4/4 | **4/4** |
| full | 4/4 | 4/4 | **4/4** |
| chains | n/a | 81/81 | **81/81** |
| chainC | n/a | 24/24 | **24/24** |
| sung | n/a | 18/18 | **18/18** |
| old | n/a | 180/180 | **180/180** |
| nits | n/a | 12/13 | **12/13** |
| hr | n/a | 5/5 | **5/5** |
| hr2 | n/a | 3/3 | **3/3** |

The nits miss is the accepted offline wording "Melody: shorter, tighter notes".

**My sets** (`/home/claude/reports/ai9-fix5/mine/`; every case run on fix 8, fix 7 and main):

| Set | Main | Fix 7 | Fix 8 |
|---|---|---|---|
| p | 10/53 | 53/53 | **53/53** |
| new | 32/90 | 90/90 | **90/90** |
| x | 23/52 | 51/52 | **51/52** (the accepted "yo keys" miss) |
| old | 67/180 | 180/180 | **180/180** |
| nits | 3/10 | 10/10 | **10/10** |
| n5 | 61/128 | 128/128 | **128/128** |
| n6 | 51/91 | 91/91 | **91/91** |
| n7 | 33/66 | 66/66 | **66/66** |
| **n8 (new)** | 6/31 | 9/31 | **31/31** |

**n8, the new fix-8 set, has 31 cases:**
- "it all" right after another part, offline and with Llama:
  - "change it all except the bass"
  - "redo it all except the chords"
  - "redo it all apart from the bass"
  - "make it all new apart from the melody"
  - "redo the whole thing except the drums"
  - "change everything except the melody"
  - "sab kuch naya karo bass chhod ke"
  - "give me new everything apart from the drums"
  - "change all of it except the melody"
  - "redo it all but keep the bass"
- Real pronouns that must still mean the part: "make it a bit louder" after the bass, "change it" after the melody.
- Each of the nits, with and without a Llama mistake.

**Sound** (`renderAudio`, 4-bar loop, after the 10-sentence chain × 3 seeds):
- peak −0.47 to −0.57 dBFS, RMS −6.7 to −6.8 dB, 0 clipped samples;
- the sung bass was kept in 3/3 chains;
- page errors: 0.

**Smoke:** the tester's 2 lines are merged into the existing AI-9 check (26 sub-checks, no new page load):
- "make the bass quieter", then "change it all except the bass" [vary drums, vary chords, vary melody]: the drums, chords and melody change;
- "make the melody louder", then "redo it all except the chords" [vary drums, vary bass, vary melody]: the drums, bass and melody change.

## For the lead
- No Worker change in fix 8. The fix 2 and 3 prompt changes still need the deploy at release.
- Known limits (unchanged):
  - "which instrument is playing the chords" lists the chord names;
  - "the bass is great the chords need work" offline re-adds the chords;
  - a bare wake word with a made-up Llama action isn't guarded.

## Try list for a musician (say it like this, no punctuation)
Start with a beat that has drums, bass, chords and melody.
1. "make the bass quieter", then "change it all except the bass": new drums, chords and melody, and the bass stays as it is.
2. "make the melody louder", then "redo it all except the chords": new drums, bass and melody, and the chords stay.
3. "make the bass quieter everything else is fine": only the bass goes down.
4. "drums acche hai par thode loud hai": only the drums go down.
5. "never mind the drums change the bass": a new bassline, and the drums stay.
6. "the melody feels a bit busy": Keys offers to make it simpler. Say "not now" and nothing changes, or say "yes" and the melody gets simpler.
7. "make the bass louder" a few times, until Keys says the bass is already at full volume. It still asks its follow-up question.
8. "the bass sounds full and warm": nothing changes, and Keys says it kept the bassline.
