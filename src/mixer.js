
/* ---------- mixer: channel strips with volume, mute/solo and low/mid/high EQ ---------- */
const EQ_DB=15;
function makeStrip(c,dest){
  const inp=c.createGain(), lo=filt(c,'lowshelf',120,0.7), mid=filt(c,'peaking',1000,0.8), hi=filt(c,'highshelf',6000,0.7), out=c.createGain();
  lo.gain.value=0; mid.gain.value=0; hi.gain.value=0; inp.connect(lo).connect(mid).connect(hi).connect(out); out.connect(dest);
  return {inp,lo,mid,hi,out};
}
function applyStrip(st,cfg,c,instant,audible){
  if(!st) return; const g=audible===false?0:Math.pow(cfg.vol,2)*1.2;
  sp(st.lo.gain,cfg.lo||0,c,instant); sp(st.mid.gain,cfg.mid||0,c,instant); sp(st.hi.gain,cfg.hi||0,c,instant); sp(st.out.gain,g,c,instant);
}
const MIX=Object.assign({keys:{vol:0.85,lo:0,mid:0,hi:0,mute:false},pads:{vol:0.85,lo:0,mid:0,hi:0,mute:false},master:{vol:1,lo:0,mid:0,hi:0,mute:false}},store.get('mix',{}));
let mixSaveT=0; const saveMix=()=>{ clearTimeout(mixSaveT); mixSaveT=setTimeout(()=>store.set('mix',MIX),300); };
function buildStrips(){
  const c=A.ctx;
  A.mstrip=makeStrip(c,A.master);
  A.zs={keys:makeStrip(c,A.bus),pads:makeStrip(c,A.bus)};
  A.ts=new Map();
  ['keys','pads','master'].forEach(k=>applyStrip(k==='master'?A.mstrip:A.zs[k],MIX[k],c,true,!MIX[k].mute));
}
const zoneDest=z=>(A.zs&&A.zs[z]||A.zs.keys).inp;
function trackStrip(tr){
  let st=A.ts.get(tr.id);
  if(!st){ st=makeStrip(A.ctx,A.bus); A.ts.set(tr.id,st); applyStrip(st,tr,A.ctx,true,trackAudible(tr)); }
  return st;
}
const anySolo=()=>PROJ.tracks.some(t=>t.solo);
const trackAudible=t=>!t.mute && (!anySolo()||t.solo);
function refreshTrackGains(){ if(!A.ctx) return; PROJ.tracks.forEach(t=>{ const st=A.ts.get(t.id); if(st) applyStrip(st,t,A.ctx,false,trackAudible(t)); }); }
/* channel lookup for dials, faders and learn targets: 'keys' | 'pads' | 'master' | track id */
function chCfg(id){ return MIX[id]||PROJ.tracks.find(t=>t.id===id); }
function chApply(id){
  if(!A.ctx) return; const cfg=chCfg(id); if(!cfg) return;
  if(id==='master'){ applyStrip(A.mstrip,cfg,A.ctx,false,!cfg.mute); return; }
  if(MIX[id]){ applyStrip(A.zs[id],cfg,A.ctx,false,!cfg.mute); return; }
  refreshTrackGains();
}
function chSet(id,field,v){
  const cfg=chCfg(id); if(!cfg) return;
  cfg[field]=field==='vol'?clamp(v,0,1):clamp(v,-EQ_DB,EQ_DB);
  chApply(id); if(MIX[id]) saveMix(); else saveProject();
  updateDialUI('eq:'+id+':'+field); updateFaderUI(id);
}
/* generic dials: data-d="eq:<channel>:<lo|mid|hi>" (bipolar) */
function dialGet(key){ const [kind,id,f]=key.split(':'); const cfg=chCfg(id); if(!cfg) return 0.5; return (cfg[f]||0)/(2*EQ_DB)+0.5; }
function dialSet(key,v){ const [kind,id,f]=key.split(':'); let db=(clamp(v,0,1)-0.5)*2*EQ_DB; if(Math.abs(db)<0.6) db=0; chSet(id,f,Math.round(db*2)/2); }
function dialHTML(key,label){ const v=dialGet(key), db=Math.round(((v-0.5)*2*EQ_DB)*2)/2;
  return `<span class="eqd"><span class="dial sm" data-d="${key}" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="-${EQ_DB}" aria-valuemax="${EQ_DB}" aria-valuenow="${db}" style="--v:${v.toFixed(3)}"><span class="cap"></span></span><span class="eql">${label}<b data-dv="${key}">${db>0?'+':''}${db}</b></span></span>`; }
