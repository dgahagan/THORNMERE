import json
from PIL import Image, ImageDraw

pal = json.load(open('data/art/palette.json'))['colors']
RGB = {c['i']: tuple(int(c['hex'][i:i+2], 16) for i in (1, 3, 5)) for c in pal}
NAME = {c['i']: c['name'] for c in pal}
shade = json.load(open('data/art/palette.json'))['shade']
d = json.load(open('data/art/monsters.json'))
sp = d['sprites']

def decode(s):
    leg = s['legend']
    w, h = s['w'], s['h']
    grid = []
    for row in s['rows']:
        grid.append([leg.get(ch, -1) for ch in row])
    return w, h, grid

def render(grid, w, h, scale, shade_lvl=0):
    img = Image.new('RGB', (w*scale, h*scale), (10, 10, 12))
    px = img.load()
    for y in range(h):
        for x in range(w):
            v = grid[y][x]
            if v is None or v < 0:
                continue
            for _ in range(shade_lvl):
                v = shade[v]
            col = RGB.get(v, (255, 0, 255))
            for dy in range(scale):
                for dx in range(scale):
                    px[x*scale+dx, y*scale+dy] = col
    return img

w, h, gA = decode(sp['mon_skeleton_a'])
print('skeleton_a', w, h)

# bone-color histogram
from collections import Counter
cnt = Counter()
for row in gA:
    for v in row:
        if isinstance(v, int) and v >= 0:
            cnt[v] += 1
print('index histogram (imported gold skeleton):')
for v, c in cnt.most_common():
    print(f'   {v:2d} {NAME[v]:12s} {c}')

# Panel: frame A at 1x(x6 view), 4x, plus distance-shaded ladder lvl0..3 at game scale
scale1 = 6  # view multiplier for 1x game pixels
# 1x clean (96x80 -> x6)
img1 = render(gA, w, h, scale1)
img1.save('dev/advisor/render/skel_gold_1x.png')
# 4x preview
img4 = render(gA, w, h, 4)
img4.save('dev/advisor/render/skel_gold_4x.png')

# distance-shade ladder (how it darkens with range in-engine), game-scale x6
lab = 22
pad = 8
cols = 4
cw = w*scale1
W = (cw+pad)*cols+pad
H = h*scale1+lab+pad
ladder = Image.new('RGB', (W, H), (18, 18, 22))
dr = ImageDraw.Draw(ladder)
for lvl in range(cols):
    im = render(gA, w, h, scale1, shade_lvl=lvl)
    x = pad+lvl*(cw+pad)
    ladder.paste(im, (x, lab))
    dr.text((x+2, 6), f'dist shade {lvl}', fill=(230, 230, 230))
ladder.save('dev/advisor/render/skel_gold_shadeladder.png')
print('wrote skel_gold_1x / _4x / _shadeladder')
