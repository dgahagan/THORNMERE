#!/usr/bin/env python3
"""pixelcore.py — shared palette, crush, and frame-effect utilities.

Imported by generate.py, host_gen.py, import_sprite.py, and recrush.py.
Single source of truth so test2.py / recrush.py never diverge from production.
"""
import json
from pathlib import Path

from PIL import Image

# ---- Palette ramp chains (darkest → lightest within each colour family) ----
# Used by eye_pulse to step a pixel one stop brighter inside its own family.
RAMP_CHAINS: list[list[int]] = [
    [0, 1, 2, 3, 4, 5, 6, 7],        # grey:  black → chalk
    [0, 8, 9, 10, 11, 12, 13],        # brown: black → parchment
    [0, 14, 15, 16, 17, 18],          # green: black → pale-leaf
    [0, 19, 20, 21, 22, 23],          # blue:  black → mist-blue
    [0, 24, 25, 26, 27],              # red:   black → flame
    [24, 28, 29, 30],                 # gold:  blood-dark → candle
    [20, 31],                         # violet: deep-blue → violet
]


def _build_brighten() -> dict[int, int]:
    """Return {palette_idx: next_lighter_idx}.
    First-chain assignment wins for shared roots (0 maps grey→1, not brown→8).
    Indices at the top of their chain are absent — no brighter step.
    """
    b: dict[int, int] = {}
    for chain in RAMP_CHAINS:
        for k in range(len(chain) - 1):
            idx = chain[k]
            if idx not in b:          # first chain assignment wins
                b[idx] = chain[k + 1]
    return b


BRIGHTEN: dict[int, int] = _build_brighten()


# ---------------------------------------------------------------------------
# Palette I/O
# ---------------------------------------------------------------------------

def load_palette(path: Path) -> list[tuple[int, int, int]]:
    """Load palette.json; return list of (r,g,b) tuples indexed by palette index."""
    data = json.loads(path.read_text())
    colors = None
    if isinstance(data, list):
        colors = data
    elif isinstance(data, dict):
        for key in ("colors", "palette", "master", "entries"):
            if key in data:
                colors = data[key]
                break
        else:
            vals = list(data.values())
            if vals and all(isinstance(v, (list, tuple, str, dict)) for v in vals):
                colors = vals
    if not colors:
        raise SystemExit(f"Couldn't find a color list in {path} — adjust load_palette().")

    rgb: list[tuple[int, int, int]] = []
    for c in colors:
        if isinstance(c, str):
            h = c.lstrip("#")
            rgb.append((int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)))
        elif isinstance(c, dict):
            if "hex" in c:
                h = c["hex"].lstrip("#")
                rgb.append((int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)))
            else:
                rgb.append((c["r"], c["g"], c["b"]))
        else:
            rgb.append(tuple(c[:3]))
    return rgb


def validate_allowed(allowed: list[int] | None, n_colors: int) -> None:
    """Fail loudly on every bad ALLOWED state instead of silently degrading."""
    if allowed is None:
        return
    if len(allowed) == 0:
        raise SystemExit("ALLOWED is an empty list — fill in indices or set it to None.")
    bad = [i for i in allowed if not (0 <= i < n_colors)]
    if bad:
        raise SystemExit(
            f"ALLOWED contains out-of-range indices {bad} "
            f"(palette has {n_colors} colors, 0..{n_colors - 1})."
        )
    if len(set(allowed)) != len(allowed):
        raise SystemExit("ALLOWED contains duplicate indices.")


def mode_tag(allowed: list[int] | None) -> str:
    return "full" if allowed is None else f"sub{len(allowed)}"


def palette_image(rgb: list[tuple[int, int, int]]) -> Image.Image:
    """Build a PIL P-mode image holding the given palette for quantize()."""
    flat = [v for c in rgb for v in c]
    flat += flat[:3] * (256 - len(rgb))   # PIL wants 256 slots
    p = Image.new("P", (1, 1))
    p.putpalette(flat)
    return p


def crush(
    img: Image.Image,
    rgb: list[tuple[int, int, int]],
    allowed: list[int] | None = None,
    target: tuple[int, int] = (96, 80),
    dither: "Image.Dither" = Image.Dither.NONE,
) -> Image.Image:
    """Downscale *img* to *target* (w, h) and quantize to the (sub-)palette."""
    validate_allowed(allowed, len(rgb))
    use = rgb if allowed is None else [rgb[i] for i in allowed]
    pimg = palette_image(use)
    small = img.convert("RGB").resize(target, Image.NEAREST)
    return small.quantize(palette=pimg, dither=dither)


def save_preview(
    q: Image.Image,
    path: Path,
    target: tuple[int, int] = (96, 80),
    scale: int = 4,
) -> None:
    """Write an upscaled RGB preview PNG (NEAREST so pixels stay crisp)."""
    q.convert("RGB").resize(
        (target[0] * scale, target[1] * scale),
        Image.NEAREST,
    ).save(path)


# ---------------------------------------------------------------------------
# Pixel → palette-index mapping (used by import_sprite)
# ---------------------------------------------------------------------------

def nearest_palette_idx(
    r: int, g: int, b: int,
    rgb: list[tuple[int, int, int]],
) -> int:
    """Return index of the nearest palette entry by squared Euclidean distance."""
    best, best_d = 0, float("inf")
    for i, (pr, pg, pb) in enumerate(rgb):
        d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if d < best_d:
            best_d, best = d, i
    return best
