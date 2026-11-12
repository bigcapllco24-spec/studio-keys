
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
function songEdit(fn,o={}){ if(typeof undoBoundary==='function') undoBoundary(); const S=songSections(); const r=fn(S); if(o.structure) S.forEach(s=>delete s.auto); saveProject(); songRender(true); return r; }
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
  if(SONG.view.sel===s.id) SONG.view.sel=(S[Math.min(i,S.length-1)]||{}).id||null; if(SONG.view.loop&&SONG.view.loop.sid===s.id) SONG.view.loop=null; songViewSave(); songRender();
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
