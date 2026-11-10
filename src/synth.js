/* ---------- built-in instruments ---------- */
function playPiano(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n);
  const lp=filt(c,'lowpass',Math.min(18000,500+f*3+9000*v*v),0.5); lp.connect(V.amp);
  const base=clamp(7*Math.pow(0.5,(n-40)/18),0.5,10), B=0.00012*Math.pow(2,(n-60)/12), np=n>84?4:n>72?6:9;
  for(let k=1;k<=np;k++){
    const fk=f*k*Math.sqrt(1+B*k*k); if(fk>16000) break;
    const a=0.17*v/Math.pow(k,0.9+0.8*(1-v)), dk=base/(1+0.6*(k-1));
    const g=gainN(c,0); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(a,t+0.002); g.gain.setTargetAtTime(a*0.45,t+0.002,0.08+0.1/k); g.gain.setTargetAtTime(0,t+0.25,dk/3);
    const o=V.src(osc(c,'sine',fk,k===1?-1.5:0)); o.connect(g); o.start(t);
    if(k<=2){ const o2=V.src(osc(c,'sine',fk,1.8)); o2.connect(g); o2.start(t); }
    g.connect(lp);
  }
  const ns=V.src(noise(c)), hb=filt(c,'bandpass',clamp(f*4,800,6000),1.2), hg=gainN(c,0);
  hg.gain.setValueAtTime(0.1*v*v,t); hg.gain.setTargetAtTime(0,t,0.012); ns.connect(hb).connect(hg).connect(lp); ns.start(t,Math.random());
  V.rel=n<48?0.35:0.18; V.stopAt(t+base*1.6+0.4); return V;
}
function playEP(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n);
  const car=V.src(osc(c,'sine',f)), mod=V.src(osc(c,'sine',f)), mg=gainN(c,0), idx=f*(0.8+3.2*v);
  mg.gain.setValueAtTime(idx,t); mg.gain.setTargetAtTime(idx*0.25,t,0.35); mod.connect(mg).connect(car.frequency);
  const bell=V.src(osc(c,'sine',f*14)), bg=gainN(c,0); bg.gain.setValueAtTime(f*2*v,t); bg.gain.setTargetAtTime(0,t,0.04); bell.connect(bg).connect(car.frequency);
  const eg=gainN(c,0); eg.gain.setValueAtTime(0,t); eg.gain.linearRampToValueAtTime(0.33*(0.4+0.6*v),t+0.003); eg.gain.setTargetAtTime(0,t+0.003,clamp(2.8-(n-48)*0.03,0.6,3));
  car.connect(eg).connect(V.amp); [car,mod,bell].forEach(o=>o.start(t)); V.rel=0.25; V.stopAt(t+12); return V;
}
const waveCache=new WeakMap();
function organWave(c){ let w=waveCache.get(c); if(!w){ const im=new Float32Array([0,1,0.8,0.55,0.5,0,0.3,0,0.25]); w=c.createPeriodicWave(new Float32Array(im.length),im); waveCache.set(c,w); } return w; }
function playOrgan(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), o=V.src(c.createOscillator()); o.setPeriodicWave(organWave(c)); o.frequency.value=f;
  const sub=V.src(osc(c,'sine',f/2)), sg=gainN(c,0.4), eg=gainN(c,0);
  eg.gain.setValueAtTime(0,t); eg.gain.linearRampToValueAtTime(0.15,t+0.008);
  o.connect(eg); sub.connect(sg).connect(eg); eg.connect(V.amp);
  const ck=V.src(noise(c)), cg=env(c,t,0.05,0.0005,0.002); ck.connect(filt(c,'bandpass',2500,1)).connect(cg).connect(V.amp);
  o.start(t); sub.start(t); ck.start(t,Math.random()); ck.stop(t+0.05); V.rel=0.06; return V;
}
function playLead(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',300,5), fc=Math.min(16000,500+f*2+5000*v);
  lp.frequency.setValueAtTime(200,t); lp.frequency.linearRampToValueAtTime(fc,t+0.01); lp.frequency.setTargetAtTime(fc*0.45+f,t+0.01,0.15);
  [-7,7].forEach(d=>{ const o=V.src(osc(c,'sawtooth',f,d)); o.connect(lp); o.start(t); });
  const s=V.src(osc(c,'square',f)), sg=gainN(c,0.3); s.connect(sg).connect(lp); s.start(t);
  const eg=gainN(c,0); adsr(eg.gain,t,0.005,0.25,0.75,0.12*(0.5+0.5*v)); lp.connect(eg).connect(V.amp); V.rel=0.22; return V;
}
function playSuperSaw(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',6500+3000*v,0.3), hp=filt(c,'highpass',90,0.5), sum=gainN(c,0.045);
  [-25,-15,-7,0,7,15,25].forEach(d=>{ const o=V.src(osc(c,'sawtooth',f,d)); o.connect(sum); o.start(t+Math.random()*0.004); });
  const eg=gainN(c,0); adsr(eg.gain,t,0.02,0.5,0.85,0.8*(0.5+0.5*v)); sum.connect(hp).connect(lp).connect(eg).connect(V.amp); V.rel=0.4; return V;
}
function playPad(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',700+500*v,1.5);
  [-10,10].forEach(d=>{ const o=V.src(osc(c,'sawtooth',f,d)); o.connect(lp); o.start(t); });
  const tri=V.src(osc(c,'triangle',f/2)), tg=gainN(c,0.4); tri.connect(tg).connect(lp); tri.start(t);
  const lfo=V.src(osc(c,'sine',0.25+Math.random()*0.1)), lg=gainN(c,350); lfo.connect(lg).connect(lp.frequency); lfo.start(t);
  const eg=gainN(c,0); adsr(eg.gain,t,0.7,1.2,0.85,0.1); lp.connect(eg).connect(V.amp); V.rel=1.6; return V;
}
const ksCache=new Map();
function ksBuffer(c,n,vb){
  const key=c.sampleRate+':'+n+':'+vb; if(ksCache.has(key)) return ksCache.get(key);
  const sr=c.sampleRate, f=mtof(n), N=Math.max(2,Math.floor(sr/f-0.5)), fa=sr/(N+0.5), T60=clamp(4-(n-40)*0.05,0.6,4), dur=clamp(T60*0.8,0.8,3.2), len=Math.floor(dur*sr);
  const buf=c.createBuffer(1,len,sr), d=buf.getChannelData(0), bright=[0.35,0.6,0.9][vb], loss=Math.pow(0.001,1/(fa*T60));
  let prev=0, mean=0; for(let i=0;i<N;i++){ prev+=bright*((Math.random()*2-1)-prev); d[i]=prev; mean+=prev; } mean/=N; for(let i=0;i<N;i++) d[i]-=mean;
  for(let i=N;i<len;i++){ d[i]=loss*0.5*(d[i-N]+(i-N-1>=0?d[i-N-1]:0)); }
  let pk=0; for(let i=0;i<len;i++) pk=Math.max(pk,Math.abs(d[i])); if(pk>0) for(let i=0;i<len;i++) d[i]*=0.9/pk;
  const r={buf,rate:f/fa}; ksCache.set(key,r); return r;
}
function playPluck(c,dest,n,v,t){
  const V=new Voice(c,dest), ks=ksBuffer(c,n,v<0.4?0:v<0.75?1:2), s=V.src(c.createBufferSource());
  s.buffer=ks.buf; s.playbackRate.value=ks.rate;
  const lp=filt(c,'lowpass',2000+8000*v,0.5), g=gainN(c,0.35*(0.3+0.7*v)); s.connect(lp).connect(g).connect(V.amp); s.start(t);
  V.rel=0.3; V.stopAt(t+ks.buf.duration/ks.rate+0.05); return V;
}
function playSub(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), sh=shaper(c), lp=filt(c,'lowpass',1200,0.7);
  const o=V.src(osc(c,'sine',f)), tr=V.src(osc(c,'triangle',f)), tg=gainN(c,0.3); o.connect(sh); tr.connect(tg).connect(sh);
  const eg=gainN(c,0); adsr(eg.gain,t,0.004,0.3,0.9,0.38*(0.6+0.4*v)); sh.connect(lp).connect(eg).connect(V.amp); o.start(t); tr.start(t); V.rel=0.1; return V;
}
function playAcid(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',200,14), sh=shaper(c), base=180+f*1.2, peak=base+3800*Math.pow(v,1.5);
  lp.frequency.setValueAtTime(peak,t); lp.frequency.setTargetAtTime(base+120,t,0.12);
  const o=V.src(osc(c,'sawtooth',f)); o.connect(lp);
  const eg=gainN(c,0); adsr(eg.gain,t,0.002,0.3,0.5,0.22); lp.connect(sh).connect(eg).connect(V.amp); o.start(t); V.rel=0.07; return V;
}

