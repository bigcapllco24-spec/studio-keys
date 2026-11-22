# AI-9 · fix 4 (relaunch) · assistant-dev · 22 Nov 2026 (09:13 IST check-in)

Relaunch note: the 08:13 check-in briefed this (below) but nothing was pushed to preview-ai-9 for over 90 minutes, so that run is taken as stopped. FIRST: `git ls-remote origin preview-ai-9`. If the head is no longer b1d2bf8, another developer is working on it: stop and report that. Otherwise do the brief below and push your first WIP commit within about 20 minutes, then after each step.

Read `.claude/standards/dev-standards.md` first. The section that matters, "Owner rules from 19 Nov 2026", first bullet: "Keys keeps a step-by-step memory of the conversation and of what it changed. A comment about one element ('make the bass softer') changes ONLY that element; it never redoes or regenerates the rest of the project (AI-9)." Also "How we build" (build with `python3 tools/build.py`, never edit `index.html` by hand) and the release rules (no backticks or `${` in `cloudflare/worker.js`).

Clone fresh: `git clone -q https://github.com/bigcapllco24-spec/studio-keys /home/claude/sk-ai9f && cd /home/claude/sk-ai9f && git checkout preview-ai-9` (head b1d2bf8). Read your fix 3 report `.claude/work/reports/AI-9-fix3.md` and the tester's re-check 3: `.claude/work/reports/AI-9-retest3.md` (on main). NOT READY. The tester's scripts from re-check 3 were lost in a machine restart, so rebuild the cases you need from the phrases in that report.

The key point (same as before): the owner TALKS to Keys. Chrome speech has no punctuation or apostrophes. Every rule must work on unpunctuated speech, and the in-page guard must never block a correct AI action that main runs. When in doubt, prefer running Llama's action for the part the user did NOT praise over blocking everything.

Fix (problem numbers from re-check 3):
1. (HIGH) A leading filler word turns praise protection off. "nice the melody is great now", "nice the melody is great", "okay okay the chords are fire bro", "okay the chords are fire": offline these rewrite/re-add the praised part; on the AI path a wrong Llama [vary melody] / [vary chords] / [add_melody] goes through. Strip filler (nice, okay, okay okay, ok cool, yo, bro, so, honestly, nah, yaar, bhai) but keep marking the praise clause after it. Pure praise must leave no Undo step.
2. (HIGH, regression on the AI path) A protect phrase with a pronoun, "those", or in Hinglish swallows the request after it:
   - "chords ko mat chhedo melody nayi do" and "melody nayi do chords ko mat chhedo": AI [vary melody] blocked (main runs it). Must change the melody only.
   - "yo keys the bassline is sick dont touch it or the drums try new chords", "the bassline is sick dont touch it try new chords": AI [vary chords] blocked. Must change chords only (bass kept, chords fit it).
   - "bass mast hai usko rehne do chords badlo": AI [vary chords] blocked.
   - "the melody and the chords are vibing leave those make the bass bouncier": AI [reshape bass busier] blocked.
   - "so the beat is cool and all but the chords feel kinda flat can we try something else": offline "couldn't turn that into a change", AI [vary chords] blocked.
   Resolve "it", "them", "those", "usko", "unko" to the part(s) just praised/named; stop the protected list at the next request verb or part + request word (try, change, give, make, new, nayi, badlo, karo, do, switch, swap); "and all" is filler, not a list.
3. (MEDIUM, owner rule) Praise words the guard doesn't know: "go crazy", "are crazy", "bahut acche hai", "acche hai", a trailing "… the drums are good though". Offline these regenerate/simplify the praised drums; on AI, [add_drums, vary chords] / [add_drums, vary bass] / [reshape melody, groove energy 2] rewrite the praised drums. Add these to the praise words (KEEP_PRAISE), handle praise at the END of the sentence, and in `maker.js` the offline "simpler" must target the part with the complaint ("the melody is too busy"), not the part named last.
4. (LOW-MED) "the chords are beautiful keep them and the bass make the melody happier" (offline): melody replaced rather than made happier, and the bass is re-added with a new seed and named in the reply. Should: happier melody only, chords and bass untouched, no "Bassline" in the reply.
5. (LOW) "the drums and bass are perfect just do something with the melody" (offline) answers with the melody notes. Should: new melody.
Nits worth doing if cheap: "Melody shorter notes." → "Shorter melody notes."; honestReply should drop "Turned the whole song down a bit." when the only change was the bass −3 dB; the offline reply tip should match the part being worked on (no chords tip when working on the bass); Try wording for rule 7 should say "fits most bars" rather than promising every bar.

Add the tester's suggested smoke lines, offline and with the correct AI action, plus the Llama mistake:
- "nice the melody is great now" [vary melody] → no change
- "okay okay the chords are fire bro" [vary chords] → no change
- "chords ko mat chhedo melody nayi do" [vary melody] → melody only
- "the bassline is sick dont touch it try new chords" [vary chords] → chords only, bass kept
- "nah the melody is too busy make it simpler the drums are good though" [reshape melody, groove energy 2] → melody only
- "yo the drums go crazy bro give me some new chords" [add_drums, vary chords] → chords (and the bass following) only
Keep check.sh within its time (it was ~3.5 min).

Then run your own wider sweep: at least 20 NEW spoken phrasings you haven't tested (filler, Hinglish, pronouns, praise at the end, questions), offline and with a correct and a wrong Llama action, and make sure all old sets still pass (p2, p3, p4, p6, hr, rv, f2, n, try, T1-T10 as far as you can rebuild them). Real Llama 3.3 test of the branch prompt (via the Cloudflare connector if you have it; otherwise say so) only if you change prompt lines.

Prompt lines only if the AI path needs them (no backticks, no `${`). Rebuild index.html. `bash .claude/tools/check.sh` must pass (check `uptime`; rerun once on a timeout flake). Commit and push `preview-ai-9` after each step (never main) — the push is how the next check-in knows you're alive. Report: fixes, numbers, head hash, updated Try list for a musician (phrases the way the owner would say them, without punctuation; 6-8 steps), Llama test requests if any. Save as you go to /home/claude/reports/AI-9-fix4.md, and reply with the full report text.
