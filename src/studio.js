
/* ---------- song project: tracks, transport, recording, takes, saving, export ---------- */
const TRACK_COLORS=['#2fd39a','#9fe3c8','#7fb8e6','#f0a3b1','#e6d29a','#b9a3e3','#5cc8d0','#c6e07a','#ef8f8f','#e8ece4'];
const newProject=()=>({id:'p'+Date.now().toString(36),name:'Untitled song',bars:4,key:null,style:null,tracks:[]});
/* owner, 13 Nov: the app opens on a new empty song; the last one is saved into the songs list by boot.js */
const LAST_PROJ=(()=>{ const p=store.get('project',null); return p&&typeof p==='object'?Object.assign(newProject(),p):null; })();
let PROJ=LAST_PROJ&&!(LAST_PROJ.tracks||[]).length&&!LAST_PROJ.sections?LAST_PROJ:newProject();
/* older versions saved the raw voice of every sung take as its own track; drop those (voice notes stay) */
function dropTakeVoices(p){ if(p&&p.tracks) p.tracks=p.tracks.filter(t=>!(t.kind==='audio'&&/-voice$/.test(t.take||''))); return p; }
dropTakeVoices(PROJ); if(LAST_PROJ) dropTakeVoices(LAST_PROJ);
const AUD=new Map();
let projSaveT=0;
function serialize(p){ return JSON.parse(JSON.stringify(p)); }
function saveProject(){ clearTimeout(projSaveT); projSaveT=setTimeout(()=>store.set('project',serialize(PROJ)),250); if(typeof autoSaveNamed==='function'){ $('#saveState').textContent='Saving…'; autoSaveNamed(); } }
const roleOfInst=inst=>{ const I=INST.get(inst)||{}; return I.drums?'drums':I.cat==='Bass'?'bass':'free'; };
function makeTrack(o){
  const role=o.role||'free', mix=ROLE_MIX[role]||ROLE_MIX.free, I=INST.get(o.inst);
  return Object.assign({id:'t'+Date.now().toString(36)+Math.floor(Math.random()*1e4),kind:'notes',role,inst:o.inst,zone:o.zone||'keys',name:o.name||(I?I.name:ROLE_NAME[role]),
    color:TRACK_COLORS[PROJ.tracks.length%TRACK_COLORS.length],events:[],vol:mix.vol,lo:mix.lo,mid:mix.mid,hi:mix.hi,mute:false,solo:false,fx:(o.kind==='audio'&&role==='voice'&&!o.take)?{}:roleFx(role,PROJ.style)},o);
}
const pickGen=o=>{ const g={}; ['recipe','seed','style','ref','desc'].forEach(k=>{ if(o[k]!==undefined) g[k]=o[k]; }); return g; };
function addTrack(o,{replaceRole}={}){
  if(replaceRole){ const old=PROJ.tracks.find(t=>t.role===replaceRole&&t.kind==='notes'&&t.gen); if(old){ Object.assign(old,{events:o.events,inst:o.inst||old.inst,name:o.name||old.name},pickGen(o)); saveProject(); renderTracks(); return old; } }
  const t=makeTrack(o); PROJ.tracks.push(t); saveProject(); renderTracks(); uiLoop(); return t;
}
function removeTrack(id){ const i=PROJ.tracks.findIndex(t=>t.id===id); if(i<0) return; const t=PROJ.tracks.splice(i,1)[0]; const st=A.ts&&A.ts.get(id); if(st){ try{ st.out.disconnect(); }catch(e){} A.ts.delete(id); }  if(!PROJ.tracks.length) loopClear(); saveProject(); renderTracks(); uiLoop(); return t; }
function setBars(n){
  n=[1,2,4,8,16].reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,4); const oldL=PROJ.bars*4, L=n*4; if(L===oldL) return;
  const fit=ev=>{ if(L>oldL){ const add=[]; for(let off=oldL;off<L;off+=oldL) ev.forEach(e=>{ if(e.b+off<L) add.push(Object.assign({},e,{b:e.b+off,cyc:undefined})); }); return ev.concat(add); } return ev.filter(e=>e.b<L); };
  PROJ.tracks.forEach(t=>{ if(t.kind!=='notes') return; t.events=fit(t.events); Object.values(t.patterns||{}).forEach(p=>{ p.events=fit(p.events||[]); }); });
  PROJ.bars=n; $('#barsSel').value=String(n); saveProject(); renderTracks(); uiLoop();
}
function setKey(k){
  const old=PROJ.key; PROJ.key=k;
  if(old && k && old.tonic!==k.tonic){ let d=mod(k.tonic-old.tonic,12); if(d>6) d-=12; PROJ.tracks.forEach(t=>{ if(t.kind==='notes' && !(INST.get(t.inst)||{}).percussive) [t.events,...Object.values(t.patterns||{}).map(p=>p.events||[])].forEach(ev=>ev.forEach(e=>e.n+=d)); }); }
  $('#keySel').value=k?`${k.tonic}:${k.mode}`:''; saveProject(); renderTracks();
}
$('#keySel').innerHTML='<option value="">Key: auto</option>'+['major','minor'].map(m=>PC_NAMES.map((n,i)=>`<option value="${i}:${m}">${n} ${m}</option>`).join('')).join('');
$('#keySel').addEventListener('change',e=>{ const v=e.target.value; setKey(v?{tonic:+v.split(':')[0],mode:v.split(':')[1]}:null); });
$('#barsSel').addEventListener('change',e=>setBars(+e.target.value));
$('#projName').addEventListener('input',e=>{ PROJ.name=e.target.value.slice(0,60)||'Untitled song'; saveProject(); });
$('#addBars').onclick=()=>setBars(PROJ.bars*2);

/* ---------- tempo ---------- */
function setTempo(b){
  b=clamp(Math.round(b*10)/10,40,240); if(!b) return;
  if(TR.running && A.ctx){ const now=A.ctx.currentTime, beat=(now-TR.t0)*CTRL.bpm/60; if(songOn()) songRetempo(now); TR.t0=now-beat*60/b; TR.schedT=now; }
  CTRL.bpm=b; saveCtrl(); $('#bpm').value=b; $('#lcdTempo').textContent=b+' BPM'; FX.tempo(b); if(A.sends) A.sends.setTempo(b);
}
$('#bpm').addEventListener('change',e=>setTempo(+e.target.value));
(function(){ const taps=[]; $('#tapBtn').onclick=()=>{ const t=performance.now(); if(taps.length && t-taps[taps.length-1]>2000) taps.length=0; taps.push(t); if(taps.length>6) taps.shift();
  if(taps.length>=3){ const iv=(taps[taps.length-1]-taps[0])/(taps.length-1); setTempo(60000/iv); } }; })();
