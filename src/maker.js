
/* ---------- offline brain: turns common phrases into song actions when the AI isn't reachable ---------- */
const STYLE_WORDS=[['melodictechno',/\b(melodic techno|afterlife)\b/],['melodichouse',/\b(melodic house|emotional house)\b/],['progressive',/\b(progressive( house)?|big room)\b/],['organichouse',/\b(organic house|organic)\b/],['deephouse',/\b(deep house)\b/],['techhouse',/\b(tech house)\b/],
  ['liquid',/\b(liquid)\b/],['dnb',/\b(dnb|jungle)\b/],['ukg',/\b(garage|ukg|2 ?step|two ?step)\b/],['drill',/\bdrill\b/],['boombap',/\bboom ?bap\b/],['hiphop',/\b(hiphop|rap)\b/],['lofi',/\blofi\b/],['trap',/\btrap\b/],
  ['amapiano',/\bamapiano\b/],['nudisco',/\b(nu ?disco|disco|funk)\b/],['synthwave',/\b(synthwave|retrowave|80s)\b/],['downtempo',/\b(downtempo|chill ?out|chill)\b/],['dubstep',/\b(dubstep|half ?time)\b/],
  ['house',/\bhouse\b/],['techno',/\btechno\b/],['reggaeton',/\b(reggaeton|dembow|latin)\b/],['afro',/\b(afro|afrobeat|afro house)\b/],['punjabi',/\b(punjabi)\b/],['bhangra',/\b(bhangra|dhol)\b/],['bollywood',/\b(bollywood|filmi|hindi)\b/],['rock',/\brock\b/],['pop',/\bpop\b/]];
/* an artist named anywhere in the text: "like Ben Böhmer", "Bodzin style" */
function artistIn(t){ const n=normName(t); let best=null; for(const A of ARTISTS) for(const nm of A.names){ const k=normName(nm); if(k.length<4) continue; if((' '+n+' ').includes(' '+k+' ')&&(!best||k.length>best.k.length)) best={A,k}; } return best&&best.A; }
const INST_WORDS=[['bass808',/\b808\b/],['reese',/\breese\b/],['moog',/\bmoog\b/],['slapbass',/\bslap\b/],['acbass',/\b(upright|acoustic bass|double bass)\b/],['subbass',/\bsub\b/],['acid',/\bacid\b/],['pluckbass',/\bpluck(y)? bass\b/],['synbass',/\bsynth bass\b/],
  ['piano',/\b(piano|grand)\b/],['epiano',/\b(rhodes|electric piano|e-?piano|keys)\b/],['organ',/\borgan\b/],['strings',/\b(strings|violins?|orchestra)\b/],['cello',/\bcello\b/],['harp',/\bharp\b/],['choir',/\b(choir|voices|aah)\b/],['brass',/\bbrass\b/],['trumpet',/\btrumpet\b/],['sax',/\bsax(ophone)?\b/],['flute',/\b(flute|bansuri)\b/],
  ['sitar',/\bsitar\b/],['shanai',/\b(shehnai|shanai)\b/],['steeldrum',/\bsteel\b/],['guitar',/\b(nylon|acoustic guitar|guitar)\b/],['eguitar',/\belectric guitar\b/],['marimba',/\bmarimba\b/],['kalimba',/\bkalimba\b/],['vibes',/\bvib(es|raphone)\b/],
  ['supersaw',/\b(super ?saw|trance|big synth)\b/],['pad',/\bpads?\b/],['lead',/\b(lead|synth lead)\b/],['pluck',/\bpluck\b/]];
