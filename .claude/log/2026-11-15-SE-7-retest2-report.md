# SE-7a re-check after fix 2 (qa-tester) · 15 Nov 2026
Branch `preview-se-7` at 2ede507 ("SE-7a fix 2"), plus my smoke commit (below). Worktree `/home/claude/wt-se-7`.

## Verdict: READY
Both bugs from my last check are fixed. Nothing new broke near the change, and the check passes.
- **Bug 1 is fixed:** picking a key now moves your parts when the key came from your own notes (a hum or chords you played). It works with the AI action and with the Key menu. It is one undo step, and Undo puts every note back.
- **Bug 2 is fixed:** the key chip now follows piano-roll edits (drawing, the transpose buttons, the arrow keys, undo). It doesn't update while you drag, only once after you let go.
- The popover's **Set** still only relabels. A key that Keys, a vibe or a sung take picks never moves notes on its own.

## Bugs
None new.

## Rough edges (not bugs, nothing to fix for this item)
- **A sung take after a hum can change the auto key.** I hummed D minor and then sang the melody with the fake mic (11 notes, A C G E). The chip went from "D minor · from your humming" to **"C major · from your singing"**. No notes moved, and C major fits every note in both takes, so it's defensible, but a musician who hummed D minor may be surprised.
- **Picking a related key moves the parts by the tonic only** (the developer lists this as a known limit). On a D minor hum, picking F major moves everything up 3 semitones, the same as the old set-key move.
- **The offline parser still has no action for "change the key to C minor"** (same as main, as the brief says). I used the `key` action mock.
- When a key is set, the chip shows just "set" and the key name sits in the Key menu next to it. That is the same design as before (see `r2-390-set.png`).

## What I checked (numbers)
1. **`bash .claude/tools/check.sh`**
   - On 2ede507 as delivered: **CHECK OK, SMOKE OK 56 checks, 0 FAIL**.
   - With my extended smoke line: **CHECK OK, SMOKE OK 56 checks, 2 min 0 s**, under the 3-minute limit.
2. **Bug 1, picking a key when the key came from your notes**
   Every flow below has **1 undo step**. Undo brings back the old chip text with the notes exactly as before, and the Key menu goes back to "Key: auto". Redo moves them again (0 outside).
   - **Hum, then the AI action.** I hummed 12 notes with the real `humNote` path (D F A G F E D C D F E D). The chip read "D minor · from your humming". Then "add a bassline", "add chords", and the `key` action C minor.
     - Notes outside C minor: hummed melody 3/12 → **0**, bassline 0/8 → **0**, chords 8/24 → **0**. The first hummed D4 lands on C4.
     - The chip and the popover agree: "C minor · set" / "You set this key. New parts follow it. Your notes sound like **C minor**". Before the fix, the popover still said D minor.
     - Repeat run: the same numbers.
   - **The same hum flow, Key menu → C minor:** the same result. 3/12, 0/8, 8/24 → 0/0/0, one undo step, and Undo restores the notes.
   - **Am chords you play, Keys' bassline, then Key menu → C minor.** Before: "A minor · sure", with my chords 5/12, the bassline 12/16 and the chords 28/48 outside C minor. After: **0 / 0 / 0**, and A3 lands on C4. The popover's first guess is C minor.
   - **The same, with the AI `key` action:** identical numbers.
   - **New parts after the pick:** on a hummed song set to C minor, Keys' bassline, chords and melody are **0/16, 0/48 and 0/20** outside C minor, and the hummed melody stays at 0/12.
   - **Edge cases:**
     - Picking the same key as your notes (D minor on a D minor hum): no notes move, and the chip reads "D minor · set".
     - Picking a key on an empty song: "C minor · set", no errors.
     - Key menu → auto after a pick: the notes stay where they are, and the chip reads "C minor · likely".
3. **The popover's Set still only relabels.** On played D minor chords plus Keys' bass, I clicked Set on the 2nd guess (F major), then the 1st (D minor), then the 3rd (C major), with real clicks.
   - The notes were **unchanged every time**, and each click added 1 undo step.
   - Undo went back to the previous set key, again with the notes unchanged.
   - (My first script looked like Set moved notes. That was my own test calling undo before the step had landed. A rerun with the clicks spaced out is clean.)
4. **Keys-picked, vibe and sung-take keys don't move notes on their own.** Each case below starts from a D minor hum:
   - `setKey(C minor, 'keys')` → "C minor · Keys picked", notes unchanged.
   - `setKey(F minor, 'vibe')` → "F minor · from the vibe", notes unchanged.
   - The vibe action (Ben Böhmer) with drums and bass → the key stays "D minor · from your humming", and the hum is unchanged.
   - A sung take (`takeKey`, sing) → the hum is unchanged.
   - A real fake-mic sung melody after the hum (11 notes) → the hum is unchanged (see the rough edge about the chip).
5. **Bug 2, the chip follows the piano roll** (real mouse clicks in the editor, 1400 px)
   - **Drawing on an empty track:** the chip read "no key yet" at 3 and 6 notes, then "D minor · likely · or F major" at 9 and 12 notes. It matches `keyStatusText()`.
   - **Ctrl+A, then +1 twice (transpose all +2):** the chip shows **"E minor · likely · or G major"**.
   - **↓↓ with the arrow keys:** back to "D minor".
   - **Undo ×2:** back to "E minor". The chip followed every step.
   - **Drag lag:** I dragged one note through 40 mouse moves. `renderKeyChip` ran **0 times during the drag and once after release**. Moves took 18–25 ms on average (max 32–57 ms, puppeteer round trip).
   - **Cost:** `edChanged` 0.8–1.1 ms, `renderKeyChip` 0.16–0.2 ms. There's no lag.
   - **No-key popover:** the button now says **"Close"**. It closes the popover and leaves the key empty.
6. **Quick regression at 390 px (Emerald theme)**, with the popover open in 5 states:
   - The chip reads "no key yet", "D minor · likely · or F major", "Keys picked", "D minor · from your humming" and "set" (with C minor in the menu).
   - In every state, the popover sits at 16–374 px with no sideways scroll, and the smallest button is 36 px.
7. **No page errors** in any run. The only console line is the blocked network fetch (offline sandbox), the same as on main.

## Smoke change (pushed to preview-se-7)
I extended the developer's line 56 (it is still 56 checks):
- The chip follows a transpose of +2 in the piano roll (D minor → E minor).
- A key that Keys or a vibe picks never moves notes whose key came from a hum (the note stays on 62 in both cases).

## Screenshots
`/home/claude/qa-se7r/`:
- `r2-humAI.png`, `r2-humMenu.png`, `r2-amMenu.png`, `r2-amAI.png`: after each key change
- `r2-draw.png`, `r2-drag.png`: the piano roll
- `r2-390-none.png`, `r2-390-likely.png`, `r2-390-keys.png`, `r2-390-hum.png`, `r2-390-set.png`: the chip states at 390 px with the popover open

Scripts and logs: `r11.mjs` (bug 1 flows), `r12.mjs` (bug 2 and 390 px), `r13.mjs` (Set relabel), `check-r2.log`, `check-r2b.log`.
