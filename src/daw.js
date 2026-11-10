
/* ---------- DAW workspace: playlist of tracks, piano roll / step sequencer, mixer view, song manager ---------- */
const DRUM_ROWS=[[49,'Crash'],[51,'Ride'],[46,'Open hat'],[44,'Pedal hat'],[42,'Closed hat'],[56,'Cowbell'],[50,'High tom'],[47,'Mid tom'],[45,'Low tom'],[37,'Rim'],[39,'Clap'],[38,'Snare'],[36,'Kick']];
const ED={tid:null,grid:0.25,top:84,rowH:13,sel:null,drag:null,paint:null};
let VIEW='playlist';
function setView(v){ VIEW=v; document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===v))); $('#playlist').hidden=v!=='playlist'; $('#mixerView').hidden=v!=='mixer'; if(v==='mixer') renderMixerView(); else drawRolls(); }
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

/* ----- track list ----- */
let instOpts='';
function instOptions(){ if(!instOpts){ instOpts=CAT_ORDER.concat(['Mine']).map(cat=>{ const l=ORDER.map(id=>INST.get(id)).filter(i=>i.cat===cat); return l.length?`<optgroup label="${cat}">${l.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('')}</optgroup>`:''; }).join(''); } return instOpts; }
function renderTracks(){
  instOpts='';
  $('#projName').value=PROJ.name; $('#barsSel').value=String(PROJ.bars); $('#keySel').value=PROJ.key?`${PROJ.key.tonic}:${PROJ.key.mode}`:'';
  $('#keyInfo').textContent=PROJ.key?'':`detected ${keyName(projectKey())}`;
  const box=$('#tracks');
  if(!PROJ.tracks.length){ box.innerHTML='<div class="custom-empty big">No tracks yet. Ask the assistant (“Keys, give me a house beat at 124”), hum a melody, press Record and play, or use the + buttons.</div>'; closeEditor(); drawRuler(); renderFaders(); return; }
  box.innerHTML=PROJ.tracks.map((t,i)=>`<div class="trk${t.id===ED.tid?' sel':''}${trackAudible(t)?'':' quiet'}" data-tid="${t.id}" style="--c:${t.color}">
    <div class="th">
      <div class="th1"><span class="tnum">${i+1}</span><input class="tname" value="${esc(t.name)}" data-tname="${t.id}" aria-label="Track name">
        <button class="ib${PREVIEW===t.id?' on':''}" type="button" data-prev="${t.id}" title="Play only this track">${PREVIEW===t.id?'■':'▶'}</button>
        <button class="ib ms${t.mute?' on':''}" type="button" data-mute="${t.id}" aria-pressed="${!!t.mute}" title="Mute">M</button>
        <button class="ib ms${t.solo?' on':''}" type="button" data-solo="${t.id}" aria-pressed="${!!t.solo}" title="Solo">S</button></div>
      <div class="th2">${t.kind==='notes'?`<select class="select inline tinst" data-tinst="${t.id}" aria-label="Instrument for ${esc(t.name)}">${instOptions()}</select>`:'<span class="trole">Recorded audio</span>'}
        <input class="tvol" type="range" min="0" max="100" value="${Math.round(t.vol*100)}" data-vol="${t.id}" aria-label="${esc(t.name)} volume" title="Volume"></div>
      <div class="th3"><span class="trole">${ROLE_NAME[t.role]||'Part'} · ${t.kind==='audio'?'audio':t.events.length+' notes'}</span>
        <span class="row" style="gap:4px">${t.kind==='notes'?`<button class="lk" type="button" data-edit="${t.id}">Edit</button>`:''}<button class="lk" type="button" data-dup="${t.id}">Duplicate</button><button class="lk del-l" type="button" data-tdel="${t.id}">Delete</button></span></div>
    </div>
    <canvas class="troll" data-roll="${t.id}" aria-label="${esc(t.name)} clip. Click to edit."></canvas>
  </div>`).join('');
  PROJ.tracks.forEach(t=>{ const s=box.querySelector(`[data-tinst="${t.id}"]`); if(s) s.value=t.inst; });
  if(ED.tid && !PROJ.tracks.find(t=>t.id===ED.tid)) closeEditor();
  drawRolls(); drawRuler(); renderFaders(); if(VIEW==='mixer') renderMixerView(); if(ED.tid) drawEditor();
}
function drawRuler(){ const cv=$('#ruler'); if(!cv||!cv.clientWidth) return; const {g,w,h}=prepCanvas(cv), L=PROJ.bars*4; g.font='11px '+cssVar('--mono'); for(let b=0;b<=L;b++){ const x=b/L*w; g.fillStyle=b%4===0?cssVar('--muted'):cssVar('--line'); g.fillRect(Math.min(w-1,x),b%4===0?6:14,1,h); if(b%4===0&&b<L){ g.fillStyle=cssVar('--muted'); g.fillText(String(b/4+1),x+4,13); } } }
function drawRolls(){
  const L=PROJ.bars*4, line=cssVar('--line'), mut=cssVar('--muted');
  PROJ.tracks.forEach(t=>{ const cv=document.querySelector(`[data-roll="${t.id}"]`); if(!cv||!cv.clientWidth) return; const {g,w,h}=prepCanvas(cv);
    g.fillStyle=t.color+'14'; g.fillRect(0,0,w,h);
    for(let b=0;b<=L;b++){ g.fillStyle=b%4===0?mut+'66':line; g.fillRect(Math.min(w-1,b/L*w),0,1,h); }
    g.fillStyle=t.color;
    if(t.kind==='audio'){ const buf=AUD.get(t.id); if(!buf){ g.fillStyle=mut; g.font='11px '+cssVar('--mono'); g.fillText('loading audio…',6,h/2); return; } const d=buf.getChannelData(0), per=Math.max(1,Math.floor(d.length/w)), secW=w/(L*spb())*buf.duration;
      for(let x=0;x<Math.min(w,secW);x++){ let m=0; for(let i=x*per;i<(x+1)*per&&i<d.length;i+=4) m=Math.max(m,Math.abs(d[i])); g.fillRect(x,h/2-m*h*0.45,1,Math.max(1,m*h*0.9)); } return; }
    if(!t.events.length){ g.fillStyle=mut; g.font='11px '+cssVar('--body'); g.fillText('Empty · click to add notes',8,h/2+4); return; }
    const ns=t.events.map(e=>e.n), lo=Math.min(...ns), hi=Math.max(...ns), rngN=Math.max(6,hi-lo);
    t.events.forEach(e=>{ const x=mod(e.b,L)/L*w, y=h-5-((e.n-lo)/rngN)*(h-12); g.globalAlpha=0.45+0.55*e.v; g.fillRect(x,y-2,Math.max(2,e.d/L*w-1),4); }); g.globalAlpha=1; });
}
$('#tracks').addEventListener('change',e=>{ const s=e.target.closest('[data-tinst]'); if(s){ const t=PROJ.tracks.find(x=>x.id===s.dataset.tinst); const I=INST.get(s.value); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); if(t.name===(INST.get(t.inst)||{}).name) t.name=I.name; t.inst=s.value; saveProject(); renderTracks(); } });
$('#tracks').addEventListener('input',e=>{ const n=e.target.closest('[data-tname]'); if(n){ const t=PROJ.tracks.find(x=>x.id===n.dataset.tname); t.name=n.value.slice(0,40); saveProject(); if(ED.tid===t.id) $('#edTitle').textContent=t.name; } });
$('#tracks').addEventListener('click',e=>{
  const d=e.target.closest('[data-tdel]'); if(d){ if(d.dataset.armed){ const t=removeTrack(d.dataset.tdel); if(t) toast(`Deleted “${t.name}”`); } else { d.dataset.armed='1'; d.textContent='Confirm delete'; setTimeout(()=>{ if(d.isConnected){ delete d.dataset.armed; d.textContent='Delete'; } },3000); } return; }
  const p=e.target.closest('[data-prev]'); if(p){ togglePreview(p.dataset.prev); return; }
  const du=e.target.closest('[data-dup]'); if(du){ duplicateTrack(du.dataset.dup); return; }
  const ed=e.target.closest('[data-edit]'); if(ed){ openEditor(ed.dataset.edit); return; }
  const r=e.target.closest('.troll'); if(r){ const t=PROJ.tracks.find(x=>x.id===r.dataset.roll); if(t&&t.kind==='notes') openEditor(t.id); }
});
function duplicateTrack(id){ const t=PROJ.tracks.find(x=>x.id===id); if(!t) return; const c=makeTrack(Object.assign(serialize(t),{id:undefined,name:t.name+' copy',solo:false})); c.id='t'+Date.now().toString(36)+Math.floor(Math.random()*1e4); c.color=TRACK_COLORS[PROJ.tracks.length%TRACK_COLORS.length];
  if(t.kind==='audio'&&AUD.has(t.id)){ AUD.set(c.id,AUD.get(t.id)); const d=AUD.get(t.id).getChannelData(0); IDB.put('aud:'+c.id,{sr:AUD.get(t.id).sampleRate,data:new Float32Array(d)},'audio').catch(()=>{}); }
  PROJ.tracks.splice(PROJ.tracks.indexOf(t)+1,0,c); saveProject(); renderTracks(); toast(`Duplicated “${t.name}”`); }
