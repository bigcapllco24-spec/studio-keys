# UX-6 build report (studio-ux-dev) - Install Studio Keys on your phone's home screen

Branch `preview-ux-6` (from `origin/preview-ux-4`), head **8d7c605**, pushed. `main` not touched.
Test link once UX-4 is merged or right now on the branch: https://studio-keys.bigcapllco24.workers.dev/p/preview-ux-6/ (the installable parts only work there after the Worker deploy, see "Release").

## What changed
- `pwa/manifest.webmanifest`: name "Studio Keys", short name "Keys", `display: standalone`, Emerald `theme_color`/`background_color` #07120e (`--t1`), `start_url`, `scope` and `id` all `./`, so they resolve to `/` on the main site and `/p/preview-<id>/` on a test link. Icons 192, 512 and maskable 512.
- `pwa/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180): the 3x3 logo in matte Emerald (ink squares, jade top-middle square, `--t1`/`--t3`/`--t6` surfaces), no gradients or glows, 3-21 KB each. Made by `tools/make_icons.py` (Pillow). Rerun it if the logo or colours change.
- `pwa/sw.js` (46 lines): **network first** for the page, with the saved copy used only when the network fails. The manifest and icons are handled the same way. Anything else, including `/api/*`, fonts and other test links, is not intercepted at all. Each scope gets its own versioned cache (`studio-keys-v1-<scope>`), so the main site and test links never mix. On activate it deletes only older caches from its own scope, and saves the page again if the copy made at install failed. It uses `skipWaiting` and `clients.claim`.
- `src/head.html`:
  - New tags: `apple-touch-icon` link, `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title` "Keys" and `apple-mobile-web-app-status-bar-style` black-translucent. UX-4's safe-area padding already keeps the top bar clear of the clock. The `theme-color` meta was already there.
  - The manifest link is added by a two-line inline script, and only on http(s). On `file://`, Chrome logs a CORS error for a static manifest link.
  - CSS for the install steps and the one-time tip, using theme variables only.
- `src/body.html` (More → Add to Home Screen page):
  - An **Install Studio Keys** button for Android.
  - A 3-step picture guide for iPhone, with a Share icon, an Add icon and the logo: Share (inside the ⋯ menu on newer iPhones), Add to Home Screen, Add.
  - Chrome-menu steps for Android when there's no install prompt.
  - An "on your home screen" line shown once installed.
  - The one-time tip markup.
- `src/phone.js`: small block `phInstInit` / `phInstUI` / `phInstallGo` / `phInstTipCheck`. (UX-4 created this file; the brief said to finish its install entry.)
  - `beforeinstallprompt` is captured and drives a real Install button. `appinstalled` hides everything and shows a toast.
  - Once installed (`display-mode: standalone` or `navigator.standalone`), the More entry and the tip are hidden.
  - **One-time tip**: on phones over http(s), on iPhone, or on Android when Chrome offers installing. It shows once the user has made a part and nothing is playing, recording, singing or open. It appears once ever (localStorage `studiokeys.installTip`). "How" opens the page and "Install" opens Chrome's prompt.
  - When running installed it calls `navigator.storage.persist()` to keep songs safe (this was in the UX-4 proposal table).
- `src/boot.js`: `navigator.serviceWorker.register('sw.js')` after load, only when the page is http(s) and a secure context (never on `file://`). Because the path is relative, the scope is the page's own folder.
- `cloudflare/worker.js`: **routing only**; the prompt and `/api/*` are untouched. No backticks or `${`.
  - Adds an `APP_FILES` table and `appFile()`, plus 2 lines before the page routing.
  - Serves `/manifest.webmanifest`, `/sw.js` and `/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png`, plus the same under `/p/preview-<id>/`, from `pwa/` on the same branch via raw.githubusercontent.
  - Content types are `application/manifest+json`, `text/javascript` and `image/png`. `sw.js` is always `no-cache`. Manifest and icons get 1 hour on main and `no-cache` on test links. Test links also get `noindex`.
  - An unknown `/icons/*` file, or a branch without the files, returns 404. Every other address still redirects to `/` as before. `Service-Worker-Allowed` isn't needed.

## Differs from the brief or design
- **Orientation is `any`, not portrait.** On Android a portrait lock in the manifest would stop UX-4's sideways note editor and the two-octave sideways keyboard from working in the installed app. iPhone ignores the setting either way.
- **The one-time tip sits under the top bar, not at the bottom.** At the bottom it covered the big Keys button.
- **The manifest link is injected by script on http(s), not static.** This avoids a console error when the page is opened as a local file. Chrome and Safari both pick it up; Chrome reports the app as installable.

## Tests (headless Chrome, local server that runs the real `cloudflare/worker.js` with raw.githubusercontent mapped to the built files)
- `bash .claude/tools/check.sh`: **CHECK OK** (bundle syntax, Worker syntax, SMOKE OK 39 checks, PHONE OK 13 checks). Run twice.
- **Worker routing** (Node, fake fetch): 16 of 16 real checks pass.
  - `/manifest.webmanifest`, `/sw.js` and both icons come from main with the right types.
  - `/p/preview-ux-6/manifest.webmanifest`, `sw.js` and the maskable icon come from the preview branch.
  - `/icons/nope.png`, `/p/preview-ux-6/icons/evil.png` and `/p/preview-gone/sw.js` return 404.
  - `/favicon.ico` and `/random/path` still return 302 to `/`.
  - `/` and `/p/preview-ux-6/` still serve the page; `/p/preview-ux-6` still redirects to add the slash; `/api/config` is unchanged.
- **PWA**: 29 of 30 pass for both `/` and `/p/preview-ux-6/`. The one fail is the Google Fonts request blocked by this sandbox, identical on `preview-ux-4`.
  - **Manifest**: linked, valid, correct type. Start and scope match the page. All 4 icons load at their stated sizes (192, 512, maskable 512, apple 180).
  - **Installability**: Chrome's `Page.getInstallabilityErrors` and `getAppManifest` errors are both empty on both URLs.
  - **Service worker**: registers with scope `/` and `/p/preview-ux-6/`, controls the page, and the cache holds exactly 6 entries (page, manifest, 4 icons).
  - **`file://`**: no service worker.
  - **`/api/assistant`** reaches the server every time (1 hit per call) and is never in any cache.
  - **Online freshness**: changed the page title on the server and reloaded; the new page showed at once. Same when changing it back.
  - **Offline**: killed the server and reloaded; the app opened from the saved copy (orb present, `PROJ` alive), and `/api` failed with a network error (no saved answer).
  - The main site and a test link in one browser keep 2 separate service workers and caches.
- **Install UI**: 17 of 17 pass at 390x844 and 360x780 with iPhone and Android user agents. Screenshots checked in Emerald, Velvet and Sapphire.
  - **iPhone**: picture steps, no sideways scroll. The tip appears under the top bar (y 60-154; the Keys button starts at 545-609). "How" opens the page and closes the tip, and the tip never shows again after a reload.
  - **Android** with a fake `beforeinstallprompt`: the default is prevented, the Install button shows and opens the prompt exactly once, then hides; `appinstalled` gives a toast.
  - **Android without a prompt**: Chrome menu steps, no button, no tip.
  - **Installed (standalone)**: no More entry and no tip.
  - **Desktop at 1400 px**: the tip is never shown.
  - No page errors.
- Test scripts (scratch, for QA to reuse): `/tmp/claude-0/-home-claude/0ea7d9b5-5dab-52c4-a2a3-57210a67d7e2/scratchpad/ux6/{server.mjs,wtest.mjs,pwatest.mjs,uitest.mjs}`. Screenshots are in `.../ux6/shots/`.

## Release (lead)
- **The Worker must be deployed in the same release** (routing only, same deploy recipe and `keep_bindings`). Until then, the live Worker redirects `/manifest.webmanifest`, `/sw.js` and `/icons/*` to `/`. The page still works, but nothing installs, and Chrome may log a manifest parse error. Deploying the Worker before merging is safe: `main` has no `pwa/` folder yet, so the new routes just return 404s nobody asks for.
- The changes to `worker.js` sit below the `SYSTEM` prompt and don't touch it, so they should merge cleanly with SE-3 and AI-4. The 4-line header comment gained one line.
- Ships after UX-4 (this branch is on top of it).
- Later changes to `pwa/sw.js` behaviour or its file list: bump `VERSION`. Ordinary releases don't need it (network first).
- QA could add to `tests/smoke.mjs`: serve over http, check the manifest link, `sw.js` registration and the offline reload (needs a small http server; today the smoke test runs on `file://`).

## Owner try steps (after the Worker deploy)
1. **Android, Chrome**:
   1. Open the test link and ask Keys for a beat.
   2. A card "Put Studio Keys on your home screen" appears at the top. Tap **Install** (or More → Add to Home Screen → Install Studio Keys).
   3. Open the Keys icon on your home screen: it opens full screen, with no address bar.
2. **iPhone, Safari**:
   1. Open the test link and ask Keys for a beat.
   2. The card appears; tap **How**. Follow the 3 pictures: Share (inside ⋯ on newer iPhones), Add to Home Screen, Add.
   3. Open the Keys icon: full screen.
3. **Offline**: open the app once, turn on flight mode and open the icon again. The studio opens. Your songs are there and simple requests to Keys work; the AI and Spotify need the internet.
4. **Installed app**: in the app, More no longer shows "Add to Home Screen", and the card never comes back.

## Known limits
- Talking to Keys in the iPhone home-screen app may not start (Apple). The UX-4 fallback (Type, plus the keyboard's dictation mic) covers it. Singing works.
- The first visit to a test link downloads the 9.5 MB page twice: once to open it and once to save it, because test links are `no-store`. The main site reuses the browser's copy.
- Offline, fonts fall back to system fonts (only the page, manifest and icons are saved, as briefed).
- Not tested on real phones from here: the Android install prompt and the iPhone Add to Home Screen need the owner's devices.
