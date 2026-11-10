
/* ---------- synthesized kits and basses built for a solid low end ----------
   Every low sound gets a pure sub plus soft saturation, so it is felt on big speakers
   and its harmonics are still heard on laptop speakers. */
const SAT=new Map();
function satCurve(k){ k=Math.round(k*10)/10; if(!SAT.has(k)) SAT.set(k,curveTanh(k)); return SAT.get(k); }
function kickVoice(V,c,t,v,o){
  const os=V.src(osc(c,'sine',o.f0)); os.frequency.setValueAtTime(o.f0*o.sweep,t); os.frequency.exponentialRampToValueAtTime(o.f0,t+o.pitchT);
  const g=gainN(c,0); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v*o.level,t+0.002); g.gain.setTargetAtTime(0,t+o.hold,o.decay/3);
  const sh=c.createWaveShaper(); sh.curve=satCurve(o.drive);
  os.connect(g).connect(sh).connect(V.amp); os.start(t);
  if(o.click){ const nz=V.src(noise(c)), ng=env(c,t,o.click*v,0.0005,0.004); nz.connect(filt(c,'highpass',2500)).connect(ng).connect(V.amp); nz.start(t,Math.random());
    const ck=V.src(osc(c,'sine',1200)), cg=env(c,t,o.click*0.6*v,0.0003,0.003); ck.connect(cg).connect(V.amp); ck.start(t); }
  return o.hold+o.decay*1.6+0.1;
}
function snare909(V,c,t,v,tone){ const nz=V.src(noise(c)), g=env(c,t,0.6*v,0.001,0.09); nz.connect(filt(c,'highpass',1200)).connect(filt(c,'peaking',4500,1)).connect(g).connect(V.amp); nz.start(t,Math.random());
  [tone||180,(tone||180)*1.85].forEach((f,i)=>{ const o=V.src(osc(c,'triangle',f)); o.frequency.setValueAtTime(f*1.3,t); o.frequency.exponentialRampToValueAtTime(f,t+0.03); const gg=env(c,t,(i?0.25:0.45)*v,0.001,0.05); o.connect(gg).connect(V.amp); o.start(t); }); return 0.7; }
function hat909(V,c,t,v,tau,dur){ const nz=V.src(noise(c)), g=env(c,t,0.35*v,0.001,tau); nz.connect(filt(c,'highpass',8000,0.7)).connect(filt(c,'peaking',11000,1.5)).connect(g).connect(V.amp); nz.start(t,Math.random());
  const m=metal(V,c,t,48), mg=env(c,t,0.25*v,0.001,tau*0.8); m.connect(filt(c,'highpass',7500)).connect(mg).connect(V.amp); return dur; }
