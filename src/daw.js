
/* ---------- DAW workspace: playlist of tracks, piano roll / step sequencer, mixer view, song manager ---------- */
const DRUM_ROWS=[[49,'Crash'],[51,'Ride'],[46,'Open hat'],[44,'Pedal hat'],[42,'Closed hat'],[56,'Cowbell'],[50,'High tom'],[47,'Mid tom'],[45,'Low tom'],[37,'Rim'],[39,'Clap'],[38,'Snare'],[36,'Kick']];
const ED={tid:null,grid:0.25,top:84,rowH:13,sel:null,drag:null,paint:null};
let VIEW='playlist';
const SEL=new Set(), FXOPEN=new Set();
const fxCount=t=>Object.keys(t.fx||{}).filter(k=>TFX_DEF[k]&&t.fx[k]!=null&&!(k==='lp'&&t.fx[k]>=20000)&&!(k==='pan'&&!t.fx[k])&&t.fx[k]!==0).length;
const fxLog=(d,v)=>Math.round(d.min*Math.pow(d.max/d.min,v/1000));
const fxPos=(d,x)=>d.log?Math.round(1000*Math.log(x/d.min)/Math.log(d.max/d.min)):Math.round((x-d.min)/(d.max-d.min)*1000);
const fxShow=(k,x)=>{ const d=TFX_DEF[k]; if(d.unit==='Hz') return x>=1000?(x/1000).toFixed(1)+' kHz':x+' Hz'; if(k==='pan') return x===0?'Centre':(x<0?'L ':'R ')+Math.round(Math.abs(x)*100); return Math.round(x*100)+'%'; };
function fxPanel(t){
  const fx=t.fx||{}, on=TFX_ORDER.filter(k=>fx[k]!=null&&!(k==='lp'&&fx[k]>=20000)&&fx[k]!==0||(k==='pan'&&fx.pan));
  const rows=on.map(k=>{ const d=TFX_DEF[k], x=fx[k]; return `<div class="fxrow"><span class="fxn" title="${esc(d.hint)}">${d.name}</span><input type="range" min="0" max="1000" value="${fxPos(d,x)}" data-tfxk="${t.id}:${k}" aria-label="${d.name} for ${esc(t.name)}"><span class="fxv" data-tfxv="${t.id}:${k}">${fxShow(k,x)}</span><button class="lk" type="button" data-tfxrm="${t.id}:${k}" title="Remove ${d.name}">✕</button></div>`; }).join('');
  const add=TFX_ORDER.filter(k=>!on.includes(k)).map(k=>`<option value="${k}">${TFX_DEF[k].name}</option>`).join('');
  return `<div class="tfx" data-fxfor="${t.id}"><div class="tfx-eq"><b>EQ</b>${dialHTML('eq:'+t.id+':lo','Low')}${dialHTML('eq:'+t.id+':mid','Mid')}${dialHTML('eq:'+t.id+':hi','High')}</div>
    <div class="tfx-list">${rows||'<span class="hint">No effects yet. Add one, or use the studio preset for this kind of part.</span>'}</div>
    <div class="tfx-add row"><select class="select inline" data-tfxadd="${t.id}" aria-label="Add an effect to ${esc(t.name)}"><option value="">+ Add effect…</option>${add}</select>
      <button class="btn small" type="button" data-tfxpreset="${t.id}" title="Effects a producer would start with for this part">Studio preset</button>
      <button class="btn small ghost" type="button" data-tfxclear="${t.id}">Clear effects</button></div></div>`;
}
function selBar(){ if(SEL.size<2) return ''; return `<div class="selbar"><b>${SEL.size} tracks selected</b><span class="hint">Ctrl/Cmd+click a track to add or remove it</span><span class="spacer"></span>
  <button class="btn small primary" type="button" data-sel="play">▶ Play these together</button><button class="btn small" type="button" data-sel="mute">Mute</button><button class="btn small" type="button" data-sel="solo">Solo</button><button class="btn small" type="button" data-sel="fx">FX</button><button class="btn small" type="button" data-sel="dup">Duplicate</button><button class="btn small ghost" type="button" data-sel="del">Delete</button><button class="btn small ghost" type="button" data-sel="clear">Clear selection</button></div>`; }
function setPreview(ids){ ensureAudio(); PREVIEW=ids&&ids.size?new Set(ids):null; refreshTrackGains(); if(PREVIEW&&!TR.running) loopPlay(); if(!PREVIEW&&TR.running) loopStop(); renderTracks(); }
function setView(v){ VIEW=v; document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===v))); $('#playlist').hidden=v!=='playlist'; $('#mixerView').hidden=v!=='mixer'; if(v==='mixer') renderMixerView(); else drawRolls(); }
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

/* ----- SE-7a: the honest key chip. It says where the key comes from and how sure it is; tap it for the best guesses ----- */
const KEY_TAG={you:'set',keys:'Keys picked',vibe:'from the vibe',song:'from the song'};
const keyMeter=l=>`<span class="kc-meter" aria-hidden="true">${[1,2,3,4].map(i=>`<i${i<=l?' class="on"':''}></i>`).join('')}</span>`;
function renderKeyChip(){
  const el=$('#keyInfo'); if(!el) return; const st=keyStatus(), tag=KEY_TAG[st.from];
  el.innerHTML=!st.key?'<span class="kc-none">no key yet</span>'
    :tag?`<span class="kc-tag">${tag}</span>`
    :`<b>${keyName(st.key)}</b>${keyMeter(st.level)}<span class="kc-word">${st.src?KEY_SRC[st.src]:st.word}${st.alt&&!st.src&&st.level<4?' · or '+keyName(st.alt):''}</span>`;
  el.dataset.from=st.from; el.setAttribute('aria-label',`Key: ${keyStatusText(st)}. Tap to check or fix it.`);
  if(!$('#keyPop').hidden) renderKeyPop(st);
}
function renderKeyPop(st){
  st=st||keyStatus(); const p=$('#keyPop'), hard=!!KEY_TAG[st.from], c=st.cands||[];
  const head=!st.key?'<b>No key yet</b>':`<b>${keyName(st.key)}</b><span class="kp-dj">DJ key ${djKey(st.key)}</span><span class="kp-sub">${hard?KEY_TAG[st.from]:st.src?KEY_SRC[st.src]:st.word}</span>${!hard?keyMeter(st.level):''}`;
  const sub=!st.key?`Not enough notes to hear a key yet (I need about 8). Play, sing or add a part, or pick a key in the Key menu.`
    :st.from==='you'?`You set this key. New parts follow it.`
    :st.from==='keys'?`Keys picked this key for the first part because the song had none. Keep it, set another below or in the Key menu.`
    :st.from==='vibe'?`This key came with the vibe${PROJ.ref?' ('+esc(PROJ.ref)+')':''}. New parts follow it.`
    :st.from==='song'?`This key came from a song you brought in.`
    :`Worked out from your ${st.src?KEY_SRC_NOUN[st.src]:'notes'}${st.level<3?', so it can still change as you add parts':''}. New parts follow it. Set it to keep it.`;
  const rows=c.length?`<div class="kp-h">${hard?'Your notes sound like':'Best guesses'}</div>`+c.map((k,i)=>{ const isSet=st.from==='you'&&sameKey(k,st.key);
    return `<div class="kp-row${sameKey(k,st.key)?' cur':''}"><div><span><b>${keyName(k)}</b><span class="kp-dj">DJ key ${djKey(k)}</span></span><span class="kp-why">${esc(k.why)}</span></div><button class="btn small${i===0&&!hard?' primary':''}" type="button" data-kset="${i}"${isSet?' disabled':''} title="Set the song to ${keyName(k)} (your notes stay where they are)">${isSet?'Set ✓':'Set'}</button></div>`; }).join(''):'';
  const foot=`<div class="kp-foot">${hard?`<button class="btn small" type="button" data-kauto>Back to auto</button>`:`<button class="btn small" type="button" data-kauto>${st.key?'Keep on auto':'Close'}</button>`}<span class="hint">${hard?'Auto works the key out from your notes.':'Auto follows your notes.'}</span></div>`;
  p.innerHTML=`<div class="kp-top">${head}</div><div class="kp-sub">${sub}</div>${rows}${foot}`;
}
function keyPopOpen(open){
  const p=$('#keyPop'), b=$('#keyInfo'); if(!p||!b) return; if(open===undefined) open=p.hidden;
  if(!open){ if(p.hidden) return; p.hidden=true; b.setAttribute('aria-expanded','false'); return; }
  renderKeyPop(); p.hidden=false; b.setAttribute('aria-expanded','true'); p.style.left='0px';
  const r=p.getBoundingClientRect(), over=r.right-(document.documentElement.clientWidth-16); if(over>0) p.style.left=-Math.min(over,r.left-16)+'px';
  const f=p.querySelector('button:not([disabled])'); if(f) try{ f.focus({preventScroll:true}); }catch(e){}
}
(function(){ const b=$('#keyInfo'), p=$('#keyPop'); if(!b||!p) return;
  b.addEventListener('click',()=>keyPopOpen());
  p.addEventListener('click',e=>{ const s=e.target.closest('[data-kset]'), a=e.target.closest('[data-kauto]');
    if(s){ const k=(keyStatus().cands||[])[+s.dataset.kset]; if(!k) return; setKey({tonic:k.tonic,mode:k.mode},'you',{move:false}); keyPopOpen(false); toast(`Key set to ${keyName(k)}. New parts follow it.`); b.focus(); }
    else if(a){ const hard=!!KEY_TAG[keyStatus().from]; keyPopOpen(false); if(hard){ setKey(null); toast(`Key back on auto: ${keyStatusText()}`); } b.focus(); } });
  p.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); keyPopOpen(false); b.focus(); } });
  document.addEventListener('pointerdown',e=>{ if(!p.hidden&&!p.contains(e.target)&&!b.contains(e.target)) keyPopOpen(false); },true);
})();

/* ----- SE-7c: the chord strip (one block per chord over the loop, in sync with playback), the chord fixer, and the song card
   on an audio track that was listened to (key, tempo, chords; nothing changes until you tap) ----- */
const CARDHIDE=new Set(), CARDBASS=new Set();
const CL={blocks:[],now:-1,open:-1,draft:null};
const CQ_BTNS=[['maj','Major'],['min','Minor'],['sus4','Sus'],['7','7'],['none','None']];
const CQ_WORDS={maj:'major',min:'minor','7':'seven',m7:'minor seven',maj7:'major seven',sus4:'sus four',sus2:'sus two',dim:'diminished','5':'power chord'};
const cqGroup=q=>q==='m7'?'min':q==='maj7'?'maj':q==='sus2'?'sus4':q;
const chordNotes=c=>chordPcs(c).map(pc=>PC_NAMES[pc]).join(' ');
const chordSay=c=>!c||c.root==null||c.q==='none'?'no chord':PC_NAMES[c.root]+' '+(CQ_WORDS[c.q]||'major')+(c.bass!=null&&c.bass!==c.root?' over '+PC_NAMES[c.bass]:'');
const hasOwnChords=()=>Array.isArray(PROJ.chords)&&PROJ.chords.length>0;
function chordLaneOn(){ return !songOn()&&PROJ.tracks.length>0&&(hasOwnChords()||chordFollowers().length>0); }
function chordSpanText(c){ const bar=Math.floor(c.b/4+1e-6)+1, off=c.b-(bar-1)*4, endBar=Math.floor((c.b+c.d)/4-1e-6)+1;
  if(off>1e-6) return `Bar ${bar}, beat ${+(off+1).toFixed(2)}`; if(c.d<4-1e-6) return `Bar ${bar}, beats 1-${+c.d.toFixed(2)}`; return endBar>bar?`Bars ${bar}-${endBar}`:`Bar ${bar}`; }
