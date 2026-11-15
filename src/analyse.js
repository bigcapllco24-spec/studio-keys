/* ---------- SE-7b: listening to a song you bring in (tempo, beats, key, chords) ----------
   analyseAudio(buf, {onProgress}) -> Promise of
     {v, dur, bpm, bpmConf, bpmAlt (half or double time when plausible, else null), beats:[s], downbeat:s, key:{tonic,mode,conf,level,alt,cands,why}, djKey,
      chords:[{b,d,root,q,conf,alt}], loop:{start,bars,chords,conf}|null, bassRoots:[{b,d,root}], ms, how}
   b and d are in beats counted from the first downbeat (b 0 = bar 1); root is a pitch class 0-11 (null with q 'none');
   q is 'maj' | 'min' | '7' | 'm7' | 'maj7' | 'sus4' | '5' (root and fifth, no third) | 'none'.
   How it listens (all plain JS, our own makeFFT, nothing downloaded):
   - mono at 22,050 Hz (OfflineAudioContext); FFT 8192 / hop 2048 between 40 Hz and 2 kHz (two frames per FFT); spectral peaks with a tuning
     offset (circular mean of the peaks' cents); overtones of a stronger lower peak (3rd, 5th, 6th, 7th) count less;
     130 Hz-2 kHz chroma for harmony (above the kick) and 40-250 Hz bass chroma for roots (the kick's steady pitch taken
     away), log(1+100x) compressed; beats with little steady pitch between 200 Hz and 1 kHz (drum-only bars) are gated out.
   - tempo: autocorrelation of an onset curve (FFT 1024 / hop 512, two frames per FFT), 70-180 BPM with a pull towards
     118-132 (half or double time is offered as bpmAlt), refined by folding the onset curve on the beat; a steady beat
     grid whose phase comes from one bar of kick-band and snare-band onsets matched to a kick on 1 and 3 and a backbeat on
     2 and 4 (four even kicks a bar win on their own); the downbeat is where harmony and bass change most, plus the kick.
   - key: the gated chroma against major/minor profiles shaped for dance music (after the observations in Faraldo, Jordà
     and Herrera, "A Multi-Profile Method for Key Estimation in EDM", AES Semantic Audio 2017, CC BY 4.0: tonic and fifth
     strongest, the major profile nearly empty on flat 2, flat 3, sharp 4 and flat 6, the minor profile flatter; the
     numbers below are ours, fitted on our own renders, not copied from any program), then the bass and the chords decide
     between a key and its relative.
   - chords: chroma averaged per beat, 24 major/minor templates plus "no chord", a bass-root bonus, Viterbi smoothing
     (stay p 0.9 per beat, chords of the key favoured), at least 2 beats per chord, changes on the bar or half bar, then a
     7th / maj7 / sus4 / power-chord check per chord (a near tie between major and minor goes to the key); when the key
     decision lands on a key with other notes, the chords are heard again with it; the main 4- or 8-bar loop.
   Accuracy on 24 of our own renders (tools/ana-harness.mjs, tools/ana-node.mjs): see .claude/work/reports/SE-7b-build.md.
   It runs in a Worker made from a Blob URL (works opened as a local file), else in ~40 ms slices on the main thread. */
