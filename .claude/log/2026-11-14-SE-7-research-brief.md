# SE-7 research brief (music-researcher), 14 Nov 2026 — RES-6
Read `.claude/standards/dev-standards.md` first (especially "What Studio Keys is for", "How we build": everything stays in the browser, no new external services, and "Copyright").

## The owner's request (HQ, 14 Nov 01:48 IST)
"the key detector aint working - check that. we should be able to detect live keys//chords from the songs being played and replicate elements. and also tell us the notes and places it on the project"

## What the lead found in the code
- `detectKey(notes)` in `src/music.js` is a Krumhansl-Schmuckler profile match over note events. `projectKey()` only feeds it melody-role tracks; chords and bass are ignored. With no melody it falls back to A minor and the key label (`#keyInfo`, `src/daw.js`) still says "detected A minor".
- `audioToNotes(buf)` in `src/edit.js` is a monophonic pitch tracker (good for singing and voice notes). There is no polyphonic analysis: an imported full song gives no key, no chords.
- Related board items: AI-3 (reference track: tempo, key, groove, tonal balance) and SE-6 (stem splitting with HTDemucs in the browser, RES-5). The new feature should be a building block for both.

## Questions (short, practical, with sources)
1. How do Mixed In Key, Chordify, Moises (chord detection), Ableton Live ("Convert Harmony to New MIDI Track"), Logic (Chord Track / chord detection), FL Studio, Rapid Evolution / KeyFinder, Spotify's key data and Serato/rekordbox detect key and chords? What do they show the user (key + Camelot, chord timeline, confidence), and what do producers praise or complain about (accuracy, relative major/minor mix-ups)?
2. What runs in the browser today, offline, on the device: chroma/HPCP + key profiles (Temperley, Krumhansl, EDMA/edma-for-electronic), Essentia.js (licence! AGPL?), Meyda, tonal.js, Spotify basic-pitch (polyphonic audio-to-MIDI, Apache-2.0, TF.js / ONNX), chord-recognition models (e.g. BTC, madmom licence), and plain JS DSP we could write ourselves. For each: accuracy on pop/electronic music, speed on laptop and phone for a 3-minute song, download size, licence (we ship one static file, public repo).
3. "Live" detection while a song plays (from an imported file, or from the microphone when a song plays in the room): what's realistic latency and accuracy; how apps show a live chord readout.
4. Turning detected chords into a part: how tools quantize chord changes to bars/beats (needs tempo/beat tracking), voice them, and avoid copying a song's melody (copyright: we offer chords and key, which are not protected; melodies copied note for note are a risk; what do Chordify/Moises do?).
5. What would delight a producer here (e.g. "what key is this?" by voice, Camelot for DJs, key-matching a sample, "play it in my song's key").

## Output
Write `/tmp/research/RES-6.md` (readable pack: bottom line, findings, recommendations, "For the devs" notes with concrete algorithms/libraries and numbers, sources with urls) and `/tmp/research/RES-6.json` ({id:"RES-6", title, for:["SE-7","AI-3","SE-6"], question, bottomLine, findings[], recommendations[], ideas:[{name, hook, loop, why, scope, reuse, risks, similar}], sources:[{title,url}], status:"done", at:"2026-11-14"}). Save files as you go. Keep it under about 1,500 words. Final message: the bottom line and the "For the devs" notes.
