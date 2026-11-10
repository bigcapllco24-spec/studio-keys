"""Build index.html from src/. Run from the repo root: python3 tools/build.py"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'src')
PARTS=['dsp.js','core.js','synth.js','synth2.js','instruments.js','fx.js','mixer.js','play.js','midi.js','controller.js','music.js','studio.js','maker.js','mic.js','store.js','lab.js','demo.js','boot.js']
js="'use strict';\n"+"\n".join(open(os.path.join(SRC,p),encoding='utf-8').read() for p in PARTS)
samples=open(os.path.join(SRC,'samples.json'),encoding='utf-8').read().replace('</','<\\/')
body=open(os.path.join(SRC,'body.html'),encoding='utf-8').read().replace('__SAMPLES__',samples)
html=open(os.path.join(SRC,'head.html'),encoding='utf-8').read()+body+"<script>\n"+js+"\n</script>\n</body>\n</html>\n"
open(os.path.join(ROOT,'index.html'),'w',encoding='utf-8').write(html)
print('index.html', len(html), 'bytes')
