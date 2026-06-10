#!/usr/bin/env python3
"""recrush.py — re-quantize EXISTING raw candidates with the current ALLOWED
sub-palette from test2.py.  No GPU, no model load — runs in seconds.

Edit ALLOWED in test2.py (single source of truth), then:
  python3 recrush.py
"""
from pathlib import Path
from PIL import Image

from test2    import ALLOWED, NAME, PALETTE_PATH, SEEDS, TARGET, PREVIEW_SCALE
from pixelcore import load_palette, mode_tag, crush, save_preview, validate_allowed


def main() -> None:
    rgb = load_palette(PALETTE_PATH)
    validate_allowed(ALLOWED, len(rgb))
    tag = mode_tag(ALLOWED)
    if ALLOWED is None:
        print("note: ALLOWED is None — re-crushing with the FULL palette.")
    print(f"palette: {len(rgb)} colors — mode: {tag}")

    out = Path("candidates")
    missing = []
    for seed in SEEDS:
        raw = out / f"{NAME}_s{seed}_raw.png"
        if not raw.exists():
            missing.append(raw.name)
            continue
        q = crush(Image.open(raw), rgb, ALLOWED, target=TARGET)
        dest = out / f"{NAME}_s{seed}_{tag}.png"
        save_preview(q, dest, target=TARGET, scale=PREVIEW_SCALE)
        print(f"seed {seed:>3}: {dest.name} written")

    if missing:
        raise SystemExit(f"missing raws (run test2.py first): {missing}")
    print("\ndone.")


if __name__ == "__main__":
    main()