const ROLE_WORDS=[['drums',/\b(hats?|drums?|beat|kick|groove|percussion)\b/],['bass',/\b(bass ?line|bass)\b/],['chords',/\b(chords?|pads?|harmony|progression)\b/],['melody',/\b(melody|lead|hook|riff|tune|hum)\b/],['voice',/\b(voice|vocals?|singing)\b/]];
function localBrain(raw){
  const t=' '+raw.toLowerCase().replace(/hi[\s-]?hats?|high[\s-]?hats?|hihats?/g,'hats').replace(/drum ?(and|&|n|'n') ?bass|d ?& ?b|d n b/g,'dnb').replace(/hip[\s-]?hop/g,'hiphop').replace(/lo[\s-]?fi/g,'lofi').replace(/eighths?|8ths?|8th notes?|eight notes?|8\s*\/\s*8/g,' 8th ').replace(/sixteenths?|16ths?|16 notes?|16\s*\/\s*16/g,' 16th ').replace(/beats per minute|bpm/g,' bpm ')+' ';
  const A=[]; let m;
  const artist=artistIn(raw); let ref=artist?artist.name:undefined;
  const plm=raw.match(/\b(?:like|from|vibe of|in the style of)\s+(?:my\s+)?(.+?)\s+playlist\b/i)||raw.match(/\bmy playlist\s+["“]?([^"”,.]+)["”]?/i);
  if(plm&&typeof findPlaylist==='function'&&findPlaylist(plm[1])) ref='playlist '+plm[1];
  const style=(STYLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  /* sing a part over the beat */
  const singRole=/\b(sing|hum|whistle|record (my )?voice|let me (do|try))\b/.test(t)?(/\bbass/.test(t)?'bass':/\bchord|\bpad/.test(t)?'chords':/\b(melody|lead|hook|tune|riff|top ?line|voice)\b/.test(t)?'melody':null):null;
  if(/\b(download|export|bounce|render|save|give me)\b.*\b(mp3|audio file|song file|the song|the track)\b|\bmp3\b/.test(t)&&!/\b(zip|stems?|ableton|midi)\b/.test(t)){ const mm=t.match(/(\d+)\s*(min|minute)/), loops=t.match(/(\d+)\s*loops?/); return {actions:[{type:'export',format:'mp3',minutes:mm?+mm[1]:undefined,loops:loops?+loops[1]:undefined}]}; }
  if(/\b(download|export)\b.*\b(zip|stems?|ableton)\b/.test(t)) return {actions:[{type:'export',format:'zip'}]};
  /* "turn <audio track> into a bassline": a voice note, an imported recording, or one named ("turn hook idea into chords"). Checked before singing and voice notes. */
  { const aud=PROJ.tracks.filter(x=>x.kind==='audio'), tm=aud.length&&t.match(/\b(?:turn|convert|make|transcribe) (.+?) (?:in)?to (?:a |an |the |some )?(bass(?:line)?|chords?|melody|notes|piano|instrument|midi)\b/);
    if(tm){ const nm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(), x=nm(tm[1].replace(/^(the|my|this|that|our) /,'')), roleWord=/^(drums?|beat|bass(line)?|chords?|pads?|melody|lead|hook)$/.test(x);
      const bare=x.replace(/ (recording|voice ?note|memo|audio|track|clip|take|file)$/,'');
      const named=[...aud].reverse().find(a=>{ const n=nm(a.name); return n===x||n===bare||(!roleWord&&x.length>=4&&(' '+n+' ').includes(' '+x+' ')); });
      const hum=ASSIST.lastHum&&PROJ.tracks.findIndex(y=>y.id===ASSIST.lastHum), newest=aud[aud.length-1];
      const generic=/^(it|that|this|voice ?notes?|voice ?memo|memo|voice|recording|audio|vocals?|clip|sample|take|singing)( \d+)?$/.test(x)&&!(/^(it|that|this)$/.test(x)&&hum>PROJ.tracks.indexOf(newest));
      const hit=named||(generic?newest:null); if(hit) return {actions:[{type:'transcribe',track:hit.id,to:tm[2]}]}; } }
  { const fxw=t.match(/\b(reverb|delay|echo|sidechain|side chain|pump|compress(?:ion|or)?|drive|saturation|distortion|width|wider|stereo|low ?cut|high ?cut)\b/); const tr=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
    if(fxw&&tr&&/\b(add|put|more|less|on|to|give|use|some|turn)\b/.test(t)){ const less=/\b(less|reduce|lower|down|remove|no)\b/.test(t); return {actions:[{type:'track_fx',track:tr==='drums'?'drums':tr,effect:fxw[1],change:less?-20:(/\bmore\b/.test(t)?20:undefined),remove:/\b(remove|no|off)\b/.test(t)}]}; } }
  { const tone=toneFix(t); if(tone) return tone; }
  if(/^\s*(undo|undo that|go back|revert( that)?|take that back)\b/.test(t)) return {actions:[{type:'undo'}]};
  if(/^\s*(redo|redo that)\b/.test(t)) return {actions:[{type:'redo'}]};
  if(/\b(voice note|record (my )?voice|just record( me)?|record (some )?audio)\b/.test(t)) return {actions:[{type:'sing',part:'voice'}]};
  if(singRole) return {actions:[{type:'sing',part:singRole}]};
  if(/^\s*(again|redo|one more time|try that again|retake)\b/.test(t) && LAST_TAKE.part) return {actions:[{type:'again'}]};
  const conv=t.match(/\b(?:make|turn|use) (?:it|that|this|the hum(?:med melody)?|my hum|the melody)(?: in)?(?:to| as)? (?:the |a )?(bass(?:line)?|chords?|melody)\b/);
  if(conv) return {actions:[{type:'convert',track:(ASSIST.lastHum&&PROJ.tracks.find(x=>x.id===ASSIST.lastHum))?ASSIST.lastHum:'melody',to:conv[1]}]};
  /* another / different / more energy */
  const roleHit=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  if(/\b(another|different|new|other|variation|change( it)? up|switch it up|try again|regenerate)\b/.test(t) && PROJ.tracks.length && !/\b(add|new song|new project)\b/.test(t))
    return {actions:[{type:'vary',track:roleHit||(/\bprogression|chords?\b/.test(t)?'chords':'drums')}]};
  if(/\b(more energy|harder|busier|more drive|pump it|more intense|build it up)\b/.test(t)) return {actions:[{type:'groove',track:'drums',change:1}]};
  if(/\b(less busy|calmer|chill(er)?|softer groove|less energy|simpler|strip(ped)? (it )?back)\b/.test(t) && PROJ.tracks.some(x=>x.role==='drums')) return {actions:[{type:'groove',track:'drums',change:-1}]};
  if(/\b(more|add) (swing|shuffle)\b/.test(t)) return {actions:[{type:'groove',track:'drums',swing:0.2}]};
  if(/\b(no|less|remove) swing\b/.test(t)) return {actions:[{type:'groove',track:'drums',swing:0}]};
  if(/\b(add|more) (percussion|perc|congas?|bongos?|rims?)\b/.test(t) && PROJ.tracks.some(x=>x.role==='drums')) return {actions:[{type:'groove',track:'drums',perc:3}]};
  if(/\badd (a )?shaker\b/.test(t) && PROJ.tracks.some(x=>x.role==='drums')) return {actions:[{type:'groove',track:'drums',shaker:true}]};
  if(artist && /\b(vibe|like|style|sound|in the style)\b/.test(t) && !/\b(drums?|beat|bass|chords?|melody|hats|kick|groove)\b/.test(t)) return {actions:/\b(track|song|tune|start|make|build)\b/.test(t)&&!PROJ.tracks.some(x=>x.role==='drums')?[{type:'vibe',ref},{type:'add_drums',ref},{type:'transport',do:'play'}]:[{type:'vibe',ref}]};
  const iw=(INST_WORDS.find(([k,re])=>re.test(t))||[])[0];
  if(style&&!artist) A.push({type:'style',style,keepTempo:/bpm|tempo/.test(t)});
  if((m=t.match(/(\d{2,3}(?:\.\d)?)\s*bpm/)||t.match(/tempo (?:to |of |at )?(\d{2,3})/))) A.push({type:'tempo',bpm:+m[1]});
  if((m=t.match(/\b(\d{1,2})\s*bars?\b/))) A.push({type:'bars',bars:+m[1]});
  if((m=t.match(/\b(?:in|key of|key)\s+([a-g](?:\s*(?:sharp|flat|#|b))?\s*(?:major|minor|maj|min|m)?)\b/)) && /major|minor|maj|min|\bkey\b|sharp|flat|#/.test(m[0])) A.push({type:'key',key:m[1]});
  if(/\b(new song|new project|start over)\b/.test(t)) return {actions:[{type:'new_project'}],reply:'Started a new song. Your last one is saved.'};
  if(/\bsave\b/.test(t)) A.push({type:'save'});
  if(/\b(stop|pause)\b/.test(t)) A.push({type:'transport',do:'stop'});
  const role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  const mixVerb=(t.match(/\b(louder|turn up|boost|quieter|softer|turn down|lower|mute|unmute|solo|remove|delete|drop)\b/)||[])[1];
  const swap=iw && role && /\b(use|change|switch|swap|make|turn)\b/.test(t) && !/\badd\b/.test(t) && PROJ.tracks.some(x=>x.role===role);
  if(mixVerb && role){
    if(/louder|turn up|boost/.test(mixVerb)) A.push({type:'mix',track:role,change:12});
    else if(/quieter|softer|turn down|lower/.test(mixVerb)) A.push({type:'mix',track:role,change:-12});
    else if(mixVerb==='mute') A.push({type:'mix',track:role,mute:true}); else if(mixVerb==='unmute') A.push({type:'mix',track:role,mute:false});
    else if(mixVerb==='solo') A.push({type:'mix',track:role,solo:true}); else A.push({type:'remove',track:role});
  } else if(swap){ A.push({type:'instrument',track:role,instrument:role==='drums'&&iw==='bass808'?'kit808':iw}); }
  else {
    const hatsKind=/\bhats\b/.test(t)?(/16th/.test(t)?'16th':/\b8th\b/.test(t)?'8th':/off ?-?beat/.test(t)?'offbeat':/\b(roll|rolls|trap)\b/.test(t)?'trap':/\bopen\b/.test(t)?'open':/shaker/.test(t)?'shaker':/quarter/.test(t)?'quarter':(PROJ.tracks.some(x=>x.role==='drums')?'8th':'')):null;
    const wantDrums=/\b(drums?|beat|beats|kick|groove)\b/.test(t)||/4\s*\/\s*4|four on the floor/.test(t)||(style&&!/\b(bass|chords?|melody|hats)\b/.test(t)&&!PROJ.tracks.some(x=>x.role==='drums'));
    const claps=/\bclaps?\b/.test(t)?true:undefined, perc=/\b(percussion|congas?|bongos?|rims?)\b/.test(t)?3:undefined, shaker=/\bshakers?\b/.test(t)?true:undefined, open=/\bopen hats?\b/.test(t)?true:undefined;
    if(wantDrums) A.push({type:'add_drums',ref,style:style||(!ref&&/4\s*\/\s*4|four on the floor/.test(t)&&!PROJ.style?'house':undefined),kit:iw==='bass808'?'kit808':undefined,hats:hatsKind&&hatsKind!=='open'&&hatsKind!=='shaker'?hatsKind:undefined,claps,perc,shaker,open});
    else if(hatsKind) A.push({type:'hats',pattern:hatsKind,style});
    if(/\b(bass ?line|bass)\b/.test(t)) A.push({type:'add_bass',style,ref,instrument:iw&&(INST.get(iw)||{}).cat==='Bass'?iw:undefined});
    if(iw&&!role&&/\b(add|want|put|give|layer|bring in|with|need)\b/.test(t)&&!/\b(drums?|beat|bass|chords?|melody)\b/.test(t)){ const I=INST.get(iw)||{}; if(I.cat==='Bass') A.push({type:'add_bass',style,ref,instrument:iw,new:true}); else if(/choir|strings|pad|organ|cello|brass/.test(iw)) A.push({type:'add_chords',style,ref,instrument:iw}); else A.push({type:'add_melody',style,ref,instrument:iw}); }
    else if(/\b(chords?|pads?|harmony|progression)\b/.test(t)) A.push({type:'add_chords',style,ref,instrument:iw&&(INST.get(iw)||{}).cat!=='Bass'?iw:undefined});
    if(/\b(melody|hook|riff|tune)\b/.test(t) && !/\b(sing|hum)\b/.test(t)) A.push({type:'add_melody',style,ref,instrument:iw&&(INST.get(iw)||{}).cat!=='Bass'?iw:undefined});
  }
  if(/\b(sing|record (my )?voice|record me|vocal take|record a melody)\b/.test(t)) A.push({type:'sing'});
  else if(/\b(play|start|listen|let'?s hear|hear it)\b/.test(t)) A.push({type:'transport',do:'play'});
  return {actions:A};
}
/* mixing words: "the bass is muddy", "cut the lows on the bass", "the mix is harsh". Changes EQ and low cut with the
   existing track_fx / mix actions and keeps the notes. Each repeat ("still muddy") goes a step further. */
const TONE_PART={drums:'the drums',bass:'the bass',chords:'the chords',melody:'the melody',voice:'the vocal'};
const TONE_HP={bass:[50,10,90],drums:[40,10,80],chords:[200,1.4,500],melody:[250,1.4,600],voice:[150,1.4,400]};
function toneFix(t){
  /* asking for a part ("add brighter chords", "make a bassline with more low end", "another one with more low end") goes to the part builder */
  if(/\b(another|different|variation|regenerate|new one|one more)\b/.test(t)||/\b(add|give me|make(?: me)? (?:a|an|some))\b(?: (?!(?:to|on|in|for|of|with)\b)[\w-]+){0,3}? (bass ?lines?|bass|808|chords?|melod(?:y|ies)|drums?|beat|groove|pads?|leads?|hook|riff|pluck|piano|keys|strings|choir|arp)\b/.test(t)) return null;
  let kind=null; const lowW=/\b(low ?end|lows|bottom end|bottom|body|weight|sub)\b/.test(t);
  if(/\b(thin|no body|fatten|fatter|beef(?:y| it up| up)?)\b/.test(t)||lowW&&!/\b(cut|less|reduce|remove|lower|too much|clean|tame|tighten)\b/.test(t)&&/\b(more|bigger|boost|add|needs?|want|lacks?|lacking|not enough|weak|missing|little|light|quiet|bring)\b/.test(t)) kind='thin';
  else if(/\b(muddy|mud|boomy|rumbly|rumble|low mids?|low ?end|lows|clean(?:ed)? (?:it |this |that |the \w+ )?up)\b/.test(t)) kind='mud';
  else if(/\b(boxy|honky|nasal)\b/.test(t)) kind='box';
  else if(/\b(harsh|shrill|piercing|sibilant|too bright|too sharp|too much top)\b/.test(t)) kind='harsh';
  else if(/\b(dull|muffled|lifeless|too dark|brighter|(?:more|some|add) (?:air|sparkle|shine|top end))\b/.test(t)) kind='dull';
  if(!kind) return null;
  /* "still muddy" / "still harsh" with no part named carries on with the part fixed last */
  let role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0]; const last=ASSIST.lastTone;
  if(!role&&/\b(still|even more|further|again)\b/.test(t)&&last&&last.role!=='mix') role=last.role;
  const A=[], hz=x=>x>=1000?(x/1000).toFixed(1)+' kHz':x+' Hz';
  const eq=(T,band,d)=>{ const f={low:'lo',mid:'mid',high:'hi'}[band]; A.push({type:'mix',track:T.id,[band]:clamp(Math.round((T[f]||0)+d),-15,15)}); };
  const cut=T=>{ const cur=(T.fx&&T.fx.hp)||20, [mn,st,mx]=TONE_HP[T.role]||[120,1.4,400], v=Math.min(mx,Math.max(mn,st<2?Math.round(cur*st):cur+st)); if(v>cur) A.push({type:'track_fx',track:T.id,effect:'low cut',amount:v}); return Math.max(v,cur); };
  const more=` Say “still ${{mud:'muddy',box:'boxy',harsh:'harsh',dull:'dull',thin:'thin'}[kind]}” to go further.`;
  if(role){
    const list=PROJ.tracks.filter(x=>x.role===role), part=TONE_PART[role]||role;
    if(!list.length) return {actions:[],reply:role==='drums'||role==='chords'?`There are no ${role} yet to fix. Want me to add some?`:`There's no ${part.replace(/^the /,'')} yet to fix. Want me to add one?`};
    let say='';
    list.forEach((T,i)=>{ if(kind==='mud'){ const n0=A.length, v=cut(T), fl=T.role==='bass'||T.role==='drums'?-9:-12, lo=T.lo||0, d=Math.max(-3,fl-lo); if(d<0) eq(T,'low',d);
        if(!i) say=A.length===n0?`${part[0].toUpperCase()+part.slice(1)} is already cleaned as far as I’d go (low cut ${hz(v)}, low EQ ${lo} dB). Try a softer sound or turn it down a little.`:`Cleaned up ${part}: low cut up to ${hz(v)}${d<0?` and ${-d} dB less low boom`:''}, same notes.`; }
      else if(kind==='box'){ eq(T,'mid',-3); say=`Took the boxiness out of ${part}: 3 dB less mids around 1 kHz.`; }
      else if(kind==='harsh'){ eq(T,'high',-3); say=`Softened ${part}: 3 dB less highs.`; }
      else if(kind==='dull'){ eq(T,'high',3); const lp=T.fx&&T.fx.lp; if(lp&&lp<16000){ const v=Math.min(20000,Math.round(lp*1.5)); A.push({type:'track_fx',track:T.id,effect:'high cut',amount:v}); if(!i) say=`Brightened ${part}: 3 dB more highs and the high cut opened to ${hz(v)}.`; } else if(!i) say=`Brightened ${part}: 3 dB more highs.`; }
      else { eq(T,'low',3); say=`Fattened ${part}: 3 dB more low end.`; } });
    ASSIST.lastTone={role,kind}; return {actions:A,reply:say+(A.length?more:'')};
  }
  /* the whole mix */
  const all=PROJ.tracks; ASSIST.lastTone={role:'mix',kind};
  if(!all.length) return {actions:[],reply:'There’s nothing in the song to mix yet. Start with drums or name an artist.'};
  if(kind==='mud'){
    const up=all.filter(x=>x.role!=='bass'&&x.role!=='drums');
    if(!up.length) return {actions:[],reply:!all.some(x=>x.role==='bass')?'So far it’s just the drums, and their low end is the groove. Say “the kick is boomy” if it’s the kick.':'So far it’s just drums and bass, and their low end is the groove. Tell me which one: “the bass is muddy” or “the kick is boomy”.'};
    const done=up.map(T=>{ const v=cut(T), d=Math.max(-3,-12-(T.lo||0)); if(d<0) eq(T,'low',d); return `${T.name} (${hz(v)})`; });
    return {actions:A,reply:`Cleaned up the mix: higher low cuts and 3 dB less low end on ${done.length>1?done.slice(0,-1).join(', ')+' and '+done[done.length-1]:done[0]}; bass and kick untouched.`+more};
  }
  if(kind==='box'){ all.filter(x=>x.role!=='drums').forEach(T=>eq(T,'mid',-2)); return {actions:A,reply:'Took the boxiness out of the mix: 2 dB less mids around 1 kHz on every part but the drums.'+more}; }
  if(kind==='harsh'){ all.forEach(T=>eq(T,'high',-2)); return {actions:A,reply:'Softened the top of the mix: 2 dB less highs on every part.'+more}; }
  if(kind==='dull'){ all.forEach(T=>eq(T,'high',2)); return {actions:A,reply:'Brightened the mix: 2 dB more highs on every part.'+more}; }
  const low=all.filter(x=>x.role==='bass'||x.role==='drums'); (low.length?low:all).forEach(T=>eq(T,'low',2));
  const hasD=low.some(x=>x.role==='drums'), hasB=low.some(x=>x.role==='bass');
  return {actions:A,reply:`Fattened the mix: 2 dB more low end on ${hasD&&hasB?'the drums and bass':hasD?'the drums':hasB?'the bass':'every part'}.`+more};
}
