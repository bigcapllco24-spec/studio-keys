# RES-5: Split a song into parts (karaoke and remix), plus phone app questions for UX-4
music-researcher, 13 Nov 2026. For: lead, sound-engine-dev, studio-ux-dev, assistant-dev.

## Bottom line
- **Doable in the browser on a laptop now.** The open model most tools use (HTDemucs, 4 parts: vocals, drums, bass, other) already runs in browsers through ONNX Runtime Web. On a laptop with WebGPU a 3-minute song should take roughly 10-60 seconds. Without WebGPU it takes about as long as the song (3-5 minutes). It is a one-time download of about 80-130 MB, so make it opt-in. It does not fit inside `index.html`.
- **Phones can do it, slowly.** WebGPU is now on iPhone (iOS 26 Safari) and on most newer Android phones. One project's estimate for an iPhone 17 Pro is about 5-8 minutes for a 3-minute song. iOS kills a tab that goes over about 2 GB of memory, so the song has to be processed in small chunks. Treat phone splitting as "works, warn the user", not the main path.
- **Best first version:** "Split into parts" on any imported song gives 4 stem tracks in a group, with the original muted (this is Ableton's pattern). Then "Keys, play the background", a karaoke mode: vocals off (or a quiet guide level), the user sings, and the take is recorded. Remixing is muting and soloing stems and asking Keys for new parts in the song's key and tempo. Everything stays in the browser.
- **Kick / snare / hats:** the only open drum-splitting models are non-commercial (LarsNet CC BY-NC, Timbrica CC BY-NC-SA). Our better route is to find the kick, snare and hat hits in the drum stem with our own DSP. The code already has a Sound Lab with kick/snare/hat band recipes. Then turn the hits into a MIDI drum track on our own kits ("Re-drum").
- **Server fallback exists but needs the owner:** Workers AI has no stem model. Replicate's Demucs costs about $0.013 per song (about 1 minute on a T4 GPU). LALAL.AI and Moises/Music.ai cost about $0.10-0.15 per minute of audio. All of them send the user's song off the device, so both cost and privacy need the owner's approval.
- **Two owner decisions before build:**
  1. Where the model file lives. Hugging Face is a third party; our own Cloudflare storage is a new binding.
  2. The licence. The Demucs code is MIT, but the status of its trained weights is disputed (details in section 4).
- **Rights text needed** (it is legal text, so the owner approves it).

## What we found

### 1. How others do it (what users now expect)
| Product | Parts | Where it runs | Speed / quality | Price |
|---|---|---|---|---|
| Ableton Live 12.3+ (Suite only) | Vocals, drums, bass, others; you pick which, can merge | On the computer (GPU on Apple silicon, CPU otherwise); ~2 GB of models | "High Speed" and "High Quality" modes; 16 GB RAM advised for HQ | Suite (£529) |
| Logic Pro 11.2 | 6: vocals, drums, bass, guitar, piano, other | On the Mac, M1 or newer | MusicRadar's Jan 2026 test winner (16/20) | £199.99 |
| FL Studio 2025 | Vocals, drums, bass, instruments, each on a child track | On the computer | "Good", just outside MusicRadar's top 5 | Producer £199 |
| Moises | Vocals, drums, bass, guitar, piano, strings, other; Pro splits drums into kick, snare, toms, hi-hat, cymbals | Cloud | Good drums and bass, weaker vocals (MusicRadar) | From ~£2.91/mo, free tier |
| LALAL.AI | Up to 10 types incl. synth, strings, wind, lead/backing vocals | Cloud | Excellent on guitar and piano; billed as minutes × number of stems | Free 10 min; Lite $7.5/mo; Pro $15/mo (250 fast min) |
| Fadr | Vocals, drums, bass, etc.; Plus splits drums into kick, snare, other | Cloud | Popular free tier for producers | Fadr Plus (paid) |
| Serato / rekordbox 7 / djay / VirtualDJ | 3-4 live stems (vocals, drums, bass, melody/inst); VirtualDJ adds drum parts | Real time on the laptop, or analysed ahead | Quality drops on older laptops; pre-analysis is safer | In the DJ app |
| Apple Music Sing | Vocal level slider (lowers the voice, never fully removes it) | Real time on the device | iPhone 11 and newer | In Apple Music |

What producers expect, read across these products:
- One click on a clip, a choice of which parts, and new tracks grouped under the original. The original is muted, not deleted (Ableton, FL, Logic all do this).
- A "fast" and a "good" mode.
- Results are good, not perfect. Reverb and dense mixes bleed into "other". Every tool has artefacts on low-bitrate MP3s.
- For karaoke, a vocal level slider rather than an on/off switch. Apple keeps a faint guide vocal on purpose.
- 4 stems is the standard. Guitar and piano matter little for house and techno. For a producer, a split into kick, snare and hats is a plus.

Common mistakes to avoid:
- Silent long waits. Show progress per chunk, allow cancel, and keep the page usable.
- Throwing away the original.
- Downmixing to mono before splitting. Our import does this today, and stems need the stereo source.
- Re-splitting every time. Cache the stems.
- Billing or quotas that surprise people (the LALAL per-stem pricing is a common complaint).

### 2. In the browser: models, size, speed, memory
**Models**
- **HTDemucs v4 (Meta)** is the workhorse. It gives 4 parts; a 6-part version adds guitar and piano; a fine-tuned "ft" version is about 4× slower for a small gain.
  - Average quality on the standard test set is about 7.7 dB SDR when trained only on that set.
  - It has about 42M parameters.
  - The code repo has been archived since 1 Jan 2025. The author keeps a fork for bug fixes only.
- **Browser ports that exist today**, all MIT or Apache licensed as code:
  - `demucs-web`: ONNX Runtime Web, WebGPU then WASM, 4 stems, about 172 MB model.
  - `monteslu/htdemucs-web-onnx`: mixed precision, 126 MB. It is split into 21 small GPU steps so the page keeps drawing while it works. It runs about 22× real time back to back, or about 8× when paced to keep the UI smooth, on a desktop Radeon RX 7600.
  - `demucs-rs`: Rust plus WebGPU. Models are 84 MB each for 4-stem and 6-stem, 333 MB for "ft".
  - `kramp/htdemucs-6s-webgpu-onnx`: 6 stems on WebGPU.
  - `webnn/stem-separator`: about 170 MB, uses the WebNN NPU where available.
  - freemusicdemixer.com: WASM, multi-threaded, about 4 GB per worker.
- **Newer and better models:**
  - BS-RoFormer and Mel-RoFormer score about 9.8 dB on the same test, but have about 72M parameters and are heavier.
  - Moises-Light (Oct 2025) matches BS-RoFormer with about 5M parameters per stem, which would be ideal for phones. Its weights are not published.
- **Spleeter (Deezer, 2019):** small and fast, and its trained models are also MIT, so it is the clean-licence fallback. Its quality is clearly below Demucs.
- **Open-Unmix:** older, lower quality; freemusicdemixer has dropped it.

**Speed (3-minute song).** All of these are from hobby projects, so treat them as estimates until we measure ourselves.
| Device | Path | Time |
|---|---|---|
| Desktop GPU | WebGPU | ~8-25 s (from 8-22× real time) |
| Laptop with integrated GPU | WebGPU | ~30-60 s (one project's estimate, not measured) |
| Modern laptop | WASM, one thread | ~2.5-4 min (a 4-min song took 3-5 min) |
| iPhone 17 Pro | WebGPU | ~5-8 min (one project estimated 49-85 min for a 30-min file) |
| Mid-range Android | WASM fallback | Unknown, likely several times the song length |

For comparison, native Demucs on a CPU takes about 1.5× the song length.

**Memory**
- Demucs works on 7.8-second segments with overlap.
- On iPhone, one project hit iOS's 2,048 MB tab limit on a 5-minute song. It fixed this by streaming chunks and using fp16, which brought the peak to about 830 MB to 1.5 GB and GPU buffers to about 630 MB.
- On laptops, 16 GB RAM machines are comfortable.

**Browser support (WebGPU)**
- Chrome and Edge desktop.
- Safari 26 on macOS, iOS and iPadOS.
- Chrome Android 121+ on Android 12+ with Qualcomm or ARM GPUs.
- Firefox on Windows (141+) and Apple-silicon Macs (145+).
- Not yet in Firefox Android or Chrome on Linux.
- Everything else falls back to WASM.

**Download**
- The model is about 80-85 MB at fp16, plus the ONNX Runtime Web files (one project measured 28 MB).
- First use is therefore about 110 MB, cached after that.
- It cannot go inside our single `index.html`. It must be fetched when the user first asks to split, and the page must say so.

**Drum sub-split (kick / snare / hats)**
- LarsNet gives 5 parts (kick, snare, toms, hi-hat, cymbals) from a drum stem, but its weights are CC BY-NC 4.0 (non-commercial).
- Timbrica is a browser ONNX model, about 20 MB each for kick, snare and toms (the hats are what is left over). It is CC BY-NC-SA, and a commercial licence is available.
- The MVSEP DrumSep family (Demucs, MDX23C, SCNet and RoFormer, 4-6 parts) is the best quality, but it runs on a server and the licence is unclear.
- For electronic music the parts are clean and on the grid, so our own approach is probably good enough: band filters plus hit detection on the drum stem. The Sound Lab already has kick (25-160 Hz), snare/clap and hat (6-20 kHz) band recipes.

### 3. Server options (only if the owner wants them)
- **Cloudflare Workers AI:** no music or stem model in the catalog today. It has speech-to-text and text-to-speech only. Cloudflare announced that Replicate is joining it; I could not read the announcement (permission timed out), so whether Replicate models will run inside Workers AI is unverified.
- **Replicate `cjwbw/demucs`:** about $0.013 per run, usually under 1 minute on a T4 GPU, 1.6M runs so far.
- **LALAL.AI API:** in the Pro plan ($15/mo, 250 fast minutes). Billing counts each stem as separate minutes.
- **Moises / Music.ai API:** about $0.12 per minute of audio.
- **StemSplit:** about $0.10 per minute.
- The API prices come from an article written by StemSplit, so they are biased; check them before deciding.
- **All server options:** the song leaves the user's browser (this changes our privacy promise), it costs money, and it adds a third-party service. All three need the owner's approval under our rules.

### 4. Rights and copyright
- **Moises** will not take streaming links. Its reason: splitting a licensed stream would create an unauthorised derivative work, and the stream's DRM blocks it anyway. It asks users to upload audio they own or have permission to use. On commercial use, it says it does not claim ownership of outputs, and that commercial use is only OK if you hold the rights to everything in the project.
- **Ableton's manual** has no copyright note. The DAWs leave it to their licence terms.
- **A music-law newsletter (May 2026)** makes three points:
  - Stems stay a derived work of the original recording.
  - Some remix contests ban AI-split stems.
  - Built-in tools ship with a disclaimer, not a clearance.
- **Model weights** are a separate rights question for us as a product:
  - The Demucs code is MIT.
  - The author's model card on Hugging Face is tagged MIT.
  - Earlier GitHub issues said the weights were for research use. A Hugging Face thread asking whether the MIT tag was intended has no answer.
  - Many commercial products use Demucs, but we should not assume we are cleared. Spleeter's weights are plainly MIT if the owner wants zero doubt.

Suggested app text (the owner approves the final wording):
> "Split songs you made or have permission to use. Parts from other people's songs are for practice and private sketches; don't release them without the rights holder's OK. Splitting happens on your device; your song is never uploaded."

### 5. What already exists in Studio Keys
- `src/lab.js` has a Sound Lab with DSP isolation for kick, snare/clap, hats, bass, lead, pad and vocal.
- It also has a `SEPARATION_ENGINES` registry whose comment reads "Register ML engines here". That is the natural place for the HTDemucs engine.
- It already runs DSP in a Web Worker built from a Blob, which keeps everything in one file.
- `src/edit.js` import decodes audio and **downmixes to mono** before storing it in IndexedDB. Splitting needs the stereo original, so keep it, or split before the downmix.
- `TAKE_GUIDE` (`src/mixer.js`) already plays only the drums while the user sings. Karaoke mode is the same idea with "everything except vocals".

## Recommendations
1. **sound-engine-dev, S, a spike first.** Benchmark HTDemucs 4-stem fp16 through ONNX Runtime Web on:
   - the owner's laptop and one iPhone and one Android phone;
   - WebGPU, then WASM single-thread.

   Report seconds per 3-minute song, peak memory and download size. Also listen to 3 melodic house tracks the owner owns. That settles phone support with real numbers.
2. **sound-engine-dev, M, the engine.** Register `htdemucs` in `SEPARATION_ENGINES`.
   - Run it in a Worker, in 7.8-second chunks with overlap, with progress per chunk and cancel.
   - Write the stereo stems to IndexedDB (cache keyed by a file hash).
   - Fall back to the existing DSP engine when the model can't load (offline, a local file, an old browser).
3. **studio-ux-dev, M, the screens.**
   - "Split into parts" on an audio clip, with checkboxes for Vocals, Drums, Bass, Other.
   - The result is a group of stem tracks with the original muted, a one-time "download the splitter (about 110 MB)" notice, a progress bar and cancel.
   - A karaoke control: vocal level 0-100%, default about 15% guide.
4. **assistant-dev, S-M, the voice.**
   - New actions: `splitStems{trackId, parts[]}` and `karaoke{on, vocalLevel}`, with mute and solo of stems working by name ("just the drums and bass").
   - "Play the background" should start karaoke with a vocal take.
   - "Make a remix of this" should keep the chosen stems and hand off to the one-element-at-a-time flow in the song's detected key and tempo.
   - Each action needs the Worker prompt, `actions.js`, `maker.js` and a smoke line.
5. **Lead / owner decisions:**
   - (a) Model hosting. Recommended: our own Cloudflare storage (R2 or static assets) over Hugging Face, so no third-party call. Either way it needs approval.
   - (b) Model choice. Demucs (much better sound, disputed weights licence) or Spleeter (clean MIT, weaker). Recommended: Demucs, with the owner informed of the licence status.
   - (c) The rights text.
   - (d) No server fallback for now.
6. **Later:**
   - "Re-drum": kick, snare and hat hits from the drum stem become a MIDI track on our kits, using our own DSP and not the NC models.
   - "Bass to notes": the bass stem goes through `audioToNotes` to give an editable bass on our synth.
   - 6-stem mode (guitar, piano).
   - A vocal pitch-correction guide.
   - A server fallback for weak phones if the owner approves the cost and privacy change.

## For the devs
**sound-engine-dev**
- The hook is `SEPARATION_ENGINES` in `src/lab.js`. Keep the engine signature, but return stereo stems (L and R) for the stem tracks; the current DSP returns mono.
- Use ONNX Runtime Web with execution providers `['webgpu','wasm']`. Load it lazily, only when the user asks; never at boot.
- For the model, prefer an fp16 or mixed-precision HTDemucs (about 80-126 MB). Split the work into small GPU steps (the monteslu 21-piece approach) or chunk it so audio playback never stutters while splitting.
- Avoid multithreaded WASM at first. It needs COOP/COEP headers, which could break cross-origin resources such as Spotify images and needs a Worker change. Single-thread WASM plus WebGPU is enough.
- Respect the 2 GB iOS tab limit: stream chunks, dispose GPU buffers after each segment, and avoid holding the full song more than twice in Float32.
- The input is 44.1 kHz stereo; resample if the source differs.
- Stems should sum back close to the original. Check the null-test level as a quality gate.
- For Re-drum later, reuse the Lab's kick, snare and hat bands plus onset detection on the drum stem. Don't use LarsNet or Timbrica weights (non-commercial).

**studio-ux-dev**
- Follow Ableton's pattern: right-click or a clip menu offers "Split into parts", with part toggles and Fast / Good.
- The result is a group track of stems in theme colours. The source clip is muted and kept, and undo removes the stems.
- Keep the stereo original on import, at least for files the user may split. Today `importFile` in `src/edit.js` downmixes to mono.
- Show progress per chunk, an estimated time, and cancel. Keep the page responsive (our 50 ms rule).
- Phone: the split button works but warns ("this takes a few minutes on a phone, keep the screen on"). Stems already split on that device open instantly from cache.
- Karaoke panel: a vocal level slider (Apple keeps a faint guide), and record a take while it plays.

**assistant-dev**
- New actions `splitStems`, `karaoke` and stem mute/solo by name, in the worker prompt, `actions.js`, `maker.js` and smoke lines.
- "Play the background / karaoke / I want to sing over it" starts karaoke and arms a vocal take.
- "Just keep the drums and bass, make me a new melody" runs mute stems, then the existing melody flow in the detected key and tempo (link to AI-3 reference-track detection).
- Keep the one-element-at-a-time rule: after a split, suggest one next step instead of adding parts.
- If the model isn't downloaded, ask once ("I need to download the splitter, about 110 MB, OK?") and don't download silently.
- Never offer to split a streaming link (Spotify, YouTube). Explain that only files the user has can be split.

## Ideas (HQ format)
1. **Sing over it (karaoke)**
   - Hook: "Keys, play the background", and any song you drop in becomes a backing track you can sing on, with a faint guide vocal.
   - Loop: drop a song, split once, sing a take, listen, keep the best take.
   - Why: singers and toppers practise and write over references; Apple Music Sing and Moises prove the demand. Ours adds recording the take into a real project, by voice.
   - Scope: M. Reuse: `TAKE_GUIDE`, voice-note recording, IndexedDB audio.
   - Risks: phone speed, model download size, rights wording.
   - Similar: Apple Music Sing, Moises, Spotify Mix/karaoke, Smule.
   - Market: good, 4/5.
2. **Flip it (remix from stems)**
   - Hook: "Keep the drums and bass, give me a new melody", and a song becomes the start of your own track.
   - Loop: split, mute or solo parts, ask Keys for one new part in the detected key and tempo, repeat.
   - Why: producers already do this by hand in Ableton, Logic or Fadr. Doing it by voice in one step is new.
   - Scope: M (after 1). Reuse: AI-3 tempo and key detection, the one-element flow, roleFx.
   - Risks: users releasing remixes of commercial tracks (needs clear text), stem bleed.
   - Similar: Fadr, Ableton 12.3 stems, Logic Stem Splitter, Moises Studio.
   - Market: good, 4/5.
3. **Re-drum (drums to MIDI on our kits)**
   - Hook: "Swap the kick for a deeper one", and the song's drum pattern becomes an editable drum track on Studio Keys kits.
   - Loop: split, Keys finds the kick, snare and hat hits, gives a MIDI drum track, the user swaps kits or edits notes.
   - Why: producers want to keep a groove but own the sound; Ableton has had drums-to-MIDI for years and it is loved.
   - Scope: S-M. Reuse: Sound Lab bands, `audioToNotes`, the groove engine kits.
   - Risks: accuracy on dense mixes; for commercial songs it copies a pattern, so keep it for private sketches.
   - Similar: Ableton Convert Drums to MIDI, Fadr MIDI, Moises drum split.
   - Market: great, 4/5.

## Phone questions for UX-4
**(a) How comparable apps lay out phone screens.**
- **GarageBand (iPhone)** opens on a browser of instruments. Each one is a full-screen touch instrument, and a separate Tracks view is a compact timeline. It leans on landscape for editing.
- **Koala Sampler** is built around 16 pads per bank (4 banks), with three tabs: Sample, Sequence, Perform. One screen, big touch targets, mostly portrait.
- **FL Studio Mobile** squeezes the desktop layout (step sequencer, playlist, piano roll) into landscape; on phones it is dense.
- **BandLab** puts creation behind a big red "+" in a bottom tab bar, leading to a Create page split into "track type" and "tools". A UX critique found its "open studio" button too easy to miss.
- **Moises** is a portrait song player: stem volume faders, chords, metronome, speed and pitch, loops.
- **Suno** leads with a prompt box (text, or record audio to turn into a song).
- **Google Flow Music** (formerly Producer.ai / Riffusion) is a ChatGPT-style chat.

No app I found puts a *spoken* assistant first: the AI apps are text-prompt or chat-first, and the DAWs are tool-first. A voice-first phone screen with a big talk/sing button, the current loop playing and the tracks as a simple stack would be distinctive.

Patterns worth copying:
- One big primary button (BandLab's "+", Suno's create).
- Bottom tabs for a few areas.
- Portrait for talking, listening and mixing (Moises, Koala).
- Landscape only for detailed note editing (GarageBand, FL).

**(b) PWA vs Capacitor vs TWA in 2026.**
- **PWA (add to home screen)** is the cheapest and keeps one codebase.
  - The microphone (`getUserMedia`) works on iOS since 13.
  - iOS 26 opens any home-screen site as a web app by default and supports WebGPU.
  - Web Push works for installed web apps since iOS 16.4.
  - **Web MIDI does not work on any iPhone or iPad browser**, and Safari has never shipped it, even on Mac. It works in Chrome and Samsung Internet on Android.
  - Web Audio latency in browsers depends heavily on settings. One test on a Mac measured about 67 ms with default settings versus about 19 ms tuned (`latencyHint` low, echo cancellation, noise suppression and auto-gain off on the mic). Chrome 136 cut about 10 ms more on desktop. Android phones are usually the laggiest, so set `latencyHint:'interactive'` and turn off mic processing for takes.
- **TWA (Trusted Web Activity)** puts our own PWA in the Play Store. It runs in the user's Chrome, so Web MIDI, mic and WebGPU behave exactly as in Chrome. Ownership is proven with Digital Asset Links, and Google is relaxed about it when the site is yours.
- **Capacitor** is needed for the Apple App Store, but it runs in WKWebView, which also lacks Web MIDI. MIDI would need a native CoreMIDI bridge plugin, such as the polyfill approaches MIDIWebView and cordova-plugin-webmidi.
- Apple's guideline 4.2 rejects apps that are a "repackaged website". To pass, a Capacitor app needs real native value, for example native MIDI, the share sheet, background audio, or Files import.

Recommendation for UX-4:
1. Make the web app a proper PWA first (manifest, icons, offline shell). That covers iPhone and Android today, without MIDI on iPhone.
2. Add a TWA for the Play Store when wanted (small).
3. Do a Capacitor iOS app only if the owner wants the App Store or MIDI keyboards on iPhone. It is M-L work with native MIDI.

## Market check (proposal: in-browser stem split + karaoke + remix)
Verdict **good**, 4/5. Stem splitting is now standard in Ableton, Logic and FL, so it won't wow producers by itself. Our edge is doing it free, privately on-device, and by voice ("play the background", "keep the drums"), feeding straight into making parts. Tweaks:
- Launch with karaoke plus "keep these parts" by voice, not a bare splitter.
- Add Re-drum soon after.
- Show the one-time download clearly.

Closest products: Ableton Live 12.3 Stem Separation, Logic Pro Stem Splitter, Moises, Fadr.

## Sources
- Ableton, Stem Separation FAQ: https://help.ableton.com/hc/en-us/articles/23730994755996
- Ableton Live 12 manual, Stem Separation: https://www.ableton.com/en/live-manual/12/stem-separation/
- MusicRadar, I tested 11 stem separation tools (7 Jan 2026): https://www.musicradar.com/music-tech/i-tested-11-of-the-best-stem-separation-tools-and-you-might-already-have-the-winner-in-your-daw
- Sound On Sound, Logic Pro 11.2 review (Aug 2025): https://www.soundonsound.com/reviews/apple-logic-pro-11-2
- Editors Keys, Stem separation in 2026, which DAW (Jun 2026): https://www.editorskeys.com/blogs/news/stem-separation-in-2026-which-daw-does-it-best
- Piano and Synth, FL Studio 21.2 stem separation (Oct 2023): https://pianoandsynth.com/fl-studio-21-2-upgrade-includes-stem-separation-and-ai-mastering/
- Moises Pro plan: https://help.moises.ai/hc/articles/10523828567196-What-is-the-Pro-plan
- Moises, who owns the output: https://help.moises.ai/hc/en-us/articles/23877386138140-Who-owns-the-output-and-music-I-create-with-Moises
- Moises, why no streaming links: https://help.moises.ai/hc/en-us/articles/18322457396508-How-do-streaming-services-work-and-why-can-t-we-accept-their-URL-links-on-Moises
- Moises App Store listing: https://apps.apple.com/us/app/1515796612
- LALAL.AI pricing: https://lalal.ai/pricing
- Fadr drum stems: https://www.fadr.com/drum-stems
- DJ.Studio, DJ software stem benchmark (Apr 2026, vendor-written): https://dj.studio/blog/dj-software-stem-separation-benchmark
- TechCrunch, Apple Music Sing (Dec 2022): https://techcrunch.com/2022/12/06/apple-music-is-getting-a-new-karaoke-like-feature-apple-sing/
- facebookresearch/demucs (archived): https://github.com/facebookresearch/demucs
- HF discussion on HTDemucs weights licence: https://huggingface.co/adefossez/HTDemucs/discussions/1
- demucs-web: https://github.com/timcsy/demucs-web
- monteslu htdemucs-web-onnx: https://huggingface.co/monteslu/htdemucs-web-onnx
- kramp htdemucs 6s WebGPU: https://huggingface.co/kramp/htdemucs-6s-webgpu-onnx
- webnn stem-separator: https://huggingface.co/webnn/stem-separator
- demucs-rs: https://github.com/nikhilunni/demucs-rs
- freemusicdemixer releases: https://github.com/sevagh/freemusicdemixer.com/releases
- Aral Roca, a neural network in a browser tab: https://dev.to/aralroca/i-ran-a-neural-network-in-a-browser-tab-to-split-a-song-into-stems-10mk
- stemyla PR 39 (iPhone memory, Oct 2026): https://github.com/lloydmeta/stemyla/pull/39
- musicalia PR 12 (browser estimates, Sep 2026): https://github.com/robert-dm/musicalia/pull/12
- Moises-Light paper (Oct 2025): https://arxiv.org/html/2510.06785v1
- LARS / LarsNet: https://github.com/EdoardoMor/LARS
- Timbrica drum separator: https://huggingface.co/Faridzar/timbrica-drum-separator
- MVSEP DrumSep: https://mvsep.com/algorithms/29
- Workers AI model catalog: https://developers.cloudflare.com/workers-ai/models/index.md
- Replicate cjwbw/demucs: https://replicate.com/cjwbw/demucs
- StemSplit API comparison (biased): https://dev.to/stevecase430/ai-stem-splitter-api-comparison-2026-stemsplit-vs-lalalai-vs-moises-with-benchmarks-372l
- Music Scientists, who owns AI-split stems (May 2026): https://musicscientists.beehiiv.com/p/who-owns-audio-ai-stem-separation
- web.dev, WebGPU in major browsers (Nov 2025): https://web.dev/blog/webgpu-supported-major-browsers?hl=en
- caniuse, Web MIDI: https://caniuse.com/webmidi
- firt.dev iOS PWA notes (Oct 2026): https://firt.dev/notes/pwa-ios/
- Jeff Kaufman, browser audio latency (2021): https://www.jefftk.com/p/browser-audio-latency
- Chrome 136 WebAudio lower latency: https://groups.google.com/a/chromium.org/g/fugu-dev/c/AavLqm3hk0Y
- Chrome, Trusted Web Activity: https://developer.chrome.com/docs/android/trusted-web-activity
- MobiLoud, App Store 4.2 for webview apps (vendor-written): https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper
- MIDIWebView (Web MIDI in WKWebView): https://swiftpackageregistry.com/bloxidge/MIDIWebView
- Pratt IXD, BandLab mobile critique (Sep 2025): https://ixd.prattsi.org/2025/09/design-critique-bandlab-music-making-studio-mobile/
- Sound On Sound, Koala Sampler (Oct 2022): https://www.soundonsound.com/reviews/elf-audio-koala-sampler
- Suno for mobile (Jul 2024): https://suno.com/blog/suno-for-mobile
- Producer AI / Flow Music review (Jun 2026): https://fast.io/resources/producer-ai-review-2026/

Not read: blog.cloudflare.com/replicate-joins-cloudflare and the MusicTech FL Studio 21.2 review (fetch permission timed out).
