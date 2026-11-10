/* ---------- Sound Lab ---------- */
const ELEMENTS={
  kick:{id:'kick',label:'Kick',kind:'drum',comp:'percussive',maskPow:1,focus:'center',lo:25,hi:160,sliceLen:0.6,release:0.1,hint:'Low thump on the beat'},
  snare:{id:'snare',label:'Snare / clap',kind:'drum',comp:'percussive',focus:'center',lo:160,hi:7500,sliceLen:0.4,release:0.1,hint:'Backbeat crack'},
  hats:{id:'hats',label:'Hi-hats',kind:'drum',comp:'percussive',focus:'all',lo:6000,hi:20000,sliceLen:0.3,release:0.05,hint:'Ticks and shimmer up top'},
  bass:{id:'bass',label:'Bass',kind:'tonal',comp:'harmonic',focus:'center',lo:28,hi:320,fmin:30,fmax:330,release:0.12,hint:'Bassline or 808'},
  lead:{id:'lead',label:'Lead synth',kind:'tonal',comp:'harmonic',focus:'center',lo:220,hi:9000,fmin:110,fmax:1400,release:0.25,hint:'Main melody synth'},
  pad:{id:'pad',label:'Pad / chords',kind:'tonal',comp:'harmonic',focus:'sides',lo:120,hi:7000,fmin:70,fmax:1000,release:1.2,long:true,hint:'Wide sustained chords'},
  vocal:{id:'vocal',label:'Vocal',kind:'tonal',comp:'harmonic',focus:'center',lo:110,hi:8000,fmin:80,fmax:1000,release:0.3,hint:'Lead voice for chops'}
};
/* Separation engines: run(L, R, sampleRate, recipe) -> Promise<Float32Array mono>. Register ML engines here. */
const SEPARATION_ENGINES={
  'dsp-v1':{label:'Built-in spectral DSP v1',run:(L,R,sr,p)=>runIsolation(L,R,sr,p)}
};
let activeEngine='dsp-v1';
let worker=null;
function getWorker(){
  if(worker!==null) return worker;
  try{
    const src=[makeFFT.toString(),isolateCore.toString(),'self.onmessage=function(e){var d=e.data;try{var o=isolateCore(d.L,d.R,d.sr,d.p);self.postMessage({ok:true,out:o},[o.buffer]);}catch(err){self.postMessage({ok:false,err:String(err)});}};'].join('\n');
    worker=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})));
  }catch(e){ worker=false; }
  return worker;
}
function runIsolation(L,R,sr,p){
  const w=getWorker();
  if(!w) return nextFrame().then(()=>isolateCore(L,R,sr,p));
  return new Promise((res,rej)=>{
    w.onmessage=e=>{ e.data.ok?res(e.data.out):rej(new Error(e.data.err)); };
    w.onerror=ev=>{ ev.preventDefault&&ev.preventDefault(); worker=false; nextFrame().then(()=>res(isolateCore(L,R,sr,p))); };
    const l=L.slice(), r=R.slice(); w.postMessage({L:l,R:r,sr,p},[l.buffer,r.buffer]);
  });
}