function togglePreview(id){
  ensureAudio();
  if(PREVIEW===id){ PREVIEW=null; if(TR.running) loopStop(); renderTracks(); return; }
  PREVIEW=id; refreshTrackGains(); if(!TR.running) loopPlay(); renderTracks();
}

/* ----- editor: piano roll for notes, step sequencer for drums ----- */
function edTrack(){ return PROJ.tracks.find(t=>t.id===ED.tid); }
function isDrumTrack(t){ return t && (t.role==='drums' || (INST.get(t.inst)||{}).drums); }
function openEditor(id){ const t=PROJ.tracks.find(x=>x.id===id); if(!t||t.kind!=='notes') return; ED.tid=id; ED.sel=null;
  if(!isDrumTrack(t) && t.events.length){ const ns=t.events.map(e=>e.n).sort((a,b)=>a-b); ED.top=clamp(ns[ns.length-1]+6,40,120); } else if(!isDrumTrack(t)) ED.top=t.role==='bass'?54:84;
  $('#editor').hidden=false; $('#edTitle').textContent=t.name; $('#edHint').textContent=isDrumTrack(t)?'Click a step to add or remove a hit · Shift+click for a soft hit · Click a row name to hear it':'Click to add a note · Drag to move · Drag the right edge to resize · Right-click or double-click to delete · Scroll for higher or lower notes';
  document.querySelectorAll('.trk').forEach(r=>r.classList.toggle('sel',r.dataset.tid===id)); drawEditor(); $('#editor').scrollIntoView({behavior:'smooth',block:'nearest'}); }
