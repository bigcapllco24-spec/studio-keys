# RES-7 · Ableton-style UI, music ducking, a better AI brain
Music researcher · 21 Nov 2026 · for UX-16 (studio-ux-dev), AI-10 (assistant-dev + studio-ux-dev), AI-11 (assistant-dev, lead)

## Bottom line
- **A (UX-16):** Studio Keys looks like a long web page with a keyboard on top. Ableton looks like one fixed screen. The biggest win is a **one-screen studio frame**: a thin control bar on top, tracks in the middle, a clip/device panel at the bottom, and the controller in a drawer. After that, make it dense: flat 1px-separated track rows, colour only on clips. Do it in 6 small steps (ranked below).
- **B (AI-10):** Duck the music **about -15 dB** in **60-80 ms** as soon as "Keys" is heard (or the orb is pressed). Hold it while the user talks and while Keys answers. Bring it back over **about 0.8 s**, 0.5 s after the last word. Echo cancellation matters most for hearing the wake word over full-volume music; ducking matters most for the command after it. Use both: since Chrome 135, Web Speech can listen to a `getUserMedia` track with `echoCancellation: true`. Never duck while the user records a sung take.
- **C (AI-11):** Test **gpt-oss-120b on Workers AI** (free tier, a one-line model swap, about $0.20 per 100 requests, the same as Llama today) against **Claude Haiku 5.5** (already wired in the Worker; needs the owner's key; about **$0.02-0.06 per 100 requests**). If the owner has Workers Paid, **DeepSeek V4.1 Flash** is a good third option. Avoid Kimi K2.6, Nemotron 3 and GLM-5.3-flash: their planned deprecation date (20 Nov 2026) has already passed.

---

## A. Ableton-like UI (UX-16)

### What we found
- Live 12 is a single window. The **Control Bar** runs along the top (transport, tempo, metronome, loop, key/scale, CPU, and the Session/Arrangement switch). The **Browser** sits on the left. **Session or Arrangement** fills the centre, and both share one set of tracks and one mixer. The **Detail area** at the bottom holds Clip View and Device View, stacked or switched. A small **Info View** in the bottom-left corner explains whatever the mouse is over. Shortcuts: Tab switches views, Ctrl/Cmd+Alt+B the browser, +3 Clip View, +4 Device View. ([Live 12 manual: Live Concepts](https://www.ableton.com/en/live-manual/12/live-concepts/), [Browser](https://www.ableton.com/en/live-manual/12/working-with-the-browser/), [Live 12 manual PDF: Info View, Themes](https://cdn-resources.ableton.com/resources/pdfs/live-manual/12/2026-04-30/live12-manual-en.pdf))
- Live 12 themes are neutral greys. A setting picks a warm, cool or neutral tone, and track and clip colours carry the colour. The UI itself stays matte (same manual, Theme & Colors). That fits the owner's "matte, no gradients" rule.
- **Bitwig** uses the same frame. Panels toggle from small footer icons with single keys (I inspector, E editor, D devices, M mixer). An **Inspector** panel shows every property of whatever is selected. ([Bitwig footer](https://www.bitwig.com/userguide/latest/the_window_footer), [Inspector](https://www.bitwig.com/userguide/bws44-504/meet_inspector_panel))
- **FL Studio's Hint Bar** shows a description of the hovered control and the live value while you turn a knob. Image-Line calls it the best way to learn the app. ([FL toolbar/hint bar](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/toolbar_panels.htm))
- **Studio Keys today** (headless Chrome at 1440x900, `src/body.html`, `src/head.html`):
  - The first screen is all the hardware controller: speakers, LCD, 8 knobs, pads, 61 keys. The Studio starts below the fold (about 820 px down at 1440x900). Sounds, Effects and Sing are separate sections further down, reached by top-nav anchors.
  - Tracks are cards: `.trk` has a 300 px header, 6 px gaps, a 12 px radius and a coloured 4 px left border.
  - The mixer is a grid of 360 px horizontal cards, not vertical strips.
  - The piano roll (`.ed-wrap`) is a separate block with max-height 480.
  - Transport controls are split across two rows of rounded pills.
  - Type is mostly 12-13 px, and corners are 8-12 px all over (138 `border-radius` rules).

### The 6 elements, ranked by how much a producer would notice today

Pixel sizes are my estimates of Ableton at 100% zoom, as targets; they are not official figures.

| # | Element | What "pro" looks like | Studio Keys now | Smallest change |
|---|---|---|---|---|
| 1 | **One-screen frame** (no page scroll) | Fixed 100vh window. Control bar on top, tracks in the centre, detail panel at the bottom, everything visible at once. | Long scrolling page, with the controller as the hero and the DAW below the fold | On ≥1024 px wide, a "Studio" layout: `body` is a 100vh grid with rows `40px / 1fr / 220px`. The controller panel becomes a collapsible bottom drawer (keyboard only, 120-160 px; the knobs/pads/LCD row opens on a toggle). Phones keep the current tab bar. |
| 2 | **Dense track lanes, colour discipline** | Rows 22-24 px collapsed and about 60-70 px open. No gaps, only 1 px separators. Square or 2 px corners. Grey surfaces. Colour only on clips and a small track-colour chip. 11-12 px labels. | Rounded cards with 6 px gaps, a 300 px header and big buttons | Flat rows: `gap:0`, `border-bottom:1px solid var(--line)`, radius 2 px, a 180-200 px header with name, M/S/arm and a small volume slider on one line. Clips are filled with a muted track colour, with a 14 px name strip. Use `--accent` only for selection and the playhead. |
| 3 | **Control bar** | One 32-40 px strip: tempo (drag to change), time signature, metronome, position counter (bars.beats.16ths), play/stop/rec, loop, key/scale, CPU, Session/Arrangement switch. Monospace numbers in fixed-width fields. | Transport split across the songbar and the `daw-transport` rows, with rounded pills and dropdowns | Merge into one sticky 40 px bar. Square 24 px icon buttons. BPM and position use `font-variant-numeric: tabular-nums`. Keep the Loop/Song toggle there. |
| 4 | **Bottom detail panel: Clip / Device** | Selecting a track shows its chain left to right as compact device boxes (about 150-260 px wide, title bar on top, knobs inside). Double-clicking a clip opens the piano roll in the same spot. One key toggles between the two. | Editor is its own block; per-track FX live in the mixer cards; Sounds and Effects are far down the page | One 220 px bottom panel with two tabs, **Clip** (the existing piano roll) and **Device** (instrument box, then each FX in `TFX_ORDER` as a box). Shift+Tab toggles, like Live's Clip/Device switch. |
| 5 | **Vertical mixer strips** | 70-90 px wide channel strips: name, pan knob, sends, a tall fader with a meter beside it, M/S/arm, all in a row. | 360 px horizontal cards with knobs and a "Fader" button | Render each track as a 76 px vertical strip, with a 160 px fader and a 6 px meter, in the same bottom panel (third tab: **Mix**) or in place of the lanes when "Mixer" is picked. |
| 6 | **Browser sidebar + info line** | Left column of 200-260 px: search on top, categories (Sounds, Drums, Instruments, Audio Effects), compact 22-24 px text rows, preview on hover, drag onto a track. A one-line Info/Hint area shows what is under the mouse. | Sounds is a large card grid below the fold with KEYS/PADS buttons; hints are scattered lines of text | A collapsible 240 px left sidebar listing the same instruments and FX as text rows, with the existing search. Double-click or drag to load. Add a 1-line hint strip at the bottom-left that reads each control's `title` (shortcuts included), so it doubles as Keys' tip line. |

**Order to ship (one element at a time, as the owner asked):** 1, then 2, then 3, then 4, then 5, then 6. Steps 1-3 are what make it "feel like Ableton" at first glance. Steps 4-6 are what make it fast to use.

### For the devs (studio-ux-dev, UX-16)
- Keep everything on the theme tokens. Grey-ish surfaces use `--t1`..`--t4`, separators `--line`, and saturated colour only for clips, meters, the playhead and active toggles. Use no shadows; the current speaker grille and wood are fine inside the controller drawer only.
- Target type: 11-12 px Manrope for controls, 13 px for track names, Fraunces only for the song title. Corners 2-4 px in the studio frame, so the 8-12 px radii stay for the phone UI and modals only.
- Don't delete the hardware controller; it is the brand. Move it into a drawer that remembers its state (localStorage, try/catch).
- Phone (≤ 900 px): leave the UX-4 tab bar as it is. The frame applies only at ≥ 1024 px. Keep checking 390 and 360 px with `tests/phone.mjs`.
- Shortcuts to copy: Tab (Session/Arrangement, or Loop/Song for us), Shift+Tab (Clip/Device), Ctrl/Cmd+Alt+B (browser), Ctrl/Cmd+Alt+M (mixer). Show them in `title`s so the hint line can display them.

---

## B. Ducking the music while you talk (AI-10)

### What we found
- **Smart speakers and phones.**
  - Android's audio-focus docs give a typical duck of a factor of 0.2, which is **-14 dB**. ([Android AudioFocusRequest](https://developer.android.com/reference/android/media/AudioFocusRequest))
  - Home Assistant's open voice satellite ducks to 50% volume (**-6 dB**) the moment the wake word is detected. It holds the duck through listening, thinking and the spoken reply, and restores only after the reply finishes. ([OHF linux-voice-assistant behavior](https://raw.githubusercontent.com/OHF-Voice/linux-voice-assistant/main/docs/behavior.md))
  - Echo devices duck on their own wake word, on the device, because a round trip would be too late; this relies on echo cancellation. ([EchoMuse voice pipeline notes](https://github.com/wilbowes/EchoMuse/blob/v2.19.0/docs/voice-pipeline.md))
  - Sonos patents describe ducking on the wake word, and also ducking only the speech band of the music. ([US10582322B2](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10582322))
- **Cars.** Android Automotive says assistant and navigation prompts duck music. It also warns against unducking quickly between an assistant's back-to-back phrases, so music doesn't jump up and down. ([AAOS volume management](https://source.android.com/docs/automotive/audio/volume-management))
- **DJ talkover.**
  - Pioneer DJM-V10 and DJM-A9 offer talkover levels of -6, -12, **-18 (default)** and -24 dB, plus fully off.
  - Their "Advanced" mode cuts **only the mid range** of the music, which keeps the kick and hats. ([DJM-V10 manual](https://www.bhphotovideo.com/lit_files/775198.pdf), [DJM-A9 manual](https://impact-even.com/userfiles/files/telechargement/sonorisation/pioneer_djma9_manuel.pdf))
  - A practical club default is about 14 dB (opinion). ([Mixgraph](https://www.mixgraph.io/glossary/talkover))
- **Broadcast and DAW voice-over ducking.**
  - Sound On Sound's starting point is a 15-20 ms attack and a 600-700 ms release, so the music doesn't pop up between phrases. ([SOS "Duck Tales"](https://www.soundonsound.com/techniques/duck-tales))
  - Other guides suggest 6-10 dB of reduction, a 10-30 ms attack and a 300-600 ms release. In measured tests, releases of 250 ms or less let the music bounce back between words. ([MusicVivo](https://musicvivo.com/blog/music-under-voiceover), [Infinite Creation measured table](https://infinitecreation.io/tutorial-ducking-music))
- **What helps recognition.**
  - Music hurts recognition most at low speech-to-music ratios. A clean-trained recogniser went from 11% word errors (clean) to 47% at 5 dB and 79% at 0 dB with music behind it. ([Kyoto, music-mixed ASR](https://sap.ist.i.kyoto-u.ac.jp/EN/bib/intl/WOO-APSIPA20.pdf))
  - Busier music hurts more than sparse music. ([CMU, ICASSP 97](http://www.cs.cmu.edu/afs/cs/user/robust/www/Papers/icassp97-music.pdf))
  - Echo cancellation gives the largest gains when the device's own playback is the problem. Google reports at least 71% lower word errors on its echo set with a neural AEC front end. Browser AEC is a simpler WebRTC canceller, so expect less. ([Google, arXiv 2111.09935](https://arxiv.org/abs/2111.09935))
  - So, -15 dB of ducking moves a typical "music as loud as the voice" situation (about 0 dB) to about +15 dB, where recognition is mostly fine.
- **Browser facts.**
  - Chrome 135 (April 2025) added `SpeechRecognition.start(audioTrack)`, so Web Speech can listen to a `MediaStreamTrack` instead of the raw default mic. ([Chrome 135 notes](https://developer.chrome.com/release-notes/135), [MDN start()](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start))
  - The Web Speech API on its own exposes no echo-cancellation control. ([react-speech-recognition #124](https://github.com/JamesBrill/react-speech-recognition/issues/124))
  - With `getUserMedia({audio:{echoCancellation:true}})`, Chrome's canceller removes the page's playback on the default output, including Web Audio, and the `AudioContext.setSinkId` output since Chrome 111. It cannot cancel other apps' system audio. ([Chromium 40252911](https://issues.chromium.org/issues/40252911), [Chromium 40504498](https://issues.chromium.org/40504498), [MDN echoCancellation](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/echoCancellation))
  - Today `src/assistant.js` calls `rec.start()` with no track (the raw mic). `src/mic.js` opens the singing mic with echo cancellation off, which is right for pitch.

### Recommended defaults for Studio Keys
| Setting | Default | Why |
|---|---|---|
| Trigger | Wake word "Keys" heard (interim result), orb press, or typing focus with the music playing | Matches AI-13; the wake word is the clear intent signal |
| Optional pre-duck | -6 dB on local voice activity (mic RMS above the noise floor for 120 ms), released after 2.5 s if no "Keys" follows | Wake-word results arrive 0.3-0.8 s late; a light early dip helps the command's first words |
| Depth while the user talks | **-15 dB** (gain about 0.18) | Between Android's -14 and the DJM default of -18 |
| Depth while Keys speaks | -10 dB | Lets the user still hear the groove under the reply |
| Attack | 60-80 ms ramp (`setTargetAtTime(g, t, 0.025)`) | Fast but click-free |
| Hold | 500 ms after the final result or the end of TTS; stay ducked between Keys' back-to-back phrases | Avoids pumping between phrases (the AAOS advice) |
| Release | About 0.8 s back to full (`setTargetAtTime(1, t, 0.25)`) | Smooth, the way radio and DJ mixers do it |
| Style option | "Mid cut": -10 dB peaking cut at about 1.5 kHz (Q about 0.7) plus -6 dB overall | Like DJM "Advanced"; kick and bass keep driving |
| Never duck | While a sung or played take is recording (`TAKE` active) or the count-in runs | The user must hear the beat to sing on time |
| Setting | Off / Light (-8) / Normal (-15) / Deep (-24), remembered per browser | DJ mixers make depth a setting |

### For the devs (AI-10)
- **sound-engine-dev / studio-ux-dev:** add one `duck` GainNode after the master bus and before the limiter/analyser, so the metronome and preview sounds are ducked too. Drive it only with `setTargetAtTime`, never by setting `.value` directly. Expose `duckMusic(level)` / `unduckMusic()`. This is separate from the kick sidechain `duckAt` in `src/mixer.js`; don't reuse that name.
- **assistant-dev:** in `src/assistant.js`, open an assistant mic stream once with `{echoCancellation:true, noiseSuppression:true, autoGainControl:true}` and call `rec.start(track)` when `rec.start.length` or a feature test allows it (Chrome 135+). Fall back to `rec.start()` elsewhere; Safari gets ducking only. Keep the singing mic in `src/mic.js` separate, with AEC off.
- Duck on the first interim result that contains the wake word; don't wait for the final result. Unduck after the final result plus the TTS reply plus the 500 ms hold. Ignore recognition results while Keys is speaking, except "Keys" or "stop" (barge-in).
- Test on laptop speakers at loud volume: wake-word hit rate over a 124 bpm house loop with ducking off, then on, then with AEC track plus ducking (20 tries each).

---

## C. A better AI brain (AI-11)

### What we found (Cloudflare pricing page and model pages, read 21 Nov 2026)
- Workers AI gives **10,000 neurons/day free**, then **$0.011 per 1,000 neurons** on Workers Paid. Some newer models (Kimi, GLM-5.x, DeepSeek V4, Inkling) **need Workers Paid or prepaid AI Gateway credits**; they don't run on the free tier. ([Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/))
- The official "JSON Mode" list still names only older models (Llama 3.x, DeepSeek-R1-distill). The newer models instead expose `response_format`, `tools` and `tool_choice` through the OpenAI-style schema. Cloudflare warns that JSON Mode can fail with an error your code must handle. ([JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/))
- The Worker already supports Claude through `ANTHROPIC_API_KEY`, defaulting to `claude-haiku-5-5` (`cloudflare/worker.js` line 7).
- Anthropic prices (per million tokens): **Haiku 5.5** $0.10 in / $0.50 out (prompts ≤100K), with cache hits at $0.01. **Sonnet 5.5** $2 in / $10 out, with cache hits at $0.10. ([Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing))

### Models and cost per 100 requests (4.5k input + 300 output tokens each)
| Model (Workers AI unless noted) | Tools / JSON | Context | $ in / out per M | **$ per 100 req** | With prompt cache | Free-tier req/day | Notes |
|---|---|---|---|---|---|---|---|
| llama-3.3-70b-fp8-fast (today) | JSON mode | 24k* | 0.293 / 2.253 | **$0.20** | n/a | about 55 | The baseline the owner finds weak |
| **gpt-oss-120b** | Function calling, `response_format` | 128k | 0.35 / 0.75 | **$0.20** (with about 300 reasoning tokens at `low`) | n/a | about 54 | Free tier OK; reasoning effort low/med/high ([page](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/)) |
| llama-4-scout-17b-16e | Function calling, `guided_json` | 131k | 0.27 / 0.85 | $0.15 | n/a | about 75 | **Default max_tokens 256**: set it ([page](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/)) |
| gemma-4-26b-a4b-it | Function calling | 256k | 0.10 / 0.30 | $0.05 | n/a | about 200 | Cheapest decent option; smaller model ([page](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/)) |
| mistral-small-3.1-24b | (not stated) | 128k | 0.351 / 0.555 | $0.18 | n/a | about 63 | Older |
| qwen3.8-27b | Function calling | 262k | 0.45 / 3.20 | $0.43 | $0.25 | about 26 | Reasoning can't be turned off (low/medium/xhigh), so slower ([page](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/)) |
| **deepseek-v4.1-flash-1017** | Function calling | 1M | 0.30 / 1.20 (cache 0.006) | $0.17 | **$0.04** | Paid only | `reasoning_effort: none` available ([page](https://developers.cloudflare.com/workers-ai/models/deepseek-v4.1-flash-1017/)) |
| deepseek-v4-pro-0813 | (not checked) | 1M | 1.32 / 3.96 | $0.71 | $0.14 | Paid only | Big; likely slower |
| kimi-k2.6 | Function calling | 262k | 0.95 / 4.00 | $0.55 | $0.19 | Paid only | **Planned deprecation 20 Nov 2026 (passed)**: avoid ([page](https://developers.cloudflare.com/workers-ai/models/kimi-k2.6/)) |
| glm-5.3 / glm-5.3-flash | Function calling | 1M | 1.40 / 4.40; flash 0.15 / 0.50 | $0.89; flash $0.08 | | Paid only | Flash can't disable reasoning and has the **same passed deprecation date**: avoid |
| nemotron-3-120b-a12b | Function calling | 256k | 0.50 / 1.50 | $0.27 | | | **Deprecation 20 Nov 2026 (passed)**: avoid ([page](https://developers.cloudflare.com/workers-ai/models/nemotron-3-120b-a12b/)) |
| **Claude Haiku 5.5** (Anthropic) | Tools, strong JSON | 100k+ | 0.10 / 0.50 | **$0.06** | **$0.02** | n/a, needs owner's key | Already wired in the Worker |
| Claude Sonnet 5.5 (Anthropic) | Tools, strong JSON | large | 2 / 10 | $1.20 | $0.35 | n/a | Best quality; about 20x Haiku |

\*Llama 3.3 context as served on Workers AI; not re-checked today. Free-tier req/day = 10,000 neurons ÷ neurons per request, shared with any other Workers AI use on the account. Cached prices assume the ~4.4k-token system prompt is cached (Claude: the first call in each 5-minute window pays a 1.25x write). Reasoning models bill their thinking tokens as output; the gpt-oss row assumes about 300 extra.

**What it means in money:** at 1,000 assistant requests a month, the costs are:
- Haiku 5.5: about $0.20-0.60 a month.
- gpt-oss-120b: about $2, all of it free if under about 54 requests a day.
- Sonnet 5.5: about $3.50-12 a month.

### Which 2 to test side by side
1. **gpt-oss-120b (Workers AI).** It is the best "no new account, no new bill" upgrade: a strong open model with function calling and a 128k context, swapped in for `LLAMA`, at about the same price as today. Run it with `reasoning_effort: "low"` to stay under the 8-second reply rule.
2. **Claude Haiku 5.5 (Anthropic).** Claude models are usually the most reliable at following a long system prompt and returning clean JSON (my opinion, not a benchmark). It is also the cheapest per request in this list once the prompt is cached. It needs the owner's OK and his own `ANTHROPIC_API_KEY` (a Cloudflare secret, set by him).
- Reserve: **DeepSeek V4.1 Flash** with `reasoning_effort: "none"` and prompt caching, if the owner is already on Workers Paid.

### For the devs (assistant-dev, lead: AI-11)
- Make the model a variable (`AI_MODEL`, default the current Llama) so the test is a config change. Changing a Worker variable needs the owner's approval, so a code default is fine for the test. Log the model name in the response for comparison.
- **gpt-oss:** use `messages` with `reasoning_effort:"low"`, `max_tokens` about 1,200 (reasoning tokens share it), and either the same `response_format` json_schema or a single `apply_actions` tool. Parse defensively, because Cloudflare says JSON compliance isn't guaranteed. Keep the Llama fallback on error.
- **Claude:** add `cache_control` on the system prompt block to get the cached price. Keep `max_tokens` around 1,000. The Worker must stay free of backticks and `${`.
- Test set: 20 typical requests (the 6 lead smoke prompts plus "make the bass softer" (AI-9 single-element edit), "another one", "Ben Böhmer at 124", "turn it into a song" (AI-12), "sing a bassline" and "undo"). Score valid JSON, right actions, only the target element changed, and reply time. Run each model 3 times.
- Pages I could not open directly (permission prompts timed out): the GLM-5.3-flash and Kimi K2.6 model pages via WebFetch. Kimi was read through a second fetcher; the GLM-5.3-flash notes come from the first fetch's summary.

---

## Sources
- Ableton Live 12 manual: [Live Concepts](https://www.ableton.com/en/live-manual/12/live-concepts/) · [Working with the Browser](https://www.ableton.com/en/live-manual/12/working-with-the-browser/) · [Manual PDF (Info View, Themes)](https://cdn-resources.ableton.com/resources/pdfs/live-manual/12/2026-04-30/live12-manual-en.pdf) · [Live 12 Browser help](https://help.ableton.com/hc/en-us/articles/12927340213660-The-Live-12-Browser)
- Bitwig: [Window footer](https://www.bitwig.com/userguide/latest/the_window_footer) · [Inspector panel](https://www.bitwig.com/userguide/bws44-504/meet_inspector_panel) · [Panels](https://www.bitwig.com/userguide/latest/a_musical_swiss_army_knife)
- FL Studio: [Toolbar and hint bar](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/toolbar_panels.htm)
- Ducking: [Android AudioFocusRequest](https://developer.android.com/reference/android/media/AudioFocusRequest) · [Android Automotive volume management](https://source.android.com/docs/automotive/audio/volume-management) · [OHF linux-voice-assistant behaviour](https://raw.githubusercontent.com/OHF-Voice/linux-voice-assistant/main/docs/behavior.md) · [EchoMuse voice pipeline](https://github.com/wilbowes/EchoMuse/blob/v2.19.0/docs/voice-pipeline.md) · [Sonos patent US10582322B2](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10582322) · [Pioneer DJM-V10 manual](https://www.bhphotovideo.com/lit_files/775198.pdf) · [Pioneer DJM-A9 manual](https://impact-even.com/userfiles/files/telechargement/sonorisation/pioneer_djma9_manuel.pdf) · [Mixgraph talkover](https://www.mixgraph.io/glossary/talkover) · [Sound On Sound: Duck Tales](https://www.soundonsound.com/techniques/duck-tales) · [MusicVivo music under voiceover](https://musicvivo.com/blog/music-under-voiceover) · [Infinite Creation ducking test](https://infinitecreation.io/tutorial-ducking-music)
- Speech recognition: [Chrome 135 release notes](https://developer.chrome.com/release-notes/135) · [MDN SpeechRecognition.start()](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start) · [MDN echoCancellation](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/echoCancellation) · [Chromium 40252911](https://issues.chromium.org/issues/40252911) · [Chromium 40504498](https://issues.chromium.org/40504498) · [react-speech-recognition #124](https://github.com/JamesBrill/react-speech-recognition/issues/124) · [Kyoto music-mixed ASR (APSIPA 2020)](https://sap.ist.i.kyoto-u.ac.jp/EN/bib/intl/WOO-APSIPA20.pdf) · [CMU music vs ASR (ICASSP 97)](http://www.cs.cmu.edu/afs/cs/user/robust/www/Papers/icassp97-music.pdf) · [Google ASR frontend with AEC](https://arxiv.org/abs/2111.09935)
- Models: [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) · [Workers AI models](https://developers.cloudflare.com/workers-ai/models/) · [JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) · [gpt-oss-120b](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/) · [llama-4-scout](https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/) · [gemma-4-26b-a4b-it](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/) · [qwen3.8-27b](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/) · [deepseek-v4.1-flash](https://developers.cloudflare.com/workers-ai/models/deepseek-v4.1-flash-1017/) · [kimi-k2.6](https://developers.cloudflare.com/workers-ai/models/kimi-k2.6/) · [nemotron-3-120b](https://developers.cloudflare.com/workers-ai/models/nemotron-3-120b-a12b/) · [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
