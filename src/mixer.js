
/* ---------- mixer: channel strips with volume, mute/solo and low/mid/high EQ ---------- */
const EQ_DB=15;
/* track effects: saved on the track as t.fx; every key is optional and 0/absent means off */
const TFX_DEF={
  hp:{name:'Low cut',hint:'Removes rumble below this frequency',min:20,max:1200,unit:'Hz',log:true,def:120},
  lp:{name:'High cut',hint:'Softens the top end above this frequency',min:800,max:20000,unit:'Hz',log:true,def:9000,off:20000},
  drive:{name:'Drive',hint:'Warm saturation',min:0,max:1,def:0.3},
  comp:{name:'Compressor',hint:'Evens out and glues the part',min:0,max:1,def:0.4},
  duck:{name:'Sidechain',hint:'Ducks under the kick for the pumping house feel',min:0,max:1,def:0.5},
  rev:{name:'Reverb',hint:'Sends to the shared hall reverb',min:0,max:1,def:0.25},
  dly:{name:'Delay',hint:'Dotted 1/8 echo in time with the song',min:0,max:1,def:0.2},
  width:{name:'Stereo width',hint:'Spreads the part wider',min:0,max:1,def:0.5},
  pan:{name:'Pan',hint:'Left to right',min:-1,max:1,def:0,bip:true}
};
const TFX_ORDER=['hp','lp','drive','comp','duck','rev','dly','width','pan'];
function makeStrip(c,dest,sends){
  const inp=c.createGain(), hp=filt(c,'highpass',10,0.7), lp=filt(c,'lowpass',20000,0.7),
    lo=filt(c,'lowshelf',120,0.7), mid=filt(c,'peaking',1000,0.8), hi=filt(c,'highshelf',6000,0.7),
    drvIn=c.createGain(), drv=c.createWaveShaper(), drvOut=c.createGain(), dry=c.createGain(),
    comp=c.createDynamicsCompressor(), compWet=c.createGain(), compDry=c.createGain(), duck=c.createGain(),
    pan=c.createStereoPanner?c.createStereoPanner():c.createGain(), split=c.createChannelSplitter(2), merge=c.createChannelMerger(2), wd=c.createDelay(0.05), wdG=c.createGain(), direct=c.createGain(),
    out=c.createGain(), rev=c.createGain(), dly=c.createGain();
  lo.gain.value=0; mid.gain.value=0; hi.gain.value=0; drv.curve=curveTanh(2.5); drv.oversample='2x';
  drvOut.gain.value=0; dry.gain.value=1; compWet.gain.value=0; compDry.gain.value=1;
  comp.threshold.value=-24; comp.ratio.value=3; comp.attack.value=0.01; comp.release.value=0.15; comp.knee.value=6;
  inp.connect(hp).connect(lp).connect(lo).connect(mid).connect(hi);
  hi.connect(dry); hi.connect(drvIn).connect(drv).connect(drvOut);
  const pre=c.createGain(); dry.connect(pre); drvOut.connect(pre);
  pre.connect(compDry); pre.connect(comp).connect(compWet);
  compDry.connect(duck); compWet.connect(duck);
  duck.connect(pan);
  /* width: a short delay on the right channel (Haas), blended in */
  pan.connect(direct); pan.connect(split); split.connect(wd,1); wd.delayTime.value=0.012; wd.connect(wdG); wdG.gain.value=0;
  direct.connect(out); wdG.connect(merge,0,1); merge.connect(out);
  out.connect(dest); rev.gain.value=0; dly.gain.value=0;
  if(sends){ out.connect(rev).connect(sends.rev); out.connect(dly).connect(sends.dly); }
  return {inp,hp,lp,lo,mid,hi,drvIn,drvOut,dry,comp,compWet,compDry,duck,pan,wdG,out,rev,dly};
}
function applyStrip(st,cfg,c,instant,audible){
  if(!st) return; const g=audible===false?0:Math.pow(cfg.vol,2)*1.2, fx=cfg.fx||{};
  sp(st.lo.gain,cfg.lo||0,c,instant); sp(st.mid.gain,cfg.mid||0,c,instant); sp(st.hi.gain,cfg.hi||0,c,instant); sp(st.out.gain,g,c,instant);
  if(!st.hp) return;
  sp(st.hp.frequency,fx.hp||10,c,instant); sp(st.lp.frequency,fx.lp||20000,c,instant);
  const d=fx.drive||0; sp(st.drvIn.gain,1+d*3,c,instant); sp(st.drvOut.gain,d*0.6/(1+d),c,instant); sp(st.dry.gain,1-d*0.5,c,instant);
  const k=fx.comp||0; st.comp.threshold.value=-12-k*22; st.comp.ratio.value=2+k*4; sp(st.compWet.gain,k?1+k*0.6:0,c,instant); sp(st.compDry.gain,k?0:1,c,instant);
  if(st.pan.pan) sp(st.pan.pan,fx.pan||0,c,instant);
  sp(st.wdG.gain,(fx.width||0)*0.7,c,instant);
  sp(st.rev.gain,(fx.rev||0)*1.1,c,instant); sp(st.dly.gain,(fx.dly||0)*0.9,c,instant);
}
/* shared send effects: a hall reverb and a tempo-synced dotted-eighth delay, both after the track faders */
function makeSends(c,dest,bpm){
  const rv=c.createConvolver(), rvIn=c.createGain(), rvHp=filt(c,'highpass',220,0.7), rvOut=c.createGain();
  try{ rv.buffer=FX.irFor(c); }catch(e){} rvIn.connect(rvHp).connect(rv).connect(rvOut).connect(dest); rvOut.gain.value=0.9;
  const dIn=c.createGain(), dl=c.createDelay(2), fb=c.createGain(), dHp=filt(c,'highpass',300,0.7), dLp=filt(c,'lowpass',5200,0.7), dOut=c.createGain();
  dl.delayTime.value=0.75*60/(bpm||CTRL.bpm); fb.gain.value=0.38; dIn.connect(dHp).connect(dl).connect(dLp).connect(dOut).connect(dest); dLp.connect(fb).connect(dl); dOut.gain.value=0.8;
  dOut.connect(rvIn); rvIn.gain.value=1;
  return {rev:rvIn,dly:dIn,setTempo(b,cc){ dl.delayTime.setTargetAtTime(0.75*60/b,(cc||c).currentTime,0.05); },rv};
}
/* sidechain: when a kick plays, tracks with fx.duck dip and recover over about a 1/8 note */
function duckAt(c,strips,t,bpm){ const rel=0.16*60/(bpm||CTRL.bpm);
  strips.forEach(([st,amt])=>{ const g=st.duck.gain, low=Math.max(0.08,1-amt*0.85); g.setValueAtTime(low,t); g.setTargetAtTime(1,t+0.012,rel); }); }
