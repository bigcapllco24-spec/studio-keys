
/* ---------- offline brain: turns common phrases into song actions when the AI isn't reachable ---------- */
const STYLE_WORDS=[['dnb',/\b(dnb|jungle)\b/],['hiphop',/\b(hiphop|boom ?bap|rap)\b/],['lofi',/\blofi\b/],['trap',/\b(trap|drill)\b/],['house',/\b(house|deep house|disco)\b/],['techno',/\btechno\b/],['reggaeton',/\b(reggaeton|dembow|latin)\b/],['afro',/\b(afro|afrobeat|amapiano)\b/],['bhangra',/\b(bhangra|dhol|punjabi)\b/],['bollywood',/\b(bollywood|filmi|hindi)\b/],['rock',/\brock\b/],['pop',/\bpop\b/]];
const INST_WORDS=[['bass808',/\b808\b/],['reese',/\breese\b/],['moog',/\bmoog\b/],['slapbass',/\bslap\b/],['acbass',/\b(upright|acoustic bass|double bass)\b/],['subbass',/\bsub\b/],['acid',/\bacid\b/],['pluckbass',/\bpluck(y)? bass\b/],['synbass',/\bsynth bass\b/],
  ['piano',/\b(piano|grand)\b/],['epiano',/\b(rhodes|electric piano|e-?piano|keys)\b/],['organ',/\borgan\b/],['strings',/\b(strings|violins?|orchestra)\b/],['cello',/\bcello\b/],['harp',/\bharp\b/],['choir',/\b(choir|voices|aah)\b/],['brass',/\bbrass\b/],['trumpet',/\btrumpet\b/],['sax',/\bsax(ophone)?\b/],['flute',/\b(flute|bansuri)\b/],
  ['sitar',/\bsitar\b/],['shanai',/\b(shehnai|shanai)\b/],['steeldrum',/\bsteel\b/],['guitar',/\b(nylon|acoustic guitar|guitar)\b/],['eguitar',/\belectric guitar\b/],['marimba',/\bmarimba\b/],['kalimba',/\bkalimba\b/],['vibes',/\bvib(es|raphone)\b/],
  ['supersaw',/\b(super ?saw|trance|big synth)\b/],['pad',/\bpads?\b/],['lead',/\b(lead|synth lead)\b/],['pluck',/\bpluck\b/]];
const ROLE_WORDS=[['drums',/\b(hats?|drums?|beat|kick|groove|percussion)\b/],['bass',/\b(bass ?line|bass)\b/],['chords',/\b(chords?|pads?|harmony|progression)\b/],['melody',/\b(melody|lead|hook|riff|tune|hum)\b/],['voice',/\b(voice|vocals?|singing)\b/]];
function localBrain(raw){
  const t=' '+raw.toLowerCase().replace(/hi[\s-]?hats?|high[\s-]?hats?|hihats?/g,'hats').replace(/drum ?(and|&|n|'n') ?bass|d ?& ?b|d n b/g,'dnb').replace(/hip[\s-]?hop/g,'hiphop').replace(/lo[\s-]?fi/g,'lofi').replace(/eighths?|8ths?|8th notes?|eight notes?|8\s*\/\s*8/g,' 8th ').replace(/sixteenths?|16ths?|16 notes?|16\s*\/\s*16/g,' 16th ').replace(/beats per minute|bpm/g,' bpm ')+' ';
  const A=[]; let m;
  const style=(STYLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  const iw=(INST_WORDS.find(([k,re])=>re.test(t))||[])[0];
  if(style) A.push({type:'style',style,keepTempo:/bpm|tempo/.test(t)});
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
    const hatsKind=/\bhats\b/.test(t)?(/16th/.test(t)?'16th':/\b8th\b/.test(t)?'8th':/off ?-?beat/.test(t)?'offbeat':/\b(roll|rolls|trap)\b/.test(t)?'trap':/\bopen\b/.test(t)?'open':/shaker/.test(t)?'shaker':/quarter|4\s*\/\s*4/.test(t)?'quarter':'8th'):null;
    const wantDrums=/\b(drums?|beat|kick|groove)\b/.test(t)||/4\s*\/\s*4|four on the floor/.test(t)||(style&&!/\b(bass|chords?|melody|hats)\b/.test(t)&&!PROJ.tracks.some(x=>x.role==='drums'));
    if(wantDrums) A.push({type:'add_drums',style:style||(/4\s*\/\s*4|four on the floor/.test(t)?'house':undefined),kit:iw==='bass808'?'kit808':undefined,hats:hatsKind||undefined});
    else if(hatsKind) A.push({type:'hats',pattern:hatsKind,style});
    if(/\b(bass ?line|bass)\b/.test(t)) A.push({type:'add_bass',style,instrument:iw&&(INST.get(iw)||{}).cat==='Bass'?iw:undefined});
    if(/\b(chords?|pads?|harmony|progression)\b/.test(t)) A.push({type:'add_chords',style,instrument:iw&&(INST.get(iw)||{}).cat!=='Bass'?iw:undefined});
    if(/\b(melody|hook|riff|tune)\b/.test(t) && !/\b(sing|hum)\b/.test(t)) A.push({type:'add_melody',instrument:iw&&(INST.get(iw)||{}).cat!=='Bass'?iw:undefined});
  }
  if(/\b(sing|record (my )?voice|record me|vocal take|record a melody)\b/.test(t)) A.push({type:'sing'});
  else if(/\b(play|start|listen|let'?s hear|hear it)\b/.test(t)) A.push({type:'transport',do:'play'});
  return {actions:A};
}
