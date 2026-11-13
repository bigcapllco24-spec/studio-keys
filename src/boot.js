/* ---------- boot ---------- */
$('#audioPill').onclick=ensureAudio; $('#bannerBtn').onclick=ensureAudio;
document.addEventListener('pointerdown',()=>{ if(A.ctx && A.ctx.state!=='running') ensureAudio(); },true);
document.addEventListener('keydown',()=>{ if(A.ctx && A.ctx.state!=='running') ensureAudio(); },true);
setVolume(CTRL.volume); setCurve(CTRL.curve); setTranspose(CTRL.transpose); $('#octVal').textContent='C'+CTRL.octave; setTempo(CTRL.bpm);
$('#padCh').value=String(padCh());
migrateSong(PROJ); songViewLoad(); renderRack(); applyLayout(); renderFx(); renderProfile(); renderMaps(); renderMixer(); renderTracks(); uiLoop(); drawWave(); drawRoll(0);
loadSet('piano').catch(()=>{}); [zoneInst('keys'),zoneInst('pads')].forEach(I=>{ if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); });
preloadTracks(); loadAudioFor(PROJ).then(()=>drawRolls()); detectEngine(); keepLastSong();
loadCustom();
initMIDI(false);
let rsz=0; window.addEventListener('resize',()=>{ clearTimeout(rsz); rsz=setTimeout(()=>{ drawWave(); drawIso(); drawHarm(); drawRolls(); drawRuler(); if(ED.tid) drawEditor(); drawRoll((performance.now()-MIC.t0)/1000); },120); });
setTimeout(()=>loadDemo(false),400);
phoneInit(); /* phone layout (UX-4): after every file has loaded */
/* installable web app (UX-6): the service worker sits next to the page, so its scope is the page's own folder
   ("/" on the main site, "/p/preview-<id>/" on a test link). Only on the website, never on a local file. */
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.isSecureContext){
  const swReg=()=>navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(document.readyState==='complete') setTimeout(swReg,0); else window.addEventListener('load',swReg);
}
