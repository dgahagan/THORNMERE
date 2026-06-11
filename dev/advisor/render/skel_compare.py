from PIL import Image, ImageDraw

# procedural sheet (grey bones + gold sword); first sprite sits top-left
proc = Image.open('art-review/mon_skeleton-sheet.png').convert('RGB')
# crop the two left sprites region (sheet is mostly empty to the right)
proc_crop = proc.crop((0, 0, 520, proc.height))
gold = Image.open('dev/advisor/render/skel_gold_1x.png').convert('RGB')  # 576x480 (96x80 @6x)

# normalize heights to ~480
th = 300
def fit(im):
    w = int(im.width * th / im.height)
    return im.resize((w, th), Image.NEAREST)
pc = fit(proc_crop)
gd = fit(gold)
lab = 28
pad = 16
W = pc.width + gd.width + pad*3
H = th + lab + pad
m = Image.new('RGB', (W, H), (18, 18, 22))
d = ImageDraw.Draw(m)
m.paste(pc, (pad, lab))
m.paste(gd, (pad*2 + pc.width, lab))
d.text((pad, 8), 'PROCEDURAL: grey bones + GOLD SWORD', fill=(230, 230, 230))
d.text((pad*2 + pc.width, 8), 'IMPORTED s42: GOLD bones + grey sword', fill=(255, 230, 150))
m.save('dev/advisor/render/skel_compare.png')
print('wrote skel_compare.png', m.size)
