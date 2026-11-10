import subprocess, base64, json, os, re
NOTE={'C':0,'Db':1,'D':2,'Eb':3,'E':4,'F':5,'Gb':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11,'Ds':3,'Fs':6}
def midi(name):
    m=re.match(r'([A-G][bs]?)(-?\d)',name); return (int(m.group(2))+1)*12+NOTE[m.group(1)]
def enc(path, mono=True, br='48k', dur=None, fade=None, gain=None):
    af=[]
    if dur: af.append(f'atrim=0:{dur}')
    if fade: af.append(f'afade=t=out:st={max(0,dur-fade)}:d={fade}')
    if gain: af.append(f'volume={gain}')
    cmd=['ffmpeg','-v','error','-i',path]+(['-af',','.join(af)] if af else [])+['-ac','1' if mono else '2','-ar','44100','-b:a',br,'-f','mp3','-']
    out=subprocess.run(cmd,capture_output=True,check=True).stdout
    return base64.b64encode(out).decode()
data={}
# Salamander grand
pn={}
for f in sorted(os.listdir('tone/salamander')):
    if not f.endswith('.mp3'): continue
    m=midi(f[:-4]); d=max(3.0,min(7.0,7-(m-21)*0.06))
    pn[m]=enc('tone/salamander/'+f,mono=False,br='80k',dur=d,fade=1.4)
data['piano']=pn
for inst,key in [('acoustic_bass','acBass'),('slap_bass_1','slapBass'),('synth_bass_1','synBass'),('marimba','marimba'),('kalimba','kalimba'),('flute','flute'),('alto_sax','sax'),('trumpet','trumpet'),('cello','cello'),('orchestral_harp','harp'),('electric_guitar_clean','eguitar'),('sitar','sitar'),('shanai','shanai'),('steel_drums','steeldrum'),('electric_piano_1','epiano'),('string_ensemble_1','strings'),('acoustic_guitar_nylon','guitar'),('electric_bass_finger','bass'),('choir_aahs','choir'),('vibraphone','vibes'),('brass_section','brass')]:
    d={}
    for f in sorted(os.listdir('fluid/'+inst)):
        d[midi(f[:-4])]=enc(f'fluid/{inst}/'+f,mono=True,br='40k')
    data[key]=d
for kit,key in [('acoustic-kit','kitAcoustic'),('Techno','kitTechno'),('LINN','kitLinn'),('Kit8','kitKit8'),('KPR77','kitKPR77'),('R8','kitR8'),('Stark','kitStark'),('Bongos','kitBongos'),('Kit3','kitKit3'),('4OP-FM','kitFM')]:
    d={}
    for f in sorted(os.listdir('tone/drum-samples/'+kit)):
        d[f[:-4]]=enc(f'tone/drum-samples/{kit}/'+f,mono=True,br='96k')
    data[key]=d
data['irHall']={'ir':enc('tone/impulse-responses/matrix-reverb3.mp3',mono=False,br='96k')}
s=json.dumps(data,separators=(',',':'))
open('/home/claude/studio-keys/samples.json','w').write(s)
print('total base64 MB',round(len(s)/1e6,2))
for k,v in data.items(): print(k,len(v),round(sum(len(x) for x in v.values())/1e3),'KB')
