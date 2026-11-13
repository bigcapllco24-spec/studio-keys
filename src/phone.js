
/* ---------- phone layout (UX-4): Keys first, tabs at the bottom, a mini transport, bottom sheets ----------
   Only on phones (up to 600 px wide, or a short touch screen held sideways): html[data-phone] and html[data-ptab].
   Nothing is rebuilt: each tab shows one of the existing sections, and while the phone layout is on a few of the
   studio's own controls are moved into the sheets (and put back when it's off). Desktop and tablet keep the page as it was.
   var (not const) so files that load earlier can check PH without hitting the temporal dead zone. */
var PH={on:false,tab:'keys',sec:null,moved:[],sheet:null,opener:null,partId:null,lock:null,lp:null,lpDone:false,down:null,oct:0,iosTip:false,skipPop:false,edDown:0};
var PH_MQ=window.matchMedia?window.matchMedia('(max-width:600px), (max-height:500px) and (pointer:coarse)'):null;
var IS_IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const PH_SHEET_T={song:'Song',gear:'Keys settings',bpm:'Tempo and loop',sing:'Sing a part',add:'Add a part',part:'Part'};

function phMove(node,target){ if(!node||!target) return; const mk=document.createComment('phone'); node.before(mk); PH.moved.push([node,mk]); target.appendChild(node); }
function phRestore(){ PH.moved.slice().reverse().forEach(([n,mk])=>{ if(mk.isConnected) mk.replaceWith(n); }); PH.moved=[]; }
function phMoveAll(){
  phMove($('#asOrb'),$('#phOrbSlot'));
  phMove($('.as-opts'),$('#phPaneGear'));
  phMove($('#taste'),$('#phPageTaste'));
  phMove($('.top .themes'),$('#phThemeSlot'));
  phMove($('.credits p'),$('#phPageCredits'));
  phMove($('#songMake'),$('#phMakeSlot'));
  const bp=$('#phPaneBpm'); document.querySelectorAll('.daw-transport>.tempo,.daw-transport>label').forEach(n=>phMove(n,bp));
  const sp=$('#phPaneSong'); phMove($('#projName'),sp); phMove($('#saveState'),sp); phMove($('.songbar>.row:nth-child(2)'),sp);
}
function phApply(){
  const on=!!(PH_MQ&&PH_MQ.matches); if(on===PH.on) return; PH.on=on; const de=document.documentElement;
  if(on){ de.setAttribute('data-phone',''); phMoveAll(); ED.rowH=22; $('#asIn').dataset.ph=$('#asIn').placeholder; $('#asIn').placeholder='Type, or tap 🎤 on your keyboard to talk'; phTab('keys'); }
  else { phSheetClose(true); de.removeAttribute('data-phone'); de.removeAttribute('data-ptab'); de.removeAttribute('data-psec'); de.classList.remove('ph-typing','ph-singing'); phRestore(); ED.rowH=13; ED.zoom=1;
    if($('#asIn').dataset.ph) $('#asIn').placeholder=$('#asIn').dataset.ph; document.querySelectorAll('.assistant .chips-row .sc').forEach(c=>c.style.order=''); setView('playlist'); applyLayout(); phWake(false); }
  renderTracks(); if(ED.tid) drawEditor(); if(!ASSIST.busy&&!ASSIST.speaking&&!TALK.rec) setOrb(ASSIST.listening?'listening':'idle',idleText());
}