const isKick=(tr,n)=>(n===35||n===36)&&(tr.role==='drums'||(INST.get(tr.inst)||{}).drums);
const MIX=Object.assign({keys:{vol:0.85,lo:0,mid:0,hi:0,mute:false},pads:{vol:0.85,lo:0,mid:0,hi:0,mute:false},master:{vol:1,lo:0,mid:0,hi:0,mute:false}},store.get('mix',{}));
let mixSaveT=0; const saveMix=()=>{ clearTimeout(mixSaveT); mixSaveT=setTimeout(()=>store.set('mix',MIX),300); };
function buildStrips(){
  const c=A.ctx;
  A.mstrip=makeStrip(c,A.master);
  A.sends=makeSends(c,A.mstrip.inp);
  A.zs={keys:makeStrip(c,A.bus),pads:makeStrip(c,A.bus)};
  A.ts=new Map();
  ['keys','pads','master'].forEach(k=>applyStrip(k==='master'?A.mstrip:A.zs[k],MIX[k],c,true,!MIX[k].mute));
}
const zoneDest=z=>(A.zs&&A.zs[z]||A.zs.keys).inp;
function trackStrip(tr){
  let st=A.ts.get(tr.id);
  if(!st){ st=makeStrip(A.ctx,A.bus,A.sends); A.ts.set(tr.id,st); applyStrip(st,tr,A.ctx,true,trackAudible(tr)); }
  return st;
}
let PREVIEW=null; /* a Set of track ids auditioned alone from the ▶ buttons (Ctrl/Cmd adds more) */
let TAKE_GUIDE=false; /* while singing a part, only the drums play so the microphone isn't confused */
const anySolo=()=>PROJ.tracks.some(t=>t.solo);
const trackAudible=t=>{ if(TAKE_GUIDE && !(t.role==='drums'||(INST.get(t.inst)||{}).drums)) return false; return PREVIEW?PREVIEW.has(t.id):(!t.mute && (!anySolo()||t.solo)); };
function refreshTrackGains(){ if(!A.ctx) return; PROJ.tracks.forEach(t=>{ const st=A.ts.get(t.id); if(st) applyStrip(st,t,A.ctx,false,trackAudible(t)); }); }
/* channel lookup for dials, faders and learn targets: 'keys' | 'pads' | 'master' | track id */
function chCfg(id){ return MIX[id]||PROJ.tracks.find(t=>t.id===id); }
function chApply(id){
  if(!A.ctx) return; const cfg=chCfg(id); if(!cfg) return;
  if(id==='master'){ applyStrip(A.mstrip,cfg,A.ctx,false,!cfg.mute); return; }
  if(MIX[id]){ applyStrip(A.zs[id],cfg,A.ctx,false,!cfg.mute); return; }
  refreshTrackGains();
}
function chSet(id,field,v){
  const cfg=chCfg(id); if(!cfg) return;
  cfg[field]=field==='vol'?clamp(v,0,1):clamp(v,-EQ_DB,EQ_DB);
  chApply(id); if(MIX[id]) saveMix(); else saveProject();
  updateDialUI('eq:'+id+':'+field); updateFaderUI(id);
}
/* generic dials: data-d="eq:<channel>:<lo|mid|hi>" (bipolar) */
function dialGet(key){ const [kind,id,f]=key.split(':'); const cfg=chCfg(id); if(!cfg) return 0.5; return (cfg[f]||0)/(2*EQ_DB)+0.5; }
function dialSet(key,v){ const [kind,id,f]=key.split(':'); let db=(clamp(v,0,1)-0.5)*2*EQ_DB; if(Math.abs(db)<0.6) db=0; chSet(id,f,Math.round(db*2)/2); }
function dialHTML(key,label){ const v=dialGet(key), db=Math.round(((v-0.5)*2*EQ_DB)*2)/2;
  return `<span class="eqd"><span class="dial sm" data-d="${key}" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="-${EQ_DB}" aria-valuemax="${EQ_DB}" aria-valuenow="${db}" style="--v:${v.toFixed(3)}"><span class="cap"></span></span><span class="eql">${label}<b data-dv="${key}">${db>0?'+':''}${db}</b></span></span>`; }