[['metro','metro'],['countIn','countIn']].forEach(([id,k])=>{ const el=$('#'+id); el.checked=!!CTRL[k]; el.addEventListener('change',()=>{ CTRL[k]=el.checked; saveCtrl(); }); });
[['quant','quant'],['loopLen','loopLen']].forEach(([id,k])=>{ const el=$('#'+id); el.value=String(CTRL[k]); el.addEventListener('change',()=>{ CTRL[k]=+el.value; saveCtrl(); }); });

/* ---------- transport and recording ---------- */
const TR={running:false,t0:0,schedT:0};
const LOOP={
  state:PROJ.tracks.length?'stopped':'empty', after:null, fixed:0, pass:null, open:new Map(), voices:new Set(), lastPress:0,
  get L(){ return PROJ.tracks.length?PROJ.bars*4:0; },
  capturing(){ return this.state==='counting'||this.state==='recording'||this.state==='overdub'; },
  rawBeat(){ return (A.ctx.currentTime-TR.t0)*CTRL.bpm/60; },
  capOn(key,n,v,inst,zone){ if(!this.capturing()||!A.ctx||this.after==='take') return; const raw=this.rawBeat(); if(raw<-0.5) return; this.open.set(key,{raw:Math.max(0,raw),n,v,inst,zone}); },
  capOff(key){
    const o=this.open.get(key); if(!o) return; this.open.delete(key);
    const raw=A.ctx?this.rawBeat():o.raw, d=Math.max(0.06,raw-o.raw), q=CTRL.quant;
    const b=q?Math.round(o.raw/q)*q:o.raw, e={b,d:Math.round(d*1000)/1000,n:o.n,v:Math.round(o.v*1000)/1000,raw:b};
    if(this.state==='overdub'){ const L=PROJ.bars*4; e.cyc=Math.floor(b/L); e.b=mod(b,L); }
    this.trackFor(o.inst,o.zone).events.push(e); saveProject(); renderTracks();
  },
  closeAll(){ [...this.open.keys()].forEach(k=>this.capOff(k)); },
  trackFor(inst,zone){ if(!this.pass) this.pass=new Map(); let t=this.pass.get(inst); if(!t){ t=makeTrack({inst,zone,role:roleOfInst(inst)}); PROJ.tracks.push(t); this.pass.set(inst,t); } return t; }
};
const spb=()=>60/CTRL.bpm;
function trStart(t0){ TR.running=true; TR.t0=t0; TR.schedT=A.ctx.currentTime; }
function trStop(){ TR.running=false; if(A.ctx){ const t=A.ctx.currentTime; LOOP.voices.forEach(v=>v.kill(t)); } LOOP.voices.clear(); KB.pl.clear(); KB.els.forEach(el=>el.classList.remove('pl')); }
function countInto(after){ const c=A.ctx; LOOP.after=after; if(CTRL.countIn){ trStart(c.currentTime+0.08+4*spb()); LOOP.state='counting'; } else { trStart(c.currentTime+0.05); beginAfterCount(); } uiLoop(); }
function beginAfterCount(){ const a=LOOP.after; LOOP.state=a==='take'?'take':a==='overdub'?'overdub':'recording'; if(a==='take') TAKE.begin(); uiLoop(); }
/* recording, overdubs and sung takes go into the loop (pattern A), so Song mode hands over to Loop first */
function songToLoopForRec(){ if(!songOn()) return false; loopStop(); songMode('loop'); toast('Recording in Loop mode: what you play goes into the loop. Switch back to Song to hear the whole song.'); return true; }
function loopPress(){
  const c=ensureAudio(); if(!c) return;
  if(songOn()&&LOOP.state==='playing'){ songToLoopForRec(); recordPress(); return; }
  const now=performance.now();
  if(now-LOOP.lastPress<350 && LOOP.state!=='empty'){ LOOP.lastPress=0; loopStop(); return; }
  LOOP.lastPress=now;
  switch(LOOP.state){
    case 'empty': startFirstRecording(); break;
    case 'stopped': loopPlay(); break;
    case 'counting': loopStop(); break;
    case 'recording': finalizeFirst(); break;
    case 'playing': LOOP.state='overdub'; LOOP.pass=null; LOOP.after='overdub'; uiLoop(); break;
    case 'overdub': endOverdub(); break;
    case 'take': break;
  }
}
function recordPress(){ const c=ensureAudio(); if(!c) return; if(songOn()&&PROJ.tracks.length) songToLoopForRec(); if(LOOP.state==='empty') startFirstRecording(); else if(LOOP.state==='stopped'){ LOOP.pass=null; PROJ.tracks.forEach(t=>{ t.cyc=-1; t.events.forEach(e=>{ e.cyc=-1; }); }); countInto('overdub'); } else if(LOOP.state==='playing'){ LOOP.state='overdub'; LOOP.pass=null; uiLoop(); } else if(LOOP.state==='overdub') endOverdub(); else if(LOOP.state==='recording') finalizeFirst(); }
function startFirstRecording(){ LOOP.pass=null; LOOP.open.clear(); LOOP.fixed=CTRL.loopLen*4; countInto('recording'); }
function finalizeFirst(){
  LOOP.closeAll();
  const raw=LOOP.rawBeat(), L=LOOP.fixed||Math.max(4,Math.round(raw/4)*4);
  PROJ.tracks=PROJ.tracks.filter(t=>t.kind!=='notes'||t.events.length);
  PROJ.bars=L/4; $('#barsSel').value=String(PROJ.bars);
  PROJ.tracks.forEach(t=>t.events.forEach(e=>{ if(e.raw!=null){ e.cyc=Math.floor(e.raw/L); e.b=mod(e.raw,L); delete e.raw; } }));
  LOOP.pass=null;
  if(!PROJ.tracks.length){ trStop(); LOOP.state='empty'; toast('Nothing was played, so no loop was recorded.'); }
  else { LOOP.state='playing'; if(LOOP.fixed) TR.schedT=Math.min(TR.schedT,TR.t0+L*spb()); }
  saveProject(); uiLoop(); renderTracks();
}
function endOverdub(){ LOOP.closeAll(); PROJ.tracks=PROJ.tracks.filter(t=>t.kind!=='notes'||t.events.length); PROJ.tracks.forEach(t=>t.events.forEach(e=>delete e.raw)); LOOP.pass=null; LOOP.state='playing'; saveProject(); uiLoop(); renderTracks(); }
function loopStop(){
  if(typeof PREVIEW!=='undefined' && PREVIEW){ PREVIEW=null; setTimeout(()=>{ refreshTrackGains(); renderTracks(); },0); }
  if(LOOP.state==='recording') finalizeFirst();
  if(LOOP.state==='overdub') endOverdub();
  if(LOOP.state==='take') TAKE.cancel();
  trStop(); SONG.segs=[]; SONG.endT=0; LOOP.state=PROJ.tracks.length?'stopped':'empty'; uiLoop();
}
function loopPlay(){
  const c=ensureAudio(); if(!c||!PROJ.tracks.length) return;
  PROJ.tracks.forEach(t=>{ t.cyc=-1; t.events.forEach(e=>{ e.cyc=-1; }); });
  if(songOn()){ songStartAt(c.currentTime+0.06,SONG.cursor); LOOP.state='playing'; uiLoop(); return; }
  trStart(c.currentTime+0.06); LOOP.state='playing'; uiLoop();
}
function loopClear(){ trStop(); LOOP.pass=null; LOOP.open.clear(); LOOP.state='empty'; uiLoop(); }
$('#loopBtn').onclick=loopPress; $('#recBtn').onclick=recordPress; $('#stopBtn').onclick=loopStop;
$('#playBtn').onclick=()=>{ if(LOOP.state==='stopped') loopPlay(); else if(LOOP.state==='empty') toast('Add a track or record something first.'); };


