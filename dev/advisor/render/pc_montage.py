from PIL import Image, ImageDraw
import os

CAND = 'dev/pixel-art/candidates'
OUT = 'dev/advisor/render'
SEEDS = [3, 7, 11, 17, 23, 42]
ARCH = {'warrior': 16, 'rogue': 12, 'caster': 14, 'skald': 15}

def make(arch, sub):
    files = [(s, f'{CAND}/pc_{arch}_s{s}_sub{sub}.png') for s in SEEDS]
    files = [(s, f) for s, f in files if os.path.exists(f)]
    cols = len(files)
    lab = 26
    # --- 4x preview montage (sub PNG is 128x160 = 4x of 32x40) ---
    cw, ch = 128, 160
    W, H = cw * cols, ch + lab
    m = Image.new('RGB', (W, H), (18, 18, 22))
    d = ImageDraw.Draw(m)
    for i, (s, f) in enumerate(files):
        im = Image.open(f).convert('RGB')
        m.paste(im, (i * cw, lab))
        tag = f's{s}' + ('  <-- CHOSEN' if s == 42 else '')
        d.text((i * cw + 4, 8), tag, fill=(255, 255, 200) if s == 42 else (210, 210, 210))
    m.save(f'{OUT}/pc_{arch}_4x.png')
    # --- true 1x game scale: downscale to 32x40 NEAREST, upscale 5x for viewing ---
    gw, gh = 32, 40
    vs = 5
    sw, sh = gw * vs, gh * vs
    pad = 8
    W2, H2 = (sw + pad) * cols + pad, sh + lab + pad
    g = Image.new('RGB', (W2, H2), (18, 18, 22))
    dg = ImageDraw.Draw(g)
    for i, (s, f) in enumerate(files):
        im = Image.open(f).convert('RGB').resize((gw, gh), Image.NEAREST)
        im = im.resize((sw, sh), Image.NEAREST)
        x = pad + i * (sw + pad)
        g.paste(im, (x, lab))
        tag = f's{s}' + (' *' if s == 42 else '')
        dg.text((x + 2, 8), tag, fill=(255, 255, 200) if s == 42 else (210, 210, 210))
    g.save(f'{OUT}/pc_{arch}_1x.png')
    print(arch, 'done', cols, 'seeds')

for a, sub in ARCH.items():
    make(a, sub)
