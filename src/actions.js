
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
const pickStyle=s=>{ if(!s) return null; if(STYLES[s]) return s; const k=String(s).toLowerCase().replace(/[^a-z0-9& ]+/g,'').replace(/\s+/g,''); if(STYLES[k]) return k; return (STYLE_WORDS.find(([key,re])=>re.test(' '+String(s).toLowerCase()+' '))||[])[0]||null; };
let BATCH={}; const LAST_TEXT={text:''}; const LAST_TAKE={part:null};
const newSeed=()=>1+Math.floor(Math.random()*2e9);
function tasteArtist(){ const p=TASTE.profile; if(!p||!p.artists) return null; for(const a of p.artists){ const A=findArtist(a); if(A) return A; } return null; }
/* style + artist for a request: named artist > named style > the song's vibe > the person's taste > house */
function resolveVibe(a){
  /* the AI sometimes invents a reference; only switch away from the song's vibe when the user actually named it */
  const said=normName(LAST_TEXT.text||''), named_=x=>{ const k=normName(x||''); return !said||!k||said.includes(k.split(' ')[0])||(findArtist(x)&&findArtist(x).names.some(n=>said.includes(normName(n)))); };
  if(PROJ.ref&&(a.ref||a.artist||a.like)&&!named_(a.ref||a.artist||a.like)){ a=Object.assign({},a,{ref:undefined,artist:undefined,like:undefined}); }
  if(PROJ.style&&a.style&&pickStyle(a.style)!==PROJ.style&&said&&!STYLE_WORDS.some(([k,re])=>k===pickStyle(a.style)&&re.test(' '+said+' '))) a=Object.assign({},a,{style:undefined});
  let artist=findArtist(a.ref||a.artist||a.like); let named=artist?null:pickStyle(a.style); /* a known artist decides the style; the AI's style guess is ignored */
  const pl=typeof findPlaylist==='function'?findPlaylist(a.playlist||(/playlist/i.test(a.ref||a.like||'')?(a.ref||a.like):null)):null;
  if(pl){ artist=artist||pl.artists.map(findArtist).find(Boolean)||null; named=named||pl.style||(artist&&artist.style)||null; }
  if(!artist&&!named&&PROJ.ref) artist=findArtist(PROJ.ref);
  if(!artist&&!named&&!PROJ.style) artist=tasteArtist();
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
    const g=makeGroove(rec,L_(),seed);
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
    regenTrack(t,{seed:a.fresh?undefined:t.seed,recipe:over});
    if(over.swing===undefined) return `Groove: ${t.desc}`;
    const sw=swingWords(+t.recipe.swing||0,prev); return Object.keys(over).length>1?`${sw}; ${t.desc}`:sw; },
  vary(a){ const t=findTrack(a.track||'drums'); if(!t) return;
    if(!t.gen){ return `${t.name} is your own part, so I left it as it is`; }
    if(t.role==='chords'&&a.progression!==false){ ensureProg(true); PROJ.tracks.filter(x=>x.gen&&(x.role==='bass'||x.role==='chords'||x.role==='melody')).forEach(x=>regenTrack(x)); return `New chord progression (${PROJ.prog.map(d=>['i','ii','iii','iv','v','vi','vii'][d]).join('–')}); bass and melody follow it`; }
    const d=regenTrack(t); return d?`${t.name}: ${d}`:null; },
  add_bass(a){ const {s,artist}=resolveVibe(a); adoptVibe(s,artist,a); ensureProg(); const id=resolveInst(a.instrument,'bass')||(artist&&artist.sounds.bass)||STYLES[s].bass, I=loadI(id), seed=+a.seed||newSeed();
    addPart({role:'bass',inst:id,gen:true,name:'Bassline',events:genBass(s,L_(),seed),seed,style:s,ref:artist?artist.name:undefined},Object.assign({},a,{replace:a.replace!==false&&!a.new})); return `Bassline on ${I.name} in ${keyName(projectKey())}`; },
  add_chords(a){ const {s,artist}=resolveVibe(a); adoptVibe(s,artist,a); ensureProg(); const id=resolveInst(a.instrument,'keys')||(artist&&artist.sounds.chords)||STYLES[s].chords, I=loadI(id), seed=+a.seed||newSeed();
    const held=/choir|strings|pad|organ|cello|brass|darkpad/i.test(id+' '+I.name), cs=held&&!/pads|seventh|sustain/.test(STYLES[s].chordStyle)?'pads':undefined;
    const t=addPart({role:'chords',inst:id,gen:true,name:a.instrument?I.name:'Chords',events:genChords(s,L_(),seed,cs),seed,style:s,ref:artist?artist.name:undefined},a); return `${t.name} (${t.isNew?'new track':'replaced'}) on ${I.name} in ${keyName(projectKey())}`; },
  add_melody(a){ const {s,artist}=resolveVibe(a); adoptVibe(s,artist,a); ensureProg(); const id=resolveInst(a.instrument,'keys')||(artist&&artist.sounds.lead)||STYLES[s].lead||'lead', I=loadI(id), seed=+a.seed||newSeed();
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
  mix(a){ const ref=String(a.track||'').toLowerCase(); const id=['master','keys','pads'].includes(ref)?ref:(findTrack(a.track)||{}).id; if(!id) return; const cfg=chCfg(id); const out=[];
    if(a.volume!=null){ chSet(id,'vol',clamp(+a.volume/100,0,1)); out.push(`volume ${Math.round(cfg.vol*100)}`); }
    if(a.change!=null){ chSet(id,'vol',clamp(cfg.vol+(+a.change)/100,0,1)); out.push(`volume ${Math.round(cfg.vol*100)}`); }
    ['low','mid','high'].forEach(b=>{ if(a[b]!=null){ chSet(id,{low:'lo',mid:'mid',high:'hi'}[b],clamp(+a[b],-15,15)); out.push(`${b} ${a[b]>0?'+':''}${a[b]} dB`); } });
    if(a.mute!=null){ cfg.mute=!!a.mute; chApply(id); out.push(a.mute?'muted':'unmuted'); }
    if(a.solo!=null){ cfg.solo=!!a.solo; refreshTrackGains(); out.push(a.solo?'solo':'solo off'); }
    return `${chName(id)}: ${out.join(', ')||'unchanged'}`; },
  fx(a){ const want=String(a.effect||'').toLowerCase().replace(/[-_]/g,' '); const type=Object.keys(FX_LIB).find(k=>FX_LIB[k].name.toLowerCase()===want||k===want.replace(/ /g,''))||Object.keys(FX_LIB).find(k=>FX_LIB[k].name.toLowerCase().includes(want)||want.includes(k));
    if(!type) return; let i=FX.slots.findIndex(s=>s.type===type); if(i<0){ i=7; FX.setType(i,type); } FX.set(i,clamp((+a.amount)/100,0,1)); return `${FX_LIB[type].name} ${Math.round(FX.slots[i].amount*100)}%`; },
  remove(a){ const t=findTrack(a.track||a.value); if(!t) return; removeTrack(t.id); return `Removed ${t.name}`; },
  quantize(a){ const t=findTrack(a.track); if(!t) return; const q=+a.grid||0.25; t.events.forEach(e=>{ e.b=Math.round(e.b/q)*q; e.d=Math.max(q,Math.round(e.d/q)*q); }); return `Quantized ${t.name}`; },
  transpose(a){ const t=findTrack(a.track); if(!t||(INST.get(t.inst)||{}).percussive) return; const s=Math.round(+a.semitones||0); t.events.forEach(e=>e.n+=s); return `${t.name} ${s>0?'up':'down'} ${Math.abs(s)}`; },
  transport(a){ const d=String(a.do||a.value||'').toLowerCase(); if(/stop|pause/.test(d)){ loopStop(); return 'Stopped'; } if(/rec/.test(d)){ recordPress(); return 'Recording'; } if(PROJ.tracks.length && !TR.running){ loopPlay(); return 'Playing'; } },
  sing(a){ const raw=String(a.part||a.role||a.track||'melody').toLowerCase(); const part=/voice|audio|note/.test(raw)&&!/melody/.test(raw)?'voice':/bass/.test(raw)?'bass':/chord|pad|harmon/.test(raw)?'chords':'melody';
    BATCH.take=part; return part==='voice'?`Recording a voice note after the count-in: ${PROJ.bars} bars`:`Sing the ${part==='bass'?'bassline':part==='chords'?'chord roots (one note per chord)':'melody'} after the count-in: ${PROJ.bars} bars`; },
  convert(a){ const t=findTrack(a.track||'melody'); if(!t||t.kind!=='notes'||(INST.get(t.inst)||{}).percussive) return; const to=/bass/.test(a.to||'')?'bass':/chord|pad/.test(a.to||'')?'chords':'melody';
    t.events=shapePart(t.events,to,projectKey()); t.role=to; t.inst=partInst(to); loadI(t.inst); t.gen=false; t.name=(to==='bass'?'Bassline':to==='chords'?'Chords':'Melody')+' (from '+t.name.replace(/^(Sung|Hummed) /,'').toLowerCase()+')';
    return `${t.name} on ${INST.get(t.inst).name}`; },
  again(a){ const p=LAST_TAKE.part; if(!p) return; BATCH.take=p; return `Again: sing the ${p} after the count-in`; },
  track_fx(a){ const t=findTrack(a.track); if(!t) return; const w=String(a.effect||'').toLowerCase();
    const k=/rev|room|hall|space/.test(w)?'rev':/delay|echo/.test(w)?'dly':/side|pump|duck/.test(w)?'duck':/low ?cut|high ?pass|hp|rumble/.test(w)?'hp':/high ?cut|low ?pass|lp|dark|muffle/.test(w)?'lp':/drive|satur|distort|warm|grit/.test(w)?'drive':/comp|glue|punch/.test(w)?'comp':/wid|stereo|spread/.test(w)?'width':/pan/.test(w)?'pan':/preset|default|studio/.test(w)?'preset':null;
    if(!k) return; t.fx=t.fx||{};
    if(k==='preset'){ t.fx=roleFx(t.role,PROJ.style); refreshTrackGains(); return `Studio effects on ${t.name}`; }
    const d=TFX_DEF[k]; if(a.remove||a.amount===0||/off|remove|no /.test(String(a.value||''))){ delete t.fx[k]; refreshTrackGains(); return `${d.name} off on ${t.name}`; }
    const num=x=>x!=null&&x!==''&&isFinite(+x); let v=num(a.amount)?+a.amount:(num(a.change)?null:d.def*100);
    if(d.unit==='Hz'){ v=num(a.hz)?+a.hz:(num(a.amount)&&+a.amount>=20?+a.amount:(k==='hp'?(t.role==='bass'?35:t.role==='drums'?30:180):6000)); t.fx[k]=clamp(Math.round(v),d.min,d.max); }
    else if(k==='pan'){ t.fx.pan=clamp((num(a.amount)?+a.amount:0)/100,-1,1); }
    else { const cur=t.fx[k]||0; t.fx[k]=clamp(v==null?cur+(+a.change)/100:v/100,0,1); }
    if(FXOPEN) FXOPEN.add(t.id); refreshTrackGains();
    return `${d.name} on ${t.name}: ${fxShow(k,t.fx[k])}`; },
  export(a){ const fmt=String(a.format||a.value||'mp3').toLowerCase(); const len=a.minutes?Math.round(+a.minutes*60):a.seconds?+a.seconds:a.loops?Math.min(16,+a.loops):undefined;
    if(!PROJ.tracks.length) return; if(/zip|stem|ableton|wav/.test(fmt)){ exportZip(); return 'Packing the Ableton zip (WAV mix, stems and MIDI)'; } if(/mid/.test(fmt)){ exportMidiOnly(); return 'Downloading the MIDI file'; }
    if(len) { const sel=$('#mp3Len'); if(sel && [...sel.options].some(o=>+o.value===len)) sel.value=String(len); }
    exportMp3(len); return 'Making your MP3, the download starts in a few seconds'; },
  save(a){ if(a.name) PROJ.name=String(a.name).slice(0,60); saveNamed(); return `Saved “${PROJ.name}”`; },
  new_project(a){ newSong(a.name); return 'New song'; },
  rename(a){ if(!a.name) return; PROJ.name=String(a.name).slice(0,60); saveProject(); return `Song renamed to “${PROJ.name}”`; }
};
function runActions(list){
  const done=[]; let changed=false; BATCH={startBpm:CTRL.bpm}; if(typeof undoBoundary==='function') undoBoundary();
  for(const raw of list||[]){ const a=normAction(raw); if(!a||!ACT[a.type]) continue; try{ const r=ACT[a.type](a); if(r){ done.push(r); changed=true; } }catch(e){ console.warn('action failed',a,e); } }
  if(changed){ saveProject(); renderTracks(); uiLoop(); }
  return done;
}
