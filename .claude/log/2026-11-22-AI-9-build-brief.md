# AI-9 · Bug fix (Build mode) · assistant-dev · 22 Nov 2026
Read `.claude/standards/dev-standards.md` first. Sections that matter: "Owner rules from 19 Nov 2026" (first bullet is this item), "Production and assistant rules" (one element at a time; "add a choir/melody" adds a NEW track; replace only when the user says replace or change), "Quality bar" (every action in worker prompt + actions.js + maker.js; undoable; reply in musical words).

Branch: `git clone -q https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-ai9 && cd /home/claude/sk-ai9 && git checkout -b preview-ai-9 origin/preview-ai-1` (AI-1 is approved and releases tonight once the tester re-checks adf0a70; build on it so you don't merge twice. If preview-ai-1 gets fix commits, merge them in).

## The owner's bug (19 Nov, his words)
"Keys doesn't keep track of all the changes and the step-by-step integration — when I make a comment, it reiterates the entire project rather than the individual element I was talking about — so it forgets the context and the history."

## Evidence (tester 21 Nov, offline brain; `.claude/work/reports/QA-1-daily-2026-11-21.md`)
- "make the bass simpler", "simpler bassline", "make the bassline busier", "make the melody simpler" regenerate the DRUM groove.
- HIGH: "new chords"/"different chords"/"try other chords" with a melody present: chords stay identical, the progression changes and bass+melody are rewritten to follow, reply wrong (chordPlan() in music.js fits chords to melodyNotes(); vary redoes chords before melody).
- HIGH: "change/replace the chords", "change the melody", "change the chords to something happier", "make the chords shorter/longer/warmer", "the melody is too busy", "put the chords on a piano" add a second track (Chords 2, Grand Piano) and the old one keeps playing. "change the bass"/"switch the bass to an 808" are right.
- "change the bassline" gave the identical bassline 6 of 10 times while claiming a change.
- LOW: "stop listening"/"keys stop listening" stops playback, not listening; "turn off the mic" does nothing.
- LOW: "make the drums busier" at top energy changes 0 hits but says "Done".
- LOW: "which chords are these" and "make the chords Am F C G" add a random Chords 2 (a question gets an answer; named chords: at least don't add a random track; playing exactly the named chords is a separate idea).
- Live AI (lead's Llama test tonight): "add a bassline and give me another one" → [add_bass, vary drums]; actions.js has no guard (ACT.vary uses whatever track the AI sends).

## Job
1. **Conversation memory.** Check what history the page sends to /api/assistant (assistant.js) and what the Worker keeps (last 8 messages, 800 chars each). Make Keys follow the thread: send a compact "what changed so far" log (last ~10 changes: action + part + one-line result) in the state, and make the prompt use it ("make it softer" right after talking about the bass = the bass; "no, the other one", "go back to the previous chords"). Keep it inside the 7,000-character state cut (put it near the top, after arrangement).
2. **One part only.** A comment about one part touches only that part — in the AI path (an executor guard in runActions: if the user's words name one part, drop actions that regenerate/vary/replace OTHER parts unless the words also name them; the "another one" after adding a part rule) and offline (maker.js). "change/replace X" replaces X in place (same track, new notes or new instrument), never adds a second copy. "new chords" with a melody: the chords really change and the melody stays (keep the sung/played melody; generated bass may follow the new chords — say so).
3. The LOW bugs above.
4. **Sung parts (from UX-14, studio-ux-dev's report `.claude/work/reports/UX-14-build.md`, "Needs other owners")**: the two worker prompt changes for `sing` it lists; maker.js "record my bassline", "let me record the bass with my voice" → sing:bass, "i'll hum it" → sing:melody; delete the hum-flush key snap in assistant.js (~line 158 `if(key) ev.forEach(e=>e.n=snapToKey(e.n,key));`); in `vibe`, when the user names a key set `PROJ.keyBy='you'`. (UX-14 adds a `singAlone()` guard to runActions on its branch; don't duplicate it — your guard and it will be merged; keep yours compatible.)
5. From SE-4's report: the vary reply writes every Roman numeral lower case (minor should read VI–III–VII–i); regenTrack forgets the `cs` override (store t.cs and pass it through).
6. Test on 30+ one-part phrasings offline AND with the AI path by feeding runActions the actions Llama would send (the lead will run the live Llama test at release). Snapshot-diff the whole project per request: only the named part changes. Add smoke lines.
7. `python3 tools/build.py`; check.sh must pass (save/reopen pair flakes under load). Keep worker.js free of backticks and `${`. Commit and push preview-ai-9 after each step (WIP fine). Never push main. If you need music.js changes for chordPlan, make the smallest one and list it.

## Report
Causes, fixes, numbers (phrasings tested, before/after), check.sh line, head hash, the exact prompt changes (so the lead can test them on Llama), and 4-5 "try" steps for the owner.
