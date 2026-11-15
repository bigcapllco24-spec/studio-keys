
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
  if(!/\b(swing|swings|swinging|swingin|swung|swingy|swingier|shuffle|straight|straighten|straighter|bounce|bouncy|bouncey|bouncier)\b/.test(t)) return null;
  /* a step, not all the way: "straighten it a bit", "a bit straighter", "a little less bounce" go one rung down (70 → 66 → 58 → 54 → straight) */
  if(/\bstraighten(ed)?( it| this| that| them| the (beat|groove|drums|hats|rhythm|swing))?( up| out)? (a (little|bit|touch|tad|notch)( bit)?|slightly|somewhat|some|a little more|a bit more)\b|\b(a (little|bit|touch|tad)( bit)?|slightly|bit|little|somewhat) straighten\b|\bstraighter\b|\b(a (little|bit|touch|tad)( bit)?|slightly) less (bounce|bouncy)\b|\btoo bouncy\b|\bless (bounce|bouncy)\b/.test(t)) return 'less';
  /* bounce is the musician's word for swing: "make it bouncier", "more bounce", "a bit bouncier"; "bounce the song" is an export, not swing */
  if(/\b(a (little|bit|touch|tad)( bit)?|slightly) (bouncier|bouncy|more bounce)\b|\ba (little|bit) more bounce\b/.test(t)) return 'a bit more';
  if(/\b(bouncier|bouncey|bouncy|more bounce|some bounce|add bounce|with bounce|bounce to it)\b/.test(t)) return 'more';
  if(/\b(no|without|lose the|kill the) bounce\b/.test(t)) return 0;
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
  s=s.replace(/\b(swing|swings|swinging|swingin|swung|swingy|swingier|shuffle|shuffled|shuffly|straight|straighter|straighten|bounce|bouncy|bouncey|bouncier|more|less|lighter|softer|lower|reduce|turn|down|up|off|tone|a|an|the|bit|little|touch|tad|slightly|some|lots|loads|of|heavy|heavier|full|max|maximum|triplet|with|big|too|much|strong|is|its|it|make|put|play|keep|go|back|again|now|then|please|can|could|would|you|give|me|us|take|out|remove|kill|lose|drop|get|rid|no|without|any|all|zero|not|set|to|at|on|by|just|bring|this|that|yeah|ok|okay|hey|so|and|plus|add|adding|i|want|need|lets|amount|way|feel|timing|percent|hard)\b/g,' ');
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
  /* "turn <audio track> into a bassline": a voice note, an imported recording, or one named ("turn hook idea into chords"). Checked before singing and voice notes. */
  { const tc=audioConvert(t); if(tc) return tc; }
  { const fxw=t.match(/\b(reverb|delay|echo|sidechain|side chain|pump|compress(?:ion|or)?|drive|saturation|distortion|width|wider|stereo|low ?cut|high ?cut)\b/); const tr=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
    if(fxw&&tr&&/\b(add|put|more|less|on|to|give|use|some|turn)\b/.test(t)){ const less=/\b(less|reduce|lower|down|remove|no)\b/.test(t); return {actions:[{type:'track_fx',track:tr==='drums'?'drums':tr,effect:fxw[1],change:less?-20:(/\bmore\b/.test(t)?20:undefined),remove:/\b(remove|no|off)\b/.test(t)}]}; } }
  { const tone=toneFix(t); if(tone) return tone; }
  { const lv=levelFix(t); if(lv) return lv; }
  if(/^\s*(undo|undo that|go back|revert( that)?|take that back)\b/.test(t)) return {actions:[{type:'undo'}]};
  if(/^\s*(redo|redo that)\b/.test(t)) return {actions:[{type:'redo'}]};
  if(/\b(voice note|record (my )?voice|just record( me)?|record (some )?audio)\b/.test(t)) return {actions:[{type:'sing',part:'voice'}]};
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
/* "turn <audio track> into a bassline": a voice note, an imported recording, or one named ("turn hook idea into chords").
   Also "make the voice note a bassline", "use the recording as chords", "make a bassline from the voice note", "voice note to bassline",
   "transcribe the voice note". Checked before singing and voice notes, so asking to convert never records a new voice note. */
