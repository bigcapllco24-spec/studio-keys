
/* ---------- the studio assistant: answers to its name, hears hums, uses the AI on the hosted site ----------
   Brain: POST /api/assistant on the Studio Keys Worker (Workers AI, or Claude if the Worker has an
   ANTHROPIC_API_KEY secret). Anywhere else (local file, Claude preview) it falls back to localBrain(). */
const SRc=window.SpeechRecognition||window.webkitSpeechRecognition;
const MIC_OFF=/^\s*(?:(?:ok|okay|please|now|hey)\s+)*(?:stop listening|stop hearing( me)?|don'?t listen|quit listening|turn (?:off )?(?:the )?(?:mic|microphone)(?: off)?|(?:mic|microphone) off|switch (?:off )?(?:the )?(?:mic|microphone)(?: off)?|mute (?:the |my )?(?:mic|microphone)|(?:stop|close) (?:the )?(?:mic|microphone)|go to sleep)\b/i;
const ASSIST={
  name:store.get('asName','Keys'), listening:false, voice:store.get('asVoice',true), hum:store.get('asHum',true),
  engine:null, rec:null, awakeUntil:0, speaking:false, busy:false, history:[], humNotes:[], humLast:0, speechAt:0, changes:[], focus:null,
  say(msg,opts={}){ addBubble('as',msg,opts.chips,opts.map); if(this.voice && opts.speak!==false) speak(msg); },
  run(text){ return handleRequest(text); },
  onMicNote(n,on){ if(ASSIST.listening||LOOP.state==='take') showSung(n,on); humNote(n,on); }
};
/* singing vs talking: speech recognition also "hears" humming (la, da, hmm). Only real words count as talking. */
const FILLER=/^(la+|da+|na+|ba+|doo+|du+|dum+|dun|bum+|bam|ta+|ti|di|do+|re|mi|fa|so|sol|si|hmm+|mm+|m+|uh+|ah+|oh+|ooh+|ha+|hey|yeah|ya|yo|woo+|hu+m*|ding|dong|pa+|pum)$/;
function isSpeechy(text){ const w=(String(text).toLowerCase().match(/[a-z']+/g)||[]); if(findWake(text)!==null) return true; return w.filter(x=>x.length>=3&&!FILLER.test(x)).length>=2; }
function showSung(n,on){ const box=$('#asNotes'); if(!box) return; if(on){ ASSIST.sung=(ASSIST.sung||[]).concat(n).slice(-14); }
  box.hidden=false; box.innerHTML=`<span class="as-mic${on?' live':''}">🎤 ${on?noteName(n):'listening'}</span>`+(ASSIST.sung||[]).map((x,i,a)=>`<i${i===a.length-1&&on?' class="now"':''}>${noteName(x)}</i>`).join('');
  clearTimeout(ASSIST.sungT); ASSIST.sungT=setTimeout(()=>{ if(!MIC.active&&LOOP.state!=='take'){ box.hidden=true; ASSIST.sung=[]; } },6000); }
function addBubble(who,text,chips,map){
  const box=$('#asChat'); const d=document.createElement('div'); d.className='bub '+who;
  d.innerHTML=`<span class="who">${who==='me'?'You':esc(ASSIST.name)}</span><span>${esc(text)}</span>${chips&&chips.length?`<span class="done">${chips.map(c=>`<i>${esc(c)}</i>`).join('')}</span>`:''}${map||''}`;
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
/* the mini song map under a reply that changed the song (AI-1): blocks sized by bars, the changed ones outlined. The Undo is the chip in the song view */
function songMapHTML(changed){ if(typeof songArranged!=='function'||!songArranged()) return ''; const S=songSections(), sh=S.length>4?songShortNames(S):null, ch=new Set(changed||[]);
  return `<span class="as-map" role="img" aria-label="${esc('Song: '+S.map(s=>s.name+' '+s.bars+' bars').join(', '))}">${S.map(s=>`<i class="k-${s.kind}${ch.has(s.id)?' ch':''}" style="flex-grow:${s.bars}" title="${esc(s.name)} · ${s.bars} bars"><b>${esc(sh?sh[s.id]:s.name)}</b>${s.bars}</i>`).join('')}</span>`; }
/* what to suggest next, one element at a time */
function nextStep(){ const has=r=>PROJ.tracks.some(t=>t.role===r);
  if(!PROJ.tracks.length) return `Start with “drums”, name an artist, or hum an idea.`;
  if(!has('drums')) return `Want drums under it? Say “drums like …” with an artist.`;
  if(!has('bass')) return `Bassline next? Say “add a bassline”, or sing it: “let me sing the bassline”.`;
  if(!has('chords')) return `Chords next? Say “add chords”, or “let me sing the chords”.`;
  if(!has('melody')) return `A melody or hook next? Add one, or hum it while it plays.`;
  if(typeof songArranged==='function'&&songArranged()){ const S=songSections(), n=k=>S.filter(s=>s.kind===k).length, out=S.find(s=>s.kind==='outro'), d=PROJ.tracks.find(t=>t.role==='drums');
    /* a different pair each time, and only moves that still make sense for this layout */
    /* never the move the user just asked for (QA fix 2: "make the break longer" got the tip "make the break longer") */
    const u=normName(LAST_TEXT.text||''), just=[/\bbreak\b.*\b(longer|lamba|lambi|extend)|\b(longer|extend)\b.*\bbreak\b/,/\b(second|2nd|another|one more|dusra|ek aur)\b.*\bdrop\b|\bdrop 2\b/,/\b(second|2nd|drop 2)\b.*\b(different|vary|change|alag)\b|\bdrop 2\b/,/\boutro\b.*\bdrums?\b|\bdrums?\b.*\boutro\b/,/\b(roll|riser|silence|gap|fill)\b/,/\bkick\b.*\bintro\b|\bintro\b.*\bkick\b/];
    const ideas=[n('break')&&'“make the break longer”',n('drop')<2&&'“add a second drop”',n('drop')>=2&&'“make the second drop different”',out&&d&&out.parts[d.id]&&out.parts[d.id].on&&'“drop the drums in the outro”',n('drop')&&'“a snare roll before the drop”','“take the kick out of the intro”'].map((x,i)=>x&&!(u&&just[i].test(u))&&x).filter(Boolean);
    if(!ideas.length) ideas.push('“play the whole song”'); const k=ASSIST.history.length%ideas.length;
    const two=[ideas[k],ideas[(k+1)%ideas.length]].filter((x,i,a)=>x&&a.indexOf(x)===i);
    return `Shape the song: ${two.join(', ')}, or download the MP3.`; }
  /* the tip names the part just worked on (QA, 22 Nov fix 4: no chords tip while working on the bass) */
  const fp={drums:'drums',bass:'bass',chords:'chords',melody:'melody'}[ASSIST.focus]||'chords';
  return `Shape it with effects (“more reverb on the ${fp}”), mix it, make it a full track, or download the MP3.`; }
/* the conversation's memory (AI-9): one line per request, what was said and what changed, the last 10 go to the AI as "recent".
   The focus is the one part the last request was about, so "make it softer" right after the bass means the bass. */
function noteChange(said,acts,done,touched){ said=String(said||'').trim(); if(!said) return;
  const named=typeof partsSaid==='function'?[...partsSaid(said)]:[], parts=named.length?named:(touched||[]).filter(r=>r&&r!=='free');
  const what=(done&&done.length?done.join('; '):((BATCH.notes||[]).map(n=>n.text).join(' ')||'nothing changed')).replace(/\s+/g,' ');
  ASSIST.changes.push({said,parts,line:`“${said.slice(0,70)}” → ${what.slice(0,110)}`}); if(ASSIST.changes.length>20) ASSIST.changes.shift();
  const song=acts.some(a=>/^(arrange|section|parts|transition|vibe|style|new_project)$/.test(a.type)||a.type==='mix'&&/^(all|master)$/i.test(String(a.track||'')));
  /* a request that changed nothing and named no part ("make it shorter" that couldn't be done) keeps the focus (QA, 22 Nov fix 2) */
  if(!song&&!parts.length&&!(done&&done.length)) return;
  ASSIST.focus=!song&&parts.length===1?parts[0]:null; }
function projectState(){
  /* the song layout first, so the Worker's 7,000-character cut never drops it */
  return {arrangement:typeof songSummary==='function'?songSummary():null,
    /* the conversation so far, oldest first, and the part talked about last (AI-9) */
    recent:ASSIST.changes.slice(-10).map(c=>c.line),focus:ASSIST.focus,chords:typeof chordsSaid==='function'?chordsSaid():null,
    name:PROJ.name,bpm:CTRL.bpm,bars:PROJ.bars,key:PROJ.key?keyName(PROJ.key):`auto (${keyName(projectKey())})`,style:PROJ.style||null,playing:TR.running,
    tracks:PROJ.tracks.map(t=>({name:t.name,role:t.role,instrument:t.kind==='audio'?'recorded audio':(INST.get(t.inst)||{}).name,notes:t.events.length,volume:Math.round(t.vol*100),muted:!!t.mute,soloed:!!t.solo,generated:!!t.gen})),
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
  /* "stop listening", "turn off the mic": the assistant and microphone, never the song's transport (QA, 21 Nov) */
  if(MIC_OFF.test(text.replace(new RegExp('^\\s*(?:(?:hey|hi|ok|okay)\\s+)?'+ASSIST.name.replace(/[^a-z0-9 ]/gi,'')+'\\b[\\s,:!.-]*','i'),''))){ const was=ASSIST.listening||MIC.on; if(ASSIST.listening) stopListening(); if(MIC.on&&LOOP.state!=='take'&&LOOP.state!=='counting') micStop();
    const r=was?`OK, I’ve stopped listening and the mic is off. Tap the orb or type when you need me.`:`I wasn’t listening, and the mic is off. Tap the orb or type when you need me.`;
    ASSIST.history.push({role:'assistant',content:r}); LAST_TEXT.text=''; ASSIST.say(r); if(!ASSIST.voice) setOrb('idle',idleText()); return; }
  ASSIST.busy=true; setOrb('thinking','Working on it…');
  let reply='', done=[], cut=false; /* cut: every sentence of the AI's reply was about something that didn't happen */
  if(ASSIST.engine){
    try{
      const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),25000);
      const r=await fetch('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},signal:ctl.signal,body:JSON.stringify({text,state:projectState(),history:ASSIST.history.slice(-8),instruments:ORDER.map(id=>{ const I=INST.get(id); return `${id}: ${I.name} (${I.cat})`; })})});
      clearTimeout(to); const j=await r.json(); if(!r.ok||j.error) throw new Error(j.error||('HTTP '+r.status));
      done=runActions(j.actions||[]); reply=j.reply||'';
      /* the guard dropped or moved some of the AI's actions: never keep its claim about them (QA, 22 Nov fix 2) */
      if(!BATCH.local&&typeof honestReply==='function'){ const h=honestReply(reply); if(reply.trim()&&!h) cut=true;
        /* the claim was dropped because nothing could change ("already at full volume"): say why, then keep Keys' question (QA, 22 Nov fix 7) */
        /* every change was "already like that": say so instead of the AI's claim, and keep its questions (any language) */
        if(h&&done.length&&done.every(d=>/\balready\b/i.test(d))&&!/\balready\b/i.test(h)&&typeof shortDone==='function'){ const qs=(h.match(/[^.!?]+[.!?]*\s*/g)||[]).filter(x=>REPLY_ASKS.test(x.trim())).join('').trim(); reply=(shortDone(done)+' '+qs).trim(); } else reply=h; }
      /* the guard used the offline brain's one-part change instead of the AI's (AI-9 fix): its reply says what really changed */
      if(BATCH.local){ const r2=brainReply(BATCH.local,done); reply=r2||(done.length?'':reply); BATCH.guarded=null; BATCH.retold=false; }
      /* the AI's mix or effect moves changed nothing (an EQ on "all", a fader already there): never claim them (QA, 22 Nov) */
      else if(!done.length&&(j.actions||[]).length&&(j.actions||[]).every(a=>/^(mix|track_fx|fx)$/.test(a&&a.type))&&!BATCH.declined&&!(BATCH.notes||[]).length){ const L=localBrain(text); if(L.actions&&L.actions.length){ done=runActions(L.actions); reply=brainReply(L,done); }
        if(!done.length&&!(BATCH.notes||[]).length) reply='That didn’t change anything, so the song is as it was. Tell me which part to change, for example “turn the bass down a bit”.'; }
    }catch(e){ console.warn('assistant AI failed, using offline brain',e); const L=localBrain(text); done=runActions(L.actions); reply=brainReply(L,done); }
  } else { const L=localBrain(text); done=runActions(L.actions); reply=brainReply(L,done); }
  /* the AI sometimes offers a riser or a filter sweep as the next step; the studio has neither yet (D3), so offer what it has */
  if(reply&&!/\b(riser|sweep|uplifter)\b/i.test(text)) reply=reply.replace(/[^.!?]*\b(risers?|uplifters?|(?:filter |noise )?sweeps?)\b[^.!?]*\?/gi,()=>!songArranged()?'':/\broll/i.test(text)?' Want the second drop to be different?':' Want a snare roll into the drop?').replace(/\s+/g,' ').trim();
  /* nothing changed (it was already like that): say so, or say why (an executor note), and keep the AI's question if it asked one (QA fix 2) */
  if(BATCH.same){ const q=(reply.match(/[^.!?]*\?\s*$/)||[''])[0].trim(), why=(BATCH.notes||[]).map(n=>n.text); BATCH.notes=[];
    reply=(why.length?why.join(' '):`It’s already like that, so nothing changed${BATCH.same.length?': '+BATCH.same.join(', '):''}.`)+' '+(q||nextStep()); }
  /* "turn everything down except the drums": every other part moved, so the reply says that, not "the whole song" */
  if(BATCH.sayInstead&&done.length) reply=BATCH.sayInstead;
  /* what the executor knows and the AI didn't: a clamped length, a riser played as a roll, a missing part (AI-1) */
  const notes=(BATCH.notes||[]).filter(n=>!(n.unless&&n.unless.test(reply))).map(n=>n.text);
  /* the AI's "Turned the melody down 3 dB in the drop." next to the whole-song note: drop its untrue "in the drop" (QA, 22 Nov AI-14 fix 1) */
  { const wn=notes.map(n=>/^That’s in the whole song, not only the ([a-z0-9 ]+):/.exec(n)).find(Boolean); if(wn&&reply) reply=reply.replace(new RegExp('\\s*\\b(?:in|during|for|on) (?:the |both |all the |each )?(?:(?:first|second|last|1st|2nd) )?'+wn[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'s?(?: \\d)?\\b','gi'),'').replace(/\s+([.!?,])/g,'$1'); }
  if(BATCH.declined&&!done.length&&notes.length){ const q=(reply.match(/[^.!?]*\?\s*$/)||[''])[0].trim(); reply=notes.join(' ')+(q&&!notes.some(n=>/\?/.test(n))?' '+q:''); notes.length=0; }
  /* the AI's actions for other parts were left out (AI-9): say so, so the reply matches what changed */
  /* "make it softer" right after the bass went to the bass, not the whole song the AI said: say what really changed */
  if(BATCH.retold&&done.length&&ASSIST.engine) reply=done.join('. ')+'. Same notes, the rest stays as it was.';
  if(BATCH.guarded&&BATCH.guarded.length&&done.length&&ASSIST.engine&&!cut&&!notes.some(n=>/^Kept /.test(n))) notes.push('I only changed what you asked about; the rest stays as it was.');
  if(reply&&notes.length) reply=reply.replace(/\s*$/,'')+' '+notes.join(' ');
  else if(!reply&&!done.length&&notes.length) reply=notes.join(' ');
  /* while a sung take is about to start, no next-step hint: the part doesn't exist yet, and the hint would suggest singing it again */
  /* the AI's reply was all wrong: say the real change shortly, the way a person would, with no tip (QA, 22 Nov fix 3) */
  if(!reply&&cut&&done.length&&typeof shortDone==='function') reply=(shortDone(done)+(notes.length?' '+notes.join(' '):'')).trim();
  if(!reply) reply=done.length?('Done: '+done.join(', ')+'.'+(notes.length?' '+notes.join(' '):'')+(BATCH.take||notes.some(n=>/\bSay “/.test(n))?'':' '+nextStep())).trim():`I couldn’t turn that into a change. Try “add a trap beat at 140”, “hi-hats on 16ths”, “add an 808 bassline”, “piano chords”, “record a melody”, or just hum.`;
  ASSIST.history.push({role:'assistant',content:reply}); ASSIST.busy=false; LAST_TEXT.text='';
  const map=BATCH.song?songMapHTML(BATCH.song.changed):'';
  if(BATCH.take){ ASSIST.say(reply,{chips:done,speak:false,map}); if(ASSIST.voice) speak('Sing after the count-in.'); } else ASSIST.say(reply,{chips:done,map}); if(!ASSIST.voice) setOrb(ASSIST.listening?'listening':'idle',idleText());
  if(BATCH.take){ const part=BATCH.take; LAST_TAKE.part=part; afterSpeak(()=>TAKE.start(part)); }
}
/* the offline reply: a two-part sentence's reply is built after its actions ran, so it can say what each half did or skipped */
function brainReply(L,done){ try{ return typeof L.reply==='function'?L.reply(done):(L.reply||''); }catch(e){ return ''; } }
/* ---- speech recognition with a wake name ---- */
function lev(a,b){ const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i]); for(let j=1;j<=n;j++) d[0][j]=j; for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[m][n]; }
function findWake(text){
  const name=ASSIST.name.toLowerCase().trim(), words=text.toLowerCase().replace(/[^\w\s']/g,' ').split(/\s+/).filter(Boolean), nw=name.split(/\s+/).length;
  for(let i=0;i<words.length;i++){ const w=words.slice(i,i+nw).join(' '); if(w===name||(name.length>=4&&lev(w,name)<=1)||w===name+'s'||w+'s'===name){ return words.slice(i+nw).join(' '); } }
  return null;
}
function startListening(){
  if(!SRc){ ASSIST.say('Talking needs Chrome or Edge. You can still type here.',{speak:false}); return; }
  ensureAudio(); dropRec(); const tap=ASSIST.tapRec; ASSIST.tapRec=null; killRec(tap); ASSIST.listening=true; $('#asListen').checked=true;
  const rec=new SRc(); ASSIST.rec=rec; rec.continuous=true; rec.interimResults=true; rec.lang=navigator.language||'en-IN';
  rec.onresult=e=>{ if(ASSIST.rec!==rec) return; let interim='', heard='';
    for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i], txt=r[0].transcript; heard+=txt+' '; if(r.isFinal){ if(LOOP.state!=='take'||findWake(txt)!==null) onFinal(txt); } else interim+=txt; }
    if(isSpeechy(heard)) ASSIST.speechAt=performance.now()/1000;
    if(interim && isSpeechy(interim) && !ASSIST.speaking && !ASSIST.busy && LOOP.state!=='take') $('#asStatus').textContent='Hearing: '+interim; };
  rec.onerror=e=>{ if(ASSIST.rec!==rec) return; if(e.error==='not-allowed'||e.error==='service-not-allowed'){ stopListening(); ASSIST.say('I need microphone permission to listen. Allow it from the icon left of the address bar.',{speak:false}); }
    else if(e.error==='network'){ stopListening(); ASSIST.say('Voice recognition needs an internet connection. You can type instead.',{speak:false}); } };
  /* Chrome ends continuous recognition every so often: restart only the recogniser that is still current */
  rec.onend=()=>{ if(ASSIST.listening&&ASSIST.rec===rec) setTimeout(()=>{ if(ASSIST.listening&&ASSIST.rec===rec) try{ rec.start(); }catch(_){} },250); };
  try{ rec.start(); }catch(e){}
  if(ASSIST.hum && !MIC.on){ ASSIST.micByListen=true; micStart(); }
  setOrb('listening',idleText()); store.set('asListen',true);
}
/* switch off a recogniser for good: no restart, no late results */
function killRec(r){ if(!r) return; r.onresult=r.onerror=r.onend=null; try{ r.abort(); }catch(e){ try{ r.stop(); }catch(_){} } }
function dropRec(){ const r=ASSIST.rec; ASSIST.rec=null; killRec(r); }
/* close the microphone listening opened for humming. Not one the user opened with the Mic button;
   during a sung take it stays open and the take closes it when it ends. */
function releaseListenMic(){
  const byListen=ASSIST.micByListen; ASSIST.micByListen=false;
  if(MIC.byUser) return;
  if(LOOP.state==='take'||LOOP.state==='counting'){ if(MIC.on) TAKE.micByTake=true; return; }
  if(MIC.on||(MIC.pending&&byListen)) micStop();
}
function stopListening(){ ASSIST.listening=false; $('#asListen').checked=false; dropRec(); const t=ASSIST.tapRec; ASSIST.tapRec=null; killRec(t);
  ASSIST.awakeUntil=0; ASSIST.humNotes=[]; releaseListenMic();
  const take=LOOP.state==='take'||LOOP.state==='counting'; /* a sung take keeps its own orb, status and notes strip */
  if(!take){ clearTimeout(ASSIST.sungT); ASSIST.sung=[]; const nb=$('#asNotes'); if(nb) nb.hidden=true; if(!ASSIST.speaking&&!ASSIST.busy) setOrb('idle',idleText()); }
  store.set('asListen',false); }
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
  const rec=new SRc(); ASSIST.tapRec=rec; rec.lang=navigator.language||'en-IN'; rec.interimResults=true; rec.continuous=false;
  setOrb('listening','Go ahead, I’m listening…');
  rec.onresult=e=>{ let t=''; for(const r of e.results) t+=r[0].transcript; $('#asStatus').textContent='Hearing: '+t; if(e.results[e.results.length-1].isFinal){ const w=findWake(t); handleRequest(w!==null&&w.length>1?w:t); } };
  rec.onerror=e=>{ setOrb('idle',e.error==='no-speech'?'I didn’t hear anything. Tap the orb and try again.':e.error==='network'?'Voice recognition needs an internet connection. Type instead.':'Voice stopped ('+e.error+'). You can type instead.'); };
  rec.onend=()=>{ if(ASSIST.tapRec===rec) ASSIST.tapRec=null; if(!ASSIST.busy && !ASSIST.speaking) setOrb('idle',idleText()); };
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
  ev.sort((a,b)=>a.b-b.b);
  const count=PROJ.tracks.filter(t=>/^Hummed melody/.test(t.name)).length, inst=partInst('melody');
  const t=addTrack({role:'melody',inst,name:'Hummed melody'+(count?' '+(count+1):''),events:ev});
  ASSIST.say(`Got your hum: ${ev.length} notes${key?' in '+keyName(key):''} on “${t.name}”${playing?', lined up with the loop':''}. Want it as a bassline or chords instead? Just say “${ASSIST.name}, make it the bass”.`,{chips:[`${ev.length} notes`,INST.get(inst).name]});
  ASSIST.lastHum=t.id;
},400);
/* ---- controls ---- */
$('#asForm').addEventListener('submit',e=>{ e.preventDefault(); const v=$('#asIn').value.trim(); if(v){ $('#asIn').value=''; handleRequest(v); } });
/* listening always starts off after a reload (the browser may restore the old tick, so clear it) */
$('#asListen').checked=false; $('#asListen').addEventListener('change',e=>e.target.checked?startListening():stopListening());
$('#asName').value=ASSIST.name; $('#asName').addEventListener('change',e=>{ ASSIST.name=e.target.value.trim()||'Keys'; store.set('asName',ASSIST.name); $('#asNameLbl').textContent=ASSIST.name; setOrb(ASSIST.listening?'listening':'idle',idleText()); });
$('#asVoice').checked=ASSIST.voice; $('#asVoice').addEventListener('change',e=>{ ASSIST.voice=e.target.checked; store.set('asVoice',ASSIST.voice); if(!ASSIST.voice) try{ speechSynthesis.cancel(); }catch(_){} });
$('#asHum').checked=ASSIST.hum; $('#asHum').addEventListener('change',e=>{ ASSIST.hum=e.target.checked; store.set('asHum',ASSIST.hum);
  if(ASSIST.hum&&ASSIST.listening&&!MIC.on){ ASSIST.micByListen=true; micStart(); } else if(!ASSIST.hum&&ASSIST.listening) releaseListenMic(); });
document.addEventListener('click',e=>{ const c=e.target.closest('[data-say]'); if(c && !c.dataset.add) handleRequest(c.dataset.say); });
$('#asNameLbl').textContent=ASSIST.name;
setOrb('idle',idleText());
