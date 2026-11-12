
/* ---------- tempo ---------- */
function setTempo(b){
  b=clamp(Math.round(b*10)/10,40,240); if(!b) return;
  if(TR.running && A.ctx){ const now=A.ctx.currentTime, beat=(now-TR.t0)*CTRL.bpm/60; TR.t0=now-beat*60/b; TR.schedT=now; }
  CTRL.bpm=b; saveCtrl(); $('#bpm').value=b; $('#lcdTempo').textContent=b+' BPM'; FX.tempo(b); drawLoop();
}
$('#bpm').addEventListener('change',e=>setTempo(+e.target.value));
(function(){ const taps=[]; $('#tapBtn').onclick=()=>{ const t=performance.now(); if(taps.length && t-taps[taps.length-1]>2000) taps.length=0; taps.push(t); if(taps.length>6) taps.shift();
  if(taps.length>=3){ const iv=(taps[taps.length-1]-taps[0])/(taps.length-1); setTempo(60000/iv); } }; })();
[['metro','metro'],['countIn','countIn']].forEach(([id,k])=>{ const el=$('#'+id); el.checked=!!CTRL[k]; el.addEventListener('change',()=>{ CTRL[k]=el.checked; saveCtrl(); }); });
[['quant','quant'],['loopLen','loopLen']].forEach(([id,k])=>{ const el=$('#'+id); el.value=String(CTRL[k]); el.addEventListener('change',()=>{ CTRL[k]=+el.value; saveCtrl(); }); });

