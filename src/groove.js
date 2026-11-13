
/* ---------- groove engine: genre recipes, artist references, varied drum and part generation ----------
   A "recipe" describes a groove in words a producer would use. The generator turns it into notes with a
   fresh random seed each time, so asking twice gives two different grooves in the same vibe. */

/* more genres; each has a groove recipe used by the drum generator */
Object.assign(STYLES,{
  melodichouse:{name:'Melodic house',bpm:122,mode:'minor',kit:'kitMelodic',bass:'subbass',chords:'darkpad',lead:'mhpluck',bassStyle:'mhoffbeat',chordStyle:'pads',melStyle:'arp',swing:0.04,drums:{36:'x...x...x...x...'}},
  melodictechno:{name:'Melodic techno',bpm:124,mode:'minor',kit:'kitDeepTechno',bass:'rollbass',chords:'darkpad',lead:'mhpluck',bassStyle:'rolling16',chordStyle:'pads',melStyle:'seq',drums:{36:'x...x...x...x...'}},
  progressive:{name:'Progressive house',bpm:123,mode:'minor',kit:'kitMelodic',bass:'rollbass',chords:'supersaw',lead:'mhpluck',bassStyle:'rolling16',chordStyle:'plucks332',melStyle:'arp',drums:{36:'x...x...x...x...'}},
  deephouse:{name:'Deep house',bpm:120,mode:'minor',kit:'kit909',bass:'moog',chords:'epiano',lead:'epiano',bassStyle:'sync',chordStyle:'seventh',swing:0.08,drums:{36:'x...x...x...x...'}},
  organichouse:{name:'Organic house',bpm:116,mode:'minor',kit:'kitMelodic',bass:'subbass',chords:'kalimba',lead:'flute',bassStyle:'mhoffbeat',chordStyle:'plucks332',melStyle:'arp',swing:0.07,drums:{36:'x...x...x...x...'}},
  techhouse:{name:'Tech house',bpm:126,mode:'minor',kit:'kit909',bass:'moog',chords:'organ',lead:'lead',bassStyle:'techhouse',chordStyle:'stabs',swing:0.05,drums:{36:'x...x...x...x...'}},
  ukg:{name:'UK garage',bpm:132,mode:'minor',kit:'kitKit3',bass:'reese',chords:'organ',lead:'lead',bassStyle:'sync',chordStyle:'stabs',swing:0.18,drums:{36:'x.....x...x.....'}},
  drill:{name:'Drill',bpm:142,mode:'minor',kit:'kitTrap',bass:'bass808',chords:'strings',lead:'flute',bassStyle:'slide808',chordStyle:'sustain',drums:{36:'x......x..x.....'}},
  boombap:{name:'Boom bap',bpm:88,mode:'minor',kit:'kitKit8',bass:'acbass',chords:'piano',lead:'sax',bassStyle:'follow',chordStyle:'seventh',swing:0.18,drums:{36:'x......x..x.....'}},
  synthwave:{name:'Synthwave',bpm:100,mode:'minor',kit:'kitLinn',bass:'synbass',chords:'supersaw',lead:'lead',bassStyle:'root8',chordStyle:'sustain',drums:{36:'x.......x.......'}},
  nudisco:{name:'Nu-disco',bpm:118,mode:'minor',kit:'kitKit3',bass:'slapbass',chords:'eguitar',lead:'strings',bassStyle:'disco',chordStyle:'pulse8',drums:{36:'x...x...x...x...'}},
  amapiano:{name:'Amapiano',bpm:113,mode:'minor',kit:'kitBongos',bass:'subbass',chords:'epiano',lead:'pluck',bassStyle:'logdrum',chordStyle:'seventh',swing:0.1,drums:{36:'x...x...x...x...'}},
  downtempo:{name:'Downtempo',bpm:95,mode:'minor',kit:'kitMelodic',bass:'subbass',chords:'darkpad',lead:'mhpluck',bassStyle:'follow',chordStyle:'pads',melStyle:'arp',swing:0.06,drums:{36:'x.........x.....'}},
  dubstep:{name:'Dubstep',bpm:140,mode:'minor',kit:'kitStark',bass:'reese',chords:'pad',lead:'lead',bassStyle:'reese',chordStyle:'sustain',drums:{36:'x.........x.....'}},
  liquid:{name:'Liquid drum & bass',bpm:172,mode:'minor',kit:'kitKit3',bass:'subbass',chords:'epiano',lead:'pad',bassStyle:'reese',chordStyle:'seventh',drums:{36:'x.........x.....'}},
  punjabi:{name:'Punjabi pop',bpm:96,mode:'minor',kit:'kitTrap',bass:'bass808',chords:'guitar',lead:'flute',bassStyle:'follow808',chordStyle:'arp',drums:{36:'x..x....x.x.....'}}
});
Object.assign(STYLES.house,{kit:'kit909'}); STYLES.techno.kit='kitDeepTechno';