function renderChordLane(){
  const lane=$('#chordLane'); if(!lane) return; const on=chordLaneOn(); lane.hidden=!on;
  if(!on){ CL.blocks=[]; CL.now=-1; chordPopOpen(-1); return; }
  const L=PROJ.bars*4, bl=chordBlocks().filter(c=>c.d>0&&c.b<L-1e-6); CL.blocks=bl; CL.now=-1;
  const own=hasOwnChords(), song=own&&PROJ.chords.some(c=>c.from==='audio'), fixed=own&&PROJ.chords.some(c=>c.from==='user');
  const ct=[...PROJ.tracks].reverse().find(t=>t.fromSong&&t.role==='chords'), sn=ct&&(PROJ.tracks.find(x=>x.id===ct.fromSong)||{}).name;
  $('#chordSrc').textContent=song?(sn?`from “${sn}”`:'from the song')+(fixed?' · fixed':''):own?'fixed by you':'Keys’ chords';
  $('#chordReset').hidden=!own;
  const s=$('#chordStrip'); s.style.setProperty('--bars',PROJ.bars);
  s.innerHTML=bl.map((c,i)=>{ const unsure=c.conf!=null&&c.conf<0.5, none=c.root==null||c.q==='none', nm=chordName(c)+(unsure&&!none?'?':'');
    return `<button type="button" class="cb${unsure?' unsure':''}${none?' none':''}${c.from==='user'?' mine':''}" data-cb="${i}" style="left:${(c.b/L*100).toFixed(3)}%;width:${(Math.min(c.d,L-c.b)/L*100).toFixed(3)}%;--o:${(c.conf==null?1:0.45+0.55*clamp(c.conf,0,1)).toFixed(2)}" tabindex="${i===0?0:-1}" aria-haspopup="dialog" aria-expanded="false" aria-label="${chordSpanText(c)}: ${chordSay(c)}${unsure?', unsure':''}. Click to fix it." title="${esc(chordName(c))}${none?'':' · '+chordNotes(c)}${unsure?' · unsure':''} · click to fix"><b>${esc(nm)}</b><span>${none?'rest':chordNotes(c)}</span></button>`; }).join('');
  if(CL.open>=0) chordPopOpen(-1);
}
/* the playhead's chord, lit while the loop plays (called every frame; touches the DOM only when the chord changes) */
function chordLaneTick(beat){ if(!CL.blocks.length&&CL.now<0) return; let i=-1;
  if(beat!=null&&beat>=0) i=CL.blocks.findIndex(c=>c.b<=beat+1e-6&&beat<c.b+c.d-1e-6); if(i===CL.now) return;
  const s=$('#chordStrip'); if(!s) return; const o=s.querySelector('.cb.now'); if(o) o.classList.remove('now'); const n=i>=0&&s.querySelector(`[data-cb="${i}"]`); if(n) n.classList.add('now'); CL.now=i; }
/* "Hear it": the chord on the song's chord sound (or the piano), with its bass note */
function hearChord(c){ const ctx=ensureAudio(); if(!ctx||!c) return; const pcs=chordPcs(c); if(!pcs.length) return;
  const ct=PROJ.tracks.find(t=>t.kind==='notes'&&t.role==='chords'&&t.gen)||PROJ.tracks.find(t=>t.kind==='notes'&&t.role==='chords');
  let I=ct&&INST.get(ct.inst); if(!I||I.percussive||I.drums) I=INST.get('piano')||zoneInst('keys'); if(I&&I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{});
  const now=ctx.currentTime+0.01, ns=voice(pcs,57).concat([nearestAbove(c.bass!=null?c.bass:c.root,40)]);
  ns.forEach(n=>{ try{ const v=I.play(ctx,zoneDest('keys'),n,0.68,now); if(v&&!v.oneShot) v.release(now+1.4); }catch(e){} }); }
/* fix one block exactly where it is (whole bars, from a beat, or an odd span), one undo step; returns the reply text */
function fixChordBlock(i,chord){
  const c=CL.blocks[i], p=parseChord(chord); if(!c||!p) return null;
  const bar=Math.floor(c.b/4+1e-6)+1, off=c.b-(bar-1)*4, whole=Math.abs(c.d/4-Math.round(c.d/4))<1e-6;
  let r=null;
  if(off<1e-6&&whole) r=setChord(bar,p,{bars:Math.round(c.d/4)});
  else if(off>1e-6&&c.b+c.d<=bar*4+1e-6) r=setChord(bar,p,{beat:off+1});
  if(r) return r.text;
  const list=chordBlocks().map(x=>{ if(Math.abs(x.b-c.b)>1e-6) return x; const o=Object.assign({},x,{root:p.root,q:p.q,conf:1,from:'user'}); delete o.alt; delete o.bass; if(p.bass!=null) o.bass=p.bass; return o; });
  const moved=setChords(list); if(!moved) return null;
  return `${chordSpanText(c)} is now ${chordName(p)}${moved.length?'; '+moved.join(', ')+' follow'+(moved.length===1?'s':''):''}`; }
function chordPopOpen(i){
  const p=$('#chordPop'); if(!p) return; const prev=CL.open>=0&&document.querySelector(`[data-cb="${CL.open}"]`);
  if(prev) prev.setAttribute('aria-expanded','false');
  if(i==null||i<0||!CL.blocks[i]){ CL.open=-1; p.hidden=true; return; }
  const c=CL.blocks[i]; CL.open=i; CL.draft={root:c.root==null?projectKey().tonic:c.root,q:c.root==null?'none':c.q,bass:c.bass};
  renderChordPop(); p.hidden=false; const b=document.querySelector(`[data-cb="${i}"]`); if(b) b.setAttribute('aria-expanded','true');
  /* under the block, kept inside the playlist (a phone shows it as a sheet at the bottom: see the CSS) */
  const pl=$('#playlist').getBoundingClientRect(), br=b?b.getBoundingClientRect():pl, pw=p.offsetWidth;
  p.style.left=Math.max(0,Math.min(br.left-pl.left,pl.width-pw))+'px'; p.style.top=(br.bottom-pl.top+6)+'px';
  const f=p.querySelector('[data-capply]:not([disabled])')||p.querySelector('[data-cq][aria-pressed="true"]')||p.querySelector('button'); if(f) try{ f.focus({preventScroll:true}); }catch(e){}
}
function renderChordPop(){
  const p=$('#chordPop'), c=CL.blocks[CL.open], d=CL.draft; if(!c||!d) return;
  const same=d.q===(c.root==null?'none':c.q)&&(d.q==='none'||d.root===c.root)&&d.bass===c.bass, dn=chordName(d), none=d.q==='none';
  const sure=c.from==='audio'?(c.conf>=0.75?'heard in the song, sure':c.conf>=0.5?'heard in the song, fairly sure':'heard in the song, unsure'):c.from==='user'?'fixed by you':'Keys’ chord';
  const alt=c.alt&&c.alt.root!=null&&!(c.alt.root===c.root&&c.alt.q===c.q)?c.alt:null;
  p.innerHTML=`<div class="cp-top"><b>${chordSpanText(c)} · ${esc(chordName(c))}</b><span class="cp-notes">${c.root==null||c.q==='none'?'no chord':chordNotes(c)}</span><span class="cp-sure">${sure}</span></div>
    <div class="cp-roots" role="group" aria-label="Root note">${PC_NAMES.map((n,pc)=>`<button type="button" data-croot="${pc}" aria-pressed="${!none&&d.root===pc}">${n}</button>`).join('')}</div>
    <span class="seg cp-q" role="group" aria-label="Chord type">${CQ_BTNS.map(([q,l])=>`<button type="button" data-cq="${q}" aria-pressed="${q==='none'?none:!none&&cqGroup(d.q)===q}">${l}</button>`).join('')}</span>
    <div class="cp-now"><b>${esc(dn)}</b><span>${none?'the parts Keys made rest here':chordNotes(d)}</span></div>
    <div class="cp-act"><button class="btn small" type="button" data-chear${none?' disabled':''} title="Play the chord">▶ Hear it</button><button class="btn small primary" type="button" data-capply${same?' disabled':''}>Use ${esc(dn)}</button>${alt?`<button class="btn small" type="button" data-calt title="The second guess from the song">or ${esc(chordName(alt))}</button>`:''}</div>
    <label class="cp-type"><span>Or type one</span><input class="input inline" type="text" data-ctype placeholder="F♯m7, B♭/D, N.C." aria-label="Type a chord" autocomplete="off" spellcheck="false"></label>
    <div class="hint">${hasOwnChords()?'The bass, chords and melody Keys made follow. Your own parts stay. Ctrl+Z undoes it.':'The bass, chords and melody Keys made follow; your own parts stay. From now on these chords stay as they are (they stop bending towards melodies you play). Ctrl+Z undoes it.'}</div>`;
}
function chordApply(chord){ if(typeof undoBoundary==='function') undoBoundary(); const i=CL.open, b0=CL.blocks[i]&&CL.blocks[i].b; const txt=fixChordBlock(i,chord); chordPopOpen(-1);
  if(!txt){ toast('I couldn’t read that chord. Try “Bm”, “F♯7”, “B♭/D” or “N.C.”'); return; } toast(txt);
  const k=CL.blocks.findIndex(x=>Math.abs(x.b-b0)<1e-6), el=document.querySelector(`[data-cb="${k<0?0:k}"]`); if(el){ chordFocus(el); } }
