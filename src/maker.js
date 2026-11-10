
/* ---------- maker: talk or type what you want; Studio Keys builds and mixes it ---------- */
const STYLE_WORDS=[['dnb',/\b(dnb|jungle)\b/],['hiphop',/\b(hiphop|boom ?bap|rap)\b/],['lofi',/\blofi\b/],['trap',/\b(trap|drill)\b/],['house',/\b(house|deep house|disco)\b/],['techno',/\btechno\b/],['reggaeton',/\b(reggaeton|dembow|latin)\b/],['afro',/\b(afro|afrobeat|amapiano)\b/],['bhangra',/\b(bhangra|dhol|punjabi)\b/],['bollywood',/\b(bollywood|filmi|hindi)\b/],['rock',/\brock\b/],['pop',/\bpop\b/]];
const INST_WORDS=[['bass808',/\b808\b/],['reese',/\breese\b/],['moog',/\bmoog\b/],['slapbass',/\bslap\b/],['acbass',/\b(upright|acoustic bass|double bass)\b/],['subbass',/\bsub\b/],['acid',/\bacid\b/],['pluckbass',/\bpluck(y)? bass\b/],['synbass',/\bsynth bass\b/],
  ['piano',/\b(piano|grand)\b/],['epiano',/\b(rhodes|electric piano|e-?piano|keys)\b/],['organ',/\borgan\b/],['strings',/\b(strings|violins?|orchestra)\b/],['cello',/\bcello\b/],['harp',/\bharp\b/],['choir',/\b(choir|voices|aah)\b/],['brass',/\bbrass\b/],['trumpet',/\btrumpet\b/],['sax',/\bsax(ophone)?\b/],['flute',/\b(flute|bansuri)\b/],
  ['sitar',/\bsitar\b/],['shanai',/\b(shehnai|shanai)\b/],['steeldrum',/\bsteel\b/],['guitar',/\b(nylon|acoustic guitar|guitar)\b/],['eguitar',/\belectric guitar\b/],['marimba',/\bmarimba\b/],['kalimba',/\bkalimba\b/],['vibes',/\bvib(es|raphone)\b/],
  ['supersaw',/\b(super ?saw|trance|big synth)\b/],['pad',/\bpads?\b/],['lead',/\b(lead|synth lead)\b/],['pluck',/\bpluck\b/]];
