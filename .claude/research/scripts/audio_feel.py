import soundfile as sf, numpy as np, glob, os, re, json, sys
from scipy.signal import stft
root=sys.argv[1]; out=sys.argv[2]
BANDS=[('sub',20,60),('low',60,250),('lowmid',250,2000),('high',2000,8000),('air',8000,24000)]
rows=[]
for f in sorted(glob.glob(root+'/**/*.wav',recursive=True)):
    cat=os.path.basename(os.path.dirname(f)); name=os.path.basename(f)
    m=re.search(r'_(\d{2,3})_?BPM',name) or re.search(r'_(\d{3})_[A-G]',name); bpm=int(m.group(1)) if m else None
    if bpm and bpm<60: bpm=None
    x,sr=sf.read(f,always_2d=True); x=x.astype(np.float64)
    mono=x.mean(1); mid=mono; side=(x[:,0]-x[:,-1])/2 if x.shape[1]>1 else np.zeros_like(mono)
    peak=np.abs(x).max(); rms=np.sqrt((mono**2).mean())+1e-12
    F,T,Z=stft(mono,sr,nperseg=4096,noverlap=3072); P=(np.abs(Z)**2).mean(1)
    tot=P[(F>=20)].sum(); bands={b:round(float(10*np.log10(P[(F>=lo)&(F<hi)].sum()/tot+1e-12)),1) for b,lo,hi in BANDS}
    width=float(np.sqrt((side**2).mean())/ (np.sqrt((mid**2).mean())+1e-12))
    r=dict(cat=cat,name=name,bpm=bpm,dur=round(len(mono)/sr,2),peak_db=round(20*np.log10(peak+1e-12),1),rms_db=round(20*np.log10(rms),1),crest_db=round(20*np.log10((peak+1e-12)/rms),1),width=round(width,2),bands=bands)
    # onset feel for percussion loops
    if cat=='Percussion Loops' and bpm:
        hop=128; n=1024
        F2,T2,Z2=stft(mono,sr,nperseg=n,noverlap=n-hop); mag=np.abs(Z2)
        hf=mag[(F2>150)]
        flux=np.maximum(0,np.diff(np.log1p(hf*50),axis=1)).sum(0)
        flux=np.convolve(flux,np.ones(3)/3,'same')
        thr=np.median(flux)+1.5*flux.std()
        pk=[i for i in range(1,len(flux)-1) if flux[i]>thr and flux[i]>=flux[i-1] and flux[i]>flux[i+1]]
        # min gap 40ms
        ons=[];last=-1e9
        for i in pk:
            t=T2[i+1]
            if t-last>0.04: ons.append((t,flux[i])); last=t
        beat=60/bpm; s16=beat/4; offs=[];steps=[]
        for t,v in ons:
            q=round(t/s16); o=t-q*s16
            if abs(o)<s16*0.45: offs.append(o*1000); steps.append((q%16, v, o*1000))
        if len(offs)>8:
            arr=np.array(offs); odd=[o for s,v,o in steps if s%2]; ev=[o for s,v,o in steps if s%2==0]
            acc=np.zeros(16); cnt=np.zeros(16)
            for s,v,o in steps: acc[s]+=v; cnt[s]+=1
            vel=np.where(cnt>0,acc/np.maximum(cnt,1),0); vel=vel/vel.max()
            r['feel']=dict(onsets=len(offs),offset_ms_mean=round(float(np.mean(ev) if ev else 0),1),swing_ms=round(float((np.mean(odd) if odd else 0)-(np.mean(ev) if ev else 0)),1),spread_ms=round(float(np.std(arr)),1),vel=[round(float(v),2) for v in vel],density=[round(float(c),1) for c in cnt/(len(mono)/sr/(beat*4))])
    rows.append(r)
json.dump(rows,open(out,'w'),indent=1)
print(len(rows),'loops')