const SYN_KITS={
  k808:{kick:(V,c,t,v)=>kickVoice(V,c,t,v,{f0:46,sweep:2.6,pitchT:0.05,level:1,hold:0.05,decay:1.1,drive:2.2,click:0.18}),
        snare:(V,c,t,v)=>snare909(V,c,t,v,200),
        hatC:(V,c,t,v)=>hat909(V,c,t,v,0.025,0.25), hatP:(V,c,t,v)=>hat909(V,c,t,v*0.7,0.03,0.3), hatO:(V,c,t,v)=>hat909(V,c,t,v,0.22,1.4)},
  k909:{kick:(V,c,t,v)=>kickVoice(V,c,t,v,{f0:52,sweep:3.2,pitchT:0.035,level:1,hold:0.02,decay:0.5,drive:3,click:0.35}),
        snare:(V,c,t,v)=>snare909(V,c,t,v,185),
        hatC:(V,c,t,v)=>hat909(V,c,t,v,0.02,0.22), hatP:(V,c,t,v)=>hat909(V,c,t,v*0.7,0.03,0.3), hatO:(V,c,t,v)=>hat909(V,c,t,v,0.16,1.1)},
  trap:{kick:(V,c,t,v)=>kickVoice(V,c,t,v,{f0:42,sweep:3,pitchT:0.06,level:1,hold:0.1,decay:1.6,drive:2.6,click:0.12}),
        snare:(V,c,t,v)=>{ DRUMS.clap(V,c,t,v); return snare909(V,c,t,v*0.8,220); },
        hatC:(V,c,t,v)=>hat909(V,c,t,v,0.015,0.2), hatP:(V,c,t,v)=>hat909(V,c,t,v*0.7,0.02,0.25), hatO:(V,c,t,v)=>hat909(V,c,t,v,0.12,0.9)}
};
function playSynKit(kitId,c,dest,n,v,t){
  const V=new Voice(c,dest); V.oneShot=true; const piece=drumPiece(n), K=SYN_KITS[kitId], fn=(K&&K[piece])||DRUMS[piece];
  V.piece=piece; V.stopAt(t+fn(V,c,t,v)); return V;
}
/* basses */
function play808(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), o=V.src(osc(c,'sine',f));
  o.frequency.setValueAtTime(f*1.25,t); o.frequency.exponentialRampToValueAtTime(f,t+0.05);
  const g=gainN(c,0); adsr(g.gain,t,0.003,1.6,0.55,0.6*(0.5+0.5*v)); const sh=c.createWaveShaper(); sh.curve=satCurve(2.6);
  const lp=filt(c,'lowpass',2600,0.5); o.connect(g).connect(sh).connect(lp).connect(V.amp); o.start(t); V.rel=0.22; return V;
}
function playMoog(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), l1=filt(c,'lowpass',200,2.2), l2=filt(c,'lowpass',200,0.8), base=110+f*1.6, pk=base+300+2400*v;
  [l1.frequency,l2.frequency].forEach(p=>{ p.setValueAtTime(pk,t); p.setTargetAtTime(base+120,t,0.14); });
  [-5,5].forEach(d=>{ const o=V.src(osc(c,'sawtooth',f,d)); o.connect(l1); o.start(t); });
  const s=V.src(osc(c,'square',f/2)), sg=gainN(c,0.45); s.connect(sg).connect(l1); s.start(t);
  const sub=V.src(osc(c,'sine',f)), subg=gainN(c,0.5); sub.start(t);
  const sh=c.createWaveShaper(); sh.curve=satCurve(1.8); const eg=gainN(c,0); adsr(eg.gain,t,0.004,0.35,0.7,0.2);
  l1.connect(l2).connect(sh).connect(eg); sub.connect(subg).connect(eg); eg.connect(V.amp); V.rel=0.1; return V;
}
function playReese(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',650+500*v,1.2);
  [-18,-6,6,18].forEach(d=>{ const o=V.src(osc(c,'sawtooth',f,d)); o.connect(lp); o.start(t); });
  const sub=V.src(osc(c,'sine',f)), sg=gainN(c,0.9); sub.start(t);
  const sh=c.createWaveShaper(); sh.curve=satCurve(1.6); const eg=gainN(c,0); adsr(eg.gain,t,0.02,0.6,0.85,0.11);
  lp.connect(sh).connect(eg); const se=gainN(c,0); adsr(se.gain,t,0.02,0.6,0.85,0.35); sub.connect(sg).connect(se).connect(V.amp); eg.connect(V.amp); V.rel=0.18; return V;
}
function playPluckBass(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',200,6), sq=V.src(osc(c,'square',f)), sub=V.src(osc(c,'sine',f));
  lp.frequency.setValueAtTime(300+3000*v,t); lp.frequency.setTargetAtTime(160+f,t,0.06);
  sq.connect(lp); const eg=gainN(c,0); adsr(eg.gain,t,0.002,0.25,0.3,0.22); lp.connect(eg); const sg=gainN(c,0); adsr(sg.gain,t,0.002,0.3,0.4,0.35); sub.connect(sg).connect(V.amp);
  eg.connect(V.amp); sq.start(t); sub.start(t); V.rel=0.08; return V;
}
function playSubBass(c,dest,n,v,t){
  const V=new Voice(c,dest), f=mtof(n), o=V.src(osc(c,'sine',f)), h=V.src(osc(c,'sine',f*2)), hg=gainN(c,0.18);
  const sh=c.createWaveShaper(); sh.curve=satCurve(1.6); const eg=gainN(c,0); adsr(eg.gain,t,0.005,0.3,0.9,0.5*(0.6+0.4*v));
  o.connect(sh); h.connect(hg).connect(sh); sh.connect(eg).connect(V.amp); o.start(t); h.start(t); V.rel=0.1; return V;
}