/* drums */
const GM_DRUMS={35:'kick',36:'kick',37:'rim',38:'snare',39:'clap',40:'snare',41:'tomF',42:'hatC',43:'tomF2',44:'hatP',45:'tomL',46:'hatO',47:'tomM',48:'tomH',49:'crash',50:'tomH2',51:'ride',52:'crash',53:'ride',55:'crash',56:'cow',57:'crash',59:'ride'};
const DRUM_FALLBACK=['kick','rim','snare','clap','snare','tomL','hatC','tomM','hatP','tomH','hatO','ride'];
const DRUM_LABEL={kick:'Kick',rim:'Rim',snare:'Snare',clap:'Clap',hatC:'Hat',hatP:'Pedal hat',hatO:'Open hat',tomF:'Floor tom',tomF2:'Floor tom',tomL:'Low tom',tomM:'Mid tom',tomH:'High tom',tomH2:'High tom',crash:'Crash',ride:'Ride',cow:'Cowbell'};
const TOM_F={tomF:70,tomF2:84,tomL:100,tomM:124,tomH:152,tomH2:180};
const drumPiece=n=>GM_DRUMS[n]||DRUM_FALLBACK[((n%12)+12)%12];
function metal(V,c,t,base){ const sum=gainN(c,0.18); [2,3,4.16,5.43,6.79,8.21].forEach(r=>{ const o=V.src(osc(c,'square',base*r)); o.connect(sum); o.start(t); }); return sum; }
function hat(V,c,t,v,tau,dur){ const m=metal(V,c,t,40), g=env(c,t,0.5*v,0.001,tau); m.connect(filt(c,'bandpass',10000,0.8)).connect(filt(c,'highpass',7000)).connect(g).connect(V.amp);
  const nz=V.src(noise(c)), ng=env(c,t,0.12*v,0.001,tau*0.9); nz.connect(filt(c,'highpass',8000)).connect(ng).connect(V.amp); nz.start(t,Math.random()); return dur; }
