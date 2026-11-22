
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
/* SE-11: stems that add up to the mix. The master glue and limiter (Web Audio compressors) apply ONE gain to both channels
   of the signal delayed by their look-ahead: out(t) = g(t)·in(t-D). masterGain measures D and g on the full mix (y = master
   output, x = what goes into the glue, both whole renders), for the n samples from a. Every stem (rendered without the glue
   and limiter, shifted by D) times g then sums to the mix, and no stem gets the master's makeup gain or limiting on its own. */
function masterGain(y,x,a,n){
  const [Y0,Y1]=y, [X0,X1]=x, W=4096, MAXD=Math.min(2048,a); let pk=0, w0=a, best=-1;
  for(let i=a;i<a+n;i++){ const m=Math.max(Math.abs(X0[i]),Math.abs(X1[i])); if(m>pk) pk=m; }
  for(let s=a;s+W<=a+n;s+=W){ let e=0; for(let i=s;i<s+W;i++) e+=X0[i]*X0[i]+X1[i]*X1[i]; if(e>best){ best=e; w0=s; } }
  const thr=pk*1e-3; let D=0, cost=Infinity;
  if(pk>1e-6) for(let d=0;d<=MAXD;d++){ let c=0, k=0, prev=NaN; /* the right delay gives a smooth gain curve, a wrong one a jagged ratio */
    for(let t=w0;t<w0+W&&t<a+n;t++){ const u=X0[t-d], v=X1[t-d], ch=Math.abs(u)>=Math.abs(v), xm=ch?u:v; if(Math.abs(xm)<thr) continue;
      const g=(ch?Y0[t]:Y1[t])/xm; if(prev===prev){ c+=Math.abs(g-prev); k++; } prev=g; }
    if(k>64&&c/k<cost){ cost=c/k; D=d; } }
  const g=new Float32Array(n); let last=-1;
  for(let i=0;i<n;i++){ const t=a+i, u=X0[t-D], v=X1[t-D], ch=Math.abs(u)>=Math.abs(v), xm=ch?u:v;
    if(Math.abs(xm)>1e-7){ g[i]=clamp((ch?Y0[t]:Y1[t])/xm,0,16);
      if(i-last>1){ const g0=last<0?g[i]:g[last]; for(let j=last+1;j<i;j++) g[j]=g0+(g[i]-g0)*(j-last)/(i-last); } last=i; } }
  if(last<0) g.fill(1); else for(let j=last+1;j<n;j++) g[j]=g[last];
  return {g,D};
}
/* SE-11 fix 2: the master Drive and Bitcrush knobs shape the summed bus, which no set of separately driven stems can add up to.
   shaperLatency finds the shaper's latency D (highest correlation of its output Z with a delayed input X, in the loudest stretch),
   so the clean stems can be rendered without the shaper but delayed by D. shaperSplit then works on what goes into the master
   glue: Y, the driven mix, and P, the clean stems in the same frame. In ~280 ms windows (Hann, 6 ms hop, wrapping round the loop)
   it finds the level of each stem that best matches the driven mix by energy (least squares over all stems at once, both channels
   with one gain so stems keep their stereo image, held near the whole mix's level where a stem is quiet), limits how fast each level
   may move (1.5 dB in 23 ms) and returns those levels h and the rest r = Y - sum(h·P): only the grit (harmonics, intermodulation,
   clipping, bit noise), with almost none of any part in it, so muting a stem really mutes its part. Stems and r still add up exactly. */