function click(t,accent){ const c=A.ctx, o=osc(c,'sine',accent?1760:1175), g=env(c,t,accent?0.9:0.55,0.001,0.012); o.connect(g).connect(A.click); o.start(t); o.stop(t+0.08); }
function scheduleEvent(tr,e,t,dur){
  const inst=INST.get(tr.inst); if(!inst) return;
  if(isKick(tr,e.n)){ const ducks=PROJ.tracks.filter(x=>x!==tr&&x.fx&&x.fx.duck>0&&trackAudible(x)).map(x=>[trackStrip(x),x.fx.duck]); if(ducks.length) duckAt(A.ctx,ducks,t); }
  let v; try{ v=inst.play(A.ctx,trackStrip(tr).inp,e.n,e.v,t); }catch(err){ return; }
  if(!v) return; LOOP.voices.add(v); const prevEnd=v.onEnd; v.onEnd=()=>{ LOOP.voices.delete(v); if(prevEnd) prevEnd(); };
  if(!v.oneShot) v.release(t+dur);
  if(!inst.percussive){ const now=A.ctx.currentTime, n=e.n; setTimeout(()=>{ if(TR.running) litPl(n,1); setTimeout(()=>litPl(n,-1),Math.max(60,dur*1000)); },Math.max(0,(t-now)*1000)); }
}
function scheduleAudioAt(tr,t,maxSec){
  const buf=AUD.get(tr.id); if(!buf) return; const c=A.ctx, off=Math.min(tr.trim||0,buf.duration), dur=Math.min(buf.duration-off,maxSec); if(dur<=0.01) return;
  const s=c.createBufferSource(); s.buffer=buf; s.connect(trackStrip(tr).inp); s.start(t,off,dur);
  const h={kill(x){ try{ s.stop(x); }catch(e){} }}; LOOP.voices.add(h); s.onended=()=>LOOP.voices.delete(h);
}
function scheduleAudio(tr,t,L){
  const buf=AUD.get(tr.id); if(!buf) return; const c=A.ctx, st=(tr.start||0)*spb(), off=Math.min(tr.trim||0,buf.duration), dur=Math.min(buf.duration-off,L*spb()-st); if(dur<=0.01) return;
  const s=c.createBufferSource(); s.buffer=buf; s.connect(trackStrip(tr).inp); s.start(t+st,off,dur);
  const h={kill(x){ try{ s.stop(x); }catch(e){} }}; LOOP.voices.add(h); s.onended=()=>LOOP.voices.delete(h);
}
const PLAYING=new Set(['playing','overdub','take']);
function tick(){
  if(!A.ctx||!TR.running) return;
  const c=A.ctx, now=c.currentTime, s=spb(), ahead=now+0.12;
  if(LOOP.state==='counting' && now>=TR.t0-0.004) beginAfterCount();
  if(LOOP.state==='recording' && LOOP.fixed && now>=TR.t0+LOOP.fixed*s) finalizeFirst();
  if(LOOP.state==='take' && now>=TR.t0+PROJ.bars*4*s) TAKE.finish();
  if(songOn() && LOOP.state==='playing'){ songTick(now,ahead); TR.schedT=ahead; return; }
  const b0=(TR.schedT-TR.t0)/s, b1=(ahead-TR.t0)/s;
  if(b1>b0){
    for(let k=Math.ceil(b0-1e-9);k<b1;k++){ const counting=LOOP.state==='counting'&&k<0; if(counting||(CTRL.metro&&k>=0&&LOOP.state!=='stopped')) click(TR.t0+k*s,mod(k,4)===0); }
    const L=LOOP.L;
    if(L>0 && PLAYING.has(LOOP.state)){
      for(const tr of PROJ.tracks){ if(!trackAudible(tr)) continue;
        if(tr.kind==='audio'){ for(let k=Math.max(0,Math.ceil(b0/L-1e-9)); k*L<b1; k++){ if(tr.cyc!=null && k<=tr.cyc) continue; if(k*L>=b0) scheduleAudio(tr,TR.t0+k*L*s,L); } continue; }
        for(const e of tr.events){
          for(let k=Math.ceil((b0-e.b)/L-1e-9); k*L+e.b<b1; k++){ if(k<0 || (e.cyc!=null && k<=e.cyc)) continue; const B=k*L+e.b; if(B<b0) continue; scheduleEvent(tr,e,TR.t0+B*s,e.d*s); }
        }
      }
    }
  }
  TR.schedT=ahead;
}
setInterval(tick,25);

/* ---------- sung takes: notes + raw voice, recorded for one pass of the song ---------- */
/* turn sung notes into a part: bass drops into the bass register and holds to the next note, chords build a
   diatonic chord on each sung note, melody stays as sung */
