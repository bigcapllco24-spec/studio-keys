
/* ---------- editing like a DAW: undo/redo, import (drag & drop), voice notes, audio → notes, moving audio clips ---------- */

/* ----- undo / redo: every change goes through saveProject, so we snapshot there ----- */
const UNDO={stack:[],redo:[],last:null,busy:false,t:0};
function undoBoundary(){ UNDO.t=0; }
/* several saves as one Undo step, however long the work in between takes */
function undoGroup(fn){ const before=UNDO.last, wasBusy=UNDO.busy; UNDO.busy=true; let r; try{ r=fn(); }finally{ UNDO.busy=wasBusy; }
  if(!wasBusy&&before!==null){ UNDO.last=before; UNDO.t=0; undoNote(); } return r; }
const snapState=()=>JSON.stringify({p:PROJ,bpm:CTRL.bpm});
function undoNote(){
  const j=snapState(); if(UNDO.last===null||UNDO.busy){ UNDO.last=j; return; } if(j===UNDO.last) return;
  const now=performance.now(), prev=UNDO.last; let pushed=false;
  if(now-UNDO.t>120||!UNDO.stack.length){ UNDO.stack.push(UNDO.last); if(UNDO.stack.length>120) UNDO.stack.shift(); pushed=true; UNDO.pushes=(UNDO.pushes||0)+1; }
  UNDO.t=now; UNDO.redo=[]; UNDO.last=j; undoButtons();
  if(typeof songChipNote==='function') songChipNote(prev,j,pushed); /* a newer change makes the Undo chip's label stale */
}
/* a song was opened or a new one started: its history starts here (QA, 13 Nov: the first Undo went back to the song before) */
function undoReset(){ UNDO.stack=[]; UNDO.redo=[]; UNDO.t=0; UNDO.busy=false; UNDO.leftSong=false; UNDO.last=snapState(); undoButtons(); if(typeof songChipHide==='function') songChipHide(); }
const _saveProject=saveProject;
saveProject=function(){ if(typeof songSync==='function') songSync(); undoNote(); _saveProject(); };
/* Undo of "Make it a song" also leaves Song mode (one 4-bar section would play once and stop); Redo goes back to Song.
   The view mode isn't part of the history, so remember that this Undo switched it (QA, 13 Nov) */
function applyState(j){
  const wasArr=typeof songArranged==='function'&&songArranged();
  UNDO.busy=true; const o=JSON.parse(j);
  /* Undo restores the song's content, never which song it is: a step can't carry another song's id (and name) back in,
     so autosave always writes to the song you are in (QA, 16 Nov: Undo after Save a copy overwrote the original) */
  const keep={id:PROJ.id}; if(o.p&&o.p.id!==PROJ.id) keep.name=PROJ.name;
  PROJ=migrateSong(Object.assign(newProject(),o.p,keep)); SONG.ver++; if(o.bpm&&o.bpm!==CTRL.bpm) setTempo(o.bpm);
  if(ED.tid&&!PROJ.tracks.find(t=>t.id===ED.tid)) closeEditor(); ED.sel=new Set();
  if(!PROJ.tracks.length&&LOOP.state!=='empty'){ loopStop(); LOOP.state='empty'; } else if(PROJ.tracks.length&&LOOP.state==='empty') LOOP.state='stopped';
  loadAudioFor(PROJ).then(()=>drawRolls()); refreshTrackGains(); renderTracks(); uiLoop(); _saveProject(); UNDO.last=snapState(); UNDO.busy=false; undoButtons();
  if(typeof songChipHide==='function') songChipHide();
  if(typeof songArranged!=='function') return; const nowArr=songArranged();
  if(wasArr&&!nowArr&&songOn()){ songMode('loop',{force:true}); UNDO.leftSong=true; toast('Back to the plain loop (Loop mode). Redo brings the song back.'); }
  else if(!wasArr&&nowArr&&UNDO.leftSong&&!songOn()){ UNDO.leftSong=false; songMode('song',{force:true}); songChip('Song layout back · Song mode',{undo:false}); }
}
/* a Tap tempo still settling becomes its own step first, so Undo/Redo never lose it */
const undoFlush=()=>{ if(typeof tempoFlush==='function') tempoFlush(); };
function undo(){ undoFlush(); if(!UNDO.stack.length){ toast('Nothing to undo'); return false; } UNDO.redo.push(UNDO.last); applyState(UNDO.stack.pop()); return true; }
function redo(){ undoFlush(); if(!UNDO.redo.length){ toast('Nothing to redo'); return false; } UNDO.stack.push(UNDO.last); applyState(UNDO.redo.pop()); return true; }
function undoButtons(){ const u=$('#undoBtn'), r=$('#redoBtn'); if(u) u.disabled=!UNDO.stack.length; if(r) r.disabled=!UNDO.redo.length; }
$('#undoBtn').onclick=undo; $('#redoBtn').onclick=redo;
document.addEventListener('keydown',e=>{ const tg=e.target; if(tg&&/INPUT|SELECT|TEXTAREA/.test(tg.tagName)) return; if(!(e.ctrlKey||e.metaKey)) return; const k=e.key.toLowerCase();
  if(k==='z'&&!e.shiftKey){ e.preventDefault(); undo(); } else if((k==='z'&&e.shiftKey)||k==='y'){ e.preventDefault(); redo(); } });
