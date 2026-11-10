/* ===================== DSP-START (pure functions, no DOM) ===================== */
function makeFFT(N){
  var levels=Math.round(Math.log2(N)), cos=new Float32Array(N/2), sin=new Float32Array(N/2), rev=new Uint32Array(N), i, j;
  for(i=0;i<N/2;i++){ cos[i]=Math.cos(2*Math.PI*i/N); sin[i]=Math.sin(2*Math.PI*i/N); }
  for(i=0;i<N;i++){ var r=0, x=i; for(j=0;j<levels;j++){ r=(r<<1)|(x&1); x>>=1; } rev[i]=r; }
  return function(re,im,inverse){
    var i,j,k,t;
    for(i=0;i<N;i++){ j=rev[i]; if(j>i){ t=re[i]; re[i]=re[j]; re[j]=t; t=im[i]; im[i]=im[j]; im[j]=t; } }
    for(var size=2; size<=N; size<<=1){
      var half=size>>1, step=N/size;
      for(i=0;i<N;i+=size){
        for(j=i,k=0;j<i+half;j++,k+=step){
          var c=cos[k], s=inverse?sin[k]:-sin[k], h=j+half;
          var tr=re[h]*c-im[h]*s, ti=re[h]*s+im[h]*c;
          re[h]=re[j]-tr; im[h]=im[j]-ti; re[j]+=tr; im[j]+=ti;
        }
      }
    }
    if(inverse){ for(i=0;i<N;i++){ re[i]/=N; im[i]/=N; } }
  };
}

/* Spectral isolation: stereo mask x harmonic/percussive mask x band mask, then overlap-add. */
function isolateCore(L, R, sr, p){
  function medianN(a,n){ for(var i=1;i<n;i++){ var v=a[i], j=i-1; while(j>=0 && a[j]>v){ a[j+1]=a[j]; j--; } a[j+1]=v; } return a[n>>1]; }
  var N=2048, H=512, B=N/2+1, len=L.length, P=N, tot=len+2*P, i, k, f, idx;
  var Lp=new Float32Array(tot), Rp=new Float32Array(tot); Lp.set(L,P); Rp.set(R,P);
  var F=Math.floor((tot-N)/H)+1;
  var win=new Float32Array(N); for(i=0;i<N;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/N);
  var fft=makeFFT(N);
  var Xr=new Float32Array(F*B), Xi=new Float32Array(F*B), Mg=new Float32Array(F*B), G=new Float32Array(F*B);
  var ar=new Float32Array(N), ai=new Float32Array(N), br=new Float32Array(N), bi=new Float32Array(N);
  var focus=p.focus||'all', comp=p.comp||'all';
  for(f=0;f<F;f++){
    var off=f*H;
    for(i=0;i<N;i++){ ar[i]=Lp[off+i]*win[i]; br[i]=Rp[off+i]*win[i]; ai[i]=0; bi[i]=0; }
    fft(ar,ai,false); fft(br,bi,false);
    for(k=0;k<B;k++){
      idx=f*B+k;
      var pl=ar[k]*ar[k]+ai[k]*ai[k], pr=br[k]*br[k]+bi[k]*bi[k], mr, mi, g=1;
      if(focus==='sides'){ if(pl>pr){ mr=ar[k]*0.7; mi=ai[k]*0.7; } else { mr=br[k]*0.7; mi=bi[k]*0.7; } }
      else { mr=(ar[k]+br[k])*0.5; mi=(ai[k]+bi[k])*0.5; }
      if(focus!=='all'){
        var sim=(pl+pr)>1e-14 ? 2*(ar[k]*br[k]+ai[k]*bi[k])/(pl+pr) : 1;
        if(sim<0) sim=0;
        var s4=sim*sim; s4*=s4;
        g = focus==='center' ? s4 : (1-s4);
      }
      Xr[idx]=mr; Xi[idx]=mi; Mg[idx]=Math.sqrt(mr*mr+mi*mi); G[idx]=g;
    }
  }
  if(comp!=='all'){
    var K=8, tmp=new Float32Array(2*K+1), Hm=new Float32Array(F*B), Pm=new Float32Array(F*B), n, j;
    for(k=0;k<B;k++){ for(f=0;f<F;f++){ n=0; for(j=f-K;j<=f+K;j++){ if(j<0||j>=F) continue; tmp[n++]=Mg[j*B+k]; } Hm[f*B+k]=medianN(tmp,n); } }
    for(f=0;f<F;f++){ var base=f*B; for(k=0;k<B;k++){ n=0; for(j=k-K;j<=k+K;j++){ if(j<0||j>=B) continue; tmp[n++]=Mg[base+j]; } Pm[base+k]=medianN(tmp,n); } }
    var pw=p.maskPow||2; for(idx=0;idx<F*B;idx++){ var h2=Math.pow(Hm[idx],pw), p2=Math.pow(Pm[idx],pw), d=h2+p2+1e-20; G[idx]*= comp==='harmonic' ? h2/d : p2/d; }
  }
  var bm=new Float32Array(B), lo=p.lo||20, hi=p.hi||20000;
  for(k=0;k<B;k++){ var fr=k*sr/N, m=1; if(fr<lo){ var q=fr/lo; m*=q*q*q*q; } if(fr>hi){ var q2=hi/fr; m*=q2*q2*q2*q2*q2*q2; } bm[k]=m; }
  var out=new Float32Array(tot);
  for(f=0;f<F;f++){
    off=f*H;
    for(k=0;k<B;k++){ idx=f*B+k; var gg=G[idx]*bm[k]; ar[k]=Xr[idx]*gg; ai[k]=Xi[idx]*gg; }
    for(k=1;k<N/2;k++){ ar[N-k]=ar[k]; ai[N-k]=-ai[k]; }
    fft(ar,ai,true);
    for(i=0;i<N;i++) out[off+i]+=ar[i]*win[i];
  }
  var res=new Float32Array(len), peak=0;
  for(i=0;i<len;i++){ var v=out[P+i]/1.5; res[i]=v; var av=v<0?-v:v; if(av>peak) peak=av; }
  if(peak>1e-6){ var sc=0.89/peak; for(i=0;i<len;i++) res[i]*=sc; }
  return res;
}

