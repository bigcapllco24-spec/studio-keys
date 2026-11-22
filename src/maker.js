
/* ---------- offline brain: turns common phrases into song actions when the AI isn't reachable ---------- */
/* compound genres come before the plain ones they contain: "afro house" is afro (not house), "lofi hip hop" is lofi (not hip-hop),
   "deep tech" and "minimal house" are tech house, "lofi house" and "chill house" are deep house, "melodic techno" before techno (QA, 16 Nov) */
const STYLE_WORDS=[['afro',/\b(afro|afrobeats?|afrohouse|afrotech|afrobeat)\b/],['melodictechno',/\b(melodic techno|melodictechno|afterlife)\b/],['melodichouse',/\b(melodic house|melodichouse|emotional house)\b/],['progressive',/\b(progressive( house)?|progressivehouse|big ?room)\b/],['organichouse',/\b(organic house|organichouse|organic)\b/],
  ['deephouse',/\b(deep house|deephouse|lofi ?house|chill ?house)\b/],['techhouse',/\b(tech house|techhouse|deep ?tech|minimal ?(house|tech))\b/],['lofi',/\b(lofi|lofihiphop)\b/],
  ['liquid',/\b(liquid)\b/],['dnb',/\b(dnb|jungle|drumandbass|drumnbass)\b/],['ukg',/\b(garage|ukgarage|ukg|2 ?step|two ?step)\b/],['drill',/\bdrill\b/],['boombap',/\bboom ?bap\b/],['hiphop',/\b(hiphop|rap)\b/],['trap',/\btrap\b/],
  ['amapiano',/\bamapiano\b/],['nudisco',/\b(nu ?disco|disco|funk)\b/],['synthwave',/\b(synthwave|retrowave|80s)\b/],['downtempo',/\b(downtempo|chill ?out|chill)\b/],['dubstep',/\b(dubstep|half ?time)\b/],
  ['house',/\bhouse\b/],['techno',/\b(techno|minimaltechno)\b/],['reggaeton',/\b(reggaeton|dembow|latin)\b/],['punjabi',/\b(punjabi)\b/],['bhangra',/\b(bhangra|dhol)\b/],['bollywood',/\b(bollywood|filmi|hindi)\b/],['rock',/\brock\b/],['pop',/\bpop\b/]];
/* an artist named anywhere in the text: "like Ben Böhmer", "Bodzin style" */
function artistIn(t){ const n=normName(t); let best=null; for(const A of ARTISTS) for(const nm of A.names){ const k=normName(nm); if(k.length<4) continue; if((' '+n+' ').includes(' '+k+' ')&&(!best||k.length>best.k.length)) best={A,k}; } return best&&best.A; }
const INST_WORDS=[['bass808',/\b808\b/],['reese',/\breese\b/],['moog',/\bmoog\b/],['slapbass',/(?<!\b(?:drums?|beat|kicks?|snares?|claps?|hats|groove|it|this|that|track|song|mix|loop)\s+(?:(?:really|just|so|totally|kinda|lowkey)\s+)*)\bslap\b(?!\s+(?:hard|so hard))/],['acbass',/\b(upright|acoustic bass|double bass)\b/],['subbass',/\bsub\b/],['acid',/\bacid\b/],['pluckbass',/\bpluck(y)? bass\b/],['synbass',/\bsynth bass\b/],
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
  /* Hinglish: "swing thoda kam karo", "thoda kam swing" = one step less; "zyada swing", "swing badhao" = more; "swing hatao" = straight */
  if(/\b(swing|shuffle)( [a-z]+){0,2} (hatao|hata do|band karo|nikalo|nikal do)\b|\b(bina|no) swing\b/.test(t)) return 0;
  if(/\b(swing|shuffle)( (ko|ka|thoda|thodi|thora|bahut|aur|zara))* kam\b|\bkam (swing|shuffle)\b/.test(t)) return 'less';
  if(/\b(zyada|jyada|aur|thoda aur|thodi aur) (swing|shuffle)\b|\b(swing|shuffle)( (ko|ka|thoda|thodi|aur))* (zyada|jyada|badhao|badha do|barhao)\b/.test(t)) return 'more';
  if(/\b(a (little|bit|touch|tad)|slightly|little|bit) less (swing|shuffle|swung|swingy)\b|\bswing (it )?a (bit|little) less\b/.test(t)) return 'a bit less';
  if(/\b(less|lighter|softer|lower|reduce|lower the|reduce the|turn down the|tone down the) (swing|shuffle|swingy|swung)\b|\bswing(s|ing)? too (much|hard|heavy|strong)\b|\btoo (much )?(swing|swingy|swung|heavy)\b|\bswing (is )?too (much|heavy|strong)\b|\bless swung\b/.test(t)) return 'less';
  if(/\b(a (little|bit|touch|tad)( more)?( of)?|slightly( more)?|little more|bit more) (swing|shuffle)\b|\bswing it a (bit|little)( more)?\b/.test(t)) return 'a bit more';
  if(/\b(more|add|adding|some|lots of|loads of|heavy|heavier|full|max|maximum|triplet|with|big) (swing|shuffle)\b|\bswing (it )?(more|harder)\b|\bmore swung\b|\bswing it\b|\bswingier\b|\bmake it swing\b/.test(t)) return 'more';
  return null; }
/* is the request only about swing? (then it is one groove change; anything else said goes through the parser too) */
function swingOnly(raw,hasDrums){ let s=' '+String(raw||'').toLowerCase().replace(/per ?cent/g,'%').replace(/[’']/g,'')+' '; const addPart=SWING_ADD_PART.test(s.replace(/[^a-z0-9 ]+/g,' ').replace(/ +/g,' '));
  s=s.replace(/\b\d{2,3}(\.\d+)?\s*%/g,' ').replace(/\b(swing|shuffle)\s*(to|at|of|on|by)?\s*\d{2,3}(\.\d+)?\b(?!\s*(bars?|bpm|beats?))/g,' ').replace(/\b\d{2,3}\s*(of\s+)?(swing|shuffle)\b/g,' ').replace(/\bswing(s|ing)? (it )?(more|harder)\b/g,' ');
  s=s.replace(/\b(swing|swings|swinging|swingin|swung|swingy|swingier|shuffle|shuffled|shuffly|straight|straighter|straighten|bounce|bouncy|bouncey|bouncier|more|less|lighter|softer|lower|reduce|turn|down|up|off|tone|a|an|the|bit|little|touch|tad|slightly|some|lots|loads|of|heavy|heavier|full|max|maximum|triplet|with|big|too|much|strong|is|its|it|make|put|play|keep|go|back|again|now|then|please|can|could|would|you|give|me|us|take|out|remove|kill|lose|drop|get|rid|no|without|any|all|zero|not|set|to|at|on|by|just|bring|this|that|yeah|ok|okay|hey|so|and|plus|add|adding|i|want|need|lets|amount|way|feel|timing|percent|hard|thoda|thodi|thora|kam|karo|kar|kardo|ko|ka|zyada|jyada|aur|zara|badhao|badha|barhao|hatao|hata|band|nikalo|nikal|bina|na|yaar|bhai|bahut)\b/g,' ');
  /* "more swing on the chords", "make the bass swing more", "less swing in the hats": the part named is filler (the swing goes to the drums);
     a part is only a request of its own after an add verb ("add a bassline with some swing", "make a bassline with swing") */
  if(!addPart) s=s.replace(/\b(bass ?lines?|bass|basses|chords?|pads?|harmony|progression|melody|melodies|lead|hook|riff|keys|piano|synths?|arps?|parts?|other|everything|whole|entire|song|track|tune|in|into|for|across|onto)\b/g,' ');
  if(hasDrums) s=s.replace(/\b(beat|groove|drums?|(hi|high)[ -]?hats?|hihats?|hats?|rhythm)\b/g,' ');
  return !s.replace(/[^a-z0-9]+/g,'').length; }
const SWING_ADD_PART=/\b(add|adding|bring in|layer|put in|write|create|make|give me|want|need)( me)?( a| an| some| new| another| more)? (?!(?:the|my|it|this|that|its|your) )([a-z]+ )?(bass ?lines?|bass|chords?|pads?|harmony|progression|melody|lead|hook|riff|keys|piano|synths?|arps?)\b/;
/* ---- one section named in a mix comment (QA, 22 Nov bug 3). Levels, EQ and effects are for the whole song (there is no per-section mix yet):
   "the melody is too loud in the drop" turns the melody down everywhere and the reply says so (runActions adds the note).
   "make the drop bigger", "give the drop more energy", "make the build more intense": what the song layout can really do for that section
   (every part in for a drop, the drum pieces left out back in, a snare roll into it), or an honest reply. ---- */
const SEC_W='intro|outro|drop|break|breakdown|build|build ?up|buildup|verse|chorus|bridge|hook';
const SEC_PREP=new RegExp(`\\s*\\b(?:in|during|for|on|at|inside|throughout|through) (?:the |my |this |that )?(?:(?:first|second|third|last|final|1st|2nd|3rd) )?(?:${SEC_W})s?(?: \\d)?\\b|\\s*\\b(?:(?:first|second|third|last|pehle|dusre|doosre) )?(?:${SEC_W})(?: \\d)? (?:mein|me|main|ke dauran)\\b`,'gi');
const SEC_MIXW=/\b(reverb|delay|echo|sidechain|side chain|pump|compress(?:ion|or)?|drive|saturation|distortion|width|wider|stereo|low ?cut|high ?cut|eq|muddy|mud|boomy|harsh|shrill|dull|muffled|bright|brighter|dark|darker|warm|warmer|thin|fatter|punch(?:y|ier)?|pan(?:ned)?|dry|wet|lows|mids|highs|low end|volume|louder|quieter|softer|too loud|too quiet|too soft|turn(?: [a-z]+){0,3} (?:up|down)|bring(?: [a-z]+){0,3} (?:up|down)|up a bit|down a bit|kam|zyada|loud|halka|dheema)\b/;
function secMixStrip(raw){ const t=askText(raw); if(!SEC_MIXW.test(t)) return raw;
  if(/\b(mute|unmute|solo|unsolo|only|just|sirf|without|in and out|take (?:[a-z]+ ){0,3}out|bring (?:the |my )?[a-z]+ in|hata\w*|nikal\w*|daal\w*)\b/.test(t)) return raw; /* parts in a section stay a parts change */
  const role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0]||(DRUM_VOICE.some(([k,re])=>re.test(t))?'drums':null); if(!role) return raw; /* "the drop is too loud": sectionSayFix */
  const out=String(raw).replace(SEC_PREP,' ').replace(/\s+/g,' ').trim(); return out&&out!==String(raw).trim()?out:raw; }
const SEC_LIFT=/\b(bigger|huge|massive|epic|hit(?:s)? (?:harder|hard|more)|harder|more (?:energy|intense|power|impact|punch|hype|drive|excitement)|energy|energetic|intense|intensity|fuller|explode|bang|slap harder|bada|badi|bade|dhamaka|zyada energy|josh)\b/;
const SEC_LEVEL=/\b(louder|quieter|softer|too loud|too quiet|too soft|turn(?: [a-z]+){0,3} (?:up|down)|volume|loud|kam karo)\b/;
function sectionSayFix(t){
  const T=' '+t.replace(/[.,!?;]+/g,' ').replace(/\bbuild[\s-]?ups?\b/g,'build').replace(/\bbreak[\s-]?downs?\b/g,'break').replace(/\s+/g,' ')+' ';
  const sm=T.match(/\b(?:(first|second|third|last|final|1st|2nd|3rd|pehla|pehle|dusra|doosra) )?(intro|outro|drop|break|build|verse|chorus|bridge)s?(?: (\d))?\b/); if(!sm) return null;
  if(/^\s*(?:(?:please|now|ok|okay|and|then|just)\s+)*drop\s+(?:the|my|a|an)\b/.test(T)) return null; /* "drop the drums in the outro": drop is the verb */
  const lift=SEC_LIFT.test(T)&&!/\b(less|calmer|chiller|reduce|lower|tone down|strip|kam)\b/.test(T), level=!lift&&SEC_LEVEL.test(T); if(!lift&&!level) return null;
  const partW=new RegExp(`\\b(${SB_PART.replace(/\|everything\|all$/,'')})\\b`); if(partW.test(T.replace(/\bbuild\b/g,' '))) return null; /* a part named: its own rules, and the whole-song note */
  if(/\b(add|another|new|copy|duplicate|longer|shorter|extend|remove|delete|loop|play|rename|move|roll|fill|riser|crash|silence|gap|different|own)\b/.test(T)) return null;
  /* "a second drop" / "one more second drop" asks for a new section; "the second drop" is the one the song has, like "drop 2" (QA, 22 Nov AI-14 fix 1) */
  if(/\b(?:a|one more|ek aur|aur ek|extra) (?:second|2nd)\b/.test(T)) return null;
  if(!songArranged()) return {actions:[],reply:SB_NOSONG};
  const ord={first:'first',pehla:'first',pehle:'first','1st':'first',second:'second',dusra:'second',doosra:'second','2nd':'second',third:'third','3rd':'third',last:'last',final:'last'}[sm[1]]||'';
  const ref=(ord?ord+' ':'')+sm[2]+(sm[3]?' '+sm[3]:''), s=findSec(ref); if(!s) return {actions:[],reply:`There’s no ${sm[2]} in this song. Say “add a ${sm[2]}” to make one.`};
  /* "the drop", but "Drop 2" (never "the drop 2") */
  const S=songSections(), i=S.indexOf(s), nm=s.name, low=nm.toLowerCase(), theOf=n=>/\d/.test(n)||!/^(intro|outro|drop|break|build|verse|chorus|bridge|hook)$/i.test(n)?n:'the '+n.toLowerCase(), the=theOf(nm), The=the[0].toUpperCase()+the.slice(1);
  if(level) return {actions:[],reply:`I can’t turn one section up or down on its own yet; levels are for the whole song. I can take a part out of ${the} (“take the chords out of ${the}”) or bring one in, or turn one part down in the whole song.`};
  const big=/^(drop|chorus|hook)$/.test(s.kind), A=[], inP=[];
  PROJ.tracks.forEach(x=>{ if(x.kind!=='notes'||x.mute) return; const p=s.parts[x.id]; const drum=(INST.get(x.inst)||{}).drums||x.role==='drums';
    if(p&&p.on&&p.without&&p.without.length&&drum) inP.push(x.name); else if((!p||!p.on)&&big) inP.push(x.name); });
  if(inP.length) A.push({type:'parts',section:nm,in:[...new Set(inP)]});
  const prev=S[i-1], into=big?prev:s.kind==='build'?s:null;
  if(into&&!into.end&&(big?i>0:true)) A.push(big?{type:'transition',before:nm,to:'snareroll',gap:true}:{type:'transition',section:nm,to:'snareroll'});
  if(!A.length){ const bIn=prev&&prev.kind==='build'&&PROJ.tracks.some(x=>x.role==='bass'&&prev.parts[x.id]&&prev.parts[x.id].on);
    /* what the section really has (QA, 22 Nov AI-14 fix 5: a break with only chords was "already has its drums") */
    const heard=PROJ.tracks.filter(x=>!x.mute&&(x.kind==='notes'||x.kind==='audio')), on=heard.filter(x=>s.parts[x.id]&&s.parts[x.id].on), off=heard.filter(x=>x.kind==='notes'&&!(s.parts[x.id]&&s.parts[x.id].on));
    const say=L=>{ const w=L.map(x=>x.role==='drums'?'the drums':/^(bass|chords|melody)$/.test(x.role)&&L.filter(y=>y.role===x.role).length===1?'the '+({bass:'bass',chords:'chords',melody:'melody'})[x.role]:x.name); return w.length>1?w.slice(0,-1).join(', ')+' and '+w[w.length-1]:w[0]; };
    const endTxt=into&&into.end?` and a ${String((END_WORD[into.end.to]||'transition')).split(' (')[0]} ${big?'into it':'at the end'}`:'';
    const has=!off.length?`${The} already has every part${endTxt}`:!on.length?`${The} has nothing playing yet`:`${The} has ${say(on)}, but not ${say(off)}`;
    const order=['drums','bass','melody','chords'], pick=off.slice().sort((a,b)=>(order.indexOf(a.role)+1||9)-(order.indexOf(b.role)+1||9))[0];
    const pw=pick&&(pick.role==='drums'?'drums':/^(bass|chords|melody)$/.test(pick.role)?pick.role:pick.name.toLowerCase());
    const ask=pick?`Want me to bring the ${pw} in at ${the}?`:big&&bIn?`Want me to take the bass out of ${theOf(prev.name)} so ${the} lands harder?`:big&&prev?`Want a longer snare roll into ${the}?`:`Want a snare roll at the end of ${the}?`;
    return {actions:[],reply:`${has}. I can’t make one section louder on its own yet. ${ask}`}; }
  return {actions:A,reply:done=>done.length?`Made ${the} bigger: ${done.join(', ')}. Levels stay the same, because one section can’t be turned up on its own yet.`:''}; }
/* ---- pan: "pan the melody left", "put the chords a bit to the left", "move the bass hard right", "centre the bass", "chords thoda left mein daalo".
   The existing track moves (track_fx pan, -100 left to 100 right: about 40 plain, 20 a bit, 100 hard); never a new or remade part (QA, 22 Nov bug 4). ---- */
const PAN_DIR=/\b(left|right|cent(?:re|er)(?:ed)?|middle|mono)\b/;
const PAN_SAID=/\btoo far (?:to the )?(?:left|right)\b|\bpan(?:s|ned|ning)?\b|\b(?:to|towards|on|in) the (?:left|right)\b|\b(?:hard|fully|all the way|slightly|a bit|a little|little|bit|thoda|thodi|zara|more|further) (?:to the )?(?:left|right)\b|\b(?:left|right) (?:side|channel|ear|speaker)\b|\b(?:left|right) (?:mein|me|main|pe|par|taraf|side)\b|\b(?:move|put|send|place|shift|keep|push|nudge|bring) (?:the |my )?[a-z0-9 ]{2,24}? (?:to the |more |a bit |slightly |hard |a little |back to the |back )?(?:left|right|cent(?:re|er)|middle)\b|\bcent(?:re|er) (?:the |my )\w+|\b(?:in|to|into) the (?:middle|cent(?:re|er))\b/;
function panFix(t){ if(!PAN_SAID.test(t)||/\b(notes?|beats?|bars?|octaves?|semitones?|earlier|later|grid|timeline|track list|order|above|below)\b/.test(t)) return null;
  { const M=panMany(t); if(M) return M; }
  const dv=DRUM_VOICE.find(([k,re])=>re.test(t)), role=(ROLE_WORDS.map(([k,re])=>[k,t.replace(/\bhats\b/g,'    ').search(re)]).filter(x=>x[1]>=0).sort((a,b)=>a[1]-b[1])[0]||[])[0], nm=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(), s=' '+nm(t)+' ';
  /* the part said first is the one panned ("pan the melody left so it sits away from the chords": the melody) */
  const at=x=>s.indexOf(' '+nm(x.name)+' '), named=PROJ.tracks.filter(x=>x.name&&nm(x.name).length>2&&at(x)>=0).sort((a,b)=>at(a)-at(b)||b.name.length-a.name.length)[0];
  let T=named||null;
  if(!T&&dv&&!role){ const own=PROJ.tracks.find(x=>songRole(x)===(dv[0]==='hats'?'hats':'x')); if(own) T=own; else if(PROJ.tracks.some(x=>x.role==='drums')) return {actions:[],reply:`${dv[3][0].toUpperCase()+dv[3].slice(1)} ${dv[0]==='hats'?'are':'is'} part of the drums track, so I can’t pan ${dv[0]==='hats'?'them':'it'} on ${dv[0]==='hats'?'their':'its'} own. Say “pan the drums ${(t.match(/\b(left|right)\b/)||[])[1]||'left'}” to move the whole kit.`}; }
  if(!T&&role) T=[...PROJ.tracks].reverse().find(x=>x.role===role)||null;
  if(!T){ if(role||dv) return {actions:[],reply:`There’s no ${(TONE_PART[role||'drums']||'that part').replace(/^the /,'')} in the song yet to pan.`}; return null; }
  /* "the melody is too far left": a step back toward the centre (AI-14 fix 1) */
  { const tf=t.match(/\btoo far (?:to the )?(left|right)\b/); if(tf){ const cur=Math.round(((T.fx||{}).pan||0)*100), sg=tf[1]==='left'?-1:1; ASSIST.lastPan={id:T.id,text:String(LAST_TEXT.text||'')};
    if(Math.sign(cur)!==sg) return {actions:[],reply:`${T.name} isn’t panned ${tf[1]}; it’s ${cur?`${cur<0?'left':'right'} (${cur<0?'L':'R'} ${Math.abs(cur)})`:'in the centre'}.`};
    const n=Math.max(0,Math.abs(cur)-20); return {actions:[{type:'track_fx',track:T.id,effect:'pan',amount:sg*n}],reply:n?`Moved ${T.name} back toward the centre (${sg<0?'L':'R'} ${n}), same notes.`:`${T.name} is back in the centre, same notes.`}; } }
  const d=(t.match(PAN_DIR)||[])[1]; if(!d) return {actions:[],reply:`Left or right? Say “pan ${T.name.toLowerCase()} a bit left” or “pan ${T.name.toLowerCase()} hard right”.`};
  const P=panOne(T,t,d); ASSIST.lastPan={id:T.id,text:String(LAST_TEXT.text||'')}; return P.act?{actions:[P.act],reply:P.say+', same notes.'}:{actions:[],reply:P.say+'.'}; }
/* one part to one side: plain 40, "a bit" 20, "hard" 100, a number as said, "more"/"further" a step on from where it is */
function panOne(T,t,d){ const cur=Math.round(((T.fx||{}).pan||0)*100);
  if(/^(cent|middle|mono)/.test(d)) return cur?{act:{type:'track_fx',track:T.id,effect:'pan',amount:0},say:`${T.name} is back in the centre`}:{say:`${T.name} is already in the centre`};
  const num=t.match(/\b(\d{1,3})\s*(?:%|percent)?\s*(?:to the )?(?:left|right)\b|\b(?:left|right)\s*(?:by |to )?(\d{1,3})\b/), hard=/\b(hard|fully|all the way|completely|100)\b/.test(t), bit=/\b(a (?:little|bit|touch|tad)( bit)?|slightly|bit|little|thoda|thodi|zara|a hair)\b/.test(t), more=/\b(more|further)\b/.test(t);
  let n=num?Math.min(100,+(num[1]||num[2])):hard?100:bit?20:40; const sign=d==='left'?-1:1;
  if(more&&!num&&Math.sign(cur)===sign) n=Math.min(100,Math.abs(cur)+(bit?10:20));
  const want=sign*n, side=`${d} (${d==='left'?'L':'R'} ${n})`; if(want===cur) return {say:`${T.name} is already panned ${n===100?'hard ':''}${side}`};
  return {act:{type:'track_fx',track:T.id,effect:'pan',amount:want},say:`Panned ${T.name} ${n>=100?'hard ':n<=25?'a bit ':''}${side}`}; }
/* two or more parts in one pan request: "pan the melody left and the chords right" (each its own side, in the order said),
   "pan the melody and the chords left" (both that side). One request, so one undo step; never a part to the other part's side (QA, 22 Nov AI-14 fix 4) */
function panMany(t){ const RS=ROLE_WORDS.filter(([k])=>k!=='voice').map(([k,re])=>({k,i:t.replace(/\bhats\b/g,'    ').search(re)})).filter(x=>x.i>=0).sort((a,b)=>a.i-b.i); if(RS.length<2) return null;
  if(RS.some((x,j)=>j&&!/(?:,|&|\band|\baur|\bplus|\bthen)\s*(?:(?:also|and) )?(?:the |my )?$/.test(t.slice(RS[j-1].i,x.i)))) return null; /* "the melody on the left, away from the chords": one part */
  const D=[...t.matchAll(/\b(left|right|cent(?:re|er)(?:ed)?|middle)\b/g)].map(m=>({d:m[1],i:m.index})); if(!D.length) return null;
  const nm=k=>(TONE_PART[k]||'the '+k).replace(/^the /,''), list=w=>w.length>1?w.slice(0,-1).join(', ')+' and '+w[w.length-1]:w[0];
  const miss=RS.filter(x=>!PROJ.tracks.some(y=>y.role===x.k)); if(miss.length) return {actions:[],reply:`There’s no ${list(miss.map(x=>nm(x.k)))} in the song yet to pan.`};
  let pairs;
  if(D.length===1) pairs=RS.map(x=>({k:x.k,d:D[0].d,seg:t}));
  else { pairs=RS.map((x,j)=>{ const end=j+1<RS.length?RS[j+1].i:t.length, own=D.filter(y=>y.i>x.i&&y.i<end); return {k:x.k,d:own.length===1?own[0].d:null,seg:t.slice(x.i,end)}; });
    /* "pan the melody and the chords left and right": sides listed after the parts, in the same order */
    if(pairs.some(p=>!p.d)&&D.length===RS.length&&D[0].i>RS[RS.length-1].i) pairs=RS.map((x,j)=>({k:x.k,d:D[j].d,seg:t}));
    if(pairs.some(p=>!p.d)) return {actions:[],reply:`Which side for each part? Say “pan the ${nm(RS[0].k)} left and the ${nm(RS[1].k)} right”.`}; }
  const A=[], said=[]; pairs.forEach(p=>{ const T=[...PROJ.tracks].reverse().find(x=>x.role===p.k), d=/^cent|middle/.test(p.d)?'centre':p.d, P=panOne(T,p.seg,d); if(P.act) A.push(P.act); said.push(P.say); });
  ASSIST.lastPan={id:null,text:String(LAST_TEXT.text||'')}; return {actions:A,reply:list(said.map((x,j)=>j?x.replace(/^Panned /,''):x))+(A.length?', same notes.':'.')}; }
/* ---- space: "it sounds too dry", "the chords are too dry", "give it more space"; "it's too wet" the other way. Reverb on the parts that
   carry it (chords, melody, vocals), a step at a time; bass and drums stay dry unless they are named (QA, 22 Nov bug 4). ---- */
function spaceFix(t){ const dry=/\b(too dry|so dry|very dry|sounds? dry|bit dry|kinda dry|dry sounding|needs? (?:more )?(?:space|room|air|depth|ambience)|more (?:space|room|ambience|depth)|more spacious|feels? (?:flat|small)|sounds? (?:flat|small|boxed in))\b/.test(t)&&!/\b(drier|less|reduce|too wet|too much)\b/.test(t);
  const wet=!dry&&/\b(too wet|so wet|too much reverb|too washy|washy|too much space|too roomy|drier|dry it up)\b/.test(t); if(!dry&&!wet) return null;
  if(/\b(reverb|delay|echo)\b/.test(t)&&!/\btoo much reverb\b/.test(t)) return null; /* the effect named: the effect rules */
  if(!PROJ.tracks.length) return {actions:[],reply:'There’s nothing in the song yet. Say “make a house beat” to start.'};
  const role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0]||(DRUM_VOICE.some(([k,re])=>re.test(t))?'drums':null), heard=x=>!x.mute;
  let list=role?PROJ.tracks.filter(x=>x.role===role&&heard(x)):PROJ.tracks.filter(x=>heard(x)&&/^(chords|melody|voice)$/.test(x.role)&&(x.kind==='notes'||x.kind==='audio'));
  if(wet&&!role) list=PROJ.tracks.filter(x=>heard(x)&&/^(chords|melody|voice)$/.test(x.role)&&((x.fx||{}).rev||0)>0.001);
  if(!list.length) return {actions:[],reply:role?`There’s no ${(TONE_PART[role]||role).replace(/^the /,'')} playing to change.`:dry?'So far it’s drums and bass, and those usually stay dry. Say “more reverb on the drums” if you want space on them anyway.':'There’s no reverb on anything yet.'};
  const A=[], said=[]; list.forEach(x=>{ const r=Math.round(((x.fx||{}).rev||0)*100), nv=dry?Math.min(100,r+15):Math.max(0,r-15); if(nv===r) return; A.push({type:'track_fx',track:x.id,effect:'reverb',amount:nv,remove:nv===0||undefined}); said.push(`${x.name} ${nv}%`); });
  if(!A.length) return {actions:[],reply:dry?'The reverb is already all the way up there. Try “more delay on the chords” for more space.':'There’s no reverb left to take off.'};
  return {actions:A,reply:`${dry?'More space':'Drier'}: reverb ${dry?'up':'down'} on ${said.length>1?said.slice(0,-1).join(', ')+' and '+said[said.length-1]:said[0]}${dry&&!role?'; bass and drums stay dry':''}. Say “${dry?'still too dry':'still too wet'}” to go further.`}; }
