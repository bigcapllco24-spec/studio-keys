
/* ---------- song arrangement (UX-1): sections, linked patterns A/B/…, the song timeline ----------
   PROJ.sections = [{id, name, kind, bars, end, off, parts:{<trackId>:{on, variant, without}}}]
   track.events is pattern A (every generator, the editor and the assistant keep writing it);
   track.patterns = {B:{events}, C:{…}} only exists once a section gets its own version.
   A missing parts[trackId] means off. The view (Loop/Song, selection, loop brace, zoom, follow) is kept
   per song in store('songView:<id>'), outside the song data, so it isn't undoable. */
const SONG_KINDS=['intro','build','drop','break','verse','chorus','bridge','hook','outro','other'];
const SONG_KIND_NAME={intro:'Intro',build:'Build',drop:'Drop',break:'Break',verse:'Verse',chorus:'Chorus',bridge:'Bridge',hook:'Hook',outro:'Outro',other:'Section'};
/* which track roles play in each kind of section (RES-2 template); null = everything */
const SONG_PLAYS={intro:['drums','hats','chords','free'],build:['drums','hats','perc','bass','chords','free'],verse:['drums','hats','perc','bass','chords','voice','free'],
  break:['chords','melody','voice','free'],bridge:['chords','melody','voice','free'],outro:['drums','hats','perc','chords'],drop:null,chorus:null,hook:null,other:null};
const SONG_WITHOUT={intro:['clap','snare']};
const SONG_TEMPLATES={
  short:{name:'Short',hint:'For a reel or a sketch',secs:[['Intro','intro',4],['Drop','drop',8],['Outro','outro',4]]},
  club:{name:'Full track',hint:'Intro, build, drop, break, second drop, outro',secs:[['Intro','intro',16],['Build','build',16],['Drop','drop',16],['Break','break',16],['Drop 2','drop',16],['Outro','outro',16]]}
};
const DRUM_GROUPS={kick:['kick'],clap:['clap'],snare:['snare','rim'],hats:['hatC','hatP','hatO'],perc:['rim','cow','tomF','tomF2','tomL','tomM','tomH','tomH2'],crash:['crash'],ride:['ride']};
/* for the sound engine: called by the Song scheduler at each section boundary (audio-context time) */
const SONG_HOOKS={sectionStart(section,time){},sectionEnd(section,time){}};
const SONG={ver:0,flat:new Map(),flatFor:null,flatVer:-1,segs:[],endT:0,cursor:0,pv:new Map(),flash:null,
  view:{mode:'loop',sel:null,loop:null,zoom:0,follow:true}};

/* ----- model ----- */
function songKindOf(name){ const s=String(name||'').toLowerCase();
  if(/intro/.test(s)) return 'intro'; if(/build|groove|rise/.test(s)) return 'build'; if(/drop|climax|peak/.test(s)) return 'drop'; if(/break/.test(s)) return 'break';
  if(/verse/.test(s)) return 'verse'; if(/chorus/.test(s)) return 'chorus'; if(/bridge/.test(s)) return 'bridge'; if(/hook/.test(s)) return 'hook'; if(/outro|ending/.test(s)) return 'outro'; return 'other'; }
function migrateSong(p){ p=p||PROJ; if(!p) return p; if(!Array.isArray(p.tracks)) p.tracks=[];
  if(!Array.isArray(p.sections)||!p.sections.length){ const parts={}; p.tracks.forEach(t=>parts[t.id]={on:true,variant:'A'});
    p.sections=[{id:'s1',name:'Main',kind:'other',bars:p.bars||4,end:null,auto:true,parts}]; }
  p.sections.forEach((s,i)=>{ if(!s.id) s.id='s'+(i+1); s.name=String(s.name||SONG_KIND_NAME[s.kind]||'Section').slice(0,24); if(!SONG_KINDS.includes(s.kind)) s.kind=songKindOf(s.name);
    s.bars=clamp(Math.round(+s.bars||4),1,64); if(!s.parts||typeof s.parts!=='object') s.parts={}; if(s.end===undefined) s.end=null; });
  return p; }
