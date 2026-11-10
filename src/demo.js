/* ---------- demo loop: rendered offline with the built-in instruments ---------- */
async function makeDemo(){
  const sr=44100, dur=8, oc=new OfflineAudioContext(2,sr*dur,sr), beat=0.5;
  const bus=(gain,pan)=>{ const g=oc.createGain(); g.gain.value=gain; const p=oc.createStereoPanner(); p.pan.value=pan; g.connect(p).connect(oc.destination); return g; };
  const drums=bus(0.8,0), hats=bus(0.5,0.25), bass=bus(0.75,0), lead=bus(0.55,0), padL=bus(0.35,-0.9), padR=bus(0.35,0.9);
  for(let b=0;b<16;b++){ const t=b*beat; playDrum(oc,drums,36,0.95,t); if(b%2===1) playDrum(oc,drums,38,0.8,t); playDrum(oc,hats,42,0.7,t+beat/2); playDrum(oc,hats,42,0.3,t); }
  const roots=[33,29,36,31], pat=[0,12,0,0,12,0,7,0];
  roots.forEach((r,bar)=>pat.forEach((o,i)=>{ const t=bar*2+i*0.25, v=playAcid(oc,bass,r+o,i%4===0?0.95:0.6,t); v.release(t+0.17); }));
  [[69,0,1],[72,1,1],[76,2,2],[74,4,2],[72,6,1],[69,7,1],[67,8,2],[69,10,1],[72,11,1],[71,12,3],[67,15,1]].forEach(([n,s,l])=>{ const t=s*beat, v=playLead(oc,lead,n,0.8,t); v.release(t+l*beat-0.03); });
  [[57,60,64],[53,57,60],[55,60,64],[55,59,62]].forEach((ch,bar)=>ch.forEach(n=>{ const t=bar*2; const a=playPad(oc,padL,n,0.6,t), b=playPad(oc,padR,n,0.6,t); b.srcs.forEach(s=>{ if(s.detune) s.detune.value+=9; }); a.release(t+1.9); b.release(t+1.9); }));
  const out=await oc.startRendering(); let pk=0;
  for(let ch=0;ch<2;ch++){ const d=out.getChannelData(ch); for(let i=0;i<d.length;i++) pk=Math.max(pk,Math.abs(d[i])); }
  if(pk>0) for(let ch=0;ch<2;ch++){ const d=out.getChannelData(ch); for(let i=0;i<d.length;i++) d[i]*=0.89/pk; }
  return out;
}
async function loadDemo(autoExtract){
  labStatus('Rendering the demo loop…');
  try{ const buf=await makeDemo(); setSong(buf,'Demo loop',[0,8]); if(autoExtract) await extract(); else labStatus('Demo loop made in your browser: kick, snare, hats, acid bass, lead and a wide pad.'); }
  catch(e){ console.error(e); labStatus('The demo couldn’t render in this browser. Load your own song instead.'); }
}
$('#demoBtn').onclick=()=>loadDemo(false);

