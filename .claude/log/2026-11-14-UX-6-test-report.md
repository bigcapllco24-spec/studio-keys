# UX-6 test report (qa-tester, branch check), 14 Nov 2026

**READY**

Branch `preview-ux-6`, tested at 8d7c605. I added one QA commit, 391561d (tests only), and pushed the branch. `main` is untouched.

## Bugs
None. I found no bug that blocks UX-6.

## check.sh
- On 8d7c605: `CHECK OK` (bundle syntax, Worker syntax, SMOKE OK 39, PHONE OK 13). It took 2m13s.
- With my new check, on 391561d: `CHECK OK` (SMOKE OK 39, PHONE OK 13, **PWA OK 6**). It took 2m23s, under the 3-minute budget.

## What I checked, with numbers
All tests ran in headless Chrome 153. The server was my own: it runs the real `cloudflare/worker.js`, with GitHub raw mapped to the built files. I wrote my own scripts; I didn't rerun the developer's.

### 1. Worker routing (31 addresses)
- **At the root and under `/p/preview-ux-6/`:** `/manifest.webmanifest`, `/sw.js` and all 4 icons return 200 with the right types: `application/manifest+json`, `text/javascript`, `image/png`.
- **Caching:** `sw.js` is `no-cache`. The manifest and icons get `max-age=3600` on main, and `no-cache` plus `noindex` on the test link.
- **404s:** `/icons/nope.png`, `/icons/`, `/p/preview-ux-6/icons/x.png`, and a branch without `pwa/` all return 404.
- **Unchanged:**
  - `/` returns 200 HTML with `max-age=120`.
  - `/p/preview-ux-6/` returns 200 with `no-store`.
  - `/p/preview-ux-6` returns 302 to add the slash.
  - `/api/config` returns JSON.
- **Still redirect to `/` (302):** `/favicon.ico`, `/random/path`, `/sw.js/`, `/SW.js`, `/p/main/sw.js`, `/pwa/sw.js` and `/p/preview-ux-6/foo/sw.js`.
- **Worker source:** no backticks or `${`.

### 2. Icons
| File | Size | Notes |
|---|---|---|
| `icon-192` | 192×192 | transparent corners |
| `icon-512` | 512×512 | transparent corners |
| maskable | 512×512 | full bleed, `#07120e` |
| apple | 180×180 | full bleed |

Each size matches what the manifest says.

### 3. The installable app over http (main `/` and test link `/p/preview-ux-6/`): 23 of 23 real checks pass
- **Manifest:** linked, and Chrome's `getAppManifest` reports no errors. `getInstallabilityErrors` is `[]` on both addresses.
- **Service worker scope:** `/` and `/p/preview-ux-6/`. After a reload the page is controlled. Each cache holds exactly 6 entries (page, manifest, 4 icons) under its own scope. The two scopes keep 2 registrations and 2 caches.
- **`/api/config`:** 3 of 3 requests reached the server on each scope.
- **Online freshness:** after I changed the page's title on the server, a reload showed it at once (network first).
- **Offline** (server killed, after one visit):
  - The studio opens: 996 ms on main, 427 ms on the test link.
  - The saved song is there and reopens with 2 tracks.
  - The offline assistant (`handleRequest`) added a track and shows "Basic mode".
  - `/api/config` fails with a network error, so it is never served from a saved copy.
- **A test link never visited, opened offline:** it is not served the main site's saved page.
- **First visit:** the main page is downloaded once. The test link downloads it twice (`no-store`), which the developer already listed.
- **`file://`:** no manifest link and no service worker. My script's one FAIL here was a mistake in the script itself: it counted the sandbox's Google Fonts error.

### 4. More → Add to Home Screen and the one-time tip: 26 of 26
Tested at 390×844 and 360×780, with iPhone and Android user agents, using real taps.
- **iPhone:**
  - No tip on an empty song.
  - The tip appears about 1.8 s after a part is made. It sits at y 60–154 and the Keys button at y 609–701 (390) or 545–637 (360), so it never covers it.
  - **How** opens the 3 picture steps with no sideways scroll.
  - After a reload the tip never comes back. The same holds after closing it with ✕.