function closeEditor(){ ED.tid=null; $('#editor').hidden=true; document.querySelectorAll('.trk.sel').forEach(r=>r.classList.remove('sel')); }
$('#edClose').onclick=closeEditor;
$('#edGrid').addEventListener('change',e=>{ ED.grid=+e.target.value; drawEditor(); });
$('#edQuant').onclick=()=>{ const t=edTrack(); if(!t) return; const q=ED.grid; t.events.forEach(e=>{ e.b=Math.round(e.b/q)*q; e.d=Math.max(q,Math.round(e.d/q)*q); delete e.cyc; }); edChanged(); toast('Notes quantized to the grid'); };
$('#edUp').onclick=()=>edShift(1); $('#edDown').onclick=()=>edShift(-1);
function edShift(s){ const t=edTrack(); if(!t||isDrumTrack(t)) return; t.events.forEach(e=>e.n+=s); ED.top+=s; edChanged(); }
$('#edClear').onclick=()=>{ const t=edTrack(); if(!t) return; const b=$('#edClear'); if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent='Confirm clear'; setTimeout(()=>{ delete b.dataset.armed; b.textContent='Clear notes'; },3000); return; } delete b.dataset.armed; b.textContent='Clear notes'; t.events=[]; edChanged(); };
function edChanged(){ const t=edTrack(); if(t){ t.gen=false; t.events.forEach(e=>{ if(e.cyc!==undefined && !TR.running) delete e.cyc; }); } saveProject(); drawEditor(); drawRolls(); const r=document.querySelector(`.trk[data-tid="${ED.tid}"] .trole`); if(r&&t) r.textContent=`${ROLE_NAME[t.role]||'Part'} · ${t.events.length} notes`; }
function drumRows(t){ const rows=DRUM_ROWS.slice(); t.events.forEach(e=>{ if(!rows.some(r=>r[0]===e.n)) rows.unshift([e.n,DRUM_LABEL[drumPiece(e.n)]+' '+noteName(e.n)]); }); return rows; }
function edGeom(){ const t=edTrack(), L=PROJ.bars*4, K=78, cv=$('#edCanvas'), wrap=$('#edWrap');
  if(isDrumTrack(t)){ const rows=drumRows(t), steps=L*4, cw=Math.max(16,(wrap.clientWidth-K-2)/steps), rh=24; return {drum:true,rows,steps,cw,rh,K,L,W:K+steps*cw,H:rows.length*rh}; }
  const rows=36, rh=ED.rowH, W=Math.max(wrap.clientWidth-2,400); return {drum:false,rows,rh,K,L,W,H:rows*rh,bw:(W-K)/L}; }
