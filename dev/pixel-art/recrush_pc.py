#!/usr/bin/env python3
"""One-off: re-crush the four PC portraits from their chosen-seed 256x320 raws to
90x112 (was 32x40) and re-import — NO GPU. The raw composition is unchanged, so
eye/torso frame_regions scale linearly (SX=90/32, SY=112/40); they are re-verified
after import. frame_ms (600) and frame_effects (breathe+eye_pulse) are read from
the manifest so the blink/breathe animation is preserved exactly.

Fresh 4x previews go to candidates-pc-90/ (never clobbers the 32x40 set).
Run from repo root: python3 dev/pixel-art/recrush_pc.py
"""
import sys, json
from pathlib import Path
sys.path.insert(0, 'dev/pixel-art')
sys.path.insert(0, 'tools')
from pixelcore import load_palette, crush, save_preview
from import_sprite import import_from_config
from PIL import Image

REPO = Path('.').resolve()
OLD_W, OLD_H = 32, 40
NEW_W, NEW_H = 80, 100   # 112 tall overflowed the 240px scene fb at 2x; 100 is the
PREVIEW_SCALE = 4        # tallest that shows at full 2x with the name plate intact

# Only eye_pulse: the old "breathe" effect shifted the torso box down 1px and left
# its top row transparent, which read as a black line across the chest on frame b
# (the panel behind the portrait is black). A clean eye pulse — like the monster
# portraits — is the intended idle animation.
FRAME_EFFECTS = {'b': ['eye_pulse']}

# eye boxes re-MEASURED on the new crush, not linearly scaled from 32x40: each
# portrait is framed differently, and the old 32x40 boxes actually sat on the brow
# (a "forehead pulse" invisible at tiny size, a visible flicker at full size).
# eye_pulse brightens every non-background pixel inside the box one palette step.
REGIONS = {
    'pc_warrior': {'eye': {'x': 21, 'y': 38, 'w': 39, 'h': 10}},
    'pc_rogue':   {'eye': {'x': 25, 'y': 41, 'w': 36, 'h': 8}},
    'pc_caster':  {'eye': {'x': 25, 'y': 35, 'w': 36, 'h': 8}},
    'pc_skald':   {'eye': {'x': 32, 'y': 22, 'w': 28, 'h': 7}},
}

OUT = Path('dev/pixel-art/candidates-pc-80'); OUT.mkdir(exist_ok=True)
rgb = load_palette(Path('data/art/palette.json'))
man = json.load(open('data/art/gen-manifest.json'))

pcs = [e for e in man['entries'] if e['art_class'] == 'character']
print(f'Re-crushing {len(pcs)} PC portraits {OLD_W}x{OLD_H} -> {NEW_W}x{NEW_H}')
for e in pcs:
    iid, seed, allowed = e['id'], e['chosen_seed'], e['allowed']
    raw = Image.open(f'dev/pixel-art/candidates/{iid}_s{seed}_raw.png').convert('RGB')
    tag = f'sub{len(allowed)}'
    q = crush(raw, rgb, allowed, target=(NEW_W, NEW_H))
    src = OUT / f'{iid}_s{seed}_{tag}.png'
    save_preview(q, src, target=(NEW_W, NEW_H), scale=PREVIEW_SCALE)

    regions = {'eye': REGIONS[iid]['eye']}
    import_from_config(
        src=src,
        sprite_id=iid,
        dest=REPO / e['art_file'],
        w=NEW_W, h=NEW_H,
        rgb=rgb,
        allowed=allowed,
        bg_indices=set(e.get('bg_indices', [0, 1])),
        preview_scale=PREVIEW_SCALE,
        frame_effects=FRAME_EFFECTS,
        frame_regions=regions,
        frame_ms=e.get('frame_ms', {'a': 600, 'b': 600}),
    )
    print(f'  {iid:12} eye -> {regions["eye"]}')

# update manifest: dims, eye-only regions, eye_pulse-only effects for each PC
for e in man['entries']:
    if e['art_class'] == 'character':
        e['dims'] = [NEW_W, NEW_H]
        e['frame_effects'] = FRAME_EFFECTS
        e['frame_regions'] = {'eye': REGIONS[e['id']]['eye']}
json.dump(man, open('data/art/gen-manifest.json', 'w'), indent=2)
print(f'Manifest updated: PC dims -> [{NEW_W},{NEW_H}], eye-only regions, eye_pulse only.')
