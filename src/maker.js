
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
/* swing words → a swing value for the groove action: "58%", 0, "a bit less", "less", "a bit more", "more"; null if none */
function swingSaid(raw){ const t=' '+String(raw||'').toLowerCase().replace(/per ?cent/g,'%').replace(/[,.!?]+(?!\d)/g,' ')+' '; let m;
  if(!/\b(swing|swings|swinging|swingin|swung|swingy|swingier|shuffle|straight|straighten)\b/.test(t)) return null;
  if((m=t.match(/\b(\d{2,3}(?:\.\d+)?)\s*%?\s*(?:of\s+)?(?:swing|shuffle)\b/))||(m=t.match(/\b(?:swing|shuffle)\s*(?:to|at|of|on|by)?\s*(\d{2,3}(?:\.\d+)?)\b(?!\s*(?:bars?|bpm|beats?))/))) return m[1]+'%';
  if(/\b(no|no more|without|remove|kill|lose|drop|turn off|zero)( the| any| all)? (swing|shuffle)\b|\btake out (the |all the |all )?(swing|shuffle)\b|\btake (the |all the |all )?(swing|shuffle) out\b|\bget rid of (the |all the )?(swing|shuffle)\b|\b(beat|groove|drums|hats|rhythm)s? straight\b(?! to\b)|\bswing off\b|\bstraighten\b|\bstraight (beat|groove|hats|drums|16th|timing|feel|again)\b|\b(make|play|keep|put|go) (it|the (beat|groove|drums|hats)) (back )?straight\b|\bnot swung\b|^\s*(play |go |keep it |make it )?straight( please| again| now| then)?\s*$/.test(t)) return 0;
  if(/\b(a (little|bit|touch|tad)|slightly|little|bit) less (swing|shuffle|swung|swingy)\b|\bswing (it )?a (bit|little) less\b/.test(t)) return 'a bit less';
  if(/\b(less|lighter|softer|lower|reduce|lower the|reduce the|turn down the|tone down the) (swing|shuffle|swingy|swung)\b|\bswing(s|ing)? too (much|hard|heavy|strong)\b|\btoo (much )?(swing|swingy|swung|heavy)\b|\bswing (is )?too (much|heavy|strong)\b|\bless swung\b/.test(t)) return 'less';
  if(/\b(a (little|bit|touch|tad)( more)?( of)?|slightly( more)?|little more|bit more) (swing|shuffle)\b|\bswing it a (bit|little)( more)?\b/.test(t)) return 'a bit more';
  if(/\b(more|add|adding|some|lots of|loads of|heavy|heavier|full|max|maximum|triplet|with|big) (swing|shuffle)\b|\bswing (it )?(more|harder)\b|\bmore swung\b|\bswing it\b|\bswingier\b|\bmake it swing\b/.test(t)) return 'more';
  return null; }
