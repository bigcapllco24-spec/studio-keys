
/* ---------- sampled instruments (embedded, decoded on first use) ---------- */
let SAMPLE_JSON=null;
function sampleData(){ if(!SAMPLE_JSON){ try{ SAMPLE_JSON=JSON.parse($('#samples').textContent); }catch(e){ SAMPLE_JSON={}; } } return SAMPLE_JSON; }
let DEC=null;
function decoder(){ if(!DEC){ const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext; DEC=new OAC(2,1,44100); } return DEC; }
function b64bytes(s){ const bin=atob(s), n=bin.length, u=new Uint8Array(n); for(let i=0;i<n;i++) u[i]=bin.charCodeAt(i); return u.buffer; }
function makeLoopable(buf,a,b,xf){
  const sr=buf.sampleRate, A0=Math.floor(a*sr), B0=Math.min(buf.length-1,Math.floor(b*sr)), X=Math.floor(xf*sr);
  for(let ch=0;ch<buf.numberOfChannels;ch++){ const d=buf.getChannelData(ch); for(let i=0;i<X;i++){ const t=i/X, p=B0-X+i, q=A0-X+i; d[p]=d[p]*Math.cos(t*Math.PI/2)+d[q]*Math.sin(t*Math.PI/2); } }
  buf._ls=a; buf._le=B0/sr;
}
const LOADED={}, LOADING={};
const SUSTAIN_SETS=/^(strings|choir|brass|flute|sax|trumpet|cello|shanai)$/;
const loadOpts=set=>({loop:SUSTAIN_SETS.test(set)});
function loadSet(key,opts={}){
  if(LOADED[key]) return Promise.resolve(LOADED[key]);
  if(LOADING[key]) return LOADING[key];
  const raw=sampleData()[key]; if(!raw) return Promise.reject(new Error('missing '+key));
  LOADING[key]=Promise.all(Object.entries(raw).map(([k,v])=>decoder().decodeAudioData(b64bytes(v)).then(buf=>[k,buf]))).then(list=>{
    const map={}; let peak=0;
    list.forEach(([k,buf])=>{ for(let ch=0;ch<buf.numberOfChannels;ch++){ const d=buf.getChannelData(ch); for(let i=0;i<d.length;i+=2){ const a=d[i]<0?-d[i]:d[i]; if(a>peak) peak=a; } } });
    const gain=(!/^kit/.test(key) && peak>0.001)?0.8/peak:1; /* level every melodic set to the same peak */
    list.forEach(([k,buf])=>{ if(gain!==1) for(let ch=0;ch<buf.numberOfChannels;ch++){ const d=buf.getChannelData(ch); for(let i=0;i<d.length;i++) d[i]*=gain; }
      if(opts.loop && buf.duration>2.5) makeLoopable(buf,1.0,buf.duration-0.25,0.3); map[k]=buf; });
    const roots=Object.keys(map).map(Number).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
    LOADED[key]={map,roots}; delete LOADING[key];
    document.querySelectorAll(`.card[data-set="${key}"] .ds`).forEach(el=>el.dataset.loading='');
    return LOADED[key];
  }).catch(e=>{ delete LOADING[key]; console.warn('sample load failed',key,e); throw e; });
  return LOADING[key];
}
function playMulti(def,c,dest,n,v,t){
  const set=LOADED[def.set];
  if(!set){ loadSet(def.set,loadOpts(def.set)).catch(()=>{}); return def.fallback(c,dest,n,v,t); }
  let r=set.roots[0], bd=99; for(const x of set.roots){ const d=Math.abs(x-n); if(d<bd){ bd=d; r=x; } }
  const buf=set.map[r], rate=Math.pow(2,(n-r)/12), V=new Voice(c,dest), s=V.src(c.createBufferSource());
  s.buffer=buf; s.playbackRate.value=rate;
  if(def.sustain && buf._le){ s.loop=true; s.loopStart=buf._ls; s.loopEnd=buf._le; }
  const g=gainN(c,0), peak=def.gain*(0.12+0.88*Math.pow(v,1.4));
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+def.att);
  if(def.velFilter){ const lp=filt(c,'lowpass',Math.min(18000,900+17000*v*v),0.5); s.connect(lp).connect(g); } else s.connect(g);
  g.connect(V.amp); s.start(t);
  V.rel=def.rel; if(!s.loop) V.stopAt(t+buf.duration/rate+0.02);
  return V;
}
const KIT_SAMPLE={kick:'kick',snare:'snare',hatC:'hihat',hatP:'hihat',tomF:'tom3',tomF2:'tom3',tomL:'tom2',tomM:'tom2',tomH:'tom1',tomH2:'tom1'};
function playKit(def,c,dest,n,v,t){
  const set=LOADED[def.set], piece=drumPiece(n), sk=KIT_SAMPLE[piece];
  if(!set){ loadSet(def.set).catch(()=>{}); }
  if(!set || !sk || !set.map[sk]) return playDrum(c,dest,n,v,t);
  const V=new Voice(c,dest), s=V.src(c.createBufferSource()), buf=set.map[sk]; V.oneShot=true; V.piece=piece;
  s.buffer=buf; const g=gainN(c,def.gain*(0.15+0.85*Math.pow(v,1.2))); s.connect(g).connect(V.amp); s.start(t);
  let end=t+buf.duration+0.02;
  if(piece==='kick'){ /* sub layer so sampled kicks hit with real low end */
    const o=V.src(osc(c,'sine',52)); o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(48,t+0.04);
    const sg=gainN(c,0); sg.gain.setValueAtTime(0,t); sg.gain.linearRampToValueAtTime(0.55*v,t+0.003); sg.gain.setTargetAtTime(0,t+0.03,0.09);
    o.connect(sg).connect(V.amp); o.start(t); end=Math.max(end,t+0.55); }
  V.stopAt(end); return V;
}
function sampled(id,name,cat,desc,set,o){ const def=Object.assign({att:0.003,rel:0.25,gain:0.9,sustain:SUSTAIN_SETS.test(set),velFilter:false},o,{set}); return {id,name,cat,desc,set,sampled:true,fxp:o.fxp||'keys',role:o.role,play:(c,d,n,v,t)=>playMulti(def,c,d,n,v,t),gm:o.gm||0}; }
function kit(id,name,desc,set,gain,o={}){ const def={set,gain}; return {id,name,cat:'Drums',desc,set,sampled:true,drums:true,percussive:true,fxp:'drums',gm:0,play:(c,d,n,v,t)=>playKit(def,c,d,n,v,t)}; }
function synKit(id,name,desc,kitId){ return {id,name,cat:'Drums',desc,drums:true,percussive:true,fxp:'drums',gm:0,play:(c,d,n,v,t)=>playSynKit(kitId,c,d,n,v,t)}; }
function synth(id,name,cat,desc,play,fxp,gm){ return {id,name,cat,desc,play,fxp,gm}; }

