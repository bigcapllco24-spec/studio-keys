import json, sys, statistics as st
R=json.load(open(sys.argv[1]))
MIN=[0,2,3,5,7,8,10]; MAJ=[0,2,4,5,7,9,11]
out={'progressions':{'minor':[],'major':[]},'voicing':{},'rhythm':{}}
spreads=[];sizes=[];colors={'add9':0,'sus':0,'7th':0,'triad':0};lens=[];antic=0;total=0
for r in R:
    sc=MIN if r['minor'] else MAJ; deg=[]; ok=0
    # merge repeated identical chords (pluck rhythms)
    ch=[]
    for s,d,names,bass,n,spr in r['chords']:
        if ch and ch[-1]['bass']==bass and ch[-1]['names']==names: ch[-1]['d']=s+d-ch[-1]['s']; continue
        ch.append(dict(s=s,d=d,names=names,bass=bass,n=n,spr=spr))
    for c in ch:
        iv=(c['bass']-r['root'])%12
        if iv in sc: deg.append(sc.index(iv)); ok+=1
        else: deg.append(None)
        sizes.append(c['n']); spreads.append(c['spr']); total+=1
        if abs((c['s']*2)%2-1)<1e-6 or (c['s']%1==0.5): antic+=1
        lens.append(c['d'])
        # colour: intervals over bass
        from collections import Counter
        pcs=set((['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'].index(x)-c['bass'])%12 for x in c['names'])
        if 2 in pcs and (3 in pcs or 4 in pcs): colors['add9']+=1
        elif (2 in pcs or 5 in pcs) and not (3 in pcs or 4 in pcs): colors['sus']+=1
        elif 10 in pcs or 11 in pcs: colors['7th']+=1
        else: colors['triad']+=1
    if ok/len(ch)<0.75: print('skip (key label mismatch):',r['file']); continue
    pat=[(d, round(c['d']/4,2)) for d,c in zip(deg,ch)]
    out['progressions']['minor' if r['minor'] else 'major'].append({'deg':[p[0] for p in pat],'bars':[p[1] for p in pat]})
out['voicing']={'notes_median':st.median(sizes),'spread_semitones_median':st.median(spreads),'spread_range':[min(spreads),max(spreads)],'colour_share':{k:round(v/total,2) for k,v in colors.items()}}
out['rhythm']={'chord_len_bars_median':st.median(lens)/4,'offbeat_starts_share':round(antic/total,2)}
for k,v in out['progressions'].items():
    print(k); [print('  ',p) for p in v]
print(out['voicing']); print(out['rhythm'])
json.dump(out,open(sys.argv[2],'w'),indent=1)
