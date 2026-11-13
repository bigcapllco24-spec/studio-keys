
/* ---------- MIDI ---------- */
const M={access:null,state:'idle',err:'',inputs:[],outputs:0,selected:'all',seen:{},log:[],awaitId:null,lastPrimary:null,padDetect:false,clk:[],clkSeen:0,testWait:null};
let DEVICES=store.get('devices',{});
const saveDevices=()=>store.set('devices',DEVICES);
const devKey=inp=>(inp.manufacturer||'')+'|'+inp.name;
function settingsFor(inp){ if(!inp) return null; const k=devKey(inp); if(!DEVICES[k]) DEVICES[k]={}; const d=DEVICES[k]; d.cc=d.cc||{}; d.notes=d.notes||{}; d.rel=d.rel||{}; return d; }
/* controllers often expose a second "DAW" port that repeats pads/buttons as Mackie or HUI notes; notes from it are not played */
const AUX_PORT=/\b(daw|midiin\s*2|mackie|hui|incontrol|ctrl|control|extended|port\s*2)\b/i;
const isAux=inp=>AUX_PORT.test(inp.name) && M.inputs.some(i=>!AUX_PORT.test(i.name));
function primaryInput(){ if(!M.inputs.length) return null; if(M.selected!=='all'){ const s=M.inputs.find(i=>i.id===M.selected); if(s) return s; } return M.inputs.find(i=>!AUX_PORT.test(i.name))||M.inputs[0]; }
const primarySettings=()=>settingsFor(primaryInput());
const padCh=()=>{ const ds=primarySettings(); return (ds&&ds.padCh)||store.get('padCh',10); };
function isPadNote(ds,ch,note){ if(ch!==padCh()) return false; if(ds && ds.padMode==='notes') return (ds.padNotes||[]).includes(note); return true; }
function setPadCh(ch){ const ds=primarySettings(); if(ds){ ds.padCh=ch; saveDevices(); } store.set('padCh',ch); $('#padCh').value=String(ch); updateZoneUI(); }
$('#padCh').innerHTML=Array.from({length:16},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
$('#padCh').addEventListener('change',e=>setPadCh(+e.target.value));
const SETUP={step:null,keyCh:null,keyPort:null,notes:new Set()};
function setupMsg(html){ const b=$('#setupBox'); b.hidden=!html; b.innerHTML=html||''; }
function startSetup(){ if(!M.inputs.length){ toast('Connect a controller first.'); return; } SETUP.step='key'; SETUP.notes.clear(); setupMsg('<b>Step 1 of 2.</b> Press any key on the keyboard part of your controller.'); document.querySelector('.profile').scrollIntoView({behavior:'smooth',block:'start'}); }
function setupNote(inp,ch,note){
  if(SETUP.step==='key'){ SETUP.keyCh=ch; SETUP.keyPort=inp.id; SETUP.step='pad'; setupMsg(`Keys found on channel ${ch}. <b>Step 2 of 2.</b> Now hit any pad.`); return true; }
  if(SETUP.step==='pad'){ const ds=settingsFor(inp);
    if(ch!==SETUP.keyCh){ ds.padMode='channel'; saveDevices(); setPadCh(ch); SETUP.step=null; setupMsg(`<b>Done.</b> Keys play on channel ${SETUP.keyCh} and pads on channel ${ch}, so each plays its own sound.`); setTimeout(()=>setupMsg(''),6000); return true; }
    SETUP.step='padnotes'; SETUP.notes.add(note); setPadCh(ch);
    setupMsg(`Your pads and keys both send on channel ${ch}. Hit <b>each pad once</b> so they can be told apart by note, then press Done. <span class="muted">Cleaner option: set the pads to channel 10 in your controller’s settings app, then run setup again.</span> <button class="btn small primary" type="button" id="setupDone">Done</button>`);
    $('#setupDone').onclick=()=>{ ds.padMode='notes'; ds.padNotes=[...SETUP.notes]; saveDevices(); SETUP.step=null; CV.padNotes=[...SETUP.notes].sort((a,b)=>a-b); CV.padsLive=true; renderPads(); setupMsg(`<b>Done.</b> ${SETUP.notes.size} pad notes on channel ${ch} now play the pads sound. Those same notes on the keybed will too.`); setTimeout(()=>setupMsg(''),8000); };
    return true; }
  if(SETUP.step==='padnotes'){ SETUP.notes.add(note); const c=$('#setupBox b'); if(c) c.textContent='each pad once ('+SETUP.notes.size+' so far)'; return true; }
  return false;
}
$('#padDetect').onclick=startSetup; $('#setupKP').onclick=startSetup;

const BRANDS=[[/arturia|keylab|minilab|keystep|beatstep|microfreak/i,'Arturia'],[/akai|mpk|\bapc|mpd|lpk/i,'Akai Professional'],[/novation|launchkey|launchpad|launchcontrol|\bsl ?mk/i,'Novation'],[/native instruments|komplete|kontrol|maschine/i,'Native Instruments'],[/m-?audio|keystation|oxygen|hammer 88/i,'M-Audio'],[/nektar|panorama|impact (gx|lx)/i,'Nektar'],[/roland|\ba-(49|88|500)|fantom/i,'Roland'],[/korg|nanokey|microkey|keystage|nanokontrol/i,'Korg'],[/yamaha|\bp-\d{2,3}|psr|clavinova/i,'Yamaha'],[/alesis|\bv(25|49|61)\b|\bq(49|88)\b/i,'Alesis'],[/behringer/i,'Behringer'],[/\bnord\b|clavia/i,'Nord'],[/casio/i,'Casio'],[/kawai/i,'Kawai'],[/ableton|\bpush\b/i,'Ableton'],[/roli|seaboard|lumi/i,'ROLI']];
function brandOf(inp){ const s=(inp.manufacturer||'')+' '+inp.name; for(const [re,b] of BRANDS) if(re.test(s)) return b; return inp.manufacturer||''; }
function keysFromName(n){ const m=/(?:^|\D)(25|32|37|49|61|73|76|88)(?:\D|$)/.exec(n); return m?+m[1]:null; }
const SYSEX_MFR={'01':'Sequential','04':'Moog','40':'Kawai','41':'Roland','42':'Korg','43':'Yamaha','44':'Casio','47':'Akai','00000E':'Alesis','00203C':'Elektron','002029':'Novation / Focusrite','002032':'Behringer','00206B':'Arturia','002109':'Native Instruments'};
const CC_NAMES={1:'Mod wheel',2:'Breath',7:'Volume',10:'Pan',11:'Expression',64:'Sustain',71:'Resonance',74:'Cutoff',91:'Reverb',93:'Chorus',120:'All sound off',123:'All notes off'};

async function initMIDI(fromClick){
  if(!('requestMIDIAccess' in navigator)){ M.state='unsupported'; renderProfile(); return; }
  try{ const acc=await navigator.requestMIDIAccess({sysex:false}); attachAccess(acc); if(fromClick && !M.inputs.length) toast('MIDI is on. No controller found yet; plug one in over USB.'); }
  catch(err){ M.state='blocked'; M.err=err&&err.name||'Error'; renderProfile(); }
}
function attachAccess(acc){
  if(M.access && M.access!==acc){ M.access.inputs.forEach(i=>{ i.onmidimessage=null; }); }
  M.access=acc; M.state='ready'; acc.onstatechange=e=>refreshInputs(e); refreshInputs();
}
function refreshInputs(evt){
  const list=[]; M.access.inputs.forEach(inp=>{ if(/midi through/i.test(inp.name)) return; list.push(inp); });
  M.inputs=list; let outs=0; M.access.outputs.forEach(o=>{ if(!/midi through/i.test(o.name)) outs++; }); M.outputs=outs;
  list.forEach(inp=>{ inp.onmidimessage=e=>onMIDI(e,inp); });
  if(M.selected!=='all' && !list.find(i=>i.id===M.selected)) M.selected='all';
  if(evt && evt.port && evt.port.type==='input' && !/midi through/i.test(evt.port.name)){
    if(evt.port.state==='connected' && evt.port.connection!=='open') toast(evt.port.name+' connected');
    if(evt.port.state==='disconnected') toast(evt.port.name+' disconnected');
  }
  renderProfile(); onPrimaryChange();
}
function onPrimaryChange(){
  const p=primaryInput(), k=p?devKey(p):null; if(k===M.lastPrimary) return; M.lastPrimary=k; if(!p) return;
  const ds=settingsFor(p), had=!!(ds.zones||ds.curve);
  applyLayout();
  if(ds.zones){ ['keys','pads'].forEach(z=>{ if(ds.zones[z] && INST.has(ds.zones[z])) setZone(z,ds.zones[z]); }); }
  if(ds.curve) setCurve(ds.curve);
  $('#padCh').value=String(padCh()); updateZoneUI(); renderMaps(); renderFx();
  const nm=$('#playerName').value.trim();
  if(had) toast(`${nm?'Welcome back, '+nm+'. ':''}Loaded your ${p.name} settings.`);
}
function seenFor(inp){ if(!M.seen[inp.id]) M.seen[inp.id]={low:null,high:null,count:0,vmin:127,vmax:0,ccs:new Map(),bend:false,at:false,pads:new Set(),clock:false,program:false,channels:new Set(),lastCC:{}}; return M.seen[inp.id]; }

/* learn */
let learnTarget=null;
const LEARN_LABEL={volume:'Volume',next:'Next sound',prev:'Previous sound',loop:'Looper',stop:'Stop'};
const learnLabel=t=>LEARN_LABEL[t]||(/^fx\d$/.test(t)?`K${+t[2]+1} ${FX_LIB[FX.slots[+t[2]].type].name}`:/^vol:/.test(t)?chName(t.slice(4))+' volume':t);
function startLearn(t){
  if(!M.inputs.length){ toast('Connect a controller first, then press Learn.'); return; }
  if(learnTarget===t){ cancelLearn(); return; }
  cancelLearn(); learnTarget=t; const b=document.getElementById('learn-'+t); if(!b) return; b.classList.add('learning'); b.dataset.label=b.textContent;
  b.textContent=(t==='next'||t==='prev'||t==='loop'||t==='stop')?'Press a button…':/^vol:/.test(t)?'Move a fader…':'Move a knob…';
}
function cancelLearn(){ if(!learnTarget) return; const b=document.getElementById('learn-'+learnTarget); if(b){ b.classList.remove('learning'); b.textContent=b.dataset.label||'Learn'; } learnTarget=null; }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-learn]'); if(b) startLearn(b.dataset.learn); });
function finishLearn(inp,kind,id){
  const t=learnTarget, ds=settingsFor(inp);
  for(const k in ds.cc) if(ds.cc[k]===t) delete ds.cc[k];
  for(const k in ds.notes) if(ds.notes[k]===t) delete ds.notes[k];
  if(kind==='cc'){ delete ds.notes[id]; ds.cc[id]=t; } else ds.notes[id]=t;
  saveDevices(); cancelLearn(); renderMaps(); renderFx(); renderFaders();
  toast(`${kind==='cc'?'CC '+id:'Note '+noteName(+id.split(':')[1])+' (ch '+id.split(':')[0]+')'} now controls ${learnLabel(t)}`);
}
function renderMaps(){
  const ds=primarySettings(), def={volume:'CC 7',next:'',prev:'',loop:'MMC record',stop:'MMC stop'};
  for(const t in def){ let txt=def[t]; if(ds){ for(const k in ds.cc) if(ds.cc[k]===t) txt='CC '+k; for(const k in ds.notes) if(ds.notes[k]===t){ const [ch,n]=k.split(':'); txt=noteName(+n)+' ch'+ch; } } const el=$('#map-'+t); if(el) el.textContent=txt; }
}
function doAction(t,inp){
  if(t==='next') cycleInstrument(1); else if(t==='prev') cycleInstrument(-1);
  else if(t==='loop') loopPress(); else if(t==='stop') loopStop();
}