function updateDialUI(key){ const v=dialGet(key), db=Math.round(((v-0.5)*2*EQ_DB)*2)/2;
  document.querySelectorAll(`.dial[data-d="${key}"]`).forEach(d=>{ d.style.setProperty('--v',v.toFixed(3)); d.setAttribute('aria-valuenow',db); });
  document.querySelectorAll(`[data-dv="${key}"]`).forEach(e=>e.textContent=(db>0?'+':'')+db); }
function stripControls(id,cfg,opts={}){
  return `<div class="strip-ctl">
    <label class="vol"><span class="sr">Volume</span><input type="range" min="0" max="100" value="${Math.round(cfg.vol*100)}" data-vol="${id}" aria-label="${esc(opts.name||id)} volume"><span class="mono" data-volv="${id}">${Math.round(cfg.vol*100)}</span></label>
    ${dialHTML('eq:'+id+':lo','Low')}${dialHTML('eq:'+id+':mid','Mid')}${dialHTML('eq:'+id+':hi','High')}
    <button class="btn small ghost ms${cfg.mute?' on':''}" type="button" data-mute="${id}" aria-pressed="${!!cfg.mute}" title="Mute">M</button>
    ${opts.solo?`<button class="btn small ghost ms${cfg.solo?' on':''}" type="button" data-solo="${id}" aria-pressed="${!!cfg.solo}" title="Solo">S</button>`:''}
    ${opts.learn!==false?`<button class="btn small ghost" type="button" data-learn="vol:${id}" id="learn-vol:${id}" title="Learn a fader for this volume">Fader</button>`:''}
  </div>`;
}
function updateFaderUI(id){ const cfg=chCfg(id); if(!cfg) return; document.querySelectorAll(`[data-vol="${CSS.escape(id)}"]`).forEach(r=>r.value=Math.round(cfg.vol*100));
  document.querySelectorAll(`[data-volv="${CSS.escape(id)}"]`).forEach(r=>r.textContent=Math.round(cfg.vol*100));
  document.querySelectorAll(`.fader[data-ch="${CSS.escape(id)}"]`).forEach(f=>f.style.setProperty('--p',cfg.vol.toFixed(3))); }
document.addEventListener('input',e=>{ const r=e.target.closest&&e.target.closest('[data-vol]'); if(r){ ensureAudio(); chSet(r.dataset.vol,'vol',+r.value/100); } });
document.addEventListener('click',e=>{
  const m=e.target.closest('[data-mute]'); if(m){ const cfg=chCfg(m.dataset.mute); cfg.mute=!cfg.mute; chApply(m.dataset.mute); MIX[m.dataset.mute]?saveMix():saveProject(); m.classList.toggle('on',cfg.mute); m.setAttribute('aria-pressed',cfg.mute); renderTracks(); return; }
  const s=e.target.closest('[data-solo]'); if(s){ const cfg=chCfg(s.dataset.solo); cfg.solo=!cfg.solo; refreshTrackGains(); saveProject(); renderTracks(); }
  if(m||s) refreshTrackGains();
});
function renderMixer(){
  const ch=[['keys','Keys',zoneInst('keys').name],['pads','Pads',zoneInst('pads').name],['master','Master','After effects']];
  $('#mixer').innerHTML=ch.map(([id,nm,sub])=>`<div class="mstrip"><div class="mname"><b>${nm}</b><span>${esc(sub)}</span></div>${stripControls(id,MIX[id],{name:nm})}</div>`).join('');
}
