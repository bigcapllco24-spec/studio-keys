
/* ---------- controller replica: layout matched to the connected model, inside a studio scene ----------
   Layouts mirror each model's control counts (keys, pads, knobs, faders, wheels). They are drawn in a
   neutral style without maker logos, and the player can correct any count under "Adjust layout". */
const LAYOUTS=[
  [/keylab\s*mk\s*ii|keylab mkii/i,{model:'KeyLab mkII',pads:16,padCols:4,knobs:9,faders:9,wheels:'wheels'}],
  [/keylab essential.*(mk\s*3|3)/i,{model:'KeyLab Essential mk3',pads:8,padCols:4,knobs:9,faders:9,wheels:'wheels'}],
  [/keylab essential/i,{model:'KeyLab Essential',pads:8,padCols:4,knobs:9,faders:9,wheels:'wheels'}],
  [/keylab/i,{model:'KeyLab',pads:16,padCols:4,knobs:10,faders:9,wheels:'wheels'}],
  [/minilab\s*3/i,{model:'MiniLab 3',keys:25,pads:8,padCols:8,knobs:8,faders:4,wheels:'strips'}],
  [/minilab/i,{model:'MiniLab',keys:25,pads:16,padCols:8,knobs:16,faders:0,wheels:'strips'}],
  [/keystep\s*37/i,{model:'KeyStep 37',keys:37,pads:0,knobs:4,faders:0,wheels:'strips'}],
  [/keystep/i,{model:'KeyStep',keys:32,pads:0,knobs:0,faders:0,wheels:'strips'}],
  [/mpk\s*mini\s*plus/i,{model:'MPK mini plus',keys:37,pads:8,padCols:4,knobs:8,faders:0,wheels:'joystick'}],
  [/mpk\s*mini/i,{model:'MPK mini',keys:25,pads:8,padCols:4,knobs:8,faders:0,wheels:'joystick'}],
  [/mpk\s*2?49/i,{model:'MPK249',keys:49,pads:16,padCols:4,knobs:8,faders:8,wheels:'wheels'}],
  [/mpk\s*2?61/i,{model:'MPK261',keys:61,pads:16,padCols:4,knobs:8,faders:8,wheels:'wheels'}],
  [/mpk\s*2?25/i,{model:'MPK225',keys:25,pads:8,padCols:4,knobs:4,faders:0,wheels:'wheels'}],
  [/launchkey\s*mini/i,{model:'Launchkey Mini',keys:25,pads:16,padCols:8,knobs:8,faders:0,wheels:'strips'}],
  [/launchkey.*(49|61|88)/i,{model:'Launchkey',pads:16,padCols:8,knobs:8,faders:9,wheels:'wheels'}],
  [/launchkey/i,{model:'Launchkey',pads:16,padCols:8,knobs:8,faders:0,wheels:'wheels'}],
  [/komplete kontrol\s*m32|kontrol m32/i,{model:'Komplete Kontrol M32',keys:32,pads:0,knobs:8,faders:0,wheels:'strips'}],
  [/komplete kontrol|kontrol\s*a\d{2}/i,{model:'Komplete Kontrol',pads:0,knobs:8,faders:0,wheels:'wheels'}],
  [/oxygen pro/i,{model:'Oxygen Pro',pads:16,padCols:8,knobs:8,faders:9,wheels:'wheels'}],
  [/oxygen/i,{model:'Oxygen',pads:8,padCols:4,knobs:8,faders:9,wheels:'wheels'}],
  [/keystation/i,{model:'Keystation',pads:0,knobs:0,faders:1,wheels:'wheels'}],
  [/impact\s*lx/i,{model:'Impact LX',pads:8,padCols:4,knobs:8,faders:9,wheels:'wheels'}],
  [/impact\s*gx/i,{model:'Impact GX',pads:0,knobs:0,faders:0,wheels:'wheels'}],
  [/microkey|nanokey/i,{model:'microKEY',pads:0,knobs:0,faders:0,wheels:'joystick'}]
];
const BASE_LAYOUT={model:'Generic controller',keys:61,pads:8,padCols:4,knobs:8,faders:0,wheels:'wheels'};
let LAYOUT=Object.assign({},BASE_LAYOUT,{model:'On-screen keyboard'});
function layoutFor(inp){
  if(!inp) return Object.assign({},BASE_LAYOUT,{model:'On-screen keyboard'});
  const ds=settingsFor(inp), name=inp.name+' '+(inp.manufacturer||'');
  let L=Object.assign({},BASE_LAYOUT,{matched:false});
  for(const [re,o] of LAYOUTS) if(re.test(name)){ L=Object.assign({},BASE_LAYOUT,o,{matched:true}); break; }
  const k=keysFromName(inp.name); if(k) L.keys=k;
  if(ds.layout) Object.assign(L,ds.layout,{edited:true});
  return L;
}
function applyLayout(){
  LAYOUT=layoutFor(primaryInput());
  setKeybed(LAYOUT.keys);
  if(!CV.padsLive) CV.padNotes=Array.from({length:LAYOUT.pads||8},(_,i)=>36+i);
  renderWheels(); renderKnobs(); renderFaders(); renderPads(); renderLayoutInfo();
  $('#padsDrop').hidden=!LAYOUT.pads;
}
function renderLayoutInfo(){
  const el=$('#layoutInfo'); if(!el) return;
  el.innerHTML=`<div class="row" style="justify-content:space-between"><span><b>${esc(LAYOUT.model)}</b> <span class="muted">· ${LAYOUT.keys} keys · ${LAYOUT.pads} pads · ${LAYOUT.knobs} knobs · ${LAYOUT.faders} faders${LAYOUT.matched?'':' (estimated)'}</span></span><button class="btn small ghost" type="button" id="layoutEdit">Adjust layout</button></div>
    <div class="row" id="layoutForm" hidden>
      ${[['keys',[25,32,37,49,61,73,76,88]],['pads',[0,8,16]],['knobs',[0,4,8,9,16]],['faders',[0,1,4,8,9]]].map(([k,opts])=>`<label class="hint">${k[0].toUpperCase()+k.slice(1)} <select class="select inline" data-lay="${k}">${opts.map(o=>`<option${o===LAYOUT[k]?' selected':''}>${o}</option>`).join('')}</select></label>`).join('')}
      <label class="hint">Wheels <select class="select inline" data-lay="wheels">${['wheels','strips','joystick'].map(o=>`<option${o===LAYOUT.wheels?' selected':''}>${o}</option>`).join('')}</select></label>
    </div>`;
  $('#layoutEdit').onclick=()=>{ $('#layoutForm').hidden=!$('#layoutForm').hidden; };
  el.querySelectorAll('[data-lay]').forEach(s=>s.onchange=()=>{ const ds=primarySettings(); const k=s.dataset.lay, v=k==='wheels'?s.value:+s.value; if(ds){ ds.layout=Object.assign(ds.layout||{},{[k]:v}); saveDevices(); } else LAYOUT[k]=v; if(k==='pads') CV.padsLive=false; applyLayout(); $('#layoutForm').hidden=false; });
}
/* wheels, touch strips or joystick */
const CVW={bend:0.5,mod:0,bendOn:false,modOn:false};
function renderWheels(){
  const box=$('#wheelsBox'); const w=LAYOUT.wheels;
  if(w==='joystick') box.innerHTML=`<div class="joy" id="joy"><i></i></div><span class="wl">Pitch / mod</span>`;
  else box.innerHTML=`<div class="wheel bend${w==='strips'?' strip':''}" id="wBend"><div class="trk"><b></b><i></i></div>Pitch</div><div class="wheel${w==='strips'?' strip':''}" id="wMod"><div class="trk"><b></b><i></i></div>Mod</div>`;
  setWheel('wBend',CVW.bend,CVW.bendOn); setWheel('wMod',CVW.mod,CVW.modOn);
}
function setWheel(id,p,on){
  p=clamp(p,0,1); if(id==='wBend'){ CVW.bend=p; CVW.bendOn=on; } else { CVW.mod=p; CVW.modOn=on; }
  const w=$('#'+id); if(w){ w.style.setProperty('--p',p.toFixed(3)); w.classList.toggle('on',!!on); }
  const j=$('#joy'); if(j){ j.style.setProperty('--x',CVW.bend.toFixed(3)); j.style.setProperty('--y',CVW.mod.toFixed(3)); j.classList.toggle('on',CVW.bendOn||CVW.modOn); }
}
function renderKnobs(){
  const n=LAYOUT.knobs||0, box=$('#knobs'); box.hidden=!n; box.style.setProperty('--kc',Math.min(n>9?8:n,9)||1);
  let h=''; for(let i=0;i<n;i++){ const s=FX.slots[i];
    h+=s?`<div class="knob" data-k="${i}" title="${esc(FX_LIB[s.type].desc)}"><span class="kn">K${i+1}</span><div class="dial" data-fx="${i}" style="--v:${s.amount.toFixed(3)}"><div class="cap"></div></div><span class="lbl">${esc(FX_LIB[s.type].name)}</span><span data-fxval="${i}">${Math.round(s.amount*100)}%</span></div>`
      :`<div class="knob idle"><span class="kn">K${i+1}</span><div class="dial"><div class="cap"></div></div><span class="lbl">Free</span><span>—</span></div>`; }
  box.innerHTML=h;
}
function faderChannels(n){ const list=['keys','pads',...PROJ.tracks.map(t=>t.id)]; const out=[]; for(let i=0;i<n;i++){ if(n>=3 && i===n-1) out.push('master'); else out.push(list[i]||null); } return out; }
function chName(id){ return id==='keys'?'Keys':id==='pads'?'Pads':id==='master'?'Master':((PROJ.tracks.find(t=>t.id===id)||{}).name||''); }
function renderFaders(){
  const n=LAYOUT.faders||0, box=$('#faders'); if(!box) return; box.hidden=!n;
  box.innerHTML=faderChannels(n).map((id,i)=>{ const cfg=id&&chCfg(id); return `<div class="fader${id?'':' idle'}" ${id?`data-ch="${id}"`:''} style="--p:${cfg?cfg.vol.toFixed(3):0}" title="${id?esc(chName(id))+' volume. Drag, or double-click to learn a hardware fader.':'Free fader'}"><div class="ftrk"><i></i></div><span>${id?esc(chName(id).slice(0,7)):'F'+(i+1)}</span></div>`; }).join('');
}
(function(){
  let drag=null;
  document.addEventListener('pointerdown',e=>{ const f=e.target.closest('.fader[data-ch]'); if(!f) return; e.preventDefault(); ensureAudio(); const tr=f.querySelector('.ftrk').getBoundingClientRect(); drag={id:f.dataset.ch,tr}; try{ f.setPointerCapture(e.pointerId); }catch(_){} move(e); });
  const move=e=>{ if(!drag) return; chSet(drag.id,'vol',clamp(1-(e.clientY-drag.tr.top)/drag.tr.height,0,1)); };
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',()=>{ drag=null; });
  document.addEventListener('dblclick',e=>{ const f=e.target.closest('.fader[data-ch]'); if(f){ startLearn('vol:'+f.dataset.ch); toast(`Move a hardware fader to control ${chName(f.dataset.ch)}`); } });
})();
const PAD_SHORT={kick:'Kick',rim:'Rim',snare:'Snare',clap:'Clap',hatC:'Hat',hatP:'P.Hat',hatO:'O.Hat',tomF:'Tom',tomF2:'Tom',tomL:'Tom',tomM:'Tom',tomH:'Tom',tomH2:'Tom',crash:'Crash',ride:'Ride',cow:'Bell'};
function renderPads(){
  const n=LAYOUT.pads||0, box=$('#pads'), drums=zoneInst('pads').percussive; if(!n){ box.innerHTML=''; return; }
  while(CV.padNotes.length<n) CV.padNotes.push(CV.padNotes.length?CV.padNotes[CV.padNotes.length-1]+1:36);
  box.style.setProperty('--pc',LAYOUT.padCols||4);
  let h=''; for(let i=0;i<n;i++){ const note=CV.padNotes[i]; const lab=note==null?'':drums?PAD_SHORT[drumPiece(note)]:noteName(padPitch(note)); h+=`<div class="pad" data-pad="${i}" data-note="${note!=null?note:''}" title="${note!=null?'Note '+noteName(note):''}">${esc(lab)}</div>`; }
  box.innerHTML=h; box.classList.toggle('small',n>8);
}
$('#hwTransport').addEventListener('click',e=>{ const b=e.target.closest('[data-tp]'); if(!b) return; ensureAudio(); ({loop:loopPress,rec:recordPress,play:()=>{ if(LOOP.state==='stopped') loopPlay(); },stop:loopStop})[b.dataset.tp](); });