/* one request (one command); localBrain splits a sentence with two commands first */
function brainOne(raw){
  /* "make the bass bouncier": more notes on that part; bounce alone (or on the beat) is swing (QA, 22 Nov fix 4) */
  if(/\b(bouncier|bouncy|bouncey|more bounce)\b/i.test(raw)&&!/\b(swing|shuffle|drums?|beat|groove|hats|kick|everything|song|track)\b/i.test(raw)){ const r=(ROLE_WORDS.find(([k,re])=>re.test(askText(raw)))||[])[0];
    if(r&&r!=='drums'&&r!=='voice'&&PROJ.tracks.some(x=>x.role===r&&x.kind==='notes')) return {actions:[{type:'reshape',track:r,do:'busier'}]}; }
  const sws=swingSaid(raw), anyDrums=PROJ.tracks.some(x=>x.role==='drums'), hasDrums=PROJ.tracks.some(x=>x.role==='drums'&&x.recipe);
  if(sws!=null&&swingOnly(raw,hasDrums)){
    if(hasDrums) return {actions:[{type:'groove',track:'drums',swing:sws}]};
    if(!anyDrums) return {actions:[],reply:"There's no beat yet. Say 'make a house beat' first."};
    return {actions:[],reply:"Your drums are your own part, so I left their swing as it is. Say 'make a house beat' for a beat I can swing."}; }
  raw=secMixStrip(raw); /* "the melody is too loud in the drop": the melody, in the whole song (the reply says so; QA, 22 Nov bug 3) */
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
/* the parser's view of a request: lower case, common spellings joined ("hi-hats" → hats, "lo-fi" → lofi, "un-mute" → unmute),
   and the commonest typos fixed ("basline", "anothr one", "melodie") */
function askText(raw){
  return ' '+String(raw||'').toLowerCase().replace(/hi[\s-]?hats?|high[\s-]?hats?|hihats?/g,'hats').replace(/drum ?(and|&|n|'n') ?bass|d ?& ?b|d n b/g,'dnb').replace(/hip[\s-]?hop/g,'hiphop').replace(/lo[\s-]?fi/g,'lofi').replace(/eighths?|8ths?|8th notes?|eight notes?|8\s*\/\s*8/g,' 8th ').replace(/sixteenths?|16ths?|16 notes?|16\s*\/\s*16/g,' 16th ').replace(/beats per minute|bpm/g,' bpm ')
    /* "why is the bass so loud?", "why does the melody sound so busy?": a comment that it is too loud / too busy (QA, 22 Nov fix 3) */
    .replace(/\bwhy (?:is|are|does|do) (the |my |this |that )?([a-z0-9 ]{2,20}?) (?:sound |sounding |get |getting )?(?:so|that|this|too) (loud|quiet|soft|busy|muddy|boomy|harsh|bright|dark|thin|low|high|fast|slow)\b/g,'$1$2 is too $3')
    .replace(/\bun[\s-]+(mute|solo)/g,'un$1').replace(/\b(basline|bassine|bassslines?|basslin)\b/g,'bassline').replace(/\b(baslines)\b/g,'basslines').replace(/\b(anothr|anotehr|antoher|anothor|anoter)\b/g,'another').replace(/\b(melodie|melodi|meoldy|mellody|melidy|mleody)\b/g,'melody').replace(/\b(chrods|cords)\b/g,'chords').replace(/\bmor\b/g,'more').replace(/\bteh\b/g,'the')+' '; }
function brainCore(raw,sws){
  const t=askText(raw);
  const A=[]; let m;
  const artist=artistIn(raw); let ref=artist?(artistAlias(artist,raw)||artist.name):undefined; /* "like Black Coffee" keeps Black Coffee, not the entry's first name */
  const plm=raw.match(/\b(?:like|from|vibe of|in the style of)\s+(?:my\s+)?(.+?)\s+playlist\b/i)||raw.match(/\bmy playlist\s+["“]?([^"”,.]+)["”]?/i);
  if(plm&&typeof findPlaylist==='function'&&findPlaylist(plm[1])) ref='playlist '+plm[1];
  const style=(STYLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  /* sing a part over the beat */
  /* "record my bassline", "let me record the bass with my voice", "i'll hum it" are sung takes (UX-14); a hum with no part named is a melody (the bassline right after talking about the bass) */
  const singAsk=/\b(sing|hum|whistle|record (my )?voice|let me (do|try)|with my voice|record (my|the) (bass ?line|bass|chords?|melody|lead|hook|tune))\b/.test(t)&&!AUD_NOUN.test(t.replace(/\bmy voice\b/,''));
  if(singAsk&&/\bi ?(?:'|’)?ll (sing|hum|whistle)\b|\b(let me|i want to|i wanna|can i) (sing|hum|whistle) (it|that|this|one)\b/.test(t)&&!/\b(bass|chords?|pads?|melody|lead|hook|tune|riff)\b/.test(t)) return {actions:[{type:'sing',part:ASSIST.focus==='bass'?'bass':'melody'}]};
  const singRole=singAsk?(/\bbass/.test(t)?'bass':/\bchord|\bpad/.test(t)?'chords':/\b(melody|lead|hook|tune|riff|top ?line|voice)\b/.test(t)?'melody':null):null;
  /* "sing a new bassline" (the half after "mute the bass and"): a sung take, never a new bassline made for you (QA, 22 Nov AI-14 fix 2) */
  if(singRole&&/^\s*(?:(?:and|then|now|ok|okay|please|let me|i ?(?:'|’)?ll|i want to|i wanna)\s+)*(?:sing|hum|whistle)\b/.test(t)) return {actions:[{type:'sing',part:singRole}]};
  /* "save the song" / "save my track" is a save; a file only when export, download, bounce, render, mp3 or wav is said (QA, 16 Nov) */
  if(/\b(download|export|bounce|render|give me)\b.*\b(mp3|audio file|song file|the song|the track|my song|my track)\b|\bmp3\b|\bsave\b.*\b(as|to) (an? )?(audio|wav)\b/.test(t)&&!/\b(zip|stems?|ableton|midi)\b/.test(t)){ const mm=t.match(/(\d+)\s*(min|minute)/), loops=t.match(/(\d+)\s*loops?/); return {actions:[{type:'export',format:'mp3',minutes:mm?+mm[1]:undefined,loops:loops?+loops[1]:undefined}]}; }
  if(/\b(download|export)\b.*\b(zip|stems?|ableton)\b/.test(t)) return {actions:[{type:'export',format:'zip'}]};
  /* "turn <audio track> into a bassline": a voice note, an imported recording, or one named ("turn hook idea into chords"). Checked before singing and voice notes. */
  { const tc=audioConvert(t); if(tc) return tc; }
  { const ms=muteSoloFix(t); if(ms) return ms; }
  { const q=quantizeFix(t); if(q) return q; }
  { const pn=panFix(t); if(pn) return pn; }
  { const sp=spaceFix(t); if(sp) return sp; }
  { const FXRE=/\b(reverb|delay|echo|sidechain|side chain|pump|compress(?:ion|or)?|drive|saturation|distortion|width|wider|stereo|low ?cut|high ?cut|effects|fx)\b/g, fxs=[...t.matchAll(FXRE)].map(m=>m[1]), tr=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
    /* "remove the melody, no reverb": the clause that names the melody removes it; the effect half has no part left, so it is skipped and the reply says so (QA, 16 Nov) */
    if(fxs.length&&tr&&typeof removesPart==='function'){ const T=findTrack(tr); if(removesPart(t,{role:tr,name:T&&T.name})) return {actions:[{type:'remove',track:tr}],reply:done=>done.length?`${done.join('. ')}. I skipped the ${fxs[0]} change, because that part is gone.`:''}; }
    if(fxs.length&&tr&&/\b(add|put|more|less|on|to|give|use|some|turn|set|at|make|from|off|remove|kill|take|rid|drop|lose|no|without|spread|widen|open)\b/.test(t)){ /* "spread the chords wider" is the width, never new chords (AI-14 fix 1) */ const T=findTrack(tr), A=[], seen=new Set();
      /* each effect reads the half of the sentence about it ("set the reverb on the chords to 20% and add some delay": reverb 20, delay a step up).
         A number sets it exactly; remove/kill/take off/no turns it off; less/more step it; "add some X" never lowers X (42% stays 42% + a step, QA 16 Nov) */
      fxs.forEach(w=>{ const k=fxKey(w); if(seen.has(k||w)) return; seen.add(k||w);
        const c=(k&&fxClause(t,k,T))||t, off=/\b(remove|no|off|kill|without|lose|drop|get rid of|take out)\b/.test(c)||!!fxOffSaid(c);
        if(w==='effects'||w==='fx'){ if(off) A.push({type:'track_fx',track:tr==='drums'?'drums':tr,effect:'all',remove:true}); return; }
        const num=c.match(/(?:\b(?:to|at|of|by|is|on|reverb|delay|echo|drive|width|sidechain|compression|compressor|saturation|distortion|cut)\s+(?:about |around |like |maybe )?)(\d{1,5})\s*(%|percent|hz|khz|k)?(?![\d/])|\b(\d{1,5})\s*(%|percent|hz|khz)/), unitHz=k&&TFX_DEF[k]&&TFX_DEF[k].unit==='Hz';
        const less=/\b(less|reduce|lower|down|too much|too wet|drier|dry|tone down|kam)\b/.test(c), more=/\b(more|boost|increase|extra|wetter|zyada|jyada)\b/.test(c);
        let change=less?-20:more?20:undefined, amount;
        if(!off&&num&&!/\b(bpm|bars?|beats?)\b/.test(c.slice(num.index,num.index+num[0].length+8))){ let v=+(num[1]||num[3]); if(unitHz&&/^k(hz)?$/.test(num[2]||num[4]||'')) v*=1000; if(unitHz||v<=100){ amount=v; change=undefined; } }
        if(amount===undefined&&change===undefined&&!off&&k&&T&&TFX_DEF[k]&&!unitHz&&((T.fx||{})[k]||0)>=TFX_DEF[k].def-1e-6) change=10;
        A.push({type:'track_fx',track:tr==='drums'?'drums':tr,effect:w,amount,change,remove:off}); });
      return {actions:A}; } }
  { const q=askFix(t,raw); if(q) return q; }
  { const pe=partEditFix(t,raw); if(pe) return pe; }
  { const sl=sectionSayFix(t); if(sl) return sl; }
  { const tone=toneFix(t); if(tone) return tone; }
  { const lv=levelFix(t); if(lv) return lv; }
  if(/^\s*(undo|undo that|go back|revert( that)?|take that back)\b/.test(t)) return {actions:[{type:'undo'}]};
  if(/^\s*(redo|redo that|redo it)\s*$/.test(t)) return {actions:[{type:'redo'}]};
  /* "… and record a new one" (after muting a voice note): a new take, a voice note unless the last take was a sung part (QA, 22 Nov AI-14 fix 2) */
  if(/\b(?:re-?record|record)\b/.test(t)&&/\b(?:new|fresh|another|second) (?:one|take|voice ?note|recording|vocal)\b|\brecord another\b/.test(t)&&!/\b(bass ?line|bass|chords?|pads?|melody|lead|hook|tune|riff|beat|drums?|song|track|project)\b/.test(t))
    return {actions:[{type:'sing',part:/\b(vocal|voice)\b/.test(t)||!LAST_TAKE.part?'voice':LAST_TAKE.part}]};
  { const sb=songBrain(raw,t); if(sb) return sb; }
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
  if(style&&!artist) A.push({type:'style',style,keepTempo:/bpm|tempo/.test(t)||!!tempoAt(t,style)});
  if((m=t.match(/(\d{2,3}(?:\.\d)?)\s*bpm/)||t.match(/tempo (?:to |of |at )?(\d{2,3})/)||tempoAt(t,style||artist))) A.push({type:'tempo',bpm:+m[1]});
  else if(/\b(faster|speed (it )?up|quicker|slower|slow (it )?down)\b/.test(t)&&!/\bhats\b/.test(t)&&!FASTER_PART.test(t)&&PROJ.tracks.length) A.push({type:'tempo',bpm:Math.round(CTRL.bpm)+(/\b(slower|slow (it )?down)\b/.test(t)?-5:5)*(/\b(a lot|much|way)\b/.test(t)?2:1)});
  if((m=t.match(/\b(\d{1,2})\s*bars?\b/))) A.push({type:'bars',bars:+m[1]});
  /* "set the key to F sharp minor", "change the key to D minor", "make it F# minor", "transpose to E minor" (UX-19 report, 22 Nov) */
  if((m=t.match(/\b(?:in|key of|key(?: to| into| as| in)?|(?:make|put|turn|switch|change|move|transpose|shift|set) (?:it|the song|the track|this|everything|the whole song)(?: to| into| in| over to)?|(?:transpose|switch|change|move|shift|modulate) (?:it )?(?:to|into))\s+([a-g](?:\s*(?:sharp|flat|#|b))?\s*(?:major|minor|maj|min|m)?)(?=[\s,.!?]|$)/)) && /major|minor|maj|min|\bkey\b|sharp|flat|#/.test(m[0])) A.push({type:'key',key:m[1]});
  if(/\b(new song|new project|start over)\b/.test(t)) return {actions:[{type:'new_project'}],reply:'Started a new song. Your last one is saved.'};
  if(/\bsave\b/.test(t)) A.push({type:'save'});
  if(/\b(stop|pause)\b/.test(t)) A.push({type:'transport',do:'stop'});
  const role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  const mixVerb=(t.match(/\b(louder|turn up|boost|quieter|softer|turn down|lower|mute|unmute|solo|unsolo|remove|delete|drop)\b/)||[])[1], shapeAsk=LEVEL_CREATE.test(t)||LEVEL_SHAPE.test(t)&&!LEVEL_EXPLICIT.test(t);
  const swap=iw && role && /\b(use|change|switch|swap|make|turn|put|play|replace|move|have|try)\b/.test(t) && !/\b(add|another|second|layer|extra|new)\b/.test(t) && PROJ.tracks.some(x=>x.role===role);
  if(mixVerb && role && !(shapeAsk&&/^(louder|turn up|boost|quieter|softer|turn down|lower)$/.test(mixVerb))){
    if(/louder|turn up|boost/.test(mixVerb)) A.push({type:'mix',track:role,change:12});
    else if(/quieter|softer|turn down|lower/.test(mixVerb)) A.push({type:'mix',track:role,change:-12});
    else if(mixVerb==='mute') A.push({type:'mix',track:role,mute:true}); else if(mixVerb==='unmute') A.push({type:'mix',track:role,mute:false});
    else if(mixVerb==='solo') A.push({type:'mix',track:role,solo:true}); else if(mixVerb==='unsolo') A.push({type:'mix',track:role,solo:false}); else A.push({type:'remove',track:role});
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
/* ---------- AI-9: a comment about one part changes only that part, on its own track ----------
   "make the bass simpler", "the melody is too busy", "make the chords shorter": that part's notes (reshape).
   "change/replace/redo the chords", "new chords", "happier chords": a new version of that part in place (vary), never a second copy.
   "replace the chords with strings": the same notes on a new sound. "go back to the previous chords", "no, the other one": that part's
   earlier version (revert). Questions ("which chords are these") get an answer, never a track. */
/* can / could / how about / what about / what if + a change word is a request, not a question: "how about some happier chords?",
   "what if the chords were on strings?", "could the chords be shorter?" (QA, 22 Nov fix 3; partAsk uses the same lead-in rule) */
const ASK_LEAD=/^\s*(?:(?:hey|so|ok|okay|and|um|yeah|hmm)\b[\s,]*)*(?:can|could|would|will|why|how about|what about|what if|should|shall|maybe|is it possible|any chance)\b/;
const instAt=t=>{ let best=null; for(const [k,re] of INST_WORDS){ if(/^(pad|lead|pluck)$/.test(k)) continue; const m=re.exec(t); if(m&&(!best||m[0].length>best.n)) best={k,i:m.index,n:m[0].length}; } return best; }; /* the longest name: "electric piano", not "piano" */
/* an instrument asked for as the sound of a part: "on strings", "with an electric piano", "as a choir", "what about strings for the chords" */
const instAsked=t=>{ const w=instAt(t); return w&&/(?:\b(?:on|with|as|into|using|to|be|for|through)\s+(?:(?:an?|the|some|real|nice)\s+)?(?:\w+\s+)?|\b(?:how|what) about\s+(?:(?:an?|the|some)\s+)?)$/.test(t.slice(0,w.i))?w.k:null; };
const askChange=t=>/\b(add|give|change|new|different|make|replace|try|turn|put|remove|mute|unmute|solo|delete|swap|switch|redo|regenerate|transpose|move|set|please|let'?s|another|too|other|fresh|instead|louder|softer|quieter|brighter|darker|warmer|higher|lower|faster|slower|more|less)\b/.test(t)||!!moodSaid(t)||!!reshapeSaid(t)||!!instAsked(t);
function askFix(t,raw){
  const q=/^\s*(what|which|whats|tell me|do you know|say)\b|\?\s*$/.test(t)||/\bwhat(?:'|’)?s\b|\bwhat (are|is)\b/.test(t);
  if(q&&/\b(chords?|progression)\b/.test(t)&&!/\b(add|give|change|new|different|make|replace|try)\b/.test(t)&&!(ASK_LEAD.test(t)&&askChange(t))){ const c=typeof chordsSaid==='function'?chordsSaid(true):null;
    return {actions:[],reply:c?`The chords are ${c}, in ${keyName(projectKey())}. Say “new chords” for others, or “happier chords”.`:'There are no chords yet. Say “add chords” and I’ll tell you what they are.'}; }
  { const pa=partAsk(t); if(pa) return pa; }
  if(q&&/\bkey\b/.test(t)&&!/\b(change|set|make|put|move)\b/.test(t)) return {actions:[],reply:PROJ.key?`It’s in ${keyName(PROJ.key)}.`:PROJ.tracks.length?`No key is set yet; it sounds like ${keyName(projectKey())}. Say “key F minor” to set one.`:'There’s nothing in the song yet, so no key. Say “key F minor” to set one.'};
  /* "how many bars is the loop", "how long is the loop" (QA, 22 Nov) */
  if(/\bhow (?:many bars|long)\b/.test(t)&&/\b(loop|bars?|song|track|it)\b/.test(t)&&!/\b(make|set|change)\b/.test(t)) return {actions:[],reply:songArranged&&songArranged()?`The song is ${songSections().reduce((n,x)=>n+x.bars,0)} bars long, and the loop is ${PROJ.bars} bars.`:`The loop is ${PROJ.bars} bars long. Say “make the loop 8 bars” to change it.`};
  if(q&&/\b(tempo|bpm|how fast)\b/.test(t)&&!/\b(change|set|make)\b/.test(t)) return {actions:[],reply:`It’s at ${Math.round(CTRL.bpm)} BPM.`};
  /* chords named by letter ("make the chords Am F C G", "a minor f c g"): not yet; never a random new track (QA, 21 Nov) */
  const CH='[a-g](?:#|b|♯|♭| sharp| flat)?(?:m|min|maj|dim|7|maj7|m7| minor| major)?';
  if(/\b(chords?|progression|play)\b/.test(t)&&new RegExp('(?:^|[\\s,])'+CH+'(?:(?:[\\s,]+|\\s*-\\s*)'+CH+'){2,}(?=[\\s,.!?]|$)').test(t.replace(/\b(make|the|chords?|progression|to|be|play|please|use|set)\b/g,' ').replace(/\s+/g,' ')))
    return {actions:[],reply:'I can’t play chords you name yet. Say “new chords” for a different progression or “happier chords”, or play them on the keyboard and I’ll keep them as you play them.'};
  return null; }
/* a question about one part ("is the bass in F sharp or G flat?", "what note is the bass playing?", "is the melody in key?"): an answer from
   the song, never a change (QA, 22 Nov fix 2). "can you make the bass simpler?" and "why is the bass so loud?" are requests, not questions. */
function partAsk(t){
  const q=/^\s*(?:(?:hey|so|ok|okay|and|um)\b[\s,]*)*(is|are|was|were|does|do|did|what|which|whats|what's|what’s|how|where|tell me|do you know)\b/.test(t)||/\?\s*$/.test(t);
  if(!q||/^\s*(?:(?:hey|so|ok|okay|and)\b[\s,]*)*(can|could|would|will|why|how about|what if|should)\b/.test(t)) return null;
  if(/\b(add|give|change|new|different|make|replace|try|turn|put|remove|mute|unmute|solo|delete|swap|switch|redo|regenerate|transpose|move|set|please|let'?s|another|too|so (?:loud|quiet|busy|boring)|do something|something (?:else|different|new|fresh))\b/.test(t)) return null;
  const role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0]; if(!role||role==='chords') return null; /* the chords have their own answer */
  const T=[...PROJ.tracks].reverse().find(x=>x.role===role&&x.kind==='notes'), nm={drums:'drums',bass:'bassline',melody:'melody',voice:'vocal'}[role]||role;
  if(!T) return {actions:[],reply:`There’s no ${nm} in the song yet. Say “add a ${nm==='drums'?'beat':nm}” and I’ll tell you about it.`};
  const k=projectKey(), say=pc=>typeof pcSay==='function'?pcSay(pc,k):PC_NAMES[mod(pc,12)], kn=say(k.tonic)+' '+k.mode, inst=(INST.get(T.inst)||{}).name;
  if(role==='drums') return {actions:[],reply:`The drums are ${T.desc?T.desc.replace(/\.$/,''):(inst||'the kit')+', '+T.events.length+' hits in the loop'}. Say “new drums” for another pattern.`};
  const ev=[...T.events].sort((a,b)=>a.b-b.b), seen=[]; ev.forEach(e=>{ const pc=mod(Math.round(e.n),12); if(!seen.includes(pc)) seen.push(pc); });
  const S=k.mode==='major'?[0,2,4,5,7,9,11]:[0,2,3,5,7,8,10], out=seen.filter(pc=>!S.includes(mod(pc-k.tonic,12)));
  const list=L=>L.length>1?L.slice(0,-1).join(', ')+' and '+L[L.length-1]:L[0]||'';
  if(!ev.length) return {actions:[],reply:`The ${nm} has no notes yet.`};
  if(/\bin (?:the )?key\b|\bout of key\b|\bwrong notes?\b/.test(t)) return {actions:[],reply:out.length?`Mostly: the ${nm} is in ${kn}, with ${list(out.slice(0,3).map(say))} outside the key. Say “quantize” or play it again if that’s not what you meant.`:`Yes, every note of the ${nm} is in ${kn}.`};
  /* "F sharp or G flat": the same note, spelled for this key */
  const em=/\b([a-g])(?: (sharp|flat))?\b.*?\bor\b.*?\b([a-g])(?: (sharp|flat))?\s*\??\s*$/.exec(t), P0={c:0,d:2,e:4,f:5,g:7,a:9,b:11}, pcOf=(l,a)=>mod(P0[l]+(a==='sharp'?1:a==='flat'?-1:0),12);
  const nmOf=(l,a)=>l.toUpperCase()+(a?' '+a:''), enh=em&&(em[2]||em[4])?(pcOf(em[1],em[2])===pcOf(em[3],em[4])?` ${nmOf(em[1],em[2])} and ${nmOf(em[3],em[4])} are the same note; in ${kn} it’s written ${say(pcOf(em[1],em[2]))}.`:''):'';
  return {actions:[],reply:`The ${nm} plays ${list(seen.slice(0,6).map(say))}, in ${kn}${inst?', on '+inst:''}.${enh}`}; }
/* the part a shape word is about when several are named ("the melody is too busy make it simpler"): the one said last before it (QA, 22 Nov fix 4) */
function roleBefore(t,re){ const m=re.exec(t); if(!m) return null; let best=null, at=-1; ROLE_WORDS.forEach(([k,r])=>{ const g=new RegExp(r.source,'g'); let x; while((x=g.exec(t))&&x.index<m.index){ if(x.index>at){ at=x.index; best=k; } } }); return best; }
function partEditFix(t,raw){
  const role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0], songW=/\b(intro|outro|drop|break|build|section|verse|chorus|bridge)\b/.test(t);
  if(/\b(go back to|back to|bring back|return to|restore|switch back to|undo) (the |my |that )?(previous|last|old|older|earlier|original|first|other)\b|\b(previous|last|old|other|first|original) (one|version|take|chords?|bass ?line|bass|melody|drums?|beat)( was| is| sounded| sounds)? better\b|\bi (liked|prefer(red)?|like|want) the (previous|last|old|other|first|original)\b|^\s*(no,? )?the other one\b|\b(bring|put|change) (it|that|them) back\b|\b(pehl[aei]|pahl[aei]|purane|purani|purana|pichh?l[aei]|original|first)\b.*\b(wapas|vapas|waapas|vaapas)\b|\b(wapas|vapas) (lao|laao|le aao|karo|kar do|do)\b.*\b(pehl[aei]|pahl[aei]|purane|purani|purana|pichh?l[aei])\b/.test(t)&&!songW)
    return {actions:[{type:'revert',track:role||undefined}]};
  if(!role||role==='voice'||songW) return null;
  const T=[...PROJ.tracks].reverse().find(x=>x.role===role&&x.kind==='notes'); if(!T) return null;
  if(/\b(add|another|second|layer|extra|new track|on top|as well|also)\b/.test(t)) return null; /* "add a choir", "another bassline": the paths below */
  /* "play the bass an octave lower": the same notes 12 semitones down, never a volume move (QA, 22 Nov) */
  { const o=t.match(/\b(?:(an?|one|two|2) )?octaves? (lower|down|higher|up)\b|\b(lower|higher|down|up) (?:by )?(an?|one|two|2) octaves?\b/);
    if(o&&role!=='drums'){ const n=/two|2/.test((o[1]||'')+(o[4]||''))?2:1, dn=/lower|down/.test(o[2]||o[3]); return {actions:[{type:'transpose',track:T.id,semitones:(dn?-12:12)*n}],reply:`${T.name} ${n>1?'two octaves':'an octave'} ${dn?'lower':'higher'}, same notes and rhythm.`}; } }
  const sh=reshapeSaid(t), shRole=sh&&ROLE_WORDS.filter(([k,re])=>re.test(t)).length>1?roleBefore(t,/\b(simpler|simplify|simple|less busy|too busy|busier|more busy|shorter|longer|staccato|legato|fewer notes|more notes)\b/)||role:role;
  if(sh&&shRole!=='drums'||sh&&/^(simpler|busier)$/.test(sh)){ const A=[{type:'reshape',track:shRole,do:sh}], lv=levelFix(t.replace(/\b(simpler|simplify|simple|busier|less busy|too busy|more busy|shorter|longer)\b/g,' '));
    if(lv&&lv.actions&&lv.actions.length) A.push(...lv.actions); return {actions:A}; }
  /* "happier chords", "make the melody darker": a new version that leans that way (bright/dark alone on a melody is its EQ, toneFix) */
  if(role==='chords'&&moodSaid(t)&&!/\b(brighter|darker)\b.*\b(sound|tone|eq)\b/.test(t)&&(!/\b(bright|brighter|dark|darker|dull|duller|muffled)\b/.test(t)||/\bprogressions?\b|\b(darker|brighter|sadder|happier|moodier) (chords?|progression)\b/.test(t))) return {actions:[{type:'vary',track:'chords',mood:moodSaid(t)}]};
  /* "make the melody happier", "a sadder melody": a new melody that leans that way (QA, 22 Nov fix 4) */
  if(role==='melody'&&/\b(happ(y|ier)|sad(der)?|uplifting|cheer\w*|hopeful|melanchol\w*|moodier|emotional|euphoric)\b/.test(t)) return {actions:[{type:'vary',track:'melody',mood:moodSaid(t)}]};
  /* "what if the chords were on strings?", "how about the chords on an electric piano?": the same notes on that sound (QA, 22 Nov fix 3) */
  { const ia=instAsked(t); if(ia&&ia!==T.inst&&role!=='drums'&&!/\b(new|different|another|fresh)\b/.test(t)) return {actions:[{type:'instrument',track:role,instrument:ia}]}; }
  const iw=(INST_WORDS.find(([k,re])=>re.test(t))||[])[0], fresh=/\b(redo|rework|rewrite|regenerate|new|different|other|fresh|try (some )?(other|different|something else)|do something(?: (?:else|new|different|fresh|cool|fun))?(?: (?:with|to|about|on|for))?|something (?:else|different|new|fresh)|badal\w*|badl\w*|naya|nayi|naye|koi aur|dusr[aie]|alag)\b/.test(t);
  if(fresh||/\b(change|changed|changing|replace|replaced|swap( out)?|swapped|switch( up)?)\b/.test(t)){
    const inst=iw&&iw!==T.inst&&/\b(to|with|for|on|into|as|by)\b/.test(t)?{type:'instrument',track:role,instrument:role==='drums'&&iw==='bass808'?'kit808':iw}:null;
    if(role==='drums') return inst?{actions:[inst]}:null;
    /* "the bass and melody need work, give me new ones": a new version of each pitched part named (QA, 22 Nov fix 4) */
    { const RS=ROLE_WORDS.filter(([k,re])=>re.test(t)&&k!=='drums'&&k!=='voice'&&PROJ.tracks.some(x=>x.role===k&&x.kind==='notes'&&x.gen)).map(x=>x[0]); if(RS.length>1&&fresh&&!inst) return {actions:RS.map(k=>({type:'vary',track:k,mood:k==='chords'?moodSaid(t)||undefined:undefined}))}; }
    if(inst&&!fresh) return {actions:[inst]};
    return {actions:[{type:'vary',track:role,mood:moodSaid(t)||undefined}].concat(inst?[inst]:[])}; }
  return null; }
/* a short follow-up that only gives a side ("a bit more to the left", "to the right", "back to the middle"). A lone "right" is
   a musician agreeing ("right", "ok right"), so it pans only right after a pan; "left" is never a yes, so it still pans (QA, 22 Nov AI-14 fix 3) */
const LONE_PAN=/^\s*(?:(?:and|now|ok|okay|then|maybe)\s+)*(?:a (?:bit|little|touch) |slightly |little |thoda |zara )?(?:more |further )?(?:to the |towards the |over to the )?(left|right)(?: a (?:bit|little|touch))?(?: please)?\s*$|^\s*(?:pan (?:it )?)?(?:back )?(?:to the )?(?:cent(?:re|er)|middle)(?: please)?\s*$/;
function panJustDone(){ const P=typeof ASSIST!=='undefined'&&ASSIST.lastPan; if(!P) return false; const h=ASSIST.history||[]; let i=h.length-1;
  if(h[i]&&h[i].role==='user'&&h[i].content===LAST_TEXT.text) i--; while(i>=0&&h[i].role!=='user') i--; return i>=0&&h[i].content===P.text; }
function lonePan(t){ if(!LONE_PAN.test(t)) return false; if(/\b(left|cent(?:re|er)|middle|more|further|bit|little|touch|slightly|thoda|zara|to the|towards the|over to the)\b/.test(t)) return true; return panJustDone(); }
/* "make it softer" right after the bass: the bass (the focus). Song-wide words, transport and arrangement keep their meaning. */
function focusText(raw){ const f=typeof ASSIST!=='undefined'&&ASSIST.focus, w={drums:'drums',bass:'bass',chords:'chords',melody:'melody'}[f]; if(!w) return raw;
  const t=askText(raw); if((ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0]) return raw;
  /* "make it shorter" / "make them longer" right after a part: that part's notes (QA, 22 Nov fix 2); the song or loop only when it says so */
  if(/\b(song|track|mix|everything|whole|all|master|volume|tempo|bpm|key|major|minor|loop|intro|outro|drop|break|build|section|bars?|faster|slower|swing|bounce|left|right|pan)\b/.test(t)&&!lonePan(t)) return raw;
  if(/\b(longer|shorter)\b/.test(t)&&/\bnotes?\b/.test(t)&&!/\b(it|that|this|them|those)\b/.test(t)) return raw.replace(/\b(?:the )?notes?\b/i,'the '+w+' notes');
  if(/\b(play|stop|pause|save|download|export|bounce|arrange|record|sing|hum|whistle|name|rename|undo|redo|delete|remove|again|mp3|quantize|quantise)\b/.test(t)) return raw;
  /* only a request about "it" ("make it softer", "put it on strings"); "thats it", "keep it" are not the part's name (QA, 22 Nov fix 5) */
  if(/\b(?:it all|all of it|them all|all of them|the whole thing)\b/.test(t)) return raw; /* the whole song, never the focus part (QA, 22 Nov fix 8) */
  if(/\b(it|that|this|them|those)\b/.test(t)&&/\b(make|turn|put|give|change|try|set|move|bring|take|add|swap|switch|play|mute|solo|unmute|remove|delete|quantize|transpose|double|copy|boost|cut|lower|raise|shorten|lengthen|simplify|vary|redo|fix|tweak|louder|softer|quieter|brighter|darker|warmer|simpler|busier|shorter|longer|higher|up|down|more|less|another|again|new|different|replace|karo|kar do|badlo|banao|lagao|daalo|hatao|thoda|thodi)\b/.test(t)&&!(typeof closingSaid==='function'&&closingSaid(raw))) return raw.replace(/\b(it|that|this|them|those)\b/i,'the '+w);
  /* "a bit more to the left" right after panning a part: that part (QA, 22 Nov bug 4) */
  if(lonePan(t)) return 'pan the '+w+' '+raw.trim();
  /* one word after a part ("louder", "a bit softer", "simpler"): that part */
  if(typeof BARE_LEVEL!=='undefined'&&BARE_LEVEL.test(raw)) return 'make the '+w+' '+raw.trim();
  if(/\b(another|one more|new one|different one|the other one|previous one|last one)\b/.test(t)) return raw+' '+w;
  return raw; }
/* ---------- the song by voice, offline (AI-1): "8-bar intro, then build up and drop", "make the break longer", "drop the drums in the outro",
   "add a second drop", "silence before the drop", "loop the break", "play from the second drop", Hinglish "lamba / chhota / hata do / daal do / se pehle".
   Runs before the loop-length rule, so "8-bar intro" is a section and "make the loop 8 bars" still sets the loop. Returns null when it isn't about the song layout. */
const SB_PART='drums?|beat|kicks?|hats|claps?|snares?|perc|percussion|shakers?|bass ?line|bass|sub|chords?|pads?|keys|strings|choir|melody|lead|arp|pluck|vocals?|voice|everything|all';
/* one section asked for on a plain loop: an intro or build-up goes before it, an outro after it, and a break (or bridge) in the middle,
   so the song never starts with 30 seconds of pads (QA, 22 Nov bug 6) */
function loopPlus(name,bars){ const main={name:'Main',bars:Math.max(8,PROJ.bars)};
  if(name==='outro') return [main,{name:'Outro',bars:bars||8}];
  if(/^(break|bridge)$/.test(name)) return [main,{name,bars},Object.assign({},main)];
  return [{name,bars},main]; }
const SB_NOSONG='There’s no song layout yet. Say “make it a full track” or “8-bar intro, then build up and drop” first.';
function songBrain(raw,t0){
  let t=' '+t0.replace(/[.,!?;]+/g,' , ').replace(/\bbuild[\s-]?ups?\b/g,'build').replace(/\bbreak[\s-]?downs?\b/g,'break').replace(/\b(doosr[aie]|dusr[aie])\b/g,'second').replace(/\b(pehl[ai]|pahl[ai])\b/g,'first').replace(/\b(teesr[aie]|tisr[aie])\b/g,'third')
    .replace(/\b(\d{1,2})[\s-]?bars?\b/g,'$1 bar').replace(/\b(drop|break|verse|chorus|build|hook|intro|outro) (one|two|three|four)\b/g,(m,a,b)=>a+' '+{one:1,two:2,three:3,four:4}[b]).replace(/\s+/g,' ')+' ';
  const S=songSections(), arr=songArranged(), has=k=>S.some(s=>s.kind===k);
  const SEC='intro|build|drop|break|outro|verse|chorus|bridge'+(has('hook')?'|hook':''), ORD='(?:(first|second|third|fourth|1st|2nd|3rd|4th|last|final) )?';
  const secRe=new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))?\\b`,'g'), ref=m=>m&&m[1]?(m[0]?m[0]+' '+m[1]:m[1]+(m[2]?' '+m[2]:'')):null; /* [ordinal, section, number] → "second drop", "drop 2", "break" */
  const secAt=re=>{ const m=t.match(re); return m?ref(m.slice(1)):null; };
  const anySec=[...t.matchAll(secRe)];
  const artist=artistIn(raw), needArr=r=>arr?r:{actions:[],reply:SB_NOSONG};
  const PREP=`(?:in|of|from|into|to|during|for|on|inside|at) (?:the |my |this )?${ORD}(${SEC})s?(?: (\\d))?\\b`, HIN=`\\b${ORD}(${SEC})s?(?: (\\d))? (?:se|mein|me|main|ke|ka|ki|ko)\\b`;
  const inSec=secAt(new RegExp('\\b'+PREP))||secAt(new RegExp(HIN));
  let m;
  /* whole song: play, loop */
  if(/\b(play|hear|listen to|start) (the |my )?(whole|full|entire|complete) (song|track|thing)\b|\bstop looping\b|\bloop (the )?(whole|full|entire) (song|track)\b|\bplay (it |the song )?from the (start|top|beginning)\b/.test(t)) return needArr({actions:[{type:'loop_section',section:'song'}]});
  if((m=t.match(new RegExp(`\\bloop (?:the |this |that )?${ORD}(${SEC})s?(?: (\\d))?\\b`)))) return needArr({actions:[{type:'loop_section',section:ref(m.slice(1))}]});
  /* Hinglish puts the verb last: "break ko loop karo", "drop 2 se play karo" */
  if((m=t.match(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? (?:ko |pe |par )?(?:loop|repeat) (?:karo|kar do|kardo|kar|chalao|pe rakho)\\b`)))) return needArr({actions:[{type:'loop_section',section:ref(m.slice(1))}]});
  if((m=t.match(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? se (?:play|start|chalao|bajao|shuru|suno)\\b`)))) return needArr({actions:[{type:'transport',do:'play',from:ref(m.slice(1))}]});
  if((m=t.match(new RegExp(`\\b(?:play|start|go|jump|skip)(?: it)? (?:from|at|to) (?:the )?${ORD}(${SEC})s?(?: (\\d))?\\b`)))) return needArr({actions:[{type:'transport',do:'play',from:ref(m.slice(1))}]});
  /* the whole layout */
  const mins=t.match(/\b(?:make|turn|stretch|cut) (?:the (?:whole )?(?:song|track)|it|this) (?:to |into )?(?:about |around |roughly )?(\d+(?:\.\d+)?) ?(?:min|mins|minutes?)\b|\b(\d+(?:\.\d+)?) ?minutes? (?:long|song|track|version)\b/);
  const fullW=/\b(full|whole|complete|proper|club|extended|dj|entire) (track|song|version|mix|edit|arrangement)\b|\barrange (it|this|the song|my song|the track|everything)\b|\b(make|turn|arrange) (it|this|the loop|that) (into |as )?(a |an |the )?(?:(?:short|shorter|quick|small|mini|little|tiny|reel|full|proper|whole) )?(song|track|full song|version|reel)\b|\b(short|quick|mini|reel) (song|track|arrangement|layout)\b|\b(chhota|chota|chhoti|choti) (song|gaana|gana|track)\b|\b(club|extended|dj|short) (version|mix|edit)\b|\bsong (bana|banao|bana do)\b|\bpoora gaana\b/.test(t);
  if(mins&&!/\b(mp3|download|export|bounce)\b/.test(t)) return PROJ.tracks.length?{actions:[{type:'arrange',minutes:+(mins[1]||mins[2]),template:'full'},{type:'transport',do:'play'}]}:null;
  if(fullW){ const tpl=CLUB_WORDS.test(t)?'club':SHORT_WORDS.test(t)&&!/\b(full|whole|complete)\b/.test(t)?'short':'full', ar={type:'arrange',template:tpl,ref:artist?artist.name:undefined};
    if(!PROJ.tracks.length) return artist?{actions:[{type:'vibe',ref:artist.name},{type:'add_drums',ref:artist.name},ar,{type:'transport',do:'play'}]}:{actions:[],reply:'There’s nothing to arrange yet. Start with a beat: say “make a house beat” or name an artist.'};
    return {actions:(artist&&artist.name!==PROJ.ref?[{type:'vibe',ref:artist.name}]:[]).concat([ar,{type:'transport',do:'play'}])}; }
  /* a list of sections: "make an 8-bar intro, then build up and drop" (a new layout) */
  const seq=[...t.matchAll(new RegExp(`(?:(\\d{1,2}) bar )?(?:an? |the )?(${SEC}|silence|gap)\\b`,'g'))].map(x=>({bars:x[1]?+x[1]:undefined,name:x[2]}));
  const isSeq=seq.filter(x=>!/silence|gap/.test(x.name)).length>=2&&/\b(then|followed by|and|into|,)\b|,/.test(t)&&!/\b(after|before|move|longer|shorter|remove|delete|loop|play|rename|copy|duplicate|pehle|baad)\b/.test(t)&&!new RegExp(`\\b(${SB_PART})\\b`).test(t.replace(/\bbuild\b/g,''))&&!/\b(first|second|third|another|last)\b/.test(t);
  if(isSeq&&PROJ.tracks.length) return {actions:[{type:'arrange',template:'custom',sections:seq.map(x=>({name:x.name,bars:x.bars}))},{type:'transport',do:'play'}]};
  /* the whole song longer or shorter: about a minute either way, like the AI does (arrange minutes) */
  if(arr&&!anySec.length&&(m=t.match(/\b(?:make|let|get) (?:it|this|the (?:whole |full )?(?:song|track|arrangement)|everything) (?:a (?:bit|little) |a lot |much |way )?(longer|shorter)\b|\b(?:song|gaana|gana|track) (?:ko )?(?:thoda )?(lamba|chhota|chota) (?:karo|kar do|kardo|banao|bana do)\b/))){
    const cur=songSecs(songBars())/60, down=/short|chhota|chota/.test(m[1]||m[2]), mins=down?(cur>1.5?Math.max(1,Math.round(cur)-1):cur/2):Math.round(cur)+1;
    return {actions:[{type:'arrange',minutes:+mins.toFixed(2)},{type:'transport',do:'play'}]}; }
  if(!anySec.length&&!/\b(silence|gap|riser|roll|fill)\b/.test(t)) return null;
  /* transitions: "a riser before the drop", "drop se pehle thoda silence daal do", "a fill at the end of the intro", "no roll before the drop" */
  const TR=/\b(snare roll|drum roll|roll|riser|uplifter|fill|drum fill|crash|cymbal|silence|gap|pause|kick drop|filter sweep|filter|sweep|transition)\b/;
  if((m=t.match(TR))&&(anySec.length||/\b(before|pehle)\b/.test(t))){ const w=m[1]; const before=secAt(new RegExp(`\\b(?:before|into|leading into|in front of|up to) (?:the |my )?${ORD}(${SEC})s?(?: (\\d))?\\b`))||secAt(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? (?:se|ke|ki|ka) pehle\\b`))||(/\b(before|pehle)\b/.test(t)&&!anySec.length?'drop':null);
    const at=before?null:secAt(new RegExp(`\\b(?:at the end of|end of|after|in|on|to) (?:the |my )?${ORD}(${SEC})s?(?: (\\d))?\\b`))||secAt(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? (?:ke (?:baad|end)|mein|me)\\b`));
    if(before||at){ const none=/\b(no|remove|without|take out|lose|kill|delete|hata)\b/.test(t)&&w!=='silence'&&w!=='gap'; const to=none||w==='transition'?(none?'none':'snareroll'):w==='silence'||w==='gap'||w==='pause'?'kickdrop':w;
      const bars=(t.match(new RegExp(`\\b(\\d{1,2}) bar (?:snare |drum )?(?:${w})\\b`))||[])[1];
      return needArr({actions:[{type:'transition',section:at||undefined,before:before||undefined,to,bars:bars?+bars:undefined}]}); } }
  /* parts in a section: "take the kick out of the intro and bring the bass in", "drop the drums in the outro", "only pads in the break", "intro se kick hata do" */
  const partRe=new RegExp(`\\b(${SB_PART})\\b`,'g');
  const vary=/\b(different|its own|own|new|fresh|variation|change it up|switch it up|alag)\b/.test(t);
  if(vary&&anySec.length&&!/\b(add|insert|another)\b/.test(t)){ const sec=inSec||ref(anySec[anySec.length-1].slice(1)), ps=[...t.replace(new RegExp(`\\b(${SEC})\\b`,'g'),' ').matchAll(partRe)].map(x=>x[1]);
    const pick=ps.length?ps:[PROJ.tracks.some(x=>x.role==='melody')?'melody':PROJ.tracks.some(x=>x.role==='chords')?'chords':PROJ.tracks.some(x=>x.role==='bass')?'bass':'drums'];
    return needArr({actions:[{type:'parts',section:sec,vary:pick}]}); }
  if(inSec){ const body=t.replace(new RegExp('\\b'+PREP,'g'),' ').replace(new RegExp(HIN,'g'),' ')
      .replace(/(\b(?:hata do|hata|hatao|nikal do|nikalo|daal do|daalo|dalo|daal|band karo|band kar do|add karo|add kar do|bajao|chalao)) (?:aur|phir|and)\b/g,'$1 ,'); /* "intro se kick hata do aur bass daal do": two clauses (QA, 22 Nov bug 1) */
    const clauses=body.split(/,|\band (?=(?:bring|take|drop|remove|add|put|mute|kill|cut|keep|lose|pull|no|without|only|just|let)\b)|\bthen\b|\bbut\b|\bplus\b/);
    const act={in:[],out:[],only:[]};
    clauses.forEach(c=>{ const ps=[...c.matchAll(partRe)].map(x=>x[1].replace(/ /g,'')); if(!ps.length) return;
      const k=/\b(only|just|sirf)\b/.test(c)?'only':/\b(take|drop|remove|mute|kill|cut|pull|lose|without|no|hata|hatao|nikal|nikalo|out|off|stop|mat|band|bandh|nahi|nahin|bina)\b/.test(c)?'out':/\b(bring|add|put|keep|with|daal|dalo|daalo|want|back|in|on|start|enter|play|bajao|chalao|bajne)\b/.test(c)?'in':null; if(k) act[k].push(...ps); });
    if(act.in.length||act.out.length||act.only.length){ const a={type:'parts',section:inSec}; ['in','out','only'].forEach(k=>{ if(act[k].length) a[k]=[...new Set(act[k])]; }); return needArr({actions:[a]}); } }
  const one=anySec.length?ref(anySec[0].slice(1)):null;
  /* longer / shorter: "make the break longer", "intro 8 bars shorter", "break ko lamba karo" */
  if((m=t.match(/\b(longer|shorter|extend|lengthen|shorten|stretch|trim|double|halve|lamba|lambi|lambaa|chhota|chhoti|chota|choti)\b/))&&one){ const n=(t.match(/\b(?:by )?(\d{1,2}) (?:more )?bar\b/)||[])[1], down=/short|trim|halve|chhot|chot/.test(m[1]), s=findSec(one);
    if(/double|halve/.test(m[1])&&s) return needArr({actions:[{type:'section',do:'length',section:one,bars:m[1]==='double'?s.bars*2:s.bars/2}]});
    return needArr({actions:[{type:'section',do:'length',section:one,change:(down?-1:1)*(n?+n:8)}]}); }
  /* add a section, Hinglish with the verb last: "drop ke baad break daal do", "dusra drop add karo", "ek aur drop daal do" */
  if((m=t.match(new RegExp(`\\b(?:(?:a|an|ek|ek aur|aur ek|another|one more|new|naya|nayi) )?(?:(?:second|third|fourth|2nd|3rd|4th) )?(?:(\\d{1,2}) bar )?(${SEC}) (?:bhi |aur )?(?:daal do|daalo|dalo|daal|add karo|add kar do|add kardo|add karna|laga do|lagao|bana do|banao|chahiye|jodo|jod do)\\b`)))){
    const after=secAt(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? ke baad\\b`))||secAt(new RegExp(`\\b(?:after) (?:the )?${ORD}(${SEC})s?(?: (\\d))?\\b`)), before=secAt(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? (?:se|ke) pehle\\b`));
    if(!arr&&PROJ.tracks.length) return {actions:[{type:'arrange',template:'custom',sections:loopPlus(m[2],m[1]?+m[1]:undefined)}]};
    return needArr({actions:[{type:'section',do:'add',name:m[2],after:after||undefined,before:before||undefined,bars:m[1]?+m[1]:undefined}]}); }
  /* add a section: "add a second drop", "add a break after the first drop", "add an outro" */
  if((m=t.match(new RegExp(`\\b(?:add|insert|put in|put|throw in|make|create|daal|dalo|daalo)\\b(?: me| us)?(?: (?:a|an|another|one more|a new|new|some))?(?: (?:second|third|fourth|2nd|3rd|4th))? (?:\\d{1,2} bar )?(${SEC}|silence|gap)\\b`)))&&!(new RegExp(`\\b(${SB_PART})\\b`).test(t.replace(/\bbuild\b/g,'')))){
    const after=secAt(new RegExp(`\\b(?:after|ke baad) (?:the )?${ORD}(${SEC})s?(?: (\\d))?\\b`))||secAt(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? ke baad\\b`)), before=secAt(new RegExp(`\\bbefore (?:the )?${ORD}(${SEC})s?(?: (\\d))?\\b`))||secAt(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? (?:se|ke) pehle\\b`));
    const bars=(t.match(new RegExp(`\\b(\\d{1,2}) bar (?:${m[1]})\\b`))||[])[1];
    if(arr&&bars&&has(songKindOf(m[1]))&&/\b(make|create)\b/.test(t)&&!/\b(another|second|third|new|one more)\b/.test(t)) return {actions:[{type:'section',do:'length',section:m[1],bars:+bars}]}; /* "make an 8-bar intro" when there is one */
    if(!arr&&PROJ.tracks.length&&!/silence|gap/.test(m[1])) return {actions:[{type:'arrange',template:'custom',sections:loopPlus(m[1],bars?+bars:undefined)}]};
    return needArr({actions:[{type:'section',do:'add',name:m[1],after:after||undefined,before:before||undefined,bars:bars?+bars:undefined}]}); }
  /* exact length: "make the drop 16 bars", "16 bar break" (in a song with a layout), "intro ko 8 bar karo" */
  if((m=t.match(new RegExp(`\\b(?:make|set|change|turn) (?:the )?${ORD}(${SEC})s?(?: (\\d))? (?:to |into )?(\\d{1,2}) bar\\b`)))) return needArr({actions:[{type:'section',do:'length',section:ref(m.slice(1)),bars:+m[4]}]});
  if((m=t.match(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? (?:to |ko |should be |is |at )?(\\d{1,2}) bar\\b`)))||(arr&&(m=t.match(new RegExp(`\\b(\\d{1,2}) bar ${ORD}(${SEC})\\b`))))){
    if(m.length===5) return needArr({actions:[{type:'section',do:'length',section:ref(m.slice(1)),bars:+m[4]}]});
    return {actions:[{type:'section',do:'length',section:ref([m[2],m[3]]),bars:+m[1]}]}; }
  /* remove / duplicate / move / rename */
  if((m=t.match(new RegExp(`\\b(?:remove|delete|cut out|cut|get rid of|lose|drop|scrap|hata do|hatao) (?:the )?${ORD}(${SEC})s?(?: (\\d))?\\b`)))||(m=t.match(new RegExp(`\\b${ORD}(${SEC})s?(?: (\\d))? (?:hata do|hatao|nikal do)\\b`)))) return needArr({actions:[{type:'section',do:'remove',section:ref(m.slice(1))}]});
  if((m=t.match(new RegExp(`\\b(?:duplicate|copy|repeat|clone) (?:the )?${ORD}(${SEC})s?(?: (\\d))?\\b`)))) return needArr({actions:[{type:'section',do:'duplicate',section:ref(m.slice(1))}]});
  if((m=t.match(new RegExp(`\\bmove (?:the )?${ORD}(${SEC})s?(?: (\\d))? (?:to )?(after|before) (?:the )?${ORD}(${SEC})s?(?: (\\d))?\\b`)))) return needArr({actions:[{type:'section',do:'move',section:ref(m.slice(1,4)),[m[4]]:ref(m.slice(5,8))}]});
  if((m=raw.match(/\brename (?:the )?(.+?) (?:to|as) ["“]?([^"”]+?)["”]?\s*$/i))&&findSec(m[1])) return needArr({actions:[{type:'section',do:'rename',section:m[1],name:m[2]}]});
  return null; }
/* a tempo said without "bpm": "house beat at 120", "a techno groove at 135 with claps", "make it 128" (60-200 only; never "at bar 3",
   "at 50%", "at 8 bars", "swing at 60") */
function tempoAt(t,genre){ let m=t.match(/\b(?:at|@)\s*(\d{2,3}(?:\.\d)?)\b(?!\s*(?:%|percent|bars?|beats?|db|hz|k\b|khz|seconds?|secs?|minutes?|mins?|times|x\b|notes?|swing|th\b))/);
  if(m&&!/\b(swing|shuffle|bar|bars|volume|reverb|delay|percent)\s+(to |at |of )?(\d{2,3})/.test(t.slice(0,m.index+m[0].length).slice(-24))&&(genre||/\b(beat|beats|drums?|groove|track|song|tune|loop|rhythm|tempo|speed)\b/.test(t))&&+m[1]>=60&&+m[1]<=200) return m;
  m=t.match(/^\s*(?:(?:please|now|ok|okay|can you|could you)\s+)*(?:make|set|put|take|bring) (?:it|the song|the track|everything|this) (?:to |at |up to |down to )?(\d{2,3})\s*(?:please)?\s*$/);
  return m&&+m[1]>=60&&+m[1]<=200?m:null; }
/* the track-effect key an effect word lands on (same mapping as ACT.track_fx) */
function fxKey(w){ w=String(w||''); return /rev|room|hall|space/.test(w)?'rev':/delay|echo/.test(w)?'dly':/side|pump|duck/.test(w)?'duck':/low ?cut/.test(w)?'hp':/high ?cut/.test(w)?'lp':/drive|satur|distort/.test(w)?'drive':/comp/.test(w)?'comp':/wid|stereo/.test(w)?'width':null; }
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
  /* Hinglish: "voice note ko bassline bana do", "is recording se chords banao", "meri recording ko melody mein badlo" */
  if((m=s.match(new RegExp('^(?:(?:please|ok|okay|hey|keys|yaar|bhai|zara|ab|abhi) )*((?:is|iss|meri|mera|mere|apni|apna|ye|yeh|woh|wo|us|uss) )?(.+?) (?:ko|se|say|ka|ki|ke|sey) (?:ek |a |an |the )?(?:[a-z]+ )?('+AUD_TARGET+')(?: (?:mein|me|main|men|mai))? (?:bana|banao|banado|banade|banaa|banaao|bana do|bana de|bana dena|badlo|badal|badal do|badaldo|convert|kar|karo|kardo|kar do)\\b')))) C.push([m[2],m[3]]);
  const nm=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(), aud=PROJ.tracks.filter(y=>y.kind==='audio'), newest=aud[aud.length-1];
  const hum=ASSIST.lastHum?PROJ.tracks.findIndex(y=>y.id===ASSIST.lastHum):-1, humNewer=hum>PROJ.tracks.indexOf(newest);
  for(let [x,to] of C){
    x=nm(x.replace(/\b(please|for me|now|again)\b/g,' ')).replace(/^(?:(?:can|could|would) you |please )+/,'').replace(/^(the|my|this|that|our|your|a|is|iss|meri|mera|mere|apni|apna|ye|yeh|woh|wo|us|uss) /,'').trim();
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
/* level words need a level meaning: "turn/bring/push X up", "louder", "too loud", "bass up a bit". A bare up/down that describes a
   part's shape ("a bassline that goes down", "a melody going up") is never a fader move. Hinglish: "bahut loud hai", "awaaz kam karo",
   "thoda upar karo", "soft karo". */
const LEVEL_INT='(?: (?:a|bit|little|way|so|really|kind|of|kinda|very|super|pretty|quite|too|much|far|rather|slightly|bahut|thoda|zyada|jyada))*';
const LEVEL_PART='(?:bass ?lines?|bass|drums?|kicks?|snares?|claps?|hats|chords?|pads?|melody|lead|vocals?|voice|beat|keys|piano|volume|master|everything)';
const LEVEL_UP=new RegExp("\\b(louder|turn(?: [a-z']+){0,3} up|bring(?: [a-z']+){0,3} up|push(?: [a-z']+){0,3} up|crank(?: [a-z']+){0,3}( up)?|boost|raise|lift|more volume|too (quiet|soft|low|weak)|(is|are|sounds?|feels?|seems?|it'?s|they'?re)"+LEVEL_INT+" (quiet|soft|buried|lost|weak)|can'?t hear|cannot hear|hard to hear|hardly hear|barely hear|buried|more (kicks?|snares?|claps?|bass)(?! ?lines?)|"+LEVEL_PART+"(?: (?:a (?:bit|little|touch|tad|notch)|slightly|\\d+(?:\\.\\d)? ?db))? up|upar|oopar|badhao|badha do|barhao|(zyada|jyada|tez|loud|louder) (karo|kar do|kardo)|awaaz (badhao|zyada|tez|upar)|kam (hai|lag raha|lagta))\\b");
const LEVEL_DOWN=new RegExp("\\b(quieter|softer|less loud|turn(?: [a-z']+){0,3} down|bring(?: [a-z']+){0,3} down|pull(?: [a-z']+){0,3} (down|back)|back off|lower|reduce|tone down|too loud|too much|too hot|too strong|too big|overpowering|drowning|(is|are|sounds?|feels?|seems?|it'?s|they'?re)"+LEVEL_INT+" loud|"+LEVEL_PART+"(?: (?:a (?:bit|little|touch|tad|notch)|slightly|\\d+(?:\\.\\d)? ?db))? down|kam (karo|kar do|kardo|karna|kijiye)|ghatao|ghata do|neeche|niche|(soft|halka|dheema|dheemi|dheere) (karo|kar do|kardo)|(bahut|zyada|jyada|kaafi) (loud|tez)|loud hai|tez hai)\\b");
/* asking for a part ("write a melody that goes down", "i need a bassline that steps down", "sing the bass going up") is never a level change */
const LEVEL_CREATE=/\b(add|give me|make(?: me)? (?:a|an|some)|write|compose|create|generate|sing|hum|whistle|record|let me (?:do|try)|try (?:a|an|some)|play(?: me)? (?:a|an|some)|i (?:want|need) (?:a|an|some|another|new|to))\b(?: (?!(?:to|on|in|for|of|with)\b)[\w'-]+){0,3}? (bass ?lines?|bass|808|chords?|melod(?:y|ies)|drums?|beat|groove|pads?|leads?|hook|riff|pluck|piano|keys|strings|choir|arp)\b/;
const LEVEL_SHAPE=/\b(goes|going|go|went|walks?|walking|steps?|stepping|climbs?|climbing|rises?|rising|falls?|falling|moves?|moving|runs?|running|slides?|sliding|glides?|gliding|ascends?|ascending|descends?|descending|jumps?|jumping|travels?|heads?|heading)( [a-z]+){0,2} (up|down|higher|lower)\b/;
const LEVEL_EXPLICIT=/\b(louder|quieter|volume|db|decibels?|fader|too (loud|quiet|soft)|turn|awaaz)\b/;
const PUNCH=/\b(punch(y|ier|iest|iness)?|snappier|snappy|more snap|more knock|knockier|hits? harder|hit hard|more thump|thumpier|more impact)\b/;
function levelFix(t){
  if(LEVEL_NOT.test(t)||LEVEL_CREATE.test(t)||LEVEL_SHAPE.test(t)&&!LEVEL_EXPLICIT.test(t)) return null;
  const punch=PUNCH.test(t), up=!punch&&LEVEL_UP.test(t), down=!punch&&!/\bdown ?beat\b/.test(t)&&LEVEL_DOWN.test(t);
  if(!punch&&up===down) return null;
  const dv=DRUM_VOICE.find(([k,re])=>re.test(t)); let role=dv?'drums':(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  const small=/\b(a (little|bit|touch|tad|notch|hair)( bit)?|slightly|just a bit|tiny bit|bit|little|somewhat|thoda|thodi|thora)\b/.test(t), big=/\b(a lot|lots|way|much|loads|really|heaps|so)\b/.test(t);
  const dbm=t.match(/(\d+(?:\.\d)?) ?(?:db|decibels?)\b/), n=dbm?Math.min(12,+dbm[1]):small?3:big?8:5, sign=up?1:-1;
  const master=!role&&!punch&&(/\b(louder|quieter|softer|too loud|too quiet|(turn|bring) (it|everything|the (whole )?(song|track|mix|master|volume|thing)|the master|the volume|master|volume) (up|down)|(turn|bring) (up|down) (the )?(volume|master|song|mix|everything)|volume (up|down))\b/.test(t)||/\b(awaaz|aawaz|awaz|volume|gaana|gana)\b/.test(t));
  if(!role&&!punch&&!master) return null;
  /* the whole song: every part's fader moves by the same dB (part of the song, so Undo puts it back exactly); going up stops when the loudest part reaches full */
  if(master){ if(!PROJ.tracks.length) return {actions:[],reply:'There’s nothing in the song yet. Say “make a house beat” to start.'};
    const got=songDbStep(sign*n);
    if(Math.abs(got)<0.05) return {actions:[],reply:up?'The loudest part is already at full volume, so I can’t raise the whole song without changing the balance. Turn your speakers up, or turn one part down to make room.':'The song is already silent.'};
    return {actions:[{type:'mix',track:'all',db:sign*n}],reply:`Turned the whole song ${up?'up':'down'} ${dbTxt(got)} dB${up&&Math.abs(got)<n-0.05?' (the loudest part is now at full volume)':''}, same balance.`}; }
  if(punch&&!role) role='drums';
  const list=PROJ.tracks.filter(x=>x.role===role), part=dv?dv[3]:(TONE_PART[role]||'the '+role), Part=part[0].toUpperCase()+part.slice(1);
  if(!list.length) return {actions:[],reply:role==='voice'?'There’s no vocal yet. Say “record a voice note” to add one.':role==='drums'||role==='chords'?`There are no ${role} yet. Want me to add some?`:`There’s no ${part.replace(/^the /,'')} yet. Want me to add one?`};
  const A=[], EQF={low:'lo',mid:'mid',high:'hi'}, eqStep=(T,b,d)=>{ const v0=Math.round(+T[EQF[b]]||0); return clamp(v0+d,-EQ_DB,EQ_DB)-v0; };
  /* punch: compressor +20 up to 90%, and +2 dB low end (mids for the snare) up to +6 dB at most */
  if(punch){ const c=Math.round(((list[0].fx&&list[0].fx.comp)||0)*100), band=role!=='drums'?null:dv&&dv[0]==='snare'?'mid':dv&&dv[0]==='hats'?null:'low';
    const bd=band?Math.max(0,Math.min(2,6-Math.round(+list[0][EQF[band]]||0))):0;
    list.forEach(T=>{ if(c<90) A.push({type:'track_fx',track:T.id,effect:'compressor',change:20}); if(bd) A.push({type:'mix',track:T.id,eq:{[band]:bd}}); });
    if(!A.length) return {actions:[],reply:`${Part} is already as punchy as I’d push it. Try “${dv?dv[0]+' louder':part.replace(/^the /,'')+' louder'}”.`};
    return {actions:A,reply:`Punchier ${part.replace(/^the /,'')}: ${c<90?`compressor on ${role==='drums'?'the drums':part} up to ${Math.min(100,c+20)}%`:''}${c<90&&bd?' and ':''}${bd?`${bd} dB more ${band==='low'?'low end':'mids'}`:''}, same ${role==='drums'?'pattern':'notes'}.`}; }
  if(dv){ const want=sign*(small?2:big?5:3), d=eqStep(list[0],dv[2],want), bandW=dv[2]==='low'?'low end':dv[2]==='mid'?'mids':'highs';
    if(!d) return {actions:[],reply:`The drums’ ${bandW} are already as ${up?'high':'low'} as they go (${up?'+':'-'}${EQ_DB} dB). Try “drums ${up?'louder':'quieter'}”.`};
    list.forEach(T=>A.push({type:'mix',track:T.id,eq:{[dv[2]]:d}}));
    return {actions:A,reply:`${up?'Brought up':'Softened'} ${part}: ${Math.abs(d)} dB ${up?'more':'less'} ${bandW} on the drums, same pattern.`}; }
  if(up&&list.every(T=>T.vol>=0.999)) return {actions:[],reply:`${Part} is already at full volume. Say “turn the ${list.some(x=>x.role!=='drums')&&PROJ.tracks.some(x=>x.role==='drums'&&x!==list[0])?'drums':'others'} down a bit” to make room for it.`};
  list.forEach(T=>A.push({type:'mix',track:T.id,db:sign*n}));
  const v0=list[0].vol, got=Math.abs(faderDb(v0,sign*n));
  return {actions:A,reply:`${up?'Brought':'Turned'} ${part} ${up?'up':'down'} ${dbTxt(got)} dB${got<n-0.05?' (that’s full volume)':''}, same ${role==='drums'?'pattern':'notes'}.`}; }
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
  else if(/\b(warm|warmer|warmth|less cold|too cold)\b/.test(t)) kind='warm';
  else if(/\b(harsh|shrill|piercing|sibilant|too bright|too sharp|too much top)\b/.test(t)) kind='harsh';
  else if(/\b(dull|muffled|lifeless|too dark|brighter|brighten(?: (?:it|them|that))?(?: up)?|(?:more|some|add) (?:air|sparkle|shine|top end))\b/.test(t)) kind='dull';
  if(!kind) return null;
  /* "still muddy" / "still harsh" with no part named carries on with the part fixed last */
  let role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0]; const last=ASSIST.lastTone;
  if(!role&&/\b(still|even more|further|again)\b/.test(t)&&last&&last.role!=='mix') role=last.role;
  const A=[], hz=x=>x>=1000?(x/1000).toFixed(1)+' kHz':x+' Hz';
  const eq=(T,band,d)=>{ const f={low:'lo',mid:'mid',high:'hi'}[band]; A.push({type:'mix',track:T.id,[band]:clamp(Math.round((T[f]||0)+d),-15,15)}); };
  /* a melody's low cut stays under its lowest note, so the cut never thins the tune itself (QA, 22 Nov bug 8: 308 Hz on a melody down to C3) */
  const floorHz=T=>{ if(T.role!=='melody'||T.kind!=='notes'||!(T.events||[]).length) return Infinity; const lo=Math.min(...T.events.map(e=>+e.n).filter(isFinite)); return isFinite(lo)?Math.round(440*Math.pow(2,(lo-69)/12)*0.85):Infinity; };
  /* a melody cut that already sits above its lowest note (220 Hz on a tune down to C3 at 131 Hz) comes down under it, as the reply says (AI-14 fix 5) */
  const cut=T=>{ const cur=(T.fx&&T.fx.hp)||20, [mn,st,mx]=TONE_HP[T.role]||[120,1.4,400], fl=floorHz(T), want=Math.min(mx,Math.max(mn,st<2?Math.round(cur*st):cur+st));
    if(cur>fl){ A.push({type:'track_fx',track:T.id,effect:'low cut',amount:fl}); lowered.add(T); return fl; }
    const v=Math.min(want,fl); if(v>cur){ A.push({type:'track_fx',track:T.id,effect:'low cut',amount:v}); if(fl<want) keptLow.add(T); return v; }
    if(fl<want) keptLow.add(T); return cur; }, keptLow=new Set(), lowered=new Set();
  const cutSay=(T,v)=>lowered.has(T)?`${T.name} (low cut down to ${hz(v)}, under its lowest note)`:keptLow.has(T)?`${T.name} (low cut ${hz(v)}, under its lowest note)`:`${T.name} (${hz(v)})`;
  const more=kind==='warm'?' Say “warmer” again to go further.':` Say “still ${{mud:'muddy',box:'boxy',harsh:'harsh',dull:'dull',thin:'thin'}[kind]}” to go further.`;
  if(role){
    const list=PROJ.tracks.filter(x=>x.role===role), part=TONE_PART[role]||role;
    if(!list.length) return {actions:[],reply:role==='drums'||role==='chords'?`There are no ${role} yet to fix. Want me to add some?`:`There's no ${part.replace(/^the /,'')} yet to fix. Want me to add one?`};
    let say='';
    list.forEach((T,i)=>{ if(kind==='mud'){ const n0=A.length, v=cut(T), fl=T.role==='bass'||T.role==='drums'?-9:-12, lo=T.lo||0, d=Math.max(-3,fl-lo); if(d<0) eq(T,'low',d);
        if(!i) say=A.length===n0?`${part[0].toUpperCase()+part.slice(1)} is already cleaned as far as I’d go (low cut ${hz(v)}${keptLow.has(T)?', under its lowest note':''}, low EQ ${lo} dB). Try a softer sound or turn it down a little.`:`Cleaned up ${part}: low cut ${lowered.has(T)?'down':'up'} to ${hz(v)}${lowered.has(T)||keptLow.has(T)?' (under its lowest note)':''}${d<0?` and ${-d} dB less low boom`:''}, same notes.`; }
      else if(kind==='box'){ eq(T,'mid',-3); say=`Took the boxiness out of ${part}: 3 dB less mids around 1 kHz.`; }
      else if(kind==='warm'){ const lo=clamp(Math.round((T.lo||0)+2),-15,15), hi=clamp(Math.round((T.hi||0)-3),-15,15); A.push({type:'mix',track:T.id,low:lo,high:hi}); say=`Warmer ${part.replace(/^the /,'')}: 3 dB less highs and 2 dB more low end, same notes.`; }
      else if(kind==='harsh'){ eq(T,'high',-3); say=`Softened ${part}: 3 dB less highs.`; }
      else if(kind==='dull'){ eq(T,'high',3); const lp=T.fx&&T.fx.lp; if(lp&&lp<16000){ const v=Math.min(20000,Math.round(lp*1.5)); A.push({type:'track_fx',track:T.id,effect:'high cut',amount:v}); if(!i) say=`Brightened ${part}: 3 dB more highs and the high cut opened to ${hz(v)}.`; } else if(!i) say=`Brightened ${part}: 3 dB more highs.`; }
      else { eq(T,'low',3); say=`Fattened ${part}: 3 dB more low end.`; } });
    ASSIST.lastTone={role,kind}; return {actions:A,reply:say+(A.length?more:'')};
  }
  /* the whole mix */
  const all=PROJ.tracks; ASSIST.lastTone={role:'mix',kind};
  if(!all.length) return {actions:[],reply:'There’s nothing in the song to mix yet. Start with drums or name an artist.'};
  if(kind==='mud'){
    const up=all.filter(x=>x.role!=='bass'&&x.role!=='drums'&&!x.mute); /* a muted part isn't heard, so it isn't muddying anything (QA, 22 Nov bug 8) */
    if(!up.length&&all.some(x=>x.mute&&x.role!=='bass'&&x.role!=='drums')) return {actions:[],reply:'Everything above the bass that plays is already clean, and the muted parts aren’t heard. Tell me which part sounds muddy: “the bass is muddy” or “the kick is boomy”.'};
    if(!up.length) return {actions:[],reply:!all.some(x=>x.role==='bass')?'So far it’s just the drums, and their low end is the groove. Say “the kick is boomy” if it’s the kick.':'So far it’s just drums and bass, and their low end is the groove. Tell me which one: “the bass is muddy” or “the kick is boomy”.'};
    const done=up.map(T=>{ const v=cut(T), d=Math.max(-3,-12-(T.lo||0)); if(d<0) eq(T,'low',d); return cutSay(T,v); });
    return {actions:A,reply:`Cleaned up the mix: ${lowered.size?"low cuts set":"higher low cuts"} and 3 dB less low end on ${done.length>1?done.slice(0,-1).join(', ')+' and '+done[done.length-1]:done[0]}; bass and kick untouched.`+more};
  }
  if(kind==='warm'){ all.forEach(T=>eq(T,'high',-2)); return {actions:A,reply:'Warmed up the mix: 2 dB less highs on every part.'+more}; }
  if(kind==='box'){ all.filter(x=>x.role!=='drums').forEach(T=>eq(T,'mid',-2)); return {actions:A,reply:'Took the boxiness out of the mix: 2 dB less mids around 1 kHz on every part but the drums.'+more}; }
  if(kind==='harsh'){ all.forEach(T=>eq(T,'high',-2)); return {actions:A,reply:'Softened the top of the mix: 2 dB less highs on every part.'+more}; }
  if(kind==='dull'){ all.forEach(T=>eq(T,'high',2)); return {actions:A,reply:'Brightened the mix: 2 dB more highs on every part.'+more}; }
  const low=all.filter(x=>x.role==='bass'||x.role==='drums'); (low.length?low:all).forEach(T=>eq(T,'low',2));
  const hasD=low.some(x=>x.role==='drums'), hasB=low.some(x=>x.role==='bass');
  return {actions:A,reply:`Fattened the mix: 2 dB more low end on ${hasD&&hasB?'the drums and bass':hasD?'the drums':hasB?'the bass':'every part'}.`+more};
}
/* ---- two requests in one sentence: "mute the drums and solo the bass", "set the tempo to 128 and add a shaker",
   "more reverb on the chords and less on the melody". Split on "and" / "," / "then" only when the next half is a command of
   its own (it starts with a verb, or it is a level line like "the bass quieter"); a half that only names another part
   ("and the bass", "and less on the melody") repeats the previous command for that part. Everything else stays one request
   ("drums with hats and claps", "drum and bass"). All halves run as ONE batch, so one Undo takes the whole sentence back. ---- */
const ASK_SEP=/(\s*,\s*(?:and then\s+|and\s+|then\s+)?|\s*;\s*|\s+and then\s+|\s+then\s+|\s+and\s+|\s+also\s+|\s+plus\s+)/i;
const ASK_FILL=/^(?:(?:please|pls|now|then|also|and|just|ok|okay|hey|so|can you|could you|would you|will you|lets|let's|keys)\s+)*/;
const ASK_HEAD=/^(make|add|put|give|set|change|switch|swap|use|turn|bring|push|pull|mute|unmute|solo|unsolo|remove|delete|drop|take|cut|boost|raise|lower|reduce|quanti[sz]e|tighten|snap|play|stop|pause|start|record|sing|hum|whistle|let me|export|download|save|undo|redo|transpose|shift|speed|slow|double|halve|clear|reset|write|create|generate|build|layer|try|go|straighten|fix|clean|tidy|render|rename|kill|lose|pan|widen|brighten|darken|open|close|show|loop|arrange|new|start over)\b/;
const ASK_FXW=/\b(reverb|delay|echo|sidechain|side chain|compress(?:ion|or)?|drive|saturation|distortion|width|low ?cut|high ?cut)\b/;
const ASK_DIR=/\b(more|less|louder|quieter|softer|up|down|higher|lower)\b/;
const ASK_MIXLIKE=/\b(reverb|delay|echo|sidechain|side chain|compress\w*|drive|saturation|distortion|width|wider|stereo|low ?cut|high ?cut|mute|unmute|solo|unsolo|louder|quieter|softer|turn|bring|push|pull|quanti[sz]e|tighten|remove|delete|volume|lows|mids|highs|low end|eq)\b/;
function askRole(t){ for(const [k,re] of ROLE_WORDS){ const m=t.match(re); if(m) return {k,m:m[0]}; } return null; }
function askAlone(seg){ const t=askText(seg), h=t.trim().replace(ASK_FILL,'');
  if(ASK_HEAD.test(h)) return true;
  const role=askRole(t)||(DRUM_VOICE.some(([k,re])=>re.test(t))?{k:'drums'}:null);
  if(role&&(LEVEL_UP.test(t)||LEVEL_DOWN.test(t)||PUNCH.test(t))) return true; /* "the bass quieter", "the chords up a bit" */
  if(ASK_FXW.test(t)&&/\b(more|less|some|no|add)\b/.test(t)&&role) return true;    /* "more delay on the lead" */
  return false; }
/* "and less on the melody" after "more reverb on the chords" → "less reverb on the melody"; "and the bass" after "mute the drums" → "mute the bass" */
const ASK_GRID=/\b(?:to |at |on )?(?:the )?(?:1\s*\/\s*(?:1|2|4|8|16|32|64)(?:th|nd|st|t)?(?: notes?)?(?: triplets?)?|(?:16th|8th|32nd|32th|quarter|half)(?: notes?)?(?: triplets?)?|quarters|triplets?)(?= |$)/;
function askCarry(prev,seg){ const s=askText(seg), p=askText(prev); if(!ASK_MIXLIKE.test(p)||MUTE_EXCEPT.test(p)) return null; /* "mute everything but the drums and the bass" is one request */
  if(/\b(add|make|give|write|create|new|another|sing|record)\b/.test(s)) return null;
  const sr=askRole(s), pr=askRole(p); if(!sr||!pr) return null;
  /* "quantize the bass to 1/8 and the chords to 1/4": the second half keeps its own grid */
  const qz=QUANT.test(p), sg=qz?s.match(ASK_GRID):null;
  const rest=(sg?s.replace(sg[0],' '):s).replace(sr.m,' ').replace(/\b(the|my|on|to|for|in|of|it|a|bit|little|too|as well|please|one|ones)\b/g,' ').replace(ASK_DIR,' ').trim(); if(rest) return null; /* "the bass sounds great": not a command */
  let out=p.replace(pr.m,sr.m); if(sg){ const pg=out.match(ASK_GRID); out=pg?out.replace(pg[0],' '+sg[0].trim().replace(/^(?:to |at |on )?/,'to ')):out+' to '+sg[0].trim().replace(/^(?:to |at |on )/,''); }
  const d=qz?null:s.match(ASK_DIR);
  if(d){ const pd=out.match(ASK_DIR); out=pd?out.replace(pd[0],d[0]):out+' '+d[0]; }
  const sm=s.match(/\b(a (?:little |tiny )?bit|a little|slightly|a lot)\b/); if(sm&&!out.includes(sm[0])) out+=' '+sm[0];
  return out.trim(); }
function splitAsks(raw){
  const bits=String(raw||'').split(ASK_SEP); if(bits.length<3) return null;
  const out=[{text:bits[0],alone:askAlone(bits[0])}];
  for(let i=2;i<bits.length;i+=2){ const seg=bits[i], last=out[out.length-1]; if(!seg.trim()) continue;
    if(askAlone(seg)) { out.push({text:seg,alone:true,sep:bits[i-1]}); continue; }
    const c=askCarry(last.text,seg); if(c){
      /* "quantize the drums and the bass to 1/8": the grid said at the end is for both */
      const lt=askText(last.text), cg=c.match(ASK_GRID); if(QUANT.test(lt)&&!lt.match(ASK_GRID)&&cg) last.text+=' '+cg[0].trim().replace(/^(?:to |at |on )?/,'to ');
      out.push({text:c,alone:true,said:seg,sep:bits[i-1]}); continue; }
    last.text+=bits[i-1]+seg; }
  /* a lead-in without a verb ("hey keys, mute the drums", "drums like Black Coffee, and 120 bpm") belongs to what follows */
  if(out.length>1&&!out[0].alone){ if(out[1].said) out[0].alone=true; else { out[1].text=out[0].text+out[1].sep+out[1].text; out.shift(); } }
  return out.length>1?out:null; }
const ROLE_SAY={drums:'drums',bass:'bass',chords:'chords',melody:'melody',voice:'vocal'};
/* the part a half is about: named in its words, else the part its actions touched */
function askPartOf(text,L){ const r=(ROLE_WORDS.find(([k,re])=>re.test(askText(text)))||[])[0]; if(r) return r;
  for(const a of (L&&L.actions)||[]){ const m=String(a.type).match(/^add_(drums|bass|chords|melody)$/); if(m) return m[1]; if(a.track){ const T=findTrack(a.track); if(T&&T.role&&ROLE_SAY[T.role]) return T.role; } } return null; }
/* a half with no part named takes the part of the half before it: "add a bassline and give me another one" (another bassline),
   "mute the drums then unmute them" (the drums) (QA, 16 Nov) */
function askInherit(text,role){ if(!role) return text; const t=askText(text);
  if((ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0]) return text;
  if(/\b(another|different|variation|regenerate|one more|new one|try again|switch it up|change it up)\b/.test(t)&&!/\b(song|project|tempo|bpm|key)\b/.test(t)) return text+' '+ROLE_SAY[role];
  if(/\b(un)?(mute|solo)\b|\b(louder|quieter|softer|turn (it|them) (up|down)|bring (it|them) (up|down)|quanti[sz]e)\b/.test(t)&&/\b(it|them|those|that|one)\b/.test(t)) return text.replace(/\b(it|them|those|that)\b/i,'the '+ROLE_SAY[role]);
  return text; }
/* while a later half is read, the song looks as the earlier halves leave it (mute, solo, fader), so "mute the drums then unmute them"
   unmutes them and its reply is true; the real song is put back before anything runs */
function askShadow(acts){ const saved=PROJ.tracks.map(t=>[t,t.mute,t.solo,t.vol]);
  for(const a of acts){ if(a.type!=='mix') continue; const ref=String(a.track||'').toLowerCase();
    if(/^(all|song|everything|mix)$/.test(ref)){ if(a.db!=null){ const got=songDbStep(+a.db), k=Math.pow(10,got/40); PROJ.tracks.forEach(t=>{ if(t.vol>0) t.vol=clamp(t.vol*k,0,1); }); } continue; }
    const T=findTrack(a.track); if(!T||!PROJ.tracks.includes(T)) continue;
    if(a.mute!=null) T.mute=!!a.mute; if(a.solo!=null) T.solo=!!a.solo;
    if(a.db!=null&&isFinite(+a.db)) T.vol=clamp(T.vol*Math.pow(10,clamp(+a.db,-24,12)/40),0,1); if(a.change!=null&&isFinite(+a.change)) T.vol=clamp(T.vol+(+a.change)/100,0,1); }
  return ()=>saved.forEach(([t,m,so,v])=>{ t.mute=m; t.solo=so; t.vol=v; }); }
function localBrain(raw){
  /* a typed "Keys, make an 8-bar intro…": the assistant's name isn't the part "keys" (speech already strips it) */
  { const nm=String((typeof ASSIST!=='undefined'&&ASSIST.name)||'Keys').trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); if(nm) raw=String(raw||'').replace(new RegExp('^\\s*(?:(?:hey|hi|ok|okay|yo)\\s+)?'+nm+'\\s*[,:!–—-]\\s*|^\\s*(?:hey|hi|ok|okay|yo)\\s+'+nm+'\\b\\s*|^\\s*'+nm+'\\s+(?=(?:make|add|turn|arrange|give|let|put|take|drop|loop|play|remove|bring|can|could|please|stretch|move|rename|duplicate)\\b)','i'),''); }
  /* "the drums are fine, just change the chords": the praised or protected part is left out of the words (protectSaid, AI-9 fix) */
  { const P=typeof protectSaid==='function'?protectSaid(raw):null; if(P&&P.kept.size){ if(P.song) return {actions:[],reply:'Glad you like it. I kept everything as it is. What should we do next?'}; if(!P.rest.trim()) return {actions:[],reply:'OK. '+keptTxt(P.kept)+' What should I change next?'}; } const r2=P&&(/\b(mute|unmute|solo|unsolo)\b/i.test(raw)?P.rest:P.restCut); if(r2&&r2!==raw) raw=r2;
    /* Hinglish "sab kuch thoda kam karo" / "sab thoda loud karo": the whole song quieter / louder (the kept parts stay, onePart) */
    raw=raw.replace(/^\s*(?:sab|sab kuch|sabhi|saare|sare|baaki sab|baki sab)\s+(?:ko\s+)?(?:thoda\s+|thodi\s+|bit\s+)?(?:kam|dheere|halka|soft|quiet|neeche)\s*(?:karo|kar do|kardo)?\s*$/i,'make everything quieter').replace(/^\s*(?:sab|sab kuch|sabhi|saare|sare|baaki sab|baki sab)\s+(?:ko\s+)?(?:thoda\s+|thodi\s+|bit\s+)?(?:loud|zyada|tez|upar)\s*(?:karo|kar do|kardo)?\s*$/i,'make everything louder');
    /* "redo it all apart from the bass", "new everything except the chords": a new take of every other part (QA, 22 Nov fix 7) */
    if(P&&P.kept.size&&/^(?:please\s+)?(?:(?:redo|new|change|regenerate|refresh|remake|rework|switch up|swap out|give me new|make new)\s+(?:it all|everything|all of it|every part|all the parts|all|the rest|everything else|the whole (?:thing|song|track|loop))|make\s+(?:it all|everything|all of it)\s+(?:new|fresh|different)|(?:sab|sab kuch|sabhi|saare|sare|baaki sab|baki sab)\s+(?:naya|nayi|naye|alag|badlo|badal do|change)(?:\s+(?:karo|kar do|kardo|do))?)(?:\s+(?:please|else|again|yaar))?$/.test(String(P.restCut||'').toLowerCase().trim())){
      const RS=[...new Set(PROJ.tracks.filter(t=>t.kind==='notes'&&t.gen&&!P.kept.has(t.role)).map(t=>t.role))]; if(RS.length) return {actions:RS.map(r=>({type:'vary',track:r}))}; } }
  raw=focusText(raw);
  /* a bare part name with no request ("thats the melody", "the bass"): no second copy of a part the song already has (QA, 22 Nov fix 5) */
  { const t=' '+askText(raw)+' ', r=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0], left=t.replace(/[,.!?;]+/g,' ').replace(/\b(thats|that'?s|that|this|is|it|its|the|my|a|an|yeah|yes|ok|okay|so|oh|wow|nice|cool|bro|yaar|now|one|hats?|drums?|beat|kick|groove|percussion|bass ?line|bass|chords?|pads?|harmony|progression|melody|lead|hook|riff|tune)\b/g,' ').trim();
    if(r&&r!=='voice'&&!left&&/\b(thats|that'?s|this is|that is|its|it'?s)\b/.test(t)&&PROJ.tracks.some(x=>x.role===r)) return {actions:[],reply:`The ${({drums:'drums',bass:'bassline',chords:'chords',melody:'melody'})[r]} ${r==='drums'||r==='chords'?'are':'is'} already in the song. Say “another ${({drums:'beat',bass:'bassline',chords:'set of chords',melody:'melody'})[r]}” to add one, or “change the ${({drums:'drums',bass:'bassline',chords:'chords',melody:'melody'})[r]}” for a new take.`}; }
  const segs=splitAsks(raw); if(!segs){ const L=brainOne(raw);
    /* "the drums and the bass make them quieter": the same level move on each part named (QA, 22 Nov fix 7) */
    { const t=' '+askText(raw)+' ', RS=ROLE_WORDS.filter(([k,re])=>re.test(t)&&k!=='voice').map(x=>x[0]), A=L.actions||[];
      if(RS.length>1&&/\b(them|both|dono|all of them)\b/.test(t)&&A.length===1&&A[0].type==='mix'&&A[0].db!=null){ const T0=findTrack(A[0].track), rest=RS.filter(r=>!T0||T0.role!==r).map(r=>partTrack(r)).filter(Boolean); if(rest.length) return {actions:A.concat(rest.map(T=>Object.assign({},A[0],{track:T.id})))}; } }
    return L; }
  const R=[];
  for(const g of segs){ let L; g.said=g.said||g.text;
    if(R.length){ const pr=R[R.length-1]; g.text=askInherit(g.text,askPartOf(pr.text,pr.L));
      /* "take the kick out of the intro and bring the bass in": the second half is about the same section (QA, 22 Nov bug 1) */
      { const ps=(pr.L.actions||[]).find(a=>a.type==='parts'&&a.section), gt=askText(g.text), r=(ROLE_WORDS.find(([k,re])=>re.test(gt))||[])[0];
        if(ps&&!/\b(intro|outro|drop|break|build|section|verse|chorus|bridge|song|track)\b/.test(gt.replace(/^\s*(?:(?:and|then|also|please|now)\s+)*drop\b/,' '))&&!/\b(a|an|some|new|another|second)\b/.test(gt)&&/\b(bring|take|put|add|drop|remove|kill|cut|keep|lose|pull|start|let|daal|dalo|daalo|hata|hatao|nikalo)\b/.test(gt)&&/\b(in|out|back|off|drop|remove|kill|cut|lose|start|daal|dalo|daalo|hata|hatao|nikalo)\b/.test(gt)&&(DRUM_VOICE.some(([k,re])=>re.test(gt))||r&&PROJ.tracks.some(x=>x.role===r))){
          const L2=brainOne(g.text+' in the '+String(ps.section).toLowerCase()); if((L2.actions||[]).some(a=>a.type==='parts')) g.text=g.text+' in the '+String(ps.section).toLowerCase(); } }
      const put=askShadow([].concat(...R.map(r=>r.L.actions))); try{ L=brainOne(g.text); } finally{ put(); } }
    else L=brainOne(g.text);
    /* "make a house beat and add a shaker": the shaker needs the beat first, so the two halves read as one request */
    if(!L.actions.length&&!L.reply&&R.length){ const pr=R[R.length-1], mt=pr.text+' and '+g.text, M=brainOne(mt); if(M.actions.length&&JSON.stringify(M.actions)!==JSON.stringify(pr.L.actions)){ R[R.length-1]={text:mt,L:M,said:pr.said}; continue; } }
    R.push({text:g.text,said:g.said||g.text,L}); }
  if(R.length===1) return R[0].L;
  /* a new song wipes what the rest would change: start it, and ask for the rest again */
  const np=R.findIndex(r=>r.L.actions.some(a=>a.type==='new_project'));
  if(np>=0) return {actions:[{type:'new_project'}],reply:`Started a new song. Your last one is saved. Now say “${R.filter((r,i)=>i!==np).map(r=>r.said.trim()).join(', then ')}” again and I’ll do it.`};
  const actions=[], tempoSaid=R.some(r=>r.L.actions.some(a=>a.type==='tempo'));
  /* "set the tempo to 128 and make a house beat": the genre half keeps the tempo the other half set */
  R.forEach((r,i)=>r.L.actions.forEach(a=>actions.push(Object.assign({},a,{seg:i},a.type==='style'&&tempoSaid?{keepTempo:true}:{}))));
  const custom=R.some(r=>r.L.reply), skipped=R.filter(r=>!r.L.actions.length&&!r.L.reply);
  if(!custom&&!skipped.length) return {actions,parts:R.length};
  /* the reply names each half: its own words, what it did, or that it was skipped */
  const reply=done=>{ const out=[], segs=done.segs||[];
    R.forEach((r,i)=>{ const mine=done.filter((x,j)=>segs[j]===i);
      if(r.L.reply) out.push(r.L.reply);
      else if(mine.length) out.push('Done: '+mine.join(', ')+'.');
      else out.push(`I couldn’t do “${r.said.trim()}” in Basic mode, so I left that part out.`); });
    return out.join(' '); };
  return {actions,reply,parts:R.length}; }
/* ---- unsolo / unmute: "unsolo the bass", "remove the solo", "clear all solos", "un-mute the drums", "unmute everything" ---- */
const UNSOLO=/\bunsolo(ed)?\b|\b(remove|clear|cancel|reset|kill|undo|lose|drop|turn off|switch off|take off|get rid of|no more|release)( the| all| all the| every| any| my| that)? solo(s|ed|ing)?\b|\bsolos? off\b|\b(stop|end) solo(ing)?\b|\btake (?:[a-z]+ ){1,3}(off|out of) solo\b|\bout of solo\b|\bno (more )?solo\b|\bsolo (hatao|hata do|hatado|band karo|band kar do|nikalo|off karo)\b/; /* Hinglish: "bass ka solo hatao" */
const UNMUTE=/\bunmute(d)?\b|\b(remove|clear|cancel|reset|undo|turn off|switch off|take off|get rid of|release)( the| all| all the| every| any| my| that)? mutes?\b|\bmutes? off\b|\btake (?:[a-z]+ ){1,3}off mute\b|\bmute (hatao|hata do|hatado|band karo|nikalo|off karo)\b|\bunmute (karo|kar do|kardo)\b/;
/* "mute everything but the drums", "mute all except the drums and bass", "mute the rest apart from the chords" */
const MUTE_EXCEPT=/\bmute (?:everything|every(?: other)? (?:track|part|thing)s?|all(?: the)?(?: other)?(?: tracks| parts| of it)?|the rest|the others|others)(?: else)?,? (?:but|except(?: for)?|apart from|other than|besides|save for|aside from|minus|leaving|leave|not) (.+)$/;
/* "bring the drums back", "bring back the bass", "bring everything back": a muted (or soloed-out) part plays again */
const BRING_BACK=/\bbring (?:back (?:in )?(the |my |all |every )?([a-z ]{2,24}?)|(the |my |all |every )?([a-z ]{2,24}?) back( in)?)\s*(?:please)?\s*$/;
function muteExceptFix(t){ const m=t.match(MUTE_EXCEPT); if(!m) return null;
  if(!PROJ.tracks.length) return {actions:[],reply:'There’s nothing in the song yet. Say “make a house beat” to start.'};
  const tail=' '+m[1]+' ', roles=ROLE_WORDS.filter(([k,re])=>re.test(tail)).map(([k])=>k), named=PROJ.tracks.filter(x=>x.name&&x.name.length>2&&tail.includes(' '+x.name.toLowerCase()+' '));
  const keep=PROJ.tracks.filter(x=>roles.includes(x.role)||named.includes(x)); if(!roles.length&&!named.length) return null;
  if(!keep.length) return {actions:[],reply:`There’s no ${roles.map(r=>(TONE_PART[r]||r).replace(/^the /,'')).join(' or ')} in the song yet, so I left the mix as it is.`};
  const A=[]; PROJ.tracks.forEach(x=>{ if(keep.includes(x)){ if(x.mute) A.push({type:'mix',track:x.id,mute:false}); } else if(!x.mute) A.push({type:'mix',track:x.id,mute:true}); });
  const words=roles.filter(r=>keep.some(x=>x.role===r)).map(r=>TONE_PART[r]||'the '+r).concat(named.filter(x=>!roles.includes(x.role)).map(x=>x.name)), many=words.length>1||/^the (drums|chords)$/.test(words[0]||'');
  const kept=words.length>1?words.slice(0,-1).join(', ')+' and '+words[words.length-1]:words[0], muted=PROJ.tracks.filter(x=>!keep.includes(x)).map(x=>x.name);
  if(!A.length) return {actions:[],reply:`Already done: only ${kept} ${many?'are':'is'} playing.`};
  return {actions:A,reply:muted.length?`Muted ${muted.length>1?muted.slice(0,-1).join(', ')+' and '+muted[muted.length-1]:muted[0]}, so only ${kept} ${many?'play':'plays'}. Say “unmute everything” to bring it all back.`:`Unmuted ${kept}.`}; }
function bringBackFix(t){ const m=t.match(BRING_BACK); if(!m) return null; if(/\b(previous|last|old|older|earlier|original|first|other|before|version)\b/.test(t)) return null; /* "bring back the first melody": an earlier version (revert) */ const what=' '+(m[2]||m[4]||'')+' ', all=/\b(all|every|everything|it all|the rest|others)\b/.test((m[1]||m[3]||'')+what);
  const role=all?null:(ROLE_WORDS.find(([k,re])=>re.test(what))||[])[0]; if(!all&&!role) return null;
  const pool=role?PROJ.tracks.filter(x=>x.role===role):PROJ.tracks; if(!pool.length) return null; /* nothing to bring back: "bring the drums back" makes them */
  const A=[], muted=pool.filter(x=>x.mute), soloOthers=PROJ.tracks.filter(x=>x.solo&&!pool.includes(x)), heard=pool.some(x=>x.solo);
  muted.forEach(x=>A.push({type:'mix',track:x.id,mute:false}));
  if(soloOthers.length&&!heard) soloOthers.forEach(x=>A.push({type:'mix',track:x.id,solo:false}));
  if(!A.length) return role?{actions:[],reply:`${(TONE_PART[role]||'the '+role).replace(/^./,c=>c.toUpperCase())} ${role==='drums'||role==='chords'?'are':'is'} already playing. Say “another ${role==='drums'?'beat':role}” for a new one.`}:{actions:[],reply:'Everything is already playing.'};
  const what2=role?(TONE_PART[role]||'the '+role):'everything', so=soloOthers.length&&!heard?`solo off on ${soloOthers.map(x=>x.name).join(', ')}`:'';
  return {actions:A,reply:`Brought back ${what2}${muted.length?` (unmuted${role?'':' '+muted.map(x=>x.name).join(', ')})`:''}${so?(muted.length?', and ':': ')+so+', so every part plays again':''}.`}; }
/* "bring the bass in" with no section named: the bass is already a part, so it is never made again (QA, 22 Nov bug 1).
   Muted, it is unmuted; in a song layout Keys says where it plays and asks which section; in a loop it already plays. */
const BRING_IN=/\bbring (?:the |my )(bass ?line|bass|chords?|pads?|melody|lead|hook|drums?|beat|kick|hats|claps?|snares?|vocals?|voice ?note|voice) in\b|\bbring in (?:the |my )(bass ?line|bass|chords?|pads?|melody|lead|hook|drums?|beat|kick|hats|claps?|snares?|vocals?|voice ?note|voice)\b(?! (?:with|on|for|that|which|playing))/;
function bringInFix(t){ const m=t.match(BRING_IN); if(!m||/\b(intro|outro|drop|break|build|section|verse|chorus|bridge|hook)\b/.test(t.replace(m[0],' '))) return null;
  const w=' '+(m[1]||m[2])+' ', role=(ROLE_WORDS.find(([k,re])=>re.test(w))||[])[0]||(/voice|vocal/.test(w)?'voice':null), list=role?PROJ.tracks.filter(x=>x.role===role):[]; if(!list.length) return null; /* no bass yet: "bring in the bass" makes one */
  const muted=list.filter(x=>x.mute), nm={drums:'drums',bass:'bassline',chords:'chords',melody:'melody',voice:'vocal'}[role]||role, are=role==='drums'||role==='chords'?'are':'is';
  if(muted.length) return {actions:muted.map(x=>({type:'mix',track:x.id,mute:false})),reply:`Brought the ${nm} back in (unmuted), same notes.`};
  if(songArranged&&songArranged()){ const S=songSections(), on=S.filter(s=>list.some(x=>s.parts[x.id]&&s.parts[x.id].on)).map(s=>s.name), off=S.filter(s=>!on.includes(s.name));
    const ex=(off.find(s=>s.kind==='intro')||off.find(s=>s.kind==='build')||off[0]||{}).name;
    return {actions:[],reply:off.length?`The ${nm} ${are} already in the song${on.length?`, playing in ${on.length>1?on.slice(0,-1).join(', ')+' and '+on[on.length-1]:on[0]}`:''}. Say which section, like “bring the ${role==='bass'?'bass':nm} in at the ${String(ex).toLowerCase()}”, and I’ll switch it on there.`:`The ${nm} already ${role==='drums'||role==='chords'?'play':'plays'} in every section.`}; }
  return {actions:[],reply:`The ${nm} ${are} already playing. Say “another ${role==='drums'?'beat':nm}” for a new one.`}; }
/* "mute the voice note", "turn off the recording", "mute sing" (a track's own name), "voice note ko mute karo": mute or unmute that
   track; never a new take (QA, 22 Nov bug 2). A voice note or recording is the newest audio track; a name said picks that track. */
const AUD_OFF=/\b(mute|silence)\b|\b(turn|switch|shut|cut)(?: [a-z0-9']+){0,4} off\b|\b(turn|switch|shut) off\b|\b(band|off|mute|bandh) (karo|kar do|kardo|kar)\b|\bband karo\b/;
const AUD_ON=/\bunmute(d)?\b|\b(turn|switch)(?: [a-z0-9']+){0,4} (back )?on\b|\b(turn|switch) (back )?on\b|\bbring (?:back (?:the |my )?(?:[a-z0-9]+ ){0,2}|(?:the |my )?(?:[a-z0-9]+ ){1,3}back\b)|\bunmute (karo|kar do|kardo)\b|\bon (karo|kar do|kardo)\b|\b(chalu|wapas) (karo|kar do|kardo|lao|laao)\b/;
function audioMuteFix(t){ const on=AUD_ON.test(t), off=!on&&AUD_OFF.test(t); if(!on&&!off) return null;
  if(/\b(record|recording a|new|another|again|sing|hum|whistle)\b/.test(t.replace(/\b(?:mute|unmute) sing\b/,' ').replace(/\b(?:the|my|that|this) recording\b/,' '))&&!/\b(?:the|my|that|this) (?:voice ?notes?|recordings?)\b/.test(t)) return null;
  const nm=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(), aud=PROJ.tracks.filter(x=>x.kind==='audio'), s=' '+nm(t)+' ';
  const named=PROJ.tracks.filter(x=>x.name&&nm(x.name).length>2&&!/^(drums|bass|bassline|chords|melody|lead|keys|pads?)( \d+)?$/i.test(x.name)&&s.includes(' '+nm(x.name)+' ')).sort((a,b)=>b.name.length-a.name.length);
  const noun=/\b(voice ?notes?|voice ?memos?|memos?|recordings?|audio( tracks?| clips?)?|clips?|samples?|vocals?|my voice)\b/.test(t);
  let T=named[0]||null;
  if(!T&&noun){ if(!aud.length) return /\bvocals?\b/.test(t)?null:{actions:[],reply:'There’s no voice note or recording in this song yet. Say “record a voice note” to add one.'}; T=on?([...aud].reverse().find(x=>x.mute)||aud[aud.length-1]):([...aud].reverse().find(x=>!x.mute)||aud[aud.length-1]); }
  if(!T) return null;
  if(on&&!T.mute) return {actions:[],reply:`${T.name} isn’t muted, so it already plays.`};
  if(off&&T.mute) return {actions:[],reply:`${T.name} is already muted. Say “unmute ${T.name}” to bring it back.`};
  return {actions:[{type:'mix',track:T.id,mute:!!off}],reply:off?`Muted ${T.name}. Say “unmute ${T.name}” to bring it back.`:`Unmuted ${T.name}, so it plays again.`}; }
function muteSoloFix(t){
  { const ex=muteExceptFix(t); if(ex) return ex; }
  { const am=audioMuteFix(t); if(am) return am; }
  /* "mute everything", "mute all the tracks": every part muted (QA, 16 Nov: not understood offline) */
  if(/^\s*(?:(?:please|ok|okay|now|can you|could you|just)\s+)*mute (?:everything|it all|all(?: the| of the)?(?: tracks| parts)?|all of it|every (?:track|part|thing)|the whole (?:song|mix|track|thing))(?: please| now| for a sec(?:ond)?)?\s*$/.test(t)){
    if(!PROJ.tracks.length) return {actions:[],reply:'There’s nothing in the song yet. Say “make a house beat” to start.'};
    const on=PROJ.tracks.filter(x=>!x.mute); return {actions:on.map(x=>({type:'mix',track:x.id,mute:true})),reply:on.length?'Muted everything. Say “unmute everything” to bring it all back.':'Everything is already muted. Say “unmute everything” to bring it back.'}; }
  const us=UNSOLO.test(t), um=UNMUTE.test(t); if(!us&&!um) return bringBackFix(t)||bringInFix(t);
  const all=/\b(all|everything|every (track|part|thing)|whole (song|mix))\b/.test(t), t2=t.replace(/\b(un)?(solo|mute)(s|d|ed|ing)?\b/g,' ');
  const role=all?null:(ROLE_WORDS.find(([k,re])=>re.test(t2))||[])[0], named=all||role?[]:PROJ.tracks.filter(x=>x.name&&x.name.length>2&&t2.includes(' '+x.name.toLowerCase()+' '));
  const pool=role?PROJ.tracks.filter(x=>x.role===role):named.length?named:PROJ.tracks, which=role?(TONE_PART[role]||'the '+role):named.length?named.map(x=>x.name).join(' and '):null;
  if(!PROJ.tracks.length) return {actions:[],reply:'There’s nothing in the song yet. Say “make a house beat” to start.'};
  if(role&&!pool.length) return {actions:[],reply:`There’s no ${which.replace(/^the /,'')} in the song yet.`};
  const A=[], said=[];
  if(us){ const on=pool.filter(x=>x.solo); on.forEach(x=>A.push({type:'mix',track:x.id,solo:false}));
    const left=PROJ.tracks.filter(x=>x.solo&&!on.includes(x));
    said.push(on.length?`Solo off on ${on.map(x=>x.name).join(', ')}${left.length?`; ${left.map(x=>x.name).join(', ')} still soloed`:', so every part plays again'}.`:which?`${which[0].toUpperCase()+which.slice(1)} ${role==='drums'||role==='chords'||named.length>1?'aren’t':'isn’t'} soloed.`:'Nothing is soloed.'); }
  if(um){ const on=pool.filter(x=>x.mute); on.forEach(x=>A.push({type:'mix',track:x.id,mute:false}));
    said.push(on.length?`Unmuted ${on.map(x=>x.name).join(', ')}.`:which?`${which[0].toUpperCase()+which.slice(1)} ${role==='drums'||role==='chords'||named.length>1?'aren’t':'isn’t'} muted.`:'Nothing is muted.'); }
  return {actions:A,reply:said.join(' ')}; }
/* ---- quantize: "quantize my melody to 1/8", "quantize it", "tighten up the timing", "snap the chords to the grid", "quantize to 16ths",
   "1/8 triplets". The named part, else the track open in the editor or selected, else the newest part you played or sang. ---- */
const QUANT=/\bquanti[sz](e|es|ed|ing|ation)\b|\b(snap|lock|put|move) (?:[a-z]+ ){0,3}(on|to) (the )?grid\b|\btighten (up )?(the |my )?(timing|rhythm|notes)\b|\btighten (it|this|that|them|everything|the notes) up\b|\b(fix|clean up|tidy up|tidy) (the |my )?(timing|rhythm)\b|\btiming (is |was |sounds |feels )?(off|sloppy|loose|messy|all over)\b|^\s*tighten (it )?up\s*$/;
function gridSaid(t){ let m, den=null, trip=/\btriplets?\b|\btrip\b/.test(t);
  if((m=t.match(/\b1\s*\/\s*(1|2|4|8|16|32|64)(th|nd|st|t)?\b/))){ den=+m[1]; if(m[2]==='t') trip=true; }
  else if(/\b(32nd|32th)\b/.test(t)) den=32; else if(/\b16th\b/.test(t)) den=16; else if(/\b8th\b/.test(t)) den=8; else if(/\b(quarters?|quarter notes?|4th notes?|crotchets?)\b/.test(t)) den=4; else if(/\bhalf notes?\b/.test(t)) den=2;
  else if((m=t.match(/\bto (4|8|16|32)\b/))) den=+m[1];
  if(!den&&trip) den=8; return den?`1/${den}${trip?'t':''}`:undefined; }
function quantizeFix(t){
  if(!QUANT.test(t)) return null;
  const notes=PROJ.tracks.filter(x=>x.kind!=='audio'), grid=gridSaid(t);
  if(!PROJ.tracks.length) return {actions:[],reply:'There are no notes to quantize yet. Play, sing or add a part first.'};
  const all=/\b(everything|all( the)? (tracks|parts|notes)|every (track|part)|whole song|all of it)\b/.test(t);
  /* a track named by its own name ("the played keys", "hummed melody"); plain role names (Melody, Chords) go by role, which prefers your own part */
  const role=all?null:(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0], named=PROJ.tracks.filter(x=>x.name&&x.name.length>2&&!/^(drums|bass|bassline|chords|melody|lead)( \d+)?$/i.test(x.name)&&t.includes(' '+x.name.toLowerCase()+' '));
  const open=typeof ED!=='undefined'&&ED.tid?PROJ.tracks.find(x=>x.id===ED.tid):null, one=typeof SEL!=='undefined'&&SEL.size===1?PROJ.tracks.find(x=>SEL.has(x.id)):null;
  let list;
  if(all) list=notes;
  else if(named.length) list=[named[named.length-1]];
  else if(role){ const of=PROJ.tracks.filter(x=>x.role===role); if(!of.length) return {actions:[],reply:`There’s no ${(TONE_PART[role]||role).replace(/^the /,'')} yet to quantize.`};
    const own=of.filter(x=>!x.gen&&x.kind!=='audio'); list=[[open,one].find(x=>x&&x.role===role)||own[own.length-1]||of[of.length-1]]; }
  else { const mine=notes.filter(x=>!x.gen); list=[open||one||mine[mine.length-1]||notes[notes.length-1]].filter(Boolean); }
  const aud=list.filter(x=>x.kind==='audio'); list=list.filter(x=>x.kind!=='audio');
  if(!list.length) return {actions:[],reply:aud.length?`${aud[0].name} is a recording, so it has no notes to quantize. Say “turn ${aud[0].name} into a melody” first.`:'There are no notes to quantize yet.'};
  const A=list.map(x=>({type:'quantize',track:x.id,grid}));
  return list.length>1?{actions:A,reply:`Quantized all ${list.length} note parts to ${grid?grid.replace(/t$/,' triplets'):'1/16'}${grid&&!/t$/.test(grid)?' notes':''}.`}:{actions:A}; }