const AUD_TARGET='bass ?lines?|base ?lines?|bass|base|chords?|chord progression|melody|melodies|notes|piano|keys|instrument|synth|lead|midi';
const AUD_NOUN=/\b(voice ?notes?|voice ?memos?|memos?|recordings?|recorded|audio|clips?|takes?|samples?|wav|mp3|files?)\b/;
function audioConvert(t){
  const s=t.replace(/[^a-z0-9' ]+/g,' ').replace(/ +/g,' ').trim(), C=[]; let m;
  if((m=s.match(new RegExp('\\b(?:turn|convert|make|transcribe|change|use|put|play|map) (.+?) (?:(?:into|in to|to|as|onto|on) )?(?:a |an |the |some |my )?(?:[a-z]+ )?('+AUD_TARGET+')\\b')))) C.push([m[1],m[2]]);
  if((m=s.match(new RegExp('\\b(?:make|turn|build|write|create|give me|get|do)(?: me)? (?:a |an |the |some )?(?:[a-z]+ )?('+AUD_TARGET+') (?:out of|from|with|using|based on|off) (.+)$')))) C.push([m[2],m[1]]);
  if((m=s.match(new RegExp('^(?:(?:can|could|would) you |please |now |ok |okay |hey )*(.+?) (?:in ?to|to|as) (?:a |an |the )?('+AUD_TARGET+')\\b')))) C.push([m[1],m[2]]);
  if((m=s.match(/\btranscribe (.+)$/))) C.push([m[1],'melody']);
  const nm=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(), aud=PROJ.tracks.filter(y=>y.kind==='audio'), newest=aud[aud.length-1];
  const hum=ASSIST.lastHum?PROJ.tracks.findIndex(y=>y.id===ASSIST.lastHum):-1, humNewer=hum>PROJ.tracks.indexOf(newest);
  for(let [x,to] of C){
    x=nm(x.replace(/\b(please|for me|now|again)\b/g,' ')).replace(/^(?:(?:can|could|would) you |please )+/,'').replace(/^(the|my|this|that|our|your|a) /,'').trim();
    const canon=/^bas/.test(to)?'bass':/^chord/.test(to)?'chords':'melody', roleWord=/^(drums?|beat|bass(line)?|chords?|pads?|melody|lead|hook|it|that|this)$/.test(x);
    const bare=x.replace(/ (recording|voice ?note|memo|audio|track|clip|take|file)$/,'');
    const named=[...aud].reverse().find(a=>{ const n=nm(a.name); return n===x||n===bare||(!roleWord&&x.length>=4&&((' '+n+' ').includes(' '+x+' ')||n.length>=4&&(' '+x+' ').includes(' '+n+' '))); });
    if(named) return {actions:[{type:'transcribe',track:named.id,to:canon}]};
    const noun=AUD_NOUN.test(x)&&x.split(' ').length<=7, pron=/^(it|that|this|that one|this one)$/.test(x), weak=/^(voice|vocals?|singing)( \d+)?$/.test(x);
    if(!aud.length){ if(noun) return {actions:[],reply:`There’s no voice note or recording in this song yet. Say “record a voice note” first, or drop a recording in, then ask me to turn it into ${canon==='bass'?'a bassline':canon==='chords'?'chords':'a melody'}.`}; continue; }
    if(noun||(pron||weak)&&!humNewer) return {actions:[{type:'transcribe',track:newest.id,to:canon}]}; }
  return null; }
/* level and punch words about a part: "turn the melody down a bit", "bring the bass up", "chords louder", "drums too loud",
   "softer hats", "make the kick punchier". A sentence about level or tone never adds or replaces a part: it moves the fader
   (in dB: about 3 for "a bit", 5 plain, 8 for "a lot"), and for a drum inside the kit the EQ band where it lives
   (kick: low, snare and clap: mid, hats: high); punch is more compressor plus a little low end, same pattern. */
const DRUM_VOICE=[['kick',/\b(kicks?|kick drum|bass drum)\b/,'low','the kick'],['hats',/\bhats\b/,'high','the hats'],['snare',/\b(snares?|claps?|rims?|rimshots?)\b/,'mid','the snare and clap']];
const LEVEL_NOT=/\b(octaves?|semitones?|pitch|key|tempo|bpm|speed|slow|faster|slower|quicker|swing|shuffle|bounce|energy|busy|busier|reverb|delay|echo|filter|cutoff|sidechain|patch|preset|instrument|switch|shake|build|notes|transpose|register|deeper|higher|another|different|variation|regenerate|new one|one more|mute|unmute|solo|remove|delete|pump|break|strip|warm|open|move|shift|8th|16th|quarter|offbeat|trap)\b|\bmix it up\b|\bnote (up|down)\b|\b(softer|calmer|chill(er)?) (groove|beat)\b/;
const LEVEL_UP=/\b(louder|turn(?: [a-z']+){0,3} up|bring(?: [a-z']+){0,3} up|push(?: [a-z']+){0,3} up|boost|raise|lift|more volume|too (quiet|soft|low|weak)|(is|are|sounds?|feels?|seems?)( a bit| a little| way| so| really| kind of)? (quiet|soft|buried|lost|weak)|can'?t hear|cannot hear|hard to hear|hardly hear|barely hear|buried|more (kicks?|snares?|claps?|bass)(?! ?lines?)|up)\b/;
const LEVEL_DOWN=/\b(quieter|softer|less loud|turn(?: [a-z']+){0,3} down|bring(?: [a-z']+){0,3} down|pull(?: [a-z']+){0,3} (down|back)|back off|lower|reduce|tone down|too loud|too much|too hot|too strong|too big|overpowering|drowning|(is|are|sounds?|feels?|seems?)( a bit| a little| way| so| really| kind of)? loud|down)\b/;
const PUNCH=/\b(punch(y|ier|iest|iness)?|snappier|snappy|more snap|more knock|knockier|hits? harder|hit hard|more thump|thumpier|more impact)\b/;
function levelFix(t){
  if(LEVEL_NOT.test(t)||/\b(add|give me|make(?: me)? (?:a|an|some))\b(?: (?!(?:to|on|in|for|of|with)\b)[\w-]+){0,3}? (bass ?lines?|bass|808|chords?|melod(?:y|ies)|drums?|beat|groove|pads?|leads?|hook|riff|pluck|piano|keys|strings|choir|arp)\b/.test(t)) return null;
  const punch=PUNCH.test(t), up=!punch&&LEVEL_UP.test(t), down=!punch&&!/\bdown ?beat\b/.test(t)&&LEVEL_DOWN.test(t);
  if(!punch&&up===down) return null;
  const dv=DRUM_VOICE.find(([k,re])=>re.test(t)); let role=dv?'drums':(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  const small=/\b(a (little|bit|touch|tad|notch|hair)( bit)?|slightly|just a bit|tiny bit|bit|little|somewhat)\b/.test(t), big=/\b(a lot|lots|way|much|loads|really|heaps|so)\b/.test(t);
  const dbm=t.match(/(\d+(?:\.\d)?) ?(?:db|decibels?)\b/), n=dbm?Math.min(12,+dbm[1]):small?3:big?8:5, sign=up?1:-1;
  const master=!role&&!punch&&/\b(louder|quieter|too loud|too quiet|(turn|bring) (it|everything|the (whole )?(song|track|mix|master|volume|thing)|the master|the volume|master|volume) (up|down)|(turn|bring) (up|down) (the )?(volume|master|song|mix|everything)|volume (up|down))\b/.test(t);
  if(!role&&!punch&&!master) return null;
  if(master){ const v0=MIX.master?MIX.master.vol:1; if(up&&v0>=0.999) return {actions:[],reply:'The master is already at full volume. Turn your speakers up, or say “make it louder” after turning a part down.'}; return {actions:[{type:'mix',track:'master',db:sign*n}],reply:`Turned the whole song ${up?'up':'down'} ${n} dB.`}; }
  if(punch&&!role) role='drums';
  const list=PROJ.tracks.filter(x=>x.role===role), part=dv?dv[3]:(TONE_PART[role]||'the '+role), Part=part[0].toUpperCase()+part.slice(1);
  if(!list.length) return {actions:[],reply:role==='voice'?'There’s no vocal yet. Say “record a voice note” to add one.':role==='drums'||role==='chords'?`There are no ${role} yet. Want me to add some?`:`There’s no ${part.replace(/^the /,'')} yet. Want me to add one?`};
  const A=[];
  if(punch){ const c=Math.round(((list[0].fx&&list[0].fx.comp)||0)*100), band=role!=='drums'?null:dv&&dv[0]==='snare'?'mid':dv&&dv[0]==='hats'?null:'low';
    list.forEach(T=>{ if(c<90) A.push({type:'track_fx',track:T.id,effect:'compressor',change:20}); if(band) A.push({type:'mix',track:T.id,eq:{[band]:2}}); });
    if(!A.length) return {actions:[],reply:`${Part} is already compressed as far as I’d go. Try “${dv?dv[0]+' louder':part.replace(/^the /,'')+' louder'}”.`};
    return {actions:A,reply:`Punchier ${part.replace(/^the /,'')}: ${c<90?`compressor on ${role==='drums'?'the drums':part} up to ${Math.min(100,c+20)}%`:''}${c<90&&band?' and ':''}${band?`2 dB more ${band==='low'?'low end':'mids'}`:''}, same ${role==='drums'?'pattern':'notes'}.`}; }
  if(dv){ const d=sign*(small?2:big?5:3); list.forEach(T=>A.push({type:'mix',track:T.id,eq:{[dv[2]]:d}}));
    return {actions:A,reply:`${up?'Brought up':'Softened'} ${part}: ${Math.abs(d)} dB ${up?'more':'less'} ${dv[2]==='low'?'low end':dv[2]==='mid'?'mids':'highs'} on the drums, same pattern.`}; }
  if(up&&list.every(T=>T.vol>=0.999)) return {actions:[],reply:`${Part} is already at full volume. Say “turn the ${list.some(x=>x.role!=='drums')&&PROJ.tracks.some(x=>x.role==='drums'&&x!==list[0])?'drums':'others'} down a bit” to make room for it.`};
  list.forEach(T=>A.push({type:'mix',track:T.id,db:sign*n}));
  const v0=list[0].vol, got=Math.abs(40*Math.log10(clamp(v0*Math.pow(10,sign*n/40),0.001,1)/Math.max(0.001,v0)));
  return {actions:A,reply:`${up?'Brought':'Turned'} ${part} ${up?'up':'down'} ${got<n-0.4?got.toFixed(1)+' dB (that’s full volume)':n+' dB'}, same ${role==='drums'?'pattern':'notes'}.`}; }
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