function tom(V,c,t,v,f){ const o=V.src(osc(c,'sine',f)); o.frequency.setValueAtTime(f*1.6,t); o.frequency.exponentialRampToValueAtTime(f,t+0.12); const g=env(c,t,0.7*v,0.002,0.11); o.connect(g).connect(V.amp); o.start(t);
  const nz=V.src(noise(c)), ng=env(c,t,0.08*v,0.001,0.02); nz.connect(filt(c,'bandpass',f*5,1)).connect(ng).connect(V.amp); nz.start(t,Math.random()); return 0.8; }
const DRUMS={
  kick(V,c,t,v){ const o=V.src(osc(c,'sine',160)); o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(46,t+0.11); const g=env(c,t,0.95*v,0.002,0.14); o.connect(g).connect(V.amp); o.start(t);
    const nz=V.src(noise(c)), g2=env(c,t,0.22*v,0.0005,0.004); nz.connect(filt(c,'highpass',2500)).connect(g2).connect(V.amp); nz.start(t,Math.random()); return 0.9; },
  snare(V,c,t,v){ const nz=V.src(noise(c)), g=env(c,t,0.55*v,0.001,0.07); nz.connect(filt(c,'highpass',1000)).connect(filt(c,'bandpass',3500,0.6)).connect(g).connect(V.amp); nz.start(t,Math.random());
    const o=V.src(osc(c,'triangle',210)); o.frequency.setValueAtTime(210,t); o.frequency.exponentialRampToValueAtTime(160,t+0.06); const g2=env(c,t,0.5*v,0.001,0.045); o.connect(g2).connect(V.amp); o.start(t); return 0.6; },
  clap(V,c,t,v){ const nz=V.src(noise(c)), g=gainN(c,0); g.gain.setValueAtTime(0,t);
    for(let i=0;i<3;i++){ const tt=t+i*0.011; g.gain.setValueAtTime(0.7*v,tt); g.gain.setTargetAtTime(0,tt+0.0005,0.0035); }
    g.gain.setValueAtTime(0.6*v,t+0.034); g.gain.setTargetAtTime(0,t+0.035,0.08); nz.connect(filt(c,'bandpass',1250,1.4)).connect(g).connect(V.amp); nz.start(t,Math.random()); return 0.6; },
  rim(V,c,t,v){ const o=V.src(osc(c,'triangle',1700)), g=env(c,t,0.4*v,0.0005,0.012); o.connect(g).connect(V.amp); o.start(t);
    const nz=V.src(noise(c)), g2=env(c,t,0.2*v,0.0005,0.006); nz.connect(filt(c,'bandpass',4000,1)).connect(g2).connect(V.amp); nz.start(t,Math.random()); return 0.2; },
  hatC(V,c,t,v){ return hat(V,c,t,v,0.018,0.25); },
  hatP(V,c,t,v){ return hat(V,c,t,v*0.8,0.03,0.3); },
  hatO(V,c,t,v){ return hat(V,c,t,v,0.14,1.2); },
  tomF(V,c,t,v){ return tom(V,c,t,v,TOM_F.tomF); }, tomF2(V,c,t,v){ return tom(V,c,t,v,TOM_F.tomF2); }, tomL(V,c,t,v){ return tom(V,c,t,v,TOM_F.tomL); },
  tomM(V,c,t,v){ return tom(V,c,t,v,TOM_F.tomM); }, tomH(V,c,t,v){ return tom(V,c,t,v,TOM_F.tomH); }, tomH2(V,c,t,v){ return tom(V,c,t,v,TOM_F.tomH2); },
  crash(V,c,t,v){ const nz=V.src(noise(c)), g=env(c,t,0.3*v,0.001,0.5); nz.connect(filt(c,'highpass',5000)).connect(g).connect(V.amp); nz.start(t,Math.random());
    const m=metal(V,c,t,60), g2=env(c,t,0.18*v,0.001,0.4); m.connect(filt(c,'highpass',6000)).connect(g2).connect(V.amp); return 3; },
  ride(V,c,t,v){ const m=metal(V,c,t,62), g=env(c,t,0.22*v,0.001,0.3); m.connect(filt(c,'bandpass',9000,2)).connect(g).connect(V.amp);
    const b=V.src(osc(c,'sine',3100)), bg=env(c,t,0.05*v,0.001,0.25); b.connect(bg).connect(V.amp); b.start(t);
    const nz=V.src(noise(c)), ng=env(c,t,0.05*v,0.001,0.3); nz.connect(filt(c,'highpass',8000)).connect(ng).connect(V.amp); nz.start(t,Math.random()); return 2.5; },
  cow(V,c,t,v){ const bp=filt(c,'bandpass',800,3), g=env(c,t,0.3*v,0.001,0.08); [545,815].forEach(f=>{ const o=V.src(osc(c,'square',f)); o.connect(bp); o.start(t); }); bp.connect(g).connect(V.amp); return 0.6; }
};
function playDrum(c,dest,n,v,t){ const V=new Voice(c,dest); V.oneShot=true; const piece=drumPiece(n), dur=DRUMS[piece](V,c,t,v); V.piece=piece; V.stopAt(t+dur); return V; }