UNDO.last=snapState(); undoButtons();
ACT.undo=()=>undo()?'Undid the last change':null;
ACT.redo=()=>redo()?'Redid it':null;

/* ----- audio → notes (offline pitch tracking of a recorded or imported clip) ----- */
function audioToNotes(buf){
  const sr=buf.sampleRate, x=buf.getChannelData(0), N=2048, hop=512, det=makePitchDetector(N,sr,55,1200), frames=[];
  for(let i=0;i+N<=x.length;i+=hop){ const r=det(x,i); frames.push({t:(i+N/2)/sr,f:r.f,clar:r.clar,rms:r.rms}); }
  if(!frames.length) return [];
  const rs=frames.map(f=>f.rms).sort((a,b)=>a-b), gate=Math.max(0.006,rs[Math.floor(rs.length*0.2)]*3,rs[Math.floor(rs.length*0.97)]*0.07);
  const notes=[]; let cur=null, med=[], cand=null, candN=0, silent=0; const env=[];
  for(const fr of frames){
    const voiced=fr.f>0&&fr.clar>0.85&&fr.rms>gate; env.push(fr.rms); if(env.length>8) env.shift();
    if(voiced){ silent=0; med.push(ftom(fr.f)); if(med.length>5) med.shift(); const m=[...med].sort((a,b)=>a-b)[med.length>>1], n=Math.round(m);
      const reatt=cur&&fr.t-cur.t0>0.15&&env.length>=6&&fr.rms>Math.min(...env.slice(0,-1))*2.2&&fr.rms>gate*2.5;
      if(cur&&Math.abs(m-cur.n)<0.7&&!reatt){ cur.t1=fr.t; cur.pk=Math.max(cur.pk,fr.rms); cand=null; candN=0; }
      else if(reatt&&Math.abs(m-cur.n)<0.7){ notes.push(cur); cur={n:cur.n,t0:fr.t,t1:fr.t,pk:fr.rms}; }
      else { if(n===cand) candN++; else { cand=n; candN=1; } if(candN>=3){ if(cur) notes.push(cur); cur={n,t0:fr.t-2*hop/sr,t1:fr.t,pk:fr.rms}; cand=null; candN=0; } }
    } else { silent++; cand=null; candN=0; if(silent>3) med=[]; if(silent>=4&&cur){ notes.push(cur); cur=null; } }
  }
  if(cur) notes.push(cur);
  const pk=Math.max(1e-6,...notes.map(n=>n.pk));
  return tidySung(notes,frames,gate,hop/sr).filter(n=>n.t1-n.t0>=0.08).map(n=>({t0:n.t0,t1:n.t1,n:n.n,c:n.c,v:clamp(0.45+0.55*n.pk/pk,0.3,1)}));
}
/* the notes as they were sung (owner, 19 Nov: "it doesn't listen to my notes", UX-14). The tracker above names a note by the
   pitch of its first few frames and splits it when the pitch moves 0.7 semitone, so a voice gave wrong or extra notes:
   - a scoop up into the note (singers start low) named the note a semitone flat, and a 50-90 ms stub came before it;
   - vibrato or drift across the half-semitone split one held note into 2-10 short ones;
   - a singer who is a bit flat or sharp all through (25-45 cents) got notes a semitone off;
   - a pitch change with no gap (legato) started 40-80 ms late, a 16th late once quantized.
   Here each note's pitch is the median of all its frames (after the first 50 ms, or 30% of a short note), pieces of one wobbling note join up, a short
   scoop joins the note it slides into, the singer's own tuning is measured over the take (circular mean of every note's
   offset, used when the notes agree on it), and a legato note starts at the first frame on its new pitch.
   c: how far the note sits from its semitone (−0.5..0.5) after that tuning; the take uses it to settle a pitch sung right
   between two notes (shapePart), and never moves a note sung on its semitone. */
