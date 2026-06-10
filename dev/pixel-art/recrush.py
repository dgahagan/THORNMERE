#!/usr/bin/env python3
"""recrush.py — re-quantize EXISTING raw candidates with the current ALLOWED
sub-palette from test2.py. No GPU, no model load — runs in seconds.
 
Edit ALLOWED in test2.py (single source of truth), then:
  python3 recrush.py
 
Outputs candidates/<name>_s<seed>_<mode>.png alongside the raws.
"""
from pathlib import Path
 
from PIL import Image
 
# Everything comes from test2.py so the two scripts can never disagree.
from test2 import (ALLOWED, NAME, PALETTE_PATH, SEEDS, crush, load_palette,
                   mode_tag, save_preview, validate_allowed)
 
 
def main():
    rgb = load_palette(PALETTE_PATH)
    validate_allowed(ALLOWED, len(rgb))
    tag = mode_tag(ALLOWED)
    if ALLOWED is None:
        print("note: ALLOWED is None in test2.py — this re-crushes with the FULL "
              "palette, which just reproduces the _full images.")
    print(f"palette: {len(rgb)} colors — mode: {tag}")
 
    out = Path("candidates")
    missing = []
    for seed in SEEDS:
        raw = out / f"{NAME}_s{seed}_raw.png"
        if not raw.exists():
            missing.append(raw.name)
            continue
        q = crush(Image.open(raw), rgb, ALLOWED)
        dest = out / f"{NAME}_s{seed}_{tag}.png"
        save_preview(q, dest)
        print(f"seed {seed:>3}: {dest.name} written")
 
    if missing:
        raise SystemExit(f"missing raws (run test2.py first): {missing}")
    print("\ndone.")
 
 
if __name__ == "__main__":
    main()
 