const PART_NAME={bass:'Sung bassline',chords:'Sung chords',melody:'Sung melody'};
function partInst(part){ const {s,artist}=resolveVibe({}), S=STYLES[s]||STYLES.house, snd=artist?artist.sounds:{};
  if(part==='bass') return snd.bass||S.bass||'subbass'; if(part==='chords') return snd.chords||S.chords||'pad';
  const z=zoneInst('keys'); return PROJ.style?(snd.lead||S.lead||'lead'):(z.percussive?'piano':z.id); }
function shapePart(notes,part,key){
  let ev=notes.map(e=>Object.assign({},e)).sort((a,b)=>a.b-b.b); const L=PROJ.bars*4; if(!ev.length) return ev;
  if(key) ev.forEach(e=>e.n=snapToKey(e.n,key));
  const legato=max=>{ for(let i=0;i<ev.length;i++){ const nx=i+1<ev.length?ev[i+1].b:L; ev[i].d=Math.max(ev[i].d,Math.min(max,nx-ev[i].b-0.02)); } };
  if(part==='bass'){ const med=ev.map(e=>e.n).sort((a,b)=>a-b)[ev.length>>1], sh=Math.round((40-med)/12)*12; ev.forEach(e=>{ e.n+=sh; e.v=Math.max(e.v,0.8); }); legato(2); }
  else if(part==='chords'){ const k=key||{tonic:0,mode:'major'}, sc=SCALES[k.mode], out=[]; legato(4);
    ev.forEach(e=>{ const pc=mod(e.n-k.tonic,12); let deg=sc.indexOf(pc); if(deg<0) deg=sc.reduce((bi,x,i)=>Math.abs(x-pc)<Math.abs(sc[bi]-pc)?i:bi,0);
      voice(triad(k,deg),55).forEach(n=>out.push({b:e.b,d:e.d,n,v:0.7})); }); ev=out; }
  return ev;
}
const TAKE={chunks:[],notes:[],open:null,proc:null,part:'melody',
  async start(part){ this.part=PART_NAME[part]||part==='voice'?part:'melody';
    const c=ensureAudio(); if(!c) return;
    this.micByTake=!MIC.on; if(!MIC.on){ await micStart(); if(!MIC.on) return; }
    if(TR.running) loopStop();
    this.backToSong=songOn(); if(this.backToSong) songMode('loop',{force:true});
    if(!PROJ.tracks.length){ PROJ.bars=PROJ.bars||4; }
    PROJ.tracks.forEach(t=>{ t.cyc=-1; t.events.forEach(e=>e.cyc=-1); });
    this.chunks=[]; this.notes=[]; this.open=null;
    if(!this.proc){ this.proc=c.createScriptProcessor(1024,1,1); const z=gainN(c,0); this.proc.connect(z).connect(c.destination);
      this.proc.onaudioprocess=e=>{ if(LOOP.state!=='take') return; const d=e.inputBuffer.getChannelData(0); this.chunks.push({t:c.currentTime-d.length/c.sampleRate-0.02,d:new Float32Array(d)}); }; }
    try{ MIC.src.disconnect(this.proc); }catch(_){} MIC.src.connect(this.proc);
    $('#micStatus').textContent=`Recording a take (${this.part}): ${PROJ.bars} bars after the count-in. Sing now.`;
    TAKE_GUIDE=this.part!=='voice'&&PROJ.tracks.some(t=>t.role==='drums'||(INST.get(t.inst)||{}).drums); refreshTrackGains();
    setOrb('listening',`Get ready: ${CTRL.countIn?'one bar count-in, then ':''}sing ${this.part==='bass'?'the bassline':this.part==='chords'?'one note per chord':this.part==='voice'?'your voice note':'the melody'}.`);
    countInto('take');
  },
  begin(){ this.chunks=[]; lcd('TAKE · SING NOW'); const w={bass:'the bassline',chords:'one note per chord',melody:'the melody',voice:'your voice note'}[this.part]||'now';
    setOrb('listening',`Sing ${w} now: ${PROJ.bars} bar${PROJ.bars>1?'s':''}. ${this.part==='voice'?'':'Only the drums play so I can hear you clearly.'}`); if(typeof showSung==='function'){ ASSIST.sung=[]; showSung(0,false); } },
  noteOn(n,v){ if(LOOP.state!=='take') return; const lag=0.07, b=(A.ctx.currentTime-lag-TR.t0)*CTRL.bpm/60; this.noteOff(); this.open={n,v,b:Math.max(0,b)}; },
  noteOff(){ if(!this.open) return; const lag=0.07, b=(A.ctx.currentTime-lag-TR.t0)*CTRL.bpm/60, o=this.open; this.open=null; if(b-o.b>0.12) this.notes.push({b:o.b,d:b-o.b,n:o.n,v:o.v}); },
  releaseMic(){ if(this.micByTake&&!(ASSIST.listening&&ASSIST.hum)){ this.micByTake=false; try{ micStop(); }catch(e){} } },
  backSong(){ if(!this.backToSong) return; this.backToSong=false; songMode('song',{force:true}); },
  cancel(){ setTimeout(()=>this.backSong(),0); this.releaseMic(); this.chunks=[]; this.notes=[]; this.open=null; TAKE_GUIDE=false; refreshTrackGains(); $('#micStatus').textContent='Take cancelled.'; setOrb(ASSIST.listening?'listening':'idle',idleText()); },
  finish(){
    this.noteOff(); const c=A.ctx, L=PROJ.bars*4, sec=L*spb(), sr=c.sampleRate, pcm=new Float32Array(Math.round(sec*sr));
    this.chunks.forEach(ch=>{ const off=Math.round((ch.t-TR.t0)*sr); for(let i=0;i<ch.d.length;i++){ const j=off+i; if(j>=0&&j<pcm.length) pcm[j]=ch.d[i]; } });
    let pk=0; for(let i=0;i<pcm.length;i++) pk=Math.max(pk,Math.abs(pcm[i])); if(pk>0.001){ const g=0.85/pk; for(let i=0;i<pcm.length;i++) pcm[i]*=g; }
    const q=0.25; let notes=this.notes.map(e=>({b:Math.round(e.b/q)*q,d:Math.max(q,Math.round(e.d/q)*q),n:e.n,v:clamp(e.v/127,0.4,1)})).filter(e=>e.b<L);
    /* the live pitch tracker runs a little behind the voice; the recording itself gives exact onsets */
    if(this.part!=='voice'&&typeof audioToNotes==='function'){ try{ const det=audioToNotes(makeBuf(pcm,sr)), sb=spb();
      if(det.length>=Math.min(2,notes.length||2)) notes=det.map(x=>({b:Math.round(x.t0/sb/q)*q,d:Math.max(q,Math.round((x.t1-x.t0)/sb/q)*q),n:x.n,v:clamp(x.v,0.45,1)})).filter(e=>e.b<L); }catch(e){ console.warn('take analysis',e); } }
    notes.sort((a,b)=>a.b-b.b); notes=notes.filter((e,i)=>!(i&&notes[i-1].b===e.b&&notes[i-1].n===e.n));
    for(let i=0;i<notes.length-1;i++){ if(notes[i+1].b===notes[i].b){ notes.splice(i+1,1); i--; continue; } if(notes[i].b+notes[i].d>notes[i+1].b) notes[i].d=notes[i+1].b-notes[i].b; }
    notes.forEach(e=>e.d=Math.min(e.d,L-e.b));
    const part=this.part; this.releaseMic(); TAKE_GUIDE=false; refreshTrackGains(); setOrb(ASSIST.listening?'listening':'idle',idleText());
    if(part==='voice'){ const n=PROJ.tracks.filter(t=>/^Voice note/.test(t.name)).length+1; const at=makeTrack({kind:'audio',role:'voice',inst:null,name:'Voice note '+n,events:[],cyc:0,start:0,trim:0}); PROJ.tracks.push(at); AUD.set(at.id,makeBuf(pcm,sr)); IDB.put('aud:'+at.id,{sr,data:pcm},'audio').catch(()=>{});
      this.chunks=[]; this.notes=[]; LOOP.state='playing'; saveProject(); renderTracks(); uiLoop(); $('#micStatus').textContent=`Saved “${at.name}”.`; this.backSong();
      ASSIST.say(`Saved “${at.name}”. It plays with the loop. Say “${ASSIST.name}, turn the voice note into a bassline” to play it on an instrument.`,{chips:[at.name]}); return; }
    const key=PROJ.key||(part==='melody'?detectKey(notes):null); if(!PROJ.key && key && notes.length>=3) setKey(key);
    if($('#micSnap').checked||part!=='melody') notes=shapePart(notes,part,PROJ.key||key);
    notes.forEach(e=>e.cyc=0);
    const prevTake=PROJ.tracks.find(t=>t.take===part), prevParts=prevTake?JSON.stringify(songSections().map(s=>[s.id,s.parts[prevTake.id]])):null;
    PROJ.tracks.filter(t=>t.take===part||t.take===part+'-voice').forEach(t=>removeTrack(t.id)); /* a new take of the same part replaces the last one */
    const inst=partInst(part); { const I=INST.get(inst); if(I&&I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); }
    let mt=null; if(notes.length) mt=addTrack({role:part,inst,name:PART_NAME[part],events:notes,cyc:0,take:part});
    if(mt&&prevParts){ JSON.parse(prevParts).forEach(([sid,p])=>{ const s=songSections().find(x=>x.id===sid); if(s&&p) s.parts[mt.id]=p; }); } /* the new take plays where the old one did */
    /* the raw recording is only used to find the notes; it isn't added as a track (owner, 13 Nov) */
    this.chunks=[]; this.notes=[];
    LOOP.state='playing'; refreshTrackGains(); saveProject(); renderTracks(); uiLoop();
    this.backSong();
    const what=part==='chords'?`${Math.round(notes.length/3)} chords built on the notes you sang`:`${notes.length} notes`;
    $('#micStatus').textContent=`Take saved: ${what} on “${PART_NAME[part]}”. It’s playing back now.`;
    ASSIST.say(notes.length?`Got it: ${what}${PROJ.key?' in '+keyName(PROJ.key):''} on “${PART_NAME[part]}” with ${INST.get(inst).name}. Say “${ASSIST.name}, again” to redo it.`:`I didn’t catch any notes in that take. Try singing a bit louder, or closer to the mic, and say “${ASSIST.name}, sing the ${part} again”.`,{chips:notes.length?[PART_NAME[part],INST.get(inst).name]:[]});
  }
};
function makeBuf(pcm,sr){ const b=new AudioBuffer({length:Math.max(1,pcm.length),numberOfChannels:1,sampleRate:sr}); b.copyToChannel(pcm,0); return b; }