/* NSDF (McLeod) pitch detector using FFT autocorrelation. One detector per window size; call it per frame. */
function makePitchDetector(W, sr, fmin, fmax){
  var N=W*2, fft=makeFFT(N), re=new Float32Array(N), im=new Float32Array(N), cs=new Float64Array(W+1);
  var minLag=Math.max(2,Math.floor(sr/fmax)), maxLag=Math.min(W-2,Math.ceil(sr/fmin)), nsdf=new Float32Array(maxLag+2);
  return function(x, off){
    off=off||0; var e=0, i, tau; cs[0]=0;
    for(i=0;i<W;i++){ var v=x[off+i]; re[i]=v; im[i]=0; e+=v*v; cs[i+1]=cs[i]+v*v; }
    for(i=W;i<N;i++){ re[i]=0; im[i]=0; }
    var rms=Math.sqrt(e/W);
    if(rms<1e-4) return {f:0,clar:0,rms:rms};
    fft(re,im,false);
    for(i=0;i<N;i++){ re[i]=re[i]*re[i]+im[i]*im[i]; im[i]=0; }
    fft(re,im,true);
    for(tau=1;tau<=maxLag+1;tau++){ var m=cs[W-tau]+(cs[W]-cs[tau]); nsdf[tau]=m>0?2*re[tau]/m:0; }
    var crossed=false, peaks=[], best=0;
    for(tau=2;tau<=maxLag;tau++){
      if(!crossed){ if(nsdf[tau]<0) crossed=true; continue; }
      if(tau>=minLag && nsdf[tau]>0 && nsdf[tau]>nsdf[tau-1] && nsdf[tau]>=nsdf[tau+1]){ peaks.push(tau); if(nsdf[tau]>best) best=nsdf[tau]; }
    }
    for(var q=0;q<peaks.length;q++){
      var tp=peaks[q];
      if(nsdf[tp]>=best*0.88){ var a=nsdf[tp-1], b=nsdf[tp], c=nsdf[tp+1], den=a-2*b+c, sh=den!==0?0.5*(a-c)/den:0; return {f:sr/(tp+sh),clar:b,rms:rms}; }
    }
    return {f:0,clar:0,rms:rms};
  };
}
function pitchTrack(x, sr, fmin, fmax, hop){
  var W=2048; while(W < sr/fmin*2.2 && W<8192) W*=2;
  var det=makePitchDetector(W,sr,fmin,fmax), frames=[];
  for(var off=0; off+W<=x.length; off+=hop){ var r=det(x,off); frames.push({off:off,f:r.f,clar:r.clar,rms:r.rms}); }
  return {W:W,frames:frames};
}

