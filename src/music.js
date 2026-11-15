
/* ---------- music theory and part generators ---------- */
const PC_NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10]};
const keyName=k=>k?`${PC_NAMES[k.tonic]} ${k.mode}`:'Auto';
const KS_MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88], KS_MIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
/* SE-7a: the honest key. detectKey v2 weighs each note by length x velocity (bass and bar-start notes count 1.5x) and
   needs 8+ notes over 4+ pitch classes. Each of the 24 keys scores: how much of the music sits in its scale (2x), the
   Krumhansl-Schmuckler profile match (0.5x), and tonic evidence: the bass root on downbeats, the first and last chord.
   Tested on 864 of our own generated loops (12 styles, 24 keys, bass+chords / +melody / chords+melody): 88% exact, 11% the
   relative key. Bar roots come only from bass and chord parts, never from a melody (fix 1, 15 Nov).
   Returns {tonic, mode, conf, level 1-4, alt, cands[3] with a reason each}. A near tie goes to the style's mode.
   detectKeyV1 is the old melody-only guess, kept for the migration of old songs. */
const KEY_MIN_NOTES=8, KEY_MIN_PCS=4, KEY_WORDS=['','maybe','likely','fairly sure','sure'], KEY_W={fit:2,ks:0.5,bass:0.25,first:0.1,last:0.05};
const sameKey=(a,b)=>!!a&&!!b&&a.tonic===b.tonic&&a.mode===b.mode;
const relKey=k=>k.mode==='major'?{tonic:mod(k.tonic+9,12),mode:'minor'}:{tonic:mod(k.tonic+3,12),mode:'major'};
function detectKeyV1(notes){
  if(!notes.length) return null; const h=new Array(12).fill(0); notes.forEach(e=>h[mod(Math.round(e.n),12)]+=e.d||0.5);
  let best=null; const corr=(p,r)=>{ const mx=h.reduce((a,b)=>a+b,0)/12, mp=p.reduce((a,b)=>a+b,0)/12; let a=0,b=0,c=0; for(let i=0;i<12;i++){ const x=h[(i+r)%12]-mx, y=p[i]-mp; a+=x*y; b+=x*x; c+=y*y; } return a/Math.sqrt(b*c||1); };
  for(let r=0;r<12;r++){ [['major',KS_MAJ],['minor',KS_MIN]].forEach(([m,p])=>{ const s=corr(p,r); if(!best||s>best.s) best={tonic:r,mode:m,s}; }); }
  return {tonic:best.tonic,mode:best.mode};
}
function detectKey(notes,opts={}){
  if(!notes||!notes.length) return null;
  const h=new Array(12).fill(0), pcs=new Set(), bars=new Map(); let tot=0, hasBass=false;
  const isDown=b=>Math.abs(b-Math.round(b/4)*4)<0.07;
  /* SE-7a fix 1: only real bass parts (e.bass: a bass track or a sung bass) and chord parts (e.chord: a chords track or any
     track that plays 3+ notes at once) say where a bar's root is. A melody note on a downbeat is not a bass root. */
  notes.forEach(e=>{ const n=Math.round(e.n), pc=mod(n,12), low=!!e.bass||n<48, down=isDown(e.b||0);
    let w=clamp(e.d||0.5,0.1,4)*(e.v==null?0.8:clamp(e.v,0.05,1)); if(low) w*=1.5; if(down) w*=1.5; h[pc]+=w; tot+=w; pcs.add(pc);
    if(e.bass) hasBass=true; if(!e.bass&&!e.chord) return;
    const bar=Math.floor((e.b||0)/4+0.02); if((e.b||0)-bar*4<1){ if(!bars.has(bar)) bars.set(bar,[]); bars.get(bar).push({n,pc,bass:!!e.bass,d:clamp(e.d||0.5,0.25,4)}); } });
  /* each bar's root: the lowest bass note starting in its first beat; with no bass, the root of the chord sounding there.
     q = the chord's quality on that root (minor / major), from the chord notes in the bar */
  const barRoot=list=>{ const has=new Set(list.filter(x=>!x.bass).map(x=>x.pc)), qual=r=>has.has(mod(r+3,12))&&!has.has(mod(r+4,12))?'minor':has.has(mod(r+4,12))&&!has.has(mod(r+3,12))?'major':null;
    const lows=list.filter(x=>x.bass); if(lows.length){ const m=lows.reduce((a,b)=>b.n<a.n?b:a); return {pc:m.pc,w:m.d,src:'bass',q:qual(m.pc)}; }
    let best=null; has.forEach(r=>{ const sc=1+(has.has(mod(r+7,12))?1:0)+(has.has(mod(r+3,12))||has.has(mod(r+4,12))?0.9:0)-(has.has(mod(r+1,12))?0.3:0); if(!best||sc>best.sc||(sc===best.sc&&list.find(x=>x.pc===r).n<list.find(x=>x.pc===best.r).n)) best={r,sc}; });
    return best?{pc:best.r,w:Math.max(...list.map(x=>x.d)),src:'chords',q:qual(best.r)}:null; };
  bars.forEach((list,bar)=>bars.set(bar,barRoot(list)));
  if(!opts.loose&&(notes.length<KEY_MIN_NOTES||pcs.size<KEY_MIN_PCS)) return null;
  if(tot<=0) return null;
  const bassH=new Array(12).fill(0); let bassT=0; bars.forEach(x=>{ if(x){ bassH[x.pc]+=x.w; bassT+=x.w; } });
  const barNums=[...bars.keys()].filter(b=>bars.get(b)).sort((a,b)=>a-b), firstBar=barNums.length?bars.get(barNums[0]):null, firstRoot=firstBar?firstBar.pc:null, lastRoot=barNums.length?bars.get(barNums[barNums.length-1]).pc:null;
  /* a tune on its own (no bass or chord part): only its first note is a light hint of the home note */
  let tuneFirst=null; if(!barNums.length){ const f=notes.reduce((a,e)=>!a||(e.b||0)<(a.b||0)-0.01||(Math.abs((e.b||0)-(a.b||0))<=0.01&&e.n<a.n)?e:a,null); tuneFirst=f?mod(Math.round(f.n),12):null; }
  const mx=tot/12, corr=(p,r)=>{ const mp=p.reduce((a,b)=>a+b,0)/12; let a=0,b=0,c=0; for(let i=0;i<12;i++){ const x=h[(i+r)%12]-mx, y=p[i]-mp; a+=x*y; b+=x*x; c+=y*y; } return a/Math.sqrt(b*c||1); };
  const bassShare=pc=>bassT?bassH[pc]/bassT:0, fit=k=>scaleOf(k).reduce((a,pc)=>a+h[pc],0)/tot;
  let all=[]; for(let r=0;r<12;r++) [['major',KS_MAJ],['minor',KS_MIN]].forEach(([m,p])=>{ const k={tonic:r,mode:m};
    k.f=fit(k); k.s=KEY_W.fit*k.f+KEY_W.ks*corr(p,r)+KEY_W.bass*bassShare(r)+KEY_W.first*(firstRoot===r||tuneFirst===r)+KEY_W.last*(lastRoot===r); all.push(k); });
  /* a few notes (Keys picking a key for its first part): only keys that all of those notes fit can win */
  const maxFit=Math.max(...all.map(k=>k.f)); if(opts.loose&&(notes.length<KEY_MIN_NOTES||pcs.size<KEY_MIN_PCS)) all=all.filter(k=>k.f>=maxFit-0.001);
  all.sort((a,b)=>b.s-a.s);
  /* a near tie between a major and a minor key goes to the style's mode */
  let tie=null; if(all.length>1&&all[0].s-all[1].s<0.005&&all[0].mode!==all[1].mode){ const sm=opts.styleMode||((typeof PROJ!=='undefined'&&PROJ&&STYLES[PROJ.style])?STYLES[PROJ.style].mode:null);
    if(sm&&all[1].mode===sm){ const t=all[0]; all[0]=all[1]; all[1]=t; tie='style'; } }
  const best=all[0], second=all[1]||all[0];
  const conf=best.s>0?clamp((best.s-second.s)/best.s,0,1):0;
  /* SE-7a fix 2: the guesses after the first never clash with played notes when a key with the same notes exists
     (F♯m–E–D–E: A major before E major, whose D♯ the song never plays) */
  const rest=all.slice(1), clean=rest.filter(k=>k.f>=best.f-0.01);
  if(clean.length&&rest[0]&&rest[0].f<best.f-0.01){ rest.splice(rest.indexOf(clean[0]),1); rest.unshift(clean[0]); }
  const shown=[best].concat(rest);
  /* reasons say what is really there: the bass, the chords, or only how many notes fit */
  const rootSrc=pc=>{ let b=0,c=0; bars.forEach(x=>{ if(x&&x.pc===pc){ if(x.src==='bass') b++; else c++; } }); return b>=c?'bass':'chords'; };
  const why=k=>{ const nm=PC_NAMES[k.tonic], bs=bassShare(k.tonic);
    if(bs>=0.3) return rootSrc(k.tonic)==='bass'?`the bass lands on ${nm}`:`the chords keep coming back to ${nm}`;
    const what=firstBar&&firstBar.src==='bass'?'the bass':'the chords';
    if(firstRoot===k.tonic&&lastRoot===k.tonic) return `${what} start${what==='the bass'?'s':''} and end${what==='the bass'?'s':''} on ${nm}`;
    if(firstRoot===k.tonic) return `${what} start${what==='the bass'?'s':''} on ${nm}`;
    if(lastRoot===k.tonic) return `${what} end${what==='the bass'?'s':''} on ${nm}`;
    if(tuneFirst===k.tonic) return `the tune starts on ${nm}`;
    if(k!==best&&sameKey(relKey(k),best)) return `same notes as ${keyName(best)}`;
    return `${Math.round(k.f*100)}% of the notes fit`; };
  const cands=shown.slice(0,3).map(k=>({tonic:k.tonic,mode:k.mode,why:why(k)}));
  let level=conf<0.02?1:conf<0.06?2:conf<0.12?3:4;
  /* SE-7a fix (optional): a relative major/minor pair has the same notes, so only the tonic tells them apart. When the loop
     opens on the winner's chord, in the winner's mode (Dm in Dm–B♭–F–C), and the bass or chords also end away from the
     relative key's tonic, that is good evidence: "maybe" becomes "likely" (tested: the 168 boosted loops with a clear
     answer were all right; the other 55 were vi-IV-I-V loops like Am–F–C–G, which read as A minor with C major second). */
  if(opts.relBoost!==false&&level<(opts.relMax||2)&&sameKey(relKey(best),second)&&firstBar&&firstRoot===best.tonic&&firstBar.q===best.mode&&lastRoot!==second.tonic&&barNums.length>=2) level++;
  if(notes.length<16) level=Math.min(level,2); if(opts.loose&&(notes.length<KEY_MIN_NOTES||pcs.size<KEY_MIN_PCS)) level=1;
  return {tonic:best.tonic,mode:best.mode,conf:Math.round(conf*1000)/1000,level,alt:{tonic:cands[1]?cands[1].tonic:second.tonic,mode:cands[1]?cands[1].mode:second.mode},cands,why:cands[0].why,notes:notes.length,tie};
}
/* the DJ key code for mixing in key (A = minor, B = major; C major is 8B). Labelled "DJ key", never "Camelot" (owner, 14 Nov) */
function djKey(k){ if(!k) return ''; const t=k.mode==='minor'?mod(k.tonic+3,12):k.tonic; return (mod(t*7+7,12)+1)+(k.mode==='minor'?'A':'B'); }
function snapToKey(n,key){ if(!key) return n; const sc=SCALES[key.mode], pc=mod(n-key.tonic,12); let bd=99, bp=pc; sc.forEach(s=>{ [s-12,s,s+12].forEach(x=>{ const d=Math.abs(x-pc); if(d<bd){ bd=d; bp=x; } }); }); return n-pc+bp; }
const rng=seed=>()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };

/* styles: tempo, sounds and patterns (16 steps per bar; x = accent, o = soft) */
const STYLES={
  house:{name:'House',bpm:124,mode:'minor',kit:'kit909',bass:'pluckbass',chords:'piano',bassStyle:'offbeat',chordStyle:'stabs',hats:'offbeat',drums:{36:'x...x...x...x...',39:'....x.......x...'}},
  techno:{name:'Techno',bpm:130,mode:'minor',kit:'kit909',bass:'acid',chords:'supersaw',bassStyle:'rolling',chordStyle:'stabs',hats:'16th',drums:{36:'x...x...x...x...',37:'....x.......x...',46:'..x...x...x...x.'}},
  hiphop:{name:'Hip-hop',bpm:90,mode:'minor',kit:'kitKit8',bass:'bass',chords:'epiano',bassStyle:'follow',chordStyle:'seventh',hats:'8th',swing:0.14,drums:{36:'x......x..x.....',38:'....x.......x...'}},
  lofi:{name:'Lo-fi',bpm:80,mode:'major',kit:'kitKit8',bass:'acbass',chords:'epiano',bassStyle:'follow',chordStyle:'seventh',hats:'8th',swing:0.2,drums:{36:'x.....x...x.....',38:'....x.......x...'}},
  trap:{name:'Trap',bpm:140,mode:'minor',kit:'kitTrap',bass:'bass808',chords:'pad',bassStyle:'follow808',chordStyle:'sustain',hats:'trap',drums:{36:'x......x..x.....|x.....x.x.......',39:'........x.......'}},
  pop:{name:'Pop',bpm:110,mode:'major',kit:'kitKit3',bass:'bass',chords:'piano',bassStyle:'root8',chordStyle:'pulse8',hats:'8th',drums:{36:'x.......x.x.....',38:'....x.......x...'}},
  rock:{name:'Rock',bpm:116,mode:'major',kit:'kitAcoustic',bass:'bass',chords:'eguitar',bassStyle:'root8',chordStyle:'power',hats:'8th',drums:{36:'x.......x.x.....',38:'....x.......x...'}},
  reggaeton:{name:'Reggaeton',bpm:95,mode:'minor',kit:'kit808',bass:'bass808',chords:'supersaw',bassStyle:'dembow',chordStyle:'sustain',hats:'8th',drums:{36:'x...x...x...x...',38:'...x..x....x..x.'}},
  dnb:{name:'Drum & bass',bpm:174,mode:'minor',kit:'kitStark',bass:'reese',chords:'pad',bassStyle:'reese',chordStyle:'sustain',hats:'8th',drums:{36:'x.........x.....',38:'....x.......x...'}},
  afro:{name:'Afro house',bpm:118,mode:'minor',kit:'kit909',bass:'pluckbass',chords:'kalimba',bassStyle:'sync',chordStyle:'arp',hats:'shaker',drums:{36:'x...x...x...x...',37:'...x..x...x..x..',45:'......x.......x.'}},
  bhangra:{name:'Bhangra',bpm:100,mode:'major',kit:'kitAcoustic',bass:'bass',chords:'sitar',bassStyle:'sync',chordStyle:'arp',hats:'8th',drums:{36:'x..x..x.x..x..x.',45:'...x.......x...x',39:'....x.......x...'}},
  bollywood:{name:'Bollywood pop',bpm:96,mode:'minor',kit:'kitKit3',bass:'bass',chords:'strings',bassStyle:'root8',chordStyle:'sustain',hats:'8th',drums:{36:'x..x....x..x....',38:'....x.......x...',45:'.......x.......x'}}
};
const HATS={
  quarter:{42:'x...x...x...x...'},
  '8th':{42:'x.o.x.o.x.o.x.o.'},
  '16th':{42:'xoooxoooxoooxooo'},
  offbeat:{42:'..x...x...x...x.'},
  open:{46:'..x...x...x...x.',42:'x...x...x...x...'},
  shaker:{44:'xooxxooxxooxxoox'},
  trap:{42:'x.o.x.o.x.o.x.o.|x.o.x.o.x.oox.xx'}
};
function pat(str,bar){ const bars=str.split('|'); return bars[bar%bars.length]; }
function patternEvents(spec,L,opts={}){
  const ev=[], r=rng(opts.seed||7), swing=opts.swing||0;
  for(let bar=0;bar<L/4;bar++){
    for(const [note,str] of Object.entries(spec)){
      const p=pat(str,bar);
      for(let s=0;s<16;s++){ const ch=p[s]; if(ch==='.'||!ch) continue;
        let b=bar*4+s/4; if(s%2===1) b+=swing*0.25;
        const v=clamp((ch==='x'?0.92:0.55)+(r()-0.5)*0.08,0.1,1);
        ev.push({b:Math.round(b*1000)/1000,d:0.2,n:+note,v}); }
    }
    if(opts.trapRolls && bar%2===1){ for(let k=0;k<6;k++) ev.push({b:bar*4+3+k/6,d:0.1,n:42,v:0.5+k*0.07}); }
  }
  return ev;
}
function scaleOf(key){ return SCALES[key.mode].map(x=>(x+key.tonic)%12); }
function triad(key,deg){ const sc=SCALES[key.mode]; return [0,2,4].map(i=>(sc[(deg+i)%7]+key.tonic)%12); }
function seventh(key,deg){ const sc=SCALES[key.mode]; return [0,2,4,6].map(i=>(sc[(deg+i)%7]+key.tonic)%12); }
/* SE-7a: the song's key reads every pitched part (chords, bass, melody, pads), not only melody tracks */
function pitchedTrack(t){ if(!t||t.kind!=='notes'||['drums','hats','perc'].includes(t.role)) return false; const I=(typeof INST!=='undefined'&&INST.get(t.inst))||{}; return !I.drums&&!I.percussive; }
/* a chords track, or any track that mostly plays 3+ notes at once (a piano part played in or imported), is a chord part;
   a bass track, or a part played in low (on average below about D3) that is not a melody or chords track, is a bass part */