/* how each genre grooves. kick: pattern family; back: what lands on 2 and 4; hats: closed-hat feel;
   open: open hats on the off-beats; shaker / perc (0-3 layers of rims, congas, toms, cowbell); ghost: ghost-note amount;
   energy 1-5; fill: fill every N bars; crash: crash at phrase starts; ride: ride cymbal; human: timing drift */
const GROOVES={
  house:{kick:'four',back:'clap',hats:'offbeat16',open:true,shaker:false,perc:1,ghost:0.1,energy:3,fill:8,crash:true},
  techno:{kick:'four',back:'clap',hats:'16th',open:true,ride:true,perc:1,ghost:0.15,energy:4,fill:8,rumble:true},
  melodichouse:{kick:'four',back:'clap',hats:'shuffle16',open:true,shaker:true,perc:2,ghost:0.1,energy:3,fill:8,human:true},
  melodictechno:{kick:'four',back:'clap',hats:'16th',open:true,ride:true,shaker:false,perc:1,ghost:0.1,energy:4,fill:8,human:true},
  progressive:{kick:'four',back:'clap',hats:'16th',open:true,shaker:true,perc:1,energy:4,fill:8,crash:true},
  deephouse:{kick:'four',back:'clap',hats:'offbeat16',open:true,shaker:true,perc:1,ghost:0.2,energy:2,fill:8,human:true},
  organichouse:{kick:'four',back:'rim',hats:'shuffle16',open:false,shaker:true,perc:3,ghost:0.2,energy:2,fill:8,human:true},
  techhouse:{kick:'four',back:'clap',hats:'16th',open:true,shaker:true,perc:2,ghost:0.3,energy:4,fill:4},
  afro:{kick:'four',back:'rim',hats:'shuffle16',open:false,shaker:true,perc:3,ghost:0.2,energy:3,fill:8,human:true},
  ukg:{kick:'broken',back:'snare',hats:'shuffle16',open:true,perc:1,ghost:0.4,energy:3,fill:4},
  hiphop:{kick:'boombap',back:'snare',hats:'8th',open:false,perc:0,ghost:0.3,energy:2,fill:4,human:true},
  boombap:{kick:'boombap',back:'snare',hats:'8th',open:true,perc:0,ghost:0.35,energy:2,fill:4,human:true},
  lofi:{kick:'boombap',back:'snare',hats:'8th',open:false,shaker:true,perc:0,ghost:0.3,energy:1,fill:8,human:true},
  trap:{kick:'trap',back:'clap',hats:'trap',open:false,perc:0,energy:3,fill:4},
  drill:{kick:'drill',back:'snare',hats:'drill',open:false,perc:1,energy:3,fill:4},
  pop:{kick:'pop',back:'snare',hats:'8th',open:true,perc:0,energy:3,fill:4,crash:true},
  rock:{kick:'pop',back:'snare',hats:'8th',open:true,perc:0,ghost:0.2,energy:3,fill:4,crash:true},
  synthwave:{kick:'pop',back:'snare',hats:'16th',open:false,perc:0,energy:3,fill:4,crash:true},
  nudisco:{kick:'four',back:'snare',hats:'8th',open:true,perc:2,energy:3,fill:8,crash:true},
  reggaeton:{kick:'four',back:'dembow',hats:'8th',open:false,perc:1,energy:3,fill:4},
  amapiano:{kick:'four',back:'rim',hats:'shuffle16',open:false,shaker:true,perc:3,energy:2,fill:8,human:true},
  downtempo:{kick:'halftime',back:'clap',hats:'shuffle16',open:false,shaker:true,perc:2,ghost:0.2,energy:2,fill:8,human:true},
  dubstep:{kick:'halftime',back:'snare',hats:'8th',open:false,perc:0,energy:4,fill:4},
  dnb:{kick:'dnb',back:'snare',hats:'8th',open:false,ride:true,perc:0,ghost:0.4,energy:4,fill:4},
  liquid:{kick:'dnb',back:'snare',hats:'16th',open:false,shaker:true,perc:0,ghost:0.4,energy:3,fill:8},
  bhangra:{kick:'bhangra',back:'clap',hats:'8th',open:false,perc:3,energy:4,fill:4},
  bollywood:{kick:'bhangra',back:'snare',hats:'8th',open:false,perc:2,energy:3,fill:4},
  punjabi:{kick:'trap',back:'clap',hats:'8th',open:false,perc:2,energy:3,fill:4}
};

