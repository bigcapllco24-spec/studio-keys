"""Build index.html from src/. Run from the repo root: python3 tools/build.py"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'src')
PARTS=['dsp.js','core.js','synth.js','synth2.js','instruments.js','fx.js','mixer.js','play.js','midi.js','controller.js','music.js','groove.js','studio.js','daw.js','maker.js','actions.js','edit.js','mic.js','assistant.js','spotify.js','store.js','lab.js','demo.js','boot.js']
js="'use strict';\n"+"\n".join(open(os.path.join(SRC,p),encoding='utf-8').read() for p in PARTS)
samples=open(os.path.join(SRC,'samples.json'),encoding='utf-8').read().replace('</','<\\/')
body=open(os.path.join(SRC,'body.html'),encoding='utf-8').read().replace('__SAMPLES__',samples)
lame=open(os.path.join(SRC,'vendor','lame.min.js'),encoding='utf-8').read()
vendor="<script>\n/* LAME MP3 encoder: lamejs 1.2.1 (https://github.com/zhuker/lamejs), a JavaScript port of LAME (https://lame.sourceforge.io).\n   License: LGPL-3.0. Included unmodified as a separate script so it can be replaced. Used only for the MP3 download. */\n"+lame+"\n</script>\n"
html=open(os.path.join(SRC,'head.html'),encoding='utf-8').read()+body+vendor+"<script>\n"+js+"\n</script>\n</body>\n</html>\n"
open(os.path.join(ROOT,'index.html'),'w',encoding='utf-8').write(html)
print('index.html', len(html), 'bytes')