function chordyTrack(t){ if(t.role==='chords') return true; const ev=t.events||[]; if(ev.length<6) return false; const on=ev.map(e=>e.b||0).sort((a,b)=>a-b);
  let inChords=0; on.forEach((b,i)=>{ let n=1; for(let j=i-1;j>=0&&b-on[j]<=0.1;j--) n++; for(let j=i+1;j<on.length&&on[j]-b<=0.1;j++) n++; if(n>=3) inChords++; }); return inChords/ev.length>=0.5; }
function bassyTrack(t){ if(t.role==='bass') return true; if(['melody','chords','voice'].includes(t.role)) return false; const ev=t.events||[]; return ev.length>0&&ev.reduce((a,e)=>a+e.n,0)/ev.length<50; }
function pitchedNotes(p){ p=p||PROJ; const out=[]; (p.tracks||[]).forEach(t=>{ if(!pitchedTrack(t)) return; const chord=t.role!=='bass'&&chordyTrack(t), bass=!chord&&bassyTrack(t);
  (t.events||[]).forEach(e=>out.push(bass?{b:e.b,d:e.d,n:e.n,v:e.v,bass:true}:chord?{b:e.b,d:e.d,n:e.n,v:e.v,chord:true}:e)); }); return out; }
/* where the key comes from: you (chosen), keys (Keys picked it for a part on a song with no key), vibe (an artist's key),
   song (7b: a song you dropped in), notes (worked out from your notes; a sung or hummed take stores a soft one), none */
const KEY_HARD=['you','keys','vibe','song'];
/* songs saved before SE-7: a key with no "from" was a lock (kept as set); a song with no key but generated parts keeps
   the old default those parts were made in (from:'keys'), so nothing moves when it reopens */
function migrateKey(p){ if(!p||p.kv>=2) return p; p.kv=2;
  if(p.key&&p.key.tonic!=null){ if(!p.key.from) p.key.from='you'; return p; }
  const gen=(p.tracks||[]).some(t=>t.gen&&t.kind==='notes'&&['bass','chords','melody'].includes(t.role));
  if(gen){ const mel=[]; p.tracks.forEach(t=>{ if(t.kind==='notes'&&t.role==='melody') (t.events||[]).forEach(e=>mel.push(e)); });
    const k=detectKeyV1(mel)||{tonic:9,mode:(STYLES[p.style]||{}).mode||'minor'}; p.key={tonic:k.tonic,mode:k.mode,from:'keys'}; }
  return p; }