/* artist references: genre, tempo, key, groove tweaks and the sounds that suit them */
const ARTISTS=[
  ['Ben Böhmer|ben bohmer|bohmer|boehmer','melodichouse',122,'F minor',{perc:2,shaker:true,energy:3,back:'clap'},{kit:'kitMelodic',bass:'subbass',chords:'darkpad',lead:'mhpluck'},'warm, emotional melodic house: soft clap, shuffled hats and shakers, rolling sub bass, lush pads and plucked arps'],
  ['Stephan Bodzin|bodzin','melodictechno',124,'A minor',{perc:1,ride:true,energy:4,shaker:false},{kit:'kitDeepTechno',bass:'rollbass',chords:'darkpad',lead:'mhpluck'},'dark, hypnotic melodic techno: driving 16th hats and ride, a rolling analog bass sequence and a big arpeggiated lead'],
  ['Lane 8','melodichouse',122,'C minor',{perc:1,energy:3},{kit:'kitMelodic',bass:'rollbass',chords:'pad',lead:'mhpluck'},'deep, bittersweet melodic house with soft drums and warm chords'],
  ['Yotto','melodichouse',122,'G minor',{energy:3,perc:2},{kit:'kitMelodic',bass:'rollbass',chords:'darkpad',lead:'mhpluck'},'airy melodic house with bouncy bass and dreamy arps'],
  ['Tale Of Us|tale of us','melodictechno',123,'D minor',{energy:3,perc:1},{kit:'kitDeepTechno',bass:'rollbass',chords:'darkpad',lead:'strings'},'cinematic, slow-burning melodic techno'],
  ['Anyma','melodictechno',124,'F minor',{energy:4},{kit:'kitDeepTechno',bass:'rollbass',chords:'supersaw',lead:'lead'},'big, futuristic melodic techno with huge synth leads'],
  ['Afterlife|massano|argy|innellea|kevin de vries|adriatique|mathame|colyn','melodictechno',124,'A minor',{energy:4},{kit:'kitDeepTechno',bass:'rollbass',chords:'darkpad',lead:'mhpluck'},'Afterlife-style melodic techno: dark, driving and euphoric'],
  ['Rüfüs Du Sol|rufus du sol|rufus','melodichouse',120,'A minor',{energy:3,perc:1},{kit:'kitMelodic',bass:'moog',chords:'darkpad',lead:'mhpluck'},'moody, live-feel melodic house'],
  ['Monolink|Nora En Pure|nora en pure','melodichouse',120,'D minor',{energy:2,perc:2},{kit:'kitMelodic',bass:'subbass',chords:'pad',lead:'mhpluck'},'deep, organic melodic house'],
  ['Keinemusik|&ME|andme|Adam Port|adam port|Rampa|Black Coffee|black coffee','afro',120,'A minor',{energy:3,perc:3},{kit:'kitBongos',bass:'subbass',chords:'kalimba',lead:'flute'},'afro house: rolling percussion, shakers and a hypnotic bass'],
  ['Solomun|Kölsch|kolsch|Maceo Plex|maceo plex','melodichouse',123,'A minor',{energy:4},{kit:'kitMelodic',bass:'rollbass',chords:'darkpad',lead:'mhpluck'},'driving, melodic club house'],
  ['Bicep','progressive',125,'E minor',{energy:4,perc:2},{kit:'kitMelodic',bass:'rollbass',chords:'supersaw',lead:'mhpluck'},'breakbeat-tinged euphoric electronica with rave chords'],
  ['Fred again|fred again..|fred again','ukg',134,'F minor',{energy:3,ghost:0.4},{kit:'kitKit3',bass:'subbass',chords:'piano',lead:'mhpluck'},'emotional garage-house with chopped vocals and piano'],
  ['Four Tet|four tet|Jamie xx|jamie xx|Floating Points|floating points','organichouse',124,'D minor',{energy:3,perc:3},{kit:'kitMelodic',bass:'subbass',chords:'kalimba',lead:'mhpluck'},'organic, percussive electronica'],
  ['Burial|Disclosure|Sammy Virji|sammy virji|Interplanetary Criminal|interplanetary criminal','ukg',132,'G minor',{energy:3},{kit:'kitKit3',bass:'reese',chords:'organ',lead:'lead'},'shuffling UK garage with swung hats and ghost snares'],
  ['Fisher|Chris Lake|chris lake|John Summit|john summit|Dom Dolla|dom dolla|Mau P|mau p','techhouse',127,'A minor',{energy:4,perc:2},{kit:'kit909',bass:'moog',chords:'organ',lead:'lead'},'punchy tech house: rolling bass, busy percussion and a big groove'],
  ['Charlotte de Witte|charlotte de witte|Amelie Lens|amelie lens|Adam Beyer|adam beyer|I Hate Models|i hate models','techno',134,'A minor',{energy:5,ride:true},{kit:'kitDeepTechno',bass:'acid',chords:'supersaw',lead:'acid'},'hard, driving warehouse techno'],
  ['Boris Brejcha|boris brejcha','melodictechno',126,'C minor',{energy:4,perc:2},{kit:'kitDeepTechno',bass:'rollbass',chords:'darkpad',lead:'lead'},'high-tech minimal: bouncy bass and playful synth leads'],
  ['Peggy Gou|peggy gou|Purple Disco Machine|purple disco machine|Daft Punk|daft punk|Dua Lipa|dua lipa','nudisco',120,'A minor',{energy:3,perc:2},{kit:'kitKit3',bass:'slapbass',chords:'eguitar',lead:'strings'},'nu-disco: four-to-the-floor, octave bass and funky guitar'],
  ['Kaytranada','deephouse',112,'D minor',{energy:3,ghost:0.4,swing:0.15},{kit:'kitKit8',bass:'moog',chords:'epiano',lead:'epiano'},'swung, funky house-hop with bouncy bass'],
  ['Avicii|Calvin Harris|calvin harris|Swedish House Mafia|swedish house mafia|Martin Garrix|martin garrix|Alesso','progressive',126,'A minor',{energy:4},{kit:'kit909',bass:'pluckbass',chords:'supersaw',lead:'lead'},'big-room progressive house with supersaw chords'],
  ['Odesza|Flume|Tycho|Bonobo|Emancipator','downtempo',100,'D minor',{energy:2,perc:2},{kit:'kitMelodic',bass:'subbass',chords:'darkpad',lead:'mhpluck'},'lush downtempo electronica'],
  ['Skrillex|Excision|Subtronics','dubstep',140,'F minor',{energy:5},{kit:'kitStark',bass:'reese',chords:'pad',lead:'lead'},'heavy half-time dubstep'],
  ['Pendulum|Chase & Status|chase and status|Sub Focus|sub focus|Wilkinson','dnb',174,'D minor',{energy:5},{kit:'kitStark',bass:'reese',chords:'supersaw',lead:'lead'},'high-energy drum & bass'],
  ['Netsky|Calibre|LTJ Bukem|ltj bukem|Hybrid Minds|hybrid minds','liquid',172,'F minor',{energy:3},{kit:'kitKit3',bass:'subbass',chords:'epiano',lead:'pad'},'smooth liquid drum & bass'],
  ['J Dilla|j dilla|Nujabes|Madlib|MF DOOM|mf doom|Pete Rock|pete rock','boombap',88,'D minor',{energy:2,swing:0.22,ghost:0.35},{kit:'kitKit8',bass:'acbass',chords:'epiano',lead:'sax'},'dusty boom bap with lazy swing'],
  ['Lofi Girl|lofi|lo-fi','lofi',78,'C major',{energy:1},{kit:'kitKit8',bass:'acbass',chords:'epiano',lead:'vibes'},'mellow lo-fi with swung drums'],
  ['Metro Boomin|metro boomin|Travis Scott|travis scott|Future|21 Savage|21 savage|Southside','trap',142,'C minor',{energy:3},{kit:'kitTrap',bass:'bass808',chords:'pad',lead:'flute'},'dark trap: long 808s and rolling hats'],
  ['Central Cee|central cee|Pop Smoke|pop smoke|Headie One|headie one','drill',142,'F minor',{energy:3},{kit:'kitTrap',bass:'bass808',chords:'strings',lead:'flute'},'drill: sliding 808s and syncopated snares'],
  ['Kendrick Lamar|kendrick|Drake|Kanye|J Cole|j cole','hiphop',92,'E minor',{energy:2},{kit:'kitKit8',bass:'bass808',chords:'piano',lead:'epiano'},'modern hip-hop with a laid-back groove'],
  ['The Weeknd|the weeknd|Kavinsky|The Midnight|the midnight','synthwave',108,'F minor',{energy:3},{kit:'kitLinn',bass:'synbass',chords:'supersaw',lead:'lead'},'80s synthwave: gated snare and analog synths'],
  ['Bad Bunny|bad bunny|J Balvin|j balvin|Karol G|karol g','reggaeton',94,'A minor',{energy:3},{kit:'kit808',bass:'bass808',chords:'supersaw',lead:'lead'},'reggaeton dembow groove'],
  ['Kabza De Small|kabza|DJ Maphorisa|maphorisa|Uncle Waffles|uncle waffles','amapiano',112,'D minor',{energy:2,perc:3},{kit:'kitBongos',bass:'subbass',chords:'epiano',lead:'pluck'},'amapiano: log-drum bass, shakers and soulful keys'],
  ['AP Dhillon|ap dhillon|Diljit|diljit dosanjh|Karan Aujla|karan aujla|Sidhu Moose Wala|sidhu','punjabi',96,'A minor',{energy:3,perc:2},{kit:'kitTrap',bass:'bass808',chords:'guitar',lead:'flute'},'modern Punjabi pop with trap drums and folk melodies'],
  ['Arijit Singh|arijit|Pritam|A R Rahman|a.r. rahman|ar rahman|Vishal Shekhar|vishal-shekhar','bollywood',96,'A minor',{energy:3},{kit:'kitKit3',bass:'bass',chords:'strings',lead:'flute'},'Bollywood pop with strings and tabla-style percussion'],
  ['Taylor Swift|taylor swift|Ed Sheeran|ed sheeran|Harry Styles|harry styles|Olivia Rodrigo|olivia rodrigo','pop',110,'C major',{energy:3},{kit:'kitKit3',bass:'bass',chords:'piano',lead:'guitar'},'modern pop'],
  ['Coldplay|Imagine Dragons|imagine dragons|Arctic Monkeys|arctic monkeys','rock',116,'E minor',{energy:4},{kit:'kitAcoustic',bass:'bass',chords:'eguitar',lead:'piano'},'anthemic band sound']
].map(([names,style,bpm,key,mods,sounds,desc])=>({names:names.split('|'),name:names.split('|')[0],style,bpm,key,mods,sounds,desc}));
const normName=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9& ]+/g,' ').replace(/\s+/g,' ').trim();
function findArtist(ref){
  if(!ref) return null; const r=normName(ref); if(!r) return null;
  let best=null;
  for(const A of ARTISTS) for(const n of A.names){ const k=normName(n); if(!k) continue;
    if(r===k||r.includes(k)||(k.length>4&&k.includes(r))){ if(!best||k.length>best.len) best={A,len:k.length}; } }
  return best&&best.A;
}
/* what the person's listening says (filled by Spotify), used when a request names no style */
const TASTE={profile:null};
function tasteStyle(){ const p=TASTE.profile; return p&&p.styles&&p.styles[0]&&STYLES[p.styles[0].style]?p.styles[0].style:null; }