function tidySung(notes,frames,gate,hs){
  const fm=fr=>fr.f>0&&fr.clar>0.85&&fr.rms>gate?ftom(fr.f):null;
  const at=t=>{ let lo=0, hi=frames.length; while(lo<hi){ const m=(lo+hi)>>1; if(frames[m].t<t) lo=m+1; else hi=m; } return lo; };
  const pitchOf=(t0,t1)=>{ const ms=[], skip=Math.min(0.05,(t1-t0)*0.3); for(let k=at(t0+skip);k<frames.length&&frames[k].t<=t1;k++){ const m=fm(frames[k]); if(m!=null) ms.push(m); }
    ms.sort((a,b)=>a-b); return ms.length?ms[ms.length>>1]:null; };
  const out=notes.map(n=>{ const m=pitchOf(n.t0,n.t1); return Object.assign({},n,{m:m==null?n.n:m,tail:n.n}); });
  /* tail: the tracker's pitch for the last piece of a joined note. Two pieces it gave the same pitch were split by a new attack
     (a re-sung note, "da da"), so they stay two notes */
  for(let i=0;i+1<out.length;i++){ const a=out[i], b=out[i+1]; if(a.tail===b.n||b.t0-a.t1>2.5*hs) continue;
    const wobble=Math.abs(a.m-b.m)<0.7, scoop=a.t1-a.t0<0.09&&b.t1-b.t0>a.t1-a.t0&&b.m>a.m&&b.m-a.m<2.5;
    if(wobble||scoop){ a.t1=Math.max(a.t1,b.t1); a.pk=Math.max(a.pk,b.pk); a.tail=b.n; const m=pitchOf(a.t0,a.t1); a.m=m==null?b.m:m; a.n=Math.round(a.m); out.splice(i+1,1); i--; } }
  let sx=0, sy=0, sw=0; out.forEach(n=>{ const w=n.t1-n.t0, d=n.m-Math.round(n.m); sx+=w*Math.cos(2*Math.PI*d); sy+=w*Math.sin(2*Math.PI*d); sw+=w; });
  let off=out.length>=3&&sw>0&&Math.hypot(sx,sy)/sw>0.6?Math.atan2(sy,sx)/(2*Math.PI):0; if(Math.abs(off)<0.1) off=0;
  out.forEach(n=>{ const f=n.m-off; n.n=Math.round(f); n.c=+(f-n.n).toFixed(2); });
  for(let i=1;i<out.length;i++){ const a=out[i-1], b=out[i]; if(a.n===b.n||b.t0-a.t1>2.5*hs) continue;
    let k=at(b.t0); while(k>0&&frames[k-1].t>a.t0+0.06){ const m=fm(frames[k-1]); if(m==null||Math.round(m-off)!==b.n) break; k--; }
    if(k<frames.length&&frames[k].t<b.t0){ b.t0=frames[k].t; a.t1=Math.min(a.t1,b.t0); } }
  return out;
}
function transcribeTrack(t,part){
  const buf=AUD.get(t.id); if(!buf) return null; const s=spb(), L=PROJ.bars*4, q=0.25, st=t.start||0, trim=t.trim||0;
  let ev=audioToNotes(buf).map(n=>({b:Math.round((st+(n.t0-trim)/s)/q)*q,d:Math.max(q,Math.round((n.t1-n.t0)/s/q)*q),n:n.n,c:n.c,v:n.v})).filter(e=>e.b>=0&&e.b<L);
  if(!ev.length) return {count:0};
  for(let i=0;i<ev.length-1;i++) if(ev[i].b+ev[i].d>ev[i+1].b) ev[i].d=Math.max(q,ev[i+1].b-ev[i].b);
  const key=PROJ.key||detectKey(ev); if(!PROJ.key&&key&&ev.length>=4) setKey(key);
  part=part||'melody'; ev=shapePart(ev,part,PROJ.key||key);
  const inst=partInst(part); { const I=INST.get(inst); if(I&&I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); }
  const nt=addTrack({role:part,inst,name:`${t.name} → ${part==='bass'?'bassline':part==='chords'?'chords':'notes'}`,events:ev});
  PROJ.tracks.splice(PROJ.tracks.indexOf(nt),1); PROJ.tracks.splice(PROJ.tracks.indexOf(t)+1,0,nt);
  t.mute=true; refreshTrackGains(); saveProject(); renderTracks();
  return {count:part==='chords'?Math.round(ev.length/3):ev.length,track:nt,inst};
}
ACT.transcribe=a=>{ const t=findTrack(a.track)||[...PROJ.tracks].reverse().find(x=>x.kind==='audio'); if(!t||t.kind!=='audio') return; const r=transcribeTrack(t,/bass/.test(a.to||'')?'bass':/chord/.test(a.to||'')?'chords':'melody');
  if(!r) return; if(!r.count) return `I couldn’t hear clear notes in “${t.name}”`; return `${r.count} ${a.to&&/chord/.test(a.to)?'chords':'notes'} from “${t.name}” on ${INST.get(r.inst).name} (the audio is muted; unmute it to hear both)`; };

