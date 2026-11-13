"""Draw the Studio Keys app icons (the 3x3 logo) into pwa/. Run from the repo root: python3 tools/make_icons.py
Matte Emerald colours from :root[data-theme="emerald"] in src/head.html; no gradients or glows. Needs Pillow."""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'pwa')
T1, T3, T6 = '#07120e', '#0f2019', '#234436'      # surfaces
INK2, ACCENT = '#d5e8de', '#1fbf83'                # squares; the top-middle square is the accent
SS = 4                                             # draw 4x larger, then scale down for smooth edges


def grid(d, cx, cy, span):
    """The 3x3 squares, `span` px wide in total, centred on (cx, cy)."""
    gap = span * 0.11
    cell = (span - 2 * gap) / 3
    x0, y0 = cx - span / 2, cy - span / 2
    for i in range(9):
        r, c = divmod(i, 3)
        x, y = x0 + c * (cell + gap), y0 + r * (cell + gap)
        d.rounded_rectangle([x, y, x + cell, y + cell], radius=cell * 0.12, fill=ACCENT if i == 1 else INK2)


def icon(size, kind):
    S = size * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if kind == 'any':        # a rounded tile with a thin border, like the logo in the top bar
        b = S * 0.035
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 0.22, fill=T6)
        d.rounded_rectangle([b, b, S - 1 - b, S - 1 - b], radius=S * 0.22 - b, fill=T3)
        grid(d, S / 2, S / 2, S * 0.52)
    elif kind == 'maskable':  # full bleed; the logo stays inside the central safe circle (80%)
        d.rectangle([0, 0, S, S], fill=T1)
        grid(d, S / 2, S / 2, S * 0.42)
    else:                     # apple: full bleed square, iOS rounds the corners itself
        d.rectangle([0, 0, S, S], fill=T3)
        grid(d, S / 2, S / 2, S * 0.5)
    return im.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, size, kind in [('icon-192.png', 192, 'any'), ('icon-512.png', 512, 'any'),
                             ('icon-maskable-512.png', 512, 'maskable'), ('apple-touch-icon.png', 180, 'apple')]:
        im = icon(size, kind)
        if kind != 'any':
            im = im.convert('RGB')   # no transparency where the system fills the shape
        im.save(os.path.join(OUT, name), optimize=True)
        print(name, size, os.path.getsize(os.path.join(OUT, name)), 'bytes')