function chordFocus(el){ const s=$('#chordStrip'); s.querySelectorAll('.cb').forEach(x=>x.tabIndex=-1); el.tabIndex=0; try{ el.focus({preventScroll:true}); }catch(e){} }
(function(){ const s=$('#chordStrip'), p=$('#chordPop'); if(!s||!p) return;
  s.addEventListener('click',e=>{ const b=e.target.closest('[data-cb]'); if(!b) return; const i=+b.dataset.cb; chordFocus(b); chordPopOpen(CL.open===i?-1:i); });
  s.addEventListener('keydown',e=>{ const b=e.target.closest('[data-cb]'); if(!b) return; const n=CL.blocks.length, i=+b.dataset.cb;
    const j=e.key==='ArrowRight'?Math.min(n-1,i+1):e.key==='ArrowLeft'?Math.max(0,i-1):e.key==='Home'?0:e.key==='End'?n-1:null;
    if(j==null) return; e.preventDefault(); e.stopPropagation(); const el=s.querySelector(`[data-cb="${j}"]`); if(el){ chordFocus(el); if(CL.open>=0) chordPopOpen(j); } });
  $('#chordReset').addEventListener('click',()=>{ if(typeof undoBoundary==='function') undoBoundary(); const moved=clearChords(); toast(`Back to Keys’ chords${moved&&moved.length?'; '+moved.join(', ')+' follow':''}. Ctrl+Z brings yours back.`); });
  p.addEventListener('click',e=>{ const d=CL.draft; if(!d) return; const r=e.target.closest('[data-croot]'), q=e.target.closest('[data-cq]');
    if(r||q){ if(r){ d.root=+r.dataset.croot; if(d.q==='none'){ const k=projectKey(), deg=scaleOf(k).indexOf(d.root); const tq=deg>=0?triadQ(triad(k,deg)):'maj'; d.q=tq==='dim'?'min':tq; } }
      else { d.q=q.dataset.cq; if(d.q!=='none'&&d.root==null) d.root=projectKey().tonic; }
      delete d.bass; const key=r?`[data-croot="${r.dataset.croot}"]`:`[data-cq="${q.dataset.cq}"]`; renderChordPop(); const f=p.querySelector(key); if(f) f.focus();
      if(!TR.running&&d.q!=='none') hearChord(d); return; }
    if(e.target.closest('[data-chear]')){ hearChord(d); return; }
    if(e.target.closest('[data-capply]')){ chordApply(d.bass!=null?{root:d.root,q:d.q,bass:d.bass}:d.q==='none'?'N.C.':{root:d.root,q:d.q}); return; }
    if(e.target.closest('[data-calt]')){ const a=CL.blocks[CL.open]&&CL.blocks[CL.open].alt; if(a) chordApply({root:a.root,q:a.q}); return; } });
  p.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); const i=CL.open; chordPopOpen(-1); const el=s.querySelector(`[data-cb="${i}"]`); if(el) chordFocus(el); return; }
    const t=e.target.closest('[data-ctype]'); if(t&&e.key==='Enter'){ e.preventDefault(); const c=parseChord(t.value); if(!c){ toast('I couldn’t read that chord. Try “Bm”, “F♯7”, “B♭/D” or “N.C.”'); return; } chordApply(c); } });
  p.addEventListener('input',e=>{ const t=e.target.closest('[data-ctype]'); if(!t) return; const c=parseChord(t.value), a=p.querySelector('[data-capply]'); if(c&&a){ Object.assign(CL.draft,{root:c.root,q:c.q}); if(c.bass!=null) CL.draft.bass=c.bass; else delete CL.draft.bass;
    p.querySelectorAll('[data-croot]').forEach(x=>x.setAttribute('aria-pressed',String(c.q!=='none'&&+x.dataset.croot===c.root))); p.querySelectorAll('[data-cq]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.cq==='none'?c.q==='none':c.q!=='none'&&cqGroup(c.q)===x.dataset.cq)));
    a.disabled=false; a.textContent='Use '+chordName(c); const nw=p.querySelector('.cp-now'); if(nw) nw.innerHTML=`<b>${esc(chordName(c))}</b><span>${c.q==='none'?'the parts Keys made rest here':chordNotes(c)}</span>`; } });
  document.addEventListener('pointerdown',e=>{ if(!p.hidden&&!p.contains(e.target)&&!e.target.closest('[data-cb]')) chordPopOpen(-1); },true);
})();
function anaBtn(t){ const run=typeof ANA_RUN!=='undefined'&&ANA_RUN.has(t.id), shown=t.ana&&!CARDHIDE.has(t.id);
  return `<button class="lk ana-l" type="button" data-ana="${t.id}"${t.ana?` aria-pressed="${!!shown}"`:''}${run?' disabled':''} title="${t.ana?'Show or hide what I heard in this song: key, tempo and chords':'Listen to this recording for its key, tempo and chords'}">${run?'Listening…':t.ana?'♪ Key &amp; chords':'♪ Find key'}</button>`; }
function songCardHTML(t){
  if(t.kind!=='audio') return '';
  if(typeof ANA_RUN!=='undefined'&&ANA_RUN.has(t.id)) return `<div class="songcard busy" role="status"><span class="hint">Listening to “${esc(t.name)}” for its key, tempo and chords…</span></div>`;
  const a=t.ana; if(!a||CARDHIDE.has(t.id)) return '';
  const key=a.key?{tonic:a.key.tonic,mode:a.key.mode}:null, st=keyStatus(), mine=st.key, hard=KEY_HARD.includes(st.from);
  const lc=chordsFromAna(a,{to:'song'}), has=lc.some(c=>c.root!=null), bass=CARDBASS.has(t.id), shift=has&&key&&mine?keyShift(key,mine):0;
  const unsureT=a.bpm&&a.bpmConf!=null&&a.bpmConf<0.15;
  const head=(key?`<b>${keyName(key)}</b><span>${KEY_WORDS[a.key.level]||''}</span>${a.key.alt?`<span>or ${keyName(a.key.alt)}</span>`:''}<span class="mono">DJ key ${esc(a.djKey||djKey(key))}</span>`:`<b>No key in this clip</b>`)
    +(a.bpm?`<span class="mono">${a.bpm} BPM${a.bpmAlt?` (or ${a.bpmAlt})`:''}</span>${unsureT?'<span>tempo unsure</span>':''}`:'');
  const chordsLine=has?`<div class="sc-ch"><span class="sc-k">Chords${a.loop?` · ${a.loop.bars}-bar loop`:''}</span> ${esc(chordsText(lc.slice(0,8)))}${lc.length>8?' …':''}</div>`
    +`<div class="hint">${shift?`On your song they go in your key, ${keyName(mine)} (${shiftWords(shift)}): ${esc(chordsText(fitChordsToKey(lc.slice(0,8),key,mine)))}.`:mine?`They fit your key, ${keyName(mine)}.`:`Your song has no key yet, so it takes the song’s key.`}</div>`
    :`<div class="hint">${key?'I couldn’t hear clear chords in this clip.':'A drum loop or a short clip: no key or chords to use.'}</div>`;
  const keyBtn=key?(mine&&sameKey(mine,key)&&hard?`<button class="btn small" type="button" disabled>Your key is ${keyName(key)} ✓</button>`:`<button class="btn small" type="button" data-sckey="${t.id}" title="Your song takes the song’s key; parts Keys and you made move to fit">Set my key to ${keyName(key)}</button>`):'';
  const bpmBtn=a.bpm?(Math.abs(CTRL.bpm-a.bpm)<0.05?`<button class="btn small" type="button" disabled>${a.bpm} BPM ✓</button>`:`<button class="btn small" type="button" data-scbpm="${t.id}" data-bpm="${a.bpm}">Use ${a.bpm} BPM</button>`)
    +(a.bpmAlt&&Math.abs(CTRL.bpm-a.bpmAlt)>=0.05?`<button class="lk" type="button" data-scbpm="${t.id}" data-bpm="${a.bpmAlt}">or ${a.bpmAlt}</button>`:''):'';
  return `<div class="songcard" data-card="${t.id}" role="group" aria-label="What I heard in ${esc(t.name)}">
    <div class="sc-head">${head}<span class="spacer"></span><button class="lk" type="button" data-schide="${t.id}" title="Hide this card (Key &amp; chords brings it back)">Hide</button></div>
    ${a.key&&a.key.why?`<div class="sc-why">${esc(a.key.why)}</div>`:''}${chordsLine}
    <div class="sc-act">${has?`<button class="btn small primary" type="button" data-scput="${t.id}" title="A new Chords track: Keys’ own sound and rhythm on these chords, never the song’s audio">Put these chords on my song</button><button class="btn small sc-tog" type="button" data-scbass="${t.id}" aria-pressed="${bass}" title="Also make the bassline follow the song’s bass notes">${bass?'✓ ':''}Bass movement too</button>`:''}${keyBtn}${bpmBtn}</div>
    <div class="hint">Nothing in your song changes until you tap. Keys plays the chords with its own sound, never the song’s audio.</div></div>`;
}
$('#tracks').addEventListener('click',e=>{ if(e.target.closest('[data-scput],[data-sckey],[data-scbpm]')&&typeof undoBoundary==='function') undoBoundary(); /* each tap is its own undo step */ const g=n=>{ const el=e.target.closest(`[data-${n}]`); return el?{el,t:PROJ.tracks.find(x=>x.id===el.dataset[n.replace(/-./g,m=>m[1].toUpperCase())])}:null; };
  let h=g('ana'); if(h){ const t=h.t; if(!t||ANA_RUN.has(t.id)) return; if(!t.ana) listenToSong(t); else { CARDHIDE.has(t.id)?CARDHIDE.delete(t.id):CARDHIDE.add(t.id); renderTracks(); } return; }
  if((h=g('schide'))){ CARDHIDE.add(h.el.dataset.schide); renderTracks(); const b=document.querySelector(`[data-ana="${h.el.dataset.schide}"]`); if(b) b.focus(); return; }
  if((h=g('scbass'))){ const id=h.el.dataset.scbass; CARDBASS.has(id)?CARDBASS.delete(id):CARDBASS.add(id); renderTracks(); const b=document.querySelector(`[data-scbass="${id}"]`); if(b) b.focus(); return; }
  if((h=g('scput'))&&h.t){ const r=addSongChords(h.t,{to:'mine',bass:CARDBASS.has(h.t.id)}); toast(r?r.text+'. Ctrl+Z undoes it.':'I couldn’t hear chords to use in that song.'); return; }
  if((h=g('sckey'))&&h.t&&h.t.ana&&h.t.ana.key){ const k={tonic:h.t.ana.key.tonic,mode:h.t.ana.key.mode}, st=keyStatus();
    const parts=PROJ.tracks.some(x=>x.kind==='notes'&&x.events.length&&!(INST.get(x.inst)||{}).percussive), d=st.key&&parts?keyShift(st.key,k):0;
    setKey(k,'song',{shift:d}); toast(`Key set to ${keyName(k)}, the song’s key${d?`; your parts moved ${shiftWords(d)} to fit`:''}. Ctrl+Z undoes it.`); return; }
  if((h=g('scbpm'))){ const b=+h.el.dataset.bpm; if(b){ setTempo(b); saveProject(); renderTracks(); toast(`Tempo ${b} BPM, the song’s tempo. Ctrl+Z undoes it.`); } return; }
});
$('#bpm').addEventListener('change',()=>drawRolls());