/* ---------- the drum generator ---------- */
const KICKS={
  four:['x...x...x...x...'],
  broken:['x.....x...x.....','x......x..x.....','x.........x..x..','x.....x....x....'],
  boombap:['x......x..x.....','x.x.......x..x..','x......xx.......','x.....x...x.....'],
  trap:['x......x..x.....|x.....x.x.......','x.....x...x..x..|x......x.x......','x.......x.x.....|x..x......x.....'],
  drill:['x.....x.......x.|x.....x...x.....','x.......x.....x.|x.....x.x.......'],
  pop:['x.......x.x.....','x.......x.......','x..x....x.x.....'],
  halftime:['x.........x.....','x......x........','x.........x..x..'],
  dnb:['x.........x.....','x.........xx....','x......x..x.....','x.x.......x.....'],
  bhangra:['x..x..x.x..x..x.','x..x....x..x....']
};
/* ---------- drum feel, measured (SE-3) ----------
   Averages from the owner's licensed Ableton Drum Essentials grooves (RES-3, .claude/research/data/RES-3-drum-feel.json).
   Numbers only: no notes, patterns or samples copied. Add a new measured feel as one more entry; pickFeel() chooses it.
   vel: average velocity per 16th step of the bar (0 = no hits there in the data); the groove keeps its own pattern and
   multiplies each hit by this shape, so beats 2 and 4 lift and the in-between 16ths sit back.
   push / spread (ms): where a live drummer lands against the grid (minus = early) and how much it wanders (sd);
   keep: how much of that wander programmed "human" styles keep (a club beat stays tighter than a live kit). */
