
/* ---------- custom sounds from the Sound Lab ---------- */
const IDB={db:null,
  open(){ if(this.db) return Promise.resolve(this.db); return new Promise((res,rej)=>{ try{ const rq=indexedDB.open('studio-keys',2);
    rq.onupgradeneeded=()=>{ const db=rq.result; ['samples','audio','projects'].forEach(n=>{ if(!db.objectStoreNames.contains(n)) db.createObjectStore(n); }); };
    rq.onsuccess=()=>{ this.db=rq.result; res(this.db); }; rq.onerror=()=>rej(rq.error); }catch(e){ rej(e); } }); },
  async tx(store,mode,fn){ const db=await this.open(); return new Promise((res,rej)=>{ const t=db.transaction(store,mode), st=t.objectStore(store), r=fn(st); t.oncomplete=()=>res(r&&r.result); t.onerror=()=>rej(t.error); }); },
  put(k,v,store='samples'){ return this.tx(store,'readwrite',s=>s.put(v,k)); }, get(k,store='samples'){ return this.tx(store,'readonly',s=>s.get(k)); },
  del(k,store='samples'){ return this.tx(store,'readwrite',s=>s.delete(k)); }, all(store){ return this.tx(store,'readonly',s=>s.getAll()); }
};
let CUSTOM=store.get('custom',[]);
const persistCustom=()=>store.set('custom',CUSTOM);
function makeCustomInst(meta,data){
  if(meta.kind==='sampler'){
    if(!data) return null; let ab;
    try{ ab=new AudioBuffer({length:data.length,numberOfChannels:1,sampleRate:meta.sr}); ab.copyToChannel(data,0); }catch(e){ return null; }
    const s={buffer:ab,rootFreq:meta.rootFreq,percussive:meta.percussive,loop:meta.loop,release:meta.release};
    return {id:meta.id,name:meta.name,cat:'Mine',custom:true,percussive:meta.percussive,gm:0,desc:`Sampler · ${meta.label} from ${meta.source}${meta.percussive?' · one-shot':' · root '+noteName(Math.round(ftom(meta.rootFreq)))}`,play:(c,d,n,v,t)=>playSampler(s,c,d,n,v,t)};
  }
  const p=meta.patch;
  return {id:meta.id,name:meta.name,cat:'Mine',custom:true,percussive:!!p.drum,gm:0,desc:`Synth · ${meta.label} resynth from ${meta.source}${meta.shape?' · '+meta.shape.toLowerCase()+'-like':''}`,play:(c,d,n,v,t)=>playResynth(p,c,d,n,v,t)};
}
function registerInst(inst){ INST.set(inst.id,inst); if(!ORDER.includes(inst.id)) ORDER.push(inst.id); }
async function loadCustom(){
  const keep=[];
  for(const m of CUSTOM){
    let data=null;
    if(m.kind==='sampler'){ try{ const r=await IDB.get(m.id); if(r&&r.data) data=r.data; }catch(e){} if(!data) continue; }
    const inst=makeCustomInst(m,data); if(inst){ registerInst(inst); keep.push(m); }
  }
  CUSTOM=keep; persistCustom(); renderRack();
}
function deleteCustom(id){
  const m=CUSTOM.find(x=>x.id===id); if(!m) return;
  CUSTOM=CUSTOM.filter(x=>x.id!==id); persistCustom(); INST.delete(id); ORDER.splice(ORDER.indexOf(id),1);
  if(m.kind==='sampler') IDB.del(id).catch(()=>{});
  if(ZONES.keys===id) setZone('keys','piano'); if(ZONES.pads===id) setZone('pads','kitAcoustic');
  renderRack(); toast(`Deleted “${m.name}”`);
}
