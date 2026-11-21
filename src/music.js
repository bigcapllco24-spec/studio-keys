
/* ---------- music theory and part generators ---------- */
const PC_NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10]};
const keyName=k=>k?`${PC_NAMES[k.tonic]} ${k.mode}`:'Auto';
const KS_MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88], KS_MIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
function detectKey(notes){
  if(!notes.length) return null; const h=new Array(12).fill(0); notes.forEach(e=>h[mod(Math.round(e.n),12)]+=e.d||0.5);
  let best=null; const corr=(p,r)=>{ const mx=h.reduce((a,b)=>a+b,0)/12, mp=p.reduce((a,b)=>a+b,0)/12; let a=0,b=0,c=0; for(let i=0;i<12;i++){ const x=h[(i+r)%12]-mx, y=p[i]-mp; a+=x*y; b+=x*x; c+=y*y; } return a/Math.sqrt(b*c||1); };
  for(let r=0;r<12;r++){ [['major',KS_MAJ],['minor',KS_MIN]].forEach(([m,p])=>{ const s=corr(p,r); if(!best||s>best.s) best={tonic:r,mode:m,s}; }); }
  return {tonic:best.tonic,mode:best.mode};
}
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
function projectKey(){ return PROJ.key||detectKey(melodyNotes())||{tonic:9,mode:(STYLES[PROJ.style]||{}).mode||'minor'}; }
function melodyNotes(){ const out=[]; PROJ.tracks.forEach(t=>{ if(t.kind==='notes' && (t.role==='melody')) t.events.forEach(e=>out.push(e)); }); return out; }
function chordPlan(){
  const key=projectKey(), L=PROJ.bars*4, bars=L/4, mel=melodyNotes(), plan=[];
  const prog=(PROJ.prog&&PROJ.prog.length)?PROJ.prog:(key.mode==='minor'?[0,5,2,6]:[0,4,5,3]);
  const hold=progHolds(PROJ.prog,bars);
  for(let b=0;b<bars;b++){
    const inBar=mel.filter(e=>e.b>=b*4&&e.b<b*4+4);
    let deg=prog[(hold?Math.floor(b/2):b)%prog.length];
    if(inBar.length && !PROJ.progLocked){ let best=-1; for(let d=0;d<7;d++){ if((key.mode==='major'&&d===6)||(key.mode==='minor'&&d===1)) continue;
      const pcs=triad(key,d); let s=(d===0?0.3:d===3||d===4?0.15:0); inBar.forEach(e=>{ if(pcs.includes(mod(Math.round(e.n),12))) s+=(e.d||0.5); }); if(s>best){ best=s; deg=d; } } }
    plan.push({deg,root:triad(key,deg)[0],pcs:triad(key,deg),sev:seventh(key,deg)});
  }
  return {key,plan};
}
function nearestAbove(pc,lo){ let n=lo-mod(lo,12)+pc; if(n<lo) n+=12; return n; }
/* progressions as scale degrees (0 = tonic). The second half of each list came with SE-4 from RES-4 (the owner's PML
   Chords For Life pack, scale degrees only, nothing copied): i VII iv VI, v VI i VII, VI III VII i, i v VI v, v VI VII i,
   VI i VII v; major IV I, I iii V V, I IV vi IV. */
const PROGS={minor:[[0,5,2,6],[0,5,3,4],[0,6,5,6],[0,2,5,6],[0,3,6,5],[0,0,5,6],[0,5,0,6],[0,3,4,0],
    [0,6,3,5],[4,5,0,6],[5,2,6,0],[0,4,5,4],[4,5,6,0],[5,0,6,4]],
  major:[[0,4,5,3],[0,5,3,4],[0,3,4,4],[3,4,0,5],[0,4,3,4],[5,3,0,4],[3,3,0,0],[0,2,4,4],[0,3,5,3]]};
/* in the pack these progressions hold each chord for 2 bars of an 8-bar loop; here they do the same in loops of 8 bars or
   more (a 4-bar loop plays one chord per bar). PROJ.progHold true/false overrides it. IV I is stored already held
   ([3,3,0,0] = IV IV I I), so it is not in the set (holding it again gave 4 bars per chord). */