/* ---------- studio scene: wall panels, monitors, screen and desk, reacting to the music ---------- */
(function(){
  const cv=$('#scene'), stage=$('#stage'); if(!cv) return;
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fdata=null, last=0, lowE=0, lvl=0;
  function draw(ts){
    requestAnimationFrame(draw); if(!reduce && ts-last<33) return; if(reduce && last) return; last=ts;
    const dpr=devicePixelRatio||1, w=stage.clientWidth, h=stage.clientHeight; if(!w) return;
    if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
    const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
    let bands=null; if(A.analyser){ if(!fdata) fdata=new Uint8Array(A.analyser.frequencyBinCount); A.analyser.getByteFrequencyData(fdata); bands=fdata; }
    const low=bands?(bands[2]+bands[3]+bands[4]+bands[5])/1020:0, all=bands?bands.slice(0,200).reduce((a,b)=>a+b,0)/(200*255):0;
    lowE=lowE*0.6+low*0.4; lvl=lvl*0.8+all*0.2;
    const deskY=h-$('#ctrlBody').offsetHeight-34;
    // wall
    const wall=g.createLinearGradient(0,0,0,deskY); wall.addColorStop(0,'#120f2e'); wall.addColorStop(0.6,'#1a1840'); wall.addColorStop(1,'#231c4a'); g.fillStyle=wall; g.fillRect(0,0,w,deskY);
    // acoustic panels
    const pw=56, ph=56, gap=6; for(let y=10;y<deskY-30;y+=ph+gap) for(let x=10+((y/(ph+gap))%2?28:0);x<w;x+=pw+gap){ const gr=g.createLinearGradient(x,y,x+pw,y+ph); gr.addColorStop(0,'#272456'); gr.addColorStop(1,'#1a1838'); g.fillStyle=gr; g.fillRect(x,y,pw,ph); g.fillStyle='rgba(0,0,0,.18)'; for(let k=8;k<pw;k+=12) g.fillRect(x+k,y+4,3,ph-8); }
    // light strip
    const glow=0.25+lvl*1.6; const strip=g.createLinearGradient(0,0,w,0); strip.addColorStop(0,`rgba(143,107,255,${Math.min(0.95,glow)})`); strip.addColorStop(0.5,`rgba(255,111,181,${Math.min(0.95,glow)})`); strip.addColorStop(1,`rgba(69,227,211,${Math.min(0.95,glow)})`); g.fillStyle=strip; g.fillRect(0,0,w,3); const halo=g.createLinearGradient(0,0,0,70); halo.addColorStop(0,`rgba(194,107,255,${Math.min(0.3,glow*0.3)})`); halo.addColorStop(1,'rgba(194,107,255,0)'); g.fillStyle=halo; g.fillRect(0,0,w,70);
    // desk
    const desk=g.createLinearGradient(0,deskY,0,h); desk.addColorStop(0,'#5a4030'); desk.addColorStop(0.04,'#3b2a20'); desk.addColorStop(1,'#20170f'); g.fillStyle=desk; g.fillRect(0,deskY,w,h-deskY);
    g.fillStyle='rgba(255,220,180,.08)'; g.fillRect(0,deskY,w,2);
    // screen in the middle
    const sw=Math.min(520,w*0.42), sh=Math.min(110,deskY-40), sx=(w-sw)/2, sy=deskY-sh-18;
    if(sh>50){ g.fillStyle='#070914'; g.fillRect(sx-6,sy-6,sw+12,sh+12); g.fillStyle='#0b1028'; g.fillRect(sx,sy,sw,sh); g.fillStyle='#14173a'; g.fillRect(w/2-30,deskY-18,60,18);
      g.font='600 11px '+cssVar('--mono'); g.fillStyle='#a6fff4'; g.fillText(`${PROJ.name.toUpperCase().slice(0,28)} · ${CTRL.bpm} BPM · ${PROJ.tracks.length} TRACKS`,sx+10,sy+16);
      if(bands){ const n=48; for(let i=0;i<n;i++){ const idx=Math.floor(Math.pow(i/n,1.7)*300)+1, v=bands[idx]/255, bh=v*(sh-30); g.fillStyle=i%6===0?'#ff6fb5':(i%3===0?'#9b7bff':'#45e3d3'); g.fillRect(sx+10+i*(sw-20)/n,sy+sh-6-bh,(sw-20)/n-2,bh); } }
      if(TR.running && LOOP.L){ const pos=mod(LOOP.rawBeat(),LOOP.L)/LOOP.L; g.fillStyle='#ff6fb5'; g.fillRect(sx+10+pos*(sw-20),sy+22,2,sh-28); } }
    // monitors
    if(w>760){ const mw=Math.min(110,w*0.09), mh=mw*1.45, my=deskY-mh-6;
      [[w*0.06,1],[w*0.94-mw,-1]].forEach(([mx])=>{ g.fillStyle='#0e0f1f'; g.fillRect(mx,my,mw,mh); g.strokeStyle='#2b2f55'; g.strokeRect(mx+0.5,my+0.5,mw-1,mh-1);
        const cx=mx+mw/2, wy=my+mh*0.66, r=mw*0.33*(1+lowE*0.12);
        g.beginPath(); g.arc(cx,wy,mw*0.38,0,Math.PI*2); g.fillStyle='#181a33'; g.fill();
        const cone=g.createRadialGradient(cx,wy,2,cx,wy,r); cone.addColorStop(0,'#4a4d55'); cone.addColorStop(0.5,'#202226'); cone.addColorStop(1,'#34373e'); g.beginPath(); g.arc(cx,wy,r,0,Math.PI*2); g.fillStyle=cone; g.fill();
        g.beginPath(); g.arc(cx,my+mh*0.22,mw*0.12,0,Math.PI*2); g.fillStyle='#2a2c31'; g.fill(); g.beginPath(); g.arc(cx,my+mh*0.22,mw*0.05,0,Math.PI*2); g.fillStyle='#55585f'; g.fill();
        g.fillStyle=lvl>0.02?'#7bd88f':'#3a3d43'; g.fillRect(mx+mw-12,my+mh-10,5,3); }); }
  }
  requestAnimationFrame(draw);
})();
