
/* ---------- effects: 8 knob slots, swappable, tempo-aware ---------- */
function sp(p,v,c,instant){ if(instant){ p.value=v; } else p.setTargetAtTime(v,c.currentTime,0.015); }
function ioPair(c){ const inp=c.createGain(), out=c.createGain(), dry=c.createGain(), wet=c.createGain(); inp.connect(dry); dry.connect(out); wet.connect(out); return {inp,out,dry,wet}; }
function curveTanh(k){ const n=2048, cv=new Float32Array(n), m=Math.tanh(k); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; cv[i]=Math.tanh(k*x)/m; } return cv; }
function curveCrush(bits){ const n=8192, cv=new Float32Array(n), lv=Math.pow(2,bits-1); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; cv[i]=Math.round(x*lv)/lv; } return cv; }
function lfo(c,type,f){ const o=c.createOscillator(); o.type=type; o.frequency.value=f; o.start(); return o; }

const FX_LIB={
  reverb:{name:'Reverb',desc:'Hall space. Turn up for a bigger room.',neutral:0,make(c){ const p=ioPair(c), cv=c.createConvolver(); cv.buffer=FX.irFor(c); p.inp.connect(cv).connect(p.wet);
    return {inp:p.inp,out:p.out,ir:cv,set(a,i){ sp(p.wet.gain,a*1.2,c,i); sp(p.dry.gain,1-a*0.35,c,i); }}; }},
  echo:{name:'Echo',desc:'Dotted-eighth delay synced to the tempo.',neutral:0,make(c){ const p=ioPair(c), d=c.createDelay(4), fb=gainN(c,0.3), lp=filt(c,'lowpass',4500,0.5);
    p.inp.connect(d); d.connect(lp).connect(fb).connect(d); d.connect(p.wet);
    return {inp:p.inp,out:p.out,set(a,i){ sp(p.wet.gain,a*0.8,c,i); sp(fb.gain,0.2+a*0.55,c,i); },tempo(bpm,i){ sp(d.delayTime,0.75*60/bpm,c,i); }}; }},
  dj:{name:'DJ Filter',desc:'Left of center cuts highs, right cuts lows.',neutral:0.5,make(c){ const inp=c.createGain(), lp=filt(c,'lowpass',20000,0.7), hp=filt(c,'highpass',10,0.7); inp.connect(lp).connect(hp);
    return {inp,out:hp,set(a,i){ const x=a-0.5; let lf=20000, hf=10, q=0.7; if(x<-0.02){ lf=20000*Math.pow(2,(x/0.5)*7.5); q=1.4; } else if(x>0.02){ hf=20*Math.pow(2,(x/0.5)*9); q=1.4; } sp(lp.frequency,lf,c,i); sp(hp.frequency,hf,c,i); sp(lp.Q,q,c,i); sp(hp.Q,q,c,i); }}; }},
  lowpass:{name:'Cutoff',desc:'Resonant low-pass. Turn down to close the filter.',neutral:1,make(c){ const f=filt(c,'lowpass',20000,4);
    return {inp:f,out:f,set(a,i){ sp(f.frequency,60*Math.pow(2,a*8.4),c,i); }}; }},
  gate:{name:'Gate',desc:'Chops the sound into sixteenth notes.',neutral:0,make(c){ const g=gainN(c,1), o=lfo(c,'square',8), sh=c.createWaveShaper(); sh.curve=new Float32Array([0,1]); const sm=filt(c,'lowpass',180,0.5), depth=gainN(c,0);
    o.connect(sh).connect(sm).connect(depth).connect(g.gain);
    return {inp:g,out:g,osc:[o],set(a,i){ sp(g.gain,1-a,c,i); sp(depth.gain,a,c,i); },tempo(bpm,i){ sp(o.frequency,bpm/60*4,c,i); }}; }},
  repeat:{name:'Beat Repeat',desc:'Captures a slice and repeats it. Turn further for a finer grid: 1/2 to 1/32 beat.',neutral:0,make(c){
    const inp=c.createGain(), out=c.createGain(), dry=gainN(c,1), cap=gainN(c,0), d=c.createDelay(4), fb=gainN(c,0), wet=gainN(c,0);
    inp.connect(dry).connect(out); inp.connect(cap).connect(d); d.connect(fb).connect(d); d.connect(wet).connect(out);
    let idx=-1, bpm=120; const grids=[2,1,0.5,0.25,0.125];
    const engage=len=>{ const t=c.currentTime+0.005, r=0.004;
      [cap.gain,fb.gain,wet.gain,dry.gain].forEach(p=>p.cancelScheduledValues(t));
      d.delayTime.setValueAtTime(len,t);
      cap.gain.setTargetAtTime(1,t,r); fb.gain.setTargetAtTime(0,t,r); wet.gain.setTargetAtTime(0,t,r); dry.gain.setTargetAtTime(1,t,r);
      cap.gain.setTargetAtTime(0,t+len,r); fb.gain.setValueAtTime(1,t+len); wet.gain.setTargetAtTime(1,t+len,r); dry.gain.setTargetAtTime(0,t+len,r); };
    const off=()=>{ const t=c.currentTime; [cap.gain,fb.gain,wet.gain,dry.gain].forEach(p=>p.cancelScheduledValues(t)); cap.gain.setTargetAtTime(0,t,0.005); fb.gain.setTargetAtTime(0,t,0.01); wet.gain.setTargetAtTime(0,t,0.008); dry.gain.setTargetAtTime(1,t,0.005); };
    return {inp,out,set(a,i){ const n=a<0.06?-1:Math.min(4,Math.floor((a-0.06)/0.94*5)); if(n===idx) return; idx=n; if(i) return; n<0?off():engage(grids[n]*60/bpm); },tempo(b){ bpm=b; }}; }},
  drive:{name:'Drive',desc:'Warm saturation up to crunchy distortion.',neutral:0,make(c){ const sh=c.createWaveShaper(), g=gainN(c,1); sh.oversample='2x'; sh.connect(g); let last=-1;
    return {inp:sh,out:g,set(a,i){ const q=Math.round(a*40)/40; if(q!==last){ last=q; sh.curve=q<0.02?null:curveTanh(1+q*25); } sp(g.gain,1/(1+a*1.6),c,i); }}; }},
  chorus:{name:'Chorus',desc:'Two slow-moving delays widen the sound.',neutral:0,make(c){ const p=ioPair(c), dl=c.createDelay(0.1), dr=c.createDelay(0.1), m=c.createChannelMerger(2);
    dl.delayTime.value=0.018; dr.delayTime.value=0.026; const o1=lfo(c,'sine',0.7), o2=lfo(c,'sine',0.93), g1=gainN(c,0.004), g2=gainN(c,0.005);
    o1.connect(g1).connect(dl.delayTime); o2.connect(g2).connect(dr.delayTime); p.inp.connect(dl); p.inp.connect(dr); dl.connect(m,0,0); dr.connect(m,0,1); m.connect(p.wet);
    return {inp:p.inp,out:p.out,osc:[o1,o2],set(a,i){ sp(p.wet.gain,a*0.75,c,i); sp(p.dry.gain,1-a*0.2,c,i); }}; }},
  phaser:{name:'Phaser',desc:'Sweeping notches for a swirling tone.',neutral:0,make(c){ const p=ioPair(c), o=lfo(c,'sine',0.35), dg=gainN(c,600); let last=p.inp;
    for(let k=0;k<4;k++){ const ap=filt(c,'allpass',800+k*250,0.6); o.connect(dg); dg.connect(ap.frequency); last.connect(ap); last=ap; } last.connect(p.wet);
    return {inp:p.inp,out:p.out,osc:[o],set(a,i){ sp(p.wet.gain,a*0.9,c,i); sp(p.dry.gain,1-a*0.4,c,i); }}; }},
  crush:{name:'Bitcrush',desc:'Lo-fi bit reduction, from 16 down to 3 bits.',neutral:0,make(c){ const sh=c.createWaveShaper(); let last=-1;
    return {inp:sh,out:sh,set(a){ const bits=Math.round(16-a*13); if(bits!==last){ last=bits; sh.curve=a<0.03?null:curveCrush(bits); } }}; }},
  highpass:{name:'High-pass',desc:'Thins out the low end.',neutral:0,make(c){ const f=filt(c,'highpass',20,0.9);
    return {inp:f,out:f,set(a,i){ sp(f.frequency,20*Math.pow(2,a*9),c,i); }}; }},
  autopan:{name:'Auto-pan',desc:'Moves the sound left and right on the beat.',neutral:0,make(c){ const pn=c.createStereoPanner(), o=lfo(c,'sine',2), dg=gainN(c,0); o.connect(dg).connect(pn.pan);
    return {inp:pn,out:pn,osc:[o],set(a,i){ sp(dg.gain,a,c,i); },tempo(bpm,i){ sp(o.frequency,bpm/60/2,c,i); }}; }},
  pump:{name:'Sidechain Pump',desc:'Ducks on every beat like a kick sidechain.',neutral:0,make(c){ const g=gainN(c,1), o=lfo(c,'sawtooth',2), sh=c.createWaveShaper(), n=256, cv=new Float32Array(n);
    for(let k=0;k<n;k++){ const x=k/(n-1); cv[k]=Math.sqrt(x); } sh.curve=cv; const depth=gainN(c,0); o.connect(sh).connect(depth).connect(g.gain);
    return {inp:g,out:g,osc:[o],set(a,i){ sp(g.gain,1-a,c,i); sp(depth.gain,a,c,i); },tempo(bpm,i){ sp(o.frequency,bpm/60,c,i); }}; }}
};
const FX_PRIORITY=['drive','crush','lowpass','highpass','dj','phaser','chorus','gate','pump','autopan','repeat','echo','reverb'];
const FX_DEFAULT=['reverb','echo','dj','lowpass','gate','repeat','drive','chorus'];