function onMIDI(e,inp){
  if(M.selected!=='all' && inp.id!==M.selected) return;
  const d=e.data, st=d[0]; if(!d.length) return;
  const S=seenFor(inp);
  if(st===0xF8){ clockTick(e.timeStamp||performance.now()); if(!S.clock){ S.clock=true; scheduleSeen(); } return; }
  if(st===0xFE) return;
  if(st===0xFA||st===0xFB){ if(LOOP.layers.length) loopPlay(); return; }
  if(st===0xFC){ loopStop(); return; }
  if(st===0xF0){ handleSysex(d,inp); return; }
  const type=st&0xF0, ch=(st&0x0F)+1, a=d[1]|0, b=d[2]|0; S.channels.add(ch);
  const ds=settingsFor(inp), aux=isAux(inp), isPad=isPadNote(ds,ch,a);
  if(type===0x90 && b>0){
    S.count++; if(!isPad){ S.low=S.low==null?a:Math.min(S.low,a); S.high=S.high==null?a:Math.max(S.high,a); } S.vmin=Math.min(S.vmin,b); S.vmax=Math.max(S.vmax,b); if(isPad) S.pads.add(a);
    log('Note On',`ch ${ch}`,`${noteName(a)} · vel ${b}`,'');
    if(M.testWait){ const f=M.testWait; M.testWait=null; f({name:inp.name,note:a,vel:b,ch}); }
    if(SETUP.step && !aux && setupNote(inp,ch,a)){ scheduleSeen(); return; }
    if(learnTarget && !/^(fx|volume|vol:)/.test(learnTarget)){ finishLearn(inp,'note',ch+':'+a); scheduleSeen(); return; }
    const map=ds.notes[ch+':'+a]; if(map){ doAction(map,inp); lcd(learnLabel(map).toUpperCase()); scheduleSeen(); return; }
    if(aux){ log('Note On','DAW port',`${noteName(a)} · not played`,'off'); scheduleSeen(); return; }
    lcd(`${isPad?'PAD':'KEY'} ${noteName(a)} → ${zoneInst(isPad?'pads':'keys').name.toUpperCase()}`);
    M.log[0].val+=isPad?' → pads':' → keys';
    if(isPad){ padHit(a,b,true); noteOn(a,b,'m'+ch,{zone:'pads',pitch:padPitch(a)}); }
    else { expandRange(a); noteOn(a,b,'m'+ch,{zone:'keys'}); }
  } else if(type===0x80||type===0x90){
    if(ds.notes[ch+':'+a]||aux) return;
    noteOff(a,'m'+ch); log('Note Off',`ch ${ch}`,noteName(a),'off'); if(isPad) padHit(a,0,false);
  } else if(type===0xB0){
    S.ccs.set(a,b); handleCC(inp,S,ds,a,b,ch,aux);
  } else if(type===0xC0){
    S.program=true; const id=ORDER[a%ORDER.length]; setZone('keys',id,{announce:true}); log('Program',`ch ${ch}`,`${a+1} → ${INST.get(id).name}`,'cc');
  } else if(type===0xE0 && !aux){
    S.bend=true; const val=((b<<7)|a)-8192, cents=val/8192*200;
    if(A.ctx) A.bend.offset.setTargetAtTime(cents,A.ctx.currentTime,0.004);
    $('#bendLed').className='led'+(Math.abs(val)>200?' sig':''); $('#bendVal').textContent='Bend '+(val>0?'+':'')+(val/8192).toFixed(2);
    setWheel('wBend',(val+8192)/16383,Math.abs(val)>200); lcd(`BEND ${(val>0?'+':'')+(val/8192).toFixed(2)}`);
    log('Pitch bend',`ch ${ch}`,(val>0?'+':'')+(val/8192).toFixed(2),'cc','bend');
  } else if(type===0xD0){ S.at=true; log('Aftertouch',`ch ${ch}`,String(a),'cc','at'); }
  else if(type===0xA0){ S.at=true; }
  scheduleSeen();
}
const NO_AUTO=new Set([0,1,6,7,32,38,64,65,66,67,96,97,98,99,100,101]);
function handleCC(inp,S,ds,num,val,ch,aux){
  log('CC '+num,`ch ${ch}`,`${CC_NAMES[num]?CC_NAMES[num]+' ':''}${val}`,'cc','cc'+num);
  if(M.testWait && num!==64){ const f=M.testWait; M.testWait=null; f({name:inp.name,cc:num,val,ch}); }
  const prev=S.lastCC[num]; S.lastCC[num]=val;
  if(prev===val && val!==0 && !ds.rel[num]){ ds.rel[num]=(val>=48&&val<=80)?'rel64':'rel2c'; saveDevices(); }
  if(learnTarget){
    if(/^(next|prev|loop|stop)$/.test(learnTarget)){ if(val>=64) finishLearn(inp,'cc',num); }
    else finishLearn(inp,'cc',num);
    return;
  }
  let map=ds.cc[num];
  if(aux && !map) return;
  if(!map && !NO_AUTO.has(num) && num<120 && val!==0 && val!==127){
    const used=new Set(Object.values(ds.cc));
    for(let i=0;i<8;i++) if(!used.has('fx'+i)){ ds.cc[num]=map='fx'+i; saveDevices(); renderFx(); toast(`Knob CC ${num} → K${i+1} ${FX_LIB[FX.slots[i].type].name}`); break; }
  }
  if(map){
    if(/^(next|prev|loop|stop)$/.test(map)){ if(val>=64 && (prev||0)<64) doAction(map,inp); return; }
    if(map==='volume'){ setVolume(Math.round(val/127*100)); lcd(`VOLUME ${Math.round(val/127*100)}%`); return; }
    if(map.startsWith('vol:')){ const id=map.slice(4); if(chCfg(id)){ chSet(id,'vol',val/127); lcd(`${chName(id).toUpperCase()} ${Math.round(val/127*100)}%`); } return; }
    const i=+map.slice(2); let amt;
    const rel=ds.rel[num], cur=FX.slots[i].amount;
    if(rel){ const delta=rel==='rel64'?val-64:(val<64?val:val-128); amt=cur+delta*0.01; }
    else {
      amt=val/127;
      if(!PICK.has(num)){
        const crossed=prev!=null && (prev/127-cur)*(amt-cur)<=0;
        if(Math.abs(amt-cur)<=0.06 || crossed) PICK.add(num);
        else { lcd(`K${i+1} TURN TO ${Math.round(cur*100)}% TO TAKE OVER`); return; }
      }
    }
    FX.set(i,amt); lcd(`K${i+1} ${FX_LIB[FX.slots[i].type].name.toUpperCase()} ${Math.round(FX.slots[i].amount*100)}%`);
    return;
  }
  lcd(num===64?`SUSTAIN ${val>=64?'ON':'OFF'}`:`CC ${num}  ${val}`);
  const t=A.ctx?A.ctx.currentTime:0;
  switch(num){
    case 1: if(A.ctx) A.vibGain.gain.setTargetAtTime(val/127*35,t,0.02); $('#modLed').className='led'+(val>4?' sig':''); setWheel('wMod',val/127,val>4); break;
    case 7: setVolume(Math.round(val/127*100)); break;
    case 64: setSustain(val>=64); break;
    case 120: case 123: panic(); break;
  }
}
function clockTick(ts){
  const k=M.clk; k.push(ts); if(k.length>25) k.shift(); M.clkSeen=performance.now();
  $('#clockLed').className='led sig';
  if(k.length===25){ const per=(k[24]-k[0])/24, bpm=60000/(per*24); if(bpm>30 && bpm<300 && Math.abs(bpm-CTRL.bpm)>0.4) setTempo(Math.round(bpm*10)/10); }
}
setInterval(()=>{ if(M.clkSeen && performance.now()-M.clkSeen>1000){ M.clkSeen=0; $('#clockLed').className='led'; } },500);
function handleSysex(d,inp){
  if(d[1]===0x7F && d[3]===0x06){ const cmd=d[4]; log('MMC','',{1:'Stop',2:'Play',3:'Play',6:'Record',9:'Pause'}[cmd]||('cmd '+cmd),'cc');
    if(cmd===1||cmd===9) loopStop(); else if(cmd===2||cmd===3){ if(LOOP.layers.length) loopPlay(); } else if(cmd===6) loopPress(); return; }
  log('SysEx','',`${d.length} bytes`,'cc');
  if(!(d[1]===0x7E && d[3]===0x06 && d[4]===0x02)) return;
  M.awaitId=null; let o=5, id;
  if(d[5]===0){ id=[0,d[6],d[7]].map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase(); o=8; } else { id=d[5].toString(16).padStart(2,'0').toUpperCase(); o=6; }
  const fam=(d[o]|(d[o+1]<<7)), md=(d[o+2]|(d[o+3]<<7)), ver=[d[o+4],d[o+5],d[o+6],d[o+7]].filter(x=>x!==undefined&&x!==0xF7);
  const hex=v=>'0x'+v.toString(16).toUpperCase().padStart(4,'0');
  $('#hwOut').innerHTML=`<dl class="spec"><dt>Maker (SysEx)</dt><dd>${esc(SYSEX_MFR[id]||'Unlisted maker')} · ${id}</dd><dt>Family</dt><dd>${hex(fam)}</dd><dt>Model</dt><dd>${hex(md)}</dd><dt>Firmware</dt><dd>${ver.join('.')||'n/a'}</dd></dl>`;
}
async function readHardwareId(){
  const out=$('#hwOut'), prim=primaryInput();
  if(!prim){ out.textContent='Connect a controller first.'; return; }
  const name=prim.name; out.textContent='Asking for SysEx permission…';
  let acc; try{ acc=await navigator.requestMIDIAccess({sysex:true}); }catch(e){ out.textContent='SysEx permission was declined, so the hardware ID can’t be read. Everything else keeps working.'; return; }
  attachAccess(acc);
  const outs=[]; acc.outputs.forEach(o=>{ if(!/midi through/i.test(o.name)) outs.push(o); });
  const stem=name.toLowerCase().replace(/\b(midi|in|input|port)\b/g,'').replace(/\s+\d+$/,'').trim().slice(0,8);
  const o=outs.find(x=>x.name===name)||outs.find(x=>x.name.toLowerCase().includes(stem))||outs[0];
  if(!o){ out.textContent='This controller has no MIDI output port, so it can’t answer an ID request.'; return; }
  M.awaitId=true;
  try{ o.send([0xF0,0x7E,0x7F,0x06,0x01,0xF7]); }catch(e){ out.textContent='Sending the request failed: '+e.message; return; }
  out.textContent='Sent an identity request to '+o.name+'…';
  setTimeout(()=>{ if(M.awaitId){ M.awaitId=null; out.textContent='No reply. Some controllers only answer in their editor mode. The profile above is built from the device name instead.'; } },1800);
}
$('#hwBtn').onclick=readHardwareId;
$('#connectBtn').onclick=()=>{ ensureAudio(); initMIDI(true); };

