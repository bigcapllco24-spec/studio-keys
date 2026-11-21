# SE-11 build report: Ableton zip stems now add up to the mix
sound-engine-dev · 22 Nov 2026 · branch `preview-se-11` (pushed), head `c022418`. I did not touch `main`.

## Cause
1. Each stem was rendered through the whole master chain by itself, including the glue compressor and limiter. Chrome's compressors add automatic makeup gain, so every stem got louder and was limited on its own. That is why the drums stem was louder than the mix and why the summed stems peaked around +6 dBFS and sounded squashed.
2. A smaller, hidden cause: every offline render made new random noise (hats, claps, snares), new random noise start points and new random detune. So even without the master chain, a stem never matched its own track in the mix.

## Fix
- **Stems skip the master glue and limiter, but share the master's gain moves.** Both master compressors apply one gain to both channels of a signal delayed by their look-ahead: out(t) = g(t)·in(t−D). The Mix render now also records the signal going into the glue (a 4-channel offline render). `masterGain` measures D (it finds 528 samples, two 6 ms look-aheads, from the smoothest gain curve) and g(t) on the whole mix. Each stem is rendered with no glue or limiter, shifted by D and multiplied by g(t). Result: no stem is compressed or limited on its own, and the stems sum to the mix. Measured g range on a house loop: −3.4 to +3.8 dB (this includes the makeup gain).
- **What a stem contains:** its track after the fader and track FX (EQ, drive, comp, sidechain duck from every kick, pan, width), with its **reverb and echo sends printed in**, then through the master EQ and master FX knobs. I printed the sends into each stem rather than making separate return stems because each stem is then self-contained: muting the pad stem in Ableton also mutes the pad's reverb, and soloing a stem sounds like soloing it in Studio Keys. With wet stems you also don't need to rebuild sends, which is what people expect when they drag in a stem pack to remix it. The reverb and delay are linear, so wet stems still sum exactly.
- **Headroom:** if any stem would peak above −0.3 dBFS, all stems go down by the same stated amount (rounded up to 0.1 dB, so the number is exact). The README then says to add a Utility with Gain +X dB on the Ableton master, or to raise the master fader by X dB. In my runs X was between 0 and 1.1 dB. When no stem would clip, X is 0 and the README says "Leave it at 0 dB".
- **Same random choices in every render:** the noise buffer and the fallback reverb impulse are now seeded (fixed). Each track's events are scheduled with a seed made from the track id (`withSeed(seedOf(tr.id), …)`), so a stem gets exactly the same random choices as its track in the mix. This sounds the same as before: it is still noise and detune, just repeatable.
- **README in the zip** now says to drag in the Mix OR all the Stems (not both), explains what a stem contains, and gives the Ableton master line: "no limiter or compressor needed", plus the Utility gain when the stems have headroom. If the master Drive or Bitcrush knob is on, it adds a note that the stems match the mix closely but not exactly.

## Files
- `src/core.js`: `seedRand`, `seedOf` and `withSeed` (new helpers); seeded `getNoise` and `makeImpulse`.
- `src/mixer.js`: `masterGain(y,x,a,n)` (new, lines 63-82).
- `src/studio.js` (studio-ux-dev's file; the brief allowed `exportZip` and the README text):
  - `renderGraph` signature takes `o` (306). The master output now has `o.dry` (no glue or limiter) and `o.tap` (4-channel: master output plus the signal going into the glue) (311-316).
  - `renderAudio`: 4 channels for tap (327-328), per-track seeding (335-336), tap/shift returns (337-339). The default call is unchanged, so the MP3 export renders the same chain.
  - `exportZip`: stem rendering, gain matching, headroom (421-432), README text (437).
- `tests/smoke.mjs`: one new line (before the final catch).
- `index.html` rebuilt with `python3 tools/build.py`.

## Null test (4-part loop, 4 bars: drums, bass, chords, melody; bass, chords and melody have kick sidechain). Residual = Mix − sum of stems, relative to the Mix RMS
| | Mix peak / RMS | Summed stems peak / RMS | Residual |
|---|---|---|---|
| Before (tester, 21 Nov) | −0.52 / −6.56 | +6.04 / −4.79 | −9.6 dB |
| Before (my run, house, origin/main) | −0.48 / −6.72 | +5.54 / −4.89 | −8.8 dB |
| After: house (master +0.3 dB) | −0.42 / −6.75 | −0.72 / −7.05 | **−64.7 dB** |
| After: hip-hop (+0.1 dB) | −0.42 / −9.83 | −0.52 / −9.93 | **−63.8 dB** |
| After: melodic house, sidechain (+0 dB) | −0.44 / −6.26 | −0.44 / −6.26 | **−63.7 dB** |
| After: techno (+0 dB) | −0.49 / −6.47 | −0.49 / −6.47 | **−65.0 dB** |

- The loudest single stem after the fix is −0.30 dBFS, and the drums stem is now always at or below the mix. Bass, chords and melody stems sit 4-13 dB below it.
- The rest of the residual (about −64 dB) is 16-bit WAV rounding plus float order. Rendering the same thing twice gives about −69 dB.
- Checks in isolation: the gain method alone gives −70 dB, and the sum of the dry stems against a dry render of all tracks gives −64 dB.
- Mix.wav is rendered the same way as before (same chain).

## check.sh
`CHECK OK`, `SMOKE OK: 82 checks`, no FAIL. New line:
`PASS Ableton zip: stems add up to the mix (null test), nothing clips · residual -65.2 dB vs the mix (stems +1.1 dB on the master), mix peak -0.55, stems summed -1.65, loudest stem -0.30 dBFS`
It makes a house drums + bass song (bass with sidechain), exports the zip, reads the README's gain and nulls the stems against Mix.wav. It needs −40 dB or better, no clipping in any stem or in the sum, and the master line in the README.

## Try it (Ableton or any DAW)
1. Make a 4-part loop (for example "drums like Ben Böhmer", then bass, chords and melody) and tap Export for Ableton (.zip).
2. In Ableton, set the tempo from the README and drag all the Stems onto separate tracks. Open README.txt and, if it says so, put a Utility on the master with the Gain it names. Play: it sounds like the Mix, nothing clips and nothing gets squashed. Solo the drums: they are no louder than in the mix.
3. Null test: drag Mix.wav onto another track, put a Utility on it with Phase (Invert) on both channels, and play it with all the stems. You should hear near silence (about −64 dB). Mute one stem and you hear only that part, with its reverb.

## Limits and notes
- If the master Drive or Bitcrush knob is on, the stems match the mix only roughly, because those effects are non-linear on the summed bus. The README says so in that case. Every other master knob (reverb, echo, filters, gate, pump, chorus, auto-pan) is linear and nulls.
- The stems carry the master's gain moves from the whole mix (about −3.4 to +3.8 dB on a house loop). A soloed stem can move a little with the other parts, as it does inside the mix. This is the price of an exact sum. A "dry for re-mastering" stem set would be a separate option if the owner wants one.
- Export time is unchanged: 1 + N offline renders, plus a gain analysis of about 10-50 ms on the main thread while "Rendering the mix…" shows. On this box (load 10-18) a 4-track export took 70-150 s. It is much faster on a normal machine.
- Song mode still exports the loop only, as before. The song MP3 (`renderSongSpan`) is not seeded; it doesn't need to be.
- No new assistant actions, Worker changes or samples. `index.html` grew by about 4 KB.