function refineOnset(x, sr, approx){
  var hop=64, win=128, a=Math.max(0,approx-Math.round(0.08*sr)), b=Math.min(x.length-win,approx+Math.round(0.08*sr));
  var prev=-1, bestD=0, bestI=approx;
  for(var s=a;s<b;s+=hop){ var e=0; for(var i=0;i<win;i++){ var v=x[s+i]; e+=v*v; } e=Math.sqrt(e/win); if(prev>=0 && e-prev>bestD){ bestD=e-prev; bestI=s; } prev=e; }
  return Math.max(0, bestI-Math.round(0.003*sr));
}

function pickTonalNote(iso, sr, el){
  var hop=Math.round(sr*0.02), tr=pitchTrack(iso,sr,el.fmin,el.fmax,hop), W=tr.W, fr=tr.frames, maxR=0, i;
  for(i=0;i<fr.length;i++) if(fr[i].rms>maxR) maxR=fr[i].rms;
  /* Runs tolerate octave jumps (bleed from bass/pads makes the tracker flip octaves) and short dropouts. */
  var best=null, s=-1, ref=0, sumR=0, sumC=0, miss=0, folded=[], octs=[];
  function close(e){ var n=e-s; if(s>=0 && n>=3 && folded.length>=3){ var score=folded.length*(sumR/folded.length); if(!best||score>best.score) best={s:s,e:e-1,score:score,clar:sumC/folded.length,folded:folded.slice(),octs:octs.slice()}; } s=-1; miss=0; folded=[]; octs=[]; }
  for(i=0;i<fr.length;i++){
    var F=fr[i], voiced=F.f>0 && F.clar>0.7 && F.rms>0.1*maxR;
    if(s>=0){
      if(voiced){ var cc=1200*Math.log2(F.f/ref), o=Math.round(cc/1200), dist=Math.abs(cc-o*1200);
        if(dist<50 && o>=-2 && o<=1){ var ff=F.f/Math.pow(2,o); folded.push(ff); octs.push({o:o,w:F.clar*F.rms}); sumR+=F.rms; sumC+=F.clar; ref=ref*0.85+ff*0.15; miss=0; continue; } }
      else if(miss<2){ miss++; continue; }
      close(i-miss);
    }
    if(voiced){ s=i; ref=F.f; sumR=F.rms; sumC=F.clar; miss=0; folded=[F.f]; octs=[{o:0,w:F.clar*F.rms}]; }
  }
  close(fr.length-miss);
  var maxDur=Math.round((el.long?3.0:2.0)*sr);
  if(best){
    var fs=best.folded.slice().sort(function(a,b){return a-b;}), ow={};
    best.octs.forEach(function(x){ ow[x.o]=(ow[x.o]||0)+x.w; });
    var bo=0, bw=-1; for(var key in ow){ if(ow[key]>bw){ bw=ow[key]; bo=+key; } }
    var root=fs[fs.length>>1]*Math.pow(2,bo);
    var c0=fr[best.s].off+W/2, c1=fr[best.e].off+W/2;
    var st=Math.max(0,Math.round(c0-W/4-hop/2)), en=Math.min(iso.length,Math.round(c1+W/4+0.06*sr));
    st=refineOnset(iso,sr,st);
    if(en-st>maxDur) en=st+maxDur;
    if(en-st<0.15*sr) en=Math.min(iso.length,st+Math.round(0.15*sr));
    return {start:st,end:en,rootFreq:root,clarity:best.clar,found:true};
  }
  var winS=Math.min(iso.length,sr), stepS=Math.round(0.05*sr), bestE=-1, bestS=0;
  for(var o=0;o+winS<=iso.length;o+=stepS){ var e=0; for(i=o;i<o+winS;i+=4) e+=iso[i]*iso[i]; if(e>bestE){ bestE=e; bestS=o; } }
  var vf=[]; for(i=0;i<fr.length;i++) if(fr[i].f>0 && fr[i].clar>0.6) vf.push(fr[i].f);
  vf.sort(function(a,b){return a-b;});
  return {start:bestS,end:bestS+winS,rootFreq:vf.length?vf[vf.length>>1]:0,clarity:0,found:false};
}