const SHAPE_TYPES=new Set(['drive','crush']);
const shapeKnob=s=>(s.type==='drive'&&Math.round(s.amount*40)/40>=0.02)||(s.type==='crush'&&s.amount>=0.03); /* the curve is on (see FX_LIB) */
const shapeOn=slots=>slots.some(shapeKnob);
function shaperLatency(X,Z){
  const [X0,X1]=X, [Z0,Z1]=Z, N=Z0.length, MAXD=512, P=8192;
  let best=-1, w0=MAXD;
  for(let s=MAXD;s+P<=N;s+=P){ let e=0; for(let i=s;i<s+P;i++) e+=Z0[i]*Z0[i]+Z1[i]*Z1[i]; if(e>best){ best=e; w0=s; } }
  let D=0, cbest=-Infinity;
  for(let d=0;d<=MAXD;d++){ let c=0, q=0; for(let i=w0;i<w0+P&&i<N;i++){ const u=X0[i-d], v=X1[i-d]; c+=Z0[i]*u+Z1[i]*v; q+=u*u+v*v; } const r=q>0?c/Math.sqrt(q):0; if(r>cbest){ cbest=r; D=d; } }
  return D;
}
function shaperSplit(Y,P){
  const [Y0,Y1]=Y, n=Y0.length, k=P.length, H=256, J=Math.ceil(n/H), B=24, LAM=0.1, SLEW=0.375/20*Math.LN10, LO=Math.log(0.05), HI=Math.log(16);
  const G=new Float64Array(J*k*k), C=new Float64Array(J*k); let E=0; /* per 256-sample block: stem x stem and stem x mix energy */
  for(let j=0;j<J;j++){ const s=j*H, e=Math.min(n,s+H);
    for(let a=0;a<k;a++){ const [A0,A1]=P[a]; let c=0; for(let i=s;i<e;i++) c+=A0[i]*Y0[i]+A1[i]*Y1[i]; C[j*k+a]=c;
      for(let b=a;b<k;b++){ const [B0,B1]=P[b]; let g=0; for(let i=s;i<e;i++) g+=A0[i]*B0[i]+A1[i]*B1[i]; G[(j*k+a)*k+b]=G[(j*k+b)*k+a]=g; if(a===b) E+=g; } } }
  const eps=E/J*1e-6, w=[]; for(let m=0;m<2*B;m++) w.push(Math.sin(Math.PI*(m+0.5)/(2*B))**2);
  const lg=[...Array(k)].map(()=>new Float64Array(J).fill(NaN)), M=new Float64Array(k*k), c=new Float64Array(k), A=new Float64Array(k*k), r=new Float64Array(k);
  for(let q=0;q<J;q++){ M.fill(0); c.fill(0);
    for(let m=0;m<2*B;m++){ const j=((q-B+m)%J+J)%J, ww=w[m]; for(let a=0;a<k;a++){ c[a]+=ww*C[j*k+a]; for(let b=0;b<k;b++) M[a*k+b]+=ww*G[(j*k+a)*k+b]; } }
    let sm=0, sc=0; for(let a=0;a<k;a++){ sc+=c[a]; for(let b=0;b<k;b++) sm+=M[a*k+b]; }
    if(!(sm>eps)) continue; const h0=clamp(sc/sm,0.05,16); /* one level for the whole mix here: where a stem is quiet or unclear it stays near this */
    for(let a=0;a<k;a++){ const d=LAM*M[a*k+a]+eps; for(let b=0;b<k;b++) A[a*k+b]=M[a*k+b]; A[a*k+a]+=d; r[a]=c[a]+d*h0; }
    for(let col=0;col<k;col++){ const piv=A[col*k+col]; for(let row=0;row<k;row++) if(row!==col){ const f=A[row*k+col]/piv; if(!f) continue; for(let j=col;j<k;j++) A[row*k+j]-=f*A[col*k+j]; r[row]-=f*r[col]; } }
    for(let a=0;a<k;a++){ const v=r[a]/A[a*k+a]; lg[a][q]=v>0?clamp(Math.log(v),LO,HI):LO; } }
  const h=lg.map(L=>{ let f=-1; for(let q=0;q<J;q++) if(L[q]===L[q]){ f=q; break; }
    if(f<0) L.fill(0); else { let last=f; for(let s=1;s<=J;s++){ const q=(f+s)%J; if(L[q]===L[q]){ const gap=(q-last+J)%J; for(let t=1;t<gap;t++) L[(last+t)%J]=L[last]+(L[q]-L[last])*t/gap; last=q; } } } /* silence: glide between its neighbours */
    const R=1+2*Math.ceil(150/J), X=new Float64Array(R*J), last=(J-1)*H, sw=SLEW*(n-last)/H; for(let i=0;i<R*J;i++) X[i]=L[i%J]; /* at most 1.5 dB per 23 ms, */
    for(let i=1;i<R*J;i++){ const s=i%J?SLEW:sw; X[i]=Math.min(X[i-1]+s,Math.max(X[i-1]-s,X[i])); } /* either way: forward then backward over copies of */
    for(let i=R*J-2;i>=0;i--){ const s=(i+1)%J?SLEW:sw; X[i]=Math.min(X[i+1]+s,Math.max(X[i+1]-s,X[i])); } /* the loop, keeping the middle one, so it joins smoothly where the loop wraps */
    const e=Array.from(X.subarray((R>>1)*J,((R>>1)+1)*J),Math.exp), o=new Float32Array(n);
    for(let i=0;i<n;i++){ const q=Math.floor(i/H); o[i]=q<J-1?e[q]+(e[q+1]-e[q])*(i/H-q):e[J-1]+(e[0]-e[J-1])*(i-last)/(n-last); } return o; });
  const r0=Float32Array.from(Y0), r1=Float32Array.from(Y1);
  for(let a=0;a<k;a++){ const [A0,A1]=P[a], ha=h[a]; for(let i=0;i<n;i++){ r0[i]-=ha[i]*A0[i]; r1[i]-=ha[i]*A1[i]; } }
  return {h,r:[r0,r1]};
}
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
