
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
/* colour theme: emerald (default), velvet, sapphire. TC caches the colours canvases need. */
const TC={};
function themeColors(){ ['--t0','--t1','--t2','--t3','--t4','--t5','--t6','--t7','--t8','--t9','--accent','--signal','--ink','--muted','--line','--panel','--raised','--bg'].forEach(k=>TC[k.slice(2)]=cssVar(k)); }
function setTheme(t){ t=['velvet','sapphire','emerald'].includes(t)?t:'emerald'; document.documentElement.dataset.theme=t;
  try{ localStorage.setItem('studiokeys.theme',t); }catch(e){} themeColors();
  document.querySelectorAll('.themes [data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===t)));
  if(typeof drawRolls==='function'){ try{ drawRolls(); drawRuler(); if(ED.tid) drawEditor(); }catch(e){} } }
(function(){ let t='emerald'; try{ if(localStorage.getItem('studiokeys.themeV')!=='2'){ localStorage.setItem('studiokeys.themeV','2'); localStorage.setItem('studiokeys.theme','emerald'); } t=localStorage.getItem('studiokeys.theme')||'emerald'; }catch(e){} setTheme(t);
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

/* ---------- master ceiling: the last stage before the speakers and every render (SE-9) ----------
   A look-ahead true-peak limiter (AudioWorklet) that holds the output under CEIL_DB dBTP whatever the knobs do.
   Below the ceiling it passes the sound untouched (gain exactly 1); it only adds CEIL_LA samples of delay, which renders take back out.
   Where AudioWorklet is missing or fails, a soft clipper with the same ceiling stands in. */
const CEIL_DB=-0.3, CEIL=Math.pow(10,CEIL_DB/20), CEIL_LA=72;
const CEIL_SRC=`class SKCeiling extends AudioWorkletProcessor{
  constructor(o){ super(); const p=o.processorOptions||{}; this.c=p.ceil||0.966; this.D=p.la||72; this.B=this.D-8; this.Hw=this.D+1;
    this.rel=1-Math.exp(-1/(0.08*sampleRate)); this.N=256; this.buf=[new Float32Array(this.N),new Float32Array(this.N)]; this.tg=new Float32Array(this.N); this.rb=new Float64Array(this.N);
    this.w=0; this.r=1; this.sum=this.B; this.lastLow=-1e9; this.n=0; this.hot=-1e9;
    this.H=[0.001708984375,0.010986328125,-0.0196533203125,0.033203125,-0.0594482421875,0.1373291015625,0.97216796875,-0.102294921875,0.047607421875,-0.026611328125,0.0148925781250,-0.00830078125,
      -0.0291748046875,0.029296875,-0.0517578125,0.0891113281250,-0.166503906250,0.465087890625,0.77978515625,-0.2003173828125,0.1015625,-0.0582275390625,0.0330810546875,-0.0189208984375];
    for(let i=0;i<this.N;i++) this.rb[i]=1; }
  process(ins,outs){ const I=ins[0]||[], O=outs[0], n=O[0].length, N=this.N, m=N-1, H=this.H, c=this.c, D=this.D, B=this.B, Hw=this.Hw;
    const i0=I[0], i1=I[1]||I[0];
    for(let k=0;k<n;k++){ const w=this.w, a=i0?i0[k]:0, b=i1?i1[k]:0; this.buf[0][w]=a; this.buf[1][w]=b;
      let pk=Math.max(a<0?-a:a,b<0?-b:b); if(pk>0.45) this.hot=this.n;
      if(this.n-this.hot<14){ for(let ch=0;ch<2;ch++){ const x=this.buf[ch]; let s0=0,s1=0,s2=0,s3=0;
          for(let j=0;j<12;j++){ const v=x[(w-j)&m]; s0+=v*H[j]; s1+=v*H[12+j]; s2+=v*H[23-j]; s3+=v*H[11-j]; }
          const q=Math.max(Math.abs(s0),Math.abs(s1),Math.abs(s2),Math.abs(s3)); if(q>pk) pk=q; } }
      const t=pk>c?c/pk:1; this.tg[w]=t; if(t<1) this.lastLow=this.n;
      let hold=1; if(this.n-this.lastLow<Hw){ for(let j=0;j<Hw;j++){ const v=this.tg[(w-j)&m]; if(v<hold) hold=v; } }
      let r=this.r+(1-this.r)*this.rel; if(hold<r) r=hold; this.r=r;
      this.sum+=r-this.rb[(w-B)&m]; this.rb[w]=r; let g=this.sum/B; if(g>1) g=1; if((this.n&4095)===0){ let s=0; for(let j=0;j<B;j++) s+=this.rb[(w-j)&m]; this.sum=s; }
      const rd=(w-D)&m; O[0][k]=this.buf[0][rd]*g; if(O[1]) O[1][k]=this.buf[1][rd]*g;
      this.w=(w+1)&m; this.n++; }
    return true; } }
registerProcessor('sk-ceiling',SKCeiling);`;
let ceilURL=null; const ceilMods=new WeakMap();
function ceilingReady(c){ let p=ceilMods.get(c);
  if(!p){ p=(async()=>{ if(!c.audioWorklet||typeof AudioWorkletNode==='undefined') return false;
      /* a data: URL loads from a file:// page too (blob: URLs don't there); blob: is the second try */
      try{ await c.audioWorklet.addModule('data:text/javascript;charset=utf-8,'+encodeURIComponent(CEIL_SRC)); return true; }catch(e){}
      if(!ceilURL) ceilURL=URL.createObjectURL(new Blob([CEIL_SRC],{type:'text/javascript'})); await c.audioWorklet.addModule(ceilURL); return true; })().catch(e=>{ console.warn('master ceiling: soft clip fallback',e); return false; }); ceilMods.set(c,p); }
  return p; }
const CEIL_CURVE=(()=>{ const n=4097, cv=new Float32Array(n), r=4, top=CEIL*0.98, k=0.9*top, d=top-k; /* a little under the ceiling: the 4x resampling filters overshoot */ for(let i=0;i<n;i++){ const x=(i/(n-1)*2-1)*r, a=Math.abs(x); cv[i]=Math.sign(x)*(a<=k?a:k+d*Math.tanh((a-k)/d)); } return cv; })();
function ceilingNode(c,worklet){
  if(worklet){ try{ return {node:new AudioWorkletNode(c,'sk-ceiling',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',processorOptions:{ceil:CEIL,la:CEIL_LA}}),latency:CEIL_LA}; }catch(e){ console.warn('master ceiling',e); } }
  /* soft clip: the curve covers ±4 (+12 dBFS) of input, scaled in and out */
  const pre=gainN(c,1/4), sh=c.createWaveShaper(), post=gainN(c,1); sh.curve=CEIL_CURVE; sh.oversample='4x'; pre.connect(sh).connect(post);
  return {node:pre,out:post,latency:0}; }
/* live: protected by the soft clip from the first sound, then the limiter takes over once its module loads */
function liveCeiling(c,from,to){ let cur=ceilingNode(c,false); from.connect(cur.node); (cur.out||cur.node).connect(to); A.ceil=cur;
  ceilingReady(c).then(ok=>{ if(!ok) return; const nx=ceilingNode(c,true); if(!nx.latency) return; nx.node.connect(to); from.connect(nx.node); try{ from.disconnect(cur.node); }catch(e){} A.ceil=nx; }); }
/* offline renders: the same ceiling, its delay reported so the caller can cut it back out */
async function renderCeiling(oc,from,to){ const cur=ceilingNode(oc,await ceilingReady(oc)); from.connect(cur.node); (cur.out||cur.node).connect(to); return cur.latency; }

function ensureAudio(){
  if(!A.ctx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC){ toast('This browser has no Web Audio support.'); return null; }
    const c=new AC({latencyHint:'interactive'}); A.ctx=c;
    A.bus=c.createGain();
    A.master=c.createGain();
    A.glue=c.createDynamicsCompressor(); A.glue.threshold.value=-16; A.glue.knee.value=10; A.glue.ratio.value=2; A.glue.attack.value=0.02; A.glue.release.value=0.25;
    A.comp=c.createDynamicsCompressor(); A.comp.threshold.value=-3; A.comp.knee.value=0; A.comp.ratio.value=20; A.comp.attack.value=0.001; A.comp.release.value=0.08;
    A.analyser=c.createAnalyser(); A.analyser.fftSize=2048;
    A.click=c.createGain(); A.click.gain.value=0.35; A.click.connect(A.master);
    A.master.connect(A.glue).connect(A.comp); liveCeiling(c,A.comp,A.analyser); A.analyser.connect(c.destination);
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