function keyStatus(){
  if(PROJ.kv==null) migrateKey(PROJ);
  const k=PROJ.key, notes=pitchedNotes(), det=detectKey(notes), out={key:null,from:'none',conf:0,level:0,word:'',alt:null,enough:!!det,cands:det?det.cands:[],notes:notes.length,src:null,hum:false,why:det?det.why:''};
  const src=k&&k.from==='notes'?(k.src||(k.hum?'hum':null)):null;
  if(k&&k.tonic!=null&&KEY_HARD.includes(k.from||'you')) return Object.assign(out,{key:{tonic:k.tonic,mode:k.mode},from:k.from||'you',level:4,word:'',conf:1,heard:det&&!sameKey(det,k)?{tonic:det.tonic,mode:det.mode}:null});
  if(det) return Object.assign(out,{key:{tonic:det.tonic,mode:det.mode},from:'notes',conf:det.conf,level:det.level,word:KEY_WORDS[det.level],alt:det.alt,src:src&&sameKey(k,det)?src:null,hum:src==='hum'&&sameKey(k,det)});
  if(k&&k.tonic!=null) return Object.assign(out,{key:{tonic:k.tonic,mode:k.mode},from:'notes',level:1,word:KEY_WORDS[1],src,hum:src==='hum'});
  return out;
}
/* the key every generator uses: the honest key, else the style's default (Keys pins that as "Keys picked" when it makes a part) */
function projectKey(){ return keyStatus().key||{tonic:9,mode:(STYLES[PROJ.style]||{}).mode||'minor'}; }
/* Keys is about to make a part on a song with no key yet: it picks one (fitting a few notes if there are any) and says so */
function keysPickKey(){ const st=keyStatus(); if(st.key) return st.key; const notes=pitchedNotes();
  const k=(notes.length>=3&&detectKey(notes,{loose:true}))||{tonic:9,mode:(STYLES[PROJ.style]||{}).mode||'minor'}; setKey({tonic:k.tonic,mode:k.mode},'keys'); return k; }
/* a sung, hummed or transcribed take: a key that was set stays; otherwise the take is heard with the song's other parts and
   gives only a soft key once there are 8+ notes. A short hum never locks the key. Returns the key to shape it with.
   src: 'hum' (hummed to Keys), 'sing' (a sung take), 'audio' (notes from a recording). The key is labelled by that source
   ("from your humming", "from your singing", "from your recording") only when the take decided it, i.e. the song's other
   parts alone gave no key or a different one; when the chords already said it, it reads like any key from your notes.
   role 'bass' marks the take's notes as a bass part, 'chords' as a chord part. */
const KEY_SRC={hum:'from your humming',sing:'from your singing',audio:'from your recording'}, KEY_SRC_NOUN={hum:'humming',sing:'singing',audio:'recording'};
function takeKey(notes,detect=true,src='hum',role){ const k=PROJ.key; if(k&&k.tonic!=null&&KEY_HARD.includes(k.from||'you')) return k;
  if(!detect) return k||null;
  const tag=role==='bass'?{bass:true}:role==='chords'?{chord:true}:null, mine=(notes||[]).map(e=>tag?Object.assign({b:e.b,d:e.d,n:e.n,v:e.v},tag):e);
  const before=detectKey(pitchedNotes()), det=detectKey(pitchedNotes().concat(mine));
  if(det){ const decided=!before||!sameKey(before,det); setKey(Object.assign({tonic:det.tonic,mode:det.mode},decided&&KEY_SRC[src]?{src}:{}),'notes'); return PROJ.key; }
  return k||null; }
/* one line for the chip, the assistant and exports */
function keyStatusText(st){ st=st||keyStatus(); if(!st.key) return 'no key yet';
  const tag={you:'set',keys:'Keys picked',vibe:'from the vibe',song:'from the song'}[st.from];
  if(tag) return `${keyName(st.key)} · ${tag}`;
  if(st.src) return `${keyName(st.key)} · ${KEY_SRC[st.src]}`;
  return `${keyName(st.key)} · ${st.word}${st.alt&&st.level<4?' · or '+keyName(st.alt):''}`; }
/* for the AI: what the app knows about the key, honestly */
function keyContext(st){ st=st||keyStatus(); if(!st.key) return `no key yet (only ${st.notes} pitched notes; nothing to work it out from)`;
  const dj=` (DJ key ${djKey(st.key)})`;
  if(st.from==='you') return `${keyName(st.key)}${dj}, set by the user`;
  if(st.from==='keys') return `${keyName(st.key)}${dj}, picked by Keys for the first part (the user didn't choose it)${st.heard?'; their notes sound more like '+keyName(st.heard):''}`;
  if(st.from==='vibe') return `${keyName(st.key)}${dj}, from the vibe's artist`;
  if(st.from==='song') return `${keyName(st.key)}${dj}, from a song the user brought in`;
  return `${keyName(st.key)}${dj}, worked out from the user's notes${st.src?' (their '+KEY_SRC_NOUN[st.src]+')':''}: ${st.word}${st.alt?', could also be '+keyName(st.alt):''}${st.why?'; '+st.why:''}`; }
function melodyNotes(){ const out=[]; PROJ.tracks.forEach(t=>{ if(t.kind==='notes' && (t.role==='melody')) t.events.forEach(e=>out.push(e)); }); return out; }
/* the chords every generator follows, one entry per bar: {deg, root, pcs, sev}, plus at(beat) (the chord at a beat) and
   segs(b, d) (a note from b for d beats cut where the chord changes: [{b, d, c}]). SE-7c: when the song has PROJ.chords
   (heard in a song or fixed by hand) they decide, chords outside the key included; otherwise Keys' progression PROJ.prog,
   bent towards a melody you played, exactly as before. */
function chordPlan(chords){
  const src=chords||(Array.isArray(PROJ.chords)&&PROJ.chords.length?PROJ.chords:null);
  if(src) return chordPlanFrom(src,projectKey());
  const key=projectKey(), L=PROJ.bars*4, bars=L/4, mel=melodyNotes(), plan=[];
  const prog=(PROJ.prog&&PROJ.prog.length)?PROJ.prog:(key.mode==='minor'?[0,5,2,6]:[0,4,5,3]);
  for(let b=0;b<bars;b++){
    const inBar=mel.filter(e=>e.b>=b*4&&e.b<b*4+4);
    let deg=prog[b%prog.length];
    if(inBar.length && !PROJ.progLocked){ let best=-1; for(let d=0;d<7;d++){ if((key.mode==='major'&&d===6)||(key.mode==='minor'&&d===1)) continue;
      const pcs=triad(key,d); let s=(d===0?0.3:d===3||d===4?0.15:0); inBar.forEach(e=>{ if(pcs.includes(mod(Math.round(e.n),12))) s+=(e.d||0.5); }); if(s>best){ best=s; deg=d; } } }
    plan.push({deg,root:triad(key,deg)[0],pcs:triad(key,deg),sev:seventh(key,deg)});
  }
  const at=b=>plan[Math.floor(Math.max(0,b)/4)%plan.length];
  return {key,plan,at,segs:(b,d)=>[{b,d,c:at(b)}]};
}
/* ---------- SE-7c: the song's chords ----------
   PROJ.chords = [{b, d, root, q, conf, from, bass?, alt?}] in loop beats (b 0 = bar 1), sorted, not overlapping; saved with the
   song. root is a pitch class 0-11 (null when q is 'none'); q is 'maj' | 'min' | '7' | 'm7' | 'maj7' | 'sus4' | 'sus2' | 'dim' |
   '5' (power chord) | 'none' (no chord: generated parts rest there). from: 'audio' (heard in a song), 'user' (fixed by hand or by
   voice), 'keys' (Keys' own progression, written out when you fix one bar of it). bass: a pitch class under the chord (a slash
   chord, "C/E", from "bass movement too"); absent means the root. alt: the analysis' second guess {root, q}.
   Missing or empty PROJ.chords: everything behaves exactly as before (Keys' progression PROJ.prog). A span shorter than the
   loop repeats. */