- **Android with a fake `beforeinstallprompt`:**
  - The default prompt is prevented and an **Install** button shows.
  - Tapping it opens the prompt exactly once, then the button hides.
  - `appinstalled` shows the toast "Studio Keys is on your home screen."
  - The tip reads **Install** and opens the prompt.
- **Android with no prompt:** the Chrome menu steps show, with no button and no tip.
- **Installed (standalone), on iPhone and Android:** no More entry and no tip.
- **Desktop at 1400 px:** never a tip.
- **Themes:** the tip and the page are correct in Emerald, Velvet and Sapphire. All colours come from theme variables: the accent edge and the How/Install button follow the theme. There are no page errors.

### 5. Regression with the service worker active
- My script at 390 on Android, with the service worker confirmed controlling the page: 6 of 6 pass.
  - Made a beat with the assistant and played it from the mini transport (playing, audio running).
  - Sang a bassline with the fake mic: 10 notes, highest MIDI 48.
  - Copied and pasted a note, then undid it (10→11→10).
  - Saved, reloaded through the service worker and reopened ("QA SW song", 2 tracks).
- The whole `tests/smoke.mjs` run over `http://localhost/` with the service worker: SMOKE OK 39 and PHONE OK 13.

## Rough edges (not blocking)
1. **On a slow connection the installed app waits for the network with no time limit.** It is network first with no timeout. When I made the server hang for 15 s, a controlled reload took **15.5 s** before anything showed, instead of falling back to the saved copy. A fully offline phone opens in under 1 s; a phone with one bar of signal can stare at a blank screen. Owner: `studio-ux-dev`, `pwa/sw.js`. A possible fix is to race the network against the saved copy after about 3–4 s.
2. **On a short phone the tip covers the start of Keys' first reply.** On 360×640, after "drums like ben bohmer", the tip (y 60–154) covers the top of Keys' reply bubble (y 105–360) and half of the "Your sound" chip. It pops up about 1 s after the reply lands. On 390×844 nothing is covered. Possible fixes: wait a few seconds longer, or push the chat down while the tip shows.

## Seen outside UX-6 (for the lead, same on `main`)
- The offline parser ignores the tempo in "drums like ben bohmer at 124": the result is 122 bpm, with only `add_drums` and no tempo action. Owner: `assistant-dev` (`src/maker.js`). Not caused by this branch.
- When GitHub raw is down, the Worker's 503 "being published" page shows even though the service worker has a saved copy. This behaves the same as before UX-6. It could fall back to the saved copy on 5xx later.

## New test (committed on preview-ux-6, 391561d)
- `tests/pwa.mjs` has 6 checks and takes 8 s. It starts an in-process http server running the real Worker, with GitHub raw mapped to the repo's built files. It checks:
  - the Worker's routes for the 12 app files, 404s and redirects;
  - the test link: manifest, installability and its own service worker scope;
  - main: its own controller, two separate scopes, and `/api/*` reaching the network;
  - an offline reload: the studio opens, the saved song reopens, and `/api` is not cached;
  - `file://`: no manifest link and no service worker.
- `check.sh` runs it after the smoke test.
- I mutation-tested it on a copy of the repo: it fails when `sw.js` stops serving offline, and when `sw.js` caches `/api/*`.

## Files
- QA scripts: `/tmp/claude-0/-home-claude/0ea7d9b5-5dab-52c4-a2a3-57210a67d7e2/scratchpad/qa6/`
  - `server.mjs`, `pwa.mjs`, `ui.mjs`, `reg.mjs`, `real.mjs`, `slow.mjs`
  - logs: `smoke-http.log`, and `../check1.log`, `../check2.log`
- Screenshots: `/tmp/claude-0/-home-claude/0ea7d9b5-5dab-52c4-a2a3-57210a67d7e2/scratchpad/qa6/shots/`
  - tip and install page: `ios-390-tip.png`, `ios-360-tip.png`, `ios-390-install.png`, `ios-360-install.png`, `android-390-install.png`, `android-360-install.png`, `android-390-tip.png`
  - installed: `ios-standalone-more.png`, `android-standalone-more.png`
  - themes: `theme-{emerald,velvet,sapphire}-{tip,install}.png`
  - offline: `offline-main.png`, `offline-preview.png`
  - rough edge 2: `real-360x640-tip.png`
  - regression: `reg-reopened.png`