/* ----- track list ----- */
let instOpts='';
function instOptions(){ if(!instOpts){ instOpts=CAT_ORDER.concat(['Mine']).map(cat=>{ const l=ORDER.map(id=>INST.get(id)).filter(i=>i.cat===cat); return l.length?`<optgroup label="${cat}">${l.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('')}</optgroup>`:''; }).join(''); } return instOpts; }
function renderTracks(){
  instOpts=''; songUI(); const songFk=songFocusKey(), song=songOn();
  if(typeof anaRestore==='function') anaRestore();
  renderKeyChip(); renderChordLane(); /* first: it also brings a song saved before SE-7 up to date (migrateKey) */
  $('#projName').value=PROJ.name; $('#barsSel').value=String(PROJ.bars); $('#keySel').value=PROJ.key&&KEY_HARD.includes(PROJ.key.from||'you')?`${PROJ.key.tonic}:${PROJ.key.mode}`:'';
  const box=$('#tracks');
  if(!PROJ.tracks.length){ box.innerHTML='<div class="custom-empty big">No tracks yet. Ask the assistant (“Keys, give me a house beat at 124”), hum a melody, press Record and play, or use the + buttons.</div>'; closeEditor(); drawRuler(); renderFaders(); songRender(); return; }
  [...SEL].forEach(id=>{ if(!PROJ.tracks.some(t=>t.id===id)) SEL.delete(id); });
  box.innerHTML=selBar()+PROJ.tracks.map((t,i)=>`<div class="trk${t.id===ED.tid?' sel':''}${SEL.has(t.id)?' picked':''}${trackAudible(t)?'':' quiet'}" data-tid="${t.id}" style="--c:${t.color}">
    <div class="th">
      <div class="th1"><span class="tnum">${i+1}</span><input class="tname" value="${esc(t.name)}" data-tname="${t.id}" aria-label="Track name">
        <button class="ib${PREVIEW&&PREVIEW.has(t.id)?' on':''}" type="button" data-prev="${t.id}" title="Play only this track (Ctrl/Cmd+click to add more)">${PREVIEW&&PREVIEW.has(t.id)?'■':'▶'}</button>
        <button class="ib fxb${fxCount(t)?' on':''}${FXOPEN.has(t.id)?' open':''}" type="button" data-tfx="${t.id}" title="Effects and EQ for this track">FX${fxCount(t)?`<small>${fxCount(t)}</small>`:''}</button>
        <button class="ib ms${t.mute?' on':''}" type="button" data-mute="${t.id}" aria-pressed="${!!t.mute}" title="Mute">M</button>
        <button class="ib ms${t.solo?' on':''}" type="button" data-solo="${t.id}" aria-pressed="${!!t.solo}" title="Solo">S</button></div>
      <div class="th2">${t.kind==='notes'?`<select class="select inline tinst" data-tinst="${t.id}" aria-label="Instrument for ${esc(t.name)}">${instOptions()}</select>`:`<select class="select inline tinst" data-tonotes="${t.id}" aria-label="Turn ${esc(t.name)} into notes"><option value="">♪ Turn into notes…</option><option value="melody">Melody</option><option value="bass">Bassline</option><option value="chords">Chords</option></select>`}
        <input class="tvol" type="range" min="0" max="100" value="${Math.round(t.vol*100)}" data-vol="${t.id}" aria-label="${esc(t.name)} volume" title="Volume"></div>
      <div class="th3"><span class="trole">${ROLE_NAME[t.role]||'Part'} · ${t.kind==='audio'?'audio':t.events.length+' notes'}</span>
        <span class="row" style="gap:4px">${t.kind==='notes'?`<button class="lk ed-l" type="button" data-edit="${t.id}">✎ Edit notes</button>`:anaBtn(t)}<button class="lk" type="button" data-dup="${t.id}" title="Duplicate track">Copy</button><button class="lk del-l" type="button" data-tdel="${t.id}">Delete</button></span></div>
    </div>
    ${song?songLaneHTML(t):`<canvas class="troll" data-roll="${t.id}" aria-label="${esc(t.name)} clip" title="${t.kind==='audio'?'Drag to move · Shift+drag to trim the start':'Click to edit notes'}"></canvas>`}
    ${FXOPEN.has(t.id)?fxPanel(t):''}${songCardHTML(t)}
  </div>`).join('');
  PROJ.tracks.forEach(t=>{ const s=box.querySelector(`[data-tinst="${t.id}"]`); if(s) s.value=t.inst; });
  if(ED.tid && !PROJ.tracks.find(t=>t.id===ED.tid)) closeEditor();
  drawRolls(); drawRuler(); renderFaders(); if(VIEW==='mixer') renderMixerView(); if(ED.tid){ drawEditor(); edPatUI(); }
  songRender(); songRefocus(songFk);
}
function drawRuler(){ if(songOn()){ songDrawRuler(); return; } const cv=$('#ruler'); if(!cv||!cv.clientWidth) return; const {g,w,h}=prepCanvas(cv), L=PROJ.bars*4; g.font='11px '+cssVar('--mono'); for(let b=0;b<=L;b++){ const x=b/L*w; g.fillStyle=b%4===0?cssVar('--muted'):cssVar('--line'); g.fillRect(Math.min(w-1,x),b%4===0?6:14,1,h); if(b%4===0&&b<L){ g.fillStyle=cssVar('--muted'); g.fillText(String(b/4+1),x+4,13); } } }
function drawRolls(){
  const L=PROJ.bars*4, line=cssVar('--line'), mut=cssVar('--muted');
  PROJ.tracks.forEach(t=>{ const cv=document.querySelector(`[data-roll="${t.id}"]`); if(!cv||!cv.clientWidth) return; const {g,w,h}=prepCanvas(cv);
    g.fillStyle=t.color+'14'; g.fillRect(0,0,w,h);
    for(let b=0;b<=L;b++){ g.fillStyle=b%4===0?mut+'66':line; g.fillRect(Math.min(w-1,b/L*w),0,1,h); }
    g.fillStyle=t.color;
    if(t.kind==='audio'){ const buf=AUD.get(t.id); if(!buf){ g.fillStyle=mut; g.font='11px '+cssVar('--mono'); g.fillText('loading audio…',6,h/2); return; }
      const d=buf.getChannelData(0), sr=buf.sampleRate, pxPerSec=w/(L*spb()), x0=(t.start||0)/L*w, off=Math.floor((t.trim||0)*sr), per=Math.max(1,Math.floor(sr/pxPerSec)), secW=(buf.duration-(t.trim||0))*pxPerSec;
      g.fillStyle=t.color+'22'; g.fillRect(x0,2,Math.min(w-x0,secW),h-4); g.fillStyle=t.color;
      for(let x=0;x<Math.min(w-x0,secW);x++){ let m=0; for(let i=off+x*per;i<off+(x+1)*per&&i<d.length;i+=4) m=Math.max(m,Math.abs(d[i])); g.fillRect(x0+x,h/2-m*h*0.45,1,Math.max(1,m*h*0.9)); }
      g.fillStyle=cssVar('--ink'); g.fillRect(x0,2,2,h-4);
      if(t.ana&&t.ana.chords&&typeof anaSongChords==='function'){ /* SE-7c: the song's chords where they sound, at the tempo now */
        g.font='600 10.5px '+cssVar('--body'); g.textBaseline='middle'; const bg=cssVar('--t2'), ink=cssVar('--ink');
        anaSongChords(t).forEach(c=>{ if(c.b>=L||c.root==null||c.q==='none') return; const x=c.b/L*w, cw=Math.min(w-x,c.d/L*w); if(cw<3) return; const cf=c.conf==null?0.6:clamp(c.conf,0,1);
          g.globalAlpha=0.88; g.fillStyle=bg; g.fillRect(x+1,3,cw-2,15); g.globalAlpha=0.4+0.6*cf; g.fillStyle=t.color; g.fillRect(x+1,3,2,15);
          const nm=chordName(c)+(cf<0.5?'?':''); if(cw>g.measureText(nm).width+9){ g.fillStyle=ink; g.fillText(nm,x+6,11); } });
        g.globalAlpha=1; g.textBaseline='alphabetic'; }
      return; }
    if(!t.events.length){ g.fillStyle=mut; g.font='11px '+cssVar('--body'); g.fillText('Empty · click to add notes',8,h/2+4); return; }
    const ns=t.events.map(e=>e.n), lo=Math.min(...ns), hi=Math.max(...ns), rngN=Math.max(6,hi-lo);
    t.events.forEach(e=>{ const x=mod(e.b,L)/L*w, y=h-5-((e.n-lo)/rngN)*(h-12); g.globalAlpha=0.45+0.55*e.v; g.fillRect(x,y-2,Math.max(2,e.d/L*w-1),4); }); g.globalAlpha=1; });
}
$('#tracks').addEventListener('change',e=>{ if(e.target.closest('[data-tfxk]')){ saveProject(); const b=document.querySelector(`[data-tfx="${e.target.closest('[data-tfxk]').dataset.tfxk.split(':')[0]}"]`); return; }
  const ad=e.target.closest('[data-tfxadd]'); if(ad){ const t=PROJ.tracks.find(x=>x.id===ad.dataset.tfxadd), k=ad.value; if(t&&k){ t.fx=t.fx||{}; t.fx[k]=TFX_DEF[k].def; ensureAudio(); refreshTrackGains(); saveProject(); renderTracks(); } return; } const s=e.target.closest('[data-tinst]'); if(s){ const t=PROJ.tracks.find(x=>x.id===s.dataset.tinst); const I=INST.get(s.value); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); if(t.name===(INST.get(t.inst)||{}).name) t.name=I.name; t.inst=s.value; saveProject(); renderTracks(); } });
$('#tracks').addEventListener('input',e=>{ const fk=e.target.closest('[data-tfxk]'); if(fk){ const [id,k]=fk.dataset.tfxk.split(':'), t=PROJ.tracks.find(x=>x.id===id), d=TFX_DEF[k]; if(!t) return; t.fx=t.fx||{};
    const v=+fk.value; t.fx[k]=d.log?fxLog(d,v):Math.round((d.min+(d.max-d.min)*v/1000)*100)/100; if(k==='pan'&&Math.abs(t.fx.pan)<0.04) t.fx.pan=0;
    const lbl=document.querySelector(`[data-tfxv="${CSS.escape(fk.dataset.tfxk)}"]`); if(lbl) lbl.textContent=fxShow(k,t.fx[k]); ensureAudio(); refreshTrackGains(); return; } const n=e.target.closest('[data-tname]'); if(n){ const t=PROJ.tracks.find(x=>x.id===n.dataset.tname); t.name=n.value.slice(0,40); saveProject(); if(ED.tid===t.id) $('#edTitle').textContent=t.name; } });