function updateDialUI(key){ const v=dialGet(key), db=Math.round(((v-0.5)*2*EQ_DB)*2)/2;
  document.querySelectorAll(`.dial[data-d="${key}"]`).forEach(d=>{ d.style.setProperty('--v',v.toFixed(3)); d.setAttribute('aria-valuenow',db); });
  document.querySelectorAll(`[data-dv="${key}"]`).forEach(e=>e.textContent=(db>0?'+':'')+db); }
function stripControls(id,cfg,opts={}){
  return `<div class="strip-ctl">
    <label class="vol"><span class="sr">Volume</span><input type="range" min="0" max="100" value="${Math.round(cfg.vol*100)}" data-vol="${id}" aria-label="${esc(opts.name||id)} volume"><span class="mono" data-volv="${id}">${Math.round(cfg.vol*100)}</span></label>
    ${dialHTML('eq:'+id+':lo','Low')}${dialHTML('eq:'+id+':mid','Mid')}${dialHTML('eq:'+id+':hi','High')}
    <button class="btn small ghost ms${cfg.mute?' on':''}" type="button" data-mute="${id}" aria-pressed="${!!cfg.mute}" title="Mute">M</button>
    ${opts.solo?`<button class="btn small ghost ms${cfg.solo?' on':''}" type="button" data-solo="${id}" aria-pressed="${!!cfg.solo}" title="Solo">S</button>`:''}
    ${opts.learn!==false?`<button class="btn small ghost" type="button" data-learn="vol:${id}" id="learn-vol:${id}" title="Learn a fader for this volume">Fader</button>`:''}
  </div>`;
}
function updateFaderUI(id){ const cfg=chCfg(id); if(!cfg) return; document.querySelectorAll(`[data-vol="${CSS.escape(id)}"]`).forEach(r=>r.value=Math.round(cfg.vol*100));
  document.querySelectorAll(`[data-volv="${CSS.escape(id)}"]`).forEach(r=>r.textContent=Math.round(cfg.vol*100));
  document.querySelectorAll(`.fader[data-ch="${CSS.escape(id)}"]`).forEach(f=>f.style.setProperty('--p',cfg.vol.toFixed(3))); }
document.addEventListener('input',e=>{ const r=e.target.closest&&e.target.closest('[data-vol]'); if(r){ ensureAudio(); chSet(r.dataset.vol,'vol',+r.value/100); } });
document.addEventListener('click',e=>{
  const m=e.target.closest('[data-mute]'); if(m){ const cfg=chCfg(m.dataset.mute); cfg.mute=!cfg.mute; chApply(m.dataset.mute); MIX[m.dataset.mute]?saveMix():saveProject(); m.classList.toggle('on',cfg.mute); m.setAttribute('aria-pressed',cfg.mute); renderTracks(); return; }
  const s=e.target.closest('[data-solo]'); if(s){ const cfg=chCfg(s.dataset.solo); cfg.solo=!cfg.solo; refreshTrackGains(); saveProject(); renderTracks(); }
});
function renderMixer(){
  const ch=[['keys','Keys',zoneInst('keys').name],['pads','Pads',zoneInst('pads').name],['master','Master','After effects']];
  $('#mixer').innerHTML=ch.map(([id,nm,sub])=>`<div class="mstrip"><div class="mname"><b>${nm}</b><span>${esc(sub)}</span></div>${stripControls(id,MIX[id],{name:nm})}</div>`).join('');
}
