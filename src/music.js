
/* ---------- music theory and part generators ---------- */
const PC_NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10]};
const keyName=k=>k?`${PC_NAMES[k.tonic]} ${k.mode}`:'Auto';
const KS_MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88], KS_MIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
/* SE-7a: the honest key. detectKey v2 weighs each note by length x velocity (bass and bar-start notes count 1.5x) and
   needs 8+ notes over 4+ pitch classes. Each of the 24 keys scores: how much of the music sits in its scale (2x), the
   Krumhansl-Schmuckler profile match (0.5x), and tonic evidence: the bass root on downbeats, the first and last chord.
   Tested on 576 of our own generated loops (12 styles, 24 keys, with and without melody): 93% exact, the rest the relative key.
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
  const h=new Array(12).fill(0), pcs=new Set(), bars=new Map(); let tot=0;
  const isDown=b=>Math.abs(b-Math.round(b/4)*4)<0.07;
  notes.forEach(e=>{ const n=Math.round(e.n), pc=mod(n,12), low=!!e.bass||n<48, down=isDown(e.b||0);
    let w=clamp(e.d||0.5,0.1,4)*(e.v==null?0.8:clamp(e.v,0.05,1)); if(low) w*=1.5; if(down) w*=1.5; h[pc]+=w; tot+=w; pcs.add(pc);
    const bar=Math.floor((e.b||0)/4+0.02); if((e.b||0)-bar*4<1){ if(!bars.has(bar)) bars.set(bar,[]); bars.get(bar).push({n,pc,low,d:clamp(e.d||0.5,0.25,4)}); } });
  /* each bar's root: the lowest bass note starting in its first beat; with no bass, the root of the chord sounding there */
  const barRoot=list=>{ const lows=list.filter(x=>x.low); if(lows.length){ const m=lows.reduce((a,b)=>b.n<a.n?b:a); return {pc:m.pc,w:m.d}; }
    const has=new Set(list.map(x=>x.pc)); let best=null; has.forEach(r=>{ const sc=1+(has.has(mod(r+7,12))?1:0)+(has.has(mod(r+3,12))||has.has(mod(r+4,12))?0.9:0)-(has.has(mod(r+1,12))?0.3:0); if(!best||sc>best.sc||(sc===best.sc&&list.find(x=>x.pc===r).n<list.find(x=>x.pc===best.r).n)) best={r,sc}; });
    return best?{pc:best.r,w:Math.max(...list.map(x=>x.d))}:null; };
  bars.forEach((list,bar)=>bars.set(bar,barRoot(list)));
  if(!opts.loose&&(notes.length<KEY_MIN_NOTES||pcs.size<KEY_MIN_PCS)) return null;
  if(tot<=0) return null;
  const bassH=new Array(12).fill(0); let bassT=0; bars.forEach(x=>{ if(x){ bassH[x.pc]+=x.w; bassT+=x.w; } });
  const barNums=[...bars.keys()].filter(b=>bars.get(b)).sort((a,b)=>a-b), firstRoot=barNums.length?bars.get(barNums[0]).pc:null, lastRoot=barNums.length?bars.get(barNums[barNums.length-1]).pc:null;
  const mx=tot/12, corr=(p,r)=>{ const mp=p.reduce((a,b)=>a+b,0)/12; let a=0,b=0,c=0; for(let i=0;i<12;i++){ const x=h[(i+r)%12]-mx, y=p[i]-mp; a+=x*y; b+=x*x; c+=y*y; } return a/Math.sqrt(b*c||1); };
  const bassShare=pc=>bassT?bassH[pc]/bassT:0, fit=k=>scaleOf(k).reduce((a,pc)=>a+h[pc],0)/tot;
  const all=[]; for(let r=0;r<12;r++) [['major',KS_MAJ],['minor',KS_MIN]].forEach(([m,p])=>{ const k={tonic:r,mode:m};
    k.s=KEY_W.fit*fit(k)+KEY_W.ks*corr(p,r)+KEY_W.bass*bassShare(r)+KEY_W.first*(firstRoot===r)+KEY_W.last*(lastRoot===r); all.push(k); });
  all.sort((a,b)=>b.s-a.s);
  /* a near tie between a major and a minor key goes to the style's mode */
  let tie=null; if(all[0].s-all[1].s<0.005&&all[0].mode!==all[1].mode){ const sm=opts.styleMode||((typeof PROJ!=='undefined'&&PROJ&&STYLES[PROJ.style])?STYLES[PROJ.style].mode:null);
    if(sm&&all[1].mode===sm){ const t=all[0]; all[0]=all[1]; all[1]=t; tie='style'; } }
  const best=all[0], second=all[1];
  const conf=best.s>0?clamp((best.s-second.s)/best.s,0,1):0;
  const why=k=>{ const nm=PC_NAMES[k.tonic], bs=bassShare(k.tonic);
    if(bs>=0.3) return `the bass lands on ${nm}`;
    if(firstRoot===k.tonic&&lastRoot===k.tonic) return `starts and ends on ${nm}`;
    if(firstRoot===k.tonic) return `starts on ${nm}`;
    if(lastRoot===k.tonic) return `ends on ${nm}`;
    if(k!==best&&sameKey(relKey(k),best)) return `same notes as ${keyName(best)}`;
    return `${Math.round(fit(k)*100)}% of the notes fit`; };
  const cands=all.slice(0,3).map(k=>({tonic:k.tonic,mode:k.mode,why:why(k)}));
  let level=conf<0.02?1:conf<0.06?2:conf<0.12?3:4; if(notes.length<16) level=Math.min(level,2); if(opts.loose&&(notes.length<KEY_MIN_NOTES||pcs.size<KEY_MIN_PCS)) level=1;
  return {tonic:best.tonic,mode:best.mode,conf:Math.round(conf*1000)/1000,level,alt:{tonic:second.tonic,mode:second.mode},cands,why:cands[0].why,notes:notes.length,tie};
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
function pitchedNotes(p){ p=p||PROJ; const out=[]; (p.tracks||[]).forEach(t=>{ if(!pitchedTrack(t)) return; const bass=t.role==='bass'; (t.events||[]).forEach(e=>out.push(bass?{b:e.b,d:e.d,n:e.n,v:e.v,bass:true}:e)); }); return out; }
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
  const k=PROJ.key, notes=pitchedNotes(), det=detectKey(notes), out={key:null,from:'none',conf:0,level:0,word:'',alt:null,enough:!!det,cands:det?det.cands:[],notes:notes.length,hum:false,why:det?det.why:''};
  if(k&&k.tonic!=null&&KEY_HARD.includes(k.from||'you')) return Object.assign(out,{key:{tonic:k.tonic,mode:k.mode},from:k.from||'you',level:4,word:'',conf:1,heard:det&&!sameKey(det,k)?{tonic:det.tonic,mode:det.mode}:null});
  if(det) return Object.assign(out,{key:{tonic:det.tonic,mode:det.mode},from:'notes',conf:det.conf,level:det.level,word:KEY_WORDS[det.level],alt:det.alt,hum:!!(k&&k.hum&&sameKey(k,det))});
  if(k&&k.tonic!=null) return Object.assign(out,{key:{tonic:k.tonic,mode:k.mode},from:'notes',level:1,word:KEY_WORDS[1],hum:!!k.hum});
  return out;
}
/* the key every generator uses: the honest key, else the style's default (Keys pins that as "Keys picked" when it makes a part) */
function projectKey(){ return keyStatus().key||{tonic:9,mode:(STYLES[PROJ.style]||{}).mode||'minor'}; }
/* Keys is about to make a part on a song with no key yet: it picks one (fitting a few notes if there are any) and says so */
function keysPickKey(){ const st=keyStatus(); if(st.key) return st.key; const notes=pitchedNotes();
  const k=(notes.length>=3&&detectKey(notes,{loose:true}))||{tonic:9,mode:(STYLES[PROJ.style]||{}).mode||'minor'}; setKey({tonic:k.tonic,mode:k.mode},'keys'); return k; }