$('#tracks').addEventListener('click',e=>{ if(e.target.closest('[data-mute],[data-solo]')&&!(SEL.size>1&&SEL.has((e.target.closest('[data-mute],[data-solo]').dataset.mute||e.target.closest('[data-mute],[data-solo]').dataset.solo)))) return;
  const d=e.target.closest('[data-tdel]'); if(d){ if(d.dataset.armed){ const t=removeTrack(d.dataset.tdel); if(t) toast(`Deleted “${t.name}”`); } else { d.dataset.armed='1'; d.textContent='Confirm delete'; setTimeout(()=>{ if(d.isConnected){ delete d.dataset.armed; d.textContent='Delete'; } },3000); } return; }
  const p=e.target.closest('[data-prev]'); if(p){ togglePreview(p.dataset.prev,e.ctrlKey||e.metaKey); return; }
  const fb=e.target.closest('[data-tfx]'); if(fb){ const id=fb.dataset.tfx; FXOPEN.has(id)?FXOPEN.delete(id):FXOPEN.add(id); renderTracks(); return; }
  const rm=e.target.closest('[data-tfxrm]'); if(rm){ const [id,k]=rm.dataset.tfxrm.split(':'); const t=PROJ.tracks.find(x=>x.id===id); if(t&&t.fx){ delete t.fx[k]; refreshTrackGains(); saveProject(); renderTracks(); } return; }
  const pr=e.target.closest('[data-tfxpreset]'); if(pr){ const t=PROJ.tracks.find(x=>x.id===pr.dataset.tfxpreset); if(t){ t.fx=roleFx(t.role,PROJ.style); refreshTrackGains(); saveProject(); renderTracks(); toast(`Studio effects for ${t.name}`); } return; }
  const cl=e.target.closest('[data-tfxclear]'); if(cl){ const t=PROJ.tracks.find(x=>x.id===cl.dataset.tfxclear); if(t){ t.fx={}; refreshTrackGains(); saveProject(); renderTracks(); } return; }
  const sb=e.target.closest('[data-sel]'); if(sb){ selAction(sb.dataset.sel,sb); return; }
  const ms=e.target.closest('[data-mute],[data-solo]'); if(ms&&SEL.size>1){ const id=ms.dataset.mute||ms.dataset.solo, f=ms.dataset.mute?'mute':'solo'; if(SEL.has(id)){ e.stopPropagation(); const t0=PROJ.tracks.find(x=>x.id===id), v=!t0[f]; PROJ.tracks.forEach(t=>{ if(SEL.has(t.id)) t[f]=v; }); refreshTrackGains(); saveProject(); renderTracks(); return; } }
  const head=e.target.closest('.th'); if(head&&!e.target.closest('input,select,button,textarea')){ const id=head.closest('.trk').dataset.tid; if(e.ctrlKey||e.metaKey){ SEL.has(id)?SEL.delete(id):SEL.add(id); if(SEL.size===1&&!SEL.has(id)){} } else { SEL.clear(); SEL.add(id); } renderTracks(); return; }
  const du=e.target.closest('[data-dup]'); if(du){ duplicateTrack(du.dataset.dup); return; }
  const ed=e.target.closest('[data-edit]'); if(ed){ openEditor(ed.dataset.edit); return; }
  const r=e.target.closest('.troll'); if(r){ const t=PROJ.tracks.find(x=>x.id===r.dataset.roll); if(t&&t.kind==='notes') openEditor(t.id); }
});
function selAction(a,btn){
  const ids=PROJ.tracks.filter(t=>SEL.has(t.id)).map(t=>t.id); if(!ids.length) return;
  if(a==='play'){ setPreview(new Set(ids)); return; }
  if(a==='mute'||a==='solo'){ const v=!PROJ.tracks.find(t=>t.id===ids[0])[a]; PROJ.tracks.forEach(t=>{ if(SEL.has(t.id)) t[a]=v; }); refreshTrackGains(); saveProject(); renderTracks(); return; }
  if(a==='fx'){ const all=ids.every(id=>FXOPEN.has(id)); ids.forEach(id=>all?FXOPEN.delete(id):FXOPEN.add(id)); renderTracks(); return; }
  if(a==='dup'){ ids.forEach(id=>duplicateTrack(id)); return; }
  if(a==='del'){ if(!btn.dataset.armed){ btn.dataset.armed='1'; btn.textContent=`Confirm: delete ${ids.length}`; setTimeout(()=>{ if(btn.isConnected){ delete btn.dataset.armed; btn.textContent='Delete'; } },3000); return; } ids.forEach(id=>removeTrack(id)); SEL.clear(); toast(`Deleted ${ids.length} tracks`); renderTracks(); return; }
  if(a==='clear'){ SEL.clear(); renderTracks(); }
}
function duplicateTrack(id){ const t=PROJ.tracks.find(x=>x.id===id); if(!t) return; const c=makeTrack(Object.assign(serialize(t),{id:undefined,name:t.name+' copy',solo:false})); c.id='t'+Date.now().toString(36)+Math.floor(Math.random()*1e4); c.color=TRACK_COLORS[PROJ.tracks.length%TRACK_COLORS.length]; songCopyParts(t.id,c.id);
  if(t.kind==='audio'&&AUD.has(t.id)){ AUD.set(c.id,AUD.get(t.id)); const d=AUD.get(t.id).getChannelData(0); IDB.put('aud:'+c.id,{sr:AUD.get(t.id).sampleRate,data:new Float32Array(d)},'audio').catch(()=>{}); }
  PROJ.tracks.splice(PROJ.tracks.indexOf(t)+1,0,c); saveProject(); renderTracks(); toast(`Duplicated “${t.name}”`); }
function togglePreview(id,add){
  const cur=new Set(PREVIEW||[]);
  if(add){ cur.has(id)?cur.delete(id):cur.add(id); setPreview(cur); return; }
  if(SEL.size>1&&SEL.has(id)){ const same=PREVIEW&&PREVIEW.size===SEL.size&&[...SEL].every(x=>PREVIEW.has(x)); setPreview(same?null:SEL); return; }
  setPreview(PREVIEW&&PREVIEW.size===1&&PREVIEW.has(id)?null:new Set([id]));
}

/* ----- editor: piano roll for notes, step sequencer for drums, velocity lane, selection, copy/paste ----- */
function edTrack(){ const t=PROJ.tracks.find(x=>x.id===ED.tid); if(!t||!ED.pat||ED.pat==='A'||!(t.patterns&&t.patterns[ED.pat])) return t;
  const P=t.patterns[ED.pat], w=Object.create(t); Object.defineProperty(w,'events',{get(){ return P.events; },set(v){ P.events=v; }}); return w; }