/* ---------- transport + looper ---------- */
const TR={running:false,t0:0,schedT:0};
const LAYER_COLORS=['#c8a96e','#8fae94','#c792ea','#7bd88f','#f2c14e','#ff7a90','#82aaff','#e8e4dc'];
const LOOP={
  state:'empty', L:0, fixed:0, layers:store.get('loopLayers',[]), pass:null, open:new Map(), voices:new Set(), lastPress:0, seq:0,
  capturing(){ return this.state==='counting'||this.state==='recording'||this.state==='overdub'; },
  rawBeat(){ return (A.ctx.currentTime-TR.t0)*CTRL.bpm/60; },
  capOn(key,n,v,inst,zone){
    if(!this.capturing()||!A.ctx) return;
    const raw=this.rawBeat(); if(raw<-0.5) return;
    this.open.set(key,{raw:Math.max(0,raw),n,v,inst,zone});
  },
  capOff(key){
    const o=this.open.get(key); if(!o) return; this.open.delete(key);
    const raw=A.ctx?this.rawBeat():o.raw, d=Math.max(0.06,raw-o.raw), q=CTRL.quant;
    let b=q?Math.round(o.raw/q)*q:o.raw;
    const e={b,d:Math.round(d*1000)/1000,n:o.n,v:Math.round(o.v*1000)/1000,inst:o.inst,raw:b};
    if(this.state==='overdub'||(this.state==='playing'&&this.L)){ e.cyc=Math.floor(b/this.L); e.b=mod(b,this.L); }
    this.layerFor(o.inst,o.zone).events.push(e);
    saveLoop(); renderLayers();
  },
  closeAll(){ [...this.open.keys()].forEach(k=>this.capOff(k)); },
  layerFor(inst,zone){
    if(!this.pass) this.pass=new Map();
    let ly=this.pass.get(inst);
    if(!ly){ const I=INST.get(inst); ly={id:'l'+Date.now().toString(36)+(this.seq++),inst,zone,name:I?I.name:inst,color:LAYER_COLORS[this.layers.length%LAYER_COLORS.length],events:[],mute:false}; this.layers.push(ly); this.pass.set(inst,ly); }
    return ly;
  }
};
if(LOOP.layers.length){ LOOP.L=store.get('loopLen',0)||0; LOOP.state=LOOP.L?'stopped':'empty'; if(!LOOP.L) LOOP.layers=[]; }
function saveLoop(){ store.set('loopLayers',LOOP.layers); store.set('loopLen',LOOP.L); }
const spb=()=>60/CTRL.bpm;
function trStart(t0){ TR.running=true; TR.t0=t0; TR.schedT=A.ctx.currentTime; }
function trStop(){ TR.running=false; if(A.ctx){ const t=A.ctx.currentTime; LOOP.voices.forEach(v=>v.kill(t)); } LOOP.voices.clear(); KB.pl.clear(); KB.els.forEach(el=>el.classList.remove('pl')); }
function loopPress(){
  const c=ensureAudio(); if(!c) return;
  const now=performance.now();
  if(now-LOOP.lastPress<350 && LOOP.state!=='empty'){ LOOP.lastPress=0; loopStop(); return; }
  LOOP.lastPress=now;
  switch(LOOP.state){
    case 'empty': startRecording(); break;
    case 'stopped': loopPlay(); break;
    case 'counting': loopStop(); break;
    case 'recording': finalizeFirst(); break;
    case 'playing': LOOP.state='overdub'; LOOP.pass=null; uiLoop(); break;
    case 'overdub': endOverdub(); break;
  }
}
function startRecording(){
  const c=A.ctx, now=c.currentTime; LOOP.layers=[]; LOOP.L=0; LOOP.pass=null; LOOP.open.clear(); LOOP.fixed=CTRL.loopLen*4;
  if(CTRL.countIn){ trStart(now+0.08+4*spb()); LOOP.state='counting'; } else { trStart(now+0.03); LOOP.state='recording'; }
  uiLoop(); renderLayers();
}
function finalizeFirst(){
  LOOP.closeAll();
  const raw=LOOP.rawBeat(), L=LOOP.fixed||Math.max(4,Math.round(raw/4)*4);
  LOOP.L=L;
  LOOP.layers=LOOP.layers.filter(ly=>ly.events.length);
  LOOP.layers.forEach(ly=>ly.events.forEach(e=>{ e.cyc=Math.floor(e.raw/L); e.b=mod(e.raw,L); }));
  LOOP.pass=null;
  if(!LOOP.layers.length){ trStop(); LOOP.state='empty'; LOOP.L=0; toast('Nothing was played, so no loop was recorded.'); }
  else { LOOP.state='playing'; if(LOOP.fixed) TR.schedT=Math.min(TR.schedT,TR.t0+L*spb()); }
  saveLoop(); uiLoop(); renderLayers();
}
function endOverdub(){ LOOP.closeAll(); LOOP.layers=LOOP.layers.filter(ly=>ly.events.length); LOOP.pass=null; LOOP.state='playing'; saveLoop(); uiLoop(); renderLayers(); }
function loopStop(){
  if(LOOP.state==='recording'){ finalizeFirst(); }
  if(LOOP.state==='overdub') endOverdub();
  if(LOOP.state==='counting'){ LOOP.state='empty'; }
  trStop();
  LOOP.state=LOOP.layers.length&&LOOP.L?'stopped':'empty';
  uiLoop();
}
function loopPlay(){
  const c=ensureAudio(); if(!c||!LOOP.layers.length||!LOOP.L) return;
  LOOP.layers.forEach(ly=>ly.events.forEach(e=>{ e.cyc=-1; }));
  trStart(c.currentTime+0.05); LOOP.state='playing'; uiLoop();
}
function loopUndo(){ if(!LOOP.layers.length) return; const ly=LOOP.layers.pop(); if(LOOP.pass) LOOP.pass.forEach((v,k)=>{ if(v===ly) LOOP.pass.delete(k); }); if(!LOOP.layers.length){ loopStop(); LOOP.L=0; LOOP.state='empty'; } saveLoop(); uiLoop(); renderLayers(); toast(`Removed layer “${ly.name}”`); }
function loopClear(){ trStop(); LOOP.layers=[]; LOOP.L=0; LOOP.pass=null; LOOP.open.clear(); LOOP.state='empty'; saveLoop(); uiLoop(); renderLayers(); }
$('#loopBtn').onclick=loopPress; $('#stopBtn').onclick=loopStop; $('#playBtn').onclick=()=>{ if(LOOP.state==='stopped') loopPlay(); else if(LOOP.state==='empty') toast('Record a loop first.'); };
$('#undoBtn').onclick=loopUndo; $('#clearBtn').onclick=loopClear;

