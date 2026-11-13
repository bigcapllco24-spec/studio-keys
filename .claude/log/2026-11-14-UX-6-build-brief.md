# UX-6 build brief (studio-ux-dev, Build mode) - 14 Nov 2026, 00:20 IST check-in

Read `.claude/standards/dev-standards.md` first. The sections that matter most here:
- "How we build": plain modern JavaScript, no modules/frameworks/CDN imports; the page must keep working opened as a local file (no server); everything stays in the user's browser; keep `cloudflare/worker.js` free of backticks and `${` (the deploy embeds it with String.raw).
- "Quality bar": `bash .claude/tools/check.sh` passes (build, bundle syntax, Worker syntax, headless smoke test, phone checks); no console errors; never hard-code colours (manifest colours are the one place a literal hex is needed: use the Emerald theme's values from `:root` in `src/head.html`).
- Owner preference (UX-4 design approval, 13 Nov): "App path: installable web app only for now, no store apps."

## The item
UX-6 · Install Studio Keys on your phone's home screen · size S · already approved by the owner as part of the UX-4 design (choice "Installable web app only for now"), so this goes straight to a test link.
Done when: on Android Chrome and iPhone Safari, "Add to Home Screen" gives a Studio Keys icon that opens full screen, and the app opens again without a connection after one visit.

## The approved design (from `.claude/work/proposals/UX-4.md`, "Step A" and the build list)
- Web app manifest: name "Studio Keys", short name "Keys", theme colours, `display: standalone`, portrait, `start_url` and `scope` right for where it's served.
- Icons 192/512 px (plus maskable) and a 180 px Apple touch icon, drawn from the 3x3 logo, matte Emerald colours, no gradients or glows. Generate them with a small script (Python/Pillow or a canvas in headless Chrome); commit the PNGs (they're small) and the script if useful, e.g. `tools/make_icons.py`.
- Files: `pwa/manifest.webmanifest`, `pwa/sw.js`, `pwa/icon-192.png`, `pwa/icon-512.png`, `pwa/icon-maskable-512.png`, `pwa/apple-touch-icon.png`.
- `src/head.html`: manifest link, `apple-touch-icon` link, `theme-color` meta, `apple-mobile-web-app-capable` / status bar meta (UX-4 already added some of this; check and finish it).
- `src/boot.js`: register the service worker on https only (never on file://), with a scope that matches the page (`/` on the main site, `/p/preview-<id>/` on a test link: register `sw.js` relative to the page).
- Service worker: cache the page (and the manifest/icons) and nothing else. **Network first** for the page, cache fallback only when offline, so every release shows up at once when online and test links never get stuck on an old copy. Never cache `/api/*` (always network; no fallback). Version the cache name; clean old caches on activate. Keep it tiny and readable.
- The "Add to Home Screen" entry in the phone More list (built in UX-4): Android uses `beforeinstallprompt` for a real Install button; iPhone shows the one-time picture tip (Share → Add to Home Screen). Make sure both work and the button hides once installed (`display-mode: standalone`).
- `cloudflare/worker.js` - you have explicit permission for this file, **routing only, do not touch the AI prompt or `/api/*`**: serve `/manifest.webmanifest`, `/sw.js` and `/icons/<name>.png` (or whatever paths you choose, consistently) from the same branch as the page: from `main` on the main site and from the preview branch under `/p/preview-<id>/...` (fetched from raw.githubusercontent like index.html), with correct content types (`application/manifest+json`, `text/javascript` with `Service-Worker-Allowed` only if you need it, `image/png`), short cache for previews, a 404 for unknown files. Today every other address redirects to `/`; keep that for anything else. Keep the Worker free of backticks and `${`. Keep the change small and additive so it merges cleanly with SE-3 and AI-4, which change the prompt at the top of the same file.

## Branch and base
- Work on `preview-ux-6`, created from `origin/preview-ux-4` (UX-4's phone layout and More list are there; UX-4 itself is waiting for the owner's OK and ships before UX-6). Repo: /home/claude/studio-keys-repo (run `git fetch` first).
- Save WIP commits as you go and push the branch (`git push -u origin preview-ux-6`) at sensible checkpoints. Never push `main`.
- Rebuild `index.html` with `python3 tools/build.py` before every commit. Never edit index.html by hand.

## Testing
- `bash .claude/tools/check.sh` must pass (paste the summary).
- In headless Chrome on a local http server (the smoke test's server, or `python3 -m http.server`): the manifest is valid and linked (all icons load, sizes right), the service worker registers on http(s) localhost and not on file://, the page loads offline after one visit (Playwright `context.setOffline(true)` then reload), and online reloads get the new page (change a byte, reload, see it). `/api/*` is never served from the cache.
- Test the Worker routing logic locally (e.g. import the module in Node with a fake fetch, or a tiny harness) for `/manifest.webmanifest`, `/p/preview-ux-6/manifest.webmanifest`, `/p/preview-ux-6/sw.js`, an unknown file, and that `/` and `/p/preview-ux-6/` still serve the page.
- Check it at 390 and 360 px (tests/phone.mjs) - the More list install entry.

## Report (short and honest; save it as you go to /home/claude/studio-keys-repo/.claude/work/reports/UX-6-build.md, don't commit it, the lead does)
What changed (files), how you tested (numbers), the branch head commit, anything the lead must do at release (Worker deploy), what the owner should try on his phone (steps written for a musician), and what's left.