const ANA_SR=22050, ANA_VER=1;
function anaJob(x,sr,opt){
  'use strict';
  var md=function(a,n){ return ((a%n)+n)%n; };
  /* tuning knobs (fitted on our renders with tools/ana-node.mjs; opt.p overrides them for testing) */
  var CF={chLo:130,chHi:2000,bsLo:40,bsHi:250,beta:10,lam:3,mv:1,inKey:0.6,nPen:0.18,keyCh:0.2,keyBass:0.3,keyFirst:0.25,keyDia:1,tk1:1,tk2:0.5,tk4:0.5,tk8:0,tc:124,ts:0.8,tb:1.05,snW:1,kickW:0.6,kickGap:0.08,qGap:0.15,hpBeat:0.12,hpClip:0.15,hpBands:4}, ck;
  if(opt&&opt.p) for(ck in opt.p) CF[ck]=opt.p[ck];
  var now=(typeof performance!=='undefined'&&performance.now)?function(){ return performance.now(); }:function(){ return Date.now(); };
  /* ---- pass 1: harmony frames ---- */
  var N=8192, H=2048, df=sr/N, len=x.length, F=Math.max(1,Math.floor(len/H)+1);
  var win=new Float32Array(N), i, k; for(i=0;i<N;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/N);
  var fft=makeFFT(N), re=new Float32Array(N), im=new Float32Array(N), magA=new Float32Array(N/2+1), magB=new Float32Array(N/2+1);
  var k40=Math.floor(40/df), k2k=Math.ceil(2000/df)+1, kb65=Math.floor(65/df);
  var PF=[], PA=[], PO=new Int32Array(F+1), TE=new Float32Array(F), BE=new Float32Array(F), PE=new Float32Array(F);
  /* ---- pass 2: onset curve ---- */
  var N2=1024, H2=512, F2=Math.max(1,Math.floor(len/H2)+1), win2=new Float32Array(N2); for(i=0;i<N2;i++) win2[i]=0.5-0.5*Math.cos(2*Math.PI*i/N2);
  var fft2=makeFFT(N2), re2=new Float32Array(N2), im2=new Float32Array(N2), mA2=new Float32Array(N2/2+1), mB2=new Float32Array(N2/2+1), prevL=new Float32Array(N2/2+1), ON=new Float32Array(F2), ONL=new Float32Array(F2), ONM=new Float32Array(F2);
  var kLow2=Math.max(2,Math.round(150/(sr/N2))), kMid2=Math.round(1200/(sr/N2));
  /* ---- pass 3 (fix 1): harmonic vs percussive (median filtering, after Fitzgerald, "Harmonic/Percussive Separation using
     Median Filtering", DAFx 2010): a cell of the short spectrogram is harmonic when its median over ~390 ms of time beats
     its median over ~370 Hz of frequency. Drums are short or noisy and fall on the percussive side; a tuned tom or cowbell
     that rings is harmonic but sits on the same few pitches all clip long (see finish). 200 Hz-2 kHz only. */
  var HPW=8, hk0=Math.floor(200/(sr/N2)), hk1=Math.ceil(2000/(sr/N2)), hs0=Math.max(1,hk0-HPW), hs1=Math.min(N2/2,hk1+HPW), HNS=hs1-hs0+1, HNK=hk1-hk0+1;
  var HPM=new Float32Array(F2*HNS), HS=new Float32Array(F2*HNK), hpi=0, hpWin=null, hpTot=0, hpHar=0;
  var fi=0, oi=0, done=false, result=null;
  /* two real frames in one complex FFT (frame a in the real part, frame b in the imaginary part), magnitudes of bins k0..k1 */
  function spec2(sa,sb,Nn,w,f,R,I,MA,MB,k0,k1){
    var j, t, u; for(j=0;j<Nn;j++){ t=sa+j; u=sb+j; R[j]=(t>=0&&t<len)?x[t]*w[j]:0; I[j]=(u>=0&&u<len)?x[u]*w[j]:0; }
    f(R,I,false);
    for(var q=k0;q<=k1;q++){ var c=(Nn-q)%Nn, ar=(R[q]+R[c])*0.5, ai=(I[q]-I[c])*0.5, br=(I[q]+I[c])*0.5, bi=(R[c]-R[q])*0.5; MA[q]=Math.sqrt(ar*ar+ai*ai); MB[q]=Math.sqrt(br*br+bi*bi); }
  }
  function framePeaks(i,mag){
    var j, mx=0, be=0; for(k=k40;k<=k2k+1;k++){ if(k>=kb65&&k<=k2k){ be+=mag[k]*mag[k]; } if(mag[k]>mx) mx=mag[k]; }
    BE[i]=be; PO[i]=PF.length;
    if(mx<0.5) return; /* silence (a sine of amplitude 1 peaks at N/4 = 2048) */
    var floor=mx*0.015, pf=[], pa=[];
    for(k=k40+1;k<=k2k;k++){ var b=mag[k]; if(b>floor&&b>mag[k-1]&&b>=mag[k+1]){
      var a=Math.log(mag[k-1]+1e-9), lb=Math.log(b), c=Math.log(mag[k+1]+1e-9), den=a-2*lb+c, p=den<0?0.5*(a-c)/den:0;
      if(p>0.5) p=0.5; if(p<-0.5) p=-0.5; pf.push((k+p)*df); pa.push(Math.exp(lb-0.25*(a-c)*p)); } }
    /* overtones: a peak at 3x, 5x, 6x or 7x a stronger lower peak is mostly that note's colour, not a note of its own */
    var n=pf.length, te=0;
    for(j=0;j<n;j++){ var f=pf[j], w=1;
      for(var h=3;h<=7;h++){ if(h===4) continue; var ft=f/h; if(ft<40) break; var lo=0, hi=j-1;
        while(lo<=hi){ var m=(lo+hi)>>1; if(pf[m]<ft) lo=m+1; else hi=m-1; }
        for(var q=Math.max(0,lo-1);q<=Math.min(j-1,lo);q++){ if(Math.abs(pf[q]/ft-1)<0.025&&pa[q]>=pa[j]*0.8){ w=Math.min(w,0.3); } } }
      pa[j]*=w; PF.push(f); PA.push(pa[j]); if(f>=65) te+=pa[j]*pa[j]; }
    TE[i]=te;
    /* the chord band: drums put little steady pitch between 200 Hz and 1 kHz, chords and pads do */
    var pe=0; for(j=0;j<n;j++){ if(pf[j]>=200&&pf[j]<1000) pe+=pa[j]*pa[j]; } PE[i]=pe;
  }
  function framePair(i){ spec2(i*H-N/2,(i+1)*H-N/2,N,win,fft,re,im,magA,magB,k40,k2k+1); framePeaks(i,magA); if(i+1<F) framePeaks(i+1,magB); }
  function flux(i,M){ var fl=0, ll=0, ml=0, o3=i*HNS-hs0; for(k=hs0;k<=hs1;k++) HPM[o3+k]=M[k]; for(k=1;k<=N2/2;k++){ var L=Math.log(1+M[k]), d=L-prevL[k]; if(d>0){ fl+=d; if(k<=kLow2) ll+=d; else if(k<=kMid2) ml+=d; } prevL[k]=L; } ON[i]=fl; ONL[i]=ll; ONM[i]=ml; }
  function oframePair(i){ spec2(i*H2-N2/2,(i+1)*H2-N2/2,N2,win2,fft2,re2,im2,mA2,mB2,1,N2/2); flux(i,mA2); if(i+1<F2) flux(i+1,mB2); }
  /* a sorted window: take one value out, put one in (both O(window)) */
  function swap(w,n,out,inn){ var a=0; while(a<n&&w[a]!==out) a++; if(a<n){ for(;a<n-1;a++) w[a]=w[a+1]; } var b=n-1; while(b>0&&w[b-1]>inn){ w[b]=w[b-1]; b--; } w[b]=inn; }
  var hpF=new Float32Array(2*HPW+1);
  function hpFrame(i){
    var W=2*HPW+1, q, z, cl=function(f){ return f<0?0:f>=F2?F2-1:f; };
    if(!hpWin){ hpWin=[]; for(k=0;k<HNK;k++){ var w0=new Float32Array(W); for(z=-HPW;z<=HPW;z++) w0[z+HPW]=HPM[cl(z)*HNS+hk0+k-hs0]; w0.sort(); hpWin.push(w0); } }
    else for(k=0;k<HNK;k++) swap(hpWin[k],W,HPM[cl(i-1-HPW)*HNS+hk0+k-hs0],HPM[cl(i+HPW)*HNS+hk0+k-hs0]);
    var row=i*HNS-hs0; for(z=0;z<W;z++) hpF[z]=HPM[row+hk0-HPW+z]; hpF.sort();
    for(k=hk0;k<=hk1;k++){ if(k>hk0) swap(hpF,W,HPM[row+k-1-HPW],HPM[row+k+HPW]);
      var m=HPM[row+k], e=m*m; hpTot+=e; if(hpWin[k-hk0][HPW]>hpF[HPW]){ HS[i*HNK+k-hk0]=e; hpHar+=e; } }
  }
  function step(budget){
    var t0=now();
    while(fi<F){ framePair(fi); fi+=2; if((fi&3)===0&&now()-t0>budget) return false; }
    fi=F; PO[F]=PF.length;
    while(oi<F2){ oframePair(oi); oi+=2; if((oi&15)===0&&now()-t0>budget) return false; }
    oi=F2;
    while(hpi<F2){ hpFrame(hpi); hpi++; if((hpi&63)===0&&now()-t0>budget) return false; }
    if(!done){ result=finish(); done=true; }
    return true;
  }
  function progress(){ return Math.min(0.99,(fi/F)*0.6+(oi/F2)*0.3+(hpi/F2)*0.07); }

  function finish(){
    var j, f, b, pc;
    /* ---- tuning: circular mean of the strong peaks' cents ---- */
    var cs=0, sn=0; for(j=0;j<PF.length;j++){ f=PF[j]; if(f<65) continue; var c=1200*Math.log2(f/440), ang=2*Math.PI*md(c,100)/100; cs+=PA[j]*Math.cos(ang); sn+=PA[j]*Math.sin(ang); }
    var tune=Math.atan2(sn,cs)*100/(2*Math.PI); /* cents, -50..50 */
    /* ---- chroma per frame ---- */
    var CH=new Float32Array(F*12), BS=new Float32Array(F*12);
    for(i=0;i<F;i++) for(j=PO[i];j<PO[i+1];j++){ f=PF[j]; var m=69+12*Math.log2(f/440)-tune/100, r=Math.round(m), dist=Math.abs(m-r), w=PA[j]*Math.pow(Math.cos(Math.PI*dist),2); pc=md(r,12);
      if(f>=CF.chLo&&f<=CF.chHi) CH[i*12+pc]+=w; if(f>=CF.bsLo&&f<=CF.bsHi) BS[i*12+pc]+=w; }
    /* tonal gate: frames whose tonal energy is well below the song's busy parts (drum-only bars, silence) */
    var pes=Array.prototype.slice.call(PE).filter(function(v){ return v>0; }).sort(function(a,b){ return a-b; });
    var pe80=pes.length?pes[Math.floor(pes.length*0.8)]:0, gate=new Float32Array(F);
    for(i=0;i<F;i++) gate[i]=(pe80>0&&PE[i]>pe80*0.03)?1:0;
    var mxs=[]; for(i=0;i<F;i++) if(gate[i]){ var mm=0; for(pc=0;pc<12;pc++) mm=Math.max(mm,CH[i*12+pc]); mxs.push(mm); }
    mxs.sort(function(a,b){ return a-b; }); var ref=mxs.length?mxs[Math.floor(mxs.length*0.95)]||1:1;
    var bm=[]; for(i=0;i<F;i++) if(gate[i]){ var m2=0; for(pc=0;pc<12;pc++) m2=Math.max(m2,BS[i*12+pc]); bm.push(m2); }
    bm.sort(function(a,b){ return a-b; }); var bref=bm.length?bm[Math.floor(bm.length*0.95)]||1:1;
    for(i=0;i<F*12;i++){ CH[i]=Math.log(1+100*CH[i]/ref); BS[i]=Math.log(1+100*BS[i]/bref); }

    /* ---- tempo ---- */
    var fps=sr/H2, T=F2, o=new Float32Array(T), A=Math.round(fps*0.5);
    /* both bands scaled to their own average, the kick band counting more; each minus its local average, kept positive */
    var mON=0, mOL=0; for(i=0;i<T;i++){ mON+=ON[i]; mOL+=ONL[i]; } mON=mON/T||1; mOL=mOL/T||1;
    var hp=function(src,sc,out){ var pre=new Float64Array(T+1), q; for(q=0;q<T;q++) pre[q+1]=pre[q]+src[q]/sc; for(q=0;q<T;q++){ var lo=Math.max(0,q-A), hi=Math.min(T,q+A+1), v=src[q]/sc-(pre[hi]-pre[lo])/(hi-lo); out[q]=v>0?v:0; } return out; };
    var oF=hp(ON,mON,new Float32Array(T)), oL=hp(ONL,mOL,new Float32Array(T)); for(i=0;i<T;i++) o[i]=oF[i]+1.5*oL[i];
    var lmin=Math.floor(60*fps/181), lmax=Math.ceil(60*fps/69), Lm=8*lmax+2, ac=new Float64Array(Lm+1);
    for(var l=lmin;l<=Lm;l++){ if(l>4*lmax+2&&!CF.tk8) break; var s2=0; for(i=0;i+l<T;i++) s2+=o[i]*o[i+l]; ac[l]=s2/(T-l); }
    var acAt=function(L){ var a=Math.floor(L), fr=L-a; if(a+1>Lm) return 0; return ac[a]*(1-fr)+ac[a+1]*fr; };
    var best=null, cand=[];
    for(var bpm=70;bpm<=180;bpm+=0.25){ var L0=60*fps/bpm, sc=acAt(L0)*CF.tk1+acAt(2*L0)*CF.tk2+acAt(4*L0)*CF.tk4+acAt(8*L0)*CF.tk8,
      lg=Math.log2(bpm/CF.tc), prior=Math.exp(-0.5*lg*lg/(CF.ts*CF.ts))*(bpm>=118&&bpm<=132?CF.tb:1), s3=sc*prior; cand.push([bpm,s3,sc]); if(!best||s3>best[1]) best=[bpm,s3,sc]; }
    /* refine by folding the onset curve on the beat: the sharpest fold wins */
    var BINS=48, fold=new Float64Array(BINS), foldScore=function(P,keep){ var q; for(q=0;q<BINS;q++) fold[q]=0; for(i=0;i<T;i++){ if(!o[i]) continue; var ph=(i%P)/P*BINS, a0=Math.floor(ph)%BINS, fr=ph-Math.floor(ph); fold[a0]+=o[i]*(1-fr); fold[(a0+1)%BINS]+=o[i]*fr; }
      var mxv=0, at=0, tot=0; for(q=0;q<BINS;q++){ var sm=fold[q]*0.5+fold[(q+1)%BINS]*0.25+fold[(q+BINS-1)%BINS]*0.25; tot+=fold[q]; if(sm>mxv){ mxv=sm; at=q; } } return keep?{s:mxv/(tot/BINS+1e-9),at:at}:mxv/(tot/BINS+1e-9); };
    var bb=best[0], bestF=null;
    for(var bt=bb-1.2;bt<=bb+1.2;bt+=0.02){ var sF=foldScore(60*fps/bt); if(!bestF||sF>bestF[1]) bestF=[bt,sF]; }
    var hasBeat=best[2]>0&&len/sr>=6; /* silence, or under 6 s: no tempo */
    var BPM=bestF[0]; if(Math.abs(BPM-Math.round(BPM))<0.11) BPM=Math.round(BPM); else BPM=Math.round(BPM*10)/10;
    /* confidence: how far ahead of the best tempo that is not a simple multiple */
    var rival=0; cand.forEach(function(cn){ var r2=cn[0]/best[0]; if(Math.abs(r2-1)<0.04||Math.abs(r2-2)<0.06||Math.abs(r2-0.5)<0.03||Math.abs(r2-1.5)<0.05||Math.abs(r2-2/3)<0.03) return; if(cn[1]>rival) rival=cn[1]; });
    var bpmConf=hasBeat?Math.max(0,Math.min(1,1-rival/best[1])):0;
    /* half or double time is the classic doubt (drum & bass at 87 or 174, trap at 70 or 140): name it when it is plausible */
    var rawAt=function(b){ var m=0; cand.forEach(function(cn){ if(Math.abs(cn[0]-b)<=1) m=Math.max(m,cn[2]); }); return m; };
    var bpmAlt=null; if(BPM<100&&BPM*2<=190&&rawAt(BPM*2)>=best[2]*0.4) bpmAlt=Math.round(BPM*20)/10; else if(BPM>=135&&rawAt(BPM/2)>=best[2]*0.4) bpmAlt=Math.round(BPM*5)/10;
    var P=60*fps/BPM, fr2=foldScore(P,true);
    /* the beat's phase: the kick band when it clearly pulses on one point of the beat (hats and offbeat basslines pull the
       full band onto the offbeat), else both bands */
    var foldOf=function(src){ var fl2=new Float64Array(BINS), q; for(i=0;i<T;i++){ var ph=(i%P)/P*BINS, a0=Math.floor(ph)%BINS, f0=ph-Math.floor(ph); fl2[a0]+=src[i]*(1-f0); fl2[(a0+1)%BINS]+=src[i]*f0; }
      var mx=0, at=0, tot=0; for(q=0;q<BINS;q++){ var sm=fl2[q]*0.5+fl2[(q+1)%BINS]*0.25+fl2[(q+BINS-1)%BINS]*0.25; tot+=fl2[q]; if(sm>mx){ mx=sm; at=q; } } return {at:at,peak:mx/(tot/BINS+1e-9)}; };
    /* the beat's phase and the bar: one bar of onsets (kick band and snare band, each on a 16th grid) matched against
       the backbone almost every style shares: a kick on 1 (then 3, then the other beats) and a snare or clap on 2 and 4.
       The strongest single hit can be a syncopated kick (hip-hop's "a" of 2), and hats pull the full band onto the
       offbeat, so neither alone is trusted. */
    var BB4=BINS*4, P4=4*P, mOM=0; for(i=0;i<T;i++) mOM+=ONM[i]; mOM=mOM/T||1; var oM=hp(ONM,mOM,new Float32Array(T));
    var barFold=function(src){ var fl2=new Float64Array(BB4), tot=0, q; for(i=0;i<T;i++){ if(!src[i]) continue; var ph4=(i%P4)/P4*BB4, a4=Math.floor(ph4)%BB4, f4=ph4-Math.floor(ph4); fl2[a4]+=src[i]*(1-f4); fl2[(a4+1)%BB4]+=src[i]*f4; tot+=src[i]; }
      /* each point takes the strongest onset within about 30 ms after it (flux peaks a little late; snares are often laid back) */
      var wb=Math.max(1,Math.round(0.03/(4*60/BPM/BB4))), sm=new Float64Array(BB4); for(q=0;q<BB4;q++){ var m6=0; for(var w6=-1;w6<=wb;w6++) m6=Math.max(m6,fl2[md(q+w6,BB4)]); sm[q]=m6/(tot/BB4+1e-9); } return sm; };
    var bL=barFold(oL), bM=barFold(oM), Q16=BINS/4;
    var TLk=[1,0.05,0.15,0.05, 0.4,0.05,0.15,0.05, 0.6,0.05,0.15,0.05, 0.4,0.05,0.15,0.05], TMk=[0.25,0.1,0.15,0.1, 1,0.1,0.15,0.1, 0.25,0.1,0.15,0.1, 1,0.1,0.15,0.1];
    var tScore=function(c){ var s7=0; for(var m=0;m<16;m++){ var at7=md(c+m*Q16,BB4); s7+=TLk[m]*bL[at7]+CF.snW*TMk[m]*bM[at7]; } return s7; };
    var tBest=-1, tAt=0, tS=new Float64Array(BB4); for(var c8=0;c8<BB4;c8++){ tS[c8]=tScore(c8); if(tS[c8]>tBest){ tBest=tS[c8]; tAt=c8; } }
    var phBin=tAt%BINS;
    /* four on the floor (house, techno): four even kicks a bar, clearly above the offbeat, mark the beat by themselves,
       however busy the offbeat stabs, bass and hats are */
    var fL0=foldOf(oL), k4=[0,1,2,3].map(function(z){ return bL[md(fL0.at+z*BINS,BB4)]; }), off4=[0,1,2,3].map(function(z){ return bL[md(fL0.at+z*BINS+2*Q16,BB4)]; });
    var four=Math.min.apply(null,k4)/(Math.max.apply(null,k4)||1)>0.6&&Math.min.apply(null,k4)>1.3*Math.max.apply(null,off4);
    if(four) phBin=fL0.at;
    var phase=phBin/BINS*P; /* frames */
    /* how well each of the four beats at this phase works as beat 1 (the bar fold starts at frame 0) */
    var kickAt=[0,0,0,0]; for(var z9=0;z9<4;z9++) kickAt[z9]=tS[md(phBin+z9*BINS,BB4)];
    var kMax=Math.max.apply(null,kickAt)||1; kickAt=kickAt.map(function(v){ return v/kMax; });
    var fLow=foldOf(oL), fAll=foldOf(o), bAt=tAt, barPeak=tBest/16;
    var dbg={four:four,ph:phBin,low:fLow.at,all:fAll.at,bar:bAt,barPeak:Math.round(barPeak*10)/10,kick:kickAt.map(function(v){ return Math.round(v*100)/100; })};
    /* onset curve frame i is centred at i*H2/sr; beats every P frames from the phase */
    var spb=60/BPM, t0b=phase*H2/sr; while(t0b-spb>=-0.02) t0b-=spb; if(t0b<0) t0b+=spb;
    var beats=[]; for(var tb=t0b;tb<len/sr-0.05;tb+=spb) beats.push(tb);
    var NB=beats.length;
    /* ---- beat-synchronous chroma ---- */
    var fc=function(i){ return i*H/sr; }, BC=new Float32Array(NB*12), BB=new Float32Array(NB*12), BL=new Float32Array(NB), BO=new Float32Array(NB);
    for(var q=0;q<NB;q++){ var ta=beats[q], tz=ta+spb, n0=0, nall=0; for(i=Math.max(0,Math.floor(ta*sr/H));i<F&&fc(i)<tz;i++){ if(fc(i)<ta) continue; nall++; if(!gate[i]) continue; n0++; for(pc=0;pc<12;pc++){ BC[q*12+pc]+=CH[i*12+pc]; BB[q*12+pc]+=BS[i*12+pc]; } }
      if(n0){ for(pc=0;pc<12;pc++){ BC[q*12+pc]/=n0; BB[q*12+pc]/=n0; } } var pv=[]; for(i=Math.max(0,Math.floor(ta*sr/H));i<F&&fc(i)<tz;i++){ if(fc(i)>=ta) pv.push(PE[i]); } pv.sort(function(a,b){ return a-b; }); BL[q]=pv.length?pv[pv.length>>1]:0;
      var oc=Math.round(ta*sr/H2), om=0; for(i=Math.max(0,oc-3);i<=Math.min(T-1,oc+3);i++) om=Math.max(om,ONL[i]); BO[q]=om; }
    var bls=Array.prototype.slice.call(BL).sort(function(a,b){ return a-b; }), bl80=bls.length?bls[Math.floor(bls.length*0.8)]||1:1; for(q=0;q<NB;q++) BL[q]=Math.min(1,BL[q]/bl80/0.25); /* 1 = a normal tonal beat; under 0.3 = drums only */
    /* ---- fix 1: drums only, from the harmonic spectrogram ----
       Per beat, the harmonic energy of each 21.5 Hz band. A band that rings in nearly every beat (>= 85% of beats above a fifth
       of its own loud level) is a drum's fixed pitch (cowbell, tom, an 808's overtones) or a drone: it is left out. A beat
       whose remaining harmonic energy, averaged over it and the two beats before it or the two after it (the quieter of the two), is under 12% of the clip's busy beats is
       drums only. The clip as a whole needs harmonic energy (>= 15% of 200 Hz-2 kHz) spread over several pitches (80% of it
       in >= 4 bands); a drum loop has 2-8% (or one 808 pitch) and gets no key. Fitted on 6 drum loops and 16 of our songs. */
    var hpB=new Float64Array(NB*HNK), hpSpec=new Float64Array(HNK), fpo=sr/H2;
    for(q=0;q<NB;q++){ var i0=Math.max(0,Math.ceil(beats[q]*fpo)), i1=Math.min(F2,Math.ceil((beats[q]+spb)*fpo)); for(i=i0;i<i1;i++) for(k=0;k<HNK;k++){ var hv=HS[i*HNK+k]; if(hv){ hpB[q*HNK+k]+=hv; hpSpec[k]+=hv; } } }
    var hpStatic=new Uint8Array(HNK), nStatic=0;
    for(k=0;k<HNK;k++){ var col=[]; for(q=0;q<NB;q++) col.push(hpB[q*HNK+k]); col.sort(function(a,b){ return a-b; }); var p90=col.length?col[Math.floor(col.length*0.9)]:0;
      if(p90>0){ var on=0; for(q=0;q<NB;q++) if(hpB[q*HNK+k]>0.2*p90) on++; if(on>=0.85*NB){ hpStatic[k]=1; nStatic++; } } }
    var hpMv=new Float64Array(NB); for(q=0;q<NB;q++){ var a3=0; for(k=0;k<HNK;k++) if(!hpStatic[k]) a3+=hpB[q*HNK+k]; hpMv[q]=a3; }
    var hps=Array.prototype.slice.call(hpMv).sort(function(a,b){ return a-b; }), hp80=hps.length?hps[Math.floor(hps.length*0.8)]:0, drumBeats=0;
    var hpAvg=function(a5,z5){ var t5=0, n5=0; for(var q5=Math.max(0,a5);q5<=Math.min(NB-1,z5);q5++){ t5+=hpMv[q5]; n5++; } return n5?t5/n5:0; };
    if(hp80>0) for(q=0;q<NB;q++){ if(Math.min(hpAvg(q-2,q),hpAvg(q,q+2))<CF.hpBeat*hp80&&BL[q]>=0.3){ BL[q]=0.29; drumBeats++; } }
    var hpOrd=[], hpSum=0; for(k=0;k<HNK;k++){ hpOrd.push(hpSpec[k]); hpSum+=hpSpec[k]; } hpOrd.sort(function(a,b){ return b-a; });
    var hpN80=0, hpAcc=0; while(hpN80<HNK&&hpAcc<0.8*hpSum){ hpAcc+=hpOrd[hpN80]; hpN80++; }
    var hpRatio=hpTot>0?hpHar/hpTot:0, pitched=hpRatio>=CF.hpClip&&hpN80>=CF.hpBands;
    /* the kick sits on one pitch all song: take each bass pitch's floor (20th percentile over tonal beats) away */
    var floorB=new Float32Array(12); for(pc=0;pc<12;pc++){ var vals=[]; for(q=0;q<NB;q++) if(BL[q]>0.3) vals.push(BB[q*12+pc]); vals.sort(function(a,b){ return a-b; }); floorB[pc]=vals.length?vals[Math.floor(vals.length*0.2)]:0; }
    for(q=0;q<NB;q++) for(pc=0;pc<12;pc++) BB[q*12+pc]=Math.max(0,BB[q*12+pc]-floorB[pc]);
    /* ---- key from the gated chroma ---- */
    var KC=new Float64Array(12), KB=new Float64Array(12); for(q=0;q<NB;q++) if(BL[q]>0.3) for(pc=0;pc<12;pc++){ KC[pc]+=BC[q*12+pc]; KB[pc]+=BB[q*12+pc]; }
    var PMAJ=[1.00,0.12,0.50,0.14,0.62,0.52,0.10,0.88,0.14,0.46,0.22,0.40], PMIN=[1.00,0.24,0.46,0.66,0.26,0.54,0.10,0.86,0.52,0.24,0.50,0.30];
    var corr=function(h,p,r){ var mh=0, mp=0, z; for(z=0;z<12;z++){ mh+=h[z]; mp+=p[z]; } mh/=12; mp/=12; var a=0, b2=0, c=0; for(z=0;z<12;z++){ var xx=h[(z+r)%12]-mh, yy=p[z]-mp; a+=xx*yy; b2+=xx*xx; c+=yy*yy; } return a/Math.sqrt(b2*c||1); };
    var keys=[]; for(var r=0;r<12;r++){ keys.push({tonic:r,mode:'major',p:corr(KC,PMAJ,r)}); keys.push({tonic:r,mode:'minor',p:corr(KC,PMIN,r)}); }
    keys.sort(function(a,b){ return b.p-a.p; });
    var K1=keys[0], scale=function(k){ var S=k.mode==='major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10]; return S.map(function(v){ return (v+k.tonic)%12; }); };
    /* ---- chords ---- */
    var NS=25, TPL=[]; /* 0..11 major, 12..23 minor, 24 none */
    for(r=0;r<12;r++) TPL.push({root:r,q:'maj',pcs:[r,(r+4)%12,(r+7)%12]}); for(r=0;r<12;r++) TPL.push({root:r,q:'min',pcs:[r,(r+3)%12,(r+7)%12]});
    var inKeyTpl=function(k,s){ var sc2=scale(k); if(s>=24) return true; var t=TPL[s]; return t.pcs.every(function(p2){ return sc2.indexOf(p2)>=0; }); };
    var fitT=function(v,o2,t){ var a=0, all=0, mx2=0, mn2=1e9, z; for(z=0;z<12;z++){ var val=v[o2+z]; all+=val; if(val>mx2) mx2=val; if(val<mn2) mn2=val; }
      var w3=[1,1,0.8], inS=0; for(z=0;z<3;z++) inS+=v[o2+t.pcs[z]]*w3[z]; inS/=2.8; var out=(all-v[o2+t.pcs[0]]-v[o2+t.pcs[1]]-v[o2+t.pcs[2]])/9; return (inS-out)/(mx2-mn2+1e-6); };
    var bassN=function(q2,r2){ var mx3=0, z; for(z=0;z<12;z++) mx3=Math.max(mx3,BB[q2*12+z]); return mx3>0.05?BB[q2*12+r2]/mx3:0; };
    var EM=new Float32Array(NB*NS), BETA=CF.beta, LAM=CF.lam;
    for(q=0;q<NB;q++){ for(var s4=0;s4<24;s4++){ EM[q*NS+s4]=BETA*fitT(BC,q*12,TPL[s4])+LAM*bassN(q,TPL[s4].root); }
      EM[q*NS+24]=BL[q]<0.3?BETA*1.2:BETA*CF.nPen; }
    var viterbi=function(k){ var lp=new Float32Array(NS), nxt=new Float32Array(NS), back=new Int16Array(NB*NS), s5, s6, pr=new Float32Array(NS);
      for(s5=0;s5<NS;s5++) pr[s5]=Math.log(inKeyTpl(k,s5)?1:CF.inKey);
      var stay=Math.log(0.9), mv=Math.log(CF.mv/NS);
      for(s5=0;s5<NS;s5++) lp[s5]=EM[s5]+pr[s5];
      for(q=1;q<NB;q++){ var bestPrev=0; for(s5=1;s5<NS;s5++) if(lp[s5]>lp[bestPrev]) bestPrev=s5;
        for(s6=0;s6<NS;s6++){ var a1=lp[s6]+stay, a2=lp[bestPrev]+mv+pr[s6]; if(a1>=a2){ nxt[s6]=a1+EM[q*NS+s6]; back[q*NS+s6]=s6; } else { nxt[s6]=a2+EM[q*NS+s6]; back[q*NS+s6]=bestPrev; } }
        for(s6=0;s6<NS;s6++) lp[s6]=nxt[s6]; }
      var path=new Int16Array(NB), e=0; for(s5=1;s5<NS;s5++) if(lp[s5]>lp[e]) e=s5; path[NB-1]=e; for(q=NB-1;q>0;q--) path[q-1]=back[q*NS+path[q]]; return path; };
    var harmony=function(KP){
      var path=NB?viterbi(KP):new Int16Array(0);
      /* ---- downbeat: harmony and bass change most on bar starts ---- */
      var nov=new Float32Array(4), cnt=new Float32Array(4);
      for(q=1;q<NB;q++){ var chg=path[q]!==path[q-1]?1:0, dv=0, nb=0, z; for(z=0;z<12;z++){ dv+=Math.abs(BC[q*12+z]-BC[(q-1)*12+z]); nb+=Math.abs(BB[q*12+z]-BB[(q-1)*12+z]); }
        nov[q%4]+=chg*1.5+dv*0.08+nb*0.05; cnt[q%4]++; }
      /* each beat's place in the kick's bar fold */
      var kickVote=[0,0,0,0]; for(q=0;q<Math.min(NB,4);q++){ var fr9=beats[q]*sr/H2, zb=md(Math.round((md(fr9,P4)/P4*BB4-phBin)/BINS),4); kickVote[q%4]=kickAt[zb]; }
      var kv0=kickVote.slice().sort(function(a,b){ return b-a; }), kickClear=kv0[0]-kv0[1]>CF.kickGap;
      for(z=0;z<4;z++){ nov[z]=nov[z]/(cnt[z]||1)+(kickClear?kickVote[z]*CF.kickW:0); cnt[z]=1; }
      var dph=0; for(z=1;z<4;z++) if(nov[z]/(cnt[z]||1)>nov[dph]/(cnt[dph]||1)) dph=z;
      /* ---- segments: at least 2 beats, changes on the half bar ---- */
      var rel=function(q2){ return md(q2-dph,4); };
      var segs=[], st=0; for(q=1;q<=NB;q++){ if(q===NB||path[q]!==path[st]){ segs.push({a:st,z:q,s:path[st]}); st=q; } }
      var snap=function(q2){ var r2=rel(q2); if(r2%2===0) return q2; /* odd beat: move to the half-bar line it is nearer, by evidence */ return q2+(r2===1?-1:1); };
      segs.forEach(function(g){ g.a=g.a===0?0:snap(g.a); });
      for(j=0;j<segs.length;j++) segs[j].z=j+1<segs.length?segs[j+1].a:NB;
      segs=segs.filter(function(g){ return g.z-g.a>=1; });
      /* merge chords shorter than 2 beats into the neighbour that fits them better */
      var segFit=function(a,z,s5){ var t2=0; for(var q3=a;q3<z;q3++) t2+=EM[q3*NS+s5]; return t2; };
      var changed=true; while(changed){ changed=false; for(j=0;j<segs.length;j++){ var g=segs[j]; if(g.z-g.a>=2||segs.length<2) continue;
        var L1=segs[j-1], R1=segs[j+1], useL=L1&&(!R1||segFit(g.a,g.z,L1.s)>=segFit(g.a,g.z,R1.s)); if(useL){ L1.z=g.z; } else { R1.a=g.a; } segs.splice(j,1); changed=true; break; } }
      for(j=segs.length-1;j>0;j--) if(segs[j].s===segs[j-1].s){ segs[j-1].z=segs[j].z; segs.splice(j,1); }
      /* ---- each chord: best template on the whole segment, a second guess, then a 7th or sus4 check ---- */
      var segChroma=function(a,z,arr){ var v=new Float32Array(12), n=0, z2; for(var q3=a;q3<z;q3++){ if(BL[q3]<0.3) continue; n++; for(z2=0;z2<12;z2++) v[z2]+=arr[q3*12+z2]; } if(n) for(z2=0;z2<12;z2++) v[z2]/=n; return {v:v,n:n}; };
      var chordsOut=[];
      segs.forEach(function(g){ var cc=segChroma(g.a,g.z,BC), bc=segChroma(g.a,g.z,BB), sc3=[], s5, z2;
        if(!cc.n||g.s===24){ chordsOut.push({a:g.a,z:g.z,root:null,q:'none',conf:cc.n?0.5:0.9,alt:null}); return; }
        var bmx=0; for(z2=0;z2<12;z2++) bmx=Math.max(bmx,bc.v[z2]);
        for(s5=0;s5<24;s5++) sc3.push({s:s5,v:fitT(cc.v,0,TPL[s5])+0.09*(bmx>0.05?bc.v[TPL[s5].root]/bmx:0)+(inKeyTpl(KP,s5)?0.03:0)});
        sc3.sort(function(a,b){ return b.v-a.v; }); var w0=TPL[g.s], top=sc3[0].s===g.s?sc3[1]:sc3[0], mine=sc3.filter(function(e){ return e.s===g.s; })[0];
        var conf=Math.max(0,Math.min(1,(mine.v-top.v)/0.25+0.5)); if(top.v>mine.v) conf=Math.max(0.1,0.5-(top.v-mine.v)/0.25);
        /* major or minor nearly a tie (power chords, distorted guitars whose overtones add a third): the key decides */
      var sib=w0.q==='maj'?g.s+12:g.s-12, fSib=sc3.filter(function(e){ return e.s===sib; })[0];
      if(fSib&&mine.v-fSib.v<CF.qGap&&!inKeyTpl(KP,g.s)&&inKeyTpl(KP,sib)){ w0=TPL[sib]; var t9=mine; mine=fSib; fSib=t9; if(top.s===sib) top=fSib; }
      var v=cc.v, rt=w0.root, q4=w0.q, mxv=0; for(z2=0;z2<12;z2++) mxv=Math.max(mxv,v[z2]);
        var avgOut=0, nOut=0; for(z2=0;z2<12;z2++){ if(w0.pcs.indexOf(z2)>=0||z2===(rt+10)%12||z2===(rt+11)%12||z2===(rt+5)%12) continue; avgOut+=v[z2]; nOut++; } avgOut/=nOut||1;
        var b7=v[(rt+10)%12], M7=v[(rt+11)%12], third=v[(rt+(q4==='maj'?4:3))%12], fourth=v[(rt+5)%12], rv=v[rt];
        if(q4==='maj'&&M7>rv*0.62&&M7>avgOut*1.8&&M7>b7*1.3) q4='maj7'; else if(b7>rv*0.62&&b7>avgOut*1.8&&b7>M7*1.3) q4=q4==='maj'?'7':'m7';
        else if(third<rv*0.3&&fourth>rv*0.7&&fourth>avgOut*2) q4='sus4';
      /* no third at all, just root and fifth (rock power chords, open fifths): say so rather than guess major or minor */
      var m3=v[(rt+3)%12], M3=v[(rt+4)%12]; if((q4==='maj'||q4==='min')&&Math.max(m3,M3)<Math.max(avgOut*1.25,rv*0.32)&&v[(rt+7)%12]>rv*0.45) q4='5';
        chordsOut.push({a:g.a,z:g.z,root:rt,q:q4,conf:Math.round(conf*100)/100,alt:{root:TPL[top.s].root,q:TPL[top.s].q}}); });
      /* ---- the key, deciding between relatives with the bass and the chords ---- */
      var tonicShare=function(k){ var tot=0, on=0, bt2=0, bon=0; chordsOut.forEach(function(c){ if(c.root==null) return; var d2=c.z-c.a; tot+=d2; if(c.root===k.tonic&&((k.mode==='major')===(c.q==='maj'||c.q==='7'||c.q==='maj7'||c.q==='sus4'))) on+=d2; });
        for(var q3=0;q3<NB;q3++){ if(BL[q3]<0.3) continue; var mx4=0, z3; for(z3=0;z3<12;z3++) mx4=Math.max(mx4,BB[q3*12+z3]); if(mx4<0.05) continue; bt2++; if(BB[q3*12+k.tonic]>=mx4*0.999) bon++; }
        var dia=0; chordsOut.forEach(function(c){ if(c.root==null) return; var t3=TPL[c.root+(c.q==='min'||c.q==='m7'?12:0)]; if(inKeyTpl(k,c.root+(c.q==='min'||c.q==='m7'?12:0))) dia+=c.z-c.a; });
        return {ch:tot?on/tot:0,bass:bt2?bon/bt2:0,dia:tot?dia/tot:0}; };
      var scored=keys.slice(0,10).map(function(k){ var ts=tonicShare(k); return {tonic:k.tonic,mode:k.mode,p:k.p,ch:ts.ch,bass:ts.bass,dia:ts.dia,s:k.p+CF.keyCh*ts.ch+CF.keyBass*ts.bass+CF.keyDia*ts.dia}; });
      /* the main loop's first chord is the strongest hint of home */
      var bars=[], firstBar=null; chordsOut.forEach(function(c){ for(var q3=c.a;q3<c.z;q3++){ if(rel(q3)!==0) continue; var bi=Math.floor((q3-dph)/4); if(q3<dph) continue; bars[bi]=c.root==null?'N':c.root+':'+(c.q==='min'||c.q==='m7'?'min':'maj'); } });
      for(j=0;j<bars.length;j++){ if(bars[j]===undefined) bars[j]='N'; }
      var loop=null, bestL=null; [4,8].forEach(function(LL){ var m3=0, n3=0; for(var bi=0;bi+LL<bars.length;bi++){ if(bars[bi]==='N'&&bars[bi+LL]==='N') continue; n3++; if(bars[bi]===bars[bi+LL]) m3++; } var sc4=n3?m3/n3:0; if(!bestL||sc4>bestL.s+0.08) bestL={L:LL,s:sc4}; });
      if(bestL&&bestL.s>=0.5){ var LL=bestL.L, counts={}, firstTonal=bars.findIndex(function(v2){ return v2!=='N'; });
        for(var bi=Math.max(0,firstTonal);bi+LL<=bars.length;bi++){ var key2=bars.slice(bi,bi+LL).join(' '); if(key2.indexOf('N')>=0) continue; counts[key2]=counts[key2]||{n:0,at:bi}; counts[key2].n++; }
        var bestW=null; Object.keys(counts).forEach(function(w2){ var c=counts[w2], sc5=c.n+(bars[c.at]!==bars[c.at-1]?0.5:0)-c.at*0.0001; if(!bestW||sc5>bestW.sc){ bestW={w:w2,at:c.at,sc:sc5,n:c.n}; } });
        if(bestW){ var lc=[], ws=bestW.w.split(' '); ws.forEach(function(v2,bi2){ var pr2=v2.split(':'), rt2=+pr2[0], q5=pr2[1]; if(lc.length&&lc[lc.length-1].key===v2) lc[lc.length-1].d+=4; else lc.push({key:v2,b:bi2*4,d:4,root:rt2,q:q5}); });
          loop={start:bestW.at,bars:LL,chords:lc.map(function(c){ return {b:c.b,d:c.d,root:c.root,q:c.q}; }),conf:Math.round(bestL.s*100)/100}; firstBar=lc[0]; } }
      scored.forEach(function(k){ if(firstBar&&firstBar.root===k.tonic&&(firstBar.q==='min')===(k.mode==='minor')) k.s+=CF.keyFirst; });
      scored.sort(function(a,b){ return b.s-a.s; });
      return {dph:dph,chordsOut:chordsOut,scored:scored,loop:loop,firstBar:firstBar,nov:nov}; };
    var HM=harmony(K1), sameScale=function(a,b){ return scale(a).slice().sort().join()===scale(b).slice().sort().join(); };
    /* the chords favour the notes of the key; when the bass and chords say the key has other notes, listen again with it */
    if(!sameScale(HM.scored[0],K1)){ var HM2=harmony(HM.scored[0]); if(sameScale(HM2.scored[0],HM.scored[0])) HM=HM2; }
    var dph=HM.dph, chordsOut=HM.chordsOut, scored=HM.scored, loop=HM.loop, firstBar=HM.firstBar, nov=HM.nov;
    /* a key needs about 8 beats of music with pitch in it (a short clip or a drum loop has none) */
    var tonalBeats=0; for(q=0;q<NB;q++) if(BL[q]>=0.3) tonalBeats++; var keyOk=hasBeat&&tonalBeats>=8&&mxs.length>0&&pitched;
    var KB1=scored[0], KB2=scored[1]||scored[0], kconf=KB1.s>0?Math.max(0,Math.min(1,(KB1.s-KB2.s)/KB1.s)):0;
    var level=kconf<0.02?1:kconf<0.06?2:kconf<0.14?3:4; if(!mxs.length) level=0;
    var NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
    var why=function(k){ var nm=NAMES[k.tonic]; if(k.bass>=0.35) return 'the bass sits on '+nm; if(firstBar&&firstBar.root===k.tonic) return 'the loop starts on '+nm+(k.mode==='minor'?' minor':' major'); if(k.ch>=0.25) return 'the chords keep coming back to '+nm; return 'the notes fit '+nm+' '+k.mode; };
    var cands=scored.slice(0,3).map(function(k){ return {tonic:k.tonic,mode:k.mode,why:why(k)}; });
    /* chords in beats from the first downbeat */
    var chords=chordsOut.map(function(c){ var a=c.a-dph, z=c.z-dph; if(z<=0) return null; if(a<0) a=0; return {b:a,d:z-a,root:c.root,q:c.q,conf:c.conf,alt:c.alt}; }).filter(Boolean);
    /* bass roots per bar */
    var bassRoots=[]; for(var bi3=0;dph+bi3*4<NB;bi3++){ var q0=dph+bi3*4, v3=new Float32Array(12), z4; for(q=q0;q<Math.min(NB,q0+4);q++){ if(BL[q]<0.3) continue; for(z4=0;z4<12;z4++) v3[z4]+=BB[q*12+z4]; } var bi4=0, mx5=0; for(z4=0;z4<12;z4++) if(v3[z4]>mx5){ mx5=v3[z4]; bi4=z4; }
      var root=mx5>0.2?bi4:null; if(bassRoots.length&&bassRoots[bassRoots.length-1].root===root) bassRoots[bassRoots.length-1].d+=4; else bassRoots.push({b:bi3*4,d:4,root:root}); }
    return {v:1,dur:Math.round(len/sr*100)/100,bpm:hasBeat?BPM:null,bpmConf:Math.round(bpmConf*100)/100,bpmAlt:hasBeat?bpmAlt:null,tonalBeats:tonalBeats,beats:(hasBeat?beats:[]).map(function(t){ return Math.round(t*1000)/1000; }),
      downbeat:NB&&hasBeat?Math.round(beats[dph]*1000)/1000:0,key:keyOk?{tonic:KB1.tonic,mode:KB1.mode,conf:Math.round(kconf*1000)/1000,level:level,alt:{tonic:KB2.tonic,mode:KB2.mode},cands:cands,why:cands[0].why}:null,
      chords:keyOk?chords:[],loop:keyOk?loop:null,bassRoots:keyOk?bassRoots:[],tuning:Math.round(tune),debug:opt&&opt.debug?{ON:ON,ONL:ONL,H2:H2,TE:TE,BE:BE,gate:gate,BL:BL,H:H,sr:sr,PF:PF,PA:PA,PO:PO,CH:CH}:undefined,how:{tempo:cand.filter(function(c,ix){ return ix>0&&ix<cand.length-1&&c[2]>=cand[ix-1][2]&&c[2]>=cand[ix+1][2]; }).sort(function(a,b){ return b[2]-a[2]; }).slice(0,6).map(function(c){ return c[0]+':'+(c[2]/(best[2]||1)).toFixed(2)+'/'+(c[1]/(best[1]||1)).toFixed(2); }).join(' '),frames:F,tonal:mxs.length,onsetFrames:F2,pitch:{harm:Math.round(hpRatio*1000)/1000,bands:hpN80,fixed:nStatic,drumBeats:drumBeats},fold:dbg,nov:Array.prototype.map.call(nov,function(v){ return Math.round(v*100)/100; }),dph:dph}};
  }
  /* refinish: the last stage again with other knobs (tools/ana-node.mjs sweeps them without redoing the FFTs) */
  return {step:step,progress:progress,result:function(){ return result; },refinish:function(p){ var d0={}, z; for(z in p){ d0[z]=CF[z]; CF[z]=p[z]; } var r0=finish(); for(z in d0) CF[z]=d0[z]; return r0; }};
}
/* mono at 22,050 Hz; the OfflineAudioContext does the mixdown and resampling natively */
async function anaResample(buf,maxSec){
  const dur=Math.min(buf.duration,maxSec||600), n=Math.max(1,Math.ceil(dur*ANA_SR));
  if(buf.sampleRate===ANA_SR&&buf.numberOfChannels===1) return buf.getChannelData(0).slice(0,n);
  const OAC=typeof window!=='undefined'&&(window.OfflineAudioContext||window.webkitOfflineAudioContext);
  if(OAC){ try{ const oc=new OAC(1,n,ANA_SR), src=oc.createBufferSource(); src.buffer=buf; src.connect(oc.destination); src.start(0); const out=await oc.startRendering(); return out.getChannelData(0); }catch(e){ /* fall through */ } }
  /* no OfflineAudioContext: average the channels and take every k-th sample after a box filter */
  const sr=buf.sampleRate, ratio=sr/ANA_SR, chs=[]; for(let c=0;c<buf.numberOfChannels;c++) chs.push(buf.getChannelData(c));
  const out=new Float32Array(n), w=Math.max(1,Math.round(ratio)); for(let i=0;i<n;i++){ const s=Math.floor(i*ratio); let a=0, m=0; for(let j=0;j<w&&s+j<chs[0].length;j++){ for(const ch of chs) a+=ch[s+j]; m++; } out[i]=m?a/(m*chs.length):0; }
  return out;
}
let ANA_WORKER=null;
function anaWorker(){
  if(ANA_WORKER!==null) return ANA_WORKER;
  try{ const src=["'use strict';",makeFFT.toString(),anaJob.toString(),
      'self.onmessage=function(e){var d=e.data;try{var j=anaJob(d.x,d.sr),last=0;while(!j.step(120)){var p=j.progress();if(p-last>0.04){last=p;self.postMessage({p:p});}}self.postMessage({ok:true,res:j.result()});}catch(err){self.postMessage({ok:false,err:String(err&&err.stack||err)});}};'].join('\n');
    ANA_WORKER=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'}))); }catch(e){ ANA_WORKER=false; }
  return ANA_WORKER;
}
/* the same job in ~40 ms slices on the main thread (no Worker, or the Worker failed) */
function anaSlices(x,sr,onProgress){ return new Promise((res,rej)=>{ let j; try{ j=anaJob(x,sr); }catch(e){ rej(e); return; }
  const tick=()=>{ try{ if(j.step(40)){ res(j.result()); return; } if(onProgress) onProgress(j.progress()); setTimeout(tick,0); }catch(e){ rej(e); } }; setTimeout(tick,0); }); }
let ANA_BUSY=Promise.resolve();
function anaRun(x,sr,o={}){
  const w=o.noWorker?false:anaWorker(), prog=o.onProgress||null;
  if(!w) return anaSlices(x,sr,prog);
  /* one song at a time through the shared Worker */
  const run=()=>new Promise((res,rej)=>{
    w.onmessage=e=>{ const d=e.data; if(d.p!=null){ if(prog) prog(d.p); return; } if(d.ok) res(d.res); else rej(new Error(d.err)); };
    w.onerror=ev=>{ if(ev&&ev.preventDefault) ev.preventDefault(); ANA_WORKER=false; anaSlices(x,sr,prog).then(res,rej); };
    const copy=x.slice(); w.postMessage({x:copy,sr},[copy.buffer]); });
  const p=ANA_BUSY.then(run,run); ANA_BUSY=p.catch(()=>{}); return p;
}
/* buf: an AudioBuffer (an imported song, a voice note, or one of the SE-6 stems). opts: {onProgress(0..1), maxSec, noWorker} */
async function analyseAudio(buf,opts={}){
  if(!buf||!buf.length) throw new Error('no audio to listen to');
  const t0=performance.now(), prog=opts.onProgress||null; if(prog) prog(0);
  const x=await anaResample(buf,opts.maxSec), t1=performance.now();
  const res=await anaRun(x,ANA_SR,{onProgress:prog?(p=>prog(0.05+p*0.95)):null,noWorker:opts.noWorker});
  res.djKey=res.key?djKey(res.key):''; res.ms={resample:Math.round(t1-t0),total:Math.round(performance.now()-t0)};
  if(prog) prog(1);
  return res;
}
/* the cache stored on an audio track (t.ana, saved with the song): the result minus the beat list, tagged with the clip it
   came from so a replaced or trimmed recording is listened to again. 7c hooks this into import and the song card. */
function anaStamp(buf){ const d=buf.getChannelData(0), n=d.length; let s=0; for(let i=0;i<64;i++) s+=Math.abs(d[Math.floor((i+0.5)*n/64)]); return {len:Math.round(buf.duration*1000),sum:Math.round(s*1e5)}; }
function anaCache(res,buf){ const o=Object.assign({},res); delete o.beats; delete o.how; o.beat0=res.beats&&res.beats.length?res.beats[0]:0; o.stamp=anaStamp(buf); o.at=Date.now(); return o; }
function anaCached(t,buf){ const a=t&&t.ana; if(!a||a.v!==ANA_VER||!buf) return null; const s=anaStamp(buf); return a.stamp&&a.stamp.len===s.len&&a.stamp.sum===s.sum?a:null; }
/* names for the strip and Keys' replies: "Em", "C", "G7", "Dsus4", "N.C." */
const ANA_Q={maj:'',min:'m','7':'7',m7:'m7',maj7:'maj7',sus4:'sus4',sus2:'sus2',dim:'dim','5':'5'};
function anaChordName(c){ return !c||c.root==null||c.q==='none'?'N.C.':PC_NAMES[c.root]+(ANA_Q[c.q]!=null?ANA_Q[c.q]:''); }

/* ---------- SE-7c: a song's chords on your song ----------
   Analysed beats count from the song's first downbeat; song beats count from bar 1 of your loop. A clip at t.start (beats)
   that skips t.trim seconds of its recording puts analysed beat 0 at song beat anaClipOffset(t, ana). For PROJ.chords the song
   is assumed to be at the analysed tempo ("Use 124 BPM"); anaSongChords uses the real tempo (for the strip over the clip). */
function anaClipOffset(t,ana){ ana=ana||(t&&t.ana); if(!ana||!ana.bpm) return 0; return ((t&&t.start)||0)+((ana.downbeat||0)-((t&&t.trim)||0))*ana.bpm/60; }
/* the analysed chords where they sit under the clip in the song, at the song's tempo now: [{b, d, root, q, conf, alt}] in song
   beats (blocks before the song's start are cut). For the chord strip over an audio track; changes nothing. */
function anaSongChords(t,ana){ ana=ana||(t&&t.ana); if(!ana||!ana.bpm||!ana.chords) return [];
  const k=CTRL.bpm/ana.bpm, o=((t&&t.start)||0)+((ana.downbeat||0)-((t&&t.trim)||0))*CTRL.bpm/60;
  return ana.chords.map(c=>{ let b=o+c.b*k, d=c.d*k; if(b+d<=0) return null; if(b<0){ d+=b; b=0; } return Object.assign({},c,{b:Math.round(b*1000)/1000,d:Math.round(d*1000)/1000}); }).filter(Boolean); }
/* chordsFromAna(ana, {bars, to, at, track, bass, align}) -> PROJ.chords [{b, d, root, q, conf, from:'audio', alt, bass?}]
   at: 'loop' (default when the song has a main loop): the main 4- or 8-bar loop's chords from bar 1; 'clip': the chords as
       they sit under the clip (track) from bar 1 of the song, the offset rounded to a quarter beat.
   bars: how many bars (default: the loop's length for 'loop', the song's loop length for 'clip'); a shorter loop repeats.
   to: 'mine' (default) moves them into your song's key through the relative mode (see fitChordsToKey); 'song' keeps the
       song's own key, and so does 'mine' when your song has no key yet. key: the target key to use instead of yours.
   bass: true adds the song's bass notes (ana.bassRoots) under the chords as slash chords ("C/E"), so the bassline follows
       the song's bass movement; a chord is split at a bar line where the bass moves.
   align: true (with track, at 'loop') starts the loop where the clip is in it, so the chords line up with the clip in Song mode.
   Pure: changes nothing. [] when the analysis has no chords. */
function chordsFromAna(ana,o={}){
  if(!ana||!Array.isArray(ana.chords)||!ana.chords.length) return [];
  const at=o.at==='clip'||!ana.loop?'clip':'loop', t=o.track||null, rnd=x=>Math.round(x*4)/4;
  let win0, len, off;
  if(at==='loop'){ const LL=ana.loop.bars*4; win0=ana.loop.start*4; len=LL; off=0;
    if(o.align&&t&&ana.bpm){ const rot=mod(Math.round(-anaClipOffset(t,ana)/4)-ana.loop.start,ana.loop.bars); win0=(ana.loop.start+rot)*4; } }
  else { off=rnd(anaClipOffset(t,ana)); win0=-off; len=(Math.round(+o.bars)||PROJ.bars)*4; }
  const bars=Math.max(1,Math.round(+o.bars)||Math.round(len/4)), N=bars*4;
  /* one pass over [win0, win0+len) in analysed beats, wrapping inside the loop window so a rotated loop stays whole */
  const piece=(lo,hi,shift)=>ana.chords.filter(c=>c.b<hi-1e-6&&c.b+c.d>lo+1e-6).map(c=>{ const b=Math.max(lo,c.b), e=Math.min(hi,c.b+c.d);
    const x={b:rnd(b+shift),d:rnd(e-b),root:c.root==null?null:c.root,q:c.root==null?'none':(c.q||'maj'),conf:c.conf!=null?c.conf:0.5,from:'audio'}; if(c.alt&&c.alt.root!=null) x.alt={root:c.alt.root,q:c.alt.q}; return x; });
  let one;
  if(at==='loop'){ const l0=ana.loop.start*4, l1=l0+len, r0=win0; one=piece(r0,l1,-r0).concat(r0>l0?piece(l0,r0,l1-r0-l0):[]); }
  else one=piece(win0,win0+len,-win0);
  one=one.filter(c=>c.d>0&&c.b<len).sort((a,b)=>a.b-b.b);
  /* merge neighbours that are the same chord (a wrapped loop can split one) */
  const merged=[]; one.forEach(c=>{ const p=merged[merged.length-1]; if(p&&p.root===c.root&&p.q===c.q&&Math.abs(p.b+p.d-c.b)<1e-6){ p.d+=c.d; p.conf=Math.min(p.conf,c.conf); } else merged.push(c); });
  /* the bass notes, per bar, as slash chords */
  let out=merged;
  if(o.bass&&Array.isArray(ana.bassRoots)&&ana.bassRoots.length){ const bassAt=ab=>{ const r=ana.bassRoots.find(x=>x.b<=ab+1e-6&&ab<x.b+x.d-1e-6); return r?r.root:null; };
    const toAna=sb=>at==='loop'?(()=>{ const l0=ana.loop.start*4, r=sb+(win0-l0); return l0+mod(r,len); })():sb+win0;
    out=[]; merged.forEach(c=>{ let x=c.b; const e=c.b+c.d; while(x<e-1e-6){ const nx=Math.min(e,(Math.floor(x/4+1e-6)+1)*4), bn=c.root==null?null:bassAt(Math.floor(toAna(x)/4+1e-6)*4);
        const pc=Object.assign({},c,{b:x,d:nx-x}); delete pc.bass; if(bn!=null&&bn!==c.root) pc.bass=bn;
        const p=out[out.length-1]; if(p&&p.root===pc.root&&p.q===pc.q&&p.bass===pc.bass&&Math.abs(p.b+p.d-pc.b)<1e-6) p.d+=pc.d; else out.push(pc); x=nx; } }); }
  /* to the bars asked for: cut, or repeat a shorter loop */
  const res=[]; for(let k=0;k*len<N;k++) out.forEach(c=>{ const b=c.b+k*len; if(b>=N-1e-6) return; const x=Object.assign({},c,{b}); if(b+x.d>N) x.d=N-b; res.push(x); });
  const ks=typeof keyStatus==='function'?keyStatus():{key:null}, mine=o.key||ks.key, from=ana.key?{tonic:ana.key.tonic,mode:ana.key.mode}:null;
  return o.to!=='song'&&mine&&from?fitChordsToKey(res,from,mine):res;
}
/* addSongChords(track, {bars, to, at, bass, align, inst, seed, grow}) puts a song's chords on your song:
   PROJ.chords from the clip's analysis (chordsFromAna), then a new "Chords" track: our own voicing and rhythm on the style's
   chord sound (inst overrides it), never the song's audio. The bass, chords and melody Keys made follow the new chords with
   their own seeds. bass: true also makes the bassline follow the song's bass notes (a new "Bassline" if there is none).
   to 'song' (or a song with no key yet) sets your key to the song's ('from the song') unless you set one yourself.
   grow (default true): a loop shorter than the chords grows to fit (4 -> 8 bars). One undo step.
   track: the audio track (object or id); default the newest audio track with an analysis. Returns
   {chords, track, bass, key, songKey, shift, to, bars, moved:[names], text} or null when there are no chords to use. */
function addSongChords(t,o={}){
  if(typeof t==='string') t=PROJ.tracks.find(x=>x.id===t); if(!t) t=[...PROJ.tracks].reverse().find(x=>x.kind==='audio'&&x.ana&&x.ana.chords&&x.ana.chords.length);
  const ana=o.ana||(t&&t.ana); if(!ana||!ana.chords||!ana.chords.length) return null;
  const st=keyStatus(), songKey=ana.key?{tonic:ana.key.tonic,mode:ana.key.mode}:null, to=o.to==='song'||!st.key?'song':'mine';
  const chords=chordsFromAna(ana,Object.assign({},o,{to,track:t})); if(!chords.some(c=>c.root!=null)) return null;
  const shift=to==='mine'?keyShift(songKey,st.key):0, setOwn=PROJ.key&&PROJ.key.tonic!=null&&PROJ.key.from==='you';
  if(to==='song'&&songKey&&!setOwn&&!sameKey(st.key,songKey)) setKey(songKey,'song',{move:false});
  const nb=chordSpanBars(chords); if(o.grow!==false&&nb>PROJ.bars&&nb<=16) setBars(nb);
  PROJ.chords=chords; const moved=followChords();
  const s=PROJ.style||'house', S=STYLES[s]||STYLES.house, L=PROJ.bars*4, seed=+o.seed||newSeed(), inst=o.inst||S.chords, ld=id=>{ try{ if(typeof loadI==='function') loadI(id); }catch(e){} };
  const uniq=n=>{ if(!PROJ.tracks.some(x=>x.name===n)) return n; let k=2; while(PROJ.tracks.some(x=>x.name===n+' '+k)) k++; return n+' '+k; };
  ld(inst); const ct=makeTrack({role:'chords',inst,gen:true,name:uniq('Chords'),events:genChords(s,L,seed,heldChordStyle(inst,s)),seed,style:s,fromSong:t?t.id:undefined}); PROJ.tracks.push(ct);
  let bt=null; if(o.bass&&!PROJ.tracks.some(x=>x.gen&&x.kind==='notes'&&x.role==='bass')){ const bi=S.bass, bs=newSeed(); ld(bi); bt=makeTrack({role:'bass',inst:bi,gen:true,name:uniq('Bassline'),events:genBass(s,L,bs),seed:bs,style:s,fromSong:t?t.id:undefined}); PROJ.tracks.push(bt); }
  chordsRedraw();
  const nm=(t&&t.name)||'the song', key=to==='mine'?st.key:(setOwn?st.key:songKey||st.key), names=chordsText(chords.slice(0,8));
  const moveTxt=shift?` moved ${shiftWords(shift)} into your key, ${keyName(st.key)}`:to==='song'&&songKey?` in the song's key, ${keyName(songKey)}`:'';
  const text=`Chords from “${nm}” on a new ${ct.name} track: ${names}${chords.length>8?' …':''}${moveTxt}`+(bt?'; a new bassline follows the song\'s bass':o.bass?'; your bassline follows the song\'s bass':'')+(moved.length?`; ${moved.join(', ')} follow${moved.length===1?'s':''}`:'');
  return {chords,track:ct,bass:bt,key,songKey,shift,to,bars:nb,moved,text};
}