/* ---------- UI ---------- */
function uiLoop(){
  const st=LOOP.state, btn=$('#loopBtn');
  btn.dataset.state=st;
  const lbl={empty:'Record loop',counting:'Count-in…',recording:LOOP.fixed?'Recording…':'Recording · press to close',playing:'Overdub',overdub:'Overdubbing · press to keep',stopped:'Play loop',take:'Recording take…'}[st];
  $('#loopLbl').textContent=songOn()&&(st==='playing'||st==='stopped')?(st==='playing'?'Record in the loop':'Play song'):lbl;
  const ledCls='led'+(st==='recording'||st==='overdub'||st==='take'?' rec':st==='playing'?' on':st==='counting'?' warn':'');
  $('#loopLed').className=ledCls;
  const bars=songOn()?'song · '+songLenText():PROJ.bars+' bar'+(PROJ.bars>1?'s':'');
  const pill={empty:'Studio empty',counting:'Count-in',recording:'Recording',playing:`Playing · ${bars}`,overdub:'Overdubbing',stopped:`Song ready · ${bars}`,take:'Recording take'}[st];
  $('#loopPill').innerHTML=`<span class="${ledCls}"></span><span>${pill}</span>`;
  lcd({counting:'COUNT-IN',recording:'REC',playing:'PLAY',overdub:'OVERDUB',stopped:'STOP',empty:'READY',take:'TAKE'}[st]);
  const has=PROJ.tracks.length>0;
  $('#exportZip').disabled=!has; $('#exportMid').disabled=!has; $('#exportMp3').disabled=!has; $('#playBtn').disabled=!has||PLAYING.has(st);
  $('#recBtn').classList.toggle('on',st==='recording'||st==='overdub'); $('#playBtn').classList.toggle('on',PLAYING.has(st));
  document.querySelectorAll('.tp').forEach(b=>b.classList.toggle('on',(b.dataset.tp==='play'&&PLAYING.has(st))||(b.dataset.tp==='rec'&&(st==='recording'||st==='overdub'||st==='take'))||(b.dataset.tp==='loop'&&st!=='empty'&&st!=='stopped')));
  songUI();
}
/* ---------- export: MIDI, WAV, zip ---------- */
function vlq(n){ const b=[n&0x7F]; while(n>>=7) b.unshift((n&0x7F)|0x80); return b; }
function strBytes(s){ return Array.from(new TextEncoder().encode(s)); }
function midiTrack(events){ const out=[]; let last=0; events.sort((a,b)=>a.t-b.t||a.o-b.o).forEach(e=>{ out.push(...vlq(e.t-last),...e.d); last=e.t; }); out.push(0,0xFF,0x2F,0); return [0x4D,0x54,0x72,0x6B,(out.length>>>24)&255,(out.length>>>16)&255,(out.length>>>8)&255,out.length&255,...out]; }
function buildMidi(tracks,bpm,L,title){
  const PPQ=480, tempo=Math.round(60000000/bpm), out=[];
  out.push(midiTrack([{t:0,o:0,d:[0xFF,0x03,...vlq(strBytes(title).length),...strBytes(title)]},{t:0,o:1,d:[0xFF,0x51,0x03,(tempo>>16)&255,(tempo>>8)&255,tempo&255]},{t:0,o:2,d:[0xFF,0x58,0x04,4,2,24,8]},{t:L*PPQ,o:3,d:[0xFF,0x01,1,0x20]}]));
  let nextCh=0; const takeCh=()=>{ if(nextCh===9) nextCh++; return (nextCh++)%16; };
  tracks.filter(t=>t.kind==='notes').forEach(tr=>{ const I=INST.get(tr.inst)||{}, drum=!!I.percussive&&!I.custom, ch=drum?9:takeCh();
    const ev=[{t:0,o:0,d:[0xFF,0x03,...vlq(strBytes(tr.name).length),...strBytes(tr.name)]}]; if(!drum) ev.push({t:0,o:1,d:[0xC0|ch,(I.gm||0)&127]});
    tr.events.forEach(e=>{ const t0=Math.round(e.b*PPQ), t1=Math.min(L*PPQ,t0+Math.max(10,Math.round(e.d*PPQ))), n=clamp(Math.round(e.n),0,127), v=clamp(Math.round(e.v*127),1,127); ev.push({t:t0,o:3,d:[0x90|ch,n,v]},{t:t1,o:2,d:[0x80|ch,n,0]}); });
    ev.push({t:L*PPQ,o:4,d:[0xFF,0x01,1,0x20]}); out.push(midiTrack(ev)); });
  const head=[0x4D,0x54,0x68,0x64,0,0,0,6,0,1,(out.length>>8)&255,out.length&255,(PPQ>>8)&255,PPQ&255];
  return new Uint8Array([...head,...out.flat()]);
}
async function renderGraph(oc,bpm,all){
  await FX.loadIR(oc);
  const bus=oc.createGain(), out=oc.createGain();
  const glue=oc.createDynamicsCompressor(); glue.threshold.value=-16; glue.knee.value=10; glue.ratio.value=2; glue.attack.value=0.02; glue.release.value=0.25;
  const lim=oc.createDynamicsCompressor(); lim.threshold.value=-3; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=0.001; lim.release.value=0.08;
  out.gain.value=Math.pow(CTRL.volume/100,2); out.connect(glue).connect(lim).connect(oc.destination);
  const ms=makeStrip(oc,out); applyStrip(ms,MIX.master,oc,true,true);
  FX.build(oc,bus,ms.inp,FX.slots,{noRepeat:true,bpm});
  const sends=makeSends(oc,ms.inp,bpm);
  /* every audible track gets its strip (so sidechain works even when exporting one stem), only the requested ones make sound */
  const strips=new Map();
  for(const tr of all){ const st=makeStrip(oc,bus,sends); applyStrip(st,tr,oc,true,true); strips.set(tr.id,st); }
  const ducks=all.filter(x=>x.fx&&x.fx.duck>0).map(x=>[strips.get(x.id),x.fx.duck]);
  return {bus,sends,strips,ducks};
}
async function renderAudio(tracks,bpm,L,opts={}){
  const sr=44100, s=60/bpm, len=L*s, OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext, oc=new OAC(2,Math.ceil(sr*len*2),sr);
  const all=opts.context||tracks, {bus,sends,strips,ducks}=await renderGraph(oc,bpm,all);
  const kicks=[]; all.forEach(tr=>{ if(tr.kind==='notes') tr.events.forEach(e=>{ if(isKick(tr,e.n)) kicks.push(e.b); }); });
  for(let cyc=0;cyc<2;cyc++) kicks.forEach(b=>{ const t=(cyc*L+b)*s; if(t<2*len&&ducks.length) duckAt(oc,ducks,t,bpm); });
  for(const tr of tracks){ const st=strips.get(tr.id)||makeStrip(oc,bus,sends);
    if(tr.kind==='audio'){ const buf=AUD.get(tr.id); if(!buf) continue; const st0=(tr.start||0)*s, off=Math.min(tr.trim||0,buf.duration), dur=Math.min(buf.duration-off,len-st0); if(dur<=0.01) continue;
      for(let cyc=0;cyc<2;cyc++){ const src=oc.createBufferSource(); src.buffer=buf; src.connect(st.inp); src.start(cyc*len+st0,off,dur); } continue; }
    const I=INST.get(tr.inst); if(!I) continue; if(I.set) await loadSet(I.set,loadOpts(I.set)).catch(()=>{});
    for(let cyc=0;cyc<2;cyc++) for(const e of tr.events){ const t=(cyc*L+e.b)*s; if(t>=2*len) continue; const v=I.play(oc,st.inp,e.n,e.v,t); if(v && !v.oneShot) v.release(t+e.d*s); } }
  const buf=await oc.startRendering(), a=Math.round(len*sr), n=Math.round(len*sr);
  return [buf.getChannelData(0).slice(a,a+n),buf.getChannelData(1).slice(a,a+n)];
}
/* one stretch [from,to) of the song in beats, with a run-up so reverb, echo and held notes carry over the joins */
const yieldMain=()=>new Promise(r=>setTimeout(r,0));
async function renderSongSpan(tracks,bpm,from,to,o={}){
  const sr=44100, s=60/bpm, all=o.context||tracks;
  let preB=from>0?4/s:0; /* at least 4 s, longer when a note still sounding at `from` started earlier (up to 16 s) */
  if(from>0) for(const tr of tracks) if(tr.kind==='notes'){ const fl=songFlat(tr); for(let i=songLB(fl,from-16/s);i<fl.length&&fl[i].B<from;i++){ const e=fl[i]; if(e.B+e.d>from) preB=Math.max(preB,from-e.B); } }
  preB=Math.min(preB,from,16/s); const pre=preB*s, span=(to-from)*s, tail=o.tail||0, b0=from-preB, at=B=>(B-b0)*s;
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext, oc=new OAC(2,Math.ceil(sr*(pre+span+tail))+2,sr), G=await renderGraph(oc,bpm,all);
  if(G.ducks.length) for(const tr of all) if(tr.kind==='notes'){ const fl=songFlat(tr); for(let i=songLB(fl,b0);i<fl.length&&fl[i].B<to;i++) if(isKick(tr,fl[i].n)) duckAt(oc,G.ducks,at(fl[i].B),bpm); }
  let tk=performance.now();
  for(const tr of tracks){ const st=G.strips.get(tr.id)||makeStrip(oc,G.bus,G.sends);
    if(tr.kind==='audio'){ const buf=AUD.get(tr.id); if(!buf) continue; const off=Math.min(tr.trim||0,buf.duration);
      for(const a of songAudioSegs(tr)){ if(a.B+a.len<=b0||a.B>=to) continue; let t0=at(a.B), o2=off, dur=Math.min(buf.duration-off,a.len*s); if(t0<0){ o2-=t0; dur+=t0; t0=0; }
        if(dur<=0.01||o2>=buf.duration) continue; const src=oc.createBufferSource(); src.buffer=buf; src.connect(st.inp); src.start(t0,o2,dur); } continue; }
    const I=INST.get(tr.inst); if(!I) continue; if(I.set) await loadSet(I.set,loadOpts(I.set)).catch(()=>{});
    const fl=songFlat(tr); for(let i=songLB(fl,b0);i<fl.length&&fl[i].B<to;i++){ const e=fl[i], t=at(e.B), v=I.play(oc,st.inp,e.n,e.v,t); if(v&&!v.oneShot) v.release(t+e.d*s);
      if(performance.now()-tk>20){ await yieldMain(); tk=performance.now(); } } }
  const buf=await oc.startRendering(), a=Math.round(pre*sr), n=o.samples||Math.round((span+tail)*sr);
  return [buf.getChannelData(0).slice(a,a+n),buf.getChannelData(1).slice(a,a+n)];
}
/* the whole song as laid out, rendered 16 bars at a time and kept as 16-bit audio (6 dB headroom) until it's encoded */
async function makeSongMp3(tracks,onProgress,opts={}){
  if(typeof lamejs==='undefined'||!lamejs.Mp3Encoder) throw new Error('the MP3 encoder didn’t load');
  const bpm=CTRL.bpm, s=60/bpm, sr=44100, E=songBeats(), tail=2, CH=64, at=B=>Math.round(B*s*sr), total=at(E)+Math.round(tail*sr);
  const L16=new Int16Array(total), R16=new Int16Array(total); let pk=0;
  for(let from=0;from<E;from+=CH){ const to=Math.min(E,from+CH), last=to>=E, n=at(to)-at(from)+(last?Math.round(tail*sr):0), o=at(from);
    if(onProgress) onProgress(from/E*0.85,`bar ${from/4+1} of ${E/4}`);
    const [l,r]=await renderSongSpan(tracks,bpm,from,to,{tail:last?tail:0,samples:n,context:opts.context});
    for(let i=0;i<n&&o+i<total;i++){ const a=l[i], b=r[i], m=a>b?(a>-b?a:-b):(b>-a?b:-a); if(m>pk) pk=m; L16[o+i]=clamp(Math.round(a*16384),-32768,32767); R16[o+i]=clamp(Math.round(b*16384),-32768,32767); }
    await yieldMain(); }
  const g=pk>0.97?0.97/pk:1, k=2*g/32768, fade=Math.round(sr*1.5);
  const enc=new lamejs.Mp3Encoder(2,sr,192), out=[], B=1152, LB=new Int16Array(B), RB=new Int16Array(B); let sq=0, tk=performance.now();
  for(let i=0;i<total;i+=B){ const m=Math.min(B,total-i);
    for(let j=0;j<m;j++){ const p=i+j; let f=k; if(p>total-fade) f*=(total-p)/fade; const a=clamp(L16[p]*f,-1,1), b=clamp(R16[p]*f,-1,1); sq+=a*a+b*b; LB[j]=a<0?a*0x8000:a*0x7FFF; RB[j]=b<0?b*0x8000:b*0x7FFF; }
    const buf=enc.encodeBuffer(m<B?LB.subarray(0,m):LB,m<B?RB.subarray(0,m):RB); if(buf.length) out.push(new Uint8Array(buf));
    if(performance.now()-tk>20){ if(onProgress) onProgress(0.85+0.15*i/total,'encoding'); await yieldMain(); tk=performance.now(); } }
  const end=enc.flush(); if(end.length) out.push(new Uint8Array(end));
  return {blob:new Blob(out,{type:'audio/mpeg'}),seconds:total/sr,bars:E/4,peak:pk*g,rms:Math.sqrt(sq/(2*total))};
}
/* the song as plain tracks of notes in song time (for MIDI) */
const songFlatTracks=tracks=>tracks.filter(t=>t.kind==='notes').map(t=>Object.assign({},t,{events:songFlat(t).map(e=>({b:e.B,d:e.d,n:e.n,v:e.v}))}));
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
  if(dl){ if(!DL_OK.test(name)){ const u=new Uint8Array(await blob.arrayBuffer()); blob=zipBytes([{name,data:u}]); name=name.replace(/\.[a-z0-9]+$/i,'')+'.zip'; }
    try{ await dl.save({filename:name,data:blob}); return 'saved'; }catch(e){ if(e&&e.code==='declined') return 'declined'; throw new Error(e&&e.message||'Download unavailable here'); } }
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); return 'saved';
}
const safeName=s=>s.replace(/[\\/:*?"<>|]+/g,'').trim()||'Track';
async function exportZip(){
  if(!PROJ.tracks.length) return;
  const st=$('#exportStatus'), bpm=CTRL.bpm, L=PROJ.bars*4, bars=PROJ.bars, base=`${safeName(PROJ.name)} ${bpm}bpm ${bars}bar${bars>1?'s':''}`, tracks=PROJ.tracks.filter(trackAudible);
  if(!tracks.length){ st.textContent='All tracks are muted.'; return; }
  const btn=$('#exportZip'); btn.disabled=true;
  try{
    const files=[];
    st.textContent='Rendering the mix…'; await nextFrame();
    files.push({name:`${base}/${base} Mix.wav`,data:wavBytes(await renderAudio(tracks,bpm,L),44100)});
    for(let i=0;i<tracks.length;i++){ st.textContent=`Rendering stem ${i+1} of ${tracks.length}…`; await nextFrame();
      files.push({name:`${base}/Stems/${String(i+1).padStart(2,'0')} ${safeName(tracks[i].name)}.wav`,data:wavBytes(await renderAudio([tracks[i]],bpm,L,{context:tracks}),44100)}); }
    const nt=tracks.filter(t=>t.kind==='notes');
    if(nt.length){ files.push({name:`${base}/MIDI/${base} All tracks.mid`,data:buildMidi(nt,bpm,L,base)});
      nt.forEach((t,i)=>files.push({name:`${base}/MIDI/${String(i+1).padStart(2,'0')} ${safeName(t.name)}.mid`,data:buildMidi([t],bpm,L,t.name)})); }
    files.push({name:`${base}/song.json`,data:new TextEncoder().encode(JSON.stringify(Object.assign(serialize(PROJ),{bpm}),null,1))});
    files.push({name:`${base}/README.txt`,data:new TextEncoder().encode(`${PROJ.name}\nMade in Studio Keys\n\nTempo: ${bpm} BPM\nKey: ${keyName(projectKey())}\nLength: ${bars} bar${bars>1?'s':''} in 4/4 (${(L*60/bpm).toFixed(3)} s)\nTracks: ${tracks.map((t,i)=>`${i+1}. ${t.name}`).join(', ')}\n\nIn Ableton Live: set the project tempo to ${bpm}, then drag the WAV files (Mix or Stems) or the MIDI files into clip slots. Every file is exactly one loop long and loops seamlessly, including reverb and echo tails. Volume, EQ and effects are printed into the WAV files; the MIDI files keep the notes editable.\n`)});
    st.textContent='Packing the zip…'; await nextFrame();
    const r=await saveFile(`${base}.zip`,zipBytes(files)); st.textContent=r==='declined'?'Download cancelled.':`Downloaded ${base}.zip`;
  }catch(e){ console.error(e); st.textContent='Export failed: '+e.message; }
  btn.disabled=false;
}
async function exportMidiOnly(){
  if(!PROJ.tracks.length) return; const song=songOn(), bpm=CTRL.bpm, L=song?songBeats():PROJ.bars*4, base=`${safeName(PROJ.name)} ${bpm}bpm ${song?'song '+songBars():PROJ.bars}bars`, st=$('#exportStatus');
  const tr=PROJ.tracks.filter(trackAudible);
  try{ const r=await saveFile(`${base}.mid`,new Blob([buildMidi(song?songFlatTracks(tr):tr,bpm,L,base)],{type:'audio/midi'})); st.textContent=r==='declined'?'Download cancelled.':'MIDI downloaded.'; }catch(e){ st.textContent='Export failed: '+e.message; }
}
/* ---------- MP3: the mix, looped to the chosen length, encoded with LAME (lamejs, LGPL; its own script block) ---------- */
async function makeMp3(tracks,loopsOrSeconds,onProgress){
  if(typeof lamejs==='undefined'||!lamejs.Mp3Encoder) throw new Error('the MP3 encoder didn’t load');
  const bpm=CTRL.bpm, L=PROJ.bars*4, loopSec=L*60/bpm, sr=44100;
  const want=+loopsOrSeconds||60, loops=want>=30?Math.max(1,Math.min(64,Math.round(want/loopSec))):Math.max(1,Math.min(64,want));
  const [l,r]=await renderAudio(tracks,bpm,L), n=l.length, total=n*loops;
  let pk=0; for(let i=0;i<n;i++){ const a=Math.abs(l[i]), b=Math.abs(r[i]); if(a>pk) pk=a; if(b>pk) pk=b; }
  const gain=pk>0.97?0.97/pk:1, fade=Math.min(Math.round(sr*2.5),Math.round(total/3));
  const enc=new lamejs.Mp3Encoder(2,sr,192), out=[], B=1152, L16=new Int16Array(B), R16=new Int16Array(B);
  for(let i=0,k=0;i<total;i+=B,k++){
    const m=Math.min(B,total-i);
    for(let j=0;j<m;j++){ const p=i+j, s=p%n; let g=gain; if(p>total-fade) g*=(total-p)/fade;
      const a=clamp(l[s]*g,-1,1), b=clamp(r[s]*g,-1,1); L16[j]=a<0?a*0x8000:a*0x7FFF; R16[j]=b<0?b*0x8000:b*0x7FFF; }
    const buf=enc.encodeBuffer(m<B?L16.subarray(0,m):L16,m<B?R16.subarray(0,m):R16); if(buf.length) out.push(new Uint8Array(buf));
    if(k%300===0){ if(onProgress) onProgress(i/total); await nextFrame(); }
  }
  const end=enc.flush(); if(end.length) out.push(new Uint8Array(end));
  return {blob:new Blob(out,{type:'audio/mpeg'}),seconds:total/sr,loops};
}
async function exportMp3(lenOverride){
  if(!PROJ.tracks.length){ toast('Make something first, then download it as an MP3.'); return null; }
  const tracks=PROJ.tracks.filter(trackAudible), st=$('#exportStatus'), btn=$('#exportMp3');
  if(!tracks.length){ st.textContent='All tracks are muted.'; return null; }
  btn.disabled=true; st.textContent='Rendering your song…'; const song=songOn();
  try{
    const r=song?await makeSongMp3(tracks,(p,what)=>{ st.textContent=what==='encoding'?`Making the MP3… encoding ${Math.round(p*100)}%`:`Making the MP3… ${what}`; },{context:tracks})
      :await makeMp3(tracks,lenOverride||$('#mp3Len').value,p=>{ st.textContent=`Making the MP3… ${Math.round(p*100)}%`; });
    const name=`${safeName(PROJ.name)} ${CTRL.bpm}bpm${song?' song':''}.mp3`, res=await saveFile(name,r.blob);
    const mins=Math.floor(r.seconds/60), secs=Math.round(r.seconds%60);
    const zipped=!!(await getDownloads()); st.textContent=res==='declined'?'Download cancelled.':`Downloaded ${name} (${mins?mins+' min ':''}${secs} s, ${(r.blob.size/1048576).toFixed(1)} MB)${zipped?'. This view can only save it inside a zip; on the live site you get the plain MP3.':''}`;
    btn.disabled=false; return r;
  }catch(e){ console.error(e); st.textContent='MP3 failed: '+e.message; btn.disabled=false; return null; }
}
$('#exportZip').onclick=exportZip; $('#exportMid').onclick=exportMidiOnly; $('#exportMp3').onclick=()=>exportMp3();
