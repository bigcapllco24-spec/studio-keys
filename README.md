# Studio Keys

A personal MIDI studio that runs in the browser. Plug in a USB MIDI controller (Arturia, Akai, Novation and other class-compliant keyboards) and play sampled and synthesized instruments, build songs by talking or typing, sing melodies into the microphone, and export loop packs for Ableton.

The whole app is one static file, `index.html`, with all sounds embedded. There is no server and no build step on the host.

## Run it

- **Locally:** open `index.html` in Chrome or Edge. MIDI, the microphone and speech recognition all work from a local file.
- **Hosted:** any static host serves it. MIDI and the microphone need HTTPS.

Safari does not support Web MIDI. Speech recognition uses the browser's speech service, so it needs Chrome or Edge and an internet connection.

## Deploy on Cloudflare Pages

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick this repository and the `main` branch.
3. Build settings: framework preset **None**, build command empty, build output directory `/`.
4. Deploy. Every push to `main` redeploys automatically.

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
| `src/maker.js` | Talk/type commands |
| `src/mic.js` | Microphone pitch detection |
| `src/lab.js`, `src/dsp.js` | Sound Lab: element extraction from songs |
| `src/samples.json` | Embedded audio samples (base64 MP3) |

`tools/build_samples.py` and `tools/fetch_fluid.sh` rebuild `src/samples.json` from the source sample libraries.

## Sound credits

- Grand Piano: Salamander Grand Piano V2 by Alexander Holm (CC BY 3.0).
- Sampled melodic instruments and basses: FluidR3 GM SoundFont by Frank Wen (CC BY 3.0), via midi-js-soundfonts by Benjamin Gleitzman.
- Sampled drum kits and the hall reverb: Tone.js audio collection (originally from Chris Wilson's web-audio-samples). Confirm the license of these files before commercial release.
- 808, 909 and Trap kits and the synth basses are generated in code.
