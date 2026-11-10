
/* ---------- voice manager (keys and pads zones, looper capture) ---------- */
const active=new Map(), sustained=new Set(), pressed=new Map();
let sustainOn=false;
const CURVES={soft:v=>Math.pow(v,0.6),linear:v=>v,hard:v=>Math.pow(v,1.6),fixed:()=>0.8};
const padPitch=n=>zoneInst('pads').percussive?n:n+24;
function noteOn(note,vel,src,opt={}){
  const c=ensureAudio(); if(!c) return;
  if(c.state!=='running' && src.startsWith('m')) $('#soundBanner').hidden=false;
  const zone=opt.zone||'keys', inst=opt.inst||zoneInst(zone), key=src+':'+note, now=c.currentTime;
  const old=active.get(key); if(old){ old.kill(now); active.delete(key); LOOP.capOff(key); }
  let n=opt.pitch!=null?opt.pitch:note; if(zone==='keys' && !inst.percussive) n+=CTRL.transpose;
  const v=clamp((CURVES[CTRL.curve]||CURVES.linear)(vel/127),0.02,1);
  let voice; try{ voice=inst.play(c,zoneDest(zone),n,v,now); }catch(e){ console.error(e); return; }
  if(!voice) return;
  voice.capKey=key;
  voice.onEnd=()=>{ if(active.get(key)===voice) active.delete(key); sustained.delete(voice); A.openHats.delete(voice); };
  active.set(key,voice);
  if(voice.piece==='hatC'||voice.piece==='hatP'){ A.openHats.forEach(h=>h.kill(now)); A.openHats.clear(); }
  if(voice.piece==='hatO') A.openHats.add(voice);
  if(LIVE.size>56){ const first=LIVE.values().next().value; if(first && first!==voice) first.kill(now); }
  LOOP.capOn(key,n,v,inst.id,zone);
  if(!pressed.has(key)){ pressed.set(key,zone); if(zone==='keys') lit(note,1); }
  if(!src.startsWith('m')) lcd(`${zone==='pads'?'PAD':'NOTE'} ${noteName(note)}  VEL ${vel}`);
}
function noteOff(note,src){
  const key=src+':'+note, z=pressed.get(key);
  if(z!==undefined){ pressed.delete(key); if(z==='keys') lit(note,-1); }
  const v=active.get(key); if(!v){ LOOP.capOff(key); return; }
  active.delete(key);
  if(sustainOn && !v.oneShot) sustained.add(v); else { v.release(A.ctx.currentTime); LOOP.capOff(key); }
}
function setSustain(on){ sustainOn=on; $('#susLed').className='led'+(on?' amber':''); if(!on && A.ctx){ const t=A.ctx.currentTime; sustained.forEach(v=>{ v.release(t); LOOP.capOff(v.capKey); }); sustained.clear(); } }
function panic(){ if(A.ctx){ const t=A.ctx.currentTime; LIVE.forEach(v=>v.kill(t)); } active.clear(); sustained.clear(); pressed.clear(); KB.lit.clear(); KB.pl.clear(); KB.els.forEach(el=>el.classList.remove('on','pl')); setSustain(false); }

/* ---------- controls ---------- */
function setVolume(v){ CTRL.volume=clamp(v,0,100); saveCtrl(); $('#ctl-volume').value=CTRL.volume; $('#val-volume').textContent=Math.round(CTRL.volume)+'%'; applyVolume(); }
function setCurve(v){ CTRL.curve=v; saveCtrl(); $('#ctl-curve').value=v; $('#val-curve').textContent=v[0].toUpperCase()+v.slice(1); const ds=primarySettings(); if(ds){ ds.curve=v; saveDevices(); } }
$('#ctl-volume').addEventListener('input',e=>setVolume(+e.target.value));
$('#ctl-curve').addEventListener('change',e=>setCurve(e.target.value));
function setTranspose(v){ CTRL.transpose=clamp(v,-12,12); saveCtrl(); $('#trVal').textContent=(CTRL.transpose>0?'+':'')+CTRL.transpose; }
function setOctave(v){ CTRL.octave=clamp(v,1,7); saveCtrl(); $('#octVal').textContent='C'+CTRL.octave; renderKeyboard(); }
$('#trDown').onclick=()=>setTranspose(CTRL.transpose-1); $('#trUp').onclick=()=>setTranspose(CTRL.transpose+1);
$('#octDown').onclick=()=>setOctave(CTRL.octave-1); $('#octUp').onclick=()=>setOctave(CTRL.octave+1);
$('#panic').onclick=panic;