const FEELS={
  straight:{src:'Drum Essentials, 154 straight grooves',swing:0,ghost:0.33,vel:{
    hatc:[0.68,0.54,0.47,0.54,0.76,0.46,0.52,0.51,0.62,0.51,0.53,0.52,0.73,0.55,0.53,0.56],
    hato:[0.88,0.83,0.8,0.81,0.85,0.85,0.83,0.9,0.84,0.81,0.91,0.77,0.75,0.74,0.9,0.77],
    shaker:[0.6,0.59,0.5,0.45,0.58,0.51,0.56,0.53,0.63,0.51,0.54,0.56,0.68,0.45,0.63,0.61],
    perc:[0.64,0.34,0.45,0.49,0.48,0.44,0.47,0.44,0.48,0.46,0.45,0.54,0.64,0.61,0.6,0.5]}},
  swing16:{src:'Drum Essentials, 15 swung grooves (all full triplet swing)',swing:0.333,ghost:0.27,vel:{
    hatc:[0.62,0.37,0.45,0.37,0.8,0.29,0.52,0.5,0.5,0.47,0.49,0.45,0.79,0.4,0.48,0.66],
    hato:[0.29,0,0.66,1,0.71,0,0.34,1,0.31,0,0.64,0,0.64,0,0.36,1],
    shaker:[0.61,0.86,0.4,0,0.54,0.42,0.54,0,0.53,0,0.64,0.58,0.77,0,0.72,1],
    perc:[0.44,0.28,0.36,0.59,0.74,0.47,0.57,0,0.25,0.21,0.54,0.32,0.64,0.54,0.3,0.74]}},
  live:{src:'Drum Essentials, 12 live-kit grooves',swing:0,ghost:0.4,vel:{
    hatc:[0.61,0.53,0.53,0.51,0.63,0.54,0.55,0.59,0.59,0.53,0.54,0.52,0.71,0.56,0.63,0.57]},
    push:{kick:-9.9,snare:-3.6,hat:0.6,perc:2.8},spread:{kick:16.6,snare:14,hat:27.5,perc:16.3},keep:{kick:0.15,snare:0.15,hat:0.3,perc:0.3}}
};
const FEEL_WOBBLE=0.12;   /* each new groove nudges the curves a little, so "another one" never repeats exactly */
function pickFeel(rec){ return FEELS[rec.feel]||((+rec.swing||0)>0.15?FEELS.swing16:FEELS.straight); }
/* a velocity curve as a shape around 1; rows with gaps in the data are trusted less (pulled towards flat) */
function feelShape(c,r){ if(!c) return Array(16).fill(1); const nz=c.filter(x=>x>0), m=nz.length?nz.reduce((a,b)=>a+b,0)/nz.length:1, depth=nz.length/16;
  return c.map(x=>(1+((x>0?x:m)/m-1)*depth)*(1+(r()-0.5)*FEEL_WOBBLE)); }