const BUILTIN=[
  sampled('piano','Grand Piano','Keys','Salamander Yamaha C5, sampled','piano',{rel:0.32,velFilter:true,gain:1.4,fallback:playPiano,gm:0,fxp:'piano'}),
  sampled('epiano','Electric Piano','Keys','Sampled tine piano','epiano',{rel:0.3,gain:0.65,fallback:playEP,gm:4,fxp:'epiano'}),
  synth('organ','Drawbar Organ','Keys','Full drawbars; mod wheel adds vibrato',playOrgan,'organ',16),
  sampled('vibes','Vibraphone','Keys','Soft mallets with a long ring','vibes',{rel:0.9,gain:1.0,fallback:playEP,gm:11,fxp:'mallet'}),
  sampled('marimba','Marimba','Keys','Warm wooden bars','marimba',{rel:0.4,gain:1.0,fallback:playPluck,gm:12,fxp:'mallet'}),
  sampled('kalimba','Kalimba','Keys','Thumb piano with soft tines','kalimba',{rel:0.5,gain:1.0,fallback:playPluck,gm:108,fxp:'mallet'}),
  sampled('strings','Strings','Orchestra','Ensemble strings, holds while you do','strings',{att:0.09,rel:0.6,gain:0.85,fallback:playPad,gm:48,fxp:'strings'}),
  sampled('cello','Cello','Orchestra','Solo cello, bowed','cello',{att:0.06,rel:0.4,gain:1.0,fallback:playPad,gm:42,fxp:'strings'}),
  sampled('harp','Harp','Orchestra','Concert harp','harp',{rel:0.8,gain:1.0,fallback:playPluck,gm:46,fxp:'strings'}),
  sampled('choir','Choir','Orchestra','“Aah” choir','choir',{att:0.14,rel:0.7,gain:1.1,fallback:playPad,gm:52,fxp:'choir'}),
  sampled('brass','Brass','Winds & brass','Brass section','brass',{att:0.03,rel:0.25,gain:0.95,fallback:playSuperSaw,gm:61,fxp:'brass'}),
  sampled('trumpet','Trumpet','Winds & brass','Solo trumpet','trumpet',{att:0.03,rel:0.2,gain:1.0,fallback:playLead,gm:56,fxp:'brass'}),
  sampled('sax','Alto Sax','Winds & brass','Smooth alto saxophone','sax',{att:0.03,rel:0.2,gain:1.0,fallback:playLead,gm:65,fxp:'brass'}),
  sampled('flute','Flute','Winds & brass','Breathy concert flute','flute',{att:0.05,rel:0.25,gain:1.0,fallback:playLead,gm:73,fxp:'world'}),
  sampled('sitar','Sitar','World','Plucked sitar with sympathetic shimmer','sitar',{rel:0.6,gain:1.0,fallback:playPluck,gm:104,fxp:'world'}),
  sampled('shanai','Shehnai','World','Double-reed shehnai','shanai',{att:0.04,rel:0.2,gain:1.0,fallback:playLead,gm:111,fxp:'world'}),
  sampled('steeldrum','Steel Drums','World','Caribbean steel pan','steeldrum',{rel:0.5,gain:1.0,fallback:playEP,gm:114,fxp:'mallet'}),
  sampled('guitar','Nylon Guitar','Guitar','Plucked classical guitar','guitar',{rel:0.35,gain:1.1,fallback:playPluck,gm:24,fxp:'guitar'}),
  sampled('eguitar','Clean Electric Guitar','Guitar','Clean electric, chorus-friendly','eguitar',{rel:0.3,gain:1.0,fallback:playPluck,gm:27,fxp:'guitar'}),
  synth('lead','Analog Lead','Synth','Two detuned saws through a resonant filter',playLead,'lead',81),
  synth('supersaw','Super Saw','Synth','Seven-voice detuned stack for big chords',playSuperSaw,'supersaw',81),
  synth('pad','Warm Pad','Synth','Slow attack with a drifting filter',playPad,'pad',89),
  synth('pluck','String Pluck','Synth','Physically modeled plucked string',playPluck,'pluck',46),
  synth('mhpluck','Melodic Pluck','Synth','Bright detuned pluck for melodic house arps and hooks',playMHPluck,'pluck',81),
  synth('darkpad','Deep Pad','Synth','Dark, slowly breathing pad for melodic techno',playDarkPad,'pad',89),
  synth('rollbass','Rolling Bass','Bass','Analog-style sequenced bass for melodic techno',playRollBass,'bass',39),
  synth('bass808','808 Bass','Bass','Deep sine sub with saturation; trap and drill',play808,'bass',38),
  synth('moog','Moog-style Bass','Bass','Fat filtered saws with a sub underneath',playMoog,'bass',39),
  synth('reese','Reese Bass','Bass','Wide detuned saws for drum & bass',playReese,'bass',39),
  synth('pluckbass','Pluck Bass','Bass','Short square pluck for house and pop',playPluckBass,'bass',38),
  synth('subbass','Sub Bass','Bass','Pure sub with a touch of harmonics',playSubBass,'bass',38),
  synth('acid','Acid Bass','Bass','Squelchy resonant saw',playAcid,'bass',39),
  sampled('bass','Finger Bass','Bass','Sampled electric bass','bass',{rel:0.12,gain:1.15,fallback:playSub,gm:33,fxp:'bass'}),
  sampled('slapbass','Slap Bass','Bass','Sampled slap bass','slapBass',{rel:0.12,gain:1.1,fallback:playSub,gm:36,fxp:'bass'}),
  sampled('acbass','Upright Bass','Bass','Sampled acoustic bass','acBass',{rel:0.15,gain:1.1,fallback:playSub,gm:32,fxp:'bass'}),
  sampled('synbass','Synth Bass','Bass','Classic synth bass','synBass',{rel:0.12,gain:1.0,fallback:playMoog,gm:38,fxp:'bass'}),
  synKit('kit808','808 Kit','Boomy sub kick, snappy snare, crisp hats','k808'),
  synKit('kit909','909 House Kit','Punchy kick with click, open and closed hats','k909'),
  synKit('kitMelodic','Melodic House Kit','Round deep kick, soft clap, shuffled hats, shaker','melodic'),
  synKit('kitDeepTechno','Deep Techno Kit','Rumbling kick, dry hats, driving ride','techno'),
  synKit('kitTrap','Trap Kit','Long 808 kick, clap-snare, tight hats for rolls','trap'),
  kit('kitAcoustic','Acoustic Kit','Sampled kick, snare, hats and toms','kitAcoustic',1.0),
  kit('kitTechno','Techno Kit','Punchy drum-machine samples','kitTechno',1.0),
  kit('kitLinn','LinnDrum Kit','Classic 80s drum machine','kitLinn',1.1),
  kit('kitKit8','Hip-hop Kit','Dusty boom-bap samples','kitKit8',1.1),
  kit('kitKit3','Studio Kit','Tight modern studio kit','kitKit3',1.1),
  kit('kitKPR77','KPR-77 Kit','Vintage analog machine','kitKPR77',1.1),
  kit('kitR8','R-8 Kit','Late-80s digital kit','kitR8',1.1),
  kit('kitStark','Stark Kit','Hard, bright electronic kit','kitStark',1.0),
  kit('kitFM','FM Kit','Metallic FM-synth drums','kitFM',1.0),
  kit('kitBongos','Bongos & Percussion','Hand percussion for afro and world grooves','kitBongos',1.1),
  {id:'drums',name:'Synth Kit',cat:'Drums',desc:'Synthesized GM kit with clap, cowbell and cymbals',play:playDrum,drums:true,percussive:true,fxp:'drums',gm:0}
];
const CAT_ORDER=['Keys','Orchestra','Winds & brass','World','Guitar','Synth','Bass','Drums'];
const CAT_COLOR={Keys:'#2fd39a',Orchestra:'#f0a3b1','Winds & brass':'#e6d29a',World:'#c6e07a',Guitar:'#ef8f8f',Synth:'#7fb8e6',Bass:'#5cc8d0',Drums:'#9fe3c8',Mine:'#b9a3e3'};
/* the effect settings each sound starts with; anything not listed sits at neutral */
const FX_PRESETS={piano:{reverb:0.22},epiano:{reverb:0.18,chorus:0.25},organ:{reverb:0.15,chorus:0.2},mallet:{reverb:0.25,echo:0.1},keys:{reverb:0.2},
  strings:{reverb:0.38},choir:{reverb:0.45},brass:{reverb:0.2},world:{reverb:0.28,echo:0.12},guitar:{reverb:0.2,chorus:0.15},
  lead:{reverb:0.18,echo:0.25},supersaw:{reverb:0.3,echo:0.15,chorus:0.2},pad:{reverb:0.45,chorus:0.3},pluck:{reverb:0.25,echo:0.3},
  bass:{},drums:{reverb:0.08}};

