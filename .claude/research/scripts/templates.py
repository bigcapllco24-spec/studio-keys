import json, sys, statistics as st
from collections import defaultdict
clips = json.load(open(sys.argv[1]))
ROLES=['kick','snare','clap','rim','hatc','hato','shaker','perc','tom','ride']
def classify(c):
    ns=c['notes']; near=[]
    for n in ns:
        g=round(n['t']*4)/4; off=n['t']-g
        if abs(off)<=0.1: near.append((int(round(n['t']*4))%16, off))
    odd=[o for s,o in near if s%2]; ev=[o for s,o in near if s%2==0]
    sw=((st.mean(odd) if odd else 0)-(st.mean(ev) if ev else 0))/0.25
    loose=sum(1 for n in ns if 0.004<abs(n['t']-round(n['t']*4)/4)<0.1 and not (abs((n['t']*4)%1-1/3)<0.03))/max(1,len(ns))
    trip=sum(1 for n in ns if min(abs(n['t']%1-1/3),abs(n['t']%1-2/3))<0.025)/len(ns)
    if trip>0.35: return 'triplet', sw
    if sw>0.18: return 'swing16', sw
    if loose>0.25: return 'live', sw
    return 'straight', sw
def band(b): return '60-90' if b<=90 else '91-110' if b<=110 else '111-130' if b<=130 else '131-160'
groups=defaultdict(list)
for c in clips:
    if not c['notes']: continue
    k,sw=classify(c); c['feel']=k; c['sw']=sw; groups[(k,band(c['bpm']))].append(c); groups[(k,'all')].append(c)
out={}
for (k,b),cs in sorted(groups.items()):
    T={'clips':len(cs),'swing':round(st.median([c['sw'] for c in cs]),3)}
    vel={};off={};prob={};ghost=[]
    for r in ROLES:
        V=[[] for _ in range(16)]; O=[]; P=[0]*16; nclip=0
        for c in cs:
            rn=[n for n in c['notes'] if n['r']==r]
            if not rn: continue
            nclip+=1; mx=max(n['v'] for n in rn); bars=c['len']/4
            hit=[0]*16
            for n in rn:
                q=round(n['t']*4); s=q%16; o=n['t']-q/4
                if abs(o)>0.1: continue
                V[s].append(n['v']/mx); hit[s]+=1/bars
                if k in('live','straight') or s%2==0: O.append(o*60000/c['bpm'])
            for s in range(16): P[s]+=min(1,hit[s])
        if nclip<3: continue
        vel[r]=[round(st.mean(v),2) if v else 0 for v in V]
        prob[r]=[round(p/nclip,2) for p in P]
        if O: off[r]={'mean_ms':round(st.mean(O),1),'sd_ms':round(st.pstdev(O),1)}
        if r=='snare':
            for c in cs:
                sv=[n['v'] for n in c['notes'] if n['r']=='snare']
                if len(sv)>3: m=max(sv); g=[v/m for v in sv if v/m<0.6]
                else: g=[]
                ghost+=g
    T.update(vel=vel,prob=prob,off=off,ghost=round(st.mean(ghost),2) if ghost else None,ghostShare=None)
    out[f'{k}|{b}']=T
json.dump(out,open(sys.argv[2],'w'),indent=1)
for key,T in out.items():
    print(key, T['clips'], 'swing',T['swing'],'ghost',T['ghost'])
    for r in ('kick','snare','clap','hatc','hato','shaker','perc'):
        if r in T['vel']: print('  ',r.ljust(6),'vel',T['vel'][r]); print('  ',' '*6,'prb',T['prob'][r], T['off'].get(r))