const LAB={buf:null,name:'',sel:[0,0],el:'lead',res:null,src:null,peaks:null,drag:null,playT0:0,playFrom:0,playDur:0};
function labStatus(t){ $('#labStatus').textContent=t; }
$('#elements').innerHTML=Object.values(ELEMENTS).map(e=>`<button class="chip" type="button" data-el="${e.id}" aria-pressed="${e.id===LAB.el}"><b>${e.label}</b><span>${e.hint}</span></button>`).join('');
$('#elements').addEventListener('click',e=>{ const b=e.target.closest('[data-el]'); if(!b) return; LAB.el=b.dataset.el; document.querySelectorAll('[data-el]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });

function setSong(buf,name,sel){
  stopLab(); LAB.buf=buf; LAB.name=name; LAB.peaks=null;
  const d=buf.duration, len=Math.min(12,d), s=d>len?Math.min(d-len,d*0.3):0; LAB.sel=sel||[s,s+len];
  $('#fileMeta').textContent=`${name} · ${fmtT(d)} · ${(buf.sampleRate/1000).toFixed(1)} kHz · ${buf.numberOfChannels===1?'mono':'stereo'}`;
  drawWave(); selInfo();
}
async function loadFile(file){
  if(!file) return; const c=ensureAudio(); if(!c) return;
  labStatus('Decoding '+file.name+'…');
  try{ const ab=await file.arrayBuffer(); const buf=await c.decodeAudioData(ab); setSong(buf,file.name); labStatus('Loaded. Drag on the waveform to mark where the part is clear, then extract.'); }
  catch(e){ labStatus('That file couldn’t be decoded. Try MP3, WAV, FLAC, OGG or M4A.'); }
}
$('#fileIn').addEventListener('change',e=>loadFile(e.target.files[0]));
(function(){ const dz=$('#drop'); ['dragenter','dragover'].forEach(t=>dz.addEventListener(t,e=>{ e.preventDefault(); dz.classList.add('over'); })); ['dragleave','drop'].forEach(t=>dz.addEventListener(t,e=>{ e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop',e=>{ const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) loadFile(f); }); })();

function computePeaks(buf,w){ const ch0=buf.getChannelData(0), ch1=buf.numberOfChannels>1?buf.getChannelData(1):ch0, step=buf.length/w, mn=new Float32Array(w), mx=new Float32Array(w);
  for(let x=0;x<w;x++){ let a=1,b=-1; const s=Math.floor(x*step), e=Math.min(buf.length,Math.floor((x+1)*step)); for(let i=s;i<e;i+=Math.max(1,Math.floor((e-s)/200))){ const v=(ch0[i]+ch1[i])*0.5; if(v<a) a=v; if(v>b) b=v; } mn[x]=a; mx[x]=b; } return {w,mn,mx}; }
function prepCanvas(cv){ const dpr=devicePixelRatio||1, w=cv.clientWidth, h=cv.clientHeight; cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h); return {g,w,h}; }
function drawWave(){
  const cv=$('#wave'), {g,w,h}=prepCanvas(cv), acc=cssVar('--accent'), mut=cssVar('--muted'), line=cssVar('--line');
  if(!LAB.buf){ g.fillStyle=mut; g.font='13px '+cssVar('--body'); g.fillText('Load a song to see its waveform',14,h/2); return; }
  if(!LAB.peaks||LAB.peaks.w!==w) LAB.peaks=computePeaks(LAB.buf,w);
  const d=LAB.buf.duration, x0=LAB.sel[0]/d*w, x1=LAB.sel[1]/d*w, mid=(h-18)/2;
  g.fillStyle=acc+'22'; g.fillRect(x0,0,x1-x0,h-18);
  for(let x=0;x<w;x++){ const inS=x>=x0&&x<=x1; g.fillStyle=inS?acc:mut+'88'; const a=LAB.peaks.mn[x], b=LAB.peaks.mx[x]; g.fillRect(x,mid-b*mid*0.95,1,Math.max(1,(b-a)*mid*0.95)); }
  g.fillStyle=acc; g.fillRect(x0,0,1.5,h-18); g.fillRect(x1-1.5,0,1.5,h-18);
  g.strokeStyle=line; g.beginPath(); g.moveTo(0,h-18.5); g.lineTo(w,h-18.5); g.stroke();
  const steps=[1,2,5,10,15,30,60,120]; let st=steps.find(s=>s/d*w>=70)||120; g.fillStyle=mut; g.font='11px '+cssVar('--mono');
  for(let t=0;t<=d;t+=st){ const x=t/d*w; g.fillRect(x,h-18,1,4); if(x<w-30) g.fillText(fmtT(t).replace(/\.\d$/,''),x+3,h-5); }
  if(LAB.src && LAB.playDur){ const el=A.ctx.currentTime-LAB.playT0; if(el<=LAB.playDur){ const px=(LAB.playFrom+el)/d*w; g.fillStyle=cssVar('--signal'); g.fillRect(px,0,2,h-18); requestAnimationFrame(drawWave); } }
}
function selInfo(){ const [a,b]=LAB.sel; $('#selInfo').textContent=`Selection ${fmtT(a)} – ${fmtT(b)} · ${(b-a).toFixed(1)} s (max 20 s)`; }
(function(){
  const cv=$('#wave'); const tAt=e=>{ const r=cv.getBoundingClientRect(); return clamp((e.clientX-r.left)/r.width,0,1)*LAB.buf.duration; };
  cv.addEventListener('pointerdown',e=>{ if(!LAB.buf) return; LAB.drag={t0:tAt(e),x0:e.clientX,moved:false}; try{ cv.setPointerCapture(e.pointerId); }catch(_){} });
  cv.addEventListener('pointermove',e=>{ const D=LAB.drag; if(!D) return; if(Math.abs(e.clientX-D.x0)>4) D.moved=true; if(!D.moved) return; const t=tAt(e); let a=Math.min(D.t0,t), b=Math.max(D.t0,t); if(b-a>20){ if(t>D.t0) b=a+20; else a=b-20; } LAB.sel=[a,b]; drawWave(); selInfo(); });
  const end=e=>{ const D=LAB.drag; if(!D) return; LAB.drag=null; const d=LAB.buf.duration;
    if(!D.moved){ const len=LAB.sel[1]-LAB.sel[0]; const a=clamp(tAt(e)-len/2,0,Math.max(0,d-len)); LAB.sel=[a,a+len]; }
    if(LAB.sel[1]-LAB.sel[0]<0.5){ LAB.sel[1]=Math.min(d,LAB.sel[0]+0.5); }
    drawWave(); selInfo(); };
  cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',end);
})();
function playBuffer(buf,offset,dur,track){
  stopLab(); const c=ensureAudio(); if(!c) return; const s=c.createBufferSource(); s.buffer=buf; s.connect(A.master); s.start(0,offset,dur); LAB.src=s;
  if(track){ LAB.playT0=c.currentTime; LAB.playFrom=offset; LAB.playDur=dur; requestAnimationFrame(drawWave); } else LAB.playDur=0;
  s.onended=()=>{ if(LAB.src===s){ LAB.src=null; drawWave(); } };
}
function stopLab(){ if(LAB.src){ try{ LAB.src.stop(); }catch(e){} LAB.src=null; } }
function toBuffer(data,sr){ const b=new AudioBuffer({length:Math.max(1,data.length),numberOfChannels:1,sampleRate:sr}); b.copyToChannel(data,0); return b; }
$('#playSel').onclick=()=>{ if(!LAB.buf) return labStatus('Load a song first.'); playBuffer(LAB.buf,LAB.sel[0],LAB.sel[1]-LAB.sel[0],true); };
$('#stopLab').onclick=()=>{ stopLab(); drawWave(); };
$('#playIso').onclick=()=>{ const r=LAB.res; if(r) playBuffer(toBuffer(r.iso,r.sr),0,r.iso.length/r.sr,false); };
$('#playSlice').onclick=()=>{ const r=LAB.res; if(r) playBuffer(toBuffer(r.slice,r.sr),0,r.slice.length/r.sr,false); };

async function extract(){
  if(!LAB.buf){ labStatus('Load a song first.'); return; }
  const el=ELEMENTS[LAB.el], buf=LAB.buf, sr=buf.sampleRate;
  const i0=Math.floor(LAB.sel[0]*sr), i1=Math.min(buf.length,Math.floor(LAB.sel[1]*sr));
  if(i1-i0<sr*0.3){ labStatus('Select at least half a second.'); return; }
  const L=buf.getChannelData(0).slice(i0,i1), R=buf.numberOfChannels>1?buf.getChannelData(1).slice(i0,i1):L.slice();
  const stem=$('#isStem').checked, fsel=$('#focusSel').value, focus=fsel==='auto'?el.focus:fsel;
  const btn=$('#extractBtn'); btn.disabled=true; const t0=performance.now();
  try{
    labStatus(`Separating the ${el.label.toLowerCase()}…`); await nextFrame();
    let iso;
    if(stem){ iso=new Float32Array(L.length); let pk=0; for(let i=0;i<L.length;i++){ iso[i]=(L[i]+R[i])*0.5; pk=Math.max(pk,Math.abs(iso[i])); } if(pk>0) for(let i=0;i<iso.length;i++) iso[i]*=0.89/pk; }
    else iso=await SEPARATION_ENGINES[activeEngine].run(L,R,sr,{focus,comp:el.comp,lo:el.lo,hi:el.hi,maskPow:el.maskPow});
    labStatus(`Finding a clean ${el.kind==='drum'?'hit':'note'}…`); await nextFrame();
    const pick=el.kind==='drum'?pickDrumHit(iso,sr,el):pickTonalNote(iso,sr,el);
    const slice=iso.slice(pick.start,pick.end);
    const fi=Math.min(slice.length,Math.round(0.002*sr)), fo=Math.min(slice.length,Math.round(0.03*sr));
    for(let i=0;i<fi;i++) slice[i]*=i/fi; for(let i=0;i<fo;i++) slice[slice.length-1-i]*=i/fo;
    let pk=0; for(let i=0;i<slice.length;i++) pk=Math.max(pk,Math.abs(slice[i])); if(pk>0) for(let i=0;i<slice.length;i++) slice[i]*=0.9/pk;
    const an=analyzeSlice(slice,sr,pick.rootFreq,el,L.subarray(pick.start,pick.end),R.subarray(pick.start,pick.end));
    const patch=buildPatch(an,el);
    const loop=el.kind==='tonal'&&pick.rootFreq>0&&slice.length>0.6*sr&&an.sus>0.3?findLoop(slice,sr,pick.rootFreq):null;
    LAB.res={el,iso,slice,sr,pick,an,patch,loop,focus,stem,offset:LAB.sel[0],song:LAB.name};
    renderResult();
    labStatus(`Done in ${((performance.now()-t0)/1000).toFixed(1)} s${pick.found?'':'. No clean '+(el.kind==='drum'?'hit':'sustained note')+' found, so the loudest part was used. Try a section where it plays alone.'}`);
  }catch(err){ console.error(err); labStatus('Extraction failed: '+err.message); }
  btn.disabled=false;
}
$('#extractBtn').onclick=extract;

function renderResult(){
  const r=LAB.res, an=r.an, el=r.el, tonal=el.kind==='tonal';
  $('#resultEmpty').hidden=true; $('#result').hidden=false;
  const short=r.song.replace(/\.[a-z0-9]+$/i,'');
  $('#resTitle').textContent=`${el.label} from “${short}”`;
  const focusTxt={center:'center of the mix',sides:'sides of the mix',all:'whole stereo field'}[r.focus];
  $('#recipe').textContent=r.stem?'Recipe: stem used as-is (no separation)':`Recipe: ${el.comp} layer · ${focusTxt} · ${fmtHz(el.lo)}–${fmtHz(el.hi)} band · ${SEPARATION_ENGINES[activeEngine].label}`;
  const rows=[];
  if(tonal){
    if(r.pick.rootFreq>0){ const m=ftom(r.pick.rootFreq), n=Math.round(m), ct=Math.round((m-n)*100); rows.push(['Root note',`${noteName(n)} ${ct>=0?'+':''}${ct}¢ · ${r.pick.rootFreq.toFixed(1)} Hz`]); }
    else rows.push(['Root note','Not detected · mapped to C4']);
    rows.push(['Closest classic wave',an.shape?`${an.shape.name} · ${an.shape.fit} match`:'n/a']);
    rows.push(['Pitch confidence',r.pick.clarity?r.pick.clarity.toFixed(2):'low']);
  } else {
    rows.push(['Hit type',`Unpitched · energy peak ${fmtHz(el.id==='kick'?an.lowPeak:an.peakFreq)}`]);
  }
  rows.push(['Brightness',fmtHz(an.centroid)+' centroid']);
  rows.push(['Envelope',tonal?`A ${fmtS(r.patch.a)} · D ${fmtS(r.patch.d)} · S ${Math.round(r.patch.s*100)}% · R ${fmtS(r.patch.r)}`:`Attack ${fmtS(an.attack)} · tail ${fmtS(an.tail)}`]);
  rows.push(['Stereo width',`${an.width<0.15?'Narrow':an.width<0.45?'Medium':'Wide'} · ${an.width.toFixed(2)}`]);
  rows.push(['Noise content',`${an.flatness<0.1?'Low':an.flatness<0.3?'Some':'High'} · ${an.flatness.toFixed(2)}`]);
  rows.push(['Slice',`${fmtS(r.slice.length/r.sr)} at ${fmtT(r.offset+r.pick.start/r.sr)}${r.loop?' · sustain loop found':''}`]);
  $('#stats').innerHTML=rows.map(([a,b])=>`<dt>${a}</dt><dd>${esc(b)}</dd>`).join('');
  $('#sndName').value=`${el.label} · ${short}`.slice(0,40);
  $('#addSampler').textContent=tonal?'Add as sampler':'Add as one-shot sampler';
  drawIso(); drawHarm();
}
function drawIso(){
  const r=LAB.res; if(!r) return; const cv=$('#isoWave'), {g,w,h}=prepCanvas(cv), acc=cssVar('--accent'), mut=cssVar('--muted'), sig=cssVar('--signal');
  const x=r.iso, n=x.length, s0=r.pick.start/n*w, s1=r.pick.end/n*w, mid=h/2;
  g.fillStyle=sig+'22'; g.fillRect(s0,0,Math.max(2,s1-s0),h);
  for(let px=0;px<w;px++){ const a=Math.floor(px/w*n), b=Math.floor((px+1)/w*n); let mn=1,mx=-1; for(let i=a;i<b;i+=Math.max(1,((b-a)/100)|0)){ if(x[i]<mn) mn=x[i]; if(x[i]>mx) mx=x[i]; } g.fillStyle=(px>=s0&&px<=s1)?sig:acc+'aa'; g.fillRect(px,mid-mx*mid*0.92,1,Math.max(1,(mx-mn)*mid*0.92)); }
  g.fillStyle=mut; g.font='11px '+cssVar('--mono'); g.fillText('isolated part',8,14); g.fillStyle=sig; g.fillText('chosen slice',Math.min(w-80,s0+4),h-6);
}
function drawHarm(){
  const r=LAB.res; if(!r) return; const cv=$('#harm'), {g,w,h}=prepCanvas(cv), acc=cssVar('--accent'), mut=cssVar('--muted'), line=cssVar('--line'), mono='11px '+cssVar('--mono');
  const harm=r.an.harmonics, vals=harm?harm.slice(0,16):r.an.bands, L=36, B=22, T=22, pw=w-L-10, ph=h-B-T;
  g.font=mono; g.fillStyle=mut; g.fillText(harm?'Harmonic levels (1 = fundamental)':'Spectrum, 30 Hz – 16 kHz',L,14);
  [0,-24,-48].forEach(db=>{ const y=T+(-db/48)*ph; g.strokeStyle=line; g.beginPath(); g.moveTo(L,y+0.5); g.lineTo(w-10,y+0.5); g.stroke(); g.fillStyle=mut; g.fillText(db+' dB',0,y+4); });
  const bw=pw/vals.length;
  vals.forEach((v,i)=>{ const db=Math.max(-48,20*Math.log10(Math.max(v,1e-5))), bh=(db+48)/48*ph; g.fillStyle=acc; g.fillRect(L+i*bw+bw*0.18,T+ph-bh,bw*0.64,bh); });
  g.fillStyle=mut;
  if(harm){ vals.forEach((v,i)=>{ if(i===0||(i+1)%4===0) g.fillText(String(i+1),L+i*bw+bw*0.3,h-6); }); }
  else { [[0,'30 Hz'],[Math.floor(vals.length/2),'700 Hz'],[vals.length-4,'16 kHz']].forEach(([i,t])=>g.fillText(t,L+i*bw,h-6)); }
}
async function addCustom(kind){
  const r=LAB.res; if(!r) return;
  const id='c'+Date.now().toString(36), name=($('#sndName').value.trim()||r.el.label).slice(0,40);
  const meta={id,name,kind,label:r.el.label,source:r.song.replace(/\.[a-z0-9]+$/i,'').slice(0,40),percussive:r.el.kind==='drum',rootFreq:r.pick.rootFreq||261.63,loop:r.loop,release:r.el.release,sr:r.sr,patch:kind==='resynth'?r.patch:null,shape:r.an.shape?r.an.shape.name:null};
  let data=null;
  if(kind==='sampler'){ data=r.slice.slice(); try{ await IDB.put(id,{sr:r.sr,data}); }catch(e){ toast('Couldn’t save the sample in this browser, so it lasts until you close the page.'); } }
  const inst=makeCustomInst(meta,data); if(!inst){ toast('That sound couldn’t be built in this browser.'); return; }
  CUSTOM.push(meta); persistCustom(); registerInst(inst); renderRack(); ensureAudio(); setInstrument(id);
  toast(`“${name}” is on your rack. Play it from your controller.`);
}
$('#addSampler').onclick=()=>addCustom('sampler');
$('#addSynth').onclick=()=>addCustom('resynth');

