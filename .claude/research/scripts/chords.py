import mido, glob, sys, os, re, json
from collections import defaultdict
NOTE=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
def keyroot(k):
    m=re.match(r'([A-G][#b]?)',k); n=m.group(1); return {'Db':1,'D#':3,'Gb':6,'G#':8,'A#':10}.get(n, NOTE.index(n) if n in NOTE else None)
res=[]
for f in sorted(glob.glob(sys.argv[1]+'/**/*.mid',recursive=True)):
    mid=mido.MidiFile(f); tpb=mid.ticks_per_beat; t=0; on={}; notes=[]
    for msg in mido.merge_tracks(mid.tracks):
        t+=msg.time
        if msg.type=='note_on' and msg.velocity>0: on[msg.note]=(t,msg.velocity)
        elif msg.type in('note_off','note_on') and msg.note in on:
            s,v=on.pop(msg.note); notes.append((s/tpb,(t-s)/tpb,msg.note,v))
    name=os.path.basename(f); km=re.search(r'_120bpm_(.+?)[ _]Chords',name); key=km.group(1)
    minor='min' in key or 'Dorian' in key; root=keyroot(key)
    # group by onset
    groups=defaultdict(list)
    for s,d,n,v in notes: groups[round(s*4)/4].append((n,d,v))
    chords=[]
    for s in sorted(groups):
        ns=sorted(set(n for n,_,_ in groups[s]))
        if len(ns)<2: continue
        chords.append((s,max(d for _,d,_ in groups[s]),ns))
    length=max(s+d for s,d,_,_ in notes)
    res.append(dict(file=name,key=key,root=root,minor=minor,bars=round(length/4),nchords=len(chords),
        chords=[(s,round(d,2),[NOTE[n%12] for n in ns],ns[0],len(ns),ns[-1]-ns[0]) for s,d,ns in chords]))
for r in res:
    print(r['file'],r['key'],r['bars'],'bars',r['nchords'],'chords')
    for c in r['chords'][:10]: print('   ',c)
json.dump(res,open(sys.argv[2],'w'))