const FX={
  slots:(store.get('fx',null)||FX_DEFAULT.map(t=>({type:t,amount:FX_LIB[t].neutral}))).map(s=>FX_LIB[s.type]?s:{type:'reverb',amount:0}),
  live:null, saveT:0,
  irCache:{},
  irFor(c){ return this.irCache[c.sampleRate]||makeImpulse(c,2.6,3.2); },
  loadIR(c){ /* convolver buffers must match the context's sample rate, so decode once per rate */
    const sr=c.sampleRate; if(this.irCache[sr]) return Promise.resolve(this.irCache[sr]);
    const raw=sampleData().irHall; if(!raw) return Promise.resolve(null);
    return c.decodeAudioData(b64bytes(raw.ir)).then(b=>{ this.irCache[sr]=b; if(A.ctx&&A.ctx.sampleRate===sr) this.irReady(); return b; }).catch(()=>null);
  },
  irReady(){ if(this.live) this.rebuild(); },
  build(c,input,output,slots,opts={}){
    const mods=slots.map((s,i)=>({i,type:s.type,m:FX_LIB[s.type].make(c)})).sort((a,b)=>FX_PRIORITY.indexOf(a.type)-FX_PRIORITY.indexOf(b.type));
    let prev=input; mods.forEach(x=>{ prev.connect(x.m.inp); prev=x.m.out; }); prev.connect(output);
    mods.forEach(x=>{ if(x.m.tempo) x.m.tempo(opts.bpm||CTRL.bpm,true); const a=(opts.noRepeat&&x.type==='repeat')?0:slots[x.i].amount; x.m.set(a,true); });
    return mods;
  },
  buildLive(){ this.live=this.build(A.ctx,A.bus,A.mstrip.inp,this.slots); },
  rebuild(){
    if(!A.ctx) return;
    try{ A.bus.disconnect(); }catch(e){}
    (this.live||[]).forEach(x=>{ try{ x.m.out.disconnect(); }catch(e){} (x.m.osc||[]).forEach(o=>{ try{ o.stop(); }catch(e){} }); });
    this.buildLive();
  },
  set(i,a){
    a=clamp(a,0,1); const s=this.slots[i]; s.amount=a;
    if(this.live){ const x=this.live.find(m=>m.i===i); if(x) x.m.set(a,false); }
    updateFxUI(i); clearTimeout(this.saveT); this.saveT=setTimeout(()=>store.set('fx',this.slots),300);
  },
  setType(i,t){ this.slots[i]={type:t,amount:FX_LIB[t].neutral}; store.set('fx',this.slots); this.rebuild(); renderFx(); renderKnobs(); PICK.clear(); },
  tempo(bpm){ (this.live||[]).forEach(x=>{ if(x.m.tempo) x.m.tempo(bpm,false); }); },
  reset(i){ this.set(i,FX_LIB[this.slots[i].type].neutral); PICK.clear(); }
};
/* knob pickup: after a reset, a hardware knob only takes over once it reaches the current value, so nothing jumps */
const PICK=new Set();
const DESTRUCTIVE=new Set(['dj','lowpass','highpass','gate','repeat','crush','drive','pump','autopan']);
function applyFxPreset(zone,inst){
  if(zone==='keys'){ const pr=FX_PRESETS[inst.fxp]||{}; FX.slots.forEach((s,i)=>FX.set(i,pr[s.type]!=null?pr[s.type]:FX_LIB[s.type].neutral)); }
  else FX.slots.forEach((s,i)=>{ if(DESTRUCTIVE.has(s.type)) FX.set(i,FX_LIB[s.type].neutral); });
  PICK.clear();
}
function fxCcLabel(i){ const ds=primarySettings(); if(ds) for(const k in ds.cc) if(ds.cc[k]==='fx'+i) return 'CC '+k; return ''; }
function renderFx(){
  const opts=Object.entries(FX_LIB).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('');
  $('#fxGrid').innerHTML=FX.slots.map((s,i)=>{ const d=FX_LIB[s.type], cc=fxCcLabel(i);
    return `<div class="slot" data-slot="${i}"><div class="sh"><span class="kn">K${i+1}</span><select class="select inline" data-fxsel="${i}" aria-label="Effect for knob ${i+1}">${opts}</select></div>
      <div class="dial big" data-fx="${i}" role="slider" tabindex="0" aria-label="${esc(d.name)} amount" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(s.amount*100)}" style="--v:${s.amount.toFixed(3)}"><div class="cap"></div></div>
      <div><div class="sv" data-fxval="${i}">${Math.round(s.amount*100)}%</div><div class="sd">${esc(d.desc)}</div></div>
      <div class="sb"><span class="map" id="map-fx${i}">${cc||'Turn a knob'}</span><span class="row"><button class="btn small ghost" type="button" data-fxreset="${i}">Reset</button><button class="btn small ghost" type="button" data-learn="fx${i}" id="learn-fx${i}">Learn</button></span></div></div>`; }).join('');
  FX.slots.forEach((s,i)=>{ $(`[data-fxsel="${i}"]`).value=s.type; });
}
function updateFxUI(i){
  const a=FX.slots[i].amount;
  document.querySelectorAll(`.dial[data-fx="${i}"]`).forEach(d=>{ d.style.setProperty('--v',a.toFixed(3)); d.setAttribute('aria-valuenow',Math.round(a*100)); });
  document.querySelectorAll(`[data-fxval="${i}"]`).forEach(e=>e.textContent=Math.round(a*100)+'%');
  document.querySelectorAll(`.slot[data-slot="${i}"],.knob[data-k="${i}"]`).forEach(el=>{ el.classList.add('hot'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('hot'),450); });
}
$('#fxGrid').addEventListener('change',e=>{ const s=e.target.closest('[data-fxsel]'); if(s){ ensureAudio(); FX.setType(+s.dataset.fxsel,s.value); } });
document.addEventListener('click',e=>{ const r=e.target.closest('[data-fxreset]'); if(r) FX.reset(+r.dataset.fxreset); });
$('#fxDefaults').onclick=()=>{ FX.slots=FX_DEFAULT.map(t=>({type:t,amount:FX_LIB[t].neutral})); store.set('fx',FX.slots); FX.rebuild(); renderFx(); renderKnobs(); toast('Default effects restored'); };
$('#fxForget').onclick=()=>{ const ds=primarySettings(); if(ds){ for(const k in ds.cc) if(/^fx/.test(ds.cc[k])) delete ds.cc[k]; saveDevices(); } renderFx(); renderKnobs(); toast('Knob assignments cleared. Turn your knobs to assign them again.'); };
/* draggable dials: effect knobs (data-fx) and EQ dials (data-d) */
(function(){
  let drag=null;
  const get=d=>d.dataset.fx!=null?FX.slots[+d.dataset.fx].amount:dialGet(d.dataset.d);
  const set=(d,v)=>d.dataset.fx!=null?FX.set(+d.dataset.fx,v):dialSet(d.dataset.d,v);
  document.addEventListener('pointerdown',e=>{ const d=e.target.closest('.dial[data-fx],.dial[data-d]'); if(!d) return; e.preventDefault(); ensureAudio(); drag={d,y:e.clientY,v:get(d)}; try{ d.setPointerCapture(e.pointerId); }catch(_){} });
  document.addEventListener('pointermove',e=>{ if(!drag) return; set(drag.d,drag.v+(drag.y-e.clientY)/160); });
  document.addEventListener('pointerup',()=>{ drag=null; });
  document.addEventListener('dblclick',e=>{ const d=e.target.closest('.dial[data-fx],.dial[data-d]'); if(!d) return; if(d.dataset.fx!=null) FX.reset(+d.dataset.fx); else dialSet(d.dataset.d,0.5); });
  document.addEventListener('keydown',e=>{ const d=e.target.closest&&e.target.closest('.dial[data-fx],.dial[data-d]'); if(!d) return;
    if(e.key==='ArrowUp'||e.key==='ArrowRight'){ e.preventDefault(); e.stopPropagation(); set(d,get(d)+0.05); }
    if(e.key==='ArrowDown'||e.key==='ArrowLeft'){ e.preventDefault(); e.stopPropagation(); set(d,get(d)-0.05); } },true);
})();