/* ---------- keyboard ---------- */
const KB={lo:36,hi:96,lit:new Map(),pl:new Map(),els:new Map()};
const isBlack=n=>[1,3,6,8,10].includes(((n%12)+12)%12);
const QWERTY=['a','w','s','e','d','f','t','g','y','h','u','j','k','o','l','p',';',"'"];
function renderKeyboard(){
  const kb=$('#keyboard'); kb.textContent=''; KB.els.clear();
  let whites=0; for(let n=KB.lo;n<=KB.hi;n++) if(!isBlack(n)) whites++;
  kb.style.setProperty('--wcount',whites);
  const w=100/whites, drums=!!currentInst().drums, qBase=12*(CTRL.octave+1); let wi=0;
  for(let n=KB.lo;n<=KB.hi;n++){
    const k=document.createElement('div'), b=isBlack(n); k.className='key '+(b?'b':'w'); k.dataset.note=n;
    if(b){ k.style.left=`calc(${wi*w}% - ${w*0.31}%)`; k.style.width=(w*0.62)+'%'; } else { k.style.left=(wi*w)+'%'; k.style.width=w+'%'; wi++; }
    let html='';
    if(drums && !b && (GM_DRUMS[n]||n<60)) html+=`<span class="dl">${DRUM_LABEL[drumPiece(n)]}</span>`;
    const qi=n-qBase; if(qi>=0 && qi<QWERTY.length) html+=`<span class="qk">${QWERTY[qi].toUpperCase()}</span>`;
    if(!b && n%12===0) html+=`<span class="nl">${noteName(n)}</span>`;
    k.innerHTML=html; k.title=noteName(n)+(drums?' · '+DRUM_LABEL[drumPiece(n)]:'');
    if(KB.lit.get(n)) k.classList.add('on'); if(KB.pl.get(n)) k.classList.add('pl');
    kb.appendChild(k); KB.els.set(n,k);
  }
}
function lit(n,d){ const c=Math.max(0,(KB.lit.get(n)||0)+d); KB.lit.set(n,c); const el=KB.els.get(n); if(el) el.classList.toggle('on',c>0); }
function litPl(n,d){ const c=Math.max(0,(KB.pl.get(n)||0)+d); KB.pl.set(n,c); const el=KB.els.get(n); if(el) el.classList.toggle('pl',c>0); }
function expandRange(n){
  if(n>=KB.lo && n<=KB.hi) return;
  let lo=KB.lo, hi=KB.hi;
  while(n<lo && lo-12>=12){ lo-=12; hi-=12; }
  while(n>hi && hi+12<=120){ lo+=12; hi+=12; }
  if(n<lo||n>hi){ lo=21; hi=108; }
  KB.lo=lo; KB.hi=hi; renderKeyboard();
}
const KEYBEDS={25:[48,72],32:[53,84],37:[48,84],49:[36,84],61:[36,96],73:[28,100],76:[28,103],88:[21,108]};
function setKeybed(keys){ const r=KEYBEDS[keys]||KEYBEDS[61]; KB.lo=r[0]; KB.hi=r[1]; renderKeyboard(); }
(function(){
  const kb=$('#keyboard'), ptr=new Map();
  const keyAt=(x,y)=>{ const el=document.elementFromPoint(x,y), k=el&&el.closest?el.closest('.key'):null; return k&&kb.contains(k)?k:null; };
  const velOf=(k,e)=>{ const r=k.getBoundingClientRect(); return Math.round(clamp(35+92*((e.clientY-r.top)/r.height),1,127)); };
  kb.addEventListener('pointerdown',e=>{ if(e.button>0) return; e.preventDefault(); const k=keyAt(e.clientX,e.clientY); if(!k) return; try{ kb.setPointerCapture(e.pointerId); }catch(_){} const n=+k.dataset.note; ptr.set(e.pointerId,n); noteOn(n,velOf(k,e),'p'+e.pointerId); });
  kb.addEventListener('pointermove',e=>{ if(!ptr.has(e.pointerId)) return; const k=keyAt(e.clientX,e.clientY), n=k?+k.dataset.note:null, cur=ptr.get(e.pointerId); if(n===cur) return; if(cur!=null) noteOff(cur,'p'+e.pointerId); ptr.set(e.pointerId,n); if(n!=null) noteOn(n,velOf(k,e),'p'+e.pointerId); });
  const up=e=>{ if(!ptr.has(e.pointerId)) return; const cur=ptr.get(e.pointerId); if(cur!=null) noteOff(cur,'p'+e.pointerId); ptr.delete(e.pointerId); };
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>kb.addEventListener(t,up));
  const held=new Map();
  document.addEventListener('keydown',e=>{
    const tg=e.target; if(tg && (tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable)) return;
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    if(e.key==='Escape'){ cancelLearn(); return; }
    if(e.repeat) return;
    const code=e.code||'', dm=/^Digit(\d)$/.exec(code);
    if(dm){ const d=+dm[1], i=d===0?9:d-1; if(ORDER[i]){ ensureAudio(); setZone(e.shiftKey?'pads':'keys',ORDER[i],{announce:true}); } return; }
    const key=e.key.toLowerCase();
    if(key==='z'){ setOctave(CTRL.octave-1); return; }
    if(key==='x'){ setOctave(CTRL.octave+1); return; }
    const qi=QWERTY.indexOf(key); if(qi<0) return;
    e.preventDefault(); const n=12*(CTRL.octave+1)+qi; held.set(key,n); noteOn(n,100,'kb');
  });
  document.addEventListener('keyup',e=>{ const key=e.key.toLowerCase(); if(!held.has(key)) return; noteOff(held.get(key),'kb'); held.delete(key); });
  window.addEventListener('blur',()=>{ held.forEach(n=>noteOff(n,'kb')); held.clear(); });
})();