/* is the request only about swing? (then it is one groove change; anything else said goes through the parser too) */
function swingOnly(raw,hasDrums){ let s=' '+String(raw||'').toLowerCase().replace(/per ?cent/g,'%').replace(/[’']/g,'')+' '; const addPart=SWING_ADD_PART.test(s.replace(/[^a-z0-9 ]+/g,' ').replace(/ +/g,' '));
  s=s.replace(/\b\d{2,3}(\.\d+)?\s*%/g,' ').replace(/\b(swing|shuffle)\s*(to|at|of|on|by)?\s*\d{2,3}(\.\d+)?\b(?!\s*(bars?|bpm|beats?))/g,' ').replace(/\b\d{2,3}\s*(of\s+)?(swing|shuffle)\b/g,' ').replace(/\bswing(s|ing)? (it )?(more|harder)\b/g,' ');
  s=s.replace(/\b(swing|swings|swinging|swingin|swung|swingy|swingier|shuffle|shuffled|shuffly|straight|straighter|straighten|more|less|lighter|softer|lower|reduce|turn|down|up|off|tone|a|an|the|bit|little|touch|tad|slightly|some|lots|loads|of|heavy|heavier|full|max|maximum|triplet|with|big|too|much|strong|is|its|it|make|put|play|keep|go|back|again|now|then|please|can|could|would|you|give|me|us|take|out|remove|kill|lose|drop|get|rid|no|without|any|all|zero|not|set|to|at|on|by|just|bring|this|that|yeah|ok|okay|hey|so|and|plus|add|adding|i|want|need|lets|amount|way|feel|timing|percent|hard)\b/g,' ');
  /* "more swing on the chords", "make the bass swing more", "less swing in the hats": the part named is filler (the swing goes to the drums);
     a part is only a request of its own after an add verb ("add a bassline with some swing", "make a bassline with swing") */
  if(!addPart) s=s.replace(/\b(bass ?lines?|bass|basses|chords?|pads?|harmony|progression|melody|melodies|lead|hook|riff|keys|piano|synths?|arps?|parts?|other|everything|whole|entire|song|track|tune|in|into|for|across|onto)\b/g,' ');
  if(hasDrums) s=s.replace(/\b(beat|groove|drums?|(hi|high)[ -]?hats?|hihats?|hats?|rhythm)\b/g,' ');
  return !s.replace(/[^a-z0-9]+/g,'').length; }
const SWING_ADD_PART=/\b(add|adding|bring in|layer|put in|write|create|make|give me|want|need)( me)?( a| an| some| new| another| more)? (?!(?:the|my|it|this|that|its|your) )([a-z]+ )?(bass ?lines?|bass|chords?|pads?|harmony|progression|melody|lead|hook|riff|keys|piano|synths?|arps?)\b/;
function localBrain(raw){
  const sws=swingSaid(raw), anyDrums=PROJ.tracks.some(x=>x.role==='drums'), hasDrums=PROJ.tracks.some(x=>x.role==='drums'&&x.recipe);
  if(sws!=null&&swingOnly(raw,hasDrums)){
    if(hasDrums) return {actions:[{type:'groove',track:'drums',swing:sws}]};
    if(!anyDrums) return {actions:[],reply:"There's no beat yet. Say 'make a house beat' first."};
    return {actions:[],reply:"Your drums are your own part, so I left their swing as it is. Say 'make a house beat' for a beat I can swing."}; }
  const R=brainCore(raw,sws), A=R.actions||[];
  /* swing said next to something else ("add a bassline with some swing"): do both */
  if(sws!=null&&hasDrums&&!A.some(x=>x.type==='add_drums'||(x.type==='groove'&&x.swing!=null))){
    const g=A.find(x=>x.type==='groove'&&(x.track||'drums')==='drums');
    if(g) g.swing=sws; else { const i=A.findIndex(x=>x.type==='transport'); A.splice(i<0?A.length:i,0,{type:'groove',track:'drums',swing:sws}); } }
  return R; }
/* "make the bass faster", "faster chords", "speed up the melody": about a part's rhythm, not the song tempo */
const FASTER_PART=/\b(bass ?line|bass|chords?|pads?|melody|lead|keys|piano|synths?|arps?|riff|hook|kick|snares?|claps?|perc|percussion|shakers?)\b( [a-z]+){0,2} (faster|slower|quicker)\b|\b(faster|slower|quicker) ([a-z]+ )?(bass ?line|bass|chords?|pads?|melody|lead|keys|piano|synths?|arps?|riff|hook|kick|snares?|claps?|perc|percussion|shakers?)\b|\b(speed|slow) (up|down) (the |my )?(bass ?line|bass|chords?|pads?|melody|lead|keys|piano|synths?|arps?|riff|hook)\b|\b(speed|slow) (the |my )?(bass ?line|bass|chords?|pads?|melody|lead|keys|piano|synths?|arps?|riff|hook) (up|down)\b/;
/* only the plain "add a clap" / "add a snare" (maybe "on 2 and 4", "too", "and ..."); "add a snare roll", "a snare sound to the keys" are not a backbeat change */
function plainClapSnare(t){ const m=t.match(/\badd (a |some |the )?(claps?|snares?)\b(.*)$/); if(!m) return false;
  const rest=m[3].replace(/[^a-z0-9 ]+/g,' ').split(/\b(?:and|plus|then|with|also)\b/)[0];
  return !rest.replace(/\b(please|too|as well|instead|back|again|now|on|the|2|two|4|four|backbeat|back ?beat|beat|drums?|groove|to|in|it|of|one|of the)\b/g,' ').trim().length; }
function brainCore(raw,sws){
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
  { const fxw=t.match(/\b(reverb|delay|echo|sidechain|side chain|pump|compress(?:ion|or)?|drive|saturation|distortion|width|wider|stereo|low ?cut|high ?cut)\b/); const tr=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
    if(fxw&&tr&&/\b(add|put|more|less|on|to|give|use|some|turn)\b/.test(t)){ const less=/\b(less|reduce|lower|down|remove|no)\b/.test(t); return {actions:[{type:'track_fx',track:tr==='drums'?'drums':tr,effect:fxw[1],change:less?-20:(/\bmore\b/.test(t)?20:undefined),remove:/\b(remove|no|off)\b/.test(t)}]}; } }
  if(/^\s*(undo|undo that|go back|revert( that)?|take that back)\b/.test(t)) return {actions:[{type:'undo'}]};
  if(/^\s*(redo|redo that)\b/.test(t)) return {actions:[{type:'redo'}]};
  if(/\b(voice note|record (my )?voice|just record( me)?|record (some )?audio)\b/.test(t)) return {actions:[{type:'sing',part:'voice'}]};
  const tr=t.match(/\b(?:turn|convert|make|transcribe) (?:the |my |this |that )?(voice note|voice|recording|audio|vocal|it)\b.*?\b(?:in)?to (?:a |the )?(bass(?:line)?|chords?|melody|notes|piano|instrument)\b/);
  if(tr && (PROJ.tracks.some(x=>x.kind==='audio'))) return {actions:[{type:'transcribe',to:tr[2]}]};
  if(singRole) return {actions:[{type:'sing',part:singRole}]};
  if(/^\s*(again|redo|one more time|try that again|retake)\b/.test(t) && LAST_TAKE.part) return {actions:[{type:'again'}]};
  const conv=t.match(/\b(?:make|turn|use) (?:it|that|this|the hum(?:med melody)?|my hum|the melody)(?: in)?(?:to| as)? (?:the |a )?(bass(?:line)?|chords?|melody)\b/);
  if(conv) return {actions:[{type:'convert',track:(ASSIST.lastHum&&PROJ.tracks.find(x=>x.id===ASSIST.lastHum))?ASSIST.lastHum:'melody',to:conv[1]}]};
  /* another / different / more energy */
  const roleHit=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  /* "another one with less swing": a new take plus the swing step (swing alone is handled in localBrain) */
  if(/\b(another|different|new|other|variation|change( it)? up|switch it up|try again|regenerate)\b/.test(t) && PROJ.tracks.length && !/\b(add|new song|new project)\b/.test(t)){
    const vt=roleHit||(/\bprogression|chords?\b/.test(t)?'chords':'drums');
    return {actions:[{type:'vary',track:vt}].concat(sws!=null&&vt==='drums'?[{type:'groove',track:'drums',swing:sws}]:[])}; }
  if(/\b(more energy|harder|busier|more drive|pump it|more intense|build it up)\b/.test(t)) return {actions:[{type:'groove',track:'drums',change:1}]};
  if(/\b(less busy|calmer|chill(er)?|softer groove|less energy|simpler|strip(ped)? (it )?back)\b/.test(t) && PROJ.tracks.some(x=>x.role==='drums')) return {actions:[{type:'groove',track:'drums',change:-1}]};
  if(/\b(add|more) (some |a few |a bit of )?(percussion|perc|congas?|bongos?|rims?)\b/.test(t) && PROJ.tracks.some(x=>x.role==='drums')) return {actions:[{type:'groove',track:'drums',perc:3}]};
  if(/\badd (a |some )?shakers?\b/.test(t) && PROJ.tracks.some(x=>x.role==='drums')) return {actions:[{type:'groove',track:'drums',shaker:true}]};
  if(plainClapSnare(t) && PROJ.tracks.some(x=>x.role==='drums'&&x.recipe)) return {actions:[{type:'groove',track:'drums',claps:/clap/.test(t)?true:undefined,snare:/snare/.test(t)?true:undefined}]};
  if(artist && /\b(vibe|like|style|sound|in the style)\b/.test(t) && !/\b(drums?|beat|bass|chords?|melody|hats|kick|groove)\b/.test(t)) return {actions:/\b(track|song|tune|start|make|build)\b/.test(t)&&!PROJ.tracks.some(x=>x.role==='drums')?[{type:'vibe',ref},{type:'add_drums',ref},{type:'transport',do:'play'}]:[{type:'vibe',ref}]};
  const iw=(INST_WORDS.find(([k,re])=>re.test(t))||[])[0];
  if(style&&!artist) A.push({type:'style',style,keepTempo:/bpm|tempo/.test(t)});
  if((m=t.match(/(\d{2,3}(?:\.\d)?)\s*bpm/)||t.match(/tempo (?:to |of |at )?(\d{2,3})/))) A.push({type:'tempo',bpm:+m[1]});
  else if(/\b(faster|speed (it )?up|quicker|slower|slow (it )?down)\b/.test(t)&&!/\bhats\b/.test(t)&&!FASTER_PART.test(t)&&PROJ.tracks.length) A.push({type:'tempo',bpm:Math.round(CTRL.bpm)+(/\b(slower|slow (it )?down)\b/.test(t)?-5:5)*(/\b(a lot|much|way)\b/.test(t)?2:1)});
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
    if(wantDrums) A.push({type:'add_drums',ref,style:style||(!ref&&/4\s*\/\s*4|four on the floor/.test(t)&&!PROJ.style?'house':undefined),kit:iw==='bass808'?'kit808':undefined,hats:hatsKind&&hatsKind!=='open'&&hatsKind!=='shaker'?hatsKind:undefined,claps,perc,shaker,open,swing:sws!=null?sws:undefined});
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