/* ---------- registry and Keys / Pads zones ---------- */
const RACK={cat:'All',q:''};
const INST=new Map(), ORDER=[];
BUILTIN.forEach(i=>{ INST.set(i.id,i); ORDER.push(i.id); });
const ZONES=Object.assign({keys:'piano',pads:'kitAcoustic'},store.get('zones',{}));
const zoneInst=z=>INST.get(ZONES[z])||INST.get(z==='pads'?'kitAcoustic':'piano');
const currentInst=()=>zoneInst('keys');
function setZone(zone,id,opts={}){
  if(!INST.has(id)) return;
  const wasDrums=!!zoneInst('keys').drums; ZONES[zone]=id; store.set('zones',ZONES);
  const inst=INST.get(id); if(inst.set) loadSet(inst.set,loadOpts(inst.set)).catch(()=>{});
  const ds=primarySettings(); if(ds){ ds.zones=Object.assign({},ZONES); saveDevices(); }
  updateZoneUI();
  if(!opts.keepFx) applyFxPreset(zone,inst);
  if(zone==='keys' && wasDrums!==!!inst.drums) renderKeyboard();
  if(zone==='pads') renderPads();
  if(opts.announce) toast(`${inst.name} loaded on the ${zone}`);
}
const setInstrument=(id,opts)=>setZone('keys',id,opts);
function cycleInstrument(dir){ const i=ORDER.indexOf(ZONES.keys); setZone('keys',ORDER[(i+dir+ORDER.length)%ORDER.length],{announce:true}); }
function updateZoneUI(){
  const k=zoneInst('keys'), p=zoneInst('pads');
  $('#zKeysName').textContent=k.name; $('#zPadsName').textContent=p.name;
  $('#zKeysSub').textContent=k.cat+' · drop a sound here'; $('#zPadsSub').textContent=`Channel ${padCh()} · drop a sound here`;
  $('#lcdSub').textContent='KEYS '+k.name; $('#lcdSub2').textContent='PADS '+p.name;
  $('#padsLbl').textContent=`Pads · ch ${padCh()} · ${p.name}`;
  $('#routeHint').textContent=`Keys → ${k.name} · Pads (channel ${padCh()}) → ${p.name}`;
  if(typeof renderMixer==='function'&&A) renderMixer();
  document.querySelectorAll('.card').forEach(cd=>{ const id=cd.dataset.id; cd.classList.toggle('k',id===ZONES.keys); cd.classList.toggle('p',id===ZONES.pads);
    cd.querySelector('.zb.k').setAttribute('aria-pressed',String(id===ZONES.keys)); cd.querySelector('.zb.p').setAttribute('aria-pressed',String(id===ZONES.pads)); });
}
function renderRack(){
  const mk=inst=>{ const i=ORDER.indexOf(inst.id), k=i<10?String((i+1)%10):'', loading=inst.set&&!LOADED[inst.set];
    return `<div class="card" draggable="true" style="--cc:${CAT_COLOR[inst.cat]||'#9b7bff'}" data-id="${inst.id}"${inst.set?` data-set="${inst.set}"`:''}><button class="inst" type="button" data-id="${inst.id}" title="Load on the keys"><span class="nm">${esc(inst.name)}</span>${k?`<span class="kbd" title="Computer key">${k}</span>`:'<span></span>'}<span class="ds">${esc(inst.desc)}</span></button><div class="card-z"><button class="zb k" type="button" data-zone="keys" data-id="${inst.id}" aria-pressed="false">Keys</button><button class="zb p" type="button" data-zone="pads" data-id="${inst.id}" aria-pressed="false">Pads</button></div>${inst.custom?`<button class="del" type="button" data-del="${inst.id}" aria-label="Delete ${esc(inst.name)}" title="Delete">×</button>`:''}</div>`; };
  $('#catTabs').innerHTML=['All',...CAT_ORDER].map(c=>`<button class="tab" type="button" role="tab" data-cat="${c}" aria-selected="${RACK.cat===c}">${c}</button>`).join('');
  const q=RACK.q.trim().toLowerCase(); let h='';
  CAT_ORDER.forEach(cat=>{ if(RACK.cat!=='All'&&RACK.cat!==cat) return; const list=BUILTIN.filter(i=>i.cat===cat&&(!q||(i.name+' '+i.desc+' '+cat).toLowerCase().includes(q))); if(list.length) h+=`<div class="cat-h">${cat}</div>`+list.map(mk).join(''); });
  $('#builtinGrid').innerHTML=h||'<div class="custom-empty">No sounds match that search.</div>';
  const customs=ORDER.map(id=>INST.get(id)).filter(i=>i.custom);
  $('#customGrid').innerHTML=customs.length?customs.map(mk).join(''):'<div class="custom-empty">Sounds you extract in the Sound Lab land here, ready for your keys or pads.</div>';
  if(!INST.has(ZONES.keys)) ZONES.keys='piano'; if(!INST.has(ZONES.pads)) ZONES.pads='kitAcoustic';
  updateZoneUI();
}
$('#catTabs').addEventListener('click',e=>{ const t=e.target.closest('[data-cat]'); if(t){ RACK.cat=t.dataset.cat; renderRack(); } });
$('#soundSearch').addEventListener('input',e=>{ RACK.q=e.target.value; renderRack(); });
document.addEventListener('click',e=>{
  const zb=e.target.closest('.zb'); if(zb){ ensureAudio(); setZone(zb.dataset.zone,zb.dataset.id,{announce:true}); return; }
  const b=e.target.closest('.inst'); if(b){ ensureAudio(); setZone('keys',b.dataset.id); return; }
  const d=e.target.closest('[data-del]'); if(d) deleteCustom(d.dataset.del);
});
/* drag a card onto a zone, the keybed or the pads */
(function(){
  let dragId=null;
  document.addEventListener('dragstart',e=>{ const cd=e.target.closest&&e.target.closest('.card'); if(!cd) return; dragId=cd.dataset.id; cd.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',dragId); e.dataTransfer.effectAllowed='copy'; }catch(_){} });
  document.addEventListener('dragend',e=>{ document.querySelectorAll('.dragging,.over').forEach(x=>x.classList.remove('dragging','over')); dragId=null; });
  const targets=[['#zoneKeys','keys'],['#zonePads','pads'],['#keyboard','keys'],['#padsDrop','pads']];
  targets.forEach(([sel,zone])=>{ const el=$(sel);
    el.addEventListener('dragover',e=>{ if(!dragId) return; e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave',()=>el.classList.remove('over'));
    el.addEventListener('drop',e=>{ e.preventDefault(); el.classList.remove('over'); const id=dragId||e.dataTransfer.getData('text/plain'); if(id){ ensureAudio(); setZone(zone,id,{announce:true}); } });
  });
})();