const CHORD_IV={maj:[0,4,7],min:[0,3,7],'7':[0,4,7,10],m7:[0,3,7,10],maj7:[0,4,7,11],sus4:[0,5,7],sus2:[0,2,7],dim:[0,3,6],'5':[0,7],none:[]};
const CHORD_QS=Object.keys(CHORD_IV);
/* chordPcs(root, q) or chordPcs({root, q}) -> the chord's pitch classes, root first ([] for no chord) */
function chordPcs(root,q){ if(root&&typeof root==='object'){ q=root.q; root=root.root; } if(root==null||q==='none') return []; return (CHORD_IV[q]||CHORD_IV.maj).map(i=>mod(root+i,12)); }
/* chordName(root, q) or chordName({root, q, bass}) -> "Em", "G7", "Dsus4", "B5", "C/E", "N.C." */
function chordName(root,q){ const c=root&&typeof root==='object'?root:{root,q}; const n=anaChordName(c); return n!=='N.C.'&&c.bass!=null&&c.bass!==c.root?n+'/'+PC_NAMES[c.bass]:n; }
/* parseChord("Bm" | "F#7" | "Esus4" | "B♭maj7" | "Am/E" | "C sharp minor" | "N.C." ...) -> {root, q, bass?} or null */
const CHORD_WORDS=[[/^(|maj|major|M|Δ)$/,'maj'],[/^(m|min|minor|-|mi)$/,'min'],[/^(7|dom7|dom|9|11|13)$/,'7'],[/^(m7|min7|minor7|-7|mi7|m9|min9|m11)$/,'m7'],
  [/^(maj7|M7|Δ7|major7|maj9|M9|Δ9)$/,'maj7'],[/^(sus4|sus|7sus4|7sus)$/,'sus4'],[/^(sus2)$/,'sus2'],[/^(dim|°|o|dim7|°7|o7|m7b5|m7♭5|ø|ø7|half-?dim(inished)?|diminished)$/,'dim'],
  [/^(5|power|powerchord)$/,'5'],[/^(add9|add2|6|69|6\/9|madd9)$/,null]];