/* swing: 0 = straight, 0.333 = full triplet swing; the off 16ths move swing/4 of a beat late. Musicians count it as a
   percentage (MPC style): 50% straight, 66% triplet. "less swing" steps down this ladder, "more swing" goes to full. */
const SWING_STEPS=[0,0.08,0.16,0.333,0.4];
const swingPct=sw=>Math.floor(50+(+sw||0)*50+0.01);
/* the name follows the percentage shown next to it, so the word and the number always agree (59% and 60% are both medium) */
function swingName(sw){ const p=swingPct(sw); return sw<0.02?'straight':p<54?'a touch of swing':p<57?'light swing':p<62?'medium swing':p<65?'strong swing':p<68?'full triplet swing':'heavy swing'; }
function resolveSwing(v,cur){ cur=+cur||0; if(v==null||v===''||v===false) return v===false?0:undefined; const r3=x=>Math.round(clamp(x,0,0.4)*1000)/1000;
  if(typeof v==='string'){ const s=v.toLowerCase().trim(), num=parseFloat(s), bit=/\b(bit|little|touch|slight(ly)?|tad)\b/.test(s);
    if(/^(none|no|off|straight|zero|no swing)$/.test(s)) return 0;
    if(!isNaN(num)) v=num;
    else if(/less|light|lower|down|soft/.test(s)) return bit?r3(cur-0.08):(SWING_STEPS.slice().reverse().find(x=>x<cur-0.03)||0);
    else if(/more|heav|full|lots|max|up|triplet|swing/.test(s)) return bit?r3(cur+0.08):(cur<0.3?0.333:0.4);
    else return undefined; }
  v=+v; if(!isFinite(v)) return undefined; if(v>1) v=v>=50?(v-50)/50:v/100; return r3(v); }
/* the reply in musician words, with the same name the beat description uses: "Lighter: medium swing, about 58%" */
function swingWords(sw,prev){ const p=swingPct(sw), nm=swingName(sw), most=sw>=0.395;
  if(sw<0.02) return prev!=null&&prev<0.02?'Already straight, no swing':'Straight, no swing';
  if(prev!=null&&sw<prev-0.005) return `Lighter: ${nm}, about ${p}%`;
  if(prev!=null&&sw>prev+0.005) return `${nm.replace(/^./,c=>c.toUpperCase())}, about ${p}%${most?' (the most it goes)':''}`;
  if(prev!=null&&most) return `Already at the most it goes: ${nm}, about ${p}%`;
  return `${nm.replace(/^./,c=>c.toUpperCase())}, about ${p}%`; }