/* custom instruments from the Sound Lab */
function playSampler(s,c,dest,n,v,t){
  const V=new Voice(c,dest), src=V.src(c.createBufferSource()); src.buffer=s.buffer;
  const rate=s.percussive?1:mtof(n)/s.rootFreq; src.playbackRate.value=rate;
  if(s.loop && !s.percussive){ src.loop=true; src.loopStart=s.loop[0]; src.loopEnd=s.loop[1]; }
  const g=gainN(c,0); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.85*(0.25+0.75*v),t+0.004);
  src.connect(g).connect(V.amp); src.start(t);
  if(s.percussive){ V.oneShot=true; V.stopAt(t+s.buffer.duration+0.05); }
  else { V.rel=s.release||0.2; if(!s.loop) V.stopAt(t+s.buffer.duration/rate+0.05); }
  return V;
}
const patchWaves=new WeakMap();
function patchWave(p,c){ let m=patchWaves.get(p); if(!m){ m=new WeakMap(); patchWaves.set(p,m); } let w=m.get(c); if(!w){ const n=p.harmonics.length+1, re=new Float32Array(n), im=new Float32Array(n); p.harmonics.forEach((h,i)=>im[i+1]=h); w=c.createPeriodicWave(re,im); m.set(c,w); } return w; }
function playResynth(p,c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n);
  if(p.drum){
    V.oneShot=true; const sc=Math.pow(2,(n-60)/12);
    if(p.toneLevel>0.02){ const o=V.src(osc(c,'sine',p.toneFreq*sc)); o.frequency.setValueAtTime(p.toneFreq*sc*p.pitchDrop,t); o.frequency.exponentialRampToValueAtTime(p.toneFreq*sc,t+0.06); const g=env(c,t,0.8*v*p.toneLevel,0.002,p.decay/3); o.connect(g).connect(V.amp); o.start(t); }
    const nz=V.src(noise(c)), g2=env(c,t,0.9*v*(1-p.toneLevel),0.001,p.decay/4); nz.connect(filt(c,'bandpass',clamp(p.noiseCenter*sc,100,16000),p.noiseQ)).connect(g2).connect(V.amp); nz.start(t,Math.random());
    V.stopAt(t+p.decay*1.8+0.1); return V;
  }
  const w=patchWave(p,c), lp=filt(c,'lowpass',p.cutoff,p.q), dets=p.unison?[-p.unison,p.unison]:[0];
  dets.forEach(d=>{ const o=V.src(c.createOscillator()); o.setPeriodicWave(w); o.frequency.value=f; o.detune.value=d; o.connect(lp); o.start(t); });
  if(p.noise>0){ const nz=V.src(noise(c)), ng=gainN(c,p.noise*0.3); nz.connect(filt(c,'bandpass',clamp(f*4,200,12000),0.8)).connect(ng).connect(lp); nz.start(t,Math.random()); }
  const eg=gainN(c,0); adsr(eg.gain,t,p.a,p.d,p.s,0.22*(0.35+0.65*v)/Math.sqrt(dets.length)); lp.connect(eg).connect(V.amp); V.rel=p.r; return V;
}