function parseChord(s){
  if(s&&typeof s==='object'){ if(s.q==='none'||s.root==null) return {root:null,q:'none'}; const o={root:mod(Math.round(+s.root),12),q:CHORD_IV[s.q]?s.q:'maj'}; if(s.bass!=null) o.bass=mod(Math.round(+s.bass),12); return isNaN(o.root)?null:o; }
  let t=String(s==null?'':s).trim().replace(/\s+chord$/i,''); if(!t) return null;
  if(/^(n\.?\s?c\.?|none|no chord|nothing|rest|silence|off)$/i.test(t)) return {root:null,q:'none'};
  let bass=null; const sl=/^(.+?)\s*\/\s*([A-Ga-g])\s*(#|♯|b|♭)?$/.exec(t); if(sl){ bass=mod('C D EF G A B'.indexOf(sl[2].toUpperCase())+(sl[3]?(/[#♯]/.test(sl[3])?1:-1):0),12); t=sl[1]; }
  const m=/^([A-Ga-g])\s*(#|♯|b(?![a-z])|♭|b(?=m|maj|min|M|7|5|9|6|sus|dim|add|°|ø|$)|\s+sharp|\s+flat)?\s*(.*)$/.exec(t); if(!m) return null;
  let root='C D EF G A B'.indexOf(m[1].toUpperCase()); if(m[2]) root+=/[#♯]|sharp/i.test(m[2])?1:-1; root=mod(root,12);
  let rest=m[3].trim().replace(/\s+/g,''); const lower=rest.toLowerCase();
  let q;
  for(const [re,qq] of CHORD_WORDS){ if(re.test(rest)||(re.test(lower)&&!/^M(\d|$)/.test(rest))){ q=qq; break; } }
  if(q===undefined) return null;
  if(q===null) q=/^m(?!aj)/.test(rest)?'min':'maj';
  const o={root,q}; if(bass!=null&&bass!==root) o.bass=bass; return o;
}
/* semitones that move fromKey onto toKey through the relative mode (E minor -> F major: E minor is G major's relative,
   G -> F is -2, so the E minor chords become D minor ones), the nearest way (-5..+6) */
function keyShift(fromKey,toKey){ if(!fromKey||!toKey) return 0; const f=fromKey.mode===toKey.mode?fromKey:relKey(fromKey); let d=mod(toKey.tonic-f.tonic,12); if(d>6) d-=12; return d; }
function transposeChords(chords,d){ return (chords||[]).map(c=>{ const o=Object.assign({},c); if(d&&o.root!=null) o.root=mod(o.root+d,12); if(d&&o.bass!=null) o.bass=mod(o.bass+d,12);
  if(d&&o.alt&&o.alt.root!=null) o.alt=Object.assign({},o.alt,{root:mod(o.alt.root+d,12)}); return o; }); }
/* fitChordsToKey(chords, fromKey, toKey) -> a moved copy (roots, bass notes and second guesses) */
function fitChordsToKey(chords,fromKey,toKey){ return transposeChords(chords,keyShift(fromKey,toKey)); }
const shiftWords=d=>{ if(!d) return ''; const n=Math.abs(d), w=n===1?'a semitone':n===2?'a tone':n+' semitones'; return (d>0?'up ':'down ')+w; };
/* one plan entry for a chord, with its notes worked out against the key (a 7th from the key where it fits) */
function chordEntry(c,key){
  if(!c||c.root==null||c.q==='none') return {none:true,root:null,pcs:[],sev:[],deg:null,q:'none'};
  const q=CHORD_IV[c.q]?c.q:'maj', sc=scaleOf(key), r=c.root, has=i=>sc.includes(mod(r+i,12)), deg=sc.indexOf(r);
  const tri=q==='7'||q==='maj7'?'maj':q==='m7'?'min':q, pcs=chordPcs(r,tri);
  const sev=q==='7'||q==='m7'||q==='maj7'?chordPcs(r,q):q==='maj'?pcs.concat(mod(r+(has(11)||!has(10)?11:10),12)):q==='min'||q==='sus4'||q==='sus2'?pcs.concat(mod(r+10,12)):q==='dim'?pcs.concat(mod(r+(has(10)?10:9),12)):pcs.slice();
  return {deg:deg<0?null:deg,root:r,pcs,sev,q,ninth:deg<0?mod(r+2,12):sc[(deg+1)%7],bass:c.bass!=null?c.bass:r};
}
/* the bars the chords cover (at least 1) */
const chordSpanBars=ch=>Math.max(1,Math.ceil((ch||[]).reduce((a,c)=>Math.max(a,(+c.b||0)+(+c.d||0)),0)/4-1e-6));
function chordPlanFrom(src,key){
  const ch=src.filter(c=>c&&c.d>0).slice().sort((a,b)=>a.b-b.b), nb=chordSpanBars(ch), S=nb*4, ents=ch.map(c=>chordEntry(c,key)), NONE=chordEntry(null,key);
  const idx=b=>{ const x=mod(b,S); for(let i=0;i<ch.length;i++){ if(ch[i].b<=x+1e-6&&x<ch[i].b+ch[i].d-1e-6) return i; } return -1; };
  const at=b=>{ const i=idx(b); return i<0?NONE:ents[i]; };
  const plan=[]; for(let bar=0;bar<nb;bar++) plan.push(at(bar*4+0.001));
  /* cut [b, b+d) where the chord changes (the span repeats) */
  const cuts=[...new Set(ch.flatMap(c=>[c.b,c.b+c.d]).map(x=>mod(x,S)).concat([0]))].sort((a,b)=>a-b);
  const segs=(b,d)=>{ const out=[], e=b+d; let x=b; let guard=0;
    while(x<e-1e-6&&guard++<64){ const base=Math.floor(x/S)*S, rel=x-base; let nx=base+S; for(const c of cuts){ if(c>rel+1e-6){ nx=base+c; break; } } nx=Math.min(nx,e); out.push({b:x,d:nx-x,c:at(x)}); x=nx; }
    return out.length?out:[{b,d,c:at(b)}]; };
  return {key,plan,at,segs,fromChords:true};
}
/* the song's chords as blocks over the whole loop, for the chord strip and for fixing: PROJ.chords repeated to the loop
   length, or Keys' progression written out one chord per bar (from 'keys'). Copies; changing them changes nothing. */
function triadQ(pcs){ if(!pcs||pcs.length<3) return 'maj'; const t=mod(pcs[1]-pcs[0],12), f=mod(pcs[2]-pcs[0],12); return f===6?'dim':t===3?'min':'maj'; }
function chordBlocks(){
  const L=PROJ.bars*4, src=Array.isArray(PROJ.chords)&&PROJ.chords.length?PROJ.chords:null;
  if(!src){ const {plan}=chordPlan(); return plan.slice(0,L/4).map((p,bar)=>({b:bar*4,d:4,root:p.root,q:triadQ(p.pcs),conf:1,from:'keys'})); }
  const ch=src.slice().sort((a,b)=>a.b-b.b), S=chordSpanBars(ch)*4, out=[];
  for(let off=0;off<Math.max(L,S);off+=S){ if(off>0&&off>=L) break; ch.forEach(c=>{ const b=c.b+off; if(off>0&&b>=L) return; const o=Object.assign({},c,{b}); if(off>0&&b+o.d>L) o.d=L-b; out.push(o); }); }
  return out;
}
/* "Em · C · G · D" (one name per block), for replies and the assistant's context */
const chordsText=(ch,sep=' · ')=>(ch||chordBlocks()).map(c=>chordName(c)).join(sep);
/* generated parts that follow the chords: bass, chords and melody tracks Keys made (never your own played or sung parts) */
const chordFollowers=()=>PROJ.tracks.filter(t=>t.gen&&t.kind==='notes'&&['bass','chords','melody'].includes(t.role));
/* a held instrument (pad, strings, choir, organ...) plays whole-bar pads, as add_chords does */
function heldChordStyle(inst,style){ const I=(typeof INST!=='undefined'&&INST.get(inst))||{}, st=STYLES[style]||STYLES.house; return /choir|strings|pad|organ|cello|brass|darkpad/i.test((inst||'')+' '+(I.name||''))&&!/pads|seventh|sustain/.test(st.chordStyle)?'pads':undefined; }
/* remake those parts on the current chords, each with its own seed (same rhythm and feel, new notes where the chords
   changed). Changes the tracks only: the caller saves (one undo step). Returns the names of the parts that moved. */
function followChords(){ const L=PROJ.bars*4, moved=[];
  chordFollowers().forEach(t=>{ const s=t.style||PROJ.style||'house', seed=t.seed||(typeof newSeed==='function'?newSeed():7);
    const ev=t.role==='bass'?genBass(s,L,seed):t.role==='chords'?genChords(s,L,seed,heldChordStyle(t.inst,s)):genMelody(L,seed,s);
    if(JSON.stringify(ev)!==JSON.stringify(t.events)) moved.push(t.name); t.events=ev; t.seed=seed; });
  return moved; }
const chordsRedraw=()=>{ saveProject(); if(typeof renderTracks==='function') renderTracks(); if(typeof uiLoop==='function') uiLoop(); };
/* setChord(bar, chord, {beat, bars}) fixes one chord. bar is 1-based (bar 1 = the first bar of the loop); chord is "Bm",
   {root, q} or "N.C."; beat (1-4, optional) fixes only from that beat to the end of that chord in the bar; bars (default 1)
   fixes several bars. Keys' progression is written out first when the song has no PROJ.chords yet. The bass, chords and
   melody Keys made follow with their own seeds; your own parts never move. One saveProject (one undo step).
   Returns {bar, chord, name, moved:[track names], text} or null (no such bar, or a chord it can't read). */
function setChord(bar,chord,o={}){
  const c=parseChord(chord), L=PROJ.bars*4, b0=(Math.round(+bar)-1)*4; if(!c||!(b0>=0&&b0<L)) return null;
  let list=chordBlocks(), w0=b0, w1=Math.min(L,b0+4*Math.max(1,Math.round(+o.bars||1)));
  if(o.beat!=null&&+o.beat>1){ const pos=b0+clamp(+o.beat-1,0,3.75), blk=list.find(x=>x.b<=pos+1e-6&&pos<x.b+x.d-1e-6); w0=pos; w1=Math.min(b0+4,blk?blk.b+blk.d:b0+4); }
  const out=[]; list.forEach(x=>{ const e=x.b+x.d; if(e<=w0+1e-6||x.b>=w1-1e-6){ out.push(x); return; } if(x.b<w0-1e-6) out.push(Object.assign({},x,{d:w0-x.b})); if(e>w1+1e-6) out.push(Object.assign({},x,{b:w1,d:e-w1})); });
  const nc={b:w0,d:w1-w0,root:c.root,q:c.q,conf:1,from:'user'}; if(c.bass!=null) nc.bass=c.bass; out.push(nc); out.sort((a,b)=>a.b-b.b);
  PROJ.chords=out; const moved=followChords(); chordsRedraw();
  const name=chordName(nc), bt=o.beat!=null&&+o.beat>1?`, from beat ${+o.beat}`:'', n=Math.round((w1-w0)/4);
  return {bar:Math.round(+bar),chord:nc,name,moved,text:`Bar ${Math.round(+bar)}${n>1?'-'+(Math.round(+bar)+n-1):''}${bt} is now ${name}${moved.length?'; '+moved.join(', ')+' follow'+(moved.length===1?'s':''):''}`}; }
/* setChords(list) replaces the song's chords ([{b, d, root, q}] or names one per bar: ["Am","F","C","G"]) and the generated
   parts follow (one undo step). clearChords() goes back to Keys' own progression. Both return the names of the parts that moved. */
function setChords(list,from='user'){ const ch=[];
  (list||[]).forEach((x,i)=>{ const c=parseChord(x); if(!c) return; if(x&&typeof x==='object'&&x.b!=null&&x.d>0) ch.push(Object.assign({},x,c,{conf:x.conf!=null?x.conf:1,from:x.from||from})); else ch.push(Object.assign({b:i*4,d:4},c,{conf:1,from})); });
  ch.sort((a,b)=>a.b-b.b); if(!ch.length) return null; PROJ.chords=ch; const moved=followChords(); chordsRedraw(); return moved; }
function clearChords(){ if(!PROJ.chords) return []; delete PROJ.chords; const moved=followChords(); chordsRedraw(); return moved; }
function nearestAbove(pc,lo){ let n=lo-mod(lo,12)+pc; if(n<lo) n+=12; return n; }
const PROGS={minor:[[0,5,2,6],[0,5,3,4],[0,6,5,6],[0,2,5,6],[0,3,6,5],[0,0,5,6],[0,5,0,6],[0,3,4,0]],major:[[0,4,5,3],[0,5,3,4],[0,3,4,4],[3,4,0,5],[0,4,3,4],[5,3,0,4]]};
function genBass(style,L,seed){
  const st=STYLES[style]||STYLES.house, P=chordPlan(), {plan}=P, ev=[], kick=pat((st.drums[36]||'x...x...x...x...'),0), r=rng(seed||5), pick=a=>a[Math.floor(r()*a.length)];
  const seqs=[[0,0,12,0],[0,12,0,7],[0,0,7,12],[0,12,10,7],[0,3,0,12]], seq=pick(seqs), off=pick([[2,6,10,14],[2,3,6,10,11,14],[2,6,7,10,14,15]]);
  for(let bar=0;bar<L/4;bar++){
    const c=plan[bar%plan.length], root=nearestAbove(c.none?0:c.bass!=null?c.bass:c.root,31), fifth=root+7, oct=root+12, base=bar*4;
    /* SE-7c: a note where the chord changes (or under no chord) moves with the chord, keeping its step from the root */
    const add=(s,n,d,v=0.9)=>P.segs(base+s/4,d).forEach(g=>{ if(g.c.none) return; ev.push({b:g.b,d:g.d,n:g.c===c?n:nearestAbove(g.c.bass!=null?g.c.bass:g.c.root,31)+(n-root),v}); });
    switch(st.bassStyle){
      case 'offbeat': [2,6,10,14].forEach((s,i)=>add(s,i%2?oct:root,0.4)); break;
      case 'rolling': [2,3,6,7,10,11,14,15].forEach(s=>add(s,root,0.2,s%2?0.7:0.95)); break;
      case 'root8': for(let s=0;s<16;s+=2) add(s,s===12?fifth:root,0.45,s%4?0.75:0.95); break;
      case 'dembow': [[0,root],[3,root],[6,fifth],[8,root],[11,root],[14,fifth]].forEach(([s,n])=>add(s,n,0.6)); break;
      case 'reese': add(0,root,3.8,0.9); break;
      case 'rolling16': for(let s=0;s<16;s++){ if(s%4===0) continue; const iv=seq[s%4]; add(s,root+iv,0.2,s%2?0.72:0.92); } break;
      case 'mhoffbeat': off.forEach((s,i)=>add(s,s%4===3?oct:root,s%4===2?0.45:0.2,s%4===2?0.9:0.65)); break;
      case 'techhouse': [[2,root],[3,root],[6,oct],[10,root],[11,fifth],[14,root]].forEach(([s,n],i)=>add(s,n,0.22,i%2?0.75:0.92)); break;
      case 'disco': for(let s=0;s<16;s+=2) add(s,s%4===0?root:oct,0.22,s%4===0?0.95:0.8); break;
      case 'logdrum': [[0,root],[3,root],[6,fifth],[10,root],[14,oct-5]].forEach(([s,n],i)=>add(s,n,0.4,0.9)); break;
      case 'slide808': { const kb=pat(st.drums[36],bar), hits=[]; for(let s=0;s<16;s++) if(kb[s]!=='.') hits.push(s);
        hits.forEach((s,i)=>{ const nx=i+1<hits.length?hits[i+1]:16; add(s,i===hits.length-1&&bar%2===1?root+(r()<0.5?7:12):root,Math.max(0.2,(nx-s)/4-0.05)); }); break; }
      case 'sync': [[0,root],[3,root],[6,fifth],[10,oct],[12,root]].forEach(([s,n])=>add(s,n,0.5)); break;
      case 'follow808': case 'follow': { const kb=pat(st.drums[36],bar), hits=[]; for(let s=0;s<16;s++) if(kb[s]!=='.') hits.push(s);
        hits.forEach((s,i)=>{ const nx=i+1<hits.length?hits[i+1]:16, d=st.bassStyle==='follow808'?(nx-s)/4-0.05:Math.min(1,(nx-s)/4-0.05); add(s,root,Math.max(0.2,d)); }); break; }
      default: [0,4,8,12].forEach(s=>add(s,root,0.9));
    }
  }
  return ev;
}
function voice(pcs,lo=55){ return pcs.map(pc=>nearestAbove(pc,lo)).sort((a,b)=>a-b); }
function genChords(style,L,seed,csOver){
  const st=STYLES[style]||STYLES.house, cs=csOver||st.chordStyle, P=chordPlan(), {plan}=P, ev=[], r=rng(seed||9), rh=[[0,0.75,1.5],[0,0.75,1.5,2.5,3.25],[0.5,1.25,2,2.75,3.5],[0,1.5,2.25,3]][Math.floor(r()*4)];
  for(let bar=0;bar<L/4;bar++){
    const c=plan[bar%plan.length], base=bar*4, vfor=x=>voice(st.chordStyle==='seventh'?x.sev:x.pcs,57), notes=vfor(c);
    /* SE-7c: a hit is cut where the chord changes and each piece plays that chord (none: a rest); ns can be a function of the chord */
    const hit=(b,d,v=0.75,ns=notes,strum=0)=>P.segs(base+b,d).forEach(g=>{ if(g.c.none) return; const nn=typeof ns==='function'?ns(g.c):g.c===c?ns:vfor(g.c); nn.forEach((n,i)=>ev.push({b:g.b+i*strum,d:g.d,n,v})); });
    switch(cs){
      case 'stabs': [0.5,1.5,2.5,3.5].forEach(b=>hit(b,0.3,0.8)); break;
      case 'pulse8': for(let s=0;s<8;s++) hit(s/2,0.45,s%2?0.6:0.78); break;
      case 'seventh': hit(0,3.8,0.65,notes,0.03); break;
      case 'pads': { const k=projectKey(); P.segs(base,3.95).forEach(g=>{ const x=g.c; if(x.none) return; const ninth=x.ninth!=null?x.ninth:(SCALES[k.mode][(x.deg+1)%7]+k.tonic)%12; [...voice(x.sev,55),nearestAbove(ninth,67)].forEach(n=>ev.push({b:g.b,d:g.d,n,v:0.55})); }); break; }
      case 'plucks332': rh.forEach((b,i)=>hit(b,0.35,i?0.65:0.8)); break;
      case 'arp': { const arOf=ns=>[...ns,ns[0]+12,(ns[1]!=null?ns[1]:ns[0]+7)+12], ar=arOf(notes); for(let s=0;s<16;s++){ const x=P.at(base+s/4); if(x.none) continue; const a2=x===c?ar:arOf(vfor(x)); ev.push({b:base+s/4,d:0.22,n:a2[s%a2.length],v:s%4?0.6:0.82}); } break; }
      case 'power': { const pw=x=>{ const r=nearestAbove(x.root,40); return [r,r+7,r+12]; }; for(let s=0;s<8;s++) hit(s/2,0.42,s%2?0.7:0.9,pw); break; }
      default: hit(0,3.9,0.65);
    }
  }
  return ev;
}
function genMelody(L,seed=11,style){
  const ms=(STYLES[style]||{}).melStyle;
  if(ms==='arp'||ms==='seq'){ const P=chordPlan(), {key,plan}=P, r=rng(seed), ev=[], shapes=[[0,1,2,1,3,2,1,2],[0,2,1,3,2,1,0,2],[2,1,0,1,2,3,2,1],[0,1,2,3,2,1,2,3]], shape=shapes[Math.floor(r()*shapes.length)];
    const step=ms==='seq'?0.25:0.5, gate=ms==='seq'?0.2:0.4;
    const tonesOf=x=>voice(x.pcs,64).concat(voice(x.pcs,64).map(n=>n+12));
    for(let bar=0;bar<L/4;bar++){ const c=plan[bar%plan.length], tones=c.none?[]:tonesOf(c);
      for(let i=0;i<4/step;i++){ if(ms==='arp'&&r()<0.12) continue; const x=P.at(bar*4+i*step); if(x.none) continue; const tt=x===c?tones:tonesOf(x); const n=tt[Math.min(tt.length-1,shape[i%shape.length]+(ms==='seq'&&i%8>=6?1:0))]; ev.push({b:bar*4+i*step,d:gate,n,v:i%4?0.62:0.82}); } }
    return ev; }
  const P=chordPlan(), {key,plan}=P, r=rng(seed), sc=scaleOf(key), ev=[], rhythms=[[0,1,1.5,2.5,3],[0,0.75,1.5,2,3],[0,1,2,2.5,3.5],[0.5,1,2,3]];
  /* SE-7c: over a chord outside the key, its own notes join the scale and the scale notes a semitone from them drop out
     (E major in A minor: G sharp in, G out); under no chord the melody rests */
  const notesOver=x=>{ const out=x.pcs.filter(pc=>!sc.includes(pc)); return out.length?sc.filter(pc=>!out.some(o=>Math.abs(mod(o-pc+6,12)-6)===1)).concat(out):sc; };
  let last=nearestAbove((plan.find(x=>!x.none)||{root:key.tonic}).root,67);
  for(let bar=0;bar<L/4;bar++){ const c0=plan[bar%plan.length], rh=rhythms[(bar+Math.floor(r()*4))%4];
    rh.forEach((b,i)=>{ const c=P.at(bar*4+b); if(c.none){ r(); return; } const ok=c===c0&&!P.fromChords?sc:notesOver(c), pool=[]; for(let n=62;n<=81;n++){ const pc=mod(n,12); if(ok.includes(pc)) pool.push({n,w:(c.pcs.includes(pc)?3:1)/(1+Math.abs(n-last)/2)}); }
      let tot=pool.reduce((a,p)=>a+p.w,0), x=r()*tot, pick=pool[0].n; for(const p of pool){ x-=p.w; if(x<=0){ pick=p.n; break; } }
      const nb=i+1<rh.length?rh[i+1]:4; ev.push({b:bar*4+b,d:Math.max(0.25,nb-b-0.1),n:pick,v:0.8}); last=pick; }); }
  return ev;
}
const ROLE_MIX={drums:{vol:0.9,lo:2,mid:0,hi:1},hats:{vol:0.55,lo:-15,mid:-2,hi:2},perc:{vol:0.6,lo:-8,mid:0,hi:1},bass:{vol:0.85,lo:3,mid:-1,hi:-4},chords:{vol:0.55,lo:-6,mid:0,hi:0},melody:{vol:0.72,lo:-4,mid:1,hi:1},voice:{vol:0.8,lo:-6,mid:1,hi:2},free:{vol:0.8,lo:0,mid:0,hi:0}};
const ROLE_NAME={drums:'Drums',hats:'Hi-hats',perc:'Percussion',bass:'Bassline',chords:'Chords',melody:'Melody',voice:'Voice',free:'Part'};

/* effects a producer would start with for each kind of part; club styles pump the bass and pads under the kick */
const CLUB_STYLES=['house','techno','melodichouse','melodictechno','progressive','deephouse','organichouse','techhouse','afro','amapiano','ukg','nudisco','dnb','liquid'];
const LUSH_STYLES=['melodichouse','melodictechno','progressive','organichouse','downtempo','deephouse','lofi','liquid','synthwave'];
function roleFx(role,style){
  const club=CLUB_STYLES.includes(style), lush=LUSH_STYLES.includes(style);
  switch(role){
    case 'drums': return {hp:28,comp:0.3,rev:lush?0.08:0.04};
    case 'bass': return {hp:28,lp:club?4200:6500,comp:0.4,drive:0.18,duck:club?0.75:0.3};
    case 'chords': return {hp:lush?170:120,comp:0.2,rev:lush?0.42:0.24,dly:lush?0.14:0.05,duck:club?0.55:0.15,width:0.65};
    case 'melody': return {hp:220,rev:lush?0.3:0.18,dly:lush?0.32:0.16,duck:club?0.3:0.08,width:0.4};
    case 'voice': return {hp:95,comp:0.45,rev:0.2,dly:0.08};
    default: return {hp:60,rev:0.15};
  }
}