function isDrumTrack(t){ return t && (t.role==='drums' || (INST.get(t.inst)||{}).drums); }
ED.sel=new Set(); ED.mode=store.get('edMode','draw'); ED.velH=58; ED.clip=null;
function setEdMode(m){ ED.mode=m; store.set('edMode',m); document.querySelectorAll('#edMode [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===m))); edHint(); }
function edHint(){ const t=edTrack(); if(!t) return; $('#edHint').textContent=isDrumTrack(t)
  ?(ED.mode==='draw'?'Click or drag across steps to add or remove hits · Shift for soft hits · Drag in the bottom lane to set how hard each hit is (drag a selected bar to move all selected, Alt sets them equal)':'Drag a box to select hits · Drag them to move · Ctrl+C / Ctrl+V to copy · Delete removes · Bottom lane sets how hard the selected hits are')
  :(ED.mode==='draw'?'Click to add a note · Drag notes to move, right edge to resize · Alt+drag copies · Right-click deletes · Bottom lane sets loudness: drag a selected bar to move all selected, Alt sets them equal':'Drag a box to select · Shift+click adds to the selection · Drag to move · Arrows nudge · Ctrl+C / Ctrl+V / Ctrl+D · Delete removes · Bottom lane sets the loudness of the selected notes'); }
function edGeomRows(){ return clamp(Math.floor(edFitH(0)/ED.rowH),16,36); }
function openEditor(id,o={}){ const t=PROJ.tracks.find(x=>x.id===id); if(!t||t.kind!=='notes') return; if(ED.tid!==id) ED.sel=new Set(); ED.tid=id;
  if(songOn()){ const s=(o.sid&&songFind(o.sid))||songSel()||(songAt(SONG.cursor)||{}).section, p=s&&s.parts[id]; ED.sid=s?s.id:null; ED.pat=o.pat||(p&&p.on&&p.variant)||'A'; } else { ED.sid=null; ED.pat=o.pat||'A'; }
  if(ED.pat!=='A'&&!(t.patterns&&t.patterns[ED.pat])) ED.pat='A'; edPatUI();
  if(!isDrumTrack(t) && t.events.length){ const ns=t.events.map(e=>e.n).sort((a,b)=>a-b); ED.top=clamp(Math.max(ns[ns.length-1]+4,ns[0]+edGeomRows()-6),40,120); } else if(!isDrumTrack(t)) ED.top=t.role==='bass'?60:84;
  $('#editor').hidden=false; $('#edTitle').textContent=t.name; edHint(); setEdMode(ED.mode);
  document.querySelectorAll('.trk').forEach(r=>r.classList.toggle('sel',r.dataset.tid===id)); drawEditor(); $('#editor').scrollIntoView({behavior:'smooth',block:'nearest'}); }
function closeEditor(){ ED.tid=null; ED.sel=new Set(); ED.pat='A'; ED.sid=null; $('#editor').hidden=true; document.querySelectorAll('.trk.sel').forEach(r=>r.classList.remove('sel')); }
$('#edClose').onclick=closeEditor;
/* patterns: which version of this track's notes the section plays (A is the main one; B, C… belong to some sections only) */
function edPatUI(){ const box=$('#edPat'); if(!box) return; const t=PROJ.tracks.find(x=>x.id===ED.tid), show=!!t&&t.kind==='notes'&&(songOn()||songLetters(t).length>1); box.hidden=!show; if(!show) return;
  const letters=songLetters(t); if(!letters.includes(ED.pat)) ED.pat='A'; const cur=ED.pat||'A', s=songOn()&&ED.sid?songFind(ED.sid):null;
  const where=v=>songPlaysIn(t,v).map(x=>x.name), uc=where(cur);
  const line=uc.length>1?`Pattern ${cur} plays in ${uc.join(', ')}: editing ${cur} changes all of them`:uc.length===1?`Pattern ${cur} plays only in ${uc[0]}`:`Pattern ${cur} isn’t used in any section yet`;
  const others=letters.filter(v=>v!==cur).map(v=>{ const w=where(v); return `Pattern ${v} plays in ${w.length?w.join(', '):'no section'}`; }).join(' · ');
  box.innerHTML=`<span class="hint">${s?`Pattern for <b>${esc(s.name)}</b>`:'Pattern'}</span><span class="seg" role="group" aria-label="Pattern">${letters.map(v=>`<button type="button" data-pat="${v}" aria-pressed="${v===cur}" title="${s?`Use pattern ${v} in ${esc(s.name)}`:`Show pattern ${v}`}">${v}</button>`).join('')}<button type="button" data-pat="+" title="A new empty pattern${s?' for '+esc(s.name):''}">+ New</button></span>
    <span class="ed-plays">${esc(line)}${others?' · '+esc(others):''}</span>${s&&uc.length>1&&uc.includes(s.name)?`<button class="btn small" type="button" data-pat="unique" title="Give ${esc(s.name)} its own copy of pattern ${cur}, so you can change it without touching the other sections">Make unique for ${esc(s.name)}</button>`:''}`; }
$('#edPat').addEventListener('click',e=>{ const b=e.target.closest('[data-pat]'); if(!b) return; const t=PROJ.tracks.find(x=>x.id===ED.tid); if(!t) return; const v=b.dataset.pat, s=songOn()&&ED.sid?songFind(ED.sid):null;
  if(v==='unique'){ if(!s) return; const L=songMakeUnique(s.id,t.id); if(L){ ED.pat=L; ED.sel=new Set(); } }
  else if(v==='+'){ const L=songNewPattern(s?s.id:null,t.id); if(L){ ED.pat=L; ED.sel=new Set(); toast(`New empty pattern ${L}${s?' for '+s.name:''}. Draw the notes.`); } }
  else { ED.pat=v; ED.sel=new Set(); if(s){ const p=s.parts[t.id]||{}; if(!p.on||(p.variant||'A')!==v){ songSetPart(s.id,t.id,{on:true,variant:v}); songFlash({parts:[[s.id,t.id]]},`${s.name} now plays ${t.name} pattern ${v}`); } } }
  drawEditor(); edPatUI(); });
document.querySelectorAll('#edMode [data-mode]').forEach(b=>b.addEventListener('click',()=>setEdMode(b.dataset.mode)));
$('#edGrid').addEventListener('change',e=>{ ED.grid=+e.target.value; drawEditor(); });
const edTargets=t=>ED.sel.size?t.events.filter(e=>ED.sel.has(e)):t.events;
$('#edQuant').onclick=()=>{ const t=edTrack(); if(!t) return; const q=ED.grid; edTargets(t).forEach(e=>{ e.b=Math.round(e.b/q)*q; e.d=Math.max(q,Math.round(e.d/q)*q); delete e.cyc; }); edChanged(); toast(ED.sel.size?'Selected notes quantized':'Notes quantized to the grid'); };
$('#edUp').onclick=()=>edShift(1); $('#edDown').onclick=()=>edShift(-1);
function edShift(s){ const t=edTrack(); if(!t||isDrumTrack(t)) return; edTargets(t).forEach(e=>e.n+=s); if(!ED.sel.size) ED.top+=s; edChanged(); }
$('#edClear').onclick=()=>{ const t=edTrack(); if(!t) return; const b=$('#edClear'); if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent='Confirm clear'; setTimeout(()=>{ delete b.dataset.armed; b.textContent='Clear notes'; },3000); return; } delete b.dataset.armed; b.textContent='Clear notes'; t.events=[]; ED.sel=new Set(); edChanged(); };
function edChanged(){ if(typeof undoBoundary==='function') undoBoundary(); const t=edTrack(), real=PROJ.tracks.find(x=>x.id===ED.tid); if(real) real.gen=false; if(t){ t.events.forEach(e=>{ if(e.cyc!==undefined && !TR.running) delete e.cyc; }); } saveProject(); drawEditor(); drawRolls(); const r=document.querySelector(`.trk[data-tid="${ED.tid}"] .trole`); if(r&&t) r.textContent=`${ROLE_NAME[t.role]||'Part'} · ${t.events.length} notes`;
  clearTimeout(edChanged.kt); edChanged.kt=setTimeout(renderKeyChip,150); /* SE-7a fix 2: the key chip follows piano-roll edits */ }
function drumRows(t){ const rows=DRUM_ROWS.slice(); t.events.forEach(e=>{ if(!rows.some(r=>r[0]===e.n)) rows.unshift([e.n,DRUM_LABEL[drumPiece(e.n)]+' '+noteName(e.n)]); }); return rows; }
/* height the grid may use so the velocity lane always shows inside the editor box (UX-2) */
function edFitH(W){ const wrap=$('#edWrap'), mh=parseFloat(getComputedStyle(wrap).maxHeight)||480; return mh-2-ED.velH-8-(W>wrap.clientWidth+1?14:0); }
function edGeom(){ const t=edTrack(), L=PROJ.bars*4, K=78, wrap=$('#edWrap'), vh=ED.velH;
  if(isDrumTrack(t)){ const rows=drumRows(t), steps=L*4, cw=Math.max(16,(wrap.clientWidth-K-2)/steps), W=K+steps*cw, rh=clamp(Math.floor(edFitH(W)/rows.length),16,24), gh=rows.length*rh; return {drum:true,rows,steps,cw,rh,K,L,W,gh,H:gh+vh+8,bw:cw*4}; }
  const rh=ED.rowH, W=Math.max(wrap.clientWidth-2,400), rows=clamp(Math.floor(edFitH(W)/rh),16,36), gh=rows*rh; return {drum:false,rows,rh,K,L,W,gh,H:gh+vh+8,bw:(W-K)/L}; }
function evRect(t,G,e){ if(G.drum){ const r=G.rows.findIndex(x=>x[0]===e.n), s=Math.round(e.b*4); if(r<0||s>=G.steps) return null; return {x:G.K+s*G.cw+2,y:r*G.rh+3,w:G.cw-4,h:G.rh-6}; }
  const r=ED.top-Math.round(e.n); if(r<0||r>=G.rows) return null; return {x:G.K+e.b*G.bw,y:r*G.rh+1,w:Math.max(4,e.d*G.bw-1),h:G.rh-2}; }
function drawEditor(){
  const t=edTrack(); if(!t) return; const G=edGeom(), cv=$('#edCanvas'), dpr=devicePixelRatio||1;
  cv.style.width=G.W+'px'; cv.style.height=G.H+'px'; cv.width=Math.round(G.W*dpr); cv.height=Math.round(G.H*dpr);
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,G.W,G.H);
  const line=cssVar('--line'), mut=cssVar('--muted'), ink=cssVar('--ink'); g.font='11px '+cssVar('--mono');
  if(G.drum){
    G.rows.forEach(([n,label],r)=>{ const y=r*G.rh; g.fillStyle=r%2?TC.t2:TC.t3; g.fillRect(0,y,G.W,G.rh); g.fillStyle=ink; g.fillText(label,8,y+G.rh/2+4); });
    for(let s=0;s<=G.steps;s++){ const x=G.K+s*G.cw; g.fillStyle=s%16===0?mut:s%4===0?TC.t7:line; g.fillRect(x,0,1,G.gh); }
    for(let s=0;s<G.steps;s+=4) if((s/4)%2===1){ g.fillStyle='rgba(255,255,255,.025)'; g.fillRect(G.K+s*G.cw,0,G.cw*4,G.gh); }
  } else {
    for(let r=0;r<G.rows;r++){ const n=ED.top-r, y=r*G.rh, blk=isBlack(n); g.fillStyle=blk?TC.t1:TC.t3; g.fillRect(G.K,y,G.W-G.K,G.rh); g.fillStyle=blk?TC.t5:'#efe7e2'; g.fillRect(0,y,G.K-30,G.rh-1);
      if(PROJ.key&&SCALES[PROJ.key.mode].includes(mod(n-PROJ.key.tonic,12))){ g.fillStyle='rgba(255,255,255,.035)'; g.fillRect(G.K,y,G.W-G.K,G.rh); }
      if(n%12===0){ g.fillStyle=mut; g.fillText(noteName(n),G.K-28,y+G.rh-2); g.fillStyle=line; g.fillRect(G.K,y+G.rh-1,G.W,1); } }
    const q=ED.grid; for(let b=0;b<=G.L+1e-9;b+=q){ const x=G.K+b*G.bw; const bar=Math.abs(b%4)<1e-6, beat=Math.abs(b%1)<1e-6; g.fillStyle=bar?mut:beat?TC.t7:'rgba(255,255,255,.05)'; g.fillRect(x,0,1,G.gh); }
    const above=t.events.filter(e=>Math.round(e.n)>ED.top).length, below=t.events.filter(e=>Math.round(e.n)<=ED.top-G.rows).length;
    g.fillStyle=cssVar('--accent'); if(above) g.fillText(`▲ ${above} higher (scroll)`,G.W-130,12); if(below) g.fillText(`▼ ${below} lower (scroll)`,G.W-130,G.gh-4);
  }
  t.events.forEach(e=>{ const R=evRect(t,G,e); if(!R) return; const on=ED.sel.has(e);
    g.fillStyle=t.color; g.globalAlpha=0.45+0.55*e.v; g.fillRect(R.x,R.y,R.w,R.h); g.globalAlpha=1;
    if(on){ g.strokeStyle=ink; g.lineWidth=1.5; g.strokeRect(R.x+0.5,R.y+0.5,R.w-1,R.h-1); }
    if(!G.drum){ g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(R.x+R.w-3,R.y+1,2,R.h-2); } });
  /* velocity lane */
  const vy=G.gh+8, vh=ED.velH; g.fillStyle=TC.t1; g.fillRect(0,vy,G.W,vh); g.fillStyle=mut; g.fillText('Velocity',8,vy+14);
  g.fillStyle=line; g.fillRect(G.K,vy+vh/2,G.W-G.K,1);
  t.events.forEach(e=>{ const x=G.drum?G.K+Math.round(e.b*4)*G.cw+G.cw/2:G.K+e.b*G.bw+1, hh=Math.max(2,e.v*(vh-6)); g.fillStyle=ED.sel.has(e)?ink:t.color; g.globalAlpha=ED.sel.size&&!ED.sel.has(e)?0.45:1; g.fillRect(x-1.5,vy+vh-hh,3,hh); g.fillRect(x-3,vy+vh-hh,7,2); g.globalAlpha=1; });
  if(ED.box){ const b=ED.box; g.strokeStyle=cssVar('--accent'); g.setLineDash([4,3]); g.strokeRect(Math.min(b.x0,b.x1)+0.5,Math.min(b.y0,b.y1)+0.5,Math.abs(b.x1-b.x0),Math.abs(b.y1-b.y0)); g.setLineDash([]); g.fillStyle='rgba(255,255,255,.07)'; g.fillRect(Math.min(b.x0,b.x1),Math.min(b.y0,b.y1),Math.abs(b.x1-b.x0),Math.abs(b.y1-b.y0)); }
}
function previewNote(t,n){ const c=ensureAudio(); if(!c) return; const I=INST.get(t.inst); if(!I) return; try{ const v=I.play(c,trackStrip(t).inp,n,0.8,c.currentTime); if(v&&!v.oneShot) v.release(c.currentTime+0.25); }catch(e){} }
function edCopy(){ const t=edTrack(); if(!t||!ED.sel.size) return false; const ev=[...ED.sel], b0=Math.min(...ev.map(e=>e.b)), end=Math.max(...ev.map(e=>e.b+e.d));
  ED.clip={tid:t.id,notes:ev.map(e=>({b:e.b-b0,d:e.d,n:e.n,v:e.v})),span:Math.max(ED.grid,Math.ceil((end-b0)/1-1e-6)*1),at:b0}; return true; }