const PERC_SETS={melodichouse:[37,45,50],melodictechno:[37,47],techno:[37,47],progressive:[37,45],deephouse:[37,45],organichouse:[45,50,37],techhouse:[37,56,45],afro:[45,47,50,37],amapiano:[45,50,37],nudisco:[56,45,37],house:[37,45,56],bhangra:[45,47,50],bollywood:[45,47,50],punjabi:[45,50],downtempo:[37,45,50],reggaeton:[37,45],ukg:[37,45],drill:[37]};
const PERC_MOTIFS={
  37:['...x..x....x..x.','..x..x....x..x..','......x.......x.','...x.......x..x.','.x....x..x....x.'],
  45:['x..x..x...x.x...','..x...x.x...x..x','x.....x.x.....x.'],
  47:['...x.......x....','......x..x......','.x.....x..x.....'],
  56:['..x...x...x...x.','x.x..x.xx.x..x.x'],
  50:['.......x.......x','...x......x.....']
};
function grooveRecipe(style,artist,over){
  const base=Object.assign({style},GROOVES[style]||GROOVES.house);
  if(artist&&artist.mods) Object.assign(base,artist.mods);
  if(over) for(const [k,v] of Object.entries(over)) if(v!=null&&v!=='') base[k]=v;
  if(base.swing==null) base.swing=(STYLES[style]||{}).swing||0;
  base.energy=clamp(Math.round(+base.energy||3),1,5);
  return base;
}
function makeGroove(rec,L,seed){
  const r=rng(seed||1), ev=[], bars=Math.max(1,L/4), E=rec.energy, pick=a=>a[Math.floor(r()*a.length)];
  const sw=s=>s%2===1?(rec.swing||0)*0.25:0, vel=(v)=>clamp(v+(r()-0.5)*0.08,0.08,1);
  /* measured feel: velocity shapes per step, and (human styles) a drummer's push and wander per role */
  const F=pickFeel(rec), T=rec.human?FEELS.live:null, sh={}; ['hatc','hato','shaker','perc'].forEach(k=>sh[k]=feelShape(F.vel[k],r));
  const bpm=(typeof CTRL!=='undefined'&&+CTRL.bpm)||120, msB=ms=>ms/1000*bpm/60, gs=()=>{ const u=Math.max(1e-6,r()), w=r(); return clamp(Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*w),-2,2); };
  const roleOf=n=>n===36?'kick':(n===38||n===39||n===37&&rec.back==='rim')?'snare':(n===42||n===44||n===46||n===51)?'hat':'perc';
  const feelMs=(n,j)=>{ if(!T) return 0; const k=roleOf(n); return (T.push[k]||0)+(j||k==='kick'||k==='snare'?gs()*(T.spread[k]||0)*(T.keep[k]||0):0); };
  const at=(bar,s,n,v,d=0.2,j=true)=>ev.push({b:Math.max(0,Math.round((bar*4+s/4+sw(s)+msB(feelMs(n,j)))*1000)/1000),d,n,v:vel(v)});
  const kickPat=pick(KICKS[rec.kick]||KICKS.four), hc=sh.hatc;
  const percNotes=(rec.percSet||PERC_SETS[rec.style]||[37,45,47]).slice().sort(()=>r()-0.5).slice(0,clamp(+rec.perc||0,0,3));
  const percPat={}; percNotes.forEach(n=>percPat[n]=pick(PERC_MOTIFS[n]));
  const percB={}; percNotes.forEach(n=>percB[n]=pick(PERC_MOTIFS[n]));      /* B-section variant */
  const ghostSteps=[3,7,9,11,14,15].filter(()=>r()<(rec.ghost||0));
  const fillEvery=+rec.fill||0, fillKind=pick(rec.kick==='four'?['snareroll','openhat','drop','clapflam','tom']:['snareroll','tom','drop','hatroll']);
  const trapRollAt=[pick([10,12,14]),pick([6,13,15])];
  for(let bar=0;bar<bars;bar++){
    const phrase=bar%8, isB=bars>=8&&phrase>=4, isFill=fillEvery&&((bar+1)%fillEvery===0);
    const lastBeatFill=isFill&&fillKind!=='openhat';
    /* kick */
    const kp=pat(kickPat,bar);
    for(let s=0;s<16;s++){ if(kp[s]==='.'||!kp[s]) continue; if(isFill&&fillKind==='drop'&&s>=8) continue; at(bar,s,36,s%4===0?0.95:0.8,0.25,false); }
    if(rec.kick==='four'&&E>=3&&isB&&r()<0.35) at(bar,15,36,0.45,0.15,false);
    /* backbeat */
    const backSteps=rec.back==='dembow'?[3,6,11,14]:(rec.kick==='halftime'||rec.kick==='trap'||rec.kick==='drill'?(rec.kick==='drill'?[8,14]:[8]):[4,12]);
    const backNote=rec.back==='snare'?38:rec.back==='rim'?37:39;
    if(rec.back!=='none') backSteps.forEach(s=>{ if(lastBeatFill&&s>=12&&fillKind!=='clapflam') return; at(bar,s,rec.back==='dembow'?38:backNote,0.9,0.25,false);
      if(rec.back==='rim'&&E>=3) at(bar,s,39,0.5,0.2,false); if(rec.back==='clap'&&E>=4&&(rec.kick==='four')) at(bar,s,38,0.4,0.2,false); });
    if(rec.kick==='drill'&&bar%2===1) at(bar,6,38,0.7);
    ghostSteps.forEach(s=>{ if(!backSteps.includes(s)) at(bar,s,38,0.22+r()*0.1,0.1); });
    /* hats */
    const closed=[];
    switch(rec.hats){
      case 'offbeat': [2,6,10,14].forEach(s=>closed.push([s,0.92*hc[s]])); break;
      case 'offbeat16': for(let s=0;s<16;s++){ const a=s%4===2?0.95:(E>=3&&s%2===1?0.42+r()*0.12:0); if(a) closed.push([s,a*hc[s]]); } break;
      case '8th': for(let s=0;s<16;s+=2) closed.push([s,0.62*hc[s]]); if(E>=4) closed.push([15,0.35*hc[15]]); break;
      case '16th': for(let s=0;s<16;s++) closed.push([s,(E>=4?0.7:0.6)*hc[s]]); break;
      case 'shuffle16': for(let s=0;s<16;s++){ if(E<=2&&s%4===1&&r()<0.5) continue; closed.push([s,(0.52+r()*0.12)*hc[s]]); } break;
      case 'trap': { for(let s=0;s<16;s+=2) closed.push([s,s%4===0?0.85:0.6]);
        if(bar%2===1||E>=4){ const at1=trapRollAt[bar%2], div=pick([3,4,6]); for(let k=0;k<div;k++) ev.push({b:bar*4+at1/4+k*(0.5/div),d:0.08,n:42,v:0.45+k*0.08}); } break; }
      case 'drill': for(let s=0;s<16;s+=2) closed.push([s,0.7]); [3,11].forEach(s=>closed.push([s,0.5])); if(bar%2===1) for(let k=0;k<3;k++) ev.push({b:bar*4+3.5+k/6,d:0.08,n:42,v:0.5+k*0.1}); break;
      case 'quarter': [0,4,8,12].forEach(s=>closed.push([s,0.8])); break;
      case 'none': break;
      default: for(let s=0;s<16;s+=2) closed.push([s,0.7]);
    }
    const openSteps=rec.open?(rec.hats==='8th'?[14]:[2,6,10,14]):[];
    closed.forEach(([s,v])=>{ if(openSteps.includes(s)) return; at(bar,s,42,v,0.12); });
    openSteps.forEach(s=>{ if(rec.hats==='8th'&&!(isFill||bar%2===1)) return; at(bar,s,46,(rec.hats==='8th'?0.6:0.7)*sh.hato[s],0.3); });
    if(rec.shaker) for(let s=0;s<16;s++){ const v=s%2===1?0.55:0.3; if(E<=2&&s%2===0) continue; at(bar,s,44,v*sh.shaker[s],0.1); }
    if(rec.ride&&(E>=4||isB)) [2,6,10,14].forEach(s=>at(bar,s,51,0.5,0.4));
    /* percussion */
    percNotes.forEach((n,i)=>{ if(i>0&&!isB&&E<4) return; const p=isB?percB[n]:percPat[n]; for(let s=0;s<16;s++) if(p[s]==='x') at(bar,s,n,(0.55+r()*0.15)*sh.perc[s],0.15); });
    if(rec.crash&&phrase===0&&bar>0) at(bar,0,49,0.6,1.5,false);
    /* fills */
    if(isFill){
      if(fillKind==='snareroll') for(let s=12;s<16;s++){ at(bar,s,38,0.45+(s-12)*0.15,0.1,false); if(E>=3) ev.push({b:bar*4+s/4+0.125,d:0.08,n:38,v:0.35+(s-12)*0.1}); }
      if(fillKind==='tom') [[12,50],[13,48],[14,47],[15,45]].forEach(([s,n])=>at(bar,s,n,0.8,0.2,false));
      if(fillKind==='openhat') at(bar,15,46,0.8,0.4,false);
      if(fillKind==='clapflam') [13,14,15].forEach((s,i)=>at(bar,s,39,0.5+i*0.15,0.15,false));
      if(fillKind==='hatroll') for(let k=0;k<8;k++) ev.push({b:bar*4+3+k/8,d:0.06,n:42,v:0.4+k*0.07});
    }
  }
  ev.sort((a,b)=>a.b-b.b);
  const words=[];
  words.push({four:'four-to-the-floor kick',broken:'broken garage kick',boombap:'boom-bap kick',trap:'trap kick',drill:'drill kick',pop:'pop kick',halftime:'half-time kick',dnb:'two-step drum & bass kick',bhangra:'bhangra kick'}[rec.kick]||'kick');
  if(rec.back!=='none') words.push({clap:'clap',snare:'snare',rim:'rim',dembow:'dembow snare'}[rec.back]+(rec.kick==='halftime'||rec.kick==='trap'?' on 3':' on 2 and 4'));
  words.push({offbeat:'off-beat hats',offbeat16:'off-beat hats with 16th ghosts','8th':'8th hats','16th':'16th hats',shuffle16:'shuffled 16th hats',trap:'trap hats with rolls',drill:'drill hats',none:'no hats'}[rec.hats]||'hats');
  if(rec.open) words.push('open hats'); if(rec.shaker) words.push('shaker'); if(rec.ride) words.push('ride');
  if(percNotes.length) words.push(percNotes.map(n=>({37:'rims',45:'congas',47:'toms',56:'cowbell',50:'high toms'}[n])).join(' and '));
  if(rec.swing>=0.06) words.push(`${swingName(rec.swing)} (about ${swingPct(rec.swing)}%)`); if(fillEvery){ const fw=fillKind==='snareroll'?'snare roll':fillKind==='tom'?'tom fill':fillKind==='drop'?'kick drop':fillKind==='openhat'?'open-hat lift':fillKind==='clapflam'?'clap build':'hat roll'; words.push(`${/^[aeiou]/.test(fw)?'an':'a'} ${fw} every ${fillEvery} bars`); }
  if(0) words.push(`a ${fillKind==='snareroll'?'snare roll':fillKind==='tom'?'tom fill':fillKind==='drop'?'kick drop':fillKind==='openhat'?'open-hat lift':fillKind==='clapflam'?'clap build':'hat roll'} every ${fillEvery} bars`);
  return {events:ev,desc:words.join(', ')};
}