let logPending=false;
function log(kind,ch,val,cls,coalesce){
  const last=M.log[0];
  if(coalesce && last && last.co===coalesce) last.val=val; else { M.log.unshift({kind,ch,val,cls,co:coalesce}); if(M.log.length>40) M.log.pop(); }
  if(!logPending){ logPending=true; requestAnimationFrame(()=>{ logPending=false; $('#monitor').innerHTML=M.log.map(l=>`<li class="${l.cls}"><span><span class="k">${esc(l.kind)}</span> ${esc(l.val)}</span><span class="ch">${esc(l.ch)}</span></li>`).join(''); }); }
}
$('#clearMon').onclick=()=>{ M.log=[]; $('#monitor').innerHTML=''; };

function renderProfile(){
  const info=$('#devInfo'), pill=$('#midiPill');
  if(M.state==='unsupported'){
    pill.hidden=true; /* no Web MIDI at all (every iPhone, Safari): no red pill, it isn't an error (UX-4) */
    pill.innerHTML='<span class="led"></span><span>No MIDI in this browser</span>';
    info.innerHTML='<div class="empty"><strong>This browser can’t read MIDI devices.</strong><span>Use Chrome, Edge, Opera or Firefox on a computer. Safari and iOS don’t support Web MIDI. The on-screen keys and your computer keyboard still play every sound.</span></div>';
  } else if(M.state==='blocked'){
    pill.innerHTML='<span class="led bad"></span><span>MIDI blocked</span>';
    info.innerHTML=`<div class="empty"><strong>MIDI access was blocked (${esc(M.err)}).</strong><span>This embedded view may not allow MIDI. Open the downloaded HTML file in Chrome, or allow MIDI devices for this site in Chrome’s site settings and press Connect MIDI again.</span></div>`;
  } else if(M.state==='idle'){
    pill.innerHTML='<span class="led"></span><span>MIDI off</span>';
    info.innerHTML='<div class="empty"><strong>No controller connected yet.</strong><span>Plug in your keyboard over USB and press Connect MIDI. Your browser asks for permission once.</span></div>';
  } else if(!M.inputs.length){
    pill.innerHTML='<span class="led warn"></span><span>No controller</span>';
    info.innerHTML='<div class="empty"><strong>MIDI is on, but no controller is plugged in.</strong><span>Connect an Arturia, Akai, Novation or any class-compliant USB keyboard. It appears here the moment it’s detected.</span></div>';
  } else {
    const p=primaryInput(), brand=brandOf(p), keys=keysFromName(p.name), initials=(brand||p.name).replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'MI';
    pill.innerHTML=`<span class="led on"></span><span>${M.inputs.length} controller${M.inputs.length>1?'s':''}</span>`;
    const sel=M.inputs.length>1?`<div class="field"><label for="inputSel">Listening to</label><select class="select" id="inputSel"><option value="all">All connected controllers</option>${M.inputs.map(i=>`<option value="${esc(i.id)}"${M.selected===i.id?' selected':''}>${esc(i.name)}</option>`).join('')}</select></div>`:'';
    info.innerHTML=`<div class="dev-head"><div class="dev-badge">${esc(initials)}</div><div><div class="dev-name">${esc(p.name)}</div><div class="dev-maker">${esc(p.manufacturer||'Maker not reported')}${brand&&brand!==p.manufacturer?' · '+esc(brand):''}</div></div><span class="led on" title="Connected"></span></div>${sel}
      <dl class="spec"><dt>Brand</dt><dd>${esc(brand||'Generic class-compliant')}</dd><dt>Keys</dt><dd id="keysDd">${keys?keys+' (from model name)':'Play lowest and highest key'}</dd><dt>Connection</dt><dd>USB · ${esc(p.state)} · ${esc(p.connection)}</dd><dt>Ports</dt><dd>${M.inputs.length} in · ${M.outputs} out</dd>${M.inputs.some(isAux)?`<dt>DAW port</dt><dd>${esc(M.inputs.filter(isAux).map(i=>i.name).join(', '))} · buttons only</dd>`:''}</dl>`;
    $('#lcdBrand').textContent=brand||'MIDI controller'; $('#lcdName').textContent=p.name+(keys?' · '+keys+' keys':'');
    const s=$('#inputSel'); if(s) s.onchange=()=>{ M.selected=s.value; renderProfile(); onPrimaryChange(); };
  }
  if(M.state!=='ready'||!M.inputs.length){ $('#lcdBrand').textContent='Studio Keys'; $('#lcdName').textContent=M.state==='ready'?'Waiting for a controller…':'No controller · on-screen mode'; }
  renderSeen(); if(typeof applyLayout==='function' && M.state==='ready') renderLayoutInfo();
}
let seenPending=false;
function scheduleSeen(){ if(seenPending) return; seenPending=true; requestAnimationFrame(()=>{ seenPending=false; renderSeen(); }); }
function renderSeen(){
  const box=$('#devSeen'), p=primaryInput(), S=p?seenFor(p):null;
  const row=(label,on,val)=>`<div class="seen-row${on?' yes':''}"><span class="led${on?' sig':''}"></span><span>${label}</span><span class="v">${val}</span></div>`;
  if(!S){ box.innerHTML=['Keys','Pads','Knobs','Pitch bend','Mod wheel','Sustain pedal'].map(l=>row(l,false,'—')).join(''); return; }
  const span=S.low!=null?S.high-S.low+1:0, sizes=[25,32,37,49,61,73,76,88], est=sizes.find(s=>s>=span)||88;
  const ds=settingsFor(p), knobs=[...S.ccs.keys()].filter(n=>n!==1&&n!==64).sort((a,b)=>a-b), rel=knobs.filter(n=>ds.rel[n]).length;
  box.innerHTML=
    row('Keys',S.low!=null,S.low!=null?`${noteName(S.low)}–${noteName(S.high)}`:'Play a few notes')+
    row('Velocity',S.count>0,S.count?`${S.vmin}–${S.vmax}`:'—')+
    row(`Pads (channel ${padCh()})`,S.pads.size>0,S.pads.size?S.pads.size+' pads':'Tap a pad')+
    row('Knobs & faders',knobs.length>0,knobs.length?knobs.slice(0,6).map(n=>'CC '+n).join(', ')+(knobs.length>6?` +${knobs.length-6}`:'')+(rel?' · endless':''):'Turn a knob')+
    row('Pitch bend',S.bend,S.bend?'Detected':'Move the wheel')+
    row('Mod wheel',S.ccs.has(1),S.ccs.has(1)?'CC 1 · '+S.ccs.get(1):'Move the wheel')+
    row('Sustain pedal',S.ccs.has(64),S.ccs.has(64)?'CC 64':'Press the pedal')+
    row('Aftertouch',S.at,S.at?'Detected':'—')+
    row('MIDI clock',S.clock,S.clock?'Receiving':'—');
  const kd=$('#keysDd'); if(kd && !keysFromName(p.name) && span>12) kd.textContent=`at least ${est} (span ${span})`;
}

