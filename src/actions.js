
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
const pickStyle=s=>STYLES[s]?s:(STYLE_WORDS.find(([k,re])=>re.test(' '+String(s||'').toLowerCase()+' '))||[])[0]||PROJ.style||'house';
const ACT={
  tempo(a){ const b=+a.bpm||+a.value; if(!b) return; setTempo(b); return `Tempo ${CTRL.bpm} BPM`; },
  bars(a){ setBars(+a.bars||+a.value||4); return `${PROJ.bars} bars`; },
  key(a){ const k=parseKey(a.key||a.value); if(!k) return; setKey(k); return `Key ${keyName(k)}`; },
  style(a){ const s=pickStyle(a.style||a.value); PROJ.style=s; if(a.keepTempo!==true && !a.bpm) setTempo(STYLES[s].bpm); return `${STYLES[s].name} style`; },
  add_drums(a){ const s=pickStyle(a.style); if(a.style||!PROJ.style) PROJ.style=s; const S=STYLES[s]; const kit=resolveInst(a.kit||a.instrument,'drums')||S.kit;
    const I=INST.get(kit); if(I&&I.set) loadSet(I.set).catch(()=>{});
    const hats=a.hats===false||a.hats==='none'?'none':(typeof a.hats==='string'?a.hats:undefined);
    addTrack({role:'drums',inst:kit,zone:'pads',gen:true,name:'Drums',events:drumEvents(s,L_(),hats)},{replaceRole:'drums'});
    return `${S.name} drums on ${INST.get(kit).name}`; },
  hats(a){ const kind=({'8':'8th','8ths':'8th',eighth:'8th','16':'16th','16ths':'16th',sixteenth:'16th',quarters:'quarter','4':'quarter'})[String(a.pattern||a.value||'8th').toLowerCase()]||String(a.pattern||a.value||'8th').toLowerCase();
    let t=findTrack('drums'); const s=pickStyle(a.style), S=STYLES[s];
    if(!t){ t=addTrack({role:'drums',inst:S.kit,zone:'pads',gen:true,name:'Drums',events:[]}); }
    t.events=t.events.filter(e=>!HAT_NOTES.includes(e.n));
    if(kind!=='none' && HATS[kind]) t.events.push(...patternEvents(HATS[kind],L_(),{swing:S.swing||0,trapRolls:kind==='trap',seed:5}));
    t.events.forEach(e=>delete e.cyc); return kind==='none'?'Hi-hats removed':`Hi-hats on ${{'8th':'8th notes','16th':'16th notes',offbeat:'the offbeats',trap:'16ths with rolls',open:'open offbeats',quarter:'quarter notes',shaker:'a shaker groove'}[kind]||kind}`; },
  drum_pattern(a){ const rows=a.rows||a.pattern||{}; const spec={};
    for(const [name,str] of Object.entries(rows)){ const n=DRUM_WORD[String(name).toLowerCase()]||parsePitch(name)||(+name||null); if(n&&typeof str==='string') spec[n]=str.replace(/[^xo.|X-]/g,'').replace(/X/g,'x').replace(/-/g,'.'); }
    if(!Object.keys(spec).length) return; const s=pickStyle(a.style), kit=resolveInst(a.kit,'drums')||(findTrack('drums')||{}).inst||STYLES[s].kit;
    addTrack({role:'drums',inst:kit,zone:'pads',gen:true,name:'Drums',events:patternEvents(spec,L_(),{seed:9})},{replaceRole:'drums'}); return 'Custom drum pattern'; },
  add_bass(a){ const s=pickStyle(a.style); const id=resolveInst(a.instrument,'bass')||STYLES[s].bass; const I=INST.get(id); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{});
    addTrack({role:'bass',inst:id,gen:true,name:'Bassline',events:genBass(s,L_())},{replaceRole:'bass'}); return `Bassline on ${I.name} in ${keyName(projectKey())}`; },
  add_chords(a){ const s=pickStyle(a.style); const id=resolveInst(a.instrument,'keys')||STYLES[s].chords; const I=INST.get(id); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{});
    addTrack({role:'chords',inst:id,gen:true,name:'Chords',events:genChords(s,L_())},{replaceRole:'chords'}); return `Chords on ${I.name} in ${keyName(projectKey())}`; },
  add_melody(a){ const id=resolveInst(a.instrument,'keys')||'lead'; const I=INST.get(id); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{});
    addTrack({role:'melody',inst:id,gen:true,name:'Melody',events:genMelody(L_(),Date.now()%997)},{replaceRole:'melody'}); return `A melody on ${I.name}`; },
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
  sing(){ TAKE.start(); return 'Sing after the count-in'; },
  save(a){ if(a.name) PROJ.name=String(a.name).slice(0,60); saveNamed(); return `Saved “${PROJ.name}”`; },
  new_project(a){ newSong(a.name); return 'New song'; },
  rename(a){ if(!a.name) return; PROJ.name=String(a.name).slice(0,60); saveProject(); return `Song renamed to “${PROJ.name}”`; }
};
function runActions(list){
  const done=[]; let changed=false;
  for(const raw of list||[]){ const a=normAction(raw); if(!a||!ACT[a.type]) continue; try{ const r=ACT[a.type](a); if(r){ done.push(r); changed=true; } }catch(e){ console.warn('action failed',a,e); } }
  if(changed){ saveProject(); renderTracks(); uiLoop(); }
  return done;
}