function click(t,accent){ const c=A.ctx, o=osc(c,'sine',accent?1760:1175), g=env(c,t,accent?0.9:0.55,0.001,0.012); o.connect(g).connect(A.click); o.start(t); o.stop(t+0.08); }
function scheduleEvent(e,t,dur){
  const inst=INST.get(e.inst); if(!inst) return;
  let v; try{ v=inst.play(A.ctx,A.bus,e.n,e.v,t); }catch(err){ return; }
  if(!v) return; LOOP.voices.add(v); const prevEnd=v.onEnd; v.onEnd=()=>{ LOOP.voices.delete(v); if(prevEnd) prevEnd(); };
  if(!v.oneShot) v.release(t+dur);
  if(!inst.percussive){ const now=A.ctx.currentTime, n=e.n; setTimeout(()=>{ if(TR.running) litPl(n,1); setTimeout(()=>litPl(n,-1),Math.max(60,dur*1000)); },Math.max(0,(t-now)*1000)); }
}
function tick(){
  if(!A.ctx||!TR.running) return;
  const c=A.ctx, now=c.currentTime, s=spb(), ahead=now+0.12;
  if(LOOP.state==='counting' && now>=TR.t0-0.004){ LOOP.state='recording'; uiLoop(); }
  if(LOOP.state==='recording' && LOOP.fixed && now>=TR.t0+LOOP.fixed*s){ finalizeFirst(); }
  const b0=(TR.schedT-TR.t0)/s, b1=(ahead-TR.t0)/s;
  if(b1>b0){
    for(let k=Math.ceil(b0-1e-9);k<b1;k++){
      const counting=LOOP.state==='counting'&&k<0;
      if(counting || (CTRL.metro && k>=0 && LOOP.state!=='stopped')) click(TR.t0+k*s, mod(k,4)===0);
    }
    if(LOOP.L>0 && (LOOP.state==='playing'||LOOP.state==='overdub')){
      const L=LOOP.L;
      for(const ly of LOOP.layers){ if(ly.mute) continue;
        for(const e of ly.events){
          for(let k=Math.ceil((b0-e.b)/L-1e-9); k*L+e.b<b1; k++){
            if(k<0 || (e.cyc!=null && k<=e.cyc)) continue;
            const B=k*L+e.b; if(B<b0) continue;
            scheduleEvent(e,TR.t0+B*s,e.d*s);
          }
        }
      }
    }
  }
  TR.schedT=ahead;
}
setInterval(tick,25);

function uiLoop(){
  const st=LOOP.state, btn=$('#loopBtn');
  btn.dataset.state=st;
  const lbl={empty:'Record loop',counting:'Count-in…',recording:LOOP.fixed?'Recording…':'Recording · press to close',playing:'Overdub',overdub:'Overdubbing · press to play',stopped:'Play loop'}[st];
  $('#loopLbl').textContent=lbl;
  $('#loopLed').className='led'+(st==='recording'||st==='overdub'?' rec':st==='playing'?' on':st==='counting'?' warn':'');
  const pill={empty:'Looper empty',counting:'Count-in',recording:'Recording',playing:`Playing · ${LOOP.L/4} bar${LOOP.L===4?'':'s'}`,overdub:'Overdubbing',stopped:`Loop ready · ${LOOP.L/4} bar${LOOP.L===4?'':'s'}`}[st];
  $('#loopPill').innerHTML=`<span class="${$('#loopLed').className}"></span><span>${pill}</span>`;
  lcd({counting:'LOOP COUNT-IN',recording:'LOOP REC',playing:'LOOP PLAY',overdub:'LOOP OVERDUB',stopped:'LOOP STOP',empty:'LOOP CLEAR'}[st]);
  const has=LOOP.layers.length>0&&LOOP.L>0;
  $('#exportZip').disabled=!has; $('#exportMid').disabled=!has; $('#undoBtn').disabled=!LOOP.layers.length; $('#playBtn').disabled=st!=='stopped';
}
function renderLayers(){
  const box=$('#layers');
  if(!LOOP.layers.length){ box.innerHTML='<div class="custom-empty">No layers yet. Press Record loop (or your controller’s loop button), play, then press again to close the loop. Each sound you play becomes its own layer.</div>'; return; }
  box.innerHTML=LOOP.layers.map((ly,i)=>`<div class="layer${ly.mute?' muted':''}"><span class="sw" style="background:${ly.color}"></span><span><b>${i+1}. ${esc(ly.name)}</b> <span class="meta">${ly.zone==='pads'?'pads':'keys'} · ${ly.events.length} notes</span></span><span class="meta">${LOOP.L?LOOP.L/4+' bars':'recording'}</span><button class="btn small ghost" type="button" data-lmute="${i}" aria-pressed="${ly.mute}">${ly.mute?'Unmute':'Mute'}</button><button class="btn small ghost" type="button" data-ldel="${i}">Delete</button></div>`).join('');
}
$('#layers').addEventListener('click',e=>{
  const m=e.target.closest('[data-lmute]'); if(m){ const ly=LOOP.layers[+m.dataset.lmute]; ly.mute=!ly.mute; saveLoop(); renderLayers(); return; }
  const d=e.target.closest('[data-ldel]'); if(d){ LOOP.layers.splice(+d.dataset.ldel,1); if(!LOOP.layers.length){ loopClear(); } saveLoop(); renderLayers(); uiLoop(); }
});
function drawLoop(){
  const cv=$('#loopCanvas'), dpr=devicePixelRatio||1, w=cv.clientWidth, h=cv.clientHeight; if(!w) return;
  if(cv.width!==Math.round(w*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); }
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,h);
  const mut=cssVar('--muted'), line=cssVar('--line'), mono='11px '+cssVar('--mono');
  let L=LOOP.L, raw=0; if(TR.running&&A.ctx) raw=LOOP.rawBeat();
  if(!L) L=Math.max(4,LOOP.fixed||Math.ceil(Math.max(raw,0.01)/4)*4);
  const top=18, ph=h-top-6, bw=w/L;
  for(let b=0;b<=L;b++){ g.fillStyle=b%4===0?mut:line; g.fillRect(Math.min(w-1,b*bw),top,1,ph); if(b%4===0&&b<L){ g.font=mono; g.fillText('Bar '+(b/4+1),b*bw+4,12); } }
  const all=[]; LOOP.layers.forEach(ly=>ly.events.forEach(e=>all.push(e.n)));
  const lo=all.length?Math.min(...all)-1:48, hi=all.length?Math.max(...all)+1:72, rng=Math.max(12,hi-lo);
  LOOP.layers.forEach(ly=>{ g.fillStyle=ly.mute?line:ly.color; ly.events.forEach(e=>{ const x=mod(e.b,L)*bw, y=top+ph-((e.n-lo)/rng)*ph; g.fillRect(x,y-2,Math.max(2,e.d*bw),4); }); });
  if(TR.running){ const pos=LOOP.L?mod(raw,LOOP.L):Math.max(0,raw); g.fillStyle=LOOP.state==='recording'||LOOP.state==='overdub'?cssVar('--rec'):LOOP.state==='counting'?cssVar('--warn'):cssVar('--signal'); g.fillRect(Math.min(w-2,pos*bw),top,2,ph);
    if(LOOP.state==='counting'){ g.font='600 22px '+cssVar('--display'); g.fillText('Count-in '+(4+Math.floor(raw)+1),w/2-60,top+ph/2+8); } }
  else if(!LOOP.layers.length){ g.fillStyle=mut; g.font='13px '+cssVar('--body'); g.fillText('Press Record loop to start. The metronome counts you in.',12,top+ph/2+4); }
}
(function loopAnim(){ requestAnimationFrame(loopAnim); if(TR.running) drawLoop(); })();

