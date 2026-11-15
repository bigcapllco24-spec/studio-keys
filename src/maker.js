
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
/* ---------- SE-7c: a song's key and chords, fixing a bar's chord, matching a loop's key (and "yes" to Keys' offer) ---------- */
const YES_RE=/^\s*(yes|yeah|yea|yep|yup|sure|ok|okay|ok do it|do it|go ahead|go for it|please do|yes please|sounds good|let'?s do it|let'?s go|perfect|haan|haan ji|haanji|han|haa|ha|ji|ji haan|theek hai|thik hai|kar do|karo|chalo)\b[\s.!,]*(please|do it|go ahead|ji|karo|kar do|yes|sure)?[\s.!]*$/i;
const NO_RE=/^\s*(no|nope|nah|not now|leave it|don'?t|no thanks|nahi|nahin|na|mat karo|rehne do)\b[\s.!,]*(thanks|thank you|leave it|it'?s fine|ji)?[\s.!]*$/i;
const ORD={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8};
/* "what key / what chords / analyse this song" (English and Hinglish) */
const ANA_ASK=/\b(what|which|whats|what's|tell me|find|detect|kaunsi|kaun ?si|konsi|kon ?si)\b.*\b(key|scale|chords?|bpm|tempo)\b|\b(key|scale|chords?|bpm|tempo)\b.*\b(kya|kaunsi|kaun ?si|konsi|kon ?si)\b|\b(analy[sz]e|listen to|figure out|work out)\b.*\b(song|track|loop|this|it|clip|file|audio|chords?|key)\b/;
const SONG_WORD='(?:song|track|loop|clip|file|audio|recording|mp3|sample|gaane|gane|gaana)';
const TAKE_VERB=/\b(put|take|use|add|copy|grab|bring|steal|get|lift|give me|want|daal|daalo|dalo|daal do|laga|lagao|chahiye|same)\b/;
function wantsSongChords(t){ if(!/\bchords?\b/.test(t)) return false;
  if(new RegExp('\\b(?<!my |mere |mera |our )'+SONG_WORD+"\\s*('s|s|ke|ki|ka)?\\s+chords?\\b").test(t)) return true;
  if(new RegExp('\\bchords?\\b.*\\b(from|of|off|out of|in|se)\\s+(the|this|that|is|us|ye|yeh)\\s+'+SONG_WORD+'\\b').test(t)) return true;
  if(/\b(those|these|same|original|its|iske|uske|ye|yeh|wo|woh|their)\s+chords?\b/.test(t)) return true;
  return false; }
/* "make bar 4 B minor", "bar 2 should be F#7", "make bars 3 and 4 C", "make the fourth bar beat 3 E", "bar 4 ko B minor kar do" */
function barChord(raw){ let s=' '+String(raw).toLowerCase().replace(/[?!.]+\s*$/,'')+' ', bar=null, bars, beat, m;
  const bm=s.match(/\s(?:from |on |at )?beat\s*(\d|one|two|three|four)\b(?:\s*of)?/); if(bm){ beat=+bm[1]||ORD[bm[1]]; s=s.replace(bm[0],' '); }
  if((m=s.match(/\bbars?\s*(\d{1,2})\s*(?:-|to|and|through|&)\s*(\d{1,2})\b/))){ bar=+m[1]; bars=Math.max(1,+m[2]-bar+1); }
  else if((m=s.match(/\b(?:bar|measure)\s*(?:number\s*|no\.?\s*)?(\d{1,2}|one|two|three|four|five|six|seven|eight)\b/))) bar=+m[1]||ORD[m[1]];
  else if((m=s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:bar|measure)\b/)||s.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+(?:bar|measure)\b/))) bar=+m[1]||ORD[m[1]];
  if(!bar) return null;
  const tidy=x=>x.replace(/\s+/g,' ').trim(), after=tidy(s.slice(m.index+m[0].length)), before=tidy(s.slice(0,m.index));
  const tries=[];
  const a1=after.replace(/^(?:of the song |of my song |of the loop )?(?:(?:should|must|could|can|will) be|needs to be|to be|to|into|be|is|as|=|:|ko|ka chord|ki chord|chord|the chord|with)\s+/,'').replace(/\s+(?:karo|kar do|kardo|banao|bana do|please|chord|instead|now|then|ok|okay|thanks)$/,'').replace(/\s+(?:karo|kar do|please|chord)$/,'');
  tries.push(a1,a1.replace(/^(?:a|an)\s+/,''));
  const b1=before.replace(/^(?:(?:hey )?keys,? )?(?:can you |could you |please |i want |let'?s |lets )?(?:make|set|change|put|turn|switch|use|play|give me|i want)?\s*(?:it|that|the chord|a chord|the chords)?\s*(?:to|into)?\s*/,'').replace(/\s+(?:in|on|for|at|of)(?: the)?$/,'').replace(/\s+chord$/,'');
  tries.push(b1,b1.replace(/^(?:a|an)\s+/,''));
  for(const x of tries){ if(!x||x.length>24) continue; const c=parseChord(x); if(c) return {type:'set_chord',bar,chord:chordName(c),beat,bars}; }
  return null; }
/* SE-7bc fix 1: a track's name is read as a name first. "put the chords from night drive on my song" is about the song
   "night-drive", not a Drive effect; "turn night-drive into a melody" turns that song into notes. The name of a song dropped in
   (or of a part the user brought or sang) is replaced by "this song" / "that part" before the phrases are read, and that track
   is what the request is about (NAMED.track). Plain names (Drums, Chords 2, Voice note 1, Sung melody, Grand Piano) stay words. */
const NAME_PLAIN=new Set(['voice','note','notes','recording','vocal','vocals','audio','imported','take','drums','drum','beat','bass','bassline','chords','chord','pad','pads','melody','lead','hook','keys','part','sung','hummed','from','my','the','track','loop','new']);
const NAMED={track:null};
const nameWords=s=>String(s||'').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
function namePlain(t){ const w=nameWords(t.name).filter(x=>!/^\d+$/.test(x)); if(!w.length||w.join('').length<4) return true;
  if(w.every(x=>NAME_PLAIN.has(x))) return true;
  const I=t.inst&&INST.get(t.inst); if(I&&nameWords(I.name).join(' ')===w.join(' ')) return true; /* "Grand Piano" named after its instrument */
  return false; }
function maskNames(raw){ NAMED.track=null; let s=String(raw||'');
  const list=PROJ.tracks.filter(t=>t.name&&(t.kind==='audio'||!t.gen)&&!namePlain(t)).sort((a,b)=>b.name.length-a.name.length);
  for(const t of list){ const re=new RegExp('(?<![\\p{L}\\p{N}])(?:the\\s+)?'+nameWords(t.name).join('[\\s_.\\-]*')+'(?:\\s+(?:song|track|loop|clip|file|audio|recording|part))?(?![\\p{L}\\p{N}])','giu');
    if(!re.test(s)) continue; re.lastIndex=0; s=s.replace(re,t.kind==='audio'?'this song':'that part'); if(!NAMED.track) NAMED.track=t; }
  return s; }
/* "copy the melody of this song", "give me its tune", "iski dhun chahiye": Keys never copies a song's tune; it says so and
   points to Turn into notes, the user's own free pass (owner, SE-7 approval) */
function wantsSongMelody(t,song){ if(!/\b(melody|melodies|tune|hook|riff|top ?line|dhun)\b/.test(t)) return false;
  const songRef=new RegExp('\\b(this|that|the|is|us|ye|yeh|wo|woh)\\s+'+SONG_WORD+'\\b').test(t)||/\b(its|their|iski|uski|iska|uska)\s+(own\s+)?(melody|tune|hook|riff|top ?line|dhun)\b/.test(t)||!!song;
  if(!songRef) return false;
  return /\b(copy|copying|steal|lift|grab|duplicate|replicate|recreate|nakal)\b/.test(t)||/\b(same|original|its|their|iski|uski|wahi|vahi|the song'?s)\s+(own\s+)?(melody|tune|hook|riff|top ?line|dhun)\b/.test(t)
    ||/\b(take|use|get|give me|want|chahiye|put)\b.*\b(melody|tune|hook|riff|top ?line|dhun)\s+(of|from|off|in|out of|se)\s+(this|that|the|is|us|ye|yeh)\s+/.test(t); }
function songTalk(raw,t){
  const hasAudio=PROJ.tracks.some(x=>x.kind==='audio');
  const named=(NAMED.track&&PROJ.tracks.includes(NAMED.track)?NAMED.track:null)||PROJ.tracks.slice().sort((a,b)=>b.name.length-a.name.length).find(x=>x.name.length>=4&&t.includes(' '+x.name.toLowerCase()+' '));
  /* bug 4: "copy the melody of this song" gets an honest answer, not a quiet new melody */
  const song=named&&named.kind==='audio'?named:null;
  if(hasAudio&&wantsSongMelody(t,song)){ const st=song||[...PROJ.tracks].reverse().find(x=>x.kind==='audio'), nm=st.name;
    if(typeof OFFER!=='undefined') OFFER.actions=null;
    return {actions:[],reply:`I write my own melodies rather than copy a song's tune, so I can make a new one over its chords. For the song's own tune, say “turn ${nm.length<24?nm:'it'} into a melody”, or use Turn into notes on its track.`}; }
  const mine=/\b(my|our) (own )?(song|track|tune|project)\b|\b(mera|mere|meri) (gaana|gaane|song)\b/.test(t)&&!new RegExp('\\b(this|that|the|is|us) '+SONG_WORD+'\\b').test(t);
  if(/\b(key\s*(to|back to|on|ko)?\s*auto(matic)?|auto(matic)?\s*key|unlock (the )?key|unset (the )?key|clear (the )?key|forget (the )?key|let (the )?key (be )?(auto|detected))\b/.test(t)) return {actions:[{type:'key',key:'auto'}]};
  const bc=/\b(bar|bars|measure)\b/.test(t)&&barChord(raw); if(bc) return {actions:[bc]};
  if(/\b(match|fit|put|move|transpose|shift|bring|change|set|make|kar|karo|kar do)\b/.test(t)&&(/\b(to|in|into|with|mein|me)\s+(my|our|the song'?s|meri|mere|apni)\s+(song'?s\s+)?key\b/.test(t)||/\b(meri|mere|apni) key (mein|me)\b/.test(t))||/\b(same key as|in key with)\s+(my|the|our|mere)\s+(song|track|project)\b/.test(t)||/\bmatch (the |its )?key\b/.test(t)&&/\b(loop|clip|sample|midi|this|it)\b/.test(t))
    return {actions:[{type:'match_key',track:named?named.name:undefined}]};
  const takeChords=wantsSongChords(t)&&(TAKE_VERB.test(t)||/\b(on|in|to|onto|into|mein|me)\s+(my|our|mere|meri)\b/.test(t));
  if(takeChords&&!/^\s*(what|which|kya|kaunsi|konsi)\b/.test(t)){
    const to=/\b(the song'?s key|original key|its (own )?key|their key|same key|keep the key|in the song'?s key|uski key|unki key|as it is|as they are)\b/.test(t)?'song':'mine';
    const bass=/\bbass/.test(t)&&!/\b(without|no|minus|not the) (the )?bass/.test(t), bm=t.match(/\b(\d{1,2})\s*bars?\b/);
    return {actions:[{type:'chords_from_audio',track:named&&named.kind==='audio'?named.name:undefined,to,bass:bass||undefined,bars:bm?+bm[1]:undefined},{type:'transport',do:'play'}]}; }
  if(/\b(use|set|take|switch to|change to|go to|put|move)\b.*\b(the song'?s key|the key of (the|this|that) song|its key|that key|the same key|song ki key|uski key)\b/.test(t)&&!/\bchords?\b/.test(t)) return {actions:[{type:'key',key:'song',from:'song'}]};
  if(ANA_ASK.test(t)&&!/\b(add|make me|give me|set|change|use|put)\b/.test(t))
    return {actions:[{type:'analyse_song',track:mine||!hasAudio?'mine':named&&named.kind==='audio'?named.name:undefined}]};
  return null; }
function localBrain(raw){
  { const of=offerOpen(); if(of&&YES_RE.test(raw)) return {actions:of.actions.map(x=>Object.assign({},x))};
    if(of&&NO_RE.test(raw)){ OFFER.actions=null; return {actions:[],reply:'OK, I left it as it is.'}; } }
  raw=maskNames(raw); /* track names are names, never effects or styles */
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
  { const st=songTalk(raw,t); if(st) return st; }
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
    const nt=NAMED.track&&PROJ.tracks.includes(NAMED.track)?NAMED.track:null; /* "add reverb to night drive": the named track */
    if(fxw&&(tr||nt)&&/\b(add|put|more|less|on|to|give|use|some|turn)\b/.test(t)){ const trk=nt&&(!tr||/\b(this song|that part)\b/.test(t))?nt.name:tr==='drums'?'drums':tr; const less=/\b(less|reduce|lower|down|remove|no)\b/.test(t); return {actions:[{type:'track_fx',track:trk,effect:fxw[1],change:less?-20:(/\bmore\b/.test(t)?20:undefined),remove:/\b(remove|no|off)\b/.test(t)}]}; } }
  if(/^\s*(undo|undo that|go back|revert( that)?|take that back)\b/.test(t)) return {actions:[{type:'undo'}]};
  if(/^\s*(redo|redo that)\b/.test(t)) return {actions:[{type:'redo'}]};
  if(/\b(voice note|record (my )?voice|just record( me)?|record (some )?audio)\b/.test(t)) return {actions:[{type:'sing',part:'voice'}]};
  const tr=t.match(/\b(?:turn|convert|make|transcribe|change) (?:the |my |this |that )?(voice note|voice|recording|audio|vocal|song|track|clip|loop|sample|file|it)\b.*?\b(?:in)?to (?:a |the )?(bass(?:line)?|chords?|melody|notes|piano|instrument)\b/);
  if(tr && (PROJ.tracks.some(x=>x.kind==='audio'))){ const nt=NAMED.track&&NAMED.track.kind==='audio'&&PROJ.tracks.includes(NAMED.track)?NAMED.track:null; return {actions:[{type:'transcribe',track:nt?nt.name:undefined,to:tr[2]}]}; }
  if(singRole) return {actions:[{type:'sing',part:singRole}]};
  if(/^\s*(again|redo|one more time|try that again|retake)\b/.test(t) && LAST_TAKE.part) return {actions:[{type:'again'}]};
  const conv=t.match(/\b(?:make|turn|use) (?:it|that part|that|this|the hum(?:med melody)?|my hum|the melody)(?: in)?(?:to| as)? (?:the |a )?(bass(?:line)?|chords?|melody)\b/);
  if(conv){ const nt=/\bthat part\b/.test(conv[0])&&NAMED.track&&NAMED.track.kind==='notes'&&PROJ.tracks.includes(NAMED.track)?NAMED.track:null;
    return {actions:[{type:'convert',track:nt?nt.id:(ASSIST.lastHum&&PROJ.tracks.find(x=>x.id===ASSIST.lastHum))?ASSIST.lastHum:'melody',to:conv[1]}]}; }
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
  if((m=t.match(/\b(?:in|key of|key (?:to|in)|key)\s+([a-g](?:\s*(?:sharp|flat|#|b))?\s*(?:major|minor|maj|min|m)?)\b/)) && /major|minor|maj|min|\bkey\b|sharp|flat|#/.test(m[0])) A.push({type:'key',key:m[1]});
  if(/\b(new song|new project|start over)\b/.test(t)) return {actions:[{type:'new_project'}],reply:'Started a new song. Your last one is saved.'};
  if(/\bsave\b/.test(t)) A.push({type:'save'});
  if(/\b(stop|pause)\b/.test(t)) A.push({type:'transport',do:'stop'});
  const role=(ROLE_WORDS.find(([k,re])=>re.test(t))||[])[0];
  const mixVerb=(t.match(/\b(louder|turn up|boost|quieter|softer|turn down|lower|mute|unmute|solo|remove|delete|drop)\b/)||[])[1];
  /* "mute night drive", "make night drive quieter": the named track (bug 3) */
  const mixT=(NAMED.track&&PROJ.tracks.includes(NAMED.track)&&/\b(this song|that part)\b/.test(t)?NAMED.track.name:null)||role;
  const swap=iw && role && /\b(use|change|switch|swap|make|turn)\b/.test(t) && !/\badd\b/.test(t) && PROJ.tracks.some(x=>x.role===role);
  if(mixVerb && mixT){
    if(/louder|turn up|boost/.test(mixVerb)) A.push({type:'mix',track:mixT,change:12});
    else if(/quieter|softer|turn down|lower/.test(mixVerb)) A.push({type:'mix',track:mixT,change:-12});
    else if(mixVerb==='mute') A.push({type:'mix',track:mixT,mute:true}); else if(mixVerb==='unmute') A.push({type:'mix',track:mixT,mute:false});
    else if(mixVerb==='solo') A.push({type:'mix',track:mixT,solo:true}); else A.push({type:'remove',track:mixT});
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