function drawEditor(){
  const t=edTrack(); if(!t) return; const G=edGeom(), cv=$('#edCanvas'), dpr=devicePixelRatio||1;
  cv.style.width=G.W+'px'; cv.style.height=G.H+'px'; cv.width=Math.round(G.W*dpr); cv.height=Math.round(G.H*dpr);
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,G.W,G.H);
  const line=cssVar('--line'), mut=cssVar('--muted'), ink=cssVar('--ink'); g.font='11px '+cssVar('--mono');
  if(G.drum){
    G.rows.forEach(([n,label],r)=>{ const y=r*G.rh; g.fillStyle=r%2?'#16191d':'#1a1d22'; g.fillRect(0,y,G.W,G.rh); g.fillStyle=ink; g.fillText(label,8,y+16); });
    for(let s=0;s<=G.steps;s++){ const x=G.K+s*G.cw; g.fillStyle=s%16===0?mut:s%4===0?'#4a505a':line; g.fillRect(x,0,1,G.H); }
    for(let s=0;s<G.steps;s+=4) if((s/4)%2===1){ g.fillStyle='rgba(255,255,255,.025)'; g.fillRect(G.K+s*G.cw,0,G.cw*4,G.H); }
    t.events.forEach(e=>{ const r=G.rows.findIndex(x=>x[0]===e.n), s=Math.round(e.b*4); if(r<0||s>=G.steps) return; g.fillStyle=t.color; g.globalAlpha=0.35+0.65*e.v; g.fillRect(G.K+s*G.cw+2,r*G.rh+3,G.cw-4,G.rh-6); g.globalAlpha=1; });
  } else {
    for(let r=0;r<G.rows;r++){ const n=ED.top-r, y=r*G.rh, blk=isBlack(n); g.fillStyle=blk?'#15171b':'#1c1f24'; g.fillRect(G.K,y,G.W-G.K,G.rh); g.fillStyle=blk?'#2a2d33':'#e9e3d6'; g.fillRect(0,y,G.K-30,G.rh-1);
      if(n%12===0){ g.fillStyle=mut; g.fillText(noteName(n),G.K-28,y+G.rh-2); g.fillStyle=line; g.fillRect(G.K,y+G.rh-1,G.W,1); } }
    const q=ED.grid; for(let b=0;b<=G.L+1e-9;b+=q){ const x=G.K+b*G.bw; const bar=Math.abs(b%4)<1e-6, beat=Math.abs(b%1)<1e-6; g.fillStyle=bar?mut:beat?'#4a505a':'rgba(255,255,255,.05)'; g.fillRect(x,0,1,G.H); }
    t.events.forEach(e=>{ const r=ED.top-Math.round(e.n); if(r<0||r>=G.rows) return; const x=G.K+e.b*G.bw, y=r*G.rh, w=Math.max(4,e.d*G.bw-1);
      g.fillStyle=t.color; g.globalAlpha=0.45+0.55*e.v; g.fillRect(x,y+1,w,G.rh-2); g.globalAlpha=1; if(e===ED.sel){ g.strokeStyle=ink; g.lineWidth=1.5; g.strokeRect(x+0.5,y+1.5,w-1,G.rh-3); } g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(x+w-3,y+2,2,G.rh-4); });
    const above=t.events.filter(e=>Math.round(e.n)>ED.top).length, below=t.events.filter(e=>Math.round(e.n)<=ED.top-G.rows).length;
    g.fillStyle=cssVar('--accent'); if(above) g.fillText(`▲ ${above} higher`,G.W-90,12); if(below) g.fillText(`▼ ${below} lower`,G.W-90,G.H-4);
  }
}
function previewNote(t,n){ const c=ensureAudio(); if(!c) return; const I=INST.get(t.inst); if(!I) return; try{ const v=I.play(c,trackStrip(t).inp,n,0.8,c.currentTime); if(v&&!v.oneShot) v.release(c.currentTime+0.25); }catch(e){} }
(function(){
  const cv=$('#edCanvas');
  const pos=e=>{ const r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
  const snap=b=>Math.floor(b/ED.grid+1e-6)*ED.grid;
  const hit=(t,G,p)=>{ for(let i=t.events.length-1;i>=0;i--){ const e=t.events[i], r=ED.top-Math.round(e.n), x=G.K+e.b*G.bw, w=Math.max(4,e.d*G.bw); if(p.y>=r*G.rh&&p.y<(r+1)*G.rh&&p.x>=x&&p.x<=x+w) return {e,edge:p.x>x+w-7}; } return null; };
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('pointerdown',e=>{
    const t=edTrack(); if(!t) return; const G=edGeom(), p=pos(e); e.preventDefault(); ensureAudio();
    if(G.drum){ const r=Math.floor(p.y/G.rh), row=G.rows[r]; if(!row) return; if(p.x<G.K){ previewNote(t,row[0]); return; }
      const s=Math.floor((p.x-G.K)/G.cw); if(s<0||s>=G.steps) return; const has=t.events.some(x=>x.n===row[0]&&Math.round(x.b*4)===s);
      ED.paint={on:!has,soft:e.shiftKey,row:row[0]}; paintStep(t,row[0],s,ED.paint); try{ cv.setPointerCapture(e.pointerId); }catch(_){} return; }
    if(p.x<G.K){ const n=ED.top-Math.floor(p.y/G.rh); previewNote(t,n); return; }
    const h=hit(t,G,p);
    if(e.button===2){ if(h){ t.events.splice(t.events.indexOf(h.e),1); ED.sel=null; edChanged(); } return; }
    if(h){ ED.sel=h.e; ED.drag={mode:h.edge?'resize':'move',e:h.e,x0:p.x,y0:p.y,b0:h.e.b,n0:h.e.n,d0:h.e.d}; }
    else { const b=clamp(snap((p.x-G.K)/G.bw),0,G.L-ED.grid), n=ED.top-Math.floor(p.y/G.rh), ne={b,d:Math.max(ED.grid,0.25),n,v:0.8}; t.events.push(ne); ED.sel=ne; ED.drag={mode:'resize',e:ne,x0:p.x,y0:p.y,b0:b,n0:n,d0:ne.d}; previewNote(t,n); }
    try{ cv.setPointerCapture(e.pointerId); }catch(_){} drawEditor();
  });
  cv.addEventListener('pointermove',e=>{
    const t=edTrack(); if(!t) return; const G=edGeom(), p=pos(e);
    if(G.drum){ if(!ED.paint) return; const r=Math.floor(p.y/G.rh), row=G.rows[r], s=Math.floor((p.x-G.K)/G.cw); if(row&&s>=0&&s<G.steps) paintStep(t,row[0],s,ED.paint); return; }
    const D=ED.drag; if(!D){ const h=hit(t,G,p); cv.style.cursor=h?(h.edge?'ew-resize':'grab'):'crosshair'; return; }
    if(D.mode==='move'){ const nb=clamp(Math.round((D.b0+(p.x-D.x0)/G.bw)/ED.grid)*ED.grid,0,G.L-ED.grid), nn=D.n0-Math.round((p.y-D.y0)/G.rh); if(nn!==D.e.n) previewNote(t,nn); D.e.b=nb; D.e.n=nn; }
    else { const end=Math.max(D.e.b+ED.grid,Math.ceil(((p.x-G.K)/G.bw)/ED.grid-1e-6)*ED.grid); D.e.d=Math.min(end,G.L)-D.e.b; }
    drawEditor();
  });
  const up=()=>{ if(ED.drag||ED.paint){ ED.drag=null; ED.paint=null; edChanged(); } };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  cv.addEventListener('dblclick',e=>{ const t=edTrack(); if(!t) return; const G=edGeom(); if(G.drum) return; const h=hit(t,G,pos(e)); if(h){ t.events.splice(t.events.indexOf(h.e),1); ED.sel=null; edChanged(); } });
  cv.addEventListener('wheel',e=>{ const t=edTrack(); if(!t||isDrumTrack(t)) return; e.preventDefault(); ED.top=clamp(ED.top+(e.deltaY>0?-2:2),40,127); drawEditor(); },{passive:false});
  document.addEventListener('keydown',e=>{ if(!ED.sel||!ED.tid) return; const tg=e.target; if(tg&&/INPUT|SELECT|TEXTAREA/.test(tg.tagName)) return; if(e.key==='Delete'||e.key==='Backspace'){ const t=edTrack(); const i=t.events.indexOf(ED.sel); if(i>=0){ t.events.splice(i,1); ED.sel=null; edChanged(); e.preventDefault(); } } });
})();
function paintStep(t,n,s,P){ const i=t.events.findIndex(x=>x.n===n&&Math.round(x.b*4)===s);
  if(P.on&&i<0){ t.events.push({b:s/4,d:0.25,n,v:P.soft?0.55:0.92}); previewNote(t,n); } else if(!P.on&&i>=0) t.events.splice(i,1); drawEditor(); }

/* ----- mixer view ----- */
function renderMixerView(){
  const ch=[['keys','Keys (live)',zoneInst('keys').name,'#ff9b42'],['pads','Pads (live)',zoneInst('pads').name,'#5ccfdb'],...PROJ.tracks.map(t=>[t.id,t.name,t.kind==='audio'?'Recorded audio':(INST.get(t.inst)||{}).name||'',t.color]),['master','Master','After effects','#ece7dd']];
  $('#mixerView').innerHTML=`<div class="mixer">${ch.map(([id,nm,sub,col])=>{ const cfg=chCfg(id); return `<div class="mstrip" style="--c:${col}"><div class="mname"><span class="tsw"></span><b>${esc(nm)}</b><span>${esc(sub)}</span></div>${stripControls(id,cfg,{solo:!MIX[id],name:nm})}</div>`; }).join('')}</div>`;
}

/* ----- playhead and position ----- */
(function anim(){ requestAnimationFrame(anim);
  const ph=$('#playhead'), first=document.querySelector('.troll'), pos=$('#posDisp');
  if(!TR.running||!LOOP.L||LOOP.state==='counting'){ ph.style.display='none'; if(pos) pos.textContent=LOOP.state==='counting'?'Count-in':'1 . 1'; return; }
  const beat=mod(LOOP.rawBeat(),LOOP.L); if(pos) pos.textContent=`${Math.floor(beat/4)+1} . ${Math.floor(beat%4)+1}`;
  if(first && VIEW==='playlist'){ const r=first.getBoundingClientRect(), pr=$('#playlist').getBoundingClientRect(); ph.style.display='block'; ph.style.left=(r.left-pr.left+beat/LOOP.L*r.width)+'px'; ph.style.top=(r.top-pr.top-22)+'px'; ph.style.height=($('#tracks').getBoundingClientRect().bottom-r.top+22)+'px'; } else ph.style.display='none';
  const ec=$('#edCanvas'), t=edTrack(); if(t && ED.tid && !$('#editor').hidden){ const G=edGeom(); const x=G.drum?G.K+beat*4*G.cw:G.K+beat*G.bw; const m=$('#edPlay'); m.style.left=x+'px'; m.style.height=G.H+'px'; m.style.display='block'; }
})();

/* ----- song manager ----- */
let projAutoT=0;
function autoSaveNamed(){ clearTimeout(projAutoT); projAutoT=setTimeout(()=>saveNamed(true),1500); }
async function refreshProjList(){}
async function saveNamed(quiet){
  const key=PROJ.id;
  try{ await IDB.put(key,{key,name:PROJ.name,bpm:CTRL.bpm,bars:PROJ.bars,tracks:PROJ.tracks.length,savedAt:Date.now(),proj:Object.assign(serialize(PROJ),{bpm:CTRL.bpm})},'projects');
    $('#saveState').textContent='Saved '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); if(!quiet) toast(`Saved “${PROJ.name}”`); }
  catch(e){ $('#saveState').textContent='Not saved'; if(!quiet) toast('Couldn’t save in this browser: '+e.message); }
}
async function loadAudioFor(p){ for(const t of p.tracks){ if(t.kind==='audio' && !AUD.has(t.id)){ try{ const r=await IDB.get('aud:'+t.id,'audio'); if(r) AUD.set(t.id,makeBuf(r.data,r.sr)); }catch(e){} } } }
async function loadNamed(key){ let r=null; try{ r=await IDB.get(key,'projects'); }catch(e){} if(!r) return; loopStop(); PREVIEW=null; closeEditor(); PROJ=Object.assign(newProject(),r.proj); if(r.proj.bpm) setTempo(r.proj.bpm); await loadAudioFor(PROJ); preloadTracks(); LOOP.state=PROJ.tracks.length?'stopped':'empty'; store.set('project',serialize(PROJ)); renderTracks(); uiLoop(); toast(`Opened “${PROJ.name}”`); }
async function newSong(name){ await saveNamed(true); loopStop(); PREVIEW=null; closeEditor(); PROJ=newProject(); if(name) PROJ.name=String(name).slice(0,60); LOOP.state='empty'; store.set('project',serialize(PROJ)); renderTracks(); uiLoop(); $('#saveState').textContent='New song'; }
async function saveCopy(){ await saveNamed(true); PROJ=Object.assign(serialize(PROJ),{id:'p'+Date.now().toString(36),name:PROJ.name+' (copy)'}); await saveNamed(); renderTracks(); }
function preloadTracks(){ PROJ.tracks.forEach(t=>{ const I=INST.get(t.inst); if(I&&I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); }); }
async function openSongs(){
  const m=$('#projModal'); m.hidden=false; let list=[]; try{ list=await IDB.all('projects'); }catch(e){} list.sort((a,b)=>b.savedAt-a.savedAt);
  $('#projItems').innerHTML=list.length?list.map(p=>`<div class="pitem${p.key===PROJ.id?' cur':''}"><div><b>${esc(p.name)}</b><span>${p.bpm} BPM · ${p.bars||4} bars · ${p.tracks??(p.proj.tracks||[]).length} tracks · ${new Date(p.savedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</span></div><div class="row"><button class="btn small primary" type="button" data-open="${esc(p.key)}">${p.key===PROJ.id?'Open (current)':'Open'}</button><button class="btn small ghost" type="button" data-pdel="${esc(p.key)}">Delete</button></div></div>`).join(''):'<div class="custom-empty">No saved songs yet. Your current song saves automatically as you work.</div>';
}
$('#projModal').addEventListener('click',async e=>{
  if(e.target===$('#projModal')||e.target.closest('#projClose')){ $('#projModal').hidden=true; return; }
  const o=e.target.closest('[data-open]'); if(o){ $('#projModal').hidden=true; if(o.dataset.open!==PROJ.id) await loadNamed(o.dataset.open); return; }
  const d=e.target.closest('[data-pdel]'); if(d){ if(!d.dataset.armed){ d.dataset.armed='1'; d.textContent='Confirm delete'; return; } await IDB.del(d.dataset.pdel,'projects').catch(()=>{}); if(d.dataset.pdel===PROJ.id){ PROJ.id='p'+Date.now().toString(36); } openSongs(); }
  if(e.target.closest('#projNew2')){ $('#projModal').hidden=true; newSong(); }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && !$('#projModal').hidden) $('#projModal').hidden=true; });
$('#saveBtn').onclick=()=>saveNamed(false); $('#newBtn').onclick=()=>newSong(); $('#openBtn').onclick=openSongs; $('#copyBtn').onclick=saveCopy;
document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{ ensureAudio(); const k=b.dataset.add; if(k==='sing'){ TAKE.start(); return; } if(k==='empty'){ const t=addTrack({role:'melody',inst:zoneInst('keys').percussive?'piano':ZONES.keys,name:'New track',events:[]}); openEditor(t.id); return; } if(k==='beat'){ const t=addTrack({role:'drums',inst:ZONES.pads||'kit909',zone:'pads',name:'Beat',events:[]}); openEditor(t.id); return; } ASSIST.run(b.dataset.say); }));