/* a sung, hummed or transcribed take: a key that was set stays; otherwise the take is heard with the song's other parts and
   gives only a soft key ("from your humming") once there are 8+ notes. A short hum never locks the key. Returns the key to shape it with. */
function takeKey(notes,detect=true){ const k=PROJ.key; if(k&&k.tonic!=null&&KEY_HARD.includes(k.from||'you')) return k;
  const det=detect?detectKey(pitchedNotes().concat(notes||[])):null; if(det){ setKey(Object.assign({hum:true},det),'notes'); return PROJ.key; } return k||null; }
/* one line for the chip, the assistant and exports */
function keyStatusText(st){ st=st||keyStatus(); if(!st.key) return 'no key yet';
  const tag={you:'set',keys:'Keys picked',vibe:'from the vibe',song:'from the song'}[st.from];
  if(tag) return `${keyName(st.key)} · ${tag}`;
  if(st.hum) return `${keyName(st.key)} · from your humming`;
  return `${keyName(st.key)} · ${st.word}${st.alt&&st.level<4?' · or '+keyName(st.alt):''}`; }
/* for the AI: what the app knows about the key, honestly */
function keyContext(st){ st=st||keyStatus(); if(!st.key) return `no key yet (only ${st.notes} pitched notes; nothing to work it out from)`;
  const dj=` (DJ key ${djKey(st.key)})`;
  if(st.from==='you') return `${keyName(st.key)}${dj}, set by the user`;
  if(st.from==='keys') return `${keyName(st.key)}${dj}, picked by Keys for the first part (the user didn't choose it)${st.heard?'; their notes sound more like '+keyName(st.heard):''}`;
  if(st.from==='vibe') return `${keyName(st.key)}${dj}, from the vibe's artist`;
  if(st.from==='song') return `${keyName(st.key)}${dj}, from a song the user brought in`;
  return `${keyName(st.key)}${dj}, worked out from the user's notes${st.hum?' (their humming)':''}: ${st.word}${st.alt?', could also be '+keyName(st.alt):''}${st.why?'; '+st.why:''}`; }
