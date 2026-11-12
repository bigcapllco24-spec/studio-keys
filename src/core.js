
/* ---------- utils ---------- */
const $=(s,el=document)=>el.querySelector(s);
const NOTE_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const noteName=n=>NOTE_NAMES[((n%12)+12)%12]+(Math.floor(n/12)-1);
const mtof=n=>440*Math.pow(2,(n-69)/12);
const ftom=f=>69+12*Math.log2(f/440);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const mod=(a,n)=>((a%n)+n)%n;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtHz=f=>f>=1000?(f/1000).toFixed(1)+' kHz':Math.round(f)+' Hz';
const fmtS=s=>s<1?Math.round(s*1000)+' ms':s.toFixed(2)+' s';
const fmtT=s=>{const m=Math.floor(s/60), r=s-m*60; return m+':'+(r<10?'0':'')+r.toFixed(1);};
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
const store={
  get(k,d){ try{ const v=localStorage.getItem('studiokeys.'+k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem('studiokeys.'+k,JSON.stringify(v)); }catch(e){} }
};
let toastTimer=0;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),3200); }
function cssVar(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
/* colour theme: velvet (default), plum, ink. TC caches the colours canvases need. */
const TC={};
function themeColors(){ ['--t0','--t1','--t2','--t3','--t4','--t5','--t6','--t7','--t8','--t9','--accent','--signal','--ink','--muted','--line','--panel','--raised','--bg'].forEach(k=>TC[k.slice(2)]=cssVar(k)); }
function setTheme(t){ t=['velvet','plum','ink'].includes(t)?t:'velvet'; if(t==='velvet') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme=t;
  try{ localStorage.setItem('studiokeys.theme',t); }catch(e){} themeColors();
  document.querySelectorAll('.themes [data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===t)));
  if(typeof drawRolls==='function'){ try{ drawRolls(); drawRuler(); if(ED.tid) drawEditor(); }catch(e){} } }
(function(){ let t='velvet'; try{ t=localStorage.getItem('studiokeys.theme')||'velvet'; }catch(e){} setTheme(t);
  document.addEventListener('click',e=>{ const b=e.target.closest('.themes [data-theme]'); if(b) setTheme(b.dataset.theme); }); })();

/* ---------- persisted controls ---------- */
const CTRL=Object.assign({volume:80,curve:'linear',transpose:0,octave:4,bpm:120,metro:true,countIn:true,quant:0.25,loopLen:0},store.get('ctrl',{}));
const saveCtrl=()=>store.set('ctrl',CTRL);

/* ---------- audio engine ---------- */
const A={ctx:null,openHats:new Set()};
const noiseCache=new WeakMap();
function getNoise(c){ let b=noiseCache.get(c); if(!b){ b=c.createBuffer(1,c.sampleRate*2,c.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; noiseCache.set(c,b); } return b; }
const SOFT=(()=>{ const n=1024, c=new Float32Array(n), k=2.2, m=Math.tanh(k); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x)/m; } return c; })();
function makeImpulse(c,dur,decay){ const len=Math.floor(c.sampleRate*dur), b=c.createBuffer(2,len,c.sampleRate); for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay); } return b; }