function edPaste(at){ const t=edTrack(); if(!t||!ED.clip) return; let L=PROJ.bars*4; let base=at!=null?at:ED.clip.at+ED.clip.span; if(base>=L){ if(PROJ.bars<16){ toast('No room after the end of the song, so I doubled its length first'); const oldL=L; setBars(PROJ.bars*2); L=PROJ.bars*4; t.events=t.events.filter(e=>e.b<oldL); } else { toast('The song is already 16 bars long. Move the playhead or select less.'); return; } } ED.clip.at=base;
  const add=ED.clip.notes.map(x=>({b:base+x.b,d:x.d,n:x.n,v:x.v})).filter(e=>e.b<L); t.events.push(...add); ED.sel=new Set(add); edChanged(); }
(function(){
  const cv=$('#edCanvas');
  const pos=e=>{ const r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
  const snap=b=>Math.floor(b/ED.grid+1e-6)*ED.grid;
  const hit=(t,G,p)=>{ for(let i=t.events.length-1;i>=0;i--){ const e=t.events[i], R=evRect(t,G,e); if(!R) continue; if(p.y>=R.y-1&&p.y<=R.y+R.h+1&&p.x>=R.x-1&&p.x<=R.x+R.w+1) return {e,edge:!G.drum&&p.x>R.x+R.w-7}; } return null; };
  const velHit=(t,G,p)=>{ let best=null,bd=9; t.events.forEach(e=>{ const x=G.drum?G.K+Math.round(e.b*4)*G.cw+G.cw/2:G.K+e.b*G.bw+1, d=Math.abs(x-p.x); if(d<bd&&(!ED.sel.size||ED.sel.has(e)||!best)){ bd=d; best=e; } }); return best; };
  /* velocity: a selected note's bar moves every selected note together, keeping their differences (Ableton); Alt sets them all to the same value; an unselected bar changes just that note (UX-2) */
  const setVel=(t,G,p,e)=>{ const vy=G.gh+8, v=clamp(1-(p.y-vy-3)/(ED.velH-6),0.05,1), D=ED.drag, r=x=>Math.round(x*100)/100;
    if(D&&D.group){ const dv=v-D.orig.get(D.lead); D.group.forEach(x=>x.v=r(D.alt?v:clamp(D.orig.get(x)+dv,0.05,1))); } else e.v=r(v); };
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('pointerdown',e=>{
    const t=edTrack(); if(!t) return; const G=edGeom(), p=pos(e); e.preventDefault(); ensureAudio(); cv.focus&&cv.focus();
    if(p.y>G.gh+4){ const v=velHit(t,G,p); if(v){ const grp=ED.sel.has(v)&&ED.sel.size>1?[...ED.sel]:null; ED.drag={mode:'vel',group:grp,lead:v,alt:e.altKey,orig:new Map((grp||[v]).map(x=>[x,x.v]))}; setVel(t,G,p,v); drawEditor(); try{ cv.setPointerCapture(e.pointerId); }catch(_){} } return; }
    if(p.x<G.K){ const n=G.drum?(G.rows[Math.floor(p.y/G.rh)]||[])[0]:ED.top-Math.floor(p.y/G.rh); if(n!=null) previewNote(t,n); return; }
    const h=hit(t,G,p);
    if(e.button===2){ if(h){ const del=ED.sel.has(h.e)?[...ED.sel]:[h.e]; t.events=t.events.filter(x=>!del.includes(x)); ED.sel=new Set(); edChanged(); } return; }
    if(G.drum&&ED.mode==='draw'&&!h||G.drum&&ED.mode==='draw'&&h&&!e.altKey&&!ED.sel.has(h.e)){
      const r=Math.floor(p.y/G.rh), row=G.rows[r]; if(!row) return; const s=Math.floor((p.x-G.K)/G.cw); if(s<0||s>=G.steps) return;
      const has=t.events.some(x=>x.n===row[0]&&Math.round(x.b*4)===s); ED.sel=new Set();
      ED.paint={on:!has,soft:e.shiftKey,row:row[0]}; paintStep(t,row[0],s,ED.paint); try{ cv.setPointerCapture(e.pointerId); }catch(_){} return; }
    if(h){
      if(e.shiftKey&&ED.mode==='select'){ ED.sel.has(h.e)?ED.sel.delete(h.e):ED.sel.add(h.e); drawEditor(); return; }
      if(!ED.sel.has(h.e)) ED.sel=new Set([h.e]);
      if(e.altKey){ const copies=[...ED.sel].map(x=>Object.assign({},x)); delete copies.cyc; t.events.push(...copies); ED.sel=new Set(copies); }
      const group=[...ED.sel], orig=new Map(group.map(x=>[x,{b:x.b,n:x.n,d:x.d}])), lead=ED.sel.has(h.e)?h.e:group[0];
      ED.drag={mode:h.edge?'resize':'move',lead,group,orig,x0:p.x,y0:p.y,moved:false}; if(!G.drum) previewNote(t,lead.n);
    } else if(ED.mode==='select'||e.shiftKey&&!G.drum){
      if(!e.shiftKey) ED.sel=new Set(); ED.box={x0:p.x,y0:p.y,x1:p.x,y1:p.y,base:new Set(ED.sel)};
    } else {
      const b=clamp(snap((p.x-G.K)/G.bw),0,G.L-ED.grid), n=ED.top-Math.floor(p.y/G.rh), ne={b,d:Math.max(ED.grid,0.25),n,v:0.8}; t.events.push(ne); ED.sel=new Set([ne]);
      ED.drag={mode:'resize',lead:ne,group:[ne],orig:new Map([[ne,{b,n,d:ne.d}]]),x0:p.x,y0:p.y,moved:true}; previewNote(t,n);
    }
    try{ cv.setPointerCapture(e.pointerId); }catch(_){} drawEditor();
  });
  cv.addEventListener('pointermove',e=>{
    const t=edTrack(); if(!t) return; const G=edGeom(), p=pos(e);
    if(ED.paint){ const r=Math.floor(p.y/G.rh), row=G.rows[r], s=Math.floor((p.x-G.K)/G.cw); if(row&&s>=0&&s<G.steps&&p.y<G.gh) paintStep(t,row[0],s,ED.paint); return; }
    const D=ED.drag;
    if(ED.box){ const B=ED.box; B.x1=p.x; B.y1=Math.min(p.y,G.gh); const x0=Math.min(B.x0,B.x1), x1=Math.max(B.x0,B.x1), y0=Math.min(B.y0,B.y1), y1=Math.max(B.y0,B.y1);
      ED.sel=new Set(B.base); t.events.forEach(ev=>{ const R=evRect(t,G,ev); if(R&&R.x<x1&&R.x+R.w>x0&&R.y<y1&&R.y+R.h>y0) ED.sel.add(ev); }); drawEditor(); return; }
    if(!D){ if(p.y>G.gh+4){ cv.style.cursor='ns-resize'; return; } const h=hit(t,G,p); cv.style.cursor=h?(h.edge?'ew-resize':'grab'):(ED.mode==='select'?'default':'crosshair'); return; }
    if(D.mode==='vel'){ const v=D.group?D.lead:velHit(t,G,p); if(v) setVel(t,G,p,v); drawEditor(); return; }
    const o=D.orig.get(D.lead);
    if(D.mode==='move'){
      const db=Math.round(((p.x-D.x0)/G.bw)/ED.grid)*ED.grid; let dn=0;
      if(G.drum){ const r0=G.rows.findIndex(x=>x[0]===o.n), r1=clamp(r0+Math.round((p.y-D.y0)/G.rh),0,G.rows.length-1); dn=r1-r0; }
      else dn=-Math.round((p.y-D.y0)/G.rh);
      const minB=Math.min(...D.group.map(x=>D.orig.get(x).b)), maxE=Math.max(...D.group.map(x=>D.orig.get(x).b+(G.drum?0.25:D.orig.get(x).d)));
      const dB=clamp(db,-minB,G.L-maxE);
      D.group.forEach(x=>{ const O=D.orig.get(x); x.b=Math.round((O.b+dB)*1000)/1000;
        if(G.drum){ const r0=G.rows.findIndex(y=>y[0]===O.n); x.n=G.rows[clamp(r0+dn,0,G.rows.length-1)][0]; } else x.n=O.n+dn; });
      if(!G.drum&&dn!==D.lastDn){ D.lastDn=dn; previewNote(t,D.lead.n); } if(db||dn) D.moved=true;
    } else {
      const end=Math.max(o.b+ED.grid,Math.ceil(((p.x-G.K)/G.bw)/ED.grid-1e-6)*ED.grid), dd=Math.min(end,G.L)-o.b-o.d;
      D.group.forEach(x=>{ const O=D.orig.get(x); x.d=clamp(O.d+dd,ED.grid,G.L-x.b); }); D.moved=true;
    }
    drawEditor();
  });
  const up=()=>{ if(ED.box){ ED.box=null; drawEditor(); return; } if(ED.drag||ED.paint){ const ch=ED.paint||ED.drag.moved||ED.drag.mode==='vel'; ED.drag=null; ED.paint=null; if(ch) edChanged(); else drawEditor(); } };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  cv.addEventListener('dblclick',e=>{ const t=edTrack(); if(!t) return; const G=edGeom(); if(G.drum) return; const h=hit(t,G,pos(e)); if(h){ t.events.splice(t.events.indexOf(h.e),1); ED.sel.delete(h.e); edChanged(); } });
  cv.addEventListener('wheel',e=>{ const t=edTrack(); if(!t||isDrumTrack(t)) return; e.preventDefault(); ED.top=clamp(ED.top+(e.deltaY>0?-2:2),40,127); drawEditor(); },{passive:false});
  document.addEventListener('keydown',e=>{
    if(!ED.tid||$('#editor').hidden) return; const tg=e.target; if(tg&&/INPUT|SELECT|TEXTAREA/.test(tg.tagName)) return; const t=edTrack(); if(!t) return;
    const mod_=e.ctrlKey||e.metaKey, k=e.key.toLowerCase();
    if(mod_&&k==='a'){ ED.sel=new Set(t.events); drawEditor(); e.preventDefault(); return; }
    if(mod_&&k==='c'){ if(edCopy()){ toast(`Copied ${ED.sel.size} note${ED.sel.size>1?'s':''}`); e.preventDefault(); } return; }
    if(mod_&&k==='x'){ if(edCopy()){ t.events=t.events.filter(x=>!ED.sel.has(x)); ED.sel=new Set(); edChanged(); e.preventDefault(); } return; }
    if(mod_&&k==='v'){ if(ED.clip){ edPaste(); e.preventDefault(); } return; }
    if(mod_&&k==='d'){ if(edCopy()){ edPaste(); e.preventDefault(); } return; }
    if(!mod_&&k==='b'){ setEdMode(ED.mode==='draw'?'select':'draw'); e.preventDefault(); return; }
    if(e.key==='Escape'){ ED.sel=new Set(); drawEditor(); return; }
    if(!ED.sel.size) return;
    if(e.key==='Delete'||e.key==='Backspace'){ t.events=t.events.filter(x=>!ED.sel.has(x)); ED.sel=new Set(); edChanged(); e.preventDefault(); return; }
    const L=PROJ.bars*4, sel=[...ED.sel];
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ const d=(e.key==='ArrowLeft'?-1:1)*ED.grid; if(sel.every(x=>x.b+d>=0&&x.b+d<L)) sel.forEach(x=>x.b=Math.round((x.b+d)*1000)/1000); edChanged(); e.preventDefault(); }
    if((e.key==='ArrowUp'||e.key==='ArrowDown')&&!isDrumTrack(t)){ const d=(e.key==='ArrowUp'?1:-1)*(e.shiftKey?12:1); sel.forEach(x=>x.n+=d); previewNote(t,sel[0].n); edChanged(); e.preventDefault(); }
  });
})();
function paintStep(t,n,s,P){ const i=t.events.findIndex(x=>x.n===n&&Math.round(x.b*4)===s);
  if(P.on&&i<0){ t.events.push({b:s/4,d:0.25,n,v:P.soft?0.55:0.92}); previewNote(t,n); } else if(!P.on&&i>=0) t.events.splice(i,1); drawEditor(); }

