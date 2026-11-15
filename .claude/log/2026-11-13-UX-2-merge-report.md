# UX-2 merge report (studio-ux-dev), 13 Nov 2026
Merged origin/main (UX-1 Song view, 50b6315) into preview-ux-2 with a merge commit. New head 373ff00.
- src/daw.js: kept UX-2 editor hints and edGeomRows(); kept UX-1 openEditor(id,o) with pattern lines (ED.sid, ED.pat, edPatUI()); top row uses ns[0]+edGeomRows()-6 so the velocity lane fits.
- src/studio.js: kept UX-1 saveProject (clears projSaveT) and pagehide save; added UX-2 syncLoopState() at the start of saveProject. End of sung take: kept UX-1 backSong(); kept UX-2 chord count by distinct start times.
- tests/smoke.mjs: main's Song view block first, then UX-2's phone-width check (step 9); renamed UX-2 `const pl` to `pn` (name clash).
- index.html: took main, rebuilt.
- New smoke line 4c "Play button plays a new song in Song mode" (passes, no code change needed).
- check.sh: CHECK OK, SMOKE OK 36 checks. Own headless checks: Song-mode Play on a new song schedules notes; empty song disables Play; velocity lane inside editor box in Song mode; 390 px no sideways scroll; three themes no errors.
- Known limit: newSong() resets view to Loop (UX-1 behaviour). Suggests a short tester re-test on 373ff00.