function ensureAudio(){
  if(!A.ctx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC){ toast('This browser has no Web Audio support.'); return null; }
    const c=new AC({latencyHint:'interactive'}); A.ctx=c;
    A.bus=c.createGain();
    A.master=c.createGain();
    A.comp=c.createDynamicsCompressor(); A.comp.threshold.value=-10; A.comp.knee.value=8; A.comp.ratio.value=4; A.comp.attack.value=0.003; A.comp.release.value=0.2;
    A.analyser=c.createAnalyser(); A.analyser.fftSize=2048;
    A.click=c.createGain(); A.click.gain.value=0.35; A.click.connect(A.master);
    A.master.connect(A.comp); A.comp.connect(A.analyser); A.analyser.connect(c.destination);
    A.bend=c.createConstantSource(); A.bend.offset.value=0; A.bend.start();
    A.vibOsc=c.createOscillator(); A.vibOsc.frequency.value=5.6; A.vibGain=c.createGain(); A.vibGain.gain.value=0; A.vibOsc.connect(A.vibGain); A.vibOsc.start();
    c.onstatechange=updateAudioPill;
    buildStrips(); FX.buildLive(); FX.loadIR(c);
    applyVolume();
    startScope();
  }
  if(A.ctx.state==='suspended') A.ctx.resume().then(updateAudioPill).catch(()=>{});
  updateAudioPill();
  return A.ctx;
}
function updateAudioPill(){
  const p=$('#audioPill'), on=A.ctx&&A.ctx.state==='running';
  p.innerHTML=on?`<span class="led on"></span><span>Sound on · ${(A.ctx.sampleRate/1000).toFixed(1)} kHz</span>`:`<span class="led warn"></span><span>Sound off · click to start</span>`;
  if(on) $('#soundBanner').hidden=true;
}
function applyVolume(){ if(A.ctx) A.master.gain.setTargetAtTime(Math.pow(CTRL.volume/100,2),A.ctx.currentTime,0.02); }

function holdParam(p,t,c){
  if(p.cancelAndHoldAtTime){ p.cancelAndHoldAtTime(t); return; }
  if(t<=c.currentTime+0.02){ const v=p.value; p.cancelScheduledValues(t); p.setValueAtTime(v,t); } else p.cancelScheduledValues(t);
}
const LIVE=new Set();
class Voice{
  constructor(c,dest){ this.c=c; this.amp=c.createGain(); this.amp.connect(dest); this.srcs=[]; this.ended=0; this.rel=0.2; this.oneShot=false; this.stopT=Infinity; this.done=false; this.released=false; if(c===A.ctx) LIVE.add(this); }
  src(node){
    this.srcs.push(node);
    if(this.c===A.ctx && node.detune){ try{ A.bend.connect(node.detune); A.vibGain.connect(node.detune); node._mod=true; }catch(e){} }
    node.onended=()=>{ if(++this.ended>=this.srcs.length) this.cleanup(); };
    return node;
  }
  stopAt(t){ if(t>=this.stopT) return; this.stopT=t; for(const s of this.srcs){ try{ s.stop(t); }catch(e){} } }
  release(t){ if(this.oneShot||this.released) return; this.released=true; holdParam(this.amp.gain,t,this.c); this.amp.gain.setTargetAtTime(0,t,this.rel/4); this.stopAt(t+this.rel*1.7+0.05); }
  kill(t){ holdParam(this.amp.gain,t,this.c); this.amp.gain.setTargetAtTime(0,t,0.006); this.released=true; this.stopAt(t+0.05); }
  cleanup(){
    if(this.done) return; this.done=true;
    for(const s of this.srcs){ try{ if(s._mod){ A.bend.disconnect(s.detune); A.vibGain.disconnect(s.detune); } s.disconnect(); }catch(e){} }
    try{ this.amp.disconnect(); }catch(e){}
    LIVE.delete(this); if(this.onEnd) this.onEnd();
  }
}
function osc(c,type,f,det=0){ const o=c.createOscillator(); o.type=type; o.frequency.value=f; o.detune.value=det; return o; }
function gainN(c,v=1){ const g=c.createGain(); g.gain.value=v; return g; }
function filt(c,type,f,q=0.7){ const b=c.createBiquadFilter(); b.type=type; b.frequency.value=f; b.Q.value=q; return b; }
function noise(c){ const s=c.createBufferSource(); s.buffer=getNoise(c); s.loop=true; return s; }
function shaper(c){ const w=c.createWaveShaper(); w.curve=SOFT; w.oversample='2x'; return w; }
function adsr(p,t,a,d,s,peak){ p.setValueAtTime(0,t); p.linearRampToValueAtTime(peak,t+a); p.setTargetAtTime(peak*s,t+a,Math.max(d,0.003)/3); }
function env(c,t,peak,a,tau){ const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.setTargetAtTime(0,t+a,tau); return g; }