const ROLE_WORDS=[['hats',/\bhats?\b/],['drums',/\b(drums?|beat|kick|groove|percussion)\b/],['bass',/\b(bass ?line|bass)\b/],['chords',/\b(chords?|pads?|harmony|progression)\b/],['melody',/\b(melody|lead|hook|riff|tune)\b/],['voice',/\b(voice|vocals?|singing)\b/]];
function findTracks(role){ return role==='all'?PROJ.tracks:PROJ.tracks.filter(t=>t.role===role||(role==='drums'&&t.role==='perc')); }
const sayLog=[];
function say(msg,ok=true){ sayLog.unshift({msg,ok}); sayLog.length=Math.min(sayLog.length,4); $('#makerSay').innerHTML=sayLog.map((l,i)=>`<div class="say${l.ok?'':' warn'}${i?' old':''}">${esc(l.msg)}</div>`).join(''); }
function styleOrDefault(t){ let s=null; for(const [k,re] of STYLE_WORDS) if(re.test(t)){ s=k; break; } return s; }
function instWord(t){ for(const [k,re] of INST_WORDS) if(re.test(t)) return k; return null; }
function ensureStyle(t){ const s=styleOrDefault(t); if(s){ PROJ.style=s; return s; } if(PROJ.style) return PROJ.style; const four=/4\s*\/\s*4|four on the floor/.test(t); PROJ.style=four&&CTRL.bpm>=115?'house':four?'pop':'house'; return PROJ.style; }
function runCommand(raw){
  ensureAudio();
  let t=' '+raw.toLowerCase().replace(/hi[\s-]?hats?|high[\s-]?hats?|hihats?/g,'hats').replace(/drum ?(and|&|n|'n') ?bass|d ?& ?b|d n b/g,'dnb').replace(/hip[\s-]?hop/g,'hiphop').replace(/lo[\s-]?fi/g,'lofi').replace(/eighths?|8ths?|8th notes?|eight notes?|8\s*\/\s*8/g,' 8th ').replace(/sixteenths?|16ths?|16 notes?|16\s*\/\s*16/g,' 16th ').replace(/beats per minute|bpm/g,' bpm ')+' ';
  const done=[]; let L=PROJ.bars*4;
  // song settings
  let m=t.match(/(\d{2,3}(?:\.\d)?)\s*bpm/)||t.match(/tempo (?:to |of |at )?(\d{2,3})/); if(m){ setTempo(+m[1]); done.push(`Tempo ${CTRL.bpm} BPM`); }
  m=t.match(/\b(\d{1,2})\s*bars?\b/); if(m){ setBars(+m[1]); L=PROJ.bars*4; done.push(`${PROJ.bars} bars`); }
  m=t.match(/\b(?:in|key of|key)\s+([a-g])\s*(sharp|flat|#|b)?\s*(major|minor|maj|min|m)?\b/);
  if(m && !/\b(in|key of|key) (a|the)\s+(?!major|minor|maj\b|min\b|m\b|sharp|flat)[a-z]{2,}/.test(t.slice(m.index,m.index+16))){ const base={c:0,d:2,e:4,f:5,g:7,a:9,b:11}[m[1]]+(m[2]==='sharp'||m[2]==='#'?1:m[2]==='flat'||m[2]==='b'?-1:0); const mode=/^(minor|min|m)$/.test(m[3]||'')?'minor':m[3]?'major':((STYLES[PROJ.style]||{}).mode||'minor'); setKey({tonic:mod(base,12),mode}); done.push(`Key ${keyName(PROJ.key)}`); }
  const styleNamed=styleOrDefault(t); if(styleNamed){ PROJ.style=styleNamed; if(!m || !/bpm|tempo/.test(t)){ if(!/(\d{2,3})\s*bpm|tempo/.test(t)){ setTempo(STYLES[styleNamed].bpm); done.push(`${STYLES[styleNamed].name} at ${CTRL.bpm} BPM`); } } }
  // transport
  if(/\b(stop|pause)\b/.test(t)){ loopStop(); done.push('Stopped'); }
  if(/\b(clear|new song|start over|delete everything)\b/.test(t)){ newSong(); return; }
  if(/\bundo\b/.test(t)){ const tr=PROJ.tracks[PROJ.tracks.length-1]; if(tr){ removeTrack(tr.id); done.push(`Removed ${tr.name}`); } }
  // mixing words act on existing tracks
  const mixVerb=t.match(/\b(louder|turn up|boost|more|quieter|softer|turn down|lower|less|mute|unmute|solo|remove|delete|drop)\b/);
  let roleHit=null; for(const [r,re] of ROLE_WORDS) if(re.test(t)){ roleHit=r; break; }
  if(/\b(everything|all tracks|whole thing|the mix)\b/.test(t)) roleHit=roleHit||'all';
  const addVerb=/\b(add|put|give|make|create|play|drop in|lay|generate|want|need|with|bring)\b/.test(t)||!mixVerb;
  if(mixVerb && roleHit){
    const v=mixVerb[1], trs=findTracks(roleHit);
    if(!trs.length) done.push(`No ${ROLE_NAME[roleHit]||roleHit} track yet`);
    trs.forEach(tr=>{
      if(/louder|turn up|boost|more/.test(v)) tr.vol=clamp(tr.vol+0.12,0,1);
      else if(/quieter|softer|turn down|lower|less/.test(v)) tr.vol=clamp(tr.vol-0.12,0,1);
      else if(v==='mute') tr.mute=true; else if(v==='unmute') tr.mute=false; else if(v==='solo') tr.solo=!tr.solo;
      else if(/remove|delete|drop/.test(v)){ removeTrack(tr.id); }
    });
    if(trs.length) done.push(`${v[0].toUpperCase()+v.slice(1)} ${trs.map(x=>x.name).join(', ')}`);
    refreshTrackGains(); saveProject(); renderTracks();
  }
  // instrument swaps: "use strings for the chords", "change the bass to slap", "make the drums 808"
  const iw=instWord(t), swap=/\b(use|change|switch|swap|make|turn)\b/.test(t) && iw && roleHit && PROJ.tracks.some(x=>x.role===roleHit) && !/\badd\b/.test(t);
  if(swap){ const tr=findTracks(roleHit)[0]; let id=iw; if(roleHit==='drums'){ id=iw==='bass808'?'kit808':tr.inst; }
    if(INST.has(id)){ const I=INST.get(id); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{}); tr.inst=id; tr.name=ROLE_NAME[roleHit]+' · '+I.name; if(roleHit==='drums') PROJ.tracks.filter(x=>x.role==='hats').forEach(x=>x.inst=id); saveProject(); renderTracks(); done.push(`${ROLE_NAME[roleHit]} now on ${I.name}`); } }
  // new parts
  if(addVerb && !swap && !(mixVerb&&roleHit&&!/\badd\b/.test(t))){
    const style=()=>ensureStyle(t), st=()=>STYLES[style()];
    const wantDrums=/\b(drums?|beat|kick|groove)\b/.test(t)||/4\s*\/\s*4|four on the floor/.test(t)||(styleNamed&&!/\b(bass|chords?|melody|hats)\b/.test(t)&&!PROJ.tracks.some(x=>x.role==='drums'));
    if(wantDrums){ const S=st(), kitId=iw==='bass808'?'kit808':S.kit; loadSet((INST.get(kitId)||{}).set||'',{}).catch(()=>{});
      addTrack({role:'drums',inst:kitId,zone:'pads',gen:true,name:`${S.name} drums`,events:patternEvents(S.drums,L,{swing:S.swing||0,seed:3})},{replaceRole:'drums'});
      if(!/\bhats\b/.test(t) && S.hats && !PROJ.tracks.some(x=>x.role==='hats')) addTrack({role:'hats',inst:kitId,zone:'pads',gen:true,name:'Hi-hats',events:patternEvents(HATS[S.hats],L,{swing:S.swing||0,trapRolls:S.hats==='trap',seed:5})},{replaceRole:'hats'});
      done.push(`${S.name} drums on ${INST.get(kitId).name}`); }
    if(/\bhats\b/.test(t)){ const S=st(); let kind=/16th/.test(t)?'16th':/\b8th\b/.test(t)?'8th':/off ?-?beat/.test(t)?'offbeat':/\b(roll|rolls|trap)\b/.test(t)?'trap':/\bopen\b/.test(t)?'open':/quarter|4\s*\/\s*4/.test(t)&&!wantDrums?'quarter':/shaker/.test(t)?'shaker':(S.hats||'8th');
      const drumsTr=PROJ.tracks.find(x=>x.role==='drums'); const kitId=drumsTr?drumsTr.inst:S.kit;
      addTrack({role:'hats',inst:kitId,zone:'pads',gen:true,name:'Hi-hats',events:patternEvents(HATS[kind],L,{swing:S.swing||0,trapRolls:kind==='trap',seed:5})},{replaceRole:'hats'});
      done.push(`Hi-hats on ${{'8th':'8th notes','16th':'16th notes',offbeat:'the offbeats',trap:'16ths with rolls',open:'open offbeats',quarter:'quarter notes',shaker:'a shaker groove'}[kind]}`); }
    if(/\b(bass ?line|bass)\b/.test(t)){ const S=st(); const id=(iw&&(INST.get(iw)||{}).cat==='Bass')?iw:S.bass; loadSet((INST.get(id)||{}).set||'',loadOpts((INST.get(id)||{}).set||'')).catch(()=>{});
      addTrack({role:'bass',inst:id,gen:true,name:'Bassline',events:genBass(style(),L)},{replaceRole:'bass'}); done.push(`Bassline on ${INST.get(id).name}, following the chords in ${keyName(projectKey())}`); }
    if(/\b(chords?|pads?|harmony|progression)\b/.test(t)){ const S=st(); const id=(iw&&(INST.get(iw)||{}).cat!=='Bass')?iw:S.chords; const I=INST.get(id); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{});
      addTrack({role:'chords',inst:id,gen:true,name:'Chords',events:genChords(style(),L)},{replaceRole:'chords'}); done.push(`Chords on ${I.name} in ${keyName(projectKey())}`); }
    if(/\b(melody|hook|riff|tune)\b/.test(t) && !/\bsing\b/.test(t)){ const id=iw&&(INST.get(iw)||{}).cat!=='Bass'?iw:'lead'; const I=INST.get(id); if(I.set) loadSet(I.set,loadOpts(I.set)).catch(()=>{});
      addTrack({role:'melody',inst:id,gen:true,name:'Melody',events:genMelody(L,Date.now()%1000)},{replaceRole:'melody'}); done.push(`A melody on ${I.name}`); }
  }
  if(/\b(sing|hum|record (my )?voice|record me|vocal take)\b/.test(t)){ done.push('Get ready to sing after the count-in'); TAKE.start(); }
  else if(/\b(play|start|listen|let'?s hear|hear it)\b/.test(t) && PROJ.tracks.length && !TR.running){ loopPlay(); done.push('Playing'); }
  if(done.length){ say('Done: '+done.join(' · ')); if(PROJ.tracks.length && !TR.running && /\b(add|put|drums?|beat|hats|bass|chords?|melody)\b/.test(t) && !/\bstop\b/.test(t)) loopPlay(); }
  else say(`I didn’t catch a part in “${raw.trim()}”. Try “125 bpm house drums”, “hi-hats on 8ths”, “add an 808 bassline”, “piano chords”, “sing” or “make the hats quieter”.`,false);
  uiLoop();
}
$('#makerForm').addEventListener('submit',e=>{ e.preventDefault(); const v=$('#makerIn').value.trim(); if(v){ runCommand(v); $('#makerIn').value=''; } });
document.addEventListener('click',e=>{ const c=e.target.closest('[data-cmd]'); if(c) runCommand(c.dataset.cmd); });
/* speech: Chrome and Edge send the audio to their speech service, so it needs an internet connection */
(function(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition, btn=$('#talkBtn');
  if(!SR){ btn.title='Speech recognition needs Chrome or Edge'; btn.addEventListener('click',()=>say('Talking needs Chrome or Edge. You can type the same thing in the box.',false)); return; }
  let rec=null, live=false;
  btn.addEventListener('click',()=>{
    if(live){ rec&&rec.stop(); return; }
    rec=new SR(); rec.lang=navigator.language||'en-IN'; rec.interimResults=true; rec.continuous=false; rec.maxAlternatives=1;
    rec.onstart=()=>{ live=true; btn.classList.add('live'); btn.querySelector('span').textContent='Listening…'; $('#makerIn').placeholder='Listening… say what to add'; };
    rec.onresult=e=>{ let txt=''; for(const r of e.results) txt+=r[0].transcript; $('#makerIn').value=txt; if(e.results[e.results.length-1].isFinal){ runCommand(txt); $('#makerIn').value=''; } };
    rec.onerror=e=>{ say(e.error==='not-allowed'?'Microphone permission is needed for talking. Allow it from the icon left of the address bar.':e.error==='network'?'Speech recognition needs an internet connection. You can type instead.':e.error==='no-speech'?'I didn’t hear anything. Press Talk and speak after the beep.':'Speech stopped ('+e.error+'). You can type instead.',false); };
    rec.onend=()=>{ live=false; btn.classList.remove('live'); btn.querySelector('span').textContent='Talk'; $('#makerIn').placeholder='Tell Studio Keys what to add, e.g. “125 bpm house drums, hi-hats on 8ths”'; };
    try{ rec.start(); }catch(err){ say('Couldn’t start speech recognition: '+err.message,false); }
  });
})();