function pickDrumHit(iso, sr, el){
  var hop=128, win=256, n=Math.max(2,Math.floor((iso.length-win)/hop)+1), env=new Float32Array(n), on=new Float32Array(n), i, j, maxE=0;
  for(i=0;i<n;i++){ var e=0, o=i*hop; for(j=0;j<win && o+j<iso.length;j++){ var v=iso[o+j]; e+=v*v; } env[i]=Math.sqrt(e/win); if(env[i]>maxE) maxE=env[i]; }
  for(i=1;i<n;i++){ var d=env[i]-env[i-1]; on[i]=d>0?d:0; }
  var look=Math.max(1,Math.round(0.02*sr/hop)), bi=0, bv=-1;
  for(i=1;i<n;i++){ if(on[i]<=bv) continue; var pk=0; for(j=i;j<Math.min(n,i+look);j++) if(env[j]>pk) pk=env[j]; if(pk<0.4*maxE) continue; bv=on[i]; bi=i; }
  var st=Math.max(0,bi*hop-Math.round(0.004*sr)), en=Math.min(iso.length,st+Math.round(el.sliceLen*sr));
  var gap=Math.round(0.06*sr/hop);
  for(j=bi+gap;j<n && j*hop<en;j++){ if(on[j]>0.45*bv){ en=Math.min(en,j*hop); break; } }
  var pkE=0; for(j=bi;j<n && j*hop<en;j++) if(env[j]>pkE) pkE=env[j];
  var last=Math.min(n-1,Math.floor(en/hop)); while(last>bi+2 && env[last]<0.02*pkE) last--;
  en=Math.min(en,last*hop+win);
  return {start:st,end:Math.max(en,st+Math.round(0.03*sr)),rootFreq:0,clarity:0,found:bv>0};
}

function analyzeSlice(x, sr, rootFreq, el, Ls, Rs){
  var len=x.length, hop=Math.max(1,Math.round(sr*0.005)), n=Math.max(1,Math.floor(len/hop)), env=new Float32Array(n), i, j, k;
  for(i=0;i<n;i++){ var s=0; for(j=i*hop;j<Math.min(len,(i+1)*hop);j++) s+=x[j]*x[j]; env[i]=Math.sqrt(s/hop); }
  var pi=0, pv=0; for(i=0;i<n;i++) if(env[i]>pv){ pv=env[i]; pi=i; }
  var ai=0; while(ai<pi && env[ai]<0.7*pv) ai++;
  var attack=Math.max(0.002,ai*hop/sr), sus=0;
  if(el.kind!=='drum'){ var a0=Math.floor(n*0.55), a1=Math.max(a0+1,Math.floor(n*0.85)); var arr=Array.prototype.slice.call(env.subarray(a0,a1)).sort(function(a,b){return a-b;}); sus=pv>0?arr[arr.length>>1]/pv:0; sus=Math.max(0,Math.min(1,sus)); }
  var target=pv*(sus+(1-sus)*0.37), di=pi; while(di<n-1 && env[di]>target) di++;
  var decay=Math.max(0.01,(di-pi)*hop/sr);
  var t10=pi; while(t10<n-1 && env[t10]>pv*0.1) t10++;
  var tail=Math.max(0.02,(t10-pi)*hop/sr);
  var W=8192; while(W>len && W>1024) W>>=1;
  var s0=el.kind==='drum' ? Math.max(0,Math.min(len-W,pi*hop-64)) : Math.max(0,Math.min(len-W,Math.round(pi*hop+0.03*sr)));
  var re=new Float32Array(W), im=new Float32Array(W);
  for(i=0;i<W;i++){ var v=(s0+i<len)?x[s0+i]:0; re[i]=v*(0.5-0.5*Math.cos(2*Math.PI*i/W)); }
  makeFFT(W)(re,im,false);
  var half=W/2, mag=new Float32Array(half);
  for(k=0;k<half;k++) mag[k]=Math.sqrt(re[k]*re[k]+im[k]*im[k]);
  var binHz=sr/W, num=0, dn=0, lg=0, ar=0, cnt=0, kLo=Math.max(1,Math.round(40/binHz)), kHi=Math.min(half-1,Math.round(Math.min(12000,sr/2)/binHz));
  for(k=kLo;k<=kHi;k++){ num+=k*binHz*mag[k]; dn+=mag[k]; var pw=mag[k]*mag[k]+1e-12; lg+=Math.log(pw); ar+=pw; cnt++; }
  var centroid=dn>0?num/dn:1000, flatness=cnt?Math.exp(lg/cnt)/(ar/cnt):0;
  function argmax(f0,f1){ var a=Math.max(1,Math.round(f0/binHz)), b=Math.min(half-1,Math.round(f1/binHz)), bk=a; for(var q=a;q<=b;q++) if(mag[q]>mag[bk]) bk=q; return bk*binHz; }
  var lowPeak=argmax(30,250), peakFreq=argmax(30,Math.min(16000,sr/2*0.95));
  var bands=[], fLo=30, fHi=Math.min(16000,sr/2*0.95), NB=24;
  for(var b=0;b<NB;b++){ var e0=fLo*Math.pow(fHi/fLo,b/NB), e1=fLo*Math.pow(fHi/fLo,(b+1)/NB), ka=Math.max(1,Math.floor(e0/binHz)), kb=Math.max(ka+1,Math.ceil(e1/binHz)), sm=0, c=0; for(k=ka;k<kb && k<half;k++){ sm+=mag[k]; c++; } bands.push(c?sm/c:0); }
  var bm=Math.max.apply(null,bands)||1; bands=bands.map(function(v){return v/bm;});
  var harmonics=null, shape=null;
  if(rootFreq>0){
    harmonics=[];
    for(var h=1;h<=24;h++){ var fh=h*rootFreq; if(fh>sr/2*0.95) break; var cb=fh/binHz, sp=Math.max(2,cb*0.03), ka2=Math.max(1,Math.floor(cb-sp)), kb2=Math.min(half-1,Math.ceil(cb+sp)), mx=0; for(k=ka2;k<=kb2;k++) if(mag[k]>mx) mx=mag[k]; harmonics.push(mx); }
    var hm=Math.max.apply(null,harmonics)||1; harmonics=harmonics.map(function(v){ v=v/hm; return v<0.002?0:v; });
    var T={Sine:function(k){return k===1?1:0;},Saw:function(k){return 1/k;},Square:function(k){return k%2?1/k:0;},Triangle:function(k){return k%2?1/(k*k):0;}};
    var dB=function(a){ return Math.max(-50,20*Math.log10(Math.max(a,0.003))); }, bestN='', bestD=1e9, Kmax=Math.min(10,harmonics.length);
    for(var name in T){ var tv=[], tm=0; for(k=1;k<=Kmax;k++){ tv.push(T[name](k)); } tm=Math.max.apply(null,tv); var dd=0, ww=0; for(k=1;k<=Kmax;k++){ var w=1/k; dd+=w*Math.abs(dB(harmonics[k-1])-dB(tv[k-1]/tm)); ww+=w; } dd/=ww; if(dd<bestD){ bestD=dd; bestN=name; } }
    shape={name:bestN,err:bestD,fit:bestD<6?'close':bestD<12?'loose':'distinct'};
  }
  var sLL=0,sRR=0,sLR=0; for(i=0;i<Ls.length;i++){ sLL+=Ls[i]*Ls[i]; sRR+=Rs[i]*Rs[i]; sLR+=Ls[i]*Rs[i]; }
  var corr=(sLL>0&&sRR>0)?sLR/Math.sqrt(sLL*sRR):1, width=Math.max(0,Math.min(1,1-corr));
  return {attack:attack,decay:decay,sus:sus,tail:tail,centroid:centroid,flatness:flatness,lowPeak:lowPeak,peakFreq:peakFreq,bands:bands,harmonics:harmonics,shape:shape,width:width,rootFreq:rootFreq};
}

