# SE-7c assistant part · 15 Nov 2026 (17:13 IST check-in) · assistant-dev

Read `.claude/standards/dev-standards.md` first (new actions need the worker prompt + `actions.js` + `maker.js` + a smoke line; `cloudflare/worker.js` must contain no backticks and no `${`; Copyright: never copy a song's melody). Your role file is `.claude/agents/assistant-dev.md`.

**Item SE-7, phase 7c, assistant part (Build mode).** The owner approved SE-7 on 14 Nov: "DJ key" label (never "Camelot"); his note "If user wants the same melodies or chords, it lets them do it - the user has a free pass" (so "put those chords on my song" just works; Keys still offers "a new melody over these chords" rather than copying the song's melody note for note). Approved proposal: `.claude/work/proposals/SE-7.md`, section 2 step 9-10 and section 4 "7c" → assistant-dev. The engine is done on this branch: read `.claude/work/reports/SE-7b-build.md` ("What 7c needs") and `.claude/work/reports/SE-7c-engine.md` ("What assistant-dev must call") for every function name and shape.

Build (each action in the worker prompt, `actions.js`, `maker.js`):
- `analyse_song {track}`: reports key, BPM and chords with reasons (`key.why`, `cands[].why`: "the bass sits on E"), never changes the song; "E minor at 124, I'm fairly sure. It could be G major; the bass sits on E. Set your song to E minor?" The key changes only on "yes".
- `chords_from_audio {track, bars, to:"mine"|"song", bass}` → `addSongChords`; reply with `r.text` (says when chords moved to your key).
- `set_chord {bar, chord:"Bm"}` → `setChord`.
- `match_key {track}`: for a MIDI loop moves its notes; for an audio loop offers to move the song to the loop's key (`ana.key`).
- Existing `key` action gains `"from"` and `"key":"auto"` to unlock.
- Offline phrases (maker.js): "what key is this (song)", "what chords", "analyse this song", "put/take/use those chords on my song", "make bar 4 B minor", "match this loop to my key", plus Hinglish where natural.
- The engine dev's two notes: in `vary` for chords call `clearChords()` before `ensureProg(true)` when `PROJ.chords` is set (or ask "Your chords are from the song; replace them?"), and pass `heldChordStyle(t.inst, s)` to `genChords` in `regenTrack`.
- Test the prompt on Llama if you have the Cloudflare connector (account d9810812643ee32e2460689ca2ff73eb, `/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`, same settings as `askLlama`) with 6-8 requests; otherwise say so.

Another developer (studio-ux-dev) works on the same branch at the same time in another worktree (studio files). You touch only your files. Before each push: `git pull --rebase`; if `index.html` conflicts, take either side, rerun `python3 tools/build.py`, add it and continue.

Work only in your worktree `/home/claude/wt-se-7bc-ai` (local branch `se-7bc-ai` tracking `origin/preview-se-7bc`; push with `git push origin HEAD:preview-se-7bc`; never check out other branches there, never merge main). Rebuild `index.html` with `python3 tools/build.py`; `bash .claude/tools/check.sh` must pass (save/reopen checks are load-sensitive: rerun once). Save WIP commits and push `preview-se-7bc` at checkpoints (never main). Report to `.claude/work/reports/SE-7c-ai.md` on the branch (commit and push): actions, phrases, Llama results, smoke lines you want from qa-tester. Final message: the report text.