/* ----- import: drop audio or MIDI files on the tracks, or use the Import button ----- */
function parseMidi(ab){
  const d=new DataView(ab); let p=0; const str=n=>{ let s=''; for(let i=0;i<n;i++) s+=String.fromCharCode(d.getUint8(p+i)); p+=n; return s; };
  const u32=()=>{ const v=d.getUint32(p); p+=4; return v; }, u16=()=>{ const v=d.getUint16(p); p+=2; return v; };
  if(str(4)!=='MThd') throw new Error('not a MIDI file'); const hl=u32(); u16(); const nt=u16(), div=u16(); p=8+hl;
  if(div&0x8000) throw new Error('SMPTE-timed MIDI files are not supported');
  const tracks=[]; let tempo=null;
  for(let i=0;i<nt&&p+8<=d.byteLength;i++){
    if(str(4)!=='MTrk') break; const len=u32(), end=Math.min(d.byteLength,p+len); let tick=0, run=0, name='', drums=false; const on=new Map(), notes=[];
    const vlq=()=>{ let v=0,b; do{ b=d.getUint8(p++); v=(v<<7)|(b&127); }while(b&128&&p<end); return v; };
    while(p<end){ tick+=vlq(); let st=d.getUint8(p); if(st<0x80) st=run; else { p++; if(st<0xF0) run=st; }
      if(st===0xFF){ const mt=d.getUint8(p++), ml=vlq(); if(mt===0x51&&tempo==null) tempo=60e6/((d.getUint8(p)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p+2)); if(mt===0x03) for(let k=0;k<ml;k++) name+=String.fromCharCode(d.getUint8(p+k)); p+=ml; continue; }
      if(st===0xF0||st===0xF7){ p+=vlq(); continue; }
      const ty=st&0xF0, ch=st&15;
      if(ty===0x90||ty===0x80){ const n=d.getUint8(p++), v=d.getUint8(p++), k=ch*128+n;
        if(ty===0x90&&v>0){ if(!on.has(k)) on.set(k,{t:tick,v}); if(ch===9) drums=true; }
        else { const o=on.get(k); if(o){ notes.push({b:o.t/div,d:Math.max(0.05,(tick-o.t)/div),n,v:clamp(o.v/127,0.1,1)}); on.delete(k); } } continue; }
      p+=(ty===0xC0||ty===0xD0)?1:2; }
    p=end; if(notes.length) tracks.push({name:name.trim(),notes,drums});
  }
  return {tempo,tracks};
}
const fitBars=beats=>[1,2,4,8,16].find(b=>b*4>=beats-0.01)||16;
async function importFile(f){
  const c=ensureAudio(); if(!c) return; const base=f.name.replace(/\.[^.]+$/,'').slice(0,32)||'Imported';
  const ab=await f.arrayBuffer();
  if(/\.midi?$/i.test(f.name)){
    let m; try{ m=parseMidi(ab); }catch(e){ console.warn('MIDI import',e); toast(`That MIDI file (${f.name}) couldn’t be read`); return; }
    if(!m.tracks.length){ toast(`${f.name} has no notes`); return; }
    /* QA, 17 Nov: a file longer than the loop kept only the first bars. Now the loop grows to fit the file (up to its 16-bar
       maximum; the parts already there repeat, as when you pick more bars), and the whole import is one Undo step */
    const endB=Math.max(...m.tracks.flatMap(t=>t.notes.map(e=>e.b+e.d))), was=PROJ.bars, MAXB=16; let made=0, cut=0;
    undoGroup(()=>{
      const empty=!PROJ.tracks.length; if(empty&&m.tempo) setTempo(Math.round(m.tempo));
      const need=fitBars(endB); if(empty||need>PROJ.bars) setBars(need);
      const L=PROJ.bars*4;
      m.tracks.forEach((t,i)=>{ cut+=t.notes.filter(e=>e.b>=L).length; const ev=t.notes.filter(e=>e.b<L).map(e=>Object.assign(e,{d:Math.min(e.d,L-e.b)})); if(!ev.length) return;
        const avg=ev.reduce((a,e)=>a+e.n,0)/ev.length, role=t.drums?'drums':avg<50?'bass':'melody', inst=t.drums?(ZONES.pads&&INST.get(ZONES.pads).drums?ZONES.pads:'kit909'):role==='bass'?'bass':'piano';
        const I=INST.get(inst); if(I&&I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{});
        addTrack({role,inst,zone:t.drums?'pads':'keys',name:(t.name||base+(m.tracks.length>1?' '+(i+1):'')).slice(0,32),events:ev}); made++; });
      if(LOOP.state==='empty') LOOP.state='stopped'; uiLoop(); });
    if(!made){ toast(`${f.name} has no notes in its first ${MAXB} bars`); return; }
    const grew=PROJ.bars>was&&was>0, fileBars=Math.ceil(endB/4-0.01);
    toast(`Imported ${made} MIDI track${made!==1?'s':''} from ${f.name}${grew?` · the loop is now ${PROJ.bars} bars`:''}${cut?`. The file is ${fileBars} bars and a loop holds at most ${MAXB}, so ${cut} note${cut!==1?'s':''} after bar ${MAXB} ${cut!==1?'were':'was'} left out`:''}`); return;
  }
  let buf; try{ buf=await c.decodeAudioData(ab.slice(0)); }catch(e){ toast(`Couldn’t open ${f.name}. Try WAV, MP3, M4A, OGG or a voice-memo file.`); return; }
  const sr=buf.sampleRate, mono=new Float32Array(buf.length); for(let ch=0;ch<buf.numberOfChannels;ch++){ const d=buf.getChannelData(ch); for(let i=0;i<d.length;i++) mono[i]+=d[i]/buf.numberOfChannels; }
  if(!PROJ.tracks.length) setBars(fitBars(buf.duration/spb()));
  const t=makeTrack({kind:'audio',role:'voice',inst:null,name:base,events:[],start:0,trim:0}); PROJ.tracks.push(t); AUD.set(t.id,makeBuf(mono,sr)); IDB.put('aud:'+t.id,{sr,data:mono},'audio').catch(()=>{});
  if(LOOP.state==='empty') LOOP.state='stopped'; saveProject(); renderTracks(); uiLoop();
  const over=buf.duration>PROJ.bars*4*spb()+0.05;
  toast(`Added “${base}” (${buf.duration.toFixed(1)} s)${over?`. ${PROJ.bars===1?'Only the first bar plays':`Only the first ${PROJ.bars} bars play`}; add bars to hear more`:''}. Use “Turn into notes” to play it on an instrument.`);
  ASSIST.say(`Added “${base}”. Drag it left or right to line it up, or say “${ASSIST.name}, turn ${base.length<20?base:'it'} into a bassline” to play it on an instrument.`,{speak:false});
}
$('#importBtn').onclick=()=>$('#importFile').click();
$('#importFile').addEventListener('change',async e=>{ for(const f of e.target.files) await importFile(f); e.target.value=''; });
(function(){ const zone=$('#studio')||document.body, pl=$('#playlist'); let depth=0;
  const isFile=e=>e.dataTransfer&&[...e.dataTransfer.types].includes('Files');
  zone.addEventListener('dragenter',e=>{ if(!isFile(e)) return; depth++; pl.classList.add('drop'); e.preventDefault(); });
  zone.addEventListener('dragover',e=>{ if(isFile(e)){ e.preventDefault(); e.dataTransfer.dropEffect='copy'; } });
  zone.addEventListener('dragleave',e=>{ if(!isFile(e)) return; depth=Math.max(0,depth-1); if(!depth) pl.classList.remove('drop'); });
  zone.addEventListener('drop',async e=>{ if(!isFile(e)) return; e.preventDefault(); depth=0; pl.classList.remove('drop'); for(const f of e.dataTransfer.files) await importFile(f); });
})();

