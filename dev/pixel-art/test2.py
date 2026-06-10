#!/usr/bin/env python3
"""test2.py — generate candidate monster portraits and crush them to the game palette.
 
Usage:
  python3 test2.py peek     print the palette as numbered color swatches, then exit
                            (use this to pick the ALLOWED indices below)
  python3 test2.py          generate one image per seed and crush each one
 
Outputs to ./candidates/:
  <name>_s<seed>_raw.png            the 480x400 model output
  <name>_s<seed>_full.png           crushed with the FULL 32-color palette
  <name>_s<seed>_sub<N>.png         crushed with the N-color ALLOWED sub-palette
 
The mode is baked into the filename so two different runs can never be confused.
"""
import json
import sys
from pathlib import Path
 
from PIL import Image
 
# ---------------- config ----------------
USE_LORA = False          # set True if lora_test.png (B) was the good image
SEEDS = [7, 11, 23, 42]   # generate one candidate per seed; curate by eye
NAME = "brute"
TARGET = (96, 80)         # sprite size (w, h) — matches the portrait spec
PREVIEW_SCALE = 4
DITHER = Image.Dither.NONE   # try Image.Dither.FLOYDSTEINBERG for comparison
GEN_W, GEN_H = 480, 400      # 6:5, same aspect as 96x80 — no squash on resize
 
# Repo layout assumption: this file lives in dev/pixel-art/ inside the game repo.
PALETTE_PATH = Path(__file__).resolve().parents[2] / "data" / "art" / "palette.json"
 
SUBJECT = ("hulking swamp troll brute, mossy green skin, tusked underbite, "
           "hunched shoulders, glowing red eyes")
# Fixed style suffix — keep this VERBATIM across all monsters for a consistent set.
STYLE = ("pixel art, upper body monster portrait, close-up, facing viewer, "
         "fantasy dungeon crawler monster, 16-bit Amiga style, limited palette, "
         "solid black background, game asset")
PROMPT = f"{SUBJECT}, {STYLE}"
 
# Palette indices this sprite may use. Run `python3 test2.py peek`, then list the
# indices of: the full green ramp, neutrals/bone/grey, the red accent, and black.
# Exclude every brown. None = use the full palette.
ALLOWED = [0, 1, 2, 3, 6, 7, 13, 14, 15, 16, 17, 18, 24, 25, 26, 27]
# -----------------------------------------
 
 
def load_palette(path: Path):
    """Best-effort reader for palette.json — handles the common shapes."""
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
        raise SystemExit(
            f"Couldn't find a color list in {path} — open it and adjust load_palette().")
 
    rgb = []
    for c in colors:
        if isinstance(c, str):                      # "#aabbcc" or "aabbcc"
            h = c.lstrip("#")
            rgb.append(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))
        elif isinstance(c, dict):
            if "hex" in c:
                h = c["hex"].lstrip("#")
                rgb.append(tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)))
            else:                                   # {"r":..,"g":..,"b":..}
                rgb.append((c["r"], c["g"], c["b"]))
        else:                                       # [r, g, b] or [r, g, b, a]
            rgb.append(tuple(c[:3]))
    return rgb
 
 
def validate_allowed(allowed, n_colors):
    """Fail loudly on every bad ALLOWED state instead of silently degrading."""
    if allowed is None:
        return
    if len(allowed) == 0:
        raise SystemExit("ALLOWED is an empty list — fill in indices or set it to None.")
    bad = [i for i in allowed if not (0 <= i < n_colors)]
    if bad:
        raise SystemExit(f"ALLOWED contains out-of-range indices {bad} "
                         f"(palette has {n_colors} colors, 0..{n_colors - 1}).")
    if len(set(allowed)) != len(allowed):
        raise SystemExit("ALLOWED contains duplicate indices.")
 
 
def mode_tag(allowed):
    return "full" if allowed is None else f"sub{len(allowed)}"
 
 
def palette_image(rgb):
    flat = [v for c in rgb for v in c]
    flat += flat[:3] * (256 - len(rgb))             # pad PIL's 256-slot palette
    p = Image.new("P", (1, 1))
    p.putpalette(flat)
    return p
 
 
def crush(img: Image.Image, rgb, allowed=None) -> Image.Image:
    """Downscale to TARGET and quantize to the (sub-)palette."""
    validate_allowed(allowed, len(rgb))
    use = rgb if allowed is None else [rgb[i] for i in allowed]
    pimg = palette_image(use)
    small = img.convert("RGB").resize(TARGET, Image.NEAREST)
    return small.quantize(palette=pimg, dither=DITHER)
 
 
def save_preview(q: Image.Image, path: Path):
    q.convert("RGB").resize(
        (TARGET[0] * PREVIEW_SCALE, TARGET[1] * PREVIEW_SCALE),
        Image.NEAREST).save(path)
 
 
def peek(rgb):
    print(f"{len(rgb)} colors in {PALETTE_PATH}:\n")
    for i, (r, g, b) in enumerate(rgb):
        print(f"\x1b[48;2;{r};{g};{b}m      \x1b[0m  {i:2d}  rgb({r:3d},{g:3d},{b:3d})")
    print("\nList the indices you want in ALLOWED (greens ramp, neutrals/bone, "
          "red accent, black — no browns).")
 
 
def main():
    rgb = load_palette(PALETTE_PATH)
 
    if len(sys.argv) > 1 and sys.argv[1] == "peek":
        peek(rgb)
        return
 
    validate_allowed(ALLOWED, len(rgb))
    tag = mode_tag(ALLOWED)
    print(f"palette: {len(rgb)} colors from {PALETTE_PATH} — mode: {tag}")
 
    # Heavy imports only when actually generating, so `peek` is instant.
    import torch
    from diffusers import Flux2KleinPipeline
 
    pipe = Flux2KleinPipeline.from_pretrained(
        "black-forest-labs/FLUX.2-klein-4B", torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()
    if USE_LORA:
        pipe.load_lora_weights("Limbicnation/pixel-art-lora")
 
    out = Path("candidates")
    out.mkdir(exist_ok=True)
 
    for seed in SEEDS:
        img = pipe(prompt=PROMPT, num_inference_steps=4, guidance_scale=1.0,
                   height=GEN_H, width=GEN_W,
                   generator=torch.Generator("cpu").manual_seed(seed)).images[0]
        img.save(out / f"{NAME}_s{seed}_raw.png")
 
        q = crush(img, rgb, ALLOWED)
        save_preview(q, out / f"{NAME}_s{seed}_{tag}.png")
        print(f"seed {seed:>3}: raw + {tag} crush written")
 
    print(f"\ndone — eyeball candidates/{NAME}_s*_{tag}.png")
 
 
if __name__ == "__main__":
    main()
 
