#!/usr/bin/env python3
"""One-off: re-crush all monster/showpiece sprites from their chosen-seed raws to
112x93 (was 96x80) and re-import. Eye_pulse frame_regions scale linearly (the
crush is the same composition at higher res). Crushed previews -> candidates-112/
(never clobbers the 96x80 set). Run from repo root: python3 dev/pixel-art/recrush_monsters_112.py
"""
import sys, json, subprocess, os
from pathlib import Path
sys.path.insert(0, 'dev/pixel-art')
from pixelcore import load_palette, crush, save_preview
from PIL import Image

REPO = Path('.').resolve()
NEW_W, NEW_H, OLD_W, OLD_H = 112, 93, 96, 80
SX, SY = NEW_W/OLD_W, NEW_H/OLD_H
OUT = Path('dev/pixel-art/candidates-112'); OUT.mkdir(exist_ok=True)
rgb = load_palette(Path('data/art/palette.json'))
man = json.load(open('data/art/gen-manifest.json'))

FERAL = {'mon_rat','mon_hound','mon_moth','mon_blob'}
REGEN = {'mon_skeleton','mon_choir_eldest'}
def raw_dir(iid):
    return 'candidates-feral' if iid in FERAL else 'candidates-regen-v2' if iid in REGEN else 'candidates'

def scale_region(r):
    return {'x':round(r['x']*SX),'y':round(r['y']*SY),'w':round(r['w']*SX),'h':round(r['h']*SY)}

mons = [e for e in man['entries'] if e['art_class'] in ('monster','showpiece')]
print(f'Re-crushing {len(mons)} monster/showpiece sprites 96x80 -> {NEW_W}x{NEW_H}')
for e in mons:
    iid, seed, allowed = e['id'], e['chosen_seed'], e['allowed']
    raw = Image.open(f'dev/pixel-art/{raw_dir(iid)}/{iid}_s{seed}_raw.png').convert('RGB')
    tag = f'sub{len(allowed)}'
    q = crush(raw, rgb, allowed, target=(NEW_W,NEW_H))
    src = OUT / f'{iid}_s{seed}_{tag}.png'
    save_preview(q, src, target=(NEW_W,NEW_H), scale=4)
    # build effects flags from manifest frame_effects: {'b':['eye_pulse'],'c':['eye_pulse','eye_pulse']}
    eff_args = []
    for frame, effs in (e.get('frame_effects') or {}).items():
        for ef in effs:
            eff_args += ['--effects', f'{frame}:{ef}']
    eye = scale_region(e['frame_regions']['eye'])
    cmd = ['python3','tools/import_sprite.py',
           '--src', str((REPO/src)), '--id', iid, '--dest', str(REPO/e['art_file']),
           '--w', str(NEW_W), '--h', str(NEW_H),
           '--allowed', ','.join(map(str,allowed)),
           '--bg-indices', ','.join(map(str,e.get('bg_indices',[0,1]))),
           '--preview-scale','4',
           '--eye-region', f'{eye["x"]},{eye["y"]},{eye["w"]},{eye["h"]}'] + eff_args
    r = subprocess.run(cmd, capture_output=True, text=True)
    ok = 'DONE' in r.stdout
    print(f'  {iid:18} s{seed:<3} eye {e["frame_regions"]["eye"]} -> {eye}  {"OK" if ok else "FAIL"}')
    if not ok:
        print(r.stdout[-400:]); print(r.stderr[-400:]); sys.exit(1)

# update manifest: dims + scaled eye regions
for e in man['entries']:
    if e['art_class'] in ('monster','showpiece'):
        e['dims'] = [NEW_W, NEW_H]
        e['frame_regions']['eye'] = scale_region(e['frame_regions']['eye'])
json.dump(man, open('data/art/gen-manifest.json','w'), indent=2)
print('Manifest updated: dims + scaled eye regions for all monster/showpiece entries.')