/* ----- audio clips: drag to move, Shift+drag to slip (trim the start), and "Turn into notes" ----- */
(function(){
  let D=null; const box=$('#tracks');
  box.addEventListener('pointerdown',e=>{ const cv=e.target.closest('.troll'); if(!cv) return; const t=PROJ.tracks.find(x=>x.id===cv.dataset.roll); if(!t||t.kind!=='audio') return;
    e.preventDefault(); D={t,x0:e.clientX,w:cv.clientWidth,start0:t.start||0,trim0:t.trim||0,slip:e.shiftKey,moved:false}; try{ cv.setPointerCapture(e.pointerId); }catch(_){} });
  box.addEventListener('pointermove',e=>{ if(!D) return; const L=PROJ.bars*4, db=(e.clientX-D.x0)/D.w*L, q=e.altKey?0:0.25, snapB=v=>q?Math.round(v/q)*q:v;
    if(D.slip){ const buf=AUD.get(D.t.id); const tr=clamp(D.trim0-snapB(db)*spb(),0,buf?Math.max(0,buf.duration-0.05):0); D.t.trim=Math.round(tr*1000)/1000; }
    else D.t.start=clamp(snapB(D.start0+db),0,L-0.25);
    D.moved=true; drawRolls(); });
  const up=()=>{ if(D&&D.moved){ saveProject(); toast(D.slip?`“${D.t.name}” now starts ${D.t.trim.toFixed(2)} s into the recording`:`“${D.t.name}” starts at bar ${Math.floor(D.t.start/4)+1}, beat ${(D.t.start%4+1).toFixed(2).replace(/\.00$/,'')}`); } D=null; };
  box.addEventListener('pointerup',up); box.addEventListener('pointercancel',up);
  box.addEventListener('change',e=>{ const s=e.target.closest('[data-tonotes]'); if(!s||!s.value) return; const t=PROJ.tracks.find(x=>x.id===s.dataset.tonotes); const part=s.value; s.value='';
    toast('Listening to the recording…'); setTimeout(()=>{ const r=transcribeTrack(t,part); if(!r) toast('That audio isn’t loaded yet. Try again in a moment.'); else if(!r.count) toast('I couldn’t hear clear notes in that recording.'); else { toast(`${r.count} ${part==='chords'?'chords':'notes'} on “${r.track.name}”. The audio is muted; unmute it to hear both.`); openEditor(r.track.id); } },30); });
})();