/* ---------- player name ---------- */
(function(){ const inp=$('#playerName'); inp.value=store.get('player','');
  const upd=()=>{ const n=inp.value.trim(); $('#greet').textContent=n?`${n}’s personal MIDI keyboard`:'Your personal MIDI keyboard'; };
  inp.addEventListener('input',()=>{ store.set('player',inp.value); upd(); }); upd(); })();

/* ---------- MIDI self-test ---------- */
async function runTest(){
  ensureAudio();
  const box=$('#testOut'); box.hidden=false; const rows=[];
  const draw=()=>{ box.innerHTML=rows.map(r=>`<div class="t"><span class="led ${r.s==='ok'?'on':r.s==='bad'?'bad':r.s==='wait'?'sig':'warn'}"></span><span>${esc(r.l)}${r.d?`<small>${esc(r.d)}</small>`:''}</span></div>`).join(''); };
  const add=(s,l,d)=>{ const r={s,l,d}; rows.push(r); draw(); return r; };
  if(!('requestMIDIAccess' in navigator)){ add('bad','This browser has no Web MIDI','Open the page in Chrome or Edge on your laptop. Safari does not support MIDI.'); return; }
  add('ok','Browser supports Web MIDI');
  add(window.isSecureContext?'ok':'bad',window.isSecureContext?'Page is secure':'Page is not secure',window.isSecureContext?'':'MIDI only works on https:// pages or a local file.');
  let framed=false; try{ framed=window.self!==window.top; }catch(e){ framed=true; }
  if(framed) add('warn','Running inside an embedded frame','If the next step fails, open the downloaded HTML file in Chrome.');
  try{ const st=await navigator.permissions.query({name:'midi'}); add(st.state==='denied'?'bad':'ok','MIDI permission: '+st.state,st.state==='denied'?'Click the icon left of the address bar, set MIDI devices to Allow, then reload.':''); }catch(e){}
  const step=add('wait','Requesting MIDI access…');
  try{ const acc=await navigator.requestMIDIAccess({sysex:false}); attachAccess(acc); step.s='ok'; step.l='MIDI access granted'; draw(); }
  catch(e){ M.state='blocked'; M.err=e.name; renderProfile(); step.s='bad'; step.l='MIDI access blocked ('+e.name+')'; step.d=framed?'This embedded view does not allow MIDI. Open the downloaded HTML file in Chrome.':'Allow MIDI devices for this site in Chrome’s site settings, then run the test again.'; draw(); return; }
  if(!M.inputs.length){ add('bad','No controller found','Check the USB cable, power on the keyboard, then run the test again.'); return; }
  add('ok',`Found ${M.inputs.length} controller${M.inputs.length>1?'s':''}`,M.inputs.map(i=>i.name+(i.manufacturer?' ('+i.manufacturer+')':'')).join(', '));
  const w=add('wait','Press any key, pad or knob on your controller now…','Waiting 20 seconds');
  document.querySelector('.keys').scrollIntoView({behavior:'smooth',block:'start'});
  const got=await new Promise(res=>{ M.testWait=res; setTimeout(()=>{ if(M.testWait===res){ M.testWait=null; res(null); } },20000); });
  if(got){ w.s='ok'; w.l=got.note!=null?`Received ${noteName(got.note)} · velocity ${got.vel} · channel ${got.ch}`:`Received knob CC ${got.cc} = ${got.val} · channel ${got.ch}`; w.d='From '+got.name+'. Your controller is working.'; }
  else { w.s='bad'; w.l='Nothing received in 20 seconds'; w.d='Close any music app that may be holding the port (common on Windows), check the controller isn’t in a DAW-only mode, then run the test again.'; }
  draw();
}
$('#testBtn').onclick=runTest;
