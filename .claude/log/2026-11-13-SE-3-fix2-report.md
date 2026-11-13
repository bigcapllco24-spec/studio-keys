# SE-3 fix round 2 (sound-engine-dev) · 13 Nov 2026

All three fixed, pushed to `preview-se-3`. Only `src/maker.js`, `tests/smoke.mjs` and the rebuilt `index.html` changed. `src/actions.js`, `src/groove.js` and `cloudflare/worker.js` are unchanged.

## N1: swing said about a part changed other parts
- **Change (`swingOnly` in `src/maker.js`):**
  - A part name (bass, bassline, chords, pads, melody, lead, keys, piano, synth, arp, "the whole track") and "in/into/for/across" now count as filler when swing words are present. So "more swing on the chords" is a swing-only request again and goes to the drums.
  - A part only counts as its own request after an add verb right before it: "add a bassline…", "make a bassline…", "give me some chords…". This is the new `SWING_ADD_PART`. "make **the** bass swing more" and "add more swing to the chords" are not add requests.
  - "hi-hats" / "hi hats" are now filler too.
  - Small extra fix: a drums track with no recipe (a custom pattern) plus a swing-only request now replies "Your drums are your own part, so I left their swing as it is…". Before, this fell through to the parser, which added Chords 2 for "more swing on the chords".
- **Check:** house beat (16th hats, 0.16) + bass + chords, through `handleRequest` with the offline parser. Each of these changed **only** the swing, with the same hits and hats and no new tracks: "more swing on the chords / melody / bass", "make the bass swing more", "less swing on the bass", "more swing in the groove", "less swing in the drums", "less swing in the hats / hi-hats", "add more swing to the chords", "more swing for the whole track", "a bit less swing on the keys", "give me a little more swing on the pads", "more swing on the claps / percussion". The tester's smoke line passes.

## N2: "faster" said about a part changed the tempo
- **Change:** new `FASTER_PART` in `src/maker.js`. A tempo step is skipped when faster, slower or quicker sits next to a part. That covers a part up to 2 words before ("make the bass a bit faster"), one word after ("faster chords"), and "speed up / slow down the bass".
- **Check:**
  - No tempo change (124 stays 124) for "make the bass faster", "make the chords faster", "faster chords", "make the melody faster" and "speed up the bass".
  - These still change the tempo:
    - "make it faster", "a bit faster" and "speed it up" go to 129.
    - "slow it down a lot" goes to 114.
    - "make it faster, 128 bpm" goes to 128.
    - "add a bassline and make it faster" goes to 129 and adds the bass.
    - "make it faster and add more swing" goes to 129 and 66%.

## N3: "add a snare roll" swapped the clap for a snare
- **Change:** new `plainClapSnare(t)` in `src/maker.js`. The backbeat swap only happens when nothing but filler follows "add a snare/clap" ("please", "too", "on 2 and 4", "instead"). Anything after "and/with/then" counts as a separate request.
- **Check:**
  - "add a snare roll" and "add a snare fill" give main's "couldn't turn that into a change".
  - "add a snare sound to the keys" does what main does (adds an Electric Piano).
  - "add a snare", "add a snare please" and "add a snare on 2 and 4" put the snare on 2 and 4.
  - "add a snare and more swing" gives the snare plus 66%.
  - "more swing and add a clap" gives 66%.

## Round-1 fixes still work
Reran my round-1 `fix.mjs` (`/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/fix.mjs`). The results are the same as round 1, with 0 page errors:
- **B1:** bassline + 66%, chords + 54%, congas + 66%, faster + swing.
- **B2:** "less swingy" / "swings too much" give 58%, "take the swing out" gives straight, "swing 100%" gives "the most it goes", and "deep house beat straight" works.
- **B3:** the words follow the numbers.
- **Chips:** one chip at 58% for "another one with less swing", offline and with the mocked AI.
- **B5:** the no-beat reply.

The probe script for this round is `/tmp/claude-0/-home-claude/d04c6e40-6e81-57be-8bab-61e4523d7bcb/scratchpad/se3f2/n.mjs`. No sound changed, so I didn't do a new render. check.sh's MP3 still decodes (727 KB, 31 s).

## check.sh
**CHECK OK, smoke 26/26.** Build, bundle syntax and Worker syntax pass. The tester's N1 line passes. I added one new line: "'faster' about a part keeps the tempo, 'add a snare roll' keeps the clap". It gives bass faster 0, faster chords 0, make it faster +5, snare roll keeps the clap, add a snare gives a snare.

## Last commit
`adcf6db` on `origin/preview-se-3`, after `4d3c01b` (the fixes and `index.html`).

## Known limits (not fixed, same as main)
- "can you swing the chords a bit more" still isn't understood as swing, so it adds Chords 2. That is the P2 phrasing gap, and main does the same.
- "make the bass faster" still re-runs the bassline and "faster chords" still adds chords. The tester says main does the same; only the tempo part was new.
- "make the beat faster" raises the tempo and also rebuilds the beat at the style default. The rebuild comes from main's "beat" handling. Worth a backlog note.
- Only the plain "add a clap" or "add a snare" changes the backbeat, so "add a snare roll" and "add a snare fill" still get the generic "couldn't". There is no fill or roll action yet.