function songSections(){ return migrateSong(PROJ).sections; }
const ensureSections=songSections;
const songOn=()=>SONG.view.mode==='song';
const songSel=()=>{ const S=songSections(); return S.find(s=>s.id===SONG.view.sel)||null; };
const songBars=()=>songSections().reduce((a,s)=>a+s.bars,0);
const songBeats=()=>songBars()*4;
const songStartOf=sec=>{ let b=0; for(const s of songSections()){ if(s===sec||s.id===sec) return b; b+=s.bars*4; } return 0; };
const fmtMS=sec=>{ sec=Math.round(sec); return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'); };
const songSecs=bars=>bars*4*60/CTRL.bpm;
const songLenText=bars=>{ bars=bars==null?songBars():bars; return `${bars} bar${bars>1?'s':''} · ${fmtMS(songSecs(bars))}`; };
const songArranged=()=>{ const S=songSections(); return !(S.length===1&&S[0].auto); };
function songRole(t){ if(t.kind==='audio') return 'voice'; if(t.role==='drums'||(INST.get(t.inst)||{}).drums) return 'drums'; return t.role||'free'; }
function songDefaultPart(t,kind){ const plays=SONG_PLAYS[kind], r=songRole(t), on=!plays||plays.includes(r)||(r==='hats'&&plays.includes('drums'))||(r==='perc'&&plays.includes('drums')&&kind!=='intro');
  const p={on,variant:'A'}; if(on&&r==='drums'&&SONG_WITHOUT[kind]) p.without=SONG_WITHOUT[kind].slice(); return p; }
function songNewId(S){ S=S||songSections(); let n=0; S.forEach(s=>{ const m=/^s(\d+)$/.exec(s.id); if(m) n=Math.max(n,+m[1]); }); return 's'+(n+1); }
function songUniqueName(base,S,except){ S=S||songSections(); base=String(base||'Section').trim().slice(0,20)||'Section';
  const taken=n=>S.some(s=>s!==except&&s.name.toLowerCase()===n.toLowerCase()); if(!taken(base)) return base;
  const root=base.replace(/\s+\d+$/,''); for(let i=2;i<99;i++){ const n=root+' '+i; if(!taken(n)) return n; } return base; }
/* keep sections in step with the tracks: drop parts of deleted tracks, switch new tracks on, follow the loop length while
   the song is still one automatic section. Runs before every undo snapshot (edit.js) */
let songFreshT=0;
function songSync(){ const p=PROJ; migrateSong(p); const S=p.sections, ids=new Set(p.tracks.map(t=>t.id));
  S.forEach(s=>{ for(const k in s.parts) if(!ids.has(k)) delete s.parts[k]; if(s.auto) s.bars=p.bars; });
  const fresh=p.tracks.filter(t=>!S.some(s=>s.parts[t.id]));
  if(fresh.length){ const sel=songSel(), on=S.length===1||!sel?S:[sel];
    fresh.forEach(t=>S.forEach(s=>{ s.parts[t.id]={on:on.includes(s),variant:'A'}; }));
    if(on.length<S.length&&songOn()){ const nm=fresh.map(t=>`“${t.name}”`).join(', '); clearTimeout(songFreshT);
      songFreshT=setTimeout(()=>toast(`${nm} play${fresh.length>1?'':'s'} in ${on.map(s=>s.name).join(', ')}. Click its empty parts to add it elsewhere.`),900); } }
  SONG.ver++; }
function songCopyParts(fromId,toId){ songSections().forEach(s=>{ if(s.parts[fromId]) s.parts[toId]=JSON.parse(JSON.stringify(s.parts[fromId])); }); }

/* ----- patterns ----- */
function songPatEvents(t,v){ if(!v||v==='A') return t.events; const p=t.patterns&&t.patterns[v]; return p?p.events:t.events; }
function songLetters(t){ return ['A',...Object.keys(t.patterns||{}).filter(k=>/^[B-Z]$/.test(k)).sort()]; }
function songNextLetter(t){ for(let i=1;i<26;i++){ const L=String.fromCharCode(65+i); if(!(t.patterns&&t.patterns[L])) return L; } return null; }
function songPlaysIn(t,v){ v=v||'A'; return songSections().filter(s=>{ const p=s.parts[t.id]; return p&&p.on&&(p.variant||'A')===v; }); }
const songCopyEvents=ev=>ev.map(e=>{ const c=Object.assign({},e); delete c.cyc; delete c.raw; return c; });

/* ----- the song timeline: every note of a track in song beats (cached until the next saveProject) ----- */
function songFlatReset(){ if(SONG.flatFor!==PROJ||SONG.flatVer!==SONG.ver){ SONG.flat.clear(); SONG.flatFor=PROJ; SONG.flatVer=SONG.ver; } }
function songFlat(t){ songFlatReset(); let f=SONG.flat.get(t.id); if(f) return f; f=[];
  const S=songSections(), L=PROJ.bars*4, drum=t.kind==='notes'&&(t.role==='drums'||!!(INST.get(t.inst)||{}).drums); let b0=0;
  for(const s of S){ const len=s.bars*4, p=s.parts[t.id], off=s.off||0;
    if(p&&p.on&&t.kind==='notes'){ const ev=songPatEvents(t,p.variant), wo=drum&&p.without&&p.without.length?new Set(p.without.flatMap(g=>DRUM_GROUPS[g]||[g])):null;
      for(let k=Math.floor(off/L);k*L-off<len;k++) for(const e of ev){ if(e.b>=L) continue; const rb=k*L+e.b-off; if(rb<0||rb>=len) continue; if(wo&&wo.has(drumPiece(e.n))) continue;
        f.push({B:b0+rb,d:Math.min(e.d,len-rb),n:e.n,v:e.v}); }
      if(drum&&s.end&&s.end.to&&s.end.to!=='none'&&typeof transitionEvents==='function'){ try{ (transitionEvents(s,t)||[]).forEach(e=>{ if(e.b>=0&&e.b<len) f.push({B:b0+e.b,d:Math.min(e.d||0.25,len-e.b),n:e.n,v:e.v==null?0.8:e.v}); }); }catch(err){ console.warn('transition',err); } }
    }
    b0+=len; }
  f.sort((a,b)=>a.B-b.B); SONG.flat.set(t.id,f); return f; }
/* audio tracks: where the clip starts in each section it plays in, and how many beats it may run */
function songAudioSegs(t){ songFlatReset(); const key='a:'+t.id; let f=SONG.flat.get(key); if(f) return f; f=[];
  const S=songSections(), L=PROJ.bars*4, st=t.start||0; let b0=0;
  for(const s of S){ const len=s.bars*4, p=s.parts[t.id], off=s.off||0;
    if(p&&p.on) for(let k=Math.floor(off/L);k*L+st-off<len;k++){ const B=k*L+st-off; if(B<0) continue; f.push({B:b0+B,len:Math.min(L-st,len-B)}); }
    b0+=len; }
  SONG.flat.set(key,f); return f; }
function songLB(a,B){ let lo=0,hi=a.length; while(lo<hi){ const m=(lo+hi)>>1; if(a[m].B<B) lo=m+1; else hi=m; } return lo; }
/* where a song beat is: section, index, bar in the section (1-based) and bars left after this one */
function songAt(beat){ const S=songSections(); let b=0; beat=Math.max(0,beat||0);
  for(let i=0;i<S.length;i++){ const L=S[i].bars*4; if(beat<b+L||i===S.length-1){ const bis=Math.min(L-1e-6,Math.max(0,beat-b)), bar=Math.floor(bis/4)+1;
      return {section:S[i],index:i,kind:S[i].kind,start:b,beatInSection:bis,barInSection:bar,barsLeft:S[i].bars-bar}; } b+=L; }
  return null; }

/* ----- edits: each one is a single undo step through saveProject ----- */
function songEdit(fn,o={}){ if(typeof undoBoundary==='function') undoBoundary(); const S=songSections(); const r=fn(S); if(o.structure) S.forEach(s=>delete s.auto); saveProject(); renderTracks(); uiLoop(); return r; }
function songAdd(o={}){ const src=o.copyOf?songFind(o.copyOf):null; let made=null;
  songEdit(S=>{ const kind=SONG_KINDS.includes(o.kind)?o.kind:src?src.kind:songKindOf(o.name||'');
    const s={id:songNewId(S),name:songUniqueName(o.name||(src?src.name:SONG_KIND_NAME[kind]||'Section'),S),kind,bars:clamp(Math.round(+o.bars||(src?src.bars:8)),1,64),end:src&&src.end?Object.assign({},src.end):null,parts:{}};
    if(src&&src.off) s.off=src.off;
    PROJ.tracks.forEach(t=>{ const sp=src&&src.parts[t.id]; s.parts[t.id]=sp?JSON.parse(JSON.stringify(sp)):songDefaultPart(t,kind); });
    const at=o.at==null?(src?S.indexOf(src)+1:S.length):clamp(Math.round(o.at),0,S.length); S.splice(at,0,s); made=s; },{structure:true});
  SONG.view.sel=made.id; songViewSave(); songFlash({sections:[made.id]},o.chip===false?null:`${src?'Copied '+src.name+' to':'Added'} ${made.name} · ${made.bars} bars`); return made; }
const songDuplicate=(ref,at)=>{ const s=songFind(ref); return s?songAdd({copyOf:s.id,at}):null; };
function songRemove(ref){ const s=songFind(ref); if(!s) return false; const S=songSections(); if(S.length<2){ toast('A song needs at least one section.'); return false; }
  const i=S.indexOf(s); songEdit(S=>{ S.splice(S.indexOf(s),1); },{structure:true});
  if(SONG.view.sel===s.id) SONG.view.sel=(S[Math.min(i,S.length-1)]||{}).id||null; if(SONG.view.loop&&SONG.view.loop.sid===s.id) SONG.view.loop=null; songViewSave(); songUIState();
  songChip(`Deleted ${s.name}`); return true; }
function songMove(ref,index){ const s=songFind(ref); if(!s) return false; const S=songSections(), i=S.indexOf(s); index=clamp(Math.round(index),0,S.length-1); if(i===index) return false;
  songEdit(S=>{ S.splice(i,1); S.splice(index,0,s); },{structure:true}); songFlash({sections:[s.id]},`Moved ${s.name}`); return true; }
function songResize(ref,bars){ const s=songFind(ref); if(!s) return false; bars=clamp(Math.round(+bars||s.bars),1,64); if(bars===s.bars&&!s.auto) return false; const was=s.bars;
  songEdit(()=>{ s.bars=bars; },{structure:true}); songFlash({sections:[s.id]},`${s.name}: ${bars} bars (was ${was})`); return true; }
function songRename(ref,name){ const s=songFind(ref); name=String(name||'').trim().slice(0,24); if(!s||!name||name===s.name) return false;
  songEdit(S=>{ s.name=songUniqueName(name,S,s); const k=songKindOf(name); if(k!=='other') s.kind=k; }); return true; }
function songSetKind(ref,kind){ const s=songFind(ref); if(!s||!SONG_KINDS.includes(kind)) return false; songEdit(()=>{ s.kind=kind; }); return true; }
function songSplit(ref){ const s=songFind(ref); if(!s||s.bars<2) return null; let b=null;
  songEdit(S=>{ const first=Math.floor(s.bars/2); b=JSON.parse(JSON.stringify(s)); b.id=songNewId(S); b.bars=s.bars-first; s.bars=first;
    b.off=((s.off||0)+first*4)%(PROJ.bars*4)||0; if(!b.off) delete b.off; b.name=songUniqueName(s.name,S); s.end=null; S.splice(S.indexOf(s)+1,0,b); },{structure:true});
  songFlash({sections:[s.id,b.id]},`Split ${s.name} into ${s.bars} + ${b.bars} bars`); return b; }
function songSetPart(sref,tid,o={}){ const s=songFind(sref), t=PROJ.tracks.find(x=>x.id===(tid&&tid.id||tid)); if(!s||!t) return false;
  songEdit(()=>{ const p=Object.assign({on:false,variant:'A'},s.parts[t.id]||{}); if(o.on!=null) p.on=!!o.on; if(o.variant) p.variant=o.variant; if(o.without!==undefined){ if(o.without&&o.without.length) p.without=[...o.without]; else delete p.without; } s.parts[t.id]=p; });
  return true; }
function songTemplate(t){ const tpl=Array.isArray(t)?{name:'Your layout',secs:t.map(x=>[x.name,x.kind,x.bars])}:SONG_TEMPLATES[t==='full'?'club':t]; if(!tpl||!tpl.secs.length) return null;
  const made=songEdit(S=>{ S.length=0; tpl.secs.forEach(([name,kind,bars])=>{ kind=SONG_KINDS.includes(kind)?kind:songKindOf(name);
      const s={id:'s'+(S.length+1),name:songUniqueName(name||SONG_KIND_NAME[kind],S),kind,bars:clamp(Math.round(+bars||8),1,64),end:null,parts:{}};
      PROJ.tracks.forEach(tr=>s.parts[tr.id]=songDefaultPart(tr,kind)); S.push(s); });
    /* a section where nothing would play (a song with only a melody, say) plays everything instead */
    S.forEach(s=>{ if(PROJ.tracks.length&&!PROJ.tracks.some(tr=>s.parts[tr.id].on)) PROJ.tracks.forEach(tr=>s.parts[tr.id]={on:true,variant:'A'}); });
    return S.slice(); },{structure:true});
  SONG.view.loop=null; SONG.view.sel=made[0].id; SONG.cursor=0; songViewSave();
  songMode('song'); songFlash({sections:made.map(s=>s.id),all:true},`${tpl.name}: ${made.map(s=>s.name+' '+s.bars).join(' · ')} · ${songLenText()}`); return made; }
/* give one section its own copy of a track's pattern (B, C, …) so it can change without touching the others */
function songMakeUnique(sref,tid){ const s=songFind(sref), t=PROJ.tracks.find(x=>x.id===(tid&&tid.id||tid)); if(!s||!t||t.kind!=='notes') return null;
  const p=Object.assign({on:true,variant:'A'},s.parts[t.id]||{}), L=songNextLetter(t); if(!L){ toast('That track already has 26 patterns.'); return null; }
  songEdit(()=>{ t.patterns=t.patterns||{}; t.patterns[L]={events:songCopyEvents(songPatEvents(t,p.variant))}; s.parts[t.id]=Object.assign(p,{on:true,variant:L}); });
  songFlash({parts:[[s.id,t.id]]},`${t.name} in ${s.name} now has its own pattern ${L}`); return L; }
const forkPattern=(track,sectionId)=>songMakeUnique(sectionId,track);
function songNewPattern(sref,tid){ const s=songFind(sref), t=PROJ.tracks.find(x=>x.id===(tid&&tid.id||tid)); if(!t||t.kind!=='notes') return null; const L=songNextLetter(t); if(!L) return null;
  songEdit(()=>{ t.patterns=t.patterns||{}; t.patterns[L]={events:[]}; if(s) s.parts[t.id]=Object.assign({},s.parts[t.id]||{},{on:true,variant:L}); }); return L; }

/* ----- finding sections by words: "drop 2", "the second drop", "the break", "intro", 3 ----- */
const SONG_ORD={first:1,second:2,third:3,fourth:4,fifth:5,'1st':1,'2nd':2,'3rd':3,'4th':4,'5th':5,last:-1,final:-1};
function songFind(ref){ const S=songSections(); if(ref==null||ref==='') return null;
  if(typeof ref==='object') return S.find(s=>s===ref||s.id===ref.id)||null;
  if(typeof ref==='number') return S[ref-1]||null;
  const raw=String(ref).trim(), q=raw.toLowerCase().replace(/^(the|my|our)\s+/,'').replace(/\s+(section|part)$/,'').trim();
  let s=S.find(x=>x.id===raw)||S.find(x=>x.name.toLowerCase()===q); if(s) return s;
  if(/^\d+$/.test(q)) return S[+q-1]||null;
  let ord=null; const w=q.replace(/\b(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|last|final)\b/,m=>{ ord=SONG_ORD[m]; return ''; }).trim();
  const num=/(\d+)$/.exec(w); if(num&&ord==null) ord=+num[1];
  const kind=songKindOf(w.replace(/\d+/g,'')); const word=w.replace(/\d+/g,'').trim();
  const cand=S.filter(x=>kind!=='other'?x.kind===kind:word&&x.name.toLowerCase().includes(word)); if(!cand.length) return null;
  if(ord!=null) return ord<0?cand[cand.length-1]:cand[ord-1]||null;
  const now=TR.running&&songOn()&&A.ctx?songAt(songBeatAt(A.ctx.currentTime)):null; if(now&&cand.includes(now.section)) return now.section;
  const sel=songSel(); if(sel&&cand.includes(sel)) return sel; return cand[0]; }

/* one line for the assistant: 1 Intro 16 [drums-clap, chords] | 2 Build 16 [drums, bass, chords] >snareroll 4 | … · 96 bars · 3:06 · Song mode */
function songSummary(){ const S=songSections(); if(!songArranged()) return `none (one ${PROJ.bars}-bar loop)`;
  const roles={}; PROJ.tracks.forEach(t=>{ const r=songRole(t); roles[r]=(roles[r]||0)+1; });
  const label=t=>{ const r=songRole(t); return roles[r]>1?t.name.toLowerCase():(ROLE_NAME[r]||r).toLowerCase(); };
  const line=S.map((s,i)=>{ const on=PROJ.tracks.filter(t=>s.parts[t.id]&&s.parts[t.id].on);
    const plain=t=>{ const p=s.parts[t.id]; return (p.variant||'A')==='A'&&!(p.without&&p.without.length); };
    const list=PROJ.tracks.length&&on.length===PROJ.tracks.length&&on.every(plain)?'all':on.length?on.map(t=>{ const p=s.parts[t.id]; return label(t)+(p.without&&p.without.length?'-'+p.without.join('-'):'')+((p.variant||'A')!=='A'?' ('+p.variant+')':''); }).join(', '):'silent';
    return `${i+1} ${s.name} ${s.bars} [${list}]`+(s.end&&s.end.to&&s.end.to!=='none'?` >${s.end.to} ${s.end.bars||1}`:''); }).join(' | ');
  const now=TR.running&&songOn()&&A.ctx?songAt(songBeatAt(A.ctx.currentTime)):null, lp=SONG.view.loop?songLoopLabel():'';
  return `${line} · ${songLenText()} · ${songOn()?'Song':'Loop'} mode${now?' · playing: '+now.section.name:''}${lp?' · looping: '+lp:''}`; }

/* ----- view state (per song, not undoable) ----- */
const songViewKey=()=>'songView:'+PROJ.id;
function songViewLoad(){ const v=store.get(songViewKey(),null); SONG.view=Object.assign({mode:'loop',sel:null,loop:null,zoom:0,follow:true},v&&typeof v==='object'?v:{}); SONG.cursor=0; SONG.segs=[]; SONG.endT=0; }
function songViewSave(){ store.set(songViewKey(),SONG.view); }
function songMode(m,o={}){ m=m==='song'?'song':'loop'; if(m===SONG.view.mode){ songUI(); return m; }
  if(!o.force&&(LOOP.capturing()||LOOP.state==='take')){ toast('Finish the recording first, then switch.'); return SONG.view.mode; }
  const play=TR.running&&LOOP.state==='playing'&&!o.noPlay; if(TR.running) loopStop();
  SONG.view.mode=m; songViewSave(); renderTracks(); uiLoop(); if(play) loopPlay(); return m; }
const setSongMode=on=>songMode(on?'song':'loop');
/* loop brace: a section (id, name, number or object), {from, to} in bars (1-based, both included), or null to switch it off */
function songLoop(ref,o={}){ if(ref==null||ref===false){ SONG.view.loop=null; songViewSave(); songRender(); return null; }
  let lp=null, s=null;
  if(typeof ref==='object'&&(ref.from!=null||ref.to!=null)&&!ref.id){ const B=songBars(), f=clamp(Math.round(+ref.from||1),1,B), t=clamp(Math.round(+ref.to||f),f,B); lp={from:(f-1)*4,to:t*4}; }
  else { s=songFind(ref); if(!s) return null; lp={sid:s.id}; SONG.view.sel=s.id; }
  SONG.view.loop=lp; songViewSave(); const r=songLoopRange(); SONG.cursor=r[0];
  if(!songOn()) songMode('song',{noPlay:true}); else songRender();
  if(o.play!==false&&TR.running&&LOOP.state==='playing'){ loopStop(); loopPlay(); }
  return s||lp; }
const loopSection=songLoop;
function songLoopRange(){ const lp=SONG.view.loop; if(!lp) return null; if(lp.sid){ const S=songSections(), s=S.find(x=>x.id===lp.sid); if(!s) return null; const b=songStartOf(s); return [b,b+s.bars*4]; }
  const E=songBeats(), f=clamp(lp.from||0,0,E), t=clamp(lp.to||E,f,E); return t>f?[f,t]:null; }
function songLoopLabel(){ const lp=SONG.view.loop; if(!lp) return ''; if(lp.sid){ const s=songSections().find(x=>x.id===lp.sid); return s?s.name:''; } const r=songLoopRange(); return r?`bars ${r[0]/4+1}-${r[1]/4}`:''; }
function songSelect(ref,o={}){ const s=songFind(ref); SONG.view.sel=s?s.id:null; songViewSave(); if(s&&o.cursor!==false&&!(TR.running&&songOn())) SONG.cursor=songStartOf(s); songUIState(); return s; }
/* play the song from a bar (1-based number) or a section (id, name, index, object) */
function songPlay(o={}){ if(!PROJ.tracks.length){ toast('Add a part first, then play the song.'); return false; }
  if(o.from!=null){ const s=typeof o.from==='number'?null:songFind(o.from); SONG.cursor=s?songStartOf(s):clamp((Math.round(+o.from||1)-1)*4,0,Math.max(0,songBeats()-4)); if(s){ SONG.view.sel=s.id; songViewSave(); } }
  if(!songOn()) songMode('song',{noPlay:true}); if(TR.running) loopStop(); loopPlay(); return true; }

/* ----- Song scheduler (called by tick() in studio.js while the song plays) -----
   SONG.segs maps audio time to song beats; a jump at the loop brace adds a new segment */
function songBeatAt(time){ const g=SONG.segs; if(!g.length) return SONG.cursor; let s=g[0]; for(const x of g) if(x.t<=time) s=x; return s.b+(time-s.t)*CTRL.bpm/60; }
function songStartAt(t,beat){ const E=songBeats(); if(beat>=E-1e-6) beat=0; const lr=songLoopRange(); TR.running=true; TR.t0=t-beat*spb(); TR.schedT=A.ctx.currentTime; SONG.segs=[{t,b:beat}]; SONG.endT=0; SONG.loopAtStart=!!lr; }
function songRetempo(now){ if(SONG.segs.length) SONG.segs=[{t:now,b:songBeatAt(now)}]; }
function songTick(now,ahead){
  if(SONG.endT&&now>=SONG.endT){ loopStop(); return; }
  const s=spb(), E=songBeats(); let t=Math.max(TR.schedT,SONG.segs.length?SONG.segs[0].t:TR.schedT), guard=0;
  while(t<ahead-1e-6&&guard++<4){ const g=SONG.segs[SONG.segs.length-1]; if(!g) break; const b0=g.b+(t-g.t)/s; let b1=g.b+(ahead-g.t)/s, wrap=null; const lr=songLoopRange();
    if(lr&&b0<lr[1]-1e-9&&b1>lr[1]){ b1=lr[1]; wrap=lr[0]; } else if(b1>E) b1=E;
    if(b1>b0) songSchedule(b0,b1,g,s);
    const tEnd=g.t+(b1-g.b)*s;
    if(wrap!=null){ SONG.segs.push({t:tEnd,b:wrap}); if(SONG.segs.length>4) SONG.segs.shift(); t=tEnd; continue; }
    if(b1>=E-1e-9&&!SONG.endT) SONG.endT=tEnd+2; /* ring out for 2 s, then stop */
    break; }
}
function songSchedule(b0,b1,g,s){ const at=B=>g.t+(B-g.b)*s;
  for(let k=Math.ceil(b0-1e-9);k<b1;k++) if(CTRL.metro) click(at(k),mod(k,4)===0);
  for(const tr of PROJ.tracks){ if(!trackAudible(tr)) continue;
    if(tr.kind==='audio'){ for(const a of songAudioSegs(tr)) if(a.B>=b0&&a.B<b1) scheduleAudioAt(tr,at(a.B),a.len*s); continue; }
    const fl=songFlat(tr); for(let i=songLB(fl,b0);i<fl.length&&fl[i].B<b1;i++){ const e=fl[i]; scheduleEvent(tr,e,at(e.B),e.d*s); } }
  let b=0; for(const sec of songSections()){ const e=b+sec.bars*4; if(b>=b0&&b<b1) try{ SONG_HOOKS.sectionStart(sec,at(b)); }catch(err){} if(e>b0&&e<=b1) try{ SONG_HOOKS.sectionEnd(sec,at(e)); }catch(err){} b=e; } }

/* ---------- feedback: flash what changed, Undo chip ---------- */
function songFlash(ch={},text){ SONG.flash={secs:new Set(ch.sections||[]),parts:new Set((ch.parts||[]).map(p=>p.join(':'))),all:!!ch.all,until:performance.now()+1300}; songApplyFlash(); if(text) songChip(text); }
const flashSections=(ids,text)=>songFlash({sections:(ids||[]).map(x=>(songFind(x)||{}).id).filter(Boolean)},text);
function songApplyFlash(){ const F=SONG.flash; if(!F||performance.now()>F.until) return; const left=Math.max(200,F.until-performance.now());
  document.querySelectorAll('#songStrip .sec,#songMap .smb').forEach(el=>{ if(F.all||F.secs.has(el.dataset.sid)) el.classList.add('flash'); });
  document.querySelectorAll('#tracks .part').forEach(el=>{ if(F.all||F.secs.has(el.dataset.sid)||F.parts.has(el.dataset.sid+':'+el.dataset.tid)) el.classList.add('flash'); });
  clearTimeout(SONG.flashT); SONG.flashT=setTimeout(()=>document.querySelectorAll('.flash').forEach(el=>el.classList.remove('flash')),left); }
let songChipT=0;
function songChip(text){ const c=$('#songChip'); if(!c) return; $('#songChipT').textContent=text; c.hidden=false; clearTimeout(songChipT); songChipT=setTimeout(()=>{ c.hidden=true; },7000); }
const songSnapshot=()=>JSON.stringify(songSections());
/* for the assistant: call with songSnapshot() taken before a batch; flashes the sections and parts that changed */
function songFlashDiff(before,text){ let B=null; try{ B=typeof before==='string'?JSON.parse(before):before; }catch(e){} if(!Array.isArray(B)) return null;
  const bm=new Map(B.map((s,i)=>[s.id,Object.assign({i},s)])), secs=[], parts=[];
  songSections().forEach((s,i)=>{ const o=bm.get(s.id); if(!o||o.i!==i||o.bars!==s.bars||o.name!==s.name||o.kind!==s.kind||JSON.stringify(o.end||null)!==JSON.stringify(s.end||null)) secs.push(s.id);
    else for(const tid in s.parts) if(JSON.stringify((o.parts||{})[tid]||null)!==JSON.stringify(s.parts[tid])) parts.push([s.id,tid]); });
  if(secs.length||parts.length||text) songFlash({sections:secs,parts},text); return {sections:secs,parts}; }

/* ---------- Song screen: section strip, ruler, part lanes, phone song map ---------- */
const songVW=()=>{ const el=$('#songScroll'); return el&&el.clientWidth||900; };
const songPx=()=>clamp(SONG.view.zoom||Math.max(3,(songVW()-84)/Math.max(1,songBars())),3,160); /* pixels per bar */
function songUI(){ const on=songOn(), pl=$('#playlist'); if(!pl) return;
  document.querySelectorAll('#songSeg [data-songmode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.songmode===SONG.view.mode)));
  pl.classList.toggle('song',on); if(on) pl.setAttribute('tabindex','-1'); else pl.removeAttribute('tabindex');
  ['#songHead','#songHint','#songMap'].forEach(id=>{ const el=$(id); if(el) el.hidden=!on; });
  const h=$('.pl-head'); if(h) h.hidden=on; const ml=$('#mp3Len'); if(ml) ml.hidden=on;
  const mp=$('#exportMp3'); if(mp) mp.title=on?'Download the whole song, start to end, as an MP3':'Download the song as an MP3';
  const zp=$('#exportZip'); if(zp) zp.title=on?'Exports the loop (one pattern) with stems for Ableton; Download MP3 and MIDI only give the whole song':'';
  const mk=$('#songMake'); if(mk) mk.disabled=!PROJ.tracks.length; const bl=$('#barsLbl'); if(bl) bl.textContent=on?'Pattern':'Length'; if(on) songDrawRuler(); }
function songPvURL(t,v){ const L=PROJ.bars*4, audio=t.kind==='audio', ev=audio?null:songPatEvents(t,v);
  let h=L*131+(audio?Math.round((t.start||0)*7+(t.trim||0)*1000+CTRL.bpm*3)+(AUD.has(t.id)?1:0):0);
  if(ev) for(const e of ev) h=(h*31+Math.round(e.b*977+e.n*13+e.d*101+e.v*57))%2147483647;
  const key=t.id+v+t.color+h, hit=SONG.pv.get(key); if(hit) return hit;
  const W=Math.min(2048,Math.max(64,L*16)), H=48, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d'); g.fillStyle=t.color;
  if(audio){ const buf=AUD.get(t.id); if(buf){ const d=buf.getChannelData(0), sr=buf.sampleRate, pps=W/(L*spb()), x0=(t.start||0)/L*W, off=Math.floor((t.trim||0)*sr), per=Math.max(1,Math.floor(sr/pps)), sw=Math.min(W-x0,(buf.duration-(t.trim||0))*pps);
      for(let x=0;x<sw;x++){ let m=0; for(let i=off+x*per;i<off+(x+1)*per&&i<d.length;i+=8) m=Math.max(m,Math.abs(d[i])); g.fillRect(x0+x,H/2-m*H*0.45,1,Math.max(1,m*H*0.9)); } } }
  else if(ev.length){ const drum=t.role==='drums'||(INST.get(t.inst)||{}).drums;
    if(drum){ const row=n=>{ const p=drumPiece(n); return p==='kick'?3:p==='snare'||p==='clap'||p==='rim'?2:/^hat|ride|crash/.test(p)?0:1; };
      ev.forEach(e=>{ g.globalAlpha=0.5+0.5*e.v; g.fillRect(e.b/L*W,4+row(e.n)*10,Math.max(2,W/L/4-1),7); }); }
    else { const ns=ev.map(e=>e.n), lo=Math.min(...ns), rg=Math.max(6,Math.max(...ns)-lo);
      ev.forEach(e=>{ g.globalAlpha=0.5+0.5*e.v; g.fillRect(e.b/L*W,H-6-((e.n-lo)/rg)*(H-12),Math.max(2,e.d/L*W-1),3); }); } }
  const url=cv.toDataURL(); SONG.pv.set(key,url); if(SONG.pv.size>240) SONG.pv.delete(SONG.pv.keys().next().value); return url; }
function songLaneHTML(t){ const S=songSections(), px=songPx(); let x=0;
  const parts=S.map(s=>{ const p=s.parts[t.id]||{}, on=!!p.on, v=p.variant||'A', w=s.bars*px, wo=on&&p.without&&p.without.length?p.without:null;
    const h=`<button type="button" class="part${on?' on':''}${w<26?' tiny':''}" data-sid="${s.id}" data-tid="${t.id}" aria-pressed="${on}" style="left:${x}px;width:${Math.max(2,w-2)}px;--pv:var(--pv${v});--pw:${PROJ.bars*px}px;--po:${-(s.off||0)/4*px}px" aria-label="${esc(t.name)} in ${esc(s.name)}${v!=='A'?', pattern '+v:''}" title="${esc(t.name)} in ${esc(s.name)}: click to switch ${on?'off':'on'} · double-click to edit the notes">${on&&v!=='A'?`<i class="pbadge">${v}</i>`:''}${wo?`<i class="pwo">no ${esc(wo.join(', '))}</i>`:''}</button>`;
    x+=w; return h; }).join('');
  return `<div class="slane" data-lane="${t.id}"><div class="sl-in" style="width:${x+84}px">${parts}</div></div>`; }
function songRender(){ songUI(); if(!songOn()||!$('#songStrip')) return; const fk=songFocusKey();
  const S=songSections(), px=songPx(), sel=SONG.view.sel, lp=SONG.view.loop&&SONG.view.loop.sid; let x=0;
  $('#songStrip').style.width=(songBars()*px+84)+'px';
  $('#songStrip').innerHTML=S.map(s=>{ const w=s.bars*px, h=`<div class="sec k-${s.kind}${s.id===sel?' cur':''}${s.id===lp?' looped':''}${w<46?' tiny':w<112?' narrow':''}" data-sid="${s.id}" style="left:${x}px;width:${Math.max(4,w-2)}px">
      <button type="button" class="sname" aria-pressed="${s.id===sel}" title="${esc(s.name)} · ${s.bars} bars · drag to move, Alt+drag copies · double-click to rename · right-click for more">${esc(s.name)}</button><span class="sbars mono">${s.bars}</span>${s.end&&s.end.to&&s.end.to!=='none'?`<i class="send" title="Into the next part: ${esc(s.end.to)}"></i>`:''}<button type="button" class="smore" aria-haspopup="menu" aria-label="More for ${esc(s.name)}" title="More">⋯</button><span class="rz" title="Drag to make ${esc(s.name)} longer or shorter (Alt: 1 bar)"></span></div>`; x+=w; return h; }).join('')
    +`<button type="button" class="btn small sadd" style="left:${x+6}px" title="Add an 8-bar section at the end">+ Add</button>`;
  $('#songLen').textContent=songLenText();
  $('#songFollow').setAttribute('aria-pressed',String(!!SONG.view.follow));
  $('#songMap').innerHTML=S.map(s=>`<button type="button" class="smb k-${s.kind}${s.id===lp?' looped':''}" data-sid="${s.id}" style="flex-grow:${s.bars}" aria-pressed="${s.id===lp}" title="Tap to loop ${esc(s.name)}"><b>${esc(s.name)}</b><span>${s.bars} bars</span></button>`).join('')+'<span class="hint smap-hint">Tap a section to loop it. Editing parts needs a tablet or a computer.</span>';
  songPreviews(); songScrollSync(); songApplyFlash(); if(fk) songRefocus(fk); }
function songPreviews(){ PROJ.tracks.forEach(t=>{ const lane=document.querySelector(`.slane[data-lane="${t.id}"]`); if(!lane) return; const used=new Set(['A']); songSections().forEach(s=>{ const p=s.parts[t.id]; if(p&&p.variant) used.add(p.variant); });
  used.forEach(v=>{ try{ lane.style.setProperty('--pv'+v,`url("${songPvURL(t,v)}")`); }catch(e){} }); }); }
function songScrollSync(){ const sc=$('#songScroll'); if(!sc) return; $('#playlist').style.setProperty('--sx',sc.scrollLeft+'px'); songDrawRuler(); }
function songDrawRuler(){ const cv=$('#songRuler'); if(!cv||!cv.clientWidth||!songOn()) return; const {g,w,h}=prepCanvas(cv), sc=$('#songScroll'), sx=sc?sc.scrollLeft:0, px=songPx(), B=songBars();
  g.fillStyle=TC.t1||cssVar('--t1'); g.fillRect(0,0,w,h); g.font='10.5px '+cssVar('--mono');
  const step=[1,2,4,8,16,32,64].find(n=>n*px>=30)||64, b0=Math.max(0,Math.floor(sx/px)), b1=Math.min(B,Math.ceil((sx+w)/px));
  for(let b=b0;b<=b1;b++){ const x=Math.round(b*px-sx); if(px>=5||b%4===0){ g.fillStyle=b%step===0?TC.muted:TC.line; g.fillRect(x,b%step===0?9:15,1,h); } if(b%step===0&&b<B){ g.fillStyle=TC.muted; g.fillText(String(b+1),x+3,11); } }
  let a=0; g.fillStyle=TC.ink; for(const s of songSections()){ a+=s.bars; const x=Math.round(a*px-sx); if(x>=0&&x<=w) g.fillRect(x-1,4,2,h-4); }
  const lr=songLoopRange(); if(lr){ const x0=lr[0]/4*px-sx, x1=lr[1]/4*px-sx; g.fillStyle=TC.accent; g.fillRect(x0,0,x1-x0,4); g.globalAlpha=0.14; g.fillRect(x0,4,x1-x0,h-4); g.globalAlpha=1; g.fillRect(x0,0,2,h); g.fillRect(x1-2,0,2,h); }
  if(!(TR.running&&songOn())){ const x=SONG.cursor/4*px-sx; g.fillStyle=TC.signal; g.beginPath(); g.moveTo(x-5,h-7); g.lineTo(x+5,h-7); g.lineTo(x,h); g.closePath(); g.fill(); } }
/* selection, loop and "now playing" marks without rebuilding anything (so double-click keeps working) */
function songUIState(){ const sel=SONG.view.sel, lp=SONG.view.loop&&SONG.view.loop.sid;
  document.querySelectorAll('#songStrip .sec').forEach(el=>{ const id=el.dataset.sid; el.classList.toggle('cur',id===sel); el.classList.toggle('looped',id===lp); el.querySelector('.sname').setAttribute('aria-pressed',String(id===sel)); });
  document.querySelectorAll('#songMap .smb').forEach(el=>{ el.classList.toggle('looped',el.dataset.sid===lp); el.setAttribute('aria-pressed',String(el.dataset.sid===lp)); });
  songDrawRuler(); if(typeof edPatUI==='function'&&ED.tid&&songOn()&&!$('#editor').hidden) edPatUI(); }
function songNowMark(id){ if(SONG.nowSid===id) return; SONG.nowSid=id; document.querySelectorAll('#songStrip .sec,#songMap .smb').forEach(el=>el.classList.toggle('now',el.dataset.sid===id)); }
/* playhead, position readout and Follow (called every frame by daw.js) */
function songAnim(){ const ph=$('#playhead'), pos=$('#posDisp'), sc=$('#songScroll'), playing=TR.running&&LOOP.state==='playing'&&SONG.segs.length;
  const beat=playing?clamp(songBeatAt(A.ctx.currentTime),0,songBeats()):SONG.cursor, at=songAt(beat);
  if(pos&&at){ const t=`${Math.floor(beat/4)+1} . ${Math.floor(mod(beat,4))+1} · ${at.section.name} · bar ${at.barInSection} of ${at.section.bars}`; if(pos.textContent!==t) pos.textContent=t; }
  songNowMark(playing&&at?at.section.id:null);
  const px=songPx()/4, x=beat*px;
  if(playing&&SONG.view.follow&&sc&&sc.clientWidth){ const vw=sc.clientWidth, maxL=sc.scrollWidth-vw; if(x<sc.scrollLeft||x>sc.scrollLeft+vw*0.85){ const nl=clamp(x-vw*0.15,0,Math.max(0,maxL)); if(Math.abs(nl-sc.scrollLeft)>1){ SONG.prog=nl; sc.scrollLeft=nl; } } }
  const lane=document.querySelector('#tracks .slane'), head=$('#songRuler');
  if(!playing||!lane||!sc||VIEW!=='playlist'||!lane.clientWidth){ ph.style.display='none'; }
  else { const r=lane.getBoundingClientRect(), pr=$('#playlist').getBoundingClientRect(), hr=head.getBoundingClientRect(), hx=r.left+x-sc.scrollLeft;
    if(hx<r.left-1||hx>r.right+1) ph.style.display='none'; else { ph.style.display='block'; ph.style.left=(hx-pr.left)+'px'; ph.style.top=(hr.top-pr.top)+'px'; ph.style.height=($('#tracks').getBoundingClientRect().bottom-hr.top)+'px'; } }
  const m=$('#edPlay'), t=typeof edTrack==='function'?edTrack():null;
  if(m&&t&&ED.tid&&!$('#editor').hidden){ const p=at&&at.section.parts[ED.tid], L=PROJ.bars*4;
    if(playing&&p&&p.on&&(p.variant||'A')===(ED.pat||'A')){ const G=edGeom(), pb=mod(at.beatInSection+(at.section.off||0),L); m.style.left=(G.drum?G.K+pb*4*G.cw:G.K+pb*G.bw)+'px'; m.style.height=G.gh+'px'; m.style.display='block'; } else m.style.display='none'; } }
function songZoom(f,clientX){ const sc=$('#songScroll'); if(!sc) return; const cur=songPx(), r=sc.getBoundingClientRect(), ax=clientX!=null?clientX-r.left:sc.clientWidth/2, bx=(sc.scrollLeft+ax)/cur;
  SONG.view.zoom=f===0?0:clamp(cur*f,3,160); songViewSave(); songRelayout(); const nz=songPx(); sc.scrollLeft=f===0?0:Math.max(0,bx*nz-ax); songScrollSync(); }
/* zoom: move and resize what's there instead of rebuilding the tracks */
function songRelayout(){ const S=songSections(), px=songPx(), starts={}; let x=0; S.forEach(s=>{ starts[s.id]=x; x+=s.bars*px; });
  document.querySelectorAll('#tracks .part').forEach(el=>{ const s=S.find(q=>q.id===el.dataset.sid); if(!s) return; const w=s.bars*px; el.style.left=starts[s.id]+'px'; el.style.width=Math.max(2,w-2)+'px'; el.style.setProperty('--pw',PROJ.bars*px+'px'); el.style.setProperty('--po',-(s.off||0)/4*px+'px'); el.classList.toggle('tiny',w<26); });
  document.querySelectorAll('#tracks .sl-in').forEach(el=>el.style.width=(x+84)+'px');
  $('#songStrip').style.width=(x+84)+'px';
  document.querySelectorAll('#songStrip .sec').forEach(el=>{ const s=S.find(q=>q.id===el.dataset.sid); if(!s) return; const w=s.bars*px; el.style.left=starts[s.id]+'px'; el.style.width=Math.max(4,w-2)+'px'; el.classList.toggle('tiny',w<46); el.classList.toggle('narrow',w>=46&&w<112); });
  const add=$('#songStrip .sadd'); if(add) add.style.left=(x+6)+'px'; songScrollSync(); }
function songFocusKey(){ const a=document.activeElement, pl=$('#playlist'); if(!a||!pl||!pl.contains(a)) return null;
  if(a.classList.contains('part')) return `.part[data-sid="${a.dataset.sid}"][data-tid="${a.dataset.tid}"]`; const sec=a.closest('.sec'); if(sec) return `.sec[data-sid="${sec.dataset.sid}"] .${a.classList.contains('smore')?'smore':'sname'}`;
  if(a===pl) return '#playlist'; return null; }
function songRefocus(k){ if(!k||!songOn()) return; const el=document.querySelector(k)||$('#playlist'); try{ el.focus({preventScroll:true}); }catch(e){} }

/* ----- menus (section ⋯ / right-click, Make it a song) ----- */
function songMenuOpen(items,x,y,ret){ const m=$('#songMenu'); SONG.menu={items,ret};
  m.innerHTML=items.map((it,i)=>it.sep?'<hr>':it.kinds?`<label class="smi-k">Type <select class="select inline" data-mk>${SONG_KINDS.map(k=>`<option value="${k}"${k===it.value?' selected':''}>${SONG_KIND_NAME[k]}</option>`).join('')}</select></label>`
    :`<button type="button" role="menuitem" data-mi="${i}"${it.danger?' class="danger"':''}${it.disabled?' disabled':''}><b>${esc(it.label)}</b>${it.sub?`<span>${esc(it.sub)}</span>`:''}</button>`).join('');
  m.hidden=false; const w=m.offsetWidth, h=m.offsetHeight; m.style.left=clamp(x,8,innerWidth-w-8)+'px'; m.style.top=clamp(y,8,innerHeight-h-8)+'px';
  if(ret&&ret.setAttribute) ret.setAttribute('aria-expanded','true'); const f=m.querySelector('button:not([disabled])'); if(f) f.focus(); }
function songMenuClose(){ const m=$('#songMenu'); if(!m||m.hidden) return; m.hidden=true; const r=SONG.menu&&SONG.menu.ret; SONG.menu=null; if(r&&r.isConnected){ if(r.setAttribute) r.setAttribute('aria-expanded','false'); try{ r.focus({preventScroll:true}); }catch(e){} } }
function songMakeMenu(btn){ if(!PROJ.tracks.length){ toast('Make a loop first (ask Keys for a beat, or record something), then make it a song.'); return; }
  const r=btn.getBoundingClientRect(), T=SONG_TEMPLATES, lens=k=>T[k].secs.reduce((a,x)=>a+x[2],0);
  songMenuOpen([{label:`Short · ${T.short.secs.map(x=>x[0]+' '+x[2]).join(' · ')}`,sub:`${T.short.hint} · ${songLenText(lens('short'))}`,act:()=>songTemplate('short')},
    {label:`Full track · ${T.club.secs.map(x=>x[0]).join(', ')}`,sub:`16 bars each · ${songLenText(lens('club'))}`,act:()=>songTemplate('club')},
    {label:'Just the loop',sub:`One section · ${songLenText(PROJ.bars)}`,act:()=>songTemplate([{name:'Main',kind:'other',bars:PROJ.bars}])}],r.left,r.bottom+4,btn); }
function songSecMenu(id,x,y,ret){ const s=songFind(id); if(!s) return; songSelect(s.id); const looped=SONG.view.loop&&SONG.view.loop.sid===s.id;
  songMenuOpen([{label:'Rename',act:()=>songStartRename(s.id)},{label:'Duplicate',sub:'Ctrl/Cmd+D',act:()=>songDuplicate(s.id)},
    {label:'Longer (+8 bars)',disabled:s.bars>=64,act:()=>songResize(s.id,s.bars+8)},{label:'Shorter (−8 bars)',disabled:s.bars<=1,act:()=>songResize(s.id,Math.max(1,s.bars-8))},
    {label:'Split in half',disabled:s.bars<2,act:()=>songSplit(s.id)},{label:looped?'Stop looping':'Loop this section',sub:'Ctrl/Cmd+L',act:()=>songLoopToggle(s.id)},
    {kinds:true,value:s.kind,sid:s.id},{sep:true},{label:'Delete',danger:true,sub:'Delete key',disabled:songSections().length<2,act:()=>songRemove(s.id)}],x,y,ret); }
function songLoopToggle(id){ const s=songFind(id)||songSel(); if(!s) return; const on=SONG.view.loop&&SONG.view.loop.sid===s.id;
  if(on){ songLoop(null); songChip(`Stopped looping ${s.name}`); } else { songLoop(s.id); songChip(`Looping ${s.name}`); if(!TR.running) songPlay(); } songUIState(); }
function songStartRename(id){ const el=document.querySelector(`#songStrip .sec[data-sid="${id}"] .sname`), s=songFind(id); if(!el||!s) return;
  const inp=document.createElement('input'); inp.className='input inline srename'; inp.value=s.name; inp.maxLength=24; inp.setAttribute('aria-label','Section name'); el.replaceWith(inp); inp.focus(); inp.select();
  let done=false; const fin=ok=>{ if(done) return; done=true; if(ok&&inp.value.trim()&&inp.value.trim()!==s.name) songRename(id,inp.value); else songRender(); songRefocus(`.sec[data-sid="${id}"] .sname`); };
  inp.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); fin(true); } else if(e.key==='Escape'){ e.preventDefault(); fin(false); } });
  inp.addEventListener('blur',()=>fin(true)); inp.addEventListener('pointerdown',e=>e.stopPropagation()); }