const PROG_HOLD=new Set(['0,6,3,5','0,4,5,4','0,2,4,4','0,3,5,3']);
function progHolds(prog,bars){ if(!prog||prog.length!==4||bars<8) return false; if(PROJ.progHold!=null) return !!PROJ.progHold; return PROG_HOLD.has(prog.join()); }
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
/* ---------- open chord voicings (SE-4) ----------
   RES-4 measured the owner's PML chord pack (numbers only): a producer's chord is about 4 notes over 16 semitones
   (14-40), root and fifth low, the third and colour notes an octave up; 70% plain triads, 15% add9, 12% sevenths.
   A shape names the chord tones under the low root (low) and above it (up). The voicer puts the low root at C3 or
   above (so chords never sit on the bassline), then places the upper tones in the octave that moves least from the
   last chord, like a player's hands. Each new take picks a different shape, so "another one" changes the voicing too. */
const VOICE_LO=48, VOICE_TOP=81;
const VOICE_SHAPES={
  held:[{low:['R','5'],up:['R','3'],c:69},{low:['R','5'],up:['3','5'],c:72},{low:['R','5'],up:['R','3','5'],c:70},{low:['R'],up:['5','R','3'],c:72}],
  seventh:[{low:['R','5'],up:['7','3'],c:68},{low:['R'],up:['7','3','5'],c:70},{low:['R','5'],up:['3','7'],c:73}],
  short:[{low:['R','5'],up:['R','3'],c:69},{low:['R'],up:['5','R','3'],c:69},{low:['R','5'],up:['3','5'],c:71}]
};
const VOICE_LAST={};
function chordVoicer(key,fam,r){
  const shapes=VOICE_SHAPES[fam]||VOICE_SHAPES.held, n=shapes.length; let si=Math.floor(r()*n);
  if(si===VOICE_LAST[fam]) si=(si+1+Math.floor(r()*(n-1)))%n; VOICE_LAST[fam]=si;
  const shape=shapes[si], memo={}; let prevUp=null;
  /* colour per chord degree, the same each time it comes round: add9 about 15%, a 7th about 12%, otherwise plain.
     Only colours that sound right on that chord: a 9th a whole tone above the root, a 7th on chords with a perfect fifth.
     The 7th-chord styles (hip-hop, lo-fi, deep house, boom bap, amapiano, liquid) keep their flavour but follow the
     owner's D2 ("mostly plain, add9 or 7ths sometimes"): about half their chords get the 7th ('7', or '79' with a 9th
     on top), the rest are plain triads or plain add9. The split leans back towards half and half within each take,
     so a 4-chord loop doesn't come out all 7ths or all plain. */
  let n7=0, nPlain=0;
  const colourOf=c=>{ const rt=c.pcs[0], fifth=mod(c.pcs[2]-rt,12), nine=mod((SCALES[key.mode][(c.deg+1)%7]+key.tonic)%12-rt,12), x=r();
    if(fam==='seventh'){ const p7=Math.min(0.85,Math.max(0.15,0.5+0.35*(nPlain-n7))), y=r();
      if(x<p7){ n7++; return y<0.3&&nine===2?'79':'7'; } nPlain++; return y<0.3&&nine===2?'9':null; }
    if(x<0.15) return nine===2?'9':fifth===7?'7':null; if(x<0.27) return fifth===7?'7':nine===2?'9':null; return null; };
  return c=>{
    if(memo[c.deg]) return memo[c.deg];
    const rt=c.pcs[0], iv={R:0,'3':mod(c.pcs[1]-rt,12),'5':mod(c.pcs[2]-rt,12),'7':mod(c.sev[3]-rt,12),'9':2};
    let up=shape.up.slice(), col=colourOf(c);
    /* 7th-family shapes carry the 7th: a plain chord swaps it for the root an octave up, a plain add9 for the 9th */
    if(fam==='seventh'){ if(col==='79') col='9'; else { if(col!=='7') up=up.map(k=>k==='7'?(col==='9'?'9':'R'):k); col=null; } }
    if(col&&!up.includes(col)){ const j=up.indexOf('R'); if(j>=0) up[j]=col; else if(up.length<3) up.push(col); else { const k=up.indexOf('5'); if(k>=0) up[k]=col; } }
    const R0=nearestAbove(rt,VOICE_LO), low=shape.low.map(k=>R0+iv[k]), minUp=Math.max(R0+10,Math.max(...low)+3);
    const opts=up.map(k=>{ let p=minUp; while(mod(p-R0,12)!==iv[k]%12) p++; return [p,p+12]; });
    let best=null, bs=1e9;
    const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
    for(let top=VOICE_TOP;top<=VOICE_TOP+6&&!best;top+=3){
      const walk=(i,acc)=>{ if(i===opts.length){ const u=acc.slice().sort((a,b)=>a-b), hi=u[u.length-1], sp=hi-R0;
          if(hi>top||sp<14||sp>24||new Set(u).size<u.length) return;
          let s=prevUp?Math.abs(avg(u)-avg(prevUp))+0.5*Math.abs(hi-prevUp[prevUp.length-1]):Math.abs(avg(u)-shape.c);
          s+=Math.max(0,sp-19)*0.4; for(let k=1;k<u.length;k++) if(u[k]-u[k-1]===1) s+=1.5;
          if(s<bs){ bs=s; best=u; } return; }
        opts[i].forEach(p=>{ acc.push(p); walk(i+1,acc); acc.pop(); }); };
      walk(0,[]); }
    if(!best) return memo[c.deg]=voice(c.pcs,57);
    prevUp=best; return memo[c.deg]=low.concat(best).sort((a,b)=>a-b);
  };
}
function genChords(style,L,seed,csOver){
  const st=STYLES[style]||STYLES.house, cs=csOver||st.chordStyle, {key,plan}=chordPlan(), ev=[], r=rng(seed||9), rh=[[0,0.75,1.5],[0,0.75,1.5,2.5,3.25],[0.5,1.25,2,2.75,3.5],[0,1.5,2.25,3]][Math.floor(r()*4)];
  /* every style voices its chords open (owner, SE-4 D1); rock keeps its power chords, which are open already */
  const fam=cs==='seventh'?'seventh':/^(stabs|pulse8|plucks332|arp)$/.test(cs)?'short':'held', V=chordVoicer(key,fam,r);
  let held=[];
  for(let bar=0;bar<L/4;bar++){
    const c=plan[bar%plan.length], base=bar*4, notes=V(c), same=bar>0&&plan[(bar-1)%plan.length].deg===c.deg;
    const hit=(b,d,v=0.75,ns=notes,strum=0)=>ns.forEach((n,i)=>ev.push({b:base+b+i*strum,d,n,v}));
    /* a held pad over a chord that carries on (a 2-bar hold) is one long chord, not a re-attack */
    const sustain=(d,v)=>{ if(same&&held.length){ held.forEach(e=>e.d+=4); return; } held=notes.map(n=>({b:base,d,n,v})); held.forEach(e=>ev.push(e)); };
    switch(cs){
      case 'stabs': [0.5,1.5,2.5,3.5].forEach(b=>hit(b,0.3,0.8)); break;
      case 'pulse8': for(let s=0;s<8;s++) hit(s/2,0.45,s%2?0.6:0.78); break;
      case 'seventh': hit(0,3.8,0.65,notes,0.03); break;
      case 'pads': sustain(3.95,0.55); break;
      case 'plucks332': rh.forEach((b,i)=>hit(b,0.35,i?0.65:0.8)); break;
      case 'arp': { const ar=notes.length>=5?notes:[...notes,notes[1]+12]; for(let s=0;s<16;s++) ev.push({b:base+s/4,d:0.22,n:ar[s%ar.length],v:s%4?0.6:0.82}); break; }
      case 'power': { const r=nearestAbove(c.root,40); for(let s=0;s<8;s++) hit(s/2,0.42,s%2?0.7:0.9,[r,r+7,r+12]); break; }
      default: sustain(3.9,0.65);
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