/* ---------- export: MIDI, WAV, zip ---------- */
function vlq(n){ const b=[n&0x7F]; while(n>>=7) b.unshift((n&0x7F)|0x80); return b; }
function strBytes(s){ return Array.from(new TextEncoder().encode(s)); }
function midiTrack(events){ const out=[]; let last=0; events.sort((a,b)=>a.t-b.t||a.o-b.o).forEach(e=>{ out.push(...vlq(e.t-last),...e.d); last=e.t; }); out.push(0,0xFF,0x2F,0); return [0x4D,0x54,0x72,0x6B,(out.length>>>24)&255,(out.length>>>16)&255,(out.length>>>8)&255,out.length&255,...out]; }
function buildMidi(layers,bpm,L,title){
  const PPQ=480, tempo=Math.round(60000000/bpm), tracks=[];
  tracks.push(midiTrack([{t:0,o:0,d:[0xFF,0x03,...vlq(strBytes(title).length),...strBytes(title)]},{t:0,o:1,d:[0xFF,0x51,0x03,(tempo>>16)&255,(tempo>>8)&255,tempo&255]},{t:0,o:2,d:[0xFF,0x58,0x04,4,2,24,8]},{t:L*PPQ,o:3,d:[0xFF,0x01,1,0x20]}]));
  let nextCh=0; const takeCh=()=>{ if(nextCh===9) nextCh++; return (nextCh++)%16; };
  layers.forEach(ly=>{ const I=INST.get(ly.inst)||{}, drum=!!I.percussive&&!I.custom, ch=drum?9:takeCh(), name=ly.name;
    const ev=[{t:0,o:0,d:[0xFF,0x03,...vlq(strBytes(name).length),...strBytes(name)]}];
    if(!drum) ev.push({t:0,o:1,d:[0xC0|ch,(I.gm||0)&127]});
    ly.events.forEach(e=>{ const t0=Math.round(e.b*PPQ), t1=Math.min(L*PPQ,t0+Math.max(10,Math.round(e.d*PPQ))), n=clamp(Math.round(e.n),0,127), v=clamp(Math.round(e.v*127),1,127);
      ev.push({t:t0,o:3,d:[0x90|ch,n,v]},{t:t1,o:2,d:[0x80|ch,n,0]}); });
    ev.push({t:L*PPQ,o:4,d:[0xFF,0x01,1,0x20]});
    tracks.push(midiTrack(ev)); });
  const head=[0x4D,0x54,0x68,0x64,0,0,0,6,0,1,(tracks.length>>8)&255,tracks.length&255,(PPQ>>8)&255,PPQ&255];
  return new Uint8Array([...head,...tracks.flat()]);
}
async function renderAudio(layers,bpm,L){
  const sr=44100, s=60/bpm, len=L*s, OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext, oc=new OAC(2,Math.ceil(sr*len*2),sr);
  await FX.loadIR(oc);
  const inp=oc.createGain(), out=oc.createGain(), comp=oc.createDynamicsCompressor(); comp.threshold.value=-10; comp.knee.value=8; comp.ratio.value=4; comp.attack.value=0.003; comp.release.value=0.2;
  out.gain.value=Math.pow(CTRL.volume/100,2); out.connect(comp).connect(oc.destination);
  FX.build(oc,inp,out,FX.slots,{noRepeat:true,bpm});
  for(const ly of layers){ const I=INST.get(ly.inst); if(!I) continue; if(I.set) await loadSet(I.set,{loop:/strings|choir|brass/.test(I.set)}).catch(()=>{});
    for(let cyc=0;cyc<2;cyc++) for(const e of ly.events){ const t=(cyc*L+e.b)*s; if(t>=2*len) continue; const v=I.play(oc,inp,e.n,e.v,t); if(v && !v.oneShot) v.release(t+e.d*s); } }
  const buf=await oc.startRendering(), a=Math.round(len*sr), n=Math.round(len*sr);
  return [buf.getChannelData(0).slice(a,a+n),buf.getChannelData(1).slice(a,a+n)];
}
function wavBytes(chs,sr){
  const n=chs[0].length, nc=chs.length, bytes=44+n*nc*2, b=new ArrayBuffer(bytes), v=new DataView(b); let o=0;
  const w4=s=>{ for(let i=0;i<4;i++) v.setUint8(o++,s.charCodeAt(i)); }, u32=x=>{ v.setUint32(o,x,true); o+=4; }, u16=x=>{ v.setUint16(o,x,true); o+=2; };
  w4('RIFF'); u32(bytes-8); w4('WAVE'); w4('fmt '); u32(16); u16(1); u16(nc); u32(sr); u32(sr*nc*2); u16(nc*2); u16(16); w4('data'); u32(n*nc*2);
  for(let i=0;i<n;i++) for(let c=0;c<nc;c++){ const x=clamp(chs[c][i],-1,1); v.setInt16(o,x<0?x*0x8000:x*0x7FFF,true); o+=2; }
  return new Uint8Array(b);
}
const CRC_T=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u){ let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=CRC_T[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zipBytes(files){
  const parts=[], central=[]; let off=0; const d=new Date(), dt=((d.getFullYear()-1980)<<25)|((d.getMonth()+1)<<21)|(d.getDate()<<16)|(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  for(const f of files){ const name=new TextEncoder().encode(f.name), data=f.data, crc=crc32(data);
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true); h.setUint32(10,dt,true); h.setUint32(14,crc,true); h.setUint32(18,data.length,true); h.setUint32(22,data.length,true); h.setUint16(26,name.length,true); h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),name,data);
    const cd=new DataView(new ArrayBuffer(46)); cd.setUint32(0,0x02014b50,true); cd.setUint16(4,20,true); cd.setUint16(6,20,true); cd.setUint16(8,0x0800,true); cd.setUint16(10,0,true); cd.setUint32(12,dt,true); cd.setUint32(16,crc,true); cd.setUint32(20,data.length,true); cd.setUint32(24,data.length,true); cd.setUint16(28,name.length,true); cd.setUint32(42,off,true);
    central.push(new Uint8Array(cd.buffer),name); off+=30+name.length+data.length; }
  const csize=central.reduce((a,x)=>a+x.length,0), e=new DataView(new ArrayBuffer(22)); e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,csize,true); e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/zip'});
}
const DL={tried:false,ns:null};
async function getDownloads(){ if(DL.tried) return DL.ns; DL.tried=true; try{ if(window.claude&&typeof window.claude.use==='function') DL.ns=await window.claude.use('downloads'); }catch(e){ DL.ns=null; } return DL.ns; }
const DL_OK=/\.(zip|json|txt|csv|md|html|pdf)$/i;
async function saveFile(name,blob){
  const dl=await getDownloads();
  if(dl){
    if(!DL_OK.test(name)){ const u=new Uint8Array(await blob.arrayBuffer()); blob=zipBytes([{name,data:u}]); name=name.replace(/\.[a-z0-9]+$/i,'')+'.zip'; }
    try{ await dl.save({filename:name,data:blob}); return 'saved'; }catch(e){ if(e&&e.code==='declined') return 'declined'; throw new Error(e&&e.message||'Download unavailable here'); }
  }
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); return 'saved';
}
const safeName=s=>s.replace(/[\\/:*?"<>|]+/g,'').trim()||'Layer';
async function exportZip(){
  if(!LOOP.layers.length||!LOOP.L) return;
  const st=$('#exportStatus'), bpm=CTRL.bpm, L=LOOP.L, bars=L/4, base=`StudioKeys ${bpm}bpm ${bars}bar${bars>1?'s':''}`, layers=LOOP.layers.filter(l=>!l.mute);
  if(!layers.length){ st.textContent='All layers are muted.'; return; }
  const btn=$('#exportZip'); btn.disabled=true;
  try{
    const files=[];
    st.textContent='Rendering the mix…'; await nextFrame();
    files.push({name:`${base}/${base} Mix.wav`,data:wavBytes(await renderAudio(layers,bpm,L),44100)});
    for(let i=0;i<layers.length;i++){ st.textContent=`Rendering stem ${i+1} of ${layers.length}…`; await nextFrame();
      files.push({name:`${base}/Stems/${String(i+1).padStart(2,'0')} ${safeName(layers[i].name)}.wav`,data:wavBytes(await renderAudio([layers[i]],bpm,L),44100)}); }
    files.push({name:`${base}/MIDI/${base} All layers.mid`,data:buildMidi(layers,bpm,L,base)});
    layers.forEach((ly,i)=>files.push({name:`${base}/MIDI/${String(i+1).padStart(2,'0')} ${safeName(ly.name)}.mid`,data:buildMidi([ly],bpm,L,ly.name)}));
    const fxs=FX.slots.filter(s=>s.amount!==FX_LIB[s.type].neutral&&s.type!=='repeat').map(s=>`${FX_LIB[s.type].name} ${Math.round(s.amount*100)}%`).join(', ')||'none';
    files.push({name:`${base}/README.txt`,data:new TextEncoder().encode(`Studio Keys loop pack\n\nTempo: ${bpm} BPM\nLength: ${bars} bar${bars>1?'s':''} in 4/4 (${(L*60/bpm).toFixed(3)} s)\nLayers: ${layers.map((l,i)=>`${i+1}. ${l.name}`).join(', ')}\nEffects printed into the WAV files: ${fxs}\n\nIn Ableton Live: set the project tempo to ${bpm}, then drag the WAV files (Mix or Stems) or the MIDI files into clip slots. Every file is exactly one loop long and loops seamlessly, including reverb and echo tails.\nThe MIDI files keep the notes editable; load any instrument on those tracks.\n`)});
    st.textContent='Packing the zip…'; await nextFrame();
    const r=await saveFile(`${base}.zip`,zipBytes(files));
    st.textContent=r==='declined'?'Download cancelled.':`Downloaded ${base}.zip`;
  }catch(e){ console.error(e); st.textContent='Export failed: '+e.message; }
  btn.disabled=false;
}
async function exportMidiOnly(){
  if(!LOOP.layers.length||!LOOP.L) return;
  const bpm=CTRL.bpm, L=LOOP.L, bars=L/4, base=`StudioKeys ${bpm}bpm ${bars}bar${bars>1?'s':''}`, st=$('#exportStatus');
  try{ const r=await saveFile(`${base}.mid`,new Blob([buildMidi(LOOP.layers.filter(l=>!l.mute),bpm,L,base)],{type:'audio/midi'})); st.textContent=r==='declined'?'Download cancelled.':'MIDI downloaded.'; }
  catch(e){ st.textContent='Export failed: '+e.message; }
}
$('#exportZip').onclick=exportZip; $('#exportMid').onclick=exportMidiOnly;
