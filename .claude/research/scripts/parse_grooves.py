import sys, os, gzip, re, json, glob
import xml.etree.ElementTree as ET
root_dir = sys.argv[1]; out = sys.argv[2]
GM = {35:'kick',36:'kick',37:'rim',38:'snare',39:'clap',40:'snare',42:'hatc',44:'hatc',46:'hato',41:'tom',43:'tom',45:'tom',47:'tom',48:'tom',50:'tom',49:'cym',51:'ride',53:'ride',57:'cym',54:'perc',56:'perc',60:'perc',61:'perc',62:'perc',63:'perc',64:'perc',69:'shaker',70:'shaker',75:'perc'}
def role(name, note):
    n = (name or '').lower()
    rules = [('kick',r'kick|\bbd\b|bassdrum|bass drum|\bkik'),('clap',r'clap|\bcp\b|snap'),('rim',r'rim|stick|\brs\b'),
             ('snare',r'snare|\bsd\b|\bsn\b'),('hato',r'open|\boh\b|ohh|\bohat'),('hatc',r'hat|\bhh\b|\bch\b|closed'),
             ('ride',r'ride'),('cym',r'crash|cymbal|splash|china'),('shaker',r'shak|tamb|maraca|cabasa'),
             ('tom',r'tom'),('perc',r'conga|bongo|cowbell|perc|clave|block|tabla|djembe|agogo|tri|guiro|timb')]
    for r_, rx in rules:
        if re.search(rx, n): return r_
    return GM.get(note, 'perc')
clips = []
for f in sorted(glob.glob(os.path.join(root_dir, '**/*.alc'), recursive=True)):
    x = ET.fromstring(gzip.open(f).read())
    tempo_m = re.search(r'_(\d+) bpm', f); bpm = int(tempo_m.group(1)) if tempo_m else None
    kit = re.sub(r' groove \d+_\d+ bpm\.alc$', '', os.path.basename(f))
    track = x.find('.//MidiTrack')
    names = {}
    dg = track.find('.//DrumGroupDevice')
    if dg is not None:
        br = dg.find('Branches')
        for b in (br if br is not None else []):
            rn = b.find('.//BranchInfo/ReceivingNote') if b.find('.//BranchInfo/ReceivingNote') is not None else None
            # pick the branch's own ReceivingNote: last one in subtree
            rns = b.findall('.//ReceivingNote')
            if not rns: continue
            note = 128 - int(rns[-1].get('Value'))
            nm = b.find('Name/EffectiveName')
            names.setdefault(note, nm.get('Value') if nm is not None else '')
    clip = track.find('.//MidiClip')
    le = float(clip.find('Loop/LoopEnd').get('Value')); ls = float(clip.find('Loop/LoopStart').get('Value'))
    notes = []
    for kt in clip.findall('.//KeyTrack'):
        k = int(kt.find('MidiKey').get('Value'))
        for e in kt.findall('.//MidiNoteEvent'):
            if e.get('IsEnabled') == 'false': continue
            t = float(e.get('Time'))
            if t < ls or t >= le: continue
            notes.append({'t': round(t-ls,5), 'v': round(float(e.get('Velocity')),1), 'k': k, 'r': role(names.get(k,''), k)})
    clips.append({'file': os.path.relpath(f, root_dir), 'kit': kit, 'bpm': bpm, 'len': le-ls, 'names': {str(k):v for k,v in names.items()}, 'notes': sorted(notes, key=lambda n:n['t'])})
json.dump(clips, open(out,'w'))
print(len(clips), 'clips', sum(len(c['notes']) for c in clips), 'notes')
from collections import Counter
print(Counter(n['r'] for c in clips for n in c['notes']))
print(Counter(c['len'] for c in clips))
unk = Counter((c['names'].get(str(n['k']),''),n['k']) for c in clips for n in c['notes'] if n['r']=='perc')
print(unk.most_common(25))