/* ----- mixer view ----- */
function renderMixerView(){
  const ch=[['keys','Keys (live)',zoneInst('keys').name,TC.accent],['pads','Pads (live)',zoneInst('pads').name,TC.signal],...PROJ.tracks.map(t=>[t.id,t.name,t.kind==='audio'?'Recorded audio':(INST.get(t.inst)||{}).name||'',t.color]),['master','Master','After effects','#ece7dd']];
  $('#mixerView').innerHTML=`<div class="mixer">${ch.map(([id,nm,sub,col])=>{ const cfg=chCfg(id); return `<div class="mstrip" style="--c:${col}"><div class="mname"><span class="tsw"></span><b>${esc(nm)}</b><span>${esc(sub)}</span></div>${stripControls(id,cfg,{solo:!MIX[id],name:nm})}</div>`; }).join('')}</div>`;
}

/* ----- playhead and position ----- */
(function anim(){ requestAnimationFrame(anim);
  if(songOn()){ songAnim(); return; }
  const ph=$('#playhead'), first=document.querySelector('.troll'), pos=$('#posDisp');
  if(pos) pos.classList.toggle('cnt',LOOP.state==='counting');
  if(!TR.running||!LOOP.L||LOOP.state==='counting'){ ph.style.display='none'; if(pos) pos.textContent=LOOP.state==='counting'?'Count-in':'1 . 1'; chordLaneTick(-1); return; }
  const beat=mod(LOOP.rawBeat(),LOOP.L); chordLaneTick(beat); if(pos) pos.textContent=`${Math.floor(beat/4)+1} . ${Math.floor(beat%4)+1}`;
  if(first && VIEW==='playlist'){ const r=first.getBoundingClientRect(), pr=$('#playlist').getBoundingClientRect(); ph.style.display='block'; ph.style.left=(r.left-pr.left+beat/LOOP.L*r.width)+'px'; const cl=$('#chordLane'), top=cl&&!cl.hidden?$('#chordStrip').getBoundingClientRect().top:r.top-22; ph.style.top=(top-pr.top)+'px'; ph.style.height=($('#tracks').getBoundingClientRect().bottom-top)+'px'; } else ph.style.display='none';
  const ec=$('#edCanvas'), t=edTrack(); if(t && ED.tid && !$('#editor').hidden){ const G=edGeom(); const x=G.drum?G.K+beat*4*G.cw:G.K+beat*G.bw; const m=$('#edPlay'); m.style.left=x+'px'; m.style.height=G.gh+'px'; m.style.display='block'; }
})();

/* ----- song manager ----- */
let projAutoT=0;
function autoSaveNamed(){ clearTimeout(projAutoT); projAutoT=setTimeout(()=>saveNamed(true),1500); }
async function refreshProjList(){}
/* owner, 13 Nov: the app opens on a new empty song. The last song is put into the songs list first, so nothing is lost;
   if this browser can't keep the list, the last song opens as before */
async function keepLastSong(){ const L=LAST_PROJ, cur=PROJ;
  if(!L||L===PROJ||!(L.tracks||[]).length){ store.set('project',serialize(PROJ)); return; }
  try{ const ex=await IDB.get(L.id,'projects'), proj=Object.assign(serialize(L),{bpm:CTRL.bpm}); migrateSong(proj);
    const same=ex&&ex.proj&&ex.name===L.name&&JSON.stringify(ex.proj.tracks)===JSON.stringify(proj.tracks)&&JSON.stringify(ex.proj.sections||null)===JSON.stringify(proj.sections);
    if(!same){ const bars=proj.sections.reduce((a,s)=>a+s.bars,0), arranged=!(proj.sections.length===1&&proj.sections[0].auto);
      await IDB.put(L.id,{key:L.id,name:L.name,bpm:CTRL.bpm,bars:L.bars,song:arranged?`${bars} bars · ${fmtMS(bars*240/CTRL.bpm)}`:null,tracks:L.tracks.length,savedAt:Date.now(),proj},'projects'); }
    if(PROJ!==cur) return; /* the user already opened another song */
    store.set('project',serialize(PROJ)); $('#saveState').textContent='New song';
    toast(`New song. “${L.name}” is saved: open it again from Open song…`); }
  catch(e){ if(PROJ!==cur) return; PROJ=migrateSong(L); songViewLoad(); SONG.ver++; LOOP.state='stopped'; loadAudioFor(PROJ).then(()=>drawRolls()); preloadTracks(); renderTracks(); uiLoop();
    if(typeof undoReset==='function') undoReset(); }
}
async function saveNamed(quiet){
  const key=PROJ.id;
  if(quiet&&!PROJ.tracks.length){ let ex=null; try{ ex=await IDB.get(key,'projects'); }catch(e){} if(!ex) return; } /* an untouched new song doesn't go into the list */
  try{ await IDB.put(key,{key,name:PROJ.name,bpm:CTRL.bpm,bars:PROJ.bars,song:songArranged()?songLenText():null,tracks:PROJ.tracks.length,savedAt:Date.now(),proj:Object.assign(serialize(PROJ),{bpm:CTRL.bpm})},'projects');
    $('#saveState').textContent='Saved '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); if(!quiet) toast(`Saved “${PROJ.name}”`); }
  catch(e){ $('#saveState').textContent='Not saved'; if(!quiet) toast('Couldn’t save in this browser: '+e.message); }
}
async function loadAudioFor(p){ for(const t of p.tracks){ if(t.kind==='audio' && !AUD.has(t.id)){ try{ const r=await IDB.get('aud:'+t.id,'audio'); if(r) AUD.set(t.id,makeBuf(r.data,r.sr)); }catch(e){} } } }
async function loadNamed(key){ clearTimeout(projAutoT); await saveNamed(true); /* keep the last edits of the song you leave */ let r=null; try{ r=await IDB.get(key,'projects'); }catch(e){} if(!r) return; loopStop(); PREVIEW=null; closeEditor(); PROJ=migrateSong(dropTakeVoices(Object.assign(newProject(),r.proj))); songViewLoad(); SONG.ver++; if(r.proj.bpm) setTempo(r.proj.bpm); await loadAudioFor(PROJ); preloadTracks(); LOOP.state=PROJ.tracks.length?'stopped':'empty'; store.set('project',serialize(PROJ)); renderTracks(); uiLoop();
  if(typeof undoReset==='function') undoReset(); $('#saveState').textContent=savedLabel(r.savedAt); toast(`Opened “${PROJ.name}”`); }
/* "Saved 2:41 PM" today, "Saved 12 Nov" before */
function savedLabel(at){ if(!at) return ''; const d=new Date(at), today=new Date().toDateString()===d.toDateString();
  return 'Saved '+(today?d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):d.toLocaleDateString([], {day:'numeric',month:'short'})); }
async function newSong(name){ await saveNamed(true); loopStop(); PREVIEW=null; closeEditor(); PROJ=newProject(); if(name) PROJ.name=String(name).slice(0,60); songViewLoad(); SONG.ver++; LOOP.state='empty'; store.set('project',serialize(PROJ)); renderTracks(); uiLoop(); if(typeof undoReset==='function') undoReset(); $('#saveState').textContent='New song'; }
async function saveCopy(){ await saveNamed(true); const v=Object.assign({},SONG.view); PROJ=Object.assign(serialize(PROJ),{id:'p'+Date.now().toString(36),name:PROJ.name+' (copy)'}); SONG.view=v; songViewSave(); SONG.ver++; await saveNamed(); renderTracks(); }
function preloadTracks(){ PROJ.tracks.forEach(t=>{ const I=INST.get(t.inst); if(I&&I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); }); }
async function openSongs(){
  const m=$('#projModal'); m.hidden=false; let list=[]; try{ list=await IDB.all('projects'); }catch(e){} list.sort((a,b)=>b.savedAt-a.savedAt);
  $('#projItems').innerHTML=list.length?list.map(p=>`<div class="pitem${p.key===PROJ.id?' cur':''}"><div><b>${esc(p.name)}</b><span>${p.bpm} BPM · ${p.song?esc(p.song):(p.bars||4)+' bars'} · ${p.tracks??(p.proj.tracks||[]).length} tracks · ${new Date(p.savedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</span></div><div class="row"><button class="btn small primary" type="button" data-open="${esc(p.key)}">${p.key===PROJ.id?'Open (current)':'Open'}</button><button class="btn small ghost" type="button" data-pdel="${esc(p.key)}">Delete</button></div></div>`).join(''):'<div class="custom-empty">No saved songs yet. Your current song saves automatically as you work.</div>';
}
$('#projModal').addEventListener('click',async e=>{
  if(e.target===$('#projModal')||e.target.closest('#projClose')){ $('#projModal').hidden=true; return; }
  const o=e.target.closest('[data-open]'); if(o){ $('#projModal').hidden=true; if(o.dataset.open!==PROJ.id) await loadNamed(o.dataset.open); return; }
  const d=e.target.closest('[data-pdel]'); if(d){ if(!d.dataset.armed){ d.dataset.armed='1'; d.textContent='Confirm delete'; return; } await IDB.del(d.dataset.pdel,'projects').catch(()=>{}); if(d.dataset.pdel===PROJ.id){ PROJ.id='p'+Date.now().toString(36); } openSongs(); }
  if(e.target.closest('#projNew2')){ $('#projModal').hidden=true; newSong(); }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && !$('#projModal').hidden) $('#projModal').hidden=true; });
$('#saveBtn').onclick=()=>saveNamed(false); $('#newBtn').onclick=()=>newSong(); $('#openBtn').onclick=openSongs; $('#copyBtn').onclick=saveCopy;
document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{ ensureAudio(); const k=b.dataset.add; if(k==='sing'){ TAKE.start('melody'); return; } if(k==='voice'){ TAKE.start('voice'); return; } if(k==='empty'){ const t=addTrack({role:'melody',inst:zoneInst('keys').percussive?'piano':ZONES.keys,name:'New track',events:[]}); openEditor(t.id); return; } if(k==='beat'){ const t=addTrack({role:'drums',inst:ZONES.pads||'kit909',zone:'pads',name:'Beat',events:[]}); openEditor(t.id); return; } ASSIST.run(b.dataset.say); }));
