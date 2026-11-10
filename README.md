# Studio Keys

A personal MIDI studio that runs in the browser. Plug in a USB MIDI controller (Arturia, Akai, Novation and other class-compliant keyboards) and play sampled and synthesized instruments, build songs by talking or typing, sing melodies into the microphone, and export loop packs for Ableton.

The whole app is one static file, `index.html`, with all sounds embedded. A small Cloudflare Worker (`cloudflare/worker.js`) serves it and adds the AI assistant.

## The assistant

The Studio has a named voice assistant (default name **Keys**, changeable in the app). Turn on **Always listening** and talk to it by name ("Keys, make a 125 bpm house beat", "Keys, add a bassline", "Keys, turn the drums down"), or tap the orb to speak once, or type. When the song is stopped, humming or singing a phrase adds it as a new melody track.

- On the hosted site the assistant calls `/api/assistant` on the Worker, which runs Llama 3.3 70B on Cloudflare Workers AI and returns a list of song actions.
- If the Worker has an `ANTHROPIC_API_KEY` secret, it uses Claude instead (model from the optional `CLAUDE_MODEL` variable, default `claude-haiku-5-5`).
- Opened as a local file, the app falls back to a built-in command parser.

## Songs and tracks

Tracks work like a small DAW: rename, change instrument, volume, mute/solo, play one track on its own, duplicate, delete, and open an editor (a piano roll for instruments, a step sequencer for drums). Songs autosave in the browser; **New**, **Open** and **Save a copy** manage several songs. Export as a zip of WAV stems plus MIDI for Ableton or FL Studio.

## Run it

- **Locally:** open `index.html` in Chrome or Edge. MIDI, the microphone and speech recognition all work from a local file.
- **Hosted:** any static host serves it. MIDI and the microphone need HTTPS.

Safari does not support Web MIDI. Speech recognition uses the browser's speech service, so it needs Chrome or Edge and an internet connection.

## Hosting

The live site is the `studio-keys` Cloudflare Worker. It fetches `index.html` from this repository's `main` branch (cached for 2 minutes), so pushing to `main` updates the site. The Worker needs a Workers AI binding named `AI`. To redeploy the Worker itself, upload `cloudflare/worker.js` as an ES module with that binding.

## Change the code

Edit files in `src/`, then rebuild `index.html`:

```
python3 tools/build.py
```

| File | What it does |
| --- | --- |
| `src/head.html`, `src/body.html` | Styles and page markup |
| `src/core.js` | Audio engine, voices, persisted settings |
| `src/synth.js`, `src/synth2.js` | Synthesized instruments, 808/909/trap kits and basses |
| `src/instruments.js` | Sampled instruments, the sound list, Keys/Pads zones, per-sound effect presets |
| `src/fx.js` | The 8 effect slots (13 effects), knob pickup |
| `src/mixer.js` | Channel strips: volume, mute/solo, low/mid/high EQ |
| `src/play.js` | Note on/off routing, on-screen keyboard and pads |
| `src/midi.js` | Web MIDI, device profile, keys/pads setup, learn, MIDI test |
| `src/controller.js` | Controller layouts per model and the studio scene |
| `src/music.js` | Keys, chords and generators for drums, hi-hats, bass, chords and melody |
| `src/studio.js` | Song project, transport, looper, sung takes, saving, export (WAV, MIDI, zip) |
| `src/daw.js` | Track list, piano roll, step sequencer, song manager |
| `src/actions.js` | The song actions the assistant can run |
| `src/assistant.js` | The named voice assistant, wake word, hum-to-track |
| `src/maker.js` | Offline command parser (used when the AI is not available) |
| `src/mic.js` | Microphone pitch detection |
| `src/lab.js`, `src/dsp.js` | Sound Lab: element extraction from songs |
| `src/samples.json` | Embedded audio samples (base64 MP3) |

`tools/build_samples.py` and `tools/fetch_fluid.sh` rebuild `src/samples.json` from the source sample libraries.

## Sound credits

- Grand Piano: Salamander Grand Piano V2 by Alexander Holm (CC BY 3.0).
- Sampled melodic instruments and basses: FluidR3 GM SoundFont by Frank Wen (CC BY 3.0), via midi-js-soundfonts by Benjamin Gleitzman.
- Sampled drum kits and the hall reverb: Tone.js audio collection (originally from Chris Wilson's web-audio-samples). Confirm the license of these files before commercial release.
- 808, 909 and Trap kits and the synth basses are generated in code.