/* ----- tabs ----- */
function phTab(t,sec){
  PH.tab=t; PH.sec=t==='more'?(sec||null):null; const de=document.documentElement; de.setAttribute('data-ptab',t);
  if(PH.sec) de.setAttribute('data-psec',PH.sec); else de.removeAttribute('data-psec');
  document.querySelectorAll('#phTabs [data-ptab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ptab===t)));
  const bb=$('#phBackBar'); bb.hidden=!PH.sec; if(PH.sec){ const b=document.querySelector(`[data-phmore="${PH.sec}"] b`); $('#phBackT').textContent=b?b.textContent:''; }
  if(t==='mix') setView('mixer'); else if(t==='song') setView('playlist');
  if(t==='play'){ phKeybed(); phPlayUI(); }
  if(t!=='keys'){ document.documentElement.classList.remove('ph-typing'); $('#phType').setAttribute('aria-pressed','false'); }
  window.scrollTo(0,0);
  requestAnimationFrame(()=>{ if(t==='song'){ drawRolls(); if(songOn()) songRender(); }
    if(PH.sec==='lab'){ try{ drawWave(); drawIso(); drawHarm(); }catch(e){} } if(PH.sec==='sing') drawRoll((performance.now()-MIC.t0)/1000); });
  phSync();
}
function phMoreOpen(k){
  if(k==='songs'){ openSongs(); return; }
  if(k==='midi'&&!('requestMIDIAccess' in navigator)) return;
  phTab('more',k); phPush('page');
}

/* ----- history: the Android back button (and iPhone swipe back) closes a sheet, the editor or a More page ----- */
function phPush(kind){ try{ history.pushState({ph:kind},''); }catch(e){} }
function phPop(){ try{ if(history.state&&history.state.ph){ PH.skipPop=true; history.back(); } }catch(e){} }
window.addEventListener('popstate',()=>{ if(PH.skipPop){ PH.skipPop=false; return; } if(!PH.on) return;
  if(PH.sheet) phSheetClose(true); else if(!$('#editor').hidden) closeEditor(true); else if(PH.sec) phTab('more'); });

/* ----- sheets ----- */
function phSheet(kind,opener,title){
  const s=$('#phSheet'), already=!!PH.sheet; PH.sheet=kind; if(!already) PH.opener=opener||document.activeElement;
  s.querySelectorAll('.ph-pane').forEach(p=>p.hidden=p.dataset.pane!==kind);
  $('#phSheetT').textContent=title||PH_SHEET_T[kind]||''; s.hidden=false; $('.ph-card').style.transform='';
  if(!already) phPush('sheet');
  $('#phSheetBody').scrollTop=0; setTimeout(()=>{ const f=s.querySelector('.ph-sh-head [data-phclose]'); try{ f&&f.focus({preventScroll:true}); }catch(e){} },30);
}
function phSheetClose(fromPop){ if(!PH.sheet) return; const was=PH.sheet; PH.sheet=null; PH.partId=null; $('#phSheet').hidden=true; $('#phPartB').innerHTML='';
  if(!fromPop) phPop(); if(was==='part') renderTracks(); try{ PH.opener&&PH.opener.isConnected&&PH.opener.focus({preventScroll:true}); }catch(e){} PH.opener=null; }
function phOpenPart(id,fx){ const t=PROJ.tracks.find(x=>x.id===id); if(!t) return; PH.partId=id; phPartRender(); phSheet('part',null,t.name);
  if(fx) setTimeout(()=>{ const f=$('#phPartB .tfx'); if(f) f.scrollIntoView({block:'start'}); },40); }
function phPartRender(){ const t=PROJ.tracks.find(x=>x.id===PH.partId), b=$('#phPartB'); if(!t){ phSheetClose(); return; }
  const y=$('#phSheetBody').scrollTop; b.innerHTML=partSheetHTML(t); const s=b.querySelector('[data-tinst]'); if(s) s.value=t.inst; $('#phSheetT').textContent=t.name; $('#phSheetBody').scrollTop=y; }
/* daw.js calls this after every renderTracks, so the open sheet follows undo, mute, new effects, a deleted part */
function phPartRefresh(){ if(!PH.on||PH.sheet!=='part') return; const a=document.activeElement; if(a&&$('#phPartB').contains(a)&&a.matches('input[type=text],input:not([type]),.tname')) return; phPartRender(); }
/* the editor opens full screen (daw.js calls this from openEditor / closeEditor) */
function phEditor(open,fromPop){ if(!PH.on) return; if(open){ if(PH.sheet) phSheetClose(); phPush('editor'); phEdUI(); requestAnimationFrame(phEdFit); } else { $('#edWrap').style.maxHeight=''; if(!fromPop) phPop(); } }
/* the note grid takes the room left under the toolbar, so the velocity lane is always on screen */
function phEdFit(){ const ed=$('#editor'), w=$('#edWrap'); if(!PH.on||ed.hidden) return; w.style.maxHeight='none';
  const avail=ed.getBoundingClientRect().bottom-w.getBoundingClientRect().top-parseFloat(getComputedStyle(ed).paddingBottom||0)-2; w.style.maxHeight=Math.max(150,Math.floor(avail))+'px'; if(ED.tid) drawEditor(); }

/* ----- the mini transport, top bar and Keys tab follow the studio (uiLoop calls phSync; a light timer does the position) ----- */
const phSet=(el,prop,v)=>{ if(el&&el[prop]!==v) el[prop]=v; };
function phSync(){
  if(!PH.on) return; const st=LOOP.state, playing=PLAYING.has(st)||st==='counting'||st==='recording';
  const pb=$('#phPlay'); pb.setAttribute('aria-pressed',String(playing)); pb.setAttribute('aria-label',playing?'Stop':'Play'); $('#phPlayIco').setAttribute('d',playing?'M6 6h12v12H6z':'M7 4.5v15l13-7.5z');
  $('#phRec').setAttribute('aria-pressed',String(st==='recording'||st==='overdub'||st==='take'));
  document.querySelectorAll('[data-phmode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.phmode===SONG.view.mode)));
  phSet($('#phBpmV'),'textContent',String(Math.round(CTRL.bpm*10)/10));
  phSet($('#phSongName'),'textContent',PROJ.name||'Untitled song');
  const n=PROJ.tracks.length; phSet($('#phSongSub'),'textContent',n?`${keyName(projectKey())} · ${n} part${n>1?'s':''}`:($('#saveState').textContent||'New song'));
  phSet($('#phSongLen'),'textContent',songOn()?'Song · '+songLenText():`Loop · ${PROJ.bars} bar${PROJ.bars>1?'s':''}`);
  const u=$('#phUndo'); if(u) u.disabled=!UNDO.stack.length;
  const tp=TASTE.profile, art=tp&&(tp.artists||[]).map(a=>typeof a==='string'?a:a&&a.name).filter(Boolean);
  phSet($('#phTaste'),'textContent',art&&art.length?'Your sound: '+art.slice(0,3).join(', '):'Your sound: tap to add artists or Spotify');
  $('#phWelcome').classList.toggle('gone',n>0||!!$('#asChat').children.length);
  phChips(); phSingUI(); phWake(PLAYING.has(st)||st==='counting'||st==='recording');
}
/* the chip for the next step goes first (one element at a time) */
function phChips(){ const has=r=>PROJ.tracks.some(t=>t.role===r), next=!PROJ.tracks.length?null:!has('drums')?'drums':!has('bass')?'bass':!has('chords')?'chords':!has('melody')?'melody':null;
  const key={bass:/sing the bassline/,chords:/sing the chords/,melody:/sing a melody/,drums:/drums like Ben/}[next];
  document.querySelectorAll('.assistant .chips-row:not(.ph-welcome *) .sc').forEach(c=>{ const o=key&&key.test(c.dataset.say||'')?'-1':''; if(c.style.order!==o) c.style.order=o; }); }
function phPos(){ if(!PH.on) return; const p=$('#posDisp'), q=$('#phPos'); if(p&&q&&q.innerHTML!==p.innerHTML) q.innerHTML=p.innerHTML; phSingUI(); }
/* the singing screen: bar boxes, the note being sung, Cancel / Start again / Done */
function phSingUI(){
  const taking=LOOP.state==='take'||(LOOP.state==='counting'&&LOOP.after==='take'), box=$('#phSing');
  document.documentElement.classList.toggle('ph-singing',taking&&PH.on); if(box.hidden===!taking){} box.hidden=!taking; if(!taking) return;
  const part=TAKE.part, words={bass:'Sing the bassline',chords:'Sing the chords',melody:'Sing the melody',voice:'Your voice note'}[part]||'Sing';
  phSet($('#phSingT'),'textContent',words);
  phSet($('#phSingL'),'textContent',LOOP.state==='counting'?'Get ready: one bar count-in…':part==='chords'?'One note per chord. Only the drums play.':part==='voice'?'Your voice is recorded as it is.':'Only the drums play so Keys can hear you.');
  const bars=Math.max(1,PROJ.bars), nb=Math.min(bars,8), per=bars/nb, beat=A.ctx&&TR.running?(A.ctx.currentTime-TR.t0)/spb():-1, cur=LOOP.state==='take'?Math.floor(beat/4/per):-1;
  const html=Array.from({length:nb},(_,i)=>`<i class="${i<cur?'done':i===cur?'now':''}">${per>1?i*per+1:i+1}</i>`).join(''); phSet($('#phBars'),'innerHTML',html);
  const nt=$('#phNote'), live=MIC.active!=null; phSet(nt,'textContent',live?noteName(MIC.active):'—'); nt.classList.toggle('live',live);
  const nd=$('#micNeedle'); if(nd) phSet($('#phNeedle').style,'left',nd.style.left||'calc(50% - 2px)');
  phSet($('#phLast'),'textContent',(ASSIST.sung||[]).slice(-6).map(noteName).join(' '));
}
async function phWake(want){ if(!('wakeLock' in navigator)) return; try{
  if(want&&!PH.lock&&document.visibilityState==='visible'){ PH.lock='pending'; const l=await navigator.wakeLock.request('screen'); PH.lock=l; l.addEventListener('release',()=>{ if(PH.lock===l) PH.lock=null; }); }
  else if(!want&&PH.lock&&PH.lock!=='pending'){ const l=PH.lock; PH.lock=null; await l.release(); } }catch(e){ PH.lock=null; } }

/* ----- Play tab: sound pickers, octave, a keyboard sized for fingers ----- */
function phKeybed(){ if(!PH.on) return false; const land=innerWidth>innerHeight; KB.lo=clamp(60+12*PH.oct,24,96); KB.hi=KB.lo+(land?24:16); renderKeyboard(); $('#phOctV').textContent=noteName(KB.lo); return true; }
function phPlayUI(){ const o=instOptions(); ['keys','pads'].forEach(z=>{ const s=$(z==='keys'?'#phKeysSel':'#phPadsSel'); if(s.dataset.n!==String(ORDER.length)){ s.innerHTML=o; s.dataset.n=String(ORDER.length); } s.value=ZONES[z]; }); }
function phOct(d){ PH.oct=clamp(PH.oct+d,-3,2); phKeybed(); }

/* ----- the iPhone silent switch mutes web audio: say so once ----- */
function phIosTip(){ if(!IS_IOS||PH.iosTip) return; PH.iosTip=true; setTimeout(()=>toast('No sound? Flip the silent switch on the side of your iPhone, and turn the volume up.'),600); }

/* typing with the phone keyboard (its own dictation mic works here too); the assistant opens it when talking isn't available */
function phOpenType(focus){ if(PH.on){ document.documentElement.classList.add('ph-typing'); $('#phType').setAttribute('aria-pressed','true'); } if(focus!==false) try{ $('#asIn').focus(); }catch(e){} }

/* ----- note editor on a touch screen: tap a note to select it, hold to add more to the selection, two fingers scroll, pinch zooms ----- */
function phEdUI(){ const b=$('#edPlayB'); if(!b) return; const p=PLAYING.has(LOOP.state); b.textContent=p?'■ Stop':'▶ Play'; b.setAttribute('aria-pressed',String(p)); }
function phEdGestures(){
  const cv=$('#edCanvas'), wrap=$('#edWrap'), pts=new Map(); let g=null, hold=null;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const cancelOp=()=>{ const t=edTrack(), D=ED.drag;
    if(D&&t){ if(D.mode==='resize'&&D.moved&&t.events[t.events.length-1]===D.lead&&performance.now()-PH.edDown<500){ t.events.pop(); ED.sel=new Set(); }
      else if(D.orig&&D.mode!=='vel') D.group.forEach(x=>{ const o=D.orig.get(x); if(o&&typeof o==='object'){ x.b=o.b; x.n=o.n; x.d=o.d; } }); }
    ED.drag=null; ED.box=null; ED.paint=null; drawEditor(); };
  cv.addEventListener('pointerdown',e=>{ if(!PH.on||e.pointerType!=='touch') return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===1){ PH.edDown=performance.now(); const sel0=new Set(ED.sel), x0=e.clientX, y0=e.clientY; clearTimeout(hold&&hold.t);
      hold={x0,y0,t:setTimeout(()=>{ const D=ED.drag; if(!D||D.moved||!D.lead||D.mode==='vel') return; const s=new Set(sel0); s.has(D.lead)?s.delete(D.lead):s.add(D.lead); ED.sel=s; ED.drag=null; drawEditor(); try{ navigator.vibrate&&navigator.vibrate(12); }catch(_){} },450)}; return; }
    e.stopImmediatePropagation(); e.preventDefault(); if(hold) clearTimeout(hold.t);
    if(pts.size===2){ cancelOp(); const [a,b]=[...pts.values()]; g={d:Math.max(20,dist(a,b)),mx:(a.x+b.x)/2,my:(a.y+b.y)/2,zoom:ED.zoom||1,sl:wrap.scrollLeft,top:ED.top}; } },true);
  cv.addEventListener('pointermove',e=>{ if(!pts.has(e.pointerId)) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(hold&&pts.size===1&&Math.hypot(e.clientX-hold.x0,e.clientY-hold.y0)>8) clearTimeout(hold.t);
    if(!g) return; e.stopImmediatePropagation(); const [a,b]=[...pts.values()]; if(!b) return;
    const z=clamp(g.zoom*dist(a,b)/g.d,1,4), mx=(a.x+b.x)/2, my=(a.y+b.y)/2, t=edTrack();
    ED.zoom=Math.round(z*50)/50; if(t&&!isDrumTrack(t)) ED.top=clamp(g.top+Math.round((my-g.my)/ED.rowH),40,127);
    drawEditor(); const L=wrap.getBoundingClientRect().left; wrap.scrollLeft=Math.max(0,(g.sl+g.mx-L)*(ED.zoom/g.zoom)-(mx-L)); },true); /* zoom around the fingers */
  const up=e=>{ if(!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if(hold&&!pts.size) clearTimeout(hold.t);
    if(g){ e.stopImmediatePropagation(); if(pts.size<2) g=null; } };
  cv.addEventListener('pointerup',up,true); cv.addEventListener('pointercancel',up,true);
}

/* ----- wiring (called once from boot.js, after every file has loaded) ----- */
function phoneInit(){
  document.querySelectorAll('#phTabs [data-ptab]').forEach(b=>b.addEventListener('click',()=>{ if(PH.sec) phPop(); phTab(b.dataset.ptab); }));
  $('#phBack').onclick=()=>{ phPop(); phTab('more'); };
  document.querySelectorAll('[data-phmore]').forEach(b=>b.addEventListener('click',()=>phMoreOpen(b.dataset.phmore)));
  if(!('requestMIDIAccess' in navigator)) $('#phMoreMidi').hidden=true;
  /* top bar */
  $('#phSongBtn').onclick=e=>phSheet('song',e.currentTarget); $('#phGear').onclick=e=>phSheet('gear',e.currentTarget);
  $('#phUndo').onclick=()=>{ undo(); phSync(); };
  /* mini transport */
  $('#phPlay').onclick=()=>{ ensureAudio(); const st=LOOP.state; if(PLAYING.has(st)||st==='counting'||st==='recording'){ loopStop(); return; }
    if(!PROJ.tracks.length){ toast('Ask Keys for a beat first, or add a part.'); return; } loopPlay(); phIosTip(); };
  $('#phRec').onclick=()=>{ recordPress(); phIosTip(); };
  document.querySelectorAll('[data-phmode]').forEach(b=>b.addEventListener('click',()=>{ const o=document.querySelector(`#songSeg [data-songmode="${b.dataset.phmode}"]`); if(o) o.click(); phSync(); }));
  $('#phBpm').onclick=e=>phSheet('bpm',e.currentTarget);
  /* Keys tab */
  $('#phType').onclick=()=>{ const on=!document.documentElement.classList.contains('ph-typing'); document.documentElement.classList.toggle('ph-typing',on); $('#phType').setAttribute('aria-pressed',String(on)); if(on) $('#asIn').focus(); else $('#asIn').blur(); };
  $('#phSingBtn').onclick=e=>phSheet('sing',e.currentTarget);
  $('#phTaste').onclick=()=>phMoreOpen('taste');
  $('#phSingX').onclick=()=>loopStop();
  $('#phSingR').onclick=()=>{ const p=TAKE.part; loopStop(); setTimeout(()=>TAKE.start(p),60); };
  $('#phSingD').onclick=()=>{ if(LOOP.state==='take') TAKE.finish(); else loopStop(); };
  document.querySelectorAll('[data-phsing]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.phsing; phSheetClose(); phTab('keys'); ensureAudio();
    if(k==='voice') TAKE.start('voice'); else handleRequest({bass:'let me sing the bassline',chords:'let me sing the chords',melody:'let me sing a melody'}[k]); }));
  /* Song tab */
  $('#phAddPart').onclick=e=>phSheet('add',e.currentTarget);
  document.querySelectorAll('[data-phadd]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.phadd; phSheetClose();
    if(k==='ask'){ phTab('keys'); phOpenType(); $('#asIn').value='Add '; return; }
    if(k==='import'){ $('#importBtn').click(); return; }
    const o=document.querySelector(`.view-tabs [data-add="${k}"]`); if(o){ if(k==='sing'||k==='voice') phTab('keys'); o.click(); } }));
  /* a part card: tap opens its sheet, FX opens it at the effects, hold selects several (the selection bar appears) */
  const tr=$('#tracks');
  tr.addEventListener('pointerdown',e=>{ if(!PH.on) return; const c=e.target.closest('.trk'); PH.down={x:e.clientX,y:e.clientY};
    clearTimeout(PH.lp); if(!c||e.target.closest('button,select,input,.selbar')) return;
    PH.lp=setTimeout(()=>{ PH.lpDone=true; const id=c.dataset.tid; SEL.has(id)?SEL.delete(id):SEL.add(id); try{ navigator.vibrate&&navigator.vibrate(12); }catch(_){} renderTracks(); },500); });
  tr.addEventListener('pointermove',e=>{ if(PH.down&&Math.hypot(e.clientX-PH.down.x,e.clientY-PH.down.y)>10) clearTimeout(PH.lp); });
  ['pointerup','pointercancel'].forEach(k=>tr.addEventListener(k,()=>clearTimeout(PH.lp)));
  tr.addEventListener('contextmenu',e=>{ if(PH.on&&e.target.closest('.trk')) e.preventDefault(); });
  tr.addEventListener('click',e=>{ if(!PH.on) return; const c=e.target.closest('.trk'); if(!c||e.target.closest('.selbar')) return;
    if(PH.lpDone){ PH.lpDone=false; e.stopPropagation(); e.preventDefault(); return; }
    if(PH.down&&Math.hypot(e.clientX-PH.down.x,e.clientY-PH.down.y)>10) { e.stopPropagation(); return; } /* an audio clip was dragged */
    if(e.target.closest('[data-mute],[data-solo],[data-prev]')) return;
    e.stopPropagation(); const id=c.dataset.tid;
    if(SEL.size>0&&!e.target.closest('[data-tfx]')){ SEL.has(id)?SEL.delete(id):SEL.add(id); renderTracks(); return; }
    phOpenPart(id,!!e.target.closest('[data-tfx]')); },true);
  /* the part sheet: daw.js handles its controls like a track row's; here only what's special to the sheet */
  $('#phPartB').addEventListener('click',e=>{ if(e.target.closest('[data-edit]')) phSheetClose(); },true);
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-phpart]'); if(b) phOpenPart(b.dataset.phpart,true); });
  /* song map: hold a section for its menu (rename, duplicate, longer, split, delete) */
  const sm=$('#songMap'); let smT=0, smDone=false;
  sm.addEventListener('pointerdown',e=>{ const b=e.target.closest('.smb'); if(!b) return; clearTimeout(smT); const x=e.clientX, y=e.clientY; smT=setTimeout(()=>{ smDone=true; songSecMenu(b.dataset.sid,x,y,b); },500); });
  ['pointerup','pointercancel','pointerleave'].forEach(k=>sm.addEventListener(k,()=>clearTimeout(smT)));
  sm.addEventListener('click',e=>{ if(smDone){ smDone=false; e.stopPropagation(); } },true);
  sm.addEventListener('contextmenu',e=>{ if(PH.on) e.preventDefault(); });
  /* sheets: tap outside, ✕, Escape or drag down closes */
  $('#phSheet').addEventListener('click',e=>{ if(e.target.closest('[data-phclose]')) phSheetClose(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&PH.sheet){ e.stopPropagation(); phSheetClose(); } },true);
  { const card=$('.ph-card'); let y0=null, dy=0;
    ['#phGrab','.ph-sh-head'].forEach(s=>$(s).addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; y0=e.clientY; dy=0; try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){} }));
    ['#phGrab','.ph-sh-head'].forEach(s=>{ const el=$(s); el.addEventListener('pointermove',e=>{ if(y0==null) return; dy=Math.max(0,e.clientY-y0); card.style.transform=`translateY(${dy}px)`; });
      const end=()=>{ if(y0==null) return; y0=null; if(dy>90) phSheetClose(); else card.style.transform=''; }; el.addEventListener('pointerup',end); el.addEventListener('pointercancel',end); }); }
  /* Play tab */
  $('#phKeysSel').onchange=e=>setZone('keys',e.target.value,{announce:true}); $('#phPadsSel').onchange=e=>setZone('pads',e.target.value,{announce:true});
  $('#phOctDn').onclick=()=>phOct(-1); $('#phOctUp').onclick=()=>phOct(1); $('#phAllSounds').onclick=()=>phMoreOpen('sounds');
  /* note editor */
  $('#edPlayB').onclick=()=>{ ensureAudio(); if(PLAYING.has(LOOP.state)) loopStop(); else loopPlay(); phEdUI(); };
  $('#edUndoB').onclick=()=>{ undo(); if(ED.tid) drawEditor(); };
  phEdGestures();
  /* the first tap anywhere turns the sound on (a phone has no "click to start" pill) */
  document.addEventListener('pointerdown',e=>{ if(PH.on&&!A.ctx&&!e.target.closest('#asOrb')) ensureAudio(); },true);
  /* the status bar takes the theme's background */
  const meta=document.querySelector('meta[name="theme-color"]'), tc=()=>{ if(meta) meta.content=cssVar('--t1')||'#07120e'; };
  try{ new MutationObserver(tc).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']}); }catch(e){} tc();
  setInterval(phPos,150);
  let rz=0; window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(()=>{ if(PH.on&&PH.tab==='play') phKeybed(); if(PH.on&&!$('#editor').hidden){ edHint(); phEdFit(); } },150); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&PH.on) phSync(); });
  if(PH_MQ){ if(PH_MQ.addEventListener) PH_MQ.addEventListener('change',phApply); else if(PH_MQ.addListener) PH_MQ.addListener(phApply); }
  phApply();
}
