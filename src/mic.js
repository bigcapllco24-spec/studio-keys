
/* ---------- sing to play: microphone pitch → notes ----------
   Pitch: NSDF on 2048 samples each frame, median of the last 5 estimates (kills octave flips),
   noise floor measured for the first half second, hysteresis between notes, and re-attack when
   you sing the same note again ("da da da"). */
const MIC={on:false,stream:null,src:null,an:null,buf:null,det:null,active:null,cand:null,candN:0,silent:0,hist:[],trace:[],t0:performance.now(),raf:0,vel:90,med:[],floor:0,calib:0,env:[]};
function micGate(){ const user=0.004+(1-(+$('#micSens').value)/100)*0.045; return Math.max(user,MIC.floor*3); }
async function micStart(){
  const c=ensureAudio(); if(!c) return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ $('#micStatus').textContent='This browser can’t use a microphone here. Open the page in Chrome.'; return; }
  $('#micStatus').textContent='Asking for microphone permission…';
  try{ MIC.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}); }
  catch(e){ let framed=false; try{ framed=window.self!==window.top; }catch(_){ framed=true; }
    $('#micStatus').textContent=e.name==='NotAllowedError'?(framed?'Microphone is blocked in this embedded view. Open the downloaded HTML file in Chrome and try again.':'Microphone permission was declined. Allow it from the icon left of the address bar, then try again.'):'Couldn’t open the microphone ('+e.name+').'; return; }
  MIC.src=c.createMediaStreamSource(MIC.stream);
  MIC.hp=filt(c,'highpass',60,0.7); MIC.an=c.createAnalyser(); MIC.an.fftSize=2048; MIC.src.connect(MIC.hp).connect(MIC.an);
  MIC.buf=new Float32Array(2048); MIC.det=makePitchDetector(2048,c.sampleRate,65,1200);
  MIC.on=true; MIC.floor=0; MIC.calib=0; MIC.med=[]; MIC.env=[];
  $('#micBtn').textContent='Stop microphone'; $('#micStatus').textContent='Listening. Stay quiet for a moment while it measures the room, then sing one note at a time.';
  micLoop();
}
function micStop(){
  MIC.on=false; cancelAnimationFrame(MIC.raf);
  if(MIC.active!=null) micNoteOff();
  if(MIC.stream) MIC.stream.getTracks().forEach(t=>t.stop()); MIC.stream=null;
  try{ MIC.src&&MIC.src.disconnect(); }catch(e){}
  $('#micBtn').textContent='Start microphone'; $('#micStatus').textContent='Microphone off.'; $('#micLevel').style.width='0';
}
$('#micBtn').onclick=()=>MIC.on?micStop():micStart();
function micNoteOn(n){
  const zone=$('#micZone').value; MIC.active=n;
  MIC.hist.push({n,t0:(performance.now()-MIC.t0)/1000,t1:null}); if(MIC.hist.length>300) MIC.hist.shift();
  if(LOOP.state==='take') TAKE.noteOn(n,MIC.vel);
  if(zone!=='none') noteOn(n,MIC.vel,'mic',zone==='pads'?{zone:'pads',pitch:n}:{zone:'keys'}); else lit(n,1);
  $('#micList').innerHTML=MIC.hist.slice(-16).map(h=>`<span class="chip-s">${noteName(h.n)}</span>`).join('');
  lcd(`SING ${noteName(n)}`);
}
function micNoteOff(){
  if(MIC.active==null) return; const n=MIC.active, zone=$('#micZone').value;
  const h=MIC.hist[MIC.hist.length-1]; if(h&&h.t1==null) h.t1=(performance.now()-MIC.t0)/1000;
  if(LOOP.state==='take') TAKE.noteOff();
  if(zone!=='none') noteOff(n,'mic'); else lit(n,-1);
  MIC.active=null;
}
function micLoop(){
  if(!MIC.on) return; MIC.raf=requestAnimationFrame(micLoop);
  MIC.an.getFloatTimeDomainData(MIC.buf);
  const r=MIC.det(MIC.buf,0), t=(performance.now()-MIC.t0)/1000, shift=+$('#micOct').value;
  if(MIC.calib<30){ MIC.calib++; (MIC.cal=MIC.cal||[]).push(r.rms); if(MIC.calib===30){ const so=[...MIC.cal].sort((a,b)=>a-b); MIC.floor=Math.min(0.02,so[Math.floor(so.length*0.2)]); MIC.cal=[]; } if(MIC.calib===30) $('#micStatus').textContent=LOOP.state==='take'?$('#micStatus').textContent:'Listening. Sing or hum one note at a time.'; return; }
  const gate=micGate(); $('#micLevel').style.width=Math.min(100,r.rms*600)+'%';
  MIC.env.push(r.rms); if(MIC.env.length>8) MIC.env.shift();
  const voiced=r.f>0 && r.clar>0.86 && r.rms>gate;
  if(voiced){
    MIC.med.push(ftom(r.f)); if(MIC.med.length>5) MIC.med.shift();
    const sorted=[...MIC.med].sort((a,b)=>a-b); let m=sorted[sorted.length>>1]+shift;
    const key=$('#micSnap').checked?PROJ.key:null; let n=Math.round(m); if(key) n=snapToKey(n,key);
    const cents=Math.round((m-Math.round(m))*100);
    MIC.trace.push({t,m}); MIC.silent=0;
    $('#micHz').textContent=r.f.toFixed(1)+' Hz'; $('#micCents').textContent=(cents>0?'+':'')+cents+'¢'; $('#micNeedle').style.left=`calc(${50+cents}% - 2px)`;
    MIC.vel=Math.round(clamp(45+r.rms*700,45,127));
    const reattack=MIC.active!=null && MIC.env.length>=6 && r.rms>Math.min(...MIC.env.slice(0,-1))*2.2 && r.rms>gate*2.5;
    if(MIC.active!=null && Math.abs(m-MIC.active)<0.7 && !reattack){ MIC.cand=null; MIC.candN=0; }
    else if(reattack && Math.abs(m-MIC.active)<0.7){ micNoteOff(); micNoteOn(n); MIC.env=[r.rms]; }
    else { if(n===MIC.cand) MIC.candN++; else { MIC.cand=n; MIC.candN=1; }
      if(MIC.candN>=3){ if(MIC.active!=null) micNoteOff(); micNoteOn(n); MIC.cand=null; MIC.candN=0; } }
    const bn=$('#micNote'); bn.textContent=noteName(MIC.active!=null?MIC.active:n); bn.classList.toggle('live',MIC.active!=null);
  } else {
    MIC.silent++; MIC.cand=null; MIC.candN=0; if(MIC.silent>3) MIC.med=[];
    if(MIC.silent>=5 && MIC.active!=null){ micNoteOff(); $('#micNote').classList.remove('live'); }
  }
  while(MIC.trace.length && MIC.trace[0].t<t-8) MIC.trace.shift();
  drawRoll(t);
}
function drawRoll(now){
  const cv=$('#micRoll'), dpr=devicePixelRatio||1, w=cv.clientWidth, h=cv.clientHeight; if(!w) return;
  if(cv.width!==Math.round(w*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h);
  const recent=MIC.hist.filter(x=>(x.t1||now)>now-8).map(x=>x.n), mid=recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:60, lo=Math.round(mid)-12, hi=lo+24;
  const X=t=>w-(now-t)/8*w, Y=m=>h-8-((m-lo)/(hi-lo))*(h-16);
  g.font='10px '+cssVar('--mono');
  for(let m=lo;m<=hi;m++){ if(m%12===0||m%12===7){ g.fillStyle=cssVar('--line'); g.fillRect(0,Y(m),w,1); g.fillStyle=cssVar('--muted'); g.fillText(noteName(m),4,Y(m)-2); } }
  g.fillStyle=cssVar('--accent');
  MIC.hist.forEach(x=>{ const t1=x.t1==null?now:x.t1; if(t1<now-8) return; const x0=Math.max(0,X(x.t0)), x1=X(t1); g.fillRect(x0,Y(x.n)-4,Math.max(3,x1-x0),8); if(x1-x0>22){ g.fillStyle='#1d1307'; g.fillText(noteName(x.n),x0+3,Y(x.n)+3); g.fillStyle=cssVar('--accent'); } });
  g.strokeStyle=cssVar('--signal'); g.lineWidth=1.5; g.beginPath(); let first=true, lastT=0;
  MIC.trace.forEach(p=>{ if(!first && p.t-lastT>0.1) first=true; const x=X(p.t), y=Y(p.m); first?g.moveTo(x,y):g.lineTo(x,y); first=false; lastT=p.t; }); g.stroke();
  if(!MIC.on && !MIC.hist.length){ g.fillStyle=cssVar('--muted'); g.font='13px '+cssVar('--body'); g.fillText('Your sung notes scroll here: bars are notes, the line is your exact pitch.',12,h/2); }
}
