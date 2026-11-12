
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
  ,
  /* melodic house: round deep kick, soft roomy clap, crisp short hats, shaker, wooden rim and congas */
  melodic:{kick:(V,c,t,v)=>kickVoice(V,c,t,v,{f0:49,sweep:2.7,pitchT:0.045,level:1,hold:0.03,decay:0.55,drive:1.7,click:0.1}),
        snare:(V,c,t,v)=>snare909(V,c,t,v*0.7,195),
        clap:(V,c,t,v)=>{ DRUMS.clap(V,c,t,v*0.9); const nz=V.src(noise(c)), g=env(c,t+0.012,0.12*v,0.004,0.18); nz.connect(filt(c,'bandpass',1500,0.8)).connect(g).connect(V.amp); nz.start(t,Math.random()); return 0.9; },
        hatC:(V,c,t,v)=>hat909(V,c,t,v*0.8,0.012,0.18), hatO:(V,c,t,v)=>hat909(V,c,t,v*0.8,0.11,0.8),
        hatP:(V,c,t,v)=>shaker(V,c,t,v)},
  /* deep/melodic techno: heavier kick with a low rumble, dry hats, driving ride */
  techno:{kick:(V,c,t,v)=>{ const d=kickVoice(V,c,t,v,{f0:47,sweep:3.4,pitchT:0.04,level:1,hold:0.03,decay:0.6,drive:3.2,click:0.2});
          const r=V.src(osc(c,'sine',47)), g=gainN(c,0); g.gain.setValueAtTime(0,t+0.08); g.gain.linearRampToValueAtTime(0.18*v,t+0.14); g.gain.setTargetAtTime(0,t+0.2,0.12); r.connect(filt(c,'lowpass',120)).connect(g).connect(V.amp); r.start(t); return d+0.3; },
        snare:(V,c,t,v)=>snare909(V,c,t,v*0.8,175),
        hatC:(V,c,t,v)=>hat909(V,c,t,v*0.85,0.014,0.2), hatP:(V,c,t,v)=>shaker(V,c,t,v), hatO:(V,c,t,v)=>hat909(V,c,t,v*0.85,0.13,0.9)}
};
function shaker(V,c,t,v){ const nz=V.src(noise(c)), g=gainN(c,0); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.28*v,t+0.012); g.gain.setTargetAtTime(0,t+0.014,0.022);
  nz.connect(filt(c,'bandpass',6500,1.1)).connect(filt(c,'highpass',3500)).connect(g).connect(V.amp); nz.start(t,Math.random()); return 0.2; }
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

/* melodic house / techno synths */
function playRollBass(c,dest,n,v,t){ /* analog-style sequenced bass: saw + square through a snappy filter, sub underneath */
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',200,4.5), base=90+f*1.4, pk=base+400+2200*v;
  lp.frequency.setValueAtTime(pk,t); lp.frequency.setTargetAtTime(base+60,t,0.07);
  const o=V.src(osc(c,'sawtooth',f)), q=V.src(osc(c,'square',f,-6)), qg=gainN(c,0.35); o.connect(lp); q.connect(qg).connect(lp);
  const sub=V.src(osc(c,'sine',f)), sg=gainN(c,0.55); const sh=c.createWaveShaper(); sh.curve=satCurve(1.6);
  const eg=gainN(c,0); adsr(eg.gain,t,0.003,0.18,0.45,0.12); lp.connect(sh).connect(eg); sub.connect(sg).connect(eg); eg.connect(V.amp);
  o.start(t); q.start(t); sub.start(t); V.rel=0.06; return V; }
function playMHPluck(c,dest,n,v,t){ /* bright detuned pluck that opens and closes fast */
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',300,3), pk=Math.min(15000,900+f*3+4500*v);
  lp.frequency.setValueAtTime(pk,t); lp.frequency.setTargetAtTime(350+f*0.8,t+0.005,0.09);
  [-9,0,9].forEach(d=>{ const o=V.src(osc(c,'sawtooth',f,d)), g=gainN(c,0.32); o.connect(g).connect(lp); o.start(t); });
  const eg=gainN(c,0); adsr(eg.gain,t,0.002,0.35,0.12,0.35); lp.connect(eg).connect(V.amp); V.rel=0.35; return V; }
function playDarkPad(c,dest,n,v,t){ /* deep, slowly breathing pad for melodic techno and house */
  const V=new Voice(c,dest), f=mtof(n), lp=filt(c,'lowpass',500+300*v,2.2), hp=filt(c,'highpass',120,0.5);
  [-12,-4,5,13].forEach(d=>{ const o=V.src(osc(c,'sawtooth',f,d)), g=gainN(c,0.22); o.connect(g).connect(lp); o.start(t+Math.random()*0.01); });
  const lfo=V.src(osc(c,'sine',0.11+Math.random()*0.05)), lg=gainN(c,420); lfo.connect(lg).connect(lp.frequency); lfo.start(t);
  lp.frequency.setValueAtTime(200,t); lp.frequency.linearRampToValueAtTime(700+400*v,t+1.4);
  const eg=gainN(c,0); adsr(eg.gain,t,1.1,1.5,0.85,0.1); lp.connect(hp).connect(eg).connect(V.amp); V.rel=2.2; return V; }