/* ----- wiring ----- */
(function(){
  const pl=$('#playlist'), strip=$('#songStrip'), sc=$('#songScroll'), box=$('#tracks'); if(!pl||!strip) return;
  document.querySelectorAll('#songSeg [data-songmode]').forEach(b=>b.addEventListener('click',()=>{ ensureAudio(); songMode(b.dataset.songmode); }));
  $('#songMake').addEventListener('click',e=>{ ensureAudio(); songMakeMenu(e.currentTarget); });
  $('#songAddSec').onclick=()=>songAdd({name:'Section',kind:'other',bars:8,at:songSections().length});
  $('#songZIn').onclick=()=>songZoom(1.25); $('#songZOut').onclick=()=>songZoom(0.8); $('#songZFit').onclick=()=>songZoom(0);
  $('#songFollow').onclick=()=>{ SONG.view.follow=!SONG.view.follow; songViewSave(); $('#songFollow').setAttribute('aria-pressed',String(SONG.view.follow)); };
  $('#songChipU').onclick=()=>{ $('#songChip').hidden=true; undo(); };
  const menu=$('#songMenu');
  menu.addEventListener('click',e=>{ const b=e.target.closest('[data-mi]'); if(!b||!SONG.menu) return; const it=SONG.menu.items[+b.dataset.mi]; songMenuClose(); if(it&&it.act) it.act(); });
  menu.addEventListener('change',e=>{ const k=e.target.closest('[data-mk]'); if(!k||!SONG.menu) return; const it=SONG.menu.items.find(x=>x.kinds); songMenuClose(); if(it) songSetKind(it.sid,k.value); });
  menu.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.preventDefault(); songMenuClose(); return; } if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); const bs=[...menu.querySelectorAll('button:not([disabled]),select')], i=bs.indexOf(document.activeElement); const n=bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]; if(n) n.focus(); } e.stopPropagation(); });
  document.addEventListener('pointerdown',e=>{ if(!menu.hidden&&!menu.contains(e.target)&&!e.target.closest('#songMake,.smore')) songMenuClose(); },true);
  /* scrolling: one scroller under the strip moves the lanes too */
  sc.addEventListener('scroll',()=>{ songScrollSync(); if(SONG.prog!=null&&Math.abs(sc.scrollLeft-SONG.prog)<2){ SONG.prog=null; return; } SONG.prog=null; if(TR.running&&SONG.view.follow&&songOn()){ SONG.view.follow=false; songViewSave(); $('#songFollow').setAttribute('aria-pressed','false'); } });
  const wheel=e=>{ if(!songOn()) return; if(e.ctrlKey||e.metaKey){ e.preventDefault(); songZoom(e.deltaY<0?1.15:1/1.15,e.clientX); return; }
    const dx=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.shiftKey?e.deltaY:0; if(!dx) return; e.preventDefault(); sc.scrollLeft+=dx; };
  sc.addEventListener('wheel',wheel,{passive:false}); box.addEventListener('wheel',e=>{ if(e.target.closest('.slane')) wheel(e); },{passive:false}); $('#songRuler').addEventListener('wheel',wheel,{passive:false});
  /* pinch to zoom on a tablet */
  const touches=new Map(); let pinch=null;
  pl.addEventListener('pointerdown',e=>{ if(e.pointerType!=='touch'||!songOn()||!e.target.closest('.sh-time,.slane')) return; touches.set(e.pointerId,e.clientX); if(touches.size===2){ const [a,b]=[...touches.values()]; pinch={d:Math.abs(a-b)||1,c:(a+b)/2,z:songPx()}; } });
  pl.addEventListener('pointermove',e=>{ if(!touches.has(e.pointerId)) return; touches.set(e.pointerId,e.clientX); if(pinch&&touches.size===2){ const [a,b]=[...touches.values()], r=(Math.abs(a-b)||1)/pinch.d, cur=songPx(); if(Math.abs(pinch.z*r/cur-1)>0.12) songZoom(pinch.z*r/cur,pinch.c); } });
  const tEnd=e=>{ touches.delete(e.pointerId); if(touches.size<2) pinch=null; }; pl.addEventListener('pointerup',tEnd); pl.addEventListener('pointercancel',tEnd);
  /* click the ruler to play from that bar */
  $('#songRuler').addEventListener('click',e=>{ if(!songOn()) return; const r=e.currentTarget.getBoundingClientRect(), bar=Math.floor((e.clientX-r.left+sc.scrollLeft)/songPx())+1; if(bar>songBars()) return; ensureAudio(); songPlay({from:bar}); pl.focus({preventScroll:true}); });
  /* the strip: select, drag to move (Alt copies), drag the right edge to resize, double-click to rename or loop, right-click or ⋯ for more */
  let D=null;
  strip.addEventListener('pointerdown',e=>{ const sec=e.target.closest('.sec'); if(!sec||e.button!==0||e.target.closest('.smore,.srename')||e.pointerType==='touch'&&touches.size>1) return; const s=songFind(sec.dataset.sid); if(!s) return;
    D={id:s.id,el:sec,x0:e.clientX,bars0:s.bars,mode:e.target.closest('.rz')?'resize':'move',alt:e.altKey,moved:false,px:songPx()}; if(D.mode==='resize') e.preventDefault(); });
  document.addEventListener('pointermove',e=>{ if(!D) return; const dx=e.clientX-D.x0; if(!D.moved&&Math.abs(dx)<5) return; D.moved=true;
    if(D.mode==='resize'){ const step=e.altKey?1:4; D.nb=clamp(Math.round((D.bars0+dx/D.px)/step)*step,1,64); D.el.style.width=Math.max(4,D.nb*D.px-2)+'px'; D.el.querySelector('.sbars').textContent=D.nb; D.el.classList.add('sizing'); }
    else { D.el.style.transform=`translateX(${dx}px)`; D.el.classList.add('dragging'); D.alt=e.altKey; } });
  document.addEventListener('pointerup',e=>{ if(!D) return; const d=D; D=null; if(!d.moved){ if(d.mode==='move'){ songSelect(d.id); } return; }
    if(d.mode==='resize'){ if(d.nb&&d.nb!==d.bars0) songResize(d.id,d.nb); else songRender(); return; }
    const sr=strip.getBoundingClientRect(), xp=e.clientX-sr.left, S=songSections(), s=songFind(d.id); let acc=0, idx=0, idxAll=0;
    S.forEach(o=>{ const mid=(acc+o.bars/2)*d.px; acc+=o.bars; if(mid<xp){ idxAll++; if(o!==s) idx++; } });
    d.el.style.transform=''; if(d.alt) songAdd({copyOf:d.id,at:idxAll}); else if(!songMove(d.id,idx)) songRender(); });
  strip.addEventListener('dblclick',e=>{ const sec=e.target.closest('.sec'); if(!sec||e.target.closest('.smore,.rz')) return; if(e.target.closest('.sname')) songStartRename(sec.dataset.sid); else songLoopToggle(sec.dataset.sid); });
  strip.addEventListener('contextmenu',e=>{ const sec=e.target.closest('.sec'); if(!sec) return; e.preventDefault(); songSecMenu(sec.dataset.sid,e.clientX,e.clientY,sec.querySelector('.sname')); });
  strip.addEventListener('click',e=>{ const m=e.target.closest('.smore'); if(m){ const r=m.getBoundingClientRect(); songSecMenu(m.closest('.sec').dataset.sid,r.left,r.bottom+4,m); return; }
    if(e.target.closest('.sadd')){ songAdd({name:'Section',kind:'other',bars:8,at:songSections().length}); return; }
    const n=e.target.closest('.sname'); if(n&&e.detail===0) songSelect(n.closest('.sec').dataset.sid); });
  $('#songMap').addEventListener('click',e=>{ const b=e.target.closest('.smb'); if(!b) return; ensureAudio(); songLoopToggle(b.dataset.sid); });
  /* parts: click switches on/off (after a moment, so a double-click can open the editor instead) */
  let pT=0;
  const togglePart=el=>{ const s=songFind(el.dataset.sid), t=PROJ.tracks.find(x=>x.id===el.dataset.tid); if(!s||!t) return; const on=!(s.parts[t.id]&&s.parts[t.id].on);
    if(!(TR.running&&songOn())) SONG.view.sel=s.id; songSetPart(s.id,t.id,{on}); songFlash({parts:[[s.id,t.id]]}); };
  box.addEventListener('click',e=>{ const el=e.target.closest('.part'); if(!el) return; clearTimeout(pT); if(e.detail===0){ togglePart(el); return; } if(e.detail>1) return; pT=setTimeout(()=>togglePart(el),230); });
  box.addEventListener('dblclick',e=>{ const el=e.target.closest('.part'); if(!el) return; clearTimeout(pT); const t=PROJ.tracks.find(x=>x.id===el.dataset.tid); if(!t) return;
    songSelect(el.dataset.sid,{cursor:!TR.running}); if(t.kind==='notes') openEditor(t.id,{sid:el.dataset.sid}); else toast('That’s a recording: switch it on or off here. Use “Turn into notes” to edit it as notes.'); });
  /* the song area takes the keyboard while it has focus; clicking the piano gives the keys back */
  pl.addEventListener('pointerdown',e=>{ if(!songOn()||e.target.closest('input,select,textarea,button,.slane')) return; if(e.target.closest('.th,.tfx')) return; pl.focus({preventScroll:true}); });
  document.addEventListener('pointerdown',e=>{ const a=document.activeElement; if(a&&a!==document.body&&pl.contains(a)&&!pl.contains(e.target)&&!e.target.closest('#songMenu')) a.blur(); },true); /* e.g. the piano: its keys play notes again */
  pl.addEventListener('keyup',e=>{ if(songOn()&&e.key===' '&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); });
  pl.addEventListener('keydown',e=>{ if(!songOn()) return; const tg=e.target; if(tg&&/INPUT|SELECT|TEXTAREA/.test(tg.tagName)) return; if(tg.closest&&tg.closest('.th,.tfx')&&e.key!==' ') return;
    const m=e.ctrlKey||e.metaKey, k=e.key.toLowerCase(), sel=songSel(), S=songSections(); let done=true;
    if(e.key===' '&&!m){ ensureAudio(); if(TR.running) loopStop(); else loopPlay(); }
    else if(m&&k==='d'&&!e.shiftKey){ if(sel) songDuplicate(sel.id); }
    else if(m&&k==='l'){ if(sel) songLoopToggle(sel.id); }
    else if(!m&&(e.key==='Delete'||e.key==='Backspace')){ if(sel) songRemove(sel.id); }
    else if(!m&&(e.key==='+'||e.key==='=')) songZoom(1.25);
    else if(!m&&(e.key==='-'||e.key==='_')) songZoom(0.8);
    else if(!m&&k==='w') songZoom(0);
    else if(!m&&e.key==='Home'){ SONG.cursor=0; sc.scrollLeft=0; if(TR.running) songPlay({from:1}); else songUIState(); }
    else if(!m&&!e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&!(tg.closest&&tg.closest('.part'))){ const i=sel?S.indexOf(sel):-1, n=S[clamp(i+(e.key==='ArrowLeft'?-1:1),0,S.length-1)]; if(n){ songSelect(n.id); songRefocus(`.sec[data-sid="${n.id}"] .sname`); } }
    else if(!m&&e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){ if(sel) songMove(sel.id,S.indexOf(sel)+(e.key==='ArrowLeft'?-1:1)); }
    else done=false;
    if(done){ e.preventDefault(); e.stopPropagation(); } });
  let rz=0; window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(()=>{ if(songOn()&&!SONG.view.zoom) songRelayout(); else songDrawRuler(); },130); });
})();
