
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
  const prog=key.mode==='minor'?[0,5,2,6]:[0,4,5,3];
  for(let b=0;b<bars;b++){
    const inBar=mel.filter(e=>e.b>=b*4&&e.b<b*4+4);
    let deg=prog[b%prog.length];
    if(inBar.length){ let best=-1; for(let d=0;d<7;d++){ if((key.mode==='major'&&d===6)||(key.mode==='minor'&&d===1)) continue;
      const pcs=triad(key,d); let s=(d===0?0.3:d===3||d===4?0.15:0); inBar.forEach(e=>{ if(pcs.includes(mod(Math.round(e.n),12))) s+=(e.d||0.5); }); if(s>best){ best=s; deg=d; } } }
    plan.push({deg,root:triad(key,deg)[0],pcs:triad(key,deg),sev:seventh(key,deg)});
  }
  return {key,plan};
}
function nearestAbove(pc,lo){ let n=lo-mod(lo,12)+pc; if(n<lo) n+=12; return n; }
function genBass(style,L){
  const st=STYLES[style]||STYLES.house, {plan}=chordPlan(), ev=[], kick=pat((st.drums[36]||'x...x...x...x...'),0);
  for(let bar=0;bar<L/4;bar++){
    const c=plan[bar%plan.length], root=nearestAbove(c.root,31), fifth=root+7, oct=root+12, base=bar*4;
    const add=(s,n,d,v=0.9)=>ev.push({b:base+s/4,d,n,v});
    switch(st.bassStyle){
      case 'offbeat': [2,6,10,14].forEach((s,i)=>add(s,i%2?oct:root,0.4)); break;
      case 'rolling': [2,3,6,7,10,11,14,15].forEach(s=>add(s,root,0.2,s%2?0.7:0.95)); break;
      case 'root8': for(let s=0;s<16;s+=2) add(s,s===12?fifth:root,0.45,s%4?0.75:0.95); break;
      case 'dembow': [[0,root],[3,root],[6,fifth],[8,root],[11,root],[14,fifth]].forEach(([s,n])=>add(s,n,0.6)); break;
      case 'reese': add(0,root,3.8,0.9); break;
      case 'sync': [[0,root],[3,root],[6,fifth],[10,oct],[12,root]].forEach(([s,n])=>add(s,n,0.5)); break;
      case 'follow808': case 'follow': { const kb=pat(st.drums[36],bar), hits=[]; for(let s=0;s<16;s++) if(kb[s]!=='.') hits.push(s);
        hits.forEach((s,i)=>{ const nx=i+1<hits.length?hits[i+1]:16, d=st.bassStyle==='follow808'?(nx-s)/4-0.05:Math.min(1,(nx-s)/4-0.05); add(s,root,Math.max(0.2,d)); }); break; }
      default: [0,4,8,12].forEach(s=>add(s,root,0.9));
    }
  }
  return ev;
}
function voice(pcs,lo=55){ return pcs.map(pc=>nearestAbove(pc,lo)).sort((a,b)=>a-b); }
function genChords(style,L){
  const st=STYLES[style]||STYLES.house, {plan}=chordPlan(), ev=[];
  for(let bar=0;bar<L/4;bar++){
    const c=plan[bar%plan.length], base=bar*4, notes=voice(st.chordStyle==='seventh'?c.sev:c.pcs,57);
    const hit=(b,d,v=0.75,ns=notes,strum=0)=>ns.forEach((n,i)=>ev.push({b:base+b+i*strum,d,n,v}));
    switch(st.chordStyle){
      case 'stabs': [0.5,1.5,2.5,3.5].forEach(b=>hit(b,0.3,0.8)); break;
      case 'pulse8': for(let s=0;s<8;s++) hit(s/2,0.45,s%2?0.6:0.78); break;
      case 'seventh': hit(0,3.8,0.65,notes,0.03); break;
      case 'arp': { const ar=[...notes,notes[0]+12,notes[1]+12]; for(let s=0;s<16;s++) ev.push({b:base+s/4,d:0.22,n:ar[s%ar.length],v:s%4?0.6:0.82}); break; }
      case 'power': { const r=nearestAbove(c.root,40); for(let s=0;s<8;s++) hit(s/2,0.42,s%2?0.7:0.9,[r,r+7,r+12]); break; }
      default: hit(0,3.9,0.65);
    }
  }
  return ev;
}
function genMelody(L,seed=11){
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
