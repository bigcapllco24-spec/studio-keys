
/* ---------- your sound: Spotify (PKCE, no server secret) or typed artists → a taste profile the assistant uses ----------
   Reads only: top artists, top tracks, recently played and the person's own playlists (Spotify's 2026 Development
   Mode rules only return the contents of playlists the user owns or collaborates on). Tokens stay in this browser. */
const SP={id:store.get('spClientId',''),tok:store.get('spTok',null),api:'https://api.spotify.com/v1'};
const SP_SCOPES='user-top-read user-read-recently-played playlist-read-private playlist-read-collaborative';
const spRedirect=()=>location.origin+location.pathname;
const b64url=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function spConfig(){ if(SP.id) return SP.id; if(!/^https?:$/.test(location.protocol)) return ''; try{ const r=await fetch('/api/config',{cache:'no-store'}); const j=await r.json(); if(j&&j.spotifyClientId){ SP.id=j.spotifyClientId; } }catch(e){} return SP.id; }
async function spLogin(){
  const id=await spConfig();
  if(!id){ $('#spSetup').open=true; $('#spClientId').focus(); tasteMsg('Add your Spotify Client ID first (steps below).'); return; }
  if(!/^https?:$/.test(location.protocol)){ tasteMsg('Spotify login works on the live site, not from a file opened on your computer.'); return; }
  const v=b64url(crypto.getRandomValues(new Uint8Array(48))), ch=b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))), st=b64url(crypto.getRandomValues(new Uint8Array(12)));
  sessionStorage.setItem('spVerifier',v); sessionStorage.setItem('spState',st);
  const q=new URLSearchParams({response_type:'code',client_id:id,scope:SP_SCOPES,redirect_uri:spRedirect(),code_challenge_method:'S256',code_challenge:ch,state:st});
  location.href='https://accounts.spotify.com/authorize?'+q;
}
async function spToken(body){ const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(Object.assign({client_id:SP.id},body))}); const j=await r.json(); if(!r.ok) throw new Error(j.error_description||j.error||('HTTP '+r.status)); return j; }
function spSaveTok(j){ SP.tok={access:j.access_token,refresh:j.refresh_token||(SP.tok&&SP.tok.refresh),exp:Date.now()+(j.expires_in-60)*1000}; store.set('spTok',SP.tok); }
async function spAccess(){ if(!SP.tok) return null; if(Date.now()<SP.tok.exp) return SP.tok.access; if(!SP.tok.refresh) return null; try{ spSaveTok(await spToken({grant_type:'refresh_token',refresh_token:SP.tok.refresh})); return SP.tok.access; }catch(e){ SP.tok=null; store.set('spTok',null); return null; } }
async function spGet(path){ const a=await spAccess(); if(!a) throw new Error('not connected'); const r=await fetch(SP.api+path,{headers:{authorization:'Bearer '+a}}); if(r.status===204) return {}; const j=await r.json().catch(()=>({})); if(!r.ok) throw Object.assign(new Error((j.error&&j.error.message)||('HTTP '+r.status)),{status:r.status}); return j; }
async function spCallback(){
  const q=new URLSearchParams(location.search); if(!q.has('code')&&!q.has('error')) return;
  const clean=()=>history.replaceState(null,'',location.pathname+location.hash);
  if(q.get('error')){ clean(); tasteMsg('Spotify connection was cancelled.'); return; }
  if(q.get('state')!==sessionStorage.getItem('spState')){ clean(); tasteMsg('That Spotify sign-in didn’t match this page. Try Connect again.'); return; }
  await spConfig();
  try{ spSaveTok(await spToken({grant_type:'authorization_code',code:q.get('code'),redirect_uri:spRedirect(),code_verifier:sessionStorage.getItem('spVerifier')||''})); clean(); await spBuildProfile(); document.getElementById('studio').scrollIntoView({block:'start'}); }
  catch(e){ clean(); tasteMsg('Couldn’t finish connecting Spotify: '+e.message); }
}
/* genre words → our styles */
const GENRE_STYLE=[['melodictechno',/melodic techno|afterlife|indie dance|dark disco/],['melodichouse',/melodic house|progressive trance|organic electronic|deep euro/],['organichouse',/organic house|ethnotronica|downtempo house/],['deephouse',/deep house|lo-fi house/],['techhouse',/tech house|bass house|minimal tech/],['progressive',/progressive house|big room|edm|electro house|future house/],['afro',/afro house|afro tech|south african house/],['amapiano',/amapiano|gqom/],['techno',/techno|hard techno|industrial|minimal/],['ukg',/uk garage|2-step|speed garage|bassline/],['liquid',/liquid funk|liquid drum/],['dnb',/drum and bass|jungle|neurofunk/],['dubstep',/dubstep|riddim|brostep/],['downtempo',/downtempo|chillwave|trip hop|ambient|electronica|chill/],['synthwave',/synthwave|retrowave|darkwave|new wave/],['nudisco',/nu disco|disco|funk|french house/],['drill',/drill/],['trap',/trap|rage|phonk/],['boombap',/boom bap|jazz rap|old school hip hop/],['lofi',/lo-fi|lofi|chillhop/],['hiphop',/hip hop|rap/],['punjabi',/punjabi|bhangra|desi hip hop/],['bollywood',/bollywood|filmi|indian pop|hindi/],['reggaeton',/reggaeton|latin|urbano/],['rock',/rock|indie|alternative|metal/],['pop',/pop/],['house',/house/]];
function styleOfText(s){ s=String(s||'').toLowerCase(); const hit=GENRE_STYLE.find(([k,re])=>re.test(s)); return hit?hit[0]:null; }
function scoreStyles(artists,genres,playlistNames){
  const sc={}; const add=(k,w)=>{ if(k&&STYLES[k]) sc[k]=(sc[k]||0)+w; };
  artists.forEach((a,i)=>{ const A=findArtist(a); if(A) add(A.style,3/(1+i*0.15)); });
  genres.forEach((g,i)=>add(styleOfText(g),1.5/(1+i*0.1)));
  playlistNames.forEach(n=>add(styleOfText(n),1));
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([style,score])=>({style,score:Math.round(score*10)/10}));
}
async function spBuildProfile(){
  tasteMsg('Reading your Spotify listening…');
  const safe=p=>spGet(p).catch(e=>{ console.warn('spotify',p,e.message); return null; });
  const [me,ta,ts,tt,rp,pl]=await Promise.all([safe('/me'),safe('/me/top/artists?limit=30&time_range=medium_term'),safe('/me/top/artists?limit=20&time_range=short_term'),safe('/me/top/tracks?limit=30&time_range=medium_term'),safe('/me/player/recently-played?limit=50'),safe('/me/playlists?limit=30')]);
  if(!me&&!ta&&!tt){ tasteMsg('Spotify didn’t share any data. If the app is in Development Mode, add your Spotify email under User Management in the Spotify dashboard, then try again.'); return; }
  const names=[], genres=[], seen=new Set(); const push=n=>{ if(n&&!seen.has(n)){ seen.add(n); names.push(n); } };
  [ts,ta].forEach(r=>r&&(r.items||[]).forEach(a=>{ push(a.name); (a.genres||[]).forEach(g=>genres.push(g)); }));
  const tracks=((tt&&tt.items)||[]).map(t=>({name:t.name,artist:(t.artists||[]).map(a=>a.name).join(', ')}));
  tracks.forEach(t=>t.artist.split(', ').forEach(push)); ((rp&&rp.items)||[]).forEach(x=>x.track&&(x.track.artists||[]).forEach(a=>push(a.name)));
  const myId=me&&me.id, lists=((pl&&pl.items)||[]).filter(Boolean);
  const own=lists.filter(p=>!myId||(p.owner&&p.owner.id===myId)||p.collaborative).slice(0,8), playlists=[];
  for(const p of own){ const r=await safe(`/playlists/${p.id}/items?limit=50&fields=items(item(name,artists(name)),track(name,artists(name)))`); const arts=[];
    ((r&&r.items)||[]).forEach(x=>{ const tr=x.item||x.track; if(tr&&tr.artists) tr.artists.forEach(a=>arts.push(a.name)); });
    const st=scoreStyles(arts,[],[p.name]); playlists.push({name:p.name,artists:[...new Set(arts)].slice(0,8),style:st[0]?st[0].style:styleOfText(p.name)}); }
  const profile={source:'spotify',user:me?me.display_name:'',artists:names.slice(0,25),genres:[...new Set(genres)].slice(0,15),tracks:tracks.slice(0,15),playlists,styles:scoreStyles(names,genres,lists.map(p=>p.name)),at:Date.now()};
  setTaste(profile);
}
function setTaste(p){ TASTE.profile=p; store.set('taste',p); renderTaste(); }
function tasteMsg(m){ $('#tasteStatus').textContent=m; }
function renderTaste(){
  const p=TASTE.profile, on=!!(SP.tok&&SP.tok.refresh);
  $('#spConnect').hidden=on; $('#spRefresh').hidden=!on; $('#spOff').hidden=!on;
  if(!p){ $('#tasteChips').innerHTML=''; tasteMsg('Connect Spotify or name a few artists, and requests like “make a beat” will lean your way.'); return; }
  const st=(p.styles||[]).map(s=>`<span class="tc st">${esc((STYLES[s.style]||{}).name||s.style)}</span>`).join('');
  const ar=(p.artists||[]).slice(0,12).map(a=>`<span class="tc">${esc(a)}${findArtist(a)?' ✓':''}</span>`).join('');
  $('#tasteChips').innerHTML=st+ar+((p.playlists||[]).length?`<span class="tc" title="${esc(p.playlists.map(x=>x.name).join(', '))}">${p.playlists.length} of your playlists</span>`:'');
  const top=(p.styles||[])[0]; tasteMsg(`${p.source==='spotify'?'From your Spotify'+(p.user?' ('+p.user+')':''):'From the artists you typed'}: ${top?'mostly '+(STYLES[top.style]||{}).name:'no clear style yet'}. “${ASSIST.name}, make a beat” now starts there; name an artist or style to go elsewhere. Artists marked ✓ have a sound I know how to build.`);
}
$('#spConnect').onclick=spLogin;
$('#spRefresh').onclick=()=>spBuildProfile();
$('#spOff').onclick=()=>{ SP.tok=null; store.set('spTok',null); if(TASTE.profile&&TASTE.profile.source==='spotify') setTaste(null); renderTaste(); tasteMsg('Spotify disconnected. Your listening data was removed from this browser.'); };
$('#tasteForm').addEventListener('submit',e=>{ e.preventDefault(); const list=$('#tasteArtists').value.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean); if(!list.length){ if(TASTE.profile&&TASTE.profile.source==='typed') setTaste(null); return; }
  setTaste({source:'typed',artists:list,genres:[],tracks:[],playlists:[],styles:scoreStyles(list,list,[]),at:Date.now()}); });
$('#spIdForm').addEventListener('submit',e=>{ e.preventDefault(); const v=$('#spClientId').value.trim(); if(!/^[0-9a-f]{32}$/i.test(v)){ tasteMsg('That doesn’t look like a Spotify Client ID (32 letters and numbers).'); return; } SP.id=v; store.set('spClientId',v); $('#spSetup').open=false; spLogin(); });
$('#spRedirect').textContent=spRedirect();
TASTE.profile=store.get('taste',null); if(TASTE.profile&&TASTE.profile.source==='typed') $('#tasteArtists').value=TASTE.profile.artists.join(', ');
renderTaste(); spCallback();
/* the assistant can use a playlist as the vibe: "drums like my Sunset playlist" */
function findPlaylist(ref){ const p=TASTE.profile; if(!p||!p.playlists||!ref) return null; const r=normName(ref).replace(/\bplaylist\b/,'').trim(); return p.playlists.find(x=>normName(x.name)===r)||p.playlists.find(x=>r&&normName(x.name).includes(r))||null; }