function melodyNotes(){ const out=[]; PROJ.tracks.forEach(t=>{ if(t.kind==='notes' && (t.role==='melody')) t.events.forEach(e=>out.push(e)); }); return out; }
function chordPlan(){
  const key=projectKey(), L=PROJ.bars*4, bars=L/4, mel=melodyNotes(), plan=[];
  const prog=(PROJ.prog&&PROJ.prog.length)?PROJ.prog:(key.mode==='minor'?[0,5,2,6]:[0,4,5,3]);
  for(let b=0;b<bars;b++){
    const inBar=mel.filter(e=>e.b>=b*4&&e.b<b*4+4);
    let deg=prog[b%prog.length];
    if(inBar.length && !PROJ.progLocked){ let best=-1; for(let d=0;d<7;d++){ if((key.mode==='major'&&d===6)||(key.mode==='minor'&&d===1)) continue;
      const pcs=triad(key,d); let s=(d===0?0.3:d===3||d===4?0.15:0); inBar.forEach(e=>{ if(pcs.includes(mod(Math.round(e.n),12))) s+=(e.d||0.5); }); if(s>best){ best=s; deg=d; } } }
    plan.push({deg,root:triad(key,deg)[0],pcs:triad(key,deg),sev:seventh(key,deg)});
  }
  return {key,plan};
}
function nearestAbove(pc,lo){ let n=lo-mod(lo,12)+pc; if(n<lo) n+=12; return n; }
const PROGS={minor:[[0,5,2,6],[0,5,3,4],[0,6,5,6],[0,2,5,6],[0,3,6,5],[0,0,5,6],[0,5,0,6],[0,3,4,0]],major:[[0,4,5,3],[0,5,3,4],[0,3,4,4],[3,4,0,5],[0,4,3,4],[5,3,0,4]]};
function genBass(style,L,seed){
  const st=STYLES[style]||STYLES.house, {plan}=chordPlan(), ev=[], kick=pat((st.drums[36]||'x...x...x...x...'),0), r=rng(seed||5), pick=a=>a[Math.floor(r()*a.length)];
  const seqs=[[0,0,12,0],[0,12,0,7],[0,0,7,12],[0,12,10,7],[0,3,0,12]], seq=pick(seqs), off=pick([[2,6,10,14],[2,3,6,10,11,14],[2,6,7,10,14,15]]);
  for(let bar=0;bar<L/4;bar++){
    const c=plan[bar%plan.length], root=nearestAbove(c.root,31), fifth=root+7, oct=root+12, base=bar*4;
    const add=(s,n,d,v=0.9)=>ev.push({b:base+s/4,d,n,v});
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
  const st=STYLES[style]||STYLES.house, cs=csOver||st.chordStyle, {plan}=chordPlan(), ev=[], r=rng(seed||9), rh=[[0,0.75,1.5],[0,0.75,1.5,2.5,3.25],[0.5,1.25,2,2.75,3.5],[0,1.5,2.25,3]][Math.floor(r()*4)];
  for(let bar=0;bar<L/4;bar++){
    const c=plan[bar%plan.length], base=bar*4, notes=voice(st.chordStyle==='seventh'?c.sev:c.pcs,57);
    const hit=(b,d,v=0.75,ns=notes,strum=0)=>ns.forEach((n,i)=>ev.push({b:base+b+i*strum,d,n,v}));
    switch(cs){
      case 'stabs': [0.5,1.5,2.5,3.5].forEach(b=>hit(b,0.3,0.8)); break;
      case 'pulse8': for(let s=0;s<8;s++) hit(s/2,0.45,s%2?0.6:0.78); break;
      case 'seventh': hit(0,3.8,0.65,notes,0.03); break;
      case 'pads': { const k=projectKey(), ninth=(SCALES[k.mode][(c.deg+1)%7]+k.tonic)%12; [...voice(c.sev,55),nearestAbove(ninth,67)].forEach(n=>ev.push({b:base,d:3.95,n,v:0.55})); break; }
      case 'plucks332': rh.forEach((b,i)=>hit(b,0.35,i?0.65:0.8)); break;
      case 'arp': { const ar=[...notes,notes[0]+12,notes[1]+12]; for(let s=0;s<16;s++) ev.push({b:base+s/4,d:0.22,n:ar[s%ar.length],v:s%4?0.6:0.82}); break; }
      case 'power': { const r=nearestAbove(c.root,40); for(let s=0;s<8;s++) hit(s/2,0.42,s%2?0.7:0.9,[r,r+7,r+12]); break; }
      default: hit(0,3.9,0.65);
    }
  }
  return ev;
}
function genMelody(L,seed=11,style){
  const ms=(STYLES[style]||{}).melStyle;
  if(ms==='arp'||ms==='seq'){ const {key,plan}=chordPlan(), r=rng(seed), ev=[], shapes=[[0,1,2,1,3,2,1,2],[0,2,1,3,2,1,0,2],[2,1,0,1,2,3,2,1],[0,1,2,3,2,1,2,3]], shape=shapes[Math.floor(r()*shapes.length)];
    const step=ms==='seq'?0.25:0.5, gate=ms==='seq'?0.2:0.4;
    for(let bar=0;bar<L/4;bar++){ const c=plan[bar%plan.length], tones=voice(c.pcs,64).concat(voice(c.pcs,64).map(n=>n+12));
      for(let i=0;i<4/step;i++){ if(ms==='arp'&&r()<0.12) continue; const n=tones[shape[i%shape.length]+(ms==='seq'&&i%8>=6?1:0)]; ev.push({b:bar*4+i*step,d:gate,n,v:i%4?0.62:0.82}); } }
    return ev; }
  const {key,plan}=chordPlan(), r=rng(seed), sc=scaleOf(key), ev=[], rhythms=[[0,1,1.5,2.5,3],[0,0.75,1.5,2,3],[0,1,2,2.5,3.5],[0.5,1,2,3]];
  let last=nearestAbove(plan[0].root,67);
  for(let bar=0;bar<L/4;bar++){ const c=plan[bar%plan.length], rh=rhythms[(bar+Math.floor(r()*4))%4];
    rh.forEach((b,i)=>{ const pool=[]; for(let n=62;n<=81;n++){ const pc=mod(n,12); if(sc.includes(pc)) pool.push({n,w:(c.pcs.includes(pc)?3:1)/(1+Math.abs(n-last)/2)}); }
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