/* ---------- controller view: LCD, wheels, knobs (= effects), pads ---------- */
const CV={padNotes:Array.from({length:16},(_,i)=>36+i),padsLive:false};
function lcd(line){ $('#lcdLine').textContent=line; }
function padHit(note,vel,on){
  let i=CV.padNotes.indexOf(note);
  if(i<0){ if(!on) return; const n=LAYOUT.pads||16; if(!CV.padsLive){ CV.padNotes=[note]; } else if(CV.padNotes.length<n){ CV.padNotes.push(note); } else return; CV.padsLive=true; renderPads(); i=CV.padNotes.indexOf(note); }
  CV.padsLive=true;
  const el=$('#pads').querySelector(`[data-pad="${i}"]`); if(!el) return;
  if(on){ el.classList.add('on'); el.style.setProperty('--vel',(0.35+0.65*vel/127).toFixed(2)); } else { el.classList.remove('on'); el.style.setProperty('--vel',0); }
}
(function(){
  const box=$('#pads'), held=new Map();
  box.addEventListener('pointerdown',e=>{ const p=e.target.closest('.pad'); if(!p||p.dataset.note==='') return; e.preventDefault(); const n=+p.dataset.note; held.set(e.pointerId,n);
    noteOn(n,100,'pad',{zone:'pads',pitch:padPitch(n)}); padHit(n,100,true); });
  const up=e=>{ if(!held.has(e.pointerId)) return; const n=held.get(e.pointerId); held.delete(e.pointerId); noteOff(n,'pad'); padHit(n,0,false); };
  ['pointerup','pointercancel','pointerleave'].forEach(t=>box.addEventListener(t,up));
})();

function startScope(){}