function buildPatch(an, el){
  var cl=function(v,a,b){return Math.min(b,Math.max(a,v));};
  if(el.kind==='drum'){
    return {drum:true,toneFreq:cl(el.id==='kick'?an.lowPeak:an.peakFreq,30,8000),pitchDrop:el.id==='kick'?2.6:1.15,
      toneLevel:el.id==='hats'?0.03:cl(1-an.flatness*2,0.15,0.9),noiseCenter:cl(an.centroid,200,14000),noiseQ:el.id==='hats'?1.1:0.75,decay:cl(an.tail*2,el.id==='kick'?0.25:el.id==='snare'?0.12:0.04,2)};
  }
  var h=an.harmonics&&an.harmonics.length?an.harmonics:[1,0.5,0.333,0.25,0.2,0.167,0.143,0.125];
  return {harmonics:h,a:cl(an.attack,0.002,2),d:cl(an.decay,0.02,3),s:cl(an.sus,0.05,1),r:el.release,cutoff:cl(an.centroid*4,1500,18000),q:0.7,
    unison:an.width>0.2?Math.round(5+an.width*20):0,noise:an.flatness>0.3?Math.min(0.35,an.flatness*0.5):0};
}

function findLoop(x, sr, root){
  var len=x.length, period=sr/root, a=Math.floor(len*0.35);
  while(a<len-2 && !(x[a]<=0 && x[a+1]>0)) a++;
  var span=Math.floor((len*0.85-a)/period)*period;
  if(span<period*4) return null;
  return [a/sr,(a+span)/sr];
}
/* ===================== DSP-END ===================== */

