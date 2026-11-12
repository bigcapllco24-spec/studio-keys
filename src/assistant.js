
/* ---------- the studio assistant: answers to its name, hears hums, uses the AI on the hosted site ----------
   Brain: POST /api/assistant on the Studio Keys Worker (Workers AI, or Claude if the Worker has an
   ANTHROPIC_API_KEY secret). Anywhere else (local file, Claude preview) it falls back to localBrain(). */
const SRc=window.SpeechRecognition||window.webkitSpeechRecognition;
const ASSIST={
  name:store.get('asName','Keys'), listening:false, voice:store.get('asVoice',true), hum:store.get('asHum',true),
  engine:null, rec:null, awakeUntil:0, speaking:false, busy:false, history:[], humNotes:[], humLast:0, speechAt:0,
  say(msg,opts={}){ addBubble('as',msg,opts.chips); if(this.voice && opts.speak!==false) speak(msg); },
  run(text){ return handleRequest(text); },
  onMicNote(n,on){ if(ASSIST.listening||LOOP.state==='take') showSung(n,on); humNote(n,on); }
};
/* singing vs talking: speech recognition also "hears" humming (la, da, hmm). Only real words count as talking. */
const FILLER=/^(la+|da+|na+|ba+|doo+|du+|dum+|dun|bum+|bam|ta+|ti|di|do+|re|mi|fa|so|sol|si|hmm+|mm+|m+|uh+|ah+|oh+|ooh+|ha+|hey|yeah|ya|yo|woo+|hu+m*|ding|dong|pa+|pum)$/;
function isSpeechy(text){ const w=(String(text).toLowerCase().match(/[a-z']+/g)||[]); if(findWake(text)!==null) return true; return w.filter(x=>x.length>=3&&!FILLER.test(x)).length>=2; }
function showSung(n,on){ const box=$('#asNotes'); if(!box) return; if(on){ ASSIST.sung=(ASSIST.sung||[]).concat(n).slice(-14); }
  box.hidden=false; box.innerHTML=`<span class="as-mic${on?' live':''}">🎤 ${on?noteName(n):'listening'}</span>`+(ASSIST.sung||[]).map((x,i,a)=>`<i${i===a.length-1&&on?' class="now"':''}>${noteName(x)}</i>`).join('');
  clearTimeout(ASSIST.sungT); ASSIST.sungT=setTimeout(()=>{ if(!MIC.active&&LOOP.state!=='take'){ box.hidden=true; ASSIST.sung=[]; } },6000); }
function addBubble(who,text,chips){
  const box=$('#asChat'); const d=document.createElement('div'); d.className='bub '+who;
  d.innerHTML=`<span class="who">${who==='me'?'You':esc(ASSIST.name)}</span><span>${esc(text)}</span>${chips&&chips.length?`<span class="done">${chips.map(c=>`<i>${esc(c)}</i>`).join('')}</span>`:''}`;
  box.appendChild(d); while(box.children.length>14) box.firstChild.remove(); box.scrollTop=box.scrollHeight;
}
function setOrb(state,text){ const o=$('#asOrb'); o.dataset.state=state; $('#asStatus').textContent=text; }
function idleText(){ return ASSIST.listening?`Listening. Say “${ASSIST.name}” and what you want, or hum a melody.`:`Press the orb and speak, or type below. Turn on “Always listening” to just say “${ASSIST.name}”.`; }
function speak(msg){
  if(!('speechSynthesis' in window)) return; try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(msg.replace(/[“”]/g,'')); u.rate=1.05; u.pitch=1;
    const v=speechSynthesis.getVoices().find(x=>/en-(IN|GB|US)/.test(x.lang)&&/female|natural|google/i.test(x.name))||speechSynthesis.getVoices().find(x=>/^en/.test(x.lang)); if(v) u.voice=v;
    const done=()=>{ if(!ASSIST.speaking) return; ASSIST.speaking=false; clearTimeout(ASSIST.speakT); setOrb(ASSIST.listening?'listening':'idle',idleText()); ASSIST.awakeUntil=performance.now()+8000; };
    ASSIST.speaking=true; setOrb('speaking','Speaking…'); u.onend=u.onerror=done;
    clearTimeout(ASSIST.speakT); ASSIST.speakT=setTimeout(done,1500+msg.split(/\s+/).length*420); /* some browsers never report the end of speech */
    speechSynthesis.speak(u); }catch(e){ ASSIST.speaking=false; }
}
function afterSpeak(fn){ const t0=performance.now(); const w=()=>{ if(ASSIST.speaking&&performance.now()-t0<9000) return setTimeout(w,150); setTimeout(fn,250); }; w(); }
/* what to suggest next, one element at a time */
function nextStep(){ const has=r=>PROJ.tracks.some(t=>t.role===r);
  if(!PROJ.tracks.length) return `Start with “drums”, name an artist, or hum an idea.`;
  if(!has('drums')) return `Want drums under it? Say “drums like …” with an artist.`;
  if(!has('bass')) return `Bassline next? Say “add a bassline”, or sing it: “let me sing the bassline”.`;
  if(!has('chords')) return `Chords next? Say “add chords”, or “let me sing the chords”.`;
  if(!has('melody')) return `A melody or hook next? Add one, or hum it while it plays.`;
  return `Shape it with effects (“more reverb on the chords”), mix it, or download the MP3.`; }
function projectState(){
  return {name:PROJ.name,bpm:CTRL.bpm,bars:PROJ.bars,key:PROJ.key?keyName(PROJ.key):`auto (${keyName(projectKey())})`,style:PROJ.style||null,playing:TR.running,
    tracks:PROJ.tracks.map(t=>({name:t.name,role:t.role,instrument:t.kind==='audio'?'recorded audio':(INST.get(t.inst)||{}).name,notes:t.events.length,volume:Math.round(t.vol*100),muted:!!t.mute})),
    taste:TASTE.profile?{artists:(TASTE.profile.artists||[]).slice(0,12),styles:(TASTE.profile.styles||[]).map(s=>s.style),playlists:(TASTE.profile.playlists||[]).map(p=>p.name+(p.style?' ('+p.style+')':'')).slice(0,8)}:null,
    vibe:PROJ.ref||null,
    keysSound:zoneInst('keys').name,padsSound:zoneInst('pads').name,effects:FX.slots.map(s=>`${FX_LIB[s.type].name} ${Math.round(s.amount*100)}%`)};
}
async function detectEngine(){
  if(!/^https?:$/.test(location.protocol)){ ASSIST.engine=null; showEngine(); return; }
  try{ const r=await fetch('/api/assistant',{method:'GET',cache:'no-store'}); const j=await r.json(); ASSIST.engine=j&&j.ok?j.engine:null; }catch(e){ ASSIST.engine=null; }
  showEngine();
}
function showEngine(){ $('#asEngine').innerHTML=ASSIST.engine?`<span class="led on"></span>AI: ${ASSIST.engine==='claude'?'Claude':'Llama 3.3 on Cloudflare'}`:`<span class="led warn"></span>Basic mode (AI works on the live site)`; }
async function handleRequest(text){
  text=String(text||'').trim(); if(!text) return; ensureAudio();
  addBubble('me',text); ASSIST.history.push({role:'user',content:text}); LAST_TEXT.text=text;
  ASSIST.busy=true; setOrb('thinking','Working on it…');
  let reply='', done=[];
  if(ASSIST.engine){
    try{
      const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),25000);
      const r=await fetch('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},signal:ctl.signal,body:JSON.stringify({text,state:projectState(),history:ASSIST.history.slice(-8),instruments:ORDER.map(id=>{ const I=INST.get(id); return `${id}: ${I.name} (${I.cat})`; })})});
      clearTimeout(to); const j=await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status));
      done=runActions(j.actions||[]); reply=j.reply||'';
    }catch(e){ console.warn('assistant AI failed, using offline brain',e); const L=localBrain(text); done=runActions(L.actions); reply=L.reply||''; }
  } else { const L=localBrain(text); done=runActions(L.actions); reply=L.reply||''; }
  if(!reply) reply=done.length?'Done: '+done.join(', ')+'. '+nextStep():`I couldn’t turn that into a change. Try “add a trap beat at 140”, “hi-hats on 16ths”, “add an 808 bassline”, “piano chords”, “record a melody”, or just hum.`;
  ASSIST.history.push({role:'assistant',content:reply}); ASSIST.busy=false; LAST_TEXT.text='';
  if(BATCH.take){ ASSIST.say(reply,{chips:done,speak:false}); if(ASSIST.voice) speak('Sing after the count-in.'); } else ASSIST.say(reply,{chips:done}); if(!ASSIST.voice) setOrb(ASSIST.listening?'listening':'idle',idleText());
  if(BATCH.take){ const part=BATCH.take; LAST_TAKE.part=part; afterSpeak(()=>TAKE.start(part)); }
}
/* ---- speech recognition with a wake name ---- */
function lev(a,b){ const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i]); for(let j=1;j<=n;j++) d[0][j]=j; for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[m][n]; }
function findWake(text){
  const name=ASSIST.name.toLowerCase().trim(), words=text.toLowerCase().replace(/[^\w\s']/g,' ').split(/\s+/).filter(Boolean), nw=name.split(/\s+/).length;
  for(let i=0;i<words.length;i++){ const w=words.slice(i,i+nw).join(' '); if(w===name||(name.length>=4&&lev(w,name)<=1)||w===name+'s'||w+'s'===name){ return words.slice(i+nw).join(' '); } }
  return null;
}
function startListening(){
  if(!SRc){ ASSIST.say('Talking needs Chrome or Edge. You can still type here.',{speak:false}); return; }
  ensureAudio(); ASSIST.listening=true; $('#asListen').checked=true;
  const rec=new SRc(); ASSIST.rec=rec; rec.continuous=true; rec.interimResults=true; rec.lang=navigator.language||'en-IN';
  rec.onresult=e=>{ let interim='', heard='';
    for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i], txt=r[0].transcript; heard+=txt+' '; if(r.isFinal){ if(LOOP.state!=='take'||findWake(txt)!==null) onFinal(txt); } else interim+=txt; }
    if(isSpeechy(heard)) ASSIST.speechAt=performance.now()/1000;
    if(interim && isSpeechy(interim) && !ASSIST.speaking && !ASSIST.busy && LOOP.state!=='take') $('#asStatus').textContent='Hearing: '+interim; };
  rec.onerror=e=>{ if(e.error==='not-allowed'||e.error==='service-not-allowed'){ stopListening(); ASSIST.say('I need microphone permission to listen. Allow it from the icon left of the address bar.',{speak:false}); }
    else if(e.error==='network'){ stopListening(); ASSIST.say('Voice recognition needs an internet connection. You can type instead.',{speak:false}); } };
  rec.onend=()=>{ if(ASSIST.listening) setTimeout(()=>{ try{ rec.start(); }catch(_){} },250); };
  try{ rec.start(); }catch(e){}
  if(ASSIST.hum && !MIC.on) micStart();
  setOrb('listening',idleText()); store.set('asListen',true);
}
function stopListening(){ ASSIST.listening=false; $('#asListen').checked=false; try{ ASSIST.rec&&ASSIST.rec.stop(); }catch(e){} ASSIST.rec=null; setOrb('idle',idleText()); store.set('asListen',false); }
function onFinal(txt){
  if(ASSIST.speaking||!isSpeechy(txt)&&findWake(txt)===null&&performance.now()>ASSIST.awakeUntil) return; const now=performance.now();
  const cmd=findWake(txt);
  if(cmd!==null){ if(cmd.replace(/\b(hey|ok|okay|hi|please)\b/g,'').trim().length<2){ ASSIST.awakeUntil=now+9000; ASSIST.say('Yes?'); return; } handleRequest(cmd); return; }
  if(now<ASSIST.awakeUntil){ ASSIST.awakeUntil=0; handleRequest(txt); return; }
  $('#asStatus').textContent=`Heard “${txt.trim()}”. Start with “${ASSIST.name}” when you’re talking to me.`;
}
/* one request without the wake name: tap the orb */
$('#asOrb').addEventListener('click',()=>{
  ensureAudio(); if(!SRc){ $('#asIn').focus(); return; }
  if(ASSIST.listening){ ASSIST.awakeUntil=performance.now()+9000; setOrb('listening','Go ahead, I’m listening…'); return; }
  const rec=new SRc(); rec.lang=navigator.language||'en-IN'; rec.interimResults=true; rec.continuous=false;
  setOrb('listening','Go ahead, I’m listening…');
  rec.onresult=e=>{ let t=''; for(const r of e.results) t+=r[0].transcript; $('#asStatus').textContent='Hearing: '+t; if(e.results[e.results.length-1].isFinal){ const w=findWake(t); handleRequest(w!==null&&w.length>1?w:t); } };
  rec.onerror=e=>{ setOrb('idle',e.error==='no-speech'?'I didn’t hear anything. Tap the orb and try again.':e.error==='network'?'Voice recognition needs an internet connection. Type instead.':'Voice stopped ('+e.error+'). You can type instead.'); };
  rec.onend=()=>{ if(!ASSIST.busy && !ASSIST.speaking) setOrb('idle',idleText()); };
  try{ rec.start(); }catch(e){}
});
/* ---- humming becomes a track: when the song is stopped, a hummed phrase (3+ notes, no words) lands on a new layer ---- */
function humNote(n,on){
  if(!ASSIST.listening||!ASSIST.hum||ASSIST.speaking||ASSIST.busy||(TR.running&&LOOP.state!=='playing')||LOOP.state==='take'||LOOP.state==='counting') return;
  const t=performance.now()/1000; if(on&&!ASSIST.humNotes.length) ASSIST.humAt={ctx:A.ctx?A.ctx.currentTime-0.07:0,perf:t,playing:TR.running};
  if(on) ASSIST.humNotes.push({n,t0:t,t1:null}); else { const last=ASSIST.humNotes[ASSIST.humNotes.length-1]; if(last&&last.t1==null) last.t1=t; }
  ASSIST.humLast=t; if(ASSIST.humNotes.length>=2) $('#asStatus').textContent=`Hearing a melody… ${ASSIST.humNotes.length} notes`;
}
setInterval(()=>{
  const H=ASSIST.humNotes; if(!H.length) return; const now=performance.now()/1000;
  const long=now-H[0].t0>Math.max(8,PROJ.bars*4*spb()+0.5);
  if(!long && (now-ASSIST.humLast<1.1 || H.some(x=>x.t1==null&&now-x.t0<4))) return;
  ASSIST.humNotes=[]; H.forEach(x=>{ if(x.t1==null) x.t1=ASSIST.humLast; });
  const notes=H.filter(x=>x.t1-x.t0>=0.09), first=notes.length?notes[0].t0:0, last=notes.length?notes[notes.length-1].t1:0;
  const talked=ASSIST.speechAt>first-0.4 && ASSIST.speechAt<last+1.2;
  if(notes.length<3 || last-first<0.8 || talked){ if(ASSIST.listening) setOrb('listening',idleText()); return; }
  const s=spb(), q=0.25, at=ASSIST.humAt||{}, playing=at.playing&&TR.running, Lp=PROJ.bars*4;
  const startB=playing?mod(Math.round(((at.ctx+(first-at.perf))-TR.t0)/s/q)*q,Lp):0;
  let ev=notes.map(x=>({b:startB+Math.round((x.t0-first)/s/q)*q,d:Math.max(q,Math.round((x.t1-x.t0)/s/q)*q),n:x.n,v:0.85}));
  if(playing) ev.forEach(e=>e.b=mod(e.b,Lp));
  for(let i=0;i<ev.length-1;i++) if(ev[i].b+ev[i].d>ev[i+1].b) ev[i].d=Math.max(q,ev[i+1].b-ev[i].b);
  const endBeat=Math.max(...ev.map(e=>e.b+e.d));
  if(!PROJ.tracks.length&&!playing){ const bars=[1,2,4,8].find(b=>b*4>=endBeat)||8; PROJ.bars=bars; $('#barsSel').value=String(bars); }
  const L=PROJ.bars*4; ev=ev.filter(e=>e.b<L).map(e=>Object.assign(e,{d:Math.min(e.d,L-e.b)}));
  const key=PROJ.key||(ev.length>=4?detectKey(ev):null); if(!PROJ.key&&key) setKey(key);
  if(key) ev.forEach(e=>e.n=snapToKey(e.n,key));
  ev.sort((a,b)=>a.b-b.b);
  const count=PROJ.tracks.filter(t=>/^Hummed melody/.test(t.name)).length, inst=partInst('melody');
  const t=addTrack({role:'melody',inst,name:'Hummed melody'+(count?' '+(count+1):''),events:ev});
  ASSIST.say(`Got your hum: ${ev.length} notes${key?' in '+keyName(key):''} on “${t.name}”${playing?', lined up with the loop':''}. Want it as a bassline or chords instead? Just say “${ASSIST.name}, make it the bass”.`,{chips:[`${ev.length} notes`,INST.get(inst).name]});
  ASSIST.lastHum=t.id;
},400);
/* ---- controls ---- */
$('#asForm').addEventListener('submit',e=>{ e.preventDefault(); const v=$('#asIn').value.trim(); if(v){ $('#asIn').value=''; handleRequest(v); } });
$('#asListen').addEventListener('change',e=>e.target.checked?startListening():stopListening());
$('#asName').value=ASSIST.name; $('#asName').addEventListener('change',e=>{ ASSIST.name=e.target.value.trim()||'Keys'; store.set('asName',ASSIST.name); $('#asNameLbl').textContent=ASSIST.name; setOrb(ASSIST.listening?'listening':'idle',idleText()); });
$('#asVoice').checked=ASSIST.voice; $('#asVoice').addEventListener('change',e=>{ ASSIST.voice=e.target.checked; store.set('asVoice',ASSIST.voice); if(!ASSIST.voice) try{ speechSynthesis.cancel(); }catch(_){} });
$('#asHum').checked=ASSIST.hum; $('#asHum').addEventListener('change',e=>{ ASSIST.hum=e.target.checked; store.set('asHum',ASSIST.hum); if(ASSIST.hum&&ASSIST.listening&&!MIC.on) micStart(); });
document.addEventListener('click',e=>{ const c=e.target.closest('[data-say]'); if(c && !c.dataset.add) handleRequest(c.dataset.say); });
$('#asNameLbl').textContent=ASSIST.name;
setOrb('idle',idleText());
