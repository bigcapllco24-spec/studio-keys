
/* ---------- song actions: the single place where the assistant (AI or offline) changes the song ---------- */
const HAT_NOTES=[42,44,46];
const DRUM_WORD={kick:36,bd:36,snare:38,sd:38,clap:39,rim:37,rimshot:37,hat:42,hihat:42,'hi-hat':42,'closed hat':42,closedhat:42,ch:42,'open hat':46,openhat:46,oh:46,'pedal hat':44,shaker:44,tom:47,'low tom':45,'mid tom':47,'high tom':50,crash:49,ride:51,cowbell:56,perc:37,conga:45,dhol:45};
function drumEvents(style,L,hats){
  const S=STYLES[style]||STYLES.house, ev=patternEvents(S.drums,L,{swing:S.swing||0,seed:3}), hk=hats===undefined?S.hats:hats;
  if(hk && hk!=='none' && HATS[hk]) ev.push(...patternEvents(HATS[hk],L,{swing:S.swing||0,trapRolls:hk==='trap',seed:5}));
  return ev;
}
function findTrack(ref){
  if(!ref) return null; if(typeof ref==='object') return ref;
  const r=String(ref).toLowerCase().trim().replace(/^the /,'');
  const roleOf={drum:'drums',drums:'drums',beat:'drums',kick:'drums',hats:'drums',hat:'drums','hi-hats':'drums',hihats:'drums',bass:'bass',bassline:'bass',chords:'chords',chord:'chords',pad:'chords',pads:'chords',melody:'melody',lead:'melody',hook:'melody',vocal:'voice',vocals:'voice',voice:'voice',hum:'melody'}[r];
  return PROJ.tracks.find(t=>t.id===ref)||PROJ.tracks.find(t=>t.name.toLowerCase()===r)||(roleOf&&[...PROJ.tracks].reverse().find(t=>t.role===roleOf))||PROJ.tracks.find(t=>t.name.toLowerCase().includes(r))||PROJ.tracks.find(t=>{ const I=INST.get(t.inst); return I&&I.name.toLowerCase().includes(r); });
}
function resolveInst(name,want){
  if(!name) return null; if(INST.has(name)) return name;
  const n=String(name).toLowerCase().replace(/[_-]+/g,' ').trim(); let hit=null;
  const ok=I=>!want||(want==='drums'?I.drums:want==='bass'?I.cat==='Bass':!I.drums);
  for(const id of ORDER){ const I=INST.get(id); if(!ok(I)) continue; const nm=I.name.toLowerCase(); if(nm===n||id.toLowerCase()===n.replace(/ /g,'')) return id; if(!hit&&(nm.includes(n)||n.includes(nm))) hit=id; }
  if(!hit) for(const [k,re] of INST_WORDS){ if(re.test(n) && INST.get(k) && ok(INST.get(k))) return k; }
  if(!hit && want==='drums' && /808/.test(n)) return 'kit808';
  return hit;
}
function parsePitch(p){
  if(typeof p==='number') return clamp(Math.round(p),0,127);
  const m=/^\s*([A-Ga-g])\s*([#b♯♭]?)\s*(-?\d)\s*$/.exec(String(p||'')); if(!m) return null;
  return (+m[3]+1)*12+{c:0,d:2,e:4,f:5,g:7,a:9,b:11}[m[1].toLowerCase()]+(m[2]==='#'||m[2]==='♯'?1:m[2]==='b'||m[2]==='♭'?-1:0);
}
function parseKey(k){
  if(!k) return null; if(typeof k==='object'&&k.tonic!=null) return k;
  const m=/^\s*([A-Ga-g])\s*([#b♯♭]|sharp|flat)?\s*(major|minor|maj|min|m)?\s*$/i.exec(String(k)); if(!m) return null;
  const base={c:0,d:2,e:4,f:5,g:7,a:9,b:11}[m[1].toLowerCase()]+(/^(#|♯|sharp)$/i.test(m[2]||'')?1:/^(b|♭|flat)$/i.test(m[2]||'')?-1:0);
  return {tonic:mod(base,12),mode:/^(minor|min|m)$/i.test(m[3]||'')?'minor':m[3]?'major':'minor'};
}
function normAction(a){
  if(!a||typeof a!=='object') return null; if(a.type) return a;
  const k=Object.keys(a)[0]; if(!k) return null; const v=a[k];
  if(v&&typeof v==='object'&&!Array.isArray(v)) return Object.assign({type:k},v);
  const field={tempo:'bpm',bars:'bars',key:'key',style:'style',hats:'pattern',transport:'do',remove:'track',save:'name',new_project:'name',rename:'name'}[k]||'value';
  return {type:k,[field]:v};
}
const L_=()=>PROJ.bars*4;
/* quantize grid: "1/8", "1/16", "1/8t" or "1/8 triplets", "8th", "16th", "quarter"; a number is beats (0.25 = 1/16), or a note value
   when it is 3..64 (8 = 1/8). Nothing said: 1/16. */
function gridBeats(g){ if(g==null||g==='') return 0.25;
  if(typeof g==='number'||/^\s*\d*\.?\d+\s*$/.test(String(g))){ const n=+g; return n>=3&&n<=64?4/n:n>0&&n<=4?n:0.25; }
  const s=String(g).toLowerCase(), trip=/\btriplets?\b|\btrip\b|\d\s*t\b/.test(s); let m=s.match(/1\s*\/\s*(\d+)/)||s.match(/\b(\d+)(?:st|nd|rd|th|s)?\b/);
  let den=m?+m[1]:/quarter|crotchet/.test(s)?4:/half/.test(s)?2:/sixteenth/.test(s)?16:/eighth|quaver/.test(s)?8:trip?8:16;
  if(![1,2,4,8,16,32,64].includes(den)) den=16; return 4/den*(trip?2/3:1); }
function gridName(q){ for(const d of [1,2,4,8,16,32,64]){ if(Math.abs(4/d-q)<1e-6) return `1/${d} notes`; if(Math.abs(8/(3*d)-q)<1e-6) return `1/${d} triplets`; } return `${Math.round(q*1000)/1000} beats`; }
/* dB words shared by the replies and the chips, so they always say the same number: 2.8, 3, 5 */
function dbTxt(x){ const r=Math.round(Math.abs(+x||0)*10)/10; return r%1?r.toFixed(1):String(r); }
/* the dB a fader really moves for a step (gain is vol², so dB/40 is the fader step; full volume caps it) */
function faderDb(v0,db){ const v1=clamp(v0*Math.pow(10,clamp(+db,-24,12)/40),0,1); return v0>0&&v1>0?40*Math.log10(v1/v0):0; }
/* the whole song moves every part by the same dB; going up stops when the loudest part reaches full volume */
function songDbStep(db){ db=clamp(+db||0,-24,12); if(db<=0) return db; const top=Math.max(0,...PROJ.tracks.map(t=>t.vol>0?t.vol:0)); return top>0?Math.min(db,40*Math.log10(1/top)):0; }
/* genre names the AI sometimes joins up ("afrohouse", "ukgarage"), mapped to the studio's styles */
const STYLE_ALIAS={afrohouse:'afro',afrotech:'afro',afrobeat:'afro',afrobeats:'afro',ukgarage:'ukg',garage:'ukg',ukg:'ukg',lofihiphop:'lofi',lofihouse:'deephouse',chillhouse:'deephouse',deeptech:'techhouse',minimalhouse:'techhouse',minimaltechno:'techno',drumandbass:'dnb',drumnbass:'dnb',melodic:'melodichouse',boombap:'boombap',hiphop:'hiphop'};
const pickStyle=s=>{ if(!s) return null; if(STYLES[s]) return s; const k=String(s).toLowerCase().replace(/[^a-z0-9& ]+/g,'').replace(/\s+/g,''); if(STYLES[k]) return k; if(STYLE_ALIAS[k]) return STYLE_ALIAS[k]; return (STYLE_WORDS.find(([key,re])=>re.test(' '+String(s).toLowerCase()+' '))||[])[0]||null; };
let BATCH={}; const LAST_TEXT={text:''}; const LAST_TAKE={part:null};
const newSeed=()=>1+Math.floor(Math.random()*2e9);
function tasteArtist(){ const p=TASTE.profile; if(!p||!p.artists) return null; for(const a of p.artists){ const A=findArtist(a); if(A) return artistAs(A,a); } return null; }
/* style + artist for a request: named artist > named style > the song's vibe > the person's taste > house */
function resolveVibe(a){
  /* the AI sometimes invents a reference; only switch away from the song's vibe when the user actually named it */
  const said=normName(LAST_TEXT.text||''), named_=x=>{ const k=normName(x||''); return !said||!k||said.includes(k.split(' ')[0])||(findArtist(x)&&findArtist(x).names.some(n=>said.includes(normName(n)))); };
  if(PROJ.ref&&(a.ref||a.artist||a.like)&&!named_(a.ref||a.artist||a.like)){ a=Object.assign({},a,{ref:undefined,artist:undefined,like:undefined}); }
  if(PROJ.style&&a.style&&pickStyle(a.style)!==PROJ.style&&said&&!STYLE_WORDS.some(([k,re])=>k===pickStyle(a.style)&&re.test(' '+said+' '))) a=Object.assign({},a,{style:undefined});
  /* the user named a genre and no artist ("afro house beat", "lofi hip hop beat"): the AI's artist pick is dropped and the genre is used,
     so Keys never says or saves an artist the user didn't name (QA, 16 Nov) */
  { const w=a.ref||a.artist||a.like, RA=w&&!/playlist/i.test(w)?findArtist(w):null, said_=LAST_TEXT.text||'', sw=typeof askText==='function'?askText(said_):' '+said_.toLowerCase()+' ', gen=RA&&said_?STYLE_WORDS.find(([k,re])=>re.test(sw)):null;
    if(gen&&!artistAlias(RA,said_)&&!(PROJ.ref&&findArtist(PROJ.ref)===RA)) a=Object.assign({},a,{ref:undefined,artist:undefined,like:undefined,style:a.style||gen[0]}); }
  let artist=findArtist(a.ref||a.artist||a.like); let named=artist?null:pickStyle(a.style); /* a known artist decides the style; the AI's style guess is ignored */
  const pl=typeof findPlaylist==='function'?findPlaylist(a.playlist||(/playlist/i.test(a.ref||a.like||'')?(a.ref||a.like):null)):null;
  if(pl){ artist=artist||pl.artists.map(n=>artistAs(findArtist(n),n)).find(Boolean)||null; named=named||pl.style||(artist&&artist.style)||null; }
  if(!artist&&!named&&PROJ.ref) artist=findArtist(PROJ.ref);
  if(!artist&&!named&&!PROJ.style) artist=tasteArtist();
  /* the name the user said: "like Black Coffee" shows and saves Black Coffee, not the first name of the table row (Keinemusik) */
  if(artist) artist=artistAs(artist,LAST_TEXT.text,a.ref||a.artist||a.like,PROJ.ref,artist.name);
  const s=named||(artist&&artist.style)||PROJ.style||tasteStyle()||'house';
  return {s,artist};
}
function adoptVibe(s,artist,a,noKey){
  if(a.style||artist||!PROJ.style) PROJ.style=s;
  if(artist&&(a.ref||a.artist||a.like)) PROJ.ref=artist.name;
  const b=+a.bpm; if(b&&!BATCH.tempo&&Math.abs(b-BATCH.startBpm)>0.5) setTempo(b); else if(!PROJ.tracks.length&&!BATCH.tempo&&!BATCH.vibe) setTempo(artist?artist.bpm:STYLES[s].bpm);
  if(!noKey&&!PROJ.key&&!BATCH.key&&artist&&!PROJ.tracks.some(t=>t.role!=='drums')) setKey(parseKey(artist.key));
}
function ensureProg(force){ if(PROJ.prog&&!force) return; const k=projectKey(), list=PROGS[k.mode]||PROGS.minor; let p, n=0; do{ p=list[Math.floor(Math.random()*list.length)]; n++; }while(force&&PROJ.prog&&n<9&&p.join()===PROJ.prog.join()); PROJ.prog=p.slice(); }
const HAT_KIND={'8':'8th','8ths':'8th',eighth:'8th',eighths:'8th','8th':'8th','16':'16th','16ths':'16th',sixteenth:'16th',sixteenths:'16th','16th':'16th',quarters:'quarter',quarter:'quarter','4':'quarter',offbeat:'offbeat',offbeats:'offbeat',shuffle:'shuffle16',shuffled:'shuffle16',shuffle16:'shuffle16',trap:'trap',rolls:'trap',drill:'drill',none:'none',off:'none'};
/* swing: a number (0..0.4, 0.333 = full triplet swing; above 1 it is a percent, 50 straight to 66 triplet), "58%",
   or words ("more", "less", "a bit more", "a bit less", "none"), stepped from the beat's current swing (curSwing).
   The user's own swing words win over the AI's number, once per request, so "less swing" always steps down. */
function swingOver(a,curSwing){
  if(BATCH.swing!=null) return a.swing==null?undefined:BATCH.swing;
  const said=typeof swingSaid==='function'?swingSaid(LAST_TEXT.text):null;
  const v=resolveSwing(said!=null?said:a.swing,curSwing); if(v!==undefined&&said!=null) BATCH.swing=v; return v; }
function grooveOver(a,curSwing){
  const o={kick:a.kick,back:a.back||(a.claps===true||a.clap===true?'clap':a.snare===true?'snare':undefined),open:a.open,shaker:a.shaker,ghost:a.ghost,swing:swingOver(a,curSwing),energy:a.energy,fill:a.fill,ride:a.ride};
  if(a.hats===false) o.hats='none'; else if(typeof a.hats==='string'){ const k=HAT_KIND[a.hats.toLowerCase()]||a.hats.toLowerCase(); if(k==='open') o.open=true; else if(k==='shaker') o.shaker=true; else o.hats=k; }
  const pw=[a.perc,a.percussion,a.congas===true?'congas':null].filter(x=>typeof x==='string').join(' ').toLowerCase();
  if(pw){ const set=[]; [[45,/conga|bongo|hand/],[37,/rim/],[47,/tom/],[56,/cowbell/],[50,/high tom|timbale/]].forEach(([n,re])=>{ if(re.test(pw)) set.push(n); }); if(set.length){ o.percSet=set; o.perc=set.length; } else o.perc=2; }
  else if(a.perc!=null) o.perc=clamp(Math.round(+a.perc),0,3);
  return o;
}
/* a new part is a new track; it replaces the last generated part of that kind only when asked (replace: true) */
function addPart(o,a){ const replace=a.replace===true||a.mode==='replace';
  if(replace){ const old=[...PROJ.tracks].reverse().find(t=>t.role===o.role&&t.kind==='notes'&&t.gen); if(old){ const t=addTrack(o,{replaceRole:o.role}); t.isNew=false; return t; } }
  if(o.name&&PROJ.tracks.some(t=>t.name===o.name)){ let k=2; while(PROJ.tracks.some(t=>t.name===o.name+' '+k)) k++; o.name=o.name+' '+k; }
  const t=addTrack(o); t.isNew=true; return t; }
function regenTrack(t,opts={}){
  if(!t||!t.gen) return null; const s=t.style||PROJ.style||'house', seed=opts.seed||newSeed();
  if(t.role==='drums'){ const rec=Object.assign({},t.recipe||grooveRecipe(s,findArtist(t.ref)),opts.recipe||{}); rec.energy=clamp(Math.round(+rec.energy||3),1,5); const g=makeGroove(rec,L_(),seed); Object.assign(t,{events:g.events,recipe:rec,seed,desc:g.desc}); return g.desc; }
  if(t.role==='bass'){ t.events=genBass(s,L_(),seed); t.seed=seed; return 'a new bassline'; }
  if(t.role==='chords'){ t.events=genChords(s,L_(),seed); t.seed=seed; return 'a new chord rhythm'; }
  if(t.role==='melody'){ t.events=genMelody(L_(),seed,s); t.seed=seed; return 'a new melody'; }
  return null;
}
const loadI=id=>{ const I=INST.get(id); if(I&&I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); return I; };
const ACT={
  vibe(a){ const {s,artist}=resolveVibe(a); if(!artist&&!pickStyle(a.style)) return; PROJ.style=s; if(artist) PROJ.ref=artist.name;
    if(!BATCH.tempo) setTempo(+a.bpm&&Math.abs(+a.bpm-BATCH.startBpm)>0.5?+a.bpm:(artist?artist.bpm:STYLES[s].bpm)); BATCH.vibe=true; const k=parseKey(a.key)||(artist?parseKey(artist.key):null); if(k&&!PROJ.key) setKey(k); ensureProg(true);
    return artist?`Vibe: ${artist.name}, ${artist.desc} (${CTRL.bpm} BPM, ${keyName(projectKey())})`:`Vibe: ${STYLES[s].name}, ${CTRL.bpm} BPM`; },
  add_drums(a){ const {s,artist}=resolveVibe(a); adoptVibe(s,artist,a,true);
    const rec=grooveRecipe(s,artist,grooveOver(a,grooveRecipe(s,artist).swing)), seed=+a.seed||newSeed();
    const kit=resolveInst(a.kit||a.instrument,'drums')||(artist&&artist.sounds.kit)||STYLES[s].kit, I=loadI(kit);
    const g=makeGroove(rec,L_(),seed); if(BATCH.swing!=null) BATCH.swingShown=true;
    addTrack({role:'drums',inst:kit,zone:'pads',gen:true,name:'Drums',events:g.events,recipe:rec,seed,style:s,ref:artist?artist.name:undefined,desc:g.desc},{replaceRole:'drums'});
    return `${artist?artist.name+'-style':STYLES[s].name} drums on ${I.name}: ${g.desc}`; },
  hats(a){ const kind=HAT_KIND[String(a.pattern||a.value||'8th').toLowerCase()]||String(a.pattern||a.value||'8th').toLowerCase();
    let t=findTrack('drums'); if(!t||!t.recipe){ return ACT.add_drums(Object.assign({},a,{hats:kind})); }
    const over=kind==='open'?{open:true}:kind==='shaker'?{shaker:true}:{hats:kind};
    regenTrack(t,{seed:t.seed,recipe:over}); return kind==='none'?'Hi-hats removed':`Hi-hats: ${t.desc}`; },
  groove(a){ const t=findTrack(a.track||'drums'); if(!t||t.role!=='drums') return;
    if(!t.recipe) return ACT.add_drums(a);
    const prev=+t.recipe.swing||0, over=grooveOver(a,prev); if(a.change!=null) over.energy=(t.recipe.energy||3)+Math.sign(+a.change);
    Object.keys(over).forEach(k=>over[k]===undefined&&delete over[k]);
    /* the swing was already set and shown by vary or add_drums in this request: no second chip */
    if(BATCH.swingShown&&Object.keys(over).join()==='swing'&&Math.abs(over.swing-prev)<0.001) return;
    regenTrack(t,{seed:a.fresh?undefined:t.seed,recipe:over}); BATCH.swingShown=over.swing!==undefined||BATCH.swingShown;
    if(over.swing===undefined) return `Groove: ${t.desc}`;
    const sw=swingWords(+t.recipe.swing||0,prev); return Object.keys(over).length>1?`${sw}; ${t.desc}`:sw; },
  vary(a){ const t=findTrack(a.track||'drums'); if(!t) return;
    if(!t.gen){ return `${t.name} is your own part, so I left it as it is`; }
    if(t.role==='chords'&&a.progression!==false){ ensureProg(true); PROJ.tracks.filter(x=>x.gen&&(x.role==='bass'||x.role==='chords'||x.role==='melody')).forEach(x=>regenTrack(x)); return `New chord progression (${PROJ.prog.map(d=>['i','ii','iii','iv','v','vi','vii'][d]).join('–')}); bass and melody follow it`; }
    /* "another one with less swing": the new take gets the new swing, so its chip shows the real amount (one chip, not two) */
    if(t.role==='drums'&&t.recipe&&typeof swingSaid==='function'&&swingSaid(LAST_TEXT.text)!=null){ const prev=+t.recipe.swing||0, v=swingOver({},prev);
      if(v!==undefined){ const d=regenTrack(t,{recipe:{swing:v}}); BATCH.swingShown=true; return d?`${swingWords(v,prev)}; ${t.name}: ${d}`:null; } }
    const d=regenTrack(t); return d?`${t.name}: ${d}`:null; },
  add_bass(a){ a=Object.assign({},a,{instrument:instSaid(a)}); const {s,artist}=resolveVibe(a); adoptVibe(s,artist,a); ensureProg(); const id=resolveInst(a.instrument,'bass')||(artist&&artist.sounds.bass)||STYLES[s].bass, I=loadI(id), seed=+a.seed||newSeed();
    addPart({role:'bass',inst:id,gen:true,name:'Bassline',events:genBass(s,L_(),seed),seed,style:s,ref:artist?artist.name:undefined},Object.assign({},a,{replace:a.replace!==false&&!a.new})); return `Bassline on ${I.name} in ${keyName(projectKey())}`; },
  add_chords(a){ a=Object.assign({},a,{instrument:instSaid(a)}); const {s,artist}=resolveVibe(a); adoptVibe(s,artist,a); ensureProg(); const id=resolveInst(a.instrument,'keys')||(artist&&artist.sounds.chords)||STYLES[s].chords, I=loadI(id), seed=+a.seed||newSeed();
    const held=/choir|strings|pad|organ|cello|brass|darkpad/i.test(id+' '+I.name), cs=held&&!/pads|seventh|sustain/.test(STYLES[s].chordStyle)?'pads':undefined;
    const t=addPart({role:'chords',inst:id,gen:true,name:a.instrument?I.name:'Chords',events:genChords(s,L_(),seed,cs),seed,style:s,ref:artist?artist.name:undefined},a); return `${t.name} (${t.isNew?'new track':'replaced'}) on ${I.name} in ${keyName(projectKey())}`; },
  add_melody(a){ a=Object.assign({},a,{instrument:instSaid(a)}); const {s,artist}=resolveVibe(a); adoptVibe(s,artist,a); ensureProg(); const id=resolveInst(a.instrument,'keys')||(artist&&artist.sounds.lead)||STYLES[s].lead||'lead', I=loadI(id), seed=+a.seed||newSeed();
    const t=addPart({role:'melody',inst:id,gen:true,name:a.instrument?I.name:'Melody',events:genMelody(L_(),seed,s),seed,style:s,ref:artist?artist.name:undefined},a); return `${t.name} (${t.isNew?'new track':'replaced'}) on ${I.name}`; },
  tempo(a){ const b=+a.bpm||+a.value; if(!b) return; setTempo(b); BATCH.tempo=true; return `Tempo ${CTRL.bpm} BPM`; },
  bars(a){ setBars(+a.bars||+a.value||4); return `${PROJ.bars} bars`; },
  key(a){ const k=parseKey(a.key||a.value); if(!k) return; setKey(k); BATCH.key=true; return `Key ${keyName(k)}`; },
  style(a){ const s=pickStyle(a.style||a.value)||(findArtist(a.style||a.value)||{}).style; if(!s) return; PROJ.style=s; if(a.keepTempo!==true && !a.bpm) setTempo(STYLES[s].bpm); return `${STYLES[s].name} style`; },
  drum_pattern(a){ const rows=a.rows||a.pattern||{}; const spec={};
    for(const [name,str] of Object.entries(rows)){ const n=DRUM_WORD[String(name).toLowerCase()]||parsePitch(name)||(+name||null); if(n&&typeof str==='string') spec[n]=str.replace(/[^xo.|X-]/g,'').replace(/X/g,'x').replace(/-/g,'.'); }
    if(!Object.keys(spec).length) return; const s=pickStyle(a.style)||PROJ.style||'house', kit=resolveInst(a.kit,'drums')||(findTrack('drums')||{}).inst||STYLES[s].kit;
    addTrack({role:'drums',inst:kit,zone:'pads',gen:true,name:'Drums',events:patternEvents(spec,L_(),{seed:9})},{replaceRole:'drums'}); return 'Custom drum pattern'; },
  notes(a){ const list=(a.notes||[]).map(n=>({b:Math.max(0,+n.beat||+n.b||0),d:Math.max(0.1,+n.len||+n.length||+n.d||0.5),n:parsePitch(n.pitch!=null?n.pitch:n.note),v:clamp((+n.vel||+n.velocity||96)/127,0.1,1)})).filter(e=>e.n!=null&&e.b<L_());
    if(!list.length) return; let t=a.replace===false?null:findTrack(a.track);
    const role=a.role||(t&&t.role)||(/bass/i.test(a.track||'')?'bass':/chord|pad/i.test(a.track||'')?'chords':'melody');
    const inst=resolveInst(a.instrument,role==='bass'?'bass':'keys')||(t&&t.inst)||(role==='bass'?'bass':'piano'); const I=INST.get(inst); if(I&&I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{});
    if(t && a.mode!=='add'){ t.events=list; t.inst=inst; } else if(t){ t.events.push(...list); } else t=addTrack({role,inst,name:a.track&&!/^(melody|bass|chords)$/i.test(a.track)?String(a.track).slice(0,30):ROLE_NAME[role],events:list});
    return `${list.length} notes on ${t.name}`; },
  instrument(a){ const t=findTrack(a.track); if(!t||t.kind!=='notes') return; const id=resolveInst(a.instrument||a.value,t.role==='drums'?'drums':t.role==='bass'?'bass':null); if(!id) return;
    const I=INST.get(id); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); t.inst=id; return `${t.name} now on ${I.name}`; },
  mix(a){ const sw=a.mute!=null&&a.volume==null&&a.change==null&&a.db==null&&songArranged()&&secSaid(); /* "drop the drums in the outro" sent as a mute: that is one section, not the whole song */
    if(sw) return ACT.parts({section:sw,[a.mute?'out':'in']:[a.track]});
    const ref=String(a.track||'').toLowerCase().trim();
    /* the whole song ("turn it down a bit", "make it louder"): every part's fader moves by the same dB, so it is part of the song and
       Undo restores it exactly. The master fader itself is a studio setting outside Undo, so relative moves on "master" come here too. */
    if(/^(all|song|the song|whole song|the whole song|everything|mix|the mix)$/.test(ref)||ref==='master'&&a.volume==null&&(a.db!=null||a.change!=null)){
      const db=a.db!=null?+a.db:40*Math.log10(clamp(0.8+(+a.change||0)/100,0.05,1)/0.8); if(!isFinite(db)||!db||!PROJ.tracks.length) return;
      const got=songDbStep(db); if(Math.abs(got)<0.05) return `Whole song: ${db>0?'the loudest part is already at full volume':'already silent'}`;
      const k=Math.pow(10,got/40); PROJ.tracks.forEach(t=>{ if(t.vol>0) chSet(t.id,'vol',clamp(t.vol*k,0,1)); });
      return `Whole song: ${got>0?'up':'down'} ${dbTxt(got)} dB (every part, same balance)`; }
    const id=['master','keys','pads'].includes(ref)?ref:(findTrack(a.track)||{}).id; if(!id) return; const cfg=chCfg(id); const out=[];
    if(a.volume!=null){ chSet(id,'vol',clamp(+a.volume/100,0,1)); out.push(`volume ${Math.round(cfg.vol*100)}`); }
    if(a.change!=null){ chSet(id,'vol',clamp(cfg.vol+(+a.change)/100,0,1)); out.push(`volume ${Math.round(cfg.vol*100)}`); }
    /* db: a relative fader move in decibels ("a bit quieter" = -3); the fader's gain is vol² so dB/40 is the fader step */
    if(a.db!=null&&isFinite(+a.db)&&+a.db){ const v0=cfg.vol, v1=clamp(v0*Math.pow(10,clamp(+a.db,-24,12)/40),0,1); chSet(id,'vol',v1); const got=v0>0&&v1>0?40*Math.log10(v1/v0):0;
      out.push(Math.abs(got)<0.05?(+a.db>0?'already at full volume':'already silent'):`${got>0?'up':'down'} ${dbTxt(got)} dB (volume ${Math.round(v1*100)})`); }
    /* eq: relative EQ steps in dB, {low:+3} ("more kick" on the drums), {high:-3} ("softer hats") */
    if(a.eq&&typeof a.eq==='object') ['low','mid','high'].forEach(b=>{ const d=+a.eq[b]; if(!d||!isFinite(d)) return; const f={low:'lo',mid:'mid',high:'hi'}[b], v0=Math.round(+cfg[f]||0), v=clamp(Math.round(v0+d),-15,15); chSet(id,f,v); out.push(v===v0?`${b} EQ already at ${v>0?'+':''}${v} dB`:`${b} EQ ${v>v0?'+':'-'}${Math.abs(v-v0)} dB (now ${v>0?'+':''}${v})`); });
    ['low','mid','high'].forEach(b=>{ if(a[b]!=null){ chSet(id,{low:'lo',mid:'mid',high:'hi'}[b],clamp(+a[b],-15,15)); out.push(`${b} ${a[b]>0?'+':''}${a[b]} dB`); } });
    if(a.mute!=null){ cfg.mute=!!a.mute; chApply(id); out.push(a.mute?'muted':'unmuted'); }
    if(a.solo!=null){ cfg.solo=!!a.solo; refreshTrackGains(); out.push(a.solo?'solo':'solo off'); }
    return `${chName(id)}: ${out.join(', ')||'unchanged'}`; },
  fx(a){ const want=String(a.effect||'').toLowerCase().replace(/[-_]/g,' '); const type=Object.keys(FX_LIB).find(k=>FX_LIB[k].name.toLowerCase()===want||k===want.replace(/ /g,''))||Object.keys(FX_LIB).find(k=>FX_LIB[k].name.toLowerCase().includes(want)||want.includes(k));
    if(!type) return; let i=FX.slots.findIndex(s=>s.type===type); if(i<0){ i=7; FX.setType(i,type); } FX.set(i,clamp((+a.amount)/100,0,1)); return `${FX_LIB[type].name} ${Math.round(FX.slots[i].amount*100)}%`; },
  remove(a){ const ref=a.track||a.value; if(!PROJ.tracks.some(t=>t.name.toLowerCase()===String(ref||'').toLowerCase())&&songArranged()&&findSec(ref)) return; /* "remove the second drop" sent as a track: the section action does it */
    const t=findTrack(ref); if(!t) return;
    /* "remove the reverb from the chords" turns the reverb off; the part stays (QA, 16 Nov: the AI or the parser deleted the track) */
    const fw=fxOffSaid(LAST_TEXT.text,t); if(fw) return ACT.track_fx({track:t.id,effect:fw,remove:true});
    removeTrack(t.id); return `Removed ${t.name}`; },
  quantize(a){ const t=findTrack(a.track); if(!t||t.kind==='audio'||!t.events) return; const q=gridBeats(a.grid), L=L_(); let moved=0;
    t.events.forEach(e=>{ let b=Math.round(e.b/q)*q; if(b>=L&&e.b<L) b=0; if(Math.abs(b-e.b)>1e-6) moved++; e.b=b; e.d=Math.max(q,Math.round(e.d/q)*q); });
    return `Quantized ${t.name} to ${gridName(q)} (${moved} of ${t.events.length} notes moved)`; },
  transpose(a){ const t=findTrack(a.track); if(!t||(INST.get(t.inst)||{}).percussive) return; const s=Math.round(+a.semitones||0); t.events.forEach(e=>e.n+=s); return `${t.name} ${s>0?'up':'down'} ${Math.abs(s)}`; },
  transport(a){ const d=String(a.do||a.value||'').toLowerCase(); if(/stop|pause/.test(d)){ loopStop(); return 'Stopped'; }
    /* "play from the second drop": from = a section (name, "drop 2", "second drop", number in the list) or a bar ("bar 33") */
    if(a.from!=null&&a.from!==''&&!/rec/.test(d)){ if(!songArranged()){ loopPlay(); return 'Playing'; } const f=String(a.from).toLowerCase(), bar=/^bar\s*(\d+)$/.exec(f);
      if(bar||/^(start|top|beginning|the start|the top|the beginning|1)$/.test(f)){ songPlay({from:bar?+bar[1]:1}); return bar?`Playing from bar ${bar[1]}`:'Playing the song from the start'; }
      const s=findSec(a.from); if(!s){ songNote(`I couldn’t find “${a.from}” in the song.`); return; } songPlay({from:s}); return `Playing from ${s.name}`; } if(/rec/.test(d)){ recordPress(); return 'Recording'; } if(PROJ.tracks.length && !TR.running){ loopPlay(); return 'Playing'; } },
  sing(a){ const raw=String(a.part||a.role||a.track||'melody').toLowerCase(); const part=/voice|audio|note/.test(raw)&&!/melody/.test(raw)?'voice':/bass/.test(raw)?'bass':/chord|pad|harmon/.test(raw)?'chords':'melody';
    BATCH.take=part; return part==='voice'?`Recording a voice note after the count-in: ${PROJ.bars} bars`:`Sing the ${part==='bass'?'bassline':part==='chords'?'chord roots (one note per chord)':'melody'} after the count-in: ${PROJ.bars} bars`; },
  convert(a){ const t=findTrack(a.track||'melody'); if(!t||t.kind!=='notes'||(INST.get(t.inst)||{}).percussive) return; const to=/bass/.test(a.to||'')?'bass':/chord|pad/.test(a.to||'')?'chords':'melody';
    t.events=shapePart(t.events,to,projectKey()); t.role=to; t.inst=partInst(to); loadI(t.inst); t.gen=false; t.name=(to==='bass'?'Bassline':to==='chords'?'Chords':'Melody')+' (from '+t.name.replace(/^(Sung|Hummed) /,'').toLowerCase()+')';
    return `${t.name} on ${INST.get(t.inst).name}`; },
  again(a){ const p=LAST_TAKE.part; if(!p) return; BATCH.take=p; return `Again: sing the ${p} after the count-in`; },
  track_fx(a){ const t=findTrack(a.track); if(!t) return; const w=String(a.effect||'').toLowerCase();
    /* "remove the effects from the chords": every effect off, the part stays */
    if(/^(all|effects?|fx|all effects)$/.test(w.trim())&&(a.remove||a.amount===0)){ t.fx={}; refreshTrackGains(); return `Effects off on ${t.name}`; }
    /* the AI sometimes sends EQ as an effect ({effect:"eq",amount:{high:-3}}): that is a relative EQ step on the mixer */
    if(/^(eq|equali[sz](er|ation)?)$/.test(w.trim())){ const eq=a.eq||(a.amount&&typeof a.amount==='object'?a.amount:null)||(a.band&&isFinite(+(a.change??a.amount))?{[String(a.band).toLowerCase()]:+(a.change??a.amount)}:null); return eq?ACT.mix({track:t.id,eq}):undefined; }
    const k=/rev|room|hall|space/.test(w)?'rev':/delay|echo/.test(w)?'dly':/side|pump|duck/.test(w)?'duck':/low ?cut|high ?pass|hp|rumble/.test(w)?'hp':/high ?cut|low ?pass|lp|dark|muffle/.test(w)?'lp':/drive|satur|distort|warm|grit/.test(w)?'drive':/comp|glue|punch/.test(w)?'comp':/wid|stereo|spread/.test(w)?'width':/pan/.test(w)?'pan':/preset|default|studio/.test(w)?'preset':null;
    if(!k) return; t.fx=t.fx||{};
    if(k==='preset'){ t.fx=roleFx(t.role,PROJ.style); refreshTrackGains(); return `Studio effects on ${t.name}`; }
    const d=TFX_DEF[k]; if(a.remove||a.amount===0||/off|remove|no /.test(String(a.value||''))){ delete t.fx[k]; refreshTrackGains(); return `${d.name} off on ${t.name}`; }
    const num=x=>x!=null&&x!==''&&isFinite(+x); let v=num(a.amount)?+a.amount:(num(a.change)?null:d.def*100);
    if(d.unit==='Hz'){ v=num(a.hz)?+a.hz:(num(a.amount)&&+a.amount>=20?+a.amount:(k==='hp'?(t.role==='bass'?35:t.role==='drums'?30:180):6000));
      /* a high cut under 800 Hz is never what was meant (the AI sent "amount":60 for "softer hats"): read 0-100 as how much to cut, on the log scale */
      if(k==='lp'&&!num(a.hz)&&num(a.amount)&&+a.amount<=100) v=d.max*Math.pow(d.min/d.max,clamp(+a.amount,0,100)/100);
      t.fx[k]=clamp(Math.round(v),d.min,d.max); }
    else if(k==='pan'){ t.fx.pan=clamp((num(a.amount)?+a.amount:0)/100,-1,1); }
    else { const cur=t.fx[k]||0; let nv=clamp(v==null?cur+(+a.change)/100:v/100,0,1);
      /* "add some reverb" / "more delay" never lowers it, even when the AI sends an amount under what the track has (QA, 16 Nov) */
      /* only when the add/more is about THIS effect and no number, set, less or too wet was said for it (QA, 16 Nov: "set the chords reverb to 20 and add some delay" kept 20) */
      if(nv<cur&&fxAddOnly(fxClause(LAST_TEXT.text,k,t))) nv=clamp(cur+0.1,0,1); t.fx[k]=nv; }
    if(FXOPEN) FXOPEN.add(t.id); refreshTrackGains();
    return `${d.name} on ${t.name}: ${fxShow(k,t.fx[k])}`; },
  export(a){ const fmt=String(a.format||a.value||'mp3').toLowerCase(); const len=a.minutes?Math.round(+a.minutes*60):a.seconds?+a.seconds:a.loops?Math.min(16,+a.loops):undefined;
    if(!PROJ.tracks.length) return; if(/zip|stem|ableton|wav/.test(fmt)){ exportZip(); return 'Packing the Ableton zip (WAV mix, stems and MIDI)'; } if(/mid/.test(fmt)){ exportMidiOnly(); return 'Downloading the MIDI file'; }
    if(len) { const sel=$('#mp3Len'); if(sel && [...sel.options].some(o=>+o.value===len)) sel.value=String(len); }
    exportMp3(len); return 'Making your MP3, the download starts in a few seconds'; },
  save(a){ if(a.name) PROJ.name=String(a.name).slice(0,60); if(typeof indexedDB==='undefined') return `Couldn’t save “${PROJ.name}”: this browser can’t keep songs`;
    const fail=SAVE_FAIL; saveNamed(false); /* the real result also shows as a toast */
    return fail?`Trying to save “${PROJ.name}” again: last time this browser couldn’t (${fail})`:`Saved “${PROJ.name}”`; },
  new_project(a){ newSong(a.name); return 'New song'; },
  rename(a){ if(!a.name) return; PROJ.name=String(a.name).slice(0,60); saveProject(); return `Song renamed to “${PROJ.name}”`; }
};
/* ---------- the song by voice (AI-1): arrange, section, parts, transition, loop_section, transport from ----------
   Works on the shared layout in song.js (songTemplate, songAdd, songFind …). runActions sets SONG.batch, so one request is one undo step,
   and shows one Undo chip in the song view for it. The owner's rules (14 Nov): "full track" is about 3 minutes (16-bar sections) unless
   the user says club, extended or DJ (32-bar sections, about 6 minutes); arranging never adds parts, it suggests them; transitions are drum
   transitions (a riser is a snare roll plus a crash, and Keys says so). */
const SONG_ACTS=new Set(['arrange','section','parts','transition','loop_section']);
const SEC_BARS={intro:8,build:8,drop:16,break:16,verse:16,chorus:16,bridge:8,hook:8,outro:8,other:8};
const SONG_FAM={
  electronic:[['Intro','intro',16],['Build','build',16],['Drop','drop',16],['Break','break',16],['Drop 2','drop',16],['Outro','outro',16]],
  pop:[['Intro','intro',8],['Verse','verse',16],['Chorus','chorus',16],['Verse 2','verse',16],['Chorus 2','chorus',16],['Bridge','bridge',8],['Chorus 3','chorus',16],['Outro','outro',8]],
  hiphop:[['Intro','intro',8],['Hook','hook',8],['Verse','verse',16],['Hook 2','hook',8],['Verse 2','verse',16],['Hook 3','hook',8],['Outro','outro',8]],
  dnb:[['Intro','intro',16],['Build','build',16],['Drop','drop',32],['Break','break',16],['Build 2','build',16],['Drop 2','drop',32],['Outro','outro',16]],
  dnbClub:[['Intro','intro',32],['Build','build',16],['Drop','drop',32],['Break','break',32],['Build 2','build',16],['Drop 2','drop',32],['Outro','outro',32]]
};
const CLUB_WORDS=/\b(club|extended|dj|long version|longer version|6 ?min(ute)?s?|six minutes?)\b/, SHORT_WORDS=/\b(short|reel|reels|sketch|teaser|quick|30 ?sec(ond)?s?)\b/;
function songFamily(style){ const s=style||PROJ.style||'house';
  return /^(dnb|liquid|dubstep)$/.test(s)?'dnb':/^(hiphop|boombap|trap|drill|lofi)$/.test(s)?'hiphop':/^(pop|rock|bollywood|punjabi|bhangra|reggaeton)$/.test(s)?'pop':'electronic'; }
const snapBars=(b,step=4)=>clamp(Math.round((+b||0)/step)*step||step,4,64);
const said=()=>normName(LAST_TEXT.text||'');
/* the section the user's own words name ("in the outro", "outro mein", "from the second drop"), or null */
const SEC_RE='((?:first|second|third|last|1st|2nd|3rd) )?(intro|build ?up|build|drop|breakdown|break|outro|chorus|verse|bridge|hook)( \\d+| two| three)?';
function secSaid(){ const t=said(); let m=t.match(new RegExp('\\b(?:in|during|for|from|throughout|out of) (?:the )?'+SEC_RE+'\\b'))||t.match(new RegExp('\\b'+SEC_RE+' (?:mein|me|main|ke liye|ke lie|se(?! (?:pehle|pahle|phele|baad)))\\b')); return m?((m[1]||'')+m[2]+(m[3]||'')).trim():null; }
/* the user's words name a transition ("roll", "fill", "silence", "riser" …): only then does an AI transition next to a new layout count (fix 2) */
const TRANS_WORDS=/\b(rolls?|snare ?rolls?|fills?|silence|silent|gaps?|pauses?|risers?|uplifters?|sweeps?|crash|kick ?drop|transitions?|khamoshi|chup|breath)\b/;
const noGapSaid=()=>/\b(no|without|remove|lose|skip|take out|hata\w*) (?:the |a )?(gap|silence|pause)\b|\b(gap|silence|pause) (?:hata\w*|nahi|mat)\b/.test(said());
const songNote=(text,unless)=>{ (BATCH.notes=BATCH.notes||[]).push({text,unless}); };
/* "the break" when there are two: the one playing, else the one touched last (the selected one), else the first (songFind) */
function findSec(ref){ if(ref==null||ref==='') return null; if(typeof ref==='object'&&!ref.id&&ref.index!=null) ref=+ref.index;
  return songFind(typeof ref==='string'?ref.replace(/\bthe\s+/g,'').trim():ref); }
function secName(ref){ const k=songKindOf(String(ref||'').replace(/\d+/g,'')); return k==='other'?String(ref||'Section').replace(/\b(first|second|third|fourth|another|new|one more|a|an|the)\b/gi,'').trim().replace(/^\w/,c=>c.toUpperCase())||'Section':SONG_KIND_NAME[k]; }
const isGap=n=>/\b(silence|silent|gap|pause|quiet|stop|break in the beat)\b/i.test(String(n||''));
/* which tracks a word means: drums, kick (a piece inside the one drums track), bass, chords, melody, voice, all, or a track name */
const PIECE_WORD={kick:'kick',kicks:'kick',bd:'kick',hats:'hats',hat:'hats',hihat:'hats',hihats:'hats','hi-hats':'hats',clap:'clap',claps:'clap',snare:'snare',snares:'snare',perc:'perc',percussion:'perc',congas:'perc',shaker:'hats',shakers:'hats',crash:'crash',ride:'ride'};
const ROLE_OF={drums:'drums',drum:'drums',beat:'drums',groove:'drums',bass:'bass',bassline:'bass',sub:'bass',chords:'chords',chord:'chords',pad:'chords',pads:'chords',keys:'chords',harmony:'chords',strings:'chords',choir:'chords',melody:'melody',lead:'melody',arp:'melody',pluck:'melody',hook:'melody',voice:'voice',vocal:'voice',vocals:'voice'};
function partTargets(w){ const k=String(w||'').toLowerCase().replace(/^the\s+/,'').trim(); if(!k) return [];
  if(/^(all|everything|every part|the lot|all parts)$/.test(k)) return PROJ.tracks.map(t=>({t}));
  const isDrum=t=>['drums','hats','perc'].includes(songRole(t));
  if(PIECE_WORD[k]){ const own=PROJ.tracks.filter(t=>songRole(t)===(PIECE_WORD[k]==='perc'?'perc':'hats')&&PIECE_WORD[k]!=='kick'); if(own.length&&/hats|perc/.test(PIECE_WORD[k])) return own.map(t=>({t}));
    return PROJ.tracks.filter(t=>songRole(t)==='drums').map(t=>({t,piece:PIECE_WORD[k]})); }
  const r=ROLE_OF[k]; if(r) return PROJ.tracks.filter(t=>r==='drums'?isDrum(t):songRole(t)===r).map(t=>({t}));
  const t=findTrack(k); return t?[{t}]:[]; }
const PIECES=['kick','clap','snare','hats','perc'];
function partSet(s,t,on,piece){ const p=Object.assign({on:false,variant:'A'},s.parts[t.id]||{}); let wo=new Set(p.without||[]);
  if(piece){ if(on){ if(!p.on){ wo=new Set(PIECES.filter(x=>x!==piece)); p.on=true; } else wo.delete(piece); } else { if(!p.on) return; wo.add(piece); if(PIECES.every(x=>wo.has(x))) p.on=false; } }
  else { p.on=!!on; if(on) wo=new Set(); }
  songSetPart(s.id,t.id,{on:p.on,without:p.on&&wo.size?[...wo]:null}); }
/* a fresh generated version of a part, without touching the track's main pattern */
function freshEvents(t){ if(!t||!t.gen) return null; const keep={events:t.events,seed:t.seed,desc:t.desc,recipe:t.recipe}; let ev=null; try{ if(regenTrack(t)) ev=t.events; } finally{ Object.assign(t,keep); } return ev; }
/* transitions: the end of a section into the next one */
function endFor(to,bars,o={}){ to=String(to||'').toLowerCase().replace(/[\s_-]+/g,'');
  const k=/riser|rise|uplift|whoosh|noise/.test(to)?'riser':/filter|sweep/.test(to)?'fill':/roll|snare|buildup/.test(to)?'snareroll':/kick|gap|silen|pause|stop|dropout|breath/.test(to)?'kickdrop':/fill|tom/.test(to)?'fill':/crash|cymbal|impact/.test(to)?'crash':/none|off|no|remove|nothing/.test(to)?'none':null;
  if(!k) return null; if(k==='none') return {to:'none'};
  const max=o.max||64, def=k==='snareroll'||k==='riser'?(o.club?8:4):1, lim=k==='snareroll'||k==='riser'?[2,8]:k==='fill'?[1,2]:[1,1];
  const want=Math.round(+bars||def), b=Math.min(max,clamp(want,lim[0],lim[1])); const e={to:k,bars:Math.max(1,b)}; if(o.gap) e.gap=true; if(o.crash===false) e.crash=false; e.asked=want; return e; }
const END_WORD={snareroll:'snare roll',riser:'snare roll and crash (a stand-in for a riser)',fill:'drum fill',kickdrop:'kick drop and a beat of silence',crash:'crash'};
function setEnd(s,e,why){ songEdit(()=>{ if(!e||e.to==='none') s.end=null; else { const c=Object.assign({},e); delete c.asked; s.end=c; } }); SONG.view.sel=s.id;
  const S=songSections(), nx=S[S.indexOf(s)+1]; if(!e||e.to==='none') return `${s.name}: no transition`;
  if(e.asked&&e.asked!==e.bars&&e.to!=='crash') songNote(`The ${END_WORD[e.to].split(' (')[0]} is ${e.bars} bar${e.bars>1?'s':''}${e.to==='kickdrop'?', so the drop still hits':''}.`);
  if(why==='riser') songNote('Risers aren’t in the studio yet, so it’s a snare roll with a crash.',/roll/i);
  if(why==='filter') songNote('Filter sweeps aren’t in the studio yet, so it’s a drum fill.',/fill/i);
  return `${s.name}: ${e.to==='kickdrop'?'kick drop':END_WORD[e.to].split(' (')[0]}${e.to==='snareroll'||e.to==='riser'?' '+e.bars+' bars':''}${e.gap?' + a beat of silence':''}${nx?' into '+nx.name:''}`; }
/* default transitions for a whole layout (family, artist hint, club length) */
function songAutoEnds(S,fam,hint,club){ hint=hint||{};
  S.forEach((s,i)=>{ const nx=S[i+1]; if(!nx){ s.end=null; return; } let e=null;
    if(fam==='electronic'||fam==='dnb'){
      if(nx.kind==='drop'){ const into=hint.into||'snareroll'; e=endFor(into,/fill|kick/.test(into)?1:hint.roll||(s.kind==='break'&&club?8:4),{gap:hint.gap||s.kind==='break',max:s.bars,club}); }
      else if(s.kind==='drop'||s.kind==='intro') e=endFor('fill',1);
      else if(nx.kind==='build') e=endFor('fill',1); }
    else if(fam==='pop'){ if(nx.kind==='chorus') e=endFor(s.kind==='bridge'?'snareroll':'fill',2,{max:s.bars}); else if(s.kind==='chorus') e=endFor('crash',1); }
    else if(fam==='hiphop'){ if(nx.kind==='hook'||nx.kind==='chorus') e=endFor('kickdrop',1,{crash:false}); }
    if(e){ delete e.asked; s.end=e; } else s.end=null; }); }
/* the artist's way of arranging (ARTISTS[].arr): which parts play in the intro, build and break, longer intros and breaks */
function songShape(S,hint,club){ if(!hint) return; const roleIn=(list,t)=>{ const r=songRole(t), base=['drums','hats','perc'].includes(r)?'drums':r; for(const w of list){ const [k,wo]=w.split('-'); if(k===base) return {on:true,without:base==='drums'&&wo?[wo]:null}; } return {on:false}; };
  const apply=(kind,list)=>{ if(!list) return; S.filter(s=>s.kind===kind).forEach(s=>PROJ.tracks.forEach(t=>{ const r=roleIn(list,t), p=s.parts[t.id]||{variant:'A'}; s.parts[t.id]=Object.assign({},p,{on:r.on}); if(r.without) s.parts[t.id].without=r.without; else if(!r.on||!p.on) delete s.parts[t.id].without; })); };
  apply('intro',hint.intro); apply('build',hint.build); apply('break',hint.brk);
  if(hint.leadDrops) S.forEach(s=>PROJ.tracks.filter(t=>songRole(t)==='melody').forEach(t=>{ if(s.parts[t.id]) s.parts[t.id].on=s.kind==='drop'; }));
  S.forEach(s=>{ if(s.kind==='intro'&&hint.introX) s.bars=snapBars(s.bars*hint.introX,8); if(s.kind==='break'){ if(hint.breakBars) s.bars=snapBars(hint.breakBars*(club?2:1)); else if(hint.breakX) s.bars=snapBars(s.bars*hint.breakX,8); } });
  /* nothing would play (say a drums-only intro in a song with no drums): play what the template chose instead */
  S.forEach(s=>{ if(PROJ.tracks.length&&!PROJ.tracks.some(t=>s.parts[t.id]&&s.parts[t.id].on)) PROJ.tracks.forEach(t=>s.parts[t.id]=songDefaultPart(t,s.kind)); if(!PROJ.tracks.some(t=>s.parts[t.id].on)) PROJ.tracks.forEach(t=>s.parts[t.id]={on:true,variant:'A'}); }); }
/* the whole song to about N minutes: every section stays an 8, 16 or 32-bar phrase (64 only for very long ones), the way DJs count; never under about a minute
   unless the user asked for seconds or a reel (QA fix 2: "shorter" gave 12-bar drops and a 0.5-minute song). Each section can take the phrase just under or
   just over its share; of those layouts the one closest to the time asked wins ("shorter" lands at or under it, "longer" at or over), keeping each section
   near its share, the drops matched and longest, and builds at 16 bars or less */
const PHRASES=[8,16,32,64];
function songScaleTo(minutes){ const S=songSections(), have=songBars(); if(!have) return null; let mins=clamp(+minutes||0,0.25,12);
  if(mins<1&&!/\b(\d+ ?sec\w*|seconds?|reels?|teaser|short version)\b/.test(said())){ mins=1; if(songSecs(have)<=75) songNote('It’s about a minute already, the shortest a full song goes here.'); }
  const want=Math.round(mins*60*CTRL.bpm/240), f=want/have, dir=want<have?-1:1, ideal=S.map(s=>Math.max(4,s.bars*f));
  const opts=ideal.map(x=>{ const P=PHRASES.filter(p=>p<64||x>=48), lo=[...P].reverse().find(p=>p<=x)||P[0], hi=P.find(p=>p>=x)||P[P.length-1]; return lo===hi?[lo]:[lo,hi]; });
  const score=B=>{ const tot=B.reduce((a,b)=>a+b,0), err=Math.abs(tot-want)/want, wrong=Math.max(0,dir*(want-tot))/want; let shape=0, pen=0;
    const drops=B.filter((b,i)=>S[i].kind==='drop'), dmin=drops.length?Math.min(...drops):0;
    B.forEach((b,i)=>{ shape+=Math.abs(Math.log2(b/ideal[i])); if(S[i].kind==='build'&&b>16) pen+=0.1; if(S[i].kind!=='drop'&&dmin&&b>dmin) pen+=0.05; });
    if(drops.length>1&&drops.some(b=>b!==drops[0])) pen+=0.1; return 3*err+3*wrong+shape/B.length+pen; };
  let best=opts.map(o=>o[0]), bs=Infinity;
  if(opts.length<=12){ const n=opts.length, walk=(i,B)=>{ if(i===n){ const v=score(B); if(v<bs-1e-9){ bs=v; best=B.slice(); } return; } for(const b of opts[i]){ B.push(b); walk(i+1,B); B.pop(); } }; walk(0,[]); }
  else best=ideal.map(x=>PHRASES.filter(p=>p<64||x>=48).reduce((a,p)=>Math.abs(p-x)<Math.abs(a-x)?p:a,8));
  const tot=best.reduce((a,b)=>a+b,0);
  if(dir<0&&tot>want*1.15&&best.every(b=>b===8)&&S.length>3) songNote('Every part is already 8 bars, so it can’t get shorter without losing one. Say “remove the break” to cut a part.');
  songEdit(S=>{ S.forEach((s,i)=>{ s.bars=best[i]; if(s.end&&s.end.bars>s.bars) s.end.bars=Math.max(1,Math.min(s.end.bars,s.bars/2)); }); },{structure:true});
  const mm=Math.round(songSecs(songBars())/30)/2; return `About ${mm} minute${mm===1?'':'s'}: ${S.map(s=>s.name+' '+s.bars).join(' · ')} · ${songLenText()}`; }
function songMainSel(){ const S=songSections(), m=S.find(s=>s.kind==='drop')||S.find(s=>s.kind==='chorus'||s.kind==='hook')||S[0]; if(m){ SONG.view.sel=m.id; songViewSave(); } }
/* the instrument guard: with a known artist, an instrument the user didn't say is the AI's guess; the artist's sound wins */
function instSaid(a){ if(!a.instrument||!LAST_TEXT.text||!findArtist(a.ref||a.artist||a.like)) return a.instrument; const t=' '+LAST_TEXT.text.toLowerCase()+' ', id=resolveInst(a.instrument), I=id&&INST.get(id);
  if(t.includes(String(a.instrument).toLowerCase())||(I&&t.includes(I.name.toLowerCase()))||INST_WORDS.some(([k,re])=>k===id&&re.test(t))) return a.instrument; return undefined; }

/* drum notes for a transition, in beats from the start of the section (song.js songFlat adds them; up to 4 beats past the end for the crash) */
function transitionEvents(s,t){ const e=s.end; if(!e||!e.to||e.to==='none') return []; if(PROJ.tracks.find(x=>songRole(x)==='drums')!==t) return []; /* one drums track plays the transition */ const len=s.bars*4, S=songSections(), last=S[S.length-1]===s, out=[];
  const has=n=>[t.events].concat(Object.values(t.patterns||{}).map(p=>p.events)).some(ev=>ev&&ev.some(x=>x.n===n)), sn=has(38)?38:has(39)?39:has(40)?40:38;
  if(e.to==='snareroll'||e.to==='riser'){ const B=Math.min(s.bars,clamp(Math.round(+e.bars||4),1,8)), st=len-B*4, R=e.to==='riser';
    for(let b=st;b<len-1e-6;){ const f=(b-st)/(B*4), step=len-b<=1+1e-6?0.125:(R?(f<0.3?0.5:0.25):(f<0.25?1:f<0.5?0.5:0.25)); out.push({b,d:Math.min(0.2,step),n:sn,v:+(0.3+0.68*Math.min(1,f+step/(B*4))).toFixed(3)}); b=+(b+step).toFixed(4); }
    if(R) for(let b=len-4;b<len-1e-6;b+=0.5) out.push({b,d:0.4,n:46,v:+(0.35+0.5*(b-len+4)/4).toFixed(3)}); }
  else if(e.to==='fill'){ const B=clamp(Math.round(+e.bars||1),1,2), st=len-2-(B-1)*2;
    for(let b=st;b<len-1-1e-6;b+=0.25) out.push({b,d:0.2,n:sn,v:+(0.5+0.25*(b-st)/(len-1-st)).toFixed(3)});
    [50,48,47,45].forEach((n,i)=>out.push({b:len-1+i*0.25,d:0.25,n,v:0.85})); }
  if(!last&&e.crash!==false) out.push({b:len,d:2,n:49,v:0.9});
  return out; }
/* which notes stop for a transition: [{from, only}] in beats from the section start; only = drum pieces (drums tracks), none = every note of the track. songFlat starts each cut 1/16 beat early (SONG_EARLY) so hits the drummer pushes early stay out */
function transitionCut(s,t){ const e=s.end; if(!e||!e.to||e.to==='none') return null; const len=s.bars*4, drum=t.role==='drums'||!!(INST.get(t.inst)||{}).drums, out=[];
  if(e.to==='kickdrop'){ if(drum) out.push({from:len-4,only:['kick']}); else if(songRole(t)==='bass') out.push({from:len-4}); out.push({from:len-1}); }
  /* a beat of silence after a roll: the kick also sits out the beat before it, because deep kicks ring for about 3 beats (kitDeepTechno 1.4 s) and would fill the gap */
  else if(e.gap){ if(drum) out.push({from:len-2,only:['kick']}); out.push({from:len-1}); }
  return out; }

Object.assign(ACT,{
  arrange(a){
    if(!PROJ.tracks.length){ songNote('There’s nothing to arrange yet. Start with a beat: say “make a house beat” or name an artist.'); return; }
    BATCH.arranged=true;
    const t=said(), named=a.ref&&findArtist(a.ref)&&(!t||findArtist(a.ref).names.some(n=>t.includes(normName(n)))), artist=named?findArtist(a.ref):findArtist(PROJ.ref);
    const style=(named&&artist.style)||PROJ.style||(artist&&artist.style)||'house', fam=songFamily(style), hint=fam==='electronic'?(artist&&artist.arr)||null:null;
    if(a.minutes&&songArranged()&&!(a.sections&&a.sections.length)){ const r=songScaleTo(a.minutes); return r; }
    let kind=String(a.template||'').toLowerCase(); if(Array.isArray(a.sections)&&a.sections.length) kind='custom';
    if(kind!=='custom'){ const club=t?CLUB_WORDS.test(t):/club|extended|dj|long/.test(kind), short=t?SHORT_WORDS.test(t)&&!/\b(full|whole|complete)\b/.test(t):/short|reel|sketch/.test(kind); kind=club?'club':short?'short':'full'; }
    let secs, label;
    if(kind==='custom'){ const list=[]; let gapAfter=-1;
      a.sections.forEach(x=>{ const nm=typeof x==='string'?x:(x&&(x.name||x.kind))||''; if(isGap(nm)){ gapAfter=list.length-1; return; } const k=songKindOf(nm);
        list.push({name:secName(nm),kind:k,bars:snapBars((x&&x.bars)||SEC_BARS[k])}); });
      if(!list.length) return; secs=list; secs.gapAfter=gapAfter; label='Your song'; }
    else if(kind==='short'){ secs=SONG_TEMPLATES.short.secs.map(([name,k,bars])=>({name,kind:k,bars})); label='Short version'; }
    else { const base=fam==='dnb'&&kind==='club'?SONG_FAM.dnbClub:SONG_FAM[fam]; secs=base.map(([name,k,bars])=>({name,kind:k,bars:kind==='club'&&fam==='electronic'?32:bars})); label=kind==='club'?'Club track':'Full track'; }
    songTemplate(secs);
    const S=songSections(), club=kind==='club';
    songEdit(S=>{ if(kind!=='short') songShape(S,hint,club);
      songAutoEnds(S,fam,hint,club); if(kind==='short') S.forEach(s=>s.end=null);
      if(secs.gapAfter>=0&&S[secs.gapAfter]){ const e=endFor('kickdrop',1); delete e.asked; S[secs.gapAfter].end=e; } },{structure:true});
    if(kind==='club'&&fam!=='electronic'&&fam!=='dnb') songScaleTo(6);
    if(a.minutes) songScaleTo(a.minutes);
    songMainSel(); SONG.cursor=0;
    const miss=[!PROJ.tracks.some(t=>songRole(t)==='bass')&&'a bassline',!PROJ.tracks.some(t=>songRole(t)==='chords')&&'chords'].filter(Boolean);
    if(miss.length) songNote(miss.length>1?'There’s no bassline or chords yet: want them? Say “add a bassline”.':miss[0]==='chords'?'There are no chords yet: want some? Say “add chords”.':'There’s no bassline yet: want one? Say “add a bassline”.',/bass|chord/i);
    return `${label}${hint&&named?' like '+artist.name:''}: ${S.map(s=>s.name+' '+s.bars).join(' · ')} · ${songLenText()}`; },
  section(a){ const d=String(a.do||a.action||a.value||'').toLowerCase();
    if(/^(add|insert|new|create)/.test(d)) return songAddSec(a);
    if(!songArranged()&&!/rename/.test(d)){ songNote('There’s no song layout yet. Say “make it a full track” first.'); return; }
    const s=findSec(a.section||a.name); if(!s){ songNote(`I couldn’t find ${a.section?'“'+a.section+'”':'that section'} in the song.`); return; }
    if(/^(remove|delete|cut|drop|kill)/.test(d)){ if(songSections().length<2) return; songRemove(s.id); return `Removed ${s.name}`; }
    if(/^(dup|copy|repeat|clone)/.test(d)){ const S=songSections(), tg=a.after?findSec(a.after):null, at=tg?S.indexOf(tg)+1:S.indexOf(s)+1; const c=songAdd({copyOf:s.id,at,chip:false}); songAutoAround(c); songRenumber([c.kind]); return `Copied ${s.name} to ${c.name}`; }
    if(/^(move)/.test(d)){ const S=songSections(), tg=findSec(a.after||a.before); if(!tg||tg===s) return; const rest=S.filter(x=>x!==s); const at=rest.indexOf(tg)+(a.after?1:0); if(!songMove(s.id,at)){ songNote(`${s.name} is already ${a.after?'after':'before'} ${tg.name}.`); return; } SONG.view.sel=s.id; return `Moved ${s.name} ${a.after?'after':'before'} ${tg.name}`; }
    if(/^(rename|name)/.test(d)){ const was=s.name; if(!a.name||!songRename(s.id,a.name)) return; return `Renamed ${was} to ${s.name}`; }
    /* length: bars (an exact number) or change (+8, -8); "longer" with no number = 8 more bars */
    const was=s.bars; let want=a.bars!=null&&a.bars!==''?+a.bars:a.change!=null&&a.change!==''?was+(+String(a.change).replace(/[^\d.-]/g,'')||0):was+(/short|less|cut|trim|minus/.test(d)?-8:8);
    if(a.bars!=null&&/longer|more|add|extend/.test(d)&&+a.bars<=16&&+a.bars<was) want=was+(+a.bars); /* "8 bars longer" sent as bars:8 */
    const b=snapBars(want); if(b===was){ return `${s.name} stays ${was} bars`; }
    if(Math.abs(b-want)>=1) songNote(`${s.name} is now ${b} bars.`);
    songResize(s.id,b); SONG.view.sel=s.id; return `${s.name}: ${was} → ${b} bars`; },
  parts(a){ if(!songArranged()){ songNote('There’s no song layout yet. Say “make it a full track” first.'); return; }
    const all=/^(all|every|everywhere|whole|song)/i.test(String(a.section||'')), list=all?songSections():[findSec(a.section||'this')].filter(Boolean);
    if(!list.length){ songNote(`I couldn’t find ${a.section?'“'+a.section+'”':'that section'} in the song.`); return; }
    const arr=x=>(Array.isArray(x)?x:x==null?[]:[x]).map(String), said_=[]; const missing=[];
    for(const s of list){
      const only=arr(a.only); if(only.length){ const keep=new Map(); only.forEach(w=>{ const tg=partTargets(w); if(!tg.length) missing.push(w); tg.forEach(x=>{ const k=keep.get(x.t)||{pieces:[]}; if(x.piece) k.pieces.push(x.piece); else k.whole=true; keep.set(x.t,k); }); });
        if(keep.size){ PROJ.tracks.forEach(t=>{ const k=keep.get(t); if(!k){ partSet(s,t,false); return; } if(k.whole) partSet(s,t,true); else { songSetPart(s.id,t.id,{on:true,without:PIECES.filter(p=>!k.pieces.includes(p))}); } }); said_.push('only '+only.join(', ')); } }
      arr(a.out).forEach(w=>{ const tg=partTargets(w); if(!tg.length){ missing.push(w); return; } tg.forEach(x=>partSet(s,x.t,false,x.piece)); said_.push(w+' out'); });
      arr(a.in).forEach(w=>{ const tg=partTargets(w); if(!tg.length){ missing.push(w); return; } tg.forEach(x=>partSet(s,x.t,true,x.piece)); said_.push(w+' in'); });
      arr(a.vary).forEach(w=>{ const tg=partTargets(w).filter(x=>x.t.kind==='notes'); if(!tg.length){ missing.push(w); return; }
        tg.forEach(({t})=>{ const L=songMakeUnique(s.id,t.id); if(!L) return; const ev=freshEvents(t); if(ev) songEdit(()=>{ t.patterns[L].events=ev; }); });
        said_.push(`its own ${tg.map(x=>x.t.name.toLowerCase()).join(', ')}${tg.some(x=>x.t.gen)?'':' (a copy to edit; your own part isn’t regenerated)'}`); });
      SONG.view.sel=s.id; }
    if(missing.length) songNote(`There’s no ${[...new Set(missing)].join(' or ')} in this song yet.`);
    if(!said_.length) return; const nm=all?'Whole song':list[0].name; return `${nm}: ${[...new Set(said_)].join(', ')}`; },
  transition(a){ if(!songArranged()){ songNote('There’s no song layout yet. Say “make it a full track” first.'); return; }
    /* a new layout already has its transitions (a roll and a beat of silence into each drop); a transition the AI adds next to it, when the user didn't ask for one, would replace them (QA fix 2) */
    if(BATCH.arranged&&said()&&!TRANS_WORDS.test(said())) return;
    const S=songSections(); let s=a.section!=null&&a.section!==''?findSec(a.section):null;
    if(!s&&a.before){ const n=findSec(a.before); s=n?S[S.indexOf(n)-1]||null:null; }
    if(!s&&(a.into||a.before)){ const n=findSec(a.into||a.before); s=n?S[S.indexOf(n)-1]||null:null; }
    if(!s){ const d=S.find((x,i)=>i&&x.kind==='drop'); s=d?S[S.indexOf(d)-1]:null; }
    if(!s){ songNote('I couldn’t tell which part that transition goes on.'); return; }
    const w=String(a.to||a.kind||'snareroll').toLowerCase(), e=endFor(w,a.bars,{max:s.bars}), was=s.end;
    /* a roll with no length keeps the roll that is there; a roll with no gap field keeps the beat of silence that is there (QA fix 2: Llama's bare "snareroll" wiped it) */
    if(e&&(e.to==='snareroll'||e.to==='riser')&&was){ const hadRoll=was.to==='snareroll'||was.to==='riser';
      if((a.bars==null||a.bars==='')&&hadRoll){ e.bars=Math.min(s.bars,was.bars||e.bars); delete e.asked; }
      if(a.gap==null&&(was.gap||was.to==='kickdrop')&&!noGapSaid()) e.gap=true; }
    if(!e){ songNote(`I can do a snare roll, a drum fill, a kick drop with a gap, or a crash.`); return; }
    /* Llama sometimes sends a roll and then a crash for the same section ("riser" = roll + crash): the roll already ends on a crash, so keep it */
    BATCH.ends=BATCH.ends||{}; const prev=BATCH.ends[s.id]; if(prev&&(e.to==='crash'||a.gap===true&&e.to===prev)){ if(a.gap===true&&s.end){ songEdit(()=>{ s.end.gap=true; }); } return; } BATCH.ends[s.id]=e.to;
    if(a.gap===true&&e.to!=='kickdrop') e.gap=true;
    const sd=said(); return setEnd(s,e,/riser|rise|uplift/.test(w)||(e.to==='snareroll'&&/\b(risers?|uplifters?)\b/.test(sd))?'riser':/filter|sweep/.test(w)||(e.to==='fill'&&/\bsweeps?\b/.test(sd))?'filter':null); },
  loop_section(a){ const r=String(a.section==null?a.value||'':a.section);
    if(!songArranged()||/^(song|whole|all|full|none|off|stop|everything|entire)/i.test(r)||!r){ songLoop(null); if(songArranged()){ if(!songOn()) songMode('song',{noPlay:true}); songPlay({from:1}); return 'Playing the whole song'; } if(!TR.running) loopPlay(); return 'Playing the loop'; }
    const s=findSec(r); if(!s){ songNote(`I couldn’t find “${r}” in the song.`); return; } songLoop(s.id); if(!TR.running) songPlay(); return `Looping ${s.name}`; }
});
/* "add a second drop": copies the first drop, with a break before it when there isn't one, placed before the outro */
function songAddSec(a){ const raw=String(a.name||a.section||'Section'); const S=songSections();
  if(isGap(raw)){ let s=a.after?findSec(a.after):null; if(!s&&a.before){ const n=findSec(a.before); s=n?S[S.indexOf(n)-1]:null; } return ACT.transition({section:s?s.id:undefined,to:'kickdrop'}); } /* "add a silence before the drop" is a gap, not a section */
  const kind=songKindOf(raw.replace(/\d+/g,'')), name=secName(raw), same=S.filter(s=>s.kind===kind&&kind!=='other');
  const tgA=a.after?findSec(a.after):null, tgB=a.before?findSec(a.before):null, outro=[...S].reverse().find(s=>s.kind==='outro');
  let at=tgA?S.indexOf(tgA)+1:tgB?S.indexOf(tgB):kind==='intro'?0:kind==='outro'||!outro?S.length:S.indexOf(outro);
  if(!songArranged()&&(kind==='intro'||kind==='build')) at=0;
  const made=[]; const bars=a.bars?snapBars(a.bars):null;
  if(kind==='drop'&&same.length&&!(S[at-1]&&(S[at-1].kind==='break'||S[at-1].kind==='build'))){ const br=S.find(s=>s.kind==='break'); made.push(songAdd(br?{copyOf:br.id,name:'Break',at,chip:false}:{name:'Break',kind:'break',bars:16,at,chip:false})); at++; }
  made.push(same.length&&['drop','chorus','hook','verse','break','build'].includes(kind)?songAdd({copyOf:same[0].id,name,at,chip:false,bars:bars||undefined}):songAdd({name,kind,bars:bars||SEC_BARS[kind],at,chip:false}));
  if(bars) songEdit(()=>{ made[made.length-1].bars=bars; },{structure:true});
  made.forEach(songAutoAround); songRenumber(made.map(s=>s.kind)); const S2=songSections(), last=made[made.length-1], nx=S2[S2.indexOf(last)+1];
  return `Added ${made.map(s=>s.name+' ('+s.bars+' bars)').join(' and ')}${nx?' before '+nx.name:''}`; }
/* sections of one kind are numbered in song order (Drop, Drop 2, Drop 3), as long as they all still have their plain names */
function songRenumber(kinds){ if(BATCH.acting){ (BATCH.renum=BATCH.renum||[]).push(...kinds); return; } const S=songSections(), was=new Map(S.map(s=>[s.id,s.name]));
  songEdit(()=>{ [...new Set(kinds)].forEach(k=>{ const base=SONG_KIND_NAME[k]; if(!base||k==='other') return; const all=S.filter(s=>s.kind===k), re=new RegExp('^'+base+'(?: \\d+)?$','i');
    if(all.length<2||!all.every(s=>re.test(s.name))) return; all.forEach((s,i)=>{ s.name=i?base+' '+(i+1):base; }); }); });
  const ren=new Map(); S.forEach(s=>{ if(was.get(s.id)!==s.name) ren.set(was.get(s.id),s.name); }); return ren; }
/* the replies were written with the names before renumbering: swap old names for new ones in one pass (Drop 3 ↔ Drop 2) */
function songRenamed(list,ren){ if(!ren||!ren.size) return list; const keys=[...ren.keys()].sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const re=new RegExp('\\b('+keys.join('|')+')\\b(?! ?\\d)','g'); return list.map(x=>typeof x==='string'?x.replace(re,m=>ren.get(m)||m):x); }
/* after a section is added or copied: the section before it and the new one get the usual transition if they have none */
function songAutoAround(s){ const S=songSections(), i=S.indexOf(s); if(i<0) return; const fam=songFamily(), art=findArtist(PROJ.ref), hint=fam==='electronic'&&art?art.arr:null;
  songEdit(()=>{ const tmp=S.map(x=>Object.assign({},x)); songAutoEnds(tmp,fam,hint,false); [i-1,i].forEach(j=>{ if(j>=0&&S[j]&&!S[j].end&&tmp[j].end) S[j].end=tmp[j].end; }); }); }
/* one request = one undo step: song edits wait in memory (SONG.batch) and everything is saved once at the end.
   Arrangement actions run after the parts they arrange, and playback after both */
function orderActions(list){ const rank=a=>{ const t=a.type; return t==='arrange'?1:t==='section'||t==='parts'||t==='transition'?2:t==='loop_section'||t==='transport'||t==='export'||t==='sing'||t==='again'?3:0; };
  return list.map((a,i)=>({a,i,r:rank(a)})).sort((x,y)=>x.r-y.r||x.i-y.i).map(x=>x.a); }
/* actions whose whole effect is in the song (PROJ and the tempo), so "the undo history didn't move" means "nothing changed"; neutral ones (play, loop) never change it */
const NOOP_PURE=new Set(['arrange','section','parts','transition','groove','hats','tempo','bars','key','style','instrument','quantize','transpose']), NOOP_NEUTRAL=new Set(['transport','loop_section']);
/* which part of what the user said is about effect k: "set the chords reverb to 20 and add some delay" → "add some delay" for the delay.
   A half without a verb of its own ("…and delay to the chords") reads with the half before it. null when the effect isn't named. */
const FX_WORDS={hp:/\b(low ?cut|high ?pass|rumble)\b/,lp:/\b(high ?cut|low ?pass)\b/,rev:/\b(reverb|verb|room|hall|space|wet|wetter|dry|drier)\b/,dly:/\b(delay|echo(es)?)\b/,duck:/\b(sidechain|side chain|pump\w*|duck\w*)\b/,drive:/\b(drive|saturat\w*|distort\w*|grit\w*|warm\w*)\b/,comp:/\b(compress\w*|glue|punch\w*)\b/,width:/\b(width|wide\w*|stereo|spread)\b/};
const FX_VERB=/\d|\b(add|more|some|set|make|put|turn|give|less|lower|reduce|raise|boost|increase|cut|remove|kill|drop|take|no|too|bring|push|pull|want|need|use|dry|wet)\b/;
function fxClause(text,k,tr){ const re=FX_WORDS[k]; if(!re) return null; const s=String(text||'').toLowerCase().replace(/\bmor\b/g,'more');
  const parts=s.split(/\s*(?:[,;.]|\band then\b|\bthen\b|\band\b|\bbut\b|\bplus\b|\balso\b)\s*/).filter(x=>x.trim());
  /* "more reverb on the chords and less on the melody": the melody's half is the one that names the melody */
  const RW=typeof ROLE_WORDS!=='undefined'?ROLE_WORDS:[], rre=tr&&(RW.find(([r])=>r===tr.role)||[])[1], nm=tr&&tr.name&&tr.name.length>2?tr.name.toLowerCase():null;
  const names=c=>!!tr&&(rre&&rre.test(' '+c+' ')||!!nm&&c.includes(nm)), pick=i=>{ let c=parts[i]; for(let j=i-1;j>=0&&!FX_VERB.test(c.replace(re,' '));j--) c=parts[j]+' '+c; return c; };
  let i=parts.findIndex(c=>re.test(c)&&names(c)); if(i<0&&tr) i=parts.findIndex(c=>names(c)&&FX_VERB.test(c)&&!Object.values(FX_WORDS).some(r=>r!==re&&r.test(c)));
  if(i<0) i=parts.findIndex(c=>re.test(c)); return i<0?null:pick(i); }
/* "add some reverb" / "more delay": raise it, never lower it. Not when a number, set, less, too wet or dry was said for it. */
function fxAddOnly(c){ return !!c&&/\b(add|more|some|extra|boost|increase|zyada|jyada)\b/.test(c)&&!/\d|\b(set|less|lower|reduce|down|remove|no|cut|kam|too|dry|drier|off|kill|drop)\b/.test(c); }
/* "remove the reverb from the chords", "take the delay off the bass", "kill the reverb", "no reverb on the chords": the effect word, else null */
function fxOffSaid(text,t){ const r=fxPartSaid(text,t); return r&&r.fx||null; }
/* a clause aims remove/delete/get rid of at part t itself ("remove the melody and turn off the reverb"): the part goes, the effect clause doesn't stop it */
function removesPart(text,t){ const r=fxPartSaid(text,t); return !!(r&&r.aimed); }
function fxPartSaid(text,t){ const FXW='reverb|verb|delay|echo|sidechain|side chain|compression|compressor|drive|saturation|distortion|width|low ?cut|high ?cut|effects?|fx';
  const R1=new RegExp('\\b(?:remove|take off|take out|kill|lose|drop|get rid of|turn off|switch off|delete|no|without)(?: the| any| all the| all| my| that)? ('+FXW+')\\b'), R2=new RegExp('\\btake (?:the |all the |that )?('+FXW+') (?:off|out)\\b');
  const RW=typeof ROLE_WORDS!=='undefined'?ROLE_WORDS:[], part=c=>RW.find(([k,re])=>re.test(c)), off=c=>{ const m=(' '+c+' ').match(R1)||(' '+c+' ').match(R2); return m?(m[1]==='verb'?'reverb':m[1]):null; };
  const cl=String(text||'').toLowerCase().split(/\s*(?:[,;.]|\band then\b|\bthen\b|\band\b|\bbut\b|\balso\b)\s*/).filter(x=>x.trim());
  /* the clause that names THIS part decides (QA, 16 Nov: "remove the melody and turn off the reverb" kept the melody):
     "remove/delete/get rid of the melody" removes it; "remove the reverb from the chords" turns the effect off. A half with no verb ("…and the bass") reads with the half before it. */
  if(t){ const rre=(RW.find(([r])=>r===t.role)||[])[1], nm=t.name&&t.name.length>2?t.name.toLowerCase():null, names=c=>!!(rre&&rre.test(' '+c+' ')||nm&&c.includes(nm));
    const VERB=/\b(remove|delete|kill|lose|drop|get rid|take|turn|switch|no|without|cut|mute|add|make|put|give|set)\b/, RM=/\b(remove|delete|kill|lose|drop|get rid of|take out|take off|take away|bin|scrap|ditch|clear|erase)\b/;
    let named=false;
    for(let i=0;i<cl.length;i++){ if(!names(cl[i])) continue; named=true; let c=cl[i];
      /* "delete the drums and the bass": the verbless half borrows the verb of the half before it */
      if(!VERB.test(c)) for(let j=i-1;j>=0;j--){ const v=cl[j].match(/\b(remove|delete|kill|lose|drop|get rid of|take out|take off|turn off|switch off|no|without|mute)\b/); if(v){ c=v[1]+' '+c; break; } if(VERB.test(cl[j])) break; }
      const fw=off(c), p=part(' '+c+' ');
      /* the remove verb is aimed at the part itself ("remove the melody", "delete the bass", "remove the melody without the reverb"), not at an effect on it */
      const aimed=[...c.matchAll(new RegExp(RM.source,'g'))].some(m=>{ const after=c.slice(m.index+m[0].length).replace(/^\s*((the|my|that|this|those|these|all|whole|entire|current|new)\s+)*/,'');
        const pm=rre&&after.match(new RegExp('^'+rre.source.replace(/^\\b/,'')))||nm&&after.startsWith(nm)&&[nm]; if(!pm) return false;
        /* "remove the chords reverb", "remove the melody's reverb": the effect is the object, not the part */
        return !new RegExp("^(['’]s|s['’])?\\s*("+FXW+")\\b").test(after.slice(pm[0].length)); });
      if(aimed) return {aimed:true}; if(fw&&(!p||p[0]===t.role||names(c))) return {fx:fw};
      const fx2=RM.test(c)&&(c.match(new RegExp('\\b('+FXW+')\\b'))||[])[1]; if(fx2) return {fx:fx2==='verb'?'reverb':fx2}; }
    if(named) return null; }
  /* no clause names this part: an effect-off clause that names no part at all ("remove the reverb") */
  for(const c of cl){ const fw=off(c); if(fw&&!part(' '+c+' ')) return {fx:fw}; }
  return null; }
function runActions(list){
  const done=[], songDone=[], kinds=[]; let changed=false; BATCH={startBpm:CTRL.bpm,notes:[]}; if(typeof undoBoundary==='function') undoBoundary(); const last0=typeof UNDO!=='undefined'?UNDO.last:null;
  /* done.segs[i]: which half of a two-part sentence each result came from (offline "mute the drums and solo the bass") */
  done.segs=[]; const u0=typeof UNDO!=='undefined'?(UNDO.pushes||0):-1;
  const acts=orderActions((list||[]).map(normAction).filter(a=>a&&ACT[a.type])), before=songSnapshot();
  SONG.batch=true; SONG.batchChip=null; BATCH.acting=true;
  try{ for(const a of acts){ try{ const r=ACT[a.type](a); if(r){ done.push(r); done.segs.push(a.seg); kinds.push([a.type,r]); changed=true; if(SONG_ACTS.has(a.type)||(a.type==='transport'&&a.from!=null)) songDone.push(r); } }catch(e){ console.warn('action failed',a,e); } } }
  finally{ BATCH.acting=false; }
  /* new sections are numbered in song order once every action has run, so the AI's later actions still find "Drop 3" by the name it gave */
  try{ if(BATCH.renum){ const ren=songRenumber(BATCH.renum); if(ren&&ren.size){ const d2=songRenamed(done,ren), s2=songRenamed(songDone,ren); done.splice(0,done.length,...d2); songDone.splice(0,songDone.length,...s2); BATCH.notes.forEach(n=>{ n.text=songRenamed([n.text],ren)[0]; }); } } }
  finally{ SONG.batch=false; }
  if(changed){ saveProject(); renderTracks(); uiLoop(); }
  /* one request is one Undo step, even when a slow machine saves the parts more than 120 ms apart (QA, 16 Nov: "add a melody" left 2 steps).
     Count the steps this request pushed (the history drops its oldest step at 120, so its length can stay the same): keep the first, drop the rest. */
  const n=u0>=0?(UNDO.pushes||0)-u0:0; if(n>1&&UNDO.stack.length>1){ UNDO.stack.splice(Math.max(1,UNDO.stack.length-(n-1))); if(typeof undoButtons==='function') undoButtons(); }
  /* a request whose edits changed nothing (it was already like that): the reply must not say "Done" or claim changes (QA fix 2) */
  const edits=kinds.filter(([t])=>!NOOP_NEUTRAL.has(t));
  if(changed&&last0!=null&&typeof UNDO!=='undefined'&&UNDO.last===last0&&edits.length&&edits.every(([t])=>NOOP_PURE.has(t))) BATCH.same=edits.filter(([t,r])=>/^(transition|parts)$/.test(t)&&!/\bstays\b/.test(r)).map(x=>x[1]).slice(0,2);
  /* the song view flashes what changed and shows one Undo chip for the whole request; the reply bubble gets a small song map */
  if(songDone.length){ const text=songDone.join(' · ').slice(0,180), after=songSnapshot(); let ch={sections:[],parts:[]};
    if(after!==before) ch=songFlashDiff(before,text)||ch; else songChip(text,{undo:false});
    BATCH.song={changed:[...new Set(ch.sections.concat(ch.parts.map(p=>p[0])))]}; }
  return done;
}
